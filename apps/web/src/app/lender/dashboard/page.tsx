"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { apiRequest } from "@/lib/api";
import type { LendingPartner } from "@/lib/types";

export default function LenderDashboardPage() {
  const me = useQuery({
    queryKey: ["lender-me"],
    queryFn: () => apiRequest<LendingPartner>("/api/v1/lender/me/"),
  });

  const status = me.data?.verification_status || "pending";

  return (
    <PortalShell role="lender" title="Lending partner">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel rounded-3xl p-6">
          <h1 className="brand-mark text-3xl text-leaf-deep">
            {me.data?.organization_name || "Organization"}
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            {me.data?.organization_type?.toUpperCase()} · {me.data?.county}
          </p>
          <div className="mt-6 inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold capitalize text-leaf-deep">
            Status: {status}
          </div>
          {status === "pending" ? (
            <p className="mt-4 text-sm text-ink/65">
              An AgriScan admin must approve your organization before API keys
              can be created or score lookups run.
            </p>
          ) : null}
        </section>
        <section className="panel rounded-3xl p-6 text-sm text-ink/70">
          <h2 className="font-semibold text-leaf-deep">Quick links</h2>
          <ul className="mt-3 space-y-2">
            <li>Create production / staging keys</li>
            <li>Test phone score lookup</li>
            <li>Copy curl examples from Docs</li>
          </ul>
        </section>
      </div>
    </PortalShell>
  );
}
