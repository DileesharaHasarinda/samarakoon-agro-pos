import {
    useEffect,
} from 'react';

import type {
    SaleReceipt,
} from '../../types/sale';

interface SaleDetailsModalProps {
    saleId: number | null;
    sale: SaleReceipt | null;
    isLoading: boolean;
    errorMessage: string;
    onClose: () => void;
    onRetry: () => void;
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

function formatDateTime(
    value: string,
): string {
    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        },
    ).format(new Date(value));
}

function formatDate(
    value: string | null,
): string {
    if (!value) {
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
        new Date(`${value}T00:00:00`),
    );
}

function paymentName(
    method: string,
): string {
    switch (method) {
        case 'bank_transfer':
            return 'Bank Transfer';

        case 'card':
            return 'Card';

        default:
            return 'Cash';
    }
}

export default function SaleDetailsModal({
    saleId,
    sale,
    isLoading,
    errorMessage,
    onClose,
    onRetry,
}: SaleDetailsModalProps) {
    useEffect(() => {
        if (saleId === null) {
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
        saleId,
        onClose,
    ]);

    if (saleId === null) {
        return null;
    }

    const hasProfitInformation =
        sale?.net_profit !== null
        && sale?.net_profit !== undefined;

    return (
        <div
            className="modal-backdrop sale-details-backdrop"
            role="presentation"
        >
            <section
                className="sale-details-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="sale-details-title"
            >
                <header className="sale-details-header">
                    <div>
                        <span className="page-kicker">
                            Sales history
                        </span>

                        <h2 id="sale-details-title">
                            {sale
                                ? sale.sale_number
                                : 'Sale Details'}
                        </h2>

                        {sale && (
                            <p>
                                {formatDateTime(
                                    sale.sale_date,
                                )}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        className="modal-close-button sale-details-close"
                        aria-label="Close sale details"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                {isLoading ? (
                    <div className="sale-details-state">
                        <div className="small-spinner" />

                        <span>
                            Loading sale details...
                        </span>
                    </div>
                ) : errorMessage ? (
                    <div className="sale-details-state">
                        <strong>
                            Unable to load sale
                        </strong>

                        <span>{errorMessage}</span>

                        <button
                            type="button"
                            className="primary-button"
                            onClick={onRetry}
                        >
                            Retry
                        </button>
                    </div>
                ) : sale ? (
                    <div className="sale-details-content">
                        <section className="sale-details-overview">
                            <article>
                                <span>Cashier</span>

                                <strong>
                                    {sale.created_by.name}
                                </strong>

                                {sale.created_by
                                    .username && (
                                        <small>
                                            {
                                                sale.created_by
                                                    .username
                                            }
                                        </small>
                                    )}
                            </article>

                            <article>
                                <span>Customer</span>

                                <strong>
                                    Walk-in Customer
                                </strong>
                            </article>

                            <article>
                                <span>Payment Status</span>

                                <strong className="sale-paid-value">
                                    {sale.payment_status}
                                </strong>
                            </article>

                            <article>
                                <span>Total Quantity</span>

                                <strong>
                                    {sale.total_quantity}
                                </strong>
                            </article>
                        </section>

                        <section className="sale-details-section">
                            <header>
                                <div>
                                    <h3>Sold Items</h3>

                                    <p>
                                        Products and exact
                                        stock batches used in
                                        this sale.
                                    </p>
                                </div>

                                <span>
                                    {sale.items_count}{' '}
                                    {sale.items_count === 1
                                        ? 'item'
                                        : 'items'}
                                </span>
                            </header>

                            <div className="sale-details-table-container">
                                <table className="sale-details-table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Batch</th>
                                            <th>Expiry</th>
                                            <th>Quantity</th>
                                            <th>Unit Price</th>
                                            <th>Discount</th>
                                            <th>Total</th>

                                            {hasProfitInformation && (
                                                <th>Profit</th>
                                            )}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {sale.items.map(
                                            (item) => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <div className="sale-item-product">
                                                            <strong>
                                                                {
                                                                    item
                                                                        .product
                                                                        .name
                                                                }
                                                            </strong>

                                                            <span>
                                                                SKU:{' '}
                                                                {item.product
                                                                    .sku
                                                                    || '—'}
                                                            </span>

                                                            <span>
                                                                Barcode:{' '}
                                                                {item.product
                                                                    .barcode
                                                                    || '—'}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="sale-item-batch">
                                                            <strong>
                                                                {item.batch
                                                                    .batch_number
                                                                    || item.batch
                                                                        .batch_code}
                                                            </strong>

                                                            <span>
                                                                {
                                                                    item
                                                                        .batch
                                                                        .batch_code
                                                                }
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span className="sale-expiry-value">
                                                            {formatDate(
                                                                item.batch
                                                                    .expiry_date,
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <strong>
                                                            {item.quantity}{' '}
                                                            {
                                                                item
                                                                    .product
                                                                    .unit
                                                            }
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        {currencyFormatter
                                                            .format(
                                                                item
                                                                    .selling_price,
                                                            )}

                                                        {item.purchase_cost
                                                            !== null && (
                                                                <small className="sale-cost-value">
                                                                    Cost:{' '}
                                                                    {currencyFormatter
                                                                        .format(
                                                                            item
                                                                                .purchase_cost,
                                                                        )}
                                                                </small>
                                                            )}
                                                    </td>

                                                    <td>
                                                        {currencyFormatter
                                                            .format(
                                                                item.discount,
                                                            )}
                                                    </td>

                                                    <td>
                                                        <strong>
                                                            {currencyFormatter
                                                                .format(
                                                                    item
                                                                        .line_total,
                                                                )}
                                                        </strong>
                                                    </td>

                                                    {hasProfitInformation && (
                                                        <td>
                                                            <strong className="sale-profit-value">
                                                                {currencyFormatter
                                                                    .format(
                                                                        item
                                                                            .gross_profit
                                                                        ?? 0,
                                                                    )}
                                                            </strong>
                                                        </td>
                                                    )}
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <div className="sale-details-lower-grid">
                            <section className="sale-details-section sale-payments-section">
                                <header>
                                    <div>
                                        <h3>Payments</h3>

                                        <p>
                                            Payments recorded for
                                            this transaction.
                                        </p>
                                    </div>
                                </header>

                                <div className="sale-payment-list">
                                    {sale.payments.map(
                                        (payment) => (
                                            <article
                                                key={payment.id}
                                            >
                                                <div>
                                                    <span>
                                                        Payment Method
                                                    </span>

                                                    <strong>
                                                        {paymentName(
                                                            payment
                                                                .payment_method,
                                                        )}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>Amount</span>

                                                    <strong>
                                                        {currencyFormatter
                                                            .format(
                                                                payment
                                                                    .amount,
                                                            )}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>
                                                        Reference
                                                    </span>

                                                    <strong>
                                                        {payment
                                                            .reference_number
                                                            || '—'}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>
                                                        Payment Time
                                                    </span>

                                                    <strong>
                                                        {formatDateTime(
                                                            payment
                                                                .created_at,
                                                        )}
                                                    </strong>
                                                </div>

                                                {payment.notes && (
                                                    <p>
                                                        {payment.notes}
                                                    </p>
                                                )}
                                            </article>
                                        ),
                                    )}
                                </div>
                            </section>

                            <section className="sale-total-section">
                                <div>
                                    <span>Subtotal</span>

                                    <strong>
                                        {currencyFormatter
                                            .format(
                                                sale.subtotal,
                                            )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Item Discounts
                                    </span>

                                    <strong>
                                        -
                                        {currencyFormatter
                                            .format(
                                                sale
                                                    .item_discount_total,
                                            )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Sale Discount
                                    </span>

                                    <strong>
                                        -
                                        {currencyFormatter
                                            .format(
                                                sale.discount,
                                            )}
                                    </strong>
                                </div>

                                <div className="sale-details-grand-total">
                                    <span>Grand Total</span>

                                    <strong>
                                        {currencyFormatter
                                            .format(
                                                sale.grand_total,
                                            )}
                                    </strong>
                                </div>

                                <div>
                                    <span>Paid Amount</span>

                                    <strong>
                                        {currencyFormatter
                                            .format(
                                                sale.paid_amount,
                                            )}
                                    </strong>
                                </div>

                                <div>
                                    <span>Change</span>

                                    <strong>
                                        {currencyFormatter
                                            .format(
                                                sale.change_amount,
                                            )}
                                    </strong>
                                </div>

                                {hasProfitInformation && (
                                    <>
                                        <div className="sale-profit-divider">
                                            <span>
                                                Gross Profit
                                            </span>

                                            <strong>
                                                {currencyFormatter
                                                    .format(
                                                        sale
                                                            .gross_profit
                                                        ?? 0,
                                                    )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Net Profit
                                            </span>

                                            <strong className="sale-net-profit">
                                                {currencyFormatter
                                                    .format(
                                                        sale
                                                            .net_profit
                                                        ?? 0,
                                                    )}
                                            </strong>
                                        </div>
                                    </>
                                )}
                            </section>
                        </div>

                        {sale.notes && (
                            <section className="sale-notes-section">
                                <span>Sale Notes</span>

                                <p>{sale.notes}</p>
                            </section>
                        )}

                        <footer className="sale-details-actions">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={onClose}
                            >
                                Close
                            </button>

                            <button
                                type="button"
                                className="primary-button"
                                onClick={() => {
                                    window.print();
                                }}
                            >
                                Print Sale Details
                            </button>
                        </footer>
                    </div>
                ) : null}
            </section>
        </div>
    );
}