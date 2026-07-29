"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { apiRequest } from "@/lib/api";

type UsageRow = {
  id: number;
  http_status: number;
  created_at: string;
  phone_queried_hash?: string;
  api_key?: number | null;
};

export default function LenderUsagePage() {
  const usage = useQuery({
    queryKey: ["lender-usage"],
    queryFn: () =>
      apiRequest<UsageRow[] | { results: UsageRow[] }>("/api/v1/lender/usage/"),
  });

  const rows: UsageRow[] = Array.isArray(usage.data)
    ? usage.data
    : usage.data?.results || [];

  return (
    <PortalShell role="lender" title="API usage">
      <div className="space-y-4">
        <h1 className="brand-mark text-3xl text-leaf-deep">Usage logs</h1>
        <p className="text-sm text-ink/65">
          Recent Farm Health Score lookups made with your organization&apos;s
          keys or dashboard tool.
        </p>
        {usage.isLoading ? (
          <p className="text-sm text-ink/55">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink/55">No lookups yet.</p>
        ) : (
          <section className="panel overflow-x-auto rounded-3xl p-6">
            <table className="w-full min-w-xl text-left text-sm">
              <thead className="text-ink/50">
                <tr>
                  <th className="pb-3">When</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Phone hash</th>
                  <th className="pb-3">Key</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-ink/10">
                    <td className="py-3">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="py-3">{row.http_status}</td>
                    <td className="py-3 font-mono text-xs">
                      {(row.phone_queried_hash || "—").slice(0, 12)}…
                    </td>
                    <td className="py-3">{row.api_key ?? "dashboard"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </PortalShell>
  );
}
