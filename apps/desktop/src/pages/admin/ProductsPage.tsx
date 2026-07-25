import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import {
    Link,
} from 'react-router';

import {
    useAuth,
} from '../../auth/AuthContext';

import DeleteProductModal
    from '../../components/products/DeleteProductModal';

import ProductFormModal
    from '../../components/products/ProductFormModal';

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
    ValidationErrors,
} from '../../types/auth';

import type {
    Product,
    ProductCategory,
    ProductFormValues,
    ProductPaginationMeta,
} from '../../types/product';

const emptyFormValues:
    ProductFormValues = {
    category_id: '',
    name: '',
    sku: '',
    barcode: '',
    description: '',
    cost_price: '',
    selling_price: '',
    reorder_level: '0',
    unit: '',
    expiry_date: '',
};

const initialPagination:
    ProductPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null,
};

const currencyFormatter =
    new Intl.NumberFormat(
        'en-LK',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        },
    );

function formatCurrency(
    value: number,
): string {
    return currencyFormatter.format(
        value,
    );
}

function formatDate(
    value: string,
): string {
    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    ).format(new Date(value));
}

function formatExpiryDate(
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
        new Date(`${value}T00:00:00`),
    );
}

export default function ProductsPage() {
    const {
        token,
    } = useAuth();

    const [
        products,
        setProducts,
    ] = useState<Product[]>([]);

    const [
        categories,
        setCategories,
    ] = useState<ProductCategory[]>(
        [],
    );

    const [
        pagination,
        setPagination,
    ] = useState<ProductPaginationMeta>(
        initialPagination,
    );

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        perPage,
        setPerPage,
    ] = useState(10);

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
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isLoadingCategories,
        setIsLoadingCategories,
    ] = useState(true);

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        categoryError,
        setCategoryError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const [
        isFormOpen,
        setIsFormOpen,
    ] = useState(false);

    const [
        editingProduct,
        setEditingProduct,
    ] = useState<Product | null>(
        null,
    );

    const [
        formValues,
        setFormValues,
    ] = useState<ProductFormValues>({
        ...emptyFormValues,
    });

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        formError,
        setFormError,
    ] = useState('');

    const [
        fieldErrors,
        setFieldErrors,
    ] = useState<ValidationErrors>(
        {},
    );

    const [
        deleteTarget,
        setDeleteTarget,
    ] = useState<Product | null>(
        null,
    );

    const [
        isDeleting,
        setIsDeleting,
    ] = useState(false);

    const [
        deleteError,
        setDeleteError,
    ] = useState('');

    const loadCategoryOptions =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoadingCategories(true);
                setCategoryError('');

                try {
                    const response =
                        await getProductCategoryOptions(
                            token,
                        );

                    setCategories(response.data);
                } catch (error) {
                    if (error instanceof ApiError) {
                        setCategoryError(
                            error.message,
                        );
                    } else {
                        setCategoryError(
                            'Unable to load product categories.',
                        );
                    }
                } finally {
                    setIsLoadingCategories(false);
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
                        await getProducts(
                            token,
                            {
                                page,
                                perPage,
                                search:
                                    appliedSearch,

                                categoryId:
                                    categoryFilter,
                            },
                        );

                    setProducts(response.data);
                    setPagination(response.meta);
                } catch (error) {
                    if (error instanceof ApiError) {
                        setPageError(
                            error.message,
                        );
                    } else {
                        setPageError(
                            'Unable to load products.',
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
                categoryFilter,
            ],
        );

    useEffect(() => {
        void loadCategoryOptions();
    }, [loadCategoryOptions]);

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
            }, 350);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [searchInput]);

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeout =
            window.setTimeout(() => {
                setSuccessMessage('');
            }, 3500);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [successMessage]);

    const resetForm = (): void => {
        setEditingProduct(null);

        setFormValues({
            ...emptyFormValues,
        });

        setFormError('');
        setFieldErrors({});
    };

    const openCreateModal = (): void => {
        if (categories.length === 0) {
            setCategoryError(
                'Create at least one category before adding a product.',
            );

            return;
        }

        resetForm();
        setIsFormOpen(true);
    };

    const openEditModal = (
        product: Product,
    ): void => {
        setEditingProduct(product);

        setFormValues({
            category_id:
                String(product.category_id),

            name:
                product.name,

            sku:
                product.sku ?? '',

            barcode:
                product.barcode ?? '',

            description:
                product.description ?? '',

            cost_price:
                String(product.cost_price),

            selling_price:
                String(product.selling_price),

            reorder_level:
                String(product.reorder_level),

            unit:
                product.unit,

            expiry_date:
                product.expiry_date ?? '',
        });

        setFormError('');
        setFieldErrors({});
        setIsFormOpen(true);
    };

    const closeFormModal = (): void => {
        if (isSubmitting) {
            return;
        }

        setIsFormOpen(false);
        resetForm();
    };

    const handleFormChange = (
        field: keyof ProductFormValues,
        value: string,
    ): void => {
        setFormValues(
            (current) => ({
                ...current,
                [field]: value,
            }),
        );

        setFieldErrors(
            (current) => ({
                ...current,
                [field]: undefined,
            }),
        );

        setFormError('');
    };

    const validateForm = (): boolean => {
        const errors: ValidationErrors =
            {};

        const trimmedName =
            formValues.name.trim();

        const costPrice =
            Number(formValues.cost_price);

        const sellingPrice =
            Number(formValues.selling_price);

        const reorderLevel =
            Number(formValues.reorder_level);

        if (!formValues.category_id) {
            errors.category_id = [
                'Please select a category first.',
            ];
        }

        if (!trimmedName) {
            errors.name = [
                'Please enter the product name.',
            ];
        } else if (
            trimmedName.length > 160
        ) {
            errors.name = [
                'The product name cannot exceed 160 characters.',
            ];
        }

        if (
            formValues.sku.trim().length
            > 100
        ) {
            errors.sku = [
                'The SKU cannot exceed 100 characters.',
            ];
        }

        if (
            formValues.barcode.trim()
                .length > 120
        ) {
            errors.barcode = [
                'The barcode cannot exceed 120 characters.',
            ];
        }

        if (
            formValues.description.trim()
                .length > 1500
        ) {
            errors.description = [
                'The description cannot exceed 1500 characters.',
            ];
        }

        if (
            formValues.cost_price === ''
            || Number.isNaN(costPrice)
            || costPrice < 0
        ) {
            errors.cost_price = [
                'Enter a valid cost price of zero or greater.',
            ];
        }

        if (
            formValues.selling_price === ''
            || Number.isNaN(sellingPrice)
            || sellingPrice < 0
        ) {
            errors.selling_price = [
                'Enter a valid selling price of zero or greater.',
            ];
        }

        if (
            formValues.reorder_level === ''
            || !Number.isInteger(
                reorderLevel,
            )
            || reorderLevel < 0
        ) {
            errors.reorder_level = [
                'Enter a valid whole-number reorder level.',
            ];
        }

        if (!formValues.unit) {
            errors.unit = [
                'Please select a product unit.',
            ];
        }

        setFieldErrors(errors);

        return Object.keys(errors)
            .length === 0;
    };

    const handleSubmit =
        async (
            event: FormEvent<HTMLFormElement>,
        ): Promise<void> => {
            event.preventDefault();

            if (
                isSubmitting
                || !token
            ) {
                return;
            }

            setFormError('');
            setFieldErrors({});

            if (!validateForm()) {
                return;
            }

            setIsSubmitting(true);

            try {
                if (editingProduct) {
                    const response =
                        await updateProduct(
                            token,
                            editingProduct.id,
                            formValues,
                        );

                    setSuccessMessage(
                        response.message
                        ?? 'Product updated successfully.',
                    );

                    setIsFormOpen(false);
                    resetForm();

                    await loadProducts();
                } else {
                    const response =
                        await createProduct(
                            token,
                            formValues,
                        );

                    setSuccessMessage(
                        response.message
                        ?? 'Product created successfully.',
                    );

                    setIsFormOpen(false);
                    resetForm();

                    if (page === 1) {
                        await loadProducts();
                    } else {
                        setPage(1);
                    }
                }
            } catch (error) {
                if (error instanceof ApiError) {
                    setFormError(
                        error.message,
                    );

                    setFieldErrors(
                        error.errors ?? {},
                    );
                } else {
                    setFormError(
                        'Unable to save the product.',
                    );
                }
            } finally {
                setIsSubmitting(false);
            }
        };

    const openDeleteModal = (
        product: Product,
    ): void => {
        setDeleteTarget(product);
        setDeleteError('');
    };

    const closeDeleteModal = (): void => {
        if (isDeleting) {
            return;
        }

        setDeleteTarget(null);
        setDeleteError('');
    };

    const handleDelete =
        async (): Promise<void> => {
            if (
                !deleteTarget
                || !token
                || isDeleting
            ) {
                return;
            }

            setIsDeleting(true);
            setDeleteError('');

            try {
                const response =
                    await deleteProduct(
                        token,
                        deleteTarget.id,
                    );

                setSuccessMessage(
                    response.message,
                );

                setDeleteTarget(null);

                if (
                    products.length === 1
                    && page > 1
                ) {
                    setPage(
                        (currentPage) =>
                            currentPage - 1,
                    );
                } else {
                    await loadProducts();
                }
            } catch (error) {
                if (error instanceof ApiError) {
                    setDeleteError(
                        error.message,
                    );
                } else {
                    setDeleteError(
                        'Unable to delete the product.',
                    );
                }
            } finally {
                setIsDeleting(false);
            }
        };

    const clearSearch = (): void => {
        setSearchInput('');
        setAppliedSearch('');
        setPage(1);
    };

    const clearFilters = (): void => {
        setSearchInput('');
        setAppliedSearch('');
        setCategoryFilter('');
        setPage(1);
    };

    const hasFilters =
        appliedSearch !== ''
        || categoryFilter !== '';

    return (
        <div className="page-stack">
            <section className="product-page-header">
                <div>
                    <span className="page-kicker">
                        Product catalogue
                    </span>

                    <h2>Products</h2>

                    <p>
                        Create and manage products,
                        pricing, units and optional
                        expiry dates.
                    </p>
                </div>

                <button
                    type="button"
                    className="primary-button"
                    disabled={
                        isLoadingCategories
                        || categories.length === 0
                    }
                    onClick={openCreateModal}
                >
                    + Add Product
                </button>
            </section>

            {categories.length === 0
                && !isLoadingCategories && (
                    <div className="category-required-banner">
                        <div>
                            <strong>
                                A category is required
                            </strong>

                            <span>
                                Create at least one
                                category before creating
                                products.
                            </span>
                        </div>

                        <Link
                            to="/admin/categories"
                            className="secondary-button"
                        >
                            Manage Categories
                        </Link>
                    </div>
                )}

            {categoryError && (
                <div
                    className="form-alert product-page-error"
                    role="alert"
                >
                    <span>{categoryError}</span>

                    <button
                        type="button"
                        className="retry-button"
                        onClick={() => {
                            void loadCategoryOptions();
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {successMessage && (
                <div
                    className="success-alert"
                    role="status"
                >
                    <span>✓</span>

                    <p>{successMessage}</p>

                    <button
                        type="button"
                        aria-label="Close message"
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
                    className="form-alert product-page-error"
                    role="alert"
                >
                    <span>{pageError}</span>

                    <button
                        type="button"
                        className="retry-button"
                        onClick={() => {
                            void loadProducts();
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <section className="content-card">
                <div className="product-toolbar">
                    <div className="product-search">
                        <span aria-hidden="true">
                            ⌕
                        </span>

                        <input
                            type="search"
                            value={searchInput}
                            placeholder="Search name, SKU or barcode..."
                            aria-label="Search products"
                            onChange={(event) => {
                                setSearchInput(
                                    event.target.value,
                                );
                            }}
                        />

                        {searchInput && (
                            <button
                                type="button"
                                aria-label="Clear search"
                                onClick={clearSearch}
                            >
                                ×
                            </button>
                        )}
                    </div>

                    <div className="product-filter-controls">
                        <label>
                            <span>Category</span>

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
                        </label>

                        <label>
                            <span>Rows</span>

                            <select
                                value={perPage}
                                onChange={(event) => {
                                    setPage(1);

                                    setPerPage(
                                        Number(
                                            event.target.value,
                                        ),
                                    );
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
                        </label>

                        {hasFilters && (
                            <button
                                type="button"
                                className="clear-filter-button"
                                onClick={clearFilters}
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                <div className="product-table-container">
                    <table className="product-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th>SKU / Barcode</th>
                                <th>Unit</th>
                                <th>Prices</th>
                                <th>Expiry Date</th>
                                <th>Created</th>

                                <th className="product-actions-column">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="table-state"
                                    >
                                        <div className="small-spinner" />

                                        <span>
                                            Loading products...
                                        </span>
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="table-state"
                                    >
                                        <div className="empty-state-icon">
                                            P
                                        </div>

                                        <strong>
                                            {hasFilters
                                                ? 'No products found'
                                                : 'No products added'}
                                        </strong>

                                        <span>
                                            {hasFilters
                                                ? 'Try another search or category.'
                                                : 'Add your first product.'}
                                        </span>

                                        {!hasFilters
                                            && categories.length
                                            > 0 && (
                                                <button
                                                    type="button"
                                                    className="primary-button"
                                                    onClick={
                                                        openCreateModal
                                                    }
                                                >
                                                    + Add Product
                                                </button>
                                            )}
                                    </td>
                                </tr>
                            ) : (
                                products.map(
                                    (product) => (
                                        <tr key={product.id}>
                                            <td>
                                                <div className="product-name-cell">
                                                    <div className="product-initial">
                                                        {product.name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>

                                                    <div>
                                                        <strong>
                                                            {product.name}
                                                        </strong>

                                                        <span>
                                                            {product.description
                                                                || 'No description'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="product-category-badge">
                                                    {
                                                        product
                                                            .category
                                                            .name
                                                    }
                                                </span>
                                            </td>

                                            <td>
                                                <div className="product-code-cell">
                                                    <span>
                                                        SKU:{' '}
                                                        <strong>
                                                            {product.sku
                                                                || '—'}
                                                        </strong>
                                                    </span>

                                                    <span>
                                                        Barcode:{' '}
                                                        <strong>
                                                            {product.barcode
                                                                || '—'}
                                                        </strong>
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="product-unit">
                                                    {product.unit}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="product-price-cell">
                                                    <span>
                                                        Cost:{' '}
                                                        <strong>
                                                            {formatCurrency(
                                                                product.cost_price,
                                                            )}
                                                        </strong>
                                                    </span>

                                                    <span>
                                                        Selling:{' '}
                                                        <strong>
                                                            {formatCurrency(
                                                                product.selling_price,
                                                            )}
                                                        </strong>
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        product.expiry_date
                                                            ? 'product-expiry-date'
                                                            : 'product-no-expiry'
                                                    }
                                                >
                                                    {formatExpiryDate(
                                                        product.expiry_date,
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="product-created-date">
                                                    {formatDate(
                                                        product.created_at,
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="table-actions">
                                                    <button
                                                        type="button"
                                                        className="edit-action-button"
                                                        onClick={() => {
                                                            openEditModal(
                                                                product,
                                                            );
                                                        }}
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="delete-action-button"
                                                        onClick={() => {
                                                            openDeleteModal(
                                                                product,
                                                            );
                                                        }}
                                                    >
                                                        Delete
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
                    && pagination.total > 0 && (
                        <footer className="category-pagination">
                            <p>
                                Showing{' '}
                                <strong>
                                    {pagination.from}
                                </strong>
                                {' '}to{' '}
                                <strong>
                                    {pagination.to}
                                </strong>
                                {' '}of{' '}
                                <strong>
                                    {pagination.total}
                                </strong>
                                {' '}products
                            </p>

                            <div>
                                <button
                                    type="button"
                                    className="pagination-button"
                                    disabled={
                                        pagination.current_page
                                        <= 1
                                    }
                                    onClick={() => {
                                        setPage(
                                            (currentPage) =>
                                                Math.max(
                                                    1,
                                                    currentPage - 1,
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
                                        pagination.current_page
                                        >= pagination.last_page
                                    }
                                    onClick={() => {
                                        setPage(
                                            (currentPage) =>
                                                Math.min(
                                                    pagination.last_page,
                                                    currentPage + 1,
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

            <ProductFormModal
                isOpen={isFormOpen}
                isEditing={
                    editingProduct !== null
                }
                values={formValues}
                categories={categories}
                isLoadingCategories={
                    isLoadingCategories
                }
                isSubmitting={isSubmitting}
                errorMessage={formError}
                fieldErrors={fieldErrors}
                onChange={handleFormChange}
                onClose={closeFormModal}
                onSubmit={(event) => {
                    void handleSubmit(event);
                }}
            />

            <DeleteProductModal
                product={deleteTarget}
                isDeleting={isDeleting}
                errorMessage={deleteError}
                onCancel={closeDeleteModal}
                onConfirm={() => {
                    void handleDelete();
                }}
            />
        </div>
    );
}