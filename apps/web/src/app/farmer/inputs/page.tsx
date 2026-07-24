"use client";

import { FormEvent, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { ApiError, getApiBase, getStoredTokens } from "@/lib/api";

type Firm = {
  id?: string;
  name?: string;
  location?: string;
  phone?: string;
  products?: string;
  [key: string]: unknown;
};

export default function FarmerInputsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Firm[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // Prefer dedicated API when available; fall back to legacy JSON route with JWT unavailable —
      // use fetch to legacy path via API host for parity during transition.
      const tokens = getStoredTokens();
      const url = `${getApiBase()}/fertiliser_firms/?query=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: tokens?.access
          ? { Authorization: `Bearer ${tokens.access}` }
          : {},
        credentials: "include",
      });
      if (!res.ok) {
        // Soft fallback message when session auth is required on legacy route
        throw new ApiError(res.status, null, "Could not search inputs. Ensure you are logged in.");
      }
      const data = await res.json();
      setResults(data.products || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed");
      setResults([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell role="farmer" title="Inputs">
      <div className="space-y-6">
        <form onSubmit={onSubmit} className="panel space-y-4 rounded-3xl p-6">
          <h1 className="brand-mark text-3xl text-leaf-deep">Find agrovets</h1>
          <p className="text-sm text-ink/60">
            Search by county or product. Results mix onboarded suppliers and
            live discovery.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. fertiliser Nakuru"
              required
            />
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? "Searching…" : "Search"}
            </button>
          </div>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        </form>
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((r, i) => (
            <article key={String(r.id || i)} className="panel rounded-2xl p-4">
              <h2 className="font-semibold text-leaf-deep">
                {String(r.name || r.agency_name || "Supplier")}
              </h2>
              <p className="mt-1 text-sm text-ink/65">
                {String(r.location || r.county || "")}
              </p>
              <p className="mt-2 text-sm">{String(r.products || r.phone || "")}</p>
            </article>
          ))}
        </div>
      </div>
    </PortalShell>
  );
}
