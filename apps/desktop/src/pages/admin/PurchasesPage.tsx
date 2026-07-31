import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import DeletePurchaseModal
    from '../../components/purchases/DeletePurchaseModal';

import PurchaseFormModal
    from '../../components/purchases/PurchaseFormModal';

import ReceiveStockModal
    from '../../components/purchases/ReceiveStockModal';

import {
    ApiError,
} from '../../lib/api';

import {
    createPurchase,
    deletePurchase,
    getPurchase,
    getPurchaseProducts,
    getPurchases,
    receivePurchase,
    updatePurchase,
} from '../../services/purchaseService';

import {
    getSupplierOptions,
} from '../../services/supplierService';

import type {
    ValidationErrors,
} from '../../types/auth';

import type {
    Purchase,
    PurchaseFormValues,
    PurchaseItemFormValues,
    PurchasePaginationMeta,
    PurchaseProductOption,
    ReceivePurchaseItemValues,
} from '../../types/purchase';

import type {
    SupplierOption,
} from '../../types/supplier';

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
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        },
    );

const initialPagination:
    PurchasePaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null,
};

type IconName =
    | 'alert'
    | 'calendar'
    | 'check'
    | 'chevron-left'
    | 'chevron-right'
    | 'close'
    | 'edit'
    | 'filter'
    | 'package'
    | 'plus'
    | 'receipt'
    | 'refresh'
    | 'search'
    | 'supplier'
    | 'trash'
    | 'truck';

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

        case 'edit':
            return (
                <svg {...props}>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
            );

        case 'filter':
            return (
                <svg {...props}>
                    <path d="M4 5h16M7 12h10M10 19h4" />
                </svg>
            );

        case 'package':
            return (
                <svg {...props}>
                    <path d="m21 8-9 5-9-5 9-5 9 5Z" />
                    <path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" />
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
                    <path d="M9 8h6M9 12h6M9 16h4" />
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

        case 'supplier':
            return (
                <svg {...props}>
                    <path d="M3 21h18M6 21V4h12v17M9 8h.01M12 8h.01M15 8h.01M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
                </svg>
            );

        case 'trash':
            return (
                <svg {...props}>
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
                </svg>
            );

        case 'truck':
        default:
            return (
                <svg {...props}>
                    <path d="M3 6h11v10H3Z" />
                    <path d="M14 10h4l3 3v3h-7ZM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                </svg>
            );
    }
}

function createRowId(): string {
    return `${Date.now()}-${Math.random()}`;
}

function createEmptyItem():
    PurchaseItemFormValues {
    return {
        row_id: createRowId(),
        product_id: '',
        quantity: '1',
        unit_cost: '',
        selling_price: '',
        discount: '0',
        batch_number: '',
        manufactured_date: '',
        expiry_date: '',
        notes: '',
    };
}

function today(): string {
    return new Date()
        .toISOString()
        .slice(0, 10);
}

function createEmptyForm():
    PurchaseFormValues {
    return {
        supplier_id: '',
        supplier_invoice_number: '',
        purchase_date: today(),
        discount: '0',
        additional_cost: '0',
        notes: '',
        receive_now: false,
        items: [
            createEmptyItem(),
        ],
    };
}

