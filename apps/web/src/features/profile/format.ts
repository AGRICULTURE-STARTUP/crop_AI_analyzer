/** "Maize, Beans; Potato" → ["Maize", "Beans", "Potato"] */
export function cropTags(products?: string | null): string[] {
  if (!products?.trim()) return [];
  return products
    .split(/[,;/|]+/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1));
}

export function initials(first?: string, last?: string, username?: string) {
  const a = (first || "").trim().charAt(0);
  const b = (last || "").trim().charAt(0);
  if (a || b) return `${a}${b}`.toUpperCase();
  return (username || "?").slice(0, 2).toUpperCase();
}

/** "3.5" for 3.5 acres, null when no size is set. */
export function acresText(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return `${Math.round(n * 10) / 10}`;
}
