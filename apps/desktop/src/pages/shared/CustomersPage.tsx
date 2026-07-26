import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import CustomerFormModal
    from '../../components/customers/CustomerFormModal';

import {
    ApiError,
} from '../../lib/api';

import {
    createCustomer,
    deleteCustomer,
    getCustomers,
    updateCustomer,
} from '../../services/customerService';

import type {
    Customer,
    CustomerInput,
} from '../../types/customer';

const currencyFormatter =
    new Intl.NumberFormat(
        'en-LK',
        {
            style: 'currency',
            currency: 'LKR',
        },
    );

export default function CustomersPage() {
    const {
        token,
        user,
    } = useAuth();

    const [
        customers,
        setCustomers,
    ] = useState<Customer[]>([]);

    const [
        searchInput,
        setSearchInput,
    ] = useState('');

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        status,
        setStatus,
    ] = useState('');

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        lastPage,
        setLastPage,
    ] = useState(1);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const [
        formOpen,
        setFormOpen,
    ] = useState(false);

    const [
        selectedCustomer,
        setSelectedCustomer,
    ] = useState<Customer | null>(
        null,
    );

    const isAdmin =
        user?.role === 'admin';

    const loadCustomers =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setErrorMessage('');

                try {
                    const response =
                        await getCustomers(
                            token,
                            {
                                search,
                                status,
                                page,
                                perPage: 20,
                            },
                        );

                    setCustomers(
                        response.data,
                    );

                    setLastPage(
                        response
                            .meta
                            .last_page,
                    );
                } catch (error) {
                    setErrorMessage(
                        error
                            instanceof ApiError
                            ? error.message
                            : 'Unable to load customers.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [
                token,
                search,
                status,
                page,
            ],
        );

    useEffect(() => {
        void loadCustomers();
    }, [loadCustomers]);

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

    const submitCustomer =
        async (
            values: CustomerInput,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setIsSubmitting(true);
            setErrorMessage('');

            try {
                const response =
                    selectedCustomer
                        ? await updateCustomer(
                            token,
                            selectedCustomer.id,
                            values,
                        )
                        : await createCustomer(
                            token,
                            values,
                        );

                setSuccessMessage(
                    response.message
                    ?? 'Customer saved successfully.',
                );

                setFormOpen(false);
                setSelectedCustomer(null);

                await loadCustomers();
            } catch (error) {
                setErrorMessage(
                    error
                        instanceof ApiError
                        ? error.message
                        : 'Unable to save customer.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const removeCustomer =
        async (
            customer: Customer,
        ): Promise<void> => {
            if (
                !token
                || !isAdmin
            ) {
                return;
            }

            const confirmed =
                window.confirm(
                    `Delete ${customer.name}?`,
                );

            if (!confirmed) {
                return;
            }

            try {
                const response =
                    await deleteCustomer(
                        token,
                        customer.id,
                    );

                setSuccessMessage(
                    response.message,
                );

                await loadCustomers();
            } catch (error) {
                setErrorMessage(
                    error
                        instanceof ApiError
                        ? error.message
                        : 'Unable to delete customer.',
                );
            }
        };

    return (
        <div className="page-stack">
            <section className="customers-page-header">
                <div>
                    <span className="page-kicker">
                        Customer accounts
                    </span>

                    <h2>Customers</h2>

                    <p>
                        Manage customer details,
                        credit limits and current
                        outstanding balances.
                    </p>
                </div>

                <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                        setSelectedCustomer(
                            null,
                        );

                        setFormOpen(true);
                    }}
                >
                    Add Customer
                </button>
            </section>

            {successMessage && (
                <div className="success-alert">
                    {successMessage}
                </div>
            )}

            {errorMessage
                && !formOpen && (
                    <div className="form-alert">
                        {errorMessage}
                    </div>
                )}

            <section className="content-card">
                <div className="customers-toolbar">
                    <input
                        type="search"
                        value={searchInput}
                        placeholder="Search customer name, mobile or code..."
                        onChange={(event) => {
                            setSearchInput(
                                event.target.value,
                            );
                        }}
                    />

                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(
                                event.target.value,
                            );

                            setPage(1);
                        }}
                    >
                        <option value="">
                            All Customers
                        </option>

                        <option value="active">
                            Active
                        </option>

                        <option value="inactive">
                            Inactive
                        </option>
                    </select>
                </div>

                <div className="customers-table-container">
                    <table className="customers-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Mobile</th>
                                <th>Type</th>
                                <th>Credit Limit</th>
                                <th>Outstanding Due</th>
                                <th>Sales</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="table-state"
                                    >
                                        Loading customers...
                                    </td>
                                </tr>
                            ) : customers.length
                                === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="table-state"
                                    >
                                        No customers found.
                                    </td>
                                </tr>
                            ) : (
                                customers.map(
                                    (customer) => (
                                        <tr
                                            key={
                                                customer.id
                                            }
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        customer
                                                            .name
                                                    }
                                                </strong>

                                                <small>
                                                    {
                                                        customer
                                                            .customer_code
                                                    }
                                                </small>
                                            </td>

                                            <td>
                                                {customer.mobile
                                                    || '—'}
                                            </td>

                                            <td>
                                                {
                                                    customer
                                                        .customer_type
                                                }
                                            </td>

                                            <td>
                                                {currencyFormatter
                                                    .format(
                                                        customer
                                                            .credit_limit,
                                                    )}
                                            </td>

                                            <td>
                                                <strong
                                                    className={
                                                        customer
                                                            .outstanding_due
                                                            > 0
                                                            ? 'due-value'
                                                            : ''
                                                    }
                                                >
                                                    {currencyFormatter
                                                        .format(
                                                            customer
                                                                .outstanding_due,
                                                        )}
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    customer
                                                        .sales_count
                                                }
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        customer
                                                            .is_active
                                                            ? 'active-badge'
                                                            : 'inactive-badge'
                                                    }
                                                >
                                                    {customer
                                                        .is_active
                                                        ? 'Active'
                                                        : 'Inactive'}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="table-actions">
                                                    <button
                                                        type="button"
                                                        className="view-sale-button"
                                                        onClick={() => {
                                                            setSelectedCustomer(
                                                                customer,
                                                            );

                                                            setFormOpen(
                                                                true,
                                                            );
                                                        }}
                                                    >
                                                        Edit
                                                    </button>

                                                    {isAdmin && (
                                                        <button
                                                            type="button"
                                                            className="delete-button"
                                                            onClick={() => {
                                                                void removeCustomer(
                                                                    customer,
                                                                );
                                                            }}
                                                        >
                                                            Delete
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

                <footer className="category-pagination">
                    <button
                        type="button"
                        className="pagination-button"
                        disabled={page <= 1}
                        onClick={() => {
                            setPage(
                                (current) =>
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
                        Page {page} of{' '}
                        {lastPage}
                    </span>

                    <button
                        type="button"
                        className="pagination-button"
                        disabled={
                            page >= lastPage
                        }
                        onClick={() => {
                            setPage(
                                (current) =>
                                    Math.min(
                                        lastPage,
                                        current + 1,
                                    ),
                            );
                        }}
                    >
                        Next
                    </button>
                </footer>
            </section>

            <CustomerFormModal
                customer={
                    selectedCustomer
                }
                isOpen={formOpen}
                isSubmitting={
                    isSubmitting
                }
                errorMessage={
                    formOpen
                        ? errorMessage
                        : ''
                }
                onClose={() => {
                    if (!isSubmitting) {
                        setFormOpen(false);
                        setSelectedCustomer(
                            null,
                        );

                        setErrorMessage('');
                    }
                }}
                onSubmit={(values) => {
                    void submitCustomer(
                        values,
                    );
                }}
            />
        </div>
    );
}