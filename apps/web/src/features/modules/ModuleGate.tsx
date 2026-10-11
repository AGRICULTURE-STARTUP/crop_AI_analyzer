"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AppsIcon } from "@/components/Icons";
import { useAuth } from "@/lib/auth";
import { useModuleCatalog } from "./hooks";
import { InstallButton } from "./InstallButton";
import { appStorePath, pricingLabel } from "./registry";

/** Shows a module's screens only when it is installed (and switched on by an admin). */
export function ModuleGate({ moduleKey, children }: { moduleKey: string; children: ReactNode }) {
  const { user } = useAuth();
  const catalog = useModuleCatalog();

  if (catalog.isLoading || !catalog.data) {
    return <div className="skeleton h-48 rounded-xl" aria-busy />;
  }

  const mod = catalog.data.find((m) => m.key === moduleKey);
  if (!mod || !mod.settings.enabled) {
    return (
      <div className="empty-state">
        <AppsIcon size={26} />
        <p className="empty-state__title">This app is not available right now</p>
        <p>An administrator has switched it off. Check the App store for other apps.</p>
        <Link href={appStorePath(user?.role)} className="btn btn-primary mt-2">
          Open the App store
        </Link>
      </div>
    );
  }

  if (!mod.installed) {
    return (
      <div className="module-gate">
        <span className="module-gate__icon">
          <mod.Icon size={30} />
        </span>
        <p className="module-gate__eyebrow">{mod.category}</p>
        <h1 className="page-header__title">{mod.name}</h1>
        <p className="module-gate__text">{mod.description}</p>
        <p className="module-gate__price">{pricingLabel(mod.settings.model, mod.settings.price)}</p>
        <InstallButton module={mod} showOpen={false} />
      </div>
    );
  }

  return <>{children}</>;
}
