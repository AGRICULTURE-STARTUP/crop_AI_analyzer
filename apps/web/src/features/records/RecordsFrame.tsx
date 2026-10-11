"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { BasketIcon, ClipboardIcon, CoinsIcon, DownloadIcon } from "@/components/Icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LinkTabs, PageHeader, StatCard } from "@/components/ui/Page";
import { formatKsh } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { useFarmRecords } from "./hooks";
import { QuickAdd, type Editing, type Kind } from "./QuickAdd";
import { RECORDS_API_ENABLED } from "./repository";
import { RECORD_VIEWS, type RecordsView } from "./routes";
import {
  ACTIVITY_TYPES,
  FIELD_STATUS,
  plural,
  saleAmount,
  type FarmActivity,
  type FarmRecords,
  type FarmSale,
} from "./types";

type PendingDelete = { kind: "activity" | "sale" | "field"; id: string; label: string };

type RecordsContextValue = {
  data: FarmRecords;
  /** Farm work and sales in the chosen season, newest first. */
  activities: FarmActivity[];
  sales: FarmSale[];
  spent: number;
  income: number;
  profit: number;
  fieldName: (id: string | null) => string;
  edit: (editing: NonNullable<Editing>) => void;
  askDelete: (pending: PendingDelete) => void;
};

const RecordsContext = createContext<RecordsContextValue | null>(null);

export function useRecords() {
  const ctx = useContext(RecordsContext);
  if (!ctx) throw new Error("useRecords must be used inside <RecordsFrame>");
  return ctx;
}

const EMPTY: FarmRecords = { fields: [], activities: [], sales: [] };
export const typeLabel: Record<string, string> = Object.fromEntries(ACTIVITY_TYPES.map((t) => [t.value, t.label]));
export const statusLabel: Record<string, string> = Object.fromEntries(FIELD_STATUS.map((s) => [s.value, s.label]));
export const ksh = (n: number) => formatKsh(n) ?? "KSh 0";

/**
 * Shared frame for every Farm records page: season picker, totals, quick add and the
 * page tabs. It sits in the route layout, so the season and any half-typed entry
 * survive moving between By field, Farm work, Sales and Fields.
 */
