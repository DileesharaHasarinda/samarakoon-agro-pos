export interface LocalPrinterConfig {
  receiptPrinterName: string;
}

export interface DevicePrinterInfo {
  name: string;
  displayName: string;
  isDefault: boolean;
  status: number;
}

export interface PrinterActionResult {
  success: boolean;
  error?: string;
}

function getPrinterBridge() {
  if (typeof window === "undefined" || !window.printerConfig) {
    throw new Error(
      "Device printer configuration is not available in this desktop build."
    );
  }

  return window.printerConfig;
}

export async function loadPrinterConfig(): Promise<LocalPrinterConfig | null> {
  return getPrinterBridge().getConfig();
}

export async function savePrinterConfig(
  config: LocalPrinterConfig
): Promise<PrinterActionResult> {
  return getPrinterBridge().saveConfig(config);
}

export async function getInstalledPrinters(): Promise<DevicePrinterInfo[]> {
  return getPrinterBridge().getPrinters();
}

export async function testReceiptPrinter(
  printerName: string,
  paperWidthMm: 58 | 80
): Promise<PrinterActionResult> {
  return getPrinterBridge().testPrint({
    printerName,
    paperWidthMm,
  });
}
