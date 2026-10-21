"use client";

import { ClipboardIcon, TrashIcon } from "@/components/Icons";
import { formatDate } from "@/lib/format";
import { ksh, statusLabel, typeLabel, useRecords } from "./RecordsFrame";
import { perUnit, saleAmount } from "./types";

/** "1 litre", "12 bags": the unit follows the amount. */
const amountText = (quantity: number, unit: string) => `${quantity} ${quantity === 1 ? perUnit(unit) : unit}`;

/** By field: what each plot cost and earned this season. */
export function FieldSummaryView() {
  const { data, activities, sales, spent, income, profit, fieldFilter } = useRecords();
  const rows = [...data.fields.map((f) => ({ id: f.id as string | null, field: f })), { id: null, field: null }]
    .filter((row) => fieldFilter === "all" || (fieldFilter === "none" ? row.id === null : row.id === fieldFilter))
    .map(({ id, field }) => {
      const cost = activities.filter((a) => a.fieldId === id).reduce((s, a) => s + a.cost, 0);
      const sold = sales.filter((s) => s.fieldId === id).reduce((s, x) => s + saleAmount(x), 0);
      return { id, field, cost, sold, profit: sold - cost };
    })
    .filter((row) => row.field || row.cost || row.sold);

  if (rows.length === 0) return <Empty text="Add your first field above, then log farm work and sales against it." />;

  return (
    <div className="table-wrap table-wrap--stack">
      <table className="data-table data-table--stack min-w-[40rem]">
        <thead>
          <tr>
            <th>Field</th>
            <th>Crop</th>
            <th>Status</th>
            <th className="text-right">Spent</th>
            <th className="text-right">Sales</th>
            <th className="text-right">Profit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id ?? "none"}>
              <td className="cell-title font-medium text-[var(--ink)]">
                {row.field ? row.field.name : "Not linked to a field"}
                {row.field?.sizeAcres ? <span className="block text-xs font-normal text-[var(--muted)]">{row.field.sizeAcres} acres</span> : null}
              </td>
              <td data-label="Crop">{row.field?.crop || "—"}</td>
              <td data-label="Status">{row.field ? <span className="badge">{statusLabel[row.field.status]}</span> : "—"}</td>
              <td data-label="Spent" className="text-right">
                {ksh(row.cost)}
              </td>
              <td data-label="Sales" className="text-right">
                {ksh(row.sold)}
              </td>
              <td data-label="Profit" className={`text-right font-semibold ${row.profit < 0 ? "text-[var(--danger)]" : "text-leaf-deep"}`}>
                {ksh(row.profit)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="font-semibold text-[var(--ink)]">
              Total
            </td>
            <td data-label="Spent" className="text-right font-semibold">
              {ksh(spent)}
            </td>
            <td data-label="Sales" className="text-right font-semibold">
              {ksh(income)}
            </td>
            <td data-label="Profit" className={`text-right font-semibold ${profit < 0 ? "text-[var(--danger)]" : "text-leaf-deep"}`}>
              {ksh(profit)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Farm work: every job with its cost, newest first. */
export function WorkView() {
  const { activities, fieldName, edit, askDelete } = useRecords();
  if (activities.length === 0) return <Empty text="No farm work matches. Use Quick add above to log some." />;

  return (
    <div className="table-wrap table-wrap--stack">
      <table className="data-table data-table--stack min-w-[44rem]">
        <thead>
          <tr>
            <th>Date</th>
            <th>Field</th>
            <th>Work</th>
            <th>Description</th>
            <th className="text-right">Amount</th>
            <th className="text-right">Cost</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id}>
              <td className="cell-title whitespace-nowrap font-medium text-[var(--ink)]">{formatDate(a.date)}</td>
              <td data-label="Field">{fieldName(a.fieldId)}</td>
              <td data-label="Work">
                <span className="badge">{typeLabel[a.type]}</span>
              </td>
              <td data-label="Notes" className="max-w-[16rem] truncate">
                {a.description || "—"}
              </td>
              <td data-label="Amount" className="text-right">
                {a.quantity != null ? amountText(a.quantity, a.unit) : "—"}
              </td>
              <td data-label="Cost" className="text-right">
                {ksh(a.cost)}
              </td>
              <RowActions
                onEdit={() => edit({ kind: "activity", item: a })}
                onDelete={() =>
                  askDelete({ kind: "activity", id: a.id, label: `${typeLabel[a.type]} on ${formatDate(a.date)}` })
                }
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Sales: what was sold, to whom and for how much. */
export function SalesView() {
  const { sales, fieldName, edit, askDelete } = useRecords();
  if (sales.length === 0) return <Empty text="No sales match. Use Quick add → Sale to record one." />;

  return (
    <div className="table-wrap table-wrap--stack">
      <table className="data-table data-table--stack min-w-[44rem]">
        <thead>
          <tr>
            <th>Crop</th>
            <th>Date</th>
            <th>Field</th>
            <th className="text-right">Quantity</th>
            <th className="text-right">Price</th>
            <th className="text-right">Total</th>
            <th>Buyer</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id}>
              <td className="cell-title font-medium text-[var(--ink)]">{s.crop}</td>
              <td data-label="Date" className="whitespace-nowrap">
                {formatDate(s.date)}
              </td>
              <td data-label="Field">{fieldName(s.fieldId)}</td>
              <td data-label="Quantity" className="text-right">
                {amountText(s.quantity, s.unit)}
              </td>
              <td data-label="Price" className="text-right">
                {ksh(s.pricePerUnit)}/{perUnit(s.unit)}
              </td>
              <td data-label="Total" className="text-right font-semibold text-leaf-deep">
                {ksh(saleAmount(s))}
              </td>
              <td data-label="Buyer">{s.buyer || "—"}</td>
              <RowActions
                onEdit={() => edit({ kind: "sale", item: s })}
                onDelete={() => askDelete({ kind: "sale", id: s.id, label: `${s.crop} sale on ${formatDate(s.date)}` })}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Fields: the farmer's plots. */
export function FieldsView() {
  const { data, edit, askDelete } = useRecords();
  if (data.fields.length === 0) return <Empty text="No fields yet. Use Quick add → Field to add your first plot." />;

  return (
    <div className="table-wrap table-wrap--stack">
      <table className="data-table data-table--stack min-w-[36rem]">
        <thead>
          <tr>
            <th>Field</th>
            <th>Size</th>
            <th>Crop</th>
            <th>Planted on</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.fields.map((f) => (
            <tr key={f.id}>
              <td className="cell-title font-medium text-[var(--ink)]">{f.name}</td>
              <td data-label="Size">{f.sizeAcres != null ? `${f.sizeAcres} acres` : "—"}</td>
              <td data-label="Crop">{f.crop || "—"}</td>
              <td data-label="Planted on">{f.plantedOn ? formatDate(f.plantedOn) : "—"}</td>
              <td data-label="Status">
                <span className="badge">{statusLabel[f.status]}</span>
              </td>
              <RowActions
                onEdit={() => edit({ kind: "field", item: f })}
                onDelete={() => askDelete({ kind: "field", id: f.id, label: f.name })}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <td className="cell-actions">
      <div className="flex justify-end gap-1.5">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="icon-btn icon-btn--sm" aria-label="Delete" title="Delete" onClick={onDelete}>
          <TrashIcon size={14} />
        </button>
      </div>
    </td>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <ClipboardIcon size={24} />
      <p>{text}</p>
    </div>
  );
}
