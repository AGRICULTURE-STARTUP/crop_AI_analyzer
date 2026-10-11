"use client";

import { useEffect, useRef } from "react";
import { MessageIcon, PrintIcon } from "@/components/Icons";
import { formatKsh, intlPhone } from "@/lib/format";
import { useShopName } from "./hooks";
import { paymentLabel, type PosSale } from "./types";

const ksh = (n: number) => formatKsh(n) ?? "KSh 0";
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function receiptText(sale: PosSale, shop: string) {
  const lines = [
    `*${shop}*`,
    `Receipt ${sale.receiptNo} · ${when(sale.createdAt)}`,
    "",
    ...sale.lines.map((l) => `${l.name}${l.unit ? ` (${l.unit})` : ""} × ${l.quantity} = ${ksh(l.total)}`),
    "",
    `Subtotal ${ksh(sale.subtotal)}`,
    ...(sale.discount ? [`Discount −${ksh(sale.discount)}`] : []),
    `*Total ${ksh(sale.total)}*`,
    `Paid by ${paymentLabel(sale.payment)}${sale.mpesaCode ? ` (${sale.mpesaCode})` : ""}`,
    "",
    "Thank you for shopping with us.",
  ];
  return lines.join("\n");
}

/** Printable receipt with Print / WhatsApp / Done actions, shown in a modal. */
export function ReceiptDialog({
  sale,
  onClose,
  closeLabel = "Done",
}: {
  sale: PosSale;
  onClose: () => void;
  closeLabel?: string;
}) {
  const shop = useShopName();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const phone = intlPhone(sale.customerPhone);
  const whatsapp = `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(receiptText(sale, shop.name))}`;

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog dialog--receipt"
        role="dialog"
        aria-modal="true"
        aria-label={`Receipt ${sale.receiptNo}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="receipt">
          <div className="receipt__head">
            <p className="receipt__shop">{shop.name}</p>
            {shop.county || shop.phone ? (
              <p>{[shop.county, shop.phone].filter(Boolean).join(" · ")}</p>
            ) : null}
            <p>
              Receipt <strong>{sale.receiptNo}</strong>
            </p>
            <p>{when(sale.createdAt)}</p>
            {sale.status === "voided" ? <p className="receipt__void">VOIDED{sale.voidReason ? ` — ${sale.voidReason}` : ""}</p> : null}
          </div>

          <table className="receipt__lines">
            <tbody>
              {sale.lines.map((l, i) => (
                <tr key={`${l.name}-${i}`}>
                  <td>
                    {l.name}
                    <span>
                      {l.quantity} × {ksh(l.unitPrice)}
                      {l.unit ? ` · ${l.unit}` : ""}
                    </span>
                  </td>
                  <td>{ksh(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="receipt__totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{ksh(sale.subtotal)}</dd>
            </div>
            {sale.discount ? (
              <div>
                <dt>Discount</dt>
                <dd>−{ksh(sale.discount)}</dd>
              </div>
            ) : null}
            <div className="receipt__total">
              <dt>Total</dt>
              <dd>{ksh(sale.total)}</dd>
            </div>
            <div>
              <dt>Paid by</dt>
              <dd>
                {paymentLabel(sale.payment)}
                {sale.mpesaCode ? ` · ${sale.mpesaCode}` : ""}
              </dd>
            </div>
            {sale.amountReceived != null ? (
              <>
                <div>
                  <dt>Cash received</dt>
                  <dd>{ksh(sale.amountReceived)}</dd>
                </div>
                <div>
                  <dt>Change</dt>
                  <dd>{ksh(sale.change ?? 0)}</dd>
                </div>
              </>
            ) : null}
            {sale.customerName ? (
              <div>
                <dt>Customer</dt>
                <dd>
                  {sale.customerName}
                  {sale.customerPhone ? ` · ${sale.customerPhone}` : ""}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="receipt__thanks">Thank you for shopping with us.</p>
        </div>

        <div className="dialog__actions receipt__actions">
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
            <PrintIcon size={16} /> Print
          </button>
          <a className="btn btn-ghost" href={whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageIcon size={16} /> WhatsApp
          </a>
          <button ref={closeRef} type="button" className="btn btn-primary" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
