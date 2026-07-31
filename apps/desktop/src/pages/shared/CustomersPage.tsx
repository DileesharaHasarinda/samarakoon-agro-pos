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

const customersPageStyles = `
    #sapo-customers-page,
    #sapo-customers-page *,
    #sapo-customers-page *::before,
    #sapo-customers-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-customers-page {
        --cup-green-900: #14532d;
        --cup-green-800: #166534;
        --cup-green-700: #15803d;
        --cup-green-100: #dcfce7;
        --cup-green-50: #f0fdf4;
        --cup-blue: #2563eb;
        --cup-blue-light: #eff6ff;
        --cup-amber: #b45309;
        --cup-amber-light: #fffbeb;
        --cup-red: #dc2626;
        --cup-red-light: #fef2f2;
        --cup-slate: #475569;
        --cup-slate-light: #f1f5f9;
        --cup-text: #0f172a;
        --cup-text-secondary: #334155;
        --cup-muted: #64748b;
        --cup-border: #e2e8f0;
        --cup-border-strong: #cbd5e1;
        --cup-bg: #f8fafc;
        --cup-white: #ffffff;
        --cup-radius: 8px;
        --cup-radius-sm: 6px;
        --cup-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: relative !important;
        display: block !important;
        width: 100% !important;
        height: calc(100vh - 100px) !important;
        height: calc(100dvh - 100px) !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: 100% !important;
        max-height: calc(100vh - 100px) !important;
        max-height: calc(100dvh - 100px) !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        color: var(--cup-text) !important;
        font-family: var(--cup-font) !important;
        font-size: 14px !important;
        line-height: 1.45 !important;
        background: transparent !important;
        border: 0 !important;
        isolation: isolate !important;
    }

    #sapo-customers-page h1,
    #sapo-customers-page h2,
    #sapo-customers-page h3,
    #sapo-customers-page p,
    #sapo-customers-page span,
    #sapo-customers-page strong,
    #sapo-customers-page small,
    #sapo-customers-page label,
    #sapo-customers-page button,
    #sapo-customers-page input,
    #sapo-customers-page select,
    #sapo-customers-page table,
    #sapo-customers-page th,
    #sapo-customers-page td {
        font-family: var(--cup-font) !important;
        text-transform: none !important;
        letter-spacing: normal !important;
    }

    #sapo-customers-page h1,
    #sapo-customers-page h2,
    #sapo-customers-page h3,
    #sapo-customers-page p,
    #sapo-customers-page ul,
    #sapo-customers-page li {
        margin: 0 !important;
        padding: 0 !important;
        list-style: none !important;
    }

    /* ---------- Scroll region ---------- */

    #sapo-customers-page
    .cup-scroll-region {
        position: absolute !important;
        inset: 0 !important;
        display: flex !important;
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 16px !important;
        margin: 0 !important;
        padding: 16px 16px 32px 16px !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior-y: contain !important;
        scrollbar-gutter: stable !important;
        touch-action: pan-y !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--cup-border-strong) transparent !important;
        background: var(--cup-bg) !important;
    }

    #sapo-customers-page
    .cup-scroll-region > * {
        flex: 0 0 auto !important;
        flex-shrink: 0 !important;
    }

    #sapo-customers-page
    .cup-scroll-region::-webkit-scrollbar {
        width: 10px !important;
    }

    #sapo-customers-page
    .cup-scroll-region::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-customers-page
    .cup-scroll-region::-webkit-scrollbar-thumb {
        background: var(--cup-border-strong) !important;
        border: 2px solid transparent !important;
        border-radius: 999px !important;
        background-clip: content-box !important;
    }

    #sapo-customers-page
    .cup-scroll-region::-webkit-scrollbar-thumb:hover {
        background: #94a3b8 !important;
        background-clip: content-box !important;
    }

    /* ---------- Header ---------- */

    #sapo-customers-page
    .cup-header {
        display: flex !important;
        width: 100% !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 16px !important;
        margin: 0 !important;
        padding: 18px 20px !important;
        background: var(--cup-white) !important;
        border: 1px solid var(--cup-border) !important;
        border-radius: var(--cup-radius) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    }

    #sapo-customers-page
    .cup-header-copy {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 4px !important;
    }

    #sapo-customers-page
    .cup-kicker {
        display: block !important;
        color: var(--cup-green-700) !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        letter-spacing: 0.06em !important;
        text-transform: uppercase !important;
    }

    #sapo-customers-page
    .cup-header-copy h2 {
        color: var(--cup-text) !important;
        font-size: 20px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        letter-spacing: -0.01em !important;
    }

    #sapo-customers-page
    .cup-header-copy p {
        color: var(--cup-muted) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: 1.4 !important;
    }

    /* ---------- Buttons ---------- */

    #sapo-customers-page
    .cup-button {
        display: inline-flex !important;
        min-height: 38px !important;
        flex-shrink: 0 !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        margin: 0 !important;
        padding: 8px 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;
        text-align: center !important;
        text-decoration: none !important;
        appearance: none !important;
        border-radius: var(--cup-radius-sm) !important;
        box-shadow: none !important;
        cursor: pointer !important;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease !important;
        white-space: nowrap !important;
    }

    #sapo-customers-page
    .cup-primary-button {
        color: #ffffff !important;
        background: var(--cup-green-700) !important;
        border: 1px solid var(--cup-green-700) !important;
    }

    #sapo-customers-page
    .cup-primary-button:hover:not(:disabled) {
        background: var(--cup-green-800) !important;
        border-color: var(--cup-green-800) !important;
    }

    #sapo-customers-page
    .cup-secondary-button {
        color: var(--cup-text-secondary) !important;
        background: var(--cup-white) !important;
        border: 1px solid var(--cup-border-strong) !important;
    }

    #sapo-customers-page
    .cup-secondary-button:hover:not(:disabled) {
        color: var(--cup-text) !important;
        background: var(--cup-bg) !important;
        border-color: #94a3b8 !important;
    }

    #sapo-customers-page
    .cup-danger-button {
        color: var(--cup-red) !important;
        background: var(--cup-red-light) !important;
        border: 1px solid #fecaca !important;
    }

    #sapo-customers-page
    .cup-danger-button:hover:not(:disabled) {
        color: #ffffff !important;
        background: var(--cup-red) !important;
        border-color: var(--cup-red) !important;
    }

    #sapo-customers-page button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Alerts ---------- */

    #sapo-customers-page
    .cup-alert {
        display: flex !important;
        width: 100% !important;
        align-items: center !important;
        gap: 10px !important;
        margin: 0 !important;
        padding: 10px 14px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.4 !important;
        border-radius: var(--cup-radius-sm) !important;
    }

    #sapo-customers-page
    .cup-alert-success {
        color: var(--cup-green-800) !important;
        background: var(--cup-green-50) !important;
        border: 1px solid var(--cup-green-100) !important;
    }

    #sapo-customers-page
    .cup-alert-error {
        color: var(--cup-red) !important;
        background: var(--cup-red-light) !important;
        border: 1px solid #fecaca !important;
    }

    /* ---------- Panel / toolbar ---------- */

    #sapo-customers-page
    .cup-panel {
        display: flex !important;
        width: 100% !important;
        min-width: 0 !important;
        flex-direction: column !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: var(--cup-white) !important;
        border: 1px solid var(--cup-border) !important;
        border-radius: var(--cup-radius) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    }

    #sapo-customers-page
    .cup-toolbar {
        display: flex !important;
        width: 100% !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 10px !important;
        margin: 0 !important;
        padding: 14px 16px !important;
        background: var(--cup-white) !important;
        border-bottom: 1px solid var(--cup-border) !important;
    }

    #sapo-customers-page
    .cup-toolbar input[type="search"] {
        flex: 1 1 260px !important;
        min-width: 220px !important;
    }

    #sapo-customers-page
    .cup-toolbar select {
        flex: 0 0 auto !important;
        width: 180px !important;
    }

    #sapo-customers-page
    .cup-toolbar input,
    #sapo-customers-page
    .cup-toolbar select {
        display: block !important;
        height: 38px !important;
        min-height: 38px !important;
        margin: 0 !important;
        padding: 0 12px !important;
        color: var(--cup-text) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: normal !important;
        outline: none !important;
        background: var(--cup-white) !important;
        border: 1px solid var(--cup-border-strong) !important;
        border-radius: var(--cup-radius-sm) !important;
        box-shadow: none !important;
        appearance: auto !important;
    }

    #sapo-customers-page
    .cup-toolbar select {
        cursor: pointer !important;
    }

    #sapo-customers-page
    .cup-toolbar input::placeholder {
        color: #94a3b8 !important;
        font-size: 13px !important;
        opacity: 1 !important;
    }

    #sapo-customers-page
    .cup-toolbar input:focus,
    #sapo-customers-page
    .cup-toolbar select:focus {
        border-color: var(--cup-green-700) !important;
        box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.12) !important;
    }

    /* ---------- Table ---------- */

    #sapo-customers-page
    .cup-table-container {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: auto !important;
        overflow-y: visible !important;
        background: var(--cup-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--cup-border-strong) transparent !important;
    }

    #sapo-customers-page
    .cup-table-container::-webkit-scrollbar {
        height: 10px !important;
    }

    #sapo-customers-page
    .cup-table-container::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-customers-page
    .cup-table-container::-webkit-scrollbar-thumb {
        background: var(--cup-border-strong) !important;
        border-radius: 999px !important;
    }

    #sapo-customers-page
    .cup-table {
        width: 100% !important;
        min-width: 980px !important;
        margin: 0 !important;
        padding: 0 !important;
        table-layout: fixed !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
        background: var(--cup-white) !important;
    }

    #sapo-customers-page
    .cup-table th,
    #sapo-customers-page
    .cup-table td {
        margin: 0 !important;
        padding: 10px 12px !important;
        vertical-align: middle !important;
        text-align: left !important;
        white-space: nowrap !important;
        border: 0 !important;
        border-bottom: 1px solid var(--cup-border) !important;
    }

    #sapo-customers-page
    .cup-table th {
        position: sticky !important;
        top: 0 !important;
        z-index: 3 !important;
        height: 40px !important;
        color: var(--cup-text-secondary) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
        letter-spacing: 0.02em !important;
        text-transform: uppercase !important;
        background: #f1f5f9 !important;
        border-bottom: 1px solid var(--cup-border-strong) !important;
    }

    #sapo-customers-page
    .cup-table td {
        height: 58px !important;
        color: var(--cup-text) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: 1.3 !important;
        background: var(--cup-white) !important;
    }

    #sapo-customers-page
    .cup-table tbody tr:hover td {
        background: #f8fafc !important;
    }

    #sapo-customers-page
    .cup-col-customer {
        width: 220px !important;
    }

    #sapo-customers-page
    .cup-col-mobile {
        width: 140px !important;
    }

    #sapo-customers-page
    .cup-col-type {
        width: 120px !important;
    }

    #sapo-customers-page
    .cup-col-money {
        width: 150px !important;
    }

    #sapo-customers-page
    .cup-col-small {
        width: 90px !important;
    }

    #sapo-customers-page
    .cup-col-status {
        width: 110px !important;
    }

    #sapo-customers-page
    .cup-col-actions {
        width: 170px !important;
    }

    #sapo-customers-page
    .cup-customer-cell {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 2px !important;
    }

    #sapo-customers-page
    .cup-customer-name {
        display: block !important;
        overflow: hidden !important;
        color: var(--cup-text) !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-customers-page
    .cup-customer-code {
        display: block !important;
        overflow: hidden !important;
        color: var(--cup-muted) !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        line-height: 1.3 !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-customers-page
    .cup-type-badge {
        display: inline-flex !important;
        min-height: 24px !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 3px 9px !important;
        color: var(--cup-slate) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
        text-transform: capitalize !important;
        background: var(--cup-slate-light) !important;
        border-radius: 999px !important;
    }

    #sapo-customers-page
    .cup-due-value {
        color: var(--cup-red) !important;
        font-weight: 700 !important;
    }

    #sapo-customers-page
    .cup-status-badge {
        display: inline-flex !important;
        min-height: 24px !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 3px 9px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
        border-radius: 999px !important;
    }

    #sapo-customers-page
    .cup-status-active {
        color: var(--cup-green-800) !important;
        background: var(--cup-green-100) !important;
    }

    #sapo-customers-page
    .cup-status-inactive {
        color: var(--cup-muted) !important;
        background: #f1f5f9 !important;
    }

    #sapo-customers-page
    .cup-table-actions {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
    }

    #sapo-customers-page
    .cup-action-button {
        min-width: 68px !important;
        min-height: 32px !important;
        padding: 5px 10px !important;
        font-size: 12px !important;
    }

    #sapo-customers-page
    .cup-table-state {
        height: 200px !important;
        padding: 20px !important;
        text-align: center !important;
        white-space: normal !important;
        color: var(--cup-muted) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        background: var(--cup-white) !important;
    }

    /* ---------- Pagination ---------- */

    #sapo-customers-page
    .cup-pagination {
        display: flex !important;
        min-height: 56px !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 14px !important;
        margin: 0 !important;
        padding: 12px 16px !important;
        background: var(--cup-white) !important;
        border-top: 1px solid var(--cup-border) !important;
    }

    #sapo-customers-page
    .cup-pagination span {
        color: var(--cup-muted) !important;
        font-size: 13px !important;
        font-weight: 500 !important;
    }

    #sapo-customers-page
    .cup-pagination-button {
        min-width: 88px !important;
        min-height: 34px !important;
        padding: 6px 10px !important;
        font-size: 13px !important;
    }

    /* ---------- Responsive ---------- */

    @media (max-width: 760px) {
        #sapo-customers-page {
            height: calc(100vh - 72px) !important;
            height: calc(100dvh - 72px) !important;
            max-height: calc(100vh - 72px) !important;
            max-height: calc(100dvh - 72px) !important;
        }

        #sapo-customers-page
        .cup-scroll-region {
            gap: 12px !important;
            padding: 12px 10px 28px 10px !important;
        }

        #sapo-customers-page
        .cup-header {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 14px !important;
            gap: 12px !important;
        }

        #sapo-customers-page
        .cup-header-copy h2 {
            font-size: 18px !important;
        }

        #sapo-customers-page
        .cup-header .cup-button {
            width: 100% !important;
        }

        #sapo-customers-page
        .cup-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-customers-page
        .cup-toolbar input[type="search"],
        #sapo-customers-page
        .cup-toolbar select {
            width: 100% !important;
        }

        #sapo-customers-page
        .cup-pagination {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-customers-page
        .cup-pagination-button {
            width: 100% !important;
        }
    }
`;

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

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeout =
            window.setTimeout(
                () => {
                    setSuccessMessage('');
                },
                3500,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [successMessage]);

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
        <div id="sapo-customers-page">
            <style>
                {customersPageStyles}
            </style>

            <div className="cup-scroll-region">
                <header className="cup-header">
                    <div className="cup-header-copy">
                        <span className="cup-kicker">
                            Customer Accounts
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
                        className="cup-button cup-primary-button"
                        onClick={() => {
                            setSelectedCustomer(
                                null,
                            );

                            setFormOpen(true);
                        }}
                    >
                        Add Customer
                    </button>
                </header>

                {successMessage && (
                    <div className="cup-alert cup-alert-success">
                        {successMessage}
                    </div>
                )}

                {errorMessage
                    && !formOpen && (
                        <div className="cup-alert cup-alert-error">
                            {errorMessage}
                        </div>
                    )}

                <section className="cup-panel">
                    <div className="cup-toolbar">
                        <input
                            type="search"
                            value={searchInput}
                            placeholder="Search customer name, mobile or code..."
                            aria-label="Search customers"
                            onChange={(event) => {
                                setSearchInput(
                                    event.target.value,
                                );
                            }}
                        />

                        <select
                            value={status}
                            aria-label="Filter by status"
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

                    <div className="cup-table-container">
                        <table className="cup-table">
                            <thead>
                                <tr>
                                    <th className="cup-col-customer">
                                        Customer
                                    </th>

                                    <th className="cup-col-mobile">
                                        Mobile
                                    </th>

                                    <th className="cup-col-type">
                                        Type
                                    </th>

                                    <th className="cup-col-money">
                                        Credit Limit
                                    </th>

                                    <th className="cup-col-money">
                                        Outstanding Due
                                    </th>

                                    <th className="cup-col-small">
                                        Sales
                                    </th>

                                    <th className="cup-col-status">
                                        Status
                                    </th>

                                    <th className="cup-col-actions">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="cup-table-state"
                                        >
                                            Loading customers...
                                        </td>
                                    </tr>
                                ) : customers.length
                                    === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="cup-table-state"
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
                                                    <div className="cup-customer-cell">
                                                        <strong
                                                            className="cup-customer-name"
                                                            title={
                                                                customer
                                                                    .name
                                                            }
                                                        >
                                                            {
                                                                customer
                                                                    .name
                                                            }
                                                        </strong>

                                                        <small className="cup-customer-code">
                                                            {
                                                                customer
                                                                    .customer_code
                                                            }
                                                        </small>
                                                    </div>
                                                </td>

                                                <td>
                                                    {customer.mobile
                                                        || '—'}
                                                </td>

                                                <td>
                                                    <span className="cup-type-badge">
                                                        {
                                                            customer
                                                                .customer_type
                                                        }
                                                    </span>
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
                                                                ? 'cup-due-value'
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
                                                                ? 'cup-status-badge cup-status-active'
                                                                : 'cup-status-badge cup-status-inactive'
                                                        }
                                                    >
                                                        {customer
                                                            .is_active
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="cup-table-actions">
                                                        <button
                                                            type="button"
                                                            className="cup-button cup-secondary-button cup-action-button"
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
                                                                className="cup-button cup-danger-button cup-action-button"
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

                    <footer className="cup-pagination">
                        <button
                            type="button"
                            className="cup-button cup-secondary-button cup-pagination-button"
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
                            className="cup-button cup-secondary-button cup-pagination-button"
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
            </div>

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