import { apiRequest } from "@/lib/api";

export type FarmerOverview = {
  farm: { name: string; county: string; size_acres: number | null; crops: string[] };
  wallet: { balance: string; scans_used: number; free_scans_left: number; scan_fee: string };
  health: { score: number; risk_tier: string; opt_in_for_lending: boolean } | null;
  scans: {
    total: number;
    last_7_days: number;
    recent: {
      id: string;
      crop: string;
      status: string;
      result: string;
      health_status: string;
      confidence: number | null;
      created_at: string;
    }[];
  };
  advisor: {
    total: number;
    last:
      | {
          slug: string;
          name: string;
          name_sw?: string;
          image?: string | null;
          category_label?: string;
          confidence: number;
          location: string;
          created_at: string;
        }
      | null;
  };
};

export const fetchFarmerOverview = () => apiRequest<FarmerOverview>("/api/v1/farmer/overview/");
