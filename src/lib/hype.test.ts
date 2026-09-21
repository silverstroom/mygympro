import { beforeEach, describe, expect, it } from "vitest";
import { encourageSet, resetHypeMemory } from "./hype";

const base = {
  mode: "reps" as const,
  setIdx: 0,
  setCount: 3,
  doneSets: 1,
  totalSets: 9,
  lastOfExercise: false,
};

describe("encourageSet", () => {
  beforeEach(resetHypeMemory);

  it("dà sempre una frase, anche a corpo libero e senza carico", () => {
    const line = encourageSet({ ...base, weight: 0, reps: 12, bodyweight: true });
    expect(line.text.length).toBeGreaterThan(3);
  });

  it("non parla di corpo libero se l'esercizio è con i pesi", () => {
    for (let i = 0; i < 6; i++) {
      const line = encourageSet({ ...base, weight: 0, reps: 10, bodyweight: false });
      expect(line.text).not.toMatch(/attrezzi|gravità|bilanciere è il tuo/i);
    }
  });

  it("celebra il record personale", () => {
    const line = encourageSet({ ...base, weight: 40, reps: 8, isPR: true });
    expect(line.tone).toBe("pr");
  });

  it("riconosce la serie che chiude l'esercizio", () => {
    const line = encourageSet({ ...base, weight: 20, reps: 10, lastOfExercise: true });
    expect(line.text).toMatch(/esercizio/i);
  });

  it("non ripete la stessa frase due volte di fila", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      seen.add(encourageSet({ ...base, weight: 20, reps: 10, doneSets: i + 1 }).text);
    }
    expect(seen.size).toBeGreaterThan(3);
  });

  it("tiene le frasi da carico pesante per i carichi pesanti", () => {
    const line = encourageSet({ ...base, weight: 100, reps: 5 });
    expect(line.tone).toBe("fire");
  });
});
