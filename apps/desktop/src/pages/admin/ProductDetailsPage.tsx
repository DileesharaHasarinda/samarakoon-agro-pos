import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

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

const currencyFormatter =
    new Intl.NumberFormat(
        'en-GB',
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
    value: number | null,
): string {
    if (value === null) {
        return 'Not available';
    }

    return currencyFormatter.format(value);
}

function formatQuantity(
    value: number,
): string {
    return quantityFormatter.format(value);
}

function formatDate(
    value: string | null,
): string {
    if (!value) {
        return 'Not provided';
    }

    const date = new Date(
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
    value: string | null,
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
            hour: '2-digit',
            minute: '2-digit',
        },
    ).format(date);
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

        default:
            return 'Available';
    }
}

function getStatusClass(
    status: ProductBatchStatus,
): string {
    return `pdp-badge pdp-badge-${status}`;
}

function getCostPriceText(
    priceOption: ProductPriceOption,
): string {
    const minimumCost =
        priceOption.cost_price_min;

    const maximumCost =
        priceOption.cost_price_max;

    if (
        minimumCost === null
        && maximumCost === null
    ) {
        return 'Not available';
    }

    if (minimumCost === null) {
        return formatCurrency(maximumCost);
    }

    if (maximumCost === null) {
        return formatCurrency(minimumCost);
    }

    if (minimumCost === maximumCost) {
        return formatCurrency(minimumCost);
    }

    return `${formatCurrency(minimumCost)} – ${formatCurrency(maximumCost)}`;
}

type IconName =
    | 'alert'
    | 'arrow-left'
    | 'barcode'
    | 'box'
    | 'calendar'
    | 'category'
    | 'clock'
    | 'layers'
    | 'money'
    | 'refresh'
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
                    <path d="M12 9v4M12 17h.01" />
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
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
            );

        case 'clock':
            return (
                <svg {...props}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
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
                    <rect x="3" y="6" width="18" height="12" rx="2" />
                    <path d="M7 10h.01M17 14h.01M12 9v6M10 11h3a1 1 0 0 1 0 2h-3" />
                </svg>
            );

        case 'refresh':
            return (
                <svg {...props}>
                    <path d="M20 11a8 8 0 1 0 2 5M20 4v7h-7" />
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
                    <circle cx="7" cy="18" r="2" />
                    <circle cx="18" cy="18" r="2" />
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
#product-details-page *::after {
    box-sizing: border-box !important;
}

#product-details-page {
    --pdp-green-950: #052e16;
    --pdp-green-900: #14532d;
    --pdp-green-800: #166534;
    --pdp-green-700: #15803d;
    --pdp-green-100: #dcfce7;
    --pdp-green-50: #f0fdf4;
    --pdp-blue-700: #175cd3;
    --pdp-blue-50: #eff8ff;
    --pdp-amber-700: #b54708;
    --pdp-amber-50: #fffaeb;
    --pdp-red-700: #b42318;
    --pdp-red-50: #fef3f2;
    --pdp-text: #101828;
    --pdp-text-secondary: #344054;
    --pdp-muted: #667085;
    --pdp-border: #d0d9d2;
    --pdp-border-strong: #aebdb2;
    --pdp-surface: #ffffff;
    --pdp-page: #f5f8f6;

    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    flex-direction: column !important;
    gap: 14px !important;
    margin: 0 !important;
    padding: 0 !important;
    color: var(--pdp-text) !important;
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
    background: transparent !important;
    isolation: isolate !important;
    -webkit-font-smoothing: antialiased !important;
}

#product-details-page button,
#product-details-page input,
#product-details-page select,
#product-details-page textarea {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#product-details-page h1,
#product-details-page h2,
#product-details-page h3,
#product-details-page p {
    margin: 0 !important;
}

#product-details-page button:focus-visible,
#product-details-page summary:focus-visible {
    outline: none !important;
    box-shadow:
        0 0 0 4px
        rgba(21, 128, 61, 0.14) !important;
}

#product-details-page .pdp-back-row {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
}

#product-details-page .pdp-back-button,
#product-details-page .pdp-action-button {
    display: inline-flex !important;
    min-height: 40px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;
    padding: 7px 11px !important;
    color: var(--pdp-green-900) !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    background: #ffffff !important;
    border: 1px solid #b8dfc3 !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#product-details-page .pdp-back-button:hover,
#product-details-page .pdp-action-button:hover {
    color: #ffffff !important;
    background: var(--pdp-green-800) !important;
    border-color: var(--pdp-green-800) !important;
}

#product-details-page .pdp-back-button svg,
#product-details-page .pdp-action-button svg {
    width: 16px !important;
    height: 16px !important;
}

#product-details-page .pdp-page-hint {
    color: var(--pdp-muted) !important;
    font-size: 12px !important;
}

#product-details-page .pdp-hero {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    align-items: center !important;
    gap: 20px !important;
    padding: 18px 20px !important;
    background:
        linear-gradient(
            135deg,
            #ffffff,
            #f3fbf5
        ) !important;
    border: 1px solid var(--pdp-border) !important;
    border-radius: 14px !important;
    box-shadow:
        0 1px 3px
        rgba(16, 24, 40, 0.07) !important;
}

#product-details-page .pdp-hero-main {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 13px !important;
}

#product-details-page .pdp-product-icon {
    display: grid !important;
    width: 52px !important;
    height: 52px !important;
    min-width: 52px !important;
    place-items: center !important;
    color: #ffffff !important;
    background:
        linear-gradient(
            145deg,
            var(--pdp-green-900),
            var(--pdp-green-700)
        ) !important;
    border-radius: 12px !important;
    box-shadow:
        0 7px 16px
        rgba(20, 83, 45, 0.18) !important;
}

