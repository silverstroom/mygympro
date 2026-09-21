import type { ExerciseIndex, Routine, RoutineExercise } from "./types";
import { equipAllows, NOT_AN_EXERCISE } from "./equip";
import type { Equip } from "./equip";

export type Goal = "forza" | "massa" | "dimagrimento" | "salute";
export type Level = "principiante" | "intermedio";
export type { Equip };

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

/** Primo id = variante per chi inizia, ultimo = variante per chi si allena già. */
const POOL: Record<Equip, Partial<Record<Slot, string[]>>> = {
  palestra: {
    squat: ["1463", "0043"],
    hinge: ["0085", "0032"],
    pushH: ["0314", "0025"],
    pushV: ["0405", "0091"],
    pullH: ["0861", "0027"],
    pullV: ["0198", "0652"],
    legsIso: ["0585", "0586"],
    biceps: ["0294", "0031"],
    triceps: ["0201", "0814"],
    delts: ["0334", "0178"],
    core: ["0274", "2135"],
    calves: ["0605", "1373"],
    cardio: ["2138"],
  },
  manubri: {
    squat: ["1760", "0413"],
    hinge: ["1459"],
    pushH: ["0289"],
    pushV: ["0405", "0426"],
    pullH: ["0293"],
    pullV: ["0499", "1326"],
    legsIso: ["0431", "0336"],
    biceps: ["0294", "0313"],
    triceps: ["0351"],
    delts: ["0334"],
    core: ["0687", "0464"],
    calves: ["1373", "0409"],
    cardio: ["2612"],
  },
  corpo: {
    squat: ["1685", "0513"],
    hinge: ["3561", "3523"],
    pushH: ["3785", "0662"],
    pushV: ["0259", "0471"],
    pullH: ["3166", "0499"],
    pullV: ["1326", "0652"],
    legsIso: ["3470", "1460"],
    biceps: ["3158", "1326"],
    triceps: ["0129", "0814"],
    delts: ["0662", "0471"],
    core: ["0274", "0464", "0630"],
    calves: ["1373"],
    cardio: ["1160", "0630"],
  },
};

/** Muscoli bersaglio per slot: serve a trovare un rimpiazzo se il pool non basta. */
const SLOT_TARGETS: Record<Slot, string[]> = {
  squat: ["quads", "glutes"],
  hinge: ["glutes", "hamstrings"],
  pushH: ["pectorals"],
  pushV: ["delts", "triceps"],
  pullH: ["upper back", "lats"],
  pullV: ["lats", "upper back"],
  legsIso: ["quads", "hamstrings", "glutes"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  delts: ["delts"],
  core: ["abs"],
  calves: ["calves"],
  cardio: ["cardiovascular system"],
};

const TIMED_NAME = /\b(plank|hold|wall sit|carry|hang|isometric|superman)\b/i;

function isTimed(ex: ExerciseIndex | null, id: string): boolean {
  if (ex) return TIMED_NAME.test(ex.n);
  return id === "2135";
}

function lookup(index: ExerciseIndex[] | null, id: string): ExerciseIndex | null {
  if (!index) return null;
  return index.find((e) => e.i === id) ?? null;
}

/**
 * Scarta gli id che con l'attrezzatura scelta non si possono fare: senza
 * questo controllo una scheda "a corpo libero" finiva piena di macchine.
 */
function usable(
  index: ExerciseIndex[] | null,
  equip: Equip,
  id: string
): boolean {
  if (!index) return true;
  const ex = lookup(index, id);
  if (!ex) return false;
  return equipAllows(equip, ex.e);
}

function fallbackFor(
  slot: Slot,
  equip: Equip,
  index: ExerciseIndex[] | null,
  used: Set<string>
): string | null {
  if (!index) return null;
  const targets = SLOT_TARGETS[slot];
  const candidates = index.filter(
    (ex) =>
      !used.has(ex.i) &&
      equipAllows(equip, ex.e) &&
      targets.includes(ex.t) &&
      !NOT_AN_EXERCISE.test(ex.n)
  );
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.n.length - b.n.length);
  return candidates[0].i;
}

function pick(
  equip: Equip,
  slot: Slot,
  level: Level,
  used: Set<string>,
  index: ExerciseIndex[] | null
): string | null {
  const options = (POOL[equip][slot] ?? []).filter((id) => usable(index, equip, id));
  const ordered = level === "principiante" ? options : [...options].reverse();
  for (const id of ordered) if (!used.has(id)) return id;
  const alt = fallbackFor(slot, equip, index, used);
  if (alt) return alt;
  return options[0] ?? null;
}

