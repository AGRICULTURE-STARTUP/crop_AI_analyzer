"use client";

import Link from "next/link";
import { CartIcon } from "@/components/Icons";
import { useModuleCatalog } from "@/features/modules/hooks";
import { InstallButton } from "@/features/modules/InstallButton";
import { pricingLabel } from "@/features/modules/registry";
import { formatKsh } from "@/lib/format";
import { usePosSales } from "./hooks";
import { localDay, summarize } from "./types";

/** Agency dashboard banner: today's counter sales once Shop POS is installed, an offer to install it before. */
export function PosHighlight() {
  const catalog = useModuleCatalog();
  const pos = catalog.data?.find((m) => m.key === "agrovet-pos");
  const today = localDay();
  const sales = usePosSales({ from: today, to: today }, Boolean(pos?.installed));

  if (!pos || !pos.settings.enabled) return null;

  if (!pos.installed) {
    return (
      <div className="pos-highlight">
        <span className="pos-highlight__icon">
          <CartIcon size={22} />
        </span>
        <div className="pos-highlight__body">
          <p className="pos-highlight__title">
            Sell over the counter with {pos.name}
            <span className="badge badge-warn badge--plain">{pricingLabel(pos.settings.model, pos.settings.price)}</span>
          </p>
          <p className="pos-highlight__text">{pos.tagline}. Take cash, M-Pesa or credit and give receipts.</p>
        </div>
        <InstallButton module={pos} size="sm" />
      </div>
    );
  }

  const s = summarize(sales.data ?? []);
  return (
    <div className="pos-highlight pos-highlight--live">
      <span className="pos-highlight__icon">
        <CartIcon size={22} />
      </span>
      <div className="pos-highlight__body">
        <p className="pos-highlight__title">Today at the counter</p>
        <p className="pos-highlight__text">
          {sales.isLoading ? (
            "Loading…"
          ) : (
            <>
              <strong>{formatKsh(s.takings) ?? "KSh 0"}</strong> from {s.count} {s.count === 1 ? "sale" : "sales"}
              {s.byPayment.mpesa > 0 ? ` · ${formatKsh(s.byPayment.mpesa)} by M-Pesa` : ""}
              {s.byPayment.credit > 0 ? ` · ${formatKsh(s.byPayment.credit)} on credit` : ""}
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/agency/pos/sales" className="btn btn-ghost btn-sm">
          Sales history
        </Link>
        <Link href="/agency/pos" className="btn btn-primary btn-sm">
          New sale
        </Link>
      </div>
    </div>
  );
}
