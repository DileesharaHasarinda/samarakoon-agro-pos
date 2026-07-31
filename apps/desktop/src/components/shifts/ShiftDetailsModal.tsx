import type {
    CashierShift,
} from '../../types/cashierShift';

interface ShiftDetailsModalProps {
    shift: CashierShift | null;
    onClose: () => void;
}

const currencyFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        },
    );

function formatDateTime(
    value: string | null,
): string {
    if (!value) {
        return 'Not closed';
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        },
    ).format(
        new Date(value),
    );
}

function movementName(
    value: string,
): string {
    return value
        .split('_')
        .map(
            (part) =>
                part.charAt(0)
                    .toUpperCase()
                + part.slice(1),
        )
        .join(' ');
}

const shiftDetailsModalStyles = `
    #sapo-shift-details-modal,
    #sapo-shift-details-modal *,
    #sapo-shift-details-modal *::before,
    #sapo-shift-details-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-shift-details-modal {
        --sdm-green-800: #166534;
        --sdm-green-700: #15803d;
        --sdm-red: #dc2626;
        --sdm-text: #111827;
        --sdm-text-secondary: #1f2937;
        --sdm-muted: #6b7280;
        --sdm-border: #e5e7eb;
        --sdm-border-strong: #d1d5db;
        --sdm-bg: #f9fafb;
        --sdm-white: #ffffff;
        --sdm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        inset: 0 !important;
        z-index: 1000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        margin: 0 !important;
        background: rgba(15, 23, 42, 0.5) !important;
        font-family: var(--sdm-font) !important;
        color: var(--sdm-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }

    #sapo-shift-details-modal h2,
    #sapo-shift-details-modal h3,
    #sapo-shift-details-modal p,
    #sapo-shift-details-modal span,
    #sapo-shift-details-modal strong,
    #sapo-shift-details-modal button {
        font-family: var(--sdm-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-shift-details-modal h2,
    #sapo-shift-details-modal h3,
    #sapo-shift-details-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Modal shell ---------- */
    #sapo-shift-details-modal .sdm-modal {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 640px !important;
        max-height: calc(100vh - 48px) !important;
        max-height: calc(100dvh - 48px) !important;
        background: var(--sdm-white) !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2) !important;
        overflow: hidden !important;
    }

    /* ---------- Header ---------- */
    #sapo-shift-details-modal .sdm-header {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 20px 24px !important;
        background: var(--sdm-white) !important;
        border-bottom: 1px solid var(--sdm-border) !important;
    }

    #sapo-shift-details-modal .sdm-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--sdm-green-700) !important;
        margin-bottom: 4px !important;
        background: transparent !important;
    }

    #sapo-shift-details-modal .sdm-header h2 {
        font-size: 18px !important;
        font-weight: 700 !important;
        color: var(--sdm-text) !important;
        margin-bottom: 2px !important;
    }

    #sapo-shift-details-modal .sdm-header p {
        font-size: 13px !important;
        color: var(--sdm-muted) !important;
    }

    #sapo-shift-details-modal .sdm-close-button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 32px !important;
        height: 32px !important;
        flex-shrink: 0 !important;
        font-size: 20px !important;
        line-height: 1 !important;
        color: var(--sdm-muted) !important;
        background: var(--sdm-bg) !important;
        border: 1px solid var(--sdm-border) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-shift-details-modal .sdm-close-button:hover {
        background: #f1f5f9 !important;
        color: var(--sdm-text) !important;
    }

    /* ---------- Scrollable content ---------- */
    #sapo-shift-details-modal .sdm-content {
        display: flex !important;
        flex-direction: column !important;
        gap: 20px !important;
        min-height: 0 !important;
        padding: 24px !important;
        overflow-y: auto !important;
        background: var(--sdm-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--sdm-border-strong) transparent !important;
    }

    #sapo-shift-details-modal .sdm-content::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-shift-details-modal .sdm-content::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-shift-details-modal .sdm-content::-webkit-scrollbar-thumb {
        background: var(--sdm-border-strong) !important;
        border-radius: 8px !important;
    }

    /* ---------- Detail grid ---------- */
    #sapo-shift-details-modal .sdm-detail-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
        gap: 12px !important;
    }

    #sapo-shift-details-modal .sdm-detail-grid > div {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        padding: 12px 14px !important;
        background: var(--sdm-bg) !important;
        border: 1px solid var(--sdm-border) !important;
        border-radius: 8px !important;
    }

    #sapo-shift-details-modal .sdm-detail-grid span {
        font-size: 11.5px !important;
        font-weight: 600 !important;
        color: var(--sdm-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-shift-details-modal .sdm-detail-grid strong {
        font-size: 15px !important;
        font-weight: 700 !important;
        color: var(--sdm-text) !important;
        background: transparent !important;
    }

    #sapo-shift-details-modal .sdm-positive {
        color: var(--sdm-green-700) !important;
    }

    #sapo-shift-details-modal .sdm-negative {
        color: var(--sdm-red) !important;
    }

    /* ---------- Movements section ---------- */
    #sapo-shift-details-modal .sdm-content h3 {
        font-size: 14px !important;
        font-weight: 700 !important;
        color: var(--sdm-text) !important;
        margin-bottom: 10px !important;
    }

    #sapo-shift-details-modal .sdm-movement-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
    }

    #sapo-shift-details-modal .sdm-empty-state {
        padding: 28px 16px !important;
        text-align: center !important;
        font-size: 13px !important;
        color: var(--sdm-muted) !important;
        background: var(--sdm-bg) !important;
        border: 1px solid var(--sdm-border) !important;
        border-radius: 8px !important;
    }

    #sapo-shift-details-modal .sdm-movement-item {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 12px 14px !important;
        background: var(--sdm-white) !important;
        border: 1px solid var(--sdm-border) !important;
        border-radius: 8px !important;
    }

    #sapo-shift-details-modal .sdm-movement-item:hover {
        background: var(--sdm-bg) !important;
    }

    #sapo-shift-details-modal .sdm-movement-info {
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;
        min-width: 0 !important;
    }

    #sapo-shift-details-modal .sdm-movement-info strong {
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: var(--sdm-text) !important;
        background: transparent !important;
    }

    #sapo-shift-details-modal .sdm-movement-info span {
        font-size: 12.5px !important;
        color: var(--sdm-muted) !important;
        background: transparent !important;
    }

    #sapo-shift-details-modal .sdm-movement-amount {
        flex-shrink: 0 !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        white-space: nowrap !important;
        background: transparent !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 560px) {
        #sapo-shift-details-modal {
            padding: 12px !important;
        }

        #sapo-shift-details-modal .sdm-modal {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
        }

        #sapo-shift-details-modal .sdm-header,
        #sapo-shift-details-modal .sdm-content {
            padding-left: 16px !important;
            padding-right: 16px !important;
        }
    }
`;

