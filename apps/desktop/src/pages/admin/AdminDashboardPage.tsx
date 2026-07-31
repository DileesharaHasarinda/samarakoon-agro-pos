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

/**
 * Scoped styles for the Admin Dashboard page only.
 * Root-scoped under #agro-admin-dashboard-page to avoid
 * conflicts with global index.css, per project convention.
 */
const DASHBOARD_STYLES = `
#agro-admin-dashboard-page {
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

#agro-admin-dashboard-page * {
    box-sizing: border-box;
}

#agro-admin-dashboard-page .agro-page-inner {
    max-width: 1400px;
    margin: 0 auto;
    padding: 28px 32px 48px;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

/* ---------- Header ---------- */

#agro-admin-dashboard-page .agro-header {
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

#agro-admin-dashboard-page .agro-kicker {
    display: inline-block;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--agro-accent);
    margin-bottom: 6px;
}

#agro-admin-dashboard-page .agro-header h1 {
    font-size: 26px;
    font-weight: 700;
    margin: 0 0 6px;
    letter-spacing: -0.01em;
    color: var(--agro-text-primary);
}

#agro-admin-dashboard-page .agro-header p {
    font-size: 14px;
    color: var(--agro-text-secondary);
    margin: 0;
}

#agro-admin-dashboard-page .agro-refresh-button {
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

#agro-admin-dashboard-page .agro-refresh-button:hover:not(:disabled) {
    background: var(--agro-accent-soft);
    border-color: var(--agro-accent);
    color: var(--agro-accent);
}

#agro-admin-dashboard-page .agro-refresh-button:disabled {
    opacity: 0.6;
    cursor: default;
}

/* ---------- Alerts / loading ---------- */

#agro-admin-dashboard-page .agro-state-screen {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    font-size: 15px;
    color: var(--agro-text-secondary);
}

#agro-admin-dashboard-page .agro-spinner {
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

#agro-admin-dashboard-page .agro-alert {
    padding: 14px 18px;
    border-radius: 8px;
    background: var(--agro-negative-bg);
    border: 1px solid #f3c6cc;
    color: var(--agro-negative);
    font-size: 14px;
    font-weight: 500;
}

#agro-admin-dashboard-page .agro-retry-button {
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

#agro-admin-dashboard-page .agro-retry-button:hover {
    background: #1d4fce;
}

/* ---------- Metric grid ---------- */

#agro-admin-dashboard-page .agro-metric-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
}

#agro-admin-dashboard-page .agro-metric-card {
    background: var(--agro-surface);
    border: 1px solid var(--agro-border);
    border-radius: var(--agro-radius);
    padding: 18px 20px;
    box-shadow: var(--agro-shadow);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

#agro-admin-dashboard-page .agro-metric-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--agro-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

#agro-admin-dashboard-page .agro-metric-value {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--agro-text-primary);
}

#agro-admin-dashboard-page .agro-metric-sub {
    font-size: 13px;
    color: var(--agro-text-muted);
}

#agro-admin-dashboard-page .agro-value-positive {
    color: var(--agro-positive);
}

#agro-admin-dashboard-page .agro-value-negative {
    color: var(--agro-negative);
}

#agro-admin-dashboard-page .agro-value-warning {
    color: var(--agro-warning);
}

/* ---------- Two column layout ---------- */

#agro-admin-dashboard-page .agro-two-column {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 20px;
}

@media (max-width: 960px) {
    #agro-admin-dashboard-page .agro-two-column {
        grid-template-columns: 1fr;
    }
}

/* ---------- Cards ---------- */

#agro-admin-dashboard-page .agro-card {
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

#agro-admin-dashboard-page .agro-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

#agro-admin-dashboard-page .agro-card-header h2 {
    font-size: 17px;
    font-weight: 700;
    margin: 2px 0 0;
    color: var(--agro-text-primary);
}

/* ---------- Chart ---------- */

#agro-admin-dashboard-page .agro-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    color: var(--agro-text-secondary);
}

#agro-admin-dashboard-page .agro-legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

#agro-admin-dashboard-page .agro-legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    display: inline-block;
}

#agro-admin-dashboard-page .agro-legend-sales { background: #2563eb; }
#agro-admin-dashboard-page .agro-legend-collections { background: #16a34a; }
#agro-admin-dashboard-page .agro-legend-expenses { background: #dc2626; }
#agro-admin-dashboard-page .agro-legend-returns { background: #d97706; }

#agro-admin-dashboard-page .agro-chart {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

#agro-admin-dashboard-page .agro-chart-row {
    display: grid;
    grid-template-columns: 56px 1fr 100px;
    align-items: center;
    gap: 12px;
    font-size: 13px;
}

#agro-admin-dashboard-page .agro-chart-row > span {
    color: var(--agro-text-secondary);
    font-weight: 600;
}

#agro-admin-dashboard-page .agro-chart-row > strong {
    text-align: right;
    font-size: 14px;
    font-weight: 700;
}

#agro-admin-dashboard-page .agro-chart-bars {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

#agro-admin-dashboard-page .agro-bar {
    height: 6px;
    border-radius: 3px;
    background: var(--agro-border);
    min-width: 2px;
    transition: width 0.25s ease;
}

#agro-admin-dashboard-page .agro-bar-sales { background: #2563eb; }
#agro-admin-dashboard-page .agro-bar-collections { background: #16a34a; }
#agro-admin-dashboard-page .agro-bar-expenses { background: #dc2626; }
#agro-admin-dashboard-page .agro-bar-returns { background: #d97706; }

/* ---------- Payment list ---------- */

#agro-admin-dashboard-page .agro-payment-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

#agro-admin-dashboard-page .agro-payment-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-radius: 8px;
    background: var(--agro-bg);
    border: 1px solid var(--agro-border);
}

#agro-admin-dashboard-page .agro-payment-row strong.agro-payment-name {
    font-size: 14px;
    font-weight: 700;
    display: block;
}

#agro-admin-dashboard-page .agro-payment-row span.agro-payment-count {
    font-size: 13px;
    color: var(--agro-text-muted);
}

#agro-admin-dashboard-page .agro-payment-row > strong:last-child {
    font-size: 15px;
    font-weight: 700;
}

/* ---------- Tables ---------- */

#agro-admin-dashboard-page .agro-table-scroll {
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid var(--agro-border);
}

#agro-admin-dashboard-page table.agro-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

#agro-admin-dashboard-page table.agro-table thead th {
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

#agro-admin-dashboard-page table.agro-table tbody td {
    padding: 13px 16px;
    border-bottom: 1px solid var(--agro-border);
    color: var(--agro-text-primary);
    vertical-align: middle;
}

#agro-admin-dashboard-page table.agro-table tbody tr:last-child td {
    border-bottom: none;
}

#agro-admin-dashboard-page table.agro-table tbody tr:hover {
    background: var(--agro-accent-soft);
}

#agro-admin-dashboard-page .agro-table-empty {
    text-align: center;
    padding: 28px 16px;
    color: var(--agro-text-muted);
    font-size: 14px;
}

/* ---------- Activity list (expenses) ---------- */

#agro-admin-dashboard-page .agro-activity-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

#agro-admin-dashboard-page .agro-activity-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 8px;
    background: var(--agro-bg);
    border: 1px solid var(--agro-border);
}

#agro-admin-dashboard-page .agro-activity-row strong.agro-activity-title {
    font-size: 14px;
    font-weight: 700;
    display: block;
    margin-bottom: 3px;
}

#agro-admin-dashboard-page .agro-activity-row span.agro-activity-meta {
    font-size: 13px;
    color: var(--agro-text-muted);
}

/* ---------- Badges ---------- */

#agro-admin-dashboard-page .agro-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 700;
}

#agro-admin-dashboard-page .agro-badge-positive {
    background: var(--agro-positive-bg);
    color: var(--agro-positive);
}

#agro-admin-dashboard-page .agro-badge-negative {
    background: var(--agro-negative-bg);
    color: var(--agro-negative);
}

#agro-admin-dashboard-page .agro-badge-warning {
    background: var(--agro-warning-bg);
    color: var(--agro-warning);
}
`;

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
            <div id="agro-admin-dashboard-page">
                <style>{DASHBOARD_STYLES}</style>

                <div className="agro-state-screen">
                    <div className="agro-spinner" />
                    <span>Loading business dashboard...</span>
                </div>
            </div>
        );
    }

    if (
        errorMessage
        && !dashboard
    ) {
        return (
            <div id="agro-admin-dashboard-page">
                <style>{DASHBOARD_STYLES}</style>

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
        <div id="agro-admin-dashboard-page">
            <style>{DASHBOARD_STYLES}</style>

            <div className="agro-page-inner">
                <section className="agro-header">
                    <div>
                        <span className="agro-kicker">
                            Business Overview
                        </span>

                        <h1>Admin Dashboard</h1>

                        <p>
                            Live sales, collections, expenses, profit and stock information.
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
                        <span className="agro-metric-label">Today&rsquo;s Sales</span>
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
                            Initial and due payments
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">New Due Today</span>
                        <strong className="agro-metric-value agro-value-warning">
                            {currencyFormatter.format(summary.today_due_sales)}
                        </strong>
                        <span className="agro-metric-sub">
                            Current balance of today&rsquo;s sales
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">Outstanding Due</span>
                        <strong className="agro-metric-value agro-value-warning">
                            {currencyFormatter.format(summary.outstanding_due)}
                        </strong>
                        <span className="agro-metric-sub">
                            All unsettled customer balances
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">Expenses Today</span>
                        <strong className="agro-metric-value agro-value-negative">
                            {currencyFormatter.format(summary.today_expenses)}
                        </strong>
                        <span className="agro-metric-sub">
                            Recorded business costs
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">Net Profit Today</span>
                        <strong
                            className={
                                `agro-metric-value ${summary.today_net_profit >= 0
                                    ? 'agro-value-positive'
                                    : 'agro-value-negative'
                                }`
                            }
                        >
                            {currencyFormatter.format(summary.today_net_profit)}
                        </strong>
                        <span className="agro-metric-sub">
                            After returns and expenses
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">Stock Cost Value</span>
                        <strong className="agro-metric-value">
                            {currencyFormatter.format(summary.stock_purchase_value)}
                        </strong>
                        <span className="agro-metric-sub">
                            {summary.stock_quantity} available units
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">Stock Retail Value</span>
                        <strong className="agro-metric-value">
                            {currencyFormatter.format(summary.stock_retail_value)}
                        </strong>
                        <span className="agro-metric-sub">
                            Estimated selling value
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">Stock Alerts</span>
                        <strong className="agro-metric-value">
                            {summary.expiring_batch_count
                                + summary.expired_batch_count
                                + summary.out_of_stock_products}
                        </strong>
                        <span className="agro-metric-sub">
                            Expiring, expired and out of stock
                        </span>
                    </article>
                </section>

                <section className="agro-two-column">
                    <article className="agro-card">
                        <header className="agro-card-header">
                            <div>
                                <span className="agro-kicker">Last 7 Days</span>
                                <h2>Financial Activity</h2>
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
                                <i className="agro-legend-dot agro-legend-expenses" />
                                Expenses
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
                                            className="agro-bar agro-bar-expenses"
                                            style={{
                                                width: `${(point.expenses / chartMaximum) * 100}%`,
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
                                <h2>Payment Collections</h2>
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

                <section className="agro-two-column">
                    <article className="agro-card">
                        <header className="agro-card-header">
                            <div>
                                <span className="agro-kicker">Last 30 Days</span>
                                <h2>Best-Selling Products</h2>
                            </div>
                        </header>

                        <div className="agro-table-scroll">
                            <table className="agro-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Quantity</th>
                                        <th>Sales</th>
                                        <th>Gross Profit</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {dashboard.top_products.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="agro-table-empty">
                                                No product sales yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        dashboard.top_products.map((product) => (
                                            <tr key={product.id}>
                                                <td>
                                                    <strong>{product.name}</strong>
                                                </td>
                                                <td>
                                                    {product.quantity_sold} {product.unit}
                                                </td>
                                                <td>
                                                    {currencyFormatter.format(product.sales_total)}
                                                </td>
                                                <td>
                                                    {currencyFormatter.format(product.gross_profit)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article className="agro-card">
                        <header className="agro-card-header">
                            <div>
                                <span className="agro-kicker">Latest</span>
                                <h2>Recent Expenses</h2>
                            </div>
                        </header>

                        <div className="agro-activity-list">
                            {dashboard.recent_expenses.length === 0 ? (
                                <div className="agro-table-empty">
                                    No expenses recorded.
                                </div>
                            ) : (
                                dashboard.recent_expenses.map((expense) => (
                                    <div className="agro-activity-row" key={expense.id}>
                                        <div>
                                            <strong className="agro-activity-title">
                                                {expense.description}
                                            </strong>
                                            <span className="agro-activity-meta">
                                                {expense.category.name} &middot; {formatDate(expense.expense_date)}
                                            </span>
                                        </div>

                                        <strong className="agro-value-negative">
                                            {currencyFormatter.format(expense.amount)}
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
                            <h2>Recent Sales</h2>
                        </div>
                    </header>

                    <div className="agro-table-scroll">
                        <table className="agro-table">
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
                                {dashboard.recent_sales.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="agro-table-empty">
                                            No sales completed.
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
                                            <td>{sale.created_by.name}</td>
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