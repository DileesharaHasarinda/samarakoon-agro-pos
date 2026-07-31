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
    onRemoveItem: (index: number) => void;
    onClose: () => void;

    onSubmit: (
        event: FormEvent<HTMLFormElement>,
    ) => void;
}

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

type IconName =
    | 'alert'
    | 'batch'
    | 'calendar'
    | 'check'
    | 'close'
    | 'info'
    | 'invoice'
    | 'money'
    | 'note'
    | 'package'
    | 'plus'
    | 'receipt'
    | 'save'
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
    value: string | number,
): number {
    const parsed = Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
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
    --pfm-blue: #175cd3;
    --pfm-blue-50: #eff8ff;
    --pfm-amber: #b54708;
    --pfm-amber-50: #fffaeb;
    --pfm-red: #b42318;
    --pfm-red-50: #fef3f2;
    --pfm-text: #101828;
    --pfm-text-2: #344054;
    --pfm-muted: #667085;
    --pfm-border: #d0d9d2;
    --pfm-border-strong: #aebdb2;

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

    font-size: 14px !important;
    line-height: 1.5 !important;

    isolation: isolate !important;

    -webkit-font-smoothing:
        antialiased !important;
}

#purchase-form-modal button,
#purchase-form-modal input,
#purchase-form-modal select,
#purchase-form-modal textarea {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#purchase-form-modal h2,
#purchase-form-modal h3,
#purchase-form-modal p {
    margin: 0 !important;
}

#purchase-form-modal .pfm-backdrop {
    position: absolute !important;
    inset: 0 !important;

    display: flex !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 12px !important;

    overflow: auto !important;

    background:
        rgba(
            3,
            18,
            10,
            0.76
        ) !important;

    backdrop-filter:
        blur(4px) !important;
}

#purchase-form-modal .pfm-dialog {
    display: flex !important;

    width:
        min(
            1180px,
            100%
        ) !important;

    max-height:
        calc(100dvh - 24px) !important;

    min-width: 0 !important;
    min-height: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--pfm-border) !important;

    border-radius: 16px !important;

    box-shadow:
        0 28px 72px
        rgba(
            0,
            0,
            0,
            0.38
        ) !important;
}

#purchase-form-modal .pfm-header {
    display: flex !important;

    min-height: 78px !important;
    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 16px !important;

    padding: 13px 16px !important;

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
    flex: 1 !important;

    align-items: center !important;
    gap: 11px !important;
}

#purchase-form-modal .pfm-header-icon {
    display: grid !important;

    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;

    place-items: center !important;

    color:
        var(--pfm-green-900) !important;

    background: #ffffff !important;

    border-radius: 10px !important;
}

#purchase-form-modal .pfm-header-icon svg {
    width: 20px !important;
    height: 20px !important;
}

#purchase-form-modal .pfm-header-copy {
    min-width: 0 !important;
}

#purchase-form-modal .pfm-kicker {
    display: block !important;

    margin-bottom: 2px !important;

    color: #bbf7d0 !important;

    font-size: 10px !important;
    font-weight: 750 !important;
    letter-spacing: 0.055em !important;

    text-transform: uppercase !important;
}

#purchase-form-modal .pfm-title {
    overflow: hidden !important;

    color: #ffffff !important;

    font-size: 20px !important;
    font-weight: 740 !important;
    line-height: 1.25 !important;
    letter-spacing: -0.02em !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#purchase-form-modal .pfm-close {
    display: grid !important;

    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;

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
            0.34
        ) !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#purchase-form-modal
.pfm-close:hover:not(:disabled) {
    background:
        rgba(
            255,
            255,
            255,
            0.22
        ) !important;
}

#purchase-form-modal .pfm-close:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

#purchase-form-modal .pfm-close svg {
    width: 18px !important;
    height: 18px !important;
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
    gap: 13px !important;

    padding: 14px !important;

    overflow-x: hidden !important;
    overflow-y: auto !important;

    background: #f5f8f6 !important;

    scrollbar-width: thin !important;

    scrollbar-color:
        #9cad9f
        #eaf0eb !important;
}

