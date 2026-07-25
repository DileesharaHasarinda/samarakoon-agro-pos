import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import BatchSelectionModal
    from '../../components/pos/BatchSelectionModal';

import PaymentModal
    from '../../components/pos/PaymentModal';

import SaleReceiptModal
    from '../../components/pos/SaleReceiptModal';

import {
    ApiError,
} from '../../lib/api';

import {
    completePosSale,
    getPosCategories,
    getPosProducts,
} from '../../services/posService';

import type {
    CompleteSaleValues,
    PosCartItem,
    PosCategory,
    PosPaginationMeta,
    PosProduct,
    PosStockBatch,
    SaleReceipt,
} from '../../types/sale';

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
    PosPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 24,
    total: 0,
    from: null,
    to: null,
};

function formatPriceRange(
    product: PosProduct,
): string {
    if (
        product.minimum_price === null
        || product.maximum_price === null
    ) {
        return 'No price';
    }

    if (
        product.minimum_price
        === product.maximum_price
    ) {
        return currencyFormatter.format(
            product.minimum_price,
        );
    }

    return `${currencyFormatter.format(
        product.minimum_price,
    )
        } – ${currencyFormatter.format(
            product.maximum_price,
        )
        }`;
}

export default function PosPage() {
    const {
        token,
    } = useAuth();

    const [
        products,
        setProducts,
    ] = useState<PosProduct[]>([]);

    const [
        categories,
        setCategories,
    ] = useState<PosCategory[]>([]);

    const [
        cart,
        setCart,
    ] = useState<PosCartItem[]>([]);

    const [
        selectedProduct,
        setSelectedProduct,
    ] = useState<PosProduct | null>(
        null,
    );

    const [
        pagination,
        setPagination,
    ] = useState<PosPaginationMeta>(
        initialPagination,
    );

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        searchInput,
        setSearchInput,
    ] = useState('');

    const [
        appliedSearch,
        setAppliedSearch,
    ] = useState('');

    const [
        categoryFilter,
        setCategoryFilter,
    ] = useState('');

    const [
        saleDiscount,
        setSaleDiscount,
    ] = useState('0');

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        cartError,
        setCartError,
    ] = useState('');

    const [
        isPaymentOpen,
        setIsPaymentOpen,
    ] = useState(false);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        paymentError,
        setPaymentError,
    ] = useState('');

    const [
        receipt,
        setReceipt,
    ] = useState<SaleReceipt | null>(
        null,
    );

    const loadCategories =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                try {
                    const response =
                        await getPosCategories(
                            token,
                        );

                    setCategories(
                        response.data,
                    );
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load POS categories.',
                    );
                }
            },
            [token],
        );

    const loadProducts =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getPosProducts(
                            token,
                            {
                                page,
                                perPage: 24,

                                search:
                                    appliedSearch,

                                categoryId:
                                    categoryFilter,
                            },
                        );

                    setProducts(response.data);

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load POS products.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [
                token,
                page,
                appliedSearch,
                categoryFilter,
            ],
        );

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        void loadProducts();
    }, [loadProducts]);

    useEffect(() => {
        const timeout =
            window.setTimeout(() => {
                setPage(1);

                setAppliedSearch(
                    searchInput.trim(),
                );
            }, 250);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [searchInput]);

    const subtotal =
        useMemo(
            () =>
                cart.reduce(
                    (
                        total,
                        item,
                    ) =>
                        total
                        + (
                            item.quantity
                            * item.selling_price
                        )
                        - item.discount,
                    0,
                ),
            [cart],
        );

    const discount =
        Number(
            saleDiscount || 0,
        );

    const grandTotal =
        Math.max(
            0,
            subtotal - discount,
        );

    const addBatchToCart = (
        product: PosProduct,
        batch: PosStockBatch,
        quantity: number,
    ): void => {
        setCartError('');

        const existingItem =
            cart.find(
                (item) =>
                    item.stock_batch_id
                    === batch.id,
            );

        const newQuantity =
            (existingItem?.quantity ?? 0)
            + quantity;

        if (
            newQuantity
            > batch.available_quantity
        ) {
            setCartError(
                `Only ${batch.available_quantity} ${product.unit} are available at ${currencyFormatter.format(batch.selling_price)}.`,
            );

            return;
        }

        setCart(
            (current) => {
                const existing =
                    current.find(
                        (item) =>
                            item.stock_batch_id
                            === batch.id,
                    );

                if (existing) {
                    return current.map(
                        (item) =>
                            item.stock_batch_id
                                === batch.id
                                ? {
                                    ...item,
                                    quantity:
                                        item.quantity
                                        + quantity,
                                }
                                : item,
                    );
                }

                return [
                    ...current,
                    {
                        stock_batch_id:
                            batch.id,

                        product_id:
                            product.id,

                        product_name:
                            product.name,

                        unit:
                            product.unit,

                        batch_code:
                            batch.batch_code,

                        batch_number:
                            batch.batch_number,

                        expiry_date:
                            batch.expiry_date,

                        available_quantity:
                            batch
                                .available_quantity,

                        selling_price:
                            batch.selling_price,

                        quantity,

                        discount: 0,
                    },
                ];
            },
        );

        setSelectedProduct(null);
    };

    const updateCartQuantity = (
        batchId: number,
        quantity: number,
    ): void => {
        const item =
            cart.find(
                (cartItem) =>
                    cartItem.stock_batch_id
                    === batchId,
            );

        if (!item) {
            return;
        }

        if (
            !Number.isFinite(quantity)
            || quantity <= 0
        ) {
            setCartError(
                'Quantity must be greater than zero.',
            );

            return;
        }

        if (
            quantity
            > item.available_quantity
        ) {
            setCartError(
                `Only ${item.available_quantity} ${item.unit} are available at this price.`,
            );

            return;
        }

        setCartError('');

        setCart(
            (current) =>
                current.map(
                    (cartItem) =>
                        cartItem.stock_batch_id
                            === batchId
                            ? {
                                ...cartItem,
                                quantity,
                            }
                            : cartItem,
                ),
        );
    };

    const removeCartItem = (
        batchId: number,
    ): void => {
        setCart(
            (current) =>
                current.filter(
                    (item) =>
                        item.stock_batch_id
                        !== batchId,
                ),
        );

        setCartError('');
    };

    const openPayment = (): void => {
        if (cart.length === 0) {
            setCartError(
                'Add at least one product to the cart.',
            );

            return;
        }

        if (
            !Number.isFinite(discount)
            || discount < 0
        ) {
            setCartError(
                'Enter a valid sale discount.',
            );

            return;
        }

        if (discount > subtotal) {
            setCartError(
                'The sale discount cannot exceed the cart subtotal.',
            );

            return;
        }

        setCartError('');
        setPaymentError('');
        setIsPaymentOpen(true);
    };

    const submitSale =
        async (
            values: CompleteSaleValues,
        ): Promise<void> => {
            if (
                !token
                || isSubmitting
            ) {
                return;
            }

            setIsSubmitting(true);
            setPaymentError('');

            try {
                const response =
                    await completePosSale(
                        token,
                        cart,
                        {
                            ...values,
                            discount,
                        },
                    );

                setReceipt(
                    response.data,
                );

                setCart([]);
                setSaleDiscount('0');

                setIsPaymentOpen(false);

                await Promise.all([
                    loadProducts(),
                    loadCategories(),
                ]);
            } catch (error) {
                if (error instanceof ApiError) {
                    setPaymentError(
                        error.message,
                    );
                } else {
                    setPaymentError(
                        'Unable to complete the sale.',
                    );
                }
            } finally {
                setIsSubmitting(false);
            }
        };

    return (
        <div className="pos-page">
            <section className="pos-products-panel">
                <header className="pos-page-header">
                    <div>
                        <span className="page-kicker">
                            Batch-based selling
                        </span>

                        <h2>New Sale</h2>

                        <p>
                            Select a product and choose
                            its available price batch.
                        </p>
                    </div>

                    <div className="pos-walk-in-customer">
                        <span>Customer</span>

                        <strong>
                            Walk-in Customer
                        </strong>
                    </div>
                </header>

                {pageError && (
                    <div
                        className="form-alert"
                        role="alert"
                    >
                        {pageError}
                    </div>
                )}

                <div className="pos-search-row">
                    <div className="pos-search-field">
                        <span aria-hidden="true">
                            ⌕
                        </span>

                        <input
                            type="search"
                            value={searchInput}
                            autoFocus
                            placeholder="Search name, SKU or scan barcode..."
                            onChange={(event) => {
                                setSearchInput(
                                    event.target.value,
                                );
                            }}
                        />

                        {searchInput && (
                            <button
                                type="button"
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

                    <select
                        value={categoryFilter}
                        onChange={(event) => {
                            setPage(1);

                            setCategoryFilter(
                                event.target.value,
                            );
                        }}
                    >
                        <option value="">
                            All Categories
                        </option>

                        {categories.map(
                            (category) => (
                                <option
                                    key={category.id}
                                    value={category.id}
                                >
                                    {category.name}
                                </option>
                            ),
                        )}
                    </select>
                </div>

                <div className="pos-product-grid">
                    {isLoading ? (
                        <div className="pos-product-state">
                            <div className="small-spinner" />

                            <span>
                                Loading available stock...
                            </span>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="pos-product-state">
                            <strong>
                                No available products
                            </strong>

                            <span>
                                Receive stock before
                                selling this product.
                            </span>
                        </div>
                    ) : (
                        products.map(
                            (product) => (
                                <button
                                    type="button"
                                    className="pos-product-card"
                                    key={product.id}
                                    onClick={() => {
                                        setSelectedProduct(
                                            product,
                                        );
                                    }}
                                >
                                    <div className="pos-product-initial">
                                        {product.name
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div className="pos-product-details">
                                        <span className="pos-product-category">
                                            {
                                                product
                                                    .category
                                                    .name
                                            }
                                        </span>

                                        <strong>
                                            {product.name}
                                        </strong>

                                        <small>
                                            {product.sku
                                                || product.barcode
                                                || 'No product code'}
                                        </small>
                                    </div>

                                    <div className="pos-product-price">
                                        <span>
                                            Available Prices
                                        </span>

                                        <strong>
                                            {formatPriceRange(
                                                product,
                                            )}
                                        </strong>
                                    </div>

                                    <div className="pos-product-stock">
                                        <span>
                                            Total Stock
                                        </span>

                                        <strong>
                                            {
                                                product
                                                    .total_available_quantity
                                            }{' '}
                                            {product.unit}
                                        </strong>
                                    </div>
                                </button>
                            ),
                        )
                    )}
                </div>

                {pagination.total > 0 && (
                    <footer className="pos-product-pagination">
                        <span>
                            Page{' '}
                            {pagination.current_page}
                            {' '}of{' '}
                            {pagination.last_page}
                        </span>

                        <div>
                            <button
                                type="button"
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

                            <button
                                type="button"
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

            <aside className="pos-cart-panel">
                <header className="pos-cart-header">
                    <div>
                        <span className="page-kicker">
                            Current sale
                        </span>

                        <h2>Cart</h2>
                    </div>

                    <span className="pos-cart-count">
                        {cart.length}{' '}
                        {cart.length === 1
                            ? 'item'
                            : 'items'}
                    </span>
                </header>

                {cartError && (
                    <div
                        className="form-alert pos-cart-error"
                        role="alert"
                    >
                        {cartError}
                    </div>
                )}

                <div className="pos-cart-items">
                    {cart.length === 0 ? (
                        <div className="pos-empty-cart">
                            <div>C</div>

                            <strong>
                                Cart is empty
                            </strong>

                            <span>
                                Select a product and
                                choose a price batch.
                            </span>
                        </div>
                    ) : (
                        cart.map(
                            (item) => (
                                <article
                                    className="pos-cart-item"
                                    key={
                                        item.stock_batch_id
                                    }
                                >
                                    <header>
                                        <div>
                                            <strong>
                                                {item.product_name}
                                            </strong>

                                            <span>
                                                Batch:{' '}
                                                {item.batch_number
                                                    || item.batch_code}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            aria-label="Remove cart item"
                                            onClick={() => {
                                                removeCartItem(
                                                    item
                                                        .stock_batch_id,
                                                );
                                            }}
                                        >
                                            ×
                                        </button>
                                    </header>

                                    <div className="pos-cart-price-row">
                                        <div>
                                            <span>
                                                Unit Price
                                            </span>

                                            <strong>
                                                {currencyFormatter
                                                    .format(
                                                        item
                                                            .selling_price,
                                                    )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Available</span>

                                            <strong>
                                                {
                                                    item
                                                        .available_quantity
                                                }{' '}
                                                {item.unit}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="pos-cart-quantity-row">
                                        <button
                                            type="button"
                                            disabled={
                                                item.quantity
                                                <= 1
                                            }
                                            onClick={() => {
                                                updateCartQuantity(
                                                    item
                                                        .stock_batch_id,
                                                    item.quantity - 1,
                                                );
                                            }}
                                        >
                                            −
                                        </button>

                                        <input
                                            type="number"
                                            min="0.001"
                                            step="0.001"
                                            value={item.quantity}
                                            onChange={(event) => {
                                                updateCartQuantity(
                                                    item
                                                        .stock_batch_id,
                                                    Number(
                                                        event.target
                                                            .value,
                                                    ),
                                                );
                                            }}
                                        />

                                        <button
                                            type="button"
                                            disabled={
                                                item.quantity
                                                >= item
                                                    .available_quantity
                                            }
                                            onClick={() => {
                                                updateCartQuantity(
                                                    item
                                                        .stock_batch_id,
                                                    item.quantity + 1,
                                                );
                                            }}
                                        >
                                            +
                                        </button>

                                        <strong>
                                            {currencyFormatter
                                                .format(
                                                    item.quantity
                                                    * item
                                                        .selling_price
                                                    - item.discount,
                                                )}
                                        </strong>
                                    </div>
                                </article>
                            ),
                        )
                    )}
                </div>

                <div className="pos-cart-summary">
                    <label>
                        <span>
                            Sale Discount
                        </span>

                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={saleDiscount}
                            onChange={(event) => {
                                setSaleDiscount(
                                    event.target.value,
                                );

                                setCartError('');
                            }}
                        />
                    </label>

                    <div>
                        <span>Subtotal</span>

                        <strong>
                            {currencyFormatter
                                .format(subtotal)}
                        </strong>
                    </div>

                    <div>
                        <span>Discount</span>

                        <strong>
                            -
                            {currencyFormatter
                                .format(
                                    Number(
                                        saleDiscount
                                        || 0,
                                    ),
                                )}
                        </strong>
                    </div>

                    <div className="pos-grand-total">
                        <span>Grand Total</span>

                        <strong>
                            {currencyFormatter
                                .format(
                                    grandTotal,
                                )}
                        </strong>
                    </div>

                    <button
                        type="button"
                        className="pos-complete-sale-button"
                        disabled={
                            cart.length === 0
                        }
                        onClick={openPayment}
                    >
                        Proceed to Payment
                    </button>

                    {cart.length > 0 && (
                        <button
                            type="button"
                            className="pos-clear-cart-button"
                            onClick={() => {
                                setCart([]);
                                setSaleDiscount('0');
                                setCartError('');
                            }}
                        >
                            Clear Cart
                        </button>
                    )}
                </div>
            </aside>

            <BatchSelectionModal
                product={selectedProduct}
                onClose={() => {
                    setSelectedProduct(null);
                }}
                onAdd={
                    addBatchToCart
                }
            />

            <PaymentModal
                isOpen={isPaymentOpen}
                grandTotal={grandTotal}
                isSubmitting={isSubmitting}
                errorMessage={paymentError}
                onClose={() => {
                    if (!isSubmitting) {
                        setIsPaymentOpen(false);
                    }
                }}
                onSubmit={(values) => {
                    void submitSale(values);
                }}
            />

            <SaleReceiptModal
                receipt={receipt}
                onClose={() => {
                    setReceipt(null);
                }}
            />
        </div>
    );
}