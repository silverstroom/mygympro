import { describe, expect, it } from "vitest";
import { buildInsights } from "./insights";
import { generateQuickWorkout } from "./quickwo";
import { hypeForPR, hypeForSet, hypeForVolume } from "./hype";
import { suggestFor } from "./progression";
import type { ExerciseIndex, Workout } from "./types";
import { addDays, todayISO } from "./dates";

const INDEX: ExerciseIndex[] = [
  { i: "b", n: "bench press", b: "chest", e: "barbell", t: "pectorals", s: ["triceps"], m: "" },
  { i: "r", n: "barbell row", b: "back", e: "barbell", t: "upper back", s: ["biceps"], m: "" },
  { i: "s", n: "squat", b: "upper legs", e: "barbell", t: "quads", s: ["glutes"], m: "" },
];

function wo(d: string, exId: string, w: number, reps = 8, sets = 4): Workout {
  const start = new Date(d + "T18:00:00").getTime();
  return {
    id: exId + d,
    d,
    name: "T",
    routineId: null,
    start,
    end: start + 3600000,
    entries: [
      { exId, mode: "reps", sets: Array.from({ length: sets }, () => ({ w, r: reps, done: true })) },
    ],
  };
}

describe("insights", () => {
  it("rileva lo stallo da esercizio ripetuto", () => {
    const today = todayISO();
    const ws: Workout[] = [];
    for (let i = 0; i < 10; i++) {
      ws.push(wo(addDays(today, -7 * i), "b", 80));
    }
    const ins = buildInsights(ws, INDEX, today);
    expect(ins.some((x) => x.key === "overuse-b")).toBe(true);
  });

  it("rileva lo squilibrio spinta/tirata", () => {
    const today = todayISO();
    const ws: Workout[] = [];
    for (let i = 0; i < 8; i++) {
      const d = addDays(today, -3 * i);
      ws.push(wo(d, "b", 80 + i * 2.5));
    }
    ws.push(wo(addDays(today, -5), "r", 20, 8, 1));
    const ins = buildInsights(ws, INDEX, today);
    expect(ins.some((x) => x.key === "push-pull")).toBe(true);
  });

  it("meno di 4 workout: silenzio", () => {
    expect(buildInsights([wo(todayISO(), "b", 80)], INDEX).length).toBe(0);
  });
});

describe("quick workout", () => {
  it("30 minuti in palestra: sessione piena che ci sta nel tempo", () => {
    const q = generateQuickWorkout(30, "palestra");
    expect(q.exercises.length).toBeGreaterThanOrEqual(4);
    const est = q.exercises.reduce((n, e) => n + e.sets * (42 + e.restSec), 0);
    expect(est).toBeLessThanOrEqual(30 * 60);
  });

  it("15 minuti: modalità circuito con 2 serie", () => {
    const q = generateQuickWorkout(15, "corpo");
    expect(q.exercises.length).toBeGreaterThanOrEqual(2);
    expect(q.exercises.every((e) => e.sets === 2)).toBe(true);
  });

  it("corpo libero non chiede attrezzi", () => {
    const q = generateQuickWorkout(45, "corpo");
    expect(q.exercises.every((e) => !["0043", "0025", "0861"].includes(e.exId))).toBe(true);
  });
});

describe("hype", () => {
  it("volume da balenottera", () => {
    expect(hypeForVolume(15500)).toContain("balenottera");
  });

  it("serie leggera: nessun messaggio", () => {
    expect(hypeForSet(20)).toBeNull();
  });

  it("serie pesante: paragone presente", () => {
    expect(hypeForSet(105)).toContain("pianoforte");
  });

  it("pr line non vuota", () => {
    expect(hypeForPR().length).toBeGreaterThan(10);
  });

  it("goal nel messaggio volume", () => {
    const msg = hypeForVolume(2000, "forza");
    expect(msg).toBeTruthy();
  });
});

describe("progressione con RIR", () => {
  it("molto margine = doppio salto", () => {
    const h: Workout[] = [
      {
        id: "w1",
        d: "2026-08-10",
        name: "T",
        routineId: null,
        start: 1,
        end: 2,
        entries: [
          {
            exId: "x",
            mode: "reps",
            sets: [
              { w: 60, r: 8, rir: 3, done: true },
              { w: 60, r: 8, rir: 3, done: true },
            ],
          },
        ],
      },
    ];
    const s = suggestFor("x", h, { targetReps: 8, bodyweight: false });
    expect(s.kind).toBe("up");
    expect(s.weight).toBe(65);
    expect(s.why).toContain("doppio");
  });
});
