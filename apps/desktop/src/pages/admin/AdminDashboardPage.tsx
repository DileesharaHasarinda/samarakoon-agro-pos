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
    getAdminDashboard,
} from '../../services/dashboardService';

import type {
    AdminDashboardData,
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

function formatDate(
    value: string,
): string {
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

export default function AdminDashboardPage() {
    const {
        token,
    } = useAuth();

    const [
        dashboard,
        setDashboard,
    ] = useState<AdminDashboardData | null>(
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
                        await getAdminDashboard(
                            token,
                        );

                    setDashboard(
                        response.data,
                    );
                } catch (error) {
                    setErrorMessage(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load the admin dashboard.',
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
                                    point.expenses,
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
                    Loading business dashboard...
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
                        Business overview
                    </span>

                    <h2>
                        Admin Dashboard
                    </h2>

                    <p>
                        Live sales, collections,
                        expenses, profit and stock
                        information.
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

            <section className="dashboard-metric-grid">
                <article>
                    <span>
                        Today’s Sales
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
                        Initial and due payments
                    </small>
                </article>

                <article>
                    <span>
                        New Due Today
                    </span>

                    <strong className="dashboard-warning-value">
                        {currencyFormatter
                            .format(
                                summary
                                    .today_due_sales,
                            )}
                    </strong>

                    <small>
                        Current balance of today’s sales
                    </small>
                </article>

                <article>
                    <span>
                        Outstanding Due
                    </span>

                    <strong className="dashboard-warning-value">
                        {currencyFormatter
                            .format(
                                summary
                                    .outstanding_due,
                            )}
                    </strong>

                    <small>
                        All unsettled customer balances
                    </small>
                </article>

                <article>
                    <span>
                        Expenses Today
                    </span>

                    <strong className="dashboard-negative-value">
                        {currencyFormatter
                            .format(
                                summary
                                    .today_expenses,
                            )}
                    </strong>

                    <small>
                        Recorded business costs
                    </small>
                </article>

                <article>
                    <span>
                        Net Profit Today
                    </span>

                    <strong
                        className={
                            summary
                                .today_net_profit
                                >= 0
                                ? 'dashboard-positive-value'
                                : 'dashboard-negative-value'
                        }
                    >
                        {currencyFormatter
                            .format(
                                summary
                                    .today_net_profit,
                            )}
                    </strong>

                    <small>
                        After returns and expenses
                    </small>
                </article>

                <article>
                    <span>
                        Stock Cost Value
                    </span>

                    <strong>
                        {currencyFormatter
                            .format(
                                summary
                                    .stock_purchase_value,
                            )}
                    </strong>

                    <small>
                        {summary.stock_quantity}{' '}
                        available units
                    </small>
                </article>

                <article>
                    <span>
                        Stock Retail Value
                    </span>

                    <strong>
                        {currencyFormatter
                            .format(
                                summary
                                    .stock_retail_value,
                            )}
                    </strong>

                    <small>
                        Estimated selling value
                    </small>
                </article>

                <article>
                    <span>
                        Stock Alerts
                    </span>

                    <strong>
                        {summary
                            .expiring_batch_count
                            + summary
                                .expired_batch_count
                            + summary
                                .out_of_stock_products}
                    </strong>

                    <small>
                        Expiring, expired and out of stock
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
                                Financial Activity
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
                            <i className="dashboard-legend-expenses" />
                            Expenses
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
                                            className="dashboard-bar dashboard-expenses-bar"
                                            style={{
                                                width:
                                                    `${(
                                                        point.expenses
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
                                Payment Collections
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

            <section className="dashboard-two-column">
                <article className="content-card">
                    <header className="dashboard-card-header">
                        <div>
                            <span className="page-kicker">
                                Last 30 days
                            </span>

                            <h3>
                                Best-Selling Products
                            </h3>
                        </div>
                    </header>

                    <div className="dashboard-table-container">
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Sales</th>
                                    <th>Gross Profit</th>
                                </tr>
                            </thead>

                            <tbody>
                                {dashboard
                                    .top_products
                                    .length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="table-state"
                                        >
                                            No product sales yet.
                                        </td>
                                    </tr>
                                ) : (
                                    dashboard
                                        .top_products
                                        .map(
                                            (product) => (
                                                <tr
                                                    key={
                                                        product.id
                                                    }
                                                >
                                                    <td>
                                                        <strong>
                                                            {
                                                                product
                                                                    .name
                                                            }
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        {
                                                            product
                                                                .quantity_sold
                                                        }{' '}
                                                        {product.unit}
                                                    </td>

                                                    <td>
                                                        {currencyFormatter
                                                            .format(
                                                                product
                                                                    .sales_total,
                                                            )}
                                                    </td>

                                                    <td>
                                                        {currencyFormatter
                                                            .format(
                                                                product
                                                                    .gross_profit,
                                                            )}
                                                    </td>
                                                </tr>
                                            ),
                                        )
                                )}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article className="content-card">
                    <header className="dashboard-card-header">
                        <div>
                            <span className="page-kicker">
                                Latest
                            </span>

                            <h3>
                                Recent Expenses
                            </h3>
                        </div>
                    </header>

                    <div className="dashboard-activity-list">
                        {dashboard
                            .recent_expenses
                            .length === 0 ? (
                            <div className="table-state">
                                No expenses recorded.
                            </div>
                        ) : (
                            dashboard
                                .recent_expenses
                                .map(
                                    (expense) => (
                                        <article
                                            key={
                                                expense.id
                                            }
                                        >
                                            <div>
                                                <strong>
                                                    {
                                                        expense
                                                            .description
                                                    }
                                                </strong>

                                                <span>
                                                    {
                                                        expense
                                                            .category
                                                            .name
                                                    }
                                                    {' · '}
                                                    {formatDate(
                                                        expense
                                                            .expense_date,
                                                    )}
                                                </span>
                                            </div>

                                            <strong className="dashboard-negative-value">
                                                {currencyFormatter
                                                    .format(
                                                        expense
                                                            .amount,
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
                            Recent Sales
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
                                <th>Cashier</th>
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
                                        No sales completed.
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
                                                            .created_by
                                                            .name
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