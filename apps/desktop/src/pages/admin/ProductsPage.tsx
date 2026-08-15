import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import {
    useNavigate,
} from 'react-router';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    createProduct,
    deleteProduct,
    getProductCategoryOptions,
    getProducts,
    updateProduct,
} from '../../services/productService';

import type {
    Product,
    ProductCategory,
    ProductInput,
    ProductPaginationMeta,
    ProductVariantInput,
} from '../../types/product';

/* =========================================================
   CONSTANTS
   ========================================================= */

const PAGE_SIZE_OPTIONS = [
    10,
    20,
    50,
    100,
] as const;

const COMMON_UNITS = [
    'Piece',
    'Packet',
    'Bag',
    'Bottle',
    'Box',
    'Kilogram',
    'Gram',
    'Litre',
    'Millilitre',
    'Metre',
    'Foot',
    'Roll',
    'Set',
    'Pair',
    'Dozen',
] as const;

const VARIANT_SIZE_UNITS = [
    'g',
    'kg',
    'mg',
    'ml',
    'L',
    'cm',
    'm',
    'Piece',
] as const;

const EMPTY_PAGINATION:
    ProductPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: null,
    to: null,
};

/* =========================================================
   FORM
   ========================================================= */

const createEmptyVariant =
    (
        packageUnit = '',
    ): ProductVariantInput => ({
        id: null,
        size_value: '',
        size_unit: '',
        package_unit:
            packageUnit,
        barcode: '',
        is_active: true,
    });

const createEmptyForm =
    (): ProductInput => ({
        category_id: null,
        name: '',
        unit: '',
        barcode: '',
        variants: [],
    });

/* =========================================================
   HELPERS
   ========================================================= */

function getErrorMessage(
    error: unknown,
    fallback: string,
): string {
    if (
        error
        instanceof ApiError
    ) {
        return error.message;
    }

    if (
        error
        instanceof Error
    ) {
        return error.message;
    }

    return fallback;
}

function formatNumber(
    value:
        | number
        | string
        | null
        | undefined,
): string {
    const numberValue =
        Number(
            value ?? 0,
        );

    if (
        !Number.isFinite(
            numberValue,
        )
    ) {
        return String(
            value ?? 0,
        );
    }

    return new Intl.NumberFormat(
        'en-GB',
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        },
    ).format(
        numberValue,
    );
}

/* =========================================================
   ICON
   ========================================================= */

type IconName =
    | 'alert'
    | 'box'
    | 'check'
    | 'chevron-left'
    | 'chevron-right'
    | 'edit'
    | 'eye'
    | 'info'
    | 'plus'
    | 'refresh'
    | 'search'
    | 'trash'
    | 'x';

