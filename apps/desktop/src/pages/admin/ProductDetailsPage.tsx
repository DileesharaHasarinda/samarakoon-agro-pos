import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import {
    useNavigate,
    useParams,
} from 'react-router';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    getProductDetails,
} from '../../services/productService';

import type {
    ProductBatchStatus,
    ProductDetails,
    ProductPriceOption,
} from '../../types/product';

/* =========================================================
   TYPES
   ========================================================= */

type ProductBatch =
    ProductPriceOption['batches'][number];

/* =========================================================
   FORMATTERS
   ========================================================= */

const currencyFormatter =
    new Intl.NumberFormat(
        'en-LK',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

const quantityFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        },
    );

function formatCurrency(
    value:
        | number
        | null
        | undefined,
): string {
    if (
        value === null
        || value === undefined
    ) {
        return 'Not available';
    }

    const numericValue =
        Number(value);

    if (
        !Number.isFinite(
            numericValue,
        )
    ) {
        return 'Not available';
    }

    return currencyFormatter.format(
        numericValue,
    );
}

function formatQuantity(
    value:
        | number
        | string
        | null
        | undefined,
): string {
    const numericValue =
        Number(
            value ?? 0,
        );

    if (
        !Number.isFinite(
            numericValue,
        )
    ) {
        return String(
            value ?? 0,
        );
    }

    return quantityFormatter.format(
        numericValue,
    );
}

