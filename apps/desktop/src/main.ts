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

// ---------------------------------------------------------------
// Server configuration (persisted per-machine)
// ---------------------------------------------------------------

interface ServerConfig {
  apiBaseUrl: string;
}

function getServerConfigPath(): string {
  return path.join(app.getPath("userData"), "server-config.json");
}

async function readServerConfig(): Promise<ServerConfig | null> {
  try {
    const raw = await fs.readFile(getServerConfigPath(), "utf-8");
    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed.apiBaseUrl === "string" &&
      parsed.apiBaseUrl.trim().length > 0
    ) {
      return { apiBaseUrl: parsed.apiBaseUrl };
    }

    return null;
  } catch {
    return null;
  }
}

async function writeServerConfig(config: ServerConfig): Promise<void> {
  await fs.writeFile(
    getServerConfigPath(),
    JSON.stringify(config, null, 2),
    "utf-8"
  );
}

ipcMain.handle("get-server-config", async () => {
  return readServerConfig();
});

ipcMain.handle("save-server-config", async (_event, config: ServerConfig) => {
  await writeServerConfig(config);
  return { success: true };
});

// ---------------------------------------------------------------
// Receipt printer configuration (persisted per-machine)
// ---------------------------------------------------------------

interface PrinterConfig {
  receiptPrinterName: string;
}

function getPrinterConfigPath(): string {
  return path.join(app.getPath("userData"), "printer-config.json");
}

