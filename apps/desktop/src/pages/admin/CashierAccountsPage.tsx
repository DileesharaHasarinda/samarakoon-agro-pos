import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import CashierFormModal
    from '../../components/cashiers/CashierFormModal';

import ResetCashierPasswordModal
    from '../../components/cashiers/ResetCashierPasswordModal';

import {
    ApiError,
} from '../../lib/api';

import {
    createCashier,
    getCashiers,
    resetCashierPassword,
    updateCashier,
    updateCashierStatus,
} from '../../services/cashierService';

import type {
    Cashier,
    CashierInput,
    CashierSummary,
    CashierUpdateInput,
} from '../../types/cashier';

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

const emptySummary:
    CashierSummary = {
    total_cashiers: 0,
    active_cashiers: 0,
    inactive_cashiers: 0,
    cashiers_with_open_shift: 0,
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

function formatDateTime(
    value: string | null,
): string {
    if (!value) {
        return 'Never';
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        },
    ).format(
        new Date(value),
    );
}

// ---------------------------------------------------------------------------
// Scoped, isolated stylesheet — ID-scoped and !important on every rule so
// nothing from global admin/layout CSS can leak in and override colors,
// badge styling, or scroll behaviour. Palette matches salesHistoryStyles
// (green primary, blue accent, amber warning, red danger).
// ---------------------------------------------------------------------------
const cashierAccountsStyles = `
    #sapo-cashier-accounts-page,
    #sapo-cashier-accounts-page *,
    #sapo-cashier-accounts-page *::before,
    #sapo-cashier-accounts-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-cashier-accounts-page {
        --ca-green-950: #052e16;
        --ca-green-900: #14532d;
        --ca-green-800: #166534;
        --ca-green-700: #15803d;
        --ca-green-100: #dcfce7;
        --ca-green-50: #f0fdf4;
        --ca-blue: #2563eb;
        --ca-blue-light: #eff6ff;
        --ca-amber: #b45309;
        --ca-amber-light: #fffbeb;
        --ca-red: #dc2626;
        --ca-red-light: #fef2f2;
        --ca-text: #0f172a;
        --ca-text-secondary: #334155;
        --ca-muted: #64748b;
        --ca-subtle: #94a3b8;
        --ca-border: #e2e8f0;
        --ca-border-strong: #cbd5e1;
        --ca-bg: #f8fafc;
        --ca-white: #ffffff;
        --ca-radius: 10px;
        --ca-radius-sm: 8px;
        --ca-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        gap: 20px !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--ca-text-secondary) !important;
        font-family: var(--ca-font) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        background: transparent !important;
        isolation: isolate !important;
    }

    #sapo-cashier-accounts-page h2,
    #sapo-cashier-accounts-page h3,
    #sapo-cashier-accounts-page p,
    #sapo-cashier-accounts-page span,
    #sapo-cashier-accounts-page strong,
    #sapo-cashier-accounts-page small,
    #sapo-cashier-accounts-page label,
    #sapo-cashier-accounts-page button,
    #sapo-cashier-accounts-page input,
    #sapo-cashier-accounts-page select {
        font-family: var(--ca-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-cashier-accounts-page h2,
    #sapo-cashier-accounts-page h3,
    #sapo-cashier-accounts-page p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Header ---------- */
    #sapo-cashier-accounts-page .ca-header {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 16px !important;
        padding: 20px 24px !important;
        background: var(--ca-white) !important;
        border: 1px solid var(--ca-border) !important;
        border-radius: var(--ca-radius) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    }

    #sapo-cashier-accounts-page .ca-kicker {
        display: inline-block !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        letter-spacing: 0.06em !important;
        text-transform: uppercase !important;
        color: var(--ca-green-700) !important;
        background: transparent !important;
        margin-bottom: 6px !important;
    }

    #sapo-cashier-accounts-page .ca-header h2 {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--ca-text) !important;
        letter-spacing: -0.01em !important;
        margin-bottom: 4px !important;
    }

    #sapo-cashier-accounts-page .ca-header p {
        font-size: 13.5px !important;
        color: var(--ca-muted) !important;
        max-width: 480px !important;
    }

    /* ---------- Buttons ---------- */
    #sapo-cashier-accounts-page .ca-primary-button,
    #sapo-cashier-accounts-page .ca-secondary-button,
    #sapo-cashier-accounts-page .ca-danger-button,
    #sapo-cashier-accounts-page .ca-activate-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 38px !important;
        padding: 0 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        border-radius: var(--ca-radius-sm) !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease !important;
    }

    #sapo-cashier-accounts-page .ca-primary-button {
        color: #ffffff !important;
        background: var(--ca-green-700) !important;
        border: 1px solid var(--ca-green-700) !important;
    }

    #sapo-cashier-accounts-page .ca-primary-button:hover:not(:disabled) {
        background: var(--ca-green-800) !important;
        border-color: var(--ca-green-800) !important;
    }

    #sapo-cashier-accounts-page .ca-secondary-button {
        color: var(--ca-text-secondary) !important;
        background: var(--ca-white) !important;
        border: 1px solid var(--ca-border-strong) !important;
    }

    #sapo-cashier-accounts-page .ca-secondary-button:hover:not(:disabled) {
        color: var(--ca-text) !important;
        background: var(--ca-bg) !important;
        border-color: #94a3b8 !important;
    }

    #sapo-cashier-accounts-page .ca-edit-button {
        color: var(--ca-blue) !important;
        background: var(--ca-blue-light) !important;
        border: 1px solid #bfdbfe !important;
    }

    #sapo-cashier-accounts-page .ca-edit-button:hover:not(:disabled) {
        color: #ffffff !important;
        background: var(--ca-blue) !important;
        border-color: var(--ca-blue) !important;
    }

    #sapo-cashier-accounts-page .ca-danger-button {
        color: var(--ca-red) !important;
        background: var(--ca-red-light) !important;
        border: 1px solid #fecaca !important;
    }

    #sapo-cashier-accounts-page .ca-danger-button:hover:not(:disabled) {
        color: #ffffff !important;
        background: var(--ca-red) !important;
        border-color: var(--ca-red) !important;
    }

    #sapo-cashier-accounts-page .ca-activate-button {
        color: var(--ca-green-800) !important;
        background: var(--ca-green-50) !important;
        border: 1px solid var(--ca-green-100) !important;
    }

    #sapo-cashier-accounts-page .ca-activate-button:hover:not(:disabled) {
        color: #ffffff !important;
        background: var(--ca-green-700) !important;
        border-color: var(--ca-green-700) !important;
    }

    #sapo-cashier-accounts-page button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Summary grid ---------- */
    #sapo-cashier-accounts-page .ca-summary-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)) !important;
        gap: 16px !important;
    }

    #sapo-cashier-accounts-page .ca-summary-grid article {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        padding: 18px 20px !important;
        background: var(--ca-white) !important;
        border: 1px solid var(--ca-border) !important;
        border-radius: var(--ca-radius) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    }

    #sapo-cashier-accounts-page .ca-summary-grid span {
        font-size: 12px !important;
        font-weight: 600 !important;
        color: var(--ca-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-cashier-accounts-page .ca-summary-grid strong {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--ca-text) !important;
        background: transparent !important;
    }

    /* ---------- Alerts ---------- */
    #sapo-cashier-accounts-page .ca-success-alert {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 12px 16px !important;
        border-radius: var(--ca-radius-sm) !important;
        background: var(--ca-green-50) !important;
        border: 1px solid var(--ca-green-100) !important;
    }

    #sapo-cashier-accounts-page .ca-success-alert span:first-child {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 20px !important;
        height: 20px !important;
        flex-shrink: 0 !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        background: var(--ca-green-700) !important;
        border-radius: 999px !important;
    }

    #sapo-cashier-accounts-page .ca-success-alert p {
        flex: 1 !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        color: var(--ca-green-800) !important;
    }

    #sapo-cashier-accounts-page .ca-success-alert button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 24px !important;
        height: 24px !important;
        flex-shrink: 0 !important;
        font-size: 16px !important;
        line-height: 1 !important;
        color: var(--ca-green-800) !important;
        background: transparent !important;
        border: none !important;
        border-radius: var(--ca-radius-sm) !important;
        cursor: pointer !important;
    }

    #sapo-cashier-accounts-page .ca-success-alert button:hover {
        background: rgba(21, 128, 61, 0.1) !important;
    }

    #sapo-cashier-accounts-page .ca-form-alert {
        padding: 12px 16px !important;
        border-radius: var(--ca-radius-sm) !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        background: var(--ca-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Panel ---------- */
    #sapo-cashier-accounts-page .ca-panel {
        display: flex !important;
        flex-direction: column !important;
        background: var(--ca-white) !important;
        border: 1px solid var(--ca-border) !important;
        border-radius: var(--ca-radius) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
        overflow: hidden !important;
    }

    /* ---------- Toolbar ---------- */
    #sapo-cashier-accounts-page .ca-toolbar {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 16px 20px !important;
        border-bottom: 1px solid var(--ca-border) !important;
    }

    #sapo-cashier-accounts-page .ca-toolbar input[type="search"] {
        flex: 1 1 260px !important;
        height: 38px !important;
        padding: 0 14px !important;
        font-size: 13.5px !important;
        color: var(--ca-text-secondary) !important;
        border: 1px solid var(--ca-border-strong) !important;
        border-radius: var(--ca-radius-sm) !important;
        outline: none !important;
        background: var(--ca-bg) !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-cashier-accounts-page .ca-toolbar input[type="search"]::placeholder {
        color: var(--ca-subtle) !important;
    }

    #sapo-cashier-accounts-page .ca-toolbar select {
        height: 38px !important;
        padding: 0 12px !important;
        font-size: 13px !important;
        border: 1px solid var(--ca-border-strong) !important;
        border-radius: var(--ca-radius-sm) !important;
        background: var(--ca-bg) !important;
        color: var(--ca-text-secondary) !important;
        outline: none !important;
        cursor: pointer !important;
        min-width: 140px !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-cashier-accounts-page .ca-toolbar input:focus,
    #sapo-cashier-accounts-page .ca-toolbar select:focus {
        border-color: var(--ca-green-700) !important;
        box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.12) !important;
        background: var(--ca-white) !important;
    }

    /* ---------- Scrollable cashier list ---------- */
    #sapo-cashier-accounts-page .ca-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        max-height: 640px !important;
        overflow-y: auto !important;
        padding: 16px 20px !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--ca-border-strong) transparent !important;
    }

    #sapo-cashier-accounts-page .ca-list::-webkit-scrollbar {
        width: 9px !important;
    }

    #sapo-cashier-accounts-page .ca-list::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-cashier-accounts-page .ca-list::-webkit-scrollbar-thumb {
        background: var(--ca-border-strong) !important;
        border-radius: 999px !important;
    }

    #sapo-cashier-accounts-page .ca-list::-webkit-scrollbar-thumb:hover {
        background: #94a3b8 !important;
    }

    #sapo-cashier-accounts-page .ca-table-state {
        text-align: center !important;
        padding: 44px 16px !important;
        color: var(--ca-muted) !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
    }

    /* ---------- Cashier card ---------- */
    #sapo-cashier-accounts-page .ca-card {
        display: flex !important;
        flex-direction: column !important;
        gap: 14px !important;
        padding: 16px 18px !important;
        background: var(--ca-white) !important;
        border: 1px solid var(--ca-border) !important;
        border-radius: var(--ca-radius) !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-cashier-accounts-page .ca-card:hover {
        border-color: var(--ca-border-strong) !important;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06) !important;
    }

    #sapo-cashier-accounts-page .ca-card header {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
    }

    #sapo-cashier-accounts-page .ca-avatar {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 40px !important;
        height: 40px !important;
        flex-shrink: 0 !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        color: var(--ca-green-800) !important;
        background: var(--ca-green-50) !important;
        border: 1px solid var(--ca-green-100) !important;
        border-radius: 999px !important;
    }

    #sapo-cashier-accounts-page .ca-card header > div:nth-child(2) {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
        min-width: 0 !important;
        flex: 1 !important;
    }

    #sapo-cashier-accounts-page .ca-card header strong {
        font-size: 14.5px !important;
        font-weight: 700 !important;
        color: var(--ca-text) !important;
        background: transparent !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-cashier-accounts-page .ca-card header > div:nth-child(2) > span {
        font-size: 12.5px !important;
        color: var(--ca-muted) !important;
        background: transparent !important;
    }

    #sapo-cashier-accounts-page .ca-active-badge,
    #sapo-cashier-accounts-page .ca-inactive-badge {
        display: inline-flex !important;
        align-items: center !important;
        flex-shrink: 0 !important;
        padding: 4px 12px !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
        letter-spacing: 0.02em !important;
        border-radius: 999px !important;
        white-space: nowrap !important;
    }

    #sapo-cashier-accounts-page .ca-active-badge {
        color: var(--ca-green-800) !important;
        background: var(--ca-green-100) !important;
    }

    #sapo-cashier-accounts-page .ca-inactive-badge {
        color: var(--ca-muted) !important;
        background: #f1f5f9 !important;
    }

    /* ---------- Detail grid ---------- */
    #sapo-cashier-accounts-page .ca-details-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
        gap: 12px 16px !important;
        padding: 14px 0 !important;
        border-top: 1px solid #f1f5f9 !important;
        border-bottom: 1px solid #f1f5f9 !important;
    }

    #sapo-cashier-accounts-page .ca-details-grid > div {
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;
        min-width: 0 !important;
    }

    #sapo-cashier-accounts-page .ca-details-grid > div > span {
        font-size: 11px !important;
        font-weight: 600 !important;
        color: var(--ca-subtle) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-cashier-accounts-page .ca-details-grid > div > strong {
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: var(--ca-text) !important;
        background: transparent !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-cashier-accounts-page .ca-date-value {
        color: var(--ca-text-secondary) !important;
        font-weight: 500 !important;
    }

    /* ---------- Card actions ---------- */
    #sapo-cashier-accounts-page .ca-card-actions {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
    }

    #sapo-cashier-accounts-page .ca-card-actions button {
        flex: 0 0 auto !important;
    }

    /* ---------- Pagination ---------- */
    #sapo-cashier-accounts-page .ca-pagination {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 14px 20px !important;
        border-top: 1px solid var(--ca-border) !important;
    }

    #sapo-cashier-accounts-page .ca-pagination p {
        font-size: 13px !important;
        color: var(--ca-muted) !important;
        font-weight: 500 !important;
        background: transparent !important;
    }

    #sapo-cashier-accounts-page .ca-pagination p strong {
        color: var(--ca-text) !important;
        font-weight: 600 !important;
        background: transparent !important;
    }

    #sapo-cashier-accounts-page .ca-pagination-controls {
        display: flex !important;
        align-items: center !important;
        gap: 16px !important;
    }

    #sapo-cashier-accounts-page .ca-pagination-controls span {
        font-size: 13px !important;
        color: var(--ca-muted) !important;
        font-weight: 500 !important;
        background: transparent !important;
    }

    #sapo-cashier-accounts-page .ca-pagination-controls span strong {
        color: var(--ca-text) !important;
        font-weight: 600 !important;
        background: transparent !important;
    }

    #sapo-cashier-accounts-page .ca-pagination-button {
        height: 34px !important;
        padding: 0 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: var(--ca-text-secondary) !important;
        background: var(--ca-white) !important;
        border: 1px solid var(--ca-border-strong) !important;
        border-radius: var(--ca-radius-sm) !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-cashier-accounts-page .ca-pagination-button:hover:not(:disabled) {
        background: var(--ca-bg) !important;
        border-color: #94a3b8 !important;
    }

    #sapo-cashier-accounts-page .ca-pagination-button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 760px) {
        #sapo-cashier-accounts-page .ca-header {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-cashier-accounts-page .ca-header button {
            width: 100% !important;
        }

        #sapo-cashier-accounts-page .ca-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-cashier-accounts-page .ca-toolbar select {
            width: 100% !important;
        }

        #sapo-cashier-accounts-page .ca-list {
            max-height: none !important;
        }

        #sapo-cashier-accounts-page .ca-card-actions button {
            flex: 1 1 auto !important;
        }

        #sapo-cashier-accounts-page .ca-pagination {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-cashier-accounts-page .ca-pagination-controls {
            justify-content: space-between !important;
        }
    }
`;

