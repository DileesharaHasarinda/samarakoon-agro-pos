export type PosPaymentMethod = "cash" | "card" | "bank_transfer";

export type SaleSettlementType = "full" | "partial" | "due";

export type PosSaleOptionKey = "primary" | "secondary";

export interface PosCategory {
  id: number;
  name: string;
}

export interface PosSaleOption {
  key: PosSaleOptionKey;

  label: string;

  unit: string;

  selling_price: number;

  purchase_cost: number;

  conversion_factor: number;

  stock_quantity_per_unit: number;

  available_quantity: number;

  available_stock_quantity: number;

  stock_unit: string;

  quantity_step: number;

  allow_decimal_quantity: boolean;
}

export interface PosStockBatch {
  id: number;

  purchase_item_id: number | null;

  batch_code: string;

  batch_number: string | null;

  is_dual_unit: boolean;

  primary_unit: string;

  stock_unit: string;

  secondary_unit: string | null;

  conversion_factor: number;

  selling_price: number;

  primary_selling_price: number;

  secondary_selling_price: number | null;

  unit_cost: number;

  purchase_cost: number;

  cost_price: number;

  buying_price: number;

  base_unit_cost: number;

  received_quantity: number;

  available_quantity: number;

  available_stock_quantity: number;

  available_primary_quantity: number;

  loose_remainder_quantity: number;

  manufactured_date: string | null;

  expiry_date: string | null;

  is_expired: boolean;

  received_at: string | null;

  sale_options: PosSaleOption[];
}

export interface PosProduct {
  id: number;

  name: string;

  sku: string | null;

  barcode: string | null;

  description: string | null;

  unit: string;

  primary_unit: string;

  stock_unit: string;

  is_dual_unit: boolean;

  category: {
    id: number;
    name: string;
  };

  total_available_quantity: number;

  minimum_price: number | null;

  maximum_price: number | null;

  batches: PosStockBatch[];
}

export interface PosPaginationMeta {
  current_page: number;

  last_page: number;

  per_page: number;

  total: number;

  from: number | null;

  to: number | null;
}

export interface PosProductListResponse {
  data: PosProduct[];

  meta: PosPaginationMeta;
}

export interface PosProductResponse {
  data: PosProduct;
}

export interface PosCategoryResponse {
  data: PosCategory[];
}

export interface PosCartItem {
  stock_batch_id: number;

  product_id: number;

  product_name: string;

  primary_unit: string;

  sale_unit: string;

  stock_unit: string;

  is_dual_unit: boolean;

  conversion_factor: number;

  stock_quantity: number;

  batch_code: string;

  batch_number: string | null;

  expiry_date: string | null;

  available_quantity: number;

  available_stock_quantity: number;

  selling_price: number;

  quantity: number;

  discount: number;

  unit: string;
}

export interface CompleteSaleItemInput {
  stock_batch_id: number;

  quantity: number;

  sale_unit: string;

  discount: number;
}

export interface CompleteSaleValues {
  customer_id: number | null;

  settlement_type: SaleSettlementType;

  discount: number;

  payment_method: PosPaymentMethod | null;

  amount_received: number;

  due_date: string;

  reference_number: string;

  notes: string;
}

export interface SaleCustomer {
  id: number;

  customer_code: string;

  name: string;

  mobile: string | null;
}

export interface SaleCashier {
  id: number;

  name: string;

  username?: string;
}

export interface SaleReceiptBatch {
  id: number;

  batch_code: string;

  batch_number: string | null;

  is_dual_unit: boolean;

  stock_unit: string | null;

  secondary_unit: string | null;

  conversion_factor: number;

  primary_selling_price: number;

  secondary_selling_price: number | null;

  available_quantity: number;

  expiry_date: string | null;
}

export interface SaleReceiptItem {
  id: number;

  product_id: number;

  stock_batch_id: number;

  quantity: number;

  returned_quantity: number;

  remaining_returnable_quantity: number;

  sale_unit: string;

  conversion_factor: number;

  stock_quantity: number;

  returned_stock_quantity: number;

  remaining_returnable_stock_quantity: number;

  purchase_cost: number | null;

  selling_price: number;

  discount: number;

  line_total: number;

  gross_profit: number | null;

  product: {
    id: number;

    name: string;

    unit: string;

    sku: string | null;

    barcode: string | null;
  } | null;

  batch: SaleReceiptBatch | null;
}

export interface SaleReceiptPayment {
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

export interface SaleReceipt {
  id: number;

  sale_number: string;

  sale_date: string;

  subtotal: number;

  item_discount_total: number;

  discount: number;

  grand_total: number;

  paid_amount: number;

  due_amount: number;

  due_date: string | null;

  change_amount: number;

  gross_profit: number | null;

  net_profit: number | null;

  payment_status: string;

  settlement_type: SaleSettlementType;

  payment_method: PosPaymentMethod | null;

  customer: SaleCustomer | null;

  notes: string | null;

  items_count: number;

  total_quantity: number;

  created_by: SaleCashier | null;

  created_at: string | null;

  updated_at: string | null;

  items: SaleReceiptItem[];

  payments: SaleReceiptPayment[];
}

export interface CompleteSaleResponse {
  message: string;

  data: SaleReceipt;
}

export interface PosProductListParameters {
  search?: string;

  categoryId?: string;

  page?: number;

  perPage?: number;
}

export interface SaleHistoryItem {
  id: number;

  sale_number: string;

  sale_date: string;

  subtotal: number;

  item_discount_total: number;

  discount: number;

  grand_total: number;

  paid_amount: number;

  due_amount: number;

  due_date: string | null;

  change_amount: number;

  gross_profit: number | null;

  net_profit: number | null;

  payment_status: string;

  settlement_type: SaleSettlementType;

  payment_method: PosPaymentMethod | null;

  customer: SaleCustomer | null;

  notes: string | null;

  items_count: number;

  total_quantity: number;

  created_by: SaleCashier | null;

  created_at: string | null;

  updated_at: string | null;
}

export interface SaleHistorySummary {
  total_sales: number;

  total_revenue: number;

  outstanding_due: number;

  total_discount: number;

  total_items: number;

  gross_profit: number | null;

  net_profit: number | null;
}

export interface SaleHistoryResponse {
  data: SaleHistoryItem[];

  summary: SaleHistorySummary;

  meta: PosPaginationMeta;
}

export interface SaleDetailsResponse {
  data: SaleReceipt;
}

export interface SaleHistoryParameters {
  search?: string;

  paymentMethod?: string;

  paymentStatus?: string;

  dateFrom?: string;

  dateTo?: string;

  page?: number;

  perPage?: number;
}
