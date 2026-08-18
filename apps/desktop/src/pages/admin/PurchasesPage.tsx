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
    createPortal,
} from 'react-dom';

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
        'en-LK',
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
    | 'eye'
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
        strokeLinecap:
            'round' as const,
        strokeLinejoin:
            'round' as const,
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

        case 'eye':
            return (
                <svg {...props}>
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />

                    <circle
                        cx="12"
                        cy="12"
                        r="2.5"
                    />
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
        row_id:
            createRowId(),

        product_id:
            '',

        product_variant_id:
            '',

        quantity:
            '1',

        unit_cost:
            '',

        selling_price:
            '',

        is_dual_unit:
            '0',

        secondary_unit:
            'Kg',

        conversion_factor:
            '',

        secondary_selling_price:
            '',

        discount:
            '0',

        batch_number:
            '',

        manufactured_date:
            '',

        expiry_date:
            '',

        notes:
            '',
    };
}

function today(): string {
    const currentDate =
        new Date();

    const timezoneOffset =
        currentDate.getTimezoneOffset()
        * 60_000;

    return new Date(
        currentDate.getTime()
        - timezoneOffset,
    )
        .toISOString()
        .slice(0, 10);
}

function createEmptyForm():
    PurchaseFormValues {
    return {
        supplier_id:
            '',

        supplier_invoice_number:
            '',

        purchase_date:
            today(),

        discount:
            '0',

        additional_cost:
            '0',

        notes:
            '',

        receive_now:
            false,

        items: [
            createEmptyItem(),
        ],
    };
}

function formatDate(
    value:
        | string
        | null
        | undefined,
): string {
    if (!value) {
        return 'Not available';
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
    ).format(date);
}

function formatDateTime(
    value:
        | string
        | null
        | undefined,
): string {
    if (!value) {
        return 'Not available';
    }

    const date =
        new Date(value);

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

function formatQuantity(
    value: unknown,
): string {
    const numericValue =
        Number(value);

    return quantityFormatter.format(
        Number.isFinite(
            numericValue,
        )
            ? numericValue
            : 0,
    );
}

function moneyValue(
    value: unknown,
): number {
    const numericValue =
        Number(value);

    return Number.isFinite(
        numericValue,
    )
        ? numericValue
        : 0;
}

function getStatusLabel(
    status: string,
): string {
    return status === 'received'
        ? 'Received'
        : 'Draft';
}

function isDualUnitEnabled(
    value: string,
): boolean {
    return [
        '1',
        'true',
        'yes',
        'on',
    ].includes(
        value
            .trim()
            .toLowerCase(),
    );
}

function isBagUnit(
    value:
        | string
        | null
        | undefined,
): boolean {
    const unit =
        String(
            value ?? '',
        )
            .trim()
            .toLowerCase();

    return (
        unit === 'bag'
        || unit === 'bags'
    );
}

function isPositiveNumber(
    value: string,
): boolean {
    if (
        value.trim() === ''
    ) {
        return false;
    }

    const parsed =
        Number(value);

    return (
        Number.isFinite(parsed)
        && parsed > 0
    );
}

function isNonNegativeNumber(
    value: string,
): boolean {
    if (
        value.trim() === ''
    ) {
        return false;
    }

    const parsed =
        Number(value);

    return (
        Number.isFinite(parsed)
        && parsed >= 0
    );
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
    min-width: 0 !important;
    max-width: 100% !important;
    min-height: 0 !important;

    flex: 1 1 auto !important;

    flex-direction:
        column !important;

    gap: 14px !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow-x:
        hidden !important;

    overflow-y:
        visible !important;

    color:
        var(--pur-text) !important;

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

    background:
        transparent !important;

    isolation:
        isolate !important;

    -webkit-font-smoothing:
        antialiased !important;

}

#purchases-page button,
#purchases-page input,
#purchases-page select {
    font: inherit !important;

    text-transform:
        none !important;

    letter-spacing:
        normal !important;
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
    outline:
        none !important;

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

    min-height:
        98px !important;

    align-items:
        center !important;

    justify-content:
        space-between !important;

    gap: 20px !important;

    padding:
        17px 19px !important;

    background:
        linear-gradient(
            135deg,
            #ffffff,
            #f3fbf5
        ) !important;

    border:
        1px solid
        var(--pur-border) !important;

    border-radius:
        14px !important;

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

    margin-bottom:
        3px !important;

    color:
        var(--pur-green-700) !important;

    font-size:
        11px !important;

    font-weight:
        800 !important;

    letter-spacing:
        0.055em !important;

    text-transform:
        uppercase !important;
}

#purchases-page .pur-title {
    color:
        var(--pur-text) !important;

    font-size:
        25px !important;

    font-weight:
        800 !important;

    line-height:
        1.2 !important;

    letter-spacing:
        -0.02em !important;
}

#purchases-page .pur-subtitle {
    margin-top:
        4px !important;

    color:
        var(--pur-muted) !important;

    font-size:
        13px !important;
}

#purchases-page .pur-header-actions {
    display: flex !important;

    flex:
        0 0 auto !important;

    align-items:
        center !important;

    gap: 8px !important;
}

#purchases-page .pur-total-badge {
    display:
        inline-flex !important;

    min-height:
        42px !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    gap: 6px !important;

    padding:
        7px 11px !important;

    color:
        var(--pur-green-900) !important;

    font-size:
        12px !important;

    font-weight:
        800 !important;

    white-space:
        nowrap !important;

    background:
        var(--pur-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius:
        9px !important;
}

#purchases-page .pur-total-badge svg {
    width:
        16px !important;

    height:
        16px !important;
}

#purchases-page .pur-button {
    display:
        inline-flex !important;

    min-height:
        42px !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    gap: 6px !important;

    padding:
        7px 12px !important;

    font-size:
        13px !important;

    font-weight:
        800 !important;

    border-radius:
        9px !important;

    cursor:
        pointer !important;
}

#purchases-page .pur-button svg {
    width:
        16px !important;

    height:
        16px !important;
}

#purchases-page .pur-button:disabled {
    opacity:
        0.55 !important;

    cursor:
        not-allowed !important;
}

#purchases-page .pur-primary-button {
    color:
        #ffffff !important;

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

    background:
        #ffffff !important;

    border:
        1px solid
        #b8dfc3 !important;
}

#purchases-page
.pur-secondary-button:hover:not(:disabled) {
    color:
        #ffffff !important;

    background:
        var(--pur-green-800) !important;

    border-color:
        var(--pur-green-800) !important;
}

#purchases-page .pur-blue-button {
    color:
        var(--pur-blue) !important;

    background:
        var(--pur-blue-50) !important;

    border:
        1px solid
        #b9d8f5 !important;
}

#purchases-page
.pur-blue-button:hover:not(:disabled) {
    color:
        #ffffff !important;

    background:
        var(--pur-blue) !important;

    border-color:
        var(--pur-blue) !important;
}

#purchases-page .pur-danger-button {
    color:
        var(--pur-red) !important;

    background:
        var(--pur-red-50) !important;

    border:
        1px solid
        #f3b5af !important;
}

#purchases-page
.pur-danger-button:hover:not(:disabled) {
    color:
        #ffffff !important;

    background:
        var(--pur-red) !important;

    border-color:
        var(--pur-red) !important;
}

#purchases-page .pur-message {
    display: flex !important;

    min-height:
        48px !important;

    align-items:
        center !important;

    gap:
        9px !important;

    padding:
        10px 12px !important;

    font-size:
        13px !important;

    font-weight:
        650 !important;

    border-radius:
        10px !important;
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
    color:
        var(--pur-red) !important;

    background:
        var(--pur-red-50) !important;

    border:
        1px solid
        #f3b5af !important;
}

#purchases-page .pur-message > svg {
    width:
        18px !important;

    height:
        18px !important;

    min-width:
        18px !important;
}

#purchases-page .pur-message-text {
    min-width:
        0 !important;

    flex:
        1 !important;
}

#purchases-page .pur-message-close {
    display:
        grid !important;

    width:
        32px !important;

    height:
        32px !important;

    min-width:
        32px !important;

    place-items:
        center !important;

    padding:
        0 !important;

    color:
        inherit !important;

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

    border-radius:
        7px !important;

    cursor:
        pointer !important;
}

#purchases-page .pur-message-close svg {
    width:
        14px !important;

    height:
        14px !important;
}

#purchases-page .pur-retry-button {
    min-height:
        34px !important;

    padding:
        5px 8px !important;

    font-size:
        12px !important;
}

#purchases-page .pur-readiness {
    display: flex !important;

    align-items:
        flex-start !important;

    gap:
        8px !important;

    padding:
        10px 12px !important;

    color:
        var(--pur-amber) !important;

    font-size:
        12px !important;

    font-weight:
        650 !important;

    background:
        var(--pur-amber-50) !important;

    border:
        1px solid
        #f0d48f !important;

    border-radius:
        10px !important;
}

#purchases-page .pur-readiness svg {
    width:
        17px !important;

    height:
        17px !important;

    min-width:
        17px !important;
}

#purchases-page .pur-panel {
    display:
        flex !important;

    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;

    flex-direction:
        column !important;

    overflow:
        hidden !important;

    background:
        #ffffff !important;

    border:
        1px solid
        var(--pur-border) !important;

    border-radius:
        14px !important;

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
    display:
        grid !important;

    grid-template-columns:
        minmax(
            230px,
            1fr
        )
        minmax(
            150px,
            210px
        )
        minmax(
            130px,
            160px
        )
        86px
        auto !important;

    align-items:
        end !important;

    gap:
        10px !important;

    padding:
        13px !important;

    border-bottom:
        1px solid
        var(--pur-border) !important;
}

#purchases-page .pur-field {
    display:
        grid !important;

    gap:
        5px !important;
}

#purchases-page .pur-field-label {
    color:
        var(--pur-text-2) !important;

    font-size:
        11px !important;

    font-weight:
        700 !important;
}

#purchases-page .pur-search-wrapper {
    position:
        relative !important;
}

#purchases-page .pur-search-icon {
    position:
        absolute !important;

    top:
        50% !important;

    left:
        12px !important;

    z-index:
        2 !important;

    display:
        grid !important;

    width:
        18px !important;

    height:
        18px !important;

    place-items:
        center !important;

    color:
        var(--pur-muted) !important;

    transform:
        translateY(
            -50%
        ) !important;

    pointer-events:
        none !important;
}

#purchases-page .pur-search-icon svg {
    display:
        block !important;

    width:
        18px !important;

    height:
        18px !important;
}

#purchases-page .pur-input,
#purchases-page .pur-select {
    display:
        block !important;

    width:
        100% !important;

    height:
        44px !important;

    min-height:
        44px !important;

    color:
        var(--pur-text) !important;

    font-size:
        14px !important;

    font-weight:
        550 !important;

    outline:
        none !important;

    background:
        #ffffff !important;

    border:
        1px solid
        var(--pur-border-strong) !important;

    border-radius:
        9px !important;
}

#purchases-page .pur-input {
    padding:
        0 42px
        0 40px !important;

    background:
        #f8faf9 !important;
}

#purchases-page .pur-input::placeholder {
    color:
        #7a8696 !important;

    opacity:
        1 !important;
}

#purchases-page .pur-select {
    padding:
        0 9px !important;

    cursor:
        pointer !important;
}

#purchases-page .pur-clear-search {
    position:
        absolute !important;

    top:
        50% !important;

    right:
        5px !important;

    z-index:
        3 !important;

    display:
        grid !important;

    width:
        32px !important;

    height:
        32px !important;

    place-items:
        center !important;

    padding:
        0 !important;

    color:
        var(--pur-muted) !important;

    background:
        transparent !important;

    border:
        0 !important;

    border-radius:
        7px !important;

    transform:
        translateY(
            -50%
        ) !important;

    cursor:
        pointer !important;
}

#purchases-page .pur-clear-search:hover {
    color:
        var(--pur-text) !important;

    background:
        #eaf0ec !important;
}

#purchases-page .pur-clear-search svg {
    width:
        16px !important;

    height:
        16px !important;
}

#purchases-page .pur-clear-filters {
    min-height:
        44px !important;

    white-space:
        nowrap !important;
}

#purchases-page .pur-list {
    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    overflow-x: hidden !important;

    flex-direction:
        column !important;

    gap:
        8px !important;

    padding:
        10px !important;

    background:
        var(--pur-page) !important;
}