export default function CashierAccountsPage() {
    const {
        token,
    } = useAuth();

    const [
        cashiers,
        setCashiers,
    ] = useState<Cashier[]>([]);

    const [
        summary,
        setSummary,
    ] = useState<CashierSummary>(
        emptySummary,
    );

    const [
        pagination,
        setPagination,
    ] = useState<PosPaginationMeta>(
        emptyPagination,
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
        status,
        setStatus,
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
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        formOpen,
        setFormOpen,
    ] = useState(false);

    const [
        selectedCashier,
        setSelectedCashier,
    ] = useState<Cashier | null>(
        null,
    );

    const [
        resetCashier,
        setResetCashier,
    ] = useState<Cashier | null>(
        null,
    );

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        modalError,
        setModalError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const loadCashiers =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getCashiers(
                            token,
                            {
                                search,
                                status,
                                page,
                                perPage,
                            },
                        );

                    setCashiers(
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
                            : 'Unable to load cashier accounts.',
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
                perPage,
            ],
        );

    useEffect(() => {
        void loadCashiers();
    }, [loadCashiers]);

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

    const createAccount =
        async (
            values:
                CashierInput,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setIsSubmitting(true);
            setModalError('');
            setSuccessMessage('');

            try {
                const response =
                    await createCashier(
                        token,
                        values,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Cashier account created successfully.',
                );

                setFormOpen(false);
                setSelectedCashier(null);

                await loadCashiers();
            } catch (error) {
                setModalError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to create cashier account.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const updateAccount =
        async (
            values:
                CashierUpdateInput,
        ): Promise<void> => {
            if (
                !token
                || !selectedCashier
            ) {
                return;
            }

            setIsSubmitting(true);
            setModalError('');
            setSuccessMessage('');

            try {
                const response =
                    await updateCashier(
                        token,
                        selectedCashier.id,
                        values,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Cashier account updated successfully.',
                );

                setFormOpen(false);
                setSelectedCashier(null);

                await loadCashiers();
            } catch (error) {
                setModalError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to update cashier account.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    const toggleStatus =
        async (
            cashier: Cashier,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            const action =
                cashier.is_active
                    ? 'deactivate'
                    : 'activate';

            const confirmed =
                window.confirm(
                    `${action
                        .charAt(0)
                        .toUpperCase()}${action.slice(1)} ${cashier.name}?`,
                );

            if (!confirmed) {
                return;
            }

            setPageError('');
            setSuccessMessage('');

            try {
                const response =
                    await updateCashierStatus(
                        token,
                        cashier.id,
                        !cashier.is_active,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Cashier status updated successfully.',
                );

                await loadCashiers();
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to update cashier status.',
                );
            }
        };

    const submitPasswordReset =
        async (
            password: string,
            confirmation: string,
        ): Promise<void> => {
            if (
                !token
                || !resetCashier
            ) {
                return;
            }

            setIsSubmitting(true);
            setModalError('');
            setSuccessMessage('');

            try {
                const response =
                    await resetCashierPassword(
                        token,
                        resetCashier.id,
                        password,
                        confirmation,
                    );

                setSuccessMessage(
                    response.message,
                );

                setResetCashier(null);
            } catch (error) {
                setModalError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to reset cashier password.',
                );
            } finally {
                setIsSubmitting(false);
            }
        };

    return (
        <div id="sapo-cashier-accounts-page">
            <style>
                {cashierAccountsStyles}
            </style>

            <section className="ca-header">
                <div>
                    <span className="ca-kicker">
                        Staff administration
                    </span>

                    <h2>
                        Cashier Accounts
                    </h2>

                    <p>
                        Create cashier accounts,
                        manage access and review
                        cashier activity.
                    </p>
                </div>

                <button
                    type="button"
                    className="ca-primary-button"
                    onClick={() => {
                        setSelectedCashier(
                            null,
                        );

                        setModalError('');
                        setSuccessMessage('');
                        setFormOpen(true);
                    }}
                >
                    Add Cashier
                </button>
            </section>

            <section className="ca-summary-grid">
                <article>
                    <span>
                        Total Cashiers
                    </span>

                    <strong>
                        {summary.total_cashiers}
                    </strong>
                </article>

                <article>
                    <span>
                        Active Cashiers
                    </span>

                    <strong>
                        {summary.active_cashiers}
                    </strong>
                </article>

                <article>
                    <span>
                        Inactive Cashiers
                    </span>

                    <strong>
                        {summary.inactive_cashiers}
                    </strong>
                </article>

                <article>
                    <span>
                        Open Shifts
                    </span>

                    <strong>
                        {summary
                            .cashiers_with_open_shift}
                    </strong>
                </article>
            </section>

            {successMessage && (
                <div
                    className="ca-success-alert"
                    role="status"
                >
                    <span>✓</span>

                    <p>
                        {successMessage}
                    </p>

                    <button
                        type="button"
                        aria-label="Dismiss success message"
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
                    className="ca-form-alert"
                    role="alert"
                >
                    {pageError}
                </div>
            )}

            <section className="ca-panel">
                <div className="ca-toolbar">
                    <input
                        type="search"
                        value={searchInput}
                        placeholder="Search cashier name, username, email or phone..."
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
                        <option value="all">
                            All Accounts
                        </option>

                        <option value="active">
                            Active
                        </option>

                        <option value="inactive">
                            Inactive
                        </option>
                    </select>

                    <select
                        value={perPage}
                        onChange={(event) => {
                            setPerPage(
                                Number(
                                    event.target.value,
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
                </div>

                <div className="ca-list">
                    {isLoading ? (
                        <div className="ca-table-state">
                            Loading cashier accounts...
                        </div>
                    ) : cashiers.length
                        === 0 ? (
                        <div className="ca-table-state">
                            No cashier accounts found.
                        </div>
                    ) : (
                        cashiers.map(
                            (cashier) => (
                                <article
                                    className="ca-card"
                                    key={cashier.id}
                                >
                                    <header>
                                        <div className="ca-avatar">
                                            {cashier.name
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>

                                        <div>
                                            <strong>
                                                {cashier.name}
                                            </strong>

                                            <span>
                                                @{cashier.username}
                                            </span>
                                        </div>

                                        <span
                                            className={
                                                cashier.is_active
                                                    ? 'ca-active-badge'
                                                    : 'ca-inactive-badge'
                                            }
                                        >
                                            {cashier.is_active
                                                ? 'Active'
                                                : 'Inactive'}
                                        </span>
                                    </header>

                                    <div className="ca-details-grid">
                                        <div>
                                            <span>
                                                Email
                                            </span>

                                            <strong>
                                                {cashier.email}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Phone
                                            </span>

                                            <strong>
                                                {cashier.phone
                                                    ?? 'Not provided'}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Last Login
                                            </span>

                                            <strong className="ca-date-value">
                                                {formatDateTime(
                                                    cashier
                                                        .last_login_at,
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Total Sales
                                            </span>

                                            <strong>
                                                {
                                                    cashier
                                                        .statistics
                                                        .sales_count
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Sales Value
                                            </span>

                                            <strong>
                                                {currencyFormatter
                                                    .format(
                                                        cashier
                                                            .statistics
                                                            .sales_total,
                                                    )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Payments Collected
                                            </span>

                                            <strong>
                                                {currencyFormatter
                                                    .format(
                                                        cashier
                                                            .statistics
                                                            .payments_collected,
                                                    )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Returns
                                            </span>

                                            <strong>
                                                {
                                                    cashier
                                                        .statistics
                                                        .returns_count
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Shifts
                                            </span>

                                            <strong>
                                                {
                                                    cashier
                                                        .statistics
                                                        .shifts_count
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Current Shift
                                            </span>

                                            <strong>
                                                {cashier.open_shift
                                                    ? cashier
                                                        .open_shift
                                                        .shift_number
                                                    : 'No open shift'}
                                            </strong>
                                        </div>
                                    </div>

                                    <footer className="ca-card-actions">
                                        <button
                                            type="button"
                                            className="ca-edit-button"
                                            onClick={() => {
                                                setSelectedCashier(
                                                    cashier,
                                                );

                                                setModalError('');
                                                setSuccessMessage('');
                                                setFormOpen(true);
                                            }}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            className="ca-secondary-button"
                                            onClick={() => {
                                                setResetCashier(
                                                    cashier,
                                                );

                                                setModalError('');
                                                setSuccessMessage('');
                                            }}
                                        >
                                            Reset Password
                                        </button>

                                        <button
                                            type="button"
                                            className={
                                                cashier.is_active
                                                    ? 'ca-danger-button'
                                                    : 'ca-activate-button'
                                            }
                                            disabled={
                                                cashier.is_active
                                                && cashier.open_shift
                                                !== null
                                            }
                                            onClick={() => {
                                                void toggleStatus(
                                                    cashier,
                                                );
                                            }}
                                        >
                                            {cashier.is_active
                                                ? 'Deactivate'
                                                : 'Activate'}
                                        </button>
                                    </footer>
                                </article>
                            ),
                        )
                    )}
                </div>

                {pagination.total > 0 && (
                    <footer className="ca-pagination">
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

                            {' '}cashiers
                        </p>

                        <div className="ca-pagination-controls">
                            <button
                                type="button"
                                className="ca-pagination-button"
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
                                className="ca-pagination-button"
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

            <CashierFormModal
                cashier={selectedCashier}
                isOpen={formOpen}
                isSubmitting={isSubmitting}
                errorMessage={modalError}
                onClose={() => {
                    if (!isSubmitting) {
                        setFormOpen(false);

                        setSelectedCashier(
                            null,
                        );

                        setModalError('');
                    }
                }}
                onCreate={(values) => {
                    void createAccount(
                        values,
                    );
                }}
                onUpdate={(values) => {
                    void updateAccount(
                        values,
                    );
                }}
            />

            <ResetCashierPasswordModal
                cashier={resetCashier}
                isSubmitting={isSubmitting}
                errorMessage={modalError}
                onClose={() => {
                    if (!isSubmitting) {
                        setResetCashier(null);
                        setModalError('');
                    }
                }}
                onSubmit={(
                    password,
                    confirmation,
                ) => {
                    void submitPasswordReset(
                        password,
                        confirmation,
                    );
                }}
            />
        </div>
    );
}