#product-details-page .pdp-product-icon svg {
    width: 24px !important;
    height: 24px !important;
}

#product-details-page .pdp-hero-copy {
    min-width: 0 !important;
}

#product-details-page .pdp-kicker {
    display: block !important;
    margin-bottom: 2px !important;
    color: var(--pdp-green-700) !important;
    font-size: 11px !important;
    font-weight: 750 !important;
    letter-spacing: 0.055em !important;
    text-transform: uppercase !important;
}

#product-details-page .pdp-title {
    overflow: hidden !important;
    color: var(--pdp-text) !important;
    font-size: 24px !important;
    font-weight: 740 !important;
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
    padding: 4px 7px !important;
    color: var(--pdp-text-secondary) !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    background: #ffffff !important;
    border: 1px solid #dfe6e1 !important;
    border-radius: 999px !important;
}

#product-details-page .pdp-meta-chip svg {
    width: 13px !important;
    height: 13px !important;
    color: var(--pdp-green-700) !important;
}

#product-details-page .pdp-product-status {
    display: inline-flex !important;
    min-height: 36px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 6px 10px !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    border-radius: 999px !important;
}

#product-details-page .pdp-product-active {
    color: var(--pdp-green-900) !important;
    background: var(--pdp-green-50) !important;
    border: 1px solid #b8dfc3 !important;
}

#product-details-page .pdp-product-inactive {
    color: var(--pdp-amber-700) !important;
    background: var(--pdp-amber-50) !important;
    border: 1px solid #f0d48f !important;
}

#product-details-page .pdp-summary-grid {
    display: grid !important;
    grid-template-columns:
        repeat(4, minmax(0, 1fr)) !important;
    gap: 10px !important;
}

#product-details-page .pdp-summary-card {
    position: relative !important;
    display: flex !important;
    min-width: 0 !important;
    min-height: 96px !important;
    flex-direction: column !important;
    justify-content: center !important;
    gap: 4px !important;
    padding: 13px 14px 13px 18px !important;
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid var(--pdp-border) !important;
    border-radius: 11px !important;
    box-shadow:
        0 1px 2px
        rgba(16, 24, 40, 0.04) !important;
}

#product-details-page .pdp-summary-card::before {
    position: absolute !important;
    inset: 0 auto 0 0 !important;
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

#product-details-page .pdp-summary-label,
#product-details-page .pdp-stat-label,
#product-details-page .pdp-info-label,
#product-details-page .pdp-batch-label,
#product-details-page .pdp-more-label {
    color: var(--pdp-muted) !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.035em !important;
    text-transform: uppercase !important;
}

#product-details-page .pdp-summary-value {
    overflow-wrap: anywhere !important;
    color: var(--pdp-green-900) !important;
    font-size: 18px !important;
    font-weight: 750 !important;
    line-height: 1.25 !important;
}

#product-details-page .pdp-summary-card.blue .pdp-summary-value {
    color: var(--pdp-blue-700) !important;
}

#product-details-page .pdp-summary-card.amber .pdp-summary-value {
    color: var(--pdp-amber-700) !important;
}

#product-details-page .pdp-layout {
    display: grid !important;
    grid-template-columns:
        minmax(0, 1fr)
        minmax(280px, 340px) !important;
    align-items: start !important;
    gap: 12px !important;
}

#product-details-page .pdp-main-column,
#product-details-page .pdp-side-column {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 12px !important;
}

#product-details-page .pdp-panel {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid var(--pdp-border) !important;
    border-radius: 12px !important;
    box-shadow:
        0 1px 3px
        rgba(16, 24, 40, 0.05) !important;
}

#product-details-page .pdp-panel-heading {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 12px !important;
    padding: 13px 14px !important;
    background: #ffffff !important;
    border-bottom: 1px solid var(--pdp-border) !important;
}

#product-details-page .pdp-panel-title {
    color: var(--pdp-text) !important;
    font-size: 15px !important;
    font-weight: 720 !important;
    line-height: 1.3 !important;
}

#product-details-page .pdp-panel-description {
    margin-top: 2px !important;
    color: var(--pdp-muted) !important;
    font-size: 11px !important;
}

#product-details-page .pdp-count-badge {
    display: inline-flex !important;
    min-height: 28px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 4px 7px !important;
    color: var(--pdp-green-900) !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    background: var(--pdp-green-50) !important;
    border: 1px solid #b8dfc3 !important;
    border-radius: 999px !important;
}

#product-details-page .pdp-info-list {
    display: grid !important;
    grid-template-columns:
        repeat(2, minmax(0, 1fr)) !important;
    gap: 1px !important;
    background: #e6ece7 !important;
}

#product-details-page .pdp-info-item {
    display: flex !important;
    min-width: 0 !important;
    min-height: 66px !important;
    flex-direction: column !important;
    justify-content: center !important;
    gap: 3px !important;
    padding: 10px 12px !important;
    background: #ffffff !important;
}

#product-details-page .pdp-info-value {
    overflow: hidden !important;
    color: var(--pdp-text-secondary) !important;
    font-size: 12px !important;
    font-weight: 680 !important;
    line-height: 1.35 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#product-details-page .pdp-stock-overview {
    display: grid !important;
    grid-template-columns:
        repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
    padding: 12px !important;
}

#product-details-page .pdp-overview-item {
    display: flex !important;
    min-width: 0 !important;
    min-height: 68px !important;
    flex-direction: column !important;
    justify-content: center !important;
    gap: 3px !important;
    padding: 9px 10px !important;
    background: #f8faf9 !important;
    border: 1px solid #e1e7e2 !important;
    border-radius: 8px !important;
}

#product-details-page .pdp-overview-item span {
    color: var(--pdp-muted) !important;
    font-size: 10px !important;
    font-weight: 650 !important;
}

