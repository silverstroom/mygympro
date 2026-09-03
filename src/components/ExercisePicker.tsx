"use client";

import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import type { ExerciseIndex } from "@/lib/types";
import {
  equipmentOptions,
  loadIndex,
  searchExercises,
} from "@/lib/data";
import { BODY_IT, tBody, tEquip, tTarget } from "@/lib/it";
import { useStore } from "@/lib/store";
import { Button, Chip, Sheet, toast } from "@/components/ui";
import { ExThumb } from "@/components/ExMedia";
import { isGuest, GUEST_EX_LIMIT } from "@/lib/guest";
import { useSignup } from "@/components/SignupPrompt";
import { LockSimple } from "@phosphor-icons/react";

const PAGE = 60;

export default function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ex: ExerciseIndex) => void;
}) {
  const custom = useStore((s) => s.custom);
  const addCustom = useStore((s) => s.addCustomExercise);
  const [index, setIndex] = useState<ExerciseIndex[] | null>(null);
  const [q, setQ] = useState("");
  const [bp, setBp] = useState<string | null>(null);
  const [eq, setEq] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [creating, setCreating] = useState(false);
  const [cName, setCName] = useState("");
  const [cBody, setCBody] = useState("chest");
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    if (open) setGuest(isGuest());
  }, [open]);

  useEffect(() => {
    if (open) loadIndex().then(setIndex).catch(() => toast("Impossibile caricare gli esercizi", "warn"));
  }, [open]);

  useEffect(() => {
    setLimit(PAGE);
  }, [q, bp, eq]);

  const results = useMemo(() => {
    if (!index) return [];
    return searchExercises(index, custom, q, bp, eq);
  }, [index, custom, q, bp, eq]);

  const eqOptions = useMemo(
    () => (index ? equipmentOptions(index, bp) : []),
    [index, bp]
  );

  const create = () => {
    const name = cName.trim();
    if (name.length < 2) {
      toast("Dai un nome all'esercizio", "warn");
      return;
    }
    const id = addCustom({
      name,
      bodyPart: cBody,
      target: cBody === "cardio" ? "cardiovascular system" : cBody,
      equipment: "body weight",
    });
    setCreating(false);
    setCName("");
    onPick({ i: id, n: name, b: cBody, e: "body weight", t: cBody, s: [], m: "" });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Scegli esercizio" tall>
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-2 rounded-[12px] border border-line bg-surface-2 px-3.5">
          <MagnifyingGlass size={18} color="var(--text-3)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca: panca, squat, dorsali..."
            className="h-11 w-full bg-transparent text-[16px] outline-none placeholder:text-ink-3"
          />
          {q && (
            <button aria-label="Pulisci ricerca" onClick={() => setQ("")} className="press text-ink-3">
              <X size={16} weight="bold" />
            </button>
          )}
        </div>

        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {Object.keys(BODY_IT).map((k) => (
            <Chip key={k} on={bp === k} onClick={() => { setBp(bp === k ? null : k); setEq(null); }}>
              {tBody(k)}
            </Chip>
          ))}
        </div>

        {bp && eqOptions.length > 1 && (
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {eqOptions.map((k) => (
              <Chip key={k} on={eq === k} onClick={() => setEq(eq === k ? null : k)}>
                {tEquip(k)}
              </Chip>
            ))}
          </div>
        )}

        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="press flex items-center gap-2 self-start rounded-full px-1 py-1 text-[13px] font-semibold text-accent"
          >
            <Plus size={15} weight="bold" />
            Crea un esercizio tuo
          </button>
        ) : (
          <div className="flex flex-col gap-2.5 rounded-[16px] border border-line bg-surface-2 p-3.5">
            <input
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="Nome esercizio"
              autoFocus
              className="h-11 rounded-[12px] border border-line bg-surface px-3.5 text-[16px] outline-none placeholder:text-ink-3 focus:border-accent"
            />
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {Object.keys(BODY_IT).map((k) => (
                <Chip key={k} on={cBody === k} onClick={() => setCBody(k)}>
                  {tBody(k)}
                </Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setCreating(false)}>
                Annulla
              </Button>
              <Button variant="primary" className="flex-1" onClick={create}>
                Crea e aggiungi
              </Button>
            </div>
          </div>
        )}

        <div className="text-[12px] font-medium text-ink-3">
          {index ? `${results.length} esercizi` : "Caricamento..."}
        </div>

        <div className="-mx-2 flex-1">
          {!index && (
            <div className="flex flex-col gap-2 px-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton h-16 w-full" />
              ))}
            </div>
          )}
          {index && results.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="text-[15px] font-semibold">Nessun risultato</div>
              <div className="max-w-[260px] text-[13px] text-ink-2">
                Prova con un altro nome, oppure crealo tu con il pulsante qui sopra.
              </div>
            </div>
          )}
          {results.slice(0, guest ? Math.min(limit, GUEST_EX_LIMIT) : limit).map((ex) => (
            <button
              key={ex.i}
              onClick={() => onPick(ex)}
              className="press-soft flex w-full items-center gap-3 rounded-[14px] px-2 py-2 text-left transition-colors hover:bg-surface-2"
              style={{ contentVisibility: "auto", containIntrinsicSize: "auto 64px" }}
            >
              <ExThumb ex={ex} size={52} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-semibold capitalize leading-tight">
                  {ex.n}
                </div>
                <div className="truncate text-[12.5px] text-ink-3">
                  {tTarget(ex.t)} · {tEquip(ex.e)}
                </div>
              </div>
              <Plus size={18} color="var(--accent)" weight="bold" className="shrink-0" />
            </button>
          ))}
          {guest && results.length > GUEST_EX_LIMIT && limit >= GUEST_EX_LIMIT ? (
            <div className="px-2 pb-2 pt-1">
              <button
                onClick={() => useSignup.getState().show("library")}
                className="press flex w-full items-center justify-center gap-2 rounded-full border border-[color:var(--accent)] bg-accent-soft px-4 py-3 text-[13px] font-bold text-accent"
              >
                <LockSimple size={15} weight="fill" />
                Sblocca gli altri {results.length - GUEST_EX_LIMIT} esercizi
              </button>
            </div>
          ) : results.length > (guest ? Math.min(limit, GUEST_EX_LIMIT) : limit) ? (
            <div className="px-2 pb-2 pt-1">
              <Button className="w-full" onClick={() => setLimit((l) => l + PAGE)}>
                Mostra altri {Math.min(PAGE, results.length - limit)}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}
