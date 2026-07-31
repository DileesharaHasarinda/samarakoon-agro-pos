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

const deleteProductModalStyles = `
    #sapo-delete-product-modal,
    #sapo-delete-product-modal *,
    #sapo-delete-product-modal *::before,
    #sapo-delete-product-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-delete-product-modal {
        --dpm-red: #dc2626;
        --dpm-red-dark: #b91c1c;
        --dpm-red-light: #fef2f2;
        --dpm-text: #111827;
        --dpm-text-secondary: #374151;
        --dpm-muted: #6b7280;
        --dpm-border: #e5e7eb;
        --dpm-border-strong: #d1d5db;
        --dpm-white: #ffffff;
        --dpm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        inset: 0 !important;
        z-index: 1000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        margin: 0 !important;
        background: rgba(15, 23, 42, 0.45) !important;
        -webkit-backdrop-filter: blur(6px) saturate(120%) !important;
        backdrop-filter: blur(6px) saturate(120%) !important;
        font-family: var(--dpm-font) !important;
        color: var(--dpm-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }

    #sapo-delete-product-modal h2,
    #sapo-delete-product-modal p,
    #sapo-delete-product-modal span,
    #sapo-delete-product-modal strong,
    #sapo-delete-product-modal button {
        font-family: var(--dpm-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-delete-product-modal h2,
    #sapo-delete-product-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Modal shell ---------- */
    #sapo-delete-product-modal .dpm-modal {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 440px !important;
        max-height: calc(100vh - 48px) !important;
        max-height: calc(100dvh - 48px) !important;
        background: var(--dpm-white) !important;
        border-radius: 14px !important;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.25) !important;
        overflow: hidden !important;
        animation: dpm-pop-in 0.15s ease-out !important;
    }

    @keyframes dpm-pop-in {
        from {
            opacity: 0;
            transform: scale(0.97) translateY(4px);
        }

        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }

    /* ---------- Scrollable body ---------- */
    #sapo-delete-product-modal .dpm-body {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 14px !important;
        min-height: 0 !important;
        padding: 32px 28px 24px !important;
        overflow-y: auto !important;
        text-align: center !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--dpm-border-strong) transparent !important;
    }

    #sapo-delete-product-modal .dpm-body::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-delete-product-modal .dpm-body::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-delete-product-modal .dpm-body::-webkit-scrollbar-thumb {
        background: var(--dpm-border-strong) !important;
        border-radius: 8px !important;
    }

    /* ---------- Icon ---------- */
    #sapo-delete-product-modal .dpm-icon {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 56px !important;
        height: 56px !important;
        min-width: 56px !important;
        color: var(--dpm-red) !important;
        background: var(--dpm-red-light) !important;
        border: 1px solid #fca5a5 !important;
        border-radius: 50% !important;
    }

    #sapo-delete-product-modal .dpm-icon svg {
        width: 26px !important;
        height: 26px !important;
    }

    /* ---------- Copy ---------- */
    #sapo-delete-product-modal .dpm-title {
        font-size: 18px !important;
        font-weight: 700 !important;
        color: var(--dpm-text) !important;
    }

    #sapo-delete-product-modal .dpm-description {
        max-width: 340px !important;
        font-size: 14px !important;
        line-height: 1.55 !important;
        color: var(--dpm-text-secondary) !important;
    }

    #sapo-delete-product-modal .dpm-description strong {
        font-weight: 700 !important;
        color: var(--dpm-text) !important;
    }

    #sapo-delete-product-modal .dpm-warning {
        display: flex !important;
        align-items: flex-start !important;
        gap: 8px !important;
        width: 100% !important;
        padding: 11px 13px !important;
        border-radius: 8px !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        line-height: 1.5 !important;
        text-align: left !important;
        color: var(--dpm-red-dark) !important;
        background: var(--dpm-red-light) !important;
        border: 1px solid #fecaca !important;
    }

    #sapo-delete-product-modal .dpm-warning svg {
        width: 16px !important;
        height: 16px !important;
        min-width: 16px !important;
        margin-top: 1px !important;
    }

    /* ---------- Alert ---------- */
    #sapo-delete-product-modal .dpm-alert {
        width: 100% !important;
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        text-align: left !important;
        background: var(--dpm-red-light) !important;
        border: 1px solid #fecaca !important;
        color: var(--dpm-red-dark) !important;
    }

    /* ---------- Footer actions ---------- */
    #sapo-delete-product-modal .dpm-actions {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        padding: 18px 28px !important;
        background: var(--dpm-white) !important;
        border-top: 1px solid var(--dpm-border) !important;
    }

    #sapo-delete-product-modal .dpm-secondary-button,
    #sapo-delete-product-modal .dpm-danger-button {
        flex: 1 !important;
        padding: 11px 20px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-delete-product-modal .dpm-secondary-button {
        color: #374151 !important;
        background: var(--dpm-white) !important;
        border: 1px solid var(--dpm-border-strong) !important;
    }

    #sapo-delete-product-modal .dpm-secondary-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        border-color: #9ca3af !important;
    }

    #sapo-delete-product-modal .dpm-danger-button {
        color: #ffffff !important;
        background: var(--dpm-red) !important;
        border: 1px solid var(--dpm-red) !important;
    }

    #sapo-delete-product-modal .dpm-danger-button:hover:not(:disabled) {
        background: var(--dpm-red-dark) !important;
        border-color: var(--dpm-red-dark) !important;
    }

    #sapo-delete-product-modal button:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 480px) {
        #sapo-delete-product-modal {
            padding: 12px !important;
        }

        #sapo-delete-product-modal .dpm-modal {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
        }

        #sapo-delete-product-modal .dpm-body {
            padding: 26px 20px 20px !important;
        }

        #sapo-delete-product-modal .dpm-actions {
            padding: 16px 20px !important;
            flex-direction: column-reverse !important;
        }

        #sapo-delete-product-modal .dpm-secondary-button,
        #sapo-delete-product-modal .dpm-danger-button {
            width: 100% !important;
        }
    }
`;

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
            id="sapo-delete-product-modal"
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
            <style>
                {deleteProductModalStyles}
            </style>

            <section
                className="dpm-modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-product-title"
                aria-describedby="delete-product-description"
                onMouseDown={(event) => {
                    event.stopPropagation();
                }}
            >
                <div className="dpm-body">
                    <span
                        className="dpm-icon"
                        aria-hidden="true"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                            <path d="M12 9v4M12 17h.01" />
                        </svg>
                    </span>

                    <h2
                        id="delete-product-title"
                        className="dpm-title"
                    >
                        Delete Product?
                    </h2>

                    <p
                        id="delete-product-description"
                        className="dpm-description"
                    >
                        You are about to permanently delete{' '}
                        <strong>
                            {product.name}
                        </strong>
                        . This action cannot be undone.
                    </p>

                    <div className="dpm-warning">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 8v5M12 16h.01" />
                        </svg>

                        <span>
                            Deleting this product will
                            permanently remove it and its
                            related records from the system.
                        </span>
                    </div>

                    {errorMessage && (
                        <div
                            className="dpm-alert"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}
                </div>

                <footer className="dpm-actions">
                    <button
                        type="button"
                        className="dpm-secondary-button"
                        disabled={isDeleting}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="dpm-danger-button"
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