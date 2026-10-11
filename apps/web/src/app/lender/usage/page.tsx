"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { PageHeader } from "@/components/ui/Page";
import { apiRequest } from "@/lib/api";
import { statusTone } from "@/lib/format";

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
        <PageHeader
          title="Usage logs"
          lead="Recent Farm Health Score lookups made with your organisation’s keys or the dashboard tool."
        />
        {usage.isLoading ? (
          <p className="text-sm text-ink/65">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink/65">No lookups yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table min-w-xl">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Status</th>
                  <th>Phone hash</th>
                  <th>Key</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${statusTone(row.http_status)}`}>
                        {row.http_status}
                      </span>
                    </td>
                    <td className="font-mono text-xs">
                      {(row.phone_queried_hash || "—").slice(0, 12)}…
                    </td>
                    <td>{row.api_key ?? "dashboard"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
