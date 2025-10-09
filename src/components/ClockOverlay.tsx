"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

export type ClockOverlayProps = {
  className?: string;
  locale?: string;
  scoped?: boolean;
};

export default function ClockOverlay({ className, locale, scoped = false }: ClockOverlayProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(new Date());
  const resolvedLocale = useMemo(
    () => locale || (typeof navigator !== "undefined" ? navigator.language : "zh-CN"),
    [locale]
  );

  useEffect(() => {
    setMounted(true);
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const hours = `${now.getHours()}`.padStart(2, "0");
  const minutes = `${now.getMinutes()}`.padStart(2, "0");
  const seconds = `${now.getSeconds()}`.padStart(2, "0");

  const timeRef = useRef<HTMLDivElement | null>(null);
  const [timeWidth, setTimeWidth] = useState<number | undefined>(undefined);
  useEffect(() => {
    const update = () => {
      if (timeRef.current) setTimeWidth(timeRef.current.offsetWidth);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [hours, minutes]);

  const dateMainText = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(resolvedLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(now);
    } catch {
      return now.toDateString();
    }
  }, [now, resolvedLocale]);

  const weekdayText = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(resolvedLocale, { weekday: "long" }).format(now);
    } catch {
      return "";
    }
  }, [now, resolvedLocale]);

  const positionClass = scoped
    ? "absolute left-4 top-[calc(env(safe-area-inset-top)+72px)] md:left-12 md:right-auto md:top-auto md:bottom-[calc(env(safe-area-inset-bottom)+24px)]"
    : "fixed left-4 top-[calc(env(safe-area-inset-top)+72px)] md:left-12 md:right-auto md:top-auto md:bottom-[calc(env(safe-area-inset-bottom)+24px)]";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const targetSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const sec = containerRef.current.closest("section") as HTMLElement | null;
    targetSectionRef.current = sec ?? null;
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = targetSectionRef.current ?? document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      className={`${positionClass} z-30 pointer-events-none select-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${className ?? ""}`}
    >
      <div ref={timeRef} className="clock-font font-extralight leading-none tracking-[-.02em] tabular-nums text-6xl sm:text-7xl md:text-8xl lg:text-9xl">
        <span>{hours}</span>
        <span className="colon-pulse">:</span>
        <span>{minutes}</span>
        <span className="align-top ml-2 text-lg sm:text-xl md:text-2xl lg:text-3xl opacity-90">{seconds}</span>
      </div>
      <div
        className="clock-font mt-2 text-base sm:text-lg md:text-xl lg:text-2xl opacity-95 flex items-center gap-3 truncate max-w-[calc(100vw-56px)] sm:max-w-none"
        style={{ width: timeWidth ? `${timeWidth}px` : undefined, maxWidth: 'calc(100vw - 56px)' }}
        title={`${dateMainText} ${weekdayText}`}
      >
        <span>{dateMainText}</span>
        <span aria-hidden className="opacity-60">·</span>
        <span className="opacity-90">{weekdayText}</span>
        <button
          type="button"
          aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
          onClick={toggleFullscreen}
          className="pointer-events-auto ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/25 text-black backdrop-blur-md hover:bg-white/60 hover:border-white/30 hover:shadow hover:shadow-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-0 dark:text-white dark:bg-black/35 dark:border-white/10 dark:hover:bg-black/50 dark:hover:border-white/20"
          style={{ 
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 0.9s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </div>
  );
}
