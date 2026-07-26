import { apiRequest } from "../lib/api";

import type {
  InventoryAlertResponse,
  ProductStockSettingInput,
} from "../types/inventoryAlert";

export async function getInventoryAlerts(
  token: string,
  parameters: {
    search?: string;
    alertStatus?: string;
    page?: number;
    perPage?: number;
  }
): Promise<InventoryAlertResponse> {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 20));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.alertStatus) {
    query.set("alert_status", parameters.alertStatus);
  }

  return apiRequest<InventoryAlertResponse>(
    `/inventory-alerts?${query.toString()}`,
    {
      method: "GET",
      token,
    }
  );
}

export async function updateProductStockSettings(
  token: string,
  productId: number,
  values: ProductStockSettingInput
): Promise<{
  message: string;
}> {
  return apiRequest<{
    message: string;
  }>(`/products/${productId}/stock-settings`, {
    method: "PUT",
    token,
    body: JSON.stringify(values),
  });
}
