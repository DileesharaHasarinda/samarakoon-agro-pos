import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import type {
    ProductBatchDetails,
    UpdateStockBatchValues,
} from '../../types/product';

interface EditStockBatchModalProps {
    batch: ProductBatchDetails | null;

    productName: string;

    isSubmitting: boolean;

    errorMessage: string;

    onClose: () => void;

    onSubmit: (
        values: UpdateStockBatchValues,
    ) => void;
}

const currencyFormatter =
    new Intl.NumberFormat(
        'en-LK',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

const modalStyles = `
#edit-stock-batch-modal,
#edit-stock-batch-modal *,
#edit-stock-batch-modal *::before,
#edit-stock-batch-modal *::after {
    box-sizing: border-box !important;
}

#edit-stock-batch-modal {
    --esb-green-900: #14532d;
    --esb-green-800: #166534;
    --esb-green-700: #15803d;
    --esb-green-100: #dcfce7;
    --esb-green-50: #f0fdf4;
    --esb-blue: #175cd3;
    --esb-red: #b42318;
    --esb-red-bg: #fef3f2;
    --esb-text: #101828;
    --esb-text-2: #344054;
    --esb-muted: #667085;
    --esb-border: #d0d9d2;
    --esb-page: #f4f7f5;

    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483646 !important;

    display: flex !important;
    width: 100vw !important;
    height: 100dvh !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 22px !important;

    background: rgba(7, 20, 12, 0.72) !important;
    backdrop-filter: blur(5px) !important;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif !important;
}

#edit-stock-batch-modal .esb-dialog {
    display: flex !important;

    width: min(720px, 100%) !important;
    max-height: calc(100dvh - 44px) !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border: 1px solid #d6e0d8 !important;
    border-radius: 16px !important;

    box-shadow: 0 28px 90px rgba(0, 0, 0, 0.38) !important;
}

#edit-stock-batch-modal .esb-header {
    display: flex !important;
    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: space-between !important;

    gap: 14px !important;

    padding: 17px 18px !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            #052e16,
            var(--esb-green-800),
            var(--esb-green-700)
        ) !important;
}

#edit-stock-batch-modal .esb-kicker {
    display: block !important;

    margin-bottom: 2px !important;

    color: rgba(255, 255, 255, 0.72) !important;

    font-size: 10px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
}

#edit-stock-batch-modal .esb-title {
    margin: 0 !important;

    color: #ffffff !important;

    font-size: 20px !important;
    font-weight: 900 !important;
}

#edit-stock-batch-modal .esb-subtitle {
    display: block !important;

    margin-top: 3px !important;

    color: rgba(255, 255, 255, 0.82) !important;

    font-size: 11px !important;
    font-weight: 650 !important;
}

#edit-stock-batch-modal .esb-close {
    display: grid !important;

    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;

    place-items: center !important;

    padding: 0 !important;

    color: #ffffff !important;

    font-size: 22px !important;

    background: rgba(255, 255, 255, 0.12) !important;

    border: 1px solid rgba(255, 255, 255, 0.28) !important;
    border-radius: 9px !important;

    cursor: pointer !important;
}

#edit-stock-batch-modal .esb-body {
    min-height: 0 !important;
    flex: 1 1 auto !important;

    padding: 16px !important;

    overflow-x: hidden !important;
    overflow-y: auto !important;

    background: var(--esb-page) !important;
}

#edit-stock-batch-modal .esb-summary {
    display: grid !important;

    grid-template-columns:
        repeat(3, minmax(0, 1fr)) !important;

    gap: 8px !important;

    margin-bottom: 12px !important;
}

#edit-stock-batch-modal .esb-summary-card {
    display: flex !important;

    min-width: 0 !important;
    min-height: 75px !important;

    flex-direction: column !important;
    justify-content: center !important;

    gap: 3px !important;

    padding: 10px 11px !important;

    background: #ffffff !important;

    border: 1px solid var(--esb-border) !important;
    border-radius: 9px !important;
}

#edit-stock-batch-modal .esb-summary-card span {
    color: var(--esb-muted) !important;

    font-size: 9px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
}

#edit-stock-batch-modal .esb-summary-card strong {
    overflow-wrap: anywhere !important;

    color: var(--esb-text) !important;

    font-size: 12px !important;
    font-weight: 850 !important;
}

#edit-stock-batch-modal .esb-form {
    display: flex !important;

    flex-direction: column !important;

    gap: 12px !important;
}

#edit-stock-batch-modal .esb-grid {
    display: grid !important;

    grid-template-columns:
        repeat(2, minmax(0, 1fr)) !important;

    gap: 10px !important;
}

#edit-stock-batch-modal .esb-field {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    gap: 5px !important;
}

#edit-stock-batch-modal .esb-field.full {
    grid-column: 1 / -1 !important;
}

#edit-stock-batch-modal .esb-label {
    color: var(--esb-text-2) !important;

    font-size: 11px !important;
    font-weight: 800 !important;
}

#edit-stock-batch-modal .esb-help {
    color: var(--esb-muted) !important;

    font-size: 10px !important;
    font-weight: 600 !important;
}

#edit-stock-batch-modal .esb-input,
#edit-stock-batch-modal .esb-textarea {
    display: block !important;

    width: 100% !important;
    min-width: 0 !important;

    color: var(--esb-text) !important;

    font: inherit !important;
    font-size: 13px !important;
    font-weight: 700 !important;

    outline: none !important;

    background: #ffffff !important;

    border: 1px solid #aebdb2 !important;
    border-radius: 8px !important;
}

#edit-stock-batch-modal .esb-input {
    height: 44px !important;
    min-height: 44px !important;

    padding: 0 11px !important;
}

#edit-stock-batch-modal .esb-textarea {
    min-height: 90px !important;

    padding: 10px 11px !important;

    resize: vertical !important;
}

#edit-stock-batch-modal .esb-input:focus,
#edit-stock-batch-modal .esb-textarea:focus {
    border-color: var(--esb-green-700) !important;

    box-shadow:
        0 0 0 3px rgba(21, 128, 61, 0.12) !important;
}

#edit-stock-batch-modal .esb-readonly {
    display: flex !important;

    min-height: 44px !important;

    align-items: center !important;

    padding: 0 11px !important;

    color: var(--esb-text-2) !important;

    font-size: 13px !important;
    font-weight: 750 !important;

    background: #eef3ef !important;

    border: 1px solid var(--esb-border) !important;
    border-radius: 8px !important;
}

#edit-stock-batch-modal .esb-warning {
    padding: 10px 11px !important;

    color: #93370d !important;

    font-size: 11px !important;
    font-weight: 700 !important;

    background: #fffaeb !important;

    border: 1px solid #efd696 !important;
    border-radius: 8px !important;
}

#edit-stock-batch-modal .esb-error {
    padding: 10px 11px !important;

    color: var(--esb-red) !important;

    font-size: 11px !important;
    font-weight: 750 !important;

    background: var(--esb-red-bg) !important;

    border: 1px solid #efbbb6 !important;
    border-radius: 8px !important;
}

#edit-stock-batch-modal .esb-footer {
    display: flex !important;
    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: flex-end !important;

    gap: 8px !important;

    padding: 12px 16px !important;

    background: #ffffff !important;

    border-top: 1px solid #dfe6e1 !important;
}

#edit-stock-batch-modal .esb-button {
    display: inline-flex !important;

    min-height: 42px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 8px 16px !important;

    font: inherit !important;
    font-size: 12px !important;
    font-weight: 850 !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#edit-stock-batch-modal .esb-cancel {
    color: var(--esb-text-2) !important;

    background: #ffffff !important;

    border: 1px solid #aebdb2 !important;
}

#edit-stock-batch-modal .esb-save {
    color: #ffffff !important;

    background: var(--esb-green-700) !important;

    border: 1px solid var(--esb-green-700) !important;
}

#edit-stock-batch-modal .esb-save:hover:not(:disabled) {
    background: var(--esb-green-800) !important;
    border-color: var(--esb-green-800) !important;
}

#edit-stock-batch-modal button:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

@media (max-width: 620px) {
    #edit-stock-batch-modal {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    #edit-stock-batch-modal .esb-dialog {
        width: 100% !important;
        max-height: 94dvh !important;

        border-radius: 16px 16px 0 0 !important;
    }

    #edit-stock-batch-modal .esb-summary,
    #edit-stock-batch-modal .esb-grid {
        grid-template-columns: 1fr !important;
    }

    #edit-stock-batch-modal .esb-field.full {
        grid-column: auto !important;
    }
}
`;

function batchReference(
    batch: ProductBatchDetails,
): string {
    return (
        batch.batch_number
        || batch.batch_code
        || `Stock #${batch.id}`
    );
}

export default function EditStockBatchModal({
    batch,
    productName,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: EditStockBatchModalProps) {
    const [
        sellingPrice,
        setSellingPrice,
    ] = useState('');

    const [
        secondarySellingPrice,
        setSecondarySellingPrice,
    ] = useState('');

    const [
        availableQuantity,
        setAvailableQuantity,
    ] = useState('');

    const [
        reason,
        setReason,
    ] = useState('');

    const [
        localError,
        setLocalError,
    ] = useState('');

    useEffect(
        () => {
            if (!batch) {
                return;
            }

            setSellingPrice(
                String(
                    batch.selling_price,
                ),
            );

            setSecondarySellingPrice(
                batch.secondary_selling_price
                    !== null
                    ? String(
                        batch.secondary_selling_price,
                    )
                    : '',
            );

            setAvailableQuantity(
                String(
                    batch.available_quantity,
                ),
            );

            setReason('');
            setLocalError('');
        },
        [batch],
    );

    useEffect(
        () => {
            if (!batch) {
                return;
            }

            const previousOverflow =
                document.body.style.overflow;

            document.body.style.overflow =
                'hidden';

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
                document.body.style.overflow =
                    previousOverflow;

                window.removeEventListener(
                    'keydown',
                    handleKeyDown,
                );
            };
        },
        [
            batch,
            isSubmitting,
            onClose,
        ],
    );

    const stockChanged =
        useMemo(
            () => {
                if (!batch) {
                    return false;
                }

                const next =
                    Number(
                        availableQuantity,
                    );

                return (
                    Number.isFinite(next)
                    && Math.abs(
                        next
                        - Number(
                            batch.available_quantity,
                        ),
                    ) > 0.0001
                );
            },
            [
                batch,
                availableQuantity,
            ],
        );

    if (
        !batch
        || typeof document === 'undefined'
    ) {
        return null;
    }

    const stockUnit =
        batch.stock_unit
        || batch.secondary_unit
        || batch.primary_unit
        || 'Unit';

    const primaryUnit =
        batch.primary_unit
        || batch.purchase_unit_name
        || 'Unit';

    const submit = (): void => {
        setLocalError('');

        const parsedSellingPrice =
            Number(
                sellingPrice,
            );

        const parsedAvailableQuantity =
            Number(
                availableQuantity,
            );

        if (
            !Number.isFinite(
                parsedSellingPrice,
            )
            || parsedSellingPrice <= 0
        ) {
            setLocalError(
                'Enter a valid selling price greater than zero.',
            );

            return;
        }

        if (
            !Number.isFinite(
                parsedAvailableQuantity,
            )
            || parsedAvailableQuantity < 0
        ) {
            setLocalError(
                'Available stock must be zero or greater.',
            );

            return;
        }

        let parsedSecondarySellingPrice:
            number | null = null;

        if (batch.is_dual_unit) {
            parsedSecondarySellingPrice =
                Number(
                    secondarySellingPrice,
                );

            if (
                !Number.isFinite(
                    parsedSecondarySellingPrice,
                )
                || parsedSecondarySellingPrice <= 0
            ) {
                setLocalError(
                    `Enter a valid selling price for the loose ${batch.secondary_unit ?? stockUnit} unit.`,
                );

                return;
            }
        }

        if (
            stockChanged
            && reason.trim() === ''
        ) {
            setLocalError(
                'Enter a reason for changing the physical stock quantity.',
            );

            return;
        }

        onSubmit({
            selling_price:
                parsedSellingPrice,

            secondary_selling_price:
                parsedSecondarySellingPrice,

            available_quantity:
                parsedAvailableQuantity,

            reason:
                reason.trim(),
        });
    };

    return createPortal(
        <div
            id="edit-stock-batch-modal"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget
                    && !isSubmitting
                ) {
                    onClose();
                }
            }}
        >
            <style>
                {modalStyles}
            </style>

            <section
                className="esb-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-stock-batch-title"
                onMouseDown={(event) => {
                    event.stopPropagation();
                }}
            >
                <header className="esb-header">
                    <div>
                        <span className="esb-kicker">
                            Inventory Administration
                        </span>

                        <h2
                            id="edit-stock-batch-title"
                            className="esb-title"
                        >
                            Edit Price &amp; Stock
                        </h2>

                        <span className="esb-subtitle">
                            {productName}
                            {' • '}
                            {batchReference(batch)}
                        </span>
                    </div>

                    <button
                        type="button"
                        className="esb-close"
                        aria-label="Close edit stock batch"
                        disabled={
                            isSubmitting
                        }
                        onClick={
                            onClose
                        }
                    >
                        ×
                    </button>
                </header>

                <div className="esb-body">
                    <section className="esb-summary">
                        <article className="esb-summary-card">
                            <span>
                                Purchase Cost
                            </span>

                            <strong>
                                {batch.unit_cost !== null
                                    ? currencyFormatter.format(
                                        batch.unit_cost,
                                    )
                                    : 'Not available'}
                                {' / '}
                                {primaryUnit}
                            </strong>
                        </article>

                        <article className="esb-summary-card">
                            <span>
                                Current Stock
                            </span>

                            <strong>
                                {batch.available_quantity}
                                {' '}
                                {stockUnit}
                            </strong>
                        </article>

                        <article className="esb-summary-card">
                            <span>
                                Variant
                            </span>

                            <strong>
                                {batch.variant?.display_name
                                    ?? 'Standard Product'}
                            </strong>
                        </article>
                    </section>

                    {/* <div className="esb-warning">
                        Purchase cost and received quantity are historical values and cannot be changed here. Stock corrections update only the current available physical stock and are recorded as an adjustment.
                    </div> */}

                    <div className="esb-form">
                        <div className="esb-grid">
                            <label className="esb-field">
                                <span className="esb-label">
                                    Selling Price ({primaryUnit})
                                </span>

                                <input
                                    type="number"
                                    className="esb-input"
                                    min="0.01"
                                    step="0.01"
                                    value={
                                        sellingPrice
                                    }
                                    disabled={
                                        isSubmitting
                                    }
                                    onChange={(event) => {
                                        setSellingPrice(
                                            event.target.value,
                                        );

                                        setLocalError('');
                                    }}
                                />

                                <span className="esb-help">
                                    Main/full-unit selling price.
                                </span>
                            </label>

                            {batch.is_dual_unit ? (
                                <label className="esb-field">
                                    <span className="esb-label">
                                        Loose Selling Price ({batch.secondary_unit ?? stockUnit})
                                    </span>

                                    <input
                                        type="number"
                                        className="esb-input"
                                        min="0.01"
                                        step="0.01"
                                        value={
                                            secondarySellingPrice
                                        }
                                        disabled={
                                            isSubmitting
                                        }
                                        onChange={(event) => {
                                            setSecondarySellingPrice(
                                                event.target.value,
                                            );

                                            setLocalError('');
                                        }}
                                    />

                                    <span className="esb-help">
                                        Price for one loose {batch.secondary_unit ?? stockUnit}.
                                    </span>
                                </label>
                            ) : (
                                <div className="esb-field">
                                    <span className="esb-label">
                                        Stock Unit
                                    </span>

                                    <div className="esb-readonly">
                                        {stockUnit}
                                    </div>

                                    <span className="esb-help">
                                        Physical quantity unit for this batch.
                                    </span>
                                </div>
                            )}

                            <label className="esb-field">
                                <span className="esb-label">
                                    Current Available Stock ({stockUnit})
                                </span>

                                <input
                                    type="number"
                                    className="esb-input"
                                    min="0"
                                    step="0.001"
                                    value={
                                        availableQuantity
                                    }
                                    disabled={
                                        isSubmitting
                                    }
                                    onChange={(event) => {
                                        setAvailableQuantity(
                                            event.target.value,
                                        );

                                        setLocalError('');
                                    }}
                                />

                                <span className="esb-help">
                                    Enter the physical stock currently counted in the shop.
                                </span>
                            </label>

                            <div className="esb-field">
                                <span className="esb-label">
                                    Originally Received
                                </span>

                                <div className="esb-readonly">
                                    {batch.received_quantity}
                                    {' '}
                                    {stockUnit}
                                </div>

                                <span className="esb-help">
                                    Read-only purchase history.
                                </span>
                            </div>

                            <label className="esb-field full">
                                <span className="esb-label">
                                    Adjustment Reason {stockChanged ? '(Required)' : '(Optional)'}
                                </span>

                                <textarea
                                    className="esb-textarea"
                                    maxLength={500}
                                    placeholder={
                                        stockChanged
                                            ? 'Example: Physical stock count correction'
                                            : 'Optional note about this price change'
                                    }
                                    value={
                                        reason
                                    }
                                    disabled={
                                        isSubmitting
                                    }
                                    onChange={(event) => {
                                        setReason(
                                            event.target.value,
                                        );

                                        setLocalError('');
                                    }}
                                />

                                <span className="esb-help">
                                    Stock quantity changes are recorded in Stock Movements with the admin user and this reason.
                                </span>
                            </label>
                        </div>

                        {(localError || errorMessage) && (
                            <div
                                className="esb-error"
                                role="alert"
                            >
                                {localError || errorMessage}
                            </div>
                        )}
                    </div>
                </div>

                <footer className="esb-footer">
                    <button
                        type="button"
                        className="esb-button esb-cancel"
                        disabled={
                            isSubmitting
                        }
                        onClick={
                            onClose
                        }
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="esb-button esb-save"
                        disabled={
                            isSubmitting
                        }
                        onClick={
                            submit
                        }
                    >
                        {isSubmitting
                            ? 'Saving Changes...'
                            : 'Save Changes'}
                    </button>
                </footer>
            </section>
        </div>,
        document.body,
    );
}
