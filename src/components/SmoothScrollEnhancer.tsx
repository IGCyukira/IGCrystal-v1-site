"use client";

import { useEffect, useRef } from "react";

export default function SmoothScrollEnhancer() {
  const lockedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const smoothScrollTo = (element: Element, to: number, duration: number = 800) => {
      const start = element.scrollTop;
      const change = to - start;
      const startTime = performance.now();

      const animateScroll = (currentTime: number) => {
        if (lockedRef.current) {
          // Abort animation when locked
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

      const isSnapContainer = target.classList.contains('snap-y') || 
                              target.classList.contains('snap-mandatory');
      
  if (!isSnapContainer) return;
  if (lockedRef.current) { wheelEvent.preventDefault(); return; }
      if (Math.abs(wheelEvent.deltaY) < 10) return;

      wheelEvent.preventDefault();

      const containerHeight = target.clientHeight;
      const currentScroll = target.scrollTop;
      const maxScroll = target.scrollHeight - containerHeight;
      const direction = wheelEvent.deltaY > 0 ? 1 : -1;
      const targetScroll = Math.max(0, Math.min(maxScroll, 
        Math.round(currentScroll / containerHeight + direction) * containerHeight
      ));

      if (Math.abs(targetScroll - currentScroll) > 50) {
        smoothScrollTo(target, targetScroll, 600);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
  const target = document.querySelector('.snap-y');
      if (!target) return;
  if (lockedRef.current) { e.preventDefault(); return; }

      const containerHeight = target.clientHeight;
      const currentScroll = target.scrollTop;
      const maxScroll = target.scrollHeight - containerHeight;

      let targetScroll: number | null = null;

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          targetScroll = Math.min(maxScroll, 
            Math.round(currentScroll / containerHeight + 1) * containerHeight
          );
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          targetScroll = Math.max(0, 
            Math.round(currentScroll / containerHeight - 1) * containerHeight
          );
          break;
        case 'Home':
          e.preventDefault();
          targetScroll = 0;
          break;
        case 'End':
          e.preventDefault();
          targetScroll = maxScroll;
          break;
        case ' ':
          e.preventDefault();
          const direction = e.shiftKey ? -1 : 1;
          targetScroll = Math.max(0, Math.min(maxScroll,
            Math.round(currentScroll / containerHeight + direction) * containerHeight
          ));
          break;
      }

      if (targetScroll !== null && Math.abs(targetScroll - currentScroll) > 50) {
        smoothScrollTo(target, targetScroll, 500);
      }
    };

    const snapContainer = document.querySelector('.snap-y');
    if (snapContainer) {
      try {
        (snapContainer as HTMLElement).scrollTop = 0;
        requestAnimationFrame(() => {
          try { (snapContainer as HTMLElement).scrollTop = 0; } catch {}
        });
      } catch {}
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
