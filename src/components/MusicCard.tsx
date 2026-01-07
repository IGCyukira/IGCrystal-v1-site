"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTime } from "@/lib/time";
import Hls from "hls.js";
import { Play, Pause, SkipBack, SkipForward, VolumeX, Volume2, Shuffle, ListOrdered, Repeat, Loader2 } from "lucide-react";

export type MusicCardProps = {
  className?: string;
  playlistUrl?: string;
  streamingBaseUrl?: string;
  animate?: boolean;
  defaultArtwork?: string | string[];
};

type TrackInfo = {
  title?: string;
  artist?: string;
  filename?: string;
  originalFile?: string;
  hasHLS?: boolean;
  hlsUrl?: string;
  cover?: string;
};

type PlaylistResponse = TrackInfo[] | { tracks?: TrackInfo[] };

function buildTrackLabel(track: TrackInfo | undefined): string {
  if (!track) return "未知歌曲";
  const inferredName = (track.filename || track.originalFile || "").replace(/\.(flac|mp3|wav|m4a|aac)$/i, "");
  let title = track.title || undefined;
  let artist = track.artist || undefined;

  if ((!title || !artist) && inferredName.includes(" - ")) {
    const [maybeArtist, ...rest] = inferredName.split(" - ");
    if (!artist) artist = maybeArtist || artist;
    if (!title) title = rest.join(" - ") || title;
  } else if (!title) {
    title = inferredName || "未知标题";
  }

  return [title, artist || "未知艺术家"].filter(Boolean).join(" - ");
}

