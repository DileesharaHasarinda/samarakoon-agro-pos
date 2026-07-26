import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import ConfigurePurchaseSettlementModal
    from '../../components/suppliers/ConfigurePurchaseSettlementModal';

import RecordSupplierPaymentModal
    from '../../components/suppliers/RecordSupplierPaymentModal';

import {
    ApiError,
} from '../../lib/api';

import {
    configurePurchaseSettlement,
    getSupplierPayables,
    recordSupplierPayment,
} from '../../services/supplierPayableService';

import type {
    ConfigurePurchaseSettlementInput,
    SupplierPayable,
    SupplierPayableSummary,
    SupplierPaymentInput,
} from '../../types/supplierPayable';

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
    SupplierPayableSummary = {
    total_purchases: 0,
    unconfigured_purchases: 0,
    outstanding_purchases: 0,
    outstanding_due: 0,
    overdue_due: 0,
    total_paid: 0,
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

function formatDate(
    value: string | null,
): string {
    if (!value) {
        return 'Not set';
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    ).format(
        new Date(
            `${value}T00:00:00`,
        ),
    );
}

function paymentStatusName(
    value: string,
): string {
    switch (value) {
        case 'unconfigured':
            return 'Needs Setup';

        case 'partial':
            return 'Partial';

        case 'due':
            return 'Due';

        default:
            return 'Paid';
    }
}

export default function SupplierDuesPage() {
    const {
        token,
    } = useAuth();

    const [
        purchases,
        setPurchases,
    ] = useState<SupplierPayable[]>(
        [],
    );

    const [
        summary,
        setSummary,
    ] = useState(
        emptySummary,
    );

    const [
        pagination,
        setPagination,
    ] = useState(
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
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        settlementPurchase,
        setSettlementPurchase,
    ] = useState<SupplierPayable | null>(
        null,
    );

    const [
        paymentPurchase,
        setPaymentPurchase,
    ] = useState<SupplierPayable | null>(
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

    const loadPurchases =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getSupplierPayables(
                            token,
                            {
                                search,
                                status,
                                page,
                                perPage: 20,
                            },
                        );

                    setPurchases(
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
                            : 'Unable to load supplier payments.',
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
            ],
        );

    useEffect(() => {
        void loadPurchases();
    }, [loadPurchases]);

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

    const saveSettlement =
        async (
            values:
                ConfigurePurchaseSettlementInput,
        ): Promise<void> => {
            if (
                !token
                || !settlementPurchase
            ) {
                return;
            }

            setIsSubmitting(true);
            setModalError('');

            try {
                const response =
                    await configurePurchaseSettlement(
                        token,
                        settlementPurchase.id,
                        values,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Settlement configured successfully.',
                );

                setSettlementPurchase(null);

                await loadPurchases();
            } catch (error) {
                setModalError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to configure settlement.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const savePayment =
        async (
            values:
                SupplierPaymentInput,
        ): Promise<void> => {
            if (
                !token
                || !paymentPurchase
            ) {
                return;
            }

            setIsSubmitting(true);
            setModalError('');

            try {
                const response =
                    await recordSupplierPayment(
                        token,
                        paymentPurchase.id,
                        values,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Supplier payment recorded successfully.',
                );

                setPaymentPurchase(null);

                await loadPurchases();
            } catch (error) {
                setModalError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to record supplier payment.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    return (
        <div className="page-stack">
            <section className="supplier-dues-header">
                <div>
                    <span className="page-kicker">
                        Accounts payable
                    </span>

                    <h2>
                        Supplier Dues
                    </h2>

                    <p>
                        Configure purchase payments,
                        review outstanding balances
                        and record supplier payments.
                    </p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    disabled={isLoading}
                    onClick={() => {
                        void loadPurchases();
                    }}
                >
                    Refresh
                </button>
            </section>

            <section className="supplier-summary-grid">
                <article>
                    <span>
                        Needs Payment Setup
                    </span>

                    <strong>
                        {summary
                            .unconfigured_purchases}
                    </strong>
                </article>

                <article>
                    <span>
                        Outstanding Purchases
                    </span>

                    <strong>
                        {summary
                            .outstanding_purchases}
                    </strong>
                </article>

                <article>
                    <span>
                        Outstanding Due
                    </span>

                    <strong className="supplier-due-value">
                        {currencyFormatter
                            .format(
                                summary
                                    .outstanding_due,
                            )}
                    </strong>
                </article>

                <article>
                    <span>
                        Overdue Amount
                    </span>

                    <strong className="supplier-overdue-value">
                        {currencyFormatter
                            .format(
                                summary
                                    .overdue_due,
                            )}
                    </strong>
                </article>

                <article>
                    <span>Total Paid</span>

                    <strong>
                        {currencyFormatter
                            .format(
                                summary.total_paid,
                            )}
                    </strong>
                </article>
            </section>

            {successMessage && (
                <div className="success-alert">
                    {successMessage}
                </div>
            )}

            {pageError && (
                <div className="form-alert">
                    {pageError}
                </div>
            )}

            <section className="content-card">
                <div className="supplier-dues-toolbar">
                    <input
                        type="search"
                        value={searchInput}
                        placeholder="Search purchase number or supplier..."
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
                            All Purchases
                        </option>

                        <option value="unconfigured">
                            Needs Setup
                        </option>

                        <option value="outstanding">
                            Outstanding
                        </option>

                        <option value="overdue">
                            Overdue
                        </option>

                        <option value="paid">
                            Paid
                        </option>
                    </select>
                </div>

                <div className="supplier-dues-table-container">
                    <table className="supplier-dues-table">
                        <thead>
                            <tr>
                                <th>Purchase</th>
                                <th>Supplier</th>
                                <th>Date</th>
                                <th>Total</th>
                                <th>Paid</th>
                                <th>Due</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="table-state"
                                    >
                                        Loading supplier dues...
                                    </td>
                                </tr>
                            ) : purchases.length
                                === 0 ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="table-state"
                                    >
                                        No matching purchases.
                                    </td>
                                </tr>
                            ) : (
                                purchases.map(
                                    (purchase) => (
                                        <tr
                                            key={
                                                purchase.id
                                            }
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        purchase
                                                            .purchase_number
                                                    }
                                                </strong>

                                                <small>
                                                    {
                                                        purchase
                                                            .payments_count
                                                    }{' '}
                                                    payment records
                                                </small>
                                            </td>

                                            <td>
                                                {
                                                    purchase
                                                        .supplier
                                                        .name
                                                }
                                            </td>

                                            <td>
                                                {formatDate(
                                                    purchase
                                                        .purchase_date,
                                                )}
                                            </td>

                                            <td>
                                                {currencyFormatter
                                                    .format(
                                                        purchase
                                                            .grand_total,
                                                    )}
                                            </td>

                                            <td>
                                                {currencyFormatter
                                                    .format(
                                                        purchase
                                                            .paid_amount,
                                                    )}
                                            </td>

                                            <td>
                                                <strong
                                                    className={
                                                        purchase
                                                            .due_amount
                                                            > 0
                                                            ? 'supplier-due-value'
                                                            : ''
                                                    }
                                                >
                                                    {currencyFormatter
                                                        .format(
                                                            purchase
                                                                .due_amount,
                                                        )}
                                                </strong>
                                            </td>

                                            <td>
                                                {formatDate(
                                                    purchase
                                                        .due_date,
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        purchase
                                                            .is_overdue
                                                            ? 'supplier-status-overdue'
                                                            : `supplier-status-${purchase.payment_status}`
                                                    }
                                                >
                                                    {purchase
                                                        .is_overdue
                                                        ? 'Overdue'
                                                        : paymentStatusName(
                                                            purchase
                                                                .payment_status,
                                                        )}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="table-actions">
                                                    {purchase
                                                        .payment_status
                                                        === 'unconfigured' && (
                                                            <button
                                                                type="button"
                                                                className="primary-button"
                                                                onClick={() => {
                                                                    setModalError(
                                                                        '',
                                                                    );

                                                                    setSettlementPurchase(
                                                                        purchase,
                                                                    );
                                                                }}
                                                            >
                                                                Configure
                                                            </button>
                                                        )}

                                                    {purchase
                                                        .due_amount
                                                        > 0 && (
                                                            <button
                                                                type="button"
                                                                className="view-sale-button"
                                                                onClick={() => {
                                                                    setModalError(
                                                                        '',
                                                                    );

                                                                    setPaymentPurchase(
                                                                        purchase,
                                                                    );
                                                                }}
                                                            >
                                                                Pay Supplier
                                                            </button>
                                                        )}
                                                </div>
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
                        <span>
                            Page{' '}
                            {pagination.current_page}
                            {' '}of{' '}
                            {pagination.last_page}
                        </span>

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

                            <button
                                type="button"
                                className="pagination-button"
                                disabled={
                                    page
                                    >= pagination.last_page
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

            <ConfigurePurchaseSettlementModal
                purchase={settlementPurchase}
                isSubmitting={isSubmitting}
                errorMessage={modalError}
                onClose={() => {
                    if (!isSubmitting) {
                        setSettlementPurchase(
                            null,
                        );

                        setModalError('');
                    }
                }}
                onSubmit={(values) => {
                    void saveSettlement(
                        values,
                    );
                }}
            />

            <RecordSupplierPaymentModal
                purchase={paymentPurchase}
                isSubmitting={isSubmitting}
                errorMessage={modalError}
                onClose={() => {
                    if (!isSubmitting) {
                        setPaymentPurchase(
                            null,
                        );

                        setModalError('');
                    }
                }}
                onSubmit={(values) => {
                    void savePayment(
                        values,
                    );
                }}
            />
        </div>
    );
}