import type { Suggestion, Workout, SetLog } from "./types";
import { fmtNum } from "./dates";

const STEP = 2.5;

function roundStep(w: number): number {
  return Math.round(w / STEP) * STEP;
}

interface Cfg {
  targetReps: number;
  bodyweight: boolean;
}

interface PastEntry {
  d: string;
  sets: SetLog[];
}

function lastEntries(history: Workout[], exId: string, n: number): PastEntry[] {
  const out: PastEntry[] = [];
  const sorted = [...history].sort((a, b) => (a.d > b.d ? -1 : 1));
  for (const w of sorted) {
    for (const en of w.entries) {
      if (en.exId === exId && en.sets.some((s) => s.done)) {
        out.push({ d: w.d, sets: en.sets });
        break;
      }
    }
    if (out.length >= n) break;
  }
  return out;
}

function allClosed(sets: SetLog[], targetReps: number): boolean {
  const doneSets = sets.filter((s) => s.done);
  if (!doneSets.length) return false;
  return sets.every((s) => s.done && (s.r ?? 0) >= targetReps);
}

function topWeight(sets: SetLog[]): number {
  return sets.reduce((m, s) => (s.done && (s.w ?? 0) > m ? (s.w as number) : m), 0);
}

function topReps(sets: SetLog[]): number {
  return sets.reduce((m, s) => (s.done && (s.r ?? 0) > m ? (s.r as number) : m), 0);
}

function avgRir(sets: SetLog[]): number | null {
  const vals = sets.filter((s) => s.done && s.rir != null).map((s) => s.rir as number);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function suggestFor(
  exId: string,
  history: Workout[],
  cfg: Cfg
): Suggestion {
  const past = lastEntries(history, exId, 2);

  if (!past.length) {
    return cfg.bodyweight
      ? {
          kind: "start",
          reps: cfg.targetReps,
          why: "Prima volta: parti dalle ripetizioni che riesci a controllare bene.",
        }
      : {
          kind: "start",
          why: "Prima volta: scegli un peso che chiudi con 2 ripetizioni di margine.",
        };
  }

  const last = past[0];

  if (cfg.bodyweight) {
    const reps = Math.max(topReps(last.sets), cfg.targetReps);
    if (allClosed(last.sets, cfg.targetReps)) {
      return {
        kind: "reps",
        reps: reps + 1,
        why: `L'ultima volta hai chiuso tutte le serie da ${cfg.targetReps}: oggi punta a ${reps + 1}.`,
      };
    }
    return {
      kind: "keep",
      reps: cfg.targetReps,
      why: `Consolida ${cfg.targetReps} ripetizioni pulite, poi si sale.`,
    };
  }

  const w = topWeight(last.sets);

  if (allClosed(last.sets, cfg.targetReps)) {
    const rir = avgRir(last.sets);
    if (rir != null && rir >= 2.5) {
      const next = roundStep(w + STEP * 2);
      return {
        kind: "up",
        weight: next,
        why: `Tutte chiuse e con ${fmtNum(Math.round(rir * 10) / 10)} colpi in canna di media: doppio salto a ${fmtNum(next)} kg.`,
      };
    }
    const next = roundStep(w + STEP);
    return {
      kind: "up",
      weight: next,
      why: `Hai chiuso tutte le serie da ${cfg.targetReps} a ${fmtNum(w)} kg: si sale a ${fmtNum(next)}.`,
    };
  }

  const prevStall =
    past.length > 1 &&
    topWeight(past[1].sets) === w &&
    !allClosed(past[1].sets, cfg.targetReps);

  if (prevStall && w > 0) {
    const deload = Math.max(STEP, roundStep(w * 0.9));
    return {
      kind: "deload",
      weight: deload,
      why: `Due sedute ferme a ${fmtNum(w)} kg: scarica a ${fmtNum(deload)} e ricostruisci lo slancio.`,
    };
  }

  if (w > 0) {
    return {
      kind: "keep",
      weight: w,
      why: `Ti mancano poche ripetizioni a ${fmtNum(w)} kg: riprova lo stesso peso.`,
    };
  }

  return {
    kind: "start",
    why: "Scegli un peso che chiudi con 2 ripetizioni di margine.",
  };
}
