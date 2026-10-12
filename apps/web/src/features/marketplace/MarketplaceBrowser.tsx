"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { CloseIcon, FilterIcon, SearchIcon } from "@/components/Icons";
import { Pagination } from "@/components/ui/Pagination";
import { useAuth } from "@/lib/auth";
import { fetchProducts } from "./api";
import { ProductCard } from "./ProductCard";
import type { CategoryFacet, StoreQuery, StoreSort } from "./types";

const SORTS: { value: StoreSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name A–Z" },
];

const CATEGORY_NAMES: CategoryFacet[] = [
  { value: "fertiliser", label: "Fertiliser", count: 0 },
  { value: "seed", label: "Seed", count: 0 },
  { value: "pesticide", label: "Pesticide", count: 0 },
  { value: "equipment", label: "Equipment", count: 0 },
  { value: "other", label: "Other", count: 0 },
];

type Params = Partial<Record<keyof StoreQuery, string | number | undefined>>;

/**
 * Storefront listing shared by the public marketplace and the farmer portal.
 * Filters live in the URL so results can be shared and the back button works.
 */
export function MarketplaceBrowser({
  basePath,
  compact = false,
}: {
  /** Where product pages live, e.g. "/marketplace" or "/farmer/marketplace". */
  basePath: string;
  /** Portal pages use a smaller header than the public storefront. */
  compact?: boolean;
}) {
  const { user, loading } = useAuth();
  const signedIn = !!user;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [showFilters, setShowFilters] = useState(false);

  const query: StoreQuery = {
    q: params.get("q") || undefined,
    category: params.get("category") || undefined,
    county: params.get("county") || undefined,
    seller: params.get("seller") || undefined,
    min_price: params.get("min_price") || undefined,
    max_price: params.get("max_price") || undefined,
    sort: (params.get("sort") as StoreSort) || "newest",
    page: Number(params.get("page") || 1),
  };

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["store-products", query, signedIn],
    queryFn: () => fetchProducts(query, signedIn),
    placeholderData: keepPreviousData,
    enabled: !loading,
  });

  function update(next: Params) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "") sp.delete(key);
      else sp.set(key, String(value));
    }
    if (!("page" in next)) sp.delete("page");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function goToPage(page: number) {
    update({ page: page > 1 ? page : undefined });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const categories = data?.facets.categories ?? CATEGORY_NAMES;
  const total = categories.reduce((sum, c) => sum + c.count, 0);
  const hasFilters = Boolean(
    query.q || query.category || query.county || query.seller || query.min_price || query.max_price
  );
  const first = data && data.count ? (data.page - 1) * data.page_size + 1 : 0;
  const last = data ? Math.min(data.count, data.page * data.page_size) : 0;
  const sellerName = query.seller ? data?.results[0]?.seller.name : undefined;

  return (
    <div className="store">
      <section className={`store-hero ${compact ? "store-hero--compact" : ""}`}>
        <div className="store-hero__copy">
          <p className="store-hero__eyebrow">Farm inputs marketplace</p>
          <h1 className="store-hero__title">
            Seed, fertiliser and crop protection from registered agrovets
          </h1>
          {!compact ? (
            <p className="store-hero__lead">
              Compare prices across counties and talk to the seller directly.
              Every listing comes from an input agency registered on Ukulima Bora.
            </p>
          ) : null}
        </div>
        <SearchBar
          key={`${query.q || ""}|${query.category || ""}`}
          initialQ={query.q || ""}
          initialCategory={query.category || ""}
          categories={categories}
          onSearch={(q, category) => update({ q, category })}
        />
      </section>

      <nav className="store-cats" aria-label="Product categories">
        <button
          type="button"
          className={`store-cat ${!query.category ? "is-active" : ""}`}
          onClick={() => update({ category: undefined })}
        >
          All products {data ? <span>{total}</span> : null}
        </button>
        {categories.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`store-cat ${query.category === c.value ? "is-active" : ""}`}
            onClick={() => update({ category: c.value })}
          >
            {c.label} {data ? <span>{c.count}</span> : null}
          </button>
        ))}
      </nav>

      <div className="store-layout" ref={resultsRef}>
        <aside className={`store-filters ${showFilters ? "is-open" : ""}`} aria-label="Filters">
          <div className="store-filter">
            <h2 className="store-filter__title">Category</h2>
            <ul className="store-filter__list">
              {categories.map((c) => (
                <li key={c.value}>
                  <button
                    type="button"
                    className={`store-filter__option ${query.category === c.value ? "is-active" : ""}`}
                    onClick={() =>
                      update({ category: query.category === c.value ? undefined : c.value })
                    }
                    aria-pressed={query.category === c.value}
                  >
                    <span>{c.label}</span>
                    {data ? <span className="store-filter__count">{c.count}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="store-filter">
            <label className="store-filter__title" htmlFor="store-county">
              County
            </label>
            <select
              id="store-county"
              className="field"
              value={query.county || ""}
              onChange={(e) => update({ county: e.target.value || undefined })}
            >
              <option value="">All counties</option>
              {(data?.facets.counties ?? []).map((county) => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
          </div>

          <PriceFilter
            key={`${query.min_price || ""}|${query.max_price || ""}`}
            min={query.min_price || ""}
            max={query.max_price || ""}
            placeholderMin={data?.facets.price.min}
            placeholderMax={data?.facets.price.max}
            onApply={(min_price, max_price) => update({ min_price, max_price })}
          />

          {hasFilters ? (
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => router.push(pathname, { scroll: false })}
            >
              Clear all filters
            </button>
          ) : null}
        </aside>

        <section className="cq min-w-0" aria-live="polite" aria-busy={isFetching}>
          <div className="store-toolbar">
            <button
              type="button"
              className="btn btn-ghost lg:!hidden"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
            >
              <FilterIcon size={16} /> Filters
            </button>
            <p className="store-toolbar__count">
              {data ? (
                data.count ? (
                  <>
                    Showing <strong>{first}</strong>–<strong>{last}</strong> of{" "}
                    <strong>{data.count}</strong> products
                    {query.q ? <> for “{query.q}”</> : null}
                  </>
                ) : (
                  "No products found"
                )
              ) : (
                "Loading products…"
              )}
            </p>
            <label className="store-sort">
              <span>Sort by</span>
              <select
                className="field"
                value={query.sort}
                onChange={(e) => update({ sort: e.target.value === "newest" ? undefined : e.target.value })}
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {hasFilters ? (
            <div className="store-chips">
              {query.q ? <FilterChip label={`“${query.q}”`} onClear={() => update({ q: undefined })} /> : null}
              {query.category ? (
                <FilterChip
                  label={categories.find((c) => c.value === query.category)?.label || query.category}
                  onClear={() => update({ category: undefined })}
                />
              ) : null}
              {query.county ? <FilterChip label={query.county} onClear={() => update({ county: undefined })} /> : null}
              {query.seller ? (
                <FilterChip
                  label={sellerName ? `Seller: ${sellerName}` : "One seller"}
                  onClear={() => update({ seller: undefined })}
                />
              ) : null}
              {query.min_price || query.max_price ? (
                <FilterChip
                  label={`KSh ${query.min_price || "0"} – ${query.max_price || "any"}`}
                  onClear={() => update({ min_price: undefined, max_price: undefined })}
                />
              ) : null}
            </div>
          ) : null}

          {!loading && !signedIn ? (
            <p className="store-note">
              Seller phone numbers are shown after you{" "}
              <Link href={`/login?next=${encodeURIComponent(pathname)}`}>log in</Link> or{" "}
              <Link href="/signup?role=farmer">create a free farmer account</Link>.
            </p>
          ) : null}

          {isError ? (
            <div className="empty-state">
              <p className="empty-state__title">The marketplace could not load</p>
              <p>Check your connection and try again.</p>
            </div>
          ) : isLoading || !data ? (
            <div className="product-grid" aria-hidden>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="product-card product-card--skeleton">
                  <div className="product-card__media skeleton" />
                  <div className="product-card__body">
                    <div className="skeleton h-3 w-1/3 rounded" />
                    <div className="skeleton mt-2 h-4 w-4/5 rounded" />
                    <div className="skeleton mt-3 h-5 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : data.results.length === 0 ? (
            <div className="empty-state">
              <SearchIcon size={28} />
              <p className="empty-state__title">No products match these filters</p>
              <p>Try another county or category, or clear the filters.</p>
              {hasFilters ? (
                <button
                  type="button"
                  className="btn btn-primary mt-2"
                  onClick={() => router.push(pathname, { scroll: false })}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className={`product-grid ${isFetching ? "is-refreshing" : ""}`}>
              {data.results.map((p) => (
                <ProductCard key={p.id} product={p} href={`${basePath}/${p.id}`} />
              ))}
            </div>
          )}

          {data && data.pages > 1 ? (
            <Pagination page={data.page} pages={data.pages} onChange={goToPage} />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function SearchBar({
  initialQ,
  initialCategory,
  categories,
  onSearch,
}: {
  initialQ: string;
  initialCategory: string;
  categories: CategoryFacet[];
  onSearch: (q: string | undefined, category: string | undefined) => void;
}) {
  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState(initialCategory);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    onSearch(q.trim() || undefined, category || undefined);
  }

  return (
    <form className="store-search" role="search" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="store-search-category">
        Category
      </label>
      <select
        id="store-search-category"
        className="store-search__category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="store-search-q">
        Search products
      </label>
      <input
        id="store-search-q"
        className="store-search__input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search seed, fertiliser, sprayers…"
        type="search"
      />
      <button type="submit" className="store-search__button" aria-label="Search">
        <SearchIcon size={20} />
      </button>
    </form>
  );
}

function PriceFilter({
  min,
  max,
  placeholderMin,
  placeholderMax,
  onApply,
}: {
  min: string;
  max: string;
  placeholderMin?: string | null;
  placeholderMax?: string | null;
  onApply: (min: string | undefined, max: string | undefined) => void;
}) {
  const [low, setLow] = useState(min);
  const [high, setHigh] = useState(max);
  return (
    <form
      className="store-filter"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(low.trim() || undefined, high.trim() || undefined);
      }}
    >
      <p className="store-filter__title">Price (KSh)</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="sr-only" htmlFor="price-min">
          Minimum price
        </label>
        <input
          id="price-min"
          className="field"
          inputMode="numeric"
          value={low}
          onChange={(e) => setLow(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder={placeholderMin ? `Min ${Math.floor(Number(placeholderMin))}` : "Min"}
        />
        <label className="sr-only" htmlFor="price-max">
          Maximum price
        </label>
        <input
          id="price-max"
          className="field"
          inputMode="numeric"
          value={high}
          onChange={(e) => setHigh(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder={placeholderMax ? `Max ${Math.ceil(Number(placeholderMax))}` : "Max"}
        />
      </div>
      <button type="submit" className="btn btn-secondary mt-2 w-full">
        Apply price
      </button>
    </form>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="filter-chip">
      {label}
      <button type="button" onClick={onClear} aria-label={`Remove filter ${label}`}>
        <CloseIcon size={13} />
      </button>
    </span>
  );
}
