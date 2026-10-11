export type KamisPriceRow = {
  commodity: string;
  classification: string;
  grade: string;
  market: string;
  /** e.g. "80.00/Kg" */
  wholesale: string;
  retail: string;
  supply_volume: string;
  county: string;
  date: string;
};

export type KamisPricesResponse = {
  crop: string;
  location?: string;
  matched_commodities: string[];
  count: number;
  results: KamisPriceRow[];
  detail?: string;
};

export type DirectoryBuyer = {
  id?: number;
  name?: string;
  first_name?: string;
  email?: string;
  phone_number?: string;
  contact?: string;
  county?: string;
  country?: string;
  location?: string;
  photo?: string | null;
  verified?: boolean;
  verification_badge?: string;
};

export type DirectoryFarmer = {
  id?: number;
  username?: string;
  name?: string;
  county?: string;
  country?: string;
  location?: string;
  products?: string;
  phone_number?: string;
  farm_name?: string;
  farm_size_acres?: string;
  photo?: string | null;
};
