import { describe, expect, it } from "vitest";
import { cuesFor } from "./cues";

const ex = (n: string, t = "quads", e = "body weight", b = "upper legs") => ({ n, t, e, b });

describe("cuesFor", () => {
  it("dà sempre qualcosa da curare e qualcosa da evitare", () => {
    const c = cuesFor(ex("cable kickback"));
    expect(c.watch.length).toBeGreaterThan(0);
    expect(c.avoid.length).toBeGreaterThan(0);
  });

  it("riconosce lo squat e avverte sulle ginocchia", () => {
    const c = cuesFor(ex("barbell full squat", "glutes", "barbell"));
    expect(c.source).toBe("specifica");
    expect(c.avoid.join(" ")).toMatch(/ginocchi/i);
  });

  it("sullo stacco parla di schiena", () => {
    const c = cuesFor(ex("barbell deadlift", "glutes", "barbell"));
    expect(c.avoid.join(" ")).toMatch(/schiena/i);
  });

  it("la leg press non finisce nella regola dello squat", () => {
    const c = cuesFor(ex("sled 45° leg press", "glutes", "sled machine"));
    expect(c.watch.join(" ")).toMatch(/schienale/i);
  });

  it("aggiunge la nota sull'attrezzo", () => {
    const c = cuesFor(ex("barbell bench press", "pectorals", "barbell", "chest"));
    expect(c.watch.join(" ")).toMatch(/fermi/i);
  });

  it("dichiara quando il consiglio è generale", () => {
    const c = cuesFor(ex("smith reverse calf raises", "calves", "smith machine", "lower legs"));
    expect(["specifica", "generale"]).toContain(c.source);
  });

  it("per il plank parla di bacino in linea", () => {
    const c = cuesFor(ex("front plank with twist", "abs", "body weight", "waist"));
    expect(c.watch.join(" ")).toMatch(/bacino/i);
  });

  it("non ripete la stessa riga due volte", () => {
    const c = cuesFor(ex("dumbbell biceps curl", "biceps", "dumbbell", "upper arms"));
    expect(new Set(c.watch).size).toBe(c.watch.length);
  });
});
