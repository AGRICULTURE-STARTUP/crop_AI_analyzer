import { apiRequest } from "@/lib/api";
import type { StoreDetailResponse, StoreListResponse, StoreQuery } from "./types";

/** `signedIn` attaches the session so seller phone numbers come back. */
export function fetchProducts(query: StoreQuery, signedIn: boolean) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return apiRequest<StoreListResponse>(`/api/v1/store/products/${qs ? `?${qs}` : ""}`, {
    auth: signedIn,
  });
}

export function fetchProduct(id: number | string, signedIn: boolean) {
  return apiRequest<StoreDetailResponse>(`/api/v1/store/products/${id}/`, {
    auth: signedIn,
  });
}
