export interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string;
  secondary_phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierOption {
  id: number;
  name: string;
  phone: string;
}

export interface SupplierFormValues {
  name: string;
  contact_person: string;
  phone: string;
  secondary_phone: string;
  email: string;
  address: string;
  notes: string;
}

export interface SupplierPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface SupplierListResponse {
  data: Supplier[];
  meta: SupplierPaginationMeta;
}

export interface SupplierResponse {
  message?: string;
  data: Supplier;
}

export interface DeleteSupplierResponse {
  message: string;
}

export interface SupplierOptionsResponse {
  data: SupplierOption[];
}

export interface SupplierListParameters {
  search?: string;
  page?: number;
  perPage?: number;
}
