"use client";

import { use } from "react";
import { PortalShell } from "@/components/PortalShell";
import { ModuleGate } from "@/features/modules/ModuleGate";
import { CropProfile } from "@/features/advisor/CropProfile";

export default function FarmerCropPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <PortalShell role="farmer" title="Crop library">
      <ModuleGate moduleKey="crop-advisor">
        <CropProfile slug={slug} basePath="/farmer/crops" advisorHref="/farmer/advisor" />
      </ModuleGate>
    </PortalShell>
  );
}
