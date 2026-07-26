import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import ShiftDetailsModal
    from '../../components/shifts/ShiftDetailsModal';

import {
    ApiError,
} from '../../lib/api';

import {
    closeCashierShift,
    createCashMovement,
    getCashierShift,
    getCashierShifts,
    getCurrentCashierShift,
    openCashierShift,
} from '../../services/cashierShiftService';

import type {
    CashierShift,
    CashierShiftSummary,
    CashMovementReason,
    CashMovementType,
} from '../../types/cashierShift';

import type {
    PosPaginationMeta,
} from '../../types/sale';

const currencyFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        },
    );

const emptySummary:
    CashierShiftSummary = {
    total_shifts: 0,
    open_shifts: 0,
    closed_shifts: 0,
    total_opening_cash: 0,
    total_expected_cash: 0,
    total_difference: 0,
};

const emptyPagination:
    PosPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: null,
    to: null,
};

function formatDateTime(
    value: string | null,
): string {
    if (!value) {
        return 'Open';
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

function parseMovementType(
    value: string,
): CashMovementType {
    return value === 'cash_out'
        ? 'cash_out'
        : 'cash_in';
}

function parseMovementReason(
    value: string,
): CashMovementReason {
    switch (value) {
        case 'cash_float':
            return 'cash_float';

        case 'cash_drop':
            return 'cash_drop';

        case 'petty_cash':
            return 'petty_cash';

        case 'expense':
            return 'expense';

        case 'deposit':
            return 'deposit';

        case 'withdrawal':
            return 'withdrawal';

        default:
            return 'other';
    }
}

export default function ShiftRegisterPage() {
    const {
        token,
        user,
    } = useAuth();

    const isAdmin =
        user?.role === 'admin';

    const [
        currentShift,
        setCurrentShift,
    ] = useState<CashierShift | null>(
        null,
    );

    const [
        shifts,
        setShifts,
    ] = useState<CashierShift[]>([]);

    const [
        selectedShift,
        setSelectedShift,
    ] = useState<CashierShift | null>(
        null,
    );

    const [
        summary,
        setSummary,
    ] = useState<CashierShiftSummary>(
        emptySummary,
    );

    const [
        pagination,
        setPagination,
    ] = useState<PosPaginationMeta>(
        emptyPagination,
    );

    const [
        openingCash,
        setOpeningCash,
    ] = useState(0);

    const [
        openingNotes,
        setOpeningNotes,
    ] = useState('');

    const [
        actualCash,
        setActualCash,
    ] = useState(0);

    const [
        closingNotes,
        setClosingNotes,
    ] = useState('');

    const [
        movementType,
        setMovementType,
    ] = useState<CashMovementType>(
        'cash_in',
    );

    const [
        movementReason,
        setMovementReason,
    ] = useState<CashMovementReason>(
        'cash_float',
    );

    const [
        movementAmount,
        setMovementAmount,
    ] = useState(0);

    const [
        movementDescription,
        setMovementDescription,
    ] = useState('');

    const [
        movementReference,
        setMovementReference,
    ] = useState('');

    const [
        searchInput,
        setSearchInput,
    ] = useState('');

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        status,
        setStatus,
    ] = useState('all');

    const [
        dateFrom,
        setDateFrom,
    ] = useState('');

    const [
        dateTo,
        setDateTo,
    ] = useState('');

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        perPage,
        setPerPage,
    ] = useState(20);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        formError,
        setFormError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const loadCurrentShift =
        useCallback(
            async (): Promise<void> => {
                if (
                    !token
                    || isAdmin
                ) {
                    setCurrentShift(null);

                    return;
                }

                try {
                    const response =
                        await getCurrentCashierShift(
                            token,
                        );

                    setCurrentShift(
                        response.data,
                    );

                    if (response.data) {
                        setActualCash(
                            response
                                .data
                                .expected_cash,
                        );
                    }
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load the current shift.',
                    );
                }
            },
            [
                token,
                isAdmin,
            ],
        );

    const loadShiftHistory =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getCashierShifts(
                            token,
                            {
                                search,
                                status,
                                dateFrom,
                                dateTo,
                                page,
                                perPage,
                            },
                        );

                    setShifts(
                        response.data,
                    );

                    setSummary(
                        response.summary,
                    );

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load cashier shifts.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [
                token,
                search,
                status,
                dateFrom,
                dateTo,
                page,
                perPage,
            ],
        );

    useEffect(() => {
        void Promise.all([
            loadCurrentShift(),
            loadShiftHistory(),
        ]);
    }, [
        loadCurrentShift,
        loadShiftHistory,
    ]);

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    setSearch(
                        searchInput.trim(),
                    );

                    setPage(1);
                },
                300,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [searchInput]);

    const handleOpenShift =
        async (): Promise<void> => {
            if (!token) {
                return;
            }

            if (
                !Number.isFinite(
                    openingCash,
                )
                || openingCash < 0
            ) {
                setFormError(
                    'Enter a valid opening cash amount.',
                );

                return;
            }

            setIsSubmitting(true);
            setFormError('');
            setSuccessMessage('');

            try {
                const response =
                    await openCashierShift(
                        token,
                        {
                            opening_cash:
                                openingCash,

                            opening_notes:
                                openingNotes,
                        },
                    );

                setCurrentShift(
                    response.data,
                );

                setSuccessMessage(
                    response.message
                    ?? 'Cashier shift opened successfully.',
                );

                setOpeningCash(0);
                setOpeningNotes('');

                if (response.data) {
                    setActualCash(
                        response
                            .data
                            .expected_cash,
                    );
                }

                await loadShiftHistory();
            } catch (error) {
                setFormError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to open the cashier shift.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const handleRecordMovement =
        async (): Promise<void> => {
            if (
                !token
                || !currentShift
            ) {
                return;
            }

            if (
                !Number.isFinite(
                    movementAmount,
                )
                || movementAmount <= 0
            ) {
                setFormError(
                    'Cash movement amount must be greater than zero.',
                );

                return;
            }

            if (
                !movementDescription
                    .trim()
            ) {
                setFormError(
                    'Enter a description for the cash movement.',
                );

                return;
            }

            setIsSubmitting(true);
            setFormError('');
            setSuccessMessage('');

            try {
                const response =
                    await createCashMovement(
                        token,
                        currentShift.id,
                        {
                            movement_type:
                                movementType,

                            reason:
                                movementReason,

                            amount:
                                movementAmount,

                            description:
                                movementDescription,

                            reference_number:
                                movementReference,
                        },
                    );

                setCurrentShift(
                    response
                        .data
                        .shift,
                );

                setActualCash(
                    response
                        .data
                        .shift
                        .expected_cash,
                );

                setSuccessMessage(
                    response.message,
                );

                setMovementAmount(0);
                setMovementDescription('');
                setMovementReference('');

                await loadShiftHistory();
            } catch (error) {
                setFormError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to record the cash movement.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const handleCloseShift =
        async (): Promise<void> => {
            if (
                !token
                || !currentShift
            ) {
                return;
            }

            if (
                !Number.isFinite(
                    actualCash,
                )
                || actualCash < 0
            ) {
                setFormError(
                    'Enter a valid actual cash amount.',
                );

                return;
            }

            const confirmed =
                window.confirm(
                    'Close the current cashier shift? You will need to open a new shift before completing more transactions.',
                );

            if (!confirmed) {
                return;
            }

            setIsSubmitting(true);
            setFormError('');
            setSuccessMessage('');

            try {
                const response =
                    await closeCashierShift(
                        token,
                        currentShift.id,
                        {
                            actual_cash:
                                actualCash,

                            closing_notes:
                                closingNotes,
                        },
                    );

                setCurrentShift(null);

                setSuccessMessage(
                    response.message
                    ?? 'Cashier shift closed successfully.',
                );

                setActualCash(0);
                setClosingNotes('');

                await loadShiftHistory();
            } catch (error) {
                setFormError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to close the cashier shift.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const openShiftDetails =
        async (
            shiftId: number,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setPageError('');

            try {
                const response =
                    await getCashierShift(
                        token,
                        shiftId,
                    );

                setSelectedShift(
                    response.data,
                );
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to load shift details.',
                );
            }
        };

    return (
        <div className="page-stack">
            <section className="shift-page-header">
                <div>
                    <span className="page-kicker">
                        Cash register control
                    </span>

                    <h2>
                        {isAdmin
                            ? 'Cashier Shifts'
                            : 'My Cash Register'}
                    </h2>

                    <p>
                        {isAdmin
                            ? 'Review cashier shifts, closing balances and cash differences.'
                            : 'Open your shift, manage drawer movements and close the register.'}
                    </p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    disabled={isLoading}
                    onClick={() => {
                        void Promise.all([
                            loadCurrentShift(),
                            loadShiftHistory(),
                        ]);
                    }}
                >
                    Refresh
                </button>
            </section>

            {successMessage && (
                <div
                    className="success-alert"
                    role="status"
                >
                    <span>✓</span>

                    <p>
                        {successMessage}
                    </p>

                    <button
                        type="button"
                        aria-label="Dismiss success message"
                        onClick={() => {
                            setSuccessMessage('');
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            {(pageError
                || formError) && (
                    <div
                        className="form-alert"
                        role="alert"
                    >
                        {formError
                            || pageError}
                    </div>
                )}

            {!isAdmin
                && !currentShift && (
                    <section className="content-card shift-open-panel">
                        <header>
                            <span className="page-kicker">
                                Start work
                            </span>

                            <h3>
                                Open Cashier Shift
                            </h3>

                            <p>
                                Count the drawer and
                                enter the opening cash.
                            </p>
                        </header>

                        <div className="shift-open-form">
                            <label>
                                <span>
                                    Opening Cash
                                </span>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={openingCash}
                                    disabled={isSubmitting}
                                    onChange={(event) => {
                                        setOpeningCash(
                                            Number(
                                                event
                                                    .target
                                                    .value,
                                            ),
                                        );

                                        setFormError('');
                                    }}
                                />
                            </label>

                            <label>
                                <span>
                                    Opening Notes
                                </span>

                                <textarea
                                    rows={2}
                                    value={openingNotes}
                                    disabled={isSubmitting}
                                    onChange={(event) => {
                                        setOpeningNotes(
                                            event
                                                .target
                                                .value,
                                        );
                                    }}
                                />
                            </label>

                            <button
                                type="button"
                                className="primary-button"
                                disabled={isSubmitting}
                                onClick={() => {
                                    void handleOpenShift();
                                }}
                            >
                                {isSubmitting
                                    ? 'Opening...'
                                    : 'Open Shift'}
                            </button>
                        </div>
                    </section>
                )}

            {!isAdmin
                && currentShift && (
                    <>
                        <section className="current-shift-banner">
                            <div>
                                <span>
                                    Current Shift
                                </span>

                                <strong>
                                    {
                                        currentShift
                                            .shift_number
                                    }
                                </strong>

                                <small>
                                    Opened{' '}

                                    {formatDateTime(
                                        currentShift
                                            .opened_at,
                                    )}
                                </small>
                            </div>

                            <span className="shift-status-open">
                                Open
                            </span>
                        </section>

                        <section className="shift-current-summary">
                            <article>
                                <span>
                                    Opening Cash
                                </span>

                                <strong>
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .opening_cash,
                                        )}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Cash Collected
                                </span>

                                <strong>
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .totals
                                                .cash_collections,
                                        )}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Cash Refunds
                                </span>

                                <strong className="shift-negative">
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .totals
                                                .cash_refunds,
                                        )}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Cash In
                                </span>

                                <strong className="shift-positive">
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .totals
                                                .cash_in,
                                        )}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Cash Out
                                </span>

                                <strong className="shift-negative">
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .totals
                                                .cash_out,
                                        )}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Expected Cash
                                </span>

                                <strong>
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .expected_cash,
                                        )}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Sales
                                </span>

                                <strong>
                                    {
                                        currentShift
                                            .totals
                                            .sales_count
                                    }
                                </strong>

                                <small>
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .totals
                                                .sales_total,
                                        )}
                                </small>
                            </article>

                            <article>
                                <span>
                                    Due Created
                                </span>

                                <strong>
                                    {currencyFormatter
                                        .format(
                                            currentShift
                                                .totals
                                                .due_created,
                                        )}
                                </strong>
                            </article>
                        </section>

                        <section className="shift-action-grid">
                            <article className="content-card">
                                <header className="shift-card-heading">
                                    <span className="page-kicker">
                                        Drawer movement
                                    </span>

                                    <h3>
                                        Cash In / Cash Out
                                    </h3>
                                </header>

                                <div className="shift-movement-form">
                                    <label>
                                        <span>
                                            Type
                                        </span>

                                        <select
                                            value={
                                                movementType
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setMovementType(
                                                    parseMovementType(
                                                        event
                                                            .target
                                                            .value,
                                                    ),
                                                );
                                            }}
                                        >
                                            <option value="cash_in">
                                                Cash In
                                            </option>

                                            <option value="cash_out">
                                                Cash Out
                                            </option>
                                        </select>
                                    </label>

                                    <label>
                                        <span>
                                            Reason
                                        </span>

                                        <select
                                            value={
                                                movementReason
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setMovementReason(
                                                    parseMovementReason(
                                                        event
                                                            .target
                                                            .value,
                                                    ),
                                                );
                                            }}
                                        >
                                            <option value="cash_float">
                                                Additional Float
                                            </option>

                                            <option value="cash_drop">
                                                Cash Drop
                                            </option>

                                            <option value="petty_cash">
                                                Petty Cash
                                            </option>

                                            <option value="expense">
                                                Expense
                                            </option>

                                            <option value="deposit">
                                                Deposit
                                            </option>

                                            <option value="withdrawal">
                                                Withdrawal
                                            </option>

                                            <option value="other">
                                                Other
                                            </option>
                                        </select>
                                    </label>

                                    <label>
                                        <span>
                                            Amount
                                        </span>

                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={
                                                movementAmount
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setMovementAmount(
                                                    Number(
                                                        event
                                                            .target
                                                            .value,
                                                    ),
                                                );

                                                setFormError('');
                                            }}
                                        />
                                    </label>

                                    <label className="shift-wide-field">
                                        <span>
                                            Description
                                        </span>

                                        <input
                                            value={
                                                movementDescription
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setMovementDescription(
                                                    event
                                                        .target
                                                        .value,
                                                );
                                            }}
                                        />
                                    </label>

                                    <label className="shift-wide-field">
                                        <span>
                                            Reference Number
                                        </span>

                                        <input
                                            value={
                                                movementReference
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setMovementReference(
                                                    event
                                                        .target
                                                        .value,
                                                );
                                            }}
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        className="secondary-button shift-wide-field"
                                        disabled={isSubmitting}
                                        onClick={() => {
                                            void handleRecordMovement();
                                        }}
                                    >
                                        Record Cash Movement
                                    </button>
                                </div>
                            </article>

                            <article className="content-card">
                                <header className="shift-card-heading">
                                    <span className="page-kicker">
                                        End work
                                    </span>

                                    <h3>
                                        Close Cash Register
                                    </h3>
                                </header>

                                <div className="shift-close-form">
                                    <div className="shift-expected-box">
                                        <span>
                                            Expected Cash
                                        </span>

                                        <strong>
                                            {currencyFormatter
                                                .format(
                                                    currentShift
                                                        .expected_cash,
                                                )}
                                        </strong>
                                    </div>

                                    <label>
                                        <span>
                                            Actual Counted Cash
                                        </span>

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={actualCash}
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setActualCash(
                                                    Number(
                                                        event
                                                            .target
                                                            .value,
                                                    ),
                                                );

                                                setFormError('');
                                            }}
                                        />
                                    </label>

                                    <div className="shift-difference-preview">
                                        <span>
                                            Difference
                                        </span>

                                        <strong
                                            className={
                                                actualCash
                                                    - currentShift
                                                        .expected_cash
                                                    >= 0
                                                    ? 'shift-positive'
                                                    : 'shift-negative'
                                            }
                                        >
                                            {currencyFormatter
                                                .format(
                                                    actualCash
                                                    - currentShift
                                                        .expected_cash,
                                                )}
                                        </strong>
                                    </div>

                                    <label>
                                        <span>
                                            Closing Notes
                                        </span>

                                        <textarea
                                            rows={3}
                                            value={
                                                closingNotes
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                setClosingNotes(
                                                    event
                                                        .target
                                                        .value,
                                                );
                                            }}
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        className="shift-close-button"
                                        disabled={isSubmitting}
                                        onClick={() => {
                                            void handleCloseShift();
                                        }}
                                    >
                                        {isSubmitting
                                            ? 'Closing...'
                                            : 'Close Shift'}
                                    </button>
                                </div>
                            </article>
                        </section>
                    </>
                )}

            <section className="shift-history-summary">
                <article>
                    <span>
                        Total Shifts
                    </span>

                    <strong>
                        {summary.total_shifts}
                    </strong>
                </article>

                <article>
                    <span>
                        Open Shifts
                    </span>

                    <strong>
                        {summary.open_shifts}
                    </strong>
                </article>

                <article>
                    <span>
                        Closed Shifts
                    </span>

                    <strong>
                        {summary.closed_shifts}
                    </strong>
                </article>

                <article>
                    <span>
                        Total Difference
                    </span>

                    <strong
                        className={
                            summary
                                .total_difference
                                >= 0
                                ? 'shift-positive'
                                : 'shift-negative'
                        }
                    >
                        {currencyFormatter
                            .format(
                                summary
                                    .total_difference,
                            )}
                    </strong>
                </article>
            </section>

            <section className="content-card">
                <div className="shift-history-toolbar">
                    <input
                        type="search"
                        value={searchInput}
                        placeholder="Search shift number or cashier..."
                        onChange={(event) => {
                            setSearchInput(
                                event.target.value,
                            );
                        }}
                    />

                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(
                                event.target.value,
                            );

                            setPage(1);
                        }}
                    >
                        <option value="all">
                            All Shifts
                        </option>

                        <option value="open">
                            Open
                        </option>

                        <option value="closed">
                            Closed
                        </option>
                    </select>

                    <label>
                        <span>
                            From
                        </span>

                        <input
                            type="date"
                            value={dateFrom}
                            max={
                                dateTo
                                || undefined
                            }
                            onChange={(event) => {
                                setDateFrom(
                                    event.target.value,
                                );

                                setPage(1);
                            }}
                        />
                    </label>

                    <label>
                        <span>
                            To
                        </span>

                        <input
                            type="date"
                            value={dateTo}
                            min={
                                dateFrom
                                || undefined
                            }
                            onChange={(event) => {
                                setDateTo(
                                    event.target.value,
                                );

                                setPage(1);
                            }}
                        />
                    </label>

                    <select
                        value={perPage}
                        onChange={(event) => {
                            setPerPage(
                                Number(
                                    event.target.value,
                                ),
                            );

                            setPage(1);
                        }}
                    >
                        <option value={10}>
                            10 rows
                        </option>

                        <option value={20}>
                            20 rows
                        </option>

                        <option value={50}>
                            50 rows
                        </option>
                    </select>
                </div>

                <div className="shift-table-container">
                    <table className="shift-table">
                        <thead>
                            <tr>
                                <th>Shift</th>
                                <th>Cashier</th>
                                <th>Opened</th>
                                <th>Closed</th>
                                <th>Sales</th>
                                <th>Cash Collected</th>
                                <th>Expected</th>
                                <th>Actual</th>
                                <th>Difference</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={11}
                                        className="table-state"
                                    >
                                        Loading cashier shifts...
                                    </td>
                                </tr>
                            ) : shifts.length
                                === 0 ? (
                                <tr>
                                    <td
                                        colSpan={11}
                                        className="table-state"
                                    >
                                        No cashier shifts found.
                                    </td>
                                </tr>
                            ) : (
                                shifts.map(
                                    (shift) => (
                                        <tr
                                            key={shift.id}
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        shift
                                                            .shift_number
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        shift
                                                            .cashier
                                                            .name
                                                    }
                                                </strong>

                                                <small>
                                                    @
                                                    {
                                                        shift
                                                            .cashier
                                                            .username
                                                    }
                                                </small>
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    shift
                                                        .opened_at,
                                                )}
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    shift
                                                        .closed_at,
                                                )}
                                            </td>

                                            <td>
                                                {
                                                    shift
                                                        .totals
                                                        .sales_count
                                                }
                                            </td>

                                            <td>
                                                {currencyFormatter
                                                    .format(
                                                        shift
                                                            .totals
                                                            .cash_collections,
                                                    )}
                                            </td>

                                            <td>
                                                {currencyFormatter
                                                    .format(
                                                        shift
                                                            .expected_cash,
                                                    )}
                                            </td>

                                            <td>
                                                {shift.actual_cash
                                                    !== null
                                                    ? currencyFormatter
                                                        .format(
                                                            shift
                                                                .actual_cash,
                                                        )
                                                    : '—'}
                                            </td>

                                            <td>
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
                                                        : '—'}
                                                </strong>
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        shift.status
                                                            === 'open'
                                                            ? 'shift-status-open'
                                                            : 'shift-status-closed'
                                                    }
                                                >
                                                    {shift.status
                                                        === 'open'
                                                        ? 'Open'
                                                        : 'Closed'}
                                                </span>
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="view-sale-button"
                                                    onClick={() => {
                                                        void openShiftDetails(
                                                            shift.id,
                                                        );
                                                    }}
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ),
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination.total > 0 && (
                    <footer className="category-pagination">
                        <p>
                            Showing{' '}

                            <strong>
                                {pagination.from}
                            </strong>

                            {' '}to{' '}

                            <strong>
                                {pagination.to}
                            </strong>

                            {' '}of{' '}

                            <strong>
                                {pagination.total}
                            </strong>

                            {' '}shifts
                        </p>

                        <div>
                            <button
                                type="button"
                                className="pagination-button"
                                disabled={page <= 1}
                                onClick={() => {
                                    setPage(
                                        (current) =>
                                            Math.max(
                                                1,
                                                current - 1,
                                            ),
                                    );
                                }}
                            >
                                Previous
                            </button>

                            <span>
                                Page{' '}

                                <strong>
                                    {
                                        pagination
                                            .current_page
                                    }
                                </strong>

                                {' '}of{' '}

                                <strong>
                                    {
                                        pagination
                                            .last_page
                                    }
                                </strong>
                            </span>

                            <button
                                type="button"
                                className="pagination-button"
                                disabled={
                                    page
                                    >= pagination
                                        .last_page
                                }
                                onClick={() => {
                                    setPage(
                                        (current) =>
                                            Math.min(
                                                pagination
                                                    .last_page,

                                                current + 1,
                                            ),
                                    );
                                }}
                            >
                                Next
                            </button>
                        </div>
                    </footer>
                )}
            </section>

            <ShiftDetailsModal
                shift={selectedShift}
                onClose={() => {
                    setSelectedShift(null);
                }}
            />
        </div>
    );
}