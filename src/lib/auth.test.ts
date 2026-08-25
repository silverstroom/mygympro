import { beforeEach, describe, expect, it } from "vitest";
import {
  accountById,
  enterAsGuest,
  superAdminLogin,
  adminResetPassword,
  changePassword,
  deleteAccount,
  getSession,
  impersonate,
  listAccounts,
  login,
  logout,
  register,
  seedAccountState,
  setAdmin,
  stopImpersonation,
  userStorageKey,
  accountStats,
  backupInfo,
  restoreBackup,
  savePreDemo,
  hasPreDemo,
  restorePreDemo,
} from "./auth";

function mockStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

beforeEach(() => {
  (globalThis as { localStorage: Storage }).localStorage = mockStorage();
});

describe("register", () => {
  it("il primo account diventa admin e apre la sessione", async () => {
    const r = await register("Salvo", "1234");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.account.admin).toBe(true);
      expect(getSession()?.id).toBe(r.account.id);
    }
  });

  it("il secondo account non è admin", async () => {
    await register("Salvo", "1234");
    const r2 = await register("Anna", "abcd");
    expect(r2.ok && !r2.account.admin).toBe(true);
  });

  it("nomi duplicati rifiutati, case-insensitive", async () => {
    await register("Salvo", "1234");
    const dup = await register("  salvo ", "5678");
    expect(dup.ok).toBe(false);
  });

  it("password corta rifiutata", async () => {
    const r = await register("Salvo", "12");
    expect(r.ok).toBe(false);
  });

  it("migra i dati legacy nel primo account", async () => {
    localStorage.setItem(
      "mygympro-v1",
      JSON.stringify({ state: { workouts: [{ d: "2026-01-01" }], onboarded: true }, version: 0 })
    );
    const r = await register("Salvo", "1234");
    expect(r.ok && r.migrated).toBe(true);
    if (r.ok) {
      expect(localStorage.getItem(userStorageKey(r.account.id))).toContain("2026-01-01");
      expect(localStorage.getItem("mygympro-v1")).toBeNull();
    }
  });
});

describe("login", () => {
  it("password giusta entra, sbagliata no", async () => {
    const r = await register("Salvo", "1234");
    logout();
    expect(getSession()).toBeNull();
    if (!r.ok) throw new Error();
    const bad = await login(r.account.id, "9999");
    expect(bad.ok).toBe(false);
    const good = await login(r.account.id, "1234");
    expect(good.ok).toBe(true);
    expect(getSession()?.id).toBe(r.account.id);
  });
});

describe("admin", () => {
  it("reset password di un altro account", async () => {
    const a = await register("Salvo", "1234");
    const b = await register("Anna", "abcd");
    if (!a.ok || !b.ok) throw new Error();
    const res = await adminResetPassword(a.account.id, b.account.id, "nuova");
    expect(res.ok).toBe(true);
    const l = await login(b.account.id, "nuova");
    expect(l.ok).toBe(true);
  });

  it("un non-admin non può resettare password", async () => {
    const a = await register("Salvo", "1234");
    const b = await register("Anna", "abcd");
    if (!a.ok || !b.ok) throw new Error();
    const res = await adminResetPassword(b.account.id, a.account.id, "hack");
    expect(res.ok).toBe(false);
  });

  it("promuove e non lascia il sistema senza admin", async () => {
    const a = await register("Salvo", "1234");
    const b = await register("Anna", "abcd");
    if (!a.ok || !b.ok) throw new Error();
    expect(setAdmin(a.account.id, b.account.id, true).ok).toBe(true);
    expect(setAdmin(a.account.id, a.account.id, false).ok).toBe(true);
    expect(setAdmin(b.account.id, b.account.id, false).ok).toBe(false);
  });

  it("impersonation avanti e indietro", async () => {
    const a = await register("Salvo", "1234");
    const b = await register("Anna", "abcd");
    if (!a.ok || !b.ok) throw new Error();
    expect(impersonate(a.account.id, b.account.id)).toBe(true);
    expect(getSession()?.id).toBe(b.account.id);
    expect(getSession()?.via).toBe(a.account.id);
    expect(stopImpersonation()).toBe(true);
    expect(getSession()?.id).toBe(a.account.id);
  });

  it("un non-admin non può impersonare", async () => {
    const a = await register("Salvo", "1234");
    const b = await register("Anna", "abcd");
    if (!a.ok || !b.ok) throw new Error();
    expect(impersonate(b.account.id, a.account.id)).toBe(false);
  });
});

describe("deleteAccount", () => {
  it("l'utente elimina se stesso e i suoi dati", async () => {
    const a = await register("Salvo", "1234");
    const b = await register("Anna", "abcd");
    if (!a.ok || !b.ok) throw new Error();
    seedAccountState(b.account.id, { workouts: [] });
    const res = deleteAccount(b.account.id, b.account.id);
    expect(res.ok).toBe(true);
    expect(accountById(b.account.id)).toBeNull();
    expect(localStorage.getItem(userStorageKey(b.account.id))).toBeNull();
  });

  it("l'unico admin non si elimina se ci sono altri account", async () => {
    const a = await register("Salvo", "1234");
    await register("Anna", "abcd");
    if (!a.ok) throw new Error();
    expect(deleteAccount(a.account.id, a.account.id).ok).toBe(false);
  });

  it("un estraneo non elimina altri", async () => {
    const a = await register("Salvo", "1234");
    const b = await register("Anna", "abcd");
    if (!a.ok || !b.ok) throw new Error();
    expect(deleteAccount(b.account.id, a.account.id).ok).toBe(false);
  });
});

