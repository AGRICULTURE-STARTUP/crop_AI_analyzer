"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { EyeIcon, EyeOffIcon, StoreIcon, TrashIcon } from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { PageHeader, StatCard } from "@/components/ui/Page";
import { ProductImage } from "@/features/marketplace/ProductImage";
import { useShopProducts } from "@/features/pos/hooks";
import { PosHighlight } from "@/features/pos/PosHighlight";
import { ApiError, apiRequest, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatKsh } from "@/lib/format";
import type { AgencyProduct } from "@/lib/types";

const CATEGORIES = [
  { value: "fertiliser", label: "Fertiliser" },
  { value: "seed", label: "Seed" },
  { value: "pesticide", label: "Pesticide" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

function statusOf(p: AgencyProduct) {
  if (p.is_hidden) return { label: "Hidden by admin", tone: "badge-danger" };
  if (!p.is_available) return { label: "Out of stock", tone: "badge-warn" };
  return { label: "Live", tone: "badge-ok" };
}

export default function AgencyDashboardPage() {
  const { user } = useAuth();
  const profile = (user?.profile || {}) as Record<string, string>;
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);

  const products = useShopProducts();
  const list = products.data ?? [];
  const live = list.filter((p) => p.is_available && !p.is_hidden).length;
  const out = list.filter((p) => !p.is_available && !p.is_hidden).length;
  const hidden = list.filter((p) => p.is_hidden).length;

  const refresh = () => qc.invalidateQueries({ queryKey: ["my-products"] });
  const fail = (err: unknown, fallback: string) => setError(err instanceof ApiError ? err.message : fallback);

  const create = useMutation({
    mutationFn: (fd: FormData) => apiRequest("/api/v1/inputs/my-products/", { method: "POST", formData: fd }),
    onSuccess: () => {
      setOk("Product listed. Farmers can now find it in the marketplace.");
      setError("");
      setPreview(null);
      refresh();
    },
    onError: (err) => fail(err, "Could not save the product."),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<AgencyProduct> }) =>
      apiRequest(`/api/v1/inputs/my-products/${id}/`, { method: "PATCH", body }),
    onSuccess: () => {
      setError("");
      setEditing(null);
      refresh();
    },
    onError: (err) => fail(err, "Could not update the product."),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/v1/inputs/my-products/${id}/`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (err) => fail(err, "Could not remove the product."),
  });

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setOk("");
    create.mutate(new FormData(form), { onSuccess: () => form.reset() });
  }

  function onImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  return (
    <PortalShell role="agency" title="My products">
      <PageHeader
        title={profile.agency_name || "Your agency"}
        lead={`${profile.agency_type || "Agency"} · ${profile.county || "County not set"} · ${profile.phone || "No phone"}`}
        actions={
          <Link href="/marketplace" className="btn btn-ghost">
            <StoreIcon size={16} /> View marketplace
          </Link>
        }
      />

      <PosHighlight />

      <div className="stat-cards mb-6">
        <StatCard label="Live listings" value={live} sub="Visible to farmers now" Icon={EyeIcon} />
        <StatCard label="Out of stock" value={out} sub="Hidden until you restock" Icon={EyeOffIcon} tone="amber" />
        <StatCard label="Hidden by admin" value={hidden} sub="Contact AgriScan support" Icon={EyeOffIcon} tone="plum" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <form onSubmit={onCreate} className="ui-card space-y-4 self-start" encType="multipart/form-data">
          <h2 className="ui-card__title">Add a product</h2>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-ink/80">Name</span>
            <input className="field" name="name" required maxLength={150} placeholder="e.g. DAP fertiliser" />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-ink/80">Category</span>
            <select className="field" name="category" defaultValue="fertiliser">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-ink/80">Price (KSh)</span>
              <input className="field" name="price" type="number" min="0" step="0.01" placeholder="Optional" />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-ink/80">Pack size</span>
              <input className="field" name="unit" placeholder="50 kg bag" maxLength={40} />
            </label>
          </div>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-ink/80">Description</span>
            <textarea className="field min-h-24" name="description" rows={3} placeholder="What it is for, how to use it" />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-ink/80">Photo (optional)</span>
            <input className="field" name="image" type="file" accept="image/*" onChange={onImage} />
          </label>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Selected product photo" className="h-36 w-full rounded-lg border border-[var(--line)] object-contain" />
          ) : null}
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          {ok ? <p className="text-sm text-[var(--ok)]">{ok}</p> : null}
          <button className="btn btn-primary w-full" disabled={create.isPending} type="submit">
            {create.isPending ? "Saving…" : "List product"}
          </button>
        </form>

        <section className="min-w-0 space-y-3">
          <h2 className="pd-section-title !mb-0">Your catalogue</h2>
          {products.isLoading ? (
            <p className="text-sm text-ink/65">Loading…</p>
          ) : list.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__title">No products yet</p>
              <p>Add your first listing and farmers in your county will find it in the marketplace.</p>
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {list.map((p) => {
                const s = statusOf(p);
                return (
                  <li key={p.id} className="catalogue-item">
                    <span className="thumb !h-20 !w-20">
                      <ProductImage src={mediaUrl(p.image)} alt="" category={p.category} />
                    </span>
                    {editing === p.id ? (
                      <EditForm
                        product={p}
                        busy={update.isPending}
                        onCancel={() => setEditing(null)}
                        onSave={(body) => update.mutate({ id: p.id, body })}
                      />
                    ) : (
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-semibold text-[var(--ink)]">{p.name}</p>
                          <span className={`badge shrink-0 ${s.tone}`}>{s.label}</span>
                        </div>
                        <p className="text-xs capitalize text-ink/70">{p.category}</p>
                        <p className="text-sm font-semibold text-leaf-deep">
                          {formatKsh(p.price) ?? "Price on request"}
                          {p.price && p.unit ? <span className="font-normal text-ink/70"> / {p.unit}</span> : null}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button type="button" className="btn btn-ghost !px-2.5 !py-1 text-xs" onClick={() => setEditing(p.id)}>
                            Edit
                          </button>
                          {!p.is_hidden ? (
                            <button
                              type="button"
                              className="btn btn-ghost !px-2.5 !py-1 text-xs"
                              disabled={update.isPending}
                              onClick={() => update.mutate({ id: p.id, body: { is_available: !p.is_available } })}
                            >
                              {p.is_available ? "Mark out of stock" : "Back in stock"}
                            </button>
                          ) : null}
                          {p.is_available && !p.is_hidden ? (
                            <Link href={`/marketplace/${p.id}`} className="btn btn-ghost !px-2.5 !py-1 text-xs">
                              View
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            className="icon-btn !h-8 !w-8"
                            aria-label={`Remove ${p.name}`}
                            title="Remove"
                            disabled={remove.isPending}
                            onClick={() => {
                              if (window.confirm(`Remove “${p.name}” from your catalogue?`)) remove.mutate(p.id);
                            }}
                          >
                            <TrashIcon size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </PortalShell>
  );
}

function EditForm({
  product,
  busy,
  onSave,
  onCancel,
}: {
  product: AgencyProduct;
  busy: boolean;
  onSave: (body: Partial<AgencyProduct>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price ?? "");
  const [unit, setUnit] = useState(product.unit);
  return (
    <form
      className="min-w-0 flex-1 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name: name.trim(), price: price === "" ? null : String(price), unit: unit.trim() });
      }}
    >
      <label className="sr-only" htmlFor={`edit-name-${product.id}`}>
        Name
      </label>
      <input id={`edit-name-${product.id}`} className="field" value={name} onChange={(e) => setName(e.target.value)} required />
      <div className="grid grid-cols-2 gap-2">
        <label className="sr-only" htmlFor={`edit-price-${product.id}`}>
          Price
        </label>
        <input
          id={`edit-price-${product.id}`}
          className="field"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
        />
        <label className="sr-only" htmlFor={`edit-unit-${product.id}`}>
          Pack size
        </label>
        <input
          id={`edit-unit-${product.id}`}
          className="field"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Pack size"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary !py-1.5 text-xs" disabled={busy}>
          Save
        </button>
        <button type="button" className="btn btn-ghost !py-1.5 text-xs" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
