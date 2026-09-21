import type { ExerciseIndex } from "./types";

export interface ExerciseCues {
  /** Accortezze da rispettare mentre esegui. */
  watch: string[];
  /** Errori tipici da non fare. */
  avoid: string[];
  /** "specifica" = scritta per questo movimento, "generale" = valida per la famiglia di esercizi. */
  source: "specifica" | "generale";
}

interface Rule {
  test: RegExp;
  not?: RegExp;
  watch: string[];
  avoid: string[];
}

/** L'ordine conta: vince la prima regola che corrisponde. */
const RULES: Rule[] = [
  {
    test: /leg press|sled 45|hack squat/,
    watch: [
      "Schiena e bacino restano appoggiati allo schienale per tutta la serie.",
      "Piedi a metà pedana, larghezza spalle: spingi con tutta la pianta.",
    ],
    avoid: [
      "Non bloccare di scatto le ginocchia in chiusura.",
      "Non scendere così in basso da far staccare il bacino dallo schienale.",
    ],
  },
  {
    test: /sissy squat/,
    watch: ["Tienti a un supporto e scendi solo fin dove controlli."],
    avoid: ["Non forzare l'escursione: il ginocchio qui lavora in posizione scomoda."],
  },
  {
    test: /squat/,
    watch: [
      "Piedi a larghezza spalle, punte leggermente in fuori.",
      "Il ginocchio viaggia nella direzione della punta del piede.",
      "Petto alto e addome contratto: la schiena resta neutra.",
    ],
    avoid: [
      "Non far cedere le ginocchia verso l'interno risalendo.",
      "Non staccare i talloni da terra per scendere più in basso.",
      "Non arrotondare la lombare nel punto più basso: fermati prima.",
    ],
  },
  {
    test: /romanian deadlift|stiff leg|good morning/,
    watch: [
      "Il movimento parte dalle anche che vanno indietro, non dalla schiena che si piega.",
      "Il carico scorre vicino alle gambe; scendi finché senti i femorali tirare.",
    ],
    avoid: [
      "Non arrotondare la schiena: se si curva, il carico è troppo.",
      "Non trasformarlo in uno squat: le ginocchia restano quasi ferme.",
    ],
  },
  {
    test: /deadlift|rack pull/,
    watch: [
      "Bilanciere sopra il mezzo piede, spalle appena avanti alla sbarra.",
      "Addome contratto come se dovessi ricevere un pugno, poi spingi il pavimento via.",
      "La sbarra resta a contatto con le gambe per tutta la salita.",
    ],
    avoid: [
      "Mai partire con la schiena curva.",
      "Non tirare con le braccia: sono ganci, non motori.",
      "Non iperestendere la schiena in chiusura per 'fare scena'.",
    ],
  },
  {
    test: /hip thrust|glute bridge|bridge/,
    watch: [
      "Spingi con i talloni e chiudi i glutei nel punto alto.",
      "Costole basse e mento verso il petto: il bacino sale, la schiena no.",
    ],
    avoid: ["Non inarcare la lombare per guadagnare centimetri in alto."],
  },
  {
    test: /bench press|chest press|floor press/,
    watch: [
      "Scapole addotte e piedi a terra: la spinta parte da tutto il corpo.",
      "Gomiti a circa 45° dal busto, polsi dritti sopra i gomiti.",
      "Con il bilanciere carica i fermi o fatti assistere.",
    ],
    avoid: [
      "Non far rimbalzare il bilanciere sul petto.",
      "Non staccare i glutei dalla panca per spingere di più.",
      "Non aprire i gomiti a 90°: la spalla presenta il conto.",
    ],
  },
  {
    test: /push-?up|push up/,
    watch: [
      "Corpo in linea: testa, bacino e talloni sullo stesso piano.",
      "Gomiti a 45°, mani sotto le spalle o poco più larghe.",
      "Se non arrivi in basso pulito, appoggia le ginocchia o alza le mani su un rialzo.",
    ],
    avoid: [
      "Non lasciar sprofondare il bacino verso il pavimento.",
      "Non fermarti a metà: il petto scende vicino a terra.",
      "Non portare la testa avanti prima delle spalle.",
    ],
  },
  {
    test: /handstand/,
    watch: [
      "Falla contro il muro, con un cuscino o un tappetino sotto la testa.",
      "Passaci solo quando tieni la verticale al muro per almeno 30 secondi.",
    ],
    avoid: ["Non provarla senza muro o senza saper uscire dalla posizione."],
  },
  {
    test: /overhead press|shoulder press|military|standing press/,
    watch: [
      "Glutei e addome contratti: il busto resta rigido.",
      "Il carico passa vicino al viso e finisce sopra la testa, non davanti.",
    ],
    avoid: [
      "Non inarcare la lombare per spingere il carico su.",
      "Non spingere in avanti: le spalle non sono fatte per quell'arco.",
    ],
  },
  {
    test: /lateral raise|front raise|reverse fly|rear (lateral|delt)/,
    watch: [
      "Carico leggero: qui conta il controllo, non i chili.",
      "Sali fino all'altezza della spalla, gomito leggermente flesso.",
    ],
    avoid: [
      "Non usare lo slancio del busto per partire.",
      "Non ruotare il pollice verso il basso salendo oltre la spalla.",
    ],
  },
  {
    test: /upright row/,
    watch: ["Tira al massimo fino all'altezza dello sterno, presa non troppo stretta."],
    avoid: ["Non salire con i gomiti sopra le spalle: è la via rapida all'impingement."],
  },
  {
    test: /pull-?up|chin-?up|pulldown|lat pull/,
    watch: [
      "Parti da braccia distese ma spalle attive, non appese passivamente.",
      "Tira portando i gomiti verso i fianchi e il petto verso la sbarra.",
    ],
    avoid: [
      "Non usare lo slancio delle gambe se cerchi forza.",
      "Non fermare le ripetizioni a metà arco.",
    ],
  },
  {
    test: /row/,
    watch: [
      "Tira con il gomito: la scapola va verso la colonna.",
      "Il busto resta fermo, l'angolo non cambia durante la serie.",
    ],
    avoid: [
      "Non trasformare la tirata in uno slancio di schiena.",
      "Non scrollare le spalle verso le orecchie a fine tirata.",
    ],
  },
  {
    test: /shrug/,
    watch: ["Sali dritto verso l'alto e tieni un attimo la contrazione."],
    avoid: ["Non fare cerchi con le spalle: non aggiungono niente e caricano il collo."],
  },
  {
    test: /curl/,
    watch: [
      "Gomiti fermi lungo i fianchi.",
      "Scendi controllando: la fase negativa è metà del lavoro.",
    ],
    avoid: ["Non oscillare con la schiena per chiudere le ultime ripetizioni."],
  },
  {
    test: /dip/,
    watch: [
      "Scendi finché le spalle sono all'altezza dei gomiti.",
      "Busto leggermente avanti per il petto, verticale per i tricipiti.",
    ],
    avoid: [
      "Non scendere oltre: sotto il parallelo la spalla lavora in posizione critica.",
      "Non far cadere le spalle verso le orecchie in basso.",
    ],
  },
  {
    test: /triceps|pushdown|skull|french/,
    watch: [
      "Gomiti stretti e fermi: si muove solo l'avambraccio.",
      "Chiudi senza bloccare di scatto il gomito.",
    ],
    avoid: ["Non aprire i gomiti verso l'esterno per aiutarti con le spalle."],
  },
  {
    test: /plank/,
    watch: [
      "Bacino in linea con spalle e talloni, glutei e addome contratti.",
      "Respira normalmente: la tenuta non si fa in apnea.",
    ],
    avoid: [
      "Non far cadere la pancia verso il pavimento.",
      "Non alzare il sedere per riposare a metà tenuta.",
    ],
  },
  {
    test: /crunch|sit-?up|cocoon|heel touch|v-?up/,
    watch: [
      "Stacca le scapole, non tutta la schiena.",
      "Le mani dietro la testa solo appoggiate, gomiti larghi.",
    ],
    avoid: [
      "Non tirare il collo con le mani.",
      "Non rincorrere la velocità: qui vince il controllo.",
    ],
  },
  {
    test: /russian twist|twist/,
    watch: ["La rotazione parte dal torace, non dalle sole braccia."],
    avoid: ["Non arrotondare la lombare mentre ruoti sotto carico."],
  },
  {
    test: /leg raise|knee raise/,
    watch: ["Schiaccia la lombare a terra (o tieni il bacino fermo alla sbarra)."],
    avoid: ["Non lasciare che la schiena si stacchi e si inarchi scendendo."],
  },
  {
    test: /mountain climber|high knee|bear crawl/,
    watch: ["Spalle sopra i polsi, bacino basso e fermo."],
    avoid: ["Non far rimbalzare il bacino su e giù per andare più veloce."],
  },
  {
    test: /lunge|split squat|step-?up/,
    watch: [
      "Passo abbastanza lungo e busto verticale.",
      "Il ginocchio davanti resta in linea con la punta del piede.",
    ],
    avoid: [
      "Non sbattere il ginocchio dietro a terra.",
      "Non far cedere il ginocchio davanti verso l'interno.",
    ],
  },
  {
    test: /calf raise/,
    watch: [
      "Escursione piena: scendi sotto il livello del gradino e sali fino in punta.",
      "Ritmo lento, un secondo di pausa in alto.",
    ],
    avoid: ["Non rimbalzare sul tendine d'Achille per fare numero."],
  },
  {
    test: /leg extension|leg curl/,
    watch: ["Regola lo schienale: l'asse della macchina deve stare all'altezza del ginocchio."],
    avoid: ["Non lanciare il carico e non lasciarlo sbattere a fine ripetizione."],
  },
  {
    test: /hyperextension|back extension/,
    watch: ["Sali fino ad allineare il corpo e fermati lì."],
    avoid: ["Non iperestendere la schiena a fine ripetizione."],
  },
  {
    test: /burpee|jump squat|box jump|jump lunge|lunge with jump|plyo|drop jump/,
    watch: [
      "Atterra morbido: prima l'avampiede, poi il tallone, ginocchia che assorbono.",
      "Meglio poche ripetizioni pulite che tante a gambe stanche.",
    ],
    avoid: [
      "Non atterrare a gambe rigide.",
      "Non continuare quando la tecnica si sfalda: qui ci si fa male da stanchi.",
    ],
  },
  {
    test: /jump rope|skipping/,
    watch: [
      "Salti bassi, la corda la girano i polsi.",
      "Se il pavimento è duro, scarpe ammortizzate.",
    ],
    avoid: ["Non saltare a gambe tese per minuti: i polpacci si chiudono."],
  },
  {
    test: /stationary bike|cycle/,
    watch: ["Sella all'altezza dell'anca: a pedale basso il ginocchio resta appena piegato."],
    avoid: ["Non pedalare con il bacino che dondola da un lato all'altro."],
  },
  {
    test: /treadmill|run|walk/,
    watch: ["Passo naturale, sguardo avanti, niente aggrapparsi al corrimano."],
    avoid: ["Non aumentare pendenza e velocità insieme."],
  },
];

