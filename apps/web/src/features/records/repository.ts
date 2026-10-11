/**
 * Farm records storage. Same interface, two adapters:
 *  - local: this browser (per signed-in user) so the module works today;
 *  - http:  /api/v1/farm-records/... as described in
 *           docs/backend_modules_and_records_spec.md.
 * Set NEXT_PUBLIC_FARM_RECORDS_API=on once the backend ships the endpoints.
 */

import { apiRequest } from "@/lib/api";
import type { FarmActivity, FarmField, FarmRecords, FarmSale } from "./types";

export const RECORDS_API_ENABLED = process.env.NEXT_PUBLIC_FARM_RECORDS_API === "on";

export type RecordsRepository = {
  load(userId: number): Promise<FarmRecords>;
  saveField(userId: number, field: FarmField): Promise<FarmField>;
  deleteField(userId: number, id: string): Promise<void>;
  saveActivity(userId: number, activity: FarmActivity): Promise<FarmActivity>;
  deleteActivity(userId: number, id: string): Promise<void>;
  saveSale(userId: number, sale: FarmSale): Promise<FarmSale>;
  deleteSale(userId: number, id: string): Promise<void>;
};

export function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------ local adapter ----------------------------- */

const EMPTY: FarmRecords = { fields: [], activities: [], sales: [] };
const key = (userId: number) => `agriscan_farm_records_${userId}`;

function read(userId: number): FarmRecords {
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as FarmRecords) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(userId: number, data: FarmRecords) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(data));
  } catch {
    /* storage full or blocked */
  }
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];
}

const localRepository: RecordsRepository = {
  async load(userId) {
    return read(userId);
  },
  async saveField(userId, field) {
    const data = read(userId);
    write(userId, { ...data, fields: upsert(data.fields, field) });
    return field;
  },
  async deleteField(userId, id) {
    const data = read(userId);
    write(userId, {
      fields: data.fields.filter((f) => f.id !== id),
      // Keep the history, just detach it from the removed field.
      activities: data.activities.map((a) => (a.fieldId === id ? { ...a, fieldId: null } : a)),
      sales: data.sales.map((s) => (s.fieldId === id ? { ...s, fieldId: null } : s)),
    });
  },
  async saveActivity(userId, activity) {
    const data = read(userId);
    write(userId, { ...data, activities: upsert(data.activities, activity) });
    return activity;
  },
  async deleteActivity(userId, id) {
    const data = read(userId);
    write(userId, { ...data, activities: data.activities.filter((a) => a.id !== id) });
  },
  async saveSale(userId, sale) {
    const data = read(userId);
    write(userId, { ...data, sales: upsert(data.sales, sale) });
    return sale;
  },
  async deleteSale(userId, id) {
    const data = read(userId);
    write(userId, { ...data, sales: data.sales.filter((s) => s.id !== id) });
  },
};

/* ------------------------------- http adapter ------------------------------ */
/* Field names follow the backend spec (snake_case, decimals as strings). */

type ApiField = {
  id: string;
  name: string;
  size_acres: string | null;
  crop: string;
  planted_on: string | null;
  status: FarmField["status"];
  notes: string;
};
type ApiActivity = {
  id: string;
  date: string;
  field: string | null;
  activity_type: FarmActivity["type"];
  description: string;
  cost: string;
  quantity: string | null;
  unit: string;
};
type ApiSale = {
  id: string;
  date: string;
  field: string | null;
  crop: string;
  quantity: string;
  unit: string;
  price_per_unit: string;
  buyer: string;
};

const num = (v: string | null) => (v === null || v === "" ? null : Number(v));

const fromApi = {
  field: (f: ApiField): FarmField => ({
    id: f.id,
    name: f.name,
    sizeAcres: num(f.size_acres),
    crop: f.crop,
    plantedOn: f.planted_on,
    status: f.status,
    notes: f.notes,
  }),
  activity: (a: ApiActivity): FarmActivity => ({
    id: a.id,
    date: a.date,
    fieldId: a.field,
    type: a.activity_type,
    description: a.description,
    cost: Number(a.cost) || 0,
    quantity: num(a.quantity),
    unit: a.unit,
  }),
  sale: (s: ApiSale): FarmSale => ({
    id: s.id,
    date: s.date,
    fieldId: s.field,
    crop: s.crop,
    quantity: Number(s.quantity) || 0,
    unit: s.unit,
    pricePerUnit: Number(s.price_per_unit) || 0,
    buyer: s.buyer,
  }),
};

const BASE = "/api/v1/farm-records";

async function save<T>(path: string, id: string, isNew: boolean, body: unknown) {
  return apiRequest<T>(isNew ? `${BASE}/${path}/` : `${BASE}/${path}/${id}/`, {
    method: isNew ? "POST" : "PATCH",
    body,
  });
}

const known = new Set<string>();

const httpRepository: RecordsRepository = {
  async load() {
    const data = await apiRequest<{ fields: ApiField[]; activities: ApiActivity[]; sales: ApiSale[] }>(`${BASE}/`);
    const out = {
      fields: data.fields.map(fromApi.field),
      activities: data.activities.map(fromApi.activity),
      sales: data.sales.map(fromApi.sale),
    };
    [...out.fields, ...out.activities, ...out.sales].forEach((x) => known.add(x.id));
    return out;
  },
  async saveField(_u, f) {
    const res = await save<ApiField>("fields", f.id, !known.has(f.id), {
      name: f.name,
      size_acres: f.sizeAcres,
      crop: f.crop,
      planted_on: f.plantedOn,
      status: f.status,
      notes: f.notes,
    });
    known.add(res.id);
    return fromApi.field(res);
  },
  async deleteField(_u, id) {
    await apiRequest(`${BASE}/fields/${id}/`, { method: "DELETE" });
  },
  async saveActivity(_u, a) {
    const res = await save<ApiActivity>("activities", a.id, !known.has(a.id), {
      date: a.date,
      field: a.fieldId,
      activity_type: a.type,
      description: a.description,
      cost: a.cost,
      quantity: a.quantity,
      unit: a.unit,
    });
    known.add(res.id);
    return fromApi.activity(res);
  },
  async deleteActivity(_u, id) {
    await apiRequest(`${BASE}/activities/${id}/`, { method: "DELETE" });
  },
  async saveSale(_u, s) {
    const res = await save<ApiSale>("sales", s.id, !known.has(s.id), {
      date: s.date,
      field: s.fieldId,
      crop: s.crop,
      quantity: s.quantity,
      unit: s.unit,
      price_per_unit: s.pricePerUnit,
      buyer: s.buyer,
    });
    known.add(res.id);
    return fromApi.sale(res);
  },
  async deleteSale(_u, id) {
    await apiRequest(`${BASE}/sales/${id}/`, { method: "DELETE" });
  },
};

export const recordsRepository: RecordsRepository = RECORDS_API_ENABLED ? httpRepository : localRepository;
