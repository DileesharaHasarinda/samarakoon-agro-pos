import {
    useEffect,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import type {
    Cashier,
} from '../../types/cashier';

interface ResetCashierPasswordModalProps {
    cashier: Cashier | null;
    isSubmitting: boolean;
    errorMessage: string;
    onClose: () => void;

    onSubmit: (
        password: string,
        confirmation: string,
    ) => void;
}

export default function ResetCashierPasswordModal({
    cashier,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: ResetCashierPasswordModalProps) {
    const [
        password,
        setPassword,
    ] = useState('');

    const [
        confirmation,
        setConfirmation,
    ] = useState('');

    const [
        localError,
        setLocalError,
    ] = useState('');

    useEffect(() => {
        if (cashier) {
            setPassword('');
            setConfirmation('');
            setLocalError('');
        }
    }, [cashier]);

    if (!cashier) {
        return null;
    }

    const handleSubmit = (
        event:
            FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (password.length < 8) {
            setLocalError(
                'Password must contain at least 8 characters.',
            );

            return;
        }

        if (password !== confirmation) {
            setLocalError(
                'Password confirmation does not match.',
            );

            return;
        }

        onSubmit(
            password,
            confirmation,
        );
    };

    return (
        <div className="modal-backdrop">
            <section
                className="cashier-password-modal"
                role="dialog"
                aria-modal="true"
            >
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Account security
                        </span>

                        <h2>
                            Reset Password
                        </h2>

                        <p>
                            {cashier.name}
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
                    className="cashier-password-form"
                    onSubmit={handleSubmit}
                >
                    {(localError
                        || errorMessage) && (
                            <div className="form-alert">
                                {localError
                                    || errorMessage}
                            </div>
                        )}

                    <label>
                        <span>
                            New Password
                        </span>

                        <input
                            type="password"
                            value={password}
                            autoComplete="new-password"
                            disabled={isSubmitting}
                            onChange={(event) => {
                                setPassword(
                                    event.target.value,
                                );

                                setLocalError('');
                            }}
                        />
                    </label>

                    <label>
                        <span>
                            Confirm Password
                        </span>

                        <input
                            type="password"
                            value={confirmation}
                            autoComplete="new-password"
                            disabled={isSubmitting}
                            onChange={(event) => {
                                setConfirmation(
                                    event.target.value,
                                );

                                setLocalError('');
                            }}
                        />
                    </label>

                    <small className="password-help">
                        Existing cashier login sessions
                        will be signed out.
                    </small>

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
                                ? 'Resetting...'
                                : 'Reset Password'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}