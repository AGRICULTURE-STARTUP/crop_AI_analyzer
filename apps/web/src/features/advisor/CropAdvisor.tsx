"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  ArrowRightIcon,
  BasketIcon,
  BookIcon,
  ChatIcon,
  CloudIcon,
  FlaskIcon,
  StoreIcon,
  TrashIcon,
} from "@/components/Icons";
import { openAgriBot } from "@/lib/agribot";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import {
  deleteHistory,
  fetchAdvisorWeather,
  fetchCatalog,
  fetchHistory,
  recommend,
} from "./api";
import { CropImage } from "./CropImage";
import { formatConfidence } from "./format";
import { LangToggle, categoryName, cropName, useAdvisorLang, type Lang } from "./i18n";
import { RangeBar } from "./RangeBar";
import type { CropResult, FeatureKey, RecommendResponse, SoilClimate } from "./types";

const FIELDS: Record<FeatureKey, { unit: string; step: string; min: number; max: number }> = {
  N: { unit: "", step: "1", min: 0, max: 300 },
  P: { unit: "", step: "1", min: 0, max: 300 },
  K: { unit: "", step: "1", min: 0, max: 400 },
  ph: { unit: "", step: "0.1", min: 0, max: 14 },
  temperature: { unit: "°C", step: "0.1", min: -10, max: 60 },
  humidity: { unit: "%", step: "1", min: 0, max: 100 },
  rainfall: { unit: "mm", step: "1", min: 0, max: 5000 },
};
const SOIL: FeatureKey[] = ["N", "P", "K", "ph"];
const WEATHER: FeatureKey[] = ["temperature", "humidity", "rainfall"];
const ORDER: FeatureKey[] = [...SOIL, ...WEATHER];

// Typical values from the training records, so people can see the tool work.
const EXAMPLES = [
  { id: "exPaddy", values: { N: 80, P: 48, K: 40, ph: 6.4, temperature: 23.7, humidity: 82, rainfall: 236 } },
  { id: "exMaize", values: { N: 78, P: 48, K: 20, ph: 6.3, temperature: 22.4, humidity: 65, rainfall: 85 } },
  { id: "exCoffee", values: { N: 101, P: 29, K: 30, ph: 6.8, temperature: 25.5, humidity: 59, rainfall: 158 } },
  { id: "exBanana", values: { N: 100, P: 82, K: 50, ph: 6.0, temperature: 27.4, humidity: 80, rainfall: 105 } },
] as const;

type Draft = Record<FeatureKey, string>;
const EMPTY: Draft = { N: "", P: "", K: "", ph: "", temperature: "", humidity: "", rainfall: "" };

/** Only the keys that are present, so merging never blanks the other fields. */
function toPartialDraft(values: Partial<SoilClimate>): Partial<Draft> {
  const out: Partial<Draft> = {};
  for (const key of ORDER) {
    const v = values[key];
    if (v !== undefined) out[key] = String(Math.round(v * 10) / 10);
  }
  return out;
}

