import {
    useEffect,
    useState,
} from 'react';

import type {
    FormEvent,
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
        --dpm-red: #dc2626;
        --dpm-red-light: #fef2f2;
        --dpm-text: #111827;
        --dpm-text-secondary: #1f2937;
        --dpm-muted: #6b7280;
        --dpm-border: #e5e7eb;
        --dpm-border-strong: #d1d5db;
        --dpm-bg: #f9fafb;
        --dpm-white: #ffffff;
        --dpm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        inset: 0 !important;
        z-index: 1000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        margin: 0 !important;
        background: rgba(15, 23, 42, 0.5) !important;
        font-family: var(--dpm-font) !important;
        color: var(--dpm-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
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
        font-family: var(--dpm-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-due-modal h2,
    #sapo-due-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Modal shell ---------- */
    #sapo-due-modal .dpm-modal {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 460px !important;
        max-height: calc(100vh - 48px) !important;
        max-height: calc(100dvh - 48px) !important;
        background: var(--dpm-white) !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2) !important;
        overflow: hidden !important;
    }

    /* ---------- Header ---------- */
    #sapo-due-modal .dpm-header {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 20px 24px !important;
        background: var(--dpm-white) !important;
        border-bottom: 1px solid var(--dpm-border) !important;
    }

    #sapo-due-modal .dpm-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--dpm-green-700) !important;
        margin-bottom: 4px !important;
        background: transparent !important;
    }

    #sapo-due-modal .dpm-header h2 {
        font-size: 18px !important;
        font-weight: 700 !important;
        color: var(--dpm-text) !important;
    }

    #sapo-due-modal .dpm-close-button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 32px !important;
        height: 32px !important;
        flex-shrink: 0 !important;
        font-size: 20px !important;
        line-height: 1 !important;
        color: var(--dpm-muted) !important;
        background: var(--dpm-bg) !important;
        border: 1px solid var(--dpm-border) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-due-modal .dpm-close-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        color: var(--dpm-text) !important;
    }

    #sapo-due-modal .dpm-close-button:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Scrollable form body ---------- */
    #sapo-due-modal .dpm-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        min-height: 0 !important;
        padding: 24px !important;
        overflow-y: auto !important;
        background: var(--dpm-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--dpm-border-strong) transparent !important;
    }

    #sapo-due-modal .dpm-form::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-due-modal .dpm-form::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-due-modal .dpm-form::-webkit-scrollbar-thumb {
        background: var(--dpm-border-strong) !important;
        border-radius: 8px !important;
    }

    /* ---------- Alert ---------- */
    #sapo-due-modal .dpm-alert {
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        background: var(--dpm-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Customer summary ---------- */
    #sapo-due-modal .dpm-customer-summary {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        padding: 14px 16px !important;
        background: var(--dpm-bg) !important;
        border: 1px solid var(--dpm-border) !important;
        border-radius: 8px !important;
    }

    #sapo-due-modal .dpm-customer-summary strong {
        font-size: 14px !important;
        font-weight: 600 !important;
        color: var(--dpm-text) !important;
        background: transparent !important;
    }

    #sapo-due-modal .dpm-customer-summary span {
        font-size: 12.5px !important;
        color: var(--dpm-muted) !important;
        background: transparent !important;
    }

    #sapo-due-modal .dpm-customer-summary div {
        margin-top: 6px !important;
        padding-top: 10px !important;
        border-top: 1px dashed var(--dpm-border-strong) !important;
        font-size: 13px !important;
        color: var(--dpm-muted) !important;
    }

    #sapo-due-modal .dpm-customer-summary div strong {
        font-size: 15px !important;
        color: var(--dpm-red) !important;
    }

    /* ---------- Fields ---------- */
    #sapo-due-modal .dpm-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
    }

    #sapo-due-modal .dpm-field span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--dpm-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-due-modal .dpm-field input,
    #sapo-due-modal .dpm-field select,
    #sapo-due-modal .dpm-field textarea {
        width: 100% !important;
        padding: 9px 12px !important;
        font-size: 13.5px !important;
        color: var(--dpm-text-secondary) !important;
        background: var(--dpm-white) !important;
        border: 1px solid var(--dpm-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-due-modal .dpm-field textarea {
        resize: vertical !important;
        min-height: 60px !important;
        font-family: var(--dpm-font) !important;
    }

    #sapo-due-modal .dpm-field select {
        cursor: pointer !important;
    }

    #sapo-due-modal .dpm-field input:focus,
    #sapo-due-modal .dpm-field select:focus,
    #sapo-due-modal .dpm-field textarea:focus {
        border-color: var(--dpm-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-due-modal .dpm-field input:disabled,
    #sapo-due-modal .dpm-field select:disabled,
    #sapo-due-modal .dpm-field textarea:disabled {
        background: var(--dpm-bg) !important;
        color: var(--dpm-muted) !important;
        cursor: not-allowed !important;
    }

    /* ---------- Footer actions ---------- */
    #sapo-due-modal .dpm-actions {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        padding: 16px 24px !important;
        background: var(--dpm-bg) !important;
        border-top: 1px solid var(--dpm-border) !important;
    }

    #sapo-due-modal .dpm-secondary-button {
        padding: 9px 18px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--dpm-white) !important;
        border: 1px solid var(--dpm-border-strong) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-due-modal .dpm-secondary-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        border-color: #9ca3af !important;
    }

    #sapo-due-modal .dpm-primary-button {
        padding: 9px 18px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        background: var(--dpm-green-700) !important;
        border: 1px solid var(--dpm-green-700) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease !important;
    }

    #sapo-due-modal .dpm-primary-button:hover:not(:disabled) {
        background: var(--dpm-green-800) !important;
    }

    #sapo-due-modal button:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 520px) {
        #sapo-due-modal {
            padding: 12px !important;
        }

        #sapo-due-modal .dpm-modal {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
        }

        #sapo-due-modal .dpm-header,
        #sapo-due-modal .dpm-form,
        #sapo-due-modal .dpm-actions {
            padding-left: 16px !important;
            padding-right: 16px !important;
        }

        #sapo-due-modal .dpm-actions {
            flex-direction: column-reverse !important;
            align-items: stretch !important;
        }

        #sapo-due-modal .dpm-secondary-button,
        #sapo-due-modal .dpm-primary-button {
            width: 100% !important;
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
    ] = useState('');

    const [
        paymentMethod,
        setPaymentMethod,
    ] = useState<PosPaymentMethod>('cash');

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

    useEffect(() => {
        if (!sale) {
            return;
        }

        setAmount(
            sale.due_amount.toFixed(2),
        );

        setPaymentMethod('cash');
        setReferenceNumber('');
        setNotes('');
        setLocalError('');
    }, [sale]);

    if (!sale) {
        return null;
    }

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        const paymentAmount =
            Number(amount);

        if (
            paymentAmount <= 0
            || paymentAmount
            > sale.due_amount
        ) {
            setLocalError(
                `Enter an amount between 0.01 and ${sale.due_amount.toFixed(2)}.`,
            );

            return;
        }

        onSubmit({
            amount:
                paymentAmount,

            payment_method:
                paymentMethod,

            reference_number:
                referenceNumber,

            notes,
        });
    };

    return (
        <div id="sapo-due-modal">
            <style>
                {dueModalStyles}
            </style>

            <section className="dpm-modal">
                <header className="dpm-header">
                    <div>
                        <span className="dpm-kicker">
                            Due collection
                        </span>

                        <h2>
                            {sale.sale_number}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="dpm-close-button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </header>

                <form
                    className="dpm-form"
                    onSubmit={handleSubmit}
                >
                    {(localError
                        || errorMessage) && (
                            <div className="dpm-alert">
                                {localError
                                    || errorMessage}
                            </div>
                        )}

                    <section className="dpm-customer-summary">
                        <strong>
                            {sale.customer.name}
                        </strong>

                        <span>
                            {sale.customer.mobile
                                || sale.customer
                                    .customer_code}
                        </span>

                        <div>
                            Outstanding Due:{' '}

                            <strong>
                                LKR{' '}
                                {sale
                                    .due_amount
                                    .toFixed(2)}
                            </strong>
                        </div>
                    </section>

                    <label className="dpm-field">
                        <span>
                            Payment Amount *
                        </span>

                        <input
                            type="number"
                            min="0.01"
                            max={sale.due_amount}
                            step="0.01"
                            value={amount}
                            disabled={isSubmitting}
                            onChange={(event) => {
                                setAmount(
                                    event.target.value,
                                );

                                setLocalError('');
                            }}
                        />
                    </label>

                    <label className="dpm-field">
                        <span>
                            Payment Method *
                        </span>

                        <select
                            value={paymentMethod}
                            disabled={isSubmitting}
                            onChange={(event) => {
                                setPaymentMethod(
                                    parsePaymentMethod(
                                        event
                                            .target
                                            .value,
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

                    <label className="dpm-field">
                        <span>
                            Reference Number
                        </span>

                        <input
                            value={referenceNumber}
                            disabled={isSubmitting}
                            onChange={(event) => {
                                setReferenceNumber(
                                    event.target.value,
                                );
                            }}
                        />
                    </label>

                    <label className="dpm-field">
                        <span>Notes</span>

                        <textarea
                            rows={2}
                            value={notes}
                            disabled={isSubmitting}
                            onChange={(event) => {
                                setNotes(
                                    event.target.value,
                                );
                            }}
                        />
                    </label>

                    <footer className="dpm-actions">
                        <button
                            type="button"
                            className="dpm-secondary-button"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="dpm-primary-button"
                            disabled={isSubmitting}
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