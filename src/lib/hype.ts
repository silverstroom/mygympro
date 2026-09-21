const VOLUME_REFS: [number, string][] = [
  [30000, "tre T-Rex a colazione"],
  [20000, "un camion dei pompieri"],
  [15000, "una balenottera cucciola"],
  [12000, "due elefanti africani"],
  [9000, "OVER 9000: nemmeno Vegeta ci crede"],
  [6000, "un elefante africano"],
  [4000, "un ippopotamo in gita"],
  [2500, "un pickup carico"],
  [1500, "un rinoceronte giovane"],
  [1000, "una Smart parcheggiata male"],
  [600, "una Vespa con due passeggeri"],
  [300, "un frigorifero pieno"],
  [100, "una lavatrice in centrifuga"],
  [1, "già più del divano"],
];

const SET_REFS: [number, string][] = [
  [180, "un pianoforte a coda: Rocky applaude"],
  [150, "un orso panda vero, di quelli pigri"],
  [120, "una moto d'epoca"],
  [100, "un pianoforte verticale"],
  [90, "un portiere di hockey vestito"],
  [80, "un frigorifero americano"],
  [70, "una cassa da concerto"],
  [60, "una lavatrice"],
];

const PR_LINES = [
  "Record personale: la Forza è forte in te.",
  "PR! Rocky salirebbe le scale un'altra volta solo per te.",
  "Nuovo massimale: Hulk comincia a innervosirsi.",
  "PR sbloccato, achievement da manuale.",
  "Livello superato: il vecchio te non ti prende più.",
];

const GOAL_LINES: Record<string, string[]> = {
  massa: [
    "Un altro mattone sul muro dei muscoli.",
    "La maglietta comincia ad avere paura.",
  ],
  forza: [
    "Sempre più vicino alla modalità carro armato.",
    "I bilancieri iniziano a salutarti con rispetto.",
  ],
  dimagrimento: [
    "Fornace accesa: le calorie non hanno scampo.",
    "Il fiatone di oggi è la foto di domani.",
  ],
  salute: [
    "Il tuo cardiologo sta sorridendo e non sa perché.",
    "Corpo in ordine, testa leggera: così si fa.",
  ],
};