describe("guest", () => {
  it("enterAsGuest crea e poi riusa lo stesso account", () => {
    const g1 = enterAsGuest();
    expect(g1.guest).toBe(true);
    expect(g1.admin).toBe(false);
    expect(getSession()?.id).toBe(g1.id);
    logout();
    const g2 = enterAsGuest();
    expect(g2.id).toBe(g1.id);
  });

  it("il primo account reale dopo l'ospite è admin e migra i dati ospite", async () => {
    const g = enterAsGuest();
    seedAccountState(g.id, { workouts: [{ d: "2026-08-20" }], onboarded: true });
    const r = await register("Salvo", "1234", { fromGuestId: g.id });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.account.admin).toBe(true);
    expect(r.migrated).toBe(true);
    expect(localStorage.getItem(userStorageKey(r.account.id))).toContain("2026-08-20");
    expect(accountById(g.id)).toBeNull();
    expect(localStorage.getItem(userStorageKey(g.id))).toBeNull();
  });

  it("l'ospite entra senza password", async () => {
    const g = enterAsGuest();
    logout();
    const l = await login(g.id, "");
    expect(l.ok).toBe(true);
  });
});

describe("super admin", () => {
  it("entra con le credenziali giuste e resta admin", async () => {
    const r = await superAdminLogin("Salvo", "GymPro2026_?$$");
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error();
    expect(r.account.root).toBe(true);
    expect(r.account.admin).toBe(true);
    const again = await superAdminLogin("salvo", "GymPro2026_?$$");
    expect(again.ok && again.account.id === r.account.id).toBe(true);
  });

  it("credenziali sbagliate rifiutate", async () => {
    expect((await superAdminLogin("salvo", "sbagliata")).ok).toBe(false);
    expect((await superAdminLogin("altro", "GymPro2026_?$$")).ok).toBe(false);
  });

  it("non degradabile e non eliminabile", async () => {
    const r = await superAdminLogin("salvo", "GymPro2026_?$$");
    if (!r.ok) throw new Error();
    const other = await register("Anna", "abcd");
    if (!other.ok) throw new Error();
    expect(setAdmin(r.account.id, r.account.id, false).ok).toBe(false);
    expect(deleteAccount(other.account.id, r.account.id).ok).toBe(false);
    expect((await changePassword(r.account.id, "GymPro2026_?$$", "nuova")).ok).toBe(false);
  });

  it("un utente normale puo comunque chiamarsi salvo", async () => {
    await superAdminLogin("salvo", "GymPro2026_?$$");
    const r = await register("Salvo", "1234");
    expect(r.ok).toBe(true);
  });
});

describe("changePassword", () => {
  it("cambia con vecchia password corretta", async () => {
    const a = await register("Salvo", "1234");
    if (!a.ok) throw new Error();
    expect((await changePassword(a.account.id, "0000", "abcd")).ok).toBe(false);
    expect((await changePassword(a.account.id, "1234", "abcd")).ok).toBe(true);
    logout();
    expect((await login(a.account.id, "abcd")).ok).toBe(true);
  });
});

describe("accountStats", () => {
  it("legge le statistiche dallo storage del profilo", async () => {
    const a = await register("Salvo", "1234");
    if (!a.ok) throw new Error();
    seedAccountState(a.account.id, {
      workouts: [{ d: "2026-08-01" }, { d: "2026-08-10" }],
      bodyweight: [{ d: "2026-08-01", w: 80 }],
      routines: [{}],
      onboarded: true,
    });
    const st = accountStats(a.account.id);
    expect(st.workouts).toBe(2);
    expect(st.lastWorkout).toBe("2026-08-10");
    expect(st.routines).toBe(1);
    expect(st.onboarded).toBe(true);
  });

  it("registry visibile", async () => {
    await register("Salvo", "1234");
    await register("Anna", "abcd");
    expect(listAccounts().length).toBe(2);
  });
});

describe("snapshot e ripristino", () => {
  it("il login salva una copia dei dati e restoreBackup la rimette", async () => {
    const r = await register("Salvo", "1234");
    if (!r.ok) throw new Error("register fallita");
    const id = r.account.id;
    seedAccountState(id, { workouts: ["buono"] });
    logout();
    await login(id, "1234");
    expect(backupInfo(id)).toBeTypeOf("number");
    localStorage.setItem(userStorageKey(id), JSON.stringify({ state: { workouts: [] }, version: 0 }));
    expect(restoreBackup(id)).toBe(true);
    const raw = JSON.parse(localStorage.getItem(userStorageKey(id))!);
    expect(raw.state.workouts).toEqual(["buono"]);
  });

  it("senza dati salvati non c'è backup né ripristino", async () => {
    const r = await register("Vuoto", "1234");
    if (!r.ok) throw new Error("register fallita");
    expect(backupInfo(r.account.id)).toBeNull();
    expect(restoreBackup(r.account.id)).toBe(false);
  });

  it("savePreDemo conserva i dati reali e restorePreDemo li rimette una volta sola", async () => {
    const r = await register("Salvo", "1234");
    if (!r.ok) throw new Error("register fallita");
    const id = r.account.id;
    seedAccountState(id, { workouts: ["reale"] });
    savePreDemo(id);
    expect(hasPreDemo(id)).toBe(true);
    seedAccountState(id, { workouts: ["demo"] });
    expect(restorePreDemo(id)).toBe(true);
    const raw = JSON.parse(localStorage.getItem(userStorageKey(id))!);
    expect(raw.state.workouts).toEqual(["reale"]);
    expect(hasPreDemo(id)).toBe(false);
    expect(restorePreDemo(id)).toBe(false);
  });
});
