import { describe, expect, it } from "vitest";
import type { PlanDraft } from "./plandraft";
import { shouldRestore } from "./plandraft";

const draft: PlanDraft = {
  at: 1_000_000,
  fromId: "ospite1",
  routines: [{ id: "rw_a", name: "Full Body A", icon: "barbell", exercises: [] }],
  week: ["rw_a", null, null, null, null, null, null],
  equip: "corpo",
};

const base = {
  accountId: "nuovo",
  accountCreated: 1_000_500,
  routines: 0,
  onboarded: false,
  demo: false,
  now: 1_060_000,
};

describe("shouldRestore", () => {
  it("recupera la scheda su un account creato subito dopo il percorso guidato", () => {
    expect(shouldRestore(draft, base)).toBe(true);
  });

  it("non tocca un account che ha già schede", () => {
    expect(shouldRestore(draft, { ...base, routines: 3 })).toBe(false);
  });

  it("non tocca chi ha già fatto l'onboarding", () => {
    expect(shouldRestore(draft, { ...base, onboarded: true })).toBe(false);
  });

  it("non si applica a un account più vecchio della scheda", () => {
    expect(shouldRestore(draft, { ...base, accountCreated: 500_000 })).toBe(false);
  });

  it("scade dopo due giorni", () => {
    expect(shouldRestore(draft, { ...base, now: 1_000_000 + 49 * 3600 * 1000 })).toBe(false);
  });

  it("non ripropone la scheda a chi l'ha già creata", () => {
    expect(shouldRestore(draft, { ...base, accountId: "ospite1" })).toBe(false);
  });

  it("senza bozza non fa nulla", () => {
    expect(shouldRestore(null, base)).toBe(false);
  });
});
