/**
 * Shop POS storage. Same interface, two adapters:
 *  - local: this browser (per signed-in agency) so the till works today;
 *  - http:  /api/v1/pos/... as described in docs/backend_modules_and_records_spec.md.
 * Set NEXT_PUBLIC_POS_API=on once the backend ships the endpoints.
 */

import { ApiError, apiRequest } from "@/lib/api";
import {
  cartTotals,
  localDay,
  round2,
  type PaymentMethod,
  type PosSale,
  type SaleInput,
  type SalesRange,
} from "./types";

export const POS_API_ENABLED = process.env.NEXT_PUBLIC_POS_API === "on";

export type PosRepository = {
  list(userId: number, range: SalesRange): Promise<PosSale[]>;
  create(userId: number, input: SaleInput, servedBy: string): Promise<PosSale>;
  void(userId: number, id: string, reason: string): Promise<PosSale>;
};

export function newRef() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Same checks the backend runs, so both adapters reject the same sales. */
export function validateSale(input: SaleInput): string | null {
  if (!input.lines.length) return "Add at least one item.";
  const bad = input.lines.find((l) => !(l.quantity > 0));
  if (bad) return `Enter a quantity for ${bad.name}.`;
  const unpriced = input.lines.find((l) => !(l.unitPrice > 0));
  if (unpriced) return `Enter a price for ${unpriced.name}.`;
  const { total } = cartTotals(input.lines, input.discount);
  if (input.payment === "cash" && input.amountReceived != null && input.amountReceived < total) {
    return "Cash received is less than the total.";
  }
  if (input.payment === "credit" && (!input.customerName.trim() || !input.customerPhone.trim())) {
    return "Sales on credit need the customer's name and phone number.";
  }
  return null;
}

/* ------------------------------ local adapter ----------------------------- */

const key = (userId: number) => `ukulimabora_pos_sales_${userId}`;

function read(userId: number): PosSale[] {
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as PosSale[]) : [];
  } catch {
    return [];
  }
}

function write(userId: number, sales: PosSale[]) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(sales));
  } catch {
    throw new ApiError(507, null, "This device is out of storage space. Export your sales and clear old ones.");
  }
}

const localRepository: PosRepository = {
  async list(userId, range) {
    return read(userId)
      .filter((s) => {
        const day = localDay(new Date(s.createdAt));
        return day >= range.from && day <= range.to;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async create(userId, input, servedBy) {
    const problem = validateSale(input);
    if (problem) throw new ApiError(400, { detail: problem }, problem);
    const all = read(userId);
    const existing = all.find((s) => s.id === input.clientRef);
    if (existing) return existing;

    const now = new Date();
    const day = localDay(now).replaceAll("-", "");
    const seq = all.filter((s) => s.receiptNo.startsWith(day)).length + 1;
    const { subtotal, discount, total } = cartTotals(input.lines, input.discount);
    const sale: PosSale = {
      id: input.clientRef,
      receiptNo: `${day}-${String(seq).padStart(3, "0")}`,
      createdAt: now.toISOString(),
      lines: input.lines.map((l) => ({ ...l, total: round2(l.unitPrice * l.quantity) })),
      subtotal,
      discount,
      total,
      payment: input.payment,
      amountReceived: input.payment === "cash" ? input.amountReceived : null,
      change: input.payment === "cash" && input.amountReceived != null ? round2(input.amountReceived - total) : null,
      mpesaCode: input.payment === "mpesa" ? input.mpesaCode.trim().toUpperCase() : "",
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      servedBy,
      status: "completed",
      voidReason: "",
    };
    write(userId, [...all, sale]);
    return sale;
  },

  async void(userId, id, reason) {
    const all = read(userId);
    const sale = all.find((s) => s.id === id);
    if (!sale) throw new ApiError(404, null, "Sale not found.");
    const updated: PosSale = { ...sale, status: "voided", voidReason: reason.trim() };
    write(
      userId,
      all.map((s) => (s.id === id ? updated : s))
    );
    return updated;
  },
};

/* ------------------------------- http adapter ------------------------------ */

type ApiSale = {
  id: number | string;
  receipt_no: string;
  created_at: string;
  lines: { product_id: number | null; name: string; unit: string; unit_price: string; quantity: string | number; line_total: string }[];
  subtotal: string;
  discount: string;
  total: string;
  payment_method: PaymentMethod;
  amount_received: string | null;
  change: string | null;
  mpesa_code: string;
  customer_name: string;
  customer_phone: string;
  served_by: string;
  status: "completed" | "voided";
  void_reason: string;
};

const num = (v: string | number | null) => (v === null ? null : Number(v));

const fromApi = (s: ApiSale): PosSale => ({
  id: String(s.id),
  receiptNo: s.receipt_no,
  createdAt: s.created_at,
  lines: s.lines.map((l) => ({
    productId: l.product_id,
    name: l.name,
    unit: l.unit,
    unitPrice: Number(l.unit_price),
    quantity: Number(l.quantity),
    total: Number(l.line_total),
  })),
  subtotal: Number(s.subtotal),
  discount: Number(s.discount),
  total: Number(s.total),
  payment: s.payment_method,
  amountReceived: num(s.amount_received),
  change: num(s.change),
  mpesaCode: s.mpesa_code,
  customerName: s.customer_name,
  customerPhone: s.customer_phone,
  servedBy: s.served_by,
  status: s.status,
  voidReason: s.void_reason,
});

const httpRepository: PosRepository = {
  async list(_userId, range) {
    const q = new URLSearchParams({ from: range.from, to: range.to });
    const data = await apiRequest<{ sales: ApiSale[] }>(`/api/v1/pos/sales/?${q}`);
    return data.sales.map(fromApi);
  },
  async create(_userId, input) {
    const problem = validateSale(input);
    if (problem) throw new ApiError(400, { detail: problem }, problem);
    const sale = await apiRequest<ApiSale>("/api/v1/pos/sales/", {
      method: "POST",
      body: {
        client_ref: input.clientRef,
        lines: input.lines.map((l) => ({
          product_id: l.productId,
          name: l.name,
          unit: l.unit,
          unit_price: l.unitPrice.toFixed(2),
          quantity: l.quantity,
        })),
        discount: input.discount.toFixed(2),
        payment_method: input.payment,
        amount_received: input.amountReceived == null ? null : input.amountReceived.toFixed(2),
        mpesa_code: input.mpesaCode,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
      },
    });
    return fromApi(sale);
  },
  async void(_userId, id, reason) {
    const sale = await apiRequest<ApiSale>(`/api/v1/pos/sales/${id}/void/`, { method: "POST", body: { reason } });
    return fromApi(sale);
  },
};

export const posRepository: PosRepository = POS_API_ENABLED ? httpRepository : localRepository;
