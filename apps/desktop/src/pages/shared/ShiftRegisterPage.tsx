import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import ShiftDetailsModal
    from '../../components/shifts/ShiftDetailsModal';

import {
    ApiError,
} from '../../lib/api';

import {
    closeCashierShift,
    createCashMovement,
    getCashierShift,
    getCashierShifts,
    getCurrentCashierShift,
    openCashierShift,
} from '../../services/cashierShiftService';

import type {
    CashierShift,
    CashierShiftSummary,
    CashMovementReason,
    CashMovementType,
} from '../../types/cashierShift';

import type {
    PosPaginationMeta,
} from '../../types/sale';

const currencyFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        },
    );

const emptySummary: CashierShiftSummary = {
    total_shifts: 0,
    open_shifts: 0,
    closed_shifts: 0,
    total_opening_cash: 0,
    total_expected_cash: 0,
    total_difference: 0,
};

const emptyPagination: PosPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: null,
    to: null,
};

function formatDateTime(
    value: string | null,
): string {
    if (!value) {
        return 'Open';
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
    ).format(
        new Date(value),
    );
}

function parseMovementType(
    value: string,
): CashMovementType {
    return value === 'cash_out'
        ? 'cash_out'
        : 'cash_in';
}

function parseMovementReason(
    value: string,
): CashMovementReason {
    switch (value) {
        case 'cash_float':
            return 'cash_float';

        case 'cash_drop':
            return 'cash_drop';

        case 'petty_cash':
            return 'petty_cash';

        case 'expense':
            return 'expense';

        case 'deposit':
            return 'deposit';

        case 'withdrawal':
            return 'withdrawal';

        default:
            return 'other';
    }
}

