import { describe, expect, it } from "vitest";
import { activityFactor, ageFrom, bmr, goalCalories, tdee } from "./health";

describe("ageFrom", () => {
  it("calcola l'età dall'anno di nascita", () => {
    expect(ageFrom(1990, 2026)).toBe(36);
  });
  it("scarta valori assurdi", () => {
    expect(ageFrom(2025, 2026)).toBeNull();
    expect(ageFrom(1890, 2026)).toBeNull();
    expect(ageFrom(null, 2026)).toBeNull();
    expect(ageFrom(undefined, 2026)).toBeNull();
  });
});

describe("bmr (Mifflin-St Jeor)", () => {
  it("uomo 30 anni, 180 cm, 80 kg", () => {
    expect(bmr("m", 30, 180, 80)).toBe(1780);
  });
  it("donna 25 anni, 165 cm, 60 kg", () => {
    expect(bmr("f", 25, 165, 60)).toBe(1345);
  });
  it("sesso non indicato usa la media delle due formule", () => {
    expect(bmr(null, 30, 180, 80)).toBe(1697);
  });
  it("null se mancano dati o non plausibili", () => {
    expect(bmr("m", null, 180, 80)).toBeNull();
    expect(bmr("m", 30, null, 80)).toBeNull();
    expect(bmr("m", 30, 100, 80)).toBeNull();
    expect(bmr("m", 30, 180, null)).toBeNull();
    expect(bmr("m", 30, 180, 0)).toBeNull();
  });
});

describe("tdee", () => {
  it("scala il BMR col fattore attività", () => {
    expect(activityFactor(0)).toBe(1.2);
    expect(activityFactor(2)).toBe(1.375);
    expect(activityFactor(4)).toBe(1.55);
    expect(activityFactor(6)).toBe(1.725);
    expect(tdee(1780, 3)).toBe(2759);
  });
  it("null senza BMR", () => {
    expect(tdee(null, 3)).toBeNull();
  });
});

describe("goalCalories", () => {
  it("deficit per dimagrimento, surplus per massa", () => {
    expect(goalCalories(2759, "dimagrimento")).toBe(2359);
    expect(goalCalories(2759, "massa")).toBe(3059);
    expect(goalCalories(2759, "forza")).toBe(2759);
    expect(goalCalories(2759, undefined)).toBe(2759);
    expect(goalCalories(null, "massa")).toBeNull();
  });
});
