export interface Category {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryFormValues {
  name: string;
  description: string;
}

export interface CategoryPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface CategoryListResponse {
  data: Category[];
  meta: CategoryPaginationMeta;
}

export interface CategoryResponse {
  message?: string;
  data: Category;
}

export interface DeleteCategoryResponse {
  message: string;
}

export interface CategoryListParameters {
  search?: string;
  page?: number;
  perPage?: number;
}
