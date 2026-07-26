import {
    useEffect,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import type {
    Customer,
    CustomerInput,
    CustomerType,
} from '../../types/customer';

interface CustomerFormModalProps {
    customer: Customer | null;
    isOpen: boolean;
    isSubmitting: boolean;
    errorMessage: string;
    onClose: () => void;

    onSubmit: (
        values: CustomerInput,
    ) => void;
}

const emptyValues: CustomerInput = {
    name: '',
    mobile: '',
    secondary_mobile: '',
    email: '',
    address: '',
    customer_type: 'retail',
    credit_limit: 0,
    notes: '',
    is_active: true,
};

function parseCustomerType(
    value: string,
): CustomerType {
    switch (value) {
        case 'wholesale':
            return 'wholesale';

        default:
            return 'retail';
    }
}

export default function CustomerFormModal({
    customer,
    isOpen,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: CustomerFormModalProps) {
    const [
        values,
        setValues,
    ] = useState<CustomerInput>({
        ...emptyValues,
    });

    const [
        localError,
        setLocalError,
    ] = useState('');

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (customer) {
            setValues({
                name:
                    customer.name,

                mobile:
                    customer.mobile
                    ?? '',

                secondary_mobile:
                    customer
                        .secondary_mobile
                    ?? '',

                email:
                    customer.email
                    ?? '',

                address:
                    customer.address
                    ?? '',

                customer_type:
                    customer.customer_type,

                credit_limit:
                    customer.credit_limit,

                notes:
                    customer.notes
                    ?? '',

                is_active:
                    customer.is_active,
            });
        } else {
            setValues({
                ...emptyValues,
            });
        }

        setLocalError('');
    }, [
        customer,
        isOpen,
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

    if (!isOpen) {
        return null;
    }

    const updateValue = <
        Key extends keyof CustomerInput,
    >(
        key: Key,
        value: CustomerInput[Key],
    ): void => {
        setValues(
            (current) => ({
                ...current,
                [key]: value,
            }),
        );

        setLocalError('');
    };

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        const customerName =
            values.name.trim();

        const creditLimit =
            Number(
                values.credit_limit,
            );

        if (!customerName) {
            setLocalError(
                'Customer name is required.',
            );

            return;
        }

        if (
            !Number.isFinite(
                creditLimit,
            )
            || creditLimit < 0
        ) {
            setLocalError(
                'Enter a valid credit limit.',
            );

            return;
        }

        onSubmit({
            ...values,

            name:
                customerName,

            mobile:
                values.mobile.trim(),

            secondary_mobile:
                values
                    .secondary_mobile
                    .trim(),

            email:
                values.email.trim(),

            address:
                values.address.trim(),

            notes:
                values.notes.trim(),

            credit_limit:
                creditLimit,
        });
    };

    return (
        <div className="modal-backdrop">
            <section
                className="customer-form-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="customer-form-title"
            >
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Customer
                        </span>

                        <h2 id="customer-form-title">
                            {customer
                                ? 'Edit Customer'
                                : 'Add Customer'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="modal-close-button"
                        disabled={isSubmitting}
                        aria-label="Close customer form"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="customer-form"
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

                    <div className="customer-form-grid">
                        <label>
                            <span>
                                Customer Name *
                            </span>

                            <input
                                type="text"
                                value={values.name}
                                maxLength={160}
                                autoFocus
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'name',
                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label>
                            <span>Mobile</span>

                            <input
                                type="tel"
                                value={values.mobile}
                                maxLength={30}
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'mobile',
                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label>
                            <span>
                                Secondary Mobile
                            </span>

                            <input
                                type="tel"
                                value={
                                    values
                                        .secondary_mobile
                                }
                                maxLength={30}
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'secondary_mobile',
                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label>
                            <span>Email</span>

                            <input
                                type="email"
                                value={values.email}
                                maxLength={160}
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'email',
                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label>
                            <span>
                                Customer Type
                            </span>

                            <select
                                value={
                                    values
                                        .customer_type
                                }
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'customer_type',

                                        parseCustomerType(
                                            event
                                                .target
                                                .value,
                                        ),
                                    );
                                }}
                            >
                                <option value="retail">
                                    Retail
                                </option>

                                <option value="wholesale">
                                    Wholesale
                                </option>
                            </select>
                        </label>

                        <label>
                            <span>
                                Credit Limit
                            </span>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                    values
                                        .credit_limit
                                }
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'credit_limit',

                                        Number(
                                            event
                                                .target
                                                .value,
                                        ),
                                    );
                                }}
                            />

                            <small>
                                Enter 0 for no fixed
                                credit limit.
                            </small>
                        </label>

                        <label className="customer-wide-field">
                            <span>Address</span>

                            <textarea
                                rows={2}
                                maxLength={1500}
                                value={values.address}
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'address',
                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label className="customer-wide-field">
                            <span>Notes</span>

                            <textarea
                                rows={2}
                                maxLength={1500}
                                value={values.notes}
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'notes',
                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label className="customer-active-field">
                            <input
                                type="checkbox"
                                checked={
                                    values.is_active
                                }
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'is_active',
                                        event
                                            .target
                                            .checked,
                                    );
                                }}
                            />

                            <span>
                                Customer account is active
                            </span>
                        </label>
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
                                ? 'Saving...'
                                : customer
                                    ? 'Update Customer'
                                    : 'Add Customer'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}