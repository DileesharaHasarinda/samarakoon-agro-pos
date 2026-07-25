import {
    useEffect,
} from 'react';

import type {
    FormEvent,
} from 'react';

import type {
    ValidationErrors,
} from '../../types/auth';

interface CategoryFormModalProps {
    isOpen: boolean;
    isEditing: boolean;

    name: string;
    description: string;

    isSubmitting: boolean;
    errorMessage: string;
    fieldErrors: ValidationErrors;

    onNameChange: (
        value: string,
    ) => void;

    onDescriptionChange: (
        value: string,
    ) => void;

    onClose: () => void;

    onSubmit: (
        event: FormEvent<HTMLFormElement>,
    ) => void;
}

export default function CategoryFormModal({
    isOpen,
    isEditing,
    name,
    description,
    isSubmitting,
    errorMessage,
    fieldErrors,
    onNameChange,
    onDescriptionChange,
    onClose,
    onSubmit,
}: CategoryFormModalProps) {
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

    const nameError =
        fieldErrors.name?.[0];

    const descriptionError =
        fieldErrors.description?.[0];

    return (
        <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                    && !isSubmitting
                ) {
                    onClose();
                }
            }}
        >
            <section
                className="category-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="category-modal-title"
            >
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Category management
                        </span>

                        <h2 id="category-modal-title">
                            {isEditing
                                ? 'Edit Category'
                                : 'Add Category'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="modal-close-button"
                        aria-label="Close category form"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="category-form"
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

                    <label>
                        <span>
                            Category Name
                            <strong> *</strong>
                        </span>

                        <input
                            type="text"
                            value={name}
                            maxLength={120}
                            autoFocus
                            disabled={isSubmitting}
                            placeholder="Example: Fertilizers"
                            className={
                                nameError
                                    ? 'input-error'
                                    : ''
                            }
                            onChange={(event) => {
                                onNameChange(
                                    event.target.value,
                                );
                            }}
                        />

                        <small>
                            {name.length}/120 characters
                        </small>

                        {nameError && (
                            <p className="field-error">
                                {nameError}
                            </p>
                        )}
                    </label>

                    <label>
                        <span>Description</span>

                        <textarea
                            value={description}
                            maxLength={1000}
                            rows={5}
                            disabled={isSubmitting}
                            placeholder="Enter a short category description"
                            className={
                                descriptionError
                                    ? 'input-error'
                                    : ''
                            }
                            onChange={(event) => {
                                onDescriptionChange(
                                    event.target.value,
                                );
                            }}
                        />

                        <small>
                            {description.length}/1000
                            characters
                        </small>

                        {descriptionError && (
                            <p className="field-error">
                                {descriptionError}
                            </p>
                        )}
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
                                ? 'Saving...'
                                : isEditing
                                    ? 'Update Category'
                                    : 'Add Category'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}