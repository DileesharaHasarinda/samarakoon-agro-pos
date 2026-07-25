import {
    useEffect,
} from 'react';

import type {
    FormEvent,
} from 'react';

import type {
    ValidationErrors,
} from '../../types/auth';

import type {
    PurchaseFormValues,
    PurchaseItemFormValues,
    PurchaseProductOption,
} from '../../types/purchase';

import type {
    SupplierOption,
} from '../../types/supplier';

interface PurchaseFormModalProps {
    isOpen: boolean;
    isEditing: boolean;
    values: PurchaseFormValues;
    suppliers: SupplierOption[];
    products: PurchaseProductOption[];
    isSubmitting: boolean;
    errorMessage: string;
    fieldErrors: ValidationErrors;

    onHeaderChange: (
        field: keyof Omit<
            PurchaseFormValues,
            'items'
        >,
        value: string | boolean,
    ) => void;

    onItemChange: (
        index: number,
        field: keyof PurchaseItemFormValues,
        value: string,
    ) => void;

    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
    onClose: () => void;

    onSubmit: (
        event: FormEvent<HTMLFormElement>,
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

export default function PurchaseFormModal({
    isOpen,
    isEditing,
    values,
    suppliers,
    products,
    isSubmitting,
    errorMessage,
    fieldErrors,
    onHeaderChange,
    onItemChange,
    onAddItem,
    onRemoveItem,
    onClose,
    onSubmit,
}: PurchaseFormModalProps) {
    useEffect(() => {
        if (!isOpen) {
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
        isOpen,
        isSubmitting,
        onClose,
    ]);

    if (!isOpen) {
        return null;
    }

    const itemSubtotal =
        values.items.reduce(
            (total, item) =>
                total
                + (
                    Number(item.quantity || 0)
                    * Number(
                        item.unit_cost || 0,
                    )
                ),
            0,
        );

    const itemDiscount =
        values.items.reduce(
            (total, item) =>
                total
                + Number(item.discount || 0),
            0,
        );

    const grandTotal =
        itemSubtotal
        - itemDiscount
        - Number(values.discount || 0)
        + Number(
            values.additional_cost || 0,
        );

    const getFieldError = (
        field: string,
    ): string | undefined =>
        fieldErrors[field]?.[0];

    return (
        <div className="modal-backdrop">
            <section
                className="purchase-modal"
                role="dialog"
                aria-modal="true"
            >
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Purchase management
                        </span>

                        <h2>
                            {isEditing
                                ? 'Edit Draft Purchase'
                                : 'Add Purchase'}
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
                    className="purchase-form"
                    onSubmit={onSubmit}
                >
                    {errorMessage && (
                        <div className="form-alert">
                            {errorMessage}
                        </div>
                    )}

                    <section className="purchase-form-section">
                        <h3>Purchase Information</h3>

                        <div className="purchase-header-grid">
                            <label>
                                <span>Supplier *</span>

                                <select
                                    value={values.supplier_id}
                                    disabled={isSubmitting}
                                    onChange={(event) => {
                                        onHeaderChange(
                                            'supplier_id',
                                            event.target.value,
                                        );
                                    }}
                                >
                                    <option value="">
                                        Select supplier
                                    </option>

                                    {suppliers.map(
                                        (supplier) => (
                                            <option
                                                key={supplier.id}
                                                value={supplier.id}
                                            >
                                                {supplier.name}
                                            </option>
                                        ),
                                    )}
                                </select>

                                {getFieldError(
                                    'supplier_id',
                                ) && (
                                        <p className="field-error">
                                            {getFieldError(
                                                'supplier_id',
                                            )}
                                        </p>
                                    )}
                            </label>

                            <label>
                                <span>Purchase Date *</span>

                                <input
                                    type="date"
                                    value={
                                        values.purchase_date
                                    }
                                    disabled={isSubmitting}
                                    onChange={(event) => {
                                        onHeaderChange(
                                            'purchase_date',
                                            event.target.value,
                                        );
                                    }}
                                />
                            </label>

                            <label>
                                <span>
                                    Supplier Invoice
                                </span>

                                <input
                                    type="text"
                                    value={
                                        values
                                            .supplier_invoice_number
                                    }
                                    maxLength={120}
                                    disabled={isSubmitting}
                                    placeholder="Optional"
                                    onChange={(event) => {
                                        onHeaderChange(
                                            'supplier_invoice_number',
                                            event.target.value,
                                        );
                                    }}
                                />
                            </label>

                            <label>
                                <span>Purchase Discount</span>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={values.discount}
                                    disabled={isSubmitting}
                                    onChange={(event) => {
                                        onHeaderChange(
                                            'discount',
                                            event.target.value,
                                        );
                                    }}
                                />
                            </label>

                            <label>
                                <span>Additional Cost</span>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={
                                        values.additional_cost
                                    }
                                    disabled={isSubmitting}
                                    onChange={(event) => {
                                        onHeaderChange(
                                            'additional_cost',
                                            event.target.value,
                                        );
                                    }}
                                />
                            </label>

                            <label className="purchase-notes-field">
                                <span>Notes</span>

                                <textarea
                                    rows={2}
                                    value={values.notes}
                                    disabled={isSubmitting}
                                    onChange={(event) => {
                                        onHeaderChange(
                                            'notes',
                                            event.target.value,
                                        );
                                    }}
                                />
                            </label>
                        </div>
                    </section>

                    <section className="purchase-form-section">
                        <div className="purchase-section-header">
                            <div>
                                <h3>Purchased Products</h3>

                                <p>
                                    Every row creates its own
                                    stock price batch when
                                    received.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={onAddItem}
                            >
                                + Add Product
                            </button>
                        </div>

                        <div className="purchase-items-container">
                            {values.items.map(
                                (item, index) => {
                                    const selectedProduct =
                                        products.find(
                                            (product) =>
                                                String(product.id)
                                                === item.product_id,
                                        );

                                    const lineTotal =
                                        (
                                            Number(
                                                item.quantity || 0,
                                            )
                                            * Number(
                                                item.unit_cost || 0,
                                            )
                                        )
                                        - Number(
                                            item.discount || 0,
                                        );

                                    return (
                                        <article
                                            className="purchase-item-card"
                                            key={item.row_id}
                                        >
                                            <header>
                                                <strong>
                                                    Item {index + 1}
                                                </strong>

                                                <button
                                                    type="button"
                                                    disabled={
                                                        values.items.length
                                                        === 1
                                                    }
                                                    onClick={() => {
                                                        onRemoveItem(index);
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </header>

                                            <div className="purchase-item-grid">
                                                <label className="purchase-product-field">
                                                    <span>Product *</span>

                                                    <select
                                                        value={
                                                            item.product_id
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            onItemChange(
                                                                index,
                                                                'product_id',
                                                                event
                                                                    .target
                                                                    .value,
                                                            );
                                                        }}
                                                    >
                                                        <option value="">
                                                            Select product
                                                        </option>

                                                        {products.map(
                                                            (product) => (
                                                                <option
                                                                    key={
                                                                        product.id
                                                                    }
                                                                    value={
                                                                        product.id
                                                                    }
                                                                >
                                                                    {
                                                                        product.name
                                                                    }
                                                                    {' — '}
                                                                    {
                                                                        product
                                                                            .category
                                                                            .name
                                                                    }
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>

                                                    <small>
                                                        Unit:{' '}
                                                        {selectedProduct
                                                            ?.unit
                                                            ?? '—'}
                                                    </small>
                                                </label>

                                                <label>
                                                    <span>Quantity *</span>

                                                    <input
                                                        type="number"
                                                        min="0.001"
                                                        step="0.001"
                                                        value={
                                                            item.quantity
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            onItemChange(
                                                                index,
                                                                'quantity',
                                                                event
                                                                    .target
                                                                    .value,
                                                            );
                                                        }}
                                                    />
                                                </label>

                                                <label>
                                                    <span>
                                                        Purchase Cost *
                                                    </span>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={
                                                            item.unit_cost
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            onItemChange(
                                                                index,
                                                                'unit_cost',
                                                                event
                                                                    .target
                                                                    .value,
                                                            );
                                                        }}
                                                    />
                                                </label>

                                                <label>
                                                    <span>
                                                        Selling Price *
                                                    </span>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={
                                                            item.selling_price
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            onItemChange(
                                                                index,
                                                                'selling_price',
                                                                event
                                                                    .target
                                                                    .value,
                                                            );
                                                        }}
                                                    />
                                                </label>

                                                <label>
                                                    <span>
                                                        Item Discount
                                                    </span>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={
                                                            item.discount
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            onItemChange(
                                                                index,
                                                                'discount',
                                                                event
                                                                    .target
                                                                    .value,
                                                            );
                                                        }}
                                                    />
                                                </label>

                                                <label>
                                                    <span>
                                                        Batch Number
                                                    </span>

                                                    <input
                                                        type="text"
                                                        value={
                                                            item.batch_number
                                                        }
                                                        placeholder="Optional"
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            onItemChange(
                                                                index,
                                                                'batch_number',
                                                                event
                                                                    .target
                                                                    .value,
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
                                                            item
                                                                .manufactured_date
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            onItemChange(
                                                                index,
                                                                'manufactured_date',
                                                                event
                                                                    .target
                                                                    .value,
                                                            );
                                                        }}
                                                    />
                                                </label>

                                                <label>
                                                    <span>
                                                        Expiry Date
                                                    </span>

                                                    <input
                                                        type="date"
                                                        value={
                                                            item.expiry_date
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            onItemChange(
                                                                index,
                                                                'expiry_date',
                                                                event
                                                                    .target
                                                                    .value,
                                                            );
                                                        }}
                                                    />
                                                </label>
                                            </div>

                                            <footer>
                                                <span>Line Total</span>

                                                <strong>
                                                    {currencyFormatter
                                                        .format(
                                                            Math.max(
                                                                0,
                                                                lineTotal,
                                                            ),
                                                        )}
                                                </strong>
                                            </footer>
                                        </article>
                                    );
                                },
                            )}
                        </div>
                    </section>

                    <section className="purchase-summary-panel">
                        <div>
                            <span>Subtotal</span>
                            <strong>
                                {currencyFormatter.format(
                                    itemSubtotal,
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Item Discounts</span>
                            <strong>
                                -
                                {currencyFormatter.format(
                                    itemDiscount,
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Purchase Discount</span>
                            <strong>
                                -
                                {currencyFormatter.format(
                                    Number(
                                        values.discount || 0,
                                    ),
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Additional Cost</span>
                            <strong>
                                {currencyFormatter.format(
                                    Number(
                                        values
                                            .additional_cost || 0,
                                    ),
                                )}
                            </strong>
                        </div>

                        <div className="purchase-grand-total">
                            <span>Grand Total</span>
                            <strong>
                                {currencyFormatter.format(
                                    Math.max(
                                        0,
                                        grandTotal,
                                    ),
                                )}
                            </strong>
                        </div>
                    </section>

                    <label className="receive-now-option">
                        <input
                            type="checkbox"
                            checked={values.receive_now}
                            disabled={isSubmitting}
                            onChange={(event) => {
                                onHeaderChange(
                                    'receive_now',
                                    event.target.checked,
                                );
                            }}
                        />

                        <div>
                            <strong>
                                Receive stock immediately
                            </strong>

                            <span>
                                Creates separate price
                                batches and makes stock
                                available immediately.
                            </span>
                        </div>
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
                                : values.receive_now
                                    ? 'Save & Receive Stock'
                                    : isEditing
                                        ? 'Update Draft'
                                        : 'Save as Draft'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}