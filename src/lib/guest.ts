import { currentAccount } from "./auth";

export const GUEST_EX_LIMIT = 150;
export const GUEST_WO_LIMIT = 3;

export function isGuest(): boolean {
  return !!currentAccount()?.guest;
}
