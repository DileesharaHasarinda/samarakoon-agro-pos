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

import DeletePurchaseModal
    from '../../components/purchases/DeletePurchaseModal';

import PurchaseFormModal
    from '../../components/purchases/PurchaseFormModal';

import ReceiveStockModal
    from '../../components/purchases/ReceiveStockModal';

import {
    ApiError,
} from '../../lib/api';

import {
    createPurchase,
    deletePurchase,
    getPurchase,
    getPurchaseProducts,
    getPurchases,
    receivePurchase,
    updatePurchase,
} from '../../services/purchaseService';

import {
    getSupplierOptions,
} from '../../services/supplierService';

import type {
    ValidationErrors,
} from '../../types/auth';

import type {
    Purchase,
    PurchaseFormValues,
    PurchaseItemFormValues,
    PurchasePaginationMeta,
    PurchaseProductOption,
    ReceivePurchaseItemValues,
} from '../../types/purchase';

import type {
    SupplierOption,
} from '../../types/supplier';

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
    PurchasePaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null,
};

function createRowId(): string {
    return `${Date.now()}-${Math.random()}`;
}

function createEmptyItem():
    PurchaseItemFormValues {
    return {
        row_id: createRowId(),
        product_id: '',
        quantity: '1',
        unit_cost: '',
        selling_price: '',
        discount: '0',
        batch_number: '',
        manufactured_date: '',
        expiry_date: '',
        notes: '',
    };
}

function today(): string {
    return new Date()
        .toISOString()
        .slice(0, 10);
}

function createEmptyForm():
    PurchaseFormValues {
    return {
        supplier_id: '',
        supplier_invoice_number: '',
        purchase_date: today(),
        discount: '0',
        additional_cost: '0',
        notes: '',
        receive_now: false,
        items: [
            createEmptyItem(),
        ],
    };
}

