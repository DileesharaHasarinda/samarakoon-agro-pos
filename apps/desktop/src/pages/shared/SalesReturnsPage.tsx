import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import SalesReturnDetailsModal
    from '../../components/returns/SalesReturnDetailsModal';

import {
    ApiError,
} from '../../lib/api';

import {
    getSalesReturnDetails,
    getSalesReturns,
} from '../../services/salesReturnService';

import type {
    SalesReturnDetails,
    SalesReturnHistoryItem,
    SalesReturnSummary,
} from '../../types/salesReturn';

const currencyFormatter =
    new Intl.NumberFormat(
        'en-LK',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        },
    );

const emptySummary:
    SalesReturnSummary = {
    total_returns: 0,
    total_refund: 0,
    total_returned_quantity: 0,
    total_restocked_quantity: 0,
    profit_reversal: null,
};

function paymentName(
    method: string,
): string {
    switch (method) {
        case 'bank_transfer':
            return 'Bank Transfer';

        case 'card':
            return 'Card';

        default:
            return 'Cash';
    }
}

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
    ).format(new Date(value));
}

const returnsPageStyles = `
    #sapo-returns-page,
    #sapo-returns-page *,
    #sapo-returns-page *::before,
    #sapo-returns-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-returns-page {
        --srp-green-800: #166534;
        --srp-green-700: #15803d;
        --srp-green-100: #dcfce7;
        --srp-green-50: #f0fdf4;
        --srp-red: #dc2626;
        --srp-red-light: #fef2f2;
        --srp-blue: #2563eb;
        --srp-text: #111827;
        --srp-text-secondary: #1f2937;
        --srp-muted: #6b7280;
        --srp-border: #e5e7eb;
        --srp-border-strong: #d1d5db;
        --srp-bg: #f9fafb;
        --srp-white: #ffffff;
        --srp-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        gap: 20px !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--srp-text-secondary) !important;
        font-family: var(--srp-font) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        background: transparent !important;
        isolation: isolate !important;
    }

    #sapo-returns-page h2,
    #sapo-returns-page p,
    #sapo-returns-page span,
    #sapo-returns-page strong,
    #sapo-returns-page small,
    #sapo-returns-page button,
    #sapo-returns-page input,
    #sapo-returns-page select,
    #sapo-returns-page table,
    #sapo-returns-page th,
    #sapo-returns-page td {
        font-family: var(--srp-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-returns-page h2,
    #sapo-returns-page p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Header ---------- */
    #sapo-returns-page .srp-header {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        padding: 20px 24px !important;
        background: var(--srp-white) !important;
        border: 1px solid var(--srp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-returns-page .srp-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--srp-green-700) !important;
        margin-bottom: 6px !important;
        background: transparent !important;
    }

    #sapo-returns-page .srp-header h2 {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--srp-text) !important;
        margin-bottom: 4px !important;
    }

    #sapo-returns-page .srp-header p {
        font-size: 13.5px !important;
        color: var(--srp-muted) !important;
    }

    /* ---------- Summary cards ---------- */
    #sapo-returns-page .srp-summary-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
        gap: 16px !important;
    }

    #sapo-returns-page .srp-summary-grid article {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        padding: 18px 20px !important;
        background: var(--srp-white) !important;
        border: 1px solid var(--srp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-returns-page .srp-summary-grid span {
        font-size: 12px !important;
        font-weight: 500 !important;
        color: var(--srp-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-returns-page .srp-summary-grid strong {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--srp-text) !important;
        background: transparent !important;
    }

    #sapo-returns-page .srp-summary-refund strong {
        color: var(--srp-red) !important;
    }

    #sapo-returns-page .srp-summary-profit strong {
        color: var(--srp-green-700) !important;
    }

    /* ---------- Alerts ---------- */
    #sapo-returns-page .srp-alert {
        padding: 12px 16px !important;
        border-radius: 8px !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
    }

    #sapo-returns-page .srp-alert-error {
        background: var(--srp-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Content card ---------- */
    #sapo-returns-page .srp-content-card {
        background: var(--srp-white) !important;
        border: 1px solid var(--srp-border) !important;
        border-radius: 10px !important;
        padding: 20px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
    }

    /* ---------- Toolbar ---------- */
    #sapo-returns-page .srp-toolbar {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 12px !important;
    }

    #sapo-returns-page .srp-toolbar input[type="search"] {
        flex: 1 1 240px !important;
        height: 38px !important;
        padding: 0 14px !important;
        font-size: 13.5px !important;
        color: var(--srp-text-secondary) !important;
        border: 1px solid var(--srp-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        background: var(--srp-bg) !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-returns-page .srp-toolbar input[type="search"]::placeholder {
        color: #9ca3af !important;
    }

    #sapo-returns-page .srp-toolbar input[type="date"] {
        height: 38px !important;
        padding: 0 12px !important;
        font-size: 13.5px !important;
        color: var(--srp-text-secondary) !important;
        border: 1px solid var(--srp-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        background: var(--srp-bg) !important;
        min-width: 150px !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-returns-page .srp-toolbar input:focus {
        border-color: var(--srp-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
        background: var(--srp-white) !important;
    }

    #sapo-returns-page .srp-toolbar select {
        height: 38px !important;
        padding: 0 12px !important;
        font-size: 13.5px !important;
        border: 1px solid var(--srp-border-strong) !important;
        border-radius: 8px !important;
        background: var(--srp-bg) !important;
        color: var(--srp-text-secondary) !important;
        outline: none !important;
        cursor: pointer !important;
        min-width: 150px !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-returns-page .srp-toolbar select:focus {
        border-color: var(--srp-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
        background: var(--srp-white) !important;
    }

    /* ---------- Scrollable table ---------- */
    #sapo-returns-page .srp-table-container {
        max-height: 520px !important;
        overflow-y: auto !important;
        overflow-x: auto !important;
        border: 1px solid var(--srp-border) !important;
        border-radius: 8px !important;
        background: var(--srp-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--srp-border-strong) transparent !important;
    }

    #sapo-returns-page .srp-table-container::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
    }

    #sapo-returns-page .srp-table-container::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-returns-page .srp-table-container::-webkit-scrollbar-thumb {
        background: var(--srp-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-returns-page .srp-table-container::-webkit-scrollbar-thumb:hover {
        background: #9ca3af !important;
    }

    #sapo-returns-page .srp-table {
        width: 100% !important;
        min-width: 1080px !important;
        border-collapse: collapse !important;
        font-size: 13.5px !important;
        background: var(--srp-white) !important;
    }

    #sapo-returns-page .srp-table thead {
        position: sticky !important;
        top: 0 !important;
        z-index: 1 !important;
    }

    #sapo-returns-page .srp-table thead th {
        background: #f9fafb !important;
        color: var(--srp-muted) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        text-align: left !important;
        padding: 12px 16px !important;
        border-bottom: 1px solid var(--srp-border) !important;
        white-space: nowrap !important;
    }

    #sapo-returns-page .srp-table tbody td {
        padding: 14px 16px !important;
        border-bottom: 1px solid #f1f5f9 !important;
        vertical-align: middle !important;
        color: var(--srp-text-secondary) !important;
        background: var(--srp-white) !important;
        white-space: nowrap !important;
    }

    #sapo-returns-page .srp-table tbody tr:last-child td {
        border-bottom: none !important;
    }

    #sapo-returns-page .srp-table tbody tr:hover td {
        background: #f9fafb !important;
    }

    #sapo-returns-page .srp-table td strong {
        font-weight: 600 !important;
        color: var(--srp-text) !important;
        background: transparent !important;
    }

    #sapo-returns-page .srp-table-state {
        text-align: center !important;
        padding: 40px 16px !important;
        color: #9ca3af !important;
        font-size: 13.5px !important;
        background: var(--srp-white) !important;
        white-space: normal !important;
    }

    /* ---------- Buttons ---------- */
    #sapo-returns-page .srp-view-button {
        padding: 7px 14px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: var(--srp-blue) !important;
        background: #eff6ff !important;
        border: 1px solid #bfdbfe !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-returns-page .srp-view-button:hover {
        background: var(--srp-blue) !important;
        color: #ffffff !important;
        border-color: var(--srp-blue) !important;
    }

    /* ---------- Pagination ---------- */
    #sapo-returns-page .srp-pagination {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding-top: 4px !important;
    }

    #sapo-returns-page .srp-pagination p {
        font-size: 13px !important;
        color: var(--srp-muted) !important;
        font-weight: 500 !important;
        background: transparent !important;
    }

    #sapo-returns-page .srp-pagination-controls {
        display: flex !important;
        align-items: center !important;
        gap: 16px !important;
    }

    #sapo-returns-page .srp-pagination-controls span {
        font-size: 13px !important;
        color: var(--srp-muted) !important;
        font-weight: 500 !important;
        background: transparent !important;
    }

    #sapo-returns-page .srp-pagination-button {
        padding: 7px 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--srp-white) !important;
        border: 1px solid var(--srp-border-strong) !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-returns-page .srp-pagination-button:hover:not(:disabled) {
        background: #f9fafb !important;
        border-color: #9ca3af !important;
    }

    #sapo-returns-page .srp-pagination-button:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 640px) {
        #sapo-returns-page .srp-header {
            flex-direction: column !important;
        }

        #sapo-returns-page .srp-toolbar {
            flex-direction: column !important;
        }

        #sapo-returns-page .srp-toolbar input,
        #sapo-returns-page .srp-toolbar select {
            width: 100% !important;
        }

        #sapo-returns-page .srp-pagination {
            flex-direction: column !important;
            align-items: stretch !important;
        }
    }
`;

