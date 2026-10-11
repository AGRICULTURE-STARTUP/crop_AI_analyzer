"use client";

import { use } from "react";
import { PortalShell } from "@/components/PortalShell";
import { ProductDetail } from "@/features/marketplace/ProductDetail";

export default function FarmerProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <PortalShell role="farmer" title="Marketplace">
      <ProductDetail id={id} basePath="/farmer/marketplace" />
    </PortalShell>
  );
}
