import type { ReactNode } from "react";
import { PortalShell } from "@/components/PortalShell";
import { ModuleGate } from "@/features/modules/ModuleGate";
import { PosFrame } from "@/features/pos/PosFrame";

/** Shop POS pages share one frame; the sale being rung up is kept while moving between them. */
export default function ShopPosLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell role="agency" title="Shop POS">
      <ModuleGate moduleKey="agrovet-pos">
        <PosFrame>{children}</PosFrame>
      </ModuleGate>
    </PortalShell>
  );
}