async function readPrinterConfig(): Promise<PrinterConfig | null> {
  try {
    const raw = await fs.readFile(getPrinterConfigPath(), "utf-8");
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed.receiptPrinterName === "string") {
      return {
        receiptPrinterName: parsed.receiptPrinterName.trim(),
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function writePrinterConfig(config: PrinterConfig): Promise<void> {
  await fs.writeFile(
    getPrinterConfigPath(),
    JSON.stringify(
      {
        receiptPrinterName: config.receiptPrinterName.trim(),
      },
      null,
      2
    ),
    "utf-8"
  );
}

ipcMain.handle("get-printer-config", async () => {
  return readPrinterConfig();
});

ipcMain.handle("save-printer-config", async (_event, config: PrinterConfig) => {
  const receiptPrinterName =
    typeof config?.receiptPrinterName === "string"
      ? config.receiptPrinterName.trim()
      : "";

  if (!receiptPrinterName) {
    return {
      success: false,
      error: "Select a receipt printer before saving.",
    };
  }

  try {
    const printers = await listSystemPrinters();

    const matchedPrinter = printers.find(
      (printer) => printer.name === receiptPrinterName
    );

    if (!matchedPrinter) {
      return {
        success: false,
        error: `No installed printer named "${receiptPrinterName}" was found on this computer.`,
      };
    }

    await writePrinterConfig({
      receiptPrinterName,
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save the local printer configuration.",
    };
  }
});

interface PosPrintOptions {
  printerName?: string | null;
  paperWidthMicrons?: number;
  paperHeightMicrons?: number;

  /**
   * When true, Chromium shapes the Sinhala/Unicode receipt into pixels,
   * then the bitmap is printed with the legacy ESC * 24-dot bit-image
   * command. This avoids both printer code-page corruption and the
   * GS v 0 compatibility problem seen on some thermal-printer clones.
   */
  unicodeThermalBitmap?: boolean;
  paperWidthMm?: 58 | 80;
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
  softwareCredit?: string | null;

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

async function validatePrinterForOutput(
  printerName: string
): Promise<PosPrintResult | null> {
  if (!printerName) {
    return {
      success: false,
      error:
        "No receipt printer is configured for this computer. Open Device Printer Settings and select the printer connected to this cashier PC.",
    };
  }

  try {
    const printers = await listSystemPrinters();

    const matchedPrinter = printers.find(
      (printer) => printer.name === printerName
    );

    if (!matchedPrinter) {
      return {
        success: false,
        error: `No printer named "${printerName}" was found on this computer. Open Device Printer Settings, refresh the printer list and select an installed printer.`,
      };
    }

    if (matchedPrinter.status === 3) {
      return {
        success: false,
        error: `The printer "${printerName}" is offline. Check the USB cable, power and operating-system printer status, then try again.`,
      };
    }
  } catch {
    // Best effort only. The actual print call can still report the
    // operating-system error if printer discovery fails.
  }

  return null;
}

async function waitForRenderedFonts(window: BrowserWindow): Promise<void> {
  try {
    await window.webContents.executeJavaScript(`
      (async () => {
        if (
          document.fonts &&
          document.fonts.ready
        ) {
          await document.fonts.ready;
        }

        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(resolve);
            });
          });
        });

        return true;
      })();
    `);
  } catch {
    // Best effort only.
  }
}

// ---------------------------------------------------------------
// Raw byte sending (shared by the ASCII ESC/POS text path and the
// Sinhala/Unicode raster path). Both bypass the OS print driver
// entirely — CUPS's `-o raw` mode (macOS/Linux) or a raw file copy
// to the printer share (Windows) hands the printer our exact bytes,
// so nothing rescales, re-paginates or reformats them.
// ---------------------------------------------------------------

async function sendRawBytesToPrinter(
  printerName: string,
  buffer: Buffer
): Promise<PosPrintResult> {
  const tempFilePath = path.join(
    os.tmpdir(),
    `pos-raw-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`
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
      await execFileAsync("cmd", [
        "/c",
        "copy",
        "/b",
        tempFilePath,
        `\\\\localhost\\${printerName}`,
      ]);
    } else {
      // macOS and Linux: CUPS raw printing.
      await execFileAsync("lp", ["-d", printerName, "-o", "raw", tempFilePath]);
    }

    return { success: true };
  } catch (printError) {
    return {
      success: false,
      error: `Printing failed on "${printerName}": ${
        printError instanceof Error ? printError.message : String(printError)
      }`,
    };
  } finally {
    void fs.unlink(tempFilePath).catch(() => {
      // Best-effort cleanup; ignore failures.
    });
  }
}

/**
 * SINHALA / UNICODE THERMAL PRINTING — COMPATIBILITY BITMAP MODE
 * ----------------------------------------------------------------
 *
 * The thermal printer's built-in text code pages do not contain Sinhala.
 * Sending Sinhala as ordinary ESC/POS text therefore produces corrupted
 * symbols. Printing Unicode HTML through some generic thermal drivers can
 * also convert the text back into the printer's code page.
 *
 * We therefore render the COMPLETE receipt inside Chromium first. At that
 * point Sinhala is already shaped correctly by the operating system's font
 * engine. We then convert the finished page to a monochrome bitmap.
 *
 * IMPORTANT: this version deliberately does NOT use GS v 0 raster-image
 * commands. Some inexpensive ESC/POS-compatible printers can lose command
 * synchronization after a large GS v 0 job and later print the image bytes
 * as garbage characters. Instead we use the older ESC * 24-dot bit-image
 * command in tiny 24-row bands. This command is slower, but it is much more
 * conservative and each command contains only one short strip of bitmap
 * data, so the printer never has to parse one huge raster block.
 */

const UNICODE_RENDER_SCALE = 2;

function thermalHeadWidthDots(paperWidthMm: 58 | 80): number {
  return paperWidthMm === 58 ? 384 : 576;
}

interface MonochromeReceiptBitmap {
  widthDots: number;
  heightDots: number;
  bits: Uint8Array;
}

async function rasterizeUnicodeReceipt(
  html: string,
  paperWidthMm: 58 | 80
): Promise<MonochromeReceiptBitmap | null> {
  const finalWidthDots = thermalHeadWidthDots(paperWidthMm);
  const renderWidthPx = finalWidthDots * UNICODE_RENDER_SCALE;

  let tempFilePath: string | null = null;
  let renderWindow: BrowserWindow | null = null;

  try {
    tempFilePath = path.join(
      os.tmpdir(),
      `pos-unicode-render-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.html`
    );

    await fs.writeFile(tempFilePath, html, "utf-8");

    renderWindow = new BrowserWindow({
      show: false,
      width: renderWidthPx,
      height: 1200,
      useContentSize: true,
      backgroundColor: "#ffffff",
      webPreferences: {
        offscreen: false,
        backgroundThrottling: false,
      },
    });

    renderWindow.webContents.setZoomFactor(1);

    await renderWindow.loadFile(tempFilePath);
    await waitForRenderedFonts(renderWindow);

    // Wait for logos/images to finish decoding before measuring/capturing.
    try {
      await renderWindow.webContents.executeJavaScript(`
        (async () => {
          const images = Array.from(document.images || []);

          await Promise.all(
            images.map(async (image) => {
              if (image.complete) {
                if (typeof image.decode === "function") {
                  try {
                    await image.decode();
                  } catch {
                    // Ignore image decode errors.
                  }
                }

                return;
              }

              await new Promise((resolve) => {
                const done = () => resolve(true);
                image.addEventListener("load", done, { once: true });
                image.addEventListener("error", done, { once: true });
              });
            })
          );

          return true;
        })();
      `);
    } catch {
      // Best effort only.
    }

    const measuredHeightPx = await renderWindow.webContents.executeJavaScript(`
      (() => {
        const body = document.body;
        const root = document.documentElement;
        const receipt = document.querySelector(".print-document-receipt");

        return Math.ceil(Math.max(
          receipt ? receipt.getBoundingClientRect().bottom : 0,
          body ? body.scrollHeight : 0,
          body ? body.offsetHeight : 0,
          root ? root.scrollHeight : 0,
          root ? root.offsetHeight : 0
        ));
      })();
    `);

    if (
      typeof measuredHeightPx !== "number" ||
      !Number.isFinite(measuredHeightPx) ||
      measuredHeightPx <= 0
    ) {
      return null;
    }

    // Prevent accidental endless/huge print jobs.
    if (measuredHeightPx > 30000) {
      throw new Error(
        "The receipt is too long for thermal bitmap printing. Use the A4 invoice for this sale."
      );
    }

    renderWindow.setContentSize(
      renderWidthPx,
      Math.max(120, Math.ceil(measuredHeightPx))
    );

    await waitForRenderedFonts(renderWindow);
    await new Promise<void>((resolve) => setTimeout(resolve, 80));

    // Capture the entire hidden window. Do not pass a capture rectangle;
    // this avoids cropping when the OS display scale is 125%/150%.
    const captured = await renderWindow.webContents.capturePage();

    if (captured.isEmpty()) {
      return null;
    }

    const capturedSize = captured.getSize();

    if (capturedSize.width <= 0 || capturedSize.height <= 0) {
      return null;
    }

    const targetHeightDots = Math.max(
      1,
      Math.round((capturedSize.height / capturedSize.width) * finalWidthDots)
    );

    const resized = captured.resize({
      width: finalWidthDots,
      height: targetHeightDots,
      quality: "best",
    });

    const size = resized.getSize();
    const bitmap = resized.toBitmap();

    if (size.width <= 0 || size.height <= 0) {
      return null;
    }

    const thresholdBits = new Uint8Array(size.width * size.height);

    /*
     * Keep a fairly strong black threshold so Sinhala loops, vowel marks and
     * combining strokes survive the 203-DPI reduction. We deliberately avoid
     * photographic dithering because it makes receipt text grainy.
     */
    const threshold = 190;

    for (let y = 0; y < size.height; y += 1) {
      for (let x = 0; x < size.width; x += 1) {
        const index = (y * size.width + x) * 4;

        const luminance =
          (bitmap[index] + bitmap[index + 1] + bitmap[index + 2]) / 3;

        thresholdBits[y * size.width + x] = luminance < threshold ? 1 : 0;
      }
    }

    /*
     * Keep the monochrome bitmap at its natural thickness.
     *
     * Earlier versions expanded every black pixel into its neighbours. That
     * helped extremely thin glyphs, but it also made normal English and
     * Sinhala lettering look excessively heavy on 203-DPI thermal paper.
     * The 2x render + high-quality downsample already preserves the character
     * shapes, so a moderate threshold is enough for a cleaner receipt.
     */
    const bits = thresholdBits;

    return {
      widthDots: size.width,
      heightDots: size.height,
      bits,
    };
  } finally {
    if (renderWindow && !renderWindow.isDestroyed()) {
      renderWindow.close();
    }

    if (tempFilePath) {
      void fs.unlink(tempFilePath).catch(() => {
        // Best-effort cleanup.
      });
    }
  }
}

/**
 * Build legacy ESC * 24-dot bit-image commands.
 *
 * IMPORTANT: every band is exactly 24 source rows and the printer line
 * spacing is exactly 24. Do NOT overlap adjacent bands. A previous 23-row
 * advance fixed some seams but caused the next band to reprint part of the
 * previous one on clone printers, producing the doubled/ghosted horizontal
 * text visible in the user's receipt photo.
 *
 * Any stroke strengthening is done earlier in rasterizeUnicodeReceipt(),
 * where it cannot disturb the printer's vertical positioning.
 */
function buildLegacyEscPosBitImage(bitmap: MonochromeReceiptBitmap): Buffer {
  const { widthDots, heightDots, bits } = bitmap;
  const chunks: Buffer[] = [];

  // Reset and use left alignment for image output.
  chunks.push(Buffer.from([0x1b, 0x40])); // ESC @
  chunks.push(Buffer.from([0x1b, 0x61, 0x00])); // ESC a 0

  const bandHeight = 24;
  const mode = 33; // 24-dot double-density bit-image mode
  const nL = widthDots & 0xff;
  const nH = (widthDots >> 8) & 0xff;

  // ESC 3 24: one line feed advances exactly one 24-dot image band.
  chunks.push(Buffer.from([0x1b, 0x33, bandHeight]));

  for (let startY = 0; startY < heightDots; startY += bandHeight) {
    const band = Buffer.alloc(widthDots * 3);

    for (let x = 0; x < widthDots; x += 1) {
      for (let byteInColumn = 0; byteInColumn < 3; byteInColumn += 1) {
        let value = 0;

        for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
          const y = startY + byteInColumn * 8 + bitIndex;

          if (y < heightDots && bits[y * widthDots + x] === 1) {
            value |= 0x80 >> bitIndex;
          }
        }

        band[x * 3 + byteInColumn] = value;
      }
    }

    // Reassert the line spacing before each image band. Some inexpensive
    // ESC/POS clones do not preserve graphics state as reliably as Epson.
    chunks.push(Buffer.from([0x1b, 0x33, bandHeight]));

    chunks.push(Buffer.from([0x1b, 0x2a, mode, nL, nH]));

    chunks.push(band);
    chunks.push(Buffer.from([0x0a])); // print band + advance exactly 24 rows
  }

  // Restore normal spacing, feed beyond the cutter, cut, then reset so the
  // next receipt starts from a clean printer state.
  chunks.push(Buffer.from([0x1b, 0x32])); // ESC 2
  chunks.push(Buffer.from([0x0a, 0x0a, 0x0a]));
  chunks.push(Buffer.from([0x1d, 0x56, 0x01])); // GS V 1
  chunks.push(Buffer.from([0x1b, 0x40])); // ESC @

  return Buffer.concat(chunks);
}

async function printUnicodeThermalBitmap(
  html: string,
  options: PosPrintOptions
): Promise<PosPrintResult> {
  let printerName = options.printerName?.trim() ?? "";

  const localPrinterConfig = await readPrinterConfig();

  if (localPrinterConfig?.receiptPrinterName) {
    printerName = localPrinterConfig.receiptPrinterName;
  }

  const validationError = await validatePrinterForOutput(printerName);

  if (validationError) {
    return validationError;
  }

  const paperWidthMm: 58 | 80 = options.paperWidthMm === 58 ? 58 : 80;

  try {
    const bitmap = await rasterizeUnicodeReceipt(html, paperWidthMm);

    if (!bitmap) {
      return {
        success: false,
        error:
          "Could not render the Sinhala/Unicode receipt into a printable bitmap.",
      };
    }

    if (bitmap.heightDots > 12000) {
      return {
        success: false,
        error:
          "This receipt is too long for one thermal bitmap job. Print the A4 invoice for this sale.",
      };
    }

    const output = buildLegacyEscPosBitImage(bitmap);

    return await sendRawBytesToPrinter(printerName, output);
  } catch (error) {
    return {
      success: false,
      error: `Sinhala thermal printing failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function printHtmlSilently(
  html: string,
  options: PosPrintOptions
): Promise<PosPrintResult> {
  if (options.unicodeThermalBitmap) {
    return printUnicodeThermalBitmap(html, options);
  }

  if (options.printerName) {
    try {
      const printers = await listSystemPrinters();

      const matchedPrinter = printers.find(
        (printer) => printer.name === options.printerName
      );

      if (!matchedPrinter) {
        return {
          success: false,
          error: `No printer named "${options.printerName}" was found on this computer. Open Device Printer Settings, refresh the printer list and select an installed printer.`,
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

    printWindow.webContents.once("did-finish-load", async () => {
      try {
        await printWindow?.webContents.executeJavaScript(`
          (async () => {
            if (document.fonts && document.fonts.ready) {
              await document.fonts.ready;
            }

            await new Promise((resolve) => {
              requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
              });
            });

            return true;
          })();
        `);
      } catch {
        // Best effort only.
      }

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

      if (options.paperWidthMicrons) {
        let measuredHeightMicrons = 0;

        try {
          const measuredHeightPx = await printWindow?.webContents
            .executeJavaScript(`
            (() => {
              const body = document.body;
              const root = document.documentElement;

              return Math.ceil(Math.max(
                body ? body.scrollHeight : 0,
                body ? body.offsetHeight : 0,
                root ? root.scrollHeight : 0,
                root ? root.offsetHeight : 0
              ));
            })();
          `);

          if (
            typeof measuredHeightPx === "number" &&
            Number.isFinite(measuredHeightPx) &&
            measuredHeightPx > 0
          ) {
            const measuredHeightMm = (measuredHeightPx / 96) * 25.4;

            measuredHeightMicrons = Math.round(
              Math.max(40, measuredHeightMm + 10) * 1000
            );
          }
        } catch {
          measuredHeightMicrons = 0;
        }

        const requestedHeightMicrons =
          options.paperHeightMicrons && options.paperHeightMicrons > 0
            ? options.paperHeightMicrons
            : 0;

        const finalHeightMicrons = Math.max(
          measuredHeightMicrons,
          requestedHeightMicrons,
          40000
        );

        (
          printOptions as unknown as {
            pageSize: { width: number; height: number };
          }
        ).pageSize = {
          width: options.paperWidthMicrons,
          height: finalHeightMicrons,
        };
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
 * ESC/POS raw command builder for plain ASCII/English receipts.
 */
class EscPosBuilder {
  private chunks: Buffer[] = [];

  private readonly lineWidth: number;

  constructor(charactersPerLine: number) {
    this.lineWidth = charactersPerLine;
    this.chunks.push(Buffer.from([0x1b, 0x40])); // ESC @ : initialize
    this.chunks.push(Buffer.from([0x1b, 0x74, 0x00])); // ESC t 0 : code page 0
  }

  private push(bytes: number[]): void {
    this.chunks.push(Buffer.from(bytes));
  }

  private text(value: string): void {
    const normalized = value.replace(
      /[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g,
      " "
    );

    const punctuationNormalized = normalized
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-");

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

  fontB(on: boolean): this {
    // ESC M 1 = Font B, ESC M 0 = Font A.
    // Font B is narrower, allowing the software credit to remain
    // on one line on standard 80mm / 48-column receipt printers.
    this.push([0x1b, 0x4d, on ? 1 : 0]);
    return this;
  }

  doubleHeight(on: boolean): this {
    // GS ! 0x10 doubles height only, keeping the narrow Font B width.
    this.push([0x1d, 0x21, on ? 0x10 : 0x00]);
    return this;
  }

  doubleSize(on: boolean): this {
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

    if (payload.softwareCredit) {
      doc.newLine().alignCenter().bold(false).fontB(true);

      if (payload.paperWidthMm === 80) {
        /*
         * The full credit is 55 characters. Font A normally supports
         * about 48 characters on 80mm, so use narrower Font B and
         * double-height only. This keeps the complete credit on one
         * line while making it easier to read.
         */
        doc.doubleHeight(true).println(payload.softwareCredit);
        doc.doubleHeight(false);
      } else {
        /*
         * A 58mm thermal head is physically too narrow for all 55
         * characters on one line with standard ESC/POS fonts. Let the
         * printer wrap safely rather than clipping the phone number.
         */
        doc.println(payload.softwareCredit);
      }

      doc.fontB(false);
    }

    doc.cut();

    builders.push(doc.toBuffer());
  }

  return Buffer.concat(builders);
}

async function printReceiptEscPosUsb(
  payload: EscPosReceiptPayload,
  useSavedDevicePrinter = true
): Promise<PosPrintResult> {
  let printerName = payload.printerName.trim();

  if (useSavedDevicePrinter) {
    const localPrinterConfig = await readPrinterConfig();

    if (localPrinterConfig?.receiptPrinterName) {
      printerName = localPrinterConfig.receiptPrinterName;
    }
  }

  const validationError = await validatePrinterForOutput(printerName);

  if (validationError) {
    return validationError;
  }

  const effectivePayload: EscPosReceiptPayload = {
    ...payload,
    printerName,
  };

  const buffer = buildEscPosBuffer(effectivePayload);

  return sendRawBytesToPrinter(printerName, buffer);
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

ipcMain.handle(
  "test-receipt-printer",
  async (
    _event,
    payload: {
      printerName: string;
      paperWidthMm?: 58 | 80;
    }
  ): Promise<PosPrintResult> => {
    const printerName =
      typeof payload?.printerName === "string"
        ? payload.printerName.trim()
        : "";

    if (!printerName) {
      return {
        success: false,
        error: "Select a printer before running a test print.",
      };
    }

    return printReceiptEscPosUsb(
      {
        printerName,
        paperWidthMm: payload.paperWidthMm === 58 ? 58 : 80,
        businessName: "SAMARAKOON AGRO",
        addressLines: ["DEVICE PRINTER TEST"],
        receiptTitle: "TEST PRINT",
        metaLines: [
          {
            left: `Printer: ${printerName}`,
          },
          {
            left: `Computer: ${os.hostname()}`,
          },
        ],
        items: [
          {
            name: "Printer connection is working",
            quantityLine: "1 x TEST",
            lineTotal: "OK",
          },
        ],
        totalsLines: [
          {
            left: "Status",
            right: "SUCCESS",
          },
        ],
        statusLines: [
          {
            left: "Mode",
            right: "LOCAL DEVICE",
          },
        ],
        footerText: "Save this printer for this cashier PC.",
        softwareCredit: null,
        copies: 1,
        duplicateLabel: false,
      },
      false
    );
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