#purchase-form-modal
.pfm-body::-webkit-scrollbar {
    width: 9px !important;
}

#purchase-form-modal
.pfm-body::-webkit-scrollbar-track {
    background: #eaf0eb !important;
}

#purchase-form-modal
.pfm-body::-webkit-scrollbar-thumb {
    background: #9cad9f !important;

    border:
        2px solid
        #eaf0eb !important;

    border-radius: 999px !important;
}

#purchase-form-modal .pfm-intro {
    color: var(--pfm-muted) !important;
    font-size: 12px !important;
}

#purchase-form-modal .pfm-alert {
    display: flex !important;

    align-items: flex-start !important;
    gap: 8px !important;

    padding: 9px 11px !important;

    color: var(--pfm-red) !important;

    font-size: 12px !important;
    font-weight: 600 !important;

    background:
        var(--pfm-red-50) !important;

    border:
        1px solid
        #f3b5af !important;

    border-radius: 9px !important;
}

#purchase-form-modal .pfm-alert svg {
    width: 17px !important;
    height: 17px !important;
    min-width: 17px !important;

    margin-top: 1px !important;
}

#purchase-form-modal .pfm-section {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;
    gap: 11px !important;

    padding: 13px !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--pfm-border) !important;

    border-radius: 11px !important;
}

#purchase-form-modal .pfm-section-header {
    display: flex !important;

    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding-bottom: 9px !important;

    border-bottom:
        1px solid
        #e7ece8 !important;
}

#purchase-form-modal .pfm-section-heading {
    display: flex !important;

    min-width: 0 !important;

    align-items: flex-start !important;
    gap: 8px !important;
}

#purchase-form-modal .pfm-section-icon {
    display: grid !important;

    width: 30px !important;
    height: 30px !important;
    min-width: 30px !important;

    place-items: center !important;

    color:
        var(--pfm-green-900) !important;

    background:
        var(--pfm-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 8px !important;
}

#purchase-form-modal .pfm-section-icon svg {
    width: 15px !important;
    height: 15px !important;
}

#purchase-form-modal .pfm-section-copy {
    min-width: 0 !important;
}

#purchase-form-modal .pfm-section-title {
    color: var(--pfm-text-2) !important;

    font-size: 13px !important;
    font-weight: 700 !important;
}

#purchase-form-modal .pfm-section-description {
    margin-top: 1px !important;

    color: var(--pfm-muted) !important;

    font-size: 10px !important;
}

#purchase-form-modal .pfm-add-item {
    min-height: 36px !important;

    padding: 5px 9px !important;

    color:
        var(--pfm-green-900) !important;

    font-size: 11px !important;
    font-weight: 700 !important;

    background:
        var(--pfm-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#purchase-form-modal .pfm-add-item svg {
    width: 14px !important;
    height: 14px !important;
}

#purchase-form-modal .pfm-header-grid {
    display: grid !important;

    grid-template-columns:
        minmax(220px, 1.3fr)
        minmax(150px, 0.7fr)
        minmax(190px, 1fr)
        minmax(145px, 0.65fr)
        minmax(145px, 0.65fr) !important;

    gap: 10px !important;
}

#purchase-form-modal .pfm-notes-field {
    grid-column: 1 / -1 !important;
}

#purchase-form-modal .pfm-workspace {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        275px !important;

    align-items: start !important;
    gap: 12px !important;
}

#purchase-form-modal .pfm-items-section {
    min-width: 0 !important;
}

#purchase-form-modal .pfm-items-list {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;
    gap: 9px !important;
}

#purchase-form-modal .pfm-item-card {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--pfm-border) !important;

    border-radius: 10px !important;
}

#purchase-form-modal .pfm-item-header {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 9px 11px !important;

    background: #f8faf9 !important;

    border-bottom:
        1px solid
        #e3e9e4 !important;
}

#purchase-form-modal .pfm-item-heading {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;
    gap: 8px !important;
}

