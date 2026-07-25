import {
    useEffect,
} from 'react';

import type {
    Supplier,
} from '../../types/supplier';

interface DeleteSupplierModalProps {
    supplier: Supplier | null;
    isDeleting: boolean;
    errorMessage: string;

    onCancel: () => void;
    onConfirm: () => void;
}

export default function DeleteSupplierModal({
    supplier,
    isDeleting,
    errorMessage,
    onCancel,
    onConfirm,
}: DeleteSupplierModalProps) {
    useEffect(() => {
        if (!supplier) {
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
        supplier,
        isDeleting,
        onCancel,
    ]);

    if (!supplier) {
        return null;
    }

    return (
        <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target
                    === event.currentTarget
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
                aria-labelledby="delete-supplier-title"
            >
                <div className="delete-modal-icon">
                    !
                </div>

                <h2 id="delete-supplier-title">
                    Delete Supplier?
                </h2>

                <p>
                    You are about to permanently
                    delete{' '}
                    <strong>
                        {supplier.name}
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
                            : 'Delete Supplier'}
                    </button>
                </footer>
            </section>
        </div>
    );
}