const shiftRegisterStyles = `
    #sapo-shift-register-page,
    #sapo-shift-register-page *,
    #sapo-shift-register-page *::before,
    #sapo-shift-register-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-shift-register-page {
        --srg-green-800: #166534;
        --srg-green-700: #15803d;
        --srg-green-100: #dcfce7;
        --srg-green-50: #f0fdf4;
        --srg-red: #dc2626;
        --srg-red-light: #fef2f2;
        --srg-amber: #b45309;
        --srg-amber-light: #fffbeb;
        --srg-blue: #2563eb;
        --srg-blue-light: #eff6ff;
        --srg-text: #111827;
        --srg-text-secondary: #1f2937;
        --srg-muted: #6b7280;
        --srg-border: #e5e7eb;
        --srg-border-strong: #d1d5db;
        --srg-bg: #f9fafb;
        --srg-white: #ffffff;
        --srg-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        gap: 20px !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--srg-text-secondary) !important;
        font-family: var(--srg-font) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        background: transparent !important;
        isolation: isolate !important;
    }

    #sapo-shift-register-page h2,
    #sapo-shift-register-page h3,
    #sapo-shift-register-page p,
    #sapo-shift-register-page span,
    #sapo-shift-register-page strong,
    #sapo-shift-register-page small,
    #sapo-shift-register-page label,
    #sapo-shift-register-page button,
    #sapo-shift-register-page input,
    #sapo-shift-register-page select,
    #sapo-shift-register-page textarea,
    #sapo-shift-register-page table,
    #sapo-shift-register-page th,
    #sapo-shift-register-page td {
        font-family: var(--srg-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-shift-register-page h2,
    #sapo-shift-register-page h3,
    #sapo-shift-register-page p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Header ---------- */
    #sapo-shift-register-page .srg-header {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 16px !important;
        padding: 20px 24px !important;
        background: var(--srg-white) !important;
        border: 1px solid var(--srg-border) !important;
        border-radius: 10px !important;
    }

    #sapo-shift-register-page .srg-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--srg-green-700) !important;
        margin-bottom: 6px !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-header h2 {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--srg-text) !important;
        margin-bottom: 4px !important;
    }

    #sapo-shift-register-page .srg-header p {
        font-size: 13.5px !important;
        color: var(--srg-muted) !important;
    }

    /* ---------- Buttons ---------- */
    #sapo-shift-register-page .srg-primary-button,
    #sapo-shift-register-page .srg-secondary-button {
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

    #sapo-shift-register-page .srg-primary-button {
        color: #ffffff !important;
        background: var(--srg-green-700) !important;
        border: 1px solid var(--srg-green-700) !important;
        width: 100% !important;
    }

    #sapo-shift-register-page .srg-primary-button:hover:not(:disabled) {
        background: var(--srg-green-800) !important;
    }

    #sapo-shift-register-page .srg-secondary-button {
        color: #374151 !important;
        background: var(--srg-white) !important;
        border: 1px solid var(--srg-border-strong) !important;
    }

    #sapo-shift-register-page .srg-secondary-button:hover:not(:disabled) {
        background: var(--srg-bg) !important;
        border-color: #9ca3af !important;
    }

    #sapo-shift-register-page .srg-close-shift-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        height: 40px !important;
        padding: 0 16px !important;
        font-size: 13.5px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        background: var(--srg-red) !important;
        border: 1px solid var(--srg-red) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease !important;
    }

    #sapo-shift-register-page .srg-close-shift-button:hover:not(:disabled) {
        background: #b91c1c !important;
    }

    #sapo-shift-register-page button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Alerts ---------- */
    #sapo-shift-register-page .srg-success-alert {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 12px 16px !important;
        border-radius: 8px !important;
        background: var(--srg-green-50) !important;
        border: 1px solid var(--srg-green-100) !important;
    }

    #sapo-shift-register-page .srg-success-alert span:first-child {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 20px !important;
        height: 20px !important;
        flex-shrink: 0 !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        background: var(--srg-green-700) !important;
        border-radius: 999px !important;
    }

    #sapo-shift-register-page .srg-success-alert p {
        flex: 1 !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        color: #15803d !important;
    }

    #sapo-shift-register-page .srg-success-alert button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 24px !important;
        height: 24px !important;
        flex-shrink: 0 !important;
        font-size: 16px !important;
        line-height: 1 !important;
        color: #15803d !important;
        background: transparent !important;
        border: none !important;
        border-radius: 6px !important;
        cursor: pointer !important;
    }

    #sapo-shift-register-page .srg-success-alert button:hover {
        background: rgba(21, 128, 61, 0.1) !important;
    }

    #sapo-shift-register-page .srg-form-alert {
        padding: 12px 16px !important;
        border-radius: 8px !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        background: var(--srg-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Content card ---------- */
    #sapo-shift-register-page .srg-content-card {
        background: var(--srg-white) !important;
        border: 1px solid var(--srg-border) !important;
        border-radius: 10px !important;
        padding: 20px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
    }

    /* ---------- Open shift panel ---------- */
    #sapo-shift-register-page .srg-open-panel header {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        margin-bottom: 4px !important;
    }

    #sapo-shift-register-page .srg-open-panel h3 {
        font-size: 17px !important;
        font-weight: 700 !important;
        color: var(--srg-text) !important;
    }

    #sapo-shift-register-page .srg-open-panel > header > p {
        font-size: 13px !important;
        color: var(--srg-muted) !important;
    }

    #sapo-shift-register-page .srg-open-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 14px !important;
        max-width: 420px !important;
    }

    /* ---------- Current shift banner ---------- */
    #sapo-shift-register-page .srg-current-banner {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 16px !important;
        padding: 18px 22px !important;
        background: var(--srg-green-50) !important;
        border: 1px solid var(--srg-green-100) !important;
        border-radius: 10px !important;
    }

    #sapo-shift-register-page .srg-current-banner > div {
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;
    }

    #sapo-shift-register-page .srg-current-banner span:first-child {
        font-size: 12px !important;
        font-weight: 600 !important;
        color: var(--srg-green-700) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-current-banner strong {
        font-size: 18px !important;
        font-weight: 700 !important;
        color: var(--srg-text) !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-current-banner small {
        font-size: 12.5px !important;
        color: var(--srg-muted) !important;
        background: transparent !important;
    }

    /* ---------- Status badges ---------- */
    #sapo-shift-register-page .srg-status-open,
    #sapo-shift-register-page .srg-status-closed {
        display: inline-flex !important;
        align-items: center !important;
        padding: 5px 12px !important;
        border-radius: 999px !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        white-space: nowrap !important;
    }

    #sapo-shift-register-page .srg-status-open {
        background: var(--srg-green-100) !important;
        color: var(--srg-green-800) !important;
    }

    #sapo-shift-register-page .srg-status-closed {
        background: #f1f5f9 !important;
        color: #475569 !important;
    }

    /* ---------- Current shift summary grid ---------- */
    #sapo-shift-register-page .srg-current-summary {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
        gap: 14px !important;
    }

    #sapo-shift-register-page .srg-current-summary article {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        padding: 14px 16px !important;
        background: var(--srg-white) !important;
        border: 1px solid var(--srg-border) !important;
        border-radius: 10px !important;
    }

    #sapo-shift-register-page .srg-current-summary span {
        font-size: 11.5px !important;
        font-weight: 600 !important;
        color: var(--srg-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-current-summary strong {
        font-size: 17px !important;
        font-weight: 700 !important;
        color: var(--srg-text) !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-current-summary small {
        font-size: 11.5px !important;
        color: #9ca3af !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-positive {
        color: var(--srg-green-700) !important;
    }

    #sapo-shift-register-page .srg-negative {
        color: var(--srg-red) !important;
    }

    /* ---------- Action grid (movement + close) ---------- */
    #sapo-shift-register-page .srg-action-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)) !important;
        gap: 16px !important;
    }

    #sapo-shift-register-page .srg-card-heading {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        margin-bottom: 4px !important;
    }

    #sapo-shift-register-page .srg-card-heading h3 {
        font-size: 16px !important;
        font-weight: 700 !important;
        color: var(--srg-text) !important;
    }

    /* ---------- Forms (movement / close) ---------- */
    #sapo-shift-register-page .srg-movement-form {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 14px !important;
    }

    #sapo-shift-register-page .srg-close-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 14px !important;
    }

    #sapo-shift-register-page .srg-wide-field {
        grid-column: 1 / -1 !important;
    }

    #sapo-shift-register-page label.srg-field,
    #sapo-shift-register-page .srg-movement-form > label,
    #sapo-shift-register-page .srg-close-form > label,
    #sapo-shift-register-page .srg-open-form > label {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        min-width: 0 !important;
    }

    #sapo-shift-register-page .srg-movement-form > label > span,
    #sapo-shift-register-page .srg-close-form > label > span,
    #sapo-shift-register-page .srg-open-form > label > span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--srg-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-shift-register-page input,
    #sapo-shift-register-page select,
    #sapo-shift-register-page textarea {
        width: 100% !important;
        padding: 9px 12px !important;
        font-size: 13.5px !important;
        color: var(--srg-text-secondary) !important;
        background: var(--srg-white) !important;
        border: 1px solid var(--srg-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-shift-register-page textarea {
        resize: vertical !important;
        min-height: 60px !important;
        font-family: var(--srg-font) !important;
    }

    #sapo-shift-register-page select {
        cursor: pointer !important;
    }

    #sapo-shift-register-page input:focus,
    #sapo-shift-register-page select:focus,
    #sapo-shift-register-page textarea:focus {
        border-color: var(--srg-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-shift-register-page input:disabled,
    #sapo-shift-register-page select:disabled,
    #sapo-shift-register-page textarea:disabled {
        background: var(--srg-bg) !important;
        color: var(--srg-muted) !important;
        cursor: not-allowed !important;
    }

    #sapo-shift-register-page .srg-expected-box {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 12px 16px !important;
        background: var(--srg-bg) !important;
        border: 1px solid var(--srg-border) !important;
        border-radius: 8px !important;
    }

    #sapo-shift-register-page .srg-expected-box span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--srg-muted) !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-expected-box strong {
        font-size: 15px !important;
        font-weight: 700 !important;
        color: var(--srg-text) !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-difference-preview {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 12px 16px !important;
        background: var(--srg-bg) !important;
        border: 1px dashed var(--srg-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-shift-register-page .srg-difference-preview span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--srg-muted) !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-difference-preview strong {
        font-size: 16px !important;
        font-weight: 700 !important;
        background: transparent !important;
    }

    /* ---------- History summary grid ---------- */
    #sapo-shift-register-page .srg-history-summary {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
        gap: 16px !important;
    }

    #sapo-shift-register-page .srg-history-summary article {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        padding: 18px 20px !important;
        background: var(--srg-white) !important;
        border: 1px solid var(--srg-border) !important;
        border-radius: 10px !important;
    }

    #sapo-shift-register-page .srg-history-summary span {
        font-size: 12px !important;
        font-weight: 500 !important;
        color: var(--srg-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-history-summary strong {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--srg-text) !important;
        background: transparent !important;
    }

    /* ---------- History toolbar ---------- */
    #sapo-shift-register-page .srg-history-toolbar {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-end !important;
        gap: 10px !important;
    }

    #sapo-shift-register-page .srg-history-toolbar input[type="search"] {
        flex: 1 1 220px !important;
        min-width: 200px !important;
    }

    #sapo-shift-register-page .srg-history-toolbar select {
        min-width: 140px !important;
        width: auto !important;
    }

    #sapo-shift-register-page .srg-history-toolbar label {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
    }

    #sapo-shift-register-page .srg-history-toolbar label span {
        font-size: 11.5px !important;
        font-weight: 600 !important;
        color: var(--srg-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-history-toolbar label input {
        min-width: 140px !important;
        width: auto !important;
    }

    /* ---------- Scrollable table ---------- */
    #sapo-shift-register-page .srg-table-container {
        max-height: 560px !important;
        overflow-y: auto !important;
        overflow-x: auto !important;
        border: 1px solid var(--srg-border) !important;
        border-radius: 8px !important;
        background: var(--srg-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--srg-border-strong) transparent !important;
    }

    #sapo-shift-register-page .srg-table-container::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
    }

    #sapo-shift-register-page .srg-table-container::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-table-container::-webkit-scrollbar-thumb {
        background: var(--srg-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-shift-register-page .srg-table {
        width: 100% !important;
        min-width: 1280px !important;
        border-collapse: collapse !important;
        font-size: 13px !important;
        background: var(--srg-white) !important;
    }

    #sapo-shift-register-page .srg-table thead {
        position: sticky !important;
        top: 0 !important;
        z-index: 1 !important;
    }

    #sapo-shift-register-page .srg-table thead th {
        background: #f9fafb !important;
        color: var(--srg-muted) !important;
        font-size: 11.5px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        text-align: left !important;
        padding: 12px 14px !important;
        border-bottom: 1px solid var(--srg-border) !important;
        white-space: nowrap !important;
    }

    #sapo-shift-register-page .srg-table tbody td {
        padding: 13px 14px !important;
        border-bottom: 1px solid #f1f5f9 !important;
        vertical-align: middle !important;
        color: var(--srg-text-secondary) !important;
        background: var(--srg-white) !important;
        white-space: nowrap !important;
    }

    #sapo-shift-register-page .srg-table tbody tr:last-child td {
        border-bottom: none !important;
    }

    #sapo-shift-register-page .srg-table tbody tr:hover td {
        background: #f9fafb !important;
    }

    #sapo-shift-register-page .srg-table td strong {
        font-weight: 600 !important;
        color: var(--srg-text) !important;
        display: block !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-table td small {
        display: block !important;
        margin-top: 2px !important;
        font-size: 11.5px !important;
        color: #9ca3af !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-table-state {
        text-align: center !important;
        padding: 40px 16px !important;
        color: #9ca3af !important;
        font-size: 13.5px !important;
        background: var(--srg-white) !important;
        white-space: normal !important;
    }

    #sapo-shift-register-page .srg-view-button {
        padding: 6px 14px !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--srg-blue) !important;
        background: var(--srg-blue-light) !important;
        border: 1px solid #bfdbfe !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-shift-register-page .srg-view-button:hover {
        background: var(--srg-blue) !important;
        color: #ffffff !important;
        border-color: var(--srg-blue) !important;
    }

    /* ---------- Pagination ---------- */
    #sapo-shift-register-page .srg-pagination {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding-top: 4px !important;
    }

    #sapo-shift-register-page .srg-pagination p {
        font-size: 13px !important;
        color: var(--srg-muted) !important;
        font-weight: 500 !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-pagination p strong {
        color: var(--srg-text) !important;
        font-weight: 600 !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-pagination-controls {
        display: flex !important;
        align-items: center !important;
        gap: 16px !important;
    }

    #sapo-shift-register-page .srg-pagination-controls span {
        font-size: 13px !important;
        color: var(--srg-muted) !important;
        font-weight: 500 !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-pagination-controls span strong {
        color: var(--srg-text) !important;
        font-weight: 600 !important;
        background: transparent !important;
    }

    #sapo-shift-register-page .srg-pagination-button {
        padding: 7px 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--srg-white) !important;
        border: 1px solid var(--srg-border-strong) !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-shift-register-page .srg-pagination-button:hover:not(:disabled) {
        background: #f9fafb !important;
        border-color: #9ca3af !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 760px) {
        #sapo-shift-register-page .srg-header {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-shift-register-page .srg-current-banner {
            flex-direction: column !important;
            align-items: flex-start !important;
        }

        #sapo-shift-register-page .srg-movement-form {
            grid-template-columns: 1fr !important;
        }

        #sapo-shift-register-page .srg-wide-field {
            grid-column: 1 !important;
        }

        #sapo-shift-register-page .srg-history-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-shift-register-page .srg-history-toolbar select,
        #sapo-shift-register-page .srg-history-toolbar label,
        #sapo-shift-register-page .srg-history-toolbar label input {
            width: 100% !important;
        }

        #sapo-shift-register-page .srg-pagination {
            flex-direction: column !important;
            align-items: stretch !important;
        }
    }
`;

