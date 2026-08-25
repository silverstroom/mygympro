export interface Account {
  id: string;
  name: string;
  admin: boolean;
  demo: boolean;
  guest?: boolean;
  root?: boolean;
  salt: string;
  hash: string;
  created: number;
  lastLogin: number;
  avatar?: string;
}

const SUPER_NAME = "salvo";
const SUPER_SALT = "A6l4T2FY04We6lCZMX0qtA==";
const SUPER_HASH = "3M08K1utf+WF0aq9FvEActuvtvwOzBWjPuEDbi6Twq0=";

export interface Session {
  id: string;
  via?: string;
}

const REGISTRY_KEY = "mygympro-accounts-v1";
const SESSION_KEY = "mygympro-session-v1";
const LEGACY_KEY = "mygympro-v1";

function ls(): Storage | null {
  try {
    return typeof globalThis.localStorage !== "undefined"
      ? globalThis.localStorage
      : null;
  } catch {
    return null;
  }
}

export function userStorageKey(id: string): string {
  return `mygympro-u-${id}`;
}

function backupKey(id: string): string {
  return `${userStorageKey(id)}-backup`;
}

function preDemoKey(id: string): string {
  return `${userStorageKey(id)}-predemo`;
}

export function snapshotOnLogin(id: string) {
  const s = ls();
  if (!s) return;
  const data = s.getItem(userStorageKey(id));
  if (!data) return;
  try {
    s.setItem(backupKey(id), JSON.stringify({ at: Date.now(), data }));
  } catch {}
}

export function backupInfo(id: string): number | null {
  const s = ls();
  if (!s) return null;
  try {
    const raw = s.getItem(backupKey(id));
    if (!raw) return null;
    const p = JSON.parse(raw) as { at?: unknown; data?: unknown };
    return typeof p.at === "number" && typeof p.data === "string" ? p.at : null;
  } catch {
    return null;
  }
}

export function restoreBackup(id: string): boolean {
  const s = ls();
  if (!s) return false;
  try {
    const raw = s.getItem(backupKey(id));
    if (!raw) return false;
    const p = JSON.parse(raw) as { data?: unknown };
    if (typeof p.data !== "string") return false;
    s.setItem(userStorageKey(id), p.data);
    return true;
  } catch {
    return false;
  }
}

export function savePreDemo(id: string) {
  const s = ls();
  if (!s) return;
  const data = s.getItem(userStorageKey(id));
  if (data == null) return;
  try {
    s.setItem(preDemoKey(id), data);
  } catch {}
}

export function hasPreDemo(id: string): boolean {
  return ls()?.getItem(preDemoKey(id)) != null;
}

