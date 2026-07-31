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
    ConfigurePurchaseSettlementInput,
    PurchaseSettlementType,
    SupplierPayable,
    SupplierPaymentMethod,
} from '../../types/supplierPayable';

interface ConfigurePurchaseSettlementModalProps {
    purchase: SupplierPayable | null;
    isSubmitting: boolean;
    errorMessage: string;
    onClose: () => void;

    onSubmit: (
        values:
            ConfigurePurchaseSettlementInput,
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
    | 'calendar'
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

        case 'cash':
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
                    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
                    <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
            );
    }
}

function parseSettlementType(
    value: string,
): PurchaseSettlementType {
    if (value === 'partial') {
        return 'partial';
    }

    if (value === 'due') {
        return 'due';
    }

    return 'full';
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

export default function ConfigurePurchaseSettlementModal({
    purchase,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: ConfigurePurchaseSettlementModalProps) {
    const [
        settlementType,
        setSettlementType,
    ] = useState<PurchaseSettlementType>(
        'full',
    );

    const [
        initialPaidInput,
        setInitialPaidInput,
    ] = useState('');

    const [
        paymentMethod,
        setPaymentMethod,
    ] = useState<SupplierPaymentMethod>(
        'cash',
    );

    const [
        dueDate,
        setDueDate,
    ] = useState('');

    const [
        paymentTerms,
        setPaymentTerms,
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

        setSettlementType('full');

        setInitialPaidInput(
            String(
                purchase.grand_total,
            ),
        );

        setPaymentMethod('cash');
        setDueDate('');
        setPaymentTerms('');
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
            document.body.style.overflow =
                oldOverflow;

            window.removeEventListener(
                'keydown',
                handleKeyDown,
            );

            oldFocus?.focus();
        };
    }, [purchase]);

    const initialPaid =
        Number(
            initialPaidInput || 0,
        );

    const remainingDue =
        useMemo(
            () => {
                if (!purchase) {
                    return 0;
                }

                if (
                    settlementType === 'full'
                ) {
                    return 0;
                }

                if (
                    settlementType === 'due'
                ) {
                    return Number(
                        purchase.grand_total,
                    );
                }

                return Math.max(
                    0,
                    Number(
                        purchase.grand_total,
                    ) - initialPaid,
                );
            },
            [
                purchase,
                settlementType,
                initialPaid,
            ],
        );

    if (
        !purchase
        || typeof document === 'undefined'
    ) {
        return null;
    }

    const selectSettlement = (
        value:
            PurchaseSettlementType,
    ): void => {
        setSettlementType(value);
        setLocalError('');

        if (value === 'full') {
            setInitialPaidInput(
                String(
                    purchase.grand_total,
                ),
            );

            setDueDate('');
        } else if (value === 'due') {
            setInitialPaidInput('0');
        } else {
            setInitialPaidInput('');
        }
    };

    const handleSubmit = (
        event:
            FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (
            settlementType === 'partial'
            && (
                !Number.isFinite(
                    initialPaid,
                )
                || initialPaid <= 0
                || initialPaid
                >= Number(
                    purchase.grand_total,
                )
            )
        ) {
            setLocalError(
                'Enter an initial payment greater than zero and lower than the purchase total.',
            );

            return;
        }

        if (
            settlementType !== 'full'
            && !dueDate
        ) {
            setLocalError(
                'Select the date by which the remaining balance must be paid.',
            );

            return;
        }

        setLocalError('');

        onSubmit({
            settlement_type:
                settlementType,

            initial_paid_amount:
                settlementType === 'full'
                    ? Number(
                        purchase.grand_total,
                    )
                    : settlementType === 'due'
                        ? 0
                        : initialPaid,

            payment_method:
                settlementType === 'due'
                    ? null
                    : paymentMethod,

            due_date:
                settlementType === 'full'
                    ? ''
                    : dueDate,

            payment_terms:
                paymentTerms.trim(),

            reference_number:
                referenceNumber.trim(),

            notes:
                notes.trim(),
        });
    };

    return createPortal(
        <div id="supplier-settlement-modal">
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
                    className="apm-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="settlement-title"
                    aria-describedby="settlement-description"
                >
                    <header className="apm-header">
                        <div className="apm-head-main">
                            <span className="apm-head-icon">
                                <Icon name="receipt" />
                            </span>

                            <div className="apm-head-copy">
                                <span className="apm-kicker">
                                    Supplier Settlement
                                </span>

                                <h2
                                    id="settlement-title"
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
                            aria-label="Close settlement form"
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
                                id="settlement-description"
                                className="apm-help"
                            >
                                <Icon name="info" />

                                Choose how this purchase
                                will be settled with the
                                supplier.
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

                            <div className="apm-total">
                                <div>
                                    <span>
                                        Purchase Total
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

                                <Icon name="cash" />
                            </div>

                            <section className="apm-section">
                                <div>
                                    <h3>
                                        Settlement Type
                                    </h3>

                                    <p>
                                        Select the payment
                                        arrangement agreed
                                        with the supplier.
                                    </p>
                                </div>

                                <div className="apm-type-grid">
                                    {([
                                        [
                                            'full',
                                            'Fully Paid',
                                            'Record the complete purchase value as paid now.',
                                        ],
                                        [
                                            'partial',
                                            'Partial Payment',
                                            'Pay an amount now and keep the balance as due.',
                                        ],
                                        [
                                            'due',
                                            'Entirely on Credit',
                                            'No payment now; the full total remains due.',
                                        ],
                                    ] as const).map(
                                        ([
                                            value,
                                            label,
                                            description,
                                        ]) => (
                                            <label
                                                key={value}
                                                className="apm-type"
                                            >
                                                <input
                                                    type="radio"
                                                    name="settlement_type"
                                                    value={value}
                                                    checked={
                                                        settlementType
                                                        === value
                                                    }
                                                    disabled={
                                                        isSubmitting
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) => {
                                                        selectSettlement(
                                                            parseSettlementType(
                                                                event
                                                                    .target
                                                                    .value,
                                                            ),
                                                        );
                                                    }}
                                                />

                                                <strong>
                                                    {label}
                                                </strong>

                                                <span>
                                                    {description}
                                                </span>
                                            </label>
                                        ),
                                    )}
                                </div>
                            </section>

                            <section className="apm-section">
                                <div>
                                    <h3>
                                        Payment Details
                                    </h3>

                                    <p>
                                        Enter the information
                                        needed for this
                                        settlement arrangement.
                                    </p>
                                </div>

                                <div className="apm-grid">
                                    {settlementType
                                        !== 'due' && (
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
                                        )}

                                    {settlementType
                                        === 'partial' && (
                                            <label className="apm-field">
                                                <span className="apm-label">
                                                    Initial Payment

                                                    <span className="apm-required">
                                                        {' '}*
                                                    </span>
                                                </span>

                                                <span className="apm-wrap">
                                                    <span className="apm-icon">
                                                        <Icon name="cash" />
                                                    </span>

                                                    <input
                                                        type="number"
                                                        className="apm-input"
                                                        min="0.01"
                                                        max={
                                                            Number(
                                                                purchase
                                                                    .grand_total,
                                                            )
                                                            - 0.01
                                                        }
                                                        step="0.01"
                                                        inputMode="decimal"
                                                        value={
                                                            initialPaidInput
                                                        }
                                                        disabled={
                                                            isSubmitting
                                                        }
                                                        placeholder="Amount paid now"
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            setInitialPaidInput(
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
                                        )}

                                    {settlementType
                                        !== 'full' && (
                                            <label className="apm-field">
                                                <span className="apm-label">
                                                    Due Date

                                                    <span className="apm-required">
                                                        {' '}*
                                                    </span>
                                                </span>

                                                <span className="apm-wrap">
                                                    <span className="apm-icon">
                                                        <Icon name="calendar" />
                                                    </span>

                                                    <input
                                                        type="date"
                                                        className="apm-input"
                                                        value={dueDate}
                                                        disabled={
                                                            isSubmitting
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
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
                                                </span>
                                            </label>
                                        )}

                                    <label className="apm-field">
                                        <span className="apm-label">
                                            Payment Terms

                                            <span className="apm-optional">
                                                Optional
                                            </span>
                                        </span>

                                        <input
                                            type="text"
                                            className="apm-input"
                                            value={
                                                paymentTerms
                                            }
                                            maxLength={190}
                                            disabled={
                                                isSubmitting
                                            }
                                            placeholder="Example: Payment within 30 days"
                                            onChange={(
                                                event,
                                            ) => {
                                                setPaymentTerms(
                                                    event
                                                        .target
                                                        .value,
                                                );
                                            }}
                                        />
                                    </label>

                                    <label className="apm-field full">
                                        <span className="apm-label">
                                            Reference Number

                                            <span className="apm-optional">
                                                Optional
                                            </span>
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
                                            placeholder="Internal notes about this settlement"
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
                                        Initial Payment
                                    </span>

                                    <strong>
                                        {money.format(
                                            settlementType
                                                === 'full'
                                                ? Number(
                                                    purchase
                                                        .grand_total,
                                                )
                                                : settlementType
                                                    === 'due'
                                                    ? 0
                                                    : initialPaid,
                                        )}
                                    </strong>
                                </div>

                                <div className="remaining">
                                    <span>
                                        Remaining Due
                                    </span>

                                    <strong>
                                        {money.format(
                                            remainingDue,
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
                                    ? 'Saving Settlement...'
                                    : 'Save Settlement'}
                            </button>
                        </footer>
                    </form>
                </section>
            </div>
        </div>,
        document.body,
    );
}