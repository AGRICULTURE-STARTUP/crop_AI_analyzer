export type ProductCategory = "fertiliser" | "seed" | "pesticide" | "equipment" | "other";

export type StoreSeller = {
  id: number;
  name: string;
  type: string;
  type_label: string;
  county: string;
  /** Only present for signed-in users. */
  phone: string | null;
};

export type StoreProduct = {
  id: number;
  name: string;
  category: ProductCategory | string;
  category_label: string;
  description: string;
  price: string | null;
  unit: string;
  image: string | null;
  created_at: string;
  updated_at: string;
  seller: StoreSeller;
};

export type CategoryFacet = { value: string; label: string; count: number };

export type StoreListResponse = {
  results: StoreProduct[];
  count: number;
  page: number;
  pages: number;
  page_size: number;
  sort: StoreSort;
  facets: {
    categories: CategoryFacet[];
    counties: string[];
    price: { min: string | null; max: string | null };
  };
  contact_visible: boolean;
};

export type StoreDetailResponse = {
  product: StoreProduct;
  seller: StoreSeller & { product_count: number; member_since: string };
  related: StoreProduct[];
  more_from_seller: StoreProduct[];
  contact_visible: boolean;
};

export type StoreSort = "newest" | "price_asc" | "price_desc" | "name";

export type StoreQuery = {
  q?: string;
  category?: string;
  county?: string;
  seller?: string;
  min_price?: string;
  max_price?: string;
  sort?: StoreSort;
  page?: number;
  page_size?: number;
};
