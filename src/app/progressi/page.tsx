"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CaretRight, Flame, Trophy } from "@phosphor-icons/react";
import type { ExerciseIndex } from "@/lib/types";
import { useStore } from "@/lib/store";
import { loadIndex, resolveEx } from "@/lib/data";
import { tTarget, TARGET_IT } from "@/lib/it";
import {
  activityMinutes,
  bestSetFor,
  e1rmHistory,
  muscleUsage,
  streakWeeks,
  weeklyStats,
  workoutSets,
} from "@/lib/calc";
import { fmtDuration, fmtNum, fmtShort } from "@/lib/dates";
import { Card, Seg, Tag } from "@/components/ui";
import { Heatmap, LineChart, Sparkline, WeekBars } from "@/components/charts";
import BodyMap from "@/components/BodyMap";
import CountUp from "@/components/CountUp";

const CORE_MUSCLES = [
  "pectorals",
  "lats",
  "upper back",
  "delts",
  "biceps",
  "triceps",
  "abs",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
];

export default function ProgressiPage() {
  const workouts = useStore((s) => s.workouts);
  const bodyweight = useStore((s) => s.bodyweight);
  const goalWeight = useStore((s) => s.goalWeight);
  const custom = useStore((s) => s.custom);
  const [index, setIndex] = useState<ExerciseIndex[] | null>(null);
  const [heatSel, setHeatSel] = useState<string | null>(null);
  const [period, setPeriod] = useState<"7" | "30" | "all">("30");
  const [musclePick, setMusclePick] = useState<string | null>(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch(() => {});
  }, []);

  const streak = useMemo(() => streakWeeks(workouts), [workouts]);
  const activity = useMemo(() => activityMinutes(workouts), [workouts]);
  const weeks = useMemo(() => weeklyStats(workouts, 8), [workouts]);
  const thisWeek = weeks[weeks.length - 1];

  const bwData = useMemo(
    () => bodyweight.slice(-60).map((b) => ({ d: b.d, y: b.w })),
    [bodyweight]
  );

  const usage = useMemo(() => {
    if (!index) return {};
    return muscleUsage(workouts, index, period === "all" ? 0 : Number(period));
  }, [workouts, index, period]);

  const neglected = useMemo(() => {
    if (!index || !workouts.length) return [];
    return CORE_MUSCLES.filter((m) => !(usage[m] > 0)).slice(0, 5);
  }, [usage, index, workouts.length]);

  const prs = useMemo(() => {
    if (!index) return [];
    const ids = new Set<string>();
    for (const w of workouts) for (const en of w.entries) ids.add(en.exId);
    const rows = [...ids]
      .map((exId) => {
        const best = bestSetFor(workouts, exId);
        if (!best || best.e1rm <= 0) return null;
        const curve = e1rmHistory(workouts, exId).map((p) => p.y);
        return { exId, best, curve };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.best.e1rm - a.best.e1rm)
      .slice(0, 8);
    return rows;
  }, [workouts, index]);

  const selWorkouts = useMemo(
    () => (heatSel ? workouts.filter((w) => w.d === heatSel) : []),
    [workouts, heatSel]
  );

  const muscleRows = useMemo(() => {
    return Object.entries(usage)
      .filter(([k]) => TARGET_IT[k])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [usage]);

  if (!workouts.length) {
    return (
      <div className="flex flex-col gap-3.5">
        <h1 className="display card-in text-[30px]" style={{ "--i": 0 } as React.CSSProperties}>
          Progressi
        </h1>
        <Card className="card-in py-12 text-center" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="mb-2 flex justify-center">
            <Flame size={34} color="var(--text-3)" />
          </div>
          <div className="mb-1 text-[16px] font-bold">Ancora tutto da scrivere</div>
          <p className="mx-auto max-w-[280px] text-[13.5px] leading-relaxed text-ink-2">
            Completa il primo workout e qui vedrai heatmap, volumi, record e la
            mappa dei muscoli.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <h1 className="display card-in text-[30px]" style={{ "--i": 0 } as React.CSSProperties}>
        Progressi
      </h1>

      <div className="card-in grid grid-cols-2 gap-2.5 sm:grid-cols-4" style={{ "--i": 1 } as React.CSSProperties}>
        {[
          { label: "Workout", value: workouts.length },
          { label: "Settimane di fila", value: streak },
          { label: "Serie (7 gg)", value: thisWeek?.sets ?? 0 },
          { label: "Min (7 gg)", value: thisWeek?.minutes ?? 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-[16px] border border-line bg-surface p-3">
            <CountUp value={s.value} className="display-num block text-[26px]" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <Card className="card-in" style={{ "--i": 2 } as React.CSSProperties}>
        <h2 className="display mb-3 text-[15px] text-ink-2">Attività</h2>
        <Heatmap activity={activity} selected={heatSel} onSelect={setHeatSel} />
        {heatSel && (
          <div className="mt-2 rounded-[13px] bg-surface-2 p-3 text-[13px]">
            <span className="font-bold capitalize">{fmtShort(heatSel)}</span>
            {selWorkouts.length ? (
              selWorkouts.map((w) => (
                <span key={w.id} className="text-ink-2">
                  {" "}
                  · {w.name}, {workoutSets(w)} serie,{" "}
                  {fmtDuration(Math.round((w.end - w.start) / 60000))}
                </span>
              ))
            ) : (
              <span className="text-ink-3"> · nessun allenamento</span>
            )}
          </div>
        )}
      </Card>

      <Card className="card-in" style={{ "--i": 3 } as React.CSSProperties}>
        <h2 className="display mb-2 text-[15px] text-ink-2">Volume settimanale</h2>
        <WeekBars
          values={weeks.map((w) => Math.round(w.volume))}
          labels={weeks.map((w) => fmtShort(w.monday).split(" ")[0] + " " + fmtShort(w.monday).split(" ")[1])}
          unit="kg"
        />
      </Card>

      {bwData.length >= 2 && (
        <Card className="card-in" style={{ "--i": 4 } as React.CSSProperties}>
          <h2 className="display mb-2 text-[15px] text-ink-2">Peso corporeo</h2>
          <LineChart data={bwData} goal={goalWeight} unit="kg" h={160} />
        </Card>
      )}

      <Card className="card-in" style={{ "--i": 5 } as React.CSSProperties}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="display text-[15px] text-ink-2">Mappa muscoli</h2>
          <Seg
            options={[
              { value: "7", label: "7 gg" },
              { value: "30", label: "30 gg" },
              { value: "all", label: "Tutto" },
            ]}
            value={period}
            onChange={setPeriod}
          />
        </div>
        <BodyMap usage={usage} picked={musclePick} onPick={(m) => setMusclePick(musclePick === m ? null : m)} />
        {musclePick && (
          <div className="mt-2 rounded-[13px] bg-surface-2 p-3 text-center text-[13px]">
            <span className="font-bold">{tTarget(musclePick)}</span>
            <span className="text-ink-2">
              {" "}
              · {fmtNum(Math.round((usage[musclePick] ?? 0) * 10) / 10)} serie nel periodo
            </span>
          </div>
        )}
        {muscleRows.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {muscleRows.map(([m, v]) => {
              const max = muscleRows[0][1];
              return (
                <div key={m} className="flex items-center gap-2.5">
                  <span className="w-[110px] shrink-0 truncate text-[12.5px] font-medium text-ink-2">
                    {tTarget(m)}
                  </span>
                  <div className="h-[8px] flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent-dim"
                      style={{ width: `${(v / max) * 100}%`, transition: "width 500ms var(--ease-out)" }}
                    />
                  </div>
                  <span className="tnum w-8 shrink-0 text-right text-[12px] text-ink-3">
                    {fmtNum(Math.round(v))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {neglected.length > 0 && (
          <div className="mt-3 border-t border-line pt-3">
            <div className="mb-1.5 text-[12px] font-semibold text-ink-3">
              Non allenati nel periodo
            </div>
            <div className="flex flex-wrap gap-1.5">
              {neglected.map((m) => (
                <Tag key={m} tone="amber">
                  {tTarget(m)}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </Card>

      {prs.length > 0 && (
        <Card className="card-in" style={{ "--i": 6 } as React.CSSProperties}>
          <div className="mb-2.5 flex items-center gap-2">
            <Trophy size={17} weight="fill" color="var(--amber)" />
            <h2 className="display text-[15px] text-ink-2">Massimali stimati</h2>
          </div>
          <div className="flex flex-col">
            {prs.map((p) => {
              const ex = index ? resolveEx(p.exId, index, custom) : null;
              return (
                <Link
                  key={p.exId}
                  href={`/esercizi/${p.exId}`}
                  className="press-soft -mx-2 flex items-center gap-3 rounded-[12px] px-2 py-2 transition-colors hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold capitalize">
                      {ex?.n ?? "..."}
                    </div>
                    <div className="text-[11.5px] text-ink-3">
                      best {fmtNum(p.best.w)} kg × {p.best.r}
                    </div>
                  </div>
                  <Sparkline data={p.curve} />
                  <span className="tnum w-[64px] shrink-0 text-right text-[15px] font-bold text-accent">
                    {fmtNum(Math.round(p.best.e1rm * 10) / 10)}
                  </span>
                  <CaretRight size={14} color="var(--text-3)" className="shrink-0" />
                </Link>
              );
            })}
          </div>
          <div className="mt-2 text-[11px] text-ink-3">
            1RM stimato con la formula di Epley sul set migliore, fino a 12 ripetizioni.
          </div>
        </Card>
      )}
    </div>
  );
}
