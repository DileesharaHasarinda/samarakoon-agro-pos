import {
    useEffect,
} from 'react';

import { createPortal } from 'react-dom';

import type {
    SaleReceipt,
} from '../../types/sale';

interface SaleDetailsModalProps {
    saleId: number | null;
    sale: SaleReceipt | null;
    isLoading: boolean;
    errorMessage: string;
    onClose: () => void;
    onRetry: () => void;
}

const currencyFormatter =
    new Intl.NumberFormat(
        'en-LK',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        },
    );

function formatDateTime(
    value: string,
): string {
    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        },
    ).format(new Date(value));
}

function formatDate(
    value: string | null,
): string {
    if (!value) {
        return 'No expiry';
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    ).format(
        new Date(`${value}T00:00:00`),
    );
}

function paymentName(
    method: string,
): string {
    switch (method) {
        case 'bank_transfer':
            return 'Bank Transfer';

        case 'card':
            return 'Card';

        default:
            return 'Cash';
    }
}

function paymentStatusLabel(
    status: string,
): string {
    switch (status) {
        case 'partial':
            return 'Partially Paid';

        case 'due':
            return 'Payment Due';

        case 'paid':
            return 'Fully Paid';

        default:
            return status;
    }
}

function paymentStatusClass(
    status: string,
): string {
    switch (status) {
        case 'partial':
            return 'sdm-status-partial';

        case 'due':
            return 'sdm-status-due';

        default:
            return 'sdm-status-paid';
    }
}

