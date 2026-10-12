"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppsIcon } from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { FilterTabs, PageHeader, StatCard } from "@/components/ui/Page";
import { pricingLabel } from "@/features/modules/registry";
import { MODULES_API_ENABLED, modulesRepository } from "@/features/modules/repository";
import type { AdminModuleRow, ModuleSettings, PricingModel } from "@/features/modules/types";
import { formatKsh } from "@/lib/format";

const AUDIENCE: Record<string, string> = {
  farmer: "Farmers",
  agency: "Agrovets",
  buyer: "Buyers",
  lender: "Lenders",
};

type Audience = "all" | "farmer" | "agency";

export default function AdminModulesPage() {
  const modules = useQuery({ queryKey: ["admin-modules"], queryFn: () => modulesRepository.adminList() });
  const [audience, setAudience] = useState<Audience>("all");
  const rows = modules.data ?? [];
  const live = rows.filter((m) => m.settings.enabled).length;
  const paid = rows.filter((m) => m.settings.enabled && m.settings.model !== "free" && m.settings.price > 0).length;
  const forRole = (role: Audience) => rows.filter((m) => role === "all" || m.roles.includes(role));
  const shown = forRole(audience);

  return (
    <PortalShell role="admin" title="App store">
      <PageHeader
        title="App store"
        lead="Every app farmers and agrovets can install from their App store. Switch an app on or off and set it free, paid once or paid monthly. Paid apps are charged from the account's Ukulima Bora wallet."
      />

      {!MODULES_API_ENABLED ? (
        <div className="notice notice--warn mb-4">
          <AppsIcon size={18} />
          <p>
            Preview mode: changes are saved in this browser only. Once the backend adds the modules API (see{" "}
            <code>docs/backend_modules_and_records_spec.md</code>) and <code>NEXT_PUBLIC_MODULES_API=on</code> is set,
            they apply to every user.
          </p>
        </div>
      ) : null}

      <div className="stat-cards mb-4">
        <StatCard label="Apps in the store" value={rows.length} Icon={AppsIcon} />
        <StatCard label="Available to users" value={live} Icon={AppsIcon} tone="sky" />
        <StatCard label="Paid apps" value={paid} Icon={AppsIcon} tone="amber" />
      </div>

      <div className="toolbar">
        <FilterTabs
          label="Who the app is for"
          value={audience}
          onChange={setAudience}
          options={[
            { value: "all", label: "All apps", count: rows.length },
            { value: "farmer", label: "For farmers", count: forRole("farmer").length },
            { value: "agency", label: "For agrovets", count: forRole("agency").length },
          ]}
        />
      </div>

      {modules.isLoading ? (
        <div className="skeleton h-40 rounded-xl" />
      ) : (
        <ul className="space-y-3">
          {shown.map((m) => (
            <ModuleRow key={`${m.key}-${JSON.stringify(m.settings)}`} module={m} />
          ))}
        </ul>
      )}
    </PortalShell>
  );
}

function ModuleRow({ module }: { module: AdminModuleRow }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<ModuleSettings>(module.settings);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(module.settings);

  const save = useMutation({
    mutationFn: () =>
      modulesRepository.adminSave(module.key, {
        ...draft,
        price: draft.model === "free" ? 0 : Math.max(0, Math.round(draft.price)),
      }),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["admin-modules"] });
      qc.invalidateQueries({ queryKey: ["modules"] });
    },
  });

  return (
    <li className="ui-card module-admin">
      <div className="module-admin__info">
        <span className="module-card__icon">
          <module.Icon size={22} />
        </span>
        <div className="min-w-0">
          <p className="module-card__name">
            {module.name}{" "}
            <span className={`badge ${module.settings.enabled ? "badge-ok" : ""} badge--plain`}>
              {module.settings.enabled ? "Available" : "Hidden"}
            </span>
          </p>
          <p className="module-card__cat">
            {module.category} · for {module.roles.map((r) => AUDIENCE[r] ?? r).join(", ")} · now{" "}
            {pricingLabel(module.settings.model, module.settings.price)}
          </p>
          <p className="mt-1 text-xs text-ink/70">{module.tagline}</p>
          {module.nav[0]?.children?.length ? (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Menu: {module.nav[0].label} → {module.nav[0].children.map((c) => c.label).join(", ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="module-admin__controls">
        <label className="module-admin__field">
          <span>Available</span>
          <button
            type="button"
            role="switch"
            aria-checked={draft.enabled}
            className={`switch ${draft.enabled ? "is-on" : ""}`}
            onClick={() => {
              setSaved(false);
              setDraft((d) => ({ ...d, enabled: !d.enabled }));
            }}
          >
            <span className="sr-only">{draft.enabled ? "Available" : "Hidden"}</span>
          </button>
        </label>
        <label className="module-admin__field">
          <span>Pricing</span>
          <select
            className="field"
            value={draft.model}
            onChange={(e) => {
              setSaved(false);
              setDraft((d) => ({ ...d, model: e.target.value as PricingModel }));
            }}
          >
            <option value="free">Free</option>
            <option value="one_time">Paid once</option>
            <option value="monthly">Paid monthly</option>
          </select>
        </label>
        <label className="module-admin__field">
          <span>Price (KSh)</span>
          <input
            className="field"
            type="number"
            min="0"
            step="10"
            disabled={draft.model === "free"}
            value={draft.model === "free" ? 0 : draft.price}
            onChange={(e) => {
              setSaved(false);
              setDraft((d) => ({ ...d, price: Number(e.target.value) || 0 }));
            }}
          />
        </label>
        <div className="module-admin__field">
          <span>Installs · revenue</span>
          <p className="module-admin__stat">
            {module.installs ?? "—"} · {module.revenue !== null ? formatKsh(module.revenue) : "—"}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary self-end"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving…" : saved && !dirty ? "Saved" : "Save"}
        </button>
      </div>
    </li>
  );
}
