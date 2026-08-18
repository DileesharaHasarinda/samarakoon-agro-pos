import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
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
    subscribeToRealtimeStock,
} from '../../lib/realtimeStock';

import type {
    RealtimeStockStatus,
    RealtimeStockUpdatedEvent,
} from '../../lib/realtimeStock';

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
    PosSaleOption,
    PosStockBatch,
    SaleReceipt,
} from '../../types/sale';

const PRODUCT_PAGE_SIZE = 24;

const currencyFormatter =
    new Intl.NumberFormat(
        'en-LK',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

const quantityFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        },
    );

const initialPagination:
    PosPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page:
        PRODUCT_PAGE_SIZE,
    total: 0,
    from: null,
    to: null,
};

function getErrorMessage(
    error: unknown,
    fallback: string,
): string {
    if (
        error instanceof ApiError
        || error instanceof Error
    ) {
        return error.message;
    }

    return fallback;
}

function formatQuantity(
    value:
        | number
        | string
        | null
        | undefined,
): string {
    const parsedValue =
        Number(
            value ?? 0,
        );

    if (
        !Number.isFinite(
            parsedValue,
        )
    ) {
        return '0';
    }

    return quantityFormatter.format(
        parsedValue,
    );
}

function formatExpiryDate(
    value:
        | string
        | null
        | undefined,
): string {
    if (!value) {
        return 'No expiry';
    }

    const date =
        new Date(
            `${value.substring(
                0,
                10,
            )}T00:00:00`,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    ).format(date);
}

function normaliseQuantity(
    value: number,
): number {
    return Number(
        value.toFixed(3),
    );
}

function normaliseUnit(
    value:
        | string
        | null
        | undefined,
): string {
    return String(
        value ?? '',
    )
        .trim()
        .toLowerCase();
}

function isWholeNumber(
    value: number,
): boolean {
    return Math.abs(
        value - Math.round(value),
    ) < 0.0001;
}

function getCartItemKey(
    batchId: number,
    saleUnit: string,
): string {
    return `${batchId}:${normaliseUnit(
        saleUnit,
    )}`;
}

function isSameCartItem(
    item: PosCartItem,
    batchId: number,
    saleUnit: string,
): boolean {
    return (
        item.stock_batch_id
        === batchId
        && normaliseUnit(
            item.sale_unit,
        )
        === normaliseUnit(
            saleUnit,
        )
    );
}

function calculateStockQuantity(
    quantity: number,
    conversionFactor: number,
): number {
    return normaliseQuantity(
        quantity
        * conversionFactor,
    );
}

function getProductStockUnit(
    product: PosProduct,
): string {
    return (
        product.stock_unit
        || product.unit
        || 'Unit'
    );
}

