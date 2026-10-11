import { apiRequest } from "@/lib/api";
import type { DirectoryBuyer, DirectoryFarmer, KamisPricesResponse } from "./types";

export function fetchKamisPrices(crop: string) {
  const params = new URLSearchParams({ crop: crop.trim() });
  return apiRequest<KamisPricesResponse>(`/api/v1/market/kamis-prices/?${params.toString()}`);
}

/** Farmer portal: verified produce buyers. */
export async function fetchBuyers() {
  const data = await apiRequest<{ buyer_list: DirectoryBuyer[] }>("/api/v1/market/buyers/");
  return data.buyer_list || [];
}

/** Buyer portal: registered farmers, optionally by crop and county. */
export async function fetchFarmers(filter: { crop?: string; county?: string }) {
  const params = new URLSearchParams();
  if (filter.crop?.trim()) params.set("crop", filter.crop.trim());
  if (filter.county?.trim()) params.set("county", filter.county.trim());
  const qs = params.toString();
  const data = await apiRequest<{ farmer_list: DirectoryFarmer[] }>(
    `/api/v1/market/farmers/${qs ? `?${qs}` : ""}`
  );
  return data.farmer_list || [];
}