function Icon({
    name,
}: {
    name: IconName;
}) {
    const props = {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap:
            'round' as const,
        strokeLinejoin:
            'round' as const,
        'aria-hidden':
            true,
    };

    switch (name) {
        case 'plus':
            return (
                <svg {...props}>
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                </svg>
            );

        case 'edit':
            return (
                <svg {...props}>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
            );

        case 'eye':
            return (
                <svg {...props}>
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle
                        cx="12"
                        cy="12"
                        r="2.5"
                    />
                </svg>
            );

        case 'trash':
            return (
                <svg {...props}>
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="m19 6-1 14H6L5 6" />
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

        case 'refresh':
            return (
                <svg {...props}>
                    <path d="M20 11a8 8 0 1 0 2 5" />
                    <path d="M20 4v7h-7" />
                </svg>
            );

        case 'check':
            return (
                <svg {...props}>
                    <path d="m5 12 4 4L19 6" />
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
                    <path d="m9 18 6-6-6-6" />
                </svg>
            );

        case 'alert':
            return (
                <svg {...props}>
                    <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                </svg>
            );

        case 'info':
            return (
                <svg {...props}>
                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                    />
                    <path d="M12 11v5" />
                    <path d="M12 8h.01" />
                </svg>
            );

        case 'box':
            return (
                <svg {...props}>
                    <path d="m21 8-9 5-9-5" />
                    <path d="m3 8 9-5 9 5v8l-9 5-9-5Z" />
                </svg>
            );

        case 'x':
        default:
            return (
                <svg {...props}>
                    <path d="m6 6 12 12" />
                    <path d="m18 6-12 12" />
                </svg>
            );
    }
}

/* =========================================================
   CSS
   ========================================================= */

const productsPageStyles = `
#sapo-products,
#sapo-products *,
#sapo-products *::before,
#sapo-products *::after,
#sapo-product-modal,
#sapo-product-modal *,
#sapo-product-modal *::before,
#sapo-product-modal *::after {
    box-sizing: border-box !important;
}

#sapo-products,
#sapo-product-modal {
    --green: #15803d;
    --green-dark: #14532d;
    --green-light: #f0fdf4;
    --border: #d0d5dd;
    --border-soft: #e4e7ec;
    --text: #101828;
    --muted: #667085;
    --danger: #b42318;

    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
        Roboto, Arial, sans-serif !important;
}

#sapo-products {
    width: 100% !important;
    padding: 20px !important;
    color: var(--text) !important;
    background: #f5f7f6 !important;
}

#sapo-products button,
#sapo-products input,
#sapo-products select,
#sapo-product-modal button,
#sapo-product-modal input,
#sapo-product-modal select {
    font: inherit !important;
}

#sapo-products svg,
#sapo-product-modal svg {
    width: 18px !important;
    height: 18px !important;
}

#sapo-products .pp-container {
    max-width: 1600px !important;
    margin: 0 auto !important;
}

#sapo-products .pp-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 20px !important;
    padding: 20px !important;
    background: white !important;
    border: 1px solid var(--border) !important;
    border-left: 6px solid var(--green) !important;
    border-radius: 14px !important;
}

#sapo-products h1 {
    margin: 0 !important;
    font-size: 29px !important;
}

#sapo-products .pp-subtitle {
    margin: 5px 0 0 !important;
    color: var(--muted) !important;
    font-size: 14px !important;
}

#sapo-products .pp-header-actions,
#sapo-products .pp-actions,
#sapo-product-modal .pm-footer {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
}

#sapo-products .pp-button,
#sapo-product-modal .pm-button {
    display: inline-flex !important;
    min-height: 42px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;
    padding: 8px 14px !important;
    color: #344054 !important;
    font-size: 13px !important;
    font-weight: 750 !important;
    background: #fff !important;
    border: 1px solid #b8c0c7 !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#sapo-products .pp-button-primary,
#sapo-product-modal .pm-button-primary {
    color: white !important;
    background: var(--green) !important;
    border-color: var(--green) !important;
}

#sapo-products .pp-button-danger,
#sapo-product-modal .pm-button-danger {
    color: var(--danger) !important;
    background: #fef3f2 !important;
    border-color: #fda29b !important;
}

#sapo-products button:disabled,
#sapo-product-modal button:disabled {
    opacity: .5 !important;
    cursor: not-allowed !important;
}

#sapo-products .pp-count {
    padding: 9px 12px !important;
    color: var(--green-dark) !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    background: var(--green-light) !important;
    border-radius: 8px !important;
}

#sapo-products .pp-alert {
    margin-top: 12px !important;
    padding: 12px 14px !important;
    font-size: 13px !important;
    font-weight: 650 !important;
    border-radius: 10px !important;
}

#sapo-products .pp-alert-success {
    color: #14532d !important;
    background: #f0fdf4 !important;
    border: 1px solid #86efac !important;
}

#sapo-products .pp-alert-error {
    color: #991b1b !important;
    background: #fef2f2 !important;
    border: 1px solid #fca5a5 !important;
}

#sapo-products .pp-panel {
    margin-top: 14px !important;
    overflow: hidden !important;
    background: white !important;
    border: 1px solid var(--border) !important;
    border-radius: 14px !important;
}

#sapo-products .pp-toolbar {
    display: grid !important;
    grid-template-columns: minmax(250px, 1fr) auto 120px !important;
    gap: 10px !important;
    padding: 14px !important;
    border-bottom: 1px solid var(--border-soft) !important;
}

#sapo-products .pp-field,
#sapo-product-modal .pm-field {
    display: grid !important;
    gap: 6px !important;
    min-width: 0 !important;
}

#sapo-products .pp-label,
#sapo-product-modal .pm-label {
    color: #344054 !important;
    font-size: 12px !important;
    font-weight: 750 !important;
}

#sapo-products .pp-input,
#sapo-products .pp-select,
#sapo-product-modal .pm-input,
#sapo-product-modal .pm-select {
    width: 100% !important;
    min-height: 43px !important;
    padding: 8px 11px !important;
    color: var(--text) !important;
    background: white !important;
    border: 1px solid #aeb8b1 !important;
    border-radius: 8px !important;
    outline: none !important;
}

#sapo-products .pp-input:focus,
#sapo-products .pp-select:focus,
#sapo-product-modal .pm-input:focus,
#sapo-product-modal .pm-select:focus {
    border-color: var(--green) !important;
    box-shadow: 0 0 0 3px rgba(21,128,61,.14) !important;
}

#sapo-products .pp-table-scroll {
    overflow-x: auto !important;
}

#sapo-products table {
    width: 100% !important;
    min-width: 1200px !important;
    border-collapse: collapse !important;
}

#sapo-products th,
#sapo-products td {
    padding: 12px !important;
    text-align: left !important;
    vertical-align: middle !important;
    border-bottom: 1px solid var(--border-soft) !important;
}

#sapo-products th {
    color: white !important;
    font-size: 12px !important;
    background: var(--green-dark) !important;
}

#sapo-products td {
    font-size: 13px !important;
}

#sapo-products tbody tr:hover td {
    background: #f6fbf7 !important;
}

#sapo-products .pp-product-name {
    display: block !important;
    font-size: 14px !important;
    font-weight: 800 !important;
}

#sapo-products .pp-small {
    display: block !important;
    margin-top: 3px !important;
    color: var(--muted) !important;
    font-size: 11px !important;
}

#sapo-products .pp-badge {
    display: inline-flex !important;
    align-items: center !important;
    padding: 5px 8px !important;
    font-size: 11px !important;
    font-weight: 750 !important;
    background: var(--green-light) !important;
    border-radius: 999px !important;
}

#sapo-products .pp-variants {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 5px !important;
}

#sapo-products .pp-variant {
    padding: 5px 8px !important;
    color: #344054 !important;
    font-size: 11px !important;
    font-weight: 750 !important;
    background: #f2f4f7 !important;
    border: 1px solid #d0d5dd !important;
    border-radius: 7px !important;
}

#sapo-products .pp-stock-group {
    display: grid !important;
    gap: 6px !important;
}

#sapo-products .pp-stock-variant {
    display: grid !important;
    gap: 3px !important;
}

#sapo-products .pp-stock-name {
    color: #475467 !important;
    font-size: 10px !important;
    font-weight: 800 !important;
}

#sapo-products .pp-stock {
    display: inline-flex !important;
    width: fit-content !important;
    padding: 5px 8px !important;
    color: var(--green-dark) !important;
    font-weight: 800 !important;
    background: var(--green-light) !important;
    border-radius: 7px !important;
}

#sapo-products .pp-pagination {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    padding: 12px 14px !important;
}

#sapo-product-modal {
    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;
}

#sapo-product-modal .pm-backdrop {
    position: absolute !important;
    inset: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 20px !important;
    background: rgba(5,18,10,.72) !important;
}

#sapo-product-modal .pm-dialog {
    display: flex !important;
    width: min(1000px, 100%) !important;
    max-height: calc(100dvh - 40px) !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: white !important;
    border-radius: 16px !important;
    box-shadow: 0 25px 70px rgba(0,0,0,.35) !important;
}

#sapo-product-modal .pm-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 15px !important;
    padding: 18px 20px !important;
    color: white !important;
    background: linear-gradient(135deg,#052e16,#15803d) !important;
}

#sapo-product-modal .pm-title {
    margin: 0 !important;
    font-size: 23px !important;
}

#sapo-product-modal .pm-close {
    display: grid !important;
    width: 42px !important;
    height: 42px !important;
    place-items: center !important;
    color: white !important;
    background: rgba(255,255,255,.12) !important;
    border: 1px solid rgba(255,255,255,.3) !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#sapo-product-modal form {
    display: flex !important;
    min-height: 0 !important;
    flex: 1 !important;
    flex-direction: column !important;
}

#sapo-product-modal .pm-body {
    display: grid !important;
    gap: 14px !important;
    min-height: 0 !important;
    padding: 16px !important;
    overflow-y: auto !important;
    background: #f5f8f6 !important;
}

#sapo-product-modal .pm-error {
    padding: 11px !important;
    color: #991b1b !important;
    font-weight: 700 !important;
    background: #fef2f2 !important;
    border: 1px solid #fca5a5 !important;
    border-radius: 9px !important;
}

#sapo-product-modal .pm-section {
    padding: 16px !important;
    background: white !important;
    border: 1px solid var(--border) !important;
    border-radius: 11px !important;
}

#sapo-product-modal .pm-section-header {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 15px !important;
    margin-bottom: 14px !important;
}

#sapo-product-modal .pm-section-title {
    margin: 0 !important;
    font-size: 17px !important;
}

#sapo-product-modal .pm-section-copy {
    margin: 4px 0 0 !important;
    color: var(--muted) !important;
    font-size: 12px !important;
}

#sapo-product-modal .pm-grid {
    display: grid !important;
    grid-template-columns: repeat(2,minmax(0,1fr)) !important;
    gap: 13px !important;
}

#sapo-product-modal .pm-full {
    grid-column: 1 / -1 !important;
}

#sapo-product-modal .pm-required {
    color: #d92d20 !important;
}

#sapo-product-modal .pm-info {
    margin-top: 12px !important;
    padding: 11px !important;
    color: #475467 !important;
    font-size: 12px !important;
    background: #f9fafb !important;
    border-radius: 8px !important;
}

#sapo-product-modal .pm-variant-list {
    display: grid !important;
    gap: 11px !important;
}

#sapo-product-modal .pm-variant-card {
    padding: 13px !important;
    background: #f8faf9 !important;
    border: 1px solid #cbd5ce !important;
    border-radius: 10px !important;
}

#sapo-product-modal .pm-variant-head {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    margin-bottom: 10px !important;
}

#sapo-product-modal .pm-variant-title {
    font-size: 13px !important;
    font-weight: 850 !important;
}

#sapo-product-modal .pm-variant-grid {
    display: grid !important;
    grid-template-columns:
        minmax(100px,.7fr)
        minmax(100px,.8fr)
        minmax(140px,1fr)
        minmax(180px,1.4fr)
        auto !important;
    gap: 9px !important;
    align-items: end !important;
}

#sapo-product-modal .pm-check {
    display: flex !important;
    min-height: 43px !important;
    align-items: center !important;
    gap: 8px !important;
    font-size: 12px !important;
    font-weight: 750 !important;
}

#sapo-product-modal .pm-check input {
    width: 19px !important;
    height: 19px !important;
}

#sapo-product-modal .pm-empty-variants {
    padding: 16px !important;
    color: #667085 !important;
    text-align: center !important;
    background: #f9fafb !important;
    border: 1px dashed #98a2b3 !important;
    border-radius: 9px !important;
}

#sapo-product-modal .pm-footer {
    justify-content: flex-end !important;
    padding: 13px 16px !important;
    border-top: 1px solid var(--border) !important;
}

@media (max-width: 800px) {
    #sapo-products {
        padding: 12px !important;
    }

    #sapo-products .pp-header {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #sapo-products .pp-toolbar {
        grid-template-columns: 1fr !important;
    }

    #sapo-product-modal .pm-backdrop {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    #sapo-product-modal .pm-dialog {
        width: 100% !important;
        max-height: 96dvh !important;
        border-radius: 15px 15px 0 0 !important;
    }

    #sapo-product-modal .pm-grid,
    #sapo-product-modal .pm-variant-grid {
        grid-template-columns: 1fr !important;
    }

    #sapo-product-modal .pm-full {
        grid-column: auto !important;
    }
}
`;

/* =========================================================
   COMPONENT
   ========================================================= */

export default function ProductsPage() {
    const navigate =
        useNavigate();

    const {
        token,
    } =
        useAuth();

    const nameInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const [
        products,
        setProducts,
    ] =
        useState<Product[]>([]);

    const [
        categories,
        setCategories,
    ] =
        useState<ProductCategory[]>([]);

    const [
        pagination,
        setPagination,
    ] =
        useState<ProductPaginationMeta>(
            EMPTY_PAGINATION,
        );

    const [
        searchInput,
        setSearchInput,
    ] =
        useState('');

    const [
        search,
        setSearch,
    ] =
        useState('');

    const [
        page,
        setPage,
    ] =
        useState(1);

    const [
        perPage,
        setPerPage,
    ] =
        useState(20);

    const [
        form,
        setForm,
    ] =
        useState<ProductInput>(
            createEmptyForm(),
        );

    const [
        editingProduct,
        setEditingProduct,
    ] =
        useState<Product | null>(
            null,
        );

    const [
        showForm,
        setShowForm,
    ] =
        useState(false);

    const [
        isLoading,
        setIsLoading,
    ] =
        useState(true);

    const [
        isCategoryLoading,
        setIsCategoryLoading,
    ] =
        useState(true);

    const [
        isSubmitting,
        setIsSubmitting,
    ] =
        useState(false);

    const [
        formError,
        setFormError,
    ] =
        useState('');

    const [
        pageError,
        setPageError,
    ] =
        useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] =
        useState('');

    const selectedCategory =
        useMemo(
            () =>
                categories.find(
                    (
                        category,
                    ) =>
                        category.id
                        === form.category_id,
                )
                ?? null,
            [
                categories,
                form.category_id,
            ],
        );

    /* =====================================================
       LOAD
       ===================================================== */

    const loadProducts =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(
                    true,
                );

                setPageError(
                    '',
                );

                try {
                    const response =
                        await getProducts(
                            token,
                            {
                                search,
                                page,
                                per_page:
                                    perPage,
                            },
                        );

                    setProducts(
                        response.data,
                    );

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    setPageError(
                        getErrorMessage(
                            error,
                            'Unable to load products.',
                        ),
                    );
                } finally {
                    setIsLoading(
                        false,
                    );
                }
            },
            [
                token,
                search,
                page,
                perPage,
            ],
        );

    const loadCategories =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsCategoryLoading(
                    true,
                );

                try {
                    const response =
                        await getProductCategoryOptions(
                            token,
                        );

                    setCategories(
                        response.data,
                    );
                } catch (error) {
                    setPageError(
                        getErrorMessage(
                            error,
                            'Unable to load categories.',
                        ),
                    );
                } finally {
                    setIsCategoryLoading(
                        false,
                    );
                }
            },
            [
                token,
            ],
        );

    useEffect(
        () => {
            void loadProducts();
        },
        [
            loadProducts,
        ],
    );

    useEffect(
        () => {
            void loadCategories();
        },
        [
            loadCategories,
        ],
    );

    useEffect(
        () => {
            if (!showForm) {
                return;
            }

            const oldOverflow =
                document.body.style.overflow;

            document.body.style.overflow =
                'hidden';

            const handleKey =
                (
                    event:
                        KeyboardEvent,
                ) => {
                    if (
                        event.key
                        === 'Escape'
                        && !isSubmitting
                    ) {
                        setShowForm(
                            false,
                        );
                    }
                };

            window.addEventListener(
                'keydown',
                handleKey,
            );

            return () => {
                document.body.style.overflow =
                    oldOverflow;

                window.removeEventListener(
                    'keydown',
                    handleKey,
                );
            };
        },
        [
            showForm,
            isSubmitting,
        ],
    );

    /* =====================================================
       FORM
       ===================================================== */

    const openCreateForm =
        (): void => {
            setEditingProduct(
                null,
            );

            setForm(
                createEmptyForm(),
            );

            setFormError(
                '',
            );

            setShowForm(
                true,
            );
        };

    const openEditForm =
        (
            product:
                Product,
        ): void => {
            setEditingProduct(
                product,
            );

            setForm({
                category_id:
                    product.category
                        ?.id
                    ?? null,

                name:
                    product.name,

                unit:
                    product.unit,

                barcode:
                    product.barcode
                    ?? '',

                variants:
                    product.variants.map(
                        (
                            variant,
                        ) => ({
                            id:
                                variant.id,

                            size_value:
                                String(
                                    variant
                                        .size_value,
                                ),

                            size_unit:
                                variant
                                    .size_unit,

                            package_unit:
                                variant
                                    .package_unit,

                            barcode:
                                variant
                                    .barcode
                                ?? '',

                            is_active:
                                variant
                                    .is_active,
                        }),
                    ),
            });

            setFormError(
                '',
            );

            setShowForm(
                true,
            );
        };

    const closeForm =
        (): void => {
            if (isSubmitting) {
                return;
            }

            setShowForm(
                false,
            );

            setEditingProduct(
                null,
            );

            setForm(
                createEmptyForm(),
            );

            setFormError(
                '',
            );
        };

    const addVariant =
        (): void => {
            setForm(
                (
                    current,
                ) => ({
                    ...current,

                    variants: [
                        ...current
                            .variants,

                        createEmptyVariant(
                            current.unit,
                        ),
                    ],
                }),
            );
        };

    const updateVariant =
        (
            index: number,
            values:
                Partial<ProductVariantInput>,
        ): void => {
            setForm(
                (
                    current,
                ) => ({
                    ...current,

                    variants:
                        current
                            .variants
                            .map(
                                (
                                    variant,
                                    variantIndex,
                                ) =>
                                    variantIndex
                                        === index
                                        ? {
                                            ...variant,
                                            ...values,
                                        }
                                        : variant,
                            ),
                }),
            );

            setFormError(
                '',
            );
        };

    const removeVariant =
        (
            index: number,
        ): void => {
            setForm(
                (
                    current,
                ) => ({
                    ...current,

                    variants:
                        current
                            .variants
                            .filter(
                                (
                                    _variant,
                                    variantIndex,
                                ) =>
                                    variantIndex
                                    !== index,
                            ),
                }),
            );
        };

    const validateForm =
        (): string | null => {
            if (
                !form.category_id
            ) {
                return 'Please select a category.';
            }

            if (
                !form.name.trim()
            ) {
                return 'Please enter the product name.';
            }

            if (
                !form.unit.trim()
            ) {
                return 'Please select the main product unit.';
            }

            const signatures =
                new Set<string>();

            for (
                let index = 0;
                index
                < form.variants.length;
                index++
            ) {
                const variant =
                    form.variants[
                    index
                    ];

                const size =
                    Number(
                        variant
                            .size_value,
                    );

                if (
                    !Number.isFinite(
                        size,
                    )
                    || size <= 0
                ) {
                    return `Variant ${index + 1}: enter a valid size greater than zero.`;
                }

                if (
                    !variant
                        .size_unit
                        .trim()
                ) {
                    return `Variant ${index + 1}: select a measurement unit.`;
                }

                if (
                    !variant
                        .package_unit
                        .trim()
                ) {
                    return `Variant ${index + 1}: select a package unit.`;
                }

                const signature =
                    `${size.toFixed(3)}|${variant.size_unit.trim().toLowerCase()}|${variant.package_unit.trim().toLowerCase()}`;

                if (
                    signatures.has(
                        signature,
                    )
                ) {
                    return `Variant ${index + 1} duplicates another package size.`;
                }

                signatures.add(
                    signature,
                );
            }

            return null;
        };

    const handleSubmit =
        async (
            event:
                FormEvent<HTMLFormElement>,
        ): Promise<void> => {
            event.preventDefault();

            if (
                !token
                || isSubmitting
            ) {
                return;
            }

            const validationError =
                validateForm();

            if (validationError) {
                setFormError(
                    validationError,
                );

                return;
            }

            setIsSubmitting(
                true,
            );

            setFormError(
                '',
            );

            try {
                const response =
                    editingProduct
                        ? await updateProduct(
                            token,
                            editingProduct.id,
                            form,
                        )
                        : await createProduct(
                            token,
                            form,
                        );

                setSuccessMessage(
                    response.message,
                );

                closeForm();

                await loadProducts();
            } catch (error) {
                setFormError(
                    getErrorMessage(
                        error,
                        editingProduct
                            ? 'Unable to update product.'
                            : 'Unable to create product.',
                    ),
                );
            } finally {
                setIsSubmitting(
                    false,
                );
            }
        };

    const handleDelete =
        async (
            product:
                Product,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            const confirmed =
                window.confirm(
                    `Delete "${product.name}"?`,
                );

            if (!confirmed) {
                return;
            }

            try {
                const response =
                    await deleteProduct(
                        token,
                        product.id,
                    );

                setSuccessMessage(
                    response.message,
                );

                await loadProducts();
            } catch (error) {
                setPageError(
                    getErrorMessage(
                        error,
                        'Unable to delete product.',
                    ),
                );
            }
        };

    /* =====================================================
       MODAL
       ===================================================== */

    const modal =
        showForm
            && typeof document
            !== 'undefined'
            ? createPortal(
                <div id="sapo-product-modal">
                    <div
                        className="pm-backdrop"
                        onMouseDown={(event) => {
                            if (
                                event.target
                                === event.currentTarget
                            ) {
                                closeForm();
                            }
                        }}
                    >
                        <section
                            className="pm-dialog"
                            role="dialog"
                            aria-modal="true"
                        >
                            <header className="pm-header">
                                <div>
                                    <div
                                        style={{
                                            fontSize:
                                                11,
                                            opacity:
                                                0.8,
                                            fontWeight:
                                                800,
                                        }}
                                    >
                                        PRODUCT MANAGEMENT
                                    </div>

                                    <h2 className="pm-title">
                                        {editingProduct
                                            ? 'Edit Product'
                                            : 'Add New Product'}
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    className="pm-close"
                                    onClick={
                                        closeForm
                                    }
                                >
                                    <Icon name="x" />
                                </button>
                            </header>

                            <form
                                onSubmit={(event) => {
                                    void handleSubmit(
                                        event,
                                    );
                                }}
                            >
                                <div className="pm-body">
                                    {formError && (
                                        <div className="pm-error">
                                            {
                                                formError
                                            }
                                        </div>
                                    )}

                                    {/* CATEGORY */}

                                    <section className="pm-section">
                                        <div className="pm-section-header">
                                            <div>
                                                <h3 className="pm-section-title">
                                                    1. Product Category
                                                </h3>

                                                <p className="pm-section-copy">
                                                    Select the category used for reporting and product lookup.
                                                </p>
                                            </div>
                                        </div>

                                        <label className="pm-field">
                                            <span className="pm-label">
                                                Category
                                                {' '}
                                                <span className="pm-required">
                                                    *
                                                </span>
                                            </span>

                                            <select
                                                className="pm-select"
                                                value={
                                                    form.category_id
                                                    ?? ''
                                                }
                                                disabled={
                                                    isSubmitting
                                                    || isCategoryLoading
                                                }
                                                onChange={(event) => {
                                                    setForm(
                                                        (
                                                            current,
                                                        ) => ({
                                                            ...current,

                                                            category_id:
                                                                event
                                                                    .target
                                                                    .value
                                                                    ? Number(
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                    : null,
                                                        }),
                                                    );
                                                }}
                                            >
                                                <option value="">
                                                    Select category
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
                                                                category.name
                                                            }
                                                        </option>
                                                    ),
                                                )}
                                            </select>

                                            {selectedCategory && (
                                                <small>
                                                    Selected:
                                                    {' '}
                                                    <strong>
                                                        {
                                                            selectedCategory.name
                                                        }
                                                    </strong>
                                                </small>
                                            )}
                                        </label>
                                    </section>

                                    {/* PRODUCT */}

                                    <section className="pm-section">
                                        <div className="pm-section-header">
                                            <div>
                                                <h3 className="pm-section-title">
                                                    2. Product Information
                                                </h3>

                                                <p className="pm-section-copy">
                                                    Enter the common information shared by all package sizes.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pm-grid">
                                            <label className="pm-field pm-full">
                                                <span className="pm-label">
                                                    Product Name
                                                    {' '}
                                                    <span className="pm-required">
                                                        *
                                                    </span>
                                                </span>

                                                <input
                                                    ref={
                                                        nameInputRef
                                                    }
                                                    className="pm-input"
                                                    value={
                                                        form.name
                                                    }
                                                    maxLength={
                                                        160
                                                    }
                                                    placeholder="Example: Tomato Seeds"
                                                    onChange={(event) => {
                                                        setForm(
                                                            (
                                                                current,
                                                            ) => ({
                                                                ...current,

                                                                name:
                                                                    event
                                                                        .target
                                                                        .value,
                                                            }),
                                                        );
                                                    }}
                                                />
                                            </label>

                                            <label className="pm-field">
                                                <span className="pm-label">
                                                    Main Product Unit
                                                    {' '}
                                                    <span className="pm-required">
                                                        *
                                                    </span>
                                                </span>

                                                <select
                                                    className="pm-select"
                                                    value={
                                                        form.unit
                                                    }
                                                    onChange={(event) => {
                                                        const unit =
                                                            event
                                                                .target
                                                                .value;

                                                        setForm(
                                                            (
                                                                current,
                                                            ) => ({
                                                                ...current,

                                                                unit,

                                                                variants:
                                                                    current
                                                                        .variants
                                                                        .map(
                                                                            (
                                                                                variant,
                                                                            ) => ({
                                                                                ...variant,

                                                                                package_unit:
                                                                                    variant
                                                                                        .package_unit
                                                                                    || unit,
                                                                            }),
                                                                        ),
                                                            }),
                                                        );
                                                    }}
                                                >
                                                    <option value="">
                                                        Select unit
                                                    </option>

                                                    {COMMON_UNITS.map(
                                                        (
                                                            unit,
                                                        ) => (
                                                            <option
                                                                key={
                                                                    unit
                                                                }
                                                                value={
                                                                    unit
                                                                }
                                                            >
                                                                {
                                                                    unit
                                                                }
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </label>

                                            <label className="pm-field">
                                                <span className="pm-label">
                                                    General Barcode
                                                    {' '}
                                                    <small>
                                                        Optional
                                                    </small>
                                                </span>

                                                <input
                                                    className="pm-input"
                                                    value={
                                                        form.barcode
                                                    }
                                                    maxLength={
                                                        120
                                                    }
                                                    placeholder="For normal product"
                                                    onChange={(event) => {
                                                        setForm(
                                                            (
                                                                current,
                                                            ) => ({
                                                                ...current,

                                                                barcode:
                                                                    event
                                                                        .target
                                                                        .value,
                                                            }),
                                                        );
                                                    }}
                                                />
                                            </label>
                                        </div>

                                        <div className="pm-info">
                                            For products with package variants, each variant can have its own barcode. Cost price, selling price, batch, expiry and stock are still recorded when purchasing stock.
                                        </div>
                                    </section>

                                    {/* VARIANTS */}

                                    <section className="pm-section">
                                        <div className="pm-section-header">
                                            <div>
                                                <h3 className="pm-section-title">
                                                    3. Package Variants
                                                </h3>

                                                <p className="pm-section-copy">
                                                    Add sizes such as 100g, 200g and 500g under this same product.
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                className="pm-button pm-button-primary"
                                                disabled={
                                                    isSubmitting
                                                }
                                                onClick={
                                                    addVariant
                                                }
                                            >
                                                <Icon name="plus" />

                                                Add Variant
                                            </button>
                                        </div>

                                        {form.variants.length
                                            === 0 ? (
                                            <div className="pm-empty-variants">
                                                This is currently a normal product with no package variants.
                                                <br />
                                                Click <strong>Add Variant</strong> when the product has multiple package sizes.
                                            </div>
                                        ) : (
                                            <div className="pm-variant-list">
                                                {form.variants.map(
                                                    (
                                                        variant,
                                                        index,
                                                    ) => (
                                                        <article
                                                            key={`${variant.id ?? 'new'}-${index}`}
                                                            className="pm-variant-card"
                                                        >
                                                            <div className="pm-variant-head">
                                                                <span className="pm-variant-title">
                                                                    Variant
                                                                    {' '}
                                                                    {
                                                                        index
                                                                        + 1
                                                                    }
                                                                </span>

                                                                <button
                                                                    type="button"
                                                                    className="pm-button pm-button-danger"
                                                                    disabled={
                                                                        isSubmitting
                                                                    }
                                                                    onClick={() => {
                                                                        removeVariant(
                                                                            index,
                                                                        );
                                                                    }}
                                                                >
                                                                    <Icon name="trash" />

                                                                    Remove
                                                                </button>
                                                            </div>

                                                            <div className="pm-variant-grid">
                                                                <label className="pm-field">
                                                                    <span className="pm-label">
                                                                        Size
                                                                    </span>

                                                                    <input
                                                                        type="number"
                                                                        min="0.001"
                                                                        step="0.001"
                                                                        className="pm-input"
                                                                        value={
                                                                            variant
                                                                                .size_value
                                                                        }
                                                                        placeholder="100"
                                                                        onChange={(event) => {
                                                                            updateVariant(
                                                                                index,
                                                                                {
                                                                                    size_value:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            );
                                                                        }}
                                                                    />
                                                                </label>

                                                                <label className="pm-field">
                                                                    <span className="pm-label">
                                                                        Size Unit
                                                                    </span>

                                                                    <select
                                                                        className="pm-select"
                                                                        value={
                                                                            variant
                                                                                .size_unit
                                                                        }
                                                                        onChange={(event) => {
                                                                            updateVariant(
                                                                                index,
                                                                                {
                                                                                    size_unit:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            );
                                                                        }}
                                                                    >
                                                                        <option value="">
                                                                            Select
                                                                        </option>

                                                                        {VARIANT_SIZE_UNITS.map(
                                                                            (
                                                                                unit,
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        unit
                                                                                    }
                                                                                    value={
                                                                                        unit
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        unit
                                                                                    }
                                                                                </option>
                                                                            ),
                                                                        )}
                                                                    </select>
                                                                </label>

                                                                <label className="pm-field">
                                                                    <span className="pm-label">
                                                                        Package
                                                                    </span>

                                                                    <select
                                                                        className="pm-select"
                                                                        value={
                                                                            variant
                                                                                .package_unit
                                                                        }
                                                                        onChange={(event) => {
                                                                            updateVariant(
                                                                                index,
                                                                                {
                                                                                    package_unit:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            );
                                                                        }}
                                                                    >
                                                                        <option value="">
                                                                            Select
                                                                        </option>

                                                                        {COMMON_UNITS.map(
                                                                            (
                                                                                unit,
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        unit
                                                                                    }
                                                                                    value={
                                                                                        unit
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        unit
                                                                                    }
                                                                                </option>
                                                                            ),
                                                                        )}
                                                                    </select>
                                                                </label>

                                                                <label className="pm-field">
                                                                    <span className="pm-label">
                                                                        Variant Barcode
                                                                    </span>

                                                                    <input
                                                                        className="pm-input"
                                                                        value={
                                                                            variant
                                                                                .barcode
                                                                        }
                                                                        maxLength={
                                                                            120
                                                                        }
                                                                        placeholder="Scan or enter barcode"
                                                                        onChange={(event) => {
                                                                            updateVariant(
                                                                                index,
                                                                                {
                                                                                    barcode:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            );
                                                                        }}
                                                                    />
                                                                </label>

                                                                <label className="pm-check">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            variant
                                                                                .is_active
                                                                        }
                                                                        onChange={(event) => {
                                                                            updateVariant(
                                                                                index,
                                                                                {
                                                                                    is_active:
                                                                                        event
                                                                                            .target
                                                                                            .checked,
                                                                                },
                                                                            );
                                                                        }}
                                                                    />

                                                                    Active
                                                                </label>
                                                            </div>
                                                        </article>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </section>
                                </div>

                                <footer className="pm-footer">
                                    <button
                                        type="button"
                                        className="pm-button"
                                        disabled={
                                            isSubmitting
                                        }
                                        onClick={
                                            closeForm
                                        }
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="pm-button pm-button-primary"
                                        disabled={
                                            isSubmitting
                                        }
                                    >
                                        {isSubmitting
                                            ? 'Saving...'
                                            : editingProduct
                                                ? 'Update Product'
                                                : 'Create Product'}
                                    </button>
                                </footer>
                            </form>
                        </section>
                    </div>
                </div>,
                document.body,
            )
            : null;

    return (
        <>
            <div id="sapo-products">
                <style>
                    {productsPageStyles}
                </style>

                <div className="pp-container">
                    <header className="pp-header">
                        <div>
                            <h1>
                                Products
                            </h1>

                            <p className="pp-subtitle">
                                Manage normal products and multi-size package variants from one place.
                            </p>
                        </div>

                        <div className="pp-header-actions">
                            <span className="pp-count">
                                {pagination.total}
                                {' '}
                                Products
                            </span>

                            <button
                                type="button"
                                className="pp-button pp-button-primary"
                                disabled={
                                    isCategoryLoading
                                }
                                onClick={
                                    openCreateForm
                                }
                            >
                                <Icon name="plus" />

                                Add Product
                            </button>
                        </div>
                    </header>

                    {successMessage && (
                        <div className="pp-alert pp-alert-success">
                            {
                                successMessage
                            }
                        </div>
                    )}

                    {pageError && (
                        <div className="pp-alert pp-alert-error">
                            {
                                pageError
                            }
                        </div>
                    )}

                    <section className="pp-panel">
                        <form
                            className="pp-toolbar"
                            onSubmit={(event) => {
                                event.preventDefault();

                                setPage(
                                    1,
                                );

                                setSearch(
                                    searchInput
                                        .trim(),
                                );
                            }}
                        >
                            <label className="pp-field">
                                <span className="pp-label">
                                    Search Products
                                </span>

                                <input
                                    className="pp-input"
                                    value={
                                        searchInput
                                    }
                                    placeholder="Name, SKU, barcode, category or variant"
                                    onChange={(event) => {
                                        setSearchInput(
                                            event
                                                .target
                                                .value,
                                        );
                                    }}
                                />
                            </label>

                            <button
                                type="submit"
                                className="pp-button"
                            >
                                <Icon name="search" />

                                Search
                            </button>

                            <label className="pp-field">
                                <span className="pp-label">
                                    Rows
                                </span>

                                <select
                                    className="pp-select"
                                    value={
                                        perPage
                                    }
                                    onChange={(event) => {
                                        setPerPage(
                                            Number(
                                                event
                                                    .target
                                                    .value,
                                            ),
                                        );

                                        setPage(
                                            1,
                                        );
                                    }}
                                >
                                    {PAGE_SIZE_OPTIONS.map(
                                        (
                                            option,
                                        ) => (
                                            <option
                                                key={
                                                    option
                                                }
                                                value={
                                                    option
                                                }
                                            >
                                                {
                                                    option
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>
                        </form>

                        <div className="pp-table-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th>
                                            Product
                                        </th>

                                        <th>
                                            Category
                                        </th>

                                        <th>
                                            Main Unit
                                        </th>

                                        {/* <th>
                                            Variants
                                        </th> */}

                                        <th>
                                            Barcode
                                        </th>

                                        {/* <th>
                                            Available Stock
                                        </th> */}

                                        <th>
                                            Status
                                        </th>

                                        <th>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={8}>
                                                Loading products...
                                            </td>
                                        </tr>
                                    ) : products.length
                                        === 0 ? (
                                        <tr>
                                            <td colSpan={8}>
                                                No products found.
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map(
                                            (
                                                product,
                                            ) => (
                                                <tr
                                                    key={
                                                        product.id
                                                    }
                                                >
                                                    <td>
                                                        <strong className="pp-product-name">
                                                            {
                                                                product.name
                                                            }
                                                        </strong>

                                                        <span className="pp-small">
                                                            SKU:
                                                            {' '}
                                                            {
                                                                product.sku
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className="pp-badge">
                                                            {product
                                                                .category
                                                                ?.name
                                                                ?? 'Not assigned'}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {
                                                            product.unit
                                                        }
                                                    </td>

                                                    {/* <td>
                                                        {product
                                                            .variants
                                                            .length
                                                            === 0 ? (
                                                            <span className="pp-small">
                                                                Standard product
                                                            </span>
                                                        ) : (
                                                            <div className="pp-variants">
                                                                {product
                                                                    .variants
                                                                    .map(
                                                                        (
                                                                            variant,
                                                                        ) => (
                                                                            <span
                                                                                key={
                                                                                    variant.id
                                                                                }
                                                                                className="pp-variant"
                                                                            >
                                                                                {
                                                                                    variant.display_name
                                                                                }
                                                                            </span>
                                                                        ),
                                                                    )}
                                                            </div>
                                                        )}
                                                    </td> */}

                                                    <td>
                                                        {product.barcode
                                                            || (
                                                                product
                                                                    .variants
                                                                    .some(
                                                                        (
                                                                            variant,
                                                                        ) =>
                                                                            Boolean(
                                                                                variant
                                                                                    .barcode,
                                                                            ),
                                                                    )
                                                                    ? 'Variant barcodes'
                                                                    : 'Not assigned'
                                                            )}
                                                    </td>

                                                    {/* <td>
                                                        {product
                                                            .variants
                                                            .length
                                                            > 0 ? (
                                                            <div className="pp-stock-group">
                                                                {product
                                                                    .variants
                                                                    .map(
                                                                        (
                                                                            variant,
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    variant.id
                                                                                }
                                                                                className="pp-stock-variant"
                                                                            >
                                                                                <span className="pp-stock-name">
                                                                                    {
                                                                                        variant.display_name
                                                                                    }
                                                                                </span>

                                                                                {variant
                                                                                    .available_stock_by_unit
                                                                                    .map(
                                                                                        (
                                                                                            stock,
                                                                                        ) => (
                                                                                            <span
                                                                                                key={`${variant.id}-${stock.unit}`}
                                                                                                className="pp-stock"
                                                                                            >
                                                                                                {formatNumber(
                                                                                                    stock
                                                                                                        .available_quantity,
                                                                                                )}
                                                                                                {' '}
                                                                                                {
                                                                                                    stock.unit
                                                                                                }
                                                                                            </span>
                                                                                        ),
                                                                                    )}
                                                                            </div>
                                                                        ),
                                                                    )}
                                                            </div>
                                                        ) : (
                                                            <div className="pp-stock-group">
                                                                {product
                                                                    .available_stock_by_unit
                                                                    .map(
                                                                        (
                                                                            stock,
                                                                        ) => (
                                                                            <span
                                                                                key={
                                                                                    stock.unit
                                                                                }
                                                                                className="pp-stock"
                                                                            >
                                                                                {formatNumber(
                                                                                    stock
                                                                                        .available_quantity,
                                                                                )}
                                                                                {' '}
                                                                                {
                                                                                    stock.unit
                                                                                }
                                                                            </span>
                                                                        ),
                                                                    )}
                                                            </div>
                                                        )}
                                                    </td> */}

                                                    <td>
                                                        <span className="pp-badge">
                                                            {product.is_active
                                                                ? 'Active'
                                                                : 'Inactive'}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="pp-actions">
                                                            <button
                                                                type="button"
                                                                className="pp-button"
                                                                onClick={() => {
                                                                    navigate(
                                                                        `/admin/products/${product.id}`,
                                                                    );
                                                                }}
                                                            >
                                                                <Icon name="eye" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="pp-button"
                                                                onClick={() => {
                                                                    openEditForm(
                                                                        product,
                                                                    );
                                                                }}
                                                            >
                                                                <Icon name="edit" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="pp-button pp-button-danger"
                                                                onClick={() => {
                                                                    void handleDelete(
                                                                        product,
                                                                    );
                                                                }}
                                                            >
                                                                <Icon name="trash" />
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

                        {pagination.total > 0 && (
                            <footer className="pp-pagination">
                                <span>
                                    Showing
                                    {' '}
                                    <strong>
                                        {pagination.from
                                            ?? 0}
                                    </strong>
                                    {' '}
                                    -
                                    {' '}
                                    <strong>
                                        {pagination.to
                                            ?? 0}
                                    </strong>
                                    {' '}
                                    of
                                    {' '}
                                    <strong>
                                        {
                                            pagination.total
                                        }
                                    </strong>
                                </span>

                                <div className="pp-actions">
                                    <button
                                        type="button"
                                        className="pp-button"
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
                                                        current
                                                        - 1,
                                                    ),
                                            );
                                        }}
                                    >
                                        <Icon name="chevron-left" />

                                        Previous
                                    </button>

                                    <span>
                                        Page
                                        {' '}
                                        {
                                            pagination.current_page
                                        }
                                        {' '}
                                        /
                                        {' '}
                                        {
                                            pagination.last_page
                                        }
                                    </span>

                                    <button
                                        type="button"
                                        className="pp-button"
                                        disabled={
                                            page
                                            >= pagination.last_page
                                        }
                                        onClick={() => {
                                            setPage(
                                                (
                                                    current,
                                                ) =>
                                                    Math.min(
                                                        pagination
                                                            .last_page,
                                                        current
                                                        + 1,
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
                </div>
            </div>

            {modal}
        </>
    );
}