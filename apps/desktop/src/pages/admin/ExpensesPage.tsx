import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import ExpenseCategoryManagerModal
    from '../../components/expenses/ExpenseCategoryManagerModal';

import ExpenseFormModal
    from '../../components/expenses/ExpenseFormModal';

import {
    ApiError,
} from '../../lib/api';

import {
    createExpense,
    createExpenseCategory,
    deleteExpense,
    deleteExpenseCategory,
    getExpenseCategories,
    getExpenses,
    updateExpense,
    updateExpenseCategory,
} from '../../services/expenseService';

import type {
    Expense,
    ExpenseCategory,
    ExpenseCategoryInput,
    ExpenseInput,
    ExpenseSummary,
} from '../../types/expense';

import type {
    PosPaginationMeta,
} from '../../types/sale';

const currencyFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        },
    );

const initialSummary:
    ExpenseSummary = {
    total_expenses: 0,
    total_amount: 0,
    one_time_amount: 0,
    recurring_amount: 0,
};

const initialPagination:
    PosPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
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
    ).format(
        new Date(
            `${value}T00:00:00`,
        ),
    );
}

function paymentMethodName(
    value: string,
): string {
    switch (value) {
        case 'bank_transfer':
            return 'Bank Transfer';

        case 'card':
            return 'Card';

        default:
            return 'Cash';
    }
}

function expenseTypeName(
    value: string,
): string {
    return value === 'recurring'
        ? 'Recurring'
        : 'One-time';
}

