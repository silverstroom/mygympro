"use client";

import { Prohibit, ShieldCheck } from "@phosphor-icons/react";
import type { ExerciseIndex } from "@/lib/types";
import { cuesFor } from "@/lib/cues";

/** Accortezze ed errori da evitare: l'immagine da sola non basta. */
export default function ExerciseCues({
  ex,
  compact = false,
}: {
  ex: ExerciseIndex;
  compact?: boolean;
}) {
  const cues = cuesFor(ex);
  if (!cues.watch.length && !cues.avoid.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {!compact && (
        <h2 className="display text-[15px] text-ink-2">Come farlo bene</h2>
      )}
      {cues.watch.length > 0 && (
        <div className="rounded-[14px] border border-line bg-surface-2 p-3.5">
          <div className="mb-2 flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-wide text-accent">
            <ShieldCheck size={16} weight="fill" />
            Accortezze
          </div>
          <ul className="flex flex-col gap-1.5">
            {cues.watch.map((c) => (
              <li key={c} className="flex gap-2 text-[13.5px] leading-snug text-ink-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
      {cues.avoid.length > 0 && (
        <div className="rounded-[14px] border border-[rgba(248,113,113,0.28)] bg-red-soft p-3.5">
          <div className="mb-2 flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-wide text-red">
            <Prohibit size={16} weight="bold" />
            Da non fare
          </div>
          <ul className="flex flex-col gap-1.5">
            {cues.avoid.map((c) => (
              <li key={c} className="flex gap-2 text-[13.5px] leading-snug text-ink-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="px-1 text-[11px] leading-relaxed text-ink-3">
        {cues.source === "specifica"
          ? "Indicazioni per questo esercizio. Se hai dolore (non fatica), fermati."
          : "Indicazioni generali per questa famiglia di esercizi. Se hai dolore (non fatica), fermati."}
      </p>
    </div>
  );
}
