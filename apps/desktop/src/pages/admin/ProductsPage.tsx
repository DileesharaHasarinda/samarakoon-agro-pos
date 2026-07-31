import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import {
    useNavigate,
} from 'react-router';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    createProduct,
    deleteProduct,
    getProductCategoryOptions,
    getProducts,
    updateProduct,
} from '../../services/productService';

import type {
    Product,
    ProductCategory,
    ProductInput,
    ProductPaginationMeta,
} from '../../types/product';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const COMMON_UNITS = [
    'Piece',
    'Packet',
    'Bag',
    'Bottle',
    'Box',
    'Kilogram',
    'Gram',
    'Litre',
    'Millilitre',
    'Metre',
    'Foot',
    'Roll',
    'Set',
    'Pair',
    'Dozen',
] as const;

const EMPTY_PAGINATION: ProductPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: null,
    to: null,
};

const createEmptyForm = (): ProductInput => ({
    category_id: null,
    name: '',
    unit: '',
    barcode: '',
});

function getErrorMessage(
    error: unknown,
    fallback: string,
): string {
    if (error instanceof ApiError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
}

function formatNumber(
    value: number | string | null | undefined,
): string {
    const numberValue = Number(value ?? 0);

    if (!Number.isFinite(numberValue)) {
        return String(value ?? 0);
    }

    return new Intl.NumberFormat('en-GB', {
        maximumFractionDigits: 3,
    }).format(numberValue);
}

type IconName =
    | 'alert'
    | 'box'
    | 'check'
    | 'chevron-left'
    | 'chevron-right'
    | 'edit'
    | 'eye'
    | 'info'
    | 'plus'
    | 'refresh'
    | 'search'
    | 'trash'
    | 'x';

interface IconProps {
    name: IconName;
    className?: string;
}

function Icon({
    name,
    className = '',
}: IconProps) {
    const commonProps = {
        className,
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
                <svg {...commonProps}>
                    <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                </svg>
            );

        case 'box':
            return (
                <svg {...commonProps}>
                    <path d="m21 8-9 5-9-5" />
                    <path d="m3 8 9-5 9 5v8l-9 5-9-5Z" />
                    <path d="M12 13v8" />
                </svg>
            );

        case 'check':
            return (
                <svg {...commonProps}>
                    <path d="m5 12 4 4L19 6" />
                </svg>
            );

        case 'chevron-left':
            return (
                <svg {...commonProps}>
                    <path d="m15 18-6-6 6-6" />
                </svg>
            );

        case 'chevron-right':
            return (
                <svg {...commonProps}>
                    <path d="m9 18 6-6-6-6" />
                </svg>
            );

        case 'edit':
            return (
                <svg {...commonProps}>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
            );

        case 'eye':
            return (
                <svg {...commonProps}>
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                </svg>
            );

        case 'info':
            return (
                <svg {...commonProps}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5" />
                    <path d="M12 8h.01" />
                </svg>
            );

        case 'plus':
            return (
                <svg {...commonProps}>
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                </svg>
            );

        case 'refresh':
            return (
                <svg {...commonProps}>
                    <path d="M20 11a8 8 0 1 0 2 5" />
                    <path d="M20 4v7h-7" />
                </svg>
            );

        case 'search':
            return (
                <svg {...commonProps}>
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                </svg>
            );

        case 'trash':
            return (
                <svg {...commonProps}>
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="m19 6-1 14H6L5 6" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                </svg>
            );

        case 'x':
        default:
            return (
                <svg {...commonProps}>
                    <path d="m6 6 12 12" />
                    <path d="m18 6-12 12" />
                </svg>
            );
    }
}

