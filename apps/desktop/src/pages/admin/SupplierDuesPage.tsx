import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import ConfigurePurchaseSettlementModal
    from '../../components/suppliers/ConfigurePurchaseSettlementModal';

import RecordSupplierPaymentModal
    from '../../components/suppliers/RecordSupplierPaymentModal';

import {
    ApiError,
} from '../../lib/api';

import {
    configurePurchaseSettlement,
    getSupplierPayables,
    recordSupplierPayment,
} from '../../services/supplierPayableService';

import type {
    ConfigurePurchaseSettlementInput,
    SupplierPayable,
    SupplierPayableSummary,
    SupplierPaymentInput,
} from '../../types/supplierPayable';

import type {
    PosPaginationMeta,
} from '../../types/sale';

const money = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const emptySummary: SupplierPayableSummary = {
    total_purchases: 0,
    unconfigured_purchases: 0,
    outstanding_purchases: 0,
    outstanding_due: 0,
    overdue_due: 0,
    total_paid: 0,
};

const emptyPagination: PosPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: null,
    to: null,
};

type IconName =
    | 'alert'
    | 'calendar'
    | 'check'
    | 'close'
    | 'left'
    | 'money'
    | 'refresh'
    | 'right'
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

        case 'close':
            return (
                <svg {...props}>
                    <path d="m6 6 12 12M18 6 6 18" />
                </svg>
            );

        case 'left':
            return (
                <svg {...props}>
                    <path d="m15 18-6-6 6-6" />
                </svg>
            );

        case 'money':
            return (
                <svg {...props}>
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

        case 'refresh':
            return (
                <svg {...props}>
                    <path d="M20 11a8 8 0 1 0 2 5M20 4v7h-7" />
                </svg>
            );

        case 'right':
            return (
                <svg {...props}>
                    <path d="m9 18 6-6-6-6" />
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

        default:
            return (
                <svg {...props}>
                    <circle
                        cx="12"
                        cy="12"
                        r="3"
                    />
                    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
                </svg>
            );
    }
}

