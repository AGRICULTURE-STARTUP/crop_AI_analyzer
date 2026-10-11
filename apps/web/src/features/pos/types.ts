/** Shop POS: over-the-counter sales for agrovets, from their own product list. */

export type PaymentMethod = "cash" | "mpesa" | "credit";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "credit", label: "On credit" },
];

export const paymentLabel = (m: PaymentMethod) => PAYMENT_METHODS.find((p) => p.value === m)?.label ?? m;

/** A line in the sale being rung up. */
export type CartLine = {
  /** Product id as text, or a generated key for an item typed at the till. */
  key: string;
  productId: number | null;
  name: string;
  unit: string;
  category: string;
  unitPrice: number;
  quantity: number;
};

/** What the till sends when a sale is completed. */
export type SaleInput = {
  /** Generated on the device so a retried request never records the sale twice. */
  clientRef: string;
  lines: Omit<CartLine, "key" | "category">[];
  discount: number;
  payment: PaymentMethod;
  /** Cash handed over; null when not counted. */
  amountReceived: number | null;
  mpesaCode: string;
  customerName: string;
  customerPhone: string;
};

export type SaleLine = {
  productId: number | null;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  total: number;
};

export type PosSale = {
  id: string;
  receiptNo: string;
  createdAt: string;
  lines: SaleLine[];
  subtotal: number;
  discount: number;
  total: number;
  payment: PaymentMethod;
  amountReceived: number | null;
  change: number | null;
  mpesaCode: string;
  customerName: string;
  customerPhone: string;
  servedBy: string;
  status: "completed" | "voided";
  voidReason: string;
};

/** Inclusive date range in the shop's local time, YYYY-MM-DD. */
export type SalesRange = { from: string; to: string };

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function cartTotals(lines: { unitPrice: number; quantity: number }[], discount: number) {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
  const off = round2(Math.min(Math.max(discount || 0, 0), subtotal));
  const items = lines.reduce((sum, l) => sum + l.quantity, 0);
  return { subtotal, discount: off, total: round2(subtotal - off), items };
}

/** YYYY-MM-DD for a date in the browser's time zone. */
export function localDay(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDay(d);
}

/** Totals for a list of sales; voided sales are counted separately and left out of takings. */
export function summarize(sales: PosSale[], range?: SalesRange) {
  const done = sales.filter((s) => s.status === "completed");
  const takings = round2(done.reduce((sum, s) => sum + s.total, 0));
  const byPayment: Record<PaymentMethod, number> = { cash: 0, mpesa: 0, credit: 0 };
  done.forEach((s) => (byPayment[s.payment] = round2(byPayment[s.payment] + s.total)));

  const products = new Map<string, { name: string; unit: string; quantity: number; revenue: number }>();
  done.forEach((s) =>
    s.lines.forEach((l) => {
      const key = l.productId != null ? `p${l.productId}` : `n${l.name.toLowerCase()}`;
      const row = products.get(key) ?? { name: l.name, unit: l.unit, quantity: 0, revenue: 0 };
      row.quantity += l.quantity;
      row.revenue = round2(row.revenue + l.total);
      products.set(key, row);
    })
  );
  const best = [...products.entries()]
    .map(([key, row]) => ({ key, ...row }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const byDay: { date: string; value: number }[] = [];
  if (range) {
    const totals = new Map<string, number>();
    done.forEach((s) => {
      const day = localDay(new Date(s.createdAt));
      totals.set(day, round2((totals.get(day) ?? 0) + s.total));
    });
    for (let d = new Date(`${range.from}T00:00:00`); localDay(d) <= range.to; d.setDate(d.getDate() + 1)) {
      byDay.push({ date: localDay(d), value: totals.get(localDay(d)) ?? 0 });
    }
  }

  return {
    takings,
    count: done.length,
    voided: sales.length - done.length,
    average: done.length ? round2(takings / done.length) : 0,
    items: done.reduce((sum, s) => sum + s.lines.reduce((n, l) => n + l.quantity, 0), 0),
    byPayment,
    best,
    byDay,
  };
}
