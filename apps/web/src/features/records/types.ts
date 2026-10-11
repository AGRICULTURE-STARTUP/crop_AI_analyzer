export type FieldStatus = "growing" | "fallow" | "harvested";

export type FarmField = {
  id: string;
  name: string;
  sizeAcres: number | null;
  crop: string;
  plantedOn: string | null;
  status: FieldStatus;
  notes: string;
};

export type ActivityType =
  | "planting"
  | "fertiliser"
  | "spraying"
  | "weeding"
  | "irrigation"
  | "harvest"
  | "labour"
  | "other";

export type FarmActivity = {
  id: string;
  date: string;
  fieldId: string | null;
  type: ActivityType;
  description: string;
  /** Money spent, KSh. */
  cost: number;
  quantity: number | null;
  unit: string;
};

export type FarmSale = {
  id: string;
  date: string;
  fieldId: string | null;
  crop: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  buyer: string;
};

export type FarmRecords = {
  fields: FarmField[];
  activities: FarmActivity[];
  sales: FarmSale[];
};

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "planting", label: "Planting" },
  { value: "fertiliser", label: "Fertiliser" },
  { value: "spraying", label: "Spraying" },
  { value: "weeding", label: "Weeding" },
  { value: "irrigation", label: "Irrigation" },
  { value: "harvest", label: "Harvest" },
  { value: "labour", label: "Labour" },
  { value: "other", label: "Other" },
];

export const FIELD_STATUS: { value: FieldStatus; label: string }[] = [
  { value: "growing", label: "Growing" },
  { value: "fallow", label: "Fallow" },
  { value: "harvested", label: "Harvested" },
];

export const saleAmount = (s: FarmSale) => s.quantity * s.pricePerUnit;

const SINGULAR: Record<string, string> = { bags: "bag", crates: "crate", tonnes: "tonne", pieces: "piece", litres: "litre" };

/** "bags" → "bag", for "KSh 7,800 per bag". */
export const perUnit = (unit: string) => SINGULAR[unit] ?? unit;

/** "1 sale", "3 sales". */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
