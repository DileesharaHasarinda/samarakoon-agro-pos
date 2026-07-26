import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    getCashierDashboard,
} from '../../services/dashboardService';

import type {
    CashierDashboardData,
    DashboardDailyPoint,
} from '../../types/dashboard';

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
    ).format(
        new Date(value),
    );
}

function paymentMethodName(
    value: string | null,
): string {
    switch (value) {
        case 'bank_transfer':
            return 'Bank Transfer';

        case 'card':
            return 'Card';

        case 'cash':
            return 'Cash';

        default:
            return 'On Due';
    }
}

export default function CashierDashboardPage() {
    const {
        token,
        user,
    } = useAuth();

    const [
        dashboard,
        setDashboard,
    ] = useState<CashierDashboardData | null>(
        null,
    );

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const loadDashboard =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setErrorMessage('');

                try {
                    const response =
                        await getCashierDashboard(
                            token,
                        );

                    setDashboard(
                        response.data,
                    );
                } catch (error) {
                    setErrorMessage(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load your dashboard.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [token],
        );

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const chartMaximum =
        useMemo(
            () => {
                if (!dashboard) {
                    return 1;
                }

                return Math.max(
                    1,

                    ...dashboard
                        .daily_series
                        .flatMap(
                            (
                                point:
                                    DashboardDailyPoint,
                            ) => [
                                    point.sales,
                                    point.collections,
                                    point.returns,
                                ],
                        ),
                );
            },
            [dashboard],
        );

    if (
        isLoading
        && !dashboard
    ) {
        return (
            <div className="dashboard-page-state">
                <div className="small-spinner" />

                <span>
                    Loading your dashboard...
                </span>
            </div>
        );
    }

    if (
        errorMessage
        && !dashboard
    ) {
        return (
            <div className="page-stack">
                <div className="form-alert">
                    {errorMessage}
                </div>

                <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                        void loadDashboard();
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!dashboard) {
        return null;
    }

    const {
        summary,
    } = dashboard;

    return (
        <div className="page-stack dashboard-page">
            <section className="dashboard-page-header">
                <div>
                    <span className="page-kicker">
                        Cashier activity
                    </span>

                    <h2>
                        Welcome,{' '}
                        {user?.name
                            ?? 'Cashier'}
                    </h2>

                    <p>
                        Review your sales, customer
                        payments and returns.
                    </p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    disabled={isLoading}
                    onClick={() => {
                        void loadDashboard();
                    }}
                >
                    {isLoading
                        ? 'Refreshing...'
                        : 'Refresh Dashboard'}
                </button>
            </section>

            {errorMessage && (
                <div className="form-alert">
                    {errorMessage}
                </div>
            )}

            <section className="dashboard-metric-grid cashier-dashboard-metrics">
                <article>
                    <span>
                        My Sales Today
                    </span>

                    <strong>
                        {currencyFormatter
                            .format(
                                summary
                                    .today_sales_total,
                            )}
                    </strong>

                    <small>
                        {summary
                            .today_sales_count}{' '}
                        transactions
                    </small>
                </article>

                <article>
                    <span>
                        Collected Today
                    </span>

                    <strong>
                        {currencyFormatter
                            .format(
                                summary
                                    .today_collected_amount,
                            )}
                    </strong>

                    <small>
                        Sales and due collections
                    </small>
                </article>

                <article>
                    <span>
                        Current Due
                    </span>

                    <strong className="dashboard-warning-value">
                        {currencyFormatter
                            .format(
                                summary
                                    .today_due_sales,
                            )}
                    </strong>

                    <small>
                        Remaining due from today’s sales
                    </small>
                </article>

                <article>
                    <span>
                        Returns Today
                    </span>

                    <strong>
                        {summary
                            .today_return_count}
                    </strong>

                    <small>
                        {currencyFormatter
                            .format(
                                summary
                                    .today_return_refund,
                            )}{' '}
                        refunded
                    </small>
                </article>

                <article>
                    <span>
                        Registered Customers
                    </span>

                    <strong>
                        {summary
                            .today_registered_customers}
                    </strong>

                    <small>
                        Customer accounts served today
                    </small>
                </article>
            </section>

            <section className="dashboard-two-column">
                <article className="content-card dashboard-chart-card">
                    <header className="dashboard-card-header">
                        <div>
                            <span className="page-kicker">
                                Last 7 days
                            </span>

                            <h3>
                                My Activity
                            </h3>
                        </div>
                    </header>

                    <div className="dashboard-chart-legend">
                        <span>
                            <i className="dashboard-legend-sales" />
                            Sales
                        </span>

                        <span>
                            <i className="dashboard-legend-collections" />
                            Collections
                        </span>

                        <span>
                            <i className="dashboard-legend-returns" />
                            Returns
                        </span>
                    </div>

                    <div className="dashboard-bar-chart">
                        {dashboard.daily_series.map(
                            (point) => (
                                <div
                                    className="dashboard-chart-row"
                                    key={point.date}
                                >
                                    <span>
                                        {point.label}
                                    </span>

                                    <div>
                                        <div
                                            className="dashboard-bar dashboard-sales-bar"
                                            style={{
                                                width:
                                                    `${(
                                                        point.sales
                                                        / chartMaximum
                                                    ) * 100}%`,
                                            }}
                                        />

                                        <div
                                            className="dashboard-bar dashboard-collections-bar"
                                            style={{
                                                width:
                                                    `${(
                                                        point.collections
                                                        / chartMaximum
                                                    ) * 100}%`,
                                            }}
                                        />

                                        <div
                                            className="dashboard-bar dashboard-returns-bar"
                                            style={{
                                                width:
                                                    `${(
                                                        point.returns
                                                        / chartMaximum
                                                    ) * 100}%`,
                                            }}
                                        />
                                    </div>

                                    <strong>
                                        {currencyFormatter
                                            .format(
                                                point.sales,
                                            )}
                                    </strong>
                                </div>
                            ),
                        )}
                    </div>
                </article>

                <article className="content-card">
                    <header className="dashboard-card-header">
                        <div>
                            <span className="page-kicker">
                                Today
                            </span>

                            <h3>
                                My Collections
                            </h3>
                        </div>
                    </header>

                    <div className="dashboard-payment-list">
                        {dashboard
                            .payment_breakdown
                            .length === 0 ? (
                            <div className="table-state">
                                No payments collected today.
                            </div>
                        ) : (
                            dashboard
                                .payment_breakdown
                                .map(
                                    (payment) => (
                                        <article
                                            key={
                                                payment
                                                    .payment_method
                                            }
                                        >
                                            <div>
                                                <strong>
                                                    {paymentMethodName(
                                                        payment
                                                            .payment_method,
                                                    )}
                                                </strong>

                                                <span>
                                                    {
                                                        payment
                                                            .transactions
                                                    }{' '}
                                                    transactions
                                                </span>
                                            </div>

                                            <strong>
                                                {currencyFormatter
                                                    .format(
                                                        payment
                                                            .total,
                                                    )}
                                            </strong>
                                        </article>
                                    ),
                                )
                        )}
                    </div>
                </article>
            </section>

            <section className="content-card">
                <header className="dashboard-card-header">
                    <div>
                        <span className="page-kicker">
                            Latest
                        </span>

                        <h3>
                            My Recent Sales
                        </h3>
                    </div>
                </header>

                <div className="dashboard-table-container">
                    <table className="dashboard-table">
                        <thead>
                            <tr>
                                <th>Sale</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Payment</th>
                                <th>Total</th>
                                <th>Due</th>
                            </tr>
                        </thead>

                        <tbody>
                            {dashboard
                                .recent_sales
                                .length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="table-state"
                                    >
                                        You have not completed any sales.
                                    </td>
                                </tr>
                            ) : (
                                dashboard
                                    .recent_sales
                                    .map(
                                        (sale) => (
                                            <tr
                                                key={sale.id}
                                            >
                                                <td>
                                                    <strong>
                                                        {
                                                            sale
                                                                .sale_number
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {formatDateTime(
                                                        sale
                                                            .sale_date,
                                                    )}
                                                </td>

                                                <td>
                                                    {sale.customer
                                                        ?.name
                                                        ?? 'Walk-in Customer'}
                                                </td>

                                                <td>
                                                    {
                                                        sale
                                                            .items_count
                                                    }
                                                </td>

                                                <td>
                                                    {paymentMethodName(
                                                        sale
                                                            .payment_method,
                                                    )}
                                                </td>

                                                <td>
                                                    {currencyFormatter
                                                        .format(
                                                            sale
                                                                .grand_total,
                                                        )}
                                                </td>

                                                <td>
                                                    <strong
                                                        className={
                                                            sale
                                                                .due_amount
                                                                > 0
                                                                ? 'dashboard-warning-value'
                                                                : ''
                                                        }
                                                    >
                                                        {currencyFormatter
                                                            .format(
                                                                sale
                                                                    .due_amount,
                                                            )}
                                                    </strong>
                                                </td>
                                            </tr>
                                        ),
                                    )
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}