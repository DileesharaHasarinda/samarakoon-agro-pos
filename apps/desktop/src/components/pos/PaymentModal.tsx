import {
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

import CustomerSelectModal
    from '../customers/CustomerSelectModal';

import type {
    Customer,
} from '../../types/customer';

import type {
    CompleteSaleValues,
    PosPaymentMethod,
    SaleSettlementType,
} from '../../types/sale';

interface PaymentModalProps {
    isOpen: boolean;
    grandTotal: number;
    discount: number;
    isSubmitting: boolean;
    errorMessage: string;
    onClose: () => void;

    onSubmit: (
        values: CompleteSaleValues,
    ) => void;
}

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

function getTodayDateValue(): string {
    const currentDate = new Date();

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

type IconName =
    | 'alert'
    | 'bank'
    | 'calendar'
    | 'card'
    | 'cash'
    | 'check'
    | 'close'
    | 'receipt'
    | 'user';

function Icon({
    name,
    className = '',
}: {
    name: IconName;
    className?: string;
}) {
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

        case 'bank':
            return (
                <svg {...commonProps}>
                    <path d="m3 9 9-5 9 5" />
                    <path d="M5 10v7M9 10v7M15 10v7M19 10v7" />
                    <path d="M3 20h18M4 17h16" />
                </svg>
            );

        case 'calendar':
            return (
                <svg {...commonProps}>
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="16"
                        rx="2"
                    />

                    <path d="M8 3v4M16 3v4M3 10h18" />
                </svg>
            );

        case 'card':
            return (
                <svg {...commonProps}>
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                    />

                    <path d="M3 10h18M7 15h4" />
                </svg>
            );

        case 'cash':
            return (
                <svg {...commonProps}>
                    <rect
                        x="3"
                        y="6"
                        width="18"
                        height="12"
                        rx="2"
                    />

                    <circle
                        cx="12"
                        cy="12"
                        r="2.5"
                    />

                    <path d="M7 9h.01M17 15h.01" />
                </svg>
            );

        case 'check':
            return (
                <svg {...commonProps}>
                    <path d="m5 12 4 4L19 6" />
                </svg>
            );

        case 'close':
            return (
                <svg {...commonProps}>
                    <path d="m6 6 12 12M18 6 6 18" />
                </svg>
            );

        case 'receipt':
            return (
                <svg {...commonProps}>
                    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
                    <path d="M9 8h6M9 12h6M9 16h3" />
                </svg>
            );

        case 'user':
        default:
            return (
                <svg {...commonProps}>
                    <circle
                        cx="12"
                        cy="8"
                        r="4"
                    />

                    <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
            );
    }
}

const paymentModalStyles = `
    #pos-payment-modal,
    #pos-payment-modal *,
    #pos-payment-modal *::before,
    #pos-payment-modal *::after {
        box-sizing: border-box !important;
    }

    #pos-payment-modal {
        --pay-green-950: #052e16;
        --pay-green-900: #14532d;
        --pay-green-800: #166534;
        --pay-green-700: #15803d;
        --pay-green-100: #dcfce7;
        --pay-green-50: #f0fdf4;

        --pay-blue-700: #175cd3;
        --pay-blue-50: #eff8ff;

        --pay-red-700: #b42318;
        --pay-red-50: #fef3f2;

        --pay-amber-700: #b54708;
        --pay-amber-50: #fffaeb;

        --pay-text: #101828;
        --pay-text-secondary: #344054;
        --pay-muted: #667085;
        --pay-border: #d0d9d2;
        --pay-border-strong: #aebdb2;
        --pay-surface: #ffffff;
        --pay-page: #f5f8f6;

        position: fixed !important;
        inset: 0 !important;

        z-index: 2147483646 !important;

        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;

        margin: 0 !important;
        padding: 0 !important;

        overflow: hidden !important;

        color: var(--pay-text) !important;

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
        -webkit-font-smoothing: antialiased !important;
    }

    #pos-payment-modal button,
    #pos-payment-modal input,
    #pos-payment-modal textarea {
        font: inherit !important;
        text-transform: none !important;
        letter-spacing: normal !important;
    }

    #pos-payment-modal h2,
    #pos-payment-modal h3,
    #pos-payment-modal p {
        margin: 0 !important;
    }

    #pos-payment-modal .payment-backdrop {
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
            rgba(3, 18, 10, 0.72) !important;

        backdrop-filter: blur(4px) !important;
    }

    #pos-payment-modal .payment-dialog {
        display: flex !important;

        width: min(820px, 100%) !important;
        max-height:
            calc(100dvh - 40px) !important;

        min-width: 0 !important;
        min-height: 0 !important;

        flex-direction: column !important;

        overflow: hidden !important;

        background: var(--pay-surface) !important;

        border:
            1px solid
            var(--pay-border) !important;

        border-radius: 16px !important;

        box-shadow:
            0 28px 72px
            rgba(0, 0, 0, 0.34) !important;
    }

    #pos-payment-modal .payment-header {
        display: grid !important;

        grid-template-columns:
            minmax(0, 1fr)
            auto
            40px !important;

        min-height: 88px !important;
        flex: 0 0 auto !important;

        align-items: center !important;
        gap: 16px !important;

        padding: 14px 18px !important;

        color: #ffffff !important;

        background:
            linear-gradient(
                135deg,
                var(--pay-green-900),
                var(--pay-green-700)
            ) !important;
    }

    #pos-payment-modal .payment-eyebrow {
        display: block !important;

        margin-bottom: 2px !important;

        color: #bbf7d0 !important;

        font-size: 11px !important;
        font-weight: 750 !important;
        letter-spacing: 0.055em !important;

        text-transform: uppercase !important;
    }

    #pos-payment-modal .payment-title {
        color: #ffffff !important;

        font-size: 22px !important;
        font-weight: 740 !important;
        line-height: 1.25 !important;
        letter-spacing: -0.02em !important;
    }

    #pos-payment-modal .payment-total-card {
        display: flex !important;

        min-width: 190px !important;

        flex-direction: column !important;
        align-items: flex-end !important;

        padding: 8px 11px !important;

        background:
            rgba(255, 255, 255, 0.12) !important;

        border:
            1px solid
            rgba(255, 255, 255, 0.21) !important;

        border-radius: 10px !important;
    }

    #pos-payment-modal .payment-total-card span {
        color: #d8f7e1 !important;

        font-size: 10px !important;
        font-weight: 700 !important;
        letter-spacing: 0.04em !important;

        text-transform: uppercase !important;
    }

    #pos-payment-modal .payment-total-card strong {
        margin-top: 1px !important;

        color: #ffffff !important;

        font-size: 19px !important;
        font-weight: 780 !important;
        line-height: 1.25 !important;

        white-space: nowrap !important;
    }

    #pos-payment-modal .payment-close {
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
            rgba(255, 255, 255, 0.34) !important;

        border-radius: 9px !important;

        cursor: pointer !important;
    }

    #pos-payment-modal
    .payment-close:hover:not(:disabled) {
        background:
            rgba(255, 255, 255, 0.22) !important;
    }

    #pos-payment-modal .payment-close:disabled {
        opacity: 0.55 !important;

        cursor: not-allowed !important;
    }

    #pos-payment-modal .payment-close svg {
        width: 19px !important;
        height: 19px !important;
    }

    #pos-payment-modal .payment-form {
        display: flex !important;

        min-height: 0 !important;
        flex: 1 1 auto !important;

        flex-direction: column !important;

        overflow: hidden !important;
    }

    #pos-payment-modal .payment-body {
        display: flex !important;

        min-height: 0 !important;
        flex: 1 1 auto !important;

        flex-direction: column !important;
        gap: 13px !important;

        padding: 16px 18px 20px !important;

        overflow-x: hidden !important;
        overflow-y: auto !important;

        background: var(--pay-page) !important;

        scrollbar-width: thin !important;

        scrollbar-color:
            #9cad9f
            #eaf0eb !important;
    }

    #pos-payment-modal .payment-error {
        display: flex !important;

        align-items: flex-start !important;
        gap: 9px !important;

        padding: 10px 12px !important;

        color: var(--pay-red-700) !important;

        font-size: 13px !important;
        font-weight: 600 !important;

        background: var(--pay-red-50) !important;

        border: 1px solid #f3b5af !important;
        border-radius: 9px !important;
    }

    #pos-payment-modal .payment-error svg {
        width: 18px !important;
        height: 18px !important;
        min-width: 18px !important;

        margin-top: 1px !important;
    }

    #pos-payment-modal .payment-section {
        padding: 15px !important;

        background: #ffffff !important;

        border:
            1px solid
            var(--pay-border) !important;

        border-radius: 12px !important;
    }

    #pos-payment-modal .payment-section-heading {
        display: flex !important;

        align-items: flex-start !important;
        gap: 10px !important;

        margin-bottom: 12px !important;
        padding-bottom: 11px !important;

        border-bottom:
            1px solid
            #e7ece8 !important;
    }

    #pos-payment-modal .payment-step-number {
        display: grid !important;

        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;

        place-items: center !important;

        color: #ffffff !important;

        font-size: 13px !important;
        font-weight: 750 !important;

        background: var(--pay-green-700) !important;

        border-radius: 8px !important;
    }

    #pos-payment-modal .payment-section-title {
        color: var(--pay-text) !important;

        font-size: 17px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
    }

    #pos-payment-modal .payment-section-help {
        margin-top: 2px !important;

        color: var(--pay-muted) !important;

        font-size: 12px !important;
        line-height: 1.45 !important;
    }

    #pos-payment-modal .payment-customer-card {
        display: flex !important;

        align-items: center !important;
        justify-content: space-between !important;
        gap: 14px !important;

        padding: 12px !important;

        background: var(--pay-green-50) !important;

        border: 1px solid #b8dfc3 !important;
        border-radius: 10px !important;
    }

    #pos-payment-modal .payment-customer-main {
        display: flex !important;

        min-width: 0 !important;
        flex: 1 1 auto !important;

        align-items: center !important;
        gap: 10px !important;
    }

    #pos-payment-modal .payment-customer-icon {
        display: grid !important;

        width: 38px !important;
        height: 38px !important;
        min-width: 38px !important;

        place-items: center !important;

        color: var(--pay-green-900) !important;

        background: #ffffff !important;

        border: 1px solid #b8dfc3 !important;
        border-radius: 9px !important;
    }

    #pos-payment-modal .payment-customer-icon svg {
        width: 18px !important;
        height: 18px !important;
    }

    #pos-payment-modal .payment-customer-copy {
        min-width: 0 !important;
    }

    #pos-payment-modal .payment-customer-label {
        display: block !important;

        color: var(--pay-muted) !important;

        font-size: 10px !important;
        font-weight: 700 !important;
        letter-spacing: 0.04em !important;

        text-transform: uppercase !important;
    }

    #pos-payment-modal .payment-customer-name {
        display: block !important;

        overflow: hidden !important;

        color: var(--pay-text) !important;

        font-size: 14px !important;
        font-weight: 700 !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #pos-payment-modal .payment-customer-mobile {
        display: block !important;

        overflow: hidden !important;

        color: var(--pay-muted) !important;

        font-size: 11px !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #pos-payment-modal .payment-customer-actions {
        display: flex !important;

        flex: 0 0 auto !important;

        align-items: center !important;
        gap: 7px !important;
    }

    #pos-payment-modal .payment-small-button {
        display: inline-flex !important;

        min-height: 36px !important;

        align-items: center !important;
        justify-content: center !important;

        padding: 7px 10px !important;

        font-size: 12px !important;
        font-weight: 650 !important;

        appearance: none !important;

        border-radius: 8px !important;

        cursor: pointer !important;
    }

    #pos-payment-modal .payment-select-customer {
        color: #ffffff !important;

        background: var(--pay-green-700) !important;

        border:
            1px solid
            var(--pay-green-700) !important;
    }

    #pos-payment-modal .payment-remove-customer {
        color: var(--pay-red-700) !important;

        background: #ffffff !important;

        border: 1px solid #efb8b3 !important;
    }

    #pos-payment-modal .payment-choice-grid {
        display: grid !important;

        grid-template-columns:
            repeat(
                3,
                minmax(0, 1fr)
            ) !important;

        gap: 9px !important;
    }

    #pos-payment-modal .payment-choice {
        display: flex !important;

        min-width: 0 !important;
        min-height: 52px !important;

        align-items: center !important;
        justify-content: center !important;
        gap: 7px !important;

        padding: 8px 9px !important;

        color: var(--pay-text-secondary) !important;

        font-size: 13px !important;
        font-weight: 650 !important;
        line-height: 1.25 !important;

        text-align: center !important;

        appearance: none !important;

        background: #f8faf9 !important;

        border:
            1px solid
            var(--pay-border-strong) !important;

        border-radius: 9px !important;

        cursor: pointer !important;
    }

    #pos-payment-modal
    .payment-choice:hover:not(:disabled) {
        border-color: var(--pay-green-700) !important;
    }

    #pos-payment-modal .payment-choice.active {
        color: #ffffff !important;

        background: var(--pay-green-700) !important;

        border-color: var(--pay-green-700) !important;

        box-shadow:
            0 4px 12px
            rgba(21, 128, 61, 0.16) !important;
    }

    #pos-payment-modal .payment-choice svg {
        width: 17px !important;
        height: 17px !important;
        flex: 0 0 17px !important;
    }

    #pos-payment-modal .payment-choice:disabled,
    #pos-payment-modal .payment-small-button:disabled {
        opacity: 0.55 !important;

        cursor: not-allowed !important;
    }

    #pos-payment-modal .payment-field {
        display: grid !important;

        gap: 5px !important;

        margin-top: 12px !important;
    }

    #pos-payment-modal .payment-field-label {
        color: var(--pay-text-secondary) !important;

        font-size: 12px !important;
        font-weight: 650 !important;
    }

    #pos-payment-modal .payment-required {
        color: var(--pay-red-700) !important;
    }

    #pos-payment-modal .payment-input,
    #pos-payment-modal .payment-textarea {
        display: block !important;

        width: 100% !important;
        min-width: 0 !important;

        color: var(--pay-text) !important;

        font-size: 14px !important;
        font-weight: 500 !important;

        outline: none !important;

        background: #ffffff !important;

        border:
            1px solid
            var(--pay-border-strong) !important;

        border-radius: 9px !important;
    }

    #pos-payment-modal .payment-input {
        height: 44px !important;
        min-height: 44px !important;

        padding: 0 11px !important;
    }

    #pos-payment-modal .payment-textarea {
        min-height: 82px !important;

        padding: 10px 11px !important;

        line-height: 1.45 !important;

        resize: vertical !important;
    }

    #pos-payment-modal .payment-input:focus,
    #pos-payment-modal .payment-textarea:focus,
    #pos-payment-modal button:focus-visible,
    #pos-payment-modal summary:focus-visible {
        outline: none !important;

        border-color: var(--pay-green-700) !important;

        box-shadow:
            0 0 0 4px
            rgba(21, 128, 61, 0.14) !important;
    }

    #pos-payment-modal .payment-input:disabled,
    #pos-payment-modal .payment-textarea:disabled {
        color: #667085 !important;

        background: #f2f4f7 !important;

        cursor: not-allowed !important;
    }

    #pos-payment-modal .payment-amount-layout {
        display: grid !important;

        grid-template-columns:
            minmax(0, 1fr)
            minmax(210px, 250px) !important;

        align-items: end !important;
        gap: 12px !important;
    }

    #pos-payment-modal .payment-amount-wrap {
        position: relative !important;
    }

    #pos-payment-modal .payment-currency {
        position: absolute !important;

        top: 50% !important;
        left: 11px !important;

        color: var(--pay-muted) !important;

        font-size: 12px !important;
        font-weight: 700 !important;

        transform: translateY(-50%) !important;

        pointer-events: none !important;
    }

    #pos-payment-modal .payment-amount-input {
        height: 48px !important;
        min-height: 48px !important;

        padding-left: 47px !important;

        font-size: 17px !important;
        font-weight: 750 !important;
    }

    #pos-payment-modal .payment-use-total {
        display: inline-flex !important;

        min-height: 44px !important;

        align-items: center !important;
        justify-content: center !important;
        gap: 7px !important;

        padding: 8px 11px !important;

        color: var(--pay-green-900) !important;

        font-size: 12px !important;
        font-weight: 700 !important;

        appearance: none !important;

        background: var(--pay-green-50) !important;

        border: 1px solid #b8dfc3 !important;
        border-radius: 9px !important;

        cursor: pointer !important;
    }

    #pos-payment-modal
    .payment-use-total:hover:not(:disabled) {
        color: #ffffff !important;

        background: var(--pay-green-800) !important;

        border-color: var(--pay-green-800) !important;
    }

    #pos-payment-modal .payment-use-total svg {
        width: 16px !important;
        height: 16px !important;
    }

    #pos-payment-modal .payment-due-message {
        display: block !important;

        margin-top: 7px !important;

        color: var(--pay-muted) !important;

        font-size: 11px !important;
    }

    #pos-payment-modal .payment-status-grid {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;

        gap: 8px !important;

        margin-top: 11px !important;
    }

    #pos-payment-modal .payment-status {
        display: flex !important;

        min-width: 0 !important;
        min-height: 56px !important;

        flex-direction: column !important;
        justify-content: center !important;
        gap: 2px !important;

        padding: 9px 10px !important;

        border:
            1px solid
            transparent !important;

        border-radius: 9px !important;
    }

    #pos-payment-modal .payment-status span {
        font-size: 10px !important;
        font-weight: 700 !important;
        letter-spacing: 0.035em !important;

        text-transform: uppercase !important;
    }

    #pos-payment-modal .payment-status strong {
        overflow: hidden !important;

        font-size: 14px !important;
        font-weight: 750 !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #pos-payment-modal .payment-status.danger {
        color: var(--pay-red-700) !important;

        background: var(--pay-red-50) !important;

        border-color: #f3b5af !important;
    }

    #pos-payment-modal .payment-status.success {
        color: var(--pay-green-900) !important;

        background: var(--pay-green-50) !important;

        border-color: #b8dfc3 !important;
    }

    #pos-payment-modal .payment-status.change {
        color: var(--pay-blue-700) !important;

        background: var(--pay-blue-50) !important;

        border-color: #b9d8f5 !important;
    }

    #pos-payment-modal .payment-status.warning {
        color: var(--pay-amber-700) !important;

        background: var(--pay-amber-50) !important;

        border-color: #f0d48f !important;
    }

    #pos-payment-modal .payment-optional {
        overflow: hidden !important;

        background: #ffffff !important;

        border:
            1px solid
            var(--pay-border) !important;

        border-radius: 12px !important;
    }

    #pos-payment-modal .payment-optional-summary {
        position: relative !important;

        display: block !important;

        padding:
            12px
            38px
            12px
            14px !important;

        color: var(--pay-text-secondary) !important;

        font-size: 13px !important;
        font-weight: 650 !important;

        cursor: pointer !important;

        list-style: none !important;
    }

    #pos-payment-modal
    .payment-optional-summary::-webkit-details-marker {
        display: none !important;
    }

    #pos-payment-modal
    .payment-optional-summary::after {
        position: absolute !important;

        top: 50% !important;
        right: 15px !important;

        content: "+" !important;

        color: var(--pay-green-800) !important;

        font-size: 19px !important;
        font-weight: 600 !important;

        transform: translateY(-50%) !important;
    }

    #pos-payment-modal
    .payment-optional[open]
    .payment-optional-summary::after {
        content: "−" !important;
    }

    #pos-payment-modal .payment-optional-content {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;

        gap: 11px !important;

        padding:
            0
            14px
            14px !important;

        border-top:
            1px solid
            #e7ece8 !important;
    }

    #pos-payment-modal
    .payment-optional-content
    .payment-field {
        margin-top: 12px !important;
    }

    #pos-payment-modal .payment-actions {
        display: flex !important;

        min-height: 68px !important;
        flex: 0 0 auto !important;

        align-items: center !important;
        justify-content: flex-end !important;
        gap: 9px !important;

        padding: 12px 18px !important;

        background: #ffffff !important;

        border-top:
            1px solid
            var(--pay-border) !important;
    }

    #pos-payment-modal .payment-button {
        display: inline-flex !important;

        min-height: 42px !important;

        align-items: center !important;
        justify-content: center !important;
        gap: 7px !important;

        padding: 8px 13px !important;

        font-size: 13px !important;
        font-weight: 700 !important;

        appearance: none !important;

        border-radius: 9px !important;

        cursor: pointer !important;
    }

    #pos-payment-modal .payment-cancel {
        color: var(--pay-text-secondary) !important;

        background: #ffffff !important;

        border:
            1px solid
            var(--pay-border-strong) !important;
    }

    #pos-payment-modal .payment-complete {
        color: #ffffff !important;

        background: var(--pay-green-700) !important;

        border:
            1px solid
            var(--pay-green-700) !important;

        box-shadow:
            0 4px 12px
            rgba(21, 128, 61, 0.18) !important;
    }

    #pos-payment-modal
    .payment-complete:hover:not(:disabled) {
        background: var(--pay-green-800) !important;

        border-color: var(--pay-green-800) !important;
    }

    #pos-payment-modal .payment-button:disabled {
        opacity: 0.55 !important;

        cursor: not-allowed !important;
    }

    #pos-payment-modal .payment-button svg {
        width: 17px !important;
        height: 17px !important;
    }

    @media (max-width: 720px) {
        #pos-payment-modal .payment-backdrop {
            align-items: flex-end !important;

            padding: 0 !important;
        }

        #pos-payment-modal .payment-dialog {
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

        #pos-payment-modal .payment-header {
            grid-template-columns:
                minmax(0, 1fr)
                40px !important;

            min-height: 78px !important;

            padding: 12px 14px !important;
        }

        #pos-payment-modal .payment-total-card {
            grid-column: 1 / -1 !important;
            grid-row: 2 !important;

            width: 100% !important;
            min-width: 0 !important;

            align-items: flex-start !important;
        }

        #pos-payment-modal .payment-close {
            grid-column: 2 !important;
            grid-row: 1 !important;
        }

        #pos-payment-modal .payment-body {
            padding: 13px !important;
        }

        #pos-payment-modal .payment-section {
            padding: 14px !important;
        }

        #pos-payment-modal .payment-customer-card {
            align-items: stretch !important;
            flex-direction: column !important;
        }

        #pos-payment-modal .payment-customer-actions {
            display: grid !important;

            grid-template-columns:
                repeat(
                    2,
                    minmax(0, 1fr)
                ) !important;
        }

        #pos-payment-modal .payment-small-button {
            width: 100% !important;
        }

        #pos-payment-modal .payment-choice-grid {
            grid-template-columns: 1fr !important;
        }

        #pos-payment-modal .payment-amount-layout {
            grid-template-columns: 1fr !important;
        }

        #pos-payment-modal .payment-status-grid,
        #pos-payment-modal .payment-optional-content {
            grid-template-columns: 1fr !important;
        }

        #pos-payment-modal .payment-actions {
            display: grid !important;

            grid-template-columns:
                repeat(
                    2,
                    minmax(0, 1fr)
                ) !important;

            padding: 11px 13px !important;
        }

        #pos-payment-modal .payment-button {
            width: 100% !important;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        #pos-payment-modal *,
        #pos-payment-modal *::before,
        #pos-payment-modal *::after {
            transition: none !important;
            scroll-behavior: auto !important;
        }
    }
`;

export default function PaymentModal({
    isOpen,
    grandTotal,
    discount,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: PaymentModalProps) {
    const amountInputRef =
        useRef<HTMLInputElement | null>(null);

    const [
        selectedCustomer,
        setSelectedCustomer,
    ] = useState<Customer | null>(null);

    const [
        customerModalOpen,
        setCustomerModalOpen,
    ] = useState(false);

    const [
        settlementType,
        setSettlementType,
    ] = useState<SaleSettlementType>(
        'full',
    );

    const [
        paymentMethod,
        setPaymentMethod,
    ] = useState<PosPaymentMethod>(
        'cash',
    );

    const [
        amountReceived,
        setAmountReceived,
    ] = useState('0');

    const [
        dueDate,
        setDueDate,
    ] = useState('');

    const [
        referenceNumber,
        setReferenceNumber,
    ] = useState('');

    const [
        notes,
        setNotes,
    ] = useState('');

    const [
        localError,
        setLocalError,
    ] = useState('');

    const minimumDueDate = useMemo(
        () => getTodayDateValue(),
        [],
    );

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setSelectedCustomer(null);
        setCustomerModalOpen(false);
        setSettlementType('full');
        setPaymentMethod('cash');
        setAmountReceived('0');
        setDueDate('');
        setReferenceNumber('');
        setNotes('');
        setLocalError('');
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousBodyOverflow =
            document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        const focusTimeout = window.setTimeout(
            () => {
                if (!customerModalOpen) {
                    amountInputRef.current?.focus();
                    amountInputRef.current?.select();
                }
            },
            90,
        );

        const handleKeyDown = (
            event: KeyboardEvent,
        ): void => {
            if (
                event.key === 'Escape'
                && !customerModalOpen
                && !isSubmitting
            ) {
                onClose();
            }
        };

        window.addEventListener(
            'keydown',
            handleKeyDown,
        );

        return () => {
            window.clearTimeout(focusTimeout);

            document.body.style.overflow =
                previousBodyOverflow;

            window.removeEventListener(
                'keydown',
                handleKeyDown,
            );
        };
    }, [
        isOpen,
        customerModalOpen,
        isSubmitting,
        onClose,
    ]);

    const numericAmount = Number(
        amountReceived || 0,
    );

    const validReceivedAmount =
        Number.isFinite(numericAmount)
            ? Math.max(0, numericAmount)
            : 0;

    const displayedReceivedAmount =
        settlementType === 'due'
            ? 0
            : validReceivedAmount;

    const balanceToReceive = useMemo(
        () => (
            Math.max(
                0,
                grandTotal
                - displayedReceivedAmount,
            )
        ),
        [
            displayedReceivedAmount,
            grandTotal,
        ],
    );

    const dueAmount = useMemo(
        () => (
            settlementType === 'full'
                ? 0
                : balanceToReceive
        ),
        [
            balanceToReceive,
            settlementType,
        ],
    );

    const changeAmount = useMemo(
        () => {
            if (
                settlementType !== 'full'
                || paymentMethod !== 'cash'
            ) {
                return 0;
            }

            return Math.max(
                0,
                displayedReceivedAmount
                - grandTotal,
            );
        },
        [
            displayedReceivedAmount,
            grandTotal,
            paymentMethod,
            settlementType,
        ],
    );

    if (
        !isOpen
        || typeof document === 'undefined'
    ) {
        return null;
    }

    const changeSettlementType = (
        nextType: SaleSettlementType,
    ): void => {
        setSettlementType(nextType);
        setLocalError('');

        if (nextType === 'full') {
            setDueDate('');

            setAmountReceived(
                paymentMethod === 'cash'
                    ? '0'
                    : grandTotal.toFixed(2),
            );
        }

        if (nextType === 'partial') {
            setAmountReceived('0');
        }

        if (nextType === 'due') {
            setAmountReceived('0');
        }
    };

    const changePaymentMethod = (
        nextMethod: PosPaymentMethod,
    ): void => {
        setPaymentMethod(nextMethod);
        setLocalError('');

        if (settlementType === 'full') {
            setAmountReceived(
                nextMethod === 'cash'
                    ? '0'
                    : grandTotal.toFixed(2),
            );
        }
    };

    const handleClose = (): void => {
        if (isSubmitting) {
            return;
        }

        setCustomerModalOpen(false);
        onClose();
    };

    const useAmountDue = (): void => {
        setAmountReceived(
            settlementType === 'partial'
                ? Math.max(
                    0,
                    grandTotal - 0.01,
                ).toFixed(2)
                : grandTotal.toFixed(2),
        );

        setLocalError('');

        window.setTimeout(
            () => {
                amountInputRef.current?.focus();
                amountInputRef.current?.select();
            },
            50,
        );
    };

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        setLocalError('');

        if (
            (
                settlementType === 'partial'
                || settlementType === 'due'
            )
            && !selectedCustomer
        ) {
            setLocalError(
                'Select a registered customer for a partial or due sale.',
            );

            return;
        }

        if (
            settlementType !== 'full'
            && !dueDate
        ) {
            setLocalError(
                'Select the due date.',
            );

            return;
        }

        if (
            settlementType !== 'due'
            && (
                !Number.isFinite(numericAmount)
                || numericAmount < 0
            )
        ) {
            setLocalError(
                'Enter a valid received amount.',
            );

            amountInputRef.current?.focus();

            return;
        }

        if (
            settlementType === 'partial'
            && numericAmount <= 0
        ) {
            setLocalError(
                'The received amount must be greater than zero for a partial payment.',
            );

            amountInputRef.current?.focus();

            return;
        }

        if (
            settlementType === 'partial'
            && numericAmount >= grandTotal
        ) {
            setLocalError(
                'For a partial payment, the received amount must be less than the grand total.',
            );

            amountInputRef.current?.focus();

            return;
        }

        if (
            settlementType === 'full'
            && paymentMethod === 'cash'
            && numericAmount < grandTotal
        ) {
            setLocalError(
                `Receive another ${currencyFormatter.format(
                    balanceToReceive,
                )} before completing the sale.`,
            );

            amountInputRef.current?.focus();

            return;
        }

        if (
            settlementType === 'full'
            && paymentMethod !== 'cash'
            && Math.abs(
                numericAmount - grandTotal,
            ) > 0.01
        ) {
            setLocalError(
                'For card or bank-transfer payments, the received amount must equal the grand total.',
            );

            amountInputRef.current?.focus();

            return;
        }

        onSubmit({
            customer_id:
                selectedCustomer?.id
                ?? null,

            settlement_type:
                settlementType,

            discount,

            payment_method:
                settlementType === 'due'
                    ? null
                    : paymentMethod,

            amount_received:
                settlementType === 'due'
                    ? 0
                    : numericAmount,

            due_date:
                settlementType === 'full'
                    ? ''
                    : dueDate,

            reference_number:
                referenceNumber.trim(),

            notes:
                notes.trim(),
        });
    };

    const paymentModal = customerModalOpen
        ? null
        : createPortal(
            <div id="pos-payment-modal">
                <style>
                    {paymentModalStyles}
                </style>

                <div
                    className="payment-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (
                            event.target
                            === event.currentTarget
                            && !isSubmitting
                        ) {
                            handleClose();
                        }
                    }}
                >
                    <section
                        className="payment-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="payment-dialog-title"
                    >
                        <header className="payment-header">
                            <div>
                                <span className="payment-eyebrow">
                                    Checkout
                                </span>

                                <h2
                                    id="payment-dialog-title"
                                    className="payment-title"
                                >
                                    Complete Sale
                                </h2>
                            </div>

                            <div className="payment-total-card">
                                <span>
                                    Amount due
                                </span>

                                <strong>
                                    {currencyFormatter.format(
                                        grandTotal,
                                    )}
                                </strong>
                            </div>

                            <button
                                type="button"
                                className="payment-close"
                                aria-label="Close payment window"
                                disabled={isSubmitting}
                                onClick={handleClose}
                            >
                                <Icon name="close" />
                            </button>
                        </header>

                        <form
                            className="payment-form"
                            onSubmit={handleSubmit}
                        >
                            <div className="payment-body">
                                {(localError
                                    || errorMessage) && (
                                        <div
                                            className="payment-error"
                                            role="alert"
                                        >
                                            <Icon name="alert" />

                                            <span>
                                                {localError
                                                    || errorMessage}
                                            </span>
                                        </div>
                                    )}

                                <section className="payment-section">
                                    <div className="payment-section-heading">
                                        <span className="payment-step-number">
                                            1
                                        </span>

                                        <div>
                                            <h3 className="payment-section-title">
                                                Customer
                                            </h3>

                                            <p className="payment-section-help">
                                                A registered customer
                                                is required only for
                                                partial payments and
                                                due sales.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="payment-customer-card">
                                        <div className="payment-customer-main">
                                            <span className="payment-customer-icon">
                                                <Icon name="user" />
                                            </span>

                                            <div className="payment-customer-copy">
                                                <span className="payment-customer-label">
                                                    Current customer
                                                </span>

                                                <strong className="payment-customer-name">
                                                    {selectedCustomer
                                                        ?.name
                                                        ?? 'Walk-in Customer'}
                                                </strong>

                                                <span className="payment-customer-mobile">
                                                    {selectedCustomer
                                                        ?.mobile
                                                        ?? 'No registered customer selected'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="payment-customer-actions">
                                            <button
                                                type="button"
                                                className="payment-small-button payment-select-customer"
                                                disabled={
                                                    isSubmitting
                                                }
                                                onClick={() => {
                                                    setCustomerModalOpen(
                                                        true,
                                                    );
                                                }}
                                            >
                                                {selectedCustomer
                                                    ? 'Change'
                                                    : 'Select Customer'}
                                            </button>

                                            {selectedCustomer && (
                                                <button
                                                    type="button"
                                                    className="payment-small-button payment-remove-customer"
                                                    disabled={
                                                        isSubmitting
                                                    }
                                                    onClick={() => {
                                                        setSelectedCustomer(
                                                            null,
                                                        );

                                                        setLocalError(
                                                            '',
                                                        );
                                                    }}
                                                >
                                                    Use Walk-in
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                <section className="payment-section">
                                    <div className="payment-section-heading">
                                        <span className="payment-step-number">
                                            2
                                        </span>

                                        <div>
                                            <h3 className="payment-section-title">
                                                Sale settlement
                                            </h3>

                                            <p className="payment-section-help">
                                                Choose whether the
                                                customer pays now,
                                                pays partly, or places
                                                the entire sale on due.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="payment-choice-grid">
                                        <button
                                            type="button"
                                            className={
                                                settlementType
                                                    === 'full'
                                                    ? 'payment-choice active'
                                                    : 'payment-choice'
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onClick={() => {
                                                changeSettlementType(
                                                    'full',
                                                );
                                            }}
                                        >
                                            Full Payment
                                        </button>

                                        <button
                                            type="button"
                                            className={
                                                settlementType
                                                    === 'partial'
                                                    ? 'payment-choice active'
                                                    : 'payment-choice'
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onClick={() => {
                                                changeSettlementType(
                                                    'partial',
                                                );
                                            }}
                                        >
                                            Partial Payment
                                        </button>

                                        <button
                                            type="button"
                                            className={
                                                settlementType
                                                    === 'due'
                                                    ? 'payment-choice active'
                                                    : 'payment-choice'
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onClick={() => {
                                                changeSettlementType(
                                                    'due',
                                                );
                                            }}
                                        >
                                            Entire Sale on Due
                                        </button>
                                    </div>

                                    {settlementType !== 'full' && (
                                        <label className="payment-field">
                                            <span className="payment-field-label">
                                                Due Date
                                                {' '}

                                                <strong className="payment-required">
                                                    *
                                                </strong>
                                            </span>

                                            <input
                                                type="date"
                                                className="payment-input"
                                                value={dueDate}
                                                min={minimumDueDate}
                                                disabled={
                                                    isSubmitting
                                                }
                                                onChange={(event) => {
                                                    setDueDate(
                                                        event
                                                            .target
                                                            .value,
                                                    );

                                                    setLocalError(
                                                        '',
                                                    );
                                                }}
                                            />
                                        </label>
                                    )}
                                </section>

                                {settlementType !== 'due' && (
                                    <section className="payment-section">
                                        <div className="payment-section-heading">
                                            <span className="payment-step-number">
                                                3
                                            </span>

                                            <div>
                                                <h3 className="payment-section-title">
                                                    Payment method
                                                </h3>

                                                <p className="payment-section-help">
                                                    Select how the
                                                    current payment is
                                                    being received.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="payment-choice-grid">
                                            <button
                                                type="button"
                                                className={
                                                    paymentMethod
                                                        === 'cash'
                                                        ? 'payment-choice active'
                                                        : 'payment-choice'
                                                }
                                                disabled={
                                                    isSubmitting
                                                }
                                                onClick={() => {
                                                    changePaymentMethod(
                                                        'cash',
                                                    );
                                                }}
                                            >
                                                <Icon name="cash" />

                                                Cash
                                            </button>

                                            <button
                                                type="button"
                                                className={
                                                    paymentMethod
                                                        === 'card'
                                                        ? 'payment-choice active'
                                                        : 'payment-choice'
                                                }
                                                disabled={
                                                    isSubmitting
                                                }
                                                onClick={() => {
                                                    changePaymentMethod(
                                                        'card',
                                                    );
                                                }}
                                            >
                                                <Icon name="card" />

                                                Card
                                            </button>

                                            <button
                                                type="button"
                                                className={
                                                    paymentMethod
                                                        === 'bank_transfer'
                                                        ? 'payment-choice active'
                                                        : 'payment-choice'
                                                }
                                                disabled={
                                                    isSubmitting
                                                }
                                                onClick={() => {
                                                    changePaymentMethod(
                                                        'bank_transfer',
                                                    );
                                                }}
                                            >
                                                <Icon name="bank" />

                                                Bank Transfer
                                            </button>
                                        </div>
                                    </section>
                                )}

                                <section className="payment-section">
                                    <div className="payment-section-heading">
                                        <span className="payment-step-number">
                                            {settlementType
                                                === 'due'
                                                ? '3'
                                                : '4'}
                                        </span>

                                        <div>
                                            <h3 className="payment-section-title">
                                                Received amount
                                            </h3>

                                            <p className="payment-section-help">
                                                Enter the amount
                                                actually received from
                                                the customer for this
                                                sale.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="payment-amount-layout">
                                        <label className="payment-field">
                                            <span className="payment-field-label">
                                                Amount Received (LKR)
                                            </span>

                                            <span className="payment-amount-wrap">
                                                <span className="payment-currency">
                                                    LKR
                                                </span>

                                                <input
                                                    ref={
                                                        amountInputRef
                                                    }
                                                    type="number"
                                                    className="payment-input payment-amount-input"
                                                    min="0"
                                                    step="0.01"
                                                    inputMode="decimal"
                                                    value={
                                                        amountReceived
                                                    }
                                                    disabled={
                                                        isSubmitting
                                                        || settlementType
                                                        === 'due'
                                                    }
                                                    onFocus={(event) => {
                                                        event
                                                            .currentTarget
                                                            .select();
                                                    }}
                                                    onChange={(event) => {
                                                        setAmountReceived(
                                                            event
                                                                .target
                                                                .value,
                                                        );

                                                        setLocalError(
                                                            '',
                                                        );
                                                    }}
                                                />
                                            </span>
                                        </label>

                                        {settlementType !== 'due' && (
                                            <button
                                                type="button"
                                                className="payment-use-total"
                                                disabled={
                                                    isSubmitting
                                                }
                                                onClick={
                                                    useAmountDue
                                                }
                                            >
                                                <Icon name="check" />

                                                {settlementType
                                                    === 'partial'
                                                    ? 'Set Maximum Partial'
                                                    : 'Use Exact Total'}
                                            </button>
                                        )}
                                    </div>

                                    {settlementType === 'due' && (
                                        <span className="payment-due-message">
                                            No payment is collected
                                            now. The full amount will
                                            be recorded as customer
                                            due.
                                        </span>
                                    )}

                                    <div className="payment-status-grid">
                                        {settlementType === 'full'
                                            && balanceToReceive > 0 && (
                                                <div className="payment-status danger">
                                                    <span>
                                                        Still to receive
                                                    </span>

                                                    <strong>
                                                        {currencyFormatter.format(
                                                            balanceToReceive,
                                                        )}
                                                    </strong>
                                                </div>
                                            )}

                                        {settlementType === 'full'
                                            && balanceToReceive === 0
                                            && changeAmount === 0 && (
                                                <div className="payment-status success">
                                                    <span>
                                                        Payment status
                                                    </span>

                                                    <strong>
                                                        Amount is correct
                                                    </strong>
                                                </div>
                                            )}

                                        {settlementType === 'full'
                                            && paymentMethod === 'cash'
                                            && changeAmount > 0 && (
                                                <div className="payment-status change">
                                                    <span>
                                                        Customer change
                                                    </span>

                                                    <strong>
                                                        {currencyFormatter.format(
                                                            changeAmount,
                                                        )}
                                                    </strong>
                                                </div>
                                            )}

                                        {settlementType !== 'full' && (
                                            <div className="payment-status warning">
                                                <span>
                                                    Due amount
                                                </span>

                                                <strong>
                                                    {currencyFormatter.format(
                                                        dueAmount,
                                                    )}
                                                </strong>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <details className="payment-optional">
                                    <summary className="payment-optional-summary">
                                        Optional reference and notes
                                    </summary>

                                    <div className="payment-optional-content">
                                        <label className="payment-field">
                                            <span className="payment-field-label">
                                                Reference Number
                                            </span>

                                            <input
                                                type="text"
                                                className="payment-input"
                                                value={
                                                    referenceNumber
                                                }
                                                disabled={
                                                    isSubmitting
                                                }
                                                maxLength={100}
                                                placeholder="Card slip or bank reference"
                                                onChange={(event) => {
                                                    setReferenceNumber(
                                                        event
                                                            .target
                                                            .value,
                                                    );
                                                }}
                                            />
                                        </label>

                                        <label className="payment-field">
                                            <span className="payment-field-label">
                                                Notes
                                            </span>

                                            <textarea
                                                className="payment-textarea"
                                                rows={3}
                                                value={notes}
                                                disabled={
                                                    isSubmitting
                                                }
                                                maxLength={500}
                                                placeholder="Optional sale notes"
                                                onChange={(event) => {
                                                    setNotes(
                                                        event
                                                            .target
                                                            .value,
                                                    );
                                                }}
                                            />
                                        </label>
                                    </div>
                                </details>
                            </div>

                            <footer className="payment-actions">
                                <button
                                    type="button"
                                    className="payment-button payment-cancel"
                                    disabled={isSubmitting}
                                    onClick={handleClose}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="payment-button payment-complete"
                                    disabled={isSubmitting}
                                >
                                    <Icon name="receipt" />

                                    {isSubmitting
                                        ? 'Completing Sale...'
                                        : 'Complete Sale'}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            </div>,
            document.body,
        );

    return (
        <>
            {paymentModal}

            <CustomerSelectModal
                isOpen={customerModalOpen}
                selectedCustomer={selectedCustomer}
                onClose={() => {
                    setCustomerModalOpen(false);
                }}
                onSelect={(customer) => {
                    setSelectedCustomer(customer);
                    setCustomerModalOpen(false);
                    setLocalError('');
                }}
            />
        </>
    );
}