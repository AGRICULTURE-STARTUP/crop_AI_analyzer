"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CloudIcon, PinIcon, SproutIcon, UsersIcon } from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { StatCard } from "@/components/ui/Page";
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
    placeholderData: keepPreviousData,
  });
  const farmers = useMemo(() => farmersQuery.data ?? [], [farmersQuery.data]);
  const counties = useMemo(
    () => Array.from(new Set(farmers.map((f) => f.county).filter(Boolean) as string[])).sort(),
    [farmers]
  );

  // The list follows what is typed once typing pauses, so there is no Filter button to press.
  useEffect(() => {
    const timer = window.setTimeout(() => setFilter({ crop: farmerCrop.trim(), county: farmerCounty.trim() }), 350);
    return () => window.clearTimeout(timer);
  }, [farmerCrop, farmerCounty]);

  function onFilter(e: FormEvent) {
    e.preventDefault();
    setFilter({ crop: farmerCrop.trim(), county: farmerCounty.trim() });
  }

  const filtered = Boolean(filter.crop || filter.county);
  const cropCount = useMemo(
    () => new Set(farmers.flatMap((f) => cropTags(f.products).map((c) => c.toLowerCase()))).size,
    [farmers]
  );

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
        </section>

        <div className="stat-cards">
          <StatCard
            label={filtered ? "Farmers matching" : "Farmers listed"}
            value={farmers.length}
            sub="Registered on AgriScan"
            Icon={UsersIcon}
            href="#farmers"
          />
          <StatCard label="Counties" value={counties.length} sub="Where they farm" Icon={PinIcon} tone="sky" href="#farmers" />
          <StatCard label="Crops grown" value={cropCount} sub="Different crops listed" Icon={SproutIcon} tone="amber" href="#farmers" />
          <StatCard
            label="Local weather"
            value={weather ? `${metric(weather.temperature_celsius)}°C` : "—"}
            sub={
              weather
                ? `${metric(weather.humidity_percent)}% humidity${profile.county ? ` · ${profile.county}` : ""}`
                : weatherQuery.isLoading
                  ? "Loading…"
                  : weatherQuery.data?.detail || "Set your county on Profile"
            }
            Icon={CloudIcon}
            tone="plum"
          />
        </div>

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
            <label className="form-field flex-1">
              <span className="font-medium text-ink/80">Crop</span>
              <input className="field" value={farmerCrop} onChange={(e) => setFarmerCrop(e.target.value)} placeholder="e.g. maize" />
            </label>
            <label className="form-field flex-1">
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
            {farmerCrop || farmerCounty ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setFarmerCrop("");
                  setFarmerCounty("");
                  setFilter({ crop: "", county: "" });
                }}
              >
                Clear filters
              </button>
            ) : null}
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
