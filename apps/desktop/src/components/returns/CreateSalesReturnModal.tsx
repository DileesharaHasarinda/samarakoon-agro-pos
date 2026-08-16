import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import type {
    FormEvent,
    KeyboardEvent as ReactKeyboardEvent,
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

/* =========================================================
   QUANTITY HELPERS
   ========================================================= */

function parseQuantityValue(
    value: string,
): number {
    const cleaned =
        value
            .replace(
                /,/g,
                '',
            )
            .trim();

    if (
        cleaned === ''
        || cleaned === '.'
    ) {
        return 0;
    }

    const quantity =
        Number(
            cleaned,
        );

    return Number.isFinite(
        quantity,
    )
        ? quantity
        : 0;
}

function formatQuantityWhileTyping(
    value: string,
): string {
    const cleaned =
        value
            .replace(
                /,/g,
                '',
            )
            .replace(
                /[^\d.]/g,
                '',
            );

    if (
        cleaned === ''
    ) {
        return '';
    }

    const firstDecimalIndex =
        cleaned.indexOf(
            '.',
        );

    let integerPart =
        firstDecimalIndex
            === -1
            ? cleaned
            : cleaned.slice(
                0,
                firstDecimalIndex,
            );

    const decimalPart =
        firstDecimalIndex
            === -1
            ? ''
            : cleaned
                .slice(
                    firstDecimalIndex
                    + 1,
                )
                .replace(
                    /\./g,
                    '',
                )
                .slice(
                    0,
                    3,
                );

    /*
     * Prevent:
     *
     * 010000
     *
     * and convert it to:
     *
     * 10,000
     */
    integerPart =
        integerPart.replace(
            /^0+(?=\d)/,
            '',
        );

    if (
        integerPart === ''
    ) {
        integerPart =
            '0';
    }

    const groupedInteger =
        integerPart.replace(
            /\B(?=(\d{3})+(?!\d))/g,
            ',',
        );

    if (
        firstDecimalIndex
        !== -1
    ) {
        return `${groupedInteger}.${decimalPart}`;
    }

    return groupedInteger;
}

/**
 * Final quantity formatting.
 *
 * Unlike money formatting, this DOES NOT
 * force decimal places.
 *
 * Examples:
 *
 * 10       -> 10
 * 10000    -> 10,000
 * 1.5      -> 1.5
 * 2.375    -> 2.375
 * 1.500    -> 1.5
 */
function formatQuantityValue(
    value: string,
): string {
    const quantity =
        parseQuantityValue(
            value,
        );

    if (
        !Number.isFinite(
            quantity,
        )
        || quantity <= 0
    ) {
        return '0';
    }

    return new Intl.NumberFormat(
        'en-US',
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
            useGrouping: true,
        },
    ).format(
        quantity,
    );
}