export default function ShiftRegisterPage() {
    const {
        token,
        user,
    } = useAuth();

    const isAdmin =
        user?.role === 'admin';

    const [
        currentShift,
        setCurrentShift,
    ] = useState<CashierShift | null>(null);

    const [
        shifts,
        setShifts,
    ] = useState<CashierShift[]>([]);

    const [
        selectedShift,
        setSelectedShift,
    ] = useState<CashierShift | null>(null);

    const [
        summary,
        setSummary,
    ] = useState<CashierShiftSummary>(emptySummary);

    const [
        pagination,
        setPagination,
    ] = useState<PosPaginationMeta>(emptyPagination);

    const [
        openingCash,
        setOpeningCash,
    ] = useState(0);

    const [
        openingNotes,
        setOpeningNotes,
    ] = useState('');

    const [
        actualCash,
        setActualCash,
    ] = useState(0);

    const [
        closingNotes,
        setClosingNotes,
    ] = useState('');

    const [
        movementType,
        setMovementType,
    ] = useState<CashMovementType>('cash_in');

    const [
        movementReason,
        setMovementReason,
    ] = useState<CashMovementReason>('cash_float');

    const [
        movementAmount,
        setMovementAmount,
    ] = useState(0);

    const [
        movementDescription,
        setMovementDescription,
    ] = useState('');

    const [
        movementReference,
        setMovementReference,
    ] = useState('');

    const [
        searchInput,
        setSearchInput,
    ] = useState('');

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        status,
        setStatus,
    ] = useState('all');

    const [
        dateFrom,
        setDateFrom,
    ] = useState('');

    const [
        dateTo,
        setDateTo,
    ] = useState('');

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        perPage,
        setPerPage,
    ] = useState(20);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        formError,
        setFormError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const loadCurrentShift =
        useCallback(
            async (): Promise<void> => {
                if (
                    !token
                    || isAdmin
                ) {
                    setCurrentShift(null);

                    return;
                }

                try {
                    const response =
                        await getCurrentCashierShift(
                            token,
                        );

                    setCurrentShift(
                        response.data,
                    );

                    if (response.data) {
                        setActualCash(
                            response
                                .data
                                .expected_cash,
                        );
                    }
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load the current shift.',
                    );
                }
            },
            [
                token,
                isAdmin,
            ],
        );

    const loadShiftHistory =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getCashierShifts(
                            token,
                            {
                                search,
                                status,
                                dateFrom,
                                dateTo,
                                page,
                                perPage,
                            },
                        );

                    setShifts(
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
                            : 'Unable to load cashier shifts.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [
                token,
                search,
                status,
                dateFrom,
                dateTo,
                page,
                perPage,
            ],
        );

    useEffect(() => {
        void Promise.all([
            loadCurrentShift(),
            loadShiftHistory(),
        ]);
    }, [
        loadCurrentShift,
        loadShiftHistory,
    ]);

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

    const handleOpenShift =
        async (): Promise<void> => {
            if (!token) {
                return;
            }

            if (
                !Number.isFinite(
                    openingCash,
                )
                || openingCash < 0
            ) {
                setFormError(
                    'Enter a valid opening cash amount.',
                );

                return;
            }

            setIsSubmitting(true);
            setFormError('');
            setSuccessMessage('');

            try {
                const response =
                    await openCashierShift(
                        token,
                        {
                            opening_cash:
                                openingCash,

                            opening_notes:
                                openingNotes,
                        },
                    );

                setCurrentShift(
                    response.data,
                );

                setSuccessMessage(
                    response.message
                    ?? 'Cashier shift opened successfully.',
                );

                setOpeningCash(0);
                setOpeningNotes('');

                if (response.data) {
                    setActualCash(
                        response
                            .data
                            .expected_cash,
                    );
                }

                await loadShiftHistory();
            } catch (error) {
                setFormError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to open the cashier shift.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const handleRecordMovement =
        async (): Promise<void> => {
            if (
                !token
                || !currentShift
            ) {
                return;
            }

            if (
                !Number.isFinite(
                    movementAmount,
                )
                || movementAmount <= 0
            ) {
                setFormError(
                    'Cash movement amount must be greater than zero.',
                );

                return;
            }

            if (
                !movementDescription
                    .trim()
            ) {
                setFormError(
                    'Enter a description for the cash movement.',
                );

                return;
            }

            setIsSubmitting(true);
            setFormError('');
            setSuccessMessage('');

            try {
                const response =
                    await createCashMovement(
                        token,
                        currentShift.id,
                        {
                            movement_type:
                                movementType,

                            reason:
                                movementReason,

                            amount:
                                movementAmount,

                            description:
                                movementDescription,

                            reference_number:
                                movementReference,
                        },
                    );

                setCurrentShift(
                    response
                        .data
                        .shift,
                );

                setActualCash(
                    response
                        .data
                        .shift
                        .expected_cash,
                );

                setSuccessMessage(
                    response.message,
                );

                setMovementAmount(0);
                setMovementDescription('');
                setMovementReference('');

                await loadShiftHistory();
            } catch (error) {
                setFormError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to record the cash movement.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const handleCloseShift =
        async (): Promise<void> => {
            if (
                !token
                || !currentShift
            ) {
                return;
            }

            if (
                !Number.isFinite(
                    actualCash,
                )
                || actualCash < 0
            ) {
                setFormError(
                    'Enter a valid actual cash amount.',
                );

                return;
            }

            const confirmed =
                window.confirm(
                    'Close the current cashier shift? You will need to open a new shift before completing more transactions.',
                );

            if (!confirmed) {
                return;
            }

            setIsSubmitting(true);
            setFormError('');
            setSuccessMessage('');

            try {
                const response =
                    await closeCashierShift(
                        token,
                        currentShift.id,
                        {
                            actual_cash:
                                actualCash,

                            closing_notes:
                                closingNotes,
                        },
                    );

                setCurrentShift(null);

                setSuccessMessage(
                    response.message
                    ?? 'Cashier shift closed successfully.',
                );

                setActualCash(0);
                setClosingNotes('');

                await loadShiftHistory();
            } catch (error) {
                setFormError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to close the cashier shift.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const openShiftDetails =
        async (
            shiftId: number,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setPageError('');

            try {
                const response =
                    await getCashierShift(
                        token,
                        shiftId,
                    );

                setSelectedShift(
                    response.data,
                );
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to load shift details.',
                );
            }
        };

    return (
        <div id="sapo-shift-register-page">
            <style>
                {shiftRegisterStyles}
            </style>

            <section className="srg-header">
                <div>
                    <span className="srg-kicker">
                        Cash register control
                    </span>

                    <h2>
                        {isAdmin
                            ? 'Cashier Shifts'
                            : 'My Cash Register'}
                    </h2>

                    <p>
                        {isAdmin
                            ? 'Review cashier shifts, closing balances and cash differences.'
                            : 'Open your shift, manage drawer movements and close the register.'}
                    </p>
                </div>

                <button
                    type="button"
                    className="srg-secondary-button"
                    disabled={isLoading}
                    onClick={() => {
                        void Promise.all([
                            loadCurrentShift(),
                            loadShiftHistory(),
                        ]);
                    }}
                >
                    Refresh
                </button>
            </section>

            {successMessage && (
                <div
                    className="srg-success-alert"
                    role="status"
                >
                    <span>✓</span>

                    <p>
                        {successMessage}
                    </p>

                    <button
                        type="button"
                        aria-label="Dismiss success message"
                        onClick={() => {
                            setSuccessMessage('');
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            {(pageError
                || formError) && (
                    <div
                        className="srg-form-alert"
                        role="alert"
                    >
                        {formError
                            || pageError}
                    </div>
                )}

            {!isAdmin
                && !currentShift && (
                    <section className="srg-content-card srg-open-panel">
                        <header>
                            <span className="srg-kicker">
                                Start work
                            </span>

                            <h3>
                                Open Cashier Shift
                            </h3>

                            <p>
                                Count the drawer and
                                enter the opening cash.
                            </p>
                        </header>

                        <div className="srg-open-form">
                            <label>
                                <span>
                                    Opening Cash
                                </span>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={openingCash}
                                    disabled={isSubmitting}
                                    onChange={(event) => {
                                        setOpeningCash(
                                            Number(
                                                event
                                                    .target
                                                    .value,
                                            ),
                                        );

                                        setFormError('');
                                    }}
                                />
                            </label>

                            <label>
                                <span>
                                    Opening Notes
                                </span>

                                <textarea
                                    rows={2}
                                    value={openingNotes}
                                    disabled={isSubmitting}
                                    onChange={(event) => {
                                        setOpeningNotes(
                                            event
                                                .target
                                                .value,
                                        );
                                    }}
                                />
                            </label>

                            <button
                                type="button"
                                className="srg-primary-button"
                                disabled={isSubmitting}
                                onClick={() => {
                                    void handleOpenShift();
                                }}
                            >
                                {isSubmitting
                                    ? 'Opening...'
                                    : 'Open Shift'}
                            </button>
                        </div>
                    </section>
                )}

            {!isAdmin
                && currentShift && (
                    <>
                        <section className="srg-current-banner">
                            <div>
                                <span>
                                    Current Shift
                                </span>

                                <strong>
                                    {
                                        currentShift
                                            .shift_number
                                    }
                                </strong>

                                <small>
                                    Opened{' '}

                                    {formatDateTime(
                                        currentShift
                                            .opened_at,
                                    )}
                                </small>
                            </div>

                            <span className="srg-status-open">
                                Open
                            </span>
                        </section>

                        <section className="srg-current-summary">
                            <article>
                                <span>
                                    Opening Cash
                                </span>

                                <strong>
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .opening_cash,
                                        )}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Cash Collected
                                </span>

                                <strong>
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .totals
                                                .cash_collections,
                                        )}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Cash Refunds
                                </span>

                                <strong className="srg-negative">
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .totals
                                                .cash_refunds,
                                        )}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Cash In
                                </span>

                                <strong className="srg-positive">
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .totals
                                                .cash_in,
                                        )}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Cash Out
                                </span>

                                <strong className="srg-negative">
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .totals
                                                .cash_out,
                                        )}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Expected Cash
                                </span>

                                <strong>
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .expected_cash,
                                        )}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Sales
                                </span>

                                <strong>
                                    {
                                        currentShift
                                            .totals
                                            .sales_count
                                    }
                                </strong>

                                <small>
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .totals
                                                .sales_total,
                                        )}
                                </small>
                            </article>

                            <article>
                                <span>
                                    Due Created
                                </span>

                                <strong>
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .totals
                                                .due_created,
                                        )}
                                </strong>
                            </article>
                        </section>

                        <section className="srg-action-grid">
                            <article className="srg-content-card">
                                <header className="srg-card-heading">
                                    <span className="srg-kicker">
                                        Drawer movement
                                    </span>

                                    <h3>
                                        Cash In / Cash Out
                                    </h3>
                                </header>

                                <div className="srg-movement-form">
                                    <label>
                                        <span>
                                            Type
                                        </span>

                                        <select
                                            value={
                                                movementType
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setMovementType(
                                                    parseMovementType(
                                                        event
                                                            .target
                                                            .value,
                                                    ),
                                                );
                                            }}
                                        >
                                            <option value="cash_in">
                                                Cash In
                                            </option>

                                            <option value="cash_out">
                                                Cash Out
                                            </option>
                                        </select>
                                    </label>

                                    <label>
                                        <span>
                                            Reason
                                        </span>

                                        <select
                                            value={
                                                movementReason
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setMovementReason(
                                                    parseMovementReason(
                                                        event
                                                            .target
                                                            .value,
                                                    ),
                                                );
                                            }}
                                        >
                                            <option value="cash_float">
                                                Additional Float
                                            </option>

                                            <option value="cash_drop">
                                                Cash Drop
                                            </option>

                                            <option value="petty_cash">
                                                Petty Cash
                                            </option>

                                            <option value="expense">
                                                Expense
                                            </option>

                                            <option value="deposit">
                                                Deposit
                                            </option>

                                            <option value="withdrawal">
                                                Withdrawal
                                            </option>

                                            <option value="other">
                                                Other
                                            </option>
                                        </select>
                                    </label>

                                    <label>
                                        <span>
                                            Amount
                                        </span>

                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={
                                                movementAmount
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setMovementAmount(
                                                    Number(
                                                        event
                                                            .target
                                                            .value,
                                                    ),
                                                );

                                                setFormError('');
                                            }}
                                        />
                                    </label>

                                    <label className="srg-wide-field">
                                        <span>
                                            Description
                                        </span>

                                        <input
                                            value={
                                                movementDescription
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setMovementDescription(
                                                    event
                                                        .target
                                                        .value,
                                                );
                                            }}
                                        />
                                    </label>

                                    <label className="srg-wide-field">
                                        <span>
                                            Reference Number
                                        </span>

                                        <input
                                            value={
                                                movementReference
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setMovementReference(
                                                    event
                                                        .target
                                                        .value,
                                                );
                                            }}
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        className="srg-secondary-button srg-wide-field"
                                        disabled={isSubmitting}
                                        onClick={() => {
                                            void handleRecordMovement();
                                        }}
                                    >
                                        Record Cash Movement
                                    </button>
                                </div>
                            </article>

                            <article className="srg-content-card">
                                <header className="srg-card-heading">
                                    <span className="srg-kicker">
                                        End work
                                    </span>

                                    <h3>
                                        Close Cash Register
                                    </h3>
                                </header>

                                <div className="srg-close-form">
                                    <div className="srg-expected-box">
                                        <span>
                                            Expected Cash
                                        </span>

                                        <strong>
                                            {currencyFormatter
                                                .format(
                                                    currentShift
                                                        .expected_cash,
                                                )}
                                        </strong>
                                    </div>

                                    <label>
                                        <span>
                                            Actual Counted Cash
                                        </span>

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={actualCash}
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setActualCash(
                                                    Number(
                                                        event
                                                            .target
                                                            .value,
                                                    ),
                                                );

                                                setFormError('');
                                            }}
                                        />
                                    </label>

                                    <div className="srg-difference-preview">
                                        <span>
                                            Difference
                                        </span>

                                        <strong
                                            className={
                                                actualCash
                                                    - currentShift
                                                        .expected_cash
                                                    >= 0
                                                    ? 'srg-positive'
                                                    : 'srg-negative'
                                            }
                                        >
                                            {currencyFormatter
                                                .format(
                                                    actualCash
                                                    - currentShift
                                                        .expected_cash,
                                                )}
                                        </strong>
                                    </div>

                                    <label>
                                        <span>
                                            Closing Notes
                                        </span>

                                        <textarea
                                            rows={3}
                                            value={
                                                closingNotes
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setClosingNotes(
                                                    event
                                                        .target
                                                        .value,
                                                );
                                            }}
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        className="srg-close-shift-button"
                                        disabled={isSubmitting}
                                        onClick={() => {
                                            void handleCloseShift();
                                        }}
                                    >
                                        {isSubmitting
                                            ? 'Closing...'
                                            : 'Close Shift'}
                                    </button>
                                </div>
                            </article>
                        </section>
                    </>
                )}

            <section className="srg-history-summary">
                <article>
                    <span>
                        Total Shifts
                    </span>

                    <strong>
                        {summary.total_shifts}
                    </strong>
                </article>

                <article>
                    <span>
                        Open Shifts
                    </span>

                    <strong>
                        {summary.open_shifts}
                    </strong>
                </article>

                <article>
                    <span>
                        Closed Shifts
                    </span>

                    <strong>
                        {summary.closed_shifts}
                    </strong>
                </article>

                <article>
                    <span>
                        Total Difference
                    </span>

                    <strong
                        className={
                            summary
                                .total_difference
                                >= 0
                                ? 'srg-positive'
                                : 'srg-negative'
                        }
                    >
                        {currencyFormatter
                            .format(
                                summary
                                    .total_difference,
                            )}
                    </strong>
                </article>
            </section>

            <section className="srg-content-card">
                <div className="srg-history-toolbar">
                    <input
                        type="search"
                        value={searchInput}
                        placeholder="Search shift number or cashier..."
                        onChange={(event) => {
                            setSearchInput(
                                event.target.value,
                            );
                        }}
                    />

                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(
                                event.target.value,
                            );

                            setPage(1);
                        }}
                    >
                        <option value="all">
                            All Shifts
                        </option>

                        <option value="open">
                            Open
                        </option>

                        <option value="closed">
                            Closed
                        </option>
                    </select>

                    <label>
                        <span>
                            From
                        </span>

                        <input
                            type="date"
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

                    <label>
                        <span>
                            To
                        </span>

                        <input
                            type="date"
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

                    <select
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
                            10 rows
                        </option>

                        <option value={20}>
                            20 rows
                        </option>

                        <option value={50}>
                            50 rows
                        </option>
                    </select>
                </div>

                <div className="srg-table-container">
                    <table className="srg-table">
                        <thead>
                            <tr>
                                <th>Shift</th>
                                <th>Cashier</th>
                                <th>Opened</th>
                                <th>Closed</th>
                                <th>Sales</th>
                                <th>Cash Collected</th>
                                <th>Expected</th>
                                <th>Actual</th>
                                <th>Difference</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={11}
                                        className="srg-table-state"
                                    >
                                        Loading cashier shifts...
                                    </td>
                                </tr>
                            ) : shifts.length
                                === 0 ? (
                                <tr>
                                    <td
                                        colSpan={11}
                                        className="srg-table-state"
                                    >
                                        No cashier shifts found.
                                    </td>
                                </tr>
                            ) : (
                                shifts.map(
                                    (shift) => (
                                        <tr
                                            key={shift.id}
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        shift
                                                            .shift_number
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        shift
                                                            .cashier
                                                            .name
                                                    }
                                                </strong>

                                                <small>
                                                    @
                                                    {
                                                        shift
                                                            .cashier
                                                            .username
                                                    }
                                                </small>
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    shift
                                                        .opened_at,
                                                )}
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    shift
                                                        .closed_at,
                                                )}
                                            </td>

                                            <td>
                                                {
                                                    shift
                                                        .totals
                                                        .sales_count
                                                }
                                            </td>

                                            <td>
                                                {currencyFormatter
                                                    .format(
                                                        shift
                                                            .totals
                                                            .cash_collections,
                                                    )}
                                            </td>

                                            <td>
                                                {currencyFormatter
                                                    .format(
                                                        shift
                                                            .expected_cash,
                                                    )}
                                            </td>

                                            <td>
                                                {shift.actual_cash
                                                    !== null
                                                    ? currencyFormatter
                                                        .format(
                                                            shift
                                                                .actual_cash,
                                                        )
                                                    : '—'}
                                            </td>

                                            <td>
                                                <strong
                                                    className={
                                                        (
                                                            shift
                                                                .cash_difference
                                                            ?? 0
                                                        ) >= 0
                                                            ? 'srg-positive'
                                                            : 'srg-negative'
                                                    }
                                                >
                                                    {shift.cash_difference
                                                        !== null
                                                        ? currencyFormatter
                                                            .format(
                                                                shift
                                                                    .cash_difference,
                                                            )
                                                        : '—'}
                                                </strong>
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        shift.status
                                                            === 'open'
                                                            ? 'srg-status-open'
                                                            : 'srg-status-closed'
                                                    }
                                                >
                                                    {shift.status
                                                        === 'open'
                                                        ? 'Open'
                                                        : 'Closed'}
                                                </span>
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="srg-view-button"
                                                    onClick={() => {
                                                        void openShiftDetails(
                                                            shift.id,
                                                        );
                                                    }}
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ),
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination.total > 0 && (
                    <footer className="srg-pagination">
                        <p>
                            Showing{' '}

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

                            {' '}shifts
                        </p>

                        <div className="srg-pagination-controls">
                            <button
                                type="button"
                                className="srg-pagination-button"
                                disabled={page <= 1}
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

                            <span>
                                Page{' '}

                                <strong>
                                    {
                                        pagination
                                            .current_page
                                    }
                                </strong>

                                {' '}of{' '}

                                <strong>
                                    {
                                        pagination
                                            .last_page
                                    }
                                </strong>
                            </span>

                            <button
                                type="button"
                                className="srg-pagination-button"
                                disabled={
                                    page
                                    >= pagination
                                        .last_page
                                }
                                onClick={() => {
                                    setPage(
                                        (current) =>
                                            Math.min(
                                                pagination
                                                    .last_page,

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

            <ShiftDetailsModal
                shift={selectedShift}
                onClose={() => {
                    setSelectedShift(null);
                }}
            />
        </div>
    );
}