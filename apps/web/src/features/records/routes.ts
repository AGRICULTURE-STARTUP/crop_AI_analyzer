/** Pages of the Farm records module. The sidebar dropdown and the in-page tabs both use this list. */
export const RECORD_VIEWS = [
  { view: "overview", href: "/farmer/records", label: "By field" },
  { view: "activities", href: "/farmer/records/work", label: "Farm work" },
  { view: "sales", href: "/farmer/records/sales", label: "Sales" },
  { view: "fields", href: "/farmer/records/fields", label: "Fields" },
] as const;

export type RecordsView = (typeof RECORD_VIEWS)[number]["view"];
