import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../../auth/AuthContext';
import BatchSelectionModal from '../../components/pos/BatchSelectionModal';
import PaymentModal from '../../components/pos/PaymentModal';
import SaleReceiptModal from '../../components/pos/SaleReceiptModal';
import { ApiError } from '../../lib/api';
import {
    completePosSale,
    getPosCategories,
    getPosProducts,
} from '../../services/posService';
import type {
    CompleteSaleValues,
    PosCartItem,
    PosCategory,
    PosPaginationMeta,
    PosProduct,
    PosStockBatch,
    SaleReceipt,
} from '../../types/sale';

const PRODUCT_PAGE_SIZE = 24;

const currencyFormatter = new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 3,
});

const initialPagination: PosPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: PRODUCT_PAGE_SIZE,
    total: 0,
    from: null,
    to: null,
};

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError || error instanceof Error) {
        return error.message;
    }

    return fallback;
}

function formatPriceRange(product: PosProduct): string {
    if (product.minimum_price === null || product.maximum_price === null) {
        return 'Price unavailable';
    }

    if (product.minimum_price === product.maximum_price) {
        return currencyFormatter.format(product.minimum_price);
    }

    return `${currencyFormatter.format(product.minimum_price)} – ${currencyFormatter.format(
        product.maximum_price,
    )}`;
}

function formatQuantity(value: number | string | null | undefined): string {
    const parsedValue = Number(value ?? 0);
    return Number.isFinite(parsedValue) ? quantityFormatter.format(parsedValue) : '0';
}

