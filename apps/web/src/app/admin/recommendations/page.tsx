"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChartIcon, SproutIcon, UsersIcon } from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { fetchOverview, fetchRecommendationStats } from "@/features/admin/api";
import { AreaChart, BarList } from "@/components/ui/charts";
import { PageHeader, Card, StatCard } from "@/components/ui/Page";
import { formatConfidence } from "@/features/advisor/format";
import { timeAgo } from "@/lib/format";

export default function AdminRecommendationsPage() {
  const stats = useQuery({ queryKey: ["admin-recommendations"], queryFn: fetchRecommendationStats });
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: fetchOverview });
  const data = stats.data;

  return (
    <PortalShell role="admin" title="Crop advisor">
      <PageHeader
        title="Crop advisor"
        lead="How farmers use the crop recommender (the Panda Smart model). Only runs by signed-in users are stored."
        actions={
          <Link href="/crop-advisor" className="btn btn-ghost">
            Open the advisor
          </Link>
        }
      />

      {stats.isError ? (
        <div className="empty-state">
          <p className="empty-state__title">Advisor statistics could not load</p>
        </div>
      ) : !data ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="stat-cards">
            <StatCard label="Runs · all time" value={data.total.toLocaleString("en-KE")} Icon={SproutIcon} />
            <StatCard label="Runs · 7 days" value={data.last_7_days.toLocaleString("en-KE")} Icon={ChartIcon} tone="sky" />
            <StatCard label="Farmers using it" value={data.users.toLocaleString("en-KE")} Icon={UsersIcon} tone="amber" />
            <StatCard
              label="Model accuracy"
              value={`${(data.model.accuracy * 100).toFixed(1)}%`}
              sub={`${data.model.algorithm} · ${data.model.dataset_rows.toLocaleString("en-KE")} records · ${data.model.crops} crops`}
              Icon={ChartIcon}
              tone="plum"
            />
          </div>

          <div className="dash-grid dash-grid--2-1">
            <Card title="Runs per day">
              {overview.data ? (
                <AreaChart
                  series={[{ label: "Advisor runs", color: "#1e88e5", points: overview.data.series.recommendations }]}
                />
              ) : (
                <div className="skeleton h-52 rounded-xl" />
              )}
            </Card>
            <Card title="Most recommended">
              <BarList
                rows={data.top_crops.map((c) => ({ key: c.slug, label: c.name, value: c.count }))}
                empty="No runs yet."
              />
            </Card>
          </div>

          <Card title="Recent runs">
            {data.recent.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No runs yet.</p>
            ) : (
              <div className="table-wrap !border-0">
                <table className="data-table min-w-[36rem]">
                  <thead>
                    <tr>
                      <th>Farmer</th>
                      <th>Best match</th>
                      <th>Confidence</th>
                      <th>Location</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium text-[var(--ink)]">{r.username}</td>
                        <td>{r.top_crop}</td>
                        <td>{formatConfidence(r.confidence)}</td>
                        <td>{r.location || "—"}</td>
                        <td className="whitespace-nowrap">{timeAgo(r.created_at)}</td>
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
