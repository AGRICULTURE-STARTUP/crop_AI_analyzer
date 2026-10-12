"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  BankIcon,
  ChartIcon,
  DocIcon,
  KeyIcon,
  SearchIcon,
  ShieldIcon,
} from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { Card, PageHeader, StatCard } from "@/components/ui/Page";
import { apiRequest } from "@/lib/api";
import { statusTone, timeAgo } from "@/lib/format";
import type { LendingAPIKeyMeta, LendingPartner } from "@/lib/types";

type UsageRow = { id: number; http_status: number; created_at: string; api_key?: number | null };

const asList = <T,>(data: T[] | { results: T[] } | undefined): T[] =>
  Array.isArray(data) ? data : data?.results || [];

const QUICK_LINKS = [
  { href: "/lender/score-lookup", label: "Look up a farmer's score", Icon: SearchIcon },
  { href: "/lender/api-keys", label: "Create or rotate API keys", Icon: KeyIcon },
  { href: "/lender/docs", label: "Copy curl examples from the docs", Icon: DocIcon },
];

export default function LenderDashboardPage() {
  const me = useQuery({
    queryKey: ["lender-me"],
    queryFn: () => apiRequest<LendingPartner>("/api/v1/lender/me/"),
  });
  const keys = useQuery({
    queryKey: ["lender-keys"],
    queryFn: () => apiRequest<LendingAPIKeyMeta[] | { results: LendingAPIKeyMeta[] }>("/api/v1/lender/api-keys/"),
  });
  const usage = useQuery({
    queryKey: ["lender-usage"],
    queryFn: () => apiRequest<UsageRow[] | { results: UsageRow[] }>("/api/v1/lender/usage/"),
  });

  const status = me.data?.verification_status || "pending";
  const keyList = asList(keys.data);
  const rows = asList(usage.data);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const lastWeek = rows.filter((r) => new Date(r.created_at).getTime() >= weekAgo);
  const ok = rows.filter((r) => r.http_status < 300).length;
  const successRate = rows.length ? Math.round((ok / rows.length) * 100) : null;

  return (
    <PortalShell role="lender" title="Overview">
      <PageHeader
        title={me.data?.organization_name || "Your organisation"}
        lead={[me.data?.organization_type?.toUpperCase(), me.data?.county].filter(Boolean).join(" · ") || "Lending partner"}
        actions={
          <Link href="/lender/score-lookup" className="btn btn-primary">
            <SearchIcon size={16} /> Score lookup
          </Link>
        }
      />

      {status === "pending" ? (
        <div className="notice notice--warn mb-6">
          <ShieldIcon size={18} />
          <p>
            Your organisation is waiting for approval. An Ukulima Bora admin must approve you before you can create API keys
            or look up scores.
          </p>
        </div>
      ) : status === "suspended" ? (
        <div className="notice notice--danger mb-6">
          <ShieldIcon size={18} />
          <p>Your access is suspended and your API keys are switched off. Contact Ukulima Bora support.</p>
        </div>
      ) : null}

      <div className="stat-cards mb-6">
        <StatCard
          label="Verification"
          value={<span className="capitalize">{status}</span>}
          sub={status === "approved" ? "You can use the score API" : "Score API locked"}
          Icon={BankIcon}
          tone={status === "approved" ? "leaf" : "amber"}
        />
        <StatCard
          label="Active API keys"
          value={keyList.filter((k) => k.is_active).length}
          sub={`${keyList.length} created in total`}
          Icon={KeyIcon}
          tone="sky"
          href="/lender/api-keys"
        />
        <StatCard
          label="Lookups · 7 days"
          value={lastWeek.length}
          sub={`${rows.length} recorded in total`}
          Icon={ChartIcon}
          tone="plum"
          href="/lender/usage"
        />
        <StatCard
          label="Success rate"
          value={successRate === null ? "—" : `${successRate}%`}
          sub="Lookups that returned a score"
          Icon={ShieldIcon}
          tone="amber"
        />
      </div>

      <div className="dash-grid dash-grid--2-1">
        <Card
          title="Recent lookups"
          action={
            <Link href="/lender/usage" className="ui-card__link">
              All usage
            </Link>
          }
        >
          {rows.length === 0 ? (
            <p className="text-sm text-ink/70">No lookups yet. Try one from Score lookup or with your API key.</p>
          ) : (
            <ul className="people">
              {rows.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <span className="stat-card__icon stat-card__icon--sky !h-9 !w-9">
                    <SearchIcon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--ink)]">
                      {r.api_key ? `API key #${r.api_key}` : "Dashboard lookup"}
                    </span>
                    <span className="block text-xs text-[var(--muted)]">{timeAgo(r.created_at)}</span>
                  </span>
                  <span className={`badge ${statusTone(r.http_status)}`}>{r.http_status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Quick links">
          <ul className="people">
            {QUICK_LINKS.map((item) => (
              <li key={item.href}>
                <span className="stat-card__icon stat-card__icon--leaf !h-9 !w-9">
                  <item.Icon size={16} />
                </span>
                <Link href={item.href} className="flex-1 text-sm font-medium text-[var(--ink)] hover:text-leaf-deep">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PortalShell>
  );
}
