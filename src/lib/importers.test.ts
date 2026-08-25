import { describe, expect, it } from "vitest";
import { createAppleParser, parseActivitiesCsv, parseAppleXml } from "./importers";
import { generatePlan } from "./plangen";
import { nextStep } from "./coach";
import type { AppState } from "./types";
import { todayISO } from "./dates";

const APPLE_XML = `<?xml version="1.0"?>
<HealthData>
 <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Salute" unit="kg" creationDate="2026-08-01 08:00:00 +0200" startDate="2026-08-01 08:00:00 +0200" endDate="2026-08-01 08:00:00 +0200" value="82.4"/>
 <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Salute" unit="kg" startDate="2026-08-03 08:00:00 +0200" endDate="2026-08-03 08:00:00 +0200" value="82.1"/>
 <Record type="HKQuantityTypeIdentifierHeartRate" startDate="2026-08-03 08:00:00 +0200" value="61"/>
 <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="31.5" durationUnit="min" totalEnergyBurned="284" totalEnergyBurnedUnit="kcal" sourceName="Apple Watch" startDate="2026-08-02 18:30:00 +0200" endDate="2026-08-02 19:01:30 +0200"/>
 <Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining" duration="52" durationUnit="min" sourceName="Apple Watch" startDate="2026-08-04 18:00:00 +0200" endDate="2026-08-04 18:52:00 +0200"/>
</HealthData>`;

describe("apple import", () => {
  it("estrae workout e peso", () => {
    const r = parseAppleXml(APPLE_XML);
    expect(r.activities.length).toBe(2);
    expect(r.activities[0]).toMatchObject({ d: "2026-08-02", type: "Corsa", min: 32, kcal: 284, source: "apple" });
    expect(r.activities[1]).toMatchObject({ d: "2026-08-04", type: "Pesi", min: 52 });
    expect(r.bodyweight).toEqual([
      { d: "2026-08-01", w: 82.4 },
      { d: "2026-08-03", w: 82.1 },
    ]);
  });

  it("regge i tag spezzati tra chunk", () => {
    const p = createAppleParser();
    const cut = APPLE_XML.indexOf("HKWorkoutActivityTypeRunning") + 10;
    p.feed(APPLE_XML.slice(0, cut));
    p.feed(APPLE_XML.slice(cut));
    const r = p.finish();
    expect(r.activities.length).toBe(2);
    expect(r.bodyweight.length).toBe(2);
  });

  it("deduplica record identici", () => {
    const r = parseAppleXml(APPLE_XML + APPLE_XML);
    expect(r.activities.length).toBe(2);
    expect(r.bodyweight.length).toBe(2);
  });
});

describe("csv import", () => {
  it("legge il formato Strava", () => {
    const csv = `"Activity Date","Activity Name","Activity Type","Elapsed Time","Distance","Calories"
"2026-08-05 17:12:00","Giro serale","Ride","3600","25.1","540"
"Aug 7, 2026, 6:01:00 PM","Corsetta","Run","1815","5.2","310"`;
    const r = parseActivitiesCsv(csv);
    expect(r.activities.length).toBe(2);
    expect(r.activities[0]).toMatchObject({ d: "2026-08-05", min: 60, kcal: 540 });
    expect(r.activities[1].min).toBe(30);
    expect(r.activities[1].d).toBe("2026-08-07");
  });

  it("legge durate hh:mm:ss e date italiane", () => {
    const csv = `Data;Tipo;Durata;Calorie
25/08/2026;Nuoto;00:45:00;400`;
    const r = parseActivitiesCsv(csv);
    expect(r.activities[0]).toMatchObject({ d: "2026-08-25", type: "Nuoto", min: 45, kcal: 400 });
  });

  it("senza colonne riconoscibili non importa nulla", () => {
    expect(parseActivitiesCsv("a,b\n1,2").activities.length).toBe(0);
  });
});