function getProductPriceLabel(
    product: PosProduct,
): string {
    if (
        !product.is_dual_unit
    ) {
        if (
            product.minimum_price
            === null
            || product.maximum_price
            === null
        ) {
            return 'Price unavailable';
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

    const primaryPrices =
        product.batches
            .flatMap(
                (
                    batch,
                ) =>
                    batch.sale_options
                    ?? [],
            )
            .filter(
                (
                    option,
                ) =>
                    option.key
                    === 'primary',
            )
            .map(
                (
                    option,
                ) =>
                    Number(
                        option
                            .selling_price,
                    ),
            )
            .filter(
                (
                    price,
                ) =>
                    Number.isFinite(
                        price,
                    ),
            );

    const secondaryPrices =
        product.batches
            .flatMap(
                (
                    batch,
                ) =>
                    batch.sale_options
                    ?? [],
            )
            .filter(
                (
                    option,
                ) =>
                    option.key
                    === 'secondary',
            )
            .map(
                (
                    option,
                ) =>
                    Number(
                        option
                            .selling_price,
                    ),
            )
            .filter(
                (
                    price,
                ) =>
                    Number.isFinite(
                        price,
                    ),
            );

    const firstPrimary =
        primaryPrices[0];

    const firstSecondary =
        secondaryPrices[0];

    if (
        firstPrimary !== undefined
        && firstSecondary
        !== undefined
    ) {
        return `${currencyFormatter.format(
            firstPrimary,
        )
            } / ${product.primary_unit
            || product.unit
            } • ${currencyFormatter.format(
                firstSecondary,
            )
            } / Kg`;
    }

    return 'Bag + Kg pricing';
}

function getProductAvailableLabel(
    product: PosProduct,
): string {
    const stockUnit =
        getProductStockUnit(
            product,
        );

    if (
        !product.is_dual_unit
    ) {
        return `${formatQuantity(
            product
                .total_available_quantity,
        )
            } ${stockUnit}`;
    }

    const totalFullBags =
        product.batches.reduce(
            (
                total,
                batch,
            ) =>
                total
                + Number(
                    batch
                        .available_primary_quantity
                    ?? 0,
                ),
            0,
        );

    return `${formatQuantity(
        product
            .total_available_quantity,
    )
        } ${stockUnit} • ${formatQuantity(
            totalFullBags,
        )
        } ${product.primary_unit
        || product.unit
        }`;
}

function hasSellableBatch(
    product: PosProduct,
): boolean {
    return product.batches.some(
        (batch) =>
            Number(
                batch.available_quantity
                ?? 0,
            ) > 0
            && (batch.sale_options ?? []).some(
                (option) =>
                    Number(
                        option.available_quantity
                        ?? 0,
                    ) > 0,
            ),
    );
}

function getVisibleProducts(
    products: PosProduct[],
): PosProduct[] {
    return products.filter(
        (product) =>
            Number(
                product.total_available_quantity
                ?? 0,
            ) > 0
            && hasSellableBatch(
                product,
            ),
    );
}

function isFullPrimaryUnit(
    item: PosCartItem,
): boolean {
    return (
        item.is_dual_unit
        && normaliseUnit(
            item.sale_unit,
        )
        === normaliseUnit(
            item.primary_unit,
        )
    );
}

function getCartQuantityStep(
    item: PosCartItem,
): number {
    return isFullPrimaryUnit(
        item,
    )
        ? 1
        : 0.001;
}

function getCartMinimumQuantity(
    item: PosCartItem,
): number {
    return isFullPrimaryUnit(
        item,
    )
        ? 1
        : 0.001;
}

function getBatchStockUsedByCart(
    cart: PosCartItem[],
    batchId: number,
    excludedKey?: string,
): number {
    return normaliseQuantity(
        cart.reduce(
            (
                total,
                item,
            ) => {
                if (
                    item.stock_batch_id
                    !== batchId
                ) {
                    return total;
                }

                const itemKey =
                    getCartItemKey(
                        item
                            .stock_batch_id,
                        item.sale_unit,
                    );

                if (
                    excludedKey
                    && itemKey
                    === excludedKey
                ) {
                    return total;
                }

                return (
                    total
                    + Number(
                        item.stock_quantity
                        ?? 0,
                    )
                );
            },
            0,
        ),
    );
}

function getRealtimeStatusLabel(
    status: RealtimeStockStatus,
): string {
    switch (status) {
        case 'connected':
            return 'Live Stock Connected';

        case 'connecting':
            return 'Connecting Live Stock';

        case 'error':
            return 'Live Stock Error';

        case 'disconnected':
        default:
            return 'Live Stock Disconnected';
    }
}

function getCombinedCartStockError(
    cart: PosCartItem[],
): string | null {
    const batchIds =
        Array.from(
            new Set(
                cart.map(
                    (
                        item,
                    ) =>
                        item
                            .stock_batch_id,
                ),
            ),
        );

    for (
        const batchId
        of batchIds
    ) {
        const batchItems =
            cart.filter(
                (
                    item,
                ) =>
                    item
                        .stock_batch_id
                    === batchId,
            );

        if (
            batchItems.length
            === 0
        ) {
            continue;
        }

        const availableStock =
            Number(
                batchItems[0]
                    .available_stock_quantity
                ?? 0,
            );

        const requiredStock =
            normaliseQuantity(
                batchItems.reduce(
                    (
                        total,
                        item,
                    ) =>
                        total
                        + Number(
                            item
                                .stock_quantity
                            ?? 0,
                        ),
                    0,
                ),
            );

        if (
            requiredStock
            > availableStock
            + 0.0001
        ) {
            return `${batchItems[0]
                .product_name
                } requires ${formatQuantity(
                    requiredStock,
                )
                } ${batchItems[0]
                    .stock_unit
                }, but only ${formatQuantity(
                    availableStock,
                )
                } ${batchItems[0]
                    .stock_unit
                } are available. Another cashier may have sold stock from this batch.`;
        }
    }

    return null;
}

function applyRealtimeStockEventToCart(
    cart: PosCartItem[],
    event: RealtimeStockUpdatedEvent,
): PosCartItem[] {
    const updatesByBatchId =
        new Map(
            event.batches.map(
                (
                    batch,
                ) => [
                    batch.id,
                    batch,
                ] as const,
            ),
        );

    return cart.map(
        (
            item,
        ) => {
            const update =
                updatesByBatchId.get(
                    item
                        .stock_batch_id,
                );

            if (!update) {
                return item;
            }

            const availableStockQuantity =
                normaliseQuantity(
                    Math.max(
                        0,
                        Number(
                            update
                                .available_quantity
                            ?? 0,
                        ),
                    ),
                );

            const rawConversionFactor =
                Number(
                    item
                        .conversion_factor
                    ?? 1,
                );

            const conversionFactor =
                Number.isFinite(
                    rawConversionFactor,
                )
                    && rawConversionFactor > 0
                    ? rawConversionFactor
                    : 1;

            const rawAvailableSaleQuantity =
                availableStockQuantity
                / conversionFactor;

            const availableSaleQuantity =
                isFullPrimaryUnit(
                    item,
                )
                    ? Math.max(
                        0,
                        Math.floor(
                            rawAvailableSaleQuantity
                            + 0.0001,
                        ),
                    )
                    : normaliseQuantity(
                        Math.max(
                            0,
                            rawAvailableSaleQuantity,
                        ),
                    );

            let nextSellingPrice =
                item.selling_price;

            const saleUnit =
                normaliseUnit(
                    item.sale_unit,
                );

            const primaryUnit =
                normaliseUnit(
                    update.primary_unit
                    ?? item.primary_unit,
                );

            const secondaryUnit =
                normaliseUnit(
                    update.secondary_unit
                    ?? update.stock_unit
                    ?? '',
                );

            if (
                update.selling_price
                !== null
                && saleUnit
                === primaryUnit
            ) {
                nextSellingPrice =
                    update.selling_price;
            } else if (
                update.secondary_selling_price
                !== null
                && secondaryUnit !== ''
                && saleUnit
                === secondaryUnit
            ) {
                nextSellingPrice =
                    update.secondary_selling_price;
            }

            return {
                ...item,

                selling_price:
                    nextSellingPrice,

                available_quantity:
                    availableSaleQuantity,

                available_stock_quantity:
                    availableStockQuantity,
            };
        },
    );
}

type IconName =
    | 'alert'
    | 'bag'
    | 'basket'
    | 'box'
    | 'chevron-left'
    | 'chevron-right'
    | 'close'
    | 'filter'
    | 'kg'
    | 'minus'
    | 'plus'
    | 'receipt'
    | 'refresh'
    | 'search'
    | 'trash';

function Icon({
    name,
    className = '',
}: {
    name: IconName;
    className?: string;
}) {
    const props = {
        className,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap:
            'round' as const,
        strokeLinejoin:
            'round' as const,
        'aria-hidden': true,
        focusable: false,
    };

    switch (name) {
        case 'alert':
            return (
                <svg {...props}>
                    <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                </svg>
            );

        case 'bag':
            return (
                <svg {...props}>
                    <path d="M7 4h10l2 5v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Z" />
                    <path d="M7 4c1.5 2 8.5 2 10 0" />
                    <path d="M9 13h6" />
                </svg>
            );

        case 'basket':
            return (
                <svg {...props}>
                    <path d="m6 9 6-6 6 6" />
                    <path d="M3 9h18l-2 11H5Z" />
                    <path d="M9 13v3M15 13v3" />
                </svg>
            );

        case 'box':
            return (
                <svg {...props}>
                    <path d="m21 8-9 5-9-5" />
                    <path d="m3 8 9-5 9 5v8l-9 5-9-5Z" />
                    <path d="M12 13v8" />
                </svg>
            );

        case 'chevron-left':
            return (
                <svg {...props}>
                    <path d="m15 18-6-6 6-6" />
                </svg>
            );

        case 'chevron-right':
            return (
                <svg {...props}>
                    <path d="m9 18 6 6-6-6 6-6" />
                </svg>
            );

        case 'close':
            return (
                <svg {...props}>
                    <path d="m6 6 12 12M18 6 6 18" />
                </svg>
            );

        case 'filter':
            return (
                <svg {...props}>
                    <path d="M4 5h16M7 12h10M10 19h4" />
                </svg>
            );

        case 'kg':
            return (
                <svg {...props}>
                    <path d="M6 5h12l2 15H4Z" />
                    <path d="M9 5a3 3 0 0 1 6 0" />
                    <path d="M8.5 14h7" />
                </svg>
            );

        case 'minus':
            return (
                <svg {...props}>
                    <path d="M5 12h14" />
                </svg>
            );

        case 'plus':
            return (
                <svg {...props}>
                    <path d="M12 5v14M5 12h14" />
                </svg>
            );

        case 'receipt':
            return (
                <svg {...props}>
                    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
                    <path d="M9 8h6M9 12h6M9 16h3" />
                </svg>
            );

        case 'refresh':
            return (
                <svg {...props}>
                    <path d="M20 11a8 8 0 1 0 2 5M20 4v7h-7" />
                </svg>
            );

        case 'search':
            return (
                <svg {...props}>
                    <circle
                        cx="11"
                        cy="11"
                        r="7"
                    />

                    <path d="m20 20-4-4" />
                </svg>
            );

        case 'trash':
        default:
            return (
                <svg {...props}>
                    <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6M10 11v5M14 11v5" />
                </svg>
            );
    }
}

const styles = `
#agro-pos,
#agro-pos *,
#agro-pos *::before,
#agro-pos *::after {
    box-sizing: border-box !important;
}

#agro-pos {
    --green-950: #052e16;
    --green-900: #14532d;
    --green-800: #166534;
    --green-700: #15803d;
    --green-100: #dcfce7;
    --green-50: #f0fdf4;

    --blue-700: #175cd3;
    --blue-50: #eff8ff;

    --red: #b42318;
    --red-bg: #fef3f2;

    --amber: #b54708;
    --amber-bg: #fffaeb;

    --text: #101828;
    --text-2: #344054;
    --muted: #667085;

    --border: #d5ded7;
    --border-dark: #b8c5bb;

    --surface: #ffffff;
    --page: #f3f6f4;

    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        minmax(380px, 440px) !important;

    gap: 16px !important;

    width: 100% !important;
    min-width: 0 !important;

    min-height:
        calc(100dvh - 120px) !important;

    color: var(--text) !important;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif !important;

    font-size: 15px !important;
    line-height: 1.5 !important;

    background: transparent !important;

    isolation: isolate !important;
}

#agro-pos button,
#agro-pos input,
#agro-pos select {
    font: inherit !important;

    text-transform: none !important;
    letter-spacing: normal !important;
}

#agro-pos h1,
#agro-pos h2,
#agro-pos p {
    margin: 0 !important;
}

#agro-pos button:focus-visible,
#agro-pos input:focus-visible,
#agro-pos select:focus-visible {
    outline: none !important;

    border-color:
        var(--green-700) !important;

    box-shadow:
        0 0 0 4px
        rgba(
            21,
            128,
            61,
            0.14
        ) !important;
}

#agro-pos .pos-products,
#agro-pos .pos-cart {
    min-width: 0 !important;

    overflow: hidden !important;

    background:
        var(--surface) !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 14px !important;

    box-shadow:
        0 1px 3px
        rgba(
            16,
            24,
            40,
            0.08
        ) !important;
}

#agro-pos .pos-products {
    display: flex !important;

    min-height: 680px !important;

    flex-direction:
        column !important;
}

#agro-pos .pos-header {
    display: flex !important;

    min-height: 96px !important;

    align-items:
        center !important;

    justify-content:
        space-between !important;

    gap: 18px !important;

    padding:
        18px 20px !important;

    background:
        linear-gradient(
            135deg,
            #ffffff,
            #f3fbf5
        ) !important;

    border-bottom:
        1px solid
        var(--border) !important;
}

#agro-pos .eyebrow {
    display: block !important;

    margin-bottom: 3px !important;

    color:
        var(--green-700) !important;

    font-size: 11px !important;

    font-weight: 800 !important;

    letter-spacing:
        0.06em !important;

    text-transform:
        uppercase !important;
}

#agro-pos .page-title {
    font-size: 26px !important;

    font-weight: 800 !important;

    line-height: 1.2 !important;

    letter-spacing:
        -0.02em !important;
}

#agro-pos .subtitle {
    margin-top: 4px !important;

    color:
        var(--muted) !important;

    font-size: 14px !important;
}

#agro-pos .customer-note {
    min-width: 225px !important;

    padding:
        11px 13px !important;

    background: #ffffff !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 10px !important;
}

#agro-pos .customer-note span {
    display: block !important;

    color:
        var(--muted) !important;

    font-size: 10px !important;

    font-weight: 800 !important;

    letter-spacing:
        0.05em !important;

    text-transform:
        uppercase !important;
}

#agro-pos .customer-note strong {
    display: block !important;

    color:
        var(--green-900) !important;

    font-size: 14px !important;

    font-weight: 800 !important;
}

#agro-pos .customer-note small {
    color:
        var(--muted) !important;

    font-size: 12px !important;
}

#agro-pos .realtime-status {
    display: inline-flex !important;

    min-height: 36px !important;

    align-items: center !important;

    gap: 8px !important;

    padding:
        7px 10px !important;

    color:
        var(--text-2) !important;

    font-size: 12px !important;

    font-weight: 800 !important;

    white-space: nowrap !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 999px !important;
}

#agro-pos .realtime-dot {
    display: block !important;

    width: 9px !important;
    height: 9px !important;

    flex:
        0 0 9px !important;

    background: #98a2b3 !important;

    border-radius: 50% !important;
}

#agro-pos .realtime-status.connected {
    color:
        var(--green-900) !important;

    background:
        var(--green-50) !important;

    border-color:
        #b8dfc3 !important;
}

#agro-pos .realtime-status.connected .realtime-dot {
    background:
        var(--green-700) !important;

    box-shadow:
        0 0 0 3px
        rgba(
            21,
            128,
            61,
            0.12
        ) !important;
}

#agro-pos .realtime-status.connecting {
    color:
        var(--amber) !important;

    background:
        var(--amber-bg) !important;

    border-color:
        #f0d48f !important;
}

#agro-pos .realtime-status.connecting .realtime-dot {
    background: #f79009 !important;
}

#agro-pos .realtime-status.disconnected,
#agro-pos .realtime-status.error {
    color:
        var(--red) !important;

    background:
        var(--red-bg) !important;

    border-color:
        #f3b5af !important;
}

#agro-pos .realtime-status.disconnected .realtime-dot,
#agro-pos .realtime-status.error .realtime-dot {
    background: #d92d20 !important;
}

#agro-pos .alert {
    display: flex !important;

    align-items: center !important;

    gap: 9px !important;

    margin:
        12px
        14px
        0 !important;

    padding:
        11px 12px !important;

    color: var(--red) !important;

    font-size: 13px !important;

    font-weight: 700 !important;

    background:
        var(--red-bg) !important;

    border:
        1px solid
        #f3b5af !important;

    border-radius: 9px !important;
}

#agro-pos .alert svg {
    width: 18px !important;
    height: 18px !important;

    flex:
        0 0 18px !important;
}

#agro-pos .alert span {
    min-width: 0 !important;

    flex: 1 !important;
}

#agro-pos .retry {
    display:
        inline-flex !important;

    min-height: 34px !important;

    align-items: center !important;

    gap: 5px !important;

    padding:
        5px 9px !important;

    color: var(--red) !important;

    font-size: 12px !important;

    font-weight: 700 !important;

    background: #ffffff !important;

    border:
        1px solid
        #e8aaa4 !important;

    border-radius: 7px !important;

    cursor: pointer !important;
}

#agro-pos .retry svg {
    width: 14px !important;
    height: 14px !important;
}

#agro-pos .filters {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        minmax(200px, 240px) !important;

    gap: 10px !important;

    padding: 14px !important;

    border-bottom:
        1px solid
        #e8ede9 !important;
}

#agro-pos .field {
    display: grid !important;

    min-width: 0 !important;

    gap: 5px !important;
}

#agro-pos .field-label {
    color:
        var(--text-2) !important;

    font-size: 12px !important;

    font-weight: 700 !important;
}

#agro-pos .control-wrap {
    position: relative !important;

    min-width: 0 !important;
}

#agro-pos .control-icon {
    position: absolute !important;

    top: 50% !important;
    left: 12px !important;

    width: 18px !important;
    height: 18px !important;

    color:
        var(--muted) !important;

    transform:
        translateY(-50%) !important;

    pointer-events:
        none !important;
}

#agro-pos .search-input,
#agro-pos .category-select,
#agro-pos .number-input {
    display: block !important;

    width: 100% !important;

    height: 46px !important;
    min-height: 46px !important;

    color:
        var(--text) !important;

    font-size: 15px !important;

    font-weight: 600 !important;

    outline: none !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border-dark) !important;

    border-radius: 9px !important;
}

#agro-pos .search-input {
    padding:
        0 42px !important;

    background:
        #f8faf9 !important;
}

#agro-pos .search-input::placeholder {
    color: #7a8696 !important;

    opacity: 1 !important;
}

#agro-pos .category-select {
    padding:
        0 34px
        0 38px !important;

    appearance: none !important;

    background-image:
        linear-gradient(
            45deg,
            transparent 50%,
            #667085 50%
        ),
        linear-gradient(
            135deg,
            #667085 50%,
            transparent 50%
        ) !important;

    background-position:
        calc(100% - 16px) 19px,
        calc(100% - 11px) 19px !important;

    background-size:
        5px 5px,
        5px 5px !important;

    background-repeat:
        no-repeat !important;

    cursor: pointer !important;
}

#agro-pos .clear-search {
    position: absolute !important;

    top: 50% !important;
    right: 5px !important;

    display: grid !important;

    width: 34px !important;
    height: 34px !important;

    place-items: center !important;

    padding: 0 !important;

    color:
        var(--muted) !important;

    background:
        transparent !important;

    border: 0 !important;

    border-radius: 7px !important;

    transform:
        translateY(-50%) !important;

    cursor: pointer !important;
}

#agro-pos .clear-search:hover {
    color:
        var(--text) !important;

    background:
        #eaf0ec !important;
}

#agro-pos .clear-search svg {
    width: 16px !important;
    height: 16px !important;
}

#agro-pos .product-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            auto-fill,
            minmax(
                220px,
                1fr
            )
        ) !important;

    align-content: start !important;

    gap: 12px !important;

    min-height: 330px !important;

    flex: 1 !important;

    padding: 14px !important;

    background:
        #f5f8f6 !important;
}

#agro-pos .product-card {
    position: relative !important;

    display: flex !important;

    min-width: 0 !important;

    min-height: 180px !important;

    flex-direction:
        column !important;

    gap: 10px !important;

    padding: 14px !important;

    color:
        var(--text) !important;

    text-align: left !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 11px !important;

    box-shadow:
        0 2px 7px
        rgba(
            16,
            24,
            40,
            0.045
        ) !important;

    cursor: pointer !important;

    transition:
        transform 0.15s ease,
        border-color 0.15s ease,
        box-shadow 0.15s ease !important;
}

#agro-pos .product-card:hover {
    border-color:
        var(--green-700) !important;

    box-shadow:
        0 8px 18px
        rgba(
            21,
            128,
            61,
            0.12
        ) !important;

    transform:
        translateY(-2px) !important;
}

#agro-pos .dual-product-badge {
    position: absolute !important;

    top: 9px !important;
    right: 9px !important;

    display:
        inline-flex !important;

    min-height: 25px !important;

    align-items: center !important;

    gap: 4px !important;

    padding:
        3px 7px !important;

    color:
        var(--blue-700) !important;

    font-size: 10px !important;

    font-weight: 800 !important;

    background:
        var(--blue-50) !important;

    border:
        1px solid
        #b9d8f5 !important;

    border-radius:
        999px !important;
}

#agro-pos .dual-product-badge svg {
    width: 13px !important;
    height: 13px !important;
}

#agro-pos .product-top {
    display: flex !important;

    min-width: 0 !important;

    align-items:
        flex-start !important;

    gap: 10px !important;

    padding-right: 0 !important;
}

#agro-pos
.product-card:has(.dual-product-badge)
.product-top {
    padding-right: 62px !important;
}

#agro-pos .product-initial {
    display: grid !important;

    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;

    place-items: center !important;

    color: #ffffff !important;

    font-size: 16px !important;

    font-weight: 800 !important;

    background:
        linear-gradient(
            145deg,
            var(--green-900),
            var(--green-700)
        ) !important;

    border-radius: 9px !important;
}

#agro-pos .product-copy {
    display: flex !important;

    min-width: 0 !important;

    flex: 1 !important;

    flex-direction:
        column !important;
}

#agro-pos .category-badge {
    display:
        inline-flex !important;

    width:
        fit-content !important;

    max-width: 100% !important;

    margin-bottom: 4px !important;

    padding:
        3px 7px !important;

    overflow: hidden !important;

    color:
        var(--green-900) !important;

    font-size: 10px !important;

    font-weight: 800 !important;

    text-overflow:
        ellipsis !important;

    white-space:
        nowrap !important;

    background:
        var(--green-50) !important;

    border:
        1px solid
        var(--green-100) !important;

    border-radius:
        999px !important;
}

#agro-pos .product-name {
    display:
        -webkit-box !important;

    overflow: hidden !important;

    font-size: 16px !important;

    font-weight: 750 !important;

    line-height: 1.35 !important;

    -webkit-box-orient:
        vertical !important;

    -webkit-line-clamp:
        2 !important;
}

#agro-pos .product-code {
    display: block !important;

    margin-top: 4px !important;

    overflow: hidden !important;

    color:
        var(--muted) !important;

    font-size: 11px !important;

    text-overflow:
        ellipsis !important;

    white-space:
        nowrap !important;
}

#agro-pos .product-meta {
    display: grid !important;

    grid-template-columns:
        minmax(
            0,
            1.35fr
        )
        minmax(
            0,
            1fr
        ) !important;

    gap: 8px !important;

    margin-top: auto !important;
}

#agro-pos .meta-box {
    display: flex !important;

    min-width: 0 !important;

    min-height: 54px !important;

    flex-direction:
        column !important;

    justify-content:
        center !important;

    gap: 2px !important;

    padding:
        7px 8px !important;

    background:
        #f8faf9 !important;

    border:
        1px solid
        #e8ede9 !important;

    border-radius: 8px !important;
}

#agro-pos .meta-box span {
    color:
        var(--muted) !important;

    font-size: 9px !important;

    font-weight: 800 !important;

    letter-spacing:
        0.03em !important;

    text-transform:
        uppercase !important;
}

#agro-pos .meta-box strong {
    overflow: hidden !important;

    color:
        var(--text-2) !important;

    font-size: 12px !important;

    font-weight: 750 !important;

    text-overflow:
        ellipsis !important;
}

#agro-pos .price strong {
    color:
        var(--green-800) !important;

    white-space: normal !important;

    line-height: 1.35 !important;
}

#agro-pos .state {
    display: flex !important;

    min-height: 300px !important;

    grid-column:
        1 / -1 !important;

    align-items: center !important;

    justify-content:
        center !important;

    flex-direction:
        column !important;

    gap: 8px !important;

    padding: 28px !important;

    text-align: center !important;

    background: #ffffff !important;

    border:
        1px dashed
        var(--border-dark) !important;

    border-radius: 11px !important;
}

#agro-pos .state-icon {
    display: grid !important;

    width: 48px !important;
    height: 48px !important;

    place-items: center !important;

    color:
        var(--green-700) !important;

    background:
        var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 11px !important;
}

#agro-pos .state-icon svg {
    width: 23px !important;
    height: 23px !important;
}

#agro-pos .state strong {
    font-size: 16px !important;

    font-weight: 800 !important;
}

#agro-pos .state span {
    max-width: 400px !important;

    color:
        var(--muted) !important;

    font-size: 13px !important;
}

#agro-pos .spinner {
    width: 36px !important;
    height: 36px !important;

    border:
        4px solid
        var(--green-100) !important;

    border-top-color:
        var(--green-700) !important;

    border-radius: 50% !important;

    animation:
        pos-spin
        0.7s
        linear
        infinite !important;
}

@keyframes pos-spin {
    to {
        transform:
            rotate(
                360deg
            );
    }
}

#agro-pos .pagination {
    display: flex !important;

    min-height: 60px !important;

    align-items: center !important;

    justify-content:
        space-between !important;

    gap: 12px !important;

    padding:
        10px 14px !important;

    border-top:
        1px solid
        #e8ede9 !important;
}

#agro-pos .pagination-label {
    color:
        var(--muted) !important;

    font-size: 12px !important;
}

#agro-pos .pagination-label strong {
    color:
        var(--text) !important;
}

#agro-pos .page-actions {
    display: flex !important;

    gap: 7px !important;
}

#agro-pos .page-button {
    display:
        inline-flex !important;

    min-height: 38px !important;

    align-items: center !important;

    gap: 5px !important;

    padding:
        7px 10px !important;

    color:
        var(--green-900) !important;

    font-size: 12px !important;

    font-weight: 700 !important;

    background:
        var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#agro-pos
.page-button:hover:not(:disabled) {
    color: #ffffff !important;

    background:
        var(--green-800) !important;

    border-color:
        var(--green-800) !important;
}

#agro-pos .page-button:disabled {
    color: #98a2b3 !important;

    background:
        #f2f4f7 !important;

    border-color:
        #e4e7ec !important;

    cursor:
        not-allowed !important;
}

#agro-pos .page-button svg {
    width: 15px !important;
    height: 15px !important;
}

#agro-pos .pos-cart {
    position: sticky !important;

    top: 88px !important;

    display: flex !important;

    max-height:
        calc(
            100dvh - 112px
        ) !important;

    flex-direction:
        column !important;
}

#agro-pos .cart-header {
    display: flex !important;

    min-height: 80px !important;

    align-items: center !important;

    justify-content:
        space-between !important;

    gap: 12px !important;

    padding:
        14px 16px !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--green-900),
            var(--green-800)
        ) !important;
}

#agro-pos .cart-header .eyebrow {
    color: #bbf7d0 !important;
}

#agro-pos .cart-title {
    font-size: 21px !important;

    font-weight: 800 !important;
}

#agro-pos .cart-count {
    display:
        inline-flex !important;

    min-height: 34px !important;

    align-items: center !important;

    padding:
        6px 10px !important;

    color:
        var(--green-900) !important;

    font-size: 12px !important;

    font-weight: 800 !important;

    white-space:
        nowrap !important;

    background:
        var(--green-100) !important;

    border-radius:
        999px !important;
}

#agro-pos .cart-items {
    display: flex !important;

    min-height: 220px !important;

    flex: 1 !important;

    flex-direction:
        column !important;

    gap: 10px !important;

    padding: 12px !important;

    overflow-y: auto !important;

    background:
        #f5f8f6 !important;

    scrollbar-width: thin !important;

    scrollbar-color:
        #a7b7ab
        transparent !important;
}

#agro-pos .empty-cart {
    display: flex !important;

    min-height: 230px !important;

    flex: 1 !important;

    align-items: center !important;

    justify-content:
        center !important;

    flex-direction:
        column !important;

    gap: 7px !important;

    padding: 24px !important;

    text-align: center !important;

    background: #ffffff !important;

    border:
        1px dashed
        var(--border-dark) !important;

    border-radius: 11px !important;
}

#agro-pos .empty-icon {
    display: grid !important;

    width: 50px !important;
    height: 50px !important;

    place-items: center !important;

    color: #ffffff !important;

    background:
        var(--green-800) !important;

    border-radius: 12px !important;
}

#agro-pos .empty-icon svg {
    width: 23px !important;
    height: 23px !important;
}

#agro-pos .empty-cart strong {
    font-size: 16px !important;

    font-weight: 800 !important;
}

#agro-pos .empty-cart span {
    max-width: 280px !important;

    color:
        var(--muted) !important;

    font-size: 13px !important;
}

#agro-pos .cart-item {
    padding: 12px !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 10px !important;

    box-shadow:
        0 1px 4px
        rgba(
            16,
            24,
            40,
            0.04
        ) !important;
}

#agro-pos .cart-item-header {
    display: flex !important;

    align-items:
        flex-start !important;

    justify-content:
        space-between !important;

    gap: 10px !important;

    padding-bottom: 9px !important;

    border-bottom:
        1px solid
        #e8ede9 !important;
}

#agro-pos .cart-item-copy {
    display: flex !important;

    min-width: 0 !important;

    flex: 1 !important;

    flex-direction:
        column !important;
}

#agro-pos .cart-item-name {
    overflow: hidden !important;

    font-size: 15px !important;

    font-weight: 800 !important;

    text-overflow:
        ellipsis !important;

    white-space:
        nowrap !important;
}

#agro-pos .batch {
    overflow: hidden !important;

    color:
        var(--muted) !important;

    font-size: 11px !important;

    text-overflow:
        ellipsis !important;

    white-space:
        nowrap !important;
}

#agro-pos .sale-unit-row {
    display: flex !important;

    align-items: center !important;

    flex-wrap: wrap !important;

    gap: 5px !important;

    margin-top: 6px !important;
}

#agro-pos .sale-unit-badge {
    display:
        inline-flex !important;

    min-height: 27px !important;

    align-items: center !important;

    gap: 4px !important;

    padding:
        3px 7px !important;

    color:
        var(--green-900) !important;

    font-size: 11px !important;

    font-weight: 800 !important;

    background:
        var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius:
        999px !important;
}

#agro-pos .sale-unit-badge.loose {
    color:
        var(--blue-700) !important;

    background:
        var(--blue-50) !important;

    border-color:
        #b9d8f5 !important;
}

#agro-pos .sale-unit-badge svg {
    width: 13px !important;
    height: 13px !important;
}

#agro-pos .stock-usage {
    color:
        var(--muted) !important;

    font-size: 10px !important;

    font-weight: 650 !important;
}

#agro-pos .remove {
    display: grid !important;

    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;

    place-items: center !important;

    padding: 0 !important;

    color: var(--red) !important;

    background:
        var(--red-bg) !important;

    border:
        1px solid
        #f1b8b3 !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#agro-pos .remove:hover {
    color: #ffffff !important;

    background:
        #d92d20 !important;

    border-color:
        #d92d20 !important;
}

#agro-pos .remove svg {
    width: 17px !important;
    height: 17px !important;
}

#agro-pos .cart-meta {
    display: grid !important;

    grid-template-columns:
        repeat(
            3,
            minmax(
                0,
                1fr
            )
        ) !important;

    gap: 7px !important;

    margin:
        9px 0 !important;
}

#agro-pos
.cart-meta
.meta-box strong {
    color:
        var(--text-2) !important;

    font-size: 11px !important;
}

#agro-pos .quantity-row {
    display: grid !important;

    grid-template-columns:
        40px
        minmax(
            78px,
            96px
        )
        40px
        minmax(
            0,
            1fr
        ) !important;

    align-items: center !important;

    gap: 6px !important;
}

#agro-pos .quantity-button {
    display: grid !important;

    width: 40px !important;
    height: 40px !important;

    place-items: center !important;

    padding: 0 !important;

    color:
        var(--green-900) !important;

    background:
        var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#agro-pos
.quantity-button:hover:not(:disabled) {
    color: #ffffff !important;

    background:
        var(--green-800) !important;

    border-color:
        var(--green-800) !important;
}

#agro-pos .quantity-button:disabled {
    color: #98a2b3 !important;

    background:
        #f2f4f7 !important;

    border-color:
        #e4e7ec !important;

    cursor:
        not-allowed !important;
}

#agro-pos .quantity-button svg {
    width: 17px !important;
    height: 17px !important;
}

#agro-pos .number-input {
    height: 40px !important;
    min-height: 40px !important;

    padding:
        0 7px !important;

    font-size: 14px !important;

    font-weight: 750 !important;

    text-align: center !important;
}

#agro-pos .line-total {
    min-width: 0 !important;

    overflow: hidden !important;

    color:
        var(--green-900) !important;

    font-size: 15px !important;

    font-weight: 850 !important;

    text-align: right !important;

    text-overflow:
        ellipsis !important;

    white-space:
        nowrap !important;
}

#agro-pos .discount-row {
    display: grid !important;

    grid-template-columns:
        minmax(
            0,
            1fr
        )
        125px !important;

    align-items: center !important;

    gap: 8px !important;

    margin-top: 9px !important;
}

#agro-pos .discount-row span {
    color:
        var(--muted) !important;

    font-size: 11px !important;

    font-weight: 650 !important;
}

#agro-pos
.discount-row
.number-input {
    text-align: right !important;
}

#agro-pos .cart-summary {
    display: flex !important;

    flex-direction:
        column !important;

    gap: 8px !important;

    padding:
        13px 14px
        14px !important;

    border-top:
        1px solid
        var(--border) !important;
}

#agro-pos .sale-discount {
    display: grid !important;

    grid-template-columns:
        minmax(
            0,
            1fr
        )
        135px !important;

    align-items: center !important;

    gap: 10px !important;

    padding-bottom: 9px !important;

    border-bottom:
        1px solid
        #e8ede9 !important;
}

#agro-pos .sale-discount span {
    color:
        var(--text-2) !important;

    font-size: 12px !important;

    font-weight: 700 !important;
}

#agro-pos
.sale-discount
.number-input {
    text-align: right !important;
}

#agro-pos .summary-row {
    display: flex !important;

    align-items: center !important;

    justify-content:
        space-between !important;

    gap: 12px !important;

    color:
        var(--muted) !important;

    font-size: 12px !important;
}

#agro-pos .summary-row strong {
    color:
        var(--text-2) !important;

    font-size: 13px !important;
}

#agro-pos .grand-total {
    display: flex !important;

    min-height: 66px !important;

    align-items: center !important;

    justify-content:
        space-between !important;

    gap: 12px !important;

    padding:
        10px 12px !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--green-900),
            var(--green-700)
        ) !important;

    border-radius: 10px !important;
}

#agro-pos .grand-total span {
    color: #d8f7e1 !important;

    font-size: 12px !important;

    font-weight: 700 !important;
}

#agro-pos .grand-total strong {
    font-size: 21px !important;

    font-weight: 850 !important;
}

#agro-pos .payment-button,
#agro-pos .clear-button,
#agro-pos .confirm-button,
#agro-pos .cancel-button {
    display:
        inline-flex !important;

    min-height: 46px !important;

    align-items: center !important;

    justify-content:
        center !important;

    gap: 7px !important;

    padding:
        9px 12px !important;

    font-size: 13px !important;

    font-weight: 800 !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#agro-pos .payment-button {
    color: #ffffff !important;

    background:
        var(--green-700) !important;

    border:
        1px solid
        var(--green-700) !important;

    box-shadow:
        0 5px 13px
        rgba(
            21,
            128,
            61,
            0.18
        ) !important;
}

#agro-pos
.payment-button:hover:not(:disabled) {
    background:
        var(--green-800) !important;

    border-color:
        var(--green-800) !important;
}

#agro-pos .clear-button {
    min-height: 40px !important;

    color: var(--red) !important;

    background:
        var(--red-bg) !important;

    border:
        1px solid
        #f1b8b3 !important;
}

#agro-pos
.clear-button:hover:not(:disabled) {
    color: #ffffff !important;

    background:
        #d92d20 !important;

    border-color:
        #d92d20 !important;
}

#agro-pos .payment-button:disabled,
#agro-pos .clear-button:disabled {
    opacity: 0.55 !important;

    cursor:
        not-allowed !important;
}

#agro-pos .payment-button svg,
#agro-pos .clear-button svg {
    width: 17px !important;
    height: 17px !important;
}

#agro-pos .clear-confirm {
    display: grid !important;

    grid-template-columns:
        minmax(
            0,
            1fr
        )
        auto
        auto !important;

    align-items: center !important;

    gap: 7px !important;

    padding:
        9px 10px !important;

    color:
        var(--amber) !important;

    background:
        var(--amber-bg) !important;

    border:
        1px solid
        #f0d48f !important;

    border-radius: 9px !important;
}

#agro-pos .clear-confirm span {
    font-size: 11px !important;

    font-weight: 650 !important;
}

#agro-pos .confirm-button,
#agro-pos .cancel-button {
    min-height: 34px !important;

    padding:
        5px 8px !important;

    font-size: 11px !important;
}

#agro-pos .confirm-button {
    color: #ffffff !important;

    background:
        #d92d20 !important;

    border:
        1px solid
        #d92d20 !important;
}

#agro-pos .cancel-button {
    color:
        var(--text-2) !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border-dark) !important;
}

@media (
    max-width: 1500px
) {
    #agro-pos {
        grid-template-columns:
            minmax(
                0,
                1fr
            )
            minmax(
                350px,
                410px
            ) !important;
    }

    #agro-pos .product-grid {
        grid-template-columns:
            repeat(
                auto-fill,
                minmax(
                    200px,
                    1fr
                )
            ) !important;
    }
}

@media (
    max-width: 1180px
) {
    #agro-pos {
        display: flex !important;

        flex-direction:
            column !important;
    }

    #agro-pos .pos-cart {
        position: static !important;

        width: 100% !important;

        max-height: none !important;
    }

    #agro-pos .cart-items {
        max-height: 560px !important;
    }
}

@media (
    max-width: 720px
) {
    #agro-pos {
        gap: 12px !important;
    }

    #agro-pos .pos-products,
    #agro-pos .pos-cart {
        border-radius: 11px !important;
    }

    #agro-pos .pos-header {
        align-items:
            stretch !important;

        flex-direction:
            column !important;

        padding: 15px !important;
    }

    #agro-pos .customer-note {
        width: 100% !important;

        min-width: 0 !important;
    }

    #agro-pos .filters {
        grid-template-columns:
            1fr !important;

        padding: 12px !important;
    }

    #agro-pos .product-grid {
        grid-template-columns:
            1fr !important;

        padding: 12px !important;
    }

    #agro-pos .pagination {
        align-items:
            stretch !important;

        flex-direction:
            column !important;
    }

    #agro-pos .page-actions {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #agro-pos .page-button {
        justify-content:
            center !important;
    }

    #agro-pos .cart-meta {
        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #agro-pos
    .cart-meta
    .meta-box:last-child {
        grid-column:
            1 / -1 !important;
    }

    #agro-pos .quantity-row {
        grid-template-columns:
            40px
            minmax(
                74px,
                96px
            )
            40px !important;
    }

    #agro-pos .line-total {
        grid-column:
            1 / -1 !important;

        padding-top: 4px !important;
    }

    #agro-pos .clear-confirm {
        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #agro-pos
    .clear-confirm
    span {
        grid-column:
            1 / -1 !important;
    }
}

@media (
    prefers-reduced-motion:
        reduce
) {
    #agro-pos *,
    #agro-pos *::before,
    #agro-pos *::after {
        transition: none !important;

        scroll-behavior:
            auto !important;
    }

    #agro-pos .spinner {
        animation-duration:
            1.2s !important;
    }
}
`;

export default function PosPage() {
    const {
        token,
    } = useAuth();

    const searchInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const loadProductsRef =
        useRef<
            (
                showLoading?: boolean,
            ) => Promise<void>
        >(
            async (): Promise<void> => {
                return;
            },
        );

    const [
        products,
        setProducts,
    ] = useState<
        PosProduct[]
    >([]);

    const [
        categories,
        setCategories,
    ] = useState<
        PosCategory[]
    >([]);

    const [
        cart,
        setCart,
    ] = useState<
        PosCartItem[]
    >([]);

    const [
        selectedProduct,
        setSelectedProduct,
    ] = useState<
        PosProduct | null
    >(null);

    const [
        pagination,
        setPagination,
    ] = useState<
        PosPaginationMeta
    >(
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
    ] = useState<
        SaleReceipt | null
    >(null);

    const [
        isClearCartConfirming,
        setIsClearCartConfirming,
    ] = useState(false);

    const [
        realtimeStatus,
        setRealtimeStatus,
    ] = useState<
        RealtimeStockStatus
    >('disconnected');

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
                        getErrorMessage(
                            error,
                            'Unable to load POS categories.',
                        ),
                    );
                }
            },
            [token],
        );

    const loadProducts =
        useCallback(
            async (
                showLoading = true,
            ): Promise<void> => {
                if (!token) {
                    return;
                }

                if (showLoading) {
                    setIsLoading(
                        true,
                    );
                }

                setPageError('');

                try {
                    const response =
                        await getPosProducts(
                            token,
                            {
                                page,

                                perPage:
                                    PRODUCT_PAGE_SIZE,

                                search:
                                    appliedSearch,

                                categoryId:
                                    categoryFilter,
                            },
                        );

                    const visibleProducts =
                        getVisibleProducts(
                            response.data,
                        );

                    setProducts(
                        visibleProducts,
                    );

                    setPagination(
                        response.meta,
                    );

                    /*
                     * If the batch selection modal is currently open, replace
                     * its product object with the fresh server version too.
                     * If the product no longer appears because the last stock
                     * was sold by another cashier, close the stale modal.
                     */
                    setSelectedProduct(
                        (
                            current,
                        ) => {
                            if (!current) {
                                return null;
                            }

                            return (
                                visibleProducts
                                    .find(
                                        (
                                            product,
                                        ) =>
                                            product.id
                                            === current.id,
                                    )
                                ?? null
                            );
                        },
                    );
                } catch (error) {
                    setPageError(
                        getErrorMessage(
                            error,
                            'Unable to load POS products.',
                        ),
                    );
                } finally {
                    if (showLoading) {
                        setIsLoading(
                            false,
                        );
                    }
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
    }, [
        loadCategories,
    ]);

    useEffect(() => {
        void loadProducts();
    }, [
        loadProducts,
    ]);

    useEffect(() => {
        loadProductsRef.current =
            loadProducts;
    }, [
        loadProducts,
    ]);

    useEffect(() => {
        if (!token) {
            setRealtimeStatus(
                'disconnected',
            );

            return;
        }

        let disposed = false;

        let disconnect:
            | (() => void)
            | null = null;

        const connectRealtimeStock =
            async (): Promise<void> => {
                try {
                    const subscription =
                        await subscribeToRealtimeStock(
                            {
                                token,

                                onStatusChange:
                                    (
                                        status,
                                    ) => {
                                        if (disposed) {
                                            return;
                                        }

                                        setRealtimeStatus(
                                            status,
                                        );
                                    },

                                onStockUpdated:
                                    (
                                        event,
                                    ) => {
                                        if (disposed) {
                                            return;
                                        }

                                        /*
                                         * Immediately update any matching
                                         * batches already sitting in this
                                         * cashier's cart. This prevents the
                                         * cart from continuing to show stale
                                         * availability while the API refresh
                                         * is in flight.
                                         */
                                        setCart(
                                            (
                                                current,
                                            ) =>
                                                applyRealtimeStockEventToCart(
                                                    current,
                                                    event,
                                                ),
                                        );

                                        /*
                                         * Re-fetch the current filtered POS
                                         * page from Laravel so product cards,
                                         * sale options, dual-unit quantities
                                         * and batch availability all remain
                                         * authoritative. This refresh is
                                         * silent, so the cashier does not see
                                         * a loading spinner for every sale
                                         * made on another machine.
                                         */
                                        void loadProductsRef
                                            .current(
                                                false,
                                            );
                                    },

                                onReconnected:
                                    () => {
                                        if (disposed) {
                                            return;
                                        }

                                        /*
                                         * A connection may have been offline
                                         * while stock changed. Always perform
                                         * a fresh API read after Reverb
                                         * successfully reconnects.
                                         */
                                        void loadProductsRef
                                            .current(
                                                false,
                                            );
                                    },
                            },
                        );

                    if (disposed) {
                        subscription
                            .disconnect();

                        return;
                    }

                    disconnect =
                        subscription
                            .disconnect;
                } catch (error) {
                    if (disposed) {
                        return;
                    }

                    setRealtimeStatus(
                        'error',
                    );

                    console.error(
                        'Unable to start realtime POS stock synchronization.',
                        error,
                    );
                }
            };

        void connectRealtimeStock();

        return () => {
            disposed = true;

            disconnect?.();
        };
    }, [
        token,
    ]);

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    setPage(1);

                    setAppliedSearch(
                        searchInput.trim(),
                    );
                },
                300,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [
        searchInput,
    ]);

    useEffect(() => {
        if (
            cart.length === 0
        ) {
            setIsClearCartConfirming(
                false,
            );
        }
    }, [
        cart.length,
    ]);

    useEffect(() => {
        const stockError =
            getCombinedCartStockError(
                cart,
            );

        if (stockError) {
            setCartError(
                stockError,
            );
        }
    }, [
        cart,
    ]);

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

    const saleDiscountValue =
        Number(
            saleDiscount || 0,
        );

    const safeSaleDiscount =
        Number.isFinite(
            saleDiscountValue,
        )
            ? saleDiscountValue
            : 0;

    const grandTotal =
        Math.max(
            0,
            subtotal
            - safeSaleDiscount,
        );

    const refocusSearch =
        (): void => {
            window.setTimeout(
                () => {
                    searchInputRef
                        .current
                        ?.focus();
                },
                80,
            );
        };

    const addBatchToCart = (
        product: PosProduct,
        batch: PosStockBatch,
        quantity: number,
        saleOption: PosSaleOption,
    ): void => {
        setCartError('');

        if (
            !Number.isFinite(
                quantity,
            )
            || quantity <= 0
        ) {
            setCartError(
                'Quantity must be greater than zero.',
            );

            return;
        }

        if (
            !saleOption
                .allow_decimal_quantity
            && !isWholeNumber(
                quantity,
            )
        ) {
            setCartError(
                `${saleOption.unit
                } quantity must be a whole number.`,
            );

            return;
        }

        const maximumSaleQuantity =
            Number(
                saleOption
                    .available_quantity
                ?? 0,
            );

        const availableStockQuantity =
            Number(
                saleOption
                    .available_stock_quantity
                ?? batch
                    .available_quantity
                ?? 0,
            );

        const conversionFactor =
            Number(
                saleOption
                    .stock_quantity_per_unit
                ?? saleOption
                    .conversion_factor
                ?? 1,
            );

        const existingItem =
            cart.find(
                (
                    item,
                ) =>
                    isSameCartItem(
                        item,
                        batch.id,
                        saleOption.unit,
                    ),
            );

        const newQuantity =
            normaliseQuantity(
                (
                    existingItem
                        ?.quantity
                    ?? 0
                )
                + quantity,
            );

        if (
            newQuantity
            > maximumSaleQuantity
            + 0.0001
        ) {
            setCartError(
                `Only ${formatQuantity(
                    maximumSaleQuantity,
                )
                } ${saleOption.unit
                } are available.`,
            );

            return;
        }

        const cartItemKey =
            getCartItemKey(
                batch.id,
                saleOption.unit,
            );

        const otherStockUsed =
            getBatchStockUsedByCart(
                cart,
                batch.id,
                cartItemKey,
            );

        const newLineStockQuantity =
            calculateStockQuantity(
                newQuantity,
                conversionFactor,
            );

        const totalRequiredStock =
            normaliseQuantity(
                otherStockUsed
                + newLineStockQuantity,
            );

        if (
            totalRequiredStock
            > availableStockQuantity
            + 0.0001
        ) {
            setCartError(
                `${product.name
                } only has ${formatQuantity(
                    availableStockQuantity,
                )
                } ${saleOption.stock_unit
                } available. Your Bag and loose ${saleOption.stock_unit
                } selections together require ${formatQuantity(
                    totalRequiredStock,
                )
                } ${saleOption.stock_unit
                }.`,
            );

            return;
        }

        if (existingItem) {
            setCart(
                (
                    current,
                ) =>
                    current.map(
                        (
                            item,
                        ) =>
                            isSameCartItem(
                                item,
                                batch.id,
                                saleOption.unit,
                            )
                                ? {
                                    ...item,

                                    quantity:
                                        newQuantity,

                                    stock_quantity:
                                        newLineStockQuantity,
                                }
                                : item,
                    ),
            );
        } else {
            setCart(
                (
                    current,
                ) => [
                        ...current,

                        {
                            stock_batch_id:
                                batch.id,

                            product_id:
                                product.id,

                            product_name:
                                product.name,

                            primary_unit:
                                batch.primary_unit
                                || product.primary_unit
                                || product.unit,

                            sale_unit:
                                saleOption.unit,

                            stock_unit:
                                saleOption.stock_unit
                                || batch.stock_unit
                                || product.stock_unit
                                || product.unit,

                            is_dual_unit:
                                Boolean(
                                    batch
                                        .is_dual_unit,
                                ),

                            conversion_factor:
                                conversionFactor,

                            stock_quantity:
                                calculateStockQuantity(
                                    quantity,
                                    conversionFactor,
                                ),

                            unit:
                                saleOption.unit,

                            batch_code:
                                batch.batch_code,

                            batch_number:
                                batch.batch_number,

                            expiry_date:
                                batch.expiry_date,

                            available_quantity:
                                maximumSaleQuantity,

                            available_stock_quantity:
                                availableStockQuantity,

                            selling_price:
                                Number(
                                    saleOption
                                        .selling_price,
                                ),

                            quantity:
                                normaliseQuantity(
                                    quantity,
                                ),

                            discount:
                                0,
                        },
                    ],
            );
        }

        setSelectedProduct(
            null,
        );

        refocusSearch();
    };

    const updateCartQuantity = (
        batchId: number,
        saleUnit: string,
        quantity: number,
    ): void => {
        const item =
            cart.find(
                (
                    cartItem,
                ) =>
                    isSameCartItem(
                        cartItem,
                        batchId,
                        saleUnit,
                    ),
            );

        if (!item) {
            return;
        }

        if (
            !Number.isFinite(
                quantity,
            )
            || quantity <= 0
        ) {
            setCartError(
                'Quantity must be greater than zero.',
            );

            return;
        }

        if (
            isFullPrimaryUnit(
                item,
            )
            && !isWholeNumber(
                quantity,
            )
        ) {
            setCartError(
                `${item.sale_unit
                } quantity must be a whole number. Use Loose Kg for partial quantities.`,
            );

            return;
        }

        if (
            quantity
            > item.available_quantity
            + 0.0001
        ) {
            setCartError(
                `Only ${formatQuantity(
                    item
                        .available_quantity,
                )
                } ${item.sale_unit
                } are available.`,
            );

            return;
        }

        const itemKey =
            getCartItemKey(
                batchId,
                saleUnit,
            );

        const otherStockUsed =
            getBatchStockUsedByCart(
                cart,
                batchId,
                itemKey,
            );

        const newStockQuantity =
            calculateStockQuantity(
                quantity,
                item
                    .conversion_factor,
            );

        const totalRequiredStock =
            normaliseQuantity(
                otherStockUsed
                + newStockQuantity,
            );

        if (
            totalRequiredStock
            > item
                .available_stock_quantity
            + 0.0001
        ) {
            setCartError(
                `Only ${formatQuantity(
                    item
                        .available_stock_quantity,
                )
                } ${item.stock_unit
                } remain in this batch. The combined ${item.primary_unit
                } and ${item.sale_unit
                } cart quantities exceed the available stock.`,
            );

            return;
        }

        setCartError('');

        setCart(
            (
                current,
            ) =>
                current.map(
                    (
                        cartItem,
                    ) =>
                        isSameCartItem(
                            cartItem,
                            batchId,
                            saleUnit,
                        )
                            ? {
                                ...cartItem,

                                quantity:
                                    normaliseQuantity(
                                        quantity,
                                    ),

                                stock_quantity:
                                    newStockQuantity,
                            }
                            : cartItem,
                ),
        );
    };

    const updateItemDiscount = (
        batchId: number,
        saleUnit: string,
        discount: number,
    ): void => {
        const item =
            cart.find(
                (
                    cartItem,
                ) =>
                    isSameCartItem(
                        cartItem,
                        batchId,
                        saleUnit,
                    ),
            );

        if (!item) {
            return;
        }

        const maximumDiscount =
            item.quantity
            * item.selling_price;

        if (
            !Number.isFinite(
                discount,
            )
            || discount < 0
        ) {
            setCartError(
                'Item discount cannot be negative.',
            );

            return;
        }

        if (
            discount
            > maximumDiscount
        ) {
            setCartError(
                `The maximum discount for ${item.product_name
                } (${item.sale_unit
                }) is ${currencyFormatter.format(
                    maximumDiscount,
                )
                }.`,
            );

            return;
        }

        setCartError('');

        setCart(
            (
                current,
            ) =>
                current.map(
                    (
                        cartItem,
                    ) =>
                        isSameCartItem(
                            cartItem,
                            batchId,
                            saleUnit,
                        )
                            ? {
                                ...cartItem,

                                discount:
                                    Number(
                                        discount
                                            .toFixed(
                                                2,
                                            ),
                                    ),
                            }
                            : cartItem,
                ),
        );
    };

    const removeCartItem = (
        batchId: number,
        saleUnit: string,
    ): void => {
        setCart(
            (
                current,
            ) =>
                current.filter(
                    (
                        item,
                    ) =>
                        !isSameCartItem(
                            item,
                            batchId,
                            saleUnit,
                        ),
                ),
        );

        setCartError('');
    };

    const clearCart =
        (): void => {
            setCart([]);

            setSaleDiscount(
                '0',
            );

            setCartError('');

            setPaymentError('');

            setIsClearCartConfirming(
                false,
            );
        };

    const clearSearch =
        (): void => {
            setSearchInput('');

            setAppliedSearch('');

            setPage(1);

            searchInputRef
                .current
                ?.focus();
        };

    const validateCombinedStock =
        (): string | null =>
            getCombinedCartStockError(
                cart,
            );

    const openPayment =
        (): void => {
            if (
                cart.length === 0
            ) {
                setCartError(
                    'Add at least one product to the cart.',
                );

                return;
            }

            if (
                !Number.isFinite(
                    saleDiscountValue,
                )
                || saleDiscountValue
                < 0
            ) {
                setCartError(
                    'Enter a valid sale discount.',
                );

                return;
            }

            if (
                saleDiscountValue
                > subtotal
            ) {
                setCartError(
                    'The sale discount cannot exceed the cart subtotal.',
                );

                return;
            }

            const invalidItem =
                cart.find(
                    (
                        item,
                    ) => {
                        if (
                            item.quantity
                            <= 0
                        ) {
                            return true;
                        }

                        if (
                            item.quantity
                            > item
                                .available_quantity
                            + 0.0001
                        ) {
                            return true;
                        }

                        if (
                            isFullPrimaryUnit(
                                item,
                            )
                            && !isWholeNumber(
                                item.quantity,
                            )
                        ) {
                            return true;
                        }

                        if (
                            item.discount
                            < 0
                        ) {
                            return true;
                        }

                        return (
                            item.discount
                            > (
                                item.quantity
                                * item
                                    .selling_price
                            )
                        );
                    },
                );

            if (invalidItem) {
                setCartError(
                    `Check the quantity and discount for ${invalidItem
                        .product_name
                    } (${invalidItem
                        .sale_unit
                    }).`,
                );

                return;
            }

            const stockError =
                validateCombinedStock();

            if (stockError) {
                setCartError(
                    stockError,
                );

                return;
            }

            setCartError('');

            setPaymentError('');

            setIsPaymentOpen(
                true,
            );
        };

    const submitSale =
        async (
            values:
                CompleteSaleValues,
        ): Promise<void> => {
            if (
                !token
                || cart.length === 0
                || isSubmitting
            ) {
                return;
            }

            setIsSubmitting(
                true,
            );

            setPaymentError('');

            try {
                const response =
                    await completePosSale(
                        token,
                        cart,
                        {
                            ...values,

                            discount:
                                saleDiscountValue,
                        },
                    );

                setReceipt(
                    response.data,
                );

                clearCart();

                setIsPaymentOpen(
                    false,
                );

                await Promise.all([
                    loadProducts(),
                    loadCategories(),
                ]);

                refocusSearch();
            } catch (error) {
                setPaymentError(
                    getErrorMessage(
                        error,
                        'Unable to complete the sale.',
                    ),
                );
            } finally {
                setIsSubmitting(
                    false,
                );
            }
        };

    return (
        <div id="agro-pos">
            <style>
                {styles}
            </style>

            <section className="pos-products">
                <header className="pos-header">
                    <div>
                        <span className="eyebrow">
                            Point of Sale
                        </span>

                        <h1 className="page-title">
                            New Sale
                        </h1>

                    </div>

                    <div
                        className={`realtime-status ${realtimeStatus}`}
                        title={
                            realtimeStatus
                                === 'connected'
                                ? 'Stock changes from other cashier machines are being received automatically.'
                                : 'Realtime stock synchronization is not currently connected.'
                        }
                    >
                        <span className="realtime-dot" />

                        <span>
                            {getRealtimeStatusLabel(
                                realtimeStatus,
                            )}
                        </span>
                    </div>
                </header>

                {pageError && (
                    <div
                        className="alert"
                        role="alert"
                    >
                        <Icon name="alert" />

                        <span>
                            {pageError}
                        </span>

                        <button
                            type="button"
                            className="retry"
                            onClick={() => {
                                void Promise.all([
                                    loadProducts(),
                                    loadCategories(),
                                ]);
                            }}
                        >
                            <Icon name="refresh" />

                            Retry
                        </button>
                    </div>
                )}

                <div className="filters">
                    <label className="field">
                        <span className="field-label">
                            Product Search or Barcode
                        </span>

                        <span className="control-wrap">
                            <Icon
                                name="search"
                                className="control-icon"
                            />

                            <input
                                ref={
                                    searchInputRef
                                }
                                type="search"
                                className="search-input"
                                value={
                                    searchInput
                                }
                                autoFocus
                                autoComplete="off"
                                spellCheck={
                                    false
                                }
                                placeholder="Search product, barcode or category"
                                onChange={(
                                    event,
                                ) => {
                                    setSearchInput(
                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            />

                            {searchInput && (
                                <button
                                    type="button"
                                    className="clear-search"
                                    aria-label="Clear product search"
                                    onClick={
                                        clearSearch
                                    }
                                >
                                    <Icon name="close" />
                                </button>
                            )}
                        </span>
                    </label>

                    <label className="field">
                        <span className="field-label">
                            Category
                        </span>

                        <span className="control-wrap">
                            <Icon
                                name="filter"
                                className="control-icon"
                            />

                            <select
                                className="category-select"
                                value={
                                    categoryFilter
                                }
                                onChange={(
                                    event,
                                ) => {
                                    setPage(1);

                                    setCategoryFilter(
                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            >
                                <option value="">
                                    All Categories
                                </option>

                                {categories.map(
                                    (
                                        category,
                                    ) => (
                                        <option
                                            key={
                                                category.id
                                            }
                                            value={
                                                category.id
                                            }
                                        >
                                            {
                                                category
                                                    .name
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        </span>
                    </label>
                </div>

                <div
                    className="product-grid"
                    aria-live="polite"
                >
                    {isLoading ? (
                        <div className="state">
                            <div className="spinner" />

                            <strong>
                                Loading Products
                            </strong>

                            <span>
                                Checking available
                                stock batches and
                                selling options.
                            </span>
                        </div>
                    ) : products.length
                        === 0 ? (
                        <div className="state">
                            <span className="state-icon">
                                <Icon name="box" />
                            </span>

                            <strong>
                                No Available Products
                            </strong>

                            <span>
                                Try another search or
                                category, or receive
                                stock before creating
                                the sale.
                            </span>
                        </div>
                    ) : (
                        products.map(
                            (
                                product,
                            ) => (
                                <button
                                    type="button"
                                    className="product-card"
                                    key={
                                        product.id
                                    }
                                    onClick={() => {
                                        setSelectedProduct(
                                            product,
                                        );
                                    }}
                                >
                                    {product
                                        .is_dual_unit && (
                                            <span className="dual-product-badge">
                                                <Icon name="bag" />

                                                Bag + Kg
                                            </span>
                                        )}

                                    <div className="product-top">
                                        <div className="product-initial">
                                            {product
                                                .name
                                                .trim()
                                                .charAt(
                                                    0,
                                                )
                                                .toUpperCase()
                                                || 'P'}
                                        </div>

                                        <div className="product-copy">
                                            <span
                                                className="category-badge"
                                                title={
                                                    product
                                                        .category
                                                        .name
                                                }
                                            >
                                                {
                                                    product
                                                        .category
                                                        .name
                                                }
                                            </span>

                                            <strong
                                                className="product-name"
                                                title={
                                                    product
                                                        .name
                                                }
                                            >
                                                {
                                                    product
                                                        .name
                                                }
                                            </strong>

                                            <small className="product-code">
                                                {product
                                                    .sku
                                                    || product
                                                        .barcode
                                                    || 'No product code'}
                                            </small>
                                        </div>
                                    </div>

                                    <div className="product-meta">
                                        <div className="meta-box price">
                                            <span>
                                                Selling Price
                                            </span>

                                            <strong>
                                                {getProductPriceLabel(
                                                    product,
                                                )}
                                            </strong>
                                        </div>

                                        <div className="meta-box">
                                            <span>
                                                Available
                                            </span>

                                            <strong>
                                                {getProductAvailableLabel(
                                                    product,
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                </button>
                            ),
                        )
                    )}
                </div>

                {pagination.total
                    > 0 && (
                        <footer className="pagination">
                            <span className="pagination-label">
                                Showing
                                {' '}

                                <strong>
                                    {formatQuantity(
                                        pagination.from,
                                    )}
                                </strong>

                                {' '}
                                to
                                {' '}

                                <strong>
                                    {formatQuantity(
                                        pagination.to,
                                    )}
                                </strong>

                                {' '}
                                of
                                {' '}

                                <strong>
                                    {formatQuantity(
                                        pagination.total,
                                    )}
                                </strong>

                                {' '}
                                products
                            </span>

                            <div className="page-actions">
                                <button
                                    type="button"
                                    className="page-button"
                                    disabled={
                                        page <= 1
                                    }
                                    onClick={() => {
                                        setPage(
                                            (
                                                current,
                                            ) =>
                                                Math.max(
                                                    1,
                                                    current - 1,
                                                ),
                                        );
                                    }}
                                >
                                    <Icon name="chevron-left" />

                                    Previous
                                </button>

                                <button
                                    type="button"
                                    className="page-button"
                                    disabled={
                                        page
                                        >= pagination
                                            .last_page
                                    }
                                    onClick={() => {
                                        setPage(
                                            (
                                                current,
                                            ) =>
                                                Math.min(
                                                    pagination
                                                        .last_page,

                                                    current + 1,
                                                ),
                                        );
                                    }}
                                >
                                    Next

                                    <Icon name="chevron-right" />
                                </button>
                            </div>
                        </footer>
                    )}
            </section>

            <aside
                className="pos-cart"
                aria-label="Current sale cart"
            >
                <header className="cart-header">
                    <div>
                        <span className="eyebrow">
                            Current Sale
                        </span>

                        <h2 className="cart-title">
                            Cart
                        </h2>
                    </div>

                    <span className="cart-count">
                        {cart.length}
                        {' '}

                        {cart.length === 1
                            ? 'line'
                            : 'lines'}
                    </span>
                </header>

                {cartError && (
                    <div
                        className="alert"
                        role="alert"
                    >
                        <Icon name="alert" />

                        <span>
                            {cartError}
                        </span>
                    </div>
                )}

                <div className="cart-items">
                    {cart.length === 0 ? (
                        <div className="empty-cart">
                            <div className="empty-icon">
                                <Icon name="basket" />
                            </div>

                            <strong>
                                Cart is Empty
                            </strong>

                            <span>
                                Select a product,
                                stock batch and selling
                                unit to start this sale.
                            </span>
                        </div>
                    ) : (
                        cart.map(
                            (
                                item,
                            ) => {
                                const lineTotal =
                                    (
                                        item.quantity
                                        * item
                                            .selling_price
                                    )
                                    - item.discount;

                                const itemKey =
                                    getCartItemKey(
                                        item
                                            .stock_batch_id,
                                        item
                                            .sale_unit,
                                    );

                                const fullPrimary =
                                    isFullPrimaryUnit(
                                        item,
                                    );

                                const minimumQuantity =
                                    getCartMinimumQuantity(
                                        item,
                                    );

                                const step =
                                    getCartQuantityStep(
                                        item,
                                    );

                                return (
                                    <article
                                        className="cart-item"
                                        key={
                                            itemKey
                                        }
                                    >
                                        <header className="cart-item-header">
                                            <div className="cart-item-copy">
                                                <strong
                                                    className="cart-item-name"
                                                    title={
                                                        item
                                                            .product_name
                                                    }
                                                >
                                                    {
                                                        item
                                                            .product_name
                                                    }
                                                </strong>

                                                <span className="batch">
                                                    Batch:
                                                    {' '}

                                                    {item
                                                        .batch_number
                                                        || item
                                                            .batch_code}
                                                </span>

                                                <div className="sale-unit-row">
                                                    <span
                                                        className={
                                                            normaliseUnit(
                                                                item
                                                                    .sale_unit,
                                                            )
                                                                === 'kg'
                                                                && item
                                                                    .is_dual_unit
                                                                ? 'sale-unit-badge loose'
                                                                : 'sale-unit-badge'
                                                        }
                                                    >
                                                        <Icon
                                                            name={
                                                                normaliseUnit(
                                                                    item
                                                                        .sale_unit,
                                                                )
                                                                    === 'kg'
                                                                    && item
                                                                        .is_dual_unit
                                                                    ? 'kg'
                                                                    : fullPrimary
                                                                        ? 'bag'
                                                                        : 'box'
                                                            }
                                                        />

                                                        Selling as
                                                        {' '}

                                                        {
                                                            item
                                                                .sale_unit
                                                        }
                                                    </span>

                                                    {item
                                                        .is_dual_unit && (
                                                            <span className="stock-usage">
                                                                {formatQuantity(
                                                                    item
                                                                        .quantity,
                                                                )}
                                                                {' '}

                                                                {
                                                                    item
                                                                        .sale_unit
                                                                }

                                                                {' uses '}

                                                                {formatQuantity(
                                                                    item
                                                                        .stock_quantity,
                                                                )}
                                                                {' '}

                                                                {
                                                                    item
                                                                        .stock_unit
                                                                }
                                                            </span>
                                                        )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="remove"
                                                aria-label={`Remove ${item.product_name
                                                    } ${item.sale_unit
                                                    }`}
                                                onClick={() => {
                                                    removeCartItem(
                                                        item
                                                            .stock_batch_id,

                                                        item
                                                            .sale_unit,
                                                    );
                                                }}
                                            >
                                                <Icon name="trash" />
                                            </button>
                                        </header>

                                        <div className="cart-meta">
                                            <div className="meta-box">
                                                <span>
                                                    Unit Price
                                                </span>

                                                <strong>
                                                    {currencyFormatter.format(
                                                        item
                                                            .selling_price,
                                                    )}
                                                    {' / '}

                                                    {
                                                        item
                                                            .sale_unit
                                                    }
                                                </strong>
                                            </div>

                                            <div className="meta-box">
                                                <span>
                                                    Available
                                                </span>

                                                <strong>
                                                    {formatQuantity(
                                                        item
                                                            .available_quantity,
                                                    )}
                                                    {' '}

                                                    {
                                                        item
                                                            .sale_unit
                                                    }
                                                </strong>
                                            </div>

                                            <div className="meta-box">
                                                <span>
                                                    Expiry
                                                </span>

                                                <strong>
                                                    {formatExpiryDate(
                                                        item
                                                            .expiry_date,
                                                    )}
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="quantity-row">
                                            <button
                                                type="button"
                                                className="quantity-button"
                                                aria-label={`Decrease ${item.product_name
                                                    } ${item.sale_unit
                                                    } quantity`}
                                                disabled={
                                                    item.quantity
                                                    <= minimumQuantity
                                                    + 0.0001
                                                }
                                                onClick={() => {
                                                    updateCartQuantity(
                                                        item
                                                            .stock_batch_id,

                                                        item
                                                            .sale_unit,

                                                        Math.max(
                                                            minimumQuantity,

                                                            normaliseQuantity(
                                                                item
                                                                    .quantity
                                                                - (
                                                                    fullPrimary
                                                                        ? 1
                                                                        : 1
                                                                ),
                                                            ),
                                                        ),
                                                    );
                                                }}
                                            >
                                                <Icon name="minus" />
                                            </button>

                                            <input
                                                type="number"
                                                className="number-input"
                                                aria-label={`${item.product_name
                                                    } ${item.sale_unit
                                                    } quantity`}
                                                min={
                                                    minimumQuantity
                                                }
                                                max={
                                                    item
                                                        .available_quantity
                                                }
                                                step={
                                                    step
                                                }
                                                inputMode={
                                                    fullPrimary
                                                        ? 'numeric'
                                                        : 'decimal'
                                                }
                                                value={
                                                    item
                                                        .quantity
                                                }
                                                onChange={(
                                                    event,
                                                ) => {
                                                    updateCartQuantity(
                                                        item
                                                            .stock_batch_id,

                                                        item
                                                            .sale_unit,

                                                        Number(
                                                            event
                                                                .target
                                                                .value,
                                                        ),
                                                    );
                                                }}
                                            />

                                            <button
                                                type="button"
                                                className="quantity-button"
                                                aria-label={`Increase ${item.product_name
                                                    } ${item.sale_unit
                                                    } quantity`}
                                                disabled={
                                                    item.quantity
                                                    >= item
                                                        .available_quantity
                                                    - 0.0001
                                                }
                                                onClick={() => {
                                                    updateCartQuantity(
                                                        item
                                                            .stock_batch_id,

                                                        item
                                                            .sale_unit,

                                                        Math.min(
                                                            item
                                                                .available_quantity,

                                                            normaliseQuantity(
                                                                item
                                                                    .quantity
                                                                + 1,
                                                            ),
                                                        ),
                                                    );
                                                }}
                                            >
                                                <Icon name="plus" />
                                            </button>

                                            <strong className="line-total">
                                                {currencyFormatter.format(
                                                    Math.max(
                                                        0,
                                                        lineTotal,
                                                    ),
                                                )}
                                            </strong>
                                        </div>

                                        <label className="discount-row">
                                            <span>
                                                Item Discount
                                                (LKR)
                                            </span>

                                            <input
                                                type="number"
                                                className="number-input"
                                                min="0"
                                                max={
                                                    item.quantity
                                                    * item
                                                        .selling_price
                                                }
                                                step="0.01"
                                                value={
                                                    item
                                                        .discount
                                                }
                                                onChange={(
                                                    event,
                                                ) => {
                                                    updateItemDiscount(
                                                        item
                                                            .stock_batch_id,

                                                        item
                                                            .sale_unit,

                                                        Number(
                                                            event
                                                                .target
                                                                .value,
                                                        ),
                                                    );
                                                }}
                                            />
                                        </label>
                                    </article>
                                );
                            },
                        )
                    )}
                </div>

                <div className="cart-summary">
                    <label className="sale-discount">
                        <span>
                            Sale Discount
                            (LKR)
                        </span>

                        <input
                            type="number"
                            className="number-input"
                            min="0"
                            max={
                                subtotal
                            }
                            step="0.01"
                            value={
                                saleDiscount
                            }
                            onChange={(
                                event,
                            ) => {
                                setSaleDiscount(
                                    event
                                        .target
                                        .value,
                                );

                                setCartError(
                                    '',
                                );
                            }}
                        />
                    </label>

                    <div className="summary-row">
                        <span>
                            Items Total
                        </span>

                        <strong>
                            {currencyFormatter.format(
                                subtotal,
                            )}
                        </strong>
                    </div>

                    <div className="summary-row">
                        <span>
                            Sale Discount
                        </span>

                        <strong>
                            -
                            {' '}

                            {currencyFormatter.format(
                                safeSaleDiscount,
                            )}
                        </strong>
                    </div>

                    <div className="grand-total">
                        <span>
                            Amount Due
                        </span>

                        <strong>
                            {currencyFormatter.format(
                                grandTotal,
                            )}
                        </strong>
                    </div>

                    <button
                        type="button"
                        className="payment-button"
                        disabled={
                            cart.length
                            === 0
                            || isSubmitting
                        }
                        onClick={
                            openPayment
                        }
                    >
                        <Icon name="receipt" />

                        {isSubmitting
                            ? 'Processing Sale...'
                            : 'Proceed to Payment'}
                    </button>

                    {cart.length > 0 && (
                        isClearCartConfirming ? (
                            <div className="clear-confirm">
                                <span>
                                    Remove every
                                    item from this
                                    cart?
                                </span>

                                <button
                                    type="button"
                                    className="cancel-button"
                                    disabled={
                                        isSubmitting
                                    }
                                    onClick={() => {
                                        setIsClearCartConfirming(
                                            false,
                                        );
                                    }}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="confirm-button"
                                    disabled={
                                        isSubmitting
                                    }
                                    onClick={
                                        clearCart
                                    }
                                >
                                    Clear
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="clear-button"
                                disabled={
                                    isSubmitting
                                }
                                onClick={() => {
                                    setIsClearCartConfirming(
                                        true,
                                    );
                                }}
                            >
                                <Icon name="trash" />

                                Clear Cart
                            </button>
                        )
                    )}
                </div>
            </aside>

            <BatchSelectionModal
                product={
                    selectedProduct
                }
                onClose={() => {
                    setSelectedProduct(
                        null,
                    );

                    refocusSearch();
                }}
                onAdd={
                    addBatchToCart
                }
            />

            <PaymentModal
                isOpen={
                    isPaymentOpen
                }
                grandTotal={
                    grandTotal
                }
                discount={
                    safeSaleDiscount
                }
                isSubmitting={
                    isSubmitting
                }
                errorMessage={
                    paymentError
                }
                onClose={() => {
                    if (
                        !isSubmitting
                    ) {
                        setIsPaymentOpen(
                            false,
                        );

                        setPaymentError(
                            '',
                        );
                    }
                }}
                onSubmit={(
                    values,
                ) => {
                    void submitSale(
                        values,
                    );
                }}
            />

            <SaleReceiptModal
                receipt={
                    receipt
                }
                onClose={() => {
                    setReceipt(
                        null,
                    );

                    refocusSearch();
                }}
            />
        </div>
    );
}