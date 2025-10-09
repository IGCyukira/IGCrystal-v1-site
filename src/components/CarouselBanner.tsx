"use client";

import Image from "next/image";
import wenturcLoader from "@/lib/wenturcLoader";
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
  baseUrl = "https://api.wenturc.com",
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
  const movePx = 14;
  const reducedMotion = typeof window !== "undefined" && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

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
    if (reducedMotion || !inView) return;
    const host = sectionRef.current;
    const wrap = parallaxRef.current;
    if (!host || !wrap) return;

    wrap.style.transform = `scale(${baseScale})`;

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
      try { wrap.style.transform = ''; } catch {}
      try { onParallax?.({ x: 0, y: 0 }); } catch {}
    };
  }, [reducedMotion, baseScale, movePx, onParallax, inView]);

  useEffect(() => {
    if (reducedMotion || !inView) return;
    const host = sectionRef.current;
    const wrap = parallaxRef.current;
    if (!host || !wrap) return;

    let attached = false;

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    // Local lerp and animation loop for gyro
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      // smooth to target
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
      // edge-aware saturation (same as mouse loop)
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
    <section ref={sectionRef as React.RefObject<HTMLElement>} className={`relative h-[100svh] w-full overflow-hidden ${className ?? ""}`}>
      {/* Parallax wrapper for images */}
      <div ref={parallaxRef} className="absolute inset-0 will-change-transform">
      <Image
        loader={wenturcLoader}
        key={currentSrc}
        src={currentSrc}
        alt="banner-current"
        fill
        priority
        sizes="(max-width: 768px) 100vw, 100vw"
        className={`absolute inset-0 h-full w-full object-cover select-none transition duration-700 ease-out will-change-transform ${showNext ? "opacity-0 scale-105" : currentLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
        onLoad={() => setCurrentLoaded(true)}
        draggable={false}
      />
      {nextSrc && (
      <Image
        loader={wenturcLoader}
        key={nextSrc}
        src={nextSrc}
        alt="banner-next"
        fill
        sizes="(max-width: 768px) 100vw, 100vw"
        loading="eager"
        className={`absolute inset-0 h-full w-full object-cover select-none transition duration-700 ease-out will-change-transform ${showNext && nextReady ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
        onLoad={() => setNextReady(true)}
        draggable={false}
      />)}
      </div>
      <div
        className={`absolute inset-0 bg-black/40 pointer-events-none ${overlayClassName ?? ""}`}
        aria-hidden
      />
    </section>
  );
}

