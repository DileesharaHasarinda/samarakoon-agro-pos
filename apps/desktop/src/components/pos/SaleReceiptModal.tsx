import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '../../auth/AuthContext';
import { getBusinessSettings } from '../../services/businessSettingService';
import { defaultBusinessSetting } from '../../types/businessSetting';
import { loadPrinterConfig } from '../../lib/printerConfig';

import type {
    BusinessSetting,
    PrintDocumentType,
} from '../../types/businessSetting';

import type {
    SaleReceipt,
} from '../../types/sale';

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

interface PosPrintApi {
    printSilently: (
        html: string,
        options: {
            printerName?: string | null;
            paperWidthMicrons?: number;
            paperHeightMicrons?: number;
            unicodeThermalBitmap?: boolean;
            paperWidthMm?: 58 | 80;
        },
    ) => Promise<{ success: boolean; error?: string }>;

    printReceiptEscPos: (
        payload: EscPosReceiptPayload,
    ) => Promise<{ success: boolean; error?: string }>;

    getPrinters: () => Promise<Array<{
        name: string;
        displayName: string;
        isDefault: boolean;
        status: number;
    }>>;
}

declare global {
    interface Window {
        posPrint?: PosPrintApi;
    }
}


const SOFTWARE_CREDIT =
    'Software by Geesara Software & Solutions | 078-457-6990';

interface SaleReceiptModalProps {
    receipt: SaleReceipt | null;
    onClose: () => void;
}

type NumericValue =
    | number
    | string
    | null
    | undefined;

interface PrintableProduct {
    name?: string;
    unit?: string | null;
    sku?: string | null;
    barcode?: string | null;
}

interface PrintableBatch {
    batch_code?: string | null;
    batch_number?: string | null;
}

interface PrintableItem {
    id?: number;
    product_name?: string;
    quantity?: NumericValue;
    selling_price?: NumericValue;
    unit_price?: NumericValue;
    discount?: NumericValue;
    line_total?: NumericValue;
    product?: PrintableProduct;
    batch?: PrintableBatch | null;
    stock_batch?: PrintableBatch | null;
}

interface PrintablePayment {
    id?: number;
    payment_method?: string | null;

    /*
     * amount = amount applied to the sale.
     * received_amount / amount_received = actual money tendered by
     * the customer before change is returned.
     */
    amount?: NumericValue;
    received_amount?: NumericValue;
    amount_received?: NumericValue;
    change_amount?: NumericValue;

    reference_number?: string | null;
    payment_date?: string | null;
    created_at?: string | null;
}

interface PrintableCustomer {
    name?: string;
    mobile?: string | null;
    phone?: string | null;
    address?: string | null;
    customer_code?: string | null;
}

interface PrintableUser {
    name?: string;
    username?: string;
}

interface PrintableSale {
    id?: number;
    sale_number?: string;
    sale_date?: string;
    created_at?: string;

    subtotal?: NumericValue;
    item_discount_total?: NumericValue;
    discount?: NumericValue;
    grand_total?: NumericValue;

    amount_received?: NumericValue;
    paid_amount?: NumericValue;
    due_amount?: NumericValue;
    change_amount?: NumericValue;
    balance?: NumericValue;

    payment_method?: string | null;
    payment_status?: string | null;
    settlement_type?: string | null;
    reference_number?: string | null;
    due_date?: string | null;
    notes?: string | null;

    customer?: PrintableCustomer | null;
    created_by?: PrintableUser;
    cashier?: PrintableUser;

    items?: PrintableItem[];
    payments?: PrintablePayment[];
}

interface DocumentView {
    saleNumber: string;
    saleDate: string;
    cashierName: string;
    customerName: string;
    customerPhone: string | null;
    customerAddress: string | null;

    items: PrintableItem[];
    payments: PrintablePayment[];

    subtotal: number;
    itemDiscount: number;
    saleDiscount: number;
    totalDiscount: number;
    grandTotal: number;
    paidAmount: number;
    amountReceived: number;
    dueAmount: number;
    changeAmount: number;

    paymentMethod: string;
    paymentStatus: string;
    paymentReference: string | null;
    dueDate: string | null;
    notes: string | null;
}

function numberValue(
    value: NumericValue,
    fallback = 0,
): number {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}

function formatQuantity(
    value: NumericValue,
): string {
    return new Intl.NumberFormat(
        'en-GB',
        {
            maximumFractionDigits: 3,
        },
    ).format(
        numberValue(value),
    );
}

function formatDateTime(
    value: string | null | undefined,
): string {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        },
    ).format(date);
}

function formatDate(
    value: string | null | undefined,
): string {
    if (!value) {
        return 'Not provided';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    ).format(date);
}

function paymentMethodName(
    method: string | null | undefined,
): string {
    if (method === 'cash') {
        return 'Cash';
    }

    if (method === 'card') {
        return 'Card';
    }

    if (method === 'bank_transfer') {
        return 'Bank Transfer';
    }

    if (method === 'cheque') {
        return 'Cheque';
    }

    if (method === 'credit') {
        return 'Credit';
    }

    return 'Not Specified';
}

function paymentStatusName(
    status: string | null | undefined,
): string {
    if (
        status === 'paid'
        || status === 'full'
    ) {
        return 'Paid';
    }

    if (status === 'partial') {
        return 'Partially Paid';
    }

    if (status === 'due') {
        return 'Due';
    }

    return 'Completed';
}

function itemUnitPrice(
    item: PrintableItem,
): number {
    return numberValue(
        item.selling_price
        ?? item.unit_price,
    );
}

function itemLineTotal(
    item: PrintableItem,
): number {
    const calculated =
        itemUnitPrice(item)
        * numberValue(item.quantity)
        - numberValue(item.discount);

    return numberValue(
        item.line_total,
        calculated,
    );
}

function itemName(
    item: PrintableItem,
): string {
    return item.product?.name
        ?? item.product_name
        ?? 'Product';
}

function itemBatchNumber(
    item: PrintableItem,
): string | null {
    const batch =
        item.batch
        ?? item.stock_batch;

    return batch?.batch_number
        ?? batch?.batch_code
        ?? null;
}

