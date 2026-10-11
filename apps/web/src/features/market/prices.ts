import type { KamisPriceRow } from "./types";

/** "80.00/Kg" → { value: 80, unit: "Kg" } */
export function parsePrice(raw: string) {
  const match = /^\s*([\d,.]+)\s*\/?\s*(.*)$/.exec(raw || "");
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? { value, unit: match[2] || "" } : null;
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/**
 * Best wholesale price (highest for sellers, lowest for buyers), comparing only
 * the main commodity in its most common unit so tree tomato never beats tomato.
 */
export function bestMarket(rows: KamisPriceRow[], audience: "seller" | "buyer") {
  const priced = rows
    .map((row) => ({ row, price: parsePrice(row.wholesale) }))
    .filter((r): r is { row: KamisPriceRow; price: { value: number; unit: string } } => r.price !== null);
  if (!priced.length) return null;
  const commodity = mostCommon(priced.map((r) => r.row.commodity));
  const sameCommodity = priced.filter((r) => r.row.commodity === commodity);
  const unit = mostCommon(sameCommodity.map((r) => r.price.unit)) ?? "";
  const same = sameCommodity.filter((r) => r.price.unit === unit);
  same.sort((a, b) => (audience === "seller" ? b.price.value - a.price.value : a.price.value - b.price.value));
  return same[0] ? { ...same[0], unit, commodity, compared: same.length } : null;
}
