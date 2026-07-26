import type {
    SaleReceipt,
} from '../../types/sale';

interface SaleReceiptModalProps {
    receipt: SaleReceipt | null;
    onClose: () => void;
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

function paymentName(
    method: string | null,
): string {
    switch (method) {
        case 'bank_transfer':
            return 'Bank Transfer';

        case 'card':
            return 'Card';

        case 'cash':
            return 'Cash';

        case null:
            return 'On Due';

        default:
            return 'Not Recorded';
    }
}

export default function SaleReceiptModal({
    receipt,
    onClose,
}: SaleReceiptModalProps) {
    if (!receipt) {
        return null;
    }

    return (
        <div className="modal-backdrop">
            <section className="sale-receipt-modal">
                <header className="sale-receipt-header">
                    <div>
                        <span>
                            Samarakoon Agro POS
                        </span>

                        <h2>Sale Receipt</h2>

                        <strong>
                            {receipt.sale_number}
                        </strong>
                    </div>

                    <button
                        type="button"
                        className="modal-close-button"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="sale-receipt-meta">
                    <div>
                        <span>Date</span>

                        <strong>
                            {formatDateTime(
                                receipt.sale_date,
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Cashier</span>

                        <strong>
                            {
                                receipt
                                    .created_by
                                    .name
                            }
                        </strong>
                    </div>

                    <div>
                        <span>Customer</span>

                        <strong>
                            Walk-in Customer
                        </strong>
                    </div>

                    <div>
                        <span>Payment</span>

                        <strong>
                            {paymentName(
                                receipt
                                    .payment_method,
                            )}
                        </strong>
                    </div>
                </div>

                <div className="sale-receipt-items">
                    {receipt.items.map(
                        (item) => (
                            <article key={item.id}>
                                <div>
                                    <strong>
                                        {item.product.name}
                                    </strong>

                                    <span>
                                        Batch:{' '}
                                        {item
                                            .batch
                                            .batch_number
                                            || item
                                                .batch
                                                .batch_code}
                                    </span>
                                </div>

                                <div>
                                    <span>
                                        {item.quantity}
                                        {' × '}
                                        {currencyFormatter
                                            .format(
                                                item
                                                    .selling_price,
                                            )}
                                    </span>

                                    <strong>
                                        {currencyFormatter
                                            .format(
                                                item.line_total,
                                            )}
                                    </strong>
                                </div>
                            </article>
                        ),
                    )}
                </div>

                <div className="sale-receipt-totals">
                    <div>
                        <span>Subtotal</span>

                        <strong>
                            {currencyFormatter
                                .format(
                                    receipt.subtotal,
                                )}
                        </strong>
                    </div>

                    {receipt
                        .item_discount_total
                        > 0 && (
                            <div>
                                <span>
                                    Item Discounts
                                </span>

                                <strong>
                                    -
                                    {currencyFormatter
                                        .format(
                                            receipt
                                                .item_discount_total,
                                        )}
                                </strong>
                            </div>
                        )}

                    {receipt.discount > 0 && (
                        <div>
                            <span>
                                Sale Discount
                            </span>

                            <strong>
                                -
                                {currencyFormatter
                                    .format(
                                        receipt.discount,
                                    )}
                            </strong>
                        </div>
                    )}

                    <div className="receipt-grand-total">
                        <span>Grand Total</span>

                        <strong>
                            {currencyFormatter
                                .format(
                                    receipt.grand_total,
                                )}
                        </strong>
                    </div>

                    <div>
                        <span>Paid</span>

                        <strong>
                            {currencyFormatter
                                .format(
                                    receipt.paid_amount,
                                )}
                        </strong>
                    </div>

                    <div>
                        <span>Change</span>

                        <strong>
                            {currencyFormatter
                                .format(
                                    receipt.change_amount,
                                )}
                        </strong>
                    </div>
                </div>

                <p className="sale-receipt-thanks">
                    Thank you for your purchase.
                </p>

                <footer className="modal-actions">
                    <button
                        type="button"
                        className="primary-button"
                        onClick={onClose}
                    >
                        Close Receipt
                    </button>
                </footer>
            </section>
        </div>
    );
}