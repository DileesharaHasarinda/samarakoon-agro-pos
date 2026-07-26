import type { PosPaginationMeta, PosPaymentMethod } from "./sale";

export type CustomerType = "retail" | "wholesale";

export interface Customer {
  id: number;
  customer_code: string;
  name: string;
  mobile: string | null;
  secondary_mobile: string | null;
  email: string | null;
  address: string | null;
  customer_type: CustomerType;
  credit_limit: number;
  outstanding_due: number;
  sales_count: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerInput {
  name: string;
  mobile: string;
  secondary_mobile: string;
  email: string;
  address: string;
  customer_type: CustomerType;
  credit_limit: number;
  notes: string;
  is_active: boolean;
}

export interface CustomerListResponse {
  data: Customer[];
  meta: PosPaginationMeta;
}

export interface CustomerOptionsResponse {
  data: Customer[];
}

export interface CustomerResponse {
  message?: string;
  data: Customer;
}

export interface DueSale {
  id: number;
  sale_number: string;
  sale_date: string;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  due_date: string | null;
  is_overdue: boolean;
  payment_status: string;
  settlement_type: string;

  customer: {
    id: number;
    customer_code: string;
    name: string;
    mobile: string | null;
    credit_limit: number;
  };

  created_by: {
    id: number;
    name: string;
    username?: string;
  };
}

export interface DuePayment {
  id: number;
  payment_method: PosPaymentMethod;
  payment_type: string;
  amount: number;
  reference_number: string | null;
  notes: string | null;

  created_by: {
    id: number;
    name: string;
  } | null;

  created_at: string;
}

export interface DueSaleDetails extends DueSale {
  payments: DuePayment[];
}

export interface DueSummary {
  due_sales: number;
  outstanding_due: number;
  collected_amount: number;
}

export interface DueListResponse {
  data: DueSale[];
  summary: DueSummary;
  meta: PosPaginationMeta;
}

export interface DueSaleResponse {
  message?: string;
  data: DueSaleDetails;
}

export interface DuePaymentInput {
  amount: number;
  payment_method: PosPaymentMethod;
  reference_number: string;
  notes: string;
}
