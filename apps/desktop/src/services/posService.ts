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
  return apiRequest<PosCategoryResponse>("/pos/categories", {
    method: "GET",
    token,
  });
}

export async function getPosProducts(
  token: string,
  parameters: PosProductListParameters
): Promise<PosProductListResponse> {
  return apiRequest<PosProductListResponse>(
    `/pos/products?${createProductQuery(parameters)}`,
    {
      method: "GET",
      token,
    }
  );
}

export async function getPosProduct(
  token: string,
  productId: number
): Promise<PosProductResponse> {
  return apiRequest<PosProductResponse>(`/pos/products/${productId}`, {
    method: "GET",
    token,
  });
}

export async function completePosSale(
  token: string,
  cartItems: PosCartItem[],
  values: CompleteSaleValues
): Promise<CompleteSaleResponse> {
  return apiRequest<CompleteSaleResponse>("/sales", {
    method: "POST",
    token,

    body: JSON.stringify({
      discount: values.discount,

      payment_method: values.payment_method,

      amount_received: values.amount_received,

      reference_number: values.reference_number.trim() || null,

      notes: values.notes.trim() || null,

      items: cartItems.map((item) => ({
        stock_batch_id: item.stock_batch_id,

        quantity: item.quantity,

        discount: item.discount,
      })),
    }),
  });
}
