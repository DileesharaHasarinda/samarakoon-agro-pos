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
} from '../../types/product';

/**
 * Kept inside this component because the current
 * types/product.ts file does not export ProductFormValues.
 */
export interface ProductFormValues {
    category_id: string;
    name: string;
    unit: string;
    expiry_date: string;
    cost_price: string;
    selling_price: string;
    reorder_level: string;
    sku: string;
    barcode: string;
    description: string;
}

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

const productFormModalStyles = `
    #agro-product-form-modal,
    #agro-product-form-modal *,
    #agro-product-form-modal *::before,
    #agro-product-form-modal *::after {
        box-sizing: border-box !important;
    }

    #agro-product-form-modal {
        --pfm-green: #15803d;
        --pfm-dark-green: #14532d;
        --pfm-light-green: #f0fdf4;
        --pfm-text: #17231b;
        --pfm-muted: #5e6c63;
        --pfm-border: #cbd8ce;
        --pfm-danger: #b42318;
        --pfm-danger-light: #fff1f0;
        --pfm-white: #ffffff;

        position: fixed !important;
        inset: 0 !important;
        z-index: 99999 !important;

        display: flex !important;
        align-items: flex-start !important;
        justify-content: center !important;

        width: 100% !important;
        height: 100% !important;

        margin: 0 !important;
        padding: 30px 18px !important;

        overflow-x: hidden !important;
        overflow-y: auto !important;

        color: var(--pfm-text) !important;
        font-family:
            Arial,
            Helvetica,
            sans-serif !important;

        background: rgba(10, 25, 16, 0.66) !important;
        backdrop-filter: blur(3px) !important;
    }

    #agro-product-form-modal h2,
    #agro-product-form-modal h3,
    #agro-product-form-modal p,
    #agro-product-form-modal span,
    #agro-product-form-modal strong,
    #agro-product-form-modal small,
    #agro-product-form-modal em,
    #agro-product-form-modal label,
    #agro-product-form-modal button,
    #agro-product-form-modal input,
    #agro-product-form-modal select,
    #agro-product-form-modal textarea {
        font-family:
            Arial,
            Helvetica,
            sans-serif !important;
    }

    #agro-product-form-modal h2,
    #agro-product-form-modal h3,
    #agro-product-form-modal p {
        margin: 0 !important;
    }

    #agro-product-form-modal button,
    #agro-product-form-modal input,
    #agro-product-form-modal select,
    #agro-product-form-modal textarea {
        text-transform: none !important;
        letter-spacing: normal !important;
    }

    #agro-product-form-modal
    .pfm-dialog {
        display: flex !important;
        width: min(900px, 100%) !important;
        max-height: calc(100vh - 60px) !important;
        max-height: calc(100dvh - 60px) !important;
        flex-direction: column !important;

        margin: 0 auto !important;
        padding: 0 !important;

        overflow: hidden !important;

        background: var(--pfm-white) !important;
        border: 2px solid var(--pfm-border) !important;
        border-radius: 16px !important;

        box-shadow:
            0 28px 70px
            rgba(0, 0, 0, 0.28) !important;
    }

    #agro-product-form-modal
    .pfm-header {
        display: flex !important;
        min-height: 92px !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 20px !important;

        margin: 0 !important;
        padding: 18px 22px !important;

        background:
            linear-gradient(
                135deg,
                var(--pfm-dark-green),
                var(--pfm-green)
            ) !important;

        border: 0 !important;
    }

    #agro-product-form-modal
    .pfm-header-copy {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 4px !important;

        margin: 0 !important;
        padding: 0 !important;
    }

    #agro-product-form-modal
    .pfm-kicker {
        display: block !important;

        margin: 0 !important;
        padding: 0 !important;

        color: #d8f7e1 !important;
        font-size: 14px !important;
        font-weight: 900 !important;
        line-height: 1.2 !important;
        text-transform: uppercase !important;
    }

    #agro-product-form-modal
    .pfm-title {
        display: block !important;

        margin: 0 !important;
        padding: 0 !important;

        color: #ffffff !important;
        font-size: 28px !important;
        font-weight: 900 !important;
        line-height: 1.2 !important;
    }

    #agro-product-form-modal
    .pfm-close-button {
        display: grid !important;
        width: 46px !important;
        height: 46px !important;
        min-width: 46px !important;
        place-items: center !important;

        margin: 0 !important;
        padding: 0 0 4px !important;

        color: #ffffff !important;
        font-size: 31px !important;
        font-weight: 500 !important;
        line-height: 1 !important;

        appearance: none !important;
        background: rgba(255, 255, 255, 0.14) !important;
        border: 2px solid rgba(255, 255, 255, 0.42) !important;
        border-radius: 10px !important;

        cursor: pointer !important;
    }

    #agro-product-form-modal
    .pfm-close-button:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.25) !important;
    }

    #agro-product-form-modal
    .pfm-form {
        display: flex !important;
        min-height: 0 !important;
        flex: 1 1 auto !important;
        flex-direction: column !important;

        margin: 0 !important;
        padding: 0 !important;

        overflow: hidden !important;
    }

    #agro-product-form-modal
    .pfm-form-content {
        display: flex !important;
        min-height: 0 !important;
        flex: 1 1 auto !important;
        flex-direction: column !important;
        gap: 18px !important;

        margin: 0 !important;
        padding: 20px 22px 25px !important;

        overflow-x: hidden !important;
        overflow-y: auto !important;

        background: #f7faf8 !important;
    }

    #agro-product-form-modal
    .pfm-alert {
        display: block !important;
        width: 100% !important;

        margin: 0 !important;
        padding: 13px 15px !important;

        color: var(--pfm-danger) !important;
        font-size: 16px !important;
        font-weight: 800 !important;
        line-height: 1.45 !important;

        background: var(--pfm-danger-light) !important;
        border: 2px solid #efb8b3 !important;
        border-radius: 10px !important;
    }

    #agro-product-form-modal
    .pfm-category-section {
        display: flex !important;
        width: 100% !important;
        flex-direction: column !important;
        gap: 12px !important;

        margin: 0 !important;
        padding: 18px !important;

        background: var(--pfm-light-green) !important;
        border: 3px solid #86c99b !important;
        border-radius: 13px !important;
    }

    #agro-product-form-modal
    .pfm-category-heading {
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;

        margin: 0 !important;
        padding: 0 !important;
    }

    #agro-product-form-modal
    .pfm-category-heading strong {
        display: block !important;

        margin: 0 !important;
        padding: 0 !important;

        color: var(--pfm-dark-green) !important;
        font-size: 20px !important;
        font-weight: 900 !important;
        line-height: 1.3 !important;
    }

    #agro-product-form-modal
    .pfm-category-heading span {
        display: block !important;

        margin: 0 !important;
        padding: 0 !important;

        color: #466250 !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        line-height: 1.4 !important;
    }

    #agro-product-form-modal
    .pfm-field {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 7px !important;

        margin: 0 !important;
        padding: 0 !important;
    }

    #agro-product-form-modal
    .pfm-field-label {
        display: block !important;

        margin: 0 !important;
        padding: 0 !important;

        color: var(--pfm-text) !important;
        font-size: 16px !important;
        font-style: normal !important;
        font-weight: 900 !important;
        line-height: 1.3 !important;
    }

    #agro-product-form-modal
    .pfm-required {
        color: var(--pfm-danger) !important;
        font-style: normal !important;
        font-weight: 900 !important;
    }

    #agro-product-form-modal
    .pfm-optional {
        color: var(--pfm-muted) !important;
        font-size: 14px !important;
        font-style: normal !important;
        font-weight: 700 !important;
    }

    #agro-product-form-modal
    .pfm-input,
    #agro-product-form-modal
    .pfm-select,
    #agro-product-form-modal
    .pfm-textarea {
        display: block !important;
        width: 100% !important;

        margin: 0 !important;

        color: var(--pfm-text) !important;
        font-size: 16px !important;
        font-weight: 700 !important;
        line-height: 1.4 !important;

        outline: none !important;
        background: #ffffff !important;
        border: 2px solid #a9b9ae !important;
        border-radius: 10px !important;
        box-shadow: none !important;
    }

    #agro-product-form-modal
    .pfm-input,
    #agro-product-form-modal
    .pfm-select {
        height: 52px !important;
        min-height: 52px !important;
        padding: 0 13px !important;
    }

    #agro-product-form-modal
    .pfm-select {
        appearance: auto !important;
        cursor: pointer !important;
    }

    #agro-product-form-modal
    .pfm-textarea {
        min-height: 110px !important;
        padding: 12px 13px !important;
        resize: vertical !important;
    }

    #agro-product-form-modal
    .pfm-input::placeholder,
    #agro-product-form-modal
    .pfm-textarea::placeholder {
        color: #77837b !important;
        font-size: 15px !important;
        opacity: 1 !important;
    }

    #agro-product-form-modal
    .pfm-input:focus,
    #agro-product-form-modal
    .pfm-select:focus,
    #agro-product-form-modal
    .pfm-textarea:focus {
        border-color: var(--pfm-green) !important;
        box-shadow:
            0 0 0 4px
            rgba(21, 128, 61, 0.13) !important;
    }

    #agro-product-form-modal
    .pfm-input-error {
        border-color: var(--pfm-danger) !important;
        background: #fffafa !important;
    }

    #agro-product-form-modal
    .pfm-field-error {
        display: block !important;

        margin: 0 !important;
        padding: 0 !important;

        color: var(--pfm-danger) !important;
        font-size: 14px !important;
        font-weight: 800 !important;
        line-height: 1.4 !important;
    }

    #agro-product-form-modal
    .pfm-field-help {
        display: block !important;

        margin: 0 !important;
        padding: 0 !important;

        color: var(--pfm-muted) !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        line-height: 1.4 !important;
    }

    #agro-product-form-modal
    .pfm-category-notice {
        display: flex !important;
        width: 100% !important;
        min-height: 120px !important;
        align-items: center !important;
        justify-content: center !important;
        flex-direction: column !important;
        gap: 7px !important;

        margin: 0 !important;
        padding: 22px !important;

        text-align: center !important;

        background: #ffffff !important;
        border: 2px dashed var(--pfm-border) !important;
        border-radius: 12px !important;
    }

    #agro-product-form-modal
    .pfm-category-notice strong {
        display: block !important;

        margin: 0 !important;
        padding: 0 !important;

        color: var(--pfm-dark-green) !important;
        font-size: 20px !important;
        font-weight: 900 !important;
        line-height: 1.3 !important;
    }

    #agro-product-form-modal
    .pfm-category-notice span {
        display: block !important;

        margin: 0 !important;
        padding: 0 !important;

        color: var(--pfm-muted) !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        line-height: 1.45 !important;
    }

    #agro-product-form-modal
    .pfm-no-categories {
        color: var(--pfm-danger) !important;
        background: var(--pfm-danger-light) !important;
        border-color: #efb8b3 !important;
    }

    #agro-product-form-modal
    .pfm-fields-section {
        display: flex !important;
        width: 100% !important;
        flex-direction: column !important;
        gap: 16px !important;

        margin: 0 !important;
        padding: 19px !important;

        background: #ffffff !important;
        border: 2px solid var(--pfm-border) !important;
        border-radius: 13px !important;
    }

    #agro-product-form-modal
    .pfm-section-heading {
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;

        margin: 0 !important;
        padding: 0 0 13px !important;

        border-bottom: 1px solid var(--pfm-border) !important;
    }

    #agro-product-form-modal
    .pfm-section-heading h3 {
        display: block !important;

        margin: 0 !important;
        padding: 0 !important;

        color: var(--pfm-text) !important;
        font-size: 21px !important;
        font-weight: 900 !important;
        line-height: 1.3 !important;
    }

    #agro-product-form-modal
    .pfm-section-heading p {
        display: block !important;

        margin: 0 !important;
        padding: 0 !important;

        color: var(--pfm-muted) !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        line-height: 1.4 !important;
    }

    #agro-product-form-modal
    .pfm-grid {
        display: grid !important;
        grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;
        gap: 16px !important;

        margin: 0 !important;
        padding: 0 !important;
    }

    #agro-product-form-modal
    .pfm-full-width {
        grid-column: 1 / -1 !important;
    }

    #agro-product-form-modal
    .pfm-actions {
        display: flex !important;
        min-height: 78px !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 11px !important;

        margin: 0 !important;
        padding: 13px 22px !important;

        background: #ffffff !important;
        border: 0 !important;
        border-top: 2px solid var(--pfm-border) !important;
    }

    #agro-product-form-modal
    .pfm-button {
        display: inline-flex !important;
        min-width: 135px !important;
        min-height: 50px !important;
        align-items: center !important;
        justify-content: center !important;

        margin: 0 !important;
        padding: 9px 17px !important;

        font-size: 16px !important;
        font-weight: 900 !important;
        line-height: 1.2 !important;
        text-align: center !important;

        appearance: none !important;
        border-radius: 10px !important;
        cursor: pointer !important;
    }

    #agro-product-form-modal
    .pfm-secondary-button {
        color: var(--pfm-dark-green) !important;
        background: var(--pfm-light-green) !important;
        border: 2px solid #9fd6af !important;
    }

    #agro-product-form-modal
    .pfm-primary-button {
        color: #ffffff !important;
        background:
            linear-gradient(
                135deg,
                var(--pfm-dark-green),
                var(--pfm-green)
            ) !important;
        border: 2px solid var(--pfm-dark-green) !important;
    }

    #agro-product-form-modal
    .pfm-button:disabled,
    #agro-product-form-modal
    .pfm-close-button:disabled {
        opacity: 0.58 !important;
        cursor: not-allowed !important;
    }

    @media (max-width: 700px) {
        #agro-product-form-modal {
            padding: 12px !important;
        }

        #agro-product-form-modal
        .pfm-dialog {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
        }

        #agro-product-form-modal
        .pfm-header {
            min-height: 82px !important;
            padding: 15px 17px !important;
        }

        #agro-product-form-modal
        .pfm-title {
            font-size: 24px !important;
        }

        #agro-product-form-modal
        .pfm-form-content {
            padding: 15px !important;
        }

        #agro-product-form-modal
        .pfm-category-section,
        #agro-product-form-modal
        .pfm-fields-section {
            padding: 15px !important;
        }

        #agro-product-form-modal
        .pfm-grid {
            grid-template-columns: 1fr !important;
        }

        #agro-product-form-modal
        .pfm-full-width {
            grid-column: auto !important;
        }

        #agro-product-form-modal
        .pfm-actions {
            display: grid !important;
            grid-template-columns:
                repeat(2, minmax(0, 1fr)) !important;
            padding: 12px 15px !important;
        }

        #agro-product-form-modal
        .pfm-button {
            width: 100% !important;
            min-width: 0 !important;
        }
    }

    @media (max-width: 430px) {
        #agro-product-form-modal
        .pfm-actions {
            grid-template-columns: 1fr !important;
        }
    }
`;

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
        values.category_id.trim() !== '';

    const hasCategories =
        categories.length > 0;

    const getFieldError = (
        field: keyof ProductFormValues,
    ): string | undefined =>
        fieldErrors[field]?.[0];

    const inputClass = (
        field: keyof ProductFormValues,
        baseClass: string,
    ): string =>
        getFieldError(field)
            ? `${baseClass} pfm-input-error`
            : baseClass;

    return (
        <div
            id="agro-product-form-modal"
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
                {productFormModalStyles}
            </style>

            <section
                className="pfm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="product-modal-title"
            >
                <header className="pfm-header">
                    <div className="pfm-header-copy">
                        <span className="pfm-kicker">
                            Product Management
                        </span>

                        <h2
                            id="product-modal-title"
                            className="pfm-title"
                        >
                            {isEditing
                                ? 'Edit Product'
                                : 'Add Product'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="pfm-close-button"
                        aria-label="Close product form"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="pfm-form"
                    onSubmit={onSubmit}
                >
                    <div className="pfm-form-content">
                        {errorMessage && (
                            <div
                                className="pfm-alert"
                                role="alert"
                            >
                                {errorMessage}
                            </div>
                        )}

                        <section className="pfm-category-section">
                            <div className="pfm-category-heading">
                                <strong>
                                    Step 1: Select a Category
                                </strong>

                                <span>
                                    Select the product category before
                                    entering the remaining product details.
                                </span>
                            </div>

                            <label className="pfm-field">
                                <span className="pfm-field-label">
                                    Product Category
                                    <strong className="pfm-required">
                                        {' '}*
                                    </strong>
                                </span>

                                <select
                                    value={values.category_id}
                                    autoFocus={!isEditing}
                                    required
                                    disabled={
                                        isSubmitting
                                        || isLoadingCategories
                                        || !hasCategories
                                    }
                                    className={inputClass(
                                        'category_id',
                                        'pfm-select',
                                    )}
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
                                            : hasCategories
                                                ? 'Select a category'
                                                : 'No categories available'}
                                    </option>

                                    {categories.map(
                                        (category) => (
                                            <option
                                                key={category.id}
                                                value={String(
                                                    category.id,
                                                )}
                                            >
                                                {category.name}
                                            </option>
                                        ),
                                    )}
                                </select>

                                {getFieldError(
                                    'category_id',
                                ) && (
                                        <p className="pfm-field-error">
                                            {getFieldError(
                                                'category_id',
                                            )}
                                        </p>
                                    )}
                            </label>
                        </section>

                        {!isLoadingCategories
                            && !hasCategories && (
                                <div className="pfm-category-notice pfm-no-categories">
                                    <strong>
                                        No Product Categories Available
                                    </strong>

                                    <span>
                                        Create at least one product
                                        category before adding a product.
                                    </span>
                                </div>
                            )}

                        {hasCategories
                            && !hasSelectedCategory && (
                                <div className="pfm-category-notice">
                                    <strong>
                                        Select a Category to Continue
                                    </strong>

                                    <span>
                                        Product name, unit, prices and
                                        the other fields will appear after
                                        selecting a category.
                                    </span>
                                </div>
                            )}

                        {hasSelectedCategory && (
                            <section className="pfm-fields-section">
                                <div className="pfm-section-heading">
                                    <h3>
                                        Step 2: Product Details
                                    </h3>

                                    <p>
                                        Enter the information for the
                                        selected product category.
                                    </p>
                                </div>

                                <div className="pfm-grid">
                                    <label className="pfm-field pfm-full-width">
                                        <span className="pfm-field-label">
                                            Product Name
                                            <strong className="pfm-required">
                                                {' '}*
                                            </strong>
                                        </span>

                                        <input
                                            type="text"
                                            value={values.name}
                                            maxLength={160}
                                            required
                                            disabled={isSubmitting}
                                            placeholder="Example: Urea Fertilizer 50kg"
                                            className={inputClass(
                                                'name',
                                                'pfm-input',
                                            )}
                                            onChange={(event) => {
                                                onChange(
                                                    'name',
                                                    event.target.value,
                                                );
                                            }}
                                        />

                                        <small className="pfm-field-help">
                                            {values.name.length}/160
                                        </small>

                                        {getFieldError('name') && (
                                            <p className="pfm-field-error">
                                                {getFieldError('name')}
                                            </p>
                                        )}
                                    </label>

                                    <label className="pfm-field">
                                        <span className="pfm-field-label">
                                            Unit
                                            <strong className="pfm-required">
                                                {' '}*
                                            </strong>
                                        </span>

                                        <select
                                            value={values.unit}
                                            required
                                            disabled={isSubmitting}
                                            className={inputClass(
                                                'unit',
                                                'pfm-select',
                                            )}
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
                                            <p className="pfm-field-error">
                                                {getFieldError('unit')}
                                            </p>
                                        )}
                                    </label>

                                    <label className="pfm-field">
                                        <span className="pfm-field-label">
                                            Expiry Date
                                            <em className="pfm-optional">
                                                {' '}Optional
                                            </em>
                                        </span>

                                        <input
                                            type="date"
                                            value={values.expiry_date}
                                            disabled={isSubmitting}
                                            className={inputClass(
                                                'expiry_date',
                                                'pfm-input',
                                            )}
                                            onChange={(event) => {
                                                onChange(
                                                    'expiry_date',
                                                    event.target.value,
                                                );
                                            }}
                                        />

                                        <small className="pfm-field-help">
                                            Leave empty when the product
                                            has no expiry date.
                                        </small>

                                        {getFieldError(
                                            'expiry_date',
                                        ) && (
                                                <p className="pfm-field-error">
                                                    {getFieldError(
                                                        'expiry_date',
                                                    )}
                                                </p>
                                            )}
                                    </label>

                                    <label className="pfm-field">
                                        <span className="pfm-field-label">
                                            Cost Price
                                            <strong className="pfm-required">
                                                {' '}*
                                            </strong>
                                        </span>

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={values.cost_price}
                                            required
                                            disabled={isSubmitting}
                                            placeholder="0.00"
                                            className={inputClass(
                                                'cost_price',
                                                'pfm-input',
                                            )}
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
                                                <p className="pfm-field-error">
                                                    {getFieldError(
                                                        'cost_price',
                                                    )}
                                                </p>
                                            )}
                                    </label>

                                    <label className="pfm-field">
                                        <span className="pfm-field-label">
                                            Selling Price
                                            <strong className="pfm-required">
                                                {' '}*
                                            </strong>
                                        </span>

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={values.selling_price}
                                            required
                                            disabled={isSubmitting}
                                            placeholder="0.00"
                                            className={inputClass(
                                                'selling_price',
                                                'pfm-input',
                                            )}
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
                                                <p className="pfm-field-error">
                                                    {getFieldError(
                                                        'selling_price',
                                                    )}
                                                </p>
                                            )}
                                    </label>

                                    <label className="pfm-field">
                                        <span className="pfm-field-label">
                                            Reorder Level
                                            <strong className="pfm-required">
                                                {' '}*
                                            </strong>
                                        </span>

                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={values.reorder_level}
                                            required
                                            disabled={isSubmitting}
                                            placeholder="0"
                                            className={inputClass(
                                                'reorder_level',
                                                'pfm-input',
                                            )}
                                            onChange={(event) => {
                                                onChange(
                                                    'reorder_level',
                                                    event.target.value,
                                                );
                                            }}
                                        />

                                        <small className="pfm-field-help">
                                            Minimum stock quantity before
                                            restocking.
                                        </small>

                                        {getFieldError(
                                            'reorder_level',
                                        ) && (
                                                <p className="pfm-field-error">
                                                    {getFieldError(
                                                        'reorder_level',
                                                    )}
                                                </p>
                                            )}
                                    </label>

                                    <label className="pfm-field">
                                        <span className="pfm-field-label">
                                            SKU
                                            <em className="pfm-optional">
                                                {' '}Optional
                                            </em>
                                        </span>

                                        <input
                                            type="text"
                                            value={values.sku}
                                            maxLength={100}
                                            disabled={isSubmitting}
                                            placeholder="Example: FER-001"
                                            className={inputClass(
                                                'sku',
                                                'pfm-input',
                                            )}
                                            onChange={(event) => {
                                                onChange(
                                                    'sku',
                                                    event.target.value,
                                                );
                                            }}
                                        />

                                        {getFieldError('sku') && (
                                            <p className="pfm-field-error">
                                                {getFieldError('sku')}
                                            </p>
                                        )}
                                    </label>

                                    <label className="pfm-field">
                                        <span className="pfm-field-label">
                                            Barcode
                                            <em className="pfm-optional">
                                                {' '}Optional
                                            </em>
                                        </span>

                                        <input
                                            type="text"
                                            value={values.barcode}
                                            maxLength={120}
                                            disabled={isSubmitting}
                                            placeholder="Scan or enter barcode"
                                            className={inputClass(
                                                'barcode',
                                                'pfm-input',
                                            )}
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
                                                <p className="pfm-field-error">
                                                    {getFieldError(
                                                        'barcode',
                                                    )}
                                                </p>
                                            )}
                                    </label>

                                    <label className="pfm-field pfm-full-width">
                                        <span className="pfm-field-label">
                                            Description
                                            <em className="pfm-optional">
                                                {' '}Optional
                                            </em>
                                        </span>

                                        <textarea
                                            value={values.description}
                                            maxLength={1500}
                                            rows={4}
                                            disabled={isSubmitting}
                                            placeholder="Enter a short product description"
                                            className={inputClass(
                                                'description',
                                                'pfm-textarea',
                                            )}
                                            onChange={(event) => {
                                                onChange(
                                                    'description',
                                                    event.target.value,
                                                );
                                            }}
                                        />

                                        <small className="pfm-field-help">
                                            {values.description.length}/1500
                                        </small>

                                        {getFieldError(
                                            'description',
                                        ) && (
                                                <p className="pfm-field-error">
                                                    {getFieldError(
                                                        'description',
                                                    )}
                                                </p>
                                            )}
                                    </label>
                                </div>
                            </section>
                        )}
                    </div>

                    <footer className="pfm-actions">
                        <button
                            type="button"
                            className="pfm-button pfm-secondary-button"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="pfm-button pfm-primary-button"
                            disabled={
                                isSubmitting
                                || !hasSelectedCategory
                                || !hasCategories
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