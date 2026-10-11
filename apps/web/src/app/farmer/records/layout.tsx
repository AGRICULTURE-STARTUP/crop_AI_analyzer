import type { ReactNode } from "react";
import { PortalShell } from "@/components/PortalShell";
import { ModuleGate } from "@/features/modules/ModuleGate";
import { RecordsFrame } from "@/features/records/RecordsFrame";

/** Every Farm records page shares one frame, so the season and quick-add form persist between them. */
export default function FarmRecordsLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell role="farmer" title="Farm records">
      <ModuleGate moduleKey="farm-records">
        <RecordsFrame>{children}</RecordsFrame>
      </ModuleGate>
    </PortalShell>
  );
}
