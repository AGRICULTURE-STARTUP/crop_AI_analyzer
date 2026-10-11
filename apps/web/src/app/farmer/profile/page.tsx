"use client";

import {
  FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { FormField } from "@/components/FormField";
import { PortalShell } from "@/components/PortalShell";
import { fetchFarmerOverview } from "@/features/farmer/api";
import { apiRequest, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatKsh } from "@/lib/format";
import type {
  FarmerProfile,
  MeResponse,
  ScanWeather,
  Wallet,
  WeatherResponse,
} from "@/lib/types";

function initials(first?: string, last?: string, username?: string) {
  const a = (first || "").trim().charAt(0);
  const b = (last || "").trim().charAt(0);
  if (a || b) return `${a}${b}`.toUpperCase();
  return (username || "?").slice(0, 2).toUpperCase();
}

function cropTags(products?: string | null) {
  if (!products?.trim()) return [];
  return products
    .split(/[,;/|]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function formatMetric(value: number | string | undefined | null, digits = 0) {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toFixed(digits);
}

export default function FarmerProfilePage() {
  const { user, refreshMe } = useAuth();
  const profile = (user?.profile || {}) as FarmerProfile;
  const fileInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [amount, setAmount] = useState("100");
  const [topupMsg, setTopupMsg] = useState("");
  const [topupError, setTopupError] = useState("");
  const [topupBusy, setTopupBusy] = useState(false);

  const displayName =
    [user?.user.first_name, user?.user.last_name].filter(Boolean).join(" ") ||
    user?.user.username ||
    "Farmer";

  const photoUrl = photoPreview || profile.profile_photo || null;
  const crops = cropTags(profile.products);
  const locationLabel = [profile.county, profile.country || "Kenya"]
    .filter(Boolean)
    .join(", ");

  const walletQuery = useQuery({
    queryKey: ["wallet"],
    queryFn: () => apiRequest<Wallet>("/api/v1/wallet/"),
  });

  const overview = useQuery({ queryKey: ["farmer-overview"], queryFn: fetchFarmerOverview });

  const weatherQuery = useQuery({
    queryKey: ["weather", profile.county],
    queryFn: () => apiRequest<WeatherResponse>("/api/v1/weather/"),
    enabled: Boolean(profile.county),
    staleTime: 10 * 60 * 1000,
  });

  const weather: ScanWeather | null = weatherQuery.data?.weather ?? null;

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveMsg("");
    const fd = new FormData(e.currentTarget);
    const acres = String(fd.get("farm_size_acres") || "").trim();
    try {
      await apiRequest<MeResponse>("/api/v1/me/", {
        method: "PATCH",
        body: {
          first_name: fd.get("first_name"),
          last_name: fd.get("last_name"),
          phone_number: fd.get("phone_number"),
          county: fd.get("county"),
          country: fd.get("country"),
          farm_name: fd.get("farm_name"),
          farm_size_acres: acres === "" ? null : acres,
          products: fd.get("products"),
        },
      });
      await refreshMe();
      setSaveMsg("Profile updated.");
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File) {
    setPhotoBusy(true);
    setSaveError("");
    setSaveMsg("");
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    const fd = new FormData();
    fd.append("profile_photo", file);
    try {
      await apiRequest<MeResponse>("/api/v1/me/", {
        method: "PATCH",
        formData: fd,
      });
      await refreshMe();
      setSaveMsg("Photo updated.");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Photo upload failed");
      setPhotoPreview(null);
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setSaveError("");
    try {
      await apiRequest<MeResponse>("/api/v1/me/", {
        method: "PATCH",
        body: { clear_profile_photo: true },
      });
      setPhotoPreview(null);
      await refreshMe();
      setSaveMsg("Photo removed.");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not remove photo");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function topup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTopupBusy(true);
    setTopupError("");
    setTopupMsg("");
    const fd = new FormData(e.currentTarget);
    try {
      await apiRequest("/api/v1/mpesa/topup/", {
        method: "POST",
        body: {
          phone_number: fd.get("phone_number"),
          amount: fd.get("amount"),
        },
      });
      setTopupMsg("Check your phone and enter your M-Pesa PIN to finish.");
      walletQuery.refetch();
      refreshMe();
    } catch (err) {
      setTopupError(err instanceof ApiError ? err.message : "Top-up failed");
    } finally {
      setTopupBusy(false);
    }
  }

  return (
    <PortalShell role="farmer" title="Your profile">
      <div className="space-y-4">
        {/* Hero */}
        <section className="panel profile-hero animate-rise overflow-hidden rounded-2xl">
          <div className="profile-hero__glow" aria-hidden />
          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
            <div className="relative shrink-0 self-center sm:self-auto">
              <div className="profile-avatar">
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="profile-avatar__img" />
                ) : (
                  <span className="profile-avatar__initials">
                    {initials(
                      user?.user.first_name,
                      user?.user.last_name,
                      user?.user.username
                    )}
                  </span>
                )}
              </div>
              <input
                ref={fileRef}
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadPhoto(file);
                }}
              />
              <label
                htmlFor={fileInputId}
                className="profile-avatar__edit"
                title="Upload photo"
              >
                {photoBusy ? "…" : "✎"}
              </label>
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-leaf">
                Farmer profile
              </p>
              <h1 className="page-header__title mt-1">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-ink/70">
                @{user?.user.username}
                {profile.farm_name ? ` · ${profile.farm_name}` : ""}
              </p>
              <p className="mt-2 text-sm text-ink/70">
                {locationLabel || "Add your county to unlock local weather"}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {profile.farm_size_acres != null && profile.farm_size_acres !== "" ? (
                  <span className="profile-chip">
                    {formatMetric(profile.farm_size_acres, 1)} acres
                  </span>
                ) : null}
                {crops.length ? (
                  <span className="profile-chip">
                    {crops.length} crop{crops.length === 1 ? "" : "s"}
                  </span>
                ) : null}
                <span className="profile-chip profile-chip--soft">Verified farmer</span>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setEditing((v) => !v);
                    setSaveMsg("");
                    setSaveError("");
                  }}
                >
                  {editing ? "Cancel edit" : "Edit farm details"}
                </button>
                {photoUrl ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={photoBusy}
                    onClick={removePhoto}
                  >
                    Remove photo
                  </button>
                ) : (
                  <label
                    htmlFor={fileInputId}
                    className="btn btn-secondary cursor-pointer"
                  >
                    Add photo
                  </label>
                )}
              </div>
              {saveMsg ? (
                <p className="mt-3 text-sm text-[var(--ok)]">{saveMsg}</p>
              ) : null}
              {saveError ? (
                <p className="mt-3 text-sm text-[var(--danger)]">{saveError}</p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-5">
          {/* Weather + farm summary */}
          <div className="flex flex-col gap-4 lg:col-span-3">
            <section className="panel animate-rise overflow-hidden rounded-2xl [animation-delay:80ms]">
              <div className="weather-panel">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Local weather</h2>
                    <p className="mt-0.5 text-sm text-white/75">
                      {profile.county
                        ? `${profile.county}${profile.country ? `, ${profile.country}` : ""}`
                        : "County not set"}
                    </p>
                  </div>
                  {!profile.county ? null : weatherQuery.isFetching ? (
                    <span className="text-xs text-white/70">Updating…</span>
                  ) : null}
                </div>

                {!profile.county ? (
                  <p className="mt-6 text-sm text-white/85">
                    Add your county below to see temperature, humidity, wind, and rainfall
                    for your farm.
                  </p>
                ) : weatherQuery.isLoading ? (
                  <p className="mt-6 text-sm text-white/85">Loading weather…</p>
                ) : weather ? (
                  <>
                    <div className="mt-5 flex items-end gap-3">
                      <p className="weather-temp">
                        {formatMetric(weather.temperature_celsius, 0)}
                        <sup>°C</sup>
                      </p>
                      <p className="mb-2 text-sm text-white/80">
                        Right now in {weather.location || profile.county}
                      </p>
                    </div>
                    <div className="weather-stats">
                      <div className="w-stat">
                        <strong>{formatMetric(weather.humidity_percent, 0)}%</strong>
                        <span>Humidity</span>
                      </div>
                      <div className="w-stat">
                        <strong>
                          {formatMetric(weather.wind_speed_m_s, 1)} m/s
                        </strong>
                        <span>Wind</span>
                      </div>
                      <div className="w-stat">
                        <strong>
                          {formatMetric(weather.rainfall_1h_mm ?? 0, 1)} mm
                        </strong>
                        <span>Rain (1h)</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-6 text-sm text-white/85">
                    {weatherQuery.data?.detail ||
                      "Weather could not be loaded for this location."}
                  </p>
                )}
              </div>
            </section>

            <section className="ui-card animate-rise [animation-delay:100ms]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="ui-card__title">
                    Farm Health Score
                  </h2>
                  <p className="text-sm text-ink/65">
                    Used by approved lending partners only when you opt in.
                  </p>
                </div>
                <div className="rounded-2xl bg-leaf/10 px-4 py-3 text-center">
                  <p className="text-xl font-semibold text-leaf-deep">
                    {profile.health_score ?? "—"}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-ink/65">
                    {profile.risk_tier || "Not scored"}
                  </p>
                </div>
              </div>
              <label className="mt-4 flex items-start gap-3 text-sm text-ink/75">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(profile.opt_in_for_lending)}
                  onChange={async (e) => {
                    setSaveError("");
                    setSaveMsg("");
                    try {
                      await apiRequest<MeResponse>("/api/v1/me/", {
                        method: "PATCH",
                        body: { opt_in_for_lending: e.target.checked },
                      });
                      await refreshMe();
                      setSaveMsg(
                        e.target.checked
                          ? "Lending data sharing enabled."
                          : "Lending data sharing turned off."
                      );
                    } catch (err) {
                      setSaveError(
                        err instanceof ApiError
                          ? err.message
                          : "Could not update consent"
                      );
                    }
                  }}
                />
                <span>
                  Share my Farm Health Score with approved lending partners when
                  they look up my registered phone number.
                </span>
              </label>
              {profile.last_calculated ? (
                <p className="mt-3 text-xs text-ink/65">
                  Last calculated{" "}
                  {new Date(profile.last_calculated).toLocaleString()}
                </p>
              ) : null}
            </section>

            <section className="ui-card animate-rise [animation-delay:120ms]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="ui-card__title">Farm details</h2>
                  <p className="text-sm text-ink/65">
                    Keep size, crops, and location up to date for better advice.
                  </p>
                </div>
              </div>

              {editing ? (
                <form onSubmit={saveProfile} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <FormField
                    label="First name"
                    name="first_name"
                    defaultValue={user?.user.first_name || ""}
                    required
                  />
                  <FormField
                    label="Last name"
                    name="last_name"
                    defaultValue={user?.user.last_name || ""}
                  />
                  <FormField
                    label="Farm name"
                    name="farm_name"
                    placeholder="e.g. Green Valley Farm"
                    defaultValue={profile.farm_name || ""}
                  />
                  <FormField
                    label="Farm size (acres)"
                    name="farm_size_acres"
                    type="number"
                    placeholder="e.g. 2.5"
                    defaultValue={
                      profile.farm_size_acres != null
                        ? String(profile.farm_size_acres)
                        : ""
                    }
                  />
                  <FormField
                    label="Phone"
                    name="phone_number"
                    defaultValue={profile.phone_number || ""}
                  />
                  <FormField
                    label="County"
                    name="county"
                    placeholder="e.g. Nakuru"
                    defaultValue={profile.county || ""}
                    required
                  />
                  <FormField
                    label="Country"
                    name="country"
                    defaultValue={profile.country || "Kenya"}
                  />
                  <div className="sm:col-span-2">
                    <FormField
                      label="Crops grown"
                      name="products"
                      as="textarea"
                      placeholder="Maize, Beans, Potato…"
                      defaultValue={profile.products || ""}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button className="btn btn-primary" disabled={saving} type="submit">
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  <div className="profile-stat">
                    <dt>Farm name</dt>
                    <dd>{profile.farm_name || "—"}</dd>
                  </div>
                  <div className="profile-stat">
                    <dt>Farm size</dt>
                    <dd>
                      {profile.farm_size_acres != null && profile.farm_size_acres !== ""
                        ? `${formatMetric(profile.farm_size_acres, 1)} acres`
                        : "—"}
                    </dd>
                  </div>
                  <div className="profile-stat">
                    <dt>Phone</dt>
                    <dd>{profile.phone_number || "—"}</dd>
                  </div>
                  <div className="profile-stat">
                    <dt>Location</dt>
                    <dd>{locationLabel || "—"}</dd>
                  </div>
                  <div className="profile-stat sm:col-span-2">
                    <dt>Crops</dt>
                    <dd>
                      {crops.length ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {crops.map((crop) => (
                            <span key={crop} className="profile-chip">
                              {crop}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>
              )}
            </section>
          </div>

          {/* Wallet */}
          <section className="ui-card animate-rise lg:col-span-2 lg:sticky lg:top-20 [animation-delay:160ms]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="ui-card__title">Wallet</h2>
              <span className="badge badge--plain">M-Pesa</span>
            </div>
            <div className="wallet-balance">
              <p className="wallet-balance__label">Available balance</p>
              <p className="wallet-balance__value">
                {formatKsh(walletQuery.data?.balance ?? user?.wallet?.balance ?? "0") ?? "KSh 0"}
              </p>
              <p className="wallet-balance__meta">
                {walletQuery.data?.scan_count ?? user?.wallet?.scan_count ?? 0} scans ·{" "}
                {walletQuery.data?.chat_count ?? user?.wallet?.chat_count ?? 0} AgriBot chats
              </p>
            </div>
            {overview.data ? (
              <p className="mt-3 rounded-lg bg-mist px-3 py-2 text-xs text-leaf-deep">
                {overview.data.wallet.free_scans_left > 0
                  ? `${overview.data.wallet.free_scans_left} free scan${overview.data.wallet.free_scans_left === 1 ? "" : "s"} left, then ${formatKsh(overview.data.wallet.scan_fee)} per scan.`
                  : `Each scan costs ${formatKsh(overview.data.wallet.scan_fee)} from your wallet.`}
              </p>
            ) : null}

            <form onSubmit={topup} className="mt-4 space-y-3">
              <FormField
                label="M-Pesa phone"
                name="phone_number"
                placeholder="2547XXXXXXXX"
                required
                defaultValue={profile.phone_number || ""}
              />
              <div className="space-y-1.5 text-sm">
                <span className="font-medium text-ink/80">Amount (KSh)</span>
                <div className="amount-chips" role="group" aria-label="Quick amounts">
                  {["50", "100", "200", "500"].map((a) => (
                    <button
                      key={a}
                      type="button"
                      className={amount === a ? "is-active" : ""}
                      aria-pressed={amount === a}
                      onClick={() => setAmount(a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <label className="sr-only" htmlFor="topup-amount">
                  Amount in KSh
                </label>
                <input
                  id="topup-amount"
                  className="field"
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              {topupMsg ? (
                <div className="notice notice--warn">
                  <p>
                    {topupMsg} Your balance updates once M-Pesa confirms.{" "}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={() => {
                        walletQuery.refetch();
                        refreshMe();
                      }}
                    >
                      Refresh balance
                    </button>
                  </p>
                </div>
              ) : null}
              {topupError ? (
                <p className="text-sm text-[var(--danger)]">{topupError}</p>
              ) : null}
              <button className="btn btn-primary w-full" disabled={topupBusy} type="submit">
                {topupBusy ? "Sending request…" : `Top up ${formatKsh(amount) ?? ""} with M-Pesa`}
              </button>
              <p className="text-center text-[0.6875rem] text-ink/65">
                You will get an M-Pesa prompt on this phone. Enter your PIN to pay.
              </p>
            </form>
          </section>
        </div>
      </div>
    </PortalShell>
  );
}
