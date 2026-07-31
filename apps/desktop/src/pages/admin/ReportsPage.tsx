import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    getReportOverview,
} from '../../services/reportService';

import type {
    ReportOverviewData,
} from '../../types/report';

type ReportTab =
    | 'overview'
    | 'products'
    | 'expenses'
    | 'dues'
    | 'inventory';

const currencyFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        },
    );

function currentDate(): string {
    return new Date()
        .toISOString()
        .slice(0, 10);
}

function monthStart(): string {
    const date =
        new Date();

    date.setDate(1);

    return date
        .toISOString()
        .slice(0, 10);
}

function formatDate(
    value: string | null,
): string {
    if (!value) {
        return 'Not set';
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    ).format(
        new Date(
            `${value}T00:00:00`,
        ),
    );
}

function paymentMethodName(
    value: string,
): string {
    switch (value) {
        case 'bank_transfer':
            return 'Bank Transfer';

        case 'card':
            return 'Card';

        default:
            return 'Cash';
    }
}

function escapeCsv(
    value:
        string
        | number
        | null,
): string {
    const text =
        value === null
            ? ''
            : String(value);

    return `"${text.replace(
        /"/g,
        '""',
    )}"`;
}

type CsvCell = string | number | null;

function downloadCsv(
    report: ReportOverviewData,
): void {
    const rows: CsvCell[][] = [];

    rows.push(['Samarakoon Agro POS Report']);
    rows.push(['Date From', report.period.date_from]);
    rows.push(['Date To', report.period.date_to]);
    rows.push([]);
    rows.push(['Financial Summary']);
    rows.push(['Sales Count', report.summary.sales_count]);
    rows.push(['Sales Total', report.summary.sales_total]);
    rows.push(['Collected Amount', report.summary.collected_amount]);
    rows.push(['Due Amount', report.summary.due_amount]);
    rows.push(['Discount Total', report.summary.discount_total]);
    rows.push(['Gross Profit', report.summary.gross_profit]);
    rows.push(['Return Refund', report.summary.return_refund]);
    rows.push(['Expense Total', report.summary.expense_total]);
    rows.push(['Final Net Profit', report.summary.final_net_profit]);
    rows.push([]);
    rows.push(['Daily Activity']);
    rows.push(['Date', 'Sales', 'Collections', 'Expenses', 'Returns']);

    report.daily_series.forEach(
        (item) => {
            rows.push([
                item.date,
                item.sales,
                item.collections,
                item.expenses,
                item.returns,
            ]);
        },
    );

    rows.push([]);
    rows.push(['Product Performance']);
    rows.push(['Product', 'Category', 'Quantity Sold', 'Unit', 'Sales Total', 'Cost Total', 'Gross Profit']);

    report.product_performance.forEach(
        (product) => {
            rows.push([
                product.name,
                product.category.name,
                product.quantity_sold,
                product.unit,
                product.sales_total,
                product.cost_total,
                product.gross_profit,
            ]);
        },
    );

    rows.push([]);
    rows.push(['Expense Categories']);
    rows.push(['Category', 'Expense Count', 'Total Amount']);

    report.expense_categories.forEach(
        (category) => {
            rows.push([
                category.name,
                category.expense_count,
                category.total_amount,
            ]);
        },
    );

    rows.push([]);
    rows.push(['Customer Dues']);
    rows.push(['Customer', 'Customer Code', 'Mobile', 'Due Sales', 'Sales Total', 'Paid Amount', 'Due Amount']);

    report.customer_dues.forEach(
        (customer) => {
            rows.push([
                customer.name,
                customer.customer_code,
                customer.mobile,
                customer.due_sales,
                customer.sales_total,
                customer.paid_amount,
                customer.due_amount,
            ]);
        },
    );

    rows.push([]);
    rows.push(['Inventory']);
    rows.push(['Product', 'Category', 'Quantity', 'Unit', 'Batch Count', 'Purchase Value', 'Retail Value', 'Nearest Expiry']);

    report.inventory.products.forEach(
        (product) => {
            rows.push([
                product.name,
                product.category.name,
                product.quantity,
                product.unit,
                product.batch_count,
                product.purchase_value,
                product.retail_value,
                product.nearest_expiry,
            ]);
        },
    );

    const csv =
        rows
            .map(
                (row) =>
                    row
                        .map(escapeCsv)
                        .join(','),
            )
            .join('\n');

    const blob =
        new Blob(
            [csv],
            { type: 'text/csv;charset=utf-8' },
        );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `samarakoon-report-${report.period.date_from}-to-${report.period.date_to}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Scoped, isolated stylesheet — same hardened pattern as ExpensesPage.
// Every rule is ID-scoped (#sapo-reports-page) and !important so that no
// global admin/layout CSS (sidebar ".active", generic ".content-card", etc.)
// can leak in and override tab colors, text contrast, or scroll behaviour.
// ---------------------------------------------------------------------------
const reportsPageStyles = `
    #sapo-reports-page,
    #sapo-reports-page *,
    #sapo-reports-page *::before,
    #sapo-reports-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-reports-page {
        --rp-blue: #2563eb;
        --rp-blue-dark: #1d4ed8;
        --rp-blue-light: #eff6ff;
        --rp-green: #15803d;
        --rp-green-light: #f0fdf4;
        --rp-red: #dc2626;
        --rp-red-light: #fef2f2;
        --rp-amber: #b45309;
        --rp-amber-light: #fffbeb;
        --rp-text: #111827;
        --rp-text-secondary: #1f2937;
        --rp-muted: #6b7280;
        --rp-subtle: #9ca3af;
        --rp-border: #e5e7eb;
        --rp-border-strong: #d1d5db;
        --rp-bg: #f9fafb;
        --rp-white: #ffffff;
        --rp-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        gap: 20px !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--rp-text-secondary) !important;
        font-family: var(--rp-font) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        background: transparent !important;
        isolation: isolate !important;
    }

    #sapo-reports-page h2,
    #sapo-reports-page h3,
    #sapo-reports-page p,
    #sapo-reports-page span,
    #sapo-reports-page strong,
    #sapo-reports-page small,
    #sapo-reports-page label,
    #sapo-reports-page button,
    #sapo-reports-page input,
    #sapo-reports-page select,
    #sapo-reports-page table,
    #sapo-reports-page th,
    #sapo-reports-page td {
        font-family: var(--rp-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-reports-page h2,
    #sapo-reports-page h3,
    #sapo-reports-page p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Header ---------- */
    #sapo-reports-page .rp-header {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 16px !important;
        padding: 20px 24px !important;
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-reports-page .rp-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--rp-blue) !important;
        background: transparent !important;
        margin-bottom: 6px !important;
    }

    #sapo-reports-page .rp-header h2 {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--rp-text) !important;
        margin-bottom: 4px !important;
    }

    #sapo-reports-page .rp-header p {
        font-size: 13.5px !important;
        color: var(--rp-muted) !important;
        max-width: 480px !important;
    }

    #sapo-reports-page .rp-header-actions {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 10px !important;
        flex-shrink: 0 !important;
    }

    /* ---------- Buttons ---------- */
    #sapo-reports-page .rp-primary-button,
    #sapo-reports-page .rp-secondary-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 38px !important;
        padding: 0 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease !important;
    }

    #sapo-reports-page .rp-primary-button {
        color: #ffffff !important;
        background: var(--rp-blue) !important;
        border: 1px solid var(--rp-blue) !important;
    }

    #sapo-reports-page .rp-primary-button:hover:not(:disabled) {
        background: var(--rp-blue-dark) !important;
        border-color: var(--rp-blue-dark) !important;
    }

    #sapo-reports-page .rp-secondary-button {
        color: #374151 !important;
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border-strong) !important;
    }

    #sapo-reports-page .rp-secondary-button:hover:not(:disabled) {
        background: var(--rp-bg) !important;
        border-color: #9ca3af !important;
    }

    #sapo-reports-page button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Filter card ---------- */
    #sapo-reports-page .rp-filter-card {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-end !important;
        gap: 16px !important;
        padding: 20px !important;
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-reports-page .rp-filter-card label {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        min-width: 150px !important;
    }

    #sapo-reports-page .rp-filter-card label span {
        font-size: 11.5px !important;
        font-weight: 600 !important;
        color: var(--rp-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-filter-card input,
    #sapo-reports-page .rp-filter-card select {
        height: 38px !important;
        padding: 0 12px !important;
        font-size: 13.5px !important;
        font-weight: 400 !important;
        color: var(--rp-text-secondary) !important;
        border: 1px solid var(--rp-border-strong) !important;
        border-radius: 8px !important;
        background: var(--rp-bg) !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-reports-page .rp-filter-card input:focus,
    #sapo-reports-page .rp-filter-card select:focus {
        border-color: var(--rp-blue) !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
        background: var(--rp-white) !important;
    }

    #sapo-reports-page .rp-filter-card > button {
        height: 38px !important;
    }

    /* ---------- Alert ---------- */
    #sapo-reports-page .rp-form-alert {
        padding: 12px 16px !important;
        border-radius: 8px !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        background: var(--rp-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Tabs ---------- */
    #sapo-reports-page .rp-tabs {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 4px !important;
        padding: 8px !important;
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 10px !important;
        overflow-x: auto !important;
    }

    #sapo-reports-page .rp-tabs button {
        height: 36px !important;
        padding: 0 16px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: var(--rp-muted) !important;
        background: transparent !important;
        border: 1px solid transparent !important;
        border-radius: 7px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-reports-page .rp-tabs button:hover {
        color: var(--rp-text) !important;
        background: var(--rp-bg) !important;
    }

    #sapo-reports-page .rp-tabs button.rp-tab-active {
        color: var(--rp-blue) !important;
        background: var(--rp-blue-light) !important;
        border-color: #bfdbfe !important;
    }

    /* ---------- Loading state ---------- */
    #sapo-reports-page .rp-page-state {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        padding: 48px 0 !important;
        color: var(--rp-muted) !important;
        font-size: 13.5px !important;
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-reports-page .rp-spinner {
        width: 16px !important;
        height: 16px !important;
        border: 2px solid var(--rp-border) !important;
        border-top-color: var(--rp-blue) !important;
        border-radius: 50% !important;
        animation: rp-spin 0.7s linear infinite !important;
    }

    @keyframes rp-spin {
        to { transform: rotate(360deg); }
    }

    /* ---------- Summary grid ---------- */
    #sapo-reports-page .rp-summary-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)) !important;
        gap: 16px !important;
    }

    #sapo-reports-page .rp-summary-grid article {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        padding: 18px 20px !important;
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-reports-page .rp-summary-grid span {
        font-size: 12px !important;
        font-weight: 500 !important;
        color: var(--rp-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-summary-grid strong {
        font-size: 21px !important;
        font-weight: 700 !important;
        color: var(--rp-text) !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-summary-grid small {
        font-size: 12px !important;
        color: var(--rp-subtle) !important;
        background: transparent !important;
    }

    /* ---------- Two column layout ---------- */
    #sapo-reports-page .rp-two-column {
        display: grid !important;
        grid-template-columns: 1.6fr 1fr !important;
        gap: 16px !important;
    }

    @media (max-width: 900px) {
        #sapo-reports-page .rp-two-column {
            grid-template-columns: 1fr !important;
        }
    }

    #sapo-reports-page .rp-card {
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 10px !important;
        padding: 20px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 14px !important;
    }

    #sapo-reports-page .rp-card-header {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
    }

    #sapo-reports-page .rp-card-header h3 {
        font-size: 15.5px !important;
        font-weight: 700 !important;
        color: var(--rp-text) !important;
    }

    /* ---------- Legend ---------- */
    #sapo-reports-page .rp-legend {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 16px !important;
        font-size: 12.5px !important;
        color: var(--rp-muted) !important;
    }

    #sapo-reports-page .rp-legend span {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        background: transparent !important;
        color: var(--rp-muted) !important;
    }

    #sapo-reports-page .rp-legend i {
        width: 10px !important;
        height: 10px !important;
        border-radius: 2px !important;
        display: inline-block !important;
    }

    #sapo-reports-page .rp-legend-sales { background: #2563eb !important; }
    #sapo-reports-page .rp-legend-collections { background: #16a34a !important; }
    #sapo-reports-page .rp-legend-expenses { background: #f59e0b !important; }
    #sapo-reports-page .rp-legend-returns { background: #dc2626 !important; }

    /* ---------- Bar chart (scrollable) ---------- */
    #sapo-reports-page .rp-bar-chart {
        max-height: 360px !important;
        overflow-y: auto !important;
        padding-right: 4px !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--rp-border-strong) transparent !important;
    }

    #sapo-reports-page .rp-bar-chart::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-reports-page .rp-bar-chart::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-reports-page .rp-bar-chart::-webkit-scrollbar-thumb {
        background: var(--rp-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-reports-page .rp-chart-row {
        display: grid !important;
        grid-template-columns: 90px 1fr 100px !important;
        align-items: center !important;
        gap: 12px !important;
        padding: 7px 0 !important;
        border-bottom: 1px solid #f1f5f9 !important;
        font-size: 12.5px !important;
    }

    #sapo-reports-page .rp-chart-row:last-child {
        border-bottom: none !important;
    }

    #sapo-reports-page .rp-chart-row > span {
        color: var(--rp-muted) !important;
        white-space: nowrap !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-chart-row > div {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
    }

    #sapo-reports-page .rp-chart-row strong {
        font-size: 13px !important;
        font-weight: 600 !important;
        text-align: right !important;
        color: var(--rp-text) !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-bar {
        height: 4px !important;
        border-radius: 2px !important;
        min-width: 2px !important;
        background: var(--rp-border) !important;
    }

    #sapo-reports-page .rp-sales-bar { background: #2563eb !important; }
    #sapo-reports-page .rp-collections-bar { background: #16a34a !important; }
    #sapo-reports-page .rp-expenses-bar { background: #f59e0b !important; }
    #sapo-reports-page .rp-returns-bar { background: #dc2626 !important; }

    /* ---------- Payment list (scrollable) ---------- */
    #sapo-reports-page .rp-payment-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        max-height: 360px !important;
        overflow-y: auto !important;
        padding-right: 4px !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--rp-border-strong) transparent !important;
    }

    #sapo-reports-page .rp-payment-list::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-reports-page .rp-payment-list::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-reports-page .rp-payment-list::-webkit-scrollbar-thumb {
        background: var(--rp-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-reports-page .rp-payment-list article {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 12px 14px !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 8px !important;
        background: var(--rp-bg) !important;
    }

    #sapo-reports-page .rp-payment-list article > div {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
    }

    #sapo-reports-page .rp-payment-list strong {
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: var(--rp-text) !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-payment-list article > div span {
        font-size: 12px !important;
        color: var(--rp-subtle) !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-payment-list > article > strong {
        font-size: 14px !important;
        color: var(--rp-text) !important;
    }

    /* ---------- Value colors ---------- */
    #sapo-reports-page .rp-positive-value { color: var(--rp-green) !important; }
    #sapo-reports-page .rp-negative-value { color: var(--rp-red) !important; }
    #sapo-reports-page .rp-warning-value { color: var(--rp-amber) !important; }

    /* ---------- Scrollable tables ---------- */
    #sapo-reports-page .rp-table-container {
        max-height: 520px !important;
        overflow-y: auto !important;
        overflow-x: auto !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 8px !important;
        background: var(--rp-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--rp-border-strong) transparent !important;
    }

    #sapo-reports-page .rp-table-container::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
    }

    #sapo-reports-page .rp-table-container::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-reports-page .rp-table-container::-webkit-scrollbar-thumb {
        background: var(--rp-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-reports-page .rp-table-container::-webkit-scrollbar-thumb:hover {
        background: #9ca3af !important;
    }

    #sapo-reports-page .rp-table {
        width: 100% !important;
        min-width: 720px !important;
        border-collapse: collapse !important;
        font-size: 13.5px !important;
        background: var(--rp-white) !important;
    }

    #sapo-reports-page .rp-table thead {
        position: sticky !important;
        top: 0 !important;
        z-index: 1 !important;
    }

    #sapo-reports-page .rp-table thead th {
        background: #f9fafb !important;
        color: var(--rp-muted) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        text-align: left !important;
        padding: 12px 16px !important;
        border-bottom: 1px solid var(--rp-border) !important;
        white-space: nowrap !important;
    }

    #sapo-reports-page .rp-table tbody td {
        padding: 12px 16px !important;
        border-bottom: 1px solid #f1f5f9 !important;
        vertical-align: middle !important;
        color: var(--rp-text-secondary) !important;
        background: var(--rp-white) !important;
        white-space: nowrap !important;
    }

    #sapo-reports-page .rp-table tbody tr:last-child td {
        border-bottom: none !important;
    }

    #sapo-reports-page .rp-table tbody tr:hover td {
        background: #f9fafb !important;
    }

    #sapo-reports-page .rp-table td strong {
        font-weight: 600 !important;
        color: var(--rp-text) !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-table td small {
        display: block !important;
        margin-top: 2px !important;
        font-size: 12px !important;
        color: var(--rp-subtle) !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-table-state {
        text-align: center !important;
        padding: 40px 16px !important;
        color: var(--rp-subtle) !important;
        font-size: 13px !important;
        white-space: normal !important;
        background: var(--rp-white) !important;
    }

    /* ---------- Print ---------- */
    @media print {
        #sapo-reports-page .rp-filter-card,
        #sapo-reports-page .rp-header-actions,
        #sapo-reports-page .rp-tabs {
            display: none !important;
        }

        #sapo-reports-page .rp-table-container {
            max-height: none !important;
            overflow: visible !important;
        }
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 760px) {
        #sapo-reports-page .rp-header {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-reports-page .rp-header-actions {
            width: 100% !important;
        }

        #sapo-reports-page .rp-header-actions button {
            flex: 1 1 auto !important;
        }

        #sapo-reports-page .rp-filter-card {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-reports-page .rp-filter-card label,
        #sapo-reports-page .rp-filter-card select,
        #sapo-reports-page .rp-filter-card > button {
            width: 100% !important;
        }
    }