export default function SalesReturnsPage() {
    const {
        token,
        user,
    } = useAuth();

    const [
        returns,
        setReturns,
    ] = useState<SalesReturnHistoryItem[]>([]);

    const [
        summary,
        setSummary,
    ] = useState(emptySummary);

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        perPage,
        setPerPage,
    ] = useState(20);

    const [
        lastPage,
        setLastPage,
    ] = useState(1);

    const [
        total,
        setTotal,
    ] = useState(0);

    const [
        from,
        setFrom,
    ] = useState<number | null>(
        null,
    );

    const [
        to,
        setTo,
    ] = useState<number | null>(
        null,
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
        refundMethod,
        setRefundMethod,
    ] = useState('');

    const [
        dateFrom,
        setDateFrom,
    ] = useState('');

    const [
        dateTo,
        setDateTo,
    ] = useState('');

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        selectedDetails,
        setSelectedDetails,
    ] = useState<SalesReturnDetails | null>(null);

    const [
        isLoadingDetails,
        setIsLoadingDetails,
    ] = useState(false);

    const [
        detailsError,
        setDetailsError,
    ] = useState('');

    const isAdmin =
        user?.role === 'admin';

    const loadReturns =
        useCallback(async (): Promise<void> => {
            if (!token) {
                return;
            }

            setIsLoading(true);
            setPageError('');

            try {
                const response =
                    await getSalesReturns(
                        token,
                        {
                            page,
                            perPage,
                            search,
                            refundMethod,
                            dateFrom,
                            dateTo,
                        },
                    );

                setReturns(response.data);
                setSummary(response.summary);

                setLastPage(
                    response.meta.last_page,
                );

                setTotal(
                    response.meta.total,
                );

                setFrom(
                    response.meta.from,
                );

                setTo(
                    response.meta.to,
                );
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to load sales returns.',
                );
            } finally {
                setIsLoading(false);
            }
        }, [
            token,
            page,
            perPage,
            search,
            refundMethod,
            dateFrom,
            dateTo,
        ]);

    useEffect(() => {
        void loadReturns();
    }, [loadReturns]);

    useEffect(() => {
        const timeout =
            window.setTimeout(() => {
                setSearch(
                    searchInput.trim(),
                );

                setPage(1);
            }, 350);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [searchInput]);

    const openDetails =
        async (
            returnId: number,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setSelectedDetails(null);
            setDetailsError('');
            setIsLoadingDetails(true);

            try {
                const response =
                    await getSalesReturnDetails(
                        token,
                        returnId,
                    );

                setSelectedDetails(
                    response.data,
                );
            } catch (error) {
                setDetailsError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to load return details.',
                );
            } finally {
                setIsLoadingDetails(false);
            }
        };

    return (
        <div id="sapo-returns-page">
            <style>
                {returnsPageStyles}
            </style>

            <section className="srp-header">
                <div>
                    <span className="srp-kicker">
                        Refund and stock restoration
                    </span>

                    <h2>
                        {isAdmin
                            ? 'Sales Returns'
                            : 'My Sales Returns'}
                    </h2>

                    <p>
                        Review completed returns,
                        refunds and stock restored to
                        original batches.
                    </p>
                </div>
            </section>

            <section className="srp-summary-grid">
                <article>
                    <span>Total Returns</span>
                    <strong>
                        {summary.total_returns}
                    </strong>
                </article>

                <article className="srp-summary-refund">
                    <span>Total Refund</span>

                    <strong>
                        {currencyFormatter.format(
                            summary.total_refund,
                        )}
                    </strong>
                </article>

                <article>
                    <span>Returned Quantity</span>

                    <strong>
                        {
                            summary
                                .total_returned_quantity
                        }
                    </strong>
                </article>

                <article>
                    <span>Restocked Quantity</span>

                    <strong>
                        {
                            summary
                                .total_restocked_quantity
                        }
                    </strong>
                </article>

                {isAdmin && (
                    <article className="srp-summary-profit">
                        <span>Profit Reversal</span>

                        <strong>
                            {currencyFormatter.format(
                                summary
                                    .profit_reversal
                                ?? 0,
                            )}
                        </strong>
                    </article>
                )}
            </section>

            {pageError && (
                <div className="srp-alert srp-alert-error">
                    {pageError}
                </div>
            )}

            <section className="srp-content-card">
                <div className="srp-toolbar">
                    <input
                        type="search"
                        value={searchInput}
                        placeholder="Search return, sale, product or cashier..."
                        onChange={(event) => {
                            setSearchInput(
                                event.target.value,
                            );
                        }}
                    />

                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(event) => {
                            setDateFrom(
                                event.target.value,
                            );

                            setPage(1);
                        }}
                    />

                    <input
                        type="date"
                        value={dateTo}
                        onChange={(event) => {
                            setDateTo(
                                event.target.value,
                            );

                            setPage(1);
                        }}
                    />

                    <select
                        value={refundMethod}
                        onChange={(event) => {
                            setRefundMethod(
                                event.target.value,
                            );

                            setPage(1);
                        }}
                    >
                        <option value="">
                            All Refund Methods
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
                            10 per page
                        </option>

                        <option value={20}>
                            20 per page
                        </option>

                        <option value={50}>
                            50 per page
                        </option>
                    </select>
                </div>

                <div className="srp-table-container">
                    <table className="srp-table">
                        <thead>
                            <tr>
                                <th>Return</th>
                                <th>Original Sale</th>
                                <th>Date</th>
                                <th>Reason</th>
                                <th>Items</th>
                                <th>Refund Method</th>
                                <th>Refund</th>
                                <th>Restocked</th>
                                <th>Processed By</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="srp-table-state"
                                    >
                                        Loading sales returns...
                                    </td>
                                </tr>
                            ) : returns.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="srp-table-state"
                                    >
                                        No sales returns found.
                                    </td>
                                </tr>
                            ) : (
                                returns.map(
                                    (item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <strong>
                                                    {
                                                        item
                                                            .return_number
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    item.sale
                                                        .sale_number
                                                }
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    item.return_date,
                                                )}
                                            </td>

                                            <td>
                                                {item.reason}
                                            </td>

                                            <td>
                                                {
                                                    item
                                                        .total_quantity
                                                }{' '}
                                                quantity
                                            </td>

                                            <td>
                                                {paymentName(
                                                    item
                                                        .refund_method,
                                                )}
                                            </td>

                                            <td>
                                                <strong>
                                                    {currencyFormatter
                                                        .format(
                                                            item
                                                                .refund_amount,
                                                        )}
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    item
                                                        .restocked_quantity
                                                }
                                            </td>

                                            <td>
                                                {
                                                    item
                                                        .created_by
                                                        .name
                                                }
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="srp-view-button"
                                                    onClick={() => {
                                                        void openDetails(
                                                            item.id,
                                                        );
                                                    }}
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ),
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                {total > 0 && (
                    <footer className="srp-pagination">
                        <p>
                            Showing {from} to {to}
                            {' '}of {total}
                        </p>

                        <div className="srp-pagination-controls">
                            <button
                                type="button"
                                className="srp-pagination-button"
                                disabled={page <= 1}
                                onClick={() => {
                                    setPage(
                                        (current) =>
                                            current - 1,
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
                                className="srp-pagination-button"
                                disabled={
                                    page >= lastPage
                                }
                                onClick={() => {
                                    setPage(
                                        (current) =>
                                            current + 1,
                                    );
                                }}
                            >
                                Next
                            </button>
                        </div>
                    </footer>
                )}
            </section>

            <SalesReturnDetailsModal
                details={selectedDetails}
                isLoading={isLoadingDetails}
                errorMessage={detailsError}
                onClose={() => {
                    setSelectedDetails(null);
                    setDetailsError('');
                    setIsLoadingDetails(false);
                }}
            />
        </div>
    );
}