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
    ] = useState<PosPaymentMethod>(
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
        <div className="modal-backdrop">
            <section className="due-payment-modal">
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Due collection
                        </span>

                        <h2>
                            {sale.sale_number}
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
                    className="due-payment-form"
                    onSubmit={handleSubmit}
                >
                    {(localError
                        || errorMessage) && (
                            <div className="form-alert">
                                {localError
                                    || errorMessage}
                            </div>
                        )}

                    <section className="due-customer-summary">
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

                    <label>
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

                    <label>
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