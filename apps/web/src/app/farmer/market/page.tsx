"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PortalShell } from "@/components/PortalShell";
import { fetchBuyers } from "@/features/market/api";
import { ContactCard } from "@/features/market/ContactCard";
import { PriceFinder } from "@/features/market/PriceFinder";
import { ApiError } from "@/lib/api";

export default function FarmerMarketPage() {
  return (
    <PortalShell role="farmer" title="Prices & buyers">
      <Suspense fallback={<p className="text-sm text-ink/65">Loading…</p>}>
        <MarketContent />
      </Suspense>
    </PortalShell>
  );
}

function MarketContent() {
  const params = useSearchParams();
  const buyers = useQuery({ queryKey: ["market-buyers"], queryFn: fetchBuyers });
  const list = buyers.data ?? [];

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

      <section className="space-y-4">
        <div>
          <h2 className="pd-section-title !mb-1">Produce buyers</h2>
          <p className="text-sm text-ink/70">Buyers registered on AgriScan. Call or WhatsApp them when your harvest is ready.</p>
        </div>
        {buyers.isError ? (
          <p className="text-sm text-[var(--danger)]">
            {buyers.error instanceof ApiError ? buyers.error.message : "Buyers could not load."}
          </p>
        ) : buyers.isLoading ? (
          <p className="text-sm text-ink/65">Loading buyers…</p>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">No registered buyers yet</p>
            <p>Check back soon as more buyers join.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((b, i) => {
              const name = b.name || b.first_name || "Buyer";
              return (
                <ContactCard
                  key={b.id ?? i}
                  name={name}
                  place={b.location || [b.county, b.country].filter(Boolean).join(", ")}
                  photo={b.photo}
                  phone={b.phone_number || (b.contact && /\d{9,}/.test(b.contact) ? b.contact : undefined)}
                  email={b.email}
                  badge={b.verified !== false ? b.verification_badge || "Verified" : undefined}
                  whatsappText={`Hello ${name}, I am a farmer on AgriScan with produce to sell.`}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
