import type { PosPaymentMethod } from "./sale";

export interface DashboardDailyPoint {
  date: string;
  label: string;
  sales: number;
  collections: number;
  expenses: number;
  returns: number;
}

export interface DashboardPaymentBreakdown {
  payment_method: PosPaymentMethod;
  transactions: number;
  total: number;
}

export interface DashboardCustomer {
  id: number;
  customer_code: string;
  name: string;
  mobile: string | null;
}

export interface DashboardUser {
  id: number;
  name: string;
  username?: string;
}

export interface DashboardRecentSale {
  id: number;
  sale_number: string;
  sale_date: string;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  payment_status: string;
  payment_method: PosPaymentMethod | null;
  items_count: number;
  customer: DashboardCustomer | null;
  created_by: DashboardUser;
}

export interface DashboardRecentExpense {
  id: number;
  expense_number: string;
  expense_date: string;
  description: string;
  amount: number;
  payment_method: PosPaymentMethod;

  category: {
    id: number;
    name: string;
  };

  created_by: {
    id: number;
    name: string;
  };
}

export interface DashboardTopProduct {
  id: number;
  name: string;
  unit: string;
  quantity_sold: number;
  sales_total: number;
  gross_profit: number;
}

export interface AdminDashboardSummary {
  today_sales_count: number;
  today_sales_total: number;
  today_collected_amount: number;
  today_due_sales: number;
  outstanding_due: number;
  today_expenses: number;
  today_return_refund: number;
  today_gross_profit: number;
  today_net_profit: number;
  stock_quantity: number;
  stock_purchase_value: number;
  stock_retail_value: number;
  expiring_batch_count: number;
  expired_batch_count: number;
  out_of_stock_products: number;
}

export interface AdminDashboardData {
  summary: AdminDashboardSummary;
  daily_series: DashboardDailyPoint[];
  payment_breakdown: DashboardPaymentBreakdown[];
  top_products: DashboardTopProduct[];
  recent_sales: DashboardRecentSale[];
  recent_expenses: DashboardRecentExpense[];
  generated_at: string;
}

export interface AdminDashboardResponse {
  data: AdminDashboardData;
}

export interface CashierDashboardSummary {
  today_sales_count: number;
  today_sales_total: number;
  today_collected_amount: number;
  today_due_sales: number;
  today_return_count: number;
  today_return_refund: number;
  today_registered_customers: number;
}

export interface CashierDashboardData {
  summary: CashierDashboardSummary;
  daily_series: DashboardDailyPoint[];
  payment_breakdown: DashboardPaymentBreakdown[];
  recent_sales: DashboardRecentSale[];
  generated_at: string;
}

export interface CashierDashboardResponse {
  data: CashierDashboardData;
}
