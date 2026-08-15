/* =========================================================
   PRODUCT CATEGORY
   ========================================================= */

export interface ProductCategory {
  id: number;
  name: string;
}

/* =========================================================
     STOCK
     ========================================================= */

export interface ProductAvailableStockUnit {
  /*
   * Actual physical inventory unit.
   *
   * Normal product examples:
   * - Piece
   * - Bottle
   * - Packet
   *
   * Dual-unit product example:
   * - Kg
   */
  unit: string;

  /*
   * Current physical available stock.
   */
  available_quantity: number;
}

/* =========================================================
     PRODUCT VARIANT
     ========================================================= */

export interface ProductVariant {
  id: number;

  product_id: number;

  size_value: number;

  size_unit: string;

  /*
   * Physical/package selling unit.
   *
   * Example:
   * Packet
   */
  package_unit: string;

  /*
   * Example:
   * 100g Packet
   * 250g Packet
   * 500g Packet
   * 1kg Packet
   */
  display_name: string;

  sku: string;

  barcode: string | null;

  is_active: boolean;

  sort_order: number;

  /*
   * Current physical stock belonging ONLY
   * to this variant.
   *
   * Example:
   *
   * Tomato Seeds
   *
   * 100g Packet -> 25 Packet
   * 250g Packet -> 12 Packet
   */
  available_stock_by_unit: ProductAvailableStockUnit[];
}

/* =========================================================
     PRODUCT VARIANT INPUT
     ========================================================= */

export interface ProductVariantInput {
  /*
   * Null means a new variant.
   */
  id: number | null;

  size_value: string;

  size_unit: string;

  package_unit: string;

  barcode: string;

  is_active: boolean;
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
   * Main product/package unit.
   *
   * Normal example:
   * Bottle
   *
   * Variant product example:
   * Packet
   *
   * Dual-unit product example:
   * Bag
   */
  unit: string;

  is_active: boolean;

  category: ProductCategory | null;

  /*
   * True when this product has one or more variants.
   */
  has_variants: boolean;

  /*
   * Product variants.
   *
   * Each variant also contains its own
   * available_stock_by_unit.
   */
  variants: ProductVariant[];

  /*
   * Legacy numeric product-level stock total.
   *
   * Do NOT blindly display:
   *
   * total_available_quantity + product.unit
   *
   * because dual-unit products may physically
   * store stock in Kg while product.unit is Bag.
   */
  total_available_quantity: number;

  /*
   * Authoritative product-level physical stock.
   *
   * Example:
   *
   * [
   *   {
   *     unit: "Kg",
   *     available_quantity: 950
   *   }
   * ]
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

  variants: ProductVariantInput[];
}

/* =========================================================
     PRODUCT VARIANT OPTION
     ========================================================= */

export interface ProductVariantOption {
  id: number;

  display_name: string;

  size_value: number;

  size_unit: string;

  package_unit: string;

  sku: string;

  barcode: string | null;

  is_active: boolean;
}

/* =========================================================
     PRODUCT OPTION
     ========================================================= */

export interface ProductOption {
  id: number;

  name: string;

  sku: string;

  barcode: string | null;

  unit: string;

  has_variants: boolean;

  /*
   * Available variants for purchase/POS selection.
   */
  variants: ProductVariantOption[];

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
     API RESPONSES
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

/* =========================================================
     SUPPLIER
     ========================================================= */

export interface ProductBatchSupplier {
  id: number;

  name: string;
}

/* =========================================================
     BATCH VARIANT
     ========================================================= */

export interface ProductBatchVariant {
  id: number;

  product_id: number;

  display_name: string;

  size_value: number;

  size_unit: string;

  package_unit: string;

  sku: string;

  barcode: string | null;

  is_active?: boolean;

  sort_order?: number;
}

/* =========================================================
     PRODUCT VARIANT STOCK SUMMARY
     =========================================================
   *
   * This matches the backend `variant_stock`
   * response used by the Product Details page.
   *
   * Example:
   *
   * Tomato Seeds
   *
   * 100g Packet
   *   Available: 25 Packet
   *   Saleable: 25 Packet
   *   Selling price: Rs. 200
   *
   * 250g Packet
   *   Available: 12 Packet
   *   Saleable: 12 Packet
   *   Selling price: Rs. 400
   */

export interface ProductVariantStockSummary {
  variant_id: number;

  variant: ProductBatchVariant;

  /*
   * Total current stock for this exact variant.
   *
   * Example:
   * 25
   */
  available_quantity: number;

  /*
   * Current stock that is not expired
   * and can be sold.
   */
  saleable_quantity: number;

  /*
   * Number of stock batches belonging
   * to this variant.
   */
  batch_count: number;

