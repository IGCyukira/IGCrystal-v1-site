import CarouselBanner from "@/components/CarouselBanner";
import MusicCard from "@/components/MusicCard";
import ClockOverlay from "@/components/ClockOverlay";
import TerminalSection from "@/components/TerminalSection";
import LockdownOverlay from "@/components/LockdownOverlay";
import SmoothScrollEnhancer from "@/components/SmoothScrollEnhancer";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <SmoothScrollEnhancer />
      <main className="relative snap-y snap-mandatory h-[100svh] overflow-y-auto">
        <LockdownOverlay />
        <section className="relative snap-start min-h-[100svh]">
          <CarouselBanner />
          <ClockOverlay scoped />
          <div className="pointer-events-auto absolute left-3 right-3 sm:right-6 sm:left-auto flex justify-end bottom-[calc(env(safe-area-inset-bottom)+16px)] sm:bottom-6">
            <MusicCard />
          </div>
        </section>
        <TerminalSection id="terminal" />
      </main>
    </>
  );
}
