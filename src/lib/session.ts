import type {
  AppState,
  CustomExercise,
  ExerciseIndex,
  Routine,
  RoutineExercise,
  SessionEntry,
  SetLog,
  Workout,
} from "./types";
import { isBodyweight, resolveEx } from "./data";
import { suggestFor } from "./progression";
import { dayIdxOf } from "./dates";

export function effectiveRoutineId(
  state: Pick<AppState, "week" | "overrides">,
  iso: string
): string | null {
  const ovr = state.overrides[iso];
  if (ovr !== undefined) return ovr;
  return state.week[dayIdxOf(iso)] ?? null;
}

export function lastWeightFor(workouts: Workout[], exId: string): number {
  const sorted = [...workouts].sort((a, b) => (a.d > b.d ? -1 : 1));
  for (const w of sorted) {
    for (const en of w.entries) {
      if (en.exId !== exId) continue;
      const top = en.sets.reduce((m, s) => Math.max(m, s.w ?? 0), 0);
      if (top > 0) return top;
    }
  }
  return 0;
}

export function lastSetsFor(workouts: Workout[], exId: string): { d: string; sets: SetLog[] } | null {
  const sorted = [...workouts].sort((a, b) => (a.d > b.d ? -1 : 1));
  for (const w of sorted) {
    for (const en of w.entries) {
      if (en.exId === exId && en.sets.length) return { d: w.d, sets: en.sets };
    }
  }
  return null;
}

export function buildEntry(
  re: RoutineExercise,
  workouts: Workout[],
  exWeights: Record<string, number>,
  index: ExerciseIndex[],
  custom: CustomExercise[]
): SessionEntry {
  const ex = resolveEx(re.exId, index, custom);
  const bw = ex ? isBodyweight(ex) : false;

  if (re.mode === "cardio") {
    const sets: SetLog[] = Array.from({ length: Math.max(1, re.sets) }, () => ({
      min: re.min ?? 20,
      speed: re.speed ?? 8,
      done: false,
    }));
    return {
      exId: re.exId,
      mode: "cardio",
      targetReps: 0,
      restSec: re.restSec,
      sets,
      suggestion: null,
    };
  }

  if (re.mode === "time") {
    const w = exWeights[re.exId] ?? lastWeightFor(workouts, re.exId);
    const sets: SetLog[] = Array.from({ length: re.sets }, () => ({
      sec: re.sec ?? 45,
      ...(w > 0 ? { w } : {}),
      done: false,
    }));
    return {
      exId: re.exId,
      mode: "time",
      targetReps: 0,
      restSec: re.restSec,
      sets,
      suggestion: null,
    };
  }

  const suggestion = suggestFor(re.exId, workouts, {
    targetReps: re.reps,
    bodyweight: bw,
  });
  const weight =
    suggestion.weight ?? exWeights[re.exId] ?? lastWeightFor(workouts, re.exId);
  const reps = suggestion.reps ?? re.reps;
  const sets: SetLog[] = Array.from({ length: re.sets }, () => ({
    ...(bw && weight <= 0 ? {} : { w: weight }),
    r: reps,
    done: false,
  }));
  return {
    exId: re.exId,
    mode: "reps",
    targetReps: reps,
    restSec: re.restSec,
    sets,
    suggestion,
    ...(re.tempo ? { tempo: re.tempo } : {}),
  };
}

export function buildSessionEntries(
  routine: Routine,
  workouts: Workout[],
  exWeights: Record<string, number>,
  index: ExerciseIndex[],
  custom: CustomExercise[]
): SessionEntry[] {
  return routine.exercises.map((re) =>
    buildEntry(re, workouts, exWeights, index, custom)
  );
}
