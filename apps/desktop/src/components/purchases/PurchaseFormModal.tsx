import {
    useEffect,
    useRef,
} from 'react';

import type {
    FormEvent,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import type {
    ValidationErrors,
} from '../../types/auth';

import type {
    PurchaseFormValues,
    PurchaseItemFormValues,
    PurchaseProductOption,
} from '../../types/purchase';

import type {
    SupplierOption,
} from '../../types/supplier';

interface PurchaseFormModalProps {
    isOpen: boolean;
    isEditing: boolean;
    values: PurchaseFormValues;
    suppliers: SupplierOption[];
    products: PurchaseProductOption[];
    isSubmitting: boolean;
    errorMessage: string;
    fieldErrors: ValidationErrors;

    onHeaderChange: (
        field: keyof Omit<
            PurchaseFormValues,
            'items'
        >,
        value: string | boolean,
    ) => void;

    onItemChange: (
        index: number,
        field: keyof PurchaseItemFormValues,
        value: string,
    ) => void;

    onAddItem: () => void;

    onRemoveItem: (
        index: number,
    ) => void;

    onClose: () => void;

    onSubmit: (
        event: FormEvent<HTMLFormElement>,
    ) => void;
}

/**
 * These fields are part of the new dual-unit
 * purchase workflow.
 *
 * The cast helper below allows this modal to compile
 * before types/purchase.ts is updated in the next step.
 */
type DualUnitItemField =
    | 'is_dual_unit'
    | 'conversion_factor'
    | 'secondary_unit'
    | 'secondary_selling_price';

type ExtendedPurchaseItem =
    PurchaseItemFormValues
    & Partial<
        Record<
            DualUnitItemField,
            string
        >
    >;

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

type IconName =
    | 'alert'
    | 'bag'
    | 'batch'
    | 'calendar'
    | 'check'
    | 'close'
    | 'info'
    | 'invoice'
    | 'kg'
    | 'money'
    | 'note'
    | 'package'
    | 'plus'
    | 'receipt'
    | 'save'
    | 'scale'
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

        case 'bag':
            return (
                <svg {...props}>
                    <path d="M8 7c0-3 1.5-5 4-5s4 2 4 5" />
                    <path d="M6 7h12l2 14H4Z" />
                    <path d="M9 12h6" />
                </svg>
            );

        case 'batch':
            return (
                <svg {...props}>
                    <path d="m12 2 9 5-9 5-9-5 9-5Z" />
                    <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
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

        case 'close':
            return (
                <svg {...props}>
                    <path d="m6 6 12 12M18 6 6 18" />
                </svg>
            );

        case 'info':
            return (
                <svg {...props}>
                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                    />

                    <path d="M12 11v5M12 8h.01" />
                </svg>
            );

        case 'invoice':
            return (
                <svg {...props}>
                    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
                    <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
            );

        case 'kg':
            return (
                <svg {...props}>
                    <path d="M5 4v16M5 12l7-8M5 12l7 8" />
                    <path d="M20 9a4 4 0 1 0 0 6" />
                    <path d="M20 9v11" />
                </svg>
            );

        case 'money':
            return (
                <svg {...props}>
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                    />

                    <circle
                        cx="12"
                        cy="12"
                        r="3"
                    />

                    <path d="M7 9H6a1 1 0 0 0-1 1v1M17 15h1a1 1 0 0 0 1-1v-1" />
                </svg>
            );

        case 'note':
            return (
                <svg {...props}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                    <path d="M14 2v6h6M8 13h8M8 17h6" />
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

        case 'save':
            return (
                <svg {...props}>
                    <path d="M5 3h11l3 3v15H5Z" />
                    <path d="M8 3v6h8V3M8 21v-7h8v7" />
                </svg>
            );

        case 'scale':
            return (
                <svg {...props}>
                    <path d="M12 3v18M5 7h14M7 7l-4 7h8ZM17 7l-4 7h8Z" />
                    <path d="M8 21h8" />
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

function numberValue(
    value:
        | string
        | number
        | null
        | undefined,
): number {
    const parsed =
        Number(
            value ?? 0,
        );

    return Number.isFinite(
        parsed,
    )
        ? parsed
        : 0;
}

function formatQuantity(
    value: number,
): string {
    return quantityFormatter.format(
        Number.isFinite(value)
            ? value
            : 0,
    );
}

function getExtendedItemValue(
    item: PurchaseItemFormValues,
    field: DualUnitItemField,
    fallback = '',
): string {
    const extendedItem =
        item as ExtendedPurchaseItem;

    const value =
        extendedItem[field];

    if (
        value === undefined
        || value === null
    ) {
        return fallback;
    }

    return String(value);
}

function isEnabledFlag(
    value: string,
): boolean {
    return (
        value === '1'
        || value === 'true'
        || value === 'yes'
    );
}

function isBagUnit(
    unit:
        | string
        | null
        | undefined,
): boolean {
    const normalised =
        String(unit ?? '')
            .trim()
            .toLowerCase();

    return (
        normalised === 'bag'
        || normalised === 'bags'
    );
}

const purchaseFormStyles = `
#purchase-form-modal,
#purchase-form-modal *,
#purchase-form-modal *::before,
#purchase-form-modal *::after {
    box-sizing: border-box !important;
}

#purchase-form-modal {
    --pfm-green-950: #052e16;
    --pfm-green-900: #14532d;
    --pfm-green-800: #166534;
    --pfm-green-700: #15803d;
    --pfm-green-100: #dcfce7;
    --pfm-green-50: #f0fdf4;

    --pfm-blue-800: #175cd3;
    --pfm-blue-100: #d1e9ff;
    --pfm-blue-50: #eff8ff;

    --pfm-amber-800: #b54708;
    --pfm-amber-100: #fedf89;
    --pfm-amber-50: #fffaeb;

    --pfm-red-800: #b42318;
    --pfm-red-100: #fecdca;
    --pfm-red-50: #fef3f2;

    --pfm-text: #101828;
    --pfm-text-2: #344054;
    --pfm-muted: #667085;
    --pfm-border: #d0d9d2;
    --pfm-border-strong: #aebdb2;
    --pfm-surface: #ffffff;
    --pfm-page: #f4f7f5;

    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;

    width: 100vw !important;
    height: 100dvh !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: hidden !important;

    color: var(--pfm-text) !important;

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

    isolation: isolate !important;
    -webkit-font-smoothing: antialiased !important;
}

#purchase-form-modal button,
#purchase-form-modal input,
#purchase-form-modal select,
#purchase-form-modal textarea {
    font: inherit !important;
    letter-spacing: normal !important;
    text-transform: none !important;
}

#purchase-form-modal h2,
#purchase-form-modal h3,
#purchase-form-modal h4,
#purchase-form-modal p {
    margin: 0 !important;
}

#purchase-form-modal .pfm-backdrop {
    position: absolute !important;
    inset: 0 !important;

    display: flex !important;
    align-items: center !important;
    justify-content: center !important;

    padding: 14px !important;

    overflow: auto !important;

    background: rgba(3, 18, 10, 0.76) !important;
    backdrop-filter: blur(4px) !important;
}

#purchase-form-modal .pfm-dialog {
    display: flex !important;

    width: min(1280px, 100%) !important;
    max-height: calc(100dvh - 28px) !important;

    min-width: 0 !important;
    min-height: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border: 1px solid var(--pfm-border) !important;
    border-radius: 18px !important;

    box-shadow:
        0 30px 90px
        rgba(0, 0, 0, 0.4) !important;
}

#purchase-form-modal .pfm-header {
    display: flex !important;

    min-height: 84px !important;
    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 18px !important;

    padding: 14px 18px !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--pfm-green-950),
            var(--pfm-green-700)
        ) !important;
}

#purchase-form-modal .pfm-header-main {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 12px !important;
}

#purchase-form-modal .pfm-header-icon {
    display: grid !important;

    width: 46px !important;
    height: 46px !important;
    min-width: 46px !important;

    place-items: center !important;

    color: var(--pfm-green-900) !important;
    background: #ffffff !important;

    border-radius: 12px !important;
}

#purchase-form-modal .pfm-header-icon svg {
    width: 23px !important;
    height: 23px !important;
}

#purchase-form-modal .pfm-kicker {
    display: block !important;

    margin-bottom: 2px !important;

    color: #bbf7d0 !important;

    font-size: 11px !important;
    font-weight: 800 !important;
    letter-spacing: 0.06em !important;

    text-transform: uppercase !important;
}

#purchase-form-modal .pfm-title {
    color: #ffffff !important;

    font-size: 23px !important;
    font-weight: 800 !important;
    line-height: 1.2 !important;
}

#purchase-form-modal .pfm-close {
    display: grid !important;

    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;

    place-items: center !important;

    padding: 0 !important;

    color: #ffffff !important;

    background:
        rgba(
            255,
            255,
            255,
            0.13
        ) !important;

    border:
        1px solid
        rgba(
            255,
            255,
            255,
            0.35
        ) !important;

    border-radius: 11px !important;

    cursor: pointer !important;
}

#purchase-form-modal .pfm-close:hover:not(:disabled) {
    background:
        rgba(
            255,
            255,
            255,
            0.24
        ) !important;
}

#purchase-form-modal .pfm-close svg {
    width: 20px !important;
    height: 20px !important;
}

#purchase-form-modal .pfm-form {
    display: flex !important;

    min-height: 0 !important;
    flex: 1 !important;

    flex-direction: column !important;

    overflow: hidden !important;
}

#purchase-form-modal .pfm-body {
    display: flex !important;

    min-height: 0 !important;
    flex: 1 !important;

    flex-direction: column !important;
    gap: 15px !important;

    padding: 16px !important;

    overflow-x: hidden !important;
    overflow-y: auto !important;

    background: var(--pfm-page) !important;

    scrollbar-width: thin !important;
    scrollbar-color: #9cad9f #eaf0eb !important;
}

#purchase-form-modal .pfm-intro {
    display: flex !important;

    align-items: flex-start !important;
    gap: 8px !important;

    padding: 12px 14px !important;

    color: #245134 !important;

    font-size: 13px !important;
    font-weight: 600 !important;

    background: var(--pfm-green-50) !important;

    border: 1px solid #b8dfc3 !important;
    border-radius: 11px !important;
}

#purchase-form-modal .pfm-intro svg {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;

    margin-top: 1px !important;
}

#purchase-form-modal .pfm-alert {
    display: flex !important;

    align-items: flex-start !important;
    gap: 9px !important;

    padding: 11px 13px !important;

    color: var(--pfm-red-800) !important;

    font-size: 13px !important;
    font-weight: 700 !important;

    background: var(--pfm-red-50) !important;

    border: 1px solid var(--pfm-red-100) !important;
    border-radius: 10px !important;
}

#purchase-form-modal .pfm-alert svg {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;

    margin-top: 1px !important;
}

#purchase-form-modal .pfm-section {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;
    gap: 13px !important;

    padding: 15px !important;

    background: #ffffff !important;

    border: 1px solid var(--pfm-border) !important;
    border-radius: 13px !important;
}

#purchase-form-modal .pfm-section-header {
    display: flex !important;

    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 14px !important;

    padding-bottom: 11px !important;

    border-bottom: 1px solid #e7ece8 !important;
}

#purchase-form-modal .pfm-section-heading {
    display: flex !important;

    min-width: 0 !important;

    align-items: flex-start !important;
    gap: 10px !important;
}

#purchase-form-modal .pfm-section-icon {
    display: grid !important;

    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;

    place-items: center !important;

    color: var(--pfm-green-900) !important;
    background: var(--pfm-green-50) !important;

    border: 1px solid #b8dfc3 !important;
    border-radius: 9px !important;
}

#purchase-form-modal .pfm-section-icon svg {
    width: 18px !important;
    height: 18px !important;
}

#purchase-form-modal .pfm-section-title {
    color: var(--pfm-text-2) !important;

    font-size: 16px !important;
    font-weight: 800 !important;
}

#purchase-form-modal .pfm-section-description {
    margin-top: 2px !important;

    color: var(--pfm-muted) !important;

    font-size: 12px !important;
}

#purchase-form-modal .pfm-header-grid {
    display: grid !important;

    grid-template-columns:
        minmax(230px, 1.25fr)
        minmax(165px, 0.7fr)
        minmax(210px, 1fr)
        minmax(160px, 0.7fr)
        minmax(160px, 0.7fr) !important;

    gap: 12px !important;
}

#purchase-form-modal .pfm-notes-field {
    grid-column: 1 / -1 !important;
}

#purchase-form-modal .pfm-workspace {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        295px !important;

    align-items: start !important;
    gap: 14px !important;
}

#purchase-form-modal .pfm-items-list {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;
    gap: 12px !important;
}

#purchase-form-modal .pfm-add-item {
    display: inline-flex !important;

    min-height: 40px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;

    padding: 7px 12px !important;

    color: var(--pfm-green-900) !important;

    font-size: 13px !important;
    font-weight: 800 !important;

    background: var(--pfm-green-50) !important;

    border: 1px solid #b8dfc3 !important;
    border-radius: 9px !important;

    cursor: pointer !important;
}

#purchase-form-modal .pfm-add-item svg {
    width: 16px !important;
    height: 16px !important;
}

#purchase-form-modal .pfm-item-card {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border: 1px solid var(--pfm-border) !important;
    border-radius: 12px !important;
}

#purchase-form-modal .pfm-item-header {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 11px 13px !important;

    background: #f8faf9 !important;

    border-bottom: 1px solid #e3e9e4 !important;
}

#purchase-form-modal .pfm-item-heading {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;
    gap: 9px !important;
}

#purchase-form-modal .pfm-item-number {
    display: inline-flex !important;

    min-height: 29px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 4px 9px !important;

    color: var(--pfm-green-900) !important;

    font-size: 11px !important;
    font-weight: 800 !important;

    background: var(--pfm-green-50) !important;

    border: 1px solid #b8dfc3 !important;
    border-radius: 999px !important;
}

#purchase-form-modal .pfm-item-product {
    overflow: hidden !important;

    color: var(--pfm-text-2) !important;

    font-size: 14px !important;
    font-weight: 750 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#purchase-form-modal .pfm-unit-badge {
    display: inline-flex !important;

    min-height: 27px !important;

    align-items: center !important;
    gap: 5px !important;

    padding: 3px 8px !important;

    color: var(--pfm-blue-800) !important;

    font-size: 10px !important;
    font-weight: 800 !important;

    background: var(--pfm-blue-50) !important;

    border: 1px solid var(--pfm-blue-100) !important;
    border-radius: 999px !important;
}

#purchase-form-modal .pfm-unit-badge svg {
    width: 13px !important;
    height: 13px !important;
}

#purchase-form-modal .pfm-item-header-actions {
    display: flex !important;

    align-items: center !important;
    gap: 9px !important;
}

#purchase-form-modal .pfm-line-total {
    color: var(--pfm-green-900) !important;

    font-size: 13px !important;
    font-weight: 800 !important;

    white-space: nowrap !important;
}

#purchase-form-modal .pfm-remove-item {
    display: inline-flex !important;

    min-height: 34px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;

    padding: 5px 9px !important;

    color: var(--pfm-red-800) !important;

    font-size: 11px !important;
    font-weight: 800 !important;

    background: var(--pfm-red-50) !important;

    border: 1px solid var(--pfm-red-100) !important;
    border-radius: 8px !important;

    cursor: pointer !important;
}

#purchase-form-modal .pfm-remove-item svg {
    width: 14px !important;
    height: 14px !important;
}

#purchase-form-modal .pfm-item-body {
    display: flex !important;

    flex-direction: column !important;
    gap: 13px !important;

    padding: 13px !important;
}

#purchase-form-modal .pfm-item-main-grid {
    display: grid !important;

    grid-template-columns:
        minmax(230px, 1.4fr)
        minmax(110px, 0.55fr)
        minmax(145px, 0.72fr)
        minmax(145px, 0.72fr)
        minmax(125px, 0.6fr) !important;

    gap: 11px !important;
}

#purchase-form-modal .pfm-dual-unit-card {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;
    gap: 12px !important;

    padding: 14px !important;

    background:
        linear-gradient(
            135deg,
            #f0fdf4,
            #eff8ff
        ) !important;

    border: 1px solid #9fd4ae !important;
    border-radius: 12px !important;
}

#purchase-form-modal .pfm-dual-header {
    display: flex !important;

    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 14px !important;
}

#purchase-form-modal .pfm-dual-heading {
    display: flex !important;

    min-width: 0 !important;

    align-items: flex-start !important;
    gap: 10px !important;
}

#purchase-form-modal .pfm-dual-icon {
    display: grid !important;

    width: 39px !important;
    height: 39px !important;
    min-width: 39px !important;

    place-items: center !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--pfm-green-900),
            var(--pfm-blue-800)
        ) !important;

    border-radius: 10px !important;
}

#purchase-form-modal .pfm-dual-icon svg {
    width: 20px !important;
    height: 20px !important;
}

#purchase-form-modal .pfm-dual-title {
    color: var(--pfm-green-900) !important;

    font-size: 15px !important;
    font-weight: 850 !important;
}

#purchase-form-modal .pfm-dual-description {
    margin-top: 3px !important;

    color: var(--pfm-text-2) !important;

    font-size: 11px !important;
    line-height: 1.45 !important;
}

#purchase-form-modal .pfm-switch-label {
    display: inline-flex !important;

    min-height: 42px !important;

    align-items: center !important;
    gap: 8px !important;

    padding: 7px 11px !important;

    color: var(--pfm-text-2) !important;

    font-size: 12px !important;
    font-weight: 800 !important;

    background: #ffffff !important;

    border: 1px solid #9fd4ae !important;
    border-radius: 10px !important;

    cursor: pointer !important;
}

#purchase-form-modal .pfm-switch-label input {
    width: 20px !important;
    height: 20px !important;

    margin: 0 !important;

    accent-color: var(--pfm-green-700) !important;
}

#purchase-form-modal .pfm-dual-disabled-message {
    display: flex !important;

    align-items: flex-start !important;
    gap: 8px !important;

    padding: 11px 12px !important;

    color: var(--pfm-muted) !important;

    font-size: 12px !important;

    background: rgba(255, 255, 255, 0.72) !important;

    border: 1px dashed #9fd4ae !important;
    border-radius: 10px !important;
}

#purchase-form-modal .pfm-dual-disabled-message svg {
    width: 17px !important;
    height: 17px !important;
    min-width: 17px !important;
}

#purchase-form-modal .pfm-dual-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            3,
            minmax(0, 1fr)
        ) !important;

    gap: 11px !important;
}

#purchase-form-modal .pfm-dual-note {
    display: flex !important;

    align-items: flex-start !important;
    gap: 8px !important;

    padding: 10px 12px !important;

    color: var(--pfm-blue-800) !important;

    font-size: 11px !important;
    font-weight: 650 !important;

    background: rgba(255, 255, 255, 0.78) !important;

    border: 1px solid var(--pfm-blue-100) !important;
    border-radius: 9px !important;
}

#purchase-form-modal .pfm-dual-note svg {
    width: 16px !important;
    height: 16px !important;
    min-width: 16px !important;

    margin-top: 1px !important;
}

#purchase-form-modal .pfm-preview-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            4,
            minmax(0, 1fr)
        ) !important;

    gap: 9px !important;
}

#purchase-form-modal .pfm-preview-box {
    display: flex !important;

    min-width: 0 !important;
    min-height: 76px !important;

    flex-direction: column !important;
    justify-content: center !important;
    gap: 3px !important;

    padding: 10px !important;

    background: #ffffff !important;

    border: 1px solid #c4ddcb !important;
    border-radius: 9px !important;
}

#purchase-form-modal .pfm-preview-box span {
    color: var(--pfm-muted) !important;

    font-size: 9px !important;
    font-weight: 800 !important;
    letter-spacing: 0.04em !important;

    text-transform: uppercase !important;
}

#purchase-form-modal .pfm-preview-box strong {
    overflow: hidden !important;

    color: var(--pfm-text-2) !important;

    font-size: 14px !important;
    font-weight: 850 !important;

    text-overflow: ellipsis !important;
}

#purchase-form-modal .pfm-preview-box.profit strong {
    color: var(--pfm-green-800) !important;
}

#purchase-form-modal .pfm-batch-heading {
    display: flex !important;

    align-items: center !important;
    gap: 7px !important;

    padding-top: 3px !important;

    color: var(--pfm-muted) !important;

    font-size: 10px !important;
    font-weight: 800 !important;
    letter-spacing: 0.04em !important;

    text-transform: uppercase !important;
}

#purchase-form-modal .pfm-batch-heading svg {
    width: 14px !important;
    height: 14px !important;
}

#purchase-form-modal .pfm-item-batch-grid {
    display: grid !important;

    grid-template-columns:
        minmax(160px, 0.8fr)
        minmax(150px, 0.7fr)
        minmax(150px, 0.7fr)
        minmax(200px, 1.1fr) !important;

    gap: 11px !important;
}

#purchase-form-modal .pfm-summary-column {
    position: sticky !important;
    top: 0 !important;

    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;
    gap: 12px !important;
}

#purchase-form-modal .pfm-summary-card,
#purchase-form-modal .pfm-receive-card {
    overflow: hidden !important;

    background: #ffffff !important;

    border: 1px solid var(--pfm-border) !important;
    border-radius: 12px !important;
}

#purchase-form-modal .pfm-summary-header {
    display: flex !important;

    align-items: center !important;
    gap: 8px !important;

    padding: 12px 13px !important;

    color: var(--pfm-text-2) !important;

    font-size: 14px !important;
    font-weight: 800 !important;

    background: #f8faf9 !important;

    border-bottom: 1px solid #e3e9e4 !important;
}

#purchase-form-modal .pfm-summary-header svg {
    width: 17px !important;
    height: 17px !important;

    color: var(--pfm-green-700) !important;
}

#purchase-form-modal .pfm-summary-lines {
    display: flex !important;
    flex-direction: column !important;
}

#purchase-form-modal .pfm-summary-line {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 10px 13px !important;

    color: var(--pfm-muted) !important;

    font-size: 12px !important;

    border-bottom: 1px solid #edf1ee !important;
}

#purchase-form-modal .pfm-summary-line strong {
    color: var(--pfm-text-2) !important;

    font-size: 12px !important;
    font-weight: 800 !important;

    text-align: right !important;
    white-space: nowrap !important;
}

#purchase-form-modal .pfm-summary-line.discount strong {
    color: var(--pfm-red-800) !important;
}

#purchase-form-modal .pfm-summary-line.total {
    padding: 14px 13px !important;

    color: var(--pfm-green-900) !important;

    font-size: 13px !important;
    font-weight: 800 !important;

    background: var(--pfm-green-50) !important;

    border-bottom: 0 !important;
}

#purchase-form-modal .pfm-summary-line.total strong {
    color: var(--pfm-green-900) !important;

    font-size: 18px !important;
    font-weight: 900 !important;
}

#purchase-form-modal .pfm-receive-option {
    display: flex !important;

    align-items: flex-start !important;
    gap: 10px !important;

    padding: 13px !important;

    cursor: pointer !important;
}

#purchase-form-modal .pfm-receive-option input {
    width: 20px !important;
    height: 20px !important;
    min-width: 20px !important;

    margin: 1px 0 0 !important;

    accent-color: var(--pfm-green-700) !important;
}

#purchase-form-modal .pfm-receive-title {
    display: flex !important;

    align-items: center !important;
    gap: 6px !important;

    color: var(--pfm-text-2) !important;

    font-size: 13px !important;
    font-weight: 800 !important;
}

#purchase-form-modal .pfm-receive-title svg {
    width: 16px !important;
    height: 16px !important;

    color: var(--pfm-green-700) !important;
}

#purchase-form-modal .pfm-receive-description {
    display: block !important;

    margin-top: 4px !important;

    color: var(--pfm-muted) !important;

    font-size: 11px !important;
    line-height: 1.5 !important;
}

#purchase-form-modal .pfm-field {
    display: grid !important;

    min-width: 0 !important;

    gap: 6px !important;
}

#purchase-form-modal .pfm-field-header {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
}

#purchase-form-modal .pfm-label {
    color: var(--pfm-text-2) !important;

    font-size: 12px !important;
    font-weight: 750 !important;
}

#purchase-form-modal .pfm-required {
    color: var(--pfm-red-800) !important;
}

#purchase-form-modal .pfm-optional {
    display: inline-flex !important;

    margin-left: 5px !important;
    padding: 2px 5px !important;

    color: var(--pfm-muted) !important;

    font-size: 8px !important;
    font-weight: 700 !important;

    background: #f2f4f7 !important;

    border-radius: 999px !important;
}

#purchase-form-modal .pfm-counter {
    color: var(--pfm-muted) !important;

    font-size: 9px !important;
}

#purchase-form-modal .pfm-control-wrap {
    position: relative !important;
}

#purchase-form-modal .pfm-control-icon {
    position: absolute !important;

    top: 50% !important;
    left: 11px !important;

    display: grid !important;

    width: 16px !important;
    height: 16px !important;

    place-items: center !important;

    color: var(--pfm-muted) !important;

    transform: translateY(-50%) !important;

    pointer-events: none !important;
}

#purchase-form-modal .pfm-control-icon.top {
    top: 12px !important;
    transform: none !important;
}

#purchase-form-modal .pfm-control-icon svg {
    width: 16px !important;
    height: 16px !important;
}

#purchase-form-modal .pfm-currency-prefix {
    position: absolute !important;

    top: 50% !important;
    left: 10px !important;

    color: var(--pfm-muted) !important;

    font-size: 9px !important;
    font-weight: 800 !important;

    transform: translateY(-50%) !important;

    pointer-events: none !important;
}

#purchase-form-modal .pfm-suffix {
    position: absolute !important;

    top: 50% !important;
    right: 10px !important;

    color: var(--pfm-muted) !important;

    font-size: 10px !important;
    font-weight: 800 !important;

    transform: translateY(-50%) !important;

    pointer-events: none !important;
}

#purchase-form-modal .pfm-input,
#purchase-form-modal .pfm-select,
#purchase-form-modal .pfm-textarea {
    display: block !important;

    width: 100% !important;
    min-width: 0 !important;

    color: var(--pfm-text) !important;

    font-size: 14px !important;
    font-weight: 550 !important;

    outline: none !important;

    background: #ffffff !important;

    border: 1px solid var(--pfm-border-strong) !important;
    border-radius: 9px !important;

    box-shadow: none !important;
}

#purchase-form-modal .pfm-input,
#purchase-form-modal .pfm-select {
    height: 44px !important;
    min-height: 44px !important;
}

#purchase-form-modal .pfm-input {
    padding: 0 11px !important;
}

#purchase-form-modal .pfm-select {
    padding: 0 10px !important;
    cursor: pointer !important;
}

#purchase-form-modal .pfm-input.with-icon,
#purchase-form-modal .pfm-select.with-icon {
    padding-left: 36px !important;
}

#purchase-form-modal .pfm-input.with-currency {
    padding-left: 41px !important;
}

#purchase-form-modal .pfm-input.with-suffix {
    padding-right: 43px !important;
}

#purchase-form-modal .pfm-textarea {
    min-height: 80px !important;

    padding: 10px 11px !important;

    line-height: 1.5 !important;

    resize: vertical !important;
}

#purchase-form-modal .pfm-textarea.with-icon {
    padding-left: 36px !important;
}

#purchase-form-modal .pfm-input.has-error,
#purchase-form-modal .pfm-select.has-error,
#purchase-form-modal .pfm-textarea.has-error {
    border-color: var(--pfm-red-800) !important;
}

#purchase-form-modal .pfm-input:focus,
#purchase-form-modal .pfm-select:focus,
#purchase-form-modal .pfm-textarea:focus,
#purchase-form-modal button:focus-visible {
    outline: none !important;

    border-color: var(--pfm-green-700) !important;

    box-shadow:
        0 0 0 4px
        rgba(21, 128, 61, 0.14) !important;
}

#purchase-form-modal .pfm-input:disabled,
#purchase-form-modal .pfm-select:disabled,
#purchase-form-modal .pfm-textarea:disabled {
    color: #667085 !important;
    background: #f2f4f7 !important;
    cursor: not-allowed !important;
}

#purchase-form-modal .pfm-field-error {
    color: var(--pfm-red-800) !important;

    font-size: 11px !important;
    font-weight: 650 !important;
}

#purchase-form-modal .pfm-field-error::before {
    content: "• " !important;
    font-weight: 900 !important;
}

#purchase-form-modal .pfm-help {
    display: flex !important;

    align-items: flex-start !important;
    gap: 5px !important;

    min-height: 15px !important;

    color: var(--pfm-muted) !important;

    font-size: 10px !important;
    line-height: 1.4 !important;
}

#purchase-form-modal .pfm-help svg {
    width: 13px !important;
    height: 13px !important;
    min-width: 13px !important;

    margin-top: 1px !important;
}

#purchase-form-modal .pfm-actions {
    display: flex !important;

    min-height: 72px !important;
    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 14px !important;

    padding: 12px 17px !important;

    background: #ffffff !important;

    border-top: 1px solid var(--pfm-border) !important;
}

#purchase-form-modal .pfm-action-note {
    display: flex !important;

    align-items: center !important;
    gap: 7px !important;

    color: var(--pfm-muted) !important;

    font-size: 11px !important;
}

#purchase-form-modal .pfm-action-note svg {
    width: 15px !important;
    height: 15px !important;
}

#purchase-form-modal .pfm-action-buttons {
    display: flex !important;
    align-items: center !important;
    gap: 9px !important;
}

#purchase-form-modal .pfm-button {
    display: inline-flex !important;

    min-height: 46px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;

    padding: 8px 15px !important;

    font-size: 14px !important;
    font-weight: 800 !important;

    border-radius: 10px !important;

    cursor: pointer !important;
}

#purchase-form-modal .pfm-button svg {
    width: 17px !important;
    height: 17px !important;
}

#purchase-form-modal .pfm-cancel {
    color: var(--pfm-text-2) !important;
    background: #ffffff !important;

    border: 1px solid var(--pfm-border-strong) !important;
}

#purchase-form-modal .pfm-submit {
    color: #ffffff !important;
    background: var(--pfm-green-700) !important;

    border: 1px solid var(--pfm-green-700) !important;

    box-shadow:
        0 5px 14px
        rgba(21, 128, 61, 0.2) !important;
}

#purchase-form-modal .pfm-submit:hover:not(:disabled) {
    background: var(--pfm-green-800) !important;
    border-color: var(--pfm-green-800) !important;
}

#purchase-form-modal button:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

#purchase-form-modal .pfm-spinner {
    width: 16px !important;
    height: 16px !important;

    border:
        2px solid
        rgba(255, 255, 255, 0.45) !important;

    border-top-color: #ffffff !important;
    border-radius: 50% !important;

    animation: pfm-spin 700ms linear infinite !important;
}

@keyframes pfm-spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 1120px) {
    #purchase-form-modal .pfm-header-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #purchase-form-modal .pfm-workspace {
        grid-template-columns: 1fr !important;
    }

    #purchase-form-modal .pfm-summary-column {
        position: static !important;

        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #purchase-form-modal .pfm-item-main-grid {
        grid-template-columns:
            minmax(230px, 1.2fr)
            repeat(
                2,
                minmax(130px, 0.7fr)
            ) !important;
    }

    #purchase-form-modal .pfm-preview-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }
}

@media (max-width: 760px) {
    #purchase-form-modal .pfm-backdrop {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    #purchase-form-modal .pfm-dialog {
        width: 100% !important;
        max-height: 97dvh !important;

        border-right: 0 !important;
        border-bottom: 0 !important;
        border-left: 0 !important;

        border-radius: 18px 18px 0 0 !important;
    }

    #purchase-form-modal .pfm-title {
        font-size: 20px !important;
    }

    #purchase-form-modal .pfm-body {
        padding: 12px !important;
    }

    #purchase-form-modal .pfm-header-grid,
    #purchase-form-modal .pfm-item-main-grid,
    #purchase-form-modal .pfm-dual-grid,
    #purchase-form-modal .pfm-preview-grid,
    #purchase-form-modal .pfm-item-batch-grid,
    #purchase-form-modal .pfm-summary-column {
        grid-template-columns: 1fr !important;
    }

    #purchase-form-modal .pfm-notes-field {
        grid-column: auto !important;
    }

    #purchase-form-modal .pfm-section-header,
    #purchase-form-modal .pfm-item-header,
    #purchase-form-modal .pfm-dual-header,
    #purchase-form-modal .pfm-actions {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #purchase-form-modal .pfm-add-item,
    #purchase-form-modal .pfm-remove-item,
    #purchase-form-modal .pfm-switch-label {
        width: 100% !important;
    }

    #purchase-form-modal .pfm-item-header-actions {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #purchase-form-modal .pfm-action-note {
        justify-content: center !important;
        text-align: center !important;
    }

    #purchase-form-modal .pfm-action-buttons {
        display: grid !important;

        width: 100% !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #purchase-form-modal .pfm-button {
        width: 100% !important;
    }
}

@media (max-width: 430px) {
    #purchase-form-modal .pfm-action-buttons {
        grid-template-columns: 1fr !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #purchase-form-modal *,
    #purchase-form-modal *::before,
    #purchase-form-modal *::after {
        transition: none !important;
        scroll-behavior: auto !important;
    }

    #purchase-form-modal .pfm-spinner {
        animation-duration: 1.2s !important;
    }
}
`;

export default function PurchaseFormModal({
    isOpen,
    isEditing,
    values,
    suppliers,
    products,
    isSubmitting,
    errorMessage,
    fieldErrors,
    onHeaderChange,
    onItemChange,
    onAddItem,
    onRemoveItem,
    onClose,
    onSubmit,
}: PurchaseFormModalProps) {
    const supplierInputRef =
        useRef<HTMLSelectElement | null>(
            null,
        );

    const onCloseRef =
        useRef(onClose);

    const isSubmittingRef =
        useRef(isSubmitting);

    useEffect(() => {
        onCloseRef.current =
            onClose;
    }, [onClose]);

    useEffect(() => {
        isSubmittingRef.current =
            isSubmitting;
    }, [isSubmitting]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow =
            document.body.style.overflow;

        const previouslyFocused =
            document.activeElement
                instanceof HTMLElement
                ? document.activeElement
                : null;

        document.body.style.overflow =
            'hidden';

        const focusTimer =
            window.setTimeout(
                () => {
                    supplierInputRef.current
                        ?.focus();
                },
                80,
            );

        const handleKeyDown = (
            event: KeyboardEvent,
        ): void => {
            if (
                event.key === 'Escape'
                && !isSubmittingRef.current
            ) {
                onCloseRef.current();
            }
        };

        window.addEventListener(
            'keydown',
            handleKeyDown,
        );

        return () => {
            window.clearTimeout(
                focusTimer,
            );

            document.body.style.overflow =
                previousOverflow;

            window.removeEventListener(
                'keydown',
                handleKeyDown,
            );

            previouslyFocused?.focus();
        };
    }, [isOpen]);

    if (
        !isOpen
        || typeof document === 'undefined'
    ) {
        return null;
    }

    const itemSubtotal =
        values.items.reduce(
            (
                total,
                item,
            ) =>
                total
                + (
                    numberValue(
                        item.quantity,
                    )
                    * numberValue(
                        item.unit_cost,
                    )
                ),
            0,
        );

    const itemDiscount =
        values.items.reduce(
            (
                total,
                item,
            ) =>
                total
                + numberValue(
                    item.discount,
                ),
            0,
        );

    const purchaseDiscount =
        numberValue(
            values.discount,
        );

    const additionalCost =
        numberValue(
            values.additional_cost,
        );

    const grandTotal =
        itemSubtotal
        - itemDiscount
        - purchaseDiscount
        + additionalCost;

    const getFieldError = (
        field: string,
    ): string | undefined =>
        fieldErrors[field]?.[0];

    /**
     * Allows the new dual-unit fields to pass
     * through the existing onItemChange callback.
     *
     * The parent state updater normally uses:
     * { ...item, [field]: value }
     */
    const changeExtendedItemField = (
        index: number,
        field: DualUnitItemField,
        value: string,
    ): void => {
        onItemChange(
            index,
            field as keyof PurchaseItemFormValues,
            value,
        );
    };

    const handleProductChange = (
        index: number,
        currentItem: PurchaseItemFormValues,
        productId: string,
    ): void => {
        onItemChange(
            index,
            'product_id',
            productId,
        );

        const nextProduct =
            products.find(
                (product) =>
                    String(product.id)
                    === productId,
            );

        if (
            !isBagUnit(
                nextProduct?.unit,
            )
        ) {
            changeExtendedItemField(
                index,
                'is_dual_unit',
                '0',
            );

            changeExtendedItemField(
                index,
                'conversion_factor',
                '',
            );

            changeExtendedItemField(
                index,
                'secondary_unit',
                '',
            );

            changeExtendedItemField(
                index,
                'secondary_selling_price',
                '',
            );

            return;
        }

        if (
            !getExtendedItemValue(
                currentItem,
                'secondary_unit',
            )
        ) {
            changeExtendedItemField(
                index,
                'secondary_unit',
                'Kg',
            );
        }
    };

    const handleDualUnitToggle = (
        index: number,
        item: PurchaseItemFormValues,
        enabled: boolean,
    ): void => {
        changeExtendedItemField(
            index,
            'is_dual_unit',
            enabled
                ? '1'
                : '0',
        );

        if (!enabled) {
            return;
        }

        if (
            !getExtendedItemValue(
                item,
                'secondary_unit',
            )
        ) {
            changeExtendedItemField(
                index,
                'secondary_unit',
                'Kg',
            );
        }

        if (
            !getExtendedItemValue(
                item,
                'conversion_factor',
            )
        ) {
            changeExtendedItemField(
                index,
                'conversion_factor',
                '50',
            );
        }
    };

    const supplierError =
        getFieldError(
            'supplier_id',
        );

    const purchaseDateError =
        getFieldError(
            'purchase_date',
        );

    return createPortal(
        <div id="purchase-form-modal">
            <style>
                {purchaseFormStyles}
            </style>

            <div
                className="pfm-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                    if (
                        event.target
                        === event.currentTarget
                        && !isSubmitting
                    ) {
                        onClose();
                    }
                }}
            >
                <section
                    className="pfm-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="purchase-form-title"
                    aria-describedby="purchase-form-description"
                >
                    <header className="pfm-header">
                        <div className="pfm-header-main">
                            <span className="pfm-header-icon">
                                <Icon name="receipt" />
                            </span>

                            <div>
                                <span className="pfm-kicker">
                                    Purchase Management
                                </span>

                                <h2
                                    id="purchase-form-title"
                                    className="pfm-title"
                                >
                                    {isEditing
                                        ? 'Edit Draft Purchase'
                                        : 'Add New Purchase'}
                                </h2>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="pfm-close"
                            aria-label="Close purchase form"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            <Icon name="close" />
                        </button>
                    </header>

                    <form
                        className="pfm-form"
                        noValidate
                        onSubmit={onSubmit}
                    >
                        <div className="pfm-body">
                            <p
                                id="purchase-form-description"
                                className="pfm-intro"
                            >
                                <Icon name="info" />

                                <span>
                                    Enter the supplier and purchased products.
                                    Products using the unit
                                    {' '}
                                    <strong>Bag</strong>
                                    {' '}
                                    can also be configured for loose Kg sales.
                                </span>
                            </p>

                            {errorMessage && (
                                <div
                                    className="pfm-alert"
                                    role="alert"
                                >
                                    <Icon name="alert" />

                                    <span>
                                        {errorMessage}
                                    </span>
                                </div>
                            )}

                            <section className="pfm-section">
                                <header className="pfm-section-header">
                                    <div className="pfm-section-heading">
                                        <span className="pfm-section-icon">
                                            <Icon name="supplier" />
                                        </span>

                                        <div>
                                            <h3 className="pfm-section-title">
                                                Purchase Information
                                            </h3>

                                            <p className="pfm-section-description">
                                                Select the supplier and enter
                                                the invoice information.
                                            </p>
                                        </div>
                                    </div>
                                </header>

                                <div className="pfm-header-grid">
                                    <label className="pfm-field">
                                        <span className="pfm-label">
                                            Supplier

                                            <span className="pfm-required">
                                                {' '}*
                                            </span>
                                        </span>

                                        <span className="pfm-control-wrap">
                                            <span className="pfm-control-icon">
                                                <Icon name="supplier" />
                                            </span>

                                            <select
                                                ref={supplierInputRef}
                                                className={
                                                    supplierError
                                                        ? 'pfm-select with-icon has-error'
                                                        : 'pfm-select with-icon'
                                                }
                                                value={values.supplier_id}
                                                disabled={isSubmitting}
                                                required
                                                aria-invalid={
                                                    Boolean(
                                                        supplierError,
                                                    )
                                                }
                                                onChange={(event) => {
                                                    onHeaderChange(
                                                        'supplier_id',
                                                        event.target.value,
                                                    );
                                                }}
                                            >
                                                <option value="">
                                                    Select a supplier
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
                                        </span>

                                        {supplierError && (
                                            <p className="pfm-field-error">
                                                {supplierError}
                                            </p>
                                        )}
                                    </label>

                                    <label className="pfm-field">
                                        <span className="pfm-label">
                                            Purchase Date

                                            <span className="pfm-required">
                                                {' '}*
                                            </span>
                                        </span>

                                        <span className="pfm-control-wrap">
                                            <span className="pfm-control-icon">
                                                <Icon name="calendar" />
                                            </span>

                                            <input
                                                type="date"
                                                className={
                                                    purchaseDateError
                                                        ? 'pfm-input with-icon has-error'
                                                        : 'pfm-input with-icon'
                                                }
                                                value={values.purchase_date}
                                                disabled={isSubmitting}
                                                required
                                                onChange={(event) => {
                                                    onHeaderChange(
                                                        'purchase_date',
                                                        event.target.value,
                                                    );
                                                }}
                                            />
                                        </span>

                                        {purchaseDateError && (
                                            <p className="pfm-field-error">
                                                {purchaseDateError}
                                            </p>
                                        )}
                                    </label>

                                    <label className="pfm-field">
                                        <span className="pfm-field-header">
                                            <span className="pfm-label">
                                                Supplier Invoice

                                                <span className="pfm-optional">
                                                    Optional
                                                </span>
                                            </span>

                                            <span className="pfm-counter">
                                                {
                                                    values
                                                        .supplier_invoice_number
                                                        .length
                                                }
                                                /120
                                            </span>
                                        </span>

                                        <span className="pfm-control-wrap">
                                            <span className="pfm-control-icon">
                                                <Icon name="invoice" />
                                            </span>

                                            <input
                                                type="text"
                                                className="pfm-input with-icon"
                                                value={
                                                    values
                                                        .supplier_invoice_number
                                                }
                                                maxLength={120}
                                                disabled={isSubmitting}
                                                placeholder="Invoice or reference number"
                                                onChange={(event) => {
                                                    onHeaderChange(
                                                        'supplier_invoice_number',
                                                        event.target.value,
                                                    );
                                                }}
                                            />
                                        </span>
                                    </label>

                                    <label className="pfm-field">
                                        <span className="pfm-label">
                                            Purchase Discount

                                            <span className="pfm-optional">
                                                Optional
                                            </span>
                                        </span>

                                        <span className="pfm-control-wrap">
                                            <span className="pfm-currency-prefix">
                                                LKR
                                            </span>

                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                className="pfm-input with-currency"
                                                min="0"
                                                step="0.01"
                                                value={values.discount}
                                                disabled={isSubmitting}
                                                onChange={(event) => {
                                                    onHeaderChange(
                                                        'discount',
                                                        event.target.value,
                                                    );
                                                }}
                                            />
                                        </span>
                                    </label>

                                    <label className="pfm-field">
                                        <span className="pfm-label">
                                            Additional Cost

                                            <span className="pfm-optional">
                                                Optional
                                            </span>
                                        </span>

                                        <span className="pfm-control-wrap">
                                            <span className="pfm-currency-prefix">
                                                LKR
                                            </span>

                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                className="pfm-input with-currency"
                                                min="0"
                                                step="0.01"
                                                value={values.additional_cost}
                                                disabled={isSubmitting}
                                                onChange={(event) => {
                                                    onHeaderChange(
                                                        'additional_cost',
                                                        event.target.value,
                                                    );
                                                }}
                                            />
                                        </span>
                                    </label>

                                    <label className="pfm-field pfm-notes-field">
                                        <span className="pfm-field-header">
                                            <span className="pfm-label">
                                                Purchase Notes

                                                <span className="pfm-optional">
                                                    Optional
                                                </span>
                                            </span>

                                            <span className="pfm-counter">
                                                {values.notes.length}/2000
                                            </span>
                                        </span>

                                        <span className="pfm-control-wrap">
                                            <span className="pfm-control-icon top">
                                                <Icon name="note" />
                                            </span>

                                            <textarea
                                                className="pfm-textarea with-icon"
                                                value={values.notes}
                                                maxLength={2000}
                                                rows={2}
                                                disabled={isSubmitting}
                                                placeholder="Payment terms, delivery notes or internal comments"
                                                onChange={(event) => {
                                                    onHeaderChange(
                                                        'notes',
                                                        event.target.value,
                                                    );
                                                }}
                                            />
                                        </span>
                                    </label>
                                </div>
                            </section>

                            <div className="pfm-workspace">
                                <section className="pfm-section">
                                    <header className="pfm-section-header">
                                        <div className="pfm-section-heading">
                                            <span className="pfm-section-icon">
                                                <Icon name="package" />
                                            </span>

                                            <div>
                                                <h3 className="pfm-section-title">
                                                    Purchased Products
                                                </h3>

                                                <p className="pfm-section-description">
                                                    Enter quantity, purchase
                                                    cost, selling prices and
                                                    stock batch details.
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="pfm-add-item"
                                            disabled={isSubmitting}
                                            onClick={onAddItem}
                                        >
                                            <Icon name="plus" />

                                            Add Product
                                        </button>
                                    </header>

                                    <div className="pfm-items-list">
                                        {values.items.map(
                                            (
                                                item,
                                                index,
                                            ) => {
                                                const selectedProduct =
                                                    products.find(
                                                        (product) =>
                                                            String(
                                                                product.id,
                                                            )
                                                            === item.product_id,
                                                    );

                                                const productUnit =
                                                    selectedProduct
                                                        ?.unit
                                                    ?? '';

                                                const productCategory =
                                                    selectedProduct
                                                        ?.category
                                                        ?.name
                                                    ?? 'No category';

                                                const isBagProduct =
                                                    isBagUnit(
                                                        productUnit,
                                                    );

                                                const dualUnitEnabled =
                                                    isEnabledFlag(
                                                        getExtendedItemValue(
                                                            item,
                                                            'is_dual_unit',
                                                            '0',
                                                        ),
                                                    );

                                                const conversionFactor =
                                                    numberValue(
                                                        getExtendedItemValue(
                                                            item,
                                                            'conversion_factor',
                                                        ),
                                                    );

                                                const secondaryUnit =
                                                    getExtendedItemValue(
                                                        item,
                                                        'secondary_unit',
                                                        'Kg',
                                                    )
                                                    || 'Kg';

                                                const secondarySellingPrice =
                                                    numberValue(
                                                        getExtendedItemValue(
                                                            item,
                                                            'secondary_selling_price',
                                                        ),
                                                    );

                                                const quantity =
                                                    numberValue(
                                                        item.quantity,
                                                    );

                                                const unitCost =
                                                    numberValue(
                                                        item.unit_cost,
                                                    );

                                                const fullSellingPrice =
                                                    numberValue(
                                                        item.selling_price,
                                                    );

                                                const lineTotal =
                                                    (
                                                        quantity
                                                        * unitCost
                                                    )
                                                    - numberValue(
                                                        item.discount,
                                                    );

                                                const totalBaseStock =
                                                    dualUnitEnabled
                                                        && conversionFactor > 0
                                                        ? quantity
                                                        * conversionFactor
                                                        : quantity;

                                                const costPerKg =
                                                    dualUnitEnabled
                                                        && conversionFactor > 0
                                                        ? unitCost
                                                        / conversionFactor
                                                        : 0;

                                                const fullBagProfit =
                                                    fullSellingPrice
                                                    - unitCost;

                                                const looseKgProfit =
                                                    secondarySellingPrice
                                                    - costPerKg;

                                                const productError =
                                                    getFieldError(
                                                        `items.${index}.product_id`,
                                                    );

                                                const quantityError =
                                                    getFieldError(
                                                        `items.${index}.quantity`,
                                                    );

                                                const unitCostError =
                                                    getFieldError(
                                                        `items.${index}.unit_cost`,
                                                    );

                                                const sellingPriceError =
                                                    getFieldError(
                                                        `items.${index}.selling_price`,
                                                    );

                                                const conversionError =
                                                    getFieldError(
                                                        `items.${index}.conversion_factor`,
                                                    );

                                                const secondarySellingPriceError =
                                                    getFieldError(
                                                        `items.${index}.secondary_selling_price`,
                                                    );

                                                const expiryError =
                                                    getFieldError(
                                                        `items.${index}.expiry_date`,
                                                    );

                                                return (
                                                    <article
                                                        key={item.row_id}
                                                        className="pfm-item-card"
                                                    >
                                                        <header className="pfm-item-header">
                                                            <div className="pfm-item-heading">
                                                                <span className="pfm-item-number">
                                                                    Item
                                                                    {' '}
                                                                    {index + 1}
                                                                </span>

                                                                <strong
                                                                    className="pfm-item-product"
                                                                    title={
                                                                        selectedProduct
                                                                            ?.name
                                                                        ?? 'Product not selected'
                                                                    }
                                                                >
                                                                    {
                                                                        selectedProduct
                                                                            ?.name
                                                                        ?? 'Select a product'
                                                                    }
                                                                </strong>

                                                                {selectedProduct && (
                                                                    <span className="pfm-unit-badge">
                                                                        <Icon
                                                                            name={
                                                                                isBagProduct
                                                                                    ? 'bag'
                                                                                    : 'package'
                                                                            }
                                                                        />

                                                                        {
                                                                            productUnit
                                                                            || 'No unit'
                                                                        }
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="pfm-item-header-actions">
                                                                <span className="pfm-line-total">
                                                                    Purchase Total:
                                                                    {' '}

                                                                    {currencyFormatter.format(
                                                                        Math.max(
                                                                            0,
                                                                            lineTotal,
                                                                        ),
                                                                    )}
                                                                </span>

                                                                <button
                                                                    type="button"
                                                                    className="pfm-remove-item"
                                                                    disabled={
                                                                        isSubmitting
                                                                        || values.items.length
                                                                        === 1
                                                                    }
                                                                    onClick={() => {
                                                                        onRemoveItem(
                                                                            index,
                                                                        );
                                                                    }}
                                                                >
                                                                    <Icon name="trash" />

                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </header>

                                                        <div className="pfm-item-body">
                                                            <div className="pfm-item-main-grid">
                                                                <label className="pfm-field">
                                                                    <span className="pfm-label">
                                                                        Product

                                                                        <span className="pfm-required">
                                                                            {' '}*
                                                                        </span>
                                                                    </span>

                                                                    <select
                                                                        className={
                                                                            productError
                                                                                ? 'pfm-select has-error'
                                                                                : 'pfm-select'
                                                                        }
                                                                        value={item.product_id}
                                                                        disabled={isSubmitting}
                                                                        required
                                                                        onChange={(event) => {
                                                                            handleProductChange(
                                                                                index,
                                                                                item,
                                                                                event.target.value,
                                                                            );
                                                                        }}
                                                                    >
                                                                        <option value="">
                                                                            Select a product
                                                                        </option>

                                                                        {products.map(
                                                                            (product) => (
                                                                                <option
                                                                                    key={product.id}
                                                                                    value={product.id}
                                                                                >
                                                                                    {product.name}
                                                                                    {' — '}
                                                                                    {
                                                                                        product
                                                                                            .category
                                                                                            .name
                                                                                    }
                                                                                    {' — '}
                                                                                    {product.unit}
                                                                                </option>
                                                                            ),
                                                                        )}
                                                                    </select>

                                                                    {productError ? (
                                                                        <p className="pfm-field-error">
                                                                            {productError}
                                                                        </p>
                                                                    ) : selectedProduct ? (
                                                                        <span className="pfm-help">
                                                                            <Icon name="info" />

                                                                            Category:
                                                                            {' '}
                                                                            {productCategory}
                                                                            {' · '}
                                                                            Purchase unit:
                                                                            {' '}
                                                                            {productUnit}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="pfm-help">
                                                                            Select the product
                                                                            before entering
                                                                            quantities and prices.
                                                                        </span>
                                                                    )}
                                                                </label>

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label">
                                                                        Quantity
                                                                        {' '}

                                                                        {productUnit && (
                                                                            <>
                                                                                (
                                                                                {productUnit}
                                                                                )
                                                                            </>
                                                                        )}

                                                                        <span className="pfm-required">
                                                                            {' '}*
                                                                        </span>
                                                                    </span>

                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        className={
                                                                            quantityError
                                                                                ? 'pfm-input has-error'
                                                                                : 'pfm-input'
                                                                        }
                                                                        min="0.001"
                                                                        step="0.001"
                                                                        value={item.quantity}
                                                                        disabled={isSubmitting}
                                                                        required
                                                                        placeholder="0"
                                                                        onChange={(event) => {
                                                                            onItemChange(
                                                                                index,
                                                                                'quantity',
                                                                                event.target.value,
                                                                            );
                                                                        }}
                                                                    />

                                                                    {quantityError ? (
                                                                        <p className="pfm-field-error">
                                                                            {quantityError}
                                                                        </p>
                                                                    ) : (
                                                                        <span className="pfm-help">
                                                                            Purchased quantity in
                                                                            {' '}
                                                                            {productUnit || 'product units'}.
                                                                        </span>
                                                                    )}
                                                                </label>

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label">
                                                                        Purchase Cost per
                                                                        {' '}
                                                                        {productUnit || 'Unit'}

                                                                        <span className="pfm-required">
                                                                            {' '}*
                                                                        </span>
                                                                    </span>

                                                                    <span className="pfm-control-wrap">
                                                                        <span className="pfm-currency-prefix">
                                                                            LKR
                                                                        </span>

                                                                        <input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            className={
                                                                                unitCostError
                                                                                    ? 'pfm-input with-currency has-error'
                                                                                    : 'pfm-input with-currency'
                                                                            }
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={item.unit_cost}
                                                                            disabled={isSubmitting}
                                                                            required
                                                                            placeholder="0.00"
                                                                            onChange={(event) => {
                                                                                onItemChange(
                                                                                    index,
                                                                                    'unit_cost',
                                                                                    event.target.value,
                                                                                );
                                                                            }}
                                                                        />
                                                                    </span>

                                                                    {unitCostError && (
                                                                        <p className="pfm-field-error">
                                                                            {unitCostError}
                                                                        </p>
                                                                    )}
                                                                </label>

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label">
                                                                        Selling Price per
                                                                        {' '}
                                                                        {productUnit || 'Unit'}

                                                                        <span className="pfm-required">
                                                                            {' '}*
                                                                        </span>
                                                                    </span>

                                                                    <span className="pfm-control-wrap">
                                                                        <span className="pfm-currency-prefix">
                                                                            LKR
                                                                        </span>

                                                                        <input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            className={
                                                                                sellingPriceError
                                                                                    ? 'pfm-input with-currency has-error'
                                                                                    : 'pfm-input with-currency'
                                                                            }
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={item.selling_price}
                                                                            disabled={isSubmitting}
                                                                            required
                                                                            placeholder="0.00"
                                                                            onChange={(event) => {
                                                                                onItemChange(
                                                                                    index,
                                                                                    'selling_price',
                                                                                    event.target.value,
                                                                                );
                                                                            }}
                                                                        />
                                                                    </span>

                                                                    {sellingPriceError && (
                                                                        <p className="pfm-field-error">
                                                                            {sellingPriceError}
                                                                        </p>
                                                                    )}
                                                                </label>

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label">
                                                                        Item Discount

                                                                        <span className="pfm-optional">
                                                                            Optional
                                                                        </span>
                                                                    </span>

                                                                    <span className="pfm-control-wrap">
                                                                        <span className="pfm-currency-prefix">
                                                                            LKR
                                                                        </span>

                                                                        <input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            className="pfm-input with-currency"
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={item.discount}
                                                                            disabled={isSubmitting}
                                                                            placeholder="0.00"
                                                                            onChange={(event) => {
                                                                                onItemChange(
                                                                                    index,
                                                                                    'discount',
                                                                                    event.target.value,
                                                                                );
                                                                            }}
                                                                        />
                                                                    </span>
                                                                </label>
                                                            </div>

                                                            {isBagProduct && (
                                                                <section className="pfm-dual-unit-card">
                                                                    <header className="pfm-dual-header">
                                                                        <div className="pfm-dual-heading">
                                                                            <span className="pfm-dual-icon">
                                                                                <Icon name="scale" />
                                                                            </span>

                                                                            <div>
                                                                                <h4 className="pfm-dual-title">
                                                                                    Full Bag + Loose Kg Selling
                                                                                </h4>

                                                                                <p className="pfm-dual-description">
                                                                                    Enable this when the product
                                                                                    can be sold as a complete bag
                                                                                    or as loose kilograms from the
                                                                                    same physical stock.
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <label className="pfm-switch-label">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={
                                                                                    dualUnitEnabled
                                                                                }
                                                                                disabled={isSubmitting}
                                                                                onChange={(event) => {
                                                                                    handleDualUnitToggle(
                                                                                        index,
                                                                                        item,
                                                                                        event.target.checked,
                                                                                    );
                                                                                }}
                                                                            />

                                                                            Enable Loose Kg Sales
                                                                        </label>
                                                                    </header>

                                                                    {!dualUnitEnabled ? (
                                                                        <div className="pfm-dual-disabled-message">
                                                                            <Icon name="info" />

                                                                            <span>
                                                                                The product will currently be
                                                                                purchased and sold only as full
                                                                                bags. Enable loose Kg sales to
                                                                                configure the bag weight and
                                                                                price per 1 Kg.
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <div className="pfm-dual-grid">
                                                                                <label className="pfm-field">
                                                                                    <span className="pfm-label">
                                                                                        Weight in One Bag

                                                                                        <span className="pfm-required">
                                                                                            {' '}*
                                                                                        </span>
                                                                                    </span>

                                                                                    <span className="pfm-control-wrap">
                                                                                        <input
                                                                                            type="number"
                                                                                            inputMode="decimal"
                                                                                            className={
                                                                                                conversionError
                                                                                                    ? 'pfm-input with-suffix has-error'
                                                                                                    : 'pfm-input with-suffix'
                                                                                            }
                                                                                            min="0.001"
                                                                                            step="0.001"
                                                                                            value={
                                                                                                getExtendedItemValue(
                                                                                                    item,
                                                                                                    'conversion_factor',
                                                                                                )
                                                                                            }
                                                                                            disabled={isSubmitting}
                                                                                            required
                                                                                            placeholder="Example: 50"
                                                                                            onChange={(event) => {
                                                                                                changeExtendedItemField(
                                                                                                    index,
                                                                                                    'conversion_factor',
                                                                                                    event.target.value,
                                                                                                );
                                                                                            }}
                                                                                        />

                                                                                        <span className="pfm-suffix">
                                                                                            Kg
                                                                                        </span>
                                                                                    </span>

                                                                                    {conversionError ? (
                                                                                        <p className="pfm-field-error">
                                                                                            {conversionError}
                                                                                        </p>
                                                                                    ) : (
                                                                                        <span className="pfm-help">
                                                                                            Example:
                                                                                            {' '}
                                                                                            1 Bag = 50 Kg.
                                                                                        </span>
                                                                                    )}
                                                                                </label>

                                                                                <label className="pfm-field">
                                                                                    <span className="pfm-label">
                                                                                        Loose Selling Unit
                                                                                    </span>

                                                                                    <select
                                                                                        className="pfm-select"
                                                                                        value={secondaryUnit}
                                                                                        disabled
                                                                                    >
                                                                                        <option value="Kg">
                                                                                            Kilogram — Kg
                                                                                        </option>
                                                                                    </select>

                                                                                    <span className="pfm-help">
                                                                                        Loose quantities are entered
                                                                                        in kilograms at the POS.
                                                                                    </span>
                                                                                </label>

                                                                                <label className="pfm-field">
                                                                                    <span className="pfm-label">
                                                                                        Selling Price for 1 Kg

                                                                                        <span className="pfm-required">
                                                                                            {' '}*
                                                                                        </span>
                                                                                    </span>

                                                                                    <span className="pfm-control-wrap">
                                                                                        <span className="pfm-currency-prefix">
                                                                                            LKR
                                                                                        </span>

                                                                                        <input
                                                                                            type="number"
                                                                                            inputMode="decimal"
                                                                                            className={
                                                                                                secondarySellingPriceError
                                                                                                    ? 'pfm-input with-currency has-error'
                                                                                                    : 'pfm-input with-currency'
                                                                                            }
                                                                                            min="0"
                                                                                            step="0.01"
                                                                                            value={
                                                                                                getExtendedItemValue(
                                                                                                    item,
                                                                                                    'secondary_selling_price',
                                                                                                )
                                                                                            }
                                                                                            disabled={isSubmitting}
                                                                                            required
                                                                                            placeholder="Price per 1 Kg"
                                                                                            onChange={(event) => {
                                                                                                changeExtendedItemField(
                                                                                                    index,
                                                                                                    'secondary_selling_price',
                                                                                                    event.target.value,
                                                                                                );
                                                                                            }}
                                                                                        />
                                                                                    </span>

                                                                                    {secondarySellingPriceError ? (
                                                                                        <p className="pfm-field-error">
                                                                                            {
                                                                                                secondarySellingPriceError
                                                                                            }
                                                                                        </p>
                                                                                    ) : (
                                                                                        <span className="pfm-help">
                                                                                            Example:
                                                                                            {' '}
                                                                                            Rs. 180 for 1 Kg.
                                                                                        </span>
                                                                                    )}
                                                                                </label>
                                                                            </div>

                                                                            <div className="pfm-dual-note">
                                                                                <Icon name="info" />

                                                                                <span>
                                                                                    The POS will show two options:
                                                                                    {' '}
                                                                                    <strong>Full Bag</strong>
                                                                                    {' '}
                                                                                    and
                                                                                    {' '}
                                                                                    <strong>Loose Kg</strong>.
                                                                                    For 500 g, the cashier enters
                                                                                    {' '}
                                                                                    <strong>0.5 Kg</strong>.
                                                                                </span>
                                                                            </div>

                                                                            <div className="pfm-preview-grid">
                                                                                <div className="pfm-preview-box">
                                                                                    <span>
                                                                                        Stock After Receiving
                                                                                    </span>

                                                                                    <strong>
                                                                                        {formatQuantity(
                                                                                            totalBaseStock,
                                                                                        )}
                                                                                        {' '}
                                                                                        Kg
                                                                                    </strong>
                                                                                </div>

                                                                                <div className="pfm-preview-box">
                                                                                    <span>
                                                                                        Purchase Cost per Kg
                                                                                    </span>

                                                                                    <strong>
                                                                                        {currencyFormatter.format(
                                                                                            Math.max(
                                                                                                0,
                                                                                                costPerKg,
                                                                                            ),
                                                                                        )}
                                                                                    </strong>
                                                                                </div>

                                                                                <div className="pfm-preview-box profit">
                                                                                    <span>
                                                                                        Profit per Full Bag
                                                                                    </span>

                                                                                    <strong>
                                                                                        {currencyFormatter.format(
                                                                                            fullBagProfit,
                                                                                        )}
                                                                                    </strong>
                                                                                </div>

                                                                                <div className="pfm-preview-box profit">
                                                                                    <span>
                                                                                        Profit per Loose Kg
                                                                                    </span>

                                                                                    <strong>
                                                                                        {currencyFormatter.format(
                                                                                            looseKgProfit,
                                                                                        )}
                                                                                    </strong>
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </section>
                                                            )}

                                                            <div className="pfm-batch-heading">
                                                                <Icon name="batch" />

                                                                Optional Stock Batch Details
                                                            </div>

                                                            <div className="pfm-item-batch-grid">
                                                                <label className="pfm-field">
                                                                    <span className="pfm-field-header">
                                                                        <span className="pfm-label">
                                                                            Batch Number
                                                                        </span>

                                                                        <span className="pfm-counter">
                                                                            {
                                                                                item
                                                                                    .batch_number
                                                                                    .length
                                                                            }
                                                                            /120
                                                                        </span>
                                                                    </span>

                                                                    <input
                                                                        type="text"
                                                                        className="pfm-input"
                                                                        value={item.batch_number}
                                                                        maxLength={120}
                                                                        disabled={isSubmitting}
                                                                        placeholder="Optional"
                                                                        onChange={(event) => {
                                                                            onItemChange(
                                                                                index,
                                                                                'batch_number',
                                                                                event.target.value,
                                                                            );
                                                                        }}
                                                                    />
                                                                </label>

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label">
                                                                        Manufactured Date
                                                                    </span>

                                                                    <input
                                                                        type="date"
                                                                        className="pfm-input"
                                                                        value={
                                                                            item
                                                                                .manufactured_date
                                                                        }
                                                                        disabled={isSubmitting}
                                                                        onChange={(event) => {
                                                                            onItemChange(
                                                                                index,
                                                                                'manufactured_date',
                                                                                event.target.value,
                                                                            );
                                                                        }}
                                                                    />
                                                                </label>

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label">
                                                                        Expiry Date
                                                                    </span>

                                                                    <input
                                                                        type="date"
                                                                        className={
                                                                            expiryError
                                                                                ? 'pfm-input has-error'
                                                                                : 'pfm-input'
                                                                        }
                                                                        value={item.expiry_date}
                                                                        disabled={isSubmitting}
                                                                        onChange={(event) => {
                                                                            onItemChange(
                                                                                index,
                                                                                'expiry_date',
                                                                                event.target.value,
                                                                            );
                                                                        }}
                                                                    />

                                                                    {expiryError && (
                                                                        <p className="pfm-field-error">
                                                                            {expiryError}
                                                                        </p>
                                                                    )}
                                                                </label>

                                                                <label className="pfm-field">
                                                                    <span className="pfm-field-header">
                                                                        <span className="pfm-label">
                                                                            Item Notes
                                                                        </span>

                                                                        <span className="pfm-counter">
                                                                            {item.notes.length}/1000
                                                                        </span>
                                                                    </span>

                                                                    <input
                                                                        type="text"
                                                                        className="pfm-input"
                                                                        value={item.notes}
                                                                        maxLength={1000}
                                                                        disabled={isSubmitting}
                                                                        placeholder="Optional item note"
                                                                        onChange={(event) => {
                                                                            onItemChange(
                                                                                index,
                                                                                'notes',
                                                                                event.target.value,
                                                                            );
                                                                        }}
                                                                    />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </article>
                                                );
                                            },
                                        )}
                                    </div>
                                </section>

                                <aside className="pfm-summary-column">
                                    <section className="pfm-summary-card">
                                        <header className="pfm-summary-header">
                                            <Icon name="money" />

                                            Purchase Summary
                                        </header>

                                        <div className="pfm-summary-lines">
                                            <div className="pfm-summary-line">
                                                <span>
                                                    Product Subtotal
                                                </span>

                                                <strong>
                                                    {currencyFormatter.format(
                                                        itemSubtotal,
                                                    )}
                                                </strong>
                                            </div>

                                            <div className="pfm-summary-line discount">
                                                <span>
                                                    Item Discounts
                                                </span>

                                                <strong>
                                                    -
                                                    {currencyFormatter.format(
                                                        itemDiscount,
                                                    )}
                                                </strong>
                                            </div>

                                            <div className="pfm-summary-line discount">
                                                <span>
                                                    Purchase Discount
                                                </span>

                                                <strong>
                                                    -
                                                    {currencyFormatter.format(
                                                        purchaseDiscount,
                                                    )}
                                                </strong>
                                            </div>

                                            <div className="pfm-summary-line">
                                                <span>
                                                    Additional Cost
                                                </span>

                                                <strong>
                                                    {currencyFormatter.format(
                                                        additionalCost,
                                                    )}
                                                </strong>
                                            </div>

                                            <div className="pfm-summary-line">
                                                <span>
                                                    Product Lines
                                                </span>

                                                <strong>
                                                    {values.items.length}
                                                </strong>
                                            </div>

                                            <div className="pfm-summary-line total">
                                                <span>
                                                    Grand Total
                                                </span>

                                                <strong>
                                                    {currencyFormatter.format(
                                                        Math.max(
                                                            0,
                                                            grandTotal,
                                                        ),
                                                    )}
                                                </strong>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="pfm-receive-card">
                                        <label className="pfm-receive-option">
                                            <input
                                                type="checkbox"
                                                checked={values.receive_now}
                                                disabled={isSubmitting}
                                                onChange={(event) => {
                                                    onHeaderChange(
                                                        'receive_now',
                                                        event.target.checked,
                                                    );
                                                }}
                                            />

                                            <span>
                                                <strong className="pfm-receive-title">
                                                    <Icon name="truck" />

                                                    Receive Stock Now
                                                </strong>

                                                <span className="pfm-receive-description">
                                                    Creates stock batches and
                                                    makes the quantities
                                                    available immediately.
                                                    Dual-unit Bag stock will
                                                    be converted into Kg.
                                                </span>
                                            </span>
                                        </label>
                                    </section>
                                </aside>
                            </div>
                        </div>

                        <footer className="pfm-actions">
                            <span className="pfm-action-note">
                                <Icon name="info" />

                                Required fields are marked
                                with an asterisk.
                            </span>

                            <div className="pfm-action-buttons">
                                <button
                                    type="button"
                                    className="pfm-button pfm-cancel"
                                    disabled={isSubmitting}
                                    onClick={onClose}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="pfm-button pfm-submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className="pfm-spinner" />
                                    ) : values.receive_now ? (
                                        <Icon name="truck" />
                                    ) : (
                                        <Icon name="save" />
                                    )}

                                    {isSubmitting
                                        ? 'Saving Purchase...'
                                        : values.receive_now
                                            ? 'Save and Receive Stock'
                                            : isEditing
                                                ? 'Update Draft'
                                                : 'Save as Draft'}
                                </button>
                            </div>
                        </footer>
                    </form>
                </section>
            </div>
        </div>,
        document.body,
    );
}