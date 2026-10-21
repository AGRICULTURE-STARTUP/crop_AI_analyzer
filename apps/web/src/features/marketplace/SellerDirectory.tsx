"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CallIcon, PinIcon, SearchIcon } from "@/components/Icons";
import { apiRequest } from "@/lib/api";
import { initialsOf, intlPhone } from "@/lib/format";
import type { InputAgency } from "@/lib/types";

const AGENCY_TYPES = [
  { value: "", label: "All types" },
  { value: "agrovet", label: "Agrovet" },
  { value: "fertiliser", label: "Fertiliser company" },
  { value: "pesticide", label: "Pesticide company" },
  { value: "seed", label: "Seed company" },
  { value: "other", label: "Other" },
];

/** Registered input agencies near the farmer (farmer-only API). */
export function SellerDirectory({ basePath }: { basePath: string }) {
  const [county, setCounty] = useState("");
  const [type, setType] = useState("");
  const [applied, setApplied] = useState({ county: "", type: "" });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["agencies", applied],
    queryFn: () => {
      const params = new URLSearchParams();
      if (applied.county) params.set("county", applied.county);
      if (applied.type) params.set("type", applied.type);
      const qs = params.toString();
      return apiRequest<{ agencies: InputAgency[] }>(`/api/v1/inputs/agencies/${qs ? `?${qs}` : ""}`);
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setApplied({ county: county.trim(), type });
  }

  const agencies = data?.agencies ?? [];

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="form-field flex-1">
          <span className="font-medium text-ink/80">County</span>
          <input className="field" value={county} onChange={(e) => setCounty(e.target.value)} placeholder="e.g. Nakuru" />
        </label>
        <label className="form-field sm:w-56">
          <span className="font-medium text-ink/80">Type</span>
          <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
            {AGENCY_TYPES.map((t) => (
              <option key={t.value || "all"} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary">
          <SearchIcon size={16} /> Find sellers
        </button>
      </form>

      {isError ? (
        <p className="text-sm text-[var(--danger)]">Sellers could not load. Try again.</p>
      ) : isLoading ? (
        <p className="text-sm text-ink/65">Loading sellers…</p>
      ) : agencies.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state__title">No registered sellers match</p>
          <p>Try a neighbouring county or clear the type filter.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agencies.map((a) => {
            const phone = intlPhone(a.phone);
            return (
              <li key={a.id} className="panel flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="avatar avatar--light">{initialsOf(a.agency_name)}</span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--ink)]">{a.agency_name}</p>
                    <p className="text-xs capitalize text-[var(--muted)]">{a.agency_type.replace("_", " ")}</p>
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-ink/70">
                  <PinIcon size={14} /> {a.county || "County not set"}
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link href={`${basePath}?seller=${a.id}`} className="btn btn-secondary btn-sm">
                    {a.product_count} product{a.product_count === 1 ? "" : "s"}
                  </Link>
                  {phone ? (
                    <a href={`tel:+${phone}`} className="btn btn-ghost btn-sm">
                      <CallIcon size={14} /> {a.phone}
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