#purchase-form-modal .pfm-item-number {
    display: inline-flex !important;

    min-height: 26px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 3px 7px !important;

    color:
        var(--pfm-green-900) !important;

    font-size: 10px !important;
    font-weight: 700 !important;

    background:
        var(--pfm-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 999px !important;
}

#purchase-form-modal .pfm-item-product {
    overflow: hidden !important;

    color: var(--pfm-text-2) !important;

    font-size: 12px !important;
    font-weight: 650 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#purchase-form-modal .pfm-item-header-actions {
    display: flex !important;

    align-items: center !important;
    gap: 8px !important;
}

#purchase-form-modal .pfm-line-total {
    color:
        var(--pfm-green-900) !important;

    font-size: 12px !important;
    font-weight: 750 !important;

    white-space: nowrap !important;
}

#purchase-form-modal .pfm-remove-item {
    display: inline-flex !important;

    min-height: 30px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;

    padding: 4px 7px !important;

    color: var(--pfm-red) !important;

    font-size: 10px !important;
    font-weight: 700 !important;

    background:
        var(--pfm-red-50) !important;

    border:
        1px solid
        #f3b5af !important;

    border-radius: 7px !important;

    cursor: pointer !important;
}

#purchase-form-modal .pfm-remove-item svg {
    width: 13px !important;
    height: 13px !important;
}

#purchase-form-modal .pfm-remove-item:disabled {
    opacity: 0.45 !important;
    cursor: not-allowed !important;
}

#purchase-form-modal .pfm-item-body {
    display: flex !important;

    flex-direction: column !important;
    gap: 10px !important;

    padding: 10px !important;
}

#purchase-form-modal .pfm-item-main-grid {
    display: grid !important;

    grid-template-columns:
        minmax(210px, 1.5fr)
        minmax(90px, 0.55fr)
        minmax(120px, 0.72fr)
        minmax(120px, 0.72fr)
        minmax(105px, 0.6fr) !important;

    gap: 9px !important;
}

#purchase-form-modal .pfm-batch-heading {
    display: flex !important;

    align-items: center !important;
    gap: 6px !important;

    padding-top: 2px !important;

    color: var(--pfm-muted) !important;

    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.04em !important;

    text-transform: uppercase !important;
}

#purchase-form-modal .pfm-batch-heading svg {
    width: 13px !important;
    height: 13px !important;
}

#purchase-form-modal .pfm-item-batch-grid {
    display: grid !important;

    grid-template-columns:
        minmax(150px, 0.8fr)
        minmax(145px, 0.7fr)
        minmax(145px, 0.7fr)
        minmax(180px, 1.2fr) !important;

    gap: 9px !important;
}

#purchase-form-modal .pfm-summary-column {
    position: sticky !important;
    top: 0 !important;

    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;
    gap: 10px !important;
}

#purchase-form-modal .pfm-summary-card,
#purchase-form-modal .pfm-receive-card {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--pfm-border) !important;

    border-radius: 10px !important;
}

#purchase-form-modal .pfm-summary-header {
    display: flex !important;

    align-items: center !important;
    gap: 7px !important;

    padding: 10px 11px !important;

    color: var(--pfm-text-2) !important;

    font-size: 12px !important;
    font-weight: 700 !important;

    background: #f8faf9 !important;

    border-bottom:
        1px solid
        #e3e9e4 !important;
}

#purchase-form-modal .pfm-summary-header svg {
    width: 15px !important;
    height: 15px !important;

    color:
        var(--pfm-green-700) !important;
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

    padding: 8px 11px !important;

    color: var(--pfm-muted) !important;

    font-size: 11px !important;

    border-bottom:
        1px solid
        #edf1ee !important;
}

#purchase-form-modal .pfm-summary-line strong {
    color: var(--pfm-text-2) !important;

    font-size: 11px !important;
    font-weight: 700 !important;

    text-align: right !important;
    white-space: nowrap !important;
}

#purchase-form-modal .pfm-summary-line.discount strong {
    color: var(--pfm-red) !important;
}

#purchase-form-modal .pfm-summary-line.total {
    padding: 11px !important;

    color:
        var(--pfm-green-900) !important;

    font-size: 12px !important;
    font-weight: 700 !important;

    background:
        var(--pfm-green-50) !important;

    border-bottom: 0 !important;
}

