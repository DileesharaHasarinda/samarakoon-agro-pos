import type { PosPaginationMeta, PosPaymentMethod, SaleCashier } from "./sale";

export interface SalesReturnOptionItem {
  sale_item_id: number;
  sold_quantity: number;
  returned_quantity: number;
  remaining_quantity: number;
  remaining_refund_amount: number;
  selling_price: number;

  product: {
    id: number;
    name: string;
    unit: string;
    sku: string | null;
    barcode: string | null;
  };

  batch: {
    id: number;
    batch_code: string;
    batch_number: string | null;
    expiry_date: string | null;
  };
}

export interface SalesReturnOptions {
  sale: {
    id: number;
    sale_number: string;
    sale_date: string;
    grand_total: number;
    discount: number;
    created_by: SaleCashier;
  };

  items: SalesReturnOptionItem[];
  has_returnable_items: boolean;
}

export interface SalesReturnOptionsResponse {
  data: SalesReturnOptions;
}

export interface CreateSalesReturnItem {
  sale_item_id: number;
  quantity: number;
  restock: boolean;
}

export interface CreateSalesReturnValues {
  reason: string;
  refund_method: PosPaymentMethod;
  notes: string;
  items: CreateSalesReturnItem[];
}

export interface SalesReturnItem {
  id: number;
  sale_item_id: number;
  quantity: number;
  purchase_cost: number | null;
  selling_price: number;
  item_discount_reversal: number;
  sale_discount_reversal: number;
  refund_amount: number;
  cost_value: number | null;
  profit_reversal: number | null;
  restocked: boolean;

  product: {
    id: number;
    name: string;
    unit: string;
    sku: string | null;
    barcode: string | null;
  };

  batch: {
    id: number;
    batch_code: string;
    batch_number: string | null;
    expiry_date: string | null;
  };
}

export interface SalesReturnHistoryItem {
  id: number;
  return_number: string;
  return_date: string;
  refund_method: PosPaymentMethod;
  refund_amount: number;
  profit_reversal: number | null;
  restocked_quantity: number;
  reason: string;
  notes: string | null;
  status: string;
  items_count: number;
  total_quantity: number;

  sale: {
    id: number;
    sale_number: string;
    sale_date: string;
  };

  created_by: SaleCashier;
  created_at: string;
}

export interface SalesReturnDetails extends SalesReturnHistoryItem {
  cost_value: number | null;

  sale: {
    id: number;
    sale_number: string;
    sale_date: string;
    grand_total: number;
    created_by: SaleCashier;
  };

  items: SalesReturnItem[];
}

export interface SalesReturnSummary {
  total_returns: number;
  total_refund: number;
  total_returned_quantity: number;
  total_restocked_quantity: number;
  profit_reversal: number | null;
}

export interface SalesReturnHistoryResponse {
  data: SalesReturnHistoryItem[];
  summary: SalesReturnSummary;
  meta: PosPaginationMeta;
}

export interface SalesReturnResponse {
  message: string;
  data: SalesReturnDetails;
}

export interface SalesReturnDetailsResponse {
  data: SalesReturnDetails;
}

export interface SalesReturnHistoryParameters {
  search?: string;
  refundMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
}
