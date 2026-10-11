"use client";

import { PortalShell } from "@/components/PortalShell";
import { AppStore } from "@/features/modules/AppStore";

export default function AgencyAppStorePage() {
  return (
    <PortalShell role="agency" title="App store">
      <AppStore lead="Add tools for running your shop. Installed apps appear in your menu under My apps, and you can remove them any time." />
    </PortalShell>
  );
}
