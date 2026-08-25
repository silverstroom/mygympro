import type { Activity, BodyWeight } from "./types";

export interface ImportResult {
  activities: Activity[];
  bodyweight: BodyWeight[];
}

const APPLE_TYPE_IT: Record<string, string> = {
  Running: "Corsa",
  Walking: "Camminata",
  Cycling: "Bici",
  Swimming: "Nuoto",
  TraditionalStrengthTraining: "Pesi",
  FunctionalStrengthTraining: "Funzionale",
  HighIntensityIntervalTraining: "HIIT",
  Elliptical: "Ellittica",
  Rowing: "Vogatore",
  Yoga: "Yoga",
  Hiking: "Escursione",
  StairClimbing: "Scale",
  CoreTraining: "Core",
  Soccer: "Calcio",
  Tennis: "Tennis",
  Basketball: "Basket",
  Pilates: "Pilates",
  Boxing: "Boxe",
  MartialArts: "Arti marziali",
  CrossTraining: "Cross training",
  MixedCardio: "Cardio misto",
  Other: "Attività",
};

export function normalizeActivityType(raw: string): string {
  const key = raw.replace("HKWorkoutActivityType", "");
  if (APPLE_TYPE_IT[key]) return APPLE_TYPE_IT[key];
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(APPLE_TYPE_IT)) {
    if (lower.includes(k.toLowerCase())) return v;
  }
  const cleaned = key.replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return cleaned.length > 1 ? cleaned : "Attività";
}

function isoFromApple(date: string): string | null {
  const m = date.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function activityId(a: Omit<Activity, "id">): string {
  return `${a.source}_${a.d}_${a.type}_${a.min}`;
}

export function createAppleParser() {
  const activities: Activity[] = [];
  const bodyweight: BodyWeight[] = [];
  let carry = "";

  const feed = (chunk: string) => {
    const text = carry + chunk;
    const lastOpen = text.lastIndexOf("<");
    const safe = lastOpen > text.lastIndexOf(">") ? text.slice(0, lastOpen) : text;
    carry = text.slice(safe.length);
    if (carry.length > 100000) carry = carry.slice(-50000);

    const workoutRe = /<Workout [^>]*>/g;
    let m: RegExpExecArray | null;
    while ((m = workoutRe.exec(safe))) {
      const tag = m[0];
      const type = attr(tag, "workoutActivityType");
      const dur = parseFloat(attr(tag, "duration") ?? "");
      const unit = attr(tag, "durationUnit") ?? "min";
      const start = attr(tag, "startDate");
      if (!type || !start || !Number.isFinite(dur)) continue;
      const d = isoFromApple(start);
      if (!d) continue;
      const min = Math.round(unit.startsWith("s") ? dur / 60 : unit.startsWith("h") ? dur * 60 : dur);
      if (min < 1) continue;
      const kcalRaw = attr(tag, "totalEnergyBurned");
      const kcal = kcalRaw ? Math.round(parseFloat(kcalRaw)) : undefined;
      const base = {
        d,
        type: normalizeActivityType(type),
        min,
        source: "apple" as const,
        ...(kcal && Number.isFinite(kcal) ? { kcal } : {}),
      };
      activities.push({ ...base, id: activityId(base) });
    }

    const massRe = /<Record type="HKQuantityTypeIdentifierBodyMass"[^>]*>/g;
    while ((m = massRe.exec(safe))) {
      const tag = m[0];
      const value = parseFloat(attr(tag, "value") ?? "");
      const unit = attr(tag, "unit") ?? "kg";
      const start = attr(tag, "startDate");
      if (!Number.isFinite(value) || !start) continue;
      const d = isoFromApple(start);
      if (!d) continue;
      const kg = unit === "lb" ? value * 0.45359 : value;
      if (kg < 20 || kg > 400) continue;
      bodyweight.push({ d, w: Math.round(kg * 10) / 10 });
    }
  };

  const finish = (): ImportResult => {
    feed("");
    const seen = new Set<string>();
    const acts = activities.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
    const bwByDay = new Map<string, number>();
    for (const b of bodyweight) bwByDay.set(b.d, b.w);
    const bws = [...bwByDay.entries()]
      .map(([d, w]) => ({ d, w }))
      .sort((a, b) => (a.d < b.d ? -1 : 1));
    return { activities: acts, bodyweight: bws };
  };

  return { feed, finish };
}

export function parseAppleXml(text: string): ImportResult {
  const p = createAppleParser();
  p.feed(text);
  return p.finish();
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQ = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === "," || c === ";") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function findCol(headers: string[], keys: string[]): number {
  const idx = headers.findIndex((h) => keys.some((k) => h.includes(k)));
  return idx;
}

function parseCsvDate(raw: string): string | null {
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const [day, month] = a > 12 ? [a, b] : b > 12 ? [b, a] : [a, b];
    return `${m[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) {
    const dt = new Date(t);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }
  return null;
}

function parseDurationMin(raw: string): number | null {
  const clean = raw.trim();
  if (!clean) return null;
  const hms = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hms) {
    const h = Number(hms[1]);
    const mnt = Number(hms[2]);
    const s = Number(hms[3] ?? 0);
    return Math.round(hms[3] != null ? h * 60 + mnt + s / 60 : h + mnt / 60);
  }
  const num = parseFloat(clean.replace(",", "."));
  if (!Number.isFinite(num) || num <= 0) return null;
  if (num > 900) return Math.round(num / 60);
  return Math.round(num);
}

export function parseActivitiesCsv(text: string): ImportResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { activities: [], bodyweight: [] };
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const dateCol = findCol(headers, ["activity date", "date", "data", "start"]);
  const typeCol = findCol(headers, ["activity type", "type", "tipo", "sport", "attivit"]);
  const durCol = findCol(headers, [
    "elapsed time",
    "moving time",
    "durata",
    "duration",
    "time",
    "tempo",
  ]);
  const kcalCol = findCol(headers, ["calories", "calorie", "kcal", "energy"]);
  const nameCol = findCol(headers, ["activity name", "name", "title", "titolo", "nome"]);
  if (dateCol < 0 || durCol < 0) return { activities: [], bodyweight: [] };

  const activities: Activity[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const d = parseCsvDate(cells[dateCol] ?? "");
    const min = parseDurationMin(cells[durCol] ?? "");
    if (!d || !min) continue;
    const typeRaw = typeCol >= 0 ? cells[typeCol] : "";
    const kcalRaw = kcalCol >= 0 ? parseFloat((cells[kcalCol] ?? "").replace(",", ".")) : NaN;
    const name = nameCol >= 0 ? cells[nameCol] : undefined;
    const base = {
      d,
      type: typeRaw ? normalizeActivityType(typeRaw) : "Attività",
      min,
      source: "csv" as const,
      ...(Number.isFinite(kcalRaw) && kcalRaw > 0 ? { kcal: Math.round(kcalRaw) } : {}),
      ...(name ? { name } : {}),
    };
    const id = activityId(base);
    if (seen.has(id)) continue;
    seen.add(id);
    activities.push({ ...base, id });
  }
  return { activities, bodyweight: [] };
}
