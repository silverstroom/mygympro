"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Barbell, Plus, Trophy } from "@phosphor-icons/react";
import type { ExerciseIndex } from "@/lib/types";
import { loadIndex, loadSteps, resolveEx, detectMode } from "@/lib/data";
import { tBody, tEquip, tTarget } from "@/lib/it";
import { useStore } from "@/lib/store";
import { bestSetFor, e1rm, e1rmHistory } from "@/lib/calc";
import { lastSetsFor } from "@/lib/session";
import { fmtNum, fmtShort } from "@/lib/dates";
import { Button, Card, Sheet, Tag, toast } from "@/components/ui";
import { ExMedia } from "@/components/ExMedia";
import { LineChart } from "@/components/charts";
import { ROUTINE_ICONS } from "@/components/routineIcons";

export default function EsercizioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const custom = useStore((s) => s.custom);
  const workouts = useStore((s) => s.workouts);
  const routines = useStore((s) => s.routines);
  const saveRoutine = useStore((s) => s.saveRoutine);

  const [index, setIndex] = useState<ExerciseIndex[] | null>(null);
  const [steps, setSteps] = useState<string[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    loadIndex().then(setIndex).catch(() => {});
  }, []);

  const ex = index ? resolveEx(id, index, custom) : null;

  useEffect(() => {
    if (ex && !ex.i.startsWith("c_")) {
      loadSteps(ex.i)
        .then((d) => setSteps(d.it.length ? d.it : d.en))
        .catch(() => setSteps([]));
    }
  }, [ex]);

  const best = useMemo(() => (ex ? bestSetFor(workouts, ex.i) : null), [workouts, ex]);
  const last = useMemo(() => (ex ? lastSetsFor(workouts, ex.i) : null), [workouts, ex]);
  const curve = useMemo(
    () => (ex ? e1rmHistory(workouts, ex.i).map((p) => ({ d: p.d, y: Math.round(p.y * 10) / 10 })) : []),
    [workouts, ex]
  );

  if (index && !ex) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="text-[16px] font-bold">Esercizio non trovato</div>
        <Button onClick={() => router.push("/esercizi")}>Torna alla libreria</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2.5">
        <button
          aria-label="Indietro"
          onClick={() => router.back()}
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2"
        >
          <ArrowLeft size={19} weight="bold" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[19px] font-bold capitalize leading-tight">
          {ex?.n ?? "..."}
        </h1>
        <Button
          variant="primary"
          className="min-h-[40px] shrink-0 px-3.5 text-[13px]"
          onClick={() => setAddOpen(true)}
        >
          <Plus size={15} weight="bold" />
          In scheda
        </Button>
      </div>

      {!ex && <div className="skeleton aspect-[4/3] w-full" />}

      {ex && (
        <div className="card-in flex flex-col gap-3.5">
          <ExMedia ex={ex} animate />

          <div className="flex flex-wrap gap-1.5">
            <Tag tone="accent">{tTarget(ex.t)}</Tag>
            <Tag>{tBody(ex.b)}</Tag>
            <Tag>{tEquip(ex.e)}</Tag>
            {ex.s.slice(0, 4).map((m) => (
              <Tag key={m}>{tTarget(m)}</Tag>
            ))}
          </div>

          {(best || last) && (
            <Card>
              <h2 className="display mb-2.5 text-[15px] text-ink-2">I tuoi numeri</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {best && (
                  <div className="rounded-[13px] bg-surface-2 p-3">
                    <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber">
                      <Trophy size={13} weight="fill" />
                      Best
                    </div>
                    <div className="tnum text-[19px] font-bold">
                      {fmtNum(best.w)} kg × {best.r}
                    </div>
                    <div className="text-[11.5px] text-ink-3">{fmtShort(best.d)}</div>
                  </div>
                )}
                {best && best.e1rm > 0 && (
                  <div className="rounded-[13px] bg-surface-2 p-3">
                    <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-accent">
                      1RM stimato
                    </div>
                    <div className="tnum text-[19px] font-bold">
                      {fmtNum(Math.round(best.e1rm * 10) / 10)} kg
                    </div>
                    <div className="text-[11.5px] text-ink-3">
                      formula di Epley
                    </div>
                  </div>
                )}
              </div>
              {last && (
                <div className="mt-2.5 text-[12.5px] text-ink-3">
                  Ultima sessione ({fmtShort(last.d)}):{" "}
                  <span className="tnum">
                    {last.sets
                      .map((s) =>
                        s.sec != null
                          ? `${s.sec}s`
                          : s.min != null
                            ? `${s.min}min`
                            : `${s.w != null && s.w > 0 ? fmtNum(s.w) + "×" : ""}${s.r ?? 0}`
                      )
                      .join(" · ")}
                  </span>
                </div>
              )}
              {curve.length >= 2 && (
                <div className="mt-2">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-3">
                    Curva 1RM stimato
                  </div>
                  <LineChart data={curve} unit="kg" h={120} />
                </div>
              )}
            </Card>
          )}

          {steps === null && !ex.i.startsWith("c_") && (
            <Card>
              <div className="flex flex-col gap-2">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-5/6" />
                <div className="skeleton h-4 w-4/6" />
              </div>
            </Card>
          )}

          {steps && steps.length > 0 && (
            <Card>
              <h2 className="display mb-3 text-[15px] text-ink-2">Esecuzione</h2>
              <ol className="flex flex-col gap-2.5">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-ink-2">
                    <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[12px] font-bold text-accent">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <div className="px-1 text-[11px] leading-relaxed text-ink-3">
            Immagini e animazioni: © Gym visual · gymvisual.com, via
            exercises-dataset (MIT).
          </div>
        </div>
      )}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Aggiungi a una scheda">
        <div className="flex flex-col gap-2 pb-2">
          {routines.map((r) => {
            const Icon = ROUTINE_ICONS[r.icon] ?? Barbell;
            const already = r.exercises.some((e) => e.exId === id);
            return (
              <button
                key={r.id}
                disabled={already}
                onClick={() => {
                  if (!ex) return;
                  const mode = detectMode(ex);
                  saveRoutine({
                    ...r,
                    exercises: [
                      ...r.exercises,
                      {
                        exId: ex.i,
                        sets: 3,
                        reps: 10,
                        restSec: 90,
                        mode,
                        sec: mode === "time" ? 45 : undefined,
                        min: mode === "cardio" ? 20 : undefined,
                        speed: mode === "cardio" ? 8 : undefined,
                        k: Math.random().toString(36).slice(2, 9),
                      },
                    ],
                  });
                  setAddOpen(false);
                  toast(`Aggiunto a ${r.name}`);
                }}
                className={`press flex w-full items-center gap-3 rounded-[14px] border border-line bg-surface-2 p-3 text-left ${
                  already ? "opacity-45" : ""
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-surface-3">
                  <Icon size={20} weight="bold" color="var(--accent)" />
                </span>
                <span className="flex-1 text-[15px] font-bold">{r.name}</span>
                <span className="text-[12.5px] text-ink-3">
                  {already ? "già presente" : `${r.exercises.length} es.`}
                </span>
              </button>
            );
          })}
          {!routines.length && (
            <div className="py-3 text-center text-[13.5px] text-ink-2">
              Non hai ancora schede: creane una nella sezione Piano.
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
