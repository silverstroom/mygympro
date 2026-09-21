import { describe, expect, it } from "vitest";
import { commitNumeric, parseDraft, sanitizeDraft } from "./numfield";

describe("sanitizeDraft", () => {
  it("tiene solo le cifre", () => {
    expect(sanitizeDraft("8a0")).toBe("80");
    expect(sanitizeDraft("12.5")).toBe("12");
  });
  it("accetta la virgola come separatore decimale", () => {
    expect(sanitizeDraft("72,5", true)).toBe("72.5");
    expect(sanitizeDraft("72.5.3", true)).toBe("72.53");
  });
  it("non tocca il parziale mentre si scrive", () => {
    expect(sanitizeDraft("8")).toBe("8");
    expect(sanitizeDraft("72.", true)).toBe("72.");
  });
});

describe("parseDraft", () => {
  it("restituisce null sui parziali non numerici", () => {
    expect(parseDraft("")).toBeNull();
    expect(parseDraft(".", true)).toBeNull();
  });
  it("arrotonda ai decimali giusti", () => {
    expect(parseDraft("72.567", true)).toBe(72.57);
    expect(parseDraft("12.6")).toBe(12);
  });
});

describe("commitNumeric", () => {
  it("riporta nei limiti solo alla conferma", () => {
    expect(commitNumeric("80", { min: 20, max: 300 })).toBe(80);
    expect(commitNumeric("8", { min: 20, max: 300 })).toBe(20);
    expect(commitNumeric("999", { min: 20, max: 300 })).toBe(300);
  });
  it("torna al valore precedente se il campo resta vuoto", () => {
    expect(commitNumeric("", { min: 20, max: 300, fallback: 74.5, decimal: true })).toBe(74.5);
  });
  it("il caso segnalato: 80 kg resta 80, non 200", () => {
    const typed = ["8", "80"];
    const live = typed.map((t) => parseDraft(t, true));
    expect(live).toEqual([8, 80]);
    expect(commitNumeric(typed[typed.length - 1], { min: 20, max: 300, decimal: true })).toBe(80);
  });
});