  /*
   * Current selling price.
   *
   * Backend uses the lowest current
   * stock-batch selling price.
   */
  selling_price: number | null;

  /*
   * Lowest current selling price.
   */
  minimum_selling_price: number | null;

  /*
   * Highest current selling price.
   */
  maximum_selling_price: number | null;

  /*
   * Physical stock unit.
   *
   * Example:
   * Packet
   */
  stock_unit: string;

  /*
   * Current stock value at purchase cost.
   */
  stock_value_at_cost: number;

  /*
   * Expected current sale value.
   */
  stock_value_at_sale: number;

  /*
   * Expected gross profit from remaining
   * stock for this variant.
   */
  potential_gross_profit: number;
}

/* =========================================================
     PRODUCT STOCK BATCH DETAILS
     ========================================================= */

export interface ProductBatchDetails {
  id: number;

  product_variant_id: number | null;

  variant: ProductBatchVariant | null;

  purchase_item_id: number | null;

  purchase_id: number | null;

  purchase_number: string | null;

  purchase_date: string | null;

  supplier: ProductBatchSupplier | null;

  batch_code: string | null;

  batch_number: string | null;

  /*
   * Dual-unit stock.
   *
   * Variant products normally use:
   * is_dual_unit = false
   */
  is_dual_unit: boolean;

  /*
   * Main purchase/selling unit.
   */
  primary_unit: string;

  purchase_unit_name: string;

  /*
   * Actual physical stock unit.
   *
   * Example:
   *
   * 100g Packet -> Packet
   *
   * Bag dual-unit -> Kg
   */
  stock_unit: string;

  secondary_unit: string | null;

  conversion_factor: number;

  /*
   * Purchase quantity in purchase units.
   */
  purchased_quantity: number;

  /*
   * Received purchase quantity.
   */
  received_purchase_quantity: number;

  /*
   * Physical quantity received.
   */
  received_quantity: number;

  /*
   * Current physical available quantity.
   */
  available_quantity: number;

  /*
   * Full main units available.
   *
   * Mainly relevant for dual-unit products.
   */
  full_units_available: number;

  /*
   * Loose quantity available.
   *
   * Mainly relevant for dual-unit products.
   */
  loose_quantity_available: number;

  /*
   * Cost per main/purchase unit.
   */
  unit_cost: number | null;

  /*
   * Compatibility cost field.
   */
  cost_price: number | null;

  /*
   * Cost per physical stock unit.
   */
  base_unit_cost: number | null;

  /*
   * Main selling price.
   */
  selling_price: number;

  /*
   * Loose selling price for dual-unit products.
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
   * Current remaining stock value at cost.
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
  /*
   * Null means normal/non-variant product.
   *
   * Otherwise this price option belongs
   * to the exact selected variant.
   */
  product_variant_id: number | null;

  variant: ProductBatchVariant | null;

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

  /*
   * Current saleable quantity.
   */
  saleable_quantity: number;

  /*
   * Current expired quantity.
   */
  expired_quantity: number;
}

/* =========================================================
     PRODUCT DETAILS SUMMARY
     ========================================================= */

export interface ProductDetailsSummary {
  /*
   * Number of configured product variants.
   */
  number_of_variants: number;

  /*
   * Number of stock batches.
   */
  number_of_batches: number;

  /*
   * Number of different price options.
   */
  number_of_price_options: number;

  /*
   * Compatibility numeric totals.
   */
  total_received_quantity: number;

  total_available_quantity: number;

  saleable_quantity: number;

  expired_quantity: number;

  /*
   * Financial stock values.
   */
  total_stock_value_at_cost: number;

  total_stock_value_at_sale: number;

  potential_gross_profit: number;

  /*
   * Correct physical stock grouped
   * by unit.
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
   * Main product/package unit.
   */
  unit: string;

  is_active: boolean;

  category: ProductCategory | null;

  /*
   * Whether this product has variants.
   */
  has_variants: boolean;

  /*
   * Full configured variants.
   *
   * Each variant includes its own:
   *
   * available_stock_by_unit
   */
  variants: ProductVariant[];

  created_at: string | null;

  updated_at: string | null;

  /*
   * Overall product stock summary.
   */
  summary: ProductDetailsSummary;

  /*
   * Price options grouped by:
   *
   * variant + selling price + unit.
   */
  price_options: ProductPriceOption[];

  /*
   * Detailed stock batches.
   */
  batches: ProductBatchDetails[];

  /*
   * Detailed stock summary for each
   * product variant.
   *
   * This is returned by the backend
   * as `variant_stock`.
   */
  variant_stock: ProductVariantStockSummary[];
}

/* =========================================================
     PRODUCT DETAILS RESPONSE
     ========================================================= */

export interface ProductDetailsResponse {
  data: ProductDetails;
}
