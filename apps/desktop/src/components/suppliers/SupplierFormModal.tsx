import {
    useEffect,
} from 'react';

import type {
    FormEvent,
} from 'react';

import type {
    ValidationErrors,
} from '../../types/auth';

import type {
    SupplierFormValues,
} from '../../types/supplier';

interface SupplierFormModalProps {
    isOpen: boolean;
    isEditing: boolean;
    values: SupplierFormValues;
    isSubmitting: boolean;
    errorMessage: string;
    fieldErrors: ValidationErrors;

    onChange: (
        field: keyof SupplierFormValues,
        value: string,
    ) => void;

    onClose: () => void;

    onSubmit: (
        event: FormEvent<HTMLFormElement>,
    ) => void;
}

const supplierModalStyles = `
    #sapo-supplier-form-modal,
    #sapo-supplier-form-modal *,
    #sapo-supplier-form-modal *::before,
    #sapo-supplier-form-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-supplier-form-modal {
        --sfm-green-800: #166534;
        --sfm-green-700: #15803d;
        --sfm-green-50: #f0fdf4;
        --sfm-red: #dc2626;
        --sfm-red-light: #fef2f2;
        --sfm-text: #111827;
        --sfm-text-secondary: #1f2937;
        --sfm-muted: #6b7280;
        --sfm-border: #e5e7eb;
        --sfm-border-strong: #d1d5db;
        --sfm-bg: #f9fafb;
        --sfm-white: #ffffff;
        --sfm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        inset: 0 !important;
        z-index: 1000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        margin: 0 !important;
        background: rgba(15, 23, 42, 0.4) !important;
        -webkit-backdrop-filter: blur(6px) saturate(120%) !important;
        backdrop-filter: blur(6px) saturate(120%) !important;
        font-family: var(--sfm-font) !important;
        color: var(--sfm-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }

    #sapo-supplier-form-modal h2,
    #sapo-supplier-form-modal p,
    #sapo-supplier-form-modal span,
    #sapo-supplier-form-modal strong,
    #sapo-supplier-form-modal em,
    #sapo-supplier-form-modal small,
    #sapo-supplier-form-modal label,
    #sapo-supplier-form-modal button,
    #sapo-supplier-form-modal input,
    #sapo-supplier-form-modal textarea {
        font-family: var(--sfm-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-supplier-form-modal h2,
    #sapo-supplier-form-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Modal shell ---------- */
    #sapo-supplier-form-modal .sfm-modal {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 680px !important;
        max-height: calc(100vh - 48px) !important;
        max-height: calc(100dvh - 48px) !important;
        background: var(--sfm-white) !important;
        border-radius: 14px !important;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.22) !important;
        overflow: hidden !important;
        animation: sfm-pop-in 0.15s ease-out !important;
    }

    @keyframes sfm-pop-in {
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
    #sapo-supplier-form-modal .sfm-header {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 22px 26px !important;
        background: var(--sfm-white) !important;
        border-bottom: 1px solid var(--sfm-border) !important;
    }

    #sapo-supplier-form-modal .sfm-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--sfm-green-700) !important;
        margin-bottom: 4px !important;
        background: transparent !important;
    }

    #sapo-supplier-form-modal .sfm-header h2 {
        font-size: 19px !important;
        font-weight: 700 !important;
        color: var(--sfm-text) !important;
    }

    #sapo-supplier-form-modal .sfm-close-button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 34px !important;
        height: 34px !important;
        flex-shrink: 0 !important;
        font-size: 20px !important;
        line-height: 1 !important;
        color: var(--sfm-muted) !important;
        background: var(--sfm-bg) !important;
        border: 1px solid var(--sfm-border) !important;
        border-radius: 9px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-supplier-form-modal .sfm-close-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        color: var(--sfm-text) !important;
    }

    #sapo-supplier-form-modal .sfm-close-button:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Scrollable form body ---------- */
    #sapo-supplier-form-modal .sfm-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 18px !important;
        min-height: 0 !important;
        padding: 24px 26px !important;
        overflow-y: auto !important;
        background: var(--sfm-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--sfm-border-strong) transparent !important;
    }

    #sapo-supplier-form-modal .sfm-form::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-supplier-form-modal .sfm-form::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-supplier-form-modal .sfm-form::-webkit-scrollbar-thumb {
        background: var(--sfm-border-strong) !important;
        border-radius: 8px !important;
    }

    /* ---------- Alert ---------- */
    #sapo-supplier-form-modal .sfm-alert {
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        background: var(--sfm-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Field grid ---------- */
    #sapo-supplier-form-modal .sfm-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 16px 18px !important;
    }

    #sapo-supplier-form-modal .sfm-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        min-width: 0 !important;
    }

    #sapo-supplier-form-modal .sfm-field.sfm-full-width {
        grid-column: 1 / -1 !important;
    }

    #sapo-supplier-form-modal .sfm-field-label {
        display: flex !important;
        align-items: baseline !important;
        gap: 4px !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--sfm-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-supplier-form-modal .sfm-required {
        color: var(--sfm-red) !important;
        font-weight: 700 !important;
    }

    #sapo-supplier-form-modal .sfm-optional {
        font-style: normal !important;
        font-weight: 500 !important;
        font-size: 11.5px !important;
        color: var(--sfm-muted) !important;
    }

    #sapo-supplier-form-modal .sfm-field input,
    #sapo-supplier-form-modal .sfm-field textarea {
        width: 100% !important;
        padding: 9px 12px !important;
        font-size: 13.5px !important;
        color: var(--sfm-text-secondary) !important;
        background: var(--sfm-white) !important;
        border: 1px solid var(--sfm-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        resize: vertical !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-supplier-form-modal .sfm-field textarea {
        min-height: 72px !important;
        line-height: 1.5 !important;
    }

    #sapo-supplier-form-modal .sfm-field input:focus,
    #sapo-supplier-form-modal .sfm-field textarea:focus {
        border-color: var(--sfm-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-supplier-form-modal .sfm-field input:disabled,
    #sapo-supplier-form-modal .sfm-field textarea:disabled {
        background: var(--sfm-bg) !important;
        color: var(--sfm-muted) !important;
        cursor: not-allowed !important;
    }

    #sapo-supplier-form-modal .sfm-field input.sfm-input-error,
    #sapo-supplier-form-modal .sfm-field textarea.sfm-input-error {
        border-color: var(--sfm-red) !important;
    }

    #sapo-supplier-form-modal .sfm-field input.sfm-input-error:focus,
    #sapo-supplier-form-modal .sfm-field textarea.sfm-input-error:focus {
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12) !important;
    }

    #sapo-supplier-form-modal .sfm-char-count {
        align-self: flex-end !important;
        font-size: 11.5px !important;
        color: var(--sfm-muted) !important;
        background: transparent !important;
    }

    #sapo-supplier-form-modal .sfm-field-error {
        margin: 0 !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        color: var(--sfm-red) !important;
    }

    /* ---------- Footer actions ---------- */
    #sapo-supplier-form-modal .sfm-actions {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        padding: 16px 26px !important;
        background: var(--sfm-bg) !important;
        border-top: 1px solid var(--sfm-border) !important;
    }

    #sapo-supplier-form-modal .sfm-secondary-button {
        padding: 10px 20px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--sfm-white) !important;
        border: 1px solid var(--sfm-border-strong) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-supplier-form-modal .sfm-secondary-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        border-color: #9ca3af !important;
    }

    #sapo-supplier-form-modal .sfm-primary-button {
        padding: 10px 22px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        background: var(--sfm-green-700) !important;
        border: 1px solid var(--sfm-green-700) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease !important;
    }

    #sapo-supplier-form-modal .sfm-primary-button:hover:not(:disabled) {
        background: var(--sfm-green-800) !important;
    }

    #sapo-supplier-form-modal button:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 640px) {
        #sapo-supplier-form-modal {
            padding: 12px !important;
        }

        #sapo-supplier-form-modal .sfm-modal {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
        }

        #sapo-supplier-form-modal .sfm-header,
        #sapo-supplier-form-modal .sfm-form,
        #sapo-supplier-form-modal .sfm-actions {
            padding-left: 18px !important;
            padding-right: 18px !important;
        }

        #sapo-supplier-form-modal .sfm-grid {
            grid-template-columns: 1fr !important;
        }

        #sapo-supplier-form-modal .sfm-field {
            grid-column: 1 / -1 !important;
        }

        #sapo-supplier-form-modal .sfm-actions {
            flex-direction: column-reverse !important;
            align-items: stretch !important;
        }

        #sapo-supplier-form-modal .sfm-secondary-button,
        #sapo-supplier-form-modal .sfm-primary-button {
            width: 100% !important;
        }
    }
`;

