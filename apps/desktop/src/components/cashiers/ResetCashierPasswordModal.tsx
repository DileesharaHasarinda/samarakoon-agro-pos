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

const resetCashierPasswordModalStyles = `
    #sapo-reset-cashier-password-modal,
    #sapo-reset-cashier-password-modal *,
    #sapo-reset-cashier-password-modal *::before,
    #sapo-reset-cashier-password-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-reset-cashier-password-modal {
        --rcpm-green-800: #166534;
        --rcpm-green-700: #15803d;
        --rcpm-green-50: #f0fdf4;
        --rcpm-red-700: #b91c1c;
        --rcpm-red-100: #fee2e2;
        --rcpm-red-50: #fef2f2;
        --rcpm-amber-700: #b45309;
        --rcpm-amber-100: #fde68a;
        --rcpm-amber-50: #fffbeb;
        --rcpm-text: #111827;
        --rcpm-text-secondary: #1f2937;
        --rcpm-muted: #6b7280;
        --rcpm-border: #e5e7eb;
        --rcpm-border-strong: #d1d5db;
        --rcpm-background: #f9fafb;
        --rcpm-white: #ffffff;
        --rcpm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        inset: 0 !important;
        z-index: 1100 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        height: 100% !important;
        padding: 24px !important;
        margin: 0 !important;
        background: rgba(15, 23, 42, 0.42) !important;
        -webkit-backdrop-filter: blur(6px) saturate(120%) !important;
        backdrop-filter: blur(6px) saturate(120%) !important;
        font-family: var(--rcpm-font) !important;
        color: var(--rcpm-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }

    #sapo-reset-cashier-password-modal h2,
    #sapo-reset-cashier-password-modal p,
    #sapo-reset-cashier-password-modal span,
    #sapo-reset-cashier-password-modal strong,
    #sapo-reset-cashier-password-modal small,
    #sapo-reset-cashier-password-modal label,
    #sapo-reset-cashier-password-modal button,
    #sapo-reset-cashier-password-modal input {
        font-family: var(--rcpm-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-reset-cashier-password-modal h2,
    #sapo-reset-cashier-password-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Modal shell ---------- */
    #sapo-reset-cashier-password-modal .rcpm-modal {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 520px !important;
        max-height: calc(100vh - 48px) !important;
        max-height: calc(100dvh - 48px) !important;
        margin: 0 !important;
        padding: 0 !important;
        background: var(--rcpm-white) !important;
        border: 1px solid rgba(229, 231, 235, 0.8) !important;
        border-radius: 14px !important;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.22) !important;
        overflow: hidden !important;
        animation: rcpm-pop-in 0.15s ease-out !important;
    }

    @keyframes rcpm-pop-in {
        from {
            opacity: 0;
            transform: scale(0.97) translateY(4px);
        }

        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }

    /* ---------- Header ---------- */
    #sapo-reset-cashier-password-modal .rcpm-header {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 16px !important;
        padding: 20px 24px !important;
        margin: 0 !important;
        background: var(--rcpm-white) !important;
        border-bottom: 1px solid var(--rcpm-border) !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-header-content {
        min-width: 0 !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-kicker {
        display: inline-block !important;
        margin: 0 0 4px 0 !important;
        padding: 0 !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1.4 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--rcpm-green-700) !important;
        background: transparent !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-header h2 {
        margin: 0 !important;
        padding: 0 !important;
        font-size: 18px !important;
        font-weight: 700 !important;
        line-height: 1.35 !important;
        color: var(--rcpm-text) !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-cashier-name {
        margin-top: 4px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        color: var(--rcpm-muted) !important;
        overflow-wrap: anywhere !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-close-button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 34px !important;
        height: 34px !important;
        min-width: 34px !important;
        flex-shrink: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        font-size: 20px !important;
        font-weight: 400 !important;
        line-height: 1 !important;
        color: var(--rcpm-muted) !important;
        background: var(--rcpm-background) !important;
        border: 1px solid var(--rcpm-border) !important;
        border-radius: 9px !important;
        outline: none !important;
        cursor: pointer !important;
        transition:
            background 0.15s ease,
            border-color 0.15s ease,
            color 0.15s ease !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-close-button:hover:not(:disabled) {
        color: var(--rcpm-text) !important;
        background: #f1f5f9 !important;
        border-color: var(--rcpm-border-strong) !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-close-button:focus-visible {
        border-color: var(--rcpm-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-close-button:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Form shell ---------- */
    #sapo-reset-cashier-password-modal .rcpm-form {
        display: flex !important;
        flex-direction: column !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        background: var(--rcpm-background) !important;
    }

    /* ---------- Scrollable form body ---------- */
    #sapo-reset-cashier-password-modal .rcpm-form-body {
        display: flex !important;
        flex-direction: column !important;
        gap: 18px !important;
        min-height: 0 !important;
        padding: 22px 24px !important;
        margin: 0 !important;
        overflow-y: auto !important;
        background: var(--rcpm-background) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--rcpm-border-strong) transparent !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-form-body::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-form-body::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-form-body::-webkit-scrollbar-thumb {
        background: var(--rcpm-border-strong) !important;
        border-radius: 8px !important;
    }

    /* ---------- Alert ---------- */
    #sapo-reset-cashier-password-modal .rcpm-alert {
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 12px 14px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: 1.45 !important;
        color: var(--rcpm-red-700) !important;
        background: var(--rcpm-red-50) !important;
        border: 1px solid #fecaca !important;
        border-radius: 8px !important;
    }

    /* ---------- Password fields ---------- */
    #sapo-reset-cashier-password-modal .rcpm-fields {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        width: 100% !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-field-label {
        display: inline-block !important;
        margin: 0 !important;
        padding: 0 !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        line-height: 1.45 !important;
        color: var(--rcpm-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-required {
        color: var(--rcpm-red-700) !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-field input {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        height: auto !important;
        margin: 0 !important;
        padding: 10px 12px !important;
        font-size: 13.5px !important;
        font-weight: 400 !important;
        line-height: 1.5 !important;
        color: var(--rcpm-text-secondary) !important;
        background: var(--rcpm-white) !important;
        border: 1px solid var(--rcpm-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        box-shadow: none !important;
        transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-field input::placeholder {
        color: #9ca3af !important;
        opacity: 1 !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-field input:hover:not(:disabled) {
        border-color: #9ca3af !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-field input:focus {
        border-color: var(--rcpm-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-field input:disabled {
        color: var(--rcpm-muted) !important;
        background: #f3f4f6 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Password requirements ---------- */
    #sapo-reset-cashier-password-modal .rcpm-password-requirement {
        display: flex !important;
        align-items: flex-start !important;
        gap: 8px !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 10px 12px !important;
        font-size: 12.5px !important;
        font-weight: 500 !important;
        line-height: 1.45 !important;
        color: var(--rcpm-muted) !important;
        background: var(--rcpm-white) !important;
        border: 1px solid var(--rcpm-border) !important;
        border-radius: 8px !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-requirement-icon {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 18px !important;
        height: 18px !important;
        min-width: 18px !important;
        margin-top: 1px !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        color: var(--rcpm-green-700) !important;
        background: var(--rcpm-green-50) !important;
        border-radius: 50% !important;
    }

    /* ---------- Security warning ---------- */
    #sapo-reset-cashier-password-modal .rcpm-security-note {
        display: flex !important;
        align-items: flex-start !important;
        gap: 10px !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 12px 14px !important;
        color: var(--rcpm-amber-700) !important;
        background: var(--rcpm-amber-50) !important;
        border: 1px solid var(--rcpm-amber-100) !important;
        border-radius: 8px !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-security-icon {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 20px !important;
        height: 20px !important;
        min-width: 20px !important;
        margin-top: 1px !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        color: var(--rcpm-amber-700) !important;
        background: #fef3c7 !important;
        border-radius: 50% !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-security-text {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        font-size: 12.5px !important;
        font-weight: 500 !important;
        line-height: 1.5 !important;
        color: var(--rcpm-amber-700) !important;
        background: transparent !important;
    }

    /* ---------- Footer actions ---------- */
    #sapo-reset-cashier-password-modal .rcpm-actions {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 16px 24px !important;
        background: var(--rcpm-white) !important;
        border-top: 1px solid var(--rcpm-border) !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-secondary-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 40px !important;
        margin: 0 !important;
        padding: 10px 20px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        line-height: 1.4 !important;
        color: #374151 !important;
        background: var(--rcpm-white) !important;
        border: 1px solid var(--rcpm-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        cursor: pointer !important;
        transition:
            background 0.15s ease,
            border-color 0.15s ease,
            box-shadow 0.15s ease !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-secondary-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        border-color: #9ca3af !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-primary-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 40px !important;
        margin: 0 !important;
        padding: 10px 22px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        line-height: 1.4 !important;
        color: #ffffff !important;
        background: var(--rcpm-green-700) !important;
        border: 1px solid var(--rcpm-green-700) !important;
        border-radius: 8px !important;
        outline: none !important;
        cursor: pointer !important;
        transition:
            background 0.15s ease,
            border-color 0.15s ease,
            box-shadow 0.15s ease !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-primary-button:hover:not(:disabled) {
        background: var(--rcpm-green-800) !important;
        border-color: var(--rcpm-green-800) !important;
    }

    #sapo-reset-cashier-password-modal .rcpm-secondary-button:focus-visible,
    #sapo-reset-cashier-password-modal .rcpm-primary-button:focus-visible {
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15) !important;
    }

    #sapo-reset-cashier-password-modal button:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 640px) {
        #sapo-reset-cashier-password-modal {
            align-items: center !important;
            padding: 12px !important;
        }

        #sapo-reset-cashier-password-modal .rcpm-modal {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
            border-radius: 12px !important;
        }

        #sapo-reset-cashier-password-modal .rcpm-header,
        #sapo-reset-cashier-password-modal .rcpm-form-body,
        #sapo-reset-cashier-password-modal .rcpm-actions {
            padding-left: 18px !important;
            padding-right: 18px !important;
        }

        #sapo-reset-cashier-password-modal .rcpm-actions {
            flex-direction: column-reverse !important;
            align-items: stretch !important;
        }

        #sapo-reset-cashier-password-modal .rcpm-secondary-button,
        #sapo-reset-cashier-password-modal .rcpm-primary-button {
            width: 100% !important;
        }
    }
`;

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
        if (!cashier) {
            return;
        }

        setPassword('');
        setConfirmation('');
        setLocalError('');
    }, [cashier]);

    useEffect(() => {
        if (!cashier) {
            return;
        }

        const previousBodyOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            'hidden';

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
            document.body.style.overflow =
                previousBodyOverflow;

            window.removeEventListener(
                'keydown',
                handleKeyDown,
            );
        };
    }, [
        cashier,
        isSubmitting,
        onClose,
    ]);

    if (!cashier) {
        return null;
    }

    const displayedError =
        localError || errorMessage;

    const handlePasswordChange = (
        value: string,
    ): void => {
        setPassword(value);
        setLocalError('');
    };

    const handleConfirmationChange = (
        value: string,
    ): void => {
        setConfirmation(value);
        setLocalError('');
    };

    const handleSubmit = (
        event:
            FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        setLocalError('');

        if (!password) {
            setLocalError(
                'New password is required.',
            );

            return;
        }

        if (password.length < 8) {
            setLocalError(
                'Password must contain at least 8 characters.',
            );

            return;
        }

        if (!confirmation) {
            setLocalError(
                'Password confirmation is required.',
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
        <div
            id="sapo-reset-cashier-password-modal"
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
            <style>
                {resetCashierPasswordModalStyles}
            </style>

            <section
                className="rcpm-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reset-cashier-password-title"
                aria-describedby={
                    displayedError
                        ? 'reset-cashier-password-error'
                        : undefined
                }
                onMouseDown={(event) => {
                    event.stopPropagation();
                }}
            >
                <header className="rcpm-header">
                    <div className="rcpm-header-content">
                        <span className="rcpm-kicker">
                            Account Security
                        </span>

                        <h2 id="reset-cashier-password-title">
                            Reset Password
                        </h2>

                        <p className="rcpm-cashier-name">
                            Cashier: {cashier.name}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="rcpm-close-button"
                        aria-label="Close password reset modal"
                        title="Close"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="rcpm-form"
                    onSubmit={handleSubmit}
                    noValidate
                >
                    <div className="rcpm-form-body">
                        {displayedError && (
                            <div
                                id="reset-cashier-password-error"
                                className="rcpm-alert"
                                role="alert"
                                aria-live="polite"
                            >
                                {displayedError}
                            </div>
                        )}

                        <div className="rcpm-fields">
                            <label className="rcpm-field">
                                <span className="rcpm-field-label">
                                    New Password{' '}
                                    <span className="rcpm-required">
                                        *
                                    </span>
                                </span>

                                <input
                                    type="password"
                                    value={password}
                                    minLength={8}
                                    maxLength={255}
                                    autoFocus
                                    autoComplete="new-password"
                                    disabled={isSubmitting}
                                    placeholder="Enter at least 8 characters"
                                    onChange={(event) => {
                                        handlePasswordChange(
                                            event.target.value,
                                        );
                                    }}
                                />
                            </label>

                            <label className="rcpm-field">
                                <span className="rcpm-field-label">
                                    Confirm Password{' '}
                                    <span className="rcpm-required">
                                        *
                                    </span>
                                </span>

                                <input
                                    type="password"
                                    value={confirmation}
                                    minLength={8}
                                    maxLength={255}
                                    autoComplete="new-password"
                                    disabled={isSubmitting}
                                    placeholder="Re-enter the new password"
                                    onChange={(event) => {
                                        handleConfirmationChange(
                                            event.target.value,
                                        );
                                    }}
                                />
                            </label>
                        </div>

                        <div className="rcpm-password-requirement">
                            <span
                                className="rcpm-requirement-icon"
                                aria-hidden="true"
                            >
                                ✓
                            </span>

                            <span>
                                The new password must contain
                                at least 8 characters.
                            </span>
                        </div>

                        <div className="rcpm-security-note">
                            <span
                                className="rcpm-security-icon"
                                aria-hidden="true"
                            >
                                !
                            </span>

                            <small className="rcpm-security-text">
                                Existing login sessions for this
                                cashier will be signed out after
                                the password is reset.
                            </small>
                        </div>
                    </div>

                    <footer className="rcpm-actions">
                        <button
                            type="button"
                            className="rcpm-secondary-button"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="rcpm-primary-button"
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