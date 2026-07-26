import { apiRequest } from "../lib/api";

import type {
  CustomerInput,
  CustomerListResponse,
  CustomerOptionsResponse,
  CustomerResponse,
} from "../types/customer";

export async function getCustomers(
  token: string,
  parameters: {
    search?: string;
    status?: string;
    page?: number;
    perPage?: number;
  }
): Promise<CustomerListResponse> {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 20));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.status) {
    query.set("status", parameters.status);
  }

  return apiRequest<CustomerListResponse>(`/customers?${query.toString()}`, {
    method: "GET",
    token,
  });
}

export async function getCustomerOptions(
  token: string,
  search = ""
): Promise<CustomerOptionsResponse> {
  const query = new URLSearchParams();

  if (search.trim()) {
    query.set("search", search.trim());
  }

  return apiRequest<CustomerOptionsResponse>(
    `/customers/options?${query.toString()}`,
    {
      method: "GET",
      token,
    }
  );
}

export async function createCustomer(
  token: string,
  values: CustomerInput
): Promise<CustomerResponse> {
  return apiRequest<CustomerResponse>("/customers", {
    method: "POST",
    token,
    body: JSON.stringify(values),
  });
}

export async function updateCustomer(
  token: string,
  customerId: number,
  values: CustomerInput
): Promise<CustomerResponse> {
  return apiRequest<CustomerResponse>(`/customers/${customerId}`, {
    method: "PUT",
    token,
    body: JSON.stringify(values),
  });
}

export async function deleteCustomer(
  token: string,
  customerId: number
): Promise<{
  message: string;
}> {
  return apiRequest<{
    message: string;
  }>(`/customers/${customerId}`, {
    method: "DELETE",
    token,
  });
}
