"use client";

import { useState, type FormEvent } from "react";
import { SearchIcon, ShieldIcon } from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { Card, PageHeader } from "@/components/ui/Page";
import { apiRequest, ApiError } from "@/lib/api";

type ScoreResult = {
  farmer_name?: string;
  county?: string | null;
  farm_size_acres?: number | null;
  crops?: string | null;
  health_score?: number;
  risk_tier?: string;
  active_connections?: number;
  total_scans?: number;
};

const SCORE_MIN = 300;
const SCORE_MAX = 850;

export default function LenderScoreLookupPage() {
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);
    const phone = String(new FormData(e.currentTarget).get("phone") || "").trim();
    try {
      setResult(await apiRequest<ScoreResult>(`/api/v1/lender/score/?phone=${encodeURIComponent(phone)}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  const pct =
    result?.health_score !== undefined
      ? Math.max(2, Math.min(100, ((result.health_score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100))
      : 0;

  return (
    <PortalShell role="lender" title="Score lookup">
      <PageHeader
        title="Score lookup"
        lead="Same rules as the machine API: a score is returned only when the farmer has opted in to sharing."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card title="Look up a farmer">
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="form-field">
              <span className="font-medium text-ink/80">Registered phone number</span>
              <input className="field" name="phone" placeholder="2547XXXXXXXX or 07XXXXXXXX" inputMode="tel" required />
            </label>
            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
            <button className="btn btn-primary w-full" type="submit" disabled={busy}>
              <SearchIcon size={15} /> {busy ? "Looking up…" : "Look up score"}
            </button>
          </form>
        </Card>

        {result ? (
          <Card title={result.farmer_name || "Farmer"}>
            <div className="score-meter mb-4">
              <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                  <ShieldIcon size={16} /> Farm Health Score
                </span>
                <span className="text-2xl font-semibold text-[var(--ink)]">{result.health_score ?? "—"}</span>
              </div>
              <div className="score-meter__track mt-2">
                <span className="score-meter__fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="score-meter__scale">
                <span>{SCORE_MIN}</span>
                <span>{result.risk_tier}</span>
                <span>{SCORE_MAX}</span>
              </div>
            </div>
            <dl className="spec-table !max-w-none">
              {[
                ["County", result.county || "—"],
                ["Farm size", result.farm_size_acres != null ? `${result.farm_size_acres} acres` : "Not set"],
                ["Crops", result.crops || "Not set"],
                ["Completed market links", String(result.active_connections ?? 0)],
                ["Leaf scans", String(result.total_scans ?? 0)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ) : (
          <div className="empty-state">
            <SearchIcon size={24} />
            <p className="empty-state__title">No lookup yet</p>
            <p>Enter a farmer’s registered phone number to see their score.</p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
