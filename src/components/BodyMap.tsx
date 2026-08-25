"use client";

import { useMemo } from "react";
import { motion } from "motion/react";

type Region = {
  key: string;
  muscles: string[];
  shapes: { x: number; y: number; w: number; h: number; r: number }[];
  circles?: { cx: number; cy: number; r: number }[];
};

const FRONT: Region[] = [
  { key: "delts", muscles: ["delts"], shapes: [
    { x: 26, y: 42, w: 16, h: 20, r: 8 }, { x: 78, y: 42, w: 16, h: 20, r: 8 },
  ]},
  { key: "pectorals", muscles: ["pectorals", "chest", "serratus anterior"], shapes: [
    { x: 42, y: 46, w: 17, h: 20, r: 7 }, { x: 61, y: 46, w: 17, h: 20, r: 7 },
  ]},
  { key: "biceps", muscles: ["biceps"], shapes: [
    { x: 22, y: 64, w: 12, h: 28, r: 6 }, { x: 86, y: 64, w: 12, h: 28, r: 6 },
  ]},
  { key: "forearms", muscles: ["forearms"], shapes: [
    { x: 19, y: 95, w: 11, h: 30, r: 5.5 }, { x: 90, y: 95, w: 11, h: 30, r: 5.5 },
  ]},
  { key: "abs", muscles: ["abs", "hip flexors", "core"], shapes: [
    { x: 49, y: 69, w: 22, h: 36, r: 8 },
  ]},
  { key: "obliques", muscles: ["obliques"], shapes: [
    { x: 41, y: 71, w: 7, h: 30, r: 3.5 }, { x: 72, y: 71, w: 7, h: 30, r: 3.5 },
  ]},
  { key: "adductors", muscles: ["adductors"], shapes: [
    { x: 54, y: 126, w: 6, h: 24, r: 3 }, { x: 60, y: 126, w: 6, h: 24, r: 3 },
  ]},
  { key: "quads", muscles: ["quads"], shapes: [
    { x: 38, y: 122, w: 15, h: 46, r: 7.5 }, { x: 67, y: 122, w: 15, h: 46, r: 7.5 },
  ]},
  { key: "calves_f", muscles: ["calves"], shapes: [
    { x: 41, y: 178, w: 12, h: 32, r: 6 }, { x: 67, y: 178, w: 12, h: 32, r: 6 },
  ]},
];

const BACK: Region[] = [
  { key: "traps", muscles: ["traps", "levator scapulae"], shapes: [
    { x: 46, y: 34, w: 28, h: 14, r: 6 },
  ]},
  { key: "delts_b", muscles: ["delts", "shoulders"], shapes: [
    { x: 26, y: 42, w: 16, h: 20, r: 8 }, { x: 78, y: 42, w: 16, h: 20, r: 8 },
  ]},
  { key: "upperback", muscles: ["upper back", "back"], shapes: [
    { x: 45, y: 50, w: 30, h: 16, r: 7 },
  ]},
  { key: "lats", muscles: ["lats"], shapes: [
    { x: 40, y: 68, w: 14, h: 28, r: 7 }, { x: 66, y: 68, w: 14, h: 28, r: 7 },
  ]},
  { key: "lowerback", muscles: ["spine", "lower back"], shapes: [
    { x: 50, y: 92, w: 20, h: 15, r: 6 },
  ]},
  { key: "triceps", muscles: ["triceps"], shapes: [
    { x: 22, y: 64, w: 12, h: 28, r: 6 }, { x: 86, y: 64, w: 12, h: 28, r: 6 },
  ]},
  { key: "forearms_b", muscles: ["forearms"], shapes: [
    { x: 19, y: 95, w: 11, h: 30, r: 5.5 }, { x: 90, y: 95, w: 11, h: 30, r: 5.5 },
  ]},
  { key: "abductors", muscles: ["abductors"], shapes: [
    { x: 36, y: 112, w: 7, h: 18, r: 3.5 }, { x: 77, y: 112, w: 7, h: 18, r: 3.5 },
  ]},
  { key: "glutes", muscles: ["glutes"], circles: [
    { cx: 51, cy: 119, r: 11 }, { cx: 69, cy: 119, r: 11 },
  ], shapes: []},
  { key: "hamstrings", muscles: ["hamstrings", "hamstring"], shapes: [
    { x: 39, y: 134, w: 15, h: 40, r: 7.5 }, { x: 66, y: 134, w: 15, h: 40, r: 7.5 },
  ]},
  { key: "calves_b", muscles: ["calves"], shapes: [
    { x: 41, y: 180, w: 12, h: 32, r: 6 }, { x: 67, y: 180, w: 12, h: 32, r: 6 },
  ]},
];

function regionValue(r: Region, usage: Record<string, number>): number {
  return r.muscles.reduce((m, k) => Math.max(m, usage[k] ?? 0), 0);
}

function Silhouette({
  regions,
  usage,
  max,
  onPick,
  picked,
}: {
  regions: Region[];
  usage: Record<string, number>;
  max: number;
  onPick?: (muscle: string) => void;
  picked?: string | null;
}) {
  return (
    <svg viewBox="0 0 120 220" className="h-auto w-full max-w-[150px]">
      <circle cx="60" cy="18" r="11" fill="var(--surface-3)" />
      <rect x="54" y="28" width="12" height="8" rx="4" fill="var(--surface-3)" />
      {regions.map((reg, ri) => {
        const v = regionValue(reg, usage);
        const t = max > 0 ? v / max : 0;
        const fill =
          t <= 0
            ? "var(--surface-3)"
            : `color-mix(in srgb, var(--accent) ${Math.round(18 + t * 82)}%, var(--surface-3))`;
        const isPicked = picked != null && reg.muscles.includes(picked);
        return (
          <motion.g
            key={reg.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: ri * 0.03, duration: 0.35 }}
            onClick={() => onPick?.(reg.muscles[0])}
            style={{ cursor: onPick ? "pointer" : "default" }}
          >
            {reg.shapes.map((s, i) => (
              <rect
                key={i}
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                rx={s.r}
                fill={fill}
                stroke={isPicked ? "var(--accent)" : "none"}
                strokeWidth={1.5}
                style={{ transition: "fill 300ms var(--ease-out)" }}
              />
            ))}
            {reg.circles?.map((c, i) => (
              <circle
                key={i}
                cx={c.cx}
                cy={c.cy}
                r={c.r}
                fill={fill}
                stroke={isPicked ? "var(--accent)" : "none"}
                strokeWidth={1.5}
                style={{ transition: "fill 300ms var(--ease-out)" }}
              />
            ))}
          </motion.g>
        );
      })}
    </svg>
  );
}

export default function BodyMap({
  usage,
  onPick,
  picked,
}: {
  usage: Record<string, number>;
  onPick?: (muscle: string) => void;
  picked?: string | null;
}) {
  const max = useMemo(() => {
    const all = [...FRONT, ...BACK].map((r) => regionValue(r, usage));
    return Math.max(...all, 0);
  }, [usage]);

  return (
    <div className="flex items-start justify-center gap-6">
      <div className="flex flex-col items-center gap-1.5">
        <Silhouette regions={FRONT} usage={usage} max={max} onPick={onPick} picked={picked} />
        <span className="text-[11px] font-medium text-ink-3">Fronte</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Silhouette regions={BACK} usage={usage} max={max} onPick={onPick} picked={picked} />
        <span className="text-[11px] font-medium text-ink-3">Retro</span>
      </div>
    </div>
  );
}
