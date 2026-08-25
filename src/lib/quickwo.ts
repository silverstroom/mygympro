import type { RoutineExercise } from "./types";
import type { Equip } from "./plangen";

interface QuickPlan {
  name: string;
  exercises: RoutineExercise[];
  note: string;
}

const ORDER: { id: Record<Equip, string>; compound: boolean }[] = [
  { id: { palestra: "0043", manubri: "1760", corpo: "1685" }, compound: true },
  { id: { palestra: "0025", manubri: "0289", corpo: "0662" }, compound: true },
  { id: { palestra: "0861", manubri: "0293", corpo: "0499" }, compound: true },
  { id: { palestra: "0085", manubri: "1459", corpo: "3561" }, compound: true },
  { id: { palestra: "0405", manubri: "0426", corpo: "0259" }, compound: true },
  { id: { palestra: "0334", manubri: "0334", corpo: "3470" }, compound: false },
  { id: { palestra: "0201", manubri: "0294", corpo: "0129" }, compound: false },
  { id: { palestra: "2135", manubri: "2135", corpo: "2135" }, compound: false },
];

const SET_SECONDS = 42;

export function generateQuickWorkout(minutes: number, equip: Equip): QuickPlan {
  const circuit = minutes <= 20;
  const sets = circuit ? 2 : 3;
  const restCompound = circuit ? 40 : 60;
  const restIso = circuit ? 30 : 45;
  let budget = minutes * 60 - 60;
  const exercises: RoutineExercise[] = [];

  for (const slot of ORDER) {
    const rest = slot.compound ? restCompound : restIso;
    const exId = slot.id[equip];
    if (exId === "2135") {
      const cost = sets * (40 + restIso);
      if (budget < cost) break;
      budget -= cost;
      exercises.push({
        exId,
        sets,
        reps: 0,
        restSec: restIso,
        mode: "time",
        sec: 35,
        k: "q" + exId,
      });
      continue;
    }
    const cost = sets * (SET_SECONDS + rest);
    if (budget < cost) break;
    budget -= cost;
    if (exercises.some((e) => e.exId === exId)) continue;
    exercises.push({
      exId,
      sets,
      reps: circuit ? 12 : 10,
      restSec: rest,
      mode: "reps",
      k: "q" + exId,
    });
  }

  return {
    name: `Lampo ${minutes}'`,
    exercises,
    note: circuit
      ? "Ritmo da circuito: recuperi corti, tecnica pulita, niente cellulare tra le serie."
      : "Fondamentali prima, isolamento se avanza tempo: il cronometro è parte dell'allenamento.",
  };
}
