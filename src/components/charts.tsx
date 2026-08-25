"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "motion/react";
import { addDays, DAY_NAMES, fmtNum, fmtShort, mondayOf, todayISO } from "@/lib/dates";

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      setW(entries[0].contentRect.width);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function LineChart({
  data,
  goal = null,
  unit = "",
  h = 150,
  color = "var(--accent)",
}: {
  data: { d: string; y: number }[];
  goal?: number | null;
  unit?: string;
  h?: number;
  color?: string;
}) {
  const { ref, w } = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const gid = useMemo(() => "lg" + Math.round(Math.random() * 1e6), []);

  const pad = { l: 8, r: 44, t: 14, b: 20 };
  const iw = Math.max(0, w - pad.l - pad.r);
  const ih = h - pad.t - pad.b;

  const { pts, min, max } = useMemo(() => {
    if (!data.length || !iw) return { pts: [], min: 0, max: 0 };
    const ys = data.map((p) => p.y);
    let mn = Math.min(...ys);
    let mx = Math.max(...ys);
    if (goal != null) {
      mn = Math.min(mn, goal);
      mx = Math.max(mx, goal);
    }
    const range = mx - mn || 1;
    mn -= range * 0.12;
    mx += range * 0.12;
    const t0 = new Date(data[0].d).getTime();
    const t1 = new Date(data[data.length - 1].d).getTime() || t0 + 1;
    const span = t1 - t0 || 1;
    const pts = data.map((p) => ({
      x: pad.l + ((new Date(p.d).getTime() - t0) / span) * iw,
      y: pad.t + ih - ((p.y - mn) / (mx - mn)) * ih,
      d: p.d,
      v: p.y,
    }));
    return { pts, min: mn, max: mx };
  }, [data, iw, ih, goal, pad.l, pad.t]);

  const onMove = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (!pts.length) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let best = 0;
      let bd = Infinity;
      pts.forEach((p, i) => {
        const d = Math.abs(p.x - x);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      setHover(best);
    },
    [pts]
  );

  if (!data.length) {
    return (
      <div className="flex h-[120px] items-center justify-center text-[13px] text-ink-3">
        Ancora nessun dato
      </div>
    );
  }

  const gy =
    goal != null ? pad.t + ih - ((goal - min) / (max - min || 1)) * ih : null;
  const last = pts[pts.length - 1];
  const hovered = hover != null ? pts[hover] : null;

  return (
    <div ref={ref} className="w-full touch-pan-y select-none">
      {w > 0 && (
        <svg width={w} height={h} className="block overflow-visible">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {gy != null && (
            <g>
              <line
                x1={pad.l}
                x2={pad.l + iw}
                y1={gy}
                y2={gy}
                stroke="var(--amber)"
                strokeOpacity="0.55"
                strokeWidth="1.5"
                strokeDasharray="5 5"
              />
              <text
                x={pad.l + iw + 6}
                y={gy + 4}
                fontSize="10.5"
                fill="var(--amber)"
                fontWeight="600"
              >
                {fmtNum(goal!)}
              </text>
            </g>
          )}

          {pts.length > 1 && (
            <path
              d={`${smoothPath(pts)} L ${last.x} ${pad.t + ih} L ${pts[0].x} ${pad.t + ih} Z`}
              fill={`url(#${gid})`}
            />
          )}

          <path
            d={smoothPath(pts)}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={1}
            className={reduce ? undefined : "line-draw"}
          />

          {!hovered && (
            <g>
              <circle cx={last.x} cy={last.y} r="4.5" fill={color} />
              <circle cx={last.x} cy={last.y} r="8" fill={color} fillOpacity="0.18" />
              <text
                x={Math.min(last.x + 8, w - 4)}
                y={last.y - 9}
                fontSize="11.5"
                fontWeight="700"
                fill="var(--text)"
                textAnchor={last.x > w - 60 ? "end" : "start"}
                className="tnum"
              >
                {fmtNum(last.v)} {unit}
              </text>
            </g>
          )}

          {hovered && (
            <g>
              <line
                x1={hovered.x}
                x2={hovered.x}
                y1={pad.t - 2}
                y2={pad.t + ih}
                stroke="var(--line-strong)"
                strokeWidth="1"
              />
              <circle cx={hovered.x} cy={hovered.y} r="5" fill={color} stroke="var(--surface)" strokeWidth="2" />
              {(() => {
                const bw = 92;
                const bx = Math.min(Math.max(hovered.x - bw / 2, 2), w - bw - 2);
                return (
                  <g>
                    <rect
                      x={bx}
                      y={0}
                      width={bw}
                      height={30}
                      rx={8}
                      fill="var(--surface-3)"
                      stroke="var(--line-strong)"
                    />
                    <text x={bx + bw / 2} y={12.5} fontSize="10" fill="var(--text-2)" textAnchor="middle">
                      {fmtShort(hovered.d)}
                    </text>
                    <text
                      x={bx + bw / 2}
                      y={25}
                      fontSize="11.5"
                      fontWeight="700"
                      fill="var(--text)"
                      textAnchor="middle"
                      className="tnum"
                    >
                      {fmtNum(hovered.v)} {unit}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          <text x={pad.l} y={h - 4} fontSize="10" fill="var(--text-3)">
            {fmtShort(data[0].d)}
          </text>
          <text x={pad.l + iw} y={h - 4} fontSize="10" fill="var(--text-3)" textAnchor="end">
            {fmtShort(data[data.length - 1].d)}
          </text>

          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}
    </div>
  );
}

const HEAT = ["var(--heat-0)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"];

function heatLevel(min: number): number {
  if (min <= 0) return 0;
  if (min < 40) return 1;
  if (min < 60) return 2;
  if (min < 80) return 3;
  return 4;
}

export function Heatmap({
  activity,
  onSelect,
  selected,
}: {
  activity: Record<string, number>;
  onSelect?: (iso: string | null) => void;
  selected?: string | null;
}) {
  const { ref, w } = useSize<HTMLDivElement>();
  const cell = 14;
  const gap = 3;
  const labelW = 30;
  const weeks = Math.max(8, Math.min(26, Math.floor((w - labelW) / (cell + gap))));
  const thisMonday = mondayOf(todayISO());
  const today = todayISO();

  const cols: { iso: string; level: number }[][] = [];
  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = -1;
  for (let wi = weeks - 1; wi >= 0; wi--) {
    const monday = addDays(thisMonday, -7 * wi);
    const col: { iso: string; level: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = addDays(monday, d);
      col.push({ iso, level: iso > today ? -1 : heatLevel(activity[iso] ?? 0) });
    }
    const m = new Date(monday).getMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        x: labelW + (weeks - 1 - wi) * (cell + gap),
        label: new Date(monday).toLocaleDateString("it-IT", { month: "short" }),
      });
      lastMonth = m;
    }
    cols.push(col);
  }

  const height = 7 * (cell + gap) + 16;

  return (
    <div ref={ref} className="w-full select-none">
      {w > 0 && (
        <svg width={w} height={height} className="block">
          {monthLabels.map((m, i) =>
            i === 0 && monthLabels.length > 1 && monthLabels[1].x - m.x < 30 ? null : (
              <text key={m.x} x={m.x} y={10} fontSize="10" fill="var(--text-3)">
                {m.label}
              </text>
            )
          )}
          {[0, 2, 4].map((d) => (
            <text
              key={d}
              x={0}
              y={16 + d * (cell + gap) + cell - 3}
              fontSize="10"
              fill="var(--text-3)"
            >
              {DAY_NAMES[d]}
            </text>
          ))}
          {cols.map((col, ci) =>
            col.map((c, di) =>
              c.level < 0 ? null : (
                <rect
                  key={c.iso}
                  x={labelW + ci * (cell + gap)}
                  y={16 + di * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={4}
                  fill={HEAT[c.level]}
                  stroke={selected === c.iso ? "var(--accent)" : c.iso === today ? "var(--line-strong)" : "none"}
                  strokeWidth={selected === c.iso ? 2 : 1}
                  className="cell-in"
                  onClick={() => onSelect?.(selected === c.iso ? null : c.iso)}
                  style={{ cursor: onSelect ? "pointer" : "default", "--i": ci } as React.CSSProperties}
                />
              )
            )
          )}
        </svg>
      )}
      <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[10.5px] text-ink-3">
        Meno
        {HEAT.map((h) => (
          <span key={h} className="h-[9px] w-[9px] rounded-[3px]" style={{ background: h }} />
        ))}
        Più
      </div>
    </div>
  );
}

export function WeekBars({
  values,
  labels,
  unit = "",
  h = 120,
}: {
  values: number[];
  labels: string[];
  unit?: string;
  h?: number;
}) {
  const { ref, w } = useSize<HTMLDivElement>();
  const [sel, setSel] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const max = Math.max(...values, 1);
  const n = values.length;
  const gap = 6;
  const bw = n > 0 ? (w - gap * (n - 1)) / n : 0;
  const ih = h - 34;

  return (
    <div ref={ref} className="w-full select-none">
      {w > 0 && (
        <svg width={w} height={h} className="block">
          {values.map((v, i) => {
            const bh = Math.max(v > 0 ? 5 : 2, (v / max) * ih);
            const x = i * (bw + gap);
            const y = 18 + (ih - bh);
            const on = sel === i || (sel == null && i === n - 1);
            return (
              <g key={i} onClick={() => setSel(sel === i ? null : i)} style={{ cursor: "pointer" }}>
                <rect
                  x={x}
                  y={y}
                  width={bw}
                  height={bh}
                  rx={4}
                  fill={on ? "var(--accent)" : "var(--heat-2)"}
                  className={reduce ? undefined : "vbar-in"}
                  style={{ "--i": i } as React.CSSProperties}
                />
                {on && v > 0 && (
                  <text
                    x={Math.min(Math.max(x + bw / 2, 18), w - 18)}
                    y={Math.max(y - 6, 11)}
                    fontSize="10.5"
                    fontWeight="700"
                    fill="var(--text)"
                    textAnchor="middle"
                    className="tnum"
                  >
                    {v >= 1000 ? `${fmtNum(Math.round(v / 100) / 10)}k` : fmtNum(v)}
                    {unit ? ` ${unit}` : ""}
                  </text>
                )}
                <text
                  x={x + bw / 2}
                  y={h - 4}
                  fontSize="9.5"
                  fill={on ? "var(--text-2)" : "var(--text-3)"}
                  textAnchor="middle"
                >
                  {labels[i]}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export function Sparkline({
  data,
  w = 72,
  h = 26,
  color = "var(--accent)",
}: {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: 2 + (i / (data.length - 1)) * (w - 4),
    y: 2 + (h - 4) - ((v - min) / range) * (h - 4),
  }));
  return (
    <svg width={w} height={h} className="block shrink-0">
      <path
        d={smoothPath(pts)}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.6" fill={color} />
    </svg>
  );
}
