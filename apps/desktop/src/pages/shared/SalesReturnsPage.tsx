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

export default function SalesReturnsPage() {
    const {
        token,
        user,
    } = useAuth();

    const [
        returns,
        setReturns,
    ] = useState<
        SalesReturnHistoryItem[]
    >([]);

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
    ] = useState<
        SalesReturnDetails | null
    >(null);

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
        <div className="page-stack">
            <section className="returns-page-header">
                <div>
                    <span className="page-kicker">
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

            <section className="returns-summary-grid">
                <article>
                    <span>Total Returns</span>
                    <strong>
                        {summary.total_returns}
                    </strong>
                </article>

                <article>
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
                    <article>
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
                <div className="form-alert">
                    {pageError}
                </div>
            )}

            <section className="content-card">
                <div className="returns-toolbar">
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
                            10
                        </option>

                        <option value={20}>
                            20
                        </option>

                        <option value={50}>
                            50
                        </option>
                    </select>
                </div>

                <div className="returns-table-container">
                    <table className="returns-table">
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
                                        className="table-state"
                                    >
                                        Loading sales returns...
                                    </td>
                                </tr>
                            ) : returns.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="table-state"
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
                                                    className="view-sale-button"
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
                    <footer className="category-pagination">
                        <p>
                            Showing {from} to {to}
                            {' '}of {total}
                        </p>

                        <div>
                            <button
                                type="button"
                                className="pagination-button"
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
                                className="pagination-button"
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