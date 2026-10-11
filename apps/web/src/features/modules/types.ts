import type { ComponentType } from "react";
import type { UserRole } from "@/lib/types";

/** How a module is charged. Prices are in KSh and taken from the farmer's wallet. */
export type PricingModel = "free" | "one_time" | "monthly";

export type ModulePricing = { model: PricingModel; price: number };

/** A sidebar entry; with `children` it opens as a dropdown. */
export type ModuleNavItem = {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
};

/** A module as it exists in code (see registry.ts). */
export type ModuleDefinition = {
  key: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  Icon: ComponentType<{ size?: number }>;
  roles: UserRole[];
  /** Sidebar entries shown once the module is installed. */
  nav: ModuleNavItem[];
  defaultPricing: ModulePricing;
  /** Installed for every new account (can still be removed). */
  installedByDefault?: boolean;
  badge?: "New" | "Popular";
};

/** What an admin controls per module. */
export type ModuleSettings = { enabled: boolean } & ModulePricing;

/** A module as a signed-in user sees it in the app store. */
export type CatalogModule = ModuleDefinition & {
  settings: ModuleSettings;
  installed: boolean;
  /** Paid modules: when the current period ends (monthly) — null for free/one-time. */
  renewsOn?: string | null;
};

export type AdminModuleRow = ModuleDefinition & {
  settings: ModuleSettings;
  /** Filled by the backend; null while modules run on preview storage. */
  installs: number | null;
  revenue: string | null;
};
