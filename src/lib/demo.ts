import type { AppState, BodyWeight, SetLog, Workout } from "./types";
import { addDays, dayIdxOf, todayISO } from "./dates";
import { STARTER_PPL, STARTER_WEEK } from "./starter";

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const BASE_W: Record<string, number> = {
  "0025": 62.5,
  "0314": 22,
  "0405": 16,
  "0334": 8,
  "0201": 25,
  "0032": 90,
  "0198": 55,
  "0861": 50,
  "0294": 12,
  "0313": 12,
  "0043": 75,
  "1463": 140,
  "0586": 40,
  "0605": 60,
  "2135": 10,
};

const STEP_W: Record<string, number> = {
  "0025": 2.5,
  "0314": 2,
  "0405": 2,
  "0334": 1,
  "0201": 2.5,
  "0032": 5,
  "0198": 2.5,
  "0861": 2.5,
  "0294": 1,
  "0313": 1,
  "0043": 2.5,
  "1463": 5,
  "0586": 2.5,
  "0605": 5,
  "2135": 2.5,
};

export function buildDemoState(): AppState {
  const rand = rng(42);
  const today = todayISO();
  const workouts: Workout[] = [];
  const weeks = 14;

  for (let wI = weeks; wI >= 0; wI--) {
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const realIso = addDays(addDays(today, -dayIdxOf(today)), -(wI * 7) + dayIdx);
      if (realIso > today) continue;
      const routineId = STARTER_WEEK[dayIdx];
      if (!routineId) continue;
      if (rand() < 0.12 && wI > 0) continue;
      const routine = STARTER_PPL.find((r) => r.id === routineId)!;
      const progress = weeks - wI;
      const start =
        new Date(realIso + "T18:30:00").getTime() + Math.floor(rand() * 40) * 60000;
      const durMin = 52 + Math.floor(rand() * 26);
      const entries = routine.exercises.map((re) => {
        const bump = Math.floor(progress / 2) * (STEP_W[re.exId] ?? 2.5);
        const w = (BASE_W[re.exId] ?? 20) + bump;
        const sets: SetLog[] = [];
        for (let s = 0; s < re.sets; s++) {
          if (re.mode === "time") {
            sets.push({ sec: (re.sec ?? 45) + Math.floor(progress / 3) * 5, w, done: true });
          } else {
            const missed = s === re.sets - 1 && rand() < 0.22;
            sets.push({
              w,
              r: missed ? Math.max(1, re.reps - 1 - Math.floor(rand() * 2)) : re.reps,
              done: true,
            });
          }
        }
        return { exId: re.exId, mode: re.mode, sets };
      });
      workouts.push({
        id: "demo_" + realIso,
        d: realIso,
        name: routine.name,
        routineId,
        start,
        end: start + durMin * 60000,
        entries,
      });
    }
  }

  const bodyweight: BodyWeight[] = [];
  let bw = 84.6;
  for (let i = weeks * 7; i >= 0; i--) {
    const iso = addDays(today, -i);
    bw += (79 - bw) * 0.012 + (rand() - 0.5) * 0.42;
    if (i % 2 === 0 || i === 0) {
      bodyweight.push({ d: iso, w: Math.round(bw * 10) / 10 });
    }
  }

  const exWeights: Record<string, number> = {};
  for (const wo of workouts) {
    for (const en of wo.entries) {
      const top = en.sets.reduce((m, s) => Math.max(m, s.w ?? 0), 0);
      if (top > 0) exWeights[en.exId] = top;
    }
  }

  return {
    routines: STARTER_PPL,
    week: [...STARTER_WEEK],
    overrides: {},
    workouts: workouts.sort((a, b) => (a.d < b.d ? -1 : 1)),
    bodyweight,
    goalWeight: 79,
    exWeights,
    custom: [],
    settings: {
      name: "Alex",
      unit: "kg",
      restSec: 90,
      sound: true,
      wakeLock: true,
      weighAsk: true,
    },
    active: null,
    demo: true,
    onboarded: true,
  };
}
