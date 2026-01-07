"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

export default function SmoothScrollEnhancer() {
  const lockedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const getSnapStops = (container: Element) => {
    const sections = Array.from(container.querySelectorAll('.snap-section')) as HTMLElement[];
    const stops = sections
      .map((el) => el.offsetTop)
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);
    // Ensure 0 is a stop.
    if (stops.length === 0 || stops[0] !== 0) stops.unshift(0);
    return stops;
  };

  const closestStopIndex = (stops: number[], scrollTop: number) => {
    if (stops.length === 0) return 0;
    let bestI = 0;
    let bestD = Math.abs(stops[0] - scrollTop);
    for (let i = 1; i < stops.length; i++) {
      const d = Math.abs(stops[i] - scrollTop);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    return bestI;
  };

  useLayoutEffect(() => {
    try {
      const snapContainer = document.querySelector('[data-snap-container]') as HTMLElement | null;
      if (!snapContainer) return;
      snapContainer.scrollTop = 0;
    } catch {}
  }, []);

  useEffect(() => {
    const smoothScrollTo = (element: Element, to: number, duration: number = 800) => {
      const start = element.scrollTop;
      const change = to - start;
      const startTime = performance.now();

      const animateScroll = (currentTime: number) => {
        if (lockedRef.current) {
          if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          return;
        }
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        element.scrollTop = start + change * easeProgress;
        
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animateScroll);
        }
      };

      rafRef.current = requestAnimationFrame(animateScroll);
    };

    const handleWheel = (e: Event) => {
      const wheelEvent = e as WheelEvent;
      const target = wheelEvent.currentTarget as Element;
      if (!target) return;

      const isSnapContainer = (target as HTMLElement).hasAttribute?.('data-snap-container');
      if (!isSnapContainer) return;
  if (lockedRef.current) { wheelEvent.preventDefault(); return; }
      if (Math.abs(wheelEvent.deltaY) < 10) return;

      wheelEvent.preventDefault();

      const container = target as HTMLElement;
      const currentScroll = container.scrollTop;
      const direction = wheelEvent.deltaY > 0 ? 1 : -1;
      const stops = getSnapStops(container);
      const idx = closestStopIndex(stops, currentScroll);
      const nextIdx = Math.max(0, Math.min(stops.length - 1, idx + direction));
      const targetScroll = stops[nextIdx] ?? 0;

      if (Math.abs(targetScroll - currentScroll) > 50) smoothScrollTo(container, targetScroll, 600);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
  const target = document.querySelector('[data-snap-container]');
      if (!target) return;
  if (lockedRef.current) { e.preventDefault(); return; }

      const container = target as HTMLElement;
      const currentScroll = container.scrollTop;
      const stops = getSnapStops(container);
      const idx = closestStopIndex(stops, currentScroll);

      let targetScroll: number | null = null;

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          targetScroll = stops[Math.min(stops.length - 1, idx + 1)] ?? null;
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          targetScroll = stops[Math.max(0, idx - 1)] ?? null;
          break;
        case 'Home':
          e.preventDefault();
          targetScroll = 0;
          break;
        case 'End':
          e.preventDefault();
          targetScroll = stops[stops.length - 1] ?? null;
          break;
        case ' ':
          e.preventDefault();
          const direction = e.shiftKey ? -1 : 1;
          targetScroll = stops[Math.max(0, Math.min(stops.length - 1, idx + direction))] ?? null;
          break;
      }

      if (targetScroll !== null && Math.abs(targetScroll - currentScroll) > 50) {
        smoothScrollTo(container, targetScroll, 500);
      }
    };

    const snapContainer = document.querySelector('[data-snap-container]');
    if (snapContainer) {
      snapContainer.classList.add('enhanced-scroll');
      snapContainer.addEventListener('wheel', handleWheel, { passive: false });
    }

    document.addEventListener('keydown', handleKeyDown);

    const onLock = () => {
      lockedRef.current = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    const onUnlock = () => {
      lockedRef.current = false;
    };
    window.addEventListener('site-lockdown:enable', onLock);
    window.addEventListener('site-lockdown:disable', onUnlock);

    return () => {
      if (snapContainer) {
        snapContainer.removeEventListener('wheel', handleWheel);
        snapContainer.classList.remove('enhanced-scroll');
      }
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('site-lockdown:enable', onLock);
      window.removeEventListener('site-lockdown:disable', onUnlock);
    };
  }, []);

  return null;
}
