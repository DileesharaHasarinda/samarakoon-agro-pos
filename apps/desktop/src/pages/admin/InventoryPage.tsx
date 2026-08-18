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
    | 'chevron-left'
    | 'chevron-right'
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
    const parsed =
        Number(
            value,
        );

    return Number.isFinite(
        parsed,
    )
        ? parsed
        : 0;
}

function formatQuantity(
    value: unknown,
): string {
    return quantityFormatter.format(
        numberValue(
            value,
        ),
    );
}

function formatDate(
    value: string | null,
): string {
    if (!value) {
        return 'No expiry date';
    }

    const date =
        new Date(
            `${value.substring(
                0,
                10,
            )}T00:00:00`,
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
    ).format(
        date,
    );
}

function expiryStatus(
    value: string | null,
): 'expired' | 'soon' | 'normal' | 'none' {
    if (!value) {
        return 'none';
    }

    const expiryDate =
        new Date(
            `${value.substring(
                0,
                10,
            )}T23:59:59`,
        );

    if (
        Number.isNaN(
            expiryDate.getTime(),
        )
    ) {
        return 'none';
    }

    const daysRemaining =
        Math.ceil(
            (
                expiryDate.getTime()
                - new Date().getTime()
            )
            / 86_400_000,
        );

    if (
        daysRemaining < 0
    ) {
        return 'expired';
    }

    if (
        daysRemaining <= 30
    ) {
        return 'soon';
    }

    return 'normal';
}

