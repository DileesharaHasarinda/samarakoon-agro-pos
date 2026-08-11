export interface ProductCategory {
  id: number;
  name: string;
}

/* =========================================================
 PRODUCT LIST STOCK
 ========================================================= */

export interface ProductAvailableStockUnit {
  /*
   * Actual physical inventory unit.
   *
   * Examples:
   *
   * Bag
   * Kg
   * Bottle
   * Piece
   */
  unit: string;

  /*
   * Current physical available stock.
   */
  available_quantity: number;
}

/* =========================================================
 PRODUCT
 ========================================================= */

export interface Product {
  id: number;

  name: string;

  sku: string;

  barcode: string | null;

  /*
   * MAIN product / purchase unit.
   *
   * Example:
   *
   * Urea Fertilizer 50kg
   * main unit = Bag
   *
   * Do NOT assume this is the physical stock unit.
   */
  unit: string;

  is_active: boolean;

  category: ProductCategory | null;

  /*
   * Compatibility numeric total.
   *
   * Do not display:
   *
   * total_available_quantity + product.unit
   *
   * because a dual-unit product can have:
   *
   * product.unit = Bag
   * physical stock = Kg
   */
  total_available_quantity: number;

  /*
   * Correct physical inventory quantities.
   *
   * Example:
   *
   * [
   *     {
   *         unit: 'Kg',
   *         available_quantity: 10095,
   *     },
   * ]
   *
   * ProductsPage should use this field.
   */
  available_stock_by_unit: ProductAvailableStockUnit[];

  created_at: string | null;

  updated_at: string | null;
}

/* =========================================================
 PRODUCT INPUT
 ========================================================= */

export interface ProductInput {
  category_id: number | null;

  name: string;

  unit: string;

  barcode: string;
}

/* =========================================================
 PRODUCT OPTIONS
 ========================================================= */

export interface ProductOption {
  id: number;

  name: string;

  sku: string;

  barcode: string | null;

  unit: string;

  category: ProductCategory | null;
}

/* =========================================================
 PAGINATION
 ========================================================= */

export interface ProductPaginationMeta {
  current_page: number;

  last_page: number;

  per_page: number;

  total: number;

  from: number | null;

  to: number | null;
}

export interface ProductListFilters {
  search?: string;

  page?: number;

  per_page?: number;
}

/* =========================================================
 PRODUCT API RESPONSES
 ========================================================= */

export interface ProductListResponse {
  data: Product[];

  meta: ProductPaginationMeta;
}

export interface ProductResponse {
  message: string;

  data: Product;
}

export interface ProductOptionsResponse {
  data: ProductOption[];
}

export interface ProductCategoryOptionsResponse {
  data: ProductCategory[];
}

export interface ProductDeleteResponse {
  message: string;
}

/* =========================================================
 PRODUCT DETAILS
 ========================================================= */

export type ProductBatchStatus =
  "available" | "expiring_soon" | "expired" | "out_of_stock";

export interface ProductBatchSupplier {
  id: number;

  name: string;
}

/* =========================================================
 PRODUCT STOCK BATCH DETAILS
 ========================================================= */

export interface ProductBatchDetails {
  id: number;

  purchase_item_id: number | null;

  purchase_id: number | null;

  purchase_number: string | null;

  purchase_date: string | null;

  supplier: ProductBatchSupplier | null;

  batch_code: string | null;

  batch_number: string | null;

  /*
   * True when this stock supports two selling units.
   *
   * Example:
   *
   * Bag + Kg
   */
  is_dual_unit: boolean;

  /*
   * Main / purchase unit.
   *
   * Example:
   * Bag
   */
  primary_unit: string;

  purchase_unit_name: string;

  /*
   * ACTUAL physical inventory unit.
   *
   * Example:
   * Kg
   */
  stock_unit: string;

  /*
   * Loose selling / base unit.
   *
   * Example:
   * Kg
   */
  secondary_unit: string | null;

  /*
   * Example:
   *
   * 1 Bag = 100 Kg
   *
   * conversion_factor = 100
   */
  conversion_factor: number;

  /*
   * Purchase quantity.
   *
   * Example:
   * 1 Bag
   */
  purchased_quantity: number;

