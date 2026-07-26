import type {
    SalesReturnDetails,
} from '../../types/salesReturn';

interface SalesReturnDetailsModalProps {
    details:
    SalesReturnDetails | null;

    isLoading: boolean;
    errorMessage: string;
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

export default function SalesReturnDetailsModal({
    details,
    isLoading,
    errorMessage,
    onClose,
}: SalesReturnDetailsModalProps) {
    if (
        !details
        && !isLoading
        && !errorMessage
    ) {
        return null;
    }

    const hasProfit =
        details?.profit_reversal
        !== null
        && details?.profit_reversal
        !== undefined;

    return (
        <div className="modal-backdrop">
            <section className="return-details-modal">
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Return details
                        </span>

                        <h2>
                            {details
                                ?.return_number
                                ?? 'Sales Return'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="modal-close-button"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                {isLoading ? (
                    <div className="return-modal-state">
                        <div className="small-spinner" />

                        <span>
                            Loading return details...
                        </span>
                    </div>
                ) : errorMessage ? (
                    <div className="return-modal-state">
                        <strong>
                            {errorMessage}
                        </strong>
                    </div>
                ) : details ? (
                    <div className="return-details-content">
                        <section className="return-details-overview">
                            <article>
                                <span>Original Sale</span>

                                <strong>
                                    {
                                        details
                                            .sale
                                            .sale_number
                                    }
                                </strong>
                            </article>

                            <article>
                                <span>Refund Method</span>

                                <strong>
                                    {paymentName(
                                        details
                                            .refund_method,
                                    )}
                                </strong>
                            </article>

                            <article>
                                <span>Refund Amount</span>

                                <strong>
                                    {currencyFormatter
                                        .format(
                                            details
                                                .refund_amount,
                                        )}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Restocked Quantity
                                </span>

                                <strong>
                                    {
                                        details
                                            .restocked_quantity
                                    }
                                </strong>
                            </article>
                        </section>

                        <section className="return-details-reason">
                            <span>Reason</span>

                            <strong>
                                {details.reason}
                            </strong>

                            {details.notes && (
                                <p>{details.notes}</p>
                            )}
                        </section>

                        <div className="return-details-table-container">
                            <table className="return-details-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Batch</th>
                                        <th>Quantity</th>
                                        <th>Unit Price</th>
                                        <th>Refund</th>
                                        <th>Stock Result</th>

                                        {hasProfit && (
                                            <th>
                                                Profit Reversal
                                            </th>
                                        )}
                                    </tr>
                                </thead>

                                <tbody>
                                    {details.items.map(
                                        (item) => (
                                            <tr key={item.id}>
                                                <td>
                                                    <strong>
                                                        {
                                                            item
                                                                .product
                                                                .name
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {item.batch
                                                        .batch_number
                                                        || item.batch
                                                            .batch_code}
                                                </td>

                                                <td>
                                                    {item.quantity}{' '}
                                                    {
                                                        item
                                                            .product
                                                            .unit
                                                    }
                                                </td>

                                                <td>
                                                    {currencyFormatter
                                                        .format(
                                                            item
                                                                .selling_price,
                                                        )}
                                                </td>

                                                <td>
                                                    <strong>
                                                        {currencyFormatter
                                                            .format(
                                                                item
                                                                    .refund_amount,
                                                            )}
                                                    </strong>
                                                </td>

                                                <td>
                                                    <span
                                                        className={
                                                            item.restocked
                                                                ? 'return-restocked-badge'
                                                                : 'return-not-restocked-badge'
                                                        }
                                                    >
                                                        {item.restocked
                                                            ? 'Restored'
                                                            : 'Not Restocked'}
                                                    </span>
                                                </td>

                                                {hasProfit && (
                                                    <td>
                                                        {currencyFormatter
                                                            .format(
                                                                item
                                                                    .profit_reversal
                                                                ?? 0,
                                                            )}
                                                    </td>
                                                )}
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {hasProfit && (
                            <section className="return-profit-summary">
                                <div>
                                    <span>Cost Value</span>

                                    <strong>
                                        {currencyFormatter
                                            .format(
                                                details
                                                    .cost_value
                                                ?? 0,
                                            )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Profit Reversal
                                    </span>

                                    <strong>
                                        {currencyFormatter
                                            .format(
                                                details
                                                    .profit_reversal
                                                ?? 0,
                                            )}
                                    </strong>
                                </div>
                            </section>
                        )}

                        <footer className="modal-actions">
                            <button
                                type="button"
                                className="primary-button"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </footer>
                    </div>
                ) : null}
            </section>
        </div>
    );
}