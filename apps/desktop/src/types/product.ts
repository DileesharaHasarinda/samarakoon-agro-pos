export interface ProductCategory {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
  is_active: boolean;
  category: ProductCategory | null;
  total_available_quantity: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductInput {
  category_id: number | null;
  name: string;
  unit: string;
  barcode: string;
}

export interface ProductOption {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
  category: ProductCategory | null;
}

export interface ProductPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface ProductListFilters {
  search?: string;
  page?: number;
  per_page?: number;
}

export interface ProductListResponse {
  data: Product[];
  meta: ProductPaginationMeta;
}

export interface ProductResponse {
  message: string;
  data: Product;
}

export interface ProductOptionsResponse {
  data: ProductOption[];
}

export interface ProductCategoryOptionsResponse {
  data: ProductCategory[];
}

export interface ProductDeleteResponse {
  message: string;
}

export type ProductBatchStatus =
  "available" | "expiring_soon" | "expired" | "out_of_stock";

export interface ProductBatchSupplier {
  id: number;
  name: string;
}

export interface ProductBatchDetails {
  id: number;

  purchase_item_id: number | null;

  purchase_id: number | null;

  purchase_number: string | null;

  purchase_date: string | null;

  supplier: ProductBatchSupplier | null;

  batch_code: string | null;

  batch_number: string | null;

  purchased_quantity: number;

  received_quantity: number;

  available_quantity: number;

  unit_cost: number | null;

  cost_price: number | null;

  selling_price: number;

  profit_per_unit: number | null;

  discount: number;

  line_total: number | null;

  current_cost_value: number;

  current_sale_value: number;

  manufactured_date: string | null;

  expiry_date: string | null;

  received_at: string | null;

  notes: string | null;

  status: ProductBatchStatus;
}

export interface ProductPriceOption {
  selling_price: number;

  cost_price_min: number | null;

  cost_price_max: number | null;

  available_quantity: number;

  saleable_quantity: number;

  expired_quantity: number;

  batch_count: number;

  batches: ProductBatchDetails[];
}

export interface ProductDetailsSummary {
  number_of_batches: number;

  number_of_price_options: number;

  total_received_quantity: number;

  total_available_quantity: number;

  saleable_quantity: number;

  expired_quantity: number;

  total_stock_value_at_cost: number;

  total_stock_value_at_sale: number;

  potential_gross_profit: number;
}

export interface ProductDetails {
  id: number;

  name: string;

  sku: string;

  barcode: string | null;

  unit: string;

  is_active: boolean;

  category: ProductCategory | null;

  created_at: string | null;

  updated_at: string | null;

  summary: ProductDetailsSummary;

  price_options: ProductPriceOption[];

  batches: ProductBatchDetails[];
}

export interface ProductDetailsResponse {
  data: ProductDetails;
}
