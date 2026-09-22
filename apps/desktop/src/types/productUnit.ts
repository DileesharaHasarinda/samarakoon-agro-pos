export interface ProductUnit {
  id: number;

  name: string;

  product_count: number;

  variant_count: number;

  is_in_use: boolean;

  created_at: string | null;

  updated_at: string | null;
}

export interface ProductUnitOption {
  id: number;

  name: string;
}

export interface ProductUnitPaginationMeta {
  current_page: number;

  last_page: number;

  per_page: number;

  total: number;

  from: number | null;

  to: number | null;
}

export interface ProductUnitListParameters {
  search?: string;

  page?: number;

  perPage?: number;
}

export interface ProductUnitListResponse {
  data: ProductUnit[];

  meta: ProductUnitPaginationMeta;
}

export interface ProductUnitOptionsResponse {
  data: ProductUnitOption[];
}

export interface ProductUnitResponse {
  message: string;

  data: ProductUnit;
}

export interface DeleteProductUnitResponse {
  message: string;
}

export interface ProductUnitInput {
  name: string;
}
