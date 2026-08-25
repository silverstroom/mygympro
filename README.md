# MyGymPro

Il tuo allenamento, i tuoi dati. Tracker palestra in italiano: piano settimanale, workout guidati con suggerimenti di progressione, 1.324 esercizi con demo animate, statistiche con heatmap, mappa muscoli e 1RM stimato.

Tutto vive nel browser (localStorage): nessun account, nessun server, export e import in JSON.

## Sviluppo

```bash
npm install
npm run dev
```

Il primo `npm run build` scarica il dataset esercizi e genera i file in `public/data/` (script `scripts/build-data.mjs`).

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 · Motion · Zustand · Phosphor Icons. Test delle logiche di allenamento con Vitest (`npx vitest run`).

## Crediti

- Ispirata al progetto open source [openGym](https://github.com/DuarteSantos8/openGym); codice riscritto da zero.
- Dati esercizi: [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (MIT), istruzioni in 10 lingue.
- Immagini e animazioni degli esercizi: © Gym visual · [gymvisual.com](https://gymvisual.com/), ridistribuite con attribuzione a risoluzione 180×180.
