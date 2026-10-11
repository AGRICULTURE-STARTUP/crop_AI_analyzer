export type FeatureKey = "N" | "P" | "K" | "temperature" | "humidity" | "ph" | "rainfall";

export type SoilClimate = Record<FeatureKey, number>;

export type CropCategory = "cereal" | "pulse" | "fruit" | "cash";

export type CropMeta = {
  slug: string;
  name: string;
  name_sw: string;
  category: CropCategory;
  category_label: string;
  image: string | null;
};

export type FeatureStats = { min: number; p10: number; mean: number; p90: number; max: number };

export type CropWithStats = CropMeta & { stats: Record<FeatureKey, FeatureStats> };

export type CropResult = CropMeta & {
  /** Model probability (Gaussian Naive Bayes), 0–1. */
  confidence: number;
  /** How many of the 7 inputs fall in the crop's typical range. */
  in_range: number;
};

export type FitItem = {
  feature: FeatureKey;
  value: number;
  ideal_min: number;
  ideal_max: number;
  mean: number;
  status: "low" | "ok" | "high";
};

export type ModelInfo = {
  version: string;
  algorithm: string;
  accuracy: number;
  dataset_rows: number;
  crops: number;
  /** Lowest and highest value of each input across all training records. */
  feature_range: Record<FeatureKey, [number, number]>;
};

export type RecommendResponse = {
  id: number | null;
  saved: boolean;
  inputs: SoilClimate;
  top: CropResult;
  results: CropResult[];
  fit: FitItem[];
  warnings: { feature: FeatureKey; value: number; min: number; max: number }[];
  model: ModelInfo;
};

export type HistoryItem = {
  id: number;
  created_at: string;
  location: string;
  inputs: SoilClimate;
  top: CropMeta & { confidence: number };
  results: CropResult[];
};

export type CatalogResponse = {
  crops: CropWithStats[];
  features: { key: FeatureKey; label: string; unit: string }[];
  model: ModelInfo;
};

export type CropDetailResponse = {
  crop: CropWithStats;
  features: { key: FeatureKey; label: string; unit: string }[];
  model: ModelInfo;
};

export type AdvisorWeather = {
  location: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  rainfall_basis: string;
  description: string;
};