#purchases-page .pur-list-head,
#purchases-page .pur-row {
    display:
        grid !important;

    /*
     * IMPORTANT:
     * Keep every column inside the available content width.
     * The application sidebar reduces the actual page width, so
     * large fixed minimums here caused the Actions column to be
     * clipped on the right side.
     */
    grid-template-columns:
        minmax(0, 1.25fr)
        minmax(0, 1fr)
        96px
        110px
        125px
        92px
        minmax(180px, 0.95fr) !important;

    width:
        100% !important;

    min-width:
        0 !important;

    max-width:
        100% !important;

    gap:
        9px !important;

    align-items:
        center !important;
}

#purchases-page .pur-list-head {
    padding:
        0 12px
        2px !important;

    color:
        var(--pur-muted) !important;

    font-size:
        9px !important;

    font-weight:
        800 !important;

    letter-spacing:
        0.04em !important;

    text-transform:
        uppercase !important;
}

#purchases-page .pur-row {
    width:
        100% !important;

    min-width:
        0 !important;

    max-width:
        100% !important;

    overflow:
        hidden !important;

    padding:
        11px 12px !important;

    background:
        #ffffff !important;

    border:
        1px solid
        var(--pur-border) !important;

    border-radius:
        10px !important;

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
    border-color:
        #9dceaa !important;

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
    display:
        flex !important;

    min-width:
        0 !important;

    align-items:
        center !important;

    gap:
        9px !important;
}

#purchases-page .pur-record-icon {
    display:
        grid !important;

    width:
        40px !important;

    height:
        40px !important;

    min-width:
        40px !important;

    place-items:
        center !important;

    color:
        #ffffff !important;

    background:
        linear-gradient(
            145deg,
            var(--pur-green-900),
            var(--pur-green-700)
        ) !important;

    border-radius:
        10px !important;
}

#purchases-page .pur-record-icon svg {
    width:
        18px !important;

    height:
        18px !important;
}

#purchases-page .pur-copy {
    min-width:
        0 !important;
}

#purchases-page .pur-number {
    display:
        block !important;

    overflow:
        hidden !important;

    color:
        var(--pur-text) !important;

    font-size:
        14px !important;

    font-weight:
        800 !important;

    line-height:
        1.3 !important;

    text-overflow:
        ellipsis !important;

    white-space:
        nowrap !important;
}

#purchases-page .pur-invoice {
    display:
        block !important;

    margin-top:
        2px !important;

    overflow:
        hidden !important;

    color:
        var(--pur-muted) !important;

    font-size:
        10px !important;

    text-overflow:
        ellipsis !important;

    white-space:
        nowrap !important;
}

#purchases-page .pur-cell {
    min-width:
        0 !important;
}

#purchases-page .pur-mobile-label {
    display:
        none !important;
}

#purchases-page .pur-value {
    display:
        block !important;

    overflow:
        hidden !important;

    color:
        var(--pur-text-2) !important;

    font-size:
        12px !important;

    font-weight:
        600 !important;

    text-overflow:
        ellipsis !important;

    white-space:
        nowrap !important;
}

#purchases-page .pur-value.strong {
    color:
        var(--pur-text) !important;

    font-size:
        13px !important;

    font-weight:
        800 !important;
}

#purchases-page .pur-meta {
    display:
        flex !important;

    align-items:
        center !important;

    gap:
        4px !important;

    color:
        var(--pur-muted) !important;

    font-size:
        10px !important;
}

#purchases-page .pur-meta svg {
    width:
        12px !important;

    height:
        12px !important;
}

#purchases-page .pur-status {
    display:
        inline-flex !important;

    min-height:
        28px !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    gap:
        5px !important;

    padding:
        4px 8px !important;

    font-size:
        10px !important;

    font-weight:
        800 !important;

    white-space:
        nowrap !important;

    border-radius:
        999px !important;
}

#purchases-page .pur-status.draft {
    color:
        var(--pur-amber) !important;

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
    width:
        13px !important;

    height:
        13px !important;
}

#purchases-page .pur-actions {
    display:
        grid !important;

    width:
        100% !important;

    min-width:
        0 !important;

    grid-template-columns:
        repeat(
            2,
            minmax(0, 1fr)
        ) !important;

    align-items:
        center !important;

    justify-content:
        stretch !important;

    gap:
        5px !important;
}

#purchases-page .pur-action-button {
    width:
        100% !important;

    min-width:
        0 !important;

    min-height:
        34px !important;

    padding:
        5px 6px !important;

    font-size:
        10.5px !important;

    white-space:
        nowrap !important;
}

#purchases-page .pur-completed {
    display:
        inline-flex !important;

    width:
        100% !important;

    min-width:
        0 !important;

    min-height:
        34px !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    gap:
        4px !important;

    padding:
        5px 6px !important;

    color:
        var(--pur-green-900) !important;

    font-size:
        10.5px !important;

    font-weight:
        700 !important;

    white-space:
        nowrap !important;

    background:
        var(--pur-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius:
        8px !important;
}

#purchases-page .pur-completed svg {
    width:
        14px !important;

    height:
        14px !important;
}

#purchases-page .pur-state {
    display:
        flex !important;

    min-height:
        280px !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    flex-direction:
        column !important;

    gap:
        8px !important;

    padding:
        28px !important;

    color:
        var(--pur-muted) !important;

    text-align:
        center !important;

    background:
        #ffffff !important;
}

#purchases-page .pur-state-icon {
    display:
        grid !important;

    width:
        48px !important;

    height:
        48px !important;

    place-items:
        center !important;

    color:
        var(--pur-green-700) !important;

    background:
        var(--pur-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius:
        11px !important;
}

#purchases-page .pur-state-icon svg {
    width:
        23px !important;

    height:
        23px !important;
}

#purchases-page .pur-state-title {
    color:
        var(--pur-text) !important;

    font-size:
        16px !important;

    font-weight:
        800 !important;
}

#purchases-page .pur-state-message {
    max-width:
        440px !important;

    font-size:
        12px !important;
}

#purchases-page .pur-state-action {
    margin-top:
        4px !important;
}

#purchases-page .pur-spinner {
    width:
        36px !important;

    height:
        36px !important;

    border:
        4px solid
        var(--pur-green-100) !important;

    border-top-color:
        var(--pur-green-700) !important;

    border-radius:
        50% !important;

    animation:
        pur-spin
        700ms
        linear
        infinite !important;
}

@keyframes pur-spin {
    to {
        transform:
            rotate(
                360deg
            );
    }
}

#purchases-page .pur-pagination {
    display:
        flex !important;

    min-height:
        62px !important;

    align-items:
        center !important;

    justify-content:
        space-between !important;

    gap:
        12px !important;

    padding:
        10px 14px !important;

    border-top:
        1px solid
        var(--pur-border) !important;
}

#purchases-page .pur-pagination-info {
    color:
        var(--pur-muted) !important;

    font-size:
        12px !important;
}

#purchases-page .pur-pagination-info strong {
    color:
        var(--pur-text-2) !important;

    font-weight:
        800 !important;
}

#purchases-page .pur-pagination-actions {
    display:
        flex !important;

    align-items:
        center !important;

    gap:
        7px !important;
}

#purchases-page .pur-page-number {
    display:
        inline-flex !important;

    min-height:
        36px !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    padding:
        6px 9px !important;

    color:
        var(--pur-text-2) !important;

    font-size:
        11px !important;

    font-weight:
        650 !important;

    white-space:
        nowrap !important;

    background:
        #f8faf9 !important;

    border:
        1px solid
        #e4e9e5 !important;

    border-radius:
        8px !important;
}

#purchases-page .pur-page-button {
    min-height:
        36px !important;

    padding:
        6px 9px !important;

    font-size:
        12px !important;
}

@media (
    max-width: 1180px
) {
    #purchases-page .pur-list-head {
        display:
            none !important;
    }

    #purchases-page .pur-row {
        grid-template-columns:
            repeat(
                3,
                minmax(
                    0,
                    1fr
                )
            ) !important;

        align-items:
            start !important;
    }

    #purchases-page .pur-identity,
    #purchases-page .pur-actions {
        grid-column:
            1 / -1 !important;
    }

    #purchases-page .pur-mobile-label {
        display:
            block !important;

        margin-bottom:
            2px !important;

        color:
            var(--pur-muted) !important;

        font-size:
            9px !important;

        font-weight:
            800 !important;

        letter-spacing:
            0.04em !important;

        text-transform:
            uppercase !important;
    }

    #purchases-page .pur-actions {
        width:
            100% !important;

        justify-content:
            stretch !important;
    }
}

@media (
    max-width: 980px
) {
    #purchases-page .pur-toolbar {
        grid-template-columns:
            minmax(
                0,
                1fr
            )
            minmax(
                150px,
                210px
            )
            minmax(
                130px,
                160px
            ) !important;
    }

    #purchases-page
    .pur-toolbar
    .pur-field:nth-child(4),
    #purchases-page
    .pur-clear-filters {
        grid-row:
            2 !important;
    }

    #purchases-page
    .pur-toolbar
    .pur-field:nth-child(4) {
        grid-column:
            1 / 2 !important;

        max-width:
            120px !important;
    }

    #purchases-page
    .pur-clear-filters {
        grid-column:
            2 / -1 !important;

        justify-self:
            end !important;
    }
}

@media (
    max-width: 700px
) {
    #purchases-page {
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        overflow-x: hidden !important;
    }

    #purchases-page .pur-header {
        min-height:
            0 !important;

        align-items:
            stretch !important;

        flex-direction:
            column !important;

        padding:
            15px !important;
    }

    #purchases-page .pur-title {
        font-size:
            21px !important;
    }

    #purchases-page .pur-header-actions {
        display:
            grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #purchases-page .pur-total-badge,
    #purchases-page
    .pur-header-actions
    .pur-button {
        width:
            100% !important;
    }

    #purchases-page .pur-toolbar {
        grid-template-columns:
            1fr !important;
    }

    #purchases-page
    .pur-toolbar
    .pur-field:nth-child(4),
    #purchases-page
    .pur-clear-filters {
        grid-row:
            auto !important;

        grid-column:
            auto !important;

        max-width:
            none !important;
    }

    #purchases-page
    .pur-clear-filters {
        width:
            100% !important;

        justify-self:
            stretch !important;
    }

    #purchases-page .pur-row {
        grid-template-columns:
            1fr !important;
    }

    #purchases-page .pur-actions {
        display:
            grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #purchases-page .pur-action-button,
    #purchases-page .pur-completed {
        width:
            100% !important;
    }

    #purchases-page .pur-completed {
        grid-column:
            1 / -1 !important;
    }

    #purchases-page .pur-message {
        align-items:
            flex-start !important;

        flex-wrap:
            wrap !important;
    }

    #purchases-page .pur-retry-button {
        width:
            100% !important;
    }

    #purchases-page .pur-pagination {
        align-items:
            stretch !important;

        flex-direction:
            column !important;
    }

    #purchases-page .pur-pagination-actions {
        display:
            grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #purchases-page .pur-page-number {
        grid-column:
            1 / -1 !important;

        grid-row:
            1 !important;
    }

    #purchases-page .pur-page-button {
        width:
            100% !important;
    }
}

@media (
    max-width: 480px
) {
    #purchases-page .pur-header-actions,
    #purchases-page .pur-actions {
        grid-template-columns:
            1fr !important;
    }

    #purchases-page .pur-number {
        white-space:
            normal !important;
    }
}

@media (
    prefers-reduced-motion: reduce
) {
    #purchases-page *,
    #purchases-page *::before,
    #purchases-page *::after {
        transition:
            none !important;

        scroll-behavior:
            auto !important;
    }

    #purchases-page .pur-spinner {
        animation-duration:
            1.2s !important;
    }

}


/* =========================================================
   PURCHASE PAGE — SUPPLIER DUES STYLE LAYOUT
   ========================================================= */

/*
 * Match SupplierDuesPage behaviour:
 * - page itself does not scroll
 * - header and messages remain fixed
 * - toolbar remains fixed
 * - only the purchase list scrolls
 * - pagination remains fixed at the bottom
 */
#purchases-page {
    height:
        calc(100dvh - 96px) !important;

    max-height:
        calc(100dvh - 96px) !important;

    min-height: 0 !important;

    padding:
        0
        8px
        12px
        0 !important;

    overflow:
        hidden !important;
}

#purchases-page .pur-header,
#purchases-page .pur-readiness,
#purchases-page .pur-message {
    flex-shrink:
        0 !important;
}

#purchases-page .pur-header {
    min-height:
        98px !important;

    padding:
        17px
        19px !important;
}

#purchases-page .pur-title {
    font-size:
        24px !important;

    font-weight:
        740 !important;
}

#purchases-page .pur-kicker {
    font-weight:
        750 !important;
}

#purchases-page .pur-button {
    min-height:
        40px !important;

    padding:
        7px
        11px !important;

    font-weight:
        700 !important;
}

