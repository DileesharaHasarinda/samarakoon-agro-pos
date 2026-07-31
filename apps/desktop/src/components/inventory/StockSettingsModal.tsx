import {
    useEffect,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import type {
    InventoryAlertProduct,
    ProductStockSettingInput,
} from '../../types/inventoryAlert';

interface StockSettingsModalProps {
    product: InventoryAlertProduct | null;
    isSubmitting: boolean;
    errorMessage: string;
    onClose: () => void;

    onSubmit: (
        values: ProductStockSettingInput,
    ) => void;
}

const stockSettingsModalStyles = `
    #sapo-stock-settings-modal,
    #sapo-stock-settings-modal *,
    #sapo-stock-settings-modal *::before,
    #sapo-stock-settings-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-stock-settings-modal {
        --ssm-green-800: #166534;
        --ssm-green-700: #15803d;
        --ssm-red: #dc2626;
        --ssm-red-light: #fef2f2;
        --ssm-text: #111827;
        --ssm-text-secondary: #1f2937;
        --ssm-muted: #6b7280;
        --ssm-border: #e5e7eb;
        --ssm-border-strong: #d1d5db;
        --ssm-bg: #f9fafb;
        --ssm-white: #ffffff;
        --ssm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        inset: 0 !important;
        z-index: 1000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        margin: 0 !important;
        background: rgba(15, 23, 42, 0.35) !important;
        -webkit-backdrop-filter: blur(6px) saturate(120%) !important;
        backdrop-filter: blur(6px) saturate(120%) !important;
        font-family: var(--ssm-font) !important;
        color: var(--ssm-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }

    #sapo-stock-settings-modal h2,
    #sapo-stock-settings-modal p,
    #sapo-stock-settings-modal span,
    #sapo-stock-settings-modal strong,
    #sapo-stock-settings-modal small,
    #sapo-stock-settings-modal label,
    #sapo-stock-settings-modal button,
    #sapo-stock-settings-modal input {
        font-family: var(--ssm-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-stock-settings-modal h2,
    #sapo-stock-settings-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Modal shell (popup window) ---------- */
    #sapo-stock-settings-modal .ssm-modal {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 440px !important;
        max-height: calc(100vh - 48px) !important;
        max-height: calc(100dvh - 48px) !important;
        background: var(--ssm-white) !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2) !important;
        overflow: hidden !important;
        animation: ssm-pop-in 0.15s ease-out !important;
    }

    @keyframes ssm-pop-in {
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
    #sapo-stock-settings-modal .ssm-header {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 20px 24px !important;
        background: var(--ssm-white) !important;
        border-bottom: 1px solid var(--ssm-border) !important;
    }

    #sapo-stock-settings-modal .ssm-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--ssm-green-700) !important;
        margin-bottom: 4px !important;
        background: transparent !important;
    }

    #sapo-stock-settings-modal .ssm-header h2 {
        font-size: 17px !important;
        font-weight: 700 !important;
        color: var(--ssm-text) !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        max-width: 320px !important;
    }

    #sapo-stock-settings-modal .ssm-close-button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 32px !important;
        height: 32px !important;
        flex-shrink: 0 !important;
        font-size: 20px !important;
        line-height: 1 !important;
        color: var(--ssm-muted) !important;
        background: var(--ssm-bg) !important;
        border: 1px solid var(--ssm-border) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-stock-settings-modal .ssm-close-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        color: var(--ssm-text) !important;
    }

    #sapo-stock-settings-modal .ssm-close-button:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Scrollable form body ---------- */
    #sapo-stock-settings-modal .ssm-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        min-height: 0 !important;
        padding: 24px !important;
        overflow-y: auto !important;
        background: var(--ssm-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--ssm-border-strong) transparent !important;
    }

    #sapo-stock-settings-modal .ssm-form::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-stock-settings-modal .ssm-form::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-stock-settings-modal .ssm-form::-webkit-scrollbar-thumb {
        background: var(--ssm-border-strong) !important;
        border-radius: 8px !important;
    }

    /* ---------- Alert ---------- */
    #sapo-stock-settings-modal .ssm-alert {
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        background: var(--ssm-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Fields ---------- */
    #sapo-stock-settings-modal .ssm-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
    }

    #sapo-stock-settings-modal .ssm-field span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--ssm-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-stock-settings-modal .ssm-field input {
        width: 100% !important;
        padding: 9px 12px !important;
        font-size: 13.5px !important;
        color: var(--ssm-text-secondary) !important;
        background: var(--ssm-white) !important;
        border: 1px solid var(--ssm-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-stock-settings-modal .ssm-field input:focus {
        border-color: var(--ssm-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-stock-settings-modal .ssm-field input:disabled {
        background: var(--ssm-bg) !important;
        color: var(--ssm-muted) !important;
        cursor: not-allowed !important;
    }

    #sapo-stock-settings-modal .ssm-field small {
        font-size: 12px !important;
        color: var(--ssm-muted) !important;
        line-height: 1.4 !important;
        background: transparent !important;
    }

    /* ---------- Footer actions ---------- */
    #sapo-stock-settings-modal .ssm-actions {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        padding: 16px 24px !important;
        background: var(--ssm-bg) !important;
        border-top: 1px solid var(--ssm-border) !important;
    }

    #sapo-stock-settings-modal .ssm-secondary-button {
        padding: 9px 18px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--ssm-white) !important;
        border: 1px solid var(--ssm-border-strong) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-stock-settings-modal .ssm-secondary-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        border-color: #9ca3af !important;
    }

    #sapo-stock-settings-modal .ssm-primary-button {
        padding: 9px 18px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        background: var(--ssm-green-700) !important;
        border: 1px solid var(--ssm-green-700) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease !important;
    }

    #sapo-stock-settings-modal .ssm-primary-button:hover:not(:disabled) {
        background: var(--ssm-green-800) !important;
    }

    #sapo-stock-settings-modal button:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 480px) {
        #sapo-stock-settings-modal {
            padding: 12px !important;
        }

        #sapo-stock-settings-modal .ssm-modal {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
        }

        #sapo-stock-settings-modal .ssm-header,
        #sapo-stock-settings-modal .ssm-form,
        #sapo-stock-settings-modal .ssm-actions {
            padding-left: 16px !important;
            padding-right: 16px !important;
        }

        #sapo-stock-settings-modal .ssm-header h2 {
            max-width: 220px !important;
        }

        #sapo-stock-settings-modal .ssm-actions {
            flex-direction: column-reverse !important;
            align-items: stretch !important;
        }

        #sapo-stock-settings-modal .ssm-secondary-button,
        #sapo-stock-settings-modal .ssm-primary-button {
            width: 100% !important;
        }
    }
`;

export default function StockSettingsModal({
    product,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: StockSettingsModalProps) {
    const [
        minimumStock,
        setMinimumStock,
    ] = useState(0);

    const [
        reorderQuantity,
        setReorderQuantity,
    ] = useState(0);

    const [
        expiryAlertDays,
        setExpiryAlertDays,
    ] = useState(30);

    const [
        localError,
        setLocalError,
    ] = useState('');

    useEffect(() => {
        if (!product) {
            return;
        }

        setMinimumStock(
            product.minimum_stock_level,
        );

        setReorderQuantity(
            product.reorder_quantity,
        );

        setExpiryAlertDays(
            product.expiry_alert_days,
        );

        setLocalError('');
    }, [product]);

    if (!product) {
        return null;
    }

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (
            !Number.isFinite(minimumStock)
            || minimumStock < 0
        ) {
            setLocalError(
                'Enter a valid minimum stock level.',
            );

            return;
        }

        if (
            !Number.isFinite(reorderQuantity)
            || reorderQuantity < 0
        ) {
            setLocalError(
                'Enter a valid reorder quantity.',
            );

            return;
        }

        if (
            !Number.isInteger(expiryAlertDays)
            || expiryAlertDays < 1
        ) {
            setLocalError(
                'Expiry alert days must be at least one day.',
            );

            return;
        }

        onSubmit({
            minimum_stock_level:
                minimumStock,

            reorder_quantity:
                reorderQuantity,

            expiry_alert_days:
                expiryAlertDays,
        });
    };

    return (
        <div id="sapo-stock-settings-modal">
            <style>
                {stockSettingsModalStyles}
            </style>

            <section
                className="ssm-modal"
                role="dialog"
                aria-modal="true"
            >
                <header className="ssm-header">
                    <div>
                        <span className="ssm-kicker">
                            Stock alerts
                        </span>

                        <h2 title={product.name}>
                            {product.name}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="ssm-close-button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </header>

                <form
                    className="ssm-form"
                    onSubmit={handleSubmit}
                >
                    {(localError
                        || errorMessage) && (
                            <div className="ssm-alert">
                                {localError
                                    || errorMessage}
                            </div>
                        )}

                    <label className="ssm-field">
                        <span>
                            Minimum Stock Level
                        </span>

                        <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={minimumStock}
                            disabled={isSubmitting}
                            onChange={(event) => {
                                setMinimumStock(
                                    Number(
                                        event.target.value,
                                    ),
                                );

                                setLocalError('');
                            }}
                        />

                        <small>
                            The product becomes low
                            stock at or below this
                            quantity.
                        </small>
                    </label>

                    <label className="ssm-field">
                        <span>
                            Reorder Quantity
                        </span>

                        <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={reorderQuantity}
                            disabled={isSubmitting}
                            onChange={(event) => {
                                setReorderQuantity(
                                    Number(
                                        event.target.value,
                                    ),
                                );
                            }}
                        />

                        <small>
                            Suggested quantity to
                            reorder when restocking.
                        </small>
                    </label>

                    <label className="ssm-field">
                        <span>
                            Expiry Alert Days
                        </span>

                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={expiryAlertDays}
                            disabled={isSubmitting}
                            onChange={(event) => {
                                setExpiryAlertDays(
                                    Number(
                                        event.target.value,
                                    ),
                                );
                            }}
                        />

                        <small>
                            Days before expiry to
                            start showing alerts.
                        </small>
                    </label>

                    <footer className="ssm-actions">
                        <button
                            type="button"
                            className="ssm-secondary-button"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="ssm-primary-button"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Saving...'
                                : 'Save Settings'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}