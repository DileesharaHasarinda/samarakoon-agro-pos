import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {
    FormEvent,
    KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import type {
    PosProduct,
    PosSaleOption,
    PosStockBatch,
} from '../../types/sale';

/* =========================================================
   PROPS
   ========================================================= */

interface BatchSelectionModalProps {
    product: PosProduct | null;

    onClose: () => void;

    onAdd: (
        product: PosProduct,
        batch: PosStockBatch,
        quantity: number,
        saleOption: PosSaleOption,
    ) => void;
}

/* =========================================================
   VARIANT COMPATIBILITY TYPES
   ========================================================= */

interface PosVariantView {
    id: number;

    product_id?: number;

    display_name?: string;

    size_value?: number | string;

    size_unit?: string;

    package_unit?: string;

    sku?: string | null;

    barcode?: string | null;

    is_active?: boolean;

    sort_order?: number;

    stock_unit?: string;

    total_available_quantity?: number;

    minimum_price?: number | null;

    maximum_price?: number | null;

    batches_count?: number;

    has_stock?: boolean;
}

type VariantAwareProduct =
    PosProduct & {
        has_variants?: boolean;

        variants?: PosVariantView[];
    };

type VariantAwareBatch =
    PosStockBatch & {
        product_variant_id?:
        number | null;

        variant?:
        PosVariantView | null;
    };

/* =========================================================
   ICONS
   ========================================================= */

type IconName =
    | 'alert'
    | 'bag'
    | 'calendar'
    | 'check'
    | 'close'
    | 'cost'
    | 'kg'
    | 'keyboard'
    | 'minus'
    | 'package'
    | 'plus'
    | 'scale'
    | 'shopping-cart'
    | 'tag';

function Icon({
    name,
}: {
    name: IconName;
}) {
    const props = {
        viewBox:
            '0 0 24 24',

        fill:
            'none',

        stroke:
            'currentColor',

        strokeWidth:
            2,

        strokeLinecap:
            'round' as const,

        strokeLinejoin:
            'round' as const,

        'aria-hidden':
            true,

        focusable:
            false,
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

        case 'calendar':
            return (
                <svg {...props}>
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="16"
                        rx="2"
                    />

                    <path d="M16 3v4M8 3v4M3 11h18" />
                </svg>
            );

        case 'check':
            return (
                <svg {...props}>
                    <path d="m5 12 4 4L19 6" />
                </svg>
            );

        case 'close':
            return (
                <svg {...props}>
                    <path d="m6 6 12 12M18 6 6 18" />
                </svg>
            );

        case 'cost':
            return (
                <svg {...props}>
                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                    />

                    <path d="M16 8.5c-.8-.7-2-1-3.3-1-1.8 0-3.2.9-3.2 2.2 0 1.4 1.4 1.9 3.2 2.3 1.8.4 3.2.9 3.2 2.4 0 1.4-1.4 2.3-3.4 2.3-1.5 0-2.8-.4-3.7-1.2" />

                    <path d="M12.5 5.5v13" />
                </svg>
            );

        case 'kg':
            return (
                <svg {...props}>
                    <path d="M6 5h12l2 15H4Z" />
                    <path d="M9 5a3 3 0 0 1 6 0" />
                    <path d="M8.5 14h7" />
                    <path d="M10 11.5 8.5 14 10 16.5" />
                </svg>
            );

        case 'keyboard':
            return (
                <svg {...props}>
                    <rect
                        x="3"
                        y="6"
                        width="18"
                        height="12"
                        rx="2"
                    />

                    <path d="M7 10h.01M11 10h.01M15 10h.01M18 10h.01M7 14h.01M11 14h6" />
                </svg>
            );

        case 'minus':
            return (
                <svg {...props}>
                    <path d="M5 12h14" />
                </svg>
            );

        case 'package':
            return (
                <svg {...props}>
                    <path d="m21 8-9 5-9-5 9-5 9 5Z" />
                    <path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" />
                </svg>
            );

        case 'plus':
            return (
                <svg {...props}>
                    <path d="M12 5v14M5 12h14" />
                </svg>
            );

        case 'scale':
            return (
                <svg {...props}>
                    <path d="M12 3v18" />
                    <path d="M5 7h14" />
                    <path d="m5 7-3 6h6Z" />
                    <path d="m19 7-3 6h6Z" />
                    <path d="M8 21h8" />
                </svg>
            );

        case 'tag':
            return (
                <svg {...props}>
                    <path d="M20 13 13 20 4 11V4h7Z" />
                    <path d="M8.5 8.5h.01" />
                </svg>
            );

        case 'shopping-cart':
        default:
            return (
                <svg {...props}>
                    <circle
                        cx="9"
                        cy="20"
                        r="1"
                    />

                    <circle
                        cx="18"
                        cy="20"
                        r="1"
                    />

                    <path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
                </svg>
            );
    }
}

/* =========================================================
   FORMATTERS
   ========================================================= */

const currencyFormatter =
    new Intl.NumberFormat(
        'en-LK',
        {
            style:
                'currency',

            currency:
                'LKR',

            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2,
        },
    );

const quantityFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            minimumFractionDigits:
                0,

            maximumFractionDigits:
                3,
        },
    );

/* =========================================================
   HELPERS
   ========================================================= */

function normaliseQuantity(
    value: number,
): number {
    return Number(
        value.toFixed(
            3,
        ),
    );
}

function normaliseUnit(
    value:
        | string
        | null
        | undefined,
): string {
    return String(
        value
        ?? '',
    )
        .trim()
        .toLowerCase();
}

function formatQuantity(
    value:
        | number
        | string
        | null
        | undefined,
): string {
    const numericValue =
        Number(
            value
            ?? 0,
        );

    if (
        !Number.isFinite(
            numericValue,
        )
    ) {
        return '0';
    }

    return quantityFormatter
        .format(
            numericValue,
        );
}

function formatDate(
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
            `${value.substring(0, 10)}T00:00:00`,
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
            day:
                '2-digit',

            month:
                'short',

            year:
                'numeric',
        },
    ).format(
        date,
    );
}

function isWholeNumber(
    value: number,
): boolean {
    return Math.abs(
        value
        - Math.round(
            value,
        ),
    ) < 0.0001;
}

/* =========================================================
   PRODUCT VARIANT HELPERS
   ========================================================= */

function getProductVariants(
    product:
        PosProduct,
): PosVariantView[] {
    const extendedProduct =
        product as
        VariantAwareProduct;

    if (
        !Array.isArray(
            extendedProduct
                .variants,
        )
    ) {
        return [];
    }

    return extendedProduct
        .variants
        .filter(
            (
                variant,
            ) =>
                variant.is_active
                !== false,
        )
        .sort(
            (
                a,
                b,
            ) =>
                Number(
                    a.sort_order
                    ?? 0,
                )
                - Number(
                    b.sort_order
                    ?? 0,
                ),
        );
}

function productHasVariants(
    product:
        PosProduct,
): boolean {
    const extendedProduct =
        product as
        VariantAwareProduct;

    return (
        extendedProduct
            .has_variants
        === true
        || getProductVariants(
            product,
        ).length > 0
    );
}

function getBatchVariantId(
    batch:
        PosStockBatch,
): number | null {
    const extendedBatch =
        batch as
        VariantAwareBatch;

    const raw =
        extendedBatch
            .product_variant_id
        ?? extendedBatch
            .variant
            ?.id
        ?? null;

    if (
        raw === null
        || raw === undefined
    ) {
        return null;
    }

    const id =
        Number(
            raw,
        );

    return (
        Number.isFinite(
            id,
        )
        && id > 0
    )
        ? id
        : null;
}

function getBatchVariant(
    batch:
        PosStockBatch,
): PosVariantView | null {
    return (
        batch as
        VariantAwareBatch
    ).variant
        ?? null;
}

function variantName(
    variant:
        PosVariantView,
): string {
    const displayName =
        String(
            variant
                .display_name
            ?? '',
        )
            .trim();

    if (
        displayName
        !== ''
    ) {
        return displayName;
    }

    const sizeValue =
        variant.size_value
            === null
            || variant.size_value
            === undefined
            ? ''
            : formatQuantity(
                variant
                    .size_value,
            );

    const sizeUnit =
        String(
            variant
                .size_unit
            ?? '',
        )
            .trim();

    const packageUnit =
        String(
            variant
                .package_unit
            ?? '',
        )
            .trim();

    return [
        `${sizeValue}${sizeUnit}`
            .trim(),

        packageUnit,
    ]
        .filter(
            Boolean,
        )
        .join(
            ' ',
        )
        || `Variant #${variant.id}`;
}

function variantPriceText(
    variant:
        PosVariantView,
): string {
    const minimum =
        variant
            .minimum_price;

    const maximum =
        variant
            .maximum_price;

    if (
        minimum === null
        || minimum === undefined
    ) {
        return 'No selling price';
    }

    if (
        maximum === null
        || maximum === undefined
        || Math.abs(
            Number(
                maximum,
            )
            - Number(
                minimum,
            ),
        ) < 0.005
    ) {
        return currencyFormatter
            .format(
                Number(
                    minimum,
                ),
            );
    }

    return (
        `${currencyFormatter.format(
            Number(
                minimum,
            ),
        )}`
        + ' – '
        + `${currencyFormatter.format(
            Number(
                maximum,
            ),
        )}`
    );
}

function batchesForVariant(
    product:
        PosProduct,
    variantId:
        number,
): PosStockBatch[] {
    return product
        .batches
        .filter(
            (
                batch,
            ) =>
                getBatchVariantId(
                    batch,
                )
                === variantId,
        );
}

/* =========================================================
   SALE OPTION HELPERS
   ========================================================= */

