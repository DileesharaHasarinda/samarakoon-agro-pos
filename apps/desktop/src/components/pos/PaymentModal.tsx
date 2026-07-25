import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import type {
    CompleteSaleValues,
    PosPaymentMethod,
} from '../../types/sale';

interface PaymentModalProps {
    isOpen: boolean;
    grandTotal: number;
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
        },
    );

export default function PaymentModal({
    isOpen,
    grandTotal,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: PaymentModalProps) {
    const [
        paymentMethod,
        setPaymentMethod,
    ] = useState<PosPaymentMethod>(
        'cash',
    );

    const [
        amountReceived,
        setAmountReceived,
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

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setPaymentMethod('cash');

        setAmountReceived(
            grandTotal.toFixed(2),
        );

        setReferenceNumber('');
        setNotes('');
        setLocalError('');
    }, [
        isOpen,
        grandTotal,
    ]);

    useEffect(() => {
        if (!isOpen) {
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
        isOpen,
        isSubmitting,
        onClose,
    ]);

    const receivedAmount =
        Number(amountReceived || 0);

    const changeAmount =
        useMemo(
            () =>
                paymentMethod === 'cash'
                    ? Math.max(
                        0,
                        receivedAmount
                        - grandTotal,
                    )
                    : 0,
            [
                paymentMethod,
                receivedAmount,
                grandTotal,
            ],
        );

    if (!isOpen) {
        return null;
    }

    const handlePaymentMethodChange = (
        method: PosPaymentMethod,
    ): void => {
        setPaymentMethod(method);
        setLocalError('');

        setAmountReceived(
            grandTotal.toFixed(2),
        );
    };

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (
            !Number.isFinite(
                receivedAmount,
            )
            || receivedAmount < 0
        ) {
            setLocalError(
                'Enter a valid received amount.',
            );

            return;
        }

        if (
            paymentMethod === 'cash'
            && receivedAmount
            < grandTotal
        ) {
            setLocalError(
                'The received cash amount is less than the sale total.',
            );

            return;
        }

        if (
            paymentMethod !== 'cash'
            && Math.abs(
                receivedAmount
                - grandTotal,
            ) > 0.01
        ) {
            setLocalError(
                'Card and bank-transfer payments must equal the sale total.',
            );

            return;
        }

        onSubmit({
            discount: 0,
            payment_method:
                paymentMethod,

            amount_received:
                receivedAmount,

            reference_number:
                referenceNumber,

            notes,
        });
    };

    return (
        <div
            className="modal-backdrop"
            role="presentation"
        >
            <section
                className="pos-payment-modal"
                role="dialog"
                aria-modal="true"
            >
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Complete sale
                        </span>

                        <h2>Payment</h2>
                    </div>

                    <button
                        type="button"
                        className="modal-close-button"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="pos-payment-form"
                    onSubmit={handleSubmit}
                >
                    {(localError
                        || errorMessage) && (
                            <div
                                className="form-alert"
                                role="alert"
                            >
                                {localError
                                    || errorMessage}
                            </div>
                        )}

                    <div className="pos-payment-total">
                        <span>
                            Amount to Pay
                        </span>

                        <strong>
                            {currencyFormatter
                                .format(
                                    grandTotal,
                                )}
                        </strong>
                    </div>

                    <div className="pos-payment-methods">
                        <button
                            type="button"
                            className={
                                paymentMethod
                                    === 'cash'
                                    ? 'selected'
                                    : ''
                            }
                            onClick={() => {
                                handlePaymentMethodChange(
                                    'cash',
                                );
                            }}
                        >
                            Cash
                        </button>

                        <button
                            type="button"
                            className={
                                paymentMethod
                                    === 'card'
                                    ? 'selected'
                                    : ''
                            }
                            onClick={() => {
                                handlePaymentMethodChange(
                                    'card',
                                );
                            }}
                        >
                            Card
                        </button>

                        <button
                            type="button"
                            className={
                                paymentMethod
                                    === 'bank_transfer'
                                    ? 'selected'
                                    : ''
                            }
                            onClick={() => {
                                handlePaymentMethodChange(
                                    'bank_transfer',
                                );
                            }}
                        >
                            Bank Transfer
                        </button>
                    </div>

                    <label>
                        <span>
                            {paymentMethod === 'cash'
                                ? 'Cash Received'
                                : 'Payment Amount'}
                        </span>

                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={amountReceived}
                            readOnly={
                                paymentMethod
                                !== 'cash'
                            }
                            onChange={(event) => {
                                setAmountReceived(
                                    event.target.value,
                                );

                                setLocalError('');
                            }}
                        />
                    </label>

                    {paymentMethod !== 'cash' && (
                        <label>
                            <span>
                                Reference Number
                            </span>

                            <input
                                type="text"
                                value={referenceNumber}
                                maxLength={150}
                                placeholder="Optional transaction reference"
                                onChange={(event) => {
                                    setReferenceNumber(
                                        event.target.value,
                                    );
                                }}
                            />
                        </label>
                    )}

                    <label>
                        <span>Sale Notes</span>

                        <textarea
                            rows={3}
                            value={notes}
                            maxLength={1000}
                            placeholder="Optional"
                            onChange={(event) => {
                                setNotes(
                                    event.target.value,
                                );
                            }}
                        />
                    </label>

                    <div className="pos-change-panel">
                        <span>
                            Change to Customer
                        </span>

                        <strong>
                            {currencyFormatter
                                .format(
                                    changeAmount,
                                )}
                        </strong>
                    </div>

                    <footer className="modal-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Completing Sale...'
                                : 'Complete Sale'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}