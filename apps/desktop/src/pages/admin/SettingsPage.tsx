import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    getBusinessSettings,
    updateBusinessSettings,
} from '../../services/businessSettingService';

import {
    defaultBusinessSetting,
} from '../../types/businessSetting';

import type {
    BusinessSetting,
    BusinessSettingInput,
    PrintDocumentType,
    ReceiptPaperSize,
} from '../../types/businessSetting';

type SettingsTab =
    | 'business'
    | 'printing';

const sampleItems = [
    {
        name: 'Organic Fertilizer 10 kg',
        sku: 'FERT-001',
        quantity: 2,
        unitPrice: 2850,
        total: 5700,
    },
    {
        name: 'Vegetable Seeds Packet',
        sku: 'SEED-014',
        quantity: 3,
        unitPrice: 450,
        total: 1350,
    },
];

function toInput(
    settings: BusinessSetting,
): BusinessSettingInput {
    const {
        id: _id,
        updated_at: _updatedAt,
        updated_by: _updatedBy,
        ...input
    } = settings;

    return input;
}

function parsePaperSize(
    value: string,
): ReceiptPaperSize {
    return value === '58mm'
        ? '58mm'
        : '80mm';
}

function parseDocumentType(
    value: string,
): PrintDocumentType {
    return value === 'invoice'
        ? 'invoice'
        : 'receipt';
}

function formatCurrency(
    value: number,
    currencyCode: string,
): string {
    try {
        return new Intl.NumberFormat(
            'en-GB',
            {
                style: 'currency',
                currency:
                    currencyCode,
                minimumFractionDigits: 2,
            },
        ).format(value);
    } catch {
        return new Intl.NumberFormat(
            'en-GB',
            {
                style: 'currency',
                currency: 'LKR',
                minimumFractionDigits: 2,
            },
        ).format(value);
    }
}

