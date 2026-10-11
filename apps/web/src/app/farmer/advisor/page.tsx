"use client";

import { PortalShell } from "@/components/PortalShell";
import { ModuleGate } from "@/features/modules/ModuleGate";
import { CropAdvisor } from "@/features/advisor/CropAdvisor";

export default function FarmerAdvisorPage() {
  return (
    <PortalShell role="farmer" title="Crop advisor">
      <ModuleGate moduleKey="crop-advisor">
        <CropAdvisor mode="portal" />
      </ModuleGate>
    </PortalShell>
  );
}
