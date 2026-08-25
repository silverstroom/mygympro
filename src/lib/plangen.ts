import type { Routine, RoutineExercise } from "./types";

export type Goal = "forza" | "massa" | "dimagrimento" | "salute";
export type Level = "principiante" | "intermedio";
export type Equip = "palestra" | "manubri" | "corpo";

export interface WizardChoices {
  goal: Goal;
  level: Level;
  days: 2 | 3 | 4 | 5;
  equip: Equip;
}

export interface GeneratedPlan {
  routines: Routine[];
  week: (string | null)[];
  why: string;
}

interface Scheme {
  sets: number;
  reps: number;
  rest: number;
}

function schemeFor(goal: Goal, compound: boolean): Scheme {
  switch (goal) {
    case "forza":
      return compound ? { sets: 4, reps: 5, rest: 180 } : { sets: 3, reps: 8, rest: 120 };
    case "massa":
      return compound ? { sets: 4, reps: 8, rest: 120 } : { sets: 3, reps: 12, rest: 90 };
    case "dimagrimento":
      return compound ? { sets: 3, reps: 12, rest: 75 } : { sets: 3, reps: 15, rest: 60 };
    case "salute":
      return compound ? { sets: 3, reps: 10, rest: 90 } : { sets: 3, reps: 12, rest: 75 };
  }
}

type Slot =
  | "squat"
  | "hinge"
  | "pushH"
  | "pushV"
  | "pullH"
  | "pullV"
  | "legsIso"
  | "biceps"
  | "triceps"
  | "delts"
  | "core"
  | "calves"
  | "cardio";

const POOL: Record<Equip, Partial<Record<Slot, string[]>>> = {
  palestra: {
    squat: ["0043", "1463"],
    hinge: ["0032", "0085"],
    pushH: ["0025", "0314"],
    pushV: ["0405", "0091"],
    pullH: ["0861", "0027"],
    pullV: ["0198", "0652"],
    legsIso: ["0586", "0585"],
    biceps: ["0294", "0031"],
    triceps: ["0201", "0814"],
    delts: ["0334", "0178"],
    core: ["2135", "0274"],
    calves: ["0605", "1373"],
    cardio: ["2138"],
  },
  manubri: {
    squat: ["1760", "0413"],
    hinge: ["1459"],
    pushH: ["0289"],
    pushV: ["0426", "0405"],
    pullH: ["0293"],
    pullV: ["1326", "0499"],
    legsIso: ["0431", "0336"],
    biceps: ["0294", "0313"],
    triceps: ["0351"],
    delts: ["0334"],
    core: ["2135", "0687"],
    calves: ["1373"],
    cardio: ["2612"],
  },
  corpo: {
    squat: ["1685", "0513"],
    hinge: ["3561", "3523"],
    pushH: ["0662", "3785"],
    pushV: ["0259"],
    pullH: ["0499", "2298"],
    pullV: ["0652", "1326"],
    legsIso: ["3470", "1460"],
    biceps: ["1326"],
    triceps: ["0129", "0814"],
    delts: ["0662"],
    core: ["2135", "0630", "0274"],
    calves: ["1373"],
    cardio: ["1160", "2612"],
  },
};

function pick(equip: Equip, slot: Slot, level: Level, used: Set<string>): string | null {
  const options = POOL[equip][slot];
  if (!options?.length) return null;
  const ordered = level === "principiante" ? options : [...options].reverse();
  for (const id of ordered) if (!used.has(id)) return id;
  return options[0];
}

function ex(
  id: string,
  scheme: Scheme,
  mode: RoutineExercise["mode"] = "reps"
): RoutineExercise {
  if (id === "2135") {
    return { exId: id, sets: 3, reps: 0, restSec: 60, mode: "time", sec: 40, k: id + "k" };
  }
  if (mode === "cardio") {
    return { exId: id, sets: 1, reps: 0, restSec: 60, mode: "cardio", min: 12, speed: 8, k: id + "k" };
  }
  return { exId: id, sets: scheme.sets, reps: scheme.reps, restSec: scheme.rest, mode, k: id + "k" };
}

function build(
  name: string,
  icon: string,
  slots: [Slot, boolean][],
  choices: WizardChoices,
  idSuffix: string,
  used?: Set<string>
): Routine {
  const localUsed = used ?? new Set<string>();
  const exercises: RoutineExercise[] = [];
  for (const [slot, compound] of slots) {
    const id = pick(choices.equip, slot, choices.level, localUsed);
    if (!id) continue;
    localUsed.add(id);
    exercises.push(ex(id, schemeFor(choices.goal, compound), slot === "cardio" ? "cardio" : "reps"));
  }
  if (choices.goal === "dimagrimento") {
    const cardio = POOL[choices.equip].cardio?.[0];
    if (cardio && !exercises.some((e) => e.exId === cardio)) {
      exercises.push(ex(cardio, schemeFor(choices.goal, false), "cardio"));
    }
  }
  return { id: "rw_" + idSuffix, name, icon, exercises };
}