#product-details-page .pdp-overview-item strong {
    overflow-wrap: anywhere !important;
    color: var(--pdp-text) !important;
    font-size: 13px !important;
    font-weight: 720 !important;
}

#product-details-page .pdp-price-list {
    display: flex !important;
    flex-direction: column !important;
    gap: 10px !important;
    padding: 12px !important;
    background: var(--pdp-page) !important;
}

#product-details-page .pdp-price-card {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid var(--pdp-border) !important;
    border-radius: 10px !important;
}

#product-details-page .pdp-price-header {
    display: grid !important;
    grid-template-columns:
        repeat(5, minmax(0, 1fr)) !important;
    gap: 1px !important;
    background: var(--pdp-border) !important;
    border-bottom: 1px solid var(--pdp-border) !important;
}

#product-details-page .pdp-price-stat {
    display: flex !important;
    min-width: 0 !important;
    min-height: 68px !important;
    flex-direction: column !important;
    justify-content: center !important;
    gap: 3px !important;
    padding: 9px 10px !important;
    background: #ffffff !important;
}

#product-details-page .pdp-price-stat.primary {
    background: var(--pdp-green-50) !important;
}

#product-details-page .pdp-price-stat.secondary {
    background: var(--pdp-blue-50) !important;
}

#product-details-page .pdp-stat-value {
    overflow-wrap: anywhere !important;
    color: var(--pdp-text-secondary) !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    line-height: 1.35 !important;
}

#product-details-page .pdp-price-stat.primary .pdp-stat-value {
    color: var(--pdp-green-900) !important;
    font-size: 14px !important;
}

#product-details-page .pdp-price-stat.secondary .pdp-stat-value {
    color: var(--pdp-blue-700) !important;
}

#product-details-page .pdp-batch-area {
    padding: 10px !important;
}

#product-details-page .pdp-batch-table-wrap {
    width: 100% !important;
    min-width: 0 !important;
    overflow-x: auto !important;
}

#product-details-page .pdp-batch-table {
    width: 100% !important;
    min-width: 900px !important;
    border-collapse: collapse !important;
    table-layout: fixed !important;
}

#product-details-page .pdp-batch-table th {
    height: 38px !important;
    padding: 8px 9px !important;
    color: var(--pdp-text-secondary) !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.035em !important;
    text-align: left !important;
    text-transform: uppercase !important;
    background: #f8faf9 !important;
    border-bottom: 1px solid var(--pdp-border) !important;
}

#product-details-page .pdp-batch-table td {
    padding: 9px !important;
    color: var(--pdp-text-secondary) !important;
    font-size: 11px !important;
    vertical-align: middle !important;
    border-bottom: 1px solid #e7ece8 !important;
}

#product-details-page .pdp-batch-table tbody tr:last-child td {
    border-bottom: 0 !important;
}

#product-details-page .pdp-batch-reference {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 2px !important;
}

#product-details-page .pdp-batch-reference strong {
    overflow: hidden !important;
    color: var(--pdp-text) !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#product-details-page .pdp-badge {
    display: inline-flex !important;
    min-height: 25px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 3px 7px !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    border-radius: 999px !important;
}

#product-details-page .pdp-badge-available {
    color: var(--pdp-green-900) !important;
    background: var(--pdp-green-50) !important;
    border: 1px solid #b8dfc3 !important;
}

#product-details-page .pdp-badge-expiring_soon {
    color: var(--pdp-amber-700) !important;
    background: var(--pdp-amber-50) !important;
    border: 1px solid #f0d48f !important;
}

#product-details-page .pdp-badge-expired,
#product-details-page .pdp-badge-out_of_stock {
    color: var(--pdp-red-700) !important;
    background: var(--pdp-red-50) !important;
    border: 1px solid #f3b5af !important;
}

#product-details-page .pdp-mobile-batches {
    display: none !important;
}

#product-details-page .pdp-more-details {
    margin-top: 7px !important;
}

#product-details-page .pdp-more-summary {
    display: inline-flex !important;
    min-height: 31px !important;
    align-items: center !important;
    padding: 5px 8px !important;
    color: var(--pdp-blue-700) !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    background: var(--pdp-blue-50) !important;
    border: 1px solid #b9d8f5 !important;
    border-radius: 7px !important;
    cursor: pointer !important;
    list-style: none !important;
}

#product-details-page .pdp-more-summary::-webkit-details-marker {
    display: none !important;
}

#product-details-page .pdp-more-grid {
    display: grid !important;
    grid-template-columns:
        repeat(3, minmax(0, 1fr)) !important;
    gap: 7px !important;
    margin-top: 8px !important;
}

#product-details-page .pdp-more-item {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 2px !important;
    padding: 8px !important;
    background: #f8faf9 !important;
    border: 1px solid #e1e7e2 !important;
    border-radius: 7px !important;
}

#product-details-page .pdp-more-item.wide {
    grid-column: 1 / -1 !important;
}

#product-details-page .pdp-more-value {
    overflow-wrap: anywhere !important;
    color: var(--pdp-text-secondary) !important;
    font-size: 10px !important;
    font-weight: 650 !important;
}

#product-details-page .pdp-audit {
    display: grid !important;
    grid-template-columns:
        repeat(2, minmax(0, 1fr)) !important;
    gap: 1px !important;
    background: var(--pdp-border) !important;
    border: 1px solid var(--pdp-border) !important;
    border-radius: 10px !important;
    overflow: hidden !important;
}

#product-details-page .pdp-audit-item {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    padding: 10px 12px !important;
    background: #ffffff !important;
}

#product-details-page .pdp-audit-item span {
    color: var(--pdp-muted) !important;
    font-size: 10px !important;
    font-weight: 650 !important;
}

