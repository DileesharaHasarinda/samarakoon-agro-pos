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
    SupplierPaymentLineInput,
    SupplierPaymentMethod,
} from '../../types/supplierPayable';

interface ConfigurePurchaseSettlementModalProps {
    purchase:
    SupplierPayable
    | null;

    isSubmitting: boolean;

    errorMessage: string;

    onClose: () => void;

    onSubmit: (
        values:
            ConfigurePurchaseSettlementInput,
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
#supplier-settlement-modal
.spm-list {
    display:flex!important;
    flex-direction:column!important;
    gap:10px!important;
    margin-top:10px!important;
}

#supplier-settlement-modal
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

#supplier-settlement-modal
.spm-field {
    display:flex!important;
    min-width:0!important;
    flex-direction:column!important;
    gap:5px!important;
}

#supplier-settlement-modal
.spm-field span {
    color:#344054!important;
    font-size:10px!important;
    font-weight:800!important;
}

#supplier-settlement-modal
.spm-field input,
#supplier-settlement-modal
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

#supplier-settlement-modal
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

#supplier-settlement-modal
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

#supplier-settlement-modal
.spm-summary {
    display:grid!important;
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    gap:8px!important;
    margin-top:10px!important;
}

#supplier-settlement-modal
.spm-summary div {
    display:flex!important;
    min-height:64px!important;
    flex-direction:column!important;
    justify-content:center!important;
    gap:3px!important;
    padding:9px 10px!important;
    background:#fff!important;
    border:1px solid #dfe6e1!important;
    border-radius:8px!important;
}

#supplier-settlement-modal
.spm-summary span {
    color:#667085!important;
    font-size:9px!important;
    font-weight:800!important;
    text-transform:uppercase!important;
}

#supplier-settlement-modal
.spm-summary strong {
    color:#101828!important;
    font-size:14px!important;
    font-weight:900!important;
}

#supplier-settlement-modal
.spm-summary .paid strong {
    color:#166534!important;
}

#supplier-settlement-modal
.spm-summary .due strong {
    color:#b54708!important;
}

@media(max-width:850px) {
    #supplier-settlement-modal
    .spm-line {
        grid-template-columns:
            repeat(2,minmax(0,1fr))!important;
    }

    #supplier-settlement-modal
    .spm-remove {
        width:100%!important;
        grid-column:1/-1!important;
    }
}

@media(max-width:560px) {
    #supplier-settlement-modal
    .spm-line,
    #supplier-settlement-modal
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
    ] =
        useState<
            PurchaseSettlementType
        >(
            'full',
        );

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
        dueDate,
        setDueDate,
    ] =
        useState(
            '',
        );

    const [
        paymentTerms,
        setPaymentTerms,
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

            setSettlementType(
                'full',
            );

            setLines([
                createLine(
                    1,
                    String(
                        purchase
                            .grand_total,
                    ),
                ),
            ]);

            nextIdRef.current =
                2;

            setDueDate(
                '',
            );

            setPaymentTerms(
                '',
            );

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

    const grandTotal =
        Number(
            purchase
                ?.grand_total
            ?? 0,
        );

    const totalPaid =
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
            grandTotal
            - totalPaid,
        );

    if (
        !purchase
        || typeof document
        === 'undefined'
    ) {
        return null;
    }

