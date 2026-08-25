import type { AppState } from "./types";
import { diffDays, mondayOf, todayISO, weekKeyOf } from "./dates";
import { effectiveRoutineId } from "./session";

export interface CoachStep {
  key: string;
  title: string;
  body: string;
  cta: string | null;
  action: "piano" | "allenamento" | "peso" | "obiettivo" | "sposta" | "signup" | null;
  tone: "accent" | "amber" | "quiet";
}

type CoachState = Pick<
  AppState,
  "routines" | "week" | "overrides" | "workouts" | "bodyweight" | "goalWeight" | "active"
>;

export function nextStep(s: CoachState, opts?: { guest?: boolean }): CoachStep {
  const today = todayISO();

  if (s.active) {
    return {
      key: "resume",
      title: "Workout in corso",
      body: "Hai una sessione aperta: riprendila da dove l'avevi lasciata.",
      cta: "Riprendi",
      action: "allenamento",
      tone: "amber",
    };
  }

  if (!s.routines.length) {
    return {
      key: "plan",
      title: "Parti dal piano",
      body: "Rispondi a quattro domande e ti costruisco una settimana su misura per obiettivo e attrezzatura.",
      cta: "Percorso guidato",
      action: "piano",
      tone: "accent",
    };
  }

  const todayRid = effectiveRoutineId(s, today);
  const doneToday = s.workouts.some((w) => w.d === today);

  if (!s.workouts.length) {
    if (todayRid) {
      return {
        key: "first",
        title: "Il primo workout ti aspetta",
        body: "Ti guido io serie per serie: pesi consigliati, recuperi cronometrati e spunte.",
        cta: "Inizia ora",
        action: "allenamento",
        tone: "accent",
      };
    }
    return {
      key: "first-rest",
      title: "Non aspettare il giorno giusto",
      body: "Oggi sarebbe riposo, ma il primo workout puoi spostarlo a oggi con un tocco.",
      cta: "Scegli la scheda",
      action: "allenamento",
      tone: "accent",
    };
  }

  if (!s.bodyweight.length) {
    return {
      key: "bw",
      title: "Registra il primo peso",
      body: "Trenta secondi sulla bilancia e la curva del peso comincia a raccontare qualcosa.",
      cta: "Registra il peso",
      action: "peso",
      tone: "accent",
    };
  }

  if (todayRid && !doneToday) {
    return {
      key: "today",
      title: "Oggi è giorno di allenamento",
      body: "La scheda di oggi è pronta, con i carichi già suggeriti dall'ultima volta.",
      cta: "Vai al workout",
      action: "allenamento",
      tone: "accent",
    };
  }

  if (opts?.guest && s.workouts.length >= 1) {
    return {
      key: "signup",
      title: "Metti al sicuro i tuoi progressi",
      body: "Stai usando MyGymPro da ospite: con un account gratuito lo storico non ha limiti e non si perde nulla.",
      cta: "Crea il tuo account",
      action: "signup",
      tone: "accent",
    };
  }

  const lastBw = s.bodyweight[s.bodyweight.length - 1];
  if (lastBw && diffDays(lastBw.d, today) >= 4) {
    return {
      key: "bw-stale",
      title: "Peso da aggiornare",
      body: `L'ultima pesata è di ${diffDays(lastBw.d, today)} giorni fa: aggiornala per tenere la curva onesta.`,
      cta: "Registra il peso",
      action: "peso",
      tone: "amber",
    };
  }

  if (s.goalWeight == null) {
    return {
      key: "goal",
      title: "Dai una direzione alla bilancia",
      body: "Con un obiettivo di peso, ogni variazione ti dice se stai andando nella direzione giusta.",
      cta: "Imposta obiettivo",
      action: "obiettivo",
      tone: "accent",
    };
  }

  const monday = mondayOf(today);
  const planned = s.week.filter(Boolean).length;
  const doneThisWeek = s.workouts.filter((w) => weekKeyOf(w.d) === monday).length;
  const remainingDays = 6 - (diffDays(monday, today) % 7);
  const missing = planned - doneThisWeek;
  if (planned > 0 && missing > 0 && missing <= remainingDays + 1 && !todayRid) {
    return {
      key: "week",
      title: `${missing === 1 ? "Manca un workout" : `Mancano ${missing} workout`} questa settimana`,
      body: "Se un giorno salta, spostalo: tocca un giorno nella striscia qui sopra e riprogramma.",
      cta: null,
      action: null,
      tone: "amber",
    };
  }

  if (doneToday) {
    return {
      key: "done",
      title: "Fatto anche oggi",
      body: "Sessione registrata: adesso conta il recupero. Acqua, cibo e sonno fanno la loro parte.",
      cta: null,
      action: null,
      tone: "quiet",
    };
  }

  return {
    key: "rest",
    title: "Giorno di recupero",
    body: "Il riposo è parte del programma: i muscoli crescono adesso, non sotto il bilanciere.",
    cta: null,
    action: null,
    tone: "quiet",
  };
}