export default function ShiftDetailsModal({
    shift,
    onClose,
}: ShiftDetailsModalProps) {
    if (!shift) {
        return null;
    }

    return (
        <div id="sapo-shift-details-modal">
            <style>
                {shiftDetailsModalStyles}
            </style>

            <section
                className="sdm-modal"
                role="dialog"
                aria-modal="true"
            >
                <header className="sdm-header">
                    <div>
                        <span className="sdm-kicker">
                            Cash register shift
                        </span>

                        <h2>
                            {shift.shift_number}
                        </h2>

                        <p>
                            {shift.cashier.name}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="sdm-close-button"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </header>

                <div className="sdm-content">
                    <div className="sdm-detail-grid">
                        <div>
                            <span>
                                Opened
                            </span>

                            <strong>
                                {formatDateTime(
                                    shift.opened_at,
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Closed
                            </span>

                            <strong>
                                {formatDateTime(
                                    shift.closed_at,
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Opening Cash
                            </span>

                            <strong>
                                {currencyFormatter
                                    .format(
                                        shift
                                            .opening_cash,
                                    )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Cash Collections
                            </span>

                            <strong>
                                {currencyFormatter
                                    .format(
                                        shift
                                            .totals
                                            .cash_collections,
                                    )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Cash In
                            </span>

                            <strong>
                                {currencyFormatter
                                    .format(
                                        shift
                                            .totals
                                            .cash_in,
                                    )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Cash Out
                            </span>

                            <strong>
                                {currencyFormatter
                                    .format(
                                        shift
                                            .totals
                                            .cash_out,
                                    )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Cash Refunds
                            </span>

                            <strong>
                                {currencyFormatter
                                    .format(
                                        shift
                                            .totals
                                            .cash_refunds,
                                    )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Expected Cash
                            </span>

                            <strong>
                                {currencyFormatter
                                    .format(
                                        shift
                                            .expected_cash,
                                    )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Actual Cash
                            </span>

                            <strong>
                                {shift.actual_cash
                                    !== null
                                    ? currencyFormatter
                                        .format(
                                            shift
                                                .actual_cash,
                                        )
                                    : 'Open shift'}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Difference
                            </span>

                            <strong
                                className={
                                    (
                                        shift
                                            .cash_difference
                                        ?? 0
                                    ) >= 0
                                        ? 'sdm-positive'
                                        : 'sdm-negative'
                                }
                            >
                                {shift.cash_difference
                                    !== null
                                    ? currencyFormatter
                                        .format(
                                            shift
                                                .cash_difference,
                                        )
                                    : 'Not closed'}
                            </strong>
                        </div>
                    </div>

                    <section>
                        <h3>
                            Cash Movements
                        </h3>

                        <div className="sdm-movement-list">
                            {shift.movements.length
                                === 0 ? (
                                <div className="sdm-empty-state">
                                    No manual cash movements.
                                </div>
                            ) : (
                                shift.movements.map(
                                    (movement) => (
                                        <article
                                            key={
                                                movement.id
                                            }
                                            className="sdm-movement-item"
                                        >
                                            <div className="sdm-movement-info">
                                                <strong>
                                                    {movementName(
                                                        movement
                                                            .reason,
                                                    )}
                                                </strong>

                                                <span>
                                                    {
                                                        movement
                                                            .description
                                                    }
                                                    {' · '}
                                                    {formatDateTime(
                                                        movement
                                                            .occurred_at,
                                                    )}
                                                </span>
                                            </div>

                                            <strong
                                                className={
                                                    (
                                                        movement
                                                            .movement_type
                                                            === 'cash_in'
                                                            ? 'sdm-positive'
                                                            : 'sdm-negative'
                                                    )
                                                    + ' sdm-movement-amount'
                                                }
                                            >
                                                {movement
                                                    .movement_type
                                                    === 'cash_in'
                                                    ? '+'
                                                    : '-'}

                                                {currencyFormatter
                                                    .format(
                                                        movement
                                                            .amount,
                                                    )}
                                            </strong>
                                        </article>
                                    ),
                                )
                            )}
                        </div>
                    </section>
                </div>
            </section>
        </div>
    );
}