#purchases-page .pur-total-badge {
    min-height:
        40px !important;

    font-weight:
        700 !important;
}

/*
 * The panel fills the remaining viewport.
 */
#purchases-page .pur-panel {
    display:
        flex !important;

    width:
        100% !important;

    min-width:
        0 !important;

    min-height:
        0 !important;

    flex:
        1 1 auto !important;

    flex-direction:
        column !important;

    overflow:
        hidden !important;
}

/*
 * Toolbar stays fixed above the scrolling purchase list.
 */
#purchases-page .pur-toolbar {
    flex-shrink:
        0 !important;

    grid-template-columns:
        minmax(
            260px,
            1fr
        )
        minmax(
            170px,
            220px
        )
        minmax(
            150px,
            190px
        )
        96px
        auto !important;

    padding:
        13px !important;
}

#purchases-page .pur-input,
#purchases-page .pur-select {
    height:
        42px !important;

    min-height:
        42px !important;

    font-weight:
        500 !important;
}

#purchases-page .pur-clear-filters {
    min-height:
        42px !important;
}

/*
 * Only this area scrolls, matching SupplierDuesPage.
 */
#purchases-page .pur-list {
    display:
        flex !important;

    width:
        100% !important;

    min-width:
        0 !important;

    min-height:
        0 !important;

    flex:
        1 1 auto !important;

    flex-direction:
        column !important;

    gap:
        8px !important;

    padding:
        10px !important;

    overflow-x:
        hidden !important;

    overflow-y:
        auto !important;

    background:
        var(--pur-page) !important;

    scrollbar-width:
        thin !important;

    scrollbar-color:
        #89a091
        #e8eeea !important;
}

#purchases-page .pur-list::-webkit-scrollbar {
    width:
        10px !important;
}

#purchases-page .pur-list::-webkit-scrollbar-track {
    background:
        #e8eeea !important;

    border-radius:
        999px !important;
}

#purchases-page .pur-list::-webkit-scrollbar-thumb {
    background:
        #89a091 !important;

    border:
        2px solid
        #e8eeea !important;

    border-radius:
        999px !important;
}

#purchases-page .pur-list::-webkit-scrollbar-thumb:hover {
    background:
        var(--pur-green-700) !important;
}

/*
 * Five-column layout like SupplierDuesPage.
 * This gives enough room for the Action buttons and
 * avoids the clipping shown on the previous Purchase page.
 */
#purchases-page .pur-list-head,
#purchases-page .pur-row {
    display:
        grid !important;

    grid-template-columns:
        minmax(
            190px,
            1.05fr
        )
        minmax(
            150px,
            0.85fr
        )
        minmax(
            240px,
            1.25fr
        )
        minmax(
            170px,
            0.85fr
        )
        minmax(
            210px,
            auto
        ) !important;

    width:
        100% !important;

    min-width:
        0 !important;

    max-width:
        100% !important;

    gap:
        12px !important;

    align-items:
        center !important;
}

#purchases-page .pur-list-head {
    padding:
        0
        12px
        2px !important;

    color:
        var(--pur-muted) !important;

    font-size:
        9px !important;

    font-weight:
        700 !important;
}

#purchases-page .pur-row {
    overflow:
        visible !important;

    padding:
        11px
        12px !important;
}

#purchases-page .pur-number {
    font-weight:
        700 !important;
}

#purchases-page .pur-value {
    font-weight:
        550 !important;
}

#purchases-page .pur-value.strong {
    font-weight:
        700 !important;
}

/* Combined date + items cell */
#purchases-page .pur-purchase-detail-cell {
    display:
        grid !important;

    min-width:
        0 !important;

    grid-template-columns:
        repeat(
            2,
            minmax(
                0,
                1fr
            )
        ) !important;

    gap:
        6px !important;
}

#purchases-page .pur-detail-box {
    min-width:
        0 !important;

    padding:
        7px
        8px !important;

    background:
        #f8faf9 !important;

    border:
        1px solid
        #e4e9e5 !important;

    border-radius:
        8px !important;
}

#purchases-page .pur-detail-box span {
    display:
        block !important;

    color:
        var(--pur-muted) !important;

    font-size:
        9px !important;

    font-weight:
        650 !important;
}

#purchases-page .pur-detail-box strong {
    display:
        flex !important;

    min-width:
        0 !important;

    align-items:
        center !important;

    gap:
        4px !important;

    margin-top:
        1px !important;

    overflow:
        hidden !important;

    color:
        var(--pur-text-2) !important;

    font-size:
        11px !important;

    font-weight:
        700 !important;

    text-overflow:
        ellipsis !important;

    white-space:
        nowrap !important;
}

#purchases-page .pur-detail-box strong svg {
    width:
        12px !important;

    height:
        12px !important;

    min-width:
        12px !important;

    color:
        var(--pur-muted) !important;
}

/* Combined total + status cell */
#purchases-page .pur-total-status-cell {
    display:
        flex !important;

    min-width:
        0 !important;

    flex-direction:
        column !important;

    align-items:
        flex-start !important;

    gap:
        5px !important;
}

#purchases-page .pur-total-status-cell .pur-status {
    margin-top:
        0 !important;
}

/* Actions now match SupplierDuesPage: compact horizontal buttons. */
#purchases-page .pur-actions {
    display:
        flex !important;

    width:
        100% !important;

    min-width:
        0 !important;

    align-items:
        center !important;

    justify-content:
        flex-end !important;

    flex-wrap:
        wrap !important;

    gap:
        6px !important;
}

#purchases-page .pur-action-button {
    width:
        auto !important;

    min-width:
        0 !important;

    min-height:
        34px !important;

    padding:
        5px
        8px !important;

    font-size:
        11px !important;
}

#purchases-page .pur-completed {
    width:
        auto !important;

    min-width:
        0 !important;

    min-height:
        34px !important;

    padding:
        5px
        8px !important;

    font-size:
        11px !important;

    font-weight:
        650 !important;
}

/* Pagination is fixed below the scrolling list. */
#purchases-page .pur-pagination {
    flex-shrink:
        0 !important;

    min-height:
        62px !important;

    padding:
        10px
        14px !important;
}

/*
 * When the page cannot comfortably support five columns,
 * switch to the same responsive card behaviour as SupplierDuesPage
 * before anything can overflow horizontally.
 */
@media (
    max-width: 1240px
) {
    #purchases-page .pur-list-head {
        display:
            none !important;
    }

    #purchases-page .pur-row {
        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;

        align-items:
            start !important;
    }

    #purchases-page .pur-identity,
    #purchases-page .pur-purchase-detail-cell,
    #purchases-page .pur-actions {
        grid-column:
            1 / -1 !important;
    }

    #purchases-page .pur-mobile-label {
        display:
            block !important;

        margin-bottom:
            3px !important;

        color:
            var(--pur-muted) !important;

        font-size:
            9px !important;

        font-weight:
            700 !important;

        letter-spacing:
            0.04em !important;

        text-transform:
            uppercase !important;
    }

    #purchases-page .pur-actions {
        justify-content:
            flex-start !important;
    }
}

@media (
    max-width: 980px
) {
    #purchases-page .pur-toolbar {
        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #purchases-page .pur-toolbar .pur-field:first-child {
        grid-column:
            1 / -1 !important;
    }

    #purchases-page .pur-clear-filters {
        width:
            100% !important;
    }
}

@media (
    max-width: 700px
) {
    #purchases-page {
        height:
            calc(100dvh - 72px) !important;

        max-height:
            calc(100dvh - 72px) !important;

        padding-right:
            4px !important;
    }

    #purchases-page .pur-header {
        align-items:
            stretch !important;

        flex-direction:
            column !important;

        padding:
            15px !important;
    }

    #purchases-page .pur-title {
        font-size:
            21px !important;
    }

    #purchases-page .pur-header-actions {
        display:
            grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #purchases-page .pur-total-badge,
    #purchases-page .pur-header-actions .pur-button {
        width:
            100% !important;
    }

    #purchases-page .pur-toolbar,
    #purchases-page .pur-row,
    #purchases-page .pur-purchase-detail-cell {
        grid-template-columns:
            1fr !important;
    }

    #purchases-page .pur-identity,
    #purchases-page .pur-purchase-detail-cell,
    #purchases-page .pur-actions {
        grid-column:
            auto !important;
    }

    #purchases-page .pur-actions {
        display:
            grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #purchases-page .pur-action-button,
    #purchases-page .pur-completed {
        width:
            100% !important;
    }

    #purchases-page .pur-completed {
        grid-column:
            1 / -1 !important;
    }

    #purchases-page .pur-pagination {
        align-items:
            stretch !important;

        flex-direction:
            column !important;
    }

    #purchases-page .pur-pagination-actions {
        display:
            grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #purchases-page .pur-page-number {
        grid-column:
            1 / -1 !important;

        grid-row:
            1 !important;

        justify-content:
            center !important;
    }

    #purchases-page .pur-page-button {
        width:
            100% !important;
    }
}

@media (
    max-width: 420px
) {
    #purchases-page .pur-header-actions,
    #purchases-page .pur-actions {
        grid-template-columns:
            1fr !important;
    }
}


/* =========================================================
   PURCHASE PAGE — ONLY PURCHASE ITEMS SCROLL
   ========================================================= */

/*
 * AppLayout normally makes .sapo-shell-content scroll.
 * While PurchasesPage is active we lock that outer scrollbar
 * and turn the content area into a flex container.
 *
 * This leaves ONLY .pur-list vertically scrollable.
 */
#sapo-app-shell
.sapo-shell-content.purchases-page-scroll-lock {
    display: flex !important;

    min-width: 0 !important;
    min-height: 0 !important;

    flex: 1 1 auto !important;
    flex-direction: column !important;

    overflow-x: hidden !important;
    overflow-y: hidden !important;

    overscroll-behavior:
        none !important;

    scrollbar-gutter:
        auto !important;

    scrollbar-width:
        none !important;
}

#sapo-app-shell
.sapo-shell-content.purchases-page-scroll-lock::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
}

/*
 * The Purchase page fills exactly the remaining AppLayout
 * content area. Do NOT calculate its height from 100dvh,
 * because AppLayout has its own top bar and content padding.
 */
#sapo-app-shell
.sapo-shell-content.purchases-page-scroll-lock
> #purchases-page {
    width: 100% !important;

    min-width: 0 !important;
    min-height: 0 !important;

    height: auto !important;
    max-height: none !important;

    flex: 1 1 auto !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: hidden !important;
}

/*
 * Header/messages never scroll.
 */
#purchases-page .pur-header,
#purchases-page .pur-readiness,
#purchases-page .pur-message {
    flex: 0 0 auto !important;
}

/*
 * The white Purchase panel fills all remaining vertical room.
 */
#purchases-page .pur-panel {
    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    flex: 1 1 auto !important;
    flex-direction: column !important;

    overflow: hidden !important;
}

/*
 * Search / Supplier / Status / Rows toolbar stays fixed.
 */
#purchases-page .pur-toolbar {
    flex: 0 0 auto !important;
}

/*
 * ONLY the actual purchase records area scrolls.
 */
#purchases-page .pur-list {
    position: relative !important;

    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    flex: 1 1 auto !important;
    flex-direction: column !important;

    overflow-x: hidden !important;
    overflow-y: auto !important;

    overscroll-behavior-y:
        contain !important;

    scrollbar-gutter:
        stable !important;

    scrollbar-width:
        thin !important;

    scrollbar-color:
        #89a091
        #e8eeea !important;
}

#purchases-page .pur-list::-webkit-scrollbar {
    width: 10px !important;
}

#purchases-page .pur-list::-webkit-scrollbar-track {
    background:
        #e8eeea !important;

    border-radius:
        999px !important;
}

#purchases-page .pur-list::-webkit-scrollbar-thumb {
    background:
        #89a091 !important;

    border:
        2px solid
        #e8eeea !important;

    border-radius:
        999px !important;
}

#purchases-page .pur-list::-webkit-scrollbar-thumb:hover {
    background:
        var(--pur-green-700) !important;
}

/*
 * Keep the table/list column headings visible while purchase
 * rows scroll underneath them.
 */
#purchases-page .pur-list-head {
    /*
     * IMPORTANT:
     * The column heading row is OUTSIDE .pur-list.
     * It is therefore never part of the scrolling content.
     */
    position: relative !important;

    top: auto !important;

    z-index: 20 !important;

    flex: 0 0 auto !important;

    width: 100% !important;
    min-width: 0 !important;

    margin: 0 !important;

    min-height: 42px !important;

    padding:
        9px
        22px !important;

    background:
        #f5f8f6 !important;

    border-bottom:
        1px solid
        #d9e2dc !important;

    box-shadow:
        0 2px 4px
        rgba(
            16,
            24,
            40,
            0.035
        ) !important;
}


