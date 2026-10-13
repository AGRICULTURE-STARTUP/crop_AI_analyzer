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

/** Weather by place name, or by the farmer's geolocation (lat/lon). */
export function fetchAdvisorWeather(input: string | { lat: number; lon: number }) {
  const qs =
    typeof input === "string"
      ? input.trim()
        ? `?location=${encodeURIComponent(input.trim())}`
        : ""
      : `?lat=${input.lat}&lon=${input.lon}`;
  return apiRequest<{ weather: AdvisorWeather | null; detail?: string }>(
    `/api/v1/recommend/weather/${qs}`
  );
}
