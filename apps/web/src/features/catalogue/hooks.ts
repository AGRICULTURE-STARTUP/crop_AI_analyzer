"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { AgencyProduct } from "@/lib/types";

export const MY_PRODUCTS_KEY = ["my-products"] as const;

/** The signed-in agency's own product list (shared by My products and the Shop POS till). */
export function useShopProducts() {
  return useQuery({
    queryKey: MY_PRODUCTS_KEY,
    queryFn: async () =>
      (await apiRequest<{ products: AgencyProduct[] }>("/api/v1/inputs/my-products/")).products || [],
  });
}
