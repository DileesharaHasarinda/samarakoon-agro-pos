import { apiRequest } from "../lib/api";

import type {
  DeleteSupplierResponse,
  SupplierFormValues,
  SupplierListParameters,
  SupplierListResponse,
  SupplierOptionsResponse,
  SupplierResponse,
} from "../types/supplier";

function createSupplierQuery(parameters: SupplierListParameters): string {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 10));

  const search = parameters.search?.trim();

  if (search) {
    query.set("search", search);
  }

  return query.toString();
}

function createSupplierPayload(values: SupplierFormValues) {
  return {
    name: values.name.trim(),

    contact_person: values.contact_person.trim() || null,

    phone: values.phone.trim(),

    secondary_phone: values.secondary_phone.trim() || null,

    email: values.email.trim().toLowerCase() || null,

    address: values.address.trim() || null,

    notes: values.notes.trim() || null,
  };
}

export async function getSuppliers(
  token: string,
  parameters: SupplierListParameters
): Promise<SupplierListResponse> {
  const query = createSupplierQuery(parameters);

  return apiRequest<SupplierListResponse>(`/suppliers?${query}`, {
    method: "GET",
    token,
  });
}

export async function getSupplierOptions(
  token: string
): Promise<SupplierOptionsResponse> {
  return apiRequest<SupplierOptionsResponse>("/suppliers/options", {
    method: "GET",
    token,
  });
}

export async function createSupplier(
  token: string,
  values: SupplierFormValues
): Promise<SupplierResponse> {
  return apiRequest<SupplierResponse>("/suppliers", {
    method: "POST",
    token,

    body: JSON.stringify(createSupplierPayload(values)),
  });
}

export async function updateSupplier(
  token: string,
  supplierId: number,
  values: SupplierFormValues
): Promise<SupplierResponse> {
  return apiRequest<SupplierResponse>(`/suppliers/${supplierId}`, {
    method: "PUT",
    token,

    body: JSON.stringify(createSupplierPayload(values)),
  });
}

export async function deleteSupplier(
  token: string,
  supplierId: number
): Promise<DeleteSupplierResponse> {
  return apiRequest<DeleteSupplierResponse>(`/suppliers/${supplierId}`, {
    method: "DELETE",
    token,
  });
}
