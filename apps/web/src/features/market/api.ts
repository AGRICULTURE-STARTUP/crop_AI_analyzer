import { apiRequest } from "@/lib/api";
import type { KamisPricesResponse } from "./types";

export function fetchKamisPrices(crop: string) {
  const params = new URLSearchParams({ crop: crop.trim() });
  return apiRequest<KamisPricesResponse>(`/api/v1/market/kamis-prices/?${params.toString()}`);
}
