import { apiRequest } from "../lib/api";

import type {
  AdminDashboardResponse,
  CashierDashboardResponse,
} from "../types/dashboard";

export async function getAdminDashboard(
  token: string
): Promise<AdminDashboardResponse> {
  return apiRequest<AdminDashboardResponse>("/dashboard/admin", {
    method: "GET",
    token,
  });
}

export async function getCashierDashboard(
  token: string
): Promise<CashierDashboardResponse> {
  return apiRequest<CashierDashboardResponse>("/dashboard/cashier", {
    method: "GET",
    token,
  });
}
