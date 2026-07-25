import { apiRequest } from "../lib/api";

import type {
  DeletePurchaseResponse,
  ProductOptionsResponse,
  PurchaseFormValues,
  PurchaseListParameters,
  PurchaseListResponse,
  PurchaseResponse,
  ReceivePurchaseItemValues,
} from "../types/purchase";

function createQuery(parameters: PurchaseListParameters): string {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 10));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.supplierId) {
    query.set("supplier_id", parameters.supplierId);
  }

  if (parameters.status) {
    query.set("status", parameters.status);
  }

  return query.toString();
}

function createPurchasePayload(values: PurchaseFormValues) {
  return {
    supplier_id: Number(values.supplier_id),

    supplier_invoice_number: values.supplier_invoice_number.trim() || null,

    purchase_date: values.purchase_date,

    discount: Number(values.discount || 0),

    additional_cost: Number(values.additional_cost || 0),

    notes: values.notes.trim() || null,

    receive_now: values.receive_now,

    items: values.items.map((item) => ({
      product_id: Number(item.product_id),

      quantity: Number(item.quantity),

      unit_cost: Number(item.unit_cost),

      selling_price: Number(item.selling_price),

      discount: Number(item.discount || 0),

      batch_number: item.batch_number.trim() || null,

      manufactured_date: item.manufactured_date || null,

      expiry_date: item.expiry_date || null,

      notes: item.notes.trim() || null,
    })),
  };
}

export async function getPurchaseProducts(
  token: string
): Promise<ProductOptionsResponse> {
  return apiRequest<ProductOptionsResponse>("/products/options", {
    method: "GET",
    token,
  });
}

export async function getPurchases(
  token: string,
  parameters: PurchaseListParameters
): Promise<PurchaseListResponse> {
  return apiRequest<PurchaseListResponse>(
    `/purchases?${createQuery(parameters)}`,
    {
      method: "GET",
      token,
    }
  );
}

export async function getPurchase(
  token: string,
  purchaseId: number
): Promise<PurchaseResponse> {
  return apiRequest<PurchaseResponse>(`/purchases/${purchaseId}`, {
    method: "GET",
    token,
  });
}

export async function createPurchase(
  token: string,
  values: PurchaseFormValues
): Promise<PurchaseResponse> {
  return apiRequest<PurchaseResponse>("/purchases", {
    method: "POST",
    token,

    body: JSON.stringify(createPurchasePayload(values)),
  });
}

export async function updatePurchase(
  token: string,
  purchaseId: number,
  values: PurchaseFormValues
): Promise<PurchaseResponse> {
  return apiRequest<PurchaseResponse>(`/purchases/${purchaseId}`, {
    method: "PUT",
    token,

    body: JSON.stringify(createPurchasePayload(values)),
  });
}

export async function receivePurchase(
  token: string,
  purchaseId: number,
  items: ReceivePurchaseItemValues[]
): Promise<PurchaseResponse> {
  return apiRequest<PurchaseResponse>(`/purchases/${purchaseId}/receive`, {
    method: "POST",
    token,

    body: JSON.stringify({
      items: items.map((item) => ({
        purchase_item_id: item.purchase_item_id,

        received_quantity: Number(item.received_quantity),

        selling_price: Number(item.selling_price),

        batch_number: item.batch_number.trim() || null,

        manufactured_date: item.manufactured_date || null,

        expiry_date: item.expiry_date || null,
      })),
    }),
  });
}

export async function deletePurchase(
  token: string,
  purchaseId: number
): Promise<DeletePurchaseResponse> {
  return apiRequest<DeletePurchaseResponse>(`/purchases/${purchaseId}`, {
    method: "DELETE",
    token,
  });
}
