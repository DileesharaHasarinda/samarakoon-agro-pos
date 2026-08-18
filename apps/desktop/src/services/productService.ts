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
  UpdateStockBatchResponse,
  UpdateStockBatchValues,
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

function buildProductPayload(values: ProductInput) {
  return {
    category_id: values.category_id,

    name: values.name.trim(),

    unit: values.unit.trim(),

    barcode: values.barcode.trim() || null,

    variants: values.variants.map((variant) => ({
      id: variant.id,

      size_value: Number(variant.size_value),

      size_unit: variant.size_unit.trim(),

      package_unit: variant.package_unit.trim(),

      barcode: variant.barcode.trim() || null,

      is_active: variant.is_active,
    })),
  };
}

function buildStockBatchPayload(values: UpdateStockBatchValues) {
  return {
    selling_price: Number(values.selling_price),

    secondary_selling_price:
      values.secondary_selling_price === null
        ? null
        : Number(values.secondary_selling_price),

    available_quantity: Number(values.available_quantity),

    reason: values.reason.trim() || null,
  };
}

export function getProducts(
  token: string,
  filters: ProductListFilters = {}
): Promise<ProductListResponse> {
  return apiRequest(buildProductQuery(filters), {
    method: "GET",
    token,
  });
}

export function getProductDetails(
  token: string,
  productId: number
): Promise<ProductDetailsResponse> {
  return apiRequest(`/products/${productId}`, {
    method: "GET",
    token,
  });
}

export function getProductOptions(
  token: string
): Promise<ProductOptionsResponse> {
  return apiRequest("/products/options", {
    method: "GET",
    token,
  });
}

export function getProductCategoryOptions(
  token: string
): Promise<ProductCategoryOptionsResponse> {
  return apiRequest("/categories/options", {
    method: "GET",
    token,
  });
}

export function createProduct(
  token: string,
  values: ProductInput
): Promise<ProductResponse> {
  return apiRequest("/products", {
    method: "POST",
    token,

    body: JSON.stringify(buildProductPayload(values)),
  });
}

export function updateProduct(
  token: string,
  productId: number,
  values: ProductInput
): Promise<ProductResponse> {
  return apiRequest(`/products/${productId}`, {
    method: "PUT",
    token,

    body: JSON.stringify(buildProductPayload(values)),
  });
}

export function deleteProduct(
  token: string,
  productId: number
): Promise<ProductDeleteResponse> {
  return apiRequest(`/products/${productId}`, {
    method: "DELETE",
    token,
  });
}

export function updateStockBatch(
  token: string,
  stockBatchId: number,
  values: UpdateStockBatchValues
): Promise<UpdateStockBatchResponse> {
  return apiRequest(`/stock-batches/${stockBatchId}`, {
    method: "PATCH",
    token,

    body: JSON.stringify(buildStockBatchPayload(values)),
  });
}
