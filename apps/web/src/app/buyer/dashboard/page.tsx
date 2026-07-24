"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { ApiError, getApiBase, getStoredTokens } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Farmer = {
  id?: number;
  user__username?: string;
  county?: string;
  products?: string;
  phone_number?: string;
};

export default function BuyerDashboardPage() {
  const { user } = useAuth();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const tokens = getStoredTokens();
        const res = await fetch(`${getApiBase()}/farmer_data/`, {
          headers: tokens?.access
            ? { Authorization: `Bearer ${tokens.access}` }
            : {},
          credentials: "include",
        });
        if (!res.ok) throw new ApiError(res.status, null, "Could not load farmers");
        const data = await res.json();
        setFarmers(data.farmer_list || data || []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load");
      }
    })();
  }, []);

  return (
    <PortalShell role="buyer" title="Buyer dashboard">
      <div className="space-y-4">
        <h1 className="brand-mark text-3xl text-leaf-deep">
          Hello {user?.user.first_name || "buyer"}
        </h1>
        <p className="text-sm text-ink/60">Farmers available for market connections.</p>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {farmers.map((f, i) => (
            <article key={f.id || i} className="panel rounded-2xl p-4">
              <h2 className="font-semibold">{f.user__username || `Farmer #${f.id}`}</h2>
              <p className="text-sm text-ink/60">{f.county}</p>
              <p className="mt-2 text-sm">{f.products}</p>
              <p className="text-sm text-ink/55">{f.phone_number}</p>
            </article>
          ))}
        </div>
      </div>
    </PortalShell>
  );
}
