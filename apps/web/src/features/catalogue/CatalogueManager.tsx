"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { EyeIcon, EyeOffIcon, PlusIcon, SearchIcon, StoreIcon, TrashIcon } from "@/components/Icons";
import { FilterTabs, PageHeader, StatCard } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/useConfirm";
import { ProductImage } from "@/features/marketplace/ProductImage";
import { ApiError, apiRequest, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatKsh } from "@/lib/format";
import type { AgencyProduct } from "@/lib/types";
import { categoryLabel } from "./categories";
import { MY_PRODUCTS_KEY, useShopProducts } from "./hooks";
import { ProductDialog } from "./ProductDialog";

type StatusFilter = "all" | "live" | "out" | "hidden";

function statusOf(p: AgencyProduct) {
  if (p.is_hidden) return { key: "hidden" as const, label: "Hidden by admin", tone: "badge-danger" };
  if (!p.is_available) return { key: "out" as const, label: "Out of stock", tone: "badge-warn" };
  return { key: "live" as const, label: "Live", tone: "badge-ok" };
}

/** My products: filter, search, switch stock on and off, add, edit and remove listings. */
export function CatalogueManager({ banner }: { banner?: ReactNode }) {
  const { user } = useAuth();
  const profile = (user?.profile || {}) as Record<string, string>;
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const products = useShopProducts();
  const list = products.data ?? [];

  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<"add" | AgencyProduct | null>(null);

  const count = (key: StatusFilter) => (key === "all" ? list.length : list.filter((p) => statusOf(p).key === key).length);
  const q = query.trim().toLowerCase();
  const shown = list.filter(
    (p) =>
      (status === "all" || statusOf(p).key === status) &&
      (!q || p.name.toLowerCase().includes(q) || p.category.includes(q) || p.unit.toLowerCase().includes(q))
  );

  // The switch flips straight away; the list is put back if the server says no.
  const stock = useMutation({
    mutationFn: ({ id, available }: { id: number; available: boolean; name: string }) =>
      apiRequest(`/api/v1/inputs/my-products/${id}/`, { method: "PATCH", body: { is_available: available } }),
    onMutate: async ({ id, available }) => {
      await qc.cancelQueries({ queryKey: MY_PRODUCTS_KEY });
      const before = qc.getQueryData<AgencyProduct[]>(MY_PRODUCTS_KEY);
      qc.setQueryData<AgencyProduct[]>(MY_PRODUCTS_KEY, (rows) =>
        (rows ?? []).map((p) => (p.id === id ? { ...p, is_available: available } : p))
      );
      return { before };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.before) qc.setQueryData(MY_PRODUCTS_KEY, ctx.before);
      toast.error(err instanceof ApiError ? err.message : "Could not change the stock status.");
    },
    onSuccess: (_data, { available, name }) =>
      toast.success(available ? `${name} is back in stock` : `${name} marked out of stock`),
    onSettled: () => qc.invalidateQueries({ queryKey: MY_PRODUCTS_KEY }),
  });

  const remove = useMutation({
    mutationFn: ({ id }: { id: number; name: string }) =>
      apiRequest(`/api/v1/inputs/my-products/${id}/`, { method: "DELETE" }),
    onSuccess: (_data, { name }) => {
      toast.success(`${name} removed from your catalogue`);
      qc.invalidateQueries({ queryKey: MY_PRODUCTS_KEY });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not remove the product."),
  });

  async function onRemove(p: AgencyProduct) {
    const ok = await confirm({
      title: `Remove “${p.name}”?`,
      message: "It disappears from your catalogue and the marketplace. This cannot be undone.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (ok) remove.mutate({ id: p.id, name: p.name });
  }

  return (
    <>
      <PageHeader
        title={profile.agency_name || "Your agency"}
        lead={`${profile.agency_type || "Agency"} · ${profile.county || "County not set"} · ${profile.phone || "No phone"}`}
        actions={
          <>
            <Link href="/marketplace" className="btn btn-ghost">
              <StoreIcon size={16} /> View marketplace
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => setDialog("add")}>
              <PlusIcon size={16} /> Add product
            </button>
          </>
        }
      />

      {banner}

      <div className="stat-cards mb-4">
        <StatCard label="Live listings" value={count("live")} sub="Visible to farmers now" Icon={EyeIcon} />
        <StatCard label="Out of stock" value={count("out")} sub="Hidden until you restock" Icon={EyeOffIcon} tone="amber" />
        <StatCard label="Hidden by admin" value={count("hidden")} sub="Contact AgriScan support" Icon={EyeOffIcon} tone="plum" />
      </div>

      <div className="toolbar">
        <FilterTabs
          label="Listing status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All", count: count("all") },
            { value: "live", label: "Live", count: count("live") },
            { value: "out", label: "Out of stock", count: count("out") },
            { value: "hidden", label: "Hidden", count: count("hidden") },
          ]}
        />
        <label className="search-box">
          <SearchIcon size={16} />
          <span className="sr-only">Search your products</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your products" />
        </label>
      </div>

      {products.isLoading ? (
        <ul className="cat-grid" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="skeleton h-36 rounded-xl" />
          ))}
        </ul>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <StoreIcon size={26} />
          <p className="empty-state__title">No products yet</p>
          <p>Add your first listing and farmers in your county will find it in the marketplace.</p>
          <button type="button" className="btn btn-primary mt-2" onClick={() => setDialog("add")}>
            <PlusIcon size={16} /> Add your first product
          </button>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty-state">
          <SearchIcon size={24} />
          <p className="empty-state__title">No products match</p>
          <p>Try another word, or show all your products.</p>
          <button
            type="button"
            className="btn btn-ghost mt-2"
            onClick={() => {
              setQuery("");
              setStatus("all");
            }}
          >
            Show all products
          </button>
        </div>
      ) : (
        <ul className="cat-grid">
          {shown.map((p) => {
            const s = statusOf(p);
            return (
              <li key={p.id} className="cat-card">
                <div className="cat-card__main">
                  <span className="thumb cat-card__thumb">
                    <ProductImage src={mediaUrl(p.image)} alt="" category={p.category} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="cat-card__name">{p.name}</p>
                      <span className={`badge shrink-0 ${s.tone}`}>{s.label}</span>
                    </div>
                    <p className="cat-card__meta">{categoryLabel(p.category)}</p>
                    <p className="cat-card__price">
                      {formatKsh(p.price) ?? "Price on request"}
                      {p.price && p.unit ? <span> / {p.unit}</span> : null}
                    </p>
                  </div>
                </div>
                <div className="cat-card__foot">
                  {p.is_hidden ? (
                    <span className="cat-card__note">Hidden from the marketplace</span>
                  ) : (
                    <label className="stock-toggle">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={p.is_available}
                        className={`switch ${p.is_available ? "is-on" : ""}`}
                        onClick={() => stock.mutate({ id: p.id, available: !p.is_available, name: p.name })}
                      >
                        <span className="sr-only">{p.is_available ? "In stock" : "Out of stock"}</span>
                      </button>
                      <span>{p.is_available ? "In stock" : "Out of stock"}</span>
                    </label>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDialog(p)}>
                      Edit
                    </button>
                    {p.is_available && !p.is_hidden ? (
                      <Link href={`/marketplace/${p.id}`} className="btn btn-ghost btn-sm">
                        View
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      aria-label={`Remove ${p.name}`}
                      title="Remove"
                      disabled={remove.isPending}
                      onClick={() => onRemove(p)}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialog ? (
        <ProductDialog key={dialog === "add" ? "add" : dialog.id} product={dialog === "add" ? null : dialog} onClose={() => setDialog(null)} />
      ) : null}
    </>
  );
}
