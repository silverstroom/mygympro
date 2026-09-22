import type { ExerciseIndex } from "./types";

export type Equip = "palestra" | "manubri" | "corpo";

const NO_KIT = ["body weight"] as const;

const NEEDS_KIT =
  /\b(bars?|pull[- ]?ups?|chin[- ]?ups?|chins?|dips?|bench(?:es)?|box|rings?|hanging|hang|suspended|suspension|trx|parallel|rope|ball|band|sled|chair|step|machine|cable|kettlebell|dumbbell|plate|wheel|roller|ladder|rack|towel|slide|assisted|elevated|ergometer|bike|hurdle|cone|bosu|tire|inverted|muscle[- ]?ups?|lever|planche|straps?|platform|cage|swiss|medicine|stability|incline|decline|staircase|equipment|support|glute-ham|balance board|skin the cat|elevator|flag|maltese|gorilla|stalder|swing 360|hyperextension)\b/i;

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
  if (!equipAllows(equip, ex.e)) return false;
  return equip !== "corpo" || !NEEDS_KIT.test(ex.n);
}

export function filterByEquip(index: ExerciseIndex[], equip: Equip): ExerciseIndex[] {
  if (equip === "palestra") return index;
  return index.filter((ex) => exerciseAllowed(equip, ex));
}

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
    if (ex && !exerciseAllowed(equip, ex)) out.push(ex);
  }
  return out;
}

export const NOT_AN_EXERCISE =
  /stretch|mobility|circles|warm[- ]?up|foam roll|massage|boxing|hook|jab|uppercut|punch|dance|yoga/i;

const BODYWEIGHT_SWAP: { from: RegExp; to: string[] }[] = [
  { from: /overhead press|shoulder press|military|upright row|lateral raise|front raise|rear delt|reverse fly/, to: ["0259", "0699", "0471"] },
  { from: /bench press|chest press|chest fly|pec deck|\bfly\b/, to: ["0662", "1311"] },
  { from: /pulldown|lat pull|pull-?over/, to: ["3168", "3166"] },
  { from: /row/, to: ["3166", "1772", "3158"] },
  { from: /deadlift|good morning|hip thrust|hyperextension|back extension/, to: ["3013", "3561", "3645"] },
  { from: /leg curl/, to: ["0795", "3013"] },
  { from: /leg extension|leg press|hack squat/, to: ["3470", "1460", "1685"] },
  { from: /squat/, to: ["1685", "2368", "3470"] },
  { from: /curl/, to: ["3158", "1770"] },
  { from: /triceps|pushdown|skull|french|\bdip\b/, to: ["0283", "1771", "0259"] },
  { from: /calf raise/, to: ["1373", "1387"] },
  { from: /shrug/, to: ["3166", "1772"] },
  { from: /crunch|sit-?up|plank|twist|leg raise/, to: ["0274", "0464", "0687"] },
  { from: /bike|cycle|treadmill|elliptical|stepmill|ergometer|skierg|run|rowing/, to: ["1160", "0630"] },
];

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
      exerciseAllowed(equip, c) &&
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
