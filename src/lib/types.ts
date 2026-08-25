export type Unit = "kg" | "lb";
export type ExMode = "reps" | "time" | "cardio";

export interface ExerciseIndex {
  i: string;
  n: string;
  b: string;
  e: string;
  t: string;
  s: string[];
  m: string;
}

export interface CustomExercise {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  note?: string;
}

export interface RoutineExercise {
  exId: string;
  sets: number;
  reps: number;
  restSec: number;
  mode: ExMode;
  sec?: number;
  min?: number;
  speed?: number;
  tempo?: string;
  k?: string;
}

export interface Routine {
  id: string;
  name: string;
  icon: string;
  exercises: RoutineExercise[];
}

export interface SetLog {
  w?: number;
  r?: number;
  sec?: number;
  min?: number;
  speed?: number;
  rir?: number;
  done: boolean;
}

export interface Suggestion {
  kind: "up" | "keep" | "deload" | "start" | "reps";
  weight?: number;
  reps?: number;
  why: string;
}

export interface SessionEntry {
  exId: string;
  mode: ExMode;
  targetReps: number;
  restSec: number;
  sets: SetLog[];
  suggestion: Suggestion | null;
  tempo?: string;
}

export interface ActiveSession {
  routineId: string | null;
  name: string;
  start: number;
  cur: number;
  entries: SessionEntry[];
  restUntil: number | null;
  restTotal: number;
}

export interface WorkoutEntry {
  exId: string;
  mode: ExMode;
  sets: SetLog[];
}

export interface Workout {
  id: string;
  d: string;
  name: string;
  routineId: string | null;
  start: number;
  end: number;
  entries: WorkoutEntry[];
}

export interface BodyWeight {
  d: string;
  w: number;
}

export interface PR {
  exId: string;
  w: number;
  r: number;
  e1rm: number;
  d: string;
}

export interface Settings {
  name: string;
  unit: Unit;
  restSec: number;
  sound: boolean;
  wakeLock: boolean;
  weighAsk: boolean;
  accent?: string;
  bg?: string;
  height?: number | null;
  trackRir?: boolean;
  goal?: string;
  level?: string;
}

export interface Activity {
  id: string;
  d: string;
  type: string;
  min: number;
  kcal?: number;
  name?: string;
  source: "apple" | "csv";
}

export interface SessionSummary {
  name: string;
  durationMin: number;
  sets: number;
  volume: number;
  prs: PR[];
  muscles: string[];
}

export interface AppState {
  routines: Routine[];
  week: (string | null)[];
  overrides: Record<string, string | null>;
  workouts: Workout[];
  bodyweight: BodyWeight[];
  goalWeight: number | null;
  exWeights: Record<string, number>;
  custom: CustomExercise[];
  settings: Settings;
  active: ActiveSession | null;
  demo: boolean;
  onboarded: boolean;
  activities: Activity[];
}
