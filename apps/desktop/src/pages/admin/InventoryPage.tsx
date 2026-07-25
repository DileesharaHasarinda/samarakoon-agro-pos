import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    getStockProducts,
} from '../../services/stockService';

import type {
    StockProduct,
    StockPaginationMeta,
} from '../../types/stock';

const currencyFormatter =
    new Intl.NumberFormat(
        'en-LK',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        },
    );

const initialPagination:
    StockPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null,
};

export default function InventoryPage() {
    const {
        token,
    } = useAuth();

    const [
        products,
        setProducts,
    ] = useState<StockProduct[]>([]);

    const [
        expandedProductId,
        setExpandedProductId,
    ] = useState<number | null>(
        null,
    );

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        appliedSearch,
        setAppliedSearch,
    ] = useState('');

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        pagination,
        setPagination,
    ] = useState(initialPagination);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const loadStock =
        useCallback(async (): Promise<void> => {
            if (!token) {
                return;
            }

            setIsLoading(true);

            try {
                const response =
                    await getStockProducts(
                        token,
                        {
                            page,
                            perPage: 10,
                            search:
                                appliedSearch,
                        },
                    );

                setProducts(response.data);
                setPagination(response.meta);
            } catch (error) {
                setErrorMessage(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to load inventory.',
                );
            } finally {
                setIsLoading(false);
            }
        }, [
            token,
            page,
            appliedSearch,
        ]);

    useEffect(() => {
        void loadStock();
    }, [loadStock]);

    useEffect(() => {
        const timeout =
            window.setTimeout(() => {
                setPage(1);
                setAppliedSearch(
                    search.trim(),
                );
            }, 350);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [search]);

    return (
        <div className="page-stack">
            <section className="inventory-page-header">
                <div>
                    <span className="page-kicker">
                        Stock availability
                    </span>

                    <h2>Inventory</h2>

                    <p>
                        Each product appears once.
                        Select it to view available
                        quantities at each price.
                    </p>
                </div>
            </section>

            {errorMessage && (
                <div className="form-alert">
                    {errorMessage}
                </div>
            )}

            <section className="content-card">
                <div className="inventory-toolbar">
                    <input
                        type="search"
                        value={search}
                        placeholder="Search product..."
                        onChange={(event) => {
                            setSearch(
                                event.target.value,
                            );
                        }}
                    />
                </div>

                <div className="inventory-product-list">
                    {isLoading ? (
                        <div className="table-state">
                            Loading inventory...
                        </div>
                    ) : products.length === 0 ? (
                        <div className="table-state">
                            No received stock found.
                        </div>
                    ) : (
                        products.map(
                            (product) => {
                                const isExpanded =
                                    expandedProductId
                                    === product.id;

                                return (
                                    <article
                                        className="inventory-product-card"
                                        key={product.id}
                                    >
                                        <button
                                            type="button"
                                            className="inventory-product-summary"
                                            onClick={() => {
                                                setExpandedProductId(
                                                    isExpanded
                                                        ? null
                                                        : product.id,
                                                );
                                            }}
                                        >
                                            <div>
                                                <strong>
                                                    {product.name}
                                                </strong>

                                                <span>
                                                    {
                                                        product
                                                            .category
                                                            .name
                                                    }
                                                    {' · '}
                                                    {product.unit}
                                                </span>
                                            </div>

                                            <div>
                                                <span>
                                                    Total Available
                                                </span>

                                                <strong>
                                                    {
                                                        product
                                                            .total_available_quantity
                                                    }
                                                </strong>
                                            </div>

                                            <span>
                                                {isExpanded
                                                    ? 'Hide Prices'
                                                    : 'View Prices'}
                                            </span>
                                        </button>

                                        {isExpanded && (
                                            <div className="inventory-price-options">
                                                {product
                                                    .price_options
                                                    .map(
                                                        (priceOption) => (
                                                            <article
                                                                key={
                                                                    priceOption
                                                                        .selling_price
                                                                }
                                                            >
                                                                <div>
                                                                    <span>
                                                                        Selling Price
                                                                    </span>

                                                                    <strong>
                                                                        {currencyFormatter
                                                                            .format(
                                                                                priceOption
                                                                                    .selling_price,
                                                                            )}
                                                                    </strong>
                                                                </div>

                                                                <div>
                                                                    <span>
                                                                        Available
                                                                    </span>

                                                                    <strong>
                                                                        {
                                                                            priceOption
                                                                                .available_quantity
                                                                        }
                                                                    </strong>
                                                                </div>

                                                                <div className="inventory-batch-list">
                                                                    {priceOption
                                                                        .batches
                                                                        .map(
                                                                            (batch) => (
                                                                                <span
                                                                                    key={
                                                                                        batch.id
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        batch
                                                                                            .batch_number
                                                                                        ?? batch
                                                                                            .batch_code
                                                                                    }
                                                                                    {' · '}
                                                                                    {
                                                                                        batch
                                                                                            .available_quantity
                                                                                    }
                                                                                    {' available'}
                                                                                    {' · '}
                                                                                    {
                                                                                        batch
                                                                                            .expiry_date
                                                                                        ?? 'No expiry'
                                                                                    }
                                                                                </span>
                                                                            ),
                                                                        )}
                                                                </div>
                                                            </article>
                                                        ),
                                                    )}
                                            </div>
                                        )}
                                    </article>
                                );
                            },
                        )
                    )}
                </div>

                {pagination.total > 0 && (
                    <footer className="category-pagination">
                        <p>
                            Showing {pagination.from}
                            {' '}to {pagination.to}
                            {' '}of {pagination.total}
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
                                {pagination.last_page}
                            </span>

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
        </div>
    );
}