import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import CashierFormModal
    from '../../components/cashiers/CashierFormModal';

import ResetCashierPasswordModal
    from '../../components/cashiers/ResetCashierPasswordModal';

import {
    ApiError,
} from '../../lib/api';

import {
    createCashier,
    getCashiers,
    resetCashierPassword,
    updateCashier,
    updateCashierStatus,
} from '../../services/cashierService';

import type {
    Cashier,
    CashierInput,
    CashierSummary,
    CashierUpdateInput,
} from '../../types/cashier';

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
    CashierSummary = {
    total_cashiers: 0,
    active_cashiers: 0,
    inactive_cashiers: 0,
    cashiers_with_open_shift: 0,
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
        return 'Never';
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

export default function CashierAccountsPage() {
    const {
        token,
    } = useAuth();

    const [
        cashiers,
        setCashiers,
    ] = useState<Cashier[]>([]);

    const [
        summary,
        setSummary,
    ] = useState<CashierSummary>(
        emptySummary,
    );

    const [
        pagination,
        setPagination,
    ] = useState<PosPaginationMeta>(
        emptyPagination,
    );

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
        formOpen,
        setFormOpen,
    ] = useState(false);

    const [
        selectedCashier,
        setSelectedCashier,
    ] = useState<Cashier | null>(
        null,
    );

    const [
        resetCashier,
        setResetCashier,
    ] = useState<Cashier | null>(
        null,
    );

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        modalError,
        setModalError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const loadCashiers =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getCashiers(
                            token,
                            {
                                search,
                                status,
                                page,
                                perPage,
                            },
                        );

                    setCashiers(
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
                            : 'Unable to load cashier accounts.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [
                token,
                search,
                status,
                page,
                perPage,
            ],
        );

    useEffect(() => {
        void loadCashiers();
    }, [loadCashiers]);

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

    const createAccount =
        async (
            values:
                CashierInput,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setIsSubmitting(true);
            setModalError('');
            setSuccessMessage('');

            try {
                const response =
                    await createCashier(
                        token,
                        values,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Cashier account created successfully.',
                );

                setFormOpen(false);
                setSelectedCashier(null);

                await loadCashiers();
            } catch (error) {
                setModalError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to create cashier account.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const updateAccount =
        async (
            values:
                CashierUpdateInput,
        ): Promise<void> => {
            if (
                !token
                || !selectedCashier
            ) {
                return;
            }

            setIsSubmitting(true);
            setModalError('');
            setSuccessMessage('');

            try {
                const response =
                    await updateCashier(
                        token,
                        selectedCashier.id,
                        values,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Cashier account updated successfully.',
                );

                setFormOpen(false);
                setSelectedCashier(null);

                await loadCashiers();
            } catch (error) {
                setModalError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to update cashier account.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const toggleStatus =
        async (
            cashier: Cashier,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            const action =
                cashier.is_active
                    ? 'deactivate'
                    : 'activate';

            const confirmed =
                window.confirm(
                    `${action
                        .charAt(0)
                        .toUpperCase()}${action.slice(1)} ${cashier.name}?`,
                );

            if (!confirmed) {
                return;
            }

            setPageError('');
            setSuccessMessage('');

            try {
                const response =
                    await updateCashierStatus(
                        token,
                        cashier.id,
                        !cashier.is_active,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Cashier status updated successfully.',
                );

                await loadCashiers();
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to update cashier status.',
                );
            }
        };

    const submitPasswordReset =
        async (
            password: string,
            confirmation: string,
        ): Promise<void> => {
            if (
                !token
                || !resetCashier
            ) {
                return;
            }

            setIsSubmitting(true);
            setModalError('');
            setSuccessMessage('');

            try {
                const response =
                    await resetCashierPassword(
                        token,
                        resetCashier.id,
                        password,
                        confirmation,
                    );

                setSuccessMessage(
                    response.message,
                );

                setResetCashier(null);
            } catch (error) {
                setModalError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to reset cashier password.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    return (
        <div className="page-stack">
            <section className="cashier-account-header">
                <div>
                    <span className="page-kicker">
                        Staff administration
                    </span>

                    <h2>
                        Cashier Accounts
                    </h2>

                    <p>
                        Create cashier accounts,
                        manage access and review
                        cashier activity.
                    </p>
                </div>

                <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                        setSelectedCashier(
                            null,
                        );

                        setModalError('');
                        setSuccessMessage('');
                        setFormOpen(true);
                    }}
                >
                    Add Cashier
                </button>
            </section>

            <section className="cashier-account-summary">
                <article>
                    <span>
                        Total Cashiers
                    </span>

                    <strong>
                        {summary.total_cashiers}
                    </strong>
                </article>

                <article>
                    <span>
                        Active Cashiers
                    </span>

                    <strong>
                        {summary.active_cashiers}
                    </strong>
                </article>

                <article>
                    <span>
                        Inactive Cashiers
                    </span>

                    <strong>
                        {summary.inactive_cashiers}
                    </strong>
                </article>

                <article>
                    <span>
                        Open Shifts
                    </span>

                    <strong>
                        {summary
                            .cashiers_with_open_shift}
                    </strong>
                </article>
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

            {pageError && (
                <div
                    className="form-alert"
                    role="alert"
                >
                    {pageError}
                </div>
            )}

            <section className="content-card cashier-account-panel">
                <div className="cashier-account-toolbar">
                    <input
                        type="search"
                        value={searchInput}
                        placeholder="Search cashier name, username, email or phone..."
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
                            All Accounts
                        </option>

                        <option value="active">
                            Active
                        </option>

                        <option value="inactive">
                            Inactive
                        </option>
                    </select>

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

                <div className="cashier-account-list">
                    {isLoading ? (
                        <div className="table-state">
                            Loading cashier accounts...
                        </div>
                    ) : cashiers.length
                        === 0 ? (
                        <div className="table-state">
                            No cashier accounts found.
                        </div>
                    ) : (
                        cashiers.map(
                            (cashier) => (
                                <article
                                    className="cashier-account-card"
                                    key={cashier.id}
                                >
                                    <header>
                                        <div className="cashier-avatar">
                                            {cashier.name
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>

                                        <div>
                                            <strong>
                                                {cashier.name}
                                            </strong>

                                            <span>
                                                @{cashier.username}
                                            </span>
                                        </div>

                                        <span
                                            className={
                                                cashier.is_active
                                                    ? 'active-badge'
                                                    : 'inactive-badge'
                                            }
                                        >
                                            {cashier.is_active
                                                ? 'Active'
                                                : 'Inactive'}
                                        </span>
                                    </header>

                                    <div className="cashier-account-details">
                                        <div>
                                            <span>
                                                Email
                                            </span>

                                            <strong>
                                                {cashier.email}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Phone
                                            </span>

                                            <strong>
                                                {cashier.phone
                                                    ?? 'Not provided'}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Last Login
                                            </span>

                                            <strong className="cashier-date-value">
                                                {formatDateTime(
                                                    cashier
                                                        .last_login_at,
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Total Sales
                                            </span>

                                            <strong>
                                                {
                                                    cashier
                                                        .statistics
                                                        .sales_count
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Sales Value
                                            </span>

                                            <strong>
                                                {currencyFormatter
                                                    .format(
                                                        cashier
                                                            .statistics
                                                            .sales_total,
                                                    )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Payments Collected
                                            </span>

                                            <strong>
                                                {currencyFormatter
                                                    .format(
                                                        cashier
                                                            .statistics
                                                            .payments_collected,
                                                    )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Returns
                                            </span>

                                            <strong>
                                                {
                                                    cashier
                                                        .statistics
                                                        .returns_count
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Shifts
                                            </span>

                                            <strong>
                                                {
                                                    cashier
                                                        .statistics
                                                        .shifts_count
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Current Shift
                                            </span>

                                            <strong>
                                                {cashier.open_shift
                                                    ? cashier
                                                        .open_shift
                                                        .shift_number
                                                    : 'No open shift'}
                                            </strong>
                                        </div>
                                    </div>

                                    <footer className="cashier-account-actions">
                                        <button
                                            type="button"
                                            className="view-sale-button"
                                            onClick={() => {
                                                setSelectedCashier(
                                                    cashier,
                                                );

                                                setModalError('');
                                                setSuccessMessage('');
                                                setFormOpen(true);
                                            }}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            className="secondary-button"
                                            onClick={() => {
                                                setResetCashier(
                                                    cashier,
                                                );

                                                setModalError('');
                                                setSuccessMessage('');
                                            }}
                                        >
                                            Reset Password
                                        </button>

                                        <button
                                            type="button"
                                            className={
                                                cashier.is_active
                                                    ? 'cashier-danger-button'
                                                    : 'cashier-activate-button'
                                            }
                                            disabled={
                                                cashier.is_active
                                                && cashier.open_shift
                                                !== null
                                            }
                                            onClick={() => {
                                                void toggleStatus(
                                                    cashier,
                                                );
                                            }}
                                        >
                                            {cashier.is_active
                                                ? 'Deactivate'
                                                : 'Activate'}
                                        </button>
                                    </footer>
                                </article>
                            ),
                        )
                    )}
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

                            {' '}cashiers
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

            <CashierFormModal
                cashier={selectedCashier}
                isOpen={formOpen}
                isSubmitting={isSubmitting}
                errorMessage={modalError}
                onClose={() => {
                    if (!isSubmitting) {
                        setFormOpen(false);

                        setSelectedCashier(
                            null,
                        );

                        setModalError('');
                    }
                }}
                onCreate={(values) => {
                    void createAccount(
                        values,
                    );
                }}
                onUpdate={(values) => {
                    void updateAccount(
                        values,
                    );
                }}
            />

            <ResetCashierPasswordModal
                cashier={resetCashier}
                isSubmitting={isSubmitting}
                errorMessage={modalError}
                onClose={() => {
                    if (!isSubmitting) {
                        setResetCashier(null);
                        setModalError('');
                    }
                }}
                onSubmit={(
                    password,
                    confirmation,
                ) => {
                    void submitPasswordReset(
                        password,
                        confirmation,
                    );
                }}
            />
        </div>
    );
}