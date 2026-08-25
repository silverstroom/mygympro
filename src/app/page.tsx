"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Barbell,
  CalendarBlank,
  Flame,
  GearSix,
  Lightning,
  MoonStars,
  Play,
  Plus,
  Sparkle,
  Target,
} from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { addDays, DAY_FULL, fmtLong, fmtNum, fmtShort, mondayOf, todayISO, weekKeyOf, dayIdxOf } from "@/lib/dates";
import { streakWeeks } from "@/lib/calc";
import { effectiveRoutineId } from "@/lib/session";
import { useStartSession } from "@/lib/useStartSession";
import { buildDemoState } from "@/lib/demo";
import { STARTER_PPL, STARTER_WEEK } from "@/lib/starter";
import { LineChart } from "@/components/charts";
import { Button, Card, Chip, Seg, Sheet, toast } from "@/components/ui";
import Stepper from "@/components/Stepper";
import { ROUTINE_ICONS } from "@/components/routineIcons";

function Onboarding() {
  const [name, setName] = useState("");
  const setSettings = useStore((s) => s.setSettings);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const saveRoutine = useStore((s) => s.saveRoutine);
  const assignDay = useStore((s) => s.assignDay);
  const loadState = useStore((s) => s.loadState);

  const finish = (mode: "ppl" | "empty" | "demo") => {
    if (mode === "demo") {
      const st = buildDemoState();
      if (name.trim()) st.settings.name = name.trim();
      loadState(st, true);
      toast("Dati demo caricati: esplora liberamente");
      return;
    }
    if (name.trim()) setSettings({ name: name.trim() });
    if (mode === "ppl") {
      STARTER_PPL.forEach(saveRoutine);
      STARTER_WEEK.forEach((r, i) => assignDay(i, r));
      toast("Piano Push / Pull / Legs pronto");
    }
    setOnboarded();
  };

  return (
    <div className="flex min-h-[80dvh] flex-col justify-center py-8">
      <div className="card-in mb-8" style={{ "--i": 0 } as React.CSSProperties}>
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent shadow-[0_10px_34px_rgba(163,230,53,0.35)]">
          <Barbell size={30} weight="bold" color="var(--accent-ink)" />
        </span>
        <h1 className="display text-[38px] leading-none">
          MyGym<span className="text-accent">Pro</span>
        </h1>
        <p className="mt-3 max-w-[300px] text-[15px] leading-relaxed text-ink-2">
          Piano settimanale, workout guidati e progressi che si vedono. Tutto
          sul tuo telefono, tutto tuo.
        </p>
      </div>

      <div className="card-in mb-6" style={{ "--i": 1 } as React.CSSProperties}>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-2">
          Come ti chiami?
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Il tuo nome (facoltativo)"
          className="h-12 w-full rounded-[12px] border border-line bg-surface-2 px-4 text-[15px] outline-none transition-colors placeholder:text-ink-3 focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-3">
        {[
          {
            icon: <Lightning size={22} weight="fill" color="var(--accent-ink)" />,
            title: "Parti col piano pronto",
            sub: "Push / Pull / Legs, 3 giorni a settimana. Lo adatti quando vuoi.",
            cta: () => finish("ppl"),
            primary: true,
          },
          {
            icon: <Plus size={22} weight="bold" color="var(--text)" />,
            title: "Costruisci da zero",
            sub: "Crea le tue schede sulla libreria di 1.324 esercizi.",
            cta: () => finish("empty"),
          },
          {
            icon: <Sparkle size={22} weight="fill" color="var(--amber)" />,
            title: "Prova con dati demo",
            sub: "14 settimane di storia finta per vedere subito grafici e statistiche.",
            cta: () => finish("demo"),
          },
        ].map((c, i) => (
          <button
            key={c.title}
            onClick={c.cta}
            style={{ "--i": 2 + i } as React.CSSProperties}
            className={`card-in press flex w-full items-center gap-4 rounded-[16px] border p-4 text-left ${
              c.primary
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${
                c.primary ? "bg-accent" : "bg-surface-3"
              }`}
            >
              {c.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15.5px] font-bold">{c.title}</span>
              <span className="block text-[13px] leading-snug text-ink-2">{c.sub}</span>
            </span>
            <ArrowRight size={18} color="var(--text-3)" />
          </button>
        ))}
      </div>
    </div>
  );
}

