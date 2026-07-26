import {
    useEffect,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

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
        values: SupplierPaymentInput,
    ) => void;
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

export default function RecordSupplierPaymentModal({
    purchase,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: RecordSupplierPaymentModalProps) {
    const [
        amount,
        setAmount,
    ] = useState(0);

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

    useEffect(() => {
        if (!purchase) {
            return;
        }

        setAmount(
            purchase.due_amount,
        );

        setPaymentMethod('cash');
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
            amount <= 0
            || amount > purchase.due_amount
        ) {
            setLocalError(
                `Enter an amount between 0.01 and ${purchase.due_amount.toFixed(2)}.`,
            );

            return;
        }

        onSubmit({
            amount,
            payment_method:
                paymentMethod,

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
                            Supplier payment
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
                            Outstanding Supplier Due
                        </span>

                        <strong>
                            LKR{' '}
                            {purchase
                                .due_amount
                                .toFixed(2)}
                        </strong>
                    </div>

                    <label>
                        <span>
                            Payment Amount
                        </span>

                        <input
                            type="number"
                            min="0.01"
                            max={purchase.due_amount}
                            step="0.01"
                            value={amount}
                            disabled={isSubmitting}
                            onChange={(event) => {
                                setAmount(
                                    Number(
                                        event.target.value,
                                    ),
                                );

                                setLocalError('');
                            }}
                        />
                    </label>

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
                                ? 'Recording...'
                                : 'Record Payment'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}