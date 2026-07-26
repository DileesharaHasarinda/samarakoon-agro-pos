import type { PosPaginationMeta } from "./sale";

export type InventoryAlertStatus =
  | "out_of_stock"
  | "low_stock"
  | "expired"
  | "expiring_7"
  | "expiring_30"
  | "expiring_60"
  | "safe";

export type InventoryStockStatus = "out_of_stock" | "low_stock" | "in_stock";

export interface InventoryAlertBatch {
  id: number;
  batch_code: string;
  batch_number: string | null;
  available_quantity: number;
  purchase_cost: number;
  selling_price: number;
  expiry_date: string | null;
  days_until_expiry: number | null;
  expiry_status: string;
  received_at: string | null;
}

export interface InventoryAlertProduct {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;

  category: {
    id: number;
    name: string;
  };

  minimum_stock_level: number;
  reorder_quantity: number;
  expiry_alert_days: number;
  total_available_quantity: number;
  suggested_reorder_quantity: number;
  nearest_expiry: string | null;
  expired_batch_count: number;
  expiring_7_count: number;
  expiring_30_count: number;
  expiring_60_count: number;
  stock_status: InventoryStockStatus;
  expiry_status: string;
  alert_status: InventoryAlertStatus;
  batches: InventoryAlertBatch[];
}

export interface InventoryAlertSummary {
  total_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  products_with_expired_batches: number;
  products_expiring_7_days: number;
  products_expiring_30_days: number;
  products_expiring_60_days: number;
  safe_products: number;
}

export interface InventoryAlertResponse {
  data: InventoryAlertProduct[];
  summary: InventoryAlertSummary;
  meta: PosPaginationMeta;
}

export interface ProductStockSettingInput {
  minimum_stock_level: number;
  reorder_quantity: number;
  expiry_alert_days: number;
}
