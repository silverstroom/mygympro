import { describe, expect, it } from "vitest";
import type { ExerciseIndex } from "./types";
import { generatePlan } from "./plangen";
import { equipAllows } from "./equip";

const ex = (i: string, n: string, e: string, t: string, b = "upper legs"): ExerciseIndex => ({
  i,
  n,
  b,
  e,
  t,
  s: [],
  m: "",
});

/** Indice ridotto ma realistico: corpo libero, manubri e qualche macchina. */
const INDEX: ExerciseIndex[] = [
  ex("1685", "squat to overhead reach", "body weight", "quads"),
  ex("0513", "jump squat v. 2", "body weight", "glutes"),
  ex("3561", "glute bridge march", "body weight", "glutes"),
  ex("3523", "glute bridge two legs on bench", "body weight", "glutes"),
  ex("3785", "incline push-up (on box)", "body weight", "pectorals", "chest"),
  ex("0662", "push-up", "body weight", "pectorals", "chest"),
  ex("0259", "close-grip push-up", "body weight", "triceps", "upper arms"),
  ex("0471", "handstand push-up", "body weight", "triceps", "upper arms"),
  ex("3166", "bodyweight standing row", "body weight", "upper back", "back"),
  ex("0499", "inverted row", "body weight", "upper back", "back"),
  ex("3158", "bodyweight standing close-grip row", "body weight", "upper back", "back"),
  ex("1326", "chin-up", "body weight", "lats", "back"),
  ex("0652", "pull-up", "body weight", "lats", "back"),
  ex("3470", "forward lunge", "body weight", "glutes"),
  ex("1460", "walking lunge", "body weight", "glutes"),
  ex("0129", "bench dip (knees bent)", "body weight", "triceps", "upper arms"),
  ex("0814", "triceps dip", "body weight", "triceps", "upper arms"),
  ex("0274", "crunch floor", "body weight", "abs", "waist"),
  ex("0464", "front plank with twist", "body weight", "abs", "waist"),
  ex("0630", "mountain climber", "body weight", "cardiovascular system", "cardio"),
  ex("1373", "bodyweight standing calf raise", "body weight", "calves", "lower legs"),
  ex("1160", "burpee", "body weight", "cardiovascular system", "cardio"),
  ex("2612", "jump rope", "rope", "cardiovascular system", "cardio"),
  ex("0687", "russian twist", "body weight", "abs", "waist"),
  // manubri
  ex("1760", "dumbbell goblet squat", "dumbbell", "quads"),
  ex("0413", "dumbbell squat", "dumbbell", "glutes"),
  ex("1459", "dumbbell romanian deadlift", "dumbbell", "glutes"),
  ex("0289", "dumbbell bench press", "dumbbell", "pectorals", "chest"),
  ex("0405", "dumbbell seated shoulder press", "dumbbell", "delts", "shoulders"),
  ex("0426", "dumbbell standing overhead press", "dumbbell", "delts", "shoulders"),
  ex("0293", "dumbbell bent over row", "dumbbell", "upper back", "back"),
  ex("0431", "dumbbell step-up", "dumbbell", "glutes"),
  ex("0336", "dumbbell lunge", "dumbbell", "glutes"),
  ex("0294", "dumbbell biceps curl", "dumbbell", "biceps", "upper arms"),
  ex("0313", "dumbbell hammer curl", "dumbbell", "biceps", "upper arms"),
  ex("0351", "dumbbell lying triceps extension", "dumbbell", "triceps", "upper arms"),
  ex("0334", "dumbbell lateral raise", "dumbbell", "delts", "shoulders"),
  ex("0409", "dumbbell single leg calf raise", "dumbbell", "calves", "lower legs"),
  // roba da palestra, non deve finire nelle schede di casa
  ex("1463", "sled 45° leg press", "sled machine", "glutes"),
  ex("0043", "barbell full squat", "barbell", "glutes"),
  ex("0085", "barbell romanian deadlift", "barbell", "glutes"),
  ex("0032", "barbell deadlift", "barbell", "glutes"),
  ex("0314", "dumbbell incline bench press", "dumbbell", "pectorals", "chest"),
  ex("0025", "barbell bench press", "barbell", "pectorals", "chest"),
  ex("0091", "barbell seated overhead press", "barbell", "delts", "shoulders"),
  ex("0861", "cable seated row", "cable", "upper back", "back"),
  ex("0027", "barbell bent over row", "barbell", "upper back", "back"),
  ex("0198", "cable pulldown", "cable", "lats", "back"),
  ex("0585", "lever leg extension", "leverage machine", "quads"),
  ex("0586", "lever lying leg curl", "leverage machine", "hamstrings"),
  ex("0031", "barbell curl", "barbell", "biceps", "upper arms"),
  ex("0201", "cable pushdown", "cable", "triceps", "upper arms"),
  ex("0178", "cable lateral raise", "cable", "delts", "shoulders"),
  ex("2135", "weighted front plank", "weighted", "abs", "waist"),
  ex("0605", "lever standing calf raise", "leverage machine", "calves", "lower legs"),
  ex("2138", "stationary bike run", "stationary bike", "cardiovascular system", "cardio"),
];