#purchase-form-modal .pfm-summary-line.total strong {
    color:
        var(--pfm-green-900) !important;

    font-size: 16px !important;
    font-weight: 800 !important;
}

#purchase-form-modal .pfm-receive-option {
    display: flex !important;

    align-items: flex-start !important;
    gap: 9px !important;

    padding: 11px !important;

    cursor: pointer !important;
}

#purchase-form-modal .pfm-receive-option input {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;

    margin: 1px 0 0 !important;

    accent-color:
        var(--pfm-green-700) !important;
}

#purchase-form-modal .pfm-receive-copy {
    min-width: 0 !important;
}

#purchase-form-modal .pfm-receive-title {
    display: flex !important;

    align-items: center !important;
    gap: 5px !important;

    color: var(--pfm-text-2) !important;

    font-size: 12px !important;
    font-weight: 700 !important;
}

#purchase-form-modal .pfm-receive-title svg {
    width: 14px !important;
    height: 14px !important;

    color:
        var(--pfm-green-700) !important;
}

#purchase-form-modal .pfm-receive-description {
    display: block !important;

    margin-top: 3px !important;

    color: var(--pfm-muted) !important;

    font-size: 10px !important;
    line-height: 1.4 !important;
}

#purchase-form-modal .pfm-field {
    display: grid !important;

    min-width: 0 !important;

    gap: 5px !important;
}

#purchase-form-modal .pfm-field-header {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
}

#purchase-form-modal .pfm-label {
    color: var(--pfm-text-2) !important;

    font-size: 11px !important;
    font-weight: 650 !important;
}

#purchase-form-modal .pfm-required {
    color: var(--pfm-red) !important;
}

#purchase-form-modal .pfm-optional {
    display: inline-flex !important;

    margin-left: 4px !important;
    padding: 1px 4px !important;

    color: var(--pfm-muted) !important;

    font-size: 8px !important;
    font-weight: 600 !important;

    background: #f2f4f7 !important;

    border-radius: 999px !important;
}

#purchase-form-modal .pfm-counter {
    color: var(--pfm-muted) !important;

    font-size: 9px !important;
    font-weight: 500 !important;
}

#purchase-form-modal .pfm-control-wrap {
    position: relative !important;
}

#purchase-form-modal .pfm-control-icon {
    position: absolute !important;

    top: 50% !important;
    left: 10px !important;

    display: grid !important;

    width: 15px !important;
    height: 15px !important;

    place-items: center !important;

    color: var(--pfm-muted) !important;

    transform:
        translateY(-50%) !important;

    pointer-events: none !important;
}

#purchase-form-modal
.pfm-control-icon.top {
    top: 11px !important;
    transform: none !important;
}

#purchase-form-modal
.pfm-control-icon
svg {
    width: 15px !important;
    height: 15px !important;
}

#purchase-form-modal .pfm-currency-prefix {
    position: absolute !important;

    top: 50% !important;
    left: 9px !important;

    color: var(--pfm-muted) !important;

    font-size: 9px !important;
    font-weight: 700 !important;

    transform:
        translateY(-50%) !important;

    pointer-events: none !important;
}

#purchase-form-modal .pfm-input,
#purchase-form-modal .pfm-select,
#purchase-form-modal .pfm-textarea {
    display: block !important;

    width: 100% !important;
    min-width: 0 !important;

    color: var(--pfm-text) !important;

    font-size: 13px !important;
    font-weight: 500 !important;

    outline: none !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--pfm-border-strong) !important;

    border-radius: 8px !important;

    box-shadow: none !important;
}

#purchase-form-modal .pfm-input,
#purchase-form-modal .pfm-select {
    height: 40px !important;
    min-height: 40px !important;
}

#purchase-form-modal .pfm-input {
    padding: 0 9px !important;
}

#purchase-form-modal .pfm-select {
    padding: 0 8px !important;

    cursor: pointer !important;
}

#purchase-form-modal .pfm-input.with-icon,
#purchase-form-modal .pfm-select.with-icon {
    padding-left: 33px !important;
}

