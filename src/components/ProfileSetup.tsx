"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import {
  ArrowLeft,
  ArrowRight,
  Cake,
  Check,
  GenderFemale,
  GenderMale,
  GenderNeuter,
  IdentificationCard,
  Ruler,
  Scales,
} from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { ageFrom, bmr, goalCalories, tdee } from "@/lib/health";
import { fmtNum } from "@/lib/dates";
import { Button, Sheet, toast } from "@/components/ui";
import Stepper from "@/components/Stepper";
import { coachSay } from "@/components/CoachChat";

export const useProfileSetup = create<{
  open: boolean;
  show: () => void;
  hide: () => void;
}>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));

const STEPS = ["Sesso", "Età", "Altezza", "Peso"] as const;

const SEXES = [
  { value: "m" as const, label: "Uomo", icon: <GenderMale size={22} weight="bold" /> },
  { value: "f" as const, label: "Donna", icon: <GenderFemale size={22} weight="bold" /> },
  { value: null, label: "Preferisco non dirlo", icon: <GenderNeuter size={22} weight="bold" /> },
];

export default function ProfileSetup() {
  const { open, hide } = useProfileSetup();
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const bodyweight = useStore((s) => s.bodyweight);
  const logBodyweight = useStore((s) => s.logBodyweight);
  const week = useStore((s) => s.week);

  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<"m" | "f" | null | undefined>(undefined);
  const [age, setAge] = useState(30);
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(75);

  useEffect(() => {
    if (!open) return;
    const s = useStore.getState().settings;
    const bw = useStore.getState().bodyweight;
    const year = new Date().getFullYear();
    setStep(0);
    setSex(s.sex);
    setAge(ageFrom(s.birthYear, year) ?? 30);
    setHeight(s.height != null && s.height >= 120 ? s.height : 175);
    setWeight(bw.length ? bw[bw.length - 1].w : 75);
  }, [open]);

  const skip = () => {
    setSettings({ profileAsked: true });
    hide();
  };

  const finish = () => {
    const year = new Date().getFullYear();
    setSettings({
      sex: sex === undefined ? null : sex,
      birthYear: year - age,
      height,
      profileAsked: true,
    });
    const last = bodyweight.length ? bodyweight[bodyweight.length - 1] : null;
    if (!last || Math.abs(last.w - weight) >= 0.05) logBodyweight(weight);
    hide();
    toast("Profilo completato");
    const t = estimate();
    coachSay(
      t
        ? `Profilo pronto: da adesso i consigli sono tarati su di te. Fabbisogno stimato ≈ ${fmtNum(t)} kcal al giorno.`
        : "Profilo pronto: da adesso i consigli sono tarati su di te."
    );
  };

  const estimate = () => {
    const days = week.filter(Boolean).length;
    return goalCalories(
      tdee(bmr(sex === undefined ? null : sex, age, height, weight), days),
      settings.goal
    );
  };

  const bmi = Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10;

  return (
    <Sheet open={open} onClose={skip} title="Il tuo profilo">
      <div className="flex min-h-[55dvh] flex-col pb-2">
        <div className="mb-4 flex items-center gap-3">
          {step > 0 && (
            <button
              aria-label="Indietro"
              onClick={() => setStep(step - 1)}
              className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2"
            >
              <ArrowLeft size={17} weight="bold" />
            </button>
          )}
          <div className="flex flex-1 gap-1.5">
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

        <div
          key={step}
          className="card-in flex flex-1 flex-col"
          style={{ "--i": 0 } as React.CSSProperties}
        >
            {step === 0 && (
              <>
                <h2 className="display mb-1 text-[24px]">Come ti descrivi?</h2>
                <p className="mb-5 text-[13.5px] text-ink-2">
                  Serve solo per calcolare il tuo fabbisogno calorico con la
                  formula giusta.
                </p>
                <div className="flex flex-col gap-2.5">
                  {SEXES.map((o) => {
                    const on = sex === o.value;
                    return (
                      <button
                        key={String(o.value)}
                        onClick={() => {
                          setSex(o.value);
                          setTimeout(() => setStep(1), 180);
                        }}
                        className={`press flex w-full items-center gap-3.5 rounded-[16px] border p-4 text-left transition-colors ${
                          on
                            ? "border-accent bg-accent-soft"
                            : "border-line bg-surface hover:border-line-strong"
                        }`}
                      >
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${
                            on ? "bg-accent text-accent-ink" : "bg-surface-3 text-accent"
                          }`}
                        >
                          {o.icon}
                        </span>
                        <span className="flex-1 text-[15.5px] font-bold">{o.label}</span>
                        {on && <Check size={18} weight="bold" color="var(--accent)" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="display mb-1 text-[24px]">Quanti anni hai?</h2>
                <p className="mb-5 text-[13.5px] text-ink-2">
                  L&apos;età pesa su metabolismo e recuperi consigliati.
                </p>
                <div className="mx-auto w-full max-w-[240px]">
                  <Stepper value={age} onChange={setAge} min={13} max={100} suffix="anni" wide />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="display mb-1 text-[24px]">Quanto sei alto?</h2>
                <p className="mb-5 text-[13.5px] text-ink-2">
                  Con altezza e peso calcolo BMI e fabbisogno calorico.
                </p>
                <div className="mx-auto w-full max-w-[240px]">
                  <Stepper value={height} onChange={setHeight} min={120} max={230} suffix="cm" wide />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="display mb-1 text-[24px]">Quanto pesi oggi?</h2>
                <p className="mb-5 text-[13.5px] text-ink-2">
                  Diventa la prima pesata della tua curva: potrai aggiornarla
                  quando vuoi.
                </p>
                <div className="mx-auto w-full max-w-[260px]">
                  <Stepper
                    value={weight}
                    onChange={setWeight}
                    step={0.5}
                    min={30}
                    max={300}
                    decimal
                    suffix="kg"
                    wide
                  />
                </div>
                <div className="mt-6 flex flex-col gap-2 rounded-[16px] border border-line bg-surface-2 p-4">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2 font-semibold text-ink-2">
                      <IdentificationCard size={16} weight="bold" color="var(--text-3)" />
                      BMI stimato
                    </span>
                    <span className="tnum font-bold">{fmtNum(bmi)}</span>
                  </div>
                  {estimate() != null && (
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="flex items-center gap-2 font-semibold text-ink-2">
                        <Scales size={16} weight="bold" color="var(--text-3)" />
                        Fabbisogno stimato
                      </span>
                      <span className="tnum font-bold">
                        ≈ {fmtNum(estimate()!)} kcal/giorno
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

        <div className="mt-5 flex flex-col gap-2">
          {step === 3 ? (
            <Button variant="primary" onClick={finish}>
              <Check size={18} weight="bold" />
              Salva il profilo
            </Button>
          ) : (
            step > 0 && (
              <Button variant="primary" onClick={() => setStep(step + 1)}>
                Avanti
                <ArrowRight size={17} weight="bold" />
              </Button>
            )
          )}
          <Button variant="ghost" onClick={skip}>
            Più tardi
          </Button>
          <p className="flex items-center justify-center gap-1.5 px-1 text-center text-[11.5px] text-ink-3">
            <Ruler size={13} weight="bold" />
            <Cake size={13} weight="bold" />
            Tutto resta solo su questo dispositivo, nel tuo profilo.
          </p>
        </div>
      </div>
    </Sheet>
  );
}
