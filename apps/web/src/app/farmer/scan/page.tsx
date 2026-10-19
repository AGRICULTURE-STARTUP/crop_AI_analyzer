"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  BasketIcon,
  ScanIcon,
  SproutIcon,
  StoreIcon,
} from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { PageHeader } from "@/components/ui/Page";
import { apiRequest, ApiError } from "@/lib/api";
import { statusTone } from "@/lib/format";
import type { CropCatalogItem, ScanJob, ScanReport } from "@/lib/types";

function progressLabel(job: ScanJob | null, uploading: boolean): string {
  if (uploading) return "Uploading leaf image…";
  if (!job) return "";
  if (job.status === "queued") return "Queued — waiting for the crop model…";
  if (job.status === "processing") {
    if (!job.result_label) return "Analyzing leaf with the selected crop model…";
    if (!job.report) {
      return "Diagnosis found — fetching weather, knowledge base, and writing advice…";
    }
    return "Finalizing report…";
  }
  if (job.status === "completed") return "Scan complete";
  if (job.status === "rejected") return "Image rejected";
  if (job.status === "failed") return "Scan failed";
  return job.status;
}

function isInFlight(job: ScanJob | null, uploading: boolean): boolean {
  if (uploading) return true;
  if (!job) return false;
  return job.status === "queued" || job.status === "processing";
}

