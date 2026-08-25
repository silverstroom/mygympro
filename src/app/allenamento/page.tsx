"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Barbell,
  Timer as TimerIcon,
  CaretLeft,
  Check,
  Info,
  Lightbulb,
  Minus,
  Play,
  Plus,
  Shuffle,
  TrendDown,
  TrendUp,
  Trophy,
  X,
} from "@phosphor-icons/react";
import type { ExerciseIndex, SessionEntry, SetLog } from "@/lib/types";
import { useStore } from "@/lib/store";
import { loadIndex, loadSteps, resolveEx, detectMode } from "@/lib/data";
import { tEquip, tTarget } from "@/lib/it";
import { bestSetFor, muscleUsage } from "@/lib/calc";
import { lastSetsFor, buildEntry, effectiveRoutineId } from "@/lib/session";
import { fmtNum, fmtShort, todayISO, DAY_FULL, dayIdxOf } from "@/lib/dates";
import { beep, vibrate } from "@/lib/sound";
import { acquireWakeLock, releaseWakeLock } from "@/lib/wakelock";
import { useStartSession } from "@/lib/useStartSession";
import { generateQuickWorkout } from "@/lib/quickwo";
import type { Equip } from "@/lib/plangen";
import { buildInsights } from "@/lib/insights";
import { hypeForPR, hypeForSet, hypeForVolume, shouldHypeSet } from "@/lib/hype";
import { buildSessionEntries } from "@/lib/session";
import { isGuest, GUEST_WO_LIMIT } from "@/lib/guest";
import { useSignup } from "@/components/SignupPrompt";
import { Button, Card, Seg, Sheet, Tag, toast } from "@/components/ui";
import Stepper from "@/components/Stepper";
import { ExMedia } from "@/components/ExMedia";
import ExercisePicker from "@/components/ExercisePicker";
import Confetti from "@/components/Confetti";
import CountUp from "@/components/CountUp";
import { ROUTINE_ICONS } from "@/components/routineIcons";

function tempoLabel(tempo: string): string {
  const parts = tempo.split("-").map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return `${parts[0]}s in discesa, ${parts[1]}s fermo, ${parts[2]}s in salita`;
  }
  return "controlla ogni ripetizione";
}

function Elapsed({ start }: { start: number }) {
  const [txt, setTxt] = useState("0:00");
  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setTxt(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [start]);
  return <span className="tnum">{txt}</span>;
}