function formatDate(
    value: string | null | undefined,
): string {
    if (!value) {
        return 'Not available';
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

function formatQuantity(
    value: number,
): string {
    return quantityFormatter.format(
        Number.isFinite(Number(value))
            ? Number(value)
            : 0,
    );
}

function getStatusLabel(
    status: string,
): string {
    return status === 'received'
        ? 'Received'
        : 'Draft';
}

const purchasesPageStyles = `
#purchases-page,
#purchases-page *,
#purchases-page *::before,
#purchases-page *::after {
    box-sizing: border-box !important;
}

#purchases-page {
    --pur-green-950: #052e16;
    --pur-green-900: #14532d;
    --pur-green-800: #166534;
    --pur-green-700: #15803d;
    --pur-green-100: #dcfce7;
    --pur-green-50: #f0fdf4;
    --pur-blue: #175cd3;
    --pur-blue-50: #eff8ff;
    --pur-amber: #b54708;
    --pur-amber-50: #fffaeb;
    --pur-red: #b42318;
    --pur-red-50: #fef3f2;
    --pur-text: #101828;
    --pur-text-2: #344054;
    --pur-muted: #667085;
    --pur-border: #d0d9d2;
    --pur-border-strong: #aebdb2;
    --pur-page: #f5f8f6;

    position: relative !important;
    display: flex !important;

    width: 100% !important;

    height:
        calc(100vh - 96px) !important;

    height:
        calc(100dvh - 96px) !important;

    min-width: 0 !important;
    min-height: 0 !important;

    max-height:
        calc(100vh - 96px) !important;

    max-height:
        calc(100dvh - 96px) !important;

    flex: 1 1 auto !important;
    flex-direction: column !important;
    gap: 14px !important;

    margin: 0 !important;
    padding: 0 8px 34px 0 !important;

    overflow-x: hidden !important;
    overflow-y: auto !important;

    overscroll-behavior-y:
        contain !important;

    scrollbar-gutter:
        stable !important;

    color: var(--pur-text) !important;

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

    scrollbar-width:
        thin !important;

    scrollbar-color:
        #89a091
        #e8eeea !important;
}

#purchases-page::-webkit-scrollbar {
    width: 10px !important;
}

#purchases-page::-webkit-scrollbar-track {
    background: #e8eeea !important;
    border-radius: 999px !important;
}

#purchases-page::-webkit-scrollbar-thumb {
    background: #89a091 !important;

    border:
        2px solid
        #e8eeea !important;

    border-radius: 999px !important;
}

#purchases-page::-webkit-scrollbar-thumb:hover {
    background:
        var(--pur-green-700) !important;
}

#purchases-page button,
#purchases-page input,
#purchases-page select {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#purchases-page h1,
#purchases-page h2,
#purchases-page h3,
#purchases-page p {
    margin: 0 !important;
}

#purchases-page button:focus-visible,
#purchases-page input:focus,
#purchases-page select:focus {
    outline: none !important;

    border-color:
        var(--pur-green-700) !important;

    box-shadow:
        0 0 0 4px
        rgba(
            21,
            128,
            61,
            0.14
        ) !important;
}

#purchases-page .pur-header {
    display: flex !important;

    min-height: 98px !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 20px !important;

    padding: 17px 19px !important;

    background:
        linear-gradient(
            135deg,
            #ffffff,
            #f3fbf5
        ) !important;

    border:
        1px solid
        var(--pur-border) !important;

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

#purchases-page .pur-header-copy {
    min-width: 0 !important;
}

#purchases-page .pur-kicker {
    display: block !important;

    margin-bottom: 3px !important;

    color:
        var(--pur-green-700) !important;

    font-size: 11px !important;
    font-weight: 750 !important;
    letter-spacing: 0.055em !important;

    text-transform: uppercase !important;
}

#purchases-page .pur-title {
    color: var(--pur-text) !important;

    font-size: 24px !important;
    font-weight: 740 !important;
    line-height: 1.2 !important;
    letter-spacing: -0.02em !important;
}

#purchases-page .pur-subtitle {
    margin-top: 4px !important;

    color: var(--pur-muted) !important;

    font-size: 13px !important;
}

#purchases-page .pur-header-actions {
    display: flex !important;

    flex: 0 0 auto !important;

    align-items: center !important;
    gap: 8px !important;
}

#purchases-page .pur-total-badge {
    display: inline-flex !important;

    min-height: 40px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;

    padding: 7px 10px !important;

    color:
        var(--pur-green-900) !important;

    font-size: 12px !important;
    font-weight: 700 !important;

    white-space: nowrap !important;

    background:
        var(--pur-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 9px !important;
}

#purchases-page .pur-total-badge svg {
    width: 15px !important;
    height: 15px !important;
}

#purchases-page .pur-button {
    display: inline-flex !important;

    min-height: 40px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;

    padding: 7px 11px !important;

    font-size: 13px !important;
    font-weight: 700 !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#purchases-page .pur-button svg {
    width: 16px !important;
    height: 16px !important;
}

#purchases-page .pur-button:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

#purchases-page .pur-primary-button {
    color: #ffffff !important;

    background:
        var(--pur-green-700) !important;

    border:
        1px solid
        var(--pur-green-700) !important;

    box-shadow:
        0 4px 12px
        rgba(
            21,
            128,
            61,
            0.18
        ) !important;
}

#purchases-page
.pur-primary-button:hover:not(:disabled) {
    background:
        var(--pur-green-800) !important;

    border-color:
        var(--pur-green-800) !important;
}

#purchases-page .pur-secondary-button {
    color:
        var(--pur-green-900) !important;

    background: #ffffff !important;

    border:
        1px solid
        #b8dfc3 !important;
}

#purchases-page
.pur-secondary-button:hover:not(:disabled) {
    color: #ffffff !important;

    background:
        var(--pur-green-800) !important;

    border-color:
        var(--pur-green-800) !important;
}

#purchases-page .pur-blue-button {
    color: var(--pur-blue) !important;

    background:
        var(--pur-blue-50) !important;

    border:
        1px solid
        #b9d8f5 !important;
}

#purchases-page
.pur-blue-button:hover:not(:disabled) {
    color: #ffffff !important;

    background: var(--pur-blue) !important;
    border-color: var(--pur-blue) !important;
}

#purchases-page .pur-danger-button {
    color: var(--pur-red) !important;

    background:
        var(--pur-red-50) !important;

    border:
        1px solid
        #f3b5af !important;
}

#purchases-page
.pur-danger-button:hover:not(:disabled) {
    color: #ffffff !important;

    background: var(--pur-red) !important;
    border-color: var(--pur-red) !important;
}

#purchases-page .pur-message {
    display: flex !important;

    min-height: 48px !important;

    align-items: center !important;
    gap: 9px !important;

    padding: 10px 12px !important;

    font-size: 13px !important;
    font-weight: 600 !important;

    border-radius: 10px !important;
}

#purchases-page .pur-message.success {
    color:
        var(--pur-green-900) !important;

    background:
        var(--pur-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;
}

#purchases-page .pur-message.error {
    color: var(--pur-red) !important;

    background:
        var(--pur-red-50) !important;

    border:
        1px solid
        #f3b5af !important;
}

#purchases-page .pur-message > svg {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
}

#purchases-page .pur-message-text {
    min-width: 0 !important;
    flex: 1 !important;
}

#purchases-page .pur-message-close {
    display: grid !important;

    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;

    place-items: center !important;

    padding: 0 !important;

    color: inherit !important;

    background:
        rgba(
            255,
            255,
            255,
            0.72
        ) !important;

    border:
        1px solid
        currentColor !important;

    border-radius: 7px !important;

    cursor: pointer !important;
}

#purchases-page .pur-message-close svg {
    width: 14px !important;
    height: 14px !important;
}

#purchases-page .pur-retry-button {
    min-height: 34px !important;
    padding: 5px 8px !important;
    font-size: 12px !important;
}

#purchases-page .pur-readiness {
    display: flex !important;

    align-items: flex-start !important;
    gap: 8px !important;

    padding: 9px 11px !important;

    color: var(--pur-amber) !important;

    font-size: 12px !important;
    font-weight: 600 !important;

    background:
        var(--pur-amber-50) !important;

    border:
        1px solid
        #f0d48f !important;

    border-radius: 10px !important;
}

#purchases-page .pur-readiness svg {
    width: 17px !important;
    height: 17px !important;
    min-width: 17px !important;
}

#purchases-page .pur-panel {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--pur-border) !important;

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

#purchases-page .pur-toolbar {
    display: grid !important;

    grid-template-columns:
        minmax(230px, 1fr)
        minmax(150px, 210px)
        minmax(130px, 160px)
        86px
        auto !important;

    align-items: end !important;
    gap: 10px !important;

    padding: 13px !important;

    border-bottom:
        1px solid
        var(--pur-border) !important;
}

#purchases-page .pur-field {
    display: grid !important;
    gap: 5px !important;
}

#purchases-page .pur-field-label {
    color: var(--pur-text-2) !important;

    font-size: 11px !important;
    font-weight: 650 !important;
}

#purchases-page .pur-search-wrapper {
    position: relative !important;
}

#purchases-page .pur-search-icon {
    position: absolute !important;

    top: 50% !important;
    left: 12px !important;
    z-index: 2 !important;

    display: grid !important;

    width: 18px !important;
    height: 18px !important;

    place-items: center !important;

    color: var(--pur-muted) !important;

    transform:
        translateY(-50%) !important;

    pointer-events: none !important;
}

#purchases-page .pur-search-icon svg {
    display: block !important;

    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
    max-width: 18px !important;
    min-height: 18px !important;
    max-height: 18px !important;
}

#purchases-page .pur-input,
#purchases-page .pur-select {
    display: block !important;

    width: 100% !important;

    height: 42px !important;
    min-height: 42px !important;

    color: var(--pur-text) !important;

    font-size: 14px !important;
    font-weight: 500 !important;

    outline: none !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--pur-border-strong) !important;

    border-radius: 9px !important;
}

#purchases-page .pur-input {
    padding:
        0 42px 0 40px !important;

    background: #f8faf9 !important;
}

#purchases-page .pur-input::placeholder {
    color: #7a8696 !important;
    opacity: 1 !important;
}

#purchases-page .pur-select {
    padding: 0 9px !important;
    cursor: pointer !important;
}

#purchases-page .pur-clear-search {
    position: absolute !important;

    top: 50% !important;
    right: 5px !important;
    z-index: 3 !important;

    display: grid !important;

    width: 32px !important;
    height: 32px !important;

    place-items: center !important;

    padding: 0 !important;

    color: var(--pur-muted) !important;

    background: transparent !important;

    border: 0 !important;
    border-radius: 7px !important;

    transform:
        translateY(-50%) !important;

    cursor: pointer !important;
}

#purchases-page .pur-clear-search:hover {
    color: var(--pur-text) !important;
    background: #eaf0ec !important;
}

#purchases-page .pur-clear-search svg {
    width: 16px !important;
    height: 16px !important;
}

#purchases-page .pur-clear-filters {
    min-height: 42px !important;
    white-space: nowrap !important;
}

#purchases-page .pur-list {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;
    gap: 8px !important;

    padding: 10px !important;

    background: var(--pur-page) !important;
}

#purchases-page .pur-list-head,
#purchases-page .pur-row {
    display: grid !important;

    grid-template-columns:
        minmax(180px, 1.15fr)
        minmax(150px, 1fr)
        112px
        minmax(120px, 0.75fr)
        minmax(135px, 0.8fr)
        100px
        minmax(230px, auto) !important;

    gap: 11px !important;
    align-items: center !important;
}

#purchases-page .pur-list-head {
    padding: 0 12px 2px !important;

    color: var(--pur-muted) !important;

    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.04em !important;

    text-transform: uppercase !important;
}

#purchases-page .pur-row {
    min-width: 0 !important;

    padding: 11px 12px !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--pur-border) !important;

    border-radius: 10px !important;

    box-shadow:
        0 1px 2px
        rgba(
            16,
            24,
            40,
            0.035
        ) !important;
}

#purchases-page .pur-row:hover {
    border-color: #9dceaa !important;

    box-shadow:
        0 4px 12px
        rgba(
            21,
            128,
            61,
            0.07
        ) !important;
}

#purchases-page .pur-identity {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;
    gap: 9px !important;
}

#purchases-page .pur-record-icon {
    display: grid !important;

    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;

    place-items: center !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            145deg,
            var(--pur-green-900),
            var(--pur-green-700)
        ) !important;

    border-radius: 10px !important;
}

#purchases-page .pur-record-icon svg {
    width: 18px !important;
    height: 18px !important;
}

#purchases-page .pur-copy {
    min-width: 0 !important;
}

#purchases-page .pur-number {
    display: block !important;

    overflow: hidden !important;

    color: var(--pur-text) !important;

    font-size: 14px !important;
    font-weight: 700 !important;
    line-height: 1.3 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#purchases-page .pur-invoice {
    display: block !important;

    margin-top: 2px !important;

    overflow: hidden !important;

    color: var(--pur-muted) !important;

    font-size: 10px !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#purchases-page .pur-cell {
    min-width: 0 !important;
}

#purchases-page .pur-mobile-label {
    display: none !important;
}

#purchases-page .pur-value {
    display: block !important;

    overflow: hidden !important;

    color: var(--pur-text-2) !important;

    font-size: 12px !important;
    font-weight: 550 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#purchases-page .pur-value.strong {
    color: var(--pur-text) !important;
    font-size: 13px !important;
    font-weight: 700 !important;
}

#purchases-page .pur-meta {
    display: flex !important;

    align-items: center !important;
    gap: 4px !important;

    color: var(--pur-muted) !important;

    font-size: 10px !important;
}

#purchases-page .pur-meta svg {
    width: 12px !important;
    height: 12px !important;
}

#purchases-page .pur-status {
    display: inline-flex !important;

    min-height: 28px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;

    padding: 4px 8px !important;

    font-size: 10px !important;
    font-weight: 700 !important;

    white-space: nowrap !important;

    border-radius: 999px !important;
}

#purchases-page .pur-status.draft {
    color: var(--pur-amber) !important;

    background:
        var(--pur-amber-50) !important;

    border:
        1px solid
        #f0d48f !important;
}

#purchases-page .pur-status.received {
    color:
        var(--pur-green-900) !important;

    background:
        var(--pur-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;
}

#purchases-page .pur-status svg {
    width: 13px !important;
    height: 13px !important;
}

#purchases-page .pur-actions {
    display: flex !important;

    align-items: center !important;
    justify-content: flex-end !important;
    gap: 6px !important;
}

#purchases-page .pur-action-button {
    min-height: 34px !important;
    padding: 5px 8px !important;
    font-size: 11px !important;
}

#purchases-page .pur-completed {
    display: inline-flex !important;

    min-height: 34px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;

    padding: 5px 8px !important;

    color:
        var(--pur-green-900) !important;

    font-size: 11px !important;
    font-weight: 650 !important;

    background:
        var(--pur-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 8px !important;
}

#purchases-page .pur-completed svg {
    width: 14px !important;
    height: 14px !important;
}

#purchases-page .pur-state {
    display: flex !important;

    min-height: 280px !important;

    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 8px !important;

    padding: 28px !important;

    color: var(--pur-muted) !important;

    text-align: center !important;

    background: #ffffff !important;
}

#purchases-page .pur-state-icon {
    display: grid !important;

    width: 48px !important;
    height: 48px !important;

    place-items: center !important;

    color:
        var(--pur-green-700) !important;

    background:
        var(--pur-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 11px !important;
}

#purchases-page .pur-state-icon svg {
    width: 23px !important;
    height: 23px !important;
}

#purchases-page .pur-state-title {
    color: var(--pur-text) !important;

    font-size: 16px !important;
    font-weight: 700 !important;
}

#purchases-page .pur-state-message {
    max-width: 440px !important;
    font-size: 12px !important;
}

#purchases-page .pur-state-action {
    margin-top: 4px !important;
}

#purchases-page .pur-spinner {
    width: 36px !important;
    height: 36px !important;

    border:
        4px solid
        var(--pur-green-100) !important;

    border-top-color:
        var(--pur-green-700) !important;

    border-radius: 50% !important;

    animation:
        pur-spin
        700ms
        linear
        infinite !important;
}

@keyframes pur-spin {
    to {
        transform: rotate(360deg);
    }
}

#purchases-page .pur-pagination {
    display: flex !important;

    min-height: 62px !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 10px 14px !important;

    border-top:
        1px solid
        var(--pur-border) !important;
}

#purchases-page .pur-pagination-info {
    color: var(--pur-muted) !important;
    font-size: 12px !important;
}

#purchases-page .pur-pagination-info strong {
    color: var(--pur-text-2) !important;
    font-weight: 700 !important;
}

#purchases-page .pur-pagination-actions {
    display: flex !important;

    align-items: center !important;
    gap: 7px !important;
}

#purchases-page .pur-page-number {
    display: inline-flex !important;

    min-height: 36px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 6px 9px !important;

    color: var(--pur-text-2) !important;

    font-size: 11px !important;
    font-weight: 600 !important;

    white-space: nowrap !important;

    background: #f8faf9 !important;

    border:
        1px solid
        #e4e9e5 !important;

    border-radius: 8px !important;
}

#purchases-page .pur-page-button {
    min-height: 36px !important;
    padding: 6px 9px !important;
    font-size: 12px !important;
}

@media (max-width: 1180px) {
    #purchases-page .pur-list-head {
        display: none !important;
    }

    #purchases-page .pur-row {
        grid-template-columns:
            repeat(
                3,
                minmax(0, 1fr)
            ) !important;

        align-items: start !important;
    }

    #purchases-page .pur-identity,
    #purchases-page .pur-actions {
        grid-column: 1 / -1 !important;
    }

    #purchases-page .pur-mobile-label {
        display: block !important;

        margin-bottom: 2px !important;

        color: var(--pur-muted) !important;

        font-size: 9px !important;
        font-weight: 700 !important;
        letter-spacing: 0.04em !important;

        text-transform: uppercase !important;
    }

    #purchases-page .pur-actions {
        justify-content: flex-start !important;
    }
}

@media (max-width: 980px) {
    #purchases-page .pur-toolbar {
        grid-template-columns:
            minmax(0, 1fr)
            minmax(150px, 210px)
            minmax(130px, 160px) !important;
    }

    #purchases-page .pur-toolbar .pur-field:nth-child(4),
    #purchases-page .pur-clear-filters {
        grid-row: 2 !important;
    }

    #purchases-page .pur-toolbar .pur-field:nth-child(4) {
        grid-column: 1 / 2 !important;
        max-width: 120px !important;
    }

    #purchases-page .pur-clear-filters {
        grid-column: 2 / -1 !important;
        justify-self: end !important;
    }
}

@media (max-width: 700px) {
    #purchases-page {
        height:
            calc(100vh - 72px) !important;

        height:
            calc(100dvh - 72px) !important;

        max-height:
            calc(100vh - 72px) !important;

        max-height:
            calc(100dvh - 72px) !important;

        padding: 0 4px 28px 0 !important;
    }

    #purchases-page .pur-header {
        min-height: 0 !important;

        align-items: stretch !important;
        flex-direction: column !important;

        padding: 15px !important;
    }

    #purchases-page .pur-title {
        font-size: 21px !important;
    }

    #purchases-page .pur-header-actions {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #purchases-page .pur-total-badge,
    #purchases-page
    .pur-header-actions
    .pur-button {
        width: 100% !important;
    }

    #purchases-page .pur-toolbar {
        grid-template-columns: 1fr !important;
    }

    #purchases-page .pur-toolbar .pur-field:nth-child(4),
    #purchases-page .pur-clear-filters {
        grid-row: auto !important;
        grid-column: auto !important;
        max-width: none !important;
    }

    #purchases-page .pur-clear-filters {
        width: 100% !important;
        justify-self: stretch !important;
    }

    #purchases-page .pur-row {
        grid-template-columns: 1fr !important;
    }

    #purchases-page .pur-actions {
        display: grid !important;

        grid-template-columns:
            repeat(
                3,
                minmax(0, 1fr)
            ) !important;
    }

    #purchases-page .pur-action-button,
    #purchases-page .pur-completed {
        width: 100% !important;
    }

    #purchases-page .pur-completed {
        grid-column: 1 / -1 !important;
    }

    #purchases-page .pur-message {
        align-items: flex-start !important;
        flex-wrap: wrap !important;
    }

    #purchases-page .pur-retry-button {
        width: 100% !important;
    }

    #purchases-page .pur-pagination {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #purchases-page .pur-pagination-actions {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #purchases-page .pur-page-number {
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;
    }

    #purchases-page .pur-page-button {
        width: 100% !important;
    }
}

@media (max-width: 480px) {
    #purchases-page .pur-header-actions,
    #purchases-page .pur-actions {
        grid-template-columns: 1fr !important;
    }

    #purchases-page .pur-number {
        white-space: normal !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #purchases-page *,
    #purchases-page *::before,
    #purchases-page *::after {
        transition: none !important;
        scroll-behavior: auto !important;
    }

    #purchases-page .pur-spinner {
        animation-duration: 1.2s !important;
    }
}
`;

export default function PurchasesPage() {
    const {
        token,
    } = useAuth();

    const searchInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const purchaseRequestIdRef =
        useRef(0);

    const [
        purchases,
        setPurchases,
    ] = useState<Purchase[]>([]);

    const [
        suppliers,
        setSuppliers,
    ] = useState<SupplierOption[]>([]);

    const [
        products,
        setProducts,
    ] = useState<
        PurchaseProductOption[]
    >([]);

    const [
        pagination,
        setPagination,
    ] = useState(initialPagination);

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        perPage,
        setPerPage,
    ] = useState(10);

    const [
        searchInput,
        setSearchInput,
    ] = useState('');

    const [
        appliedSearch,
        setAppliedSearch,
    ] = useState('');

    const [
        supplierFilter,
        setSupplierFilter,
    ] = useState('');

    const [
        statusFilter,
        setStatusFilter,
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
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const [
        isFormOpen,
        setIsFormOpen,
    ] = useState(false);

    const [
        editingPurchase,
        setEditingPurchase,
    ] = useState<Purchase | null>(
        null,
    );

    const [
        formValues,
        setFormValues,
    ] = useState<PurchaseFormValues>(
        createEmptyForm,
    );

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        formError,
        setFormError,
    ] = useState('');

    const [
        fieldErrors,
        setFieldErrors,
    ] = useState<ValidationErrors>({});

    const [
        receivingPurchase,
        setReceivingPurchase,
    ] = useState<Purchase | null>(
        null,
    );

    const [
        receiveValues,
        setReceiveValues,
    ] = useState<
        ReceivePurchaseItemValues[]
    >([]);

    const [
        receiveError,
        setReceiveError,
    ] = useState('');

    const [
        deleteTarget,
        setDeleteTarget,
    ] = useState<Purchase | null>(
        null,
    );

    const [
        isDeleting,
        setIsDeleting,
    ] = useState(false);

    const [
        deleteError,
        setDeleteError,
    ] = useState('');

    const loadOptions =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                try {
                    const [
                        supplierResponse,
                        productResponse,
                    ] = await Promise.all([
                        getSupplierOptions(token),
                        getPurchaseProducts(token),
                    ]);

                    setSuppliers(
                        supplierResponse.data,
                    );

                    setProducts(
                        productResponse.data,
                    );
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load purchase options.',
                    );
                }
            },
            [token],
        );

    const loadPurchases =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    setIsLoading(false);
                    return;
                }

                const requestId =
                    purchaseRequestIdRef.current + 1;

                purchaseRequestIdRef.current =
                    requestId;

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getPurchases(
                            token,
                            {
                                page,
                                perPage,
                                search:
                                    appliedSearch,

                                supplierId:
                                    supplierFilter,

                                status:
                                    statusFilter,
                            },
                        );

                    if (
                        purchaseRequestIdRef.current
                        !== requestId
                    ) {
                        return;
                    }

                    setPurchases(
                        response.data,
                    );

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    if (
                        purchaseRequestIdRef.current
                        !== requestId
                    ) {
                        return;
                    }

                    setPurchases([]);

                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load purchases.',
                    );
                } finally {
                    if (
                        purchaseRequestIdRef.current
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
                supplierFilter,
                statusFilter,
            ],
        );

    useEffect(() => {
        void loadOptions();
    }, [loadOptions]);

    useEffect(() => {
        void loadPurchases();
    }, [loadPurchases]);

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    setPage(1);

                    setAppliedSearch(
                        searchInput.trim(),
                    );
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

    const openCreateForm = (): void => {
        setEditingPurchase(null);
        setFormValues(createEmptyForm());
        setFormError('');
        setFieldErrors({});
        setIsFormOpen(true);
    };

    const closePurchaseForm = (): void => {
        if (isSubmitting) {
            return;
        }

        setIsFormOpen(false);
        setEditingPurchase(null);
        setFormError('');
        setFieldErrors({});
    };

    const openEditForm =
        async (
            purchase: Purchase,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setPageError('');

            try {
                const response =
                    await getPurchase(
                        token,
                        purchase.id,
                    );

                const details = response.data;

                setEditingPurchase(details);

                setFormValues({
                    supplier_id:
                        String(
                            details.supplier.id,
                        ),

                    supplier_invoice_number:
                        details
                            .supplier_invoice_number
                        ?? '',

                    purchase_date:
                        details.purchase_date,

                    discount:
                        String(details.discount),

                    additional_cost:
                        String(
                            details.additional_cost,
                        ),

                    notes:
                        details.notes ?? '',

                    receive_now: false,

                    items:
                        details.items?.map(
                            (item) => ({
                                row_id:
                                    createRowId(),

                                product_id:
                                    String(
                                        item.product_id,
                                    ),

                                quantity:
                                    String(
                                        item.quantity,
                                    ),

                                unit_cost:
                                    String(
                                        item.unit_cost,
                                    ),

                                selling_price:
                                    String(
                                        item.selling_price,
                                    ),

                                discount:
                                    String(
                                        item.discount,
                                    ),

                                batch_number:
                                    item.batch_number
                                    ?? '',

                                manufactured_date:
                                    item
                                        .manufactured_date
                                    ?? '',

                                expiry_date:
                                    item.expiry_date
                                    ?? '',

                                notes:
                                    item.notes ?? '',
                            }),
                        ) ?? [
                            createEmptyItem(),
                        ],
                });

                setFormError('');
                setFieldErrors({});
                setIsFormOpen(true);
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to load the purchase details.',
                );
            }
        };

    const handleHeaderChange = (
        field: keyof Omit<
            PurchaseFormValues,
            'items'
        >,
        value: string | boolean,
    ): void => {
        setFormValues(
            (current) => ({
                ...current,
                [field]: value,
            }),
        );

        setFieldErrors(
            (current) => ({
                ...current,
                [field]: undefined,
            }),
        );

        setFormError('');
    };

    const handleItemChange = (
        index: number,
        field:
            keyof PurchaseItemFormValues,
        value: string,
    ): void => {
        setFormValues(
            (current) => ({
                ...current,

                items: current.items.map(
                    (item, itemIndex) =>
                        itemIndex === index
                            ? {
                                ...item,
                                [field]: value,
                            }
                            : item,
                ),
            }),
        );

        setFieldErrors(
            (current) => ({
                ...current,
                [`items.${index}.${field}`]:
                    undefined,
            }),
        );

        setFormError('');
    };

    const validatePurchase =
        (): boolean => {
            const errors:
                ValidationErrors = {};

            if (!formValues.supplier_id) {
                errors.supplier_id = [
                    'Please select a supplier.',
                ];
            }

            if (!formValues.purchase_date) {
                errors.purchase_date = [
                    'Please select a purchase date.',
                ];
            }

            formValues.items.forEach(
                (item, index) => {
                    if (!item.product_id) {
                        errors[
                            `items.${index}.product_id`
                        ] = [
                                `Select a product for item ${index + 1}.`,
                            ];
                    }

                    if (
                        Number(item.quantity) <= 0
                    ) {
                        errors[
                            `items.${index}.quantity`
                        ] = [
                                'Quantity must be greater than zero.',
                            ];
                    }

                    if (
                        item.unit_cost === ''
                        || Number(
                            item.unit_cost,
                        ) < 0
                    ) {
                        errors[
                            `items.${index}.unit_cost`
                        ] = [
                                'Enter a valid purchase cost.',
                            ];
                    }

                    if (
                        item.selling_price === ''
                        || Number(
                            item.selling_price,
                        ) < 0
                    ) {
                        errors[
                            `items.${index}.selling_price`
                        ] = [
                                'Enter a valid selling price.',
                            ];
                    }

                    if (
                        item.manufactured_date
                        && item.expiry_date
                        && item.manufactured_date
                        > item.expiry_date
                    ) {
                        errors[
                            `items.${index}.expiry_date`
                        ] = [
                                'Expiry must be after manufacture.',
                            ];
                    }
                },
            );

            setFieldErrors(errors);

            if (
                Object.keys(errors).length
                > 0
            ) {
                setFormError(
                    'Please correct the highlighted purchase details.',
                );

                return false;
            }

            return true;
        };

    const submitPurchase =
        async (
            event:
                FormEvent<HTMLFormElement>,
        ): Promise<void> => {
            event.preventDefault();

            if (
                !token
                || isSubmitting
                || !validatePurchase()
            ) {
                return;
            }

            setIsSubmitting(true);
            setFormError('');

            try {
                const response =
                    editingPurchase
                        ? await updatePurchase(
                            token,
                            editingPurchase.id,
                            formValues,
                        )
                        : await createPurchase(
                            token,
                            formValues,
                        );

                setSuccessMessage(
                    response.message
                    ?? 'Purchase saved successfully.',
                );

                setIsFormOpen(false);
                setEditingPurchase(null);

                await loadPurchases();
            } catch (error) {
                if (
                    error instanceof ApiError
                ) {
                    setFormError(
                        error.message,
                    );

                    setFieldErrors(
                        error.errors ?? {},
                    );
                } else {
                    setFormError(
                        'Unable to save the purchase.',
                    );
                }
            } finally {
                setIsSubmitting(false);
            }
        };

    const openReceiveModal =
        async (
            purchase: Purchase,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setPageError('');

            try {
                const response =
                    await getPurchase(
                        token,
                        purchase.id,
                    );

                const details = response.data;

                setReceivingPurchase(details);

                setReceiveValues(
                    details.items?.map(
                        (item) => ({
                            purchase_item_id:
                                item.id,

                            received_quantity:
                                String(
                                    item.quantity
                                    - item
                                        .received_quantity,
                                ),

                            selling_price:
                                String(
                                    item.selling_price,
                                ),

                            batch_number:
                                item.batch_number
                                ?? '',

                            manufactured_date:
                                item
                                    .manufactured_date
                                ?? '',

                            expiry_date:
                                item.expiry_date
                                ?? '',
                        }),
                    ) ?? [],
                );

                setReceiveError('');
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to load stock intake.',
                );
            }
        };

    const submitStockIntake =
        async (
            event:
                FormEvent<HTMLFormElement>,
        ): Promise<void> => {
            event.preventDefault();

            if (
                !token
                || !receivingPurchase
                || isSubmitting
            ) {
                return;
            }

            setIsSubmitting(true);
            setReceiveError('');

            try {
                const response =
                    await receivePurchase(
                        token,
                        receivingPurchase.id,
                        receiveValues,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Stock received successfully.',
                );

                setReceivingPurchase(null);

                await loadPurchases();
            } catch (error) {
                setReceiveError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to receive stock.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const confirmDelete =
        async (): Promise<void> => {
            if (
                !token
                || !deleteTarget
                || isDeleting
            ) {
                return;
            }

            setIsDeleting(true);
            setDeleteError('');

            try {
                const response =
                    await deletePurchase(
                        token,
                        deleteTarget.id,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Purchase deleted successfully.',
                );

                setDeleteTarget(null);

                if (
                    purchases.length === 1
                    && page > 1
                ) {
                    setPage(
                        (
                            currentPage,
                        ) =>
                            Math.max(
                                1,
                                currentPage - 1,
                            ),
                    );
                } else {
                    await loadPurchases();
                }
            } catch (error) {
                setDeleteError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to delete purchase.',
                );
            } finally {
                setIsDeleting(false);
            }
        };

    const clearSearch = (): void => {
        setSearchInput('');
        setAppliedSearch('');
        setPage(1);

        searchInputRef.current
            ?.focus();
    };

    const clearFilters = (): void => {
        setSearchInput('');
        setAppliedSearch('');
        setSupplierFilter('');
        setStatusFilter('');
        setPage(1);

        searchInputRef.current
            ?.focus();
    };

    const hasActiveFilters =
        Boolean(
            searchInput
            || supplierFilter
            || statusFilter,
        );

    const canCreatePurchase =
        suppliers.length > 0
        && products.length > 0;

    return (
        <div id="purchases-page">
            <style>
                {purchasesPageStyles}
            </style>

            <header className="pur-header">
                <div className="pur-header-copy">
                    <span className="pur-kicker">
                        Purchasing and Stock Intake
                    </span>

                    <h1 className="pur-title">
                        Purchase Management
                    </h1>

                    <p className="pur-subtitle">
                        Record supplier purchases,
                        manage drafts and receive items
                        into available stock.
                    </p>
                </div>

                <div className="pur-header-actions">
                    <span className="pur-total-badge">
                        <Icon name="receipt" />

                        {pagination.total}
                        {' '}

                        {pagination.total === 1
                            ? 'Purchase'
                            : 'Purchases'}
                    </span>

                    <button
                        type="button"
                        className="pur-button pur-primary-button"
                        disabled={!canCreatePurchase}
                        title={
                            canCreatePurchase
                                ? 'Create a new supplier purchase'
                                : 'Add at least one supplier and product first'
                        }
                        onClick={openCreateForm}
                    >
                        <Icon name="plus" />

                        Add Purchase
                    </button>
                </div>
            </header>

            {!canCreatePurchase
                && !isLoading && (
                    <div className="pur-readiness">
                        <Icon name="alert" />

                        <span>
                            A purchase needs at least one
                            supplier and one product. Add
                            the missing records before
                            creating a purchase.
                        </span>
                    </div>
                )}

            {successMessage && (
                <div
                    className="pur-message success"
                    role="status"
                    aria-live="polite"
                >
                    <Icon name="check" />

                    <span className="pur-message-text">
                        {successMessage}
                    </span>

                    <button
                        type="button"
                        className="pur-message-close"
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
                    className="pur-message error"
                    role="alert"
                >
                    <Icon name="alert" />

                    <span className="pur-message-text">
                        {pageError}
                    </span>

                    <button
                        type="button"
                        className="pur-button pur-secondary-button pur-retry-button"
                        onClick={() => {
                            void loadOptions();
                            void loadPurchases();
                        }}
                    >
                        <Icon name="refresh" />

                        Retry
                    </button>
                </div>
            )}

            <section className="pur-panel">
                <div className="pur-toolbar">
                    <label className="pur-field">
                        <span className="pur-field-label">
                            Search Purchases
                        </span>

                        <span className="pur-search-wrapper">
                            <span
                                className="pur-search-icon"
                                aria-hidden="true"
                            >
                                <Icon name="search" />
                            </span>

                            <input
                                ref={searchInputRef}
                                type="search"
                                className="pur-input"
                                value={searchInput}
                                autoComplete="off"
                                placeholder="Purchase number, invoice or supplier"
                                aria-label="Search purchases"
                                onChange={(event) => {
                                    setSearchInput(
                                        event.target.value,
                                    );
                                }}
                            />

                            {searchInput && (
                                <button
                                    type="button"
                                    className="pur-clear-search"
                                    aria-label="Clear purchase search"
                                    onClick={clearSearch}
                                >
                                    <Icon name="close" />
                                </button>
                            )}
                        </span>
                    </label>

                    <label className="pur-field">
                        <span className="pur-field-label">
                            Supplier
                        </span>

                        <select
                            className="pur-select"
                            value={supplierFilter}
                            onChange={(event) => {
                                setPage(1);

                                setSupplierFilter(
                                    event.target.value,
                                );
                            }}
                        >
                            <option value="">
                                All Suppliers
                            </option>

                            {suppliers.map(
                                (supplier) => (
                                    <option
                                        key={supplier.id}
                                        value={supplier.id}
                                    >
                                        {supplier.name}
                                    </option>
                                ),
                            )}
                        </select>
                    </label>

                    <label className="pur-field">
                        <span className="pur-field-label">
                            Purchase Status
                        </span>

                        <select
                            className="pur-select"
                            value={statusFilter}
                            onChange={(event) => {
                                setPage(1);

                                setStatusFilter(
                                    event.target.value,
                                );
                            }}
                        >
                            <option value="">
                                All Statuses
                            </option>

                            <option value="draft">
                                Draft
                            </option>

                            <option value="received">
                                Received
                            </option>
                        </select>
                    </label>

                    <label className="pur-field">
                        <span className="pur-field-label">
                            Rows
                        </span>

                        <select
                            className="pur-select"
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

                    <button
                        type="button"
                        className="pur-button pur-secondary-button pur-clear-filters"
                        disabled={!hasActiveFilters}
                        onClick={clearFilters}
                    >
                        <Icon name="filter" />

                        Clear Filters
                    </button>
                </div>

                {isLoading ? (
                    <div
                        className="pur-state"
                        aria-live="polite"
                    >
                        <div className="pur-spinner" />

                        <strong className="pur-state-title">
                            Loading Purchases
                        </strong>

                        <span className="pur-state-message">
                            Retrieving supplier purchase
                            records and stock intake status.
                        </span>
                    </div>
                ) : purchases.length === 0 ? (
                    <div className="pur-state">
                        <span className="pur-state-icon">
                            <Icon name="receipt" />
                        </span>

                        <strong className="pur-state-title">
                            {hasActiveFilters
                                ? 'No Matching Purchases'
                                : 'No Purchases Recorded'}
                        </strong>

                        <span className="pur-state-message">
                            {hasActiveFilters
                                ? 'Check the search or filters, then try again.'
                                : 'Create the first supplier purchase to begin recording incoming stock.'}
                        </span>

                        {!hasActiveFilters
                            && canCreatePurchase && (
                                <button
                                    type="button"
                                    className="pur-button pur-primary-button pur-state-action"
                                    onClick={openCreateForm}
                                >
                                    <Icon name="plus" />

                                    Add First Purchase
                                </button>
                            )}
                    </div>
                ) : (
                    <div className="pur-list">
                        <div
                            className="pur-list-head"
                            aria-hidden="true"
                        >
                            <span>
                                Purchase
                            </span>

                            <span>
                                Supplier
                            </span>

                            <span>
                                Date
                            </span>

                            <span>
                                Items
                            </span>

                            <span>
                                Total
                            </span>

                            <span>
                                Status
                            </span>

                            <span>
                                Actions
                            </span>
                        </div>

                        {purchases.map(
                            (purchase) => (
                                <article
                                    key={purchase.id}
                                    className="pur-row"
                                >
                                    <div className="pur-identity">
                                        <span className="pur-record-icon">
                                            <Icon name="receipt" />
                                        </span>

                                        <span className="pur-copy">
                                            <strong
                                                className="pur-number"
                                                title={
                                                    purchase
                                                        .purchase_number
                                                }
                                            >
                                                {
                                                    purchase
                                                        .purchase_number
                                                }
                                            </strong>

                                            <span
                                                className="pur-invoice"
                                                title={
                                                    purchase
                                                        .supplier_invoice_number
                                                    ?? 'No supplier invoice'
                                                }
                                            >
                                                Invoice:
                                                {' '}

                                                {purchase
                                                    .supplier_invoice_number
                                                    ?? 'Not provided'}
                                            </span>
                                        </span>
                                    </div>

                                    <div className="pur-cell">
                                        <span className="pur-mobile-label">
                                            Supplier
                                        </span>

                                        <span
                                            className="pur-value strong"
                                            title={
                                                purchase
                                                    .supplier
                                                    .name
                                            }
                                        >
                                            {
                                                purchase
                                                    .supplier
                                                    .name
                                            }
                                        </span>
                                    </div>

                                    <div className="pur-cell">
                                        <span className="pur-mobile-label">
                                            Purchase Date
                                        </span>

                                        <span className="pur-meta">
                                            <Icon name="calendar" />

                                            {formatDate(
                                                purchase
                                                    .purchase_date,
                                            )}
                                        </span>
                                    </div>

                                    <div className="pur-cell">
                                        <span className="pur-mobile-label">
                                            Items and Quantity
                                        </span>

                                        <span className="pur-value">
                                            {purchase.items_count}
                                            {' '}

                                            {purchase.items_count === 1
                                                ? 'item'
                                                : 'items'}
                                        </span>

                                        <span className="pur-meta">
                                            <Icon name="package" />

                                            {formatQuantity(
                                                purchase
                                                    .total_quantity,
                                            )}
                                            {' '}total units
                                        </span>
                                    </div>

                                    <div className="pur-cell">
                                        <span className="pur-mobile-label">
                                            Grand Total
                                        </span>

                                        <strong className="pur-value strong">
                                            {currencyFormatter.format(
                                                Number(
                                                    purchase
                                                        .grand_total,
                                                ),
                                            )}
                                        </strong>
                                    </div>

                                    <div className="pur-cell">
                                        <span className="pur-mobile-label">
                                            Status
                                        </span>

                                        <span
                                            className={
                                                purchase.status
                                                    === 'received'
                                                    ? 'pur-status received'
                                                    : 'pur-status draft'
                                            }
                                        >
                                            <Icon
                                                name={
                                                    purchase.status
                                                        === 'received'
                                                        ? 'check'
                                                        : 'receipt'
                                                }
                                            />

                                            {getStatusLabel(
                                                purchase.status,
                                            )}
                                        </span>
                                    </div>

                                    <div className="pur-actions">
                                        {purchase.status
                                            === 'draft' ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="pur-button pur-secondary-button pur-action-button"
                                                    onClick={() => {
                                                        void openEditForm(
                                                            purchase,
                                                        );
                                                    }}
                                                >
                                                    <Icon name="edit" />

                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    className="pur-button pur-blue-button pur-action-button"
                                                    onClick={() => {
                                                        void openReceiveModal(
                                                            purchase,
                                                        );
                                                    }}
                                                >
                                                    <Icon name="truck" />

                                                    Receive
                                                </button>

                                                <button
                                                    type="button"
                                                    className="pur-button pur-danger-button pur-action-button"
                                                    onClick={() => {
                                                        setDeleteTarget(
                                                            purchase,
                                                        );

                                                        setDeleteError(
                                                            '',
                                                        );
                                                    }}
                                                >
                                                    <Icon name="trash" />

                                                    Delete
                                                </button>
                                            </>
                                        ) : (
                                            <span className="pur-completed">
                                                <Icon name="check" />

                                                Stock Added
                                            </span>
                                        )}
                                    </div>
                                </article>
                            ),
                        )}
                    </div>
                )}

                {!isLoading
                    && pagination.total > 0 && (
                        <footer className="pur-pagination">
                            <p className="pur-pagination-info">
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

                                {' '}purchases
                            </p>

                            <div className="pur-pagination-actions">
                                <button
                                    type="button"
                                    className="pur-button pur-secondary-button pur-page-button"
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

                                <span className="pur-page-number">
                                    Page
                                    {' '}

                                    {pagination.current_page}
                                    {' '}of{' '}
                                    {pagination.last_page}
                                </span>

                                <button
                                    type="button"
                                    className="pur-button pur-secondary-button pur-page-button"
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

            <PurchaseFormModal
                isOpen={isFormOpen}
                isEditing={
                    editingPurchase !== null
                }
                values={formValues}
                suppliers={suppliers}
                products={products}
                isSubmitting={isSubmitting}
                errorMessage={formError}
                fieldErrors={fieldErrors}
                onHeaderChange={
                    handleHeaderChange
                }
                onItemChange={
                    handleItemChange
                }
                onAddItem={() => {
                    setFormValues(
                        (current) => ({
                            ...current,
                            items: [
                                ...current.items,
                                createEmptyItem(),
                            ],
                        }),
                    );
                }}
                onRemoveItem={(index) => {
                    setFormValues(
                        (current) => ({
                            ...current,
                            items:
                                current.items.filter(
                                    (
                                        _,
                                        itemIndex,
                                    ) =>
                                        itemIndex
                                        !== index,
                                ),
                        }),
                    );
                }}
                onClose={
                    closePurchaseForm
                }
                onSubmit={(event) => {
                    void submitPurchase(
                        event,
                    );
                }}
            />

            <ReceiveStockModal
                purchase={receivingPurchase}
                values={receiveValues}
                isSubmitting={isSubmitting}
                errorMessage={receiveError}
                onChange={(
                    index,
                    field,
                    value,
                ) => {
                    setReceiveValues(
                        (current) =>
                            current.map(
                                (
                                    item,
                                    itemIndex,
                                ) =>
                                    itemIndex
                                        === index
                                        ? {
                                            ...item,
                                            [field]:
                                                value,
                                        }
                                        : item,
                            ),
                    );
                }}
                onClose={() => {
                    if (!isSubmitting) {
                        setReceivingPurchase(null);
                        setReceiveError('');
                    }
                }}
                onSubmit={(event) => {
                    void submitStockIntake(
                        event,
                    );
                }}
            />

            <DeletePurchaseModal
                purchase={deleteTarget}
                isDeleting={isDeleting}
                errorMessage={deleteError}
                onCancel={() => {
                    if (!isDeleting) {
                        setDeleteTarget(null);
                        setDeleteError('');
                    }
                }}
                onConfirm={() => {
                    void confirmDelete();
                }}
            />
        </div>
    );
}