function WeekStrip({ onDayTap }: { onDayTap: (iso: string) => void }) {
  const week = useStore((s) => s.week);
  const overrides = useStore((s) => s.overrides);
  const workouts = useStore((s) => s.workouts);
  const today = todayISO();
  const monday = mondayOf(today);
  const doneDays = useMemo(() => new Set(workouts.map((w) => w.d)), [workouts]);

  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 7 }, (_, i) => {
        const iso = addDays(monday, i);
        const rid = effectiveRoutineId({ week, overrides }, iso);
        const isToday = iso === today;
        const done = doneDays.has(iso);
        const ovr = overrides[iso] !== undefined;
        return (
          <button
            key={iso}
            onClick={() => onDayTap(iso)}
            className={`press flex flex-col items-center gap-1 rounded-[13px] py-2 transition-colors ${
              isToday ? "bg-surface-3" : "hover:bg-surface-2"
            }`}
          >
            <span className={`text-[10.5px] font-semibold uppercase ${isToday ? "text-accent" : "text-ink-3"}`}>
              {["L", "M", "M", "G", "V", "S", "D"][i]}
            </span>
            <span className={`tnum text-[15px] font-bold ${isToday ? "text-ink" : "text-ink-2"}`}>
              {Number(iso.slice(8))}
            </span>
            <span
              className={`h-[7px] w-[7px] rounded-full ${
                done
                  ? "bg-accent"
                  : rid
                    ? ovr
                      ? "bg-amber"
                      : "bg-surface-3 border border-line-strong"
                    : "bg-transparent"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function Home() {
  const onboarded = useStore((s) => s.onboarded);
  const settings = useStore((s) => s.settings);
  const routines = useStore((s) => s.routines);
  const week = useStore((s) => s.week);
  const overrides = useStore((s) => s.overrides);
  const workouts = useStore((s) => s.workouts);
  const bodyweight = useStore((s) => s.bodyweight);
  const goalWeight = useStore((s) => s.goalWeight);
  const active = useStore((s) => s.active);
  const demo = useStore((s) => s.demo);
  const logBodyweight = useStore((s) => s.logBodyweight);
  const setGoal = useStore((s) => s.setGoal);
  const setOverride = useStore((s) => s.setOverride);
  const assignDay = useStore((s) => s.assignDay);
  const resetAll = useStore((s) => s.resetAll);
  const start = useStartSession();

  const [bwOpen, setBwOpen] = useState(false);
  const [bwVal, setBwVal] = useState(0);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalVal, setGoalVal] = useState(0);
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const [dayScope, setDayScope] = useState<"once" | "always">("once");

  const today = todayISO();
  const todayRid = effectiveRoutineId({ week, overrides }, today);
  const todayRoutine = routines.find((r) => r.id === todayRid) ?? null;
  const lastBW = bodyweight.length ? bodyweight[bodyweight.length - 1] : null;
  const prevBW = bodyweight.length > 1 ? bodyweight[bodyweight.length - 2] : null;
  const delta = lastBW && prevBW ? Math.round((lastBW.w - prevBW.w) * 10) / 10 : 0;
  const deltaGood =
    goalWeight != null && lastBW && prevBW
      ? Math.abs(lastBW.w - goalWeight) <= Math.abs(prevBW.w - goalWeight)
      : delta <= 0;
  const streak = streakWeeks(workouts);
  const wThisWeek = useMemo(
    () => workouts.filter((w) => weekKeyOf(w.d) === weekKeyOf(today)).length,
    [workouts, today]
  );
  const planned = week.filter(Boolean).length;
  const bwData = useMemo(
    () => bodyweight.slice(-30).map((b) => ({ d: b.d, y: b.w })),
    [bodyweight]
  );

  if (!onboarded) return <Onboarding />;

  const hour = new Date().getHours();
  const greet = hour < 5 ? "Notte fonda" : hour < 13 ? "Buongiorno" : hour < 18 ? "Buon allenamento" : "Buonasera";

  return (
    <div className="flex flex-col gap-3.5">
      {demo && (
        <div className="card-in flex items-center justify-between rounded-[14px] border border-[rgba(251,191,36,0.3)] bg-amber-soft px-4 py-2.5" style={{ "--i": 0 } as React.CSSProperties}>
          <span className="text-[12.5px] font-semibold text-amber">
            Stai esplorando i dati demo
          </span>
          <button
            onClick={() => {
              resetAll();
              toast("Dati azzerati: ricomincia da capo");
            }}
            className="press text-[12.5px] font-bold text-amber underline underline-offset-2"
          >
            Azzera
          </button>
        </div>
      )}

      <div className="card-in flex items-start justify-between" style={{ "--i": 0 } as React.CSSProperties}>
        <div>
          <h1 className="display text-[30px]">
            {greet}
            {settings.name ? `, ${settings.name}` : ""}
          </h1>
          <div className="mt-1 text-[13.5px] capitalize text-ink-2">{fmtLong(today)}</div>
        </div>
        <Link
          href="/impostazioni"
          aria-label="Impostazioni"
          className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-2 hover:text-ink lg:hidden"
        >
          <GearSix size={20} />
        </Link>
      </div>

      <Card className="card-in" style={{ "--i": 1 } as React.CSSProperties}>
        <WeekStrip onDayTap={(iso) => { setDayOpen(iso); setDayScope("once"); }} />
        <button
          onClick={() => (active || todayRoutine ? start(todayRid) : setDayOpen(today))}
          className="press mt-3 flex w-full items-center gap-3 rounded-[14px] border border-line bg-surface-2 p-3 text-left transition-colors hover:border-line-strong"
        >
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${
              active ? "bg-amber" : todayRoutine ? "bg-accent" : "bg-surface-3"
            }`}
          >
            {active ? (
              <Play size={20} weight="fill" color="#1d1607" />
            ) : todayRoutine ? (
              (() => {
                const Icon = ROUTINE_ICONS[todayRoutine.icon] ?? Barbell;
                return <Icon size={22} weight="bold" color="var(--accent-ink)" />;
              })()
            ) : (
              <MoonStars size={20} weight="fill" color="var(--text-3)" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-ink-3">
              Oggi
            </span>
            <span className="block truncate text-[16px] font-bold">
              {active
                ? `${active.name} in corso`
                : todayRoutine
                  ? todayRoutine.name
                  : "Riposo"}
            </span>
          </span>
          {active ? (
            <span className="shrink-0 rounded-full bg-amber-soft px-3.5 py-1.5 text-[13px] font-bold text-amber">
              Riprendi
            </span>
          ) : todayRoutine ? (
            <span className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-bold text-accent-ink">
              Inizia
            </span>
          ) : (
            <Plus size={18} color="var(--text-3)" className="shrink-0" />
          )}
        </button>
      </Card>

      {!routines.length && !active && (
        <Card className="card-in border-accent bg-accent-soft" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="mb-1 text-[16px] font-bold">Costruisci il tuo piano</div>
          <p className="mb-3 text-[13.5px] leading-snug text-ink-2">
            Assegna una scheda ai giorni della settimana e MyGymPro ti guiderà
            serie per serie.
          </p>
          <div className="flex gap-2">
            <Link href="/piano" className="flex-1">
              <Button variant="primary" className="w-full">
                <CalendarBlank size={17} weight="bold" />
                Vai al piano
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <Card className="card-in" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="display text-[15px] text-ink-2">Peso corporeo</h2>
          <div className="flex gap-2">
            <Chip
              on={goalWeight != null}
              onClick={() => {
                setGoalVal(goalWeight ?? lastBW?.w ?? 75);
                setGoalOpen(true);
              }}
            >
              <Target size={14} weight="bold" />
              {goalWeight != null ? `${fmtNum(goalWeight)} kg` : "Obiettivo"}
            </Chip>
            <Chip
              onClick={() => {
                setBwVal(lastBW?.w ?? 75);
                setBwOpen(true);
              }}
            >
              <Plus size={14} weight="bold" />
              Registra
            </Chip>
          </div>
        </div>
        {lastBW ? (
          <>
            <div className="mb-1 flex items-baseline gap-2.5">
              <span className="display-num text-[34px]">{fmtNum(lastBW.w)}</span>
              <span className="text-[13px] font-medium text-ink-3">kg</span>
              {delta !== 0 && (
                <span
                  className={`flex items-center gap-0.5 text-[13px] font-bold ${
                    deltaGood ? "text-accent" : "text-red"
                  }`}
                >
                  {delta > 0 ? <ArrowUp size={13} weight="bold" /> : <ArrowDown size={13} weight="bold" />}
                  {fmtNum(Math.abs(delta))}
                </span>
              )}
              <span className="ml-auto text-[12px] text-ink-3">{fmtShort(lastBW.d)}</span>
            </div>
            {goalWeight != null && (
              <div className="mb-1 text-[12.5px] font-medium text-amber">
                {Math.abs(goalWeight - lastBW.w) < 0.25
                  ? "Obiettivo raggiunto"
                  : goalWeight < lastBW.w
                    ? `${fmtNum(Math.round((lastBW.w - goalWeight) * 10) / 10)} kg all'obiettivo`
                    : `${fmtNum(Math.round((goalWeight - lastBW.w) * 10) / 10)} kg da mettere su`}
              </div>
            )}
            <LineChart data={bwData} goal={goalWeight} unit="kg" h={140} />
          </>
        ) : (
          <div className="py-3 text-[13.5px] leading-relaxed text-ink-2">
            Registra il primo peso per vedere la curva. Te lo chiederemo anche
            prima di ogni workout.
          </div>
        )}
      </Card>

      <Card className="card-in" style={{ "--i": 3 } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Flame
                size={22}
                weight="fill"
                color={streak > 0 ? "var(--amber)" : "var(--text-3)"}
              />
              <span className="display-num text-[24px]">
                {streak}
              </span>
              <span className="text-[14px] font-semibold text-ink-2">
                {streak === 1 ? "settimana di fila" : "settimane di fila"}
              </span>
            </div>
            <div className="mt-1 text-[12.5px] text-ink-3">
              {wThisWeek}
              {planned ? ` su ${planned}` : ""} questa settimana · {workouts.length}{" "}
              {workouts.length === 1 ? "workout totale" : "workout totali"}
            </div>
          </div>
          <Link
            href="/progressi"
            aria-label="Vai ai progressi"
            className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-2"
          >
            <ArrowRight size={18} />
          </Link>
        </div>
      </Card>

      <Sheet open={bwOpen} onClose={() => setBwOpen(false)} title="Registra il peso">
        <div className="flex flex-col gap-4 pb-2">
          <Stepper value={bwVal} onChange={setBwVal} step={0.1} min={20} max={300} decimal suffix="kg" wide />
          <Button
            variant="primary"
            onClick={() => {
              logBodyweight(bwVal);
              setBwOpen(false);
              toast(`Peso registrato: ${fmtNum(bwVal)} kg`);
            }}
          >
            Salva
          </Button>
        </div>
      </Sheet>

      <Sheet open={goalOpen} onClose={() => setGoalOpen(false)} title="Obiettivo di peso">
        <div className="flex flex-col gap-4 pb-2">
          <Stepper value={goalVal} onChange={setGoalVal} step={0.5} min={20} max={300} decimal suffix="kg" wide />
          <Button
            variant="primary"
            onClick={() => {
              setGoal(goalVal);
              setGoalOpen(false);
              toast("Obiettivo aggiornato");
            }}
          >
            Imposta obiettivo
          </Button>
          {goalWeight != null && (
            <Button
              variant="danger"
              onClick={() => {
                setGoal(null);
                setGoalOpen(false);
              }}
            >
              Rimuovi obiettivo
            </Button>
          )}
        </div>
      </Sheet>

      <Sheet
        open={dayOpen != null}
        onClose={() => setDayOpen(null)}
        title={dayOpen ? `${DAY_FULL[dayIdxOf(dayOpen)]} ${fmtShort(dayOpen)}` : ""}
      >
        {dayOpen && (
          <div className="flex flex-col gap-3 pb-2">
            <Seg
              options={[
                { value: "once", label: "Solo questo giorno" },
                { value: "always", label: `Ogni ${DAY_FULL[dayIdxOf(dayOpen)].toLowerCase()}` },
              ]}
              value={dayScope}
              onChange={setDayScope}
            />
            <div className="flex flex-col gap-2">
              {routines.map((r) => {
                const Icon = ROUTINE_ICONS[r.icon] ?? Barbell;
                const current = effectiveRoutineId({ week, overrides }, dayOpen);
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      if (dayScope === "once") setOverride(dayOpen, r.id);
                      else {
                        assignDay(dayIdxOf(dayOpen), r.id);
                        setOverride(dayOpen, undefined);
                      }
                      setDayOpen(null);
                      toast(`${r.name} programmata`);
                    }}
                    className={`press flex w-full items-center gap-3 rounded-[14px] border p-3 text-left ${
                      current === r.id ? "border-accent bg-accent-soft" : "border-line bg-surface-2"
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-surface-3">
                      <Icon size={20} weight="bold" color="var(--accent)" />
                    </span>
                    <span className="flex-1 text-[15px] font-bold">{r.name}</span>
                    <span className="text-[12.5px] text-ink-3">
                      {r.exercises.length} esercizi
                    </span>
                  </button>
                );
              })}
              {!routines.length && (
                <div className="py-2 text-center text-[13.5px] text-ink-2">
                  Non hai ancora schede: creale nella sezione Piano.
                </div>
              )}
              <button
                onClick={() => {
                  if (dayScope === "once") setOverride(dayOpen, null);
                  else {
                    assignDay(dayIdxOf(dayOpen), null);
                    setOverride(dayOpen, undefined);
                  }
                  setDayOpen(null);
                }}
                className="press flex w-full items-center gap-3 rounded-[14px] border border-line bg-surface-2 p-3 text-left"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-surface-3">
                  <MoonStars size={20} weight="fill" color="var(--text-3)" />
                </span>
                <span className="flex-1 text-[15px] font-bold text-ink-2">Riposo</span>
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
