import { apiRequest } from "../lib/api";

import type {
  CompleteSaleResponse,
  CompleteSaleValues,
  PosCartItem,
  PosCategoryResponse,
  PosProductListParameters,
  PosProductListResponse,
  PosProductResponse,
} from "../types/sale";

function createProductQuery(parameters: PosProductListParameters): string {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 24));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.categoryId) {
    query.set("category_id", parameters.categoryId);
  }

  return query.toString();
}

export async function getPosCategories(
  token: string
): Promise<PosCategoryResponse> {
  return apiRequest("/pos/categories", {
    method: "GET",
    token,
  });
}

export async function getPosProducts(
  token: string,
  parameters: PosProductListParameters
): Promise<PosProductListResponse> {
  return apiRequest(`/pos/products?${createProductQuery(parameters)}`, {
    method: "GET",
    token,
  });
}

export async function getPosProduct(
  token: string,
  productId: number
): Promise<PosProductResponse> {
  return apiRequest(`/pos/products/${productId}`, {
    method: "GET",
    token,
  });
}

export async function completePosSale(
  token: string,
  cartItems: PosCartItem[],
  values: CompleteSaleValues
): Promise<CompleteSaleResponse> {
  return apiRequest("/sales", {
    method: "POST",
    token,

    body: JSON.stringify({
      customer_id: values.customer_id,

      settlement_type: values.settlement_type,

      discount: Number(values.discount || 0),

      payment_method: values.payment_method,

      amount_received: Number(values.amount_received || 0),

      due_date: values.due_date.trim() || null,

      reference_number: values.reference_number.trim() || null,

      notes: values.notes.trim() || null,

      items: cartItems.map((item) => ({
        stock_batch_id: item.stock_batch_id,

        quantity: Number(item.quantity),

        sale_unit: item.sale_unit.trim(),

        discount: Number(item.discount || 0),
      })),
    }),
  });
}
