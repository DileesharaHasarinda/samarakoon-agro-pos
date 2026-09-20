import { apiRequest } from "../lib/api";

import type {
  PosProductListParameters,
  PosProductListResponse,
} from "../types/sale";

/*
 * =========================================================
 * TRAINING / ALL PRODUCTS CATALOGUE SERVICE
 * =========================================================
 *
 * include_all=1 tells the POS catalogue endpoint to return every
 * catalogue product, including zero-stock and never-purchased products.
 *
 * This service only READS catalogue data. Training bills are never
 * submitted through the real sale endpoint.
 */

export async function getAllProductsForSale(
  token: string,
  parameters: PosProductListParameters = {}
): Promise<PosProductListResponse> {
  const query = new URLSearchParams();

  query.set("include_all", "1");

  if (parameters.search && parameters.search.trim() !== "") {
    query.set("search", parameters.search.trim());
  }

  if (parameters.categoryId && parameters.categoryId.trim() !== "") {
    query.set("category_id", parameters.categoryId.trim());
  }

  if (parameters.page !== undefined) {
    query.set("page", String(parameters.page));
  }

  if (parameters.perPage !== undefined) {
    query.set("per_page", String(parameters.perPage));
  }

  return apiRequest<PosProductListResponse>(
    `/pos/products?${query.toString()}`,
    {
      method: "GET",
      token,
    }
  );
}
