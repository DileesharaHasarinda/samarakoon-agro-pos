import type { PosPaginationMeta } from "./sale";

export type CashierShiftStatus = "open" | "closed";

export type CashMovementType = "cash_in" | "cash_out";

export type CashMovementReason =
  | "cash_float"
  | "cash_drop"
  | "petty_cash"
  | "expense"
  | "deposit"
  | "withdrawal"
  | "other";

export interface ShiftCashier {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string | null;
}

export interface CashRegisterMovement {
  id: number;
  movement_type: CashMovementType;
  reason: CashMovementReason;
  amount: number;
  description: string;
  reference_number: string | null;
  occurred_at: string;

  created_by: {
    id: number;
    name: string;
  };
}

export interface CashierShiftTotals {
  sales_count: number;
  sales_total: number;
  due_created: number;
  cash_collections: number;
  card_collections: number;
  bank_transfer_collections: number;
  cash_refunds: number;
  cash_in: number;
  cash_out: number;
  expected_cash: number;
}

export interface CashierShift {
  id: number;
  shift_number: string;
  status: CashierShiftStatus;
  opening_cash: number;
  opened_at: string;
  closed_at: string | null;
  expected_cash: number;
  actual_cash: number | null;
  cash_difference: number | null;
  opening_notes: string | null;
  closing_notes: string | null;
  duration_minutes: number;
  cashier: ShiftCashier;

  opened_by: {
    id: number;
    name: string;
  };

  closed_by: {
    id: number;
    name: string;
  } | null;

  totals: CashierShiftTotals;
  movements: CashRegisterMovement[];
}

export interface CashierShiftSummary {
  total_shifts: number;
  open_shifts: number;
  closed_shifts: number;
  total_opening_cash: number;
  total_expected_cash: number;
  total_difference: number;
}

export interface CashierShiftListResponse {
  data: CashierShift[];
  summary: CashierShiftSummary;
  meta: PosPaginationMeta;
}

export interface CashierShiftResponse {
  message?: string;
  data: CashierShift | null;
}

export interface OpenShiftInput {
  opening_cash: number;
  opening_notes: string;
}

export interface CloseShiftInput {
  actual_cash: number;
  closing_notes: string;
}

export interface CashMovementInput {
  movement_type: CashMovementType;
  reason: CashMovementReason;
  amount: number;
  description: string;
  reference_number: string;
}
