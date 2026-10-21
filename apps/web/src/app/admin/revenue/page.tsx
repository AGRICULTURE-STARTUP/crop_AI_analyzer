"use client";

import { useQuery } from "@tanstack/react-query";
import { CoinsIcon, RefreshIcon, UsersIcon } from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { fetchOverview, fetchRevenue } from "@/features/admin/api";
import { BarChart } from "@/components/ui/charts";
import { PageHeader, Card, StatCard } from "@/components/ui/Page";
import { formatCompact, formatDateTime, formatKsh, statusTone } from "@/lib/format";

export default function AdminRevenuePage() {
  const revenue = useQuery({ queryKey: ["admin-revenue"], queryFn: fetchRevenue });
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: fetchOverview });
  const data = revenue.data;

  return (
    <PortalShell role="admin" title="Revenue">
      <PageHeader
        title="Revenue"
        lead="Wallet top-ups paid through M-Pesa."
        actions={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              revenue.refetch();
              overview.refetch();
            }}
            disabled={revenue.isFetching}
          >
            <RefreshIcon size={16} className={revenue.isFetching ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      {revenue.isLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : revenue.isError || !data ? (
        <p className="text-sm text-[var(--danger)]">Revenue metrics could not be loaded.</p>
      ) : (
        <div className="space-y-6">
          <div className="stat-cards">
            <StatCard
              label="Revenue · all time"
              value={formatKsh(data.total_revenue) ?? "KSh 0"}
              sub={overview.data ? `${formatKsh(overview.data.kpis.revenue_30d) ?? "KSh 0"} in the last 30 days` : undefined}
              Icon={CoinsIcon}
              tone="amber"
            />
            <StatCard label="Successful payments" value={data.successful_transactions} Icon={CoinsIcon} />
            <StatCard
              label="Pending payments"
              value={data.pending_transactions}
              sub="Waiting for the M-Pesa callback"
              Icon={CoinsIcon}
              tone="sky"
            />
            <StatCard
              label="Registered users"
              value={data.users.total}
              sub={`${data.users.farmers} farmers · ${data.users.lenders} lenders`}
              Icon={UsersIcon}
              tone="plum"
            />
          </div>

          <Card title="Revenue per day (KSh)">
            {overview.data ? (
              <BarChart
                label="Revenue"
                points={overview.data.series.revenue}
                color="#f59e0b"
                format={(n) => formatCompact(n)}
                tipFormat={(n) => formatKsh(n) ?? "KSh 0"}
                height={190}
              />
            ) : (
              <div className="skeleton h-52 rounded-xl" />
            )}
          </Card>

          <Card title="Recent transactions">
            {data.recent_transactions.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No transactions yet.</p>
            ) : (
              <div className="table-wrap table-wrap--stack !border-0">
                <table className="data-table data-table--stack min-w-xl">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Receipt</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_transactions.map((txn) => (
                      <tr key={txn.id}>
                        <td className="cell-title font-medium text-[var(--ink)]">{txn.username}</td>
                        <td data-label="Amount">{formatKsh(txn.amount)}</td>
                        <td data-label="Status">
                          <span className={`badge ${statusTone(txn.status)}`}>{txn.status}</span>
                        </td>
                        <td data-label="Receipt" className="font-mono text-xs">
                          {txn.receipt_number || "—"}
                        </td>
                        <td data-label="Date" className="whitespace-nowrap">
                          {formatDateTime(txn.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </PortalShell>
  );
}