function SetField({
  value,
  onChange,
  step,
  decimal = false,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  decimal?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex flex-1 items-center rounded-[10px] border border-line bg-surface-2 transition-opacity ${
        disabled ? "opacity-45" : ""
      }`}
    >
      <button
        aria-label="Diminuisci"
        disabled={disabled}
        onClick={() => onChange(Math.max(0, Math.round((value - step) * 100) / 100))}
        className="press flex h-10 w-8 shrink-0 items-center justify-center text-ink-3"
      >
        <Minus size={13} weight="bold" />
      </button>
      <input
        type="number"
        inputMode={decimal ? "decimal" : "numeric"}
        value={Number.isFinite(value) ? value : ""}
        disabled={disabled}
        onChange={(e) => {
          const v = parseFloat(e.target.value.replace(",", "."));
          onChange(Number.isFinite(v) ? v : 0);
        }}
        onFocus={(e) => e.target.select()}
        className="tnum w-full min-w-0 bg-transparent text-center text-[15.5px] font-bold outline-none"
      />
      <button
        aria-label="Aumenta"
        disabled={disabled}
        onClick={() => onChange(Math.round((value + step) * 100) / 100)}
        className="press flex h-10 w-8 shrink-0 items-center justify-center text-ink-3"
      >
        <Plus size={13} weight="bold" />
      </button>
    </div>
  );
}

function QuickCard() {
  const router = useRouter();
  const workouts = useStore((s) => s.workouts);
  const exWeights = useStore((s) => s.exWeights);
  const custom = useStore((s) => s.custom);
  const startSession = useStore((s) => s.startSession);
  const [minutes, setMinutes] = useState<15 | 30 | 45>(30);
  const [equip, setEquip] = useState<Equip>("palestra");

  const go = async () => {
    if (isGuest() && workouts.length >= GUEST_WO_LIMIT) {
      useSignup.getState().show("workouts");
      return;
    }
    try {
      const index = await loadIndex();
      const q = generateQuickWorkout(minutes, equip);
      const entries = q.exercises.map((re) =>
        buildEntry(re, workouts, exWeights, index, custom)
      );
      startSession(null, q.name, entries);
      toast(q.note, "info");
      router.push("/allenamento");
    } catch {
      toast("Impossibile preparare la sessione", "warn");
    }
  };

  return (
    <Card className="card-in" style={{ "--i": 3 } as React.CSSProperties}>
      <div className="mb-1 flex items-center gap-2">
        <TimerIcon size={17} weight="fill" color="var(--accent)" />
        <h2 className="display text-[15px] text-ink-2">Sessione lampo</h2>
      </div>
      <p className="mb-3 text-[13px] leading-snug text-ink-2">
        Poco tempo? Dimmi quanto ne hai e ti preparo un allenamento che ci sta
        davvero, cronometro alla mano.
      </p>
      <div className="mb-2 flex gap-2">
        {([15, 30, 45] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMinutes(m)}
            className={`press flex-1 rounded-full border py-2 text-[13.5px] font-bold ${
              minutes === m
                ? "border-accent bg-accent-soft text-accent"
                : "border-line bg-surface-2 text-ink-2"
            }`}
          >
            {m} min
          </button>
        ))}
      </div>
      <div className="mb-3">
        <Seg
          options={[
            { value: "palestra", label: "Palestra" },
            { value: "manubri", label: "Manubri" },
            { value: "corpo", label: "Corpo libero" },
          ]}
          value={equip}
          onChange={setEquip}
        />
      </div>
      <Button variant="primary" className="w-full" onClick={go}>
        <Play size={17} weight="fill" />
        Genera e parti
      </Button>
    </Card>
  );
}

function StartChooser() {
  const router = useRouter();
  const routines = useStore((s) => s.routines);
  const week = useStore((s) => s.week);
  const overrides = useStore((s) => s.overrides);
  const start = useStartSession();
  const today = todayISO();
  const todayRid = effectiveRoutineId({ week, overrides }, today);
  const todayRoutine = routines.find((r) => r.id === todayRid) ?? null;
  const others = routines.filter((r) => r.id !== todayRid);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="card-in" style={{ "--i": 0 } as React.CSSProperties}>
        <h1 className="display text-[30px]">Allenati</h1>
        <div className="mt-1 text-[13.5px] text-ink-2">
          {DAY_FULL[dayIdxOf(today)]} ·{" "}
          {todayRoutine ? `oggi tocca ${todayRoutine.name}` : "giorno di riposo, ma nessuno ti ferma"}
        </div>
      </div>

      {todayRoutine && (
        <Card className="card-in border-accent" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="mb-3 flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] bg-accent">
              {(() => {
                const Icon = ROUTINE_ICONS[todayRoutine.icon] ?? Barbell;
                return <Icon size={24} weight="bold" color="var(--accent-ink)" />;
              })()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wide text-accent">
                Programma di oggi
              </div>
              <div className="truncate text-[18px] font-bold">{todayRoutine.name}</div>
              <div className="text-[12.5px] text-ink-3">
                {todayRoutine.exercises.length} esercizi
              </div>
            </div>
          </div>
          <Button variant="primary" className="w-full" onClick={() => start(todayRoutine.id)}>
            <Play size={18} weight="fill" />
            Inizia {todayRoutine.name}
          </Button>
        </Card>
      )}

      {others.length > 0 && (
        <div className="card-in flex flex-col gap-2" style={{ "--i": 2 } as React.CSSProperties}>
          <h2 className="display px-1 text-[15px] text-ink-2">Altre schede</h2>
          {others.map((r) => {
            const Icon = ROUTINE_ICONS[r.icon] ?? Barbell;
            return (
              <button
                key={r.id}
                onClick={() => start(r.id)}
                className="press flex w-full items-center gap-3 rounded-[16px] border border-line bg-surface p-3 text-left transition-colors hover:border-line-strong"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-accent-soft">
                  <Icon size={21} weight="bold" color="var(--accent)" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">{r.name}</span>
                  <span className="block text-[12.5px] text-ink-3">
                    {r.exercises.length} esercizi
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-accent-soft px-3.5 py-1.5 text-[12.5px] font-bold text-accent">
                  Inizia
                </span>
              </button>
            );
          })}
        </div>
      )}

      <QuickCard />

      <div className="card-in flex flex-col gap-2" style={{ "--i": 4 } as React.CSSProperties}>
        <Button onClick={() => start(null)}>
          <Shuffle size={18} weight="bold" />
          Freestyle: scegli man mano
        </Button>
        {!routines.length && (
          <Button variant="ghost" onClick={() => router.push("/piano")}>
            Prima costruisci una scheda
          </Button>
        )}
      </div>
    </div>
  );
}

function WorkTimer({
  sec,
  name,
  onDone,
  onCancel,
}: {
  sec: number;
  name: string;
  onDone: (elapsed: number) => void;
  onCancel: () => void;
}) {
  const sound = useStore((s) => s.settings.sound);
  const [left, setLeft] = useState(sec);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => {
      const el = (Date.now() - startRef.current) / 1000;
      const remaining = Math.max(0, sec - el);
      setLeft(remaining);
      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true;
        beep(sound, 1180, 0.22);
        vibrate([140, 90, 180]);
        clearInterval(iv);
        onDone(sec);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [sec, sound, onDone]);

  const frac = sec > 0 ? left / sec : 0;
  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-[rgba(10,10,12,0.94)] px-6 backdrop-blur-sm">
      <div className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
        Tieni la posizione
      </div>
      <div className="mb-6 max-w-[300px] text-center text-[18px] font-bold capitalize">{name}</div>
      <div className="relative mb-8 flex h-[170px] w-[170px] items-center justify-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${frac * C} ${C}`}
            style={{ transition: "stroke-dasharray 120ms linear" }}
          />
        </svg>
        <span className="display-num text-[46px]">{Math.ceil(left)}</span>
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onCancel}>
          Annulla
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            if (!doneRef.current) {
              doneRef.current = true;
              onDone(Math.min(sec, Math.round((Date.now() - startRef.current) / 1000)));
            }
          }}
        >
          <Check size={18} weight="bold" />
          Fatto
        </Button>
      </div>
    </div>
  );
}

