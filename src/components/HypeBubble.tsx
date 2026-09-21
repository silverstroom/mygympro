"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { create } from "zustand";
import { Fire, HandsClapping, Trophy } from "@phosphor-icons/react";
import type { HypeTone } from "@/lib/hype";

interface HypeState {
  text: string | null;
  tone: HypeTone;
  seq: number;
  pop: (text: string, tone?: HypeTone) => void;
  clear: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export const useHype = create<HypeState>((set, get) => ({
  text: null,
  tone: "ok",
  seq: 0,
  pop: (text, tone = "ok") => {
    if (timer) clearTimeout(timer);
    set({ text, tone, seq: get().seq + 1 });
    timer = setTimeout(() => set({ text: null }), tone === "ok" ? 3400 : 4200);
  },
  clear: () => {
    if (timer) clearTimeout(timer);
    set({ text: null });
  },
}));

export function hypeSay(text: string, tone: HypeTone = "ok") {
  useHype.getState().pop(text, tone);
}

const ICONS = {
  ok: HandsClapping,
  fire: Fire,
  pr: Trophy,
};

/** Il fumetto che compare quando spunti una serie. */
export default function HypeBubble({ raised = false }: { raised?: boolean }) {
  const reduce = useReducedMotion();
  const text = useHype((s) => s.text);
  const tone = useHype((s) => s.tone);
  const seq = useHype((s) => s.seq);
  const clear = useHype((s) => s.clear);
  const Icon = ICONS[tone] ?? HandsClapping;

  // fondo pieno: il fumetto non deve lasciar vedere i pulsanti sotto
  const colors =
    tone === "pr"
      ? "border-[rgba(251,191,36,0.5)] bg-[#1d1607] text-amber"
      : tone === "fire"
        ? "border-[rgba(56,189,248,0.5)] bg-[#0c2331] text-accent"
        : "border-line-strong bg-surface-2 text-ink";

  return (
    <AnimatePresence>
      {text && (
        <motion.button
          key={seq}
          onClick={clear}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
          transition={{ type: "spring", duration: 0.55, bounce: 0.35 }}
          aria-live="polite"
          className="fixed left-4 right-[76px] z-[52] flex justify-center"
          style={{
            bottom: raised
              ? "calc(var(--nav-h) + var(--sab) + var(--bottom-stack, 0px) + 84px)"
              : "calc(var(--nav-h) + var(--sab) + var(--bottom-stack, 0px) + 20px)",
          }}
        >
          <span className="relative max-w-[330px]">
            <span
              className={`flex items-start gap-2.5 rounded-[18px] rounded-bl-[6px] border px-4 py-3 text-left text-[14px] font-semibold leading-snug shadow-[0_16px_44px_rgba(0,0,0,0.5)] ${colors}`}
            >
              <Icon size={19} weight="fill" className="mt-[1px] shrink-0" />
              {text}
            </span>
            <span
              className={`absolute -bottom-[5px] left-5 h-2.5 w-2.5 rotate-45 border-b border-r ${colors}`}
            />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
