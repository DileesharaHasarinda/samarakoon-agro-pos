export interface ProductCategory {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  cost_price: number;
  selling_price: number;
  reorder_level: number;
  unit: string;
  expiry_date: string | null;
  category: ProductCategory;
  created_at: string;
  updated_at: string;
}

export interface ProductFormValues {
  category_id: string;
  name: string;
  sku: string;
  barcode: string;
  description: string;
  cost_price: string;
  selling_price: string;
  reorder_level: string;
  unit: string;
  expiry_date: string;
}

export interface ProductPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface ProductListResponse {
  data: Product[];
  meta: ProductPaginationMeta;
}

export interface ProductResponse {
  message?: string;
  data: Product;
}

export interface DeleteProductResponse {
  message: string;
}

export interface CategoryOptionsResponse {
  data: ProductCategory[];
}

export interface ProductListParameters {
  search?: string;
  categoryId?: string;
  page?: number;
  perPage?: number;
}
