"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

function themeColors(): string[] {
  const st = getComputedStyle(document.documentElement);
  const v = (k: string, fb: string) => st.getPropertyValue(k).trim() || fb;
  return [
    v("--accent", "#38bdf8"),
    v("--accent-strong", "#7dd3fc"),
    "#fbbf24",
    "#f4f4f5",
    v("--accent-dim", "#0ea5e9"),
  ];
}

export default function Confetti({ fire }: { fire: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!fire || reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = themeColors();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const parts = Array.from({ length: 130 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 120,
      y: h * 0.4,
      vx: (Math.random() - 0.5) * 11,
      vy: -7 - Math.random() * 8,
      s: 4 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));

    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const el = (t - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      if (el > 2.4) return;
      for (const p of parts) {
        p.vy += 0.24;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - el / 2.2);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fire, reduce]);

  if (!fire) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[70]"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