function formatDate(
    value: string | null,
): string {
    if (!value) {
        return 'Not configured';
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

function statusDetails(
    purchase: SupplierPayable,
): {
    label: string;
    className: string;
} {
    if (purchase.is_overdue) {
        return {
            label: 'Overdue',
            className: 'overdue',
        };
    }

    switch (purchase.payment_status) {
        case 'unconfigured':
            return {
                label: 'Needs Setup',
                className: 'setup',
            };

        case 'partial':
            return {
                label: 'Partially Paid',
                className: 'partial',
            };

        case 'due':
            return {
                label: 'Payment Due',
                className: 'due',
            };

        default:
            return {
                label: 'Paid',
                className: 'paid',
            };
    }
}

/*
 * This style block also contains the portal modal styles.
 * Keep it inside SupplierDuesPage.tsx.
 */
const styles = `
#supplier-dues-page,
#supplier-dues-page *,
#supplier-dues-page *::before,
#supplier-dues-page *::after,
#supplier-settlement-modal,
#supplier-settlement-modal *,
#supplier-settlement-modal *::before,
#supplier-settlement-modal *::after,
#supplier-payment-modal,
#supplier-payment-modal *,
#supplier-payment-modal *::before,
#supplier-payment-modal *::after {
    box-sizing: border-box !important;
}

#supplier-dues-page {
    --green950: #052e16;
    --green900: #14532d;
    --green800: #166534;
    --green700: #15803d;
    --green100: #dcfce7;
    --green50: #f0fdf4;
    --blue: #175cd3;
    --blue50: #eff8ff;
    --amber: #b54708;
    --amber50: #fffaeb;
    --red: #b42318;
    --red50: #fef3f2;
    --purple: #6941c6;
    --purple50: #f4f3ff;
    --text: #101828;
    --text2: #344054;
    --muted: #667085;
    --border: #d0d9d2;
    --border2: #aebdb2;

    position: relative !important;
    display: flex !important;
    width: 100% !important;

    height:
        calc(100dvh - 96px) !important;

    min-width: 0 !important;
    min-height: 0 !important;

    max-height:
        calc(100dvh - 96px) !important;

    flex: 1 1 auto !important;
    flex-direction: column !important;
    gap: 14px !important;

    margin: 0 !important;
    padding: 0 8px 12px 0 !important;

    overflow: hidden !important;

    color: var(--text) !important;

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
}

#supplier-dues-page button,
#supplier-dues-page input,
#supplier-dues-page select {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#supplier-dues-page h1,
#supplier-dues-page p {
    margin: 0 !important;
}

#supplier-dues-page button:focus-visible,
#supplier-dues-page input:focus,
#supplier-dues-page select:focus {
    outline: none !important;

    border-color:
        var(--green700) !important;

    box-shadow:
        0 0 0 4px
        rgba(
            21,
            128,
            61,
            0.14
        ) !important;
}

#supplier-dues-page .sdp-header {
    display: flex !important;
    flex-shrink: 0 !important;
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
        var(--border) !important;

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

.sdp-kicker {
    display: block !important;
    margin-bottom: 3px !important;

    color: var(--green700) !important;

    font-size: 11px !important;
    font-weight: 750 !important;
    letter-spacing: 0.055em !important;

    text-transform: uppercase !important;
}

.sdp-title {
    font-size: 24px !important;
    font-weight: 740 !important;
    line-height: 1.2 !important;
    letter-spacing: -0.02em !important;
}

.sdp-subtitle {
    margin-top: 4px !important;

    color: var(--muted) !important;
    font-size: 13px !important;
}

#supplier-dues-page .sdp-btn {
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

.sdp-btn svg {
    width: 16px !important;
    height: 16px !important;
}

.sdp-btn:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

.sdp-primary {
    color: #ffffff !important;
    background: var(--green700) !important;
    border: 1px solid var(--green700) !important;
}

.sdp-primary:hover:not(:disabled) {
    background: var(--green800) !important;
}

.sdp-secondary {
    color: var(--green900) !important;
    background: #ffffff !important;
    border: 1px solid #b8dfc3 !important;
}

.sdp-secondary:hover:not(:disabled) {
    color: #ffffff !important;
    background: var(--green800) !important;
}

.sdp-blue {
    color: var(--blue) !important;
    background: var(--blue50) !important;
    border: 1px solid #b9d8f5 !important;
}

.sdp-blue:hover:not(:disabled) {
    color: #ffffff !important;
    background: var(--blue) !important;
}

#supplier-dues-page .sdp-summary {
    display: grid !important;
    flex-shrink: 0 !important;

    grid-template-columns:
        repeat(
            5,
            minmax(0, 1fr)
        ) !important;

    gap: 10px !important;
}

.sdp-summary-card {
    position: relative !important;
    min-width: 0 !important;
    min-height: 92px !important;

    padding:
        13px
        14px
        13px
        18px !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 11px !important;

    box-shadow:
        0 1px 2px
        rgba(
            16,
            24,
            40,
            0.04
        ) !important;
}

.sdp-summary-card::before {
    position: absolute !important;
    inset: 0 auto 0 0 !important;
    width: 4px !important;
    content: "" !important;
    background: var(--green700) !important;
}

.sdp-summary-card.setup::before {
    background: var(--purple) !important;
}

.sdp-summary-card.outstanding::before {
    background: var(--amber) !important;
}

.sdp-summary-card.overdue::before {
    background: var(--red) !important;
}

.sdp-summary-card.paid::before {
    background: var(--blue) !important;
}

.sdp-summary-label {
    display: block !important;

    color: var(--muted) !important;

    font-size: 11px !important;
    font-weight: 650 !important;
}

.sdp-summary-value {
    display: block !important;
    margin-top: 3px !important;

    overflow: hidden !important;

    color: var(--green900) !important;

    font-size: 20px !important;
    font-weight: 750 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

.setup .sdp-summary-value {
    color: var(--purple) !important;
}

.outstanding .sdp-summary-value {
    color: var(--amber) !important;
}

.overdue .sdp-summary-value {
    color: var(--red) !important;
}

.paid .sdp-summary-value {
    color: var(--blue) !important;
}

#supplier-dues-page .sdp-message {
    display: flex !important;
    flex-shrink: 0 !important;
    min-height: 48px !important;

    align-items: center !important;
    gap: 9px !important;

    padding: 10px 12px !important;

    font-size: 13px !important;
    font-weight: 600 !important;

    border-radius: 10px !important;
}

.sdp-message.success {
    color: var(--green900) !important;
    background: var(--green50) !important;
    border: 1px solid #b8dfc3 !important;
}

.sdp-message.error {
    color: var(--red) !important;
    background: var(--red50) !important;
    border: 1px solid #f3b5af !important;
}

.sdp-message > svg {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
}

.sdp-message-text {
    min-width: 0 !important;
    flex: 1 !important;
}

.sdp-message-close {
    display: grid !important;
    width: 32px !important;
    height: 32px !important;

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

.sdp-message-close svg {
    width: 14px !important;
    height: 14px !important;
}

.sdp-retry {
    min-height: 34px !important;
    padding: 5px 8px !important;
    font-size: 12px !important;
}

#supplier-dues-page .sdp-panel {
    display: flex !important;
    min-width: 0 !important;
    flex: 1 1 auto !important;
    min-height: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

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

#supplier-dues-page .sdp-toolbar {
    display: grid !important;
    flex-shrink: 0 !important;

    grid-template-columns:
        minmax(260px, 1fr)
        minmax(170px, 220px)
        96px
        auto !important;

    align-items: end !important;
    gap: 10px !important;

    padding: 13px !important;

    border-bottom:
        1px solid
        var(--border) !important;
}

.sdp-field {
    display: grid !important;
    gap: 5px !important;
}

.sdp-label {
    color: var(--text2) !important;
    font-size: 11px !important;
    font-weight: 650 !important;
}

.sdp-search {
    position: relative !important;
}

.sdp-search-icon {
    position: absolute !important;
    top: 50% !important;
    left: 12px !important;

    display: grid !important;
    width: 18px !important;
    height: 18px !important;

    place-items: center !important;

    color: var(--muted) !important;

    transform:
        translateY(-50%) !important;

    pointer-events: none !important;
}

.sdp-search-icon svg {
    width: 18px !important;
    height: 18px !important;
}

.sdp-input,
.sdp-select {
    display: block !important;
    width: 100% !important;
    height: 42px !important;

    color: var(--text) !important;

    font-size: 14px !important;
    font-weight: 500 !important;

    outline: none !important;
    background: #ffffff !important;

    border:
        1px solid
        var(--border2) !important;

    border-radius: 9px !important;
}

.sdp-input {
    padding:
        0 42px 0 40px !important;

    background: #f8faf9 !important;
}

.sdp-input::placeholder {
    color: #7a8696 !important;
    opacity: 1 !important;
}

.sdp-select {
    padding: 0 9px !important;
    cursor: pointer !important;
}

.sdp-clear {
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

    transform:
        translateY(-50%) !important;

    cursor: pointer !important;
}

.sdp-clear:hover {
    background: #eaf0ec !important;
}

.sdp-clear svg {
    width: 16px !important;
    height: 16px !important;
}

.sdp-clear-filters {
    min-height: 42px !important;
    white-space: nowrap !important;
}

/* ---------- The row list is now the only scrolling
   region inside the panel — toolbar and pagination
   stay fixed above and below it. ---------- */
#supplier-dues-page .sdp-list {
    display: flex !important;
    min-width: 0 !important;
    flex: 1 1 auto !important;
    min-height: 0 !important;

    flex-direction: column !important;
    gap: 8px !important;

    padding: 10px !important;

    overflow-x: hidden !important;
    overflow-y: auto !important;

    background: #f5f8f6 !important;

    scrollbar-width: thin !important;
    scrollbar-color:
        #89a091
        #e8eeea !important;
}

#supplier-dues-page .sdp-list::-webkit-scrollbar {
    width: 10px !important;
}

#supplier-dues-page .sdp-list::-webkit-scrollbar-track {
    background: #e8eeea !important;
    border-radius: 999px !important;
}

#supplier-dues-page .sdp-list::-webkit-scrollbar-thumb {
    background: #89a091 !important;

    border:
        2px solid
        #e8eeea !important;

    border-radius: 999px !important;
}

.sdp-list-head,
.sdp-row {
    display: grid !important;

    grid-template-columns:
        minmax(185px, 1.1fr)
        minmax(150px, 0.9fr)
        minmax(270px, 1.5fr)
        minmax(145px, 0.8fr)
        minmax(190px, auto) !important;

    gap: 12px !important;
    align-items: center !important;
}

.sdp-list-head {
    padding: 0 12px 2px !important;

    color: var(--muted) !important;

    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.04em !important;

    text-transform: uppercase !important;
}

.sdp-row {
    min-width: 0 !important;
    padding: 11px 12px !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

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

.sdp-row:hover {
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

.sdp-identity {
    display: flex !important;
    min-width: 0 !important;

    align-items: center !important;
    gap: 9px !important;
}

.sdp-record-icon {
    display: grid !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;

    place-items: center !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            145deg,
            var(--green900),
            var(--green700)
        ) !important;

    border-radius: 10px !important;
}

.sdp-record-icon svg {
    width: 18px !important;
    height: 18px !important;
}

.sdp-copy,
.sdp-cell {
    min-width: 0 !important;
}

.sdp-number {
    display: block !important;

    overflow: hidden !important;

    font-size: 14px !important;
    font-weight: 700 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

.sdp-small {
    display: block !important;
    margin-top: 2px !important;

    overflow: hidden !important;

    color: var(--muted) !important;
    font-size: 10px !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

.sdp-value {
    display: block !important;

    overflow: hidden !important;

    color: var(--text2) !important;

    font-size: 12px !important;
    font-weight: 550 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

.sdp-value.strong {
    color: var(--text) !important;
    font-size: 13px !important;
    font-weight: 700 !important;
}

.sdp-meta {
    display: flex !important;

    align-items: center !important;
    gap: 4px !important;

    color: var(--muted) !important;
    font-size: 10px !important;
}

.sdp-meta svg {
    width: 12px !important;
    height: 12px !important;
}

.sdp-money-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            3,
            minmax(0, 1fr)
        ) !important;

    gap: 6px !important;
}

.sdp-money-box {
    min-width: 0 !important;
    padding: 7px 8px !important;

    background: #f8faf9 !important;

    border:
        1px solid
        #e4e9e5 !important;

    border-radius: 8px !important;
}

.sdp-money-box span {
    display: block !important;

    color: var(--muted) !important;

    font-size: 9px !important;
    font-weight: 650 !important;
}

.sdp-money-box strong {
    display: block !important;
    margin-top: 1px !important;

    overflow: hidden !important;

    color: var(--text2) !important;

    font-size: 11px !important;
    font-weight: 700 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

.sdp-money-box.due strong {
    color: var(--red) !important;
}

.sdp-status {
    display: inline-flex !important;
    min-height: 28px !important;

    align-items: center !important;
    gap: 5px !important;

    margin-top: 5px !important;
    padding: 4px 8px !important;

    font-size: 10px !important;
    font-weight: 700 !important;

    border-radius: 999px !important;
}

.sdp-status.setup {
    color: var(--purple) !important;
    background: var(--purple50) !important;
    border: 1px solid #cfc9f7 !important;
}

.sdp-status.partial,
.sdp-status.due {
    color: var(--amber) !important;
    background: var(--amber50) !important;
    border: 1px solid #f0d48f !important;
}

.sdp-status.overdue {
    color: var(--red) !important;
    background: var(--red50) !important;
    border: 1px solid #f3b5af !important;
}

.sdp-status.paid {
    color: var(--green900) !important;
    background: var(--green50) !important;
    border: 1px solid #b8dfc3 !important;
}

.sdp-status svg {
    width: 13px !important;
    height: 13px !important;
}

.sdp-mobile-label {
    display: none !important;
}

.sdp-actions {
    display: flex !important;

    align-items: center !important;
    justify-content: flex-end !important;
    gap: 6px !important;
}

.sdp-action {
    min-height: 34px !important;
    padding: 5px 8px !important;
    font-size: 11px !important;
}

.sdp-paid {
    display: inline-flex !important;
    min-height: 34px !important;

    align-items: center !important;
    gap: 5px !important;

    padding: 5px 8px !important;

    color: var(--green900) !important;

    font-size: 11px !important;
    font-weight: 650 !important;

    background: var(--green50) !important;
    border: 1px solid #b8dfc3 !important;
    border-radius: 8px !important;
}

.sdp-paid svg {
    width: 14px !important;
    height: 14px !important;
}

.sdp-state {
    display: flex !important;
    min-height: 280px !important;

    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 8px !important;

    padding: 28px !important;

    color: var(--muted) !important;
    text-align: center !important;
}

.sdp-state-icon {
    display: grid !important;
    width: 48px !important;
    height: 48px !important;

    place-items: center !important;

    color: var(--green700) !important;
    background: var(--green50) !important;

    border: 1px solid #b8dfc3 !important;
    border-radius: 11px !important;
}

.sdp-state-icon svg {
    width: 23px !important;
    height: 23px !important;
}

.sdp-state strong {
    color: var(--text) !important;
    font-size: 16px !important;
}

.sdp-state span {
    max-width: 440px !important;
    font-size: 12px !important;
}

.sdp-spinner {
    width: 36px !important;
    height: 36px !important;

    border:
        4px solid
        var(--green100) !important;

    border-top-color:
        var(--green700) !important;

    border-radius: 50% !important;

    animation:
        sdp-spin
        0.7s
        linear
        infinite !important;
}

@keyframes sdp-spin {
    to {
        transform: rotate(360deg);
    }
}

#supplier-dues-page .sdp-pagination {
    display: flex !important;
    flex-shrink: 0 !important;
    min-height: 62px !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 10px 14px !important;

    border-top:
        1px solid
        var(--border) !important;
}

.sdp-pagination p {
    color: var(--muted) !important;
    font-size: 12px !important;
}

.sdp-pagination strong {
    color: var(--text2) !important;
}

.sdp-pages {
    display: flex !important;
    align-items: center !important;
    gap: 7px !important;
}

.sdp-page-number {
    display: inline-flex !important;
    min-height: 36px !important;

    align-items: center !important;

    padding: 6px 9px !important;

    color: var(--text2) !important;

    font-size: 11px !important;
    font-weight: 600 !important;

    background: #f8faf9 !important;
    border: 1px solid #e4e9e5 !important;
    border-radius: 8px !important;
}

.sdp-page-btn {
    min-height: 36px !important;
    padding: 6px 9px !important;
    font-size: 12px !important;
}

/* Shared portal modal styles */
#supplier-settlement-modal,
#supplier-payment-modal {
    --m-green950: #052e16;
    --m-green900: #14532d;
    --m-green800: #166534;
    --m-green700: #15803d;
    --m-green100: #dcfce7;
    --m-green50: #f0fdf4;
    --m-blue: #175cd3;
    --m-blue50: #eff8ff;
    --m-amber: #b54708;
    --m-amber50: #fffaeb;
    --m-red: #b42318;
    --m-red50: #fef3f2;
    --m-text: #101828;
    --m-text2: #344054;
    --m-muted: #667085;
    --m-border: #d0d9d2;
    --m-border2: #aebdb2;

    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;

    width: 100vw !important;
    height: 100dvh !important;

    overflow: hidden !important;

    color: var(--m-text) !important;

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
}

.apm-backdrop {
    position: absolute !important;
    inset: 0 !important;

    display: flex !important;
    align-items: center !important;
    justify-content: center !important;

    padding: 20px !important;
    overflow: auto !important;

    background:
        rgba(
            3,
            18,
            10,
            0.72
        ) !important;

    backdrop-filter:
        blur(4px) !important;
}

.apm-dialog {
    display: flex !important;
    width: min(700px, 100%) !important;

    max-height:
        calc(100dvh - 40px) !important;

    min-height: 0 !important;

    flex-direction: column !important;
    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--m-border) !important;

    border-radius: 16px !important;

    box-shadow:
        0 28px 72px
        rgba(
            0,
            0,
            0,
            0.34
        ) !important;
}

.apm-dialog.payment {
    width: min(600px, 100%) !important;
}

.apm-header {
    display: flex !important;
    min-height: 82px !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 16px !important;

    padding: 14px 17px !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--m-green950),
            var(--m-green700)
        ) !important;
}

.apm-head-main {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 11px !important;
}

.apm-head-icon {
    display: grid !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;

    place-items: center !important;

    color: var(--m-green900) !important;
    background: #ffffff !important;

    border-radius: 10px !important;
}

.apm-head-icon svg {
    width: 20px !important;
    height: 20px !important;
}

.apm-head-copy {
    min-width: 0 !important;
}

.apm-kicker {
    display: block !important;

    color: #bbf7d0 !important;

    font-size: 10px !important;
    font-weight: 750 !important;
    letter-spacing: 0.055em !important;

    text-transform: uppercase !important;
}

.apm-title {
    overflow: hidden !important;

    color: #ffffff !important;

    font-size: 20px !important;
    font-weight: 740 !important;
    line-height: 1.25 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

.apm-subtitle {
    overflow: hidden !important;

    color: #d1fae5 !important;
    font-size: 11px !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

.apm-close {
    display: grid !important;
    width: 40px !important;
    height: 40px !important;

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

.apm-close:disabled {
    opacity: 0.55 !important;
}

.apm-close svg {
    width: 18px !important;
    height: 18px !important;
}

.apm-form {
    display: flex !important;
    min-height: 0 !important;
    flex: 1 !important;

    flex-direction: column !important;
    overflow: hidden !important;
}

.apm-body {
    display: flex !important;
    min-height: 0 !important;
    flex: 1 !important;

    flex-direction: column !important;
    gap: 13px !important;

    padding: 16px !important;
    overflow-y: auto !important;

    background: #f5f8f6 !important;
}

.apm-alert {
    display: flex !important;
    align-items: flex-start !important;
    gap: 8px !important;

    padding: 9px 11px !important;

    color: var(--m-red) !important;

    font-size: 12px !important;
    font-weight: 600 !important;

    background: var(--m-red50) !important;
    border: 1px solid #f3b5af !important;
    border-radius: 9px !important;
}

.apm-alert svg {
    width: 17px !important;
    height: 17px !important;
    min-width: 17px !important;
}

.apm-help {
    display: flex !important;
    align-items: flex-start !important;
    gap: 5px !important;

    color: var(--m-muted) !important;
    font-size: 10px !important;
}

.apm-help svg {
    width: 13px !important;
    height: 13px !important;
    min-width: 13px !important;
}

.apm-total {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 16px !important;

    padding: 13px 14px !important;

    background:
        linear-gradient(
            135deg,
            var(--m-green50),
            #ffffff
        ) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 11px !important;
}

.apm-total.warning {
    background:
        linear-gradient(
            135deg,
            var(--m-amber50),
            #ffffff
        ) !important;

    border-color: #f0d48f !important;
}

.apm-total span {
    display: block !important;

    color: #477054 !important;

    font-size: 11px !important;
    font-weight: 650 !important;
}

.apm-total.warning span {
    color: #7a4a13 !important;
}

.apm-total strong {
    display: block !important;
    margin-top: 2px !important;

    color: var(--m-green900) !important;

    font-size: 22px !important;
    font-weight: 760 !important;
}

.apm-total.warning strong {
    color: var(--m-amber) !important;
}

.apm-total svg {
    width: 28px !important;
    height: 28px !important;
    color: var(--m-green700) !important;
}

.apm-total.warning svg {
    color: var(--m-amber) !important;
}

.apm-section {
    display: flex !important;

    flex-direction: column !important;
    gap: 11px !important;

    padding: 13px !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--m-border) !important;

    border-radius: 11px !important;
}

.apm-section h3 {
    margin: 0 !important;

    color: var(--m-text2) !important;
    font-size: 13px !important;
}

.apm-section > div > p {
    margin: 1px 0 0 !important;

    color: var(--m-muted) !important;
    font-size: 10px !important;
}

.apm-type-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            3,
            minmax(0, 1fr)
        ) !important;

    gap: 8px !important;
}

.apm-type {
    position: relative !important;
    display: flex !important;
    min-height: 86px !important;

    flex-direction: column !important;
    gap: 3px !important;

    padding: 11px !important;

    background: #f8faf9 !important;

    border:
        1px solid
        #dfe6e1 !important;

    border-radius: 9px !important;
    cursor: pointer !important;
}

.apm-type:has(input:checked) {
    color: var(--m-green900) !important;
    background: var(--m-green50) !important;
    border-color: #8fc29d !important;

    box-shadow:
        0 0 0 2px
        rgba(
            21,
            128,
            61,
            0.08
        ) !important;
}

.apm-type input {
    position: absolute !important;
    top: 9px !important;
    right: 9px !important;

    width: 16px !important;
    height: 16px !important;

    accent-color:
        var(--m-green700) !important;
}

.apm-type strong {
    padding-right: 22px !important;
    font-size: 12px !important;
}

.apm-type span {
    color: var(--m-muted) !important;
    font-size: 10px !important;
}

.apm-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            2,
            minmax(0, 1fr)
        ) !important;

    gap: 11px !important;
}

.apm-field {
    display: grid !important;
    min-width: 0 !important;
    gap: 5px !important;
}

.apm-field.full {
    grid-column: 1 / -1 !important;
}

.apm-label {
    color: var(--m-text2) !important;

    font-size: 12px !important;
    font-weight: 650 !important;
}

.apm-required {
    color: var(--m-red) !important;
}

.apm-optional {
    margin-left: 4px !important;
    padding: 1px 4px !important;

    color: var(--m-muted) !important;

    font-size: 9px !important;

    background: #f2f4f7 !important;
    border-radius: 999px !important;
}

.apm-wrap {
    position: relative !important;
}

.apm-icon {
    position: absolute !important;
    top: 50% !important;
    left: 11px !important;

    display: grid !important;
    width: 16px !important;
    height: 16px !important;

    color: var(--m-muted) !important;

    transform:
        translateY(-50%) !important;

    pointer-events: none !important;
}

.apm-icon.top {
    top: 12px !important;
    transform: none !important;
}

.apm-icon svg {
    width: 16px !important;
    height: 16px !important;
}

.apm-input,
.apm-select,
.apm-textarea {
    display: block !important;
    width: 100% !important;

    color: var(--m-text) !important;

    font-size: 14px !important;
    font-weight: 500 !important;

    outline: none !important;
    background: #ffffff !important;

    border:
        1px solid
        var(--m-border2) !important;

    border-radius: 9px !important;
}

.apm-input,
.apm-select {
    height: 44px !important;
    padding: 0 11px 0 36px !important;
}

.apm-textarea {
    min-height: 92px !important;

    padding:
        9px 11px 9px 36px !important;

    resize: vertical !important;
}

.apm-input::placeholder,
.apm-textarea::placeholder {
    color: #7a8696 !important;
}

.apm-input:focus,
.apm-select:focus,
.apm-textarea:focus,
.apm-button:focus-visible,
.apm-close:focus-visible {
    border-color:
        var(--m-green700) !important;

    box-shadow:
        0 0 0 4px
        rgba(
            21,
            128,
            61,
            0.14
        ) !important;

    outline: none !important;
}

.apm-input:disabled,
.apm-select:disabled,
.apm-textarea:disabled {
    background: #f2f4f7 !important;
}

.apm-summary {
    display: grid !important;

    grid-template-columns:
        repeat(
            2,
            minmax(0, 1fr)
        ) !important;

    gap: 8px !important;
}

.apm-summary > div {
    padding: 9px 10px !important;

    background: #f8faf9 !important;

    border:
        1px solid
        #e1e7e2 !important;

    border-radius: 8px !important;
}

.apm-summary span {
    display: block !important;

    color: var(--m-muted) !important;

    font-size: 10px !important;
    font-weight: 650 !important;
}

.apm-summary strong {
    display: block !important;
    margin-top: 2px !important;

    color: var(--m-text2) !important;
    font-size: 14px !important;
}

.apm-summary .remaining strong {
    color: var(--m-amber) !important;
}

.apm-amount-row {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;

    color: var(--m-muted) !important;
    font-size: 10px !important;
}

.apm-use-full {
    min-height: 30px !important;
    padding: 4px 7px !important;

    color: var(--m-blue) !important;

    font-size: 10px !important;
    font-weight: 700 !important;

    background: var(--m-blue50) !important;
    border: 1px solid #b9d8f5 !important;
    border-radius: 7px !important;

    cursor: pointer !important;
}

.apm-actions {
    display: flex !important;
    min-height: 66px !important;

    align-items: center !important;
    justify-content: flex-end !important;
    gap: 8px !important;

    padding: 11px 16px !important;

    background: #ffffff !important;

    border-top:
        1px solid
        var(--m-border) !important;
}

.apm-button {
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

.apm-button svg {
    width: 16px !important;
    height: 16px !important;
}

.apm-cancel {
    color: var(--m-text2) !important;
    background: #ffffff !important;
    border: 1px solid var(--m-border2) !important;
}

.apm-submit {
    color: #ffffff !important;
    background: var(--m-green700) !important;
    border: 1px solid var(--m-green700) !important;
}

.apm-button:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

.apm-spinner {
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
        apm-spin
        0.7s
        linear
        infinite !important;
}

@keyframes apm-spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 1180px) {
    .sdp-summary {
        grid-template-columns:
            repeat(
                3,
                minmax(0, 1fr)
            ) !important;
    }

    .sdp-list-head {
        display: none !important;
    }

    .sdp-row {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;

        align-items: start !important;
    }

    .sdp-identity,
    .sdp-money-cell,
    .sdp-actions {
        grid-column: 1 / -1 !important;
    }

    .sdp-mobile-label {
        display: block !important;

        margin-bottom: 3px !important;

        color: var(--muted) !important;

        font-size: 9px !important;
        font-weight: 700 !important;

        text-transform: uppercase !important;
    }

    .sdp-actions {
        justify-content: flex-start !important;
    }
}

@media (max-width: 850px) {
    #supplier-dues-page .sdp-toolbar {
        grid-template-columns:
            1fr 1fr !important;
    }
}

@media (max-width: 700px) {
    #supplier-dues-page {
        height:
            calc(100dvh - 72px) !important;

        max-height:
            calc(100dvh - 72px) !important;

        padding-right: 4px !important;
    }

    .sdp-header {
        align-items: stretch !important;
        flex-direction: column !important;
        padding: 15px !important;
    }

    .sdp-title {
        font-size: 21px !important;
    }

    .sdp-header .sdp-btn {
        width: 100% !important;
    }

    .sdp-summary,
    #supplier-dues-page .sdp-toolbar,
    .sdp-row,
    .sdp-money-grid {
        grid-template-columns: 1fr !important;
    }

    .sdp-actions {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    .sdp-action,
    .sdp-paid {
        width: 100% !important;
    }

    .sdp-paid {
        grid-column: 1 / -1 !important;
    }

    #supplier-dues-page .sdp-pagination {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    .sdp-pages {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    .sdp-page-number {
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;

        justify-content: center !important;
    }

    .sdp-page-btn {
        width: 100% !important;
    }

    .apm-backdrop {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    .apm-dialog,
    .apm-dialog.payment {
        width: 100% !important;
        max-height: 96dvh !important;

        border-radius:
            16px 16px 0 0 !important;
    }

    .apm-header {
        min-height: 76px !important;
        padding: 12px 13px !important;
    }

    .apm-title {
        font-size: 18px !important;
    }

    .apm-body {
        padding: 12px !important;
    }

    .apm-type-grid,
    .apm-grid,
    .apm-summary {
        grid-template-columns: 1fr !important;
    }

    .apm-field.full {
        grid-column: auto !important;
    }

    .apm-actions {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;

        padding: 10px 12px !important;
    }

    .apm-button {
        width: 100% !important;
    }
}

@media (max-width: 420px) {
    .sdp-actions,
    .apm-actions {
        grid-template-columns: 1fr !important;
    }

    .apm-amount-row {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    .apm-use-full {
        width: 100% !important;
    }
}
`;

export default function SupplierDuesPage() {
    const {
        token,
    } = useAuth();

    const searchRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const requestRef =
        useRef(0);

    const [
        purchases,
        setPurchases,
    ] = useState<SupplierPayable[]>([]);

    const [
        summary,
        setSummary,
    ] = useState(emptySummary);

    const [
        pagination,
        setPagination,
    ] = useState(emptyPagination);

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
        settlementPurchase,
        setSettlementPurchase,
    ] = useState<SupplierPayable | null>(
        null,
    );

    const [
        paymentPurchase,
        setPaymentPurchase,
    ] = useState<SupplierPayable | null>(
        null,
    );

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        modalError,
        setModalError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const loadPurchases =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    setIsLoading(false);
                    return;
                }

                const requestId =
                    ++requestRef.current;

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getSupplierPayables(
                            token,
                            {
                                search,
                                status,
                                page,
                                perPage,
                            },
                        );

                    if (
                        requestRef.current
                        !== requestId
                    ) {
                        return;
                    }

                    setPurchases(
                        response.data,
                    );

                    setSummary(
                        response.summary,
                    );

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    if (
                        requestRef.current
                        !== requestId
                    ) {
                        return;
                    }

                    setPurchases([]);

                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load supplier dues.',
                    );
                } finally {
                    if (
                        requestRef.current
                        === requestId
                    ) {
                        setIsLoading(false);
                    }
                }
            },
            [
                token,
                search,
                status,
                page,
                perPage,
            ],
        );

    useEffect(() => {
        void loadPurchases();
    }, [loadPurchases]);

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
            window.clearTimeout(timeout);
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
            window.clearTimeout(timeout);
        };
    }, [successMessage]);

    const saveSettlement =
        async (
            values:
                ConfigurePurchaseSettlementInput,
        ): Promise<void> => {
            if (
                !token
                || !settlementPurchase
                || isSubmitting
            ) {
                return;
            }

            setIsSubmitting(true);
            setModalError('');

            try {
                const response =
                    await configurePurchaseSettlement(
                        token,
                        settlementPurchase.id,
                        values,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Settlement configured successfully.',
                );

                setSettlementPurchase(null);

                await loadPurchases();
            } catch (error) {
                setModalError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to configure the settlement.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const savePayment =
        async (
            values:
                SupplierPaymentInput,
        ): Promise<void> => {
            if (
                !token
                || !paymentPurchase
                || isSubmitting
            ) {
                return;
            }

            setIsSubmitting(true);
            setModalError('');

            try {
                const response =
                    await recordSupplierPayment(
                        token,
                        paymentPurchase.id,
                        values,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Supplier payment recorded successfully.',
                );

                setPaymentPurchase(null);

                await loadPurchases();
            } catch (error) {
                setModalError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to record the supplier payment.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const clearFilters = (): void => {
        setSearchInput('');
        setSearch('');
        setStatus('all');
        setPage(1);

        searchRef.current?.focus();
    };

    const hasFilters =
        Boolean(searchInput)
        || status !== 'all';

    return (
        <div id="supplier-dues-page">
            <style>
                {styles}
            </style>

            <header className="sdp-header">
                <div>
                    <span className="sdp-kicker">
                        Accounts Payable
                    </span>

                    <h1 className="sdp-title">
                        Supplier Dues
                    </h1>

                    <p className="sdp-subtitle">
                        Configure purchase settlements,
                        monitor due dates and record
                        supplier payments.
                    </p>
                </div>

                <button
                    type="button"
                    className="sdp-btn sdp-secondary"
                    disabled={isLoading}
                    onClick={() => {
                        void loadPurchases();
                    }}
                >
                    <Icon name="refresh" />

                    Refresh
                </button>
            </header>

            <section
                className="sdp-summary"
                aria-label="Supplier due summary"
            >
                <article className="sdp-summary-card setup">
                    <span className="sdp-summary-label">
                        Needs Payment Setup
                    </span>

                    <strong className="sdp-summary-value">
                        {summary.unconfigured_purchases}
                    </strong>
                </article>

                <article className="sdp-summary-card outstanding">
                    <span className="sdp-summary-label">
                        Outstanding Purchases
                    </span>

                    <strong className="sdp-summary-value">
                        {summary.outstanding_purchases}
                    </strong>
                </article>

                <article className="sdp-summary-card outstanding">
                    <span className="sdp-summary-label">
                        Outstanding Due
                    </span>

                    <strong className="sdp-summary-value">
                        {money.format(
                            Number(
                                summary.outstanding_due,
                            ),
                        )}
                    </strong>
                </article>

                <article className="sdp-summary-card overdue">
                    <span className="sdp-summary-label">
                        Overdue Amount
                    </span>

                    <strong className="sdp-summary-value">
                        {money.format(
                            Number(
                                summary.overdue_due,
                            ),
                        )}
                    </strong>
                </article>

                <article className="sdp-summary-card paid">
                    <span className="sdp-summary-label">
                        Total Paid
                    </span>

                    <strong className="sdp-summary-value">
                        {money.format(
                            Number(
                                summary.total_paid,
                            ),
                        )}
                    </strong>
                </article>
            </section>

            {successMessage && (
                <div
                    className="sdp-message success"
                    role="status"
                >
                    <Icon name="check" />

                    <span className="sdp-message-text">
                        {successMessage}
                    </span>

                    <button
                        type="button"
                        className="sdp-message-close"
                        aria-label="Close message"
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
                    className="sdp-message error"
                    role="alert"
                >
                    <Icon name="alert" />

                    <span className="sdp-message-text">
                        {pageError}
                    </span>

                    <button
                        type="button"
                        className="sdp-btn sdp-secondary sdp-retry"
                        onClick={() => {
                            void loadPurchases();
                        }}
                    >
                        <Icon name="refresh" />

                        Retry
                    </button>
                </div>
            )}

            <section className="sdp-panel">
                <div className="sdp-toolbar">
                    <label className="sdp-field">
                        <span className="sdp-label">
                            Search Payables
                        </span>

                        <span className="sdp-search">
                            <span className="sdp-search-icon">
                                <Icon name="search" />
                            </span>

                            <input
                                ref={searchRef}
                                type="search"
                                className="sdp-input"
                                value={searchInput}
                                autoComplete="off"
                                placeholder="Purchase number or supplier name"
                                onChange={(event) => {
                                    setSearchInput(
                                        event.target.value,
                                    );
                                }}
                            />

                            {searchInput && (
                                <button
                                    type="button"
                                    className="sdp-clear"
                                    aria-label="Clear search"
                                    onClick={() => {
                                        setSearchInput('');
                                        setSearch('');
                                        setPage(1);

                                        searchRef.current
                                            ?.focus();
                                    }}
                                >
                                    <Icon name="close" />
                                </button>
                            )}
                        </span>
                    </label>

                    <label className="sdp-field">
                        <span className="sdp-label">
                            Payment Status
                        </span>

                        <select
                            className="sdp-select"
                            value={status}
                            onChange={(event) => {
                                setStatus(
                                    event.target.value,
                                );

                                setPage(1);
                            }}
                        >
                            <option value="all">
                                All Purchases
                            </option>

                            <option value="unconfigured">
                                Needs Setup
                            </option>

                            <option value="outstanding">
                                Outstanding
                            </option>

                            <option value="overdue">
                                Overdue
                            </option>

                            <option value="paid">
                                Paid
                            </option>
                        </select>
                    </label>

                    <label className="sdp-field">
                        <span className="sdp-label">
                            Rows
                        </span>

                        <select
                            className="sdp-select"
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

                    <button
                        type="button"
                        className="sdp-btn sdp-secondary sdp-clear-filters"
                        disabled={!hasFilters}
                        onClick={clearFilters}
                    >
                        Clear Filters
                    </button>
                </div>

                {isLoading ? (
                    <div
                        className="sdp-state"
                        aria-live="polite"
                    >
                        <div className="sdp-spinner" />

                        <strong>
                            Loading Supplier Dues
                        </strong>

                        <span>
                            Retrieving purchase balances,
                            settlement details and due dates.
                        </span>
                    </div>
                ) : purchases.length === 0 ? (
                    <div className="sdp-state">
                        <span className="sdp-state-icon">
                            <Icon name="money" />
                        </span>

                        <strong>
                            {hasFilters
                                ? 'No Matching Payables'
                                : 'No Supplier Dues Found'}
                        </strong>

                        <span>
                            {hasFilters
                                ? 'Check the search or status filter.'
                                : 'Received purchases requiring supplier settlement will appear here.'}
                        </span>
                    </div>
                ) : (
                    <div className="sdp-list">
                        <div
                            className="sdp-list-head"
                            aria-hidden="true"
                        >
                            <span>
                                Purchase
                            </span>

                            <span>
                                Supplier
                            </span>

                            <span>
                                Financial Position
                            </span>

                            <span>
                                Due and Status
                            </span>

                            <span>
                                Actions
                            </span>
                        </div>

                        {purchases.map(
                            (purchase) => {
                                const currentStatus =
                                    statusDetails(
                                        purchase,
                                    );

                                return (
                                    <article
                                        key={purchase.id}
                                        className="sdp-row"
                                    >
                                        <div className="sdp-identity">
                                            <span className="sdp-record-icon">
                                                <Icon name="money" />
                                            </span>

                                            <span className="sdp-copy">
                                                <strong
                                                    className="sdp-number"
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

                                                <span className="sdp-small">
                                                    {
                                                        purchase
                                                            .payments_count
                                                    }
                                                    {' '}

                                                    {purchase.payments_count
                                                        === 1
                                                        ? 'payment record'
                                                        : 'payment records'}
                                                </span>
                                            </span>
                                        </div>

                                        <div className="sdp-cell">
                                            <span className="sdp-mobile-label">
                                                Supplier
                                            </span>

                                            <strong
                                                className="sdp-value strong"
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
                                            </strong>

                                            <span className="sdp-meta">
                                                <Icon name="calendar" />

                                                Purchased
                                                {' '}

                                                {formatDate(
                                                    purchase
                                                        .purchase_date,
                                                )}
                                            </span>
                                        </div>

                                        <div className="sdp-cell sdp-money-cell">
                                            <span className="sdp-mobile-label">
                                                Financial Position
                                            </span>

                                            <div className="sdp-money-grid">
                                                <div className="sdp-money-box">
                                                    <span>
                                                        Total
                                                    </span>

                                                    <strong>
                                                        {money.format(
                                                            Number(
                                                                purchase
                                                                    .grand_total,
                                                            ),
                                                        )}
                                                    </strong>
                                                </div>

                                                <div className="sdp-money-box">
                                                    <span>
                                                        Paid
                                                    </span>

                                                    <strong>
                                                        {money.format(
                                                            Number(
                                                                purchase
                                                                    .paid_amount,
                                                            ),
                                                        )}
                                                    </strong>
                                                </div>

                                                <div className="sdp-money-box due">
                                                    <span>
                                                        Outstanding
                                                    </span>

                                                    <strong>
                                                        {money.format(
                                                            Number(
                                                                purchase
                                                                    .due_amount,
                                                            ),
                                                        )}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="sdp-cell">
                                            <span className="sdp-mobile-label">
                                                Due Date and Status
                                            </span>

                                            <span className="sdp-meta">
                                                <Icon name="calendar" />

                                                Due:
                                                {' '}

                                                {formatDate(
                                                    purchase
                                                        .due_date,
                                                )}
                                            </span>

                                            <span
                                                className={
                                                    `sdp-status ${currentStatus.className}`
                                                }
                                            >
                                                <Icon
                                                    name={
                                                        currentStatus
                                                            .className
                                                            === 'paid'
                                                            ? 'check'
                                                            : currentStatus
                                                                .className
                                                                === 'setup'
                                                                ? 'settings'
                                                                : 'alert'
                                                    }
                                                />

                                                {
                                                    currentStatus
                                                        .label
                                                }
                                            </span>
                                        </div>

                                        <div className="sdp-actions">
                                            {purchase.payment_status
                                                === 'unconfigured' && (
                                                    <button
                                                        type="button"
                                                        className="sdp-btn sdp-primary sdp-action"
                                                        onClick={() => {
                                                            setModalError(
                                                                '',
                                                            );

                                                            setSettlementPurchase(
                                                                purchase,
                                                            );
                                                        }}
                                                    >
                                                        <Icon name="settings" />

                                                        Configure
                                                    </button>
                                                )}

                                            {purchase.due_amount
                                                > 0 && (
                                                    <button
                                                        type="button"
                                                        className="sdp-btn sdp-blue sdp-action"
                                                        onClick={() => {
                                                            setModalError(
                                                                '',
                                                            );

                                                            setPaymentPurchase(
                                                                purchase,
                                                            );
                                                        }}
                                                    >
                                                        <Icon name="money" />

                                                        Record Payment
                                                    </button>
                                                )}

                                            {purchase.due_amount
                                                <= 0 && (
                                                    <span className="sdp-paid">
                                                        <Icon name="check" />

                                                        Fully Paid
                                                    </span>
                                                )}
                                        </div>
                                    </article>
                                );
                            },
                        )}
                    </div>
                )}

                {!isLoading
                    && pagination.total > 0 && (
                        <footer className="sdp-pagination">
                            <p>
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

                            <div className="sdp-pages">
                                <button
                                    type="button"
                                    className="sdp-btn sdp-secondary sdp-page-btn"
                                    disabled={
                                        pagination.current_page
                                        <= 1
                                    }
                                    onClick={() => {
                                        setPage(
                                            (value) =>
                                                Math.max(
                                                    1,
                                                    value - 1,
                                                ),
                                        );
                                    }}
                                >
                                    <Icon name="left" />

                                    Previous
                                </button>

                                <span className="sdp-page-number">
                                    Page
                                    {' '}

                                    {
                                        pagination
                                            .current_page
                                    }

                                    {' '}of{' '}

                                    {
                                        pagination
                                            .last_page
                                    }
                                </span>

                                <button
                                    type="button"
                                    className="sdp-btn sdp-secondary sdp-page-btn"
                                    disabled={
                                        pagination.current_page
                                        >= pagination.last_page
                                    }
                                    onClick={() => {
                                        setPage(
                                            (value) =>
                                                Math.min(
                                                    pagination
                                                        .last_page,
                                                    value + 1,
                                                ),
                                        );
                                    }}
                                >
                                    Next

                                    <Icon name="right" />
                                </button>
                            </div>
                        </footer>
                    )}
            </section>

            <ConfigurePurchaseSettlementModal
                purchase={settlementPurchase}
                isSubmitting={isSubmitting}
                errorMessage={modalError}
                onClose={() => {
                    if (!isSubmitting) {
                        setSettlementPurchase(
                            null,
                        );

                        setModalError('');
                    }
                }}
                onSubmit={(values) => {
                    void saveSettlement(values);
                }}
            />

            <RecordSupplierPaymentModal
                purchase={paymentPurchase}
                isSubmitting={isSubmitting}
                errorMessage={modalError}
                onClose={() => {
                    if (!isSubmitting) {
                        setPaymentPurchase(null);
                        setModalError('');
                    }
                }}
                onSubmit={(values) => {
                    void savePayment(values);
                }}
            />
        </div>
    );
}