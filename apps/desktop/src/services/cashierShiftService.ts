import { apiRequest } from "../lib/api";

import type {
  CashierShiftListResponse,
  CashierShiftResponse,
  CashMovementInput,
  CloseShiftInput,
  OpenShiftInput,
} from "../types/cashierShift";

export async function getCurrentCashierShift(
  token: string
): Promise<CashierShiftResponse> {
  return apiRequest<CashierShiftResponse>("/cashier-shifts/current", {
    method: "GET",
    token,
  });
}

export async function getCashierShifts(
  token: string,
  parameters: {
    search?: string;
    cashierId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    perPage?: number;
  }
): Promise<CashierShiftListResponse> {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 20));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.cashierId) {
    query.set("cashier_id", parameters.cashierId);
  }

  if (parameters.status) {
    query.set("status", parameters.status);
  }

  if (parameters.dateFrom) {
    query.set("date_from", parameters.dateFrom);
  }

  if (parameters.dateTo) {
    query.set("date_to", parameters.dateTo);
  }

  return apiRequest<CashierShiftListResponse>(
    `/cashier-shifts?${query.toString()}`,
    {
      method: "GET",
      token,
    }
  );
}

export async function getCashierShift(
  token: string,
  shiftId: number
): Promise<CashierShiftResponse> {
  return apiRequest<CashierShiftResponse>(`/cashier-shifts/${shiftId}`, {
    method: "GET",
    token,
  });
}

export async function openCashierShift(
  token: string,
  values: OpenShiftInput
): Promise<CashierShiftResponse> {
  return apiRequest<CashierShiftResponse>("/cashier-shifts/open", {
    method: "POST",
    token,

    body: JSON.stringify({
      opening_cash: values.opening_cash,

      opening_notes: values.opening_notes.trim() || null,
    }),
  });
}

export async function closeCashierShift(
  token: string,
  shiftId: number,
  values: CloseShiftInput
): Promise<CashierShiftResponse> {
  return apiRequest<CashierShiftResponse>(`/cashier-shifts/${shiftId}/close`, {
    method: "POST",
    token,

    body: JSON.stringify({
      actual_cash: values.actual_cash,

      closing_notes: values.closing_notes.trim() || null,
    }),
  });
}

export async function createCashMovement(
  token: string,
  shiftId: number,
  values: CashMovementInput
): Promise<{
  message: string;

  data: {
    shift: NonNullable<CashierShiftResponse["data"]>;
  };
}> {
  return apiRequest<{
    message: string;

    data: {
      shift: NonNullable<CashierShiftResponse["data"]>;
    };
  }>(`/cashier-shifts/${shiftId}/movements`, {
    method: "POST",
    token,

    body: JSON.stringify({
      movement_type: values.movement_type,

      reason: values.reason,

      amount: values.amount,

      description: values.description.trim(),

      reference_number: values.reference_number.trim() || null,
    }),
  });
}
