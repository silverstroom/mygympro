"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Barbell, Plus, ShieldStar, Sparkle, X } from "@phosphor-icons/react";
import type { Account } from "@/lib/auth";
import { enterAsGuest, legacyDataPresent, listAccounts, login, register, superAdminLogin } from "@/lib/auth";
import { Button, Sheet, toast } from "@/components/ui";
import PasswordInput from "@/components/PasswordInput";
import PasswordStrength from "@/components/PasswordStrength";

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

function enter() {
  window.location.replace(window.location.pathname);
}

export default function AuthScreen() {
  const accounts = useMemo(() => listAccounts().filter((a) => !a.guest), []);
  const legacy = useMemo(() => legacyDataPresent(), []);
  const [pick, setPick] = useState<Account | null>(null);
  const [pw, setPw] = useState("");
  const [creating, setCreating] = useState(accounts.length === 0);
  const [name, setName] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [superOpen, setSuperOpen] = useState(false);
  const [supName, setSupName] = useState("");
  const [supPw, setSupPw] = useState("");

  const firstReal = accounts.filter((a) => !a.demo).length === 0;

  const doLogin = async () => {
    if (!pick || busy) return;
    setBusy(true);
    const res = await login(pick.id, pw);
    setBusy(false);
    if (res.ok) enter();
    else toast(res.error, "warn");
  };

  const doRegister = async () => {
    if (busy) return;
    if (pw1 !== pw2) {
      toast("Le due password non coincidono", "warn");
      return;
    }
    setBusy(true);
    const res = await register(name, pw1);
    setBusy(false);
    if (!res.ok) {
      toast(res.error, "warn");
      return;
    }
    if (res.migrated) toast("Dati del dispositivo importati nel tuo account");
    try {
      sessionStorage.setItem("mygympro-new-account", "1");
    } catch {}
    enter();
  };

  return (
    <div className="flex min-h-[78dvh] flex-col justify-center py-8">
      <div className="card-in mb-7" style={{ "--i": 0 } as React.CSSProperties}>
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent shadow-[0_10px_34px_var(--accent-glow)]">
          <Barbell size={30} weight="bold" color="var(--accent-ink)" />
        </span>
        <h1 className="display text-[36px] leading-none">
          MyGym<span className="text-accent">Pro</span>
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          {accounts.length
            ? "Chi si allena oggi?"
            : "Crea il tuo account per iniziare: ogni persona ha schede, workout e progressi tutti suoi."}
        </p>
      </div>

      {accounts.length > 0 && (
        <div className="card-in mb-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4" style={{ "--i": 1 } as React.CSSProperties}>
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setPw("");
                if (a.demo) {
                  login(a.id, "").then((r) => (r.ok ? enter() : toast(r.error, "warn")));
                } else {
                  setPick(a);
                }
              }}
              className="press flex flex-col items-center gap-2 rounded-[16px] border border-line bg-surface p-3.5 transition-colors hover:border-line-strong"
            >
              <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-[18px] font-bold text-accent">
                {a.avatar ? (
                  <img src={a.avatar} alt="" className="h-full w-full object-cover" />
                ) : a.demo ? (
                  <Sparkle size={22} weight="fill" color="var(--amber)" />
                ) : (
                  initialsOf(a.name)
                )}
                {a.admin && (
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber">
                    <ShieldStar size={14} weight="fill" color="#1d1607" />
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[13px] font-bold">
                {a.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {!creating && accounts.length > 0 && (
        <button
          onClick={() => setCreating(true)}
          className="card-in press flex items-center justify-center gap-2 rounded-full border border-line bg-surface-2 px-5 py-3 text-[14px] font-semibold text-ink-2 hover:text-ink"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          <Plus size={16} weight="bold" />
          Nuovo account
        </button>
      )}

      {creating && (
        <div className="card-in flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-4" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold">Nuovo account</h2>
            {accounts.length > 0 && (
              <button
                aria-label="Chiudi"
                onClick={() => setCreating(false)}
                className="press flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-ink-3"
              >
                <X size={15} weight="bold" />
              </button>
            )}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Il tuo nome"
            autoComplete="username"
            className="h-12 rounded-[12px] border border-line bg-surface-2 px-4 text-[15px] outline-none transition-colors placeholder:text-ink-3 focus:border-accent"
          />
          <PasswordInput value={pw1} onChange={setPw1} placeholder="Password (minimo 4 caratteri)" autoComplete="new-password" />
          <PasswordStrength value={pw1} className="px-0.5" />
          <PasswordInput value={pw2} onChange={setPw2} placeholder="Ripeti la password" autoComplete="new-password" onEnter={doRegister} />
          {firstReal && (
            <div className="flex items-start gap-2 rounded-[12px] bg-amber-soft px-3.5 py-2.5 text-[12.5px] font-medium leading-snug text-amber">
              <ShieldStar size={16} weight="fill" className="mt-0.5 shrink-0" />
              Primo account del dispositivo: sarai l'amministratore e gestirai
              tutti gli account che si registreranno.
              {legacy ? " I dati già presenti qui verranno importati nel tuo profilo." : ""}
            </div>
          )}
          <Button variant="primary" disabled={busy} onClick={doRegister}>
            {busy ? "Un attimo..." : "Crea e inizia"}
            {!busy && <ArrowRight size={17} weight="bold" />}
          </Button>
        </div>
      )}

      <button
        onClick={() => {
          enterAsGuest();
          window.location.reload();
        }}
        className="card-in press mt-3 text-center text-[13px] font-semibold text-ink-3 underline underline-offset-4 hover:text-ink"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        Prova senza account: continua come ospite
      </button>
      <button
        onClick={() => {
          setSupName("");
          setSupPw("");
          setSuperOpen(true);
        }}
        className="card-in press mt-1 text-center text-[11.5px] font-medium text-ink-3 hover:text-ink-2"
        style={{ "--i": 4 } as React.CSSProperties}
      >
        Accesso super admin
      </button>

      <Sheet open={superOpen} onClose={() => setSuperOpen(false)} title="Accesso super admin">
        <div className="flex flex-col gap-3 pb-2">
          <input
            value={supName}
            onChange={(e) => setSupName(e.target.value)}
            placeholder="Nome utente"
            autoFocus
            autoComplete="username"
            className="h-12 rounded-[12px] border border-line bg-surface-2 px-4 text-[15px] outline-none transition-colors placeholder:text-ink-3 focus:border-accent"
          />
          <PasswordInput
            value={supPw}
            onChange={setSupPw}
            placeholder="Password"
            onEnter={async () => {
              const r = await superAdminLogin(supName, supPw);
              if (r.ok) enter();
              else toast(r.error, "warn");
            }}
          />
          <Button
            variant="primary"
            onClick={async () => {
              const r = await superAdminLogin(supName, supPw);
              if (r.ok) enter();
              else toast(r.error, "warn");
            }}
          >
            Entra come super admin
          </Button>
        </div>
      </Sheet>

      <Sheet open={pick != null} onClose={() => setPick(null)} title={pick ? `Ciao, ${pick.name}` : ""}>
        <div className="flex flex-col gap-3 pb-2">
          <PasswordInput value={pw} onChange={setPw} placeholder="Password" autoFocus onEnter={doLogin} />
          <Button variant="primary" disabled={busy} onClick={doLogin}>
            {busy ? "Controllo..." : "Entra"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
