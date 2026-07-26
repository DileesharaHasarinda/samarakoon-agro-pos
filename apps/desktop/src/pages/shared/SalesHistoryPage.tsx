import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import CreateSalesReturnModal
    from '../../components/returns/CreateSalesReturnModal';

import SaleDetailsModal
    from '../../components/sales/SaleDetailsModal';

import {
    ApiError,
} from '../../lib/api';

import {
    createSalesReturn,
    getSalesReturnOptions,
} from '../../services/salesReturnService';

import {
    getSaleDetails,
    getSalesHistory,
} from '../../services/salesService';

import type {
    SaleHistoryItem,
    SaleHistorySummary,
    SaleReceipt,
} from '../../types/sale';

import type {
    CreateSalesReturnValues,
    SalesReturnOptions,
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
    SaleHistorySummary = {
    total_sales: 0,
    total_revenue: 0,
    total_discount: 0,
    total_items: 0,
    gross_profit: null,
    net_profit: null,
};

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

function paymentName(
    method: string | null,
): string {
    switch (method) {
        case 'bank_transfer':
            return 'Bank Transfer';

        case 'card':
            return 'Card';

        case 'cash':
            return 'Cash';

        default:
            return 'Unknown';
    }
}

export default function SalesHistoryPage() {
    const {
        token,
        user,
    } = useAuth();

    const [
        sales,
        setSales,
    ] = useState<SaleHistoryItem[]>(
        [],
    );

    const [
        summary,
        setSummary,
    ] = useState<SaleHistorySummary>(
        emptySummary,
    );

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        perPage,
        setPerPage,
    ] = useState(20);

    const [
        currentPage,
        setCurrentPage,
    ] = useState(1);

    const [
        lastPage,
        setLastPage,
    ] = useState(1);

    const [
        totalResults,
        setTotalResults,
    ] = useState(0);

    const [
        resultFrom,
        setResultFrom,
    ] = useState<number | null>(
        null,
    );

    const [
        resultTo,
        setResultTo,
    ] = useState<number | null>(
        null,
    );

    const [
        searchInput,
        setSearchInput,
    ] = useState('');

    const [
        appliedSearch,
        setAppliedSearch,
    ] = useState('');

    const [
        paymentMethod,
        setPaymentMethod,
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
        selectedSaleId,
        setSelectedSaleId,
    ] = useState<number | null>(
        null,
    );

    const [
        selectedSale,
        setSelectedSale,
    ] = useState<SaleReceipt | null>(
        null,
    );

    const [
        isLoadingSale,
        setIsLoadingSale,
    ] = useState(false);

    const [
        saleDetailsError,
        setSaleDetailsError,
    ] = useState('');

    /*
     * Sales return states.
     *
     * These hooks must remain inside
     * SalesHistoryPage().
     */
    const [
        returnSaleId,
        setReturnSaleId,
    ] = useState<number | null>(
        null,
    );

    const [
        returnOptions,
        setReturnOptions,
    ] = useState<SalesReturnOptions | null>(
        null,
    );

    const [
        isLoadingReturn,
        setIsLoadingReturn,
    ] = useState(false);

    const [
        isSubmittingReturn,
        setIsSubmittingReturn,
    ] = useState(false);

    const [
        returnError,
        setReturnError,
    ] = useState('');

    const [
        returnSuccess,
        setReturnSuccess,
    ] = useState('');

    const isAdmin =
        user?.role === 'admin';

    const loadSales =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getSalesHistory(
                            token,
                            {
                                page,
                                perPage,

                                search:
                                    appliedSearch,

                                paymentMethod,
                                dateFrom,
                                dateTo,
                            },
                        );

                    setSales(
                        response.data,
                    );

                    setSummary(
                        response.summary,
                    );

                    setCurrentPage(
                        response
                            .meta
                            .current_page,
                    );

                    setLastPage(
                        response
                            .meta
                            .last_page,
                    );

                    setTotalResults(
                        response.meta.total,
                    );

                    setResultFrom(
                        response.meta.from,
                    );

                    setResultTo(
                        response.meta.to,
                    );
                } catch (error) {
                    if (
                        error
                        instanceof ApiError
                    ) {
                        setPageError(
                            error.message,
                        );
                    } else {
                        setPageError(
                            'Unable to load sales history.',
                        );
                    }
                } finally {
                    setIsLoading(false);
                }
            },
            [
                token,
                page,
                perPage,
                appliedSearch,
                paymentMethod,
                dateFrom,
                dateTo,
            ],
        );

    useEffect(() => {
        void loadSales();
    }, [loadSales]);

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    setPage(1);

                    setAppliedSearch(
                        searchInput.trim(),
                    );
                },
                350,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [searchInput]);

    const loadSelectedSale =
        useCallback(
            async (
                saleId: number,
            ): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoadingSale(true);
                setSaleDetailsError('');
                setSelectedSale(null);

                try {
                    const response =
                        await getSaleDetails(
                            token,
                            saleId,
                        );

                    setSelectedSale(
                        response.data,
                    );
                } catch (error) {
                    if (
                        error
                        instanceof ApiError
                    ) {
                        setSaleDetailsError(
                            error.message,
                        );
                    } else {
                        setSaleDetailsError(
                            'Unable to load sale details.',
                        );
                    }
                } finally {
                    setIsLoadingSale(false);
                }
            },
            [token],
        );

    const openSaleDetails = (
        saleId: number,
    ): void => {
        setSelectedSaleId(
            saleId,
        );

        void loadSelectedSale(
            saleId,
        );
    };

    const closeSaleDetails =
        (): void => {
            setSelectedSaleId(null);
            setSelectedSale(null);
            setSaleDetailsError('');
        };

    const openReturnModal =
        async (
            saleId: number,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setReturnSaleId(
                saleId,
            );

            setReturnOptions(null);
            setReturnError('');
            setReturnSuccess('');
            setIsLoadingReturn(true);

            try {
                const response =
                    await getSalesReturnOptions(
                        token,
                        saleId,
                    );

                setReturnOptions(
                    response.data,
                );
            } catch (error) {
                if (
                    error
                    instanceof ApiError
                ) {
                    setReturnError(
                        error.message,
                    );
                } else {
                    setReturnError(
                        'Unable to load returnable items.',
                    );
                }
            } finally {
                setIsLoadingReturn(false);
            }
        };

    const closeReturnModal =
        (): void => {
            if (isSubmittingReturn) {
                return;
            }

            setReturnSaleId(null);
            setReturnOptions(null);
            setReturnError('');
            setIsLoadingReturn(false);
        };

    const submitReturn =
        async (
            values:
                CreateSalesReturnValues,
        ): Promise<void> => {
            if (
                !token
                || returnSaleId === null
                || isSubmittingReturn
            ) {
                return;
            }

            setIsSubmittingReturn(true);
            setReturnError('');

            try {
                const response =
                    await createSalesReturn(
                        token,
                        returnSaleId,
                        values,
                    );

                setReturnSuccess(
                    response.message,
                );

                setReturnSaleId(null);
                setReturnOptions(null);
                setReturnError('');

                await loadSales();
            } catch (error) {
                if (
                    error
                    instanceof ApiError
                ) {
                    setReturnError(
                        error.message,
                    );
                } else {
                    setReturnError(
                        'Unable to complete the sales return.',
                    );
                }
            } finally {
                setIsSubmittingReturn(false);
            }
        };

    const clearFilters =
        (): void => {
            setSearchInput('');
            setAppliedSearch('');
            setPaymentMethod('');
            setDateFrom('');
            setDateTo('');
            setPage(1);
        };

    const hasFilters =
        appliedSearch !== ''
        || paymentMethod !== ''
        || dateFrom !== ''
        || dateTo !== '';

    return (
        <div className="page-stack">
            <section className="sales-history-header">
                <div>
                    <span className="page-kicker">
                        Completed transactions
                    </span>

                    <h2>
                        {isAdmin
                            ? 'Sales History'
                            : 'My Sales History'}
                    </h2>

                    <p>
                        {isAdmin
                            ? 'Review completed sales, payments, stock batches and profit information.'
                            : 'Review sales completed using your cashier account.'}
                    </p>
                </div>
            </section>

            <section className="sales-summary-grid">
                <article>
                    <span>
                        Total Sales
                    </span>

                    <strong>
                        {summary.total_sales}
                    </strong>

                    <small>
                        Completed transactions
                    </small>
                </article>

                <article>
                    <span>
                        Total Revenue
                    </span>

                    <strong>
                        {currencyFormatter
                            .format(
                                summary
                                    .total_revenue,
                            )}
                    </strong>

                    <small>
                        After discounts
                    </small>
                </article>

                <article>
                    <span>
                        Items Sold
                    </span>

                    <strong>
                        {summary.total_items}
                    </strong>

                    <small>
                        Total sold quantity
                    </small>
                </article>

                <article>
                    <span>
                        Total Discounts
                    </span>

                    <strong>
                        {currencyFormatter
                            .format(
                                summary
                                    .total_discount,
                            )}
                    </strong>

                    <small>
                        Item and sale discounts
                    </small>
                </article>

                {isAdmin && (
                    <>
                        <article>
                            <span>
                                Gross Profit
                            </span>

                            <strong>
                                {currencyFormatter
                                    .format(
                                        summary
                                            .gross_profit
                                        ?? 0,
                                    )}
                            </strong>

                            <small>
                                Before sale discounts
                            </small>
                        </article>

                        <article>
                            <span>
                                Net Profit
                            </span>

                            <strong className="sales-summary-profit">
                                {currencyFormatter
                                    .format(
                                        summary
                                            .net_profit
                                        ?? 0,
                                    )}
                            </strong>

                            <small>
                                After sale discounts
                            </small>
                        </article>
                    </>
                )}
            </section>

            {returnSuccess && (
                <div
                    className="success-alert"
                    role="status"
                >
                    <span>✓</span>

                    <p>
                        {returnSuccess}
                    </p>

                    <button
                        type="button"
                        aria-label="Close success message"
                        onClick={() => {
                            setReturnSuccess('');
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            {pageError && (
                <div
                    className="form-alert sales-history-error"
                    role="alert"
                >
                    <span>
                        {pageError}
                    </span>

                    <button
                        type="button"
                        className="retry-button"
                        onClick={() => {
                            void loadSales();
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <section className="content-card">
                <div className="sales-history-toolbar">
                    <div className="sales-history-search">
                        <span aria-hidden="true">
                            ⌕
                        </span>

                        <input
                            type="search"
                            value={searchInput}
                            placeholder="Search sale, cashier, product, SKU or barcode..."
                            aria-label="Search sales"
                            onChange={(event) => {
                                setSearchInput(
                                    event.target
                                        .value,
                                );
                            }}
                        />

                        {searchInput && (
                            <button
                                type="button"
                                aria-label="Clear search"
                                onClick={() => {
                                    setSearchInput('');
                                    setAppliedSearch('');
                                    setPage(1);
                                }}
                            >
                                ×
                            </button>
                        )}
                    </div>

                    <div className="sales-history-filters">
                        <label>
                            <span>From</span>

                            <input
                                type="date"
                                value={dateFrom}
                                max={
                                    dateTo
                                    || undefined
                                }
                                onChange={(event) => {
                                    setDateFrom(
                                        event.target
                                            .value,
                                    );

                                    setPage(1);
                                }}
                            />
                        </label>

                        <label>
                            <span>To</span>

                            <input
                                type="date"
                                value={dateTo}
                                min={
                                    dateFrom
                                    || undefined
                                }
                                onChange={(event) => {
                                    setDateTo(
                                        event.target
                                            .value,
                                    );

                                    setPage(1);
                                }}
                            />
                        </label>

                        <label>
                            <span>
                                Payment
                            </span>

                            <select
                                value={paymentMethod}
                                onChange={(event) => {
                                    setPaymentMethod(
                                        event.target
                                            .value,
                                    );

                                    setPage(1);
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
                            <span>Rows</span>

                            <select
                                value={perPage}
                                onChange={(event) => {
                                    setPerPage(
                                        Number(
                                            event.target
                                                .value,
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

                                <option value={100}>
                                    100
                                </option>
                            </select>
                        </label>

                        {hasFilters && (
                            <button
                                type="button"
                                className="clear-filter-button"
                                onClick={
                                    clearFilters
                                }
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                <div className="sales-history-table-container">
                    <table className="sales-history-table">
                        <thead>
                            <tr>
                                <th>
                                    Sale Number
                                </th>

                                <th>
                                    Date and Time
                                </th>

                                <th>Cashier</th>
                                <th>Items</th>
                                <th>Payment</th>
                                <th>Discount</th>
                                <th>Total</th>

                                {isAdmin && (
                                    <th>
                                        Net Profit
                                    </th>
                                )}

                                <th className="sales-actions-column">
                                    Action
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={
                                            isAdmin
                                                ? 9
                                                : 8
                                        }
                                        className="table-state"
                                    >
                                        <div className="small-spinner" />

                                        <span>
                                            Loading sales history...
                                        </span>
                                    </td>
                                </tr>
                            ) : sales.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={
                                            isAdmin
                                                ? 9
                                                : 8
                                        }
                                        className="table-state"
                                    >
                                        <div className="empty-state-icon">
                                            S
                                        </div>

                                        <strong>
                                            {hasFilters
                                                ? 'No matching sales found'
                                                : 'No sales completed'}
                                        </strong>

                                        <span>
                                            {hasFilters
                                                ? 'Change or clear the current filters.'
                                                : 'Completed POS sales will appear here.'}
                                        </span>
                                    </td>
                                </tr>
                            ) : (
                                sales.map(
                                    (sale) => (
                                        <tr key={sale.id}>
                                            <td>
                                                <div className="sales-number-cell">
                                                    <strong>
                                                        {
                                                            sale
                                                                .sale_number
                                                        }
                                                    </strong>

                                                    <span>
                                                        Walk-in Customer
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="sales-date-value">
                                                    {formatDateTime(
                                                        sale
                                                            .sale_date,
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="sales-cashier-cell">
                                                    <div>
                                                        {sale
                                                            .created_by
                                                            .name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>

                                                    <span>
                                                        {
                                                            sale
                                                                .created_by
                                                                .name
                                                        }
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="sales-items-cell">
                                                    <strong>
                                                        {
                                                            sale
                                                                .items_count
                                                        }{' '}
                                                        {sale
                                                            .items_count
                                                            === 1
                                                            ? 'item'
                                                            : 'items'}
                                                    </strong>

                                                    <span>
                                                        {
                                                            sale
                                                                .total_quantity
                                                        }{' '}
                                                        total quantity
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="sales-payment-badge">
                                                    {paymentName(
                                                        sale
                                                            .payment_method,
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="sales-discount-value">
                                                    {currencyFormatter
                                                        .format(
                                                            sale
                                                                .item_discount_total
                                                            + sale
                                                                .discount,
                                                        )}
                                                </span>
                                            </td>

                                            <td>
                                                <strong className="sales-total-value">
                                                    {currencyFormatter
                                                        .format(
                                                            sale
                                                                .grand_total,
                                                        )}
                                                </strong>
                                            </td>

                                            {isAdmin && (
                                                <td>
                                                    <strong
                                                        className={
                                                            (
                                                                sale
                                                                    .net_profit
                                                                ?? 0
                                                            ) >= 0
                                                                ? 'sales-profit-positive'
                                                                : 'sales-profit-negative'
                                                        }
                                                    >
                                                        {currencyFormatter
                                                            .format(
                                                                sale
                                                                    .net_profit
                                                                ?? 0,
                                                            )}
                                                    </strong>
                                                </td>
                                            )}

                                            <td>
                                                <div className="table-actions">
                                                    <button
                                                        type="button"
                                                        className="view-sale-button"
                                                        onClick={() => {
                                                            openSaleDetails(
                                                                sale.id,
                                                            );
                                                        }}
                                                    >
                                                        View Details
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="sales-return-button"
                                                        onClick={() => {
                                                            void openReturnModal(
                                                                sale.id,
                                                            );
                                                        }}
                                                    >
                                                        Return
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ),
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                {!isLoading
                    && totalResults > 0 && (
                        <footer className="category-pagination">
                            <p>
                                Showing{' '}
                                <strong>
                                    {resultFrom}
                                </strong>
                                {' '}to{' '}
                                <strong>
                                    {resultTo}
                                </strong>
                                {' '}of{' '}
                                <strong>
                                    {totalResults}
                                </strong>
                                {' '}sales
                            </p>

                            <div>
                                <button
                                    type="button"
                                    className="pagination-button"
                                    disabled={
                                        currentPage
                                        <= 1
                                    }
                                    onClick={() => {
                                        setPage(
                                            (current) =>
                                                Math.max(
                                                    1,
                                                    current
                                                    - 1,
                                                ),
                                        );
                                    }}
                                >
                                    Previous
                                </button>

                                <span>
                                    Page{' '}
                                    <strong>
                                        {currentPage}
                                    </strong>
                                    {' '}of{' '}
                                    <strong>
                                        {lastPage}
                                    </strong>
                                </span>

                                <button
                                    type="button"
                                    className="pagination-button"
                                    disabled={
                                        currentPage
                                        >= lastPage
                                    }
                                    onClick={() => {
                                        setPage(
                                            (current) =>
                                                Math.min(
                                                    lastPage,
                                                    current
                                                    + 1,
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

            <SaleDetailsModal
                saleId={selectedSaleId}
                sale={selectedSale}
                isLoading={isLoadingSale}
                errorMessage={
                    saleDetailsError
                }
                onClose={
                    closeSaleDetails
                }
                onRetry={() => {
                    if (
                        selectedSaleId
                        !== null
                    ) {
                        void loadSelectedSale(
                            selectedSaleId,
                        );
                    }
                }}
            />

            <CreateSalesReturnModal
                saleId={returnSaleId}
                options={returnOptions}
                isLoading={
                    isLoadingReturn
                }
                isSubmitting={
                    isSubmittingReturn
                }
                errorMessage={
                    returnError
                }
                onClose={
                    closeReturnModal
                }
                onSubmit={(values) => {
                    void submitReturn(
                        values,
                    );
                }}
            />
        </div>
    );
}