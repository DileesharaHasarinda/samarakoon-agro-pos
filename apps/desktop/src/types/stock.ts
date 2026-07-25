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
