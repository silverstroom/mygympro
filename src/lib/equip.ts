import type { ExerciseIndex } from "./types";

export type Equip = "palestra" | "manubri" | "corpo";

/** Corpo libero vero: il tappetino e al massimo una sbarra. */
const NO_KIT = ["body weight"] as const;

/** Con i manubri in casa ci stanno anche elastici e palle. */
const HOME_KIT = [
  ...NO_KIT,
  "rope",
  "dumbbell",
  "kettlebell",
  "weighted",
  "band",
  "resistance band",
  "medicine ball",
  "stability ball",
  "bosu ball",
  "roller",
  "wheel roller",
] as const;

/**
 * null = nessun limite (palestra attrezzata). Negli altri casi l'elenco è
 * chiuso: fuori restano macchine, cavi, bilancieri, sled, cyclette.
 */
export const EQUIP_ALLOWED: Record<Equip, readonly string[] | null> = {
  palestra: null,
  manubri: [...HOME_KIT],
  corpo: [...NO_KIT],
};

export const EQUIP_LABEL: Record<Equip, string> = {
  palestra: "Palestra attrezzata",
  manubri: "Manubri a casa",
  corpo: "Corpo libero",
};

export const EQUIP_SHORT: Record<Equip, string> = {
  palestra: "palestra",
  manubri: "manubri",
  corpo: "corpo libero",
};

export function isEquip(v: unknown): v is Equip {
  return v === "palestra" || v === "manubri" || v === "corpo";
}

export function equipAllows(equip: Equip, equipment: string): boolean {
  const allowed = EQUIP_ALLOWED[equip];
  return !allowed || allowed.includes(equipment);
}

export function exerciseAllowed(equip: Equip, ex: ExerciseIndex): boolean {
  return equipAllows(equip, ex.e);
}

/** Solo gli esercizi compatibili con l'attrezzatura dichiarata. */
export function filterByEquip(index: ExerciseIndex[], equip: Equip): ExerciseIndex[] {
  if (equip === "palestra") return index;
  return index.filter((ex) => equipAllows(equip, ex.e));
}

/** Elenco di esercizi della scheda che a casa non si possono fare. */
export function offEquipExercises(
  exIds: string[],
  index: ExerciseIndex[],
  equip: Equip
): ExerciseIndex[] {
  if (equip === "palestra") return [];
  const byId = new Map(index.map((e) => [e.i, e]));
  const out: ExerciseIndex[] = [];
  for (const id of exIds) {
    if (id.startsWith("c_")) continue;
    const ex = byId.get(id);
    if (ex && !equipAllows(equip, ex.e)) out.push(ex);
  }
  return out;
}

/** Roba che non è un esercizio di forza: non deve mai finire in una scheda. */
export const NOT_AN_EXERCISE =
  /stretch|mobility|circles|warm[- ]?up|foam roll|massage|boxing|hook|jab|uppercut|punch|dance|yoga/i;

/**
 * Equivalenti a corpo libero dei classici da palestra: cercando solo per
 * muscolo bersaglio verrebbero fuori accozzaglie (per i deltoidi il dataset
 * offre boxe e stretching), quindi i cambi più comuni sono scritti a mano.
 */
const BODYWEIGHT_SWAP: { from: RegExp; to: string[] }[] = [
  { from: /overhead press|shoulder press|military|upright row|lateral raise|front raise|rear delt|reverse fly/, to: ["0471", "0259", "0662"] },
  { from: /bench press|chest press|chest fly|pec deck|\bfly\b/, to: ["0662", "3785"] },
  { from: /pulldown|lat pull|pull-?over/, to: ["1326", "0652"] },
  { from: /row/, to: ["3166", "0499", "3158"] },
  { from: /deadlift|good morning|hip thrust|hyperextension|back extension/, to: ["3561", "3523", "3013"] },
  { from: /leg curl/, to: ["3561", "3013"] },
  { from: /leg extension|leg press|hack squat/, to: ["3470", "1460", "1685"] },
  { from: /squat/, to: ["1685", "0513", "3470"] },
  { from: /curl/, to: ["1326", "3158"] },
  { from: /triceps|pushdown|skull|french|\bdip\b/, to: ["0129", "0814", "0259"] },
  { from: /calf raise/, to: ["1373"] },
  { from: /shrug/, to: ["0499", "3166"] },
  { from: /crunch|sit-?up|plank|twist|leg raise/, to: ["0274", "0464", "0687"] },
  { from: /bike|cycle|treadmill|elliptical|stepmill|ergometer|skierg|run|rowing/, to: ["1160", "0630"] },
];

/**
 * Sostituto per un esercizio che con l'attrezzatura dichiarata non si può
 * fare: stesso muscolo bersaglio, stessa zona, attrezzo disponibile.
 */
export function alternativeFor(
  ex: ExerciseIndex,
  index: ExerciseIndex[],
  equip: Equip,
  used: Set<string> = new Set()
): ExerciseIndex | null {
  const pool = index.filter(
    (c) =>
      c.i !== ex.i &&
      !used.has(c.i) &&
      equipAllows(equip, c.e) &&
      !NOT_AN_EXERCISE.test(c.n)
  );

  if (equip === "corpo") {
    const swap = BODYWEIGHT_SWAP.find((r) => r.from.test(ex.n.toLowerCase()));
    if (swap) {
      for (const id of swap.to) {
        const hit = pool.find((c) => c.i === id);
        if (hit) return hit;
      }
    }
  }
  const score = (c: ExerciseIndex) => {
    let n = 0;
    if (c.t === ex.t) n += 100;
    if (c.b === ex.b) n += 40;
    if (c.s.some((m) => ex.s.includes(m))) n += 10;
    if (c.e === "body weight") n += 6;
    if (equip === "manubri" && c.e === "dumbbell") n += 8;
    return n - Math.min(20, c.n.length / 4);
  };
  const consider = (filter: (c: ExerciseIndex) => boolean): ExerciseIndex | null => {
    let best: ExerciseIndex | null = null;
    let bestScore = -Infinity;
    for (const c of pool) {
      if (!filter(c)) continue;
      const sc = score(c);
      if (sc > bestScore) {
        best = c;
        bestScore = sc;
      }
    }
    return best;
  };

  return (
    consider((c) => c.t === ex.t) ??
    consider((c) => c.b === ex.b) ??
    consider((c) => c.s.some((m) => m === ex.t))
  );
}