function displayQuantity(
    value: number,
): string {
    return new Intl.NumberFormat(
        'en-US',
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
            useGrouping: true,
        },
    ).format(
        value,
    );
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

        --srm-font:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Helvetica,
            Arial,
            sans-serif;

        position: fixed !important;

        inset: 0 !important;

        z-index: 2000 !important;

        display: flex !important;

        width: 100vw !important;

        height: 100vh !important;
        height: 100dvh !important;

        align-items: center !important;

        justify-content: center !important;

        padding:
            24px !important;

        margin: 0 !important;

        background:
            rgba(
                15,
                23,
                42,
                0.42
            ) !important;

        -webkit-backdrop-filter:
            blur(6px)
            saturate(120%) !important;

        backdrop-filter:
            blur(6px)
            saturate(120%) !important;

        font-family:
            var(--srm-font) !important;

        color:
            var(--srm-text-secondary) !important;

        font-size:
            14px !important;

        line-height:
            1.5 !important;
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
        font-family:
            var(--srm-font) !important;

        letter-spacing:
            normal !important;

        text-transform:
            none !important;
    }

    #sapo-sales-return-modal h2,
    #sapo-sales-return-modal h3,
    #sapo-sales-return-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* =====================================================
       MODAL SHELL
       ===================================================== */

    #sapo-sales-return-modal
    .srm-modal {
        display: flex !important;

        width: 100% !important;

        max-width:
            760px !important;

        max-height:
            calc(
                100vh
                - 48px
            ) !important;

        max-height:
            calc(
                100dvh
                - 48px
            ) !important;

        flex-direction:
            column !important;

        background:
            var(--srm-white) !important;

        border-radius:
            14px !important;

        box-shadow:
            0 24px 48px
            rgba(
                15,
                23,
                42,
                0.22
            ) !important;

        overflow:
            hidden !important;

        animation:
            srm-pop-in
            0.15s
            ease-out !important;
    }

    @keyframes srm-pop-in {
        from {
            opacity: 0;

            transform:
                scale(
                    0.97
                )
                translateY(
                    4px
                );
        }

        to {
            opacity: 1;

            transform:
                scale(
                    1
                )
                translateY(
                    0
                );
        }
    }

    /* =====================================================
       HEADER
       ===================================================== */

    #sapo-sales-return-modal
    .srm-header {
        display: flex !important;

        flex-shrink:
            0 !important;

        align-items:
            flex-start !important;

        justify-content:
            space-between !important;

        gap:
            12px !important;

        padding:
            20px
            24px !important;

        background:
            var(--srm-white) !important;

        border-bottom:
            1px solid
            var(--srm-border) !important;
    }

    #sapo-sales-return-modal
    .srm-kicker {
        display:
            inline-block !important;

        margin-bottom:
            4px !important;

        color:
            var(--srm-green-700) !important;

        font-size:
            12px !important;

        font-weight:
            600 !important;

        letter-spacing:
            0.04em !important;

        text-transform:
            uppercase !important;
    }

    #sapo-sales-return-modal
    .srm-header h2 {
        color:
            var(--srm-text) !important;

        font-size:
            18px !important;

        font-weight:
            700 !important;
    }

    #sapo-sales-return-modal
    .srm-close-button {
        display: flex !important;

        width:
            34px !important;

        height:
            34px !important;

        flex-shrink:
            0 !important;

        align-items:
            center !important;

        justify-content:
            center !important;

        padding:
            0 !important;

        color:
            var(--srm-muted) !important;

        font-size:
            20px !important;

        line-height:
            1 !important;

        background:
            var(--srm-bg) !important;

        border:
            1px solid
            var(--srm-border) !important;

        border-radius:
            9px !important;

        cursor:
            pointer !important;
    }

    #sapo-sales-return-modal
    .srm-close-button:hover:not(:disabled) {
        color:
            var(--srm-text) !important;

        background:
            #f1f5f9 !important;
    }

    #sapo-sales-return-modal
    .srm-close-button:disabled {
        opacity:
            0.5 !important;

        cursor:
            not-allowed !important;
    }

    /* =====================================================
       LOADING / EMPTY
       ===================================================== */

    #sapo-sales-return-modal
    .srm-state {
        display: flex !important;

        flex-direction:
            column !important;

        align-items:
            center !important;

        justify-content:
            center !important;

        gap:
            10px !important;

        padding:
            60px
            24px !important;

        color:
            var(--srm-muted) !important;

        font-size:
            13.5px !important;

        text-align:
            center !important;
    }

    #sapo-sales-return-modal
    .srm-spinner {
        width:
            28px !important;

        height:
            28px !important;

        border:
            3px solid
            var(--srm-border) !important;

        border-top-color:
            var(--srm-green-700) !important;

        border-radius:
            50% !important;

        animation:
            srm-spin
            0.7s
            linear
            infinite !important;
    }

    @keyframes srm-spin {
        to {
            transform:
                rotate(
                    360deg
                );
        }
    }

    #sapo-sales-return-modal
    .srm-state strong {
        color:
            var(--srm-text) !important;

        font-size:
            15px !important;

        font-weight:
            700 !important;
    }

    /* =====================================================
       FORM
       ===================================================== */

    #sapo-sales-return-modal
    .srm-form {
        display: flex !important;

        min-height:
            0 !important;

        flex:
            1 !important;

        flex-direction:
            column !important;

        overflow:
            hidden !important;
    }

    #sapo-sales-return-modal
    .srm-body {
        display: flex !important;

        min-height:
            0 !important;

        flex:
            1 !important;

        flex-direction:
            column !important;

        gap:
            18px !important;

        padding:
            22px
            24px !important;

        overflow-x:
            hidden !important;

        overflow-y:
            auto !important;

        background:
            var(--srm-bg) !important;

        scrollbar-width:
            thin !important;

        scrollbar-color:
            var(--srm-border-strong)
            transparent !important;
    }

    #sapo-sales-return-modal
    .srm-body::-webkit-scrollbar {
        width:
            8px !important;
    }

    #sapo-sales-return-modal
    .srm-body::-webkit-scrollbar-track {
        background:
            transparent !important;
    }

    #sapo-sales-return-modal
    .srm-body::-webkit-scrollbar-thumb {
        background:
            var(--srm-border-strong) !important;

        border-radius:
            8px !important;
    }

    /* =====================================================
       ALERTS
       ===================================================== */

    #sapo-sales-return-modal
    .srm-alert {
        padding:
            12px
            14px !important;

        color:
            #b91c1c !important;

        font-size:
            13px !important;

        font-weight:
            500 !important;

        background:
            var(--srm-red-light) !important;

        border:
            1px solid
            #fecaca !important;

        border-radius:
            8px !important;
    }

    #sapo-sales-return-modal
    .srm-notice {
        padding:
            12px
            14px !important;

        color:
            var(--srm-amber) !important;

        font-size:
            13px !important;

        font-weight:
            600 !important;

        background:
            var(--srm-amber-50) !important;

        border:
            1px solid
            #fde68a !important;

        border-radius:
            8px !important;
    }

    /* =====================================================
       DETAILS
       ===================================================== */

    #sapo-sales-return-modal
    .srm-details-grid {
        display:
            grid !important;

        grid-template-columns:
            1fr
            1fr !important;

        gap:
            16px
            18px !important;
    }

    #sapo-sales-return-modal
    .srm-field {
        display:
            flex !important;

        min-width:
            0 !important;

        flex-direction:
            column !important;

        gap:
            6px !important;
    }

    #sapo-sales-return-modal
    .srm-field.srm-full-width {
        grid-column:
            1 / -1 !important;
    }

    #sapo-sales-return-modal
    .srm-field span {
        color:
            var(--srm-text-secondary) !important;

        font-size:
            12.5px !important;

        font-weight:
            600 !important;
    }

    #sapo-sales-return-modal
    .srm-field input,
    #sapo-sales-return-modal
    .srm-field select,
    #sapo-sales-return-modal
    .srm-field textarea {
        width:
            100% !important;

        padding:
            9px
            12px !important;

        color:
            var(--srm-text-secondary) !important;

        font-size:
            13.5px !important;

        background:
            var(--srm-white) !important;

        border:
            1px solid
            var(--srm-border-strong) !important;

        border-radius:
            8px !important;

        outline:
            none !important;

        resize:
            vertical !important;

        transition:
            border-color
            0.15s ease,
            box-shadow
            0.15s ease !important;
    }

    #sapo-sales-return-modal
    .srm-field select {
        cursor:
            pointer !important;
    }

    #sapo-sales-return-modal
    .srm-field input:focus,
    #sapo-sales-return-modal
    .srm-field select:focus,
    #sapo-sales-return-modal
    .srm-field textarea:focus {
        border-color:
            var(--srm-green-700) !important;

        box-shadow:
            0 0 0 3px
            rgba(
                22,
                163,
                74,
                0.12
            ) !important;
    }

    #sapo-sales-return-modal
    .srm-field input:disabled,
    #sapo-sales-return-modal
    .srm-field select:disabled,
    #sapo-sales-return-modal
    .srm-field textarea:disabled {
        color:
            var(--srm-muted) !important;

        background:
            var(--srm-bg) !important;

        cursor:
            not-allowed !important;
    }

    /* =====================================================
       ITEMS
       ===================================================== */

    #sapo-sales-return-modal
    .srm-items-section {
        display:
            flex !important;

        flex-direction:
            column !important;

        gap:
            12px !important;
    }

    #sapo-sales-return-modal
    .srm-items-heading h3 {
        color:
            var(--srm-text) !important;

        font-size:
            14.5px !important;

        font-weight:
            700 !important;
    }

    #sapo-sales-return-modal
    .srm-items-heading p {
        margin-top:
            2px !important;

        color:
            var(--srm-muted) !important;

        font-size:
            12px !important;
    }

    #sapo-sales-return-modal
    .srm-items-list {
        display:
            flex !important;

        flex-direction:
            column !important;

        gap:
            12px !important;
    }

    #sapo-sales-return-modal
    .srm-item-card {
        display:
            flex !important;

        flex-direction:
            column !important;

        overflow:
            hidden !important;

        background:
            var(--srm-white) !important;

        border:
            1px solid
            var(--srm-border) !important;

        border-radius:
            12px !important;

        box-shadow:
            0 1px 2px
            rgba(
                16,
                24,
                40,
                0.04
            ) !important;
    }

    #sapo-sales-return-modal
    .srm-item-card.fully-returned {
        opacity:
            0.65 !important;

        background:
            var(--srm-bg) !important;
    }

    #sapo-sales-return-modal
    .srm-item-header {
        display:
            flex !important;

        align-items:
            center !important;

        justify-content:
            space-between !important;

        gap:
            14px !important;

        padding:
            13px
            16px !important;

        background:
            var(--srm-green-50) !important;

        border-bottom:
            1px solid
            #d3ecda !important;
    }

    #sapo-sales-return-modal
    .srm-item-identity {
        display:
            flex !important;

        min-width:
            0 !important;

        flex-direction:
            column !important;

        gap:
            2px !important;
    }

    #sapo-sales-return-modal
    .srm-item-name {
        overflow:
            hidden !important;

        color:
            var(--srm-text) !important;

        font-size:
            14.5px !important;

        font-weight:
            700 !important;

        text-overflow:
            ellipsis !important;

        white-space:
            nowrap !important;
    }

    #sapo-sales-return-modal
    .srm-item-batch {
        overflow:
            hidden !important;

        color:
            var(--srm-muted) !important;

        font-size:
            12px !important;

        text-overflow:
            ellipsis !important;

        white-space:
            nowrap !important;
    }

    #sapo-sales-return-modal
    .srm-item-price {
        flex-shrink:
            0 !important;

        color:
            var(--srm-green-800) !important;

        font-size:
            14.5px !important;

        font-weight:
            700 !important;

        white-space:
            nowrap !important;
    }

    #sapo-sales-return-modal
    .srm-item-quantities {
        display:
            grid !important;

        grid-template-columns:
            repeat(
                4,
                minmax(
                    0,
                    1fr
                )
            ) !important;

        gap:
            10px !important;

        padding:
            14px
            16px !important;

        border-bottom:
            1px solid
            #edf1ee !important;
    }

    #sapo-sales-return-modal
    .srm-qty-box {
        display:
            flex !important;

        min-width:
            0 !important;

        flex-direction:
            column !important;

        gap:
            3px !important;
    }

    #sapo-sales-return-modal
    .srm-qty-box span {
        color:
            var(--srm-muted) !important;

        font-size:
            11px !important;

        font-weight:
            600 !important;
    }

    #sapo-sales-return-modal
    .srm-qty-box strong {
        overflow:
            hidden !important;

        color:
            var(--srm-text-secondary) !important;

        font-size:
            13.5px !important;

        font-weight:
            700 !important;

        text-overflow:
            ellipsis !important;

        white-space:
            nowrap !important;
    }

    /* =====================================================
       ITEM CONTROLS
       ===================================================== */

    #sapo-sales-return-modal
    .srm-item-controls {
        display:
            grid !important;

        grid-template-columns:
            200px
            1fr !important;

        align-items:
            start !important;

        gap:
            16px !important;

        padding:
            14px
            16px !important;
    }

    #sapo-sales-return-modal
    .srm-item-controls
    label:first-child span {
        display:
            block !important;

        margin-bottom:
            6px !important;

        color:
            var(--srm-text-secondary) !important;

        font-size:
            12.5px !important;

        font-weight:
            600 !important;
    }

    #sapo-sales-return-modal
    .srm-item-controls
    .srm-quantity-input {
        width:
            100% !important;

        padding:
            9px
            12px !important;

        color:
            var(--srm-text-secondary) !important;

        font-size:
            15px !important;

        font-weight:
            700 !important;

        font-variant-numeric:
            tabular-nums !important;

        text-align:
            right !important;

        background:
            var(--srm-white) !important;

        border:
            1px solid
            var(--srm-border-strong) !important;

        border-radius:
            8px !important;

        outline:
            none !important;

        transition:
            border-color
            0.15s ease,
            box-shadow
            0.15s ease !important;
    }

    #sapo-sales-return-modal
    .srm-item-controls
    .srm-quantity-input:focus {
        border-color:
            var(--srm-green-700) !important;

        box-shadow:
            0 0 0 3px
            rgba(
                22,
                163,
                74,
                0.12
            ) !important;
    }

    #sapo-sales-return-modal
    .srm-item-controls
    .srm-quantity-input:disabled {
        color:
            var(--srm-muted) !important;

        background:
            var(--srm-bg) !important;

        cursor:
            not-allowed !important;
    }

    #sapo-sales-return-modal
    .srm-input-error {
        border-color:
            var(--srm-red) !important;

        box-shadow:
            0 0 0 3px
            rgba(
                220,
                38,
                38,
                0.10
            ) !important;
    }

    #sapo-sales-return-modal
    .srm-field-error {
        display:
            block !important;

        margin-top:
            6px !important;

        color:
            var(--srm-red) !important;

        font-size:
            11.5px !important;

        font-weight:
            600 !important;

        line-height:
            1.35 !important;
    }

    /* =====================================================
       RESTOCK
       ===================================================== */

    #sapo-sales-return-modal
    .srm-restock-option {
        display:
            flex !important;

        align-items:
            flex-start !important;

        gap:
            10px !important;

        padding:
            10px
            12px !important;

        background:
            var(--srm-bg) !important;

        border:
            1px solid
            var(--srm-border) !important;

        border-radius:
            8px !important;

        cursor:
            pointer !important;
    }

    #sapo-sales-return-modal
    .srm-restock-option:focus-within {
        border-color:
            var(--srm-green-700) !important;

        box-shadow:
            0 0 0 3px
            rgba(
                22,
                163,
                74,
                0.12
            ) !important;
    }

    #sapo-sales-return-modal
    .srm-restock-option input {
        width:
            17px !important;

        height:
            17px !important;

        min-width:
            17px !important;

        margin-top:
            1px !important;

        accent-color:
            var(--srm-green-700) !important;

        cursor:
            pointer !important;
    }

    #sapo-sales-return-modal
    .srm-restock-option input:disabled {
        cursor:
            not-allowed !important;
    }

    #sapo-sales-return-modal
    .srm-restock-copy {
        display:
            flex !important;

        min-width:
            0 !important;

        flex-direction:
            column !important;

        gap:
            2px !important;
    }

    #sapo-sales-return-modal
    .srm-restock-copy strong {
        color:
            var(--srm-text-secondary) !important;

        font-size:
            12.5px !important;

        font-weight:
            700 !important;
    }

    #sapo-sales-return-modal
    .srm-restock-copy span {
        color:
            var(--srm-muted) !important;

        font-size:
            11.5px !important;

        line-height:
            1.4 !important;
    }

    /* =====================================================
       KEYBOARD HELP
       ===================================================== */

    #sapo-sales-return-modal
    .srm-keyboard-help {
        display:
            flex !important;

        align-items:
            center !important;

        flex-wrap:
            wrap !important;

        gap:
            6px !important;

        padding:
            10px
            12px !important;

        color:
            var(--srm-muted) !important;

        font-size:
            11px !important;

        background:
            var(--srm-green-50) !important;

        border:
            1px solid
            #d3ecda !important;

        border-radius:
            8px !important;
    }

    #sapo-sales-return-modal
    .srm-key {
        display:
            inline-flex !important;

        min-height:
            22px !important;

        align-items:
            center !important;

        justify-content:
            center !important;

        padding:
            2px
            7px !important;

        color:
            var(--srm-text-secondary) !important;

        font-size:
            10px !important;

        font-weight:
            700 !important;

        background:
            var(--srm-white) !important;

        border:
            1px solid
            var(--srm-border-strong) !important;

        border-radius:
            4px !important;
    }

    /* =====================================================
       REFUND PREVIEW
       ===================================================== */

    #sapo-sales-return-modal
    .srm-refund-preview {
        display:
            flex !important;

        align-items:
            center !important;

        justify-content:
            space-between !important;

        gap:
            16px !important;

        padding:
            16px
            18px !important;

        flex-wrap:
            wrap !important;

        background:
            linear-gradient(
                135deg,
                var(--srm-green-50),
                #ffffff
            ) !important;

        border:
            1px solid
            #b8dfc3 !important;

        border-radius:
            11px !important;
    }

    #sapo-sales-return-modal
    .srm-refund-preview
    > span:first-child {
        color:
            #477054 !important;

        font-size:
            12.5px !important;

        font-weight:
            650 !important;
    }

    #sapo-sales-return-modal
    .srm-refund-preview strong {
        color:
            var(--srm-green-800) !important;

        font-size:
            22px !important;

        font-weight:
            750 !important;
    }

    #sapo-sales-return-modal
    .srm-refund-preview small {
        display:
            block !important;

        width:
            100% !important;

        color:
            var(--srm-muted) !important;

        font-size:
            11.5px !important;
    }

    /* =====================================================
       ACTIONS
       ===================================================== */

    #sapo-sales-return-modal
    .srm-actions {
        display:
            flex !important;

        flex-shrink:
            0 !important;

        align-items:
            center !important;

        justify-content:
            flex-end !important;

        gap:
            10px !important;

        padding:
            16px
            24px !important;

        background:
            var(--srm-white) !important;

        border-top:
            1px solid
            var(--srm-border) !important;
    }

    #sapo-sales-return-modal
    .srm-secondary-button {
        padding:
            10px
            20px !important;

        color:
            #374151 !important;

        font-size:
            13.5px !important;

        font-weight:
            600 !important;

        background:
            var(--srm-white) !important;

        border:
            1px solid
            var(--srm-border-strong) !important;

        border-radius:
            8px !important;

        cursor:
            pointer !important;
    }

    #sapo-sales-return-modal
    .srm-secondary-button:hover:not(:disabled) {
        background:
            #f1f5f9 !important;

        border-color:
            #9ca3af !important;
    }

    #sapo-sales-return-modal
    .srm-primary-button {
        padding:
            10px
            22px !important;

        color:
            #ffffff !important;

        font-size:
            13.5px !important;

        font-weight:
            600 !important;

        background:
            var(--srm-green-700) !important;

        border:
            1px solid
            var(--srm-green-700) !important;

        border-radius:
            8px !important;

        cursor:
            pointer !important;
    }

    #sapo-sales-return-modal
    .srm-primary-button:hover:not(:disabled) {
        background:
            var(--srm-green-800) !important;
    }

    #sapo-sales-return-modal
    .srm-primary-button:focus-visible,
    #sapo-sales-return-modal
    .srm-secondary-button:focus-visible {
        outline:
            none !important;

        box-shadow:
            0 0 0 3px
            rgba(
                22,
                163,
                74,
                0.18
            ) !important;
    }

    #sapo-sales-return-modal
    button:disabled {
        opacity:
            0.6 !important;

        cursor:
            not-allowed !important;
    }

    /* =====================================================
       RESPONSIVE
       ===================================================== */

    @media (
        max-width: 760px
    ) {
        #sapo-sales-return-modal
        .srm-item-quantities {
            grid-template-columns:
                repeat(
                    2,
                    minmax(
                        0,
                        1fr
                    )
                ) !important;
        }

        #sapo-sales-return-modal
        .srm-item-controls {
            grid-template-columns:
                1fr !important;
        }
    }

    @media (
        max-width: 560px
    ) {
        #sapo-sales-return-modal {
            padding:
                12px !important;
        }

        #sapo-sales-return-modal
        .srm-modal {
            max-height:
                calc(
                    100vh
                    - 24px
                ) !important;

            max-height:
                calc(
                    100dvh
                    - 24px
                ) !important;
        }

        #sapo-sales-return-modal
        .srm-header,
        #sapo-sales-return-modal
        .srm-body,
        #sapo-sales-return-modal
        .srm-actions {
            padding-left:
                16px !important;

            padding-right:
                16px !important;
        }

        #sapo-sales-return-modal
        .srm-details-grid {
            grid-template-columns:
                1fr !important;
        }

        #sapo-sales-return-modal
        .srm-field {
            grid-column:
                1 / -1 !important;
        }

        #sapo-sales-return-modal
        .srm-item-header {
            flex-direction:
                column !important;

            align-items:
                flex-start !important;

            gap:
                6px !important;
        }

        #sapo-sales-return-modal
        .srm-refund-preview {
            flex-direction:
                column !important;

            align-items:
                flex-start !important;
        }

        #sapo-sales-return-modal
        .srm-actions {
            flex-direction:
                column-reverse !important;

            align-items:
                stretch !important;
        }

        #sapo-sales-return-modal
        .srm-secondary-button,
        #sapo-sales-return-modal
        .srm-primary-button {
            width:
                100% !important;
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
    ] =
        useState<PosPaymentMethod>(
            'cash',
        );

    const [
        notes,
        setNotes,
    ] = useState('');

    const [
        items,
        setItems,
    ] =
        useState<
            ReturnItemValue[]
        >(
            [],
        );

    const [
        localError,
        setLocalError,
    ] = useState('');

    const [
        itemErrors,
        setItemErrors,
    ] =
        useState<
            Record<
                number,
                string
            >
        >({});

    const formRef =
        useRef<HTMLFormElement | null>(
            null,
        );

    const reasonInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const submitButtonRef =
        useRef<HTMLButtonElement | null>(
            null,
        );

    /* =====================================================
       RESET FORM
       ===================================================== */

    useEffect(
        () => {
            if (!options) {
                return;
            }

            setReason('');
            setRefundMethod(
                'cash',
            );
            setNotes('');
            setLocalError('');
            setItemErrors({});

            setItems(
                options.items.map(
                    (
                        item,
                    ) => ({
                        sale_item_id:
                            item.sale_item_id,

                        /*
                         * Return quantity starts
                         * from 0.
                         */
                        quantity:
                            '0',

                        restock:
                            true,
                    }),
                ),
            );

            const timeout =
                window.setTimeout(
                    () => {
                        reasonInputRef
                            .current
                            ?.focus();
                    },
                    0,
                );

            return () => {
                window.clearTimeout(
                    timeout,
                );
            };
        },
        [
            options,
        ],
    );

    /* =====================================================
       ESCAPE KEY
       ===================================================== */

    useEffect(
        () => {
            if (
                saleId === null
            ) {
                return;
            }

            const handleKeyDown =
                (
                    event:
                        KeyboardEvent,
                ): void => {
                    if (
                        event.key
                        === 'Escape'
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
        },
        [
            saleId,
            isSubmitting,
            onClose,
        ],
    );

    /* =====================================================
       ESTIMATED REFUND
       ===================================================== */

    const estimatedRefund =
        useMemo(
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
                                (
                                    item,
                                ) =>
                                    item.sale_item_id
                                    === value
                                        .sale_item_id,
                            );

                        if (
                            !option
                        ) {
                            return total;
                        }

                        const quantity =
                            parseQuantityValue(
                                value
                                    .quantity,
                            );

                        if (
                            quantity
                            <= 0
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

    if (
        saleId === null
    ) {
        return null;
    }

    /* =====================================================
       QUANTITY
       ===================================================== */

    const updateQuantity = (
        saleItemId: number,
        value: string,
    ): void => {
        const formattedValue =
            formatQuantityWhileTyping(
                value,
            );

        setItems(
            (
                current,
            ) =>
                current.map(
                    (
                        item,
                    ) =>
                        item.sale_item_id
                            === saleItemId
                            ? {
                                ...item,

                                quantity:
                                    formattedValue,
                            }
                            : item,
                ),
        );

        setItemErrors(
            (
                current,
            ) => {
                const next = {
                    ...current,
                };

                delete next[
                    saleItemId
                ];

                return next;
            },
        );

        setLocalError('');
    };

    const normalizeQuantity = (
        saleItemId: number,
    ): void => {
        setItems(
            (
                current,
            ) =>
                current.map(
                    (
                        item,
                    ) =>
                        item.sale_item_id
                            === saleItemId
                            ? {
                                ...item,

                                quantity:
                                    formatQuantityValue(
                                        item
                                            .quantity,
                                    ),
                            }
                            : item,
                ),
        );
    };

    const validateQuantity = (
        saleItemId: number,
        value: string,
    ): boolean => {
        if (!options) {
            return false;
        }

        const option =
            options.items.find(
                (
                    item,
                ) =>
                    item.sale_item_id
                    === saleItemId,
            );

        if (!option) {
            setItemErrors(
                (
                    current,
                ) => ({
                    ...current,

                    [saleItemId]:
                        'This item is no longer available in the return details.',
                }),
            );

            return false;
        }

        const quantity =
            parseQuantityValue(
                value,
            );

        /*
         * 0 is okay while navigating.
         *
         * It simply means this particular
         * item is not being returned.
         */
        if (
            quantity <= 0
        ) {
            setItemErrors(
                (
                    current,
                ) => {
                    const next = {
                        ...current,
                    };

                    delete next[
                        saleItemId
                    ];

                    return next;
                },
            );

            return true;
        }

        if (
            option
                .remaining_quantity
            <= 0
        ) {
            setItemErrors(
                (
                    current,
                ) => ({
                    ...current,

                    [saleItemId]:
                        `${option.product.name} has already been fully returned.`,
                }),
            );

            return false;
        }

        if (
            quantity
            > option
                .remaining_quantity
        ) {
            setItemErrors(
                (
                    current,
                ) => ({
                    ...current,

                    [saleItemId]:
                        `Maximum return quantity for ${option.product.name} is ${displayQuantity(
                            option
                                .remaining_quantity,
                        )} ${option.product.unit}. Enter ${displayQuantity(
                            option
                                .remaining_quantity,
                        )} or less.`,
                }),
            );

            return false;
        }

        setItemErrors(
            (
                current,
            ) => {
                const next = {
                    ...current,
                };

                delete next[
                    saleItemId
                ];

                return next;
            },
        );

        return true;
    };

    /* =====================================================
       RESTOCK
       ===================================================== */

    const updateRestock = (
        saleItemId: number,
        checked: boolean,
    ): void => {
        setItems(
            (
                current,
            ) =>
                current.map(
                    (
                        item,
                    ) =>
                        item.sale_item_id
                            === saleItemId
                            ? {
                                ...item,

                                restock:
                                    checked,
                            }
                            : item,
                ),
        );

        setLocalError('');
    };

    /* =====================================================
       FOCUS HELPERS
       ===================================================== */

    const focusFieldBySelector = (
        selector: string,
    ): void => {
        const element =
            formRef.current
                ?.querySelector<
                    HTMLElement
                >(
                    selector,
                );

        element
            ?.focus();

        if (
            element
            instanceof HTMLInputElement
            && element.type
            !== 'checkbox'
        ) {
            element
                .select();
        }
    };

    const focusNextField = (
        currentElement:
            HTMLElement,
    ): void => {
        const form =
            formRef.current;

        if (!form) {
            return;
        }

        const fields =
            Array.from(
                form.querySelectorAll<
                    HTMLElement
                >(
                    '[data-enter-nav="true"]:not([disabled])',
                ),
            );

        const currentIndex =
            fields.indexOf(
                currentElement,
            );

        if (
            currentIndex
            === -1
        ) {
            return;
        }

        const nextField =
            fields[
            currentIndex
            + 1
            ];

        if (nextField) {
            nextField
                .focus();

            if (
                nextField
                instanceof HTMLInputElement
                && nextField.type
                !== 'checkbox'
            ) {
                nextField
                    .select();
            }

            return;
        }

        submitButtonRef
            .current
            ?.focus();
    };

    /* =====================================================
       ENTER HANDLERS
       ===================================================== */

    const handleReasonEnter = (
        event:
            ReactKeyboardEvent<HTMLInputElement>,
    ): void => {
        if (
            event.key
            !== 'Enter'
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (
            !reason.trim()
        ) {
            setLocalError(
                'Return reason is required. Enter a short reason before continuing.',
            );

            event
                .currentTarget
                .focus();

            return;
        }

        setLocalError('');

        focusNextField(
            event.currentTarget,
        );
    };

    const handleEnterNavigation = (
        event:
            ReactKeyboardEvent<
                HTMLInputElement
                | HTMLSelectElement
                | HTMLTextAreaElement
            >,
    ): void => {
        if (
            event.key
            !== 'Enter'
        ) {
            return;
        }

        /*
         * Shift + Enter still creates a
         * new line in Notes.
         */
        if (
            event.currentTarget
            instanceof HTMLTextAreaElement
            && event.shiftKey
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        focusNextField(
            event.currentTarget,
        );
    };

    const handleQuantityEnter = (
        event:
            ReactKeyboardEvent<HTMLInputElement>,
        saleItemId: number,
    ): void => {
        if (
            event.key
            !== 'Enter'
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        normalizeQuantity(
            saleItemId,
        );

        const isValid =
            validateQuantity(
                saleItemId,

                event
                    .currentTarget
                    .value,
            );

        if (!isValid) {
            setLocalError(
                'Please correct the highlighted return quantity before continuing.',
            );

            event
                .currentTarget
                .focus();

            event
                .currentTarget
                .select();

            return;
        }

        setLocalError('');

        focusNextField(
            event.currentTarget,
        );
    };

    const handleRestockEnter = (
        event:
            ReactKeyboardEvent<HTMLInputElement>,
        saleItemId: number,
        currentValue: boolean,
    ): void => {
        if (
            event.key
            !== 'Enter'
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        updateRestock(
            saleItemId,
            !currentValue,
        );

        focusNextField(
            event.currentTarget,
        );
    };

    /* =====================================================
       SUBMIT
       ===================================================== */

    const handleSubmit = (
        event:
            FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        setItemErrors({});

        if (!options) {
            setLocalError(
                'Return details are not available. Close this window and open the return again.',
            );

            return;
        }

        if (
            !options
                .has_returnable_items
        ) {
            setLocalError(
                'This sale has no items available to return. All returnable quantities have already been used.',
            );

            return;
        }

        const cleanReason =
            reason.trim();

        if (!cleanReason) {
            setLocalError(
                'Return reason is required. Enter a short reason for this return.',
            );

            reasonInputRef
                .current
                ?.focus();

            return;
        }

        const selectedItems =
            items
                .map(
                    (
                        item,
                    ) => ({
                        sale_item_id:
                            item.sale_item_id,

                        quantity:
                            parseQuantityValue(
                                item
                                    .quantity,
                            ),

                        restock:
                            item.restock,
                    }),
                )
                .filter(
                    (
                        item,
                    ) =>
                        item.quantity
                        > 0,
                );

        if (
            selectedItems.length
            === 0
        ) {
            setLocalError(
                'Enter a return quantity greater than 0 for at least one item.',
            );

            focusFieldBySelector(
                '.srm-quantity-input:not(:disabled)',
            );

            return;
        }

        const nextItemErrors:
            Record<
                number,
                string
            > = {};

        for (
            const selectedItem
            of selectedItems
        ) {
            const option =
                options.items.find(
                    (
                        item,
                    ) =>
                        item.sale_item_id
                        === selectedItem
                            .sale_item_id,
                );

            if (!option) {
                setLocalError(
                    'One selected item is no longer available in the return details. Close this window and try again.',
                );

                return;
            }

            if (
                !Number.isFinite(
                    selectedItem
                        .quantity,
                )
                || selectedItem
                    .quantity
                <= 0
            ) {
                nextItemErrors[
                    selectedItem
                        .sale_item_id
                ] =
                    `Enter a return quantity greater than 0 for ${option.product.name}.`;

                continue;
            }

            if (
                option
                    .remaining_quantity
                <= 0
            ) {
                nextItemErrors[
                    selectedItem
                        .sale_item_id
                ] =
                    `${option.product.name} has already been fully returned.`;

                continue;
            }

            if (
                selectedItem
                    .quantity
                > option
                    .remaining_quantity
            ) {
                nextItemErrors[
                    selectedItem
                        .sale_item_id
                ] =
                    `Return quantity for ${option.product.name} cannot exceed ${displayQuantity(
                        option
                            .remaining_quantity,
                    )} ${option.product.unit}. Enter ${displayQuantity(
                        option
                            .remaining_quantity,
                    )} or less.`;
            }
        }

        const firstErrorItemId =
            Number(
                Object.keys(
                    nextItemErrors,
                )[0],
            );

        if (
            Object.keys(
                nextItemErrors,
            ).length
            > 0
        ) {
            setItemErrors(
                nextItemErrors,
            );

            setLocalError(
                'Please correct the highlighted return quantity before completing the return.',
            );

            focusFieldBySelector(
                `[data-quantity-item-id="${firstErrorItemId}"]`,
            );

            return;
        }

        setLocalError('');

        /*
         * Quantities sent to Laravel are
         * clean numbers.
         *
         * UI:
         * 10,000
         *
         * API:
         * 10000
         */
        onSubmit({
            reason:
                cleanReason,

            refund_method:
                refundMethod,

            notes:
                notes.trim(),

            items:
                selectedItems,
        });
    };

    /* =====================================================
       MODAL
       ===================================================== */

    return createPortal(
        <div
            id="sapo-sales-return-modal"
            role="presentation"
            onMouseDown={(
                event,
            ) => {
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
                onMouseDown={(
                    event,
                ) => {
                    event
                        .stopPropagation();
                }}
            >
                {/* HEADER */}

                <header className="srm-header">
                    <div>
                        <span className="srm-kicker">
                            Sales Return
                        </span>

                        <h2 id="create-sales-return-title">
                            {options
                                ? options
                                    .sale
                                    .sale_number
                                : 'Process Return'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="srm-close-button"
                        disabled={
                            isSubmitting
                        }
                        aria-label="Close return modal"
                        onClick={
                            onClose
                        }
                    >
                        ×
                    </button>
                </header>

                {/* LOADING */}

                {isLoading ? (
                    <div className="srm-state">
                        <div className="srm-spinner" />

                        <span>
                            Loading returnable items...
                        </span>
                    </div>
                ) : options ? (
                    <form
                        ref={
                            formRef
                        }
                        className="srm-form"
                        onSubmit={
                            handleSubmit
                        }
                    >
                        <div className="srm-body">
                            {/* ERRORS */}

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

                            {/* NO RETURNABLE ITEMS */}

                            {!options
                                .has_returnable_items && (
                                    <div className="srm-notice">
                                        All items from this
                                        sale have already
                                        been returned.
                                    </div>
                                )}

                            {/* RETURN DETAILS */}

                            <section className="srm-details-grid">
                                {/* REASON */}

                                <label className="srm-field">
                                    <span>
                                        Return Reason *
                                    </span>

                                    <input
                                        ref={
                                            reasonInputRef
                                        }
                                        type="text"
                                        maxLength={
                                            255
                                        }
                                        value={
                                            reason
                                        }
                                        disabled={
                                            isSubmitting
                                        }
                                        placeholder="Example: Wrong product or customer changed mind"
                                        data-enter-nav="true"
                                        onKeyDown={
                                            handleReasonEnter
                                        }
                                        onChange={(
                                            event,
                                        ) => {
                                            setReason(
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

                                {/* REFUND METHOD */}

                                <label className="srm-field">
                                    <span>
                                        Refund Method *
                                    </span>

                                    <select
                                        value={
                                            refundMethod
                                        }
                                        disabled={
                                            isSubmitting
                                        }
                                        data-enter-nav="true"
                                        onKeyDown={
                                            handleEnterNavigation
                                        }
                                        onChange={(
                                            event,
                                        ) => {
                                            setRefundMethod(
                                                parsePaymentMethod(
                                                    event
                                                        .target
                                                        .value,
                                                ),
                                            );

                                            setLocalError(
                                                '',
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

                                {/* NOTES */}

                                <label className="srm-field srm-full-width">
                                    <span>
                                        Notes
                                    </span>

                                    <textarea
                                        rows={
                                            2
                                        }
                                        maxLength={
                                            1500
                                        }
                                        value={
                                            notes
                                        }
                                        disabled={
                                            isSubmitting
                                        }
                                        placeholder="Optional additional information"
                                        data-enter-nav="true"
                                        onKeyDown={
                                            handleEnterNavigation
                                        }
                                        onChange={(
                                            event,
                                        ) => {
                                            setNotes(
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
                            </section>

                            {/* ITEMS */}

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
                                    {options
                                        .items
                                        .map(
                                            (
                                                option,
                                            ) => {
                                                const itemValue =
                                                    items.find(
                                                        (
                                                            item,
                                                        ) =>
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
                                                        {/* ITEM HEADER */}

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
                                                                    Batch:
                                                                    {' '}

                                                                    {option
                                                                        .batch
                                                                        .batch_number
                                                                        || option
                                                                            .batch
                                                                            .batch_code}
                                                                </span>
                                                            </div>

                                                            <strong className="srm-item-price">
                                                                {currencyFormatter.format(
                                                                    option
                                                                        .selling_price,
                                                                )}
                                                            </strong>
                                                        </header>

                                                        {/* ORIGINAL QUANTITIES */}

                                                        <div className="srm-item-quantities">
                                                            <div className="srm-qty-box">
                                                                <span>
                                                                    Sold
                                                                </span>

                                                                <strong>
                                                                    {displayQuantity(
                                                                        option
                                                                            .sold_quantity,
                                                                    )}
                                                                    {' '}
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
                                                                    {displayQuantity(
                                                                        option
                                                                            .returned_quantity,
                                                                    )}
                                                                </strong>
                                                            </div>

                                                            <div className="srm-qty-box">
                                                                <span>
                                                                    Available to Return
                                                                </span>

                                                                <strong>
                                                                    {displayQuantity(
                                                                        option
                                                                            .remaining_quantity,
                                                                    )}
                                                                </strong>
                                                            </div>

                                                            <div className="srm-qty-box">
                                                                <span>
                                                                    Remaining Refund
                                                                </span>

                                                                <strong>
                                                                    {currencyFormatter.format(
                                                                        option
                                                                            .remaining_refund_amount,
                                                                    )}
                                                                </strong>
                                                            </div>
                                                        </div>

                                                        {/* CONTROLS */}

                                                        <div className="srm-item-controls">
                                                            {/* QUANTITY */}

                                                            <label>
                                                                <span>
                                                                    Return Quantity
                                                                </span>

                                                                <input
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    autoComplete="off"
                                                                    className={
                                                                        itemErrors[
                                                                            option
                                                                                .sale_item_id
                                                                        ]
                                                                            ? 'srm-quantity-input srm-input-error'
                                                                            : 'srm-quantity-input'
                                                                    }
                                                                    disabled={
                                                                        isFullyReturned
                                                                        || isSubmitting
                                                                    }
                                                                    value={
                                                                        itemValue
                                                                            ?.quantity
                                                                        ?? '0'
                                                                    }
                                                                    placeholder="0"
                                                                    data-enter-nav="true"
                                                                    data-quantity-item-id={
                                                                        option
                                                                            .sale_item_id
                                                                    }
                                                                    aria-invalid={
                                                                        Boolean(
                                                                            itemErrors[
                                                                            option
                                                                                .sale_item_id
                                                                            ],
                                                                        )
                                                                    }
                                                                    onFocus={(
                                                                        event,
                                                                    ) => {
                                                                        event
                                                                            .currentTarget
                                                                            .select();
                                                                    }}
                                                                    onKeyDown={(
                                                                        event,
                                                                    ) => {
                                                                        handleQuantityEnter(
                                                                            event,

                                                                            option
                                                                                .sale_item_id,
                                                                        );
                                                                    }}
                                                                    onBlur={(
                                                                        event,
                                                                    ) => {
                                                                        normalizeQuantity(
                                                                            option
                                                                                .sale_item_id,
                                                                        );

                                                                        validateQuantity(
                                                                            option
                                                                                .sale_item_id,

                                                                            event
                                                                                .currentTarget
                                                                                .value,
                                                                        );
                                                                    }}
                                                                    onChange={(
                                                                        event,
                                                                    ) => {
                                                                        updateQuantity(
                                                                            option
                                                                                .sale_item_id,

                                                                            event
                                                                                .target
                                                                                .value,
                                                                        );
                                                                    }}
                                                                />

                                                                {itemErrors[
                                                                    option
                                                                        .sale_item_id
                                                                ] && (
                                                                        <small className="srm-field-error">
                                                                            {
                                                                                itemErrors[
                                                                                option
                                                                                    .sale_item_id
                                                                                ]
                                                                            }
                                                                        </small>
                                                                    )}
                                                            </label>

                                                            {/* RESTOCK */}

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
                                                                    data-enter-nav="true"
                                                                    onKeyDown={(
                                                                        event,
                                                                    ) => {
                                                                        handleRestockEnter(
                                                                            event,

                                                                            option
                                                                                .sale_item_id,

                                                                            itemValue
                                                                                ?.restock
                                                                            ?? true,
                                                                        );
                                                                    }}
                                                                    onChange={(
                                                                        event,
                                                                    ) => {
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

                            {/* KEYBOARD HELP */}

                            <div className="srm-keyboard-help">
                                <span className="srm-key">
                                    Enter
                                </span>

                                <span>
                                    Next field
                                </span>

                                <span>
                                    ·
                                </span>

                                <span className="srm-key">
                                    ↑ / ↓
                                </span>

                                <span>
                                    Refund method
                                </span>

                                <span>
                                    ·
                                </span>

                                <span className="srm-key">
                                    Shift + Enter
                                </span>

                                <span>
                                    New line in Notes
                                </span>
                            </div>

                            {/* REFUND */}

                            <div className="srm-refund-preview">
                                <span>
                                    Estimated Refund
                                </span>

                                <strong>
                                    {currencyFormatter.format(
                                        estimatedRefund,
                                    )}
                                </strong>

                                <small>
                                    The server calculates
                                    the final exact refund
                                    using original discounts.
                                </small>
                            </div>
                        </div>

                        {/* ACTIONS */}

                        <footer className="srm-actions">
                            <button
                                type="button"
                                className="srm-secondary-button"
                                disabled={
                                    isSubmitting
                                }
                                onClick={
                                    onClose
                                }
                            >
                                Cancel
                            </button>

                            <button
                                ref={
                                    submitButtonRef
                                }
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
                                {
                                    errorMessage
                                }
                            </span>
                        )}
                    </div>
                )}
            </section>
        </div>,
        document.body,
    );
}