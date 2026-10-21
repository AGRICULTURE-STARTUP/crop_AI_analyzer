"use client";

import { PortalShell } from "@/components/PortalShell";
import { FarmerProfileView } from "@/features/profile/FarmerProfileView";

export default function FarmerProfilePage() {
  return (
    <PortalShell role="farmer" title="Your profile">
      <FarmerProfileView />
    </PortalShell>
  );
}
