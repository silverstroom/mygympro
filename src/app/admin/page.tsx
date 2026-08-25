"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  DownloadSimple,
  Eye,
  Key,
  ShieldSlash,
  ShieldStar,
  Sparkle,
  Trash,
  UsersThree,
} from "@phosphor-icons/react";
import type { Account, AccountStats } from "@/lib/auth";
import {
  accountStats,
  adminResetPassword,
  currentAccount,
  deleteAccount,
  exportAccountJSON,
  impersonate,
  listAccounts,
  setAdmin,
} from "@/lib/auth";
import { fmtShort } from "@/lib/dates";
import { Button, Card, Sheet, Tag, toast } from "@/components/ui";
import { initialsOf } from "@/components/AuthScreen";
import PasswordStrength from "@/components/PasswordStrength";
import PasswordInput from "@/components/PasswordInput";

interface Row {
  account: Account;
  stats: AccountStats;
}

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<Account | null | undefined>(undefined);
  const [rows, setRows] = useState<Row[]>([]);
  const [resetFor, setResetFor] = useState<Account | null>(null);
  const [newPw, setNewPw] = useState("");
  const [deleteFor, setDeleteFor] = useState<Account | null>(null);

  const reload = useCallback(() => {
    setMe(currentAccount());
    setRows(
      listAccounts()
        .sort((a, b) => a.created - b.created)
        .map((account) => ({ account, stats: accountStats(account.id) }))
    );
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (me === undefined) {
    return (
      <div className="flex flex-col gap-3 pt-4">
        <div className="skeleton h-10 w-1/2" />
        <div className="skeleton h-28 w-full" />
      </div>
    );
  }

  if (!me?.admin) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <ShieldSlash size={34} color="var(--text-3)" />
        <div className="text-[16px] font-bold">Area riservata</div>
        <p className="max-w-[280px] text-[13.5px] text-ink-2">
          Solo un account amministratore può gestire gli altri account.
        </p>
        <Button onClick={() => router.push("/")}>Torna alla home</Button>
      </div>
    );
  }

  const doExport = (a: Account) => {
    const json = exportAccountJSON(a.id);
    if (!json) {
      toast("Nessun dato da esportare", "warn");
      return;
    }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `mygympro-${a.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    el.click();
    URL.revokeObjectURL(url);
    toast(`Dati di ${a.name} esportati`);
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="card-in flex items-center gap-2.5" style={{ "--i": 0 } as React.CSSProperties}>
        <button
          aria-label="Indietro"
          onClick={() => router.push("/impostazioni")}
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2"
        >
          <ArrowLeft size={19} weight="bold" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="display text-[26px]">Account</h1>
          <div className="text-[12.5px] text-ink-3">
            {rows.length} su questo dispositivo · tu sei l'amministratore
          </div>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-soft">
          <UsersThree size={20} weight="fill" color="var(--amber)" />
        </span>
      </div>

      {rows.map(({ account: a, stats }, i) => {
        const isMe = a.id === me.id;
        return (
          <Card key={a.id} className="card-in" style={{ "--i": 1 + i } as React.CSSProperties}>
            <div className="flex items-center gap-3">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-[16px] font-bold text-accent">
                {a.avatar ? (
                  <img src={a.avatar} alt="" className="h-full w-full object-cover" />
                ) : a.demo ? (
                  <Sparkle size={20} weight="fill" color="var(--amber)" />
                ) : (
                  initialsOf(a.name)
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-[15.5px] font-bold">{a.name}</span>
                  {a.admin && (
                    <Tag tone="amber">
                      <ShieldStar size={11} weight="fill" />
                      Admin
                    </Tag>
                  )}
                  {a.demo && <Tag>Demo</Tag>}
                  {a.guest && <Tag>Ospite</Tag>}
                  {isMe && <Tag tone="accent">Tu</Tag>}
                </div>
                <div className="text-[12px] text-ink-3">
                  {stats.workouts} workout
                  {stats.lastWorkout ? ` · ultimo ${fmtShort(stats.lastWorkout)}` : ""}
                  {" · "}
                  {stats.routines} {stats.routines === 1 ? "scheda" : "schede"}
                </div>
              </div>
            </div>

            {!isMe && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    if (impersonate(me.id, a.id)) window.location.replace("/");
                    else toast("Impossibile aprire il profilo", "warn");
                  }}
                  className="press flex items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-2 text-[12.5px] font-bold text-accent"
                >
                  <Eye size={14} weight="bold" />
                  Apri profilo
                </button>
                {!a.demo && !a.guest && (
                  <button
                    onClick={() => {
                      setNewPw("");
                      setResetFor(a);
                    }}
                    className="press flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-[12.5px] font-semibold text-ink-2"
                  >
                    <Key size={14} weight="bold" />
                    Reset password
                  </button>
                )}
                {!a.demo && !a.guest && (
                  <button
                    onClick={() => {
                      const res = setAdmin(me.id, a.id, !a.admin);
                      if (res.ok) {
                        toast(a.admin ? `${a.name} non è più admin` : `${a.name} ora è admin`);
                        reload();
                      } else toast(res.error ?? "Operazione negata", "warn");
                    }}
                    className="press flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-[12.5px] font-semibold text-ink-2"
                  >
                    {a.admin ? (
                      <ShieldSlash size={14} weight="bold" />
                    ) : (
                      <ShieldStar size={14} weight="bold" />
                    )}
                    {a.admin ? "Togli admin" : "Rendi admin"}
                  </button>
                )}
                <button
                  onClick={() => doExport(a)}
                  className="press flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-[12.5px] font-semibold text-ink-2"
                >
                  <DownloadSimple size={14} weight="bold" />
                  Esporta
                </button>
                <button
                  onClick={() => setDeleteFor(a)}
                  className="press flex items-center gap-1.5 rounded-full bg-red-soft px-3.5 py-2 text-[12.5px] font-bold text-red"
                >
                  <Trash size={14} weight="bold" />
                  Elimina
                </button>
              </div>
            )}
          </Card>
        );
      })}

      <p className="px-1 text-[12px] leading-relaxed text-ink-3">
        Gli account e i loro dati vivono nel browser di questo dispositivo. Con
        "Apri profilo" entri nel loro account per vedere schede e progressi;
        un banner ti riporta al tuo con un tocco.
      </p>

      <Sheet
        open={resetFor != null}
        onClose={() => setResetFor(null)}
        title={resetFor ? `Nuova password per ${resetFor.name}` : ""}
      >
        <div className="flex flex-col gap-3 pb-2">
          <PasswordInput value={newPw} onChange={setNewPw} placeholder="Nuova password (minimo 4 caratteri)" autoFocus autoComplete="new-password" />
          <PasswordStrength value={newPw} className="px-0.5" />
          <Button
            variant="primary"
            onClick={async () => {
              if (!resetFor) return;
              const res = await adminResetPassword(me.id, resetFor.id, newPw);
              if (res.ok) {
                toast(`Password di ${resetFor.name} aggiornata`);
                setResetFor(null);
              } else toast(res.error ?? "Errore", "warn");
            }}
          >
            <Key size={16} weight="bold" />
            Imposta password
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={deleteFor != null}
        onClose={() => setDeleteFor(null)}
        title={deleteFor ? `Eliminare ${deleteFor.name}?` : ""}
      >
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-[14px] leading-relaxed text-ink-2">
            Account, schede, workout e pesate di {deleteFor?.name} verranno
            eliminati da questo dispositivo. Se servono, esporta prima i dati.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              if (!deleteFor) return;
              const res = deleteAccount(me.id, deleteFor.id);
              if (res.ok) {
                toast(`${deleteFor.name} eliminato`);
                setDeleteFor(null);
                reload();
              } else toast(res.error ?? "Errore", "warn");
            }}
          >
            <Trash size={16} weight="bold" />
            Elimina definitivamente
          </Button>
          <Button variant="ghost" onClick={() => setDeleteFor(null)}>
            Annulla
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
