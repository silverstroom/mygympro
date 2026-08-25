import type { ExerciseIndex, Workout } from "./types";
import { addDays, todayISO } from "./dates";
import { e1rmHistory } from "./calc";

export interface Insight {
  key: string;
  title: string;
  body: string;
  tone: "amber" | "accent";
  exId?: string;
}

const PUSH = new Set(["pectorals", "delts", "triceps", "serratus anterior"]);
const PULL = new Set(["lats", "upper back", "biceps", "traps", "forearms"]);
const LEGS = new Set(["quads", "hamstrings", "glutes", "calves", "adductors", "abductors"]);

function volumeByTarget(
  workouts: Workout[],
  index: ExerciseIndex[],
  fromIso: string
): Record<string, number> {
  const byId = new Map(index.map((e) => [e.i, e]));
  const out: Record<string, number> = {};
  for (const w of workouts) {
    if (w.d < fromIso) continue;
    for (const en of w.entries) {
      const ex = byId.get(en.exId);
      if (!ex) continue;
      for (const s of en.sets) {
        if (!s.done) continue;
        const v = (s.w ?? 0) * (s.r ?? 0) || (s.r ?? 0) * 10;
        out[ex.t] = (out[ex.t] ?? 0) + v;
      }
    }
  }
  return out;
}

function sumSets(workouts: Workout[], fromIso: string): Map<string, number> {
  const count = new Map<string, number>();
  for (const w of workouts) {
    if (w.d < fromIso) continue;
    for (const en of w.entries) {
      const done = en.sets.filter((s) => s.done).length;
      if (done > 0) count.set(en.exId, (count.get(en.exId) ?? 0) + 1);
    }
  }
  return count;
}

export function buildInsights(
  workouts: Workout[],
  index: ExerciseIndex[],
  today = todayISO()
): Insight[] {
  const out: Insight[] = [];
  if (workouts.length < 4) return out;
  const byId = new Map(index.map((e) => [e.i, e]));
  const from60 = addDays(today, -60);
  const from30 = addDays(today, -30);

  const sessionCounts = sumSets(workouts, from60);
  for (const [exId, sessions] of [...sessionCounts.entries()].sort((a, b) => b[1] - a[1])) {
    if (sessions < 8) break;
    const curve = e1rmHistory(workouts, exId);
    if (curve.length < 5) continue;
    const last = curve[curve.length - 1];
    const monthAgoIdx = curve.findIndex((p) => p.d >= addDays(today, -28));
    if (monthAgoIdx < 0 || monthAgoIdx >= curve.length - 1) continue;
    const ref = curve[monthAgoIdx];
    if (last.y <= ref.y * 1.01) {
      const name = byId.get(exId)?.n ?? "questo esercizio";
      out.push({
        key: "overuse-" + exId,
        title: "Stesso esercizio, stesso risultato",
        body: `Fai ${name} da ${sessions} sedute e il massimale stimato è fermo da un mese: il corpo si è abituato. Cambia variante o schema di ripetizioni per qualche settimana.`,
        tone: "amber",
        exId,
      });
      break;
    }
  }

  const vol = volumeByTarget(workouts, index, from30);
  const push = Object.entries(vol).reduce((n, [k, v]) => (PUSH.has(k) ? n + v : n), 0);
  const pull = Object.entries(vol).reduce((n, [k, v]) => (PULL.has(k) ? n + v : n), 0);
  if (push > 3000 && push > pull * 1.7) {
    out.push({
      key: "push-pull",
      title: "Spingi molto più di quanto tiri",
      body: "Nell'ultimo mese il volume di spinta è quasi il doppio della tirata: alla lunga le spalle se la prendono. Aggiungi rematori o trazioni.",
      tone: "amber",
    });
  } else if (pull > 3000 && pull > push * 1.7) {
    out.push({
      key: "pull-push",
      title: "Tanta tirata, poca spinta",
      body: "Il volume di tirata doppia quello di spinta nell'ultimo mese: bilancia con panca o piegamenti.",
      tone: "accent",
    });
  }

  const total = Object.values(vol).reduce((a, b) => a + b, 0);
  const legs = Object.entries(vol).reduce((n, [k, v]) => (LEGS.has(k) ? n + v : n), 0);
  if (total > 5000 && legs / total < 0.15) {
    out.push({
      key: "legs",
      title: "Il leg day non si nasconde",
      body: "Meno del 15% del volume dell'ultimo mese è andato alle gambe. Squat, stacchi e affondi ringraziano anche la schiena.",
      tone: "amber",
    });
  }

  const wk = (iso: string) => {
    const w = workouts.filter(
      (x) => x.d >= iso && x.d < addDays(iso, 7)
    );
    return w.reduce(
      (n, x) =>
        n +
        x.entries.reduce(
          (m, en) => m + en.sets.reduce((q, s) => q + (s.done ? (s.w ?? 0) * (s.r ?? 0) : 0), 0),
          0
        ),
      0
    );
  };
  const mondayIdx = (new Date(today).getDay() + 6) % 7;
  const thisMonday = addDays(today, -mondayIdx);
  const cur = wk(thisMonday);
  const prev3 = [1, 2, 3].map((i) => wk(addDays(thisMonday, -7 * i)));
  const avg = prev3.reduce((a, b) => a + b, 0) / 3;
  if (avg > 2000 && cur > avg * 1.7) {
    out.push({
      key: "ramp",
      title: "Volume salito in fretta",
      body: "Questa settimana stai facendo molto più volume del solito: bene la voglia, ma il recupero paga i conti. Dormi e mangia di conseguenza.",
      tone: "accent",
    });
  }

  return out.slice(0, 3);
}
