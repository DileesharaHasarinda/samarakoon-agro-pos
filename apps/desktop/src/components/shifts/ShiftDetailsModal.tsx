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

export default function ShiftDetailsModal({
    shift,
    onClose,
}: ShiftDetailsModalProps) {
    if (!shift) {
        return null;
    }

    return (
        <div className="modal-backdrop">
            <section
                className="shift-details-modal"
                role="dialog"
                aria-modal="true"
            >
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
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
                        className="modal-close-button"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="shift-details-content">
                    <div className="shift-detail-grid">
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
                                        ? 'shift-positive'
                                        : 'shift-negative'
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

                        <div className="shift-movement-list">
                            {shift.movements.length
                                === 0 ? (
                                <div className="table-state">
                                    No manual cash movements.
                                </div>
                            ) : (
                                shift.movements.map(
                                    (movement) => (
                                        <article
                                            key={
                                                movement.id
                                            }
                                        >
                                            <div>
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
                                                    movement
                                                        .movement_type
                                                        === 'cash_in'
                                                        ? 'shift-positive'
                                                        : 'shift-negative'
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