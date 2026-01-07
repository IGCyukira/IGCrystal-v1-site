import TerminalSection from "@/components/TerminalSection";
import LockdownOverlay from "@/components/LockdownOverlay";
import SmoothScrollEnhancer from "@/components/SmoothScrollEnhancer";
import HeroSection from "@/components/HeroSection";
import ViewportHeightFix from "@/components/ViewportHeightFix";
import SnapContainer from "@/components/SnapContainer";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <ViewportHeightFix />
      <SmoothScrollEnhancer />
      <SnapContainer className="relative h-[100svh] h-[100dvh] h-[var(--app-height)] overflow-y-auto">
        <LockdownOverlay />
        <HeroSection />
        <TerminalSection id="terminal" />
      </SnapContainer>
    </>
  );
}
