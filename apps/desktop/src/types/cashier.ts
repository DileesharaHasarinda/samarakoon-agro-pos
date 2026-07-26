import type { PosPaginationMeta } from "./sale";

export interface CashierStatistics {
  sales_count: number;
  sales_total: number;
  returns_count: number;
  payments_collected: number;
  shifts_count: number;
}

export interface CashierOpenShift {
  id: number;
  shift_number: string;
  opening_cash: number;
  opened_at: string;
}

export interface Cashier {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  role: "cashier";
  is_active: boolean;
  last_login_at: string | null;
  created_at: string | null;
  statistics: CashierStatistics;
  open_shift: CashierOpenShift | null;
}

export interface CashierInput {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  is_active: boolean;
}

export interface CashierUpdateInput {
  name: string;
  username: string;
  email: string;
  phone: string;
  is_active: boolean;
}

export interface CashierSummary {
  total_cashiers: number;
  active_cashiers: number;
  inactive_cashiers: number;
  cashiers_with_open_shift: number;
}

export interface CashierListResponse {
  data: Cashier[];
  summary: CashierSummary;
  meta: PosPaginationMeta;
}

export interface CashierResponse {
  message?: string;
  data: Cashier;
}
