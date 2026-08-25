"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion, Reorder, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Barbell,
  DotsSixVertical,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import type { ExerciseIndex, ExMode, RoutineExercise } from "@/lib/types";
import { useStore } from "@/lib/store";
import { detectMode, loadIndex, resolveEx } from "@/lib/data";
import { tEquip, tTarget } from "@/lib/it";
import { Button, Card, Chip, Seg, Sheet, toast } from "@/components/ui";
import Stepper from "@/components/Stepper";
import ExercisePicker from "@/components/ExercisePicker";
import { ExThumb } from "@/components/ExMedia";
import { ROUTINE_ICONS, ROUTINE_ICON_KEYS } from "@/components/routineIcons";

function kgen(): string {
  return Math.random().toString(36).slice(2, 9);
}

function cfgLabel(re: RoutineExercise): string {
  if (re.mode === "cardio") return `${re.min ?? 20} min · ${re.speed ?? 8} km/h`;
  if (re.mode === "time") return `${re.sets} × ${re.sec ?? 45}s · ${re.restSec}s riposo`;
  return `${re.sets} × ${re.reps} · ${re.restSec}s riposo${re.tempo ? ` · tempo ${re.tempo}` : ""}`;
}

function CfgSheet({
  open,
  onClose,
  initial,
  exName,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: RoutineExercise | null;
  exName: string;
  onSave: (re: RoutineExercise) => void;
}) {
  const [mode, setMode] = useState<ExMode>("reps");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(90);
  const [sec, setSec] = useState(45);
  const [min, setMin] = useState(20);
  const [speed, setSpeed] = useState(8);
  const [tempo, setTempo] = useState("");

  useEffect(() => {
    if (initial && open) {
      setMode(initial.mode);
      setSets(initial.sets);
      setReps(initial.reps || 10);
      setRest(initial.restSec);
      setSec(initial.sec ?? 45);
      setMin(initial.min ?? 20);
      setSpeed(initial.speed ?? 8);
      setTempo(initial.tempo ?? "");
    }
  }, [initial, open]);

  if (!initial) return null;

  return (
    <Sheet open={open} onClose={onClose} title={exName}>
      <div className="flex flex-col gap-4 pb-2">
        <Seg
          options={[
            { value: "reps", label: "Serie × reps" },
            { value: "time", label: "A tempo" },
            { value: "cardio", label: "Cardio" },
          ]}
          value={mode}
          onChange={setMode}
        />
        {mode === "reps" && (
          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Serie" value={sets} onChange={setSets} min={1} max={10} />
            <Stepper label="Ripetizioni" value={reps} onChange={setReps} min={1} max={50} />
            <div className="col-span-2">
              <Stepper label="Riposo tra le serie (secondi)" value={rest} onChange={setRest} step={15} min={15} max={600} wide />
            </div>
            <div className="col-span-2">
              <div className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                Tempo di esecuzione (giù-fermo-su)
              </div>
              <Seg
                options={[
                  { value: "", label: "Libero" },
                  { value: "2-1-2", label: "2-1-2" },
                  { value: "3-1-3", label: "3-1-3" },
                  { value: "1-0-1", label: "1-0-1" },
                ]}
                value={tempo}
                onChange={setTempo}
              />
            </div>
          </div>
        )}
        {mode === "time" && (
          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Serie" value={sets} onChange={setSets} min={1} max={10} />
            <Stepper label="Secondi" value={sec} onChange={setSec} step={5} min={5} max={600} />
            <div className="col-span-2">
              <Stepper label="Riposo (secondi)" value={rest} onChange={setRest} step={15} min={15} max={600} wide />
            </div>
          </div>
        )}
        {mode === "cardio" && (
          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Minuti" value={min} onChange={setMin} min={1} max={240} />
            <Stepper label="km/h" value={speed} onChange={setSpeed} step={0.5} min={1} max={40} decimal />
          </div>
        )}
        <Button
          variant="primary"
          onClick={() => {
            onSave({
              ...initial,
              mode,
              sets: mode === "cardio" ? 1 : sets,
              reps,
              restSec: rest,
              sec: mode === "time" ? sec : initial.sec,
              min: mode === "cardio" ? min : initial.min,
              speed: mode === "cardio" ? speed : initial.speed,
              tempo: mode === "reps" && tempo ? tempo : undefined,
            });
            onClose();
          }}
        >
          Salva
        </Button>
      </div>
    </Sheet>
  );
}

