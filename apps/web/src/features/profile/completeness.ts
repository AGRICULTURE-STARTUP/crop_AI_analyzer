import type { FarmerProfile } from "@/lib/types";
import { cropTags } from "./format";

/** A thing the farmer can still add. `field` is the form field to open, or "photo" for the picker. */
export type MissingItem = { key: string; label: string; field: "photo" | "phone_number" | "county" | "farm_name" | "farm_size_acres" | "products" };

const CHECKS: { key: string; label: string; field: MissingItem["field"]; done: (p: FarmerProfile, hasPhoto: boolean) => boolean }[] = [
  { key: "photo", label: "Add a photo", field: "photo", done: (_p, hasPhoto) => hasPhoto },
  { key: "phone", label: "Add your phone", field: "phone_number", done: (p) => Boolean(p.phone_number?.trim()) },
  { key: "county", label: "Add your county", field: "county", done: (p) => Boolean(p.county?.trim()) },
  { key: "farm", label: "Name your farm", field: "farm_name", done: (p) => Boolean(p.farm_name?.trim()) },
  {
    key: "size",
    label: "Add farm size",
    field: "farm_size_acres",
    done: (p) => p.farm_size_acres != null && p.farm_size_acres !== "" && Number(p.farm_size_acres) > 0,
  },
  { key: "crops", label: "List your crops", field: "products", done: (p) => cropTags(p.products).length > 0 },
];

/** Share of the profile that is filled in (0–100) and what is still missing. */
export function profileStrength(profile: FarmerProfile, hasPhoto: boolean) {
  const missing: MissingItem[] = CHECKS.filter((c) => !c.done(profile, hasPhoto)).map(({ key, label, field }) => ({
    key,
    label,
    field,
  }));
  const percent = Math.round(((CHECKS.length - missing.length) / CHECKS.length) * 100);
  return { percent, missing };
}
