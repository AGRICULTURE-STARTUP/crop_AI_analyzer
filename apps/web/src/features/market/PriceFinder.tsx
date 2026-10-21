"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { BasketIcon, PinIcon, SearchIcon } from "@/components/Icons";
import { FilterTabs } from "@/components/ui/Page";
import { ApiError } from "@/lib/api";
import { fetchKamisPrices } from "./api";
import { bestMarket, parsePrice } from "./prices";
import type { KamisPriceRow } from "./types";

const POPULAR = ["Maize", "Tomatoes", "Beans", "Potatoes", "Onions", "Kale"];

type Sort = "market" | "low" | "high";

/**
 * Keep each commodity together, then order its markets by wholesale price. Commodities with the
 * most wholesale prices come first, so the one the farmer searched for leads the list.
 */
function sortRows(rows: KamisPriceRow[], sort: Sort) {
  if (sort === "market") return rows;
  const groups = new Map<string, KamisPriceRow[]>();
  for (const row of rows) groups.set(row.commodity, [...(groups.get(row.commodity) ?? []), row]);
  const value = (row: KamisPriceRow) => parsePrice(row.wholesale)?.value ?? null;
  const priced = (group: KamisPriceRow[]) => group.filter((row) => value(row) !== null).length;
  const ordered = [...groups.values()].sort((a, b) => priced(b) - priced(a));
  return ordered.flatMap((group) =>
    [...group].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1; // no price: last
      if (y === null) return -1;
      return sort === "low" ? x - y : y - x;
    })
  );
}

/** KAMIS price search shared by the farmer market page and the buyer dashboard. */
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
  const [sort, setSort] = useState<Sort>(audience === "seller" ? "high" : "low");

  const prices = useQuery({
    queryKey: ["kamis-prices", submitted.toLowerCase()],
    queryFn: () => fetchKamisPrices(submitted),
    enabled: submitted.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  function search(value: string) {
    const q = value.trim();
    if (!q) {
      setHint("Enter a crop name, for example tomatoes or maize.");
      return;
    }
    setHint("");
    setCrop(q);
    setSubmitted(q);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    search(crop);
  }

  const data = prices.data;
  const best = data && data.count ? bestMarket(data.results, audience) : null;
  const rows = useMemo(() => sortRows(data?.results ?? [], sort), [data, sort]);

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
      <div className="quick-chips" aria-label="Popular crops">
        <span>Popular:</span>
        {POPULAR.map((name) => (
          <button
            key={name}
            type="button"
            className={submitted.toLowerCase() === name.toLowerCase() ? "is-active" : ""}
            onClick={() => search(name)}
          >
            {name}
          </button>
        ))}
      </div>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
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
            <FilterTabs
              label="Sort markets"
              value={sort}
              onChange={setSort}
              options={[
                { value: "high", label: "Highest price" },
                { value: "low", label: "Lowest price" },
                { value: "market", label: "As listed" },
              ]}
            />
          </div>
          <div className="table-wrap table-wrap--stack">
            <table className="data-table data-table--stack min-w-[44rem]">
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
                {rows.map((row, i) => (
                  <tr key={`${row.market}-${row.date}-${i}`}>
                    <td className="cell-title font-medium text-[var(--ink)]">
                      {row.commodity}
                      {row.classification ? <span className="block text-xs font-normal">{row.classification}</span> : null}
                    </td>
                    <td data-label="Market">{row.market}</td>
                    <td data-label="County">{row.county || "—"}</td>
                    <td data-label="Wholesale" className="whitespace-nowrap font-medium text-[var(--ink)]">
                      {row.wholesale || "—"}
                    </td>
                    <td data-label="Retail" className="whitespace-nowrap">
                      {row.retail || "—"}
                    </td>
                    <td data-label="Supply">{row.supply_volume || "—"}</td>
                    <td data-label="Date" className="whitespace-nowrap">
                      {row.date}
                    </td>
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
