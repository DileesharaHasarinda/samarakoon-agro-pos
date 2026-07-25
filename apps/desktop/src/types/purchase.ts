export type PurchaseStatus = "draft" | "received";

export interface PurchaseSupplier {
  id: number;
  name: string;
  phone: string;
}

export interface PurchaseUser {
  id: number;
  name: string;
}

export interface PurchaseProductOption {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;

  category: {
    id: number;
    name: string;
  };
}

export interface PurchaseStockBatch {
  id: number;
  batch_code: string;
  batch_number: string | null;
  purchase_cost: number;
  selling_price: number;
  received_quantity: number;
  available_quantity: number;
  expiry_date: string | null;
}

export interface PurchaseItem {
  id: number;
  product_id: number;
  quantity: number;
  received_quantity: number;
  unit_cost: number;
  selling_price: number;
  discount: number;
  line_total: number;
  batch_number: string | null;
  manufactured_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  product: PurchaseProductOption;
  stock_batch: PurchaseStockBatch | null;
}

export interface Purchase {
  id: number;
  purchase_number: string;
  supplier_invoice_number: string | null;
  purchase_date: string;
  status: PurchaseStatus;
  subtotal: number;
  item_discount_total: number;
  discount: number;
  additional_cost: number;
  grand_total: number;
  notes: string | null;
  items_count: number;
  total_quantity: number;
  supplier: PurchaseSupplier;
  created_by: PurchaseUser;
  received_by: PurchaseUser | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  items?: PurchaseItem[];
}

export interface PurchaseItemFormValues {
  row_id: string;
  product_id: string;
  quantity: string;
  unit_cost: string;
  selling_price: string;
  discount: string;
  batch_number: string;
  manufactured_date: string;
  expiry_date: string;
  notes: string;
}

export interface PurchaseFormValues {
  supplier_id: string;
  supplier_invoice_number: string;
  purchase_date: string;
  discount: string;
  additional_cost: string;
  notes: string;
  receive_now: boolean;
  items: PurchaseItemFormValues[];
}

export interface ReceivePurchaseItemValues {
  purchase_item_id: number;
  received_quantity: string;
  selling_price: string;
  batch_number: string;
  manufactured_date: string;
  expiry_date: string;
}

export interface PurchasePaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface PurchaseListResponse {
  data: Purchase[];
  meta: PurchasePaginationMeta;
}

export interface PurchaseResponse {
  message?: string;
  data: Purchase;
}

export interface DeletePurchaseResponse {
  message: string;
}

export interface ProductOptionsResponse {
  data: PurchaseProductOption[];
}

export interface PurchaseListParameters {
  search?: string;
  supplierId?: string;
  status?: string;
  page?: number;
  perPage?: number;
}
