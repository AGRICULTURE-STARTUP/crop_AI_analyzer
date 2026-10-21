"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { SCORE_MAX, SCORE_MIN, scorePercent } from "@/features/farmer/score";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import type { FarmerProfile, MeResponse } from "@/lib/types";

const tierTone = (tier?: string | null) => {
  const t = (tier || "").toLowerCase();
  if (t.includes("low")) return "badge-ok";
  if (t.includes("high")) return "badge-danger";
  if (t.includes("medium")) return "badge-warn";
  return "";
};

/** Farm Health Score on its meter, and the switch that lets approved lenders see it. */
export function HealthCard({ profile }: { profile: FarmerProfile }) {
  const { refreshMe } = useAuth();
  const toast = useToast();
  const saved = Boolean(profile.opt_in_for_lending);
  const [optIn, setOptIn] = useState(saved);
  const [busy, setBusy] = useState(false);
  const score = profile.health_score ?? null;

  // Follow the server if the profile reloads.
  useEffect(() => setOptIn(saved), [saved]);

  async function toggle() {
    const next = !optIn;
    setOptIn(next); // switch right away, undo if the server says no
    setBusy(true);
    try {
      await apiRequest<MeResponse>("/api/v1/me/", { method: "PATCH", body: { opt_in_for_lending: next } });
      await refreshMe();
      toast.success(next ? "Approved lenders can now see your score" : "Your score is private again");
    } catch (err) {
      setOptIn(!next);
      toast.error(err instanceof ApiError ? err.message : "The change could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Farm Health Score">
      <div className="health">
        <div className="health__score">
          <strong>{score ?? "—"}</strong>
          {profile.risk_tier ? <span className={`badge badge--plain ${tierTone(profile.risk_tier)}`}>{profile.risk_tier}</span> : null}
        </div>
        <div className="health__meter">
          <div
            className="score-meter__track"
            role="img"
            aria-label={score === null ? "No score yet" : `Score ${score} out of ${SCORE_MAX}`}
          >
            {score !== null ? <span className="score-meter__fill" style={{ width: `${scorePercent(score)}%` }} /> : null}
          </div>
          <div className="score-meter__scale">
            <span>{SCORE_MIN}</span>
            <span>{SCORE_MAX}</span>
          </div>
        </div>
      </div>
      <p className="health__lead">
        Regular scans, healthy results and a complete profile raise your score.
        {profile.last_calculated ? ` Last calculated ${formatDateTime(profile.last_calculated)}.` : ""}
      </p>

      <div className="switch-row">
        <div>
          <p className="switch-row__title">Share my score with approved lenders</p>
          <p className="switch-row__hint">
            They can look it up with your registered phone number. Turn this off any time.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={optIn}
          aria-label="Share my Farm Health Score with approved lenders"
          className={`switch ${optIn ? "is-on" : ""}`}
          disabled={busy}
          onClick={toggle}
        />
      </div>
    </Card>
  );
}
