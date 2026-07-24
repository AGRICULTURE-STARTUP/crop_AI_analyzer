"use client";

import { PortalShell } from "@/components/PortalShell";
import { useAuth } from "@/lib/auth";

export default function AgencyDashboardPage() {
  const { user } = useAuth();
  const profile = (user?.profile || {}) as Record<string, string>;

  return (
    <PortalShell role="agency" title="Agency storefront">
      <div className="panel max-w-2xl space-y-4 rounded-3xl p-6">
        <h1 className="brand-mark text-3xl text-leaf-deep">
          {profile.agency_name || "Your agency"}
        </h1>
        <p className="text-sm text-ink/60">
          Type: {profile.agency_type || "—"} · {profile.county || "County TBD"}
        </p>
        <p className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-ink/70">
          Product CRUD API lands next. Your agency account is ready — use this
          dashboard to manage catalogue listings once `/api/v1/inputs/products/`
          is wired.
        </p>
      </div>
    </PortalShell>
  );
}
