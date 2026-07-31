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

import BarcodeLabel
    from '../../components/barcodes/BarcodeLabel';

import Code128Barcode
    from '../../components/barcodes/Code128Barcode';

import {
    ApiError,
} from '../../lib/api';

import {
    generateMissingBarcodes,
    generateProductBarcode,
    getBarcodeProducts,
    updateProductBarcode,
} from '../../services/barcodeService';

import {
    getBusinessSettings,
} from '../../services/businessSettingService';

import {
    defaultBusinessSetting,
} from '../../types/businessSetting';

import type {
    BarcodeLabelSettings,
    BarcodeProduct,
    BarcodeSummary,
} from '../../types/barcode';

import type {
    BusinessSetting,
} from '../../types/businessSetting';

import type {
    PosPaginationMeta,
} from '../../types/sale';

const emptySummary:
    BarcodeSummary = {
    total_products: 0,
    assigned_barcodes: 0,
    missing_barcodes: 0,
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

const defaultLabelSettings:
    BarcodeLabelSettings = {
    width_mm: 50,
    height_mm: 30,
    copies: 1,
    show_business_name: true,
    show_product_name: true,
    show_sku: true,
    show_price: true,
};

type IconName =
    | 'alert'
    | 'barcode'
    | 'check'
    | 'chevron-left'
    | 'chevron-right'
    | 'close'
    | 'generate'
    | 'package'
    | 'printer'
    | 'refresh'
    | 'save'
    | 'search'
    | 'settings';

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

        case 'barcode':
            return (
                <svg {...props}>
                    <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14M21 5v14" />
                </svg>
            );

        case 'check':
            return (
                <svg {...props}>
                    <path d="m5 12 4 4L19 6" />
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

        case 'generate':
            return (
                <svg {...props}>
                    <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
                    <path d="m18 14 .7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14Z" />
                    <path d="m5 13 .7 2.3L8 16l-2.3.7L5 19l-.7-2.3L2 16l2.3-.7L5 13Z" />
                </svg>
            );

        case 'package':
            return (
                <svg {...props}>
                    <path d="m21 8-9 5-9-5 9-5 9 5Z" />
                    <path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" />
                </svg>
            );

        case 'printer':
            return (
                <svg {...props}>
                    <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <path d="M6 14h12v7H6Z" />
                </svg>
            );

        case 'refresh':
            return (
                <svg {...props}>
                    <path d="M20 11a8 8 0 1 0 2 5M20 4v7h-7" />
                </svg>
            );

        case 'save':
            return (
                <svg {...props}>
                    <path d="M5 3h11l3 3v15H5Z" />
                    <path d="M8 3v6h8V3M8 21v-7h8v7" />
                </svg>
            );

        case 'search':
            return (
                <svg {...props}>
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                </svg>
            );

        case 'settings':
        default:
            return (
                <svg {...props}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
                </svg>
            );
    }
}

