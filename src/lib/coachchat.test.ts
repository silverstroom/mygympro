import { describe, expect, it } from "vitest";
import { answer, type ChatCtx } from "./coachchat";
import type { ExerciseIndex, Workout } from "./types";
import { todayISO, dayIdxOf } from "./dates";

const INDEX: ExerciseIndex[] = [
  { i: "0025", n: "barbell bench press", b: "chest", e: "barbell", t: "pectorals", s: [], m: "x" },
  { i: "0043", n: "barbell full squat", b: "upper legs", e: "barbell", t: "quads", s: [], m: "y" },
];

function ctx(over: Partial<ChatCtx> = {}): ChatCtx {
  return {
    index: INDEX,
    custom: [],
    routines: [],
    week: [null, null, null, null, null, null, null],
    overrides: {},
    workouts: [],
    bodyweight: [],
    goalWeight: null,
    activities: [],
    settings: { name: "", unit: "kg", restSec: 90, sound: true, wakeLock: true, weighAsk: true },
    userName: "Salvo",
    ...over,
  };
}

function wk(d: string, exId: string, w: number): Workout {
  return {
    id: exId + d, d, name: "T", routineId: null, start: 1, end: 2,
    entries: [{ exId, mode: "reps", sets: [{ w, r: 8, done: true }, { w, r: 8, done: true }, { w, r: 8, done: true }] }],
  };
}

describe("coach chat", () => {
  it("dolore: risposta prudente", () => {
    expect(answer("mi fa male la spalla", ctx()).text).toContain("medico");
  });

  it("oggi con scheda: nomina la scheda e propone l'azione", () => {
    const week: (string | null)[] = [null, null, null, null, null, null, null];
    week[dayIdxOf(todayISO())] = "r1";
    const a = answer("cosa mi alleno oggi?", ctx({
      routines: [{ id: "r1", name: "Push", icon: "barbell", exercises: [] }],
      week,
    }));
    expect(a.text).toContain("Push");
    expect(a.actions?.[0].type).toBe("href");
  });

  it("poco tempo: estrae i minuti e propone la lampo", () => {
    const a = answer("ho solo 20 minuti", ctx());
    expect(a.actions?.[0]).toMatchObject({ type: "quick", minutes: 15 });
  });

  it("tecnica: trova l'esercizio e chiede gli step", () => {
    const a = answer("come si fa la panca piana?", ctx());
    expect(a.exId).toBe("0025");
    expect(a.showSteps).toBe(true);
  });

  it("carico: usa la progressione reale", () => {
    const a = answer("quanto peso metto di panca?", ctx({ workouts: [wk("2026-08-20", "0025", 80)] }));
    expect(a.text).toContain("82,5");
  });

  it("proteine: usa il peso reale", () => {
    const a = answer("quante proteine devo mangiare?", ctx({ bodyweight: [{ d: "2026-08-20", w: 80 }] }));
    expect(a.text).toContain("128");
    expect(a.text).toContain("176");
  });

  it("calorie con profilo completo: stima il fabbisogno", () => {
    const a = answer(
      "quante calorie devo assumere?",
      ctx({
        bodyweight: [{ d: "2026-08-20", w: 80 }],
        settings: {
          name: "", unit: "kg", restSec: 90, sound: true, wakeLock: true, weighAsk: true,
          height: 180, birthYear: 1990, sex: "m",
        },
      })
    );
    expect(a.text).toContain("kcal");
    expect(a.text).toContain("metabolismo basale");
  });

  it("calorie senza profilo: invita a completarlo", () => {
    const a = answer("che fabbisogno calorico ho?", ctx());
    expect(a.text).toContain("completa il profilo");
    expect(a.actions?.[0]).toMatchObject({ type: "href", href: "/impostazioni" });
  });

  it("fallback con esempi", () => {
    expect(answer("qwertyasdf", ctx()).text).toContain("cosa mi alleno oggi");
  });
});
