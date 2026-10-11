/**
 * Module data access. Two adapters with the same shape:
 *  - local: browser storage, so the UI works before the backend exists;
 *  - http:  the endpoints in docs/backend_modules_and_records_spec.md.
 * Set NEXT_PUBLIC_MODULES_API=on once the backend ships them.
 */

import { apiRequest } from "@/lib/api";
import { MODULES, MODULES_BY_KEY } from "./registry";
import type { AdminModuleRow, CatalogModule, ModuleSettings, PricingModel } from "./types";

export const MODULES_API_ENABLED = process.env.NEXT_PUBLIC_MODULES_API === "on";

export type ModulesRepository = {
  catalog(userId: number, role: string): Promise<CatalogModule[]>;
  install(userId: number, key: string): Promise<void>;
  uninstall(userId: number, key: string): Promise<void>;
  adminList(): Promise<AdminModuleRow[]>;
  adminSave(key: string, settings: ModuleSettings): Promise<void>;
};

/* ------------------------------ local adapter ----------------------------- */

const SETTINGS_KEY = "agriscan_modules_settings";
const installedKey = (userId: number) => `agriscan_modules_installed_${userId}`;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: changes last for this page only */
  }
}

function settingsFor(key: string, saved: Record<string, Partial<ModuleSettings>>): ModuleSettings {
  const def = MODULES_BY_KEY[key];
  return { enabled: true, ...def.defaultPricing, ...(saved[key] || {}) };
}

function installedFor(userId: number): string[] {
  return (
    readJson<string[] | null>(installedKey(userId), null) ??
    MODULES.filter((m) => m.installedByDefault).map((m) => m.key)
  );
}

const localRepository: ModulesRepository = {
  async catalog(userId, role) {
    const saved = readJson<Record<string, Partial<ModuleSettings>>>(SETTINGS_KEY, {});
    const installed = installedFor(userId);
    return MODULES.filter((m) => m.roles.includes(role as never)).map((m) => ({
      ...m,
      settings: settingsFor(m.key, saved),
      installed: installed.includes(m.key),
      renewsOn: null,
    }));
  },
  async install(userId, key) {
    const installed = installedFor(userId);
    if (!installed.includes(key)) writeJson(installedKey(userId), [...installed, key]);
  },
  async uninstall(userId, key) {
    writeJson(
      installedKey(userId),
      installedFor(userId).filter((k) => k !== key)
    );
  },
  async adminList() {
    const saved = readJson<Record<string, Partial<ModuleSettings>>>(SETTINGS_KEY, {});
    return MODULES.map((m) => ({ ...m, settings: settingsFor(m.key, saved), installs: null, revenue: null }));
  },
  async adminSave(key, settings) {
    const saved = readJson<Record<string, Partial<ModuleSettings>>>(SETTINGS_KEY, {});
    writeJson(SETTINGS_KEY, { ...saved, [key]: settings });
  },
};

/* ------------------------------- http adapter ------------------------------ */

type ApiModuleState = {
  key: string;
  enabled: boolean;
  pricing_model: PricingModel;
  price: string;
  installed?: boolean;
  renews_on?: string | null;
  installs?: number;
  revenue?: string;
};

const toSettings = (m: ApiModuleState): ModuleSettings => ({
  enabled: m.enabled,
  model: m.pricing_model,
  price: Number(m.price) || 0,
});

const httpRepository: ModulesRepository = {
  async catalog() {
    const data = await apiRequest<{ modules: ApiModuleState[] }>("/api/v1/modules/");
    return data.modules
      .filter((m) => MODULES_BY_KEY[m.key])
      .map((m) => ({
        ...MODULES_BY_KEY[m.key],
        settings: toSettings(m),
        installed: Boolean(m.installed),
        renewsOn: m.renews_on ?? null,
      }));
  },
  async install(_userId, key) {
    await apiRequest(`/api/v1/modules/${key}/install/`, { method: "POST" });
  },
  async uninstall(_userId, key) {
    await apiRequest(`/api/v1/modules/${key}/uninstall/`, { method: "POST" });
  },
  async adminList() {
    const data = await apiRequest<{ modules: ApiModuleState[] }>("/api/v1/admin/modules/");
    return data.modules
      .filter((m) => MODULES_BY_KEY[m.key])
      .map((m) => ({
        ...MODULES_BY_KEY[m.key],
        settings: toSettings(m),
        installs: m.installs ?? 0,
        revenue: m.revenue ?? "0",
      }));
  },
  async adminSave(key, settings) {
    await apiRequest(`/api/v1/admin/modules/${key}/`, {
      method: "PATCH",
      body: { enabled: settings.enabled, pricing_model: settings.model, price: String(settings.price) },
    });
  },
};

export const modulesRepository: ModulesRepository = MODULES_API_ENABLED ? httpRepository : localRepository;
