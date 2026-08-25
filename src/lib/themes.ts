export interface AccentTheme {
  name: string;
  accent: string;
  strong: string;
  dim: string;
  ink: string;
  soft: string;
  glow: string;
  glowSoft: string;
  sel: string;
  heat: [string, string, string, string];
}

export interface BgTheme {
  name: string;
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
}

export const DEFAULT_ACCENT = "sky";
export const DEFAULT_BG = "carbone";

export const ACCENTS: Record<string, AccentTheme> = {
  sky: {
    name: "Azzurro",
    accent: "#38bdf8",
    strong: "#7dd3fc",
    dim: "#0ea5e9",
    ink: "#06202e",
    soft: "rgba(56, 189, 248, 0.12)",
    glow: "rgba(56, 189, 248, 0.35)",
    glowSoft: "rgba(56, 189, 248, 0.25)",
    sel: "rgba(56, 189, 248, 0.28)",
    heat: ["#264c66", "#2f688e", "#3d8abb", "#54b2e8"],
  },
  viola: {
    name: "Viola",
    accent: "#a78bfa",
    strong: "#c4b5fd",
    dim: "#8b5cf6",
    ink: "#1b1233",
    soft: "rgba(167, 139, 250, 0.12)",
    glow: "rgba(167, 139, 250, 0.35)",
    glowSoft: "rgba(167, 139, 250, 0.25)",
    sel: "rgba(167, 139, 250, 0.28)",
    heat: ["#3d3161", "#544386", "#7059b4", "#9377e2"],
  },
  rosa: {
    name: "Rosa",
    accent: "#fb7185",
    strong: "#fda4af",
    dim: "#f43f5e",
    ink: "#33101a",
    soft: "rgba(251, 113, 133, 0.12)",
    glow: "rgba(251, 113, 133, 0.35)",
    glowSoft: "rgba(251, 113, 133, 0.25)",
    sel: "rgba(251, 113, 133, 0.28)",
    heat: ["#5c2635", "#7e3448", "#a8455e", "#d75c78"],
  },
  arancio: {
    name: "Arancio",
    accent: "#fb923c",
    strong: "#fdba74",
    dim: "#f97316",
    ink: "#331606",
    soft: "rgba(251, 146, 60, 0.12)",
    glow: "rgba(251, 146, 60, 0.35)",
    glowSoft: "rgba(251, 146, 60, 0.25)",
    sel: "rgba(251, 146, 60, 0.28)",
    heat: ["#5c3418", "#7e4820", "#a85f28", "#d77a33"],
  },
  smeraldo: {
    name: "Smeraldo",
    accent: "#34d399",
    strong: "#6ee7b7",
    dim: "#10b981",
    ink: "#06231a",
    soft: "rgba(52, 211, 153, 0.12)",
    glow: "rgba(52, 211, 153, 0.35)",
    glowSoft: "rgba(52, 211, 153, 0.25)",
    sel: "rgba(52, 211, 153, 0.28)",
    heat: ["#1d5340", "#267057", "#2f9270", "#3bbd8d"],
  },
  giallo: {
    name: "Giallo",
    accent: "#facc15",
    strong: "#fde047",
    dim: "#eab308",
    ink: "#2b2203",
    soft: "rgba(250, 204, 21, 0.12)",
    glow: "rgba(250, 204, 21, 0.35)",
    glowSoft: "rgba(250, 204, 21, 0.25)",
    sel: "rgba(250, 204, 21, 0.28)",
    heat: ["#57470e", "#786213", "#a08217", "#cca71c"],
  },
};

export const BGS: Record<string, BgTheme> = {
  carbone: {
    name: "Carbone",
    bg: "#0a0a0c",
    surface: "#141417",
    surface2: "#1c1c21",
    surface3: "#26262c",
  },
  notte: {
    name: "Notte",
    bg: "#070b12",
    surface: "#0f141d",
    surface2: "#151c27",
    surface3: "#1e2734",
  },
  bosco: {
    name: "Bosco",
    bg: "#070d0a",
    surface: "#0f1713",
    surface2: "#16201a",
    surface3: "#1e2b24",
  },
  espresso: {
    name: "Espresso",
    bg: "#0d0a08",
    surface: "#161210",
    surface2: "#1e1915",
    surface3: "#29211b",
  },
  vinaccia: {
    name: "Vinaccia",
    bg: "#0d080b",
    surface: "#161013",
    surface2: "#1f161b",
    surface3: "#2a1f25",
  },
};

export function applyTheme(accentKey?: string | null, bgKey?: string | null) {
  if (typeof document === "undefined") return;
  const a = ACCENTS[accentKey ?? ""] ?? ACCENTS[DEFAULT_ACCENT];
  const b = BGS[bgKey ?? ""] ?? BGS[DEFAULT_BG];
  const r = document.documentElement.style;
  r.setProperty("--accent", a.accent);
  r.setProperty("--accent-strong", a.strong);
  r.setProperty("--accent-dim", a.dim);
  r.setProperty("--accent-ink", a.ink);
  r.setProperty("--accent-soft", a.soft);
  r.setProperty("--accent-glow", a.glow);
  r.setProperty("--accent-glow-soft", a.glowSoft);
  r.setProperty("--accent-sel", a.sel);
  a.heat.forEach((h, i) => r.setProperty(`--heat-${i + 1}`, h));
  r.setProperty("--bg", b.bg);
  r.setProperty("--surface", b.surface);
  r.setProperty("--surface-2", b.surface2);
  r.setProperty("--surface-3", b.surface3);
}