export default function PurchasesPage() {
    const {
        token,
    } = useAuth();

    const [
        purchases,
        setPurchases,
    ] = useState<Purchase[]>([]);

    const [
        suppliers,
        setSuppliers,
    ] = useState<SupplierOption[]>([]);

    const [
        products,
        setProducts,
    ] = useState<
        PurchaseProductOption[]
    >([]);

    const [
        pagination,
        setPagination,
    ] = useState(initialPagination);

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
        supplierFilter,
        setSupplierFilter,
    ] = useState('');

    const [
        statusFilter,
        setStatusFilter,
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
        editingPurchase,
        setEditingPurchase,
    ] = useState<Purchase | null>(
        null,
    );

    const [
        formValues,
        setFormValues,
    ] = useState<PurchaseFormValues>(
        createEmptyForm,
    );

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
        receivingPurchase,
        setReceivingPurchase,
    ] = useState<Purchase | null>(
        null,
    );

    const [
        receiveValues,
        setReceiveValues,
    ] = useState<
        ReceivePurchaseItemValues[]
    >([]);

    const [
        receiveError,
        setReceiveError,
    ] = useState('');

    const [
        deleteTarget,
        setDeleteTarget,
    ] = useState<Purchase | null>(
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

    const loadOptions =
        useCallback(async (): Promise<void> => {
            if (!token) {
                return;
            }

            try {
                const [
                    supplierResponse,
                    productResponse,
                ] = await Promise.all([
                    getSupplierOptions(token),
                    getPurchaseProducts(token),
                ]);

                setSuppliers(
                    supplierResponse.data,
                );

                setProducts(
                    productResponse.data,
                );
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to load purchase options.',
                );
            }
        }, [token]);

    const loadPurchases =
        useCallback(async (): Promise<void> => {
            if (!token) {
                return;
            }

            setIsLoading(true);
            setPageError('');

            try {
                const response =
                    await getPurchases(
                        token,
                        {
                            page,
                            perPage,
                            search:
                                appliedSearch,

                            supplierId:
                                supplierFilter,

                            status:
                                statusFilter,
                        },
                    );

                setPurchases(response.data);
                setPagination(response.meta);
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to load purchases.',
                );
            } finally {
                setIsLoading(false);
            }
        }, [
            token,
            page,
            perPage,
            appliedSearch,
            supplierFilter,
            statusFilter,
        ]);

    useEffect(() => {
        void loadOptions();
    }, [loadOptions]);

    useEffect(() => {
        void loadPurchases();
    }, [loadPurchases]);

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

    const openCreateForm = (): void => {
        setEditingPurchase(null);
        setFormValues(createEmptyForm());
        setFormError('');
        setFieldErrors({});
        setIsFormOpen(true);
    };

    const openEditForm =
        async (
            purchase: Purchase,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            try {
                const response =
                    await getPurchase(
                        token,
                        purchase.id,
                    );

                const details = response.data;

                setEditingPurchase(details);

                setFormValues({
                    supplier_id:
                        String(
                            details.supplier.id,
                        ),

                    supplier_invoice_number:
                        details
                            .supplier_invoice_number
                        ?? '',

                    purchase_date:
                        details.purchase_date,

                    discount:
                        String(details.discount),

                    additional_cost:
                        String(
                            details.additional_cost,
                        ),

                    notes:
                        details.notes ?? '',

                    receive_now: false,

                    items:
                        details.items?.map(
                            (item) => ({
                                row_id: createRowId(),

                                product_id:
                                    String(item.product_id),

                                quantity:
                                    String(item.quantity),

                                unit_cost:
                                    String(item.unit_cost),

                                selling_price:
                                    String(
                                        item.selling_price,
                                    ),

                                discount:
                                    String(item.discount),

                                batch_number:
                                    item.batch_number
                                    ?? '',

                                manufactured_date:
                                    item
                                        .manufactured_date
                                    ?? '',

                                expiry_date:
                                    item.expiry_date
                                    ?? '',

                                notes:
                                    item.notes ?? '',
                            }),
                        ) ?? [
                            createEmptyItem(),
                        ],
                });

                setIsFormOpen(true);
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to load purchase.',
                );
            }
        };

    const handleHeaderChange = (
        field: keyof Omit<
            PurchaseFormValues,
            'items'
        >,
        value: string | boolean,
    ): void => {
        setFormValues(
            (current) => ({
                ...current,
                [field]: value,
            }),
        );

        setFieldErrors({});
        setFormError('');
    };

    const handleItemChange = (
        index: number,
        field:
            keyof PurchaseItemFormValues,
        value: string,
    ): void => {
        setFormValues(
            (current) => ({
                ...current,

                items: current.items.map(
                    (item, itemIndex) =>
                        itemIndex === index
                            ? {
                                ...item,
                                [field]: value,
                            }
                            : item,
                ),
            }),
        );

        setFieldErrors({});
        setFormError('');
    };

    const validatePurchase =
        (): boolean => {
            const errors:
                ValidationErrors = {};

            if (!formValues.supplier_id) {
                errors.supplier_id = [
                    'Please select a supplier.',
                ];
            }

            if (!formValues.purchase_date) {
                errors.purchase_date = [
                    'Please select a purchase date.',
                ];
            }

            formValues.items.forEach(
                (item, index) => {
                    if (!item.product_id) {
                        errors[
                            `items.${index}.product_id`
                        ] = [
                                `Select a product for item ${index + 1
                                }.`,
                            ];
                    }

                    if (
                        Number(item.quantity) <= 0
                    ) {
                        errors[
                            `items.${index}.quantity`
                        ] = [
                                'Quantity must be greater than zero.',
                            ];
                    }

                    if (
                        item.unit_cost === ''
                        || Number(item.unit_cost) < 0
                    ) {
                        errors[
                            `items.${index}.unit_cost`
                        ] = [
                                'Enter a valid purchase cost.',
                            ];
                    }

                    if (
                        item.selling_price === ''
                        || Number(
                            item.selling_price,
                        ) < 0
                    ) {
                        errors[
                            `items.${index}.selling_price`
                        ] = [
                                'Enter a valid selling price.',
                            ];
                    }

                    if (
                        item.manufactured_date
                        && item.expiry_date
                        && item.manufactured_date
                        > item.expiry_date
                    ) {
                        errors[
                            `items.${index}.expiry_date`
                        ] = [
                                'Expiry must be after manufacture.',
                            ];
                    }
                },
            );

            setFieldErrors(errors);

            if (
                Object.keys(errors).length > 0
            ) {
                setFormError(
                    'Please correct the highlighted purchase details.',
                );

                return false;
            }

            return true;
        };

    const submitPurchase =
        async (
            event: FormEvent<HTMLFormElement>,
        ): Promise<void> => {
            event.preventDefault();

            if (
                !token
                || isSubmitting
                || !validatePurchase()
            ) {
                return;
            }

            setIsSubmitting(true);
            setFormError('');

            try {
                const response =
                    editingPurchase
                        ? await updatePurchase(
                            token,
                            editingPurchase.id,
                            formValues,
                        )
                        : await createPurchase(
                            token,
                            formValues,
                        );

                setSuccessMessage(
                    response.message
                    ?? 'Purchase saved successfully.',
                );

                setIsFormOpen(false);
                setEditingPurchase(null);

                await loadPurchases();
            } catch (error) {
                if (error instanceof ApiError) {
                    setFormError(error.message);

                    setFieldErrors(
                        error.errors ?? {},
                    );
                } else {
                    setFormError(
                        'Unable to save purchase.',
                    );
                }
            } finally {
                setIsSubmitting(false);
            }
        };

    const openReceiveModal =
        async (
            purchase: Purchase,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            try {
                const response =
                    await getPurchase(
                        token,
                        purchase.id,
                    );

                const details = response.data;

                setReceivingPurchase(details);

                setReceiveValues(
                    details.items?.map(
                        (item) => ({
                            purchase_item_id:
                                item.id,

                            received_quantity:
                                String(
                                    item.quantity
                                    - item.received_quantity,
                                ),

                            selling_price:
                                String(
                                    item.selling_price,
                                ),

                            batch_number:
                                item.batch_number
                                ?? '',

                            manufactured_date:
                                item
                                    .manufactured_date
                                ?? '',

                            expiry_date:
                                item.expiry_date
                                ?? '',
                        }),
                    ) ?? [],
                );

                setReceiveError('');
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to load stock intake.',
                );
            }
        };

    const submitStockIntake =
        async (
            event: FormEvent<HTMLFormElement>,
        ): Promise<void> => {
            event.preventDefault();

            if (
                !token
                || !receivingPurchase
                || isSubmitting
            ) {
                return;
            }

            setIsSubmitting(true);
            setReceiveError('');

            try {
                const response =
                    await receivePurchase(
                        token,
                        receivingPurchase.id,
                        receiveValues,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Stock received successfully.',
                );

                setReceivingPurchase(null);

                await loadPurchases();
            } catch (error) {
                setReceiveError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to receive stock.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const confirmDelete =
        async (): Promise<void> => {
            if (
                !token
                || !deleteTarget
                || isDeleting
            ) {
                return;
            }

            setIsDeleting(true);

            try {
                const response =
                    await deletePurchase(
                        token,
                        deleteTarget.id,
                    );

                setSuccessMessage(
                    response.message,
                );

                setDeleteTarget(null);

                await loadPurchases();
            } catch (error) {
                setDeleteError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to delete purchase.',
                );
            } finally {
                setIsDeleting(false);
            }
        };

    return (
        <div className="page-stack">
            <section className="purchase-page-header">
                <div>
                    <span className="page-kicker">
                        Purchasing and stock intake
                    </span>

                    <h2>Purchases</h2>

                    <p>
                        Record supplier purchases and
                        receive each item as a separate
                        stock-price batch.
                    </p>
                </div>

                <button
                    type="button"
                    className="primary-button"
                    disabled={
                        suppliers.length === 0
                        || products.length === 0
                    }
                    onClick={openCreateForm}
                >
                    + Add Purchase
                </button>
            </section>

            {successMessage && (
                <div className="success-alert">
                    <span>✓</span>
                    <p>{successMessage}</p>
                </div>
            )}

            {pageError && (
                <div className="form-alert">
                    {pageError}
                </div>
            )}

            <section className="content-card">
                <div className="purchase-toolbar">
                    <input
                        type="search"
                        value={searchInput}
                        placeholder="Search purchase or supplier..."
                        onChange={(event) => {
                            setSearchInput(
                                event.target.value,
                            );
                        }}
                    />

                    <select
                        value={supplierFilter}
                        onChange={(event) => {
                            setPage(1);

                            setSupplierFilter(
                                event.target.value,
                            );
                        }}
                    >
                        <option value="">
                            All Suppliers
                        </option>

                        {suppliers.map(
                            (supplier) => (
                                <option
                                    key={supplier.id}
                                    value={supplier.id}
                                >
                                    {supplier.name}
                                </option>
                            ),
                        )}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(event) => {
                            setPage(1);

                            setStatusFilter(
                                event.target.value,
                            );
                        }}
                    >
                        <option value="">
                            All Statuses
                        </option>

                        <option value="draft">
                            Draft
                        </option>

                        <option value="received">
                            Received
                        </option>
                    </select>

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
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>

                <div className="purchase-table-container">
                    <table className="purchase-table">
                        <thead>
                            <tr>
                                <th>Purchase</th>
                                <th>Supplier</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
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
                                        Loading purchases...
                                    </td>
                                </tr>
                            ) : purchases.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="table-state"
                                    >
                                        No purchases found.
                                    </td>
                                </tr>
                            ) : (
                                purchases.map(
                                    (purchase) => (
                                        <tr key={purchase.id}>
                                            <td>
                                                <strong>
                                                    {
                                                        purchase
                                                            .purchase_number
                                                    }
                                                </strong>

                                                <small>
                                                    Invoice:{' '}
                                                    {purchase
                                                        .supplier_invoice_number
                                                        ?? '—'}
                                                </small>
                                            </td>

                                            <td>
                                                {
                                                    purchase
                                                        .supplier
                                                        .name
                                                }
                                            </td>

                                            <td>
                                                {
                                                    purchase
                                                        .purchase_date
                                                }
                                            </td>

                                            <td>
                                                {purchase.items_count}
                                                {' items / '}
                                                {
                                                    purchase
                                                        .total_quantity
                                                }
                                            </td>

                                            <td>
                                                {currencyFormatter
                                                    .format(
                                                        purchase
                                                            .grand_total,
                                                    )}
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        purchase.status
                                                            === 'received'
                                                            ? 'purchase-status received'
                                                            : 'purchase-status draft'
                                                    }
                                                >
                                                    {purchase.status}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="table-actions">
                                                    {purchase.status
                                                        === 'draft' && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="edit-action-button"
                                                                    onClick={() => {
                                                                        void openEditForm(
                                                                            purchase,
                                                                        );
                                                                    }}
                                                                >
                                                                    Edit
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="receive-action-button"
                                                                    onClick={() => {
                                                                        void openReceiveModal(
                                                                            purchase,
                                                                        );
                                                                    }}
                                                                >
                                                                    Receive
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="delete-action-button"
                                                                    onClick={() => {
                                                                        setDeleteTarget(
                                                                            purchase,
                                                                        );

                                                                        setDeleteError(
                                                                            '',
                                                                        );
                                                                    }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </>
                                                        )}

                                                    {purchase.status
                                                        === 'received' && (
                                                            <span className="received-label">
                                                                Stock Added
                                                            </span>
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

            <PurchaseFormModal
                isOpen={isFormOpen}
                isEditing={
                    editingPurchase !== null
                }
                values={formValues}
                suppliers={suppliers}
                products={products}
                isSubmitting={isSubmitting}
                errorMessage={formError}
                fieldErrors={fieldErrors}
                onHeaderChange={
                    handleHeaderChange
                }
                onItemChange={
                    handleItemChange
                }
                onAddItem={() => {
                    setFormValues(
                        (current) => ({
                            ...current,
                            items: [
                                ...current.items,
                                createEmptyItem(),
                            ],
                        }),
                    );
                }}
                onRemoveItem={(index) => {
                    setFormValues(
                        (current) => ({
                            ...current,
                            items:
                                current.items.filter(
                                    (_, itemIndex) =>
                                        itemIndex !== index,
                                ),
                        }),
                    );
                }}
                onClose={() => {
                    if (!isSubmitting) {
                        setIsFormOpen(false);
                    }
                }}
                onSubmit={(event) => {
                    void submitPurchase(event);
                }}
            />

            <ReceiveStockModal
                purchase={receivingPurchase}
                values={receiveValues}
                isSubmitting={isSubmitting}
                errorMessage={receiveError}
                onChange={(
                    index,
                    field,
                    value,
                ) => {
                    setReceiveValues(
                        (current) =>
                            current.map(
                                (item, itemIndex) =>
                                    itemIndex === index
                                        ? {
                                            ...item,
                                            [field]: value,
                                        }
                                        : item,
                            ),
                    );
                }}
                onClose={() => {
                    if (!isSubmitting) {
                        setReceivingPurchase(null);
                    }
                }}
                onSubmit={(event) => {
                    void submitStockIntake(
                        event,
                    );
                }}
            />

            <DeletePurchaseModal
                purchase={deleteTarget}
                isDeleting={isDeleting}
                errorMessage={deleteError}
                onCancel={() => {
                    if (!isDeleting) {
                        setDeleteTarget(null);
                    }
                }}
                onConfirm={() => {
                    void confirmDelete();
                }}
            />
        </div>
    );
}