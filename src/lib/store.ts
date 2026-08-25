"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ActiveSession,
  Activity,
  AppState,
  BodyWeight,
  CustomExercise,
  Routine,
  SessionEntry,
  SessionSummary,
  SetLog,
  Settings,
  Workout,
} from "./types";
import { detectPRs, workoutSets, workoutVolume } from "./calc";
import { todayISO } from "./dates";
import { getSession, savePreDemo, userStorageKey } from "./auth";

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const defaultSettings: Settings = {
  name: "",
  unit: "kg",
  restSec: 90,
  sound: true,
  wakeLock: true,
  weighAsk: true,
};

const initial: AppState = {
  routines: [],
  week: [null, null, null, null, null, null, null],
  overrides: {},
  workouts: [],
  bodyweight: [],
  goalWeight: null,
  exWeights: {},
  custom: [],
  settings: defaultSettings,
  active: null,
  demo: false,
  onboarded: false,
  activities: [],
};

export interface Store extends AppState {
  hydrated: boolean;
  lastSummary: SessionSummary | null;
  setHydrated: () => void;
  logBodyweight: (w: number, d?: string) => void;
  removeBodyweight: (d: string) => void;
  setGoal: (w: number | null) => void;
  saveRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  assignDay: (dayIdx: number, routineId: string | null) => void;
  setOverride: (iso: string, routineId: string | null | undefined) => void;
  addCustomExercise: (c: Omit<CustomExercise, "id">) => string;
  startSession: (
    routineId: string | null,
    name: string,
    entries: SessionEntry[]
  ) => void;
  discardSession: () => void;
  finishSession: (muscles: string[]) => void;
  clearSummary: () => void;
  setCur: (i: number) => void;
  toggleSet: (ei: number, si: number) => { finishedEntry: boolean; startRest: boolean };
  setField: (ei: number, si: number, f: keyof SetLog, v: number | undefined) => void;
  addSet: (ei: number) => void;
  removeSet: (ei: number) => void;
  addEntry: (e: SessionEntry) => void;
  removeEntry: (ei: number) => void;
  startRest: (sec: number) => void;
  adjustRest: (delta: number) => void;
  stopRest: () => void;
  setSettings: (s: Partial<Settings>) => void;
  addActivities: (items: Activity[], bws: { d: string; w: number }[]) => { added: number; weights: number };
  clearActivities: () => void;
  setOnboarded: () => void;
  loadState: (s: AppState, demo: boolean) => void;
  resetAll: () => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initial,
      hydrated: false,
      lastSummary: null,

      setHydrated: () => set({ hydrated: true }),

      logBodyweight: (w, d) => {
        const iso = d ?? todayISO();
        set((s) => {
          const rest = s.bodyweight.filter((b) => b.d !== iso);
          const next: BodyWeight[] = [...rest, { d: iso, w }].sort((a, b) =>
            a.d < b.d ? -1 : 1
          );
          return { bodyweight: next };
        });
      },

      removeBodyweight: (d) =>
        set((s) => ({ bodyweight: s.bodyweight.filter((b) => b.d !== d) })),

      setGoal: (w) => set({ goalWeight: w }),

      saveRoutine: (r) =>
        set((s) => {
          const exists = s.routines.some((x) => x.id === r.id);
          return {
            routines: exists
              ? s.routines.map((x) => (x.id === r.id ? r : x))
              : [...s.routines, r],
          };
        }),

      deleteRoutine: (id) =>
        set((s) => ({
          routines: s.routines.filter((r) => r.id !== id),
          week: s.week.map((w) => (w === id ? null : w)) as (string | null)[],
          overrides: Object.fromEntries(
            Object.entries(s.overrides).filter(([, v]) => v !== id)
          ),
        })),

      assignDay: (dayIdx, routineId) =>
        set((s) => {
          const week = [...s.week];
          week[dayIdx] = routineId;
          return { week };
        }),

      setOverride: (iso, routineId) =>
        set((s) => {
          const overrides = { ...s.overrides };
          if (routineId === undefined) delete overrides[iso];
          else overrides[iso] = routineId;
          return { overrides };
        }),

      addCustomExercise: (c) => {
        const id = "c_" + uid().slice(0, 8);
        set((s) => ({ custom: [...s.custom, { ...c, id }] }));
        return id;
      },

