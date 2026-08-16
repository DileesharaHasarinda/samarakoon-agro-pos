import type { PosPaymentMethod } from "./sale";

export interface SalesReturnUser {
  id: number;
  name: string;
  username: string;
}

export interface SalesReturnProduct {
  id: number;
  name: string;
  unit: string;
  sku: string | null;
  barcode: string | null;
}

export interface SalesReturnBatch {
  id: number;

  batch_code: string;

  batch_number: string | null;

  is_dual_unit: boolean;

  stock_unit: string | null;

  secondary_unit: string | null;

  conversion_factor: number;

  available_quantity: number;

  expiry_date: string | null;
}

export interface SalesReturnOptionSale {
  id: number;

  sale_number: string;

  sale_date: string;

  grand_total: number;

  discount: number;

  created_by: SalesReturnUser | null;
}

export interface SalesReturnOptionItem {
  sale_item_id: number;

  sold_quantity: number;

  returned_quantity: number;

  remaining_quantity: number;

  sale_unit: string;

  conversion_factor: number;

  sold_stock_quantity: number;

  returned_stock_quantity: number;

  remaining_stock_quantity: number;

  remaining_refund_amount: number;

  selling_price: number;

  product: SalesReturnProduct;

  batch: SalesReturnBatch;
}

export interface SalesReturnOptions {
  sale: SalesReturnOptionSale;

  items: SalesReturnOptionItem[];

  has_returnable_items: boolean;
}

export interface SalesReturnOptionsResponse {
  data: SalesReturnOptions;
}

export interface CreateSalesReturnItemValue {
  sale_item_id: number;

  quantity: number;

  restock: boolean;
}

export interface CreateSalesReturnValues {
  reason: string;

  refund_method: PosPaymentMethod;

  notes: string;

  items: CreateSalesReturnItemValue[];
}

export interface SalesReturnSaleSummary {
  id: number;

  sale_number: string;

  sale_date: string;
}

export interface SalesReturnSaleDetails {
  id: number;

  sale_number: string;

  sale_date: string;

  grand_total: number;

  created_by: SalesReturnUser | null;
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

  sale: SalesReturnSaleSummary;

  created_by: SalesReturnUser;

  created_at: string | null;
}

export interface SalesReturnItem {
  id: number;

  sale_item_id: number;

  quantity: number;

  /*
   * Unit used for the original sale/return.
   *
   * Examples:
   * Bag
   * Kg
   * Bottle
   * Pack
   */
  return_unit: string | null;

  /*
   * Conversion factor between sale quantity
   * and physical stock quantity.
   */
  conversion_factor: number;

  /*
   * Physical quantity belonging to the
   * stock batch.
   *
   * Example:
   *
   * 2 Bag
   * 1 Bag = 50 Kg
   *
   * stock_quantity = 100
   */
  stock_quantity: number;

  purchase_cost: number | null;

  selling_price: number;

  item_discount_reversal: number;

  sale_discount_reversal: number;

  refund_amount: number;

  cost_value: number | null;

  profit_reversal: number | null;

  restocked: boolean;

  product: SalesReturnProduct;

  batch: SalesReturnBatch;
}

export interface SalesReturnDetails extends Omit<
  SalesReturnHistoryItem,
  "sale"
> {
  cost_value: number | null;

  sale: SalesReturnSaleDetails;

  items: SalesReturnItem[];
}

export interface SalesReturnResponse {
  message: string;

  data: SalesReturnDetails;
}

/*
 * GET /sales-returns/{id}
 *
 * This endpoint only returns data.
 */
export interface SalesReturnDetailsResponse {
  data: SalesReturnDetails;
}

/*
 * POST
 * /sales-returns/{return}/items/{item}/restock
 *
 * This endpoint returns BOTH:
 *
 * message
 * data
 */
export interface SalesReturnRestockResponse {
  message: string;

  data: SalesReturnDetails;
}

export interface SalesReturnSummary {
  total_returns: number;

  total_refund: number;

  total_returned_quantity: number;

  total_restocked_quantity: number;

  profit_reversal: number | null;
}

export interface SalesReturnHistoryMeta {
  current_page: number;

  last_page: number;

  per_page: number;

  total: number;

  from: number | null;

  to: number | null;
}

export interface SalesReturnHistoryResponse {
  data: SalesReturnHistoryItem[];

  summary: SalesReturnSummary;

  meta: SalesReturnHistoryMeta;
}

export interface SalesReturnHistoryParameters {
  page?: number;

  perPage?: number;

  search?: string;

  refundMethod?: string;

  dateFrom?: string;

  dateTo?: string;
}
