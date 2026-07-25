import { apiRequest } from "../lib/api";

import type {
  CategoryOptionsResponse,
  DeleteProductResponse,
  ProductFormValues,
  ProductListParameters,
  ProductListResponse,
  ProductResponse,
} from "../types/product";

function createProductQuery(parameters: ProductListParameters): string {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 10));

  const search = parameters.search?.trim();

  if (search) {
    query.set("search", search);
  }

  if (parameters.categoryId) {
    query.set("category_id", parameters.categoryId);
  }

  return query.toString();
}

function createProductPayload(values: ProductFormValues) {
  return {
    category_id: Number(values.category_id),

    name: values.name.trim(),

    sku: values.sku.trim() || null,

    barcode: values.barcode.trim() || null,

    description: values.description.trim() || null,

    cost_price: Number(values.cost_price),

    selling_price: Number(values.selling_price),

    reorder_level: Number(values.reorder_level),

    unit: values.unit,

    expiry_date: values.expiry_date || null,
  };
}

export async function getProductCategoryOptions(
  token: string
): Promise<CategoryOptionsResponse> {
  return apiRequest<CategoryOptionsResponse>("/categories/options", {
    method: "GET",
    token,
  });
}

export async function getProducts(
  token: string,
  parameters: ProductListParameters
): Promise<ProductListResponse> {
  const query = createProductQuery(parameters);

  return apiRequest<ProductListResponse>(`/products?${query}`, {
    method: "GET",
    token,
  });
}

export async function createProduct(
  token: string,
  values: ProductFormValues
): Promise<ProductResponse> {
  return apiRequest<ProductResponse>("/products", {
    method: "POST",
    token,

    body: JSON.stringify(createProductPayload(values)),
  });
}

export async function updateProduct(
  token: string,
  productId: number,
  values: ProductFormValues
): Promise<ProductResponse> {
  return apiRequest<ProductResponse>(`/products/${productId}`, {
    method: "PUT",
    token,

    body: JSON.stringify(createProductPayload(values)),
  });
}

export async function deleteProduct(
  token: string,
  productId: number
): Promise<DeleteProductResponse> {
  return apiRequest<DeleteProductResponse>(`/products/${productId}`, {
    method: "DELETE",
    token,
  });
}
