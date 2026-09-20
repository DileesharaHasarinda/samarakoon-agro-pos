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

/*
 * =========================================================
 * TRAINING PAYMENT
 * =========================================================
 *
 * Training Billing intentionally does NOT create SalePayment
 * database rows. This structure is only used to simulate the
 * checkout/payment-method step and print it on a training bill.
 */
export interface TrainingPaymentDetails {
  payment_method: PosPaymentMethod;

  customer_reference: string;

  reference_number: string;

  notes: string;
}

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

  /*
   * Training Mode may deliberately allow catalogue items that do not
   * yet have an allocated selling price. In that case selling_price is
   * kept as 0 for arithmetic compatibility, while price_available=false
   * tells the UI/receipt not to display that value as a real price.
   */
  price_available?: boolean;

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

  /*
   * Frontend-only Training Mode batch used when a catalogue product or
   * variant has never been purchased and therefore has no real stock batch.
   * It is NEVER submitted to the real sale API.
   */
  is_training_virtual?: boolean;

  /*
   * Variant metadata is returned for variant-aware stock batches.
   * Normal products keep these values null/undefined.
   */
  product_variant_id?: number | null;

  variant?: PosProductVariant | null;

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
   PRODUCT VARIANT / TRAINING BILL OPTION
   ========================================================= */

export interface PosProductVariant {
  id: number;

  product_id: number;

  display_name: string;

  size_value: number;

  size_unit: string;

  package_unit: string;

  sku: string | null;

  barcode: string | null;

  is_active: boolean;

  sort_order: number;

  stock_unit: string;

  total_available_quantity: number;

  minimum_price: number | null;

  maximum_price: number | null;

  batches_count: number;

  has_stock: boolean;
}

export interface PosTrainingOption {
  key: string;

  label: string;

  unit: string;

  primary_unit: string;

  stock_unit: string;

  variant_id: number | null;

  variant_name: string | null;

  is_dual_unit: boolean;

  conversion_factor: number;
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

  has_variants?: boolean;

  variants?: PosProductVariant[];

  /*
   * Training-only unit/variant choices returned by the
   * include_all catalogue endpoint. The normal New Sale
   * endpoint returns an empty array here.
   */
  training_options?: PosTrainingOption[];

  /*
   * Full-catalogue sale metadata.
   *
   * available:
   *   current sellable stock exists.
   *
   * out_of_stock:
   *   the product has stock/purchase history but no current stock.
   *
   * not_purchased:
   *   the product exists in the catalogue but has never received stock.
   */
  has_purchase_history: boolean;

  can_sell: boolean;

  catalog_status: "available" | "out_of_stock" | "not_purchased";

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

  /*
   * Training-only metadata.
   *
   * price_available=false means no selling price has been allocated yet.
   * is_training_virtual_batch=true means the item came from a synthetic
   * Training Mode batch because no real purchase/stock batch exists.
   */
  price_available?: boolean;

  is_training_virtual_batch?: boolean;

  product_name: string;

  /*
   * Keep enough source metadata in the cart to build the exact same
   * receipt in Training Billing without creating a database sale.
   */
  product_unit?: string;

  product_sku?: string | null;

  product_barcode?: string | null;

  product_variant_id?: number | null;

  variant?: PosProductVariant | null;

  primary_unit: string;

  sale_unit: string;

  stock_unit: string;

  secondary_unit?: string | null;

  is_dual_unit: boolean;

  conversion_factor: number;

  primary_selling_price?: number;

  secondary_selling_price?: number | null;

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
   * Cash 2500
   * Card 1500
   * Bank 1000
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
   RECEIPT VARIANT
   ========================================================= */

export interface SaleReceiptVariant {
  id: number;

  product_id: number;

  /*
   * Human-readable label returned by ProductVariant::displayName().
   *
   * Example:
   * 100g Packet
   */
  display_name: string;

  size_value: number;

  size_unit: string;

  package_unit: string;

  sku: string | null;

  barcode: string | null;

  is_active: boolean;

  sort_order: number;
}

/* =========================================================
   RECEIPT BATCH
   ========================================================= */

export interface SaleReceiptBatch {
  id: number;

  /*
   * Exact product variant attached to this sold batch.
   * Null for normal non-variant products.
   */
  product_variant_id: number | null;

  variant: SaleReceiptVariant | null;

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

  /*
   * Training receipts can contain catalogue products without an allocated
   * selling price. When false, the receipt must omit unit/line prices for
   * this item instead of printing a misleading LKR 0.00.
   */
  price_available?: boolean;

  /*
   * Exact variant sold.
   *
   * Example:
   * Tomato Seeds -> 100g Packet
   */
  product_variant_id: number | null;

  variant: SaleReceiptVariant | null;

  stock_batch_id: number;

  quantity: number;

  returned_quantity: number;

  remaining_returnable_quantity: number;

  /*
   * Unit actually sold to the customer.
   *
   * Examples:
   * Bag
   * Kg
   * Packet
   * Bottle
   *
   * Receipt printing must use this value rather than product.unit.
   */
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

  /*
   * amount is the amount applied to the bill.
   * received_amount/amount_received are optional tendered-cash values
   * used by both persisted receipts and simulated Training Billing.
   */
  amount: number;

  received_amount?: number;

  amount_received?: number;

  change_amount?: number;

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

  /*
   * Optional frontend-only flags used by Training Mode receipts.
   * Real backend receipts simply omit these fields.
   */
  is_training?: boolean;

  has_unpriced_items?: boolean;

  sale_number: string;

  sale_date: string;

  subtotal: number;

  item_discount_total: number;

  discount: number;

  grand_total: number;

  paid_amount: number;

  /*
   * Optional tendered amount. The backend may omit it on older
   * responses; the receipt renderer also derives it from payments.
   */
  amount_received?: number;

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
