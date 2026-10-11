"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CartIcon, CloseIcon, MinusIcon, PlusIcon, SearchIcon, StoreIcon } from "@/components/Icons";
import { ProductImage } from "@/features/marketplace/ProductImage";
import { ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatKsh } from "@/lib/format";
import type { AgencyProduct } from "@/lib/types";
import { usePosActions, usePosSales, useShopProducts } from "./hooks";
import { ReceiptDialog } from "./Receipt";
import { newRef } from "./repository";
import {
  cartTotals,
  localDay,
  PAYMENT_METHODS,
  round2,
  summarize,
  type CartLine,
  type PaymentMethod,
  type PosSale,
} from "./types";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "fertiliser", label: "Fertiliser" },
  { value: "seed", label: "Seed" },
  { value: "pesticide", label: "Pesticide" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

const ksh = (n: number) => formatKsh(n) ?? "KSh 0";

/** The sale being rung up survives a refresh or a visit to Sales history (this tab only). */
type Draft = { lines: CartLine[]; discount: number };
const EMPTY_DRAFT: Draft = { lines: [], discount: 0 };
const draftKey = (userId: number) => `agriscan_pos_cart_${userId}`;

function loadDraft(userId: number): Draft {
  try {
    const raw = sessionStorage.getItem(draftKey(userId));
    return raw ? { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Draft) } : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

/** Exact amount, then the next round 100 / 500 / 1,000 above the total. */
function cashSuggestions(total: number) {
  if (total <= 0) return [];
  const up = (step: number) => Math.ceil(total / step) * step;
  return [...new Set([total, up(100), up(500), up(1000)])].slice(0, 4);
}

const numberValue = (n: number) => (n === 0 ? "" : n);

/** Over-the-counter till: tap products, adjust quantities and prices, take payment, print a receipt. */
export function PosTerminal() {
  const { user } = useAuth();
  const userId = user?.user.id ?? 0;
  const products = useShopProducts();
  const today = localDay();
  const todaySales = usePosSales({ from: today, to: today });
  const { complete } = usePosActions();

  const [draft, setDraft] = useState<Draft>(() => loadDraft(userId));
  const [saleRef, setSaleRef] = useState(newRef);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [received, setReceived] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [other, setOther] = useState<{ name: string; price: string } | null>(null);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<PosSale | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const priceInputs = useRef(new Map<string, HTMLInputElement>());
  const focusPriceOf = useRef<string | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey(userId), JSON.stringify(draft));
    } catch {
      /* storage blocked: the sale just won't survive a refresh */
    }
  }, [draft, userId]);

  // After adding a product with no price, put the cursor in its price box.
  useEffect(() => {
    if (!focusPriceOf.current) return;
    priceInputs.current.get(focusPriceOf.current)?.focus();
    focusPriceOf.current = null;
  });

  const list = [...(products.data ?? [])].sort(
    (a, b) => Number(b.is_available) - Number(a.is_available) || a.name.localeCompare(b.name)
  );
  const q = query.trim().toLowerCase();
  const shown = list.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (!q || p.name.toLowerCase().includes(q) || p.unit.toLowerCase().includes(q))
  );
  const inCart = new Map(draft.lines.map((l) => [l.key, l.quantity]));
  const totals = cartTotals(draft.lines, draft.discount);
  const receivedAmount = received === "" ? null : Number(received);
  const change = payment === "cash" && receivedAmount != null ? round2(receivedAmount - totals.total) : null;
  const day = summarize(todaySales.data ?? []);

  const setLines = (fn: (lines: CartLine[]) => CartLine[]) => {
    setError("");
    setDraft((d) => ({ ...d, lines: fn(d.lines) }));
  };

  function addProduct(p: AgencyProduct) {
    const key = `p${p.id}`;
    const price = p.price ? Number(p.price) : 0;
    setLines((lines) =>
      lines.some((l) => l.key === key)
        ? lines.map((l) => (l.key === key ? { ...l, quantity: round2(l.quantity + 1) } : l))
        : [...lines, { key, productId: p.id, name: p.name, unit: p.unit, category: p.category, unitPrice: price, quantity: 1 }]
    );
    if (!price) focusPriceOf.current = key;
  }

  function addOther(e: FormEvent) {
    e.preventDefault();
    if (!other?.name.trim()) return;
    const key = `x${newRef()}`;
    const price = Number(other.price) || 0;
    setLines((lines) => [
      ...lines,
      { key, productId: null, name: other.name.trim(), unit: "", category: "other", unitPrice: price, quantity: 1 },
    ]);
    if (!price) focusPriceOf.current = key;
    setOther(null);
  }

  const step = (key: string, delta: number) =>
    setLines((lines) =>
      lines.flatMap((l) => {
        if (l.key !== key) return [l];
        const quantity = round2(l.quantity + delta);
        return quantity > 0 ? [{ ...l, quantity }] : [];
      })
    );
  const update = (key: string, patch: Partial<CartLine>) =>
    setLines((lines) => lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key: string) => setLines((lines) => lines.filter((l) => l.key !== key));

  function resetSale() {
    setDraft(EMPTY_DRAFT);
    setPayment("cash");
    setReceived("");
    setMpesaCode("");
    setCustomerName("");
    setCustomerPhone("");
    setOther(null);
    setError("");
  }

  async function onComplete() {
    setError("");
    try {
      const sale = await complete.mutateAsync({
        clientRef: saleRef,
        lines: draft.lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          unit: l.unit,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
        })),
        discount: totals.discount,
        payment,
        amountReceived: payment === "cash" ? receivedAmount : null,
        mpesaCode: payment === "mpesa" ? mpesaCode : "",
        customerName,
        customerPhone,
      });
      setReceipt(sale);
      setSaleRef(newRef());
      resetSale();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete the sale. Try again.");
    }
  }

  return (
    <div className="pos">
      <section className="pos-catalog" aria-label="Products">
        <div className="pos-today" aria-live="polite">
          <span>
            Today <strong>{ksh(day.takings)}</strong>
          </span>
          <span>
            {day.count} {day.count === 1 ? "sale" : "sales"}
          </span>
          <span>Cash {ksh(day.byPayment.cash)}</span>
          <span>M-Pesa {ksh(day.byPayment.mpesa)}</span>
          {day.byPayment.credit ? <span>Credit {ksh(day.byPayment.credit)}</span> : null}
          <Link href="/agency/pos/sales">Sales history</Link>
        </div>

        <div className="pos-search">
          <label className="search-box">
            <SearchIcon size={16} />
            <span className="sr-only">Search your products</span>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && shown[0]) {
                  e.preventDefault();
                  addProduct(shown[0]);
                  setQuery("");
                }
              }}
              placeholder="Search products — Enter adds the first match"
              autoComplete="off"
            />
          </label>
        </div>
        <div className="pos-cats" role="tablist" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              role="tab"
              aria-selected={category === c.value}
              className={category === c.value ? "is-active" : ""}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {products.isLoading ? (
          <ul className="pos-grid" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="skeleton h-44 rounded-xl" />
            ))}
          </ul>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <StoreIcon size={26} />
            <p className="empty-state__title">Your product list is empty</p>
            <p>Add products on My products to tap them here. You can still sell anything as an other item.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link href="/agency/dashboard" className="btn btn-primary">
                Add products
              </Link>
              <button type="button" className="btn btn-ghost" onClick={() => setOther({ name: "", price: "" })}>
                Sell an other item
              </button>
            </div>
          </div>
        ) : (
          <ul className="pos-grid">
            {shown.map((p) => {
              const qty = inCart.get(`p${p.id}`);
              return (
                <li key={p.id}>
                  <button type="button" className={`pos-tile ${qty ? "is-in-cart" : ""}`} onClick={() => addProduct(p)}>
                    <span className="pos-tile__img">
                      <ProductImage src={mediaUrl(p.image)} alt="" category={p.category} />
                    </span>
                    <span className="sr-only">Add </span>
                    <span className="pos-tile__name">{p.name}</span>
                    <span className="pos-tile__unit">{p.unit || p.category}</span>
                    <span className={`pos-tile__price ${p.price ? "" : "is-missing"}`}>
                      {p.price ? ksh(Number(p.price)) : "Set price"}
                    </span>
                    {qty ? (
                      <span className="pos-tile__qty">
                        <span className="sr-only">In this sale: </span>
                        {qty}
                      </span>
                    ) : null}
                    {!p.is_available ? <span className="pos-tile__flag">Marked out of stock</span> : null}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                className="pos-tile pos-tile--other"
                onClick={() => setOther({ name: query.trim(), price: "" })}
              >
                <PlusIcon size={20} />
                {q && shown.length === 0 ? `Sell “${query.trim()}” as an other item` : "Other item"}
              </button>
            </li>
          </ul>
        )}

        {draft.lines.length ? (
          <a href="#pos-cart" className="pos-mobilebar">
            <CartIcon size={18} />
            <span className="flex-1">
              {draft.lines.length} {draft.lines.length === 1 ? "item" : "items"} · <strong>{ksh(totals.total)}</strong>
            </span>
            <span className="font-semibold">Checkout</span>
          </a>
        ) : null}
      </section>

      <aside id="pos-cart" className="pos-cart" aria-label="Current sale">
        <div className="pos-cart__head">
          <CartIcon size={18} />
          <p className="pos-cart__title flex-1">Current sale</p>
          {draft.lines.length ? (
            <button type="button" className="btn btn-ghost !px-2.5 !py-1 text-xs" onClick={resetSale}>
              Clear
            </button>
          ) : null}
        </div>

        {other ? (
          <form className="pos-other" onSubmit={addOther}>
            <label className="sr-only" htmlFor="pos-other-name">
              Item name
            </label>
            <input
              id="pos-other-name"
              className="field"
              autoFocus
              required
              maxLength={150}
              value={other.name}
              onChange={(e) => setOther({ ...other, name: e.target.value })}
              placeholder="Item name"
            />
            <label className="sr-only" htmlFor="pos-other-price">
              Price
            </label>
            <input
              id="pos-other-price"
              className="field"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={other.price}
              onChange={(e) => setOther({ ...other, price: e.target.value })}
              placeholder="Price"
            />
            <button type="submit" className="btn btn-primary !px-3 !py-1.5 text-xs">
              Add
            </button>
            <button type="button" className="icon-btn !h-8 !w-8" aria-label="Cancel other item" onClick={() => setOther(null)}>
              <CloseIcon size={14} />
            </button>
          </form>
        ) : null}

        {draft.lines.length === 0 ? (
          <p className="pos-empty">Tap a product to start a sale.</p>
        ) : (
          <ul className="pos-lines">
            {draft.lines.map((l) => (
              <li key={l.key} className="pos-line">
                <div className="pos-line__top">
                  <p className="pos-line__name">
                    {l.name}
                    {l.unit ? <span> · {l.unit}</span> : null}
                  </p>
                  <button type="button" className="icon-btn !h-7 !w-7" aria-label={`Remove ${l.name}`} onClick={() => remove(l.key)}>
                    <CloseIcon size={14} />
                  </button>
                </div>
                <div className="pos-line__controls">
                  <div className="qty-stepper">
                    <button type="button" aria-label={`One less ${l.name}`} onClick={() => step(l.key, -1)}>
                      <MinusIcon size={14} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      aria-label={`Quantity of ${l.name}`}
                      value={numberValue(l.quantity)}
                      onChange={(e) => update(l.key, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                    />
                    <button type="button" aria-label={`One more ${l.name}`} onClick={() => step(l.key, 1)}>
                      <PlusIcon size={14} />
                    </button>
                  </div>
                  <label className="pos-line__price">
                    <span aria-hidden>@</span>
                    <input
                      ref={(el) => {
                        if (el) priceInputs.current.set(l.key, el);
                        else priceInputs.current.delete(l.key);
                      }}
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      aria-label={`Price each for ${l.name}`}
                      placeholder="Price"
                      value={numberValue(l.unitPrice)}
                      onChange={(e) => update(l.key, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </label>
                  <p className="pos-line__total">{ksh(round2(l.unitPrice * l.quantity))}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <dl className="pos-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{ksh(totals.subtotal)}</dd>
          </div>
          <div className="items-center">
            <dt>
              <label htmlFor="pos-discount">Discount (KSh)</label>
            </dt>
            <dd>
              <input
                id="pos-discount"
                className="field pos-discount"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={numberValue(draft.discount)}
                onChange={(e) => setDraft((d) => ({ ...d, discount: Math.max(0, Number(e.target.value) || 0) }))}
                placeholder="0"
              />
            </dd>
          </div>
          <div className="pos-totals__grand">
            <dt>Total</dt>
            <dd>{ksh(totals.total)}</dd>
          </div>
        </dl>

        <div className="segmented segmented--sm pos-pay" role="radiogroup" aria-label="Payment method">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={payment === m.value}
              className={payment === m.value ? "is-active" : ""}
              onClick={() => setPayment(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {payment === "cash" ? (
          <div className="grid gap-2">
            <label className="pos-field">
              <span>Cash received</span>
              <input
                className="field"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                placeholder="Optional"
              />
            </label>
            {totals.total > 0 ? (
              <div className="amount-chips">
                {cashSuggestions(totals.total).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={receivedAmount === n ? "is-active" : ""}
                    onClick={() => setReceived(String(n))}
                  >
                    {n === totals.total ? "Exact" : n.toLocaleString("en-KE")}
                  </button>
                ))}
              </div>
            ) : null}
            {change != null ? (
              <p className={`pos-change ${change < 0 ? "is-short" : ""}`} aria-live="polite">
                {change < 0 ? `Short by ${ksh(-change)}` : `Change ${ksh(change)}`}
              </p>
            ) : null}
          </div>
        ) : payment === "mpesa" ? (
          <label className="pos-field">
            <span>M-Pesa code (optional)</span>
            <input
              className="field uppercase"
              value={mpesaCode}
              maxLength={12}
              onChange={(e) => setMpesaCode(e.target.value)}
              placeholder="e.g. SJK4H2L9QX"
              autoComplete="off"
            />
            <small className="pos-hint">Check the payment message has arrived before completing the sale.</small>
          </label>
        ) : (
          <p className="pos-hint">Record who owes this amount. Name and phone are needed for credit sales.</p>
        )}

        <details className="pos-customer" open={payment === "credit" || undefined}>
          <summary>{payment === "credit" ? "Customer" : "Add customer (optional)"}</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <label className="pos-field">
              <span>Name</span>
              <input
                className="field"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="pos-field">
              <span>Phone</span>
              <input
                className="field"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="07…"
                autoComplete="off"
              />
            </label>
          </div>
        </details>

        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="btn btn-primary pos-complete"
          disabled={!draft.lines.length || complete.isPending}
          onClick={onComplete}
        >
          {complete.isPending ? "Saving…" : `Complete sale · ${ksh(totals.total)}`}
        </button>
      </aside>

      {receipt ? (
        <ReceiptDialog
          sale={receipt}
          closeLabel="New sale"
          onClose={() => {
            setReceipt(null);
            searchRef.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}
