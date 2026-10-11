"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BasketIcon, ChevronRightIcon, SproutIcon, StoreIcon } from "@/components/Icons";
import { ApiError } from "@/lib/api";
import { fetchCatalog, fetchCrop } from "./api";
import { CropImage } from "./CropImage";
import { LangToggle, categoryName, cropName, useAdvisorLang } from "./i18n";
import { RangeBar } from "./RangeBar";
import type { FeatureKey } from "./types";

const ORDER: FeatureKey[] = ["N", "P", "K", "ph", "temperature", "humidity", "rainfall"];
const UNITS: Record<FeatureKey, string> = {
  N: "",
  P: "",
  K: "",
  ph: "",
  temperature: " °C",
  humidity: " %",
  rainfall: " mm",
};
const fmt = (n: number) => String(Math.round(n * 10) / 10);

/** One crop: photo, names and the conditions it grew in across 100 records. */
export function CropProfile({
  slug,
  basePath,
  advisorHref,
}: {
  slug: string;
  basePath: string;
  advisorHref: string;
}) {
  const portal = basePath.startsWith("/farmer");
  const { lang, setLang, t } = useAdvisorLang();
  const { data, isLoading, error } = useQuery({
    queryKey: ["advisor-crop", slug],
    queryFn: () => fetchCrop(slug),
  });
  const catalog = useQuery({ queryKey: ["advisor-catalog"], queryFn: fetchCatalog, staleTime: Infinity });

  if (error) {
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <div className="empty-state">
        <p className="empty-state__title">{missing ? "We do not have that crop yet" : t("failed")}</p>
        <Link href={basePath} className="btn btn-primary mt-2">
          {t("backLibrary")}
        </Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="crop-profile" aria-busy>
        <div className="skeleton aspect-[4/3] rounded-2xl" />
        <div className="space-y-3">
          <div className="skeleton h-4 w-1/4 rounded" />
          <div className="skeleton h-10 w-2/3 rounded" />
          <div className="skeleton h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const crop = data.crop;
  const name = cropName(crop, lang);
  const other = lang === "sw" ? crop.name : crop.name_sw !== crop.name ? crop.name_sw : "";
  const searchWord = crop.name.split(" ")[0];
  const siblings = (catalog.data?.crops ?? []).filter(
    (c) => c.category === crop.category && c.slug !== crop.slug
  );

  return (
    <article className="space-y-10">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href={basePath}>{t("library")}</Link>
        <ChevronRightIcon size={14} />
        <span aria-current="page">{name}</span>
      </nav>

      <div className="crop-profile">
        <CropImage crop={crop} sizes="(max-width: 1024px) 100vw, 560px" className="crop-profile__img" priority />
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{categoryName(crop.category, lang)}</span>
            <LangToggle lang={lang} setLang={setLang} />
          </div>
          <div>
            <h1 className="pd-title">{name}</h1>
            {other ? <p className="mt-1 text-[var(--muted)]">{other}</p> : null}
          </div>

          <div>
            <p className="pd-subhead">{t("conditions")}</p>
            <p className="text-sm text-[var(--muted)]">{t("conditionsLead")}</p>
          </div>
          <ul className="fit-list">
            {ORDER.map((key) => {
              const s = crop.stats[key];
              return (
                <li key={key} className="fit-row">
                  <div className="fit-row__head">
                    <span className="fit-row__label">{t(key)}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {fmt(s.p10)}–{fmt(s.p90)}
                      {UNITS[key]}
                    </span>
                  </div>
                  <RangeBar
                    scale={data.model.feature_range[key]}
                    band={[s.p10, s.p90]}
                    mean={s.mean}
                    label={`${t(key)}: ${fmt(s.p10)} to ${fmt(s.p90)}${UNITS[key]}, average ${fmt(s.mean)}`}
                  />
                </li>
              );
            })}
          </ul>

          <div className="advisor-actions">
            <Link href={advisorHref} className="btn btn-primary btn-pill">
              <SproutIcon size={16} /> {t("checkField")}
            </Link>
            {portal ? (
              <>
                <Link href={`/farmer/market?crop=${encodeURIComponent(searchWord)}`} className="btn btn-ghost btn-pill">
                  <BasketIcon size={16} /> {t("prices")}
                </Link>
                <Link
                  href={`/farmer/marketplace?category=seed&q=${encodeURIComponent(searchWord)}`}
                  className="btn btn-ghost btn-pill"
                >
                  <StoreIcon size={16} /> {t("shopSeed")}
                </Link>
              </>
            ) : (
              <Link href={`/marketplace?category=seed&q=${encodeURIComponent(searchWord)}`} className="btn btn-ghost btn-pill">
                <StoreIcon size={16} /> {t("shopSeed")}
              </Link>
            )}
          </div>
        </div>
      </div>

      {siblings.length ? (
        <section>
          <h2 className="pd-section-title">{categoryName(crop.category, lang)}</h2>
          <ul className="crop-grid crop-grid--small">
            {siblings.map((c) => (
              <li key={c.slug}>
                <Link href={`${basePath}/${c.slug}`} className="crop-card">
                  <CropImage crop={c} sizes="200px" className="crop-card__img" />
                  <div className="crop-card__body">
                    <p className="crop-card__name">{cropName(c, lang)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