    const setType =
        (
            next:
                PurchaseSettlementType,
        ): void => {
            setSettlementType(
                next,
            );

            setLocalError(
                '',
            );

            if (
                next === 'full'
            ) {
                setLines([
                    createLine(
                        1,
                        String(
                            purchase
                                .grand_total,
                        ),
                    ),
                ]);

                nextIdRef.current =
                    2;

                setDueDate(
                    '',
                );

                return;
            }

            if (
                next === 'due'
            ) {
                setLines(
                    [],
                );

                return;
            }

            setLines([
                createLine(
                    1,
                    '',
                ),
            ]);

            nextIdRef.current =
                2;
        };

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
                settlementType
                !== 'due'
                && payments.length
                === 0
            ) {
                setLocalError(
                    'Add at least one payment method.',
                );

                return;
            }

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
                settlementType
                === 'full'
                && Math.abs(
                    totalPaid
                    - grandTotal,
                ) > 0.01
            ) {
                setLocalError(
                    `The combined payments must equal ${money.format(
                        grandTotal,
                    )}.`,
                );

                return;
            }

            if (
                settlementType
                === 'partial'
                && (
                    totalPaid <= 0
                    || totalPaid
                    >= grandTotal
                )
            ) {
                setLocalError(
                    'For a partial payment, the combined payment must be greater than zero and lower than the purchase total.',
                );

                return;
            }

            onSubmit({
                settlement_type:
                    settlementType,

                payments:
                    settlementType
                        === 'due'
                        ? []
                        : payments,

                /*
                 * Due date is optional.
                 */
                due_date:
                    settlementType
                        === 'full'
                        ? ''
                        : dueDate,

                payment_terms:
                    paymentTerms
                        .trim(),
            });
        };

    return createPortal(
        <div id="supplier-settlement-modal">
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
                    className="apm-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="settlement-title"
                >
                    <header className="apm-header">
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

                        <button
                            type="button"
                            className="apm-close"
                            aria-label="Close settlement form"
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
                                        Purchase Total
                                    </span>

                                    <strong>
                                        {money.format(
                                            grandTotal,
                                        )}
                                    </strong>
                                </div>
                            </div>

                            <section className="apm-section">
                                <div>
                                    <h3>
                                        Settlement Type
                                    </h3>

                                    <p>
                                        Select how this purchase is being settled.
                                    </p>
                                </div>

                                <div className="apm-type-grid">
                                    <label className="apm-type">
                                        <input
                                            type="radio"
                                            checked={
                                                settlementType
                                                === 'full'
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={() => {
                                                setType(
                                                    'full',
                                                );
                                            }}
                                        />

                                        <strong>
                                            Fully Paid
                                        </strong>
                                    </label>

                                    <label className="apm-type">
                                        <input
                                            type="radio"
                                            checked={
                                                settlementType
                                                === 'partial'
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={() => {
                                                setType(
                                                    'partial',
                                                );
                                            }}
                                        />

                                        <strong>
                                            Partial Payment
                                        </strong>
                                    </label>

                                    <label className="apm-type">
                                        <input
                                            type="radio"
                                            checked={
                                                settlementType
                                                === 'due'
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={() => {
                                                setType(
                                                    'due',
                                                );
                                            }}
                                        />

                                        <strong>
                                            Entirely on Credit
                                        </strong>
                                    </label>
                                </div>
                            </section>

                            {settlementType
                                !== 'due' && (
                                    <section className="apm-section">
                                        <div>
                                            <h3>
                                                Payment Methods
                                            </h3>

                                            <p>
                                                Add one or more methods. Example: Cash Rs.2,500 + Cheque Rs.2,500.
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
                                                                step="0.01"
                                                                inputMode="decimal"
                                                                value={
                                                                    line
                                                                        .amount
                                                                }
                                                                disabled={
                                                                    isSubmitting
                                                                }
                                                                placeholder="0.00"
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
                                                    Total
                                                </span>

                                                <strong>
                                                    {money.format(
                                                        grandTotal,
                                                    )}
                                                </strong>
                                            </div>

                                            <div className="paid">
                                                <span>
                                                    Paid Now
                                                </span>

                                                <strong>
                                                    {money.format(
                                                        totalPaid,
                                                    )}
                                                </strong>
                                            </div>

                                            <div className="due">
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
                                )}

                            {settlementType
                                !== 'full' && (
                                    <section className="apm-section">
                                        <div>
                                            <h3>
                                                Credit Details
                                            </h3>

                                            <p>
                                                Due date is optional.
                                            </p>
                                        </div>

                                        <div className="apm-grid">
                                            <label className="apm-field">
                                                <span className="apm-label">
                                                    Due Date

                                                    <span className="apm-optional">
                                                        Optional
                                                    </span>
                                                </span>

                                                <input
                                                    type="date"
                                                    className="apm-input"
                                                    value={
                                                        dueDate
                                                    }
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
                                                    }}
                                                />
                                            </label>

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
                                                    maxLength={
                                                        255
                                                    }
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
                                        </div>
                                    </section>
                                )}

                            {settlementType
                                === 'due' && (
                                    <div className="spm-summary">
                                        <div>
                                            <span>
                                                Total
                                            </span>

                                            <strong>
                                                {money.format(
                                                    grandTotal,
                                                )}
                                            </strong>
                                        </div>

                                        <div className="paid">
                                            <span>
                                                Paid Now
                                            </span>

                                            <strong>
                                                {money.format(
                                                    0,
                                                )}
                                            </strong>
                                        </div>

                                        <div className="due">
                                            <span>
                                                Remaining Due
                                            </span>

                                            <strong>
                                                {money.format(
                                                    grandTotal,
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                )}
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
