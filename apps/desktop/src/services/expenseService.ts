import { apiRequest } from "../lib/api";

import type {
  ExpenseCategoryInput,
  ExpenseCategoryListResponse,
  ExpenseCategoryOptionsResponse,
  ExpenseCategoryResponse,
  ExpenseInput,
  ExpenseListResponse,
  ExpenseResponse,
} from "../types/expense";

export async function getExpenseCategories(
  token: string,
  parameters: {
    search?: string;
    status?: string;
    page?: number;
    perPage?: number;
  } = {}
): Promise<ExpenseCategoryListResponse> {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 100));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.status) {
    query.set("status", parameters.status);
  }

  return apiRequest<ExpenseCategoryListResponse>(
    `/expense-categories?${query.toString()}`,
    {
      method: "GET",
      token,
    }
  );
}

export async function getExpenseCategoryOptions(
  token: string
): Promise<ExpenseCategoryOptionsResponse> {
  return apiRequest<ExpenseCategoryOptionsResponse>(
    "/expense-categories/options",
    {
      method: "GET",
      token,
    }
  );
}

export async function createExpenseCategory(
  token: string,
  values: ExpenseCategoryInput
): Promise<ExpenseCategoryResponse> {
  return apiRequest<ExpenseCategoryResponse>("/expense-categories", {
    method: "POST",
    token,

    body: JSON.stringify({
      name: values.name.trim(),

      description: values.description.trim() || null,

      is_active: values.is_active,
    }),
  });
}

export async function updateExpenseCategory(
  token: string,
  categoryId: number,
  values: ExpenseCategoryInput
): Promise<ExpenseCategoryResponse> {
  return apiRequest<ExpenseCategoryResponse>(
    `/expense-categories/${categoryId}`,
    {
      method: "PUT",
      token,

      body: JSON.stringify({
        name: values.name.trim(),

        description: values.description.trim() || null,

        is_active: values.is_active,
      }),
    }
  );
}

export async function deleteExpenseCategory(
  token: string,
  categoryId: number
): Promise<{
  message: string;
}> {
  return apiRequest<{
    message: string;
  }>(`/expense-categories/${categoryId}`, {
    method: "DELETE",
    token,
  });
}

export async function getExpenses(
  token: string,
  parameters: {
    search?: string;
    categoryId?: string;
    paymentMethod?: string;
    expenseType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    perPage?: number;
  }
): Promise<ExpenseListResponse> {
  const query = new URLSearchParams();

  query.set("page", String(parameters.page ?? 1));

  query.set("per_page", String(parameters.perPage ?? 20));

  if (parameters.search?.trim()) {
    query.set("search", parameters.search.trim());
  }

  if (parameters.categoryId) {
    query.set("category_id", parameters.categoryId);
  }

  if (parameters.paymentMethod) {
    query.set("payment_method", parameters.paymentMethod);
  }

  if (parameters.expenseType) {
    query.set("expense_type", parameters.expenseType);
  }

  if (parameters.dateFrom) {
    query.set("date_from", parameters.dateFrom);
  }

  if (parameters.dateTo) {
    query.set("date_to", parameters.dateTo);
  }

  return apiRequest<ExpenseListResponse>(`/expenses?${query.toString()}`, {
    method: "GET",
    token,
  });
}

export async function createExpense(
  token: string,
  values: ExpenseInput
): Promise<ExpenseResponse> {
  return apiRequest<ExpenseResponse>("/expenses", {
    method: "POST",
    token,

    body: JSON.stringify({
      expense_category_id: values.expense_category_id,

      expense_date: values.expense_date,

      amount: values.amount,

      payment_method: values.payment_method,

      expense_type: values.expense_type,

      recurring_frequency:
        values.expense_type === "recurring" ? values.recurring_frequency : null,

      recurring_end_date:
        values.expense_type === "recurring"
          ? values.recurring_end_date.trim() || null
          : null,

      description: values.description.trim(),

      reference_number: values.reference_number.trim() || null,

      notes: values.notes.trim() || null,
    }),
  });
}

export async function updateExpense(
  token: string,
  expenseId: number,
  values: ExpenseInput
): Promise<ExpenseResponse> {
  return apiRequest<ExpenseResponse>(`/expenses/${expenseId}`, {
    method: "PUT",
    token,

    body: JSON.stringify({
      expense_category_id: values.expense_category_id,

      expense_date: values.expense_date,

      amount: values.amount,

      payment_method: values.payment_method,

      expense_type: values.expense_type,

      recurring_frequency:
        values.expense_type === "recurring" ? values.recurring_frequency : null,

      recurring_end_date:
        values.expense_type === "recurring"
          ? values.recurring_end_date.trim() || null
          : null,

      description: values.description.trim(),

      reference_number: values.reference_number.trim() || null,

      notes: values.notes.trim() || null,
    }),
  });
}

export async function deleteExpense(
  token: string,
  expenseId: number
): Promise<{
  message: string;
}> {
  return apiRequest<{
    message: string;
  }>(`/expenses/${expenseId}`, {
    method: "DELETE",
    token,
  });
}
