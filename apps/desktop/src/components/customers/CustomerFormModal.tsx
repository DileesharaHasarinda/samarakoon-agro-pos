import {
    useEffect,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import { createPortal } from 'react-dom';

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

const customerFormModalStyles = `
    #sapo-customer-form-modal,
    #sapo-customer-form-modal *,
    #sapo-customer-form-modal *::before,
    #sapo-customer-form-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-customer-form-modal {
        --cfm-green-900: #14532d;
        --cfm-green-800: #166534;
        --cfm-green-700: #15803d;
        --cfm-green-100: #dcfce7;
        --cfm-green-50: #f0fdf4;
        --cfm-red: #dc2626;
        --cfm-red-light: #fef2f2;
        --cfm-text: #0f172a;
        --cfm-text-secondary: #334155;
        --cfm-muted: #64748b;
        --cfm-border: #e2e8f0;
        --cfm-border-strong: #cbd5e1;
        --cfm-bg: #f8fafc;
        --cfm-white: #ffffff;
        --cfm-radius: 10px;
        --cfm-radius-sm: 6px;
        --cfm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 2147483000 !important;
        display: flex !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 0 !important;
        padding: 24px !important;
        font-family: var(--cfm-font) !important;
        background: rgba(15, 23, 42, 0.55) !important;
        backdrop-filter: blur(2px) !important;
    }

    #sapo-customer-form-modal *,
    #sapo-customer-form-modal h1,
    #sapo-customer-form-modal h2,
    #sapo-customer-form-modal h3,
    #sapo-customer-form-modal p,
    #sapo-customer-form-modal span,
    #sapo-customer-form-modal strong,
    #sapo-customer-form-modal small,
    #sapo-customer-form-modal label,
    #sapo-customer-form-modal input,
    #sapo-customer-form-modal select,
    #sapo-customer-form-modal textarea,
    #sapo-customer-form-modal button {
        font-family: var(--cfm-font) !important;
        text-transform: none !important;
        letter-spacing: normal !important;
    }

    #sapo-customer-form-modal h1,
    #sapo-customer-form-modal h2,
    #sapo-customer-form-modal h3,
    #sapo-customer-form-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Panel ---------- */

    #sapo-customer-form-modal
    .cfm-panel {
        display: flex !important;
        width: 100% !important;
        max-width: 720px !important;
        height: 100% !important;
        max-height: 88vh !important;
        flex-direction: column !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: var(--cfm-white) !important;
        border-radius: var(--cfm-radius) !important;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.28) !important;
    }

    /* ---------- Header ---------- */

    #sapo-customer-form-modal
    .cfm-header {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 16px !important;
        margin: 0 !important;
        padding: 18px 22px !important;
        background: var(--cfm-white) !important;
        border-bottom: 1px solid var(--cfm-border) !important;
    }

    #sapo-customer-form-modal
    .cfm-header-copy {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 3px !important;
    }

    #sapo-customer-form-modal
    .cfm-kicker {
        display: block !important;
        color: var(--cfm-green-700) !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        letter-spacing: 0.06em !important;
        text-transform: uppercase !important;
    }

    #sapo-customer-form-modal
    .cfm-header-copy h2 {
        color: var(--cfm-text) !important;
        font-size: 18px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        letter-spacing: -0.01em !important;
    }

    #sapo-customer-form-modal
    .cfm-close-button {
        display: grid !important;
        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;
        flex-shrink: 0 !important;
        place-items: center !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--cfm-muted) !important;
        font-size: 20px !important;
        font-weight: 400 !important;
        line-height: 1 !important;
        appearance: none !important;
        background: var(--cfm-bg) !important;
        border: 1px solid var(--cfm-border) !important;
        border-radius: var(--cfm-radius-sm) !important;
        cursor: pointer !important;
        transition: background-color 120ms ease, color 120ms ease !important;
    }

    #sapo-customer-form-modal
    .cfm-close-button:hover:not(:disabled) {
        color: var(--cfm-text) !important;
        background: #eef2f6 !important;
    }

    #sapo-customer-form-modal
    .cfm-close-button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Form / scrollable body ---------- */

    #sapo-customer-form-modal
    .cfm-form {
        display: flex !important;
        flex: 1 1 auto !important;
        min-height: 0 !important;
        flex-direction: column !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-customer-form-modal
    .cfm-body {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior-y: contain !important;
        scrollbar-gutter: stable !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--cfm-border-strong) transparent !important;
    }

    #sapo-customer-form-modal
    .cfm-body::-webkit-scrollbar {
        width: 10px !important;
    }

    #sapo-customer-form-modal
    .cfm-body::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-customer-form-modal
    .cfm-body::-webkit-scrollbar-thumb {
        background: var(--cfm-border-strong) !important;
        border: 2px solid transparent !important;
        border-radius: 999px !important;
        background-clip: content-box !important;
    }

    #sapo-customer-form-modal
    .cfm-body-inner {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        padding: 20px 22px !important;
    }

    /* ---------- Alert ---------- */

    #sapo-customer-form-modal
    .cfm-alert {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 10px 14px !important;
        color: var(--cfm-red) !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.4 !important;
        background: var(--cfm-red-light) !important;
        border: 1px solid #fecaca !important;
        border-radius: var(--cfm-radius-sm) !important;
    }

    /* ---------- Field grid ---------- */

    #sapo-customer-form-modal
    .cfm-grid {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 14px 16px !important;
    }

    #sapo-customer-form-modal
    .cfm-field {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 6px !important;
    }

    #sapo-customer-form-modal
    .cfm-field-wide {
        grid-column: 1 / -1 !important;
    }

    #sapo-customer-form-modal
    .cfm-field > span {
        color: var(--cfm-text-secondary) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
    }

    #sapo-customer-form-modal
    .cfm-field input,
    #sapo-customer-form-modal
    .cfm-field select,
    #sapo-customer-form-modal
    .cfm-field textarea {
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 12px !important;
        color: var(--cfm-text) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: normal !important;
        outline: none !important;
        background: var(--cfm-white) !important;
        border: 1px solid var(--cfm-border-strong) !important;
        border-radius: var(--cfm-radius-sm) !important;
        box-shadow: none !important;
        appearance: auto !important;
    }

    #sapo-customer-form-modal
    .cfm-field input,
    #sapo-customer-form-modal
    .cfm-field select {
        height: 38px !important;
        min-height: 38px !important;
    }

    #sapo-customer-form-modal
    .cfm-field select {
        cursor: pointer !important;
    }

    #sapo-customer-form-modal
    .cfm-field textarea {
        padding: 9px 12px !important;
        line-height: 1.5 !important;
        resize: vertical !important;
        min-height: 64px !important;
    }

    #sapo-customer-form-modal
    .cfm-field input::placeholder,
    #sapo-customer-form-modal
    .cfm-field textarea::placeholder {
        color: #94a3b8 !important;
        opacity: 1 !important;
    }

    #sapo-customer-form-modal
    .cfm-field input:disabled,
    #sapo-customer-form-modal
    .cfm-field select:disabled,
    #sapo-customer-form-modal
    .cfm-field textarea:disabled {
        color: var(--cfm-muted) !important;
        background: var(--cfm-bg) !important;
        cursor: not-allowed !important;
    }

    #sapo-customer-form-modal
    .cfm-field input:focus,
    #sapo-customer-form-modal
    .cfm-field select:focus,
    #sapo-customer-form-modal
    .cfm-field textarea:focus {
        border-color: var(--cfm-green-700) !important;
        box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.12) !important;
    }

    #sapo-customer-form-modal
    .cfm-field small {
        color: var(--cfm-muted) !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        line-height: 1.3 !important;
    }

    /* ---------- Active checkbox row ---------- */

    #sapo-customer-form-modal
    .cfm-active-field {
        grid-column: 1 / -1 !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        gap: 9px !important;
        padding: 11px 14px !important;
        background: var(--cfm-bg) !important;
        border: 1px solid var(--cfm-border) !important;
        border-radius: var(--cfm-radius-sm) !important;
        cursor: pointer !important;
    }

    #sapo-customer-form-modal
    .cfm-active-field input[type="checkbox"] {
        width: 16px !important;
        height: 16px !important;
        min-width: 16px !important;
        margin: 0 !important;
        accent-color: var(--cfm-green-700) !important;
        cursor: pointer !important;
    }

    #sapo-customer-form-modal
    .cfm-active-field span {
        color: var(--cfm-text-secondary) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
    }

    /* ---------- Footer / actions ---------- */

    #sapo-customer-form-modal
    .cfm-footer {
        display: flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        padding: 14px 22px !important;
        background: var(--cfm-white) !important;
        border-top: 1px solid var(--cfm-border) !important;
    }

    #sapo-customer-form-modal
    .cfm-button {
        display: inline-flex !important;
        min-height: 38px !important;
        min-width: 120px !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        padding: 8px 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;
        appearance: none !important;
        border-radius: var(--cfm-radius-sm) !important;
        cursor: pointer !important;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease !important;
    }

    #sapo-customer-form-modal
    .cfm-primary-button {
        color: #ffffff !important;
        background: var(--cfm-green-700) !important;
        border: 1px solid var(--cfm-green-700) !important;
    }

    #sapo-customer-form-modal
    .cfm-primary-button:hover:not(:disabled) {
        background: var(--cfm-green-800) !important;
        border-color: var(--cfm-green-800) !important;
    }

    #sapo-customer-form-modal
    .cfm-secondary-button {
        color: var(--cfm-text-secondary) !important;
        background: var(--cfm-white) !important;
        border: 1px solid var(--cfm-border-strong) !important;
    }

    #sapo-customer-form-modal
    .cfm-secondary-button:hover:not(:disabled) {
        color: var(--cfm-text) !important;
        background: var(--cfm-bg) !important;
        border-color: #94a3b8 !important;
    }

    #sapo-customer-form-modal
    .cfm-button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */

    @media (max-width: 640px) {
        #sapo-customer-form-modal {
            padding: 0 !important;
        }

        #sapo-customer-form-modal
        .cfm-panel {
            max-width: 100% !important;
            max-height: 100% !important;
            height: 100% !important;
            border-radius: 0 !important;
        }

        #sapo-customer-form-modal
        .cfm-grid {
            grid-template-columns: 1fr !important;
        }

        #sapo-customer-form-modal
        .cfm-field-wide {
            grid-column: 1 !important;
        }

        #sapo-customer-form-modal
        .cfm-footer {
            flex-direction: column-reverse !important;
            align-items: stretch !important;
        }

        #sapo-customer-form-modal
        .cfm-button {
            width: 100% !important;
        }
    }
`;

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

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            'hidden';

        return () => {
            window.removeEventListener(
                'keydown',
                handleKeyDown,
            );

            document.body.style.overflow =
                previousOverflow;
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

    const modalMarkup = (
        <div
            id="sapo-customer-form-modal"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    !isSubmitting
                    && event.target
                    === event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <style>
                {customerFormModalStyles}
            </style>

            <section
                className="cfm-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="customer-form-title"
                onMouseDown={(event) => {
                    event.stopPropagation();
                }}
            >
                <header className="cfm-header">
                    <div className="cfm-header-copy">
                        <span className="cfm-kicker">
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
                        className="cfm-close-button"
                        disabled={isSubmitting}
                        aria-label="Close customer form"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="cfm-form"
                    onSubmit={handleSubmit}
                >
                    <div className="cfm-body">
                        <div className="cfm-body-inner">
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

                                <label className="cfm-field">
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

                                <label className="cfm-field">
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

                                <label className="cfm-field">
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

                                <label className="cfm-field">
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

                                <label className="cfm-field">
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

                                <label className="cfm-field cfm-field-wide">
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

                                <label className="cfm-field cfm-field-wide">
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
                        </div>
                    </div>

                    <footer className="cfm-footer">
                        <button
                            type="button"
                            className="cfm-button cfm-secondary-button"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="cfm-button cfm-primary-button"
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

    return createPortal(
        modalMarkup,
        document.body,
    );
}