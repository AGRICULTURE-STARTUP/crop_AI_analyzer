"use client";

import Link from "next/link";
import { AppsIcon } from "@/components/Icons";
import { useAuth } from "@/lib/auth";
import { useModuleCatalog } from "./hooks";
import { appStorePath } from "./registry";

/** Dashboard strip: open an installed app in one tap, or go to the App store for more. */
export function AppsStrip() {
  const { user } = useAuth();
  const catalog = useModuleCatalog();
  const modules = (catalog.data ?? []).filter((m) => m.settings.enabled);
  if (!modules.length) return null;
  const installed = modules.filter((m) => m.installed);
  const more = modules.length - installed.length;

  return (
    <section className="apps-strip" aria-label="Your apps">
      <p className="apps-strip__label">Your apps</p>
      {installed.length ? (
        <ul>
          {installed.map((m) => (
            <li key={m.key}>
              <Link href={m.nav[0]?.href ?? appStorePath(user?.role)} className="apps-strip__app">
                <span className="apps-strip__icon">
                  <m.Icon size={16} />
                </span>
                {m.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink/70">No apps installed yet.</p>
      )}
      <Link href={appStorePath(user?.role)} className="apps-strip__store">
        <AppsIcon size={16} />
        {more ? `${more} more in the App store` : "App store"}
      </Link>
    </section>
  );
}
