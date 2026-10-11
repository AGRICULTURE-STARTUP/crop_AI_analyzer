"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LinkTabs, PageHeader } from "@/components/ui/Page";
import { useShopName } from "./hooks";
import { POS_API_ENABLED } from "./repository";
import { POS_VIEWS } from "./routes";

/** Header and page tabs shared by New sale and Sales history. */
export function PosFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shop = useShopName();
  const today = new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="pos-frame">
      <PageHeader
        title="Shop POS"
        lead={`${shop.name} · ${today}`}
        actions={
          <LinkTabs
            label="Shop POS pages"
            current={pathname}
            items={POS_VIEWS.map((v) => ({ href: v.href, label: v.label }))}
          />
        }
      />
      {!POS_API_ENABLED ? (
        <p className="pos-note">
          Sales are saved on this device for now. Export them from Sales history now and then to keep a copy.
        </p>
      ) : null}
      {children}
    </div>
  );
}
