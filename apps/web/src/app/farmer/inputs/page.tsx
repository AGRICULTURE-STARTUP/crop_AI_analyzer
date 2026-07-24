"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { ApiError, apiRequest, getApiBase } from "@/lib/api";
import type { AgencyProductPublic, InputAgency } from "@/lib/types";

type Tab = "products" | "agencies";

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "fertiliser", label: "Fertiliser" },
  { value: "seed", label: "Seed" },
  { value: "pesticide", label: "Pesticide" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

const AGENCY_TYPES = [
  { value: "", label: "All types" },
  { value: "agrovet", label: "Agrovet" },
  { value: "fertiliser", label: "Fertiliser" },
  { value: "pesticide", label: "Pesticide" },
  { value: "seed", label: "Seed" },
  { value: "other", label: "Other" },
];

function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${getApiBase()}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function FarmerInputsPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [county, setCounty] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [agencyType, setAgencyType] = useState("");
  const [products, setProducts] = useState<AgencyProductPublic[]>([]);
  const [agencies, setAgencies] = useState<InputAgency[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (county.trim()) params.set("county", county.trim());
      if (q.trim()) params.set("q", q.trim());

      if (tab === "products") {
        if (category) params.set("category", category);
        const qs = params.toString();
        const data = await apiRequest<{ products: AgencyProductPublic[] }>(
          `/api/v1/inputs/products/${qs ? `?${qs}` : ""}`
        );
        setProducts(data.products || []);
      } else {
        if (agencyType) params.set("type", agencyType);
        const qs = params.toString();
        const data = await apiRequest<{ agencies: InputAgency[] }>(
          `/api/v1/inputs/agencies/${qs ? `?${qs}` : ""}`
        );
        setAgencies(data.agencies || []);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed");
      setProducts([]);
      setAgencies([]);
    } finally {
      setBusy(false);
    }
  }, [tab, county, q, category, agencyType]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  return (
    <PortalShell role="farmer" title="Inputs">
      <div className="space-y-6">
        <div className="panel space-y-4 rounded-3xl p-6">
          <h1 className="brand-mark text-3xl text-leaf-deep">Find inputs</h1>
          <p className="text-sm text-ink/60">
            Browse products and agrovets registered on AgriScan. Filter by
            county to see stores near you.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={
                tab === "products" ? "btn btn-primary" : "btn btn-secondary"
              }
              onClick={() => setTab("products")}
            >
              Products
            </button>
            <button
              type="button"
              className={
                tab === "agencies" ? "btn btn-primary" : "btn btn-secondary"
              }
              onClick={() => setTab("agencies")}
            >
              Input agencies
            </button>
          </div>

          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <label className="block min-w-[10rem] flex-1 space-y-1.5 text-sm">
              <span className="font-medium text-ink/80">County</span>
              <input
                className="field"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="e.g. Nakuru"
              />
            </label>
            <label className="block min-w-[10rem] flex-1 space-y-1.5 text-sm">
              <span className="font-medium text-ink/80">Search</span>
              <input
                className="field"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  tab === "products" ? "Product or store name" : "Agency name"
                }
              />
            </label>
            {tab === "products" ? (
              <label className="block min-w-[10rem] space-y-1.5 text-sm">
                <span className="font-medium text-ink/80">Category</span>
                <select
                  className="field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value || "all"} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block min-w-[10rem] space-y-1.5 text-sm">
                <span className="font-medium text-ink/80">Type</span>
                <select
                  className="field"
                  value={agencyType}
                  onChange={(e) => setAgencyType(e.target.value)}
                >
                  {AGENCY_TYPES.map((c) => (
                    <option key={c.value || "all"} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? "Loading…" : "Apply"}
            </button>
          </form>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        </div>

        {tab === "products" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {products.length === 0 && !busy ? (
              <p className="text-sm text-ink/55 sm:col-span-2">
                No products match. Try another county or ask agencies to list
                stock.
              </p>
            ) : null}
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
                  <h2 className="font-semibold text-leaf-deep">{p.name}</h2>
                  <p className="text-xs uppercase tracking-wide text-ink/45">
                    {p.category}
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
                  <div className="mt-3 border-t border-[var(--line)] pt-3 text-sm">
                    <p className="font-medium">{p.agency_name}</p>
                    <p className="text-ink/60">
                      {p.county || "County TBD"}
                      {p.agency_phone ? ` · ${p.agency_phone}` : ""}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {agencies.length === 0 && !busy ? (
              <p className="text-sm text-ink/55 sm:col-span-2">
                No registered input agencies match. Try another county.
              </p>
            ) : null}
            {agencies.map((a) => (
              <article key={a.id} className="panel rounded-2xl p-4">
                <h2 className="font-semibold text-leaf-deep">
                  {a.agency_name}
                </h2>
                <p className="mt-1 text-sm capitalize text-ink/60">
                  {a.agency_type.replace("_", " ")}
                </p>
                <p className="mt-2 text-sm">{a.county || "County TBD"}</p>
                <p className="text-sm text-ink/70">
                  {a.phone || "No phone listed"}
                </p>
                <p className="mt-2 text-xs text-ink/45">
                  {a.product_count} product
                  {a.product_count === 1 ? "" : "s"} listed
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
