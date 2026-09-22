import { describe, expect, it } from "vitest";
import type { ExerciseIndex } from "./types";
import { alternativeFor, equipAllows, exerciseAllowed, filterByEquip, offEquipExercises } from "./equip";

const ex = (i: string, n: string, e: string, t: string, b: string): ExerciseIndex => ({
  i,
  n,
  b,
  e,
  t,
  s: [],
  m: "",
});

const INDEX = [
  ex("0043", "barbell full squat", "barbell", "glutes", "upper legs"),
  ex("1463", "sled 45° leg press", "sled machine", "glutes", "upper legs"),
  ex("1685", "squat to overhead reach", "body weight", "quads", "upper legs"),
  ex("3470", "forward lunge", "body weight", "glutes", "upper legs"),
  ex("0198", "cable pulldown", "cable", "lats", "back"),
  ex("1326", "chin-up", "body weight", "lats", "back"),
  ex("0294", "dumbbell biceps curl", "dumbbell", "biceps", "upper arms"),
  ex("3168", "bodyweight squatting row", "body weight", "upper back", "back"),
  ex("0129", "bench dip (knees bent)", "body weight", "triceps", "upper arms"),
  ex("0677", "ring dips", "body weight", "triceps", "upper arms"),
  ex("0662", "push-up", "body weight", "pectorals", "chest"),
];

describe("exerciseAllowed", () => {
  it("a corpo libero niente sbarra, panca o anelli anche se il dataset dice body weight", () => {
    expect(exerciseAllowed("corpo", INDEX[5])).toBe(false);
    expect(exerciseAllowed("corpo", INDEX[8])).toBe(false);
    expect(exerciseAllowed("corpo", INDEX[9])).toBe(false);
    expect(exerciseAllowed("corpo", INDEX[10])).toBe(true);
    expect(exerciseAllowed("corpo", INDEX[7])).toBe(true);
  });
  it("con i manubri la sbarra e la panca restano disponibili", () => {
    expect(exerciseAllowed("manubri", INDEX[5])).toBe(true);
    expect(exerciseAllowed("manubri", INDEX[8])).toBe(true);
  });
});

describe("equipAllows", () => {
  it("in palestra passa tutto", () => {
    expect(equipAllows("palestra", "leverage machine")).toBe(true);
  });
  it("a corpo libero niente macchine né bilancieri", () => {
    expect(equipAllows("corpo", "leverage machine")).toBe(false);
    expect(equipAllows("corpo", "barbell")).toBe(false);
    expect(equipAllows("corpo", "dumbbell")).toBe(false);
    expect(equipAllows("corpo", "body weight")).toBe(true);
  });
  it("con i manubri passano manubri, elastici e corpo libero", () => {
    expect(equipAllows("manubri", "dumbbell")).toBe(true);
    expect(equipAllows("manubri", "band")).toBe(true);
    expect(equipAllows("manubri", "cable")).toBe(false);
  });

  it("a corpo libero nemmeno elastici, palle o corde", () => {
    expect(equipAllows("corpo", "band")).toBe(false);
    expect(equipAllows("corpo", "stability ball")).toBe(false);
    expect(equipAllows("corpo", "rope")).toBe(false);
    expect(equipAllows("manubri", "rope")).toBe(true);
  });

  it("il cambio a corpo libero segue il movimento, non solo il muscolo", () => {
    const withSwaps = [
      ...INDEX,
      ex("0471", "handstand push-up", "body weight", "triceps", "upper arms"),
      ex("2271", "left hook. boxing", "body weight", "delts", "shoulders"),
    ];
    const press = ex("0091", "barbell seated overhead press", "barbell", "delts", "shoulders");
    expect(alternativeFor(press, withSwaps, "corpo")?.i).toBe("0471");
  });
});

describe("filterByEquip", () => {
  it("toglie dalla libreria quello che non puoi usare", () => {
    const corpo = filterByEquip(INDEX, "corpo");
    expect(corpo.every((e) => e.e === "body weight")).toBe(true);
    expect(corpo.map((e) => e.i)).not.toContain("1326");
    expect(corpo.map((e) => e.i)).not.toContain("0129");
    expect(filterByEquip(INDEX, "palestra")).toHaveLength(INDEX.length);
  });
});

describe("offEquipExercises", () => {
  it("elenca gli esercizi di una scheda che a casa non si fanno", () => {
    const off = offEquipExercises(["0043", "1685", "0198", "1326"], INDEX, "corpo");
    expect(off.map((e) => e.i)).toEqual(["0043", "0198", "1326"]);
  });
  it("in palestra non segnala nulla", () => {
    expect(offEquipExercises(["0043", "0198"], INDEX, "palestra")).toHaveLength(0);
  });
});

describe("alternativeFor", () => {
  it("sostituisce la lat machine con un rematore a corpo libero, mai con le trazioni", () => {
    const alt = alternativeFor(INDEX[4], INDEX, "corpo");
    expect(alt?.i).toBe("3168");
  });
  it("sostituisce lo squat con bilanciere con un equivalente a corpo libero", () => {
    const alt = alternativeFor(INDEX[0], INDEX, "corpo");
    expect(alt && ["1685", "3470"]).toContain(alt?.i);
  });
  it("non ripropone un esercizio già usato", () => {
    const alt = alternativeFor(INDEX[4], INDEX, "corpo", new Set(["3168"]));
    expect(alt).toBeNull();
  });

  it("scarta stretching e roba che non allena", () => {
    const withJunk = [
      ...INDEX,
      ex("2271", "left hook. boxing", "body weight", "delts", "shoulders"),
      ex("0669", "rear deltoid stretch", "body weight", "delts", "shoulders"),
    ];
    const press = ex("0091", "barbell seated overhead press", "barbell", "delts", "shoulders");
    const alt = alternativeFor(press, withJunk, "corpo");
    expect(alt?.i).not.toBe("2271");
    expect(alt?.i).not.toBe("0669");
  });
});
