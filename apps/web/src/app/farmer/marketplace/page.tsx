"use client";

import { Suspense, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { MarketplaceBrowser } from "@/features/marketplace/MarketplaceBrowser";
import { SellerDirectory } from "@/features/marketplace/SellerDirectory";
import { NearbyAgrovetsMap } from "@/features/marketplace/NearbyAgrovetsMap";

export default function FarmerMarketplacePage() {
  const [view, setView] = useState<"products" | "sellers" | "map">("products");
  return (
    <PortalShell role="farmer" title="Marketplace">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="segmented" role="tablist" aria-label="Marketplace view">
          {(
            [
              ["products", "Products"],
              ["sellers", "Sellers near me"],
              ["map", "Map"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              className={view === value ? "is-active" : ""}
              onClick={() => setView(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {view === "products" ? (
        <Suspense fallback={<p className="text-sm text-ink/65">Loading marketplace…</p>}>
          <MarketplaceBrowser basePath="/farmer/marketplace" compact />
        </Suspense>
      ) : view === "sellers" ? (
        <SellerDirectory basePath="/farmer/marketplace" />
      ) : (
        <NearbyAgrovetsMap />
      )}
    </PortalShell>
  );
}
