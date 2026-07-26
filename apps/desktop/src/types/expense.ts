import type { PosPaginationMeta, PosPaymentMethod } from "./sale";

export type ExpenseType = "one_time" | "recurring";

export type ExpenseRecurringFrequency =
  "weekly" | "monthly" | "quarterly" | "yearly";

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  expenses_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategoryInput {
  name: string;
  description: string;
  is_active: boolean;
}

export interface ExpenseCategoryListResponse {
  data: ExpenseCategory[];
  meta: PosPaginationMeta;
}

export interface ExpenseCategoryOptionsResponse {
  data: ExpenseCategory[];
}

export interface ExpenseCategoryResponse {
  message?: string;
  data: ExpenseCategory;
}

export interface Expense {
  id: number;
  expense_number: string;
  expense_date: string;
  amount: number;
  payment_method: PosPaymentMethod;
  expense_type: ExpenseType;

  recurring_frequency: ExpenseRecurringFrequency | null;

  recurring_end_date: string | null;

  description: string;
  reference_number: string | null;
  notes: string | null;

  category: {
    id: number;
    name: string;
    is_active: boolean;
  };

  created_by: {
    id: number;
    name: string;
    username?: string;
  };

  created_at: string;
  updated_at: string;
}

export interface ExpenseInput {
  expense_category_id: number;
  expense_date: string;
  amount: number;
  payment_method: PosPaymentMethod;
  expense_type: ExpenseType;

  recurring_frequency: ExpenseRecurringFrequency | null;

  recurring_end_date: string;
  description: string;
  reference_number: string;
  notes: string;
}

export interface ExpenseSummary {
  total_expenses: number;
  total_amount: number;
  one_time_amount: number;
  recurring_amount: number;
}

export interface ExpenseListResponse {
  data: Expense[];
  summary: ExpenseSummary;
  meta: PosPaginationMeta;
}

export interface ExpenseResponse {
  message?: string;
  data: Expense;
}
