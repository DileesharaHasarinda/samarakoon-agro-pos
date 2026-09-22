export interface StockBatchOption {
  id: number;

  batch_code: string;

  batch_number: string | null;

  purchase_cost: number;

  selling_price: number;

  available_quantity: number;

  expiry_date: string | null;

  received_at: string;
}

export interface StockPriceOption {
  selling_price: number;

  available_quantity: number;

  batches: StockBatchOption[];
}

export interface StockProduct {
  id: number;

  name: string;

  sku: string | null;

  barcode: string | null;

  unit: string;

  category: {
    id: number;

    name: string;
  };

  total_available_quantity: number;

  price_options: StockPriceOption[];
}

export interface StockPaginationMeta {
  current_page: number;

  last_page: number;

  per_page: number;

  total: number;

  from: number | null;

  to: number | null;
}

export interface StockProductListResponse {
  data: StockProduct[];

  meta: StockPaginationMeta;
}

/* =========================================================
   OPENING INVENTORY
   ========================================================= */

export interface OpeningInventoryInput {
  supplier_id: number;

  product_id: number;

  product_variant_id: number | null;

  purchase_cost: number;

  selling_price: number;

  /**
   * Normal product:
   * current quantity in the main unit.
   *
   * Bag/Kg:
   * number of FULL BAGS.
   */
  available_quantity: number;

  is_dual_unit: boolean;

  conversion_factor: number | null;

  secondary_unit: string | null;

  secondary_selling_price: number | null;

  /**
   * Existing loose Kg stock in addition to full bags.
   *
   * Example:
   * 3 full Bags + 12 Kg loose.
   */
  loose_quantity: number;
}

export interface OpeningInventoryCreatedData {
  id: number;

  batch_code: string;

  source_type: "opening_inventory";

  supplier: {
    id: number;

    name: string;
  };

  product: {
    id: number;

    name: string;
  };

  variant: {
    id: number;

    display_name: string;

    package_unit: string;
  } | null;

  purchase_cost: number;

  selling_price: number;

  entered_quantity: number;

  loose_quantity: number;

  primary_unit: string;

  /**
   * Actual physical stock stored by stock_batches.
   * For Bag/Kg this is Kg.
   */
  available_quantity: number;

  stock_unit: string;

  is_dual_unit: boolean;

  secondary_unit: string | null;

  conversion_factor: number;

  secondary_selling_price: number | null;

  base_unit_cost: number;

  stock_movement_id: number;

  received_at: string | null;
}

export interface OpeningInventoryResponse {
  message: string;

  data: OpeningInventoryCreatedData;
}
