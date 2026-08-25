import { describe, it, expect } from "vitest";
import { suggestFor } from "./progression";
import type { Workout } from "./types";

function session(d: string, exId: string, sets: { w?: number; r?: number; done: boolean }[]): Workout {
  const start = new Date(d + "T18:00:00").getTime();
  return {
    id: "w" + d,
    d,
    name: "Test",
    routineId: null,
    start,
    end: start + 3600000,
    entries: [{ exId, mode: "reps", sets }],
  };
}

describe("suggestFor", () => {
  it("prima volta: start", () => {
    const s = suggestFor("x", [], { targetReps: 8, bodyweight: false });
    expect(s.kind).toBe("start");
  });

  it("tutte le serie chiuse ai target: aumenta di 2.5", () => {
    const h = [
      session("2026-08-10", "x", [
        { w: 60, r: 8, done: true },
        { w: 60, r: 8, done: true },
        { w: 60, r: 8, done: true },
      ]),
    ];
    const s = suggestFor("x", h, { targetReps: 8, bodyweight: false });
    expect(s.kind).toBe("up");
    expect(s.weight).toBe(62.5);
    expect(s.why.length).toBeGreaterThan(10);
  });

  it("serie mancate una volta: keep", () => {
    const h = [
      session("2026-08-10", "x", [
        { w: 60, r: 8, done: true },
        { w: 60, r: 6, done: true },
      ]),
    ];
    const s = suggestFor("x", h, { targetReps: 8, bodyweight: false });
    expect(s.kind).toBe("keep");
    expect(s.weight).toBe(60);
  });

  it("due stalli di fila: deload al 90% arrotondato a 2.5", () => {
    const h = [
      session("2026-08-03", "x", [{ w: 60, r: 6, done: true }]),
      session("2026-08-10", "x", [{ w: 60, r: 6, done: true }]),
    ];
    const s = suggestFor("x", h, { targetReps: 8, bodyweight: false });
    expect(s.kind).toBe("deload");
    expect(s.weight).toBe(55);
  });

  it("corpo libero completo: reps +1", () => {
    const h = [
      session("2026-08-10", "x", [
        { r: 10, done: true },
        { r: 10, done: true },
      ]),
    ];
    const s = suggestFor("x", h, { targetReps: 10, bodyweight: true });
    expect(s.kind).toBe("reps");
    expect(s.reps).toBe(11);
  });

  it("set non spuntati non contano come chiusi", () => {
    const h = [
      session("2026-08-10", "x", [
        { w: 60, r: 8, done: true },
        { w: 60, r: 8, done: false },
      ]),
    ];
    const s = suggestFor("x", h, { targetReps: 8, bodyweight: false });
    expect(s.kind).toBe("keep");
  });
});