const settingsPageStyles = `
    #sapo-settings-page,
    #sapo-settings-page *,
    #sapo-settings-page *::before,
    #sapo-settings-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-settings-page {
        --stg-green-800: #166534;
        --stg-green-700: #15803d;
        --stg-green-100: #dcfce7;
        --stg-green-50: #f0fdf4;
        --stg-red: #dc2626;
        --stg-red-light: #fef2f2;
        --stg-blue: #2563eb;
        --stg-blue-light: #eff6ff;
        --stg-text: #111827;
        --stg-text-secondary: #1f2937;
        --stg-muted: #6b7280;
        --stg-border: #e5e7eb;
        --stg-border-strong: #d1d5db;
        --stg-bg: #f9fafb;
        --stg-white: #ffffff;
        --stg-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        gap: 20px !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--stg-text-secondary) !important;
        font-family: var(--stg-font) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        background: transparent !important;
        isolation: isolate !important;
    }

    #sapo-settings-page h1,
    #sapo-settings-page h2,
    #sapo-settings-page h3,
    #sapo-settings-page p,
    #sapo-settings-page span,
    #sapo-settings-page strong,
    #sapo-settings-page small,
    #sapo-settings-page label,
    #sapo-settings-page button,
    #sapo-settings-page input,
    #sapo-settings-page select,
    #sapo-settings-page textarea,
    #sapo-settings-page table,
    #sapo-settings-page th,
    #sapo-settings-page td {
        font-family: var(--stg-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-settings-page h1,
    #sapo-settings-page h2,
    #sapo-settings-page h3,
    #sapo-settings-page p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Loading state ---------- */
    #sapo-settings-page .stg-loading-panel {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        padding: 60px 24px !important;
        background: var(--stg-white) !important;
        border: 1px solid var(--stg-border) !important;
        border-radius: 10px !important;
    }

    #sapo-settings-page .stg-loading-panel span {
        font-size: 13.5px !important;
        color: var(--stg-muted) !important;
        background: transparent !important;
    }

    #sapo-settings-page .stg-spinner {
        width: 18px !important;
        height: 18px !important;
        border: 2px solid var(--stg-border-strong) !important;
        border-top-color: var(--stg-green-700) !important;
        border-radius: 999px !important;
        animation: stg-spin 0.7s linear infinite !important;
    }

    @keyframes stg-spin {
        to {
            transform: rotate(360deg);
        }
    }

    /* ---------- Header ---------- */
    #sapo-settings-page .stg-header {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 16px !important;
        padding: 20px 24px !important;
        background: var(--stg-white) !important;
        border: 1px solid var(--stg-border) !important;
        border-radius: 10px !important;
    }

    #sapo-settings-page .stg-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--stg-green-700) !important;
        margin-bottom: 6px !important;
        background: transparent !important;
    }

    #sapo-settings-page .stg-header h2 {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--stg-text) !important;
        margin-bottom: 4px !important;
    }

    #sapo-settings-page .stg-header > div > p {
        font-size: 13.5px !important;
        color: var(--stg-muted) !important;
    }

    #sapo-settings-page .stg-update-info {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-end !important;
        gap: 2px !important;
        text-align: right !important;
    }

    #sapo-settings-page .stg-update-info span {
        font-size: 11.5px !important;
        font-weight: 600 !important;
        color: var(--stg-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-settings-page .stg-update-info strong {
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: var(--stg-text) !important;
        background: transparent !important;
    }

    #sapo-settings-page .stg-update-info small {
        font-size: 12px !important;
        color: var(--stg-muted) !important;
        background: transparent !important;
    }

    /* ---------- Tabs ---------- */
    #sapo-settings-page .stg-tabs {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 10px !important;
    }

    #sapo-settings-page .stg-tab {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        flex: 1 1 240px !important;
        padding: 14px 16px !important;
        background: var(--stg-white) !important;
        border: 1px solid var(--stg-border) !important;
        border-radius: 10px !important;
        cursor: pointer !important;
        text-align: left !important;
        transition: border-color 0.15s ease, background 0.15s ease !important;
    }

    #sapo-settings-page .stg-tab:hover {
        border-color: var(--stg-border-strong) !important;
        background: var(--stg-bg) !important;
    }

    #sapo-settings-page .stg-tab-active {
        border-color: var(--stg-green-700) !important;
        background: var(--stg-green-50) !important;
    }

    #sapo-settings-page .stg-tab > span:first-child {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 34px !important;
        height: 34px !important;
        flex-shrink: 0 !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        color: var(--stg-muted) !important;
        background: var(--stg-bg) !important;
        border-radius: 8px !important;
    }

    #sapo-settings-page .stg-tab-active > span:first-child {
        color: #ffffff !important;
        background: var(--stg-green-700) !important;
    }

    #sapo-settings-page .stg-tab > div {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
        min-width: 0 !important;
    }

    #sapo-settings-page .stg-tab strong {
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: var(--stg-text) !important;
        background: transparent !important;
    }

    #sapo-settings-page .stg-tab small {
        font-size: 12px !important;
        color: var(--stg-muted) !important;
        background: transparent !important;
    }

    /* ---------- Alerts ---------- */
    #sapo-settings-page .stg-success-alert {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 12px 16px !important;
        border-radius: 8px !important;
        background: var(--stg-green-50) !important;
        border: 1px solid var(--stg-green-100) !important;
    }

    #sapo-settings-page .stg-success-alert span:first-child {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 20px !important;
        height: 20px !important;
        flex-shrink: 0 !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        background: var(--stg-green-700) !important;
        border-radius: 999px !important;
    }

    #sapo-settings-page .stg-success-alert p {
        flex: 1 !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        color: #15803d !important;
    }

    #sapo-settings-page .stg-success-alert button {
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

    #sapo-settings-page .stg-success-alert button:hover {
        background: rgba(21, 128, 61, 0.1) !important;
    }

    #sapo-settings-page .stg-form-alert {
        padding: 12px 16px !important;
        border-radius: 8px !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        background: var(--stg-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Section cards ---------- */
    #sapo-settings-page .stg-section {
        background: var(--stg-white) !important;
        border: 1px solid var(--stg-border) !important;
        border-radius: 10px !important;
        padding: 20px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 18px !important;
    }

    #sapo-settings-page .stg-panel-heading h2 {
        font-size: 16px !important;
        font-weight: 700 !important;
        color: var(--stg-text) !important;
        margin-bottom: 3px !important;
    }

    #sapo-settings-page .stg-panel-heading p {
        font-size: 13px !important;
        color: var(--stg-muted) !important;
    }

    /* ---------- Form grid ---------- */
    #sapo-settings-page .stg-form-grid {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 16px !important;
    }

    #sapo-settings-page .stg-full-field {
        grid-column: 1 / -1 !important;
    }

    #sapo-settings-page .stg-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        min-width: 0 !important;
    }

    #sapo-settings-page .stg-field span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--stg-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-settings-page input,
    #sapo-settings-page select,
    #sapo-settings-page textarea {
        width: 100% !important;
        padding: 9px 12px !important;
        font-size: 13.5px !important;
        color: var(--stg-text-secondary) !important;
        background: var(--stg-white) !important;
        border: 1px solid var(--stg-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-settings-page textarea {
        resize: vertical !important;
        min-height: 72px !important;
        font-family: var(--stg-font) !important;
    }

    #sapo-settings-page select {
        cursor: pointer !important;
    }

    #sapo-settings-page input:focus,
    #sapo-settings-page select:focus,
    #sapo-settings-page textarea:focus {
        border-color: var(--stg-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    /* ---------- Logo panel ---------- */
    #sapo-settings-page .stg-logo-panel {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-start !important;
        gap: 20px !important;
    }

    #sapo-settings-page .stg-logo-preview {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 96px !important;
        height: 96px !important;
        flex-shrink: 0 !important;
        background: var(--stg-bg) !important;
        border: 1px dashed var(--stg-border-strong) !important;
        border-radius: 10px !important;
        overflow: hidden !important;
    }

    #sapo-settings-page .stg-logo-preview img {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
    }

    #sapo-settings-page .stg-logo-preview span {
        font-size: 28px !important;
        font-weight: 700 !important;
        color: var(--stg-border-strong) !important;
        background: transparent !important;
    }

    #sapo-settings-page .stg-logo-actions {
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        flex: 1 1 220px !important;
    }

    #sapo-settings-page .stg-logo-actions p {
        font-size: 12px !important;
        color: var(--stg-muted) !important;
        line-height: 1.5 !important;
    }

    /* ---------- Buttons ---------- */
    #sapo-settings-page .stg-primary-button,
    #sapo-settings-page .stg-secondary-button,
    #sapo-settings-page .stg-file-button {
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
        width: fit-content !important;
    }

    #sapo-settings-page .stg-primary-button {
        color: #ffffff !important;
        background: var(--stg-green-700) !important;
        border: 1px solid var(--stg-green-700) !important;
    }

    #sapo-settings-page .stg-primary-button:hover:not(:disabled) {
        background: var(--stg-green-800) !important;
    }

    #sapo-settings-page .stg-secondary-button,
    #sapo-settings-page .stg-file-button {
        color: #374151 !important;
        background: var(--stg-white) !important;
        border: 1px solid var(--stg-border-strong) !important;
    }

    #sapo-settings-page .stg-secondary-button:hover:not(:disabled),
    #sapo-settings-page .stg-file-button:hover {
        background: var(--stg-bg) !important;
        border-color: #9ca3af !important;
    }

    #sapo-settings-page .stg-file-button {
        position: relative !important;
        overflow: hidden !important;
    }

    #sapo-settings-page .stg-file-button input[type="file"] {
        position: absolute !important;
        inset: 0 !important;
        opacity: 0 !important;
        cursor: pointer !important;
        padding: 0 !important;
        border: none !important;
    }

    #sapo-settings-page .stg-danger-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 38px !important;
        padding: 0 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: var(--stg-red) !important;
        background: var(--stg-red-light) !important;
        border: 1px solid #fecaca !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        width: fit-content !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-settings-page .stg-danger-button:hover:not(:disabled) {
        background: var(--stg-red) !important;
        color: #ffffff !important;
        border-color: var(--stg-red) !important;
    }

    #sapo-settings-page button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Printer info banner ---------- */
    #sapo-settings-page .stg-printer-banner {
        padding: 12px 14px !important;
        font-size: 12.5px !important;
        line-height: 1.5 !important;
        color: var(--stg-blue) !important;
        background: var(--stg-blue-light) !important;
        border: 1px solid #bfdbfe !important;
        border-radius: 8px !important;
    }

    /* ---------- Switch grid ---------- */
    #sapo-settings-page .stg-switch-grid {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 10px !important;
    }

    #sapo-settings-page .stg-switch {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 11px 14px !important;
        background: var(--stg-bg) !important;
        border: 1px solid var(--stg-border) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: border-color 0.15s ease, background 0.15s ease !important;
    }

    #sapo-settings-page .stg-switch:hover {
        border-color: var(--stg-border-strong) !important;
    }

    #sapo-settings-page .stg-switch input[type="checkbox"] {
        width: 16px !important;
        height: 16px !important;
        margin: 0 !important;
        flex-shrink: 0 !important;
        accent-color: var(--stg-green-700) !important;
        cursor: pointer !important;
    }

    #sapo-settings-page .stg-switch span {
        font-size: 13px !important;
        font-weight: 500 !important;
        color: var(--stg-text-secondary) !important;
        background: transparent !important;
    }

    /* ---------- Print layout (forms + preview) ---------- */
    #sapo-settings-page .stg-print-layout {
        display: grid !important;
        grid-template-columns: 1.4fr 1fr !important;
        gap: 20px !important;
        align-items: start !important;
    }

    #sapo-settings-page .stg-print-forms {
        display: flex !important;
        flex-direction: column !important;
        gap: 20px !important;
        min-width: 0 !important;
    }

    /* ---------- Preview panel ---------- */
    #sapo-settings-page .stg-preview-panel {
        position: sticky !important;
        top: 20px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 14px !important;
        max-height: calc(100vh - 40px) !important;
    }

    #sapo-settings-page .stg-preview-toolbar {
        display: flex !important;
        gap: 8px !important;
    }

    #sapo-settings-page .stg-preview-button {
        flex: 1 !important;
        height: 36px !important;
        padding: 0 14px !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--stg-bg) !important;
        border: 1px solid var(--stg-border-strong) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-settings-page .stg-preview-button:hover {
        background: #f1f5f9 !important;
    }

    #sapo-settings-page .stg-preview-button.stg-preview-active {
        color: #ffffff !important;
        background: var(--stg-green-700) !important;
        border-color: var(--stg-green-700) !important;
    }

    /* ---------- Scrollable preview area ---------- */
    #sapo-settings-page .stg-preview-scroll {
        max-height: 560px !important;
        overflow-y: auto !important;
        padding: 16px !important;
        background: #e5e7eb !important;
        border: 1px solid var(--stg-border) !important;
        border-radius: 10px !important;
        display: flex !important;
        justify-content: center !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--stg-border-strong) transparent !important;
    }

    #sapo-settings-page .stg-preview-scroll::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-settings-page .stg-preview-scroll::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-settings-page .stg-preview-scroll::-webkit-scrollbar-thumb {
        background: var(--stg-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-settings-page .stg-preview-paper {
        background: var(--stg-white) !important;
        color: #111827 !important;
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12) !important;
        font-family: var(--stg-font) !important;
        flex-shrink: 0 !important;
    }

    /* Receipt (thermal) preview */
    #sapo-settings-page .print-document-receipt {
        width: 300px !important;
        padding: 20px 16px !important;
        font-size: 12px !important;
        line-height: 1.5 !important;
    }

    #sapo-settings-page .thermal-document-header {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 3px !important;
        text-align: center !important;
    }

    #sapo-settings-page .thermal-business-logo {
        max-width: 60px !important;
        max-height: 60px !important;
        object-fit: contain !important;
        margin-bottom: 4px !important;
    }

    #sapo-settings-page .thermal-document-header h2 {
        font-size: 14px !important;
        font-weight: 700 !important;
        color: #111827 !important;
    }

    #sapo-settings-page .thermal-document-header p {
        font-size: 11px !important;
        color: #4b5563 !important;
    }

    #sapo-settings-page .thermal-document-header strong {
        margin-top: 6px !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #111827 !important;
        background: transparent !important;
    }

    #sapo-settings-page .thermal-divider {
        margin: 10px 0 !important;
        border-top: 1px dashed #9ca3af !important;
    }

    #sapo-settings-page .thermal-meta-list,
    #sapo-settings-page .thermal-payment-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;
    }

    #sapo-settings-page .thermal-meta-list > div,
    #sapo-settings-page .thermal-payment-list > div {
        display: flex !important;
        justify-content: space-between !important;
        gap: 8px !important;
        font-size: 11.5px !important;
    }

    #sapo-settings-page .thermal-meta-list span,
    #sapo-settings-page .thermal-payment-list span {
        color: #4b5563 !important;
        background: transparent !important;
    }

    #sapo-settings-page .thermal-meta-list strong,
    #sapo-settings-page .thermal-payment-list strong {
        color: #111827 !important;
        font-weight: 600 !important;
        background: transparent !important;
        text-align: right !important;
    }

    #sapo-settings-page .thermal-item-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
    }

    #sapo-settings-page .thermal-item-list article strong {
        display: block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        color: #111827 !important;
        background: transparent !important;
    }

    #sapo-settings-page .thermal-item-list small {
        display: block !important;
        font-size: 10.5px !important;
        color: #9ca3af !important;
        background: transparent !important;
    }

    #sapo-settings-page .thermal-item-list article > div {
        display: flex !important;
        justify-content: space-between !important;
        margin-top: 2px !important;
        font-size: 11.5px !important;
    }

    #sapo-settings-page .thermal-item-list article > div span {
        color: #4b5563 !important;
        background: transparent !important;
    }

    #sapo-settings-page .thermal-item-list article > div strong {
        color: #111827 !important;
        background: transparent !important;
    }

    #sapo-settings-page .thermal-total-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;
    }

    #sapo-settings-page .thermal-total-list > div {
        display: flex !important;
        justify-content: space-between !important;
        font-size: 11.5px !important;
    }

    #sapo-settings-page .thermal-total-list span {
        color: #4b5563 !important;
        background: transparent !important;
    }

    #sapo-settings-page .thermal-total-list strong {
        color: #111827 !important;
        font-weight: 600 !important;
        background: transparent !important;
    }

    #sapo-settings-page .thermal-grand-total {
        margin-top: 4px !important;
        padding-top: 6px !important;
        border-top: 1px solid #d1d5db !important;
    }

    #sapo-settings-page .thermal-grand-total span,
    #sapo-settings-page .thermal-grand-total strong {
        font-size: 13px !important;
        font-weight: 700 !important;
    }

    #sapo-settings-page .thermal-document-footer {
        margin-top: 12px !important;
        padding-top: 10px !important;
        border-top: 1px dashed #9ca3af !important;
        font-size: 11px !important;
        color: #4b5563 !important;
        text-align: center !important;
        white-space: pre-line !important;
    }

    /* Invoice (A4) preview */
    #sapo-settings-page .print-document-invoice {
        width: 560px !important;
        padding: 32px !important;
        font-size: 12.5px !important;
    }

    #sapo-settings-page .invoice-document-header {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 16px !important;
        padding-bottom: 16px !important;
        border-bottom: 2px solid #111827 !important;
    }

    #sapo-settings-page .invoice-business-logo {
        max-width: 90px !important;
        max-height: 60px !important;
        object-fit: contain !important;
        margin-bottom: 8px !important;
    }

    #sapo-settings-page .invoice-document-header h2 {
        font-size: 16px !important;
        font-weight: 700 !important;
        color: #111827 !important;
    }

    #sapo-settings-page .invoice-document-header p {
        font-size: 11.5px !important;
        color: #4b5563 !important;
    }

    #sapo-settings-page .invoice-document-title {
        text-align: right !important;
    }

    #sapo-settings-page .invoice-document-title h1 {
        font-size: 20px !important;
        font-weight: 800 !important;
        color: #111827 !important;
        margin-bottom: 4px !important;
    }

    #sapo-settings-page .invoice-document-title strong {
        display: block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        color: #111827 !important;
        background: transparent !important;
    }

    #sapo-settings-page .invoice-document-title span {
        display: block !important;
        font-size: 11px !important;
        color: #6b7280 !important;
        background: transparent !important;
    }

    #sapo-settings-page .invoice-information-grid {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 16px !important;
        padding: 16px 0 !important;
    }

    #sapo-settings-page .invoice-information-grid span {
        display: block !important;
        font-size: 10.5px !important;
        font-weight: 600 !important;
        color: #9ca3af !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        margin-bottom: 3px !important;
        background: transparent !important;
    }

    #sapo-settings-page .invoice-information-grid strong {
        display: block !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: #111827 !important;
        background: transparent !important;
    }

    #sapo-settings-page .invoice-information-grid p {
        font-size: 11.5px !important;
        color: #4b5563 !important;
    }

    #sapo-settings-page .invoice-document-table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin-top: 6px !important;
    }

    #sapo-settings-page .invoice-document-table thead th {
        padding: 8px 6px !important;
        font-size: 10.5px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        color: #ffffff !important;
        background: #166534 !important;
        text-align: left !important;
    }

    #sapo-settings-page .invoice-document-table tbody td {
        padding: 8px 6px !important;
        font-size: 12px !important;
        color: #1f2937 !important;
        border-bottom: 1px solid #e5e7eb !important;
        background: transparent !important;
    }

    #sapo-settings-page .invoice-document-table strong {
        font-weight: 600 !important;
        color: #111827 !important;
        background: transparent !important;
    }

    #sapo-settings-page .invoice-document-table small {
        display: block !important;
        font-size: 10px !important;
        color: #9ca3af !important;
        background: transparent !important;
    }

    #sapo-settings-page .invoice-bottom-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 20px !important;
        margin-top: 18px !important;
    }

    #sapo-settings-page .invoice-payment-information h3 {
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #111827 !important;
        margin-bottom: 6px !important;
    }

    #sapo-settings-page .invoice-payment-information p {
        font-size: 11.5px !important;
        color: #4b5563 !important;
        margin-bottom: 2px !important;
    }

    #sapo-settings-page .invoice-total-panel {
        display: flex !important;
        flex-direction: column !important;
        gap: 5px !important;
    }

    #sapo-settings-page .invoice-total-panel > div {
        display: flex !important;
        justify-content: space-between !important;
        font-size: 12px !important;
    }

    #sapo-settings-page .invoice-total-panel span {
        color: #4b5563 !important;
        background: transparent !important;
    }

    #sapo-settings-page .invoice-total-panel strong {
        color: #111827 !important;
        font-weight: 600 !important;
        background: transparent !important;
    }

    #sapo-settings-page .invoice-grand-total {
        margin-top: 4px !important;
        padding-top: 8px !important;
        border-top: 2px solid #111827 !important;
    }

    #sapo-settings-page .invoice-grand-total span,
    #sapo-settings-page .invoice-grand-total strong {
        font-size: 14px !important;
        font-weight: 700 !important;
    }

    #sapo-settings-page .invoice-document-footer {
        margin-top: 20px !important;
        padding-top: 14px !important;
        border-top: 1px solid #e5e7eb !important;
        font-size: 11px !important;
        color: #6b7280 !important;
        white-space: pre-line !important;
    }

    /* ---------- Printer actions ---------- */
    #sapo-settings-page .stg-printer-actions {
        display: flex !important;
        justify-content: flex-end !important;
    }

    /* ---------- Save bar ---------- */
    #sapo-settings-page .stg-save-bar {
        position: sticky !important;
        bottom: 0 !important;
        display: flex !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        padding: 16px 20px !important;
        background: var(--stg-white) !important;
        border: 1px solid var(--stg-border) !important;
        border-radius: 10px !important;
        box-shadow: 0 -2px 8px rgba(15, 23, 42, 0.06) !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 980px) {
        #sapo-settings-page .stg-print-layout {
            grid-template-columns: 1fr !important;
        }

        #sapo-settings-page .stg-preview-panel {
            position: static !important;
            max-height: none !important;
        }
    }

    @media (max-width: 640px) {
        #sapo-settings-page .stg-header {
            flex-direction: column !important;
        }

        #sapo-settings-page .stg-update-info {
            align-items: flex-start !important;
            text-align: left !important;
        }

        #sapo-settings-page .stg-form-grid,
        #sapo-settings-page .stg-switch-grid {
            grid-template-columns: 1fr !important;
        }

        #sapo-settings-page .stg-full-field {
            grid-column: 1 !important;
        }

        #sapo-settings-page .stg-save-bar {
            flex-direction: column-reverse !important;
        }

        #sapo-settings-page .stg-save-bar button {
            width: 100% !important;
        }
    }
`;

