/** Download rows as a CSV file that opens in Excel / Google Sheets. */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null)[][]) {
  const escape = (v: string | number | null) => {
    let s = v === null || v === undefined ? "" : String(v);
    // Typed text that starts like a formula (=, +, -, @) opens as plain text, not as a formula.
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");
  // BOM so Excel reads UTF-8 (e.g. "sukuma wiki" accents) correctly.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
