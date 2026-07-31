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

import type {
    PosProduct,
    PosStockBatch,
} from '../../types/sale';

interface BatchSelectionModalProps {
    product: PosProduct | null;
    onClose: () => void;
    onAdd: (
        product: PosProduct,
        batch: PosStockBatch,
        quantity: number,
    ) => void;
}

interface PurchaseItemCost {
    buying_price?: number | string | null;
    cost_price?: number | string | null;
    purchase_price?: number | string | null;
    unit_cost?: number | string | null;
    unit_price?: number | string | null;
}

type StockBatchWithCost = PosStockBatch & {
    buying_price?: number | string | null;
    buy_price?: number | string | null;
    cost_price?: number | string | null;
    purchase_cost?: number | string | null;
    purchase_price?: number | string | null;
    purchase_unit_price?: number | string | null;
    unit_buying_price?: number | string | null;
    unit_cost?: number | string | null;
    unit_price?: number | string | null;
    cost_per_unit?: number | string | null;
    purchase_item?: PurchaseItemCost | null;
    purchaseItem?: PurchaseItemCost | null;
};

const currencyFormatter = new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 3,
});

function normaliseQuantity(value: number): number {
    return Number(value.toFixed(3));
}

function formatQuantity(
    value: number | string | null | undefined,
): string {
    const numericValue = Number(value ?? 0);

    return Number.isFinite(numericValue)
        ? quantityFormatter.format(numericValue)
        : '0';
}

function formatDate(
    date: string | null | undefined,
): string {
    if (!date) {
        return 'No expiry';
    }

    const parsedDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
        return date;
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(parsedDate);
}

function parsePrice(
    value: number | string | null | undefined,
): number | null {
    if (
        value === null
        || value === undefined
        || value === ''
    ) {
        return null;
    }

    const cleanedValue = typeof value === 'string'
        ? value.replace(/[^0-9.-]/g, '')
        : value;

    const numericValue = Number(cleanedValue);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
        return null;
    }

    return numericValue;
}

function getCostPrice(
    batch: PosStockBatch,
): number | null {
    const batchWithCost = batch as StockBatchWithCost;

    const purchaseItem = batchWithCost.purchase_item
        ?? batchWithCost.purchaseItem
        ?? null;

    const possibleCostPrices = [
        batchWithCost.buying_price,
        batchWithCost.buy_price,
        batchWithCost.cost_price,
        batchWithCost.purchase_cost,
        batchWithCost.purchase_price,
        batchWithCost.purchase_unit_price,
        batchWithCost.unit_buying_price,
        batchWithCost.unit_cost,
        batchWithCost.unit_price,
        batchWithCost.cost_per_unit,
        purchaseItem?.buying_price,
        purchaseItem?.cost_price,
        purchaseItem?.purchase_price,
        purchaseItem?.unit_cost,
        purchaseItem?.unit_price,
    ];

    for (const value of possibleCostPrices) {
        const costPrice = parsePrice(value);

        if (costPrice !== null) {
            return costPrice;
        }
    }

    return null;
}

function formatCostPrice(
    batch: PosStockBatch,
): string {
    const costPrice = getCostPrice(batch);

    return costPrice === null
        ? 'Not available'
        : currencyFormatter.format(costPrice);
}

type IconName =
    | 'alert'
    | 'check'
    | 'close'
    | 'minus'
    | 'package'
    | 'plus'
    | 'shopping-cart';

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

        case 'check':
            return (
                <svg {...commonProps}>
                    <path d="m5 12 4 4L19 6" />
                </svg>
            );

        case 'close':
            return (
                <svg {...commonProps}>
                    <path d="m6 6 12 12" />
                    <path d="m18 6-12 12" />
                </svg>
            );

        case 'minus':
            return (
                <svg {...commonProps}>
                    <path d="M5 12h14" />
                </svg>
            );

        case 'package':
            return (
                <svg {...commonProps}>
                    <path d="m21 8-9 5-9-5" />
                    <path d="m3 8 9-5 9 5v8l-9 5-9-5Z" />
                    <path d="M12 13v8" />
                </svg>
            );

        case 'plus':
            return (
                <svg {...commonProps}>
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                </svg>
            );

        case 'shopping-cart':
        default:
            return (
                <svg {...commonProps}>
                    <circle cx="9" cy="20" r="1" />
                    <circle cx="18" cy="20" r="1" />

                    <path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
                </svg>
            );
    }
}

