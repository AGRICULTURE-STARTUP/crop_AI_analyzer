"use client";

import { PortalShell } from "@/components/PortalShell";
import { CatalogueManager } from "@/features/catalogue/CatalogueManager";
import { PosHighlight } from "@/features/pos/PosHighlight";

export default function AgencyDashboardPage() {
  return (
    <PortalShell role="agency" title="My products">
      <CatalogueManager banner={<PosHighlight />} />
    </PortalShell>
  );
}
