export type PosPaymentMethod = "cash" | "card" | "bank_transfer";

export interface PosCategory {
  id: number;
  name: string;
}

export interface PosStockBatch {
  id: number;
  batch_code: string;
  batch_number: string | null;
  selling_price: number;
  available_quantity: number;
  expiry_date: string | null;
  received_at: string;
}

export interface PosProduct {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  unit: string;

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
  unit: string;
  batch_code: string;
  batch_number: string | null;
  expiry_date: string | null;
  available_quantity: number;
  selling_price: number;
  quantity: number;
  discount: number;
}

export interface CompleteSaleValues {
  discount: number;
  payment_method: PosPaymentMethod;
  amount_received: number;
  reference_number: string;
  notes: string;
}

export interface SaleCashier {
  id: number;
  name: string;
  username?: string;
}

export interface SaleReceiptItem {
  id: number;
  product_id: number;
  stock_batch_id: number;
  quantity: number;
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
  };

  batch: {
    id: number;
    batch_code: string;
    batch_number: string | null;
    expiry_date: string | null;
  };
}

export interface SaleReceiptPayment {
  id: number;
  payment_method: PosPaymentMethod;
  amount: number;
  reference_number: string | null;
  notes: string | null;
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
  change_amount: number;
  gross_profit: number | null;
  net_profit: number | null;
  payment_status: string;
  payment_method: PosPaymentMethod;
  payment_methods: PosPaymentMethod[];
  notes: string | null;
  items_count: number;
  total_quantity: number;
  created_by: SaleCashier;
  created_at: string;
  updated_at: string;
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
  change_amount: number;
  gross_profit: number | null;
  net_profit: number | null;
  payment_status: string;
  payment_method: PosPaymentMethod | null;
  payment_methods: PosPaymentMethod[];
  notes: string | null;
  items_count: number;
  total_quantity: number;
  created_by: SaleCashier;
  created_at: string;
  updated_at: string;
}

export interface SaleHistorySummary {
  total_sales: number;
  total_revenue: number;
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
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
}
