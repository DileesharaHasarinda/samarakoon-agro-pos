import { apiRequest } from "../lib/api";

import type {
  CategoryFormValues,
  CategoryListParameters,
  CategoryListResponse,
  CategoryResponse,
  DeleteCategoryResponse,
} from "../types/category";

function createCategoryQuery(parameters: CategoryListParameters): string {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 10));

  const search = parameters.search?.trim();

  if (search) {
    query.set("search", search);
  }

  return query.toString();
}

export async function getCategories(
  token: string,
  parameters: CategoryListParameters
): Promise<CategoryListResponse> {
  const query = createCategoryQuery(parameters);

  return apiRequest<CategoryListResponse>(`/categories?${query}`, {
    method: "GET",
    token,
  });
}

export async function createCategory(
  token: string,
  values: CategoryFormValues
): Promise<CategoryResponse> {
  return apiRequest<CategoryResponse>("/categories", {
    method: "POST",
    token,

    body: JSON.stringify({
      name: values.name,
      description: values.description || null,
    }),
  });
}

export async function updateCategory(
  token: string,
  categoryId: number,
  values: CategoryFormValues
): Promise<CategoryResponse> {
  return apiRequest<CategoryResponse>(`/categories/${categoryId}`, {
    method: "PUT",
    token,

    body: JSON.stringify({
      name: values.name,
      description: values.description || null,
    }),
  });
}

export async function deleteCategory(
  token: string,
  categoryId: number
): Promise<DeleteCategoryResponse> {
  return apiRequest<DeleteCategoryResponse>(`/categories/${categoryId}`, {
    method: "DELETE",
    token,
  });
}
