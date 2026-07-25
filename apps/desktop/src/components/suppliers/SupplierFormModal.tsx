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
            className="modal-backdrop"
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
            <section
                className="supplier-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="supplier-modal-title"
            >
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Supplier management
                        </span>

                        <h2 id="supplier-modal-title">
                            {isEditing
                                ? 'Edit Supplier'
                                : 'Add Supplier'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="modal-close-button"
                        aria-label="Close supplier form"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="supplier-form"
                    onSubmit={onSubmit}
                >
                    {errorMessage && (
                        <div
                            className="form-alert"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}

                    <div className="supplier-form-grid">
                        <label className="full-width-field">
                            <span>
                                Supplier Name
                                <strong> *</strong>
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
                                        ? 'input-error'
                                        : ''
                                }
                                onChange={(event) => {
                                    onChange(
                                        'name',
                                        event.target.value,
                                    );
                                }}
                            />

                            <small>
                                {values.name.length}/160
                            </small>

                            {getFieldError('name') && (
                                <p className="field-error">
                                    {getFieldError('name')}
                                </p>
                            )}
                        </label>

                        <label>
                            <span>
                                Contact Person
                                <em> Optional</em>
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
                                        ? 'input-error'
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
                                    <p className="field-error">
                                        {getFieldError(
                                            'contact_person',
                                        )}
                                    </p>
                                )}
                        </label>

                        <label>
                            <span>
                                Email
                                <em> Optional</em>
                            </span>

                            <input
                                type="email"
                                value={values.email}
                                maxLength={190}
                                disabled={isSubmitting}
                                placeholder="supplier@example.com"
                                className={
                                    getFieldError('email')
                                        ? 'input-error'
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
                                <p className="field-error">
                                    {getFieldError('email')}
                                </p>
                            )}
                        </label>

                        <label>
                            <span>
                                Primary Phone
                                <strong> *</strong>
                            </span>

                            <input
                                type="tel"
                                value={values.phone}
                                maxLength={30}
                                disabled={isSubmitting}
                                placeholder="+94 77 123 4567"
                                className={
                                    getFieldError('phone')
                                        ? 'input-error'
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
                                <p className="field-error">
                                    {getFieldError('phone')}
                                </p>
                            )}
                        </label>

                        <label>
                            <span>
                                Secondary Phone
                                <em> Optional</em>
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
                                        ? 'input-error'
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
                                    <p className="field-error">
                                        {getFieldError(
                                            'secondary_phone',
                                        )}
                                    </p>
                                )}
                        </label>

                        <label className="full-width-field">
                            <span>
                                Address
                                <em> Optional</em>
                            </span>

                            <textarea
                                value={values.address}
                                maxLength={1500}
                                rows={3}
                                disabled={isSubmitting}
                                placeholder="Enter supplier address"
                                className={
                                    getFieldError('address')
                                        ? 'input-error'
                                        : ''
                                }
                                onChange={(event) => {
                                    onChange(
                                        'address',
                                        event.target.value,
                                    );
                                }}
                            />

                            <small>
                                {values.address.length}
                                /1500
                            </small>

                            {getFieldError(
                                'address',
                            ) && (
                                    <p className="field-error">
                                        {getFieldError(
                                            'address',
                                        )}
                                    </p>
                                )}
                        </label>

                        <label className="full-width-field">
                            <span>
                                Notes
                                <em> Optional</em>
                            </span>

                            <textarea
                                value={values.notes}
                                maxLength={2000}
                                rows={4}
                                disabled={isSubmitting}
                                placeholder="Enter additional supplier information"
                                className={
                                    getFieldError('notes')
                                        ? 'input-error'
                                        : ''
                                }
                                onChange={(event) => {
                                    onChange(
                                        'notes',
                                        event.target.value,
                                    );
                                }}
                            />

                            <small>
                                {values.notes.length}
                                /2000
                            </small>

                            {getFieldError('notes') && (
                                <p className="field-error">
                                    {getFieldError('notes')}
                                </p>
                            )}
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