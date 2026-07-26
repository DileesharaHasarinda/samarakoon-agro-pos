import { apiRequest } from "../lib/api";

import type {
  DueListResponse,
  DuePaymentInput,
  DueSaleResponse,
} from "../types/customer";

export async function getCustomerDues(
  token: string,
  parameters: {
    search?: string;
    status?: string;
    page?: number;
    perPage?: number;
  }
): Promise<DueListResponse> {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 20));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.status) {
    query.set("status", parameters.status);
  }

  return apiRequest<DueListResponse>(`/customer-dues?${query.toString()}`, {
    method: "GET",
    token,
  });
}

export async function getDueSale(
  token: string,
  saleId: number
): Promise<DueSaleResponse> {
  return apiRequest<DueSaleResponse>(`/customer-dues/${saleId}`, {
    method: "GET",
    token,
  });
}

export async function recordDuePayment(
  token: string,
  saleId: number,
  values: DuePaymentInput
): Promise<DueSaleResponse> {
  return apiRequest<DueSaleResponse>(`/sales/${saleId}/due-payments`, {
    method: "POST",
    token,

    body: JSON.stringify({
      amount: values.amount,

      payment_method: values.payment_method,

      reference_number: values.reference_number.trim() || null,

      notes: values.notes.trim() || null,
    }),
  });
}
