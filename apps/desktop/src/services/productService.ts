import { apiRequest } from "../lib/api";

import type {
  ProductCategoryOptionsResponse,
  ProductDeleteResponse,
  ProductDetailsResponse,
  ProductInput,
  ProductListFilters,
  ProductListResponse,
  ProductOptionsResponse,
  ProductResponse,
} from "../types/product";

function buildProductQuery(filters: ProductListFilters): string {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.page) {
    params.set("page", String(filters.page));
  }

  if (filters.per_page) {
    params.set("per_page", String(filters.per_page));
  }

  const query = params.toString();

  return query ? `/products?${query}` : "/products";
}

export function getProducts(
  token: string,
  filters: ProductListFilters = {}
): Promise<ProductListResponse> {
  return apiRequest<ProductListResponse>(buildProductQuery(filters), {
    method: "GET",
    token,
  });
}

export function getProductDetails(
  token: string,
  productId: number
): Promise<ProductDetailsResponse> {
  return apiRequest<ProductDetailsResponse>(`/products/${productId}`, {
    method: "GET",
    token,
  });
}

export function getProductOptions(
  token: string
): Promise<ProductOptionsResponse> {
  return apiRequest<ProductOptionsResponse>("/products/options", {
    method: "GET",
    token,
  });
}

export function getProductCategoryOptions(
  token: string
): Promise<ProductCategoryOptionsResponse> {
  return apiRequest<ProductCategoryOptionsResponse>("/categories/options", {
    method: "GET",
    token,
  });
}

export function createProduct(
  token: string,
  values: ProductInput
): Promise<ProductResponse> {
  return apiRequest<ProductResponse>("/products", {
    method: "POST",
    token,

    body: JSON.stringify({
      category_id: values.category_id,

      name: values.name.trim(),

      unit: values.unit.trim(),

      barcode: values.barcode.trim() || null,
    }),
  });
}

export function updateProduct(
  token: string,
  productId: number,
  values: ProductInput
): Promise<ProductResponse> {
  return apiRequest<ProductResponse>(`/products/${productId}`, {
    method: "PUT",
    token,

    body: JSON.stringify({
      category_id: values.category_id,

      name: values.name.trim(),

      unit: values.unit.trim(),

      barcode: values.barcode.trim() || null,
    }),
  });
}

export function deleteProduct(
  token: string,
  productId: number
): Promise<ProductDeleteResponse> {
  return apiRequest<ProductDeleteResponse>(`/products/${productId}`, {
    method: "DELETE",
    token,
  });
}