function ex(
  id: string,
  scheme: Scheme,
  mode: RoutineExercise["mode"],
  index: ExerciseIndex[] | null
): RoutineExercise {
  const found = lookup(index, id);
  if (mode !== "cardio" && isTimed(found, id)) {
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
  index: ExerciseIndex[] | null,
  used?: Set<string>
): Routine {
  const localUsed = used ?? new Set<string>();
  const exercises: RoutineExercise[] = [];
  for (const [slot, compound] of slots) {
    const id = pick(choices.equip, slot, choices.level, localUsed, index);
    if (!id) continue;
    localUsed.add(id);
    exercises.push(
      ex(id, schemeFor(choices.goal, compound), slot === "cardio" ? "cardio" : "reps", index)
    );
  }
  if (choices.goal === "dimagrimento") {
    const cardio = (POOL[choices.equip].cardio ?? []).find((id) =>
      usable(index, choices.equip, id)
    );
    if (cardio && !exercises.some((e) => e.exId === cardio)) {
      exercises.push(ex(cardio, schemeFor(choices.goal, false), "cardio", index));
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

const EQUIP_WHY: Record<Equip, string> = {
  palestra: "Esercizi scelti tra bilancieri, manubri, cavi e macchine.",
  manubri: "Tutto con manubri, panca e corpo libero: niente macchine.",
  corpo: "Solo corpo libero: nessun attrezzo da palestra, si fa in casa.",
};

export function generatePlan(
  choices: WizardChoices,
  index?: ExerciseIndex[] | null
): GeneratedPlan {
  const { days, level, goal } = choices;
  const idx = index ?? null;
  const routines: Routine[] = [];
  const week: (string | null)[] = [null, null, null, null, null, null, null];

  if (days === 2) {
    routines.push(build("Full Body A", "barbell", FULL_SLOTS, choices, "a", idx));
    routines.push(
      build(
        "Full Body B",
        "lightning",
        [...FULL_SLOTS.slice(0, 4), ["delts", false], ["core", false]],
        choices,
        "b",
        idx
      )
    );
    week[0] = "rw_a";
    week[3] = "rw_b";
  } else if (days === 3 && level === "principiante") {
    routines.push(build("Full Body A", "barbell", FULL_SLOTS, choices, "a", idx));
    routines.push(
      build(
        "Full Body B",
        "lightning",
        [["squat", true], ["pushV", true], ["pullV", true], ["legsIso", false], ["core", false]],
        choices,
        "b",
        idx
      )
    );
    routines.push(
      build(
        "Full Body C",
        "flame",
        [["hinge", true], ["pushH", true], ["pullH", true], ["delts", false], ["core", false]],
        choices,
        "c",
        idx
      )
    );
    week[0] = "rw_a";
    week[2] = "rw_b";
    week[4] = "rw_c";
  } else if (days === 3) {
    routines.push(build("Push", "barbell", PUSH_SLOTS, choices, "a", idx));
    routines.push(build("Pull", "anchor", PULL_SLOTS, choices, "b", idx));
    routines.push(build("Legs", "sneaker", LEG_SLOTS, choices, "c", idx));
    week[0] = "rw_a";
    week[2] = "rw_b";
    week[4] = "rw_c";
  } else if (days === 4) {
    routines.push(build("Upper A", "barbell", UPPER_SLOTS, choices, "a", idx));
    routines.push(build("Lower A", "sneaker", LOWER_SLOTS, choices, "b", idx));
    routines.push(
      build("Upper B", "lightning", [...UPPER_SLOTS.slice(0, 4), ["delts", false]], choices, "c", idx)
    );
    routines.push(
      build(
        "Lower B",
        "flame",
        [["hinge", true], ["squat", true], ["legsIso", false], ["calves", false], ["core", false]],
        choices,
        "d",
        idx
      )
    );
    week[0] = "rw_a";
    week[1] = "rw_b";
    week[3] = "rw_c";
    week[4] = "rw_d";
  } else {
    routines.push(build("Push", "barbell", PUSH_SLOTS, choices, "a", idx));
    routines.push(build("Pull", "anchor", PULL_SLOTS, choices, "b", idx));
    routines.push(build("Legs", "sneaker", LEG_SLOTS, choices, "c", idx));
    routines.push(build("Upper", "lightning", UPPER_SLOTS, choices, "d", idx));
    routines.push(build("Full Body", "flame", FULL_SLOTS, choices, "e", idx));
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
    EQUIP_WHY[choices.equip]
  } ${
    level === "principiante"
      ? "Varianti semplici da imparare bene; la progressione pensa ai carichi."
      : "Varianti più impegnative; i suggerimenti di carico si adattano sessione dopo sessione."
  }`;

  return { routines, week, why };
}