const saleDetailsModalStyles = `
    #sapo-sale-details-modal,
    #sapo-sale-details-modal *,
    #sapo-sale-details-modal *::before,
    #sapo-sale-details-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-sale-details-modal {
        --sdm-green-900: #14532d;
        --sdm-green-800: #166534;
        --sdm-green-700: #15803d;
        --sdm-green-100: #dcfce7;
        --sdm-green-50: #f0fdf4;
        --sdm-blue: #2563eb;
        --sdm-blue-light: #eff6ff;
        --sdm-amber: #b45309;
        --sdm-amber-light: #fffbeb;
        --sdm-red: #dc2626;
        --sdm-red-light: #fef2f2;
        --sdm-text: #0f172a;
        --sdm-text-secondary: #334155;
        --sdm-muted: #64748b;
        --sdm-border: #e2e8f0;
        --sdm-border-strong: #cbd5e1;
        --sdm-bg: #f8fafc;
        --sdm-white: #ffffff;
        --sdm-radius: 10px;
        --sdm-radius-sm: 6px;
        --sdm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 2147483000 !important;
        display: flex !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 0 !important;
        padding: 24px !important;
        font-family: var(--sdm-font) !important;
        background: rgba(15, 23, 42, 0.55) !important;
        backdrop-filter: blur(2px) !important;
    }

    #sapo-sale-details-modal *,
    #sapo-sale-details-modal h1,
    #sapo-sale-details-modal h2,
    #sapo-sale-details-modal h3,
    #sapo-sale-details-modal p,
    #sapo-sale-details-modal span,
    #sapo-sale-details-modal strong,
    #sapo-sale-details-modal small,
    #sapo-sale-details-modal button {
        font-family: var(--sdm-font) !important;
    }

    #sapo-sale-details-modal
    .sdm-panel {
        display: flex !important;
        width: 100% !important;
        max-width: 1080px !important;
        height: 100% !important;
        max-height: 88vh !important;
        flex-direction: column !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: var(--sdm-white) !important;
        border-radius: var(--sdm-radius) !important;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.28) !important;
    }

    /* ---------- Header ---------- */

    #sapo-sale-details-modal
    .sdm-header {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 16px !important;
        margin: 0 !important;
        padding: 18px 22px !important;
        background: var(--sdm-white) !important;
        border-bottom: 1px solid var(--sdm-border) !important;
    }

    #sapo-sale-details-modal
    .sdm-header-copy {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 3px !important;
    }

    #sapo-sale-details-modal
    .sdm-kicker {
        display: block !important;
        margin: 0 !important;
        color: var(--sdm-green-700) !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        letter-spacing: 0.06em !important;
        text-transform: uppercase !important;
    }

    #sapo-sale-details-modal
    .sdm-header-copy h2 {
        margin: 0 !important;
        color: var(--sdm-text) !important;
        font-size: 18px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        letter-spacing: -0.01em !important;
    }

    #sapo-sale-details-modal
    .sdm-header-copy p {
        margin: 0 !important;
        color: var(--sdm-muted) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
    }

    #sapo-sale-details-modal
    .sdm-close-button {
        display: grid !important;
        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;
        flex-shrink: 0 !important;
        place-items: center !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--sdm-muted) !important;
        font-size: 20px !important;
        font-weight: 400 !important;
        line-height: 1 !important;
        appearance: none !important;
        background: var(--sdm-bg) !important;
        border: 1px solid var(--sdm-border) !important;
        border-radius: var(--sdm-radius-sm) !important;
        cursor: pointer !important;
        transition: background-color 120ms ease, color 120ms ease !important;
    }

    #sapo-sale-details-modal
    .sdm-close-button:hover {
        color: var(--sdm-text) !important;
        background: #eef2f6 !important;
    }

    /* ---------- Scrollable body ---------- */

    #sapo-sale-details-modal
    .sdm-body {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior-y: contain !important;
        scrollbar-gutter: stable !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--sdm-border-strong) transparent !important;
    }

    #sapo-sale-details-modal
    .sdm-body::-webkit-scrollbar {
        width: 10px !important;
    }

    #sapo-sale-details-modal
    .sdm-body::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-sale-details-modal
    .sdm-body::-webkit-scrollbar-thumb {
        background: var(--sdm-border-strong) !important;
        border: 2px solid transparent !important;
        border-radius: 999px !important;
        background-clip: content-box !important;
    }

    #sapo-sale-details-modal
    .sdm-content {
        display: flex !important;
        flex-direction: column !important;
        gap: 20px !important;
        padding: 20px 22px !important;
    }

    /* ---------- Loading / error states ---------- */

    #sapo-sale-details-modal
    .sdm-state {
        display: flex !important;
        min-height: 260px !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        padding: 32px !important;
        text-align: center !important;
    }

    #sapo-sale-details-modal
    .sdm-state strong {
        color: var(--sdm-text) !important;
        font-size: 15px !important;
        font-weight: 600 !important;
    }

    #sapo-sale-details-modal
    .sdm-state span {
        color: var(--sdm-muted) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
    }

    #sapo-sale-details-modal
    .sdm-spinner {
        width: 30px !important;
        height: 30px !important;
        border: 3px solid var(--sdm-green-100) !important;
        border-top-color: var(--sdm-green-700) !important;
        border-radius: 50% !important;
        animation: sdm-spin 700ms linear infinite !important;
    }

    @keyframes sdm-spin {
        to {
            transform: rotate(360deg);
        }
    }

    /* ---------- Overview cards ---------- */

    #sapo-sale-details-modal
    .sdm-overview {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 10px !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-sale-details-modal
    .sdm-overview article {
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;
        padding: 12px 14px !important;
        background: var(--sdm-bg) !important;
        border: 1px solid var(--sdm-border) !important;
        border-radius: var(--sdm-radius-sm) !important;
    }

    #sapo-sale-details-modal
    .sdm-overview span {
        color: var(--sdm-muted) !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        letter-spacing: 0.02em !important;
        text-transform: uppercase !important;
    }

    #sapo-sale-details-modal
    .sdm-overview strong {
        color: var(--sdm-text) !important;
        font-size: 14px !important;
        font-weight: 700 !important;
    }

    #sapo-sale-details-modal
    .sdm-overview small {
        color: var(--sdm-muted) !important;
        font-size: 12px !important;
        font-weight: 500 !important;
    }

    #sapo-sale-details-modal
    .sdm-status-pill {
        display: inline-flex !important;
        width: fit-content !important;
        align-items: center !important;
        padding: 3px 9px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        border-radius: 999px !important;
    }

    #sapo-sale-details-modal
    .sdm-status-paid {
        color: var(--sdm-green-800) !important;
        background: var(--sdm-green-100) !important;
    }

    #sapo-sale-details-modal
    .sdm-status-partial {
        color: var(--sdm-amber) !important;
        background: var(--sdm-amber-light) !important;
    }

    #sapo-sale-details-modal
    .sdm-status-due {
        color: var(--sdm-red) !important;
        background: var(--sdm-red-light) !important;
    }

    /* ---------- Section blocks ---------- */

    #sapo-sale-details-modal
    .sdm-section {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        padding: 0 !important;
        margin: 0 !important;
    }

    #sapo-sale-details-modal
    .sdm-section-header {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
    }

    #sapo-sale-details-modal
    .sdm-section-header h3 {
        margin: 0 !important;
        color: var(--sdm-text) !important;
        font-size: 15px !important;
        font-weight: 700 !important;
    }

    #sapo-sale-details-modal
    .sdm-section-header p {
        margin: 2px 0 0 !important;
        color: var(--sdm-muted) !important;
        font-size: 12px !important;
        font-weight: 500 !important;
    }

    #sapo-sale-details-modal
    .sdm-section-header > span {
        flex-shrink: 0 !important;
        padding: 4px 10px !important;
        color: var(--sdm-text-secondary) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
        background: var(--sdm-bg) !important;
        border: 1px solid var(--sdm-border) !important;
        border-radius: 999px !important;
    }

    /* ---------- Items table ---------- */

    #sapo-sale-details-modal
    .sdm-table-container {
        width: 100% !important;
        overflow-x: auto !important;
        border: 1px solid var(--sdm-border) !important;
        border-radius: var(--sdm-radius-sm) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--sdm-border-strong) transparent !important;
    }

    #sapo-sale-details-modal
    .sdm-table {
        width: 100% !important;
        min-width: 760px !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
    }

    #sapo-sale-details-modal
    .sdm-table th,
    #sapo-sale-details-modal
    .sdm-table td {
        padding: 10px 12px !important;
        text-align: left !important;
        vertical-align: middle !important;
        border-bottom: 1px solid var(--sdm-border) !important;
        white-space: nowrap !important;
    }

    #sapo-sale-details-modal
    .sdm-table thead th {
        color: var(--sdm-text-secondary) !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        letter-spacing: 0.02em !important;
        text-transform: uppercase !important;
        background: #f1f5f9 !important;
        border-bottom: 1px solid var(--sdm-border-strong) !important;
    }

    #sapo-sale-details-modal
    .sdm-table tbody tr:last-child td {
        border-bottom: 0 !important;
    }

    #sapo-sale-details-modal
    .sdm-table tbody tr:hover td {
        background: #f8fafc !important;
    }

    #sapo-sale-details-modal
    .sdm-table td {
        color: var(--sdm-text) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
    }

    #sapo-sale-details-modal
    .sdm-item-product,
    #sapo-sale-details-modal
    .sdm-item-batch {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
        white-space: normal !important;
    }

    #sapo-sale-details-modal
    .sdm-item-product strong,
    #sapo-sale-details-modal
    .sdm-item-batch strong {
        font-size: 13px !important;
        font-weight: 600 !important;
    }

    #sapo-sale-details-modal
    .sdm-item-product span,
    #sapo-sale-details-modal
    .sdm-item-batch span {
        color: var(--sdm-muted) !important;
        font-size: 12px !important;
        font-weight: 500 !important;
    }

    #sapo-sale-details-modal
    .sdm-cost-value {
        display: block !important;
        margin-top: 2px !important;
        color: var(--sdm-muted) !important;
        font-size: 11px !important;
        font-weight: 500 !important;
    }

    #sapo-sale-details-modal
    .sdm-expiry-value {
        color: var(--sdm-text-secondary) !important;
        font-size: 13px !important;
    }

    #sapo-sale-details-modal
    .sdm-profit-value {
        color: var(--sdm-green-800) !important;
    }

    /* ---------- Lower grid: payments + totals ---------- */

    #sapo-sale-details-modal
    .sdm-lower-grid {
        display: grid !important;
        grid-template-columns: 1.4fr 1fr !important;
        gap: 16px !important;
        align-items: start !important;
    }

    #sapo-sale-details-modal
    .sdm-payment-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
    }

    #sapo-sale-details-modal
    .sdm-payment-list article {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px 14px !important;
        padding: 12px 14px !important;
        background: var(--sdm-bg) !important;
        border: 1px solid var(--sdm-border) !important;
        border-radius: var(--sdm-radius-sm) !important;
    }

    #sapo-sale-details-modal
    .sdm-payment-list article > div {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
    }

    #sapo-sale-details-modal
    .sdm-payment-list span {
        color: var(--sdm-muted) !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        letter-spacing: 0.02em !important;
        text-transform: uppercase !important;
    }

    #sapo-sale-details-modal
    .sdm-payment-list strong {
        color: var(--sdm-text) !important;
        font-size: 13px !important;
        font-weight: 600 !important;
    }

    #sapo-sale-details-modal
    .sdm-payment-list p {
        grid-column: 1 / -1 !important;
        margin: 4px 0 0 !important;
        padding-top: 8px !important;
        color: var(--sdm-text-secondary) !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        border-top: 1px solid var(--sdm-border) !important;
    }

    /* ---------- Totals panel ---------- */

    #sapo-sale-details-modal
    .sdm-totals {
        display: flex !important;
        flex-direction: column !important;
        gap: 9px !important;
        padding: 16px !important;
        background: var(--sdm-bg) !important;
        border: 1px solid var(--sdm-border) !important;
        border-radius: var(--sdm-radius-sm) !important;
    }

    #sapo-sale-details-modal
    .sdm-totals > div {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
    }

    #sapo-sale-details-modal
    .sdm-totals span {
        color: var(--sdm-muted) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
    }

    #sapo-sale-details-modal
    .sdm-totals strong {
        color: var(--sdm-text) !important;
        font-size: 13px !important;
        font-weight: 600 !important;
    }

    #sapo-sale-details-modal
    .sdm-grand-total {
        margin: 4px 0 !important;
        padding: 10px 0 !important;
        border-top: 1px solid var(--sdm-border-strong) !important;
        border-bottom: 1px solid var(--sdm-border-strong) !important;
    }

    #sapo-sale-details-modal
    .sdm-grand-total span {
        color: var(--sdm-text) !important;
        font-size: 13px !important;
        font-weight: 700 !important;
    }

    #sapo-sale-details-modal
    .sdm-grand-total strong {
        color: var(--sdm-green-800) !important;
        font-size: 17px !important;
        font-weight: 700 !important;
    }

    #sapo-sale-details-modal
    .sdm-profit-divider {
        margin-top: 4px !important;
        padding-top: 10px !important;
        border-top: 1px dashed var(--sdm-border-strong) !important;
    }

    #sapo-sale-details-modal
    .sdm-net-profit {
        color: var(--sdm-green-800) !important;
        font-size: 14px !important;
        font-weight: 700 !important;
    }

    /* ---------- Notes ---------- */

    #sapo-sale-details-modal
    .sdm-notes {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        padding: 14px 16px !important;
        background: var(--sdm-amber-light) !important;
        border: 1px solid #fde68a !important;
        border-radius: var(--sdm-radius-sm) !important;
    }

    #sapo-sale-details-modal
    .sdm-notes span {
        color: var(--sdm-amber) !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        letter-spacing: 0.03em !important;
        text-transform: uppercase !important;
    }

    #sapo-sale-details-modal
    .sdm-notes p {
        margin: 0 !important;
        color: var(--sdm-text-secondary) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: 1.5 !important;
    }

    /* ---------- Footer / actions ---------- */

    #sapo-sale-details-modal
    .sdm-footer {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        padding: 14px 22px !important;
        background: var(--sdm-white) !important;
        border-top: 1px solid var(--sdm-border) !important;
    }

    #sapo-sale-details-modal
    .sdm-button {
        display: inline-flex !important;
        min-height: 38px !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        padding: 8px 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;
        appearance: none !important;
        border-radius: var(--sdm-radius-sm) !important;
        cursor: pointer !important;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease !important;
    }

    #sapo-sale-details-modal
    .sdm-primary-button {
        color: #ffffff !important;
        background: var(--sdm-green-700) !important;
        border: 1px solid var(--sdm-green-700) !important;
    }

    #sapo-sale-details-modal
    .sdm-primary-button:hover {
        background: var(--sdm-green-800) !important;
        border-color: var(--sdm-green-800) !important;
    }

    #sapo-sale-details-modal
    .sdm-secondary-button {
        color: var(--sdm-text-secondary) !important;
        background: var(--sdm-white) !important;
        border: 1px solid var(--sdm-border-strong) !important;
    }

    #sapo-sale-details-modal
    .sdm-secondary-button:hover {
        color: var(--sdm-text) !important;
        background: var(--sdm-bg) !important;
        border-color: #94a3b8 !important;
    }

    /* ---------- Responsive ---------- */

    @media (max-width: 900px) {
        #sapo-sale-details-modal
        .sdm-overview {
            grid-template-columns: repeat(2, 1fr) !important;
        }

        #sapo-sale-details-modal
        .sdm-lower-grid {
            grid-template-columns: 1fr !important;
        }
    }

    @media (max-width: 640px) {
        #sapo-sale-details-modal {
            padding: 0 !important;
        }

        #sapo-sale-details-modal
        .sdm-panel {
            max-width: 100% !important;
            max-height: 100% !important;
            height: 100% !important;
            border-radius: 0 !important;
        }

        #sapo-sale-details-modal
        .sdm-overview {
            grid-template-columns: 1fr 1fr !important;
        }

        #sapo-sale-details-modal
        .sdm-payment-list article {
            grid-template-columns: 1fr !important;
        }

        #sapo-sale-details-modal
        .sdm-footer {
            flex-direction: column-reverse !important;
            align-items: stretch !important;
        }

        #sapo-sale-details-modal
        .sdm-button {
            width: 100% !important;
        }
    }

    @media print {
        #sapo-sale-details-modal {
            position: static !important;
            padding: 0 !important;
            background: none !important;
        }

        #sapo-sale-details-modal
        .sdm-panel {
            max-height: none !important;
            box-shadow: none !important;
        }

        #sapo-sale-details-modal
        .sdm-body {
            overflow: visible !important;
        }

        #sapo-sale-details-modal
        .sdm-footer,
        #sapo-sale-details-modal
        .sdm-close-button {
            display: none !important;
        }
    }
`;