#purchases-page .pur-list {
    /*
     * Rows are clipped to this scroll viewport.
     * Nothing can render between the toolbar and fixed headings.
     */
    clip-path: inset(0) !important;
    contain: paint !important;

    padding-top: 10px !important;
}

/*
 * Rows themselves must never create another scrollbar.
 */
#purchases-page .pur-row {
    flex: 0 0 auto !important;

    overflow:
        hidden !important;
}

/*
 * Pagination stays fixed at the bottom of the panel.
 */
#purchases-page .pur-pagination {
    flex: 0 0 auto !important;
}

/*
 * Loading / empty states occupy the same records area,
 * without creating an outer page scrollbar.
 */
#purchases-page .pur-state {
    min-height: 0 !important;

    flex: 1 1 auto !important;

    overflow:
        hidden !important;
}

/*
 * Override the previous viewport-height mobile rules too.
 * The AppLayout itself already knows the correct remaining
 * height below its mobile top bar.
 */
@media (max-width: 700px) {
    #sapo-app-shell
    .sapo-shell-content.purchases-page-scroll-lock
    > #purchases-page {
        height: auto !important;
        max-height: none !important;

        padding: 0 !important;

        overflow: hidden !important;
    }

    #purchases-page .pur-panel {
        min-height: 0 !important;

        flex: 1 1 auto !important;
    }

    #purchases-page .pur-list {
        min-height: 0 !important;

        flex: 1 1 auto !important;

        overflow-x: hidden !important;
        overflow-y: auto !important;
    }

    #purchases-page .pur-list-head {
        /*
         * Mobile cards do not use the desktop heading row.
         */
        position: static !important;
    }
}

/* =========================================================
   PURCHASE DETAILS MODAL
   ========================================================= */

#purchase-details-modal,
#purchase-details-modal *,
#purchase-details-modal *::before,
#purchase-details-modal *::after {
    box-sizing: border-box !important;
}

#purchase-details-modal {
    --pvd-green-950: #052e16;
    --pvd-green-900: #14532d;
    --pvd-green-800: #166534;
    --pvd-green-700: #15803d;
    --pvd-green-100: #dcfce7;
    --pvd-green-50: #f0fdf4;

    --pvd-blue: #175cd3;
    --pvd-blue-50: #eff8ff;

    --pvd-amber: #b54708;
    --pvd-amber-50: #fffaeb;

    --pvd-red: #b42318;
    --pvd-red-50: #fef3f2;

    --pvd-text: #101828;
    --pvd-text-2: #344054;
    --pvd-muted: #667085;

    --pvd-border: #d0d9d2;
    --pvd-border-soft: #e5ebe6;

    position: fixed !important;

    inset: 0 !important;

    z-index: 2147483647 !important;

    display: flex !important;

    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 24px !important;

    color: var(--pvd-text) !important;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif !important;

    background:
        rgba(
            7,
            20,
            12,
            0.74
        ) !important;

    backdrop-filter:
        blur(5px) !important;

    overflow: hidden !important;
    overscroll-behavior: contain !important;
}

#purchase-details-modal button {
    font: inherit !important;
}

#purchase-details-modal h2,
#purchase-details-modal h3,
#purchase-details-modal p {
    margin: 0 !important;
}

#purchase-details-modal .pvd-dialog {
    display: flex !important;

    width:
        min(
            1180px,
            100%
        ) !important;

    min-width: 0 !important;
    max-width: 1180px !important;

    max-height:
        calc(
            100dvh - 32px
        ) !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        #d6e0d8 !important;

    border-radius: 18px !important;

    box-shadow:
        0 30px 100px
        rgba(
            0,
            0,
            0,
            0.4
        ) !important;
}

#purchase-details-modal .pvd-header {
    display: flex !important;

    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: space-between !important;

    gap: 18px !important;

    padding: 18px 20px !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--pvd-green-950),
            var(--pvd-green-800),
            var(--pvd-green-700)
        ) !important;
}

#purchase-details-modal .pvd-header-main {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;

    gap: 12px !important;
}

#purchase-details-modal .pvd-header-icon {
    display: grid !important;

    width: 46px !important;
    height: 46px !important;

    min-width: 46px !important;

    place-items: center !important;

    color: var(--pvd-green-900) !important;

    background: #ffffff !important;

    border-radius: 11px !important;
}

#purchase-details-modal .pvd-header-icon svg {
    width: 22px !important;
    height: 22px !important;
}

#purchase-details-modal .pvd-kicker {
    display: block !important;

    color:
        rgba(
            255,
            255,
            255,
            0.72
        ) !important;

    font-size: 10px !important;
    font-weight: 800 !important;

    letter-spacing: 0.05em !important;

    text-transform: uppercase !important;
}

#purchase-details-modal .pvd-title {
    margin-top: 2px !important;

    overflow: hidden !important;

    color: #ffffff !important;

    font-size: 24px !important;
    font-weight: 850 !important;

    text-overflow: ellipsis !important;

    white-space: nowrap !important;
}

#purchase-details-modal .pvd-subtitle {
    display: block !important;

    margin-top: 2px !important;

    overflow: hidden !important;

    color:
        rgba(
            255,
            255,
            255,
            0.8
        ) !important;

    font-size: 13px !important;
    font-weight: 650 !important;

    text-overflow: ellipsis !important;

    white-space: nowrap !important;
}

#purchase-details-modal .pvd-close {
    display: grid !important;

    width: 42px !important;
    height: 42px !important;

    min-width: 42px !important;

    place-items: center !important;

    padding: 0 !important;

    color: #ffffff !important;

    background:
        rgba(
            255,
            255,
            255,
            0.12
        ) !important;

    border:
        1px solid
        rgba(
            255,
            255,
            255,
            0.26
        ) !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#purchase-details-modal .pvd-close svg {
    width: 18px !important;
    height: 18px !important;
}

#purchase-details-modal .pvd-body {
    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    flex: 1 1 auto !important;

    padding: 16px !important;

    overflow-x: hidden !important;
    overflow-y: auto !important;

    overscroll-behavior: contain !important;

    background: #f4f7f5 !important;

    scrollbar-width: thin !important;
    scrollbar-color: #9cad9f #eaf0eb !important;
}

#purchase-details-modal .pvd-body::-webkit-scrollbar {
    width: 9px !important;
}

#purchase-details-modal .pvd-body::-webkit-scrollbar-track {
    background: #eaf0eb !important;
}

#purchase-details-modal .pvd-body::-webkit-scrollbar-thumb {
    background: #9cad9f !important;
    border-radius: 999px !important;
}

#purchase-details-modal .pvd-summary-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            5,
            minmax(
                0,
                1fr
            )
        ) !important;

    gap: 9px !important;

    margin-bottom: 13px !important;
}

#purchase-details-modal .pvd-summary-card {
    display: flex !important;

    min-width: 0 !important;
    min-height: 88px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 3px !important;

    padding: 11px 12px !important;

    background: #ffffff !important;

    border:
        1px solid
        #d7e1d9 !important;

    border-radius: 9px !important;
}

#purchase-details-modal .pvd-summary-card.green {
    background: var(--pvd-green-50) !important;

    border-color: #b8dfc3 !important;
}

#purchase-details-modal .pvd-summary-card.blue {
    background: var(--pvd-blue-50) !important;

    border-color: #bddaff !important;
}

#purchase-details-modal .pvd-summary-card.amber {
    background: var(--pvd-amber-50) !important;

    border-color: #efd696 !important;
}

#purchase-details-modal .pvd-summary-label {
    color: var(--pvd-muted) !important;

    font-size: 10px !important;
    font-weight: 800 !important;

    text-transform: uppercase !important;
}

#purchase-details-modal .pvd-summary-value {
    overflow-wrap: anywhere !important;

    color: var(--pvd-text) !important;

    font-size: 17px !important;
    font-weight: 850 !important;
}

#purchase-details-modal .pvd-summary-card.green .pvd-summary-value {
    color: var(--pvd-green-900) !important;
}

#purchase-details-modal .pvd-summary-card.blue .pvd-summary-value {
    color: var(--pvd-blue) !important;
}

#purchase-details-modal .pvd-summary-card.amber .pvd-summary-value {
    color: var(--pvd-amber) !important;
}

#purchase-details-modal .pvd-section {
    overflow: hidden !important;

    margin-top: 12px !important;

    background: #ffffff !important;

    border:
        1px solid
        #d7e1d9 !important;

    border-radius: 10px !important;
}

#purchase-details-modal .pvd-section-head {
    display: flex !important;

    align-items: flex-start !important;
    justify-content: space-between !important;

    gap: 12px !important;

    padding: 11px 13px !important;

    background: #f8faf9 !important;

    border-bottom:
        1px solid
        #e3e9e4 !important;
}

#purchase-details-modal .pvd-section-head-main {
    display: flex !important;

    align-items: center !important;

    gap: 8px !important;
}

#purchase-details-modal .pvd-section-head-main svg {
    width: 17px !important;
    height: 17px !important;

    color: var(--pvd-green-700) !important;
}

#purchase-details-modal .pvd-section-title {
    color: var(--pvd-text) !important;

    font-size: 15px !important;
    font-weight: 850 !important;
}

#purchase-details-modal .pvd-count {
    display: inline-flex !important;

    min-height: 27px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 3px 8px !important;

    color: var(--pvd-green-900) !important;

    font-size: 9px !important;
    font-weight: 800 !important;

    background: var(--pvd-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 999px !important;
}

#purchase-details-modal .pvd-detail-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            4,
            minmax(
                0,
                1fr
            )
        ) !important;

    gap: 1px !important;

    background: #e7ece8 !important;
}

#purchase-details-modal .pvd-detail-item {
    display: flex !important;

    min-width: 0 !important;
    min-height: 70px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 3px !important;

    padding: 10px 11px !important;

    background: #ffffff !important;
}

#purchase-details-modal .pvd-detail-item.wide {
    grid-column:
        1 / -1 !important;
}

#purchase-details-modal .pvd-detail-label {
    color: var(--pvd-muted) !important;

    font-size: 10px !important;
    font-weight: 800 !important;

    text-transform: uppercase !important;
}

#purchase-details-modal .pvd-detail-value {
    overflow-wrap: anywhere !important;

    color: var(--pvd-text-2) !important;

    font-size: 13px !important;
    font-weight: 750 !important;

    line-height: 1.45 !important;
}

#purchase-details-modal .pvd-items {
    display: grid !important;

    gap: 10px !important;

    padding: 11px !important;

    background: #f4f7f5 !important;
}

#purchase-details-modal .pvd-item-card {
    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--pvd-border) !important;

    border-radius: 10px !important;
}

#purchase-details-modal .pvd-item-header {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;

    gap: 12px !important;

    padding: 11px 12px !important;

    background:
        linear-gradient(
            135deg,
            #ffffff,
            #f0f8f2
        ) !important;

    border-bottom:
        1px solid
        var(--pvd-border-soft) !important;
}

#purchase-details-modal .pvd-item-title-wrap {
    min-width: 0 !important;
}

#purchase-details-modal .pvd-item-kicker {
    display: block !important;

    color: var(--pvd-green-700) !important;

    font-size: 10px !important;
    font-weight: 800 !important;

    text-transform: uppercase !important;
}

#purchase-details-modal .pvd-item-title {
    display: block !important;

    margin-top: 2px !important;

    overflow: hidden !important;

    color: var(--pvd-text) !important;

    font-size: 16px !important;
    font-weight: 850 !important;

    text-overflow: ellipsis !important;

    white-space: nowrap !important;
}

#purchase-details-modal .pvd-item-variant {
    display: block !important;

    margin-top: 2px !important;

    color: var(--pvd-muted) !important;

    font-size: 12px !important;
    font-weight: 650 !important;
}

#purchase-details-modal .pvd-item-total {
    flex: 0 0 auto !important;

    color: var(--pvd-green-900) !important;

    font-size: 15px !important;
    font-weight: 850 !important;
}

#purchase-details-modal .pvd-item-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            4,
            minmax(
                0,
                1fr
            )
        ) !important;

    gap: 1px !important;

    background: #e7ece8 !important;
}

#purchase-details-modal .pvd-item-field {
    display: flex !important;

    min-width: 0 !important;
    min-height: 68px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 3px !important;

    padding: 9px 10px !important;

    background: #ffffff !important;
}

#purchase-details-modal .pvd-item-field span {
    color: var(--pvd-muted) !important;

    font-size: 10px !important;
    font-weight: 800 !important;

    text-transform: uppercase !important;
}

#purchase-details-modal .pvd-item-field strong {
    overflow-wrap: anywhere !important;

    color: var(--pvd-text-2) !important;

    font-size: 12.5px !important;
    font-weight: 750 !important;
}