function CompleteView() {
  const summary = useStore((s) => s.lastSummary);
  const clearSummary = useStore((s) => s.clearSummary);
  const router = useRouter();
  const [fire, setFire] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFire(true), 250);
    return () => clearTimeout(t);
  }, []);

  if (!summary) return null;

  return (
    <div className="flex min-h-[75dvh] flex-col justify-center py-6">
      <Confetti fire={fire} />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.65, bounce: 0.3 }}
        className="mb-6 flex flex-col items-center text-center"
      >
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent shadow-[0_12px_40px_var(--accent-glow)]">
          <Check size={34} weight="bold" color="var(--accent-ink)" />
        </span>
        <h1 className="display text-[32px]">Fatto!</h1>
        <div className="mt-1 text-[14.5px] text-ink-2">{summary.name} completato</div>
      </motion.div>

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        {[
          { label: "Minuti", value: summary.durationMin },
          { label: "Serie", value: summary.sets },
          { label: "Volume kg", value: Math.round(summary.volume) },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="rounded-[16px] border border-line bg-surface p-3 text-center"
          >
            <CountUp value={s.value} className="display-num block text-[26px]" />
            <span className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
              {s.label}
            </span>
          </motion.div>
        ))}
      </div>

      {(() => {
        const line = hypeForVolume(summary.volume, useStore.getState().settings.goal);
        return line ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="mb-4 rounded-[16px] border border-line bg-surface p-4 text-center text-[14px] font-semibold leading-relaxed"
          >
            {line}
          </motion.div>
        ) : null;
      })()}

      {summary.prs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="mb-4 rounded-[16px] border border-[rgba(251,191,36,0.35)] bg-amber-soft p-4"
        >
          <div className="mb-1.5 flex items-center gap-2 text-[14px] font-bold text-amber">
            <Trophy size={18} weight="fill" />
            {summary.prs.length === 1 ? "Nuovo record personale" : `${summary.prs.length} nuovi record`}
          </div>
          <div className="mb-1.5 text-[12.5px] font-medium text-amber">{hypeForPR()}</div>
          <PRList prs={summary.prs} />
        </motion.div>
      )}

      {isGuest() && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="mb-4 rounded-[16px] border border-[color:var(--accent)] bg-accent-soft p-4"
        >
          <div className="mb-1 text-[14px] font-bold">
            Risultati salvati nei tuoi 3 da ospite
          </div>
          <p className="mb-3 text-[12.5px] leading-snug text-ink-2">
            Con un account gratuito ogni allenamento resta nello storico per
            sempre, con grafici, record e progressione dei carichi.
          </p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => useSignup.getState().show("post-workout")}
          >
            Crea il tuo account
          </Button>
        </motion.div>
      )}

      {summary.muscles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="mb-6 flex flex-wrap gap-1.5"
        >
          {summary.muscles.map((m) => (
            <Tag key={m} tone="accent">
              {tTarget(m)}
            </Tag>
          ))}
        </motion.div>
      )}

      <Button
        variant="primary"
        onClick={() => {
          clearSummary();
          router.push("/");
        }}
      >
        Torna alla home
      </Button>
    </div>
  );
}

