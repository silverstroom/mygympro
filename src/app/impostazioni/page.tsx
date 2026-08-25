"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Camera,
  CaretRight,
  DownloadSimple,
  Key,
  Palette,
  Ruler,
  ShieldStar,
  SignOut,
  Sparkle,
  Trash,
  UploadSimple,
  Watch,
} from "@phosphor-icons/react";
import { exportJSON, importJSON, useStore } from "@/lib/store";
import { buildDemoState } from "@/lib/demo";
import type { Account } from "@/lib/auth";
import {
  changePassword,
  currentAccount,
  deleteAccount,
  listAccounts,
  logout,
  setAvatar,
} from "@/lib/auth";
import { ACCENTS, BGS, DEFAULT_ACCENT, DEFAULT_BG } from "@/lib/themes";
import { createAppleParser, parseActivitiesCsv } from "@/lib/importers";
import { useSignup } from "@/components/SignupPrompt";
import PasswordInput from "@/components/PasswordInput";
import { UserCirclePlus } from "@phosphor-icons/react";
import { Button, Card, Sheet, toast } from "@/components/ui";
import Stepper from "@/components/Stepper";
import PasswordStrength from "@/components/PasswordStrength";
import { initialsOf } from "@/components/AuthScreen";

function Switch({
  on,
  onChange,
  label,
  sub,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="press-soft flex w-full items-center gap-3 py-2.5 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold">{label}</span>
        {sub && <span className="block text-[12.5px] leading-snug text-ink-3">{sub}</span>}
      </span>
      <span
        className={`flex h-[30px] w-[52px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-200 ${
          on ? "bg-accent" : "bg-surface-3"
        }`}
      >
        <motion.span
          layout
          transition={{ type: "spring", duration: 0.35, bounce: 0.2 }}
          className={`h-6 w-6 rounded-full shadow-sm ${on ? "ml-auto" : ""}`}
          style={{ background: on ? "var(--accent-ink)" : "var(--text-2)" }}
        />
      </span>
    </button>
  );
}