#purchase-form-modal .pfm-input.with-currency {
    padding-left: 37px !important;
}

#purchase-form-modal .pfm-textarea {
    min-height: 76px !important;

    padding: 8px 9px !important;

    line-height: 1.45 !important;

    resize: vertical !important;
}

#purchase-form-modal .pfm-textarea.with-icon {
    padding-left: 33px !important;
}

#purchase-form-modal .pfm-input::placeholder,
#purchase-form-modal .pfm-textarea::placeholder {
    color: #7a8696 !important;
    opacity: 1 !important;
}

#purchase-form-modal .pfm-input.has-error,
#purchase-form-modal .pfm-select.has-error,
#purchase-form-modal .pfm-textarea.has-error {
    border-color:
        var(--pfm-red) !important;
}

#purchase-form-modal .pfm-input:disabled,
#purchase-form-modal .pfm-select:disabled,
#purchase-form-modal .pfm-textarea:disabled {
    color: #667085 !important;
    background: #f2f4f7 !important;
    cursor: not-allowed !important;
}

#purchase-form-modal .pfm-input:focus,
#purchase-form-modal .pfm-select:focus,
#purchase-form-modal .pfm-textarea:focus,
#purchase-form-modal button:focus-visible {
    outline: none !important;

    border-color:
        var(--pfm-green-700) !important;

    box-shadow:
        0 0 0 4px
        rgba(
            21,
            128,
            61,
            0.14
        ) !important;
}

#purchase-form-modal .pfm-field-error {
    display: flex !important;

    align-items: flex-start !important;
    gap: 4px !important;

    color: var(--pfm-red) !important;

    font-size: 10px !important;
    font-weight: 550 !important;
}

#purchase-form-modal
.pfm-field-error::before {
    content: "•" !important;
    font-weight: 800 !important;
}

#purchase-form-modal .pfm-help {
    display: flex !important;

    align-items: flex-start !important;
    gap: 4px !important;

    color: var(--pfm-muted) !important;

    font-size: 9px !important;
}

#purchase-form-modal .pfm-help svg {
    width: 12px !important;
    height: 12px !important;
    min-width: 12px !important;

    margin-top: 1px !important;
}

#purchase-form-modal .pfm-actions {
    display: flex !important;

    min-height: 66px !important;
    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 11px 15px !important;

    background: #ffffff !important;

    border-top:
        1px solid
        var(--pfm-border) !important;
}

#purchase-form-modal .pfm-action-note {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;
    gap: 6px !important;

    color: var(--pfm-muted) !important;

    font-size: 10px !important;
}

#purchase-form-modal .pfm-action-note svg {
    width: 14px !important;
    height: 14px !important;
    min-width: 14px !important;
}

#purchase-form-modal .pfm-action-buttons {
    display: flex !important;

    flex: 0 0 auto !important;

    align-items: center !important;
    gap: 8px !important;
}

#purchase-form-modal .pfm-button {
    display: inline-flex !important;

    min-height: 42px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;

    padding: 7px 12px !important;

    font-size: 13px !important;
    font-weight: 700 !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#purchase-form-modal .pfm-button svg {
    width: 16px !important;
    height: 16px !important;
}

#purchase-form-modal .pfm-button:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

#purchase-form-modal .pfm-cancel {
    color: var(--pfm-text-2) !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--pfm-border-strong) !important;
}

#purchase-form-modal .pfm-submit {
    color: #ffffff !important;

    background:
        var(--pfm-green-700) !important;

    border:
        1px solid
        var(--pfm-green-700) !important;

    box-shadow:
        0 4px 12px
        rgba(
            21,
            128,
            61,
            0.18
        ) !important;
}

#purchase-form-modal
.pfm-submit:hover:not(:disabled) {
    background:
        var(--pfm-green-800) !important;

    border-color:
        var(--pfm-green-800) !important;
}

