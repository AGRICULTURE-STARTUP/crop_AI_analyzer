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

export type FarmerProfile = {
  phone_number?: string | null;
  county?: string | null;
  country?: string | null;
  products?: string | null;
  farm_name?: string | null;
  farm_size_acres?: string | number | null;
  profile_photo?: string | null;
  health_score?: number | null;
  risk_tier?: string | null;
  opt_in_for_lending?: boolean;
  last_calculated?: string | null;
};

export type BuyerProfile = {
  phone_number?: string | null;
  county?: string | null;
  country?: string | null;
  first_name?: string | null;
  email?: string | null;
  photo?: string | null;
  verified?: boolean;
  verification_badge?: string;
};

export type MeResponse = {
  user: AuthUser;
  role: UserRole;
  profile: FarmerProfile | BuyerProfile | Record<string, unknown> | null;
  wallet: Wallet | null;
};

export type TokenPair = {
  access: string;
  refresh: string;
};

export type ScanWeather = {
  location?: string;
  temperature_celsius?: number | string;
  humidity_percent?: number | string;
  wind_speed_m_s?: number | string;
  rainfall_1h_mm?: number | string;
};

export type WeatherResponse = {
  weather: ScanWeather | null;
  detail?: string;
};

export type ScanReport = {
  disease: string;
  crop: string;
  health_status: "healthy" | "diseased" | string;
  confidence_pct: number;
  location?: string;
  weather?: ScanWeather | null;
  weather_note?: string;
  cause: string;
  symptoms: string;
  remedy: string;
  medicine: string[];
  prevention: string[];
  local_tip: string;
};

export type ScanJob = {
  id: string;
  crop: string;
  status: "queued" | "processing" | "completed" | "rejected" | "failed";
  result_label: string;
  confidence: number | null;
  report?: ScanReport | null;
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

export type AgencyProduct = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: string | null;
  unit: string;
  image: string | null;
  is_available: boolean;
  /** Hidden from the marketplace by an AgriScan admin. */
  is_hidden?: boolean;
  created_at: string;
  updated_at?: string;
};

export type AgencyProductPublic = AgencyProduct & {
  agency_id: number;
  agency_name: string;
  agency_type: string;
  agency_phone: string;
  county: string;
};

export type InputAgency = {
  id: number;
  agency_name: string;
  agency_type: string;
  phone: string;
  county: string;
  product_count: number;
  created_at: string;
};
