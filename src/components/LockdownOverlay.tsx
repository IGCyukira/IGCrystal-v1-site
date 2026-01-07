"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function LockdownOverlay() {
  const [locked, setLocked] = useState<boolean>(false);
  const [popups, setPopups] = useState<Array<{
    top: number;
    left: number;
    z: number;
    opacity: number;
    delay: number;
    width: number;
    height: number;
  }>>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const snapElRef = useRef<HTMLElement | null>(null);
  const prevStyleRef = useRef<{ overflow?: string; overscrollBehavior?: string; touchAction?: string } | null>(null);
  const thrashingRef = useRef<number | null>(null);

  const basePopupWidth = 320;
  const basePopupHeight = 140;

  const computeSnakePopups = useCallback(() => {
    if (typeof window === 'undefined') return [];
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const positions: Array<{
      top: number;
      left: number;
      z: number;
      opacity: number;
      delay: number;
      width: number;
      height: number;
    }> = [];

    const coarseCellW = Math.max(72, Math.floor(basePopupWidth * 0.7));
    const coarseCellH = Math.max(60, Math.floor(basePopupHeight * 0.7));
    const coarseCols = Math.max(1, Math.ceil(screenWidth / coarseCellW));
    const coarseRows = Math.max(1, Math.ceil(screenHeight / coarseCellH));
    const totalCells = coarseCols * coarseRows;
    const visited = new Set<string>();

    const markVisited = (px: number, py: number) => {
      const cx = Math.min(coarseCols - 1, Math.max(0, Math.floor((px + basePopupWidth / 2) / coarseCellW)));
      const cy = Math.min(coarseRows - 1, Math.max(0, Math.floor((py + basePopupHeight / 2) / coarseCellH)));
      visited.add(`${cx}:${cy}`);
    };

    let x = Math.max(0, Math.floor((screenWidth - basePopupWidth) / 2));
    let y = Math.max(0, Math.floor((screenHeight - basePopupHeight) / 2));
    let angle = Math.random() * Math.PI * 2; 
    angle += (Math.random() - 0.5) * (Math.PI / 6); 

    const step = Math.max(24, Math.floor(Math.min(basePopupWidth, basePopupHeight) * 0.55));
    let z = 5000;
    
    const maxCount = 2000; 

    for (let i = 0; i < maxCount; i++) {
      const top = Math.max(0, Math.min(screenHeight - basePopupHeight, Math.round(y)));
      const left = Math.max(0, Math.min(screenWidth - basePopupWidth, Math.round(x)));

      positions.push({
        top,
        left,
        z: z--,
        opacity: 1, 
        delay: i * 0.008, 
        width: basePopupWidth,
        height: basePopupHeight,
      });
      markVisited(left, top);

      angle += (Math.random() - 0.5) * (Math.PI / 24); 

      let nextX = x + Math.cos(angle) * step;
      let nextY = y + Math.sin(angle) * step;
      let bounced = false;

      if (nextX < 0 || nextX + basePopupWidth > screenWidth) {
        angle = Math.PI - angle + (Math.random() - 0.5) * (Math.PI / 18); 
        nextX = x + Math.cos(angle) * step;
        nextY = y + Math.sin(angle) * step;
        bounced = true;
      }

      if (nextY < 0 || nextY + basePopupHeight > screenHeight) {
        angle = -angle + (Math.random() - 0.5) * (Math.PI / 18);
        nextX = x + Math.cos(angle) * step;
        nextY = y + Math.sin(angle) * step;
        bounced = true;
      }

      if (bounced) {
        angle += (Math.random() - 0.5) * (Math.PI / 12); 
      }

      x = nextX;
      y = nextY;

      const covered = visited.size / totalCells;
      if (covered >= 0.98) break; 
    }

    return positions;
  }, []);

  useEffect(() => {
    const onEnable = () => {
      setLocked(true);
      try { setPopups(computeSnakePopups()); } catch {}
      try {
        document.body.style.overflow = "hidden";
      } catch {}
      try {
        const snap = document.querySelector('.snap-y') as HTMLElement | null;
        snapElRef.current = snap;
        if (snap) {
          const style = snap.style;
          prevStyleRef.current = {
            overflow: style.overflow,
            overscrollBehavior: style.getPropertyValue('overscroll-behavior'),
            touchAction: style.getPropertyValue('touch-action'),
          };
          style.overflow = 'hidden';
          style.setProperty('overscroll-behavior', 'none');
          style.setProperty('touch-action', 'none');
        }
      } catch {}
    };

    const onDisable = () => {
      setLocked(false);
      setPopups([]);
      try {
        document.body.style.overflow = "";
      } catch {}
      try {
        const snap = snapElRef.current;
        if (snap && prevStyleRef.current) {
          const style = snap.style;
          style.overflow = prevStyleRef.current.overflow ?? "";
          if (prevStyleRef.current.overscrollBehavior) {
            style.setProperty('overscroll-behavior', prevStyleRef.current.overscrollBehavior);
          } else {
            style.removeProperty('overscroll-behavior');
          }
          if (prevStyleRef.current.touchAction) {
            style.setProperty('touch-action', prevStyleRef.current.touchAction);
          } else {
            style.removeProperty('touch-action');
          }
        }
        prevStyleRef.current = null;
        snapElRef.current = null;
      } catch {}
    };

    window.addEventListener("site-lockdown:enable", onEnable);
    window.addEventListener("site-lockdown:disable", onDisable);
    return () => {
      window.removeEventListener("site-lockdown:enable", onEnable);
      window.removeEventListener("site-lockdown:disable", onDisable);
    };
  }, [computeSnakePopups]);

  useEffect(() => {
    if (!locked) {
      try { hlsRef.current?.destroy(); } catch {}
      hlsRef.current = null;
      const a = audioRef.current;
      try {
        if (a) {
          a.pause();
          a.removeAttribute("src");
          a.load?.();
        }
      } catch {}
      return;
    }

    const a = audioRef.current;
    if (!a) return;

    const hlsUrl = "https://hls.revaea.com/music-hls/Laur-null-feat/playlist.m3u8";
    
    const tryAutoplay = () => {
      return a.play().catch(() => {
        try { a.muted = true; } catch {}
        return a.play().catch(() => {});
      });
    };

    const onEnded = () => {
      try {
        a.currentTime = 0;
        a.play().catch(() => {});
      } catch {}
    };
    a.addEventListener("ended", onEnded);

    if (Hls.isSupported()) {
      const hls = new Hls({
        startLevel: -1,
        autoStartLoad: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;
      hls.attachMedia(a);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(hlsUrl);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        tryAutoplay();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              try { hls.startLoad(); } catch {}
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              try { hls.recoverMediaError(); } catch {}
              break;
            default:
              try { hls.destroy(); } catch {}
              hlsRef.current = null;
              break;
          }
        }
      });
    } else if (a.canPlayType("application/vnd.apple.mpegurl")) {
      a.src = hlsUrl;
      a.addEventListener("loadedmetadata", tryAutoplay);
    }

    return () => {
      try { hlsRef.current?.destroy(); } catch {}
      a.removeEventListener("ended", onEnded);
    };
  }, [locked]);

  useEffect(() => {
    if (!locked) return;
    const spawnMore = () => {
      if (typeof window === 'undefined') return;
      const extra = Array.from({ length: 50 }).map(() => ({
        top: Math.random() * (window.innerHeight - 140),
        left: Math.random() * (window.innerWidth - 320),
        z: 6000 + Math.floor(Math.random() * 5000), 
        delay: 0,
        opacity: 0.9,
        width: 320,
        height: 140
      }));
      setPopups(prev => [...prev, ...extra]);
    };
    const timer = window.setInterval(spawnMore, 1000);
    return () => window.clearInterval(timer);
  }, [locked]);

  useEffect(() => {
    if (!locked) {
      if (thrashingRef.current) {
        window.cancelAnimationFrame(thrashingRef.current);
        thrashingRef.current = null;
      }
      return;
    }
    const thrash = () => {
      void document.body.offsetHeight;
      document.body.style.transform = `translateZ(${Math.random() * 0.001}px)`;
      thrashingRef.current = window.requestAnimationFrame(thrash);
    };
    thrashingRef.current = window.requestAnimationFrame(thrash);
    return () => {
      if (thrashingRef.current) {
        window.cancelAnimationFrame(thrashingRef.current);
        thrashingRef.current = null;
      }
      try { document.body.style.transform = ""; } catch {}
    };
  }, [locked]);

  useEffect(() => {
    if (!locked) return;
    const prevent = (e: Event) => { 
        e.preventDefault(); 
        e.stopPropagation();
    };
    const preventKeys = (e: KeyboardEvent) => {
      const k = e.key;
      if (
        k === "ArrowUp" || k === "ArrowDown" || k === "ArrowLeft" || k === "ArrowRight" ||
        k === "PageUp" || k === "PageDown" || k === "Home" || k === "End" || k === " " || 
        k === "Tab" || k === "Enter" || k === "Escape"
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    const opts: AddEventListenerOptions = { passive: false, capture: true };
    window.addEventListener("wheel", prevent, opts);
    window.addEventListener("touchmove", prevent, opts);
    window.addEventListener("keydown", preventKeys, opts);
    window.addEventListener("contextmenu", prevent, opts); 
    window.addEventListener("DOMMouseScroll", prevent as EventListener, opts);

    return () => {
      window.removeEventListener("wheel", prevent as EventListener, true);
      window.removeEventListener("touchmove", prevent as EventListener, true);
      window.removeEventListener("keydown", preventKeys as EventListener, true);
      window.removeEventListener("contextmenu", prevent as EventListener, true);
      window.removeEventListener("DOMMouseScroll", prevent as EventListener, true);
    };
  }, [locked]);

  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-[9999] text-white pointer-events-auto select-none overflow-hidden font-sans">
      {/* Background Audio */}
      <audio
        ref={audioRef}
        className="hidden"
        autoPlay
        loop
        preload="auto"
      />
      
      {/* Frosted Overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/40 pointer-events-none" />
      
      {/* Popups */}
      {popups.map((p, i) => (
        <div
          key={i}
          className="xp-popup" 
          style={{
            top: p.top,
            left: p.left,
            zIndex: p.z,
            width: Math.max(160, p.width - 8),
            height: Math.max(120, p.height - 8),
            
            opacity: p.opacity,
            backdropFilter: "blur(3px)",       
            WebkitBackdropFilter: "blur(3px)",
            transform: `translateZ(${p.z}px)`, 
            
            animation: `popupGlitch 0.2s ease-in-out infinite, popupAppear 0.5s ${p.delay}s ease-out forwards`,
            willChange: "transform, opacity, filter",
          }}
        >
          {/* Titlebar */}
          <div className="xp-titlebar justify-between">
            <span>System Error</span>
            <span className="opacity-70">_ □ ×</span>
          </div>
          
          {/* Content */}
          <div className="xp-content">
            <div className="xp-icon">×</div>
            <div>
              <div className="font-bold mb-1 text-black">CRITICAL SYSTEM FAILURE</div>
              <div className="text-[11px] leading-tight text-black">
                System halted.<br/>
                Memory Dump: 0x{Math.floor(Math.random() * 999999).toString(16).toUpperCase()}<br/>
                Wait...
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* Scanlines */}
      <div className="lockdown-scanlines" />
    </div>
  );
}
