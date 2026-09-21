"use client";

import { useRef, useState } from "react";
import { commitNumeric, parseDraft, sanitizeDraft, withinRange } from "@/lib/numfield";

/**
 * Campo numerico che si lascia scrivere: finché il dito è dentro non corregge
 * nulla, i limiti scattano quando esci dal campo. Con il vecchio input
 * "number" digitare 80 con minimo 20 dava 200.
 */
export default function NumberInput({
  value,
  onChange,
  min = 0,
  max = 9999,
  decimal = false,
  disabled = false,
  className = "",
  ariaLabel,
  onFocusChange,
  autoSize = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  decimal?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  onFocusChange?: (focused: boolean) => void;
  /** larghezza che segue il numero, così valore e unità restano insieme */
  autoSize?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const shown = draft ?? (Number.isFinite(value) ? String(value) : "");

  const finish = () => {
    if (draft == null) return;
    const v = commitNumeric(draft, { min, max, decimal, fallback: value });
    setDraft(null);
    if (v !== value) onChange(v);
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      enterKeyHint="done"
      autoComplete="off"
      aria-label={ariaLabel}
      value={shown}
      size={autoSize ? Math.min(7, Math.max(2, shown.length)) : undefined}
      disabled={disabled}
      onChange={(e) => {
        const next = sanitizeDraft(e.target.value, decimal);
        setDraft(next);
        const n = parseDraft(next, decimal);
        if (n != null && withinRange(n, min, max) && n !== value) onChange(n);
      }}
      onFocus={(e) => {
        setDraft(shown);
        onFocusChange?.(true);
        e.target.select();
      }}
      onBlur={() => {
        finish();
        onFocusChange?.(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          finish();
          ref.current?.blur();
        }
      }}
      className={`num-field ${className}`}
    />
  );
}