  /*
   * Received quantity in purchase units.
   *
   * Example:
   * 1 Bag
   */
  received_purchase_quantity: number;

  /*
   * Physical stock received.
   *
   * Example:
   * 100 Kg
   */
  received_quantity: number;

  /*
   * Current physical stock.
   *
   * Example after selling 5Kg:
   * 95 Kg
   */
  available_quantity: number;

  /*
   * Example:
   *
   * 295 Kg
   * 1 Bag = 100 Kg
   *
   * full_units_available = 2
   */
  full_units_available: number;

  /*
   * Example:
   *
   * loose_quantity_available = 95
   */
  loose_quantity_available: number;

  /*
   * Cost per MAIN / purchase unit.
   *
   * Example:
   * Rs. 2,000 / Bag
   */
  unit_cost: number | null;

  cost_price: number | null;

  /*
   * Cost per physical stock unit.
   *
   * Example:
   * Rs. 20 / Kg
   */
  base_unit_cost: number | null;

  /*
   * Main selling price.
   *
   * Example:
   * Rs. 3,000 / Bag
   */
  selling_price: number;

  /*
   * Loose selling price.
   *
   * Example:
   * Rs. 35 / Kg
   */
  secondary_selling_price: number | null;

  /*
   * Profit per main unit.
   */
  profit_per_unit: number | null;

  /*
   * Profit per physical stock unit.
   */
  profit_per_stock_unit: number | null;

  discount: number;

  line_total: number | null;

  /*
   * Correct value of remaining physical stock at cost.
   */
  current_cost_value: number;

  /*
   * Expected remaining sale value.
   */
  current_sale_value: number;

  manufactured_date: string | null;

  expiry_date: string | null;

  received_at: string | null;

  notes: string | null;

  status: ProductBatchStatus;
}

/* =========================================================
 PRICE OPTION
 ========================================================= */

export interface ProductPriceOption {
  selling_price: number;

  secondary_selling_price: number | null;

  is_dual_unit: boolean;

  primary_unit: string;

  stock_unit: string;

  secondary_unit: string | null;

  conversion_factor: number;

  cost_price_min: number | null;

  cost_price_max: number | null;

  /*
   * These quantities use stock_unit.
   */
  available_quantity: number;

  saleable_quantity: number;

  expired_quantity: number;

  batch_count: number;

  batches: ProductBatchDetails[];
}

/* =========================================================
 STOCK SUMMARY BY PHYSICAL UNIT
 ========================================================= */

export interface ProductStockUnitSummary {
  unit: string;

  /*
   * Physical received quantity.
   */
  total_received_quantity: number;

  /*
   * Current physical available quantity.
   */
  total_available_quantity: number;

  saleable_quantity: number;

  expired_quantity: number;
}

/* =========================================================
 PRODUCT DETAILS SUMMARY
 ========================================================= */

export interface ProductDetailsSummary {
  number_of_batches: number;

  number_of_price_options: number;

  /*
   * Compatibility numeric quantities.
   *
   * For unit-aware UI displays use stock_by_unit.
   */
  total_received_quantity: number;

  total_available_quantity: number;

  saleable_quantity: number;

  expired_quantity: number;

  total_stock_value_at_cost: number;

  total_stock_value_at_sale: number;

  potential_gross_profit: number;

  /*
   * Correct physical inventory grouped by unit.
   *
   * Example:
   *
   * [
   *     {
   *         unit: 'Kg',
   *         total_available_quantity: 10095,
   *         ...
   *     },
   * ]
   */
  stock_by_unit: ProductStockUnitSummary[];
}

/* =========================================================
 PRODUCT DETAILS
 ========================================================= */

export interface ProductDetails {
  id: number;

  name: string;

  sku: string;

  barcode: string | null;

  /*
   * Main product/purchase unit.
   *
   * Example:
   * Bag
   */
  unit: string;

  is_active: boolean;

  category: ProductCategory | null;

  created_at: string | null;

  updated_at: string | null;

  summary: ProductDetailsSummary;

  price_options: ProductPriceOption[];

  batches: ProductBatchDetails[];
}

export interface ProductDetailsResponse {
  data: ProductDetails;
}