export default function RoutineEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const reduce = useReducedMotion();
  const routines = useStore((s) => s.routines);
  const custom = useStore((s) => s.custom);
  const saveRoutine = useStore((s) => s.saveRoutine);
  const deleteRoutine = useStore((s) => s.deleteRoutine);
  const routine = routines.find((r) => r.id === id) ?? null;

  const [index, setIndex] = useState<ExerciseIndex[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cfgIdx, setCfgIdx] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    loadIndex().then(setIndex).catch(() => {});
  }, []);

  useEffect(() => {
    if (routine && routine.exercises.some((e) => !e.k)) {
      saveRoutine({
        ...routine,
        exercises: routine.exercises.map((e) => (e.k ? e : { ...e, k: kgen() })),
      });
    }
  }, [routine, saveRoutine]);

  const exList = useMemo(() => routine?.exercises ?? [], [routine]);

  if (!routine) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="text-[16px] font-bold">Scheda non trovata</div>
        <Button onClick={() => router.push("/piano")}>Torna al piano</Button>
      </div>
    );
  }

  const Icon = ROUTINE_ICONS[routine.icon] ?? Barbell;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2.5">
        <button
          aria-label="Indietro"
          onClick={() => router.push("/piano")}
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2"
        >
          <ArrowLeft size={19} weight="bold" />
        </button>
        <input
          value={routine.name}
          onChange={(e) => saveRoutine({ ...routine, name: e.target.value })}
          onBlur={() => {
            if (!routine.name.trim()) saveRoutine({ ...routine, name: "Scheda" });
          }}
          className="display h-11 w-full min-w-0 flex-1 rounded-[12px] border border-transparent bg-transparent px-2 text-[24px] outline-none transition-colors focus:border-line-strong focus:bg-surface-2"
        />
        <button
          aria-label="Elimina scheda"
          onClick={() => setConfirmDel(true)}
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-soft text-red"
        >
          <Trash size={18} weight="bold" />
        </button>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {ROUTINE_ICON_KEYS.map((k) => {
          const I = ROUTINE_ICONS[k];
          const on = routine.icon === k;
          return (
            <button
              key={k}
              aria-label={`Icona ${k}`}
              onClick={() => saveRoutine({ ...routine, icon: k })}
              className={`press flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border transition-colors ${
                on ? "border-accent bg-accent-soft" : "border-line bg-surface-2"
              }`}
            >
              <I size={21} weight="bold" color={on ? "var(--accent)" : "var(--text-3)"} />
            </button>
          );
        })}
      </div>

      {exList.length === 0 && (
        <Card className="text-center">
          <div className="mb-1 flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
              <Icon size={24} color="var(--text-3)" />
            </span>
          </div>
          <div className="mb-1 text-[15.5px] font-bold">Scheda vuota</div>
          <p className="mx-auto mb-3 max-w-[280px] text-[13.5px] text-ink-2">
            Aggiungi gli esercizi nell'ordine in cui li farai in palestra.
          </p>
        </Card>
      )}

      <Reorder.Group
        axis="y"
        values={exList}
        onReorder={(next) => saveRoutine({ ...routine, exercises: next })}
        className="flex flex-col gap-2"
      >
        {exList.map((re, i) => {
          const ex = index ? resolveEx(re.exId, index, custom) : null;
          return (
            <Reorder.Item
              key={re.k ?? re.exId + i}
              value={re}
              drag={reduce ? false : "y"}
              className="press-soft flex items-center gap-2.5 rounded-[16px] border border-line bg-surface p-2.5"
              whileDrag={{ scale: 1.02, boxShadow: "0 14px 40px rgba(0,0,0,0.5)" }}
            >
              <span className="cursor-grab touch-none p-1 text-ink-3 active:cursor-grabbing">
                <DotsSixVertical size={18} weight="bold" />
              </span>
              {ex ? (
                <ExThumb ex={ex} size={48} />
              ) : (
                <span className="skeleton h-12 w-12 shrink-0" />
              )}
              <button
                onClick={() => setCfgIdx(i)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-[14.5px] font-bold capitalize leading-tight">
                  {ex?.n ?? "..."}
                </span>
                <span className="block truncate text-[12.5px] text-accent">
                  {cfgLabel(re)}
                </span>
                {ex && (
                  <span className="block truncate text-[11.5px] text-ink-3">
                    {tTarget(ex.t)} · {tEquip(ex.e)}
                  </span>
                )}
              </button>
              <button
                aria-label="Rimuovi esercizio"
                onClick={() =>
                  saveRoutine({
                    ...routine,
                    exercises: routine.exercises.filter((_, j) => j !== i),
                  })
                }
                className="press p-2 text-ink-3 transition-colors hover:text-red"
              >
                <Trash size={17} />
              </button>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      <Button variant="primary" onClick={() => setPickerOpen(true)}>
        <Plus size={18} weight="bold" />
        Aggiungi esercizio
      </Button>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(ex) => {
          setPickerOpen(false);
          const mode = detectMode(ex);
          const re: RoutineExercise = {
            exId: ex.i,
            sets: 3,
            reps: 10,
            restSec: 90,
            mode,
            sec: mode === "time" ? 45 : undefined,
            min: mode === "cardio" ? 20 : undefined,
            speed: mode === "cardio" ? 8 : undefined,
            k: kgen(),
          };
          saveRoutine({ ...routine, exercises: [...routine.exercises, re] });
          setCfgIdx(routine.exercises.length);
          toast(`${ex.n} aggiunto`);
        }}
      />

      <CfgSheet
        open={cfgIdx != null}
        onClose={() => setCfgIdx(null)}
        initial={cfgIdx != null ? routine.exercises[cfgIdx] ?? null : null}
        exName={
          cfgIdx != null && index
            ? resolveEx(routine.exercises[cfgIdx]?.exId ?? "", index, custom)?.n ?? "Esercizio"
            : "Esercizio"
        }
        onSave={(re) =>
          saveRoutine({
            ...routine,
            exercises: routine.exercises.map((x, j) => (j === cfgIdx ? re : x)),
          })
        }
      />

      <Sheet open={confirmDel} onClose={() => setConfirmDel(false)} title="Eliminare la scheda?">
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-[14px] leading-relaxed text-ink-2">
            {routine.name} verrà rimossa dal piano. Gli allenamenti già
            registrati restano nello storico.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              deleteRoutine(routine.id);
              router.push("/piano");
              toast("Scheda eliminata");
            }}
          >
            <Trash size={17} weight="bold" />
            Elimina definitivamente
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDel(false)}>
            Annulla
          </Button>
        </div>
      </Sheet>

      <AnimatePresence>
        {exList.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-[12px] text-ink-3"
          >
            Trascina per riordinare · tocca un esercizio per serie e recuperi
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
