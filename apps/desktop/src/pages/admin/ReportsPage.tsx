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
    getReportOverview,
} from '../../services/reportService';

import type {
    ReportOverviewData,
} from '../../types/report';

type ReportTab =
    | 'overview'
    | 'products'
    | 'expenses'
    | 'dues'
    | 'inventory';

const currencyFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        },
    );

function currentDate(): string {
    return new Date()
        .toISOString()
        .slice(0, 10);
}

function monthStart(): string {
    const date =
        new Date();

    date.setDate(1);

    return date
        .toISOString()
        .slice(0, 10);
}

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

function paymentMethodName(
    value: string,
): string {
    switch (value) {
        case 'bank_transfer':
            return 'Bank Transfer';

        case 'card':
            return 'Card';

        default:
            return 'Cash';
    }
}

function escapeCsv(
    value:
        string
        | number
        | null,
): string {
    const text =
        value === null
            ? ''
            : String(value);

    return `"${text.replace(
        /"/g,
        '""',
    )}"`;
}

function downloadCsv(
    report: ReportOverviewData,
): void {
    const rows:
        Array<
            Array<
                string
                | number
                | null
            >
        > = [];

    rows.push([
        'Samarakoon Agro POS Report',
    ]);

    rows.push([
        'Date From',
        report.period.date_from,
    ]);

    rows.push([
        'Date To',
        report.period.date_to,
    ]);

    rows.push([]);

    rows.push([
        'Financial Summary',
    ]);

    rows.push([
        'Sales Count',
        report.summary.sales_count,
    ]);

    rows.push([
        'Sales Total',
        report.summary.sales_total,
    ]);

    rows.push([
        'Collected Amount',
        report.summary.collected_amount,
    ]);

    rows.push([
        'Due Amount',
        report.summary.due_amount,
    ]);

    rows.push([
        'Discount Total',
        report.summary.discount_total,
    ]);

    rows.push([
        'Gross Profit',
        report.summary.gross_profit,
    ]);

    rows.push([
        'Return Refund',
        report.summary.return_refund,
    ]);

    rows.push([
        'Expense Total',
        report.summary.expense_total,
    ]);

    rows.push([
        'Final Net Profit',
        report.summary.final_net_profit,
    ]);

    rows.push([]);

    rows.push([
        'Daily Activity',
    ]);

    rows.push([
        'Date',
        'Sales',
        'Collections',
        'Expenses',
        'Returns',
    ]);

    report.daily_series.forEach(
        (item) => {
            rows.push([
                item.date,
                item.sales,
                item.collections,
                item.expenses,
                item.returns,
            ]);
        },
    );

    rows.push([]);

    rows.push([
        'Product Performance',
    ]);

    rows.push([
        'Product',
        'Category',
        'Quantity Sold',
        'Unit',
        'Sales Total',
        'Cost Total',
        'Gross Profit',
    ]);

    report.product_performance.forEach(
        (product) => {
            rows.push([
                product.name,
                product.category.name,
                product.quantity_sold,
                product.unit,
                product.sales_total,
                product.cost_total,
                product.gross_profit,
            ]);
        },
    );

    rows.push([]);

    rows.push([
        'Expense Categories',
    ]);

    rows.push([
        'Category',
        'Expense Count',
        'Total Amount',
    ]);

    report.expense_categories.forEach(
        (category) => {
            rows.push([
                category.name,
                category.expense_count,
                category.total_amount,
            ]);
        },
    );

    rows.push([]);

    rows.push([
        'Customer Dues',
    ]);

    rows.push([
        'Customer',
        'Customer Code',
        'Mobile',
        'Due Sales',
        'Sales Total',
        'Paid Amount',
        'Due Amount',
    ]);

    report.customer_dues.forEach(
        (customer) => {
            rows.push([
                customer.name,
                customer.customer_code,
                customer.mobile,
                customer.due_sales,
                customer.sales_total,
                customer.paid_amount,
                customer.due_amount,
            ]);
        },
    );

    rows.push([]);

    rows.push([
        'Inventory',
    ]);

    rows.push([
        'Product',
        'Category',
        'Quantity',
        'Unit',
        'Batch Count',
        'Purchase Value',
        'Retail Value',
        'Nearest Expiry',
    ]);

    report.inventory.products.forEach(
        (product) => {
            rows.push([
                product.name,
                product.category.name,
                product.quantity,
                product.unit,
                product.batch_count,
                product.purchase_value,
                product.retail_value,
                product.nearest_expiry,
            ]);
        },
    );

    const csv =
        rows
            .map(
                (row) =>
                    row
                        .map(escapeCsv)
                        .join(','),
            )
            .join('\n');

    const blob =
        new Blob(
            [csv],
            {
                type:
                    'text/csv;charset=utf-8',
            },
        );

    const url =
        URL.createObjectURL(
            blob,
        );

    const anchor =
        document.createElement('a');

    anchor.href = url;

    anchor.download =
        `samarakoon-report-${report.period.date_from}-to-${report.period.date_to}.csv`;

    document.body.appendChild(
        anchor,
    );

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(
        url,
    );
}