function toDraft(values: Partial<SoilClimate>): Draft {
  return { ...EMPTY, ...toPartialDraft(values) };
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/**
 * The Panda Smart crop recommender as one Ukulima Bora screen: soil + weather form,
 * results with "how your field compares", and (signed in) weather pre-fill and history.
 */
export function CropAdvisor({ mode }: { mode: "public" | "portal" }) {
  const portal = mode === "portal";
  const cropsBase = portal ? "/farmer/crops" : "/crops";
  const { user, loading } = useAuth();
  const signedIn = !!user;
  const { lang, setLang, t } = useAdvisorLang();
  const qc = useQueryClient();
  const resultsRef = useRef<HTMLElement>(null);

  const profileCounty = typeof user?.profile?.county === "string" ? user.profile.county : "";
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [place, setPlace] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [weatherPlace, setWeatherPlace] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState("");
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const location = place ?? profileCounty;

  const catalog = useQuery({ queryKey: ["advisor-catalog"], queryFn: fetchCatalog, staleTime: Infinity });
  const history = useQuery({
    queryKey: ["advisor-history"],
    queryFn: fetchHistory,
    enabled: portal && signedIn,
  });

  const run = useMutation({
    mutationFn: (values: SoilClimate) => recommend({ ...values, location: location.trim() }, signedIn),
    onSuccess: (data) => {
      setResult(data);
      if (data.saved) qc.invalidateQueries({ queryKey: ["advisor-history"] });
      window.requestAnimationFrame(() => {
        if (window.innerWidth < 1024) {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 400 && err.body && typeof err.body === "object") {
        const [field, messages] = Object.entries(err.body as Record<string, string[]>)[0] || [];
        const label = field && field in FIELDS ? t(field as FeatureKey) : field;
        setFormError(field ? `${label}: ${Array.isArray(messages) ? messages[0] : messages}` : t("failed"));
      } else {
        setFormError(t("failed"));
      }
    },
  });

  const weather = useMutation({
    mutationFn: (where: string) => fetchAdvisorWeather(where),
    onSuccess: (data) => {
      if (!data.weather) {
        setWeatherPlace(null);
        setWeatherError(data.detail || t("failed"));
        return;
      }
      const w = data.weather;
      setDraft((d) => ({
        ...d,
        ...toPartialDraft({ temperature: w.temperature, humidity: w.humidity, rainfall: w.rainfall }),
      }));
      setWeatherError("");
      setWeatherPlace(w.location);
    },
    onError: () => setWeatherError(t("failed")),
  });

  const remove = useMutation({
    mutationFn: deleteHistory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["advisor-history"] }),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const values = {} as SoilClimate;
    for (const key of ORDER) {
      const raw = draft[key].trim();
      const n = Number(raw);
      if (raw === "" || !Number.isFinite(n)) {
        setFormError(t("required"));
        return;
      }
      values[key] = n;
    }
    setFormError("");
    run.mutate(values);
  }

  const range = catalog.data?.model.feature_range;

  function renderField(key: FeatureKey) {
    const f = FIELDS[key];
    return (
      <label key={key} className="advisor-field">
        <span className="advisor-field__label">{t(key)}</span>
        <span className="advisor-field__control">
          <input
            type="number"
            inputMode="decimal"
            step={f.step}
            min={f.min}
            max={f.max}
            value={draft[key]}
            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
            required
          />
          {f.unit ? <span className="advisor-field__unit">{f.unit}</span> : null}
        </span>
        {range ? (
          <span className="advisor-field__hint">
            {t("typical")} {fmt(range[key][0])}–{fmt(range[key][1])}
          </span>
        ) : null}
      </label>
    );
  }

  const historyItems = history.data?.results ?? [];

  return (
    <div className="advisor">
      <header className={`advisor-head ${portal ? "" : "advisor-head--hero"}`}>
        <div className="advisor-head__copy">
          <h1 className="advisor-head__title">{t("title")}</h1>
          <p className="advisor-head__lead">{t("lead")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <LangToggle lang={lang} setLang={setLang} />
            <Link href={cropsBase} className="advisor-head__link">
              <BookIcon size={16} /> {t("library")}
            </Link>
          </div>
        </div>
        {!portal ? (
          <div className="advisor-collage" aria-hidden>
            {["/crops/maize.jpg", "/crops/coffee.jpg", "/crops/banana.jpg"].map((src, i) => (
              <div key={src} className={`advisor-collage__tile advisor-collage__tile--${i + 1}`}>
                <CropImage crop={{ image: src, name: "" }} sizes="200px" />
              </div>
            ))}
          </div>
        ) : null}
      </header>

      <div className="advisor-grid">
        <form className="advisor-form" onSubmit={onSubmit} noValidate>
          <fieldset className="advisor-group">
            <legend className="advisor-group__head">
              <span className="advisor-group__icon"><FlaskIcon size={18} /></span>
              <span>
                <span className="advisor-group__title">{t("soil")}</span>
                <span className="advisor-group__hint">{t("soilHint")}</span>
              </span>
            </legend>
            <div className="advisor-fields">{SOIL.map(renderField)}</div>
          </fieldset>

          <fieldset className="advisor-group">
            <legend className="advisor-group__head">
              <span className="advisor-group__icon"><CloudIcon size={18} /></span>
              <span>
                <span className="advisor-group__title">{t("weather")}</span>
                <span className="advisor-group__hint">{t("weatherHint")}</span>
              </span>
            </legend>
            {!loading && signedIn ? (
              <div className="advisor-weather">
                <label className="sr-only" htmlFor="advisor-place">
                  {t("location")}
                </label>
                <input
                  id="advisor-place"
                  className="field"
                  value={location}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder={t("location")}
                />
                <button
                  type="button"
                  className="btn btn-secondary shrink-0"
                  disabled={weather.isPending || !location.trim()}
                  onClick={() => weather.mutate(location)}
                >
                  <CloudIcon size={16} />
                  {weather.isPending ? t("loadingWeather") : t("useWeather")}
                </button>
              </div>
            ) : !loading ? (
              <p className="advisor-note">
                {t("weatherSignIn")}{" "}
                <Link href={`/login?next=${encodeURIComponent(portal ? "/farmer/advisor" : "/crop-advisor")}`}>
                  Log in
                </Link>
              </p>
            ) : null}
            {weatherPlace ? <p className="advisor-ok">{t("weatherFilled", { place: weatherPlace })}</p> : null}
            {weatherError ? <p className="advisor-error">{weatherError}</p> : null}
            <div className="advisor-fields advisor-fields--3">{WEATHER.map(renderField)}</div>
          </fieldset>

          <div className="advisor-examples">
            <span>{t("examples")}:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                type="button"
                className="advisor-example"
                onClick={() => {
                  setDraft(toDraft(ex.values));
                  setFormError("");
                  setWeatherPlace(null);
                }}
              >
                {t(ex.id)}
              </button>
            ))}
          </div>

          {formError ? (
            <p className="advisor-error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary btn-pill flex-1 !py-3 text-base" disabled={run.isPending}>
              {run.isPending ? t("analysing") : t("submit")}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-pill"
              onClick={() => {
                setDraft(EMPTY);
                setResult(null);
                setFormError("");
                setWeatherPlace(null);
              }}
            >
              {t("clear")}
            </button>
          </div>
        </form>

        <section ref={resultsRef} className="advisor-results" aria-live="polite" aria-busy={run.isPending}>
          {run.isPending ? (
            <div className="space-y-3" aria-hidden>
              <div className="skeleton aspect-[16/9] w-full rounded-2xl" />
              <div className="skeleton h-5 w-2/3 rounded" />
              <div className="skeleton h-24 w-full rounded-xl" />
            </div>
          ) : result ? (
            <Results
              result={result}
              lang={lang}
              t={t}
              portal={portal}
              cropsBase={cropsBase}
              place={location}
            />
          ) : (
            <div className="advisor-empty">
              <div className="advisor-empty__thumbs" aria-hidden>
                {["/crops/rice.jpg", "/crops/maize.jpg", "/crops/mango.jpg"].map((src) => (
                  <CropImage key={src} crop={{ image: src, name: "" }} sizes="64px" className="advisor-empty__thumb" />
                ))}
              </div>
              <p className="advisor-empty__title">{t("emptyTitle")}</p>
              <p>{t("emptyBody")}</p>
            </div>
          )}
        </section>
      </div>

      {portal && signedIn ? (
        <section className="advisor-history">
          <h2 className="advisor-history__title">{t("history")}</h2>
          {historyItems.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t("historyEmpty")}</p>
          ) : (
            <ul className="history-list">
              {historyItems.map((item) => (
                <li key={item.id} className="history-row">
                  <CropImage crop={item.top} sizes="48px" className="history-row__img" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                      {cropName(item.top, lang)}{" "}
                      <span className="font-normal text-[var(--muted)]">· {formatConfidence(item.top.confidence)}</span>
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {formatDate(item.created_at)}
                      {item.location ? ` · ${item.location}` : ""} · N {fmt(item.inputs.N)} · P {fmt(item.inputs.P)} · K{" "}
                      {fmt(item.inputs.K)} · pH {fmt(item.inputs.ph)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost !px-3 !py-1.5 text-xs"
                    onClick={() => {
                      setDraft(toDraft(item.inputs));
                      setResult(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    {t("load")}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t("delete")}
                    title={t("delete")}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(item.id)}
                  >
                    <TrashIcon size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function Results({
  result,
  lang,
  t,
  portal,
  cropsBase,
  place,
}: {
  result: RecommendResponse;
  lang: Lang;
  t: ReturnType<typeof useAdvisorLang>["t"];
  portal: boolean;
  cropsBase: string;
  place: string;
}) {
  const top = result.top;
  const topName = cropName(top, lang);
  const otherName = lang === "sw" ? top.name : top.name_sw !== top.name ? top.name_sw : "";
  const inputs = result.inputs;
  const searchWord = top.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="result-top">
        <CropImage crop={top} sizes="(max-width: 1024px) 100vw, 560px" className="result-top__img" priority />
        <div className="result-top__overlay">
          <span className="result-top__badge">{t("bestMatch")}</span>
          <h2 className="result-top__name">{topName}</h2>
          <p className="result-top__meta">
            {otherName ? `${otherName} · ` : ""}
            {categoryName(top.category, lang)}
          </p>
        </div>
      </div>

      <div className="result-stats">
        <div>
          <p className="result-stats__label">{t("confidence")}</p>
          <p className="result-stats__value">{formatConfidence(top.confidence)}</p>
        </div>
        <div>
          <p className="result-stats__label">{t("conditionsInRange")}</p>
          <p className="result-stats__value">{top.in_range}/7</p>
        </div>
        {result.saved ? <span className="badge badge-ok badge--plain self-center">{t("saved")}</span> : null}
      </div>

      <div className="advisor-actions">
        {portal ? (
          <>
            <button
              type="button"
              className="btn btn-primary btn-pill"
              onClick={() =>
                openAgriBot(
                  t("askBotMessage", {
                    crop: topName,
                    place: place || "Kenya",
                    N: fmt(inputs.N),
                    P: fmt(inputs.P),
                    K: fmt(inputs.K),
                    ph: fmt(inputs.ph),
                  })
                )
              }
            >
              <ChatIcon size={16} /> {t("askBot")}
            </button>
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
          <Link href="/signup?role=farmer" className="btn btn-primary btn-pill">
            {t("saveCta")} <ArrowRightIcon size={16} />
          </Link>
        )}
        <Link href={`${cropsBase}/${top.slug}`} className="btn btn-ghost btn-pill">
          <BookIcon size={16} /> {t("cropProfile")}
        </Link>
      </div>

      {result.results.length > 1 ? (
        <div>
          <p className="result-subhead">{t("nextClosest")}</p>
          <ul className="result-alts">
            {result.results.slice(1).map((c: CropResult) => (
              <li key={c.slug}>
                <Link href={`${cropsBase}/${c.slug}`} className="result-alt">
                  <CropImage crop={c} sizes="56px" className="result-alt__img" />
                  <span className="min-w-0 flex-1">
                    <span className="result-alt__name">{cropName(c, lang)}</span>
                    <span className="result-alt__meta">{t("inRange", { n: c.in_range })}</span>
                  </span>
                  <span className="result-alt__bar" aria-hidden>
                    <span style={{ width: `${(c.in_range / 7) * 100}%` }} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="result-subhead">{t("compare", { crop: topName })}</p>
        <ul className="fit-list">
          {result.fit.map((item) => {
            const unit = FIELDS[item.feature].unit;
            const statusLabel = item.status === "ok" ? t("ok") : item.status === "low" ? t("low") : t("high");
            return (
              <li key={item.feature} className="fit-row">
                <div className="fit-row__head">
                  <span className="fit-row__label">{t(item.feature)}</span>
                  <span className={`status-chip is-${item.status}`}>{statusLabel}</span>
                </div>
                <RangeBar
                  scale={result.model.feature_range[item.feature]}
                  band={[item.ideal_min, item.ideal_max]}
                  value={item.value}
                  status={item.status}
                  label={`${t(item.feature)}: ${fmt(item.value)}${unit}. ${t("typicalRange")} ${fmt(item.ideal_min)}–${fmt(item.ideal_max)}${unit}`}
                />
                <div className="fit-row__nums">
                  <span>
                    {t("yours")}: <strong>{fmt(item.value)}{unit ? ` ${unit}` : ""}</strong>
                  </span>
                  <span>
                    {t("typicalRange")}: {fmt(item.ideal_min)}–{fmt(item.ideal_max)}
                    {unit ? ` ${unit}` : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {result.warnings.length ? (
        <div className="advisor-warn">
          <p>{t("outOfRange")}</p>
          <ul>
            {result.warnings.map((w) => (
              <li key={w.feature}>
                {t(w.feature)}: {fmt(w.value)} ({fmt(w.min)}–{fmt(w.max)})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="advisor-model">
        {t("modelLine", {
          algorithm: result.model.algorithm,
          accuracy: (result.model.accuracy * 100).toFixed(1),
          rows: result.model.dataset_rows.toLocaleString("en-KE"),
        })}
        <br />
        {t("disclaimer")}
      </p>
    </div>
  );
}