const batchModalStyles = `
    #pos-batch-modal,
    #pos-batch-modal *,
    #pos-batch-modal *::before,
    #pos-batch-modal *::after {
        box-sizing: border-box !important;
    }

    #pos-batch-modal {
        --batch-green-950: #052e16;
        --batch-green-900: #14532d;
        --batch-green-800: #166534;
        --batch-green-700: #15803d;
        --batch-green-100: #dcfce7;
        --batch-green-50: #f0fdf4;

        --batch-blue-700: #175cd3;
        --batch-blue-50: #eff8ff;

        --batch-red-700: #b42318;
        --batch-red-50: #fef3f2;

        --batch-text: #101828;
        --batch-text-secondary: #344054;
        --batch-muted: #667085;
        --batch-border: #d0d9d2;
        --batch-border-strong: #aebdb2;
        --batch-surface: #ffffff;
        --batch-page: #f5f8f6;

        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;

        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;

        margin: 0 !important;
        padding: 0 !important;

        overflow: hidden !important;

        color: var(--batch-text) !important;

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

    #pos-batch-modal button,
    #pos-batch-modal input {
        font: inherit !important;
        text-transform: none !important;
        letter-spacing: normal !important;
    }

    #pos-batch-modal h2,
    #pos-batch-modal h3,
    #pos-batch-modal p {
        margin: 0 !important;
    }

    #pos-batch-modal .batch-backdrop {
        position: absolute !important;
        inset: 0 !important;

        display: flex !important;

        width: 100% !important;
        height: 100% !important;

        align-items: center !important;
        justify-content: center !important;

        padding: 20px !important;

        overflow: auto !important;

        background: rgba(3, 18, 10, 0.72) !important;
        backdrop-filter: blur(4px) !important;
    }

    #pos-batch-modal .batch-dialog {
        display: flex !important;

        width: min(880px, 100%) !important;
        max-height: calc(100dvh - 40px) !important;

        min-width: 0 !important;
        min-height: 0 !important;

        flex-direction: column !important;

        overflow: hidden !important;

        background: var(--batch-surface) !important;

        border: 1px solid var(--batch-border) !important;
        border-radius: 16px !important;

        box-shadow:
            0 28px 72px
            rgba(0, 0, 0, 0.34) !important;
    }

    #pos-batch-modal .batch-header {
        display: flex !important;

        min-height: 88px !important;
        flex: 0 0 auto !important;

        align-items: center !important;
        justify-content: space-between !important;
        gap: 18px !important;

        padding: 16px 20px !important;

        color: #ffffff !important;

        background:
            linear-gradient(
                135deg,
                var(--batch-green-900),
                var(--batch-green-700)
            ) !important;
    }

    #pos-batch-modal .batch-header-copy {
        min-width: 0 !important;
        flex: 1 1 auto !important;
    }

    #pos-batch-modal .batch-eyebrow {
        display: block !important;

        margin-bottom: 3px !important;

        color: #bbf7d0 !important;

        font-size: 11px !important;
        font-weight: 750 !important;
        letter-spacing: 0.055em !important;

        text-transform: uppercase !important;
    }

    #pos-batch-modal .batch-title {
        overflow: hidden !important;

        color: #ffffff !important;

        font-size: 22px !important;
        font-weight: 740 !important;
        line-height: 1.25 !important;
        letter-spacing: -0.02em !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #pos-batch-modal .batch-stock-summary {
        display: block !important;

        margin-top: 4px !important;

        color: #d8f7e1 !important;

        font-size: 13px !important;
    }

    #pos-batch-modal .batch-stock-summary strong {
        color: #ffffff !important;
        font-weight: 700 !important;
    }

    #pos-batch-modal .batch-close {
        display: grid !important;

        width: 40px !important;
        height: 40px !important;
        min-width: 40px !important;

        place-items: center !important;

        padding: 0 !important;

        color: #ffffff !important;

        appearance: none !important;

        background: rgba(255, 255, 255, 0.12) !important;

        border:
            1px solid
            rgba(255, 255, 255, 0.34) !important;

        border-radius: 9px !important;

        cursor: pointer !important;
    }

    #pos-batch-modal .batch-close:hover {
        background: rgba(255, 255, 255, 0.22) !important;
    }

    #pos-batch-modal .batch-close svg {
        width: 19px !important;
        height: 19px !important;
    }

    #pos-batch-modal .batch-form {
        display: flex !important;

        min-height: 0 !important;
        flex: 1 1 auto !important;

        flex-direction: column !important;

        overflow: hidden !important;
    }

    #pos-batch-modal .batch-body {
        display: flex !important;

        min-height: 0 !important;
        flex: 1 1 auto !important;

        flex-direction: column !important;
        gap: 14px !important;

        padding: 16px 18px 20px !important;

        overflow-x: hidden !important;
        overflow-y: auto !important;

        background: var(--batch-page) !important;

        scrollbar-width: thin !important;
        scrollbar-color:
            #9cad9f
            #eaf0eb !important;
    }

    #pos-batch-modal .batch-error {
        display: flex !important;

        align-items: center !important;
        gap: 9px !important;

        padding: 10px 12px !important;

        color: var(--batch-red-700) !important;

        font-size: 13px !important;
        font-weight: 600 !important;

        background: var(--batch-red-50) !important;

        border: 1px solid #f3b5af !important;
        border-radius: 9px !important;
    }

    #pos-batch-modal .batch-error svg {
        width: 18px !important;
        height: 18px !important;
        flex: 0 0 18px !important;
    }

    #pos-batch-modal .batch-section {
        padding: 16px !important;

        background: #ffffff !important;

        border: 1px solid var(--batch-border) !important;
        border-radius: 12px !important;
    }

    #pos-batch-modal .batch-section-heading {
        display: flex !important;

        align-items: flex-start !important;
        gap: 10px !important;

        padding-bottom: 12px !important;

        border-bottom:
            1px solid
            #e7ece8 !important;
    }

    #pos-batch-modal .batch-step-number {
        display: grid !important;

        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;

        place-items: center !important;

        color: #ffffff !important;

        font-size: 13px !important;
        font-weight: 750 !important;

        background: var(--batch-green-700) !important;

        border-radius: 8px !important;
    }

    #pos-batch-modal .batch-section-title {
        color: var(--batch-text) !important;

        font-size: 17px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
    }

    #pos-batch-modal .batch-section-help {
        margin-top: 2px !important;

        color: var(--batch-muted) !important;

        font-size: 12px !important;
        line-height: 1.45 !important;
    }

    #pos-batch-modal .batch-options {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;

        gap: 10px !important;

        margin-top: 13px !important;
    }

    #pos-batch-modal .batch-option {
        position: relative !important;

        display: flex !important;

        min-width: 0 !important;
        min-height: 148px !important;

        flex-direction: column !important;
        gap: 10px !important;

        padding: 13px !important;

        color: var(--batch-text) !important;

        background: #ffffff !important;

        border:
            1px solid
            var(--batch-border-strong) !important;

        border-radius: 10px !important;

        cursor: pointer !important;

        transition:
            background 150ms ease,
            border-color 150ms ease,
            box-shadow 150ms ease,
            transform 150ms ease !important;
    }

    #pos-batch-modal .batch-option:hover {
        border-color:
            var(--batch-green-700) !important;

        transform:
            translateY(-1px) !important;
    }

    #pos-batch-modal .batch-option.selected {
        background: var(--batch-green-50) !important;

        border:
            2px solid
            var(--batch-green-700) !important;

        box-shadow:
            0 5px 15px
            rgba(21, 128, 61, 0.12) !important;
    }

    #pos-batch-modal .batch-radio {
        position: absolute !important;

        width: 1px !important;
        height: 1px !important;

        overflow: hidden !important;

        opacity: 0 !important;
    }

    #pos-batch-modal .batch-option-top {
        display: flex !important;

        min-width: 0 !important;

        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 10px !important;
    }

    #pos-batch-modal .batch-price-label,
    #pos-batch-modal .batch-detail-label {
        display: block !important;

        color: var(--batch-muted) !important;

        font-size: 10px !important;
        font-weight: 700 !important;
        letter-spacing: 0.035em !important;

        text-transform: uppercase !important;
    }

    #pos-batch-modal .batch-selling-price {
        display: block !important;

        margin-top: 2px !important;

        overflow: hidden !important;

        color: var(--batch-green-900) !important;

        font-size: 19px !important;
        font-weight: 760 !important;
        line-height: 1.25 !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #pos-batch-modal .batch-selected-mark {
        display: grid !important;

        width: 28px !important;
        height: 28px !important;
        min-width: 28px !important;

        place-items: center !important;

        color: #ffffff !important;

        background: var(--batch-green-700) !important;

        border-radius: 50% !important;
    }

    #pos-batch-modal .batch-selected-mark svg {
        width: 16px !important;
        height: 16px !important;
    }

    #pos-batch-modal .batch-option-grid {
        display: grid !important;

        grid-template-columns:
            repeat(
                3,
                minmax(0, 1fr)
            ) !important;

        gap: 7px !important;

        margin-top: auto !important;
    }

    #pos-batch-modal .batch-detail {
        min-width: 0 !important;

        padding: 7px 8px !important;

        background: #f8faf9 !important;

        border: 1px solid #e5ebe6 !important;
        border-radius: 8px !important;
    }

    #pos-batch-modal .batch-detail.cost {
        background: var(--batch-blue-50) !important;

        border-color: #b9d8f5 !important;
    }

    #pos-batch-modal .batch-detail-value {
        display: block !important;

        margin-top: 2px !important;

        overflow: hidden !important;

        color: var(--batch-text-secondary) !important;

        font-size: 12px !important;
        font-weight: 650 !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #pos-batch-modal
    .batch-detail.cost
    .batch-detail-value {
        color: var(--batch-blue-700) !important;
    }

    #pos-batch-modal .batch-empty {
        display: flex !important;

        min-height: 130px !important;

        align-items: center !important;
        justify-content: center !important;
        flex-direction: column !important;
        gap: 7px !important;

        margin-top: 13px !important;
        padding: 20px !important;

        color: var(--batch-muted) !important;

        text-align: center !important;

        background: #f8faf9 !important;

        border:
            1px dashed
            var(--batch-border-strong) !important;

        border-radius: 10px !important;
    }

    #pos-batch-modal .batch-empty svg {
        width: 25px !important;
        height: 25px !important;

        color: var(--batch-green-700) !important;
    }

    #pos-batch-modal .batch-empty strong {
        color: var(--batch-text) !important;

        font-size: 14px !important;
    }

    #pos-batch-modal .batch-quantity-layout {
        display: grid !important;

        grid-template-columns:
            minmax(0, 1fr)
            auto !important;

        align-items: center !important;
        gap: 16px !important;

        margin-top: 13px !important;
    }

    #pos-batch-modal .batch-quantity-copy {
        min-width: 0 !important;
    }

    #pos-batch-modal .batch-quantity-label {
        display: block !important;

        color: var(--batch-text-secondary) !important;

        font-size: 13px !important;
        font-weight: 650 !important;
    }

    #pos-batch-modal .batch-quantity-limit {
        display: block !important;

        margin-top: 3px !important;

        color: var(--batch-muted) !important;

        font-size: 12px !important;
    }

    #pos-batch-modal .batch-quantity-limit strong {
        color: var(--batch-text-secondary) !important;
    }

    #pos-batch-modal .batch-quantity-controls {
        display: grid !important;

        grid-template-columns:
            42px
            minmax(96px, 120px)
            42px !important;

        align-items: center !important;
        gap: 7px !important;
    }

    #pos-batch-modal .batch-quantity-button {
        display: grid !important;

        width: 42px !important;
        height: 42px !important;

        place-items: center !important;

        padding: 0 !important;

        color: var(--batch-green-900) !important;

        appearance: none !important;

        background: var(--batch-green-50) !important;

        border: 1px solid #b8dfc3 !important;
        border-radius: 9px !important;

        cursor: pointer !important;
    }

    #pos-batch-modal
    .batch-quantity-button:hover:not(:disabled) {
        color: #ffffff !important;

        background: var(--batch-green-800) !important;

        border-color:
            var(--batch-green-800) !important;
    }

    #pos-batch-modal .batch-quantity-button:disabled {
        color: #98a2b3 !important;

        background: #f2f4f7 !important;

        border-color: #e4e7ec !important;

        cursor: not-allowed !important;
    }

    #pos-batch-modal .batch-quantity-button svg {
        width: 18px !important;
        height: 18px !important;
    }

    #pos-batch-modal .batch-quantity-input {
        display: block !important;

        width: 100% !important;
        height: 42px !important;
        min-height: 42px !important;

        padding: 0 8px !important;

        color: var(--batch-text) !important;

        font-size: 14px !important;
        font-weight: 700 !important;

        text-align: center !important;

        outline: none !important;

        background: #ffffff !important;

        border:
            1px solid
            var(--batch-border-strong) !important;

        border-radius: 9px !important;
    }

    #pos-batch-modal .batch-quantity-input:focus,
    #pos-batch-modal button:focus-visible,
    #pos-batch-modal .batch-option:focus-within {
        outline: none !important;

        border-color:
            var(--batch-green-700) !important;

        box-shadow:
            0 0 0 4px
            rgba(21, 128, 61, 0.14) !important;
    }

    #pos-batch-modal .batch-total {
        display: flex !important;

        min-height: 64px !important;

        align-items: center !important;
        justify-content: space-between !important;
        gap: 14px !important;

        padding: 11px 14px !important;

        color: #ffffff !important;

        background:
            linear-gradient(
                135deg,
                var(--batch-green-900),
                var(--batch-green-700)
            ) !important;

        border-radius: 11px !important;
    }

    #pos-batch-modal .batch-total span {
        color: #d8f7e1 !important;

        font-size: 12px !important;
        font-weight: 650 !important;
    }

    #pos-batch-modal .batch-total strong {
        font-size: 21px !important;
        font-weight: 780 !important;

        white-space: nowrap !important;
    }

    #pos-batch-modal .batch-actions {
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
            var(--batch-border) !important;
    }

    #pos-batch-modal .batch-button {
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

    #pos-batch-modal .batch-cancel {
        color: var(--batch-text-secondary) !important;

        background: #ffffff !important;

        border:
            1px solid
            var(--batch-border-strong) !important;
    }

    #pos-batch-modal .batch-add {
        color: #ffffff !important;

        background: var(--batch-green-700) !important;

        border:
            1px solid
            var(--batch-green-700) !important;

        box-shadow:
            0 4px 12px
            rgba(21, 128, 61, 0.18) !important;
    }

    #pos-batch-modal .batch-add:hover:not(:disabled) {
        background: var(--batch-green-800) !important;

        border-color:
            var(--batch-green-800) !important;
    }

    #pos-batch-modal .batch-button:disabled {
        opacity: 0.55 !important;

        cursor: not-allowed !important;
    }

    #pos-batch-modal .batch-button svg {
        width: 17px !important;
        height: 17px !important;
    }

    @media (max-width: 720px) {
        #pos-batch-modal .batch-backdrop {
            align-items: flex-end !important;

            padding: 0 !important;
        }

        #pos-batch-modal .batch-dialog {
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

        #pos-batch-modal .batch-header {
            min-height: 78px !important;

            padding: 14px 15px !important;
        }

        #pos-batch-modal .batch-title {
            font-size: 19px !important;
        }

        #pos-batch-modal .batch-body {
            padding: 13px !important;
        }

        #pos-batch-modal .batch-section {
            padding: 14px !important;
        }

        #pos-batch-modal .batch-options {
            grid-template-columns: 1fr !important;
        }

        #pos-batch-modal .batch-quantity-layout {
            grid-template-columns: 1fr !important;
        }

        #pos-batch-modal .batch-quantity-controls {
            grid-template-columns:
                42px
                minmax(0, 1fr)
                42px !important;
        }

        #pos-batch-modal .batch-actions {
            display: grid !important;

            grid-template-columns:
                repeat(
                    2,
                    minmax(0, 1fr)
                ) !important;

            padding: 11px 13px !important;
        }

        #pos-batch-modal .batch-button {
            width: 100% !important;
        }
    }

    @media (max-width: 460px) {
        #pos-batch-modal .batch-option-grid {
            grid-template-columns:
                repeat(
                    2,
                    minmax(0, 1fr)
                ) !important;
        }

        #pos-batch-modal .batch-detail:last-child {
            grid-column: 1 / -1 !important;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        #pos-batch-modal *,
        #pos-batch-modal *::before,
        #pos-batch-modal *::after {
            transition: none !important;
            scroll-behavior: auto !important;
        }
    }
`;

