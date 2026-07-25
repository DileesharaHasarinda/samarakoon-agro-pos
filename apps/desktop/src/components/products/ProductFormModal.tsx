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
    ProductCategory,
    ProductFormValues,
} from '../../types/product';

interface ProductFormModalProps {
    isOpen: boolean;
    isEditing: boolean;
    values: ProductFormValues;
    categories: ProductCategory[];
    isLoadingCategories: boolean;
    isSubmitting: boolean;
    errorMessage: string;
    fieldErrors: ValidationErrors;

    onChange: (
        field: keyof ProductFormValues,
        value: string,
    ) => void;

    onClose: () => void;

    onSubmit: (
        event: FormEvent<HTMLFormElement>,
    ) => void;
}

const units = [
    'Piece',
    'Packet',
    'Bottle',
    'Bag',
    'Kilogram',
    'Gram',
    'Litre',
    'Millilitre',
    'Box',
    'Metre',
    'Roll',
    'Set',
];

export default function ProductFormModal({
    isOpen,
    isEditing,
    values,
    categories,
    isLoadingCategories,
    isSubmitting,
    errorMessage,
    fieldErrors,
    onChange,
    onClose,
    onSubmit,
}: ProductFormModalProps) {
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

    const hasSelectedCategory =
        values.category_id !== '';

    const getFieldError = (
        field: string,
    ): string | undefined =>
        fieldErrors[field]?.[0];

    return (
        <div
            className="modal-backdrop"
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
            <section
                className="product-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="product-modal-title"
            >
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Product management
                        </span>

                        <h2 id="product-modal-title">
                            {isEditing
                                ? 'Edit Product'
                                : 'Add Product'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="modal-close-button"
                        aria-label="Close product form"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="product-form"
                    onSubmit={onSubmit}
                >
                    {errorMessage && (
                        <div
                            className="form-alert"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}

                    <div className="category-first-section">
                        <label>
                            <span>
                                Select Category First
                                <strong> *</strong>
                            </span>

                            <select
                                value={values.category_id}
                                autoFocus
                                disabled={
                                    isSubmitting
                                    || isLoadingCategories
                                }
                                className={
                                    getFieldError(
                                        'category_id',
                                    )
                                        ? 'input-error'
                                        : ''
                                }
                                onChange={(event) => {
                                    onChange(
                                        'category_id',
                                        event.target.value,
                                    );
                                }}
                            >
                                <option value="">
                                    {isLoadingCategories
                                        ? 'Loading categories...'
                                        : 'Select a category'}
                                </option>

                                {categories.map(
                                    (category) => (
                                        <option
                                            key={category.id}
                                            value={category.id}
                                        >
                                            {category.name}
                                        </option>
                                    ),
                                )}
                            </select>

                            {getFieldError(
                                'category_id',
                            ) && (
                                    <p className="field-error">
                                        {getFieldError(
                                            'category_id',
                                        )}
                                    </p>
                                )}
                        </label>
                    </div>

                    {!hasSelectedCategory && (
                        <div className="category-required-notice">
                            <strong>
                                Select a category to continue
                            </strong>

                            <span>
                                The remaining product
                                fields will become available
                                after selecting a category.
                            </span>
                        </div>
                    )}

                    <fieldset
                        className="product-fields"
                        disabled={
                            !hasSelectedCategory
                            || isSubmitting
                        }
                    >
                        <div className="product-form-grid">
                            <label className="full-width-field">
                                <span>
                                    Product Name
                                    <strong> *</strong>
                                </span>

                                <input
                                    type="text"
                                    value={values.name}
                                    maxLength={160}
                                    placeholder="Example: Urea Fertilizer 50kg"
                                    className={
                                        getFieldError('name')
                                            ? 'input-error'
                                            : ''
                                    }
                                    onChange={(event) => {
                                        onChange(
                                            'name',
                                            event.target.value,
                                        );
                                    }}
                                />

                                <small>
                                    {values.name.length}/160
                                </small>

                                {getFieldError('name') && (
                                    <p className="field-error">
                                        {getFieldError('name')}
                                    </p>
                                )}
                            </label>

                            <label>
                                <span>
                                    Unit
                                    <strong> *</strong>
                                </span>

                                <select
                                    value={values.unit}
                                    className={
                                        getFieldError('unit')
                                            ? 'input-error'
                                            : ''
                                    }
                                    onChange={(event) => {
                                        onChange(
                                            'unit',
                                            event.target.value,
                                        );
                                    }}
                                >
                                    <option value="">
                                        Select unit
                                    </option>

                                    {units.map(
                                        (unit) => (
                                            <option
                                                key={unit}
                                                value={unit}
                                            >
                                                {unit}
                                            </option>
                                        ),
                                    )}
                                </select>

                                {getFieldError('unit') && (
                                    <p className="field-error">
                                        {getFieldError('unit')}
                                    </p>
                                )}
                            </label>

                            <label>
                                <span>
                                    Expiry Date
                                    <em> Optional</em>
                                </span>

                                <input
                                    type="date"
                                    value={values.expiry_date}
                                    className={
                                        getFieldError(
                                            'expiry_date',
                                        )
                                            ? 'input-error'
                                            : ''
                                    }
                                    onChange={(event) => {
                                        onChange(
                                            'expiry_date',
                                            event.target.value,
                                        );
                                    }}
                                />

                                <small>
                                    Leave empty when the
                                    product has no expiry date.
                                </small>

                                {getFieldError(
                                    'expiry_date',
                                ) && (
                                        <p className="field-error">
                                            {getFieldError(
                                                'expiry_date',
                                            )}
                                        </p>
                                    )}
                            </label>

                            <label>
                                <span>
                                    Cost Price
                                    <strong> *</strong>
                                </span>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={values.cost_price}
                                    placeholder="0.00"
                                    className={
                                        getFieldError(
                                            'cost_price',
                                        )
                                            ? 'input-error'
                                            : ''
                                    }
                                    onChange={(event) => {
                                        onChange(
                                            'cost_price',
                                            event.target.value,
                                        );
                                    }}
                                />

                                {getFieldError(
                                    'cost_price',
                                ) && (
                                        <p className="field-error">
                                            {getFieldError(
                                                'cost_price',
                                            )}
                                        </p>
                                    )}
                            </label>

                            <label>
                                <span>
                                    Selling Price
                                    <strong> *</strong>
                                </span>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={
                                        values.selling_price
                                    }
                                    placeholder="0.00"
                                    className={
                                        getFieldError(
                                            'selling_price',
                                        )
                                            ? 'input-error'
                                            : ''
                                    }
                                    onChange={(event) => {
                                        onChange(
                                            'selling_price',
                                            event.target.value,
                                        );
                                    }}
                                />

                                {getFieldError(
                                    'selling_price',
                                ) && (
                                        <p className="field-error">
                                            {getFieldError(
                                                'selling_price',
                                            )}
                                        </p>
                                    )}
                            </label>

                            <label>
                                <span>
                                    Reorder Level
                                    <strong> *</strong>
                                </span>

                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={
                                        values.reorder_level
                                    }
                                    placeholder="0"
                                    className={
                                        getFieldError(
                                            'reorder_level',
                                        )
                                            ? 'input-error'
                                            : ''
                                    }
                                    onChange={(event) => {
                                        onChange(
                                            'reorder_level',
                                            event.target.value,
                                        );
                                    }}
                                />

                                <small>
                                    Minimum stock quantity
                                    before restocking.
                                </small>

                                {getFieldError(
                                    'reorder_level',
                                ) && (
                                        <p className="field-error">
                                            {getFieldError(
                                                'reorder_level',
                                            )}
                                        </p>
                                    )}
                            </label>

                            <label>
                                <span>
                                    SKU
                                    <em> Optional</em>
                                </span>

                                <input
                                    type="text"
                                    value={values.sku}
                                    maxLength={100}
                                    placeholder="Example: FER-001"
                                    className={
                                        getFieldError('sku')
                                            ? 'input-error'
                                            : ''
                                    }
                                    onChange={(event) => {
                                        onChange(
                                            'sku',
                                            event.target.value,
                                        );
                                    }}
                                />

                                {getFieldError('sku') && (
                                    <p className="field-error">
                                        {getFieldError('sku')}
                                    </p>
                                )}
                            </label>

                            <label>
                                <span>
                                    Barcode
                                    <em> Optional</em>
                                </span>

                                <input
                                    type="text"
                                    value={values.barcode}
                                    maxLength={120}
                                    placeholder="Scan or enter barcode"
                                    className={
                                        getFieldError('barcode')
                                            ? 'input-error'
                                            : ''
                                    }
                                    onChange={(event) => {
                                        onChange(
                                            'barcode',
                                            event.target.value,
                                        );
                                    }}
                                />

                                {getFieldError(
                                    'barcode',
                                ) && (
                                        <p className="field-error">
                                            {getFieldError(
                                                'barcode',
                                            )}
                                        </p>
                                    )}
                            </label>

                            <label className="full-width-field">
                                <span>
                                    Description
                                    <em> Optional</em>
                                </span>

                                <textarea
                                    value={values.description}
                                    maxLength={1500}
                                    rows={4}
                                    placeholder="Enter a short product description"
                                    className={
                                        getFieldError(
                                            'description',
                                        )
                                            ? 'input-error'
                                            : ''
                                    }
                                    onChange={(event) => {
                                        onChange(
                                            'description',
                                            event.target.value,
                                        );
                                    }}
                                />

                                <small>
                                    {
                                        values.description
                                            .length
                                    }
                                    /1500
                                </small>

                                {getFieldError(
                                    'description',
                                ) && (
                                        <p className="field-error">
                                            {getFieldError(
                                                'description',
                                            )}
                                        </p>
                                    )}
                            </label>
                        </div>
                    </fieldset>

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
                                || !hasSelectedCategory
                            }
                        >
                            {isSubmitting
                                ? 'Saving...'
                                : isEditing
                                    ? 'Update Product'
                                    : 'Add Product'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}