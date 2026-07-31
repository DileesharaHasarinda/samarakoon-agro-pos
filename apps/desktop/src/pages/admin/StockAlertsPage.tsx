import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import StockSettingsModal
    from '../../components/inventory/StockSettingsModal';

import {
    ApiError,
} from '../../lib/api';

import {
    getInventoryAlerts,
    updateProductStockSettings,
} from '../../services/inventoryAlertService';

import type {
    InventoryAlertProduct,
    InventoryAlertSummary,
    ProductStockSettingInput,
} from '../../types/inventoryAlert';

import type {
    PosPaginationMeta,
} from '../../types/sale';

const emptySummary:
    InventoryAlertSummary = {
    total_products: 0,
    low_stock_products: 0,
    out_of_stock_products: 0,
    products_with_expired_batches: 0,
    products_expiring_7_days: 0,
    products_expiring_30_days: 0,
    products_expiring_60_days: 0,
    safe_products: 0,
};

const emptyPagination:
    PosPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: null,
    to: null,
};

function formatDate(
    value: string | null,
): string {
    if (!value) {
        return 'No expiry date';
    }

    const date =
        new Date(
            `${value.substring(0, 10)}T00:00:00`,
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

function alertName(
    status: string,
): string {
    switch (status) {
        case 'out_of_stock':
            return 'Out of Stock';

        case 'low_stock':
            return 'Low Stock';

        case 'expired':
            return 'Expired Stock';

        case 'expiring_7':
            return 'Expires in 7 Days';

        case 'expiring_30':
            return 'Expires in 30 Days';

        case 'expiring_60':
            return 'Expires in 60 Days';

        default:
            return 'Safe Stock';
    }
}

const stockAlertStyles = `
    #sapo-stock-alerts-page,
    #sapo-stock-alerts-page *,
    #sapo-stock-alerts-page *::before,
    #sapo-stock-alerts-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-stock-alerts-page {
        --sal-green-900: #14532d;
        --sal-green-800: #166534;
        --sal-green-700: #15803d;
        --sal-green-100: #dcfce7;
        --sal-green-50: #f0fdf4;
        --sal-red: #dc2626;
        --sal-red-light: #fef2f2;
        --sal-amber: #b45309;
        --sal-amber-light: #fffbeb;
        --sal-orange: #c2410c;
        --sal-orange-light: #fff2eb;
        --sal-blue: #2563eb;
        --sal-blue-light: #eff6ff;
        --sal-text: #0f172a;
        --sal-text-secondary: #334155;
        --sal-muted: #64748b;
        --sal-border: #e2e8f0;
        --sal-border-strong: #cbd5e1;
        --sal-bg: #f8fafc;
        --sal-white: #ffffff;
        --sal-radius: 8px;
        --sal-radius-sm: 6px;
        --sal-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: relative !important;
        display: flex !important;
        width: 100% !important;
        height: calc(100vh - 100px) !important;
        height: calc(100dvh - 100px) !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: 100% !important;
        max-height: calc(100vh - 100px) !important;
        max-height: calc(100dvh - 100px) !important;
        flex: 1 1 auto !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 16px !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior-y: contain !important;
        scroll-behavior: smooth !important;
        scrollbar-gutter: stable !important;
        -webkit-overflow-scrolling: touch !important;
        color: var(--sal-text) !important;
        font-family: var(--sal-font) !important;
        font-size: 14px !important;
        line-height: 1.45 !important;
        background: transparent !important;
        border: 0 !important;
        isolation: isolate !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--sal-border-strong) transparent !important;
    }

    #sapo-stock-alerts-page::-webkit-scrollbar {
        width: 10px !important;
    }

    #sapo-stock-alerts-page::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-stock-alerts-page::-webkit-scrollbar-thumb {
        background: var(--sal-border-strong) !important;
        border: 2px solid transparent !important;
        border-radius: 999px !important;
        background-clip: content-box !important;
    }

    #sapo-stock-alerts-page::-webkit-scrollbar-thumb:hover {
        background: #94a3b8 !important;
        background-clip: content-box !important;
    }

    #sapo-stock-alerts-page h1,
    #sapo-stock-alerts-page h2,
    #sapo-stock-alerts-page h3,
    #sapo-stock-alerts-page p,
    #sapo-stock-alerts-page span,
    #sapo-stock-alerts-page strong,
    #sapo-stock-alerts-page small,
    #sapo-stock-alerts-page button,
    #sapo-stock-alerts-page input,
    #sapo-stock-alerts-page select {
        font-family: var(--sal-font) !important;
        text-transform: none !important;
        letter-spacing: normal !important;
    }

    /* ---------- Header ---------- */

    #sapo-stock-alerts-page
    .sal-header {
        display: flex !important;
        width: 100% !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 16px !important;
        margin: 0 !important;
        padding: 18px 20px !important;
        background: var(--sal-white) !important;
        border: 1px solid var(--sal-border) !important;
        border-radius: var(--sal-radius) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    }

    #sapo-stock-alerts-page
    .sal-header-copy {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 4px !important;
    }

    #sapo-stock-alerts-page
    .sal-kicker {
        display: block !important;
        color: var(--sal-green-700) !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        letter-spacing: 0.06em !important;
        text-transform: uppercase !important;
    }

    #sapo-stock-alerts-page
    .sal-title {
        display: block !important;
        color: var(--sal-text) !important;
        font-size: 20px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        letter-spacing: -0.01em !important;
    }

    #sapo-stock-alerts-page
    .sal-header-actions {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
    }

    #sapo-stock-alerts-page
    .sal-total-badge {
        display: inline-flex !important;
        min-height: 34px !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 6px 12px !important;
        color: var(--sal-green-800) !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
        white-space: nowrap !important;
        background: var(--sal-green-50) !important;
        border: 1px solid var(--sal-green-100) !important;
        border-radius: var(--sal-radius-sm) !important;
    }

    /* ---------- Buttons ---------- */

    #sapo-stock-alerts-page
    .sal-button {
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
        appearance: none !important;
        border-radius: var(--sal-radius-sm) !important;
        cursor: pointer !important;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease !important;
    }

    #sapo-stock-alerts-page
    .sal-refresh-button,
    #sapo-stock-alerts-page
    .sal-page-button {
        color: var(--sal-text-secondary) !important;
        background: var(--sal-white) !important;
        border: 1px solid var(--sal-border-strong) !important;
    }

    #sapo-stock-alerts-page
    .sal-refresh-button:hover:not(:disabled),
    #sapo-stock-alerts-page
    .sal-page-button:hover:not(:disabled) {
        color: var(--sal-text) !important;
        background: var(--sal-bg) !important;
        border-color: #94a3b8 !important;
    }

    #sapo-stock-alerts-page
    button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Summary cards ---------- */

    #sapo-stock-alerts-page
    .sal-summary-grid {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        gap: 10px !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-stock-alerts-page
    .sal-summary-card {
        position: relative !important;
        display: flex !important;
        min-width: 0 !important;
        min-height: 84px !important;
        flex-direction: column !important;
        justify-content: center !important;
        gap: 3px !important;
        margin: 0 !important;
        padding: 12px 14px !important;
        overflow: hidden !important;
        background: var(--sal-white) !important;
        border: 1px solid var(--sal-border) !important;
        border-radius: var(--sal-radius) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    }

    #sapo-stock-alerts-page
    .sal-summary-label {
        display: block !important;
        color: var(--sal-muted) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
    }

    #sapo-stock-alerts-page
    .sal-summary-value {
        display: block !important;
        color: var(--sal-text) !important;
        font-size: 22px !important;
        font-weight: 700 !important;
        line-height: 1.2 !important;
    }

    #sapo-stock-alerts-page
    .sal-summary-low
    .sal-summary-value {
        color: var(--sal-amber) !important;
    }

    #sapo-stock-alerts-page
    .sal-summary-out
    .sal-summary-value,
    #sapo-stock-alerts-page
    .sal-summary-expired
    .sal-summary-value {
        color: var(--sal-red) !important;
    }

    #sapo-stock-alerts-page
    .sal-summary-urgent
    .sal-summary-value {
        color: var(--sal-orange) !important;
    }

    /* ---------- Messages ---------- */

    #sapo-stock-alerts-page
    .sal-message {
        display: flex !important;
        width: 100% !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        gap: 10px !important;
        margin: 0 !important;
        padding: 10px 14px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.4 !important;
        border-radius: var(--sal-radius-sm) !important;
    }

    #sapo-stock-alerts-page
    .sal-success {
        color: var(--sal-green-800) !important;
        background: var(--sal-green-50) !important;
        border: 1px solid var(--sal-green-100) !important;
    }

    #sapo-stock-alerts-page
    .sal-error {
        color: var(--sal-red) !important;
        background: var(--sal-red-light) !important;
        border: 1px solid #fecaca !important;
    }

    #sapo-stock-alerts-page
    .sal-message-icon {
        display: grid !important;
        width: 20px !important;
        height: 20px !important;
        min-width: 20px !important;
        place-items: center !important;
        color: #ffffff !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        background: var(--sal-green-700) !important;
        border-radius: 50% !important;
    }

    #sapo-stock-alerts-page
    .sal-error
    .sal-message-icon {
        background: var(--sal-red) !important;
    }

    #sapo-stock-alerts-page
    .sal-message-text {
        display: block !important;
        min-width: 0 !important;
        flex: 1 !important;
        color: inherit !important;
        font-size: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
    }

    #sapo-stock-alerts-page
    .sal-message-close {
        display: grid !important;
        width: 24px !important;
        height: 24px !important;
        min-width: 24px !important;
        place-items: center !important;
        padding: 0 !important;
        color: inherit !important;
        font-size: 16px !important;
        font-weight: 400 !important;
        line-height: 1 !important;
        appearance: none !important;
        background: rgba(255, 255, 255, 0.6) !important;
        border: 1px solid currentColor !important;
        border-radius: var(--sal-radius-sm) !important;
        cursor: pointer !important;
    }

    /* ---------- Panel / toolbar ---------- */

    #sapo-stock-alerts-page
    .sal-panel {
        display: flex !important;
        width: 100% !important;
        min-width: 0 !important;
        flex: 0 0 auto !important;
        flex-direction: column !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: var(--sal-white) !important;
        border: 1px solid var(--sal-border) !important;
        border-radius: var(--sal-radius) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    }

    #sapo-stock-alerts-page
    .sal-toolbar {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 220px !important;
        align-items: center !important;
        gap: 10px !important;
        margin: 0 !important;
        padding: 14px 16px !important;
        background: var(--sal-white) !important;
        border-bottom: 1px solid var(--sal-border) !important;
    }

    #sapo-stock-alerts-page
    .sal-search-wrapper {
        position: relative !important;
        display: flex !important;
        width: 100% !important;
        min-width: 0 !important;
        align-items: center !important;
    }

    #sapo-stock-alerts-page
    .sal-search-icon {
        position: absolute !important;
        left: 12px !important;
        z-index: 2 !important;
        display: grid !important;
        width: 18px !important;
        height: 18px !important;
        place-items: center !important;
        color: var(--sal-muted) !important;
        font-size: 16px !important;
        font-weight: 600 !important;
        line-height: 1 !important;
        pointer-events: none !important;
    }

    #sapo-stock-alerts-page
    .sal-input,
    #sapo-stock-alerts-page
    .sal-select {
        display: block !important;
        width: 100% !important;
        height: 38px !important;
        min-height: 38px !important;
        margin: 0 !important;
        color: var(--sal-text) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: normal !important;
        outline: none !important;
        background: var(--sal-white) !important;
        border: 1px solid var(--sal-border-strong) !important;
        border-radius: var(--sal-radius-sm) !important;
        box-shadow: none !important;
    }

    #sapo-stock-alerts-page
    .sal-input {
        padding: 0 40px 0 38px !important;
        appearance: none !important;
    }

    #sapo-stock-alerts-page
    .sal-input::placeholder {
        color: #94a3b8 !important;
        font-size: 13px !important;
        opacity: 1 !important;
    }

    #sapo-stock-alerts-page
    .sal-select {
        padding: 0 10px !important;
        appearance: auto !important;
        cursor: pointer !important;
    }

    #sapo-stock-alerts-page
    .sal-input:focus,
    #sapo-stock-alerts-page
    .sal-select:focus {
        border-color: var(--sal-green-700) !important;
        box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.12) !important;
    }

    #sapo-stock-alerts-page
    .sal-clear-search {
        position: absolute !important;
        right: 6px !important;
        z-index: 3 !important;
        display: grid !important;
        width: 26px !important;
        height: 26px !important;
        min-width: 26px !important;
        place-items: center !important;
        color: var(--sal-muted) !important;
        font-size: 17px !important;
        font-weight: 400 !important;
        line-height: 1 !important;
        appearance: none !important;
        background: var(--sal-bg) !important;
        border: 0 !important;
        border-radius: var(--sal-radius-sm) !important;
        cursor: pointer !important;
    }

    /* ---------- Product list ---------- */

    #sapo-stock-alerts-page
    .sal-product-list {
        display: flex !important;
        width: 100% !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 12px !important;
        margin: 0 !important;
        padding: 16px !important;
        background: var(--sal-bg) !important;
    }

    #sapo-stock-alerts-page
    .sal-product-card {
        display: flex !important;
        width: 100% !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 14px !important;
        margin: 0 !important;
        padding: 16px !important;
        background: var(--sal-white) !important;
        border: 1px solid var(--sal-border) !important;
        border-radius: var(--sal-radius) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    }

    #sapo-stock-alerts-page
    .sal-product-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 14px !important;
        padding: 0 0 12px !important;
        border-bottom: 1px solid var(--sal-border) !important;
    }

    #sapo-stock-alerts-page
    .sal-product-main {
        display: flex !important;
        min-width: 0 !important;
        align-items: center !important;
        gap: 12px !important;
    }

    #sapo-stock-alerts-page
    .sal-product-icon {
        display: grid !important;
        width: 42px !important;
        height: 42px !important;
        min-width: 42px !important;
        place-items: center !important;
        color: #ffffff !important;
        font-size: 16px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        background: linear-gradient(145deg, var(--sal-green-900), var(--sal-green-700)) !important;
        border-radius: var(--sal-radius) !important;
    }

    #sapo-stock-alerts-page
    .sal-product-copy {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 3px !important;
    }

    #sapo-stock-alerts-page
    .sal-product-name {
        display: block !important;
        min-width: 0 !important;
        overflow: hidden !important;
        color: var(--sal-text) !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-stock-alerts-page
    .sal-product-meta {
        display: block !important;
        color: var(--sal-muted) !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        line-height: 1.35 !important;
    }

    #sapo-stock-alerts-page
    .sal-status {
        display: inline-flex !important;
        min-height: 28px !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 4px 11px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;
        white-space: nowrap !important;
        border-radius: 999px !important;
    }

    #sapo-stock-alerts-page
    .sal-status-safe {
        color: var(--sal-green-800) !important;
        background: var(--sal-green-100) !important;
    }

    #sapo-stock-alerts-page
    .sal-status-low_stock {
        color: var(--sal-amber) !important;
        background: var(--sal-amber-light) !important;
    }

    #sapo-stock-alerts-page
    .sal-status-out_of_stock,
    #sapo-stock-alerts-page
    .sal-status-expired {
        color: var(--sal-red) !important;
        background: var(--sal-red-light) !important;
    }

    #sapo-stock-alerts-page
    .sal-status-expiring_7 {
        color: var(--sal-orange) !important;
        background: var(--sal-orange-light) !important;
    }

    #sapo-stock-alerts-page
    .sal-status-expiring_30,
    #sapo-stock-alerts-page
    .sal-status-expiring_60 {
        color: var(--sal-amber) !important;
        background: var(--sal-amber-light) !important;
    }

    /* ---------- Metrics ---------- */

    #sapo-stock-alerts-page
    .sal-metrics {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 10px !important;
    }

    #sapo-stock-alerts-page
    .sal-metric {
        display: flex !important;
        min-width: 0 !important;
        min-height: 66px !important;
        flex-direction: column !important;
        justify-content: center !important;
        gap: 4px !important;
        padding: 10px 12px !important;
        background: var(--sal-bg) !important;
        border: 1px solid var(--sal-border) !important;
        border-radius: var(--sal-radius-sm) !important;
    }

    #sapo-stock-alerts-page
    .sal-metric-green {
        background: var(--sal-green-50) !important;
        border-color: var(--sal-green-100) !important;
    }

    #sapo-stock-alerts-page
    .sal-metric-blue {
        background: var(--sal-blue-light) !important;
        border-color: #bfdbfe !important;
    }

    #sapo-stock-alerts-page
    .sal-metric-label {
        display: block !important;
        color: var(--sal-muted) !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        line-height: 1.25 !important;
        letter-spacing: 0.02em !important;
        text-transform: uppercase !important;
    }

    #sapo-stock-alerts-page
    .sal-metric-value {
        display: block !important;
        overflow-wrap: anywhere !important;
        color: var(--sal-text) !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
    }

    #sapo-stock-alerts-page
    .sal-metric-green
    .sal-metric-value {
        color: var(--sal-green-800) !important;
    }

    #sapo-stock-alerts-page
    .sal-metric-blue
    .sal-metric-value {
        color: var(--sal-blue) !important;
    }

    /* ---------- Product footer / alert chips ---------- */

    #sapo-stock-alerts-page
    .sal-product-footer {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 14px !important;
    }

    #sapo-stock-alerts-page
    .sal-alert-list {
        display: flex !important;
        min-width: 0 !important;
        flex: 1 !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 6px !important;
    }

    #sapo-stock-alerts-page
    .sal-alert-chip,
    #sapo-stock-alerts-page
    .sal-no-alert {
        display: inline-flex !important;
        min-height: 26px !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 4px 10px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;
        border-radius: 999px !important;
    }

    #sapo-stock-alerts-page
    .sal-chip-expired {
        color: var(--sal-red) !important;
        background: var(--sal-red-light) !important;
    }

    #sapo-stock-alerts-page
    .sal-chip-urgent {
        color: var(--sal-orange) !important;
        background: var(--sal-orange-light) !important;
    }

    #sapo-stock-alerts-page
    .sal-chip-warning {
        color: var(--sal-amber) !important;
        background: var(--sal-amber-light) !important;
    }

    #sapo-stock-alerts-page
    .sal-no-alert {
        color: var(--sal-green-800) !important;
        background: var(--sal-green-50) !important;
    }

    #sapo-stock-alerts-page
    .sal-settings-button {
        min-width: 130px !important;
        flex-shrink: 0 !important;
        color: #ffffff !important;
        background: var(--sal-green-700) !important;
        border: 1px solid var(--sal-green-700) !important;
    }

    #sapo-stock-alerts-page
    .sal-settings-button:hover {
        background: var(--sal-green-800) !important;
        border-color: var(--sal-green-800) !important;
    }

    /* ---------- Empty / loading states ---------- */

    #sapo-stock-alerts-page
    .sal-state {
        display: flex !important;
        width: 100% !important;
        min-height: 240px !important;
        align-items: center !important;
        justify-content: center !important;
        flex-direction: column !important;
        gap: 10px !important;
        padding: 28px !important;
        color: var(--sal-muted) !important;
        text-align: center !important;
        background: var(--sal-white) !important;
        border: 1px dashed var(--sal-border) !important;
        border-radius: var(--sal-radius) !important;
    }

    #sapo-stock-alerts-page
    .sal-spinner {
        display: block !important;
        width: 32px !important;
        height: 32px !important;
        margin: 0 0 2px !important;
        background: transparent !important;
        border: 3px solid var(--sal-green-100) !important;
        border-top-color: var(--sal-green-700) !important;
        border-radius: 50% !important;
        animation: sal-spin 700ms linear infinite !important;
    }

    @keyframes sal-spin {
        to {
            transform: rotate(360deg);
        }
    }

    #sapo-stock-alerts-page
    .sal-state-title {
        display: block !important;
        color: var(--sal-text) !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
    }

    #sapo-stock-alerts-page
    .sal-state-message {
        display: block !important;
        color: var(--sal-muted) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: 1.5 !important;
    }

    /* ---------- Pagination ---------- */

    #sapo-stock-alerts-page
    .sal-pagination {
        display: flex !important;
        min-height: 56px !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 14px !important;
        margin: 0 !important;
        padding: 12px 16px !important;
        background: var(--sal-white) !important;
        border-top: 1px solid var(--sal-border) !important;
    }

    #sapo-stock-alerts-page
    .sal-pagination-info {
        display: block !important;
        color: var(--sal-muted) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: 1.4 !important;
    }

    #sapo-stock-alerts-page
    .sal-pagination-info strong {
        color: var(--sal-text) !important;
        font-weight: 600 !important;
    }

    #sapo-stock-alerts-page
    .sal-pagination-actions {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
    }

    #sapo-stock-alerts-page
    .sal-page-button {
        min-width: 88px !important;
    }

    #sapo-stock-alerts-page
    .sal-page-number {
        display: inline-flex !important;
        min-height: 34px !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 6px 12px !important;
        color: var(--sal-text-secondary) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: 1.2 !important;
        white-space: nowrap !important;
        background: var(--sal-bg) !important;
        border: 1px solid var(--sal-border) !important;
        border-radius: var(--sal-radius-sm) !important;
    }

    #sapo-stock-alerts-page
    .sal-page-number strong {
        color: var(--sal-green-800) !important;
        font-weight: 700 !important;
    }

    /* ---------- Responsive ---------- */

    @media (max-width: 1180px) {
        #sapo-stock-alerts-page
        .sal-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        #sapo-stock-alerts-page
        .sal-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
    }

    @media (max-width: 780px) {
        #sapo-stock-alerts-page {
            height: calc(100vh - 72px) !important;
            height: calc(100dvh - 72px) !important;
            max-height: calc(100vh - 72px) !important;
            max-height: calc(100dvh - 72px) !important;
            gap: 12px !important;
        }

        #sapo-stock-alerts-page
        .sal-header {
            align-items: stretch !important;
            flex-direction: column !important;
            padding: 14px !important;
        }

        #sapo-stock-alerts-page
        .sal-title {
            font-size: 18px !important;
        }

        #sapo-stock-alerts-page
        .sal-header-actions {
            align-items: stretch !important;
            flex-direction: column !important;
        }

        #sapo-stock-alerts-page
        .sal-total-badge,
        #sapo-stock-alerts-page
        .sal-refresh-button {
            width: 100% !important;
        }

        #sapo-stock-alerts-page
        .sal-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        #sapo-stock-alerts-page
        .sal-toolbar {
            grid-template-columns: 1fr !important;
            padding: 12px !important;
        }

        #sapo-stock-alerts-page
        .sal-product-list {
            padding: 12px !important;
        }

        #sapo-stock-alerts-page
        .sal-product-header {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 8px !important;
        }

        #sapo-stock-alerts-page
        .sal-status {
            width: 100% !important;
        }

        #sapo-stock-alerts-page
        .sal-product-footer {
            align-items: stretch !important;
            flex-direction: column !important;
        }

        #sapo-stock-alerts-page
        .sal-settings-button {
            width: 100% !important;
        }

        #sapo-stock-alerts-page
        .sal-pagination {
            align-items: stretch !important;
            flex-direction: column !important;
        }

        #sapo-stock-alerts-page
        .sal-pagination-actions {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        #sapo-stock-alerts-page
        .sal-page-number {
            grid-column: 1 / -1 !important;
            grid-row: 1 !important;
        }

        #sapo-stock-alerts-page
        .sal-page-button {
            width: 100% !important;
            min-width: 0 !important;
        }
    }

    @media (max-width: 520px) {
        #sapo-stock-alerts-page
        .sal-summary-grid,
        #sapo-stock-alerts-page
        .sal-metrics {
            grid-template-columns: 1fr !important;
        }

        #sapo-stock-alerts-page
        .sal-product-main {
            align-items: flex-start !important;
        }

        #sapo-stock-alerts-page
        .sal-product-name {
            white-space: normal !important;
        }
    }
`;

export default function StockAlertsPage() {
    const {
        token,
    } = useAuth();

    const [
        products,
        setProducts,
    ] = useState<InventoryAlertProduct[]>([]);

    const [
        summary,
        setSummary,
    ] = useState(
        emptySummary,
    );

    const [
        pagination,
        setPagination,
    ] = useState(
        emptyPagination,
    );

    const [
        searchInput,
        setSearchInput,
    ] = useState('');

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        alertStatus,
        setAlertStatus,
    ] = useState('all');

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        selectedProduct,
        setSelectedProduct,
    ] = useState<InventoryAlertProduct | null>(null);

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        modalError,
        setModalError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const loadAlerts =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getInventoryAlerts(
                            token,
                            {
                                search,
                                alertStatus,
                                page,
                                perPage: 20,
                            },
                        );

                    setProducts(
                        response.data,
                    );

                    setSummary(
                        response.summary,
                    );

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load stock alerts.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [
                token,
                search,
                alertStatus,
                page,
            ],
        );

    useEffect(() => {
        void loadAlerts();
    }, [loadAlerts]);

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    setSearch(
                        searchInput.trim(),
                    );

                    setPage(1);
                },
                300,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [searchInput]);

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeout =
            window.setTimeout(
                () => {
                    setSuccessMessage('');
                },
                3500,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [successMessage]);

    const clearSearch = (): void => {
        setSearchInput('');
        setSearch('');
        setPage(1);
    };

    const saveSettings =
        async (
            values:
                ProductStockSettingInput,
        ): Promise<void> => {
            if (
                !token
                || !selectedProduct
                || isSubmitting
            ) {
                return;
            }

            setIsSubmitting(true);
            setModalError('');

            try {
                const response =
                    await updateProductStockSettings(
                        token,
                        selectedProduct.id,
                        values,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Stock settings updated successfully.',
                );

                setSelectedProduct(null);

                await loadAlerts();
            } catch (error) {
                setModalError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to update stock settings.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    return (
        <div id="sapo-stock-alerts-page">
            <style>
                {stockAlertStyles}
            </style>

            <header className="sal-header">
                <div className="sal-header-copy">
                    <span className="sal-kicker">
                        Inventory Monitoring
                    </span>

                    <h1 className="sal-title">
                        Stock and Expiry Alerts
                    </h1>
                </div>

                <div className="sal-header-actions">
                    <span className="sal-total-badge">
                        {summary.total_products}
                        {' '}
                        {summary.total_products === 1
                            ? 'Product'
                            : 'Products'}
                    </span>

                    <button
                        type="button"
                        className="sal-button sal-refresh-button"
                        disabled={isLoading}
                        onClick={() => {
                            void loadAlerts();
                        }}
                    >
                        {isLoading
                            ? 'Refreshing...'
                            : 'Refresh'}
                    </button>
                </div>
            </header>

            <section className="sal-summary-grid">
                <article className="sal-summary-card sal-summary-low">
                    <span className="sal-summary-label">
                        Low Stock
                    </span>

                    <strong className="sal-summary-value">
                        {summary.low_stock_products}
                    </strong>
                </article>

                <article className="sal-summary-card sal-summary-out">
                    <span className="sal-summary-label">
                        Out of Stock
                    </span>

                    <strong className="sal-summary-value">
                        {summary.out_of_stock_products}
                    </strong>
                </article>

                <article className="sal-summary-card sal-summary-expired">
                    <span className="sal-summary-label">
                        Expired Stock
                    </span>

                    <strong className="sal-summary-value">
                        {
                            summary
                                .products_with_expired_batches
                        }
                    </strong>
                </article>

                <article className="sal-summary-card sal-summary-urgent">
                    <span className="sal-summary-label">
                        Expires in 7 Days
                    </span>

                    <strong className="sal-summary-value">
                        {
                            summary
                                .products_expiring_7_days
                        }
                    </strong>
                </article>

                <article className="sal-summary-card">
                    <span className="sal-summary-label">
                        Expires in 30 Days
                    </span>

                    <strong className="sal-summary-value">
                        {
                            summary
                                .products_expiring_30_days
                        }
                    </strong>
                </article>
            </section>

            {successMessage && (
                <div
                    className="sal-message sal-success"
                    role="status"
                >
                    <span className="sal-message-icon">
                        ✓
                    </span>

                    <span className="sal-message-text">
                        {successMessage}
                    </span>

                    <button
                        type="button"
                        className="sal-message-close"
                        aria-label="Close success message"
                        onClick={() => {
                            setSuccessMessage('');
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            {pageError && (
                <div
                    className="sal-message sal-error"
                    role="alert"
                >
                    <span className="sal-message-icon">
                        !
                    </span>

                    <span className="sal-message-text">
                        {pageError}
                    </span>

                    <button
                        type="button"
                        className="sal-button sal-refresh-button"
                        onClick={() => {
                            void loadAlerts();
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <section className="sal-panel">
                <div className="sal-toolbar">
                    <div className="sal-search-wrapper">
                        <span
                            className="sal-search-icon"
                            aria-hidden="true"
                        >
                            ⌕
                        </span>

                        <input
                            type="search"
                            className="sal-input"
                            value={searchInput}
                            placeholder="Search product, SKU, barcode or category"
                            aria-label="Search stock alerts"
                            onChange={(event) => {
                                setSearchInput(
                                    event.target.value,
                                );
                            }}
                        />

                        {searchInput && (
                            <button
                                type="button"
                                className="sal-clear-search"
                                aria-label="Clear search"
                                onClick={clearSearch}
                            >
                                ×
                            </button>
                        )}
                    </div>

                    <select
                        className="sal-select"
                        value={alertStatus}
                        aria-label="Filter stock alerts"
                        onChange={(event) => {
                            setAlertStatus(
                                event.target.value,
                            );

                            setPage(1);
                        }}
                    >
                        <option value="all">
                            All Products
                        </option>

                        <option value="low_stock">
                            Low Stock
                        </option>

                        <option value="out_of_stock">
                            Out of Stock
                        </option>

                        <option value="expired">
                            Expired
                        </option>

                        <option value="expiring_7">
                            Expires in 7 Days
                        </option>

                        <option value="expiring_30">
                            Expires in 30 Days
                        </option>

                        <option value="expiring_60">
                            Expires in 60 Days
                        </option>

                        <option value="safe">
                            Safe Stock
                        </option>
                    </select>
                </div>

                <div className="sal-product-list">
                    {isLoading ? (
                        <div className="sal-state">
                            <div className="sal-spinner" />

                            <strong className="sal-state-title">
                                Loading Stock Alerts
                            </strong>

                            <span className="sal-state-message">
                                Please wait while inventory
                                alerts are checked.
                            </span>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="sal-state">
                            <strong className="sal-state-title">
                                No Matching Products
                            </strong>

                            <span className="sal-state-message">
                                Change the search or alert filter
                                to view other products.
                            </span>
                        </div>
                    ) : (
                        products.map(
                            (product) => {
                                const hasBatchAlerts =
                                    product
                                        .expired_batch_count
                                    > 0
                                    || product
                                        .expiring_7_count
                                    > 0
                                    || product
                                        .expiring_30_count
                                    > 0;

                                return (
                                    <article
                                        key={product.id}
                                        className="sal-product-card"
                                    >
                                        <header className="sal-product-header">
                                            <div className="sal-product-main">
                                                <div className="sal-product-icon">
                                                    {product.name
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>

                                                <div className="sal-product-copy">
                                                    <strong className="sal-product-name">
                                                        {product.name}
                                                    </strong>

                                                    <span className="sal-product-meta">
                                                        {product.category
                                                            ?.name
                                                            ?? 'General'}
                                                        {' · '}
                                                        {product.sku
                                                            || product.barcode
                                                            || 'No product code'}
                                                    </span>
                                                </div>
                                            </div>

                                            <span
                                                className={
                                                    `sal-status sal-status-${product.alert_status}`
                                                }
                                            >
                                                {alertName(
                                                    product
                                                        .alert_status,
                                                )}
                                            </span>
                                        </header>

                                        <div className="sal-metrics">
                                            <div className="sal-metric sal-metric-green">
                                                <span className="sal-metric-label">
                                                    Available Stock
                                                </span>

                                                <strong className="sal-metric-value">
                                                    {
                                                        product
                                                            .total_available_quantity
                                                    }
                                                    {' '}
                                                    {product.unit}
                                                </strong>
                                            </div>

                                            <div className="sal-metric">
                                                <span className="sal-metric-label">
                                                    Minimum Level
                                                </span>

                                                <strong className="sal-metric-value">
                                                    {
                                                        product
                                                            .minimum_stock_level
                                                    }
                                                    {' '}
                                                    {product.unit}
                                                </strong>
                                            </div>

                                            <div className="sal-metric sal-metric-blue">
                                                <span className="sal-metric-label">
                                                    Suggested Reorder
                                                </span>

                                                <strong className="sal-metric-value">
                                                    {
                                                        product
                                                            .suggested_reorder_quantity
                                                    }
                                                    {' '}
                                                    {product.unit}
                                                </strong>
                                            </div>

                                            <div className="sal-metric">
                                                <span className="sal-metric-label">
                                                    Nearest Expiry
                                                </span>

                                                <strong className="sal-metric-value">
                                                    {formatDate(
                                                        product
                                                            .nearest_expiry,
                                                    )}
                                                </strong>
                                            </div>
                                        </div>

                                        <footer className="sal-product-footer">
                                            <div className="sal-alert-list">
                                                {product
                                                    .expired_batch_count
                                                    > 0 && (
                                                        <span className="sal-alert-chip sal-chip-expired">
                                                            {
                                                                product
                                                                    .expired_batch_count
                                                            }
                                                            {' '}
                                                            expired
                                                        </span>
                                                    )}

                                                {product
                                                    .expiring_7_count
                                                    > 0 && (
                                                        <span className="sal-alert-chip sal-chip-urgent">
                                                            {
                                                                product
                                                                    .expiring_7_count
                                                            }
                                                            {' '}
                                                            urgent
                                                        </span>
                                                    )}

                                                {product
                                                    .expiring_30_count
                                                    > 0 && (
                                                        <span className="sal-alert-chip sal-chip-warning">
                                                            {
                                                                product
                                                                    .expiring_30_count
                                                            }
                                                            {' '}
                                                            within 30 days
                                                        </span>
                                                    )}

                                                {!hasBatchAlerts && (
                                                    <span className="sal-no-alert">
                                                        No expiry warnings
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                className="sal-button sal-settings-button"
                                                onClick={() => {
                                                    setModalError('');

                                                    setSelectedProduct(
                                                        product,
                                                    );
                                                }}
                                            >
                                                Edit Settings
                                            </button>
                                        </footer>
                                    </article>
                                );
                            },
                        )
                    )}
                </div>

                {pagination.total > 0 && (
                    <footer className="sal-pagination">
                        <span className="sal-pagination-info">
                            Showing
                            {' '}
                            <strong>
                                {pagination.from}
                            </strong>
                            {' '}to{' '}
                            <strong>
                                {pagination.to}
                            </strong>
                            {' '}of{' '}
                            <strong>
                                {pagination.total}
                            </strong>
                            {' '}products
                        </span>

                        <div className="sal-pagination-actions">
                            <button
                                type="button"
                                className="sal-button sal-page-button"
                                disabled={page <= 1}
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
                                Previous
                            </button>

                            <span className="sal-page-number">
                                Page
                                {' '}
                                <strong>
                                    {pagination.current_page}
                                </strong>
                                {' '}of{' '}
                                <strong>
                                    {pagination.last_page}
                                </strong>
                            </span>

                            <button
                                type="button"
                                className="sal-button sal-page-button"
                                disabled={
                                    page
                                    >= pagination.last_page
                                }
                                onClick={() => {
                                    setPage(
                                        (
                                            currentPage,
                                        ) =>
                                            Math.min(
                                                pagination
                                                    .last_page,

                                                currentPage + 1,
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

            <StockSettingsModal
                product={selectedProduct}
                isSubmitting={isSubmitting}
                errorMessage={modalError}
                onClose={() => {
                    if (!isSubmitting) {
                        setSelectedProduct(null);
                        setModalError('');
                    }
                }}
                onSubmit={(values) => {
                    void saveSettings(
                        values,
                    );
                }}
            />
        </div>
    );
}