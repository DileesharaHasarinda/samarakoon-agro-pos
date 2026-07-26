import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import type {
    PosPaymentMethod,
} from '../../types/sale';

import type {
    CreateSalesReturnValues,
    SalesReturnOptions,
} from '../../types/salesReturn';

interface ReturnItemValue {
    sale_item_id: number;
    quantity: string;
    restock: boolean;
}

interface CreateSalesReturnModalProps {
    saleId: number | null;
    options: SalesReturnOptions | null;
    isLoading: boolean;
    isSubmitting: boolean;
    errorMessage: string;
    onClose: () => void;

    onSubmit: (
        values: CreateSalesReturnValues,
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

function parsePaymentMethod(
    value: string,
): PosPaymentMethod {
    switch (value) {
        case 'card':
            return 'card';

        case 'bank_transfer':
            return 'bank_transfer';

        default:
            return 'cash';
    }
}

export default function CreateSalesReturnModal({
    saleId,
    options,
    isLoading,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: CreateSalesReturnModalProps) {
    const [
        reason,
        setReason,
    ] = useState('');

    const [
        refundMethod,
        setRefundMethod,
    ] = useState<PosPaymentMethod>(
        'cash',
    );

    const [
        notes,
        setNotes,
    ] = useState('');

    const [
        items,
        setItems,
    ] = useState<ReturnItemValue[]>(
        [],
    );

    const [
        localError,
        setLocalError,
    ] = useState('');

    useEffect(() => {
        if (!options) {
            return;
        }

        setReason('');
        setRefundMethod('cash');
        setNotes('');
        setLocalError('');

        setItems(
            options.items.map(
                (item) => ({
                    sale_item_id:
                        item.sale_item_id,

                    quantity: '',
                    restock: true,
                }),
            ),
        );
    }, [options]);

    useEffect(() => {
        if (saleId === null) {
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
        saleId,
        isSubmitting,
        onClose,
    ]);

    const estimatedRefund = useMemo(
        () => {
            if (!options) {
                return 0;
            }

            return items.reduce(
                (
                    total,
                    value,
                ) => {
                    const option =
                        options.items.find(
                            (item) =>
                                item.sale_item_id
                                === value.sale_item_id,
                        );

                    if (!option) {
                        return total;
                    }

                    const quantity =
                        Number(
                            value.quantity || 0,
                        );

                    if (
                        quantity <= 0
                        || option
                            .remaining_quantity
                        <= 0
                    ) {
                        return total;
                    }

                    const safeQuantity =
                        Math.min(
                            quantity,
                            option
                                .remaining_quantity,
                        );

                    return total
                        + (
                            option
                                .remaining_refund_amount
                            * safeQuantity
                            / option
                                .remaining_quantity
                        );
                },
                0,
            );
        },
        [
            items,
            options,
        ],
    );

    if (saleId === null) {
        return null;
    }

    const updateQuantity = (
        saleItemId: number,
        value: string,
    ): void => {
        setItems(
            (current) =>
                current.map(
                    (item) =>
                        item.sale_item_id
                            === saleItemId
                            ? {
                                ...item,
                                quantity: value,
                            }
                            : item,
                ),
        );

        setLocalError('');
    };

    const updateRestock = (
        saleItemId: number,
        checked: boolean,
    ): void => {
        setItems(
            (current) =>
                current.map(
                    (item) =>
                        item.sale_item_id
                            === saleItemId
                            ? {
                                ...item,
                                restock: checked,
                            }
                            : item,
                ),
        );

        setLocalError('');
    };

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (!options) {
            setLocalError(
                'Return details are not available.',
            );

            return;
        }

        if (!reason.trim()) {
            setLocalError(
                'Please enter the reason for the return.',
            );

            return;
        }

        const selectedItems = items
            .filter(
                (item) =>
                    Number(item.quantity) > 0,
            )
            .map(
                (item) => ({
                    sale_item_id:
                        item.sale_item_id,

                    quantity:
                        Number(item.quantity),

                    restock:
                        item.restock,
                }),
            );

        if (
            selectedItems.length === 0
        ) {
            setLocalError(
                'Enter a return quantity for at least one item.',
            );

            return;
        }

        for (
            const selectedItem
            of selectedItems
        ) {
            const option =
                options.items.find(
                    (item) =>
                        item.sale_item_id
                        === selectedItem
                            .sale_item_id,
                );

            if (!option) {
                setLocalError(
                    'One of the selected return items is no longer available.',
                );

                return;
            }

            if (
                selectedItem.quantity <= 0
                || selectedItem.quantity
                > option.remaining_quantity
            ) {
                setLocalError(
                    `Only ${option.remaining_quantity} ${option.product.unit} can be returned for ${option.product.name}.`,
                );

                return;
            }
        }

        onSubmit({
            reason: reason.trim(),
            refund_method:
                refundMethod,

            notes: notes.trim(),
            items: selectedItems,
        });
    };

    return (
        <div className="modal-backdrop">
            <section
                className="create-return-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-sales-return-title"
            >
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Sales return
                        </span>

                        <h2 id="create-sales-return-title">
                            {options
                                ? options.sale
                                    .sale_number
                                : 'Process Return'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="modal-close-button"
                        disabled={isSubmitting}
                        aria-label="Close return modal"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                {isLoading ? (
                    <div className="return-modal-state">
                        <div className="small-spinner" />

                        <span>
                            Loading returnable items...
                        </span>
                    </div>
                ) : options ? (
                    <form
                        className="create-return-form"
                        onSubmit={handleSubmit}
                    >
                        {(localError
                            || errorMessage) && (
                                <div
                                    className="form-alert"
                                    role="alert"
                                >
                                    {localError
                                        || errorMessage}
                                </div>
                            )}

                        {!options
                            .has_returnable_items && (
                                <div className="return-no-items">
                                    All items from this sale
                                    have already been returned.
                                </div>
                            )}

                        <section className="return-form-details">
                            <label>
                                <span>
                                    Return Reason *
                                </span>

                                <input
                                    type="text"
                                    maxLength={255}
                                    value={reason}
                                    disabled={isSubmitting}
                                    placeholder="Example: Wrong product or customer changed mind"
                                    onChange={(event) => {
                                        setReason(
                                            event.target.value,
                                        );

                                        setLocalError('');
                                    }}
                                />
                            </label>

                            <label>
                                <span>
                                    Refund Method *
                                </span>

                                <select
                                    value={refundMethod}
                                    disabled={isSubmitting}
                                    onChange={(event) => {
                                        setRefundMethod(
                                            parsePaymentMethod(
                                                event.target.value,
                                            ),
                                        );
                                    }}
                                >
                                    <option value="cash">
                                        Cash
                                    </option>

                                    <option value="card">
                                        Card
                                    </option>

                                    <option value="bank_transfer">
                                        Bank Transfer
                                    </option>
                                </select>
                            </label>

                            <label className="return-notes-field">
                                <span>Notes</span>

                                <textarea
                                    rows={2}
                                    maxLength={1500}
                                    value={notes}
                                    disabled={isSubmitting}
                                    placeholder="Optional additional information"
                                    onChange={(event) => {
                                        setNotes(
                                            event.target.value,
                                        );
                                    }}
                                />
                            </label>
                        </section>

                        <section className="return-items-section">
                            <header>
                                <div>
                                    <h3>
                                        Select Returned Items
                                    </h3>

                                    <p>
                                        Returned stock is
                                        restored to its exact
                                        original batch.
                                    </p>
                                </div>
                            </header>

                            <div className="return-items-list">
                                {options.items.map(
                                    (option) => {
                                        const itemValue =
                                            items.find(
                                                (item) =>
                                                    item.sale_item_id
                                                    === option
                                                        .sale_item_id,
                                            );

                                        const isFullyReturned =
                                            option
                                                .remaining_quantity
                                            <= 0;

                                        return (
                                            <article
                                                key={
                                                    option
                                                        .sale_item_id
                                                }
                                                className={
                                                    isFullyReturned
                                                        ? 'return-item-card fully-returned'
                                                        : 'return-item-card'
                                                }
                                            >
                                                <header>
                                                    <div>
                                                        <strong>
                                                            {
                                                                option
                                                                    .product
                                                                    .name
                                                            }
                                                        </strong>

                                                        <span>
                                                            Batch:{' '}
                                                            {option
                                                                .batch
                                                                .batch_number
                                                                || option
                                                                    .batch
                                                                    .batch_code}
                                                        </span>
                                                    </div>

                                                    <strong>
                                                        {currencyFormatter
                                                            .format(
                                                                option
                                                                    .selling_price,
                                                            )}
                                                    </strong>
                                                </header>

                                                <div className="return-item-quantities">
                                                    <div>
                                                        <span>
                                                            Sold
                                                        </span>

                                                        <strong>
                                                            {
                                                                option
                                                                    .sold_quantity
                                                            }{' '}
                                                            {
                                                                option
                                                                    .product
                                                                    .unit
                                                            }
                                                        </strong>
                                                    </div>

                                                    <div>
                                                        <span>
                                                            Previously Returned
                                                        </span>

                                                        <strong>
                                                            {
                                                                option
                                                                    .returned_quantity
                                                            }
                                                        </strong>
                                                    </div>

                                                    <div>
                                                        <span>
                                                            Available to Return
                                                        </span>

                                                        <strong>
                                                            {
                                                                option
                                                                    .remaining_quantity
                                                            }
                                                        </strong>
                                                    </div>

                                                    <div>
                                                        <span>
                                                            Remaining Refund
                                                        </span>

                                                        <strong>
                                                            {currencyFormatter
                                                                .format(
                                                                    option
                                                                        .remaining_refund_amount,
                                                                )}
                                                        </strong>
                                                    </div>
                                                </div>

                                                <div className="return-item-controls">
                                                    <label>
                                                        <span>
                                                            Return Quantity
                                                        </span>

                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={
                                                                option
                                                                    .remaining_quantity
                                                            }
                                                            step="0.001"
                                                            disabled={
                                                                isFullyReturned
                                                                || isSubmitting
                                                            }
                                                            value={
                                                                itemValue
                                                                    ?.quantity
                                                                ?? ''
                                                            }
                                                            placeholder="0"
                                                            onChange={(event) => {
                                                                updateQuantity(
                                                                    option
                                                                        .sale_item_id,

                                                                    event
                                                                        .target
                                                                        .value,
                                                                );
                                                            }}
                                                        />
                                                    </label>

                                                    <label className="return-restock-option">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                itemValue
                                                                    ?.restock
                                                                ?? true
                                                            }
                                                            disabled={
                                                                isFullyReturned
                                                                || isSubmitting
                                                            }
                                                            onChange={(event) => {
                                                                updateRestock(
                                                                    option
                                                                        .sale_item_id,

                                                                    event
                                                                        .target
                                                                        .checked,
                                                                );
                                                            }}
                                                        />

                                                        <div>
                                                            <strong>
                                                                Restore to Stock
                                                            </strong>

                                                            <span>
                                                                Turn this off
                                                                for damaged or
                                                                unusable items.
                                                            </span>
                                                        </div>
                                                    </label>
                                                </div>
                                            </article>
                                        );
                                    },
                                )}
                            </div>
                        </section>

                        <div className="return-refund-preview">
                            <span>
                                Estimated Refund
                            </span>

                            <strong>
                                {currencyFormatter
                                    .format(
                                        estimatedRefund,
                                    )}
                            </strong>

                            <small>
                                The server calculates the
                                final exact refund using
                                original discounts.
                            </small>
                        </div>

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
                                disabled={
                                    isSubmitting
                                    || !options
                                        .has_returnable_items
                                }
                            >
                                {isSubmitting
                                    ? 'Processing Return...'
                                    : 'Complete Return'}
                            </button>
                        </footer>
                    </form>
                ) : (
                    <div className="return-modal-state">
                        <strong>
                            Unable to load return details.
                        </strong>

                        {errorMessage && (
                            <span>
                                {errorMessage}
                            </span>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}