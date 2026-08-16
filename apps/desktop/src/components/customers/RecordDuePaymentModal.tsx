import {
    useEffect,
    useRef,
    useState,
} from 'react';

import type {
    FormEvent,
    KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import type {
    DuePaymentInput,
    DueSale,
} from '../../types/customer';

import type {
    PosPaymentMethod,
} from '../../types/sale';

interface RecordDuePaymentModalProps {
    sale: DueSale | null;
    isSubmitting: boolean;
    errorMessage: string;
    onClose: () => void;

    onSubmit: (
        values: DuePaymentInput,
    ) => void;
}

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
   MONEY HELPERS
   ========================================================= */

const moneyInputFormatter =
    new Intl.NumberFormat(
        'en-US',
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

function parseMoneyValue(
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

    const amount =
        Number(
            cleaned,
        );

    return Number.isFinite(
        amount,
    )
        ? amount
        : 0;
}

function formatMoneyValue(
    value: string,
): string {
    return moneyInputFormatter.format(
        parseMoneyValue(
            value,
        ),
    );
}

/**
 * Formats while the cashier is typing.
 *
 * Examples:
 *
 * 100
 * -> 100
 *
 * 1000
 * -> 1,000
 *
 * 10000
 * -> 10,000
 *
 * 1250.5
 * -> 1,250.5
 */
function formatMoneyWhileTyping(
    value: string,
): string {
    /*
     * Remove existing commas and anything
     * except digits and decimal points.
     */
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

    let decimalPart =
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
                    2,
                );

    /*
     * Prevent values such as:
     *
     * 010000
     *
     * becoming visible.
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

const dueModalStyles = `
    #sapo-due-modal,
    #sapo-due-modal *,
    #sapo-due-modal *::before,
    #sapo-due-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-due-modal {
        --dpm-green-800: #166534;
        --dpm-green-700: #15803d;
        --dpm-green-100: #dcfce7;
        --dpm-green-50: #f0fdf4;

        --dpm-red: #dc2626;
        --dpm-red-light: #fef2f2;

        --dpm-text: #111827;
        --dpm-text-secondary: #1f2937;
        --dpm-muted: #6b7280;

        --dpm-border: #e5e7eb;
        --dpm-border-strong: #d1d5db;

        --dpm-bg: #f9fafb;
        --dpm-white: #ffffff;

        --dpm-font:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Helvetica,
            Arial,
            sans-serif;

        position: fixed !important;

        inset: 0 !important;

        z-index: 2147483000 !important;

        display: flex !important;

        width: 100vw !important;

        height: 100vh !important;
        height: 100dvh !important;

        align-items: center !important;
        justify-content: center !important;

        padding:
            24px !important;

        margin: 0 !important;

        color:
            var(--dpm-text-secondary) !important;

        font-family:
            var(--dpm-font) !important;

        font-size:
            14px !important;

        line-height:
            1.5 !important;

        background:
            rgba(
                15,
                23,
                42,
                0.5
            ) !important;
    }

    #sapo-due-modal h2,
    #sapo-due-modal p,
    #sapo-due-modal span,
    #sapo-due-modal strong,
    #sapo-due-modal label,
    #sapo-due-modal button,
    #sapo-due-modal input,
    #sapo-due-modal select,
    #sapo-due-modal textarea {
        font-family:
            var(--dpm-font) !important;

        letter-spacing:
            normal !important;

        text-transform:
            none !important;
    }

    #sapo-due-modal h2,
    #sapo-due-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* =====================================================
       MODAL
       ===================================================== */

    #sapo-due-modal
    .dpm-modal {
        display: flex !important;

        width: 100% !important;
        max-width: 460px !important;

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
            var(--dpm-white) !important;

        border-radius:
            12px !important;

        box-shadow:
            0 20px 40px
            rgba(
                15,
                23,
                42,
                0.2
            ) !important;

        overflow:
            hidden !important;
    }

    /* =====================================================
       HEADER
       ===================================================== */

    #sapo-due-modal
    .dpm-header {
        display: flex !important;

        flex-shrink:
            0 !important;

        align-items:
            flex-start !important;

        justify-content:
            space-between !important;

        gap: 12px !important;

        padding:
            20px
            24px !important;

        background:
            var(--dpm-white) !important;

        border-bottom:
            1px solid
            var(--dpm-border) !important;
    }

    #sapo-due-modal
    .dpm-kicker {
        display: inline-block !important;

        margin-bottom:
            4px !important;

        color:
            var(--dpm-green-700) !important;

        font-size:
            12px !important;

        font-weight:
            600 !important;

        letter-spacing:
            0.04em !important;

        text-transform:
            uppercase !important;
    }

    #sapo-due-modal
    .dpm-header h2 {
        color:
            var(--dpm-text) !important;

        font-size:
            18px !important;

        font-weight:
            700 !important;
    }

    #sapo-due-modal
    .dpm-close-button {
        display: flex !important;

        width:
            32px !important;

        height:
            32px !important;

        flex-shrink:
            0 !important;

        align-items:
            center !important;

        justify-content:
            center !important;

        padding:
            0 !important;

        color:
            var(--dpm-muted) !important;

        font-size:
            20px !important;

        line-height:
            1 !important;

        background:
            var(--dpm-bg) !important;

        border:
            1px solid
            var(--dpm-border) !important;

        border-radius:
            8px !important;

        cursor:
            pointer !important;
    }

    #sapo-due-modal
    .dpm-close-button:hover:not(:disabled) {
        color:
            var(--dpm-text) !important;

        background:
            #f1f5f9 !important;
    }

    #sapo-due-modal
    .dpm-close-button:disabled {
        opacity:
            0.5 !important;

        cursor:
            not-allowed !important;
    }

    /* =====================================================
       FORM
       ===================================================== */

    #sapo-due-modal
    .dpm-form {
        display: flex !important;

        min-height:
            0 !important;

        flex-direction:
            column !important;

        gap: 16px !important;

        padding:
            24px !important;

        overflow-x:
            hidden !important;

        overflow-y:
            auto !important;

        background:
            var(--dpm-white) !important;

        scrollbar-width:
            thin !important;

        scrollbar-color:
            var(--dpm-border-strong)
            transparent !important;
    }

    #sapo-due-modal
    .dpm-form::-webkit-scrollbar {
        width:
            8px !important;
    }

    #sapo-due-modal
    .dpm-form::-webkit-scrollbar-track {
        background:
            transparent !important;
    }

    #sapo-due-modal
    .dpm-form::-webkit-scrollbar-thumb {
        background:
            var(--dpm-border-strong) !important;

        border-radius:
            8px !important;
    }

    /* =====================================================
       ALERT
       ===================================================== */

    #sapo-due-modal
    .dpm-alert {
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
            var(--dpm-red-light) !important;

        border:
            1px solid
            #fecaca !important;

        border-radius:
            8px !important;
    }

    /* =====================================================
       CUSTOMER SUMMARY
       ===================================================== */

    #sapo-due-modal
    .dpm-customer-summary {
        display: flex !important;

        flex-direction:
            column !important;

        gap: 4px !important;

        padding:
            14px
            16px !important;

        background:
            var(--dpm-bg) !important;

        border:
            1px solid
            var(--dpm-border) !important;

        border-radius:
            8px !important;
    }

    #sapo-due-modal
    .dpm-customer-summary
    > strong {
        color:
            var(--dpm-text) !important;

        font-size:
            14px !important;

        font-weight:
            600 !important;
    }

    #sapo-due-modal
    .dpm-customer-summary
    > span {
        color:
            var(--dpm-muted) !important;

        font-size:
            12.5px !important;
    }

    #sapo-due-modal
    .dpm-customer-summary
    div {
        margin-top:
            6px !important;

        padding-top:
            10px !important;

        color:
            var(--dpm-muted) !important;

        font-size:
            13px !important;

        border-top:
            1px dashed
            var(--dpm-border-strong) !important;
    }

    #sapo-due-modal
    .dpm-customer-summary
    div strong {
        color:
            var(--dpm-red) !important;

        font-size:
            15px !important;
    }

    /* =====================================================
       FIELDS
       ===================================================== */

    #sapo-due-modal
    .dpm-field {
        display: flex !important;

        flex-direction:
            column !important;

        gap: 6px !important;
    }

    #sapo-due-modal
    .dpm-field span {
        color:
            var(--dpm-text-secondary) !important;

        font-size:
            12.5px !important;

        font-weight:
            600 !important;
    }

    #sapo-due-modal
    .dpm-field input,
    #sapo-due-modal
    .dpm-field select,
    #sapo-due-modal
    .dpm-field textarea {
        width:
            100% !important;

        padding:
            9px
            12px !important;

        color:
            var(--dpm-text-secondary) !important;

        font-size:
            13.5px !important;

        background:
            var(--dpm-white) !important;

        border:
            1px solid
            var(--dpm-border-strong) !important;

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

    /*
     * Money input is text instead of number
     * because a number input cannot display
     * comma separators such as 10,000.00.
     */
    #sapo-due-modal
    .dpm-money-input {
        font-size:
            18px !important;

        font-weight:
            700 !important;

        font-variant-numeric:
            tabular-nums !important;

        text-align:
            right !important;
    }

    #sapo-due-modal
    .dpm-field textarea {
        min-height:
            60px !important;

        resize:
            vertical !important;
    }

    #sapo-due-modal
    .dpm-field select {
        cursor:
            pointer !important;
    }

    #sapo-due-modal
    .dpm-field input:focus,
    #sapo-due-modal
    .dpm-field select:focus,
    #sapo-due-modal
    .dpm-field textarea:focus {
        border-color:
            var(--dpm-green-700) !important;

        box-shadow:
            0 0 0 3px
            rgba(
                22,
                163,
                74,
                0.12
            ) !important;
    }

    #sapo-due-modal
    .dpm-field input:disabled,
    #sapo-due-modal
    .dpm-field select:disabled,
    #sapo-due-modal
    .dpm-field textarea:disabled {
        color:
            var(--dpm-muted) !important;

        background:
            var(--dpm-bg) !important;

        cursor:
            not-allowed !important;
    }

    /* =====================================================
       KEYBOARD HELP
       ===================================================== */

    #sapo-due-modal
    .dpm-keyboard-help {
        display: flex !important;

        align-items:
            center !important;

        flex-wrap:
            wrap !important;

        gap:
            6px !important;

        padding:
            9px
            11px !important;

        color:
            var(--dpm-muted) !important;

        font-size:
            11px !important;

        background:
            var(--dpm-green-50) !important;

        border:
            1px solid
            var(--dpm-green-100) !important;

        border-radius:
            7px !important;
    }

    #sapo-due-modal
    .dpm-key {
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
            var(--dpm-text-secondary) !important;

        font-size:
            10px !important;

        font-weight:
            700 !important;

        background:
            var(--dpm-white) !important;

        border:
            1px solid
            var(--dpm-border-strong) !important;

        border-radius:
            4px !important;
    }

    /* =====================================================
       ACTIONS
       ===================================================== */

    #sapo-due-modal
    .dpm-actions {
        display: flex !important;

        flex-shrink:
            0 !important;

        align-items:
            center !important;

        justify-content:
            flex-end !important;

        gap: 10px !important;

        margin:
            8px
            -24px
            -24px !important;

        padding:
            16px
            24px !important;

        background:
            var(--dpm-bg) !important;

        border-top:
            1px solid
            var(--dpm-border) !important;
    }

    #sapo-due-modal
    .dpm-secondary-button,
    #sapo-due-modal
    .dpm-primary-button {
        min-height:
            40px !important;

        padding:
            9px
            18px !important;

        font-size:
            13.5px !important;

        font-weight:
            600 !important;

        border-radius:
            8px !important;

        cursor:
            pointer !important;
    }

    #sapo-due-modal
    .dpm-secondary-button {
        color:
            #374151 !important;

        background:
            var(--dpm-white) !important;

        border:
            1px solid
            var(--dpm-border-strong) !important;
    }

    #sapo-due-modal
    .dpm-secondary-button:hover:not(:disabled) {
        background:
            #f1f5f9 !important;

        border-color:
            #9ca3af !important;
    }

    #sapo-due-modal
    .dpm-primary-button {
        color:
            #ffffff !important;

        background:
            var(--dpm-green-700) !important;

        border:
            1px solid
            var(--dpm-green-700) !important;
    }

    #sapo-due-modal
    .dpm-primary-button:hover:not(:disabled),
    #sapo-due-modal
    .dpm-primary-button:focus-visible {
        background:
            var(--dpm-green-800) !important;

        outline:
            none !important;

        box-shadow:
            0 0 0 3px
            rgba(
                21,
                128,
                61,
                0.18
            ) !important;
    }

    #sapo-due-modal
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
        max-width: 520px
    ) {
        #sapo-due-modal {
            padding:
                12px !important;
        }

        #sapo-due-modal
        .dpm-modal {
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

        #sapo-due-modal
        .dpm-header,
        #sapo-due-modal
        .dpm-form {
            padding-left:
                16px !important;

            padding-right:
                16px !important;
        }

        #sapo-due-modal
        .dpm-actions {
            margin-left:
                -16px !important;

            margin-right:
                -16px !important;

            flex-direction:
                column-reverse !important;

            align-items:
                stretch !important;

            padding-left:
                16px !important;

            padding-right:
                16px !important;
        }

        #sapo-due-modal
        .dpm-secondary-button,
        #sapo-due-modal
        .dpm-primary-button {
            width:
                100% !important;
        }
    }
`;

export default function RecordDuePaymentModal({
    sale,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: RecordDuePaymentModalProps) {
    const [
        amount,
        setAmount,
    ] =
        useState(
            '0.00',
        );

    const [
        paymentMethod,
        setPaymentMethod,
    ] =
        useState<PosPaymentMethod>(
            'cash',
        );

    const [
        referenceNumber,
        setReferenceNumber,
    ] =
        useState(
            '',
        );

    const [
        notes,
        setNotes,
    ] =
        useState(
            '',
        );

    const [
        localError,
        setLocalError,
    ] =
        useState(
            '',
        );

    const formRef =
        useRef<HTMLFormElement | null>(
            null,
        );

    const amountInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const submitButtonRef =
        useRef<HTMLButtonElement | null>(
            null,
        );

    /* =====================================================
       RESET WHEN SALE OPENS
       ===================================================== */

    useEffect(
        () => {
            if (!sale) {
                return;
            }

            /*
             * Requirement:
             *
             * Payment field starts at zero,
             * rather than automatically filling
             * the full outstanding amount.
             */
            setAmount(
                '0.00',
            );

            setPaymentMethod(
                'cash',
            );

            setReferenceNumber(
                '',
            );

            setNotes(
                '',
            );

            setLocalError(
                '',
            );

            const timeout =
                window.setTimeout(
                    () => {
                        amountInputRef
                            .current
                            ?.focus();

                        amountInputRef
                            .current
                            ?.select();
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
            sale,
        ],
    );

    /* =====================================================
       ESCAPE KEY
       ===================================================== */

    useEffect(
        () => {
            if (!sale) {
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
            sale,
            isSubmitting,
            onClose,
        ],
    );

    if (!sale) {
        return null;
    }

    /* =====================================================
       SUBMIT
       ===================================================== */

    const handleSubmit =
        (
            event:
                FormEvent<HTMLFormElement>,
        ): void => {
            event.preventDefault();

            const paymentAmount =
                parseMoneyValue(
                    amount,
                );

            if (
                !Number.isFinite(
                    paymentAmount,
                )
                || paymentAmount
                <= 0
                || paymentAmount
                > sale.due_amount
            ) {
                setLocalError(
                    `Enter an amount between 0.01 and ${moneyInputFormatter.format(
                        sale.due_amount,
                    )}.`,
                );

                amountInputRef
                    .current
                    ?.focus();

                amountInputRef
                    .current
                    ?.select();

                return;
            }

            /*
             * Always send a clean number to
             * the backend.
             *
             * Example:
             *
             * UI       = 10,000.00
             * Backend  = 10000
             */
            onSubmit({
                amount:
                    paymentAmount,

                payment_method:
                    paymentMethod,

                reference_number:
                    referenceNumber
                        .trim(),

                notes:
                    notes
                        .trim(),
            });
        };

    /* =====================================================
       ENTER NAVIGATION
       ===================================================== */

    const focusNextField =
        (
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

    const handleEnterNavigation =
        (
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
             * Shift + Enter is still available
             * for a new line inside Notes.
             */
            if (
                event.currentTarget
                instanceof HTMLTextAreaElement
                && event.shiftKey
            ) {
                return;
            }

            event
                .preventDefault();

            event
                .stopPropagation();

            /*
             * Before leaving the payment field,
             * ensure it displays two decimals.
             */
            if (
                event.currentTarget
                === amountInputRef.current
            ) {
                setAmount(
                    formatMoneyValue(
                        amount,
                    ),
                );
            }

            focusNextField(
                event.currentTarget,
            );
        };

    return (
        <div
            id="sapo-due-modal"
            role="presentation"
            onMouseDown={(
                event,
            ) => {
                if (
                    !isSubmitting
                    && event.target
                    === event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <style>
                {dueModalStyles}
            </style>

            <section
                className="dpm-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="due-payment-title"
                onMouseDown={(
                    event,
                ) => {
                    event
                        .stopPropagation();
                }}
            >
                {/* HEADER */}

                <header className="dpm-header">
                    <div>
                        <span className="dpm-kicker">
                            Due collection
                        </span>

                        <h2 id="due-payment-title">
                            {
                                sale
                                    .sale_number
                            }
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="dpm-close-button"
                        disabled={
                            isSubmitting
                        }
                        onClick={
                            onClose
                        }
                        aria-label="Close"
                    >
                        ×
                    </button>
                </header>

                {/* FORM */}

                <form
                    ref={
                        formRef
                    }
                    className="dpm-form"
                    onSubmit={
                        handleSubmit
                    }
                >
                    {(localError
                        || errorMessage) && (
                            <div
                                className="dpm-alert"
                                role="alert"
                            >
                                {localError
                                    || errorMessage}
                            </div>
                        )}

                    {/* CUSTOMER */}

                    <section className="dpm-customer-summary">
                        <strong>
                            {
                                sale
                                    .customer
                                    .name
                            }
                        </strong>

                        <span>
                            {sale
                                .customer
                                .mobile
                                || sale
                                    .customer
                                    .customer_code}
                        </span>

                        <div>
                            Outstanding Due:
                            {' '}

                            <strong>
                                LKR
                                {' '}

                                {moneyInputFormatter.format(
                                    sale
                                        .due_amount,
                                )}
                            </strong>
                        </div>
                    </section>

                    {/* PAYMENT AMOUNT */}

                    <label className="dpm-field">
                        <span>
                            Payment Amount *
                        </span>

                        <input
                            ref={
                                amountInputRef
                            }
                            name="payment_amount"
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            className="dpm-money-input"
                            value={
                                amount
                            }
                            disabled={
                                isSubmitting
                            }
                            data-enter-nav="true"
                            onFocus={(
                                event,
                            ) => {
                                event
                                    .currentTarget
                                    .select();
                            }}
                            onKeyDown={
                                handleEnterNavigation
                            }
                            onBlur={() => {
                                setAmount(
                                    formatMoneyValue(
                                        amount,
                                    ),
                                );
                            }}
                            onChange={(
                                event,
                            ) => {
                                setAmount(
                                    formatMoneyWhileTyping(
                                        event
                                            .target
                                            .value,
                                    ),
                                );

                                setLocalError(
                                    '',
                                );
                            }}
                        />
                    </label>

                    {/* PAYMENT METHOD */}

                    <label className="dpm-field">
                        <span>
                            Payment Method *
                        </span>

                        <select
                            value={
                                paymentMethod
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
                                setPaymentMethod(
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

                    {/* REFERENCE */}

                    <label className="dpm-field">
                        <span>
                            Reference Number
                        </span>

                        <input
                            type="text"
                            value={
                                referenceNumber
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
                                setReferenceNumber(
                                    event
                                        .target
                                        .value,
                                );
                            }}
                        />
                    </label>

                    {/* NOTES */}

                    <label className="dpm-field">
                        <span>
                            Notes
                        </span>

                        <textarea
                            rows={
                                2
                            }
                            value={
                                notes
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
                                setNotes(
                                    event
                                        .target
                                        .value,
                                );
                            }}
                        />
                    </label>

                    {/* KEYBOARD HELP */}

                    <div className="dpm-keyboard-help">
                        <span className="dpm-key">
                            Enter
                        </span>

                        <span>
                            Next field
                        </span>

                        <span>
                            ·
                        </span>

                        <span className="dpm-key">
                            ↑ / ↓
                        </span>

                        <span>
                            Payment method
                        </span>

                        <span>
                            ·
                        </span>

                        <span className="dpm-key">
                            Shift + Enter
                        </span>

                        <span>
                            New line in Notes
                        </span>
                    </div>

                    {/* ACTIONS */}

                    <footer className="dpm-actions">
                        <button
                            type="button"
                            className="dpm-secondary-button"
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
                            className="dpm-primary-button"
                            disabled={
                                isSubmitting
                            }
                        >
                            {isSubmitting
                                ? 'Recording...'
                                : 'Record Payment'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}