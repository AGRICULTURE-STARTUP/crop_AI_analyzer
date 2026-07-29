"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { apiRequest } from "@/lib/api";

type RevenueData = {
  total_revenue: string;
  successful_transactions: number;
  pending_transactions: number;
  users: { total: number; farmers: number; lenders: number };
  recent_transactions: {
    id: number;
    username: string;
    amount: string;
    status: string;
    receipt_number: string | null;
    created_at: string;
  }[];
};

export default function AdminRevenuePage() {
  const revenue = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: () => apiRequest<RevenueData>("/api/v1/admin/revenue/"),
  });

  return (
    <PortalShell role="admin" title="Revenue">
      <div className="space-y-6">
        <h1 className="brand-mark text-3xl text-leaf-deep">Revenue</h1>
        {revenue.isLoading ? (
          <p className="text-sm text-ink/55">Loading…</p>
        ) : revenue.isError || !revenue.data ? (
          <p className="text-sm text-[var(--danger)]">
            Revenue metrics could not be loaded.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Revenue", `KES ${revenue.data.total_revenue}`],
                ["Successful payments", revenue.data.successful_transactions],
                ["Pending payments", revenue.data.pending_transactions],
                ["Registered users", revenue.data.users.total],
              ].map(([label, value]) => (
                <section key={label} className="panel rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wide text-ink/50">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-leaf-deep">
                    {value}
                  </p>
                </section>
              ))}
            </div>
            <section className="panel overflow-x-auto rounded-3xl p-6">
              <h2 className="mb-4 text-lg font-semibold text-leaf-deep">
                Recent transactions
              </h2>
              {revenue.data.recent_transactions.length === 0 ? (
                <p className="text-sm text-ink/55">No transactions yet.</p>
              ) : (
                <table className="w-full min-w-xl text-left text-sm">
                  <thead className="text-ink/50">
                    <tr>
                      <th className="pb-3">User</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Receipt</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenue.data.recent_transactions.map((txn) => (
                      <tr key={txn.id} className="border-t border-ink/10">
                        <td className="py-3">{txn.username}</td>
                        <td className="py-3">KES {txn.amount}</td>
                        <td className="py-3">{txn.status}</td>
                        <td className="py-3">{txn.receipt_number || "—"}</td>
                        <td className="py-3">
                          {new Date(txn.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </PortalShell>
  );
}
