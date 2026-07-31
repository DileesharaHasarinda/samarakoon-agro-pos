import {
    useEffect,
} from 'react';

import type {
    FormEvent,
} from 'react';

import type {
    Purchase,
    ReceivePurchaseItemValues,
} from '../../types/purchase';

interface ReceiveStockModalProps {
    purchase: Purchase | null;
    values: ReceivePurchaseItemValues[];
    isSubmitting: boolean;
    errorMessage: string;

    onChange: (
        index: number,
        field: keyof ReceivePurchaseItemValues,
        value: string,
    ) => void;

    onClose: () => void;

    onSubmit: (
        event: FormEvent<HTMLFormElement>,
    ) => void;
}

const receiveStockModalStyles = `
    #sapo-receive-stock-modal,
    #sapo-receive-stock-modal *,
    #sapo-receive-stock-modal *::before,
    #sapo-receive-stock-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-receive-stock-modal {
        --rsm-green-800: #166534;
        --rsm-green-700: #15803d;
        --rsm-green-50: #f0fdf4;
        --rsm-blue-700: #175cd3;
        --rsm-blue-50: #eff8ff;
        --rsm-red: #dc2626;
        --rsm-red-light: #fef2f2;
        --rsm-text: #111827;
        --rsm-text-secondary: #1f2937;
        --rsm-muted: #6b7280;
        --rsm-border: #e5e7eb;
        --rsm-border-strong: #d1d5db;
        --rsm-bg: #f9fafb;
        --rsm-white: #ffffff;
        --rsm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

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
        font-family: var(--rsm-font) !important;
        color: var(--rsm-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }

    #sapo-receive-stock-modal h2,
    #sapo-receive-stock-modal p,
    #sapo-receive-stock-modal span,
    #sapo-receive-stock-modal strong,
    #sapo-receive-stock-modal small,
    #sapo-receive-stock-modal label,
    #sapo-receive-stock-modal button,
    #sapo-receive-stock-modal input {
        font-family: var(--rsm-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-receive-stock-modal h2,
    #sapo-receive-stock-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Modal shell ---------- */
    #sapo-receive-stock-modal .rsm-modal {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 760px !important;
        max-height: calc(100vh - 48px) !important;
        max-height: calc(100dvh - 48px) !important;
        background: var(--rsm-white) !important;
        border-radius: 14px !important;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.22) !important;
        overflow: hidden !important;
        animation: rsm-pop-in 0.15s ease-out !important;
    }

    @keyframes rsm-pop-in {
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
    #sapo-receive-stock-modal .rsm-header {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 22px 26px !important;
        background: var(--rsm-white) !important;
        border-bottom: 1px solid var(--rsm-border) !important;
    }

    #sapo-receive-stock-modal .rsm-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--rsm-green-700) !important;
        margin-bottom: 4px !important;
        background: transparent !important;
    }

    #sapo-receive-stock-modal .rsm-header h2 {
        font-size: 19px !important;
        font-weight: 700 !important;
        color: var(--rsm-text) !important;
    }

    #sapo-receive-stock-modal .rsm-close-button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 34px !important;
        height: 34px !important;
        flex-shrink: 0 !important;
        font-size: 20px !important;
        line-height: 1 !important;
        color: var(--rsm-muted) !important;
        background: var(--rsm-bg) !important;
        border: 1px solid var(--rsm-border) !important;
        border-radius: 9px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-receive-stock-modal .rsm-close-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        color: var(--rsm-text) !important;
    }

    #sapo-receive-stock-modal .rsm-close-button:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Scrollable form body ---------- */
    #sapo-receive-stock-modal .rsm-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        min-height: 0 !important;
        padding: 22px 26px !important;
        overflow-y: auto !important;
        background: var(--rsm-bg) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--rsm-border-strong) transparent !important;
    }

    #sapo-receive-stock-modal .rsm-form::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-receive-stock-modal .rsm-form::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-receive-stock-modal .rsm-form::-webkit-scrollbar-thumb {
        background: var(--rsm-border-strong) !important;
        border-radius: 8px !important;
    }

    /* ---------- Alert ---------- */
    #sapo-receive-stock-modal .rsm-alert {
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        background: var(--rsm-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Info notice ---------- */
    #sapo-receive-stock-modal .rsm-notice {
        display: flex !important;
        align-items: flex-start !important;
        gap: 9px !important;
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 12.5px !important;
        font-weight: 500 !important;
        line-height: 1.5 !important;
        color: var(--rsm-blue-700) !important;
        background: var(--rsm-blue-50) !important;
        border: 1px solid #b6d8f7 !important;
    }

    #sapo-receive-stock-modal .rsm-notice svg {
        width: 17px !important;
        height: 17px !important;
        min-width: 17px !important;
        margin-top: 1px !important;
    }

    /* ---------- Item cards ---------- */
    #sapo-receive-stock-modal .rsm-items-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 14px !important;
    }

    #sapo-receive-stock-modal .rsm-item-card {
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        background: var(--rsm-white) !important;
        border: 1px solid var(--rsm-border) !important;
        border-radius: 12px !important;
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04) !important;
    }

    #sapo-receive-stock-modal .rsm-item-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 14px !important;
        padding: 14px 18px !important;
        background: var(--rsm-green-50) !important;
        border-bottom: 1px solid #d3ecda !important;
    }

    #sapo-receive-stock-modal .rsm-item-identity {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
        min-width: 0 !important;
    }

    #sapo-receive-stock-modal .rsm-item-name {
        font-size: 15px !important;
        font-weight: 700 !important;
        color: var(--rsm-text) !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-receive-stock-modal .rsm-item-meta {
        font-size: 12.5px !important;
        color: var(--rsm-muted) !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-receive-stock-modal .rsm-item-ordered {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-end !important;
        gap: 1px !important;
        flex-shrink: 0 !important;
        white-space: nowrap !important;
    }

    #sapo-receive-stock-modal .rsm-item-ordered-label {
        font-size: 11.5px !important;
        font-weight: 600 !important;
        letter-spacing: 0.02em !important;
        text-transform: uppercase !important;
        color: var(--rsm-green-700) !important;
    }

    #sapo-receive-stock-modal .rsm-item-ordered-value {
        font-size: 15px !important;
        font-weight: 700 !important;
        color: var(--rsm-text) !important;
    }

    #sapo-receive-stock-modal .rsm-item-grid {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 14px 16px !important;
        padding: 16px 18px !important;
    }

    #sapo-receive-stock-modal .rsm-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        min-width: 0 !important;
    }

    #sapo-receive-stock-modal .rsm-field span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--rsm-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-receive-stock-modal .rsm-field input {
        width: 100% !important;
        padding: 9px 12px !important;
        font-size: 13.5px !important;
        color: var(--rsm-text-secondary) !important;
        background: var(--rsm-white) !important;
        border: 1px solid var(--rsm-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-receive-stock-modal .rsm-field input:focus {
        border-color: var(--rsm-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-receive-stock-modal .rsm-field input:disabled {
        background: var(--rsm-bg) !important;
        color: var(--rsm-muted) !important;
        cursor: not-allowed !important;
    }

    /* ---------- Footer actions ---------- */
    #sapo-receive-stock-modal .rsm-actions {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        padding: 16px 26px !important;
        background: var(--rsm-white) !important;
        border-top: 1px solid var(--rsm-border) !important;
    }

    #sapo-receive-stock-modal .rsm-secondary-button {
        padding: 10px 20px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--rsm-white) !important;
        border: 1px solid var(--rsm-border-strong) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-receive-stock-modal .rsm-secondary-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        border-color: #9ca3af !important;
    }

    #sapo-receive-stock-modal .rsm-primary-button {
        padding: 10px 22px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        background: var(--rsm-green-700) !important;
        border: 1px solid var(--rsm-green-700) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease !important;
    }

    #sapo-receive-stock-modal .rsm-primary-button:hover:not(:disabled) {
        background: var(--rsm-green-800) !important;
    }

    #sapo-receive-stock-modal button:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 760px) {
        #sapo-receive-stock-modal .rsm-item-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
    }

    @media (max-width: 560px) {
        #sapo-receive-stock-modal {
            padding: 12px !important;
        }

        #sapo-receive-stock-modal .rsm-modal {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
        }

        #sapo-receive-stock-modal .rsm-header,
        #sapo-receive-stock-modal .rsm-form,
        #sapo-receive-stock-modal .rsm-actions {
            padding-left: 16px !important;
            padding-right: 16px !important;
        }

        #sapo-receive-stock-modal .rsm-item-grid {
            grid-template-columns: 1fr !important;
        }

        #sapo-receive-stock-modal .rsm-item-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
        }

        #sapo-receive-stock-modal .rsm-item-ordered {
            align-items: flex-start !important;
        }

        #sapo-receive-stock-modal .rsm-actions {
            flex-direction: column-reverse !important;
            align-items: stretch !important;
        }

        #sapo-receive-stock-modal .rsm-secondary-button,
        #sapo-receive-stock-modal .rsm-primary-button {
            width: 100% !important;
        }
    }
`;

