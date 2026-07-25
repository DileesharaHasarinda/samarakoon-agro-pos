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
        field:
            keyof ReceivePurchaseItemValues,
        value: string,
    ) => void;

    onClose: () => void;

    onSubmit: (
        event: FormEvent<HTMLFormElement>,
    ) => void;
}

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
        <div className="modal-backdrop">
            <section className="receive-stock-modal">
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Stock intake
                        </span>

                        <h2>
                            Receive{' '}
                            {purchase.purchase_number}
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
                    className="receive-stock-form"
                    onSubmit={onSubmit}
                >
                    {errorMessage && (
                        <div className="form-alert">
                            {errorMessage}
                        </div>
                    )}

                    <div className="receive-stock-message">
                        Each item creates a new,
                        separate price batch. Existing
                        quantities and prices will not
                        be changed.
                    </div>

                    {purchase.items.map(
                        (item, index) => (
                            <article
                                className="receive-item-card"
                                key={item.id}
                            >
                                <header>
                                    <div>
                                        <strong>
                                            {item.product.name}
                                        </strong>

                                        <span>
                                            {item.product
                                                .category.name}
                                            {' · '}
                                            {item.product.unit}
                                        </span>
                                    </div>

                                    <div>
                                        Ordered:{' '}
                                        <strong>
                                            {item.quantity}
                                        </strong>
                                    </div>
                                </header>

                                <div className="receive-item-grid">
                                    <label>
                                        <span>
                                            Receiving Quantity
                                        </span>

                                        <input
                                            type="number"
                                            step="0.001"
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

                                    <label>
                                        <span>Selling Price</span>

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
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

                                    <label>
                                        <span>Batch Number</span>

                                        <input
                                            type="text"
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

                                    <label>
                                        <span>
                                            Manufactured Date
                                        </span>

                                        <input
                                            type="date"
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

                                    <label>
                                        <span>Expiry Date</span>

                                        <input
                                            type="date"
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
                                ? 'Receiving...'
                                : 'Confirm Stock Intake'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}