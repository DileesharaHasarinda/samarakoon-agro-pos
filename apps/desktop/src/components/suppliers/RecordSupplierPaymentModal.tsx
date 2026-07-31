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
    SupplierPayable,
    SupplierPaymentInput,
    SupplierPaymentMethod,
} from '../../types/supplierPayable';

interface RecordSupplierPaymentModalProps {
    purchase: SupplierPayable | null;
    isSubmitting: boolean;
    errorMessage: string;
    onClose: () => void;

    onSubmit: (
        values:
            SupplierPaymentInput,
    ) => void;
}

const money = new Intl.NumberFormat(
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
    | 'cash'
    | 'close'
    | 'info'
    | 'receipt'
    | 'save';

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

        default:
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
    }
}

function parsePaymentMethod(
    value: string,
): SupplierPaymentMethod {
    if (value === 'card') {
        return 'card';
    }

    if (value === 'bank_transfer') {
        return 'bank_transfer';
    }

    if (value === 'cheque') {
        return 'cheque';
    }

    return 'cash';
}

export default function RecordSupplierPaymentModal({
    purchase,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: RecordSupplierPaymentModalProps) {
    const [
        amountInput,
        setAmountInput,
    ] = useState('');

    const [
        paymentMethod,
        setPaymentMethod,
    ] = useState<SupplierPaymentMethod>(
        'cash',
    );

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

    const amountRef =
        useRef<HTMLInputElement | null>(
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
        if (!purchase) {
            return;
        }

        setAmountInput(
            String(
                purchase.due_amount,
            ),
        );

        setPaymentMethod('cash');
        setReferenceNumber('');
        setNotes('');
        setLocalError('');
    }, [purchase]);

    useEffect(() => {
        if (!purchase) {
            return;
        }

        const oldOverflow =
            document.body.style.overflow;

        const oldFocus =
            document.activeElement
                instanceof HTMLElement
                ? document.activeElement
                : null;

        document.body.style.overflow =
            'hidden';

        const timer =
            window.setTimeout(
                () => {
                    amountRef.current
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
            window.clearTimeout(timer);

            document.body.style.overflow =
                oldOverflow;

            window.removeEventListener(
                'keydown',
                handleKeyDown,
            );

            oldFocus?.focus();
        };
    }, [purchase]);

    const amount =
        Number(
            amountInput || 0,
        );

    const remaining =
        useMemo(
            () => {
                if (!purchase) {
                    return 0;
                }

                return Math.max(
                    0,
                    Number(
                        purchase.due_amount,
                    )
                    - (
                        Number.isFinite(
                            amount,
                        )
                            ? amount
                            : 0
                    ),
                );
            },
            [
                purchase,
                amount,
            ],
        );

    if (
        !purchase
        || typeof document === 'undefined'
    ) {
        return null;
    }

    const handleSubmit = (
        event:
            FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (
            !Number.isFinite(amount)
            || amount <= 0
            || amount
            > Number(
                purchase.due_amount,
            )
        ) {
            setLocalError(
                `Enter an amount between ${money.format(0.01)} and ${money.format(Number(purchase.due_amount))}.`,
            );

            return;
        }

        setLocalError('');

        onSubmit({
            amount,

            payment_method:
                paymentMethod,

            reference_number:
                referenceNumber.trim(),

            notes:
                notes.trim(),
        });
    };

    return createPortal(
        <div id="supplier-payment-modal">
            <div
                className="apm-backdrop"
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
                    className="apm-dialog payment"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="payment-title"
                    aria-describedby="payment-description"
                >
                    <header className="apm-header">
                        <div className="apm-head-main">
                            <span className="apm-head-icon">
                                <Icon name="cash" />
                            </span>

                            <div className="apm-head-copy">
                                <span className="apm-kicker">
                                    Record Supplier Payment
                                </span>

                                <h2
                                    id="payment-title"
                                    className="apm-title"
                                >
                                    {
                                        purchase
                                            .purchase_number
                                    }
                                </h2>

                                <p className="apm-subtitle">
                                    {
                                        purchase
                                            .supplier
                                            .name
                                    }
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="apm-close"
                            aria-label="Close supplier payment form"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            <Icon name="close" />
                        </button>
                    </header>

                    <form
                        className="apm-form"
                        noValidate
                        onSubmit={handleSubmit}
                    >
                        <div className="apm-body">
                            <p
                                id="payment-description"
                                className="apm-help"
                            >
                                <Icon name="info" />

                                Record the amount paid to
                                the supplier. The balance
                                updates after saving.
                            </p>

                            {(localError
                                || errorMessage) && (
                                    <div
                                        className="apm-alert"
                                        role="alert"
                                    >
                                        <Icon name="alert" />

                                        {localError
                                            || errorMessage}
                                    </div>
                                )}

                            <div className="apm-total warning">
                                <div>
                                    <span>
                                        Outstanding Supplier Due
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

                                <Icon name="cash" />
                            </div>

                            <section className="apm-section">
                                <div>
                                    <h3>
                                        Payment Information
                                    </h3>

                                    <p>
                                        Enter the amount and
                                        payment method used.
                                    </p>
                                </div>

                                <div className="apm-grid">
                                    <label className="apm-field full">
                                        <span className="apm-label">
                                            Payment Amount

                                            <span className="apm-required">
                                                {' '}*
                                            </span>
                                        </span>

                                        <span className="apm-wrap">
                                            <span className="apm-icon">
                                                <Icon name="cash" />
                                            </span>

                                            <input
                                                ref={amountRef}
                                                type="number"
                                                className="apm-input"
                                                min="0.01"
                                                max={
                                                    Number(
                                                        purchase
                                                            .due_amount,
                                                    )
                                                }
                                                step="0.01"
                                                inputMode="decimal"
                                                value={
                                                    amountInput
                                                }
                                                disabled={
                                                    isSubmitting
                                                }
                                                placeholder="Enter payment amount"
                                                onChange={(
                                                    event,
                                                ) => {
                                                    setAmountInput(
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

                                        <div className="apm-amount-row">
                                            <span>
                                                Maximum:
                                                {' '}

                                                {money.format(
                                                    Number(
                                                        purchase
                                                            .due_amount,
                                                    ),
                                                )}
                                            </span>

                                            <button
                                                type="button"
                                                className="apm-use-full"
                                                disabled={
                                                    isSubmitting
                                                }
                                                onClick={() => {
                                                    setAmountInput(
                                                        String(
                                                            purchase
                                                                .due_amount,
                                                        ),
                                                    );

                                                    setLocalError(
                                                        '',
                                                    );
                                                }}
                                            >
                                                Use Full Balance
                                            </button>
                                        </div>
                                    </label>

                                    <label className="apm-field">
                                        <span className="apm-label">
                                            Payment Method

                                            <span className="apm-required">
                                                {' '}*
                                            </span>
                                        </span>

                                        <span className="apm-wrap">
                                            <span className="apm-icon">
                                                <Icon name="cash" />
                                            </span>

                                            <select
                                                className="apm-select"
                                                value={
                                                    paymentMethod
                                                }
                                                disabled={
                                                    isSubmitting
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

                                                <option value="cheque">
                                                    Cheque
                                                </option>
                                            </select>
                                        </span>
                                    </label>

                                    <label className="apm-field">
                                        <span className="apm-label">
                                            Reference Number

                                            <span className="apm-optional">
                                                Optional
                                            </span>
                                        </span>

                                        <span className="apm-wrap">
                                            <span className="apm-icon">
                                                <Icon name="receipt" />
                                            </span>

                                            <input
                                                type="text"
                                                className="apm-input"
                                                value={
                                                    referenceNumber
                                                }
                                                maxLength={190}
                                                disabled={
                                                    isSubmitting
                                                }
                                                placeholder="Receipt, transfer or cheque reference"
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
                                        </span>
                                    </label>

                                    <label className="apm-field full">
                                        <span className="apm-label">
                                            Notes

                                            <span className="apm-optional">
                                                Optional
                                            </span>
                                        </span>

                                        <textarea
                                            className="apm-textarea"
                                            rows={3}
                                            value={notes}
                                            maxLength={1000}
                                            disabled={
                                                isSubmitting
                                            }
                                            placeholder="Internal notes about this payment"
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
                                </div>
                            </section>

                            <div className="apm-summary">
                                <div>
                                    <span>
                                        Payment Being Recorded
                                    </span>

                                    <strong>
                                        {money.format(
                                            Number.isFinite(
                                                amount,
                                            )
                                                ? Math.max(
                                                    0,
                                                    amount,
                                                )
                                                : 0,
                                        )}
                                    </strong>
                                </div>

                                <div className="remaining">
                                    <span>
                                        Balance After Payment
                                    </span>

                                    <strong>
                                        {money.format(
                                            remaining,
                                        )}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        <footer className="apm-actions">
                            <button
                                type="button"
                                className="apm-button apm-cancel"
                                disabled={isSubmitting}
                                onClick={onClose}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="apm-button apm-submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="apm-spinner" />
                                ) : (
                                    <Icon name="save" />
                                )}

                                {isSubmitting
                                    ? 'Recording Payment...'
                                    : 'Record Payment'}
                            </button>
                        </footer>
                    </form>
                </section>
            </div>
        </div>,
        document.body,
    );
}