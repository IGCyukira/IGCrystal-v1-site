"use client";

import { useLayoutEffect } from "react";

export default function ViewportHeightFix() {
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    let rafId: number | null = null;

    const update = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const vv = window.visualViewport;
        const height = (vv && vv.height) ? vv.height : window.innerHeight;
        root.style.setProperty("--app-height", `${Math.round(height)}px`);
      });
    };

    update();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", update);
    }
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (vv) {
        vv.removeEventListener("resize", update);
      }
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return null;
}
