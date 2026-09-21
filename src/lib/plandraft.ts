import type { Routine } from "./types";

const KEY = "mygympro-plan-draft-v1";
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

export interface PlanDraft {
  at: number;
  fromId: string | null;
  routines: Routine[];
  week: (string | null)[];
  goal?: string;
  level?: string;
  equip?: string;
}

function ls(): Storage | null {
  try {
    return typeof globalThis.localStorage !== "undefined" ? globalThis.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * La scheda appena costruita resta anche fuori dall'account: se l'utente si
 * registra subito dopo il percorso guidato se la ritrova, non la rifà.
 */
export function savePlanDraft(d: Omit<PlanDraft, "at">) {
  const s = ls();
  if (!s) return;
  try {
    s.setItem(KEY, JSON.stringify({ ...d, at: Date.now() } satisfies PlanDraft));
  } catch {}
}

export function readPlanDraft(): PlanDraft | null {
  const s = ls();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as PlanDraft;
    if (!d || typeof d.at !== "number" || !Array.isArray(d.routines) || !d.routines.length) {
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

export function clearPlanDraft() {
  try {
    ls()?.removeItem(KEY);
  } catch {}
}

export interface RestoreCtx {
  accountId: string;
  accountCreated: number;
  routines: number;
  onboarded: boolean;
  demo: boolean;
  now?: number;
}

/**
 * Si recupera solo su un profilo appena creato e ancora vuoto: un account
 * vecchio che fa login non si ritrova la scheda di qualcun altro.
 */
export function shouldRestore(draft: PlanDraft | null, ctx: RestoreCtx): boolean {
  if (!draft) return false;
  const now = ctx.now ?? Date.now();
  if (now - draft.at > MAX_AGE_MS) return false;
  if (ctx.demo || ctx.onboarded || ctx.routines > 0) return false;
  if (draft.fromId && draft.fromId === ctx.accountId) return false;
  return ctx.accountCreated >= draft.at - 60_000;
}