function createCurrencyFormatter(
    currencyCode: string,
): Intl.NumberFormat {
    try {
        return new Intl.NumberFormat(
            'en-GB',
            {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            },
        );
    } catch {
        return new Intl.NumberFormat(
            'en-GB',
            {
                style: 'currency',
                currency: 'LKR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            },
        );
    }
}

function createDocumentView(
    sale: PrintableSale,
): DocumentView {
    const items = sale.items ?? [];
    const payments = sale.payments ?? [];

    const calculatedSubtotal =
        items.reduce(
            (
                total,
                item,
            ) => (
                total
                + itemUnitPrice(item)
                * numberValue(
                    item.quantity,
                )
            ),
            0,
        );

    const calculatedItemDiscount =
        items.reduce(
            (
                total,
                item,
            ) => (
                total
                + numberValue(
                    item.discount,
                )
            ),
            0,
        );

    const subtotal =
        numberValue(
            sale.subtotal,
            calculatedSubtotal,
        );

    const itemDiscount =
        numberValue(
            sale.item_discount_total,
            calculatedItemDiscount,
        );

    const saleDiscount =
        numberValue(
            sale.discount,
        );

    const grandTotal =
        numberValue(
            sale.grand_total,
            Math.max(
                0,
                subtotal
                - itemDiscount
                - saleDiscount,
            ),
        );

    const paymentTotal =
        payments.reduce(
            (
                total,
                payment,
            ) => (
                total
                + numberValue(
                    payment.amount,
                )
            ),
            0,
        );

    const paidAmount =
        numberValue(
            sale.paid_amount,
            paymentTotal,
        );

    const dueAmount =
        numberValue(
            sale.due_amount,
            Math.max(
                0,
                grandTotal - paidAmount,
            ),
        );

    const firstPayment =
        payments[0];

    /*
     * IMPORTANT PAYMENT VALUES
     * ------------------------
     *
     * payment.amount / sale.paid_amount:
     *     Amount applied to the invoice after discount.
     *
     * payment.received_amount / amount_received:
     *     Actual cash entered by the cashier in
     *     "Amount Received (LKR)".
     *
     * Example:
     *     Subtotal        = 2000
     *     Discount        =  500
     *     Grand Total     = 1500
     *     Amount Received = 2000
     *     Change          =  500
     *
     * Some API responses only expose the tendered cash inside the
     * payment object, while the top-level sale amount_received can
     * contain the applied amount (1500). Therefore the receipt must
     * not trust only sale.amount_received.
     */

    const paymentTenderedTotal =
        payments.reduce(
            (
                total,
                payment,
            ) => {
                const explicitReceived =
                    payment.received_amount
                    ?? payment.amount_received;

                if (
                    explicitReceived !== null
                    && explicitReceived !== undefined
                ) {
                    return (
                        total
                        + numberValue(
                            explicitReceived,
                        )
                    );
                }

                return (
                    total
                    + numberValue(
                        payment.amount,
                    )
                );
            },
            0,
        );

    const paymentChangeTotal =
        payments.reduce(
            (
                total,
                payment,
            ) => (
                total
                + (
                    payment.change_amount !== null
                        && payment.change_amount !== undefined
                        ? numberValue(
                            payment.change_amount,
                        )
                        : 0
                )
            ),
            0,
        );

    const topLevelChange =
        sale.change_amount !== null
            && sale.change_amount !== undefined
            ? numberValue(
                sale.change_amount,
            )
            : (
                sale.balance !== null
                    && sale.balance !== undefined
                    ? numberValue(
                        sale.balance,
                    )
                    : 0
            );

    const recordedChange =
        Math.max(
            0,
            topLevelChange,
            paymentChangeTotal,
        );

    const topLevelAmountReceived =
        sale.amount_received !== null
            && sale.amount_received !== undefined
            ? numberValue(
                sale.amount_received,
            )
            : 0;

    /*
     * The "paid + change" candidate is the most reliable fallback
     * when the backend stores only the applied payment at the sale
     * level. For the example above:
     *
     *     1500 paid + 500 change = 2000 received.
     */
    const amountReceived =
        Math.max(
            0,
            paymentTenderedTotal,
            topLevelAmountReceived,
            paidAmount + recordedChange,
        );

    const changeAmount =
        recordedChange > 0
            ? recordedChange
            : Math.max(
                0,
                amountReceived
                - grandTotal,
            );

    return {
        saleNumber:
            sale.sale_number
            ?? `SALE-${sale.id ?? ''}`,

        saleDate:
            sale.sale_date
            ?? sale.created_at
            ?? '',

        cashierName:
            sale.created_by?.name
            ?? sale.cashier?.name
            ?? 'Cashier',

        customerName:
            sale.customer?.name
            ?? 'Walk-in Customer',

        customerPhone:
            sale.customer?.mobile
            ?? sale.customer?.phone
            ?? null,

        customerAddress:
            sale.customer?.address
            ?? null,

        items,
        payments,

        subtotal,
        itemDiscount,
        saleDiscount,

        totalDiscount:
            itemDiscount
            + saleDiscount,

        grandTotal,
        paidAmount,
        amountReceived,
        dueAmount,
        changeAmount,

        paymentMethod:
            paymentMethodName(
                sale.payment_method
                ?? firstPayment
                    ?.payment_method,
            ),

        paymentStatus:
            paymentStatusName(
                sale.payment_status
                ?? sale.settlement_type,
            ),

        paymentReference:
            sale.reference_number
            ?? firstPayment
                ?.reference_number
            ?? null,

        dueDate:
            sale.due_date
            ?? null,

        notes:
            sale.notes
            ?? null,
    };
}

/* =========================================================
   UNICODE / SINHALA PRINTING
   ========================================================= */

/**
 * Raw ESC/POS printing in main.ts is intentionally ASCII-only because
 * most thermal-printer firmware/code pages do not contain Sinhala
 * glyphs. When any visible receipt text contains non-ASCII Unicode
 * (including Sinhala), the receipt is rendered by Chromium and sent
 * through the operating-system printer driver instead.
 *
 * New lines and tabs are allowed because they are normal receipt text
 * controls and do not require Unicode font rendering by themselves.
 */
function containsUnicodeReceiptText(
    value: string | null | undefined,
): boolean {
    if (!value) {
        return false;
    }

    return /[^\x09\x0A\x0D\x20-\x7E]/.test(value);
}

function receiptNeedsUnicodeRendering(
    settings: BusinessSetting,
    document: DocumentView,
): boolean {
    const visibleText: Array<string | null | undefined> = [
        settings.business_name,
        settings.show_business_address
            ? settings.address
            : null,
        settings.phone,
        settings.secondary_phone,
        settings.email,
        settings.registration_number,
        settings.tax_number,
        settings.receipt_title,
        settings.receipt_footer,

        document.saleNumber,
        document.saleDate,
        settings.show_cashier_name
            ? document.cashierName
            : null,
        settings.show_customer_details
            ? document.customerName
            : null,
        settings.show_customer_details
            ? document.customerPhone
            : null,
        document.paymentMethod,
        document.paymentStatus,
        settings.show_payment_reference
            ? document.paymentReference
            : null,
        settings.show_due_date
            ? document.dueDate
            : null,
        document.notes,
    ];

    document.items.forEach((item) => {
        visibleText.push(
            itemName(item),
            settings.show_sku
                ? item.product?.sku
                : null,
            settings.show_batch_number
                ? itemBatchNumber(item)
                : null,
        );
    });

    return visibleText.some(
        (value) =>
            containsUnicodeReceiptText(
                value,
            ),
    );
}

/**
 * Build a dedicated Unicode/Sinhala thermal receipt document.
 *
 * IMPORTANT:
 * - The page itself stays at the real roll width (58 mm / 80 mm).
 * - The receipt content is slightly narrower than the paper so the
 *   printer driver's non-printable left/right edges cannot force
 *   Chromium to scale the whole receipt down.
 * - Font sizes are intentionally larger than the on-screen preview.
 *   This is especially important for Sinhala, where small rasterized
 *   glyphs become difficult to read on 203-dpi thermal printers.
 * - main.ts measures THIS loaded print document and creates the final
 *   custom page height, so the receipt is not scaled to A4 or clipped.
 */

/**
 * Build a dedicated Unicode/Sinhala thermal receipt document.
 *
 * IMPORTANT — this HTML is no longer printed by the OS driver. It is
 * rasterized off-screen in main.ts and sent as raw ESC/POS bytes, so
 * the sizing here must match the printer's REAL dot width exactly:
 *   58 mm roll -> 384 dots printable width
 *   80 mm roll -> 576 dots printable width
 * (main.ts renders this at 2x that width for supersampling, then
 * downsamples — RASTER_SUPERSAMPLE there must stay in sync with the
 * PX_PER_MM constant below.)
 *
 * Because output is now dot-exact, font sizes here are chosen to be
 * clearly legible at 203 dpi on a real thermal head, not just
 * readable on a monitor.
 */
function buildUnicodeThermalPrintHtml(
    receiptMarkup: string,
    paperWidthMm: 58 | 80,
): string {
    // 203 dpi print head, x2 supersample = 16 px per physical mm.
    // MUST match RASTER_SUPERSAMPLE in main.ts.
    const PX_PER_MM = 16;

    const px = (mmValue: number): number =>
        Math.round(mmValue * PX_PER_MM);

    /*
     * Printable width: thermal heads print slightly narrower than the
     * roll itself.
     *   58 mm roll -> about 48 mm printable (384 dots)
     *   80 mm roll -> about 72 mm printable (576 dots)
     */
    const printableWidthMm =
        paperWidthMm === 58
            ? 48
            : 72;

    const containerWidthPx =
        printableWidthMm * PX_PER_MM;

    const businessFontPx =
        paperWidthMm === 58
            ? 64
            : 72

    const titleFontPx =
        paperWidthMm === 58
            ? 46
            : 52

    const normalFontPx =
        paperWidthMm === 58
            ? 40
            : 44

    const smallFontPx =
        paperWidthMm === 58
            ? 32
            : 34

    const productFontPx =
        paperWidthMm === 58
            ? 44
            : 48

    const grandFontPx =
        paperWidthMm === 58
            ? 54
            : 60

    const footerFontPx =
        paperWidthMm === 58
            ? 40
            : 44

    /*
     * Developer credit is deliberately a little larger than ordinary
     * receipt footnotes while still fitting on one line on 80mm paper.
     * 58mm paper has much less physical width, so it uses a smaller size.
     */
    const softwareCreditFontPx =
        paperWidthMm === 58
            ? 22
            : 34

    const sidePaddingPx =
        paperWidthMm === 58
            ? px(1.0)
            : px(1.1);

    const topPaddingPx =
        paperWidthMm === 58
            ? px(1.8)
            : px(2.0);

    const bottomPaddingPx =
        paperWidthMm === 58
            ? px(3.0)
            : px(3.5);

    return `
        <!DOCTYPE html>
        <html lang="si-LK">
        <head>
            <meta charset="UTF-8" />

            <style>
                @page {
                    margin: 0;
                }

                html,
                body {
                    box-sizing: border-box !important;

                    width: ${containerWidthPx}px !important;
                    min-width: ${containerWidthPx}px !important;
                    max-width: ${containerWidthPx}px !important;

                    margin: 0 !important;
                    padding: 0 !important;

                    overflow: visible !important;

                    color: #000000 !important;
                    background: #ffffff !important;

                    font-family:
                        "Sinhala Sangam MN",
                        "Nirmala UI",
                        "Iskoola Pota",
                        "Noto Sans Sinhala",
                        "Sinhala MN",
                        system-ui,
                        sans-serif !important;

                    text-rendering: geometricPrecision !important;
                    -webkit-font-smoothing: antialiased !important;
                    font-synthesis: none !important;
                }

                *,
                *::before,
                *::after {
                    box-sizing: border-box !important;
                }

                #sale-document-modal {
                    position: static !important;
                    inset: auto !important;

                    display: block !important;

                    width: ${containerWidthPx}px !important;
                    min-width: ${containerWidthPx}px !important;
                    max-width: ${containerWidthPx}px !important;

                    height: auto !important;
                    min-height: 0 !important;

                    margin: 0 !important;
                    padding: 0 !important;

                    overflow: visible !important;

                    color: #000000 !important;
                    background: #ffffff !important;

                    font-family:
                        "Sinhala Sangam MN",
                        "Nirmala UI",
                        "Iskoola Pota",
                        "Noto Sans Sinhala",
                        "Sinhala MN",
                        system-ui,
                        sans-serif !important;
                }

                #sale-document-modal .print-area,
                #sale-document-modal .print-area.receipts {
                    display: block !important;

                    width: ${containerWidthPx}px !important;
                    min-width: ${containerWidthPx}px !important;
                    max-width: ${containerWidthPx}px !important;

                    margin: 0 !important;
                    padding: 0 !important;

                    overflow: visible !important;
                }

                #sale-document-modal .print-document-receipt,
                #sale-document-modal .print-paper-58mm,
                #sale-document-modal .print-paper-80mm {
                    display: block !important;

                    width: ${containerWidthPx}px !important;
                    min-width: ${containerWidthPx}px !important;
                    max-width: ${containerWidthPx}px !important;

                    min-height: 0 !important;

                    margin: 0 !important;

                    padding:
                        ${topPaddingPx}px
                        ${sidePaddingPx}px
                        ${bottomPaddingPx}px !important;

                    overflow: visible !important;

                    color: #000000 !important;
                    background: #ffffff !important;

                    border: 0 !important;
                    box-shadow: none !important;

                    font-family:
                        "Sinhala Sangam MN",
                        "Nirmala UI",
                        "Iskoola Pota",
                        "Noto Sans Sinhala",
                        "Sinhala MN",
                        system-ui,
                        sans-serif !important;

                    font-size: ${normalFontPx}px !important;
                    font-weight: 500 !important;
                    line-height: 1.34 !important;

                    letter-spacing: 0 !important;
                    word-spacing: 0 !important;
                }

                #sale-document-modal .thermal-copy-label {
                    margin: 0 0 ${px(2)}px !important;
                    padding: ${px(1.1)}px !important;

                    color: #000000 !important;

                    font-size: ${smallFontPx}px !important;
                    font-weight: 700 !important;
                    line-height: 1.3 !important;

                    text-align: center !important;

                    border:
                        2px dashed
                        #000000 !important;
                }

                #sale-document-modal .thermal-header {
                    text-align: center !important;
                }

                #sale-document-modal .thermal-logo {
                    display: block !important;

                    width: auto !important;

                    max-width:
                        ${paperWidthMm === 58 ? px(38) : px(58)}px !important;

                    max-height:
                        ${paperWidthMm === 58 ? px(13) : px(17)}px !important;

                    margin:
                        0
                        auto
                        ${px(1.8)}px !important;

                    object-fit: contain !important;
                }

                #sale-document-modal .thermal-header h2 {
                    margin: 0 !important;

                    color: #000000 !important;

                    font-size: ${businessFontPx}px !important;
                    font-weight: 700 !important;
                    line-height: 1.28 !important;

                    letter-spacing: 0 !important;

                    overflow-wrap: anywhere !important;
                }

                #sale-document-modal .thermal-header p {
                    margin: ${px(0.6)}px 0 0 !important;

                    color: #000000 !important;

                    font-size: ${smallFontPx}px !important;
                    font-weight: 500 !important;
                    line-height: 1.38 !important;

                    overflow-wrap: anywhere !important;
                }

                #sale-document-modal .thermal-header > strong {
                    display: block !important;

                    margin-top: ${px(1.7)}px !important;

                    color: #000000 !important;

                    font-size: ${titleFontPx}px !important;
                    font-weight: 700 !important;
                    line-height: 1.32 !important;

                    letter-spacing: 0 !important;
                    text-transform: none !important;

                    overflow-wrap: anywhere !important;
                }

                #sale-document-modal .thermal-divider {
                    height: 0 !important;

                    margin: ${px(1.7)}px 0 !important;

                    border: 0 !important;
                    border-top:
                        1px dashed
                        #000000 !important;
                }

                #sale-document-modal .thermal-list,
                #sale-document-modal .thermal-totals {
                    display: flex !important;

                    flex-direction: column !important;

                    gap: ${px(0.9)}px !important;
                }

                #sale-document-modal .thermal-list > div,
                #sale-document-modal .thermal-totals > div {
                    display: grid !important;

                    grid-template-columns:
                        minmax(0, 42%)
                        minmax(0, 58%) !important;

                    align-items: start !important;

                    gap: ${px(1.4)}px !important;
                }

                #sale-document-modal .thermal-list span,
                #sale-document-modal .thermal-totals span {
                    color: #000000 !important;

                    font-size: ${normalFontPx}px !important;
                    font-weight: 500 !important;
                    line-height: 1.34 !important;

                    overflow-wrap: anywhere !important;
                }

                #sale-document-modal .thermal-list strong,
                #sale-document-modal .thermal-totals strong {
                    max-width: none !important;

                    color: #000000 !important;

                    font-size: ${normalFontPx}px !important;
                    font-weight: 600 !important;
                    line-height: 1.34 !important;

                    text-align: right !important;

                    overflow-wrap: anywhere !important;
                }

                #sale-document-modal .thermal-items {
                    display: flex !important;

                    flex-direction: column !important;

                    gap: ${px(1.6)}px !important;
                }

                #sale-document-modal .thermal-items article {
                    padding: 0 0 ${px(1.4)}px !important;

                    border-bottom:
                        1px dotted
                        #666666 !important;
                }

                #sale-document-modal .thermal-items article:last-child {
                    padding-bottom: 0 !important;
                    border-bottom: 0 !important;
                }

                #sale-document-modal .thermal-items article > strong {
                    display: block !important;

                    color: #000000 !important;

                    font-size: ${productFontPx}px !important;
                    font-weight: 600 !important;
                    line-height: 1.34 !important;

                    overflow-wrap: anywhere !important;
                }

                #sale-document-modal .thermal-items small {
                    display: block !important;

                    margin-top: ${px(0.5)}px !important;

                    color: #000000 !important;

                    font-size: ${smallFontPx}px !important;
                    font-weight: 500 !important;
                    line-height: 1.34 !important;

                    overflow-wrap: anywhere !important;
                }

                #sale-document-modal .thermal-items article > div {
                    display: grid !important;

                    grid-template-columns:
                        minmax(0, 1fr)
                        auto !important;

                    align-items: start !important;

                    gap: ${px(1.4)}px !important;

                    margin-top: ${px(0.8)}px !important;
                }

                #sale-document-modal .thermal-items article > div span,
                #sale-document-modal .thermal-items article > div strong {
                    color: #000000 !important;

                    font-size: ${normalFontPx}px !important;
                    line-height: 1.34 !important;
                }

                #sale-document-modal .thermal-items article > div span {
                    font-weight: 500 !important;
                }

                #sale-document-modal .thermal-items article > div strong {
                    font-weight: 600 !important;

                    text-align: right !important;

                    white-space: nowrap !important;
                }

                #sale-document-modal .thermal-grand {
                    margin: ${px(1.1)}px 0 !important;
                    padding: ${px(1.4)}px 0 !important;

                    border-top:
                        2px solid
                        #000000 !important;

                    border-bottom:
                        2px solid
                        #000000 !important;
                }

                #sale-document-modal .thermal-grand span,
                #sale-document-modal .thermal-grand strong {
                    color: #000000 !important;

                    font-size: ${grandFontPx}px !important;
                    font-weight: 700 !important;
                    line-height: 1.3 !important;
                }

                #sale-document-modal .thermal-due span,
                #sale-document-modal .thermal-due strong {
                    font-weight: 600 !important;
                }

                #sale-document-modal .thermal-notes {
                    margin-top: ${px(1.8)}px !important;
                    padding: ${px(1.5)}px !important;

                    border:
                        1px solid
                        #444444 !important;
                }

                #sale-document-modal .thermal-notes strong {
                    display: block !important;

                    color: #000000 !important;

                    font-size: ${normalFontPx}px !important;
                    font-weight: 600 !important;
                }

                #sale-document-modal .thermal-notes p {
                    margin-top: ${px(0.7)}px !important;

                    color: #000000 !important;

                    font-size: ${smallFontPx}px !important;
                    font-weight: 500 !important;
                    line-height: 1.4 !important;

                    white-space: pre-wrap !important;
                    overflow-wrap: anywhere !important;
                }

                #sale-document-modal .thermal-footer {
                    margin-top: ${px(2)}px !important;
                    padding-top: ${px(1.7)}px !important;

                    color: #000000 !important;

                    font-size: ${footerFontPx}px !important;
                    font-weight: 600 !important;
                    line-height: 1.45 !important;

                    text-align: center !important;

                    white-space: pre-wrap !important;
                    overflow-wrap: anywhere !important;

                    border-top:
                        1px dashed
                        #000000 !important;
                }

                #sale-document-modal .thermal-software-credit {
                    margin-top: ${px(1.5)}px !important;
                    padding-top: ${px(0.9)}px !important;

                    color: #000000 !important;

                    font-size: ${softwareCreditFontPx}px !important;
                    font-weight: 600 !important;
                    line-height: 1.28 !important;

                    text-align: center !important;

                    white-space: ${paperWidthMm === 80 ? 'nowrap' : 'normal'} !important;
                    overflow-wrap: normal !important;

                    border-top:
                        1px dotted
                        #777777 !important;
                }
            </style>
        </head>

        <body>
            <div id="sale-document-modal">
                <div class="print-area receipts">
                    ${receiptMarkup}
                </div>
            </div>
        </body>
        </html>
    `;
}

function Icon({
    name,
}: {
    name:
    | 'alert'
    | 'check'
    | 'close'
    | 'invoice'
    | 'print'
    | 'receipt';
}) {
    const props = {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true,
    };

    if (name === 'alert') {
        return (
            <svg {...props}>
                <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4M12 17h.01" />
            </svg>
        );
    }

    if (name === 'check') {
        return (
            <svg {...props}>
                <path d="m5 12 4 4L19 6" />
            </svg>
        );
    }

    if (name === 'close') {
        return (
            <svg {...props}>
                <path d="m6 6 12 12M18 6 6 18" />
            </svg>
        );
    }

    if (name === 'invoice') {
        return (
            <svg {...props}>
                <path d="M6 3h9l3 3v15H6Z" />
                <path d="M15 3v4h4M9 11h6M9 15h6" />
            </svg>
        );
    }

    if (name === 'print') {
        return (
            <svg {...props}>
                <path d="M6 9V3h12v6" />

                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />

                <rect
                    x="6"
                    y="14"
                    width="12"
                    height="7"
                />

                <path d="M18 12h.01" />
            </svg>
        );
    }

    return (
        <svg {...props}>
            <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
            <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
    );
}

interface ThermalReceiptProps {
    settings: BusinessSetting;
    document: DocumentView;
    currencyFormatter: Intl.NumberFormat;
    copyIndex: number;
}

function ThermalReceipt({
    settings,
    document,
    currencyFormatter,
    copyIndex,
}: ThermalReceiptProps) {
    const paperClass =
        settings.receipt_paper_size
            === '58mm'
            ? 'print-paper-58mm'
            : 'print-paper-80mm';

    const money = (
        value: number,
    ): string => (
        currencyFormatter.format(value)
    );

    return (
        <article
            className={`
                print-document-receipt
                ${paperClass}
            `}
        >
            {copyIndex > 0
                && settings
                    .print_duplicate_label && (
                    <div className="thermal-copy-label">
                        DUPLICATE COPY
                    </div>
                )}

            <header className="thermal-header">
                {settings
                    .show_logo_on_receipt
                    && settings.logo_data_url && (
                        <img
                            className="thermal-logo"
                            src={
                                settings
                                    .logo_data_url
                            }
                            alt=""
                        />
                    )}

                <h2>
                    {settings.business_name}
                </h2>

                {settings
                    .show_business_address
                    && settings.address && (
                        <p>
                            {settings.address}
                        </p>
                    )}

                {settings.phone && (
                    <p>
                        Tel: {settings.phone}
                    </p>
                )}

                {settings.secondary_phone && (
                    <p>
                        {settings.secondary_phone}
                    </p>
                )}

                {settings.email && (
                    <p>
                        {settings.email}
                    </p>
                )}

                {settings.registration_number && (
                    <p>
                        Reg No:
                        {' '}
                        {settings.registration_number}
                    </p>
                )}

                {settings.tax_number && (
                    <p>
                        Tax No:
                        {' '}
                        {settings.tax_number}
                    </p>
                )}

                <strong>
                    {settings.receipt_title}
                </strong>
            </header>

            <div className="thermal-divider" />

            <section className="thermal-list">
                <div>
                    <span>
                        Sale:
                    </span>

                    <strong>
                        {document.saleNumber}
                    </strong>
                </div>

                <div>
                    <span>
                        Date:
                    </span>

                    <strong>
                        {formatDateTime(
                            document.saleDate,
                        )}
                    </strong>
                </div>

                {settings.show_cashier_name && (
                    <div>
                        <span>
                            Cashier:
                        </span>

                        <strong>
                            {document.cashierName}
                        </strong>
                    </div>
                )}

                {settings.show_customer_details && (
                    <>
                        <div>
                            <span>
                                Customer:
                            </span>

                            <strong>
                                {document.customerName}
                            </strong>
                        </div>

                        {document.customerPhone && (
                            <div>
                                <span>
                                    Mobile:
                                </span>

                                <strong>
                                    {document.customerPhone}
                                </strong>
                            </div>
                        )}
                    </>
                )}
            </section>

            <div className="thermal-divider" />

            <section className="thermal-items">
                {document.items.map(
                    (
                        item,
                        index,
                    ) => (
                        <article
                            key={
                                item.id
                                ?? `${itemName(
                                    item,
                                )}-${index}`
                            }
                        >
                            <strong>
                                {itemName(item)}
                            </strong>

                            {settings.show_sku
                                && item.product?.sku && (
                                    <small>
                                        SKU:
                                        {' '}
                                        {item.product.sku}
                                    </small>
                                )}

                            {settings.show_batch_number
                                && itemBatchNumber(item) && (
                                    <small>
                                        Batch:
                                        {' '}
                                        {itemBatchNumber(item)}
                                    </small>
                                )}

                            <div>
                                <span>
                                    {formatQuantity(
                                        item.quantity,
                                    )}
                                    {' × '}
                                    {money(
                                        itemUnitPrice(
                                            item,
                                        ),
                                    )}
                                </span>

                                <strong>
                                    {money(
                                        itemLineTotal(
                                            item,
                                        ),
                                    )}
                                </strong>
                            </div>

                            {numberValue(
                                item.discount,
                            ) > 0 && (
                                    <small>
                                        Discount:
                                        {' -'}
                                        {money(
                                            numberValue(
                                                item.discount,
                                            ),
                                        )}
                                    </small>
                                )}
                        </article>
                    ),
                )}
            </section>

            <div className="thermal-divider" />

            <section className="thermal-totals">
                <div>
                    <span>
                        Subtotal
                    </span>

                    <strong>
                        {money(
                            document.subtotal,
                        )}
                    </strong>
                </div>

                {document.totalDiscount > 0 && (
                    <div>
                        <span>
                            Discount
                        </span>

                        <strong>
                            -
                            {money(
                                document.totalDiscount,
                            )}
                        </strong>
                    </div>
                )}

                <div className="thermal-grand">
                    <span>
                        Grand Total
                    </span>

                    <strong>
                        {money(
                            document.grandTotal,
                        )}
                    </strong>
                </div>

                <div>
                    <span>
                        Amount Received
                    </span>

                    <strong>
                        {money(
                            document.amountReceived,
                        )}
                    </strong>
                </div>

                {document.dueAmount > 0 && (
                    <div className="thermal-due">
                        <span>
                            Due
                        </span>

                        <strong>
                            {money(
                                document.dueAmount,
                            )}
                        </strong>
                    </div>
                )}

                {document.changeAmount > 0 && (
                    <div>
                        <span>
                            Change
                        </span>

                        <strong>
                            {money(
                                document.changeAmount,
                            )}
                        </strong>
                    </div>
                )}
            </section>

            <div className="thermal-divider" />

            <section className="thermal-list">
                <div>
                    <span>
                        Status:
                    </span>

                    <strong>
                        {document.paymentStatus}
                    </strong>
                </div>

                <div>
                    <span>
                        Payment:
                    </span>

                    <strong>
                        {document.paymentMethod}
                    </strong>
                </div>

                {settings
                    .show_payment_reference
                    && document.paymentReference && (
                        <div>
                            <span>
                                Reference:
                            </span>

                            <strong>
                                {document.paymentReference}
                            </strong>
                        </div>
                    )}

                {settings.show_due_date
                    && document.dueAmount > 0
                    && document.dueDate && (
                        <div>
                            <span>
                                Due Date:
                            </span>

                            <strong>
                                {formatDate(
                                    document.dueDate,
                                )}
                            </strong>
                        </div>
                    )}
            </section>

            {document.notes && (
                <section className="thermal-notes">
                    <strong>
                        Notes
                    </strong>

                    <p>
                        {document.notes}
                    </p>
                </section>
            )}

            {settings.receipt_footer && (
                <footer className="thermal-footer">
                    {settings.receipt_footer}
                </footer>
            )}

            <div className="thermal-software-credit">
                {SOFTWARE_CREDIT}
            </div>
        </article>
    );
}

interface A4InvoiceProps {
    settings: BusinessSetting;
    document: DocumentView;
    currencyFormatter: Intl.NumberFormat;
}

function A4Invoice({
    settings,
    document,
    currencyFormatter,
}: A4InvoiceProps) {
    const money = (
        value: number,
    ): string => (
        currencyFormatter.format(value)
    );

    return (
        <article className="print-document-invoice">
            <header className="invoice-header">
                <div className="invoice-business">
                    {settings.logo_data_url && (
                        <img
                            className="invoice-logo"
                            src={
                                settings
                                    .logo_data_url
                            }
                            alt=""
                        />
                    )}

                    <h2>
                        {settings.business_name}
                    </h2>

                    {settings
                        .show_business_address
                        && settings.address && (
                            <p>
                                {settings.address}
                            </p>
                        )}

                    {settings.phone && (
                        <p>
                            Tel: {settings.phone}
                        </p>
                    )}

                    {settings.secondary_phone && (
                        <p>
                            {settings.secondary_phone}
                        </p>
                    )}

                    {settings.email && (
                        <p>
                            {settings.email}
                        </p>
                    )}

                    {settings.website && (
                        <p>
                            {settings.website}
                        </p>
                    )}

                    {settings.registration_number && (
                        <p>
                            Registration:
                            {' '}
                            {settings.registration_number}
                        </p>
                    )}

                    {settings.tax_number && (
                        <p>
                            Tax Number:
                            {' '}
                            {settings.tax_number}
                        </p>
                    )}
                </div>

                <div className="invoice-title">
                    <h1>
                        {settings.invoice_title}
                    </h1>

                    <strong>
                        {document.saleNumber}
                    </strong>

                    <span>
                        {formatDateTime(
                            document.saleDate,
                        )}
                    </span>
                </div>
            </header>

            <section className="invoice-info">
                <div>
                    <span>
                        Bill To
                    </span>

                    <strong>
                        {document.customerName}
                    </strong>

                    {document.customerPhone && (
                        <p>
                            {document.customerPhone}
                        </p>
                    )}

                    {document.customerAddress && (
                        <p>
                            {document.customerAddress}
                        </p>
                    )}
                </div>

                <div>
                    <span>
                        Payment Status
                    </span>

                    <strong>
                        {document.paymentStatus}
                    </strong>

                    <p>
                        {document.paymentMethod}
                    </p>
                </div>

                {settings.show_cashier_name && (
                    <div>
                        <span>
                            Prepared By
                        </span>

                        <strong>
                            {document.cashierName}
                        </strong>
                    </div>
                )}
            </section>

            <table className="invoice-table">
                <thead>
                    <tr>
                        <th>
                            #
                        </th>

                        <th>
                            Description
                        </th>

                        <th>
                            Quantity
                        </th>

                        <th>
                            Unit Price
                        </th>

                        <th>
                            Discount
                        </th>

                        <th>
                            Amount
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {document.items.map(
                        (
                            item,
                            index,
                        ) => (
                            <tr
                                key={
                                    item.id
                                    ?? `${itemName(
                                        item,
                                    )}-${index}`
                                }
                            >
                                <td>
                                    {index + 1}
                                </td>

                                <td>
                                    <strong>
                                        {itemName(item)}
                                    </strong>

                                    <div className="invoice-item-meta">
                                        {settings.show_sku
                                            && item.product?.sku && (
                                                <small>
                                                    SKU:
                                                    {' '}
                                                    {item.product.sku}
                                                </small>
                                            )}

                                        {settings.show_batch_number
                                            && itemBatchNumber(item) && (
                                                <small>
                                                    Batch:
                                                    {' '}
                                                    {itemBatchNumber(item)}
                                                </small>
                                            )}
                                    </div>
                                </td>

                                <td>
                                    {formatQuantity(
                                        item.quantity,
                                    )}

                                    {item.product?.unit
                                        ? ` ${item.product.unit}`
                                        : ''}
                                </td>

                                <td>
                                    {money(
                                        itemUnitPrice(
                                            item,
                                        ),
                                    )}
                                </td>

                                <td>
                                    {money(
                                        numberValue(
                                            item.discount,
                                        ),
                                    )}
                                </td>

                                <td>
                                    {money(
                                        itemLineTotal(
                                            item,
                                        ),
                                    )}
                                </td>
                            </tr>
                        ),
                    )}
                </tbody>
            </table>

            <section className="invoice-bottom">
                <div className="invoice-payment">
                    <h3>
                        Payment Information
                    </h3>

                    <p>
                        Method:
                        {' '}

                        <strong>
                            {document.paymentMethod}
                        </strong>
                    </p>

                    <p>
                        Paid:
                        {' '}

                        <strong>
                            {money(
                                document.paidAmount,
                            )}
                        </strong>
                    </p>

                    <p>
                        Outstanding:
                        {' '}

                        <strong>
                            {money(
                                document.dueAmount,
                            )}
                        </strong>
                    </p>

                    {settings
                        .show_payment_reference
                        && document.paymentReference && (
                            <p>
                                Reference:
                                {' '}

                                <strong>
                                    {document.paymentReference}
                                </strong>
                            </p>
                        )}

                    {settings.show_due_date
                        && document.dueAmount > 0
                        && document.dueDate && (
                            <p>
                                Due Date:
                                {' '}

                                <strong>
                                    {formatDate(
                                        document.dueDate,
                                    )}
                                </strong>
                            </p>
                        )}

                    {document.notes && (
                        <div className="invoice-notes">
                            <span>
                                Notes
                            </span>

                            <p>
                                {document.notes}
                            </p>
                        </div>
                    )}
                </div>

                <div className="invoice-totals">
                    <div>
                        <span>
                            Subtotal
                        </span>

                        <strong>
                            {money(
                                document.subtotal,
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Item Discount
                        </span>

                        <strong>
                            -
                            {money(
                                document.itemDiscount,
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Sale Discount
                        </span>

                        <strong>
                            -
                            {money(
                                document.saleDiscount,
                            )}
                        </strong>
                    </div>

                    <div className="invoice-grand">
                        <span>
                            Grand Total
                        </span>

                        <strong>
                            {money(
                                document.grandTotal,
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Paid Amount
                        </span>

                        <strong>
                            {money(
                                document.paidAmount,
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Balance Due
                        </span>

                        <strong>
                            {money(
                                document.dueAmount,
                            )}
                        </strong>
                    </div>
                </div>
            </section>

            {settings.invoice_footer && (
                <footer className="invoice-footer">
                    {settings.invoice_footer}
                </footer>
            )}
        </article>
    );
}

const styles = `
#sale-document-modal,
#sale-document-modal *,
#sale-document-modal *::before,
#sale-document-modal *::after {
    box-sizing: border-box !important;
}

#sale-document-modal {
    --green-900: #14532d;
    --green-800: #166534;
    --green-700: #15803d;
    --green-100: #dcfce7;
    --green-50: #f0fdf4;

    --red: #b42318;
    --red-bg: #fef3f2;

    --text: #101828;
    --text-2: #344054;
    --muted: #667085;
    --border: #d0d9d2;
    --border-2: #aebdb2;

    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;

    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: hidden !important;

    color: var(--text) !important;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif !important;

    font-size: 14px !important;
    line-height: 1.5 !important;

    isolation: isolate !important;
    -webkit-font-smoothing: antialiased !important;
}

#sale-document-modal button {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#sale-document-modal h1,
#sale-document-modal h2,
#sale-document-modal h3,
#sale-document-modal p {
    margin: 0 !important;
}

#sale-document-modal .sd-backdrop {
    position: absolute !important;
    inset: 0 !important;

    display: flex !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 18px !important;

    overflow: auto !important;

    background:
        rgba(3, 18, 10, 0.74) !important;

    backdrop-filter: blur(4px) !important;
}

#sale-document-modal .sd-dialog {
    display: flex !important;

    width: min(1180px, 100%) !important;
    max-height:
        calc(100dvh - 36px) !important;

    min-height: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 16px !important;

    box-shadow:
        0 28px 72px
        rgba(0, 0, 0, 0.36) !important;
}

#sale-document-modal .sd-header {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        auto
        40px !important;

    min-height: 88px !important;
    flex: 0 0 auto !important;

    align-items: center !important;
    gap: 16px !important;

    padding: 14px 18px !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--green-900),
            var(--green-700)
        ) !important;
}

#sale-document-modal .sd-header-copy {
    min-width: 0 !important;
}

#sale-document-modal .sd-kicker {
    display: flex !important;

    align-items: center !important;
    gap: 6px !important;

    margin-bottom: 2px !important;

    color: #bbf7d0 !important;

    font-size: 11px !important;
    font-weight: 750 !important;
    letter-spacing: 0.055em !important;

    text-transform: uppercase !important;
}

#sale-document-modal .sd-kicker svg {
    width: 14px !important;
    height: 14px !important;
}

#sale-document-modal .sd-title {
    overflow: hidden !important;

    color: #ffffff !important;

    font-size: 22px !important;
    font-weight: 740 !important;
    line-height: 1.25 !important;
    letter-spacing: -0.02em !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#sale-document-modal .sd-subtitle {
    margin-top: 3px !important;

    color: #d8f7e1 !important;

    font-size: 12px !important;
}

#sale-document-modal .sd-total {
    display: flex !important;

    min-width: 190px !important;

    flex-direction: column !important;
    align-items: flex-end !important;

    padding: 8px 11px !important;

    background:
        rgba(255, 255, 255, 0.12) !important;

    border:
        1px solid
        rgba(255, 255, 255, 0.21) !important;

    border-radius: 10px !important;
}

#sale-document-modal .sd-total span {
    color: #d8f7e1 !important;

    font-size: 10px !important;
    font-weight: 700 !important;
    letter-spacing: 0.04em !important;

    text-transform: uppercase !important;
}

#sale-document-modal .sd-total strong {
    margin-top: 1px !important;

    color: #ffffff !important;

    font-size: 19px !important;
    font-weight: 780 !important;

    white-space: nowrap !important;
}

#sale-document-modal .sd-close {
    display: grid !important;

    width: 40px !important;
    height: 40px !important;

    place-items: center !important;

    padding: 0 !important;

    color: #ffffff !important;

    background:
        rgba(255, 255, 255, 0.12) !important;

    border:
        1px solid
        rgba(255, 255, 255, 0.34) !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#sale-document-modal .sd-close:hover {
    background:
        rgba(255, 255, 255, 0.22) !important;
}

#sale-document-modal .sd-close svg {
    width: 19px !important;
    height: 19px !important;
}

#sale-document-modal .sd-toolbar {
    display: flex !important;

    min-height: 60px !important;
    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 14px !important;

    padding: 10px 16px !important;

    background: #ffffff !important;

    border-bottom:
        1px solid
        var(--border) !important;
}

#sale-document-modal .sd-types {
    display: flex !important;

    align-items: center !important;
    gap: 7px !important;
}

#sale-document-modal .sd-type {
    display: inline-flex !important;

    min-height: 40px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;

    padding: 7px 11px !important;

    color: var(--text-2) !important;

    font-size: 12px !important;
    font-weight: 650 !important;

    background: #f8faf9 !important;

    border:
        1px solid
        var(--border-2) !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#sale-document-modal .sd-type:hover {
    border-color:
        var(--green-700) !important;
}

#sale-document-modal .sd-type.active {
    color: #ffffff !important;

    background: var(--green-700) !important;

    border-color:
        var(--green-700) !important;

    box-shadow:
        0 4px 10px
        rgba(21, 128, 61, 0.15) !important;
}

#sale-document-modal .sd-type svg {
    width: 16px !important;
    height: 16px !important;
}

#sale-document-modal .sd-format {
    display: inline-flex !important;

    min-height: 34px !important;

    align-items: center !important;

    padding: 6px 9px !important;

    color: var(--green-900) !important;

    font-size: 11px !important;
    font-weight: 650 !important;

    white-space: nowrap !important;

    background: var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 999px !important;
}

#sale-document-modal .sd-summary {
    display: grid !important;

    grid-template-columns:
        repeat(
            3,
            minmax(0, 1fr)
        ) !important;

    gap: 8px !important;

    padding: 10px 16px !important;

    background: #f8faf9 !important;

    border-bottom:
        1px solid
        var(--border) !important;
}

#sale-document-modal .sd-summary > div {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;
    gap: 2px !important;

    padding: 8px 10px !important;

    background: #ffffff !important;

    border:
        1px solid
        #e3e9e4 !important;

    border-radius: 8px !important;
}

#sale-document-modal .sd-summary span {
    color: var(--muted) !important;

    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.04em !important;

    text-transform: uppercase !important;
}

#sale-document-modal .sd-summary strong {
    overflow: hidden !important;

    color: var(--text-2) !important;

    font-size: 12px !important;
    font-weight: 700 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#sale-document-modal .sd-warning {
    display: flex !important;

    align-items: flex-start !important;
    gap: 8px !important;

    margin: 10px 16px 0 !important;
    padding: 9px 11px !important;

    color: var(--red) !important;

    font-size: 12px !important;
    font-weight: 600 !important;

    background: var(--red-bg) !important;

    border:
        1px solid
        #f3b5af !important;

    border-radius: 8px !important;
}

#sale-document-modal .sd-warning svg {
    width: 17px !important;
    height: 17px !important;
    min-width: 17px !important;

    margin-top: 1px !important;
}

#sale-document-modal .sd-preview {
    display: block !important;

    min-height: 0 !important;
    flex: 1 !important;

    padding: 18px !important;

    overflow: auto !important;

    background:
        linear-gradient(
            135deg,
            #e8ede9,
            #f4f6f4
        ) !important;

    scrollbar-width: thin !important;

    scrollbar-color:
        #9cad9f
        #dfe6e0 !important;
}

#sale-document-modal .print-area {
    display: flex !important;

    width: max-content !important;
    min-width: 100% !important;

    align-items: flex-start !important;
    justify-content: center !important;
    gap: 18px !important;

    margin: 0 auto !important;
}

#sale-document-modal .print-area.receipts {
    flex-wrap: wrap !important;
}

#sale-document-modal .print-area.invoice {
    display: block !important;
    width: 100% !important;
}

#sale-document-modal .print-document-receipt,
#sale-document-modal .print-document-invoice {
    color: #111111 !important;

    font-family:
        "Noto Sans Sinhala",
        "Sinhala Sangam MN",
        "Sinhala MN",
        "Iskoola Pota",
        "Nirmala UI",
        "Segoe UI",
        Arial,
        Helvetica,
        sans-serif !important;

    background: #ffffff !important;

    box-shadow:
        0 8px 24px
        rgba(16, 24, 40, 0.16) !important;
}

#sale-document-modal .print-document-receipt {
    flex: 0 0 auto !important;

    min-height: 300px !important;

    padding: 14px 12px !important;

    font-size: 11px !important;
    line-height: 1.35 !important;
}

#sale-document-modal .print-paper-58mm {
    width: 58mm !important;
}

#sale-document-modal .print-paper-80mm {
    width: 80mm !important;
}

#sale-document-modal .thermal-copy-label {
    margin-bottom: 7px !important;
    padding: 4px 6px !important;

    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.08em !important;

    text-align: center !important;

    border:
        1px dashed
        #555555 !important;
}

#sale-document-modal .thermal-header {
    text-align: center !important;
}

#sale-document-modal .thermal-logo {
    display: block !important;

    width: auto !important;
    max-width: 52mm !important;
    max-height: 20mm !important;

    margin: 0 auto 7px !important;

    object-fit: contain !important;
}

#sale-document-modal .thermal-header h2 {
    color: #111111 !important;

    font-size: 15px !important;
    font-weight: 750 !important;
    line-height: 1.2 !important;
}

#sale-document-modal .thermal-header p {
    margin-top: 2px !important;

    color: #222222 !important;

    font-size: 9px !important;
    line-height: 1.35 !important;

    overflow-wrap: anywhere !important;
}

#sale-document-modal .thermal-header > strong {
    display: block !important;

    margin-top: 7px !important;

    font-size: 11px !important;
    font-weight: 750 !important;
    letter-spacing: 0.03em !important;

    text-transform: uppercase !important;
}

#sale-document-modal .thermal-divider {
    height: 0 !important;

    margin: 7px 0 !important;

    border-top:
        1px dashed
        #333333 !important;
}

#sale-document-modal .thermal-list,
#sale-document-modal .thermal-totals {
    display: flex !important;

    flex-direction: column !important;
    gap: 3px !important;
}

#sale-document-modal .thermal-list > div,
#sale-document-modal .thermal-totals > div {
    display: flex !important;

    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 8px !important;
}

#sale-document-modal .thermal-list span,
#sale-document-modal .thermal-totals span {
    color: #333333 !important;
    font-size: 9px !important;
}

#sale-document-modal .thermal-list strong,
#sale-document-modal .thermal-totals strong {
    max-width: 64% !important;

    color: #111111 !important;

    font-size: 9px !important;
    font-weight: 700 !important;

    text-align: right !important;

    overflow-wrap: anywhere !important;
}

#sale-document-modal .thermal-items {
    display: flex !important;

    flex-direction: column !important;
    gap: 6px !important;
}

#sale-document-modal .thermal-items article {
    padding-bottom: 5px !important;

    border-bottom:
        1px dotted
        #b0b0b0 !important;
}

#sale-document-modal .thermal-items article:last-child {
    padding-bottom: 0 !important;
    border-bottom: 0 !important;
}

#sale-document-modal .thermal-items article > strong {
    display: block !important;

    color: #111111 !important;

    font-size: 10px !important;
    font-weight: 700 !important;

    overflow-wrap: anywhere !important;
}

#sale-document-modal .thermal-items small {
    display: block !important;

    margin-top: 1px !important;

    color: #444444 !important;

    font-size: 8px !important;

    overflow-wrap: anywhere !important;
}

#sale-document-modal .thermal-items article > div {
    display: flex !important;

    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 8px !important;

    margin-top: 3px !important;
}

#sale-document-modal
.thermal-items article > div span,
#sale-document-modal
.thermal-items article > div strong {
    font-size: 9px !important;
}

#sale-document-modal .thermal-grand {
    margin: 3px 0 !important;
    padding: 5px 0 !important;

    border-top:
        1px solid
        #111111 !important;

    border-bottom:
        1px solid
        #111111 !important;
}

#sale-document-modal .thermal-grand span,
#sale-document-modal .thermal-grand strong {
    color: #000000 !important;

    font-size: 12px !important;
    font-weight: 800 !important;
}

#sale-document-modal .thermal-due span,
#sale-document-modal .thermal-due strong {
    font-weight: 750 !important;
}

#sale-document-modal .thermal-notes {
    margin-top: 7px !important;
    padding: 6px !important;

    border:
        1px solid
        #cccccc !important;
}

#sale-document-modal .thermal-notes strong {
    display: block !important;
    font-size: 9px !important;
}

#sale-document-modal .thermal-notes p {
    margin-top: 2px !important;

    font-size: 8px !important;

    overflow-wrap: anywhere !important;
}

#sale-document-modal .thermal-footer {
    margin-top: 10px !important;

    font-size: 9px !important;
    font-weight: 600 !important;
    line-height: 1.4 !important;

    text-align: center !important;

    white-space: pre-wrap !important;
    overflow-wrap: anywhere !important;
}

#sale-document-modal .thermal-software-credit {
    margin-top: 9px !important;
    padding-top: 6px !important;

    color: #222222 !important;

    font-size: 10px !important;
    font-weight: 600 !important;
    line-height: 1.3 !important;

    text-align: center !important;

    white-space: nowrap !important;

    border-top:
        1px dotted
        #999999 !important;
}

#sale-document-modal .print-document-invoice {
    width: 210mm !important;
    min-height: 297mm !important;

    margin: 0 auto !important;
    padding: 18mm !important;

    font-size: 12px !important;
    line-height: 1.45 !important;
}

#sale-document-modal .invoice-header {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        auto !important;

    align-items: start !important;
    gap: 24px !important;

    padding-bottom: 18px !important;

    border-bottom:
        2px solid
        var(--green-800) !important;
}

#sale-document-modal .invoice-logo {
    display: block !important;

    width: auto !important;
    max-width: 180px !important;
    max-height: 70px !important;

    margin-bottom: 10px !important;

    object-fit: contain !important;
}

#sale-document-modal .invoice-business h2 {
    color: var(--green-900) !important;

    font-size: 22px !important;
    font-weight: 760 !important;
    line-height: 1.2 !important;
}

#sale-document-modal .invoice-business p {
    margin-top: 2px !important;

    color: #475467 !important;

    font-size: 10px !important;

    overflow-wrap: anywhere !important;
}

#sale-document-modal .invoice-title {
    min-width: 185px !important;

    text-align: right !important;
}

#sale-document-modal .invoice-title h1 {
    color: var(--green-900) !important;

    font-size: 25px !important;
    font-weight: 780 !important;
    line-height: 1.2 !important;
    letter-spacing: -0.02em !important;

    text-transform: uppercase !important;
}

#sale-document-modal .invoice-title strong {
    display: block !important;

    margin-top: 7px !important;

    color: #101828 !important;

    font-size: 13px !important;
}

#sale-document-modal .invoice-title span {
    display: block !important;

    margin-top: 3px !important;

    color: #667085 !important;

    font-size: 10px !important;
}

#sale-document-modal .invoice-info {
    display: grid !important;

    grid-template-columns:
        repeat(
            3,
            minmax(0, 1fr)
        ) !important;

    gap: 12px !important;

    margin: 18px 0 !important;
}

#sale-document-modal .invoice-info > div {
    min-width: 0 !important;

    padding: 11px !important;

    background: #f8faf9 !important;

    border:
        1px solid
        #dce4de !important;

    border-radius: 7px !important;
}

#sale-document-modal .invoice-info span {
    display: block !important;

    color: #667085 !important;

    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.04em !important;

    text-transform: uppercase !important;
}

#sale-document-modal .invoice-info strong {
    display: block !important;

    margin-top: 3px !important;

    color: #101828 !important;

    font-size: 12px !important;
    font-weight: 700 !important;

    overflow-wrap: anywhere !important;
}

#sale-document-modal .invoice-info p {
    margin-top: 2px !important;

    color: #475467 !important;

    font-size: 10px !important;

    overflow-wrap: anywhere !important;
}

#sale-document-modal .invoice-table {
    width: 100% !important;

    border-collapse: collapse !important;

    color: #101828 !important;

    table-layout: fixed !important;
}

#sale-document-modal .invoice-table th {
    padding: 8px 7px !important;

    color: #ffffff !important;

    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.025em !important;

    text-align: left !important;
    text-transform: uppercase !important;

    background: var(--green-800) !important;

    border:
        1px solid
        var(--green-800) !important;
}

#sale-document-modal .invoice-table td {
    padding: 8px 7px !important;

    color: #344054 !important;

    font-size: 10px !important;
    vertical-align: top !important;

    border:
        1px solid
        #d8e0da !important;

    overflow-wrap: anywhere !important;
}

#sale-document-modal
.invoice-table tbody tr:nth-child(even) {
    background: #f8faf9 !important;
}

#sale-document-modal .invoice-table th:first-child,
#sale-document-modal .invoice-table td:first-child {
    width: 42px !important;
    text-align: center !important;
}

#sale-document-modal
.invoice-table th:nth-child(n + 3),
#sale-document-modal
.invoice-table td:nth-child(n + 3) {
    width: 15% !important;
    text-align: right !important;
}

#sale-document-modal .invoice-table td strong {
    color: #101828 !important;

    font-size: 10px !important;
    font-weight: 700 !important;
}

#sale-document-modal .invoice-item-meta {
    display: flex !important;

    flex-wrap: wrap !important;
    gap: 4px 8px !important;

    margin-top: 3px !important;
}

#sale-document-modal .invoice-item-meta small {
    color: #667085 !important;
    font-size: 8px !important;
}

#sale-document-modal .invoice-bottom {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        minmax(230px, 290px) !important;

    align-items: start !important;
    gap: 24px !important;

    margin-top: 20px !important;
}

#sale-document-modal .invoice-payment {
    padding: 13px !important;

    background: #f8faf9 !important;

    border:
        1px solid
        #dce4de !important;

    border-radius: 7px !important;
}

#sale-document-modal .invoice-payment h3 {
    margin-bottom: 7px !important;

    color: var(--green-900) !important;

    font-size: 13px !important;
    font-weight: 730 !important;
}

#sale-document-modal .invoice-payment > p {
    margin-top: 3px !important;

    color: #475467 !important;

    font-size: 10px !important;
}

#sale-document-modal
.invoice-payment > p strong {
    color: #101828 !important;
}

#sale-document-modal .invoice-notes {
    margin-top: 10px !important;
    padding-top: 8px !important;

    border-top:
        1px solid
        #d8e0da !important;
}

#sale-document-modal .invoice-notes span {
    color: #344054 !important;

    font-size: 9px !important;
    font-weight: 700 !important;

    text-transform: uppercase !important;
}

#sale-document-modal .invoice-notes p {
    margin-top: 3px !important;

    color: #475467 !important;

    font-size: 10px !important;

    white-space: pre-wrap !important;
    overflow-wrap: anywhere !important;
}

#sale-document-modal .invoice-totals {
    display: flex !important;

    flex-direction: column !important;

    border:
        1px solid
        #cbd6cd !important;

    border-radius: 7px !important;

    overflow: hidden !important;
}

#sale-document-modal .invoice-totals > div {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    min-height: 35px !important;

    padding: 7px 10px !important;

    border-bottom:
        1px solid
        #e0e6e1 !important;
}

#sale-document-modal
.invoice-totals > div:last-child {
    border-bottom: 0 !important;
}

#sale-document-modal .invoice-totals span {
    color: #475467 !important;
    font-size: 10px !important;
}

#sale-document-modal .invoice-totals strong {
    color: #101828 !important;

    font-size: 10px !important;
    font-weight: 700 !important;

    text-align: right !important;
}

#sale-document-modal .invoice-grand {
    color: #ffffff !important;

    background: var(--green-800) !important;

    border-bottom-color:
        var(--green-800) !important;
}

#sale-document-modal .invoice-grand span,
#sale-document-modal .invoice-grand strong {
    color: #ffffff !important;

    font-size: 13px !important;
    font-weight: 750 !important;
}

#sale-document-modal .invoice-footer {
    margin-top: 25px !important;
    padding-top: 12px !important;

    color: #475467 !important;

    font-size: 10px !important;
    line-height: 1.45 !important;

    text-align: center !important;

    white-space: pre-wrap !important;

    border-top:
        1px solid
        #d8e0da !important;
}

#sale-document-modal .sd-actions {
    display: flex !important;

    min-height: 68px !important;
    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: flex-end !important;
    gap: 9px !important;

    padding: 12px 18px !important;

    background: #ffffff !important;

    border-top:
        1px solid
        var(--border) !important;
}

#sale-document-modal .sd-action {
    display: inline-flex !important;

    min-height: 42px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;

    padding: 8px 13px !important;

    font-size: 13px !important;
    font-weight: 700 !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#sale-document-modal .sd-cancel {
    color: var(--text-2) !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border-2) !important;
}

#sale-document-modal .sd-print {
    color: #ffffff !important;

    background: var(--green-700) !important;

    border:
        1px solid
        var(--green-700) !important;

    box-shadow:
        0 4px 12px
        rgba(21, 128, 61, 0.18) !important;
}

#sale-document-modal
.sd-print:hover:not(:disabled) {
    background: var(--green-800) !important;

    border-color:
        var(--green-800) !important;
}

#sale-document-modal .sd-action:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

#sale-document-modal .sd-action svg {
    width: 17px !important;
    height: 17px !important;
}

#sale-document-modal button:focus-visible {
    outline: none !important;

    border-color:
        var(--green-700) !important;

    box-shadow:
        0 0 0 4px
        rgba(21, 128, 61, 0.14) !important;
}

@media (max-width: 760px) {
    #sale-document-modal .sd-backdrop {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    #sale-document-modal .sd-dialog {
        width: 100% !important;
        max-height: 97dvh !important;

        border-right: 0 !important;
        border-bottom: 0 !important;
        border-left: 0 !important;

        border-radius:
            16px
            16px
            0
            0 !important;
    }

    #sale-document-modal .sd-header {
        grid-template-columns:
            minmax(0, 1fr)
            40px !important;

        min-height: 78px !important;

        padding: 12px 14px !important;
    }

    #sale-document-modal .sd-title {
        font-size: 19px !important;
    }

    #sale-document-modal .sd-total {
        grid-column: 1 / -1 !important;
        grid-row: 2 !important;

        width: 100% !important;
        min-width: 0 !important;

        align-items: flex-start !important;
    }

    #sale-document-modal .sd-close {
        grid-column: 2 !important;
        grid-row: 1 !important;
    }

    #sale-document-modal .sd-toolbar {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #sale-document-modal .sd-types {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #sale-document-modal .sd-type {
        width: 100% !important;
    }

    #sale-document-modal .sd-format {
        justify-content: center !important;
    }

    #sale-document-modal .sd-summary {
        grid-template-columns: 1fr !important;

        padding-right: 12px !important;
        padding-left: 12px !important;
    }

    #sale-document-modal .sd-preview {
        padding: 12px !important;
    }

    #sale-document-modal .sd-actions {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;

        padding: 11px 13px !important;
    }

    #sale-document-modal .sd-action {
        width: 100% !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #sale-document-modal *,
    #sale-document-modal *::before,
    #sale-document-modal *::after {
        transition: none !important;
        scroll-behavior: auto !important;
    }
}
`;

export default function SaleReceiptModal({
    receipt,
    onClose,
}: SaleReceiptModalProps) {
    const { token } = useAuth();

    const printButtonRef =
        useRef<HTMLButtonElement | null>(
            null,
        );

    const autoPrintedReceipt =
        useRef<SaleReceipt | null>(
            null,
        );

    const previewRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    const [settings, setSettings] =
        useState<BusinessSetting>(
            defaultBusinessSetting,
        );

    const [
        devicePrinterName,
        setDevicePrinterName,
    ] = useState('');

    const [
        isLoadingDevicePrinter,
        setIsLoadingDevicePrinter,
    ] = useState(false);

    const [documentType, setDocumentType] =
        useState<PrintDocumentType>(
            defaultBusinessSetting
                .default_print_document,
        );

    const [
        isLoadingSettings,
        setIsLoadingSettings,
    ] = useState(false);

    const [
        settingsWarning,
        setSettingsWarning,
    ] = useState('');

    const [
        isPrinting,
        setIsPrinting,
    ] = useState(false);

    const [
        printError,
        setPrintError,
    ] = useState('');

    const printableSale =
        receipt as unknown as
        PrintableSale | null;

    const saleDocument =
        useMemo(
            () => (
                printableSale
                    ? createDocumentView(
                        printableSale,
                    )
                    : null
            ),
            [printableSale],
        );

    const currencyFormatter =
        useMemo(
            () => (
                createCurrencyFormatter(
                    settings.currency_code,
                )
            ),
            [settings.currency_code],
        );

    const receiptUsesUnicodeRendering =
        useMemo(
            () => (
                saleDocument
                    ? receiptNeedsUnicodeRendering(
                        settings,
                        saleDocument,
                    )
                    : false
            ),
            [
                settings,
                saleDocument,
            ],
        );

    useEffect(() => {
        if (
            !receipt
            || !token
        ) {
            return;
        }

        let cancelled = false;

        const load =
            async (): Promise<void> => {
                setIsLoadingSettings(true);
                setSettingsWarning('');

                try {
                    const response =
                        await getBusinessSettings(
                            token,
                        );

                    if (cancelled) {
                        return;
                    }

                    setSettings(
                        response.data,
                    );

                    setDocumentType(
                        response
                            .data
                            .default_print_document,
                    );
                } catch {
                    if (cancelled) {
                        return;
                    }

                    setSettings(
                        defaultBusinessSetting,
                    );

                    setDocumentType(
                        defaultBusinessSetting
                            .default_print_document,
                    );

                    setSettingsWarning(
                        'Business settings could not be loaded. Default printing settings are being used.',
                    );
                } finally {
                    if (!cancelled) {
                        setIsLoadingSettings(
                            false,
                        );
                    }
                }
            };

        void load();

        return () => {
            cancelled = true;
        };
    }, [
        receipt,
        token,
    ]);

    useEffect(() => {
        if (!receipt) {
            setDevicePrinterName('');
            setIsLoadingDevicePrinter(false);
            return;
        }

        let cancelled = false;

        const loadDevicePrinter =
            async (): Promise<void> => {
                setIsLoadingDevicePrinter(true);

                try {
                    const config =
                        await loadPrinterConfig();

                    if (cancelled) {
                        return;
                    }

                    setDevicePrinterName(
                        config
                            ?.receiptPrinterName
                            ?.trim()
                        ?? '',
                    );
                } catch {
                    if (!cancelled) {
                        setDevicePrinterName('');
                    }
                } finally {
                    if (!cancelled) {
                        setIsLoadingDevicePrinter(false);
                    }
                }
            };

        void loadDevicePrinter();

        return () => {
            cancelled = true;
        };
    }, [
        receipt,
    ]);

    const buildEscPosPayload =
        useCallback(
            (): EscPosReceiptPayload | null => {
                if (!saleDocument) {
                    return null;
                }

                const money = (
                    value: number,
                ): string => (
                    currencyFormatter.format(value)
                );

                const addressLines: string[] = [];

                if (
                    settings.show_business_address
                    && settings.address
                ) {
                    addressLines.push(settings.address);
                }

                if (settings.phone) {
                    addressLines.push(
                        `Tel: ${settings.phone}`,
                    );
                }

                if (settings.secondary_phone) {
                    addressLines.push(
                        settings.secondary_phone,
                    );
                }

                const metaLines: EscPosReceiptLine[] = [
                    { left: `Sale: ${saleDocument.saleNumber}` },
                    {
                        left: `Date: ${formatDateTime(
                            saleDocument.saleDate,
                        )}`,
                    },
                ];

                if (settings.show_cashier_name) {
                    metaLines.push({
                        left: `Cashier: ${saleDocument.cashierName}`,
                    });
                }

                if (settings.show_customer_details) {
                    metaLines.push({
                        left: `Customer: ${saleDocument.customerName}`,
                    });

                    if (saleDocument.customerPhone) {
                        metaLines.push({
                            left: `Mobile: ${saleDocument.customerPhone}`,
                        });
                    }
                }

                const items: EscPosReceiptItem[] =
                    saleDocument.items.map((item) => {
                        const meta: string[] = [];

                        if (
                            settings.show_sku
                            && item.product?.sku
                        ) {
                            meta.push(
                                `SKU: ${item.product.sku}`,
                            );
                        }

                        if (settings.show_batch_number) {
                            const batchNumber =
                                itemBatchNumber(item);

                            if (batchNumber) {
                                meta.push(
                                    `Batch: ${batchNumber}`,
                                );
                            }
                        }

                        const quantityLine =
                            `${formatQuantity(
                                item.quantity,
                            )} x ${money(
                                itemUnitPrice(item),
                            )}`;

                        const lineTotal =
                            money(itemLineTotal(item));

                        const discountValue =
                            numberValue(item.discount);

                        return {
                            name: itemName(item),
                            meta,
                            quantityLine,
                            lineTotal,
                            discountLine:
                                discountValue > 0
                                    ? `Discount: -${money(
                                        discountValue,
                                    )}`
                                    : undefined,
                        };
                    });

                const totalsLines: EscPosReceiptLine[] = [
                    {
                        left: 'Subtotal',
                        right: money(saleDocument.subtotal),
                    },
                ];

                if (saleDocument.totalDiscount > 0) {
                    totalsLines.push({
                        left: 'Discount',
                        right: `-${money(
                            saleDocument.totalDiscount,
                        )}`,
                    });
                }

                totalsLines.push({
                    left: 'GRAND TOTAL',
                    right: money(saleDocument.grandTotal),
                });

                totalsLines.push({
                    left: 'Amount Received',
                    right: money(
                        saleDocument.amountReceived,
                    ),
                });

                if (saleDocument.dueAmount > 0) {
                    totalsLines.push({
                        left: 'Due',
                        right: money(saleDocument.dueAmount),
                    });
                }

                if (saleDocument.changeAmount > 0) {
                    totalsLines.push({
                        left: 'Change',
                        right: money(
                            saleDocument.changeAmount,
                        ),
                    });
                }

                const statusLines: EscPosReceiptLine[] = [
                    {
                        left: 'Status',
                        right: saleDocument.paymentStatus,
                    },
                    {
                        left: 'Payment',
                        right: saleDocument.paymentMethod,
                    },
                ];

                if (
                    settings.show_payment_reference
                    && saleDocument.paymentReference
                ) {
                    statusLines.push({
                        left: 'Reference',
                        right: saleDocument.paymentReference,
                    });
                }

                if (
                    settings.show_due_date
                    && saleDocument.dueAmount > 0
                    && saleDocument.dueDate
                ) {
                    statusLines.push({
                        left: 'Due Date',
                        right: formatDate(
                            saleDocument.dueDate,
                        ),
                    });
                }

                return {
                    printerName:
                        devicePrinterName
                        || settings.printer_name
                        || '',
                    paperWidthMm:
                        settings.receipt_paper_size
                            === '58mm'
                            ? 58
                            : 80,

                    businessName: settings.business_name,
                    addressLines,
                    receiptTitle: settings.receipt_title,

                    metaLines,
                    items,
                    totalsLines,
                    statusLines,
                    notes: saleDocument.notes,
                    footerText:
                        settings.receipt_footer
                            && settings.receipt_footer.trim().length > 0
                            ? settings.receipt_footer
                            : 'Thank you for your business.',

                    softwareCredit:
                        SOFTWARE_CREDIT,

                    copies: Math.max(
                        1,
                        Math.min(3, settings.receipt_copies),
                    ),

                    duplicateLabel:
                        settings.print_duplicate_label,
                };
            },
            [
                saleDocument,
                settings,
                currencyFormatter,
                devicePrinterName,
            ],
        );

    const runSilentPrint =
        useCallback(
            async (): Promise<void> => {
                if (isPrinting) {
                    return;
                }

                if (
                    documentType === 'receipt'
                    && isLoadingDevicePrinter
                ) {
                    setPrintError(
                        'Loading this computer\'s printer settings. Please try again in a moment.',
                    );

                    return;
                }

                if (!window.posPrint) {
                    setPrintError(
                        'Silent printing is not available in this build. Please update the desktop app.',
                    );

                    return;
                }

                setIsPrinting(true);
                setPrintError('');

                try {
                    if (documentType === 'receipt') {
                        const payload =
                            buildEscPosPayload();

                        if (!payload) {
                            setPrintError(
                                'Receipt data is not ready yet. Please try again.',
                            );

                            return;
                        }

                        if (!payload.printerName) {
                            setPrintError(
                                'No receipt printer is configured for this computer. Open Device Printer Settings and select the printer connected to this cashier PC.',
                            );

                            return;
                        }

                        /*
                         * ENGLISH / ASCII RECEIPTS
                         * ------------------------
                         * Continue using the fast raw ESC/POS path.
                         *
                         * SINHALA / UNICODE RECEIPTS
                         * --------------------------
                         * The printer's text code page cannot represent Sinhala.
                         * Chromium first shapes the Sinhala text into pixels, then
                         * main.ts prints that bitmap with legacy ESC * 24-dot
                         * graphics bands. The printer never receives Sinhala as
                         * character bytes, so code-page garbage is avoided.
                         */
                        if (receiptUsesUnicodeRendering) {
                            if (!previewRef.current) {
                                setPrintError(
                                    'Receipt preview is not ready yet. Please try again.',
                                );

                                return;
                            }

                            const receiptElements =
                                Array.from(
                                    previewRef
                                        .current
                                        .querySelectorAll<HTMLElement>(
                                            '.print-document-receipt',
                                        ),
                                );

                            if (
                                receiptElements.length
                                === 0
                            ) {
                                setPrintError(
                                    'Receipt preview could not be prepared for Unicode printing.',
                                );

                                return;
                            }

                            const paperWidthMm:
                                58 | 80 =
                                settings
                                    .receipt_paper_size
                                    === '58mm'
                                    ? 58
                                    : 80;

                            const copies =
                                Math.max(
                                    1,
                                    Math.min(
                                        3,
                                        settings
                                            .receipt_copies,
                                    ),
                                );

                            for (
                                let copyIndex = 0;
                                copyIndex < copies;
                                copyIndex += 1
                            ) {
                                const receiptElement =
                                    receiptElements[
                                    copyIndex
                                    ]
                                    ?? receiptElements[0];

                                const fullHtml =
                                    buildUnicodeThermalPrintHtml(
                                        receiptElement.outerHTML,
                                        paperWidthMm,
                                    );

                                const result =
                                    await window
                                        .posPrint
                                        .printSilently(
                                            fullHtml,
                                            {
                                                printerName:
                                                    payload
                                                        .printerName,

                                                unicodeThermalBitmap:
                                                    true,

                                                paperWidthMm,
                                            },
                                        );

                                if (!result.success) {
                                    setPrintError(
                                        result.error
                                        ?? 'Unicode receipt printing failed. Check the printer, driver and Device Printer Settings.',
                                    );

                                    return;
                                }
                            }

                            return;
                        }

                        /*
                         * Fast raw printing for receipts containing only
                         * ASCII/English text.
                         */
                        const result =
                            await window
                                .posPrint
                                .printReceiptEscPos(
                                    payload,
                                );

                        if (!result.success) {
                            setPrintError(
                                result.error
                                ?? 'Printing failed. Check that the printer is online and try again.',
                            );
                        }

                        return;
                    }

                    /*
                     * A4 invoices already use Chromium/HTML printing,
                     * therefore Sinhala and other Unicode text are
                     * preserved automatically.
                     */
                    if (!previewRef.current) {
                        setPrintError(
                            'Invoice preview is not ready yet. Please try again.',
                        );

                        return;
                    }

                    const contentHtml =
                        previewRef.current.innerHTML;

                    const fullHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8" />

                            <style>
                                @page {
                                    size: 210mm 297mm;
                                    margin: 0;
                                }

                                html,
                                body {
                                    margin: 0;
                                    padding: 0;
                                    background: #ffffff;

                                    font-family:
                                        "Noto Sans Sinhala",
                                        "Sinhala Sangam MN",
                                        "Sinhala MN",
                                        "Iskoola Pota",
                                        "Nirmala UI",
                                        "Segoe UI",
                                        Arial,
                                        Helvetica,
                                        sans-serif;

                                    -webkit-font-smoothing: antialiased;
                                    text-rendering: optimizeLegibility;
                                }
                            </style>

                            <style>
                                ${styles}
                            </style>

                            <style>
                                #sale-document-modal {
                                    position: static !important;
                                    display: block !important;
                                    width: auto !important;
                                    height: auto !important;
                                    overflow: visible !important;
                                }

                                #sale-document-modal .print-area {
                                    display: block !important;
                                    width: 100% !important;
                                    margin: 0 !important;
                                }
                            </style>
                        </head>

                        <body>
                            <div id="sale-document-modal">
                                ${contentHtml}
                            </div>
                        </body>
                        </html>
                    `;

                    const result =
                        await window
                            .posPrint
                            .printSilently(
                                fullHtml,
                                {
                                    printerName:
                                        settings
                                            .printer_name
                                        || null,
                                },
                            );

                    if (!result.success) {
                        setPrintError(
                            result.error
                            ?? 'Printing failed. Check that the printer is online and try again.',
                        );
                    }
                } catch (error) {
                    setPrintError(
                        error instanceof Error
                            ? `Unexpected error: ${error.message}`
                            : 'An unexpected error occurred while printing.',
                    );
                } finally {
                    setIsPrinting(false);
                }
            },
            [
                documentType,
                settings,
                buildEscPosPayload,
                isPrinting,
                isLoadingDevicePrinter,
                receiptUsesUnicodeRendering,
            ],
        );

    useEffect(() => {
        if (!receipt) {
            autoPrintedReceipt.current = null;
            return;
        }

        const oldOverflow =
            window.document
                .body
                .style
                .overflow;

        window.document.body.style.overflow =
            'hidden';

        const focusTimer =
            window.setTimeout(
                () => {
                    printButtonRef
                        .current
                        ?.focus();
                },
                90,
            );

        const onKeyDown = (
            event: KeyboardEvent,
        ): void => {
            if (event.key === 'Escape') {
                onClose();
            }

            if (
                (
                    event.ctrlKey
                    || event.metaKey
                )
                && event.key.toLowerCase()
                === 'p'
            ) {
                event.preventDefault();
                void runSilentPrint();
            }
        };

        window.addEventListener(
            'keydown',
            onKeyDown,
        );

        return () => {
            window.clearTimeout(focusTimer);

            window.document
                .body
                .style
                .overflow =
                oldOverflow;

            window.removeEventListener(
                'keydown',
                onKeyDown,
            );
        };
    }, [
        receipt,
        onClose,
        runSilentPrint,
    ]);

    useEffect(() => {
        if (
            !receipt
            || isLoadingSettings
            || isLoadingDevicePrinter
            || !settings.auto_print_after_sale
            || autoPrintedReceipt.current
            === receipt
        ) {
            return;
        }

        autoPrintedReceipt.current =
            receipt;

        const timer =
            window.setTimeout(
                () => {
                    void runSilentPrint();
                },
                350,
            );

        return () => {
            window.clearTimeout(timer);
        };
    }, [
        receipt,
        isLoadingSettings,
        isLoadingDevicePrinter,
        settings.auto_print_after_sale,
        runSilentPrint,
    ]);

    if (
        !receipt
        || !saleDocument
        || typeof window === 'undefined'
    ) {
        return null;
    }

    const receiptCopies =
        documentType === 'receipt'
            ? Math.max(
                1,
                Math.min(
                    3,
                    settings.receipt_copies,
                ),
            )
            : 1;

    return createPortal(
        <div id="sale-document-modal">
            <style>
                {styles}
            </style>

            <div
                className="sd-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                    if (
                        event.target
                        === event.currentTarget
                    ) {
                        onClose();
                    }
                }}
            >
                <section
                    className="sd-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="sale-document-title"
                >
                    <header className="sd-header">
                        <div className="sd-header-copy">
                            <span className="sd-kicker">
                                <Icon name="check" />

                                Sale completed
                            </span>

                            <h2
                                id="sale-document-title"
                                className="sd-title"
                            >
                                {saleDocument.saleNumber}
                            </h2>

                            <p className="sd-subtitle">
                                Review and print the
                                required sales document.
                            </p>
                        </div>

                        <div className="sd-total">
                            <span>
                                Grand Total
                            </span>

                            <strong>
                                {currencyFormatter.format(
                                    saleDocument.grandTotal,
                                )}
                            </strong>
                        </div>

                        <button
                            type="button"
                            className="sd-close"
                            aria-label="Close sale document"
                            onClick={onClose}
                        >
                            <Icon name="close" />
                        </button>
                    </header>

                    <div className="sd-toolbar">
                        <div className="sd-types">
                            <button
                                type="button"
                                className={
                                    documentType
                                        === 'receipt'
                                        ? 'sd-type active'
                                        : 'sd-type'
                                }
                                aria-pressed={
                                    documentType
                                    === 'receipt'
                                }
                                onClick={() => {
                                    setDocumentType(
                                        'receipt',
                                    );
                                }}
                            >
                                <Icon name="receipt" />

                                Thermal Receipt
                            </button>

                            <button
                                type="button"
                                className={
                                    documentType
                                        === 'invoice'
                                        ? 'sd-type active'
                                        : 'sd-type'
                                }
                                aria-pressed={
                                    documentType
                                    === 'invoice'
                                }
                                onClick={() => {
                                    setDocumentType(
                                        'invoice',
                                    );
                                }}
                            >
                                <Icon name="invoice" />

                                A4 Invoice
                            </button>
                        </div>

                        <span className="sd-format">
                            {documentType === 'receipt'
                                ? `${settings.receipt_paper_size} · ${receiptCopies} ${receiptCopies === 1
                                    ? 'copy'
                                    : 'copies'
                                } · ${receiptUsesUnicodeRendering
                                    ? 'Sinhala / Bitmap Stable'
                                    : 'ESC/POS'
                                }`
                                : 'A4 document'}
                        </span>
                    </div>

                    <div className="sd-summary">
                        <div>
                            <span>
                                Customer
                            </span>

                            <strong
                                title={
                                    saleDocument.customerName
                                }
                            >
                                {saleDocument.customerName}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Payment Status
                            </span>

                            <strong>
                                {saleDocument.paymentStatus}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Payment Method
                            </span>

                            <strong>
                                {saleDocument.paymentMethod}
                            </strong>
                        </div>
                    </div>

                    {settingsWarning && (
                        <div
                            className="sd-warning"
                            role="alert"
                        >
                            <Icon name="alert" />

                            <span>
                                {settingsWarning}
                            </span>
                        </div>
                    )}

                    {printError && (
                        <div
                            className="sd-warning"
                            role="alert"
                        >
                            <Icon name="alert" />

                            <span>
                                {printError}
                            </span>
                        </div>
                    )}

                    <div
                        className="sd-preview"
                        ref={previewRef}
                    >
                        <div
                            className={
                                documentType
                                    === 'invoice'
                                    ? 'print-area invoice'
                                    : 'print-area receipts'
                            }
                        >
                            {documentType === 'receipt'
                                ? Array.from(
                                    {
                                        length:
                                            receiptCopies,
                                    },
                                    (
                                        _,
                                        copyIndex,
                                    ) => (
                                        <ThermalReceipt
                                            key={
                                                copyIndex
                                            }
                                            settings={
                                                settings
                                            }
                                            document={
                                                saleDocument
                                            }
                                            currencyFormatter={
                                                currencyFormatter
                                            }
                                            copyIndex={
                                                copyIndex
                                            }
                                        />
                                    ),
                                )
                                : (
                                    <A4Invoice
                                        settings={
                                            settings
                                        }
                                        document={
                                            saleDocument
                                        }
                                        currencyFormatter={
                                            currencyFormatter
                                        }
                                    />
                                )}
                        </div>
                    </div>

                    <footer className="sd-actions">
                        <button
                            type="button"
                            className="sd-action sd-cancel"
                            onClick={onClose}
                        >
                            Close
                        </button>

                        <button
                            ref={printButtonRef}
                            type="button"
                            className="sd-action sd-print"
                            disabled={
                                isLoadingSettings
                                || isPrinting
                            }
                            onClick={() => {
                                void runSilentPrint();
                            }}
                        >
                            <Icon name="print" />

                            {isPrinting
                                ? 'Printing...'
                                : isLoadingSettings
                                    ? 'Loading Settings...'
                                    : documentType
                                        === 'receipt'
                                        ? 'Print Receipt'
                                        : 'Print Invoice'}
                        </button>
                    </footer>
                </section>
            </div>
        </div>,
        window.document.body,
    );
}