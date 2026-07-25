import { apiRequest } from "../lib/api";

import type {
  SaleDetailsResponse,
  SaleHistoryParameters,
  SaleHistoryResponse,
} from "../types/sale";

function createSalesQuery(parameters: SaleHistoryParameters): string {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 20));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.paymentMethod) {
    query.set("payment_method", parameters.paymentMethod);
  }

  if (parameters.dateFrom) {
    query.set("date_from", parameters.dateFrom);
  }

  if (parameters.dateTo) {
    query.set("date_to", parameters.dateTo);
  }

  return query.toString();
}

export async function getSalesHistory(
  token: string,
  parameters: SaleHistoryParameters
): Promise<SaleHistoryResponse> {
  return apiRequest<SaleHistoryResponse>(
    `/sales?${createSalesQuery(parameters)}`,
    {
      method: "GET",
      token,
    }
  );
}

export async function getSaleDetails(
  token: string,
  saleId: number
): Promise<SaleDetailsResponse> {
  return apiRequest<SaleDetailsResponse>(`/sales/${saleId}`, {
    method: "GET",
    token,
  });
}
