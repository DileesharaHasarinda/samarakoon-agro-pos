import {
    useEffect,
} from 'react';

import type {
    Category,
} from '../../types/category';

interface DeleteCategoryModalProps {
    category: Category | null;
    isDeleting: boolean;
    errorMessage: string;

    onCancel: () => void;
    onConfirm: () => void;
}

export default function DeleteCategoryModal({
    category,
    isDeleting,
    errorMessage,
    onCancel,
    onConfirm,
}: DeleteCategoryModalProps) {
    useEffect(() => {
        if (!category) {
            return;
        }

        const handleKeyDown = (
            event: KeyboardEvent,
        ): void => {
            if (
                event.key === 'Escape'
                && !isDeleting
            ) {
                onCancel();
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
        category,
        isDeleting,
        onCancel,
    ]);

    if (!category) {
        return null;
    }

    return (
        <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                    && !isDeleting
                ) {
                    onCancel();
                }
            }}
        >
            <section
                className="delete-modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-category-title"
            >
                <div className="delete-modal-icon">
                    !
                </div>

                <h2 id="delete-category-title">
                    Delete Category?
                </h2>

                <p>
                    You are about to permanently
                    delete{' '}
                    <strong>
                        {category.name}
                    </strong>
                    .
                </p>

                <p className="delete-warning">
                    This action cannot be undone.
                </p>

                {errorMessage && (
                    <div
                        className="form-alert"
                        role="alert"
                    >
                        {errorMessage}
                    </div>
                )}

                <footer className="modal-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        disabled={isDeleting}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="danger-button"
                        disabled={isDeleting}
                        onClick={onConfirm}
                    >
                        {isDeleting
                            ? 'Deleting...'
                            : 'Delete Category'}
                    </button>
                </footer>
            </section>
        </div>
    );
}