#product-details-page .pdp-audit-item strong {
    color: var(--pdp-text-secondary) !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    text-align: right !important;
}

#product-details-page .pdp-state {
    display: flex !important;
    min-height: 320px !important;
    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 9px !important;
    padding: 30px !important;
    color: var(--pdp-muted) !important;
    text-align: center !important;
    background: #ffffff !important;
    border: 1px solid var(--pdp-border) !important;
    border-radius: 14px !important;
}

#product-details-page .pdp-state.error {
    color: var(--pdp-red-700) !important;
    background: var(--pdp-red-50) !important;
    border-color: #f3b5af !important;
}

#product-details-page .pdp-state-icon {
    display: grid !important;
    width: 50px !important;
    height: 50px !important;
    place-items: center !important;
    color: var(--pdp-green-700) !important;
    background: var(--pdp-green-50) !important;
    border: 1px solid #b8dfc3 !important;
    border-radius: 12px !important;
}

#product-details-page .pdp-state.error .pdp-state-icon {
    color: var(--pdp-red-700) !important;
    background: #ffffff !important;
    border-color: #f3b5af !important;
}

#product-details-page .pdp-state-icon svg {
    width: 24px !important;
    height: 24px !important;
}

#product-details-page .pdp-state-title {
    color: inherit !important;
    font-size: 17px !important;
    font-weight: 720 !important;
}

#product-details-page .pdp-state-message {
    max-width: 480px !important;
    color: inherit !important;
    font-size: 12px !important;
}

#product-details-page .pdp-state-actions {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 8px !important;
    margin-top: 5px !important;
}

#product-details-page .pdp-spinner {
    width: 38px !important;
    height: 38px !important;
    border: 4px solid var(--pdp-green-100) !important;
    border-top-color: var(--pdp-green-700) !important;
    border-radius: 50% !important;
    animation: pdp-spin 700ms linear infinite !important;
}

@keyframes pdp-spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 1120px) {
    #product-details-page .pdp-layout {
        grid-template-columns: 1fr !important;
    }

    #product-details-page .pdp-side-column {
        display: grid !important;
        grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;
    }
}

@media (max-width: 900px) {
    #product-details-page .pdp-summary-grid {
        grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;
    }

    #product-details-page .pdp-price-header {
        grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;
    }

    #product-details-page .pdp-price-stat:last-child {
        grid-column: 1 / -1 !important;
    }
}

@media (max-width: 720px) {
    #product-details-page .pdp-back-row {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #product-details-page .pdp-back-button {
        width: 100% !important;
    }

    #product-details-page .pdp-hero {
        grid-template-columns: 1fr !important;
        padding: 15px !important;
    }

    #product-details-page .pdp-title {
        font-size: 21px !important;
        white-space: normal !important;
    }

    #product-details-page .pdp-product-status {
        width: 100% !important;
    }

    #product-details-page .pdp-side-column {
        display: flex !important;
    }

    #product-details-page .pdp-info-list,
    #product-details-page .pdp-stock-overview {
        grid-template-columns: 1fr !important;
    }

    #product-details-page .pdp-batch-table-wrap {
        display: none !important;
    }

    #product-details-page .pdp-mobile-batches {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
    }

    #product-details-page .pdp-mobile-batch {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        padding: 10px !important;
        background: #f8faf9 !important;
        border: 1px solid #e1e7e2 !important;
        border-radius: 8px !important;
    }

    #product-details-page .pdp-mobile-batch-header {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 9px !important;
    }

    #product-details-page .pdp-mobile-batch-grid {
        display: grid !important;
        grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;
        gap: 7px !important;
    }

    #product-details-page .pdp-mobile-batch-item {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 2px !important;
        padding: 7px !important;
        background: #ffffff !important;
        border: 1px solid #e4e9e5 !important;
        border-radius: 7px !important;
    }

    #product-details-page .pdp-mobile-batch-item strong {
        overflow-wrap: anywhere !important;
        color: var(--pdp-text-secondary) !important;
        font-size: 10px !important;
        font-weight: 680 !important;
    }

    #product-details-page .pdp-more-grid {
        grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;
    }

    #product-details-page .pdp-audit {
        grid-template-columns: 1fr !important;
    }
}

