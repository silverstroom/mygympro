"use client";

import { useRef } from "react";
import { Minus, Plus } from "@phosphor-icons/react";

export default function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  decimal = false,
  label,
  suffix,
  wide = false,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  decimal?: boolean;
  label?: string;
  suffix?: string;
  wide?: boolean;
}) {
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const clamp = (v: number) =>
    Math.min(max, Math.max(min, Math.round(v * 100) / 100));

  const bump = (dir: 1 | -1) => onChange(clamp(valueRef.current + dir * step));

  const startHold = (dir: 1 | -1) => {
    bump(dir);
    timeoutRef.current = setTimeout(() => {
      holdRef.current = setInterval(() => bump(dir), 90);
    }, 450);
  };

  const stopHold = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (holdRef.current) clearInterval(holdRef.current);
    timeoutRef.current = null;
    holdRef.current = null;
  };

  return (
    <div className={wide ? "w-full" : ""}>
      {label && (
        <div className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-3">
          {label}
        </div>
      )}
      <div className="flex items-center gap-1 rounded-[12px] border border-line bg-surface-2 p-1">
        <button
          aria-label="Diminuisci"
          className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Minus size={16} weight="bold" />
        </button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
          <input
            type="number"
            inputMode={decimal ? "decimal" : "numeric"}
            step={decimal ? "0.25" : "1"}
            value={Number.isFinite(value) ? value : ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value.replace(",", "."));
              onChange(Number.isFinite(v) ? clamp(v) : 0);
            }}
            onFocus={(e) => e.target.select()}
            className="tnum w-full min-w-0 bg-transparent text-center text-[16.5px] font-bold text-ink outline-none"
          />
          {suffix && (
            <span className="shrink-0 text-[11px] font-medium text-ink-3">
              {suffix}
            </span>
          )}
        </div>
        <button
          aria-label="Aumenta"
          className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Plus size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
