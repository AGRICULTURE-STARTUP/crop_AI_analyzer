"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { apiRequest, ApiError } from "@/lib/api";
import type { CropCatalogItem, ScanJob } from "@/lib/types";

export default function FarmerScanPage() {
  const [crop, setCrop] = useState("maize");
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<ScanJob | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const cropsQuery = useQuery({
    queryKey: ["crops"],
    queryFn: () =>
      apiRequest<{ crops: CropCatalogItem[] }>("/api/v1/crops/"),
  });

  const supported =
    cropsQuery.data?.crops.filter((c) => c.supported).map((c) => c.crop) ||
    ["maize", "tomato", "potato", "beans"];

  useEffect(() => {
    if (!job || !["queued", "processing"].includes(job.status)) return;
    const t = setInterval(async () => {
      try {
        const latest = await apiRequest<ScanJob>(`/api/v1/scans/${job.id}/`);
        setJob(latest);
      } catch {
        /* keep polling */
      }
    }, 1500);
    return () => clearInterval(t);
  }, [job]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a leaf image first.");
      return;
    }
    setBusy(true);
    setError("");
    setJob(null);
    try {
      const fd = new FormData();
      fd.append("crop", crop);
      fd.append("image", file);
      const created = await apiRequest<{ job_id: string; status: string }>(
        "/api/v1/scans/",
        { method: "POST", formData: fd }
      );
      const detail = await apiRequest<ScanJob>(
        `/api/v1/scans/${created.job_id}/`
      );
      setJob(detail);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Scan request failed"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell role="farmer" title="Crop scanner">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={onSubmit} className="panel space-y-5 rounded-3xl p-6">
          <div>
            <h1 className="brand-mark text-3xl text-leaf-deep">Scan a leaf</h1>
            <p className="mt-1 text-sm text-ink/60">
              Upload a clear photo. We queue inference on the scanner worker and
              poll until the result is ready.
            </p>
          </div>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Crop</span>
            <select
              className="field"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
            >
              {supported.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Leaf image</span>
            <input
              className="field"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Uploading…" : "Run scan"}
          </button>
        </form>

        <div className="panel rounded-3xl p-6">
          <h2 className="text-lg font-semibold text-leaf-deep">Result</h2>
          {!job ? (
            <p className="mt-3 text-sm text-ink/55">
              No scan yet. Results appear here with confidence and wallet balance.
            </p>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <p>
                Status:{" "}
                <strong className="capitalize text-leaf">{job.status}</strong>
              </p>
              {job.result_label ? (
                <p className="text-xl font-semibold">{job.result_label}</p>
              ) : null}
              {job.confidence != null ? (
                <p>Confidence: {(job.confidence * 100).toFixed(1)}%</p>
              ) : null}
              {job.error_message ? (
                <p className="text-[var(--danger)]">{job.error_message}</p>
              ) : null}
              {job.wallet_balance != null ? (
                <p>Wallet: KSh {job.wallet_balance}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
