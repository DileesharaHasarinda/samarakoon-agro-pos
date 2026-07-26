import type { PosPaginationMeta } from "./sale";

export interface BarcodeProductCategory {
  id: number;
  name: string;
}

export interface BarcodeProduct {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  is_active: boolean;
  category: BarcodeProductCategory | null;

  current_selling_price: number | null;

  total_available_quantity: number;
}

export interface BarcodeSummary {
  total_products: number;
  assigned_barcodes: number;
  missing_barcodes: number;
}

export interface BarcodeProductListResponse {
  data: BarcodeProduct[];
  summary: BarcodeSummary;
  meta: PosPaginationMeta;
}

export interface BarcodeProductResponse {
  message: string;
  data: BarcodeProduct;
}

export interface GenerateMissingBarcodesResponse {
  message: string;

  data: {
    generated_count: number;
  };
}

export interface BarcodeLabelSettings {
  width_mm: number;
  height_mm: number;
  copies: number;
  show_business_name: boolean;
  show_product_name: boolean;
  show_sku: boolean;
  show_price: boolean;
}