const byId = new Map(INDEX.map((e) => [e.i, e]));
const goals = ["massa", "forza", "dimagrimento", "salute"] as const;
const levels = ["principiante", "intermedio"] as const;
const days = [2, 3, 4, 5] as const;

describe("generatePlan e attrezzatura", () => {
  it("a corpo libero non propone mai macchine o bilancieri", () => {
    for (const goal of goals)
      for (const level of levels)
        for (const d of days) {
          const plan = generatePlan({ goal, level, days: d, equip: "corpo" }, INDEX);
          for (const r of plan.routines)
            for (const e of r.exercises) {
              const found = byId.get(e.exId);
              expect(found, `${e.exId} non è nell'indice`).toBeDefined();
              expect(
                equipAllows("corpo", found!.e),
                `${found!.n} (${found!.e}) non si fa a casa`
              ).toBe(true);
            }
        }
  });

  it("con i soli manubri resta su manubri e corpo libero", () => {
    for (const d of days) {
      const plan = generatePlan({ goal: "massa", level: "intermedio", days: d, equip: "manubri" }, INDEX);
      for (const r of plan.routines)
        for (const e of r.exercises) {
          const found = byId.get(e.exId)!;
          expect(equipAllows("manubri", found.e), `${found.n} (${found.e})`).toBe(true);
        }
    }
  });

  it("in palestra usa anche macchine e bilancieri", () => {
    const plan = generatePlan({ goal: "massa", level: "intermedio", days: 4, equip: "palestra" }, INDEX);
    const equips = plan.routines.flatMap((r) =>
      r.exercises.map((e) => byId.get(e.exId)!.e)
    );
    expect(equips.some((e) => e === "barbell" || e === "cable" || e === "leverage machine")).toBe(true);
  });

  it("riempie comunque tutte le sedute", () => {
    for (const d of days) {
      const plan = generatePlan({ goal: "salute", level: "principiante", days: d, equip: "corpo" }, INDEX);
      expect(plan.routines.length).toBeGreaterThan(0);
      for (const r of plan.routines) expect(r.exercises.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("i plank finiscono in modalità a tempo", () => {
    const plan = generatePlan({ goal: "massa", level: "intermedio", days: 2, equip: "corpo" }, INDEX);
    const plank = plan.routines.flatMap((r) => r.exercises).find((e) => e.exId === "0464");
    if (plank) expect(plank.mode).toBe("time");
  });

  it("spiega nel riassunto con che attrezzatura è stata costruita", () => {
    const plan = generatePlan({ goal: "massa", level: "principiante", days: 3, equip: "corpo" }, INDEX);
    expect(plan.why).toMatch(/corpo libero/i);
  });
});