#purchase-details-modal .pvd-item-field strong.money {
    color: var(--pvd-blue) !important;

    font-size: 13px !important;
    font-weight: 850 !important;
}

#purchase-details-modal .pvd-item-field strong.sale {
    color: var(--pvd-green-900) !important;

    font-size: 13px !important;
    font-weight: 850 !important;
}

#purchase-details-modal .pvd-item-field.wide {
    grid-column:
        span 2 !important;
}

#purchase-details-modal .pvd-notes {
    min-height: 58px !important;

    padding: 11px 12px !important;

    color: var(--pvd-text-2) !important;

    font-size: 13px !important;
    font-weight: 650 !important;

    line-height: 1.6 !important;

    background: #ffffff !important;
}

#purchase-details-modal .pvd-state {
    display: flex !important;

    min-height: 320px !important;

    align-items: center !important;
    justify-content: center !important;

    flex-direction: column !important;

    gap: 8px !important;

    padding: 28px !important;

    color: var(--pvd-muted) !important;

    text-align: center !important;
}

#purchase-details-modal .pvd-state.error {
    color: var(--pvd-red) !important;
}

#purchase-details-modal .pvd-spinner {
    width: 38px !important;
    height: 38px !important;

    border:
        4px solid
        var(--pvd-green-100) !important;

    border-top-color:
        var(--pvd-green-700) !important;

    border-radius: 50% !important;

    animation:
        pvd-spin
        700ms
        linear
        infinite !important;
}

@keyframes pvd-spin {
    to {
        transform:
            rotate(
                360deg
            );
    }
}

#purchase-details-modal .pvd-retry {
    min-height: 38px !important;

    padding: 7px 13px !important;

    color: #ffffff !important;

    font-size: 11px !important;
    font-weight: 800 !important;

    background: var(--pvd-green-700) !important;

    border:
        1px solid
        var(--pvd-green-700) !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#purchase-details-modal .pvd-footer {
    display: flex !important;

    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: flex-end !important;

    padding: 12px 16px !important;

    background: #ffffff !important;

    border-top:
        1px solid
        #dfe6e1 !important;
}

#purchase-details-modal .pvd-footer-button {
    min-height: 40px !important;

    padding: 8px 17px !important;

    color: #ffffff !important;

    font-size: 12px !important;
    font-weight: 800 !important;

    background: var(--pvd-green-700) !important;

    border:
        1px solid
        var(--pvd-green-700) !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

@media (
    max-width: 980px
) {
    #purchase-details-modal .pvd-summary-grid {
        grid-template-columns:
            repeat(
                3,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #purchase-details-modal .pvd-detail-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #purchase-details-modal .pvd-item-grid {
        grid-template-columns:
            repeat(
                3,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }
}

@media (
    max-width: 700px
) {
    #purchase-details-modal {
        align-items: flex-end !important;

        padding: 0 !important;
    }

    #purchase-details-modal .pvd-dialog {
        width: 100% !important;

        max-height: 94dvh !important;

        border-radius:
            16px
            16px
            0
            0 !important;
    }

    #purchase-details-modal .pvd-summary-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #purchase-details-modal .pvd-item-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }
}

