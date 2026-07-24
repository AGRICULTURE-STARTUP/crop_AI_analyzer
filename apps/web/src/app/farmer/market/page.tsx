"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { ApiError, getApiBase, getStoredTokens } from "@/lib/api";

type Buyer = {
  id?: number;
  first_name?: string;
  email?: string;
  county?: string;
  phone_number?: string;
  country?: string;
};

export default function FarmerMarketPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const tokens = getStoredTokens();
        const res = await fetch(`${getApiBase()}/market_firms/`, {
          headers: tokens?.access
            ? { Authorization: `Bearer ${tokens.access}` }
            : {},
          credentials: "include",
        });
        if (!res.ok) throw new ApiError(res.status, null, "Could not load buyers");
        const data = await res.json();
        setBuyers(data.buyer_list || []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load market");
      }
    })();
  }, []);

  return (
    <PortalShell role="farmer" title="Market">
      <div className="space-y-4">
        <h1 className="brand-mark text-3xl text-leaf-deep">Produce buyers</h1>
        <p className="text-sm text-ink/60">
          Browse registered buyers in your network.
        </p>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {buyers.map((b) => (
            <article key={b.id} className="panel rounded-2xl p-4">
              <h2 className="font-semibold">{b.first_name || "Buyer"}</h2>
              <p className="text-sm text-ink/60">{b.county}</p>
              <p className="mt-2 text-sm">{b.phone_number}</p>
              <p className="text-sm text-ink/55">{b.email}</p>
            </article>
          ))}
        </div>
      </div>
    </PortalShell>
  );
}
