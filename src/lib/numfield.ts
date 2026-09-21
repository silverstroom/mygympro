export interface CommitOpts {
  min?: number;
  max?: number;
  decimal?: boolean;
  fallback?: number;
}

/**
 * Ripulisce quello che l'utente sta digitando senza correggerlo: niente clamp
 * mentre scrive, altrimenti "80" diventa "20" al primo tasto e poi "200".
 */
export function sanitizeDraft(raw: string, decimal = false): string {
  const dotted = raw.replace(",", ".");
  if (!decimal) return dotted.split(".")[0].replace(/[^0-9]/g, "");
  let out = dotted.replace(/[^0-9.]/g, "");
  const first = out.indexOf(".");
  if (first >= 0) {
    out = out.slice(0, first + 1) + out.slice(first + 1).replace(/\./g, "");
  }
  return out;
}

/** Numero valido mentre si digita, oppure null (campo vuoto, "12." ecc.). */
export function parseDraft(raw: string, decimal = false): number | null {
  const clean = sanitizeDraft(raw, decimal);
  if (!clean || clean === ".") return null;
  const n = Number(clean);
  if (!Number.isFinite(n)) return null;
  return decimal ? Math.round(n * 100) / 100 : Math.round(n);
}

/** Valore definitivo: qui sì che si arrotonda e si riporta nei limiti. */
export function commitNumeric(raw: string, opts: CommitOpts = {}): number {
  const { min = 0, max = 9999, decimal = false, fallback = min } = opts;
  const n = parseDraft(raw, decimal);
  if (n == null) return clampNumeric(fallback, min, max, decimal);
  return clampNumeric(n, min, max, decimal);
}

export function clampNumeric(v: number, min: number, max: number, decimal = false): number {
  if (!Number.isFinite(v)) return min;
  const r = decimal ? Math.round(v * 100) / 100 : Math.round(v);
  return Math.min(max, Math.max(min, r));
}

/** true se il valore digitato finora si può già girare allo store. */
export function withinRange(v: number, min: number, max: number): boolean {
  return v >= min && v <= max;
}