const FULL_SLOTS: [Slot, boolean][] = [
  ["squat", true],
  ["pushH", true],
  ["pullH", true],
  ["hinge", true],
  ["core", false],
];

const UPPER_SLOTS: [Slot, boolean][] = [
  ["pushH", true],
  ["pullH", true],
  ["pushV", true],
  ["pullV", true],
  ["biceps", false],
  ["triceps", false],
];

const LOWER_SLOTS: [Slot, boolean][] = [
  ["squat", true],
  ["hinge", true],
  ["legsIso", false],
  ["calves", false],
  ["core", false],
];

const PUSH_SLOTS: [Slot, boolean][] = [
  ["pushH", true],
  ["pushV", true],
  ["delts", false],
  ["triceps", false],
];

const PULL_SLOTS: [Slot, boolean][] = [
  ["hinge", true],
  ["pullV", true],
  ["pullH", true],
  ["biceps", false],
];

const LEG_SLOTS: [Slot, boolean][] = [
  ["squat", true],
  ["legsIso", false],
  ["calves", false],
  ["core", false],
];

const GOAL_LABEL: Record<Goal, string> = {
  forza: "forza",
  massa: "massa muscolare",
  dimagrimento: "dimagrimento",
  salute: "forma e salute",
};

export function generatePlan(choices: WizardChoices): GeneratedPlan {
  const { days, level, goal } = choices;
  const routines: Routine[] = [];
  const week: (string | null)[] = [null, null, null, null, null, null, null];

  if (days === 2) {
    routines.push(build("Full Body A", "barbell", FULL_SLOTS, choices, "a"));
    routines.push(build("Full Body B", "lightning", [...FULL_SLOTS.slice(0, 4), ["delts", false], ["core", false]], choices, "b"));
    week[0] = "rw_a";
    week[3] = "rw_b";
  } else if (days === 3 && level === "principiante") {
    routines.push(build("Full Body A", "barbell", FULL_SLOTS, choices, "a"));
    routines.push(build("Full Body B", "lightning", [["squat", true], ["pushV", true], ["pullV", true], ["legsIso", false], ["core", false]], choices, "b"));
    routines.push(build("Full Body C", "flame", [["hinge", true], ["pushH", true], ["pullH", true], ["delts", false], ["core", false]], choices, "c"));
    week[0] = "rw_a";
    week[2] = "rw_b";
    week[4] = "rw_c";
  } else if (days === 3) {
    routines.push(build("Push", "barbell", PUSH_SLOTS, choices, "a"));
    routines.push(build("Pull", "anchor", PULL_SLOTS, choices, "b"));
    routines.push(build("Legs", "sneaker", LEG_SLOTS, choices, "c"));
    week[0] = "rw_a";
    week[2] = "rw_b";
    week[4] = "rw_c";
  } else if (days === 4) {
    routines.push(build("Upper A", "barbell", UPPER_SLOTS, choices, "a"));
    routines.push(build("Lower A", "sneaker", LOWER_SLOTS, choices, "b"));
    routines.push(build("Upper B", "lightning", [...UPPER_SLOTS.slice(0, 4), ["delts", false]], choices, "c"));
    routines.push(build("Lower B", "flame", [["hinge", true], ["squat", true], ["legsIso", false], ["calves", false], ["core", false]], choices, "d"));
    week[0] = "rw_a";
    week[1] = "rw_b";
    week[3] = "rw_c";
    week[4] = "rw_d";
  } else {
    routines.push(build("Push", "barbell", PUSH_SLOTS, choices, "a"));
    routines.push(build("Pull", "anchor", PULL_SLOTS, choices, "b"));
    routines.push(build("Legs", "sneaker", LEG_SLOTS, choices, "c"));
    routines.push(build("Upper", "lightning", UPPER_SLOTS, choices, "d"));
    routines.push(build("Full Body", "flame", FULL_SLOTS, choices, "e"));
    week[0] = "rw_a";
    week[1] = "rw_b";
    week[2] = "rw_c";
    week[4] = "rw_d";
    week[5] = "rw_e";
  }

  const split =
    days === 2
      ? "due sedute full body"
      : days === 3 && level === "principiante"
        ? "tre sedute full body"
        : days === 3
          ? "uno split Push / Pull / Legs"
          : days === 4
            ? "uno split Upper / Lower"
            : "Push / Pull / Legs più due richiami";

  const schemeTxt =
    goal === "forza"
      ? "serie basse e recuperi lunghi sui fondamentali"
      : goal === "massa"
        ? "volume medio-alto tra 8 e 12 ripetizioni"
        : goal === "dimagrimento"
          ? "ripetizioni alte, recuperi corti e un finale cardio"
          : "carichi gestibili e tecnica pulita";

  const why = `Obiettivo ${GOAL_LABEL[goal]} su ${days} giorni: ${split}, con ${schemeTxt}. ${
    level === "principiante"
      ? "Varianti semplici da imparare bene; la progressione pensa ai carichi."
      : "Varianti più impegnative; i suggerimenti di carico si adattano sessione dopo sessione."
  }`;

  return { routines, week, why };
}
