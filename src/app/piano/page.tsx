"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Barbell,
  CaretRight,
  Lightning,
  MoonStars,
  Plus,
} from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { DAY_FULL } from "@/lib/dates";
import { STARTER_PPL, STARTER_WEEK } from "@/lib/starter";
import { Button, Card, Sheet, toast } from "@/components/ui";
import { ROUTINE_ICONS } from "@/components/routineIcons";

function uid(): string {
  return "r_" + Math.random().toString(36).slice(2, 9);
}

export default function PianoPage() {
  const router = useRouter();
  const routines = useStore((s) => s.routines);
  const week = useStore((s) => s.week);
  const assignDay = useStore((s) => s.assignDay);
  const saveRoutine = useStore((s) => s.saveRoutine);
  const [pickDay, setPickDay] = useState<number | null>(null);

  const newRoutine = () => {
    const id = uid();
    saveRoutine({ id, name: "Nuova scheda", icon: "barbell", exercises: [] });
    router.push(`/piano/routine/${id}`);
  };

  const loadStarter = () => {
    STARTER_PPL.forEach(saveRoutine);
    STARTER_WEEK.forEach((r, i) => assignDay(i, r));
    toast("Piano Push / Pull / Legs caricato");
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="card-in flex items-center justify-between" style={{ "--i": 0 } as React.CSSProperties}>
        <h1 className="display text-[30px]">Piano</h1>
        <Button variant="primary" onClick={newRoutine} className="min-h-[42px] px-4">
          <Plus size={17} weight="bold" />
          Scheda
        </Button>
      </div>

      <Card className="card-in" style={{ "--i": 1 } as React.CSSProperties}>
        <h2 className="display mb-2.5 text-[15px] text-ink-2">La tua settimana</h2>
        <div className="flex flex-col">
          {DAY_FULL.map((day, i) => {
            const rid = week[i];
            const r = routines.find((x) => x.id === rid) ?? null;
            const Icon = r ? (ROUTINE_ICONS[r.icon] ?? Barbell) : MoonStars;
            return (
              <button
                key={day}
                onClick={() => setPickDay(i)}
                className="press-soft flex items-center gap-3 rounded-[12px] px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
              >
                <span className="w-[86px] shrink-0 text-[13.5px] font-semibold text-ink-2">
                  {day}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${
                    r ? "bg-accent-soft" : "bg-surface-2"
                  }`}
                >
                  <Icon
                    size={17}
                    weight={r ? "bold" : "regular"}
                    color={r ? "var(--accent)" : "var(--text-3)"}
                  />
                </span>
                <span className={`flex-1 truncate text-[14.5px] font-bold ${r ? "" : "text-ink-3"}`}>
                  {r ? r.name : "Riposo"}
                </span>
                <CaretRight size={15} color="var(--text-3)" />
              </button>
            );
          })}
        </div>
      </Card>

      <div className="card-in flex items-center justify-between px-1" style={{ "--i": 2 } as React.CSSProperties}>
        <h2 className="display text-[15px] text-ink-2">Le tue schede</h2>
        <span className="text-[12.5px] text-ink-3">{routines.length}</span>
      </div>

      {routines.length === 0 && (
        <Card className="card-in border-accent bg-accent-soft" style={{ "--i": 3 } as React.CSSProperties}>
          <div className="mb-1 text-[16px] font-bold">Nessuna scheda ancora</div>
          <p className="mb-3 text-[13.5px] leading-snug text-ink-2">
            Parti dal classico Push / Pull / Legs in un tocco, oppure crea la
            tua prima scheda da zero.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="primary" onClick={loadStarter} className="flex-1">
              <Lightning size={17} weight="fill" />
              Carica PPL
            </Button>
            <Button onClick={newRoutine} className="flex-1">
              <Plus size={17} weight="bold" />
              Crea da zero
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2.5">
        {routines.map((r, i) => {
          const Icon = ROUTINE_ICONS[r.icon] ?? Barbell;
          const days = week
            .map((rid, di) => (rid === r.id ? DAY_FULL[di].slice(0, 3) : null))
            .filter(Boolean)
            .join(" · ");
          return (
            <div
              key={r.id}
              className="card-in"
              style={{ "--i": 3 + i } as React.CSSProperties}
            >
              <Card onClick={() => router.push(`/piano/routine/${r.id}`)}>
                <div className="flex items-center gap-3.5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] bg-accent-soft">
                    <Icon size={24} weight="bold" color="var(--accent)" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-bold">{r.name}</div>
                    <div className="truncate text-[12.5px] text-ink-3">
                      {r.exercises.length}{" "}
                      {r.exercises.length === 1 ? "esercizio" : "esercizi"}
                      {days ? ` · ${days}` : ""}
                    </div>
                  </div>
                  <CaretRight size={17} color="var(--text-3)" />
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      <Sheet
        open={pickDay != null}
        onClose={() => setPickDay(null)}
        title={pickDay != null ? DAY_FULL[pickDay] : ""}
      >
        {pickDay != null && (
          <div className="flex flex-col gap-2 pb-2">
            {routines.map((r) => {
              const Icon = ROUTINE_ICONS[r.icon] ?? Barbell;
              const on = week[pickDay] === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    assignDay(pickDay, r.id);
                    setPickDay(null);
                  }}
                  className={`press flex w-full items-center gap-3 rounded-[14px] border p-3 text-left ${
                    on ? "border-accent bg-accent-soft" : "border-line bg-surface-2"
                  }`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-surface-3">
                    <Icon size={20} weight="bold" color="var(--accent)" />
                  </span>
                  <span className="flex-1 text-[15px] font-bold">{r.name}</span>
                  <span className="text-[12.5px] text-ink-3">{r.exercises.length} es.</span>
                </button>
              );
            })}
            <button
              onClick={() => {
                assignDay(pickDay, null);
                setPickDay(null);
              }}
              className="press flex w-full items-center gap-3 rounded-[14px] border border-line bg-surface-2 p-3 text-left"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-surface-3">
                <MoonStars size={20} weight="fill" color="var(--text-3)" />
              </span>
              <span className="flex-1 text-[15px] font-bold text-ink-2">Riposo</span>
            </button>
            {!routines.length && (
              <div className="pt-1 text-center text-[13px] text-ink-2">
                Crea prima una scheda con il pulsante in alto.
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