describe("generatePlan", () => {
  it("3 giorni intermedio = PPL con giorni assegnati", () => {
    const p = generatePlan({ goal: "massa", level: "intermedio", days: 3, equip: "palestra" });
    expect(p.routines.map((r) => r.name)).toEqual(["Push", "Pull", "Legs"]);
    expect(p.week.filter(Boolean).length).toBe(3);
    expect(p.why).toContain("massa");
  });

  it("forza usa serie basse sui fondamentali", () => {
    const p = generatePlan({ goal: "forza", level: "intermedio", days: 3, equip: "palestra" });
    const squat = p.routines[2].exercises[0];
    expect(squat.reps).toBeLessThanOrEqual(6);
    expect(squat.restSec).toBeGreaterThanOrEqual(150);
  });

  it("dimagrimento aggiunge il cardio", () => {
    const p = generatePlan({ goal: "dimagrimento", level: "principiante", days: 2, equip: "corpo" });
    expect(p.routines.every((r) => r.exercises.some((e) => e.mode === "cardio"))).toBe(true);
  });

  it("corpo libero non usa attrezzi da palestra", () => {
    const p = generatePlan({ goal: "salute", level: "principiante", days: 3, equip: "corpo" });
    const gymIds = new Set(["0025", "0043", "0032", "1463", "0198", "0861", "0201", "0605", "0585", "0586"]);
    for (const r of p.routines)
      for (const e of r.exercises) expect(gymIds.has(e.exId)).toBe(false);
  });

  it("ogni scheda ha esercizi e id univoci nel piano", () => {
    for (const days of [2, 3, 4, 5] as const) {
      const p = generatePlan({ goal: "massa", level: "intermedio", days, equip: "manubri" });
      expect(p.routines.length).toBeGreaterThanOrEqual(2);
      for (const r of p.routines) expect(r.exercises.length).toBeGreaterThanOrEqual(4);
      const ids = p.routines.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const rid of p.week) if (rid) expect(ids).toContain(rid);
    }
  });
});

function coachState(over: Partial<AppState>): Parameters<typeof nextStep>[0] {
  return {
    routines: [],
    week: [null, null, null, null, null, null, null],
    overrides: {},
    workouts: [],
    bodyweight: [],
    goalWeight: null,
    active: null,
    settings: {
      name: "",
      unit: "kg",
      restSec: 90,
      sound: true,
      wakeLock: true,
      weighAsk: true,
      height: 180,
      birthYear: 1990,
      sex: "m",
    },
    ...over,
  };
}

describe("coach", () => {
  it("senza piano suggerisce il percorso guidato", () => {
    expect(nextStep(coachState({})).key).toBe("plan");
  });

  it("con sessione aperta suggerisce di riprendere", () => {
    const s = coachState({
      active: { routineId: null, name: "Push", start: 1, cur: 0, entries: [], restUntil: null, restTotal: 0 },
    });
    expect(nextStep(s).key).toBe("resume");
  });

  it("piano pronto ma zero workout: spinge al primo", () => {
    const week: (string | null)[] = [null, null, null, null, null, null, null];
    const s = coachState({
      routines: [{ id: "r1", name: "A", icon: "barbell", exercises: [] }],
      week,
    });
    expect(nextStep(s).key).toBe("first-rest");
  });

  it("dopo il primo workout chiede il peso", () => {
    const s = coachState({
      routines: [{ id: "r1", name: "A", icon: "barbell", exercises: [] }],
      workouts: [{ id: "w", d: todayISO(), name: "A", routineId: "r1", start: 1, end: 2, entries: [] }],
    });
    expect(nextStep(s).key).toBe("bw");
  });

  it("con profilo incompleto propone di completarlo", () => {
    const s = coachState({
      routines: [{ id: "r1", name: "A", icon: "barbell", exercises: [] }],
      workouts: [{ id: "w", d: todayISO(), name: "A", routineId: "r1", start: 1, end: 2, entries: [] }],
    });
    s.settings = { ...s.settings, birthYear: null };
    expect(nextStep(s).key).toBe("profile");
    s.settings = { ...s.settings, birthYear: 1990, height: null };
    expect(nextStep(s).key).toBe("profile");
  });

  it("agli ospiti non chiede il profilo", () => {
    const s = coachState({
      routines: [{ id: "r1", name: "A", icon: "barbell", exercises: [] }],
      workouts: [{ id: "w", d: todayISO(), name: "A", routineId: "r1", start: 1, end: 2, entries: [] }],
    });
    s.settings = { ...s.settings, birthYear: null, height: null };
    expect(nextStep(s, { guest: true }).key).toBe("bw");
  });
});