@media (max-width: 480px) {
    #product-details-page .pdp-summary-grid,
    #product-details-page .pdp-price-header,
    #product-details-page .pdp-mobile-batch-grid,
    #product-details-page .pdp-more-grid {
        grid-template-columns: 1fr !important;
    }

    #product-details-page .pdp-price-stat:last-child {
        grid-column: auto !important;
    }

    #product-details-page .pdp-state-actions {
        width: 100% !important;
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #product-details-page .pdp-state-actions button {
        width: 100% !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #product-details-page *,
    #product-details-page *::before,
    #product-details-page *::after {
        transition: none !important;
        scroll-behavior: auto !important;
    }

    #product-details-page .pdp-spinner {
        animation-duration: 1.2s !important;
    }
}
`;

export default function ProductDetailsPage() {
    const navigate = useNavigate();

    const {
        productId,
    } = useParams<{
        productId: string;
    }>();

    const {
        token,
    } = useAuth();

    const requestIdRef = useRef(0);

    const [
        product,
        setProduct,
    ] = useState<ProductDetails | null>(
        null,
    );

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const numericProductId = Number(productId);

    const loadProduct =
        useCallback(
            async (): Promise<void> => {
                if (
                    !token
                    || !Number.isInteger(
                        numericProductId,
                    )
                    || numericProductId <= 0
                ) {
                    setProduct(null);
                    setErrorMessage(
                        'The selected product is invalid.',
                    );
                    setIsLoading(false);
                    return;
                }

                const requestId =
                    requestIdRef.current + 1;

                requestIdRef.current = requestId;

                setIsLoading(true);
                setErrorMessage('');

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

                    setProduct(response.data);
                } catch (error) {
                    if (
                        requestIdRef.current
                        !== requestId
                    ) {
                        return;
                    }

                    setProduct(null);
                    setErrorMessage(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load product details.',
                    );
                } finally {
                    if (
                        requestIdRef.current
                        === requestId
                    ) {
                        setIsLoading(false);
                    }
                }
            },
            [
                token,
                numericProductId,
            ],
        );

    useEffect(() => {
        void loadProduct();
    }, [loadProduct]);

    const goBackToProducts = (): void => {
        navigate('/admin/products');
    };

    const visibleError =
        errorMessage
        || (
            !isLoading
                && !product
                ? 'Product details were not found.'
                : ''
        );

    return (
        <div id="product-details-page">
            <style>
                {pageStyles}
            </style>

            {isLoading ? (
                <section
                    className="pdp-state"
                    aria-live="polite"
                >
                    <div className="pdp-spinner" />

                    <strong className="pdp-state-title">
                        Loading Product Details
                    </strong>

                    <span className="pdp-state-message">
                        Retrieving product, pricing and
                        batch information.
                    </span>
                </section>
            ) : visibleError ? (
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
                            className="pdp-action-button"
                            onClick={() => {
                                void loadProduct();
                            }}
                        >
                            <Icon name="refresh" />
                            Try Again
                        </button>

                        <button
                            type="button"
                            className="pdp-back-button"
                            onClick={goBackToProducts}
                        >
                            <Icon name="arrow-left" />
                            Back to Products
                        </button>
                    </div>
                </section>
            ) : product ? (
                <>
                    <div className="pdp-back-row">
                        <button
                            type="button"
                            className="pdp-back-button"
                            onClick={goBackToProducts}
                        >
                            <Icon name="arrow-left" />
                            Back to Products
                        </button>

                        <span className="pdp-page-hint">
                            Product ID #{numericProductId}
                        </span>
                    </div>

                    <header className="pdp-hero">
                        <div className="pdp-hero-main">
                            <span className="pdp-product-icon">
                                <Icon name="box" />
                            </span>

                            <div className="pdp-hero-copy">
                                <span className="pdp-kicker">
                                    Product Details
                                </span>

                                <h1
                                    className="pdp-title"
                                    title={product.name}
                                >
                                    {product.name}
                                </h1>

                                <div className="pdp-meta-list">
                                    <span className="pdp-meta-chip">
                                        <Icon name="tag" />
                                        SKU: {product.sku}
                                    </span>

                                    <span className="pdp-meta-chip">
                                        <Icon name="category" />
                                        {product.category?.name
                                            ?? 'General'}
                                    </span>

                                    <span className="pdp-meta-chip">
                                        <Icon name="layers" />
                                        Unit: {product.unit}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <span
                            className={
                                product.is_active
                                    ? 'pdp-product-status pdp-product-active'
                                    : 'pdp-product-status pdp-product-inactive'
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
                                {formatQuantity(
                                    product.summary
                                        .total_available_quantity,
                                )}
                                {' '}
                                {product.unit}
                            </strong>
                        </article>

                        <article className="pdp-summary-card">
                            <span className="pdp-summary-label">
                                Saleable Stock
                            </span>

                            <strong className="pdp-summary-value">
                                {formatQuantity(
                                    product.summary
                                        .saleable_quantity,
                                )}
                                {' '}
                                {product.unit}
                            </strong>
                        </article>

                        <article className="pdp-summary-card blue">
                            <span className="pdp-summary-label">
                                Stock Value at Cost
                            </span>

                            <strong className="pdp-summary-value">
                                {formatCurrency(
                                    product.summary
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
                                    product.summary
                                        .potential_gross_profit,
                                )}
                            </strong>
                        </article>
                    </section>

                    <section className="pdp-layout">
                        <main className="pdp-main-column">
                            <section className="pdp-panel">
                                <header className="pdp-panel-heading">
                                    <div>
                                        <h2 className="pdp-panel-title">
                                            Stock and Price Details
                                        </h2>

                                        <p className="pdp-panel-description">
                                            Review selling prices and the
                                            batches available under each price.
                                        </p>
                                    </div>

                                    <span className="pdp-count-badge">
                                        {product.summary
                                            .number_of_price_options}
                                        {' '}
                                        {product.summary
                                            .number_of_price_options === 1
                                            ? 'Price Option'
                                            : 'Price Options'}
                                    </span>
                                </header>

                                {product.price_options.length === 0 ? (
                                    <div className="pdp-state">
                                        <span className="pdp-state-icon">
                                            <Icon name="box" />
                                        </span>

                                        <strong className="pdp-state-title">
                                            No Stock Received
                                        </strong>

                                        <span className="pdp-state-message">
                                            This product does not have stock
                                            or pricing information yet.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="pdp-price-list">
                                        {product.price_options.map(
                                            (
                                                priceOption,
                                                priceIndex,
                                            ) => (
                                                <article
                                                    key={
                                                        `${priceOption.selling_price}-${priceIndex}`
                                                    }
                                                    className="pdp-price-card"
                                                >
                                                    <header className="pdp-price-header">
                                                        <div className="pdp-price-stat primary">
                                                            <span className="pdp-stat-label">
                                                                Selling Price
                                                            </span>

                                                            <strong className="pdp-stat-value">
                                                                {formatCurrency(
                                                                    priceOption
                                                                        .selling_price,
                                                                )}
                                                            </strong>
                                                        </div>

                                                        <div className="pdp-price-stat secondary">
                                                            <span className="pdp-stat-label">
                                                                Cost Price
                                                            </span>

                                                            <strong className="pdp-stat-value">
                                                                {getCostPriceText(
                                                                    priceOption,
                                                                )}
                                                            </strong>
                                                        </div>

                                                        <div className="pdp-price-stat">
                                                            <span className="pdp-stat-label">
                                                                Available
                                                            </span>

                                                            <strong className="pdp-stat-value">
                                                                {formatQuantity(
                                                                    priceOption
                                                                        .available_quantity,
                                                                )}
                                                                {' '}
                                                                {product.unit}
                                                            </strong>
                                                        </div>

                                                        <div className="pdp-price-stat">
                                                            <span className="pdp-stat-label">
                                                                Saleable
                                                            </span>

                                                            <strong className="pdp-stat-value">
                                                                {formatQuantity(
                                                                    priceOption
                                                                        .saleable_quantity,
                                                                )}
                                                                {' '}
                                                                {product.unit}
                                                            </strong>
                                                        </div>

                                                        <div className="pdp-price-stat">
                                                            <span className="pdp-stat-label">
                                                                Stock Entries
                                                            </span>

                                                            <strong className="pdp-stat-value">
                                                                {priceOption.batch_count}
                                                            </strong>
                                                        </div>
                                                    </header>

                                                    <div className="pdp-batch-area">
                                                        {priceOption.batches.length === 0 ? (
                                                            <div className="pdp-state">
                                                                <span className="pdp-state-message">
                                                                    No stock batches are
                                                                    available for this price.
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="pdp-batch-table-wrap">
                                                                    <table className="pdp-batch-table">
                                                                        <thead>
                                                                            <tr>
                                                                                <th>
                                                                                    Stock Reference
                                                                                </th>
                                                                                <th>
                                                                                    Status
                                                                                </th>
                                                                                <th>
                                                                                    Cost Price
                                                                                </th>
                                                                                <th>
                                                                                    Available
                                                                                </th>
                                                                                <th>
                                                                                    Expiry Date
                                                                                </th>
                                                                                <th>
                                                                                    Supplier
                                                                                </th>
                                                                                <th>
                                                                                    More
                                                                                </th>
                                                                            </tr>
                                                                        </thead>

                                                                        <tbody>
                                                                            {priceOption.batches.map(
                                                                                (batch) => (
                                                                                    <tr key={batch.id}>
                                                                                        <td>
                                                                                            <span className="pdp-batch-reference">
                                                                                                <span className="pdp-batch-label">
                                                                                                    Reference
                                                                                                </span>

                                                                                                <strong
                                                                                                    title={
                                                                                                        batch.batch_number
                                                                                                        || batch.batch_code
                                                                                                        || `Stock #${batch.id}`
                                                                                                    }
                                                                                                >
                                                                                                    {batch.batch_number
                                                                                                        || batch.batch_code
                                                                                                        || `Stock #${batch.id}`}
                                                                                                </strong>
                                                                                            </span>
                                                                                        </td>

                                                                                        <td>
                                                                                            <span
                                                                                                className={getStatusClass(
                                                                                                    batch.status,
                                                                                                )}
                                                                                            >
                                                                                                {getStatusLabel(
                                                                                                    batch.status,
                                                                                                )}
                                                                                            </span>
                                                                                        </td>

                                                                                        <td>
                                                                                            {formatCurrency(
                                                                                                batch.unit_cost,
                                                                                            )}
                                                                                        </td>

                                                                                        <td>
                                                                                            {formatQuantity(
                                                                                                batch.available_quantity,
                                                                                            )}
                                                                                            {' '}
                                                                                            {product.unit}
                                                                                        </td>

                                                                                        <td>
                                                                                            {formatDate(
                                                                                                batch.expiry_date,
                                                                                            )}
                                                                                        </td>

                                                                                        <td>
                                                                                            {batch.supplier?.name
                                                                                                ?? 'Not available'}
                                                                                        </td>

                                                                                        <td>
                                                                                            <details className="pdp-more-details">
                                                                                                <summary className="pdp-more-summary">
                                                                                                    View Details
                                                                                                </summary>

                                                                                                <div className="pdp-more-grid">
                                                                                                    <div className="pdp-more-item">
                                                                                                        <span className="pdp-more-label">
                                                                                                            Selling Price
                                                                                                        </span>
                                                                                                        <strong className="pdp-more-value">
                                                                                                            {formatCurrency(
                                                                                                                batch.selling_price,
                                                                                                            )}
                                                                                                        </strong>
                                                                                                    </div>

                                                                                                    <div className="pdp-more-item">
                                                                                                        <span className="pdp-more-label">
                                                                                                            Profit Per Unit
                                                                                                        </span>
                                                                                                        <strong className="pdp-more-value">
                                                                                                            {formatCurrency(
                                                                                                                batch.profit_per_unit,
                                                                                                            )}
                                                                                                        </strong>
                                                                                                    </div>

                                                                                                    <div className="pdp-more-item">
                                                                                                        <span className="pdp-more-label">
                                                                                                            Purchased
                                                                                                        </span>
                                                                                                        <strong className="pdp-more-value">
                                                                                                            {formatQuantity(
                                                                                                                batch.purchased_quantity,
                                                                                                            )}
                                                                                                            {' '}
                                                                                                            {product.unit}
                                                                                                        </strong>
                                                                                                    </div>

                                                                                                    <div className="pdp-more-item">
                                                                                                        <span className="pdp-more-label">
                                                                                                            Received
                                                                                                        </span>
                                                                                                        <strong className="pdp-more-value">
                                                                                                            {formatQuantity(
                                                                                                                batch.received_quantity,
                                                                                                            )}
                                                                                                            {' '}
                                                                                                            {product.unit}
                                                                                                        </strong>
                                                                                                    </div>

                                                                                                    <div className="pdp-more-item">
                                                                                                        <span className="pdp-more-label">
                                                                                                            Manufactured
                                                                                                        </span>
                                                                                                        <strong className="pdp-more-value">
                                                                                                            {formatDate(
                                                                                                                batch.manufactured_date,
                                                                                                            )}
                                                                                                        </strong>
                                                                                                    </div>

                                                                                                    <div className="pdp-more-item">
                                                                                                        <span className="pdp-more-label">
                                                                                                            Purchase
                                                                                                        </span>
                                                                                                        <strong className="pdp-more-value">
                                                                                                            {batch.purchase_number
                                                                                                                || (
                                                                                                                    batch.purchase_id
                                                                                                                        ? `Purchase #${batch.purchase_id}`
                                                                                                                        : 'Not available'
                                                                                                                )}
                                                                                                        </strong>
                                                                                                    </div>

                                                                                                    <div className="pdp-more-item">
                                                                                                        <span className="pdp-more-label">
                                                                                                            Purchase Date
                                                                                                        </span>
                                                                                                        <strong className="pdp-more-value">
                                                                                                            {formatDate(
                                                                                                                batch.purchase_date,
                                                                                                            )}
                                                                                                        </strong>
                                                                                                    </div>

                                                                                                    <div className="pdp-more-item">
                                                                                                        <span className="pdp-more-label">
                                                                                                            Received At
                                                                                                        </span>
                                                                                                        <strong className="pdp-more-value">
                                                                                                            {formatDateTime(
                                                                                                                batch.received_at,
                                                                                                            )}
                                                                                                        </strong>
                                                                                                    </div>

                                                                                                    <div className="pdp-more-item wide">
                                                                                                        <span className="pdp-more-label">
                                                                                                            Notes
                                                                                                        </span>
                                                                                                        <strong className="pdp-more-value">
                                                                                                            {batch.notes
                                                                                                                || 'No notes'}
                                                                                                        </strong>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </details>
                                                                                        </td>
                                                                                    </tr>
                                                                                ),
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>

                                                                <div className="pdp-mobile-batches">
                                                                    {priceOption.batches.map(
                                                                        (batch) => (
                                                                            <article
                                                                                key={batch.id}
                                                                                className="pdp-mobile-batch"
                                                                            >
                                                                                <header className="pdp-mobile-batch-header">
                                                                                    <span className="pdp-batch-reference">
                                                                                        <span className="pdp-batch-label">
                                                                                            Stock Reference
                                                                                        </span>
                                                                                        <strong>
                                                                                            {batch.batch_number
                                                                                                || batch.batch_code
                                                                                                || `Stock #${batch.id}`}
                                                                                        </strong>
                                                                                    </span>

                                                                                    <span
                                                                                        className={getStatusClass(
                                                                                            batch.status,
                                                                                        )}
                                                                                    >
                                                                                        {getStatusLabel(
                                                                                            batch.status,
                                                                                        )}
                                                                                    </span>
                                                                                </header>

                                                                                <div className="pdp-mobile-batch-grid">
                                                                                    <div className="pdp-mobile-batch-item">
                                                                                        <span className="pdp-batch-label">
                                                                                            Cost Price
                                                                                        </span>
                                                                                        <strong>
                                                                                            {formatCurrency(
                                                                                                batch.unit_cost,
                                                                                            )}
                                                                                        </strong>
                                                                                    </div>

                                                                                    <div className="pdp-mobile-batch-item">
                                                                                        <span className="pdp-batch-label">
                                                                                            Selling Price
                                                                                        </span>
                                                                                        <strong>
                                                                                            {formatCurrency(
                                                                                                batch.selling_price,
                                                                                            )}
                                                                                        </strong>
                                                                                    </div>

                                                                                    <div className="pdp-mobile-batch-item">
                                                                                        <span className="pdp-batch-label">
                                                                                            Available
                                                                                        </span>
                                                                                        <strong>
                                                                                            {formatQuantity(
                                                                                                batch.available_quantity,
                                                                                            )}
                                                                                            {' '}
                                                                                            {product.unit}
                                                                                        </strong>
                                                                                    </div>

                                                                                    <div className="pdp-mobile-batch-item">
                                                                                        <span className="pdp-batch-label">
                                                                                            Expiry Date
                                                                                        </span>
                                                                                        <strong>
                                                                                            {formatDate(
                                                                                                batch.expiry_date,
                                                                                            )}
                                                                                        </strong>
                                                                                    </div>

                                                                                    <div className="pdp-mobile-batch-item">
                                                                                        <span className="pdp-batch-label">
                                                                                            Supplier
                                                                                        </span>
                                                                                        <strong>
                                                                                            {batch.supplier?.name
                                                                                                ?? 'Not available'}
                                                                                        </strong>
                                                                                    </div>

                                                                                    <div className="pdp-mobile-batch-item">
                                                                                        <span className="pdp-batch-label">
                                                                                            Received
                                                                                        </span>
                                                                                        <strong>
                                                                                            {formatQuantity(
                                                                                                batch.received_quantity,
                                                                                            )}
                                                                                            {' '}
                                                                                            {product.unit}
                                                                                        </strong>
                                                                                    </div>
                                                                                </div>

                                                                                <details className="pdp-more-details">
                                                                                    <summary className="pdp-more-summary">
                                                                                        View More Details
                                                                                    </summary>

                                                                                    <div className="pdp-more-grid">
                                                                                        <div className="pdp-more-item">
                                                                                            <span className="pdp-more-label">
                                                                                                Profit Per Unit
                                                                                            </span>
                                                                                            <strong className="pdp-more-value">
                                                                                                {formatCurrency(
                                                                                                    batch.profit_per_unit,
                                                                                                )}
                                                                                            </strong>
                                                                                        </div>

                                                                                        <div className="pdp-more-item">
                                                                                            <span className="pdp-more-label">
                                                                                                Purchased
                                                                                            </span>
                                                                                            <strong className="pdp-more-value">
                                                                                                {formatQuantity(
                                                                                                    batch.purchased_quantity,
                                                                                                )}
                                                                                                {' '}
                                                                                                {product.unit}
                                                                                            </strong>
                                                                                        </div>

                                                                                        <div className="pdp-more-item">
                                                                                            <span className="pdp-more-label">
                                                                                                Manufactured
                                                                                            </span>
                                                                                            <strong className="pdp-more-value">
                                                                                                {formatDate(
                                                                                                    batch.manufactured_date,
                                                                                                )}
                                                                                            </strong>
                                                                                        </div>

                                                                                        <div className="pdp-more-item">
                                                                                            <span className="pdp-more-label">
                                                                                                Purchase
                                                                                            </span>
                                                                                            <strong className="pdp-more-value">
                                                                                                {batch.purchase_number
                                                                                                    || (
                                                                                                        batch.purchase_id
                                                                                                            ? `Purchase #${batch.purchase_id}`
                                                                                                            : 'Not available'
                                                                                                    )}
                                                                                            </strong>
                                                                                        </div>

                                                                                        <div className="pdp-more-item">
                                                                                            <span className="pdp-more-label">
                                                                                                Purchase Date
                                                                                            </span>
                                                                                            <strong className="pdp-more-value">
                                                                                                {formatDate(
                                                                                                    batch.purchase_date,
                                                                                                )}
                                                                                            </strong>
                                                                                        </div>

                                                                                        <div className="pdp-more-item">
                                                                                            <span className="pdp-more-label">
                                                                                                Received At
                                                                                            </span>
                                                                                            <strong className="pdp-more-value">
                                                                                                {formatDateTime(
                                                                                                    batch.received_at,
                                                                                                )}
                                                                                            </strong>
                                                                                        </div>

                                                                                        <div className="pdp-more-item wide">
                                                                                            <span className="pdp-more-label">
                                                                                                Notes
                                                                                            </span>
                                                                                            <strong className="pdp-more-value">
                                                                                                {batch.notes
                                                                                                    || 'No notes'}
                                                                                            </strong>
                                                                                        </div>
                                                                                    </div>
                                                                                </details>
                                                                            </article>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </article>
                                            ),
                                        )}
                                    </div>
                                )}
                            </section>
                        </main>

                        <aside className="pdp-side-column">
                            <section className="pdp-panel">
                                <header className="pdp-panel-heading">
                                    <div>
                                        <h2 className="pdp-panel-title">
                                            Product Information
                                        </h2>

                                        <p className="pdp-panel-description">
                                            Main identification details.
                                        </p>
                                    </div>
                                </header>

                                <div className="pdp-info-list">
                                    <div className="pdp-info-item">
                                        <span className="pdp-info-label">
                                            SKU
                                        </span>
                                        <strong
                                            className="pdp-info-value"
                                            title={product.sku}
                                        >
                                            {product.sku}
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
                                            Unit
                                        </span>
                                        <strong className="pdp-info-value">
                                            {product.unit}
                                        </strong>
                                    </div>

                                    <div className="pdp-info-item">
                                        <span className="pdp-info-label">
                                            Category
                                        </span>
                                        <strong
                                            className="pdp-info-value"
                                            title={
                                                product.category?.name
                                                ?? 'General'
                                            }
                                        >
                                            {product.category?.name
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
                                            #{numericProductId}
                                        </strong>
                                    </div>
                                </div>
                            </section>

                            <section className="pdp-panel">
                                <header className="pdp-panel-heading">
                                    <div>
                                        <h2 className="pdp-panel-title">
                                            Stock Overview
                                        </h2>

                                        <p className="pdp-panel-description">
                                            Key receiving and stock counts.
                                        </p>
                                    </div>
                                </header>

                                <div className="pdp-stock-overview">
                                    <div className="pdp-overview-item">
                                        <span>
                                            Price Options
                                        </span>
                                        <strong>
                                            {product.summary
                                                .number_of_price_options}
                                        </strong>
                                    </div>

                                    <div className="pdp-overview-item">
                                        <span>
                                            Stock Entries
                                        </span>
                                        <strong>
                                            {product.summary
                                                .number_of_batches}
                                        </strong>
                                    </div>

                                    <div className="pdp-overview-item">
                                        <span>
                                            Total Received
                                        </span>
                                        <strong>
                                            {formatQuantity(
                                                product.summary
                                                    .total_received_quantity,
                                            )}
                                            {' '}
                                            {product.unit}
                                        </strong>
                                    </div>

                                    <div className="pdp-overview-item">
                                        <span>
                                            Expired Stock
                                        </span>
                                        <strong>
                                            {formatQuantity(
                                                product.summary
                                                    .expired_quantity,
                                            )}
                                            {' '}
                                            {product.unit}
                                        </strong>
                                    </div>
                                </div>
                            </section>
                        </aside>
                    </section>

                    <footer className="pdp-audit">
                        <div className="pdp-audit-item">
                            <span>
                                Product Created
                            </span>
                            <strong>
                                {formatDateTime(
                                    product.created_at,
                                )}
                            </strong>
                        </div>

                        <div className="pdp-audit-item">
                            <span>
                                Last Updated
                            </span>
                            <strong>
                                {formatDateTime(
                                    product.updated_at,
                                )}
                            </strong>
                        </div>
                    </footer>
                </>
            ) : null}
        </div>
    );
}
