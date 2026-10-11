"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { DropIcon, SearchIcon, SproutIcon, ThermometerIcon } from "@/components/Icons";
import { fetchCatalog } from "./api";
import { CropImage } from "./CropImage";
import { LangToggle, categoryName, cropName, useAdvisorLang } from "./i18n";
import type { CropCategory } from "./types";

const CATEGORIES: CropCategory[] = ["cereal", "pulse", "fruit", "cash"];
const fmt = (n: number) => String(Math.round(n));

/** All 22 crops the advisor knows, with the conditions each grew in. */
export function CropLibrary({ basePath, advisorHref }: { basePath: string; advisorHref: string }) {
  const { lang, setLang, t } = useAdvisorLang();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["advisor-catalog"],
    queryFn: fetchCatalog,
    staleTime: Infinity,
  });
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<CropCategory | "">("");

  const needle = q.trim().toLowerCase();
  const crops = (data?.crops ?? []).filter(
    (c) =>
      (!category || c.category === category) &&
      (!needle || `${c.name} ${c.name_sw}`.toLowerCase().includes(needle))
  );

  return (
    <div className="space-y-6">
      <header className="library-head">
        <div>
          <h1 className="library-head__title">{t("library")}</h1>
          <p className="library-head__lead">{t("libraryLead")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LangToggle lang={lang} setLang={setLang} />
          <Link href={advisorHref} className="btn btn-primary btn-pill">
            <SproutIcon size={16} /> {t("checkField")}
          </Link>
        </div>
      </header>

      <div className="library-tools">
        <label className="library-search">
          <SearchIcon size={18} />
          <span className="sr-only">{t("search")}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} />
        </label>
        <div className="store-cats !mt-0" role="group" aria-label="Crop groups">
          <button
            type="button"
            className={`store-cat ${!category ? "is-active" : ""}`}
            onClick={() => setCategory("")}
            aria-pressed={!category}
          >
            {t("all")}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`store-cat ${category === c ? "is-active" : ""}`}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
            >
              {categoryName(c, lang)}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <div className="empty-state">
          <p className="empty-state__title">{t("failed")}</p>
        </div>
      ) : isLoading ? (
        <ul className="crop-grid" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="skeleton aspect-[4/5] rounded-2xl" />
          ))}
        </ul>
      ) : (
        <ul className="crop-grid">
          {crops.map((c) => {
            const other = lang === "sw" ? c.name : c.name_sw !== c.name ? c.name_sw : "";
            return (
              <li key={c.slug}>
                <Link href={`${basePath}/${c.slug}`} className="crop-card">
                  <CropImage crop={c} sizes="(max-width: 640px) 50vw, 280px" className="crop-card__img" />
                  <div className="crop-card__body">
                    <p className="crop-card__cat">{categoryName(c.category, lang)}</p>
                    <p className="crop-card__name">{cropName(c, lang)}</p>
                    {other ? <p className="crop-card__other">{other}</p> : null}
                    <div className="crop-card__facts">
                      <span>
                        <ThermometerIcon size={14} /> {fmt(c.stats.temperature.p10)}–{fmt(c.stats.temperature.p90)}°C
                      </span>
                      <span>
                        <DropIcon size={14} /> {fmt(c.stats.rainfall.p10)}–{fmt(c.stats.rainfall.p90)} mm
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
