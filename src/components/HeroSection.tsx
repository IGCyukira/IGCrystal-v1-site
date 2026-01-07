"use client";

import { useRef, useState } from "react";
import CarouselBanner from "@/components/CarouselBanner";
import ClockOverlay from "@/components/ClockOverlay";
import MusicCard from "@/components/MusicCard";

export default function HeroSection() {
  const [parallax, setParallax] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const uiRef = useRef<HTMLDivElement | null>(null);

  return (
    <section className="relative snap-start min-h-[100svh] min-h-[100dvh] min-h-[var(--app-height)] snap-section overflow-hidden">
      <CarouselBanner onParallax={setParallax} />
      {/* UI with slight parallax (smaller amplitude for depth) */}
      <div
        ref={uiRef}
        className="pointer-events-none absolute inset-0"
        style={{
          transform: `translate3d(${parallax.x * 6}px, ${parallax.y * 6}px, 0)`,
          willChange: 'transform'
        }}
      >
        <ClockOverlay scoped />
        <div className="pointer-events-auto absolute left-3 right-3 sm:right-6 sm:left-auto flex justify-end bottom-[calc(env(safe-area-inset-bottom)+16px)] sm:bottom-6">
          <MusicCard />
        </div>
      </div>
    </section>
  );
}
