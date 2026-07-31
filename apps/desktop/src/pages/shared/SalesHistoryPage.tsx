import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import CreateSalesReturnModal
    from '../../components/returns/CreateSalesReturnModal';

import SaleDetailsModal
    from '../../components/sales/SaleDetailsModal';

import {
    ApiError,
} from '../../lib/api';

import {
    createSalesReturn,
    getSalesReturnOptions,
} from '../../services/salesReturnService';

import {
    getSaleDetails,
    getSalesHistory,
} from '../../services/salesService';

import type {
    SaleHistoryItem,
    SaleHistorySummary,
    SaleReceipt,
} from '../../types/sale';

import type {
    CreateSalesReturnValues,
    SalesReturnOptions,
} from '../../types/salesReturn';

type ExtendedSaleHistoryItem =
    SaleHistoryItem & {
        customer?: {
            name: string;
            mobile?: string | null;
        } | null;

        payment_status?: string;
        due_amount?: number;
    };

const currencyFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        },
    );

const emptySummary:
    SaleHistorySummary = {
    total_sales: 0,
    total_revenue: 0,
    outstanding_due: 0,
    total_discount: 0,
    total_items: 0,
    gross_profit: null,
    net_profit: null,
};

function formatDateTime(
    value: string,
): string {
    const date = new Date(value);

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

function paymentName(
    method: string | null,
    paymentStatus?: string,
): string {
    if (
        paymentStatus === 'due'
        && method === null
    ) {
        return 'On Due';
    }

    switch (method) {
        case 'bank_transfer':
            return 'Bank Transfer';

        case 'card':
            return 'Card';

        case 'cash':
            return 'Cash';

        default:
            return 'Not Recorded';
    }
}

function paymentStatusName(
    status?: string,
): string {
    switch (status) {
        case 'partial':
            return 'Partially Paid';

        case 'due':
            return 'Payment Due';

        case 'paid':
            return 'Fully Paid';

        default:
            return 'Fully Paid';
    }
}

function paymentStatusClass(
    status?: string,
): string {
    switch (status) {
        case 'partial':
            return 'shp-status-partial';

        case 'due':
            return 'shp-status-due';

        case 'paid':
            return 'shp-status-paid';

        default:
            return 'shp-status-paid';
    }
}

const salesHistoryStyles = `
    #sapo-sales-history-page,
    #sapo-sales-history-page *,
    #sapo-sales-history-page *::before,
    #sapo-sales-history-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-sales-history-page {
        --shp-green-950: #052e16;
        --shp-green-900: #14532d;
        --shp-green-800: #166534;
        --shp-green-700: #15803d;
        --shp-green-100: #dcfce7;
        --shp-green-50: #f0fdf4;
        --shp-blue: #2563eb;
        --shp-blue-light: #eff6ff;
        --shp-amber: #b45309;
        --shp-amber-light: #fffbeb;
        --shp-red: #dc2626;
        --shp-red-light: #fef2f2;
        --shp-text: #0f172a;
        --shp-text-secondary: #334155;
        --shp-muted: #64748b;
        --shp-border: #e2e8f0;
        --shp-border-strong: #cbd5e1;
        --shp-bg: #f8fafc;
        --shp-white: #ffffff;
        --shp-radius: 8px;
        --shp-radius-sm: 6px;
        --shp-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: relative !important;
        display: block !important;
        width: 100% !important;
        height: calc(100vh - 100px) !important;
        height: calc(100dvh - 100px) !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: 100% !important;
        max-height: calc(100vh - 100px) !important;
        max-height: calc(100dvh - 100px) !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        color: var(--shp-text) !important;
        font-family: var(--shp-font) !important;
        font-size: 14px !important;
        line-height: 1.45 !important;
        background: var(--shp-bg) !important;
        border: 0 !important;
        isolation: isolate !important;
    }

    #sapo-sales-history-page
    .shp-scroll-region {
        position: absolute !important;
        inset: 0 !important;
        display: flex !important;
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 16px !important;
        margin: 0 !important;
        padding: 16px 16px 32px 16px !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior-y: contain !important;
        scrollbar-gutter: stable !important;
        touch-action: pan-y !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: thin !important;
        scrollbar-color:
            var(--shp-border-strong)
            transparent !important;
    }

    #sapo-sales-history-page
    .shp-scroll-region > * {
        flex: 0 0 auto !important;
        flex-shrink: 0 !important;
    }

    #sapo-sales-history-page
    .shp-scroll-region::-webkit-scrollbar {
        width: 10px !important;
    }

    #sapo-sales-history-page
    .shp-scroll-region::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-sales-history-page
    .shp-scroll-region::-webkit-scrollbar-thumb {
        background: var(--shp-border-strong) !important;
        border: 2px solid transparent !important;
        border-radius: 999px !important;
        background-clip: content-box !important;
    }

    #sapo-sales-history-page
    .shp-scroll-region::-webkit-scrollbar-thumb:hover {
        background: #94a3b8 !important;
        background-clip: content-box !important;
    }

    #sapo-sales-history-page h1,
    #sapo-sales-history-page h2,
    #sapo-sales-history-page h3,
    #sapo-sales-history-page p,
    #sapo-sales-history-page span,
    #sapo-sales-history-page strong,
    #sapo-sales-history-page small,
    #sapo-sales-history-page label {
        font-family: var(--shp-font) !important;
    }

    #sapo-sales-history-page h1,
    #sapo-sales-history-page h2,
    #sapo-sales-history-page h3,
    #sapo-sales-history-page p {
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-sales-history-page button,
    #sapo-sales-history-page input,
    #sapo-sales-history-page select {
        font-family: var(--shp-font) !important;
        text-transform: none !important;
        letter-spacing: normal !important;
    }

    /* ---------- Header ---------- */

    #sapo-sales-history-page
    .shp-header {
        display: flex !important;
        width: 100% !important;
        min-height: 0 !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 16px !important;
        margin: 0 !important;
        padding: 18px 20px !important;
        background: var(--shp-white) !important;
        border: 1px solid var(--shp-border) !important;
        border-radius: var(--shp-radius) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    }

    #sapo-sales-history-page
    .shp-header-copy {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 4px !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-sales-history-page
    .shp-kicker {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--shp-green-700) !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        letter-spacing: 0.06em !important;
        text-transform: uppercase !important;
    }

    #sapo-sales-history-page
    .shp-title {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--shp-text) !important;
        font-size: 20px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        letter-spacing: -0.01em !important;
    }

    #sapo-sales-history-page
    .shp-total-badge {
        display: inline-flex !important;
        min-height: 34px !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 0 !important;
        padding: 6px 12px !important;
        color: var(--shp-green-800) !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
        white-space: nowrap !important;
        background: var(--shp-green-50) !important;
        border: 1px solid var(--shp-green-100) !important;
        border-radius: var(--shp-radius-sm) !important;
    }

    /* ---------- Summary cards ---------- */

    #sapo-sales-history-page
    .shp-summary-strip {
        display: flex !important;
        width: 100% !important;
        min-width: 0 !important;
        align-items: stretch !important;
        gap: 10px !important;
        margin: 0 !important;
        padding: 0 0 4px !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        scrollbar-width: thin !important;
        scrollbar-color:
            var(--shp-border-strong)
            transparent !important;
    }

    #sapo-sales-history-page
    .shp-summary-card {
        position: relative !important;
        display: flex !important;
        width: 168px !important;
        min-width: 168px !important;
        min-height: 76px !important;
        flex-direction: column !important;
        justify-content: center !important;
        gap: 3px !important;
        margin: 0 !important;
        padding: 12px 14px !important;
        overflow: hidden !important;
        background: var(--shp-white) !important;
        border: 1px solid var(--shp-border) !important;
        border-radius: var(--shp-radius) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    }

    #sapo-sales-history-page
    .shp-summary-label {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--shp-muted) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
    }

    #sapo-sales-history-page
    .shp-summary-value {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        color: var(--shp-text) !important;
        font-size: 18px !important;
        font-weight: 700 !important;
        line-height: 1.25 !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-sales-history-page
    .shp-summary-blue
    .shp-summary-value {
        color: var(--shp-blue) !important;
    }

    #sapo-sales-history-page
    .shp-summary-red
    .shp-summary-value {
        color: var(--shp-red) !important;
    }

    #sapo-sales-history-page
    .shp-summary-amber
    .shp-summary-value {
        color: var(--shp-amber) !important;
    }

    #sapo-sales-history-page
    .shp-summary-help {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--shp-muted) !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        line-height: 1.3 !important;
    }

    /* ---------- Messages ---------- */

    #sapo-sales-history-page
    .shp-message {
        display: flex !important;
        width: 100% !important;
        min-height: 0 !important;
        align-items: center !important;
        gap: 10px !important;
        margin: 0 !important;
        padding: 10px 14px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.4 !important;
        border-radius: var(--shp-radius-sm) !important;
    }

    #sapo-sales-history-page
    .shp-success {
        color: var(--shp-green-800) !important;
        background: var(--shp-green-50) !important;
        border: 1px solid var(--shp-green-100) !important;
    }

    #sapo-sales-history-page
    .shp-error {
        color: var(--shp-red) !important;
        background: var(--shp-red-light) !important;
        border: 1px solid #fecaca !important;
    }

    #sapo-sales-history-page
    .shp-message-icon {
        display: grid !important;
        width: 20px !important;
        height: 20px !important;
        min-width: 20px !important;
        place-items: center !important;
        margin: 0 !important;
        padding: 0 !important;
        color: #ffffff !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        background: var(--shp-green-700) !important;
        border-radius: 50% !important;
    }

    #sapo-sales-history-page
    .shp-error
    .shp-message-icon {
        background: var(--shp-red) !important;
    }

    #sapo-sales-history-page
    .shp-message-text {
        display: block !important;
        min-width: 0 !important;
        flex: 1 !important;
        margin: 0 !important;
        padding: 0 !important;
        color: inherit !important;
        font-size: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
    }

    #sapo-sales-history-page
    .shp-message-close {
        display: grid !important;
        width: 24px !important;
        height: 24px !important;
        min-width: 24px !important;
        place-items: center !important;
        margin: 0 !important;
        padding: 0 !important;
        color: inherit !important;
        font-size: 16px !important;
        font-weight: 400 !important;
        line-height: 1 !important;
        appearance: none !important;
        background: rgba(255, 255, 255, 0.6) !important;
        border: 1px solid currentColor !important;
        border-radius: var(--shp-radius-sm) !important;
        cursor: pointer !important;
    }

    /* ---------- Buttons ---------- */

    #sapo-sales-history-page
    .shp-button {
        display: inline-flex !important;
        min-height: 36px !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        margin: 0 !important;
        padding: 8px 14px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;
        text-align: center !important;
        text-decoration: none !important;
        appearance: none !important;
        border-radius: var(--shp-radius-sm) !important;
        box-shadow: none !important;
        cursor: pointer !important;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease !important;
    }

    #sapo-sales-history-page
    .shp-primary-button {
        color: #ffffff !important;
        background: var(--shp-green-700) !important;
        border: 1px solid var(--shp-green-700) !important;
    }

    #sapo-sales-history-page
    .shp-primary-button:hover:not(:disabled) {
        background: var(--shp-green-800) !important;
        border-color: var(--shp-green-800) !important;
    }

    #sapo-sales-history-page
    .shp-secondary-button {
        color: var(--shp-text-secondary) !important;
        background: var(--shp-white) !important;
        border: 1px solid var(--shp-border-strong) !important;
    }

    #sapo-sales-history-page
    .shp-secondary-button:hover:not(:disabled) {
        color: var(--shp-text) !important;
        background: var(--shp-bg) !important;
        border-color: #94a3b8 !important;
    }

    #sapo-sales-history-page
    .shp-return-button {
        color: var(--shp-amber) !important;
        background: var(--shp-amber-light) !important;
        border: 1px solid #fde68a !important;
    }

    #sapo-sales-history-page
    .shp-return-button:hover:not(:disabled) {
        color: #ffffff !important;
        background: var(--shp-amber) !important;
        border-color: var(--shp-amber) !important;
    }

    #sapo-sales-history-page button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Panel / Toolbar ---------- */

    #sapo-sales-history-page
    .shp-panel {
        display: flex !important;
        width: 100% !important;
        min-width: 0 !important;
        flex-direction: column !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: var(--shp-white) !important;
        border: 1px solid var(--shp-border) !important;
        border-radius: var(--shp-radius) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    }

    #sapo-sales-history-page
    .shp-toolbar {
        display: flex !important;
        width: 100% !important;
        flex-direction: column !important;
        gap: 12px !important;
        margin: 0 !important;
        padding: 14px 16px !important;
        background: var(--shp-white) !important;
        border: 0 !important;
        border-bottom: 1px solid var(--shp-border) !important;
    }

    #sapo-sales-history-page
    .shp-search-wrapper {
        position: relative !important;
        display: flex !important;
        width: 100% !important;
        min-width: 0 !important;
        align-items: center !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-sales-history-page
    .shp-search-icon {
        position: absolute !important;
        left: 12px !important;
        z-index: 2 !important;
        display: grid !important;
        width: 18px !important;
        height: 18px !important;
        place-items: center !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--shp-muted) !important;
        font-size: 16px !important;
        font-weight: 600 !important;
        line-height: 1 !important;
        pointer-events: none !important;
    }

    #sapo-sales-history-page
    .shp-input,
    #sapo-sales-history-page
    .shp-select {
        display: block !important;
        width: 100% !important;
        height: 38px !important;
        min-height: 38px !important;
        margin: 0 !important;
        color: var(--shp-text) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: normal !important;
        outline: none !important;
        background: var(--shp-white) !important;
        border: 1px solid var(--shp-border-strong) !important;
        border-radius: var(--shp-radius-sm) !important;
        box-shadow: none !important;
    }

    #sapo-sales-history-page
    .shp-input {
        padding: 0 12px !important;
    }

    #sapo-sales-history-page
    .shp-search-input {
        padding: 0 40px 0 38px !important;
        appearance: none !important;
        background: var(--shp-white) !important;
    }

    #sapo-sales-history-page
    .shp-input::placeholder {
        color: #94a3b8 !important;
        font-size: 13px !important;
        opacity: 1 !important;
    }

    #sapo-sales-history-page
    .shp-select {
        padding: 0 10px !important;
        appearance: auto !important;
        cursor: pointer !important;
    }

    #sapo-sales-history-page
    .shp-input:focus,
    #sapo-sales-history-page
    .shp-select:focus {
        border-color: var(--shp-green-700) !important;
        box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.12) !important;
    }

    #sapo-sales-history-page
    .shp-clear-search {
        position: absolute !important;
        right: 6px !important;
        z-index: 3 !important;
        display: grid !important;
        width: 26px !important;
        height: 26px !important;
        min-width: 26px !important;
        place-items: center !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--shp-muted) !important;
        font-size: 17px !important;
        font-weight: 400 !important;
        line-height: 1 !important;
        appearance: none !important;
        background: var(--shp-bg) !important;
        border: 0 !important;
        border-radius: var(--shp-radius-sm) !important;
        cursor: pointer !important;
    }

    #sapo-sales-history-page
    .shp-filter-grid {
        display: grid !important;
        grid-template-columns:
            repeat(4, minmax(140px, 1fr)) auto !important;
        align-items: end !important;
        gap: 10px !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-sales-history-page
    .shp-filter-field {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 5px !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-sales-history-page
    .shp-filter-label {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--shp-text-secondary) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
    }

    #sapo-sales-history-page
    .shp-clear-filter {
        min-width: 120px !important;
        height: 38px !important;
    }

    /* ---------- Table ---------- */

    #sapo-sales-history-page
    .shp-table-wrapper {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: auto !important;
        overflow-y: visible !important;
        background: var(--shp-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color:
            var(--shp-border-strong)
            transparent !important;
    }

    #sapo-sales-history-page
    .shp-table-wrapper::-webkit-scrollbar {
        height: 10px !important;
    }

    #sapo-sales-history-page
    .shp-table-wrapper::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-sales-history-page
    .shp-table-wrapper::-webkit-scrollbar-thumb {
        background: var(--shp-border-strong) !important;
        border-radius: 999px !important;
    }

    #sapo-sales-history-page
    .shp-table {
        width: 100% !important;
        min-width: 1780px !important;
        margin: 0 !important;
        padding: 0 !important;
        table-layout: fixed !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
        background: var(--shp-white) !important;
    }

    #sapo-sales-history-page
    .shp-table th,
    #sapo-sales-history-page
    .shp-table td {
        margin: 0 !important;
        padding: 10px 12px !important;
        vertical-align: middle !important;
        text-align: left !important;
        white-space: nowrap !important;
        border: 0 !important;
        border-bottom: 1px solid var(--shp-border) !important;
    }

    #sapo-sales-history-page
    .shp-table th {
        position: sticky !important;
        top: 0 !important;
        z-index: 4 !important;
        height: 40px !important;
        color: var(--shp-text-secondary) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
        letter-spacing: 0.02em !important;
        text-transform: uppercase !important;
        background: #f1f5f9 !important;
        border-bottom: 1px solid var(--shp-border-strong) !important;
    }

    #sapo-sales-history-page
    .shp-table td {
        height: 54px !important;
        color: var(--shp-text) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: 1.3 !important;
        background: var(--shp-white) !important;
    }

    #sapo-sales-history-page
    .shp-table tbody tr:hover td {
        background: #f8fafc !important;
    }

    #sapo-sales-history-page
    .shp-col-sale {
        width: 210px !important;
    }

    #sapo-sales-history-page
    .shp-col-date {
        width: 165px !important;
    }

    #sapo-sales-history-page
    .shp-col-cashier {
        width: 140px !important;
    }

    #sapo-sales-history-page
    .shp-col-small {
        width: 90px !important;
    }

    #sapo-sales-history-page
    .shp-col-payment {
        width: 140px !important;
    }

    #sapo-sales-history-page
    .shp-col-status {
        width: 150px !important;
    }

    #sapo-sales-history-page
    .shp-col-money {
        width: 140px !important;
    }

    #sapo-sales-history-page
    .shp-col-actions {
        width: 240px !important;
    }

    #sapo-sales-history-page
    .shp-sale-cell {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 2px !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-sales-history-page
    .shp-sale-number {
        display: block !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        color: var(--shp-text) !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-sales-history-page
    .shp-customer-name {
        display: block !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        color: var(--shp-muted) !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        line-height: 1.3 !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-sales-history-page
    .shp-payment-badge,
    #sapo-sales-history-page
    .shp-status-badge {
        display: inline-flex !important;
        min-height: 24px !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 0 !important;
        padding: 3px 9px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;
        white-space: nowrap !important;
        border-radius: 999px !important;
    }

    #sapo-sales-history-page
    .shp-payment-badge {
        color: var(--shp-blue) !important;
        background: var(--shp-blue-light) !important;
    }

    #sapo-sales-history-page
    .shp-status-paid {
        color: var(--shp-green-800) !important;
        background: var(--shp-green-100) !important;
    }

    #sapo-sales-history-page
    .shp-status-partial {
        color: var(--shp-amber) !important;
        background: var(--shp-amber-light) !important;
    }

    #sapo-sales-history-page
    .shp-status-due {
        color: var(--shp-red) !important;
        background: #fee2e2 !important;
    }

    #sapo-sales-history-page
    .shp-money-green {
        color: var(--shp-green-800) !important;
        font-size: 13px !important;
        font-weight: 600 !important;
    }

    #sapo-sales-history-page
    .shp-money-red {
        color: var(--shp-red) !important;
        font-size: 13px !important;
        font-weight: 600 !important;
    }

    #sapo-sales-history-page
    .shp-money-blue {
        color: var(--shp-blue) !important;
        font-size: 13px !important;
        font-weight: 600 !important;
    }

    #sapo-sales-history-page
    .shp-table-actions {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-sales-history-page
    .shp-action-button {
        min-width: 100px !important;
        min-height: 32px !important;
        padding: 5px 10px !important;
        font-size: 12px !important;
    }

    #sapo-sales-history-page
    .shp-table-state {
        height: 200px !important;
        padding: 20px !important;
        text-align: center !important;
        white-space: normal !important;
        background: var(--shp-white) !important;
    }

    #sapo-sales-history-page
    .shp-state-content {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-direction: column !important;
        gap: 8px !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-sales-history-page
    .shp-spinner {
        display: block !important;
        width: 32px !important;
        height: 32px !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        border: 3px solid var(--shp-green-100) !important;
        border-top-color: var(--shp-green-700) !important;
        border-radius: 50% !important;
        animation: shp-spin 700ms linear infinite !important;
    }

    @keyframes shp-spin {
        to {
            transform: rotate(360deg);
        }
    }

    #sapo-sales-history-page
    .shp-state-title {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--shp-text) !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
    }

    #sapo-sales-history-page
    .shp-state-message {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--shp-muted) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: 1.4 !important;
    }

    /* ---------- Pagination ---------- */

    #sapo-sales-history-page
    .shp-pagination {
        display: flex !important;
        min-height: 56px !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 14px !important;
        margin: 0 !important;
        padding: 12px 16px !important;
        background: var(--shp-white) !important;
        border: 0 !important;
        border-top: 1px solid var(--shp-border) !important;
    }

    #sapo-sales-history-page
    .shp-pagination-info {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--shp-muted) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: 1.4 !important;
    }

    #sapo-sales-history-page
    .shp-pagination-info strong {
        color: var(--shp-text) !important;
        font-weight: 600 !important;
    }

    #sapo-sales-history-page
    .shp-pagination-actions {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-sales-history-page
    .shp-page-button {
        min-width: 84px !important;
        min-height: 34px !important;
        padding: 6px 10px !important;
        font-size: 13px !important;
    }

    #sapo-sales-history-page
    .shp-page-number {
        display: inline-flex !important;
        min-height: 34px !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 0 !important;
        padding: 6px 12px !important;
        color: var(--shp-text-secondary) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: 1.2 !important;
        white-space: nowrap !important;
        background: var(--shp-bg) !important;
        border: 1px solid var(--shp-border) !important;
        border-radius: var(--shp-radius-sm) !important;
    }

    #sapo-sales-history-page
    .shp-page-number strong {
        color: var(--shp-green-800) !important;
        font-weight: 700 !important;
    }

    /* ---------- Responsive ---------- */

    @media (max-width: 1120px) {
        #sapo-sales-history-page
        .shp-filter-grid {
            grid-template-columns:
                repeat(2, minmax(160px, 1fr)) !important;
        }

        #sapo-sales-history-page
        .shp-clear-filter {
            width: 100% !important;
        }
    }

    @media (max-width: 760px) {
        #sapo-sales-history-page {
            height: calc(100vh - 72px) !important;
            height: calc(100dvh - 72px) !important;
            max-height: calc(100vh - 72px) !important;
            max-height: calc(100dvh - 72px) !important;
        }

        #sapo-sales-history-page
        .shp-scroll-region {
            gap: 12px !important;
            padding: 12px 10px 28px 10px !important;
        }

        #sapo-sales-history-page
        .shp-header {
            min-height: 0 !important;
            align-items: stretch !important;
            flex-direction: column !important;
            padding: 14px !important;
            gap: 10px !important;
        }

        #sapo-sales-history-page
        .shp-title {
            font-size: 18px !important;
        }

        #sapo-sales-history-page
        .shp-total-badge {
            width: 100% !important;
        }

        #sapo-sales-history-page
        .shp-toolbar {
            padding: 12px !important;
        }

        #sapo-sales-history-page
        .shp-filter-grid {
            grid-template-columns: 1fr !important;
        }

        #sapo-sales-history-page
        .shp-pagination {
            align-items: stretch !important;
            flex-direction: column !important;
        }

        #sapo-sales-history-page
        .shp-pagination-actions {
            display: grid !important;
            grid-template-columns:
                repeat(2, minmax(0, 1fr)) !important;
        }

        #sapo-sales-history-page
        .shp-page-number {
            grid-column: 1 / -1 !important;
            grid-row: 1 !important;
        }

        #sapo-sales-history-page
        .shp-page-button {
            width: 100% !important;
            min-width: 0 !important;
        }
    }
`;

export default function SalesHistoryPage() {
    const {
        token,
        user,
    } = useAuth();

    const [
        sales,
        setSales,
    ] = useState<SaleHistoryItem[]>(
        [],
    );

    const [
        summary,
        setSummary,
    ] = useState<SaleHistorySummary>(
        emptySummary,
    );

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        perPage,
        setPerPage,
    ] = useState(20);

    const [
        currentPage,
        setCurrentPage,
    ] = useState(1);

    const [
        lastPage,
        setLastPage,
    ] = useState(1);

    const [
        totalResults,
        setTotalResults,
    ] = useState(0);

    const [
        resultFrom,
        setResultFrom,
    ] = useState<number | null>(
        null,
    );

    const [
        resultTo,
        setResultTo,
    ] = useState<number | null>(
        null,
    );

    const [
        searchInput,
        setSearchInput,
    ] = useState('');

    const [
        appliedSearch,
        setAppliedSearch,
    ] = useState('');

    const [
        paymentMethod,
        setPaymentMethod,
    ] = useState('');

    const [
        dateFrom,
        setDateFrom,
    ] = useState('');

    const [
        dateTo,
        setDateTo,
    ] = useState('');

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        selectedSaleId,
        setSelectedSaleId,
    ] = useState<number | null>(
        null,
    );

    const [
        selectedSale,
        setSelectedSale,
    ] = useState<SaleReceipt | null>(
        null,
    );

    const [
        isLoadingSale,
        setIsLoadingSale,
    ] = useState(false);

    const [
        saleDetailsError,
        setSaleDetailsError,
    ] = useState('');

    const [
        returnSaleId,
        setReturnSaleId,
    ] = useState<number | null>(
        null,
    );

    const [
        returnOptions,
        setReturnOptions,
    ] = useState<SalesReturnOptions | null>(
        null,
    );

    const [
        isLoadingReturn,
        setIsLoadingReturn,
    ] = useState(false);

    const [
        isSubmittingReturn,
        setIsSubmittingReturn,
    ] = useState(false);

    const [
        returnError,
        setReturnError,
    ] = useState('');

    const [
        returnSuccess,
        setReturnSuccess,
    ] = useState('');

    const isAdmin =
        user?.role === 'admin';

    const loadSales =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getSalesHistory(
                            token,
                            {
                                page,
                                perPage,
                                search:
                                    appliedSearch,
                                paymentMethod,
                                dateFrom,
                                dateTo,
                            },
                        );

                    setSales(
                        response.data,
                    );

                    setSummary(
                        response.summary,
                    );

                    setCurrentPage(
                        response.meta
                            .current_page,
                    );

                    setLastPage(
                        response.meta
                            .last_page,
                    );

                    setTotalResults(
                        response.meta.total,
                    );

                    setResultFrom(
                        response.meta.from,
                    );

                    setResultTo(
                        response.meta.to,
                    );
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load sales history.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [
                token,
                page,
                perPage,
                appliedSearch,
                paymentMethod,
                dateFrom,
                dateTo,
            ],
        );

    useEffect(() => {
        void loadSales();
    }, [loadSales]);

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    setPage(1);

                    setAppliedSearch(
                        searchInput.trim(),
                    );
                },
                350,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [searchInput]);

    useEffect(() => {
        if (!returnSuccess) {
            return;
        }

        const timeout =
            window.setTimeout(
                () => {
                    setReturnSuccess('');
                },
                3500,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [returnSuccess]);

    const loadSelectedSale =
        useCallback(
            async (
                saleId: number,
            ): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoadingSale(true);
                setSaleDetailsError('');
                setSelectedSale(null);

                try {
                    const response =
                        await getSaleDetails(
                            token,
                            saleId,
                        );

                    setSelectedSale(
                        response.data,
                    );
                } catch (error) {
                    setSaleDetailsError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load sale details.',
                    );
                } finally {
                    setIsLoadingSale(false);
                }
            },
            [token],
        );

    const openSaleDetails = (
        saleId: number,
    ): void => {
        setSelectedSaleId(
            saleId,
        );

        void loadSelectedSale(
            saleId,
        );
    };

    const closeSaleDetails =
        (): void => {
            setSelectedSaleId(null);
            setSelectedSale(null);
            setSaleDetailsError('');
        };

    const openReturnModal =
        async (
            saleId: number,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setReturnSaleId(
                saleId,
            );

            setReturnOptions(null);
            setReturnError('');
            setReturnSuccess('');
            setIsLoadingReturn(true);

            try {
                const response =
                    await getSalesReturnOptions(
                        token,
                        saleId,
                    );

                setReturnOptions(
                    response.data,
                );
            } catch (error) {
                setReturnError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to load returnable items.',
                );
            } finally {
                setIsLoadingReturn(false);
            }
        };

    const closeReturnModal =
        (): void => {
            if (isSubmittingReturn) {
                return;
            }

            setReturnSaleId(null);
            setReturnOptions(null);
            setReturnError('');
            setIsLoadingReturn(false);
        };

    const submitReturn =
        async (
            values:
                CreateSalesReturnValues,
        ): Promise<void> => {
            if (
                !token
                || returnSaleId === null
                || isSubmittingReturn
            ) {
                return;
            }

            setIsSubmittingReturn(true);
            setReturnError('');

            try {
                const response =
                    await createSalesReturn(
                        token,
                        returnSaleId,
                        values,
                    );

                setReturnSuccess(
                    response.message
                    ?? 'Sales return completed successfully.',
                );

                setReturnSaleId(null);
                setReturnOptions(null);
                setReturnError('');

                await loadSales();
            } catch (error) {
                setReturnError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to complete the sales return.',
                );
            } finally {
                setIsSubmittingReturn(false);
            }
        };

    const clearSearch = (): void => {
        setSearchInput('');
        setAppliedSearch('');
        setPage(1);
    };

    const clearFilters = (): void => {
        setSearchInput('');
        setAppliedSearch('');
        setPaymentMethod('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const hasFilters =
        appliedSearch !== ''
        || paymentMethod !== ''
        || dateFrom !== ''
        || dateTo !== '';

    return (
        <div id="sapo-sales-history-page">
            <style>
                {salesHistoryStyles}
            </style>

            <div className="shp-scroll-region">
                <header className="shp-header">
                    <div className="shp-header-copy">
                        <span className="shp-kicker">
                            Completed Transactions
                        </span>

                        <h1 className="shp-title">
                            {isAdmin
                                ? 'Sales History'
                                : 'My Sales History'}
                        </h1>
                    </div>

                    <span className="shp-total-badge">
                        {totalResults}
                        {' '}
                        {totalResults === 1
                            ? 'Sale'
                            : 'Sales'}
                    </span>
                </header>

                <section className="shp-summary-strip">
                    <article className="shp-summary-card">
                        <span className="shp-summary-label">
                            Total Sales
                        </span>

                        <strong className="shp-summary-value">
                            {summary.total_sales}
                        </strong>

                        <small className="shp-summary-help">
                            Transactions
                        </small>
                    </article>

                    <article className="shp-summary-card shp-summary-blue">
                        <span className="shp-summary-label">
                            Total Revenue
                        </span>

                        <strong className="shp-summary-value">
                            {currencyFormatter.format(
                                summary.total_revenue,
                            )}
                        </strong>

                        <small className="shp-summary-help">
                            Sale value
                        </small>
                    </article>

                    <article className="shp-summary-card shp-summary-red">
                        <span className="shp-summary-label">
                            Outstanding Due
                        </span>

                        <strong className="shp-summary-value">
                            {currencyFormatter.format(
                                summary.outstanding_due,
                            )}
                        </strong>

                        <small className="shp-summary-help">
                            Customer balances
                        </small>
                    </article>

                    <article className="shp-summary-card">
                        <span className="shp-summary-label">
                            Items Sold
                        </span>

                        <strong className="shp-summary-value">
                            {summary.total_items}
                        </strong>

                        <small className="shp-summary-help">
                            Total quantity
                        </small>
                    </article>

                    <article className="shp-summary-card shp-summary-amber">
                        <span className="shp-summary-label">
                            Discounts
                        </span>

                        <strong className="shp-summary-value">
                            {currencyFormatter.format(
                                summary.total_discount,
                            )}
                        </strong>

                        <small className="shp-summary-help">
                            Applied discounts
                        </small>
                    </article>

                    {isAdmin && (
                        <>
                            <article className="shp-summary-card shp-summary-blue">
                                <span className="shp-summary-label">
                                    Gross Profit
                                </span>

                                <strong className="shp-summary-value">
                                    {currencyFormatter.format(
                                        summary.gross_profit
                                        ?? 0,
                                    )}
                                </strong>

                                <small className="shp-summary-help">
                                    Before discounts
                                </small>
                            </article>

                            <article className="shp-summary-card">
                                <span className="shp-summary-label">
                                    Net Profit
                                </span>

                                <strong className="shp-summary-value">
                                    {currencyFormatter.format(
                                        summary.net_profit
                                        ?? 0,
                                    )}
                                </strong>

                                <small className="shp-summary-help">
                                    After discounts
                                </small>
                            </article>
                        </>
                    )}
                </section>

                {returnSuccess && (
                    <div
                        className="shp-message shp-success"
                        role="status"
                    >
                        <span className="shp-message-icon">
                            ✓
                        </span>

                        <span className="shp-message-text">
                            {returnSuccess}
                        </span>

                        <button
                            type="button"
                            className="shp-message-close"
                            aria-label="Close success message"
                            onClick={() => {
                                setReturnSuccess('');
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}

                {pageError && (
                    <div
                        className="shp-message shp-error"
                        role="alert"
                    >
                        <span className="shp-message-icon">
                            !
                        </span>

                        <span className="shp-message-text">
                            {pageError}
                        </span>

                        <button
                            type="button"
                            className="shp-button shp-secondary-button"
                            onClick={() => {
                                void loadSales();
                            }}
                        >
                            Retry
                        </button>
                    </div>
                )}

                <section className="shp-panel">
                    <div className="shp-toolbar">
                        <div className="shp-search-wrapper">
                            <span
                                className="shp-search-icon"
                                aria-hidden="true"
                            >
                                ⌕
                            </span>

                            <input
                                type="search"
                                className="shp-input shp-search-input"
                                value={searchInput}
                                placeholder="Search sale, customer, cashier, product, SKU or barcode"
                                aria-label="Search sales history"
                                onChange={(event) => {
                                    setSearchInput(
                                        event.target.value,
                                    );
                                }}
                            />

                            {searchInput && (
                                <button
                                    type="button"
                                    className="shp-clear-search"
                                    aria-label="Clear search"
                                    onClick={clearSearch}
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <div className="shp-filter-grid">
                            <label className="shp-filter-field">
                                <span className="shp-filter-label">
                                    From Date
                                </span>

                                <input
                                    type="date"
                                    className="shp-input"
                                    value={dateFrom}
                                    max={
                                        dateTo
                                        || undefined
                                    }
                                    onChange={(event) => {
                                        setDateFrom(
                                            event.target.value,
                                        );

                                        setPage(1);
                                    }}
                                />
                            </label>

                            <label className="shp-filter-field">
                                <span className="shp-filter-label">
                                    To Date
                                </span>

                                <input
                                    type="date"
                                    className="shp-input"
                                    value={dateTo}
                                    min={
                                        dateFrom
                                        || undefined
                                    }
                                    onChange={(event) => {
                                        setDateTo(
                                            event.target.value,
                                        );

                                        setPage(1);
                                    }}
                                />
                            </label>

                            <label className="shp-filter-field">
                                <span className="shp-filter-label">
                                    Payment
                                </span>

                                <select
                                    className="shp-select"
                                    value={paymentMethod}
                                    onChange={(event) => {
                                        setPaymentMethod(
                                            event.target.value,
                                        );

                                        setPage(1);
                                    }}
                                >
                                    <option value="">
                                        All Methods
                                    </option>

                                    <option value="cash">
                                        Cash
                                    </option>

                                    <option value="card">
                                        Card
                                    </option>

                                    <option value="bank_transfer">
                                        Bank Transfer
                                    </option>
                                </select>
                            </label>

                            <label className="shp-filter-field">
                                <span className="shp-filter-label">
                                    Rows
                                </span>

                                <select
                                    className="shp-select"
                                    value={perPage}
                                    onChange={(event) => {
                                        setPerPage(
                                            Number(
                                                event.target.value,
                                            ),
                                        );

                                        setPage(1);
                                    }}
                                >
                                    <option value={10}>
                                        10 Rows
                                    </option>

                                    <option value={20}>
                                        20 Rows
                                    </option>

                                    <option value={50}>
                                        50 Rows
                                    </option>

                                    <option value={100}>
                                        100 Rows
                                    </option>
                                </select>
                            </label>

                            {hasFilters && (
                                <button
                                    type="button"
                                    className="shp-button shp-secondary-button shp-clear-filter"
                                    onClick={clearFilters}
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="shp-table-wrapper">
                        <table className="shp-table">
                            <thead>
                                <tr>
                                    <th className="shp-col-sale">
                                        Sale / Customer
                                    </th>

                                    <th className="shp-col-date">
                                        Date and Time
                                    </th>

                                    <th className="shp-col-cashier">
                                        Cashier
                                    </th>

                                    <th className="shp-col-small">
                                    </th>

                                    {/* <th className="shp-col-small">
                                        Items
                                    </th> */}

                                    {/* <th className="shp-col-small">
                                        Quantity
                                    </th> */}

                                    {/* <th className="shp-col-payment">
                                        Payment
                                    </th> */}

                                    <th className="shp-col-status">
                                        Status
                                    </th>

                                    {/* <th className="shp-col-money">
                                        Discount
                                    </th> */}

                                    <th className="shp-col-money">
                                        Total
                                    </th>

                                    <th className="shp-col-money">
                                        Due
                                    </th>

                                    {/* {isAdmin && (
                                        <th className="shp-col-money">
                                            Net Profit
                                        </th>
                                    )} */}

                                    <th className="shp-col-actions">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td
                                            colSpan={
                                                isAdmin
                                                    ? 12
                                                    : 11
                                            }
                                            className="shp-table-state"
                                        >
                                            <div className="shp-state-content">
                                                <div className="shp-spinner" />

                                                <strong className="shp-state-title">
                                                    Loading Sales History
                                                </strong>

                                                <span className="shp-state-message">
                                                    Please wait while sales are loaded.
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : sales.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={
                                                isAdmin
                                                    ? 12
                                                    : 11
                                            }
                                            className="shp-table-state"
                                        >
                                            <div className="shp-state-content">
                                                <strong className="shp-state-title">
                                                    {hasFilters
                                                        ? 'No Matching Sales Found'
                                                        : 'No Sales Completed'}
                                                </strong>

                                                <span className="shp-state-message">
                                                    {hasFilters
                                                        ? 'Change or clear the current filters.'
                                                        : 'Completed POS sales will appear here.'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    sales.map(
                                        (sale) => {
                                            const saleRow =
                                                sale as ExtendedSaleHistoryItem;

                                            const paymentStatus =
                                                saleRow.payment_status
                                                ?? 'paid';

                                            const dueAmount =
                                                saleRow.due_amount
                                                ?? 0;

                                            const customerText =
                                                saleRow.customer
                                                    ? `${saleRow.customer.name}${saleRow.customer.mobile
                                                        ? ` · ${saleRow.customer.mobile}`
                                                        : ''}`
                                                    : 'Walk-in Customer';

                                            return (
                                                <tr key={sale.id}>
                                                    <td>
                                                        <div className="shp-sale-cell">
                                                            <strong
                                                                className="shp-sale-number"
                                                                title={
                                                                    sale.sale_number
                                                                }
                                                            >
                                                                {sale.sale_number}
                                                            </strong>

                                                            <span
                                                                className="shp-customer-name"
                                                                title={
                                                                    customerText
                                                                }
                                                            >
                                                                {customerText}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        {formatDateTime(
                                                            sale.sale_date,
                                                        )}
                                                    </td>

                                                    <td>
                                                        {
                                                            sale
                                                                .created_by
                                                                .name
                                                        }
                                                    </td>

                                                    <td>

                                                    </td>

                                                    {/* <td>
                                                        {sale.items_count}
                                                    </td> */}

                                                    {/* <td>
                                                        {sale.total_quantity}
                                                    </td> */}

                                                    {/* <td>
                                                        <span className="shp-payment-badge">
                                                            {paymentName(
                                                                sale.payment_method,
                                                                paymentStatus,
                                                            )}
                                                        </span>
                                                    </td> */}

                                                    <td>
                                                        <span
                                                            className={
                                                                `shp-status-badge ${paymentStatusClass(
                                                                    paymentStatus,
                                                                )}`
                                                            }
                                                        >
                                                            {paymentStatusName(
                                                                paymentStatus,
                                                            )}
                                                        </span>
                                                    </td>

                                                    {/* <td>
                                                        <strong className="shp-money-blue">
                                                            {currencyFormatter.format(
                                                                sale.item_discount_total
                                                                + sale.discount,
                                                            )}
                                                        </strong>
                                                    </td> */}

                                                    <td>
                                                        <strong className="shp-money-green">
                                                            {currencyFormatter.format(
                                                                sale.grand_total,
                                                            )}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <strong
                                                            className={
                                                                dueAmount > 0
                                                                    ? 'shp-money-red'
                                                                    : 'shp-money-green'
                                                            }
                                                        >
                                                            {currencyFormatter.format(
                                                                dueAmount,
                                                            )}
                                                        </strong>
                                                    </td>

                                                    {/* {isAdmin && (
                                                        <td>
                                                            <strong
                                                                className={
                                                                    (
                                                                        sale.net_profit
                                                                        ?? 0
                                                                    ) >= 0
                                                                        ? 'shp-money-green'
                                                                        : 'shp-money-red'
                                                                }
                                                            >
                                                                {currencyFormatter.format(
                                                                    sale.net_profit
                                                                    ?? 0,
                                                                )}
                                                            </strong>
                                                        </td>
                                                    )} */}

                                                    <td>
                                                        <div className="shp-table-actions">
                                                            <button
                                                                type="button"
                                                                className="shp-button shp-primary-button shp-action-button"
                                                                onClick={() => {
                                                                    openSaleDetails(
                                                                        sale.id,
                                                                    );
                                                                }}
                                                            >
                                                                View Details
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="shp-button shp-return-button shp-action-button"
                                                                onClick={() => {
                                                                    void openReturnModal(
                                                                        sale.id,
                                                                    );
                                                                }}
                                                            >
                                                                Return Items
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        },
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!isLoading
                        && totalResults > 0 && (
                            <footer className="shp-pagination">
                                <p className="shp-pagination-info">
                                    Showing
                                    {' '}
                                    <strong>
                                        {resultFrom}
                                    </strong>
                                    {' '}to{' '}
                                    <strong>
                                        {resultTo}
                                    </strong>
                                    {' '}of{' '}
                                    <strong>
                                        {totalResults}
                                    </strong>
                                    {' '}sales
                                </p>

                                <div className="shp-pagination-actions">
                                    <button
                                        type="button"
                                        className="shp-button shp-secondary-button shp-page-button"
                                        disabled={
                                            currentPage <= 1
                                        }
                                        onClick={() => {
                                            setPage(
                                                (current) =>
                                                    Math.max(
                                                        1,
                                                        current - 1,
                                                    ),
                                            );
                                        }}
                                    >
                                        Previous
                                    </button>

                                    <span className="shp-page-number">
                                        Page
                                        {' '}
                                        <strong>
                                            {currentPage}
                                        </strong>
                                        {' '}of{' '}
                                        <strong>
                                            {lastPage}
                                        </strong>
                                    </span>

                                    <button
                                        type="button"
                                        className="shp-button shp-secondary-button shp-page-button"
                                        disabled={
                                            currentPage
                                            >= lastPage
                                        }
                                        onClick={() => {
                                            setPage(
                                                (current) =>
                                                    Math.min(
                                                        lastPage,
                                                        current + 1,
                                                    ),
                                            );
                                        }}
                                    >
                                        Next
                                    </button>
                                </div>
                            </footer>
                        )}
                </section>
            </div>

            <SaleDetailsModal
                saleId={selectedSaleId}
                sale={selectedSale}
                isLoading={isLoadingSale}
                errorMessage={
                    saleDetailsError
                }
                onClose={
                    closeSaleDetails
                }
                onRetry={() => {
                    if (
                        selectedSaleId
                        !== null
                    ) {
                        void loadSelectedSale(
                            selectedSaleId,
                        );
                    }
                }}
            />

            <CreateSalesReturnModal
                saleId={returnSaleId}
                options={returnOptions}
                isLoading={
                    isLoadingReturn
                }
                isSubmitting={
                    isSubmittingReturn
                }
                errorMessage={
                    returnError
                }
                onClose={
                    closeReturnModal
                }
                onSubmit={(values) => {
                    void submitReturn(
                        values,
                    );
                }}
            />
        </div>
    );
}