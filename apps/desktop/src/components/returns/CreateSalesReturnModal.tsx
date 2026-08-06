import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import { createPortal } from 'react-dom';

import type {
    FormEvent,
} from 'react';

import type {
    PosPaymentMethod,
} from '../../types/sale';

import type {
    CreateSalesReturnValues,
    SalesReturnOptions,
} from '../../types/salesReturn';

interface ReturnItemValue {
    sale_item_id: number;
    quantity: string;
    restock: boolean;
}

interface CreateSalesReturnModalProps {
    saleId: number | null;
    options: SalesReturnOptions | null;
    isLoading: boolean;
    isSubmitting: boolean;
    errorMessage: string;
    onClose: () => void;

    onSubmit: (
        values: CreateSalesReturnValues,
    ) => void;
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

function parsePaymentMethod(
    value: string,
): PosPaymentMethod {
    switch (value) {
        case 'card':
            return 'card';

        case 'bank_transfer':
            return 'bank_transfer';

        default:
            return 'cash';
    }
}

const salesReturnModalStyles = `
    #sapo-sales-return-modal,
    #sapo-sales-return-modal *,
    #sapo-sales-return-modal *::before,
    #sapo-sales-return-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-sales-return-modal {
        --srm-green-800: #166534;
        --srm-green-700: #15803d;
        --srm-green-50: #f0fdf4;
        --srm-amber: #b54708;
        --srm-amber-50: #fffaeb;
        --srm-red: #dc2626;
        --srm-red-light: #fef2f2;
        --srm-text: #111827;
        --srm-text-secondary: #1f2937;
        --srm-muted: #6b7280;
        --srm-border: #e5e7eb;
        --srm-border-strong: #d1d5db;
        --srm-bg: #f9fafb;
        --srm-white: #ffffff;
        --srm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        inset: 0 !important;
        z-index: 2000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        margin: 0 !important;
        background: rgba(15, 23, 42, 0.42) !important;
        -webkit-backdrop-filter: blur(6px) saturate(120%) !important;
        backdrop-filter: blur(6px) saturate(120%) !important;
        font-family: var(--srm-font) !important;
        color: var(--srm-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }

    #sapo-sales-return-modal h2,
    #sapo-sales-return-modal h3,
    #sapo-sales-return-modal p,
    #sapo-sales-return-modal span,
    #sapo-sales-return-modal strong,
    #sapo-sales-return-modal small,
    #sapo-sales-return-modal label,
    #sapo-sales-return-modal button,
    #sapo-sales-return-modal input,
    #sapo-sales-return-modal select,
    #sapo-sales-return-modal textarea {
        font-family: var(--srm-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-sales-return-modal h2,
    #sapo-sales-return-modal h3,
    #sapo-sales-return-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Modal shell ---------- */
    #sapo-sales-return-modal .srm-modal {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 760px !important;
        max-height: calc(100vh - 48px) !important;
        max-height: calc(100dvh - 48px) !important;
        background: var(--srm-white) !important;
        border-radius: 14px !important;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.22) !important;
        overflow: hidden !important;
        animation: srm-pop-in 0.15s ease-out !important;
    }

    @keyframes srm-pop-in {
        from {
            opacity: 0;
            transform: scale(0.97) translateY(4px);
        }

        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }

    /* ---------- Header ---------- */
    #sapo-sales-return-modal .srm-header {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 20px 24px !important;
        background: var(--srm-white) !important;
        border-bottom: 1px solid var(--srm-border) !important;
    }

    #sapo-sales-return-modal .srm-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--srm-green-700) !important;
        margin-bottom: 4px !important;
        background: transparent !important;
    }

    #sapo-sales-return-modal .srm-header h2 {
        font-size: 18px !important;
        font-weight: 700 !important;
        color: var(--srm-text) !important;
    }

    #sapo-sales-return-modal .srm-close-button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 34px !important;
        height: 34px !important;
        flex-shrink: 0 !important;
        font-size: 20px !important;
        line-height: 1 !important;
        color: var(--srm-muted) !important;
        background: var(--srm-bg) !important;
        border: 1px solid var(--srm-border) !important;
        border-radius: 9px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-sales-return-modal .srm-close-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        color: var(--srm-text) !important;
    }

    #sapo-sales-return-modal .srm-close-button:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Loading / empty states ---------- */
    #sapo-sales-return-modal .srm-state {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        padding: 60px 24px !important;
        text-align: center !important;
        color: var(--srm-muted) !important;
        font-size: 13.5px !important;
    }

    #sapo-sales-return-modal .srm-spinner {
        width: 28px !important;
        height: 28px !important;
        border: 3px solid var(--srm-border) !important;
        border-top-color: var(--srm-green-700) !important;
        border-radius: 50% !important;
        animation: srm-spin 0.7s linear infinite !important;
    }

    @keyframes srm-spin {
        to {
            transform: rotate(360deg);
        }
    }

    #sapo-sales-return-modal .srm-state strong {
        font-size: 15px !important;
        font-weight: 700 !important;
        color: var(--srm-text) !important;
    }

    /* ---------- Scrollable form body ---------- */
    #sapo-sales-return-modal .srm-form {
        display: flex !important;
        flex-direction: column !important;
        min-height: 0 !important;
        flex: 1 !important;
        overflow: hidden !important;
    }

    #sapo-sales-return-modal .srm-body {
        display: flex !important;
        flex-direction: column !important;
        gap: 18px !important;
        min-height: 0 !important;
        flex: 1 !important;
        padding: 22px 24px !important;
        overflow-y: auto !important;
        background: var(--srm-bg) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--srm-border-strong) transparent !important;
    }

    #sapo-sales-return-modal .srm-body::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-sales-return-modal .srm-body::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-sales-return-modal .srm-body::-webkit-scrollbar-thumb {
        background: var(--srm-border-strong) !important;
        border-radius: 8px !important;
    }

    /* ---------- Alerts / notices ---------- */
    #sapo-sales-return-modal .srm-alert {
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        background: var(--srm-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    #sapo-sales-return-modal .srm-notice {
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        background: var(--srm-amber-50) !important;
        border: 1px solid #fde68a !important;
        color: var(--srm-amber) !important;
    }

    /* ---------- Detail fields section ---------- */
    #sapo-sales-return-modal .srm-details-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 16px 18px !important;
    }

    #sapo-sales-return-modal .srm-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        min-width: 0 !important;
    }

    #sapo-sales-return-modal .srm-field.srm-full-width {
        grid-column: 1 / -1 !important;
    }

    #sapo-sales-return-modal .srm-field span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--srm-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-sales-return-modal .srm-field input,
    #sapo-sales-return-modal .srm-field select,
    #sapo-sales-return-modal .srm-field textarea {
        width: 100% !important;
        padding: 9px 12px !important;
        font-size: 13.5px !important;
        color: var(--srm-text-secondary) !important;
        background: var(--srm-white) !important;
        border: 1px solid var(--srm-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        resize: vertical !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-sales-return-modal .srm-field select {
        cursor: pointer !important;
    }

    #sapo-sales-return-modal .srm-field input:focus,
    #sapo-sales-return-modal .srm-field select:focus,
    #sapo-sales-return-modal .srm-field textarea:focus {
        border-color: var(--srm-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-sales-return-modal .srm-field input:disabled,
    #sapo-sales-return-modal .srm-field select:disabled,
    #sapo-sales-return-modal .srm-field textarea:disabled {
        background: var(--srm-bg) !important;
        color: var(--srm-muted) !important;
        cursor: not-allowed !important;
    }

    /* ---------- Items section ---------- */
    #sapo-sales-return-modal .srm-items-section {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
    }

    #sapo-sales-return-modal .srm-items-heading h3 {
        font-size: 14.5px !important;
        font-weight: 700 !important;
        color: var(--srm-text) !important;
    }

    #sapo-sales-return-modal .srm-items-heading p {
        margin-top: 2px !important;
        font-size: 12px !important;
        color: var(--srm-muted) !important;
    }

    #sapo-sales-return-modal .srm-items-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
    }

    #sapo-sales-return-modal .srm-item-card {
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        background: var(--srm-white) !important;
        border: 1px solid var(--srm-border) !important;
        border-radius: 12px !important;
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04) !important;
    }

    #sapo-sales-return-modal .srm-item-card.fully-returned {
        opacity: 0.65 !important;
        background: var(--srm-bg) !important;
    }

    #sapo-sales-return-modal .srm-item-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 14px !important;
        padding: 13px 16px !important;
        background: var(--srm-green-50) !important;
        border-bottom: 1px solid #d3ecda !important;
    }

    #sapo-sales-return-modal .srm-item-identity {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
        min-width: 0 !important;
    }

    #sapo-sales-return-modal .srm-item-name {
        font-size: 14.5px !important;
        font-weight: 700 !important;
        color: var(--srm-text) !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-sales-return-modal .srm-item-batch {
        font-size: 12px !important;
        color: var(--srm-muted) !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-sales-return-modal .srm-item-price {
        font-size: 14.5px !important;
        font-weight: 700 !important;
        color: var(--srm-green-800) !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
    }

    #sapo-sales-return-modal .srm-item-quantities {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 10px !important;
        padding: 14px 16px !important;
        border-bottom: 1px solid #edf1ee !important;
    }

    #sapo-sales-return-modal .srm-qty-box {
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;
        min-width: 0 !important;
    }

    #sapo-sales-return-modal .srm-qty-box span {
        font-size: 11px !important;
        font-weight: 600 !important;
        color: var(--srm-muted) !important;
        background: transparent !important;
    }

    #sapo-sales-return-modal .srm-qty-box strong {
        font-size: 13.5px !important;
        font-weight: 700 !important;
        color: var(--srm-text-secondary) !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-sales-return-modal .srm-item-controls {
        display: grid !important;
        grid-template-columns: 200px 1fr !important;
        align-items: start !important;
        gap: 16px !important;
        padding: 14px 16px !important;
    }

    #sapo-sales-return-modal .srm-item-controls label:first-child span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--srm-text-secondary) !important;
        display: block !important;
        margin-bottom: 6px !important;
    }

    #sapo-sales-return-modal .srm-item-controls input[type="number"] {
        width: 100% !important;
        padding: 9px 12px !important;
        font-size: 13.5px !important;
        color: var(--srm-text-secondary) !important;
        background: var(--srm-white) !important;
        border: 1px solid var(--srm-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-sales-return-modal .srm-item-controls input[type="number"]:focus {
        border-color: var(--srm-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-sales-return-modal .srm-item-controls input[type="number"]:disabled {
        background: var(--srm-bg) !important;
        color: var(--srm-muted) !important;
        cursor: not-allowed !important;
    }

    #sapo-sales-return-modal .srm-restock-option {
        display: flex !important;
        align-items: flex-start !important;
        gap: 10px !important;
        padding: 10px 12px !important;
        background: var(--srm-bg) !important;
        border: 1px solid var(--srm-border) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
    }

    #sapo-sales-return-modal .srm-restock-option input {
        width: 17px !important;
        height: 17px !important;
        min-width: 17px !important;
        margin-top: 1px !important;
        accent-color: var(--srm-green-700) !important;
        cursor: pointer !important;
    }

    #sapo-sales-return-modal .srm-restock-option input:disabled {
        cursor: not-allowed !important;
    }

    #sapo-sales-return-modal .srm-restock-copy {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
        min-width: 0 !important;
    }

    #sapo-sales-return-modal .srm-restock-copy strong {
        font-size: 12.5px !important;
        font-weight: 700 !important;
        color: var(--srm-text-secondary) !important;
    }

    #sapo-sales-return-modal .srm-restock-copy span {
        font-size: 11.5px !important;
        color: var(--srm-muted) !important;
        line-height: 1.4 !important;
        background: transparent !important;
    }

    /* ---------- Refund preview ---------- */
    #sapo-sales-return-modal .srm-refund-preview {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 16px !important;
        padding: 16px 18px !important;
        background: linear-gradient(135deg, var(--srm-green-50), #ffffff) !important;
        border: 1px solid #b8dfc3 !important;
        border-radius: 11px !important;
        flex-wrap: wrap !important;
    }

    #sapo-sales-return-modal .srm-refund-preview > span:first-child {
        font-size: 12.5px !important;
        font-weight: 650 !important;
        color: #477054 !important;
        background: transparent !important;
    }

    #sapo-sales-return-modal .srm-refund-preview strong {
        font-size: 22px !important;
        font-weight: 750 !important;
        color: var(--srm-green-800) !important;
    }

    #sapo-sales-return-modal .srm-refund-preview small {
        display: block !important;
        width: 100% !important;
        font-size: 11.5px !important;
        color: var(--srm-muted) !important;
        background: transparent !important;
    }

    /* ---------- Footer actions ---------- */
    #sapo-sales-return-modal .srm-actions {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        padding: 16px 24px !important;
        background: var(--srm-white) !important;
        border-top: 1px solid var(--srm-border) !important;
    }

    #sapo-sales-return-modal .srm-secondary-button {
        padding: 10px 20px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--srm-white) !important;
        border: 1px solid var(--srm-border-strong) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-sales-return-modal .srm-secondary-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        border-color: #9ca3af !important;
    }

    #sapo-sales-return-modal .srm-primary-button {
        padding: 10px 22px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        background: var(--srm-green-700) !important;
        border: 1px solid var(--srm-green-700) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease !important;
    }

    #sapo-sales-return-modal .srm-primary-button:hover:not(:disabled) {
        background: var(--srm-green-800) !important;
    }

    #sapo-sales-return-modal button:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 760px) {
        #sapo-sales-return-modal .srm-item-quantities {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        #sapo-sales-return-modal .srm-item-controls {
            grid-template-columns: 1fr !important;
        }
    }

    @media (max-width: 560px) {
        #sapo-sales-return-modal {
            padding: 12px !important;
        }

        #sapo-sales-return-modal .srm-modal {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
        }

        #sapo-sales-return-modal .srm-header,
        #sapo-sales-return-modal .srm-body,
        #sapo-sales-return-modal .srm-actions {
            padding-left: 16px !important;
            padding-right: 16px !important;
        }

        #sapo-sales-return-modal .srm-details-grid {
            grid-template-columns: 1fr !important;
        }

        #sapo-sales-return-modal .srm-field {
            grid-column: 1 / -1 !important;
        }

        #sapo-sales-return-modal .srm-item-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
        }

        #sapo-sales-return-modal .srm-refund-preview {
            flex-direction: column !important;
            align-items: flex-start !important;
        }

        #sapo-sales-return-modal .srm-actions {
            flex-direction: column-reverse !important;
            align-items: stretch !important;
        }

        #sapo-sales-return-modal .srm-secondary-button,
        #sapo-sales-return-modal .srm-primary-button {
            width: 100% !important;
        }
    }
`;

export default function CreateSalesReturnModal({
    saleId,
    options,
    isLoading,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: CreateSalesReturnModalProps) {
    const [
        reason,
        setReason,
    ] = useState('');

    const [
        refundMethod,
        setRefundMethod,
    ] = useState<PosPaymentMethod>(
        'cash',
    );

    const [
        notes,
        setNotes,
    ] = useState('');

    const [
        items,
        setItems,
    ] = useState<ReturnItemValue[]>(
        [],
    );

    const [
        localError,
        setLocalError,
    ] = useState('');

    useEffect(() => {
        if (!options) {
            return;
        }

        setReason('');
        setRefundMethod('cash');
        setNotes('');
        setLocalError('');

        setItems(
            options.items.map(
                (item) => ({
                    sale_item_id:
                        item.sale_item_id,

                    quantity: '',
                    restock: true,
                }),
            ),
        );
    }, [options]);

    useEffect(() => {
        if (saleId === null) {
            return;
        }

        const handleKeyDown = (
            event: KeyboardEvent,
        ): void => {
            if (
                event.key === 'Escape'
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
            window.removeEventListener(
                'keydown',
                handleKeyDown,
            );
        };
    }, [
        saleId,
        isSubmitting,
        onClose,
    ]);

    const estimatedRefund = useMemo(
        () => {
            if (!options) {
                return 0;
            }

            return items.reduce(
                (
                    total,
                    value,
                ) => {
                    const option =
                        options.items.find(
                            (item) =>
                                item.sale_item_id
                                === value.sale_item_id,
                        );

                    if (!option) {
                        return total;
                    }

                    const quantity =
                        Number(
                            value.quantity || 0,
                        );

                    if (
                        quantity <= 0
                        || option
                            .remaining_quantity
                        <= 0
                    ) {
                        return total;
                    }

                    const safeQuantity =
                        Math.min(
                            quantity,
                            option
                                .remaining_quantity,
                        );

                    return total
                        + (
                            option
                                .remaining_refund_amount
                            * safeQuantity
                            / option
                                .remaining_quantity
                        );
                },
                0,
            );
        },
        [
            items,
            options,
        ],
    );

    if (saleId === null) {
        return null;
    }

    const updateQuantity = (
        saleItemId: number,
        value: string,
    ): void => {
        setItems(
            (current) =>
                current.map(
                    (item) =>
                        item.sale_item_id
                            === saleItemId
                            ? {
                                ...item,
                                quantity: value,
                            }
                            : item,
                ),
        );

        setLocalError('');
    };

    const updateRestock = (
        saleItemId: number,
        checked: boolean,
    ): void => {
        setItems(
            (current) =>
                current.map(
                    (item) =>
                        item.sale_item_id
                            === saleItemId
                            ? {
                                ...item,
                                restock: checked,
                            }
                            : item,
                ),
        );

        setLocalError('');
    };

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (!options) {
            setLocalError(
                'Return details are not available.',
            );

            return;
        }

        if (!reason.trim()) {
            setLocalError(
                'Please enter the reason for the return.',
            );

            return;
        }

        const selectedItems = items
            .filter(
                (item) =>
                    Number(item.quantity) > 0,
            )
            .map(
                (item) => ({
                    sale_item_id:
                        item.sale_item_id,

                    quantity:
                        Number(item.quantity),

                    restock:
                        item.restock,
                }),
            );

        if (
            selectedItems.length === 0
        ) {
            setLocalError(
                'Enter a return quantity for at least one item.',
            );

            return;
        }

        for (
            const selectedItem
            of selectedItems
        ) {
            const option =
                options.items.find(
                    (item) =>
                        item.sale_item_id
                        === selectedItem
                            .sale_item_id,
                );

            if (!option) {
                setLocalError(
                    'One of the selected return items is no longer available.',
                );

                return;
            }

            if (
                selectedItem.quantity <= 0
                || selectedItem.quantity
                > option.remaining_quantity
            ) {
                setLocalError(
                    `Only ${option.remaining_quantity} ${option.product.unit} can be returned for ${option.product.name}.`,
                );

                return;
            }
        }

        onSubmit({
            reason: reason.trim(),
            refund_method:
                refundMethod,

            notes: notes.trim(),
            items: selectedItems,
        });
    };

    return createPortal(
        <div
            id="sapo-sales-return-modal"
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
            <style>
                {salesReturnModalStyles}
            </style>

            <section
                className="srm-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-sales-return-title"
                onMouseDown={(event) => {
                    event.stopPropagation();
                }}
            >
                <header className="srm-header">
                    <div>
                        <span className="srm-kicker">
                            Sales Return
                        </span>

                        <h2 id="create-sales-return-title">
                            {options
                                ? options.sale
                                    .sale_number
                                : 'Process Return'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="srm-close-button"
                        disabled={isSubmitting}
                        aria-label="Close return modal"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                {isLoading ? (
                    <div className="srm-state">
                        <div className="srm-spinner" />

                        <span>
                            Loading returnable items...
                        </span>
                    </div>
                ) : options ? (
                    <form
                        className="srm-form"
                        onSubmit={handleSubmit}
                    >
                        <div className="srm-body">
                            {(localError
                                || errorMessage) && (
                                    <div
                                        className="srm-alert"
                                        role="alert"
                                    >
                                        {localError
                                            || errorMessage}
                                    </div>
                                )}

                            {!options
                                .has_returnable_items && (
                                    <div className="srm-notice">
                                        All items from this sale
                                        have already been returned.
                                    </div>
                                )}

                            <section className="srm-details-grid">
                                <label className="srm-field">
                                    <span>
                                        Return Reason *
                                    </span>

                                    <input
                                        type="text"
                                        maxLength={255}
                                        value={reason}
                                        disabled={isSubmitting}
                                        placeholder="Example: Wrong product or customer changed mind"
                                        onChange={(event) => {
                                            setReason(
                                                event.target.value,
                                            );

                                            setLocalError('');
                                        }}
                                    />
                                </label>

                                <label className="srm-field">
                                    <span>
                                        Refund Method *
                                    </span>

                                    <select
                                        value={refundMethod}
                                        disabled={isSubmitting}
                                        onChange={(event) => {
                                            setRefundMethod(
                                                parsePaymentMethod(
                                                    event.target.value,
                                                ),
                                            );
                                        }}
                                    >
                                        <option value="cash">
                                            Cash
                                        </option>

                                        <option value="card">
                                            Card
                                        </option>

                                        <option value="bank_transfer">
                                            Bank Transfer
                                        </option>
                                    </select>
                                </label>

                                <label className="srm-field srm-full-width">
                                    <span>Notes</span>

                                    <textarea
                                        rows={2}
                                        maxLength={1500}
                                        value={notes}
                                        disabled={isSubmitting}
                                        placeholder="Optional additional information"
                                        onChange={(event) => {
                                            setNotes(
                                                event.target.value,
                                            );
                                        }}
                                    />
                                </label>
                            </section>

                            <section className="srm-items-section">
                                <header className="srm-items-heading">
                                    <h3>
                                        Select Returned Items
                                    </h3>

                                    <p>
                                        Returned stock is
                                        restored to its exact
                                        original batch.
                                    </p>
                                </header>

                                <div className="srm-items-list">
                                    {options.items.map(
                                        (option) => {
                                            const itemValue =
                                                items.find(
                                                    (item) =>
                                                        item.sale_item_id
                                                        === option
                                                            .sale_item_id,
                                                );

                                            const isFullyReturned =
                                                option
                                                    .remaining_quantity
                                                <= 0;

                                            return (
                                                <article
                                                    key={
                                                        option
                                                            .sale_item_id
                                                    }
                                                    className={
                                                        isFullyReturned
                                                            ? 'srm-item-card fully-returned'
                                                            : 'srm-item-card'
                                                    }
                                                >
                                                    <header className="srm-item-header">
                                                        <div className="srm-item-identity">
                                                            <strong
                                                                className="srm-item-name"
                                                                title={
                                                                    option
                                                                        .product
                                                                        .name
                                                                }
                                                            >
                                                                {
                                                                    option
                                                                        .product
                                                                        .name
                                                                }
                                                            </strong>

                                                            <span className="srm-item-batch">
                                                                Batch:{' '}
                                                                {option
                                                                    .batch
                                                                    .batch_number
                                                                    || option
                                                                        .batch
                                                                        .batch_code}
                                                            </span>
                                                        </div>

                                                        <strong className="srm-item-price">
                                                            {currencyFormatter
                                                                .format(
                                                                    option
                                                                        .selling_price,
                                                                )}
                                                        </strong>
                                                    </header>

                                                    <div className="srm-item-quantities">
                                                        <div className="srm-qty-box">
                                                            <span>
                                                                Sold
                                                            </span>

                                                            <strong>
                                                                {
                                                                    option
                                                                        .sold_quantity
                                                                }{' '}
                                                                {
                                                                    option
                                                                        .product
                                                                        .unit
                                                                }
                                                            </strong>
                                                        </div>

                                                        <div className="srm-qty-box">
                                                            <span>
                                                                Previously Returned
                                                            </span>

                                                            <strong>
                                                                {
                                                                    option
                                                                        .returned_quantity
                                                                }
                                                            </strong>
                                                        </div>

                                                        <div className="srm-qty-box">
                                                            <span>
                                                                Available to Return
                                                            </span>

                                                            <strong>
                                                                {
                                                                    option
                                                                        .remaining_quantity
                                                                }
                                                            </strong>
                                                        </div>

                                                        <div className="srm-qty-box">
                                                            <span>
                                                                Remaining Refund
                                                            </span>

                                                            <strong>
                                                                {currencyFormatter
                                                                    .format(
                                                                        option
                                                                            .remaining_refund_amount,
                                                                    )}
                                                            </strong>
                                                        </div>
                                                    </div>

                                                    <div className="srm-item-controls">
                                                        <label>
                                                            <span>
                                                                Return Quantity
                                                            </span>

                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={
                                                                    option
                                                                        .remaining_quantity
                                                                }
                                                                step="0.001"
                                                                disabled={
                                                                    isFullyReturned
                                                                    || isSubmitting
                                                                }
                                                                value={
                                                                    itemValue
                                                                        ?.quantity
                                                                    ?? ''
                                                                }
                                                                placeholder="0"
                                                                onChange={(event) => {
                                                                    updateQuantity(
                                                                        option
                                                                            .sale_item_id,

                                                                        event
                                                                            .target
                                                                            .value,
                                                                    );
                                                                }}
                                                            />
                                                        </label>

                                                        <label className="srm-restock-option">
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    itemValue
                                                                        ?.restock
                                                                    ?? true
                                                                }
                                                                disabled={
                                                                    isFullyReturned
                                                                    || isSubmitting
                                                                }
                                                                onChange={(event) => {
                                                                    updateRestock(
                                                                        option
                                                                            .sale_item_id,

                                                                        event
                                                                            .target
                                                                            .checked,
                                                                    );
                                                                }}
                                                            />

                                                            <span className="srm-restock-copy">
                                                                <strong>
                                                                    Restore to Stock
                                                                </strong>

                                                                <span>
                                                                    Turn this off
                                                                    for damaged or
                                                                    unusable items.
                                                                </span>
                                                            </span>
                                                        </label>
                                                    </div>
                                                </article>
                                            );
                                        },
                                    )}
                                </div>
                            </section>

                            <div className="srm-refund-preview">
                                <span>
                                    Estimated Refund
                                </span>

                                <strong>
                                    {currencyFormatter
                                        .format(
                                            estimatedRefund,
                                        )}
                                </strong>

                                <small>
                                    The server calculates the
                                    final exact refund using
                                    original discounts.
                                </small>
                            </div>
                        </div>

                        <footer className="srm-actions">
                            <button
                                type="button"
                                className="srm-secondary-button"
                                disabled={isSubmitting}
                                onClick={onClose}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="srm-primary-button"
                                disabled={
                                    isSubmitting
                                    || !options
                                        .has_returnable_items
                                }
                            >
                                {isSubmitting
                                    ? 'Processing Return...'
                                    : 'Complete Return'}
                            </button>
                        </footer>
                    </form>
                ) : (
                    <div className="srm-state">
                        <strong>
                            Unable to load return details.
                        </strong>

                        {errorMessage && (
                            <span>
                                {errorMessage}
                            </span>
                        )}
                    </div>
                )}
            </section>
        </div>,
        document.body,
    );
}