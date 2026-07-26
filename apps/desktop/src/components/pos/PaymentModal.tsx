import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import CustomerSelectModal
    from '../customers/CustomerSelectModal';

import type {
    Customer,
} from '../../types/customer';

import type {
    CompleteSaleValues,
    PosPaymentMethod,
    SaleSettlementType,
} from '../../types/sale';

interface PaymentModalProps {
    isOpen: boolean;
    grandTotal: number;
    discount: number;
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

function parseSettlementType(
    value: string,
): SaleSettlementType {
    switch (value) {
        case 'partial':
            return 'partial';

        case 'due':
            return 'due';

        default:
            return 'full';
    }
}

export default function PaymentModal({
    isOpen,
    grandTotal,
    discount,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: PaymentModalProps) {
    const [
        selectedCustomer,
        setSelectedCustomer,
    ] = useState<Customer | null>(
        null,
    );

    const [
        customerModalOpen,
        setCustomerModalOpen,
    ] = useState(false);

    const [
        settlementType,
        setSettlementType,
    ] = useState<SaleSettlementType>(
        'full',
    );

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
        dueDate,
        setDueDate,
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

        setSelectedCustomer(null);
        setSettlementType('full');
        setPaymentMethod('cash');

        setAmountReceived(
            grandTotal.toFixed(2),
        );

        setDueDate('');
        setReferenceNumber('');
        setNotes('');
        setLocalError('');
    }, [
        grandTotal,
        isOpen,
    ]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (settlementType === 'full') {
            setAmountReceived(
                grandTotal.toFixed(2),
            );

            setDueDate('');
        } else if (
            settlementType === 'due'
        ) {
            setAmountReceived('0');
        }
    }, [
        grandTotal,
        isOpen,
        settlementType,
    ]);

    const numericAmount =
        Number(
            amountReceived || 0,
        );

    const calculatedDue =
        useMemo(
            () =>
                Math.max(
                    0,
                    grandTotal
                    - numericAmount,
                ),
            [
                grandTotal,
                numericAmount,
            ],
        );

    if (!isOpen) {
        return null;
    }

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (
            (
                settlementType
                === 'partial'
                || settlementType
                === 'due'
            )
            && !selectedCustomer
        ) {
            setLocalError(
                'Select a registered customer for partial or due sales.',
            );

            return;
        }

        if (
            settlementType !== 'full'
            && !dueDate
        ) {
            setLocalError(
                'Please select the due date.',
            );

            return;
        }

        if (
            settlementType === 'partial'
            && (
                numericAmount <= 0
                || numericAmount
                >= grandTotal
            )
        ) {
            setLocalError(
                'Partial payment must be greater than zero and less than the total.',
            );

            return;
        }

        if (
            settlementType === 'full'
            && paymentMethod !== 'cash'
            && Math.abs(
                numericAmount
                - grandTotal,
            ) > 0.01
        ) {
            setLocalError(
                'Card and bank-transfer payments must equal the total.',
            );

            return;
        }

        if (
            settlementType === 'full'
            && paymentMethod === 'cash'
            && numericAmount < grandTotal
        ) {
            setLocalError(
                'The received cash amount is less than the total.',
            );

            return;
        }

        onSubmit({
            customer_id:
                selectedCustomer?.id
                ?? null,

            settlement_type:
                settlementType,

            discount,

            payment_method:
                settlementType === 'due'
                    ? null
                    : paymentMethod,

            amount_received:
                settlementType === 'due'
                    ? 0
                    : numericAmount,

            due_date:
                settlementType === 'full'
                    ? ''
                    : dueDate,

            reference_number:
                referenceNumber.trim(),

            notes:
                notes.trim(),
        });
    };

    return (
        <>
            <div className="modal-backdrop">
                <section className="payment-modal">
                    <header className="modal-header">
                        <div>
                            <span className="page-kicker">
                                Checkout
                            </span>

                            <h2>
                                Complete Sale
                            </h2>
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
                        className="payment-form"
                        onSubmit={handleSubmit}
                    >
                        {(localError
                            || errorMessage) && (
                                <div className="form-alert">
                                    {localError
                                        || errorMessage}
                                </div>
                            )}

                        <section className="payment-customer-card">
                            <div>
                                <span>Customer</span>

                                <strong>
                                    {selectedCustomer
                                        ?.name
                                        ?? 'Walk-in Customer'}
                                </strong>

                                <small>
                                    {selectedCustomer
                                        ?.mobile
                                        ?? 'No customer account selected'}
                                </small>
                            </div>

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => {
                                    setCustomerModalOpen(
                                        true,
                                    );
                                }}
                            >
                                Select Customer
                            </button>
                        </section>

                        <label>
                            <span>
                                Sale Settlement
                            </span>

                            <select
                                value={settlementType}
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    setSettlementType(
                                        parseSettlementType(
                                            event
                                                .target
                                                .value,
                                        ),
                                    );

                                    setLocalError('');
                                }}
                            >
                                <option value="full">
                                    Full Payment
                                </option>

                                <option value="partial">
                                    Partial Payment
                                </option>

                                <option value="due">
                                    Entire Sale on Due
                                </option>
                            </select>
                        </label>

                        {settlementType
                            !== 'due' && (
                                <label>
                                    <span>
                                        Payment Method
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
                            )}

                        <label>
                            <span>
                                Amount Received
                            </span>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={amountReceived}
                                disabled={
                                    isSubmitting
                                    || settlementType
                                    === 'due'
                                }
                                onChange={(event) => {
                                    setAmountReceived(
                                        event.target.value,
                                    );

                                    setLocalError('');
                                }}
                            />
                        </label>

                        {settlementType
                            !== 'full' && (
                                <label>
                                    <span>
                                        Due Date *
                                    </span>

                                    <input
                                        type="date"
                                        value={dueDate}
                                        min={
                                            new Date()
                                                .toISOString()
                                                .slice(0, 10)
                                        }
                                        disabled={isSubmitting}
                                        onChange={(event) => {
                                            setDueDate(
                                                event.target.value,
                                            );
                                        }}
                                    />
                                </label>
                            )}

                        <label>
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

                        <label>
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

                        <section className="payment-summary">
                            <div>
                                <span>Grand Total</span>

                                <strong>
                                    {currencyFormatter
                                        .format(
                                            grandTotal,
                                        )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Amount Received
                                </span>

                                <strong>
                                    {currencyFormatter
                                        .format(
                                            settlementType
                                                === 'due'
                                                ? 0
                                                : numericAmount,
                                        )}
                                </strong>
                            </div>

                            <div className="payment-due-row">
                                <span>
                                    Due Amount
                                </span>

                                <strong>
                                    {currencyFormatter
                                        .format(
                                            settlementType
                                                === 'full'
                                                ? 0
                                                : calculatedDue,
                                        )}
                                </strong>
                            </div>
                        </section>

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
                                    ? 'Completing...'
                                    : 'Complete Sale'}
                            </button>
                        </footer>
                    </form>
                </section>
            </div>

            <CustomerSelectModal
                isOpen={customerModalOpen}
                selectedCustomer={
                    selectedCustomer
                }
                onClose={() => {
                    setCustomerModalOpen(
                        false,
                    );
                }}
                onSelect={
                    setSelectedCustomer
                }
            />
        </>
    );
}