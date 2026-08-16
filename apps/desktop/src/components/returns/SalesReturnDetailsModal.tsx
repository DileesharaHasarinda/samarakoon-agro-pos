import type {
    SalesReturnDetails,
} from '../../types/salesReturn';

interface SalesReturnDetailsModalProps {
    details:
    SalesReturnDetails | null;

    isLoading: boolean;
    errorMessage: string;

    restockError: string;
    restockSuccess: string;

    restockingItemId:
    number | null;

    onRestockItem: (
        itemId: number,
    ) => void;

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

const returnDetailsModalStyles = `
    #sapo-return-details-modal,
    #sapo-return-details-modal *,
    #sapo-return-details-modal *::before,
    #sapo-return-details-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-return-details-modal {
        --rdm-green-800: #166534;
        --rdm-green-700: #15803d;
        --rdm-green-100: #dcfce7;
        --rdm-red: #dc2626;
        --rdm-red-light: #fef2f2;
        --rdm-amber: #b45309;
        --rdm-amber-light: #fffbeb;
        --rdm-text: #111827;
        --rdm-text-secondary: #1f2937;
        --rdm-muted: #6b7280;
        --rdm-border: #e5e7eb;
        --rdm-border-strong: #d1d5db;
        --rdm-bg: #f9fafb;
        --rdm-white: #ffffff;
        --rdm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        inset: 0 !important;
        z-index: 1000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        margin: 0 !important;
        background: rgba(15, 23, 42, 0.5) !important;
        font-family: var(--rdm-font) !important;
        color: var(--rdm-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }

    #sapo-return-details-modal h2,
    #sapo-return-details-modal p,
    #sapo-return-details-modal span,
    #sapo-return-details-modal strong,
    #sapo-return-details-modal small,
    #sapo-return-details-modal button,
    #sapo-return-details-modal table,
    #sapo-return-details-modal th,
    #sapo-return-details-modal td {
        font-family: var(--rdm-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-return-details-modal h2,
    #sapo-return-details-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Modal shell ---------- */
    #sapo-return-details-modal .rdm-modal {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 780px !important;
        max-height: calc(100vh - 48px) !important;
        max-height: calc(100dvh - 48px) !important;
        background: var(--rdm-white) !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2) !important;
        overflow: hidden !important;
    }

    /* ---------- Header ---------- */
    #sapo-return-details-modal .rdm-header {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 20px 24px !important;
        background: var(--rdm-white) !important;
        border-bottom: 1px solid var(--rdm-border) !important;
    }

    #sapo-return-details-modal .rdm-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--rdm-green-700) !important;
        margin-bottom: 4px !important;
        background: transparent !important;
    }

    #sapo-return-details-modal .rdm-header h2 {
        font-size: 18px !important;
        font-weight: 700 !important;
        color: var(--rdm-text) !important;
    }

    #sapo-return-details-modal .rdm-close-button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 32px !important;
        height: 32px !important;
        flex-shrink: 0 !important;
        font-size: 20px !important;
        line-height: 1 !important;
        color: var(--rdm-muted) !important;
        background: var(--rdm-bg) !important;
        border: 1px solid var(--rdm-border) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-return-details-modal .rdm-close-button:hover {
        background: #f1f5f9 !important;
        color: var(--rdm-text) !important;
    }

    /* ---------- Loading / error states ---------- */
    #sapo-return-details-modal .rdm-state {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        padding: 48px 24px !important;
        background: var(--rdm-white) !important;
    }

    #sapo-return-details-modal .rdm-state strong {
        font-size: 13.5px !important;
        font-weight: 500 !important;
        color: var(--rdm-red) !important;
        background: transparent !important;
    }

    #sapo-return-details-modal .rdm-state span {
        font-size: 13.5px !important;
        color: var(--rdm-muted) !important;
        background: transparent !important;
    }

    #sapo-return-details-modal .rdm-spinner {
        width: 18px !important;
        height: 18px !important;
        border: 2px solid var(--rdm-border-strong) !important;
        border-top-color: var(--rdm-green-700) !important;
        border-radius: 999px !important;
        animation: rdm-spin 0.7s linear infinite !important;
    }

    @keyframes rdm-spin {
        to {
            transform: rotate(360deg);
        }
    }

    /* ---------- Scrollable content ---------- */
    #sapo-return-details-modal .rdm-content {
        display: flex !important;
        flex-direction: column !important;
        gap: 18px !important;
        min-height: 0 !important;
        padding: 24px !important;
        overflow-y: auto !important;
        background: var(--rdm-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--rdm-border-strong) transparent !important;
    }

    #sapo-return-details-modal .rdm-content::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-return-details-modal .rdm-content::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-return-details-modal .rdm-content::-webkit-scrollbar-thumb {
        background: var(--rdm-border-strong) !important;
        border-radius: 8px !important;
    }

    /* ---------- Overview grid ---------- */
    #sapo-return-details-modal .rdm-overview {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
        gap: 12px !important;
    }

    #sapo-return-details-modal .rdm-overview article {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        padding: 12px 14px !important;
        background: var(--rdm-bg) !important;
        border: 1px solid var(--rdm-border) !important;
        border-radius: 8px !important;
    }

    #sapo-return-details-modal .rdm-overview span {
        font-size: 11.5px !important;
        font-weight: 600 !important;
        color: var(--rdm-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-return-details-modal .rdm-overview strong {
        font-size: 15px !important;
        font-weight: 700 !important;
        color: var(--rdm-text) !important;
        background: transparent !important;
    }

    /* ---------- Reason ---------- */
    #sapo-return-details-modal .rdm-reason {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        padding: 14px 16px !important;
        background: var(--rdm-amber-light) !important;
        border: 1px solid #fde68a !important;
        border-radius: 8px !important;
    }

    #sapo-return-details-modal .rdm-reason span {
        font-size: 11.5px !important;
        font-weight: 600 !important;
        color: var(--rdm-amber) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-return-details-modal .rdm-reason strong {
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: var(--rdm-text) !important;
        background: transparent !important;
    }

    #sapo-return-details-modal .rdm-reason p {
        font-size: 13px !important;
        color: var(--rdm-text-secondary) !important;
        line-height: 1.5 !important;
    }

    /* ---------- Line items table ---------- */
    #sapo-return-details-modal .rdm-table-container {
        max-height: 260px !important;
        overflow-y: auto !important;
        overflow-x: auto !important;
        border: 1px solid var(--rdm-border) !important;
        border-radius: 8px !important;
        background: var(--rdm-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--rdm-border-strong) transparent !important;
    }

    #sapo-return-details-modal .rdm-table-container::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
    }

    #sapo-return-details-modal .rdm-table-container::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-return-details-modal .rdm-table-container::-webkit-scrollbar-thumb {
        background: var(--rdm-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-return-details-modal .rdm-table {
        width: 100% !important;
        min-width: 560px !important;
        border-collapse: collapse !important;
        font-size: 13px !important;
        background: var(--rdm-white) !important;
    }

    #sapo-return-details-modal .rdm-table thead {
        position: sticky !important;
        top: 0 !important;
        z-index: 1 !important;
    }

    #sapo-return-details-modal .rdm-table thead th {
        background: #f9fafb !important;
        color: var(--rdm-muted) !important;
        font-size: 11.5px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        text-align: left !important;
        padding: 10px 12px !important;
        border-bottom: 1px solid var(--rdm-border) !important;
        white-space: nowrap !important;
    }

    #sapo-return-details-modal .rdm-table tbody td {
        padding: 11px 12px !important;
        border-bottom: 1px solid #f1f5f9 !important;
        vertical-align: middle !important;
        color: var(--rdm-text-secondary) !important;
        background: var(--rdm-white) !important;
        white-space: nowrap !important;
    }

    #sapo-return-details-modal .rdm-table tbody tr:last-child td {
        border-bottom: none !important;
    }

    #sapo-return-details-modal .rdm-table td strong {
        font-weight: 600 !important;
        color: var(--rdm-text) !important;
        background: transparent !important;
    }

    #sapo-return-details-modal .rdm-restocked-badge,
    #sapo-return-details-modal .rdm-not-restocked-badge {
        display: inline-block !important;
        padding: 3px 9px !important;
        border-radius: 999px !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
    }

    #sapo-return-details-modal .rdm-restocked-badge {
        background: var(--rdm-green-100) !important;
        color: var(--rdm-green-800) !important;
    }

    #sapo-return-details-modal .rdm-not-restocked-badge {
        background: var(--rdm-red-light) !important;
        color: #b91c1c !important;
    }

    /* ---------- Delayed restock action ---------- */
    #sapo-return-details-modal .rdm-stock-result {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 6px !important;
    }

    #sapo-return-details-modal .rdm-restock-button {
        min-height: 30px !important;
        padding: 5px 10px !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        background: var(--rdm-green-700) !important;
        border: 1px solid var(--rdm-green-700) !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: background 0.15s ease, opacity 0.15s ease !important;
    }

    #sapo-return-details-modal
    .rdm-restock-button:hover:not(:disabled) {
        background: var(--rdm-green-800) !important;
    }

    #sapo-return-details-modal
    .rdm-restock-button:focus-visible {
        outline: none !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.18) !important;
    }

    #sapo-return-details-modal
    .rdm-restock-button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    #sapo-return-details-modal .rdm-restock-success {
        padding: 10px 12px !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--rdm-green-800) !important;
        background: #f0fdf4 !important;
        border: 1px solid #bbf7d0 !important;
        border-radius: 7px !important;
    }

    #sapo-return-details-modal .rdm-restock-error {
        padding: 10px 12px !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: #b91c1c !important;
        background: var(--rdm-red-light) !important;
        border: 1px solid #fecaca !important;
        border-radius: 7px !important;
    }

    /* ---------- Profit summary ---------- */
    #sapo-return-details-modal .rdm-profit-summary {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
        gap: 12px !important;
    }

    #sapo-return-details-modal .rdm-profit-summary > div {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        padding: 12px 14px !important;
        background: var(--rdm-bg) !important;
        border: 1px solid var(--rdm-border) !important;
        border-radius: 8px !important;
    }

    #sapo-return-details-modal .rdm-profit-summary span {
        font-size: 11.5px !important;
        font-weight: 600 !important;
        color: var(--rdm-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-return-details-modal .rdm-profit-summary strong {
        font-size: 15px !important;
        font-weight: 700 !important;
        color: var(--rdm-red) !important;
        background: transparent !important;
    }

    /* ---------- Footer actions ---------- */
    #sapo-return-details-modal .rdm-actions {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        padding: 16px 24px !important;
        background: var(--rdm-bg) !important;
        border-top: 1px solid var(--rdm-border) !important;
    }

    #sapo-return-details-modal .rdm-primary-button {
        padding: 9px 20px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        background: var(--rdm-green-700) !important;
        border: 1px solid var(--rdm-green-700) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease !important;
    }

    #sapo-return-details-modal .rdm-primary-button:hover {
        background: var(--rdm-green-800) !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 640px) {
        #sapo-return-details-modal {
            padding: 12px !important;
        }

        #sapo-return-details-modal .rdm-modal {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
        }

        #sapo-return-details-modal .rdm-header,
        #sapo-return-details-modal .rdm-content,
        #sapo-return-details-modal .rdm-actions {
            padding-left: 16px !important;
            padding-right: 16px !important;
        }
    }
`;

export default function SalesReturnDetailsModal({
    details,
    isLoading,
    errorMessage,
    restockError,
    restockSuccess,
    restockingItemId,
    onRestockItem,
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
        <div id="sapo-return-details-modal">
            <style>
                {returnDetailsModalStyles}
            </style>

            <section className="rdm-modal">
                <header className="rdm-header">
                    <div>
                        <span className="rdm-kicker">
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
                        className="rdm-close-button"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </header>

                {isLoading ? (
                    <div className="rdm-state">
                        <div className="rdm-spinner" />

                        <span>
                            Loading return details...
                        </span>
                    </div>
                ) : errorMessage ? (
                    <div className="rdm-state">
                        <strong>
                            {errorMessage}
                        </strong>
                    </div>
                ) : details ? (
                    <div className="rdm-content">
                        <section className="rdm-overview">
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

                        <section className="rdm-reason">
                            <span>Reason</span>

                            <strong>
                                {details.reason}
                            </strong>

                            {details.notes && (
                                <p>{details.notes}</p>
                            )}
                        </section>

                        {restockSuccess && (
                            <div
                                className="rdm-restock-success"
                                role="status"
                            >
                                {restockSuccess}
                            </div>
                        )}

                        {restockError && (
                            <div
                                className="rdm-restock-error"
                                role="alert"
                            >
                                {restockError}
                            </div>
                        )}

                        <div className="rdm-table-container">
                            <table className="rdm-table">
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
                                                            .return_unit
                                                        || item
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
                                                    <div className="rdm-stock-result">
                                                        <span
                                                            className={
                                                                item.restocked
                                                                    ? 'rdm-restocked-badge'
                                                                    : 'rdm-not-restocked-badge'
                                                            }
                                                        >
                                                            {item.restocked
                                                                ? 'Restored'
                                                                : 'Not Restocked'}
                                                        </span>

                                                        {!item.restocked && (
                                                            <button
                                                                type="button"
                                                                className="rdm-restock-button"
                                                                disabled={
                                                                    restockingItemId
                                                                    !== null
                                                                }
                                                                onClick={() => {
                                                                    onRestockItem(
                                                                        item.id,
                                                                    );
                                                                }}
                                                            >
                                                                {restockingItemId
                                                                    === item.id
                                                                    ? 'Restocking...'
                                                                    : 'Restock Now'}
                                                            </button>
                                                        )}
                                                    </div>
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
                            <section className="rdm-profit-summary">
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

                        <footer className="rdm-actions">
                            <button
                                type="button"
                                className="rdm-primary-button"
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