const inventoryStyles = `
#inventory-page,
#inventory-page *,
#inventory-page *::before,
#inventory-page *::after,
#inventory-details-modal,
#inventory-details-modal *,
#inventory-details-modal *::before,
#inventory-details-modal *::after {
    box-sizing: border-box !important;
}

#inventory-page,
#inventory-details-modal {
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

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif !important;
}

#inventory-page {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 14px !important;
    margin: 0 !important;
    padding: 0 !important;
    color: var(--inv-text) !important;
    font-size: 14px !important;
    line-height: 1.5 !important;
    background: transparent !important;
    isolation: isolate !important;
    overflow-x: hidden !important;
}

#inventory-page button,
#inventory-page input,
#inventory-page select,
#inventory-details-modal button {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#inventory-page h1,
#inventory-page h2,
#inventory-page h3,
#inventory-page p,
#inventory-details-modal h2,
#inventory-details-modal h3,
#inventory-details-modal p {
    margin: 0 !important;
}

/* =========================================================
   PAGE HEADER
   ========================================================= */

#inventory-page .inv-header {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    flex-wrap: wrap !important;
    gap: 16px !important;
    padding: 20px 24px !important;
    background: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 10px !important;
}

#inventory-page .inv-header-copy {
    min-width: 0 !important;
    flex: 1 1 420px !important;
}

#inventory-page .inv-kicker {
    display: inline-block !important;
    margin-bottom: 6px !important;
    color: var(--inv-green-700) !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    letter-spacing: .04em !important;
    text-transform: uppercase !important;
}

#inventory-page .inv-title {
    color: var(--inv-text) !important;
    font-size: 22px !important;
    font-weight: 700 !important;
    line-height: 1.3 !important;
}

#inventory-page .inv-subtitle {
    margin-top: 4px !important;
    color: var(--inv-muted) !important;
    font-size: 13.5px !important;
}

#inventory-page .inv-header-meta {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
}

#inventory-page .inv-total-badge {
    display: inline-flex !important;
    min-height: 36px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    padding: 7px 11px !important;
    color: var(--inv-green-900) !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    background: var(--inv-green-50) !important;
    border: 1px solid #bbf7d0 !important;
    border-radius: 8px !important;
}

#inventory-page .inv-total-badge svg {
    width: 15px !important;
    height: 15px !important;
}

/* =========================================================
   ALERT
   ========================================================= */

#inventory-page .inv-alert {
    display: flex !important;
    width: 100% !important;
    min-height: 48px !important;
    align-items: center !important;
    gap: 9px !important;
    padding: 10px 12px !important;
    color: var(--inv-red-700) !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    background: var(--inv-red-50) !important;
    border: 1px solid #f3b5af !important;
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
    border: 1px solid #e8aaa4 !important;
    border-radius: 7px !important;
    cursor: pointer !important;
}

#inventory-page .inv-retry svg {
    width: 14px !important;
    height: 14px !important;
}

/* =========================================================
   CONTENT CARD + TOOLBAR
   ========================================================= */

#inventory-page .inv-panel {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 16px !important;
    padding: 20px !important;
    background: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 10px !important;
}

#inventory-page .inv-toolbar {
    display: flex !important;
    width: 100% !important;
    flex-wrap: wrap !important;
    align-items: flex-end !important;
    gap: 12px !important;
}

#inventory-page .inv-field {
    display: grid !important;
    min-width: 0 !important;
    flex: 1 1 300px !important;
    gap: 5px !important;
}

#inventory-page .inv-label {
    color: var(--inv-text-secondary) !important;
    font-size: 12px !important;
    font-weight: 650 !important;
}

#inventory-page .inv-search-wrapper {
    position: relative !important;
    display: block !important;
    width: 100% !important;
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
    transform: translateY(-50%) !important;
    pointer-events: none !important;
}

#inventory-page .inv-search-icon svg {
    width: 18px !important;
    height: 18px !important;
}

#inventory-page .inv-search-input,
#inventory-page .inv-page-size-select {
    height: 38px !important;
    min-height: 38px !important;
    color: var(--inv-text) !important;
    font-size: 13.5px !important;
    outline: none !important;
    background: #f9fafb !important;
    border: 1px solid #d1d5db !important;
    border-radius: 8px !important;
}

#inventory-page .inv-search-input {
    width: 100% !important;
    padding: 0 42px 0 40px !important;
}

#inventory-page .inv-page-size-field {
    display: grid !important;
    grid-template-columns: auto 86px !important;
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
    border-color: var(--inv-green-700) !important;
    box-shadow: 0 0 0 3px rgba(22, 163, 74, .12) !important;
}

#inventory-page .inv-clear-search {
    position: absolute !important;
    top: 50% !important;
    right: 5px !important;
    z-index: 3 !important;
    display: grid !important;
    width: 30px !important;
    height: 30px !important;
    place-items: center !important;
    padding: 0 !important;
    color: var(--inv-muted) !important;
    background: transparent !important;
    border: 0 !important;
    border-radius: 7px !important;
    transform: translateY(-50%) !important;
    cursor: pointer !important;
}

#inventory-page .inv-clear-search:hover {
    background: #f1f5f9 !important;
}

#inventory-page .inv-clear-search svg {
    width: 15px !important;
    height: 15px !important;
}

/* =========================================================
   INVENTORY TABLE
   ========================================================= */

#inventory-page .inv-table-container {
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
    max-height: 520px !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 8px !important;
    scrollbar-width: thin !important;
}

#inventory-page .inv-table {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    table-layout: fixed !important;
    border-collapse: collapse !important;
    background: #ffffff !important;
}

#inventory-page .inv-table thead {
    position: sticky !important;
    top: 0 !important;
    z-index: 2 !important;
}

#inventory-page .inv-table th {
    padding: 12px 10px !important;
    color: #6b7280 !important;
    font-size: 11px !important;
    font-weight: 650 !important;
    line-height: 1.25 !important;
    text-align: left !important;
    text-transform: uppercase !important;
    background: #f9fafb !important;
    border-bottom: 1px solid #e5e7eb !important;
    overflow-wrap: anywhere !important;
}

#inventory-page .inv-table td {
    padding: 13px 10px !important;
    color: #1f2937 !important;
    font-size: 12.5px !important;
    vertical-align: middle !important;
    border-bottom: 1px solid #f1f5f9 !important;
    overflow-wrap: anywhere !important;
}

#inventory-page .inv-table tbody tr:last-child td {
    border-bottom: 0 !important;
}

#inventory-page .inv-table tbody tr:hover td {
    background: #f9fafb !important;
}

#inventory-page .inv-col-product {
    width: 35% !important;
}

#inventory-page .inv-col-category {
    width: 18% !important;
}

#inventory-page .inv-col-stock {
    width: 18% !important;
}

#inventory-page .inv-col-options {
    width: 12% !important;
}

#inventory-page .inv-col-action {
    width: 17% !important;
}

#inventory-page .inv-product-cell {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 10px !important;
}

#inventory-page .inv-product-icon {
    display: grid !important;
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    place-items: center !important;
    color: var(--inv-green-900) !important;
    background: var(--inv-green-50) !important;
    border: 1px solid #bbf7d0 !important;
    border-radius: 8px !important;
}

#inventory-page .inv-product-icon svg {
    width: 17px !important;
    height: 17px !important;
}

#inventory-page .inv-product-copy {
    min-width: 0 !important;
}

#inventory-page .inv-product-name {
    display: block !important;
    overflow: hidden !important;
    color: var(--inv-text) !important;
    font-size: 13px !important;
    font-weight: 650 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#inventory-page .inv-product-unit {
    display: block !important;
    margin-top: 2px !important;
    color: #9ca3af !important;
    font-size: 11.5px !important;
}

#inventory-page .inv-category-badge {
    display: inline-flex !important;
    min-height: 24px !important;
    align-items: center !important;
    padding: 4px 9px !important;
    color: #475569 !important;
    font-size: 11.5px !important;
    font-weight: 600 !important;
    background: #f1f5f9 !important;
    border-radius: 999px !important;
}

#inventory-page .inv-stock-value {
    color: var(--inv-green-800) !important;
    font-weight: 750 !important;
    font-variant-numeric: tabular-nums !important;
}

#inventory-page .inv-options-badge {
    display: inline-flex !important;
    min-height: 24px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 4px 9px !important;
    color: var(--inv-blue-700) !important;
    font-size: 11.5px !important;
    font-weight: 650 !important;
    background: var(--inv-blue-50) !important;
    border-radius: 999px !important;
}

#inventory-page .inv-view-button {
    display: inline-flex !important;
    min-width: 86px !important;
    min-height: 30px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;
    padding: 5px 9px !important;
    color: var(--inv-blue-700) !important;
    font-size: 11.5px !important;
    font-weight: 650 !important;
    background: var(--inv-blue-50) !important;
    border: 1px solid #bfdbfe !important;
    border-radius: 6px !important;
    cursor: pointer !important;
}

#inventory-page .inv-view-button:hover {
    color: #ffffff !important;
    background: var(--inv-blue-700) !important;
    border-color: var(--inv-blue-700) !important;
}

#inventory-page .inv-view-button svg {
    width: 14px !important;
    height: 14px !important;
}

#inventory-page .inv-table-state {
    padding: 42px 16px !important;
    color: #9ca3af !important;
    font-size: 13.5px !important;
    text-align: center !important;
}

/* =========================================================
   PAGINATION
   ========================================================= */

#inventory-page .inv-pagination {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 16px !important;
    padding-top: 4px !important;
}

#inventory-page .inv-pagination-button {
    min-width: 90px !important;
    min-height: 36px !important;
    padding: 7px 16px !important;
    color: #374151 !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    background: #ffffff !important;
    border: 1px solid #d1d5db !important;
    border-radius: 6px !important;
    cursor: pointer !important;
}

#inventory-page .inv-pagination-button:hover:not(:disabled) {
    background: #f9fafb !important;
    border-color: #9ca3af !important;
}

#inventory-page .inv-pagination-button:disabled {
    opacity: .5 !important;
    cursor: not-allowed !important;
}

#inventory-page .inv-pagination span {
    color: #6b7280 !important;
    font-size: 13px !important;
}

/* =========================================================
   DETAILS MODAL
   ========================================================= */

#inventory-details-modal {
    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;
    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    color: var(--inv-text) !important;
    font-size: 14px !important;
    line-height: 1.5 !important;
    isolation: isolate !important;
}

#inventory-details-modal svg {
    display: block !important;
    width: 18px !important;
    height: 18px !important;
    flex-shrink: 0 !important;
}

#inventory-details-modal .idm-backdrop {
    position: absolute !important;
    inset: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 18px !important;
    overflow: auto !important;
    background: rgba(3, 18, 10, .74) !important;
    backdrop-filter: blur(4px) !important;
}

#inventory-details-modal .idm-dialog {
    display: flex !important;
    width: min(980px, 100%) !important;
    max-height: calc(100dvh - 36px) !important;
    min-width: 0 !important;
    min-height: 0 !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid var(--inv-border) !important;
    border-radius: 16px !important;
    box-shadow: 0 28px 80px rgba(0, 0, 0, .38) !important;
}

#inventory-details-modal .idm-header {
    display: flex !important;
    min-height: 86px !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 16px !important;
    padding: 14px 18px !important;
    color: #ffffff !important;
    background: linear-gradient(
        135deg,
        var(--inv-green-950),
        var(--inv-green-700)
    ) !important;
}

#inventory-details-modal .idm-header-main {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 12px !important;
}

#inventory-details-modal .idm-header-icon {
    display: grid !important;
    width: 46px !important;
    height: 46px !important;
    min-width: 46px !important;
    place-items: center !important;
    color: var(--inv-green-900) !important;
    background: #ffffff !important;
    border-radius: 11px !important;
}

#inventory-details-modal .idm-header-icon svg {
    width: 23px !important;
    height: 23px !important;
}

#inventory-details-modal .idm-kicker {
    display: block !important;
    margin-bottom: 2px !important;
    color: #bbf7d0 !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    letter-spacing: .055em !important;
    text-transform: uppercase !important;
}

#inventory-details-modal .idm-title {
    overflow: hidden !important;
    color: #ffffff !important;
    font-size: 22px !important;
    font-weight: 780 !important;
    line-height: 1.25 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#inventory-details-modal .idm-close {
    display: grid !important;
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    place-items: center !important;
    padding: 0 !important;
    color: #ffffff !important;
    background: rgba(255,255,255,.12) !important;
    border: 1px solid rgba(255,255,255,.34) !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#inventory-details-modal .idm-close:hover {
    background: rgba(255,255,255,.22) !important;
}

#inventory-details-modal .idm-body {
    display: flex !important;
    min-height: 0 !important;
    flex: 1 1 auto !important;
    flex-direction: column !important;
    gap: 14px !important;
    padding: 16px !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    background: #f5f8f6 !important;
    scrollbar-width: thin !important;
}

#inventory-details-modal .idm-overview {
    display: grid !important;
    grid-template-columns:
        minmax(0, 1.3fr)
        minmax(150px, .7fr)
        minmax(150px, .7fr) !important;
    gap: 10px !important;
}

#inventory-details-modal .idm-overview-card {
    display: flex !important;
    min-width: 0 !important;
    min-height: 78px !important;
    flex-direction: column !important;
    justify-content: center !important;
    gap: 3px !important;
    padding: 12px 14px !important;
    background: #ffffff !important;
    border: 1px solid var(--inv-border) !important;
    border-radius: 10px !important;
}

#inventory-details-modal .idm-overview-card span {
    color: var(--inv-muted) !important;
    font-size: 10px !important;
    font-weight: 750 !important;
    letter-spacing: .035em !important;
    text-transform: uppercase !important;
}

#inventory-details-modal .idm-overview-card strong {
    overflow: hidden !important;
    color: var(--inv-text) !important;
    font-size: 15px !important;
    font-weight: 780 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#inventory-details-modal .idm-overview-card.stock strong {
    color: var(--inv-green-800) !important;
    font-size: 18px !important;
}

#inventory-details-modal .idm-overview-card.options strong {
    color: var(--inv-blue-700) !important;
    font-size: 18px !important;
}

#inventory-details-modal .idm-section {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 10px !important;
    padding: 14px !important;
    background: #ffffff !important;
    border: 1px solid var(--inv-border) !important;
    border-radius: 11px !important;
}

#inventory-details-modal .idm-section-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    padding-bottom: 10px !important;
    border-bottom: 1px solid #e7ece8 !important;
}

#inventory-details-modal .idm-section-heading {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 8px !important;
}

#inventory-details-modal .idm-section-heading svg {
    color: var(--inv-green-700) !important;
}

#inventory-details-modal .idm-section-title {
    color: var(--inv-text-secondary) !important;
    font-size: 15px !important;
    font-weight: 780 !important;
}

#inventory-details-modal .idm-section-count {
    color: var(--inv-muted) !important;
    font-size: 11px !important;
}

#inventory-details-modal .idm-price-list {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 10px !important;
}

#inventory-details-modal .idm-price-card {
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid #d9e2dc !important;
    border-radius: 10px !important;
}

#inventory-details-modal .idm-price-summary {
    display: grid !important;
    grid-template-columns:
        repeat(2, minmax(0, 1fr)) !important;
    gap: 1px !important;
    background: #d9e2dc !important;
}

#inventory-details-modal .idm-price-stat {
    display: flex !important;
    min-width: 0 !important;
    min-height: 70px !important;
    flex-direction: column !important;
    justify-content: center !important;
    gap: 2px !important;
    padding: 10px 12px !important;
    background: var(--inv-green-50) !important;
}

#inventory-details-modal .idm-price-stat.stock {
    background: var(--inv-blue-50) !important;
}

#inventory-details-modal .idm-price-stat span {
    color: var(--inv-muted) !important;
    font-size: 9px !important;
    font-weight: 750 !important;
    letter-spacing: .035em !important;
    text-transform: uppercase !important;
}

#inventory-details-modal .idm-price-stat strong {
    color: var(--inv-green-900) !important;
    font-size: 16px !important;
    font-weight: 800 !important;
}

#inventory-details-modal .idm-price-stat.stock strong {
    color: var(--inv-blue-700) !important;
}

#inventory-details-modal .idm-batch-wrap {
    width: 100% !important;
    min-width: 0 !important;
    overflow-x: hidden !important;
}

#inventory-details-modal .idm-batch-table {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    table-layout: fixed !important;
    border-collapse: collapse !important;
}

#inventory-details-modal .idm-batch-table th {
    padding: 10px 11px !important;
    color: var(--inv-muted) !important;
    font-size: 10px !important;
    font-weight: 750 !important;
    text-align: left !important;
    text-transform: uppercase !important;
    background: #f8faf9 !important;
    border-bottom: 1px solid #e5eae6 !important;
}

#inventory-details-modal .idm-batch-table td {
    padding: 10px 11px !important;
    color: var(--inv-text-secondary) !important;
    font-size: 12px !important;
    vertical-align: middle !important;
    border-bottom: 1px solid #edf1ee !important;
    overflow-wrap: anywhere !important;
}

#inventory-details-modal .idm-batch-table tbody tr:last-child td {
    border-bottom: 0 !important;
}

#inventory-details-modal .idm-batch-table th:nth-child(1),
#inventory-details-modal .idm-batch-table td:nth-child(1) {
    width: 42% !important;
}

#inventory-details-modal .idm-batch-table th:nth-child(2),
#inventory-details-modal .idm-batch-table td:nth-child(2) {
    width: 25% !important;
}

#inventory-details-modal .idm-batch-table th:nth-child(3),
#inventory-details-modal .idm-batch-table td:nth-child(3) {
    width: 33% !important;
}

#inventory-details-modal .idm-batch-reference {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 7px !important;
}

#inventory-details-modal .idm-batch-reference svg {
    width: 15px !important;
    height: 15px !important;
    color: var(--inv-green-700) !important;
}

#inventory-details-modal .idm-batch-reference strong {
    overflow: hidden !important;
    color: var(--inv-text) !important;
    font-size: 12px !important;
    font-weight: 680 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#inventory-details-modal .idm-quantity {
    color: var(--inv-green-800) !important;
    font-weight: 750 !important;
}

#inventory-details-modal .idm-expiry {
    display: inline-flex !important;
    min-height: 27px !important;
    align-items: center !important;
    gap: 5px !important;
    padding: 4px 7px !important;
    color: var(--inv-text-secondary) !important;
    font-size: 10px !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
    background: #f8faf9 !important;
    border: 1px solid #e4e9e5 !important;
    border-radius: 999px !important;
}

#inventory-details-modal .idm-expiry svg {
    width: 13px !important;
    height: 13px !important;
}

#inventory-details-modal .idm-expiry.expired {
    color: var(--inv-red-700) !important;
    background: var(--inv-red-50) !important;
    border-color: #f3b5af !important;
}

#inventory-details-modal .idm-expiry.soon {
    color: var(--inv-amber-700) !important;
    background: var(--inv-amber-50) !important;
    border-color: #f0d48f !important;
}

#inventory-details-modal .idm-empty {
    padding: 22px 12px !important;
    color: var(--inv-muted) !important;
    font-size: 12px !important;
    text-align: center !important;
}

#inventory-details-modal .idm-mobile-batches {
    display: none !important;
}

#inventory-details-modal .idm-footer {
    display: flex !important;
    min-height: 64px !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: flex-end !important;
    padding: 11px 16px !important;
    background: #ffffff !important;
    border-top: 1px solid var(--inv-border) !important;
}

#inventory-details-modal .idm-footer-button {
    display: inline-flex !important;
    min-width: 100px !important;
    min-height: 38px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 7px 14px !important;
    color: #374151 !important;
    font-size: 13px !important;
    font-weight: 650 !important;
    background: #ffffff !important;
    border: 1px solid #d1d5db !important;
    border-radius: 7px !important;
    cursor: pointer !important;
}

#inventory-details-modal .idm-footer-button:hover {
    background: #f9fafb !important;
}

/* =========================================================
   RESPONSIVE
   ========================================================= */

@media (max-width: 850px) {
    #inventory-page .inv-table-container {
        max-height: none !important;
        overflow: visible !important;
        border: 0 !important;
        background: #f9fafb !important;
    }

    #inventory-page .inv-table,
    #inventory-page .inv-table tbody,
    #inventory-page .inv-table tr,
    #inventory-page .inv-table td {
        display: block !important;
        width: 100% !important;
    }

    #inventory-page .inv-table thead {
        display: none !important;
    }

    #inventory-page .inv-table tbody {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
    }

    #inventory-page .inv-table tbody tr {
        overflow: hidden !important;
        background: #ffffff !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
    }

    #inventory-page .inv-table td {
        display: grid !important;
        grid-template-columns:
            135px minmax(0, 1fr) !important;
        align-items: center !important;
        gap: 12px !important;
        min-height: 44px !important;
        padding: 10px 14px !important;
        border-bottom: 1px solid #e5e7eb !important;
    }

    #inventory-page .inv-table td:last-child {
        border-bottom: 0 !important;
    }

    #inventory-page .inv-table td::before {
        content: attr(data-label) !important;
        color: #6b7280 !important;
        font-size: 11px !important;
        font-weight: 650 !important;
        text-transform: uppercase !important;
    }

    #inventory-page .inv-table td.inv-table-state {
        display: block !important;
        padding: 40px 16px !important;
        text-align: center !important;
    }

    #inventory-page .inv-table td.inv-table-state::before {
        display: none !important;
        content: none !important;
    }

    #inventory-details-modal .idm-overview {
        grid-template-columns: 1fr !important;
    }
}

@media (max-width: 700px) {
    #inventory-page .inv-header {
        flex-direction: column !important;
        align-items: stretch !important;
        padding: 16px !important;
    }

    #inventory-page .inv-total-badge {
        width: 100% !important;
    }

    #inventory-page .inv-toolbar {
        flex-direction: column !important;
        align-items: stretch !important;
    }

    #inventory-page .inv-field,
    #inventory-page .inv-page-size-field {
        width: 100% !important;
    }

    #inventory-page .inv-pagination {
        flex-direction: column !important;
        align-items: stretch !important;
    }

    #inventory-page .inv-pagination-button {
        width: 100% !important;
    }

    #inventory-page .inv-pagination span {
        text-align: center !important;
    }

    #inventory-details-modal .idm-backdrop {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    #inventory-details-modal .idm-dialog {
        width: 100% !important;
        max-height: 96dvh !important;
        border-radius: 16px 16px 0 0 !important;
    }

    #inventory-details-modal .idm-title {
        font-size: 19px !important;
    }

    #inventory-details-modal .idm-price-summary {
        grid-template-columns: 1fr !important;
    }

    #inventory-details-modal .idm-batch-wrap {
        display: none !important;
    }

    #inventory-details-modal .idm-mobile-batches {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        padding: 9px !important;
    }

    #inventory-details-modal .idm-mobile-batch {
        display: grid !important;
        gap: 8px !important;
        padding: 10px !important;
        background: #f8faf9 !important;
        border: 1px solid #e1e7e2 !important;
        border-radius: 8px !important;
    }

    #inventory-details-modal .idm-mobile-batch-row {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
    }

    #inventory-details-modal .idm-mobile-batch-row span:first-child {
        color: var(--inv-muted) !important;
        font-size: 10px !important;
        font-weight: 650 !important;
    }

    #inventory-details-modal .idm-mobile-batch-row strong {
        max-width: 64% !important;
        color: var(--inv-text-secondary) !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        text-align: right !important;
        overflow-wrap: anywhere !important;
    }
}

@media (max-width: 480px) {
    #inventory-page .inv-table td {
        grid-template-columns:
            110px minmax(0, 1fr) !important;
    }

    #inventory-details-modal .idm-header {
        padding: 12px 13px !important;
    }

    #inventory-details-modal .idm-header-icon {
        display: none !important;
    }

    #inventory-details-modal .idm-body {
        padding: 12px !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #inventory-page *,
    #inventory-page *::before,
    #inventory-page *::after,
    #inventory-details-modal *,
    #inventory-details-modal *::before,
    #inventory-details-modal *::after {
        transition: none !important;
        scroll-behavior: auto !important;
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
        useRef(
            0,
        );

    const [
        products,
        setProducts,
    ] =
        useState<
            StockProduct[]
        >(
            [],
        );

    const [
        selectedProduct,
        setSelectedProduct,
    ] =
        useState<
            StockProduct | null
        >(
            null,
        );

    const [
        search,
        setSearch,
    ] =
        useState(
            '',
        );

    const [
        appliedSearch,
        setAppliedSearch,
    ] =
        useState(
            '',
        );

    const [
        page,
        setPage,
    ] =
        useState(
            1,
        );

    const [
        perPage,
        setPerPage,
    ] =
        useState(
            10,
        );

    const [
        pagination,
        setPagination,
    ] =
        useState<StockPaginationMeta>(
            initialPagination,
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

    const visibleStockTotal =
        useMemo(
            () =>
                products.reduce(
                    (
                        total,
                        product,
                    ) =>
                        total
                        + numberValue(
                            product
                                .total_available_quantity,
                        ),
                    0,
                ),
            [
                products,
            ],
        );

    const loadStock =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
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

                    setProducts(
                        [],
                    );

                    setErrorMessage(
                        error
                            instanceof ApiError
                            ? error.message
                            : 'Unable to load inventory.',
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
                page,
                perPage,
                appliedSearch,
            ],
        );

    useEffect(
        () => {
            void loadStock();
        },
        [
            loadStock,
        ],
    );

    useEffect(
        () => {
            const timeout =
                window.setTimeout(
                    () => {
                        setPage(
                            1,
                        );

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
        },
        [
            search,
        ],
    );

    /*
     * Close details when the visible page changes and the
     * selected product is no longer part of the loaded data.
     */
    useEffect(
        () => {
            if (
                selectedProduct
                && !products.some(
                    (
                        product,
                    ) =>
                        product.id
                        === selectedProduct.id,
                )
            ) {
                setSelectedProduct(
                    null,
                );
            }
        },
        [
            products,
            selectedProduct,
        ],
    );

    /*
     * Modal body lock + Escape close.
     */
    useEffect(
        () => {
            if (
                !selectedProduct
            ) {
                return;
            }

            const previousOverflow =
                document.body
                    .style
                    .overflow;

            document.body
                .style
                .overflow =
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
                        event.preventDefault();

                        setSelectedProduct(
                            null,
                        );
                    }
                };

            window.addEventListener(
                'keydown',
                handleKeyDown,
            );

            return () => {
                document.body
                    .style
                    .overflow =
                    previousOverflow;

                window.removeEventListener(
                    'keydown',
                    handleKeyDown,
                );
            };
        },
        [
            selectedProduct,
        ],
    );

    const clearSearch =
        (): void => {
            setSearch(
                '',
            );

            setAppliedSearch(
                '',
            );

            setPage(
                1,
            );

            searchInputRef
                .current
                ?.focus();
        };

    const detailsModal =
        selectedProduct
            && typeof document
            !== 'undefined'
            ? createPortal(
                <div id="inventory-details-modal">
                    <style>
                        {inventoryStyles}
                    </style>

                    <div
                        className="idm-backdrop"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (
                                event.target
                                === event.currentTarget
                            ) {
                                setSelectedProduct(
                                    null,
                                );
                            }
                        }}
                    >
                        <section
                            className="idm-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="inventory-details-title"
                        >
                            <header className="idm-header">
                                <div className="idm-header-main">
                                    <span className="idm-header-icon">
                                        <Icon name="box" />
                                    </span>

                                    <div>
                                        <span className="idm-kicker">
                                            Inventory Details
                                        </span>

                                        <h2
                                            id="inventory-details-title"
                                            className="idm-title"
                                            title={
                                                selectedProduct.name
                                            }
                                        >
                                            {selectedProduct.name}
                                        </h2>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="idm-close"
                                    aria-label="Close inventory details"
                                    onClick={() => {
                                        setSelectedProduct(
                                            null,
                                        );
                                    }}
                                >
                                    <Icon name="close" />
                                </button>
                            </header>

                            <div className="idm-body">
                                <div className="idm-overview">
                                    <div className="idm-overview-card">
                                        <span>
                                            Product
                                        </span>

                                        <strong>
                                            {selectedProduct.name}
                                        </strong>

                                        <small>
                                            {selectedProduct.category?.name
                                                ?? 'General'}
                                            {' • '}
                                            {selectedProduct.unit}
                                        </small>
                                    </div>

                                    <div className="idm-overview-card stock">
                                        <span>
                                            Total Available Stock
                                        </span>

                                        <strong>
                                            {formatQuantity(
                                                selectedProduct
                                                    .total_available_quantity,
                                            )}
                                            {' '}
                                            {selectedProduct.unit}
                                        </strong>
                                    </div>

                                    <div className="idm-overview-card options">
                                        <span>
                                            Price Options
                                        </span>

                                        <strong>
                                            {selectedProduct
                                                .price_options
                                                .length}
                                        </strong>
                                    </div>
                                </div>

                                <section className="idm-section">
                                    <header className="idm-section-header">
                                        <div className="idm-section-heading">
                                            <Icon name="layers" />

                                            <h3 className="idm-section-title">
                                                Price and Batch Details
                                            </h3>
                                        </div>

                                        <span className="idm-section-count">
                                            {selectedProduct
                                                .price_options
                                                .length}
                                            {' '}

                                            {selectedProduct
                                                .price_options
                                                .length
                                                === 1
                                                ? 'price option'
                                                : 'price options'}
                                        </span>
                                    </header>

                                    {selectedProduct
                                        .price_options
                                        .length
                                        === 0 ? (
                                        <div className="idm-empty">
                                            No price or batch information
                                            is available for this product.
                                        </div>
                                    ) : (
                                        <div className="idm-price-list">
                                            {selectedProduct
                                                .price_options
                                                .map(
                                                    (
                                                        priceOption,
                                                        priceIndex,
                                                    ) => (
                                                        <article
                                                            key={
                                                                `${priceOption.selling_price}-${priceIndex}`
                                                            }
                                                            className="idm-price-card"
                                                        >
                                                            <div className="idm-price-summary">
                                                                <div className="idm-price-stat">
                                                                    <span>
                                                                        Selling Price
                                                                    </span>

                                                                    <strong>
                                                                        {currencyFormatter.format(
                                                                            numberValue(
                                                                                priceOption
                                                                                    .selling_price,
                                                                            ),
                                                                        )}
                                                                    </strong>
                                                                </div>

                                                                <div className="idm-price-stat stock">
                                                                    <span>
                                                                        Available Stock
                                                                    </span>

                                                                    <strong>
                                                                        {formatQuantity(
                                                                            priceOption
                                                                                .available_quantity,
                                                                        )}
                                                                        {' '}
                                                                        {selectedProduct.unit}
                                                                    </strong>
                                                                </div>
                                                            </div>

                                                            {priceOption
                                                                .batches
                                                                .length
                                                                === 0 ? (
                                                                <div className="idm-empty">
                                                                    No active batches
                                                                    are available for
                                                                    this price option.
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="idm-batch-wrap">
                                                                        <table className="idm-batch-table">
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
                                                                                {priceOption
                                                                                    .batches
                                                                                    .map(
                                                                                        (
                                                                                            batch,
                                                                                        ) => {
                                                                                            const status =
                                                                                                expiryStatus(
                                                                                                    batch
                                                                                                        .expiry_date,
                                                                                                );

                                                                                            return (
                                                                                                <tr
                                                                                                    key={
                                                                                                        batch.id
                                                                                                    }
                                                                                                >
                                                                                                    <td>
                                                                                                        <span className="idm-batch-reference">
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

                                                                                                    <td className="idm-quantity">
                                                                                                        {formatQuantity(
                                                                                                            batch
                                                                                                                .available_quantity,
                                                                                                        )}
                                                                                                        {' '}
                                                                                                        {selectedProduct.unit}
                                                                                                    </td>

                                                                                                    <td>
                                                                                                        <span
                                                                                                            className={
                                                                                                                `idm-expiry ${status}`
                                                                                                            }
                                                                                                        >
                                                                                                            <Icon name="calendar" />

                                                                                                            {formatDate(
                                                                                                                batch
                                                                                                                    .expiry_date,
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

                                                                    <div className="idm-mobile-batches">
                                                                        {priceOption
                                                                            .batches
                                                                            .map(
                                                                                (
                                                                                    batch,
                                                                                ) => (
                                                                                    <article
                                                                                        key={
                                                                                            batch.id
                                                                                        }
                                                                                        className="idm-mobile-batch"
                                                                                    >
                                                                                        <div className="idm-mobile-batch-row">
                                                                                            <span>
                                                                                                Stock Reference
                                                                                            </span>

                                                                                            <strong>
                                                                                                {batch.batch_number
                                                                                                    || batch.batch_code
                                                                                                    || `Stock #${batch.id}`}
                                                                                            </strong>
                                                                                        </div>

                                                                                        <div className="idm-mobile-batch-row">
                                                                                            <span>
                                                                                                Available
                                                                                            </span>

                                                                                            <strong>
                                                                                                {formatQuantity(
                                                                                                    batch
                                                                                                        .available_quantity,
                                                                                                )}
                                                                                                {' '}
                                                                                                {selectedProduct.unit}
                                                                                            </strong>
                                                                                        </div>

                                                                                        <div className="idm-mobile-batch-row">
                                                                                            <span>
                                                                                                Expiry Date
                                                                                            </span>

                                                                                            <strong>
                                                                                                {formatDate(
                                                                                                    batch
                                                                                                        .expiry_date,
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
                                </section>
                            </div>

                            <footer className="idm-footer">
                                <button
                                    type="button"
                                    className="idm-footer-button"
                                    onClick={() => {
                                        setSelectedProduct(
                                            null,
                                        );
                                    }}
                                >
                                    Close
                                </button>
                            </footer>
                        </section>
                    </div>
                </div>,
                document.body,
            )
            : null;

    return (
        <>
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

                            {pagination.total
                                === 1
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
                                    ref={
                                        searchInputRef
                                    }
                                    type="search"
                                    className="inv-search-input"
                                    value={
                                        search
                                    }
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
                                        onClick={
                                            clearSearch
                                        }
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
                                value={
                                    perPage
                                }
                                onChange={(event) => {
                                    setPage(
                                        1,
                                    );

                                    setPerPage(
                                        Number(
                                            event
                                                .target
                                                .value,
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

                    <div className="inv-table-container">
                        <table className="inv-table">
                            <thead>
                                <tr>
                                    <th className="inv-col-product">
                                        Product
                                    </th>

                                    <th className="inv-col-category">
                                        Category
                                    </th>

                                    <th className="inv-col-stock">
                                        Available Stock
                                    </th>

                                    <th className="inv-col-options">
                                        Price Options
                                    </th>

                                    <th className="inv-col-action">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td
                                            colSpan={
                                                5
                                            }
                                            className="inv-table-state"
                                        >
                                            Loading inventory...
                                        </td>
                                    </tr>
                                ) : products.length
                                    === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={
                                                5
                                            }
                                            className="inv-table-state"
                                        >
                                            {appliedSearch
                                                ? 'No matching products found.'
                                                : 'No received stock found.'}
                                        </td>
                                    </tr>
                                ) : (
                                    products.map(
                                        (
                                            product,
                                        ) => (
                                            <tr
                                                key={
                                                    product.id
                                                }
                                            >
                                                <td data-label="Product">
                                                    <div className="inv-product-cell">
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

                                                            <small className="inv-product-unit">
                                                                {product.unit}
                                                            </small>
                                                        </span>
                                                    </div>
                                                </td>

                                                <td data-label="Category">
                                                    <span className="inv-category-badge">
                                                        {product.category
                                                            ?.name
                                                            ?? 'General'}
                                                    </span>
                                                </td>

                                                <td data-label="Available Stock">
                                                    <strong className="inv-stock-value">
                                                        {formatQuantity(
                                                            product
                                                                .total_available_quantity,
                                                        )}
                                                        {' '}
                                                        {product.unit}
                                                    </strong>
                                                </td>

                                                <td data-label="Price Options">
                                                    <span className="inv-options-badge">
                                                        {product
                                                            .price_options
                                                            .length}
                                                    </span>
                                                </td>

                                                <td data-label="Action">
                                                    <button
                                                        type="button"
                                                        className="inv-view-button"
                                                        onClick={() => {
                                                            setSelectedProduct(
                                                                product,
                                                            );
                                                        }}
                                                    >
                                                        <Icon name="layers" />

                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ),
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!isLoading
                        && pagination.total
                        > 0 && (
                            <footer className="inv-pagination">
                                <button
                                    type="button"
                                    className="inv-pagination-button"
                                    disabled={
                                        pagination
                                            .current_page
                                        <= 1
                                    }
                                    onClick={() => {
                                        setPage(
                                            (
                                                current,
                                            ) =>
                                                Math.max(
                                                    1,
                                                    current
                                                    - 1,
                                                ),
                                        );
                                    }}
                                >
                                    Previous
                                </button>

                                <span>
                                    Page
                                    {' '}

                                    <strong>
                                        {pagination.current_page}
                                    </strong>

                                    {' '}
                                    of
                                    {' '}

                                    <strong>
                                        {pagination.last_page}
                                    </strong>

                                    {' '}
                                    ·
                                    {' '}

                                    {formatQuantity(
                                        visibleStockTotal,
                                    )}
                                    {' '}
                                    visible stock
                                </span>

                                <button
                                    type="button"
                                    className="inv-pagination-button"
                                    disabled={
                                        pagination
                                            .current_page
                                        >= pagination
                                            .last_page
                                    }
                                    onClick={() => {
                                        setPage(
                                            (
                                                current,
                                            ) =>
                                                Math.min(
                                                    pagination
                                                        .last_page,
                                                    current
                                                    + 1,
                                                ),
                                        );
                                    }}
                                >
                                    Next
                                </button>
                            </footer>
                        )}
                </section>
            </div>

            {detailsModal}
        </>
    );
}
