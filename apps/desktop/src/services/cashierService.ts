import { apiRequest } from "../lib/api";

import type {
  CashierInput,
  CashierListResponse,
  CashierResponse,
  CashierUpdateInput,
} from "../types/cashier";

export async function getCashiers(
  token: string,
  parameters: {
    search?: string;
    status?: string;
    page?: number;
    perPage?: number;
  }
): Promise<CashierListResponse> {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 20));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.status) {
    query.set("status", parameters.status);
  }

  return apiRequest<CashierListResponse>(`/cashiers?${query.toString()}`, {
    method: "GET",
    token,
  });
}

export async function createCashier(
  token: string,
  values: CashierInput
): Promise<CashierResponse> {
  return apiRequest<CashierResponse>("/cashiers", {
    method: "POST",
    token,

    body: JSON.stringify({
      name: values.name.trim(),

      username: values.username.trim().toLowerCase(),

      email: values.email.trim().toLowerCase(),

      phone: values.phone.trim() || null,

      password: values.password,

      password_confirmation: values.password_confirmation,

      is_active: values.is_active,
    }),
  });
}

export async function updateCashier(
  token: string,
  cashierId: number,
  values: CashierUpdateInput
): Promise<CashierResponse> {
  return apiRequest<CashierResponse>(`/cashiers/${cashierId}`, {
    method: "PUT",
    token,

    body: JSON.stringify({
      name: values.name.trim(),

      username: values.username.trim().toLowerCase(),

      email: values.email.trim().toLowerCase(),

      phone: values.phone.trim() || null,

      is_active: values.is_active,
    }),
  });
}

export async function updateCashierStatus(
  token: string,
  cashierId: number,
  isActive: boolean
): Promise<CashierResponse> {
  return apiRequest<CashierResponse>(`/cashiers/${cashierId}/status`, {
    method: "PATCH",
    token,

    body: JSON.stringify({
      is_active: isActive,
    }),
  });
}

export async function resetCashierPassword(
  token: string,
  cashierId: number,
  password: string,
  confirmation: string
): Promise<{
  message: string;
}> {
  return apiRequest<{
    message: string;
  }>(`/cashiers/${cashierId}/password`, {
    method: "PUT",
    token,

    body: JSON.stringify({
      password,

      password_confirmation: confirmation,
    }),
  });
}
