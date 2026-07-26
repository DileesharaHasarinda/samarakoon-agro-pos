import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import BarcodeLabel
    from '../../components/barcodes/BarcodeLabel';

import Code128Barcode
    from '../../components/barcodes/Code128Barcode';

import {
    ApiError,
} from '../../lib/api';

import {
    generateMissingBarcodes,
    generateProductBarcode,
    getBarcodeProducts,
    updateProductBarcode,
} from '../../services/barcodeService';

import {
    getBusinessSettings,
} from '../../services/businessSettingService';

import {
    defaultBusinessSetting,
} from '../../types/businessSetting';

import type {
    BarcodeLabelSettings,
    BarcodeProduct,
    BarcodeSummary,
} from '../../types/barcode';

import type {
    BusinessSetting,
} from '../../types/businessSetting';

import type {
    PosPaginationMeta,
} from '../../types/sale';

const emptySummary:
    BarcodeSummary = {
    total_products: 0,
    assigned_barcodes: 0,
    missing_barcodes: 0,
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

const defaultLabelSettings:
    BarcodeLabelSettings = {
    width_mm: 50,
    height_mm: 30,
    copies: 1,
    show_business_name: true,
    show_product_name: true,
    show_sku: true,
    show_price: true,
};

function formatCurrency(
    value: number | null,
    currencyCode: string,
): string {
    if (value === null) {
        return 'No active price';
    }

    try {
        return new Intl.NumberFormat(
            'en-GB',
            {
                style: 'currency',
                currency:
                    currencyCode,
                minimumFractionDigits: 2,
            },
        ).format(value);
    } catch {
        return new Intl.NumberFormat(
            'en-GB',
            {
                style: 'currency',
                currency: 'LKR',
                minimumFractionDigits: 2,
            },
        ).format(value);
    }
}

export default function BarcodeManagementPage() {
    const {
        token,
    } = useAuth();

    const [
        products,
        setProducts,
    ] = useState<
        BarcodeProduct[]
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
        businessSettings,
        setBusinessSettings,
    ] = useState<BusinessSetting>(
        defaultBusinessSetting,
    );

    const [
        labelSettings,
        setLabelSettings,
    ] = useState<BarcodeLabelSettings>(
        defaultLabelSettings,
    );

    const [
        barcodeDrafts,
        setBarcodeDrafts,
    ] = useState<
        Record<number, string>
    >({});

    const [
        selectedIds,
        setSelectedIds,
    ] = useState<Set<number>>(
        new Set(),
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
        barcodeStatus,
        setBarcodeStatus,
    ] = useState('all');

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        perPage,
        setPerPage,
    ] = useState(20);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isGenerating,
        setIsGenerating,
    ] = useState(false);

    const [
        busyProductId,
        setBusyProductId,
    ] = useState<number | null>(
        null,
    );

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const loadBusinessSettings =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                try {
                    const response =
                        await getBusinessSettings(
                            token,
                        );

                    setBusinessSettings(
                        response.data,
                    );
                } catch {
                    setBusinessSettings(
                        defaultBusinessSetting,
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
                        await getBarcodeProducts(
                            token,
                            {
                                search,
                                barcodeStatus,
                                page,
                                perPage,
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

                    setBarcodeDrafts(
                        Object.fromEntries(
                            response.data.map(
                                (product) => [
                                    product.id,
                                    product.barcode
                                    ?? '',
                                ],
                            ),
                        ),
                    );

                    setSelectedIds(
                        new Set(),
                    );
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load barcode products.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [
                token,
                search,
                barcodeStatus,
                page,
                perPage,
            ],
        );

    useEffect(() => {
        void Promise.all([
            loadProducts(),
            loadBusinessSettings(),
        ]);
    }, [
        loadProducts,
        loadBusinessSettings,
    ]);

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

    const selectedProducts =
        useMemo(
            () =>
                products.filter(
                    (product) =>
                        selectedIds.has(
                            product.id,
                        )
                        && product.barcode,
                ),
            [
                products,
                selectedIds,
            ],
        );

    const toggleSelection = (
        productId: number,
    ): void => {
        setSelectedIds(
            (current) => {
                const next =
                    new Set(current);

                if (
                    next.has(
                        productId,
                    )
                ) {
                    next.delete(
                        productId,
                    );
                } else {
                    next.add(
                        productId,
                    );
                }

                return next;
            },
        );
    };

    const selectVisible =
        (): void => {
            const printableIds =
                products
                    .filter(
                        (product) =>
                            product.barcode,
                    )
                    .map(
                        (product) =>
                            product.id,
                    );

            setSelectedIds(
                new Set(
                    printableIds,
                ),
            );
        };

    const saveBarcode =
        async (
            product: BarcodeProduct,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setBusyProductId(
                product.id,
            );

            setPageError('');
            setSuccessMessage('');

            try {
                const response =
                    await updateProductBarcode(
                        token,
                        product.id,
                        barcodeDrafts[
                        product.id
                        ]
                        ?? '',
                    );

                setSuccessMessage(
                    response.message,
                );

                await loadProducts();
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to update the product barcode.',
                );
            } finally {
                setBusyProductId(null);
            }
        };

    const generateOne =
        async (
            product: BarcodeProduct,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setBusyProductId(
                product.id,
            );

            setPageError('');
            setSuccessMessage('');

            try {
                const response =
                    await generateProductBarcode(
                        token,
                        product.id,
                    );

                setSuccessMessage(
                    response.message,
                );

                await loadProducts();
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to generate the product barcode.',
                );
            } finally {
                setBusyProductId(null);
            }
        };

    const generateMissing =
        async (): Promise<void> => {
            if (!token) {
                return;
            }

            const selectedMissingIds =
                products
                    .filter(
                        (product) =>
                            selectedIds.has(
                                product.id,
                            )
                            && !product
                                .barcode,
                    )
                    .map(
                        (product) =>
                            product.id,
                    );

            const message =
                selectedMissingIds.length
                    > 0
                    ? `Generate barcodes for ${selectedMissingIds.length} selected products?`
                    : 'Generate barcodes for every product currently missing a barcode?';

            if (
                !window.confirm(
                    message,
                )
            ) {
                return;
            }

            setIsGenerating(true);
            setPageError('');
            setSuccessMessage('');

            try {
                const response =
                    await generateMissingBarcodes(
                        token,
                        selectedMissingIds
                            .length > 0
                            ? selectedMissingIds
                            : undefined,
                    );

                setSuccessMessage(
                    response.message,
                );

                await loadProducts();
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to generate missing barcodes.',
                );
            } finally {
                setIsGenerating(false);
            }
        };

    const printLabels =
        (): void => {
            if (
                selectedProducts.length
                === 0
            ) {
                setPageError(
                    'Select at least one product with a barcode.',
                );

                return;
            }

            setPageError('');

            window.setTimeout(
                () => {
                    window.print();
                },
                100,
            );
        };

    return (
        <div className="page-stack">
            <section className="barcode-page-header">
                <div>
                    <span className="page-kicker">
                        Product identification
                    </span>

                    <h2>
                        Barcode Management
                    </h2>

                    <p>
                        Generate, assign and print
                        Code 128 product barcode labels.
                    </p>
                </div>

                <div className="barcode-header-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        disabled={
                            isLoading
                            || isGenerating
                        }
                        onClick={() => {
                            void loadProducts();
                        }}
                    >
                        Refresh
                    </button>

                    <button
                        type="button"
                        className="primary-button"
                        disabled={isGenerating}
                        onClick={() => {
                            void generateMissing();
                        }}
                    >
                        {isGenerating
                            ? 'Generating...'
                            : 'Generate Missing'}
                    </button>
                </div>
            </section>

            <section className="barcode-summary-grid">
                <article>
                    <span>
                        Total Products
                    </span>

                    <strong>
                        {summary.total_products}
                    </strong>
                </article>

                <article>
                    <span>
                        Assigned Barcodes
                    </span>

                    <strong>
                        {
                            summary
                                .assigned_barcodes
                        }
                    </strong>
                </article>

                <article>
                    <span>
                        Missing Barcodes
                    </span>

                    <strong className="barcode-missing-value">
                        {
                            summary
                                .missing_barcodes
                        }
                    </strong>
                </article>

                <article>
                    <span>
                        Selected Labels
                    </span>

                    <strong>
                        {selectedProducts.length
                            * labelSettings
                                .copies}
                    </strong>
                </article>
            </section>

            {successMessage && (
                <div
                    className="success-alert"
                    role="status"
                >
                    <span>✓</span>

                    <p>
                        {successMessage}
                    </p>

                    <button
                        type="button"
                        onClick={() => {
                            setSuccessMessage('');
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            {pageError && (
                <div
                    className="form-alert"
                    role="alert"
                >
                    {pageError}
                </div>
            )}

            <section className="barcode-layout">
                <div className="content-card barcode-products-panel">
                    <div className="barcode-toolbar">
                        <input
                            type="search"
                            value={searchInput}
                            placeholder="Search product, SKU or barcode..."
                            onChange={(event) => {
                                setSearchInput(
                                    event.target.value,
                                );
                            }}
                        />

                        <select
                            value={
                                barcodeStatus
                            }
                            onChange={(event) => {
                                setBarcodeStatus(
                                    event.target
                                        .value,
                                );

                                setPage(1);
                            }}
                        >
                            <option value="all">
                                All Products
                            </option>

                            <option value="assigned">
                                Barcode Assigned
                            </option>

                            <option value="missing">
                                Barcode Missing
                            </option>
                        </select>

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
                                10 rows
                            </option>

                            <option value={20}>
                                20 rows
                            </option>

                            <option value={50}>
                                50 rows
                            </option>
                        </select>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={
                                selectVisible
                            }
                        >
                            Select Printable
                        </button>
                    </div>

                    <div className="barcode-table-container">
                        <table className="barcode-table">
                            <thead>
                                <tr>
                                    <th>Select</th>
                                    <th>Product</th>
                                    <th>Preview</th>
                                    <th>Barcode Value</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="table-state"
                                        >
                                            Loading barcode products...
                                        </td>
                                    </tr>
                                ) : products
                                    .length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
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
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            selectedIds
                                                                .has(
                                                                    product.id,
                                                                )
                                                        }
                                                        disabled={
                                                            !product
                                                                .barcode
                                                        }
                                                        onChange={() => {
                                                            toggleSelection(
                                                                product.id,
                                                            );
                                                        }}
                                                    />
                                                </td>

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
                                                                ?.name
                                                            ?? 'No category'}
                                                        {' · '}
                                                        {product
                                                            .sku
                                                            ?? 'No SKU'}
                                                    </small>
                                                </td>

                                                <td>
                                                    {product.barcode ? (
                                                        <Code128Barcode
                                                            value={
                                                                product
                                                                    .barcode
                                                            }
                                                            height={30}
                                                            showText={
                                                                false
                                                            }
                                                            className="barcode-table-preview"
                                                        />
                                                    ) : (
                                                        <span className="barcode-missing-badge">
                                                            Missing
                                                        </span>
                                                    )}
                                                </td>

                                                <td>
                                                    <input
                                                        className="barcode-value-input"
                                                        maxLength={64}
                                                        value={
                                                            barcodeDrafts[
                                                            product.id
                                                            ]
                                                            ?? ''
                                                        }
                                                        onChange={(event) => {
                                                            setBarcodeDrafts(
                                                                (
                                                                    current,
                                                                ) => ({
                                                                    ...current,

                                                                    [product.id]:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            );
                                                        }}
                                                    />
                                                </td>

                                                <td>
                                                    {formatCurrency(
                                                        product
                                                            .current_selling_price,
                                                        businessSettings
                                                            .currency_code,
                                                    )}
                                                </td>

                                                <td>
                                                    {
                                                        product
                                                            .total_available_quantity
                                                    }
                                                    {' '}
                                                    {
                                                        product
                                                            .unit
                                                    }
                                                </td>

                                                <td>
                                                    <div className="barcode-row-actions">
                                                        <button
                                                            type="button"
                                                            className="view-sale-button"
                                                            disabled={
                                                                busyProductId
                                                                === product.id
                                                            }
                                                            onClick={() => {
                                                                void saveBarcode(
                                                                    product,
                                                                );
                                                            }}
                                                        >
                                                            Save
                                                        </button>

                                                        {!product
                                                            .barcode && (
                                                                <button
                                                                    type="button"
                                                                    className="secondary-button"
                                                                    disabled={
                                                                        busyProductId
                                                                        === product.id
                                                                    }
                                                                    onClick={() => {
                                                                        void generateOne(
                                                                            product,
                                                                        );
                                                                    }}
                                                                >
                                                                    Generate
                                                                </button>
                                                            )}
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
                        <footer className="category-pagination">
                            <p>
                                Showing{' '}

                                <strong>
                                    {
                                        pagination
                                            .from
                                    }
                                </strong>

                                {' '}to{' '}

                                <strong>
                                    {
                                        pagination
                                            .to
                                    }
                                </strong>

                                {' '}of{' '}

                                <strong>
                                    {
                                        pagination
                                            .total
                                    }
                                </strong>

                                {' '}products
                            </p>

                            <div>
                                <button
                                    type="button"
                                    className="pagination-button"
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
                                    Previous
                                </button>

                                <span>
                                    Page{' '}

                                    <strong>
                                        {
                                            pagination
                                                .current_page
                                        }
                                    </strong>

                                    {' '}of{' '}

                                    <strong>
                                        {
                                            pagination
                                                .last_page
                                        }
                                    </strong>
                                </span>

                                <button
                                    type="button"
                                    className="pagination-button"
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
                                </button>
                            </div>
                        </footer>
                    )}
                </div>

                <aside className="content-card barcode-label-settings">
                    <header className="panel-heading">
                        <div>
                            <h2>
                                Label Printing
                            </h2>

                            <p>
                                Configure the printed
                                barcode label layout.
                            </p>
                        </div>
                    </header>

                    <div className="barcode-settings-form">
                        <label>
                            <span>
                                Label Width
                            </span>

                            <div className="barcode-measurement-field">
                                <input
                                    type="number"
                                    min="25"
                                    max="100"
                                    step="1"
                                    value={
                                        labelSettings
                                            .width_mm
                                    }
                                    onChange={(event) => {
                                        setLabelSettings(
                                            (
                                                current,
                                            ) => ({
                                                ...current,

                                                width_mm:
                                                    Number(
                                                        event
                                                            .target
                                                            .value,
                                                    ),
                                            }),
                                        );
                                    }}
                                />

                                <strong>mm</strong>
                            </div>
                        </label>

                        <label>
                            <span>
                                Label Height
                            </span>

                            <div className="barcode-measurement-field">
                                <input
                                    type="number"
                                    min="20"
                                    max="80"
                                    step="1"
                                    value={
                                        labelSettings
                                            .height_mm
                                    }
                                    onChange={(event) => {
                                        setLabelSettings(
                                            (
                                                current,
                                            ) => ({
                                                ...current,

                                                height_mm:
                                                    Number(
                                                        event
                                                            .target
                                                            .value,
                                                    ),
                                            }),
                                        );
                                    }}
                                />

                                <strong>mm</strong>
                            </div>
                        </label>

                        <label>
                            <span>
                                Copies Per Product
                            </span>

                            <select
                                value={
                                    labelSettings
                                        .copies
                                }
                                onChange={(event) => {
                                    setLabelSettings(
                                        (
                                            current,
                                        ) => ({
                                            ...current,

                                            copies:
                                                Number(
                                                    event
                                                        .target
                                                        .value,
                                                ),
                                        }),
                                    );
                                }}
                            >
                                <option value={1}>
                                    1 Copy
                                </option>

                                <option value={2}>
                                    2 Copies
                                </option>

                                <option value={3}>
                                    3 Copies
                                </option>

                                <option value={5}>
                                    5 Copies
                                </option>

                                <option value={10}>
                                    10 Copies
                                </option>
                            </select>
                        </label>

                        <div className="barcode-print-options">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={
                                        labelSettings
                                            .show_business_name
                                    }
                                    onChange={(event) => {
                                        setLabelSettings(
                                            (
                                                current,
                                            ) => ({
                                                ...current,

                                                show_business_name:
                                                    event
                                                        .target
                                                        .checked,
                                            }),
                                        );
                                    }}
                                />

                                <span>
                                    Business Name
                                </span>
                            </label>

                            <label>
                                <input
                                    type="checkbox"
                                    checked={
                                        labelSettings
                                            .show_product_name
                                    }
                                    onChange={(event) => {
                                        setLabelSettings(
                                            (
                                                current,
                                            ) => ({
                                                ...current,

                                                show_product_name:
                                                    event
                                                        .target
                                                        .checked,
                                            }),
                                        );
                                    }}
                                />

                                <span>
                                    Product Name
                                </span>
                            </label>

                            <label>
                                <input
                                    type="checkbox"
                                    checked={
                                        labelSettings
                                            .show_sku
                                    }
                                    onChange={(event) => {
                                        setLabelSettings(
                                            (
                                                current,
                                            ) => ({
                                                ...current,

                                                show_sku:
                                                    event
                                                        .target
                                                        .checked,
                                            }),
                                        );
                                    }}
                                />

                                <span>
                                    Product SKU
                                </span>
                            </label>

                            <label>
                                <input
                                    type="checkbox"
                                    checked={
                                        labelSettings
                                            .show_price
                                    }
                                    onChange={(event) => {
                                        setLabelSettings(
                                            (
                                                current,
                                            ) => ({
                                                ...current,

                                                show_price:
                                                    event
                                                        .target
                                                        .checked,
                                            }),
                                        );
                                    }}
                                />

                                <span>
                                    Selling Price
                                </span>
                            </label>
                        </div>

                        <button
                            type="button"
                            className="primary-button"
                            disabled={
                                selectedProducts
                                    .length === 0
                            }
                            onClick={
                                printLabels
                            }
                        >
                            Print Selected Labels
                        </button>
                    </div>

                    <div className="barcode-label-preview">
                        {products.find(
                            (product) =>
                                product.barcode,
                        ) ? (
                            <BarcodeLabel
                                businessName={
                                    businessSettings
                                        .business_short_name
                                    ?? businessSettings
                                        .business_name
                                }
                                currencyCode={
                                    businessSettings
                                        .currency_code
                                }
                                product={
                                    products.find(
                                        (product) =>
                                            product
                                                .barcode,
                                    )!
                                }
                                settings={
                                    labelSettings
                                }
                            />
                        ) : (
                            <div className="table-state">
                                Generate a barcode to
                                display the label preview.
                            </div>
                        )}
                    </div>
                </aside>
            </section>

            <div
                className="barcode-print-area"
                aria-hidden="true"
                style={{
                    gridTemplateColumns:
                        `repeat(auto-fill, ${labelSettings.width_mm}mm)`,
                }}
            >
                {selectedProducts.flatMap(
                    (product) =>
                        Array.from(
                            {
                                length:
                                    labelSettings
                                        .copies,
                            },
                            (
                                _,
                                copyIndex,
                            ) => (
                                <BarcodeLabel
                                    key={`${product.id}-${copyIndex}`}
                                    businessName={
                                        businessSettings
                                            .business_short_name
                                        ?? businessSettings
                                            .business_name
                                    }
                                    currencyCode={
                                        businessSettings
                                            .currency_code
                                    }
                                    product={
                                        product
                                    }
                                    settings={
                                        labelSettings
                                    }
                                />
                            ),
                        ),
                )}
            </div>
        </div>
    );
}