"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRightIcon,
  BasketIcon,
  CloudIcon,
  CoinsIcon,
  DropIcon,
  ScanIcon,
  ShieldIcon,
  SproutIcon,
  ThermometerIcon,
} from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { Card, PageHeader, StatCard } from "@/components/ui/Page";
import { CropImage } from "@/features/advisor/CropImage";
import { formatConfidence } from "@/features/advisor/format";
import { fetchFarmerOverview } from "@/features/farmer/api";
import { fetchKamisPrices } from "@/features/market/api";
import { bestMarket } from "@/features/market/prices";
import { AppsStrip } from "@/features/modules/AppsStrip";
import { fetchProducts } from "@/features/marketplace/api";
import { ProductCard } from "@/features/marketplace/ProductCard";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatKsh, statusTone, timeAgo } from "@/lib/format";
import type { WeatherResponse } from "@/lib/types";

const SCORE_MIN = 300;
const SCORE_MAX = 850;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function FarmerDashboardPage() {
  const { user } = useAuth();
  const overview = useQuery({ queryKey: ["farmer-overview"], queryFn: fetchFarmerOverview });
  const data = overview.data;
  const county = data?.farm.county || "";
  const mainCrop = data?.farm.crops[0] || "";

  const weather = useQuery({
    queryKey: ["weather", "farmer", county],
    queryFn: () => apiRequest<WeatherResponse>("/api/v1/weather/"),
    enabled: Boolean(county),
    staleTime: 10 * 60 * 1000,
  });
  const prices = useQuery({
    queryKey: ["kamis-prices", mainCrop.toLowerCase()],
    queryFn: () => fetchKamisPrices(mainCrop),
    enabled: Boolean(mainCrop),
    staleTime: 5 * 60 * 1000,
  });
  const nearby = useQuery({
    queryKey: ["store-products", { county, page_size: 5 }],
    queryFn: () => fetchProducts({ county, page: 1, page_size: 5 }, true),
    enabled: Boolean(data),
  });

  const firstName = user?.user.first_name || user?.user.username || "farmer";
  const best = prices.data?.count ? bestMarket(prices.data.results, "seller") : null;
  const w = weather.data?.weather;
  const score = data?.health?.score ?? null;
  const scorePct = score === null ? 0 : ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100;

  return (
    <PortalShell role="farmer" title="Dashboard">
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        lead={
          data
            ? [data.farm.name, data.farm.county, data.farm.size_acres ? `${data.farm.size_acres} acres` : ""]
                .filter(Boolean)
                .join(" · ") || "Here is your farm at a glance."
            : "Here is your farm at a glance."
        }
        actions={
          <>
            <Link href="/farmer/advisor" className="btn btn-ghost">
              <SproutIcon size={16} /> Crop advice
            </Link>
            <Link href="/farmer/scan" className="btn btn-primary">
              <ScanIcon size={16} /> Scan a leaf
            </Link>
          </>
        }
      />

      {overview.isError ? (
        <div className="empty-state">
          <p className="empty-state__title">Your dashboard could not load</p>
          <p>Check your connection and refresh the page.</p>
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
              label="Wallet balance"
              value={formatKsh(data.wallet.balance) ?? "KSh 0"}
              sub={
                data.wallet.free_scans_left > 0
                  ? `${data.wallet.free_scans_left} free scan${data.wallet.free_scans_left === 1 ? "" : "s"} left`
                  : `${formatKsh(data.wallet.scan_fee)} per scan`
              }
              Icon={CoinsIcon}
              tone="amber"
              href="/farmer/profile"
            />
            <StatCard
              label="Farm Health Score"
              value={score ?? "—"}
              sub={data.health ? `${data.health.risk_tier} · ${data.health.opt_in_for_lending ? "shared with lenders" : "private"}` : "Scan to build your score"}
              Icon={ShieldIcon}
              href="/farmer/profile"
            />
            <StatCard
              label="Leaf scans"
              value={data.scans.total}
              sub={`${data.scans.last_7_days} this week`}
              Icon={ScanIcon}
              tone="sky"
              href="/farmer/scan"
            />
            <StatCard
              label="Crop advice"
              value={data.advisor.total}
              sub={data.advisor.last ? `Last: ${data.advisor.last.name}` : "Find what to plant"}
              Icon={SproutIcon}
              tone="plum"
              href="/farmer/advisor"
            />
          </div>

          <AppsStrip />

          <div className="dash-grid dash-grid--2-1">
            <Card
              title="Recent scans"
              action={
                <Link href="/farmer/scan" className="ui-card__link">
                  New scan
                </Link>
              }
            >
              {data.scans.recent.length === 0 ? (
                <div className="empty-state !py-8">
                  <ScanIcon size={26} />
                  <p className="empty-state__title">No scans yet</p>
                  <p>Photograph a sick leaf to get a diagnosis and treatment advice.</p>
                  <Link href="/farmer/scan" className="btn btn-primary mt-2">
                    Scan your first leaf
                  </Link>
                </div>
              ) : (
                <ul className="people">
                  {data.scans.recent.map((s) => (
                    <li key={s.id}>
                      <span className="stat-card__icon stat-card__icon--sky !h-9 !w-9">
                        <ScanIcon size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold capitalize text-[var(--ink)]">
                          {s.crop}
                          {s.result ? <span className="font-normal normal-case text-ink/70"> · {s.result.replaceAll("_", " ")}</span> : null}
                        </span>
                        <span className="block text-xs text-[var(--muted)]">
                          {timeAgo(s.created_at)}
                          {s.confidence != null ? ` · ${Math.round(s.confidence * 100)}% confidence` : ""}
                        </span>
                      </span>
                      <span className={`badge ${statusTone(s.status)}`}>{s.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title={county ? `Weather in ${county}` : "Weather"}>
              {!county ? (
                <p className="text-sm text-ink/70">
                  Add your county on <Link href="/farmer/profile" className="font-semibold text-leaf-deep underline">your profile</Link> to see local weather.
                </p>
              ) : weather.isLoading ? (
                <div className="skeleton h-28 rounded-xl" />
              ) : w ? (
                <div className="weather-tile">
                  <div className="weather-tile__main">
                    <CloudIcon size={30} />
                    <span className="weather-tile__temp">
                      {Math.round(Number(w.temperature_celsius))}°C
                    </span>
                  </div>
                  <ul className="weather-tile__facts">
                    <li>
                      <DropIcon size={15} /> Humidity {w.humidity_percent ?? "—"}%
                    </li>
                    <li>
                      <ThermometerIcon size={15} /> Wind {w.wind_speed_m_s ?? "—"} m/s
                    </li>
                    <li>
                      <CloudIcon size={15} /> Rain (last hour) {w.rainfall_1h_mm ?? 0} mm
                    </li>
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-ink/70">{weather.data?.detail || "Weather is not available right now."}</p>
              )}
            </Card>
          </div>

          <div className="dash-grid dash-grid--2">
            <Card
              title="Latest crop advice"
              action={
                <Link href="/farmer/advisor" className="ui-card__link">
                  Crop advisor
                </Link>
              }
            >
              {data.advisor.last ? (
                <Link href={`/farmer/crops/${data.advisor.last.slug}`} className="advice-tile">
                  <CropImage
                    crop={{ image: data.advisor.last.image ?? null, name: data.advisor.last.name }}
                    sizes="120px"
                    className="advice-tile__img"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-leaf">Best match</span>
                    <span className="block font-display text-xl font-bold text-[var(--ink)]">{data.advisor.last.name}</span>
                    <span className="block text-xs text-[var(--muted)]">
                      {formatConfidence(data.advisor.last.confidence)} model confidence
                      {data.advisor.last.location ? ` · ${data.advisor.last.location}` : ""} · {timeAgo(data.advisor.last.created_at)}
                    </span>
                  </span>
                  <ArrowRightIcon size={16} className="text-[var(--muted)]" />
                </Link>
              ) : (
                <div className="empty-state !py-8">
                  <SproutIcon size={26} />
                  <p className="empty-state__title">Not sure what to plant?</p>
                  <p>Enter your soil test and weather to compare 22 crops.</p>
                  <Link href="/farmer/advisor" className="btn btn-primary mt-2">
                    Get crop advice
                  </Link>
                </div>
              )}
            </Card>

            <Card
              title={mainCrop ? `Market for ${mainCrop}` : "Market prices"}
              action={
                <Link href={`/farmer/market${mainCrop ? `?crop=${encodeURIComponent(mainCrop)}` : ""}`} className="ui-card__link">
                  All prices
                </Link>
              }
            >
              {!mainCrop ? (
                <p className="text-sm text-ink/70">
                  Add the crops you grow on <Link href="/farmer/profile" className="font-semibold text-leaf-deep underline">your profile</Link> to see prices here.
                </p>
              ) : prices.isLoading ? (
                <div className="skeleton h-24 rounded-xl" />
              ) : best ? (
                <div className="price-tile">
                  <span className="stat-card__icon stat-card__icon--amber">
                    <BasketIcon size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Highest wholesale for {best.commodity}
                    </p>
                    <p className="font-display text-2xl font-bold text-[var(--ink)]">
                      KSh {best.price.value.toLocaleString("en-KE")}
                      {best.unit ? <span className="text-base font-semibold text-[var(--muted)]">/{best.unit}</span> : null}
                    </p>
                    <p className="text-sm text-ink/70">
                      {best.row.market}
                      {best.row.county ? `, ${best.row.county}` : ""} · {best.row.date} · compared across {best.compared} markets
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink/70">No recent KAMIS prices for {mainCrop}.</p>
              )}
            </Card>
          </div>

          {score !== null ? (
            <Card title="Farm Health Score">
              <div className="score-meter" role="img" aria-label={`Farm Health Score ${score} out of ${SCORE_MAX}`}>
                <div className="score-meter__track">
                  <span className="score-meter__fill" style={{ width: `${Math.max(2, Math.min(100, scorePct))}%` }} />
                </div>
                <div className="score-meter__scale">
                  <span>{SCORE_MIN}</span>
                  <span>
                    <strong>{score}</strong> · {data.health?.risk_tier}
                  </span>
                  <span>{SCORE_MAX}</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink/70">
                Regular scans and healthy results raise your score. Lenders only see it if you choose to share it on your profile.
              </p>
            </Card>
          ) : null}

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="pd-section-title !mb-0">{county ? `Inputs near ${county}` : "Inputs in the marketplace"}</h2>
              <Link href="/farmer/marketplace" className="ui-card__link">
                Open marketplace
              </Link>
            </div>
            {nearby.data && nearby.data.results.length ? (
              <div className="cq">
                <div className="product-grid">
                  {nearby.data.results.slice(0, 5).map((p) => (
                    <ProductCard key={p.id} product={p} href={`/farmer/marketplace/${p.id}`} />
                  ))}
                </div>
              </div>
            ) : nearby.isLoading ? (
              <div className="skeleton h-40 rounded-xl" />
            ) : (
              <p className="text-sm text-ink/70">No listings in your county yet. Browse the whole marketplace instead.</p>
            )}
          </section>
        </div>
      )}
    </PortalShell>
  );
}
