"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Barbell,
  CalendarBlank,
  ChartLineUp,
  Eye,
  GearSix,
  HouseSimple,
  SignIn,
  SignOut,
  Sparkle,
  SquaresFour,
  UserCirclePlus,
} from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { loadIndex } from "@/lib/data";
import { buildDemoState } from "@/lib/demo";
import type { Session } from "@/lib/auth";
import {
  accountById,
  enterAsGuest,
  getSession,
  listAccounts,
  login,
  logout,
  register,
  restorePreDemo,
  seedAccountState,
  stopImpersonation,
} from "@/lib/auth";
import RestTimer from "@/components/RestTimer";
import AuthScreen from "@/components/AuthScreen";
import { Toasts } from "@/components/ui";
import SignupPrompt, { useSignup } from "@/components/SignupPrompt";
import ProfileSetup, { useProfileSetup } from "@/components/ProfileSetup";
import CoachChat from "@/components/CoachChat";
import { applyTheme } from "@/lib/themes";

function ThemeApplier() {
  const accent = useStore((s) => s.settings.accent);
  const bg = useStore((s) => s.settings.bg);
  useEffect(() => {
    applyTheme(accent, bg);
  }, [accent, bg]);
  return null;
}

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
  const [sess, setSess] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    loadIndex().catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const current = getSession();
    if (params.has("demo") && !current) {
      const existing = listAccounts().find((a) => a.demo);
      if (existing) {
        login(existing.id, "").then(() =>
          window.location.replace(window.location.pathname)
        );
      } else {
        register("Demo", "", { demo: true }).then((r) => {
          if (r.ok) {
            seedAccountState(r.account.id, buildDemoState());
            window.location.replace(window.location.pathname);
          } else {
            setSess(null);
          }
        });
      }
      return;
    }
    if (!current) {
      let wantLogin = false;
      try {
        wantLogin = sessionStorage.getItem("mygympro-want-login") === "1";
        if (wantLogin) sessionStorage.removeItem("mygympro-want-login");
      } catch {}
      const accounts = listAccounts();
      const hasVisible = accounts.some((a) => !a.guest);
      if (!hasVisible && !wantLogin) {
        const existing = accounts.find((a) => a.guest);
        enterAsGuest();
        if (existing) {
          window.location.reload();
          return;
        }
        setSess(getSession());
        return;
      }
    }
    setSess(current);
  }, []);

  const authed = sess != null;
  const viewer = sess ? accountById(sess.id) : null;
  const impersonator = sess?.via ? accountById(sess.via) : null;

  useEffect(() => {
    if (!authed || !viewer?.guest) return;
    const t = setTimeout(() => useSignup.getState().showTimed(), 75000);
    return () => clearTimeout(t);
  }, [authed, viewer?.guest]);

  const demo = useStore((s) => s.demo);
  const resetAll = useStore((s) => s.resetAll);

  const demoBar = authed && demo && !impersonator && !active?.restUntil;
  const guestBar =
    authed && !!viewer?.guest && !impersonator && !active?.restUntil && !demoBar;

  const exitDemo = () => {
    if (viewer?.demo) {
      logout();
      window.location.replace("/");
      return;
    }
    const s = getSession();
    if (s && restorePreDemo(s.id)) {
      window.location.reload();
      return;
    }
    resetAll();
  };

  useEffect(() => {
    if (!authed || viewer?.guest || viewer?.demo || impersonator) return;
    try {
      if (sessionStorage.getItem("mygympro-new-account") === "1") {
        sessionStorage.removeItem("mygympro-new-account");
        const t = setTimeout(() => useProfileSetup.getState().show(), 700);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [authed, viewer?.guest, viewer?.demo, impersonator]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--bottom-stack",
      guestBar || demoBar ? "78px" : "0px"
    );
  }, [guestBar, demoBar]);

  const doneSets = active
    ? active.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)
    : 0;
  const totalSets = active
    ? active.entries.reduce((n, e) => n + e.sets.length, 0)
    : 0;
  const pct = totalSets > 0 ? doneSets / totalSets : 0;

  const loading = !hydrated || sess === undefined;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1200px]">
      {authed && (
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
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {impersonator && viewer && (
          <div className="sticky top-0 z-40 border-b border-[rgba(251,191,36,0.3)] bg-[#1d1607]">
            <div className="mx-auto flex w-full max-w-[640px] items-center gap-2 px-4 py-2">
              <Eye size={16} weight="fill" color="var(--amber)" className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-amber">
                Stai guardando il profilo di {viewer.name}
              </span>
              <button
                onClick={() => {
                  stopImpersonation();
                  window.location.replace("/admin");
                }}
                className="press shrink-0 rounded-full bg-amber px-3 py-1 text-[12px] font-bold text-[#1d1607]"
              >
                Torna al tuo account
              </button>
            </div>
          </div>
        )}

        {authed && (
          <header className="mx-auto flex w-full max-w-[640px] items-center justify-between px-4 pt-3 lg:hidden">
            <Link href="/" className="press-soft flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent">
                <Barbell size={17} weight="bold" color="var(--accent-ink)" />
              </span>
              <span className="display text-[15px] leading-none">
                MyGym<span className="text-accent">Pro</span>
              </span>
            </Link>
            <Link
              href="/impostazioni"
              aria-label="Impostazioni"
              className={`press flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border ${
                isActive(pathname, "/impostazioni")
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line-strong bg-surface-2 text-ink-2"
              }`}
            >
              {viewer?.avatar ? (
                <img src={viewer.avatar} alt="" className="h-full w-full object-cover" />
              ) : viewer && !viewer.guest ? (
                <span className="text-[13px] font-bold">
                  {viewer.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <GearSix size={17} weight="bold" />
              )}
            </Link>
          </header>
        )}

        <main
          className="mx-auto w-full max-w-[640px] flex-1 px-4 pt-4 lg:px-8 lg:pt-8"
          style={{ paddingBottom: "16px" }}
        >
          {loading ? (
            <div className="flex flex-col gap-4 pt-6">
              <div className="skeleton h-10 w-2/3" />
              <div className="skeleton h-40 w-full" />
              <div className="skeleton h-28 w-full" />
              <div className="skeleton h-28 w-full" />
            </div>
          ) : authed ? (
            children
          ) : (
            <AuthScreen />
          )}
        </main>

        <footer
          className="mx-auto w-full max-w-[640px] px-4 pt-2 text-center"
          style={{ paddingBottom: "calc(var(--nav-h) + var(--sab) + var(--bottom-stack, 0px) + 20px)" }}
        >
          <span className="text-[11.5px] text-ink-3">
            MyGymPro · creata da Salvo Bilotti
          </span>
        </footer>
      </div>

      {demoBar && (
        <div
          className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3"
          style={{ bottom: "calc(var(--nav-h) + var(--sab) + 38px)" }}
        >
          <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-[rgba(251,191,36,0.4)] bg-[#1d1607] py-1.5 pl-4 pr-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-[12.5px] font-semibold text-amber">
              <Sparkle size={14} weight="fill" />
              Stai guardando la demo
            </span>
            <button
              onClick={exitDemo}
              className="press flex shrink-0 items-center gap-1.5 rounded-full bg-amber px-3.5 py-2 text-[12.5px] font-bold text-[#1d1607]"
            >
              <SignOut size={15} weight="bold" />
              Esci dalla demo
            </button>
          </div>
        </div>
      )}

      {guestBar && (
        <div
          className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3"
          style={{ bottom: "calc(var(--nav-h) + var(--sab) + 38px)" }}
        >
          <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-line-strong bg-surface-2 py-1.5 pl-4 pr-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
            <span className="min-w-0 truncate text-[12.5px] font-semibold text-ink-2">
              Modalità ospite
            </span>
            <button
              onClick={() => {
                try {
                  sessionStorage.setItem("mygympro-want-login", "1");
                } catch {}
                logout();
                window.location.replace("/");
              }}
              className="press flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink"
            >
              <SignIn size={15} weight="bold" />
              Accedi
            </button>
            <button
              onClick={() => useSignup.getState().show("timed")}
              className="press flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-[12.5px] font-bold text-accent-ink"
            >
              <UserCirclePlus size={15} weight="bold" />
              Iscriviti gratis
            </button>
          </div>
        </div>
      )}

      <ThemeApplier />
      <RestTimer />
      <Toasts />
      <SignupPrompt />
      {authed && <ProfileSetup />}
      {authed && <CoachChat />}

      {authed && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[color-mix(in_srgb,var(--bg)_84%,transparent)] backdrop-blur-xl lg:hidden"
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
                      className={`press relative -mt-7 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-accent shadow-[0_10px_28px_var(--accent-glow)] ${
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
      )}
    </div>
  );
}
