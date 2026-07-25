import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import CategoryFormModal
    from '../../components/categories/CategoryFormModal';

import DeleteCategoryModal
    from '../../components/categories/DeleteCategoryModal';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    createCategory,
    deleteCategory,
    getCategories,
    updateCategory,
} from '../../services/categoryService';

import type {
    ValidationErrors,
} from '../../types/auth';

import type {
    Category,
    CategoryPaginationMeta,
} from '../../types/category';

const initialPagination:
    CategoryPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null,
};

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

export default function CategoriesPage() {
    const {
        token,
    } = useAuth();

    const [
        categories,
        setCategories,
    ] = useState<Category[]>([]);

    const [
        pagination,
        setPagination,
    ] = useState<CategoryPaginationMeta>(
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
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        pageError,
        setPageError,
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
        editingCategory,
        setEditingCategory,
    ] = useState<Category | null>(
        null,
    );

    const [
        categoryName,
        setCategoryName,
    ] = useState('');

    const [
        categoryDescription,
        setCategoryDescription,
    ] = useState('');

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
    ] = useState<Category | null>(
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

    const loadCategories =
        useCallback(async (): Promise<void> => {
            if (!token) {
                return;
            }

            setIsLoading(true);
            setPageError('');

            try {
                const response =
                    await getCategories(
                        token,
                        {
                            page,
                            perPage,
                            search:
                                appliedSearch,
                        },
                    );

                setCategories(response.data);
                setPagination(response.meta);
            } catch (error) {
                if (error instanceof ApiError) {
                    setPageError(error.message);
                } else {
                    setPageError(
                        'Unable to load categories.',
                    );
                }
            } finally {
                setIsLoading(false);
            }
        }, [
            token,
            page,
            perPage,
            appliedSearch,
        ]);

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

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
        setEditingCategory(null);
        setCategoryName('');
        setCategoryDescription('');
        setFormError('');
        setFieldErrors({});
    };

    const openCreateModal = (): void => {
        resetForm();
        setIsFormOpen(true);
    };

    const openEditModal = (
        category: Category,
    ): void => {
        setEditingCategory(category);
        setCategoryName(category.name);

        setCategoryDescription(
            category.description ?? '',
        );

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

    const validateForm = (): boolean => {
        const errors: ValidationErrors =
            {};

        const trimmedName =
            categoryName.trim();

        const trimmedDescription =
            categoryDescription.trim();

        if (!trimmedName) {
            errors.name = [
                'Please enter the category name.',
            ];
        } else if (
            trimmedName.length > 120
        ) {
            errors.name = [
                'The category name cannot exceed 120 characters.',
            ];
        }

        if (
            trimmedDescription.length > 1000
        ) {
            errors.description = [
                'The description cannot exceed 1000 characters.',
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
                const values = {
                    name: categoryName.trim(),

                    description:
                        categoryDescription.trim(),
                };

                if (editingCategory) {
                    const response =
                        await updateCategory(
                            token,
                            editingCategory.id,
                            values,
                        );

                    setSuccessMessage(
                        response.message
                        ?? 'Category updated successfully.',
                    );

                    setIsFormOpen(false);
                    resetForm();

                    await loadCategories();
                } else {
                    const response =
                        await createCategory(
                            token,
                            values,
                        );

                    setSuccessMessage(
                        response.message
                        ?? 'Category created successfully.',
                    );

                    setIsFormOpen(false);
                    resetForm();

                    if (page === 1) {
                        await loadCategories();
                    } else {
                        setPage(1);
                    }
                }
            } catch (error) {
                if (error instanceof ApiError) {
                    setFormError(error.message);

                    setFieldErrors(
                        error.errors ?? {},
                    );
                } else {
                    setFormError(
                        'Unable to save the category.',
                    );
                }
            } finally {
                setIsSubmitting(false);
            }
        };

    const openDeleteModal = (
        category: Category,
    ): void => {
        setDeleteTarget(category);
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
                    await deleteCategory(
                        token,
                        deleteTarget.id,
                    );

                setSuccessMessage(
                    response.message,
                );

                setDeleteTarget(null);

                if (
                    categories.length === 1
                    && page > 1
                ) {
                    setPage(
                        (currentPage) =>
                            currentPage - 1,
                    );
                } else {
                    await loadCategories();
                }
            } catch (error) {
                if (error instanceof ApiError) {
                    setDeleteError(
                        error.message,
                    );
                } else {
                    setDeleteError(
                        'Unable to delete the category.',
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

    return (
        <div className="page-stack">
            <section className="category-page-header">
                <div>
                    <span className="page-kicker">
                        Product organisation
                    </span>

                    <h2>Categories</h2>

                    <p>
                        Create and manage the
                        categories used to organise
                        agro products.
                    </p>
                </div>

                <button
                    type="button"
                    className="primary-button"
                    onClick={openCreateModal}
                >
                    + Add Category
                </button>
            </section>

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
                    className="form-alert category-page-error"
                    role="alert"
                >
                    <span>{pageError}</span>

                    <button
                        type="button"
                        className="retry-button"
                        onClick={() => {
                            void loadCategories();
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <section className="content-card">
                <div className="category-toolbar">
                    <div className="category-search">
                        <span aria-hidden="true">
                            ⌕
                        </span>

                        <input
                            type="search"
                            value={searchInput}
                            placeholder="Search categories..."
                            aria-label="Search categories"
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

                    <label className="per-page-control">
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
                </div>

                <div className="category-table-container">
                    <table className="category-table">
                        <thead>
                            <tr>
                                <th>Category Name</th>
                                <th>Description</th>
                                <th>Created</th>
                                <th className="actions-column">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="table-state"
                                    >
                                        <div className="small-spinner" />

                                        <span>
                                            Loading categories...
                                        </span>
                                    </td>
                                </tr>
                            ) : categories.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="table-state"
                                    >
                                        <div className="empty-state-icon">
                                            C
                                        </div>

                                        <strong>
                                            {appliedSearch
                                                ? 'No categories found'
                                                : 'No categories added'}
                                        </strong>

                                        <span>
                                            {appliedSearch
                                                ? 'Try another search term.'
                                                : 'Add your first product category.'}
                                        </span>

                                        {!appliedSearch && (
                                            <button
                                                type="button"
                                                className="primary-button"
                                                onClick={openCreateModal}
                                            >
                                                + Add Category
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                categories.map(
                                    (category) => (
                                        <tr key={category.id}>
                                            <td>
                                                <div className="category-name-cell">
                                                    <div className="category-initial">
                                                        {category.name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>

                                                    <strong>
                                                        {category.name}
                                                    </strong>
                                                </div>
                                            </td>

                                            <td>
                                                <p className="category-description">
                                                    {category.description
                                                        || 'No description'}
                                                </p>
                                            </td>

                                            <td>
                                                <span className="category-date">
                                                    {formatDate(
                                                        category.created_at,
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
                                                                category,
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
                                                                category,
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
                                {' '}categories
                            </p>

                            <div>
                                <button
                                    type="button"
                                    className="pagination-button"
                                    disabled={
                                        pagination.current_page <= 1
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
                                            pagination.current_page
                                        }
                                    </strong>
                                    {' '}of{' '}
                                    <strong>
                                        {pagination.last_page}
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

            <CategoryFormModal
                isOpen={isFormOpen}
                isEditing={
                    editingCategory !== null
                }
                name={categoryName}
                description={
                    categoryDescription
                }
                isSubmitting={isSubmitting}
                errorMessage={formError}
                fieldErrors={fieldErrors}
                onNameChange={(value) => {
                    setCategoryName(value);

                    setFieldErrors(
                        (current) => ({
                            ...current,
                            name: undefined,
                        }),
                    );
                }}
                onDescriptionChange={(value) => {
                    setCategoryDescription(
                        value,
                    );

                    setFieldErrors(
                        (current) => ({
                            ...current,
                            description: undefined,
                        }),
                    );
                }}
                onClose={closeFormModal}
                onSubmit={(event) => {
                    void handleSubmit(event);
                }}
            />

            <DeleteCategoryModal
                category={deleteTarget}
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