@media (
    max-width: 500px
) {
    #purchase-details-modal .pvd-summary-grid,
    #purchase-details-modal .pvd-detail-grid,
    #purchase-details-modal .pvd-item-grid {
        grid-template-columns:
            1fr !important;
    }

    #purchase-details-modal .pvd-item-field.wide {
        grid-column:
            auto !important;
    }
}
`;

interface PurchaseDetailsModalProps {
    target:
    Purchase
    | null;

    purchase:
    Purchase
    | null;

    products:
    PurchaseProductOption[];

    isLoading:
    boolean;

    errorMessage:
    string;

    onClose:
    () => void;

    onRetry:
    () => void;
}

function PurchaseDetailsModal({
    target,
    purchase,
    products,
    isLoading,
    errorMessage,
    onClose,
    onRetry,
}: PurchaseDetailsModalProps) {
    const isOpen =
        target !== null;

    useEffect(
        () => {
            if (!isOpen) {
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
                        onClose();
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
            isOpen,
            onClose,
        ],
    );

    if (
        !target
        || typeof document
        === 'undefined'
    ) {
        return null;
    }

    const headerPurchase =
        purchase
        ?? target;

    const items =
        purchase
            ?.items
        ?? [];

    const resolveProduct =
        (
            productId:
                number,
        ) =>
            products.find(
                (
                    productOption,
                ) =>
                    productOption.id
                    === productId,
            );

    const resolveVariantName =
        (
            productId:
                number,
            variantId:
                number
                | null
                | undefined,
        ): string => {
            if (
                variantId
                === null
                || variantId
                === undefined
            ) {
                return 'Standard Product';
            }

            const productOption =
                resolveProduct(
                    productId,
                );

            const variant =
                productOption
                    ?.variants
                    ?.find(
                        (
                            item,
                        ) =>
                            item.id
                            === variantId,
                    );

            return (
                variant
                    ?.display_name
                ?? `Variant #${variantId}`
            );
        };

    return createPortal(
        <div
            id="purchase-details-modal"
            role="presentation"
            onMouseDown={(
                event,
            ) => {
                if (
                    event.target
                    === event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <section
                className="pvd-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="purchase-details-title"
                onMouseDown={(
                    event,
                ) => {
                    event.stopPropagation();
                }}
            >
                <header className="pvd-header">
                    <div className="pvd-header-main">
                        <span className="pvd-header-icon">
                            <Icon name="receipt" />
                        </span>

                        <div>
                            <span className="pvd-kicker">
                                Complete Purchase Record
                            </span>

                            <h2
                                id="purchase-details-title"
                                className="pvd-title"
                            >
                                {
                                    headerPurchase
                                        .purchase_number
                                }
                            </h2>

                            <span className="pvd-subtitle">
                                {
                                    headerPurchase
                                        .supplier
                                        ?.name
                                    ?? 'Supplier not available'
                                }

                                {' • '}

                                {formatDate(
                                    headerPurchase
                                        .purchase_date,
                                )}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="pvd-close"
                        aria-label="Close purchase details"
                        onClick={
                            onClose
                        }
                    >
                        <Icon name="close" />
                    </button>
                </header>

                <div className="pvd-body">
                    {isLoading ? (
                        <div className="pvd-state">
                            <div className="pvd-spinner" />

                            <strong>
                                Loading Purchase Details
                            </strong>

                            <span>
                                Retrieving the complete purchase,
                                item, pricing and stock information.
                            </span>
                        </div>
                    ) : errorMessage ? (
                        <div className="pvd-state error">
                            <Icon name="alert" />

                            <strong>
                                Unable to Load Purchase
                            </strong>

                            <span>
                                {
                                    errorMessage
                                }
                            </span>

                            <button
                                type="button"
                                className="pvd-retry"
                                onClick={
                                    onRetry
                                }
                            >
                                Retry
                            </button>
                        </div>
                    ) : purchase ? (
                        <>
                            <section className="pvd-summary-grid">
                                <article className="pvd-summary-card green">
                                    <span className="pvd-summary-label">
                                        Grand Total
                                    </span>

                                    <strong className="pvd-summary-value">
                                        {currencyFormatter.format(
                                            Number(
                                                purchase
                                                    .grand_total,
                                            ),
                                        )}
                                    </strong>
                                </article>

                                <article className="pvd-summary-card blue">
                                    <span className="pvd-summary-label">
                                        Subtotal
                                    </span>

                                    <strong className="pvd-summary-value">
                                        {currencyFormatter.format(
                                            Number(
                                                purchase
                                                    .subtotal,
                                            ),
                                        )}
                                    </strong>
                                </article>

                                <article className="pvd-summary-card">
                                    <span className="pvd-summary-label">
                                        Item Discounts
                                    </span>

                                    <strong className="pvd-summary-value">
                                        {currencyFormatter.format(
                                            Number(
                                                purchase
                                                    .item_discount_total,
                                            ),
                                        )}
                                    </strong>
                                </article>

                                <article className="pvd-summary-card amber">
                                    <span className="pvd-summary-label">
                                        Purchase Discount
                                    </span>

                                    <strong className="pvd-summary-value">
                                        {currencyFormatter.format(
                                            Number(
                                                purchase
                                                    .discount,
                                            ),
                                        )}
                                    </strong>
                                </article>

                                <article className="pvd-summary-card">
                                    <span className="pvd-summary-label">
                                        Additional Cost
                                    </span>

                                    <strong className="pvd-summary-value">
                                        {currencyFormatter.format(
                                            Number(
                                                purchase
                                                    .additional_cost,
                                            ),
                                        )}
                                    </strong>
                                </article>
                            </section>

                            <section className="pvd-section">
                                <header className="pvd-section-head">
                                    <div className="pvd-section-head-main">
                                        <Icon name="receipt" />

                                        <h3 className="pvd-section-title">
                                            Purchase Information
                                        </h3>
                                    </div>
                                </header>

                                <div className="pvd-detail-grid">
                                    <div className="pvd-detail-item">
                                        <span className="pvd-detail-label">
                                            Purchase Number
                                        </span>

                                        <strong className="pvd-detail-value">
                                            {
                                                purchase
                                                    .purchase_number
                                            }
                                        </strong>
                                    </div>

                                    <div className="pvd-detail-item">
                                        <span className="pvd-detail-label">
                                            Supplier Invoice
                                        </span>

                                        <strong className="pvd-detail-value">
                                            {purchase
                                                .supplier_invoice_number
                                                ?? 'Not provided'}
                                        </strong>
                                    </div>

                                    <div className="pvd-detail-item">
                                        <span className="pvd-detail-label">
                                            Purchase Date
                                        </span>

                                        <strong className="pvd-detail-value">
                                            {formatDate(
                                                purchase
                                                    .purchase_date,
                                            )}
                                        </strong>
                                    </div>

                                    <div className="pvd-detail-item">
                                        <span className="pvd-detail-label">
                                            Status
                                        </span>

                                        <strong className="pvd-detail-value">
                                            {getStatusLabel(
                                                purchase
                                                    .status,
                                            )}
                                        </strong>
                                    </div>

                                    <div className="pvd-detail-item">
                                        <span className="pvd-detail-label">
                                            Items
                                        </span>

                                        <strong className="pvd-detail-value">
                                            {
                                                purchase
                                                    .items_count
                                            }
                                        </strong>
                                    </div>

                                    <div className="pvd-detail-item">
                                        <span className="pvd-detail-label">
                                            Total Quantity
                                        </span>

                                        <strong className="pvd-detail-value">
                                            {formatQuantity(
                                                purchase
                                                    .total_quantity,
                                            )}
                                        </strong>
                                    </div>

                                    <div className="pvd-detail-item">
                                        <span className="pvd-detail-label">
                                            Created At
                                        </span>

                                        <strong className="pvd-detail-value">
                                            {formatDateTime(
                                                purchase
                                                    .created_at,
                                            )}
                                        </strong>
                                    </div>

                                    <div className="pvd-detail-item">
                                        <span className="pvd-detail-label">
                                            Last Updated
                                        </span>

                                        <strong className="pvd-detail-value">
                                            {formatDateTime(
                                                purchase
                                                    .updated_at,
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            </section>

                            <section className="pvd-section">
                                <header className="pvd-section-head">
                                    <div className="pvd-section-head-main">
                                        <Icon name="supplier" />

                                        <h3 className="pvd-section-title">
                                            Supplier &amp; Receiving
                                        </h3>
                                    </div>
                                </header>

                                <div className="pvd-detail-grid">
                                    <div className="pvd-detail-item">
                                        <span className="pvd-detail-label">
                                            Supplier
                                        </span>

                                        <strong className="pvd-detail-value">
                                            {
                                                purchase
                                                    .supplier
                                                    ?.name
                                                ?? 'Supplier not available'
                                            }
                                        </strong>
                                    </div>

                                    <div className="pvd-detail-item">
                                        <span className="pvd-detail-label">
                                            Supplier Phone
                                        </span>

                                        <strong className="pvd-detail-value">
                                            {purchase
                                                .supplier
                                                ?.phone
                                                || 'Not provided'}
                                        </strong>
                                    </div>

                                    <div className="pvd-detail-item">
                                        <span className="pvd-detail-label">
                                            Created By
                                        </span>

                                        <strong className="pvd-detail-value">
                                            {
                                                purchase
                                                    .created_by
                                                    ?.name
                                                ?? 'Not available'
                                            }
                                        </strong>
                                    </div>

                                    <div className="pvd-detail-item">
                                        <span className="pvd-detail-label">
                                            Received By
                                        </span>

                                        <strong className="pvd-detail-value">
                                            {purchase
                                                .received_by
                                                ?.name
                                                ?? 'Not received'}
                                        </strong>
                                    </div>

                                    <div className="pvd-detail-item">
                                        <span className="pvd-detail-label">
                                            Received At
                                        </span>

                                        <strong className="pvd-detail-value">
                                            {formatDateTime(
                                                purchase
                                                    .received_at,
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            </section>

                            <section className="pvd-section">
                                <header className="pvd-section-head">
                                    <div className="pvd-section-head-main">
                                        <Icon name="package" />

                                        <h3 className="pvd-section-title">
                                            Purchased Items
                                        </h3>
                                    </div>

                                    <span className="pvd-count">
                                        {
                                            items.length
                                        }

                                        {' '}

                                        {items.length === 1
                                            ? 'Item'
                                            : 'Items'}
                                    </span>
                                </header>

                                {items.length === 0 ? (
                                    <div className="pvd-state">
                                        <Icon name="package" />

                                        <strong>
                                            No Purchase Items
                                        </strong>

                                        <span>
                                            No item details were returned for this purchase.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="pvd-items">
                                        {items.map(
                                            (
                                                item,
                                                index,
                                            ) => {
                                                const productOption =
                                                    resolveProduct(
                                                        item
                                                            .product_id,
                                                    );

                                                const productName =
                                                    item
                                                        .product
                                                        ?.name
                                                    ?? productOption
                                                        ?.name
                                                    ?? `Product #${item.product_id}`;

                                                const variantName =
                                                    resolveVariantName(
                                                        item
                                                            .product_id,
                                                        item
                                                            .product_variant_id,
                                                    );

                                                const purchaseUnit =
                                                    productOption
                                                        ?.unit
                                                    ?? item
                                                        .product
                                                        ?.unit
                                                    ?? 'Unit';

                                                const stockBatch =
                                                    item
                                                        .stock_batch;

                                                const stockUnit =
                                                    stockBatch
                                                        ?.stock_unit
                                                    || stockBatch
                                                        ?.secondary_unit
                                                    || purchaseUnit;

                                                return (
                                                    <article
                                                        key={
                                                            item.id
                                                        }
                                                        className="pvd-item-card"
                                                    >
                                                        <header className="pvd-item-header">
                                                            <div className="pvd-item-title-wrap">
                                                                <span className="pvd-item-kicker">
                                                                    Item {index + 1}
                                                                </span>

                                                                <strong
                                                                    className="pvd-item-title"
                                                                    title={
                                                                        productName
                                                                    }
                                                                >
                                                                    {
                                                                        productName
                                                                    }
                                                                </strong>

                                                                <span className="pvd-item-variant">
                                                                    Variant:
                                                                    {' '}

                                                                    {
                                                                        variantName
                                                                    }
                                                                </span>
                                                            </div>

                                                            <strong className="pvd-item-total">
                                                                {currencyFormatter.format(
                                                                    Number(
                                                                        item
                                                                            .line_total,
                                                                    ),
                                                                )}
                                                            </strong>
                                                        </header>

                                                        <div className="pvd-item-grid">
                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Product ID
                                                                </span>

                                                                <strong>
                                                                    #{item.product_id}
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Variant ID
                                                                </span>

                                                                <strong>
                                                                    {item
                                                                        .product_variant_id
                                                                        ? `#${item.product_variant_id}`
                                                                        : 'Standard'}
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Purchased Quantity
                                                                </span>

                                                                <strong>
                                                                    {formatQuantity(
                                                                        item
                                                                            .quantity,
                                                                    )}

                                                                    {' '}

                                                                    {
                                                                        purchaseUnit
                                                                    }
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Received Quantity
                                                                </span>

                                                                <strong>
                                                                    {formatQuantity(
                                                                        item
                                                                            .received_quantity,
                                                                    )}

                                                                    {' '}

                                                                    {
                                                                        purchaseUnit
                                                                    }
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Purchase Cost
                                                                </span>

                                                                <strong className="money">
                                                                    {currencyFormatter.format(
                                                                        Number(
                                                                            item
                                                                                .unit_cost,
                                                                        ),
                                                                    )}

                                                                    {' / '}

                                                                    {
                                                                        purchaseUnit
                                                                    }
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Selling Price
                                                                </span>

                                                                <strong className="sale">
                                                                    {currencyFormatter.format(
                                                                        Number(
                                                                            item
                                                                                .selling_price,
                                                                        ),
                                                                    )}

                                                                    {' / '}

                                                                    {
                                                                        purchaseUnit
                                                                    }
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Item Discount
                                                                </span>

                                                                <strong>
                                                                    {currencyFormatter.format(
                                                                        Number(
                                                                            item
                                                                                .discount,
                                                                        ),
                                                                    )}
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Line Total
                                                                </span>

                                                                <strong className="sale">
                                                                    {currencyFormatter.format(
                                                                        Number(
                                                                            item
                                                                                .line_total,
                                                                        ),
                                                                    )}
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Batch Number
                                                                </span>

                                                                <strong>
                                                                    {item
                                                                        .batch_number
                                                                        || stockBatch
                                                                            ?.batch_number
                                                                        || 'Not provided'}
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Manufactured Date
                                                                </span>

                                                                <strong>
                                                                    {formatDate(
                                                                        item
                                                                            .manufactured_date,
                                                                    )}
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Expiry Date
                                                                </span>

                                                                <strong>
                                                                    {formatDate(
                                                                        item
                                                                            .expiry_date,
                                                                    )}
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Dual Unit
                                                                </span>

                                                                <strong>
                                                                    {item
                                                                        .is_dual_unit
                                                                        ? 'Yes'
                                                                        : 'No'}
                                                                </strong>
                                                            </div>

                                                            {item
                                                                .is_dual_unit && (
                                                                    <>
                                                                        <div className="pvd-item-field">
                                                                            <span>
                                                                                Loose Unit
                                                                            </span>

                                                                            <strong>
                                                                                {item
                                                                                    .secondary_unit
                                                                                    ?? 'Kg'}
                                                                            </strong>
                                                                        </div>

                                                                        <div className="pvd-item-field">
                                                                            <span>
                                                                                Conversion
                                                                            </span>

                                                                            <strong>
                                                                                1
                                                                                {' '}

                                                                                {
                                                                                    purchaseUnit
                                                                                }

                                                                                {' = '}

                                                                                {formatQuantity(
                                                                                    item
                                                                                        .conversion_factor,
                                                                                )}

                                                                                {' '}

                                                                                {item
                                                                                    .secondary_unit
                                                                                    ?? 'Kg'}
                                                                            </strong>
                                                                        </div>

                                                                        <div className="pvd-item-field">
                                                                            <span>
                                                                                Loose Selling Price
                                                                            </span>

                                                                            <strong className="sale">
                                                                                {item
                                                                                    .secondary_selling_price
                                                                                    !== null
                                                                                    ? currencyFormatter.format(
                                                                                        Number(
                                                                                            item
                                                                                                .secondary_selling_price,
                                                                                        ),
                                                                                    )
                                                                                    : 'Not provided'}

                                                                                {' / '}

                                                                                {item
                                                                                    .secondary_unit
                                                                                    ?? 'Kg'}
                                                                            </strong>
                                                                        </div>

                                                                        <div className="pvd-item-field">
                                                                            <span>
                                                                                Base Unit Cost
                                                                            </span>

                                                                            <strong className="money">
                                                                                {currencyFormatter.format(
                                                                                    Number(
                                                                                        item
                                                                                            .base_unit_cost,
                                                                                    ),
                                                                                )}

                                                                                {' / '}

                                                                                {item
                                                                                    .secondary_unit
                                                                                    ?? stockUnit}
                                                                            </strong>
                                                                        </div>
                                                                    </>
                                                                )}

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Total Physical Stock
                                                                </span>

                                                                <strong>
                                                                    {formatQuantity(
                                                                        item
                                                                            .total_stock_quantity,
                                                                    )}

                                                                    {' '}

                                                                    {
                                                                        stockUnit
                                                                    }
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Received Physical Stock
                                                                </span>

                                                                <strong>
                                                                    {formatQuantity(
                                                                        item
                                                                            .received_stock_quantity,
                                                                    )}

                                                                    {' '}

                                                                    {
                                                                        stockUnit
                                                                    }
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Current Available Stock
                                                                </span>

                                                                <strong className="sale">
                                                                    {stockBatch
                                                                        ? `${formatQuantity(
                                                                            stockBatch
                                                                                .available_quantity,
                                                                        )} ${stockUnit}`
                                                                        : 'No stock batch'}
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Stock Batch Code
                                                                </span>

                                                                <strong>
                                                                    {stockBatch
                                                                        ?.batch_code
                                                                        ?? 'Not available'}
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field">
                                                                <span>
                                                                    Stock Received At
                                                                </span>

                                                                <strong>
                                                                    {formatDateTime(
                                                                        stockBatch
                                                                            ?.received_at,
                                                                    )}
                                                                </strong>
                                                            </div>

                                                            <div className="pvd-item-field wide">
                                                                <span>
                                                                    Item Notes
                                                                </span>

                                                                <strong>
                                                                    {item
                                                                        .notes
                                                                        || 'No item notes'}
                                                                </strong>
                                                            </div>
                                                        </div>
                                                    </article>
                                                );
                                            },
                                        )}
                                    </div>
                                )}
                            </section>

                            <section className="pvd-section">
                                <header className="pvd-section-head">
                                    <div className="pvd-section-head-main">
                                        <Icon name="receipt" />

                                        <h3 className="pvd-section-title">
                                            Purchase Notes
                                        </h3>
                                    </div>
                                </header>

                                <div className="pvd-notes">
                                    {purchase.notes
                                        || 'No notes were added to this purchase.'}
                                </div>
                            </section>
                        </>
                    ) : null}
                </div>

                <footer className="pvd-footer">
                    <button
                        type="button"
                        className="pvd-footer-button"
                        onClick={
                            onClose
                        }
                    >
                        Close
                    </button>
                </footer>
            </section>
        </div>,
        document.body,
    );
}

export default function PurchasesPage() {
    const {
        token,
    } = useAuth();

    /*
     * AppLayout normally owns the main vertical scrollbar.
     *
     * This page intentionally uses a different layout:
     * - App top bar stays fixed
     * - Purchase Management header stays fixed
     * - Filters stay fixed
     * - Pagination stays fixed
     * - ONLY the purchase records list scrolls
     *
     * The class is removed automatically when leaving this page.
     */
    useEffect(
        () => {
            const shellContent =
                document.querySelector<HTMLElement>(
                    '#sapo-app-shell .sapo-shell-content',
                );

            if (!shellContent) {
                return;
            }

            const previousScrollTop =
                shellContent.scrollTop;

            shellContent.classList.add(
                'purchases-page-scroll-lock',
            );

            shellContent.scrollTop = 0;

            return () => {
                shellContent.classList.remove(
                    'purchases-page-scroll-lock',
                );

                shellContent.scrollTop =
                    previousScrollTop;
            };
        },
        [],
    );

    const searchInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const purchaseRequestIdRef =
        useRef(0);

    const viewRequestIdRef =
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
    ] = useState(
        initialPagination,
    );

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
    ] = useState<
        Purchase | null
    >(null);

    const [
        formValues,
        setFormValues,
    ] = useState<
        PurchaseFormValues
    >(
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
    ] = useState<
        ValidationErrors
    >({});

    const [
        receivingPurchase,
        setReceivingPurchase,
    ] = useState<
        Purchase | null
    >(null);

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
    ] = useState<
        Purchase | null
    >(null);

    const [
        isDeleting,
        setIsDeleting,
    ] = useState(false);

    const [
        deleteError,
        setDeleteError,
    ] = useState('');

    const [
        viewTarget,
        setViewTarget,
    ] = useState<
        Purchase | null
    >(null);

    const [
        viewingPurchase,
        setViewingPurchase,
    ] = useState<
        Purchase | null
    >(null);

    const [
        isViewingPurchase,
        setIsViewingPurchase,
    ] = useState(false);

    const [
        viewPurchaseError,
        setViewPurchaseError,
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
                    ] =
                        await Promise.all([
                            getSupplierOptions(
                                token,
                            ),

                            getPurchaseProducts(
                                token,
                            ),
                        ]);

                    setSuppliers(
                        supplierResponse.data,
                    );

                    setProducts(
                        productResponse.data,
                    );
                } catch (error) {
                    setPageError(
                        error
                            instanceof ApiError
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
                    setIsLoading(
                        false,
                    );

                    return;
                }

                const requestId =
                    purchaseRequestIdRef
                        .current
                    + 1;

                purchaseRequestIdRef
                    .current =
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
                        purchaseRequestIdRef
                            .current
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
                        purchaseRequestIdRef
                            .current
                        !== requestId
                    ) {
                        return;
                    }

                    setPurchases([]);

                    setPageError(
                        error
                            instanceof ApiError
                            ? error.message
                            : 'Unable to load purchases.',
                    );
                } finally {
                    if (
                        purchaseRequestIdRef
                            .current
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
                supplierFilter,
                statusFilter,
            ],
        );

    useEffect(() => {
        void loadOptions();
    }, [
        loadOptions,
    ]);

    useEffect(() => {
        void loadPurchases();
    }, [
        loadPurchases,
    ]);

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
    }, [
        searchInput,
    ]);

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeout =
            window.setTimeout(
                () => {
                    setSuccessMessage(
                        '',
                    );
                },
                3500,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [
        successMessage,
    ]);

    const openCreateForm =
        (): void => {
            setEditingPurchase(
                null,
            );

            setFormValues(
                createEmptyForm(),
            );

            setFormError('');

            setFieldErrors({});

            setIsFormOpen(
                true,
            );
        };

    const closePurchaseForm =
        (): void => {
            if (isSubmitting) {
                return;
            }

            setIsFormOpen(
                false,
            );

            setEditingPurchase(
                null,
            );

            setFormError('');

            setFieldErrors({});
        };

    const loadPurchaseForView =
        async (
            purchase: Purchase,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            const requestId =
                viewRequestIdRef
                    .current
                + 1;

            viewRequestIdRef
                .current =
                requestId;

            setIsViewingPurchase(
                true,
            );

            setViewPurchaseError(
                '',
            );

            try {
                const response =
                    await getPurchase(
                        token,
                        purchase.id,
                    );

                if (
                    viewRequestIdRef
                        .current
                    !== requestId
                ) {
                    return;
                }

                setViewingPurchase(
                    response.data,
                );
            } catch (error) {
                if (
                    viewRequestIdRef
                        .current
                    !== requestId
                ) {
                    return;
                }

                setViewingPurchase(
                    null,
                );

                setViewPurchaseError(
                    error
                        instanceof ApiError
                        ? error.message
                        : 'Unable to load the complete purchase details.',
                );
            } finally {
                if (
                    viewRequestIdRef
                        .current
                    === requestId
                ) {
                    setIsViewingPurchase(
                        false,
                    );
                }
            }
        };

    const openViewPurchase =
        (
            purchase: Purchase,
        ): void => {
            setViewTarget(
                purchase,
            );

            setViewingPurchase(
                null,
            );

            setViewPurchaseError(
                '',
            );

            void loadPurchaseForView(
                purchase,
            );
        };

    const closeViewPurchase =
        (): void => {
            /*
             * Invalidate any in-flight View request so an older
             * response cannot overwrite a newer modal state.
             */
            viewRequestIdRef
                .current += 1;

            setViewTarget(
                null,
            );

            setViewingPurchase(
                null,
            );

            setViewPurchaseError(
                '',
            );

            setIsViewingPurchase(
                false,
            );
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

                const details =
                    response.data;

                setEditingPurchase(
                    details,
                );

                setFormValues({
                    supplier_id:
                        String(
                            details
                                .supplier
                                .id,
                        ),

                    supplier_invoice_number:
                        details
                            .supplier_invoice_number
                        ?? '',

                    purchase_date:
                        details
                            .purchase_date,

                    discount:
                        String(
                            details
                                .discount,
                        ),

                    additional_cost:
                        String(
                            details
                                .additional_cost,
                        ),

                    notes:
                        details.notes
                        ?? '',

                    receive_now:
                        false,

                    items:
                        details
                            .items
                            ?.map(
                                (
                                    item,
                                ) => ({
                                    row_id:
                                        createRowId(),

                                    product_id:
                                        String(
                                            item
                                                .product_id,
                                        ),

                                    product_variant_id:
                                        item
                                            .product_variant_id
                                            !== null
                                            && item
                                                .product_variant_id
                                            !== undefined
                                            ? String(
                                                item
                                                    .product_variant_id,
                                            )
                                            : '',

                                    quantity:
                                        String(
                                            item
                                                .quantity,
                                        ),

                                    unit_cost:
                                        String(
                                            item
                                                .unit_cost,
                                        ),

                                    selling_price:
                                        String(
                                            item
                                                .selling_price,
                                        ),

                                    is_dual_unit:
                                        item
                                            .is_dual_unit
                                            ? '1'
                                            : '0',

                                    secondary_unit:
                                        item
                                            .secondary_unit
                                        ?? (
                                            item
                                                .is_dual_unit
                                                ? 'Kg'
                                                : 'Kg'
                                        ),

                                    conversion_factor:
                                        item
                                            .is_dual_unit
                                            ? String(
                                                item
                                                    .conversion_factor
                                                ?? '',
                                            )
                                            : '',

                                    secondary_selling_price:
                                        item
                                            .secondary_selling_price
                                            !== null
                                            && item
                                                .secondary_selling_price
                                            !== undefined
                                            ? String(
                                                item
                                                    .secondary_selling_price,
                                            )
                                            : '',

                                    discount:
                                        String(
                                            item
                                                .discount,
                                        ),

                                    batch_number:
                                        item
                                            .batch_number
                                        ?? '',

                                    manufactured_date:
                                        item
                                            .manufactured_date
                                        ?? '',

                                    expiry_date:
                                        item
                                            .expiry_date
                                        ?? '',

                                    notes:
                                        item.notes
                                        ?? '',
                                }),
                            )
                        ?? [
                            createEmptyItem(),
                        ],
                });

                setFormError('');

                setFieldErrors({});

                setIsFormOpen(
                    true,
                );
            } catch (error) {
                setPageError(
                    error
                        instanceof ApiError
                        ? error.message
                        : 'Unable to load the purchase details.',
                );
            }
        };

    const handleHeaderChange = (
        field:
            keyof Omit<
                PurchaseFormValues,
                'items'
            >,
        value:
            string
            | boolean,
    ): void => {
        setFormValues(
            (current) => ({
                ...current,

                [field]:
                    value,
            }),
        );

        setFieldErrors(
            (current) => ({
                ...current,

                [field]:
                    undefined,
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

                items:
                    current
                        .items
                        .map(
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
            }),
        );

        setFieldErrors(
            (current) => ({
                ...current,

                [
                    `items.${index}.${field}`
                ]:
                    undefined,
            }),
        );

        setFormError('');
    };

    const validatePurchase =
        (): boolean => {
            const errors:
                ValidationErrors = {};

            if (
                !formValues
                    .supplier_id
            ) {
                errors.supplier_id = [
                    'Please select a supplier.',
                ];
            }

            if (
                !formValues
                    .purchase_date
            ) {
                errors.purchase_date = [
                    'Please select a purchase date.',
                ];
            }

            if (
                !isNonNegativeNumber(
                    formValues
                        .discount,
                )
            ) {
                errors.discount = [
                    'Purchase discount must be zero or greater.',
                ];
            }

            if (
                !isNonNegativeNumber(
                    formValues
                        .additional_cost,
                )
            ) {
                errors.additional_cost = [
                    'Additional cost must be zero or greater.',
                ];
            }

            if (
                formValues
                    .items
                    .length
                === 0
            ) {
                errors.items = [
                    'Add at least one product.',
                ];
            }

            formValues
                .items
                .forEach(
                    (
                        item,
                        index,
                    ) => {
                        const selectedProduct =
                            products.find(
                                (
                                    product,
                                ) =>
                                    String(
                                        product.id,
                                    )
                                    === item
                                        .product_id,
                            );

                        if (
                            !item
                                .product_id
                        ) {
                            errors[
                                `items.${index}.product_id`
                            ] = [
                                    `Select a product for item ${index + 1}.`,
                                ];
                        }

                        const activeVariants =
                            selectedProduct
                                ?.variants
                                ?.filter(
                                    (
                                        variant,
                                    ) =>
                                        variant
                                            .is_active
                                        !== false,
                                )
                            ?? [];

                        const selectedProductHasVariants =
                            Boolean(
                                selectedProduct
                                    ?.has_variants,
                            )
                            || activeVariants
                                .length > 0;

                        if (
                            selectedProduct
                            && selectedProductHasVariants
                        ) {
                            if (
                                !item
                                    .product_variant_id
                            ) {
                                errors[
                                    `items.${index}.product_variant_id`
                                ] = [
                                        `Select a variant for ${selectedProduct.name}.`,
                                    ];
                            } else {
                                const selectedVariant =
                                    activeVariants
                                        .find(
                                            (
                                                variant,
                                            ) =>
                                                String(
                                                    variant.id,
                                                )
                                                === item
                                                    .product_variant_id,
                                        );

                                if (
                                    !selectedVariant
                                ) {
                                    errors[
                                        `items.${index}.product_variant_id`
                                    ] = [
                                            'The selected product variant is invalid or inactive.',
                                        ];
                                }
                            }
                        } else if (
                            selectedProduct
                            && item
                                .product_variant_id
                        ) {
                            errors[
                                `items.${index}.product_variant_id`
                            ] = [
                                    'This product does not use variants.',
                                ];
                        }

                        if (
                            !isPositiveNumber(
                                item.quantity,
                            )
                        ) {
                            errors[
                                `items.${index}.quantity`
                            ] = [
                                    'Quantity must be greater than zero.',
                                ];
                        }

                        if (
                            !isNonNegativeNumber(
                                item
                                    .unit_cost,
                            )
                        ) {
                            errors[
                                `items.${index}.unit_cost`
                            ] = [
                                    'Enter a valid purchase cost.',
                                ];
                        }

                        if (
                            !isPositiveNumber(
                                item
                                    .selling_price,
                            )
                        ) {
                            errors[
                                `items.${index}.selling_price`
                            ] = [
                                    'Selling price must be greater than zero.',
                                ];
                        }

                        if (
                            !isNonNegativeNumber(
                                item.discount,
                            )
                        ) {
                            errors[
                                `items.${index}.discount`
                            ] = [
                                    'Item discount must be zero or greater.',
                                ];
                        }

                        const quantity =
                            Number(
                                item
                                    .quantity
                                || 0,
                            );

                        const unitCost =
                            Number(
                                item
                                    .unit_cost
                                || 0,
                            );

                        const itemDiscount =
                            Number(
                                item
                                    .discount
                                || 0,
                            );

                        const lineSubtotal =
                            quantity
                            * unitCost;

                        if (
                            Number.isFinite(
                                lineSubtotal,
                            )
                            && itemDiscount
                            > lineSubtotal
                        ) {
                            errors[
                                `items.${index}.discount`
                            ] = [
                                    'Item discount cannot exceed the purchase value of this line.',
                                ];
                        }

                        if (
                            item
                                .manufactured_date
                            && item
                                .expiry_date
                            && item
                                .manufactured_date
                            > item
                                .expiry_date
                        ) {
                            errors[
                                `items.${index}.expiry_date`
                            ] = [
                                    'Expiry date must be after the manufactured date.',
                                ];
                        }

                        const dualUnit =
                            isDualUnitEnabled(
                                item
                                    .is_dual_unit,
                            );

                        if (
                            dualUnit
                        ) {
                            if (
                                selectedProductHasVariants
                            ) {
                                errors[
                                    `items.${index}.is_dual_unit`
                                ] = [
                                        'Variant products use independent stock pools and cannot use Bag-to-Kg dual-unit conversion in this purchase flow.',
                                    ];
                            }

                            if (
                                !selectedProduct
                            ) {
                                errors[
                                    `items.${index}.product_id`
                                ] = [
                                        'Select the Bag product before enabling loose Kg selling.',
                                    ];
                            } else if (
                                !isBagUnit(
                                    selectedProduct
                                        .unit,
                                )
                            ) {
                                errors[
                                    `items.${index}.is_dual_unit`
                                ] = [
                                        'Loose Kg selling is only available for products using Bag as the main unit.',
                                    ];
                            }

                            if (
                                !isPositiveNumber(
                                    item
                                        .conversion_factor,
                                )
                            ) {
                                errors[
                                    `items.${index}.conversion_factor`
                                ] = [
                                        'Enter the Kg weight contained in one Bag.',
                                    ];
                            }

                            if (
                                item
                                    .secondary_unit
                                    .trim()
                                    .toLowerCase()
                                !== 'kg'
                            ) {
                                errors[
                                    `items.${index}.secondary_unit`
                                ] = [
                                        'Loose selling unit must be Kg.',
                                    ];
                            }

                            if (
                                !isPositiveNumber(
                                    item
                                        .secondary_selling_price,
                                )
                            ) {
                                errors[
                                    `items.${index}.secondary_selling_price`
                                ] = [
                                        'Enter a selling price for 1 Kg.',
                                    ];
                            }
                        }
                    },
                );

            setFieldErrors(
                errors,
            );

            if (
                Object.keys(
                    errors,
                ).length
                > 0
            ) {
                setFormError(
                    'Please correct the highlighted purchase details before saving.',
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

            setIsSubmitting(
                true,
            );

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

                setIsFormOpen(
                    false,
                );

                setEditingPurchase(
                    null,
                );

                setFormValues(
                    createEmptyForm(),
                );

                await loadPurchases();
            } catch (error) {
                if (
                    error
                    instanceof ApiError
                ) {
                    setFormError(
                        error.message,
                    );

                    setFieldErrors(
                        error.errors
                        ?? {},
                    );
                } else {
                    setFormError(
                        'Unable to save the purchase.',
                    );
                }
            } finally {
                setIsSubmitting(
                    false,
                );
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

                const details =
                    response.data;

                setReceivingPurchase(
                    details,
                );

                setReceiveValues(
                    details
                        .items
                        ?.map(
                            (
                                item,
                            ) => ({
                                purchase_item_id:
                                    item.id,

                                received_quantity:
                                    String(
                                        Math.max(
                                            0,
                                            Number(
                                                (
                                                    item
                                                        .quantity
                                                    - item
                                                        .received_quantity
                                                )
                                                    .toFixed(
                                                        3,
                                                    ),
                                            ),
                                        ),
                                    ),

                                selling_price:
                                    String(
                                        item
                                            .selling_price,
                                    ),

                                batch_number:
                                    item
                                        .batch_number
                                    ?? '',

                                manufactured_date:
                                    item
                                        .manufactured_date
                                    ?? '',

                                expiry_date:
                                    item
                                        .expiry_date
                                    ?? '',
                            }),
                        )
                    ?? [],
                );

                setReceiveError('');
            } catch (error) {
                setPageError(
                    error
                        instanceof ApiError
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

            const invalidReceiveItem =
                receiveValues.find(
                    (
                        item,
                    ) =>
                        !Number.isFinite(
                            Number(
                                item
                                    .received_quantity,
                            ),
                        )
                        || Number(
                            item
                                .received_quantity,
                        )
                        <= 0,
                );

            if (
                invalidReceiveItem
            ) {
                setReceiveError(
                    'Every received quantity must be greater than zero.',
                );

                return;
            }

            setIsSubmitting(
                true,
            );

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

                setReceivingPurchase(
                    null,
                );

                setReceiveValues(
                    [],
                );

                await loadPurchases();
            } catch (error) {
                setReceiveError(
                    error
                        instanceof ApiError
                        ? error.message
                        : 'Unable to receive stock.',
                );
            } finally {
                setIsSubmitting(
                    false,
                );
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

            setIsDeleting(
                true,
            );

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

                setDeleteTarget(
                    null,
                );

                if (
                    purchases.length
                    === 1
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
                    error
                        instanceof ApiError
                        ? error.message
                        : 'Unable to delete purchase.',
                );
            } finally {
                setIsDeleting(
                    false,
                );
            }
        };

    const clearSearch =
        (): void => {
            setSearchInput('');

            setAppliedSearch('');

            setPage(1);

            searchInputRef
                .current
                ?.focus();
        };

    const clearFilters =
        (): void => {
            setSearchInput('');

            setAppliedSearch('');

            setSupplierFilter('');

            setStatusFilter('');

            setPage(1);

            searchInputRef
                .current
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
                        select exact product variants,
                        set batch selling prices and
                        receive stock. Bag products can
                        also be configured for full Bag
                        and loose Kg selling.
                    </p>
                </div>

                <div className="pur-header-actions">
                    <span className="pur-total-badge">
                        <Icon name="receipt" />

                        {pagination.total}
                        {' '}

                        {pagination.total
                            === 1
                            ? 'Purchase'
                            : 'Purchases'}
                    </span>

                    <button
                        type="button"
                        className="pur-button pur-primary-button"
                        disabled={
                            !canCreatePurchase
                        }
                        title={
                            canCreatePurchase
                                ? 'Create a new supplier purchase'
                                : 'Add at least one supplier and product first'
                        }
                        onClick={
                            openCreateForm
                        }
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
                            A purchase needs at least
                            one supplier and one product.
                            Add the missing records before
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
                            setSuccessMessage(
                                '',
                            );
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
                                onChange={(
                                    event,
                                ) => {
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
                                    className="pur-clear-search"
                                    aria-label="Clear purchase search"
                                    onClick={
                                        clearSearch
                                    }
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
                            value={
                                supplierFilter
                            }
                            onChange={(
                                event,
                            ) => {
                                setPage(1);

                                setSupplierFilter(
                                    event
                                        .target
                                        .value,
                                );
                            }}
                        >
                            <option value="">
                                All Suppliers
                            </option>

                            {suppliers.map(
                                (
                                    supplier,
                                ) => (
                                    <option
                                        key={
                                            supplier.id
                                        }
                                        value={
                                            supplier.id
                                        }
                                    >
                                        {
                                            supplier
                                                .name
                                        }
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
                            value={
                                statusFilter
                            }
                            onChange={(
                                event,
                            ) => {
                                setPage(1);

                                setStatusFilter(
                                    event
                                        .target
                                        .value,
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
                            onChange={(
                                event,
                            ) => {
                                setPage(1);

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

                    <button
                        type="button"
                        className="pur-button pur-secondary-button pur-clear-filters"
                        disabled={
                            !hasActiveFilters
                        }
                        onClick={
                            clearFilters
                        }
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
                            Retrieving supplier
                            purchase records and
                            stock intake status.
                        </span>
                    </div>
                ) : purchases.length
                    === 0 ? (
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
                                    onClick={
                                        openCreateForm
                                    }
                                >
                                    <Icon name="plus" />

                                    Add First Purchase
                                </button>
                            )}
                    </div>
                ) : (
                    <>
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
                                Purchase Details
                            </span>

                            <span>
                                Total and Status
                            </span>

                            <span>
                                Actions
                            </span>
                        </div>

                        <div className="pur-list">
                            {purchases.map(
                                (
                                    purchase,
                                ) => (
                                    <article
                                        key={
                                            purchase.id
                                        }
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

                                        <div className="pur-cell pur-purchase-detail-cell">
                                            <span className="pur-mobile-label">
                                                Purchase Details
                                            </span>

                                            <div className="pur-detail-box">
                                                <span>
                                                    Date
                                                </span>

                                                <strong>
                                                    <Icon name="calendar" />

                                                    {formatDate(
                                                        purchase
                                                            .purchase_date,
                                                    )}
                                                </strong>
                                            </div>

                                            <div className="pur-detail-box">
                                                <span>
                                                    Items / Quantity
                                                </span>

                                                <strong>
                                                    <Icon name="package" />

                                                    {
                                                        purchase
                                                            .items_count
                                                    }
                                                    {' '}

                                                    {purchase
                                                        .items_count
                                                        === 1
                                                        ? 'item'
                                                        : 'items'}

                                                    {' • '}

                                                    {formatQuantity(
                                                        purchase
                                                            .total_quantity,
                                                    )}
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="pur-cell pur-total-status-cell">
                                            <span className="pur-mobile-label">
                                                Total and Status
                                            </span>

                                            <strong className="pur-value strong">
                                                {currencyFormatter.format(
                                                    Number(
                                                        purchase
                                                            .grand_total,
                                                    ),
                                                )}
                                            </strong>

                                            <span
                                                className={
                                                    purchase
                                                        .status
                                                        === 'received'
                                                        ? 'pur-status received'
                                                        : 'pur-status draft'
                                                }
                                            >
                                                <Icon
                                                    name={
                                                        purchase
                                                            .status
                                                            === 'received'
                                                            ? 'check'
                                                            : 'receipt'
                                                    }
                                                />

                                                {getStatusLabel(
                                                    purchase
                                                        .status,
                                                )}
                                            </span>
                                        </div>

                                        <div className="pur-actions">
                                            <button
                                                type="button"
                                                className="pur-button pur-blue-button pur-action-button"
                                                onClick={() => {
                                                    openViewPurchase(
                                                        purchase,
                                                    );
                                                }}
                                            >
                                                <Icon name="eye" />

                                                View
                                            </button>

                                            {purchase
                                                .status
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
                    </>
                )}

                {!isLoading
                    && pagination.total
                    > 0 && (
                        <footer className="pur-pagination">
                            <p className="pur-pagination-info">
                                Showing
                                {' '}

                                <strong>
                                    {
                                        pagination
                                            .from
                                        ?? 0
                                    }
                                </strong>

                                {' '}
                                to
                                {' '}

                                <strong>
                                    {
                                        pagination
                                            .to
                                        ?? 0
                                    }
                                </strong>

                                {' '}
                                of
                                {' '}

                                <strong>
                                    {
                                        pagination
                                            .total
                                    }
                                </strong>

                                {' '}
                                purchases
                            </p>

                            <div className="pur-pagination-actions">
                                <button
                                    type="button"
                                    className="pur-button pur-secondary-button pur-page-button"
                                    disabled={
                                        pagination
                                            .current_page
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

                                    {
                                        pagination
                                            .current_page
                                    }

                                    {' '}
                                    of
                                    {' '}

                                    {
                                        pagination
                                            .last_page
                                    }
                                </span>

                                <button
                                    type="button"
                                    className="pur-button pur-secondary-button pur-page-button"
                                    disabled={
                                        pagination
                                            .current_page
                                        >= pagination
                                            .last_page
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

                                    <Icon name="chevron-right" />
                                </button>
                            </div>
                        </footer>
                    )}
            </section>

            <PurchaseDetailsModal
                target={
                    viewTarget
                }
                purchase={
                    viewingPurchase
                }
                products={
                    products
                }
                isLoading={
                    isViewingPurchase
                }
                errorMessage={
                    viewPurchaseError
                }
                onClose={
                    closeViewPurchase
                }
                onRetry={() => {
                    if (
                        viewTarget
                    ) {
                        void loadPurchaseForView(
                            viewTarget,
                        );
                    }
                }}
            />

            <PurchaseFormModal
                isOpen={
                    isFormOpen
                }
                isEditing={
                    editingPurchase
                    !== null
                }
                values={
                    formValues
                }
                suppliers={
                    suppliers
                }
                products={
                    products
                }
                isSubmitting={
                    isSubmitting
                }
                errorMessage={
                    formError
                }
                fieldErrors={
                    fieldErrors
                }
                onHeaderChange={
                    handleHeaderChange
                }
                onItemChange={
                    handleItemChange
                }
                onAddItem={() => {
                    setFormValues(
                        (
                            current,
                        ) => ({
                            ...current,

                            items: [
                                ...current
                                    .items,

                                createEmptyItem(),
                            ],
                        }),
                    );
                }}
                onRemoveItem={(
                    index,
                ) => {
                    setFormValues(
                        (
                            current,
                        ) => {
                            if (
                                current
                                    .items
                                    .length
                                <= 1
                            ) {
                                return current;
                            }

                            return {
                                ...current,

                                items:
                                    current
                                        .items
                                        .filter(
                                            (
                                                _,
                                                itemIndex,
                                            ) =>
                                                itemIndex
                                                !== index,
                                        ),
                            };
                        },
                    );
                }}
                onClose={
                    closePurchaseForm
                }
                onSubmit={(
                    event,
                ) => {
                    void submitPurchase(
                        event,
                    );
                }}
            />

            <ReceiveStockModal
                purchase={
                    receivingPurchase
                }
                values={
                    receiveValues
                }
                isSubmitting={
                    isSubmitting
                }
                errorMessage={
                    receiveError
                }
                onChange={(
                    index,
                    field,
                    value,
                ) => {
                    setReceiveValues(
                        (
                            current,
                        ) =>
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

                    setReceiveError(
                        '',
                    );
                }}
                onClose={() => {
                    if (
                        !isSubmitting
                    ) {
                        setReceivingPurchase(
                            null,
                        );

                        setReceiveValues(
                            [],
                        );

                        setReceiveError(
                            '',
                        );
                    }
                }}
                onSubmit={(
                    event,
                ) => {
                    void submitStockIntake(
                        event,
                    );
                }}
            />

            <DeletePurchaseModal
                purchase={
                    deleteTarget
                }
                isDeleting={
                    isDeleting
                }
                errorMessage={
                    deleteError
                }
                onCancel={() => {
                    if (
                        !isDeleting
                    ) {
                        setDeleteTarget(
                            null,
                        );

                        setDeleteError(
                            '',
                        );
                    }
                }}
                onConfirm={() => {
                    void confirmDelete();
                }}
            />
        </div>
    );
}