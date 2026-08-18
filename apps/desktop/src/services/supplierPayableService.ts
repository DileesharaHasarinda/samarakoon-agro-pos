import { apiRequest } from "../lib/api";

import type {
  ConfigurePurchaseSettlementInput,
  SupplierPayableDetailsResponse,
  SupplierPayableResponse,
  SupplierPaymentInput,
  SupplierPaymentLineInput,
} from "../types/supplierPayable";

function normalisePaymentLine(payment: SupplierPaymentLineInput) {
  return {
    payment_method: payment.payment_method,

    amount: Number(payment.amount),

    reference_number: payment.reference_number.trim() || null,

    notes: payment.notes.trim() || null,
  };
}

export async function getSupplierPayables(
  token: string,
  parameters: {
    search?: string;
    status?: string;
    page?: number;
    perPage?: number;
  }
): Promise<SupplierPayableResponse> {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 20));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.status) {
    query.set("status", parameters.status);
  }

  return apiRequest<SupplierPayableResponse>(
    `/supplier-payables?${query.toString()}`,
    {
      method: "GET",
      token,
    }
  );
}

export async function getSupplierPayableDetails(
  token: string,
  purchaseId: number
): Promise<SupplierPayableDetailsResponse> {
  return apiRequest<SupplierPayableDetailsResponse>(
    `/supplier-payables/${purchaseId}`,
    {
      method: "GET",
      token,
    }
  );
}

export async function configurePurchaseSettlement(
  token: string,
  purchaseId: number,
  values: ConfigurePurchaseSettlementInput
): Promise<SupplierPayableDetailsResponse> {
  return apiRequest<SupplierPayableDetailsResponse>(
    `/purchases/${purchaseId}/settlement`,
    {
      method: "PUT",

      token,

      body: JSON.stringify({
        settlement_type: values.settlement_type,

        payments: values.payments.map(normalisePaymentLine),

        due_date: values.due_date.trim() || null,

        payment_terms: values.payment_terms.trim() || null,
      }),
    }
  );
}

export async function recordSupplierPayment(
  token: string,
  purchaseId: number,
  values: SupplierPaymentInput
): Promise<SupplierPayableDetailsResponse> {
  return apiRequest<SupplierPayableDetailsResponse>(
    `/purchases/${purchaseId}/supplier-payments`,
    {
      method: "POST",

      token,

      body: JSON.stringify({
        payments: values.payments.map(normalisePaymentLine),
      }),
    }
  );
}
