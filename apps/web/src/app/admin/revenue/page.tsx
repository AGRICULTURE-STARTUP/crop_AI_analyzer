"use client";

import { PortalShell } from "@/components/PortalShell";

export default function AdminRevenuePage() {
  return (
    <PortalShell role="admin" title="Revenue">
      <div className="panel max-w-2xl space-y-3 rounded-3xl p-6">
        <h1 className="brand-mark text-3xl text-leaf-deep">Revenue</h1>
        <p className="text-sm text-ink/65">
          Staff revenue metrics still live on the Django admin route during
          cutover. Wire `/api/v1/admin/revenue/` next for full SPA parity.
        </p>
      </div>
    </PortalShell>
  );
}
