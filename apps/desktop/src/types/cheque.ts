export type ChequeType = "received" | "issued";

export type ChequeStatus = "pending" | "cleared" | "bounced" | "cancelled";

export interface ChequeUser {
  id: number;
  name: string;
  username: string;
}

export interface Cheque {
  id: number;
  cheque_number: string;
  type: ChequeType;
  party_name: string;
  bank_name: string | null;
  amount: string;
  cheque_date: string;
  due_date: string;
  status: ChequeStatus;
  notes: string | null;
  created_by: number | null;
  createdBy: ChequeUser | null;
  cleared_at: string | null;
  bounced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChequeSummary {
  total_cheques: number;
  pending_count: number;
  pending_amount: number;
  bounced_count: number;
  due_soon_count: number;
  overdue_count: number;
}

export interface ChequeListResponse {
  data: Cheque[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  summary: ChequeSummary;
}

export interface ChequeResponse {
  data: Cheque;
  message?: string;
}

export interface ChequeAlerts {
  due_soon_count: number;
  overdue_count: number;
  bounced_count: number;
  total_alerts: number;
  due_soon: Cheque[];
  overdue: Cheque[];
  bounced: Cheque[];
}

export interface ChequeFormValues {
  cheque_number: string;
  type: ChequeType;
  party_name: string;
  bank_name: string;
  amount: string;
  cheque_date: string;
  due_date: string;
  notes: string;
}

export const defaultChequeFormValues: ChequeFormValues = {
  cheque_number: "",
  type: "received",
  party_name: "",
  bank_name: "",
  amount: "",
  cheque_date: "",
  due_date: "",
  notes: "",
};
