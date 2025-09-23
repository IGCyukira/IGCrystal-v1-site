"use client";

import { useCallback, useEffect, useState } from "react";

export default function LockdownOverlay() {
  const [locked, setLocked] = useState<boolean>(false);
  const [popups, setPopups] = useState<Array<{
    top: number;
    left: number;
    z: number;
    opacity: number;
    delay: number;
    width: number;
    height: number;
  }>>([]);

  const basePopupWidth = 320;
  const basePopupHeight = 140;
  const computeSnakePopups = useCallback(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const positions: Array<{
      top: number;
      left: number;
      z: number;
      opacity: number;
      delay: number;
      width: number;
      height: number;
    }> = [];

    const coarseCellW = Math.max(72, Math.floor(basePopupWidth * 0.7));
    const coarseCellH = Math.max(60, Math.floor(basePopupHeight * 0.7));
    const coarseCols = Math.max(1, Math.ceil(screenWidth / coarseCellW));
    const coarseRows = Math.max(1, Math.ceil(screenHeight / coarseCellH));
    const totalCells = coarseCols * coarseRows;
    const visited = new Set<string>();
    const markVisited = (px: number, py: number) => {
      const cx = Math.min(coarseCols - 1, Math.max(0, Math.floor((px + basePopupWidth / 2) / coarseCellW)));
      const cy = Math.min(coarseRows - 1, Math.max(0, Math.floor((py + basePopupHeight / 2) / coarseCellH)));
      visited.add(`${cx}:${cy}`);
    };

    let x = Math.max(0, Math.floor((screenWidth - basePopupWidth) / 2));
    let y = Math.max(0, Math.floor((screenHeight - basePopupHeight) / 2));
    let angle = Math.random() * Math.PI * 2; // 0-360°
    angle += (Math.random() - 0.5) * (Math.PI / 6); // +-30° 偏移，避免过于规则

    const step = Math.max(24, Math.floor(Math.min(basePopupWidth, basePopupHeight) * 0.55));
    let z = 3000;
    const maxCount = 2600; 

    for (let i = 0; i < maxCount; i++) {
      const top = Math.max(0, Math.min(screenHeight - basePopupHeight, Math.round(y)));
      const left = Math.max(0, Math.min(screenWidth - basePopupWidth, Math.round(x)));

      positions.push({
        top,
        left,
        z: z--,
        opacity: Math.max(0.06, 1 - i * 0.0025),
        delay: i * 0.012,
        width: basePopupWidth,
        height: basePopupHeight,
      });
      markVisited(left, top);

      angle += (Math.random() - 0.5) * (Math.PI / 24); // +-7.5°

      let nextX = x + Math.cos(angle) * step;
      let nextY = y + Math.sin(angle) * step;
      let bounced = false;

      if (nextX < 0 || nextX + basePopupWidth > screenWidth) {
        angle = Math.PI - angle + (Math.random() - 0.5) * (Math.PI / 18); // +-10°
        nextX = x + Math.cos(angle) * step;
        nextY = y + Math.sin(angle) * step;
        bounced = true;
      }

      if (nextY < 0 || nextY + basePopupHeight > screenHeight) {
        angle = -angle + (Math.random() - 0.5) * (Math.PI / 18);
        nextX = x + Math.cos(angle) * step;
        nextY = y + Math.sin(angle) * step;
        bounced = true;
      }

      if (bounced) {
        angle += (Math.random() - 0.5) * (Math.PI / 12); // +-15°
      }

      x = nextX;
      y = nextY;

      const covered = visited.size / totalCells;
      if (covered >= 0.92) break; 
    }

    return positions;
  }, []);

  useEffect(() => {
    const onEnable = () => {
      setLocked(true);
      try { setPopups(computeSnakePopups()); } catch {}
      try {
        document.body.style.overflow = "hidden";
      } catch {}
    };
    const onDisable = () => {
      setLocked(false);
      setPopups([]);
      try {
        document.body.style.overflow = "";
      } catch {}
    };
    window.addEventListener("site-lockdown:enable", onEnable);
    window.addEventListener("site-lockdown:disable", onDisable);
    return () => {
      window.removeEventListener("site-lockdown:enable", onEnable);
      window.removeEventListener("site-lockdown:disable", onDisable);
    };
  }, [computeSnakePopups]);

  useEffect(() => {
    if (!locked) return;
    const onResize = () => { try { setPopups(computeSnakePopups()); } catch {} };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [locked, computeSnakePopups]);

  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-[9999] text-white pointer-events-auto select-none">
      {/* video background */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="https://hls.wenturc.com/video/Xaleid%E2%97%86scopiX-xi[maimai].mp4"
        autoPlay
        muted={false}
        playsInline
        loop
      />
      {/* frosted overlay */}
      <div className="absolute inset-0 backdrop-blur-xl bg-black/40 pointer-events-none" />
      {popups.map((p, i) => (
        <div
          key={i}
          className="xp-popup popup-dynamic"
          style={{
            top: p.top,
            left: p.left,
            zIndex: p.z,
            opacity: p.opacity,
            width: Math.max(160, p.width - 8),
            height: Math.max(120, p.height - 8),
            animation: `popupGlitch 0.2s ease-in-out infinite, popupAppear 0.5s ${p.delay}s ease-out forwards`,
          }}
        >
          <div className="xp-titlebar">System Error</div>
          <div className="xp-content">
            <div className="xp-icon">×</div>
            <div>
              <div style={{ fontWeight: 700 }}>CRITICAL SYSTEM FAILURE</div>
              <div style={{ marginTop: 4, fontSize: 11 }}>
                A critical operation removed core components.<br/>
                The system is halted to prevent damage.<br/>
                Press F5 to reload. All interactions are disabled.
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className="lockdown-scanlines lockdown-glitch z-800" />
    </div>
  );
}