      startSession: (routineId, name, entries) =>
        set({
          active: {
            routineId,
            name,
            start: Date.now(),
            cur: 0,
            entries,
            restUntil: null,
            restTotal: 0,
          },
        }),

      discardSession: () => set({ active: null }),

      finishSession: (muscles) => {
        const s = get();
        const a = s.active;
        if (!a) return;
        const entries = a.entries
          .map((e) => ({
            exId: e.exId,
            mode: e.mode,
            sets: e.sets.filter((x) => x.done),
          }))
          .filter((e) => e.sets.length > 0);
        if (!entries.length) {
          set({ active: null });
          return;
        }
        const workout: Workout = {
          id: uid(),
          d: todayISO(),
          name: a.name,
          routineId: a.routineId,
          start: a.start,
          end: Date.now(),
          entries,
        };
        const prs = detectPRs(s.workouts, workout);
        const exWeights = { ...s.exWeights };
        for (const en of entries) {
          const top = en.sets.reduce((m, x) => Math.max(m, x.w ?? 0), 0);
          if (top > 0) exWeights[en.exId] = top;
        }
        set({
          workouts: [...s.workouts, workout],
          exWeights,
          active: null,
          lastSummary: {
            name: workout.name,
            durationMin: Math.max(1, Math.round((workout.end - workout.start) / 60000)),
            sets: workoutSets(workout),
            volume: workoutVolume(workout),
            prs,
            muscles,
          },
        });
      },

      clearSummary: () => set({ lastSummary: null }),

      setCur: (i) =>
        set((s) => (s.active ? { active: { ...s.active, cur: i } } : {})),

      toggleSet: (ei, si) => {
        let finishedEntry = false;
        let startRest = false;
        set((s) => {
          if (!s.active) return {};
          const entries = s.active.entries.map((e, i) => {
            if (i !== ei) return e;
            const sets = e.sets.map((x, j) =>
              j === si ? { ...x, done: !x.done } : x
            );
            return { ...e, sets };
          });
          const entry = entries[ei];
          const nowDone = entry.sets[si].done;
          finishedEntry = nowDone && entry.sets.every((x) => x.done);
          startRest = nowDone && !finishedEntry;
          return { active: { ...s.active, entries } };
        });
        return { finishedEntry, startRest };
      },

      setField: (ei, si, f, v) =>
        set((s) => {
          if (!s.active) return {};
          const entries = s.active.entries.map((e, i) => {
            if (i !== ei) return e;
            const sets = e.sets.map((x, j) => {
              if (j !== si) return x;
              const nx = { ...x };
              if (v === undefined) delete nx[f];
              else (nx[f] as number | boolean) = v;
              return nx;
            });
            return { ...e, sets };
          });
          return { active: { ...s.active, entries } };
        }),

      addSet: (ei) =>
        set((s) => {
          if (!s.active) return {};
          const entries = s.active.entries.map((e, i) => {
            if (i !== ei) return e;
            const last = e.sets[e.sets.length - 1];
            const base: SetLog = last
              ? { ...last, done: false }
              : { r: e.targetReps, done: false };
            return { ...e, sets: [...e.sets, base] };
          });
          return { active: { ...s.active, entries } };
        }),

      removeSet: (ei) =>
        set((s) => {
          if (!s.active) return {};
          const entries = s.active.entries.map((e, i) => {
            if (i !== ei || e.sets.length <= 1) return e;
            return { ...e, sets: e.sets.slice(0, -1) };
          });
          return { active: { ...s.active, entries } };
        }),

      addEntry: (e) =>
        set((s) => {
          if (!s.active) return {};
          const entries = [...s.active.entries, e];
          return { active: { ...s.active, entries, cur: entries.length - 1 } };
        }),

      removeEntry: (ei) =>
        set((s) => {
          if (!s.active) return {};
          const entries = s.active.entries.filter((_, i) => i !== ei);
          const cur = Math.min(s.active.cur, Math.max(0, entries.length - 1));
          return { active: { ...s.active, entries, cur } };
        }),

      startRest: (sec) =>
        set((s) =>
          s.active
            ? {
                active: {
                  ...s.active,
                  restUntil: Date.now() + sec * 1000,
                  restTotal: sec,
                },
              }
            : {}
        ),