const BY_TARGET: Record<string, { watch: string[]; avoid: string[] }> = {
  abs: {
    watch: ["Tieni la lombare ferma e lavora con l'addome, non con il collo."],
    avoid: ["Non tirare la testa con le mani."],
  },
  "lower back": {
    watch: ["Movimento lento e controllato, escursione corta."],
    avoid: ["Non cercare il massimo allungamento sotto carico."],
  },
  spine: {
    watch: ["Movimento lento e controllato, escursione corta."],
    avoid: ["Non cercare il massimo allungamento sotto carico."],
  },
  delts: {
    watch: ["Carichi onesti: la spalla è l'articolazione più delicata della sala pesi."],
    avoid: ["Non aiutarti con lo slancio del busto."],
  },
  "cardiovascular system": {
    watch: ["Tieni un ritmo che ti lascia parlare a frasi corte."],
    avoid: ["Non partire al massimo: il fiato serve anche alla fine."],
  },
};

const BY_EQUIP: Record<string, { watch?: string; avoid?: string }> = {
  barbell: { watch: "Con il bilanciere usa i fermi e, sui carichi alti, fatti assistere." },
  "olympic barbell": { watch: "Con il bilanciere usa i fermi e, sui carichi alti, fatti assistere." },
  "leverage machine": { watch: "Regola sedile e fermi prima di partire: l'articolazione deve coincidere con l'asse della macchina." },
  "sled machine": { watch: "Regola sedile e fermi prima di partire." },
  "smith machine": { watch: "Ricordati di agganciare i fermi a fine serie." },
  cable: { watch: "Parti già in tensione e riaccompagna il peso: non lasciarlo cadere." },
  dumbbell: { watch: "Prendi e appoggia i manubri con le gambe, non con la schiena." },
  kettlebell: { watch: "Impara prima il movimento a vuoto: il kettlebell perdona poco." },
};

