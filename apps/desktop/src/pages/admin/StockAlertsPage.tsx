import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import StockSettingsModal
    from '../../components/inventory/StockSettingsModal';

import {
    ApiError,
} from '../../lib/api';

import {
    getInventoryAlerts,
    updateProductStockSettings,
} from '../../services/inventoryAlertService';

import type {
    InventoryAlertProduct,
    InventoryAlertSummary,
    ProductStockSettingInput,
} from '../../types/inventoryAlert';

import type {
    PosPaginationMeta,
} from '../../types/sale';

const emptySummary:
    InventoryAlertSummary = {
    total_products: 0,
    low_stock_products: 0,
    out_of_stock_products: 0,
    products_with_expired_batches: 0,
    products_expiring_7_days: 0,
    products_expiring_30_days: 0,
    products_expiring_60_days: 0,
    safe_products: 0,
};

const emptyPagination:
    PosPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: null,
    to: null,
};

function formatDate(
    value: string | null,
): string {
    if (!value) {
        return 'No expiry';
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

function alertName(
    status: string,
): string {
    switch (status) {
        case 'out_of_stock':
            return 'Out of Stock';

        case 'low_stock':
            return 'Low Stock';

        case 'expired':
            return 'Expired Stock';

        case 'expiring_7':
            return 'Expires in 7 Days';

        case 'expiring_30':
            return 'Expires in 30 Days';

        case 'expiring_60':
            return 'Expires in 60 Days';

        default:
            return 'Safe';
    }
}

export default function StockAlertsPage() {
    const {
        token,
    } = useAuth();

    const [
        products,
        setProducts,
    ] = useState<
        InventoryAlertProduct[]
    >([]);

    const [
        summary,
        setSummary,
    ] = useState(
        emptySummary,
    );

    const [
        pagination,
        setPagination,
    ] = useState(
        emptyPagination,
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
        alertStatus,
        setAlertStatus,
    ] = useState('all');

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        selectedProduct,
        setSelectedProduct,
    ] = useState<
        InventoryAlertProduct | null
    >(null);

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        modalError,
        setModalError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const loadAlerts =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getInventoryAlerts(
                            token,
                            {
                                search,
                                alertStatus,
                                page,
                                perPage: 20,
                            },
                        );

                    setProducts(
                        response.data,
                    );

                    setSummary(
                        response.summary,
                    );

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load stock alerts.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [
                token,
                search,
                alertStatus,
                page,
            ],
        );

    useEffect(() => {
        void loadAlerts();
    }, [loadAlerts]);

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

    const saveSettings =
        async (
            values:
                ProductStockSettingInput,
        ): Promise<void> => {
            if (
                !token
                || !selectedProduct
            ) {
                return;
            }

            setIsSubmitting(true);
            setModalError('');

            try {
                const response =
                    await updateProductStockSettings(
                        token,
                        selectedProduct.id,
                        values,
                    );

                setSuccessMessage(
                    response.message,
                );

                setSelectedProduct(null);

                await loadAlerts();
            } catch (error) {
                setModalError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to update stock settings.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    return (
        <div className="page-stack">
            <section className="stock-alert-page-header">
                <div>
                    <span className="page-kicker">
                        Inventory monitoring
                    </span>

                    <h2>
                        Low-Stock and Expiry
                    </h2>

                    <p>
                        Review reorder requirements,
                        expired batches and upcoming
                        product expiries.
                    </p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    disabled={isLoading}
                    onClick={() => {
                        void loadAlerts();
                    }}
                >
                    Refresh
                </button>
            </section>

            <section className="stock-alert-summary-grid">
                <article>
                    <span>Low Stock</span>
                    <strong>
                        {summary
                            .low_stock_products}
                    </strong>
                </article>

                <article>
                    <span>Out of Stock</span>
                    <strong>
                        {summary
                            .out_of_stock_products}
                    </strong>
                </article>

                <article>
                    <span>Expired Stock</span>
                    <strong>
                        {summary
                            .products_with_expired_batches}
                    </strong>
                </article>

                <article>
                    <span>
                        Expires in 7 Days
                    </span>
                    <strong>
                        {summary
                            .products_expiring_7_days}
                    </strong>
                </article>

                <article>
                    <span>
                        Expires in 30 Days
                    </span>
                    <strong>
                        {summary
                            .products_expiring_30_days}
                    </strong>
                </article>
            </section>

            {successMessage && (
                <div className="success-alert">
                    {successMessage}
                </div>
            )}

            {pageError && (
                <div className="form-alert">
                    {pageError}
                </div>
            )}

            <section className="content-card">
                <div className="stock-alert-toolbar">
                    <input
                        type="search"
                        value={searchInput}
                        placeholder="Search product, SKU, barcode or category..."
                        onChange={(event) => {
                            setSearchInput(
                                event.target.value,
                            );
                        }}
                    />

                    <select
                        value={alertStatus}
                        onChange={(event) => {
                            setAlertStatus(
                                event.target.value,
                            );

                            setPage(1);
                        }}
                    >
                        <option value="all">
                            All Products
                        </option>

                        <option value="low_stock">
                            Low Stock
                        </option>

                        <option value="out_of_stock">
                            Out of Stock
                        </option>

                        <option value="expired">
                            Expired
                        </option>

                        <option value="expiring_7">
                            Expires in 7 Days
                        </option>

                        <option value="expiring_30">
                            Expires in 30 Days
                        </option>

                        <option value="expiring_60">
                            Expires in 60 Days
                        </option>

                        <option value="safe">
                            Safe Stock
                        </option>
                    </select>
                </div>

                <div className="stock-alert-table-container">
                    <table className="stock-alert-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Available</th>
                                <th>Minimum</th>
                                <th>Suggested Reorder</th>
                                <th>Nearest Expiry</th>
                                <th>Batch Alerts</th>
                                <th>Status</th>
                                <th>Settings</th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="table-state"
                                    >
                                        Loading stock alerts...
                                    </td>
                                </tr>
                            ) : products.length
                                === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="table-state"
                                    >
                                        No matching products.
                                    </td>
                                </tr>
                            ) : (
                                products.map(
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

                                                <small>
                                                    {
                                                        product
                                                            .category
                                                            .name
                                                    }
                                                    {' · '}
                                                    {product.sku
                                                        || product
                                                            .barcode
                                                        || 'No code'}
                                                </small>
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        product
                                                            .total_available_quantity
                                                    }{' '}
                                                    {product.unit}
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    product
                                                        .minimum_stock_level
                                                }{' '}
                                                {product.unit}
                                            </td>

                                            <td>
                                                <strong className="stock-reorder-value">
                                                    {
                                                        product
                                                            .suggested_reorder_quantity
                                                    }{' '}
                                                    {product.unit}
                                                </strong>
                                            </td>

                                            <td>
                                                {formatDate(
                                                    product
                                                        .nearest_expiry,
                                                )}
                                            </td>

                                            <td>
                                                <div className="stock-batch-alerts">
                                                    {product
                                                        .expired_batch_count
                                                        > 0 && (
                                                            <span className="expired-stock-badge">
                                                                {
                                                                    product
                                                                        .expired_batch_count
                                                                }{' '}
                                                                expired
                                                            </span>
                                                        )}

                                                    {product
                                                        .expiring_7_count
                                                        > 0 && (
                                                            <span className="urgent-expiry-badge">
                                                                {
                                                                    product
                                                                        .expiring_7_count
                                                                }{' '}
                                                                urgent
                                                            </span>
                                                        )}

                                                    {product
                                                        .expiring_30_count
                                                        > 0 && (
                                                            <span className="expiry-warning-badge">
                                                                {
                                                                    product
                                                                        .expiring_30_count
                                                                }{' '}
                                                                within 30 days
                                                            </span>
                                                        )}
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`inventory-alert-badge inventory-alert-${product.alert_status}`}
                                                >
                                                    {alertName(
                                                        product
                                                            .alert_status,
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="view-sale-button"
                                                    onClick={() => {
                                                        setModalError(
                                                            '',
                                                        );

                                                        setSelectedProduct(
                                                            product,
                                                        );
                                                    }}
                                                >
                                                    Edit Settings
                                                </button>
                                            </td>
                                        </tr>
                                    ),
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination.total > 0 && (
                    <footer className="category-pagination">
                        <span>
                            Page{' '}
                            {pagination.current_page}
                            {' '}of{' '}
                            {pagination.last_page}
                        </span>

                        <div>
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

                            <button
                                type="button"
                                className="pagination-button"
                                disabled={
                                    page
                                    >= pagination.last_page
                                }
                                onClick={() => {
                                    setPage(
                                        (current) =>
                                            Math.min(
                                                pagination
                                                    .last_page,

                                                current + 1,
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

            <StockSettingsModal
                product={selectedProduct}
                isSubmitting={isSubmitting}
                errorMessage={modalError}
                onClose={() => {
                    if (!isSubmitting) {
                        setSelectedProduct(
                            null,
                        );

                        setModalError('');
                    }
                }}
                onSubmit={(values) => {
                    void saveSettings(
                        values,
                    );
                }}
            />
        </div>
    );
}