#purchase-form-modal .pfm-spinner {
    width: 15px !important;
    height: 15px !important;

    border:
        2px solid
        rgba(
            255,
            255,
            255,
            0.45
        ) !important;

    border-top-color: #ffffff !important;

    border-radius: 50% !important;

    animation:
        pfm-spin
        700ms
        linear
        infinite !important;
}

@keyframes pfm-spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 1050px) {
    #purchase-form-modal .pfm-header-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #purchase-form-modal .pfm-notes-field {
        grid-column: 1 / -1 !important;
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
            minmax(220px, 1.4fr)
            repeat(
                2,
                minmax(110px, 0.7fr)
            ) !important;
    }

    #purchase-form-modal
    .pfm-item-main-grid
    .pfm-field:nth-child(4),
    #purchase-form-modal
    .pfm-item-main-grid
    .pfm-field:nth-child(5) {
        grid-row: 2 !important;
    }

    #purchase-form-modal .pfm-item-batch-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }
}

@media (max-width: 700px) {
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

        border-radius:
            16px
            16px
            0
            0 !important;
    }

    #purchase-form-modal .pfm-header {
        min-height: 72px !important;
        padding: 11px 13px !important;
    }

    #purchase-form-modal .pfm-title {
        font-size: 18px !important;
    }

    #purchase-form-modal .pfm-body {
        padding: 11px !important;
    }

    #purchase-form-modal .pfm-header-grid,
    #purchase-form-modal .pfm-item-main-grid,
    #purchase-form-modal .pfm-item-batch-grid,
    #purchase-form-modal .pfm-summary-column {
        grid-template-columns: 1fr !important;
    }

    #purchase-form-modal .pfm-notes-field {
        grid-column: auto !important;
    }

    #purchase-form-modal
    .pfm-item-main-grid
    .pfm-field:nth-child(4),
    #purchase-form-modal
    .pfm-item-main-grid
    .pfm-field:nth-child(5) {
        grid-row: auto !important;
    }

    #purchase-form-modal .pfm-section-header,
    #purchase-form-modal .pfm-item-header {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #purchase-form-modal .pfm-add-item,
    #purchase-form-modal .pfm-remove-item {
        width: 100% !important;
    }

    #purchase-form-modal .pfm-item-header-actions {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #purchase-form-modal .pfm-actions {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #purchase-form-modal .pfm-action-note {
        justify-content: center !important;
        text-align: center !important;
    }

    #purchase-form-modal .pfm-action-buttons {
        display: grid !important;

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