const productsPageStyles = `
    #pos-products-page,
    #pos-products-page *,
    #pos-products-page *::before,
    #pos-products-page *::after,
    #pos-product-modal-root,
    #pos-product-modal-root *,
    #pos-product-modal-root *::before,
    #pos-product-modal-root *::after,
    #pos-delete-modal-root,
    #pos-delete-modal-root *,
    #pos-delete-modal-root *::before,
    #pos-delete-modal-root *::after {
        box-sizing: border-box !important;
    }

    #pos-products-page,
    #pos-product-modal-root,
    #pos-delete-modal-root {
        --pos-primary-950: #052e16;
        --pos-primary-900: #14532d;
        --pos-primary-800: #166534;
        --pos-primary-700: #15803d;
        --pos-primary-600: #16a34a;
        --pos-primary-100: #dcfce7;
        --pos-primary-50: #f0fdf4;

        --pos-blue-700: #1d4ed8;
        --pos-blue-50: #eff6ff;

        --pos-danger-700: #b42318;
        --pos-danger-600: #d92d20;
        --pos-danger-100: #fee4e2;
        --pos-danger-50: #fef3f2;

        --pos-warning-700: #b54708;
        --pos-warning-100: #fef0c7;
        --pos-warning-50: #fffaeb;

        --pos-text-950: #101828;
        --pos-text-800: #1d2939;
        --pos-text-700: #344054;
        --pos-text-600: #475467;
        --pos-text-500: #667085;

        --pos-border-strong: #b7c4ba;
        --pos-border: #d0d9d2;
        --pos-border-soft: #e5ebe6;

        --pos-surface: #ffffff;
        --pos-surface-muted: #f8faf9;
        --pos-page: #f2f6f3;

        --pos-shadow-sm:
            0 1px 3px rgba(16, 24, 40, 0.08);

        --pos-shadow-md:
            0 8px 24px rgba(16, 24, 40, 0.10);

        --pos-shadow-lg:
            0 24px 64px rgba(16, 24, 40, 0.22);

        font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Helvetica,
            Arial,
            sans-serif !important;

        color: var(--pos-text-950) !important;
        line-height: 1.5 !important;
        text-rendering: optimizeLegibility !important;
        -webkit-font-smoothing: antialiased !important;
    }

    #pos-products-page button,
    #pos-products-page input,
    #pos-products-page select,
    #pos-product-modal-root button,
    #pos-product-modal-root input,
    #pos-product-modal-root select,
    #pos-delete-modal-root button {
        font: inherit !important;
        text-transform: none !important;
        letter-spacing: normal !important;
    }

    #pos-products-page h1,
    #pos-products-page h2,
    #pos-products-page h3,
    #pos-products-page p,
    #pos-product-modal-root h2,
    #pos-product-modal-root h3,
    #pos-product-modal-root p,
    #pos-delete-modal-root h2,
    #pos-delete-modal-root p {
        margin: 0 !important;
    }

    #pos-products-page {
        width: 100% !important;
        min-width: 0 !important;
        min-height: calc(100dvh - 88px) !important;

        padding: 24px !important;

        overflow: visible !important;

        background: var(--pos-page) !important;

        isolation: isolate !important;
    }

    #pos-products-page
    .pos-products-container {
        width: min(100%, 1600px) !important;
        margin: 0 auto !important;
    }

    #pos-products-page
    .pos-products-header {
        display: flex !important;

        min-height: 112px !important;

        align-items: center !important;
        justify-content: space-between !important;
        gap: 24px !important;

        padding: 22px 24px !important;

        background: var(--pos-surface) !important;

        border:
            1px solid
            var(--pos-border) !important;

        border-left:
            5px solid
            var(--pos-primary-700) !important;

        border-radius: 14px !important;

        box-shadow: var(--pos-shadow-sm) !important;
    }

    #pos-products-page
    .pos-products-heading {
        min-width: 0 !important;
    }

    #pos-products-page
    .pos-products-eyebrow {
        display: block !important;

        margin-bottom: 5px !important;

        color: var(--pos-primary-700) !important;

        font-size: 13px !important;
        font-weight: 700 !important;
        line-height: 1.25 !important;
        letter-spacing: 0.04em !important;

        text-transform: uppercase !important;
    }

    #pos-products-page
    .pos-products-title {
        color: var(--pos-text-950) !important;

        font-size: 30px !important;
        font-weight: 750 !important;
        line-height: 1.2 !important;
        letter-spacing: -0.025em !important;
    }

    #pos-products-page
    .pos-products-description {
        max-width: 760px !important;

        margin-top: 6px !important;

        color: var(--pos-text-600) !important;

        font-size: 15px !important;
        font-weight: 450 !important;
        line-height: 1.55 !important;
    }

    #pos-products-page
    .pos-products-header-actions {
        display: flex !important;

        flex: 0 0 auto !important;

        align-items: center !important;
        gap: 12px !important;
    }

    #pos-products-page
    .pos-products-count {
        display: inline-flex !important;

        min-height: 42px !important;

        align-items: center !important;
        justify-content: center !important;

        padding: 8px 13px !important;

        color: var(--pos-primary-900) !important;

        font-size: 14px !important;
        font-weight: 700 !important;

        white-space: nowrap !important;

        background: var(--pos-primary-50) !important;

        border:
            1px solid
            #b7e4c5 !important;

        border-radius: 9px !important;
    }

    #pos-products-page
    .pos-button,
    #pos-product-modal-root
    .pos-button,
    #pos-delete-modal-root
    .pos-button {
        display: inline-flex !important;

        min-height: 42px !important;

        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;

        padding: 9px 14px !important;

        color: var(--pos-text-800) !important;

        font-size: 14px !important;
        font-weight: 650 !important;
        line-height: 1.25 !important;

        white-space: nowrap !important;

        appearance: none !important;

        background: var(--pos-surface) !important;

        border:
            1px solid
            var(--pos-border-strong) !important;

        border-radius: 9px !important;

        box-shadow:
            0 1px 2px
            rgba(16, 24, 40, 0.04) !important;

        cursor: pointer !important;

        transition:
            background 150ms ease,
            border-color 150ms ease,
            box-shadow 150ms ease,
            color 150ms ease,
            transform 150ms ease !important;
    }

    #pos-products-page
    .pos-button:hover:not(:disabled),
    #pos-product-modal-root
    .pos-button:hover:not(:disabled),
    #pos-delete-modal-root
    .pos-button:hover:not(:disabled) {
        background: var(--pos-surface-muted) !important;

        border-color: #98a99d !important;
    }

    #pos-products-page
    .pos-button:focus-visible,
    #pos-product-modal-root
    .pos-button:focus-visible,
    #pos-delete-modal-root
    .pos-button:focus-visible,
    #pos-products-page
    .pos-input:focus-visible,
    #pos-products-page
    .pos-select:focus-visible,
    #pos-product-modal-root
    .pos-form-control:focus-visible {
        outline: none !important;

        border-color:
            var(--pos-primary-700) !important;

        box-shadow:
            0 0 0 4px
            rgba(21, 128, 61, 0.14) !important;
    }

    #pos-products-page
    .pos-button:active:not(:disabled),
    #pos-product-modal-root
    .pos-button:active:not(:disabled),
    #pos-delete-modal-root
    .pos-button:active:not(:disabled) {
        transform: translateY(1px) !important;
    }

    #pos-products-page
    .pos-button:disabled,
    #pos-product-modal-root
    .pos-button:disabled,
    #pos-delete-modal-root
    .pos-button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    #pos-products-page
    .pos-button-icon,
    #pos-product-modal-root
    .pos-button-icon,
    #pos-delete-modal-root
    .pos-button-icon {
        width: 18px !important;
        height: 18px !important;
        flex: 0 0 18px !important;
    }

    #pos-products-page
    .pos-button-primary,
    #pos-product-modal-root
    .pos-button-primary {
        color: #ffffff !important;

        background:
            var(--pos-primary-700) !important;

        border-color:
            var(--pos-primary-700) !important;
    }

    #pos-products-page
    .pos-button-primary:hover:not(:disabled),
    #pos-product-modal-root
    .pos-button-primary:hover:not(:disabled) {
        color: #ffffff !important;

        background:
            var(--pos-primary-800) !important;

        border-color:
            var(--pos-primary-800) !important;
    }

    #pos-products-page
    .pos-button-danger,
    #pos-delete-modal-root
    .pos-button-danger {
        color: #ffffff !important;

        background:
            var(--pos-danger-600) !important;

        border-color:
            var(--pos-danger-600) !important;
    }

    #pos-products-page
    .pos-button-danger:hover:not(:disabled),
    #pos-delete-modal-root
    .pos-button-danger:hover:not(:disabled) {
        color: #ffffff !important;

        background:
            var(--pos-danger-700) !important;

        border-color:
            var(--pos-danger-700) !important;
    }

    #pos-products-page
    .pos-feedback-stack {
        display: grid !important;

        gap: 10px !important;

        margin-top: 16px !important;
    }

    #pos-products-page
    .pos-alert {
        display: flex !important;

        min-height: 54px !important;

        align-items: center !important;
        gap: 11px !important;

        padding: 11px 13px !important;

        font-size: 14px !important;
        font-weight: 550 !important;
        line-height: 1.45 !important;

        border:
            1px solid
            transparent !important;

        border-radius: 10px !important;
    }

    #pos-products-page
    .pos-alert-icon {
        width: 20px !important;
        height: 20px !important;
        flex: 0 0 20px !important;
    }

    #pos-products-page
    .pos-alert-copy {
        min-width: 0 !important;
        flex: 1 !important;
    }

    #pos-products-page
    .pos-alert-success {
        color: var(--pos-primary-900) !important;

        background: var(--pos-primary-50) !important;

        border-color: #a9ddb9 !important;
    }

    #pos-products-page
    .pos-alert-error {
        color: var(--pos-danger-700) !important;

        background: var(--pos-danger-50) !important;

        border-color: #f3b5af !important;
    }

    #pos-products-page
    .pos-alert-warning {
        color: var(--pos-warning-700) !important;

        background: var(--pos-warning-50) !important;

        border-color: #f1d48f !important;
    }

    #pos-products-page
    .pos-alert-action {
        min-height: 36px !important;

        padding: 7px 11px !important;

        font-size: 13px !important;

        background:
            rgba(255, 255, 255, 0.72) !important;
    }

    #pos-products-page
    .pos-alert-close {
        display: grid !important;

        width: 34px !important;
        height: 34px !important;
        min-width: 34px !important;

        place-items: center !important;

        padding: 0 !important;

        color: inherit !important;

        appearance: none !important;

        background: transparent !important;

        border: 0 !important;
        border-radius: 7px !important;

        cursor: pointer !important;
    }

    #pos-products-page
    .pos-alert-close:hover {
        background:
            rgba(16, 24, 40, 0.07) !important;
    }

    #pos-products-page
    .pos-alert-close svg {
        width: 17px !important;
        height: 17px !important;
    }

    #pos-products-page
    .pos-products-panel {
        margin-top: 16px !important;

        overflow: hidden !important;

        background: var(--pos-surface) !important;

        border:
            1px solid
            var(--pos-border) !important;

        border-radius: 14px !important;

        box-shadow: var(--pos-shadow-sm) !important;
    }

    #pos-products-page
    .pos-toolbar {
        display: grid !important;

        grid-template-columns:
            minmax(300px, 1fr)
            auto
            auto !important;

        align-items: end !important;
        gap: 12px !important;

        padding: 16px !important;

        background: var(--pos-surface) !important;

        border-bottom:
            1px solid
            var(--pos-border-soft) !important;
    }

    #pos-products-page
    .pos-field {
        display: grid !important;

        gap: 6px !important;

        min-width: 0 !important;
    }

    #pos-products-page
    .pos-toolbar-label {
        color: var(--pos-text-700) !important;

        font-size: 13px !important;
        font-weight: 650 !important;
        line-height: 1.25 !important;
    }

    #pos-products-page
    .pos-search-wrap {
        position: relative !important;
    }

    #pos-products-page
    .pos-search-icon {
        position: absolute !important;

        top: 50% !important;
        left: 13px !important;

        width: 19px !important;
        height: 19px !important;

        color: var(--pos-text-500) !important;

        transform: translateY(-50%) !important;

        pointer-events: none !important;
    }

    #pos-products-page
    .pos-input,
    #pos-products-page
    .pos-select,
    #pos-product-modal-root
    .pos-form-control {
        display: block !important;

        width: 100% !important;
        height: 44px !important;
        min-height: 44px !important;

        margin: 0 !important;
        padding: 0 12px !important;

        color: var(--pos-text-950) !important;

        font-size: 15px !important;
        font-weight: 450 !important;
        line-height: normal !important;

        appearance: none !important;
        outline: none !important;

        background: #ffffff !important;

        border:
            1px solid
            var(--pos-border-strong) !important;

        border-radius: 9px !important;

        box-shadow:
            0 1px 2px
            rgba(16, 24, 40, 0.03) !important;
    }

    #pos-products-page
    .pos-input::placeholder,
    #pos-product-modal-root
    .pos-form-control::placeholder {
        color: #7b8797 !important;
        opacity: 1 !important;
    }

    #pos-products-page
    .pos-search-input {
        padding-right: 44px !important;
        padding-left: 42px !important;
    }

    #pos-products-page
    .pos-select,
    #pos-product-modal-root
    select.pos-form-control {
        padding-right: 38px !important;

        background-image:
            linear-gradient(
                45deg,
                transparent 50%,
                #667085 50%
            ),
            linear-gradient(
                135deg,
                #667085 50%,
                transparent 50%
            ) !important;

        background-position:
            calc(100% - 17px) 18px,
            calc(100% - 12px) 18px !important;

        background-size:
            5px 5px,
            5px 5px !important;

        background-repeat: no-repeat !important;

        cursor: pointer !important;
    }

    #pos-products-page
    .pos-clear-search {
        position: absolute !important;

        top: 50% !important;
        right: 6px !important;

        display: grid !important;

        width: 32px !important;
        height: 32px !important;

        place-items: center !important;

        padding: 0 !important;

        color: var(--pos-text-500) !important;

        appearance: none !important;

        background: transparent !important;

        border: 0 !important;
        border-radius: 7px !important;

        transform: translateY(-50%) !important;

        cursor: pointer !important;
    }

    #pos-products-page
    .pos-clear-search:hover {
        color: var(--pos-text-950) !important;
        background: #edf1ee !important;
    }

    #pos-products-page
    .pos-clear-search svg {
        width: 17px !important;
        height: 17px !important;
    }

    #pos-products-page
    .pos-row-limit {
        width: 124px !important;
    }

    #pos-products-page
    .pos-table-scroll {
        width: 100% !important;

        overflow-x: auto !important;
        overflow-y: visible !important;

        scrollbar-width: thin !important;

        scrollbar-color:
            #99aa9d
            #edf2ee !important;
    }

    #pos-products-page
    .pos-table-scroll::-webkit-scrollbar {
        height: 10px !important;
    }

    #pos-products-page
    .pos-table-scroll::-webkit-scrollbar-track {
        background: #edf2ee !important;
    }

    #pos-products-page
    .pos-table-scroll::-webkit-scrollbar-thumb {
        background: #99aa9d !important;

        border:
            2px solid
            #edf2ee !important;

        border-radius: 999px !important;
    }

    #pos-products-page
    .pos-products-table {
        width: 100% !important;
        min-width: 1120px !important;

        table-layout: fixed !important;

        border-collapse: separate !important;
        border-spacing: 0 !important;

        background: #ffffff !important;
    }

    #pos-products-page
    .pos-products-table th,
    #pos-products-page
    .pos-products-table td {
        padding: 13px 14px !important;

        vertical-align: middle !important;
        text-align: left !important;

        border: 0 !important;

        border-bottom:
            1px solid
            var(--pos-border-soft) !important;
    }

    #pos-products-page
    .pos-products-table th {
        position: sticky !important;

        top: 0 !important;
        z-index: 2 !important;

        height: 48px !important;

        color: #ffffff !important;

        font-size: 13px !important;
        font-weight: 700 !important;
        line-height: 1.25 !important;
        letter-spacing: 0.015em !important;

        white-space: nowrap !important;

        background:
            var(--pos-primary-900) !important;

        border-bottom-color:
            var(--pos-primary-950) !important;
    }

    #pos-products-page
    .pos-products-table td {
        height: 68px !important;

        color: var(--pos-text-800) !important;

        font-size: 14px !important;
        font-weight: 450 !important;
        line-height: 1.4 !important;

        background: #ffffff !important;
    }

    #pos-products-page
    .pos-products-table
    tbody tr:nth-child(even) td {
        background: #fbfcfb !important;
    }

    #pos-products-page
    .pos-products-table
    tbody tr:hover td {
        background:
            var(--pos-primary-50) !important;
    }

    #pos-products-page
    .pos-col-product {
        width: 270px !important;
    }

    #pos-products-page
    .pos-col-category {
        width: 170px !important;
    }

    #pos-products-page
    .pos-col-unit {
        width: 105px !important;
    }

    #pos-products-page
    .pos-col-barcode {
        width: 180px !important;
    }

    #pos-products-page
    .pos-col-stock {
        width: 170px !important;
    }

    #pos-products-page
    .pos-col-status {
        width: 110px !important;
    }

    #pos-products-page
    .pos-col-actions {
        width: 260px !important;
    }

    #pos-products-page
    .pos-product-cell {
        display: flex !important;

        min-width: 0 !important;

        align-items: center !important;
        gap: 11px !important;
    }

    #pos-products-page
    .pos-product-avatar {
        display: grid !important;

        width: 42px !important;
        height: 42px !important;
        min-width: 42px !important;

        place-items: center !important;

        color: #ffffff !important;

        font-size: 15px !important;
        font-weight: 750 !important;
        line-height: 1 !important;

        background:
            linear-gradient(
                145deg,
                var(--pos-primary-900),
                var(--pos-primary-700)
            ) !important;

        border-radius: 10px !important;
    }

    #pos-products-page
    .pos-product-meta {
        min-width: 0 !important;
    }

    #pos-products-page
    .pos-product-name {
        display: block !important;

        overflow: hidden !important;

        color: var(--pos-text-950) !important;

        font-size: 15px !important;
        font-weight: 650 !important;
        line-height: 1.35 !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #pos-products-page
    .pos-product-sku {
        display: block !important;

        margin-top: 3px !important;

        overflow: hidden !important;

        color: var(--pos-text-500) !important;

        font-size: 13px !important;
        font-weight: 450 !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #pos-products-page
    .pos-category-badge,
    #pos-products-page
    .pos-status-badge {
        display: inline-flex !important;

        min-height: 30px !important;

        align-items: center !important;
        justify-content: center !important;

        padding: 5px 9px !important;

        font-size: 13px !important;
        font-weight: 650 !important;
        line-height: 1.2 !important;

        white-space: nowrap !important;

        border-radius: 999px !important;
    }

    #pos-products-page
    .pos-category-badge {
        max-width: 145px !important;

        overflow: hidden !important;

        color: var(--pos-primary-900) !important;

        text-overflow: ellipsis !important;

        background: var(--pos-primary-100) !important;
    }

    #pos-products-page
    .pos-status-active {
        color: var(--pos-primary-900) !important;
        background: var(--pos-primary-100) !important;
    }

    #pos-products-page
    .pos-status-inactive {
        color: var(--pos-warning-700) !important;
        background: var(--pos-warning-100) !important;
    }

    #pos-products-page
    .pos-cell-truncate {
        display: block !important;

        overflow: hidden !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #pos-products-page
    .pos-stock-value {
        color: var(--pos-primary-900) !important;

        font-size: 15px !important;
        font-weight: 700 !important;

        white-space: nowrap !important;
    }

    #pos-products-page
    .pos-row-actions {
        display: flex !important;

        align-items: center !important;
        gap: 7px !important;
    }

    #pos-products-page
    .pos-row-action {
        min-height: 36px !important;

        padding: 7px 10px !important;

        font-size: 13px !important;
    }

    #pos-products-page
    .pos-row-action-view {
        color: var(--pos-blue-700) !important;

        background: var(--pos-blue-50) !important;

        border-color: #bfdbfe !important;
    }

    #pos-products-page
    .pos-row-action-edit {
        color: var(--pos-primary-900) !important;

        background: var(--pos-primary-50) !important;

        border-color: #b7e4c5 !important;
    }

    #pos-products-page
    .pos-row-action-delete {
        color: var(--pos-danger-700) !important;

        background: var(--pos-danger-50) !important;

        border-color: #f4c1bc !important;
    }

    #pos-products-page
    .pos-table-state {
        height: 260px !important;

        text-align: center !important;
    }

    #pos-products-page
    .pos-state-content {
        display: flex !important;

        align-items: center !important;
        justify-content: center !important;
        flex-direction: column !important;
        gap: 8px !important;
    }

    #pos-products-page
    .pos-state-icon {
        display: grid !important;

        width: 48px !important;
        height: 48px !important;

        place-items: center !important;

        color: var(--pos-primary-700) !important;

        background: var(--pos-primary-50) !important;

        border:
            1px solid
            #b7e4c5 !important;

        border-radius: 12px !important;
    }

    #pos-products-page
    .pos-state-icon svg {
        width: 24px !important;
        height: 24px !important;
    }

    #pos-products-page
    .pos-state-title {
        color: var(--pos-text-950) !important;

        font-size: 17px !important;
        font-weight: 700 !important;
    }

    #pos-products-page
    .pos-state-description {
        max-width: 430px !important;

        color: var(--pos-text-500) !important;

        font-size: 14px !important;
    }

    #pos-products-page
    .pos-spinner {
        width: 38px !important;
        height: 38px !important;

        border:
            4px solid
            var(--pos-primary-100) !important;

        border-top-color:
            var(--pos-primary-700) !important;

        border-radius: 50% !important;

        animation:
            pos-product-spin
            700ms
            linear
            infinite !important;
    }

    @keyframes pos-product-spin {
        to {
            transform: rotate(360deg);
        }
    }

    #pos-products-page
    .pos-pagination {
        display: flex !important;

        min-height: 66px !important;

        align-items: center !important;
        justify-content: space-between !important;
        gap: 16px !important;

        padding: 12px 16px !important;

        background: var(--pos-surface-muted) !important;

        border-top:
            1px solid
            var(--pos-border-soft) !important;
    }

    #pos-products-page
    .pos-pagination-summary {
        color: var(--pos-text-600) !important;

        font-size: 14px !important;
        font-weight: 450 !important;
    }

    #pos-products-page
    .pos-pagination-summary strong {
        color: var(--pos-text-950) !important;
        font-weight: 700 !important;
    }

    #pos-products-page
    .pos-pagination-controls {
        display: flex !important;

        align-items: center !important;
        gap: 8px !important;
    }

    #pos-products-page
    .pos-page-indicator {
        display: inline-flex !important;

        min-height: 38px !important;

        align-items: center !important;

        padding: 7px 11px !important;

        color: var(--pos-text-700) !important;

        font-size: 13px !important;
        font-weight: 550 !important;

        white-space: nowrap !important;

        background: #ffffff !important;

        border:
            1px solid
            var(--pos-border) !important;

        border-radius: 8px !important;
    }

    #pos-products-page
    .pos-page-button {
        min-height: 38px !important;

        padding: 7px 10px !important;

        font-size: 13px !important;
    }

    #pos-product-modal-root,
    #pos-delete-modal-root {
        position: fixed !important;

        inset: 0 !important;

        z-index: 2147483647 !important;

        width: 100vw !important;

        height: 100vh !important;
        height: 100dvh !important;

        overflow: hidden !important;

        isolation: isolate !important;
    }

    #pos-product-modal-root
    .pos-modal-backdrop,
    #pos-delete-modal-root
    .pos-modal-backdrop {
        position: absolute !important;

        inset: 0 !important;

        display: flex !important;

        width: 100% !important;
        height: 100% !important;

        align-items: center !important;
        justify-content: center !important;

        padding: 20px !important;

        overflow: auto !important;

        background:
            rgba(5, 18, 10, 0.72) !important;

        backdrop-filter: blur(4px) !important;
    }

    #pos-product-modal-root
    .pos-modal-dialog,
    #pos-delete-modal-root
    .pos-delete-dialog {
        position: relative !important;

        display: flex !important;

        width: min(760px, 100%) !important;

        max-height:
            calc(100dvh - 40px) !important;

        min-width: 0 !important;
        min-height: 0 !important;

        flex-direction: column !important;

        overflow: hidden !important;

        background: #ffffff !important;

        border:
            1px solid
            var(--pos-border) !important;

        border-radius: 16px !important;

        box-shadow: var(--pos-shadow-lg) !important;
    }

    #pos-product-modal-root
    .pos-modal-header {
        display: flex !important;

        min-height: 86px !important;
        flex: 0 0 auto !important;

        align-items: center !important;
        justify-content: space-between !important;
        gap: 18px !important;

        padding: 17px 20px !important;

        color: #ffffff !important;

        background:
            linear-gradient(
                135deg,
                var(--pos-primary-900),
                var(--pos-primary-700)
            ) !important;
    }

    #pos-product-modal-root
    .pos-modal-eyebrow {
        display: block !important;

        margin-bottom: 3px !important;

        color: #bbf7d0 !important;

        font-size: 12px !important;
        font-weight: 700 !important;
        letter-spacing: 0.045em !important;

        text-transform: uppercase !important;
    }

    #pos-product-modal-root
    .pos-modal-title {
        color: #ffffff !important;

        font-size: 23px !important;
        font-weight: 750 !important;
        line-height: 1.25 !important;
        letter-spacing: -0.015em !important;
    }

    #pos-product-modal-root
    .pos-modal-close {
        display: grid !important;

        width: 40px !important;
        height: 40px !important;
        min-width: 40px !important;

        place-items: center !important;

        padding: 0 !important;

        color: #ffffff !important;

        appearance: none !important;

        background:
            rgba(255, 255, 255, 0.12) !important;

        border:
            1px solid
            rgba(255, 255, 255, 0.35) !important;

        border-radius: 9px !important;

        cursor: pointer !important;
    }

    #pos-product-modal-root
    .pos-modal-close:hover:not(:disabled) {
        background:
            rgba(255, 255, 255, 0.22) !important;
    }

    #pos-product-modal-root
    .pos-modal-close svg {
        width: 20px !important;
        height: 20px !important;
    }

    #pos-product-modal-root
    .pos-modal-form {
        display: flex !important;

        min-height: 0 !important;

        flex: 1 1 auto !important;
        flex-direction: column !important;

        overflow: hidden !important;
    }

    #pos-product-modal-root
    .pos-modal-body {
        display: grid !important;

        min-height: 0 !important;

        flex: 1 1 auto !important;

        gap: 14px !important;

        padding: 18px 20px 22px !important;

        overflow-x: hidden !important;
        overflow-y: auto !important;

        overscroll-behavior: contain !important;

        background: #f6f8f7 !important;

        scrollbar-width: thin !important;

        scrollbar-color:
            #99aa9d
            #edf2ee !important;
    }

    #pos-product-modal-root
    .pos-modal-body::-webkit-scrollbar {
        width: 10px !important;
    }

    #pos-product-modal-root
    .pos-modal-body::-webkit-scrollbar-track {
        background: #edf2ee !important;
    }

    #pos-product-modal-root
    .pos-modal-body::-webkit-scrollbar-thumb {
        background: #99aa9d !important;

        border:
            2px solid
            #edf2ee !important;

        border-radius: 999px !important;
    }

    #pos-product-modal-root
    .pos-modal-error {
        display: flex !important;

        align-items: center !important;
        gap: 10px !important;

        padding: 11px 13px !important;

        color: var(--pos-danger-700) !important;

        font-size: 14px !important;
        font-weight: 600 !important;

        background: var(--pos-danger-50) !important;

        border:
            1px solid
            #f3b5af !important;

        border-radius: 10px !important;
    }

    #pos-product-modal-root
    .pos-modal-error svg {
        width: 20px !important;
        height: 20px !important;
        flex: 0 0 20px !important;
    }

    #pos-product-modal-root
    .pos-form-section {
        display: grid !important;

        gap: 16px !important;

        padding: 18px !important;

        background: #ffffff !important;

        border:
            1px solid
            var(--pos-border) !important;

        border-radius: 12px !important;

        scroll-margin-top: 16px !important;
    }

    #pos-product-modal-root
    .pos-form-section-highlight {
        background: var(--pos-primary-50) !important;

        border-color: #a9ddb9 !important;
    }

    #pos-product-modal-root
    .pos-section-heading {
        display: flex !important;

        align-items: flex-start !important;
        gap: 11px !important;

        padding-bottom: 13px !important;

        border-bottom:
            1px solid
            var(--pos-border-soft) !important;
    }

    #pos-product-modal-root
    .pos-step-number {
        display: grid !important;

        width: 34px !important;
        height: 34px !important;
        min-width: 34px !important;

        place-items: center !important;

        color: #ffffff !important;

        font-size: 14px !important;
        font-weight: 750 !important;

        background:
            var(--pos-primary-700) !important;

        border-radius: 9px !important;
    }

    #pos-product-modal-root
    .pos-section-title {
        color: var(--pos-text-950) !important;

        font-size: 17px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
    }

    #pos-product-modal-root
    .pos-section-description {
        margin-top: 3px !important;

        color: var(--pos-text-500) !important;

        font-size: 13px !important;
        line-height: 1.45 !important;
    }

    #pos-product-modal-root
    .pos-form-grid {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;

        gap: 15px !important;
    }

    #pos-product-modal-root
    .pos-form-field {
        display: grid !important;

        gap: 6px !important;

        min-width: 0 !important;
    }

    #pos-product-modal-root
    .pos-form-field-full {
        grid-column: 1 / -1 !important;
    }

    #pos-product-modal-root
    .pos-field-label {
        color: var(--pos-text-700) !important;

        font-size: 14px !important;
        font-weight: 650 !important;
        line-height: 1.3 !important;
    }

    #pos-product-modal-root
    .pos-required {
        color: var(--pos-danger-600) !important;
    }

    #pos-product-modal-root
    .pos-optional {
        color: var(--pos-text-500) !important;

        font-size: 12px !important;
        font-style: normal !important;
        font-weight: 500 !important;
    }

    #pos-product-modal-root
    .pos-form-control {
        height: 46px !important;
        min-height: 46px !important;

        font-size: 15px !important;
    }

    #pos-product-modal-root
    .pos-field-help {
        color: var(--pos-text-500) !important;

        font-size: 12px !important;
        line-height: 1.4 !important;
    }

    #pos-product-modal-root
    .pos-category-state {
        padding: 12px 13px !important;

        color: var(--pos-text-700) !important;

        font-size: 14px !important;
        font-weight: 550 !important;

        background:
            rgba(255, 255, 255, 0.72) !important;

        border:
            1px solid
            var(--pos-border) !important;

        border-radius: 9px !important;
    }

    #pos-product-modal-root
    .pos-category-state-error {
        color: var(--pos-danger-700) !important;

        background: var(--pos-danger-50) !important;

        border-color: #f3b5af !important;
    }

    #pos-product-modal-root
    .pos-selected-category {
        display: flex !important;

        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;

        padding: 11px 13px !important;

        color: var(--pos-primary-900) !important;

        background: #ffffff !important;

        border:
            1px solid
            #a9ddb9 !important;

        border-radius: 9px !important;
    }

    #pos-product-modal-root
    .pos-selected-category-label {
        display: block !important;

        color: var(--pos-text-500) !important;

        font-size: 12px !important;
        font-weight: 550 !important;
    }

    #pos-product-modal-root
    .pos-selected-category-name {
        display: block !important;

        margin-top: 2px !important;

        font-size: 15px !important;
        font-weight: 700 !important;
    }

    #pos-product-modal-root
    .pos-selected-category-check {
        display: grid !important;

        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;

        place-items: center !important;

        color: #ffffff !important;

        background:
            var(--pos-primary-700) !important;

        border-radius: 50% !important;
    }

    #pos-product-modal-root
    .pos-selected-category-check svg {
        width: 17px !important;
        height: 17px !important;
    }

    #pos-product-modal-root
    .pos-continue-notice {
        display: flex !important;

        align-items: center !important;
        gap: 11px !important;

        padding: 13px 14px !important;

        color: var(--pos-text-700) !important;

        font-size: 14px !important;
        font-weight: 600 !important;

        background: var(--pos-warning-50) !important;

        border:
            1px solid
            #f1d48f !important;

        border-radius: 10px !important;
    }

    #pos-product-modal-root
    .pos-continue-icon {
        display: grid !important;

        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;

        place-items: center !important;

        color: #ffffff !important;

        font-size: 13px !important;
        font-weight: 750 !important;

        background:
            var(--pos-warning-700) !important;

        border-radius: 8px !important;
    }

    #pos-product-modal-root
    .pos-form-information {
        display: flex !important;

        align-items: flex-start !important;
        gap: 10px !important;

        padding: 12px 13px !important;

        color: var(--pos-text-600) !important;

        font-size: 13px !important;
        line-height: 1.5 !important;

        background: #f9fafb !important;

        border:
            1px solid
            var(--pos-border-soft) !important;

        border-radius: 9px !important;
    }

    #pos-product-modal-root
    .pos-form-information svg {
        width: 19px !important;
        height: 19px !important;
        min-width: 19px !important;

        margin-top: 1px !important;

        color: var(--pos-primary-700) !important;
    }

    #pos-product-modal-root
    .pos-modal-footer {
        display: flex !important;

        min-height: 70px !important;
        flex: 0 0 auto !important;

        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;

        padding: 13px 20px !important;

        background: #ffffff !important;

        border-top:
            1px solid
            var(--pos-border) !important;
    }

    #pos-delete-modal-root
    .pos-delete-dialog {
        width: min(470px, 100%) !important;
    }

    #pos-delete-modal-root
    .pos-delete-content {
        padding: 24px !important;
    }

    #pos-delete-modal-root
    .pos-delete-icon {
        display: grid !important;

        width: 48px !important;
        height: 48px !important;

        place-items: center !important;

        color: var(--pos-danger-700) !important;

        background: var(--pos-danger-50) !important;

        border:
            1px solid
            #f4c1bc !important;

        border-radius: 12px !important;
    }

    #pos-delete-modal-root
    .pos-delete-icon svg {
        width: 24px !important;
        height: 24px !important;
    }

    #pos-delete-modal-root
    .pos-delete-title {
        margin-top: 16px !important;

        color: var(--pos-text-950) !important;

        font-size: 20px !important;
        font-weight: 750 !important;
        line-height: 1.3 !important;
    }

    #pos-delete-modal-root
    .pos-delete-message {
        margin-top: 8px !important;

        color: var(--pos-text-600) !important;

        font-size: 14px !important;
        line-height: 1.55 !important;
    }

    #pos-delete-modal-root
    .pos-delete-product-name {
        color: var(--pos-text-950) !important;
        font-weight: 700 !important;
    }

    #pos-delete-modal-root
    .pos-delete-warning {
        margin-top: 14px !important;

        padding: 10px 12px !important;

        color: var(--pos-warning-700) !important;

        font-size: 13px !important;
        line-height: 1.45 !important;

        background: var(--pos-warning-50) !important;

        border:
            1px solid
            #f1d48f !important;

        border-radius: 9px !important;
    }

    #pos-delete-modal-root
    .pos-delete-actions {
        display: flex !important;

        justify-content: flex-end !important;
        gap: 10px !important;

        padding: 14px 20px !important;

        background: #ffffff !important;

        border-top:
            1px solid
            var(--pos-border) !important;
    }

    @media (max-width: 980px) {
        #pos-products-page {
            padding: 18px !important;
        }

        #pos-products-page
        .pos-toolbar {
            grid-template-columns:
                minmax(240px, 1fr)
                auto !important;
        }

        #pos-products-page
        .pos-row-limit {
            grid-column: 1 / -1 !important;
            width: 160px !important;
        }
    }

    @media (max-width: 720px) {
        #pos-products-page {
            min-height:
                calc(100dvh - 72px) !important;

            padding: 12px !important;
        }

        #pos-products-page
        .pos-products-header {
            min-height: 0 !important;

            align-items: stretch !important;
            flex-direction: column !important;

            padding: 18px !important;
        }

        #pos-products-page
        .pos-products-title {
            font-size: 26px !important;
        }

        #pos-products-page
        .pos-products-header-actions {
            align-items: stretch !important;
            flex-direction: column !important;
        }

        #pos-products-page
        .pos-products-count,
        #pos-products-page
        .pos-products-header-actions
        .pos-button {
            width: 100% !important;
        }

        #pos-products-page
        .pos-toolbar {
            grid-template-columns: 1fr !important;
        }

        #pos-products-page
        .pos-row-limit {
            grid-column: auto !important;
            width: 100% !important;
        }

        #pos-products-page
        .pos-pagination {
            align-items: stretch !important;
            flex-direction: column !important;
        }

        #pos-products-page
        .pos-pagination-controls {
            display: grid !important;

            grid-template-columns:
                repeat(
                    2,
                    minmax(0, 1fr)
                ) !important;
        }

        #pos-products-page
        .pos-page-indicator {
            grid-column: 1 / -1 !important;
            grid-row: 1 !important;

            justify-content: center !important;
        }

        #pos-products-page
        .pos-page-button {
            width: 100% !important;
        }

        #pos-product-modal-root
        .pos-modal-backdrop,
        #pos-delete-modal-root
        .pos-modal-backdrop {
            align-items: flex-end !important;
            padding: 0 !important;
        }

        #pos-product-modal-root
        .pos-modal-dialog,
        #pos-delete-modal-root
        .pos-delete-dialog {
            width: 100% !important;
            max-height: 96dvh !important;

            border-right: 0 !important;
            border-bottom: 0 !important;
            border-left: 0 !important;

            border-radius:
                16px
                16px
                0
                0 !important;
        }

        #pos-product-modal-root
        .pos-modal-header {
            min-height: 78px !important;

            padding: 14px 16px !important;
        }

        #pos-product-modal-root
        .pos-modal-title {
            font-size: 21px !important;
        }

        #pos-product-modal-root
        .pos-modal-body {
            padding: 14px !important;
        }

        #pos-product-modal-root
        .pos-form-section {
            padding: 15px !important;
        }

        #pos-product-modal-root
        .pos-form-grid {
            grid-template-columns: 1fr !important;
        }

        #pos-product-modal-root
        .pos-form-field-full {
            grid-column: auto !important;
        }

        #pos-product-modal-root
        .pos-modal-footer,
        #pos-delete-modal-root
        .pos-delete-actions {
            display: grid !important;

            grid-template-columns:
                repeat(
                    2,
                    minmax(0, 1fr)
                ) !important;

            padding: 12px 14px !important;
        }

        #pos-product-modal-root
        .pos-modal-footer
        .pos-button,
        #pos-delete-modal-root
        .pos-delete-actions
        .pos-button {
            width: 100% !important;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        #pos-products-page *,
        #pos-product-modal-root *,
        #pos-delete-modal-root * {
            scroll-behavior: auto !important;
            transition: none !important;
        }

        #pos-products-page
        .pos-spinner {
            animation-duration: 1.2s !important;
        }
    }
`;

