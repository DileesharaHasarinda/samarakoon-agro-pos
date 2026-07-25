import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import type {
    PosProduct,
    PosStockBatch,
} from '../../types/sale';

interface BatchSelectionModalProps {
    product: PosProduct | null;

    onClose: () => void;

    onAdd: (
        product: PosProduct,
        batch: PosStockBatch,
        quantity: number,
    ) => void;
}

const currencyFormatter =
    new Intl.NumberFormat(
        'en-LK',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        },
    );

function formatDate(
    date: string | null,
): string {
    if (!date) {
        return 'No expiry';
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    ).format(
        new Date(`${date}T00:00:00`),
    );
}

export default function BatchSelectionModal({
    product,
    onClose,
    onAdd,
}: BatchSelectionModalProps) {
    const [
        selectedBatchId,
        setSelectedBatchId,
    ] = useState<number | null>(
        null,
    );

    const [
        quantity,
        setQuantity,
    ] = useState('1');

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    useEffect(() => {
        if (!product) {
            return;
        }

        setSelectedBatchId(
            product.batches[0]?.id
            ?? null,
        );

        setQuantity('1');
        setErrorMessage('');
    }, [product]);

    useEffect(() => {
        if (!product) {
            return;
        }

        const handleKeyDown = (
            event: KeyboardEvent,
        ): void => {
            if (event.key === 'Escape') {
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
        product,
        onClose,
    ]);

    const selectedBatch =
        useMemo(
            () =>
                product?.batches.find(
                    (batch) =>
                        batch.id
                        === selectedBatchId,
                ) ?? null,
            [
                product,
                selectedBatchId,
            ],
        );

    if (!product) {
        return null;
    }

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (!selectedBatch) {
            setErrorMessage(
                'Please select a price batch.',
            );

            return;
        }

        const parsedQuantity =
            Number(quantity);

        if (
            !Number.isFinite(
                parsedQuantity,
            )
            || parsedQuantity <= 0
        ) {
            setErrorMessage(
                'Enter a valid quantity greater than zero.',
            );

            return;
        }

        if (
            parsedQuantity
            > selectedBatch
                .available_quantity
        ) {
            setErrorMessage(
                `Only ${selectedBatch.available_quantity} ${product.unit} are available at this price.`,
            );

            return;
        }

        onAdd(
            product,
            selectedBatch,
            parsedQuantity,
        );
    };

    return (
        <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target
                    === event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <section
                className="pos-batch-modal"
                role="dialog"
                aria-modal="true"
            >
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Select price and stock
                        </span>

                        <h2>{product.name}</h2>

                        <p>
                            Total available:{' '}
                            <strong>
                                {
                                    product
                                        .total_available_quantity
                                }{' '}
                                {product.unit}
                            </strong>
                        </p>
                    </div>

                    <button
                        type="button"
                        className="modal-close-button"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="pos-batch-form"
                    onSubmit={handleSubmit}
                >
                    {errorMessage && (
                        <div
                            className="form-alert"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}

                    <div className="pos-batch-list">
                        {product.batches.map(
                            (batch) => (
                                <label
                                    className={
                                        selectedBatchId
                                            === batch.id
                                            ? 'pos-batch-option selected'
                                            : 'pos-batch-option'
                                    }
                                    key={batch.id}
                                >
                                    <input
                                        type="radio"
                                        name="stock_batch"
                                        value={batch.id}
                                        checked={
                                            selectedBatchId
                                            === batch.id
                                        }
                                        onChange={() => {
                                            setSelectedBatchId(
                                                batch.id,
                                            );

                                            setQuantity('1');
                                            setErrorMessage('');
                                        }}
                                    />

                                    <div className="pos-batch-price">
                                        <span>
                                            Selling Price
                                        </span>

                                        <strong>
                                            {currencyFormatter
                                                .format(
                                                    batch
                                                        .selling_price,
                                                )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Available</span>

                                        <strong>
                                            {
                                                batch
                                                    .available_quantity
                                            }{' '}
                                            {product.unit}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Batch</span>

                                        <strong>
                                            {batch.batch_number
                                                || batch.batch_code}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Expiry</span>

                                        <strong>
                                            {formatDate(
                                                batch.expiry_date,
                                            )}
                                        </strong>
                                    </div>
                                </label>
                            ),
                        )}
                    </div>

                    <label className="pos-quantity-control">
                        <span>
                            Quantity
                        </span>

                        <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={quantity}
                            onChange={(event) => {
                                setQuantity(
                                    event.target.value,
                                );

                                setErrorMessage('');
                            }}
                        />

                        <small>
                            Maximum:{' '}
                            {selectedBatch
                                ?.available_quantity
                                ?? 0}{' '}
                            {product.unit}
                        </small>
                    </label>

                    {selectedBatch && (
                        <div className="pos-line-preview">
                            <span>
                                Item total
                            </span>

                            <strong>
                                {currencyFormatter
                                    .format(
                                        Number(
                                            quantity || 0,
                                        )
                                        * selectedBatch
                                            .selling_price,
                                    )}
                            </strong>
                        </div>
                    )}

                    <footer className="modal-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={!selectedBatch}
                        >
                            Add to Cart
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}