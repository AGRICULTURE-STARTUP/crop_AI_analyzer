"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PortalShell } from "@/components/PortalShell";
import { PriceFinder } from "@/features/market/PriceFinder";

export default function FarmerMarketPage() {
  return (
    <PortalShell role="farmer" title="Market prices">
      <Suspense fallback={<p className="text-sm text-ink/65">Loading…</p>}>
        <MarketContent />
      </Suspense>
    </PortalShell>
  );
}

function MarketContent() {
  const params = useSearchParams();

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="page-header !mb-0">
          <div>
            <h1 className="page-header__title">Best markets for your crop</h1>
            <p className="page-header__lead">
              Recent KAMIS wholesale and retail prices across markets and counties, so you can see where your harvest
              sells best.
            </p>
          </div>
        </div>
        <PriceFinder audience="seller" initialCrop={params.get("crop") || ""} />
      </section>
    </div>
  );
}
