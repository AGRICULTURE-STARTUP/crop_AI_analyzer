import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MarketplaceBrowser } from "@/features/marketplace/MarketplaceBrowser";

export const metadata: Metadata = {
  title: "Marketplace — seed, fertiliser and crop protection",
  description:
    "Browse farm inputs from registered agrovets across Kenya. Compare prices by county and contact the seller directly.",
  alternates: { canonical: "/marketplace" },
};

export default function MarketplacePage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-paper">
      <SiteHeader />
      <main className="mx-auto max-w-[80rem] px-4 pb-20 pt-6 sm:px-6">
        <Suspense fallback={<p className="py-20 text-center text-leaf">Loading marketplace…</p>}>
          <MarketplaceBrowser basePath="/marketplace" />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
