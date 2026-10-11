"use client";

import { PortalShell } from "@/components/PortalShell";
import { AppStore } from "@/features/modules/AppStore";

export default function FarmerAppStorePage() {
  return (
    <PortalShell role="farmer" title="App store">
      <AppStore lead="Add the tools you need. Installed apps appear in your menu under My apps, and you can remove them any time." />
    </PortalShell>
  );
}
