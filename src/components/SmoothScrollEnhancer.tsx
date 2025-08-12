"use client";

import { useEffect } from "react";

export default function SmoothScrollEnhancer() {
  useEffect(() => {
    // Enhanced scroll behavior for better timing
    const smoothScrollTo = (element: Element, to: number, duration: number = 800) => {
      const start = element.scrollTop;
      const change = to - start;
      const startTime = performance.now();

      const animateScroll = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use cubic-bezier easing for smooth motion
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        element.scrollTop = start + change * easeProgress;
        
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        }
      };

      requestAnimationFrame(animateScroll);
    };

    // Enhanced wheel event handling
    const handleWheel = (e: Event) => {
      const wheelEvent = e as WheelEvent;
      const target = wheelEvent.currentTarget as Element;
      if (!target) return;

      // Check if we should handle this scroll
      const isSnapContainer = target.classList.contains('snap-y') || 
                              target.classList.contains('snap-mandatory');
      
      if (!isSnapContainer) return;

      // Only enhance for significant scroll movements
      if (Math.abs(wheelEvent.deltaY) < 10) return;

      wheelEvent.preventDefault();

      const containerHeight = target.clientHeight;
      const currentScroll = target.scrollTop;
      const maxScroll = target.scrollHeight - containerHeight;
      
      // Determine target section
      const direction = wheelEvent.deltaY > 0 ? 1 : -1;
      const targetScroll = Math.max(0, Math.min(maxScroll, 
        Math.round(currentScroll / containerHeight + direction) * containerHeight
      ));

      // Only animate if we're moving to a different section
      if (Math.abs(targetScroll - currentScroll) > 50) {
        smoothScrollTo(target, targetScroll, 600);
      }
    };

    // Enhanced keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = document.querySelector('.snap-y');
      if (!target) return;

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

    // Add enhanced scroll class and event listeners
    const snapContainer = document.querySelector('.snap-y');
    if (snapContainer) {
      snapContainer.classList.add('enhanced-scroll');
      snapContainer.addEventListener('wheel', handleWheel, { passive: false });
    }

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      if (snapContainer) {
        snapContainer.removeEventListener('wheel', handleWheel);
        snapContainer.classList.remove('enhanced-scroll');
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null; // This component doesn't render anything
}
