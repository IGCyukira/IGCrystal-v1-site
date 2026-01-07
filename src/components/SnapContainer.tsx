"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export type SnapContainerProps = {
  className?: string;
  snapClassName?: string;
  children: ReactNode;
};

export default function SnapContainer({ className, snapClassName = "snap-y snap-mandatory", children }: SnapContainerProps) {
  const elRef = useRef<HTMLElement | null>(null);
  const [snapReady, setSnapReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    try {
      el.scrollTop = 0;
    } catch {}

    setVisible(true);
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const onPageShow = () => {
      try { el.scrollTop = 0; } catch {}
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setSnapReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const style = useMemo<CSSProperties | undefined>(() => {
    const s: CSSProperties = {};
    if (!snapReady) s.scrollSnapType = "none";
    return Object.keys(s).length ? s : undefined;
  }, [snapReady]);

  const mergedClassName = useMemo(() => {
    const base = className ?? "";
    const withRelative = base.includes("relative") ? base : `${base} relative`;
    return snapReady ? `${withRelative} ${snapClassName}`.trim() : withRelative.trim();
  }, [className, snapClassName, snapReady]);

  return (
    <main ref={elRef} data-snap-container className={mergedClassName} style={style}>
      <div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 w-full bg-neutral-300 dark:bg-black"
        style={{
          height: "var(--app-height, 100dvh)",
          opacity: visible ? 0 : 1,
          transition: "opacity 900ms ease-out",
          zIndex: 9999,
        }}
      />
      {children}
    </main>
  );
}