export default function ExpensesPage() {
    const {
        token,
    } = useAuth();

    const [
        expenses,
        setExpenses,
    ] = useState<Expense[]>([]);

    const [
        categories,
        setCategories,
    ] = useState<ExpenseCategory[]>([]);

    const [
        summary,
        setSummary,
    ] = useState<ExpenseSummary>(
        initialSummary,
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
        perPage,
        setPerPage,
    ] = useState(20);

    const [
        searchInput,
        setSearchInput,
    ] = useState('');

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        categoryFilter,
        setCategoryFilter,
    ] = useState('');

    const [
        paymentFilter,
        setPaymentFilter,
    ] = useState('');

    const [
        typeFilter,
        setTypeFilter,
    ] = useState('');

    const [
        dateFrom,
        setDateFrom,
    ] = useState('');

    const [
        dateTo,
        setDateTo,
    ] = useState('');

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        formError,
        setFormError,
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
        expenseModalOpen,
        setExpenseModalOpen,
    ] = useState(false);

    const [
        categoryModalOpen,
        setCategoryModalOpen,
    ] = useState(false);

    const [
        selectedExpense,
        setSelectedExpense,
    ] = useState<Expense | null>(
        null,
    );

    const formCategories =
        useMemo(
            () =>
                categories.filter(
                    (category) =>
                        category.is_active
                        || category.id
                        === selectedExpense
                            ?.category
                            .id,
                ),
            [
                categories,
                selectedExpense,
            ],
        );

    const loadCategories =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                try {
                    const response =
                        await getExpenseCategories(
                            token,
                            {
                                page: 1,
                                perPage: 100,
                            },
                        );

                    setCategories(
                        response.data,
                    );
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load expense categories.',
                    );
                }
            },
            [token],
        );

    const loadExpenses =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getExpenses(
                            token,
                            {
                                search,

                                categoryId:
                                    categoryFilter,

                                paymentMethod:
                                    paymentFilter,

                                expenseType:
                                    typeFilter,

                                dateFrom,
                                dateTo,
                                page,
                                perPage,
                            },
                        );

                    setExpenses(
                        response.data,
                    );

                    setSummary(
                        response.summary,
                    );

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load expenses.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [
                token,
                search,
                categoryFilter,
                paymentFilter,
                typeFilter,
                dateFrom,
                dateTo,
                page,
                perPage,
            ],
        );

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        void loadExpenses();
    }, [loadExpenses]);

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

    const saveExpense =
        async (
            values: ExpenseInput,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setIsSubmitting(true);
            setFormError('');

            try {
                const response =
                    selectedExpense
                        ? await updateExpense(
                            token,
                            selectedExpense.id,
                            values,
                        )
                        : await createExpense(
                            token,
                            values,
                        );

                setSuccessMessage(
                    response.message
                    ?? 'Expense saved successfully.',
                );

                setExpenseModalOpen(false);
                setSelectedExpense(null);

                await Promise.all([
                    loadExpenses(),
                    loadCategories(),
                ]);
            } catch (error) {
                setFormError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to save expense.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const removeExpense =
        async (
            expense: Expense,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            const confirmed =
                window.confirm(
                    `Delete expense ${expense.expense_number}?`,
                );

            if (!confirmed) {
                return;
            }

            setPageError('');

            try {
                const response =
                    await deleteExpense(
                        token,
                        expense.id,
                    );

                setSuccessMessage(
                    response.message,
                );

                await Promise.all([
                    loadExpenses(),
                    loadCategories(),
                ]);
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to delete expense.',
                );
            }
        };

    const saveCategory =
        async (
            categoryId: number | null,
            values: ExpenseCategoryInput,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setIsSubmitting(true);
            setCategoryError('');

            try {
                const response =
                    categoryId !== null
                        ? await updateExpenseCategory(
                            token,
                            categoryId,
                            values,
                        )
                        : await createExpenseCategory(
                            token,
                            values,
                        );

                setSuccessMessage(
                    response.message
                    ?? 'Expense category saved successfully.',
                );

                setCategoryModalOpen(false);

                await Promise.all([
                    loadCategories(),
                    loadExpenses(),
                ]);
            } catch (error) {
                setCategoryError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to save expense category.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const removeCategory =
        async (
            category: ExpenseCategory,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            const confirmed =
                window.confirm(
                    `Delete expense category ${category.name}?`,
                );

            if (!confirmed) {
                return;
            }

            setIsSubmitting(true);
            setCategoryError('');

            try {
                const response =
                    await deleteExpenseCategory(
                        token,
                        category.id,
                    );

                setSuccessMessage(
                    response.message,
                );

                setCategoryModalOpen(false);

                await Promise.all([
                    loadCategories(),
                    loadExpenses(),
                ]);
            } catch (error) {
                setCategoryError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to delete expense category.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const clearFilters =
        (): void => {
            setSearchInput('');
            setSearch('');
            setCategoryFilter('');
            setPaymentFilter('');
            setTypeFilter('');
            setDateFrom('');
            setDateTo('');
            setPage(1);
        };

    const hasFilters =
        search !== ''
        || categoryFilter !== ''
        || paymentFilter !== ''
        || typeFilter !== ''
        || dateFrom !== ''
        || dateTo !== '';

    return (
        <div className="page-stack">
            <section className="expenses-page-header">
                <div>
                    <span className="page-kicker">
                        Business costs
                    </span>

                    <h2>
                        Expense Management
                    </h2>

                    <p>
                        Record and review business
                        expenses for accurate
                        financial reporting.
                    </p>
                </div>

                <div className="expense-header-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                            setCategoryError('');
                            setCategoryModalOpen(
                                true,
                            );
                        }}
                    >
                        Manage Categories
                    </button>

                    <button
                        type="button"
                        className="primary-button"
                        disabled={
                            categories.length
                            === 0
                        }
                        onClick={() => {
                            setSelectedExpense(
                                null,
                            );

                            setFormError('');
                            setExpenseModalOpen(
                                true,
                            );
                        }}
                    >
                        Add Expense
                    </button>
                </div>
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

            <section className="expense-summary-grid">
                <article>
                    <span>
                        Expense Records
                    </span>

                    <strong>
                        {summary.total_expenses}
                    </strong>

                    <small>
                        Current filtered records
                    </small>
                </article>

                <article>
                    <span>
                        Total Expenses
                    </span>

                    <strong>
                        {currencyFormatter
                            .format(
                                summary
                                    .total_amount,
                            )}
                    </strong>

                    <small>
                        Total filtered value
                    </small>
                </article>

                <article>
                    <span>
                        One-time Expenses
                    </span>

                    <strong>
                        {currencyFormatter
                            .format(
                                summary
                                    .one_time_amount,
                            )}
                    </strong>

                    <small>
                        Non-recurring costs
                    </small>
                </article>

                <article>
                    <span>
                        Recurring Expenses
                    </span>

                    <strong>
                        {currencyFormatter
                            .format(
                                summary
                                    .recurring_amount,
                            )}
                    </strong>

                    <small>
                        Repeated business costs
                    </small>
                </article>
            </section>

            <section className="content-card">
                <div className="expense-toolbar">
                    <input
                        type="search"
                        value={searchInput}
                        placeholder="Search number, category, description or reference..."
                        onChange={(event) => {
                            setSearchInput(
                                event.target.value,
                            );
                        }}
                    />

                    <select
                        value={categoryFilter}
                        onChange={(event) => {
                            setCategoryFilter(
                                event.target.value,
                            );

                            setPage(1);
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

                    <select
                        value={paymentFilter}
                        onChange={(event) => {
                            setPaymentFilter(
                                event.target.value,
                            );

                            setPage(1);
                        }}
                    >
                        <option value="">
                            All Payment Methods
                        </option>

                        <option value="cash">
                            Cash
                        </option>

                        <option value="card">
                            Card
                        </option>

                        <option value="bank_transfer">
                            Bank Transfer
                        </option>
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(event) => {
                            setTypeFilter(
                                event.target.value,
                            );

                            setPage(1);
                        }}
                    >
                        <option value="">
                            All Expense Types
                        </option>

                        <option value="one_time">
                            One-time
                        </option>

                        <option value="recurring">
                            Recurring
                        </option>
                    </select>

                    <label>
                        <span>From</span>

                        <input
                            type="date"
                            value={dateFrom}
                            max={
                                dateTo
                                || undefined
                            }
                            onChange={(event) => {
                                setDateFrom(
                                    event.target.value,
                                );

                                setPage(1);
                            }}
                        />
                    </label>

                    <label>
                        <span>To</span>

                        <input
                            type="date"
                            value={dateTo}
                            min={
                                dateFrom
                                || undefined
                            }
                            onChange={(event) => {
                                setDateTo(
                                    event.target.value,
                                );

                                setPage(1);
                            }}
                        />
                    </label>

                    <select
                        value={perPage}
                        onChange={(event) => {
                            setPerPage(
                                Number(
                                    event
                                        .target
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

                        <option value={100}>
                            100 rows
                        </option>
                    </select>

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

                <div className="expense-table-container">
                    <table className="expense-table">
                        <thead>
                            <tr>
                                <th>
                                    Expense Number
                                </th>

                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Type</th>
                                <th>Payment</th>
                                <th>Amount</th>
                                <th>Recorded By</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="table-state"
                                    >
                                        Loading expenses...
                                    </td>
                                </tr>
                            ) : expenses.length
                                === 0 ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="table-state"
                                    >
                                        <strong>
                                            No expenses found
                                        </strong>

                                        <span>
                                            Add an expense or
                                            change the filters.
                                        </span>
                                    </td>
                                </tr>
                            ) : (
                                expenses.map(
                                    (expense) => (
                                        <tr
                                            key={
                                                expense.id
                                            }
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        expense
                                                            .expense_number
                                                    }
                                                </strong>

                                                {expense
                                                    .reference_number && (
                                                        <small>
                                                            Ref:{' '}
                                                            {
                                                                expense
                                                                    .reference_number
                                                            }
                                                        </small>
                                                    )}
                                            </td>

                                            <td>
                                                {formatDate(
                                                    expense
                                                        .expense_date,
                                                )}
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        expense
                                                            .category
                                                            .name
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        expense
                                                            .description
                                                    }
                                                </strong>

                                                {expense.notes && (
                                                    <small>
                                                        {
                                                            expense
                                                                .notes
                                                        }
                                                    </small>
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        expense
                                                            .expense_type
                                                            === 'recurring'
                                                            ? 'recurring-expense-badge'
                                                            : 'one-time-expense-badge'
                                                    }
                                                >
                                                    {expenseTypeName(
                                                        expense
                                                            .expense_type,
                                                    )}
                                                </span>

                                                {expense
                                                    .recurring_frequency && (
                                                        <small>
                                                            {
                                                                expense
                                                                    .recurring_frequency
                                                            }
                                                        </small>
                                                    )}
                                            </td>

                                            <td>
                                                {paymentMethodName(
                                                    expense
                                                        .payment_method,
                                                )}
                                            </td>

                                            <td>
                                                <strong className="expense-amount">
                                                    {currencyFormatter
                                                        .format(
                                                            expense
                                                                .amount,
                                                        )}
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    expense
                                                        .created_by
                                                        .name
                                                }
                                            </td>

                                            <td>
                                                <div className="table-actions">
                                                    <button
                                                        type="button"
                                                        className="view-sale-button"
                                                        onClick={() => {
                                                            setSelectedExpense(
                                                                expense,
                                                            );

                                                            setFormError(
                                                                '',
                                                            );

                                                            setExpenseModalOpen(
                                                                true,
                                                            );
                                                        }}
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="delete-button"
                                                        onClick={() => {
                                                            void removeExpense(
                                                                expense,
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

                {pagination.total > 0 && (
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
                            {' '}expenses
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
                                        (current) =>
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
            </section>

            <ExpenseFormModal
                expense={selectedExpense}
                categories={formCategories}
                isOpen={expenseModalOpen}
                isSubmitting={isSubmitting}
                errorMessage={formError}
                onClose={() => {
                    if (!isSubmitting) {
                        setExpenseModalOpen(
                            false,
                        );

                        setSelectedExpense(
                            null,
                        );

                        setFormError('');
                    }
                }}
                onSubmit={(values) => {
                    void saveExpense(
                        values,
                    );
                }}
            />

            <ExpenseCategoryManagerModal
                isOpen={categoryModalOpen}
                categories={categories}
                isSubmitting={isSubmitting}
                errorMessage={categoryError}
                onClose={() => {
                    if (!isSubmitting) {
                        setCategoryModalOpen(
                            false,
                        );

                        setCategoryError('');
                    }
                }}
                onSave={(
                    categoryId,
                    values,
                ) => {
                    void saveCategory(
                        categoryId,
                        values,
                    );
                }}
                onDelete={(category) => {
                    void removeCategory(
                        category,
                    );
                }}
            />
        </div>
    );
}