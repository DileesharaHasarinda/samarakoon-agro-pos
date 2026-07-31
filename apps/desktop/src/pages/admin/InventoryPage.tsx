import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    getStockProducts,
} from '../../services/stockService';

import type {
    StockPaginationMeta,
    StockProduct,
} from '../../types/stock';

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
            maximumFractionDigits: 3,
        },
    );

const initialPagination:
    StockPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null,
};

type IconName =
    | 'alert'
    | 'box'
    | 'calendar'
    | 'chevron-down'
    | 'chevron-left'
    | 'chevron-right'
    | 'chevron-up'
    | 'close'
    | 'layers'
    | 'refresh'
    | 'search'
    | 'tag';

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

        case 'box':
            return (
                <svg {...props}>
                    <path d="m21 8-9 5-9-5 9-5 9 5Z" />
                    <path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" />
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

        case 'chevron-down':
            return (
                <svg {...props}>
                    <path d="m6 9 6 6 6-6" />
                </svg>
            );

        case 'chevron-left':
            return (
                <svg {...props}>
                    <path d="m15 18-6-6 6-6" />
                </svg>
            );

        case 'chevron-right':
            return (
                <svg {...props}>
                    <path d="m9 18 6-6-6-6" />
                </svg>
            );

        case 'chevron-up':
            return (
                <svg {...props}>
                    <path d="m18 15-6-6-6 6" />
                </svg>
            );

        case 'close':
            return (
                <svg {...props}>
                    <path d="m6 6 12 12M18 6 6 18" />
                </svg>
            );

        case 'layers':
            return (
                <svg {...props}>
                    <path d="m12 2 9 5-9 5-9-5 9-5Z" />
                    <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
                </svg>
            );

        case 'refresh':
            return (
                <svg {...props}>
                    <path d="M20 11a8 8 0 1 0 2 5M20 4v7h-7" />
                </svg>
            );

        case 'search':
            return (
                <svg {...props}>
                    <circle
                        cx="11"
                        cy="11"
                        r="7"
                    />

                    <path d="m20 20-4-4" />
                </svg>
            );

        case 'tag':
        default:
            return (
                <svg {...props}>
                    <path d="M20 13 11 22l-9-9V2h11l7 7a3 3 0 0 1 0 4Z" />
                    <path d="M7 7h.01" />
                </svg>
            );
    }
}

function numberValue(
    value: unknown,
): number {
    const parsed = Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}

function formatQuantity(
    value: unknown,
): string {
    return quantityFormatter.format(
        numberValue(value),
    );
}

