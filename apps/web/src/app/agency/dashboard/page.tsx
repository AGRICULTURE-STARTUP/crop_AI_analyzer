"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { ApiError, apiRequest, getApiBase } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AgencyProduct } from "@/lib/types";

const CATEGORIES = [
  { value: "fertiliser", label: "Fertiliser" },
  { value: "seed", label: "Seed" },
  { value: "pesticide", label: "Pesticide" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${getApiBase()}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function AgencyDashboardPage() {
  const { user } = useAuth();
  const profile = (user?.profile || {}) as Record<string, string>;
  const [products, setProducts] = useState<AgencyProduct[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<{ products: AgencyProduct[] }>(
        "/api/v1/inputs/my-products/"
      );
      setProducts(data.products || []);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load products"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setError("");
    setOk("");
    try {
      await apiRequest("/api/v1/inputs/my-products/", {
        method: "POST",
        formData: fd,
      });
      form.reset();
      setOk("Product listed.");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save product"
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Remove this product from your catalogue?")) return;
    setError("");
    try {
      await apiRequest(`/api/v1/inputs/my-products/${id}/`, {
        method: "DELETE",
      });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not delete product"
      );
    }
  }

  return (
    <PortalShell role="agency" title="Agency storefront">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <section className="panel space-y-2 rounded-3xl p-6">
          <h1 className="brand-mark text-3xl text-leaf-deep">
            {profile.agency_name || "Your agency"}
          </h1>
          <p className="text-sm text-ink/60">
            {profile.agency_type || "—"} · {profile.county || "County TBD"} ·{" "}
            {profile.phone || "No phone"}
          </p>
          <p className="text-sm text-ink/65">
            List products you sell. Farmers find them by county on the Inputs
            page — no external web search.
          </p>
        </section>

        <form
          onSubmit={onCreate}
          className="panel space-y-4 rounded-3xl p-6"
          encType="multipart/form-data"
        >
          <h2 className="text-lg font-semibold text-leaf-deep">Add a product</h2>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-ink/80">Name</span>
            <input className="field" name="name" required maxLength={150} />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-ink/80">Category</span>
            <select className="field" name="category" defaultValue="other">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-ink/80">Description</span>
            <textarea className="field min-h-24" name="description" rows={3} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-ink/80">Price (KES)</span>
              <input
                className="field"
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional"
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-ink/80">Unit</span>
              <input
                className="field"
                name="unit"
                placeholder="e.g. 50kg bag"
                maxLength={40}
              />
            </label>
          </div>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-ink/80">Photo (optional)</span>
            <input className="field" name="image" type="file" accept="image/*" />
          </label>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          {ok ? <p className="text-sm text-[var(--ok)]">{ok}</p> : null}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Saving…" : "List product"}
          </button>
        </form>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-leaf-deep">
            Your catalogue
          </h2>
          {loading ? (
            <p className="text-sm text-ink/55">Loading…</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-ink/55">
              No products yet. Add your first listing above.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((p) => {
                const img = mediaUrl(p.image);
                return (
                  <article key={p.id} className="panel rounded-2xl p-4">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="mb-3 h-36 w-full rounded-xl object-cover"
                      />
                    ) : null}
                    <h3 className="font-semibold text-leaf-deep">{p.name}</h3>
                    <p className="text-xs uppercase tracking-wide text-ink/45">
                      {p.category}
                      {p.is_available ? "" : " · unavailable"}
                    </p>
                    {p.description ? (
                      <p className="mt-2 line-clamp-3 text-sm text-ink/65">
                        {p.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm">
                      {p.price != null
                        ? `KES ${p.price}${p.unit ? ` / ${p.unit}` : ""}`
                        : p.unit || "Price on request"}
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary mt-3 !py-1.5 text-sm"
                      onClick={() => void onDelete(p.id)}
                    >
                      Remove
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
