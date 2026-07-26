import {
    useEffect,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

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

function parseSettlementType(
    value: string,
): PurchaseSettlementType {
    switch (value) {
        case 'partial':
            return 'partial';

        case 'due':
            return 'due';

        default:
            return 'full';
    }
}

function parsePaymentMethod(
    value: string,
): SupplierPaymentMethod {
    switch (value) {
        case 'card':
            return 'card';

        case 'bank_transfer':
            return 'bank_transfer';

        case 'cheque':
            return 'cheque';

        default:
            return 'cash';
    }
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
        initialPaid,
        setInitialPaid,
    ] = useState(0);

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

    useEffect(() => {
        if (!purchase) {
            return;
        }

        setSettlementType('full');
        setInitialPaid(
            purchase.grand_total,
        );

        setPaymentMethod('cash');
        setDueDate('');
        setPaymentTerms('');
        setReferenceNumber('');
        setNotes('');
        setLocalError('');
    }, [purchase]);

    if (!purchase) {
        return null;
    }

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (
            settlementType === 'partial'
            && (
                initialPaid <= 0
                || initialPaid
                >= purchase.grand_total
            )
        ) {
            setLocalError(
                'Initial payment must be greater than zero and less than the purchase total.',
            );

            return;
        }

        if (
            settlementType !== 'full'
            && !dueDate
        ) {
            setLocalError(
                'Enter the supplier payment due date.',
            );

            return;
        }

        onSubmit({
            settlement_type:
                settlementType,

            initial_paid_amount:
                settlementType === 'full'
                    ? purchase.grand_total
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
                paymentTerms,

            reference_number:
                referenceNumber,

            notes,
        });
    };

    return (
        <div className="modal-backdrop">
            <section className="supplier-payment-modal">
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Supplier settlement
                        </span>

                        <h2>
                            {purchase.purchase_number}
                        </h2>

                        <p>
                            {purchase.supplier.name}
                        </p>
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
                    className="supplier-payment-form"
                    onSubmit={handleSubmit}
                >
                    {(localError
                        || errorMessage) && (
                            <div className="form-alert">
                                {localError
                                    || errorMessage}
                            </div>
                        )}

                    <div className="supplier-total-card">
                        <span>
                            Purchase Total
                        </span>

                        <strong>
                            LKR{' '}
                            {purchase
                                .grand_total
                                .toFixed(2)}
                        </strong>
                    </div>

                    <label>
                        <span>
                            Settlement Type
                        </span>

                        <select
                            value={settlementType}
                            disabled={isSubmitting}
                            onChange={(event) => {
                                const value =
                                    parseSettlementType(
                                        event.target.value,
                                    );

                                setSettlementType(
                                    value,
                                );

                                setInitialPaid(
                                    value === 'full'
                                        ? purchase
                                            .grand_total
                                        : 0,
                                );

                                setLocalError('');
                            }}
                        >
                            <option value="full">
                                Fully Paid
                            </option>

                            <option value="partial">
                                Partial Payment
                            </option>

                            <option value="due">
                                Entire Purchase on Due
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

                                    <option value="cheque">
                                        Cheque
                                    </option>
                                </select>
                            </label>
                        )}

                    {settlementType
                        === 'partial' && (
                            <label>
                                <span>
                                    Initial Payment
                                </span>

                                <input
                                    type="number"
                                    min="0.01"
                                    max={
                                        purchase.grand_total
                                        - 0.01
                                    }
                                    step="0.01"
                                    value={initialPaid}
                                    disabled={isSubmitting}
                                    onChange={(event) => {
                                        setInitialPaid(
                                            Number(
                                                event
                                                    .target
                                                    .value,
                                            ),
                                        );
                                    }}
                                />
                            </label>
                        )}

                    {settlementType
                        !== 'full' && (
                            <label>
                                <span>
                                    Due Date
                                </span>

                                <input
                                    type="date"
                                    value={dueDate}
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
                            Payment Terms
                        </span>

                        <input
                            value={paymentTerms}
                            placeholder="Example: Payment within 30 days"
                            disabled={isSubmitting}
                            onChange={(event) => {
                                setPaymentTerms(
                                    event.target.value,
                                );
                            }}
                        />
                    </label>

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
                                ? 'Saving...'
                                : 'Save Settlement'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}