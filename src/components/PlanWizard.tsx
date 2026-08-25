"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Barbell,
  Check,
  CompassRose,
  Fire,
  HandFist,
  HeartStraight,
  HouseLine,
  Leaf,
  PersonSimpleTaiChi,
  SneakerMove,
  Sparkle,
  Buildings,
} from "@phosphor-icons/react";
import type { ExerciseIndex } from "@/lib/types";
import type { Equip, Goal, Level, WizardChoices } from "@/lib/plangen";
import { generatePlan } from "@/lib/plangen";
import { loadIndex, resolveEx } from "@/lib/data";
import { useStore } from "@/lib/store";
import { toast, Button } from "@/components/ui";
import { ROUTINE_ICONS } from "@/components/routineIcons";

interface StepOption<T extends string | number> {
  value: T;
  label: string;
  sub: string;
  icon: React.ReactNode;
}

const GOALS: StepOption<Goal>[] = [
  { value: "massa", label: "Massa muscolare", sub: "Costruire muscolo, centimetro dopo centimetro", icon: <Barbell size={22} weight="bold" /> },
  { value: "forza", label: "Forza", sub: "Alzare di più sui fondamentali", icon: <HandFist size={22} weight="bold" /> },
  { value: "dimagrimento", label: "Dimagrimento", sub: "Bruciare, tonificare e tenere il ritmo alto", icon: <Fire size={22} weight="bold" /> },
  { value: "salute", label: "Forma e salute", sub: "Muoversi bene e sentirsi meglio", icon: <HeartStraight size={22} weight="bold" /> },
];

const LEVELS: StepOption<Level>[] = [
  { value: "principiante", label: "Sto iniziando", sub: "Poca o nessuna esperienza coi pesi", icon: <Leaf size={22} weight="bold" /> },
  { value: "intermedio", label: "Mi alleno già", sub: "Conosco gli esercizi e i miei carichi", icon: <SneakerMove size={22} weight="bold" /> },
];

const DAYS: StepOption<2 | 3 | 4 | 5>[] = [
  { value: 2, label: "2 giorni", sub: "Il minimo che funziona davvero", icon: <span className="tnum text-[18px] font-bold">2</span> },
  { value: 3, label: "3 giorni", sub: "Il punto d'equilibrio più amato", icon: <span className="tnum text-[18px] font-bold">3</span> },
  { value: 4, label: "4 giorni", sub: "Volume serio, recupero ancora comodo", icon: <span className="tnum text-[18px] font-bold">4</span> },
  { value: 5, label: "5 giorni", sub: "Per chi in palestra ci vive bene", icon: <span className="tnum text-[18px] font-bold">5</span> },
];

const EQUIPS: StepOption<Equip>[] = [
  { value: "palestra", label: "Palestra attrezzata", sub: "Bilancieri, macchine, cavi: tutto", icon: <Buildings size={22} weight="bold" /> },
  { value: "manubri", label: "Manubri a casa", sub: "Coppia di manubri e una panca", icon: <HouseLine size={22} weight="bold" /> },
  { value: "corpo", label: "Corpo libero", sub: "Zero attrezzi, al massimo una sbarra", icon: <PersonSimpleTaiChi size={22} weight="bold" /> },
];

const STEPS = ["Obiettivo", "Esperienza", "Giorni", "Attrezzatura"] as const;

