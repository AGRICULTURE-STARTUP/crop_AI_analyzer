"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  BankIcon,
  CoinsIcon,
  RefreshIcon,
  ScanIcon,
  SproutIcon,
  StoreIcon,
  UsersIcon,
} from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { fetchOverview } from "@/features/admin/api";
import { AreaChart, BarChart, BarList, Donut } from "@/components/ui/charts";
import { PageHeader, Card, StatCard } from "@/components/ui/Page";
import { formatCompact, formatKsh, initialsOf, statusTone, timeAgo } from "@/lib/format";

const ROLE_COLORS: Record<string, string> = {
  farmer: "#2e7d32",
  buyer: "#f59e0b",
  agency: "#1e88e5",
  lender: "#8e24aa",
  admin: "#546e7a",
};
const ROLE_LABELS: Record<string, string> = {
  farmer: "Farmers",
  buyer: "Buyers",
  agency: "Input agencies",
  lender: "Lenders",
  admin: "Admins",
};

export default function AdminDashboardPage() {
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: fetchOverview });
  const data = overview.data;

  return (
    <PortalShell role="admin" title="Dashboard">
      <PageHeader
        title="Dashboard"
        lead={
          data ? (
            <>Last 30 days · updated {timeAgo(data.generated_at)}</>
          ) : (
            "Last 30 days"
          )
        }
        actions={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => overview.refetch()}
            disabled={overview.isFetching}
          >
            <RefreshIcon size={16} className={overview.isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      {overview.isError ? (
        <div className="empty-state">
          <p className="empty-state__title">The dashboard could not load</p>
          <p>Check that the API is running, then refresh.</p>
        </div>
      ) : !data ? (
        <div className="stat-cards" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card skeleton h-36" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="stat-cards">
            <StatCard
              label="Users"
              value={data.kpis.users_total.toLocaleString("en-KE")}
              sub={`+${data.kpis.users_new_7d} in the last 7 days`}
              Icon={UsersIcon}
              href="/admin/users"
            />
            <StatCard
              label="Revenue · 30 days"
              value={formatKsh(data.kpis.revenue_30d) ?? "KSh 0"}
              sub={`${formatKsh(data.kpis.revenue_total) ?? "KSh 0"} all time · ${data.kpis.payments_pending} pending`}
              Icon={CoinsIcon}
              tone="amber"
              href="/admin/revenue"
            />
            <StatCard
              label="Crop scans · 7 days"
              value={data.kpis.scans_7d.toLocaleString("en-KE")}
              sub={`${data.kpis.scans_total.toLocaleString("en-KE")} all time`}
              Icon={ScanIcon}
              tone="sky"
            />
            <StatCard
              label="Crop advisor · 7 days"
              value={data.kpis.recommendations_7d.toLocaleString("en-KE")}
              sub={`${data.kpis.recommendations_total.toLocaleString("en-KE")} runs all time`}
              Icon={SproutIcon}
              tone="plum"
              href="/admin/recommendations"
            />
          </div>

          <div className="dash-grid dash-grid--2-1">
            <Card title="Activity">
              <AreaChart
                series={[
                  { label: "Sign-ups", color: "#2e7d32", points: data.series.signups },
                  { label: "Scans", color: "#f59e0b", points: data.series.scans },
                  { label: "Advisor runs", color: "#1e88e5", points: data.series.recommendations },
                ]}
                height={250}
              />
            </Card>
            <Card title="Users by role">
              <Donut
                centerValue={formatCompact(data.kpis.users_total)}
                centerLabel="users"
                parts={data.breakdown.roles.map((r) => ({
                  label: ROLE_LABELS[r.role] || r.role,
                  value: r.count,
                  color: ROLE_COLORS[r.role] || "#999",
                }))}
              />
            </Card>
          </div>

          <div className="dash-grid dash-grid--2-1">
            <Card
              title="Revenue (KSh)"
              action={
                <Link href="/admin/revenue" className="ui-card__link">
                  Payments
                </Link>
              }
            >
              <BarChart
                label="Revenue"
                points={data.series.revenue}
                color="#f59e0b"
                format={(n) => formatCompact(n)}
                tipFormat={(n) => formatKsh(n) ?? "KSh 0"}
                height={215}
              />
            </Card>
            <Card title="Needs attention">
              <ul className="attention">
                <li>
                  <span className="attention__icon"><BankIcon size={18} /></span>
                  <span className="flex-1">
                    <strong>{data.kpis.lenders_pending}</strong> lender
                    {data.kpis.lenders_pending === 1 ? "" : "s"} awaiting approval
                  </span>
                  <Link href="/admin/lenders" className="ui-card__link">
                    Review
                  </Link>
                </li>
                <li>
                  <span className="attention__icon"><CoinsIcon size={18} /></span>
                  <span className="flex-1">
                    <strong>{data.kpis.payments_pending}</strong> M-Pesa payment
                    {data.kpis.payments_pending === 1 ? "" : "s"} still pending
                  </span>
                  <Link href="/admin/revenue" className="ui-card__link">
                    Open
                  </Link>
                </li>
                <li>
                  <span className="attention__icon"><StoreIcon size={18} /></span>
                  <span className="flex-1">
                    <strong>{data.kpis.products_hidden}</strong> hidden listing
                    {data.kpis.products_hidden === 1 ? "" : "s"} · {data.kpis.products_live} live
                  </span>
                  <Link href="/admin/marketplace" className="ui-card__link">
                    Manage
                  </Link>
                </li>
                <li>
                  <span className="attention__icon"><CoinsIcon size={18} /></span>
                  <span className="flex-1">
                    <strong>{formatKsh(data.kpis.wallet_balances) ?? "KSh 0"}</strong> held in farmer wallets
                  </span>
                </li>
              </ul>
            </Card>
          </div>

          <div className="dash-grid dash-grid--3">
            <Card title="Top recommended crops">
              <BarList
                rows={data.breakdown.top_crops.slice(0, 5).map((c) => ({ key: c.slug, label: c.name, value: c.count }))}
                empty="No advisor runs yet."
              />
            </Card>
            <Card title="Scan outcomes">
              <BarList
                color="#f59e0b"
                rows={data.breakdown.scan_status.map((s) => ({
                  key: s.status,
                  label: s.status.charAt(0).toUpperCase() + s.status.slice(1),
                  value: s.count,
                }))}
                empty="No scans yet."
              />
            </Card>
            <Card title="Listings by category">
              <BarList
                color="#1e88e5"
                rows={data.breakdown.product_categories.map((c) => ({
                  key: c.category,
                  label: c.label,
                  value: c.count,
                }))}
                empty="No listings yet."
              />
            </Card>
          </div>

          <div className="dash-grid dash-grid--2">
            <Card
              title="Newest users"
              action={
                <Link href="/admin/users" className="ui-card__link">
                  All users
                </Link>
              }
            >
              <ul className="people">
                {data.recent.users.map((u) => (
                  <li key={u.id}>
                    <span className="avatar avatar--light">{initialsOf(u.name || u.username)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                        {u.name || u.username}
                      </span>
                      <span className="block truncate text-xs text-[var(--muted)]">
                        {u.detail || u.email || u.username}
                      </span>
                    </span>
                    <span className="badge">{u.role}</span>
                    <span className="hidden w-24 text-right text-xs text-[var(--muted)] sm:block">
                      {timeAgo(u.date_joined)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card
              title="Recent payments"
              action={
                <Link href="/admin/revenue" className="ui-card__link">
                  Revenue
                </Link>
              }
            >
              {data.recent.transactions.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No payments yet.</p>
              ) : (
                <ul className="people">
                  {data.recent.transactions.map((t) => (
                    <li key={t.id}>
                      <span className="avatar avatar--light">{initialsOf(t.username)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                          {formatKsh(t.amount)}
                        </span>
                        <span className="block truncate text-xs text-[var(--muted)]">
                          {t.username} · {timeAgo(t.created_at)}
                        </span>
                      </span>
                      <span className={`badge ${statusTone(t.status)}`}>{t.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
