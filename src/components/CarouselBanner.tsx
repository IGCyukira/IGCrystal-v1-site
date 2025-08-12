"use client";

import Image from "next/image";
import wenturcLoader from "@/lib/wenturcLoader";
import { useEffect, useRef, useState } from "react";

export type CarouselBannerProps = {
  baseUrl?: string; // e.g. https://api.wenturc.com
  intervalMs?: number; // 切换间隔
  className?: string;
  overlayClassName?: string;
};

function makeRandomUrl(base: string): string {
  const ts = Date.now();
  const r = Math.random().toString(36).slice(2);
  const hasQuery = base.includes("?");
  return `${base}${hasQuery ? "&" : "?"}ts=${ts}&r=${r}`;
}

export default function CarouselBanner({
  baseUrl = "https://api.wenturc.com",
  intervalMs = 5000,
  className,
  overlayClassName,
}: CarouselBannerProps) {
  // 为避免 SSR/CSR 不一致，初始用稳定的 baseUrl，挂载后再生成随机 URL
  const [currentSrc, setCurrentSrc] = useState<string>(baseUrl);
  const [nextSrc, setNextSrc] = useState<string | null>(null);
  const [currentLoaded, setCurrentLoaded] = useState<boolean>(false);
  const [nextReady, setNextReady] = useState<boolean>(false);
  const [showNext, setShowNext] = useState<boolean>(false);
  const fadeMs = 700;
  const timerRef = useRef<number | null>(null);

  const sectionRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState<boolean>(false);

  // Observe visibility to control loading and switching
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        setInView(e.isIntersecting && e.intersectionRatio >= 0.35);
      },
      { threshold: [0, 0.35, 0.75, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 准备第一张 next 图，仅在进入视口时
  useEffect(() => {
    if (!inView || nextSrc) return;
    setNextSrc(makeRandomUrl(baseUrl));
  }, [inView, baseUrl, nextSrc]);

  useEffect(() => {
    if (!inView) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    // 周期性尝试切换；仅当下一张已加载才执行切换
    const id = window.setInterval(() => {
      if (!nextReady) return;
      setShowNext(true);
      // 交叉淡入完成后，正式切换并预加载下一张
      window.setTimeout(() => {
        if (nextSrc) setCurrentSrc(nextSrc);
        setNextSrc(makeRandomUrl(baseUrl));
        setShowNext(false);
        setCurrentLoaded(true);
        setNextReady(false);
      }, fadeMs);
    }, Math.max(1500, intervalMs));
    timerRef.current = id;
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [inView, baseUrl, intervalMs, nextReady, nextSrc]);

  return (
    <section ref={sectionRef as React.RefObject<HTMLElement>} className={`relative h-[100svh] w-full overflow-hidden ${className ?? ""}`}>
      {/* 当前图像 */}
      <Image
        loader={wenturcLoader}
        key={currentSrc}
        src={currentSrc}
        alt="banner-current"
        fill
        priority
        sizes="(max-width: 768px) 100vw, 100vw"
        className={`absolute inset-0 h-full w-full object-cover select-none transition duration-700 ease-out will-change-transform ${showNext ? "opacity-0 scale-105" : currentLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
        onLoad={() => setCurrentLoaded(true)}
        draggable={false}
      />
      {/* 预加载并在就绪后淡入的下一张图像 */}
      {nextSrc && (
      <Image
        loader={wenturcLoader}
        key={nextSrc}
        src={nextSrc}
        alt="banner-next"
        fill
        sizes="(max-width: 768px) 100vw, 100vw"
        loading="eager"
        className={`absolute inset-0 h-full w-full object-cover select-none transition duration-700 ease-out will-change-transform ${showNext && nextReady ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
        onLoad={() => setNextReady(true)}
        draggable={false}
      />)}
      <div
        className={`absolute inset-0 bg-black/40 pointer-events-none ${overlayClassName ?? ""}`}
        aria-hidden
      />
    </section>
  );
}

