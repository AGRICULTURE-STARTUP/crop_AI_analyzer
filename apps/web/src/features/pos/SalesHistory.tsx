"use client";

import Link from "next/link";
import { useState } from "react";
import { BasketIcon, CartIcon, CoinsIcon, DownloadIcon, ReceiptIcon, SearchIcon } from "@/components/Icons";
import { BarChart, BarList, Donut } from "@/components/ui/charts";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card, FilterTabs, StatCard } from "@/components/ui/Page";
import { downloadCsv } from "@/lib/csv";
import { ApiError } from "@/lib/api";
import { formatCompact, formatKsh } from "@/lib/format";
import { usePosActions, usePosSales } from "./hooks";
import { ReceiptDialog } from "./Receipt";
import {
  daysAgo,
  localDay,
  PAYMENT_METHODS,
  paymentLabel,
  summarize,
  type PaymentMethod,
  type PosSale,
  type SalesRange,
} from "./types";

type Period = "today" | "week" | "month";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
];

const rangeFor = (p: Period): SalesRange => ({
  from: p === "today" ? localDay() : daysAgo(p === "week" ? 6 : 29),
  to: localDay(),
});

const PAY_COLORS: Record<PaymentMethod, string> = {
  cash: "var(--leaf-500)",
  mpesa: "#0ea5a4",
  credit: "var(--sun)",
};

const ksh = (n: number) => formatKsh(n) ?? "KSh 0";
const PAGE = 50;

