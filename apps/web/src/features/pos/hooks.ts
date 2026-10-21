"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { posRepository } from "./repository";
import type { SaleInput, SalesRange } from "./types";

/** Name printed on receipts. */
export function useShopName() {
  const { user } = useAuth();
  const profile = (user?.profile || {}) as Record<string, unknown>;
  return {
    name: (typeof profile.agency_name === "string" && profile.agency_name) || user?.user.username || "Shop",
    phone: typeof profile.phone === "string" ? profile.phone : "",
    county: typeof profile.county === "string" ? profile.county : "",
  };
}

export function usePosSales(range: SalesRange, enabled = true) {
  const { user } = useAuth();
  const userId = user?.user.id ?? 0;
  return useQuery({
    queryKey: ["pos-sales", userId, range.from, range.to],
    queryFn: () => posRepository.list(userId, range),
    enabled: Boolean(user) && enabled,
  });
}

export function usePosActions() {
  const { user } = useAuth();
  const shop = useShopName();
  const userId = user?.user.id ?? 0;
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["pos-sales"] });
  return {
    complete: useMutation({
      mutationFn: (input: SaleInput) => posRepository.create(userId, input, shop.name),
      onSuccess: refresh,
    }),
    voidSale: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => posRepository.void(userId, id, reason),
      onSuccess: refresh,
    }),
  };
}
