import type {
  Activity,
  AppState,
  CustomExercise,
  ExerciseIndex,
  Settings,
  Workout,
} from "./types";
import { bestSetFor, e1rm, streakWeeks, weeklyStats } from "./calc";
import { ageFrom, bmr, goalCalories, tdee } from "./health";
import { buildInsights } from "./insights";
import { suggestFor } from "./progression";
import { effectiveRoutineId } from "./session";
import { isBodyweight, searchExercises } from "./data";
import { fmtNum, todayISO } from "./dates";
import { tTarget } from "./it";

export interface ChatCtx {
  index: ExerciseIndex[];
  custom: CustomExercise[];
  routines: AppState["routines"];
  week: AppState["week"];
  overrides: AppState["overrides"];
  workouts: Workout[];
  bodyweight: AppState["bodyweight"];
  goalWeight: number | null;
  activities: Activity[];
  settings: Settings;
  userName: string;
}

export type ChatAction =
  | { label: string; type: "href"; href: string }
  | { label: string; type: "quick"; minutes: 15 | 30 | 45 };

export interface ChatAnswer {
  text: string;
  exId?: string;
  showSteps?: boolean;
  actions?: ChatAction[];
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[!?.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_TECH =
  /\b(come|si|fa|fare|faccio|esegue|eseguo|eseguire|esecuzione|tecnica|bene|correttamente|devo|un|una|il|lo|la|i|gli|le|per|di|a|ad|posso)\b/g;
const STOP_LOAD =
  /\b(quanto|quanti|che|peso|kg|chili|carico|metto|uso|devo|mettere|usare|su|sulla|sullo|nella|nello|di|a|il|lo|la|per|alla|posso|dovrei)\b/g;

function findExercise(q: string, ctx: ChatCtx, stop: RegExp): ExerciseIndex | null {
  const cleaned = norm(q).replace(stop, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length < 3) return null;
  const res = searchExercises(ctx.index, ctx.custom, cleaned, null, null);
  return res[0] ?? null;
}

function routineTargetReps(ctx: ChatCtx, exId: string): number {
  for (const r of ctx.routines) {
    const e = r.exercises.find((x) => x.exId === exId);
    if (e && e.reps > 0) return e.reps;
  }
  return 8;
}

export function answer(question: string, ctx: ChatCtx): ChatAnswer {
  const q = norm(question);
  const name = ctx.userName || "campione";

  if (/\b(dolore|male|fa male|infortun|strappo|contrattur|fitta|bruci(a|ore))\b/.test(q)) {
    return {
      text: "Fermati: sul dolore non si tratta. Se un movimento fa male, salta l'esercizio oggi e scegli una variante che non dà fastidio. Se il dolore resta o torna, la persona giusta è un medico o un fisioterapista, non un'app. Riscaldati sempre bene prima dei carichi.",
    };
  }

  if (/^(ciao|hey|ehi|salve|buongiorno|buonasera|hola|we|yo)\b/.test(q) && q.length < 25) {
    return {
      text: `Ciao ${name}! Sono il tuo coach: conosco le tue schede, i tuoi carichi e i tuoi progressi, quindi chiedimi cose concrete. Per esempio: "cosa mi alleno oggi?", "quanto metto di panca?", "come si fa lo stacco?", "ho solo 30 minuti".`,
    };
  }

  if (/\bgrazie\b/.test(q)) {
    return {
      text: "Di niente. Ora però le ripetizioni falle tu, quelle non posso fartele io. A dopo!",
    };
  }

  if (/\b(oggi|stasera|adesso|ora)\b/.test(q) && /\b(allen|tocca|faccio|scheda|workout|palestra)/.test(q)) {
    const rid = effectiveRoutineId(ctx, todayISO());
    const r = ctx.routines.find((x) => x.id === rid);
    if (r) {
      return {
        text: `Oggi tocca ${r.name}: ${r.exercises.length} esercizi, con i carichi già suggeriti in base all'ultima volta. Scarpe allacciate e si parte.`,
        actions: [{ label: `Inizia ${r.name}`, type: "href", href: "/allenamento" }],
      };
    }
    return {
      text: "Oggi da piano è riposo. Se però hai voglia di muoverti, ti preparo una sessione lampo calibrata sul tempo che hai.",
      actions: [
        { label: "Sessione lampo 30 minuti", type: "quick", minutes: 30 },
        { label: "Vai alle schede", type: "href", href: "/allenamento" },
      ],
    };
  }

  const timeMatch = q.match(/\b(\d{1,3})\s*(minut|min\b|')/);
  if (timeMatch || /\b(poco tempo|di fretta|veloce|rapid|lampo|mezz ?ora)\b/.test(q)) {
    let minutes: 15 | 30 | 45 = 30;
    if (timeMatch) {
      const m = parseInt(timeMatch[1], 10);
      minutes = m <= 20 ? 15 : m <= 37 ? 30 : 45;
    } else if (/mezz ?ora/.test(q)) {
      minutes = 30;
    }
    return {
      text: `${minutes} minuti bastano se non li sprechiamo: fondamentali prima, recuperi corti, zero telefono tra le serie. Ti genero io la sessione.`,
      actions: [{ label: `Sessione lampo da ${minutes}'`, type: "quick", minutes }],
    };
  }

  if (/\b(scheda|piano|programma)\b/.test(q) && /\b(nuov|crea|fai|fammi|genera|cambia|rifai|costruisci)\b/.test(q)) {
    return {
      text: "Ci penso io: quattro domande su obiettivo, esperienza, giorni e attrezzatura, e ti costruisco la settimana con serie, ripetizioni e recuperi già calibrati.",
      actions: [{ label: "Apri il percorso guidato", type: "href", href: "/piano?wizard=1" }],
    };
  }

  if (/\b(come si fa|come si esegue|esecuzione|tecnica|come fare|come faccio|come eseguo|spiegami)\b/.test(q)) {
    const ex = findExercise(q, ctx, STOP_TECH);
    if (ex) {
      return {
        text: `${ex.n}: lavora su ${tTarget(ex.t).toLowerCase()}. Ecco l'esecuzione passo per passo:`,
        exId: ex.i,
        showSteps: true,
        actions: [{ label: "Apri la scheda con la demo animata", type: "href", href: `/esercizi/${ex.i}` }],
      };
    }
    return {
      text: 'Dimmi quale esercizio ti interessa e ti spiego l\'esecuzione passo per passo. Per esempio: "come si fa lo squat?"',
    };
  }

  if (/\b(quanto|quanti|che)\b/.test(q) && /\b(peso|kg|chili|carico)\b/.test(q) && !/\b(corporeo|bilancia|dimagr|ingrass|il mio peso)\b/.test(q)) {
    const ex = findExercise(q, ctx, STOP_LOAD);
    if (ex) {
      const reps = routineTargetReps(ctx, ex.i);
      const s = suggestFor(ex.i, ctx.workouts, {
        targetReps: reps,
        bodyweight: isBodyweight(ex),
      });
      const best = bestSetFor(ctx.workouts, ex.i);
      const bestTxt = best
        ? ` Il tuo best è ${fmtNum(best.w)} kg × ${best.r}.`
        : "";
      return {
        text: `${ex.n}: ${s.why}${bestTxt}`,
        actions: [{ label: "Apri l'esercizio", type: "href", href: `/esercizi/${ex.i}` }],
      };
    }
    return {
      text: 'Dimmi l\'esercizio e ti do il carico giusto in base al tuo storico. Per esempio: "quanto metto di panca piana?"',
    };
  }

  if (/\b(progressi|come sto andando|come vado|statistiche|risultati|miglior(o|ando))\b/.test(q)) {
    if (!ctx.workouts.length) {
      return {
        text: "Ancora nessun workout registrato: i progressi si misurano dal primo. Iniziamo?",
        actions: [{ label: "Vai al workout", type: "href", href: "/allenamento" }],
      };
    }
    const streak = streakWeeks(ctx.workouts, ctx.activities);
    const wk = weeklyStats(ctx.workouts, 1, ctx.activities)[0];
    let bestLine = "";
    let bestE = 0;
    for (const w of ctx.workouts) {
      for (const en of w.entries) {
        const b = bestSetFor(ctx.workouts, en.exId);
        if (b && b.e1rm > bestE) {
          bestE = b.e1rm;
          const ex = ctx.index.find((x) => x.i === en.exId);
          bestLine = ex
            ? ` Il tuo esercizio più forte è ${ex.n}: 1RM stimato ${fmtNum(Math.round(b.e1rm))} kg.`
            : "";
        }
      }
    }
    return {
      text: `${ctx.workouts.length} workout totali, striscia di ${streak} ${streak === 1 ? "settimana" : "settimane"}, ${wk.sets} serie e ${wk.minutes} minuti negli ultimi 7 giorni.${bestLine} I grafici completi sono nei Progressi.`,
      actions: [{ label: "Vedi i progressi", type: "href", href: "/progressi" }],
    };
  }

  if (/\b(peso corporeo|bilancia|dimagr|ingrass|il mio peso|sto a peso|bmi)\b/.test(q)) {
    const last = ctx.bodyweight[ctx.bodyweight.length - 1];
    if (!last) {
      return {
        text: "Non hai ancora registrato il peso: fallo dalla Home e la curva comincia a raccontare. Poi fissiamo un obiettivo e ci lavoriamo.",
        actions: [{ label: "Vai alla Home", type: "href", href: "/" }],
      };
    }
    const goalTxt =
      ctx.goalWeight != null
        ? ` Obiettivo ${fmtNum(ctx.goalWeight)} kg: ${
            Math.abs(last.w - ctx.goalWeight) < 0.25
              ? "ci sei, mantienilo."
              : `${fmtNum(Math.round(Math.abs(last.w - ctx.goalWeight) * 10) / 10)} kg e ci sei.`
          }`
        : " Fissa un obiettivo dalla Home così ogni pesata ha una direzione.";
    const h = ctx.settings.height;
    const bmiTxt =
      h && h >= 120
        ? ` BMI attuale: ${fmtNum(Math.round((last.w / Math.pow(h / 100, 2)) * 10) / 10)}.`
        : "";
    return {
      text: `Ultima pesata: ${fmtNum(last.w)} kg.${goalTxt}${bmiTxt} Ricorda: il peso oscilla giorno per giorno, conta la tendenza su 2-3 settimane.`,
    };
  }

  if (
    /\b(fabbisogno|kcal|calorie|calorico|metabolismo|tdee)\b/.test(q) &&
    !/\bproteine\b/.test(q)
  ) {
    const last = ctx.bodyweight[ctx.bodyweight.length - 1];
    const age = ageFrom(ctx.settings.birthYear, new Date().getFullYear());
    const b = bmr(ctx.settings.sex ?? null, age, ctx.settings.height, last?.w ?? null);
    const days = ctx.week.filter(Boolean).length;
    const t = tdee(b, days);
    if (b == null || t == null) {
      return {
        text: "Per stimare il tuo fabbisogno mi servono età, altezza e almeno una pesata: completa il profilo dalle impostazioni e te lo calcolo al volo.",
        actions: [{ label: "Completa il profilo", type: "href", href: "/impostazioni" }],
      };
    }
    const target = goalCalories(t, ctx.settings.goal)!;
    const daysTxt =
      days > 0
        ? `con i tuoi ${days} allenamenti a settimana`
        : "con poca attività programmata";
    const goalTxt =
      ctx.settings.goal === "dimagrimento"
        ? ` Per dimagrire punta a ≈ ${fmtNum(target)} kcal: un deficit moderato che non ti spegne in palestra.`
        : ctx.settings.goal === "massa"
          ? ` Per costruire massa punta a ≈ ${fmtNum(target)} kcal: surplus pulito, niente abbuffate.`
          : ` Per mantenerti resta intorno a ${fmtNum(target)} kcal.`;
    return {
      text: `A riposo bruci circa ${fmtNum(b)} kcal al giorno (metabolismo basale); ${daysTxt} il fabbisogno sale a ≈ ${fmtNum(t)} kcal.${goalTxt} Sono stime oneste, non oracoli: verifica con la bilancia su 2-3 settimane e aggiusta.`,
    };
  }

  if (/\b(proteine|mangiare|dieta|alimentazione|integrator)\b/.test(q)) {
    const last = ctx.bodyweight[ctx.bodyweight.length - 1];
    const protTxt = last
      ? `Per il tuo peso (${fmtNum(last.w)} kg) una buona forchetta è ${Math.round(last.w * 1.6)}-${Math.round(last.w * 2.2)} g di proteine al giorno, distribuite nei pasti.`
      : "La regola pratica è 1,6-2,2 g di proteine per kg di peso corporeo al giorno.";
    return {
      text: `${protTxt} Acqua abbondante, verdura a ogni pasto e la maggior parte delle calorie da cibo vero. Per piani alimentari personalizzati, però, serve un nutrizionista: io mi fermo alle regole generali.`,
    };
  }

  if (/\b(recupero|riposo tra|pausa tra|quanto riposo|quanto aspetto)\b/.test(q)) {
    const goal = ctx.settings.goal;
    const txt =
      goal === "forza"
        ? "Per la forza il recupero è sacro: 2-3 minuti pieni sui fondamentali, anche di più se le gambe tremano."
        : goal === "dimagrimento"
          ? "Con l'obiettivo dimagrimento tieni i recuperi corti: 45-75 secondi per mantenere il ritmo alto."
          : "Regola pratica: 90-120 secondi sui multiarticolari, 60-90 sugli esercizi di isolamento.";
    return {
      text: `${txt} Nell'app il timer parte da solo quando spunti una serie, e puoi regolarlo per ogni esercizio dalla scheda.`,
    };
  }

  if (/\briscald/.test(q)) {
    return {
      text: "5 minuti di cardio leggero per alzare la temperatura, poi serie di avvicinamento sull'esercizio: bilanciere vuoto × 10, 50% × 6, 75% × 3, e sei pronto per le serie vere. Mai partire freddo sui carichi pesanti.",
    };
  }

  if (/\bquante? (serie|ripetizioni)\b/.test(q) || /\b(serie|ripetizioni) (devo|dovrei|faccio)\b/.test(q)) {
    const goal = ctx.settings.goal;
    const txt =
      goal === "forza"
        ? "Per la forza: 3-5 serie da 3-6 ripetizioni sui fondamentali, carichi alti e tecnica impeccabile."
        : goal === "dimagrimento"
          ? "Per il dimagrimento: 3 serie da 12-15 con recuperi corti, e il volume totale conta più del singolo carico."
          : "Per crescere: 3-4 serie da 8-12 ripetizioni è la zona d'oro, arrivando vicino al cedimento con 1-2 colpi in canna.";
    return { text: txt + " Il tuo piano è già calibrato così: fidati dei numeri che trovi precompilati." };
  }

  if (/\brir\b|ripetizioni in riserva/.test(q)) {
    return {
      text: 'Il RIR dice quante ripetizioni avevi ancora "in canna" a fine serie: RIR 2 = potevi farne altre due. Registralo attivandolo in Impostazioni → Allenamento: se chiudi le serie con RIR 2-3, la progressione ti fa fare il doppio salto di carico.',
      actions: [{ label: "Apri le impostazioni", type: "href", href: "/impostazioni" }],
    };
  }

  if (/\b(stallo|plateau|non cresco|sono fermo|bloccat|non miglioro)\b/.test(q)) {
    const ins = buildInsights(ctx.workouts, ctx.index);
    if (ins.length) {
      return {
        text: `Ho guardato i tuoi dati: ${ins[0].body}`,
        actions: [{ label: "Vedi tutti i consigli", type: "href", href: "/progressi" }],
      };
    }
    return {
      text: "Le armi anti-stallo, in ordine: controlla di dormire e mangiare abbastanza, poi cambia lo stimolo: una variante dell'esercizio, un range di ripetizioni diverso, o una settimana di scarico al 70%. Il corpo si adatta a ciò che conosce.",
    };
  }

  if (/\b(motivazione|voglia|mollare|stanco|demotivat|pigrizia|saltare)\b/.test(q)) {
    const streak = streakWeeks(ctx.workouts, ctx.activities);
    const streakTxt =
      streak > 1
        ? `Hai una striscia di ${streak} settimane: non si spezza oggi.`
        : "La motivazione va e viene, la costanza si costruisce.";
    return {
      text: `${streakTxt} Trucco da coach: non pensare all'allenamento intero, pensa solo a mettere le scarpe e fare il primo esercizio. Il resto viene da sé. E se proprio oggi non è giornata, una sessione lampo da 15 minuti vale più di zero.`,
      actions: [{ label: "Lampo da 15 minuti", type: "quick", minutes: 15 }],
    };
  }

  return {
    text: 'Posso aiutarti su allenamento e progressi: prova a chiedermi "cosa mi alleno oggi?", "quanto metto di squat?", "come si fa il rematore?", "ho 20 minuti", "come sto andando?", "quante proteine devo mangiare?" oppure "sono in stallo".',
  };
}