function formatDate(
    value: string | null,
): string {
    if (!value) {
        return 'No expiry date';
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

function expiryStatus(
    value: string | null,
): 'expired' | 'soon' | 'normal' | 'none' {
    if (!value) {
        return 'none';
    }

    const expiryDate = new Date(
        `${value.substring(0, 10)}T23:59:59`,
    );

    if (Number.isNaN(expiryDate.getTime())) {
        return 'none';
    }

    const now = new Date();

    const daysRemaining = Math.ceil(
        (
            expiryDate.getTime()
            - now.getTime()
        )
        / 86_400_000,
    );

    if (daysRemaining < 0) {
        return 'expired';
    }

    if (daysRemaining <= 30) {
        return 'soon';
    }

    return 'normal';
}

const inventoryStyles = `
#inventory-page,
#inventory-page *,
#inventory-page *::before,
#inventory-page *::after {
    box-sizing: border-box !important;
}

#inventory-page {
    --inv-green-950: #052e16;
    --inv-green-900: #14532d;
    --inv-green-800: #166534;
    --inv-green-700: #15803d;
    --inv-green-100: #dcfce7;
    --inv-green-50: #f0fdf4;

    --inv-blue-700: #175cd3;
    --inv-blue-50: #eff8ff;

    --inv-amber-700: #b54708;
    --inv-amber-50: #fffaeb;

    --inv-red-700: #b42318;
    --inv-red-50: #fef3f2;

    --inv-text: #101828;
    --inv-text-secondary: #344054;
    --inv-muted: #667085;

    --inv-border: #d0d9d2;
    --inv-border-strong: #aebdb2;

    --inv-surface: #ffffff;
    --inv-page: #f5f8f6;

    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    flex-direction: column !important;
    gap: 14px !important;

    margin: 0 !important;
    padding: 0 !important;

    color: var(--inv-text) !important;

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

    -webkit-font-smoothing:
        antialiased !important;
}

#inventory-page button,
#inventory-page input,
#inventory-page select {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#inventory-page h1,
#inventory-page h2,
#inventory-page h3,
#inventory-page p {
    margin: 0 !important;
}

#inventory-page .inv-header {
    display: flex !important;

    min-height: 98px !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 20px !important;

    padding: 18px 20px !important;

    background:
        linear-gradient(
            135deg,
            #ffffff,
            #f3fbf5
        ) !important;

    border:
        1px solid
        var(--inv-border) !important;

    border-radius: 14px !important;

    box-shadow:
        0 1px 3px
        rgba(
            16,
            24,
            40,
            0.07
        ) !important;
}

#inventory-page .inv-header-copy {
    min-width: 0 !important;
}

#inventory-page .inv-kicker {
    display: block !important;

    margin-bottom: 3px !important;

    color:
        var(--inv-green-700) !important;

    font-size: 11px !important;
    font-weight: 750 !important;
    letter-spacing: 0.055em !important;

    text-transform: uppercase !important;
}

#inventory-page .inv-title {
    color: var(--inv-text) !important;

    font-size: 24px !important;
    font-weight: 740 !important;
    line-height: 1.2 !important;
    letter-spacing: -0.02em !important;
}

#inventory-page .inv-subtitle {
    margin-top: 4px !important;

    color: var(--inv-muted) !important;

    font-size: 13px !important;
}

#inventory-page .inv-header-meta {
    display: flex !important;

    flex: 0 0 auto !important;

    align-items: center !important;
    gap: 8px !important;
}

#inventory-page .inv-total-badge {
    display: inline-flex !important;

    min-height: 40px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;

    padding: 7px 10px !important;

    color: var(--inv-green-900) !important;

    font-size: 12px !important;
    font-weight: 700 !important;

    white-space: nowrap !important;

    background: var(--inv-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 9px !important;
}

#inventory-page .inv-total-badge svg {
    width: 15px !important;
    height: 15px !important;
}

#inventory-page .inv-alert {
    display: flex !important;

    min-height: 48px !important;

    align-items: center !important;
    gap: 9px !important;

    padding: 10px 12px !important;

    color: var(--inv-red-700) !important;

    font-size: 13px !important;
    font-weight: 600 !important;

    background: var(--inv-red-50) !important;

    border:
        1px solid
        #f3b5af !important;

    border-radius: 10px !important;
}

#inventory-page .inv-alert > svg {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
}

#inventory-page .inv-alert-text {
    min-width: 0 !important;
    flex: 1 !important;
}

#inventory-page .inv-retry {
    display: inline-flex !important;

    min-height: 32px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;

    padding: 5px 8px !important;

    color: var(--inv-red-700) !important;

    font-size: 12px !important;
    font-weight: 650 !important;

    background: #ffffff !important;

    border:
        1px solid
        #e8aaa4 !important;

    border-radius: 7px !important;

    cursor: pointer !important;
}

#inventory-page .inv-retry svg {
    width: 14px !important;
    height: 14px !important;
}

#inventory-page .inv-panel {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: var(--inv-surface) !important;

    border:
        1px solid
        var(--inv-border) !important;

    border-radius: 14px !important;

    box-shadow:
        0 1px 3px
        rgba(
            16,
            24,
            40,
            0.07
        ) !important;
}

#inventory-page .inv-toolbar {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        auto !important;

    align-items: end !important;
    gap: 12px !important;

    padding: 14px !important;

    background: #ffffff !important;

    border-bottom:
        1px solid
        var(--inv-border) !important;
}

#inventory-page .inv-field {
    display: grid !important;
    gap: 5px !important;
}

#inventory-page .inv-label {
    color:
        var(
            --inv-text-secondary
        ) !important;

    font-size: 11px !important;
    font-weight: 650 !important;
}

#inventory-page .inv-search-wrapper {
    position: relative !important;
}

#inventory-page .inv-search-icon {
    position: absolute !important;

    top: 50% !important;
    left: 12px !important;
    z-index: 2 !important;

    display: grid !important;

    width: 18px !important;
    height: 18px !important;

    place-items: center !important;

    color: var(--inv-muted) !important;

    transform:
        translateY(-50%) !important;

    pointer-events: none !important;
}

#inventory-page .inv-search-icon svg {
    display: block !important;

    width: 18px !important;
    height: 18px !important;

    min-width: 18px !important;
    max-width: 18px !important;

    min-height: 18px !important;
    max-height: 18px !important;
}

#inventory-page .inv-search-input,
#inventory-page .inv-page-size-select {
    display: block !important;

    height: 42px !important;
    min-height: 42px !important;

    color: var(--inv-text) !important;

    font-size: 14px !important;
    font-weight: 500 !important;

    outline: none !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--inv-border-strong) !important;

    border-radius: 9px !important;
}

#inventory-page .inv-search-input {
    width: 100% !important;

    padding:
        0
        42px
        0
        40px !important;

    background: #f8faf9 !important;
}

#inventory-page .inv-search-input::placeholder {
    color: #7a8696 !important;
    opacity: 1 !important;
}

#inventory-page .inv-clear-search {
    position: absolute !important;

    top: 50% !important;
    right: 5px !important;
    z-index: 3 !important;

    display: grid !important;

    width: 32px !important;
    height: 32px !important;

    place-items: center !important;

    padding: 0 !important;

    color: var(--inv-muted) !important;

    background: transparent !important;

    border: 0 !important;
    border-radius: 7px !important;

    transform:
        translateY(-50%) !important;

    cursor: pointer !important;
}

#inventory-page .inv-clear-search:hover {
    color: var(--inv-text) !important;
    background: #eaf0ec !important;
}

#inventory-page .inv-clear-search svg {
    width: 16px !important;
    height: 16px !important;
}

#inventory-page .inv-page-size-field {
    display: grid !important;

    grid-template-columns:
        auto
        86px !important;

    align-items: center !important;
    gap: 8px !important;
}

#inventory-page .inv-page-size-select {
    width: 86px !important;

    padding: 0 10px !important;

    cursor: pointer !important;
}

#inventory-page .inv-search-input:focus,
#inventory-page .inv-page-size-select:focus,
#inventory-page button:focus-visible {
    outline: none !important;

    border-color:
        var(--inv-green-700) !important;

    box-shadow:
        0 0 0 4px
        rgba(
            21,
            128,
            61,
            0.14
        ) !important;
}

#inventory-page .inv-list {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;
    gap: 10px !important;

    padding: 12px !important;

    background: var(--inv-page) !important;
}

#inventory-page .inv-product-card {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--inv-border) !important;

    border-radius: 11px !important;

    box-shadow:
        0 1px 2px
        rgba(
            16,
            24,
            40,
            0.04
        ) !important;
}

#inventory-page .inv-product-card.expanded {
    border-color: #9dceaa !important;

    box-shadow:
        0 5px 14px
        rgba(
            21,
            128,
            61,
            0.08
        ) !important;
}

#inventory-page .inv-product-summary {
    display: grid !important;

    grid-template-columns:
        minmax(240px, 1.5fr)
        minmax(150px, 0.65fr)
        minmax(120px, 0.55fr)
        auto !important;

    width: 100% !important;
    min-height: 78px !important;

    align-items: center !important;
    gap: 14px !important;

    padding: 11px 12px !important;

    color: var(--inv-text) !important;

    text-align: left !important;

    background: #ffffff !important;

    border: 0 !important;

    cursor: pointer !important;
}

#inventory-page .inv-product-summary:hover {
    background: var(--inv-green-50) !important;
}

#inventory-page .inv-product-main {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;
    gap: 10px !important;
}

#inventory-page .inv-product-icon {
    display: grid !important;

    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;

    place-items: center !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            145deg,
            var(--inv-green-900),
            var(--inv-green-700)
        ) !important;

    border-radius: 10px !important;
}

#inventory-page .inv-product-icon svg {
    width: 19px !important;
    height: 19px !important;
}

#inventory-page .inv-product-copy {
    min-width: 0 !important;
}

#inventory-page .inv-product-name {
    display: block !important;

    overflow: hidden !important;

    color: var(--inv-text) !important;

    font-size: 15px !important;
    font-weight: 700 !important;
    line-height: 1.3 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#inventory-page .inv-product-meta {
    display: block !important;

    margin-top: 2px !important;

    overflow: hidden !important;

    color: var(--inv-muted) !important;

    font-size: 11px !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#inventory-page .inv-stat {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;
    gap: 2px !important;
}

#inventory-page .inv-stat-label {
    color: var(--inv-muted) !important;

    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.035em !important;

    text-transform: uppercase !important;
}

#inventory-page .inv-stat-value {
    overflow: hidden !important;

    color: var(--inv-green-900) !important;

    font-size: 14px !important;
    font-weight: 750 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#inventory-page .inv-expand-button {
    display: inline-flex !important;

    min-width: 114px !important;
    min-height: 36px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;

    padding: 6px 9px !important;

    color: var(--inv-blue-700) !important;

    font-size: 12px !important;
    font-weight: 650 !important;

    white-space: nowrap !important;

    background: var(--inv-blue-50) !important;

    border:
        1px solid
        #b9d8f5 !important;

    border-radius: 8px !important;
}

#inventory-page .inv-expand-button svg {
    width: 14px !important;
    height: 14px !important;
}

#inventory-page .inv-details {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;
    gap: 10px !important;

    padding: 12px !important;

    background: #f8faf9 !important;

    border-top:
        1px solid
        var(--inv-border) !important;
}

#inventory-page .inv-detail-heading {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 0 2px !important;
}

#inventory-page .inv-detail-heading h3 {
    color:
        var(
            --inv-text-secondary
        ) !important;

    font-size: 13px !important;
    font-weight: 700 !important;
}

#inventory-page .inv-detail-heading span {
    color: var(--inv-muted) !important;

    font-size: 11px !important;
}

#inventory-page .inv-price-card {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--inv-border) !important;

    border-radius: 9px !important;
}

#inventory-page .inv-price-header {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        minmax(0, 1fr) !important;

    gap: 1px !important;

    background: var(--inv-border) !important;

    border-bottom:
        1px solid
        var(--inv-border) !important;
}

#inventory-page .inv-price-stat {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;
    gap: 2px !important;

    padding: 10px 12px !important;

    background: var(--inv-green-50) !important;
}

#inventory-page .inv-price-stat.stock {
    background: var(--inv-blue-50) !important;
}

#inventory-page .inv-price-label {
    color: var(--inv-muted) !important;

    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.035em !important;

    text-transform: uppercase !important;
}

#inventory-page .inv-price-value {
    overflow: hidden !important;

    color: var(--inv-green-900) !important;

    font-size: 15px !important;
    font-weight: 750 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#inventory-page
.inv-price-stat.stock
.inv-price-value {
    color: var(--inv-blue-700) !important;
}

#inventory-page .inv-batch-table-wrap {
    width: 100% !important;
    min-width: 0 !important;

    overflow-x: auto !important;
}

#inventory-page .inv-batch-table {
    width: 100% !important;
    min-width: 620px !important;

    border-collapse: collapse !important;
    table-layout: fixed !important;
}

#inventory-page .inv-batch-table th {
    height: 38px !important;

    padding: 8px 11px !important;

    color:
        var(
            --inv-text-secondary
        ) !important;

    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.035em !important;

    text-align: left !important;
    text-transform: uppercase !important;

    background: #f8faf9 !important;

    border-bottom:
        1px solid
        var(--inv-border) !important;
}

#inventory-page
.inv-batch-table th:nth-child(2),
#inventory-page
.inv-batch-table td:nth-child(2) {
    width: 24% !important;
    text-align: right !important;
}

#inventory-page
.inv-batch-table th:nth-child(3),
#inventory-page
.inv-batch-table td:nth-child(3) {
    width: 28% !important;
}

#inventory-page .inv-batch-table td {
    padding: 9px 11px !important;

    color:
        var(
            --inv-text-secondary
        ) !important;

    font-size: 12px !important;
    vertical-align: middle !important;

    border-bottom:
        1px solid
        #e6ebe7 !important;
}

#inventory-page
.inv-batch-table
tbody
tr:last-child
td {
    border-bottom: 0 !important;
}

#inventory-page .inv-batch-reference {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;
    gap: 7px !important;
}

#inventory-page .inv-batch-reference svg {
    width: 15px !important;
    height: 15px !important;
    min-width: 15px !important;

    color: var(--inv-green-700) !important;
}

#inventory-page .inv-batch-reference strong {
    overflow: hidden !important;

    color: var(--inv-text) !important;

    font-size: 12px !important;
    font-weight: 650 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#inventory-page .inv-quantity-cell {
    color: var(--inv-green-900) !important;
    font-weight: 700 !important;
}

#inventory-page .inv-expiry {
    display: inline-flex !important;

    min-height: 27px !important;

    align-items: center !important;
    gap: 5px !important;

    padding: 4px 7px !important;

    color:
        var(
            --inv-text-secondary
        ) !important;

    font-size: 10px !important;
    font-weight: 600 !important;

    white-space: nowrap !important;

    background: #f8faf9 !important;

    border:
        1px solid
        #e4e9e5 !important;

    border-radius: 999px !important;
}

#inventory-page .inv-expiry svg {
    width: 13px !important;
    height: 13px !important;
}

#inventory-page .inv-expiry.expired {
    color: var(--inv-red-700) !important;
    background: var(--inv-red-50) !important;
    border-color: #f3b5af !important;
}

#inventory-page .inv-expiry.soon {
    color: var(--inv-amber-700) !important;
    background: var(--inv-amber-50) !important;
    border-color: #f0d48f !important;
}

#inventory-page .inv-mobile-batches {
    display: none !important;
}

#inventory-page .inv-no-batches {
    padding: 18px !important;

    color: var(--inv-muted) !important;

    font-size: 12px !important;

    text-align: center !important;
}

#inventory-page .inv-state {
    display: flex !important;

    min-height: 280px !important;

    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 8px !important;

    padding: 28px !important;

    color: var(--inv-muted) !important;

    text-align: center !important;

    background: #ffffff !important;

    border:
        1px dashed
        var(--inv-border-strong) !important;

    border-radius: 10px !important;
}

#inventory-page .inv-state-icon {
    display: grid !important;

    width: 48px !important;
    height: 48px !important;

    place-items: center !important;

    color: var(--inv-green-700) !important;

    background: var(--inv-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 11px !important;
}

#inventory-page .inv-state-icon svg {
    width: 23px !important;
    height: 23px !important;
}

#inventory-page .inv-state strong {
    color: var(--inv-text) !important;

    font-size: 16px !important;
    font-weight: 700 !important;
}

#inventory-page .inv-state span {
    max-width: 420px !important;

    font-size: 12px !important;
}

#inventory-page .inv-spinner {
    width: 36px !important;
    height: 36px !important;

    border:
        4px solid
        var(--inv-green-100) !important;

    border-top-color:
        var(--inv-green-700) !important;

    border-radius: 50% !important;

    animation:
        inv-spin
        700ms
        linear
        infinite !important;
}

@keyframes inv-spin {
    to {
        transform: rotate(360deg);
    }
}

#inventory-page .inv-pagination {
    display: flex !important;

    min-height: 62px !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 10px 14px !important;

    background: #ffffff !important;

    border-top:
        1px solid
        var(--inv-border) !important;
}

#inventory-page .inv-pagination-info {
    color: var(--inv-muted) !important;
    font-size: 12px !important;
}

#inventory-page .inv-pagination-info strong {
    color:
        var(
            --inv-text-secondary
        ) !important;

    font-weight: 700 !important;
}

#inventory-page .inv-pagination-actions {
    display: flex !important;

    align-items: center !important;
    gap: 7px !important;
}

#inventory-page .inv-page-indicator {
    display: inline-flex !important;

    min-height: 36px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 6px 9px !important;

    color:
        var(
            --inv-text-secondary
        ) !important;

    font-size: 11px !important;
    font-weight: 600 !important;

    white-space: nowrap !important;

    background: #f8faf9 !important;

    border:
        1px solid
        #e4e9e5 !important;

    border-radius: 8px !important;
}

#inventory-page .inv-page-button {
    display: inline-flex !important;

    min-height: 36px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;

    padding: 6px 9px !important;

    color: var(--inv-green-900) !important;

    font-size: 12px !important;
    font-weight: 650 !important;

    background: var(--inv-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#inventory-page
.inv-page-button:hover:not(:disabled) {
    color: #ffffff !important;

    background:
        var(--inv-green-800) !important;

    border-color:
        var(--inv-green-800) !important;
}

#inventory-page .inv-page-button:disabled {
    color: #98a2b3 !important;
    background: #f2f4f7 !important;
    border-color: #e4e7ec !important;
    cursor: not-allowed !important;
}

#inventory-page .inv-page-button svg {
    width: 15px !important;
    height: 15px !important;
}

@media (max-width: 900px) {
    #inventory-page .inv-product-summary {
        grid-template-columns:
            minmax(220px, 1.4fr)
            minmax(140px, 0.7fr)
            auto !important;
    }

    #inventory-page .inv-price-options-stat {
        display: none !important;
    }
}

@media (max-width: 700px) {
    #inventory-page .inv-header {
        align-items: stretch !important;
        flex-direction: column !important;

        padding: 16px !important;
    }

    #inventory-page .inv-title {
        font-size: 21px !important;
    }

    #inventory-page .inv-total-badge {
        width: 100% !important;
    }

    #inventory-page .inv-toolbar {
        grid-template-columns: 1fr !important;
    }

    #inventory-page .inv-page-size-field {
        grid-template-columns:
            minmax(0, 1fr)
            86px !important;
    }

    #inventory-page .inv-list {
        padding: 10px !important;
    }

    #inventory-page .inv-product-summary {
        grid-template-columns: 1fr !important;

        align-items: stretch !important;
        gap: 10px !important;

        padding: 12px !important;
    }

    #inventory-page .inv-stat {
        padding: 8px 9px !important;

        background: #f8faf9 !important;

        border:
            1px solid
            #e4e9e5 !important;

        border-radius: 8px !important;
    }

    #inventory-page .inv-price-options-stat {
        display: flex !important;
    }

    #inventory-page .inv-expand-button {
        width: 100% !important;
    }

    #inventory-page .inv-price-header {
        grid-template-columns: 1fr !important;
    }

    #inventory-page .inv-batch-table-wrap {
        display: none !important;
    }

    #inventory-page .inv-mobile-batches {
        display: flex !important;

        flex-direction: column !important;
        gap: 8px !important;

        padding: 9px !important;
    }

    #inventory-page .inv-mobile-batch {
        display: grid !important;
        gap: 8px !important;

        padding: 10px !important;

        background: #f8faf9 !important;

        border:
            1px solid
            #e1e7e2 !important;

        border-radius: 8px !important;
    }

    #inventory-page .inv-mobile-batch-row {
        display: flex !important;

        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
    }

    #inventory-page
    .inv-mobile-batch-row
    span:first-child {
        color: var(--inv-muted) !important;

        font-size: 10px !important;
        font-weight: 650 !important;
    }

    #inventory-page
    .inv-mobile-batch-row
    strong {
        max-width: 64% !important;

        color:
            var(
                --inv-text-secondary
            ) !important;

        font-size: 11px !important;
        font-weight: 700 !important;

        text-align: right !important;

        overflow-wrap: anywhere !important;
    }

    #inventory-page .inv-pagination {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #inventory-page .inv-pagination-actions {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #inventory-page .inv-page-indicator {
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;
    }

    #inventory-page .inv-page-button {
        width: 100% !important;
    }
}

@media (max-width: 480px) {
    #inventory-page .inv-alert {
        align-items: flex-start !important;
        flex-wrap: wrap !important;
    }

    #inventory-page .inv-retry {
        width: 100% !important;
    }

    #inventory-page .inv-detail-heading {
        align-items: flex-start !important;
        flex-direction: column !important;
        gap: 2px !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #inventory-page *,
    #inventory-page *::before,
    #inventory-page *::after {
        transition: none !important;
        scroll-behavior: auto !important;
    }

    #inventory-page .inv-spinner {
        animation-duration: 1.2s !important;
    }
}
`;

export default function InventoryPage() {
    const {
        token,
    } = useAuth();

    const searchInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const requestIdRef =
        useRef(0);

    const [
        products,
        setProducts,
    ] = useState<StockProduct[]>([]);

    const [
        expandedProductId,
        setExpandedProductId,
    ] = useState<number | null>(
        null,
    );

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        appliedSearch,
        setAppliedSearch,
    ] = useState('');

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        perPage,
        setPerPage,
    ] = useState(10);

    const [
        pagination,
        setPagination,
    ] = useState<StockPaginationMeta>(
        initialPagination,
    );

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const visibleStockTotal =
        useMemo(
            () => products.reduce(
                (
                    total,
                    product,
                ) => (
                    total
                    + numberValue(
                        product
                            .total_available_quantity,
                    )
                ),
                0,
            ),
            [products],
        );

    const loadStock =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                const requestId =
                    requestIdRef.current + 1;

                requestIdRef.current =
                    requestId;

                setIsLoading(true);
                setErrorMessage('');

                try {
                    const response =
                        await getStockProducts(
                            token,
                            {
                                page,
                                perPage,
                                search:
                                    appliedSearch,
                            },
                        );

                    if (
                        requestIdRef.current
                        !== requestId
                    ) {
                        return;
                    }

                    setProducts(
                        response.data,
                    );

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    if (
                        requestIdRef.current
                        !== requestId
                    ) {
                        return;
                    }

                    setProducts([]);

                    setErrorMessage(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load inventory.',
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
                page,
                perPage,
                appliedSearch,
            ],
        );

    useEffect(() => {
        void loadStock();
    }, [loadStock]);

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    setPage(1);

                    setAppliedSearch(
                        search.trim(),
                    );
                },
                300,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [search]);

    useEffect(() => {
        if (
            expandedProductId !== null
            && !products.some(
                (product) => (
                    product.id
                    === expandedProductId
                ),
            )
        ) {
            setExpandedProductId(null);
        }
    }, [
        expandedProductId,
        products,
    ]);

    const clearSearch = (): void => {
        setSearch('');
        setAppliedSearch('');
        setPage(1);

        searchInputRef.current?.focus();
    };

    return (
        <div id="inventory-page">
            <style>
                {inventoryStyles}
            </style>

            <header className="inv-header">
                <div className="inv-header-copy">
                    <span className="inv-kicker">
                        Stock Management
                    </span>

                    <h1 className="inv-title">
                        Inventory Overview
                    </h1>

                    <p className="inv-subtitle">
                        Review available quantities,
                        selling prices, stock batches
                        and expiry dates.
                    </p>
                </div>

                <div className="inv-header-meta">
                    <span className="inv-total-badge">
                        <Icon name="box" />

                        {pagination.total}
                        {' '}

                        {pagination.total === 1
                            ? 'Product'
                            : 'Products'}
                    </span>
                </div>
            </header>

            {errorMessage && (
                <div
                    className="inv-alert"
                    role="alert"
                >
                    <Icon name="alert" />

                    <span className="inv-alert-text">
                        {errorMessage}
                    </span>

                    <button
                        type="button"
                        className="inv-retry"
                        onClick={() => {
                            void loadStock();
                        }}
                    >
                        <Icon name="refresh" />

                        Retry
                    </button>
                </div>
            )}

            <section className="inv-panel">
                <div className="inv-toolbar">
                    <label className="inv-field">
                        <span className="inv-label">
                            Search Inventory
                        </span>

                        <span className="inv-search-wrapper">
                            <span
                                className="inv-search-icon"
                                aria-hidden="true"
                            >
                                <Icon name="search" />
                            </span>

                            <input
                                ref={searchInputRef}
                                type="search"
                                className="inv-search-input"
                                value={search}
                                autoComplete="off"
                                placeholder="Search by product name"
                                aria-label="Search inventory"
                                onChange={(event) => {
                                    setSearch(
                                        event.target.value,
                                    );
                                }}
                            />

                            {search && (
                                <button
                                    type="button"
                                    className="inv-clear-search"
                                    aria-label="Clear inventory search"
                                    onClick={clearSearch}
                                >
                                    <Icon name="close" />
                                </button>
                            )}
                        </span>
                    </label>

                    <label className="inv-page-size-field">
                        <span className="inv-label">
                            Rows per page
                        </span>

                        <select
                            className="inv-page-size-select"
                            value={perPage}
                            onChange={(event) => {
                                setPage(1);

                                setPerPage(
                                    Number(
                                        event.target.value,
                                    ),
                                );
                            }}
                        >
                            <option value={10}>
                                10
                            </option>

                            <option value={20}>
                                20
                            </option>

                            <option value={50}>
                                50
                            </option>
                        </select>
                    </label>
                </div>

                <div className="inv-list">
                    {isLoading ? (
                        <div
                            className="inv-state"
                            aria-live="polite"
                        >
                            <div className="inv-spinner" />

                            <strong>
                                Loading Inventory
                            </strong>

                            <span>
                                Retrieving product stock,
                                price options and batch
                                availability.
                            </span>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="inv-state">
                            <span className="inv-state-icon">
                                <Icon name="box" />
                            </span>

                            <strong>
                                {appliedSearch
                                    ? 'No Matching Products'
                                    : 'No Received Stock Found'}
                            </strong>

                            <span>
                                {appliedSearch
                                    ? 'Check the product name or clear the current search.'
                                    : 'Products will appear after purchase stock has been received.'}
                            </span>
                        </div>
                    ) : (
                        <>
                            <div className="inv-detail-heading">
                                <h3>
                                    Available Products
                                </h3>

                                <span>
                                    Visible stock:
                                    {' '}

                                    {formatQuantity(
                                        visibleStockTotal,
                                    )}
                                    {' '}
                                    units
                                </span>
                            </div>

                            {products.map(
                                (product) => {
                                    const isExpanded =
                                        expandedProductId
                                        === product.id;

                                    const detailsId =
                                        `inventory-product-${product.id}`;

                                    return (
                                        <article
                                            key={product.id}
                                            className={
                                                isExpanded
                                                    ? 'inv-product-card expanded'
                                                    : 'inv-product-card'
                                            }
                                        >
                                            <button
                                                type="button"
                                                className="inv-product-summary"
                                                aria-expanded={
                                                    isExpanded
                                                }
                                                aria-controls={
                                                    detailsId
                                                }
                                                onClick={() => {
                                                    setExpandedProductId(
                                                        isExpanded
                                                            ? null
                                                            : product.id,
                                                    );
                                                }}
                                            >
                                                <div className="inv-product-main">
                                                    <span className="inv-product-icon">
                                                        <Icon name="box" />
                                                    </span>

                                                    <span className="inv-product-copy">
                                                        <strong
                                                            className="inv-product-name"
                                                            title={
                                                                product.name
                                                            }
                                                        >
                                                            {product.name}
                                                        </strong>

                                                        <span className="inv-product-meta">
                                                            {product.category?.name
                                                                ?? 'General'}
                                                            {' · '}
                                                            {product.unit}
                                                        </span>
                                                    </span>
                                                </div>

                                                <span className="inv-stat">
                                                    <span className="inv-stat-label">
                                                        Total Available
                                                    </span>

                                                    <strong className="inv-stat-value">
                                                        {formatQuantity(
                                                            product
                                                                .total_available_quantity,
                                                        )}
                                                        {' '}
                                                        {product.unit}
                                                    </strong>
                                                </span>

                                                <span className="inv-stat inv-price-options-stat">
                                                    <span className="inv-stat-label">
                                                        Price Options
                                                    </span>

                                                    <strong className="inv-stat-value">
                                                        {product
                                                            .price_options
                                                            .length}
                                                    </strong>
                                                </span>

                                                <span className="inv-expand-button">
                                                    {isExpanded
                                                        ? (
                                                            <Icon name="chevron-up" />
                                                        )
                                                        : (
                                                            <Icon name="chevron-down" />
                                                        )}

                                                    {isExpanded
                                                        ? 'Hide Details'
                                                        : 'View Details'}
                                                </span>
                                            </button>

                                            {isExpanded && (
                                                <div
                                                    id={detailsId}
                                                    className="inv-details"
                                                >
                                                    <div className="inv-detail-heading">
                                                        <h3>
                                                            Price and Batch Details
                                                        </h3>

                                                        <span>
                                                            {product
                                                                .price_options
                                                                .length}
                                                            {' '}

                                                            {product.price_options.length === 1
                                                                ? 'price option'
                                                                : 'price options'}
                                                        </span>
                                                    </div>

                                                    {product.price_options.length === 0 ? (
                                                        <div className="inv-no-batches">
                                                            No price or batch
                                                            information is available
                                                            for this product.
                                                        </div>
                                                    ) : product.price_options.map(
                                                        (
                                                            priceOption,
                                                            priceIndex,
                                                        ) => (
                                                            <article
                                                                key={
                                                                    `${priceOption.selling_price}-${priceIndex}`
                                                                }
                                                                className="inv-price-card"
                                                            >
                                                                <div className="inv-price-header">
                                                                    <div className="inv-price-stat">
                                                                        <span className="inv-price-label">
                                                                            Selling Price
                                                                        </span>

                                                                        <strong className="inv-price-value">
                                                                            {currencyFormatter.format(
                                                                                numberValue(
                                                                                    priceOption
                                                                                        .selling_price,
                                                                                ),
                                                                            )}
                                                                        </strong>
                                                                    </div>

                                                                    <div className="inv-price-stat stock">
                                                                        <span className="inv-price-label">
                                                                            Available Stock
                                                                        </span>

                                                                        <strong className="inv-price-value">
                                                                            {formatQuantity(
                                                                                priceOption
                                                                                    .available_quantity,
                                                                            )}
                                                                            {' '}
                                                                            {product.unit}
                                                                        </strong>
                                                                    </div>
                                                                </div>

                                                                {priceOption.batches.length === 0 ? (
                                                                    <div className="inv-no-batches">
                                                                        No active batches
                                                                        are available for
                                                                        this price option.
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className="inv-batch-table-wrap">
                                                                            <table className="inv-batch-table">
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th>
                                                                                            Stock Reference
                                                                                        </th>

                                                                                        <th>
                                                                                            Available
                                                                                        </th>

                                                                                        <th>
                                                                                            Expiry Date
                                                                                        </th>
                                                                                    </tr>
                                                                                </thead>

                                                                                <tbody>
                                                                                    {priceOption.batches.map(
                                                                                        (batch) => {
                                                                                            const status =
                                                                                                expiryStatus(
                                                                                                    batch.expiry_date,
                                                                                                );

                                                                                            return (
                                                                                                <tr key={batch.id}>
                                                                                                    <td>
                                                                                                        <span className="inv-batch-reference">
                                                                                                            <Icon name="tag" />

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

                                                                                                    <td className="inv-quantity-cell">
                                                                                                        {formatQuantity(
                                                                                                            batch.available_quantity,
                                                                                                        )}
                                                                                                        {' '}
                                                                                                        {product.unit}
                                                                                                    </td>

                                                                                                    <td>
                                                                                                        <span
                                                                                                            className={
                                                                                                                `inv-expiry ${status}`
                                                                                                            }
                                                                                                        >
                                                                                                            <Icon name="calendar" />

                                                                                                            {formatDate(
                                                                                                                batch.expiry_date,
                                                                                                            )}
                                                                                                        </span>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            );
                                                                                        },
                                                                                    )}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>

                                                                        <div className="inv-mobile-batches">
                                                                            {priceOption.batches.map(
                                                                                (batch) => (
                                                                                    <article
                                                                                        key={batch.id}
                                                                                        className="inv-mobile-batch"
                                                                                    >
                                                                                        <div className="inv-mobile-batch-row">
                                                                                            <span>
                                                                                                Stock Reference
                                                                                            </span>

                                                                                            <strong>
                                                                                                {batch.batch_number
                                                                                                    || batch.batch_code
                                                                                                    || `Stock #${batch.id}`}
                                                                                            </strong>
                                                                                        </div>

                                                                                        <div className="inv-mobile-batch-row">
                                                                                            <span>
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

                                                                                        <div className="inv-mobile-batch-row">
                                                                                            <span>
                                                                                                Expiry Date
                                                                                            </span>

                                                                                            <strong>
                                                                                                {formatDate(
                                                                                                    batch.expiry_date,
                                                                                                )}
                                                                                            </strong>
                                                                                        </div>
                                                                                    </article>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </article>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                        </article>
                                    );
                                },
                            )}
                        </>
                    )}
                </div>

                {!isLoading
                    && pagination.total > 0 && (
                        <footer className="inv-pagination">
                            <p className="inv-pagination-info">
                                Showing
                                {' '}

                                <strong>
                                    {pagination.from ?? 0}
                                </strong>

                                {' '}to{' '}

                                <strong>
                                    {pagination.to ?? 0}
                                </strong>

                                {' '}of{' '}

                                <strong>
                                    {pagination.total}
                                </strong>

                                {' '}products
                            </p>

                            <div className="inv-pagination-actions">
                                <button
                                    type="button"
                                    className="inv-page-button"
                                    disabled={
                                        pagination.current_page
                                        <= 1
                                    }
                                    onClick={() => {
                                        setPage(
                                            (
                                                currentPage,
                                            ) =>
                                                Math.max(
                                                    1,
                                                    currentPage - 1,
                                                ),
                                        );
                                    }}
                                >
                                    <Icon name="chevron-left" />

                                    Previous
                                </button>

                                <span className="inv-page-indicator">
                                    Page
                                    {' '}
                                    {pagination.current_page}
                                    {' '}of{' '}
                                    {pagination.last_page}
                                </span>

                                <button
                                    type="button"
                                    className="inv-page-button"
                                    disabled={
                                        pagination.current_page
                                        >= pagination.last_page
                                    }
                                    onClick={() => {
                                        setPage(
                                            (
                                                currentPage,
                                            ) =>
                                                Math.min(
                                                    pagination.last_page,
                                                    currentPage + 1,
                                                ),
                                        );
                                    }}
                                >
                                    Next

                                    <Icon name="chevron-right" />
                                </button>
                            </div>
                        </footer>
                    )}
            </section>
        </div>
    );
}