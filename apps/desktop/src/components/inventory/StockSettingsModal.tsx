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
        <div className="modal-backdrop">
            <section className="stock-settings-modal">
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Stock alerts
                        </span>

                        <h2>
                            {product.name}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="modal-close-button"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="stock-settings-form"
                    onSubmit={handleSubmit}
                >
                    {(localError
                        || errorMessage) && (
                            <div className="form-alert">
                                {localError
                                    || errorMessage}
                            </div>
                        )}

                    <label>
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

                    <label>
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
                    </label>

                    <label>
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
                                : 'Save Settings'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}