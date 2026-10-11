"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckIcon, PlusIcon } from "@/components/Icons";
import { formatKsh } from "@/lib/format";
import { newId } from "./repository";
import {
  ACTIVITY_TYPES,
  FIELD_STATUS,
  perUnit,
  type ActivityType,
  type FarmActivity,
  type FarmField,
  type FarmSale,
  type FieldStatus,
} from "./types";

export type Kind = "activity" | "sale" | "field";
export type Editing =
  | { kind: "activity"; item: FarmActivity }
  | { kind: "sale"; item: FarmSale }
  | { kind: "field"; item: FarmField }
  | null;

const today = () => new Date().toISOString().slice(0, 10);
const UNITS = ["kg", "bags", "crates", "tonnes", "pieces", "litres"];

/**
 * One compact form for the three record types. Date and field stay filled after
 * saving so a farmer can log several jobs on the same plot in a row.
 */
export function QuickAdd({
  fields,
  editing,
  defaultKind,
  busy,
  onSaveActivity,
  onSaveSale,
  onSaveField,
  onCancelEdit,
}: {
  fields: FarmField[];
  editing: Editing;
  /** Record type to start on, e.g. Sale on the Sales page. */
  defaultKind?: Kind;
  busy: boolean;
  onSaveActivity: (a: FarmActivity) => Promise<unknown>;
  onSaveSale: (s: FarmSale) => Promise<unknown>;
  onSaveField: (f: FarmField) => Promise<unknown>;
  onCancelEdit: () => void;
}) {
  const [kind, setKind] = useState<Kind>(editing?.kind ?? defaultKind ?? (fields.length ? "activity" : "field"));
  const [flash, setFlash] = useState("");
  const firstInput = useRef<HTMLInputElement>(null);

  // Activity draft
  const ea = editing?.kind === "activity" ? editing.item : null;
  const [aDate, setADate] = useState(ea?.date ?? today());
  const [aField, setAField] = useState(ea?.fieldId ?? fields[0]?.id ?? "");
  const [aType, setAType] = useState<ActivityType>(ea?.type ?? "fertiliser");
  const [aDesc, setADesc] = useState(ea?.description ?? "");
  const [aCost, setACost] = useState(ea ? String(ea.cost || "") : "");
  const [aQty, setAQty] = useState(ea?.quantity != null ? String(ea.quantity) : "");
  const [aUnit, setAUnit] = useState(ea?.unit ?? "kg");

  // Sale draft
  const es = editing?.kind === "sale" ? editing.item : null;
  const [sDate, setSDate] = useState(es?.date ?? today());
  const [sField, setSField] = useState(es?.fieldId ?? fields[0]?.id ?? "");
  const [sCrop, setSCrop] = useState(es?.crop ?? fields[0]?.crop ?? "");
  const [sQty, setSQty] = useState(es ? String(es.quantity) : "");
  const [sUnit, setSUnit] = useState(es?.unit ?? "kg");
  const [sPrice, setSPrice] = useState(es ? String(es.pricePerUnit) : "");
  const [sBuyer, setSBuyer] = useState(es?.buyer ?? "");

  // Field draft
  const ef = editing?.kind === "field" ? editing.item : null;
  const [fName, setFName] = useState(ef?.name ?? "");
  const [fSize, setFSize] = useState(ef?.sizeAcres != null ? String(ef.sizeAcres) : "");
  const [fCrop, setFCrop] = useState(ef?.crop ?? "");
  const [fPlanted, setFPlanted] = useState(ef?.plantedOn ?? "");
  const [fStatus, setFStatus] = useState<FieldStatus>(ef?.status ?? "growing");

  const saleTotal = (Number(sQty) || 0) * (Number(sPrice) || 0);

  function done(message: string) {
    setFlash(message);
    window.setTimeout(() => setFlash(""), 2200);
    firstInput.current?.focus();
    if (editing) onCancelEdit();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (kind === "activity") {
      await onSaveActivity({
        id: ea?.id ?? newId(),
        date: aDate || today(),
        fieldId: aField || null,
        type: aType,
        description: aDesc.trim(),
        cost: Number(aCost) || 0,
        quantity: aQty === "" ? null : Number(aQty),
        unit: aQty === "" ? "" : aUnit,
      });
      setADesc("");
      setACost("");
      setAQty("");
      done(ea ? "Activity updated" : "Activity saved");
    } else if (kind === "sale") {
      await onSaveSale({
        id: es?.id ?? newId(),
        date: sDate || today(),
        fieldId: sField || null,
        crop: sCrop.trim(),
        quantity: Number(sQty) || 0,
        unit: sUnit,
        pricePerUnit: Number(sPrice) || 0,
        buyer: sBuyer.trim(),
      });
      setSQty("");
      setSPrice("");
      setSBuyer("");
      done(es ? "Sale updated" : "Sale saved");
    } else {
      await onSaveField({
        id: ef?.id ?? newId(),
        name: fName.trim(),
        sizeAcres: fSize === "" ? null : Number(fSize),
        crop: fCrop.trim(),
        plantedOn: fPlanted || null,
        status: fStatus,
        notes: ef?.notes ?? "",
      });
      setFName("");
      setFSize("");
      setFCrop("");
      setFPlanted("");
      done(ef ? "Field updated" : "Field added");
    }
  }

  const fieldSelect = (value: string, onChange: (v: string) => void, id: string) => (
    <label className="qa-field">
      <span>Field</span>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">No field</option>
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
            {f.crop ? ` · ${f.crop}` : ""}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <form id="quick-add" className="ui-card quick-add" onSubmit={submit}>
      <div className="quick-add__head">
        <p className="ui-card__title">{editing ? "Edit record" : "Quick add"}</p>
        {!editing ? (
          <div className="segmented segmented--sm" role="tablist" aria-label="Record type">
            {(
              [
                ["activity", "Farm work"],
                ["sale", "Sale"],
                ["field", "Field"],
              ] as [Kind, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={kind === value}
                className={kind === value ? "is-active" : ""}
                onClick={() => setKind(value)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        {flash ? (
          <span className="quick-add__flash" role="status">
            <CheckIcon size={14} /> {flash}
          </span>
        ) : null}
      </div>

      {kind === "activity" ? (
        <div className="qa-grid">
          <label className="qa-field">
            <span>Date</span>
            <input ref={firstInput} className="field" type="date" value={aDate} onChange={(e) => setADate(e.target.value)} required />
          </label>
          {fieldSelect(aField, setAField, "qa-a-field")}
          <label className="qa-field">
            <span>Work</span>
            <select className="field" value={aType} onChange={(e) => setAType(e.target.value as ActivityType)}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="qa-field qa-field--wide">
            <span>What was done</span>
            <input className="field" value={aDesc} onChange={(e) => setADesc(e.target.value)} placeholder="e.g. Top dressed with CAN" />
          </label>
          <label className="qa-field">
            <span>Cost (KSh)</span>
            <input className="field" type="number" min="0" step="1" value={aCost} onChange={(e) => setACost(e.target.value)} placeholder="0" />
          </label>
          <label className="qa-field qa-field--qty">
            <span>Amount used</span>
            <span className="flex gap-1">
              <input className="field" type="number" min="0" step="any" value={aQty} onChange={(e) => setAQty(e.target.value)} placeholder="—" />
              <select className="field !w-20" value={aUnit} onChange={(e) => setAUnit(e.target.value)} aria-label="Unit">
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </span>
          </label>
        </div>
      ) : kind === "sale" ? (
        <div className="qa-grid">
          <label className="qa-field">
            <span>Date</span>
            <input ref={firstInput} className="field" type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} required />
          </label>
          {fieldSelect(
            sField,
            (v) => {
              setSField(v);
              const f = fields.find((x) => x.id === v);
              if (f?.crop) setSCrop(f.crop);
            },
            "qa-s-field"
          )}
          <label className="qa-field">
            <span>Crop</span>
            <input className="field" value={sCrop} onChange={(e) => setSCrop(e.target.value)} placeholder="e.g. Maize" required />
          </label>
          <label className="qa-field qa-field--qty">
            <span>Quantity</span>
            <span className="flex gap-1">
              <input className="field" type="number" min="0" step="any" value={sQty} onChange={(e) => setSQty(e.target.value)} required />
              <select className="field !w-20" value={sUnit} onChange={(e) => setSUnit(e.target.value)} aria-label="Unit">
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </span>
          </label>
          <label className="qa-field">
            <span>Price per {perUnit(sUnit)}</span>
            <input className="field" type="number" min="0" step="any" value={sPrice} onChange={(e) => setSPrice(e.target.value)} required />
          </label>
          <label className="qa-field">
            <span>Buyer</span>
            <input className="field" value={sBuyer} onChange={(e) => setSBuyer(e.target.value)} placeholder="Optional" />
          </label>
        </div>
      ) : (
        <div className="qa-grid">
          <label className="qa-field qa-field--wide">
            <span>Field name</span>
            <input ref={firstInput} className="field" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="e.g. Lower plot" required />
          </label>
          <label className="qa-field">
            <span>Size (acres)</span>
            <input className="field" type="number" min="0" step="any" value={fSize} onChange={(e) => setFSize(e.target.value)} />
          </label>
          <label className="qa-field">
            <span>Crop</span>
            <input className="field" value={fCrop} onChange={(e) => setFCrop(e.target.value)} placeholder="e.g. Maize" />
          </label>
          <label className="qa-field">
            <span>Planted on</span>
            <input className="field" type="date" value={fPlanted} onChange={(e) => setFPlanted(e.target.value)} />
          </label>
          <label className="qa-field">
            <span>Status</span>
            <select className="field" value={fStatus} onChange={(e) => setFStatus(e.target.value as FieldStatus)}>
              {FIELD_STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="quick-add__foot">
        {kind === "sale" ? (
          <span className="text-sm text-ink/70">
            Total <strong className="text-[var(--ink)]">{formatKsh(saleTotal) ?? "KSh 0"}</strong>
          </span>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {editing ? (
            <button type="button" className="btn btn-ghost" onClick={onCancelEdit}>
              Cancel
            </button>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            <PlusIcon size={15} /> {editing ? "Save changes" : kind === "activity" ? "Save work" : kind === "sale" ? "Save sale" : "Add field"}
          </button>
        </div>
      </div>
    </form>
  );
}
