"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  CallIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  ExpandIcon,
  MessageIcon,
  PinIcon,
  ShareIcon,
  StoreIcon,
} from "@/components/Icons";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatKsh, initialsOf, intlPhone, timeAgo } from "@/lib/format";
import { fetchProduct } from "./api";
import { ProductCard } from "./ProductCard";
import { ProductImage } from "./ProductImage";
import type { StoreDetailResponse } from "./types";

type Tab = "description" | "details" | "seller";

/** Product page shared by the public marketplace and the farmer portal. */
export function ProductDetail({ id, basePath }: { id: string; basePath: string }) {
  const { user, loading } = useAuth();
  const signedIn = !!user;
  const { data, isLoading, error } = useQuery({
    queryKey: ["store-product", id, signedIn],
    queryFn: () => fetchProduct(id, signedIn),
    enabled: !loading,
  });

  if (error) {
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <div className="empty-state">
        <p className="empty-state__title">
          {missing ? "This product is no longer listed" : "The product could not load"}
        </p>
        <p>
          {missing
            ? "The seller may have sold out or removed it."
            : "Check your connection and try again."}
        </p>
        <Link href={basePath} className="btn btn-primary mt-2">
          Back to the marketplace
        </Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="pd" aria-busy>
        <div className="pd-gallery skeleton" />
        <div className="space-y-3">
          <div className="skeleton h-4 w-1/4 rounded" />
          <div className="skeleton h-9 w-4/5 rounded" />
          <div className="skeleton h-24 w-full rounded" />
          <div className="skeleton h-10 w-1/3 rounded" />
        </div>
      </div>
    );
  }

  return <ProductView data={data} basePath={basePath} signedIn={signedIn} />;
}