function formatDate(
    value:
        | string
        | null
        | undefined,
): string {
    if (!value) {
        return 'Not provided';
    }

    const dateOnly =
        value.substring(
            0,
            10,
        );

    const date =
        new Date(
            `${dateOnly}T00:00:00`,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
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

function formatDateTime(
    value:
        | string
        | null
        | undefined,
): string {
    if (!value) {
        return 'Not provided';
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
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

/* =========================================================
   RUNTIME HELPERS
   ========================================================= */

function runtimeString(
    source: unknown,
    key: string,
): string | null {
    if (
        typeof source !== 'object'
        || source === null
    ) {
        return null;
    }

    const record =
        source as Record<
            string,
            unknown
        >;

    const value =
        record[key];

    if (
        typeof value !== 'string'
    ) {
        return null;
    }

    const cleaned =
        value.trim();

    return cleaned || null;
}

function runtimeNumber(
    source: unknown,
    key: string,
): number | null {
    if (
        typeof source !== 'object'
        || source === null
    ) {
        return null;
    }

    const record =
        source as Record<
            string,
            unknown
        >;

    const value =
        record[key];

    if (
        value === null
        || value === undefined
        || value === ''
    ) {
        return null;
    }

    const numericValue =
        Number(value);

    return Number.isFinite(
        numericValue,
    )
        ? numericValue
        : null;
}

function runtimeBoolean(
    source: unknown,
    key: string,
): boolean {
    if (
        typeof source !== 'object'
        || source === null
    ) {
        return false;
    }

    const record =
        source as Record<
            string,
            unknown
        >;

    const value =
        record[key];

    return (
        value === true
        || value === 1
        || value === '1'
        || value === 'true'
    );
}

/* =========================================================
   UNIT HELPERS

   IMPORTANT:
   For a dual-unit Bag -> Kg batch:
   - product.unit = Bag
   - customer can sell Bag or Kg
   - stock quantity is physically stored in Kg
   - stock_unit should therefore be Kg

   We do NOT blindly use product.unit for stock quantities.
   ========================================================= */

function isDualUnitBatch(
    batch: ProductBatch,
): boolean {
    if (
        runtimeBoolean(
            batch,
            'is_dual_unit',
        )
    ) {
        return true;
    }

    const secondaryUnit =
        runtimeString(
            batch,
            'secondary_unit',
        );

    const conversionFactor =
        runtimeNumber(
            batch,
            'conversion_factor',
        );

    return Boolean(
        secondaryUnit
        && conversionFactor
        && conversionFactor > 1,
    );
}

function getStockUnit(
    batch: ProductBatch,
    fallbackUnit: string,
): string {
    /*
     * Best source:
     * stock_batches.stock_unit
     *
     * Dual Bag -> Kg stock should contain:
     * stock_unit = Kg
     */
    const stockUnit =
        runtimeString(
            batch,
            'stock_unit',
        );

    if (stockUnit) {
        return stockUnit;
    }

    /*
     * Backward-compatible fallback.
     *
     * Some API responses may not yet include stock_unit.
     * If the batch is dual-unit, the physical quantity is
     * stored using secondary_unit.
     */
    if (
        isDualUnitBatch(
            batch,
        )
    ) {
        const secondaryUnit =
            runtimeString(
                batch,
                'secondary_unit',
            );

        if (secondaryUnit) {
            return secondaryUnit;
        }
    }

    return fallbackUnit;
}

function getPrimarySaleUnit(
    batch: ProductBatch,
    fallbackUnit: string,
): string {
    return (
        runtimeString(
            batch,
            'purchase_unit_name',
        )
        ?? fallbackUnit
    );
}

/* =========================================================
   GROUP QUANTITY HELPERS

   A product may contain:
   - normal Bag stock
   - dual-unit Kg stock

   We cannot mathematically add:
       5 Bag + 95 Kg = 100 Bag

   So we group quantities by their physical unit.
   ========================================================= */

function groupAvailableQuantity(
    batches: ProductBatch[],
    fallbackUnit: string,
): string {
    const totals =
        new Map<
            string,
            number
        >();

    batches.forEach(
        (batch) => {
            const unit =
                getStockUnit(
                    batch,
                    fallbackUnit,
                );

            const quantity =
                Number(
                    batch
                        .available_quantity
                    ?? 0,
                );

            if (
                !Number.isFinite(
                    quantity,
                )
            ) {
                return;
            }

            totals.set(
                unit,
                (
                    totals.get(
                        unit,
                    )
                    ?? 0
                )
                + quantity,
            );
        },
    );

    if (
        totals.size === 0
    ) {
        return `0 ${fallbackUnit}`;
    }

    return Array
        .from(
            totals.entries(),
        )
        .map(
            (
                [
                    unit,
                    quantity,
                ],
            ) =>
                `${formatQuantity(
                    quantity,
                )} ${unit}`,
        )
        .join(' + ');
}

function groupSaleableQuantity(
    batches: ProductBatch[],
    fallbackUnit: string,
): string {
    const totals =
        new Map<
            string,
            number
        >();

    batches.forEach(
        (batch) => {
            if (
                batch.status
                === 'expired'
                || batch.status
                === 'out_of_stock'
            ) {
                return;
            }

            const unit =
                getStockUnit(
                    batch,
                    fallbackUnit,
                );

            const quantity =
                Number(
                    batch
                        .available_quantity
                    ?? 0,
                );

            if (
                !Number.isFinite(
                    quantity,
                )
            ) {
                return;
            }

            totals.set(
                unit,
                (
                    totals.get(
                        unit,
                    )
                    ?? 0
                )
                + quantity,
            );
        },
    );

    if (
        totals.size === 0
    ) {
        return `0 ${fallbackUnit}`;
    }

    return Array
        .from(
            totals.entries(),
        )
        .map(
            (
                [
                    unit,
                    quantity,
                ],
            ) =>
                `${formatQuantity(
                    quantity,
                )} ${unit}`,
        )
        .join(' + ');
}

function groupReceivedPurchaseQuantity(
    batches: ProductBatch[],
    fallbackUnit: string,
): string {
    const totals =
        new Map<
            string,
            number
        >();

    batches.forEach(
        (batch) => {
            /*
             * Total Received should use the PURCHASE unit,
             * not the physical stock unit.
             *
             * Example:
             *
             * received_purchase_quantity = 1
             * primary_unit = Bag
             *
             * Even though physical stock received was:
             * 100 Kg
             */
            const unit =
                batch.primary_unit
                || batch.purchase_unit_name
                || fallbackUnit;

            const quantity =
                Number(
                    batch.received_purchase_quantity
                    ?? batch.purchased_quantity
                    ?? 0,
                );

            if (
                !Number.isFinite(
                    quantity,
                )
            ) {
                return;
            }

            totals.set(
                unit,
                (
                    totals.get(
                        unit,
                    )
                    ?? 0
                )
                + quantity,
            );
        },
    );

    if (
        totals.size === 0
    ) {
        return `0 ${fallbackUnit}`;
    }

    return Array
        .from(
            totals.entries(),
        )
        .map(
            (
                [
                    unit,
                    quantity,
                ],
            ) =>
                `${formatQuantity(
                    quantity,
                )} ${unit}`,
        )
        .join(' + ');
}

function groupExpiredQuantity(
    batches: ProductBatch[],
    fallbackUnit: string,
): string {
    const totals =
        new Map<
            string,
            number
        >();

    batches.forEach(
        (batch) => {
            if (
                batch.status
                !== 'expired'
            ) {
                return;
            }

            const unit =
                getStockUnit(
                    batch,
                    fallbackUnit,
                );

            const quantity =
                Number(
                    batch
                        .available_quantity
                    ?? 0,
                );

            if (
                !Number.isFinite(
                    quantity,
                )
            ) {
                return;
            }

            totals.set(
                unit,
                (
                    totals.get(
                        unit,
                    )
                    ?? 0
                )
                + quantity,
            );
        },
    );

    if (
        totals.size === 0
    ) {
        return `0 ${fallbackUnit}`;
    }

    return Array
        .from(
            totals.entries(),
        )
        .map(
            (
                [
                    unit,
                    quantity,
                ],
            ) =>
                `${formatQuantity(
                    quantity,
                )} ${unit}`,
        )
        .join(' + ');
}

/* =========================================================
   STATUS
   ========================================================= */

function getStatusLabel(
    status:
        ProductBatchStatus,
): string {
    switch (status) {
        case 'expiring_soon':
            return 'Expiring Soon';

        case 'expired':
            return 'Expired';

        case 'out_of_stock':
            return 'Out of Stock';

        case 'available':
        default:
            return 'Available';
    }
}

function getStatusClass(
    status:
        ProductBatchStatus,
): string {
    return (
        `pdp-status pdp-status-${status}`
    );
}

/* =========================================================
   ICONS
   ========================================================= */

type IconName =
    | 'alert'
    | 'arrow-left'
    | 'barcode'
    | 'box'
    | 'calendar'
    | 'category'
    | 'close'
    | 'eye'
    | 'layers'
    | 'money'
    | 'refresh'
    | 'stock'
    | 'tag'
    | 'truck';

interface IconProps {
    name: IconName;
    className?: string;
}

function Icon({
    name,
    className = '',
}: IconProps) {
    const props = {
        className,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap:
            'round' as const,
        strokeLinejoin:
            'round' as const,
        'aria-hidden':
            true,
        focusable:
            false,
    };

    switch (name) {
        case 'alert':
            return (
                <svg {...props}>
                    <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                </svg>
            );

        case 'arrow-left':
            return (
                <svg {...props}>
                    <path d="m15 18-6-6 6-6" />
                </svg>
            );

        case 'barcode':
            return (
                <svg {...props}>
                    <path d="M3 5v14" />
                    <path d="M7 5v14" />
                    <path d="M11 5v14" />
                    <path d="M15 5v14" />
                    <path d="M19 5v14" />
                    <path d="M21 5v14" />
                </svg>
            );

        case 'calendar':
            return (
                <svg {...props}>
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="16"
                        rx="2"
                    />

                    <path d="M16 3v4" />
                    <path d="M8 3v4" />
                    <path d="M3 11h18" />
                </svg>
            );

        case 'category':
            return (
                <svg {...props}>
                    <rect
                        x="3"
                        y="3"
                        width="7"
                        height="7"
                        rx="1"
                    />

                    <rect
                        x="14"
                        y="3"
                        width="7"
                        height="7"
                        rx="1"
                    />

                    <rect
                        x="3"
                        y="14"
                        width="7"
                        height="7"
                        rx="1"
                    />

                    <rect
                        x="14"
                        y="14"
                        width="7"
                        height="7"
                        rx="1"
                    />
                </svg>
            );

        case 'close':
            return (
                <svg {...props}>
                    <path d="m6 6 12 12" />
                    <path d="m18 6-12 12" />
                </svg>
            );

        case 'eye':
            return (
                <svg {...props}>
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />

                    <circle
                        cx="12"
                        cy="12"
                        r="2.5"
                    />
                </svg>
            );

        case 'layers':
            return (
                <svg {...props}>
                    <path d="m12 2 9 5-9 5-9-5 9-5Z" />
                    <path d="m3 12 9 5 9-5" />
                    <path d="m3 17 9 5 9-5" />
                </svg>
            );

        case 'money':
            return (
                <svg {...props}>
                    <rect
                        x="3"
                        y="6"
                        width="18"
                        height="12"
                        rx="2"
                    />

                    <path d="M7 10h.01" />
                    <path d="M17 14h.01" />
                    <path d="M12 9v6" />
                </svg>
            );

        case 'refresh':
            return (
                <svg {...props}>
                    <path d="M20 11a8 8 0 1 0 2 5" />
                    <path d="M20 4v7h-7" />
                </svg>
            );

        case 'stock':
            return (
                <svg {...props}>
                    <path d="M4 20V8l8-4 8 4v12" />
                    <path d="M8 20v-7h8v7" />
                    <path d="M2 20h20" />
                </svg>
            );

        case 'tag':
            return (
                <svg {...props}>
                    <path d="M20 13 11 22l-9-9V2h11l7 7a3 3 0 0 1 0 4Z" />
                    <path d="M7 7h.01" />
                </svg>
            );

        case 'truck':
            return (
                <svg {...props}>
                    <path d="M3 6h11v10H3Z" />
                    <path d="M14 10h4l3 3v3h-7Z" />

                    <circle
                        cx="7"
                        cy="18"
                        r="2"
                    />

                    <circle
                        cx="18"
                        cy="18"
                        r="2"
                    />
                </svg>
            );

        case 'box':
        default:
            return (
                <svg {...props}>
                    <path d="m21 8-9 5-9-5 9-5 9 5Z" />
                    <path d="m3 8 9 5 9-5" />
                    <path d="M3 8v8l9 5 9-5V8" />
                    <path d="M12 13v8" />
                </svg>
            );
    }
}

/* =========================================================
   STYLES
   ========================================================= */

const pageStyles = `
#product-details-page,
#product-details-page *,
#product-details-page *::before,
#product-details-page *::after,
#product-batch-details-modal,
#product-batch-details-modal *,
#product-batch-details-modal *::before,
#product-batch-details-modal *::after {
    box-sizing: border-box !important;
}

#product-details-page,
#product-batch-details-modal {
    --pdp-green-950: #052e16;
    --pdp-green-900: #14532d;
    --pdp-green-800: #166534;
    --pdp-green-700: #15803d;
    --pdp-green-600: #16a34a;
    --pdp-green-100: #dcfce7;
    --pdp-green-50: #f0fdf4;

    --pdp-blue-800: #1849a9;
    --pdp-blue-700: #175cd3;
    --pdp-blue-100: #d1e9ff;
    --pdp-blue-50: #eff8ff;

    --pdp-amber-800: #93370d;
    --pdp-amber-700: #b54708;
    --pdp-amber-50: #fffaeb;

    --pdp-red-800: #912018;
    --pdp-red-700: #b42318;
    --pdp-red-50: #fef3f2;

    --pdp-text: #101828;
    --pdp-text-2: #344054;
    --pdp-text-3: #475467;
    --pdp-muted: #667085;

    --pdp-border: #d0d9d2;
    --pdp-border-soft: #e5ebe6;
    --pdp-border-strong: #aebdb2;

    --pdp-white: #ffffff;
    --pdp-soft: #f8faf9;
    --pdp-page: #f4f7f5;

    color: var(--pdp-text) !important;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif !important;

    -webkit-font-smoothing: antialiased !important;
}

#product-details-page {
    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;

    flex-direction: column !important;

    gap: 16px !important;

    margin: 0 !important;
    padding: 0 4px 28px !important;

    overflow-x: hidden !important;

    font-size: 14px !important;
    line-height: 1.5 !important;

    background: transparent !important;

    isolation: isolate !important;
}

#product-details-page button,
#product-batch-details-modal button {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#product-details-page h1,
#product-details-page h2,
#product-details-page h3,
#product-details-page p,
#product-batch-details-modal h2,
#product-batch-details-modal h3,
#product-batch-details-modal p {
    margin: 0 !important;
}

/* =========================================================
   BUTTONS
   ========================================================= */

#product-details-page .pdp-button {
    display: inline-flex !important;

    min-height: 40px !important;

    align-items: center !important;
    justify-content: center !important;

    gap: 7px !important;

    padding: 7px 12px !important;

    color: var(--pdp-text-2) !important;

    font-size: 13px !important;
    font-weight: 750 !important;

    white-space: nowrap !important;

    background: #ffffff !important;

    border: 1px solid var(--pdp-border-strong) !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#product-details-page .pdp-button:hover:not(:disabled) {
    color: var(--pdp-green-900) !important;

    background: var(--pdp-green-50) !important;

    border-color: #94cda5 !important;
}

#product-details-page .pdp-button:disabled {
    opacity: 0.55 !important;

    cursor: not-allowed !important;
}

#product-details-page .pdp-button svg {
    width: 17px !important;
    height: 17px !important;

    flex: 0 0 17px !important;
}

#product-details-page .pdp-view-button {
    width: 100% !important;

    min-height: 36px !important;

    padding: 6px 9px !important;

    color: var(--pdp-blue-700) !important;

    font-size: 11px !important;
    font-weight: 800 !important;

    background: var(--pdp-blue-50) !important;

    border: 1px solid #b7d6fb !important;

    border-radius: 7px !important;
}

#product-details-page .pdp-view-button:hover {
    color: #ffffff !important;

    background: var(--pdp-blue-700) !important;

    border-color: var(--pdp-blue-700) !important;
}

/* =========================================================
   TOP
   ========================================================= */

#product-details-page .pdp-top-row {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;

    gap: 12px !important;
}

#product-details-page .pdp-product-id {
    color: var(--pdp-muted) !important;

    font-size: 12px !important;
    font-weight: 650 !important;
}

/* =========================================================
   HERO
   ========================================================= */

#product-details-page .pdp-hero {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        auto !important;

    align-items: center !important;

    gap: 20px !important;

    padding: 19px 21px !important;

    background:
        linear-gradient(
            135deg,
            #ffffff 0%,
            #ffffff 65%,
            #f0faf3 100%
        ) !important;

    border:
        1px solid
        var(--pdp-border) !important;

    border-left:
        5px solid
        var(--pdp-green-700) !important;

    border-radius: 14px !important;

    box-shadow:
        0 1px 3px
        rgba(16, 24, 40, 0.06) !important;
}

#product-details-page .pdp-hero-main {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;

    gap: 14px !important;
}

#product-details-page .pdp-product-icon {
    display: grid !important;

    width: 54px !important;
    height: 54px !important;

    min-width: 54px !important;

    place-items: center !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            145deg,
            var(--pdp-green-950),
            var(--pdp-green-700)
        ) !important;

    border-radius: 12px !important;
}

#product-details-page .pdp-product-icon svg {
    width: 25px !important;
    height: 25px !important;
}

#product-details-page .pdp-hero-copy {
    min-width: 0 !important;
}

#product-details-page .pdp-eyebrow {
    display: block !important;

    margin-bottom: 2px !important;

    color: var(--pdp-green-700) !important;

    font-size: 11px !important;
    font-weight: 800 !important;

    letter-spacing: 0.05em !important;

    text-transform: uppercase !important;
}

#product-details-page .pdp-title {
    overflow: hidden !important;

    color: var(--pdp-text) !important;

    font-size: 25px !important;
    font-weight: 850 !important;

    line-height: 1.2 !important;

    letter-spacing: -0.02em !important;

    text-overflow: ellipsis !important;

    white-space: nowrap !important;
}

#product-details-page .pdp-meta-list {
    display: flex !important;

    flex-wrap: wrap !important;

    gap: 6px !important;

    margin-top: 7px !important;
}

#product-details-page .pdp-meta-chip {
    display: inline-flex !important;

    min-height: 27px !important;

    align-items: center !important;

    gap: 5px !important;

    padding: 4px 8px !important;

    color: var(--pdp-text-2) !important;

    font-size: 11px !important;
    font-weight: 650 !important;

    background: #ffffff !important;

    border:
        1px solid
        #dfe6e1 !important;

    border-radius: 999px !important;
}

#product-details-page .pdp-meta-chip svg {
    width: 13px !important;
    height: 13px !important;

    color: var(--pdp-green-700) !important;
}

#product-details-page .pdp-product-status {
    display: inline-flex !important;

    min-height: 35px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 6px 10px !important;

    font-size: 11px !important;
    font-weight: 800 !important;

    white-space: nowrap !important;

    border-radius: 999px !important;
}

#product-details-page .pdp-product-status.active {
    color: var(--pdp-green-900) !important;

    background: var(--pdp-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;
}

#product-details-page .pdp-product-status.inactive {
    color: var(--pdp-amber-800) !important;

    background: var(--pdp-amber-50) !important;

    border:
        1px solid
        #efd696 !important;
}

/* =========================================================
   SUMMARY
   ========================================================= */

#product-details-page .pdp-summary-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            4,
            minmax(0, 1fr)
        ) !important;

    gap: 10px !important;
}

#product-details-page .pdp-summary-card {
    position: relative !important;

    display: flex !important;

    min-width: 0 !important;
    min-height: 96px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 3px !important;

    padding:
        13px
        14px
        13px
        18px !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--pdp-border) !important;

    border-radius: 10px !important;

    box-shadow:
        0 1px 2px
        rgba(16, 24, 40, 0.04) !important;
}

#product-details-page .pdp-summary-card::before {
    position: absolute !important;

    inset:
        0
        auto
        0
        0 !important;

    width: 4px !important;

    content: "" !important;

    background: var(--pdp-green-700) !important;
}

#product-details-page .pdp-summary-card.blue::before {
    background: var(--pdp-blue-700) !important;
}

#product-details-page .pdp-summary-card.amber::before {
    background: var(--pdp-amber-700) !important;
}

#product-details-page .pdp-summary-label {
    color: var(--pdp-muted) !important;

    font-size: 9px !important;
    font-weight: 800 !important;

    letter-spacing: 0.04em !important;

    text-transform: uppercase !important;
}

#product-details-page .pdp-summary-value {
    overflow-wrap: anywhere !important;

    color: var(--pdp-green-900) !important;

    font-size: 18px !important;
    font-weight: 850 !important;

    line-height: 1.25 !important;
}

#product-details-page .pdp-summary-card.blue .pdp-summary-value {
    color: var(--pdp-blue-700) !important;
}

#product-details-page .pdp-summary-card.amber .pdp-summary-value {
    color: var(--pdp-amber-800) !important;
}

/* =========================================================
   PANEL
   ========================================================= */

#product-details-page .pdp-panel {
    min-width: 0 !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--pdp-border) !important;

    border-radius: 11px !important;

    box-shadow:
        0 1px 3px
        rgba(16, 24, 40, 0.05) !important;
}

#product-details-page .pdp-panel-heading {
    display: flex !important;

    align-items: flex-start !important;
    justify-content: space-between !important;

    gap: 12px !important;

    padding: 14px 15px !important;

    background: #ffffff !important;

    border-bottom:
        1px solid
        var(--pdp-border-soft) !important;
}

#product-details-page .pdp-panel-title {
    color: var(--pdp-text) !important;

    font-size: 16px !important;
    font-weight: 800 !important;
}

#product-details-page .pdp-panel-description {
    margin-top: 3px !important;

    color: var(--pdp-muted) !important;

    font-size: 11px !important;
}

#product-details-page .pdp-panel-badges {
    display: flex !important;

    align-items: center !important;

    flex-wrap: wrap !important;

    gap: 6px !important;
}

#product-details-page .pdp-count-badge {
    display: inline-flex !important;

    min-height: 28px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 4px 8px !important;

    color: var(--pdp-green-900) !important;

    font-size: 10px !important;
    font-weight: 800 !important;

    white-space: nowrap !important;

    background: var(--pdp-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 999px !important;
}

#product-details-page .pdp-count-badge.blue {
    color: var(--pdp-blue-700) !important;

    background: var(--pdp-blue-50) !important;

    border-color: #bddaff !important;
}

/* =========================================================
   PRODUCT INFO + STOCK OVERVIEW
   ========================================================= */

#product-details-page .pdp-upper-info-grid {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1.3fr)
        minmax(0, 1fr) !important;

    align-items: stretch !important;

    gap: 12px !important;
}

#product-details-page .pdp-info-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            3,
            minmax(0, 1fr)
        ) !important;

    gap: 1px !important;

    background: var(--pdp-border-soft) !important;
}

#product-details-page .pdp-info-item {
    display: flex !important;

    min-width: 0 !important;
    min-height: 65px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 3px !important;

    padding: 10px 11px !important;

    background: #ffffff !important;
}

#product-details-page .pdp-info-label {
    color: var(--pdp-muted) !important;

    font-size: 8px !important;
    font-weight: 800 !important;

    letter-spacing: 0.04em !important;

    text-transform: uppercase !important;
}

#product-details-page .pdp-info-value {
    overflow: hidden !important;

    color: var(--pdp-text-2) !important;

    font-size: 11px !important;
    font-weight: 750 !important;

    line-height: 1.35 !important;

    text-overflow: ellipsis !important;

    white-space: nowrap !important;
}

#product-details-page .pdp-overview-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            2,
            minmax(0, 1fr)
        ) !important;

    gap: 8px !important;

    padding: 11px !important;
}

#product-details-page .pdp-overview-card {
    display: flex !important;

    min-width: 0 !important;
    min-height: 66px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 3px !important;

    padding: 9px 10px !important;

    background: var(--pdp-soft) !important;

    border:
        1px solid
        var(--pdp-border-soft) !important;

    border-radius: 8px !important;
}

#product-details-page .pdp-overview-card.highlight {
    background: var(--pdp-green-50) !important;

    border-color: #b8dfc3 !important;
}

#product-details-page .pdp-overview-card span {
    color: var(--pdp-muted) !important;

    font-size: 9px !important;
    font-weight: 700 !important;
}

#product-details-page .pdp-overview-card strong {
    overflow-wrap: anywhere !important;

    color: var(--pdp-text) !important;

    font-size: 12px !important;
    font-weight: 850 !important;
}

#product-details-page .pdp-overview-card.highlight strong {
    color: var(--pdp-green-900) !important;

    font-size: 13px !important;
}

/* =========================================================
   STOCK LIST
   ========================================================= */

#product-details-page .pdp-stock-list {
    padding: 12px !important;

    background: var(--pdp-page) !important;
}

#product-details-page .pdp-stock-grid {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1.35fr)
        minmax(0, 0.75fr)
        minmax(0, 0.9fr)
        minmax(0, 0.9fr)
        minmax(0, 0.78fr)
        minmax(0, 0.92fr)
        minmax(0, 1.05fr)
        112px !important;

    align-items: center !important;

    column-gap: 10px !important;
}

#product-details-page .pdp-stock-header {
    min-height: 42px !important;

    padding: 8px 12px !important;

    color: var(--pdp-text-2) !important;

    font-size: 9px !important;
    font-weight: 800 !important;

    letter-spacing: 0.035em !important;

    text-transform: uppercase !important;

    background: #eef3ef !important;

    border:
        1px solid
        #d7e0d9 !important;

    border-radius:
        8px
        8px
        0
        0 !important;
}

#product-details-page .pdp-stock-rows {
    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        #d7e0d9 !important;

    border-top: 0 !important;

    border-radius:
        0
        0
        8px
        8px !important;
}

#product-details-page .pdp-stock-row {
    min-height: 66px !important;

    padding: 9px 12px !important;

    background: #ffffff !important;

    border-bottom:
        1px solid
        #e7ece8 !important;

    transition:
        background
        120ms ease !important;
}

#product-details-page .pdp-stock-row:last-child {
    border-bottom: 0 !important;
}

#product-details-page .pdp-stock-row:hover {
    background: #f9fcfa !important;
}

#product-details-page .pdp-stock-cell {
    min-width: 0 !important;
}

#product-details-page .pdp-cell-label {
    display: none !important;

    color: var(--pdp-muted) !important;

    font-size: 8px !important;
    font-weight: 800 !important;

    text-transform: uppercase !important;
}

#product-details-page .pdp-cell-text {
    display: block !important;

    overflow: hidden !important;

    color: var(--pdp-text-2) !important;

    font-size: 11px !important;
    font-weight: 700 !important;

    line-height: 1.35 !important;

    text-overflow: ellipsis !important;

    white-space: nowrap !important;
}

#product-details-page .pdp-reference {
    display: block !important;

    overflow: hidden !important;

    color: var(--pdp-text) !important;

    font-size: 11px !important;
    font-weight: 850 !important;

    text-overflow: ellipsis !important;

    white-space: nowrap !important;
}

#product-details-page .pdp-reference-sub {
    display: block !important;

    margin-top: 2px !important;

    overflow: hidden !important;

    color: var(--pdp-muted) !important;

    font-size: 9px !important;
    font-weight: 600 !important;

    text-overflow: ellipsis !important;

    white-space: nowrap !important;
}

#product-details-page .pdp-cost {
    color: var(--pdp-blue-700) !important;

    font-size: 11px !important;
    font-weight: 800 !important;
}

#product-details-page .pdp-selling {
    color: var(--pdp-green-900) !important;

    font-size: 12px !important;
    font-weight: 850 !important;
}

#product-details-page .pdp-stock-quantity {
    color: var(--pdp-green-900) !important;

    font-size: 12px !important;
    font-weight: 850 !important;
}

#product-details-page .pdp-price-unit {
    display: block !important;

    margin-top: 2px !important;

    color: var(--pdp-muted) !important;

    font-size: 8px !important;
    font-weight: 650 !important;
}

/* =========================================================
   STATUS
   ========================================================= */

#product-details-page .pdp-status,
#product-batch-details-modal .pdp-status {
    display: inline-flex !important;

    min-height: 25px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 3px 7px !important;

    font-size: 9px !important;
    font-weight: 800 !important;

    white-space: nowrap !important;

    border-radius: 999px !important;
}

#product-details-page .pdp-status-available,
#product-batch-details-modal .pdp-status-available {
    color: var(--pdp-green-900) !important;

    background: var(--pdp-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;
}

#product-details-page .pdp-status-expiring_soon,
#product-batch-details-modal .pdp-status-expiring_soon {
    color: var(--pdp-amber-800) !important;

    background: var(--pdp-amber-50) !important;

    border:
        1px solid
        #efd696 !important;
}

#product-details-page .pdp-status-expired,
#product-details-page .pdp-status-out_of_stock,
#product-batch-details-modal .pdp-status-expired,
#product-batch-details-modal .pdp-status-out_of_stock {
    color: var(--pdp-red-700) !important;

    background: var(--pdp-red-50) !important;

    border:
        1px solid
        #efbbb6 !important;
}

/* =========================================================
   AUDIT
   ========================================================= */

#product-details-page .pdp-audit {
    display: grid !important;

    grid-template-columns:
        repeat(
            2,
            minmax(0, 1fr)
        ) !important;

    gap: 1px !important;

    overflow: hidden !important;

    background: var(--pdp-border) !important;

    border:
        1px solid
        var(--pdp-border) !important;

    border-radius: 9px !important;
}

#product-details-page .pdp-audit-item {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;

    gap: 10px !important;

    min-width: 0 !important;

    padding: 9px 11px !important;

    background: #ffffff !important;
}

#product-details-page .pdp-audit-item span {
    color: var(--pdp-muted) !important;

    font-size: 9px !important;
    font-weight: 700 !important;
}

#product-details-page .pdp-audit-item strong {
    color: var(--pdp-text-2) !important;

    font-size: 9px !important;
    font-weight: 750 !important;

    text-align: right !important;
}

/* =========================================================
   STATE
   ========================================================= */

#product-details-page .pdp-state {
    display: flex !important;

    min-height: 280px !important;

    align-items: center !important;
    justify-content: center !important;

    flex-direction: column !important;

    gap: 8px !important;

    padding: 28px !important;

    color: var(--pdp-muted) !important;

    text-align: center !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--pdp-border) !important;

    border-radius: 12px !important;
}

#product-details-page .pdp-state.error {
    color: var(--pdp-red-700) !important;

    background: var(--pdp-red-50) !important;

    border-color: #efbbb6 !important;
}

#product-details-page .pdp-state-icon {
    display: grid !important;

    width: 50px !important;
    height: 50px !important;

    place-items: center !important;

    color: var(--pdp-green-700) !important;

    background: var(--pdp-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 12px !important;
}

#product-details-page .pdp-state-icon svg {
    width: 24px !important;
    height: 24px !important;
}

#product-details-page .pdp-state-title {
    color: inherit !important;

    font-size: 17px !important;
    font-weight: 800 !important;
}

#product-details-page .pdp-state-message {
    max-width: 470px !important;

    color: inherit !important;

    font-size: 12px !important;
}

#product-details-page .pdp-state-actions {
    display: flex !important;

    align-items: center !important;
    justify-content: center !important;

    gap: 8px !important;

    margin-top: 4px !important;
}

#product-details-page .pdp-spinner {
    width: 38px !important;
    height: 38px !important;

    border:
        4px solid
        var(--pdp-green-100) !important;

    border-top-color:
        var(--pdp-green-700) !important;

    border-radius: 50% !important;

    animation:
        pdp-spin
        700ms
        linear
        infinite !important;
}

@keyframes pdp-spin {
    to {
        transform: rotate(360deg);
    }
}

/* =========================================================
   MODAL
   ========================================================= */

#product-batch-details-modal {
    position: fixed !important;

    inset: 0 !important;

    z-index: 2147483000 !important;

    display: flex !important;

    width: 100vw !important;
    height: 100dvh !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 22px !important;

    background:
        rgba(
            7,
            20,
            12,
            0.72
        ) !important;

    backdrop-filter: blur(5px) !important;
}

#product-batch-details-modal .pdm-dialog {
    display: flex !important;

    width:
        min(
            960px,
            100%
        ) !important;

    max-height:
        calc(
            100dvh - 44px
        ) !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        #d6e0d8 !important;

    border-radius: 17px !important;

    box-shadow:
        0 28px 90px
        rgba(
            0,
            0,
            0,
            0.38
        ) !important;
}

#product-batch-details-modal .pdm-header {
    display: flex !important;

    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: space-between !important;

    gap: 18px !important;

    padding: 17px 19px !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            #052e16,
            #166534,
            #15803d
        ) !important;
}

#product-batch-details-modal .pdm-header-main {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;

    gap: 12px !important;
}

#product-batch-details-modal .pdm-header-icon {
    display: grid !important;

    width: 43px !important;
    height: 43px !important;

    min-width: 43px !important;

    place-items: center !important;

    color: var(--pdp-green-900) !important;

    background: #ffffff !important;

    border-radius: 10px !important;
}

#product-batch-details-modal .pdm-header-icon svg {
    width: 21px !important;
    height: 21px !important;
}

#product-batch-details-modal .pdm-header-copy {
    min-width: 0 !important;
}

#product-batch-details-modal .pdm-kicker {
    display: block !important;

    color:
        rgba(
            255,
            255,
            255,
            0.72
        ) !important;

    font-size: 10px !important;
    font-weight: 800 !important;

    letter-spacing: 0.05em !important;

    text-transform: uppercase !important;
}

#product-batch-details-modal .pdm-title {
    margin-top: 2px !important;

    overflow: hidden !important;

    color: #ffffff !important;

    font-size: 19px !important;
    font-weight: 850 !important;

    text-overflow: ellipsis !important;

    white-space: nowrap !important;
}

#product-batch-details-modal .pdm-product-name {
    display: block !important;

    margin-top: 2px !important;

    overflow: hidden !important;

    color:
        rgba(
            255,
            255,
            255,
            0.78
        ) !important;

    font-size: 11px !important;
    font-weight: 600 !important;

    text-overflow: ellipsis !important;

    white-space: nowrap !important;
}

#product-batch-details-modal .pdm-close {
    display: grid !important;

    width: 40px !important;
    height: 40px !important;

    min-width: 40px !important;

    place-items: center !important;

    padding: 0 !important;

    color: #ffffff !important;

    background:
        rgba(
            255,
            255,
            255,
            0.12
        ) !important;

    border:
        1px solid
        rgba(
            255,
            255,
            255,
            0.24
        ) !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#product-batch-details-modal .pdm-close svg {
    width: 18px !important;
    height: 18px !important;
}

#product-batch-details-modal .pdm-body {
    min-height: 0 !important;

    flex: 1 !important;

    padding: 16px !important;

    overflow-y: auto !important;

    background: #f4f7f5 !important;
}

#product-batch-details-modal .pdm-summary {
    display: grid !important;

    grid-template-columns:
        repeat(
            4,
            minmax(0, 1fr)
        ) !important;

    gap: 9px !important;

    margin-bottom: 13px !important;
}

#product-batch-details-modal .pdm-summary-card {
    display: flex !important;

    min-width: 0 !important;
    min-height: 81px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 3px !important;

    padding: 11px 12px !important;

    background: #ffffff !important;

    border:
        1px solid
        #d7e1d9 !important;

    border-radius: 9px !important;
}

#product-batch-details-modal .pdm-summary-card.green {
    background: var(--pdp-green-50) !important;

    border-color: #b8dfc3 !important;
}

#product-batch-details-modal .pdm-summary-card.blue {
    background: var(--pdp-blue-50) !important;

    border-color: #bddaff !important;
}

#product-batch-details-modal .pdm-summary-label {
    color: var(--pdp-muted) !important;

    font-size: 8px !important;
    font-weight: 800 !important;

    text-transform: uppercase !important;
}

#product-batch-details-modal .pdm-summary-value {
    overflow-wrap: anywhere !important;

    color: var(--pdp-text) !important;

    font-size: 15px !important;
    font-weight: 850 !important;
}

#product-batch-details-modal .pdm-summary-card.green .pdm-summary-value {
    color: var(--pdp-green-900) !important;
}

#product-batch-details-modal .pdm-summary-card.blue .pdm-summary-value {
    color: var(--pdp-blue-700) !important;
}

#product-batch-details-modal .pdm-summary-help {
    color: var(--pdp-muted) !important;

    font-size: 8px !important;
    font-weight: 650 !important;
}

#product-batch-details-modal .pdm-section {
    overflow: hidden !important;

    margin-top: 11px !important;

    background: #ffffff !important;

    border:
        1px solid
        #d7e1d9 !important;

    border-radius: 10px !important;
}

#product-batch-details-modal .pdm-section-header {
    display: flex !important;

    align-items: center !important;

    gap: 8px !important;

    padding: 10px 12px !important;

    background: #f8faf9 !important;

    border-bottom:
        1px solid
        #e3e9e4 !important;
}

#product-batch-details-modal .pdm-section-header svg {
    width: 17px !important;
    height: 17px !important;

    color: var(--pdp-green-700) !important;
}

#product-batch-details-modal .pdm-section-title {
    color: var(--pdp-text) !important;

    font-size: 12px !important;
    font-weight: 850 !important;
}

#product-batch-details-modal .pdm-detail-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            4,
            minmax(0, 1fr)
        ) !important;

    gap: 1px !important;

    background: #e7ece8 !important;
}

#product-batch-details-modal .pdm-detail-item {
    display: flex !important;

    min-width: 0 !important;
    min-height: 68px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 3px !important;

    padding: 10px 11px !important;

    background: #ffffff !important;
}

#product-batch-details-modal .pdm-detail-item.wide {
    grid-column:
        1 / -1 !important;
}

#product-batch-details-modal .pdm-detail-label {
    color: var(--pdp-muted) !important;

    font-size: 8px !important;
    font-weight: 800 !important;

    text-transform: uppercase !important;
}

#product-batch-details-modal .pdm-detail-value {
    overflow-wrap: anywhere !important;

    color: var(--pdp-text-2) !important;

    font-size: 11px !important;
    font-weight: 750 !important;

    line-height: 1.4 !important;
}

#product-batch-details-modal .pdm-notes {
    min-height: 58px !important;

    padding: 11px 12px !important;

    color: var(--pdp-text-2) !important;

    font-size: 11px !important;
    font-weight: 650 !important;

    line-height: 1.55 !important;

    background: #ffffff !important;
}

#product-batch-details-modal .pdm-footer {
    display: flex !important;

    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: flex-end !important;

    padding: 12px 16px !important;

    background: #ffffff !important;

    border-top:
        1px solid
        #dfe6e1 !important;
}

#product-batch-details-modal .pdm-footer-button {
    display: inline-flex !important;

    min-height: 40px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 8px 17px !important;

    color: #ffffff !important;

    font-size: 12px !important;
    font-weight: 800 !important;

    background: var(--pdp-green-700) !important;

    border:
        1px solid
        var(--pdp-green-700) !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

/* =========================================================
   RESPONSIVE
   ========================================================= */

@media (max-width: 1100px) {
    #product-details-page .pdp-upper-info-grid {
        grid-template-columns:
            1fr !important;
    }

    #product-details-page .pdp-stock-grid {
        grid-template-columns:
            minmax(0, 1.25fr)
            minmax(0, 0.7fr)
            minmax(0, 0.8fr)
            minmax(0, 0.8fr)
            minmax(0, 0.7fr)
            minmax(0, 0.8fr)
            minmax(0, 1fr)
            100px !important;

        column-gap: 7px !important;
    }

    #product-batch-details-modal .pdm-detail-grid {
        grid-template-columns:
            repeat(
                3,
                minmax(0, 1fr)
            ) !important;
    }
}

@media (max-width: 900px) {
    #product-details-page .pdp-summary-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #product-details-page .pdp-stock-header {
        display: none !important;
    }

    #product-details-page .pdp-stock-rows {
        display: grid !important;

        gap: 8px !important;

        padding: 8px !important;

        background: transparent !important;

        border: 0 !important;
    }

    #product-details-page .pdp-stock-row {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;

        row-gap: 10px !important;

        min-height: 0 !important;

        padding: 12px !important;

        border:
            1px solid
            #d7e0d9 !important;

        border-radius: 9px !important;
    }

    #product-details-page .pdp-cell-label {
        display: block !important;

        margin-bottom: 2px !important;
    }

    #product-details-page .pdp-stock-cell.action {
        grid-column:
            1 / -1 !important;
    }

    #product-batch-details-modal .pdm-summary {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #product-batch-details-modal .pdm-detail-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }
}

@media (max-width: 700px) {
    #product-details-page .pdp-top-row {
        align-items: stretch !important;

        flex-direction: column !important;
    }

    #product-details-page .pdp-button {
        width: 100% !important;
    }

    #product-details-page .pdp-product-id {
        text-align: center !important;
    }

    #product-details-page .pdp-hero {
        grid-template-columns:
            1fr !important;
    }

    #product-details-page .pdp-title {
        white-space: normal !important;
    }

    #product-details-page .pdp-product-status {
        width: 100% !important;
    }

    #product-details-page .pdp-panel-heading {
        flex-direction: column !important;
    }

    #product-details-page .pdp-info-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #product-batch-details-modal {
        align-items: flex-end !important;

        padding: 0 !important;
    }

    #product-batch-details-modal .pdm-dialog {
        width: 100% !important;

        max-height: 94dvh !important;

        border-radius:
            16px
            16px
            0
            0 !important;
    }
}

@media (max-width: 520px) {
    #product-details-page .pdp-summary-grid,
    #product-details-page .pdp-info-grid,
    #product-details-page .pdp-overview-grid,
    #product-details-page .pdp-stock-row {
        grid-template-columns:
            1fr !important;
    }

    #product-details-page .pdp-stock-cell.action {
        grid-column: auto !important;
    }

    #product-details-page .pdp-hero-main {
        align-items: flex-start !important;

        flex-direction: column !important;
    }

    #product-batch-details-modal .pdm-summary,
    #product-batch-details-modal .pdm-detail-grid {
        grid-template-columns:
            1fr !important;
    }
}
`;

/* =========================================================
   COMPONENT
   ========================================================= */

export default function ProductDetailsPage() {
    const navigate =
        useNavigate();

    const {
        productId,
    } =
        useParams<{
            productId: string;
        }>();

    const {
        token,
    } =
        useAuth();

    const requestIdRef =
        useRef(0);

    const [
        product,
        setProduct,
    ] =
        useState<
            ProductDetails
            | null
        >(
            null,
        );

    const [
        isLoading,
        setIsLoading,
    ] =
        useState(
            true,
        );

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState(
            '',
        );

    const [
        selectedBatch,
        setSelectedBatch,
    ] =
        useState<
            ProductBatch
            | null
        >(
            null,
        );

    const numericProductId =
        Number(
            productId,
        );

    /* =====================================================
       LOAD PRODUCT
       ===================================================== */

    const loadProduct =
        useCallback(
            async (): Promise<void> => {
                if (
                    !token
                    || !Number.isInteger(
                        numericProductId,
                    )
                    || numericProductId
                    <= 0
                ) {
                    setProduct(
                        null,
                    );

                    setErrorMessage(
                        'The selected product is invalid.',
                    );

                    setIsLoading(
                        false,
                    );

                    return;
                }

                const requestId =
                    requestIdRef.current
                    + 1;

                requestIdRef.current =
                    requestId;

                setIsLoading(
                    true,
                );

                setErrorMessage(
                    '',
                );

                setSelectedBatch(
                    null,
                );

                try {
                    const response =
                        await getProductDetails(
                            token,
                            numericProductId,
                        );

                    if (
                        requestIdRef.current
                        !== requestId
                    ) {
                        return;
                    }

                    setProduct(
                        response.data,
                    );
                } catch (error) {
                    if (
                        requestIdRef.current
                        !== requestId
                    ) {
                        return;
                    }

                    setProduct(
                        null,
                    );

                    setErrorMessage(
                        error
                            instanceof ApiError
                            ? error.message
                            : 'Unable to load product details.',
                    );
                } finally {
                    if (
                        requestIdRef.current
                        === requestId
                    ) {
                        setIsLoading(
                            false,
                        );
                    }
                }
            },
            [
                token,
                numericProductId,
            ],
        );

    useEffect(
        () => {
            void loadProduct();
        },
        [
            loadProduct,
        ],
    );

    /* =====================================================
       MODAL ESCAPE + SCROLL LOCK
       ===================================================== */

    useEffect(
        () => {
            if (!selectedBatch) {
                return;
            }

            const previousOverflow =
                document.body
                    .style
                    .overflow;

            document.body.style.overflow =
                'hidden';

            const handleKeyDown =
                (
                    event:
                        KeyboardEvent,
                ): void => {
                    if (
                        event.key
                        === 'Escape'
                    ) {
                        setSelectedBatch(
                            null,
                        );
                    }
                };

            window.addEventListener(
                'keydown',
                handleKeyDown,
            );

            return () => {
                document.body.style.overflow =
                    previousOverflow;

                window.removeEventListener(
                    'keydown',
                    handleKeyDown,
                );
            };
        },
        [
            selectedBatch,
        ],
    );

    /* =====================================================
       FLATTEN STOCK ENTRIES
       ===================================================== */

    const stockRows =
        useMemo(
            () => {
                if (!product) {
                    return [];
                }

                return product
                    .price_options
                    .flatMap(
                        (
                            priceOption,
                        ) =>
                            priceOption
                                .batches,
                    );
            },
            [
                product,
            ],
        );

    /* =====================================================
       ACTIONS
       ===================================================== */

    const goBackToProducts =
        (): void => {
            navigate(
                '/admin/products',
            );
        };

    const closeBatchModal =
        (): void => {
            setSelectedBatch(
                null,
            );
        };

    /* =====================================================
       ERROR
       ===================================================== */

    const visibleError =
        errorMessage
        || (
            !isLoading
                && !product
                ? 'Product details were not found.'
                : ''
        );

    /* =====================================================
       LOADING
       ===================================================== */

    if (isLoading) {
        return (
            <div id="product-details-page">
                <style>
                    {pageStyles}
                </style>

                <section className="pdp-state">
                    <div className="pdp-spinner" />

                    <strong className="pdp-state-title">
                        Loading Product Details
                    </strong>

                    <span className="pdp-state-message">
                        Retrieving product,
                        stock and pricing information.
                    </span>
                </section>
            </div>
        );
    }

    /* =====================================================
       ERROR
       ===================================================== */

    if (
        visibleError
        || !product
    ) {
        return (
            <div id="product-details-page">
                <style>
                    {pageStyles}
                </style>

                <section
                    className="pdp-state error"
                    role="alert"
                >
                    <span className="pdp-state-icon">
                        <Icon name="alert" />
                    </span>

                    <strong className="pdp-state-title">
                        Unable to Load Product
                    </strong>

                    <span className="pdp-state-message">
                        {visibleError}
                    </span>

                    <div className="pdp-state-actions">
                        <button
                            type="button"
                            className="pdp-button"
                            onClick={() => {
                                void loadProduct();
                            }}
                        >
                            <Icon name="refresh" />

                            Try Again
                        </button>

                        <button
                            type="button"
                            className="pdp-button"
                            onClick={
                                goBackToProducts
                            }
                        >
                            <Icon name="arrow-left" />

                            Back to Products
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    /* =====================================================
       CORRECT STOCK SUMMARY

       These are calculated from the physical batch units,
       NOT product.unit.
       ===================================================== */

    const formatStockSummary = (
        field:
            | 'total_received_quantity'
            | 'total_available_quantity'
            | 'saleable_quantity'
            | 'expired_quantity',
    ): string => {
        const stockByUnit =
            product.summary.stock_by_unit
            ?? [];

        /*
         * Remove zero-value units when there is
         * another unit that actually has stock.
         *
         * This prevents:
         *
         * 0 Bag + 10,095 Kg
         *
         * and shows:
         *
         * 10,095 Kg
         */
        const nonZeroEntries =
            stockByUnit.filter(
                (entry) =>
                    Math.abs(
                        Number(
                            entry[field],
                        ),
                    ) > 0.000001,
            );

        const entries =
            nonZeroEntries.length > 0
                ? nonZeroEntries
                : stockByUnit;

        if (entries.length === 0) {
            return `0 ${product.unit}`;
        }

        /*
         * When everything is zero and multiple
         * stock units exist, prefer a dual-unit
         * physical stock unit such as Kg.
         */
        if (
            nonZeroEntries.length === 0
            && entries.length > 1
        ) {
            const dualBatch =
                stockRows.find(
                    (batch) =>
                        batch.is_dual_unit,
                );

            if (dualBatch) {
                return `0 ${dualBatch.stock_unit}`;
            }
        }

        return entries
            .map(
                (entry) =>
                    `${formatQuantity(
                        entry[field],
                    )} ${entry.unit}`,
            )
            .join(' + ');
    };

    const availableStockText =
        formatStockSummary(
            'total_available_quantity',
        );

    const saleableStockText =
        formatStockSummary(
            'saleable_quantity',
        );

    const totalReceivedText =
        groupReceivedPurchaseQuantity(
            stockRows,
            product.unit,
        );

    const expiredStockText =
        formatStockSummary(
            'expired_quantity',
        );

    /* =====================================================
       SELECTED BATCH VALUES
       ===================================================== */

    const selectedReference =
        selectedBatch
            ? (
                selectedBatch
                    .batch_number
                || selectedBatch
                    .batch_code
                || `Stock #${selectedBatch.id}`
            )
            : '';

    const selectedStockUnit =
        selectedBatch
            ? getStockUnit(
                selectedBatch,
                product.unit,
            )
            : product.unit;

    const selectedPrimaryUnit =
        selectedBatch
            ? getPrimarySaleUnit(
                selectedBatch,
                product.unit,
            )
            : product.unit;

    const secondarySellingPrice =
        selectedBatch
            ? runtimeNumber(
                selectedBatch,
                'secondary_selling_price',
            )
            : null;

    const secondaryUnit =
        selectedBatch
            ? runtimeString(
                selectedBatch,
                'secondary_unit',
            )
            : null;

    const conversionFactor =
        selectedBatch
            ? runtimeNumber(
                selectedBatch,
                'conversion_factor',
            )
            : null;

    const baseUnitCost =
        selectedBatch
            ? runtimeNumber(
                selectedBatch,
                'base_unit_cost',
            )
            : null;

    const selectedIsDual =
        selectedBatch
            ? isDualUnitBatch(
                selectedBatch,
            )
            : false;

    /* =====================================================
       BATCH MODAL
       ===================================================== */

    const batchModal =
        selectedBatch
            && typeof document
            !== 'undefined'
            ? createPortal(
                <div
                    id="product-batch-details-modal"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (
                            event.target
                            === event.currentTarget
                        ) {
                            closeBatchModal();
                        }
                    }}
                >
                    <section
                        className="pdm-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pdm-title"
                        onMouseDown={(event) => {
                            event.stopPropagation();
                        }}
                    >
                        {/* =============================
                            MODAL HEADER
                           ============================= */}

                        <header className="pdm-header">
                            <div className="pdm-header-main">
                                <span className="pdm-header-icon">
                                    <Icon name="layers" />
                                </span>

                                <div className="pdm-header-copy">
                                    <span className="pdm-kicker">
                                        Stock Batch Details
                                    </span>

                                    <h2
                                        id="pdm-title"
                                        className="pdm-title"
                                    >
                                        {
                                            selectedReference
                                        }
                                    </h2>

                                    <span className="pdm-product-name">
                                        {
                                            product.name
                                        }
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="pdm-close"
                                aria-label="Close batch details"
                                onClick={
                                    closeBatchModal
                                }
                            >
                                <Icon name="close" />
                            </button>
                        </header>

                        {/* =============================
                            BODY
                           ============================= */}

                        <div className="pdm-body">
                            {/* QUICK SUMMARY */}

                            <section className="pdm-summary">
                                <article className="pdm-summary-card green">
                                    <span className="pdm-summary-label">
                                        Selling Price
                                    </span>

                                    <strong className="pdm-summary-value">
                                        {formatCurrency(
                                            selectedBatch
                                                .selling_price,
                                        )}
                                    </strong>

                                    <span className="pdm-summary-help">
                                        per
                                        {' '}
                                        {
                                            selectedPrimaryUnit
                                        }
                                    </span>
                                </article>

                                <article className="pdm-summary-card blue">
                                    <span className="pdm-summary-label">
                                        Purchase Cost
                                    </span>

                                    <strong className="pdm-summary-value">
                                        {formatCurrency(
                                            selectedBatch
                                                .unit_cost,
                                        )}
                                    </strong>

                                    <span className="pdm-summary-help">
                                        per
                                        {' '}
                                        {
                                            selectedPrimaryUnit
                                        }
                                    </span>
                                </article>

                                <article className="pdm-summary-card">
                                    <span className="pdm-summary-label">
                                        Profit Per Unit
                                    </span>

                                    <strong className="pdm-summary-value">
                                        {formatCurrency(
                                            selectedBatch
                                                .profit_per_unit,
                                        )}
                                    </strong>

                                    <span className="pdm-summary-help">
                                        per
                                        {' '}
                                        {
                                            selectedPrimaryUnit
                                        }
                                    </span>
                                </article>

                                <article className="pdm-summary-card green">
                                    <span className="pdm-summary-label">
                                        Physical Stock Available
                                    </span>

                                    <strong className="pdm-summary-value">
                                        {formatQuantity(
                                            selectedBatch
                                                .available_quantity,
                                        )}

                                        {' '}

                                        {
                                            selectedStockUnit
                                        }
                                    </strong>
                                </article>
                            </section>

                            {/* BATCH INFO */}

                            <section className="pdm-section">
                                <header className="pdm-section-header">
                                    <Icon name="layers" />

                                    <h3 className="pdm-section-title">
                                        Batch Information
                                    </h3>
                                </header>

                                <div className="pdm-detail-grid">
                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Stock Reference
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {
                                                selectedReference
                                            }
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Batch Code
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {selectedBatch
                                                .batch_code
                                                || 'Not provided'}
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Batch Number
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {selectedBatch
                                                .batch_number
                                                || 'Not provided'}
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Status
                                        </span>

                                        <span
                                            className={
                                                getStatusClass(
                                                    selectedBatch
                                                        .status,
                                                )
                                            }
                                        >
                                            {getStatusLabel(
                                                selectedBatch
                                                    .status,
                                            )}
                                        </span>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Product / Purchase Unit
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {
                                                selectedPrimaryUnit
                                            }
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Physical Stock Unit
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {
                                                selectedStockUnit
                                            }
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Selling Mode
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {selectedIsDual
                                                ? 'Full Unit + Loose Unit'
                                                : 'Standard Unit'}
                                        </strong>
                                    </div>

                                    {selectedIsDual && (
                                        <div className="pdm-detail-item">
                                            <span className="pdm-detail-label">
                                                Loose Unit
                                            </span>

                                            <strong className="pdm-detail-value">
                                                {secondaryUnit
                                                    ?? selectedStockUnit}
                                            </strong>
                                        </div>
                                    )}

                                    {selectedIsDual && (
                                        <div className="pdm-detail-item">
                                            <span className="pdm-detail-label">
                                                Conversion
                                            </span>

                                            <strong className="pdm-detail-value">
                                                1
                                                {' '}
                                                {
                                                    selectedPrimaryUnit
                                                }

                                                {' = '}

                                                {conversionFactor
                                                    !== null
                                                    ? formatQuantity(
                                                        conversionFactor,
                                                    )
                                                    : 'Not provided'}

                                                {' '}

                                                {secondaryUnit
                                                    ?? selectedStockUnit}
                                            </strong>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* PRICING */}

                            <section className="pdm-section">
                                <header className="pdm-section-header">
                                    <Icon name="money" />

                                    <h3 className="pdm-section-title">
                                        Pricing Information
                                    </h3>
                                </header>

                                <div className="pdm-detail-grid">
                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Purchase Cost
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {formatCurrency(
                                                selectedBatch
                                                    .unit_cost,
                                            )}

                                            {' / '}

                                            {
                                                selectedPrimaryUnit
                                            }
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Selling Price
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {formatCurrency(
                                                selectedBatch
                                                    .selling_price,
                                            )}

                                            {' / '}

                                            {
                                                selectedPrimaryUnit
                                            }
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Profit Per Unit
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {formatCurrency(
                                                selectedBatch
                                                    .profit_per_unit,
                                            )}

                                            {' / '}

                                            {
                                                selectedPrimaryUnit
                                            }
                                        </strong>
                                    </div>

                                    {selectedIsDual
                                        && baseUnitCost !== null && (
                                            <div className="pdm-detail-item">
                                                <span className="pdm-detail-label">
                                                    Cost Per Loose Unit
                                                </span>

                                                <strong className="pdm-detail-value">
                                                    {formatCurrency(
                                                        baseUnitCost,
                                                    )}

                                                    {' / '}

                                                    {
                                                        selectedStockUnit
                                                    }
                                                </strong>
                                            </div>
                                        )}

                                    {selectedIsDual
                                        && secondarySellingPrice !== null && (
                                            <div className="pdm-detail-item">
                                                <span className="pdm-detail-label">
                                                    Loose Selling Price
                                                </span>

                                                <strong className="pdm-detail-value">
                                                    {formatCurrency(
                                                        secondarySellingPrice,
                                                    )}

                                                    {' / '}

                                                    {secondaryUnit
                                                        ?? selectedStockUnit}
                                                </strong>
                                            </div>
                                        )}
                                </div>
                            </section>

                            {/* STOCK */}

                            <section className="pdm-section">
                                <header className="pdm-section-header">
                                    <Icon name="stock" />

                                    <h3 className="pdm-section-title">
                                        Stock Quantities
                                    </h3>
                                </header>

                                <div className="pdm-detail-grid">
                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Purchased Quantity
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {formatQuantity(
                                                selectedBatch
                                                    .purchased_quantity,
                                            )}

                                            {' '}

                                            {
                                                selectedPrimaryUnit
                                            }
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Received Physical Quantity
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {formatQuantity(
                                                selectedBatch
                                                    .received_quantity,
                                            )}

                                            {' '}

                                            {
                                                selectedStockUnit
                                            }
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Available Physical Stock
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {formatQuantity(
                                                selectedBatch
                                                    .available_quantity,
                                            )}

                                            {' '}

                                            {
                                                selectedStockUnit
                                            }
                                        </strong>
                                    </div>

                                    {selectedIsDual
                                        && conversionFactor
                                        && conversionFactor > 0 && (
                                            <div className="pdm-detail-item">
                                                <span className="pdm-detail-label">
                                                    Full Units Available
                                                </span>

                                                <strong className="pdm-detail-value">
                                                    {Math.floor(
                                                        Number(
                                                            selectedBatch
                                                                .available_quantity,
                                                        )
                                                        / conversionFactor,
                                                    )}

                                                    {' '}

                                                    {
                                                        selectedPrimaryUnit
                                                    }

                                                    {' + '}

                                                    {formatQuantity(
                                                        Number(
                                                            selectedBatch
                                                                .available_quantity,
                                                        )
                                                        % conversionFactor,
                                                    )}

                                                    {' '}

                                                    {
                                                        selectedStockUnit
                                                    }
                                                </strong>
                                            </div>
                                        )}
                                </div>
                            </section>

                            {/* DATES */}

                            <section className="pdm-section">
                                <header className="pdm-section-header">
                                    <Icon name="calendar" />

                                    <h3 className="pdm-section-title">
                                        Manufacturing &amp; Expiry
                                    </h3>
                                </header>

                                <div className="pdm-detail-grid">
                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Manufactured Date
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {formatDate(
                                                selectedBatch
                                                    .manufactured_date,
                                            )}
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Expiry Date
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {formatDate(
                                                selectedBatch
                                                    .expiry_date,
                                            )}
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Received At
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {formatDateTime(
                                                selectedBatch
                                                    .received_at,
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            </section>

                            {/* PURCHASE */}

                            <section className="pdm-section">
                                <header className="pdm-section-header">
                                    <Icon name="truck" />

                                    <h3 className="pdm-section-title">
                                        Purchase &amp; Supplier
                                    </h3>
                                </header>

                                <div className="pdm-detail-grid">
                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Supplier
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {selectedBatch
                                                .supplier
                                                ?.name
                                                ?? 'Not available'}
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Purchase Number
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {selectedBatch
                                                .purchase_number
                                                || (
                                                    selectedBatch
                                                        .purchase_id
                                                        ? `Purchase #${selectedBatch.purchase_id}`
                                                        : 'Not available'
                                                )}
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Purchase ID
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {selectedBatch
                                                .purchase_id
                                                ? `#${selectedBatch.purchase_id}`
                                                : 'Not available'}
                                        </strong>
                                    </div>

                                    <div className="pdm-detail-item">
                                        <span className="pdm-detail-label">
                                            Purchase Date
                                        </span>

                                        <strong className="pdm-detail-value">
                                            {formatDate(
                                                selectedBatch
                                                    .purchase_date,
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            </section>

                            {/* NOTES */}

                            <section className="pdm-section">
                                <header className="pdm-section-header">
                                    <Icon name="tag" />

                                    <h3 className="pdm-section-title">
                                        Notes
                                    </h3>
                                </header>

                                <div className="pdm-notes">
                                    {selectedBatch.notes
                                        || 'No notes added for this stock batch.'}
                                </div>
                            </section>
                        </div>

                        <footer className="pdm-footer">
                            <button
                                type="button"
                                className="pdm-footer-button"
                                onClick={
                                    closeBatchModal
                                }
                            >
                                Close
                            </button>
                        </footer>
                    </section>
                </div>,
                document.body,
            )
            : null;

    /* =====================================================
       PAGE
       ===================================================== */

    return (
        <>
            <div id="product-details-page">
                <style>
                    {pageStyles}
                </style>

                {/* =========================================
                    TOP
                   ========================================= */}

                <div className="pdp-top-row">
                    <button
                        type="button"
                        className="pdp-button"
                        onClick={
                            goBackToProducts
                        }
                    >
                        <Icon name="arrow-left" />

                        Back to Products
                    </button>

                    <span className="pdp-product-id">
                        Product ID
                        {' #'}

                        {
                            numericProductId
                        }
                    </span>
                </div>

                {/* =========================================
                    HERO
                   ========================================= */}

                <header className="pdp-hero">
                    <div className="pdp-hero-main">
                        <span className="pdp-product-icon">
                            <Icon name="box" />
                        </span>

                        <div className="pdp-hero-copy">
                            <span className="pdp-eyebrow">
                                Product &amp; Inventory
                            </span>

                            <h1
                                className="pdp-title"
                                title={
                                    product.name
                                }
                            >
                                {
                                    product.name
                                }
                            </h1>

                            <div className="pdp-meta-list">
                                <span className="pdp-meta-chip">
                                    <Icon name="category" />

                                    {product
                                        .category
                                        ?.name
                                        ?? 'General'}
                                </span>

                                <span className="pdp-meta-chip">
                                    <Icon name="tag" />

                                    SKU:
                                    {' '}

                                    {
                                        product.sku
                                    }
                                </span>

                                <span className="pdp-meta-chip">
                                    <Icon name="layers" />

                                    Product Unit:
                                    {' '}

                                    {
                                        product.unit
                                    }
                                </span>

                                {product.barcode && (
                                    <span className="pdp-meta-chip">
                                        <Icon name="barcode" />

                                        {
                                            product.barcode
                                        }
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <span
                        className={
                            product.is_active
                                ? 'pdp-product-status active'
                                : 'pdp-product-status inactive'
                        }
                    >
                        {product.is_active
                            ? 'Active Product'
                            : 'Inactive Product'}
                    </span>
                </header>

                {/* =========================================
                    SUMMARY

                    FIX:
                    Actual physical stock units are used.
                   ========================================= */}

                <section className="pdp-summary-grid">
                    <article className="pdp-summary-card">
                        <span className="pdp-summary-label">
                            Available Stock
                        </span>

                        <strong className="pdp-summary-value">
                            {
                                availableStockText
                            }
                        </strong>
                    </article>

                    <article className="pdp-summary-card">
                        <span className="pdp-summary-label">
                            Saleable Stock
                        </span>

                        <strong className="pdp-summary-value">
                            {
                                saleableStockText
                            }
                        </strong>
                    </article>

                    <article className="pdp-summary-card blue">
                        <span className="pdp-summary-label">
                            Stock Value at Cost
                        </span>

                        <strong className="pdp-summary-value">
                            {formatCurrency(
                                product
                                    .summary
                                    .total_stock_value_at_cost,
                            )}
                        </strong>
                    </article>

                    <article className="pdp-summary-card amber">
                        <span className="pdp-summary-label">
                            Potential Gross Profit
                        </span>

                        <strong className="pdp-summary-value">
                            {formatCurrency(
                                product
                                    .summary
                                    .potential_gross_profit,
                            )}
                        </strong>
                    </article>
                </section>

                {/* =========================================
                    PRODUCT INFO + STOCK OVERVIEW

                    MOVED ABOVE STOCK TABLE
                   ========================================= */}

                <section className="pdp-upper-info-grid">
                    {/* PRODUCT INFORMATION */}

                    <section className="pdp-panel">
                        <header className="pdp-panel-heading">
                            <div>
                                <h2 className="pdp-panel-title">
                                    Product Information
                                </h2>

                                <p className="pdp-panel-description">
                                    Main product identification
                                    information.
                                </p>
                            </div>
                        </header>

                        <div className="pdp-info-grid">
                            <div className="pdp-info-item">
                                <span className="pdp-info-label">
                                    SKU
                                </span>

                                <strong
                                    className="pdp-info-value"
                                    title={
                                        product.sku
                                    }
                                >
                                    {
                                        product.sku
                                    }
                                </strong>
                            </div>

                            <div className="pdp-info-item">
                                <span className="pdp-info-label">
                                    Barcode
                                </span>

                                <strong
                                    className="pdp-info-value"
                                    title={
                                        product.barcode
                                        ?? 'Not assigned'
                                    }
                                >
                                    {product.barcode
                                        ?? 'Not assigned'}
                                </strong>
                            </div>

                            <div className="pdp-info-item">
                                <span className="pdp-info-label">
                                    Main Product Unit
                                </span>

                                <strong className="pdp-info-value">
                                    {
                                        product.unit
                                    }
                                </strong>
                            </div>

                            <div className="pdp-info-item">
                                <span className="pdp-info-label">
                                    Category
                                </span>

                                <strong
                                    className="pdp-info-value"
                                    title={
                                        product
                                            .category
                                            ?.name
                                        ?? 'General'
                                    }
                                >
                                    {product
                                        .category
                                        ?.name
                                        ?? 'General'}
                                </strong>
                            </div>

                            <div className="pdp-info-item">
                                <span className="pdp-info-label">
                                    Product Status
                                </span>

                                <strong className="pdp-info-value">
                                    {product.is_active
                                        ? 'Active'
                                        : 'Inactive'}
                                </strong>
                            </div>

                            <div className="pdp-info-item">
                                <span className="pdp-info-label">
                                    Product ID
                                </span>

                                <strong className="pdp-info-value">
                                    #
                                    {
                                        numericProductId
                                    }
                                </strong>
                            </div>
                        </div>
                    </section>

                    {/* STOCK OVERVIEW */}

                    <section className="pdp-panel">
                        <header className="pdp-panel-heading">
                            <div>
                                <h2 className="pdp-panel-title">
                                    Stock Overview
                                </h2>

                                <p className="pdp-panel-description">
                                    Actual physical inventory
                                    currently recorded.
                                </p>
                            </div>
                        </header>

                        <div className="pdp-overview-grid">
                            <article className="pdp-overview-card">
                                <span>
                                    Price Options
                                </span>

                                <strong>
                                    {product
                                        .summary
                                        .number_of_price_options}
                                </strong>
                            </article>

                            <article className="pdp-overview-card">
                                <span>
                                    Stock Entries
                                </span>

                                <strong>
                                    {
                                        stockRows.length
                                    }
                                </strong>
                            </article>

                            <article className="pdp-overview-card highlight">
                                <span>
                                    Available Stock
                                </span>

                                <strong>
                                    {
                                        availableStockText
                                    }
                                </strong>
                            </article>

                            <article className="pdp-overview-card highlight">
                                <span>
                                    Saleable Stock
                                </span>

                                <strong>
                                    {
                                        saleableStockText
                                    }
                                </strong>
                            </article>

                            <article className="pdp-overview-card">
                                <span>
                                    Total Received
                                </span>

                                <strong>
                                    {
                                        totalReceivedText
                                    }
                                </strong>
                            </article>

                            <article className="pdp-overview-card">
                                <span>
                                    Expired Stock
                                </span>

                                <strong>
                                    {
                                        expiredStockText
                                    }
                                </strong>
                            </article>
                        </div>
                    </section>
                </section>

                {/* =========================================
                    STOCK & PRICE DETAILS
                   ========================================= */}

                <section className="pdp-panel">
                    <header className="pdp-panel-heading">
                        <div>
                            <h2 className="pdp-panel-title">
                                Stock &amp; Price Details
                            </h2>

                            <p className="pdp-panel-description">
                                Each physical stock batch is
                                displayed as one row. Stock
                                quantities use their actual
                                physical unit such as Bag or Kg.
                            </p>
                        </div>

                        <div className="pdp-panel-badges">
                            <span className="pdp-count-badge">
                                {
                                    stockRows.length
                                }

                                {' '}

                                {stockRows.length
                                    === 1
                                    ? 'Stock Entry'
                                    : 'Stock Entries'}
                            </span>

                            <span className="pdp-count-badge blue">
                                {product
                                    .summary
                                    .number_of_price_options}

                                {' '}

                                {product
                                    .summary
                                    .number_of_price_options
                                    === 1
                                    ? 'Price'
                                    : 'Prices'}
                            </span>
                        </div>
                    </header>

                    {stockRows.length === 0 ? (
                        <div className="pdp-state">
                            <span className="pdp-state-icon">
                                <Icon name="stock" />
                            </span>

                            <strong className="pdp-state-title">
                                No Stock Received
                            </strong>

                            <span className="pdp-state-message">
                                This product does not
                                currently have any received
                                stock entries.
                            </span>
                        </div>
                    ) : (
                        <div className="pdp-stock-list">
                            {/* HEADER */}

                            <div className="pdp-stock-grid pdp-stock-header">
                                <span>
                                    Stock Reference
                                </span>

                                <span>
                                    Status
                                </span>

                                <span>
                                    Cost Price
                                </span>

                                <span>
                                    Selling Price
                                </span>

                                <span>
                                    Available
                                </span>

                                <span>
                                    Expiry
                                </span>

                                <span>
                                    Supplier
                                </span>

                                <span>
                                    Details
                                </span>
                            </div>

                            {/* STOCK ROWS */}

                            <div className="pdp-stock-rows">
                                {stockRows.map(
                                    (
                                        batch,
                                    ) => {
                                        const reference =
                                            batch.batch_number
                                            || batch.batch_code
                                            || `Stock #${batch.id}`;

                                        /*
                                         * IMPORTANT FIX
                                         *
                                         * Example:
                                         * Product Unit = Bag
                                         * 1 Bag = 100 Kg
                                         * available_quantity = 95
                                         *
                                         * stockUnit becomes Kg,
                                         * therefore page displays:
                                         *
                                         * 95 Kg
                                         *
                                         * NOT:
                                         * 95 Bag
                                         */
                                        const stockUnit =
                                            getStockUnit(
                                                batch,
                                                product.unit,
                                            );

                                        const primaryUnit =
                                            getPrimarySaleUnit(
                                                batch,
                                                product.unit,
                                            );

                                        return (
                                            <article
                                                key={
                                                    batch.id
                                                }
                                                className="pdp-stock-grid pdp-stock-row"
                                            >
                                                {/* REFERENCE */}

                                                <div className="pdp-stock-cell">
                                                    <span className="pdp-cell-label">
                                                        Stock Reference
                                                    </span>

                                                    <strong
                                                        className="pdp-reference"
                                                        title={
                                                            reference
                                                        }
                                                    >
                                                        {
                                                            reference
                                                        }
                                                    </strong>

                                                    <span className="pdp-reference-sub">
                                                        Stock ID
                                                        {' #'}

                                                        {
                                                            batch.id
                                                        }
                                                    </span>
                                                </div>

                                                {/* STATUS */}

                                                <div className="pdp-stock-cell">
                                                    <span className="pdp-cell-label">
                                                        Status
                                                    </span>

                                                    <span
                                                        className={
                                                            getStatusClass(
                                                                batch
                                                                    .status,
                                                            )
                                                        }
                                                    >
                                                        {getStatusLabel(
                                                            batch
                                                                .status,
                                                        )}
                                                    </span>
                                                </div>

                                                {/* COST */}

                                                <div className="pdp-stock-cell">
                                                    <span className="pdp-cell-label">
                                                        Cost Price
                                                    </span>

                                                    <strong className="pdp-cell-text pdp-cost">
                                                        {formatCurrency(
                                                            batch
                                                                .unit_cost,
                                                        )}
                                                    </strong>

                                                    <span className="pdp-price-unit">
                                                        per
                                                        {' '}
                                                        {
                                                            primaryUnit
                                                        }
                                                    </span>
                                                </div>

                                                {/* SELLING */}

                                                <div className="pdp-stock-cell">
                                                    <span className="pdp-cell-label">
                                                        Selling Price
                                                    </span>

                                                    <strong className="pdp-cell-text pdp-selling">
                                                        {formatCurrency(
                                                            batch
                                                                .selling_price,
                                                        )}
                                                    </strong>

                                                    <span className="pdp-price-unit">
                                                        per
                                                        {' '}
                                                        {
                                                            primaryUnit
                                                        }
                                                    </span>
                                                </div>

                                                {/* AVAILABLE */}

                                                <div className="pdp-stock-cell">
                                                    <span className="pdp-cell-label">
                                                        Available
                                                    </span>

                                                    <strong className="pdp-cell-text pdp-stock-quantity">
                                                        {formatQuantity(
                                                            batch
                                                                .available_quantity,
                                                        )}

                                                        {' '}

                                                        {
                                                            stockUnit
                                                        }
                                                    </strong>

                                                    {isDualUnitBatch(
                                                        batch,
                                                    ) && (
                                                            <span className="pdp-price-unit">
                                                                Physical stock
                                                            </span>
                                                        )}
                                                </div>

                                                {/* EXPIRY */}

                                                <div className="pdp-stock-cell">
                                                    <span className="pdp-cell-label">
                                                        Expiry
                                                    </span>

                                                    <span className="pdp-cell-text">
                                                        {formatDate(
                                                            batch
                                                                .expiry_date,
                                                        )}
                                                    </span>
                                                </div>

                                                {/* SUPPLIER */}

                                                <div className="pdp-stock-cell">
                                                    <span className="pdp-cell-label">
                                                        Supplier
                                                    </span>

                                                    <span
                                                        className="pdp-cell-text"
                                                        title={
                                                            batch
                                                                .supplier
                                                                ?.name
                                                            ?? 'Not available'
                                                        }
                                                    >
                                                        {batch
                                                            .supplier
                                                            ?.name
                                                            ?? 'Not available'}
                                                    </span>
                                                </div>

                                                {/* DETAILS */}

                                                <div className="pdp-stock-cell action">
                                                    <button
                                                        type="button"
                                                        className="pdp-button pdp-view-button"
                                                        onClick={() => {
                                                            setSelectedBatch(
                                                                batch,
                                                            );
                                                        }}
                                                    >
                                                        <Icon name="eye" />

                                                        View Details
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {/* =========================================
                    AUDIT
                   ========================================= */}

                <footer className="pdp-audit">
                    <div className="pdp-audit-item">
                        <span>
                            Product Created
                        </span>

                        <strong>
                            {formatDateTime(
                                product
                                    .created_at,
                            )}
                        </strong>
                    </div>

                    <div className="pdp-audit-item">
                        <span>
                            Last Updated
                        </span>

                        <strong>
                            {formatDateTime(
                                product
                                    .updated_at,
                            )}
                        </strong>
                    </div>
                </footer>
            </div>

            {batchModal}
        </>
    );
}