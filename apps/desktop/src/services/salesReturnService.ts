import { apiRequest } from "../lib/api";

import type {
  CreateSalesReturnValues,
  SalesReturnDetailsResponse,
  SalesReturnHistoryParameters,
  SalesReturnHistoryResponse,
  SalesReturnOptionsResponse,
  SalesReturnResponse,
} from "../types/salesReturn";

function createHistoryQuery(parameters: SalesReturnHistoryParameters): string {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 20));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.refundMethod) {
    query.set("refund_method", parameters.refundMethod);
  }

  if (parameters.dateFrom) {
    query.set("date_from", parameters.dateFrom);
  }

  if (parameters.dateTo) {
    query.set("date_to", parameters.dateTo);
  }

  return query.toString();
}

export async function getSalesReturnOptions(
  token: string,
  saleId: number
): Promise<SalesReturnOptionsResponse> {
  return apiRequest<SalesReturnOptionsResponse>(
    `/sales/${saleId}/return-options`,
    {
      method: "GET",
      token,
    }
  );
}

export async function createSalesReturn(
  token: string,
  saleId: number,
  values: CreateSalesReturnValues
): Promise<SalesReturnResponse> {
  return apiRequest<SalesReturnResponse>(`/sales/${saleId}/returns`, {
    method: "POST",
    token,

    body: JSON.stringify({
      reason: values.reason.trim(),

      refund_method: values.refund_method,

      notes: values.notes.trim() || null,

      items: values.items.map((item) => ({
        sale_item_id: item.sale_item_id,

        quantity: item.quantity,

        restock: item.restock,
      })),
    }),
  });
}

export async function getSalesReturns(
  token: string,
  parameters: SalesReturnHistoryParameters
): Promise<SalesReturnHistoryResponse> {
  return apiRequest<SalesReturnHistoryResponse>(
    `/sales-returns?${createHistoryQuery(parameters)}`,
    {
      method: "GET",
      token,
    }
  );
}

export async function getSalesReturnDetails(
  token: string,
  returnId: number
): Promise<SalesReturnDetailsResponse> {
  return apiRequest<SalesReturnDetailsResponse>(`/sales-returns/${returnId}`, {
    method: "GET",
    token,
  });
}
