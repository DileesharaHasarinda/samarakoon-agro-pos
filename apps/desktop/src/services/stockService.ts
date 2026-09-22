import { apiRequest } from "../lib/api";

import type {
  OpeningInventoryInput,
  OpeningInventoryResponse,
  StockProductListResponse,
} from "../types/stock";

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

export async function createOpeningInventory(
  token: string,
  values: OpeningInventoryInput
): Promise<OpeningInventoryResponse> {
  return apiRequest<OpeningInventoryResponse>("/opening-inventory", {
    method: "POST",
    token,

    body: JSON.stringify({
      supplier_id: values.supplier_id,

      product_id: values.product_id,

      product_variant_id: values.product_variant_id,

      purchase_cost: Number(values.purchase_cost),

      selling_price: Number(values.selling_price),

      available_quantity: Number(values.available_quantity),

      is_dual_unit: Boolean(values.is_dual_unit),

      conversion_factor:
        values.conversion_factor === null
          ? null
          : Number(values.conversion_factor),

      secondary_unit: values.secondary_unit,

      secondary_selling_price:
        values.secondary_selling_price === null
          ? null
          : Number(values.secondary_selling_price),

      loose_quantity: Number(values.loose_quantity),
    }),
  });
}
