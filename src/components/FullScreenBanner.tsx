"use client";
import Image from "next/image";
import revaeaLoader from "@/lib/revaeaLoader";
import { useState } from "react";

export type FullScreenBannerProps = {
  src: string;
  alt?: string;
  className?: string;
  overlayClassName?: string;
};

export default function FullScreenBanner({ src, alt = "banner", className, overlayClassName }: FullScreenBannerProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <section className={`relative h-[100svh] h-[100dvh] h-[var(--app-height)] w-full overflow-hidden ${className ?? ""}`}>
      <Image
        loader={revaeaLoader}
        src={src}
        alt={alt}
        fill
        priority
        sizes="(max-width: 768px) 100vw, 100vw"
        className={`absolute inset-0 h-full w-full object-cover select-none transition duration-700 ease-out will-change-transform ${loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
        onLoad={() => setLoaded(true)}
        draggable={false}
      />
      <div
        className={`absolute inset-0 bg-black/40 pointer-events-none ${overlayClassName ?? ""}`}
        aria-hidden
      />
    </section>
  );
}