function getFallbackSaleOption(
    product:
        PosProduct,
    batch:
        PosStockBatch,
): PosSaleOption {
    const variant =
        getBatchVariant(
            batch,
        );

    const primaryUnit =
        variant
            ?.package_unit
        || batch
            .primary_unit
        || product
            .primary_unit
        || product
            .unit
        || 'Unit';

    const availableQuantity =
        batch.is_dual_unit
            ? Number(
                batch
                    .available_primary_quantity
                ?? 0,
            )
            : Number(
                batch
                    .available_quantity
                ?? 0,
            );

    return {
        key:
            'primary',

        label:
            batch.is_dual_unit
                ? `Full ${primaryUnit}`
                : primaryUnit,

        unit:
            primaryUnit,

        selling_price:
            Number(
                batch
                    .selling_price
                ?? 0,
            ),

        purchase_cost:
            Number(
                batch
                    .purchase_cost
                ?? 0,
            ),

        conversion_factor:
            batch.is_dual_unit
                ? Number(
                    batch
                        .conversion_factor
                    ?? 1,
                )
                : 1,

        stock_quantity_per_unit:
            batch.is_dual_unit
                ? Number(
                    batch
                        .conversion_factor
                    ?? 1,
                )
                : 1,

        available_quantity:
            availableQuantity,

        available_stock_quantity:
            Number(
                batch
                    .available_quantity
                ?? 0,
            ),

        stock_unit:
            batch
                .stock_unit
            || primaryUnit,

        quantity_step:
            batch.is_dual_unit
                ? 1
                : 0.001,

        allow_decimal_quantity:
            !batch
                .is_dual_unit,
    };
}

function getSaleOptions(
    product:
        PosProduct,
    batch:
        PosStockBatch,
): PosSaleOption[] {
    if (
        Array.isArray(
            batch
                .sale_options,
        )
        && batch
            .sale_options
            .length > 0
    ) {
        return batch
            .sale_options
            .map(
                (
                    option,
                ) => ({
                    ...option,

                    selling_price:
                        Number(
                            option
                                .selling_price
                            ?? 0,
                        ),

                    purchase_cost:
                        Number(
                            option
                                .purchase_cost
                            ?? 0,
                        ),

                    conversion_factor:
                        Number(
                            option
                                .conversion_factor
                            ?? 1,
                        ),

                    stock_quantity_per_unit:
                        Number(
                            option
                                .stock_quantity_per_unit
                            ?? option
                                .conversion_factor
                            ?? 1,
                        ),

                    available_quantity:
                        Number(
                            option
                                .available_quantity
                            ?? 0,
                        ),

                    available_stock_quantity:
                        Number(
                            option
                                .available_stock_quantity
                            ?? batch
                                .available_quantity
                            ?? 0,
                        ),
                }),
            );
    }

    return [
        getFallbackSaleOption(
            product,
            batch,
        ),
    ];
}

function hasSellableStock(
    product:
        PosProduct,
    batch:
        PosStockBatch,
): boolean {
    if (
        batch.is_expired
    ) {
        return false;
    }

    return getSaleOptions(
        product,
        batch,
    )
        .some(
            (
                option,
            ) =>
                Number(
                    option
                        .available_quantity
                    ?? 0,
                ) > 0,
        );
}

function createInitialQuantity(
    option:
        PosSaleOption | null,
): string {
    if (!option) {
        return '';
    }

    const available =
        Number(
            option
                .available_quantity
            ?? 0,
        );

    if (
        !Number.isFinite(
            available,
        )
        || available <= 0
    ) {
        return '';
    }

    if (
        option
            .allow_decimal_quantity
    ) {
        return String(
            normaliseQuantity(
                Math.min(
                    1,
                    available,
                ),
            ),
        );
    }

    return '1';
}

/* =========================================================
   SCOPED CSS
   ========================================================= */

