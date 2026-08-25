"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ChalkboardTeacher,
  PaperPlaneTilt,
  X,
} from "@phosphor-icons/react";
import type { ChatAction, ChatAnswer } from "@/lib/coachchat";
import { answer } from "@/lib/coachchat";
import { getIndexSync, loadIndex, loadSteps } from "@/lib/data";
import { useStore } from "@/lib/store";
import { currentAccount } from "@/lib/auth";
import { isGuest, GUEST_WO_LIMIT } from "@/lib/guest";
import { generateQuickWorkout } from "@/lib/quickwo";
import { buildEntry } from "@/lib/session";
import { useSignup } from "@/components/SignupPrompt";
import { toast } from "@/components/ui";

interface Msg {
  role: "user" | "coach";
  text: string;
  steps?: string[];
  actions?: ChatAction[];
}

let history: Msg[] = [];

const CHIPS = [
  "Cosa mi alleno oggi?",
  "Ho solo 30 minuti",
  "Come sto andando?",
  "Fammi una scheda",
  "Quante proteine?",
];

export default function CoachChat() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(history);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const active = useStore((s) => s.active);
  const startSession = useStore((s) => s.startSession);

  useEffect(() => {
    history = msgs;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, typing, open]);

  useEffect(() => {
    if (open && msgs.length === 0) {
      const name = currentAccount()?.name ?? "";
      setMsgs([
        {
          role: "coach",
          text: `Ciao${name && name !== "Ospite" ? ` ${name}` : ""}! Sono il tuo personal trainer virtuale: conosco le tue schede, i tuoi carichi e i tuoi progressi. Chiedimi quello che vuoi, oppure parti da un suggerimento qui sotto.`,
        },
      ]);
    }
  }, [open, msgs.length]);

  const runAction = async (a: ChatAction) => {
    if (a.type === "href") {
      setOpen(false);
      router.push(a.href);
      return;
    }
    if (a.type === "quick") {
      const s = useStore.getState();
      if (s.active) {
        setOpen(false);
        router.push("/allenamento");
        return;
      }
      if (isGuest() && s.workouts.length >= GUEST_WO_LIMIT) {
        setOpen(false);
        useSignup.getState().show("workouts");
        return;
      }
      try {
        const index = await loadIndex();
        const q = generateQuickWorkout(a.minutes, "palestra");
        const entries = q.exercises.map((re) =>
          buildEntry(re, s.workouts, s.exWeights, index, s.custom)
        );
        startSession(null, q.name, entries);
        toast(q.note, "info");
        setOpen(false);
        router.push("/allenamento");
      } catch {
        toast("Non riesco a preparare la sessione", "warn");
      }
    }
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setTyping(true);

    const s = useStore.getState();
    let index = getIndexSync();
    if (!index) {
      try {
        index = await loadIndex();
      } catch {
        index = [];
      }
    }
    const res: ChatAnswer = answer(text, {
      index: index ?? [],
      custom: s.custom,
      routines: s.routines,
      week: s.week,
      overrides: s.overrides,
      workouts: s.workouts,
      bodyweight: s.bodyweight,
      goalWeight: s.goalWeight,
      activities: s.activities ?? [],
      settings: s.settings,
      userName: currentAccount()?.name ?? "",
    });

    let steps: string[] | undefined;
    if (res.exId && res.showSteps && !res.exId.startsWith("c_")) {
      try {
        const d = await loadSteps(res.exId);
        steps = (d.it.length ? d.it : d.en).slice(0, 6);
      } catch {}
    }

    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [
        ...m,
        { role: "coach", text: res.text, steps, actions: res.actions },
      ]);
    }, 450);
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="coach-fab"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            aria-label="Chatta col personal trainer"
            onClick={() => setOpen(true)}
            className="press fixed right-4 z-40 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent shadow-[0_10px_28px_var(--accent-glow)]"
            style={{
              bottom: active?.restUntil
                ? "calc(var(--nav-h) + var(--sab) + var(--bottom-stack, 0px) + 86px)"
                : "calc(var(--nav-h) + var(--sab) + var(--bottom-stack, 0px) + 14px)",
            }}
          >
            <ChalkboardTeacher size={26} weight="fill" color="var(--accent-ink)" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="chat-bk"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.6)]"
            />
            <motion.div
              key="chat"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[92dvh] w-full max-w-[640px] flex-col rounded-t-[22px] border-t border-line-strong bg-surface"
              style={{ paddingBottom: "var(--sab)" }}
            >
              <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
                  <ChalkboardTeacher size={21} weight="fill" color="var(--accent-ink)" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold leading-tight">Coach</div>
                  <div className="text-[11.5px] text-ink-3">
                    Il tuo personal trainer · risponde coi tuoi dati
                  </div>
                </div>
                <button
                  aria-label="Chiudi chat"
                  onClick={() => setOpen(false)}
                  className="press flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-ink-2"
                >
                  <X size={17} weight="bold" />
                </button>
              </div>

              <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <div className="flex flex-col gap-3">
                  {msgs.map((m, i) =>
                    m.role === "user" ? (
                      <div
                        key={i}
                        className="ml-auto max-w-[85%] rounded-[16px] rounded-br-[5px] bg-accent px-3.5 py-2.5 text-[14px] font-medium leading-snug text-accent-ink"
                      >
                        {m.text}
                      </div>
                    ) : (
                      <div key={i} className="mr-auto max-w-[88%]">
                        <div className="rounded-[16px] rounded-bl-[5px] border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] leading-relaxed">
                          {m.text}
                          {m.steps && (
                            <ol className="mt-2 flex flex-col gap-1.5 border-t border-line pt-2">
                              {m.steps.map((s, j) => (
                                <li key={j} className="flex gap-2 text-[13px] leading-snug text-ink-2">
                                  <span className="tnum shrink-0 font-bold text-accent">{j + 1}.</span>
                                  {s}
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                        {m.actions && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {m.actions.map((a) => (
                              <button
                                key={a.label}
                                onClick={() => runAction(a)}
                                className="press rounded-full bg-accent-soft px-3.5 py-2 text-[12.5px] font-bold text-accent"
                              >
                                {a.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                  {typing && (
                    <div className="mr-auto flex items-center gap-1.5 rounded-[16px] rounded-bl-[5px] border border-line bg-surface-2 px-4 py-3">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-[7px] w-[7px] rounded-full bg-[color:var(--text-3)]"
                          style={{
                            animation: `coach-dot 1s ease-in-out ${i * 0.15}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 border-t border-line px-4 pb-3 pt-2.5">
                <div className="no-scrollbar -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1">
                  {CHIPS.map((c) => (
                    <button
                      key={c}
                      onClick={() => send(c)}
                      className="press shrink-0 whitespace-nowrap rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-ink-2"
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Chiedi al coach..."
                    className="h-11 w-full min-w-0 flex-1 rounded-full border border-line bg-surface-2 px-4 text-[14.5px] outline-none placeholder:text-ink-3 focus:border-accent"
                  />
                  <button
                    aria-label="Invia"
                    onClick={() => send()}
                    disabled={!input.trim() || typing}
                    className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink disabled:opacity-40"
                  >
                    <PaperPlaneTilt size={19} weight="fill" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
