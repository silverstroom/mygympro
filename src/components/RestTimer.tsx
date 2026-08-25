"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, SkipForward, Timer } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { restDone, vibrate } from "@/lib/sound";

export default function RestTimer() {
  const active = useStore((s) => s.active);
  const sound = useStore((s) => s.settings.sound);
  const adjustRest = useStore((s) => s.adjustRest);
  const stopRest = useStore((s) => s.stopRest);
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);

  const restUntil = active?.restUntil ?? null;
  const restTotal = active?.restTotal ?? 0;

  useEffect(() => {
    if (!restUntil) {
      firedRef.current = false;
      return;
    }
    const iv = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(iv);
  }, [restUntil]);

  useEffect(() => {
    if (!restUntil) return;
    const remaining = restUntil - now;
    if (remaining <= 0 && !firedRef.current) {
      firedRef.current = true;
      restDone(sound);
      vibrate([120, 80, 160]);
      stopRest();
    }
  }, [now, restUntil, sound, stopRest]);

  const remaining = restUntil ? Math.max(0, restUntil - now) : 0;
  const sec = Math.ceil(remaining / 1000);
  const frac = restTotal > 0 ? Math.min(1, remaining / 1000 / restTotal) : 0;
  const mm = Math.floor(sec / 60);
  const ss = String(sec % 60).padStart(2, "0");

  const R = 15.5;
  const C = 2 * Math.PI * R;

  return (
    <AnimatePresence>
      {restUntil && sec > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.22 }}
          className="fixed inset-x-0 z-50 flex justify-center px-4"
          style={{ bottom: "calc(var(--nav-h) + var(--sab) + var(--bottom-stack, 0px) + 14px)" }}
        >
          <div className="flex items-center gap-2.5 rounded-full border border-[rgba(251,191,36,0.35)] bg-[#1d1607] py-2 pl-3 pr-2 shadow-[0_16px_44px_rgba(0,0,0,0.55)]">
            <span className="relative flex h-10 w-10 items-center justify-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                <circle cx="18" cy="18" r={R} fill="none" stroke="rgba(251,191,36,0.18)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r={R}
                  fill="none"
                  stroke="var(--amber)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${frac * C} ${C}`}
                  style={{ transition: "stroke-dasharray 220ms linear" }}
                />
              </svg>
              <Timer size={16} weight="fill" color="var(--amber)" />
            </span>
            <div className="mr-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(251,191,36,0.8)]">
                Recupero
              </div>
              <div className="display-num text-[19px] text-amber">
                {mm}:{ss}
              </div>
            </div>
            <button
              aria-label="Meno 15 secondi"
              onClick={() => adjustRest(-15)}
              className="press flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(251,191,36,0.12)] text-amber"
            >
              <Minus size={15} weight="bold" />
            </button>
            <button
              aria-label="Più 15 secondi"
              onClick={() => adjustRest(15)}
              className="press flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(251,191,36,0.12)] text-amber"
            >
              <Plus size={15} weight="bold" />
            </button>
            <button
              aria-label="Salta recupero"
              onClick={() => stopRest()}
              className="press flex h-9 items-center gap-1 rounded-full bg-amber px-3 text-[12.5px] font-bold text-[#1d1607]"
            >
              <SkipForward size={14} weight="fill" />
              Salta
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
