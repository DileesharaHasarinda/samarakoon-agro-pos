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

const deleteSupplierModalStyles = `
    #sapo-delete-supplier-modal,
    #sapo-delete-supplier-modal *,
    #sapo-delete-supplier-modal *::before,
    #sapo-delete-supplier-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-delete-supplier-modal {
        --dsm-red: #dc2626;
        --dsm-red-dark: #b91c1c;
        --dsm-red-light: #fef2f2;
        --dsm-text: #111827;
        --dsm-text-secondary: #374151;
        --dsm-muted: #6b7280;
        --dsm-border: #e5e7eb;
        --dsm-border-strong: #d1d5db;
        --dsm-white: #ffffff;
        --dsm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

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
        font-family: var(--dsm-font) !important;
        color: var(--dsm-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }

    #sapo-delete-supplier-modal h2,
    #sapo-delete-supplier-modal p,
    #sapo-delete-supplier-modal span,
    #sapo-delete-supplier-modal strong,
    #sapo-delete-supplier-modal button {
        font-family: var(--dsm-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-delete-supplier-modal h2,
    #sapo-delete-supplier-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Modal shell ---------- */
    #sapo-delete-supplier-modal .dsm-modal {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 440px !important;
        max-height: calc(100vh - 48px) !important;
        max-height: calc(100dvh - 48px) !important;
        background: var(--dsm-white) !important;
        border-radius: 14px !important;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.25) !important;
        overflow: hidden !important;
        animation: dsm-pop-in 0.15s ease-out !important;
    }

    @keyframes dsm-pop-in {
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
    #sapo-delete-supplier-modal .dsm-body {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 14px !important;
        min-height: 0 !important;
        padding: 32px 28px 24px !important;
        overflow-y: auto !important;
        text-align: center !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--dsm-border-strong) transparent !important;
    }

    #sapo-delete-supplier-modal .dsm-body::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-delete-supplier-modal .dsm-body::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-delete-supplier-modal .dsm-body::-webkit-scrollbar-thumb {
        background: var(--dsm-border-strong) !important;
        border-radius: 8px !important;
    }

    /* ---------- Icon ---------- */
    #sapo-delete-supplier-modal .dsm-icon {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 56px !important;
        height: 56px !important;
        min-width: 56px !important;
        color: var(--dsm-red) !important;
        background: var(--dsm-red-light) !important;
        border: 1px solid #fca5a5 !important;
        border-radius: 50% !important;
    }

    #sapo-delete-supplier-modal .dsm-icon svg {
        width: 26px !important;
        height: 26px !important;
    }

    /* ---------- Copy ---------- */
    #sapo-delete-supplier-modal .dsm-title {
        font-size: 18px !important;
        font-weight: 700 !important;
        color: var(--dsm-text) !important;
    }

    #sapo-delete-supplier-modal .dsm-description {
        max-width: 340px !important;
        font-size: 14px !important;
        line-height: 1.55 !important;
        color: var(--dsm-text-secondary) !important;
    }

    #sapo-delete-supplier-modal .dsm-description strong {
        font-weight: 700 !important;
        color: var(--dsm-text) !important;
    }

    #sapo-delete-supplier-modal .dsm-warning {
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
        color: var(--dsm-red-dark) !important;
        background: var(--dsm-red-light) !important;
        border: 1px solid #fecaca !important;
    }

    #sapo-delete-supplier-modal .dsm-warning svg {
        width: 16px !important;
        height: 16px !important;
        min-width: 16px !important;
        margin-top: 1px !important;
    }

    /* ---------- Alert ---------- */
    #sapo-delete-supplier-modal .dsm-alert {
        width: 100% !important;
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        text-align: left !important;
        background: var(--dsm-red-light) !important;
        border: 1px solid #fecaca !important;
        color: var(--dsm-red-dark) !important;
    }

    /* ---------- Footer actions ---------- */
    #sapo-delete-supplier-modal .dsm-actions {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        padding: 18px 28px !important;
        background: var(--dsm-white) !important;
        border-top: 1px solid var(--dsm-border) !important;
    }

    #sapo-delete-supplier-modal .dsm-secondary-button,
    #sapo-delete-supplier-modal .dsm-danger-button {
        flex: 1 !important;
        padding: 11px 20px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-delete-supplier-modal .dsm-secondary-button {
        color: #374151 !important;
        background: var(--dsm-white) !important;
        border: 1px solid var(--dsm-border-strong) !important;
    }

    #sapo-delete-supplier-modal .dsm-secondary-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        border-color: #9ca3af !important;
    }

    #sapo-delete-supplier-modal .dsm-danger-button {
        color: #ffffff !important;
        background: var(--dsm-red) !important;
        border: 1px solid var(--dsm-red) !important;
    }

    #sapo-delete-supplier-modal .dsm-danger-button:hover:not(:disabled) {
        background: var(--dsm-red-dark) !important;
        border-color: var(--dsm-red-dark) !important;
    }

    #sapo-delete-supplier-modal button:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 480px) {
        #sapo-delete-supplier-modal {
            padding: 12px !important;
        }

        #sapo-delete-supplier-modal .dsm-modal {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
        }

        #sapo-delete-supplier-modal .dsm-body {
            padding: 26px 20px 20px !important;
        }

        #sapo-delete-supplier-modal .dsm-actions {
            padding: 16px 20px !important;
            flex-direction: column-reverse !important;
        }

        #sapo-delete-supplier-modal .dsm-secondary-button,
        #sapo-delete-supplier-modal .dsm-danger-button {
            width: 100% !important;
        }
    }
`;

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
            id="sapo-delete-supplier-modal"
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
                {deleteSupplierModalStyles}
            </style>

            <section
                className="dsm-modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-supplier-title"
                aria-describedby="delete-supplier-description"
                onMouseDown={(event) => {
                    event.stopPropagation();
                }}
            >
                <div className="dsm-body">
                    <span
                        className="dsm-icon"
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
                        id="delete-supplier-title"
                        className="dsm-title"
                    >
                        Delete Supplier?
                    </h2>

                    <p
                        id="delete-supplier-description"
                        className="dsm-description"
                    >
                        You are about to permanently delete{' '}
                        <strong>
                            {supplier.name}
                        </strong>
                        . This action cannot be undone.
                    </p>

                    <div className="dsm-warning">
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
                            Deleting this supplier will
                            permanently remove it and its
                            related records from the system.
                        </span>
                    </div>

                    {errorMessage && (
                        <div
                            className="dsm-alert"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}
                </div>

                <footer className="dsm-actions">
                    <button
                        type="button"
                        className="dsm-secondary-button"
                        disabled={isDeleting}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="dsm-danger-button"
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