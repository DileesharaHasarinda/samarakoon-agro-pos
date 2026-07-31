export type ReceiptPaperSize = "58mm" | "80mm";

export type PrintDocumentType = "receipt" | "invoice";

export interface BusinessSettingUser {
  id: number;
  name: string;
  username: string;
}

export interface BusinessSetting {
  id: number;

  business_name: string;
  business_short_name: string | null;
  address: string | null;
  phone: string | null;
  secondary_phone: string | null;
  email: string | null;
  website: string | null;
  registration_number: string | null;
  tax_number: string | null;

  currency_code: string;
  timezone: string;

  logo_data_url: string | null;

  receipt_title: string;
  receipt_footer: string | null;

  invoice_title: string;
  invoice_footer: string | null;

  receipt_paper_size: ReceiptPaperSize;

  default_print_document: PrintDocumentType;

  receipt_copies: number;
  printer_name: string | null;
  printer_ip_address: string | null;

  show_logo_on_receipt: boolean;
  show_business_address: boolean;
  show_customer_details: boolean;
  show_cashier_name: boolean;
  show_payment_reference: boolean;
  show_due_date: boolean;
  show_sku: boolean;
  show_batch_number: boolean;
  auto_print_after_sale: boolean;
  print_duplicate_label: boolean;

  updated_at: string | null;
  updated_by: BusinessSettingUser | null;
}

export interface BusinessSettingInput {
  business_name: string;
  business_short_name: string | null;
  address: string | null;
  phone: string | null;
  secondary_phone: string | null;
  email: string | null;
  website: string | null;
  registration_number: string | null;
  tax_number: string | null;

  currency_code: string;
  timezone: string;

  logo_data_url: string | null;

  receipt_title: string;
  receipt_footer: string | null;

  invoice_title: string;
  invoice_footer: string | null;

  receipt_paper_size: ReceiptPaperSize;

  default_print_document: PrintDocumentType;

  receipt_copies: number;
  printer_name: string | null;
  printer_ip_address: string | null;

  show_logo_on_receipt: boolean;
  show_business_address: boolean;
  show_customer_details: boolean;
  show_cashier_name: boolean;
  show_payment_reference: boolean;
  show_due_date: boolean;
  show_sku: boolean;
  show_batch_number: boolean;
  auto_print_after_sale: boolean;
  print_duplicate_label: boolean;
}

export interface BusinessSettingResponse {
  data: BusinessSetting;
  message?: string;
}

export const defaultBusinessSetting: BusinessSetting = {
  id: 0,

  business_name: "Samarakoon Agro",

  business_short_name: "Samarakoon Agro",

  address: null,
  phone: null,
  secondary_phone: null,
  email: null,
  website: null,
  registration_number: null,
  tax_number: null,

  currency_code: "LKR",
  timezone: "Asia/Colombo",

  logo_data_url: null,

  receipt_title: "SALES RECEIPT",

  receipt_footer: "Thank you for your business.",

  invoice_title: "SALES INVOICE",

  invoice_footer: "Thank you for your business.",

  receipt_paper_size: "80mm",

  default_print_document: "receipt",

  receipt_copies: 1,
  printer_name: null,
  printer_ip_address: null,

  show_logo_on_receipt: true,
  show_business_address: true,
  show_customer_details: true,
  show_cashier_name: true,
  show_payment_reference: true,
  show_due_date: true,
  show_sku: false,
  show_batch_number: false,
  auto_print_after_sale: false,
  print_duplicate_label: true,

  updated_at: null,
  updated_by: null,
};