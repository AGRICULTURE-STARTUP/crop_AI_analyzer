import { apiRequest } from "@/lib/api";
import type {
  AdvisorWeather,
  CatalogResponse,
  CropDetailResponse,
  HistoryItem,
  RecommendResponse,
  SoilClimate,
} from "./types";

export function fetchCatalog() {
  return apiRequest<CatalogResponse>("/api/v1/recommend/crops/", { auth: false });
}

export function fetchCrop(slug: string) {
  return apiRequest<CropDetailResponse>(`/api/v1/recommend/crops/${encodeURIComponent(slug)}/`, {
    auth: false,
  });
}

/** Signed-in runs are saved to the farmer's history. */
export function recommend(values: SoilClimate & { location?: string }, signedIn: boolean) {
  return apiRequest<RecommendResponse>("/api/v1/recommend/", {
    method: "POST",
    body: values,
    auth: signedIn,
  });
}

export function fetchHistory() {
  return apiRequest<{ results: HistoryItem[] }>("/api/v1/recommend/history/");
}

export function deleteHistory(id: number) {
  return apiRequest<void>(`/api/v1/recommend/history/${id}/`, { method: "DELETE" });
}

export function fetchAdvisorWeather(location: string) {
  const qs = location.trim() ? `?location=${encodeURIComponent(location.trim())}` : "";
  return apiRequest<{ weather: AdvisorWeather | null; detail?: string }>(
    `/api/v1/recommend/weather/${qs}`
  );
}
