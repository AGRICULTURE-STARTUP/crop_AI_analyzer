"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { ApiError, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { BuyerProfile, ScanWeather, WeatherResponse } from "@/lib/types";

type Farmer = {
  id?: number;
  username?: string;
  name?: string;
  county?: string;
  country?: string;
  location?: string;
  products?: string;
  phone_number?: string;
  farm_name?: string;
  farm_size_acres?: string;
  photo?: string | null;
};

type KamisPriceRow = {
  commodity: string;
  classification: string;
  grade: string;
  market: string;
  wholesale: string;
  retail: string;
  supply_volume: string;
  county: string;
  date: string;
};

type KamisPricesResponse = {
  crop: string;
  matched_commodities: string[];
  count: number;
  results: KamisPriceRow[];
  detail?: string;
};

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

async function fetchFarmers(params: {
  crop?: string;
  county?: string;
}): Promise<Farmer[]> {
  const qs = new URLSearchParams();
  if (params.crop?.trim()) qs.set("crop", params.crop.trim());
  if (params.county?.trim()) qs.set("county", params.county.trim());
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const data = await apiRequest<{ farmer_list: Farmer[] }>(
    `/api/v1/market/farmers/${suffix}`
  );
  return data.farmer_list || [];
}

export default function BuyerDashboardPage() {
  const { user } = useAuth();
  const profile = (user?.profile || {}) as BuyerProfile;

  const [crop, setCrop] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [priceData, setPriceData] = useState<KamisPricesResponse | null>(null);

  const [farmerCrop, setFarmerCrop] = useState("");
  const [farmerCounty, setFarmerCounty] = useState("");
  const [farmerFilter, setFarmerFilter] = useState({ crop: "", county: "" });

  const displayName =
    profile.first_name ||
    [user?.user.first_name, user?.user.last_name].filter(Boolean).join(" ") ||
    user?.user.username ||
    "Buyer";

  const locationLabel = [profile.county, profile.country || "Kenya"]
    .filter(Boolean)
    .join(", ");

  const weatherQuery = useQuery({
    queryKey: ["weather", "buyer", profile.county],
    queryFn: () => apiRequest<WeatherResponse>("/api/v1/weather/"),
    enabled: Boolean(profile.county),
    staleTime: 10 * 60 * 1000,
  });
  const weather: ScanWeather | null = weatherQuery.data?.weather ?? null;

  const farmersQuery = useQuery({
    queryKey: ["buyer-farmers", farmerFilter.crop, farmerFilter.county],
    queryFn: () => fetchFarmers(farmerFilter),
  });

  const farmers = farmersQuery.data || [];
  const counties = useMemo(() => {
    const set = new Set<string>();
    for (const f of farmers) {
      if (f.county) set.add(f.county);
    }
    return Array.from(set).sort();
  }, [farmers]);

  async function onSearchPrices(e: FormEvent) {
    e.preventDefault();
    const cropQ = crop.trim();
    if (!cropQ) {
      setPriceError("Enter a crop name (e.g. tomatoes, maize).");
      return;
    }
    setPriceLoading(true);
    setPriceError("");
    try {
      const params = new URLSearchParams({ crop: cropQ });
      const data = await apiRequest<KamisPricesResponse>(
        `/api/v1/market/kamis-prices/?${params.toString()}`
      );
      setPriceData(data);
      if (!data.count) {
        setPriceError(
          data.detail ||
            "No recent prices found for that crop. Try another crop name."
        );
      }
    } catch (err) {
      setPriceData(null);
      setPriceError(
        err instanceof ApiError ? err.message : "Could not load market prices"
      );
    } finally {
      setPriceLoading(false);
    }
  }

  function onFilterFarmers(e: FormEvent) {
    e.preventDefault();
    setFarmerFilter({ crop: farmerCrop.trim(), county: farmerCounty.trim() });
  }

  return (
    <PortalShell role="buyer" title="Buyer dashboard">
      <div className="space-y-10">
        {/* Profile snapshot */}
        <section className="panel overflow-hidden rounded-2xl">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-leaf-deep/10">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-ink/40">
                  No photo
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="brand-mark text-3xl text-leaf-deep">{displayName}</h1>
                {profile.verified !== false ? (
                  <span className="rounded-md bg-[var(--sprout)]/80 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-leaf-deep">
                    {profile.verification_badge || "Verified"}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-ink/60">
                {locationLabel || "Add your county on Profile"} ·{" "}
                {profile.phone_number || profile.email || user?.user.email}
              </p>
              <p className="mt-2 max-w-xl text-sm text-ink/55">
                Find current produce prices across Kenya, then contact farmers
                ready to sell.
              </p>
              <Link
                href="/buyer/profile"
                className="mt-3 inline-flex text-sm font-medium text-leaf-deep underline underline-offset-2"
              >
                Edit profile
              </Link>
            </div>
            <div className="grid min-w-[10rem] gap-2 rounded-xl bg-mist/70 px-4 py-3 text-sm">
              <p className="text-ink/45">Local weather</p>
              {weather ? (
                <>
                  <p className="font-semibold text-leaf-deep">
                    {formatMetric(weather.temperature_celsius, 0)}°C
                  </p>
                  <p className="text-ink/60">
                    Humidity {formatMetric(weather.humidity_percent, 0)}%
                  </p>
                </>
              ) : (
                <p className="text-ink/55">
                  {weatherQuery.isLoading
                    ? "Loading…"
                    : weatherQuery.data?.detail || "Set county to see weather"}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Market prices */}
        <section className="space-y-4" id="prices">
          <div>
            <h2 className="text-xl font-semibold text-leaf-deep">
              Market prices
            </h2>
            <p className="text-sm text-ink/60">
              Check recent KAMIS wholesale and retail prices by crop — including
              market and county.
            </p>
          </div>

          <form
            onSubmit={onSearchPrices}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-ink/70">Crop</span>
              <input
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                placeholder="e.g. tomatoes, maize, wheat"
                className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={priceLoading}
              className="rounded-xl bg-leaf-deep px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {priceLoading ? "Searching…" : "Find prices"}
            </button>
          </form>

          {priceError ? (
            <p className="text-sm text-[var(--danger)]">{priceError}</p>
          ) : null}

          {priceData?.matched_commodities?.length ? (
            <p className="text-xs text-ink/55">
              Matching: {priceData.matched_commodities.join(", ")}
            </p>
          ) : null}

          {priceData && priceData.count > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-ink/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-leaf-deep/5 text-ink/70">
                  <tr>
                    <th className="px-3 py-2 font-medium">Commodity</th>
                    <th className="px-3 py-2 font-medium">Classification</th>
                    <th className="px-3 py-2 font-medium">Market</th>
                    <th className="px-3 py-2 font-medium">County</th>
                    <th className="px-3 py-2 font-medium">Wholesale</th>
                    <th className="px-3 py-2 font-medium">Retail</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {priceData.results.map((row, i) => (
                    <tr
                      key={`${row.market}-${row.date}-${i}`}
                      className="border-t border-ink/10"
                    >
                      <td className="px-3 py-2">{row.commodity}</td>
                      <td className="px-3 py-2">{row.classification || "—"}</td>
                      <td className="px-3 py-2">{row.market}</td>
                      <td className="px-3 py-2">{row.county || "—"}</td>
                      <td className="px-3 py-2">{row.wholesale || "—"}</td>
                      <td className="px-3 py-2">{row.retail || "—"}</td>
                      <td className="px-3 py-2">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {/* Farmers directory */}
        <section className="space-y-4" id="farmers">
          <div>
            <h2 className="text-xl font-semibold text-leaf-deep">
              Farmers directory
            </h2>
            <p className="text-sm text-ink/60">
              Browse registered farmers by crop or county and contact them
              directly.
            </p>
          </div>

          <form
            onSubmit={onFilterFarmers}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-ink/70">Crop</span>
              <input
                value={farmerCrop}
                onChange={(e) => setFarmerCrop(e.target.value)}
                placeholder="e.g. maize"
                className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2"
              />
            </label>
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-ink/70">County</span>
              <input
                value={farmerCounty}
                onChange={(e) => setFarmerCounty(e.target.value)}
                placeholder="e.g. Meru"
                list="buyer-farmer-counties"
                className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2"
              />
              <datalist id="buyer-farmer-counties">
                {counties.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <button
              type="submit"
              className="rounded-xl bg-leaf-deep px-4 py-2 text-sm font-medium text-white"
            >
              Filter
            </button>
            <button
              type="button"
              className="rounded-xl border border-ink/15 px-4 py-2 text-sm"
              onClick={() => {
                setFarmerCrop("");
                setFarmerCounty("");
                setFarmerFilter({ crop: "", county: "" });
              }}
            >
              Clear
            </button>
          </form>

          {farmersQuery.isError ? (
            <p className="text-sm text-[var(--danger)]">
              {farmersQuery.error instanceof ApiError
                ? farmersQuery.error.message
                : "Failed to load farmers"}
            </p>
          ) : null}

          {farmersQuery.isLoading ? (
            <p className="text-sm text-ink/55">Loading farmers…</p>
          ) : null}

          {!farmersQuery.isLoading && farmers.length === 0 ? (
            <p className="text-sm text-ink/55">
              No farmers match that filter yet.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {farmers.map((f) => {
              const name = f.name || f.username || `Farmer #${f.id}`;
              const place =
                f.location ||
                [f.county, f.country].filter(Boolean).join(", ") ||
                "—";
              const crops = cropTags(f.products);
              return (
                <article
                  key={f.id || f.username}
                  className="panel overflow-hidden rounded-2xl"
                >
                  <div className="aspect-[4/3] bg-leaf-deep/5">
                    {f.photo ? (
                      <img
                        src={f.photo}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-ink/40">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5 p-4">
                    <h3 className="font-semibold text-leaf-deep">{name}</h3>
                    {f.farm_name ? (
                      <p className="text-sm text-ink/55">{f.farm_name}</p>
                    ) : null}
                    <p className="text-sm text-ink/70">
                      <span className="text-ink/45">Location · </span>
                      {place}
                    </p>
                    <p className="text-sm">
                      <span className="text-ink/45">Contact · </span>
                      {f.phone_number || "—"}
                    </p>
                    {f.farm_size_acres ? (
                      <p className="text-sm text-ink/55">
                        Farm size · {f.farm_size_acres} acres
                      </p>
                    ) : null}
                    {crops.length ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {crops.slice(0, 6).map((c) => (
                          <span
                            key={c}
                            className="rounded-md bg-leaf-deep/8 px-2 py-0.5 text-[11px] text-leaf-deep"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : f.products ? (
                      <p className="text-sm text-ink/60">{f.products}</p>
                    ) : null}
                    {f.phone_number ? (
                      <a
                        href={`tel:${f.phone_number}`}
                        className="mt-2 inline-flex text-sm font-medium text-leaf-deep underline underline-offset-2"
                      >
                        Call farmer
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