function ProductView({
  data,
  basePath,
  signedIn,
}: {
  data: StoreDetailResponse;
  basePath: string;
  signedIn: boolean;
}) {
  const { product, seller } = data;
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>("description");
  const [zoomOpen, setZoomOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const price = formatKsh(product.price);
  const phone = intlPhone(seller.phone);
  const message = `Hello ${seller.name}, I saw "${product.name}" on Ukulima Bora. Is it available?`;

  const highlights = [
    product.unit ? `Pack size: ${product.unit}` : null,
    `Category: ${product.category_label}`,
    `Sold by ${seller.name} (${seller.type_label})`,
    seller.county ? `Seller is based in ${seller.county}` : null,
  ].filter(Boolean) as string[];

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the person closed the share sheet */
    }
  }

  return (
    <article className="space-y-12">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href={basePath}>Marketplace</Link>
        <ChevronRightIcon size={14} />
        <Link href={`${basePath}?category=${product.category}`}>{product.category_label}</Link>
        <ChevronRightIcon size={14} />
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="pd">
        <Gallery
          src={product.image}
          alt={product.name}
          category={product.category}
          onExpand={() => setZoomOpen(true)}
        />

        <div className="pd-info">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`${basePath}?category=${product.category}`} className="chip">
              {product.category_label}
            </Link>
            <span className="text-xs text-[var(--muted)]">Listed {timeAgo(product.created_at)}</span>
          </div>
          <h1 className="pd-title">{product.name}</h1>
          <p className="pd-seller-line">
            <StoreIcon size={16} />
            <Link href={`${basePath}?seller=${seller.id}`}>{seller.name}</Link>
            {seller.county ? (
              <>
                <span aria-hidden>·</span>
                <PinIcon size={15} /> {seller.county}
              </>
            ) : null}
          </p>

          <div>
            <p className="pd-subhead">Highlights</p>
            <ul className="pd-highlights">
              {highlights.map((h) => (
                <li key={h}>
                  <CheckIcon size={16} />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          <div className="pd-price">
            <span className="pd-price__value">{price ?? "Price on request"}</span>
            {price && product.unit ? <span className="pd-price__unit">per {product.unit}</span> : null}
          </div>
          <span className="badge badge-ok w-fit">Available</span>

          {signedIn && phone ? (
            <div className="pd-actions">
              <a href={`tel:+${phone}`} className="btn btn-primary btn-pill">
                <CallIcon size={17} /> Call seller
              </a>
              <a
                href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp btn-pill"
              >
                <MessageIcon size={17} /> Order on WhatsApp
              </a>
              <button type="button" className="btn btn-ghost btn-pill" onClick={share}>
                <ShareIcon size={16} /> {copied ? "Link copied" : "Share"}
              </button>
            </div>
          ) : (
            <div className="pd-actions">
              <Link
                href={`/login?next=${encodeURIComponent(pathname)}`}
                className="btn btn-primary btn-pill"
              >
                <CallIcon size={17} /> Log in to contact seller
              </Link>
              <Link href="/signup?role=farmer" className="btn btn-ghost btn-pill">
                Create a free account
              </Link>
              <button type="button" className="btn btn-ghost btn-pill" onClick={share}>
                <ShareIcon size={16} /> {copied ? "Link copied" : "Share"}
              </button>
            </div>
          )}

          <div className="pd-tips">
            <p className="pd-subhead">Before you pay</p>
            <ul>
              <li>Confirm the price, pack size and expiry date with the seller.</li>
              <li>Pay on collection, or by M-Pesa to the shop’s registered business number.</li>
              <li>For sprays, check the label is registered for your crop and read the safety advice.</li>
            </ul>
          </div>
        </div>
      </div>

      <section>
        <div className="tabs" role="tablist" aria-label="Product information">
          {(
            [
              ["description", "Description"],
              ["details", "Details"],
              ["seller", "Seller"],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`tab-${value}`}
              aria-selected={tab === value}
              aria-controls={`panel-${value}`}
              className={`tab ${tab === value ? "is-active" : ""}`}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="tab-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "description" ? (
            <p className="max-w-3xl whitespace-pre-line leading-relaxed text-[var(--text-body)]">
              {product.description || "The seller has not added a description yet. Call them for details."}
            </p>
          ) : null}
          {tab === "details" ? (
            <dl className="spec-table">
              {[
                ["Category", product.category_label],
                ["Pack size", product.unit || "—"],
                ["Price", price ? `${price}${product.unit ? ` per ${product.unit}` : ""}` : "On request"],
                ["Seller", seller.name],
                ["Seller type", seller.type_label],
                ["County", seller.county || "—"],
                ["Listed on", formatDate(product.created_at)],
                ["Last updated", formatDate(product.updated_at)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {tab === "seller" ? (
            <div className="seller-card">
              <span className="avatar avatar--light h-12 w-12 text-base">{initialsOf(seller.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--ink)]">{seller.name}</p>
                <p className="text-sm text-[var(--muted)]">
                  {seller.type_label}
                  {seller.county ? ` · ${seller.county}` : ""} · On Ukulima Bora since{" "}
                  {formatDate(seller.member_since)}
                </p>
                <p className="mt-1 text-sm">
                  {seller.product_count} product{seller.product_count === 1 ? "" : "s"} listed
                  {signedIn && seller.phone ? ` · ${seller.phone}` : ""}
                </p>
              </div>
              <Link href={`${basePath}?seller=${seller.id}`} className="btn btn-ghost">
                See all products
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {data.related.length ? (
        <section className="cq">
          <h2 className="pd-section-title">Related products</h2>
          <div className="product-grid">
            {data.related.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} href={`${basePath}/${p.id}`} />
            ))}
          </div>
        </section>
      ) : null}

      {data.more_from_seller.length ? (
        <section className="cq">
          <h2 className="pd-section-title">More from {seller.name}</h2>
          <div className="product-grid">
            {data.more_from_seller.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} href={`${basePath}/${p.id}`} />
            ))}
          </div>
        </section>
      ) : null}

      {zoomOpen && product.image ? (
        <Lightbox src={product.image} alt={product.name} onClose={() => setZoomOpen(false)} />
      ) : null}
    </article>
  );
}

/** Main photo with hover magnification (follows the pointer) and a full-screen button. */
function Gallery({
  src,
  alt,
  category,
  onExpand,
}: {
  src: string | null;
  alt: string;
  category: string;
  onExpand: () => void;
}) {
  const [origin, setOrigin] = useState("50% 50%");
  const [zoomed, setZoomed] = useState(false);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  return (
    <div className="pd-gallery">
      <div
        className={`pd-gallery__stage ${zoomed && src ? "is-zoomed" : ""}`}
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={onMove}
        style={{ ["--zoom-origin" as string]: origin }}
      >
        <ProductImage src={src} alt={alt} category={category} />
      </div>
      {src ? (
        <button type="button" className="pd-gallery__expand" onClick={onExpand} aria-label="View full size">
          <ExpandIcon size={18} />
        </button>
      ) : null}
    </div>
  );
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <button ref={closeRef} type="button" className="lightbox__close" onClick={onClose} aria-label="Close">
        <CloseIcon size={22} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="lightbox__img" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