interface SettingsPreviewProps {
    values: BusinessSettingInput;
    documentType: PrintDocumentType;
}

function SettingsPreview({
    values,
    documentType,
}: SettingsPreviewProps) {
    const subtotal = 7050;
    const discount = 250;
    const grandTotal = 6800;
    const paidAmount = 5000;
    const dueAmount = 1800;

    const currency = (
        value: number,
    ): string => formatCurrency(
        value,
        values.currency_code,
    );

    if (
        documentType
        === 'invoice'
    ) {
        return (
            <article
                className="
                    stg-preview-paper
                    document-print-area
                    print-document-invoice
                "
            >
                <header className="invoice-document-header">
                    <div>
                        {values.logo_data_url && (
                            <img
                                className="invoice-business-logo"
                                src={values.logo_data_url}
                                alt="Business logo"
                            />
                        )}

                        <h2>
                            {values.business_name}
                        </h2>

                        {values
                            .show_business_address
                            && values.address && (
                                <p>
                                    {values.address}
                                </p>
                            )}

                        {values.phone && (
                            <p>
                                Tel: {values.phone}
                            </p>
                        )}

                        {values.email && (
                            <p>
                                {values.email}
                            </p>
                        )}
                    </div>

                    <div className="invoice-document-title">
                        <h1>
                            {values.invoice_title}
                        </h1>

                        <strong>
                            SALE-20260726-000001
                        </strong>

                        <span>
                            26 Jul 2026, 02:30 PM
                        </span>
                    </div>
                </header>

                <section className="invoice-information-grid">
                    <div>
                        <span>Bill To</span>
                        <strong>
                            Sample Customer
                        </strong>
                        <p>
                            071 234 5678
                        </p>
                    </div>

                    <div>
                        <span>Payment</span>
                        <strong>
                            Partial Payment
                        </strong>
                        <p>
                            Cash
                        </p>
                    </div>

                    <div>
                        <span>Cashier</span>
                        <strong>
                            Administrator
                        </strong>
                    </div>
                </section>

                <table className="invoice-document-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>

                    <tbody>
                        {sampleItems.map(
                            (item) => (
                                <tr key={item.sku}>
                                    <td>
                                        <strong>
                                            {item.name}
                                        </strong>

                                        {values.show_sku && (
                                            <small>
                                                SKU: {item.sku}
                                            </small>
                                        )}
                                    </td>

                                    <td>
                                        {item.quantity}
                                    </td>

                                    <td>
                                        {currency(
                                            item.unitPrice,
                                        )}
                                    </td>

                                    <td>
                                        {currency(
                                            item.total,
                                        )}
                                    </td>
                                </tr>
                            ),
                        )}
                    </tbody>
                </table>

                <section className="invoice-bottom-grid">
                    <div className="invoice-payment-information">
                        <h3>
                            Payment Information
                        </h3>

                        <p>
                            Paid: {currency(
                                paidAmount,
                            )}
                        </p>

                        <p>
                            Due: {currency(
                                dueAmount,
                            )}
                        </p>

                        {values.show_due_date && (
                            <p>
                                Due Date:
                                {' '}25 Aug 2026
                            </p>
                        )}
                    </div>

                    <div className="invoice-total-panel">
                        <div>
                            <span>Subtotal</span>
                            <strong>
                                {currency(
                                    subtotal,
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Discount</span>
                            <strong>
                                - {currency(
                                    discount,
                                )}
                            </strong>
                        </div>

                        <div className="invoice-grand-total">
                            <span>Grand Total</span>
                            <strong>
                                {currency(
                                    grandTotal,
                                )}
                            </strong>
                        </div>
                    </div>
                </section>

                {values.invoice_footer && (
                    <footer className="invoice-document-footer">
                        {values.invoice_footer}
                    </footer>
                )}
            </article>
        );
    }

    const paperClass =
        values.receipt_paper_size
            === '58mm'
            ? 'print-paper-58mm'
            : 'print-paper-80mm';

    return (
        <article
            className={`
                stg-preview-paper
                document-print-area
                print-document-receipt
                ${paperClass}
            `}
        >
            <header className="thermal-document-header">
                {values.logo_data_url
                    && values
                        .show_logo_on_receipt && (
                        <img
                            className="thermal-business-logo"
                            src={values.logo_data_url}
                            alt="Business logo"
                        />
                    )}

                <h2>
                    {values.business_name}
                </h2>

                {values
                    .show_business_address
                    && values.address && (
                        <p>
                            {values.address}
                        </p>
                    )}

                {values.phone && (
                    <p>
                        Tel: {values.phone}
                    </p>
                )}

                <strong>
                    {values.receipt_title}
                </strong>
            </header>

            <div className="thermal-divider" />

            <section className="thermal-meta-list">
                <div>
                    <span>Sale:</span>
                    <strong>
                        SALE-20260726-000001
                    </strong>
                </div>

                <div>
                    <span>Date:</span>
                    <strong>
                        26 Jul 2026 02:30 PM
                    </strong>
                </div>

                {values.show_cashier_name && (
                    <div>
                        <span>Cashier:</span>
                        <strong>
                            Administrator
                        </strong>
                    </div>
                )}

                {values.show_customer_details && (
                    <div>
                        <span>Customer:</span>
                        <strong>
                            Sample Customer
                        </strong>
                    </div>
                )}
            </section>

            <div className="thermal-divider" />

            <section className="thermal-item-list">
                {sampleItems.map(
                    (item) => (
                        <article key={item.sku}>
                            <strong>
                                {item.name}
                            </strong>

                            {values.show_sku && (
                                <small>
                                    SKU: {item.sku}
                                </small>
                            )}

                            <div>
                                <span>
                                    {item.quantity}
                                    {' '}×{' '}
                                    {currency(
                                        item.unitPrice,
                                    )}
                                </span>

                                <strong>
                                    {currency(
                                        item.total,
                                    )}
                                </strong>
                            </div>
                        </article>
                    ),
                )}
            </section>

            <div className="thermal-divider" />

            <section className="thermal-total-list">
                <div>
                    <span>Subtotal</span>
                    <strong>
                        {currency(subtotal)}
                    </strong>
                </div>

                <div>
                    <span>Discount</span>
                    <strong>
                        - {currency(discount)}
                    </strong>
                </div>

                <div className="thermal-grand-total">
                    <span>Total</span>
                    <strong>
                        {currency(grandTotal)}
                    </strong>
                </div>

                <div>
                    <span>Paid</span>
                    <strong>
                        {currency(paidAmount)}
                    </strong>
                </div>

                <div>
                    <span>Due</span>
                    <strong>
                        {currency(dueAmount)}
                    </strong>
                </div>
            </section>

            <div className="thermal-divider" />

            <section className="thermal-payment-list">
                <div>
                    <span>Payment:</span>
                    <strong>Cash</strong>
                </div>

                {values
                    .show_payment_reference && (
                        <div>
                            <span>Reference:</span>
                            <strong>
                                SAMPLE-001
                            </strong>
                        </div>
                    )}

                {values.show_due_date && (
                    <div>
                        <span>Due Date:</span>
                        <strong>
                            25 Aug 2026
                        </strong>
                    </div>
                )}
            </section>

            {values.receipt_footer && (
                <footer className="thermal-document-footer">
                    {values.receipt_footer}
                </footer>
            )}
        </article>
    );
}

export default function SettingsPage() {
    const {
        token,
    } = useAuth();

    const [
        activeTab,
        setActiveTab,
    ] = useState<SettingsTab>('business');

    const [
        values,
        setValues,
    ] = useState<BusinessSettingInput>(toInput(defaultBusinessSetting));

    const [
        savedSettings,
        setSavedSettings,
    ] = useState<BusinessSetting>(defaultBusinessSetting);

    const [
        previewDocument,
        setPreviewDocument,
    ] = useState<PrintDocumentType>('receipt');

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSaving,
        setIsSaving,
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

    const loadSettings =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getBusinessSettings(
                            token,
                        );

                    setSavedSettings(
                        response.data,
                    );

                    setValues(
                        toInput(
                            response.data,
                        ),
                    );

                    setPreviewDocument(
                        response
                            .data
                            .default_print_document,
                    );
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load business settings.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [token],
        );

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    function setField<K extends keyof BusinessSettingInput>(
        key: K,
        value: BusinessSettingInput[K],
    ): void {
        setValues(
            (current) => ({
                ...current,
                [key]: value,
            }),
        );

        setFormError('');
        setSuccessMessage('');
    }

    const hasUnsavedChanges =
        useMemo(
            () =>
                JSON.stringify(values)
                !== JSON.stringify(
                    toInput(
                        savedSettings,
                    ),
                ),
            [
                values,
                savedSettings,
            ],
        );

    const handleLogoSelection = (
        event:
            ChangeEvent<HTMLInputElement>,
    ): void => {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        const allowedTypes = [
            'image/png',
            'image/jpeg',
            'image/webp',
        ];

        if (
            !allowedTypes.includes(
                file.type,
            )
        ) {
            setFormError(
                'Select a PNG, JPEG or WebP logo.',
            );

            event.target.value = '';

            return;
        }

        if (
            file.size
            > 1024 * 1024
        ) {
            setFormError(
                'The logo must be smaller than 1 MB.',
            );

            event.target.value = '';

            return;
        }

        const reader =
            new FileReader();

        reader.onload = (): void => {
            if (
                typeof reader.result
                === 'string'
            ) {
                setField(
                    'logo_data_url',
                    reader.result,
                );
            }
        };

        reader.onerror = (): void => {
            setFormError(
                'Unable to read the selected logo.',
            );
        };

        reader.readAsDataURL(file);
    };

    const validateForm = (): boolean => {
        if (
            !values
                .business_name
                .trim()
        ) {
            setActiveTab('business');

            setFormError(
                'Business name is required.',
            );

            return false;
        }

        if (
            !values
                .receipt_title
                .trim()
        ) {
            setActiveTab('printing');

            setFormError(
                'Receipt title is required.',
            );

            return false;
        }

        if (
            !values
                .invoice_title
                .trim()
        ) {
            setActiveTab('printing');

            setFormError(
                'Invoice title is required.',
            );

            return false;
        }

        if (
            !/^[A-Z]{3}$/.test(
                values.currency_code,
            )
        ) {
            setActiveTab('business');

            setFormError(
                'Currency code must contain three uppercase letters.',
            );

            return false;
        }

        return true;
    };

    const handleSubmit = async (
        event:
            FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        if (
            !token
            || isSaving
            || !validateForm()
        ) {
            return;
        }

        setIsSaving(true);
        setFormError('');
        setSuccessMessage('');

        try {
            const response =
                await updateBusinessSettings(
                    token,
                    {
                        ...values,

                        business_name:
                            values
                                .business_name
                                .trim(),

                        business_short_name:
                            values
                                .business_short_name
                                ?.trim()
                            || null,

                        currency_code:
                            values
                                .currency_code
                                .trim()
                                .toUpperCase(),

                        receipt_title:
                            values
                                .receipt_title
                                .trim(),

                        invoice_title:
                            values
                                .invoice_title
                                .trim(),
                    },
                );

            setSavedSettings(
                response.data,
            );

            setValues(
                toInput(
                    response.data,
                ),
            );

            setSuccessMessage(
                response.message
                ?? 'Settings saved successfully.',
            );
        } catch (error) {
            setFormError(
                error instanceof ApiError
                    ? error.message
                    : 'Unable to save business settings.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div id="sapo-settings-page">
                <style>
                    {settingsPageStyles}
                </style>

                <section className="stg-loading-panel">
                    <div className="stg-spinner" />

                    <span>
                        Loading business settings...
                    </span>
                </section>
            </div>
        );
    }

    return (
        <div id="sapo-settings-page">
            <style>
                {settingsPageStyles}
            </style>

            <form
                onSubmit={handleSubmit}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                    }}
                >
                    <section className="stg-header">
                        <div>
                            <span className="stg-kicker">
                                System configuration
                            </span>

                            <h2>
                                Business and Printing Settings
                            </h2>

                            <p>
                                Manage business information,
                                receipt layouts, invoices and
                                printing preferences.
                            </p>
                        </div>

                        {savedSettings
                            .updated_at && (
                                <div className="stg-update-info">
                                    <span>
                                        Last updated
                                    </span>

                                    <strong>
                                        {new Intl.DateTimeFormat(
                                            'en-GB',
                                            {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            },
                                        ).format(
                                            new Date(
                                                savedSettings
                                                    .updated_at,
                                            ),
                                        )}
                                    </strong>

                                    {savedSettings
                                        .updated_by && (
                                            <small>
                                                By{' '}
                                                {
                                                    savedSettings
                                                        .updated_by
                                                        .name
                                                }
                                            </small>
                                        )}
                                </div>
                            )}
                    </section>

                    <nav
                        className="stg-tabs"
                        aria-label="Settings sections"
                    >
                        <button
                            type="button"
                            className={
                                activeTab === 'business'
                                    ? 'stg-tab stg-tab-active'
                                    : 'stg-tab'
                            }
                            onClick={() => {
                                setActiveTab(
                                    'business',
                                );
                            }}
                        >
                            <span>B</span>

                            <div>
                                <strong>
                                    Business Settings
                                </strong>

                                <small>
                                    Identity and contact details
                                </small>
                            </div>
                        </button>

                        <button
                            type="button"
                            className={
                                activeTab === 'printing'
                                    ? 'stg-tab stg-tab-active'
                                    : 'stg-tab'
                            }
                            onClick={() => {
                                setActiveTab(
                                    'printing',
                                );
                            }}
                        >
                            <span>P</span>

                            <div>
                                <strong>
                                    Receipt and Invoice
                                </strong>

                                <small>
                                    Paper, content and printing
                                </small>
                            </div>
                        </button>
                    </nav>

                    {successMessage && (
                        <div
                            className="stg-success-alert"
                            role="status"
                        >
                            <span>✓</span>

                            <p>
                                {successMessage}
                            </p>

                            <button
                                type="button"
                                aria-label="Dismiss"
                                onClick={() => {
                                    setSuccessMessage('');
                                }}
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {(pageError || formError) && (
                        <div
                            className="stg-form-alert"
                            role="alert"
                        >
                            {formError || pageError}
                        </div>
                    )}

                    {activeTab === 'business' && (
                        <>
                            <section className="stg-section">
                                <header className="stg-panel-heading">
                                    <div>
                                        <h2>
                                            Business Identity
                                        </h2>

                                        <p>
                                            Details printed on receipts
                                            and invoices.
                                        </p>
                                    </div>
                                </header>

                                <div className="stg-form-grid">
                                    <label className="stg-field">
                                        <span>
                                            Business Name *
                                        </span>

                                        <input
                                            type="text"
                                            maxLength={150}
                                            value={
                                                values
                                                    .business_name
                                            }
                                            onChange={(event) => {
                                                setField(
                                                    'business_name',
                                                    event
                                                        .target
                                                        .value,
                                                );
                                            }}
                                        />
                                    </label>

                                    <label className="stg-field">
                                        <span>
                                            Short Business Name
                                        </span>

                                        <input
                                            type="text"
                                            maxLength={80}
                                            value={
                                                values
                                                    .business_short_name
                                                ?? ''
                                            }
                                            onChange={(event) => {
                                                setField(
                                                    'business_short_name',
                                                    event
                                                        .target
                                                        .value
                                                    || null,
                                                );
                                            }}
                                        />
                                    </label>

                                    <label className="stg-field stg-full-field">
                                        <span>
                                            Address
                                        </span>

                                        <textarea
                                            rows={3}
                                            maxLength={1000}
                                            value={
                                                values.address
                                                ?? ''
                                            }
                                            onChange={(event) => {
                                                setField(
                                                    'address',
                                                    event
                                                        .target
                                                        .value
                                                    || null,
                                                );
                                            }}
                                        />
                                    </label>

                                    <label className="stg-field">
                                        <span>
                                            Primary Phone
                                        </span>

                                        <input
                                            type="tel"
                                            maxLength={30}
                                            value={
                                                values.phone
                                                ?? ''
                                            }
                                            onChange={(event) => {
                                                setField(
                                                    'phone',
                                                    event
                                                        .target
                                                        .value
                                                    || null,
                                                );
                                            }}
                                        />
                                    </label>

                                    <label className="stg-field">
                                        <span>
                                            Secondary Phone
                                        </span>

                                        <input
                                            type="tel"
                                            maxLength={30}
                                            value={
                                                values
                                                    .secondary_phone
                                                ?? ''
                                            }
                                            onChange={(event) => {
                                                setField(
                                                    'secondary_phone',
                                                    event
                                                        .target
                                                        .value
                                                    || null,
                                                );
                                            }}
                                        />
                                    </label>

                                    <label className="stg-field">
                                        <span>
                                            Email
                                        </span>

                                        <input
                                            type="email"
                                            maxLength={150}
                                            value={
                                                values.email
                                                ?? ''
                                            }
                                            onChange={(event) => {
                                                setField(
                                                    'email',
                                                    event
                                                        .target
                                                        .value
                                                    || null,
                                                );
                                            }}
                                        />
                                    </label>

                                    <label className="stg-field">
                                        <span>
                                            Website
                                        </span>

                                        <input
                                            type="url"
                                            maxLength={255}
                                            placeholder="https://example.com"
                                            value={
                                                values.website
                                                ?? ''
                                            }
                                            onChange={(event) => {
                                                setField(
                                                    'website',
                                                    event
                                                        .target
                                                        .value
                                                    || null,
                                                );
                                            }}
                                        />
                                    </label>

                                    <label className="stg-field">
                                        <span>
                                            Registration Number
                                        </span>

                                        <input
                                            type="text"
                                            maxLength={100}
                                            value={
                                                values
                                                    .registration_number
                                                ?? ''
                                            }
                                            onChange={(event) => {
                                                setField(
                                                    'registration_number',
                                                    event
                                                        .target
                                                        .value
                                                    || null,
                                                );
                                            }}
                                        />
                                    </label>

                                    <label className="stg-field">
                                        <span>
                                            Tax Number
                                        </span>

                                        <input
                                            type="text"
                                            maxLength={100}
                                            value={
                                                values
                                                    .tax_number
                                                ?? ''
                                            }
                                            onChange={(event) => {
                                                setField(
                                                    'tax_number',
                                                    event
                                                        .target
                                                        .value
                                                    || null,
                                                );
                                            }}
                                        />
                                    </label>

                                    <label className="stg-field">
                                        <span>
                                            Currency Code *
                                        </span>

                                        <input
                                            type="text"
                                            maxLength={3}
                                            value={
                                                values
                                                    .currency_code
                                            }
                                            onChange={(event) => {
                                                setField(
                                                    'currency_code',
                                                    event
                                                        .target
                                                        .value
                                                        .toUpperCase(),
                                                );
                                            }}
                                        />
                                    </label>

                                    <label className="stg-field">
                                        <span>
                                            Timezone *
                                        </span>

                                        <input
                                            type="text"
                                            maxLength={100}
                                            value={
                                                values.timezone
                                            }
                                            onChange={(event) => {
                                                setField(
                                                    'timezone',
                                                    event
                                                        .target
                                                        .value,
                                                );
                                            }}
                                        />
                                    </label>
                                </div>
                            </section>

                            <section className="stg-section">
                                <header className="stg-panel-heading">
                                    <div>
                                        <h2>
                                            Business Logo
                                        </h2>

                                        <p>
                                            PNG, JPEG or WebP,
                                            maximum 1 MB.
                                        </p>
                                    </div>
                                </header>

                                <div className="stg-logo-panel">
                                    <div className="stg-logo-preview">
                                        {values
                                            .logo_data_url ? (
                                            <img
                                                src={
                                                    values
                                                        .logo_data_url
                                                }
                                                alt="Business logo"
                                            />
                                        ) : (
                                            <span>
                                                {
                                                    values
                                                        .business_name
                                                        .charAt(0)
                                                        .toUpperCase()
                                                    || 'B'
                                                }
                                            </span>
                                        )}
                                    </div>

                                    <div className="stg-logo-actions">
                                        <label className="stg-file-button">
                                            Select Logo

                                            <input
                                                type="file"
                                                accept="
                                                    image/png,
                                                    image/jpeg,
                                                    image/webp
                                                "
                                                onChange={
                                                    handleLogoSelection
                                                }
                                            />
                                        </label>

                                        {values
                                            .logo_data_url && (
                                                <button
                                                    type="button"
                                                    className="stg-danger-button"
                                                    onClick={() => {
                                                        setField(
                                                            'logo_data_url',
                                                            null,
                                                        );
                                                    }}
                                                >
                                                    Remove Logo
                                                </button>
                                            )}

                                        <p>
                                            A square or horizontal
                                            transparent logo produces
                                            the best print result.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </>
                    )}

                    {activeTab === 'printing' && (
                        <div className="stg-print-layout">
                            <div className="stg-print-forms">
                                <section className="stg-section">
                                    <header className="stg-panel-heading">
                                        <div>
                                            <h2>
                                                Document Format
                                            </h2>

                                            <p>
                                                Configure receipt paper,
                                                invoices and copies.
                                            </p>
                                        </div>
                                    </header>

                                    <div className="stg-form-grid">
                                        <label className="stg-field">
                                            <span>
                                                Receipt Paper
                                            </span>

                                            <select
                                                value={
                                                    values
                                                        .receipt_paper_size
                                                }
                                                onChange={(event) => {
                                                    setField(
                                                        'receipt_paper_size',
                                                        parsePaperSize(
                                                            event
                                                                .target
                                                                .value,
                                                        ),
                                                    );
                                                }}
                                            >
                                                <option value="58mm">
                                                    58 mm Thermal
                                                </option>

                                                <option value="80mm">
                                                    80 mm Thermal
                                                </option>
                                            </select>
                                        </label>

                                        <label className="stg-field">
                                            <span>
                                                Default Document
                                            </span>

                                            <select
                                                value={
                                                    values
                                                        .default_print_document
                                                }
                                                onChange={(event) => {
                                                    const type =
                                                        parseDocumentType(
                                                            event
                                                                .target
                                                                .value,
                                                        );

                                                    setField(
                                                        'default_print_document',
                                                        type,
                                                    );

                                                    setPreviewDocument(
                                                        type,
                                                    );
                                                }}
                                            >
                                                <option value="receipt">
                                                    Thermal Receipt
                                                </option>

                                                <option value="invoice">
                                                    A4 Invoice
                                                </option>
                                            </select>
                                        </label>

                                        <label className="stg-field">
                                            <span>
                                                Receipt Copies
                                            </span>

                                            <select
                                                value={
                                                    values
                                                        .receipt_copies
                                                }
                                                onChange={(event) => {
                                                    setField(
                                                        'receipt_copies',
                                                        Number(
                                                            event
                                                                .target
                                                                .value,
                                                        ),
                                                    );
                                                }}
                                            >
                                                <option value={1}>
                                                    1 Copy
                                                </option>

                                                <option value={2}>
                                                    2 Copies
                                                </option>

                                                <option value={3}>
                                                    3 Copies
                                                </option>
                                            </select>
                                        </label>

                                        <div className="stg-printer-banner stg-full-field">
                                            The physical receipt printer is now configured
                                            separately on each cashier computer from
                                            <strong> Device Printer</strong> in the sidebar.
                                            This prevents Cashier PC 1 and Cashier PC 2
                                            from overwriting each other&apos;s printer.
                                            Receipt paper size, copies, receipt content and
                                            auto-print preferences on this page remain shared
                                            business settings.
                                        </div>
                                    </div>
                                </section>

                                <section className="stg-section">
                                    <header className="stg-panel-heading">
                                        <div>
                                            <h2>
                                                Receipt Text
                                            </h2>

                                            <p>
                                                Header and footer shown
                                                on thermal receipts.
                                            </p>
                                        </div>
                                    </header>

                                    <div className="stg-form-grid">
                                        <label className="stg-field stg-full-field">
                                            <span>
                                                Receipt Title *
                                            </span>

                                            <input
                                                type="text"
                                                maxLength={100}
                                                value={
                                                    values
                                                        .receipt_title
                                                }
                                                onChange={(event) => {
                                                    setField(
                                                        'receipt_title',
                                                        event
                                                            .target
                                                            .value,
                                                    );
                                                }}
                                            />
                                        </label>

                                        <label className="stg-field stg-full-field">
                                            <span>
                                                Receipt Footer
                                            </span>

                                            <textarea
                                                rows={4}
                                                maxLength={1000}
                                                value={
                                                    values
                                                        .receipt_footer
                                                    ?? ''
                                                }
                                                onChange={(event) => {
                                                    setField(
                                                        'receipt_footer',
                                                        event
                                                            .target
                                                            .value
                                                        || null,
                                                    );
                                                }}
                                            />
                                        </label>
                                    </div>
                                </section>

                                <section className="stg-section">
                                    <header className="stg-panel-heading">
                                        <div>
                                            <h2>
                                                Invoice Text
                                            </h2>

                                            <p>
                                                Header and footer shown
                                                on A4 invoices.
                                            </p>
                                        </div>
                                    </header>

                                    <div className="stg-form-grid">
                                        <label className="stg-field stg-full-field">
                                            <span>
                                                Invoice Title *
                                            </span>

                                            <input
                                                type="text"
                                                maxLength={100}
                                                value={
                                                    values
                                                        .invoice_title
                                                }
                                                onChange={(event) => {
                                                    setField(
                                                        'invoice_title',
                                                        event
                                                            .target
                                                            .value,
                                                    );
                                                }}
                                            />
                                        </label>

                                        <label className="stg-field stg-full-field">
                                            <span>
                                                Invoice Footer
                                            </span>

                                            <textarea
                                                rows={4}
                                                maxLength={1000}
                                                value={
                                                    values
                                                        .invoice_footer
                                                    ?? ''
                                                }
                                                onChange={(event) => {
                                                    setField(
                                                        'invoice_footer',
                                                        event
                                                            .target
                                                            .value
                                                        || null,
                                                    );
                                                }}
                                            />
                                        </label>
                                    </div>
                                </section>

                                <section className="stg-section">
                                    <header className="stg-panel-heading">
                                        <div>
                                            <h2>
                                                Printed Information
                                            </h2>

                                            <p>
                                                Choose information included
                                                in receipts and invoices.
                                            </p>
                                        </div>
                                    </header>

                                    <div className="stg-switch-grid">
                                        {[
                                            {
                                                key:
                                                    'show_logo_on_receipt',
                                                label:
                                                    'Show Business Logo',
                                            },
                                            {
                                                key:
                                                    'show_business_address',
                                                label:
                                                    'Show Business Address',
                                            },
                                            {
                                                key:
                                                    'show_customer_details',
                                                label:
                                                    'Show Customer Details',
                                            },
                                            {
                                                key:
                                                    'show_cashier_name',
                                                label:
                                                    'Show Cashier Name',
                                            },
                                            {
                                                key:
                                                    'show_payment_reference',
                                                label:
                                                    'Show Payment Reference',
                                            },
                                            {
                                                key:
                                                    'show_due_date',
                                                label:
                                                    'Show Due Date',
                                            },
                                            {
                                                key:
                                                    'show_sku',
                                                label:
                                                    'Show Product SKU',
                                            },
                                            {
                                                key:
                                                    'show_batch_number',
                                                label:
                                                    'Show Batch Number',
                                            },
                                            {
                                                key:
                                                    'auto_print_after_sale',
                                                label:
                                                    'Open Print Dialog After Sale',
                                            },
                                            {
                                                key:
                                                    'print_duplicate_label',
                                                label:
                                                    'Mark Additional Copies',
                                            },
                                        ].map(
                                            (option) => {
                                                const key =
                                                    option.key as
                                                    | 'show_logo_on_receipt'
                                                    | 'show_business_address'
                                                    | 'show_customer_details'
                                                    | 'show_cashier_name'
                                                    | 'show_payment_reference'
                                                    | 'show_due_date'
                                                    | 'show_sku'
                                                    | 'show_batch_number'
                                                    | 'auto_print_after_sale'
                                                    | 'print_duplicate_label';

                                                return (
                                                    <label
                                                        className="stg-switch"
                                                        key={key}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                values[
                                                                key
                                                                ]
                                                            }
                                                            onChange={(event) => {
                                                                setField(
                                                                    key,
                                                                    event
                                                                        .target
                                                                        .checked,
                                                                );
                                                            }}
                                                        />

                                                        <span>
                                                            {
                                                                option
                                                                    .label
                                                            }
                                                        </span>
                                                    </label>
                                                );
                                            },
                                        )}
                                    </div>
                                </section>
                            </div>

                            <aside className="stg-section stg-preview-panel">
                                <header className="stg-panel-heading">
                                    <div>
                                        <h2>
                                            Print Preview
                                        </h2>

                                        <p>
                                            Preview receipt or A4 invoice.
                                        </p>
                                    </div>
                                </header>

                                <div className="stg-preview-toolbar">
                                    <button
                                        type="button"
                                        className={
                                            previewDocument
                                                === 'receipt'
                                                ? 'stg-preview-button stg-preview-active'
                                                : 'stg-preview-button'
                                        }
                                        onClick={() => {
                                            setPreviewDocument(
                                                'receipt',
                                            );
                                        }}
                                    >
                                        Receipt
                                    </button>

                                    <button
                                        type="button"
                                        className={
                                            previewDocument
                                                === 'invoice'
                                                ? 'stg-preview-button stg-preview-active'
                                                : 'stg-preview-button'
                                        }
                                        onClick={() => {
                                            setPreviewDocument(
                                                'invoice',
                                            );
                                        }}
                                    >
                                        Invoice
                                    </button>
                                </div>

                                <div className="stg-preview-scroll">
                                    <SettingsPreview
                                        values={values}
                                        documentType={
                                            previewDocument
                                        }
                                    />
                                </div>

                                <div className="stg-printer-actions">
                                    <button
                                        type="button"
                                        className="stg-secondary-button"
                                        onClick={() => {
                                            window.print();
                                        }}
                                    >
                                        Preview Print
                                    </button>
                                </div>
                            </aside>
                        </div>
                    )}

                    <footer className="stg-save-bar">
                        <button
                            type="button"
                            className="stg-secondary-button"
                            disabled={
                                isSaving
                                || !hasUnsavedChanges
                            }
                            onClick={() => {
                                setValues(
                                    toInput(
                                        savedSettings,
                                    ),
                                );

                                setFormError('');
                                setSuccessMessage('');
                            }}
                        >
                            Discard Changes
                        </button>

                        <button
                            type="submit"
                            className="stg-primary-button"
                            disabled={
                                isSaving
                                || !hasUnsavedChanges
                            }
                        >
                            {isSaving
                                ? 'Saving Settings...'
                                : 'Save Settings'}
                        </button>
                    </footer>
                </div>
            </form>
        </div>
    );
}