export function restorePreDemo(id: string): boolean {
  const s = ls();
  if (!s) return false;
  const data = s.getItem(preDemoKey(id));
  if (data == null) return false;
  s.setItem(userStorageKey(id), data);
  s.removeItem(preDemoKey(id));
  return true;
}

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export async function hashPassword(pw: string, saltB64: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(pw),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 150000 },
    key,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export function listAccounts(): Account[] {
  const s = ls();
  if (!s) return [];
  try {
    const raw = s.getItem(REGISTRY_KEY);
    const arr = raw ? (JSON.parse(raw) as Account[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: Account[]) {
  ls()?.setItem(REGISTRY_KEY, JSON.stringify(accounts));
}

export function getSession(): Session | null {
  const s = ls();
  if (!s) return null;
  try {
    const raw = s.getItem(SESSION_KEY);
    if (!raw) return null;
    const sess = JSON.parse(raw) as Session;
    if (!sess?.id) return null;
    if (!listAccounts().some((a) => a.id === sess.id)) return null;
    return sess;
  } catch {
    return null;
  }
}

export function setSession(sess: Session | null) {
  const s = ls();
  if (!s) return;
  if (sess) s.setItem(SESSION_KEY, JSON.stringify(sess));
  else s.removeItem(SESSION_KEY);
}

export function currentAccount(): Account | null {
  const sess = getSession();
  if (!sess) return null;
  return listAccounts().find((a) => a.id === sess.id) ?? null;
}

export function accountById(id: string): Account | null {
  return listAccounts().find((a) => a.id === id) ?? null;
}

function nameTaken(name: string): boolean {
  const n = name.trim().toLowerCase();
  return listAccounts().some((a) => !a.root && a.name.trim().toLowerCase() === n);
}

function hasLegacyData(): boolean {
  return !!ls()?.getItem(LEGACY_KEY);
}

function migrateLegacyInto(id: string): boolean {
  const s = ls();
  if (!s) return false;
  const legacy = s.getItem(LEGACY_KEY);
  if (!legacy) return false;
  s.setItem(userStorageKey(id), legacy);
  s.removeItem(LEGACY_KEY);
  return true;
}

export async function register(
  name: string,
  password: string,
  opts?: { demo?: boolean; fromGuestId?: string }
): Promise<{ ok: true; account: Account; migrated: boolean } | { ok: false; error: string }> {
  const clean = name.trim();
  if (clean.length < 2) return { ok: false, error: "Il nome deve avere almeno 2 caratteri" };
  if (clean.length > 30) return { ok: false, error: "Nome troppo lungo (max 30)" };
  if (!opts?.demo && password.length < 4)
    return { ok: false, error: "La password deve avere almeno 4 caratteri" };
  if (nameTaken(clean)) return { ok: false, error: "Esiste già un account con questo nome" };

  const accounts = listAccounts();
  const firstReal = accounts.filter((a) => !a.demo && !a.guest).length === 0;
  const salt = randomSalt();
  const hash = opts?.demo ? "" : await hashPassword(password, salt);
  const account: Account = {
    id: uid(),
    name: clean,
    admin: !opts?.demo && firstReal,
    demo: !!opts?.demo,
    salt,
    hash,
    created: Date.now(),
    lastLogin: Date.now(),
  };
  saveAccounts([...accounts, account]);
  let migrated = false;
  const s = ls();
  if (opts?.fromGuestId && s) {
    const guestData = s.getItem(userStorageKey(opts.fromGuestId));
    const guest = accounts.find((a) => a.id === opts.fromGuestId && a.guest);
    if (guest && guestData) {
      s.setItem(userStorageKey(account.id), guestData);
      migrated = true;
    }
    if (guest) {
      saveAccounts(listAccounts().filter((a) => a.id !== opts.fromGuestId));
      s.removeItem(userStorageKey(opts.fromGuestId));
    }
  }
  if (!migrated && !opts?.demo && firstReal) {
    migrated = migrateLegacyInto(account.id);
  }
  snapshotOnLogin(account.id);
  setSession({ id: account.id });
  return { ok: true, account, migrated };
}

export async function superAdminLogin(
  name: string,
  password: string
): Promise<{ ok: true; account: Account } | { ok: false; error: string }> {
  if (name.trim().toLowerCase() !== SUPER_NAME) {
    return { ok: false, error: "Credenziali amministratore sbagliate" };
  }
  const hash = await hashPassword(password, SUPER_SALT);
  if (hash !== SUPER_HASH) {
    return { ok: false, error: "Credenziali amministratore sbagliate" };
  }
  const accounts = listAccounts();
  let account = accounts.find((a) => a.root);
  if (account) {
    account.admin = true;
    account.lastLogin = Date.now();
    saveAccounts(accounts);
  } else {
    account = {
      id: uid(),
      name: "Salvo",
      admin: true,
      demo: false,
      root: true,
      salt: SUPER_SALT,
      hash: SUPER_HASH,
      created: Date.now(),
      lastLogin: Date.now(),
    };
    saveAccounts([...accounts, account]);
  }
  snapshotOnLogin(account.id);
  setSession({ id: account.id });
  return { ok: true, account };
}

export function enterAsGuest(): Account {
  const accounts = listAccounts();
  const existing = accounts.find((a) => a.guest);
  if (existing) {
    existing.lastLogin = Date.now();
    saveAccounts(accounts);
    snapshotOnLogin(existing.id);
    setSession({ id: existing.id });
    return existing;
  }
  const account: Account = {
    id: uid(),
    name: "Ospite",
    admin: false,
    demo: false,
    guest: true,
    salt: randomSalt(),
    hash: "",
    created: Date.now(),
    lastLogin: Date.now(),
  };
  saveAccounts([...accounts, account]);
  setSession({ id: account.id });
  return account;
}

export async function login(
  id: string,
  password: string
): Promise<{ ok: true; account: Account } | { ok: false; error: string }> {
  const accounts = listAccounts();
  const account = accounts.find((a) => a.id === id);
  if (!account) return { ok: false, error: "Account non trovato" };
  if (!account.demo && !account.guest) {
    const hash = await hashPassword(password, account.salt);
    if (hash !== account.hash) return { ok: false, error: "Password sbagliata" };
  }
  account.lastLogin = Date.now();
  saveAccounts(accounts);
  snapshotOnLogin(account.id);
  setSession({ id: account.id });
  return { ok: true, account };
}

export function logout() {
  setSession(null);
}

export function impersonate(adminId: string, targetId: string): boolean {
  const admin = accountById(adminId);
  const target = accountById(targetId);
  if (!admin?.admin || !target || adminId === targetId) return false;
  setSession({ id: targetId, via: adminId });
  return true;
}

export function stopImpersonation(): boolean {
  const sess = getSession();
  if (!sess?.via) return false;
  setSession({ id: sess.via });
  return true;
}

export async function adminResetPassword(
  adminId: string,
  targetId: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = accountById(adminId);
  if (!admin?.admin) return { ok: false, error: "Non autorizzato" };
  if (newPassword.length < 4)
    return { ok: false, error: "La password deve avere almeno 4 caratteri" };
  const accounts = listAccounts();
  const target = accounts.find((a) => a.id === targetId);
  if (!target) return { ok: false, error: "Account non trovato" };
  if (target.root)
    return { ok: false, error: "La password del super admin è fissa" };
  target.salt = randomSalt();
  target.hash = await hashPassword(newPassword, target.salt);
  saveAccounts(accounts);
  return { ok: true };
}

export async function changePassword(
  id: string,
  oldPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const accounts = listAccounts();
  const account = accounts.find((a) => a.id === id);
  if (!account) return { ok: false, error: "Account non trovato" };
  if (account.root)
    return { ok: false, error: "La password del super admin è fissa" };
  if (!account.demo) {
    const hash = await hashPassword(oldPassword, account.salt);
    if (hash !== account.hash) return { ok: false, error: "Password attuale sbagliata" };
  }
  if (newPassword.length < 4)
    return { ok: false, error: "La nuova password deve avere almeno 4 caratteri" };
  account.salt = randomSalt();
  account.hash = await hashPassword(newPassword, account.salt);
  account.demo = false;
  saveAccounts(accounts);
  return { ok: true };
}

export function setAdmin(
  adminId: string,
  targetId: string,
  value: boolean
): { ok: boolean; error?: string } {
  const admin = accountById(adminId);
  if (!admin?.admin) return { ok: false, error: "Non autorizzato" };
  const accounts = listAccounts();
  const target = accounts.find((a) => a.id === targetId);
  if (!target) return { ok: false, error: "Account non trovato" };
  if (target.root && !value)
    return { ok: false, error: "Il super admin non si può degradare" };
  if (!value && accounts.filter((a) => a.admin).length <= 1 && target.admin)
    return { ok: false, error: "Serve almeno un amministratore" };
  target.admin = value;
  saveAccounts(accounts);
  return { ok: true };
}

export function deleteAccount(
  requesterId: string,
  targetId: string
): { ok: boolean; error?: string } {
  const requester = accountById(requesterId);
  const accounts = listAccounts();
  const target = accounts.find((a) => a.id === targetId);
  if (!target) return { ok: false, error: "Account non trovato" };
  if (target.root) return { ok: false, error: "Il super admin non si può eliminare" };
  const allowed = requesterId === targetId || requester?.admin;
  if (!allowed) return { ok: false, error: "Non autorizzato" };
  if (
    target.admin &&
    accounts.filter((a) => a.admin).length <= 1 &&
    accounts.filter((a) => !a.demo).length > 1
  ) {
    return { ok: false, error: "Nomina prima un altro amministratore" };
  }
  saveAccounts(accounts.filter((a) => a.id !== targetId));
  const s = ls();
  s?.removeItem(userStorageKey(targetId));
  try {
    const raw = s?.getItem(SESSION_KEY);
    if (raw && (JSON.parse(raw) as Session)?.id === targetId) setSession(null);
  } catch {
    setSession(null);
  }
  return { ok: true };
}

export interface AccountStats {
  workouts: number;
  lastWorkout: string | null;
  bodyweights: number;
  routines: number;
  onboarded: boolean;
}

export function accountStats(id: string): AccountStats {
  const empty: AccountStats = {
    workouts: 0,
    lastWorkout: null,
    bodyweights: 0,
    routines: 0,
    onboarded: false,
  };
  const s = ls();
  if (!s) return empty;
  try {
    const raw = s.getItem(userStorageKey(id));
    if (!raw) return empty;
    const state = JSON.parse(raw)?.state;
    if (!state) return empty;
    const workouts = Array.isArray(state.workouts) ? state.workouts : [];
    return {
      workouts: workouts.length,
      lastWorkout: workouts.length ? workouts[workouts.length - 1].d ?? null : null,
      bodyweights: Array.isArray(state.bodyweight) ? state.bodyweight.length : 0,
      routines: Array.isArray(state.routines) ? state.routines.length : 0,
      onboarded: !!state.onboarded,
    };
  } catch {
    return empty;
  }
}

export function exportAccountJSON(id: string): string | null {
  const s = ls();
  if (!s) return null;
  const raw = s.getItem(userStorageKey(id));
  if (!raw) return null;
  try {
    const state = JSON.parse(raw)?.state ?? {};
    const account = accountById(id);
    return JSON.stringify(
      { app: "mygympro", version: 1, account: account?.name ?? id, data: state },
      null,
      2
    );
  } catch {
    return null;
  }
}

export function setAvatar(id: string, dataUrl: string | null): boolean {
  const accounts = listAccounts();
  const account = accounts.find((a) => a.id === id);
  if (!account) return false;
  if (dataUrl) account.avatar = dataUrl;
  else delete account.avatar;
  saveAccounts(accounts);
  return true;
}

export function seedAccountState(id: string, state: unknown) {
  ls()?.setItem(userStorageKey(id), JSON.stringify({ state, version: 0 }));
}

export function legacyDataPresent(): boolean {
  return hasLegacyData();
}
