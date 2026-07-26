import type { PosPaginationMeta } from "./sale";

export type SupplierPaymentMethod =
  "cash" | "card" | "bank_transfer" | "cheque";

export type PurchaseSettlementType = "full" | "partial" | "due";

export interface SupplierPayable {
  id: number;
  purchase_number: string;
  purchase_date: string;
  grand_total: number;
  payment_status: string;

  settlement_type: PurchaseSettlementType | null;

  paid_amount: number;
  due_amount: number;
  due_date: string | null;
  payment_terms: string | null;
  is_overdue: boolean;
  payments_count: number;

  supplier: {
    id: number;
    name: string;
  };

  created_by: {
    id: number;
    name: string;
  };

  created_at: string;
}

export interface SupplierPayment {
  id: number;
  payment_method: SupplierPaymentMethod;
  payment_type: string;
  amount: number;
  reference_number: string | null;
  notes: string | null;
  payment_date: string;

  created_by: {
    id: number;
    name: string;
  };
}

export interface SupplierPayableDetails extends SupplierPayable {
  payments: SupplierPayment[];
}

export interface SupplierPayableSummary {
  total_purchases: number;
  unconfigured_purchases: number;
  outstanding_purchases: number;
  outstanding_due: number;
  overdue_due: number;
  total_paid: number;
}

export interface SupplierPayableResponse {
  data: SupplierPayable[];
  summary: SupplierPayableSummary;
  meta: PosPaginationMeta;
}

export interface SupplierPayableDetailsResponse {
  message?: string;
  data: SupplierPayableDetails;
}

export interface ConfigurePurchaseSettlementInput {
  settlement_type: PurchaseSettlementType;
  initial_paid_amount: number;
  payment_method: SupplierPaymentMethod | null;
  due_date: string;
  payment_terms: string;
  reference_number: string;
  notes: string;
}

export interface SupplierPaymentInput {
  amount: number;
  payment_method: SupplierPaymentMethod;
  reference_number: string;
  notes: string;
}
