/** Two-letter initials for avatar placeholders. */
export function initialsOf(name?: string | null): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Badge colour class for a payment, partner or HTTP status. */
export function statusTone(status: string | number): string {
  const s = String(status).toLowerCase();
  if (["success", "approved", "active", "completed", "live"].includes(s)) return "badge-ok";
  if (["pending", "queued", "processing"].includes(s)) return "badge-warn";
  if (["failed", "suspended", "rejected", "revoked", "hidden"].includes(s)) return "badge-danger";
  if (/^\d+$/.test(s)) {
    const code = Number(s);
    if (code < 300) return "badge-ok";
    if (code < 500) return "badge-warn";
    return "badge-danger";
  }
  return "";
}

const KSH = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 });

/** "KSh 3,500" — or null when there is no price. */
export function formatKsh(value?: string | number | null): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? `KSh ${KSH.format(n)}` : null;
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

/** "6 Oct 2026, 08:36" — the same style as formatDate, with the time. */
export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date}, ${time}`;
}

/** "3 days ago" style label. */
export function timeAgo(value?: string | null): string {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.round((Date.now() - then) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
  ];
  let amount = -seconds;
  for (const [size, unit] of steps) {
    if (Math.abs(amount) < size) return rtf.format(Math.round(amount), unit);
    amount /= size;
  }
  return rtf.format(Math.round(amount), "year");
}

/** Kenyan phone number in international form for tel: and WhatsApp links. */
export function intlPhone(phone?: string | null): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}
