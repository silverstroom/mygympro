"use client";

import { useRef, useState } from "react";
import { Minus, Plus } from "@phosphor-icons/react";
import NumberInput from "@/components/NumberInput";
import { clampNumeric } from "@/lib/numfield";

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
  const [focused, setFocused] = useState(false);
  valueRef.current = value;

  const bump = (dir: 1 | -1) =>
    onChange(clampNumeric(valueRef.current + dir * step, min, max, true));

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
      <div
        className={`flex items-center gap-1 rounded-[12px] border bg-surface-2 p-1 transition-colors ${
          focused ? "border-accent" : "border-line"
        }`}
      >
        <button
          aria-label="Diminuisci"
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Minus size={16} weight="bold" />
        </button>
        <label className="flex min-w-0 flex-1 cursor-text items-baseline justify-center gap-1.5 overflow-hidden">
          <NumberInput
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            decimal={decimal}
            autoSize={!!suffix}
            ariaLabel={label ?? suffix}
            onFocusChange={setFocused}
            className={`tnum min-w-0 bg-transparent py-1 text-center text-[17px] font-bold text-ink outline-none ${
              suffix ? "" : "w-full flex-1"
            }`}
          />
          {suffix && (
            <span className="shrink-0 text-[11.5px] font-medium text-ink-3">
              {suffix}
            </span>
          )}
        </label>
        <button
          aria-label="Aumenta"
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
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