const batchModalStyles = `
#pos-batch-modal,
#pos-batch-modal *,
#pos-batch-modal *::before,
#pos-batch-modal *::after {
    box-sizing: border-box !important;
}

#pos-batch-modal {
    --green-950: #052e16;
    --green-900: #14532d;
    --green-800: #166534;
    --green-700: #15803d;
    --green-100: #dcfce7;
    --green-50: #f0fdf4;

    --blue-700: #175cd3;
    --blue-100: #d1e9ff;
    --blue-50: #eff8ff;

    --amber-800: #93370d;
    --amber-100: #fedf89;
    --amber-50: #fffaeb;

    --red-700: #b42318;
    --red-100: #fecdca;
    --red-50: #fef3f2;

    --text: #101828;
    --text-2: #344054;
    --muted: #667085;
    --border: #d0d5dd;

    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;

    width: 100vw !important;
    height: 100dvh !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: hidden !important;

    color: var(--text) !important;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif !important;

    font-size: 16px !important;
    line-height: 1.5 !important;

    isolation: isolate !important;
}

#pos-batch-modal button,
#pos-batch-modal input {
    font: inherit !important;
}

#pos-batch-modal h2,
#pos-batch-modal h3,
#pos-batch-modal p {
    margin: 0 !important;
}

#pos-batch-modal svg {
    display: block !important;
    width: 18px !important;
    height: 18px !important;
}

#pos-batch-modal button:focus,
#pos-batch-modal input:focus {
    outline: none !important;
}

#pos-batch-modal button:focus-visible,
#pos-batch-modal input:focus-visible {
    box-shadow:
        0 0 0 4px
        rgba(
            46,
            144,
            250,
            .20
        ) !important;
}

#pos-batch-modal .bsm-backdrop {
    position: absolute !important;
    inset: 0 !important;

    display: flex !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 20px !important;

    overflow-y: auto !important;

    background:
        rgba(
            3,
            18,
            10,
            .74
        ) !important;

    backdrop-filter:
        blur(4px) !important;
}

#pos-batch-modal .bsm-dialog {
    display: flex !important;

    width:
        min(
            1050px,
            100%
        ) !important;

    max-height:
        calc(
            100dvh - 40px
        ) !important;

    min-height: 0 !important;

    flex-direction:
        column !important;

    overflow:
        hidden !important;

    background:
        #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius:
        18px !important;

    box-shadow:
        0 30px 80px
        rgba(
            0,
            0,
            0,
            .35
        ) !important;
}

/* HEADER */

#pos-batch-modal .bsm-header {
    display: flex !important;

    flex: 0 0 auto !important;

    align-items:
        center !important;

    justify-content:
        space-between !important;

    gap: 20px !important;

    padding:
        18px 22px !important;

    color:
        #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--green-900),
            var(--green-700)
        ) !important;
}

#pos-batch-modal .bsm-eyebrow {
    display:
        block !important;

    color:
        #bbf7d0 !important;

    font-size:
        12px !important;

    font-weight:
        800 !important;

    text-transform:
        uppercase !important;
}

#pos-batch-modal .bsm-title {
    margin-top:
        2px !important;

    color:
        #ffffff !important;

    font-size:
        26px !important;

    font-weight:
        850 !important;
}

#pos-batch-modal .bsm-header-summary {
    display: flex !important;

    flex-wrap:
        wrap !important;

    gap: 7px !important;

    margin-top:
        8px !important;
}

#pos-batch-modal .bsm-chip {
    display:
        inline-flex !important;

    align-items:
        center !important;

    gap: 5px !important;

    padding:
        4px 9px !important;

    color:
        #e8fff0 !important;

    font-size:
        12px !important;

    font-weight:
        750 !important;

    background:
        rgba(
            255,
            255,
            255,
            .11
        ) !important;

    border:
        1px solid
        rgba(
            255,
            255,
            255,
            .25
        ) !important;

    border-radius:
        999px !important;
}

#pos-batch-modal .bsm-chip.variant {
    color:
        #fff0a8 !important;
}

#pos-batch-modal .bsm-keyboard-help {
    display: flex !important;

    align-items:
        center !important;

    gap: 6px !important;

    margin-top:
        8px !important;

    color:
        #e8fff0 !important;

    font-size:
        11px !important;

    font-weight:
        700 !important;
}

#pos-batch-modal .bsm-key {
    display:
        inline-flex !important;

    padding:
        2px 7px !important;

    color:
        var(--green-950) !important;

    font-size:
        10px !important;

    font-weight:
        850 !important;

    background:
        #ffffff !important;

    border-radius:
        5px !important;
}

#pos-batch-modal .bsm-close {
    display:
        grid !important;

    width:
        44px !important;

    height:
        44px !important;

    min-width:
        44px !important;

    place-items:
        center !important;

    padding:
        0 !important;

    color:
        #ffffff !important;

    background:
        rgba(
            255,
            255,
            255,
            .12
        ) !important;

    border:
        1px solid
        rgba(
            255,
            255,
            255,
            .35
        ) !important;

    border-radius:
        10px !important;

    cursor:
        pointer !important;
}

/* BODY */

#pos-batch-modal .bsm-form {
    display: flex !important;

    min-height: 0 !important;

    flex: 1 1 auto !important;

    flex-direction:
        column !important;

    overflow:
        hidden !important;
}

#pos-batch-modal .bsm-body {
    display: flex !important;

    min-height: 0 !important;

    flex: 1 1 auto !important;

    flex-direction:
        column !important;

    gap: 15px !important;

    padding:
        18px !important;

    overflow-y:
        auto !important;

    background:
        #f4f7f5 !important;
}

#pos-batch-modal .bsm-error {
    display: flex !important;

    align-items:
        flex-start !important;

    gap: 9px !important;

    padding:
        12px 14px !important;

    color:
        var(--red-700) !important;

    font-size:
        14px !important;

    font-weight:
        750 !important;

    background:
        var(--red-50) !important;

    border:
        1px solid
        var(--red-100) !important;

    border-radius:
        10px !important;
}

/* SECTION */

#pos-batch-modal .bsm-section {
    padding:
        17px !important;

    background:
        #ffffff !important;

    border:
        1px solid
        #d9e1dc !important;

    border-radius:
        14px !important;
}

#pos-batch-modal .bsm-section-heading {
    display: flex !important;

    align-items:
        flex-start !important;

    gap: 11px !important;

    padding-bottom:
        13px !important;

    border-bottom:
        1px solid
        #e8ece9 !important;
}

#pos-batch-modal .bsm-step {
    display:
        grid !important;

    width:
        35px !important;

    height:
        35px !important;

    min-width:
        35px !important;

    place-items:
        center !important;

    color:
        #ffffff !important;

    font-size:
        14px !important;

    font-weight:
        850 !important;

    background:
        var(--green-700) !important;

    border-radius:
        9px !important;
}

#pos-batch-modal .bsm-step.complete {
    background:
        var(--green-800) !important;
}

#pos-batch-modal .bsm-section-title {
    color:
        var(--text) !important;

    font-size:
        18px !important;

    font-weight:
        850 !important;
}

#pos-batch-modal .bsm-section-help {
    margin-top:
        3px !important;

    color:
        var(--muted) !important;

    font-size:
        13px !important;
}

/* =========================================================
   VARIANT GATE
   ========================================================= */

#pos-batch-modal .bsm-variant-gate {
    padding:
        18px !important;

    background:
        #ffffff !important;

    border:
        2px solid
        #b8dfc3 !important;

    border-radius:
        16px !important;
}

#pos-batch-modal .bsm-variant-gate-title {
    display: flex !important;

    align-items:
        center !important;

    gap: 10px !important;
}

#pos-batch-modal .bsm-variant-gate-icon {
    display:
        grid !important;

    width:
        44px !important;

    height:
        44px !important;

    place-items:
        center !important;

    color:
        var(--green-800) !important;

    background:
        var(--green-100) !important;

    border-radius:
        11px !important;
}

#pos-batch-modal .bsm-variant-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            3,
            minmax(
                0,
                1fr
            )
        ) !important;

    gap: 12px !important;

    margin-top:
        16px !important;
}

#pos-batch-modal .bsm-variant-card {
    display: flex !important;

    min-width:
        0 !important;

    min-height:
        165px !important;

    flex-direction:
        column !important;

    gap: 9px !important;

    padding:
        14px !important;

    color:
        var(--text) !important;

    text-align:
        left !important;

    background:
        #ffffff !important;

    border:
        2px solid
        var(--border) !important;

    border-radius:
        12px !important;

    cursor:
        pointer !important;
}

#pos-batch-modal .bsm-variant-card:hover:not(:disabled) {
    border-color:
        var(--green-700) !important;

    background:
        var(--green-50) !important;
}

#pos-batch-modal .bsm-variant-card:disabled {
    opacity:
        .48 !important;

    cursor:
        not-allowed !important;
}

#pos-batch-modal .bsm-variant-name {
    display: block !important;

    color:
        var(--text) !important;

    font-size:
        20px !important;

    font-weight:
        900 !important;
}

#pos-batch-modal .bsm-variant-price {
    display: block !important;

    color:
        var(--green-800) !important;

    font-size:
        21px !important;

    font-weight:
        900 !important;
}

#pos-batch-modal .bsm-variant-stock {
    display: block !important;

    color:
        var(--text-2) !important;

    font-size:
        13px !important;

    font-weight:
        750 !important;
}

#pos-batch-modal .bsm-variant-meta {
    margin-top:
        auto !important;

    color:
        var(--muted) !important;

    font-size:
        11px !important;
}

/* SELECTED VARIANT */

#pos-batch-modal .bsm-selected-variant {
    display: flex !important;

    align-items:
        center !important;

    justify-content:
        space-between !important;

    gap: 14px !important;

    padding:
        13px 15px !important;

    color:
        var(--green-900) !important;

    background:
        var(--green-50) !important;

    border:
        1px solid
        #a8d6b4 !important;

    border-radius:
        11px !important;
}

#pos-batch-modal .bsm-selected-variant-copy {
    display: flex !important;

    align-items:
        center !important;

    gap: 9px !important;
}

#pos-batch-modal .bsm-selected-variant strong {
    display: block !important;

    font-size:
        16px !important;

    font-weight:
        850 !important;
}

#pos-batch-modal .bsm-selected-variant span {
    display: block !important;

    font-size:
        12px !important;
}

#pos-batch-modal .bsm-change-variant {
    min-height:
        38px !important;

    padding:
        7px 11px !important;

    color:
        var(--green-900) !important;

    font-size:
        12px !important;

    font-weight:
        800 !important;

    background:
        #ffffff !important;

    border:
        1px solid
        #8fc69e !important;

    border-radius:
        8px !important;

    cursor:
        pointer !important;
}

/* =========================================================
   BATCH + UNIT CARDS
   ========================================================= */

#pos-batch-modal .bsm-batches,
#pos-batch-modal .bsm-unit-options {
    display: grid !important;

    grid-template-columns:
        repeat(
            2,
            minmax(
                0,
                1fr
            )
        ) !important;

    gap: 11px !important;

    margin-top:
        14px !important;
}

#pos-batch-modal .bsm-unit-options.single {
    grid-template-columns:
        1fr !important;
}

#pos-batch-modal .bsm-batch-card,
#pos-batch-modal .bsm-unit-card {
    display: flex !important;

    min-width:
        0 !important;

    flex-direction:
        column !important;

    gap: 10px !important;

    padding:
        14px !important;

    color:
        var(--text) !important;

    text-align:
        left !important;

    background:
        #ffffff !important;

    border:
        2px solid
        var(--border) !important;

    border-radius:
        12px !important;

    cursor:
        pointer !important;
}

#pos-batch-modal .bsm-batch-card {
    min-height:
        180px !important;
}

#pos-batch-modal .bsm-unit-card {
    min-height:
        205px !important;
}

#pos-batch-modal .bsm-batch-card:hover:not(:disabled),
#pos-batch-modal .bsm-unit-card:hover:not(:disabled) {
    border-color:
        #83b993 !important;
}

#pos-batch-modal .bsm-batch-card.selected,
#pos-batch-modal .bsm-unit-card.selected {
    border-color:
        var(--green-700) !important;

    background:
        var(--green-50) !important;
}

#pos-batch-modal .bsm-batch-card.expired {
    background:
        var(--red-50) !important;

    border-color:
        var(--red-100) !important;

    cursor:
        not-allowed !important;
}

#pos-batch-modal .bsm-batch-top,
#pos-batch-modal .bsm-unit-top {
    display: flex !important;

    align-items:
        flex-start !important;

    justify-content:
        space-between !important;

    gap: 10px !important;
}

#pos-batch-modal .bsm-batch-code,
#pos-batch-modal .bsm-unit-name {
    display: block !important;

    font-size:
        17px !important;

    font-weight:
        850 !important;
}

#pos-batch-modal .bsm-batch-number {
    display: block !important;

    margin-top:
        2px !important;

    color:
        var(--muted) !important;

    font-size:
        12px !important;
}

#pos-batch-modal .bsm-batch-variant {
    display:
        inline-flex !important;

    margin-top:
        5px !important;

    padding:
        3px 7px !important;

    color:
        var(--green-900) !important;

    font-size:
        10px !important;

    font-weight:
        800 !important;

    background:
        var(--green-50) !important;

    border-radius:
        999px !important;
}

#pos-batch-modal .bsm-selected-icon {
    display:
        grid !important;

    width:
        30px !important;

    height:
        30px !important;

    min-width:
        30px !important;

    place-items:
        center !important;

    color:
        #ffffff !important;

    background:
        var(--green-700) !important;

    border-radius:
        50% !important;
}

#pos-batch-modal .bsm-expired-badge {
    display:
        inline-flex !important;

    padding:
        4px 8px !important;

    color:
        var(--red-700) !important;

    font-size:
        11px !important;

    font-weight:
        800 !important;

    background:
        #ffffff !important;

    border-radius:
        999px !important;
}

#pos-batch-modal .bsm-info-grid,
#pos-batch-modal .bsm-unit-details {
    display: grid !important;

    grid-template-columns:
        repeat(
            2,
            minmax(
                0,
                1fr
            )
        ) !important;

    gap: 8px !important;

    margin-top:
        auto !important;
}

#pos-batch-modal .bsm-info-box,
#pos-batch-modal .bsm-unit-detail {
    padding:
        8px 9px !important;

    background:
        #f8faf9 !important;

    border:
        1px solid
        #e5ebe7 !important;

    border-radius:
        8px !important;
}

#pos-batch-modal .bsm-info-box.cost,
#pos-batch-modal .bsm-unit-detail.cost {
    background:
        var(--amber-50) !important;

    border-color:
        var(--amber-100) !important;
}

#pos-batch-modal .bsm-info-label,
#pos-batch-modal .bsm-unit-detail span {
    display: block !important;

    color:
        var(--muted) !important;

    font-size:
        10px !important;

    font-weight:
        800 !important;

    text-transform:
        uppercase !important;
}

#pos-batch-modal .bsm-info-value,
#pos-batch-modal .bsm-unit-detail strong {
    display: block !important;

    margin-top:
        2px !important;

    color:
        var(--text-2) !important;

    font-size:
        13px !important;

    font-weight:
        750 !important;
}

#pos-batch-modal .bsm-unit-identity {
    display: flex !important;

    align-items:
        flex-start !important;

    gap: 10px !important;
}

#pos-batch-modal .bsm-unit-icon {
    display:
        grid !important;

    width:
        42px !important;

    height:
        42px !important;

    min-width:
        42px !important;

    place-items:
        center !important;

    color:
        var(--green-800) !important;

    background:
        var(--green-100) !important;

    border-radius:
        10px !important;
}

#pos-batch-modal .bsm-unit-price {
    display: block !important;

    margin-top:
        3px !important;

    color:
        var(--green-800) !important;

    font-size:
        21px !important;

    font-weight:
        900 !important;
}

#pos-batch-modal .bsm-unit-price small {
    color:
        var(--muted) !important;

    font-size:
        12px !important;
}

#pos-batch-modal .bsm-unit-cost {
    display: block !important;

    margin-top:
        4px !important;

    color:
        var(--amber-800) !important;

    font-size:
        13px !important;

    font-weight:
        800 !important;
}

/* EMPTY */

#pos-batch-modal .bsm-empty {
    display: flex !important;

    min-height:
        130px !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    flex-direction:
        column !important;

    gap: 7px !important;

    margin-top:
        14px !important;

    padding:
        22px !important;

    color:
        var(--muted) !important;

    text-align:
        center !important;

    background:
        #f8faf9 !important;

    border:
        1px dashed
        #b7c2ba !important;

    border-radius:
        10px !important;
}

/* QUANTITY */

#pos-batch-modal .bsm-quantity {
    display: grid !important;

    grid-template-columns:
        minmax(
            0,
            1fr
        )
        auto !important;

    align-items:
        center !important;

    gap: 18px !important;

    margin-top:
        14px !important;
}

#pos-batch-modal .bsm-quantity-label {
    display: block !important;

    color:
        var(--text-2) !important;

    font-size:
        15px !important;

    font-weight:
        800 !important;
}

#pos-batch-modal .bsm-quantity-help {
    display: block !important;

    margin-top:
        4px !important;

    color:
        var(--muted) !important;

    font-size:
        13px !important;
}

#pos-batch-modal .bsm-quantity-controls {
    display: grid !important;

    grid-template-columns:
        48px
        150px
        48px !important;

    gap: 8px !important;
}

#pos-batch-modal .bsm-quantity-button {
    display:
        grid !important;

    width:
        48px !important;

    height:
        48px !important;

    place-items:
        center !important;

    padding:
        0 !important;

    color:
        var(--green-900) !important;

    background:
        var(--green-50) !important;

    border:
        1px solid
        #a8d6b4 !important;

    border-radius:
        10px !important;

    cursor:
        pointer !important;
}

#pos-batch-modal .bsm-quantity-button:disabled {
    opacity:
        .4 !important;

    cursor:
        not-allowed !important;
}

#pos-batch-modal .bsm-quantity-input {
    width:
        100% !important;

    height:
        48px !important;

    padding:
        0 8px !important;

    color:
        var(--text) !important;

    font-size:
        18px !important;

    font-weight:
        850 !important;

    text-align:
        center !important;

    background:
        #ffffff !important;

    border:
        2px solid
        #b7c2ba !important;

    border-radius:
        10px !important;
}

/* TOTAL */

#pos-batch-modal .bsm-total {
    display: grid !important;

    grid-template-columns:
        1fr
        auto !important;

    align-items:
        center !important;

    gap: 20px !important;

    padding:
        15px 18px !important;

    color:
        #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--green-900),
            var(--green-700)
        ) !important;

    border-radius:
        13px !important;
}

#pos-batch-modal .bsm-total-label,
#pos-batch-modal .bsm-total-description {
    display: block !important;

    color:
        #d8f7e1 !important;

    font-size:
        12px !important;
}

#pos-batch-modal .bsm-total-variant {
    display: block !important;

    margin-top:
        3px !important;

    color:
        #fff0a8 !important;

    font-size:
        13px !important;

    font-weight:
        850 !important;
}

#pos-batch-modal .bsm-total-cost {
    display: block !important;

    margin-top:
        4px !important;

    color:
        #fde68a !important;

    font-size:
        12px !important;

    font-weight:
        800 !important;
}

#pos-batch-modal .bsm-total-value {
    color:
        #ffffff !important;

    font-size:
        25px !important;

    font-weight:
        900 !important;

    white-space:
        nowrap !important;
}

/* FOOTER */

#pos-batch-modal .bsm-actions {
    display: flex !important;

    flex: 0 0 auto !important;

    align-items:
        center !important;

    justify-content:
        flex-end !important;

    gap: 10px !important;

    padding:
        13px 18px !important;

    background:
        #ffffff !important;

    border-top:
        1px solid
        #d8e0da !important;
}

#pos-batch-modal .bsm-action-help {
    margin-right:
        auto !important;

    color:
        var(--muted) !important;

    font-size:
        12px !important;

    font-weight:
        650 !important;
}

#pos-batch-modal .bsm-button {
    display:
        inline-flex !important;

    min-height:
        48px !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    gap: 7px !important;

    padding:
        9px 16px !important;

    font-size:
        14px !important;

    font-weight:
        800 !important;

    border-radius:
        10px !important;

    cursor:
        pointer !important;
}

#pos-batch-modal .bsm-cancel {
    color:
        var(--text-2) !important;

    background:
        #ffffff !important;

    border:
        1px solid
        #b7c2ba !important;
}

#pos-batch-modal .bsm-add {
    min-width:
        170px !important;

    color:
        #ffffff !important;

    background:
        var(--green-700) !important;

    border:
        1px solid
        var(--green-700) !important;
}

#pos-batch-modal .bsm-button:disabled {
    opacity:
        .45 !important;

    cursor:
        not-allowed !important;
}

/* RESPONSIVE */

@media (max-width: 850px) {
    #pos-batch-modal .bsm-variant-grid,
    #pos-batch-modal .bsm-batches,
    #pos-batch-modal .bsm-unit-options {
        grid-template-columns:
            1fr !important;
    }

    #pos-batch-modal .bsm-quantity {
        grid-template-columns:
            1fr !important;
    }

    #pos-batch-modal .bsm-quantity-controls {
        grid-template-columns:
            48px
            1fr
            48px !important;
    }

    #pos-batch-modal .bsm-total {
        grid-template-columns:
            1fr !important;
    }
}
`;

