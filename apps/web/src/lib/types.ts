export type UserRole = "farmer" | "buyer" | "agency" | "lender" | "admin" | "user";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
};

export type Wallet = {
  balance: string;
  scan_count: number;
  chat_count: number;
  last_updated?: string;
};

export type MeResponse = {
  user: AuthUser;
  role: UserRole;
  profile: Record<string, unknown> | null;
  wallet: Wallet | null;
};

export type TokenPair = {
  access: string;
  refresh: string;
};

export type ScanJob = {
  id: string;
  crop: string;
  status: "queued" | "processing" | "completed" | "rejected" | "failed";
  result_label: string;
  confidence: number | null;
  gatekeeper_passed: boolean | null;
  error_message: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  wallet_balance?: string;
};

export type CropCatalogItem = {
  crop: string;
  classes: string[];
  supported: boolean;
};

export type LendingPartner = {
  id: number;
  organization_name: string;
  organization_type: string;
  registration_number: string;
  contact_phone: string;
  county: string;
  website: string;
  verification_status: "pending" | "approved" | "suspended" | "rejected";
  verified_at: string | null;
  created_at: string;
};

export type LendingAPIKeyMeta = {
  id: number;
  name: string;
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
};