      adjustRest: (delta) =>
        set((s) => {
          if (!s.active || !s.active.restUntil) return {};
          const restUntil = Math.max(Date.now() + 1000, s.active.restUntil + delta * 1000);
          const restTotal = Math.max(s.active.restTotal + delta, 5);
          return { active: { ...s.active, restUntil, restTotal } };
        }),

      stopRest: () =>
        set((s) =>
          s.active ? { active: { ...s.active, restUntil: null } } : {}
        ),

      setSettings: (p) =>
        set((s) => ({ settings: { ...s.settings, ...p } })),

      addActivities: (items, bws) => {
        let added = 0;
        let weights = 0;
        set((s) => {
          const existing = new Set((s.activities ?? []).map((a) => a.id));
          const fresh = items.filter((a) => !existing.has(a.id));
          added = fresh.length;
          const byDay = new Map(s.bodyweight.map((b) => [b.d, b.w]));
          for (const b of bws) {
            if (!byDay.has(b.d)) {
              byDay.set(b.d, b.w);
              weights++;
            }
          }
          const bodyweight = [...byDay.entries()]
            .map(([d, w]) => ({ d, w }))
            .sort((a, b) => (a.d < b.d ? -1 : 1));
          const activities = [...(s.activities ?? []), ...fresh].sort((a, b) =>
            a.d < b.d ? -1 : 1
          );
          return { activities, bodyweight };
        });
        return { added, weights };
      },

      clearActivities: () => set({ activities: [] }),

      setOnboarded: () => set({ onboarded: true }),

      loadState: (ns, demo) => {
        if (demo && !get().demo) {
          const sess = getSession();
          if (sess) savePreDemo(sess.id);
        }
        set({
          routines: ns.routines,
          week: ns.week,
          overrides: ns.overrides,
          workouts: ns.workouts,
          bodyweight: ns.bodyweight,
          goalWeight: ns.goalWeight,
          exWeights: ns.exWeights,
          custom: ns.custom,
          settings: { ...defaultSettings, ...ns.settings },
          active: null,
          demo,
          onboarded: true,
          activities: ns.activities ?? [],
          lastSummary: null,
        });
      },

      resetAll: () => set({ ...initial, hydrated: true, lastSummary: null }),
    }),
    {
      name: "mygympro-v1",
      storage: createJSONStorage(() => ({
        getItem: () => {
          const sess = getSession();
          return sess ? localStorage.getItem(userStorageKey(sess.id)) : null;
        },
        setItem: (_k: string, v: string) => {
          const sess = getSession();
          if (sess) localStorage.setItem(userStorageKey(sess.id), v);
        },
        removeItem: () => {
          const sess = getSession();
          if (sess) localStorage.removeItem(userStorageKey(sess.id));
        },
      })),
      partialize: (s) => ({
        activities: s.activities,
        routines: s.routines,
        week: s.week,
        overrides: s.overrides,
        workouts: s.workouts,
        bodyweight: s.bodyweight,
        goalWeight: s.goalWeight,
        exWeights: s.exWeights,
        custom: s.custom,
        settings: s.settings,
        active: s.active,
        demo: s.demo,
        onboarded: s.onboarded,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);

export function exportJSON(): string {
  const s = useStore.getState();
  const data: AppState = {
    activities: s.activities,
    routines: s.routines,
    week: s.week,
    overrides: s.overrides,
    workouts: s.workouts,
    bodyweight: s.bodyweight,
    goalWeight: s.goalWeight,
    exWeights: s.exWeights,
    custom: s.custom,
    settings: s.settings,
    active: null,
    demo: s.demo,
    onboarded: s.onboarded,
  };
  return JSON.stringify({ app: "mygympro", version: 1, data }, null, 2);
}

export function importJSON(text: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(text);
    const data = parsed?.data ?? parsed;
    if (!data || !Array.isArray(data.workouts) || !Array.isArray(data.routines)) {
      return { ok: false, error: "Formato non riconosciuto" };
    }
    useStore.getState().loadState({ ...initial, ...data }, false);
    return { ok: true };
  } catch {
    return { ok: false, error: "File JSON non valido" };
  }
}
