import { CartIcon, ClipboardIcon, SproutIcon } from "@/components/Icons";
import { POS_VIEWS } from "@/features/pos/routes";
import { RECORD_VIEWS } from "@/features/records/routes";
import type { ModuleDefinition } from "./types";

const links = (views: readonly { href: string; label: string }[]) => views.map(({ href, label }) => ({ href, label }));

/**
 * Every installable module lives here. To add one:
 *  1. build its screens under src/features/<module> and routes under src/app/<role>/...
 *  2. wrap each route in <ModuleGate moduleKey="..."> so it asks to install first
 *  3. add an entry below; it then shows in the role's App store, on the admin
 *     App store page (/admin/modules) and, once installed, in the sidebar under
 *     My apps — as a dropdown when it has `children`.
 * The backend keeps the same keys (see docs/backend_modules_and_records_spec.md).
 */
export const MODULES: ModuleDefinition[] = [
  {
    key: "farm-records",
    name: "Farm records",
    tagline: "Fields, farm work, costs and sales in one place",
    description:
      "Record what you plant, spray and harvest on each field, keep track of what you spend and sell, and see the profit for each crop. Export everything to a spreadsheet.",
    category: "Farm management",
    Icon: ClipboardIcon,
    roles: ["farmer"],
    nav: [{ href: "/farmer/records", label: "Farm records", children: links(RECORD_VIEWS) }],
    defaultPricing: { model: "free", price: 0 },
    badge: "New",
  },
  {
    key: "crop-advisor",
    name: "Crop advisor",
    tagline: "Find the crop that suits your soil and weather",
    description:
      "Enter your soil test and this season’s weather to compare 22 crops, with a crop library of the conditions each one grows in. Works in English and Kiswahili.",
    category: "Planning",
    Icon: SproutIcon,
    roles: ["farmer"],
    nav: [
      {
        href: "/farmer/advisor",
        label: "Crop advisor",
        children: [
          { href: "/farmer/advisor", label: "Get advice" },
          { href: "/farmer/crops", label: "Crop library" },
        ],
      },
    ],
    defaultPricing: { model: "free", price: 0 },
    installedByDefault: true,
    badge: "Popular",
  },
  {
    key: "agrovet-pos",
    name: "Shop POS",
    tagline: "Sell over the counter from your product list",
    description:
      "Ring up sales from the products you already list, take cash, M-Pesa or credit, give a receipt by print or WhatsApp, and see today’s takings and best sellers.",
    category: "Sales",
    Icon: CartIcon,
    roles: ["agency"],
    nav: [{ href: "/agency/pos", label: "Shop POS", children: links(POS_VIEWS) }],
    defaultPricing: { model: "free", price: 0 },
    badge: "New",
  },
];

export const MODULES_BY_KEY: Record<string, ModuleDefinition> = Object.fromEntries(
  MODULES.map((m) => [m.key, m])
);

export function pricingLabel(model: string, price: number) {
  if (model === "free" || !price) return "Free";
  const ksh = `KSh ${price.toLocaleString("en-KE")}`;
  return model === "monthly" ? `${ksh} / month` : `${ksh} once`;
}

/** Where each role's App store lives. */
export function appStorePath(role?: string) {
  return role === "agency" ? "/agency/apps" : "/farmer/apps";
}
