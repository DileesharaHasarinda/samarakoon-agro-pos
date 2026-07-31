import { app, BrowserWindow, ipcMain } from "electron";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import started from "electron-squirrel-startup";

const execFileAsync = promisify(execFile);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0b3d24",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

interface PosPrintOptions {
  printerName?: string | null;
  paperWidthMicrons?: number;
  paperHeightMicrons?: number;
}

interface PosPrintResult {
  success: boolean;
  error?: string;
}

interface RuntimePrinterInfo {
  name: string;
  displayName: string;
  description?: string;
  status?: number;
  isDefault?: boolean;
}

interface EscPosReceiptLine {
  left: string;
  right?: string;
}

interface EscPosReceiptItem {
  name: string;
  meta?: string[];
  quantityLine: string;
  lineTotal: string;
  discountLine?: string;
}

interface EscPosReceiptPayload {
  printerName: string;
  paperWidthMm: 58 | 80;

  businessName: string;
  addressLines: string[];
  receiptTitle: string;

  metaLines: EscPosReceiptLine[];
  items: EscPosReceiptItem[];
  totalsLines: EscPosReceiptLine[];
  statusLines: EscPosReceiptLine[];

  notes?: string | null;
  footerText?: string | null;

  copies: number;
  duplicateLabel: boolean;
}

async function listSystemPrinters(): Promise<RuntimePrinterInfo[]> {
  const existingWindow =
    BrowserWindow.getFocusedWindow() ??
    BrowserWindow.getAllWindows()[0] ??
    null;

  if (existingWindow && !existingWindow.isDestroyed()) {
    const printers = await existingWindow.webContents.getPrintersAsync();
    return printers as unknown as RuntimePrinterInfo[];
  }

  const probeWindow = new BrowserWindow({ show: false });

  try {
    await probeWindow.loadURL("data:text/html,<html></html>");
    const printers = await probeWindow.webContents.getPrintersAsync();
    return printers as unknown as RuntimePrinterInfo[];
  } finally {
    if (!probeWindow.isDestroyed()) {
      probeWindow.close();
    }
  }
}

async function printHtmlSilently(
  html: string,
  options: PosPrintOptions
): Promise<PosPrintResult> {
  if (options.printerName) {
    try {
      const printers = await listSystemPrinters();

      const matchedPrinter = printers.find(
        (printer) => printer.name === options.printerName
      );

      if (!matchedPrinter) {
        return {
          success: false,
          error: `No printer named "${options.printerName}" was found. Check the printer name in Business Settings matches the exact name registered in your operating system.`,
        };
      }

      if (matchedPrinter.status === 3) {
        return {
          success: false,
          error: `The printer "${options.printerName}" is offline. Check the power and connection, then try again.`,
        };
      }
    } catch {
      // Continue and let the actual print call surface the real error.
    }
  }

  let tempFilePath: string | null = null;

  try {
    tempFilePath = path.join(
      os.tmpdir(),
      `pos-print-${Date.now()}-${Math.random().toString(36).slice(2)}.html`
    );

    await fs.writeFile(tempFilePath, html, "utf-8");
  } catch (writeError) {
    return {
      success: false,
      error: `Could not prepare the print document: ${
        writeError instanceof Error ? writeError.message : String(writeError)
      }`,
    };
  }

  const finalTempFilePath = tempFilePath;

  return new Promise((resolve) => {
    let printWindow: BrowserWindow | null = null;
    let settled = false;

    const cleanup = () => {
      if (printWindow && !printWindow.isDestroyed()) {
        printWindow.close();
      }

      void fs.unlink(finalTempFilePath).catch(() => {
        // Best-effort cleanup; ignore failures.
      });
    };

    const finish = (result: PosPrintResult) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(result);
    };

    try {
      printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          offscreen: false,
        },
      });
    } catch (createError) {
      finish({
        success: false,
        error: `Could not create the print window: ${
          createError instanceof Error
            ? createError.message
            : String(createError)
        }`,
      });

      return;
    }

    printWindow.webContents.once("did-finish-load", () => {
      const printOptions: Electron.WebContentsPrintOptions = {
        silent: true,
        printBackground: true,
        margins: {
          marginType: "none",
        },
      };

      if (options.printerName) {
        printOptions.deviceName = options.printerName;
      }

      if (options.paperWidthMicrons && options.paperHeightMicrons) {
        (
          printOptions as unknown as {
            pageSize: { width: number; height: number };
          }
        ).pageSize = {
          width: options.paperWidthMicrons,
          height: options.paperHeightMicrons,
        };
      } else if (options.paperWidthMicrons) {
        printOptions.pageSize = "A4";
      }

      try {
        printWindow?.webContents.print(printOptions, (success, errorType) => {
          if (success) {
            finish({ success: true });
          } else {
            finish({
              success: false,
              error:
                errorType ||
                "The print job could not be completed. Check that the printer is powered on, connected and not paused.",
            });
          }
        });
      } catch (printCallError) {
        finish({
          success: false,
          error: `Print call failed: ${
            printCallError instanceof Error
              ? printCallError.message
              : String(printCallError)
          }`,
        });
      }
    });

    printWindow.webContents.once(
      "did-fail-load",
      (_event, errorCode, errorDescription) => {
        finish({
          success: false,
          error: `Failed to load print content (${errorCode}): ${errorDescription}`,
        });
      }
    );

    printWindow.loadFile(finalTempFilePath).catch((loadError) => {
      finish({
        success: false,
        error: `Failed to load the print document: ${
          loadError instanceof Error ? loadError.message : String(loadError)
        }`,
      });
    });
  });
}

