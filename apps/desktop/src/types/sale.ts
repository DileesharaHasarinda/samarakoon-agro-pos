export type PosPaymentMethod = "cash" | "card" | "bank_transfer" | "cheque";

/*
 * A SalePayment row always contains
 * one real payment method.
 *
 * A sale summary can additionally
 * return "mixed" when several methods
 * were used for the same sale.
 */
export type PosPaymentSummaryMethod = PosPaymentMethod | "mixed";

export type SaleSettlementType = "full" | "partial" | "due";

export type PosSaleOptionKey = "primary" | "secondary";

/* =========================================================
   CATEGORY
   ========================================================= */

export interface PosCategory {
  id: number;

  name: string;
}

/* =========================================================
   SALE OPTION
   ========================================================= */

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

/* =========================================================
   STOCK BATCH
   ========================================================= */

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

/* =========================================================
   POS PRODUCT
   ========================================================= */

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

/* =========================================================
   PAGINATION
   ========================================================= */

export interface PosPaginationMeta {
  current_page: number;

  last_page: number;

  per_page: number;

  total: number;

  from: number | null;

  to: number | null;
}

/* =========================================================
   POS API RESPONSES
   ========================================================= */

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

/* =========================================================
   CART
   ========================================================= */

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

/* =========================================================
   COMPLETE SALE ITEM
   ========================================================= */

export interface CompleteSaleItemInput {
  stock_batch_id: number;

  quantity: number;

  sale_unit: string;

  discount: number;
}

/* =========================================================
   SPLIT PAYMENT INPUT
   ========================================================= */

/*
 * Each item in this array becomes one
 * SalePayment database record.
 *
 * Example:
 *
 * [
 *   {
 *     payment_method: "cash",
 *     amount: 2500
 *   },
 *   {
 *     payment_method: "card",
 *     amount: 1500
 *   },
 *   {
 *     payment_method: "bank_transfer",
 *     amount: 1000
 *   },
 *   {
 *     payment_method: "cheque",
 *     amount: 500
 *   }
 * ]
 */
export interface CompleteSalePaymentInput {
  payment_method: PosPaymentMethod;

  /*
   * Amount assigned to this method.
   *
   * For normal split payments this is
   * the actual amount applied to the bill.
   *
   * A single full Cash payment may contain
   * the tendered amount, for example:
   *
   * Bill   = 1500
   * Cash   = 2000
   * Change = 500
   *
   * The backend safely records only
   * Rs.1500 as revenue.
   */
  amount: number;

  reference_number: string;

  notes: string;
}

/* =========================================================
   COMPLETE SALE VALUES
   ========================================================= */

export interface CompleteSaleValues {
  customer_id: number | null;

  settlement_type: SaleSettlementType;

  discount: number;

  /*
   * =====================================================
   * LEGACY / SUMMARY PAYMENT FIELDS
   * =====================================================
   *
   * These remain during the transition so the
   * frontend and backend remain backwards compatible.
   *
   * payments[] below is the authoritative source
   * for new split-payment sales.
   */

  payment_method: PosPaymentMethod | null;

  amount_received: number;

  /*
   * Due Date is optional.
   *
   * Empty string will be sent to the service
   * and converted to null.
   */
  due_date: string;

  reference_number: string;

  notes: string;

  /*
   * =====================================================
   * AUTHORITATIVE SPLIT PAYMENT LIST
   * =====================================================
   *
   * Full sale:
   *
   * Cash    2000
   * Card    1500
   * Bank    1000
   * Cheque   500
   *
   * payments total = 5000
   *
   *
   * Partial:
   *
   * Total = 5000
   *
   * Cash = 1000
   * Card = 1000
   *
   * payments total = 2000
   * due = 3000
   *
   *
   * Due sale:
   *
   * payments = []
   */
  payments: CompleteSalePaymentInput[];
}

/* =========================================================
   CUSTOMER
   ========================================================= */

export interface SaleCustomer {
  id: number;

  customer_code: string;

  name: string;

  mobile: string | null;
}

/* =========================================================
   CASHIER
   ========================================================= */

export interface SaleCashier {
  id: number;

  name: string;

  username?: string;
}

/* =========================================================
   RECEIPT BATCH
   ========================================================= */

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

/* =========================================================
   RECEIPT ITEM
   ========================================================= */

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

/* =========================================================
   RECEIPT PAYMENT
   ========================================================= */

/*
 * Every payment record has ONE real method.
 *
 * "mixed" is never stored here.
 *
 * Example:
 *
 * Payment #1 = cash
 * Payment #2 = card
 */
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

/* =========================================================
   SALE RECEIPT
   ========================================================= */

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

  /*
   * For one payment:
   *
   * cash
   * card
   * bank_transfer
   * cheque
   *
   * For multiple:
   *
   * mixed
   *
   * For completely due:
   *
   * null
   */
  payment_method: PosPaymentSummaryMethod | null;

  customer: SaleCustomer | null;

  notes: string | null;

  items_count: number;

  total_quantity: number;

  created_by: SaleCashier | null;

  created_at: string | null;

  updated_at: string | null;

  items: SaleReceiptItem[];

  /*
   * Actual individual payment records.
   */
  payments: SaleReceiptPayment[];
}

/* =========================================================
   COMPLETE SALE RESPONSE
   ========================================================= */

export interface CompleteSaleResponse {
  message: string;

  data: SaleReceipt;
}

/* =========================================================
   POS PRODUCT PARAMETERS
   ========================================================= */

export interface PosProductListParameters {
  search?: string;

  categoryId?: string;

  page?: number;

  perPage?: number;
}

/* =========================================================
   SALE HISTORY
   ========================================================= */

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

  /*
   * May be:
   *
   * cash
   * card
   * bank_transfer
   * cheque
   * mixed
   * null
   */
  payment_method: PosPaymentSummaryMethod | null;

  customer: SaleCustomer | null;

  notes: string | null;

  items_count: number;

  total_quantity: number;

  created_by: SaleCashier | null;

  created_at: string | null;

  updated_at: string | null;
}

/* =========================================================
   SALE HISTORY SUMMARY
   ========================================================= */

export interface SaleHistorySummary {
  total_sales: number;

  total_revenue: number;

  outstanding_due: number;

  total_discount: number;

  total_items: number;

  gross_profit: number | null;

  net_profit: number | null;
}

/* =========================================================
   SALE HISTORY RESPONSE
   ========================================================= */

export interface SaleHistoryResponse {
  data: SaleHistoryItem[];

  summary: SaleHistorySummary;

  meta: PosPaginationMeta;
}

/* =========================================================
   SALE DETAILS
   ========================================================= */

export interface SaleDetailsResponse {
  data: SaleReceipt;
}

/* =========================================================
   SALE HISTORY PARAMETERS
   ========================================================= */

export interface SaleHistoryParameters {
  search?: string;

  paymentMethod?: string;

  paymentStatus?: string;

  dateFrom?: string;

  dateTo?: string;

  page?: number;

  perPage?: number;
}
