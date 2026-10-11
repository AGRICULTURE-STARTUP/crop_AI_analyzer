"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { EyeIcon, EyeOffIcon, SearchIcon } from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { Pagination } from "@/components/ui/Pagination";
import { fetchAdminProducts, setProductHidden } from "@/features/admin/api";
import type { AdminProductRow } from "@/features/admin/types";
import { PageHeader, FilterTabs } from "@/components/ui/Page";
import { ProductImage } from "@/features/marketplace/ProductImage";
import { ApiError } from "@/lib/api";
import { formatDate, formatKsh } from "@/lib/format";

type StatusFilter = "" | "live" | "hidden" | "unavailable";

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "fertiliser", label: "Fertiliser" },
  { value: "seed", label: "Seed" },
  { value: "pesticide", label: "Pesticide" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

function statusOf(p: AdminProductRow) {
  if (p.is_hidden) return { label: "Hidden", tone: "badge-danger" };
  if (!p.is_available) return { label: "Out of stock", tone: "badge-warn" };
  return { label: "Live", tone: "badge-ok" };
}

export default function AdminMarketplacePage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const products = useQuery({
    queryKey: ["admin-products", status, category, q, page],
    queryFn: () => fetchAdminProducts({ status, category, q, page }),
    placeholderData: keepPreviousData,
  });

  const visibility = useMutation({
    mutationFn: ({ id, hidden }: { id: number; hidden: boolean }) => setProductHidden(id, hidden),
    onSuccess: () => {
      setError("");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "The change could not be saved."),
  });

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setQ(search.trim());
    setPage(1);
  }

  function onToggle(p: AdminProductRow) {
    const hide = !p.is_hidden;
    const message = hide
      ? `Hide “${p.name}” from the marketplace? ${p.seller.name} still sees it, marked as hidden.`
      : `Show “${p.name}” in the marketplace again?`;
    if (window.confirm(message)) visibility.mutate({ id: p.id, hidden: hide });
  }

  const totals = products.data?.totals;

  return (
    <PortalShell role="admin" title="Marketplace">
      <PageHeader
        title="Marketplace listings"
        lead="Every product agencies have listed. Hiding a listing removes it from the public marketplace, the farmer portal and USSD."
        actions={
          <Link href="/marketplace" className="btn btn-ghost">
            Open marketplace
          </Link>
        }
      />

      <div className="toolbar">
        <FilterTabs
          label="Listing status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: "", label: "All", count: totals?.all },
            { value: "live", label: "Live", count: totals?.live },
            { value: "hidden", label: "Hidden", count: totals?.hidden },
            { value: "unavailable", label: "Out of stock", count: totals?.unavailable },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <form onSubmit={onSearch} className="search-box" role="search">
            <SearchIcon size={16} />
            <label className="sr-only" htmlFor="product-search">
              Search listings
            </label>
            <input
              id="product-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Product or seller"
            />
          </form>
          <label className="sr-only" htmlFor="product-category">
            Category
          </label>
          <select
            id="product-category"
            className="field !w-auto"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value || "all"} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="table-wrap">
        <table className="data-table min-w-[54rem]">
          <thead>
            <tr>
              <th>Product</th>
              <th>Seller</th>
              <th>Price</th>
              <th>Listed</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.isLoading ? (
              <tr>
                <td colSpan={6} className="!py-10 text-center">
                  Loading listings…
                </td>
              </tr>
            ) : (products.data?.results.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={6} className="!py-10 text-center">
                  No listings match these filters.
                </td>
              </tr>
            ) : (
              products.data?.results.map((p) => {
                const s = statusOf(p);
                const live = !p.is_hidden && p.is_available;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="thumb">
                          <ProductImage src={p.image} alt="" category={p.category} />
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[16rem] truncate font-semibold text-[var(--ink)]">
                            {p.name}
                          </span>
                          <span className="block text-xs">{p.category_label}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="block font-medium text-[var(--ink)]">{p.seller.name}</span>
                      <span className="block text-xs">{p.seller.county}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      {formatKsh(p.price) ?? "On request"}
                      {p.price && p.unit ? <span className="block text-xs">per {p.unit}</span> : null}
                    </td>
                    <td className="whitespace-nowrap">{formatDate(p.created_at)}</td>
                    <td>
                      <span className={`badge ${s.tone}`}>{s.label}</span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        {live ? (
                          <Link href={`/marketplace/${p.id}`} className="btn btn-ghost !py-1.5 text-xs">
                            View
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className={`btn !py-1.5 text-xs ${p.is_hidden ? "btn-primary" : "btn-ghost"}`}
                          disabled={visibility.isPending}
                          onClick={() => onToggle(p)}
                        >
                          {p.is_hidden ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
                          {p.is_hidden ? "Show" : "Hide"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {products.data && products.data.pages > 1 ? (
        <Pagination page={products.data.page} pages={products.data.pages} onChange={setPage} />
      ) : null}
    </PortalShell>
  );
}
