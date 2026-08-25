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

export function shouldHypeSet(weight: number, reps: number): boolean {
  if (weight * reps < 350 && weight < 70) return false;
  return Math.random() < 0.35;
}
