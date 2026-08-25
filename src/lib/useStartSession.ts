"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { loadIndex } from "./data";
import { buildSessionEntries } from "./session";
import { useStore } from "./store";
import { toast } from "@/components/ui";

export function useStartSession() {
  const router = useRouter();

  return useCallback(
    async (routineId: string | null) => {
      const s = useStore.getState();
      if (s.active) {
        router.push("/allenamento");
        return;
      }
      try {
        const index = await loadIndex();
        const routine = routineId
          ? s.routines.find((r) => r.id === routineId) ?? null
          : null;
        const entries = routine
          ? buildSessionEntries(routine, s.workouts, s.exWeights, index, s.custom)
          : [];
        s.startSession(routineId, routine?.name ?? "Freestyle", entries);
        router.push("/allenamento");
      } catch {
        toast("Impossibile caricare gli esercizi", "warn");
      }
    },
    [router]
  );
}