export default function ReceiveStockModal({
    purchase,
    values,
    isSubmitting,
    errorMessage,
    onChange,
    onClose,
    onSubmit,
}: ReceiveStockModalProps) {
    useEffect(() => {
        if (!purchase) {
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
        purchase,
        isSubmitting,
        onClose,
    ]);

    if (
        !purchase
        || !purchase.items
    ) {
        return null;
    }

    return (
        <div
            id="sapo-receive-stock-modal"
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
                {receiveStockModalStyles}
            </style>

            <section
                className="rsm-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="receive-stock-title"
                onMouseDown={(event) => {
                    event.stopPropagation();
                }}
            >
                <header className="rsm-header">
                    <div>
                        <span className="rsm-kicker">
                            Stock Intake
                        </span>

                        <h2 id="receive-stock-title">
                            Receive {purchase.purchase_number}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="rsm-close-button"
                        aria-label="Close receive stock form"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="rsm-form"
                    onSubmit={onSubmit}
                >
                    {errorMessage && (
                        <div
                            className="rsm-alert"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}

                    <div
                        className="rsm-notice"
                        role="status"
                    >
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
                            <path d="M12 11v5M12 8h.01" />
                        </svg>

                        <span>
                            Each item creates a new, separate
                            price batch. Existing quantities
                            and prices will not be changed.
                        </span>
                    </div>

                    <div className="rsm-items-list">
                        {purchase.items.map(
                            (item, index) => (
                                <article
                                    className="rsm-item-card"
                                    key={item.id}
                                >
                                    <header className="rsm-item-header">
                                        <div className="rsm-item-identity">
                                            <strong
                                                className="rsm-item-name"
                                                title={item.product.name}
                                            >
                                                {item.product.name}
                                            </strong>

                                            <span className="rsm-item-meta">
                                                {item.product.category.name}
                                                {' · '}
                                                {item.product.unit}
                                            </span>
                                        </div>

                                        <div className="rsm-item-ordered">
                                            <span className="rsm-item-ordered-label">
                                                Ordered
                                            </span>

                                            <span className="rsm-item-ordered-value">
                                                {item.quantity}
                                            </span>
                                        </div>
                                    </header>

                                    <div className="rsm-item-grid">
                                        <label className="rsm-field">
                                            <span>
                                                Receiving Quantity
                                            </span>

                                            <input
                                                type="number"
                                                step="0.001"
                                                disabled={isSubmitting}
                                                value={
                                                    values[index]
                                                        ?.received_quantity
                                                    ?? ''
                                                }
                                                onChange={(event) => {
                                                    onChange(
                                                        index,
                                                        'received_quantity',
                                                        event.target.value,
                                                    );
                                                }}
                                            />
                                        </label>

                                        <label className="rsm-field">
                                            <span>
                                                Selling Price
                                            </span>

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                disabled={isSubmitting}
                                                value={
                                                    values[index]
                                                        ?.selling_price
                                                    ?? ''
                                                }
                                                onChange={(event) => {
                                                    onChange(
                                                        index,
                                                        'selling_price',
                                                        event.target.value,
                                                    );
                                                }}
                                            />
                                        </label>

                                        <label className="rsm-field">
                                            <span>
                                                Batch Number
                                            </span>

                                            <input
                                                type="text"
                                                disabled={isSubmitting}
                                                value={
                                                    values[index]
                                                        ?.batch_number
                                                    ?? ''
                                                }
                                                onChange={(event) => {
                                                    onChange(
                                                        index,
                                                        'batch_number',
                                                        event.target.value,
                                                    );
                                                }}
                                            />
                                        </label>

                                        <label className="rsm-field">
                                            <span>
                                                Manufactured Date
                                            </span>

                                            <input
                                                type="date"
                                                disabled={isSubmitting}
                                                value={
                                                    values[index]
                                                        ?.manufactured_date
                                                    ?? ''
                                                }
                                                onChange={(event) => {
                                                    onChange(
                                                        index,
                                                        'manufactured_date',
                                                        event.target.value,
                                                    );
                                                }}
                                            />
                                        </label>

                                        <label className="rsm-field">
                                            <span>
                                                Expiry Date
                                            </span>

                                            <input
                                                type="date"
                                                disabled={isSubmitting}
                                                value={
                                                    values[index]
                                                        ?.expiry_date
                                                    ?? ''
                                                }
                                                onChange={(event) => {
                                                    onChange(
                                                        index,
                                                        'expiry_date',
                                                        event.target.value,
                                                    );
                                                }}
                                            />
                                        </label>
                                    </div>
                                </article>
                            ),
                        )}
                    </div>

                    <footer className="rsm-actions">
                        <button
                            type="button"
                            className="rsm-secondary-button"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="rsm-primary-button"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Receiving...'
                                : 'Confirm Stock Intake'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}