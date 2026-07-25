import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import DeleteSupplierModal
    from '../../components/suppliers/DeleteSupplierModal';

import SupplierFormModal
    from '../../components/suppliers/SupplierFormModal';

import {
    ApiError,
} from '../../lib/api';

import {
    createSupplier,
    deleteSupplier,
    getSuppliers,
    updateSupplier,
} from '../../services/supplierService';

import type {
    ValidationErrors,
} from '../../types/auth';

import type {
    Supplier,
    SupplierFormValues,
    SupplierPaginationMeta,
} from '../../types/supplier';

const emptyFormValues:
    SupplierFormValues = {
    name: '',
    contact_person: '',
    phone: '',
    secondary_phone: '',
    email: '',
    address: '',
    notes: '',
};

const initialPagination:
    SupplierPaginationMeta = {
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

function isValidPhone(
    phone: string,
): boolean {
    return /^[0-9+\-\s()]{7,30}$/
        .test(phone);
}

export default function SuppliersPage() {
    const {
        token,
    } = useAuth();

    const [
        suppliers,
        setSuppliers,
    ] = useState<Supplier[]>([]);

    const [
        pagination,
        setPagination,
    ] = useState<SupplierPaginationMeta>(
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
        editingSupplier,
        setEditingSupplier,
    ] = useState<Supplier | null>(
        null,
    );

    const [
        formValues,
        setFormValues,
    ] = useState<SupplierFormValues>({
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
    ] = useState<Supplier | null>(
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

    const loadSuppliers =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getSuppliers(
                            token,
                            {
                                page,
                                perPage,
                                search:
                                    appliedSearch,
                            },
                        );

                    setSuppliers(response.data);
                    setPagination(response.meta);
                } catch (error) {
                    if (error instanceof ApiError) {
                        setPageError(
                            error.message,
                        );
                    } else {
                        setPageError(
                            'Unable to load suppliers.',
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
            ],
        );

    useEffect(() => {
        void loadSuppliers();
    }, [loadSuppliers]);

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
        setEditingSupplier(null);

        setFormValues({
            ...emptyFormValues,
        });

        setFormError('');
        setFieldErrors({});
    };

    const openCreateModal = (): void => {
        resetForm();
        setIsFormOpen(true);
    };

    const openEditModal = (
        supplier: Supplier,
    ): void => {
        setEditingSupplier(supplier);

        setFormValues({
            name:
                supplier.name,

            contact_person:
                supplier.contact_person
                ?? '',

            phone:
                supplier.phone,

            secondary_phone:
                supplier.secondary_phone
                ?? '',

            email:
                supplier.email ?? '',

            address:
                supplier.address ?? '',

            notes:
                supplier.notes ?? '',
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
        field: keyof SupplierFormValues,
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

        const supplierName =
            formValues.name.trim();

        const primaryPhone =
            formValues.phone.trim();

        const secondaryPhone =
            formValues.secondary_phone
                .trim();

        if (!supplierName) {
            errors.name = [
                'Please enter the supplier name.',
            ];
        } else if (
            supplierName.length > 160
        ) {
            errors.name = [
                'The supplier name cannot exceed 160 characters.',
            ];
        }

        if (
            formValues.contact_person
                .trim()
                .length > 120
        ) {
            errors.contact_person = [
                'The contact person name cannot exceed 120 characters.',
            ];
        }

        if (!primaryPhone) {
            errors.phone = [
                'Please enter the primary phone number.',
            ];
        } else if (
            !isValidPhone(primaryPhone)
        ) {
            errors.phone = [
                'Please enter a valid primary phone number.',
            ];
        }

        if (
            secondaryPhone
            && !isValidPhone(
                secondaryPhone,
            )
        ) {
            errors.secondary_phone = [
                'Please enter a valid secondary phone number.',
            ];
        }

        if (
            formValues.email.trim()
            && ! /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(
                    formValues.email.trim(),
                )
        ) {
            errors.email = [
                'Please enter a valid email address.',
            ];
        }

        if (
            formValues.address.trim()
                .length > 1500
        ) {
            errors.address = [
                'The address cannot exceed 1500 characters.',
            ];
        }

        if (
            formValues.notes.trim()
                .length > 2000
        ) {
            errors.notes = [
                'The notes cannot exceed 2000 characters.',
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
                if (editingSupplier) {
                    const response =
                        await updateSupplier(
                            token,
                            editingSupplier.id,
                            formValues,
                        );

                    setSuccessMessage(
                        response.message
                        ?? 'Supplier updated successfully.',
                    );

                    setIsFormOpen(false);
                    resetForm();

                    await loadSuppliers();
                } else {
                    const response =
                        await createSupplier(
                            token,
                            formValues,
                        );

                    setSuccessMessage(
                        response.message
                        ?? 'Supplier created successfully.',
                    );

                    setIsFormOpen(false);
                    resetForm();

                    if (page === 1) {
                        await loadSuppliers();
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
                        'Unable to save the supplier.',
                    );
                }
            } finally {
                setIsSubmitting(false);
            }
        };

    const openDeleteModal = (
        supplier: Supplier,
    ): void => {
        setDeleteTarget(supplier);
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
                    await deleteSupplier(
                        token,
                        deleteTarget.id,
                    );

                setSuccessMessage(
                    response.message,
                );

                setDeleteTarget(null);

                if (
                    suppliers.length === 1
                    && page > 1
                ) {
                    setPage(
                        (currentPage) =>
                            currentPage - 1,
                    );
                } else {
                    await loadSuppliers();
                }
            } catch (error) {
                if (error instanceof ApiError) {
                    setDeleteError(
                        error.message,
                    );
                } else {
                    setDeleteError(
                        'Unable to delete the supplier.',
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
            <section className="supplier-page-header">
                <div>
                    <span className="page-kicker">
                        Supplier directory
                    </span>

                    <h2>Suppliers</h2>

                    <p>
                        Create and manage suppliers
                        used for product purchasing
                        and stock replenishment.
                    </p>
                </div>

                <button
                    type="button"
                    className="primary-button"
                    onClick={openCreateModal}
                >
                    + Add Supplier
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
                    className="form-alert supplier-page-error"
                    role="alert"
                >
                    <span>{pageError}</span>

                    <button
                        type="button"
                        className="retry-button"
                        onClick={() => {
                            void loadSuppliers();
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <section className="content-card">
                <div className="supplier-toolbar">
                    <div className="supplier-search">
                        <span aria-hidden="true">
                            ⌕
                        </span>

                        <input
                            type="search"
                            value={searchInput}
                            placeholder="Search suppliers..."
                            aria-label="Search suppliers"
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

                    <label className="supplier-per-page-control">
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

                <div className="supplier-table-container">
                    <table className="supplier-table">
                        <thead>
                            <tr>
                                <th>Supplier</th>
                                <th>Contact Person</th>
                                <th>Phone Numbers</th>
                                <th>Email</th>
                                <th>Address</th>
                                <th>Created</th>

                                <th className="supplier-actions-column">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="table-state"
                                    >
                                        <div className="small-spinner" />

                                        <span>
                                            Loading suppliers...
                                        </span>
                                    </td>
                                </tr>
                            ) : suppliers.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="table-state"
                                    >
                                        <div className="empty-state-icon">
                                            S
                                        </div>

                                        <strong>
                                            {appliedSearch
                                                ? 'No suppliers found'
                                                : 'No suppliers added'}
                                        </strong>

                                        <span>
                                            {appliedSearch
                                                ? 'Try another search term.'
                                                : 'Add your first supplier.'}
                                        </span>

                                        {!appliedSearch && (
                                            <button
                                                type="button"
                                                className="primary-button"
                                                onClick={openCreateModal}
                                            >
                                                + Add Supplier
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                suppliers.map(
                                    (supplier) => (
                                        <tr key={supplier.id}>
                                            <td>
                                                <div className="supplier-name-cell">
                                                    <div className="supplier-initial">
                                                        {supplier.name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>

                                                    <div>
                                                        <strong>
                                                            {supplier.name}
                                                        </strong>

                                                        <span>
                                                            {supplier.notes
                                                                || 'No additional notes'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="supplier-contact-person">
                                                    {supplier.contact_person
                                                        || '—'}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="supplier-phone-cell">
                                                    <span>
                                                        Primary:{' '}
                                                        <strong>
                                                            {supplier.phone}
                                                        </strong>
                                                    </span>

                                                    <span>
                                                        Secondary:{' '}
                                                        <strong>
                                                            {supplier.secondary_phone
                                                                || '—'}
                                                        </strong>
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                {supplier.email ? (
                                                    <a
                                                        className="supplier-email"
                                                        href={
                                                            `mailto:${supplier.email}`
                                                        }
                                                    >
                                                        {supplier.email}
                                                    </a>
                                                ) : (
                                                    <span className="supplier-empty-value">
                                                        —
                                                    </span>
                                                )}
                                            </td>

                                            <td>
                                                <p className="supplier-address">
                                                    {supplier.address
                                                        || 'No address'}
                                                </p>
                                            </td>

                                            <td>
                                                <span className="supplier-created-date">
                                                    {formatDate(
                                                        supplier.created_at,
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
                                                                supplier,
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
                                                                supplier,
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
                                {' '}suppliers
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

            <SupplierFormModal
                isOpen={isFormOpen}
                isEditing={
                    editingSupplier !== null
                }
                values={formValues}
                isSubmitting={isSubmitting}
                errorMessage={formError}
                fieldErrors={fieldErrors}
                onChange={handleFormChange}
                onClose={closeFormModal}
                onSubmit={(event) => {
                    void handleSubmit(event);
                }}
            />

            <DeleteSupplierModal
                supplier={deleteTarget}
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