export default function ReportsPage() {
    const {
        token,
    } = useAuth();

    const [
        report,
        setReport,
    ] = useState<ReportOverviewData | null>(
        null,
    );

    const [
        activeTab,
        setActiveTab,
    ] = useState<ReportTab>(
        'overview',
    );

    const [
        dateFrom,
        setDateFrom,
    ] = useState(
        monthStart(),
    );

    const [
        dateTo,
        setDateTo,
    ] = useState(
        currentDate(),
    );

    const [
        paymentMethod,
        setPaymentMethod,
    ] = useState('');

    const [
        paymentStatus,
        setPaymentStatus,
    ] = useState('');

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const loadReport =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setErrorMessage('');

                try {
                    const response =
                        await getReportOverview(
                            token,
                            {
                                dateFrom,
                                dateTo,
                                paymentMethod,
                                paymentStatus,
                            },
                        );

                    setReport(
                        response.data,
                    );
                } catch (error) {
                    setErrorMessage(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to generate the report.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [
                token,
                dateFrom,
                dateTo,
                paymentMethod,
                paymentStatus,
            ],
        );

    useEffect(() => {
        void loadReport();
    }, [loadReport]);

    const chartMaximum =
        useMemo(
            () => {
                if (!report) {
                    return 1;
                }

                return Math.max(
                    1,

                    ...report
                        .daily_series
                        .flatMap(
                            (point) => [
                                point.sales,
                                point.collections,
                                point.expenses,
                                point.returns,
                            ],
                        ),
                );
            },
            [report],
        );

    return (
        <div className="page-stack reports-page">
            <section className="reports-page-header">
                <div>
                    <span className="page-kicker">
                        Business intelligence
                    </span>

                    <h2>Reports</h2>

                    <p>
                        Review sales, profit,
                        expenses, dues, products and
                        stock values.
                    </p>
                </div>

                <div className="report-header-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        disabled={!report}
                        onClick={() => {
                            window.print();
                        }}
                    >
                        Print Report
                    </button>

                    <button
                        type="button"
                        className="primary-button"
                        disabled={!report}
                        onClick={() => {
                            if (report) {
                                downloadCsv(
                                    report,
                                );
                            }
                        }}
                    >
                        Export CSV
                    </button>
                </div>
            </section>

            <section className="content-card report-filter-card">
                <label>
                    <span>From</span>

                    <input
                        type="date"
                        value={dateFrom}
                        max={dateTo}
                        onChange={(event) => {
                            setDateFrom(
                                event.target.value,
                            );
                        }}
                    />
                </label>

                <label>
                    <span>To</span>

                    <input
                        type="date"
                        value={dateTo}
                        min={dateFrom}
                        onChange={(event) => {
                            setDateTo(
                                event.target.value,
                            );
                        }}
                    />
                </label>

                <label>
                    <span>
                        Payment Method
                    </span>

                    <select
                        value={paymentMethod}
                        onChange={(event) => {
                            setPaymentMethod(
                                event.target.value,
                            );
                        }}
                    >
                        <option value="">
                            All Methods
                        </option>

                        <option value="cash">
                            Cash
                        </option>

                        <option value="card">
                            Card
                        </option>

                        <option value="bank_transfer">
                            Bank Transfer
                        </option>
                    </select>
                </label>

                <label>
                    <span>
                        Payment Status
                    </span>

                    <select
                        value={paymentStatus}
                        onChange={(event) => {
                            setPaymentStatus(
                                event.target.value,
                            );
                        }}
                    >
                        <option value="">
                            All Statuses
                        </option>

                        <option value="paid">
                            Paid
                        </option>

                        <option value="partial">
                            Partial
                        </option>

                        <option value="due">
                            Due
                        </option>
                    </select>
                </label>

                <button
                    type="button"
                    className="primary-button"
                    disabled={isLoading}
                    onClick={() => {
                        void loadReport();
                    }}
                >
                    {isLoading
                        ? 'Generating...'
                        : 'Generate Report'}
                </button>
            </section>

            {errorMessage && (
                <div className="form-alert">
                    {errorMessage}
                </div>
            )}

            <nav className="report-tabs">
                <button
                    type="button"
                    className={
                        activeTab === 'overview'
                            ? 'active'
                            : ''
                    }
                    onClick={() => {
                        setActiveTab(
                            'overview',
                        );
                    }}
                >
                    Overview
                </button>

                <button
                    type="button"
                    className={
                        activeTab === 'products'
                            ? 'active'
                            : ''
                    }
                    onClick={() => {
                        setActiveTab(
                            'products',
                        );
                    }}
                >
                    Products
                </button>

                <button
                    type="button"
                    className={
                        activeTab === 'expenses'
                            ? 'active'
                            : ''
                    }
                    onClick={() => {
                        setActiveTab(
                            'expenses',
                        );
                    }}
                >
                    Expenses
                </button>

                <button
                    type="button"
                    className={
                        activeTab === 'dues'
                            ? 'active'
                            : ''
                    }
                    onClick={() => {
                        setActiveTab(
                            'dues',
                        );
                    }}
                >
                    Customer Dues
                </button>

                <button
                    type="button"
                    className={
                        activeTab === 'inventory'
                            ? 'active'
                            : ''
                    }
                    onClick={() => {
                        setActiveTab(
                            'inventory',
                        );
                    }}
                >
                    Inventory
                </button>
            </nav>

            {isLoading && !report ? (
                <div className="dashboard-page-state">
                    <div className="small-spinner" />

                    <span>
                        Generating report...
                    </span>
                </div>
            ) : report ? (
                <>
                    {activeTab === 'overview' && (
                        <>
                            <section className="report-summary-grid">
                                <article>
                                    <span>
                                        Sales Total
                                    </span>

                                    <strong>
                                        {currencyFormatter
                                            .format(
                                                report
                                                    .summary
                                                    .sales_total,
                                            )}
                                    </strong>

                                    <small>
                                        {
                                            report
                                                .summary
                                                .sales_count
                                        }{' '}
                                        transactions
                                    </small>
                                </article>

                                <article>
                                    <span>
                                        Collected
                                    </span>

                                    <strong>
                                        {currencyFormatter
                                            .format(
                                                report
                                                    .summary
                                                    .collected_amount,
                                            )}
                                    </strong>
                                </article>

                                <article>
                                    <span>
                                        Due Amount
                                    </span>

                                    <strong className="dashboard-warning-value">
                                        {currencyFormatter
                                            .format(
                                                report
                                                    .summary
                                                    .due_amount,
                                            )}
                                    </strong>
                                </article>

                                <article>
                                    <span>
                                        Gross Profit
                                    </span>

                                    <strong>
                                        {currencyFormatter
                                            .format(
                                                report
                                                    .summary
                                                    .gross_profit,
                                            )}
                                    </strong>
                                </article>

                                <article>
                                    <span>
                                        Returns
                                    </span>

                                    <strong className="dashboard-negative-value">
                                        {currencyFormatter
                                            .format(
                                                report
                                                    .summary
                                                    .return_refund,
                                            )}
                                    </strong>

                                    <small>
                                        {
                                            report
                                                .summary
                                                .return_count
                                        }{' '}
                                        returns
                                    </small>
                                </article>

                                <article>
                                    <span>
                                        Expenses
                                    </span>

                                    <strong className="dashboard-negative-value">
                                        {currencyFormatter
                                            .format(
                                                report
                                                    .summary
                                                    .expense_total,
                                            )}
                                    </strong>
                                </article>

                                <article>
                                    <span>
                                        Final Net Profit
                                    </span>

                                    <strong
                                        className={
                                            report
                                                .summary
                                                .final_net_profit
                                                >= 0
                                                ? 'dashboard-positive-value'
                                                : 'dashboard-negative-value'
                                        }
                                    >
                                        {currencyFormatter
                                            .format(
                                                report
                                                    .summary
                                                    .final_net_profit,
                                            )}
                                    </strong>

                                    <small>
                                        After returns and expenses
                                    </small>
                                </article>
                            </section>

                            <section className="dashboard-two-column">
                                <article className="content-card dashboard-chart-card">
                                    <header className="dashboard-card-header">
                                        <div>
                                            <span className="page-kicker">
                                                {
                                                    report
                                                        .period
                                                        .date_from
                                                }
                                                {' to '}
                                                {
                                                    report
                                                        .period
                                                        .date_to
                                                }
                                            </span>

                                            <h3>
                                                Daily Financial Activity
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

                                    <div className="dashboard-bar-chart report-bar-chart">
                                        {report
                                            .daily_series
                                            .map(
                                                (point) => (
                                                    <div
                                                        className="dashboard-chart-row"
                                                        key={
                                                            point
                                                                .date
                                                        }
                                                    >
                                                        <span>
                                                            {formatDate(
                                                                point
                                                                    .date,
                                                            )}
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
                                                                    point
                                                                        .sales,
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
                                                Collections
                                            </span>

                                            <h3>
                                                Payment Methods
                                            </h3>
                                        </div>
                                    </header>

                                    <div className="dashboard-payment-list">
                                        {report
                                            .payment_breakdown
                                            .length === 0 ? (
                                            <div className="table-state">
                                                No payments found.
                                            </div>
                                        ) : (
                                            report
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
                        </>
                    )}

                    {activeTab === 'products' && (
                        <section className="content-card">
                            <header className="dashboard-card-header">
                                <div>
                                    <span className="page-kicker">
                                        Sales performance
                                    </span>

                                    <h3>
                                        Product Report
                                    </h3>
                                </div>
                            </header>

                            <div className="report-table-container">
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Category</th>
                                            <th>Quantity</th>
                                            <th>Sales</th>
                                            <th>Cost</th>
                                            <th>Gross Profit</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {report
                                            .product_performance
                                            .length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="table-state"
                                                >
                                                    No product sales found.
                                                </td>
                                            </tr>
                                        ) : (
                                            report
                                                .product_performance
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
                                                                        .category
                                                                        .name
                                                                }
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
                                                                            .cost_total,
                                                                    )}
                                                            </td>

                                                            <td>
                                                                <strong
                                                                    className={
                                                                        product
                                                                            .gross_profit
                                                                            >= 0
                                                                            ? 'dashboard-positive-value'
                                                                            : 'dashboard-negative-value'
                                                                    }
                                                                >
                                                                    {currencyFormatter
                                                                        .format(
                                                                            product
                                                                                .gross_profit,
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
                    )}

                    {activeTab === 'expenses' && (
                        <section className="content-card">
                            <header className="dashboard-card-header">
                                <div>
                                    <span className="page-kicker">
                                        Business costs
                                    </span>

                                    <h3>
                                        Expense Category Report
                                    </h3>
                                </div>
                            </header>

                            <div className="report-table-container">
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Records</th>
                                            <th>Total Amount</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {report
                                            .expense_categories
                                            .length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="table-state"
                                                >
                                                    No expenses found.
                                                </td>
                                            </tr>
                                        ) : (
                                            report
                                                .expense_categories
                                                .map(
                                                    (category) => (
                                                        <tr
                                                            key={
                                                                category.id
                                                            }
                                                        >
                                                            <td>
                                                                <strong>
                                                                    {
                                                                        category
                                                                            .name
                                                                    }
                                                                </strong>
                                                            </td>

                                                            <td>
                                                                {
                                                                    category
                                                                        .expense_count
                                                                }
                                                            </td>

                                                            <td>
                                                                <strong className="dashboard-negative-value">
                                                                    {currencyFormatter
                                                                        .format(
                                                                            category
                                                                                .total_amount,
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
                    )}

                    {activeTab === 'dues' && (
                        <section className="content-card">
                            <header className="dashboard-card-header">
                                <div>
                                    <span className="page-kicker">
                                        Accounts receivable
                                    </span>

                                    <h3>
                                        Customer Due Report
                                    </h3>
                                </div>
                            </header>

                            <div className="report-table-container">
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Customer</th>
                                            <th>Mobile</th>
                                            <th>Due Sales</th>
                                            <th>Sales Total</th>
                                            <th>Paid</th>
                                            <th>Due</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {report
                                            .customer_dues
                                            .length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="table-state"
                                                >
                                                    No customer dues found.
                                                </td>
                                            </tr>
                                        ) : (
                                            report
                                                .customer_dues
                                                .map(
                                                    (customer) => (
                                                        <tr
                                                            key={
                                                                customer.id
                                                            }
                                                        >
                                                            <td>
                                                                <strong>
                                                                    {
                                                                        customer
                                                                            .name
                                                                    }
                                                                </strong>

                                                                <small>
                                                                    {
                                                                        customer
                                                                            .customer_code
                                                                    }
                                                                </small>
                                                            </td>

                                                            <td>
                                                                {customer.mobile
                                                                    ?? '—'}
                                                            </td>

                                                            <td>
                                                                {
                                                                    customer
                                                                        .due_sales
                                                                }
                                                            </td>

                                                            <td>
                                                                {currencyFormatter
                                                                    .format(
                                                                        customer
                                                                            .sales_total,
                                                                    )}
                                                            </td>

                                                            <td>
                                                                {currencyFormatter
                                                                    .format(
                                                                        customer
                                                                            .paid_amount,
                                                                    )}
                                                            </td>

                                                            <td>
                                                                <strong className="dashboard-warning-value">
                                                                    {currencyFormatter
                                                                        .format(
                                                                            customer
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
                    )}

                    {activeTab === 'inventory' && (
                        <>
                            <section className="report-summary-grid">
                                <article>
                                    <span>
                                        Stock Quantity
                                    </span>

                                    <strong>
                                        {
                                            report
                                                .inventory
                                                .summary
                                                .quantity
                                        }
                                    </strong>
                                </article>

                                <article>
                                    <span>
                                        Purchase Value
                                    </span>

                                    <strong>
                                        {currencyFormatter
                                            .format(
                                                report
                                                    .inventory
                                                    .summary
                                                    .purchase_value,
                                            )}
                                    </strong>
                                </article>

                                <article>
                                    <span>
                                        Retail Value
                                    </span>

                                    <strong>
                                        {currencyFormatter
                                            .format(
                                                report
                                                    .inventory
                                                    .summary
                                                    .retail_value,
                                            )}
                                    </strong>
                                </article>

                                <article>
                                    <span>
                                        Expiring Batches
                                    </span>

                                    <strong className="dashboard-warning-value">
                                        {
                                            report
                                                .inventory
                                                .summary
                                                .expiring_batch_count
                                        }
                                    </strong>
                                </article>

                                <article>
                                    <span>
                                        Expired Batches
                                    </span>

                                    <strong className="dashboard-negative-value">
                                        {
                                            report
                                                .inventory
                                                .summary
                                                .expired_batch_count
                                        }
                                    </strong>
                                </article>
                            </section>

                            <section className="content-card">
                                <header className="dashboard-card-header">
                                    <div>
                                        <span className="page-kicker">
                                            Current stock
                                        </span>

                                        <h3>
                                            Inventory Value Report
                                        </h3>
                                    </div>
                                </header>

                                <div className="report-table-container">
                                    <table className="report-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Category</th>
                                                <th>Quantity</th>
                                                <th>Batches</th>
                                                <th>Purchase Value</th>
                                                <th>Retail Value</th>
                                                <th>Nearest Expiry</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {report
                                                .inventory
                                                .products
                                                .length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className="table-state"
                                                    >
                                                        No available stock.
                                                    </td>
                                                </tr>
                                            ) : (
                                                report
                                                    .inventory
                                                    .products
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
                                                                            .category
                                                                            .name
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        product
                                                                            .quantity
                                                                    }{' '}
                                                                    {
                                                                        product
                                                                            .unit
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        product
                                                                            .batch_count
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {currencyFormatter
                                                                        .format(
                                                                            product
                                                                                .purchase_value,
                                                                        )}
                                                                </td>

                                                                <td>
                                                                    {currencyFormatter
                                                                        .format(
                                                                            product
                                                                                .retail_value,
                                                                        )}
                                                                </td>

                                                                <td>
                                                                    {formatDate(
                                                                        product
                                                                            .nearest_expiry,
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                </>
            ) : null}
        </div>
    );
}