import type { CustomExercise, ExerciseIndex, ExMode } from "./types";
import { SEARCH_ALIASES, tBody, tEquip, tTarget } from "./it";

const MEDIA_CDN = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main";

let indexCache: ExerciseIndex[] | null = null;
let indexPromise: Promise<ExerciseIndex[]> | null = null;
const stepsCache = new Map<string, { it: string[]; en: string[] }>();

export function loadIndex(): Promise<ExerciseIndex[]> {
  if (indexCache) return Promise.resolve(indexCache);
  if (!indexPromise) {
    indexPromise = fetch("/data/exercises.json")
      .then((r) => {
        if (!r.ok) throw new Error("index " + r.status);
        return r.json();
      })
      .then((d: ExerciseIndex[]) => {
        indexCache = d;
        return d;
      })
      .catch((e) => {
        indexPromise = null;
        throw e;
      });
  }
  return indexPromise;
}

export function getIndexSync(): ExerciseIndex[] | null {
  return indexCache;
}

export async function loadSteps(id: string): Promise<{ it: string[]; en: string[] }> {
  const hit = stepsCache.get(id);
  if (hit) return hit;
  const r = await fetch(`/data/ex/${id}.json`);
  if (!r.ok) throw new Error("steps " + r.status);
  const d = await r.json();
  stepsCache.set(id, d);
  return d;
}

export function imgUrl(ex: ExerciseIndex): string {
  return `${MEDIA_CDN}/images/${ex.m}.jpg`;
}

export function gifUrl(ex: ExerciseIndex): string {
  return `${MEDIA_CDN}/videos/${ex.m}.gif`;
}

export function customToIndex(c: CustomExercise): ExerciseIndex {
  return { i: c.id, n: c.name, b: c.bodyPart, e: c.equipment, t: c.target, s: [], m: "" };
}

export function resolveEx(
  id: string,
  index: ExerciseIndex[],
  custom: CustomExercise[]
): ExerciseIndex | null {
  if (id.startsWith("c_")) {
    const c = custom.find((x) => x.id === id);
    return c ? customToIndex(c) : null;
  }
  return index.find((e) => e.i === id) ?? null;
}

export function detectMode(ex: ExerciseIndex): ExMode {
  if (ex.b === "cardio") return "cardio";
  if (/\b(plank|hold|wall sit|carry|hang|isometric|superman)\b/i.test(ex.n))
    return "time";
  return "reps";
}

export function isBodyweight(ex: ExerciseIndex): boolean {
  return ex.e === "body weight" || ex.e === "assisted";
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function searchExercises(
  index: ExerciseIndex[],
  custom: CustomExercise[],
  query: string,
  bodyPart: string | null,
  equipment: string | null
): ExerciseIndex[] {
  const all = [...custom.map(customToIndex), ...index];
  const q = norm(query.trim());
  let expanded = q;
  if (q.length >= 3) {
    for (const [alias, target] of SEARCH_ALIASES) {
      if (alias.startsWith(q) || q.startsWith(alias)) {
        expanded = norm(target);
        break;
      }
    }
  }
  const tokens = expanded.split(/\s+/).filter(Boolean);
  const scored: { ex: ExerciseIndex; score: number }[] = [];
  for (const ex of all) {
    if (bodyPart && ex.b !== bodyPart) continue;
    if (equipment && ex.e !== equipment) continue;
    if (!tokens.length) {
      scored.push({ ex, score: 0 });
      continue;
    }
    const hay = norm(
      `${ex.n} ${ex.t} ${ex.b} ${tTarget(ex.t)} ${tBody(ex.b)} ${tEquip(ex.e)}`
    );
    let score = 0;
    let ok = true;
    for (const t of tokens) {
      const idx = hay.indexOf(t);
      if (idx < 0) {
        ok = false;
        break;
      }
      score += idx === 0 || hay[idx - 1] === " " ? 3 : 1;
      if (norm(ex.n).startsWith(t)) score += 4;
    }
    if (ok) scored.push({ ex, score });
  }
  scored.sort((a, b) => b.score - a.score || a.ex.n.localeCompare(b.ex.n));
  return scored.map((s) => s.ex);
}

export function equipmentOptions(
  index: ExerciseIndex[],
  bodyPart: string | null
): string[] {
  const set = new Set<string>();
  for (const ex of index) {
    if (bodyPart && ex.b !== bodyPart) continue;
    set.add(ex.e);
  }
  return [...set].sort((a, b) => tEquip(a).localeCompare(tEquip(b)));
}
