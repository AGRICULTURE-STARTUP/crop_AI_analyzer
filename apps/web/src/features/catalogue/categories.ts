export const PRODUCT_CATEGORIES = [
  { value: "fertiliser", label: "Fertiliser" },
  { value: "seed", label: "Seed" },
  { value: "pesticide", label: "Pesticide" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
] as const;

export const categoryLabel = (value: string) =>
  PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
