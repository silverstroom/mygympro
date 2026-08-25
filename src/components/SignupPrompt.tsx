"use client";

import { useState } from "react";
import { create } from "zustand";
import {
  ArrowRight,
  ChartLineUp,
  CompassRose,
  Palette,
  ShieldCheck,
  SquaresFour,
  UserCirclePlus,
  Watch,
} from "@phosphor-icons/react";
import { currentAccount, register } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Button, Sheet, toast } from "@/components/ui";
import PasswordInput from "@/components/PasswordInput";
import PasswordStrength from "@/components/PasswordStrength";

export type SignupReason =
  | "timed"
  | "library"
  | "workouts"
  | "theme"
  | "devices"
  | "post-workout"
  | "coach";

const PROMPT_KEY = "mygympro-signup-prompt-v1";
const TIMED_COOLDOWN_MS = 4 * 60 * 1000;
const TIMED_MAX = 3;

interface PromptMeta {
  lastAt: number;
  count: number;
}

function readMeta(): PromptMeta {
  try {
    const raw = localStorage.getItem(PROMPT_KEY);
    const m = raw ? (JSON.parse(raw) as PromptMeta) : null;
    return m && typeof m.lastAt === "number" ? m : { lastAt: 0, count: 0 };
  } catch {
    return { lastAt: 0, count: 0 };
  }
}

function writeMeta(m: PromptMeta) {
  try {
    localStorage.setItem(PROMPT_KEY, JSON.stringify(m));
  } catch {}
}

export const useSignup = create<{
  open: boolean;
  reason: SignupReason;
  show: (reason: SignupReason) => void;
  showTimed: () => void;
  hide: () => void;
}>((set) => ({
  open: false,
  reason: "timed",
  show: (reason) => {
    const m = readMeta();
    writeMeta({ lastAt: Date.now(), count: m.count + 1 });
    set({ open: true, reason });
  },
  showTimed: () => {
    const account = currentAccount();
    if (!account?.guest) return;
    const m = readMeta();
    if (m.count >= TIMED_MAX) return;
    if (Date.now() - m.lastAt < TIMED_COOLDOWN_MS) return;
    writeMeta({ lastAt: Date.now(), count: m.count + 1 });
    set({ open: true, reason: "timed" });
  },
  hide: () => {
    writeMeta({ ...readMeta(), lastAt: Date.now() });
    set({ open: false });
  },
}));

const REASON_TITLE: Record<SignupReason, string> = {
  timed: "Ti sta piacendo? Rendila tua",
  library: "Sblocca tutti i 1.324 esercizi",
  workouts: "Da ospite lo storico si ferma a 3",
  theme: "La personalizzazione è degli iscritti",
  devices: "L'import da dispositivi è degli iscritti",
  "post-workout": "Bel lavoro: non perderlo",
  coach: "Metti al sicuro i tuoi progressi",
};

const REASON_SUB: Record<SignupReason, string> = {
  timed:
    "Stai usando MyGymPro da ospite: funziona, ma il meglio arriva con un account. Gratis, trenta secondi.",
  library:
    "Da ospite vedi 150 esercizi: con un account gratuito si apre l'intera libreria con demo animate e istruzioni.",
  workouts:
    "Hai già salvato 3 allenamenti da ospite. Con un account gratuito lo storico non ha limiti.",
  theme:
    "Colori, sfondi e foto profilo si agganciano a un account: creane uno gratis e fai tua l'app.",
  devices:
    "Corse e allenamenti da Apple Watch e smartwatch si importano in un account gratuito.",
  "post-workout":
    "Questo allenamento è nei tuoi 3 da ospite. Con un account gratuito ogni serie resta nello storico, per sempre.",
  coach:
    "I progressi che stai costruendo da ospite meritano un posto sicuro: crea il tuo account gratuito.",
};

const PERKS = [
  { icon: ChartLineUp, text: "Tracciamento completo dei risultati: storico senza limiti, grafici, record e 1RM" },
  { icon: SquaresFour, text: "Tutti i 1.324 esercizi con demo animate e istruzioni in italiano" },
  { icon: CompassRose, text: "Piano su misura dal percorso guidato, con progressione dei carichi" },
  { icon: Palette, text: "Colori, sfondi e foto profilo tutti tuoi" },
  { icon: Watch, text: "Import da Apple Watch, Strava, Garmin e simili" },
  { icon: ShieldCheck, text: "Quello che hai fatto da ospite viene conservato nel tuo account" },
];

export default function SignupPrompt() {
  const { open, reason, hide } = useSignup();
  const [form, setForm] = useState(false);
  const [name, setName] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const workouts = useStore((s) => s.workouts);

  const close = () => {
    setForm(false);
    hide();
  };

  const doRegister = async () => {
    if (busy) return;
    if (pw1 !== pw2) {
      toast("Le due password non coincidono", "warn");
      return;
    }
    setBusy(true);
    const guest = currentAccount();
    const res = await register(name, pw1, {
      fromGuestId: guest?.guest ? guest.id : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      toast(res.error, "warn");
      return;
    }
    window.location.replace("/");
  };

  return (
    <Sheet open={open} onClose={close} title={REASON_TITLE[reason]}>
      {!form ? (
        <div className="flex flex-col gap-3 pb-2">
          <p className="-mt-1 text-[13.5px] leading-relaxed text-ink-2">
            {REASON_SUB[reason]}
          </p>
          <div className="flex flex-col gap-2.5 rounded-[16px] border border-line bg-surface-2 p-4">
            {PERKS.map((p) => (
              <div key={p.text} className="flex items-start gap-2.5">
                <p.icon size={17} weight="fill" color="var(--accent)" className="mt-0.5 shrink-0" />
                <span className="text-[13px] leading-snug text-ink-2">{p.text}</span>
              </div>
            ))}
          </div>
          <Button variant="primary" onClick={() => setForm(true)}>
            <UserCirclePlus size={18} weight="bold" />
            Crea il tuo account gratis
          </Button>
          <Button variant="ghost" onClick={close}>
            Più tardi
          </Button>
          <p className="px-1 text-center text-[11.5px] text-ink-3">
            Niente email, niente carta: nome e password, i dati restano su
            questo dispositivo.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Il tuo nome"
            autoFocus
            autoComplete="username"
            className="h-12 rounded-[12px] border border-line bg-surface-2 px-4 text-[15px] outline-none transition-colors placeholder:text-ink-3 focus:border-accent"
          />
          <PasswordInput
            value={pw1}
            onChange={setPw1}
            placeholder="Password (minimo 4 caratteri)"
            autoComplete="new-password"
          />
          <PasswordStrength value={pw1} className="px-0.5" />
          <PasswordInput
            value={pw2}
            onChange={setPw2}
            placeholder="Ripeti la password"
            autoComplete="new-password"
            onEnter={doRegister}
          />
          {workouts.length > 0 && (
            <p className="px-1 text-[12px] text-ink-3">
              {workouts.length}{" "}
              {workouts.length === 1 ? "allenamento fatto" : "allenamenti fatti"}{" "}
              da ospite: passano tutti nel nuovo account.
            </p>
          )}
          <Button variant="primary" disabled={busy} onClick={doRegister}>
            {busy ? "Un attimo..." : "Crea e continua"}
            {!busy && <ArrowRight size={17} weight="bold" />}
          </Button>
          <Button variant="ghost" onClick={() => setForm(false)}>
            Indietro
          </Button>
        </div>
      )}
    </Sheet>
  );
}
