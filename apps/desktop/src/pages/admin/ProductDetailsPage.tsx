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

type ProductBatch =
    ProductPriceOption['batches'][number];

type ProductVariant =
    ProductDetails['variants'][number];

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
    value: number | null | undefined,
): string {
    if (
        value === null
        || value === undefined
        || !Number.isFinite(Number(value))
    ) {
        return 'Not available';
    }

    return currencyFormatter.format(
        Number(value),
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
        Number(value ?? 0);

    if (!Number.isFinite(numericValue)) {
        return String(value ?? 0);
    }

    return quantityFormatter.format(
        numericValue,
    );
}

function formatDate(
    value: string | null | undefined,
): string {
    if (!value) {
        return 'Not provided';
    }

    const date =
        new Date(
            `${value.substring(0, 10)}T00:00:00`,
        );

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

function formatDateTime(
    value: string | null | undefined,
): string {
    if (!value) {
        return 'Not provided';
    }

    const date =
        new Date(value);

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

function getStockUnit(
    batch: ProductBatch,
    fallbackUnit: string,
): string {
    const stockUnit =
        String(
            batch.stock_unit
            ?? '',
        ).trim();

    if (stockUnit) {
        return stockUnit;
    }

    if (
        batch.is_dual_unit
        && batch.secondary_unit
    ) {
        return batch.secondary_unit;
    }

    return fallbackUnit || 'Unit';
}

function getPrimaryUnit(
    batch: ProductBatch,
    fallbackUnit: string,
): string {
    return (
        batch.purchase_unit_name
        || batch.primary_unit
        || fallbackUnit
        || 'Unit'
    );
}

function getBatchReference(
    batch: ProductBatch,
): string {
    return (
        batch.batch_number
        || batch.batch_code
        || `Stock #${batch.id}`
    );
}

function getStatusLabel(
    status: ProductBatchStatus,
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
    status: ProductBatchStatus,
): string {
    return `pdp-status pdp-status-${status}`;
}

function formatStockEntries(
    entries:
        Array<{
            unit: string;
            available_quantity: number;
        }>,
    fallbackUnit: string,
): string {
    if (
        !Array.isArray(entries)
        || entries.length === 0
    ) {
        return `0 ${fallbackUnit}`;
    }

    const nonZero =
        entries.filter(
            (entry) =>
                Math.abs(
                    Number(
                        entry.available_quantity,
                    ),
                ) > 0.000001,
        );

    const displayEntries =
        nonZero.length > 0
            ? nonZero
            : entries;

    return displayEntries
        .map(
            (entry) =>
                `${formatQuantity(
                    entry.available_quantity,
                )} ${entry.unit || fallbackUnit}`,
        )
        .join(' + ');
}

function groupBatchStock(
    batches: ProductBatch[],
    fallbackUnit: string,
    saleableOnly = false,
): string {
    const totals =
        new Map<string, number>();

    batches.forEach(
        (batch) => {
            if (
                saleableOnly
                && (
                    batch.status === 'expired'
                    || batch.status === 'out_of_stock'
                )
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
                    batch.available_quantity
                    ?? 0,
                );

            if (!Number.isFinite(quantity)) {
                return;
            }

            totals.set(
                unit,
                (
                    totals.get(unit)
                    ?? 0
                )
                + quantity,
            );
        },
    );

    if (totals.size === 0) {
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

function formatPriceRange(
    values:
        Array<
            number
            | null
            | undefined
        >,
): string {
    const prices =
        values
            .map(Number)
            .filter(Number.isFinite)
            .sort(
                (
                    left,
                    right,
                ) =>
                    left - right,
            );

    if (
        prices.length === 0
    ) {
        return 'Not available';
    }

    const minimum =
        prices[0];

    const maximum =
        prices[
        prices.length - 1
        ];

    if (
        Math.abs(
            maximum - minimum,
        ) < 0.001
    ) {
        return formatCurrency(
            minimum,
        );
    }

    return `${formatCurrency(
        minimum,
    )} - ${formatCurrency(
        maximum,
    )}`;
}

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

function Icon({
    name,
}: {
    name: IconName;
}) {
    const props = {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true,
        focusable: false,
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
                    <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14M21 5v14" />
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

                    <path d="M16 3v4M8 3v4M3 11h18" />
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
                    <path d="m6 6 12 12M18 6 6 18" />
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
                    <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
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

                    <path d="M7 10h.01M17 14h.01M12 9v6" />
                </svg>
            );

        case 'refresh':
            return (
                <svg {...props}>
                    <path d="M20 11a8 8 0 1 0 2 5M20 4v7h-7" />
                </svg>
            );

        case 'stock':
            return (
                <svg {...props}>
                    <path d="M4 20V8l8-4 8 4v12M8 20v-7h8v7M2 20h20" />
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
                    <path d="M3 6h11v10H3ZM14 10h4l3 3v3h-7Z" />

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
                    <path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" />
                </svg>
            );
    }
}

const pageStyles = `
#product-details-page,
#product-details-page *,
#product-details-page *::before,
#product-details-page *::after,
#product-detail-modal,
#product-detail-modal *,
#product-detail-modal *::before,
#product-detail-modal *::after {
    box-sizing: border-box !important;
}

#product-details-page,
#product-detail-modal {
    --green-950: #052e16;
    --green-900: #14532d;
    --green-800: #166534;
    --green-700: #15803d;
    --green-100: #dcfce7;
    --green-50: #f0fdf4;

    --blue-800: #1849a9;
    --blue-700: #175cd3;
    --blue-100: #d1e9ff;
    --blue-50: #eff8ff;

    --amber-800: #93370d;
    --amber-50: #fffaeb;

    --red-700: #b42318;
    --red-50: #fef3f2;

    --text: #101828;
    --text-2: #344054;
    --muted: #667085;

    --border: #d0d9d2;
    --border-soft: #e5ebe6;

    --page: #f4f7f5;

    color: var(--text) !important;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif !important;
}

#product-details-page {
    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;

    flex-direction: column !important;

    gap: 16px !important;

    padding: 0 4px 28px !important;

    font-size: 14px !important;
    line-height: 1.5 !important;

    overflow-x: hidden !important;
}

#product-details-page h1,
#product-details-page h2,
#product-details-page h3,
#product-details-page p,
#product-detail-modal h2,
#product-detail-modal h3,
#product-detail-modal p {
    margin: 0 !important;
}

#product-details-page button,
#product-detail-modal button {
    font: inherit !important;
}

#product-details-page svg,
#product-detail-modal svg {
    display: block !important;

    width: 18px !important;
    height: 18px !important;
}

#product-details-page .pdp-top {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;

    gap: 12px !important;
}

#product-details-page .pdp-button {
    display: inline-flex !important;

    min-height: 42px !important;

    align-items: center !important;
    justify-content: center !important;

    gap: 7px !important;

    padding: 8px 13px !important;

    color: var(--text-2) !important;

    font-size: 13px !important;
    font-weight: 800 !important;

    background: #ffffff !important;

    border:
        1px solid
        #aebdb2 !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#product-details-page .pdp-button:hover {
    color: var(--green-900) !important;

    background: var(--green-50) !important;

    border-color: #94cda5 !important;
}

#product-details-page .pdp-hero {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        auto !important;

    align-items: center !important;

    gap: 18px !important;

    padding: 20px !important;

    background:
        linear-gradient(
            135deg,
            #ffffff 0%,
            #ffffff 68%,
            #effaf2 100%
        ) !important;

    border:
        1px solid
        var(--border) !important;

    border-left:
        5px solid
        var(--green-700) !important;

    border-radius: 14px !important;

    box-shadow:
        0 1px 3px
        rgba(
            16,
            24,
            40,
            0.06
        ) !important;
}

#product-details-page .pdp-hero-main {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;

    gap: 14px !important;
}

#product-details-page .pdp-product-icon {
    display: grid !important;

    width: 56px !important;
    height: 56px !important;

    min-width: 56px !important;

    place-items: center !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            145deg,
            var(--green-950),
            var(--green-700)
        ) !important;

    border-radius: 12px !important;
}

#product-details-page .pdp-title {
    color: var(--text) !important;

    font-size: 27px !important;
    font-weight: 900 !important;

    line-height: 1.2 !important;
}

#product-details-page .pdp-eyebrow {
    display: block !important;

    color: var(--green-700) !important;

    font-size: 11px !important;
    font-weight: 850 !important;

    text-transform: uppercase !important;
}

#product-details-page .pdp-meta {
    display: flex !important;

    flex-wrap: wrap !important;

    gap: 7px !important;

    margin-top: 8px !important;
}

#product-details-page .pdp-chip {
    display: inline-flex !important;

    min-height: 29px !important;

    align-items: center !important;

    gap: 5px !important;

    padding: 4px 9px !important;

    color: var(--text-2) !important;

    font-size: 12px !important;
    font-weight: 700 !important;

    background: #ffffff !important;

    border:
        1px solid
        #dfe6e1 !important;

    border-radius: 999px !important;
}

#product-details-page .pdp-chip svg {
    width: 14px !important;
    height: 14px !important;

    color: var(--green-700) !important;
}

#product-details-page .pdp-active,
#product-details-page .pdp-inactive {
    display: inline-flex !important;

    min-height: 36px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 6px 11px !important;

    font-size: 11px !important;
    font-weight: 850 !important;

    border-radius: 999px !important;
}

#product-details-page .pdp-active {
    color: var(--green-900) !important;

    background: var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;
}

#product-details-page .pdp-inactive {
    color: var(--amber-800) !important;

    background: var(--amber-50) !important;

    border:
        1px solid
        #efd696 !important;
}

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

    min-height: 100px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 4px !important;

    padding:
        14px
        15px
        14px
        19px !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 10px !important;

    overflow: hidden !important;
}

#product-details-page .pdp-summary-card::before {
    position: absolute !important;

    inset:
        0
        auto
        0
        0 !important;

    width: 4px !important;

    background: var(--green-700) !important;

    content: "" !important;
}

#product-details-page .pdp-summary-card.blue::before {
    background: var(--blue-700) !important;
}

#product-details-page .pdp-summary-card.amber::before {
    background: #b54708 !important;
}

#product-details-page .pdp-summary-label {
    color: var(--muted) !important;

    font-size: 10px !important;
    font-weight: 850 !important;

    text-transform: uppercase !important;
}

#product-details-page .pdp-summary-value {
    color: var(--green-900) !important;

    font-size: 19px !important;
    font-weight: 900 !important;

    overflow-wrap: anywhere !important;
}

#product-details-page .pdp-summary-card.blue .pdp-summary-value {
    color: var(--blue-700) !important;
}

#product-details-page .pdp-summary-card.amber .pdp-summary-value {
    color: var(--amber-800) !important;
}

#product-details-page .pdp-two-col {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1.25fr)
        minmax(0, 1fr) !important;

    gap: 12px !important;
}

#product-details-page .pdp-panel {
    min-width: 0 !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 11px !important;

    box-shadow:
        0 1px 3px
        rgba(
            16,
            24,
            40,
            0.05
        ) !important;
}

#product-details-page .pdp-panel-head {
    display: flex !important;

    align-items: flex-start !important;
    justify-content: space-between !important;

    gap: 12px !important;

    padding: 15px 16px !important;

    border-bottom:
        1px solid
        var(--border-soft) !important;
}

#product-details-page .pdp-panel-title {
    color: var(--text) !important;

    font-size: 17px !important;
    font-weight: 850 !important;
}

#product-details-page .pdp-panel-desc {
    margin-top: 3px !important;

    color: var(--muted) !important;

    font-size: 12px !important;
}

#product-details-page .pdp-badge {
    display: inline-flex !important;

    min-height: 29px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 4px 9px !important;

    color: var(--green-900) !important;

    font-size: 10px !important;
    font-weight: 850 !important;

    background: var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 999px !important;
}

#product-details-page .pdp-info-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            3,
            minmax(0, 1fr)
        ) !important;

    gap: 1px !important;

    background: var(--border-soft) !important;
}

#product-details-page .pdp-info {
    display: flex !important;

    min-height: 72px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 4px !important;

    padding: 11px 12px !important;

    background: #ffffff !important;
}

#product-details-page .pdp-info span,
#product-details-page .pdp-overview span {
    color: var(--muted) !important;

    font-size: 9px !important;
    font-weight: 850 !important;

    text-transform: uppercase !important;
}

#product-details-page .pdp-info strong,
#product-details-page .pdp-overview strong {
    color: var(--text-2) !important;

    font-size: 12px !important;
    font-weight: 800 !important;

    overflow-wrap: anywhere !important;
}

#product-details-page .pdp-overview-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            2,
            minmax(0, 1fr)
        ) !important;

    gap: 8px !important;

    padding: 12px !important;
}

#product-details-page .pdp-overview {
    display: flex !important;

    min-height: 70px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 4px !important;

    padding: 10px 11px !important;

    background: #f8faf9 !important;

    border:
        1px solid
        var(--border-soft) !important;

    border-radius: 8px !important;
}

#product-details-page .pdp-overview.highlight {
    background: var(--green-50) !important;

    border-color: #b8dfc3 !important;
}

#product-details-page .pdp-overview.highlight strong {
    color: var(--green-900) !important;
}

#product-details-page .pdp-variant-wrap,
#product-details-page .pdp-stock-wrap {
    padding: 12px !important;

    background: var(--page) !important;
}

#product-details-page .pdp-variant-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            auto-fit,
            minmax(
                260px,
                1fr
            )
        ) !important;

    gap: 11px !important;
}

#product-details-page .pdp-variant-card {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    gap: 11px !important;

    padding: 14px !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 10px !important;
}

#product-details-page .pdp-variant-card:hover {
    border-color: #aacdb3 !important;

    box-shadow:
        0 3px 10px
        rgba(
            16,
            24,
            40,
            0.07
        ) !important;
}

#product-details-page .pdp-variant-head {
    display: flex !important;

    align-items: flex-start !important;
    justify-content: space-between !important;

    gap: 10px !important;
}

#product-details-page .pdp-variant-title {
    color: var(--text) !important;

    font-size: 17px !important;
    font-weight: 900 !important;
}

#product-details-page .pdp-variant-sub {
    display: block !important;

    margin-top: 3px !important;

    color: var(--muted) !important;

    font-size: 11px !important;
    font-weight: 700 !important;
}

#product-details-page .pdp-variant-status {
    display: inline-flex !important;

    min-height: 26px !important;

    align-items: center !important;

    padding: 3px 8px !important;

    font-size: 9px !important;
    font-weight: 850 !important;

    border-radius: 999px !important;
}

#product-details-page .pdp-variant-status.active {
    color: var(--green-900) !important;

    background: var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;
}

#product-details-page .pdp-variant-status.inactive {
    color: var(--muted) !important;

    background: #f2f4f7 !important;

    border:
        1px solid
        #d0d5dd !important;
}

#product-details-page .pdp-variant-stock-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            2,
            minmax(0, 1fr)
        ) !important;

    gap: 8px !important;
}

#product-details-page .pdp-variant-stock {
    display: flex !important;

    min-height: 72px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 4px !important;

    padding: 10px !important;

    background: #f8faf9 !important;

    border:
        1px solid
        var(--border-soft) !important;

    border-radius: 8px !important;
}

#product-details-page .pdp-variant-stock.highlight {
    background: var(--green-50) !important;

    border-color: #b8dfc3 !important;
}

#product-details-page .pdp-variant-stock span {
    color: var(--muted) !important;

    font-size: 9px !important;
    font-weight: 850 !important;

    text-transform: uppercase !important;
}

#product-details-page .pdp-variant-stock strong {
    color: var(--text) !important;

    font-size: 14px !important;
    font-weight: 900 !important;

    overflow-wrap: anywhere !important;
}

#product-details-page .pdp-variant-stock.highlight strong {
    color: var(--green-900) !important;
}

#product-details-page .pdp-variant-button {
    display: inline-flex !important;

    width: 100% !important;
    min-height: 44px !important;

    align-items: center !important;
    justify-content: center !important;

    gap: 7px !important;

    padding: 8px 11px !important;

    color: #ffffff !important;

    font-size: 12px !important;
    font-weight: 850 !important;

    background: var(--blue-700) !important;

    border:
        1px solid
        var(--blue-700) !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#product-details-page .pdp-variant-button:hover {
    background: var(--blue-800) !important;

    border-color: var(--blue-800) !important;
}

#product-details-page .pdp-variant-meta {
    display: grid !important;

    grid-template-columns:
        repeat(
            2,
            minmax(0, 1fr)
        ) !important;

    gap: 8px !important;
}

#product-details-page .pdp-variant-meta div {
    min-width: 0 !important;
}

#product-details-page .pdp-variant-meta span {
    display: block !important;

    color: var(--muted) !important;

    font-size: 9px !important;
    font-weight: 850 !important;

    text-transform: uppercase !important;
}

#product-details-page .pdp-variant-meta strong {
    display: block !important;

    margin-top: 2px !important;

    overflow: hidden !important;

    color: var(--text-2) !important;

    font-size: 10px !important;
    font-weight: 750 !important;

    text-overflow: ellipsis !important;

    white-space: nowrap !important;
}

#product-details-page .pdp-variant-footer {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;

    gap: 8px !important;

    margin-top: auto !important;

    padding-top: 8px !important;

    border-top:
        1px solid
        var(--border-soft) !important;

    color: var(--muted) !important;

    font-size: 10px !important;
    font-weight: 750 !important;
}

#product-details-page .pdp-stock-table-wrap {
    width: 100% !important;

    overflow-x: auto !important;

    background: #ffffff !important;

    border:
        1px solid
        #d7e0d9 !important;

    border-radius: 9px !important;
}

#product-details-page .pdp-stock-table {
    width: 100% !important;

    min-width: 1050px !important;

    border-collapse: collapse !important;
}

#product-details-page .pdp-stock-table th {
    padding: 10px 11px !important;

    color: var(--text-2) !important;

    font-size: 9px !important;
    font-weight: 850 !important;

    text-align: left !important;
    text-transform: uppercase !important;

    background: #eef3ef !important;

    border-bottom:
        1px solid
        #d7e0d9 !important;
}

#product-details-page .pdp-stock-table td {
    padding: 11px !important;

    color: var(--text-2) !important;

    font-size: 11px !important;
    font-weight: 700 !important;

    vertical-align: middle !important;

    border-bottom:
        1px solid
        #e7ece8 !important;
}

#product-details-page .pdp-stock-table tbody tr:last-child td {
    border-bottom: 0 !important;
}

#product-details-page .pdp-cost {
    color: var(--blue-700) !important;

    font-weight: 900 !important;
}

#product-details-page .pdp-selling,
#product-details-page .pdp-stock-qty {
    color: var(--green-900) !important;

    font-weight: 900 !important;
}

#product-details-page .pdp-sub {
    display: block !important;

    margin-top: 2px !important;

    color: var(--muted) !important;

    font-size: 9px !important;
    font-weight: 650 !important;
}

#product-details-page .pdp-view {
    display: inline-flex !important;

    min-height: 34px !important;

    align-items: center !important;
    justify-content: center !important;

    gap: 5px !important;

    padding: 5px 9px !important;

    color: var(--blue-700) !important;

    font-size: 10px !important;
    font-weight: 850 !important;

    background: var(--blue-50) !important;

    border:
        1px solid
        #bddaff !important;

    border-radius: 7px !important;

    cursor: pointer !important;
}

#product-details-page .pdp-view:hover {
    color: #ffffff !important;

    background: var(--blue-700) !important;
}

#product-details-page .pdp-status,
#product-detail-modal .pdp-status {
    display: inline-flex !important;

    min-height: 26px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 3px 7px !important;

    font-size: 9px !important;
    font-weight: 850 !important;

    border-radius: 999px !important;

    white-space: nowrap !important;
}

#product-details-page .pdp-status-available,
#product-detail-modal .pdp-status-available {
    color: var(--green-900) !important;

    background: var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;
}

#product-details-page .pdp-status-expiring_soon,
#product-detail-modal .pdp-status-expiring_soon {
    color: var(--amber-800) !important;

    background: var(--amber-50) !important;

    border:
        1px solid
        #efd696 !important;
}

#product-details-page .pdp-status-expired,
#product-details-page .pdp-status-out_of_stock,
#product-detail-modal .pdp-status-expired,
#product-detail-modal .pdp-status-out_of_stock {
    color: var(--red-700) !important;

    background: var(--red-50) !important;

    border:
        1px solid
        #efbbb6 !important;
}

#product-details-page .pdp-audit {
    display: grid !important;

    grid-template-columns:
        repeat(
            2,
            minmax(0, 1fr)
        ) !important;

    gap: 1px !important;

    overflow: hidden !important;

    background: var(--border) !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 9px !important;
}

#product-details-page .pdp-audit div {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;

    gap: 10px !important;

    padding: 10px 12px !important;

    background: #ffffff !important;
}

#product-details-page .pdp-audit span {
    color: var(--muted) !important;

    font-size: 10px !important;
    font-weight: 700 !important;
}

#product-details-page .pdp-audit strong {
    color: var(--text-2) !important;

    font-size: 10px !important;
    font-weight: 800 !important;
}

#product-details-page .pdp-state {
    display: flex !important;

    min-height: 280px !important;

    align-items: center !important;
    justify-content: center !important;

    flex-direction: column !important;

    gap: 9px !important;

    padding: 28px !important;

    color: var(--muted) !important;

    text-align: center !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 12px !important;
}

#product-details-page .pdp-state.error {
    color: var(--red-700) !important;

    background: var(--red-50) !important;

    border-color: #efbbb6 !important;
}

#product-details-page .pdp-state strong {
    font-size: 18px !important;
    font-weight: 850 !important;
}

#product-details-page .pdp-state span {
    max-width: 500px !important;

    font-size: 13px !important;
}

#product-details-page .pdp-state-actions {
    display: flex !important;

    gap: 8px !important;

    margin-top: 5px !important;
}

#product-details-page .pdp-spinner {
    width: 40px !important;
    height: 40px !important;

    border:
        4px solid
        var(--green-100) !important;

    border-top-color:
        var(--green-700) !important;

    border-radius: 50% !important;

    animation:
        pdp-spin
        0.7s
        linear
        infinite !important;
}

@keyframes pdp-spin {
    to {
        transform: rotate(360deg);
    }
}

#product-detail-modal {
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

    backdrop-filter:
        blur(5px) !important;
}

#product-detail-modal .pdm-dialog {
    display: flex !important;

    width:
        min(
            1050px,
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

#product-detail-modal .pdm-header {
    display: flex !important;

    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: space-between !important;

    gap: 18px !important;

    padding: 18px 20px !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--green-950),
            var(--green-800),
            var(--green-700)
        ) !important;
}

#product-detail-modal .pdm-header-main {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;

    gap: 12px !important;
}

#product-detail-modal .pdm-icon {
    display: grid !important;

    width: 44px !important;
    height: 44px !important;

    min-width: 44px !important;

    place-items: center !important;

    color: var(--green-900) !important;

    background: #ffffff !important;

    border-radius: 10px !important;
}

#product-detail-modal .pdm-kicker {
    display: block !important;

    color:
        rgba(
            255,
            255,
            255,
            0.72
        ) !important;

    font-size: 10px !important;
    font-weight: 850 !important;

    text-transform: uppercase !important;
}

#product-detail-modal .pdm-title {
    margin-top: 2px !important;

    color: #ffffff !important;

    font-size: 21px !important;
    font-weight: 900 !important;
}

#product-detail-modal .pdm-subtitle {
    display: block !important;

    margin-top: 2px !important;

    color:
        rgba(
            255,
            255,
            255,
            0.8
        ) !important;

    font-size: 12px !important;
    font-weight: 650 !important;
}

#product-detail-modal .pdm-close {
    display: grid !important;

    width: 42px !important;
    height: 42px !important;

    min-width: 42px !important;

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
            0.28
        ) !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#product-detail-modal .pdm-body {
    min-height: 0 !important;

    flex: 1 !important;

    padding: 16px !important;

    overflow-y: auto !important;

    background: var(--page) !important;
}

#product-detail-modal .pdm-summary {
    display: grid !important;

    grid-template-columns:
        repeat(
            4,
            minmax(0, 1fr)
        ) !important;

    gap: 9px !important;

    margin-bottom: 13px !important;
}

#product-detail-modal .pdm-summary-card {
    display: flex !important;

    min-height: 86px !important;

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

#product-detail-modal .pdm-summary-card.green {
    background: var(--green-50) !important;

    border-color: #b8dfc3 !important;
}

#product-detail-modal .pdm-summary-card.blue {
    background: var(--blue-50) !important;

    border-color: #bddaff !important;
}

#product-detail-modal .pdm-summary-card span {
    color: var(--muted) !important;

    font-size: 9px !important;
    font-weight: 850 !important;

    text-transform: uppercase !important;
}

#product-detail-modal .pdm-summary-card strong {
    color: var(--text) !important;

    font-size: 15px !important;
    font-weight: 900 !important;

    overflow-wrap: anywhere !important;
}

#product-detail-modal .pdm-summary-card.green strong {
    color: var(--green-900) !important;
}

#product-detail-modal .pdm-summary-card.blue strong {
    color: var(--blue-700) !important;
}

#product-detail-modal .pdm-summary-card small {
    color: var(--muted) !important;

    font-size: 9px !important;
    font-weight: 650 !important;
}

#product-detail-modal .pdm-section {
    overflow: hidden !important;

    margin-top: 11px !important;

    background: #ffffff !important;

    border:
        1px solid
        #d7e1d9 !important;

    border-radius: 10px !important;
}

#product-detail-modal .pdm-section-head {
    display: flex !important;

    align-items: center !important;

    gap: 8px !important;

    padding: 11px 13px !important;

    background: #f8faf9 !important;

    border-bottom:
        1px solid
        #e3e9e4 !important;
}

#product-detail-modal .pdm-section-head svg {
    color: var(--green-700) !important;
}

#product-detail-modal .pdm-section-head h3 {
    color: var(--text) !important;

    font-size: 13px !important;
    font-weight: 900 !important;
}

#product-detail-modal .pdm-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            4,
            minmax(0, 1fr)
        ) !important;

    gap: 1px !important;

    background: #e7ece8 !important;
}

#product-detail-modal .pdm-item {
    display: flex !important;

    min-height: 72px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 4px !important;

    padding: 10px 11px !important;

    background: #ffffff !important;
}

#product-detail-modal .pdm-item span {
    color: var(--muted) !important;

    font-size: 9px !important;
    font-weight: 850 !important;

    text-transform: uppercase !important;
}

#product-detail-modal .pdm-item strong {
    color: var(--text-2) !important;

    font-size: 11px !important;
    font-weight: 800 !important;

    overflow-wrap: anywhere !important;
}

#product-detail-modal .pdm-table-wrap {
    width: 100% !important;

    overflow-x: auto !important;
}

#product-detail-modal .pdm-table {
    width: 100% !important;

    min-width: 900px !important;

    border-collapse: collapse !important;
}

#product-detail-modal .pdm-table th {
    padding: 10px 11px !important;

    color: var(--text-2) !important;

    font-size: 9px !important;
    font-weight: 850 !important;

    text-align: left !important;
    text-transform: uppercase !important;

    background: #eef3ef !important;

    border-bottom:
        1px solid
        #d7e0d9 !important;
}

#product-detail-modal .pdm-table td {
    padding: 11px !important;

    color: var(--text-2) !important;

    font-size: 10px !important;
    font-weight: 700 !important;

    vertical-align: middle !important;

    border-bottom:
        1px solid
        #e7ece8 !important;
}

#product-detail-modal .pdm-table tbody tr:last-child td {
    border-bottom: 0 !important;
}

#product-detail-modal .pdm-cost {
    color: var(--blue-700) !important;

    font-weight: 900 !important;
}

#product-detail-modal .pdm-sale,
#product-detail-modal .pdm-stock {
    color: var(--green-900) !important;

    font-weight: 900 !important;
}

#product-detail-modal .pdm-table-sub {
    display: block !important;

    margin-top: 2px !important;

    color: var(--muted) !important;

    font-size: 8px !important;
    font-weight: 650 !important;
}

#product-detail-modal .pdm-row-button {
    display: inline-flex !important;

    min-height: 32px !important;

    align-items: center !important;
    justify-content: center !important;

    gap: 5px !important;

    padding: 5px 8px !important;

    color: var(--blue-700) !important;

    font-size: 9px !important;
    font-weight: 850 !important;

    background: var(--blue-50) !important;

    border:
        1px solid
        #bddaff !important;

    border-radius: 6px !important;

    cursor: pointer !important;
}

#product-detail-modal .pdm-empty {
    display: flex !important;

    min-height: 150px !important;

    align-items: center !important;
    justify-content: center !important;

    flex-direction: column !important;

    gap: 7px !important;

    padding: 20px !important;

    color: var(--muted) !important;

    text-align: center !important;
}

#product-detail-modal .pdm-notes {
    padding: 12px !important;

    color: var(--text-2) !important;

    font-size: 11px !important;
    font-weight: 650 !important;

    line-height: 1.55 !important;
}

#product-detail-modal .pdm-footer {
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

#product-detail-modal .pdm-footer button {
    min-height: 42px !important;

    padding: 8px 18px !important;

    color: #ffffff !important;

    font-size: 12px !important;
    font-weight: 850 !important;

    background: var(--green-700) !important;

    border:
        1px solid
        var(--green-700) !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

@media (max-width: 1050px) {
    #product-details-page .pdp-two-col {
        grid-template-columns:
            1fr !important;
    }

    #product-detail-modal .pdm-grid {
        grid-template-columns:
            repeat(
                3,
                minmax(0, 1fr)
            ) !important;
    }
}

@media (max-width: 850px) {
    #product-details-page .pdp-summary-grid,
    #product-detail-modal .pdm-summary {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #product-detail-modal .pdm-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }
}

@media (max-width: 700px) {
    #product-details-page .pdp-top {
        align-items: stretch !important;

        flex-direction: column !important;
    }

    #product-details-page .pdp-button {
        width: 100% !important;
    }

    #product-details-page .pdp-hero {
        grid-template-columns:
            1fr !important;
    }

    #product-details-page .pdp-title {
        font-size: 23px !important;
    }

    #product-details-page .pdp-info-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #product-detail-modal {
        align-items: flex-end !important;

        padding: 0 !important;
    }

    #product-detail-modal .pdm-dialog {
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
    #product-details-page .pdp-variant-stock-grid,
    #product-details-page .pdp-variant-meta,
    #product-detail-modal .pdm-summary,
    #product-detail-modal .pdm-grid,
    #product-details-page .pdp-audit {
        grid-template-columns:
            1fr !important;
    }
}
`;

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

    const [
        selectedVariant,
        setSelectedVariant,
    ] =
        useState<
            ProductVariant
            | null
        >(
            null,
        );

    const numericProductId =
        Number(
            productId,
        );

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

                setSelectedVariant(
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

    useEffect(
        () => {
            if (
                !selectedBatch
                && !selectedVariant
            ) {
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

                        setSelectedVariant(
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
            selectedVariant,
        ],
    );

    const stockRows =
        useMemo(
            () =>
                product
                    ? product
                        .price_options
                        .flatMap(
                            (
                                option,
                            ) =>
                                option
                                    .batches,
                        )
                    : [],
            [
                product,
            ],
        );

    const selectedVariantBatches =
        useMemo(
            () =>
                selectedVariant
                    ? stockRows
                        .filter(
                            (
                                batch,
                            ) =>
                                batch
                                    .product_variant_id
                                === selectedVariant
                                    .id,
                        )
                    : [],
            [
                selectedVariant,
                stockRows,
            ],
        );

    const goBackToProducts =
        (): void => {
            navigate(
                '/admin/products',
            );
        };

    const closeModals =
        (): void => {
            setSelectedBatch(
                null,
            );

            setSelectedVariant(
                null,
            );
        };

    const openBatch =
        (
            batch:
                ProductBatch,
        ): void => {
            setSelectedVariant(
                null,
            );

            setSelectedBatch(
                batch,
            );
        };

    const openVariant =
        (
            variant:
                ProductVariant,
        ): void => {
            setSelectedBatch(
                null,
            );

            setSelectedVariant(
                variant,
            );
        };

    if (
        isLoading
    ) {
        return (
            <div id="product-details-page">
                <style>
                    {pageStyles}
                </style>

                <section className="pdp-state">
                    <div className="pdp-spinner" />

                    <strong>
                        Loading Product Details
                    </strong>

                    <span>
                        Retrieving product,
                        stock and pricing
                        information.
                    </span>
                </section>
            </div>
        );
    }

    if (
        errorMessage
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
                    <Icon name="alert" />

                    <strong>
                        Unable to Load Product
                    </strong>

                    <span>
                        {errorMessage
                            || 'Product details were not found.'}
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

    const hasVariants =
        product.has_variants
        && product
            .variants
            .length > 0;

    const formatSummaryStock =
        (
            field:
                | 'total_available_quantity'
                | 'saleable_quantity'
                | 'expired_quantity',
        ): string => {
            const entries =
                product
                    .summary
                    .stock_by_unit
                ?? [];

            const nonZero =
                entries
                    .filter(
                        (
                            entry,
                        ) =>
                            Math.abs(
                                Number(
                                    entry[
                                    field
                                    ],
                                ),
                            ) > 0.000001,
                    );

            const displayEntries =
                nonZero.length > 0
                    ? nonZero
                    : entries;

            if (
                displayEntries
                    .length === 0
            ) {
                return `0 ${product.unit}`;
            }

            return displayEntries
                .map(
                    (
                        entry,
                    ) =>
                        `${formatQuantity(
                            entry[
                            field
                            ],
                        )} ${entry.unit}`,
                )
                .join(' + ');
        };

    const availableStockText =
        formatSummaryStock(
            'total_available_quantity',
        );

    const saleableStockText =
        formatSummaryStock(
            'saleable_quantity',
        );

    const expiredStockText =
        formatSummaryStock(
            'expired_quantity',
        );

    const receivedByPurchaseUnit =
        (() => {
            const totals =
                new Map<
                    string,
                    number
                >();

            stockRows.forEach(
                (
                    batch,
                ) => {
                    const unit =
                        getPrimaryUnit(
                            batch,
                            product.unit,
                        );

                    const quantity =
                        Number(
                            batch
                                .received_purchase_quantity
                            ?? batch
                                .purchased_quantity
                            ?? 0,
                        );

                    totals.set(
                        unit,
                        (
                            totals.get(
                                unit,
                            )
                            ?? 0
                        )
                        + (
                            Number.isFinite(
                                quantity,
                            )
                                ? quantity
                                : 0
                        ),
                    );
                },
            );

            return totals.size
                === 0
                ? `0 ${product.unit}`
                : Array
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
        })();

    const getVariantSummary =
        (
            variantId:
                number,
        ) =>
            product
                .variant_stock
                .find(
                    (
                        row,
                    ) =>
                        row
                            .variant_id
                        === variantId,
                );

    const variantModal =
        selectedVariant
            && typeof document
            !== 'undefined'
            ? (() => {
                const fallbackUnit =
                    selectedVariant
                        .package_unit
                    || product
                        .unit
                    || 'Unit';

                const availableText =
                    groupBatchStock(
                        selectedVariantBatches,
                        fallbackUnit,
                    );

                const saleableText =
                    groupBatchStock(
                        selectedVariantBatches,
                        fallbackUnit,
                        true,
                    );

                const costRange =
                    formatPriceRange(
                        selectedVariantBatches
                            .map(
                                (
                                    batch,
                                ) =>
                                    batch
                                        .unit_cost,
                            ),
                    );

                const sellingRange =
                    formatPriceRange(
                        selectedVariantBatches
                            .map(
                                (
                                    batch,
                                ) =>
                                    batch
                                        .selling_price,
                            ),
                    );

                return createPortal(
                    <div
                        id="product-detail-modal"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (
                                event.target
                                === event.currentTarget
                            ) {
                                closeModals();
                            }
                        }}
                    >
                        <section
                            className="pdm-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="variant-modal-title"
                            onMouseDown={(event) => {
                                event.stopPropagation();
                            }}
                        >
                            <header className="pdm-header">
                                <div className="pdm-header-main">
                                    <span className="pdm-icon">
                                        <Icon name="money" />
                                    </span>

                                    <div>
                                        <span className="pdm-kicker">
                                            Variant Price &amp; Stock
                                        </span>

                                        <h2
                                            id="variant-modal-title"
                                            className="pdm-title"
                                        >
                                            {
                                                selectedVariant
                                                    .display_name
                                            }
                                        </h2>

                                        <span className="pdm-subtitle">
                                            {
                                                product.name
                                            }

                                            {' • '}

                                            {
                                                selectedVariant
                                                    .sku
                                            }
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="pdm-close"
                                    aria-label="Close variant details"
                                    onClick={
                                        closeModals
                                    }
                                >
                                    <Icon name="close" />
                                </button>
                            </header>

                            <div className="pdm-body">
                                <section className="pdm-summary">
                                    <article className="pdm-summary-card green">
                                        <span>
                                            Available Stock
                                        </span>

                                        <strong>
                                            {
                                                availableText
                                            }
                                        </strong>

                                        <small>
                                            Current physical stock
                                        </small>
                                    </article>

                                    <article className="pdm-summary-card">
                                        <span>
                                            Saleable Stock
                                        </span>

                                        <strong>
                                            {
                                                saleableText
                                            }
                                        </strong>

                                        <small>
                                            Excludes expired stock
                                        </small>
                                    </article>

                                    <article className="pdm-summary-card blue">
                                        <span>
                                            Cost Price
                                        </span>

                                        <strong>
                                            {
                                                costRange
                                            }
                                        </strong>

                                        <small>
                                            Batch cost range
                                        </small>
                                    </article>

                                    <article className="pdm-summary-card green">
                                        <span>
                                            Selling Price
                                        </span>

                                        <strong>
                                            {
                                                sellingRange
                                            }
                                        </strong>

                                        <small>
                                            Batch selling range
                                        </small>
                                    </article>
                                </section>

                                <section className="pdm-section">
                                    <header className="pdm-section-head">
                                        <Icon name="money" />

                                        <h3>
                                            Cost, Selling Price &amp; Stock Availability
                                        </h3>
                                    </header>

                                    {selectedVariantBatches
                                        .length === 0 ? (
                                        <div className="pdm-empty">
                                            <Icon name="stock" />

                                            <strong>
                                                No Stock Records
                                            </strong>

                                            <span>
                                                This variant has no purchase or stock batch records yet.
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="pdm-table-wrap">
                                            <table className="pdm-table">
                                                <thead>
                                                    <tr>
                                                        <th>
                                                            Stock Reference
                                                        </th>

                                                        <th>
                                                            Cost Price
                                                        </th>

                                                        <th>
                                                            Selling Price
                                                        </th>

                                                        <th>
                                                            Available
                                                        </th>

                                                        <th>
                                                            Status
                                                        </th>

                                                        <th>
                                                            Expiry
                                                        </th>

                                                        <th>
                                                            Supplier
                                                        </th>

                                                        <th>
                                                            Details
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {selectedVariantBatches
                                                        .map(
                                                            (
                                                                batch,
                                                            ) => {
                                                                const unit =
                                                                    getStockUnit(
                                                                        batch,
                                                                        fallbackUnit,
                                                                    );

                                                                const primaryUnit =
                                                                    getPrimaryUnit(
                                                                        batch,
                                                                        fallbackUnit,
                                                                    );

                                                                return (
                                                                    <tr
                                                                        key={
                                                                            batch.id
                                                                        }
                                                                    >
                                                                        <td>
                                                                            <strong>
                                                                                {
                                                                                    getBatchReference(
                                                                                        batch,
                                                                                    )
                                                                                }
                                                                            </strong>

                                                                            <span className="pdm-table-sub">
                                                                                Stock ID #{batch.id}
                                                                            </span>
                                                                        </td>

                                                                        <td>
                                                                            <span className="pdm-cost">
                                                                                {formatCurrency(
                                                                                    batch
                                                                                        .unit_cost,
                                                                                )}
                                                                            </span>

                                                                            <span className="pdm-table-sub">
                                                                                per {primaryUnit}
                                                                            </span>
                                                                        </td>

                                                                        <td>
                                                                            <span className="pdm-sale">
                                                                                {formatCurrency(
                                                                                    batch
                                                                                        .selling_price,
                                                                                )}
                                                                            </span>

                                                                            <span className="pdm-table-sub">
                                                                                per {primaryUnit}
                                                                            </span>
                                                                        </td>

                                                                        <td>
                                                                            <span className="pdm-stock">
                                                                                {formatQuantity(
                                                                                    batch
                                                                                        .available_quantity,
                                                                                )}

                                                                                {' '}

                                                                                {
                                                                                    unit
                                                                                }
                                                                            </span>
                                                                        </td>

                                                                        <td>
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
                                                                        </td>

                                                                        <td>
                                                                            {formatDate(
                                                                                batch
                                                                                    .expiry_date,
                                                                            )}
                                                                        </td>

                                                                        <td>
                                                                            {batch
                                                                                .supplier
                                                                                ?.name
                                                                                ?? 'Not available'}
                                                                        </td>

                                                                        <td>
                                                                            <button
                                                                                type="button"
                                                                                className="pdm-row-button"
                                                                                onClick={() => {
                                                                                    openBatch(
                                                                                        batch,
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <Icon name="eye" />

                                                                                View Batch
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            },
                                                        )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>

                                <section className="pdm-section">
                                    <header className="pdm-section-head">
                                        <Icon name="tag" />

                                        <h3>
                                            Variant Information
                                        </h3>
                                    </header>

                                    <div className="pdm-grid">
                                        <div className="pdm-item">
                                            <span>
                                                Variant
                                            </span>

                                            <strong>
                                                {
                                                    selectedVariant
                                                        .display_name
                                                }
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Package Unit
                                            </span>

                                            <strong>
                                                {
                                                    selectedVariant
                                                        .package_unit
                                                }
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                SKU
                                            </span>

                                            <strong>
                                                {
                                                    selectedVariant
                                                        .sku
                                                }
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Barcode
                                            </span>

                                            <strong>
                                                {selectedVariant
                                                    .barcode
                                                    ?? 'Not assigned'}
                                            </strong>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <footer className="pdm-footer">
                                <button
                                    type="button"
                                    onClick={
                                        closeModals
                                    }
                                >
                                    Close
                                </button>
                            </footer>
                        </section>
                    </div>,
                    document.body,
                );
            })()
            : null;

    const batchModal =
        selectedBatch
            && typeof document
            !== 'undefined'
            ? (() => {
                const reference =
                    getBatchReference(
                        selectedBatch,
                    );

                const stockUnit =
                    getStockUnit(
                        selectedBatch,
                        product.unit,
                    );

                const primaryUnit =
                    getPrimaryUnit(
                        selectedBatch,
                        product.unit,
                    );

                return createPortal(
                    <div
                        id="product-detail-modal"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (
                                event.target
                                === event.currentTarget
                            ) {
                                closeModals();
                            }
                        }}
                    >
                        <section
                            className="pdm-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="batch-modal-title"
                            onMouseDown={(event) => {
                                event.stopPropagation();
                            }}
                        >
                            <header className="pdm-header">
                                <div className="pdm-header-main">
                                    <span className="pdm-icon">
                                        <Icon name="layers" />
                                    </span>

                                    <div>
                                        <span className="pdm-kicker">
                                            Stock Batch Details
                                        </span>

                                        <h2
                                            id="batch-modal-title"
                                            className="pdm-title"
                                        >
                                            {
                                                reference
                                            }
                                        </h2>

                                        <span className="pdm-subtitle">
                                            {
                                                product.name
                                            }

                                            {selectedBatch
                                                .variant
                                                ? ` • ${selectedBatch.variant.display_name}`
                                                : ''}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="pdm-close"
                                    aria-label="Close batch details"
                                    onClick={
                                        closeModals
                                    }
                                >
                                    <Icon name="close" />
                                </button>
                            </header>

                            <div className="pdm-body">
                                <section className="pdm-summary">
                                    <article className="pdm-summary-card green">
                                        <span>
                                            Selling Price
                                        </span>

                                        <strong>
                                            {formatCurrency(
                                                selectedBatch
                                                    .selling_price,
                                            )}
                                        </strong>

                                        <small>
                                            per
                                            {' '}
                                            {
                                                primaryUnit
                                            }
                                        </small>
                                    </article>

                                    <article className="pdm-summary-card blue">
                                        <span>
                                            Purchase Cost
                                        </span>

                                        <strong>
                                            {formatCurrency(
                                                selectedBatch
                                                    .unit_cost,
                                            )}
                                        </strong>

                                        <small>
                                            per
                                            {' '}
                                            {
                                                primaryUnit
                                            }
                                        </small>
                                    </article>

                                    <article className="pdm-summary-card">
                                        <span>
                                            Profit Per Unit
                                        </span>

                                        <strong>
                                            {formatCurrency(
                                                selectedBatch
                                                    .profit_per_unit,
                                            )}
                                        </strong>

                                        <small>
                                            per
                                            {' '}
                                            {
                                                primaryUnit
                                            }
                                        </small>
                                    </article>

                                    <article className="pdm-summary-card green">
                                        <span>
                                            Available Stock
                                        </span>

                                        <strong>
                                            {formatQuantity(
                                                selectedBatch
                                                    .available_quantity,
                                            )}

                                            {' '}

                                            {
                                                stockUnit
                                            }
                                        </strong>

                                        <small>
                                            Physical stock
                                        </small>
                                    </article>
                                </section>

                                <section className="pdm-section">
                                    <header className="pdm-section-head">
                                        <Icon name="layers" />

                                        <h3>
                                            Batch Information
                                        </h3>
                                    </header>

                                    <div className="pdm-grid">
                                        <div className="pdm-item">
                                            <span>
                                                Reference
                                            </span>

                                            <strong>
                                                {
                                                    reference
                                                }
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Variant
                                            </span>

                                            <strong>
                                                {selectedBatch
                                                    .variant
                                                    ?.display_name
                                                    ?? 'Standard Product'}
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Status
                                            </span>

                                            <strong>
                                                {getStatusLabel(
                                                    selectedBatch
                                                        .status,
                                                )}
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Stock Unit
                                            </span>

                                            <strong>
                                                {
                                                    stockUnit
                                                }
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Purchased Qty
                                            </span>

                                            <strong>
                                                {formatQuantity(
                                                    selectedBatch
                                                        .purchased_quantity,
                                                )}

                                                {' '}

                                                {
                                                    primaryUnit
                                                }
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Received Qty
                                            </span>

                                            <strong>
                                                {formatQuantity(
                                                    selectedBatch
                                                        .received_quantity,
                                                )}

                                                {' '}

                                                {
                                                    stockUnit
                                                }
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Available Qty
                                            </span>

                                            <strong>
                                                {formatQuantity(
                                                    selectedBatch
                                                        .available_quantity,
                                                )}

                                                {' '}

                                                {
                                                    stockUnit
                                                }
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Batch Number
                                            </span>

                                            <strong>
                                                {selectedBatch
                                                    .batch_number
                                                    ?? 'Not provided'}
                                            </strong>
                                        </div>
                                    </div>
                                </section>

                                <section className="pdm-section">
                                    <header className="pdm-section-head">
                                        <Icon name="money" />

                                        <h3>
                                            Pricing Information
                                        </h3>
                                    </header>

                                    <div className="pdm-grid">
                                        <div className="pdm-item">
                                            <span>
                                                Purchase Cost
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    selectedBatch
                                                        .unit_cost,
                                                )}

                                                {' / '}

                                                {
                                                    primaryUnit
                                                }
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Selling Price
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    selectedBatch
                                                        .selling_price,
                                                )}

                                                {' / '}

                                                {
                                                    primaryUnit
                                                }
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Profit Per Unit
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    selectedBatch
                                                        .profit_per_unit,
                                                )}

                                                {' / '}

                                                {
                                                    primaryUnit
                                                }
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Current Cost Value
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    selectedBatch
                                                        .current_cost_value,
                                                )}
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Current Sale Value
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    selectedBatch
                                                        .current_sale_value,
                                                )}
                                            </strong>
                                        </div>

                                        {selectedBatch
                                            .is_dual_unit && (
                                                <>
                                                    <div className="pdm-item">
                                                        <span>
                                                            Loose Unit
                                                        </span>

                                                        <strong>
                                                            {selectedBatch
                                                                .secondary_unit
                                                                ?? stockUnit}
                                                        </strong>
                                                    </div>

                                                    <div className="pdm-item">
                                                        <span>
                                                            Conversion
                                                        </span>

                                                        <strong>
                                                            1
                                                            {' '}

                                                            {
                                                                primaryUnit
                                                            }

                                                            {' = '}

                                                            {formatQuantity(
                                                                selectedBatch
                                                                    .conversion_factor,
                                                            )}

                                                            {' '}

                                                            {selectedBatch
                                                                .secondary_unit
                                                                ?? stockUnit}
                                                        </strong>
                                                    </div>

                                                    <div className="pdm-item">
                                                        <span>
                                                            Loose Selling Price
                                                        </span>

                                                        <strong>
                                                            {formatCurrency(
                                                                selectedBatch
                                                                    .secondary_selling_price,
                                                            )}

                                                            {' / '}

                                                            {selectedBatch
                                                                .secondary_unit
                                                                ?? stockUnit}
                                                        </strong>
                                                    </div>
                                                </>
                                            )}
                                    </div>
                                </section>

                                <section className="pdm-section">
                                    <header className="pdm-section-head">
                                        <Icon name="calendar" />

                                        <h3>
                                            Dates
                                        </h3>
                                    </header>

                                    <div className="pdm-grid">
                                        <div className="pdm-item">
                                            <span>
                                                Manufactured
                                            </span>

                                            <strong>
                                                {formatDate(
                                                    selectedBatch
                                                        .manufactured_date,
                                                )}
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Expiry
                                            </span>

                                            <strong>
                                                {formatDate(
                                                    selectedBatch
                                                        .expiry_date,
                                                )}
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Received At
                                            </span>

                                            <strong>
                                                {formatDateTime(
                                                    selectedBatch
                                                        .received_at,
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                </section>

                                <section className="pdm-section">
                                    <header className="pdm-section-head">
                                        <Icon name="truck" />

                                        <h3>
                                            Purchase &amp; Supplier
                                        </h3>
                                    </header>

                                    <div className="pdm-grid">
                                        <div className="pdm-item">
                                            <span>
                                                Supplier
                                            </span>

                                            <strong>
                                                {selectedBatch
                                                    .supplier
                                                    ?.name
                                                    ?? 'Not available'}
                                            </strong>
                                        </div>

                                        <div className="pdm-item">
                                            <span>
                                                Purchase
                                            </span>

                                            <strong>
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

                                        <div className="pdm-item">
                                            <span>
                                                Purchase Date
                                            </span>

                                            <strong>
                                                {formatDate(
                                                    selectedBatch
                                                        .purchase_date,
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                </section>

                                <section className="pdm-section">
                                    <header className="pdm-section-head">
                                        <Icon name="tag" />

                                        <h3>
                                            Notes
                                        </h3>
                                    </header>

                                    <div className="pdm-notes">
                                        {selectedBatch
                                            .notes
                                            || 'No notes added for this stock batch.'}
                                    </div>
                                </section>
                            </div>

                            <footer className="pdm-footer">
                                <button
                                    type="button"
                                    onClick={
                                        closeModals
                                    }
                                >
                                    Close
                                </button>
                            </footer>
                        </section>
                    </div>,
                    document.body,
                );
            })()
            : null;

    return (
        <>
            <div id="product-details-page">
                <style>
                    {pageStyles}
                </style>

                <div className="pdp-top">
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

                    <span>
                        Product ID
                        {' #'}

                        {
                            numericProductId
                        }
                    </span>
                </div>

                <header className="pdp-hero">
                    <div className="pdp-hero-main">
                        <span className="pdp-product-icon">
                            <Icon name="box" />
                        </span>

                        <div>
                            <span className="pdp-eyebrow">
                                Product &amp; Inventory
                            </span>

                            <h1 className="pdp-title">
                                {
                                    product.name
                                }
                            </h1>

                            <div className="pdp-meta">
                                <span className="pdp-chip">
                                    <Icon name="category" />

                                    {product
                                        .category
                                        ?.name
                                        ?? 'General'}
                                </span>

                                <span className="pdp-chip">
                                    <Icon name="tag" />

                                    SKU:
                                    {' '}

                                    {
                                        product.sku
                                    }
                                </span>

                                <span className="pdp-chip">
                                    <Icon name="layers" />

                                    Unit:
                                    {' '}

                                    {
                                        product.unit
                                    }
                                </span>

                                {hasVariants && (
                                    <span className="pdp-chip">
                                        <Icon name="layers" />

                                        {
                                            product
                                                .variants
                                                .length
                                        }

                                        {' '}

                                        {product
                                            .variants
                                            .length === 1
                                            ? 'Variant'
                                            : 'Variants'}
                                    </span>
                                )}

                                {product.barcode && (
                                    <span className="pdp-chip">
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
                                ? 'pdp-active'
                                : 'pdp-inactive'
                        }
                    >
                        {product.is_active
                            ? 'Active Product'
                            : 'Inactive Product'}
                    </span>
                </header>

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

                <section className="pdp-two-col">
                    <section className="pdp-panel">
                        <header className="pdp-panel-head">
                            <div>
                                <h2 className="pdp-panel-title">
                                    Product Information
                                </h2>

                                <p className="pdp-panel-desc">
                                    Main product identification information.
                                </p>
                            </div>
                        </header>

                        <div className="pdp-info-grid">
                            <div className="pdp-info">
                                <span>
                                    SKU
                                </span>

                                <strong>
                                    {
                                        product.sku
                                    }
                                </strong>
                            </div>

                            <div className="pdp-info">
                                <span>
                                    Barcode
                                </span>

                                <strong>
                                    {product
                                        .barcode
                                        ?? 'Not assigned'}
                                </strong>
                            </div>

                            <div className="pdp-info">
                                <span>
                                    Main Unit
                                </span>

                                <strong>
                                    {
                                        product.unit
                                    }
                                </strong>
                            </div>

                            <div className="pdp-info">
                                <span>
                                    Category
                                </span>

                                <strong>
                                    {product
                                        .category
                                        ?.name
                                        ?? 'General'}
                                </strong>
                            </div>

                            <div className="pdp-info">
                                <span>
                                    Status
                                </span>

                                <strong>
                                    {product.is_active
                                        ? 'Active'
                                        : 'Inactive'}
                                </strong>
                            </div>

                            <div className="pdp-info">
                                <span>
                                    Variants
                                </span>

                                <strong>
                                    {hasVariants
                                        ? `${product.variants.length} ${product.variants.length === 1 ? 'Variant' : 'Variants'}`
                                        : 'No variants'}
                                </strong>
                            </div>
                        </div>
                    </section>

                    <section className="pdp-panel">
                        <header className="pdp-panel-head">
                            <div>
                                <h2 className="pdp-panel-title">
                                    Stock Overview
                                </h2>

                                <p className="pdp-panel-desc">
                                    Current inventory overview.
                                </p>
                            </div>
                        </header>

                        <div className="pdp-overview-grid">
                            <article className="pdp-overview">
                                <span>
                                    Price Options
                                </span>

                                <strong>
                                    {
                                        product
                                            .summary
                                            .number_of_price_options
                                    }
                                </strong>
                            </article>

                            <article className="pdp-overview">
                                <span>
                                    Stock Entries
                                </span>

                                <strong>
                                    {
                                        stockRows.length
                                    }
                                </strong>
                            </article>

                            <article className="pdp-overview">
                                <span>
                                    Variants
                                </span>

                                <strong>
                                    {
                                        product
                                            .summary
                                            .number_of_variants
                                    }
                                </strong>
                            </article>

                            <article className="pdp-overview highlight">
                                <span>
                                    Available
                                </span>

                                <strong>
                                    {
                                        availableStockText
                                    }
                                </strong>
                            </article>

                            <article className="pdp-overview highlight">
                                <span>
                                    Saleable
                                </span>

                                <strong>
                                    {
                                        saleableStockText
                                    }
                                </strong>
                            </article>

                            <article className="pdp-overview">
                                <span>
                                    Total Received
                                </span>

                                <strong>
                                    {
                                        receivedByPurchaseUnit
                                    }
                                </strong>
                            </article>

                            <article className="pdp-overview">
                                <span>
                                    Expired
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

                {hasVariants && (
                    <section className="pdp-panel">
                        <header className="pdp-panel-head">
                            <div>
                                <h2 className="pdp-panel-title">
                                    Product Variants &amp; Available Stock
                                </h2>

                                <p className="pdp-panel-desc">
                                    Select View Price &amp; Stock on a variant to see every cost price, selling price and the stock remaining for each batch.
                                </p>
                            </div>

                            <span className="pdp-badge">
                                {
                                    product
                                        .variants
                                        .length
                                }

                                {' '}

                                {product
                                    .variants
                                    .length === 1
                                    ? 'Variant'
                                    : 'Variants'}
                            </span>
                        </header>

                        <div className="pdp-variant-wrap">
                            <div className="pdp-variant-grid">
                                {product
                                    .variants
                                    .map(
                                        (
                                            variant,
                                        ) => {
                                            const summary =
                                                getVariantSummary(
                                                    variant.id,
                                                );

                                            const availableText =
                                                formatStockEntries(
                                                    variant
                                                        .available_stock_by_unit
                                                    ?? [],
                                                    variant
                                                        .package_unit
                                                    || product
                                                        .unit
                                                    || 'Unit',
                                                );

                                            const stockUnit =
                                                summary
                                                    ?.stock_unit
                                                || variant
                                                    .package_unit
                                                || product
                                                    .unit
                                                || 'Unit';

                                            return (
                                                <article
                                                    key={
                                                        variant.id
                                                    }
                                                    className="pdp-variant-card"
                                                >
                                                    <div className="pdp-variant-head">
                                                        <div>
                                                            <strong className="pdp-variant-title">
                                                                {
                                                                    variant
                                                                        .display_name
                                                                }
                                                            </strong>

                                                            <span className="pdp-variant-sub">
                                                                {formatQuantity(
                                                                    variant
                                                                        .size_value,
                                                                )}

                                                                {' '}

                                                                {
                                                                    variant
                                                                        .size_unit
                                                                }

                                                                {' • '}

                                                                {
                                                                    variant
                                                                        .package_unit
                                                                }
                                                            </span>
                                                        </div>

                                                        <span
                                                            className={
                                                                variant
                                                                    .is_active
                                                                    ? 'pdp-variant-status active'
                                                                    : 'pdp-variant-status inactive'
                                                            }
                                                        >
                                                            {variant
                                                                .is_active
                                                                ? 'Active'
                                                                : 'Inactive'}
                                                        </span>
                                                    </div>

                                                    <div className="pdp-variant-stock-grid">
                                                        <div className="pdp-variant-stock highlight">
                                                            <span>
                                                                Available Stock
                                                            </span>

                                                            <strong>
                                                                {
                                                                    availableText
                                                                }
                                                            </strong>
                                                        </div>

                                                        <div className="pdp-variant-stock">
                                                            <span>
                                                                Saleable Stock
                                                            </span>

                                                            <strong>
                                                                {formatQuantity(
                                                                    summary
                                                                        ?.saleable_quantity
                                                                    ?? 0,
                                                                )}

                                                                {' '}

                                                                {
                                                                    stockUnit
                                                                }
                                                            </strong>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="pdp-variant-button"
                                                        onClick={() => {
                                                            openVariant(
                                                                variant,
                                                            );
                                                        }}
                                                    >
                                                        <Icon name="money" />

                                                        View Price &amp; Stock
                                                    </button>

                                                    <div className="pdp-variant-meta">
                                                        <div>
                                                            <span>
                                                                Variant SKU
                                                            </span>

                                                            <strong
                                                                title={
                                                                    variant
                                                                        .sku
                                                                }
                                                            >
                                                                {
                                                                    variant
                                                                        .sku
                                                                }
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>
                                                                Barcode
                                                            </span>

                                                            <strong
                                                                title={
                                                                    variant
                                                                        .barcode
                                                                    ?? 'Not assigned'
                                                                }
                                                            >
                                                                {variant
                                                                    .barcode
                                                                    ?? 'Not assigned'}
                                                            </strong>
                                                        </div>
                                                    </div>

                                                    <div className="pdp-variant-footer">
                                                        <span>
                                                            Stock Batches
                                                        </span>

                                                        <strong>
                                                            {summary
                                                                ?.batch_count
                                                                ?? 0}
                                                        </strong>
                                                    </div>
                                                </article>
                                            );
                                        },
                                    )}
                            </div>
                        </div>
                    </section>
                )}

                <section className="pdp-panel">
                    <header className="pdp-panel-head">
                        <div>
                            <h2 className="pdp-panel-title">
                                Stock &amp; Price Details
                            </h2>

                            <p className="pdp-panel-desc">
                                All physical stock batches with their exact variant, cost, selling price and remaining stock.
                            </p>
                        </div>

                        <span className="pdp-badge">
                            {
                                stockRows.length
                            }

                            {' '}

                            {stockRows.length
                                === 1
                                ? 'Stock Entry'
                                : 'Stock Entries'}
                        </span>
                    </header>

                    {stockRows.length === 0 ? (
                        <div className="pdp-state">
                            <Icon name="stock" />

                            <strong>
                                No Stock Received
                            </strong>

                            <span>
                                This product has no received stock entries.
                            </span>
                        </div>
                    ) : (
                        <div className="pdp-stock-wrap">
                            <div className="pdp-stock-table-wrap">
                                <table className="pdp-stock-table">
                                    <thead>
                                        <tr>
                                            <th>
                                                Stock Reference
                                            </th>

                                            <th>
                                                Variant
                                            </th>

                                            <th>
                                                Status
                                            </th>

                                            <th>
                                                Cost Price
                                            </th>

                                            <th>
                                                Selling Price
                                            </th>

                                            <th>
                                                Available
                                            </th>

                                            <th>
                                                Expiry
                                            </th>

                                            <th>
                                                Supplier
                                            </th>

                                            <th>
                                                Details
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {stockRows.map(
                                            (
                                                batch,
                                            ) => {
                                                const stockUnit =
                                                    getStockUnit(
                                                        batch,
                                                        product
                                                            .unit,
                                                    );

                                                const primaryUnit =
                                                    getPrimaryUnit(
                                                        batch,
                                                        product
                                                            .unit,
                                                    );

                                                return (
                                                    <tr
                                                        key={
                                                            batch.id
                                                        }
                                                    >
                                                        <td>
                                                            <strong>
                                                                {getBatchReference(
                                                                    batch,
                                                                )}
                                                            </strong>

                                                            <span className="pdp-sub">
                                                                Stock ID #{batch.id}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <strong>
                                                                {batch
                                                                    .variant
                                                                    ?.display_name
                                                                    ?? 'Standard Product'}
                                                            </strong>

                                                            {batch.variant && (
                                                                <span className="pdp-sub">
                                                                    {
                                                                        batch
                                                                            .variant
                                                                            .sku
                                                                    }
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td>
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
                                                        </td>

                                                        <td>
                                                            <span className="pdp-cost">
                                                                {formatCurrency(
                                                                    batch
                                                                        .unit_cost,
                                                                )}
                                                            </span>

                                                            <span className="pdp-sub">
                                                                per
                                                                {' '}

                                                                {
                                                                    primaryUnit
                                                                }
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <span className="pdp-selling">
                                                                {formatCurrency(
                                                                    batch
                                                                        .selling_price,
                                                                )}
                                                            </span>

                                                            <span className="pdp-sub">
                                                                per
                                                                {' '}

                                                                {
                                                                    primaryUnit
                                                                }
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <span className="pdp-stock-qty">
                                                                {formatQuantity(
                                                                    batch
                                                                        .available_quantity,
                                                                )}

                                                                {' '}

                                                                {
                                                                    stockUnit
                                                                }
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {formatDate(
                                                                batch
                                                                    .expiry_date,
                                                            )}
                                                        </td>

                                                        <td>
                                                            {batch
                                                                .supplier
                                                                ?.name
                                                                ?? 'Not available'}
                                                        </td>

                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="pdp-view"
                                                                onClick={() => {
                                                                    openBatch(
                                                                        batch,
                                                                    );
                                                                }}
                                                            >
                                                                <Icon name="eye" />

                                                                View Details
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            },
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </section>

                <footer className="pdp-audit">
                    <div>
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

                    <div>
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

            {variantModal}

            {batchModal}
        </>
    );
}