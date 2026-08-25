"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Barbell,
  CalendarBlank,
  CheckCircle,
  CompassRose,
  Flame,
  GearSix,
  Lightning,
  MoonStars,
  Play,
  Plus,
  Scales,
  Sparkle,
  Target,
  Timer,
  UserCircle,
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
import PlanWizard from "@/components/PlanWizard";
import { nextStep } from "@/lib/coach";
import { useSignup } from "@/components/SignupPrompt";
import { useProfileSetup } from "@/components/ProfileSetup";
import { ageFrom, bmr, goalCalories, tdee } from "@/lib/health";
import { currentAccount } from "@/lib/auth";

function Onboarding({ accName }: { accName: string }) {
  const setOnboarded = useStore((s) => s.setOnboarded);
  const loadState = useStore((s) => s.loadState);

  return (
    <div className="flex flex-col">
      <div className="card-in mb-1" style={{ "--i": 0 } as React.CSSProperties}>
        <h1 className="display text-[30px]">
          {accName ? `Ciao, ${accName}` : "Benvenuto"}
        </h1>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
          Quattro domande e ti preparo la settimana giusta per te.
        </p>
      </div>
      <PlanWizard />
      <div className="mt-2 flex flex-col gap-2 border-t border-line pt-4">
        <button
          onClick={() => {
            setOnboarded();
            toast("Profilo pronto: costruisci il piano quando vuoi");
          }}
          className="press rounded-full px-4 py-2.5 text-[13px] font-semibold text-ink-2 hover:text-ink"
        >
          Salta: preferisco fare da solo
        </button>
        <button
          onClick={() => {
            loadState(buildDemoState(), true);
            toast("Dati demo caricati: esplora liberamente");
          }}
          className="press flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold text-ink-2 hover:text-ink"
        >
          <Sparkle size={15} weight="fill" color="var(--amber)" />
          Guarda prima la demo
        </button>
      </div>
    </div>
  );
}

const COACH_ICONS: Record<string, React.ReactNode> = {
  profile: <UserCircle size={20} weight="fill" />,
  signup: <Sparkle size={20} weight="fill" />,
  resume: <Timer size={20} weight="fill" />,
  plan: <CompassRose size={20} weight="fill" />,
  first: <Play size={20} weight="fill" />,
  "first-rest": <Play size={20} weight="fill" />,
  today: <Play size={20} weight="fill" />,
  bw: <Scales size={20} weight="bold" />,
  "bw-stale": <Scales size={20} weight="bold" />,
  goal: <Target size={20} weight="bold" />,
  week: <CalendarBlank size={20} weight="bold" />,
  done: <CheckCircle size={20} weight="fill" />,
  rest: <MoonStars size={20} weight="fill" />,
};