export default function SaleDetailsModal({
    saleId,
    sale,
    isLoading,
    errorMessage,
    onClose,
    onRetry,
}: SaleDetailsModalProps) {
    useEffect(() => {
        if (saleId === null) {
            return;
        }

        const handleKeyDown = (
            event: KeyboardEvent,
        ): void => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener(
            'keydown',
            handleKeyDown,
        );

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            'hidden';

        return () => {
            window.removeEventListener(
                'keydown',
                handleKeyDown,
            );

            document.body.style.overflow =
                previousOverflow;
        };
    }, [
        saleId,
        onClose,
    ]);

    if (saleId === null) {
        return null;
    }

    const hasProfitInformation =
        sale?.net_profit !== null
        && sale?.net_profit !== undefined;

    const modalMarkup = (
        <div
            id="sapo-sale-details-modal"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target
                    === event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <style>
                {saleDetailsModalStyles}
            </style>

            <section
                className="sdm-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="sale-details-title"
                onMouseDown={(event) => {
                    event.stopPropagation();
                }}
            >
                <header className="sdm-header">
                    <div className="sdm-header-copy">
                        <span className="sdm-kicker">
                            Sales History
                        </span>

                        <h2 id="sale-details-title">
                            {sale
                                ? sale.sale_number
                                : 'Sale Details'}
                        </h2>

                        {sale && (
                            <p>
                                {formatDateTime(
                                    sale.sale_date,
                                )}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        className="sdm-close-button"
                        aria-label="Close sale details"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="sdm-body">
                    {isLoading ? (
                        <div className="sdm-state">
                            <div className="sdm-spinner" />

                            <span>
                                Loading sale details...
                            </span>
                        </div>
                    ) : errorMessage ? (
                        <div className="sdm-state">
                            <strong>
                                Unable to load sale
                            </strong>

                            <span>{errorMessage}</span>

                            <button
                                type="button"
                                className="sdm-button sdm-primary-button"
                                onClick={onRetry}
                            >
                                Retry
                            </button>
                        </div>
                    ) : sale ? (
                        <div className="sdm-content">
                            <section className="sdm-overview">
                                <article>
                                    <span>Cashier</span>

                                    <strong>
                                        {sale.created_by.name}
                                    </strong>

                                    {sale.created_by
                                        .username && (
                                            <small>
                                                {
                                                    sale.created_by
                                                        .username
                                                }
                                            </small>
                                        )}
                                </article>

                                <article>
                                    <span>Customer</span>

                                    <strong>
                                        Walk-in Customer
                                    </strong>
                                </article>

                                <article>
                                    <span>Payment Status</span>

                                    <strong
                                        className={
                                            `sdm-status-pill ${paymentStatusClass(
                                                sale.payment_status,
                                            )}`
                                        }
                                    >
                                        {paymentStatusLabel(
                                            sale.payment_status,
                                        )}
                                    </strong>
                                </article>

                                <article>
                                    <span>Total Quantity</span>

                                    <strong>
                                        {sale.total_quantity}
                                    </strong>
                                </article>
                            </section>

                            <section className="sdm-section">
                                <header className="sdm-section-header">
                                    <div>
                                        <h3>Sold Items</h3>

                                        <p>
                                            Products and exact
                                            stock batches used in
                                            this sale.
                                        </p>
                                    </div>

                                    <span>
                                        {sale.items_count}{' '}
                                        {sale.items_count === 1
                                            ? 'item'
                                            : 'items'}
                                    </span>
                                </header>

                                <div className="sdm-table-container">
                                    <table className="sdm-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Batch</th>
                                                <th>Expiry</th>
                                                <th>Quantity</th>
                                                <th>Unit Price</th>
                                                <th>Discount</th>
                                                <th>Total</th>

                                                {hasProfitInformation && (
                                                    <th>Profit</th>
                                                )}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {sale.items.map(
                                                (item) => (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <div className="sdm-item-product">
                                                                <strong>
                                                                    {
                                                                        item
                                                                            .product
                                                                            .name
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    SKU:{' '}
                                                                    {item.product
                                                                        .sku
                                                                        || '—'}
                                                                </span>

                                                                <span>
                                                                    Barcode:{' '}
                                                                    {item.product
                                                                        .barcode
                                                                        || '—'}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <div className="sdm-item-batch">
                                                                <strong>
                                                                    {item.batch
                                                                        .batch_number
                                                                        || item.batch
                                                                            .batch_code}
                                                                </strong>

                                                                <span>
                                                                    {
                                                                        item
                                                                            .batch
                                                                            .batch_code
                                                                    }
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <span className="sdm-expiry-value">
                                                                {formatDate(
                                                                    item.batch
                                                                        .expiry_date,
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <strong>
                                                                {item.quantity}{' '}
                                                                {
                                                                    item
                                                                        .product
                                                                        .unit
                                                                }
                                                            </strong>
                                                        </td>

                                                        <td>
                                                            {currencyFormatter
                                                                .format(
                                                                    item
                                                                        .selling_price,
                                                                )}

                                                            {item.purchase_cost
                                                                !== null && (
                                                                    <small className="sdm-cost-value">
                                                                        Cost:{' '}
                                                                        {currencyFormatter
                                                                            .format(
                                                                                item
                                                                                    .purchase_cost,
                                                                            )}
                                                                    </small>
                                                                )}
                                                        </td>

                                                        <td>
                                                            {currencyFormatter
                                                                .format(
                                                                    item.discount,
                                                                )}
                                                        </td>

                                                        <td>
                                                            <strong>
                                                                {currencyFormatter
                                                                    .format(
                                                                        item
                                                                            .line_total,
                                                                    )}
                                                            </strong>
                                                        </td>

                                                        {hasProfitInformation && (
                                                            <td>
                                                                <strong className="sdm-profit-value">
                                                                    {currencyFormatter
                                                                        .format(
                                                                            item
                                                                                .gross_profit
                                                                            ?? 0,
                                                                        )}
                                                                </strong>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <div className="sdm-lower-grid">
                                <section className="sdm-section">
                                    <header className="sdm-section-header">
                                        <div>
                                            <h3>Payments</h3>

                                            <p>
                                                Payments recorded for
                                                this transaction.
                                            </p>
                                        </div>
                                    </header>

                                    <div className="sdm-payment-list">
                                        {sale.payments.map(
                                            (payment) => (
                                                <article
                                                    key={payment.id}
                                                >
                                                    <div>
                                                        <span>
                                                            Payment Method
                                                        </span>

                                                        <strong>
                                                            {paymentName(
                                                                payment
                                                                    .payment_method,
                                                            )}
                                                        </strong>
                                                    </div>

                                                    <div>
                                                        <span>Amount</span>

                                                        <strong>
                                                            {currencyFormatter
                                                                .format(
                                                                    payment
                                                                        .amount,
                                                                )}
                                                        </strong>
                                                    </div>

                                                    <div>
                                                        <span>
                                                            Reference
                                                        </span>

                                                        <strong>
                                                            {payment
                                                                .reference_number
                                                                || '—'}
                                                        </strong>
                                                    </div>

                                                    <div>
                                                        <span>
                                                            Payment Time
                                                        </span>

                                                        <strong>
                                                            {formatDateTime(
                                                                payment
                                                                    .created_at,
                                                            )}
                                                        </strong>
                                                    </div>

                                                    {payment.notes && (
                                                        <p>
                                                            {payment.notes}
                                                        </p>
                                                    )}
                                                </article>
                                            ),
                                        )}
                                    </div>
                                </section>

                                <section className="sdm-totals">
                                    <div>
                                        <span>Subtotal</span>

                                        <strong>
                                            {currencyFormatter
                                                .format(
                                                    sale.subtotal,
                                                )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Item Discounts
                                        </span>

                                        <strong>
                                            -
                                            {currencyFormatter
                                                .format(
                                                    sale
                                                        .item_discount_total,
                                                )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Sale Discount
                                        </span>

                                        <strong>
                                            -
                                            {currencyFormatter
                                                .format(
                                                    sale.discount,
                                                )}
                                        </strong>
                                    </div>

                                    <div className="sdm-grand-total">
                                        <span>Grand Total</span>

                                        <strong>
                                            {currencyFormatter
                                                .format(
                                                    sale.grand_total,
                                                )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Paid Amount</span>

                                        <strong>
                                            {currencyFormatter
                                                .format(
                                                    sale.paid_amount,
                                                )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Change</span>

                                        <strong>
                                            {currencyFormatter
                                                .format(
                                                    sale.change_amount,
                                                )}
                                        </strong>
                                    </div>

                                    {hasProfitInformation && (
                                        <>
                                            <div className="sdm-profit-divider">
                                                <span>
                                                    Gross Profit
                                                </span>

                                                <strong>
                                                    {currencyFormatter
                                                        .format(
                                                            sale
                                                                .gross_profit
                                                            ?? 0,
                                                        )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Net Profit
                                                </span>

                                                <strong className="sdm-net-profit">
                                                    {currencyFormatter
                                                        .format(
                                                            sale
                                                                .net_profit
                                                            ?? 0,
                                                        )}
                                                </strong>
                                            </div>
                                        </>
                                    )}
                                </section>
                            </div>

                            {sale.notes && (
                                <section className="sdm-notes">
                                    <span>Sale Notes</span>

                                    <p>{sale.notes}</p>
                                </section>
                            )}
                        </div>
                    ) : null}
                </div>

                {!isLoading
                    && !errorMessage
                    && sale && (
                        <footer className="sdm-footer">
                            <button
                                type="button"
                                className="sdm-button sdm-secondary-button"
                                onClick={onClose}
                            >
                                Close
                            </button>

                            <button
                                type="button"
                                className="sdm-button sdm-primary-button"
                                onClick={() => {
                                    window.print();
                                }}
                            >
                                Print Sale Details
                            </button>
                        </footer>
                    )}
            </section>
        </div>
    );

    return createPortal(
        modalMarkup,
        document.body,
    );
}