"use client";

import { PortalShell } from "@/components/PortalShell";
import { ModuleGate } from "@/features/modules/ModuleGate";
import { CropLibrary } from "@/features/advisor/CropLibrary";

export default function FarmerCropsPage() {
  return (
    <PortalShell role="farmer" title="Crop library">
      <ModuleGate moduleKey="crop-advisor">
        <CropLibrary basePath="/farmer/crops" advisorHref="/farmer/advisor" />
      </ModuleGate>
    </PortalShell>
  );
}
