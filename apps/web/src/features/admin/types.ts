import type { UserRole } from "@/lib/types";

import type { SeriesPoint } from "@/components/ui/charts";

export type { SeriesPoint };

export type AdminOverview = {
  kpis: {
    users_total: number;
    users_new_7d: number;
    revenue_total: string;
    revenue_30d: string;
    payments_pending: number;
    wallet_balances: string;
    scans_total: number;
    scans_7d: number;
    products_total: number;
    products_live: number;
    products_hidden: number;
    recommendations_total: number;
    recommendations_7d: number;
    lenders_pending: number;
  };
  series: {
    signups: SeriesPoint[];
    revenue: SeriesPoint[];
    scans: SeriesPoint[];
    recommendations: SeriesPoint[];
  };
  breakdown: {
    roles: { role: UserRole; count: number }[];
    scan_status: { status: string; count: number }[];
    top_crops: { slug: string; name: string; count: number }[];
    product_categories: { category: string; label: string; count: number }[];
  };
  recent: {
    users: AdminUserRow[];
    transactions: { id: number; username: string; amount: string; status: string; created_at: string }[];
    pending_lenders: {
      id: number;
      organization_name: string;
      organization_type: string;
      county: string;
      created_at: string;
    }[];
  };
  generated_at: string;
};

export type AdminUserRow = {
  id: number;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  detail: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  last_login: string | null;
};

export type AdminUsersResponse = {
  results: AdminUserRow[];
  count: number;
  page: number;
  pages: number;
  role_totals: Record<"farmer" | "agency" | "lender" | "admin", number>;
};

export type AdminProductRow = {
  id: number;
  name: string;
  category: string;
  category_label: string;
  description: string;
  price: string | null;
  unit: string;
  image: string | null;
  created_at: string;
  updated_at: string;
  seller: { id: number; name: string; type_label: string; county: string; phone: string | null };
  is_available: boolean;
  is_hidden: boolean;
};

export type AdminProductsResponse = {
  results: AdminProductRow[];
  count: number;
  page: number;
  pages: number;
  totals: { all: number; live: number; hidden: number; unavailable: number };
};

export type AdminRecommendationStats = {
  total: number;
  last_7_days: number;
  users: number;
  top_crops: { slug: string; name: string; image?: string | null; count: number }[];
  recent: {
    id: number;
    username: string;
    top_crop: string;
    confidence: number;
    location: string;
    created_at: string;
  }[];
  model: { version: string; algorithm: string; accuracy: number; dataset_rows: number; crops: number };
};

export type RevenueData = {
  total_revenue: string;
  successful_transactions: number;
  pending_transactions: number;
  users: { total: number; farmers: number; lenders: number };
  recent_transactions: {
    id: number;
    username: string;
    amount: string;
    status: string;
    receipt_number: string | null;
    created_at: string;
  }[];
};
