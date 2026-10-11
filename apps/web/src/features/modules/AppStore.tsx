"use client";

import { AppsIcon } from "@/components/Icons";
import { PageHeader } from "@/components/ui/Page";
import { useModuleCatalog } from "./hooks";
import { InstallButton } from "./InstallButton";
import { pricingLabel } from "./registry";

/** The App store for the signed-in role: every module an admin has made available to it. */
export function AppStore({ lead }: { lead: string }) {
  const catalog = useModuleCatalog();
  const modules = (catalog.data ?? []).filter((m) => m.settings.enabled);
  const installed = modules.filter((m) => m.installed);

  return (
    <>
      <PageHeader title="App store" lead={lead} />

      {catalog.isLoading ? (
        <div className="module-grid" aria-hidden>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="module-card skeleton h-56" />
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="empty-state">
          <AppsIcon size={26} />
          <p className="empty-state__title">No apps available yet</p>
          <p>New tools will show up here as they are released.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-ink/70">
            {installed.length} of {modules.length} installed
          </p>
          <ul className="module-grid">
            {modules.map((m) => (
              <li key={m.key} className={`module-card ${m.installed ? "is-installed" : ""}`}>
                <div className="module-card__head">
                  <span className="module-card__icon">
                    <m.Icon size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="module-card__name">{m.name}</p>
                    <p className="module-card__cat">{m.category}</p>
                  </div>
                  {m.installed ? (
                    <span className="badge badge-ok badge--plain">Installed</span>
                  ) : m.badge ? (
                    <span className="badge badge-warn badge--plain">{m.badge}</span>
                  ) : null}
                </div>
                <p className="module-card__tagline">{m.tagline}</p>
                <p className="module-card__desc">{m.description}</p>
                {m.nav[0]?.children?.length ? (
                  <p className="module-card__pages">
                    {m.nav[0].children.map((c) => c.label).join(" · ")}
                  </p>
                ) : null}
                <div className="module-card__foot">
                  <span className="module-card__price">{pricingLabel(m.settings.model, m.settings.price)}</span>
                  <InstallButton module={m} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
