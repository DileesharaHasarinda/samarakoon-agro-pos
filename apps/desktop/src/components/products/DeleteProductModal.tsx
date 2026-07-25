import {
    useEffect,
} from 'react';

import type {
    Product,
} from '../../types/product';

interface DeleteProductModalProps {
    product: Product | null;
    isDeleting: boolean;
    errorMessage: string;

    onCancel: () => void;
    onConfirm: () => void;
}

export default function DeleteProductModal({
    product,
    isDeleting,
    errorMessage,
    onCancel,
    onConfirm,
}: DeleteProductModalProps) {
    useEffect(() => {
        if (!product) {
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
        product,
        isDeleting,
        onCancel,
    ]);

    if (!product) {
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
                aria-labelledby="delete-product-title"
            >
                <div className="delete-modal-icon">
                    !
                </div>

                <h2 id="delete-product-title">
                    Delete Product?
                </h2>

                <p>
                    You are about to permanently
                    delete{' '}
                    <strong>
                        {product.name}
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
                            : 'Delete Product'}
                    </button>
                </footer>
            </section>
        </div>
    );
}