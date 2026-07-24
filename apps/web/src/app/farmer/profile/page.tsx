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
import { apiRequest, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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
      setTopupMsg("STK push initiated. Complete on your phone.");
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
      <div className="space-y-6">
        {/* Hero */}
        <section className="panel profile-hero animate-rise overflow-hidden rounded-3xl">
          <div className="profile-hero__glow" aria-hidden />
          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
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
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-leaf">
                Farmer profile
              </p>
              <h1 className="brand-mark mt-1 text-3xl text-leaf-deep sm:text-4xl">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-ink/60">
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

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Weather + farm summary */}
          <div className="flex flex-col gap-6 lg:col-span-3">
            <section className="panel animate-rise overflow-hidden rounded-3xl [animation-delay:80ms]">
              <div className="weather-panel">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Local weather</h2>
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

            <section className="panel animate-rise rounded-3xl p-6 [animation-delay:120ms]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-leaf-deep">Farm details</h2>
                  <p className="text-sm text-ink/55">
                    Keep size, crops, and location up to date for better advice.
                  </p>
                </div>
              </div>

              {editing ? (
                <form onSubmit={saveProfile} className="mt-5 grid gap-3 sm:grid-cols-2">
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
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
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
          <section className="panel animate-rise rounded-3xl p-6 lg:col-span-2 [animation-delay:160ms]">
            <h2 className="text-xl font-semibold text-leaf-deep">Wallet</h2>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-leaf-deep">
              KSh {walletQuery.data?.balance ?? user?.wallet?.balance ?? "0.00"}
            </p>
            <p className="mt-1 text-sm text-ink/55">
              Scans: {walletQuery.data?.scan_count ?? user?.wallet?.scan_count ?? 0} ·
              Chats: {walletQuery.data?.chat_count ?? user?.wallet?.chat_count ?? 0}
            </p>
            <form onSubmit={topup} className="mt-5 space-y-3">
              <FormField
                label="M-Pesa phone"
                name="phone_number"
                placeholder="2547…"
                required
                defaultValue={profile.phone_number || ""}
              />
              <FormField
                label="Amount (KSh)"
                name="amount"
                type="number"
                required
                defaultValue="100"
              />
              {topupMsg ? (
                <p className="text-sm text-[var(--ok)]">{topupMsg}</p>
              ) : null}
              {topupError ? (
                <p className="text-sm text-[var(--danger)]">{topupError}</p>
              ) : null}
              <button className="btn btn-primary w-full" disabled={topupBusy} type="submit">
                {topupBusy ? "Sending…" : "Top up with M-Pesa"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </PortalShell>
  );
}
