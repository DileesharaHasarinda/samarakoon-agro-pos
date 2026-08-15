export {};

declare global {
  interface DevicePrinterInfo {
    name: string;
    displayName: string;
    isDefault: boolean;
    status: number;
  }

  interface LocalPrinterConfig {
    receiptPrinterName: string;
  }

  interface PrinterActionResult {
    success: boolean;
    error?: string;
  }

  interface Window {
    printerConfig?: {
      getConfig: () => Promise<LocalPrinterConfig | null>;

      saveConfig: (config: LocalPrinterConfig) => Promise<PrinterActionResult>;

      getPrinters: () => Promise<DevicePrinterInfo[]>;

      testPrint: (options: {
        printerName: string;
        paperWidthMm: 58 | 80;
      }) => Promise<PrinterActionResult>;
    };
  }
}
