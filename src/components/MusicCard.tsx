"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { Play, Pause, SkipBack, SkipForward, VolumeX, Volume2, Shuffle, ListOrdered } from "lucide-react";

export type MusicCardProps = {
  className?: string;
  playlistUrl?: string;
  streamingBaseUrl?: string;
  animate?: boolean;
};

type TrackInfo = {
  title?: string;
  artist?: string;
  filename?: string;
  originalFile?: string;
  hasHLS?: boolean;
  hlsUrl?: string; // e.g. "/path/to/track.m3u8"
};

type PlaylistResponse = {
  tracks?: TrackInfo[];
};

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
  playlistUrl = "https://hls.wenturc.com/playlist.json",
  streamingBaseUrl = "https://hls.wenturc.com",
  animate = true,
}: MusicCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const loadedUrlRef = useRef<string | null>(null);

  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(70);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [randomMode, setRandomMode] = useState<boolean>(false);
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
      return `${streamingBaseUrl}${currentTrack.hlsUrl}`;
    }
    return null;
  }, [currentTrack, streamingBaseUrl]);

  // Controls that do not depend on DOM listeners should be defined early
  const getRandomIndex = useCallback((exclude: number) => {
    if (tracks.length <= 1) return 0;
    const pool: number[] = Array.from({ length: tracks.length }, (_, i) => i).filter((i) => i !== exclude);
    return pool[Math.floor(Math.random() * pool.length)];
  }, [tracks.length]);

  const handleNext = useCallback(() => {
    if (tracks.length === 0) return;
    if (randomMode) {
      setCurrentIndex((i) => getRandomIndex(i));
    } else {
      setCurrentIndex((i) => (i + 1) % tracks.length);
    }
  }, [getRandomIndex, randomMode, tracks.length]);

  const handlePrev = useCallback(() => {
    if (tracks.length === 0) return;
    if (randomMode) {
      setCurrentIndex((i) => getRandomIndex(i));
    } else {
      setCurrentIndex((i) => (i - 1 + tracks.length) % tracks.length);
    }
  }, [getRandomIndex, randomMode, tracks.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(playlistUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PlaylistResponse;
        const list = data.tracks || [];
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
                break;
            }
          } catch {
            // ignore
          }
        }
      });
      return;
    }

    // Native HLS (Safari)
    media.src = url;
    loadedUrlRef.current = url;
  }, []);

  const loadCurrent = useCallback(() => {
    const media = audioRef.current;
    if (!media || !currentHlsUrl) return;

    // 仅当目标 URL 变化时才切换源，避免重置进度
    if (loadedUrlRef.current !== currentHlsUrl) {
      attachHls(media, currentHlsUrl);
    }

    // 不主动播放，保持暂停位置；仅当处于播放态时才恢复
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
    media.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const media = audioRef.current;
    if (!media) return;
    const onTime = () => setCurrentTime(media.currentTime || 0);
    const onMeta = () => setDuration(isNaN(media.duration) ? 0 : media.duration);
    const onEnd = () => handleNext();

    media.addEventListener("timeupdate", onTime);
    media.addEventListener("loadedmetadata", onMeta);
    media.addEventListener("ended", onEnd);
    return () => {
      media.removeEventListener("timeupdate", onTime);
      media.removeEventListener("loadedmetadata", onMeta);
      media.removeEventListener("ended", onEnd);
    };
  }, [handleNext]);

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
      // 若源未加载（首次或切歌），先加载源，但不要重置 currentTime
      if (!loadedUrlRef.current) {
        loadCurrent();
      }
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

  // (moved earlier)

  return (
    <div
      className={`rounded-xl border border-white/20 dark:border-white/10 bg-white/25 dark:bg-black/35 backdrop-blur-xl shadow-lg shadow-black/10 w-full sm:w-[320px] max-w-[calc(100vw-1.5rem)] sm:max-w-none px-3 py-3 sm:p-4 transition-all duration-1500 ease-out will-change-transform hover:bg-white/40 hover:backdrop-blur-2xl hover:shadow-xl hover:shadow-black/20 hover:border-white/30 dark:hover:bg-black/50 dark:hover:border-white/20 text-black dark:text-white ${animate ? (mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-[0.98]") : ""} ${className ?? ""}`}
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
          aria-label={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
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

function formatTime(seconds: number | undefined): string {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

