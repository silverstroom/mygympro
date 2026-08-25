"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import {
  DownloadSimple,
  Sparkle,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { exportJSON, importJSON, useStore } from "@/lib/store";
import { buildDemoState } from "@/lib/demo";
import { Button, Card, Sheet, toast } from "@/components/ui";
import Stepper from "@/components/Stepper";

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
          className={`h-6 w-6 rounded-full shadow-sm ${on ? "ml-auto bg-accent-ink" : "bg-ink-3"}`}
          style={{ background: on ? "var(--accent-ink)" : "var(--text-2)" }}
        />
      </span>
    </button>
  );
}

export default function ImpostazioniPage() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const workouts = useStore((s) => s.workouts);
  const demo = useStore((s) => s.demo);
  const loadState = useStore((s) => s.loadState);
  const resetAll = useStore((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

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

  return (
    <div className="flex flex-col gap-3.5">
      <h1 className="display card-in text-[30px]" style={{ "--i": 0 } as React.CSSProperties}>
        Impostazioni
      </h1>

      <Card className="card-in" style={{ "--i": 1 } as React.CSSProperties}>
        <h2 className="display mb-2 text-[15px] text-ink-2">Profilo</h2>
        <label className="mb-1 block text-[12.5px] font-semibold text-ink-3">
          Nome
        </label>
        <input
          value={settings.name}
          onChange={(e) => setSettings({ name: e.target.value })}
          placeholder="Come ti chiami?"
          className="h-12 w-full rounded-[12px] border border-line bg-surface-2 px-4 text-[15px] outline-none transition-colors placeholder:text-ink-3 focus:border-accent"
        />
      </Card>

      <Card className="card-in" style={{ "--i": 2 } as React.CSSProperties}>
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
        </div>
      </Card>

      <Card className="card-in" style={{ "--i": 3 } as React.CSSProperties}>
        <h2 className="display mb-2 text-[15px] text-ink-2">I tuoi dati</h2>
        <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
          Tutto vive solo su questo dispositivo: {workouts.length} workout,
          nessun account, nessun server. Il backup è un file JSON che puoi
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
            Azzera tutto
          </Button>
        </div>
      </Card>

      <Card className="card-in" style={{ "--i": 4 } as React.CSSProperties}>
        <h2 className="display mb-2 text-[15px] text-ink-2">Informazioni</h2>
        <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-ink-2">
          <p>
            <span className="font-bold text-ink">MyGymPro</span> · il tuo
            allenamento, i tuoi dati. Ispirata al progetto open source openGym.
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

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Azzerare tutto?">
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-[14px] leading-relaxed text-ink-2">
            Schede, workout, pesi e impostazioni verranno eliminati da questo
            dispositivo. Se vuoi tenerli, esporta prima il backup.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              resetAll();
              setConfirmReset(false);
              toast("Dati azzerati");
            }}
          >
            <Trash size={17} weight="bold" />
            Elimina tutto
          </Button>
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Annulla
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