function ReportCards({ report }: { report: ScanReport }) {
  const medicine = Array.isArray(report.medicine) ? report.medicine : [];
  const prevention = Array.isArray(report.prevention) ? report.prevention : [];
  const weather = report.weather;

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 sm:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-leaf">
          Diagnosis
        </p>
        <p className="mt-1 text-xl font-semibold text-leaf-deep">
          {report.disease}
        </p>
        <p className="mt-1 text-sm text-ink/65">
          {report.crop} · {report.health_status} · {report.confidence_pct}% confidence
          {report.location ? ` · ${report.location}` : ""}
        </p>
      </div>

      {(report.location || weather) && (
        <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-leaf">
            Your area & weather
          </p>
          {report.location ? (
            <p className="mt-1 text-sm font-medium text-leaf-deep">{report.location}</p>
          ) : null}
          {weather ? (
            <p className="mt-1 text-sm text-ink/70">
              {weather.temperature_celsius != null
                ? `${weather.temperature_celsius}°C`
                : "—"}
              {" · "}
              Humidity {weather.humidity_percent ?? "—"}%
              {" · "}
              Wind {weather.wind_speed_m_s ?? "—"} m/s
              {" · "}
              Rain (1h) {weather.rainfall_1h_mm ?? 0} mm
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink/65">
              Weather could not be loaded for this location.
            </p>
          )}
          {report.weather_note ? (
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              {report.weather_note}
            </p>
          ) : null}
        </div>
      )}

      <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">
          Cause
        </p>
        <p className="mt-1 text-sm leading-relaxed">{report.cause}</p>
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">
          Symptoms
        </p>
        <p className="mt-1 text-sm leading-relaxed">{report.symptoms}</p>
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 sm:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">
          Remedy
        </p>
        <p className="mt-1 text-sm leading-relaxed">{report.remedy}</p>
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">
          Medicine to ask for
        </p>
        {medicine.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {medicine.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-ink/65">None needed right now.</p>
        )}
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">
          Prevention
        </p>
        {prevention.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {prevention.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-ink/65">—</p>
        )}
      </div>
      {report.local_tip ? (
        <div className="rounded-2xl border border-[var(--line)] bg-mist/60 p-4 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-leaf">
            Local tip
          </p>
          <p className="mt-1 text-sm leading-relaxed">{report.local_tip}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function FarmerScanPage() {
  const [crop, setCrop] = useState("maize");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [job, setJob] = useState<ScanJob | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const cropsQuery = useQuery({
    queryKey: ["crops"],
    queryFn: () =>
      apiRequest<{ crops: CropCatalogItem[] }>("/api/v1/crops/"),
  });

  const supported =
    cropsQuery.data?.crops.filter((c) => c.supported).map((c) => c.crop) ||
    ["maize", "tomato", "potato", "beans"];

  const inFlight = isInFlight(job, uploading);
  const stage = progressLabel(job, uploading);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!job || !["queued", "processing"].includes(job.status)) return;
    const t = setInterval(async () => {
      try {
        const latest = await apiRequest<ScanJob>(`/api/v1/scans/${job.id}/`);
        setJob(latest);
      } catch {
        /* keep polling */
      }
    }, 1200);
    return () => clearInterval(t);
  }, [job]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a leaf image first.");
      return;
    }
    setUploading(true);
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
      setUploading(false);
    }
  }

  return (
    <PortalShell role="farmer" title="Scan crops">
      <PageHeader
        title="Scan a leaf"
        lead="Choose the crop, upload a clear leaf photo and run the scan. Advice uses your county weather and our farm knowledge base."
      />

      <ul className="shortcuts">
        {SHORTCUTS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="shortcut">
              <span className="shortcut__icon">
                <s.Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="shortcut__title">{s.title}</span>
                <span className="shortcut__text">{s.text}</span>
              </span>
              <ArrowRightIcon size={16} className="shortcut__arrow" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <form onSubmit={onSubmit} className="ui-card space-y-5">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-ink/80">Crop</span>
            <select
              className="field capitalize"
              value={crop}
              disabled={inFlight}
              onChange={(e) => setCrop(e.target.value)}
            >
              {supported.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className={`dropzone ${preview ? "has-file" : ""}`}>
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              disabled={inFlight}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Selected leaf preview" className="dropzone__preview" />
            ) : (
              <>
                <span className="dropzone__icon">
                  <ScanIcon size={28} />
                </span>
                <span className="dropzone__title">Take or upload a leaf photo</span>
                <span className="dropzone__hint">One leaf, in daylight, filling most of the frame</span>
              </>
            )}
            {preview ? <span className="dropzone__change">Change photo</span> : null}
          </label>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <button className="btn btn-primary btn-pill w-full !py-3" disabled={inFlight} type="submit">
            {inFlight ? "Scanning…" : "Run scan"}
          </button>
        </form>

        <section className="ui-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ui-card__title">Results</h2>
              <p className="mt-1 text-sm text-ink/65">
                Diagnosis and advice appear here after the scan finishes.
              </p>
            </div>
            {job ? (
              <span className={`badge ${statusTone(job.status)}`}>{job.status}</span>
            ) : null}
          </div>

          {inFlight ? (
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-mist/50 p-4">
              <div className="flex items-center gap-3">
                <span
                  className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-leaf/30 border-t-leaf"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-medium text-leaf-deep">{stage}</p>
                  <p className="text-xs text-ink/65">
                    Please keep this page open — we poll until the report is ready.
                  </p>
                </div>
              </div>
              {job?.result_label ? (
                <p className="mt-3 text-sm text-ink/70">
                  Model label: <strong>{job.result_label}</strong>
                  {job.confidence != null
                    ? ` (${(job.confidence * 100).toFixed(1)}%)`
                    : ""}
                </p>
              ) : null}
            </div>
          ) : null}

          {!job && !uploading ? (
            <p className="mt-4 text-sm text-ink/65">
              No scan yet. Upload a leaf above and click Run scan.
            </p>
          ) : null}

          {job && !inFlight ? (
            <div className="mt-4 space-y-4">
              {job.error_message ? (
                <p className="text-sm text-[var(--danger)]">{job.error_message}</p>
              ) : null}

              {job.report ? (
                <ReportCards report={job.report} />
              ) : job.result_label ? (
                <div className="space-y-2 text-sm">
                  <p className="text-xl font-semibold">{job.result_label}</p>
                  {job.confidence != null ? (
                    <p>Confidence: {(job.confidence * 100).toFixed(1)}%</p>
                  ) : null}
                </div>
              ) : null}

              {job.wallet_balance != null ? (
                <p className="text-sm text-ink/70">
                  Wallet: KSh {job.wallet_balance}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </PortalShell>
  );
}

const SHORTCUTS = [
  {
    href: "/farmer/advisor",
    title: "Crop advisor",
    text: "Find the crop that suits your soil",
    Icon: SproutIcon,
  },
  {
    href: "/farmer/marketplace",
    title: "Marketplace",
    text: "Seed, fertiliser and sprays near you",
    Icon: StoreIcon,
  },
  {
    href: "/farmer/market",
    title: "Market prices",
    text: "See where your harvest sells best",
    Icon: BasketIcon,
  },
];
