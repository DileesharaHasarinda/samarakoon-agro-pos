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

const initialSummary: ExpenseSummary = {
    total_expenses: 0,
    total_amount: 0,
    one_time_amount: 0,
    recurring_amount: 0,
};

const initialPagination: PosPaginationMeta = {
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

const expensesPageStyles = `
    #sapo-expenses-page,
    #sapo-expenses-page *,
    #sapo-expenses-page *::before,
    #sapo-expenses-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-expenses-page {
        --exp-green-800: #166534;
        --exp-green-700: #15803d;
        --exp-green-100: #dcfce7;
        --exp-green-50: #f0fdf4;
        --exp-red: #dc2626;
        --exp-red-light: #fef2f2;
        --exp-amber: #b45309;
        --exp-amber-light: #fffbeb;
        --exp-blue: #2563eb;
        --exp-blue-light: #eff6ff;
        --exp-text: #111827;
        --exp-text-secondary: #1f2937;
        --exp-muted: #6b7280;
        --exp-border: #e5e7eb;
        --exp-border-strong: #d1d5db;
        --exp-bg: #f9fafb;
        --exp-white: #ffffff;
        --exp-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        gap: 20px !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--exp-text-secondary) !important;
        font-family: var(--exp-font) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        background: transparent !important;
        isolation: isolate !important;
    }

    #sapo-expenses-page h2,
    #sapo-expenses-page p,
    #sapo-expenses-page span,
    #sapo-expenses-page strong,
    #sapo-expenses-page small,
    #sapo-expenses-page label,
    #sapo-expenses-page button,
    #sapo-expenses-page input,
    #sapo-expenses-page select,
    #sapo-expenses-page table,
    #sapo-expenses-page th,
    #sapo-expenses-page td {
        font-family: var(--exp-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-expenses-page h2,
    #sapo-expenses-page p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Header ---------- */
    #sapo-expenses-page .exp-header {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 16px !important;
        padding: 20px 24px !important;
        background: var(--exp-white) !important;
        border: 1px solid var(--exp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-expenses-page .exp-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--exp-green-700) !important;
        margin-bottom: 6px !important;
        background: transparent !important;
    }

    #sapo-expenses-page .exp-header h2 {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--exp-text) !important;
        margin-bottom: 4px !important;
    }

    #sapo-expenses-page .exp-header p {
        font-size: 13.5px !important;
        color: var(--exp-muted) !important;
    }

    #sapo-expenses-page .exp-header-actions {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 10px !important;
        flex-shrink: 0 !important;
    }

    /* ---------- Buttons ---------- */
    #sapo-expenses-page .exp-primary-button,
    #sapo-expenses-page .exp-secondary-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 38px !important;
        padding: 0 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease !important;
    }

    #sapo-expenses-page .exp-primary-button {
        color: #ffffff !important;
        background: var(--exp-green-700) !important;
        border: 1px solid var(--exp-green-700) !important;
    }

    #sapo-expenses-page .exp-primary-button:hover:not(:disabled) {
        background: var(--exp-green-800) !important;
    }

    #sapo-expenses-page .exp-secondary-button {
        color: #374151 !important;
        background: var(--exp-white) !important;
        border: 1px solid var(--exp-border-strong) !important;
    }

    #sapo-expenses-page .exp-secondary-button:hover:not(:disabled) {
        background: var(--exp-bg) !important;
        border-color: #9ca3af !important;
    }

    #sapo-expenses-page button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Alerts ---------- */
    #sapo-expenses-page .exp-success-alert {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 12px 16px !important;
        border-radius: 8px !important;
        background: var(--exp-green-50) !important;
        border: 1px solid var(--exp-green-100) !important;
    }

    #sapo-expenses-page .exp-success-alert span:first-child {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 20px !important;
        height: 20px !important;
        flex-shrink: 0 !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        background: var(--exp-green-700) !important;
        border-radius: 999px !important;
    }

    #sapo-expenses-page .exp-success-alert p {
        flex: 1 !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        color: #15803d !important;
    }

    #sapo-expenses-page .exp-success-alert button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 24px !important;
        height: 24px !important;
        flex-shrink: 0 !important;
        font-size: 16px !important;
        line-height: 1 !important;
        color: #15803d !important;
        background: transparent !important;
        border: none !important;
        border-radius: 6px !important;
        cursor: pointer !important;
    }

    #sapo-expenses-page .exp-success-alert button:hover {
        background: rgba(21, 128, 61, 0.1) !important;
    }

    #sapo-expenses-page .exp-form-alert {
        padding: 12px 16px !important;
        border-radius: 8px !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        background: var(--exp-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Summary cards ---------- */
    #sapo-expenses-page .exp-summary-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)) !important;
        gap: 16px !important;
    }

    #sapo-expenses-page .exp-summary-grid article {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        padding: 18px 20px !important;
        background: var(--exp-white) !important;
        border: 1px solid var(--exp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-expenses-page .exp-summary-grid span {
        font-size: 12px !important;
        font-weight: 500 !important;
        color: var(--exp-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-expenses-page .exp-summary-grid strong {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--exp-text) !important;
        background: transparent !important;
    }

    #sapo-expenses-page .exp-summary-grid small {
        font-size: 12px !important;
        color: #9ca3af !important;
        background: transparent !important;
    }

    /* ---------- Content card ---------- */
    #sapo-expenses-page .exp-content-card {
        background: var(--exp-white) !important;
        border: 1px solid var(--exp-border) !important;
        border-radius: 10px !important;
        padding: 20px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
    }

    /* ---------- Toolbar ---------- */
    #sapo-expenses-page .exp-toolbar {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-end !important;
        gap: 10px !important;
    }

    #sapo-expenses-page .exp-toolbar input[type="search"] {
        flex: 1 1 240px !important;
        height: 38px !important;
        padding: 0 14px !important;
        font-size: 13.5px !important;
        color: var(--exp-text-secondary) !important;
        border: 1px solid var(--exp-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        background: var(--exp-bg) !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-expenses-page .exp-toolbar input[type="search"]::placeholder {
        color: #9ca3af !important;
    }

    #sapo-expenses-page .exp-toolbar select {
        height: 38px !important;
        padding: 0 12px !important;
        font-size: 13px !important;
        border: 1px solid var(--exp-border-strong) !important;
        border-radius: 8px !important;
        background: var(--exp-bg) !important;
        color: var(--exp-text-secondary) !important;
        outline: none !important;
        cursor: pointer !important;
        min-width: 150px !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-expenses-page .exp-toolbar label {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
    }

    #sapo-expenses-page .exp-toolbar label span {
        font-size: 11.5px !important;
        font-weight: 600 !important;
        color: var(--exp-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-expenses-page .exp-toolbar label input[type="date"] {
        height: 38px !important;
        padding: 0 12px !important;
        font-size: 13px !important;
        color: var(--exp-text-secondary) !important;
        border: 1px solid var(--exp-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        background: var(--exp-bg) !important;
        min-width: 140px !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-expenses-page .exp-toolbar input:focus,
    #sapo-expenses-page .exp-toolbar select:focus {
        border-color: var(--exp-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
        background: var(--exp-white) !important;
    }

    #sapo-expenses-page .exp-clear-filter-button {
        height: 38px !important;
        padding: 0 14px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: var(--exp-red) !important;
        background: var(--exp-red-light) !important;
        border: 1px solid #fecaca !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-expenses-page .exp-clear-filter-button:hover {
        background: var(--exp-red) !important;
        color: #ffffff !important;
        border-color: var(--exp-red) !important;
    }

    /* ---------- Scrollable table ---------- */
    #sapo-expenses-page .exp-table-container {
        max-height: 560px !important;
        overflow-y: auto !important;
        overflow-x: auto !important;
        border: 1px solid var(--exp-border) !important;
        border-radius: 8px !important;
        background: var(--exp-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--exp-border-strong) transparent !important;
    }

    #sapo-expenses-page .exp-table-container::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
    }

    #sapo-expenses-page .exp-table-container::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-expenses-page .exp-table-container::-webkit-scrollbar-thumb {
        background: var(--exp-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-expenses-page .exp-table-container::-webkit-scrollbar-thumb:hover {
        background: #9ca3af !important;
    }

    #sapo-expenses-page .exp-table {
        width: 100% !important;
        min-width: 1120px !important;
        border-collapse: collapse !important;
        font-size: 13.5px !important;
        background: var(--exp-white) !important;
    }

    #sapo-expenses-page .exp-table thead {
        position: sticky !important;
        top: 0 !important;
        z-index: 1 !important;
    }

    #sapo-expenses-page .exp-table thead th {
        background: #f9fafb !important;
        color: var(--exp-muted) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        text-align: left !important;
        padding: 12px 16px !important;
        border-bottom: 1px solid var(--exp-border) !important;
        white-space: nowrap !important;
    }

    #sapo-expenses-page .exp-table tbody td {
        padding: 14px 16px !important;
        border-bottom: 1px solid #f1f5f9 !important;
        vertical-align: middle !important;
        color: var(--exp-text-secondary) !important;
        background: var(--exp-white) !important;
    }

    #sapo-expenses-page .exp-table tbody tr:last-child td {
        border-bottom: none !important;
    }

    #sapo-expenses-page .exp-table tbody tr:hover td {
        background: #f9fafb !important;
    }

    #sapo-expenses-page .exp-table td strong {
        font-weight: 600 !important;
        color: var(--exp-text) !important;
        display: block !important;
        background: transparent !important;
    }

    #sapo-expenses-page .exp-table td small {
        display: block !important;
        margin-top: 2px !important;
        font-size: 12px !important;
        color: #9ca3af !important;
        background: transparent !important;
    }

    #sapo-expenses-page .exp-amount {
        color: var(--exp-red) !important;
    }

    #sapo-expenses-page .exp-table-state {
        text-align: center !important;
        padding: 44px 16px !important;
        background: var(--exp-white) !important;
    }

    #sapo-expenses-page .exp-table-state strong {
        display: block !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: var(--exp-text) !important;
        margin-bottom: 4px !important;
        background: transparent !important;
    }

    #sapo-expenses-page .exp-table-state span {
        display: block !important;
        font-size: 13px !important;
        color: var(--exp-muted) !important;
        background: transparent !important;
    }

    /* ---------- Badges ---------- */
    #sapo-expenses-page .exp-recurring-badge,
    #sapo-expenses-page .exp-one-time-badge {
        display: inline-block !important;
        padding: 4px 10px !important;
        border-radius: 999px !important;
        font-size: 11.5px !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
    }

    #sapo-expenses-page .exp-recurring-badge {
        background: var(--exp-blue-light) !important;
        color: var(--exp-blue) !important;
    }

    #sapo-expenses-page .exp-one-time-badge {
        background: #f1f5f9 !important;
        color: #475569 !important;
    }

    /* ---------- Row actions ---------- */
    #sapo-expenses-page .exp-table-actions {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
    }

    #sapo-expenses-page .exp-edit-button,
    #sapo-expenses-page .exp-delete-button {
        padding: 6px 12px !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-expenses-page .exp-edit-button {
        color: var(--exp-blue) !important;
        background: var(--exp-blue-light) !important;
        border: 1px solid #bfdbfe !important;
    }

    #sapo-expenses-page .exp-edit-button:hover {
        background: var(--exp-blue) !important;
        color: #ffffff !important;
        border-color: var(--exp-blue) !important;
    }

    #sapo-expenses-page .exp-delete-button {
        color: var(--exp-red) !important;
        background: var(--exp-red-light) !important;
        border: 1px solid #fecaca !important;
    }

    #sapo-expenses-page .exp-delete-button:hover {
        background: var(--exp-red) !important;
        color: #ffffff !important;
        border-color: var(--exp-red) !important;
    }

    /* ---------- Pagination ---------- */
    #sapo-expenses-page .exp-pagination {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding-top: 4px !important;
    }

    #sapo-expenses-page .exp-pagination p {
        font-size: 13px !important;
        color: var(--exp-muted) !important;
        font-weight: 500 !important;
        background: transparent !important;
    }

    #sapo-expenses-page .exp-pagination p strong {
        color: var(--exp-text) !important;
        font-weight: 600 !important;
        background: transparent !important;
    }

    #sapo-expenses-page .exp-pagination-controls {
        display: flex !important;
        align-items: center !important;
        gap: 16px !important;
    }

    #sapo-expenses-page .exp-pagination-controls span {
        font-size: 13px !important;
        color: var(--exp-muted) !important;
        font-weight: 500 !important;
        background: transparent !important;
    }

    #sapo-expenses-page .exp-pagination-controls span strong {
        color: var(--exp-text) !important;
        font-weight: 600 !important;
        background: transparent !important;
    }

    #sapo-expenses-page .exp-pagination-button {
        padding: 7px 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--exp-white) !important;
        border: 1px solid var(--exp-border-strong) !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-expenses-page .exp-pagination-button:hover:not(:disabled) {
        background: #f9fafb !important;
        border-color: #9ca3af !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 760px) {
        #sapo-expenses-page .exp-header {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-expenses-page .exp-header-actions {
            width: 100% !important;
        }

        #sapo-expenses-page .exp-header-actions button {
            flex: 1 1 auto !important;
        }

        #sapo-expenses-page .exp-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-expenses-page .exp-toolbar select,
        #sapo-expenses-page .exp-toolbar label {
            width: 100% !important;
        }

        #sapo-expenses-page .exp-toolbar label input {
            width: 100% !important;
        }

        #sapo-expenses-page .exp-pagination {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-expenses-page .exp-pagination-controls {
            justify-content: space-between !important;
        }
    }
`;

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
    ] = useState<ExpenseSummary>(initialSummary);

    const [
        pagination,
        setPagination,
    ] = useState<PosPaginationMeta>(initialPagination);

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
    ] = useState<Expense | null>(null);

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
        <div id="sapo-expenses-page">
            <style>
                {expensesPageStyles}
            </style>

            <section className="exp-header">
                <div>
                    <span className="exp-kicker">
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

                <div className="exp-header-actions">
                    <button
                        type="button"
                        className="exp-secondary-button"
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
                        className="exp-primary-button"
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
                    className="exp-success-alert"
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
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
            )}

            {pageError && (
                <div
                    className="exp-form-alert"
                    role="alert"
                >
                    {pageError}
                </div>
            )}

            <section className="exp-summary-grid">
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

            <section className="exp-content-card">
                <div className="exp-toolbar">
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
                            className="exp-clear-filter-button"
                            onClick={clearFilters}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>

                <div className="exp-table-container">
                    <table className="exp-table">
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
                                        className="exp-table-state"
                                    >
                                        Loading expenses...
                                    </td>
                                </tr>
                            ) : expenses.length
                                === 0 ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="exp-table-state"
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
                                                            ? 'exp-recurring-badge'
                                                            : 'exp-one-time-badge'
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
                                                <strong className="exp-amount">
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
                                                <div className="exp-table-actions">
                                                    <button
                                                        type="button"
                                                        className="exp-edit-button"
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
                                                        className="exp-delete-button"
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
                    <footer className="exp-pagination">
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

                        <div className="exp-pagination-controls">
                            <button
                                type="button"
                                className="exp-pagination-button"
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
                                className="exp-pagination-button"
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