/* =========================================================
   COMPONENT
   ========================================================= */

export default function BatchSelectionModal({
    product,
    onClose,
    onAdd,
}: BatchSelectionModalProps) {
    const quantityInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const variantButtonRefs =
        useRef<
            Map<
                number,
                HTMLButtonElement
            >
        >(
            new Map(),
        );

    const batchButtonRefs =
        useRef<
            Map<
                number,
                HTMLButtonElement
            >
        >(
            new Map(),
        );

    const saleOptionButtonRefs =
        useRef<
            Map<
                string,
                HTMLButtonElement
            >
        >(
            new Map(),
        );

    const [
        selectedVariantId,
        setSelectedVariantId,
    ] =
        useState<number | null>(
            null,
        );

    const [
        selectedBatchId,
        setSelectedBatchId,
    ] =
        useState<number | null>(
            null,
        );

    const [
        selectedOptionKey,
        setSelectedOptionKey,
    ] =
        useState<string | null>(
            null,
        );

    const [
        quantity,
        setQuantity,
    ] =
        useState('');

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState('');

    /* =====================================================
       VARIANTS
       ===================================================== */

    const variants =
        useMemo(
            () =>
                product
                    ? getProductVariants(
                        product,
                    )
                    : [],
            [
                product,
            ],
        );

    const isVariantProduct =
        useMemo(
            () =>
                product
                    ? productHasVariants(
                        product,
                    )
                    : false,
            [
                product,
            ],
        );

    const selectedVariant =
        useMemo(
            () =>
                selectedVariantId
                    === null
                    ? null
                    : variants.find(
                        (
                            variant,
                        ) =>
                            variant.id
                            === selectedVariantId,
                    )
                    ?? null,
            [
                variants,
                selectedVariantId,
            ],
        );

    /* =====================================================
       FILTER BATCHES BY SELECTED VARIANT
       ===================================================== */

    const visibleBatches =
        useMemo(
            () => {
                if (!product) {
                    return [];
                }

                /*
                 * NORMAL PRODUCT
                 *
                 * Same as old flow.
                 */
                if (
                    !isVariantProduct
                ) {
                    return product
                        .batches;
                }

                /*
                 * VARIANT PRODUCT
                 *
                 * Before selecting the variant
                 * there must be NO batch shown.
                 */
                if (
                    selectedVariantId
                    === null
                ) {
                    return [];
                }

                /*
                 * Only batches belonging to
                 * selected variant.
                 */
                return batchesForVariant(
                    product,
                    selectedVariantId,
                );
            },
            [
                product,
                isVariantProduct,
                selectedVariantId,
            ],
        );

    const selectableBatches =
        useMemo(
            () => {
                if (!product) {
                    return [];
                }

                return visibleBatches
                    .filter(
                        (
                            batch,
                        ) =>
                            hasSellableStock(
                                product,
                                batch,
                            ),
                    );
            },
            [
                product,
                visibleBatches,
            ],
        );

    const selectedBatch =
        useMemo(
            () =>
                selectedBatchId
                    === null
                    ? null
                    : visibleBatches.find(
                        (
                            batch,
                        ) =>
                            batch.id
                            === selectedBatchId,
                    )
                    ?? null,
            [
                visibleBatches,
                selectedBatchId,
            ],
        );

    /* =====================================================
       SALE OPTIONS
       ===================================================== */

    const saleOptions =
        useMemo(
            () => {
                if (
                    !product
                    || !selectedBatch
                ) {
                    return [];
                }

                return getSaleOptions(
                    product,
                    selectedBatch,
                );
            },
            [
                product,
                selectedBatch,
            ],
        );

    const availableSaleOptions =
        useMemo(
            () =>
                saleOptions
                    .filter(
                        (
                            option,
                        ) =>
                            Number(
                                option
                                    .available_quantity
                                ?? 0,
                            ) > 0,
                    ),
            [
                saleOptions,
            ],
        );

    const selectedSaleOption =
        useMemo(
            () =>
                selectedOptionKey
                    === null
                    ? null
                    : saleOptions.find(
                        (
                            option,
                        ) =>
                            option.key
                            === selectedOptionKey,
                    )
                    ?? null,
            [
                saleOptions,
                selectedOptionKey,
            ],
        );

    /* =====================================================
       TOTALS
       ===================================================== */

    const numericQuantity =
        Number(
            quantity
            || 0,
        );

    const validQuantity =
        Number.isFinite(
            numericQuantity,
        )
            ? numericQuantity
            : 0;

    const itemTotal =
        selectedSaleOption
            ? validQuantity
            * Number(
                selectedSaleOption
                    .selling_price
                ?? 0,
            )
            : 0;

    const itemCostTotal =
        selectedSaleOption
            ? validQuantity
            * Number(
                selectedSaleOption
                    .purchase_cost
                ?? 0,
            )
            : 0;

    /* =====================================================
       FOCUS HELPERS
       ===================================================== */

    const focusVariant =
        (
            variantId:
                number,
        ): void => {
            window.setTimeout(
                () => {
                    variantButtonRefs
                        .current
                        .get(
                            variantId,
                        )
                        ?.focus();
                },
                30,
            );
        };

    const focusBatch =
        (
            batchId:
                number,
        ): void => {
            window.setTimeout(
                () => {
                    batchButtonRefs
                        .current
                        .get(
                            batchId,
                        )
                        ?.focus();
                },
                40,
            );
        };

    const focusSaleOption =
        (
            optionKey:
                string,
        ): void => {
            window.setTimeout(
                () => {
                    saleOptionButtonRefs
                        .current
                        .get(
                            optionKey,
                        )
                        ?.focus();
                },
                50,
            );
        };

    const focusQuantity =
        (): void => {
            window.setTimeout(
                () => {
                    quantityInputRef
                        .current
                        ?.focus();

                    quantityInputRef
                        .current
                        ?.select();
                },
                60,
            );
        };

    /* =====================================================
       RESET WHEN PRODUCT OPENS
       ===================================================== */

    useEffect(
        () => {
            if (!product) {
                return;
            }

            setSelectedVariantId(
                null,
            );

            setSelectedBatchId(
                null,
            );

            setSelectedOptionKey(
                null,
            );

            setQuantity(
                '',
            );

            setErrorMessage(
                '',
            );

            /*
             * =================================================
             * VARIANT PRODUCT
             * =================================================
             *
             * FIRST focus goes to variant.
             *
             * NOT batch.
             */
            if (
                productHasVariants(
                    product,
                )
            ) {
                const firstSellableVariant =
                    getProductVariants(
                        product,
                    )
                        .find(
                            (
                                variant,
                            ) =>
                                batchesForVariant(
                                    product,
                                    variant.id,
                                )
                                    .some(
                                        (
                                            batch,
                                        ) =>
                                            hasSellableStock(
                                                product,
                                                batch,
                                            ),
                                    ),
                        );

                if (
                    firstSellableVariant
                ) {
                    focusVariant(
                        firstSellableVariant
                            .id,
                    );
                }

                return;
            }

            /*
             * =================================================
             * NORMAL PRODUCT
             * =================================================
             *
             * Keep previous batch-first flow.
             */
            const firstBatch =
                product
                    .batches
                    .find(
                        (
                            batch,
                        ) =>
                            hasSellableStock(
                                product,
                                batch,
                            ),
                    );

            if (
                firstBatch
            ) {
                focusBatch(
                    firstBatch.id,
                );
            }
        },
        [
            product,
        ],
    );

    /* =====================================================
       ESCAPE
       ===================================================== */

    useEffect(
        () => {
            if (!product) {
                return;
            }

            const oldOverflow =
                document
                    .body
                    .style
                    .overflow;

            document
                .body
                .style
                .overflow =
                'hidden';

            const handleKeyDown =
                (
                    event:
                        KeyboardEvent,
                ): void => {
                    if (
                        event.key
                        === 'Escape'
                    ) {
                        event.preventDefault();

                        onClose();
                    }
                };

            window.addEventListener(
                'keydown',
                handleKeyDown,
            );

            return () => {
                document
                    .body
                    .style
                    .overflow =
                    oldOverflow;

                window.removeEventListener(
                    'keydown',
                    handleKeyDown,
                );
            };
        },
        [
            product,
            onClose,
        ],
    );

    if (
        !product
        || typeof document
        === 'undefined'
    ) {
        return null;
    }

    /* =====================================================
       SELECT VARIANT
       ===================================================== */

    const confirmVariant =
        (
            variant:
                PosVariantView,
        ): void => {
            /*
             * Get only the selected variant's
             * batches.
             */
            const firstBatch =
                batchesForVariant(
                    product,
                    variant.id,
                )
                    .find(
                        (
                            batch,
                        ) =>
                            hasSellableStock(
                                product,
                                batch,
                            ),
                    );

            if (
                !firstBatch
            ) {
                setErrorMessage(
                    `${variantName(variant)} has no sellable stock.`,
                );

                return;
            }

            /*
             * VARIANT IS NOW CONFIRMED.
             */
            setSelectedVariantId(
                variant.id,
            );

            /*
             * Clear anything after the variant.
             */
            setSelectedBatchId(
                null,
            );

            setSelectedOptionKey(
                null,
            );

            setQuantity(
                '',
            );

            setErrorMessage(
                '',
            );

            /*
             * Continue old flow:
             *
             * Variant
             * ↓
             * Batch
             */
            focusBatch(
                firstBatch.id,
            );
        };

    /* =====================================================
       CHANGE VARIANT
       ===================================================== */

    const changeVariant =
        (): void => {
            setSelectedVariantId(
                null,
            );

            setSelectedBatchId(
                null,
            );

            setSelectedOptionKey(
                null,
            );

            setQuantity(
                '',
            );

            setErrorMessage(
                '',
            );

            const firstVariant =
                variants
                    .find(
                        (
                            variant,
                        ) =>
                            batchesForVariant(
                                product,
                                variant.id,
                            )
                                .some(
                                    (
                                        batch,
                                    ) =>
                                        hasSellableStock(
                                            product,
                                            batch,
                                        ),
                                ),
                    );

            if (
                firstVariant
            ) {
                focusVariant(
                    firstVariant.id,
                );
            }
        };

    /* =====================================================
       SELECT BATCH
       ===================================================== */

    const confirmBatch =
        (
            batch:
                PosStockBatch,
        ): void => {
            /*
             * Safety.
             */
            if (
                isVariantProduct
                && selectedVariant
                === null
            ) {
                setErrorMessage(
                    'Select a variant first.',
                );

                return;
            }

            /*
             * Prevent cross-variant batch.
             */
            if (
                selectedVariant
                && getBatchVariantId(
                    batch,
                )
                !== selectedVariant
                    .id
            ) {
                setErrorMessage(
                    'This batch belongs to another variant.',
                );

                return;
            }

            if (
                batch.is_expired
            ) {
                setErrorMessage(
                    'This stock batch has expired and cannot be sold.',
                );

                return;
            }

            const firstOption =
                getSaleOptions(
                    product,
                    batch,
                )
                    .find(
                        (
                            option,
                        ) =>
                            Number(
                                option
                                    .available_quantity
                                ?? 0,
                            ) > 0,
                    );

            if (
                !firstOption
            ) {
                setErrorMessage(
                    'No selling option is available for this batch.',
                );

                return;
            }

            setSelectedBatchId(
                batch.id,
            );

            setSelectedOptionKey(
                null,
            );

            setQuantity(
                '',
            );

            setErrorMessage(
                '',
            );

            focusSaleOption(
                firstOption.key,
            );
        };

    /* =====================================================
       SELECT SELLING UNIT
       ===================================================== */

    const confirmSaleOption =
        (
            option:
                PosSaleOption,
        ): void => {
            if (
                !selectedBatch
            ) {
                return;
            }

            if (
                Number(
                    option
                        .available_quantity
                    ?? 0,
                ) <= 0
            ) {
                setErrorMessage(
                    `No ${option.unit} stock is available.`,
                );

                return;
            }

            /*
             * Selling price here belongs to
             * selected variant's selected batch.
             */
            setSelectedOptionKey(
                option.key,
            );

            setQuantity(
                createInitialQuantity(
                    option,
                ),
            );

            setErrorMessage(
                '',
            );

            focusQuantity();
        };

    /* =====================================================
       QUANTITY
       ===================================================== */

    const changeQuantity =
        (
            amount:
                number,
        ): void => {
            if (
                !selectedSaleOption
            ) {
                return;
            }

            const maximum =
                Number(
                    selectedSaleOption
                        .available_quantity
                    ?? 0,
                );

            const minimum =
                selectedSaleOption
                    .allow_decimal_quantity
                    ? 0.001
                    : 1;

            let next =
                validQuantity
                + amount;

            next =
                Math.max(
                    minimum,

                    Math.min(
                        maximum,
                        next,
                    ),
                );

            if (
                !selectedSaleOption
                    .allow_decimal_quantity
            ) {
                next =
                    Math.max(
                        1,

                        Math.floor(
                            next,
                        ),
                    );
            }

            setQuantity(
                String(
                    normaliseQuantity(
                        next,
                    ),
                ),
            );

            setErrorMessage(
                '',
            );

            focusQuantity();
        };

    /* =====================================================
       VARIANT KEYBOARD
       ===================================================== */

    const moveVariantFocus =
        (
            currentId:
                number,

            direction:
                number,
        ): void => {
            const availableVariants =
                variants
                    .filter(
                        (
                            variant,
                        ) =>
                            batchesForVariant(
                                product,
                                variant.id,
                            )
                                .some(
                                    (
                                        batch,
                                    ) =>
                                        hasSellableStock(
                                            product,
                                            batch,
                                        ),
                                ),
                    );

            if (
                availableVariants
                    .length === 0
            ) {
                return;
            }

            const currentIndex =
                availableVariants
                    .findIndex(
                        (
                            variant,
                        ) =>
                            variant.id
                            === currentId,
                    );

            const nextIndex =
                (
                    Math.max(
                        currentIndex,
                        0,
                    )
                    + direction
                    + availableVariants
                        .length
                )
                % availableVariants
                    .length;

            focusVariant(
                availableVariants[
                    nextIndex
                ].id,
            );
        };

    const handleVariantKeyDown =
        (
            event:
                ReactKeyboardEvent<HTMLButtonElement>,

            variant:
                PosVariantView,
        ): void => {
            if (
                event.key
                === 'Enter'
            ) {
                event.preventDefault();

                confirmVariant(
                    variant,
                );

                return;
            }

            if (
                event.key
                === 'ArrowRight'
                || event.key
                === 'ArrowDown'
            ) {
                event.preventDefault();

                moveVariantFocus(
                    variant.id,
                    1,
                );
            }

            if (
                event.key
                === 'ArrowLeft'
                || event.key
                === 'ArrowUp'
            ) {
                event.preventDefault();

                moveVariantFocus(
                    variant.id,
                    -1,
                );
            }
        };

    /* =====================================================
       BATCH KEYBOARD
       ===================================================== */

    const moveBatchFocus =
        (
            currentId:
                number,

            direction:
                number,
        ): void => {
            if (
                selectableBatches
                    .length === 0
            ) {
                return;
            }

            const currentIndex =
                selectableBatches
                    .findIndex(
                        (
                            batch,
                        ) =>
                            batch.id
                            === currentId,
                    );

            const nextIndex =
                (
                    Math.max(
                        currentIndex,
                        0,
                    )
                    + direction
                    + selectableBatches
                        .length
                )
                % selectableBatches
                    .length;

            focusBatch(
                selectableBatches[
                    nextIndex
                ].id,
            );
        };

    const handleBatchKeyDown =
        (
            event:
                ReactKeyboardEvent<HTMLButtonElement>,

            batch:
                PosStockBatch,
        ): void => {
            if (
                event.key
                === 'Enter'
            ) {
                event.preventDefault();

                confirmBatch(
                    batch,
                );

                return;
            }

            if (
                event.key
                === 'ArrowRight'
                || event.key
                === 'ArrowDown'
            ) {
                event.preventDefault();

                moveBatchFocus(
                    batch.id,
                    1,
                );
            }

            if (
                event.key
                === 'ArrowLeft'
                || event.key
                === 'ArrowUp'
            ) {
                event.preventDefault();

                moveBatchFocus(
                    batch.id,
                    -1,
                );
            }
        };

    /* =====================================================
       SALE OPTION KEYBOARD
       ===================================================== */

    const moveSaleOptionFocus =
        (
            currentKey:
                string,

            direction:
                number,
        ): void => {
            if (
                availableSaleOptions
                    .length === 0
            ) {
                return;
            }

            const currentIndex =
                availableSaleOptions
                    .findIndex(
                        (
                            option,
                        ) =>
                            option.key
                            === currentKey,
                    );

            const nextIndex =
                (
                    Math.max(
                        currentIndex,
                        0,
                    )
                    + direction
                    + availableSaleOptions
                        .length
                )
                % availableSaleOptions
                    .length;

            focusSaleOption(
                availableSaleOptions[
                    nextIndex
                ].key,
            );
        };

    const handleSaleOptionKeyDown =
        (
            event:
                ReactKeyboardEvent<HTMLButtonElement>,

            option:
                PosSaleOption,
        ): void => {
            if (
                event.key
                === 'Enter'
            ) {
                event.preventDefault();

                confirmSaleOption(
                    option,
                );

                return;
            }

            if (
                event.key
                === 'ArrowRight'
                || event.key
                === 'ArrowDown'
            ) {
                event.preventDefault();

                moveSaleOptionFocus(
                    option.key,
                    1,
                );
            }

            if (
                event.key
                === 'ArrowLeft'
                || event.key
                === 'ArrowUp'
            ) {
                event.preventDefault();

                moveSaleOptionFocus(
                    option.key,
                    -1,
                );
            }
        };

    /* =====================================================
       SUBMIT
       ===================================================== */

    const handleSubmit =
        (
            event:
                FormEvent<HTMLFormElement>,
        ): void => {
            event.preventDefault();

            if (
                isVariantProduct
                && !selectedVariant
            ) {
                setErrorMessage(
                    'Select the required variant first.',
                );

                return;
            }

            if (
                !selectedBatch
            ) {
                setErrorMessage(
                    'Select a stock batch.',
                );

                return;
            }

            if (
                selectedVariant
                && getBatchVariantId(
                    selectedBatch,
                )
                !== selectedVariant
                    .id
            ) {
                setErrorMessage(
                    'Selected batch does not belong to the selected variant.',
                );

                return;
            }

            if (
                !selectedSaleOption
            ) {
                setErrorMessage(
                    'Select a selling unit.',
                );

                return;
            }

            const parsedQuantity =
                Number(
                    quantity,
                );

            if (
                !Number.isFinite(
                    parsedQuantity,
                )
                || parsedQuantity
                <= 0
            ) {
                setErrorMessage(
                    'Enter a quantity greater than zero.',
                );

                focusQuantity();

                return;
            }

            if (
                !selectedSaleOption
                    .allow_decimal_quantity
                && !isWholeNumber(
                    parsedQuantity,
                )
            ) {
                setErrorMessage(
                    `${selectedSaleOption.unit} quantity must be a whole number.`,
                );

                focusQuantity();

                return;
            }

            const maximum =
                Number(
                    selectedSaleOption
                        .available_quantity
                    ?? 0,
                );

            if (
                parsedQuantity
                > maximum
                + 0.0001
            ) {
                setErrorMessage(
                    `Only ${formatQuantity(maximum)} ${selectedSaleOption.unit} are available.`,
                );

                focusQuantity();

                return;
            }

            onAdd(
                product,

                selectedBatch,

                normaliseQuantity(
                    parsedQuantity,
                ),

                selectedSaleOption,
            );
        };

    const stockSummaryUnit =
        product
            .stock_unit
        || product
            .unit;

    /*
     * =====================================================
     * CRITICAL FLOW SWITCH
     * =====================================================
     *
     * When TRUE:
     *
     * ONLY variant selection is displayed.
     *
     * Batch/unit/quantity are hidden.
     *
     * When variant is selected:
     *
     * this becomes FALSE and the original
     * flow is displayed.
     */
    const showVariantGate =
        isVariantProduct
        && selectedVariant
        === null;

    return createPortal(
        <div id="pos-batch-modal">
            <style>
                {batchModalStyles}
            </style>

            <div
                className="bsm-backdrop"
                onMouseDown={(event) => {
                    if (
                        event.target
                        === event.currentTarget
                    ) {
                        onClose();
                    }
                }}
            >
                <section
                    className="bsm-dialog"
                    role="dialog"
                    aria-modal="true"
                >
                    {/* HEADER */}

                    <header className="bsm-header">
                        <div>
                            <span className="bsm-eyebrow">
                                Add Product to Sale
                            </span>

                            <h2 className="bsm-title">
                                {
                                    product.name
                                }
                            </h2>

                            <div className="bsm-header-summary">
                                <span className="bsm-chip">
                                    <Icon name="package" />

                                    {
                                        product
                                            .category
                                            .name
                                    }
                                </span>

                                <span className="bsm-chip">
                                    <Icon name="scale" />

                                    Available:
                                    {' '}

                                    {formatQuantity(
                                        product
                                            .total_available_quantity,
                                    )}

                                    {' '}

                                    {
                                        stockSummaryUnit
                                    }
                                </span>

                                {isVariantProduct && (
                                    <span className="bsm-chip">
                                        <Icon name="tag" />

                                        {
                                            variants
                                                .length
                                        }

                                        {' '}

                                        Variant
                                        {
                                            variants.length
                                                === 1
                                                ? ''
                                                : 's'
                                        }
                                    </span>
                                )}

                                {selectedVariant && (
                                    <span className="bsm-chip variant">
                                        <Icon name="check" />

                                        {
                                            variantName(
                                                selectedVariant,
                                            )
                                        }
                                    </span>
                                )}
                            </div>

                            <div className="bsm-keyboard-help">
                                <Icon name="keyboard" />

                                <span className="bsm-key">
                                    ↑ ↓
                                </span>

                                Move

                                <span className="bsm-key">
                                    Enter
                                </span>

                                Confirm

                                <span className="bsm-key">
                                    Esc
                                </span>

                                Close
                            </div>
                        </div>

                        <button
                            type="button"
                            className="bsm-close"
                            aria-label="Close"
                            onClick={
                                onClose
                            }
                        >
                            <Icon name="close" />
                        </button>
                    </header>

                    <form
                        className="bsm-form"
                        onSubmit={
                            handleSubmit
                        }
                    >
                        <div className="bsm-body">
                            {errorMessage && (
                                <div className="bsm-error">
                                    <Icon name="alert" />

                                    <span>
                                        {
                                            errorMessage
                                        }
                                    </span>
                                </div>
                            )}

                            {/* =================================================
                                VARIANT FIRST SCREEN
                                ================================================= */}

                            {showVariantGate && (
                                <section className="bsm-variant-gate">
                                    <div className="bsm-variant-gate-title">
                                        <span className="bsm-variant-gate-icon">
                                            <Icon name="tag" />
                                        </span>

                                        <div>
                                            <h3 className="bsm-section-title">
                                                Select Variant First
                                            </h3>

                                            <p className="bsm-section-help">
                                                Choose the exact package size before continuing to batch, price and quantity.
                                            </p>
                                        </div>
                                    </div>

                                    {variants.length
                                        === 0 ? (
                                        <div
                                            className="bsm-error"
                                            style={{
                                                marginTop:
                                                    14,
                                            }}
                                        >
                                            <Icon name="alert" />

                                            <span>
                                                This product is marked as a variant product, but no variants were returned by the POS API.
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="bsm-variant-grid">
                                            {variants.map(
                                                (
                                                    variant,
                                                ) => {
                                                    const variantBatches =
                                                        batchesForVariant(
                                                            product,
                                                            variant.id,
                                                        );

                                                    const sellable =
                                                        variantBatches
                                                            .some(
                                                                (
                                                                    batch,
                                                                ) =>
                                                                    hasSellableStock(
                                                                        product,
                                                                        batch,
                                                                    ),
                                                            );

                                                    return (
                                                        <button
                                                            ref={(node) => {
                                                                if (
                                                                    node
                                                                ) {
                                                                    variantButtonRefs
                                                                        .current
                                                                        .set(
                                                                            variant.id,
                                                                            node,
                                                                        );
                                                                } else {
                                                                    variantButtonRefs
                                                                        .current
                                                                        .delete(
                                                                            variant.id,
                                                                        );
                                                                }
                                                            }}
                                                            key={
                                                                variant.id
                                                            }
                                                            type="button"
                                                            className="bsm-variant-card"
                                                            disabled={
                                                                !sellable
                                                            }
                                                            onClick={() => {
                                                                confirmVariant(
                                                                    variant,
                                                                );
                                                            }}
                                                            onKeyDown={(event) => {
                                                                handleVariantKeyDown(
                                                                    event,
                                                                    variant,
                                                                );
                                                            }}
                                                        >
                                                            <strong className="bsm-variant-name">
                                                                {
                                                                    variantName(
                                                                        variant,
                                                                    )
                                                                }
                                                            </strong>

                                                            <span className="bsm-variant-price">
                                                                {
                                                                    variantPriceText(
                                                                        variant,
                                                                    )
                                                                }
                                                            </span>

                                                            <span className="bsm-variant-stock">
                                                                Available:
                                                                {' '}

                                                                {formatQuantity(
                                                                    variant
                                                                        .total_available_quantity
                                                                    ?? 0,
                                                                )}

                                                                {' '}

                                                                {variant
                                                                    .stock_unit
                                                                    || variant
                                                                        .package_unit
                                                                    || product
                                                                        .unit}
                                                            </span>

                                                            <span className="bsm-variant-meta">
                                                                {variant.sku
                                                                    ? `SKU: ${variant.sku}`
                                                                    : 'Variant SKU not available'}

                                                                {variant.barcode
                                                                    ? ` • Barcode: ${variant.barcode}`
                                                                    : ''}
                                                            </span>
                                                        </button>
                                                    );
                                                },
                                            )}
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* =================================================
                                ORIGINAL FLOW
                                ONLY AFTER VARIANT SELECTED
                                ================================================= */}

                            {!showVariantGate && (
                                <>
                                    {/* SELECTED VARIANT */}

                                    {selectedVariant && (
                                        <div className="bsm-selected-variant">
                                            <div className="bsm-selected-variant-copy">
                                                <Icon name="check" />

                                                <div>
                                                    <strong>
                                                        {
                                                            variantName(
                                                                selectedVariant,
                                                            )
                                                        }
                                                    </strong>

                                                    <span>
                                                        Selected variant
                                                        {' '}
                                                        •
                                                        {' '}
                                                        {
                                                            variantPriceText(
                                                                selectedVariant,
                                                            )
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="bsm-change-variant"
                                                onClick={
                                                    changeVariant
                                                }
                                            >
                                                Change Variant
                                            </button>
                                        </div>
                                    )}

                                    {/* =================================================
                                        STEP 1 - BATCH
                                        ================================================= */}

                                    <section className="bsm-section">
                                        <div className="bsm-section-heading">
                                            <span
                                                className={
                                                    selectedBatch
                                                        ? 'bsm-step complete'
                                                        : 'bsm-step'
                                                }
                                            >
                                                {selectedBatch
                                                    ? (
                                                        <Icon name="check" />
                                                    )
                                                    : '1'}
                                            </span>

                                            <div>
                                                <h3 className="bsm-section-title">
                                                    Select Stock Batch
                                                </h3>

                                                <p className="bsm-section-help">
                                                    Select the batch. The batch-specific selling price, purchase cost and expiry are used.
                                                </p>
                                            </div>
                                        </div>

                                        {visibleBatches.length
                                            === 0 ? (
                                            <div className="bsm-empty">
                                                <Icon name="package" />

                                                <strong>
                                                    No Stock Available
                                                </strong>

                                                <span>
                                                    No stock batch is available for this selection.
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="bsm-batches">
                                                {visibleBatches.map(
                                                    (
                                                        batch,
                                                    ) => {
                                                        const selected =
                                                            batch.id
                                                            === selectedBatchId;

                                                        const batchVariant =
                                                            getBatchVariant(
                                                                batch,
                                                            )
                                                            ?? selectedVariant;

                                                        const primaryUnit =
                                                            batch
                                                                .primary_unit
                                                            || batchVariant
                                                                ?.package_unit
                                                            || product
                                                                .primary_unit
                                                            || product
                                                                .unit
                                                            || 'Unit';

                                                        return (
                                                            <button
                                                                ref={(node) => {
                                                                    if (
                                                                        node
                                                                    ) {
                                                                        batchButtonRefs
                                                                            .current
                                                                            .set(
                                                                                batch.id,
                                                                                node,
                                                                            );
                                                                    } else {
                                                                        batchButtonRefs
                                                                            .current
                                                                            .delete(
                                                                                batch.id,
                                                                            );
                                                                    }
                                                                }}
                                                                key={
                                                                    batch.id
                                                                }
                                                                type="button"
                                                                className={[
                                                                    'bsm-batch-card',

                                                                    selected
                                                                        ? 'selected'
                                                                        : '',

                                                                    batch
                                                                        .is_expired
                                                                        ? 'expired'
                                                                        : '',
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        ' ',
                                                                    )}
                                                                disabled={
                                                                    batch
                                                                        .is_expired
                                                                }
                                                                onClick={() => {
                                                                    confirmBatch(
                                                                        batch,
                                                                    );
                                                                }}
                                                                onKeyDown={(event) => {
                                                                    handleBatchKeyDown(
                                                                        event,
                                                                        batch,
                                                                    );
                                                                }}
                                                            >
                                                                <div className="bsm-batch-top">
                                                                    <div>
                                                                        <strong className="bsm-batch-code">
                                                                            {
                                                                                batch
                                                                                    .batch_code
                                                                            }
                                                                        </strong>

                                                                        <span className="bsm-batch-number">
                                                                            Batch:
                                                                            {' '}
                                                                            {batch.batch_number
                                                                                ?? 'Not specified'}
                                                                        </span>

                                                                        {batchVariant && (
                                                                            <span className="bsm-batch-variant">
                                                                                {
                                                                                    variantName(
                                                                                        batchVariant,
                                                                                    )
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {batch.is_expired ? (
                                                                        <span className="bsm-expired-badge">
                                                                            Expired
                                                                        </span>
                                                                    ) : selected ? (
                                                                        <span className="bsm-selected-icon">
                                                                            <Icon name="check" />
                                                                        </span>
                                                                    ) : null}
                                                                </div>

                                                                <div className="bsm-info-grid">
                                                                    <div className="bsm-info-box">
                                                                        <span className="bsm-info-label">
                                                                            Available
                                                                        </span>

                                                                        <strong className="bsm-info-value">
                                                                            {formatQuantity(
                                                                                batch
                                                                                    .available_quantity,
                                                                            )}

                                                                            {' '}

                                                                            {batch
                                                                                .stock_unit
                                                                                || primaryUnit}
                                                                        </strong>
                                                                    </div>

                                                                    <div className="bsm-info-box cost">
                                                                        <span className="bsm-info-label">
                                                                            Purchase Cost
                                                                        </span>

                                                                        <strong className="bsm-info-value">
                                                                            {currencyFormatter.format(
                                                                                Number(
                                                                                    batch
                                                                                        .purchase_cost
                                                                                    ?? 0,
                                                                                ),
                                                                            )}
                                                                        </strong>
                                                                    </div>

                                                                    <div className="bsm-info-box">
                                                                        <span className="bsm-info-label">
                                                                            Selling Price
                                                                        </span>

                                                                        <strong className="bsm-info-value">
                                                                            {currencyFormatter.format(
                                                                                Number(
                                                                                    batch
                                                                                        .selling_price
                                                                                    ?? 0,
                                                                                ),
                                                                            )}

                                                                            {' '}

                                                                            /
                                                                            {' '}

                                                                            {
                                                                                primaryUnit
                                                                            }
                                                                        </strong>
                                                                    </div>

                                                                    <div className="bsm-info-box">
                                                                        <span className="bsm-info-label">
                                                                            Expiry
                                                                        </span>

                                                                        <strong className="bsm-info-value">
                                                                            {formatDate(
                                                                                batch
                                                                                    .expiry_date,
                                                                            )}
                                                                        </strong>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        )}
                                    </section>

                                    {/* =================================================
                                        STEP 2 - SELLING UNIT
                                        ================================================= */}

                                    <section className="bsm-section">
                                        <div className="bsm-section-heading">
                                            <span
                                                className={
                                                    selectedSaleOption
                                                        ? 'bsm-step complete'
                                                        : 'bsm-step'
                                                }
                                            >
                                                {selectedSaleOption
                                                    ? (
                                                        <Icon name="check" />
                                                    )
                                                    : '2'}
                                            </span>

                                            <div>
                                                <h3 className="bsm-section-title">
                                                    Select Selling Unit
                                                </h3>

                                                <p className="bsm-section-help">
                                                    Continue exactly as before using the selected batch price.
                                                </p>
                                            </div>
                                        </div>

                                        {!selectedBatch ? (
                                            <div className="bsm-empty">
                                                <Icon name="package" />

                                                <strong>
                                                    Select Batch First
                                                </strong>
                                            </div>
                                        ) : (
                                            <div
                                                className={
                                                    saleOptions.length
                                                        <= 1
                                                        ? 'bsm-unit-options single'
                                                        : 'bsm-unit-options'
                                                }
                                            >
                                                {saleOptions.map(
                                                    (
                                                        option,
                                                    ) => {
                                                        const selected =
                                                            option.key
                                                            === selectedOptionKey;

                                                        const looseKg =
                                                            normaliseUnit(
                                                                option
                                                                    .unit,
                                                            )
                                                            === 'kg'
                                                            && selectedBatch
                                                                .is_dual_unit;

                                                        return (
                                                            <button
                                                                ref={(node) => {
                                                                    if (
                                                                        node
                                                                    ) {
                                                                        saleOptionButtonRefs
                                                                            .current
                                                                            .set(
                                                                                option.key,
                                                                                node,
                                                                            );
                                                                    } else {
                                                                        saleOptionButtonRefs
                                                                            .current
                                                                            .delete(
                                                                                option.key,
                                                                            );
                                                                    }
                                                                }}
                                                                key={
                                                                    option.key
                                                                }
                                                                type="button"
                                                                className={
                                                                    selected
                                                                        ? 'bsm-unit-card selected'
                                                                        : 'bsm-unit-card'
                                                                }
                                                                disabled={
                                                                    Number(
                                                                        option
                                                                            .available_quantity
                                                                        ?? 0,
                                                                    ) <= 0
                                                                }
                                                                onClick={() => {
                                                                    confirmSaleOption(
                                                                        option,
                                                                    );
                                                                }}
                                                                onKeyDown={(event) => {
                                                                    handleSaleOptionKeyDown(
                                                                        event,
                                                                        option,
                                                                    );
                                                                }}
                                                            >
                                                                <div className="bsm-unit-top">
                                                                    <div className="bsm-unit-identity">
                                                                        <span className="bsm-unit-icon">
                                                                            <Icon
                                                                                name={
                                                                                    looseKg
                                                                                        ? 'kg'
                                                                                        : selectedBatch
                                                                                            .is_dual_unit
                                                                                            ? 'bag'
                                                                                            : 'package'
                                                                                }
                                                                            />
                                                                        </span>

                                                                        <div>
                                                                            <strong className="bsm-unit-name">
                                                                                {
                                                                                    option
                                                                                        .label
                                                                                }
                                                                            </strong>

                                                                            <span className="bsm-unit-price">
                                                                                {currencyFormatter.format(
                                                                                    Number(
                                                                                        option
                                                                                            .selling_price
                                                                                        ?? 0,
                                                                                    ),
                                                                                )}

                                                                                <small>
                                                                                    {' '}
                                                                                    /
                                                                                    {' '}
                                                                                    {
                                                                                        option
                                                                                            .unit
                                                                                    }
                                                                                </small>
                                                                            </span>

                                                                            <span className="bsm-unit-cost">
                                                                                Cost:
                                                                                {' '}
                                                                                {currencyFormatter.format(
                                                                                    Number(
                                                                                        option
                                                                                            .purchase_cost
                                                                                        ?? 0,
                                                                                    ),
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {selected && (
                                                                        <span className="bsm-selected-icon">
                                                                            <Icon name="check" />
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="bsm-unit-details">
                                                                    <div className="bsm-unit-detail">
                                                                        <span>
                                                                            Available
                                                                        </span>

                                                                        <strong>
                                                                            {formatQuantity(
                                                                                option
                                                                                    .available_quantity,
                                                                            )}

                                                                            {' '}

                                                                            {
                                                                                option
                                                                                    .unit
                                                                            }
                                                                        </strong>
                                                                    </div>

                                                                    <div className="bsm-unit-detail">
                                                                        <span>
                                                                            Stock Usage
                                                                        </span>

                                                                        <strong>
                                                                            1
                                                                            {' '}
                                                                            {
                                                                                option
                                                                                    .unit
                                                                            }
                                                                            {' '}
                                                                            =
                                                                            {' '}
                                                                            {formatQuantity(
                                                                                option
                                                                                    .stock_quantity_per_unit,
                                                                            )}
                                                                            {' '}
                                                                            {
                                                                                option
                                                                                    .stock_unit
                                                                            }
                                                                        </strong>
                                                                    </div>

                                                                    <div className="bsm-unit-detail cost">
                                                                        <span>
                                                                            Cost
                                                                        </span>

                                                                        <strong>
                                                                            {currencyFormatter.format(
                                                                                Number(
                                                                                    option
                                                                                        .purchase_cost
                                                                                    ?? 0,
                                                                                ),
                                                                            )}
                                                                        </strong>
                                                                    </div>

                                                                    <div className="bsm-unit-detail">
                                                                        <span>
                                                                            Selling Price
                                                                        </span>

                                                                        <strong>
                                                                            {currencyFormatter.format(
                                                                                Number(
                                                                                    option
                                                                                        .selling_price
                                                                                    ?? 0,
                                                                                ),
                                                                            )}
                                                                        </strong>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        )}
                                    </section>

                                    {/* =================================================
                                        STEP 3 - QUANTITY
                                        ================================================= */}

                                    <section className="bsm-section">
                                        <div className="bsm-section-heading">
                                            <span className="bsm-step">
                                                3
                                            </span>

                                            <div>
                                                <h3 className="bsm-section-title">
                                                    Enter Quantity
                                                </h3>

                                                <p className="bsm-section-help">
                                                    Enter the quantity for the selected price and unit.
                                                </p>
                                            </div>
                                        </div>

                                        {!selectedSaleOption ? (
                                            <div className="bsm-empty">
                                                <Icon name="scale" />

                                                <strong>
                                                    Select Selling Unit First
                                                </strong>
                                            </div>
                                        ) : (
                                            <div className="bsm-quantity">
                                                <div>
                                                    <span className="bsm-quantity-label">
                                                        Quantity
                                                        {' '}
                                                        (
                                                        {
                                                            selectedSaleOption
                                                                .unit
                                                        }
                                                        )
                                                    </span>

                                                    <span className="bsm-quantity-help">
                                                        Maximum:
                                                        {' '}

                                                        <strong>
                                                            {formatQuantity(
                                                                selectedSaleOption
                                                                    .available_quantity,
                                                            )}

                                                            {' '}

                                                            {
                                                                selectedSaleOption
                                                                    .unit
                                                            }
                                                        </strong>
                                                    </span>
                                                </div>

                                                <div className="bsm-quantity-controls">
                                                    <button
                                                        type="button"
                                                        className="bsm-quantity-button"
                                                        onClick={() => {
                                                            changeQuantity(
                                                                -1,
                                                            );
                                                        }}
                                                    >
                                                        <Icon name="minus" />
                                                    </button>

                                                    <input
                                                        ref={
                                                            quantityInputRef
                                                        }
                                                        type="number"
                                                        className="bsm-quantity-input"
                                                        min={
                                                            selectedSaleOption
                                                                .allow_decimal_quantity
                                                                ? 0.001
                                                                : 1
                                                        }
                                                        max={
                                                            selectedSaleOption
                                                                .available_quantity
                                                        }
                                                        step={
                                                            selectedSaleOption
                                                                .allow_decimal_quantity
                                                                ? selectedSaleOption
                                                                    .quantity_step
                                                                : 1
                                                        }
                                                        value={
                                                            quantity
                                                        }
                                                        onFocus={(event) => {
                                                            event
                                                                .currentTarget
                                                                .select();
                                                        }}
                                                        onKeyDown={(event) => {
                                                            if (
                                                                event.key
                                                                === 'Enter'
                                                            ) {
                                                                event.preventDefault();

                                                                event
                                                                    .currentTarget
                                                                    .form
                                                                    ?.requestSubmit();
                                                            }
                                                        }}
                                                        onChange={(event) => {
                                                            setQuantity(
                                                                event
                                                                    .target
                                                                    .value,
                                                            );

                                                            setErrorMessage(
                                                                '',
                                                            );
                                                        }}
                                                    />

                                                    <button
                                                        type="button"
                                                        className="bsm-quantity-button"
                                                        onClick={() => {
                                                            changeQuantity(
                                                                1,
                                                            );
                                                        }}
                                                    >
                                                        <Icon name="plus" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </section>

                                    {/* TOTAL */}

                                    {selectedBatch
                                        && selectedSaleOption && (
                                            <div className="bsm-total">
                                                <div>
                                                    <span className="bsm-total-label">
                                                        Item Total
                                                    </span>

                                                    {selectedVariant && (
                                                        <span className="bsm-total-variant">
                                                            {
                                                                variantName(
                                                                    selectedVariant,
                                                                )
                                                            }
                                                        </span>
                                                    )}

                                                    <span className="bsm-total-description">
                                                        {formatQuantity(
                                                            validQuantity,
                                                        )}

                                                        {' '}

                                                        {
                                                            selectedSaleOption
                                                                .unit
                                                        }

                                                        {' '}

                                                        ×

                                                        {' '}

                                                        {currencyFormatter.format(
                                                            Number(
                                                                selectedSaleOption
                                                                    .selling_price
                                                                ?? 0,
                                                            ),
                                                        )}
                                                    </span>

                                                    <span className="bsm-total-cost">
                                                        Cost Total:
                                                        {' '}

                                                        {currencyFormatter.format(
                                                            itemCostTotal,
                                                        )}
                                                    </span>
                                                </div>

                                                <strong className="bsm-total-value">
                                                    {currencyFormatter.format(
                                                        itemTotal,
                                                    )}
                                                </strong>
                                            </div>
                                        )}
                                </>
                            )}
                        </div>

                        {/* FOOTER */}

                        <footer className="bsm-actions">
                            <span className="bsm-action-help">
                                {showVariantGate
                                    ? 'Select the exact variant first.'
                                    : !selectedBatch
                                        ? 'Step 1: Select stock batch.'
                                        : !selectedSaleOption
                                            ? 'Step 2: Select selling unit.'
                                            : 'Step 3: Enter quantity and add to cart.'}
                            </span>

                            <button
                                type="button"
                                className="bsm-button bsm-cancel"
                                onClick={
                                    onClose
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="bsm-button bsm-add"
                                disabled={
                                    showVariantGate
                                    || !selectedBatch
                                    || !selectedSaleOption
                                    || validQuantity
                                    <= 0
                                }
                            >
                                <Icon name="shopping-cart" />

                                Add to Cart
                            </button>
                        </footer>
                    </form>
                </section>
            </div>
        </div>,
        document.body,
    );
}