export default function MusicCard({
  className,
  playlistUrl = "https://hls.revaea.com/api/music/playlist",
  streamingBaseUrl = "https://hls.revaea.com",
  animate = true,
  defaultArtwork,
}: MusicCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const loadedUrlRef = useRef<string | null>(null);

  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [showBuffering, setShowBuffering] = useState<boolean>(false);
  const bufferingTimerRef = useRef<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(70);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [randomMode, setRandomMode] = useState<boolean>(false);
  const [loopOne, setLoopOne] = useState<boolean>(false); 
  const endedHandledRef = useRef<boolean>(false);
  const lastTrackUrlRef = useRef<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    if (!animate) return;
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, [animate]);

  const progress = useMemo(() => (duration > 0 ? (currentTime / duration) * 100 : 0), [currentTime, duration]);

  const currentTrack = tracks[currentIndex];
  const currentLabel = buildTrackLabel(currentTrack);

  const currentHlsUrl = useMemo(() => {
    if (!currentTrack) return null;
    if (currentTrack.hasHLS && currentTrack.hlsUrl) {
      const raw = currentTrack.hlsUrl;
      // 绝对地址直接返回
      if (/^https?:\/\//i.test(raw)) return raw;
      try {
        if (streamingBaseUrl) {
          return new URL(raw, streamingBaseUrl).toString();
        }
      } catch {}
      const base = (streamingBaseUrl || "").replace(/\/$/, "");
      const path = raw.startsWith("/") ? raw : `/${raw}`;
      return `${base}${path}`;
    }
    return null;
  }, [currentTrack, streamingBaseUrl]);

  const getRandomIndex = useCallback((exclude: number) => {
    if (tracks.length <= 1) return 0;
    const pool: number[] = Array.from({ length: tracks.length }, (_, i) => i).filter((i) => i !== exclude);
    return pool[Math.floor(Math.random() * pool.length)];
  }, [tracks.length]);

  const restartCurrent = useCallback((autoplay: boolean) => {
    const media = audioRef.current;
    if (!media) return;
    try { media.currentTime = 0; } catch {}
    setCurrentTime(0);
    endedHandledRef.current = false;
    if (autoplay) {
      setIsBuffering(true);
      media.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, []);

  const handleNext = useCallback(() => {
    if (tracks.length === 0) return;
    if (tracks.length <= 1) {
      restartCurrent(isPlaying);
      return;
    }
    if (randomMode) {
      setCurrentIndex((i) => getRandomIndex(i));
    } else {
      setCurrentIndex((i) => (i + 1) % tracks.length);
    }
  }, [getRandomIndex, isPlaying, randomMode, restartCurrent, tracks.length]);

  const handlePrev = useCallback(() => {
    if (tracks.length === 0) return;
    if (tracks.length <= 1) {
      restartCurrent(isPlaying);
      return;
    }
    if (randomMode) {
      setCurrentIndex((i) => getRandomIndex(i));
    } else {
      setCurrentIndex((i) => (i - 1 + tracks.length) % tracks.length);
    }
  }, [getRandomIndex, isPlaying, randomMode, restartCurrent, tracks.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(playlistUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PlaylistResponse;
        const rawList: TrackInfo[] = Array.isArray(data) ? data : (data?.tracks || []);
        const list = (rawList || []).filter((t) => t && t.hasHLS && typeof t.hlsUrl === "string" && t.hlsUrl.length > 0);
        if (!cancelled) {
          setTracks(list);
          if (list.length > 0) {
            setCurrentIndex(Math.floor(Math.random() * list.length));
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "加载播放列表失败";
        if (!cancelled) setLoadingError(message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playlistUrl]);

  const attachHls = useCallback((media: HTMLMediaElement, url: string) => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const instance = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsRef.current = instance;
      instance.attachMedia(media);
      instance.on(Hls.Events.MEDIA_ATTACHED, () => {
        instance.loadSource(url);
        loadedUrlRef.current = url;
      });
      instance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          try {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                instance.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                instance.recoverMediaError();
                break;
              default:
                instance.destroy();
                hlsRef.current = null;
                loadedUrlRef.current = null; 
                break;
            }
          } catch {
          }
        }
      });
      return;
    }

    media.src = url;
    loadedUrlRef.current = url;
  }, []);

  const loadCurrent = useCallback(() => {
    const media = audioRef.current;
    if (!media || !currentHlsUrl) return;
    if (loadedUrlRef.current !== currentHlsUrl) {
      attachHls(media, currentHlsUrl);
      try { media.currentTime = 0; } catch {}
      endedHandledRef.current = false;
      lastTrackUrlRef.current = currentHlsUrl;
      setIsBuffering(true);
    }

    if (isPlaying) {
      media.play().catch(() => setIsPlaying(false));
    }
  }, [attachHls, currentHlsUrl, isPlaying]);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);

  useEffect(() => {
    const media = audioRef.current;
    if (!media) return;
    const visualVolume = Math.max(0, Math.min(100, volume)) / 100;
    const curved = Math.max(0, Math.min(1, visualVolume * visualVolume));
    media.volume = curved;
  }, [volume]);

  useEffect(() => {
    const media = audioRef.current;
    if (!media) return;

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);
    const onPause = () => setIsBuffering(false);

    media.addEventListener("waiting", onWaiting);
    media.addEventListener("playing", onPlaying);
    media.addEventListener("canplay", onCanPlay);
    media.addEventListener("pause", onPause);

    return () => {
      media.removeEventListener("waiting", onWaiting);
      media.removeEventListener("playing", onPlaying);
      media.removeEventListener("canplay", onCanPlay);
      media.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => {
    if (!isBuffering) {
      if (bufferingTimerRef.current) {
        window.clearTimeout(bufferingTimerRef.current);
        bufferingTimerRef.current = null;
      }
      setShowBuffering(false);
      return;
    }

    if (bufferingTimerRef.current) {
      window.clearTimeout(bufferingTimerRef.current);
      bufferingTimerRef.current = null;
    }

    bufferingTimerRef.current = window.setTimeout(() => {
      setShowBuffering(true);
    }, 150);

    return () => {
      if (bufferingTimerRef.current) {
        window.clearTimeout(bufferingTimerRef.current);
        bufferingTimerRef.current = null;
      }
    };
  }, [isBuffering]);

  useEffect(() => {
    const media = audioRef.current;
    if (!media) return;
    const onTime = () => setCurrentTime(media.currentTime || 0);
    const onMeta = () => setDuration(isNaN(media.duration) ? 0 : media.duration);
    const onEnd = () => {
      if (endedHandledRef.current) return;
      endedHandledRef.current = true;
      if (loopOne) {
        try {
          media.currentTime = 0;
          const p = media.play();
          if (p && typeof p.then === "function") p.catch(() => {});
          endedHandledRef.current = false; 
        } catch {}
      } else {
        if (tracks.length <= 1) {
          setIsPlaying(false);
          setIsBuffering(false);
          endedHandledRef.current = false;
          return;
        }
        handleNext();
      }
    };

    media.addEventListener("timeupdate", onTime);
    media.addEventListener("loadedmetadata", onMeta);
    media.addEventListener("ended", onEnd);
    return () => {
      media.removeEventListener("timeupdate", onTime);
      media.removeEventListener("loadedmetadata", onMeta);
      media.removeEventListener("ended", onEnd);
    };
  }, [handleNext, loopOne, tracks.length]);

  useEffect(() => {
    if (!isPlaying) return;
    const media = audioRef.current;
    if (!media) return;
    const id = window.setInterval(() => {
      if (!media.duration || media.duration === Infinity) return;
      if (media.paused) return;
      const remain = media.duration - media.currentTime;
      if (remain < 0.35 && !endedHandledRef.current) {
        if (loopOne) {
          endedHandledRef.current = true;
          try {
            media.currentTime = 0;
            const p = media.play();
            if (p && typeof p.then === 'function') p.catch(() => {});
            endedHandledRef.current = false;
          } catch {}
        } else {
            endedHandledRef.current = true;
            handleNext();
        }
      }
    }, 500);
    return () => { window.clearInterval(id); };
  }, [isPlaying, loopOne, handleNext]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = false; 
    }
  }, [loopOne]);

  useEffect(() => {
    const mediaAtMount = audioRef.current;
    const hlsAtMount = hlsRef.current;
    const onPauseSignal = () => {
      const media = audioRef.current;
      if (media) {
        try { media.pause(); } catch {}
        setIsPlaying(false);
      }
    };
    window.addEventListener("pause-audio", onPauseSignal);
    return () => {
      if (hlsAtMount) {
        try { hlsAtMount.destroy(); } catch {}
      }
      if (mediaAtMount) {
        try { mediaAtMount.pause(); } catch {}
      }
      window.removeEventListener("pause-audio", onPauseSignal);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const media = audioRef.current;
    if (!media || !currentHlsUrl) return;
    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
    } else {
      if (!loadedUrlRef.current) {
        loadCurrent();
      }
      setIsBuffering(true);
      media.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [isPlaying, currentHlsUrl, loadCurrent]);

  const toggleMute = useCallback(() => {
    const media = audioRef.current;
    if (!media) return;
    media.muted = !media.muted;
    setIsMuted(media.muted);
  }, []);

  const handleSeek = useCallback((p: number) => {
    const media = audioRef.current;
    if (!media || duration <= 0) return;
    const nextTime = Math.max(0, Math.min(1, p)) * duration;
    media.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, [duration]);

  useEffect(() => {
    const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
    if (!ms || typeof ms.setActionHandler !== "function") return;

    const onPlay = () => { if (!isPlaying) togglePlay(); };
    const onPause = () => { if (isPlaying) togglePlay(); };
    const onPrev = () => { handlePrev(); };
    const onNext = () => { handleNext(); };
    const onStop = () => {
      const media = audioRef.current;
      if (media) {
        try { media.pause(); } catch {}
        try { media.currentTime = 0; } catch {}
      }
      setIsPlaying(false);
    };
    const onSeekTo = (details: MediaSessionActionDetails) => {
      if (!details || typeof details.seekTime !== "number") return;
      const media = audioRef.current;
      const dur = duration || 0;
      const nextPos = Math.max(0, Math.min(dur, details.seekTime));
      if (media) {
        media.currentTime = nextPos;
      }
      setCurrentTime(nextPos);
    };
    const onSeekBackward = (details: MediaSessionActionDetails) => {
      const step = (details && details.seekOffset) || 10;
      const media = audioRef.current;
      if (media) {
        const nextPos = Math.max(0, media.currentTime - step);
        media.currentTime = nextPos;
        setCurrentTime(nextPos);
      }
    };
    const onSeekForward = (details: MediaSessionActionDetails) => {
      const step = (details && details.seekOffset) || 10;
      const media = audioRef.current;
      const dur = duration || Number.POSITIVE_INFINITY;
      if (media) {
        const nextPos = Math.min(dur, media.currentTime + step);
        media.currentTime = nextPos;
        setCurrentTime(nextPos);
      }
    };

    try { ms.setActionHandler("play", onPlay); } catch {}
    try { ms.setActionHandler("pause", onPause); } catch {}
    try { ms.setActionHandler("previoustrack", onPrev); } catch {}
    try { ms.setActionHandler("nexttrack", onNext); } catch {}
    try { ms.setActionHandler("stop", onStop); } catch {}
    try { ms.setActionHandler("seekto", onSeekTo); } catch {}
    try { ms.setActionHandler("seekbackward", onSeekBackward); } catch {}
    try { ms.setActionHandler("seekforward", onSeekForward); } catch {}

    return () => {
      try { ms.setActionHandler("play", null); } catch {}
      try { ms.setActionHandler("pause", null); } catch {}
      try { ms.setActionHandler("previoustrack", null); } catch {}
      try { ms.setActionHandler("nexttrack", null); } catch {}
      try { ms.setActionHandler("stop", null); } catch {}
      try { ms.setActionHandler("seekto", null); } catch {}
      try { ms.setActionHandler("seekbackward", null); } catch {}
      try { ms.setActionHandler("seekforward", null); } catch {}
    };
  }, [togglePlay, handlePrev, handleNext, duration, isPlaying]);

  useEffect(() => {
    const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
    if (!ms) return;
    try {
      const parts = (currentLabel || "").split(" - ");
      const metaTitle = parts[0] || "未知歌曲";
      const metaArtist = parts.slice(1).join(" - ") || "未知艺术家";
      const artwork: MediaImage[] = [];
      if (currentTrack?.cover) {
        artwork.push({ src: currentTrack.cover, sizes: "512x512" });
      }
      const defaults = Array.isArray(defaultArtwork) ? defaultArtwork : (defaultArtwork ? [defaultArtwork] : []);
      for (const img of defaults) {
        artwork.push({ src: img });
      }
      
      artwork.push({ src: "/img/artist.webp", sizes: "957x957", type: "image/webp" });
      artwork.push({ src: "/img/artist.jpg", sizes: "957x957", type: "image/jpg" });
      artwork.push({ src: "/img/artist.png", sizes: "957x957", type: "image/png" });

      if (typeof MediaMetadata !== "undefined") {
        ms.metadata = new MediaMetadata({
          title: metaTitle,
          artist: metaArtist,
          album: "IGCrystal",
          artwork,
        });
      }
    } catch {}
  }, [currentLabel, currentTrack, defaultArtwork]);

  useEffect(() => {
    const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
    if (!ms) return;
    try {
      ms.playbackState = isPlaying ? "playing" : "paused";
    } catch {}
    try {
      if (typeof ms.setPositionState === "function" && duration && duration > 0) {
        ms.setPositionState({ duration, position: currentTime || 0, playbackRate: 1 });
      }
    } catch {}
  }, [isPlaying, currentTime, duration]);

  return (
    <div
      className={`rounded-xl border border-white/20 dark:border-white/10 bg-white/25 dark:bg-black/35 backdrop-blur-xl shadow-lg shadow-black/10 w-full sm:w-[320px] max-w-[calc(100vw-1.5rem)] sm:max-w-none px-3 py-3 sm:p-4 transition-all duration-1500 ease-out will-change-transform hover:bg-white/60 hover:backdrop-blur-2xl hover:shadow-xl hover:shadow-black/20 hover:border-white/30 dark:hover:bg-black/50 dark:hover:border-white/20 text-black dark:text-white ${animate ? (mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-[0.98]") : ""} ${className ?? ""}`}
    >
      <audio ref={audioRef} preload="metadata" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate" title={currentLabel}>{currentLabel}</div>
          {loadingError ? (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400 truncate" title={loadingError}>加载播放列表失败</div>
          ) : (
            <div className="mt-1 text-xs text-black/60 dark:text-white/70">
              {tracks.length > 0 ? `第 ${currentIndex + 1}/${tracks.length} 首` : "加载中..."}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={togglePlay}
          className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-90"
          aria-label={showBuffering ? "缓冲中" : (isPlaying ? "暂停" : "播放")}
        >
          {showBuffering ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={16} />
          ) : (
            <Play size={16} />
          )}
        </button>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-[11px] tabular-nums text-black/60 dark:text-white/60 min-w-[32px] text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={(e) => handleSeek(parseFloat(e.target.value) / 100)}
            className="flex-1 accent-black dark:accent-white"
            aria-label="进度"
          />
          <span className="text-[11px] tabular-nums text-black/60 dark:text-white/60 min-w-[32px]">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10" onClick={handlePrev} aria-label="上一首">
            <SkipBack size={16} />
          </button>
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10" onClick={handleNext} aria-label="下一首">
            <SkipForward size={16} />
          </button>
          <button
            type="button"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${randomMode ? "ring-1 ring-black/15 dark:ring-white/20" : ""}`}
            onClick={() => setRandomMode((v) => !v)}
            aria-label={randomMode ? "切换为顺序播放" : "切换为随机播放"}
            title={randomMode ? "随机播放: 开" : "随机播放: 关"}
          >
            {randomMode ? <Shuffle size={16} /> : <ListOrdered size={16} />}
          </button>
          <button
            type="button"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${loopOne ? "ring-1 ring-black/15 dark:ring-white/20" : ""}`}
            onClick={() => setLoopOne(v => !v)}
            aria-label={loopOne ? "关闭单曲循环" : "开启单曲循环"}
            title={loopOne ? "单曲循环: 开" : "单曲循环: 关"}
          >
            <Repeat size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10" onClick={toggleMute} aria-label={isMuted ? "取消静音" : "静音"}>
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setVolume(v);
              if (audioRef.current) {
                audioRef.current.muted = false;
              }
              setIsMuted(false);
            }}
            className="w-[28vw] sm:w-24 accent-black dark:accent-white"
            aria-label="音量"
          />
        </div>
      </div>
    </div>
  );
}
