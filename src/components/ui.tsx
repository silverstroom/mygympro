"use client";

import { create } from "zustand";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle, Info, Warning } from "@phosphor-icons/react";

type BtnVariant = "primary" | "ghost" | "soft" | "danger";

export function Button({
  variant = "soft",
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
}) {
  const base =
    "press inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none min-h-[46px] px-5 text-[14.5px]";
  const styles: Record<BtnVariant, string> = {
    primary:
      "bg-accent text-accent-ink hover:bg-accent-strong shadow-[0_6px_20px_rgba(163,230,53,0.25)]",
    soft: "bg-surface-2 text-ink hover:bg-surface-3 border border-line",
    ghost: "bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink",
    danger: "bg-red-soft text-red hover:bg-[rgba(248,113,113,0.2)]",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function IconBtn({
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`press flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-2 transition-colors duration-150 hover:bg-surface-3 hover:text-ink disabled:opacity-40 disabled:pointer-events-none ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Chip({
  on = false,
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return (
    <button
      className={`press inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-150 ${
        on
          ? "border-accent bg-accent-soft text-accent"
          : "border-line bg-surface-2 text-ink-2 hover:text-ink"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Tag({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "accent" | "amber" | "red";
  children: React.ReactNode;
}) {
  const styles = {
    neutral: "bg-surface-3 text-ink-2",
    accent: "bg-accent-soft text-accent",
    amber: "bg-amber-soft text-amber",
    red: "bg-red-soft text-red",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-full border border-line bg-surface-2 p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`relative flex-1 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-200 ${
              on ? "text-accent-ink" : "text-ink-2"
            }`}
          >
            {on && (
              <motion.span
                layoutId="seg-pill"
                className="absolute inset-0 rounded-full bg-accent"
                transition={{ type: "spring", duration: 0.45, bounce: 0.15 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Card({
  className = "",
  style,
  children,
  onClick,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`rounded-[16px] border border-line bg-surface p-4 ${
        onClick ? "press-soft cursor-pointer transition-colors hover:border-line-strong" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  tall = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  tall?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bk"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.6)]"
          />
          <motion.div
            key="sheet"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
            drag={reduce ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 500) onClose();
            }}
            className={`fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[640px] flex-col rounded-t-[22px] border-t border-line-strong bg-surface ${
              tall ? "h-[88dvh]" : "max-h-[85dvh]"
            }`}
            style={{ paddingBottom: "var(--sab)" }}
          >
            <div className="flex shrink-0 justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-surface-3" />
            </div>
            {title && (
              <div className="display shrink-0 px-5 pb-3 pt-2 text-[17px]">
                {title}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface ToastItem {
  id: number;
  msg: string;
  tone: "ok" | "info" | "warn";
}

const useToastStore = create<{
  items: ToastItem[];
  push: (msg: string, tone?: ToastItem["tone"]) => void;
  drop: (id: number) => void;
}>((set) => ({
  items: [],
  push: (msg, tone = "ok") => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items.slice(-2), { id, msg, tone }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 2600);
  },
  drop: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export function toast(msg: string, tone: ToastItem["tone"] = "ok") {
  useToastStore.getState().push(msg, tone);
}

export function Toasts() {
  const items = useToastStore((s) => s.items);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2"
      style={{ bottom: "calc(var(--nav-h) + var(--sab) + 16px)" }}
    >
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-line-strong bg-surface-2 px-4 py-2.5 text-[13.5px] font-medium shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
          >
            {t.tone === "ok" && <CheckCircle size={17} weight="fill" color="var(--accent)" />}
            {t.tone === "info" && <Info size={17} weight="fill" color="var(--sky)" />}
            {t.tone === "warn" && <Warning size={17} weight="fill" color="var(--amber)" />}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
