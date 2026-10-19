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
