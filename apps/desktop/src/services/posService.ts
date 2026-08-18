import { apiRequest } from "../lib/api";

import type {
  CompleteSalePaymentInput,
  CompleteSaleResponse,
  CompleteSaleValues,
  PosCartItem,
  PosCategoryResponse,
  PosProductListParameters,
  PosProductListResponse,
  PosProductResponse,
} from "../types/sale";

/* =========================================================
   PRODUCT QUERY
   ========================================================= */

function createProductQuery(parameters: PosProductListParameters): string {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 24));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.categoryId) {
    query.set("category_id", parameters.categoryId);
  }

  return query.toString();
}

/* =========================================================
   PAYMENT PAYLOAD
   ========================================================= */

/*
 * Clean each split-payment line before
 * sending it to Laravel.
 */
function buildPaymentPayload(payments: CompleteSalePaymentInput[]) {
  return payments.map((payment) => ({
    payment_method: payment.payment_method,

    amount: Number(payment.amount),

    reference_number: payment.reference_number.trim() || null,

    notes: payment.notes.trim() || null,
  }));
}

/* =========================================================
   CATEGORIES
   ========================================================= */

export async function getPosCategories(
  token: string
): Promise<PosCategoryResponse> {
  return apiRequest("/pos/categories", {
    method: "GET",

    token,
  });
}

/* =========================================================
   PRODUCTS
   ========================================================= */

export async function getPosProducts(
  token: string,

  parameters: PosProductListParameters
): Promise<PosProductListResponse> {
  return apiRequest(`/pos/products?${createProductQuery(parameters)}`, {
    method: "GET",

    token,
  });
}

/* =========================================================
   SINGLE PRODUCT
   ========================================================= */

export async function getPosProduct(
  token: string,

  productId: number
): Promise<PosProductResponse> {
  return apiRequest(`/pos/products/${productId}`, {
    method: "GET",

    token,
  });
}

/* =========================================================
   COMPLETE SALE
   ========================================================= */

export async function completePosSale(
  token: string,

  cartItems: PosCartItem[],

  values: CompleteSaleValues
): Promise<CompleteSaleResponse> {
  /*
   * payments[] is now the authoritative
   * payment information.
   *
   * Example:
   *
   * Total = Rs.5,000
   *
   * payments:
   *
   * Cash:
   * Rs.2,500
   *
   * Card:
   * Rs.1,500
   *
   * Bank:
   * Rs.1,000
   */
  const payments =
    values.settlement_type === "due"
      ? []
      : buildPaymentPayload(values.payments);

  /*
   * Keep legacy top-level payment fields
   * during rollout.
   *
   * The modified Laravel API uses
   * payments[] as the authoritative source.
   *
   * These legacy fields make the desktop
   * client safer if different machines are
   * temporarily running different builds.
   */
  const legacyPaymentMethod =
    payments.length === 1 ? payments[0].payment_method : values.payment_method;

  const totalSubmittedPayment = payments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );

  const legacyReference =
    payments.length === 1
      ? payments[0].reference_number
      : values.reference_number.trim() || null;

  return apiRequest("/sales", {
    method: "POST",

    token,

    body: JSON.stringify({
      /*
       * =================================================
       * CUSTOMER
       * =================================================
       */

      customer_id: values.customer_id,

      /*
       * =================================================
       * SETTLEMENT
       * =================================================
       */

      settlement_type: values.settlement_type,

      /*
       * =================================================
       * SALE DISCOUNT
       * =================================================
       */

      discount: Number(values.discount || 0),

      /*
       * =================================================
       * AUTHORITATIVE SPLIT PAYMENTS
       * =================================================
       *
       * Example:
       *
       * [
       *   {
       *     payment_method: "cash",
       *     amount: 2500
       *   },
       *   {
       *     payment_method: "card",
       *     amount: 1500
       *   },
       *   {
       *     payment_method:
       *       "bank_transfer",
       *     amount: 1000
       *   }
       * ]
       */

      payments,

      /*
       * =================================================
       * LEGACY COMPATIBILITY FIELDS
       * =================================================
       */

      payment_method:
        values.settlement_type === "due" ? null : legacyPaymentMethod,

      /*
       * For split payment:
       *
       * amount_received =
       * combined payment amount.
       *
       * For single cash payment the
       * PaymentModal may provide the
       * actual tendered cash amount so
       * change can still be calculated
       * correctly by the backend.
       */
      amount_received:
        values.settlement_type === "due"
          ? 0
          : payments.length === 1 && payments[0].payment_method === "cash"
            ? Number(values.amount_received || payments[0].amount || 0)
            : Number(totalSubmittedPayment),

      /*
       * =================================================
       * DUE DATE
       * =================================================
       *
       * Optional.
       */

      due_date:
        values.settlement_type === "full"
          ? null
          : values.due_date.trim() || null,

      /*
       * =================================================
       * LEGACY TOP-LEVEL REFERENCE
       * =================================================
       *
       * Individual split-payment references
       * are already contained inside
       * payments[].
       */

      reference_number: legacyReference,

      /*
       * =================================================
       * SALE NOTES
       * =================================================
       */

      notes: values.notes.trim() || null,

      /*
       * =================================================
       * SALE ITEMS
       * =================================================
       */

      items: cartItems.map((item) => ({
        stock_batch_id: item.stock_batch_id,

        quantity: Number(item.quantity),

        sale_unit: item.sale_unit.trim(),

        discount: Number(item.discount || 0),
      })),
    }),
  });
}