const barcodePageStyles = `
#barcode-management-page,
#barcode-management-page *,
#barcode-management-page *::before,
#barcode-management-page *::after {
    box-sizing: border-box !important;
}

#barcode-management-page {
    --bmp-green-950: #052e16;
    --bmp-green-900: #14532d;
    --bmp-green-800: #166534;
    --bmp-green-700: #15803d;
    --bmp-green-100: #dcfce7;
    --bmp-green-50: #f0fdf4;
    --bmp-blue-700: #175cd3;
    --bmp-blue-50: #eff8ff;
    --bmp-amber-700: #b54708;
    --bmp-amber-50: #fffaeb;
    --bmp-red-700: #b42318;
    --bmp-red-50: #fef3f2;
    --bmp-text: #101828;
    --bmp-text-secondary: #344054;
    --bmp-muted: #667085;
    --bmp-border: #d0d9d2;
    --bmp-border-strong: #aebdb2;
    --bmp-surface: #ffffff;
    --bmp-page: #f5f8f6;

    position: relative !important;
    display: flex !important;
    width: 100% !important;
    height: calc(100vh - 88px) !important;
    height: calc(100dvh - 88px) !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-height: calc(100vh - 88px) !important;
    max-height: calc(100dvh - 88px) !important;
    flex: 1 1 auto !important;
    flex-direction: column !important;
    gap: 14px !important;
    margin: 0 !important;
    padding: 0 8px 36px 0 !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    overscroll-behavior-y: contain !important;
    scrollbar-gutter: stable !important;
    -webkit-overflow-scrolling: touch !important;
    color: var(--bmp-text) !important;
    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif !important;
    font-size: 15px !important;
    line-height: 1.5 !important;
    background: transparent !important;
    isolation: isolate !important;
    -webkit-font-smoothing: antialiased !important;
    scrollbar-width: thin !important;
    scrollbar-color: #8aa291 #e8eeea !important;
}

#barcode-management-page::-webkit-scrollbar {
    width: 10px !important;
}

#barcode-management-page::-webkit-scrollbar-track {
    background: #e8eeea !important;
    border-radius: 999px !important;
}

#barcode-management-page::-webkit-scrollbar-thumb {
    background: #8aa291 !important;
    border: 2px solid #e8eeea !important;
    border-radius: 999px !important;
}

#barcode-management-page::-webkit-scrollbar-thumb:hover {
    background: var(--bmp-green-700) !important;
}

#barcode-management-page button,
#barcode-management-page input,
#barcode-management-page select {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#barcode-management-page h1,
#barcode-management-page h2,
#barcode-management-page h3,
#barcode-management-page p {
    margin: 0 !important;
}

#barcode-management-page button:focus-visible,
#barcode-management-page input:focus,
#barcode-management-page select:focus {
    outline: none !important;
    border-color: var(--bmp-green-700) !important;
    box-shadow:
        0 0 0 4px
        rgba(21, 128, 61, 0.14) !important;
}

#barcode-management-page .bmp-header {
    display: flex !important;
    min-height: 104px !important;
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
    border: 1px solid var(--bmp-border) !important;
    border-radius: 14px !important;
    box-shadow:
        0 1px 3px
        rgba(16, 24, 40, 0.07) !important;
}

#barcode-management-page .bmp-header-copy {
    min-width: 0 !important;
}

#barcode-management-page .bmp-kicker {
    display: block !important;
    margin-bottom: 3px !important;
    color: var(--bmp-green-700) !important;
    font-size: 12px !important;
    font-weight: 750 !important;
    letter-spacing: 0.055em !important;
    text-transform: uppercase !important;
}

#barcode-management-page .bmp-title {
    color: var(--bmp-text) !important;
    font-size: 24px !important;
    font-weight: 740 !important;
    line-height: 1.2 !important;
    letter-spacing: -0.02em !important;
}

#barcode-management-page .bmp-subtitle {
    margin-top: 4px !important;
    color: var(--bmp-muted) !important;
    font-size: 14px !important;
}

#barcode-management-page .bmp-header-actions {
    display: flex !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    gap: 8px !important;
}

#barcode-management-page .bmp-button {
    display: inline-flex !important;
    min-height: 40px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;
    padding: 7px 11px !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#barcode-management-page .bmp-button svg {
    width: 16px !important;
    height: 16px !important;
}

#barcode-management-page .bmp-button:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

#barcode-management-page .bmp-primary-button {
    color: #ffffff !important;
    background: var(--bmp-green-700) !important;
    border: 1px solid var(--bmp-green-700) !important;
    box-shadow:
        0 4px 12px
        rgba(21, 128, 61, 0.18) !important;
}

#barcode-management-page .bmp-primary-button:hover:not(:disabled) {
    background: var(--bmp-green-800) !important;
    border-color: var(--bmp-green-800) !important;
}

#barcode-management-page .bmp-secondary-button {
    color: var(--bmp-green-900) !important;
    background: #ffffff !important;
    border: 1px solid #b8dfc3 !important;
}

#barcode-management-page .bmp-secondary-button:hover:not(:disabled) {
    color: #ffffff !important;
    background: var(--bmp-green-800) !important;
    border-color: var(--bmp-green-800) !important;
}

#barcode-management-page .bmp-summary-grid {
    display: grid !important;
    grid-template-columns:
        repeat(4, minmax(0, 1fr)) !important;
    gap: 10px !important;
}

#barcode-management-page .bmp-summary-card {
    position: relative !important;
    display: flex !important;
    min-width: 0 !important;
    min-height: 88px !important;
    flex-direction: column !important;
    justify-content: center !important;
    gap: 3px !important;
    padding: 12px 13px 12px 17px !important;
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid var(--bmp-border) !important;
    border-radius: 11px !important;
    box-shadow:
        0 1px 2px
        rgba(16, 24, 40, 0.04) !important;
}

#barcode-management-page .bmp-summary-card::before {
    position: absolute !important;
    inset: 0 auto 0 0 !important;
    width: 4px !important;
    content: "" !important;
    background: var(--bmp-green-700) !important;
}

#barcode-management-page .bmp-summary-card.assigned::before {
    background: var(--bmp-blue-700) !important;
}

#barcode-management-page .bmp-summary-card.missing::before {
    background: var(--bmp-red-700) !important;
}

#barcode-management-page .bmp-summary-card.selected::before {
    background: var(--bmp-amber-700) !important;
}

#barcode-management-page .bmp-summary-label {
    color: var(--bmp-muted) !important;
    font-size: 12px !important;
    font-weight: 650 !important;
}

#barcode-management-page .bmp-summary-value {
    color: var(--bmp-green-900) !important;
    font-size: 23px !important;
    font-weight: 750 !important;
    line-height: 1.2 !important;
}

#barcode-management-page .bmp-summary-card.assigned .bmp-summary-value {
    color: var(--bmp-blue-700) !important;
}

#barcode-management-page .bmp-summary-card.missing .bmp-summary-value {
    color: var(--bmp-red-700) !important;
}

#barcode-management-page .bmp-summary-card.selected .bmp-summary-value {
    color: var(--bmp-amber-700) !important;
}

#barcode-management-page .bmp-message {
    display: flex !important;
    min-height: 48px !important;
    align-items: center !important;
    gap: 9px !important;
    padding: 10px 12px !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    border-radius: 10px !important;
}

#barcode-management-page .bmp-message.success {
    color: var(--bmp-green-900) !important;
    background: var(--bmp-green-50) !important;
    border: 1px solid #b8dfc3 !important;
}

#barcode-management-page .bmp-message.error {
    color: var(--bmp-red-700) !important;
    background: var(--bmp-red-50) !important;
    border: 1px solid #f3b5af !important;
}

#barcode-management-page .bmp-message > svg {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
}

#barcode-management-page .bmp-message-text {
    min-width: 0 !important;
    flex: 1 !important;
}

#barcode-management-page .bmp-message-close {
    display: grid !important;
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
    place-items: center !important;
    padding: 0 !important;
    color: inherit !important;
    background: rgba(255, 255, 255, 0.7) !important;
    border: 1px solid currentColor !important;
    border-radius: 7px !important;
    cursor: pointer !important;
}

#barcode-management-page .bmp-message-close svg {
    width: 14px !important;
    height: 14px !important;
}

#barcode-management-page .bmp-main-layout {
    display: grid !important;
    grid-template-columns:
        minmax(0, 1fr)
        minmax(300px, 350px) !important;
    align-items: start !important;
    gap: 12px !important;
}

#barcode-management-page .bmp-panel {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid var(--bmp-border) !important;
    border-radius: 12px !important;
    box-shadow:
        0 1px 3px
        rgba(16, 24, 40, 0.05) !important;
}

#barcode-management-page .bmp-toolbar {
    display: grid !important;
    grid-template-columns:
        minmax(0, 1fr)
        170px
        110px !important;
    align-items: end !important;
    gap: 10px !important;
    padding: 13px !important;
    border-bottom: 1px solid var(--bmp-border) !important;
}

#barcode-management-page .bmp-field {
    display: grid !important;
    gap: 5px !important;
}

#barcode-management-page .bmp-field-label {
    color: var(--bmp-text-secondary) !important;
    font-size: 12px !important;
    font-weight: 650 !important;
}

#barcode-management-page .bmp-search-wrapper {
    position: relative !important;
}

#barcode-management-page .bmp-search-icon {
    position: absolute !important;
    top: 50% !important;
    left: 12px !important;
    z-index: 2 !important;
    display: grid !important;
    width: 18px !important;
    height: 18px !important;
    place-items: center !important;
    color: var(--bmp-muted) !important;
    transform: translateY(-50%) !important;
    pointer-events: none !important;
}

#barcode-management-page .bmp-search-icon svg {
    display: block !important;
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
    max-width: 18px !important;
    min-height: 18px !important;
    max-height: 18px !important;
}

#barcode-management-page .bmp-input,
#barcode-management-page .bmp-select {
    display: block !important;
    width: 100% !important;
    height: 42px !important;
    min-height: 42px !important;
    color: var(--bmp-text) !important;
    font-size: 15px !important;
    font-weight: 500 !important;
    outline: none !important;
    background: #ffffff !important;
    border: 1px solid var(--bmp-border-strong) !important;
    border-radius: 9px !important;
}

#barcode-management-page .bmp-input {
    padding: 0 10px !important;
}

#barcode-management-page .bmp-search-input {
    padding: 0 42px 0 40px !important;
    background: #f8faf9 !important;
}

#barcode-management-page .bmp-input::placeholder {
    color: #7a8696 !important;
    opacity: 1 !important;
}

#barcode-management-page .bmp-select {
    padding: 0 9px !important;
    cursor: pointer !important;
}

#barcode-management-page .bmp-clear-search {
    position: absolute !important;
    top: 50% !important;
    right: 5px !important;
    z-index: 3 !important;
    display: grid !important;
    width: 32px !important;
    height: 32px !important;
    place-items: center !important;
    padding: 0 !important;
    color: var(--bmp-muted) !important;
    background: transparent !important;
    border: 0 !important;
    border-radius: 7px !important;
    transform: translateY(-50%) !important;
    cursor: pointer !important;
}

#barcode-management-page .bmp-clear-search:hover {
    color: var(--bmp-text) !important;
    background: #eaf0ec !important;
}

#barcode-management-page .bmp-clear-search svg {
    width: 16px !important;
    height: 16px !important;
}

#barcode-management-page .bmp-selection-bar {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    padding: 9px 13px !important;
    color: var(--bmp-green-900) !important;
    background: var(--bmp-green-50) !important;
    border-bottom: 1px solid #b8dfc3 !important;
}

#barcode-management-page .bmp-selection-copy {
    min-width: 0 !important;
}

#barcode-management-page .bmp-selection-title {
    display: block !important;
    font-size: 13px !important;
    font-weight: 700 !important;
}

#barcode-management-page .bmp-selection-hint {
    display: block !important;
    margin-top: 1px !important;
    color: #477054 !important;
    font-size: 12px !important;
}

#barcode-management-page .bmp-selection-button {
    min-height: 34px !important;
    padding: 5px 8px !important;
    font-size: 12px !important;
}

#barcode-management-page .bmp-product-list {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 9px !important;
    padding: 10px !important;
    background: var(--bmp-page) !important;
}

#barcode-management-page .bmp-product-card {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid var(--bmp-border) !important;
    border-radius: 10px !important;
}

#barcode-management-page .bmp-product-card.selected {
    border-color: #8fc29d !important;
    box-shadow:
        0 0 0 2px
        rgba(21, 128, 61, 0.08) !important;
}

#barcode-management-page .bmp-product-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    padding: 10px 11px !important;
    border-bottom: 1px solid #e7ece8 !important;
}

#barcode-management-page .bmp-product-main {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 9px !important;
}

#barcode-management-page .bmp-checkbox {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
    margin: 0 !important;
    accent-color: var(--bmp-green-700) !important;
    cursor: pointer !important;
}

#barcode-management-page .bmp-checkbox:disabled {
    cursor: not-allowed !important;
}

#barcode-management-page .bmp-product-icon {
    display: grid !important;
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
    place-items: center !important;
    color: #ffffff !important;
    background:
        linear-gradient(
            145deg,
            var(--bmp-green-900),
            var(--bmp-green-700)
        ) !important;
    border-radius: 9px !important;
}

#barcode-management-page .bmp-product-icon svg {
    width: 18px !important;
    height: 18px !important;
}

#barcode-management-page .bmp-product-copy {
    min-width: 0 !important;
}

#barcode-management-page .bmp-product-name {
    display: block !important;
    overflow: hidden !important;
    color: var(--bmp-text) !important;
    font-size: 16px !important;
    font-weight: 700 !important;
    line-height: 1.3 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#barcode-management-page .bmp-product-meta {
    display: block !important;
    margin-top: 2px !important;
    overflow: hidden !important;
    color: var(--bmp-muted) !important;
    font-size: 12px !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#barcode-management-page .bmp-status-badge {
    display: inline-flex !important;
    min-height: 27px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 4px 7px !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    border-radius: 999px !important;
}

#barcode-management-page .bmp-status-badge.assigned {
    color: var(--bmp-green-900) !important;
    background: var(--bmp-green-50) !important;
    border: 1px solid #b8dfc3 !important;
}

#barcode-management-page .bmp-status-badge.missing {
    color: var(--bmp-red-700) !important;
    background: var(--bmp-red-50) !important;
    border: 1px solid #f3b5af !important;
}

#barcode-management-page .bmp-product-content {
    display: grid !important;
    grid-template-columns:
        minmax(200px, 0.8fr)
        minmax(220px, 1fr)
        auto !important;
    align-items: end !important;
    gap: 10px !important;
    padding: 10px 11px !important;
}

#barcode-management-page .bmp-preview-box {
    display: flex !important;
    min-width: 0 !important;
    min-height: 58px !important;
    max-height: 68px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 7px !important;
    overflow: hidden !important;
    background: #f8faf9 !important;
    border: 1px solid #e1e7e2 !important;
    border-radius: 8px !important;
}

#barcode-management-page .bmp-preview-box svg {
    display: block !important;
    width: auto !important;
    max-width: 180px !important;
    height: auto !important;
    max-height: 42px !important;
}

#barcode-management-page .bmp-preview-box .bmp-table-preview {
    width: min(100%, 180px) !important;
    max-width: 180px !important;
    max-height: 42px !important;
}

#barcode-management-page .bmp-no-preview {
    display: inline-flex !important;
    align-items: center !important;
    gap: 5px !important;
    color: var(--bmp-muted) !important;
    font-size: 12px !important;
    font-weight: 600 !important;
}

#barcode-management-page .bmp-no-preview svg {
    width: 15px !important;
    height: 15px !important;
}

#barcode-management-page .bmp-barcode-editor {
    display: grid !important;
    min-width: 0 !important;
    gap: 5px !important;
}

#barcode-management-page .bmp-editor-hint {
    color: var(--bmp-muted) !important;
    font-size: 11px !important;
}

#barcode-management-page .bmp-row-actions {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 7px !important;
}

#barcode-management-page .bmp-row-button {
    min-width: 104px !important;
    min-height: 38px !important;
    padding: 6px 9px !important;
    font-size: 13px !important;
}

#barcode-management-page .bmp-spinner-inline {
    width: 14px !important;
    height: 14px !important;
    border: 2px solid currentColor !important;
    border-right-color: transparent !important;
    border-radius: 50% !important;
    animation: bmp-spin 700ms linear infinite !important;
}

#barcode-management-page .bmp-pagination {
    display: flex !important;
    min-height: 58px !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    padding: 9px 12px !important;
    border-top: 1px solid var(--bmp-border) !important;
}

#barcode-management-page .bmp-pagination-info {
    color: var(--bmp-muted) !important;
    font-size: 12px !important;
}

#barcode-management-page .bmp-pagination-info strong {
    color: var(--bmp-text-secondary) !important;
    font-weight: 700 !important;
}

#barcode-management-page .bmp-pagination-actions {
    display: flex !important;
    align-items: center !important;
    gap: 7px !important;
}

#barcode-management-page .bmp-page-number {
    display: inline-flex !important;
    min-height: 34px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 5px 8px !important;
    color: var(--bmp-text-secondary) !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
    background: #f8faf9 !important;
    border: 1px solid #e4e9e5 !important;
    border-radius: 7px !important;
}

#barcode-management-page .bmp-page-button {
    min-height: 34px !important;
    padding: 5px 8px !important;
    font-size: 12px !important;
}

#barcode-management-page .bmp-settings-panel {
    position: sticky !important;
    top: 10px !important;
}

#barcode-management-page .bmp-panel-heading {
    display: flex !important;
    align-items: flex-start !important;
    gap: 9px !important;
    padding: 12px 13px !important;
    border-bottom: 1px solid var(--bmp-border) !important;
}

#barcode-management-page .bmp-panel-heading-icon {
    display: grid !important;
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    place-items: center !important;
    color: var(--bmp-green-900) !important;
    background: var(--bmp-green-50) !important;
    border: 1px solid #b8dfc3 !important;
    border-radius: 8px !important;
}

#barcode-management-page .bmp-panel-heading-icon svg {
    width: 17px !important;
    height: 17px !important;
}

#barcode-management-page .bmp-panel-title {
    color: var(--bmp-text) !important;
    font-size: 17px !important;
    font-weight: 720 !important;
    line-height: 1.3 !important;
}

#barcode-management-page .bmp-panel-description {
    margin-top: 2px !important;
    color: var(--bmp-muted) !important;
    font-size: 12px !important;
}

#barcode-management-page .bmp-settings-form {
    display: flex !important;
    flex-direction: column !important;
    gap: 10px !important;
    padding: 12px !important;
}

#barcode-management-page .bmp-measurement-grid {
    display: grid !important;
    grid-template-columns:
        repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
}

#barcode-management-page .bmp-measurement {
    position: relative !important;
}

#barcode-management-page .bmp-measurement .bmp-input {
    padding-right: 38px !important;
}

#barcode-management-page .bmp-measurement-unit {
    position: absolute !important;
    top: 50% !important;
    right: 10px !important;
    color: var(--bmp-muted) !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    transform: translateY(-50%) !important;
    pointer-events: none !important;
}

#barcode-management-page .bmp-print-options {
    display: grid !important;
    grid-template-columns:
        repeat(2, minmax(0, 1fr)) !important;
    gap: 7px !important;
}

#barcode-management-page .bmp-checkbox-option {
    display: flex !important;
    min-height: 38px !important;
    align-items: center !important;
    gap: 7px !important;
    padding: 7px 8px !important;
    color: var(--bmp-text-secondary) !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    background: #f8faf9 !important;
    border: 1px solid #e1e7e2 !important;
    border-radius: 8px !important;
    cursor: pointer !important;
}

#barcode-management-page .bmp-checkbox-option input {
    width: 16px !important;
    height: 16px !important;
    min-width: 16px !important;
    margin: 0 !important;
    accent-color: var(--bmp-green-700) !important;
}

#barcode-management-page .bmp-print-summary {
    display: grid !important;
    grid-template-columns:
        repeat(2, minmax(0, 1fr)) !important;
    gap: 7px !important;
}

#barcode-management-page .bmp-print-summary-item {
    display: flex !important;
    min-width: 0 !important;
    min-height: 52px !important;
    flex-direction: column !important;
    justify-content: center !important;
    gap: 2px !important;
    padding: 7px 8px !important;
    background: var(--bmp-green-50) !important;
    border: 1px solid #b8dfc3 !important;
    border-radius: 8px !important;
}

#barcode-management-page .bmp-print-summary-item span {
    color: #477054 !important;
    font-size: 11px !important;
    font-weight: 650 !important;
}

#barcode-management-page .bmp-print-summary-item strong {
    color: var(--bmp-green-900) !important;
    font-size: 15px !important;
    font-weight: 720 !important;
}

#barcode-management-page .bmp-print-button {
    width: 100% !important;
    min-height: 42px !important;
}

#barcode-management-page .bmp-label-preview-section {
    display: flex !important;
    flex-direction: column !important;
    border-top: 1px solid var(--bmp-border) !important;
}

#barcode-management-page .bmp-preview-heading {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
    padding: 9px 12px !important;
    color: var(--bmp-text-secondary) !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    background: #f8faf9 !important;
    border-bottom: 1px solid #e1e7e2 !important;
}

#barcode-management-page .bmp-label-preview {
    display: flex !important;
    min-height: 180px !important;
    max-height: 260px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 14px !important;
    overflow: auto !important;
    background: #edf2ee !important;
}

#barcode-management-page .bmp-label-preview-scale {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    max-width: 100% !important;
    transform-origin: center center !important;
    zoom: 0.76 !important;
}

#barcode-management-page .bmp-state {
    display: flex !important;
    min-height: 250px !important;
    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 8px !important;
    padding: 25px !important;
    color: var(--bmp-muted) !important;
    text-align: center !important;
    background: #ffffff !important;
    border: 1px dashed var(--bmp-border-strong) !important;
    border-radius: 9px !important;
}

#barcode-management-page .bmp-state-icon {
    display: grid !important;
    width: 46px !important;
    height: 46px !important;
    place-items: center !important;
    color: var(--bmp-green-700) !important;
    background: var(--bmp-green-50) !important;
    border: 1px solid #b8dfc3 !important;
    border-radius: 11px !important;
}

#barcode-management-page .bmp-state-icon svg {
    width: 22px !important;
    height: 22px !important;
}

#barcode-management-page .bmp-state-title {
    color: var(--bmp-text) !important;
    font-size: 17px !important;
    font-weight: 720 !important;
}

#barcode-management-page .bmp-state-message {
    max-width: 420px !important;
    font-size: 13px !important;
}

#barcode-management-page .bmp-spinner {
    width: 36px !important;
    height: 36px !important;
    border: 4px solid var(--bmp-green-100) !important;
    border-top-color: var(--bmp-green-700) !important;
    border-radius: 50% !important;
    animation: bmp-spin 700ms linear infinite !important;
}

@keyframes bmp-spin {
    to {
        transform: rotate(360deg);
    }
}

#barcode-management-page .bmp-print-area {
    display: none !important;
}

@media (max-width: 1120px) {
    #barcode-management-page .bmp-main-layout {
        grid-template-columns: 1fr !important;
    }

    #barcode-management-page .bmp-settings-panel {
        position: static !important;
    }
}

@media (max-width: 850px) {
    #barcode-management-page .bmp-summary-grid {
        grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;
    }

    #barcode-management-page .bmp-toolbar {
        grid-template-columns:
            minmax(0, 1fr)
            170px !important;
    }

    #barcode-management-page .bmp-toolbar .bmp-field:last-child {
        grid-column: 1 / -1 !important;
    }

    #barcode-management-page .bmp-product-content {
        grid-template-columns:
            minmax(180px, 0.8fr)
            minmax(210px, 1fr) !important;
    }

    #barcode-management-page .bmp-row-actions {
        grid-column: 1 / -1 !important;
    }
}

@media (max-width: 700px) {
    #barcode-management-page {
        height: calc(100vh - 70px) !important;
        height: calc(100dvh - 70px) !important;
        max-height: calc(100vh - 70px) !important;
        max-height: calc(100dvh - 70px) !important;
        padding: 0 4px 30px 0 !important;
    }

    #barcode-management-page .bmp-header {
        align-items: stretch !important;
        flex-direction: column !important;
        padding: 16px !important;
    }

    #barcode-management-page .bmp-title {
        font-size: 22px !important;
    }

    #barcode-management-page .bmp-header-actions {
        display: grid !important;
        grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;
    }

    #barcode-management-page .bmp-header-actions .bmp-button {
        width: 100% !important;
    }

    #barcode-management-page .bmp-toolbar {
        grid-template-columns: 1fr !important;
    }

    #barcode-management-page .bmp-toolbar .bmp-field:last-child {
        grid-column: auto !important;
    }

    #barcode-management-page .bmp-selection-bar {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #barcode-management-page .bmp-selection-button {
        width: 100% !important;
    }

    #barcode-management-page .bmp-product-header {
        align-items: flex-start !important;
        flex-direction: column !important;
    }

    #barcode-management-page .bmp-status-badge {
        width: 100% !important;
    }

    #barcode-management-page .bmp-product-content {
        grid-template-columns: 1fr !important;
        align-items: stretch !important;
    }

    #barcode-management-page .bmp-row-actions {
        display: grid !important;
        grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;
        grid-column: auto !important;
    }

    #barcode-management-page .bmp-row-button {
        width: 100% !important;
        min-width: 0 !important;
    }

    #barcode-management-page .bmp-pagination {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #barcode-management-page .bmp-pagination-actions {
        display: grid !important;
        grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;
    }

    #barcode-management-page .bmp-page-number {
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;
    }

    #barcode-management-page .bmp-page-button {
        width: 100% !important;
    }
}

@media (max-width: 480px) {
    #barcode-management-page .bmp-summary-grid,
    #barcode-management-page .bmp-header-actions,
    #barcode-management-page .bmp-measurement-grid,
    #barcode-management-page .bmp-print-options,
    #barcode-management-page .bmp-print-summary,
    #barcode-management-page .bmp-row-actions {
        grid-template-columns: 1fr !important;
    }

    #barcode-management-page .bmp-message {
        align-items: flex-start !important;
    }

    #barcode-management-page .bmp-product-name {
        white-space: normal !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #barcode-management-page *,
    #barcode-management-page *::before,
    #barcode-management-page *::after {
        transition: none !important;
        scroll-behavior: auto !important;
    }

    #barcode-management-page .bmp-spinner,
    #barcode-management-page .bmp-spinner-inline {
        animation-duration: 1.2s !important;
    }
}

@media print {
    body * {
        visibility: hidden !important;
    }

    #barcode-management-page,
    #barcode-management-page .bmp-print-area,
    #barcode-management-page .bmp-print-area * {
        visibility: visible !important;
    }

    #barcode-management-page {
        position: static !important;
        width: auto !important;
        height: auto !important;
        max-height: none !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
    }

    #barcode-management-page > :not(.bmp-print-area) {
        display: none !important;
    }

    #barcode-management-page .bmp-print-area {
        position: absolute !important;
        inset: 0 auto auto 0 !important;
        display: grid !important;
        width: 100% !important;
        gap: 2mm !important;
        margin: 0 !important;
        padding: 0 !important;
    }
}
`;

