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
    SupplierPaymentLineInput,
    SupplierPaymentMethod,
} from '../../types/supplierPayable';

interface RecordSupplierPaymentModalProps {
    purchase:
    SupplierPayable
    | null;

    isSubmitting: boolean;

    errorMessage: string;

    onClose: () => void;

    onSubmit: (
        values:
            SupplierPaymentInput,
    ) => void;
}

interface EditablePaymentLine {
    id: number;

    payment_method:
    SupplierPaymentMethod;

    amount: string;

    reference_number: string;

    notes: string;
}

const money =
    new Intl.NumberFormat(
        'en-GB',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

const styles = `
#supplier-payment-modal
.spm-list {
    display:flex!important;
    flex-direction:column!important;
    gap:10px!important;
}

#supplier-payment-modal
.spm-line {
    display:grid!important;
    grid-template-columns:
        minmax(130px,.8fr)
        minmax(130px,.7fr)
        minmax(170px,1.1fr)
        42px!important;
    gap:8px!important;
    align-items:end!important;
    padding:10px!important;
    background:#f8faf9!important;
    border:1px solid #dfe6e1!important;
    border-radius:9px!important;
}

#supplier-payment-modal
.spm-field {
    display:flex!important;
    min-width:0!important;
    flex-direction:column!important;
    gap:5px!important;
}

#supplier-payment-modal
.spm-field span {
    color:#344054!important;
    font-size:10px!important;
    font-weight:800!important;
}

#supplier-payment-modal
.spm-field input,
#supplier-payment-modal
.spm-field select {
    width:100%!important;
    min-width:0!important;
    height:40px!important;
    padding:0 9px!important;
    color:#101828!important;
    font-size:12px!important;
    font-weight:650!important;
    background:#fff!important;
    border:1px solid #aebdb2!important;
    border-radius:7px!important;
    outline:none!important;
}

#supplier-payment-modal
.spm-remove {
    display:grid!important;
    width:40px!important;
    height:40px!important;
    place-items:center!important;
    padding:0!important;
    color:#b42318!important;
    background:#fef3f2!important;
    border:1px solid #efbbb6!important;
    border-radius:7px!important;
    cursor:pointer!important;
}

#supplier-payment-modal
.spm-add {
    display:inline-flex!important;
    min-height:38px!important;
    align-items:center!important;
    justify-content:center!important;
    margin-top:9px!important;
    padding:7px 11px!important;
    color:#166534!important;
    font-size:11px!important;
    font-weight:800!important;
    background:#f0fdf4!important;
    border:1px solid #b8dfc3!important;
    border-radius:8px!important;
    cursor:pointer!important;
}

#supplier-payment-modal
.spm-summary {
    display:grid!important;
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    gap:8px!important;
    margin-top:12px!important;
}

#supplier-payment-modal
.spm-summary div {
    display:flex!important;
    min-height:66px!important;
    flex-direction:column!important;
    justify-content:center!important;
    gap:3px!important;
    padding:9px 10px!important;
    background:#fff!important;
    border:1px solid #dfe6e1!important;
    border-radius:8px!important;
}

#supplier-payment-modal
.spm-summary span {
    color:#667085!important;
    font-size:9px!important;
    font-weight:800!important;
    text-transform:uppercase!important;
}

#supplier-payment-modal
.spm-summary strong {
    color:#101828!important;
    font-size:14px!important;
    font-weight:900!important;
}

#supplier-payment-modal
.spm-summary .paid strong {
    color:#166534!important;
}

#supplier-payment-modal
.spm-summary .remaining strong {
    color:#b54708!important;
}

@media(max-width:800px) {
    #supplier-payment-modal
    .spm-line {
        grid-template-columns:
            repeat(2,minmax(0,1fr))!important;
    }

    #supplier-payment-modal
    .spm-remove {
        width:100%!important;
        grid-column:1/-1!important;
    }
}

@media(max-width:520px) {
    #supplier-payment-modal
    .spm-line,
    #supplier-payment-modal
    .spm-summary {
        grid-template-columns:1fr!important;
    }
}
`;

function createLine(
    id: number,
    amount = '',
): EditablePaymentLine {
    return {
        id,

        payment_method:
            'cash',

        amount,

        reference_number:
            '',

        notes:
            '',
    };
}

function parsePaymentMethod(
    value: string,
): SupplierPaymentMethod {
    if (
        value === 'card'
    ) {
        return 'card';
    }

    if (
        value
        === 'bank_transfer'
    ) {
        return 'bank_transfer';
    }

    if (
        value === 'cheque'
    ) {
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
        lines,
        setLines,
    ] =
        useState<
            EditablePaymentLine[]
        >(
            [],
        );

    const [
        localError,
        setLocalError,
    ] =
        useState(
            '',
        );

    const nextIdRef =
        useRef(
            2,
        );

    const onCloseRef =
        useRef(
            onClose,
        );

    const submittingRef =
        useRef(
            isSubmitting,
        );

    useEffect(
        () => {
            onCloseRef.current =
                onClose;
        },
        [
            onClose,
        ],
    );

    useEffect(
        () => {
            submittingRef.current =
                isSubmitting;
        },
        [
            isSubmitting,
        ],
    );

    useEffect(
        () => {
            if (!purchase) {
                return;
            }

            setLines([
                createLine(
                    1,
                    String(
                        purchase
                            .due_amount,
                    ),
                ),
            ]);

            nextIdRef.current =
                2;

            setLocalError(
                '',
            );
        },
        [
            purchase,
        ],
    );

    useEffect(
        () => {
            if (!purchase) {
                return;
            }

            const oldOverflow =
                document.body
                    .style
                    .overflow;

            document.body.style.overflow =
                'hidden';

            const handleKeyDown =
                (
                    event:
                        KeyboardEvent,
                ): void => {
                    if (
                        event.key
                        === 'Escape'
                        && !submittingRef
                            .current
                    ) {
                        onCloseRef
                            .current();
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
            };
        },
        [
            purchase,
        ],
    );

    const currentDue =
        Number(
            purchase
                ?.due_amount
            ?? 0,
        );

    const totalPayment =
        useMemo(
            () =>
                lines.reduce(
                    (
                        total,
                        line,
                    ) => {
                        const amount =
                            Number(
                                line
                                    .amount
                                || 0,
                            );

                        return total
                            + (
                                Number
                                    .isFinite(
                                        amount,
                                    )
                                    ? amount
                                    : 0
                            );
                    },
                    0,
                ),
            [
                lines,
            ],
        );

    const remainingDue =
        Math.max(
            0,
            currentDue
            - totalPayment,
        );

    if (
        !purchase
        || typeof document
        === 'undefined'
    ) {
        return null;
    }

    const updateLine =
        (
            id: number,
            changes:
                Partial<
                    EditablePaymentLine
                >,
        ): void => {
            setLines(
                (
                    current,
                ) =>
                    current.map(
                        (
                            line,
                        ) =>
                            line.id
                                === id
                                ? {
                                    ...line,
                                    ...changes,
                                }
                                : line,
                    ),
            );

            setLocalError(
                '',
            );
        };

    const addLine =
        (): void => {
            setLines(
                (
                    current,
                ) => [
                        ...current,

                        createLine(
                            nextIdRef
                                .current++,
                        ),
                    ],
            );
        };

    const removeLine =
        (
            id: number,
        ): void => {
            setLines(
                (
                    current,
                ) =>
                    current.filter(
                        (
                            line,
                        ) =>
                            line.id
                            !== id,
                    ),
            );
        };

    const handleSubmit =
        (
            event:
                FormEvent<
                    HTMLFormElement
                >,
        ): void => {
            event.preventDefault();

            if (
                lines.length
                === 0
            ) {
                setLocalError(
                    'Add at least one payment method.',
                );

                return;
            }

            const payments:
                SupplierPaymentLineInput[] =
                lines.map(
                    (
                        line,
                    ) => ({
                        payment_method:
                            line
                                .payment_method,

                        amount:
                            Number(
                                line
                                    .amount
                                || 0,
                            ),

                        reference_number:
                            line
                                .reference_number
                                .trim(),

                        notes:
                            line
                                .notes
                                .trim(),
                    }),
                );

            if (
                payments.some(
                    (
                        payment,
                    ) =>
                        !Number
                            .isFinite(
                                payment.amount,
                            )
                        || payment
                            .amount
                        <= 0,
                )
            ) {
                setLocalError(
                    'Every payment line must have an amount greater than zero.',
                );

                return;
            }

            if (
                totalPayment
                > currentDue
                + 0.01
            ) {
                setLocalError(
                    `The combined payment cannot exceed ${money.format(
                        currentDue,
                    )}.`,
                );

                return;
            }

            onSubmit({
                payments,
            });
        };

    return createPortal(
        <div id="supplier-payment-modal">
            <style>
                {styles}
            </style>

            <div
                className="apm-backdrop"
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
                <section
                    className="apm-dialog payment"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="payment-title"
                >
                    <header className="apm-header">
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

                        <button
                            type="button"
                            className="apm-close"
                            aria-label="Close payment form"
                            disabled={
                                isSubmitting
                            }
                            onClick={
                                onClose
                            }
                        >
                            ×
                        </button>
                    </header>

                    <form
                        className="apm-form"
                        noValidate
                        onSubmit={
                            handleSubmit
                        }
                    >
                        <div className="apm-body">
                            {(localError
                                || errorMessage) && (
                                    <div
                                        className="apm-alert"
                                        role="alert"
                                    >
                                        {
                                            localError
                                            || errorMessage
                                        }
                                    </div>
                                )}

                            <div className="apm-total">
                                <div>
                                    <span>
                                        Current Supplier Due
                                    </span>

                                    <strong>
                                        {money.format(
                                            currentDue,
                                        )}
                                    </strong>
                                </div>
                            </div>

                            <section className="apm-section">
                                <div>
                                    <h3>
                                        Payment Methods
                                    </h3>

                                    <p>
                                        Add one or more methods for this payment.
                                    </p>
                                </div>

                                <div className="spm-list">
                                    {lines.map(
                                        (
                                            line,
                                        ) => (
                                            <div
                                                key={
                                                    line.id
                                                }
                                                className="spm-line"
                                            >
                                                <label className="spm-field">
                                                    <span>
                                                        Method
                                                    </span>

                                                    <select
                                                        value={
                                                            line
                                                                .payment_method
                                                        }
                                                        disabled={
                                                            isSubmitting
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            updateLine(
                                                                line.id,
                                                                {
                                                                    payment_method:
                                                                        parsePaymentMethod(
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        ),
                                                                },
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
                                                </label>

                                                <label className="spm-field">
                                                    <span>
                                                        Amount
                                                    </span>

                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        max={
                                                            currentDue
                                                        }
                                                        step="0.01"
                                                        inputMode="decimal"
                                                        value={
                                                            line
                                                                .amount
                                                        }
                                                        disabled={
                                                            isSubmitting
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            updateLine(
                                                                line.id,
                                                                {
                                                                    amount:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                },
                                                            );
                                                        }}
                                                    />
                                                </label>

                                                <label className="spm-field">
                                                    <span>
                                                        Reference
                                                        {' '}
                                                        (Optional)
                                                    </span>

                                                    <input
                                                        type="text"
                                                        maxLength={190}
                                                        value={
                                                            line
                                                                .reference_number
                                                        }
                                                        disabled={
                                                            isSubmitting
                                                        }
                                                        placeholder={
                                                            line
                                                                .payment_method
                                                                === 'cheque'
                                                                ? 'Cheque number'
                                                                : 'Receipt / transfer reference'
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            updateLine(
                                                                line.id,
                                                                {
                                                                    reference_number:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                },
                                                            );
                                                        }}
                                                    />
                                                </label>

                                                <button
                                                    type="button"
                                                    className="spm-remove"
                                                    aria-label="Remove payment line"
                                                    disabled={
                                                        isSubmitting
                                                    }
                                                    onClick={() => {
                                                        removeLine(
                                                            line.id,
                                                        );
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ),
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className="spm-add"
                                    disabled={
                                        isSubmitting
                                        || lines
                                            .length
                                        >= 10
                                    }
                                    onClick={
                                        addLine
                                    }
                                >
                                    + Add Payment Method
                                </button>

                                <div className="spm-summary">
                                    <div>
                                        <span>
                                            Current Due
                                        </span>

                                        <strong>
                                            {money.format(
                                                currentDue,
                                            )}
                                        </strong>
                                    </div>

                                    <div className="paid">
                                        <span>
                                            Paying Now
                                        </span>

                                        <strong>
                                            {money.format(
                                                totalPayment,
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
                            </section>
                        </div>

                        <footer className="apm-actions">
                            <button
                                type="button"
                                className="apm-button apm-cancel"
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
                                type="submit"
                                className="apm-button apm-submit"
                                disabled={
                                    isSubmitting
                                }
                            >
                                {isSubmitting
                                    ? 'Saving Payment...'
                                    : 'Save Payment'}
                            </button>
                        </footer>
                    </form>
                </section>
            </div>
        </div>,
        document.body,
    );
}
