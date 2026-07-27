"use client";

import { FormEvent, useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { ApiError, apiRequest } from "@/lib/api";

type Buyer = {
  id?: number;
  name?: string;
  first_name?: string;
  email?: string;
  phone_number?: string;
  contact?: string;
  county?: string;
  country?: string;
  location?: string;
  photo?: string | null;
  verified?: boolean;
  verification_badge?: string;
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
  location: string;
  matched_commodities: string[];
  count: number;
  results: KamisPriceRow[];
  detail?: string;
};

export default function FarmerMarketPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [error, setError] = useState("");
  const [crop, setCrop] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [priceData, setPriceData] = useState<KamisPricesResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest<{ buyer_list: Buyer[] }>(
          "/api/v1/market/buyers/"
        );
        setBuyers(data.buyer_list || []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load market");
      }
    })();
  }, []);

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
            "No recent prices found for that crop. Try another crop name, or use Produce buyers below to contact verified buyers."
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

  return (
    <PortalShell role="farmer" title="Market">
      <div className="space-y-10">
        <section className="space-y-4">
          <h1 className="brand-mark text-3xl text-leaf-deep">Best markets</h1>
          <p className="max-w-2xl text-sm text-ink/60">
            Enter your crop to see recent KAMIS prices across markets and
            counties — then compare where it trades strongest.
          </p>

          <form
            onSubmit={onSearchPrices}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-ink/70">Crop</span>
              <input
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                placeholder="e.g. tomatoes, maize"
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
                    <th className="px-3 py-2 font-medium">Grade</th>
                    <th className="px-3 py-2 font-medium">Market</th>
                    <th className="px-3 py-2 font-medium">County</th>
                    <th className="px-3 py-2 font-medium">Wholesale</th>
                    <th className="px-3 py-2 font-medium">Retail</th>
                    <th className="px-3 py-2 font-medium">Supply</th>
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
                      <td className="px-3 py-2">{row.grade || "—"}</td>
                      <td className="px-3 py-2">{row.market}</td>
                      <td className="px-3 py-2">{row.county || "—"}</td>
                      <td className="px-3 py-2">{row.wholesale || "—"}</td>
                      <td className="px-3 py-2">{row.retail || "—"}</td>
                      <td className="px-3 py-2">{row.supply_volume || "—"}</td>
                      <td className="px-3 py-2">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-leaf-deep">
              Produce buyers
            </h2>
            <p className="text-sm text-ink/60">
              Verified buyers who signed up on AgriScan — name, contact, and
              location.
            </p>
          </div>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          {!error && buyers.length === 0 ? (
            <p className="text-sm text-ink/55">No registered buyers yet.</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {buyers.map((b) => {
              const displayName = b.name || b.first_name || "Buyer";
              const contact = b.contact || b.phone_number || b.email || "—";
              const place =
                b.location ||
                [b.county, b.country].filter(Boolean).join(", ") ||
                "—";
              return (
                <article key={b.id} className="panel overflow-hidden rounded-2xl">
                  <div className="aspect-[4/3] bg-leaf-deep/5">
                    {b.photo ? (
                      <img
                        src={b.photo}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-ink/40">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-leaf-deep">{displayName}</h3>
                      {b.verified !== false ? (
                        <span className="shrink-0 rounded-md bg-[var(--sprout)]/80 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-leaf-deep">
                          {b.verification_badge || "Verified"}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-ink/70">
                      <span className="text-ink/45">Location · </span>
                      {place}
                    </p>
                    <p className="text-sm">
                      <span className="text-ink/45">Contact · </span>
                      {contact}
                    </p>
                    {b.email && b.phone_number ? (
                      <p className="text-sm text-ink/55">{b.email}</p>
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