/** Sales history: takings, payment split, best sellers, every receipt with view / void / export. */
export function SalesHistory() {
  const [period, setPeriod] = useState<Period>("today");
  const range = rangeFor(period);
  const sales = usePosSales(range);
  const { voidSale } = usePosActions();
  const [payment, setPayment] = useState<"all" | PaymentMethod>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [viewing, setViewing] = useState<PosSale | null>(null);
  const [voiding, setVoiding] = useState<PosSale | null>(null);
  const [reason, setReason] = useState("");
  const [voidError, setVoidError] = useState("");

  const all = sales.data ?? [];
  const s = summarize(all, range);
  const q = query.trim().toLowerCase();
  const rows = all.filter(
    (sale) =>
      (payment === "all" || sale.payment === payment) &&
      (!q ||
        sale.receiptNo.toLowerCase().includes(q) ||
        sale.customerName.toLowerCase().includes(q) ||
        sale.customerPhone.includes(q) ||
        sale.lines.some((l) => l.name.toLowerCase().includes(q)))
  );
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "";
  const time = (iso: string) =>
    new Date(iso).toLocaleString("en-KE", {
      ...(period === "today" ? {} : { day: "numeric", month: "short" }),
      hour: "2-digit",
      minute: "2-digit",
    });

  function exportCsv() {
    downloadCsv(
      `shop-sales-${range.from}-to-${range.to}.csv`,
      [
        "Receipt",
        "Date",
        "Time",
        "Status",
        "Payment",
        "M-Pesa code",
        "Customer",
        "Phone",
        "Item",
        "Unit",
        "Quantity",
        "Price each (KSh)",
        "Line total (KSh)",
        "Sale discount (KSh)",
        "Sale total (KSh)",
      ],
      rows.flatMap((sale) => {
        const d = new Date(sale.createdAt);
        return sale.lines.map((l) => [
          sale.receiptNo,
          localDay(d),
          d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
          sale.status,
          paymentLabel(sale.payment),
          sale.mpesaCode,
          sale.customerName,
          sale.customerPhone,
          l.name,
          l.unit,
          l.quantity,
          l.unitPrice,
          l.total,
          sale.discount,
          sale.total,
        ]);
      })
    );
  }

  async function confirmVoid() {
    if (!voiding) return;
    if (!reason.trim()) {
      setVoidError("Say why the sale is being voided.");
      return;
    }
    try {
      await voidSale.mutateAsync({ id: voiding.id, reason });
      setVoiding(null);
    } catch (err) {
      setVoidError(err instanceof ApiError ? err.message : "Could not void the sale. Try again.");
    }
  }

  return (
    <>
      <div className="toolbar">
        <FilterTabs
          label="Period"
          value={period}
          onChange={(p) => {
            setPeriod(p);
            setLimit(PAGE);
          }}
          options={PERIODS}
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="pos-pay-filter">
            Payment method
          </label>
          <select
            id="pos-pay-filter"
            className="field !w-auto"
            value={payment}
            onChange={(e) => setPayment(e.target.value as "all" | PaymentMethod)}
          >
            <option value="all">All payments</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <label className="search-box">
            <SearchIcon size={16} />
            <span className="sr-only">Search sales</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Receipt, customer or item" />
          </label>
          <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={!rows.length}>
            <DownloadIcon size={15} /> Export CSV
          </button>
        </div>
      </div>

      <div className="stat-cards mb-4">
        <StatCard label="Takings" value={ksh(s.takings)} sub={periodLabel} Icon={CoinsIcon} />
        <StatCard
          label="Sales"
          value={s.count}
          sub={s.voided ? `${s.voided} voided` : "No voided sales"}
          Icon={ReceiptIcon}
          tone="sky"
        />
        <StatCard label="Average sale" value={ksh(Math.round(s.average))} sub="Per receipt" Icon={CartIcon} tone="amber" />
        <StatCard
          label="Items sold"
          value={Math.round(s.items * 100) / 100}
          sub="Units across all sales"
          Icon={BasketIcon}
          tone="plum"
        />
      </div>

      <div className={`dash-grid ${period === "today" ? "dash-grid--2" : "dash-grid--3"} mb-4`}>
        {period !== "today" ? (
          <Card title="Takings by day">
            <BarChart points={s.byDay} label="Takings by day" format={(n) => formatKsh(n) ?? "0"} height={150} />
          </Card>
        ) : null}
        <Card title="Payment methods">
          {s.count ? (
            <Donut
              parts={PAYMENT_METHODS.map((m) => ({ label: m.label, value: s.byPayment[m.value], color: PAY_COLORS[m.value] }))}
              centerLabel="KSh takings"
              centerValue={formatCompact(s.takings)}
              format={(n) => ksh(n)}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">No sales in this period.</p>
          )}
        </Card>
        <Card title="Best sellers">
          <BarList
            rows={s.best.map((b) => ({
              key: b.key,
              label: b.name,
              value: b.revenue,
              hint: `${Math.round(b.quantity * 100) / 100} sold${b.unit ? ` · ${b.unit}` : ""}`,
            }))}
            format={(n) => ksh(n)}
            empty="No sales in this period."
          />
        </Card>
      </div>

      {sales.isLoading ? (
        <div className="skeleton h-40 rounded-xl" />
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <ReceiptIcon size={26} />
          <p className="empty-state__title">{all.length ? "No sales match your filters" : "No sales in this period yet"}</p>
          <p>{all.length ? "Try another payment method or search." : "Completed sales show up here with their receipts."}</p>
          {!all.length ? (
            <Link href="/agency/pos" className="btn btn-primary mt-2">
              Start a sale
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table min-w-[46rem]">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Time</th>
                  <th>Items</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((sale) => {
                  const voided = sale.status === "voided";
                  const more = sale.lines.length - 1;
                  return (
                    <tr key={sale.id} className={voided ? "is-voided" : ""}>
                      <td className="font-medium text-[var(--ink)]">
                        {sale.receiptNo}
                        {voided ? <span className="badge badge-danger badge--plain ml-1.5">Voided</span> : null}
                      </td>
                      <td className="whitespace-nowrap">{time(sale.createdAt)}</td>
                      <td className="max-w-[16rem] truncate">
                        {sale.lines[0]?.name}
                        {more > 0 ? <span className="text-xs text-[var(--muted)]"> +{more} more</span> : null}
                      </td>
                      <td>{sale.customerName || "—"}</td>
                      <td>
                        <span className="badge badge--plain">
                          {paymentLabel(sale.payment)}
                          {sale.mpesaCode ? ` · ${sale.mpesaCode}` : ""}
                        </span>
                      </td>
                      <td className="text-right font-semibold text-[var(--ink)]">
                        <span className={voided ? "line-through opacity-60" : ""}>{ksh(sale.total)}</span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            className="btn btn-ghost !px-2.5 !py-1 text-xs"
                            onClick={() => setViewing(sale)}
                          >
                            Receipt
                          </button>
                          {!voided ? (
                            <button
                              type="button"
                              className="btn btn-ghost !px-2.5 !py-1 text-xs"
                              onClick={() => {
                                setReason("");
                                setVoidError("");
                                setVoiding(sale);
                              }}
                            >
                              Void
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > limit ? (
            <div className="mt-3 text-center">
              <button type="button" className="btn btn-ghost" onClick={() => setLimit((n) => n + PAGE)}>
                Show {Math.min(PAGE, rows.length - limit)} more of {rows.length - limit}
              </button>
            </div>
          ) : null}
        </>
      )}

      {viewing ? <ReceiptDialog sale={viewing} onClose={() => setViewing(null)} /> : null}

      <ConfirmDialog
        open={voiding !== null}
        title={`Void receipt ${voiding?.receiptNo ?? ""}?`}
        confirmLabel="Void sale"
        tone="danger"
        focusConfirm={false}
        busy={voidSale.isPending}
        onConfirm={confirmVoid}
        onCancel={() => setVoiding(null)}
      >
        <p>
          The sale stays on record, marked as voided, and {voiding ? ksh(voiding.total) : "its total"} is taken off your
          takings. Use this for mistakes and returns.
        </p>
        <label className="mt-3 grid gap-1">
          <span className="text-xs font-semibold text-[var(--muted)]">Reason</span>
          <input
            className="field"
            autoFocus
            maxLength={200}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setVoidError("");
            }}
            placeholder="e.g. Customer returned the item"
          />
        </label>
        {voidError ? <p className="mt-2 text-xs text-[var(--danger)]">{voidError}</p> : null}
      </ConfirmDialog>
    </>
  );
}