export default function SupplierFormModal({
    isOpen,
    isEditing,
    values,
    isSubmitting,
    errorMessage,
    fieldErrors,
    onChange,
    onClose,
    onSubmit,
}: SupplierFormModalProps) {
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

    const getFieldError = (
        field: string,
    ): string | undefined =>
        fieldErrors[field]?.[0];

    return (
        <div
            id="sapo-supplier-form-modal"
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
                {supplierModalStyles}
            </style>

            <section
                className="sfm-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="supplier-modal-title"
                onMouseDown={(event) => {
                    event.stopPropagation();
                }}
            >
                <header className="sfm-header">
                    <div>
                        <span className="sfm-kicker">
                            Supplier Management
                        </span>

                        <h2 id="supplier-modal-title">
                            {isEditing
                                ? 'Edit Supplier'
                                : 'Add Supplier'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="sfm-close-button"
                        aria-label="Close supplier form"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="sfm-form"
                    onSubmit={onSubmit}
                >
                    {errorMessage && (
                        <div
                            className="sfm-alert"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}

                    <div className="sfm-grid">
                        <label className="sfm-field sfm-full-width">
                            <span className="sfm-field-label">
                                Supplier Name
                                <span className="sfm-required">*</span>
                            </span>

                            <input
                                type="text"
                                value={values.name}
                                maxLength={160}
                                autoFocus
                                disabled={isSubmitting}
                                placeholder="Example: Agro Lanka Suppliers"
                                className={
                                    getFieldError('name')
                                        ? 'sfm-input-error'
                                        : ''
                                }
                                onChange={(event) => {
                                    onChange(
                                        'name',
                                        event.target.value,
                                    );
                                }}
                            />

                            <span className="sfm-char-count">
                                {values.name.length}/160
                            </span>

                            {getFieldError('name') && (
                                <p className="sfm-field-error">
                                    {getFieldError('name')}
                                </p>
                            )}
                        </label>

                        <label className="sfm-field">
                            <span className="sfm-field-label">
                                Contact Person
                                <span className="sfm-optional">Optional</span>
                            </span>

                            <input
                                type="text"
                                value={
                                    values.contact_person
                                }
                                maxLength={120}
                                disabled={isSubmitting}
                                placeholder="Enter contact person"
                                className={
                                    getFieldError(
                                        'contact_person',
                                    )
                                        ? 'sfm-input-error'
                                        : ''
                                }
                                onChange={(event) => {
                                    onChange(
                                        'contact_person',
                                        event.target.value,
                                    );
                                }}
                            />

                            {getFieldError(
                                'contact_person',
                            ) && (
                                    <p className="sfm-field-error">
                                        {getFieldError(
                                            'contact_person',
                                        )}
                                    </p>
                                )}
                        </label>

                        <label className="sfm-field">
                            <span className="sfm-field-label">
                                Email
                                <span className="sfm-optional">Optional</span>
                            </span>

                            <input
                                type="email"
                                value={values.email}
                                maxLength={190}
                                disabled={isSubmitting}
                                placeholder="supplier@example.com"
                                className={
                                    getFieldError('email')
                                        ? 'sfm-input-error'
                                        : ''
                                }
                                onChange={(event) => {
                                    onChange(
                                        'email',
                                        event.target.value,
                                    );
                                }}
                            />

                            {getFieldError('email') && (
                                <p className="sfm-field-error">
                                    {getFieldError('email')}
                                </p>
                            )}
                        </label>

                        <label className="sfm-field">
                            <span className="sfm-field-label">
                                Primary Phone
                                <span className="sfm-required">*</span>
                            </span>

                            <input
                                type="tel"
                                value={values.phone}
                                maxLength={30}
                                disabled={isSubmitting}
                                placeholder="+94 77 123 4567"
                                className={
                                    getFieldError('phone')
                                        ? 'sfm-input-error'
                                        : ''
                                }
                                onChange={(event) => {
                                    onChange(
                                        'phone',
                                        event.target.value,
                                    );
                                }}
                            />

                            {getFieldError('phone') && (
                                <p className="sfm-field-error">
                                    {getFieldError('phone')}
                                </p>
                            )}
                        </label>

                        <label className="sfm-field">
                            <span className="sfm-field-label">
                                Secondary Phone
                                <span className="sfm-optional">Optional</span>
                            </span>

                            <input
                                type="tel"
                                value={
                                    values.secondary_phone
                                }
                                maxLength={30}
                                disabled={isSubmitting}
                                placeholder="+94 11 234 5678"
                                className={
                                    getFieldError(
                                        'secondary_phone',
                                    )
                                        ? 'sfm-input-error'
                                        : ''
                                }
                                onChange={(event) => {
                                    onChange(
                                        'secondary_phone',
                                        event.target.value,
                                    );
                                }}
                            />

                            {getFieldError(
                                'secondary_phone',
                            ) && (
                                    <p className="sfm-field-error">
                                        {getFieldError(
                                            'secondary_phone',
                                        )}
                                    </p>
                                )}
                        </label>

                        <label className="sfm-field sfm-full-width">
                            <span className="sfm-field-label">
                                Address
                                <span className="sfm-optional">Optional</span>
                            </span>

                            <textarea
                                value={values.address}
                                maxLength={1500}
                                rows={3}
                                disabled={isSubmitting}
                                placeholder="Enter supplier address"
                                className={
                                    getFieldError('address')
                                        ? 'sfm-input-error'
                                        : ''
                                }
                                onChange={(event) => {
                                    onChange(
                                        'address',
                                        event.target.value,
                                    );
                                }}
                            />

                            <span className="sfm-char-count">
                                {values.address.length}/1500
                            </span>

                            {getFieldError(
                                'address',
                            ) && (
                                    <p className="sfm-field-error">
                                        {getFieldError(
                                            'address',
                                        )}
                                    </p>
                                )}
                        </label>

                        <label className="sfm-field sfm-full-width">
                            <span className="sfm-field-label">
                                Notes
                                <span className="sfm-optional">Optional</span>
                            </span>

                            <textarea
                                value={values.notes}
                                maxLength={2000}
                                rows={4}
                                disabled={isSubmitting}
                                placeholder="Enter additional supplier information"
                                className={
                                    getFieldError('notes')
                                        ? 'sfm-input-error'
                                        : ''
                                }
                                onChange={(event) => {
                                    onChange(
                                        'notes',
                                        event.target.value,
                                    );
                                }}
                            />

                            <span className="sfm-char-count">
                                {values.notes.length}/2000
                            </span>

                            {getFieldError('notes') && (
                                <p className="sfm-field-error">
                                    {getFieldError('notes')}
                                </p>
                            )}
                        </label>
                    </div>

                    <footer className="sfm-actions">
                        <button
                            type="button"
                            className="sfm-secondary-button"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="sfm-primary-button"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Saving...'
                                : isEditing
                                    ? 'Update Supplier'
                                    : 'Add Supplier'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}