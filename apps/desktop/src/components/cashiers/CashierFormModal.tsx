import {
    useEffect,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import type {
    Cashier,
    CashierInput,
    CashierUpdateInput,
} from '../../types/cashier';

interface CashierFormModalProps {
    cashier: Cashier | null;
    isOpen: boolean;
    isSubmitting: boolean;
    errorMessage: string;
    onClose: () => void;

    onCreate: (
        values: CashierInput,
    ) => void;

    onUpdate: (
        values: CashierUpdateInput,
    ) => void;
}

const emptyValues:
    CashierInput = {
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    is_active: true,
};

export default function CashierFormModal({
    cashier,
    isOpen,
    isSubmitting,
    errorMessage,
    onClose,
    onCreate,
    onUpdate,
}: CashierFormModalProps) {
    const [
        values,
        setValues,
    ] = useState<CashierInput>({
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

        if (cashier) {
            setValues({
                name:
                    cashier.name,

                username:
                    cashier.username,

                email:
                    cashier.email,

                phone:
                    cashier.phone
                    ?? '',

                password: '',

                password_confirmation:
                    '',

                is_active:
                    cashier.is_active,
            });
        } else {
            setValues({
                ...emptyValues,
            });
        }

        setLocalError('');
    }, [
        cashier,
        isOpen,
    ]);

    if (!isOpen) {
        return null;
    }

    const updateValue = <
        Key extends keyof CashierInput,
    >(
        key: Key,
        value: CashierInput[Key],
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
        event:
            FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (!values.name.trim()) {
            setLocalError(
                'Cashier name is required.',
            );

            return;
        }

        if (!values.username.trim()) {
            setLocalError(
                'Username is required.',
            );

            return;
        }

        if (!values.email.trim()) {
            setLocalError(
                'Email is required.',
            );

            return;
        }

        if (!cashier) {
            if (
                values.password.length
                < 8
            ) {
                setLocalError(
                    'Password must contain at least 8 characters.',
                );

                return;
            }

            if (
                values.password
                !== values
                    .password_confirmation
            ) {
                setLocalError(
                    'Password confirmation does not match.',
                );

                return;
            }

            onCreate({
                ...values,

                name:
                    values.name.trim(),

                username:
                    values
                        .username
                        .trim(),

                email:
                    values.email.trim(),

                phone:
                    values.phone.trim(),
            });

            return;
        }

        onUpdate({
            name:
                values.name.trim(),

            username:
                values
                    .username
                    .trim(),

            email:
                values.email.trim(),

            phone:
                values.phone.trim(),

            is_active:
                values.is_active,
        });
    };

    return (
        <div className="modal-backdrop">
            <section
                className="cashier-form-modal"
                role="dialog"
                aria-modal="true"
            >
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Staff account
                        </span>

                        <h2>
                            {cashier
                                ? 'Edit Cashier'
                                : 'Add Cashier'}
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
                    className="cashier-form"
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

                    <div className="cashier-form-grid">
                        <label>
                            <span>
                                Cashier Name *
                            </span>

                            <input
                                value={values.name}
                                maxLength={160}
                                autoFocus
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'name',
                                        event.target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label>
                            <span>
                                Username *
                            </span>

                            <input
                                value={
                                    values.username
                                }
                                maxLength={80}
                                autoComplete="off"
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'username',

                                        event.target
                                            .value
                                            .toLowerCase(),
                                    );
                                }}
                            />
                        </label>

                        <label>
                            <span>
                                Email *
                            </span>

                            <input
                                type="email"
                                value={values.email}
                                maxLength={160}
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'email',
                                        event.target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label>
                            <span>Phone</span>

                            <input
                                type="tel"
                                value={values.phone}
                                maxLength={30}
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'phone',
                                        event.target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        {!cashier && (
                            <>
                                <label>
                                    <span>
                                        Password *
                                    </span>

                                    <input
                                        type="password"
                                        value={
                                            values
                                                .password
                                        }
                                        autoComplete="new-password"
                                        disabled={
                                            isSubmitting
                                        }
                                        onChange={(event) => {
                                            updateValue(
                                                'password',

                                                event.target
                                                    .value,
                                            );
                                        }}
                                    />
                                </label>

                                <label>
                                    <span>
                                        Confirm Password *
                                    </span>

                                    <input
                                        type="password"
                                        value={
                                            values
                                                .password_confirmation
                                        }
                                        autoComplete="new-password"
                                        disabled={
                                            isSubmitting
                                        }
                                        onChange={(event) => {
                                            updateValue(
                                                'password_confirmation',

                                                event.target
                                                    .value,
                                            );
                                        }}
                                    />
                                </label>
                            </>
                        )}

                        <label className="cashier-active-field">
                            <input
                                type="checkbox"
                                checked={
                                    values.is_active
                                }
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'is_active',
                                        event.target
                                            .checked,
                                    );
                                }}
                            />

                            <span>
                                Cashier account is active
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
                                : cashier
                                    ? 'Update Cashier'
                                    : 'Add Cashier'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}