export default function ProductsPage() {
    const navigate = useNavigate();

    const {
        token,
    } = useAuth();

    const detailsSectionRef =
        useRef<HTMLElement | null>(
            null,
        );

    const nameInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const categorySelectRef =
        useRef<HTMLSelectElement | null>(
            null,
        );

    const deleteCancelButtonRef =
        useRef<HTMLButtonElement | null>(
            null,
        );

    const [
        products,
        setProducts,
    ] = useState<Product[]>([]);

    const [
        categories,
        setCategories,
    ] = useState<ProductCategory[]>([]);

    const [
        pagination,
        setPagination,
    ] = useState<ProductPaginationMeta>(
        EMPTY_PAGINATION,
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
        page,
        setPage,
    ] = useState(1);

    const [
        perPage,
        setPerPage,
    ] = useState(20);

    const [
        form,
        setForm,
    ] = useState<ProductInput>(
        createEmptyForm(),
    );

    const [
        editingProduct,
        setEditingProduct,
    ] = useState<Product | null>(
        null,
    );

    const [
        pendingDelete,
        setPendingDelete,
    ] = useState<Product | null>(
        null,
    );

    const [
        showForm,
        setShowForm,
    ] = useState(false);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isCategoryLoading,
        setIsCategoryLoading,
    ] = useState(true);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        deletingProductId,
        setDeletingProductId,
    ] = useState<number | null>(
        null,
    );

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        categoryError,
        setCategoryError,
    ] = useState('');

    const [
        formError,
        setFormError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const hasSelectedCategory =
        form.category_id !== null
        && form.category_id > 0;

    const selectedCategory =
        useMemo(
            () =>
                categories.find(
                    (category) =>
                        category.id
                        === form.category_id,
                )
                ?? null,
            [
                categories,
                form.category_id,
            ],
        );

    const productCountLabel =
        `${formatNumber(
            pagination.total,
        )} ${pagination.total === 1
            ? 'Product'
            : 'Products'
        }`;

    const loadProducts =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getProducts(
                            token,
                            {
                                search,
                                page,
                                per_page:
                                    perPage,
                            },
                        );

                    setProducts(
                        response.data,
                    );

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    setPageError(
                        getErrorMessage(
                            error,
                            'Unable to load products.',
                        ),
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [
                token,
                search,
                page,
                perPage,
            ],
        );

    const loadCategories =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsCategoryLoading(true);
                setCategoryError('');

                try {
                    const response =
                        await getProductCategoryOptions(
                            token,
                        );

                    setCategories(
                        response.data,
                    );
                } catch (error) {
                    setCategoryError(
                        getErrorMessage(
                            error,
                            'Unable to load product categories.',
                        ),
                    );
                } finally {
                    setIsCategoryLoading(false);
                }
            },
            [token],
        );

    const resetForm = (): void => {
        setEditingProduct(null);
        setForm(createEmptyForm());
        setFormError('');
    };

    const closeForm = (): void => {
        if (isSubmitting) {
            return;
        }

        setShowForm(false);
        resetForm();
    };

    const openCreateForm = (): void => {
        resetForm();
        setSuccessMessage('');
        setShowForm(true);
    };

    const openEditForm = (
        product: Product,
    ): void => {
        setEditingProduct(product);

        setForm({
            category_id:
                product.category?.id
                ?? null,

            name:
                product.name,

            unit:
                product.unit,

            barcode:
                product.barcode
                ?? '',
        });

        setFormError('');
        setSuccessMessage('');
        setShowForm(true);
    };

    const closeDeleteDialog = (): void => {
        if (deletingProductId !== null) {
            return;
        }

        setPendingDelete(null);
    };

    useEffect(() => {
        void loadProducts();
    }, [loadProducts]);

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeout =
            window.setTimeout(
                () => {
                    setSuccessMessage('');
                },
                4000,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [successMessage]);

    useEffect(() => {
        if (
            !showForm
            && !pendingDelete
        ) {
            return;
        }

        const previousBodyOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            'hidden';

        const focusTimeout =
            window.setTimeout(
                () => {
                    if (pendingDelete) {
                        deleteCancelButtonRef.current
                            ?.focus();
                    } else if (showForm) {
                        if (editingProduct) {
                            nameInputRef.current
                                ?.focus();
                        } else {
                            categorySelectRef.current
                                ?.focus();
                        }
                    }
                },
                60,
            );

        const handleKeyDown = (
            event: KeyboardEvent,
        ): void => {
            if (event.key !== 'Escape') {
                return;
            }

            if (
                pendingDelete
                && deletingProductId === null
            ) {
                setPendingDelete(null);
                return;
            }

            if (
                showForm
                && !isSubmitting
            ) {
                setShowForm(false);
                setEditingProduct(null);
                setForm(createEmptyForm());
                setFormError('');
            }
        };

        window.addEventListener(
            'keydown',
            handleKeyDown,
        );

        return () => {
            window.clearTimeout(
                focusTimeout,
            );

            document.body.style.overflow =
                previousBodyOverflow;

            window.removeEventListener(
                'keydown',
                handleKeyDown,
            );
        };
    }, [
        showForm,
        pendingDelete,
        editingProduct,
        isSubmitting,
        deletingProductId,
    ]);

    const handleCategoryChange = (
        value: string,
    ): void => {
        const categoryId =
            Number(value);

        const validCategoryId =
            value
                && Number.isFinite(categoryId)
                && categoryId > 0
                ? categoryId
                : null;

        setForm(
            (currentForm) => ({
                ...currentForm,

                category_id:
                    validCategoryId,
            }),
        );

        setFormError('');

        if (validCategoryId !== null) {
            window.setTimeout(
                () => {
                    detailsSectionRef.current
                        ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                        });

                    nameInputRef.current
                        ?.focus();
                },
                120,
            );
        }
    };

    const handleSearchSubmit = (
        event:
            FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        setPage(1);
        setSearch(searchInput.trim());
    };

    const clearSearch = (): void => {
        setSearchInput('');
        setSearch('');
        setPage(1);
    };

    const handleSubmit = async (
        event:
            FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        if (
            !token
            || isSubmitting
        ) {
            return;
        }

        if (
            form.category_id === null
            || form.category_id <= 0
        ) {
            setFormError(
                'Please select a product category.',
            );

            categorySelectRef.current
                ?.focus();

            return;
        }

        const cleanName =
            form.name.trim();

        const cleanUnit =
            form.unit.trim();

        const cleanBarcode =
            String(
                form.barcode
                ?? '',
            ).trim();

        if (!cleanName) {
            setFormError(
                'Please enter the product name.',
            );

            nameInputRef.current
                ?.focus();

            return;
        }

        if (!cleanUnit) {
            setFormError(
                'Please select the product unit.',
            );

            return;
        }

        const wasEditing =
            editingProduct !== null;

        setIsSubmitting(true);
        setFormError('');
        setSuccessMessage('');

        try {
            const values: ProductInput = {
                category_id:
                    form.category_id,

                name:
                    cleanName,

                unit:
                    cleanUnit,

                barcode:
                    cleanBarcode,
            };

            const response =
                editingProduct
                    ? await updateProduct(
                        token,
                        editingProduct.id,
                        values,
                    )
                    : await createProduct(
                        token,
                        values,
                    );

            setSuccessMessage(
                response.message
                ?? (
                    wasEditing
                        ? 'Product updated successfully.'
                        : 'Product created successfully.'
                ),
            );

            setShowForm(false);
            resetForm();

            if (
                !wasEditing
                && page !== 1
            ) {
                setPage(1);
            } else {
                await loadProducts();
            }
        } catch (error) {
            setFormError(
                getErrorMessage(
                    error,
                    wasEditing
                        ? 'Unable to update the product.'
                        : 'Unable to create the product.',
                ),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete =
        async (): Promise<void> => {
            if (
                !token
                || !pendingDelete
                || deletingProductId !== null
            ) {
                return;
            }

            const productToDelete =
                pendingDelete;

            setDeletingProductId(
                productToDelete.id,
            );

            setPageError('');
            setSuccessMessage('');

            try {
                const response =
                    await deleteProduct(
                        token,
                        productToDelete.id,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Product deleted successfully.',
                );

                setPendingDelete(null);

                if (
                    products.length === 1
                    && page > 1
                ) {
                    setPage(
                        (currentPage) =>
                            Math.max(
                                1,
                                currentPage - 1,
                            ),
                    );
                } else {
                    await loadProducts();
                }
            } catch (error) {
                setPageError(
                    getErrorMessage(
                        error,
                        'Unable to delete the product.',
                    ),
                );

                setPendingDelete(null);
            } finally {
                setDeletingProductId(null);
            }
        };

    const openProductDetails = (
        productId: number,
    ): void => {
        navigate(
            `/admin/products/${productId}`,
        );
    };

    const productModal =
        showForm
            && typeof document !== 'undefined'
            ? createPortal(
                <div id="pos-product-modal-root">
                    <div
                        className="pos-modal-backdrop"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (
                                event.target
                                === event.currentTarget
                                && !isSubmitting
                            ) {
                                closeForm();
                            }
                        }}
                    >
                        <section
                            className="pos-modal-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="pos-product-modal-title"
                        >
                            <header className="pos-modal-header">
                                <div>
                                    <span className="pos-modal-eyebrow">
                                        Product Management
                                    </span>

                                    <h2
                                        id="pos-product-modal-title"
                                        className="pos-modal-title"
                                    >
                                        {editingProduct
                                            ? 'Edit Product'
                                            : 'Add New Product'}
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    className="pos-modal-close"
                                    aria-label="Close product form"
                                    disabled={
                                        isSubmitting
                                    }
                                    onClick={
                                        closeForm
                                    }
                                >
                                    <Icon name="x" />
                                </button>
                            </header>

                            <form
                                className="pos-modal-form"
                                onSubmit={(event) => {
                                    void handleSubmit(
                                        event,
                                    );
                                }}
                            >
                                <div className="pos-modal-body">
                                    {formError && (
                                        <div
                                            className="pos-modal-error"
                                            role="alert"
                                        >
                                            <Icon name="alert" />

                                            <span>
                                                {formError}
                                            </span>
                                        </div>
                                    )}

                                    <section className="pos-form-section pos-form-section-highlight">
                                        <div className="pos-section-heading">
                                            <span className="pos-step-number">
                                                1
                                            </span>

                                            <div>
                                                <h3 className="pos-section-title">
                                                    Select Product Category
                                                </h3>

                                                <p className="pos-section-description">
                                                    Choose the category used
                                                    for reporting and product
                                                    lookup.
                                                </p>
                                            </div>
                                        </div>

                                        {isCategoryLoading ? (
                                            <div className="pos-category-state">
                                                Loading product categories...
                                            </div>
                                        ) : categoryError ? (
                                            <div className="pos-category-state pos-category-state-error">
                                                {categoryError}
                                            </div>
                                        ) : categories.length === 0 ? (
                                            <div className="pos-category-state pos-category-state-error">
                                                No categories are available.
                                                Create a category before
                                                adding a product.
                                            </div>
                                        ) : (
                                            <label className="pos-form-field">
                                                <span className="pos-field-label">
                                                    Product Category
                                                    {' '}

                                                    <strong className="pos-required">
                                                        *
                                                    </strong>
                                                </span>

                                                <select
                                                    ref={
                                                        categorySelectRef
                                                    }
                                                    className="pos-form-control"
                                                    value={
                                                        form.category_id
                                                        ?? ''
                                                    }
                                                    required
                                                    disabled={
                                                        isSubmitting
                                                    }
                                                    onChange={(event) => {
                                                        handleCategoryChange(
                                                            event.target.value,
                                                        );
                                                    }}
                                                >
                                                    <option value="">
                                                        Select a category
                                                    </option>

                                                    {categories.map(
                                                        (category) => (
                                                            <option
                                                                key={
                                                                    category.id
                                                                }
                                                                value={
                                                                    category.id
                                                                }
                                                            >
                                                                {
                                                                    category.name
                                                                }
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </label>
                                        )}

                                        {selectedCategory && (
                                            <div className="pos-selected-category">
                                                <div>
                                                    <span className="pos-selected-category-label">
                                                        Selected category
                                                    </span>

                                                    <strong className="pos-selected-category-name">
                                                        {
                                                            selectedCategory.name
                                                        }
                                                    </strong>
                                                </div>

                                                <span className="pos-selected-category-check">
                                                    <Icon name="check" />
                                                </span>
                                            </div>
                                        )}
                                    </section>

                                    {!hasSelectedCategory
                                        && categories.length > 0 && (
                                            <div className="pos-continue-notice">
                                                <span className="pos-continue-icon">
                                                    1
                                                </span>

                                                <span>
                                                    Select a category to
                                                    unlock the product detail
                                                    fields.
                                                </span>
                                            </div>
                                        )}

                                    {hasSelectedCategory && (
                                        <section
                                            ref={
                                                detailsSectionRef
                                            }
                                            className="pos-form-section"
                                        >
                                            <div className="pos-section-heading">
                                                <span className="pos-step-number">
                                                    2
                                                </span>

                                                <div>
                                                    <h3 className="pos-section-title">
                                                        Product Details
                                                    </h3>

                                                    <p className="pos-section-description">
                                                        Enter the product
                                                        identity information
                                                        used by the POS.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="pos-form-grid">
                                                <label className="pos-form-field pos-form-field-full">
                                                    <span className="pos-field-label">
                                                        Product Name
                                                        {' '}

                                                        <strong className="pos-required">
                                                            *
                                                        </strong>
                                                    </span>

                                                    <input
                                                        ref={
                                                            nameInputRef
                                                        }
                                                        type="text"
                                                        className="pos-form-control"
                                                        value={
                                                            form.name
                                                        }
                                                        maxLength={
                                                            160
                                                        }
                                                        required
                                                        disabled={
                                                            isSubmitting
                                                        }
                                                        placeholder="Example: Urea Fertilizer 50 kg"
                                                        onChange={(event) => {
                                                            setForm(
                                                                (
                                                                    currentForm,
                                                                ) => ({
                                                                    ...currentForm,

                                                                    name:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            );

                                                            setFormError(
                                                                '',
                                                            );
                                                        }}
                                                    />

                                                    <small className="pos-field-help">
                                                        {
                                                            form.name.length
                                                        }
                                                        /160 characters
                                                    </small>
                                                </label>

                                                <label className="pos-form-field">
                                                    <span className="pos-field-label">
                                                        Product Unit
                                                        {' '}

                                                        <strong className="pos-required">
                                                            *
                                                        </strong>
                                                    </span>

                                                    <select
                                                        className="pos-form-control"
                                                        value={
                                                            form.unit
                                                        }
                                                        required
                                                        disabled={
                                                            isSubmitting
                                                        }
                                                        onChange={(event) => {
                                                            setForm(
                                                                (
                                                                    currentForm,
                                                                ) => ({
                                                                    ...currentForm,

                                                                    unit:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            );

                                                            setFormError(
                                                                '',
                                                            );
                                                        }}
                                                    >
                                                        <option value="">
                                                            Select a unit
                                                        </option>

                                                        {COMMON_UNITS.map(
                                                            (unit) => (
                                                                <option
                                                                    key={
                                                                        unit
                                                                    }
                                                                    value={
                                                                        unit
                                                                    }
                                                                >
                                                                    {
                                                                        unit
                                                                    }
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                </label>

                                                <label className="pos-form-field">
                                                    <span className="pos-field-label">
                                                        Barcode
                                                        {' '}

                                                        <em className="pos-optional">
                                                            Optional
                                                        </em>
                                                    </span>

                                                    <input
                                                        type="text"
                                                        className="pos-form-control"
                                                        value={
                                                            form.barcode
                                                            ?? ''
                                                        }
                                                        maxLength={
                                                            64
                                                        }
                                                        disabled={
                                                            isSubmitting
                                                        }
                                                        placeholder="Scan or enter barcode"
                                                        onChange={(event) => {
                                                            setForm(
                                                                (
                                                                    currentForm,
                                                                ) => ({
                                                                    ...currentForm,

                                                                    barcode:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            );

                                                            setFormError(
                                                                '',
                                                            );
                                                        }}
                                                    />
                                                </label>
                                            </div>

                                            <div className="pos-form-information">
                                                <Icon name="info" />

                                                <p>
                                                    SKU is generated
                                                    automatically. Cost price,
                                                    selling price, quantity,
                                                    discounts, batch
                                                    information and expiry
                                                    dates are recorded during
                                                    purchasing and stock
                                                    receiving.
                                                </p>
                                            </div>
                                        </section>
                                    )}
                                </div>

                                <footer className="pos-modal-footer">
                                    <button
                                        type="button"
                                        className="pos-button"
                                        disabled={
                                            isSubmitting
                                        }
                                        onClick={
                                            closeForm
                                        }
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="pos-button pos-button-primary"
                                        disabled={
                                            isSubmitting
                                            || !hasSelectedCategory
                                            || categories.length
                                            === 0
                                        }
                                    >
                                        {isSubmitting
                                            ? 'Saving...'
                                            : editingProduct
                                                ? 'Update Product'
                                                : 'Create Product'}
                                    </button>
                                </footer>
                            </form>
                        </section>
                    </div>
                </div>,
                document.body,
            )
            : null;

    const deleteModal =
        pendingDelete
            && typeof document !== 'undefined'
            ? createPortal(
                <div id="pos-delete-modal-root">
                    <div
                        className="pos-modal-backdrop"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (
                                event.target
                                === event.currentTarget
                            ) {
                                closeDeleteDialog();
                            }
                        }}
                    >
                        <section
                            className="pos-delete-dialog"
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="pos-delete-title"
                            aria-describedby="pos-delete-description"
                        >
                            <div className="pos-delete-content">
                                <div className="pos-delete-icon">
                                    <Icon name="trash" />
                                </div>

                                <h2
                                    id="pos-delete-title"
                                    className="pos-delete-title"
                                >
                                    Delete Product?
                                </h2>

                                <p
                                    id="pos-delete-description"
                                    className="pos-delete-message"
                                >
                                    You are about to delete
                                    {' '}

                                    <span className="pos-delete-product-name">
                                        “{pendingDelete.name}”
                                    </span>

                                    . This action cannot be
                                    undone.
                                </p>

                                <div className="pos-delete-warning">
                                    Products linked to purchase,
                                    stock or sales records may be
                                    protected from deletion by the
                                    system.
                                </div>
                            </div>

                            <footer className="pos-delete-actions">
                                <button
                                    ref={
                                        deleteCancelButtonRef
                                    }
                                    type="button"
                                    className="pos-button"
                                    disabled={
                                        deletingProductId
                                        !== null
                                    }
                                    onClick={
                                        closeDeleteDialog
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="pos-button pos-button-danger"
                                    disabled={
                                        deletingProductId
                                        !== null
                                    }
                                    onClick={() => {
                                        void handleDelete();
                                    }}
                                >
                                    <Icon
                                        name="trash"
                                        className="pos-button-icon"
                                    />

                                    {deletingProductId !== null
                                        ? 'Deleting...'
                                        : 'Delete Product'}
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
            <div id="pos-products-page">
                <style>
                    {productsPageStyles}
                </style>

                <div className="pos-products-container">
                    <header className="pos-products-header">
                        <div className="pos-products-heading">
                            <span className="pos-products-eyebrow">
                                Inventory Setup
                            </span>

                            <h1 className="pos-products-title">
                                Products
                            </h1>

                            <p className="pos-products-description">
                                Manage product names,
                                categories, units, barcodes,
                                availability and status from one
                                central workspace.
                            </p>
                        </div>

                        <div className="pos-products-header-actions">
                            <span className="pos-products-count">
                                {productCountLabel}
                            </span>

                            <button
                                type="button"
                                className="pos-button pos-button-primary"
                                disabled={
                                    isCategoryLoading
                                    || categories.length === 0
                                }
                                onClick={
                                    openCreateForm
                                }
                            >
                                <Icon
                                    name="plus"
                                    className="pos-button-icon"
                                />

                                Add Product
                            </button>
                        </div>
                    </header>

                    {(successMessage
                        || pageError
                        || categoryError
                        || (
                            !isCategoryLoading
                            && categories.length === 0
                            && !categoryError
                        )) && (
                            <div
                                className="pos-feedback-stack"
                                aria-live="polite"
                            >
                                {successMessage && (
                                    <div
                                        className="pos-alert pos-alert-success"
                                        role="status"
                                    >
                                        <Icon
                                            name="check"
                                            className="pos-alert-icon"
                                        />

                                        <span className="pos-alert-copy">
                                            {successMessage}
                                        </span>

                                        <button
                                            type="button"
                                            className="pos-alert-close"
                                            aria-label="Dismiss success message"
                                            onClick={() => {
                                                setSuccessMessage(
                                                    '',
                                                );
                                            }}
                                        >
                                            <Icon name="x" />
                                        </button>
                                    </div>
                                )}

                                {pageError && (
                                    <div
                                        className="pos-alert pos-alert-error"
                                        role="alert"
                                    >
                                        <Icon
                                            name="alert"
                                            className="pos-alert-icon"
                                        />

                                        <span className="pos-alert-copy">
                                            {pageError}
                                        </span>

                                        <button
                                            type="button"
                                            className="pos-button pos-alert-action"
                                            onClick={() => {
                                                void loadProducts();
                                            }}
                                        >
                                            <Icon
                                                name="refresh"
                                                className="pos-button-icon"
                                            />

                                            Retry
                                        </button>
                                    </div>
                                )}

                                {categoryError && (
                                    <div
                                        className="pos-alert pos-alert-error"
                                        role="alert"
                                    >
                                        <Icon
                                            name="alert"
                                            className="pos-alert-icon"
                                        />

                                        <span className="pos-alert-copy">
                                            {categoryError}
                                        </span>

                                        <button
                                            type="button"
                                            className="pos-button pos-alert-action"
                                            onClick={() => {
                                                void loadCategories();
                                            }}
                                        >
                                            <Icon
                                                name="refresh"
                                                className="pos-button-icon"
                                            />

                                            Reload Categories
                                        </button>
                                    </div>
                                )}

                                {!isCategoryLoading
                                    && categories.length === 0
                                    && !categoryError && (
                                        <div className="pos-alert pos-alert-warning">
                                            <Icon
                                                name="alert"
                                                className="pos-alert-icon"
                                            />

                                            <span className="pos-alert-copy">
                                                No product categories
                                                are available. Create a
                                                category before adding
                                                products.
                                            </span>
                                        </div>
                                    )}
                            </div>
                        )}

                    <section className="pos-products-panel">
                        <form
                            className="pos-toolbar"
                            onSubmit={
                                handleSearchSubmit
                            }
                        >
                            <label className="pos-field">
                                <span className="pos-toolbar-label">
                                    Search Products
                                </span>

                                <span className="pos-search-wrap">
                                    <Icon
                                        name="search"
                                        className="pos-search-icon"
                                    />

                                    <input
                                        type="search"
                                        className="pos-input pos-search-input"
                                        value={
                                            searchInput
                                        }
                                        placeholder="Search name, category, barcode, SKU or unit"
                                        aria-label="Search products"
                                        onChange={(event) => {
                                            setSearchInput(
                                                event
                                                    .target
                                                    .value,
                                            );
                                        }}
                                    />

                                    {searchInput && (
                                        <button
                                            type="button"
                                            className="pos-clear-search"
                                            aria-label="Clear product search"
                                            onClick={
                                                clearSearch
                                            }
                                        >
                                            <Icon name="x" />
                                        </button>
                                    )}
                                </span>
                            </label>

                            <button
                                type="submit"
                                className="pos-button"
                            >
                                <Icon
                                    name="search"
                                    className="pos-button-icon"
                                />

                                Search
                            </button>

                            <label className="pos-field pos-row-limit">
                                <span className="pos-toolbar-label">
                                    Rows per page
                                </span>

                                <select
                                    className="pos-select"
                                    value={
                                        perPage
                                    }
                                    onChange={(event) => {
                                        setPerPage(
                                            Number(
                                                event
                                                    .target
                                                    .value,
                                            ),
                                        );

                                        setPage(1);
                                    }}
                                >
                                    {PAGE_SIZE_OPTIONS.map(
                                        (option) => (
                                            <option
                                                key={
                                                    option
                                                }
                                                value={
                                                    option
                                                }
                                            >
                                                {option}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>
                        </form>

                        <div className="pos-table-scroll">
                            <table className="pos-products-table">
                                <thead>
                                    <tr>
                                        <th className="pos-col-product">
                                            Product
                                        </th>

                                        <th className="pos-col-category">
                                            Category
                                        </th>

                                        <th className="pos-col-unit">
                                            Unit
                                        </th>

                                        <th className="pos-col-barcode">
                                            Barcode
                                        </th>

                                        <th className="pos-col-stock">
                                            Available Stock
                                        </th>

                                        <th className="pos-col-status">
                                            Status
                                        </th>

                                        <th className="pos-col-actions">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td
                                                colSpan={
                                                    7
                                                }
                                                className="pos-table-state"
                                            >
                                                <div className="pos-state-content">
                                                    <div className="pos-spinner" />

                                                    <strong className="pos-state-title">
                                                        Loading products
                                                    </strong>

                                                    <span className="pos-state-description">
                                                        Please wait
                                                        while the
                                                        latest product
                                                        records are
                                                        loaded.
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : products.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={
                                                    7
                                                }
                                                className="pos-table-state"
                                            >
                                                <div className="pos-state-content">
                                                    <span className="pos-state-icon">
                                                        <Icon name="box" />
                                                    </span>

                                                    <strong className="pos-state-title">
                                                        No products
                                                        found
                                                    </strong>

                                                    <span className="pos-state-description">
                                                        {search
                                                            ? 'No products match the current search. Try a different keyword.'
                                                            : 'Add the first product to begin building your inventory catalogue.'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map(
                                            (product) => (
                                                <tr
                                                    key={
                                                        product.id
                                                    }
                                                >
                                                    <td>
                                                        <div className="pos-product-cell">
                                                            <span className="pos-product-avatar">
                                                                {product.name
                                                                    .charAt(
                                                                        0,
                                                                    )
                                                                    .toUpperCase()
                                                                    || 'P'}
                                                            </span>

                                                            <div className="pos-product-meta">
                                                                <strong
                                                                    className="pos-product-name"
                                                                    title={
                                                                        product.name
                                                                    }
                                                                >
                                                                    {
                                                                        product.name
                                                                    }
                                                                </strong>

                                                                <span
                                                                    className="pos-product-sku"
                                                                    title={
                                                                        product.sku
                                                                        ?? 'Auto generated'
                                                                    }
                                                                >
                                                                    SKU:
                                                                    {' '}
                                                                    {product.sku
                                                                        || 'Auto generated'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className="pos-category-badge"
                                                            title={
                                                                product
                                                                    .category
                                                                    ?.name
                                                                ?? 'Not assigned'
                                                            }
                                                        >
                                                            {product
                                                                .category
                                                                ?.name
                                                                ?? 'Not assigned'}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className="pos-cell-truncate">
                                                            {
                                                                product.unit
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className="pos-cell-truncate"
                                                            title={
                                                                product.barcode
                                                                ?? 'Not assigned'
                                                            }
                                                        >
                                                            {product.barcode
                                                                || 'Not assigned'}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <strong className="pos-stock-value">
                                                            {formatNumber(
                                                                product
                                                                    .total_available_quantity,
                                                            )}
                                                            {' '}
                                                            {
                                                                product.unit
                                                            }
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={
                                                                product.is_active
                                                                    ? 'pos-status-badge pos-status-active'
                                                                    : 'pos-status-badge pos-status-inactive'
                                                            }
                                                        >
                                                            {product.is_active
                                                                ? 'Active'
                                                                : 'Inactive'}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="pos-row-actions">
                                                            <button
                                                                type="button"
                                                                className="pos-button pos-row-action pos-row-action-view"
                                                                onClick={() => {
                                                                    openProductDetails(
                                                                        product.id,
                                                                    );
                                                                }}
                                                            >
                                                                <Icon
                                                                    name="eye"
                                                                    className="pos-button-icon"
                                                                />

                                                                View
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="pos-button pos-row-action pos-row-action-edit"
                                                                onClick={() => {
                                                                    openEditForm(
                                                                        product,
                                                                    );
                                                                }}
                                                            >
                                                                <Icon
                                                                    name="edit"
                                                                    className="pos-button-icon"
                                                                />

                                                                Edit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="pos-button pos-row-action pos-row-action-delete"
                                                                disabled={
                                                                    deletingProductId
                                                                    === product.id
                                                                }
                                                                onClick={() => {
                                                                    setPendingDelete(
                                                                        product,
                                                                    );
                                                                }}
                                                            >
                                                                <Icon
                                                                    name="trash"
                                                                    className="pos-button-icon"
                                                                />

                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ),
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {!isLoading
                            && pagination.total > 0 && (
                                <footer className="pos-pagination">
                                    <p className="pos-pagination-summary">
                                        Showing
                                        {' '}

                                        <strong>
                                            {formatNumber(
                                                pagination.from,
                                            )}
                                        </strong>

                                        {' '}to{' '}

                                        <strong>
                                            {formatNumber(
                                                pagination.to,
                                            )}
                                        </strong>

                                        {' '}of{' '}

                                        <strong>
                                            {formatNumber(
                                                pagination.total,
                                            )}
                                        </strong>

                                        {' '}products
                                    </p>

                                    <div className="pos-pagination-controls">
                                        <button
                                            type="button"
                                            className="pos-button pos-page-button"
                                            disabled={
                                                page <= 1
                                            }
                                            onClick={() => {
                                                setPage(
                                                    (
                                                        currentPage,
                                                    ) =>
                                                        Math.max(
                                                            1,
                                                            currentPage
                                                            - 1,
                                                        ),
                                                );
                                            }}
                                        >
                                            <Icon
                                                name="chevron-left"
                                                className="pos-button-icon"
                                            />

                                            Previous
                                        </button>

                                        <span className="pos-page-indicator">
                                            Page
                                            {' '}

                                            <strong>
                                                {
                                                    pagination.current_page
                                                }
                                            </strong>

                                            {' '}of{' '}

                                            <strong>
                                                {
                                                    pagination.last_page
                                                }
                                            </strong>
                                        </span>

                                        <button
                                            type="button"
                                            className="pos-button pos-page-button"
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

                                                            currentPage
                                                            + 1,
                                                        ),
                                                );
                                            }}
                                        >
                                            Next

                                            <Icon
                                                name="chevron-right"
                                                className="pos-button-icon"
                                            />
                                        </button>
                                    </div>
                                </footer>
                            )}
                    </section>
                </div>
            </div>

            {productModal}
            {deleteModal}
        </>
    );
}