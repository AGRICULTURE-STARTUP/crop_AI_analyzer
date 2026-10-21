import type { ScanWeather } from "@/lib/types";

const num = (v: number | string | undefined | null) => {
  const n = Number(v);
  return v == null || v === "" || Number.isNaN(n) ? null : n;
};

/**
 * One practical line for today's weather. Rules of thumb only: wet, humid weather favours fungal
 * leaf diseases, rain washes off sprays and fertiliser, and hot days stress crops watered at noon.
 */
export function weatherTip(w: ScanWeather | null | undefined): string | null {
  if (!w) return null;
  const rain = num(w.rainfall_1h_mm);
  const humidity = num(w.humidity_percent);
  const temp = num(w.temperature_celsius);
  if (rain !== null && rain >= 0.5) return "It is raining. Hold off spraying and top dressing until it clears.";
  if (humidity !== null && humidity >= 75) {
    return "Humid weather helps fungal diseases like blight and rust spread. Check your leaves early.";
  }
  if (temp !== null && temp >= 30) return "A hot day. Water early in the morning or in the evening.";
  return "Conditions look fine for field work today.";
}
