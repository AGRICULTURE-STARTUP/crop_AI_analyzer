"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { MODULES_API_ENABLED, modulesRepository } from "./repository";
import type { ModuleNavItem } from "./types";

/** Modules the signed-in user can see, with install state and price. */
export function useModuleCatalog() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["modules", user?.user.id, user?.role],
    queryFn: () => modulesRepository.catalog(user!.user.id, user!.role),
    enabled: Boolean(user),
  });
}

/** Sidebar entries (with optional dropdown children) for installed, enabled modules. */
export function useInstalledNav(): (ModuleNavItem & { Icon: React.ComponentType<{ size?: number }> })[] {
  const catalog = useModuleCatalog();
  return (catalog.data ?? [])
    .filter((m) => m.installed && m.settings.enabled)
    .flatMap((m) => m.nav.map((n) => ({ ...n, Icon: m.Icon })));
}

export function useModuleActions() {
  const { user, refreshMe } = useAuth();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["modules"] });
  const install = useMutation({
    mutationFn: (key: string) => modulesRepository.install(user!.user.id, key),
    onSuccess: () => {
      refresh();
      // A paid install changes the wallet balance shown in the top bar.
      if (MODULES_API_ENABLED) void refreshMe();
    },
  });
  const uninstall = useMutation({
    mutationFn: (key: string) => modulesRepository.uninstall(user!.user.id, key),
    onSuccess: refresh,
  });
  return { install, uninstall };
}