function CoachCard({
  onPeso,
  onObiettivo,
}: {
  onPeso: () => void;
  onObiettivo: () => void;
}) {
  const router = useRouter();
  const routines = useStore((s) => s.routines);
  const week = useStore((s) => s.week);
  const overrides = useStore((s) => s.overrides);
  const workouts = useStore((s) => s.workouts);
  const bodyweight = useStore((s) => s.bodyweight);
  const goalWeight = useStore((s) => s.goalWeight);
  const active = useStore((s) => s.active);
  const settings = useStore((s) => s.settings);
  const [guest, setGuest] = useState(false);
  useEffect(() => {
    setGuest(!!currentAccount()?.guest);
  }, []);

  const step = nextStep(
    { routines, week, overrides, workouts, bodyweight, goalWeight, active, settings },
    { guest }
  );

  const go = () => {
    if (step.action === "piano") router.push("/piano?wizard=1");
    else if (step.action === "allenamento") router.push("/allenamento");
    else if (step.action === "peso") onPeso();
    else if (step.action === "obiettivo") onObiettivo();
    else if (step.action === "signup") useSignup.getState().show("coach");
    else if (step.action === "profilo") useProfileSetup.getState().show();
  };

  const toneCls =
    step.tone === "accent"
      ? "border-[color:var(--accent)] bg-accent-soft"
      : step.tone === "amber"
        ? "border-[rgba(251,191,36,0.3)] bg-amber-soft"
        : "border-line bg-surface";
  const iconCls =
    step.tone === "accent"
      ? "bg-accent text-accent-ink"
      : step.tone === "amber"
        ? "bg-amber text-[#1d1607]"
        : "bg-surface-3 text-ink-2";

  return (
    <div className={`card-in rounded-[16px] border p-4 ${toneCls}`} style={{ "--i": 2 } as React.CSSProperties}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconCls}`}>
          {COACH_ICONS[step.key] ?? <CompassRose size={20} weight="fill" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-3">
              Prossimo passo
            </span>
          </div>
          <div className="text-[15px] font-bold leading-tight">{step.title}</div>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{step.body}</p>
          {step.cta && (
            <button
              onClick={go}
              className={`press mt-2.5 rounded-full px-4 py-2 text-[12.5px] font-bold ${
                step.tone === "amber" ? "bg-amber text-[#1d1607]" : "bg-accent text-accent-ink"
              }`}
            >
              {step.cta}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WeekStrip({ onDayTap }: { onDayTap: (iso: string) => void }) {
  const week = useStore((s) => s.week);
  const overrides = useStore((s) => s.overrides);
  const workouts = useStore((s) => s.workouts);
  const activities = useStore((s) => s.activities);
  const today = todayISO();
  const monday = mondayOf(today);
  const doneDays = useMemo(
    () => new Set([...workouts.map((w) => w.d), ...(activities ?? []).map((a) => a.d)]),
    [workouts, activities]
  );

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
  const [accName, setAccName] = useState("");
  const routines = useStore((s) => s.routines);
  const week = useStore((s) => s.week);
  const overrides = useStore((s) => s.overrides);
  const workouts = useStore((s) => s.workouts);
  const bodyweight = useStore((s) => s.bodyweight);
  const goalWeight = useStore((s) => s.goalWeight);
  const active = useStore((s) => s.active);
  const demo = useStore((s) => s.demo);
  const settingsHeight = useStore((s) => s.settings.height);
  const settingsAll = useStore((s) => s.settings);
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

  useEffect(() => {
    setAccName(currentAccount()?.name ?? "");
  }, []);

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
  const activities = useStore((s) => s.activities);
  const streak = streakWeeks(workouts, activities ?? []);
  const wThisWeek = useMemo(
    () => workouts.filter((w) => weekKeyOf(w.d) === weekKeyOf(today)).length,
    [workouts, today]
  );
  const planned = week.filter(Boolean).length;
  const bwData = useMemo(
    () => bodyweight.slice(-30).map((b) => ({ d: b.d, y: b.w })),
    [bodyweight]
  );

  if (!onboarded) return <Onboarding accName={accName} />;

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
            {accName ? `, ${accName}` : ""}
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

      <CoachCard
        onPeso={() => {
          setBwVal(lastBW?.w ?? 75);
          setBwOpen(true);
        }}
        onObiettivo={() => {
          setGoalVal(goalWeight ?? lastBW?.w ?? 75);
          setGoalOpen(true);
        }}
      />

      <Card className="card-in" style={{ "--i": 3 } as React.CSSProperties}>
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
              {settingsHeight != null && settingsHeight >= 120 && (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-ink-2">
                  BMI {fmtNum(Math.round((lastBW.w / Math.pow(settingsHeight / 100, 2)) * 10) / 10)}
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
            {(() => {
              const kcal = goalCalories(
                tdee(
                  bmr(
                    settingsAll.sex ?? null,
                    ageFrom(settingsAll.birthYear, new Date().getFullYear()),
                    settingsHeight,
                    lastBW.w
                  ),
                  week.filter(Boolean).length
                ),
                settingsAll.goal
              );
              return kcal != null ? (
                <div className="mb-1 text-[12px] text-ink-3">
                  Fabbisogno stimato ≈{" "}
                  <span className="tnum font-semibold text-ink-2">{fmtNum(kcal)} kcal</span>
                  /giorno per il tuo obiettivo
                </div>
              ) : null;
            })()}
            <LineChart data={bwData} goal={goalWeight} unit="kg" h={140} />
          </>
        ) : (
          <div className="py-3 text-[13.5px] leading-relaxed text-ink-2">
            Registra il primo peso per vedere la curva. Te lo chiederemo anche
            prima di ogni workout.
          </div>
        )}
      </Card>

      <Card className="card-in" style={{ "--i": 4 } as React.CSSProperties}>
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
              {(activities ?? []).length > 0 ? ` · ${(activities ?? []).length} da dispositivi` : ""}
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
