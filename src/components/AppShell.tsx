"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import {
  Barbell,
  CalendarBlank,
  ChartLineUp,
  GearSix,
  HouseSimple,
  SquaresFour,
} from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { loadIndex } from "@/lib/data";
import { buildDemoState } from "@/lib/demo";
import RestTimer from "@/components/RestTimer";
import { Toasts } from "@/components/ui";

const TABS = [
  { href: "/", label: "Home", icon: HouseSimple },
  { href: "/piano", label: "Piano", icon: CalendarBlank },
  { href: "/allenamento", label: "Allenati", icon: Barbell, fab: true },
  { href: "/esercizi", label: "Esercizi", icon: SquaresFour },
  { href: "/progressi", label: "Progressi", icon: ChartLineUp },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = useStore((s) => s.active);
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    loadIndex().catch(() => {});
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const s = useStore.getState();
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("demo") &&
      !s.onboarded
    ) {
      s.loadState(buildDemoState(), true);
    }
  }, [hydrated]);

  const doneSets = active
    ? active.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)
    : 0;
  const totalSets = active
    ? active.entries.reduce((n, e) => n + e.sets.length, 0)
    : 0;
  const pct = totalSets > 0 ? doneSets / totalSets : 0;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1200px]">
      <aside className="sticky top-0 hidden h-[100dvh] w-[210px] shrink-0 flex-col gap-1 border-r border-line px-4 py-7 lg:flex">
        <Link href="/" className="mb-7 flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
            <Barbell size={20} weight="bold" color="var(--accent-ink)" />
          </span>
          <span className="display text-lg leading-none">
            MyGym<span className="text-accent">Pro</span>
          </span>
        </Link>
        {TABS.map((t) => {
          const on = isActive(pathname, t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`press-soft flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors duration-150 ${
                on
                  ? "bg-accent-soft text-accent"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon size={20} weight={on ? "fill" : "regular"} />
              {t.label}
            </Link>
          );
        })}
        <div className="mt-auto">
          <Link
            href="/impostazioni"
            className={`press-soft flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors duration-150 ${
              isActive(pathname, "/impostazioni")
                ? "bg-accent-soft text-accent"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <GearSix size={20} weight={isActive(pathname, "/impostazioni") ? "fill" : "regular"} />
            Impostazioni
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main
          className="mx-auto w-full max-w-[640px] px-4 pt-4 lg:px-8 lg:pt-8"
          style={{ paddingBottom: "calc(var(--nav-h) + var(--sab) + 28px)" }}
        >
          {hydrated ? (
            children
          ) : (
            <div className="flex flex-col gap-4 pt-6">
              <div className="skeleton h-10 w-2/3" />
              <div className="skeleton h-40 w-full" />
              <div className="skeleton h-28 w-full" />
              <div className="skeleton h-28 w-full" />
            </div>
          )}
        </main>
      </div>

      <RestTimer />
      <Toasts />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[rgba(10,10,12,0.82)] backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "var(--sab)" }}
      >
        <div className="mx-auto grid h-[68px] max-w-[520px] grid-cols-5 items-center px-2">
          {TABS.map((t) => {
            const on = isActive(pathname, t.href);
            const Icon = t.icon;
            if (t.fab) {
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-label={t.label}
                  className="flex justify-center"
                >
                  <span
                    className={`press relative -mt-7 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-accent shadow-[0_10px_28px_rgba(163,230,53,0.35)] ${
                      active ? "pulse-ring" : ""
                    }`}
                  >
                    {active && (
                      <svg
                        viewBox="0 0 58 58"
                        className="absolute inset-0 -rotate-90"
                      >
                        <circle
                          cx="29"
                          cy="29"
                          r="26"
                          fill="none"
                          stroke="rgba(20,24,2,0.18)"
                          strokeWidth="3"
                        />
                        <circle
                          cx="29"
                          cy="29"
                          r="26"
                          fill="none"
                          stroke="var(--accent-ink)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${pct * 163.4} 163.4`}
                          style={{ transition: "stroke-dasharray 400ms var(--ease-out)" }}
                        />
                      </svg>
                    )}
                    <Icon size={26} weight="bold" color="var(--accent-ink)" />
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={t.href}
                href={t.href}
                className="press flex flex-col items-center gap-0.5 py-1.5"
              >
                <Icon
                  size={23}
                  weight={on ? "fill" : "regular"}
                  color={on ? "var(--accent)" : "var(--text-3)"}
                />
                <span
                  className={`text-[10.5px] font-medium ${
                    on ? "text-accent" : "text-ink-3"
                  }`}
                >
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
