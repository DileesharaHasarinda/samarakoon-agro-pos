// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("posPrint", {
  printSilently: (
    html: string,
    options: {
      printerName?: string | null;
      paperWidthMicrons?: number;
      paperHeightMicrons?: number;
    }
  ) => ipcRenderer.invoke("pos-print-silently", { html, options }),

  printReceiptEscPos: (payload: {
    printerName: string;
    paperWidthMm: 58 | 80;
    businessName: string;
    addressLines: string[];
    receiptTitle: string;
    metaLines: Array<{ left: string; right?: string }>;
    items: Array<{
      name: string;
      meta?: string[];
      quantityLine: string;
      lineTotal: string;
      discountLine?: string;
    }>;
    totalsLines: Array<{ left: string; right?: string }>;
    statusLines: Array<{ left: string; right?: string }>;
    notes?: string | null;
    footerText?: string | null;
    copies: number;
    duplicateLabel: boolean;
  }) => ipcRenderer.invoke("pos-print-receipt-escpos", payload),

  getPrinters: () => ipcRenderer.invoke("pos-get-printers"),
});

contextBridge.exposeInMainWorld("serverConfig", {
  getConfig: () => ipcRenderer.invoke("get-server-config"),

  saveConfig: (config: { apiBaseUrl: string }) =>
    ipcRenderer.invoke("save-server-config", config),
});