function formatExpiryDate(value: string | null | undefined): string {
    if (!value) {
        return 'No expiry';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

type IconName =
    | 'alert'
    | 'basket'
    | 'box'
    | 'chevron-left'
    | 'chevron-right'
    | 'close'
    | 'filter'
    | 'minus'
    | 'plus'
    | 'receipt'
    | 'refresh'
    | 'search'
    | 'trash';

function Icon({ name, className = '' }: { name: IconName; className?: string }) {
    const props = {
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
                <svg {...props}>
                    <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                </svg>
            );

        case 'basket':
            return (
                <svg {...props}>
                    <path d="m6 9 6-6 6 6" />
                    <path d="M3 9h18l-2 11H5Z" />
                    <path d="M9 13v3M15 13v3" />
                </svg>
            );

        case 'box':
            return (
                <svg {...props}>
                    <path d="m21 8-9 5-9-5" />
                    <path d="m3 8 9-5 9 5v8l-9 5-9-5Z" />
                    <path d="M12 13v8" />
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

        case 'filter':
            return (
                <svg {...props}>
                    <path d="M4 5h16M7 12h10M10 19h4" />
                </svg>
            );

        case 'minus':
            return (
                <svg {...props}>
                    <path d="M5 12h14" />
                </svg>
            );

        case 'plus':
            return (
                <svg {...props}>
                    <path d="M12 5v14M5 12h14" />
                </svg>
            );

        case 'receipt':
            return (
                <svg {...props}>
                    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
                    <path d="M9 8h6M9 12h6M9 16h3" />
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
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                </svg>
            );

        case 'trash':
        default:
            return (
                <svg {...props}>
                    <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6M10 11v5M14 11v5" />
                </svg>
            );
    }
}

const styles = `
#agro-pos,
#agro-pos *,
#agro-pos *::before,
#agro-pos *::after {
    box-sizing: border-box !important;
}

#agro-pos {
    --green-950: #052e16;
    --green-900: #14532d;
    --green-800: #166534;
    --green-700: #15803d;
    --green-100: #dcfce7;
    --green-50: #f0fdf4;

    --red: #b42318;
    --red-bg: #fef3f2;

    --amber: #b54708;
    --amber-bg: #fffaeb;

    --text: #101828;
    --text-2: #344054;
    --muted: #667085;

    --border: #d5ded7;
    --border-dark: #b8c5bb;

    --surface: #ffffff;
    --page: #f3f6f4;

    display: grid !important;
    grid-template-columns:
        minmax(0, 1fr)
        minmax(360px, 420px) !important;

    gap: 16px !important;

    width: 100% !important;
    min-width: 0 !important;
    min-height: calc(100dvh - 120px) !important;

    color: var(--text) !important;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif !important;

    font-size: 14px !important;
    line-height: 1.5 !important;

    background: transparent !important;

    isolation: isolate !important;
}

#agro-pos button,
#agro-pos input,
#agro-pos select {
    font: inherit !important;

    text-transform: none !important;
    letter-spacing: normal !important;
}

#agro-pos h1,
#agro-pos h2,
#agro-pos p {
    margin: 0 !important;
}

#agro-pos button:focus-visible,
#agro-pos input:focus-visible,
#agro-pos select:focus-visible {
    outline: none !important;

    border-color: var(--green-700) !important;

    box-shadow:
        0 0 0 4px
        rgba(21, 128, 61, 0.14) !important;
}

#agro-pos .pos-products,
#agro-pos .pos-cart {
    min-width: 0 !important;

    overflow: hidden !important;

    background: var(--surface) !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 14px !important;

    box-shadow:
        0 1px 3px
        rgba(16, 24, 40, 0.08) !important;
}

#agro-pos .pos-products {
    display: flex !important;

    min-height: 680px !important;

    flex-direction: column !important;
}

#agro-pos .pos-header {
    display: flex !important;

    min-height: 88px !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 18px !important;

    padding: 17px 20px !important;

    background:
        linear-gradient(
            135deg,
            #ffffff,
            #f3fbf5
        ) !important;

    border-bottom:
        1px solid
        var(--border) !important;
}

#agro-pos .eyebrow {
    display: block !important;

    margin-bottom: 3px !important;

    color: var(--green-700) !important;

    font-size: 11px !important;
    font-weight: 750 !important;
    letter-spacing: 0.06em !important;

    text-transform: uppercase !important;
}

#agro-pos .page-title {
    font-size: 23px !important;
    font-weight: 730 !important;
    line-height: 1.2 !important;
    letter-spacing: -0.02em !important;
}

#agro-pos .subtitle {
    margin-top: 4px !important;

    color: var(--muted) !important;

    font-size: 13px !important;
}

#agro-pos .customer-note {
    min-width: 215px !important;

    padding: 10px 12px !important;

    background: #ffffff !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 10px !important;
}

#agro-pos .customer-note span {
    display: block !important;

    color: var(--muted) !important;

    font-size: 10px !important;
    font-weight: 700 !important;
    letter-spacing: 0.05em !important;

    text-transform: uppercase !important;
}

#agro-pos .customer-note strong {
    display: block !important;

    color: var(--green-900) !important;

    font-size: 13px !important;
    font-weight: 700 !important;
}

#agro-pos .customer-note small {
    color: var(--muted) !important;

    font-size: 11px !important;
}

#agro-pos .alert {
    display: flex !important;

    align-items: center !important;
    gap: 9px !important;

    margin: 12px 14px 0 !important;
    padding: 10px 12px !important;

    color: var(--red) !important;

    font-size: 13px !important;
    font-weight: 600 !important;

    background: var(--red-bg) !important;

    border:
        1px solid
        #f3b5af !important;

    border-radius: 9px !important;
}

#agro-pos .alert svg {
    width: 18px !important;
    height: 18px !important;
    flex: 0 0 18px !important;
}

#agro-pos .alert span {
    min-width: 0 !important;
    flex: 1 !important;
}

#agro-pos .retry {
    display: inline-flex !important;

    min-height: 32px !important;

    align-items: center !important;
    gap: 5px !important;

    padding: 5px 8px !important;

    color: var(--red) !important;

    font-size: 12px !important;
    font-weight: 650 !important;

    background: #ffffff !important;

    border:
        1px solid
        #e8aaa4 !important;

    border-radius: 7px !important;

    cursor: pointer !important;
}

#agro-pos .retry svg {
    width: 14px !important;
    height: 14px !important;
}

#agro-pos .filters {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        minmax(190px, 230px) !important;

    gap: 10px !important;

    padding: 14px !important;

    border-bottom:
        1px solid
        #e8ede9 !important;
}

#agro-pos .field {
    display: grid !important;

    min-width: 0 !important;

    gap: 5px !important;
}

#agro-pos .field-label {
    color: var(--text-2) !important;

    font-size: 11px !important;
    font-weight: 650 !important;
}

#agro-pos .control-wrap {
    position: relative !important;

    min-width: 0 !important;
}

#agro-pos .control-icon {
    position: absolute !important;

    top: 50% !important;
    left: 12px !important;

    width: 18px !important;
    height: 18px !important;

    color: var(--muted) !important;

    transform: translateY(-50%) !important;

    pointer-events: none !important;
}

#agro-pos .search-input,
#agro-pos .category-select,
#agro-pos .number-input {
    display: block !important;

    width: 100% !important;
    height: 44px !important;
    min-height: 44px !important;

    color: var(--text) !important;

    font-size: 14px !important;
    font-weight: 500 !important;

    outline: none !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border-dark) !important;

    border-radius: 9px !important;
}

#agro-pos .search-input {
    padding: 0 42px !important;

    background: #f8faf9 !important;
}

#agro-pos .search-input::placeholder {
    color: #7a8696 !important;

    opacity: 1 !important;
}

#agro-pos .category-select {
    padding: 0 34px 0 38px !important;

    appearance: none !important;

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
        calc(100% - 16px) 18px,
        calc(100% - 11px) 18px !important;

    background-size:
        5px 5px,
        5px 5px !important;

    background-repeat: no-repeat !important;

    cursor: pointer !important;
}

#agro-pos .clear-search {
    position: absolute !important;

    top: 50% !important;
    right: 5px !important;

    display: grid !important;

    width: 32px !important;
    height: 32px !important;

    place-items: center !important;

    padding: 0 !important;

    color: var(--muted) !important;

    background: transparent !important;

    border: 0 !important;
    border-radius: 7px !important;

    transform: translateY(-50%) !important;

    cursor: pointer !important;
}

#agro-pos .clear-search:hover {
    color: var(--text) !important;

    background: #eaf0ec !important;
}

#agro-pos .clear-search svg {
    width: 16px !important;
    height: 16px !important;
}

#agro-pos .product-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            auto-fill,
            minmax(210px, 1fr)
        ) !important;

    align-content: start !important;

    gap: 12px !important;

    min-height: 330px !important;
    flex: 1 !important;

    padding: 14px !important;

    background: #f5f8f6 !important;
}

#agro-pos .product-card {
    display: flex !important;

    min-width: 0 !important;
    min-height: 158px !important;

    flex-direction: column !important;
    gap: 10px !important;

    padding: 13px !important;

    color: var(--text) !important;

    text-align: left !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 11px !important;

    box-shadow:
        0 2px 7px
        rgba(16, 24, 40, 0.045) !important;

    cursor: pointer !important;

    transition:
        transform 0.15s ease,
        border-color 0.15s ease,
        box-shadow 0.15s ease !important;
}

#agro-pos .product-card:hover {
    border-color: var(--green-700) !important;

    box-shadow:
        0 8px 18px
        rgba(21, 128, 61, 0.12) !important;

    transform: translateY(-2px) !important;
}

#agro-pos .product-top {
    display: flex !important;

    min-width: 0 !important;

    align-items: flex-start !important;
    gap: 10px !important;
}

#agro-pos .product-initial {
    display: grid !important;

    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;

    place-items: center !important;

    color: #ffffff !important;

    font-size: 15px !important;
    font-weight: 750 !important;

    background:
        linear-gradient(
            145deg,
            var(--green-900),
            var(--green-700)
        ) !important;

    border-radius: 9px !important;
}

#agro-pos .product-copy {
    display: flex !important;

    min-width: 0 !important;
    flex: 1 !important;

    flex-direction: column !important;
}

#agro-pos .category-badge {
    display: inline-flex !important;

    width: fit-content !important;
    max-width: 100% !important;

    margin-bottom: 4px !important;
    padding: 3px 7px !important;

    overflow: hidden !important;

    color: var(--green-900) !important;

    font-size: 10px !important;
    font-weight: 700 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;

    background: var(--green-50) !important;

    border:
        1px solid
        var(--green-100) !important;

    border-radius: 999px !important;
}

#agro-pos .product-name {
    display: -webkit-box !important;

    overflow: hidden !important;

    font-size: 15px !important;
    font-weight: 680 !important;
    line-height: 1.35 !important;

    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
}

#agro-pos .product-code {
    display: block !important;

    margin-top: 4px !important;

    overflow: hidden !important;

    color: var(--muted) !important;

    font-size: 11px !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#agro-pos .product-meta {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1.3fr)
        minmax(0, 0.8fr) !important;

    gap: 8px !important;

    margin-top: auto !important;
}

#agro-pos .meta-box {
    display: flex !important;

    min-width: 0 !important;
    min-height: 50px !important;

    flex-direction: column !important;
    justify-content: center !important;
    gap: 2px !important;

    padding: 7px 8px !important;

    background: #f8faf9 !important;

    border:
        1px solid
        #e8ede9 !important;

    border-radius: 8px !important;
}

#agro-pos .meta-box span {
    color: var(--muted) !important;

    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.03em !important;

    text-transform: uppercase !important;
}

#agro-pos .meta-box strong {
    overflow: hidden !important;

    font-size: 12px !important;
    font-weight: 700 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#agro-pos .price strong {
    color: var(--green-800) !important;
}

#agro-pos .state {
    display: flex !important;

    min-height: 300px !important;

    grid-column: 1 / -1 !important;

    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 8px !important;

    padding: 28px !important;

    text-align: center !important;

    background: #ffffff !important;

    border:
        1px dashed
        var(--border-dark) !important;

    border-radius: 11px !important;
}

#agro-pos .state-icon {
    display: grid !important;

    width: 46px !important;
    height: 46px !important;

    place-items: center !important;

    color: var(--green-700) !important;

    background: var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 11px !important;
}

#agro-pos .state-icon svg {
    width: 23px !important;
    height: 23px !important;
}

#agro-pos .state strong {
    font-size: 16px !important;
    font-weight: 700 !important;
}

#agro-pos .state span {
    max-width: 400px !important;

    color: var(--muted) !important;

    font-size: 13px !important;
}

#agro-pos .spinner {
    width: 36px !important;
    height: 36px !important;

    border:
        4px solid
        var(--green-100) !important;

    border-top-color: var(--green-700) !important;

    border-radius: 50% !important;

    animation:
        pos-spin
        0.7s
        linear
        infinite !important;
}

@keyframes pos-spin {
    to {
        transform: rotate(360deg);
    }
}

#agro-pos .pagination {
    display: flex !important;

    min-height: 58px !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 10px 14px !important;

    border-top:
        1px solid
        #e8ede9 !important;
}

#agro-pos .pagination-label {
    color: var(--muted) !important;

    font-size: 12px !important;
}

#agro-pos .pagination-label strong {
    color: var(--text) !important;
}

#agro-pos .page-actions {
    display: flex !important;

    gap: 7px !important;
}

#agro-pos .page-button {
    display: inline-flex !important;

    min-height: 36px !important;

    align-items: center !important;
    gap: 5px !important;

    padding: 7px 9px !important;

    color: var(--green-900) !important;

    font-size: 12px !important;
    font-weight: 650 !important;

    background: var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#agro-pos .page-button:hover:not(:disabled) {
    color: #ffffff !important;

    background: var(--green-800) !important;

    border-color: var(--green-800) !important;
}

#agro-pos .page-button:disabled {
    color: #98a2b3 !important;

    background: #f2f4f7 !important;

    border-color: #e4e7ec !important;

    cursor: not-allowed !important;
}

#agro-pos .page-button svg {
    width: 15px !important;
    height: 15px !important;
}

#agro-pos .pos-cart {
    position: sticky !important;

    top: 88px !important;

    display: flex !important;

    max-height: calc(100dvh - 112px) !important;

    flex-direction: column !important;
}

#agro-pos .cart-header {
    display: flex !important;

    min-height: 76px !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 14px 16px !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--green-900),
            var(--green-800)
        ) !important;
}

#agro-pos .cart-header .eyebrow {
    color: #bbf7d0 !important;
}

#agro-pos .cart-title {
    font-size: 20px !important;
    font-weight: 730 !important;
}

#agro-pos .cart-count {
    display: inline-flex !important;

    min-height: 34px !important;

    align-items: center !important;

    padding: 6px 10px !important;

    color: var(--green-900) !important;

    font-size: 12px !important;
    font-weight: 700 !important;

    white-space: nowrap !important;

    background: var(--green-100) !important;

    border-radius: 999px !important;
}

#agro-pos .cart-items {
    display: flex !important;

    min-height: 220px !important;
    flex: 1 !important;

    flex-direction: column !important;
    gap: 10px !important;

    padding: 12px !important;

    overflow-y: auto !important;

    background: #f5f8f6 !important;

    scrollbar-width: thin !important;

    scrollbar-color:
        #a7b7ab
        transparent !important;
}

#agro-pos .empty-cart {
    display: flex !important;

    min-height: 230px !important;
    flex: 1 !important;

    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 7px !important;

    padding: 24px !important;

    text-align: center !important;

    background: #ffffff !important;

    border:
        1px dashed
        var(--border-dark) !important;

    border-radius: 11px !important;
}

#agro-pos .empty-icon {
    display: grid !important;

    width: 48px !important;
    height: 48px !important;

    place-items: center !important;

    color: #ffffff !important;

    background: var(--green-800) !important;

    border-radius: 12px !important;
}

#agro-pos .empty-icon svg {
    width: 23px !important;
    height: 23px !important;
}

#agro-pos .empty-cart strong {
    font-size: 16px !important;
}

#agro-pos .empty-cart span {
    max-width: 260px !important;

    color: var(--muted) !important;

    font-size: 12px !important;
}

#agro-pos .cart-item {
    padding: 12px !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 10px !important;

    box-shadow:
        0 1px 4px
        rgba(16, 24, 40, 0.04) !important;
}

#agro-pos .cart-item-header {
    display: flex !important;

    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 10px !important;

    padding-bottom: 9px !important;

    border-bottom:
        1px solid
        #e8ede9 !important;
}

#agro-pos .cart-item-copy {
    display: flex !important;

    min-width: 0 !important;
    flex: 1 !important;

    flex-direction: column !important;
}

#agro-pos .cart-item-name {
    overflow: hidden !important;

    font-size: 14px !important;
    font-weight: 680 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#agro-pos .batch {
    overflow: hidden !important;

    color: var(--muted) !important;

    font-size: 11px !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#agro-pos .remove {
    display: grid !important;

    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;

    place-items: center !important;

    padding: 0 !important;

    color: var(--red) !important;

    background: var(--red-bg) !important;

    border:
        1px solid
        #f1b8b3 !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#agro-pos .remove:hover {
    color: #ffffff !important;

    background: #d92d20 !important;

    border-color: #d92d20 !important;
}

#agro-pos .remove svg {
    width: 17px !important;
    height: 17px !important;
}

#agro-pos .cart-meta {
    display: grid !important;

    grid-template-columns:
        repeat(
            3,
            minmax(0, 1fr)
        ) !important;

    gap: 7px !important;

    margin: 9px 0 !important;
}

#agro-pos .cart-meta .meta-box strong {
    color: var(--text-2) !important;

    font-size: 11px !important;
}

#agro-pos .quantity-row {
    display: grid !important;

    grid-template-columns:
        38px
        minmax(72px, 90px)
        38px
        minmax(0, 1fr) !important;

    align-items: center !important;
    gap: 6px !important;
}

#agro-pos .quantity-button {
    display: grid !important;

    width: 38px !important;
    height: 38px !important;

    place-items: center !important;

    padding: 0 !important;

    color: var(--green-900) !important;

    background: var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#agro-pos .quantity-button:hover:not(:disabled) {
    color: #ffffff !important;

    background: var(--green-800) !important;

    border-color: var(--green-800) !important;
}

#agro-pos .quantity-button:disabled {
    color: #98a2b3 !important;

    background: #f2f4f7 !important;

    border-color: #e4e7ec !important;

    cursor: not-allowed !important;
}

#agro-pos .quantity-button svg {
    width: 17px !important;
    height: 17px !important;
}

#agro-pos .number-input {
    height: 38px !important;
    min-height: 38px !important;

    padding: 0 7px !important;

    font-size: 13px !important;
    font-weight: 650 !important;

    text-align: center !important;
}

#agro-pos .line-total {
    min-width: 0 !important;

    overflow: hidden !important;

    color: var(--green-900) !important;

    font-size: 14px !important;
    font-weight: 750 !important;

    text-align: right !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#agro-pos .discount-row {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        120px !important;

    align-items: center !important;
    gap: 8px !important;

    margin-top: 9px !important;
}

#agro-pos .discount-row span {
    color: var(--muted) !important;

    font-size: 11px !important;
    font-weight: 600 !important;
}

#agro-pos .discount-row .number-input {
    text-align: right !important;
}

#agro-pos .cart-summary {
    display: flex !important;

    flex-direction: column !important;
    gap: 8px !important;

    padding: 13px 14px 14px !important;

    border-top:
        1px solid
        var(--border) !important;
}

#agro-pos .sale-discount {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        130px !important;

    align-items: center !important;
    gap: 10px !important;

    padding-bottom: 9px !important;

    border-bottom:
        1px solid
        #e8ede9 !important;
}

#agro-pos .sale-discount span {
    color: var(--text-2) !important;

    font-size: 12px !important;
    font-weight: 650 !important;
}

#agro-pos .sale-discount .number-input {
    text-align: right !important;
}

#agro-pos .summary-row {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    color: var(--muted) !important;

    font-size: 12px !important;
}

#agro-pos .summary-row strong {
    color: var(--text-2) !important;

    font-size: 13px !important;
}

#agro-pos .grand-total {
    display: flex !important;

    min-height: 62px !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 10px 12px !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--green-900),
            var(--green-700)
        ) !important;

    border-radius: 10px !important;
}

#agro-pos .grand-total span {
    color: #d8f7e1 !important;

    font-size: 12px !important;
    font-weight: 650 !important;
}

#agro-pos .grand-total strong {
    font-size: 20px !important;
    font-weight: 780 !important;
}

#agro-pos .payment-button,
#agro-pos .clear-button,
#agro-pos .confirm-button,
#agro-pos .cancel-button {
    display: inline-flex !important;

    min-height: 44px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;

    padding: 9px 12px !important;

    font-size: 13px !important;
    font-weight: 700 !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#agro-pos .payment-button {
    color: #ffffff !important;

    background: var(--green-700) !important;

    border:
        1px solid
        var(--green-700) !important;

    box-shadow:
        0 5px 13px
        rgba(21, 128, 61, 0.18) !important;
}

#agro-pos .payment-button:hover:not(:disabled) {
    background: var(--green-800) !important;

    border-color: var(--green-800) !important;
}

#agro-pos .clear-button {
    min-height: 38px !important;

    color: var(--red) !important;

    background: var(--red-bg) !important;

    border:
        1px solid
        #f1b8b3 !important;
}

#agro-pos .clear-button:hover:not(:disabled) {
    color: #ffffff !important;

    background: #d92d20 !important;

    border-color: #d92d20 !important;
}

#agro-pos .payment-button:disabled,
#agro-pos .clear-button:disabled {
    opacity: 0.55 !important;

    cursor: not-allowed !important;
}

#agro-pos .payment-button svg,
#agro-pos .clear-button svg {
    width: 17px !important;
    height: 17px !important;
}

#agro-pos .clear-confirm {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        auto
        auto !important;

    align-items: center !important;
    gap: 7px !important;

    padding: 9px 10px !important;

    color: var(--amber) !important;

    background: var(--amber-bg) !important;

    border:
        1px solid
        #f0d48f !important;

    border-radius: 9px !important;
}

#agro-pos .clear-confirm span {
    font-size: 11px !important;
    font-weight: 600 !important;
}

#agro-pos .confirm-button,
#agro-pos .cancel-button {
    min-height: 32px !important;

    padding: 5px 8px !important;

    font-size: 11px !important;
}

#agro-pos .confirm-button {
    color: #ffffff !important;

    background: #d92d20 !important;

    border:
        1px solid
        #d92d20 !important;
}

#agro-pos .cancel-button {
    color: var(--text-2) !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border-dark) !important;
}

@media (max-width: 1500px) {
    #agro-pos {
        grid-template-columns:
            minmax(0, 1fr)
            minmax(340px, 390px) !important;
    }

    #agro-pos .product-grid {
        grid-template-columns:
            repeat(
                auto-fill,
                minmax(195px, 1fr)
            ) !important;
    }
}

@media (max-width: 1180px) {
    #agro-pos {
        display: flex !important;

        flex-direction: column !important;
    }

    #agro-pos .pos-cart {
        position: static !important;

        width: 100% !important;
        max-height: none !important;
    }

    #agro-pos .cart-items {
        max-height: 520px !important;
    }
}

@media (max-width: 720px) {
    #agro-pos {
        gap: 12px !important;
    }

    #agro-pos .pos-products,
    #agro-pos .pos-cart {
        border-radius: 11px !important;
    }

    #agro-pos .pos-header {
        align-items: stretch !important;
        flex-direction: column !important;

        padding: 15px !important;
    }

    #agro-pos .customer-note {
        width: 100% !important;
        min-width: 0 !important;
    }

    #agro-pos .filters {
        grid-template-columns: 1fr !important;

        padding: 12px !important;
    }

    #agro-pos .product-grid {
        grid-template-columns: 1fr !important;

        padding: 12px !important;
    }

    #agro-pos .pagination {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #agro-pos .page-actions {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #agro-pos .page-button {
        justify-content: center !important;
    }

    #agro-pos .cart-meta {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #agro-pos .cart-meta .meta-box:last-child {
        grid-column: 1 / -1 !important;
    }

    #agro-pos .quantity-row {
        grid-template-columns:
            38px
            minmax(70px, 90px)
            38px !important;
    }

    #agro-pos .line-total {
        grid-column: 1 / -1 !important;

        padding-top: 4px !important;
    }

    #agro-pos .clear-confirm {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #agro-pos .clear-confirm span {
        grid-column: 1 / -1 !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #agro-pos *,
    #agro-pos *::before,
    #agro-pos *::after {
        transition: none !important;

        scroll-behavior: auto !important;
    }

    #agro-pos .spinner {
        animation-duration: 1.2s !important;
    }
}
`;

export default function PosPage() {
    const { token } = useAuth();

    const searchInputRef = useRef<HTMLInputElement | null>(null);

    const [products, setProducts] = useState<PosProduct[]>([]);
    const [categories, setCategories] = useState<PosCategory[]>([]);
    const [cart, setCart] = useState<PosCartItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<PosProduct | null>(null);

    const [pagination, setPagination] =
        useState<PosPaginationMeta>(initialPagination);

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [saleDiscount, setSaleDiscount] = useState('0');

    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [cartError, setCartError] = useState('');

    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentError, setPaymentError] = useState('');

    const [receipt, setReceipt] = useState<SaleReceipt | null>(null);

    const [isClearCartConfirming, setIsClearCartConfirming] =
        useState(false);

    const loadCategories = useCallback(async (): Promise<void> => {
        if (!token) {
            return;
        }

        try {
            const response = await getPosCategories(token);
            setCategories(response.data);
        } catch (error) {
            setPageError(
                getErrorMessage(
                    error,
                    'Unable to load POS categories.',
                ),
            );
        }
    }, [token]);

    const loadProducts = useCallback(async (): Promise<void> => {
        if (!token) {
            return;
        }

        setIsLoading(true);
        setPageError('');

        try {
            const response = await getPosProducts(token, {
                page,
                perPage: PRODUCT_PAGE_SIZE,
                search: appliedSearch,
                categoryId: categoryFilter,
            });

            setProducts(response.data);
            setPagination(response.meta);
        } catch (error) {
            setPageError(
                getErrorMessage(
                    error,
                    'Unable to load POS products.',
                ),
            );
        } finally {
            setIsLoading(false);
        }
    }, [
        token,
        page,
        appliedSearch,
        categoryFilter,
    ]);

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        void loadProducts();
    }, [loadProducts]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setPage(1);
            setAppliedSearch(searchInput.trim());
        }, 300);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [searchInput]);

    useEffect(() => {
        if (cart.length === 0) {
            setIsClearCartConfirming(false);
        }
    }, [cart.length]);

    const subtotal = useMemo(
        () => (
            cart.reduce(
                (total, item) => (
                    total
                    + item.quantity * item.selling_price
                    - item.discount
                ),
                0,
            )
        ),
        [cart],
    );

    const cartQuantity = useMemo(
        () => (
            cart.reduce(
                (total, item) => total + item.quantity,
                0,
            )
        ),
        [cart],
    );

    const saleDiscountValue = Number(saleDiscount || 0);

    const safeSaleDiscount =
        Number.isFinite(saleDiscountValue)
            ? saleDiscountValue
            : 0;

    const grandTotal = Math.max(
        0,
        subtotal - safeSaleDiscount,
    );

    const refocusSearch = (): void => {
        window.setTimeout(() => {
            searchInputRef.current?.focus();
        }, 80);
    };

    const addBatchToCart = (
        product: PosProduct,
        batch: PosStockBatch,
        quantity: number,
    ): void => {
        setCartError('');

        if (!Number.isFinite(quantity) || quantity <= 0) {
            setCartError(
                'Quantity must be greater than zero.',
            );

            return;
        }

        const existingItem = cart.find(
            (item) => item.stock_batch_id === batch.id,
        );

        const newQuantity = Number(
            (
                (existingItem?.quantity ?? 0)
                + quantity
            ).toFixed(3),
        );

        if (newQuantity > batch.available_quantity) {
            setCartError(
                `Only ${formatQuantity(
                    batch.available_quantity,
                )} ${product.unit} are available at ${currencyFormatter.format(
                    batch.selling_price,
                )}.`,
            );

            return;
        }

        if (existingItem) {
            setCart((current) => (
                current.map((item) => (
                    item.stock_batch_id === batch.id
                        ? {
                            ...item,
                            quantity: newQuantity,
                        }
                        : item
                ))
            ));
        } else {
            setCart((current) => [
                ...current,
                {
                    stock_batch_id: batch.id,
                    product_id: product.id,
                    product_name: product.name,
                    unit: product.unit,
                    batch_code: batch.batch_code,
                    batch_number: batch.batch_number,
                    expiry_date: batch.expiry_date,
                    available_quantity:
                        batch.available_quantity,
                    selling_price: batch.selling_price,
                    quantity,
                    discount: 0,
                },
            ]);
        }

        setSelectedProduct(null);
        refocusSearch();
    };

    const updateCartQuantity = (
        batchId: number,
        quantity: number,
    ): void => {
        const item = cart.find(
            (cartItem) => (
                cartItem.stock_batch_id === batchId
            ),
        );

        if (!item) {
            return;
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
            setCartError(
                'Quantity must be greater than zero.',
            );

            return;
        }

        if (quantity > item.available_quantity) {
            setCartError(
                `Only ${formatQuantity(
                    item.available_quantity,
                )} ${item.unit} are available at this price.`,
            );

            return;
        }

        setCartError('');

        setCart((current) => (
            current.map((cartItem) => (
                cartItem.stock_batch_id === batchId
                    ? {
                        ...cartItem,
                        quantity: Number(
                            quantity.toFixed(3),
                        ),
                    }
                    : cartItem
            ))
        ));
    };

    const updateItemDiscount = (
        batchId: number,
        discount: number,
    ): void => {
        const item = cart.find(
            (cartItem) => (
                cartItem.stock_batch_id === batchId
            ),
        );

        if (!item) {
            return;
        }

        const maximumDiscount =
            item.quantity * item.selling_price;

        if (!Number.isFinite(discount) || discount < 0) {
            setCartError(
                'Item discount cannot be negative.',
            );

            return;
        }

        if (discount > maximumDiscount) {
            setCartError(
                `The maximum discount for ${item.product_name} is ${currencyFormatter.format(
                    maximumDiscount,
                )}.`,
            );

            return;
        }

        setCartError('');

        setCart((current) => (
            current.map((cartItem) => (
                cartItem.stock_batch_id === batchId
                    ? {
                        ...cartItem,
                        discount: Number(
                            discount.toFixed(2),
                        ),
                    }
                    : cartItem
            ))
        ));
    };

    const removeCartItem = (
        batchId: number,
    ): void => {
        setCart((current) => (
            current.filter(
                (item) => item.stock_batch_id !== batchId,
            )
        ));

        setCartError('');
    };

    const clearCart = (): void => {
        setCart([]);
        setSaleDiscount('0');
        setCartError('');
        setPaymentError('');
        setIsClearCartConfirming(false);
    };

    const clearSearch = (): void => {
        setSearchInput('');
        setAppliedSearch('');
        setPage(1);

        searchInputRef.current?.focus();
    };

    const openPayment = (): void => {
        if (cart.length === 0) {
            setCartError(
                'Add at least one product to the cart.',
            );

            return;
        }

        if (
            !Number.isFinite(saleDiscountValue)
            || saleDiscountValue < 0
        ) {
            setCartError(
                'Enter a valid sale discount.',
            );

            return;
        }

        if (saleDiscountValue > subtotal) {
            setCartError(
                'The sale discount cannot exceed the cart subtotal.',
            );

            return;
        }

        const invalidItem = cart.find(
            (item) => (
                item.quantity <= 0
                || item.quantity > item.available_quantity
                || item.discount < 0
                || item.discount
                    > item.quantity * item.selling_price
            ),
        );

        if (invalidItem) {
            setCartError(
                `Check the quantity and discount for ${invalidItem.product_name}.`,
            );

            return;
        }

        setCartError('');
        setPaymentError('');
        setIsPaymentOpen(true);
    };

    const submitSale = async (
        values: CompleteSaleValues,
    ): Promise<void> => {
        if (
            !token
            || cart.length === 0
            || isSubmitting
        ) {
            return;
        }

        setIsSubmitting(true);
        setPaymentError('');

        try {
            const response = await completePosSale(
                token,
                cart,
                {
                    ...values,
                    discount: saleDiscountValue,
                },
            );

            setReceipt(response.data);

            clearCart();
            setIsPaymentOpen(false);

            await Promise.all([
                loadProducts(),
                loadCategories(),
            ]);

            refocusSearch();
        } catch (error) {
            setPaymentError(
                getErrorMessage(
                    error,
                    'Unable to complete the sale.',
                ),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div id="agro-pos">
            <style>{styles}</style>

            <section className="pos-products">
                <header className="pos-header">
                    <div>
                        <span className="eyebrow">
                            Point of Sale
                        </span>

                        <h1 className="page-title">
                            New Sale
                        </h1>

                        <p className="subtitle">
                            Search or scan a product, then choose
                            an available stock batch.
                        </p>
                    </div>

                    <div className="customer-note">
                        <span>
                            Customer
                        </span>

                        <strong>
                            Selected at Checkout
                        </strong>

                        <small>
                            Walk-in or registered customer
                        </small>
                    </div>
                </header>

                {pageError && (
                    <div
                        className="alert"
                        role="alert"
                    >
                        <Icon name="alert" />

                        <span>
                            {pageError}
                        </span>

                        <button
                            type="button"
                            className="retry"
                            onClick={() => {
                                void Promise.all([
                                    loadProducts(),
                                    loadCategories(),
                                ]);
                            }}
                        >
                            <Icon name="refresh" />

                            Retry
                        </button>
                    </div>
                )}

                <div className="filters">
                    <label className="field">
                        <span className="field-label">
                            Product Search or Barcode
                        </span>

                        <span className="control-wrap">
                            <Icon
                                name="search"
                                className="control-icon"
                            />

                            <input
                                ref={searchInputRef}
                                type="search"
                                className="search-input"
                                value={searchInput}
                                autoFocus
                                autoComplete="off"
                                spellCheck={false}
                                placeholder="Search product, SKU or scan barcode"
                                onChange={(event) => {
                                    setSearchInput(
                                        event.target.value,
                                    );
                                }}
                            />

                            {searchInput && (
                                <button
                                    type="button"
                                    className="clear-search"
                                    aria-label="Clear product search"
                                    onClick={clearSearch}
                                >
                                    <Icon name="close" />
                                </button>
                            )}
                        </span>
                    </label>

                    <label className="field">
                        <span className="field-label">
                            Category
                        </span>

                        <span className="control-wrap">
                            <Icon
                                name="filter"
                                className="control-icon"
                            />

                            <select
                                className="category-select"
                                value={categoryFilter}
                                onChange={(event) => {
                                    setPage(1);

                                    setCategoryFilter(
                                        event.target.value,
                                    );
                                }}
                            >
                                <option value="">
                                    All Categories
                                </option>

                                {categories.map((category) => (
                                    <option
                                        key={category.id}
                                        value={category.id}
                                    >
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </span>
                    </label>
                </div>

                <div
                    className="product-grid"
                    aria-live="polite"
                >
                    {isLoading ? (
                        <div className="state">
                            <div className="spinner" />

                            <strong>
                                Loading products
                            </strong>

                            <span>
                                Checking the latest available stock
                                and selling prices.
                            </span>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="state">
                            <span className="state-icon">
                                <Icon name="box" />
                            </span>

                            <strong>
                                No available products
                            </strong>

                            <span>
                                Try another search or category, or
                                receive stock before creating the sale.
                            </span>
                        </div>
                    ) : (
                        products.map((product) => (
                            <button
                                type="button"
                                className="product-card"
                                key={product.id}
                                onClick={() => {
                                    setSelectedProduct(product);
                                }}
                            >
                                <div className="product-top">
                                    <div className="product-initial">
                                        {product.name
                                            .trim()
                                            .charAt(0)
                                            .toUpperCase() || 'P'}
                                    </div>

                                    <div className="product-copy">
                                        <span
                                            className="category-badge"
                                            title={product.category.name}
                                        >
                                            {product.category.name}
                                        </span>

                                        <strong
                                            className="product-name"
                                            title={product.name}
                                        >
                                            {product.name}
                                        </strong>

                                        <small className="product-code">
                                            {product.sku
                                                || product.barcode
                                                || 'No product code'}
                                        </small>
                                    </div>
                                </div>

                                <div className="product-meta">
                                    <div className="meta-box price">
                                        <span>
                                            Selling Price
                                        </span>

                                        <strong
                                            title={formatPriceRange(
                                                product,
                                            )}
                                        >
                                            {formatPriceRange(
                                                product,
                                            )}
                                        </strong>
                                    </div>

                                    <div className="meta-box">
                                        <span>
                                            Available
                                        </span>

                                        <strong>
                                            {formatQuantity(
                                                product
                                                    .total_available_quantity,
                                            )}{' '}
                                            {product.unit}
                                        </strong>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {pagination.total > 0 && (
                    <footer className="pagination">
                        <span className="pagination-label">
                            Showing{' '}

                            <strong>
                                {formatQuantity(
                                    pagination.from,
                                )}
                            </strong>

                            {' '}to{' '}

                            <strong>
                                {formatQuantity(
                                    pagination.to,
                                )}
                            </strong>

                            {' '}of{' '}

                            <strong>
                                {formatQuantity(
                                    pagination.total,
                                )}
                            </strong>

                            {' '}products
                        </span>

                        <div className="page-actions">
                            <button
                                type="button"
                                className="page-button"
                                disabled={page <= 1}
                                onClick={() => {
                                    setPage((current) => (
                                        Math.max(
                                            1,
                                            current - 1,
                                        )
                                    ));
                                }}
                            >
                                <Icon name="chevron-left" />

                                Previous
                            </button>

                            <button
                                type="button"
                                className="page-button"
                                disabled={
                                    page
                                    >= pagination.last_page
                                }
                                onClick={() => {
                                    setPage((current) => (
                                        Math.min(
                                            pagination.last_page,
                                            current + 1,
                                        )
                                    ));
                                }}
                            >
                                Next

                                <Icon name="chevron-right" />
                            </button>
                        </div>
                    </footer>
                )}
            </section>

            <aside
                className="pos-cart"
                aria-label="Current sale cart"
            >
                <header className="cart-header">
                    <div>
                        <span className="eyebrow">
                            Current Sale
                        </span>

                        <h2 className="cart-title">
                            Cart
                        </h2>
                    </div>

                    <span className="cart-count">
                        {cart.length}{' '}

                        {cart.length === 1
                            ? 'line'
                            : 'lines'}

                        {' · '}

                        {formatQuantity(cartQuantity)} qty
                    </span>
                </header>

                {cartError && (
                    <div
                        className="alert"
                        role="alert"
                    >
                        <Icon name="alert" />

                        <span>
                            {cartError}
                        </span>
                    </div>
                )}

                <div className="cart-items">
                    {cart.length === 0 ? (
                        <div className="empty-cart">
                            <div className="empty-icon">
                                <Icon name="basket" />
                            </div>

                            <strong>
                                Cart is empty
                            </strong>

                            <span>
                                Select a product and stock batch to
                                start this sale.
                            </span>
                        </div>
                    ) : (
                        cart.map((item) => {
                            const lineTotal =
                                item.quantity
                                * item.selling_price
                                - item.discount;

                            return (
                                <article
                                    className="cart-item"
                                    key={item.stock_batch_id}
                                >
                                    <header className="cart-item-header">
                                        <div className="cart-item-copy">
                                            <strong
                                                className="cart-item-name"
                                                title={item.product_name}
                                            >
                                                {item.product_name}
                                            </strong>

                                            <span className="batch">
                                                Batch:{' '}

                                                {item.batch_number
                                                    || item.batch_code}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            className="remove"
                                            aria-label={`Remove ${item.product_name}`}
                                            onClick={() => {
                                                removeCartItem(
                                                    item.stock_batch_id,
                                                );
                                            }}
                                        >
                                            <Icon name="trash" />
                                        </button>
                                    </header>

                                    <div className="cart-meta">
                                        <div className="meta-box">
                                            <span>
                                                Unit Price
                                            </span>

                                            <strong>
                                                {currencyFormatter.format(
                                                    item.selling_price,
                                                )}
                                            </strong>
                                        </div>

                                        <div className="meta-box">
                                            <span>
                                                Available
                                            </span>

                                            <strong>
                                                {formatQuantity(
                                                    item.available_quantity,
                                                )}{' '}

                                                {item.unit}
                                            </strong>
                                        </div>

                                        <div className="meta-box">
                                            <span>
                                                Expiry
                                            </span>

                                            <strong>
                                                {formatExpiryDate(
                                                    item.expiry_date,
                                                )}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="quantity-row">
                                        <button
                                            type="button"
                                            className="quantity-button"
                                            aria-label={`Decrease ${item.product_name} quantity`}
                                            disabled={
                                                item.quantity <= 0.001
                                            }
                                            onClick={() => {
                                                updateCartQuantity(
                                                    item.stock_batch_id,
                                                    Math.max(
                                                        0.001,
                                                        Number(
                                                            (
                                                                item.quantity
                                                                - 1
                                                            ).toFixed(3),
                                                        ),
                                                    ),
                                                );
                                            }}
                                        >
                                            <Icon name="minus" />
                                        </button>

                                        <input
                                            type="number"
                                            className="number-input"
                                            aria-label={`${item.product_name} quantity`}
                                            min="0.001"
                                            max={
                                                item.available_quantity
                                            }
                                            step="0.001"
                                            value={item.quantity}
                                            onChange={(event) => {
                                                updateCartQuantity(
                                                    item.stock_batch_id,
                                                    Number(
                                                        event.target.value,
                                                    ),
                                                );
                                            }}
                                        />

                                        <button
                                            type="button"
                                            className="quantity-button"
                                            aria-label={`Increase ${item.product_name} quantity`}
                                            disabled={
                                                item.quantity
                                                >= item.available_quantity
                                            }
                                            onClick={() => {
                                                updateCartQuantity(
                                                    item.stock_batch_id,
                                                    Math.min(
                                                        item
                                                            .available_quantity,
                                                        Number(
                                                            (
                                                                item.quantity
                                                                + 1
                                                            ).toFixed(3),
                                                        ),
                                                    ),
                                                );
                                            }}
                                        >
                                            <Icon name="plus" />
                                        </button>

                                        <strong className="line-total">
                                            {currencyFormatter.format(
                                                lineTotal,
                                            )}
                                        </strong>
                                    </div>

                                    <label className="discount-row">
                                        <span>
                                            Item Discount (LKR)
                                        </span>

                                        <input
                                            type="number"
                                            className="number-input"
                                            min="0"
                                            max={
                                                item.quantity
                                                * item.selling_price
                                            }
                                            step="0.01"
                                            value={item.discount}
                                            onChange={(event) => {
                                                updateItemDiscount(
                                                    item.stock_batch_id,
                                                    Number(
                                                        event.target.value,
                                                    ),
                                                );
                                            }}
                                        />
                                    </label>
                                </article>
                            );
                        })
                    )}
                </div>

                <div className="cart-summary">
                    <label className="sale-discount">
                        <span>
                            Sale Discount (LKR)
                        </span>

                        <input
                            type="number"
                            className="number-input"
                            min="0"
                            max={subtotal}
                            step="0.01"
                            value={saleDiscount}
                            onChange={(event) => {
                                setSaleDiscount(
                                    event.target.value,
                                );

                                setCartError('');
                            }}
                        />
                    </label>

                    <div className="summary-row">
                        <span>
                            Items Total
                        </span>

                        <strong>
                            {currencyFormatter.format(
                                subtotal,
                            )}
                        </strong>
                    </div>

                    <div className="summary-row">
                        <span>
                            Sale Discount
                        </span>

                        <strong>
                            -{' '}

                            {currencyFormatter.format(
                                safeSaleDiscount,
                            )}
                        </strong>
                    </div>

                    <div className="grand-total">
                        <span>
                            Amount Due
                        </span>

                        <strong>
                            {currencyFormatter.format(
                                grandTotal,
                            )}
                        </strong>
                    </div>

                    <button
                        type="button"
                        className="payment-button"
                        disabled={
                            cart.length === 0
                            || isSubmitting
                        }
                        onClick={openPayment}
                    >
                        <Icon name="receipt" />

                        {isSubmitting
                            ? 'Processing Sale...'
                            : 'Proceed to Payment'}
                    </button>

                    {cart.length > 0 && (
                        isClearCartConfirming ? (
                            <div className="clear-confirm">
                                <span>
                                    Remove every item from this cart?
                                </span>

                                <button
                                    type="button"
                                    className="cancel-button"
                                    disabled={isSubmitting}
                                    onClick={() => {
                                        setIsClearCartConfirming(
                                            false,
                                        );
                                    }}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="confirm-button"
                                    disabled={isSubmitting}
                                    onClick={clearCart}
                                >
                                    Clear
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="clear-button"
                                disabled={isSubmitting}
                                onClick={() => {
                                    setIsClearCartConfirming(
                                        true,
                                    );
                                }}
                            >
                                <Icon name="trash" />

                                Clear Cart
                            </button>
                        )
                    )}
                </div>
            </aside>

            <BatchSelectionModal
                product={selectedProduct}
                onClose={() => {
                    setSelectedProduct(null);
                    refocusSearch();
                }}
                onAdd={addBatchToCart}
            />

            <PaymentModal
                isOpen={isPaymentOpen}
                grandTotal={grandTotal}
                discount={safeSaleDiscount}
                isSubmitting={isSubmitting}
                errorMessage={paymentError}
                onClose={() => {
                    if (!isSubmitting) {
                        setIsPaymentOpen(false);
                        setPaymentError('');
                    }
                }}
                onSubmit={(values) => {
                    void submitSale(values);
                }}
            />

            <SaleReceiptModal
                receipt={receipt}
                onClose={() => {
                    setReceipt(null);
                    refocusSearch();
                }}
            />
        </div>
    );
}