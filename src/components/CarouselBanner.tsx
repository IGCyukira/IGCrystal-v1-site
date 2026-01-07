"use client";

import Image from "next/image";
import revaeaLoader from "@/lib/revaeaLoader";
import { useEffect, useRef, useState } from "react";

export type CarouselBannerProps = {
  baseUrl?: string; 
  intervalMs?: number; 
  className?: string;
  overlayClassName?: string;
  onParallax?: (pos: { x: number; y: number }) => void;
};

function makeRandomUrl(base: string): string {
  const ts = Date.now();
  const r = Math.random().toString(36).slice(2);
  const hasQuery = base.includes("?");
  return `${base}${hasQuery ? "&" : "?"}ts=${ts}&r=${r}`;
}

export default function CarouselBanner({
  baseUrl = "https://api.revaea.com",
  intervalMs = 5000,
  className,
  overlayClassName,
  onParallax,
}: CarouselBannerProps) {

  const [currentSrc, setCurrentSrc] = useState<string>(baseUrl);
  const [nextSrc, setNextSrc] = useState<string | null>(null);
  const [currentLoaded, setCurrentLoaded] = useState<boolean>(false);
  const [nextReady, setNextReady] = useState<boolean>(false);
  const [showNext, setShowNext] = useState<boolean>(false);
  const fadeMs = 700;
  const timerRef = useRef<number | null>(null);

  const sectionRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState<boolean>(false);

  // Mouse parallax/tilt effect
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const rafRefParallax = useRef<number | null>(null);
  const targetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTranslateRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const baseScale = 1.06; 
  const activeScaleRef = useRef<number>(baseScale);
  const movePx = 14;
  const reducedMotion = typeof window !== "undefined" && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        setInView(e.isIntersecting && e.intersectionRatio >= 0.35);
      },
      { threshold: [0, 0.35, 0.75, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || nextSrc) return;
    setNextSrc(makeRandomUrl(baseUrl));
  }, [inView, baseUrl, nextSrc]);

  useEffect(() => {
    const wrap = parallaxRef.current;
    if (!wrap) return;
    const node = wrap;

    if (inView) {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      node.style.transition = "";
      node.style.opacity = "";
      return () => {
        if (resetTimerRef.current !== null) {
          window.clearTimeout(resetTimerRef.current);
          resetTimerRef.current = null;
        }
      };
    }

    targetRef.current.x = 0;
    targetRef.current.y = 0;
    currentRef.current.x = 0;
    currentRef.current.y = 0;
    lastTranslateRef.current.x = 0;
    lastTranslateRef.current.y = 0;
    if (rafRefParallax.current) {
      cancelAnimationFrame(rafRefParallax.current);
      rafRefParallax.current = null;
    }

    const scale = activeScaleRef.current || baseScale;
    node.style.transition = "transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease";
    node.style.transform = `scale(${scale}) translate3d(0px, 0px, 0)`;
    node.style.opacity = "0.94";

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      node.style.transition = "";
      node.style.opacity = "";
      resetTimerRef.current = null;
    }, 400);

    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      node.style.transition = "";
      node.style.opacity = "";
    };
  }, [inView, baseScale]);

  useEffect(() => {
    if (reducedMotion || !inView) return;
    const host = sectionRef.current;
    const wrap = parallaxRef.current;
    if (!host || !wrap) return;
    activeScaleRef.current = baseScale;

    // 仅在没有任何 transform 时设置初始缩放，避免离开/重入时尺寸跳变
    if (!wrap.style.transform) {
      wrap.style.transform = `scale(${baseScale})`;
    }

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      const tx = targetRef.current.x;
      const ty = targetRef.current.y;
      currentRef.current.x = lerp(currentRef.current.x, tx, 0.08);
      currentRef.current.y = lerp(currentRef.current.y, ty, 0.08);
      const cx = currentRef.current.x;
      const cy = currentRef.current.y;
      const desiredX = cx * movePx;
      const desiredY = cy * movePx;
      let translateX = desiredX;
      let translateY = desiredY;
      const rect = host.getBoundingClientRect();
      const buffer = 3;       
      const freezeBand = 6;  
      const maxX = Math.max(0, (baseScale - 1) * rect.width * 0.5 - buffer);
      const maxY = Math.max(0, (baseScale - 1) * rect.height * 0.5 - buffer);
      const boundaryX = Math.max(0, maxX - freezeBand);
      const boundaryY = Math.max(0, maxY - freezeBand);
      const prevX = lastTranslateRef.current.x;
      const prevY = lastTranslateRef.current.y;

      if (Math.abs(desiredX) > boundaryX && Math.abs(desiredX) >= Math.abs(prevX) && Math.sign(desiredX || 1) === Math.sign(prevX || desiredX || 1)) {
        translateX = Math.sign(desiredX) * boundaryX;
      }
      if (Math.abs(desiredY) > boundaryY && Math.abs(desiredY) >= Math.abs(prevY) && Math.sign(desiredY || 1) === Math.sign(prevY || desiredY || 1)) {
        translateY = Math.sign(desiredY) * boundaryY;
      }

      translateX = Math.max(-maxX, Math.min(maxX, translateX));
      translateY = Math.max(-maxY, Math.min(maxY, translateY));
      wrap.style.transform = `scale(${baseScale}) translate3d(${translateX}px, ${translateY}px, 0)`;
      lastTranslateRef.current.x = translateX;
      lastTranslateRef.current.y = translateY;
      try { onParallax?.({ x: cx, y: cy }); } catch {}
      rafRefParallax.current = window.requestAnimationFrame(tick);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return; 
      const rect = host.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
      targetRef.current.x = nx;
      targetRef.current.y = ny;
      if (rafRefParallax.current == null) rafRefParallax.current = window.requestAnimationFrame(tick);
    };
    const onPointerLeave = () => {
      targetRef.current.x = 0;
      targetRef.current.y = 0;
      if (rafRefParallax.current == null) rafRefParallax.current = window.requestAnimationFrame(tick);
    };

    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerleave', onPointerLeave);

    return () => {
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      if (rafRefParallax.current) cancelAnimationFrame(rafRefParallax.current);
      rafRefParallax.current = null;
    };
  }, [reducedMotion, baseScale, movePx, onParallax, inView]);

  useEffect(() => {
    if (reducedMotion || !inView) return;
    const host = sectionRef.current;
    const wrap = parallaxRef.current;
    if (!host || !wrap) return;

    const mobileScale = 1.12;      
    const mobileMovePx = 20;      
    const mobileBuffer = 2;        
    const mobileFreezeBand = 3;   
    activeScaleRef.current = mobileScale;
    let attached = false;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      // smooth to target
      const tx = targetRef.current.x;
      const ty = targetRef.current.y;
      currentRef.current.x = lerp(currentRef.current.x, tx, 0.08);
      currentRef.current.y = lerp(currentRef.current.y, ty, 0.08);
      const cx = currentRef.current.x;
      const cy = currentRef.current.y;
      const desiredX = cx * mobileMovePx;
      const desiredY = cy * mobileMovePx;
      let translateX = desiredX;
      let translateY = desiredY;
      const rect = host.getBoundingClientRect();
      const buffer = mobileBuffer;
      const freezeBand = mobileFreezeBand;
      const maxX = Math.max(0, (mobileScale - 1) * rect.width * 0.5 - buffer);
      const maxY = Math.max(0, (mobileScale - 1) * rect.height * 0.5 - buffer);
      const boundaryX = Math.max(0, maxX - freezeBand);
      const boundaryY = Math.max(0, maxY - freezeBand);
      const prevX = lastTranslateRef.current.x;
      const prevY = lastTranslateRef.current.y;
      if (Math.abs(desiredX) > boundaryX && Math.abs(desiredX) >= Math.abs(prevX) && Math.sign(desiredX || 1) === Math.sign(prevX || desiredX || 1)) {
        translateX = Math.sign(desiredX) * boundaryX;
      }
      if (Math.abs(desiredY) > boundaryY && Math.abs(desiredY) >= Math.abs(prevY) && Math.sign(desiredY || 1) === Math.sign(prevY || desiredY || 1)) {
        translateY = Math.sign(desiredY) * boundaryY;
      }
      translateX = Math.max(-maxX, Math.min(maxX, translateX));
      translateY = Math.max(-maxY, Math.min(maxY, translateY));
      wrap.style.transform = `scale(${mobileScale}) translate3d(${translateX}px, ${translateY}px, 0)`;
      lastTranslateRef.current.x = translateX;
      lastTranslateRef.current.y = translateY;
      try { onParallax?.({ x: cx, y: cy }); } catch {}
      rafRefParallax.current = window.requestAnimationFrame(tick);
    };

    const onOrientation = (e: DeviceOrientationEvent) => {
      const gamma = (e.gamma ?? 0); 
      const beta = (e.beta ?? 0);  
      const nx = clamp(gamma / 30, -1, 1);
      const ny = clamp(beta / 30, -1, 1);
      targetRef.current.x = nx;
      targetRef.current.y = ny; 
      if (rafRefParallax.current == null) rafRefParallax.current = window.requestAnimationFrame(tick);
    };

    const attach = () => {
      if (attached) return;
      window.addEventListener('deviceorientation', onOrientation);
      attached = true;
    };

    const tryRequestPermission = async () => {
      try {
        const DOClass = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<"granted" | "denied"> } }).DeviceOrientationEvent;
        if (DOClass && typeof DOClass.requestPermission === 'function') {
          const res = await DOClass.requestPermission();
          if (res === 'granted') attach();
        } else {
          attach();
        }
      } catch {
        // ignore
      }
    };

    const onFirstInteract = () => {
      tryRequestPermission();
      host.removeEventListener('pointerdown', onFirstInteract);
      host.removeEventListener('touchend', onFirstInteract);
      host.removeEventListener('click', onFirstInteract);
    };

    attach();
    host.addEventListener('pointerdown', onFirstInteract, { once: true });
    host.addEventListener('touchend', onFirstInteract, { once: true });
    host.addEventListener('click', onFirstInteract, { once: true });

    return () => {
      if (attached) window.removeEventListener('deviceorientation', onOrientation);
      if (rafRefParallax.current) cancelAnimationFrame(rafRefParallax.current);
      rafRefParallax.current = null;
      host.removeEventListener('pointerdown', onFirstInteract as EventListener);
      host.removeEventListener('touchend', onFirstInteract as EventListener);
      host.removeEventListener('click', onFirstInteract as EventListener);
    };
  }, [reducedMotion, inView, onParallax]);

  useEffect(() => {
    const host = sectionRef.current;
    if (!host) return;
    let startX = 0;
    let startY = 0;
    const horizontalThreshold = 10;

    const onTouchStart = (ev: TouchEvent) => {
      const touch = ev.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const onTouchMove = (ev: TouchEvent) => {
      if (ev.touches.length !== 1) return;
      const touch = ev.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > horizontalThreshold) {
        ev.preventDefault();
      }
    };

    host.addEventListener('touchstart', onTouchStart, { passive: true });
    host.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      host.removeEventListener('touchstart', onTouchStart);
      host.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  useEffect(() => {
    if (!inView) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    const id = window.setInterval(() => {
      if (!nextReady) return;
      setShowNext(true);
      window.setTimeout(() => {
        if (nextSrc) setCurrentSrc(nextSrc);
        setNextSrc(makeRandomUrl(baseUrl));
        setShowNext(false);
        setCurrentLoaded(true);
        setNextReady(false);
      }, fadeMs);
    }, Math.max(1500, intervalMs));
    timerRef.current = id;
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [inView, baseUrl, intervalMs, nextReady, nextSrc]);

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className={`relative h-[100svh] h-[100dvh] h-[var(--app-height)] w-full overflow-hidden overflow-x-hidden ${className ?? ""}`}
      style={{ touchAction: "pan-y" }}
    >
      {/* Parallax wrapper for images */}
      <div
        ref={parallaxRef}
        className="absolute inset-0 will-change-transform"
        style={{ transformOrigin: "center", WebkitTransformOrigin: "center" }}
      >
        <Image
          loader={revaeaLoader}
          key={currentSrc}
          src={currentSrc}
          alt="banner-current"
          fill
          priority
          sizes="100vw"
          className={`absolute inset-0 h-full w-full object-cover select-none transition duration-700 ease-out will-change-transform ${showNext ? "opacity-0 scale-105" : currentLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
          onLoad={() => setCurrentLoaded(true)}
          draggable={false}
        />
        {nextSrc && (
          <Image
            loader={revaeaLoader}
            key={nextSrc}
            src={nextSrc}
            alt="banner-next"
            fill
            sizes="100vw"
            loading="eager"
            className={`absolute inset-0 h-full w-full object-cover select-none transition duration-700 ease-out will-change-transform ${showNext && nextReady ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
            onLoad={() => setNextReady(true)}
            draggable={false}
          />
        )}
      </div>
      <div
        className={`absolute inset-0 bg-black/40 pointer-events-none ${overlayClassName ?? ""}`}
        aria-hidden
      />
    </section>
  );
}

