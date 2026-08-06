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

const cashierFormModalStyles = `
    #sapo-cashier-form-modal,
    #sapo-cashier-form-modal *,
    #sapo-cashier-form-modal *::before,
    #sapo-cashier-form-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-cashier-form-modal {
        --cfm-green-800: #166534;
        --cfm-green-700: #15803d;
        --cfm-green-50: #f0fdf4;
        --cfm-red: #dc2626;
        --cfm-red-light: #fef2f2;
        --cfm-text: #111827;
        --cfm-text-secondary: #1f2937;
        --cfm-muted: #6b7280;
        --cfm-border: #e5e7eb;
        --cfm-border-strong: #d1d5db;
        --cfm-bg: #f9fafb;
        --cfm-white: #ffffff;
        --cfm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        inset: 0 !important;
        z-index: 1000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        margin: 0 !important;
        background: rgba(15, 23, 42, 0.42) !important;
        -webkit-backdrop-filter: blur(6px) saturate(120%) !important;
        backdrop-filter: blur(6px) saturate(120%) !important;
        font-family: var(--cfm-font) !important;
        color: var(--cfm-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }

    #sapo-cashier-form-modal h2,
    #sapo-cashier-form-modal p,
    #sapo-cashier-form-modal span,
    #sapo-cashier-form-modal strong,
    #sapo-cashier-form-modal label,
    #sapo-cashier-form-modal button,
    #sapo-cashier-form-modal input {
        font-family: var(--cfm-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-cashier-form-modal h2,
    #sapo-cashier-form-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Modal shell ---------- */
    #sapo-cashier-form-modal .cfm-modal {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 620px !important;
        max-height: calc(100vh - 48px) !important;
        max-height: calc(100dvh - 48px) !important;
        background: var(--cfm-white) !important;
        border-radius: 14px !important;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.22) !important;
        overflow: hidden !important;
        animation: cfm-pop-in 0.15s ease-out !important;
    }

    @keyframes cfm-pop-in {
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
    #sapo-cashier-form-modal .cfm-header {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 20px 24px !important;
        background: var(--cfm-white) !important;
        border-bottom: 1px solid var(--cfm-border) !important;
    }

    #sapo-cashier-form-modal .cfm-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--cfm-green-700) !important;
        margin-bottom: 4px !important;
        background: transparent !important;
    }

    #sapo-cashier-form-modal .cfm-header h2 {
        font-size: 18px !important;
        font-weight: 700 !important;
        color: var(--cfm-text) !important;
    }

    #sapo-cashier-form-modal .cfm-close-button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 34px !important;
        height: 34px !important;
        flex-shrink: 0 !important;
        font-size: 20px !important;
        line-height: 1 !important;
        color: var(--cfm-muted) !important;
        background: var(--cfm-bg) !important;
        border: 1px solid var(--cfm-border) !important;
        border-radius: 9px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-cashier-form-modal .cfm-close-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        color: var(--cfm-text) !important;
    }

    #sapo-cashier-form-modal .cfm-close-button:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Scrollable form body ---------- */
    #sapo-cashier-form-modal .cfm-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 18px !important;
        min-height: 0 !important;
        padding: 22px 24px !important;
        overflow-y: auto !important;
        background: var(--cfm-bg) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--cfm-border-strong) transparent !important;
    }

    #sapo-cashier-form-modal .cfm-form::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-cashier-form-modal .cfm-form::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-cashier-form-modal .cfm-form::-webkit-scrollbar-thumb {
        background: var(--cfm-border-strong) !important;
        border-radius: 8px !important;
    }

    /* ---------- Alert ---------- */
    #sapo-cashier-form-modal .cfm-alert {
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        background: var(--cfm-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Field grid ---------- */
    #sapo-cashier-form-modal .cfm-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 16px 18px !important;
    }

    #sapo-cashier-form-modal .cfm-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        min-width: 0 !important;
    }

    #sapo-cashier-form-modal .cfm-field-label {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--cfm-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-cashier-form-modal .cfm-field input {
        width: 100% !important;
        padding: 9px 12px !important;
        font-size: 13.5px !important;
        color: var(--cfm-text-secondary) !important;
        background: var(--cfm-white) !important;
        border: 1px solid var(--cfm-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-cashier-form-modal .cfm-field input:focus {
        border-color: var(--cfm-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-cashier-form-modal .cfm-field input:disabled {
        background: var(--cfm-bg) !important;
        color: var(--cfm-muted) !important;
        cursor: not-allowed !important;
    }

    /* ---------- Active toggle row ---------- */
    #sapo-cashier-form-modal .cfm-active-field {
        grid-column: 1 / -1 !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 12px 14px !important;
        background: var(--cfm-white) !important;
        border: 1px solid var(--cfm-border-strong) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
    }

    #sapo-cashier-form-modal .cfm-active-field input {
        width: 17px !important;
        height: 17px !important;
        min-width: 17px !important;
        margin: 0 !important;
        accent-color: var(--cfm-green-700) !important;
        cursor: pointer !important;
    }

    #sapo-cashier-form-modal .cfm-active-field span {
        font-size: 13px !important;
        font-weight: 600 !important;
        color: var(--cfm-text-secondary) !important;
        background: transparent !important;
    }

    /* ---------- Footer actions ---------- */
    #sapo-cashier-form-modal .cfm-actions {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        padding: 16px 24px !important;
        background: var(--cfm-white) !important;
        border-top: 1px solid var(--cfm-border) !important;
    }

    #sapo-cashier-form-modal .cfm-secondary-button {
        padding: 10px 20px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--cfm-white) !important;
        border: 1px solid var(--cfm-border-strong) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-cashier-form-modal .cfm-secondary-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        border-color: #9ca3af !important;
    }

    #sapo-cashier-form-modal .cfm-primary-button {
        padding: 10px 22px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        background: var(--cfm-green-700) !important;
        border: 1px solid var(--cfm-green-700) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease !important;
    }

    #sapo-cashier-form-modal .cfm-primary-button:hover:not(:disabled) {
        background: var(--cfm-green-800) !important;
    }

    #sapo-cashier-form-modal button:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 640px) {
        #sapo-cashier-form-modal {
            padding: 12px !important;
        }

        #sapo-cashier-form-modal .cfm-modal {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
        }

        #sapo-cashier-form-modal .cfm-header,
        #sapo-cashier-form-modal .cfm-form,
        #sapo-cashier-form-modal .cfm-actions {
            padding-left: 18px !important;
            padding-right: 18px !important;
        }

        #sapo-cashier-form-modal .cfm-grid {
            grid-template-columns: 1fr !important;
        }

        #sapo-cashier-form-modal .cfm-actions {
            flex-direction: column-reverse !important;
            align-items: stretch !important;
        }

        #sapo-cashier-form-modal .cfm-secondary-button,
        #sapo-cashier-form-modal .cfm-primary-button {
            width: 100% !important;
        }
    }
`;

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

    function updateValue<Key extends keyof CashierInput>(
        key: Key,
        value: CashierInput[Key],
    ): void {
        setValues(
            (current) => ({
                ...current,
                [key]: value,
            }),
        );

        setLocalError('');
    }

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
        <div
            id="sapo-cashier-form-modal"
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
                {cashierFormModalStyles}
            </style>

            <section
                className="cfm-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cashier-modal-title"
                onMouseDown={(event) => {
                    event.stopPropagation();
                }}
            >
                <header className="cfm-header">
                    <div>
                        <span className="cfm-kicker">
                            Staff Account
                        </span>

                        <h2 id="cashier-modal-title">
                            {cashier
                                ? 'Edit Cashier'
                                : 'Add Cashier'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="cfm-close-button"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="cfm-form"
                    onSubmit={handleSubmit}
                >
                    {(localError
                        || errorMessage) && (
                            <div
                                className="cfm-alert"
                                role="alert"
                            >
                                {localError
                                    || errorMessage}
                            </div>
                        )}

                    <div className="cfm-grid">
                        <label className="cfm-field">
                            <span className="cfm-field-label">
                                Cashier Name *
                            </span>

                            <input
                                value={values.name}
                                maxLength={160}
                                autoFocus
                                disabled={isSubmitting}
                                placeholder="Enter full name"
                                onChange={(event) => {
                                    updateValue(
                                        'name',
                                        event.target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label className="cfm-field">
                            <span className="cfm-field-label">
                                Username *
                            </span>

                            <input
                                value={
                                    values.username
                                }
                                maxLength={80}
                                autoComplete="off"
                                disabled={isSubmitting}
                                placeholder="Enter username"
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

                        <label className="cfm-field">
                            <span className="cfm-field-label">
                                Email *
                            </span>

                            <input
                                type="email"
                                value={values.email}
                                maxLength={160}
                                disabled={isSubmitting}
                                placeholder="name@example.com"
                                onChange={(event) => {
                                    updateValue(
                                        'email',
                                        event.target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label className="cfm-field">
                            <span className="cfm-field-label">
                                Phone
                            </span>

                            <input
                                type="tel"
                                value={values.phone}
                                maxLength={30}
                                disabled={isSubmitting}
                                placeholder="Enter phone number"
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
                                <label className="cfm-field">
                                    <span className="cfm-field-label">
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
                                        placeholder="At least 8 characters"
                                        onChange={(event) => {
                                            updateValue(
                                                'password',

                                                event.target
                                                    .value,
                                            );
                                        }}
                                    />
                                </label>

                                <label className="cfm-field">
                                    <span className="cfm-field-label">
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
                                        placeholder="Re-enter password"
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

                        <label className="cfm-active-field">
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

                    <footer className="cfm-actions">
                        <button
                            type="button"
                            className="cfm-secondary-button"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="cfm-primary-button"
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