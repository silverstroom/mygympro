import type { Routine } from "./types";

export const STARTER_PPL: Routine[] = [
  {
    id: "r_push",
    name: "Push",
    icon: "barbell",
    exercises: [
      { exId: "0025", sets: 4, reps: 6, restSec: 150, mode: "reps" },
      { exId: "0314", sets: 3, reps: 10, restSec: 120, mode: "reps" },
      { exId: "0405", sets: 3, reps: 10, restSec: 120, mode: "reps" },
      { exId: "0334", sets: 3, reps: 14, restSec: 75, mode: "reps" },
      { exId: "0201", sets: 3, reps: 12, restSec: 75, mode: "reps" },
    ],
  },
  {
    id: "r_pull",
    name: "Pull",
    icon: "anchor",
    exercises: [
      { exId: "0032", sets: 3, reps: 5, restSec: 180, mode: "reps" },
      { exId: "0198", sets: 3, reps: 10, restSec: 120, mode: "reps" },
      { exId: "0861", sets: 3, reps: 10, restSec: 120, mode: "reps" },
      { exId: "0294", sets: 3, reps: 12, restSec: 75, mode: "reps" },
      { exId: "0313", sets: 3, reps: 12, restSec: 75, mode: "reps" },
    ],
  },
  {
    id: "r_legs",
    name: "Legs",
    icon: "sneaker",
    exercises: [
      { exId: "0043", sets: 4, reps: 6, restSec: 180, mode: "reps" },
      { exId: "1463", sets: 3, reps: 10, restSec: 150, mode: "reps" },
      { exId: "0586", sets: 3, reps: 12, restSec: 90, mode: "reps" },
      { exId: "0605", sets: 4, reps: 15, restSec: 60, mode: "reps" },
      { exId: "2135", sets: 3, reps: 0, restSec: 60, mode: "time", sec: 45 },
    ],
  },
];

export const STARTER_WEEK: (string | null)[] = [
  "r_push",
  null,
  "r_pull",
  null,
  "r_legs",
  null,
  null,
];
