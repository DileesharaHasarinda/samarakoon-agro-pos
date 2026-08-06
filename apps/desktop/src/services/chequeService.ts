import { apiRequest } from "../lib/api";

import type {
  ChequeAlerts,
  ChequeFormValues,
  ChequeListResponse,
  ChequeResponse,
  ChequeStatus,
} from "../types/cheque";

export function getCheques(
  token: string,
  parameters: {
    search?: string;
    type?: string;
    status?: string;
    page?: number;
    perPage?: number;
  }
): Promise<ChequeListResponse> {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));
  query.set("per_page", String(parameters.perPage ?? 20));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.type) {
    query.set("type", parameters.type);
  }

  if (parameters.status) {
    query.set("status", parameters.status);
  }

  return apiRequest<ChequeListResponse>(`/cheques?${query.toString()}`, {
    method: "GET",
    token,
  });
}

export function createCheque(
  token: string,
  values: ChequeFormValues
): Promise<ChequeResponse> {
  return apiRequest<ChequeResponse>("/cheques", {
    method: "POST",
    token,
    body: JSON.stringify(values),
  });
}

export function updateCheque(
  token: string,
  chequeId: number,
  values: ChequeFormValues
): Promise<ChequeResponse> {
  return apiRequest<ChequeResponse>(`/cheques/${chequeId}`, {
    method: "PUT",
    token,
    body: JSON.stringify(values),
  });
}

export function updateChequeStatus(
  token: string,
  chequeId: number,
  status: ChequeStatus
): Promise<ChequeResponse> {
  return apiRequest<ChequeResponse>(`/cheques/${chequeId}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
  });
}

export function deleteCheque(
  token: string,
  chequeId: number
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/cheques/${chequeId}`, {
    method: "DELETE",
    token,
  });
}

export function getChequeAlerts(token: string): Promise<ChequeAlerts> {
  return apiRequest<ChequeAlerts>("/cheques/alerts", {
    method: "GET",
    token,
  });
}