@media (max-width: 420px) {
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
        onCloseRef.current = onClose;
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

    const supplierError =
        getFieldError('supplier_id');

    const purchaseDateError =
        getFieldError('purchase_date');

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

                            <div className="pfm-header-copy">
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
                                Enter supplier and product
                                details. Save as a draft for
                                later receiving, or receive
                                the stock immediately.
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

                                        <div className="pfm-section-copy">
                                            <h3 className="pfm-section-title">
                                                Purchase Information
                                            </h3>

                                            <p className="pfm-section-description">
                                                Select the supplier and enter
                                                the document-level details.
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
                                                aria-describedby={
                                                    supplierError
                                                        ? 'purchase-supplier-error'
                                                        : undefined
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
                                            <p
                                                id="purchase-supplier-error"
                                                className="pfm-field-error"
                                            >
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
                                                value={
                                                    values.purchase_date
                                                }
                                                disabled={isSubmitting}
                                                required
                                                aria-invalid={
                                                    Boolean(
                                                        purchaseDateError,
                                                    )
                                                }
                                                aria-describedby={
                                                    purchaseDateError
                                                        ? 'purchase-date-error'
                                                        : undefined
                                                }
                                                onChange={(event) => {
                                                    onHeaderChange(
                                                        'purchase_date',
                                                        event.target.value,
                                                    );
                                                }}
                                            />
                                        </span>

                                        {purchaseDateError && (
                                            <p
                                                id="purchase-date-error"
                                                className="pfm-field-error"
                                            >
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
                                                {values
                                                    .supplier_invoice_number
                                                    .length}/120
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
                                                autoComplete="off"
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
                                                value={
                                                    values.additional_cost
                                                }
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
                                <section className="pfm-section pfm-items-section">
                                    <header className="pfm-section-header">
                                        <div className="pfm-section-heading">
                                            <span className="pfm-section-icon">
                                                <Icon name="package" />
                                            </span>

                                            <div className="pfm-section-copy">
                                                <h3 className="pfm-section-title">
                                                    Purchased Products
                                                </h3>

                                                <p className="pfm-section-description">
                                                    Each product line keeps its
                                                    own cost, selling price and
                                                    optional batch details.
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

                                                const lineTotal =
                                                    (
                                                        numberValue(
                                                            item.quantity,
                                                        )
                                                        * numberValue(
                                                            item.unit_cost,
                                                        )
                                                    )
                                                    - numberValue(
                                                        item.discount,
                                                    );

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
                                                                        selectedProduct?.name
                                                                        ?? 'Product not selected'
                                                                    }
                                                                >
                                                                    {selectedProduct?.name
                                                                        ?? 'Select a product'}
                                                                </strong>
                                                            </div>

                                                            <div className="pfm-item-header-actions">
                                                                <span className="pfm-line-total">
                                                                    Line Total:
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
                                                                        value={
                                                                            item.product_id
                                                                        }
                                                                        disabled={isSubmitting}
                                                                        required
                                                                        aria-invalid={
                                                                            Boolean(
                                                                                productError,
                                                                            )
                                                                        }
                                                                        onChange={(event) => {
                                                                            onItemChange(
                                                                                index,
                                                                                'product_id',
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
                                                                                    {product.category.name}
                                                                                </option>
                                                                            ),
                                                                        )}
                                                                    </select>

                                                                    {productError ? (
                                                                        <p className="pfm-field-error">
                                                                            {productError}
                                                                        </p>
                                                                    ) : (
                                                                        <span className="pfm-help">
                                                                            <Icon name="info" />

                                                                            Unit:
                                                                            {' '}

                                                                            {selectedProduct?.unit
                                                                                ?? 'Not selected'}
                                                                        </span>
                                                                    )}
                                                                </label>

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label">
                                                                        Quantity

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
                                                                        aria-invalid={
                                                                            Boolean(
                                                                                quantityError,
                                                                            )
                                                                        }
                                                                        onChange={(event) => {
                                                                            onItemChange(
                                                                                index,
                                                                                'quantity',
                                                                                event.target.value,
                                                                            );
                                                                        }}
                                                                    />

                                                                    {quantityError && (
                                                                        <p className="pfm-field-error">
                                                                            {quantityError}
                                                                        </p>
                                                                    )}
                                                                </label>

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label">
                                                                        Purchase Cost

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
                                                                            value={
                                                                                item.unit_cost
                                                                            }
                                                                            disabled={isSubmitting}
                                                                            required
                                                                            aria-invalid={
                                                                                Boolean(
                                                                                    unitCostError,
                                                                                )
                                                                            }
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
                                                                        Selling Price

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
                                                                            value={
                                                                                item.selling_price
                                                                            }
                                                                            disabled={isSubmitting}
                                                                            required
                                                                            aria-invalid={
                                                                                Boolean(
                                                                                    sellingPriceError,
                                                                                )
                                                                            }
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
                                                                            {item.batch_number.length}/120
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
                                                                        value={
                                                                            item.expiry_date
                                                                        }
                                                                        disabled={isSubmitting}
                                                                        aria-invalid={
                                                                            Boolean(
                                                                                expiryError,
                                                                            )
                                                                        }
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
                                                checked={
                                                    values.receive_now
                                                }
                                                disabled={isSubmitting}
                                                onChange={(event) => {
                                                    onHeaderChange(
                                                        'receive_now',
                                                        event.target.checked,
                                                    );
                                                }}
                                            />

                                            <span className="pfm-receive-copy">
                                                <strong className="pfm-receive-title">
                                                    <Icon name="truck" />

                                                    Receive Stock Now
                                                </strong>

                                                <span className="pfm-receive-description">
                                                    Makes the purchased
                                                    quantities available in
                                                    inventory immediately and
                                                    creates their stock-price
                                                    batches.
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
