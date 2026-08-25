"use client";

import { useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

export default function PasswordInput({
  value,
  onChange,
  placeholder,
  autoFocus = false,
  autoComplete = "current-password",
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  autoComplete?: string;
  onEnter?: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center rounded-[12px] border border-line bg-surface-2 transition-colors focus-within:border-accent">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        spellCheck={false}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        className="h-12 w-full min-w-0 bg-transparent px-4 text-[15px] outline-none placeholder:text-ink-3"
      />
      <button
        type="button"
        aria-label={show ? "Nascondi password" : "Mostra password"}
        onClick={() => setShow(!show)}
        className="press flex h-12 w-11 shrink-0 items-center justify-center text-ink-3 transition-colors hover:text-ink"
      >
        {show ? <EyeSlash size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