`;

export default function ReportsPage() {
    const { token } = useAuth();

    const [report, setReport] = useState<ReportOverviewData | null>(null);
    const [activeTab, setActiveTab] = useState<ReportTab>('overview');
    const [dateFrom, setDateFrom] = useState(monthStart());
    const [dateTo, setDateTo] = useState(currentDate());
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const loadReport = useCallback(
        async (): Promise<void> => {
            if (!token) {
                return;
            }

            setIsLoading(true);
            setErrorMessage('');

            try {
                const response = await getReportOverview(
                    token,
                    {
                        dateFrom,
                        dateTo,
                        paymentMethod,
                        paymentStatus,
                    },
                );

                setReport(response.data);
            } catch (error) {
                setErrorMessage(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to generate the report.',
                );
            } finally {
                setIsLoading(false);
            }
        },
        [token, dateFrom, dateTo, paymentMethod, paymentStatus],
    );

    useEffect(() => {
        void loadReport();
    }, [loadReport]);

    const chartMaximum = useMemo(
        () => {
            if (!report) {
                return 1;
            }

            return Math.max(
                1,
                ...report.daily_series.flatMap(
                    (point) => [
                        point.sales,
                        point.collections,
                        point.expenses,
                        point.returns,
                    ],
                ),
            );
        },
        [report],
    );

    return (
        <div id="sapo-reports-page">
            <style>
                {reportsPageStyles}
            </style>

            <section className="rp-header">
                <div>
                    <span className="rp-kicker">Business intelligence</span>
                    <h2>Reports</h2>
                    <p>Review sales, profit, expenses, dues, products and stock values.</p>
                </div>

                <div className="rp-header-actions">
                    <button
                        type="button"
                        className="rp-secondary-button"
                        disabled={!report}
                        onClick={() => { window.print(); }}
                    >
                        Print Report
                    </button>

                    <button
                        type="button"
                        className="rp-primary-button"
                        disabled={!report}
                        onClick={() => {
                            if (report) {
                                downloadCsv(report);
                            }
                        }}
                    >
                        Export CSV
                    </button>
                </div>
            </section>

            <section className="rp-filter-card">
                <label>
                    <span>From</span>
                    <input
                        type="date"
                        value={dateFrom}
                        max={dateTo}
                        onChange={(event) => { setDateFrom(event.target.value); }}
                    />
                </label>

                <label>
                    <span>To</span>
                    <input
                        type="date"
                        value={dateTo}
                        min={dateFrom}
                        onChange={(event) => { setDateTo(event.target.value); }}
                    />
                </label>

                <label>
                    <span>Payment Method</span>
                    <select
                        value={paymentMethod}
                        onChange={(event) => { setPaymentMethod(event.target.value); }}
                    >
                        <option value="">All Methods</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                    </select>
                </label>

                <label>
                    <span>Payment Status</span>
                    <select
                        value={paymentStatus}
                        onChange={(event) => { setPaymentStatus(event.target.value); }}
                    >
                        <option value="">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="due">Due</option>
                    </select>
                </label>

                <button
                    type="button"
                    className="rp-primary-button"
                    disabled={isLoading}
                    onClick={() => { void loadReport(); }}
                >
                    {isLoading ? 'Generating...' : 'Generate Report'}
                </button>
            </section>

            {errorMessage && (
                <div className="rp-form-alert">{errorMessage}</div>
            )}

            <nav className="rp-tabs">
                <button
                    type="button"
                    className={activeTab === 'overview' ? 'rp-tab-active' : ''}
                    onClick={() => { setActiveTab('overview'); }}
                >
                    Overview
                </button>

                <button
                    type="button"
                    className={activeTab === 'products' ? 'rp-tab-active' : ''}
                    onClick={() => { setActiveTab('products'); }}
                >
                    Products
                </button>

                <button
                    type="button"
                    className={activeTab === 'expenses' ? 'rp-tab-active' : ''}
                    onClick={() => { setActiveTab('expenses'); }}
                >
                    Expenses
                </button>

                <button
                    type="button"
                    className={activeTab === 'dues' ? 'rp-tab-active' : ''}
                    onClick={() => { setActiveTab('dues'); }}
                >
                    Customer Dues
                </button>

                <button
                    type="button"
                    className={activeTab === 'inventory' ? 'rp-tab-active' : ''}
                    onClick={() => { setActiveTab('inventory'); }}
                >
                    Inventory
                </button>
            </nav>

            {isLoading && !report ? (
                <div className="rp-page-state">
                    <div className="rp-spinner" />
                    <span>Generating report...</span>
                </div>
            ) : report ? (
                <>
                    {activeTab === 'overview' && (
                        <>
                            <section className="rp-summary-grid">
                                <article>
                                    <span>Sales Total</span>
                                    <strong>{currencyFormatter.format(report.summary.sales_total)}</strong>
                                    <small>{report.summary.sales_count} transactions</small>
                                </article>

                                <article>
                                    <span>Collected</span>
                                    <strong>{currencyFormatter.format(report.summary.collected_amount)}</strong>
                                </article>

                                <article>
                                    <span>Due Amount</span>
                                    <strong className="rp-warning-value">
                                        {currencyFormatter.format(report.summary.due_amount)}
                                    </strong>
                                </article>

                                <article>
                                    <span>Gross Profit</span>
                                    <strong>{currencyFormatter.format(report.summary.gross_profit)}</strong>
                                </article>

                                <article>
                                    <span>Returns</span>
                                    <strong className="rp-negative-value">
                                        {currencyFormatter.format(report.summary.return_refund)}
                                    </strong>
                                    <small>{report.summary.return_count} returns</small>
                                </article>

                                <article>
                                    <span>Expenses</span>
                                    <strong className="rp-negative-value">
                                        {currencyFormatter.format(report.summary.expense_total)}
                                    </strong>
                                </article>

                                <article>
                                    <span>Final Net Profit</span>
                                    <strong
                                        className={
                                            report.summary.final_net_profit >= 0
                                                ? 'rp-positive-value'
                                                : 'rp-negative-value'
                                        }
                                    >
                                        {currencyFormatter.format(report.summary.final_net_profit)}
                                    </strong>
                                    <small>After returns and expenses</small>
                                </article>
                            </section>

                            <section className="rp-two-column">
                                <article className="rp-card">
                                    <header className="rp-card-header">
                                        <div>
                                            <span className="rp-kicker">
                                                {report.period.date_from} to {report.period.date_to}
                                            </span>
                                            <h3>Daily Financial Activity</h3>
                                        </div>
                                    </header>

                                    <div className="rp-legend">
                                        <span><i className="rp-legend-sales" />Sales</span>
                                        <span><i className="rp-legend-collections" />Collections</span>
                                        <span><i className="rp-legend-expenses" />Expenses</span>
                                        <span><i className="rp-legend-returns" />Returns</span>
                                    </div>

                                    <div className="rp-bar-chart">
                                        {report.daily_series.map((point) => (
                                            <div className="rp-chart-row" key={point.date}>
                                                <span>{formatDate(point.date)}</span>

                                                <div>
                                                    <div
                                                        className="rp-bar rp-sales-bar"
                                                        style={{ width: `${(point.sales / chartMaximum) * 100}%` }}
                                                    />
                                                    <div
                                                        className="rp-bar rp-collections-bar"
                                                        style={{ width: `${(point.collections / chartMaximum) * 100}%` }}
                                                    />
                                                    <div
                                                        className="rp-bar rp-expenses-bar"
                                                        style={{ width: `${(point.expenses / chartMaximum) * 100}%` }}
                                                    />
                                                    <div
                                                        className="rp-bar rp-returns-bar"
                                                        style={{ width: `${(point.returns / chartMaximum) * 100}%` }}
                                                    />
                                                </div>

                                                <strong>{currencyFormatter.format(point.sales)}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </article>

                                <article className="rp-card">
                                    <header className="rp-card-header">
                                        <div>
                                            <span className="rp-kicker">Collections</span>
                                            <h3>Payment Methods</h3>
                                        </div>
                                    </header>

                                    <div className="rp-payment-list">
                                        {report.payment_breakdown.length === 0 ? (
                                            <div className="rp-table-state">No payments found.</div>
                                        ) : (
                                            report.payment_breakdown.map((payment) => (
                                                <article key={payment.payment_method}>
                                                    <div>
                                                        <strong>{paymentMethodName(payment.payment_method)}</strong>
                                                        <span>{payment.transactions} transactions</span>
                                                    </div>
                                                    <strong>{currencyFormatter.format(payment.total)}</strong>
                                                </article>
                                            ))
                                        )}
                                    </div>
                                </article>
                            </section>
                        </>
                    )}

                    {activeTab === 'products' && (
                        <section className="rp-card">
                            <header className="rp-card-header">
                                <div>
                                    <span className="rp-kicker">Sales performance</span>
                                    <h3>Product Report</h3>
                                </div>
                            </header>

                            <div className="rp-table-container">
                                <table className="rp-table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Category</th>
                                            <th>Quantity</th>
                                            <th>Sales</th>
                                            <th>Cost</th>
                                            <th>Gross Profit</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {report.product_performance.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="rp-table-state">
                                                    No product sales found.
                                                </td>
                                            </tr>
                                        ) : (
                                            report.product_performance.map((product) => (
                                                <tr key={product.id}>
                                                    <td><strong>{product.name}</strong></td>
                                                    <td>{product.category.name}</td>
                                                    <td>{product.quantity_sold} {product.unit}</td>
                                                    <td>{currencyFormatter.format(product.sales_total)}</td>
                                                    <td>{currencyFormatter.format(product.cost_total)}</td>
                                                    <td>
                                                        <strong
                                                            className={
                                                                product.gross_profit >= 0
                                                                    ? 'rp-positive-value'
                                                                    : 'rp-negative-value'
                                                            }
                                                        >
                                                            {currencyFormatter.format(product.gross_profit)}
                                                        </strong>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {activeTab === 'expenses' && (
                        <section className="rp-card">
                            <header className="rp-card-header">
                                <div>
                                    <span className="rp-kicker">Business costs</span>
                                    <h3>Expense Category Report</h3>
                                </div>
                            </header>

                            <div className="rp-table-container">
                                <table className="rp-table">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Records</th>
                                            <th>Total Amount</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {report.expense_categories.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="rp-table-state">
                                                    No expenses found.
                                                </td>
                                            </tr>
                                        ) : (
                                            report.expense_categories.map((category) => (
                                                <tr key={category.id}>
                                                    <td><strong>{category.name}</strong></td>
                                                    <td>{category.expense_count}</td>
                                                    <td>
                                                        <strong className="rp-negative-value">
                                                            {currencyFormatter.format(category.total_amount)}
                                                        </strong>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {activeTab === 'dues' && (
                        <section className="rp-card">
                            <header className="rp-card-header">
                                <div>
                                    <span className="rp-kicker">Accounts receivable</span>
                                    <h3>Customer Due Report</h3>
                                </div>
                            </header>

                            <div className="rp-table-container">
                                <table className="rp-table">
                                    <thead>
                                        <tr>
                                            <th>Customer</th>
                                            <th>Mobile</th>
                                            <th>Due Sales</th>
                                            <th>Sales Total</th>
                                            <th>Paid</th>
                                            <th>Due</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {report.customer_dues.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="rp-table-state">
                                                    No customer dues found.
                                                </td>
                                            </tr>
                                        ) : (
                                            report.customer_dues.map((customer) => (
                                                <tr key={customer.id}>
                                                    <td>
                                                        <strong>{customer.name}</strong>
                                                        <small>{customer.customer_code}</small>
                                                    </td>
                                                    <td>{customer.mobile ?? '—'}</td>
                                                    <td>{customer.due_sales}</td>
                                                    <td>{currencyFormatter.format(customer.sales_total)}</td>
                                                    <td>{currencyFormatter.format(customer.paid_amount)}</td>
                                                    <td>
                                                        <strong className="rp-warning-value">
                                                            {currencyFormatter.format(customer.due_amount)}
                                                        </strong>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {activeTab === 'inventory' && (
                        <>
                            <section className="rp-summary-grid">
                                <article>
                                    <span>Stock Quantity</span>
                                    <strong>{report.inventory.summary.quantity}</strong>
                                </article>

                                <article>
                                    <span>Purchase Value</span>
                                    <strong>{currencyFormatter.format(report.inventory.summary.purchase_value)}</strong>
                                </article>

                                <article>
                                    <span>Retail Value</span>
                                    <strong>{currencyFormatter.format(report.inventory.summary.retail_value)}</strong>
                                </article>

                                <article>
                                    <span>Expiring Batches</span>
                                    <strong className="rp-warning-value">
                                        {report.inventory.summary.expiring_batch_count}
                                    </strong>
                                </article>

                                <article>
                                    <span>Expired Batches</span>
                                    <strong className="rp-negative-value">
                                        {report.inventory.summary.expired_batch_count}
                                    </strong>
                                </article>
                            </section>

                            <section className="rp-card">
                                <header className="rp-card-header">
                                    <div>
                                        <span className="rp-kicker">Current stock</span>
                                        <h3>Inventory Value Report</h3>
                                    </div>
                                </header>

                                <div className="rp-table-container">
                                    <table className="rp-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Category</th>
                                                <th>Quantity</th>
                                                <th>Batches</th>
                                                <th>Purchase Value</th>
                                                <th>Retail Value</th>
                                                <th>Nearest Expiry</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {report.inventory.products.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="rp-table-state">
                                                        No available stock.
                                                    </td>
                                                </tr>
                                            ) : (
                                                report.inventory.products.map((product) => (
                                                    <tr key={product.id}>
                                                        <td><strong>{product.name}</strong></td>
                                                        <td>{product.category.name}</td>
                                                        <td>{product.quantity} {product.unit}</td>
                                                        <td>{product.batch_count}</td>
                                                        <td>{currencyFormatter.format(product.purchase_value)}</td>
                                                        <td>{currencyFormatter.format(product.retail_value)}</td>
                                                        <td>{formatDate(product.nearest_expiry)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                </>
            ) : null}
        </div>
    );
}