import type { Activity, Workout, ExerciseIndex, PR, SetLog } from "./types";
import { addDays, diffDays, mondayOf, todayISO, weekKeyOf } from "./dates";

export function e1rm(w: number, r: number): number {
  if (!w || !r || r > 12) return 0;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

export interface BestSet {
  w: number;
  r: number;
  e1rm: number;
  d: string;
}

export function bestSetFor(workouts: Workout[], exId: string): BestSet | null {
  let best: BestSet | null = null;
  for (const wo of workouts) {
    for (const en of wo.entries) {
      if (en.exId !== exId) continue;
      for (const s of en.sets) {
        if (!s.done || !s.w || !s.r) continue;
        const est = e1rm(s.w, s.r);
        if (est > 0 && (!best || est > best.e1rm)) {
          best = { w: s.w, r: s.r, e1rm: est, d: wo.d };
        }
      }
    }
  }
  return best;
}

export function e1rmHistory(workouts: Workout[], exId: string): { d: string; y: number }[] {
  const byDay = new Map<string, number>();
  for (const wo of workouts) {
    for (const en of wo.entries) {
      if (en.exId !== exId) continue;
      for (const s of en.sets) {
        if (!s.done || !s.w || !s.r) continue;
        const est = e1rm(s.w, s.r);
        if (est > 0) byDay.set(wo.d, Math.max(byDay.get(wo.d) ?? 0, est));
      }
    }
  }
  return [...byDay.entries()]
    .map(([d, y]) => ({ d, y }))
    .sort((a, b) => (a.d < b.d ? -1 : 1));
}

function setVolume(s: SetLog): number {
  if (!s.done) return 0;
  return (s.w ?? 0) * (s.r ?? 0);
}

export function workoutVolume(w: Workout): number {
  return w.entries.reduce(
    (n, en) => n + en.sets.reduce((m, s) => m + setVolume(s), 0),
    0
  );
}

export function workoutSets(w: Workout): number {
  return w.entries.reduce((n, en) => n + en.sets.filter((s) => s.done).length, 0);
}

export interface WeekStat {
  monday: string;
  workouts: number;
  volume: number;
  sets: number;
  minutes: number;
}

export function weeklyStats(
  workouts: Workout[],
  nWeeks: number,
  activities: Activity[] = []
): WeekStat[] {
  const thisMonday = mondayOf(todayISO());
  const out: WeekStat[] = [];
  for (let i = nWeeks - 1; i >= 0; i--) {
    out.push({
      monday: addDays(thisMonday, -7 * i),
      workouts: 0,
      volume: 0,
      sets: 0,
      minutes: 0,
    });
  }
  const byMonday = new Map(out.map((s) => [s.monday, s]));
  for (const w of workouts) {
    const stat = byMonday.get(weekKeyOf(w.d));
    if (!stat) continue;
    stat.workouts += 1;
    stat.volume += workoutVolume(w);
    stat.sets += workoutSets(w);
    stat.minutes += Math.max(0, Math.round((w.end - w.start) / 60000));
  }
  for (const a of activities) {
    const stat = byMonday.get(weekKeyOf(a.d));
    if (stat) stat.minutes += a.min;
  }
  return out;
}

export function streakWeeks(workouts: Workout[], activities: Activity[] = []): number {
  if (!workouts.length && !activities.length) return 0;
  const weeks = new Set([
    ...workouts.map((w) => weekKeyOf(w.d)),
    ...activities.map((a) => weekKeyOf(a.d)),
  ]);
  const thisMonday = mondayOf(todayISO());
  let streak = 0;
  let cursor = thisMonday;
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  while (weeks.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export function activityMinutes(
  workouts: Workout[],
  activities: Activity[] = []
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const w of workouts) {
    const min = Math.max(0, Math.round((w.end - w.start) / 60000));
    out[w.d] = (out[w.d] ?? 0) + min;
  }
  for (const a of activities) {
    out[a.d] = (out[a.d] ?? 0) + a.min;
  }
  return out;
}

export function muscleUsage(
  workouts: Workout[],
  index: ExerciseIndex[],
  days: number
): Record<string, number> {
  const byId = new Map(index.map((e) => [e.i, e]));
  const from = addDays(todayISO(), -(days - 1));
  const out: Record<string, number> = {};
  for (const w of workouts) {
    if (days > 0 && (w.d < from || diffDays(w.d, todayISO()) < 0)) continue;
    for (const en of w.entries) {
      const ex = byId.get(en.exId);
      if (!ex) continue;
      const doneSets = en.sets.filter((s) => s.done).length;
      if (!doneSets) continue;
      out[ex.t] = (out[ex.t] ?? 0) + doneSets;
      for (const sec of ex.s) {
        out[sec] = (out[sec] ?? 0) + doneSets * 0.5;
      }
    }
  }
  return out;
}

export function detectPRs(history: Workout[], session: Workout): PR[] {
  const prs: PR[] = [];
  const seen = new Set<string>();
  for (const en of session.entries) {
    if (seen.has(en.exId)) continue;
    seen.add(en.exId);
    const prev = bestSetFor(history, en.exId);
    let best: PR | null = null;
    for (const s of en.sets) {
      if (!s.done || !s.w || !s.r) continue;
      const est = e1rm(s.w, s.r);
      if (est > 0 && (!prev || est > prev.e1rm) && (!best || est > best.e1rm)) {
        best = { exId: en.exId, w: s.w, r: s.r, e1rm: est, d: session.d };
      }
    }
    if (best) prs.push(best);
  }
  return prs;
}
