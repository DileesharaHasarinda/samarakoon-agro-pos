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

/**
 * Scoped styles for the Cashier Dashboard page only.
 * Root-scoped under #agro-cashier-dashboard-page to avoid
 * conflicts with global index.css, per project convention.
 */
const CASHIER_DASHBOARD_STYLES = `
#agro-cashier-dashboard-page {
    --agro-bg: #f5f6f8;
    --agro-surface: #ffffff;
    --agro-border: #e2e5ea;
    --agro-text-primary: #1a1d23;
    --agro-text-secondary: #5b6270;
    --agro-text-muted: #8b909c;
    --agro-accent: #2563eb;
    --agro-accent-soft: #eaf0fe;
    --agro-positive: #178a4c;
    --agro-positive-bg: #e6f6ee;
    --agro-negative: #c02b3b;
    --agro-negative-bg: #fbeaec;
    --agro-warning: #b06a00;
    --agro-warning-bg: #fdf1de;
    --agro-radius: 12px;
    --agro-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06);

    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--agro-bg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.5;
    color: var(--agro-text-primary);
    box-sizing: border-box;
}

#agro-cashier-dashboard-page * {
    box-sizing: border-box;
}

#agro-cashier-dashboard-page .agro-page-inner {
    max-width: 1400px;
    margin: 0 auto;
    padding: 28px 32px 48px;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

/* ---------- Header ---------- */

#agro-cashier-dashboard-page .agro-header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    background: var(--agro-bg);
    padding: 8px 0 4px;
    flex-wrap: wrap;
}

#agro-cashier-dashboard-page .agro-kicker {
    display: inline-block;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--agro-accent);
    margin-bottom: 6px;
}

#agro-cashier-dashboard-page .agro-header h1 {
    font-size: 26px;
    font-weight: 700;
    margin: 0 0 6px;
    letter-spacing: -0.01em;
    color: var(--agro-text-primary);
}

#agro-cashier-dashboard-page .agro-header p {
    font-size: 14px;
    color: var(--agro-text-secondary);
    margin: 0;
}

#agro-cashier-dashboard-page .agro-refresh-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 8px;
    border: 1px solid var(--agro-border);
    background: var(--agro-surface);
    color: var(--agro-text-primary);
    cursor: pointer;
    box-shadow: var(--agro-shadow);
    transition: background-color 0.15s ease, border-color 0.15s ease;
}

#agro-cashier-dashboard-page .agro-refresh-button:hover:not(:disabled) {
    background: var(--agro-accent-soft);
    border-color: var(--agro-accent);
    color: var(--agro-accent);
}

#agro-cashier-dashboard-page .agro-refresh-button:disabled {
    opacity: 0.6;
    cursor: default;
}

/* ---------- Alerts / loading ---------- */

#agro-cashier-dashboard-page .agro-state-screen {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    font-size: 15px;
    color: var(--agro-text-secondary);
}

#agro-cashier-dashboard-page .agro-spinner {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid var(--agro-border);
    border-top-color: var(--agro-accent);
    animation: agro-spin 0.8s linear infinite;
}

@keyframes agro-spin {
    to {
        transform: rotate(360deg);
    }
}

#agro-cashier-dashboard-page .agro-alert {
    padding: 14px 18px;
    border-radius: 8px;
    background: var(--agro-negative-bg);
    border: 1px solid #f3c6cc;
    color: var(--agro-negative);
    font-size: 14px;
    font-weight: 500;
}

#agro-cashier-dashboard-page .agro-retry-button {
    align-self: flex-start;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 8px;
    border: none;
    background: var(--agro-accent);
    color: #ffffff;
    cursor: pointer;
}

#agro-cashier-dashboard-page .agro-retry-button:hover {
    background: #1d4fce;
}

/* ---------- Metric grid ---------- */

#agro-cashier-dashboard-page .agro-metric-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
}

#agro-cashier-dashboard-page .agro-metric-card {
    background: var(--agro-surface);
    border: 1px solid var(--agro-border);
    border-radius: var(--agro-radius);
    padding: 18px 20px;
    box-shadow: var(--agro-shadow);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

#agro-cashier-dashboard-page .agro-metric-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--agro-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

#agro-cashier-dashboard-page .agro-metric-value {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--agro-text-primary);
}

#agro-cashier-dashboard-page .agro-metric-sub {
    font-size: 13px;
    color: var(--agro-text-muted);
}

#agro-cashier-dashboard-page .agro-value-warning {
    color: var(--agro-warning);
}

/* ---------- Two column layout ---------- */

#agro-cashier-dashboard-page .agro-two-column {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 20px;
}

@media (max-width: 960px) {
    #agro-cashier-dashboard-page .agro-two-column {
        grid-template-columns: 1fr;
    }
}

/* ---------- Cards ---------- */

#agro-cashier-dashboard-page .agro-card {
    background: var(--agro-surface);
    border: 1px solid var(--agro-border);
    border-radius: var(--agro-radius);
    box-shadow: var(--agro-shadow);
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
}

#agro-cashier-dashboard-page .agro-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

#agro-cashier-dashboard-page .agro-card-header h2 {
    font-size: 17px;
    font-weight: 700;
    margin: 2px 0 0;
    color: var(--agro-text-primary);
}

/* ---------- Chart ---------- */

#agro-cashier-dashboard-page .agro-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    color: var(--agro-text-secondary);
}

#agro-cashier-dashboard-page .agro-legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

#agro-cashier-dashboard-page .agro-legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    display: inline-block;
}

#agro-cashier-dashboard-page .agro-legend-sales { background: #2563eb; }
#agro-cashier-dashboard-page .agro-legend-collections { background: #16a34a; }
#agro-cashier-dashboard-page .agro-legend-returns { background: #d97706; }

#agro-cashier-dashboard-page .agro-chart {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

#agro-cashier-dashboard-page .agro-chart-row {
    display: grid;
    grid-template-columns: 56px 1fr 100px;
    align-items: center;
    gap: 12px;
    font-size: 13px;
}

#agro-cashier-dashboard-page .agro-chart-row > span {
    color: var(--agro-text-secondary);
    font-weight: 600;
}

#agro-cashier-dashboard-page .agro-chart-row > strong {
    text-align: right;
    font-size: 14px;
    font-weight: 700;
}

#agro-cashier-dashboard-page .agro-chart-bars {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

#agro-cashier-dashboard-page .agro-bar {
    height: 6px;
    border-radius: 3px;
    background: var(--agro-border);
    min-width: 2px;
    transition: width 0.25s ease;
}

#agro-cashier-dashboard-page .agro-bar-sales { background: #2563eb; }
#agro-cashier-dashboard-page .agro-bar-collections { background: #16a34a; }
#agro-cashier-dashboard-page .agro-bar-returns { background: #d97706; }

/* ---------- Payment list ---------- */

#agro-cashier-dashboard-page .agro-payment-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

#agro-cashier-dashboard-page .agro-payment-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-radius: 8px;
    background: var(--agro-bg);
    border: 1px solid var(--agro-border);
}

#agro-cashier-dashboard-page .agro-payment-row strong.agro-payment-name {
    font-size: 14px;
    font-weight: 700;
    display: block;
}

#agro-cashier-dashboard-page .agro-payment-row span.agro-payment-count {
    font-size: 13px;
    color: var(--agro-text-muted);
}

#agro-cashier-dashboard-page .agro-payment-row > strong:last-child {
    font-size: 15px;
    font-weight: 700;
}

/* ---------- Tables ---------- */

#agro-cashier-dashboard-page .agro-table-scroll {
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid var(--agro-border);
}

#agro-cashier-dashboard-page table.agro-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

#agro-cashier-dashboard-page table.agro-table thead th {
    text-align: left;
    font-size: 12.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--agro-text-secondary);
    background: var(--agro-bg);
    padding: 12px 16px;
    border-bottom: 1px solid var(--agro-border);
    white-space: nowrap;
}

#agro-cashier-dashboard-page table.agro-table tbody td {
    padding: 13px 16px;
    border-bottom: 1px solid var(--agro-border);
    color: var(--agro-text-primary);
    vertical-align: middle;
}

#agro-cashier-dashboard-page table.agro-table tbody tr:last-child td {
    border-bottom: none;
}

#agro-cashier-dashboard-page table.agro-table tbody tr:hover {
    background: var(--agro-accent-soft);
}

#agro-cashier-dashboard-page .agro-table-empty {
    text-align: center;
    padding: 28px 16px;
    color: var(--agro-text-muted);
    font-size: 14px;
}

/* ---------- Badges ---------- */

#agro-cashier-dashboard-page .agro-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 700;
}

#agro-cashier-dashboard-page .agro-badge-positive {
    background: var(--agro-positive-bg);
    color: var(--agro-positive);
}

#agro-cashier-dashboard-page .agro-badge-warning {
    background: var(--agro-warning-bg);
    color: var(--agro-warning);
}
`;

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
            <div id="agro-cashier-dashboard-page">
                <style>{CASHIER_DASHBOARD_STYLES}</style>

                <div className="agro-state-screen">
                    <div className="agro-spinner" />
                    <span>Loading your dashboard...</span>
                </div>
            </div>
        );
    }

    if (
        errorMessage
        && !dashboard
    ) {
        return (
            <div id="agro-cashier-dashboard-page">
                <style>{CASHIER_DASHBOARD_STYLES}</style>

                <div className="agro-state-screen">
                    <div className="agro-alert">
                        {errorMessage}
                    </div>

                    <button
                        type="button"
                        className="agro-retry-button"
                        onClick={() => {
                            void loadDashboard();
                        }}
                    >
                        Retry
                    </button>
                </div>
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
        <div id="agro-cashier-dashboard-page">
            <style>{CASHIER_DASHBOARD_STYLES}</style>

            <div className="agro-page-inner">
                <section className="agro-header">
                    <div>
                        <span className="agro-kicker">
                            Cashier Activity
                        </span>

                        <h1>
                            Welcome, {user?.name ?? 'Cashier'}
                        </h1>

                        <p>
                            Review your sales, customer payments and returns.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="agro-refresh-button"
                        disabled={isLoading}
                        onClick={() => {
                            void loadDashboard();
                        }}
                    >
                        {isLoading ? 'Refreshing...' : 'Refresh Dashboard'}
                    </button>
                </section>

                {errorMessage && (
                    <div className="agro-alert">
                        {errorMessage}
                    </div>
                )}

                <section className="agro-metric-grid">
                    <article className="agro-metric-card">
                        <span className="agro-metric-label">My Sales Today</span>
                        <strong className="agro-metric-value">
                            {currencyFormatter.format(summary.today_sales_total)}
                        </strong>
                        <span className="agro-metric-sub">
                            {summary.today_sales_count} transactions
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">Collected Today</span>
                        <strong className="agro-metric-value">
                            {currencyFormatter.format(summary.today_collected_amount)}
                        </strong>
                        <span className="agro-metric-sub">
                            Sales and due collections
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">Current Due</span>
                        <strong className="agro-metric-value agro-value-warning">
                            {currencyFormatter.format(summary.today_due_sales)}
                        </strong>
                        <span className="agro-metric-sub">
                            Remaining due from today&rsquo;s sales
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">Returns Today</span>
                        <strong className="agro-metric-value">
                            {summary.today_return_count}
                        </strong>
                        <span className="agro-metric-sub">
                            {currencyFormatter.format(summary.today_return_refund)} refunded
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">Registered Customers</span>
                        <strong className="agro-metric-value">
                            {summary.today_registered_customers}
                        </strong>
                        <span className="agro-metric-sub">
                            Customer accounts served today
                        </span>
                    </article>
                </section>

                <section className="agro-two-column">
                    <article className="agro-card">
                        <header className="agro-card-header">
                            <div>
                                <span className="agro-kicker">Last 7 Days</span>
                                <h2>My Activity</h2>
                            </div>
                        </header>

                        <div className="agro-legend">
                            <span>
                                <i className="agro-legend-dot agro-legend-sales" />
                                Sales
                            </span>
                            <span>
                                <i className="agro-legend-dot agro-legend-collections" />
                                Collections
                            </span>
                            <span>
                                <i className="agro-legend-dot agro-legend-returns" />
                                Returns
                            </span>
                        </div>

                        <div className="agro-chart">
                            {dashboard.daily_series.map((point) => (
                                <div className="agro-chart-row" key={point.date}>
                                    <span>{point.label}</span>

                                    <div className="agro-chart-bars">
                                        <div
                                            className="agro-bar agro-bar-sales"
                                            style={{
                                                width: `${(point.sales / chartMaximum) * 100}%`,
                                            }}
                                        />
                                        <div
                                            className="agro-bar agro-bar-collections"
                                            style={{
                                                width: `${(point.collections / chartMaximum) * 100}%`,
                                            }}
                                        />
                                        <div
                                            className="agro-bar agro-bar-returns"
                                            style={{
                                                width: `${(point.returns / chartMaximum) * 100}%`,
                                            }}
                                        />
                                    </div>

                                    <strong>
                                        {currencyFormatter.format(point.sales)}
                                    </strong>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="agro-card">
                        <header className="agro-card-header">
                            <div>
                                <span className="agro-kicker">Today</span>
                                <h2>My Collections</h2>
                            </div>
                        </header>

                        <div className="agro-payment-list">
                            {dashboard.payment_breakdown.length === 0 ? (
                                <div className="agro-table-empty">
                                    No payments collected today.
                                </div>
                            ) : (
                                dashboard.payment_breakdown.map((payment) => (
                                    <div
                                        className="agro-payment-row"
                                        key={payment.payment_method}
                                    >
                                        <div>
                                            <strong className="agro-payment-name">
                                                {paymentMethodName(payment.payment_method)}
                                            </strong>
                                            <span className="agro-payment-count">
                                                {payment.transactions} transactions
                                            </span>
                                        </div>

                                        <strong>
                                            {currencyFormatter.format(payment.total)}
                                        </strong>
                                    </div>
                                ))
                            )}
                        </div>
                    </article>
                </section>

                <section className="agro-card">
                    <header className="agro-card-header">
                        <div>
                            <span className="agro-kicker">Latest</span>
                            <h2>My Recent Sales</h2>
                        </div>
                    </header>

                    <div className="agro-table-scroll">
                        <table className="agro-table">
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
                                {dashboard.recent_sales.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="agro-table-empty">
                                            You have not completed any sales.
                                        </td>
                                    </tr>
                                ) : (
                                    dashboard.recent_sales.map((sale) => (
                                        <tr key={sale.id}>
                                            <td>
                                                <strong>{sale.sale_number}</strong>
                                            </td>
                                            <td>{formatDateTime(sale.sale_date)}</td>
                                            <td>
                                                {sale.customer?.name ?? 'Walk-in Customer'}
                                            </td>
                                            <td>{sale.items_count}</td>
                                            <td>
                                                <span className="agro-badge agro-badge-positive">
                                                    {paymentMethodName(sale.payment_method)}
                                                </span>
                                            </td>
                                            <td>
                                                {currencyFormatter.format(sale.grand_total)}
                                            </td>
                                            <td>
                                                {sale.due_amount > 0 ? (
                                                    <span className="agro-badge agro-badge-warning">
                                                        {currencyFormatter.format(sale.due_amount)}
                                                    </span>
                                                ) : (
                                                    currencyFormatter.format(sale.due_amount)
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}