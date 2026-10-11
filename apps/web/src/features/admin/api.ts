import { apiRequest } from "@/lib/api";
import type { LendingPartner } from "@/lib/types";
import type {
  AdminOverview,
  AdminProductRow,
  AdminProductsResponse,
  AdminRecommendationStats,
  AdminUserRow,
  AdminUsersResponse,
  RevenueData,
} from "./types";

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const fetchOverview = () => apiRequest<AdminOverview>("/api/v1/admin/overview/");

export const fetchRevenue = () => apiRequest<RevenueData>("/api/v1/admin/revenue/");

export const fetchUsers = (params: { role?: string; q?: string; status?: string; page?: number }) =>
  apiRequest<AdminUsersResponse>(`/api/v1/admin/users/${qs(params)}`);

export const setUserActive = (id: number, isActive: boolean) =>
  apiRequest<AdminUserRow>(`/api/v1/admin/users/${id}/active/`, {
    method: "POST",
    body: { is_active: isActive },
  });

export const fetchAdminProducts = (params: { q?: string; category?: string; status?: string; page?: number }) =>
  apiRequest<AdminProductsResponse>(`/api/v1/admin/products/${qs(params)}`);

export const setProductHidden = (id: number, isHidden: boolean) =>
  apiRequest<AdminProductRow>(`/api/v1/admin/products/${id}/visibility/`, {
    method: "POST",
    body: { is_hidden: isHidden },
  });

export const fetchRecommendationStats = () =>
  apiRequest<AdminRecommendationStats>("/api/v1/admin/recommendations/");

export async function fetchLenders(): Promise<LendingPartner[]> {
  const data = await apiRequest<LendingPartner[] | { results: LendingPartner[] }>("/api/v1/admin/lenders/");
  return Array.isArray(data) ? data : data.results || [];
}

export const lenderAction = (id: number, action: "approve" | "suspend") =>
  apiRequest<LendingPartner>(`/api/v1/admin/lenders/${id}/${action}/`, { method: "POST" });
