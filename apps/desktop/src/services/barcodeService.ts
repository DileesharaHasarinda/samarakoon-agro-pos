import { apiRequest } from "../lib/api";

import type {
  BarcodeProductListResponse,
  BarcodeProductResponse,
  GenerateMissingBarcodesResponse,
} from "../types/barcode";

export function getBarcodeProducts(
  token: string,
  parameters: {
    search?: string;
    barcodeStatus?: string;
    page?: number;
    perPage?: number;
  }
): Promise<BarcodeProductListResponse> {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 20));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.barcodeStatus) {
    query.set("barcode_status", parameters.barcodeStatus);
  }

  return apiRequest<BarcodeProductListResponse>(
    `/barcodes/products?${query.toString()}`,
    {
      method: "GET",
      token,
    }
  );
}

export function updateProductBarcode(
  token: string,
  productId: number,
  barcode: string | null
): Promise<BarcodeProductResponse> {
  return apiRequest<BarcodeProductResponse>(`/products/${productId}/barcode`, {
    method: "PUT",
    token,

    body: JSON.stringify({
      barcode: barcode?.trim() || null,
    }),
  });
}

export function generateProductBarcode(
  token: string,
  productId: number
): Promise<BarcodeProductResponse> {
  return apiRequest<BarcodeProductResponse>(
    `/products/${productId}/barcode/generate`,
    {
      method: "POST",
      token,
    }
  );
}

export function generateMissingBarcodes(
  token: string,
  productIds?: number[]
): Promise<GenerateMissingBarcodesResponse> {
  return apiRequest<GenerateMissingBarcodesResponse>(
    "/barcodes/generate-missing",
    {
      method: "POST",
      token,

      body: JSON.stringify({
        product_ids: productIds && productIds.length > 0 ? productIds : null,
      }),
    }
  );
}
