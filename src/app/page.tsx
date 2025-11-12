import TerminalSection from "@/components/TerminalSection";
import LockdownOverlay from "@/components/LockdownOverlay";
import SmoothScrollEnhancer from "@/components/SmoothScrollEnhancer";
import HeroSection from "@/components/HeroSection";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <SmoothScrollEnhancer />
      <main className="relative snap-y snap-mandatory h-[100svh] overflow-y-auto overflow-x-hidden">
        <LockdownOverlay />
        <HeroSection />
        <TerminalSection id="terminal" />
      </main>
    </>
  );
}