function PRList({ prs }: { prs: { exId: string; w: number; r: number; e1rm: number }[] }) {
  const custom = useStore((s) => s.custom);
  const [index, setIndex] = useState<ExerciseIndex[] | null>(null);
  useEffect(() => {
    loadIndex().then(setIndex).catch(() => {});
  }, []);
  return (
    <div className="flex flex-col gap-1">
      {prs.map((p) => {
        const ex = index ? resolveEx(p.exId, index, custom) : null;
        return (
          <div key={p.exId} className="flex items-baseline justify-between gap-2 text-[13.5px]">
            <span className="truncate font-semibold capitalize">{ex?.n ?? "..."}</span>
            <span className="tnum shrink-0 text-amber">
              {fmtNum(p.w)} kg × {p.r} · 1RM {fmtNum(Math.round(p.e1rm * 10) / 10)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function InfoSheet({ ex, open, onClose }: { ex: ExerciseIndex | null; open: boolean; onClose: () => void }) {
  const [steps, setSteps] = useState<string[] | null>(null);
  useEffect(() => {
    setSteps(null);
    if (ex && open && !ex.i.startsWith("c_")) {
      loadSteps(ex.i)
        .then((d) => setSteps(d.it.length ? d.it : d.en))
        .catch(() => setSteps([]));
    }
  }, [ex, open]);
  return (
    <Sheet open={open} onClose={onClose} title={ex?.n ?? ""} tall>
      {ex && (
        <div className="flex flex-col gap-4 pb-4">
          <ExMedia ex={ex} animate />
          <div className="flex flex-wrap gap-1.5">
            <Tag tone="accent">{tTarget(ex.t)}</Tag>
            <Tag>{tEquip(ex.e)}</Tag>
            {ex.s.slice(0, 3).map((m) => (
              <Tag key={m}>{tTarget(m)}</Tag>
            ))}
          </div>
          {steps === null && !ex.i.startsWith("c_") && (
            <div className="flex flex-col gap-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
              <div className="skeleton h-4 w-4/6" />
            </div>
          )}
          {steps && steps.length > 0 && (
            <ol className="flex flex-col gap-2.5">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-ink-2">
                  <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[12px] font-bold text-accent">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          )}
          <div className="text-[11px] text-ink-3">
            Media: © Gym visual · gymvisual.com
          </div>
        </div>
      )}
    </Sheet>
  );
}

function ActiveWorkout() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const active = useStore((s) => s.active)!;
  const workouts = useStore((s) => s.workouts);
  const custom = useStore((s) => s.custom);
  const exWeights = useStore((s) => s.exWeights);
  const settings = useStore((s) => s.settings);
  const bodyweight = useStore((s) => s.bodyweight);
  const trackRir = !!settings.trackRir;
  const toggleSet = useStore((s) => s.toggleSet);
  const setField = useStore((s) => s.setField);
  const addSet = useStore((s) => s.addSet);
  const removeSet = useStore((s) => s.removeSet);
  const addEntry = useStore((s) => s.addEntry);
  const setCur = useStore((s) => s.setCur);
  const startRest = useStore((s) => s.startRest);
  const stopRest = useStore((s) => s.stopRest);
  const discardSession = useStore((s) => s.discardSession);
  const finishSession = useStore((s) => s.finishSession);
  const logBodyweight = useStore((s) => s.logBodyweight);

  const [index, setIndex] = useState<ExerciseIndex[] | null>(null);
  const [dir, setDir] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [infoEx, setInfoEx] = useState<ExerciseIndex | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [timed, setTimed] = useState<{ ei: number; si: number; sec: number } | null>(null);
  const [weighOpen, setWeighOpen] = useState(false);
  const [weighVal, setWeighVal] = useState(0);
  const weighAsked = useRef(false);

  useEffect(() => {
    loadIndex().then(setIndex).catch(() => {});
  }, []);

  useEffect(() => {
    if (settings.wakeLock) acquireWakeLock();
    return () => releaseWakeLock();
  }, [settings.wakeLock]);

  useEffect(() => {
    if (weighAsked.current || !settings.weighAsk) return;
    const today = todayISO();
    const already = bodyweight.some((b) => b.d === today);
    const anyDone = active.entries.some((e) => e.sets.some((s) => s.done));
    if (!already && !anyDone && Date.now() - active.start < 90000) {
      weighAsked.current = true;
      setWeighVal(bodyweight.length ? bodyweight[bodyweight.length - 1].w : 75);
      setWeighOpen(true);
    } else {
      weighAsked.current = true;
    }
  }, [settings.weighAsk, bodyweight, active]);

  const cur = Math.min(active.cur, Math.max(0, active.entries.length - 1));
  const entry: SessionEntry | undefined = active.entries[cur];
  const ex = entry && index ? resolveEx(entry.exId, index, custom) : null;

  const total = active.entries.reduce((n, e) => n + e.sets.length, 0);
  const done = active.entries.reduce(
    (n, e) => n + e.sets.filter((x) => x.done).length,
    0
  );
  const allDone = total > 0 && done === total;
  const exDone = active.entries.filter(
    (e) => e.sets.length && e.sets.every((x) => x.done)
  ).length;

  const last = entry ? lastSetsFor(workouts, entry.exId) : null;
  const best = entry ? bestSetFor(workouts, entry.exId) : null;
  const insights = useMemo(
    () => (index ? buildInsights(workouts, index) : []),
    [workouts, index]
  );
  const exInsight = entry ? insights.find((i) => i.exId === entry.exId) : null;

  const sessionMuscles = useMemo(() => {
    if (!index) return [];
    const fake = {
      id: "x",
      d: todayISO(),
      name: "",
      routineId: null,
      start: 0,
      end: 0,
      entries: active.entries.map((e) => ({ exId: e.exId, mode: e.mode, sets: e.sets })),
    };
    const usage = muscleUsage([fake], index, 0);
    return Object.entries(usage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([m]) => m);
  }, [index, active.entries]);

  const onToggle = (si: number) => {
    if (!entry) return;
    const res = toggleSet(cur, si);
    const nowActive = useStore.getState().active;
    if (!nowActive) return;
    const nowDone = nowActive.entries[cur].sets[si].done;
    if (nowDone) {
      beep(settings.sound, 1040, 0.1);
      vibrate(28);
      const doneSet = nowActive.entries[cur].sets[si];
      if (
        entry.mode === "reps" &&
        doneSet.w != null &&
        shouldHypeSet(doneSet.w, doneSet.r ?? 0)
      ) {
        const line = hypeForSet(doneSet.w);
        if (line) toast(line);
      }
      const totalNow = nowActive.entries.reduce((n, e) => n + e.sets.length, 0);
      const doneNow = nowActive.entries.reduce(
        (n, e) => n + e.sets.filter((x) => x.done).length,
        0
      );
      if (doneNow >= totalNow) {
        stopRest();
        setConfirmFinish(true);
      } else if (res.finishedEntry) {
        startRest(entry.restSec);
        const nextIdx = nowActive.entries.findIndex(
          (e, i) => i !== cur && e.sets.some((x) => !x.done)
        );
        if (nextIdx >= 0) {
          setTimeout(() => {
            setDir(nextIdx > cur ? 1 : -1);
            setCur(nextIdx);
          }, 650);
        }
      } else if (res.startRest && entry.mode !== "cardio") {
        startRest(entry.restSec);
      }
    }
  };

  const finish = () => {
    stopRest();
    finishSession(sessionMuscles);
  };

  const go = (next: number) => {
    setDir(next > cur ? 1 : -1);
    setCur(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          aria-label="Abbandona workout"
          onClick={() => setConfirmDiscard(true)}
          className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-2"
        >
          <X size={19} weight="bold" />
        </button>
        <div className="text-center">
          <div className="text-[15.5px] font-bold leading-tight">{active.name}</div>
          <div className="text-[12px] text-ink-3">
            <Elapsed start={active.start} /> · {done}/{total} serie
          </div>
        </div>
        <button
          aria-label="Termina workout"
          onClick={() => setConfirmFinish(true)}
          className="press flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-ink"
        >
          <Check size={19} weight="bold" />
        </button>
      </div>

      <div className="h-[5px] overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent"
          style={{
            width: `${total ? (done / total) * 100 : 0}%`,
            transition: "width 450ms var(--ease-out)",
          }}
        />
      </div>

      {active.entries.length === 0 && (
        <Card className="mt-4 text-center">
          <div className="mb-2 flex justify-center">
            <Shuffle size={30} color="var(--text-3)" />
          </div>
          <div className="mb-1 text-[16px] font-bold">Workout libero</div>
          <p className="mx-auto mb-4 max-w-[260px] text-[13.5px] text-ink-2">
            Aggiungi il primo esercizio e registra le serie man mano.
          </p>
          <Button variant="primary" className="w-full" onClick={() => setPickerOpen(true)}>
            <Plus size={18} weight="bold" />
            Aggiungi esercizio
          </Button>
        </Card>
      )}

      {entry && (
        <>
          <div className="flex items-center justify-between px-1">
            <span className="text-[12.5px] font-semibold text-ink-3">
              Esercizio {cur + 1} di {active.entries.length}
            </span>
            <div className="flex gap-1">
              {active.entries.map((e, i) => (
                <button
                  key={i}
                  aria-label={`Vai all'esercizio ${i + 1}`}
                  onClick={() => go(i)}
                  className={`h-[7px] rounded-full transition-all duration-300 ${
                    i === cur
                      ? "w-5 bg-accent"
                      : e.sets.every((x) => x.done) && e.sets.length
                        ? "w-[7px] bg-accent-dim"
                        : "w-[7px] bg-surface-3"
                  }`}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="popLayout" custom={dir} initial={false}>
            <motion.div
              key={cur}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 44 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -44 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col gap-3"
            >
              {ex && <ExMedia ex={ex} animate />}

              <div className="flex items-start justify-between gap-2">
                <h2 className="text-[20px] font-bold capitalize leading-tight">
                  {ex?.n ?? "..."}
                </h2>
                {ex && (
                  <button
                    aria-label="Come si esegue"
                    onClick={() => setInfoEx(ex)}
                    className="press mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2"
                  >
                    <Info size={18} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ex && <Tag tone="accent">{tTarget(ex.t)}</Tag>}
                {ex && <Tag>{tEquip(ex.e)}</Tag>}
                {best && (
                  <Tag tone="amber">
                    <Trophy size={12} weight="fill" />
                    Best {fmtNum(best.w)} × {best.r}
                  </Tag>
                )}
              </div>

              {last && (
                <div className="text-[12.5px] text-ink-3">
                  L'ultima volta ({fmtShort(last.d)}):{" "}
                  <span className="tnum">
                    {last.sets
                      .map((s) =>
                        s.sec != null
                          ? `${s.sec}s`
                          : s.min != null
                            ? `${s.min}min`
                            : `${s.w != null && s.w > 0 ? fmtNum(s.w) + "×" : ""}${s.r ?? 0}`
                      )
                      .join(" · ")}
                  </span>
                </div>
              )}

              {entry.tempo && (
                <div className="flex items-start gap-2.5 rounded-[13px] border border-line bg-surface-2 px-3.5 py-2.5 text-[13px] font-medium leading-snug text-ink-2">
                  <TimerIcon size={17} weight="bold" className="mt-0.5 shrink-0" color="var(--text-3)" />
                  Esecuzione {entry.tempo}: {tempoLabel(entry.tempo)}
                </div>
              )}

              {exInsight && (
                <div className="flex items-start gap-2.5 rounded-[13px] border border-[rgba(251,191,36,0.3)] bg-amber-soft px-3.5 py-2.5 text-[13px] font-medium leading-snug text-amber">
                  <Lightbulb size={17} weight="fill" className="mt-0.5 shrink-0" />
                  {exInsight.body}
                </div>
              )}

              {entry.suggestion && entry.suggestion.kind !== "start" && (
                <div
                  className={`flex items-start gap-2.5 rounded-[13px] border px-3.5 py-2.5 text-[13px] font-medium leading-snug ${
                    entry.suggestion.kind === "up" || entry.suggestion.kind === "reps"
                      ? "border-[rgba(56,189,248,0.3)] bg-accent-soft text-accent"
                      : entry.suggestion.kind === "deload"
                        ? "border-[rgba(251,191,36,0.3)] bg-amber-soft text-amber"
                        : "border-line bg-surface-2 text-ink-2"
                  }`}
                >
                  {entry.suggestion.kind === "up" || entry.suggestion.kind === "reps" ? (
                    <TrendUp size={17} weight="bold" className="mt-0.5 shrink-0" />
                  ) : entry.suggestion.kind === "deload" ? (
                    <TrendDown size={17} weight="bold" className="mt-0.5 shrink-0" />
                  ) : (
                    <Lightbulb size={17} weight="fill" className="mt-0.5 shrink-0" />
                  )}
                  {entry.suggestion.why}
                </div>
              )}

              <Card className="p-3">
                {(() => {
                  const rirOn = trackRir && entry.mode === "reps";
                  const gridCls = rirOn
                    ? "grid-cols-[22px_1fr_1fr_74px_44px]"
                    : "grid-cols-[26px_1fr_1fr_46px]";
                  return (
                    <div className={`mb-1 grid items-center gap-2 px-1 text-center text-[10.5px] font-bold uppercase tracking-wide text-ink-3 ${gridCls}`}>
                      <span>#</span>
                      {entry.mode === "cardio" ? (
                        <>
                          <span>Minuti</span>
                          <span>km/h</span>
                        </>
                      ) : entry.mode === "time" ? (
                        <>
                          <span>Secondi</span>
                          <span>Zavorra kg</span>
                        </>
                      ) : (
                        <>
                          <span>{entry.sets.some((s) => s.w != null) ? "Kg" : "Solo corpo"}</span>
                          <span>Reps</span>
                        </>
                      )}
                      {rirOn && <span>RIR</span>}
                      <span />
                    </div>
                  );
                })()}
                <div className="flex flex-col gap-1.5">
                  {entry.sets.map((s: SetLog, si) => (
                    <div
                      key={si}
                      className={`grid items-center gap-2 rounded-[12px] p-1 transition-colors duration-300 ${
                        trackRir && entry.mode === "reps"
                          ? "grid-cols-[22px_1fr_1fr_74px_44px]"
                          : "grid-cols-[26px_1fr_1fr_46px]"
                      } ${s.done ? "bg-accent-soft" : ""}`}
                    >
                      <span
                        className={`tnum text-center text-[13.5px] font-bold ${
                          s.done ? "text-accent" : "text-ink-3"
                        }`}
                      >
                        {si + 1}
                      </span>
                      {entry.mode === "cardio" ? (
                        <>
                          <SetField
                            value={s.min ?? 0}
                            onChange={(v) => setField(cur, si, "min", v)}
                            step={1}
                            disabled={s.done}
                          />
                          <SetField
                            value={s.speed ?? 0}
                            onChange={(v) => setField(cur, si, "speed", v)}
                            step={0.5}
                            decimal
                            disabled={s.done}
                          />
                        </>
                      ) : entry.mode === "time" ? (
                        <>
                          <div className="flex flex-1 items-center gap-1">
                            <SetField
                              value={s.sec ?? 0}
                              onChange={(v) => setField(cur, si, "sec", v)}
                              step={5}
                              disabled={s.done}
                            />
                            <button
                              aria-label="Avvia timer serie"
                              disabled={s.done || timed != null}
                              onClick={() =>
                                setTimed({ ei: cur, si, sec: s.sec ?? 45 })
                              }
                              className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-accent text-accent-ink disabled:opacity-40"
                            >
                              <Play size={15} weight="fill" />
                            </button>
                          </div>
                          <SetField
                            value={s.w ?? 0}
                            onChange={(v) => setField(cur, si, "w", v)}
                            step={2.5}
                            decimal
                            disabled={s.done}
                          />
                        </>
                      ) : (
                        <>
                          {s.w != null ? (
                            <SetField
                              value={s.w}
                              onChange={(v) => setField(cur, si, "w", v)}
                              step={2.5}
                              decimal
                              disabled={s.done}
                            />
                          ) : (
                            <button
                              onClick={() => setField(cur, si, "w", 0)}
                              className="press flex h-10 flex-1 items-center justify-center rounded-[10px] border border-dashed border-line text-[11.5px] font-semibold text-ink-3"
                            >
                              + zavorra
                            </button>
                          )}
                          <SetField
                            value={s.r ?? 0}
                            onChange={(v) => setField(cur, si, "r", v)}
                            step={1}
                            disabled={s.done}
                          />
                        </>
                      )}
                      {trackRir && entry.mode === "reps" && (
                        <button
                          disabled={s.done}
                          onClick={() =>
                            setField(
                              cur,
                              si,
                              "rir",
                              s.rir == null ? 2 : s.rir >= 5 ? undefined : s.rir + 1
                            )
                          }
                          className={`press tnum h-10 rounded-[10px] border text-[13.5px] font-bold ${
                            s.rir != null
                              ? "border-accent bg-accent-soft text-accent"
                              : "border-line bg-surface-2 text-ink-3"
                          } ${s.done ? "opacity-45" : ""}`}
                        >
                          {s.rir != null ? s.rir : "-"}
                        </button>
                      )}
                      <motion.button
                        aria-label={s.done ? "Serie completata" : "Completa serie"}
                        onClick={() => onToggle(si)}
                        whileTap={{ scale: 0.88 }}
                        className={`flex h-11 w-11 items-center justify-center justify-self-center rounded-full border-2 transition-colors duration-200 ${
                          s.done
                            ? "border-accent bg-accent text-accent-ink"
                            : "border-line-strong bg-surface-2 text-ink-3"
                        }`}
                      >
                        <Check size={19} weight="bold" />
                      </motion.button>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 flex gap-2">
                  <Button
                    className="min-h-[38px] flex-1 px-3 text-[13px]"
                    disabled={entry.sets.length <= 1}
                    onClick={() => removeSet(cur)}
                  >
                    <Minus size={14} weight="bold" />
                    Serie
                  </Button>
                  <Button
                    className="min-h-[38px] flex-1 px-3 text-[13px]"
                    onClick={() => addSet(cur)}
                  >
                    <Plus size={14} weight="bold" />
                    Serie
                  </Button>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-2">
            <Button className="flex-1" disabled={cur <= 0} onClick={() => go(cur - 1)}>
              <CaretLeft size={16} weight="bold" />
              Prec.
            </Button>
            <Button
              className="flex-1"
              disabled={cur >= active.entries.length - 1}
              onClick={() => go(cur + 1)}
            >
              Succ.
              <ArrowRight size={16} weight="bold" />
            </Button>
          </div>
        </>
      )}

      {active.entries.length > 0 && (
        <>
          <Button variant="ghost" onClick={() => setPickerOpen(true)}>
            <Plus size={17} weight="bold" />
            Aggiungi esercizio
          </Button>
          <Button
            variant={allDone ? "primary" : "soft"}
            onClick={() => setConfirmFinish(true)}
          >
            {allDone
              ? "Concludi workout"
              : `Concludi ora · ${exDone}/${active.entries.length} esercizi`}
          </Button>
        </>
      )}

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(picked) => {
          setPickerOpen(false);
          const mode = detectMode(picked);
          const entryNew = buildEntry(
            {
              exId: picked.i,
              sets: 3,
              reps: 10,
              restSec: settings.restSec,
              mode,
              sec: mode === "time" ? 45 : undefined,
              min: mode === "cardio" ? 20 : undefined,
              speed: mode === "cardio" ? 8 : undefined,
            },
            workouts,
            exWeights,
            index ?? [],
            custom
          );
          addEntry(entryNew);
          toast(`${picked.n} aggiunto al workout`);
        }}
      />

      <InfoSheet ex={infoEx} open={infoEx != null} onClose={() => setInfoEx(null)} />

      {timed && (
        <WorkTimer
          sec={timed.sec}
          name={ex?.n ?? ""}
          onCancel={() => setTimed(null)}
          onDone={(elapsed) => {
            setField(timed.ei, timed.si, "sec", elapsed);
            const st = useStore.getState().active;
            if (st && !st.entries[timed.ei].sets[timed.si].done) {
              onToggle(timed.si);
            }
            setTimed(null);
          }}
        />
      )}

      <Sheet open={confirmDiscard} onClose={() => setConfirmDiscard(false)} title="Abbandonare il workout?">
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-[14px] leading-relaxed text-ink-2">
            Le serie registrate in questa sessione andranno perse.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              stopRest();
              discardSession();
              setConfirmDiscard(false);
              router.push("/");
            }}
          >
            Abbandona senza salvare
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDiscard(false)}>
            Continua ad allenarti
          </Button>
        </div>
      </Sheet>

      <Sheet open={confirmFinish} onClose={() => setConfirmFinish(false)} title={allDone ? "Grande lavoro!" : "Concludere adesso?"}>
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-[14px] leading-relaxed text-ink-2">
            {allDone
              ? "Hai completato tutte le serie in programma. Salviamo la sessione?"
              : `Hai completato ${done} serie su ${total}. Le serie non spuntate non verranno salvate.`}
          </p>
          <Button variant="primary" onClick={finish}>
            <Check size={18} weight="bold" />
            Salva workout
          </Button>
          <Button variant="ghost" onClick={() => setConfirmFinish(false)}>
            Non ancora
          </Button>
        </div>
      </Sheet>

      <Sheet open={weighOpen} onClose={() => setWeighOpen(false)} title="Peso di oggi">
        <div className="flex flex-col gap-4 pb-2">
          <p className="-mt-1 text-[13.5px] text-ink-2">
            Trenta secondi sulla bilancia prima di iniziare: la curva ringrazia.
          </p>
          <Stepper value={weighVal} onChange={setWeighVal} step={0.1} min={20} max={300} decimal suffix="kg" wide />
          <Button
            variant="primary"
            onClick={() => {
              logBodyweight(weighVal);
              setWeighOpen(false);
              toast(`Peso registrato: ${fmtNum(weighVal)} kg`);
            }}
          >
            Salva e allenati
          </Button>
          <Button variant="ghost" onClick={() => setWeighOpen(false)}>
            Salta per oggi
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

export default function AllenamentoPage() {
  const active = useStore((s) => s.active);
  const lastSummary = useStore((s) => s.lastSummary);
  if (active) return <ActiveWorkout />;
  if (lastSummary) return <CompleteView />;
  return <StartChooser />;
}
