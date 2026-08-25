import { describe, it, expect } from "vitest";
import {
  e1rm,
  bestSetFor,
  workoutVolume,
  weeklyStats,
  streakWeeks,
  activityMinutes,
  muscleUsage,
  detectPRs,
} from "./calc";
import type { Workout, ExerciseIndex } from "./types";
import { addDays, mondayOf, todayISO } from "./dates";

function wk(d: string, entries: Workout["entries"], durMin = 60): Workout {
  const start = new Date(d + "T18:00:00").getTime();
  return {
    id: "w" + d,
    d,
    name: "Test",
    routineId: null,
    start,
    end: start + durMin * 60000,
    entries,
  };
}

const bench = (w: number, r: number) => ({
  exId: "0025",
  mode: "reps" as const,
  sets: [{ w, r, done: true }],
});

describe("e1rm", () => {
  it("usa Epley", () => {
    expect(e1rm(100, 5)).toBeCloseTo(116.67, 1);
  });
  it("1 rep = peso", () => {
    expect(e1rm(80, 1)).toBe(80);
  });
  it("oltre 12 reps non stima", () => {
    expect(e1rm(50, 13)).toBe(0);
  });
  it("zero o reps mancanti non stimano", () => {
    expect(e1rm(0, 5)).toBe(0);
    expect(e1rm(50, 0)).toBe(0);
  });
});

describe("bestSetFor", () => {
  it("trova il set con e1rm più alto", () => {
    const ws = [
      wk("2026-08-01", [bench(80, 8)]),
      wk("2026-08-08", [bench(90, 3)]),
    ];
    const best = bestSetFor(ws, "0025");
    expect(best?.w).toBe(80);
    expect(best?.d).toBe("2026-08-01");
  });
  it("null senza storia", () => {
    expect(bestSetFor([], "0025")).toBeNull();
  });
});

describe("volume", () => {
  it("somma peso x reps dei set done", () => {
    const w = wk("2026-08-01", [
      {
        exId: "a",
        mode: "reps",
        sets: [
          { w: 100, r: 5, done: true },
          { w: 100, r: 5, done: false },
        ],
      },
    ]);
    expect(workoutVolume(w)).toBe(500);
  });
});

describe("weeklyStats", () => {
  it("raggruppa per settimana", () => {
    const monday = mondayOf(todayISO());
    const ws = [
      wk(monday, [bench(80, 5)]),
      wk(addDays(monday, 2), [bench(80, 5)]),
      wk(addDays(monday, -7), [bench(60, 5)]),
    ];
    const stats = weeklyStats(ws, 2);
    expect(stats.length).toBe(2);
    expect(stats[1].workouts).toBe(2);
    expect(stats[1].volume).toBe(800);
    expect(stats[0].volume).toBe(300);
  });
});

describe("streakWeeks", () => {
  it("conta settimane consecutive con allenamenti", () => {
    const monday = mondayOf(todayISO());
    const ws = [
      wk(monday, [bench(80, 5)]),
      wk(addDays(monday, -7), [bench(80, 5)]),
      wk(addDays(monday, -14), [bench(80, 5)]),
      wk(addDays(monday, -28), [bench(80, 5)]),
    ];
    expect(streakWeeks(ws)).toBe(3);
  });
  it("la settimana corrente vuota non azzera", () => {
    const monday = mondayOf(todayISO());
    const ws = [wk(addDays(monday, -7), [bench(80, 5)])];
    expect(streakWeeks(ws)).toBe(1);
  });
  it("zero senza allenamenti recenti", () => {
    const monday = mondayOf(todayISO());
    expect(streakWeeks([wk(addDays(monday, -21), [bench(80, 5)])])).toBe(0);
    expect(streakWeeks([])).toBe(0);
  });
});

describe("activityMinutes", () => {
  it("mappa iso a minuti", () => {
    const ws = [wk("2026-08-01", [bench(80, 5)], 45)];
    expect(activityMinutes(ws)["2026-08-01"]).toBe(45);
  });
});

describe("muscleUsage", () => {
  const index: ExerciseIndex[] = [
    { i: "0025", n: "bench", b: "chest", e: "barbell", t: "pectorals", s: ["triceps"], m: "x" },
  ];
  it("pesa target 1 e secondari 0.5 per set", () => {
    const ws = [
      wk(todayISO(), [
        { exId: "0025", mode: "reps", sets: [{ w: 80, r: 5, done: true }, { w: 80, r: 5, done: true }] },
      ]),
    ];
    const u = muscleUsage(ws, index, 7);
    expect(u["pectorals"]).toBe(2);
    expect(u["triceps"]).toBe(1);
  });
  it("filtra per periodo", () => {
    const ws = [wk(addDays(todayISO(), -30), [bench(80, 5)])];
    expect(muscleUsage(ws, index, 7)["pectorals"]).toBeUndefined();
  });
});

describe("detectPRs", () => {
  it("segnala nuovo massimale stimato", () => {
    const history = [wk("2026-08-01", [bench(80, 5)])];
    const session = wk("2026-08-10", [bench(85, 5)]);
    const prs = detectPRs(history, session);
    expect(prs.length).toBe(1);
    expect(prs[0].w).toBe(85);
  });
  it("nessun PR se sotto lo storico", () => {
    const history = [wk("2026-08-01", [bench(90, 5)])];
    const session = wk("2026-08-10", [bench(80, 5)]);
    expect(detectPRs(history, session).length).toBe(0);
  });
  it("prima volta con peso conta come PR", () => {
    const session = wk("2026-08-10", [bench(60, 8)]);
    expect(detectPRs([], session).length).toBe(1);
  });
});