export default function PlanWizard({
  onClose,
  onApplied,
}: {
  onClose?: () => void;
  onApplied?: () => void;
}) {
  const reduce = useReducedMotion();
  const saveRoutine = useStore((s) => s.saveRoutine);
  const assignDay = useStore((s) => s.assignDay);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const setSettings = useStore((s) => s.setSettings);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [days, setDays] = useState<2 | 3 | 4 | 5 | null>(null);
  const [equip, setEquip] = useState<Equip | null>(null);
  const [index, setIndex] = useState<ExerciseIndex[] | null>(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch(() => {});
  }, []);

  const choices: WizardChoices | null =
    goal && level && days && equip ? { goal, level, days, equip } : null;

  const plan = useMemo(() => (choices ? generatePlan(choices) : null), [choices]);

  const apply = () => {
    if (!plan) return;
    plan.routines.forEach(saveRoutine);
    plan.week.forEach((rid, i) => assignDay(i, rid));
    if (choices) setSettings({ goal: choices.goal, level: choices.level });
    setOnboarded();
    toast("Piano pronto: si comincia");
    onApplied?.();
  };

  const options =
    step === 0 ? GOALS : step === 1 ? LEVELS : step === 2 ? DAYS : EQUIPS;
  const selected =
    step === 0 ? goal : step === 1 ? level : step === 2 ? days : equip;

  const choose = (v: Goal | Level | 2 | 3 | 4 | 5 | Equip) => {
    if (step === 0) setGoal(v as Goal);
    if (step === 1) setLevel(v as Level);
    if (step === 2) setDays(v as 2 | 3 | 4 | 5);
    if (step === 3) setEquip(v as Equip);
    setTimeout(() => setStep((s) => Math.min(4, s + 1)), 180);
  };

  return (
    <div className="flex min-h-[78dvh] flex-col py-4">
      <div className="mb-5 flex items-center gap-3">
        {(step > 0 || onClose) && (
          <button
            aria-label="Indietro"
            onClick={() => (step > 0 ? setStep(step - 1) : onClose?.())}
            className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2"
          >
            <ArrowLeft size={19} weight="bold" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CompassRose size={17} weight="fill" color="var(--accent)" />
            <span className="text-[12px] font-bold uppercase tracking-wide text-accent">
              Percorso guidato
            </span>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`h-[4px] flex-1 rounded-full transition-colors duration-300 ${
                  i <= step ? "bg-accent" : "bg-surface-3"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step < 4 ? (
          <motion.div
            key={step}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
          >
            <h1 className="display mb-1 text-[26px]">
              {step === 0 && "Cosa vuoi ottenere?"}
              {step === 1 && "Quanta esperienza hai?"}
              {step === 2 && "Quanti giorni a settimana?"}
              {step === 3 && "Con cosa ti alleni?"}
            </h1>
            <p className="mb-5 text-[13.5px] text-ink-2">
              {step === 0 && "Il piano cambia serie, ripetizioni e recuperi in base all'obiettivo."}
              {step === 1 && "Regola la difficoltà delle varianti proposte."}
              {step === 2 && "Sceglie lo split giusto: meglio pochi giorni fatti bene."}
              {step === 3 && "Ogni esercizio viene scelto tra quelli che puoi davvero fare."}
            </p>
            <div className="flex flex-col gap-2.5">
              {options.map((o) => {
                const on = selected === o.value;
                return (
                  <button
                    key={String(o.value)}
                    onClick={() => choose(o.value)}
                    className={`press flex w-full items-center gap-3.5 rounded-[16px] border p-4 text-left transition-colors ${
                      on ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${
                        on ? "bg-accent text-accent-ink" : "bg-surface-3 text-accent"
                      }`}
                    >
                      {o.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15.5px] font-bold">{o.label}</span>
                      <span className="block text-[13px] leading-snug text-ink-2">{o.sub}</span>
                    </span>
                    {on && <Check size={18} weight="bold" color="var(--accent)" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="summary"
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col gap-3"
          >
            <h1 className="display text-[26px]">Il tuo piano</h1>
            {plan && (
              <>
                <div className="flex items-start gap-2.5 rounded-[14px] border border-line bg-surface-2 px-3.5 py-3 text-[13px] leading-relaxed text-ink-2">
                  <Sparkle size={16} weight="fill" color="var(--amber)" className="mt-0.5 shrink-0" />
                  {plan.why}
                </div>
                {plan.routines.map((r) => {
                  const Icon = ROUTINE_ICONS[r.icon] ?? Barbell;
                  const dayNames = plan.week
                    .map((rid, i) =>
                      rid === r.id
                        ? ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"][i]
                        : null
                    )
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <div key={r.id} className="rounded-[16px] border border-line bg-surface p-3.5">
                      <div className="mb-2 flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent-soft">
                          <Icon size={18} weight="bold" color="var(--accent)" />
                        </span>
                        <span className="flex-1 text-[15px] font-bold">{r.name}</span>
                        <span className="text-[12px] font-semibold text-accent">{dayNames}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {r.exercises.map((e) => {
                          const ex = index ? resolveEx(e.exId, index, []) : null;
                          return (
                            <div key={e.k} className="flex items-baseline justify-between gap-2 text-[12.5px]">
                              <span className="truncate capitalize text-ink-2">{ex?.n ?? "..."}</span>
                              <span className="tnum shrink-0 text-ink-3">
                                {e.mode === "cardio"
                                  ? `${e.min} min`
                                  : e.mode === "time"
                                    ? `${e.sets} × ${e.sec}s`
                                    : `${e.sets} × ${e.reps}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <Button variant="primary" onClick={apply}>
                  <Check size={18} weight="bold" />
                  Applica il piano
                </Button>
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Cambia le risposte
                </Button>
                <p className="px-1 text-[11.5px] leading-relaxed text-ink-3">
                  La settimana viene riassegnata alle nuove schede. Potrai
                  modificare tutto dalla sezione Piano: esercizi, serie e giorni.
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {step < 4 && (
        <div className="mt-auto flex justify-end pt-4">
          <button
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            disabled={selected == null}
            className="press flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-bold text-accent disabled:opacity-0"
          >
            Avanti
            <ArrowRight size={16} weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
}
