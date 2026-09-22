export function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function displayName(
  settingsName: string | undefined,
  accountName: string | undefined,
  guest?: boolean
): string {
  const chosen = (settingsName ?? "").trim();
  if (chosen) return chosen;
  const acc = (accountName ?? "").trim();
  if (!acc || guest || acc === "Ospite" || looksLikeEmail(acc)) return "";
  return acc;
}