const SET_OPENERS = [
  "Bravissimo: hai appena sollevato",
  "Serie chiusa: in pratica",
  "Boom: quel bilanciere pesava quanto",
  "Fatto, e con che stile: era come alzare",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function hypeForSet(weight: number): string | null {
  if (weight < 60) return null;
  const ref = SET_REFS.find(([w]) => weight >= w);
  if (!ref) return null;
  return `${pick(SET_OPENERS)} ${ref[1]}`;
}

export function hypeForVolume(volumeKg: number, goal?: string | null): string | null {
  if (volumeKg < 1) return null;
  const ref = VOLUME_REFS.find(([v]) => volumeKg >= v);
  if (!ref) return null;
  const base = `Oggi hai spostato in totale l'equivalente di ${ref[1]}.`;
  const goalLine = goal && GOAL_LINES[goal] ? " " + pick(GOAL_LINES[goal]) : "";
  return base + goalLine;
}

export function hypeForPR(): string {
  return pick(PR_LINES);
}


export type HypeTone = "ok" | "fire" | "pr";

export interface SetContext {
  mode: "reps" | "time" | "cardio";
  weight?: number | null;
  reps?: number | null;
  sec?: number | null;
  min?: number | null;
  setIdx: number;
  setCount: number;
  doneSets: number;
  totalSets: number;
  lastOfExercise: boolean;
  /** esercizio davvero a corpo libero, non un bilanciere lasciato a zero */
  bodyweight?: boolean;
  isPR?: boolean;
  beatLast?: boolean;
}

export interface HypeLine {
  text: string;
  tone: HypeTone;
}

const PR_SET_LINES = [
  "Record personale, qui e ora: te lo sei preso.",
  "Mai sollevato tanto: il vecchio te guarda da lontano.",
  "Nuovo massimale in cassaforte. Hulk prende appunti.",
];

const BEAT_LAST_LINES = [
  "Meglio dell'ultima volta: la progressione è tutta qui.",
  "Un gradino sopra la scorsa sessione. Continua così.",
  "Hai battuto il te stesso di sette giorni fa.",
];

const CLOSE_EXERCISE_LINES = [
  "Esercizio chiuso, tutte le serie in cascina.",
  "Ultima serie di questo esercizio: fatta.",
  "Esercizio archiviato. Si passa al prossimo.",
];

const REPS_LINES = [
  "Serie a segno.",
  "Bella lì: una in meno da fare.",
  "Fatta. Respira e riparti.",
  "Pulita. Il conto sale.",
  "Serie chiusa senza sconti.",
  "Ottimo controllo: avanti così.",
  "Questa è entrata bene.",
  "Un'altra messa via.",
];

const BODYWEIGHT_LINES = [
  "Nessun bilanciere: solo tu contro la gravità. Vinci tu.",
  "Il corpo è il tuo carico, e lo stai spostando bene.",
  "Zero attrezzi, zero alibi: serie fatta.",
];

const TIME_LINES = [
  "Tenuta finita: il core se n'è accorto.",
  "Secondi resistiti fino in fondo.",
  "Isometria chiusa senza mollare.",
];

const CARDIO_LINES = [
  "Minuti messi nelle gambe.",
  "Motore acceso: il fiato ringrazia.",
  "Cardio fatto, non rimandato.",
];

const HALFWAY_LINES = [
  "Metà workout: da qui è tutta discesa.",
  "Sei a metà strada, e la parte difficile è passata.",
];

const NEAR_END_LINES = [
  "Ci siamo quasi: resta poco.",
  "Ultimo tratto: non mollare adesso.",
];

const recent: string[] = [];

function pickFresh(arr: string[]): string {
  const free = arr.filter((x) => !recent.includes(x));
  const line = pick(free.length ? free : arr);
  recent.push(line);
  if (recent.length > 8) recent.shift();
  return line;
}

/** Frase di incoraggiamento per la serie appena spuntata. Non torna mai vuota. */
export function encourageSet(ctx: SetContext): HypeLine {
  if (ctx.isPR) return { text: pickFresh(PR_SET_LINES), tone: "pr" };
  if (ctx.beatLast) return { text: pickFresh(BEAT_LAST_LINES), tone: "pr" };

  const w = ctx.weight ?? 0;
  if (ctx.mode === "reps" && w >= 60) {
    const heavy = hypeForSet(w);
    if (heavy) return { text: heavy, tone: "fire" };
  }

  if (ctx.lastOfExercise) return { text: pickFresh(CLOSE_EXERCISE_LINES), tone: "fire" };

  const left = Math.max(0, ctx.totalSets - ctx.doneSets);
  if (ctx.totalSets >= 6) {
    const frac = ctx.doneSets / ctx.totalSets;
    if (frac >= 0.45 && frac <= 0.55) {
      return { text: pickFresh(HALFWAY_LINES), tone: "fire" };
    }
    if (left > 0 && left <= 2) {
      return { text: pickFresh(NEAR_END_LINES), tone: "fire" };
    }
  }

  if (ctx.mode === "time") return { text: pickFresh(TIME_LINES), tone: "ok" };
  if (ctx.mode === "cardio") return { text: pickFresh(CARDIO_LINES), tone: "ok" };
  if (ctx.bodyweight && w <= 0 && (ctx.reps ?? 0) >= 8) {
    return { text: pickFresh(BODYWEIGHT_LINES), tone: "ok" };
  }

  const base = pickFresh(REPS_LINES);
  const tail =
    left > 0
      ? left === 1
        ? " Ne resta una."
        : ` Ne restano ${left}.`
      : "";
  return { text: base + tail, tone: "ok" };
}

/** Usata nei test: azzera la memoria anti-ripetizione. */
export function resetHypeMemory() {
  recent.length = 0;
}