const GENERIC = {
  watch: [
    "Prova il movimento a vuoto o con un carico leggero prima di caricare.",
    "Due secondi in discesa, niente rimbalzi: il controllo è il carico vero.",
  ],
  avoid: [
    "Non aggiungere peso se la tecnica cambia.",
    "Non arrivare al cedimento in ogni serie: lascia sempre una ripetizione di margine.",
  ],
};

function uniq(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

/**
 * Indicazioni pratiche per l'esercizio: cosa curare e cosa non fare.
 * Le regole specifiche vincono; quando non c'è nulla di mirato lo dichiara
 * con source "generale" invece di spacciare consigli generici per su misura.
 */
export function cuesFor(ex: Pick<ExerciseIndex, "n" | "t" | "b" | "e">): ExerciseCues {
  const name = ex.n.toLowerCase();
  const rule = RULES.find((r) => r.test.test(name) && (!r.not || !r.not.test(name)));
  const equipNote = BY_EQUIP[ex.e];

  if (rule) {
    return {
      watch: uniq([...rule.watch, equipNote?.watch ?? ""]).slice(0, 4),
      avoid: uniq([...rule.avoid, equipNote?.avoid ?? ""]).slice(0, 3),
      source: "specifica",
    };
  }

  const byTarget = BY_TARGET[ex.t];
  return {
    watch: uniq([...(byTarget?.watch ?? []), equipNote?.watch ?? "", ...GENERIC.watch]).slice(0, 3),
    avoid: uniq([...(byTarget?.avoid ?? []), equipNote?.avoid ?? "", ...GENERIC.avoid]).slice(0, 3),
    source: "generale",
  };
}
