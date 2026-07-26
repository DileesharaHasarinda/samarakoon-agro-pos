import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import RecordDuePaymentModal
    from '../../components/customers/RecordDuePaymentModal';

import {
    ApiError,
} from '../../lib/api';

import {
    getCustomerDues,
    recordDuePayment,
} from '../../services/dueService';

import type {
    DuePaymentInput,
    DueSale,
    DueSummary,
} from '../../types/customer';

const currencyFormatter =
    new Intl.NumberFormat(
        'en-LK',
        {
            style: 'currency',
            currency: 'LKR',
        },
    );

const emptySummary: DueSummary = {
    due_sales: 0,
    outstanding_due: 0,
    collected_amount: 0,
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

export default function DueManagementPage() {
    const {
        token,
    } = useAuth();

    const [
        sales,
        setSales,
    ] = useState<DueSale[]>([]);

    const [
        summary,
        setSummary,
    ] = useState<DueSummary>(
        emptySummary,
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
        lastPage,
        setLastPage,
    ] = useState(1);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        selectedSale,
        setSelectedSale,
    ] = useState<DueSale | null>(
        null,
    );

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const loadDues =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setErrorMessage('');

                try {
                    const response =
                        await getCustomerDues(
                            token,
                            {
                                search,
                                status,
                                page,
                                perPage: 20,
                            },
                        );

                    setSales(
                        response.data,
                    );

                    setSummary(
                        response.summary,
                    );

                    setLastPage(
                        response
                            .meta
                            .last_page,
                    );
                } catch (error) {
                    setErrorMessage(
                        error
                            instanceof ApiError
                            ? error.message
                            : 'Unable to load customer dues.',
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
        void loadDues();
    }, [loadDues]);

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

    const submitPayment =
        async (
            values: DuePaymentInput,
        ): Promise<void> => {
            if (
                !token
                || !selectedSale
            ) {
                return;
            }

            setIsSubmitting(true);
            setErrorMessage('');

            try {
                const response =
                    await recordDuePayment(
                        token,
                        selectedSale.id,
                        values,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Payment recorded successfully.',
                );

                setSelectedSale(null);

                await loadDues();
            } catch (error) {
                setErrorMessage(
                    error
                        instanceof ApiError
                        ? error.message
                        : 'Unable to record payment.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    return (
        <div className="page-stack">
            <section className="due-page-header">
                <div>
                    <span className="page-kicker">
                        Customer credit
                    </span>

                    <h2>
                        Due Management
                    </h2>

                    <p>
                        Review outstanding balances
                        and record customer due
                        payments.
                    </p>
                </div>
            </section>

            <section className="due-summary-grid">
                <article>
                    <span>Due Sales</span>

                    <strong>
                        {summary.due_sales}
                    </strong>
                </article>

                <article>
                    <span>
                        Outstanding Due
                    </span>

                    <strong>
                        {currencyFormatter
                            .format(
                                summary
                                    .outstanding_due,
                            )}
                    </strong>
                </article>

                <article>
                    <span>
                        Amount Already Collected
                    </span>

                    <strong>
                        {currencyFormatter
                            .format(
                                summary
                                    .collected_amount,
                            )}
                    </strong>
                </article>
            </section>

            {successMessage && (
                <div className="success-alert">
                    {successMessage}
                </div>
            )}

            {errorMessage
                && !selectedSale && (
                    <div className="form-alert">
                        {errorMessage}
                    </div>
                )}

            <section className="content-card">
                <div className="due-toolbar">
                    <input
                        type="search"
                        value={searchInput}
                        placeholder="Search sale, customer or mobile..."
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
                            All Dues
                        </option>

                        <option value="overdue">
                            Overdue
                        </option>

                        <option value="upcoming">
                            Upcoming
                        </option>
                    </select>
                </div>

                <div className="due-table-container">
                    <table className="due-table">
                        <thead>
                            <tr>
                                <th>Sale</th>
                                <th>Customer</th>
                                <th>Total</th>
                                <th>Paid</th>
                                <th>Due</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="table-state"
                                    >
                                        Loading customer dues...
                                    </td>
                                </tr>
                            ) : sales.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="table-state"
                                    >
                                        No outstanding dues.
                                    </td>
                                </tr>
                            ) : (
                                sales.map(
                                    (sale) => (
                                        <tr key={sale.id}>
                                            <td>
                                                <strong>
                                                    {
                                                        sale
                                                            .sale_number
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        sale
                                                            .customer
                                                            .name
                                                    }
                                                </strong>

                                                <small>
                                                    {sale
                                                        .customer
                                                        .mobile
                                                        || sale
                                                            .customer
                                                            .customer_code}
                                                </small>
                                            </td>

                                            <td>
                                                {currencyFormatter
                                                    .format(
                                                        sale
                                                            .grand_total,
                                                    )}
                                            </td>

                                            <td>
                                                {currencyFormatter
                                                    .format(
                                                        sale
                                                            .paid_amount,
                                                    )}
                                            </td>

                                            <td>
                                                <strong className="due-value">
                                                    {currencyFormatter
                                                        .format(
                                                            sale
                                                                .due_amount,
                                                        )}
                                                </strong>
                                            </td>

                                            <td>
                                                {formatDate(
                                                    sale
                                                        .due_date,
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        sale
                                                            .is_overdue
                                                            ? 'overdue-badge'
                                                            : 'partial-badge'
                                                    }
                                                >
                                                    {sale
                                                        .is_overdue
                                                        ? 'Overdue'
                                                        : sale
                                                            .payment_status}
                                                </span>
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="primary-button"
                                                    onClick={() => {
                                                        setSelectedSale(
                                                            sale,
                                                        );

                                                        setErrorMessage(
                                                            '',
                                                        );
                                                    }}
                                                >
                                                    Receive Payment
                                                </button>
                                            </td>
                                        </tr>
                                    ),
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                <footer className="category-pagination">
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
                        Page {page} of{' '}
                        {lastPage}
                    </span>

                    <button
                        type="button"
                        className="pagination-button"
                        disabled={
                            page >= lastPage
                        }
                        onClick={() => {
                            setPage(
                                (current) =>
                                    Math.min(
                                        lastPage,
                                        current + 1,
                                    ),
                            );
                        }}
                    >
                        Next
                    </button>
                </footer>
            </section>

            <RecordDuePaymentModal
                sale={selectedSale}
                isSubmitting={
                    isSubmitting
                }
                errorMessage={
                    selectedSale
                        ? errorMessage
                        : ''
                }
                onClose={() => {
                    if (!isSubmitting) {
                        setSelectedSale(
                            null,
                        );

                        setErrorMessage('');
                    }
                }}
                onSubmit={(values) => {
                    void submitPayment(
                        values,
                    );
                }}
            />
        </div>
    );
}