export default function BatchSelectionModal({
    product,
    onClose,
    onAdd,
}: BatchSelectionModalProps) {
    const quantityInputRef =
        useRef<HTMLInputElement | null>(null);

    const [
        selectedBatchId,
        setSelectedBatchId,
    ] = useState<number | null>(null);

    const [
        quantity,
        setQuantity,
    ] = useState('1');

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    useEffect(() => {
        if (!product) {
            return;
        }

        const firstBatch =
            product.batches[0] ?? null;

        const firstAvailableQuantity = Number(
            firstBatch?.available_quantity ?? 0,
        );

        setSelectedBatchId(
            firstBatch?.id ?? null,
        );

        setQuantity(
            firstBatch
                ? String(
                    normaliseQuantity(
                        Math.min(
                            1,
                            firstAvailableQuantity,
                        ),
                    ),
                )
                : '1',
        );

        setErrorMessage('');
    }, [product]);

    useEffect(() => {
        if (!product) {
            return;
        }

        const previousBodyOverflow =
            document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        const focusTimeout = window.setTimeout(
            () => {
                quantityInputRef.current?.focus();
                quantityInputRef.current?.select();
            },
            80,
        );

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
        product,
        onClose,
    ]);

    const selectedBatch = useMemo(
        () => (
            product?.batches.find(
                (batch) =>
                    batch.id === selectedBatchId,
            ) ?? null
        ),
        [
            product,
            selectedBatchId,
        ],
    );

    const numericQuantity = Number(
        quantity || 0,
    );

    const validQuantity =
        Number.isFinite(numericQuantity)
            ? numericQuantity
            : 0;

    const itemTotal = selectedBatch
        ? (
            validQuantity
            * Number(selectedBatch.selling_price)
        )
        : 0;

    if (
        !product
        || typeof document === 'undefined'
    ) {
        return null;
    }

    const selectBatch = (
        batch: PosStockBatch,
    ): void => {
        const availableQuantity = Number(
            batch.available_quantity ?? 0,
        );

        setSelectedBatchId(batch.id);

        setQuantity(
            String(
                normaliseQuantity(
                    Math.min(
                        1,
                        availableQuantity,
                    ),
                ),
            ),
        );

        setErrorMessage('');

        window.setTimeout(
            () => {
                quantityInputRef.current?.focus();
                quantityInputRef.current?.select();
            },
            60,
        );
    };

    const changeQuantity = (
        nextQuantity: number,
    ): void => {
        if (!selectedBatch) {
            return;
        }

        const maximumQuantity = Number(
            selectedBatch.available_quantity,
        );

        const safeQuantity = Math.min(
            maximumQuantity,
            Math.max(
                0.001,
                nextQuantity,
            ),
        );

        setQuantity(
            String(
                normaliseQuantity(safeQuantity),
            ),
        );

        setErrorMessage('');
    };

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (!selectedBatch) {
            setErrorMessage(
                'Select a stock batch before adding the item.',
            );

            return;
        }

        const parsedQuantity = Number(quantity);

        if (
            !Number.isFinite(parsedQuantity)
            || parsedQuantity <= 0
        ) {
            setErrorMessage(
                'Enter a quantity greater than zero.',
            );

            quantityInputRef.current?.focus();

            return;
        }

        if (
            parsedQuantity
            > Number(
                selectedBatch.available_quantity,
            )
        ) {
            setErrorMessage(
                `Only ${formatQuantity(
                    selectedBatch.available_quantity,
                )} ${product.unit} are available in this batch.`,
            );

            quantityInputRef.current?.focus();

            return;
        }

        setErrorMessage('');

        onAdd(
            product,
            selectedBatch,
            normaliseQuantity(parsedQuantity),
        );
    };

    return createPortal(
        <div id="pos-batch-modal">
            <style>
                {batchModalStyles}
            </style>

            <div
                className="batch-backdrop"
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
                <section
                    className="batch-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="batch-dialog-title"
                >
                    <header className="batch-header">
                        <div className="batch-header-copy">
                            <span className="batch-eyebrow">
                                Select stock batch
                            </span>

                            <h2
                                id="batch-dialog-title"
                                className="batch-title"
                                title={product.name}
                            >
                                {product.name}
                            </h2>

                            <span className="batch-stock-summary">
                                Total available:
                                {' '}

                                <strong>
                                    {formatQuantity(
                                        product
                                            .total_available_quantity,
                                    )}
                                    {' '}
                                    {product.unit}
                                </strong>
                            </span>
                        </div>

                        <button
                            type="button"
                            className="batch-close"
                            aria-label="Close batch selection"
                            onClick={onClose}
                        >
                            <Icon name="close" />
                        </button>
                    </header>

                    <form
                        className="batch-form"
                        onSubmit={handleSubmit}
                    >
                        <div className="batch-body">
                            {errorMessage && (
                                <div
                                    className="batch-error"
                                    role="alert"
                                >
                                    <Icon name="alert" />

                                    <span>
                                        {errorMessage}
                                    </span>
                                </div>
                            )}

                            <section className="batch-section">
                                <div className="batch-section-heading">
                                    <span className="batch-step-number">
                                        1
                                    </span>

                                    <div>
                                        <h3 className="batch-section-title">
                                            Select price and batch
                                        </h3>

                                        <p className="batch-section-help">
                                            Review the price,
                                            available stock, expiry
                                            date and purchase cost
                                            before choosing a batch.
                                        </p>
                                    </div>
                                </div>

                                {product.batches.length === 0 ? (
                                    <div className="batch-empty">
                                        <Icon name="package" />

                                        <strong>
                                            No available stock batches
                                        </strong>

                                        <span>
                                            Receive stock for this
                                            product before adding it
                                            to the sale.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="batch-options">
                                        {product.batches.map(
                                            (batch) => {
                                                const isSelected =
                                                    selectedBatchId
                                                    === batch.id;

                                                return (
                                                    <label
                                                        key={batch.id}
                                                        className={
                                                            isSelected
                                                                ? 'batch-option selected'
                                                                : 'batch-option'
                                                        }
                                                    >
                                                        <input
                                                            type="radio"
                                                            className="batch-radio"
                                                            name="stock_batch"
                                                            value={batch.id}
                                                            checked={
                                                                isSelected
                                                            }
                                                            onChange={() => {
                                                                selectBatch(
                                                                    batch,
                                                                );
                                                            }}
                                                        />

                                                        <div className="batch-option-top">
                                                            <div>
                                                                <span className="batch-price-label">
                                                                    Selling price
                                                                </span>

                                                                <strong className="batch-selling-price">
                                                                    {currencyFormatter.format(
                                                                        Number(
                                                                            batch
                                                                                .selling_price,
                                                                        ),
                                                                    )}
                                                                </strong>
                                                            </div>

                                                            {isSelected && (
                                                                <span className="batch-selected-mark">
                                                                    <Icon name="check" />
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="batch-option-grid">
                                                            <div className="batch-detail cost">
                                                                <span className="batch-detail-label">
                                                                    Cost price
                                                                </span>

                                                                <strong className="batch-detail-value">
                                                                    {formatCostPrice(
                                                                        batch,
                                                                    )}
                                                                </strong>
                                                            </div>

                                                            <div className="batch-detail">
                                                                <span className="batch-detail-label">
                                                                    Available
                                                                </span>

                                                                <strong className="batch-detail-value">
                                                                    {formatQuantity(
                                                                        batch
                                                                            .available_quantity,
                                                                    )}
                                                                    {' '}
                                                                    {product.unit}
                                                                </strong>
                                                            </div>

                                                            <div className="batch-detail">
                                                                <span className="batch-detail-label">
                                                                    Expiry
                                                                </span>

                                                                <strong className="batch-detail-value">
                                                                    {formatDate(
                                                                        batch
                                                                            .expiry_date,
                                                                    )}
                                                                </strong>
                                                            </div>
                                                        </div>
                                                    </label>
                                                );
                                            },
                                        )}
                                    </div>
                                )}
                            </section>

                            <section className="batch-section">
                                <div className="batch-section-heading">
                                    <span className="batch-step-number">
                                        2
                                    </span>

                                    <div>
                                        <h3 className="batch-section-title">
                                            Enter quantity
                                        </h3>

                                        <p className="batch-section-help">
                                            Quantity supports up to
                                            three decimal places for
                                            weighted or measured items.
                                        </p>
                                    </div>
                                </div>

                                <div className="batch-quantity-layout">
                                    <div className="batch-quantity-copy">
                                        <span className="batch-quantity-label">
                                            Quantity to add
                                        </span>

                                        <span className="batch-quantity-limit">
                                            Maximum:
                                            {' '}

                                            <strong>
                                                {formatQuantity(
                                                    selectedBatch
                                                        ?.available_quantity,
                                                )}
                                                {' '}
                                                {product.unit}
                                            </strong>
                                        </span>
                                    </div>

                                    <div className="batch-quantity-controls">
                                        <button
                                            type="button"
                                            className="batch-quantity-button"
                                            aria-label="Decrease quantity"
                                            disabled={
                                                !selectedBatch
                                                || validQuantity
                                                <= 0.001
                                            }
                                            onClick={() => {
                                                changeQuantity(
                                                    validQuantity
                                                    - 1,
                                                );
                                            }}
                                        >
                                            <Icon name="minus" />
                                        </button>

                                        <input
                                            ref={quantityInputRef}
                                            type="number"
                                            className="batch-quantity-input"
                                            min="0.001"
                                            max={
                                                selectedBatch
                                                    ?.available_quantity
                                            }
                                            step="0.001"
                                            inputMode="decimal"
                                            value={quantity}
                                            aria-label="Quantity"
                                            onFocus={(event) => {
                                                event
                                                    .currentTarget
                                                    .select();
                                            }}
                                            onChange={(event) => {
                                                setQuantity(
                                                    event.target.value,
                                                );

                                                setErrorMessage('');
                                            }}
                                        />

                                        <button
                                            type="button"
                                            className="batch-quantity-button"
                                            aria-label="Increase quantity"
                                            disabled={
                                                !selectedBatch
                                                || validQuantity
                                                >= Number(
                                                    selectedBatch
                                                        ?.available_quantity
                                                    ?? 0,
                                                )
                                            }
                                            onClick={() => {
                                                changeQuantity(
                                                    validQuantity
                                                    + 1,
                                                );
                                            }}
                                        >
                                            <Icon name="plus" />
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {selectedBatch && (
                                <div className="batch-total">
                                    <span>
                                        Item total
                                    </span>

                                    <strong>
                                        {currencyFormatter.format(
                                            Number.isFinite(
                                                itemTotal,
                                            )
                                                ? itemTotal
                                                : 0,
                                        )}
                                    </strong>
                                </div>
                            )}
                        </div>

                        <footer className="batch-actions">
                            <button
                                type="button"
                                className="batch-button batch-cancel"
                                onClick={onClose}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="batch-button batch-add"
                                disabled={!selectedBatch}
                            >
                                <Icon name="shopping-cart" />

                                Add to Cart
                            </button>
                        </footer>
                    </form>
                </section>
            </div>
        </div>,
        document.body,
    );
}