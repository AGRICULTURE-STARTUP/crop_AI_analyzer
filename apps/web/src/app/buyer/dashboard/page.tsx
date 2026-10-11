"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { CloudIcon, SearchIcon } from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { fetchFarmers } from "@/features/market/api";
import { ContactCard } from "@/features/market/ContactCard";
import { PriceFinder } from "@/features/market/PriceFinder";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initialsOf } from "@/lib/format";
import type { BuyerProfile, ScanWeather, WeatherResponse } from "@/lib/types";

function cropTags(products?: string | null) {
  if (!products?.trim()) return [];
  return products
    .split(/[,;/|]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function metric(value: number | string | undefined | null) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  return Number.isNaN(n) ? String(value) : n.toFixed(0);
}

export default function BuyerDashboardPage() {
  const { user } = useAuth();
  const profile = (user?.profile || {}) as BuyerProfile;

  const [farmerCrop, setFarmerCrop] = useState("");
  const [farmerCounty, setFarmerCounty] = useState("");
  const [filter, setFilter] = useState({ crop: "", county: "" });

  const displayName =
    profile.first_name ||
    [user?.user.first_name, user?.user.last_name].filter(Boolean).join(" ") ||
    user?.user.username ||
    "Buyer";
  const locationLabel = [profile.county, profile.country || "Kenya"].filter(Boolean).join(", ");

  const weatherQuery = useQuery({
    queryKey: ["weather", "buyer", profile.county],
    queryFn: () => apiRequest<WeatherResponse>("/api/v1/weather/"),
    enabled: Boolean(profile.county),
    staleTime: 10 * 60 * 1000,
  });
  const weather: ScanWeather | null = weatherQuery.data?.weather ?? null;

  const farmersQuery = useQuery({
    queryKey: ["buyer-farmers", filter.crop, filter.county],
    queryFn: () => fetchFarmers(filter),
  });
  const farmers = useMemo(() => farmersQuery.data ?? [], [farmersQuery.data]);
  const counties = useMemo(
    () => Array.from(new Set(farmers.map((f) => f.county).filter(Boolean) as string[])).sort(),
    [farmers]
  );

  function onFilter(e: FormEvent) {
    e.preventDefault();
    setFilter({ crop: farmerCrop.trim(), county: farmerCounty.trim() });
  }

  return (
    <PortalShell role="buyer" title="Dashboard">
      <div className="space-y-10">
        <section className="buyer-hero">
          {profile.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo} alt="" className="buyer-hero__photo" />
          ) : (
            <span className="avatar buyer-hero__avatar" aria-hidden>
              {initialsOf(displayName)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="page-header__title">{displayName}</h1>
              {profile.verified !== false ? (
                <span className="badge badge-ok">{profile.verification_badge || "Verified"}</span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-ink/70">
              {locationLabel || "Add your county on Profile"} · {profile.phone_number || profile.email || user?.user.email}
            </p>
            <p className="mt-1 text-sm text-ink/70">
              Check current produce prices across Kenya, then contact farmers who are ready to sell.
            </p>
            <Link href="/buyer/profile" className="mt-2 inline-flex text-sm font-semibold text-leaf-deep hover:underline">
              Edit profile
            </Link>
          </div>
          <div className="buyer-hero__weather">
            <CloudIcon size={20} />
            <div>
              <p className="text-xs text-ink/65">Local weather</p>
              {weather ? (
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {metric(weather.temperature_celsius)}°C · {metric(weather.humidity_percent)}% humidity
                </p>
              ) : (
                <p className="text-sm text-ink/70">
                  {weatherQuery.isLoading ? "Loading…" : weatherQuery.data?.detail || "Set your county to see weather"}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4" id="prices">
          <div>
            <h2 className="pd-section-title !mb-1">Market prices</h2>
            <p className="text-sm text-ink/70">Recent KAMIS wholesale and retail prices by crop, market and county.</p>
          </div>
          <PriceFinder audience="buyer" />
        </section>

        <section className="space-y-4" id="farmers">
          <div>
            <h2 className="pd-section-title !mb-1">Farmers directory</h2>
            <p className="text-sm text-ink/70">Registered farmers by crop or county. Contact them directly.</p>
          </div>

          <form onSubmit={onFilter} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <label className="block flex-1 space-y-1.5 text-sm">
              <span className="font-medium text-ink/80">Crop</span>
              <input className="field" value={farmerCrop} onChange={(e) => setFarmerCrop(e.target.value)} placeholder="e.g. maize" />
            </label>
            <label className="block flex-1 space-y-1.5 text-sm">
              <span className="font-medium text-ink/80">County</span>
              <input
                className="field"
                value={farmerCounty}
                onChange={(e) => setFarmerCounty(e.target.value)}
                placeholder="e.g. Meru"
                list="buyer-farmer-counties"
              />
              <datalist id="buyer-farmer-counties">
                {counties.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <button type="submit" className="btn btn-primary">
              <SearchIcon size={16} /> Filter
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setFarmerCrop("");
                setFarmerCounty("");
                setFilter({ crop: "", county: "" });
              }}
            >
              Clear
            </button>
          </form>

          {farmersQuery.isError ? (
            <p className="text-sm text-[var(--danger)]">
              {farmersQuery.error instanceof ApiError ? farmersQuery.error.message : "Farmers could not load."}
            </p>
          ) : farmersQuery.isLoading ? (
            <p className="text-sm text-ink/65">Loading farmers…</p>
          ) : farmers.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__title">No farmers match that filter yet</p>
              <p>Try a neighbouring county or another crop.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {farmers.map((f, i) => {
                const name = f.name || f.username || `Farmer #${f.id}`;
                const details = [f.farm_name, f.farm_size_acres ? `${f.farm_size_acres} acres` : ""]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <ContactCard
                    key={f.id ?? f.username ?? i}
                    name={name}
                    subtitle={details || undefined}
                    place={f.location || [f.county, f.country].filter(Boolean).join(", ")}
                    photo={f.photo}
                    phone={f.phone_number}
                    tags={cropTags(f.products)}
                    whatsappText={`Hello ${name}, I saw your farm on AgriScan. Do you have produce for sale?`}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
