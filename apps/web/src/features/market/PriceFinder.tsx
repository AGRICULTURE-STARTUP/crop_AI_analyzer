"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { BasketIcon, PinIcon, SearchIcon } from "@/components/Icons";
import { ApiError } from "@/lib/api";
import { fetchKamisPrices } from "./api";
import { bestMarket } from "./prices";

/** KAMIS price search for farmers (seller-oriented ranking). */
export function PriceFinder({
  initialCrop = "",
  audience,
}: {
  initialCrop?: string;
  audience: "seller" | "buyer";
}) {
  const [crop, setCrop] = useState(initialCrop);
  const [submitted, setSubmitted] = useState(initialCrop.trim());
  const [hint, setHint] = useState("");

  const prices = useQuery({
    queryKey: ["kamis-prices", submitted.toLowerCase()],
    queryFn: () => fetchKamisPrices(submitted),
    enabled: submitted.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = crop.trim();
    if (!q) {
      setHint("Enter a crop name, for example tomatoes or maize.");
      return;
    }
    setHint("");
    setSubmitted(q);
  }

  const data = prices.data;
  const best = data && data.count ? bestMarket(data.results, audience) : null;

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="price-search" role="search">
        <BasketIcon size={18} />
        <label className="sr-only" htmlFor="price-crop">
          Crop
        </label>
        <input
          id="price-crop"
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          placeholder="Crop, e.g. tomatoes, maize, beans"
        />
        <button type="submit" className="btn btn-primary" disabled={prices.isFetching}>
          <SearchIcon size={16} /> {prices.isFetching ? "Searching…" : "Find prices"}
        </button>
      </form>
      {hint ? <p className="text-sm text-[var(--danger)]">{hint}</p> : null}

      {prices.isError ? (
        <p className="text-sm text-[var(--danger)]">
          {prices.error instanceof ApiError ? prices.error.message : "Could not load market prices."}
        </p>
      ) : null}

      {data && !data.count ? (
        <div className="empty-state">
          <p className="empty-state__title">No recent prices for “{submitted}”</p>
          <p>{data.detail || "Try another spelling or a related crop name."}</p>
        </div>
      ) : null}

      {data && data.count ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {best ? (
              <span className="best-market">
                <PinIcon size={15} />
                {audience === "seller" ? "Highest wholesale" : "Lowest wholesale"} for {best.commodity}:{" "}
                <strong>
                  KSh {best.price.value.toLocaleString("en-KE")}
                  {best.unit ? `/${best.unit}` : ""}
                </strong>{" "}
                at {best.row.market}
                {best.row.county ? ` (${best.row.county})` : ""}
              </span>
            ) : null}
            {data.matched_commodities?.length ? (
              <span className="text-xs text-[var(--muted)]">
                Matching: {data.matched_commodities.join(", ")} · {data.count} markets
              </span>
            ) : null}
          </div>
          <div className="table-wrap">
            <table className="data-table min-w-[44rem]">
              <thead>
                <tr>
                  <th>Commodity</th>
                  <th>Market</th>
                  <th>County</th>
                  <th>Wholesale</th>
                  <th>Retail</th>
                  <th>Supply</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((row, i) => (
                  <tr key={`${row.market}-${row.date}-${i}`}>
                    <td className="font-medium text-[var(--ink)]">
                      {row.commodity}
                      {row.classification ? <span className="block text-xs">{row.classification}</span> : null}
                    </td>
                    <td>{row.market}</td>
                    <td>{row.county || "—"}</td>
                    <td className="whitespace-nowrap">{row.wholesale || "—"}</td>
                    <td className="whitespace-nowrap">{row.retail || "—"}</td>
                    <td>{row.supply_volume || "—"}</td>
                    <td className="whitespace-nowrap">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Prices from KAMIS (Kenya Agricultural Market Information System). Compare like with like: units differ
            between markets.
          </p>
        </>
      ) : null}
    </div>
  );
}
