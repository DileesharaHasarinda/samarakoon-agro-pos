import { apiRequest } from "../lib/api";

import type { StockProductListResponse } from "../types/stock";

interface StockListParameters {
  search?: string;
  categoryId?: string;
  page?: number;
  perPage?: number;
}

export async function getStockProducts(
  token: string,
  parameters: StockListParameters
): Promise<StockProductListResponse> {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 10));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.categoryId) {
    query.set("category_id", parameters.categoryId);
  }

  return apiRequest<StockProductListResponse>(`/stock/products?${query}`, {
    method: "GET",
    token,
  });
}