export default function BarcodeManagementPage() {
    const {
        token,
    } = useAuth();

    const searchInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const requestIdRef = useRef(0);

    const [
        products,
        setProducts,
    ] = useState<BarcodeProduct[]>([]);

    const [
        summary,
        setSummary,
    ] = useState<BarcodeSummary>(
        emptySummary,
    );

    const [
        pagination,
        setPagination,
    ] = useState<PosPaginationMeta>(
        emptyPagination,
    );

    const [
        businessSettings,
        setBusinessSettings,
    ] = useState<BusinessSetting>(
        defaultBusinessSetting,
    );

    const [
        labelSettings,
        setLabelSettings,
    ] = useState<BarcodeLabelSettings>(
        defaultLabelSettings,
    );

    const [
        barcodeDrafts,
        setBarcodeDrafts,
    ] = useState<Record<number, string>>({});

    const [
        selectedIds,
        setSelectedIds,
    ] = useState<Set<number>>(
        new Set(),
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
        barcodeStatus,
        setBarcodeStatus,
    ] = useState('all');

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
        isGenerating,
        setIsGenerating,
    ] = useState(false);

    const [
        busyProductId,
        setBusyProductId,
    ] = useState<number | null>(null);

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const loadBusinessSettings =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                try {
                    const response =
                        await getBusinessSettings(
                            token,
                        );

                    setBusinessSettings(
                        response.data,
                    );
                } catch {
                    setBusinessSettings(
                        defaultBusinessSetting,
                    );
                }
            },
            [token],
        );

    const loadProducts =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                const requestId =
                    requestIdRef.current + 1;

                requestIdRef.current = requestId;

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getBarcodeProducts(
                            token,
                            {
                                search,
                                barcodeStatus,
                                page,
                                perPage,
                            },
                        );

                    if (
                        requestIdRef.current
                        !== requestId
                    ) {
                        return;
                    }

                    setProducts(response.data);
                    setSummary(response.summary);
                    setPagination(response.meta);

                    setBarcodeDrafts(
                        Object.fromEntries(
                            response.data.map(
                                (product) => [
                                    product.id,
                                    product.barcode ?? '',
                                ],
                            ),
                        ),
                    );

                    setSelectedIds(new Set());
                } catch (error) {
                    if (
                        requestIdRef.current
                        !== requestId
                    ) {
                        return;
                    }

                    setProducts([]);
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load barcode products.',
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
                search,
                barcodeStatus,
                page,
                perPage,
            ],
        );

    useEffect(() => {
        void loadBusinessSettings();
    }, [loadBusinessSettings]);

    useEffect(() => {
        void loadProducts();
    }, [loadProducts]);

    useEffect(() => {
        const timeout = window.setTimeout(
            () => {
                setSearch(searchInput.trim());
                setPage(1);
            },
            300,
        );

        return () => {
            window.clearTimeout(timeout);
        };
    }, [searchInput]);

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeout = window.setTimeout(
            () => {
                setSuccessMessage('');
            },
            3500,
        );

        return () => {
            window.clearTimeout(timeout);
        };
    }, [successMessage]);

    const selectedProducts =
        useMemo(
            () => products.filter(
                (product) => (
                    selectedIds.has(product.id)
                    && Boolean(product.barcode)
                ),
            ),
            [
                products,
                selectedIds,
            ],
        );

    const printableProducts =
        useMemo(
            () => products.filter(
                (product) => (
                    Boolean(product.barcode)
                ),
            ),
            [products],
        );

    const previewProduct =
        useMemo(
            () => (
                selectedProducts[0]
                ?? printableProducts[0]
                ?? null
            ),
            [
                printableProducts,
                selectedProducts,
            ],
        );

    const allPrintableSelected =
        printableProducts.length > 0
        && printableProducts.every(
            (product) => (
                selectedIds.has(product.id)
            ),
        );

    const totalLabels =
        selectedProducts.length
        * labelSettings.copies;

    const toggleSelection = (
        productId: number,
    ): void => {
        setSelectedIds(
            (current) => {
                const next = new Set(current);

                if (next.has(productId)) {
                    next.delete(productId);
                } else {
                    next.add(productId);
                }

                return next;
            },
        );
    };

    const toggleVisibleSelection = (): void => {
        if (allPrintableSelected) {
            setSelectedIds(new Set());
            return;
        }

        setSelectedIds(
            new Set(
                printableProducts.map(
                    (product) => product.id,
                ),
            ),
        );
    };

    const clearSearch = (): void => {
        setSearchInput('');
        setSearch('');
        setPage(1);
        searchInputRef.current?.focus();
    };

    const saveBarcode =
        async (
            product: BarcodeProduct,
        ): Promise<void> => {
            if (
                !token
                || busyProductId !== null
            ) {
                return;
            }

            setBusyProductId(product.id);
            setPageError('');
            setSuccessMessage('');

            try {
                const response =
                    await updateProductBarcode(
                        token,
                        product.id,
                        barcodeDrafts[product.id]
                        ?? '',
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Barcode updated successfully.',
                );

                await loadProducts();
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to update the product barcode.',
                );
            } finally {
                setBusyProductId(null);
            }
        };

    const generateOne =
        async (
            product: BarcodeProduct,
        ): Promise<void> => {
            if (
                !token
                || busyProductId !== null
            ) {
                return;
            }

            setBusyProductId(product.id);
            setPageError('');
            setSuccessMessage('');

            try {
                const response =
                    await generateProductBarcode(
                        token,
                        product.id,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Barcode generated successfully.',
                );

                await loadProducts();
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to generate the product barcode.',
                );
            } finally {
                setBusyProductId(null);
            }
        };

    const generateMissing =
        async (): Promise<void> => {
            if (
                !token
                || isGenerating
            ) {
                return;
            }

            const confirmed = window.confirm(
                'Generate barcodes for every product currently missing a barcode?',
            );

            if (!confirmed) {
                return;
            }

            setIsGenerating(true);
            setPageError('');
            setSuccessMessage('');

            try {
                const response =
                    await generateMissingBarcodes(
                        token,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Missing barcodes generated successfully.',
                );

                await loadProducts();
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to generate missing barcodes.',
                );
            } finally {
                setIsGenerating(false);
            }
        };

    const printLabels = (): void => {
        if (selectedProducts.length === 0) {
            setPageError(
                'Select at least one product with a barcode.',
            );
            return;
        }

        setPageError('');

        window.setTimeout(
            () => {
                window.print();
            },
            100,
        );
    };

    return (
        <div id="barcode-management-page">
            <style>
                {barcodePageStyles}
            </style>

            <header className="bmp-header">
                <div className="bmp-header-copy">
                    <span className="bmp-kicker">
                        Product Identification
                    </span>

                    <h1 className="bmp-title">
                        Barcode Management
                    </h1>

                    <p className="bmp-subtitle">
                        Assign Code 128 barcodes, select
                        products and print ready-to-use labels.
                    </p>
                </div>

                <div className="bmp-header-actions">
                    <button
                        type="button"
                        className="bmp-button bmp-secondary-button"
                        disabled={
                            isLoading
                            || isGenerating
                        }
                        onClick={() => {
                            void loadProducts();
                        }}
                    >
                        <Icon name="refresh" />

                        {isLoading
                            ? 'Refreshing...'
                            : 'Refresh'}
                    </button>

                    <button
                        type="button"
                        className="bmp-button bmp-primary-button"
                        disabled={
                            isGenerating
                            || summary.missing_barcodes === 0
                        }
                        onClick={() => {
                            void generateMissing();
                        }}
                    >
                        {isGenerating ? (
                            <span className="bmp-spinner-inline" />
                        ) : (
                            <Icon name="generate" />
                        )}

                        {isGenerating
                            ? 'Generating...'
                            : 'Generate Missing'}
                    </button>
                </div>
            </header>

            <section className="bmp-summary-grid">
                <article className="bmp-summary-card">
                    <span className="bmp-summary-label">
                        Total Products
                    </span>
                    <strong className="bmp-summary-value">
                        {summary.total_products}
                    </strong>
                </article>

                <article className="bmp-summary-card assigned">
                    <span className="bmp-summary-label">
                        Barcodes Assigned
                    </span>
                    <strong className="bmp-summary-value">
                        {summary.assigned_barcodes}
                    </strong>
                </article>

                <article className="bmp-summary-card missing">
                    <span className="bmp-summary-label">
                        Barcodes Missing
                    </span>
                    <strong className="bmp-summary-value">
                        {summary.missing_barcodes}
                    </strong>
                </article>

                <article className="bmp-summary-card selected">
                    <span className="bmp-summary-label">
                        Labels Ready to Print
                    </span>
                    <strong className="bmp-summary-value">
                        {totalLabels}
                    </strong>
                </article>
            </section>

            {successMessage && (
                <div
                    className="bmp-message success"
                    role="status"
                >
                    <Icon name="check" />

                    <span className="bmp-message-text">
                        {successMessage}
                    </span>

                    <button
                        type="button"
                        className="bmp-message-close"
                        aria-label="Close success message"
                        onClick={() => {
                            setSuccessMessage('');
                        }}
                    >
                        <Icon name="close" />
                    </button>
                </div>
            )}

            {pageError && (
                <div
                    className="bmp-message error"
                    role="alert"
                >
                    <Icon name="alert" />

                    <span className="bmp-message-text">
                        {pageError}
                    </span>

                    <button
                        type="button"
                        className="bmp-message-close"
                        aria-label="Close error message"
                        onClick={() => {
                            setPageError('');
                        }}
                    >
                        <Icon name="close" />
                    </button>
                </div>
            )}

            <section className="bmp-main-layout">
                <main className="bmp-panel">
                    <div className="bmp-toolbar">
                        <label className="bmp-field">
                            <span className="bmp-field-label">
                                Search Products
                            </span>

                            <span className="bmp-search-wrapper">
                                <span
                                    className="bmp-search-icon"
                                    aria-hidden="true"
                                >
                                    <Icon name="search" />
                                </span>

                                <input
                                    ref={searchInputRef}
                                    type="search"
                                    className="bmp-input bmp-search-input"
                                    value={searchInput}
                                    autoComplete="off"
                                    placeholder="Search name, SKU or barcode"
                                    aria-label="Search barcode products"
                                    onChange={(event) => {
                                        setSearchInput(
                                            event.target.value,
                                        );
                                    }}
                                />

                                {searchInput && (
                                    <button
                                        type="button"
                                        className="bmp-clear-search"
                                        aria-label="Clear barcode search"
                                        onClick={clearSearch}
                                    >
                                        <Icon name="close" />
                                    </button>
                                )}
                            </span>
                        </label>

                        <label className="bmp-field">
                            <span className="bmp-field-label">
                                Barcode Status
                            </span>

                            <select
                                className="bmp-select"
                                value={barcodeStatus}
                                onChange={(event) => {
                                    setBarcodeStatus(
                                        event.target.value,
                                    );
                                    setPage(1);
                                }}
                            >
                                <option value="all">
                                    All Products
                                </option>
                                <option value="assigned">
                                    Assigned
                                </option>
                                <option value="missing">
                                    Missing
                                </option>
                            </select>
                        </label>

                        <label className="bmp-field">
                            <span className="bmp-field-label">
                                Rows
                            </span>

                            <select
                                className="bmp-select"
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

                    <div className="bmp-selection-bar">
                        <div className="bmp-selection-copy">
                            <strong className="bmp-selection-title">
                                {selectedProducts.length}
                                {' '}
                                {selectedProducts.length === 1
                                    ? 'product selected'
                                    : 'products selected'}
                            </strong>

                            <span className="bmp-selection-hint">
                                Only products with assigned
                                barcodes can be selected for printing.
                            </span>
                        </div>

                        <button
                            type="button"
                            className="bmp-button bmp-secondary-button bmp-selection-button"
                            disabled={
                                printableProducts.length === 0
                            }
                            onClick={toggleVisibleSelection}
                        >
                            <Icon name="check" />

                            {allPrintableSelected
                                ? 'Clear Selection'
                                : 'Select Printable'}
                        </button>
                    </div>

                    <div className="bmp-product-list">
                        {isLoading ? (
                            <div
                                className="bmp-state"
                                aria-live="polite"
                            >
                                <div className="bmp-spinner" />

                                <strong className="bmp-state-title">
                                    Loading Products
                                </strong>

                                <span className="bmp-state-message">
                                    Retrieving barcode products and
                                    their current assignment status.
                                </span>
                            </div>
                        ) : products.length === 0 ? (
                            <div className="bmp-state">
                                <span className="bmp-state-icon">
                                    <Icon name="barcode" />
                                </span>

                                <strong className="bmp-state-title">
                                    No Matching Products
                                </strong>

                                <span className="bmp-state-message">
                                    Change the search text or
                                    barcode-status filter.
                                </span>
                            </div>
                        ) : products.map(
                            (product) => {
                                const draftValue =
                                    barcodeDrafts[product.id]
                                    ?? '';

                                const savedValue =
                                    product.barcode
                                    ?? '';

                                const isDirty =
                                    draftValue.trim()
                                    !== savedValue;

                                const isBusy =
                                    busyProductId
                                    === product.id;

                                const isSelected =
                                    selectedIds.has(
                                        product.id,
                                    );

                                return (
                                    <article
                                        key={product.id}
                                        className={
                                            isSelected
                                                ? 'bmp-product-card selected'
                                                : 'bmp-product-card'
                                        }
                                    >
                                        <header className="bmp-product-header">
                                            <div className="bmp-product-main">
                                                <input
                                                    type="checkbox"
                                                    className="bmp-checkbox"
                                                    checked={isSelected}
                                                    disabled={
                                                        !product.barcode
                                                    }
                                                    aria-label={
                                                        `Select ${product.name} for printing`
                                                    }
                                                    onChange={() => {
                                                        toggleSelection(
                                                            product.id,
                                                        );
                                                    }}
                                                />

                                                <span className="bmp-product-icon">
                                                    <Icon name="package" />
                                                </span>

                                                <span className="bmp-product-copy">
                                                    <strong
                                                        className="bmp-product-name"
                                                        title={product.name}
                                                    >
                                                        {product.name}
                                                    </strong>

                                                    <span className="bmp-product-meta">
                                                        {product.category?.name
                                                            ?? 'No category'}
                                                        {' · '}
                                                        {product.sku
                                                            ?? 'No SKU'}
                                                    </span>
                                                </span>
                                            </div>

                                            <span
                                                className={
                                                    product.barcode
                                                        ? 'bmp-status-badge assigned'
                                                        : 'bmp-status-badge missing'
                                                }
                                            >
                                                {product.barcode
                                                    ? 'Barcode Assigned'
                                                    : 'Barcode Missing'}
                                            </span>
                                        </header>

                                        <div className="bmp-product-content">
                                            <div className="bmp-preview-box">
                                                {product.barcode ? (
                                                    <Code128Barcode
                                                        value={product.barcode}
                                                        height={32}
                                                        showText
                                                        className="bmp-table-preview"
                                                    />
                                                ) : (
                                                    <span className="bmp-no-preview">
                                                        <Icon name="barcode" />
                                                        No barcode preview
                                                    </span>
                                                )}
                                            </div>

                                            <label className="bmp-barcode-editor">
                                                <span className="bmp-field-label">
                                                    Barcode Value
                                                </span>

                                                <input
                                                    id={`barcode-${product.id}`}
                                                    className="bmp-input"
                                                    maxLength={64}
                                                    value={draftValue}
                                                    autoComplete="off"
                                                    placeholder="Enter or generate barcode"
                                                    disabled={isBusy}
                                                    onChange={(event) => {
                                                        setBarcodeDrafts(
                                                            (current) => ({
                                                                ...current,
                                                                [product.id]:
                                                                    event.target.value,
                                                            }),
                                                        );
                                                    }}
                                                />

                                                <span className="bmp-editor-hint">
                                                    Save after editing the value.
                                                </span>
                                            </label>

                                            <div className="bmp-row-actions">
                                                <button
                                                    type="button"
                                                    className="bmp-button bmp-primary-button bmp-row-button"
                                                    disabled={
                                                        busyProductId !== null
                                                        || !isDirty
                                                    }
                                                    onClick={() => {
                                                        void saveBarcode(
                                                            product,
                                                        );
                                                    }}
                                                >
                                                    {isBusy ? (
                                                        <span className="bmp-spinner-inline" />
                                                    ) : (
                                                        <Icon name="save" />
                                                    )}

                                                    {isBusy
                                                        ? 'Saving...'
                                                        : 'Save Barcode'}
                                                </button>

                                                {!product.barcode && (
                                                    <button
                                                        type="button"
                                                        className="bmp-button bmp-secondary-button bmp-row-button"
                                                        disabled={
                                                            busyProductId !== null
                                                        }
                                                        onClick={() => {
                                                            void generateOne(
                                                                product,
                                                            );
                                                        }}
                                                    >
                                                        {isBusy ? (
                                                            <span className="bmp-spinner-inline" />
                                                        ) : (
                                                            <Icon name="generate" />
                                                        )}

                                                        {isBusy
                                                            ? 'Generating...'
                                                            : 'Generate'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            },
                        )}
                    </div>

                    {!isLoading
                        && pagination.total > 0 && (
                            <footer className="bmp-pagination">
                                <p className="bmp-pagination-info">
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

                                <div className="bmp-pagination-actions">
                                    <button
                                        type="button"
                                        className="bmp-button bmp-secondary-button bmp-page-button"
                                        disabled={
                                            pagination.current_page <= 1
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
                                        <Icon name="chevron-left" />
                                        Previous
                                    </button>

                                    <span className="bmp-page-number">
                                        Page
                                        {' '}
                                        {pagination.current_page}
                                        {' '}of{' '}
                                        {pagination.last_page}
                                    </span>

                                    <button
                                        type="button"
                                        className="bmp-button bmp-secondary-button bmp-page-button"
                                        disabled={
                                            pagination.current_page
                                            >= pagination.last_page
                                        }
                                        onClick={() => {
                                            setPage(
                                                (current) =>
                                                    Math.min(
                                                        pagination.last_page,
                                                        current + 1,
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
                </main>

                <aside className="bmp-panel bmp-settings-panel">
                    <header className="bmp-panel-heading">
                        <span className="bmp-panel-heading-icon">
                            <Icon name="settings" />
                        </span>

                        <div>
                            <h2 className="bmp-panel-title">
                                Label Printing
                            </h2>

                            <p className="bmp-panel-description">
                                Configure label size, content
                                and copies before printing.
                            </p>
                        </div>
                    </header>

                    <div className="bmp-settings-form">
                        <div className="bmp-measurement-grid">
                            <label className="bmp-field">
                                <span className="bmp-field-label">
                                    Label Width
                                </span>

                                <span className="bmp-measurement">
                                    <input
                                        type="number"
                                        className="bmp-input"
                                        min="25"
                                        max="100"
                                        step="1"
                                        value={
                                            labelSettings.width_mm
                                        }
                                        onChange={(event) => {
                                            setLabelSettings(
                                                (current) => ({
                                                    ...current,
                                                    width_mm:
                                                        Number(
                                                            event.target.value,
                                                        ),
                                                }),
                                            );
                                        }}
                                    />

                                    <strong className="bmp-measurement-unit">
                                        mm
                                    </strong>
                                </span>
                            </label>

                            <label className="bmp-field">
                                <span className="bmp-field-label">
                                    Label Height
                                </span>

                                <span className="bmp-measurement">
                                    <input
                                        type="number"
                                        className="bmp-input"
                                        min="20"
                                        max="80"
                                        step="1"
                                        value={
                                            labelSettings.height_mm
                                        }
                                        onChange={(event) => {
                                            setLabelSettings(
                                                (current) => ({
                                                    ...current,
                                                    height_mm:
                                                        Number(
                                                            event.target.value,
                                                        ),
                                                }),
                                            );
                                        }}
                                    />

                                    <strong className="bmp-measurement-unit">
                                        mm
                                    </strong>
                                </span>
                            </label>
                        </div>

                        <label className="bmp-field">
                            <span className="bmp-field-label">
                                Copies Per Product
                            </span>

                            <select
                                className="bmp-select"
                                value={labelSettings.copies}
                                onChange={(event) => {
                                    setLabelSettings(
                                        (current) => ({
                                            ...current,
                                            copies: Number(
                                                event.target.value,
                                            ),
                                        }),
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
                                <option value={5}>
                                    5 Copies
                                </option>
                                <option value={10}>
                                    10 Copies
                                </option>
                            </select>
                        </label>

                        <div className="bmp-field">
                            <span className="bmp-field-label">
                                Information on Label
                            </span>

                            <div className="bmp-print-options">
                                <label className="bmp-checkbox-option">
                                    <input
                                        type="checkbox"
                                        checked={
                                            labelSettings
                                                .show_business_name
                                        }
                                        onChange={(event) => {
                                            setLabelSettings(
                                                (current) => ({
                                                    ...current,
                                                    show_business_name:
                                                        event.target.checked,
                                                }),
                                            );
                                        }}
                                    />
                                    <span>
                                        Business Name
                                    </span>
                                </label>

                                <label className="bmp-checkbox-option">
                                    <input
                                        type="checkbox"
                                        checked={
                                            labelSettings
                                                .show_product_name
                                        }
                                        onChange={(event) => {
                                            setLabelSettings(
                                                (current) => ({
                                                    ...current,
                                                    show_product_name:
                                                        event.target.checked,
                                                }),
                                            );
                                        }}
                                    />
                                    <span>
                                        Product Name
                                    </span>
                                </label>

                                <label className="bmp-checkbox-option">
                                    <input
                                        type="checkbox"
                                        checked={
                                            labelSettings.show_sku
                                        }
                                        onChange={(event) => {
                                            setLabelSettings(
                                                (current) => ({
                                                    ...current,
                                                    show_sku:
                                                        event.target.checked,
                                                }),
                                            );
                                        }}
                                    />
                                    <span>
                                        Product SKU
                                    </span>
                                </label>

                                <label className="bmp-checkbox-option">
                                    <input
                                        type="checkbox"
                                        checked={
                                            labelSettings.show_price
                                        }
                                        onChange={(event) => {
                                            setLabelSettings(
                                                (current) => ({
                                                    ...current,
                                                    show_price:
                                                        event.target.checked,
                                                }),
                                            );
                                        }}
                                    />
                                    <span>
                                        Selling Price
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="bmp-print-summary">
                            <div className="bmp-print-summary-item">
                                <span>
                                    Selected Products
                                </span>
                                <strong>
                                    {selectedProducts.length}
                                </strong>
                            </div>

                            <div className="bmp-print-summary-item">
                                <span>
                                    Total Labels
                                </span>
                                <strong>
                                    {totalLabels}
                                </strong>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="bmp-button bmp-primary-button bmp-print-button"
                            disabled={
                                selectedProducts.length === 0
                            }
                            onClick={printLabels}
                        >
                            <Icon name="printer" />
                            Print Selected Labels
                        </button>
                    </div>

                    <section className="bmp-label-preview-section">
                        <div className="bmp-preview-heading">
                            <span>
                                Label Preview
                            </span>

                            <span>
                                {labelSettings.width_mm}
                                ×
                                {labelSettings.height_mm}
                                {' '}mm
                            </span>
                        </div>

                        <div className="bmp-label-preview">
                            {previewProduct ? (
                                <div className="bmp-label-preview-scale">
                                    <BarcodeLabel
                                        businessName={
                                            businessSettings
                                                .business_short_name
                                            ?? businessSettings
                                                .business_name
                                        }
                                        currencyCode={
                                            businessSettings
                                                .currency_code
                                        }
                                        product={previewProduct}
                                        settings={labelSettings}
                                    />
                                </div>
                            ) : (
                                <div className="bmp-state">
                                    <span className="bmp-state-icon">
                                        <Icon name="barcode" />
                                    </span>

                                    <strong className="bmp-state-title">
                                        No Label Preview
                                    </strong>

                                    <span className="bmp-state-message">
                                        Generate or assign a barcode
                                        to display a preview.
                                    </span>
                                </div>
                            )}
                        </div>
                    </section>
                </aside>
            </section>

            <div
                className="bmp-print-area"
                aria-hidden="true"
                style={{
                    gridTemplateColumns:
                        `repeat(auto-fill, ${labelSettings.width_mm}mm)`,
                }}
            >
                {selectedProducts.flatMap(
                    (product) =>
                        Array.from(
                            {
                                length:
                                    labelSettings.copies,
                            },
                            (
                                _,
                                copyIndex,
                            ) => (
                                <BarcodeLabel
                                    key={`${product.id}-${copyIndex}`}
                                    businessName={
                                        businessSettings
                                            .business_short_name
                                        ?? businessSettings
                                            .business_name
                                    }
                                    currencyCode={
                                        businessSettings
                                            .currency_code
                                    }
                                    product={product}
                                    settings={labelSettings}
                                />
                            ),
                        ),
                )}
            </div>
        </div>
    );
}
