"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import type { ExerciseIndex } from "@/lib/types";
import { equipmentOptions, imgUrl, loadIndex, searchExercises } from "@/lib/data";
import { BODY_IT, tBody, tEquip, tTarget } from "@/lib/it";
import { useStore } from "@/lib/store";
import { Button, Chip } from "@/components/ui";
import { ExThumb } from "@/components/ExMedia";
import { isGuest, GUEST_EX_LIMIT } from "@/lib/guest";
import { useSignup } from "@/components/SignupPrompt";
import { LockSimple } from "@phosphor-icons/react";

const PAGE = 48;

export default function EserciziPage() {
  const custom = useStore((s) => s.custom);
  const [index, setIndex] = useState<ExerciseIndex[] | null>(null);
  const [q, setQ] = useState("");
  const [bp, setBp] = useState<string | null>(null);
  const [eq, setEq] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    loadIndex().then(setIndex).catch(() => {});
    setGuest(isGuest());
  }, []);

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

  return (
    <div className="flex flex-col gap-3">
      <div className="card-in flex items-baseline justify-between" style={{ "--i": 0 } as React.CSSProperties}>
        <h1 className="display text-[30px]">Esercizi</h1>
        <span className="tnum text-[13px] font-medium text-ink-3">
          {index ? (guest ? `${Math.min(GUEST_EX_LIMIT, results.length)} di ${results.length}` : results.length) : "..."}
        </span>
      </div>

      <div className="card-in flex items-center gap-2 rounded-[12px] border border-line bg-surface-2 px-3.5" style={{ "--i": 1 } as React.CSSProperties}>
        <MagnifyingGlass size={18} color="var(--text-3)" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca: panca, squat, dorsali..."
          className="h-11 w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3"
        />
        {q && (
          <button aria-label="Pulisci ricerca" onClick={() => setQ("")} className="press text-ink-3">
            <X size={16} weight="bold" />
          </button>
        )}
      </div>

      <div className="no-scrollbar card-in -mx-4 flex gap-2 overflow-x-auto px-4" style={{ "--i": 2 } as React.CSSProperties}>
        {Object.keys(BODY_IT).map((k) => (
          <Chip
            key={k}
            on={bp === k}
            onClick={() => {
              setBp(bp === k ? null : k);
              setEq(null);
            }}
          >
            {tBody(k)}
          </Chip>
        ))}
      </div>

      {bp && eqOptions.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {eqOptions.map((k) => (
            <Chip key={k} on={eq === k} onClick={() => setEq(eq === k ? null : k)}>
              {tEquip(k)}
            </Chip>
          ))}
        </div>
      )}

      {!index && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="skeleton aspect-[5/6] w-full" />
          ))}
        </div>
      )}

      {index && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <div className="text-[16px] font-bold">Nessun risultato</div>
          <p className="max-w-[280px] text-[13.5px] text-ink-2">
            Prova con un termine diverso o togli qualche filtro.
          </p>
          <Button onClick={() => { setQ(""); setBp(null); setEq(null); }}>
            Azzera filtri
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {results.slice(0, guest ? Math.min(limit, GUEST_EX_LIMIT) : limit).map((ex, i) => (
          <div
            key={ex.i}
            className={i < 12 ? "card-in" : undefined}
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "auto 210px",
              "--i": Math.min(i, 12),
            } as React.CSSProperties}
          >
            <Link
              href={`/esercizi/${ex.i}`}
              className="press-soft block overflow-hidden rounded-[16px] border border-line bg-surface transition-colors hover:border-line-strong"
            >
              <div className="aspect-square w-full bg-white p-2">
                <ExThumbFill ex={ex} />
              </div>
              <div className="p-2.5">
                <div className="line-clamp-2 text-[13px] font-bold capitalize leading-tight">
                  {ex.n}
                </div>
                <div className="mt-0.5 truncate text-[11.5px] text-ink-3">
                  {tTarget(ex.t)}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {guest && results.length > GUEST_EX_LIMIT && limit >= GUEST_EX_LIMIT ? (
        <button
          onClick={() => useSignup.getState().show("library")}
          className="press flex w-full flex-col items-center gap-2 rounded-[16px] border border-[color:var(--accent)] bg-accent-soft p-5 text-center"
        >
          <LockSimple size={22} weight="fill" color="var(--accent)" />
          <span className="text-[15px] font-bold">
            Altri {results.length - GUEST_EX_LIMIT} esercizi ti aspettano
          </span>
          <span className="max-w-[300px] text-[12.5px] leading-snug text-ink-2">
            Da ospite vedi {GUEST_EX_LIMIT} esercizi: crea un account gratuito e
            sblocca l'intera libreria con demo animate.
          </span>
        </button>
      ) : results.length > (guest ? Math.min(limit, GUEST_EX_LIMIT) : limit) ? (
        <Button onClick={() => setLimit((l) => l + PAGE)}>
          Mostra altri {Math.min(PAGE, results.length - limit)}
        </Button>
      ) : null}
    </div>
  );
}

function ExThumbFill({ ex }: { ex: ExerciseIndex }) {
  if (!ex.m) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-surface-2">
        <ExThumb ex={ex} size={64} />
      </div>
    );
  }
  return (
    <img
      src={imgUrl(ex)}
      alt={ex.n}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-contain"
    />
  );
}