/**
 * ESC/POS raw command builder. Each function appends raw bytes to
 * the buffer array; the printer's own firmware interprets these
 * directly, so text always renders at the printer's native
 * resolution with its own built-in font — no HTML rasterization,
 * no blockiness, no clipping.
 */
class EscPosBuilder {
  private chunks: Buffer[] = [];

  private readonly lineWidth: number;

  constructor(charactersPerLine: number) {
    this.lineWidth = charactersPerLine;
    this.chunks.push(Buffer.from([0x1b, 0x40])); // ESC @ : initialize

    // ESC t 0 : select character code page 0 (PC437, USA/Standard
    // Europe). Without this, the printer uses whatever code page
    // it happens to default to, which can cause plain ASCII bytes
    // to render as unrelated accented characters on some
    // firmware/region variants.
    this.chunks.push(Buffer.from([0x1b, 0x74, 0x00]));
  }

  private push(bytes: number[]): void {
    this.chunks.push(Buffer.from(bytes));
  }

  private text(value: string): void {
    // Intl.NumberFormat can insert Unicode space variants (non-
    // breaking space U+00A0, narrow no-break space U+202F, thin
    // space U+2009, etc.) between a currency code and its amount,
    // depending on locale/ICU data. These are NOT plain ASCII, so
    // if we only stripped non-ASCII characters, they would vanish
    // entirely and squash "LKR" directly against the number
    // (or worse, get reinterpreted by the printer's active code
    // page as an unrelated character such as "á"). Normalizing
    // them to a regular space first keeps spacing correct and
    // predictable.
    const normalized = value.replace(
      /[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g,
      " ",
    );

    // Also normalize common "smart" punctuation that word
    // processors or autocorrect may introduce, so it degrades to
    // a safe ASCII equivalent instead of being silently dropped.
    const punctuationNormalized = normalized
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-");

    // Finally, strip anything still outside standard printable
    // ASCII (space through tilde). Anything left at this point has
    // no safe universal representation across printer code pages,
    // so dropping it is safer than risking a misrendered character.
    const asciiSafe = punctuationNormalized.replace(/[^\x20-\x7E]/g, "");

    this.chunks.push(Buffer.from(asciiSafe, "ascii"));
  }

  alignCenter(): this {
    this.push([0x1b, 0x61, 0x01]);
    return this;
  }

  alignLeft(): this {
    this.push([0x1b, 0x61, 0x00]);
    return this;
  }

  bold(on: boolean): this {
    this.push([0x1b, 0x45, on ? 1 : 0]);
    return this;
  }

  doubleSize(on: boolean): this {
    // GS ! : character size. 0x11 = double width + double height.
    this.push([0x1d, 0x21, on ? 0x11 : 0x00]);
    return this;
  }

  println(value = ""): this {
    this.text(value);
    this.push([0x0a]);
    return this;
  }

  newLine(): this {
    this.push([0x0a]);
    return this;
  }

  drawLine(character = "-"): this {
    this.println(character.repeat(this.lineWidth));
    return this;
  }

  leftRight(left: string, right: string): this {
    const maxLeftWidth = Math.max(1, this.lineWidth - right.length - 1);

    const trimmedLeft =
      left.length > maxLeftWidth ? left.slice(0, maxLeftWidth) : left;

    const gap = Math.max(1, this.lineWidth - trimmedLeft.length - right.length);

    this.println(`${trimmedLeft}${" ".repeat(gap)}${right}`);

    return this;
  }

  cut(): this {
    this.newLine();
    this.newLine();
    // GS V 1 : partial cut (falls back to full feed-and-cut on
    // printers without a cutter, which the TM-T82 has built in).
    this.push([0x1d, 0x56, 0x01]);
    return this;
  }

  toBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

function buildEscPosBuffer(payload: EscPosReceiptPayload): Buffer {
  const charactersPerLine = payload.paperWidthMm === 58 ? 32 : 48;

  const copies = Math.max(1, Math.min(3, payload.copies || 1));

  const builders: Buffer[] = [];

  for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
    const doc = new EscPosBuilder(charactersPerLine);

    if (copyIndex > 0 && payload.duplicateLabel) {
      doc
        .alignCenter()
        .bold(true)
        .println("DUPLICATE COPY")
        .bold(false)
        .newLine();
    }

    doc.alignCenter().bold(true).doubleSize(true);
    doc.println(payload.businessName);
    doc.doubleSize(false).bold(false);

    payload.addressLines
      .filter((line) => line && line.trim().length > 0)
      .forEach((line) => {
        doc.println(line);
      });

    doc.newLine().bold(true);
    doc.println(payload.receiptTitle.toUpperCase());
    doc.bold(false);

    doc.drawLine();
    doc.alignLeft();

    payload.metaLines.forEach((line) => {
      if (line.right) {
        doc.leftRight(line.left, line.right);
      } else {
        doc.println(line.left);
      }
    });

    doc.drawLine();

    payload.items.forEach((item) => {
      doc.bold(true).println(item.name).bold(false);

      (item.meta ?? []).forEach((metaLine) => {
        doc.println(`  ${metaLine}`);
      });

      doc.leftRight(item.quantityLine, item.lineTotal);

      if (item.discountLine) {
        doc.println(`  ${item.discountLine}`);
      }
    });

    doc.drawLine();

    payload.totalsLines.forEach((line) => {
      if (line.right) {
        doc.leftRight(line.left, line.right);
      } else {
        doc.println(line.left);
      }
    });

    doc.drawLine();

    payload.statusLines.forEach((line) => {
      if (line.right) {
        doc.leftRight(line.left, line.right);
      } else {
        doc.println(line.left);
      }
    });

    if (payload.notes) {
      doc.newLine().bold(true).println("Notes").bold(false);
      doc.println(payload.notes);
    }

    if (payload.footerText) {
      doc.newLine().alignCenter().println(payload.footerText);
    }

    doc.cut();

    builders.push(doc.toBuffer());
  }

  return Buffer.concat(builders);
}

/**
 * Sends raw ESC/POS bytes directly to a USB-connected printer via
 * the operating system's own raw printing mode.
 *
 * On macOS and Linux this uses CUPS's built-in `lp` command with
 * the `-o raw` flag, which bypasses CUPS's normal document
 * rendering pipeline entirely — the printer receives our exact
 * bytes and interprets them using its own built-in ESC/POS
 * firmware, avoiding the bitmap rasterization that previously
 * caused blocky/clipped text.
 *
 * Windows uses a PowerShell raw copy to the printer's share name
 * as a fallback, since Windows does not ship an `lp` equivalent.
 */
async function printReceiptEscPosUsb(
  payload: EscPosReceiptPayload
): Promise<PosPrintResult> {
  if (!payload.printerName) {
    return {
      success: false,
      error:
        "No printer name is configured. Enter the exact printer name (as shown in your operating system) in Business Settings.",
    };
  }

  try {
    const printers = await listSystemPrinters();

    const matchedPrinter = printers.find(
      (printer) => printer.name === payload.printerName
    );

    if (!matchedPrinter) {
      return {
        success: false,
        error: `No printer named "${payload.printerName}" was found. Check the printer name in Business Settings matches the exact name shown in your operating system's printer list.`,
      };
    }

    if (matchedPrinter.status === 3) {
      return {
        success: false,
        error: `The printer "${payload.printerName}" is offline. Check the USB cable and power, then try again.`,
      };
    }
  } catch {
    // Continue; let the raw print call surface any real failure.
  }

  const buffer = buildEscPosBuffer(payload);

  const tempFilePath = path.join(
    os.tmpdir(),
    `pos-escpos-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`
  );

  try {
    await fs.writeFile(tempFilePath, buffer);
  } catch (writeError) {
    return {
      success: false,
      error: `Could not prepare the print data: ${
        writeError instanceof Error ? writeError.message : String(writeError)
      }`,
    };
  }

  try {
    if (process.platform === "win32") {
      // Windows fallback: copy the raw bytes to the printer's
      // share as a binary file, which spools it unmodified.
      await execFileAsync("cmd", [
        "/c",
        "copy",
        "/b",
        tempFilePath,
        `\\\\localhost\\${payload.printerName}`,
      ]);
    } else {
      // macOS and Linux: CUPS raw printing.
      await execFileAsync("lp", [
        "-d",
        payload.printerName,
        "-o",
        "raw",
        tempFilePath,
      ]);
    }

    return { success: true };
  } catch (printError) {
    return {
      success: false,
      error: `Printing failed: ${
        printError instanceof Error ? printError.message : String(printError)
      }`,
    };
  } finally {
    void fs.unlink(tempFilePath).catch(() => {
      // Best-effort cleanup; ignore failures.
    });
  }
}

ipcMain.handle(
  "pos-print-silently",
  async (
    _event,
    payload: {
      html: string;
      options: PosPrintOptions;
    }
  ): Promise<PosPrintResult> => {
    try {
      return await printHtmlSilently(payload.html, payload.options);
    } catch (unexpectedError) {
      return {
        success: false,
        error: `Unexpected printing error: ${
          unexpectedError instanceof Error
            ? unexpectedError.message
            : String(unexpectedError)
        }`,
      };
    }
  }
);

ipcMain.handle(
  "pos-print-receipt-escpos",
  async (_event, payload: EscPosReceiptPayload): Promise<PosPrintResult> => {
    try {
      return await printReceiptEscPosUsb(payload);
    } catch (unexpectedError) {
      return {
        success: false,
        error: `Unexpected printing error: ${
          unexpectedError instanceof Error
            ? unexpectedError.message
            : String(unexpectedError)
        }`,
      };
    }
  }
);

ipcMain.handle("pos-get-printers", async () => {
  try {
    const printers = await listSystemPrinters();

    return printers.map((printer) => ({
      name: printer.name,
      displayName: printer.displayName,
      isDefault: printer.isDefault ?? false,
      status: printer.status ?? 0,
    }));
  } catch {
    return [];
  }
});

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});