export function RecordsFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const view: RecordsView = RECORD_VIEWS.find((v) => v.href === pathname)?.view ?? "overview";
  const api = useFarmRecords();
  const data = api.records.data ?? EMPTY;
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [editing, setEditing] = useState<Editing>(null);
  const [pending, setPending] = useState<PendingDelete | null>(null);

  const years = useMemo(() => {
    const set = new Set<string>([String(new Date().getFullYear())]);
    [...data.activities, ...data.sales].forEach((r) => set.add(r.date.slice(0, 4)));
    return [...set].sort().reverse();
  }, [data]);

  const inYear = (date: string) => year === "all" || date.startsWith(year);
  const activities = data.activities.filter((a) => inYear(a.date)).sort((a, b) => b.date.localeCompare(a.date));
  const sales = data.sales.filter((s) => inYear(s.date)).sort((a, b) => b.date.localeCompare(a.date));
  const spent = activities.reduce((sum, a) => sum + a.cost, 0);
  const income = sales.reduce((sum, s) => sum + saleAmount(s), 0);
  const profit = income - spent;
  const acres = data.fields.reduce((sum, f) => sum + (f.sizeAcres || 0), 0);
  const fieldName = (id: string | null) => data.fields.find((f) => f.id === id)?.name ?? "—";
  const busy = api.saveActivity.isPending || api.saveSale.isPending || api.saveField.isPending;

  const defaultKind: Kind =
    view === "sales" ? "sale" : view === "fields" ? "field" : view === "activities" || data.fields.length ? "activity" : "field";

  function edit(next: NonNullable<Editing>) {
    setEditing(next);
    document.getElementById("quick-add")?.scrollIntoView({ block: "start" });
  }

  function exportCsv() {
    const suffix = year === "all" ? "all" : year;
    if (view === "activities" || view === "overview") {
      downloadCsv(
        `farm-work-${suffix}.csv`,
        ["Date", "Field", "Work", "Description", "Cost (KSh)", "Amount", "Unit"],
        activities.map((a) => [a.date, fieldName(a.fieldId), typeLabel[a.type], a.description, a.cost, a.quantity, a.unit])
      );
    }
    if (view === "sales" || view === "overview") {
      downloadCsv(
        `farm-sales-${suffix}.csv`,
        ["Date", "Field", "Crop", "Quantity", "Unit", "Price per unit (KSh)", "Total (KSh)", "Buyer"],
        sales.map((s) => [s.date, fieldName(s.fieldId), s.crop, s.quantity, s.unit, s.pricePerUnit, saleAmount(s), s.buyer])
      );
    }
    if (view === "fields") {
      downloadCsv(
        "farm-fields.csv",
        ["Field", "Size (acres)", "Crop", "Planted on", "Status"],
        data.fields.map((f) => [f.name, f.sizeAcres, f.crop, f.plantedOn, statusLabel[f.status]])
      );
    }
  }

  async function confirmDelete() {
    if (!pending) return;
    if (pending.kind === "activity") await api.deleteActivity.mutateAsync(pending.id);
    if (pending.kind === "sale") await api.deleteSale.mutateAsync(pending.id);
    if (pending.kind === "field") await api.deleteField.mutateAsync(pending.id);
    setPending(null);
  }

  const counts: Record<RecordsView, number | undefined> = {
    overview: undefined,
    activities: activities.length,
    sales: sales.length,
    fields: data.fields.length,
  };

  return (
    <RecordsContext.Provider
      value={{ data, activities, sales, spent, income, profit, fieldName, edit, askDelete: setPending }}
    >
      <div className="records">
        <PageHeader
          title="Farm records"
          lead="Log farm work, costs and sales as they happen. Totals and profit update straight away."
          actions={
            <>
              <label className="sr-only" htmlFor="records-year">
                Season
              </label>
              <select id="records-year" className="field !w-auto" value={year} onChange={(e) => setYear(e.target.value)}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
                <option value="all">All years</option>
              </select>
              <button type="button" className="btn btn-ghost" onClick={exportCsv}>
                <DownloadIcon size={15} /> Export CSV
              </button>
            </>
          }
        />

        {!RECORDS_API_ENABLED ? (
          <p className="records__note">Records are saved on this device. Export a CSV now and then to keep a copy.</p>
        ) : null}

        <div className="stat-cards mb-4">
          <StatCard
            label="Fields"
            value={data.fields.length}
            sub={acres ? `${Math.round(acres * 10) / 10} acres` : "Add your plots"}
            Icon={ClipboardIcon}
          />
          <StatCard
            label="Spent"
            value={ksh(spent)}
            sub={plural(activities.length, "farm job", "farm jobs")}
            Icon={CoinsIcon}
            tone="amber"
          />
          <StatCard label="Sales" value={ksh(income)} sub={plural(sales.length, "sale", "sales")} Icon={BasketIcon} tone="sky" />
          <StatCard
            label="Profit"
            value={<span className={profit < 0 ? "text-[var(--danger)]" : ""}>{ksh(profit)}</span>}
            sub={year === "all" ? "All years" : `Season ${year}`}
            Icon={CoinsIcon}
            tone={profit < 0 ? "plum" : "leaf"}
          />
        </div>

        <QuickAdd
          key={`${editing?.kind ?? "new"}-${editing?.item.id ?? ""}-${data.fields.length}-${view}`}
          fields={data.fields}
          editing={editing}
          defaultKind={defaultKind}
          busy={busy}
          onSaveActivity={(a) => api.saveActivity.mutateAsync(a)}
          onSaveSale={(s) => api.saveSale.mutateAsync(s)}
          onSaveField={(f) => api.saveField.mutateAsync(f)}
          onCancelEdit={() => setEditing(null)}
        />

        <div className="toolbar mt-5">
          <LinkTabs
            label="Farm records pages"
            current={pathname}
            items={RECORD_VIEWS.map((v) => ({ href: v.href, label: v.label, count: counts[v.view] }))}
          />
        </div>

        {api.records.isLoading ? <div className="skeleton h-40 rounded-xl" /> : children}

        <ConfirmDialog
          open={pending !== null}
          title={`Delete ${pending?.label ?? "record"}?`}
          confirmLabel="Delete"
          tone="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPending(null)}
        >
          <p>
            {pending?.kind === "field"
              ? "The field is removed. Its farm work and sales stay in your records, marked as not linked to a field."
              : "This record is removed from your totals. This cannot be undone."}
          </p>
        </ConfirmDialog>
      </div>
    </RecordsContext.Provider>
  );
}