export default function ImpostazioniPage() {
  const router = useRouter();
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const workouts = useStore((s) => s.workouts);
  const demo = useStore((s) => s.demo);
  const loadState = useStore((s) => s.loadState);
  const resetAll = useStore((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [me, setMe] = useState<Account | null>(null);
  const [accountCount, setAccountCount] = useState(0);
  const [pwOpen, setPwOpen] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw1, setNewPw1] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [confirmDelAccount, setConfirmDelAccount] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const appleRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const activities = useStore((s) => s.activities);
  const addActivities = useStore((s) => s.addActivities);
  const clearActivities = useStore((s) => s.clearActivities);

  useEffect(() => {
    setMe(currentAccount());
    setAccountCount(listAccounts().length);
  }, []);

  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mygympro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup scaricato");
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = importJSON(String(reader.result));
      if (res.ok) toast("Dati importati");
      else toast(res.error ?? "Import non riuscito", "warn");
    };
    reader.readAsText(file);
  };

  const onAvatarFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 144;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const s = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - s) / 2,
        (img.height - s) / 2,
        s,
        s,
        0,
        0,
        size,
        size
      );
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      if (me && setAvatar(me.id, dataUrl)) {
        setMe(currentAccount());
        toast("Foto profilo aggiornata");
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast("Immagine non leggibile", "warn");
    };
    img.src = url;
  };

  const importApple = async (file: File) => {
    setImporting(true);
    try {
      const parser = createAppleParser();
      const dec = new TextDecoder();
      if (file.name.toLowerCase().endsWith(".zip")) {
        const { Unzip, UnzipInflate } = await import("fflate");
        await new Promise<void>((resolve, reject) => {
          let found = false;
          const unzipper = new Unzip((f) => {
            if (f.name.toLowerCase().endsWith("export.xml") || (!found && f.name.toLowerCase().endsWith(".xml"))) {
              found = true;
              f.ondata = (err, data, final) => {
                if (err) {
                  reject(err);
                  return;
                }
                parser.feed(dec.decode(data, { stream: !final }));
                if (final) resolve();
              };
              f.start();
            }
          });
          unzipper.register(UnzipInflate);
          const reader = file.stream().getReader();
          const pump = (): Promise<void> =>
            reader.read().then(({ done, value }) => {
              unzipper.push(value ?? new Uint8Array(0), done);
              if (!done) return pump();
              if (!found) reject(new Error("export.xml non trovato nello zip"));
            });
          pump().catch(reject);
        });
      } else {
        const reader = file.stream().getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (value) parser.feed(dec.decode(value, { stream: !done }));
          if (done) break;
        }
      }
      const res = parser.finish();
      if (!res.activities.length && !res.bodyweight.length) {
        toast("Nel file non ci sono allenamenti o pesate", "warn");
        return;
      }
      const { added, weights } = addActivities(res.activities, res.bodyweight);
      toast(
        `Importati: ${added} ${added === 1 ? "attività" : "attività"} e ${weights} pesate`
      );
    } catch {
      toast("Import non riuscito: controlla il file", "warn");
    } finally {
      setImporting(false);
    }
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const res = parseActivitiesCsv(text);
      if (!res.activities.length) {
        toast("Nessuna attività riconosciuta nel CSV", "warn");
        return;
      }
      const { added } = addActivities(res.activities, []);
      toast(`Importate ${added} attività`);
    } catch {
      toast("Import non riuscito: controlla il file", "warn");
    } finally {
      setImporting(false);
    }
  };

  const doChangePw = async () => {
    if (!me) return;
    if (newPw1 !== newPw2) {
      toast("Le due password non coincidono", "warn");
      return;
    }
    const res = await changePassword(me.id, oldPw, newPw1);
    if (res.ok) {
      toast("Password aggiornata");
      setPwOpen(false);
      setOldPw("");
      setNewPw1("");
      setNewPw2("");
    } else {
      toast(res.error ?? "Errore", "warn");
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <h1 className="display card-in text-[30px]" style={{ "--i": 0 } as React.CSSProperties}>
        Impostazioni
      </h1>

      <Card className="card-in" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="flex items-center gap-3">
          <button
            aria-label="Cambia foto profilo"
            onClick={() => avatarRef.current?.click()}
            className="press relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-[17px] font-bold text-accent"
          >
            {me?.avatar ? (
              <img src={me.avatar} alt="" className="h-full w-full object-cover" />
            ) : me ? (
              me.demo ? <Sparkle size={20} weight="fill" color="var(--amber)" /> : initialsOf(me.name)
            ) : (
              "?"
            )}
            <span className="absolute inset-x-0 bottom-0 flex justify-center bg-[rgba(0,0,0,0.55)] py-0.5">
              <Camera size={11} weight="bold" color="#fff" />
            </span>
          </button>
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAvatarFile(f);
              e.target.value = "";
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[16px] font-bold">{me?.name ?? "..."}</span>
              {me?.admin && (
                <span className="flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-[10.5px] font-bold text-amber">
                  <ShieldStar size={11} weight="fill" />
                  Admin
                </span>
              )}
            </div>
            <div className="text-[12px] text-ink-3">
              {workouts.length} workout in questo profilo
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              window.location.replace("/");
            }}
            className="press flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-[12.5px] font-bold text-ink-2 hover:text-ink"
          >
            <SignOut size={15} weight="bold" />
            {me?.guest ? "Accedi" : "Esci"}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-2">
            <Ruler size={16} weight="bold" color="var(--text-3)" />
            Altezza (per il BMI)
          </span>
          <div className="w-[150px]">
            <Stepper
              value={settings.height ?? 0}
              onChange={(v) => setSettings({ height: v >= 120 ? v : null })}
              step={1}
              min={0}
              max={230}
              suffix="cm"
            />
          </div>
        </div>
        {me?.avatar && (
          <button
            onClick={() => {
              if (me && setAvatar(me.id, null)) {
                setMe(currentAccount());
                toast("Foto rimossa");
              }
            }}
            className="press mt-2 text-[12px] font-semibold text-ink-3 underline underline-offset-2"
          >
            Rimuovi la foto profilo
          </button>
        )}
        {me?.guest && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="mb-2.5 text-[12.5px] leading-snug text-ink-2">
              Stai usando MyGymPro da ospite: workout salvabili limitati a 3 e
              libreria ridotta. Con un account gratuito sblocchi tutto e i dati
              fatti finora vengono conservati.
            </p>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => useSignup.getState().show("timed")}
            >
              <UserCirclePlus size={18} weight="bold" />
              Crea il tuo account gratis
            </Button>
          </div>
        )}
        {me && !me.demo && !me.guest && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
            <button
              onClick={() => setPwOpen(true)}
              className="press flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-[12.5px] font-semibold text-ink-2"
            >
              <Key size={14} weight="bold" />
              Cambia password
            </button>
            <button
              onClick={() => setConfirmDelAccount(true)}
              className="press flex items-center gap-1.5 rounded-full bg-red-soft px-3.5 py-2 text-[12.5px] font-bold text-red"
            >
              <Trash size={14} weight="bold" />
              Elimina account
            </button>
          </div>
        )}
      </Card>

      {me?.admin && (
        <Card
          className="card-in border-[rgba(251,191,36,0.3)]"
          style={{ "--i": 2 } as React.CSSProperties}
          onClick={() => router.push("/admin")}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-amber-soft">
              <ShieldStar size={22} weight="fill" color="var(--amber)" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15.5px] font-bold">Gestione account</div>
              <div className="text-[12.5px] text-ink-3">
                {accountCount} account su questo dispositivo · reset password,
                profili, eliminazione
              </div>
            </div>
            <CaretRight size={17} color="var(--text-3)" />
          </div>
        </Card>
      )}

      <Card className="card-in" style={{ "--i": 3 } as React.CSSProperties}>
        <div className="mb-2 flex items-center gap-2">
          <Palette size={17} weight="fill" color="var(--accent)" />
          <h2 className="display text-[15px] text-ink-2">Aspetto</h2>
        </div>
        <div className="mb-1 text-[12.5px] font-semibold text-ink-3">Colore</div>
        <div className="mb-3 flex flex-wrap gap-2.5">
          {Object.entries(ACCENTS).map(([key, a]) => {
            const on = (settings.accent ?? DEFAULT_ACCENT) === key;
            return (
              <button
                key={key}
                aria-label={a.name}
                title={a.name}
                onClick={() => {
                  if (me?.guest) {
                    useSignup.getState().show("theme");
                    return;
                  }
                  setSettings({ accent: key });
                }}
                className={`press h-10 w-10 rounded-full border-2 transition-transform ${
                  on ? "scale-110 border-[color:var(--text)]" : "border-transparent"
                }`}
                style={{ background: a.accent }}
              />
            );
          })}
        </div>
        <div className="mb-1 text-[12.5px] font-semibold text-ink-3">Sfondo</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(BGS).map(([key, b]) => {
            const on = (settings.bg ?? DEFAULT_BG) === key;
            return (
              <button
                key={key}
                onClick={() => {
                  if (me?.guest) {
                    useSignup.getState().show("theme");
                    return;
                  }
                  setSettings({ bg: key });
                }}
                className={`press flex items-center gap-2 rounded-full border px-3 py-2 text-[12.5px] font-semibold ${
                  on ? "border-accent text-ink" : "border-line text-ink-2"
                }`}
              >
                <span
                  className="h-5 w-5 rounded-full border border-line-strong"
                  style={{ background: `linear-gradient(135deg, ${b.bg} 50%, ${b.surface3} 50%)` }}
                />
                {b.name}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="card-in" style={{ "--i": 3 } as React.CSSProperties}>
        <h2 className="display mb-1 text-[15px] text-ink-2">Allenamento</h2>
        <div className="divide-y divide-[var(--line)]">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold">Recupero predefinito</span>
              <span className="block text-[12.5px] text-ink-3">
                Per gli esercizi aggiunti al volo
              </span>
            </span>
            <div className="w-[150px]">
              <Stepper
                value={settings.restSec}
                onChange={(v) => setSettings({ restSec: v })}
                step={15}
                min={15}
                max={600}
                suffix="s"
              />
            </div>
          </div>
          <Switch
            on={settings.sound}
            onChange={(v) => setSettings({ sound: v })}
            label="Suoni"
            sub="Beep a fine recupero e alla spunta delle serie"
          />
          <Switch
            on={settings.wakeLock}
            onChange={(v) => setSettings({ wakeLock: v })}
            label="Schermo sempre acceso"
            sub="Durante il workout il telefono non si blocca"
          />
          <Switch
            on={settings.weighAsk}
            onChange={(v) => setSettings({ weighAsk: v })}
            label="Chiedi il peso prima del workout"
            sub="Solo se oggi non l'hai già registrato"
          />
          <Switch
            on={!!settings.trackRir}
            onChange={(v) => setSettings({ trackRir: v })}
            label="Registra il RIR"
            sub="Ripetizioni in riserva per serie: con tanto margine la progressione fa il doppio salto"
          />
        </div>
      </Card>

      <Card className="card-in" style={{ "--i": 4 } as React.CSSProperties}>
        <div className="mb-2 flex items-center gap-2">
          <Watch size={17} weight="fill" color="var(--accent)" />
          <h2 className="display text-[15px] text-ink-2">Apple Watch e dispositivi</h2>
        </div>
        <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
          Porta dentro corse, nuotate e allenamenti tracciati da smartwatch:
          finiscono nella heatmap, nella striscia della settimana e nei minuti
          settimanali, insieme alle pesate.
        </p>
        <div className="mb-3 rounded-[13px] bg-surface-2 p-3 text-[12.5px] leading-relaxed text-ink-3">
          <span className="font-bold text-ink-2">Apple Watch:</span> su iPhone
          apri Salute, tocca la tua foto in alto, poi "Esporta tutti i dati" e
          carica qui il file (zip o xml).
          <br />
          <span className="font-bold text-ink-2">Garmin, Strava e altri:</span>{" "}
          esporta le attività in CSV e caricalo qui sotto.
        </div>
        <div className="flex flex-col gap-2">
          <Button
            disabled={importing}
            onClick={() => {
              if (me?.guest) {
                useSignup.getState().show("devices");
                return;
              }
              appleRef.current?.click();
            }}
          >
            <Watch size={18} weight="bold" />
            {importing ? "Importazione in corso..." : "Importa export Apple Salute"}
          </Button>
          <Button
            disabled={importing}
            onClick={() => {
              if (me?.guest) {
                useSignup.getState().show("devices");
                return;
              }
              csvRef.current?.click();
            }}
          >
            <UploadSimple size={18} weight="bold" />
            Importa CSV attività
          </Button>
          <input
            ref={appleRef}
            type="file"
            accept=".zip,.xml,application/zip,text/xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importApple(f);
              e.target.value = "";
            }}
          />
          <input
            ref={csvRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsv(f);
              e.target.value = "";
            }}
          />
          {(activities ?? []).length > 0 && (
            <div className="flex items-center justify-between rounded-[13px] bg-surface-2 px-3.5 py-2.5">
              <span className="text-[13px] font-semibold text-ink-2">
                {(activities ?? []).length} attività importate
              </span>
              <button
                onClick={() => {
                  clearActivities();
                  toast("Attività importate rimosse");
                }}
                className="press text-[12.5px] font-bold text-red"
              >
                Svuota
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card className="card-in" style={{ "--i": 5 } as React.CSSProperties}>
        <h2 className="display mb-2 text-[15px] text-ink-2">I tuoi dati</h2>
        <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
          Ogni account ha il suo spazio, solo su questo dispositivo: qui dentro
          ci sono {workouts.length} workout. Il backup è un file JSON che puoi
          reimportare quando vuoi.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={doExport}>
            <DownloadSimple size={18} weight="bold" />
            Esporta backup JSON
          </Button>
          <Button onClick={() => fileRef.current?.click()}>
            <UploadSimple size={18} weight="bold" />
            Importa backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              e.target.value = "";
            }}
          />
          {!demo && workouts.length === 0 && (
            <Button
              onClick={() => {
                loadState(buildDemoState(), true);
                toast("Dati demo caricati");
              }}
            >
              <Sparkle size={18} weight="fill" color="var(--amber)" />
              Carica dati demo
            </Button>
          )}
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            <Trash size={18} weight="bold" />
            Azzera i dati di questo profilo
          </Button>
        </div>
      </Card>

      <Card className="card-in" style={{ "--i": 6 } as React.CSSProperties}>
        <h2 className="display mb-2 text-[15px] text-ink-2">Informazioni</h2>
        <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-ink-2">
          <p>
            <span className="font-bold text-ink">MyGymPro</span> · il tuo
            allenamento, i tuoi dati. Creata da Salvo Bilotti, ispirata al
            progetto open source openGym.
          </p>
          <p>
            Libreria esercizi: 1.324 movimenti da{" "}
            <span className="text-ink">exercises-dataset</span> (licenza MIT).
            Immagini e animazioni © Gym visual · gymvisual.com, ridistribuite
            con attribuzione.
          </p>
          <p className="text-ink-3">
            1RM stimato con formula di Epley · progressione lineare con deload
            automatico al secondo stallo.
          </p>
        </div>
      </Card>

      <Sheet open={pwOpen} onClose={() => setPwOpen(false)} title="Cambia password">
        <div className="flex flex-col gap-3 pb-2">
          <PasswordInput value={oldPw} onChange={setOldPw} placeholder="Password attuale" />
          <PasswordInput value={newPw1} onChange={setNewPw1} placeholder="Nuova password (minimo 4 caratteri)" autoComplete="new-password" />
          <PasswordStrength value={newPw1} className="px-0.5" />
          <PasswordInput value={newPw2} onChange={setNewPw2} placeholder="Ripeti la nuova password" autoComplete="new-password" onEnter={doChangePw} />
          <Button variant="primary" onClick={doChangePw}>
            <Key size={16} weight="bold" />
            Aggiorna password
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={confirmDelAccount}
        onClose={() => setConfirmDelAccount(false)}
        title="Eliminare il tuo account?"
      >
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-[14px] leading-relaxed text-ink-2">
            Account e dati verranno eliminati da questo dispositivo per sempre.
            Se vuoi tenerli, esporta prima il backup.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              if (!me) return;
              const res = deleteAccount(me.id, me.id);
              if (res.ok) window.location.replace("/");
              else toast(res.error ?? "Operazione negata", "warn");
            }}
          >
            <Trash size={17} weight="bold" />
            Elimina il mio account
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelAccount(false)}>
            Annulla
          </Button>
        </div>
      </Sheet>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Azzerare questo profilo?">
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-[14px] leading-relaxed text-ink-2">
            Schede, workout e pesate di questo profilo verranno eliminati.
            L'account resta e potrai ripartire da zero.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              resetAll();
              setConfirmReset(false);
              toast("Profilo azzerato");
            }}
          >
            <Trash size={17} weight="bold" />
            Azzera i dati
          </Button>
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Annulla
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
