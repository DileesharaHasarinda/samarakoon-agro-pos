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

const duePageStyles = `
    #sapo-due-page,
    #sapo-due-page *,
    #sapo-due-page *::before,
    #sapo-due-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-due-page {
        --sdp-green-800: #166534;
        --sdp-green-700: #15803d;
        --sdp-green-100: #dcfce7;
        --sdp-green-50: #f0fdf4;
        --sdp-red: #dc2626;
        --sdp-red-light: #fef2f2;
        --sdp-amber: #b45309;
        --sdp-amber-light: #fffbeb;
        --sdp-text: #111827;
        --sdp-text-secondary: #1f2937;
        --sdp-muted: #6b7280;
        --sdp-border: #e5e7eb;
        --sdp-border-strong: #d1d5db;
        --sdp-bg: #f9fafb;
        --sdp-white: #ffffff;
        --sdp-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        gap: 20px !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--sdp-text-secondary) !important;
        font-family: var(--sdp-font) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        background: transparent !important;
        isolation: isolate !important;
    }

    #sapo-due-page h2,
    #sapo-due-page p,
    #sapo-due-page span,
    #sapo-due-page strong,
    #sapo-due-page small,
    #sapo-due-page button,
    #sapo-due-page input,
    #sapo-due-page select,
    #sapo-due-page table,
    #sapo-due-page th,
    #sapo-due-page td {
        font-family: var(--sdp-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-due-page h2,
    #sapo-due-page p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Header ---------- */
    #sapo-due-page .sdp-header {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        padding: 20px 24px !important;
        background: var(--sdp-white) !important;
        border: 1px solid var(--sdp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-due-page .sdp-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--sdp-green-700) !important;
        margin-bottom: 6px !important;
        background: transparent !important;
    }

    #sapo-due-page .sdp-header h2 {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--sdp-text) !important;
        margin-bottom: 4px !important;
    }

    #sapo-due-page .sdp-header p {
        font-size: 13.5px !important;
        color: var(--sdp-muted) !important;
    }

    /* ---------- Summary cards ---------- */
    #sapo-due-page .sdp-summary-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important;
        gap: 16px !important;
    }

    #sapo-due-page .sdp-summary-grid article {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        padding: 18px 20px !important;
        background: var(--sdp-white) !important;
        border: 1px solid var(--sdp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-due-page .sdp-summary-grid span {
        font-size: 12.5px !important;
        font-weight: 500 !important;
        color: var(--sdp-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-due-page .sdp-summary-grid strong {
        font-size: 24px !important;
        font-weight: 700 !important;
        color: var(--sdp-text) !important;
        background: transparent !important;
    }

    #sapo-due-page .sdp-summary-due strong {
        color: var(--sdp-red) !important;
    }

    #sapo-due-page .sdp-summary-collected strong {
        color: var(--sdp-green-700) !important;
    }

    /* ---------- Alerts ---------- */
    #sapo-due-page .sdp-alert {
        padding: 12px 16px !important;
        border-radius: 8px !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
    }

    #sapo-due-page .sdp-alert-success {
        background: var(--sdp-green-50) !important;
        border: 1px solid #bbf7d0 !important;
        color: #15803d !important;
    }

    #sapo-due-page .sdp-alert-error {
        background: var(--sdp-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Content card ---------- */
    #sapo-due-page .sdp-content-card {
        background: var(--sdp-white) !important;
        border: 1px solid var(--sdp-border) !important;
        border-radius: 10px !important;
        padding: 20px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
    }

    /* ---------- Toolbar ---------- */
    #sapo-due-page .sdp-toolbar {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 12px !important;
    }

    #sapo-due-page .sdp-toolbar input[type="search"] {
        flex: 1 1 260px !important;
        height: 38px !important;
        padding: 0 14px !important;
        font-size: 13.5px !important;
        color: var(--sdp-text-secondary) !important;
        border: 1px solid var(--sdp-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        background: var(--sdp-bg) !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-due-page .sdp-toolbar input[type="search"]::placeholder {
        color: #9ca3af !important;
    }

    #sapo-due-page .sdp-toolbar input[type="search"]:focus {
        border-color: var(--sdp-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
        background: var(--sdp-white) !important;
    }

    #sapo-due-page .sdp-toolbar select {
        height: 38px !important;
        padding: 0 14px !important;
        font-size: 13.5px !important;
        border: 1px solid var(--sdp-border-strong) !important;
        border-radius: 8px !important;
        background: var(--sdp-bg) !important;
        color: var(--sdp-text-secondary) !important;
        outline: none !important;
        cursor: pointer !important;
        min-width: 160px !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-due-page .sdp-toolbar select:focus {
        border-color: var(--sdp-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
        background: var(--sdp-white) !important;
    }

    /* ---------- Scrollable table ---------- */
    #sapo-due-page .sdp-table-container {
        max-height: 520px !important;
        overflow-y: auto !important;
        overflow-x: auto !important;
        border: 1px solid var(--sdp-border) !important;
        border-radius: 8px !important;
        background: var(--sdp-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--sdp-border-strong) transparent !important;
    }

    #sapo-due-page .sdp-table-container::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
    }

    #sapo-due-page .sdp-table-container::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-due-page .sdp-table-container::-webkit-scrollbar-thumb {
        background: var(--sdp-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-due-page .sdp-table-container::-webkit-scrollbar-thumb:hover {
        background: #9ca3af !important;
    }

    #sapo-due-page .sdp-table {
        width: 100% !important;
        min-width: 820px !important;
        border-collapse: collapse !important;
        font-size: 13.5px !important;
        background: var(--sdp-white) !important;
    }

    #sapo-due-page .sdp-table thead {
        position: sticky !important;
        top: 0 !important;
        z-index: 1 !important;
    }

    #sapo-due-page .sdp-table thead th {
        background: #f9fafb !important;
        color: var(--sdp-muted) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        text-align: left !important;
        padding: 12px 16px !important;
        border-bottom: 1px solid var(--sdp-border) !important;
        white-space: nowrap !important;
    }

    #sapo-due-page .sdp-table tbody td {
        padding: 14px 16px !important;
        border-bottom: 1px solid #f1f5f9 !important;
        vertical-align: middle !important;
        color: var(--sdp-text-secondary) !important;
        background: var(--sdp-white) !important;
    }

    #sapo-due-page .sdp-table tbody tr:last-child td {
        border-bottom: none !important;
    }

    #sapo-due-page .sdp-table tbody tr:hover td {
        background: #f9fafb !important;
    }

    #sapo-due-page .sdp-table td strong {
        font-weight: 600 !important;
        color: var(--sdp-text) !important;
        display: block !important;
        background: transparent !important;
    }

    #sapo-due-page .sdp-table td small {
        display: block !important;
        margin-top: 2px !important;
        font-size: 12px !important;
        color: #9ca3af !important;
        background: transparent !important;
    }

    #sapo-due-page .sdp-due-value {
        color: var(--sdp-red) !important;
    }

    #sapo-due-page .sdp-table-state {
        text-align: center !important;
        padding: 40px 16px !important;
        color: #9ca3af !important;
        font-size: 13.5px !important;
        background: var(--sdp-white) !important;
    }

    /* ---------- Status badges ---------- */
    #sapo-due-page .sdp-overdue-badge,
    #sapo-due-page .sdp-partial-badge {
        display: inline-block !important;
        padding: 4px 10px !important;
        border-radius: 999px !important;
        font-size: 11.5px !important;
        font-weight: 600 !important;
        text-transform: capitalize !important;
        white-space: nowrap !important;
    }

    #sapo-due-page .sdp-overdue-badge {
        background: var(--sdp-red-light) !important;
        color: #b91c1c !important;
    }

    #sapo-due-page .sdp-partial-badge {
        background: var(--sdp-amber-light) !important;
        color: var(--sdp-amber) !important;
    }

    /* ---------- Buttons ---------- */
    #sapo-due-page .sdp-primary-button {
        padding: 7px 14px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        background: var(--sdp-green-700) !important;
        border: none !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: background 0.15s ease, transform 0.05s ease !important;
    }

    #sapo-due-page .sdp-primary-button:hover:not(:disabled) {
        background: var(--sdp-green-800) !important;
    }

    #sapo-due-page .sdp-primary-button:active:not(:disabled) {
        transform: scale(0.98) !important;
    }

    /* ---------- Pagination ---------- */
    #sapo-due-page .sdp-pagination {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 16px !important;
        padding-top: 4px !important;
    }

    #sapo-due-page .sdp-pagination span {
        font-size: 13px !important;
        color: var(--sdp-muted) !important;
        font-weight: 500 !important;
        background: transparent !important;
    }

    #sapo-due-page .sdp-pagination-button {
        padding: 7px 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--sdp-white) !important;
        border: 1px solid var(--sdp-border-strong) !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-due-page .sdp-pagination-button:hover:not(:disabled) {
        background: #f9fafb !important;
        border-color: #9ca3af !important;
    }

    #sapo-due-page .sdp-pagination-button:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 640px) {
        #sapo-due-page .sdp-header {
            flex-direction: column !important;
        }

        #sapo-due-page .sdp-toolbar {
            flex-direction: column !important;
        }

        #sapo-due-page .sdp-toolbar select {
            width: 100% !important;
        }
    }
`;

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

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeout = window.setTimeout(() => {
            setSuccessMessage('');
        }, 4000);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [successMessage]);

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
        <div id="sapo-due-page">
            <style>
                {duePageStyles}
            </style>

            <section className="sdp-header">
                <div>
                    <span className="sdp-kicker">
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

            <section className="sdp-summary-grid">
                <article>
                    <span>Due Sales</span>

                    <strong>
                        {summary.due_sales}
                    </strong>
                </article>

                <article className="sdp-summary-due">
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

                <article className="sdp-summary-collected">
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
                <div className="sdp-alert sdp-alert-success">
                    {successMessage}
                </div>
            )}

            {errorMessage
                && !selectedSale && (
                    <div className="sdp-alert sdp-alert-error">
                        {errorMessage}
                    </div>
                )}

            <section className="sdp-content-card">
                <div className="sdp-toolbar">
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

                <div className="sdp-table-container">
                    <table className="sdp-table">
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
                                        className="sdp-table-state"
                                    >
                                        Loading customer dues...
                                    </td>
                                </tr>
                            ) : sales.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="sdp-table-state"
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
                                                <strong className="sdp-due-value">
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
                                                            ? 'sdp-overdue-badge'
                                                            : 'sdp-partial-badge'
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
                                                    className="sdp-primary-button"
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

                <footer className="sdp-pagination">
                    <button
                        type="button"
                        className="sdp-pagination-button"
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
                        className="sdp-pagination-button"
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