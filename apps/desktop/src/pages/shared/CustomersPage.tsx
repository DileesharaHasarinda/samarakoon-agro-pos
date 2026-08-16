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

import CustomerViewModal
    from '../../components/customers/CustomerViewModal';

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
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
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
        --cup-green-800: #166534;
        --cup-green-700: #15803d;
        --cup-green-100: #dcfce7;
        --cup-green-50: #f0fdf4;

        --cup-red: #dc2626;
        --cup-red-light: #fef2f2;

        --cup-blue: #2563eb;
        --cup-blue-light: #eff6ff;

        --cup-slate: #475569;
        --cup-slate-light: #f1f5f9;

        --cup-text: #111827;
        --cup-text-secondary: #1f2937;
        --cup-muted: #6b7280;

        --cup-border: #e5e7eb;
        --cup-border-strong: #d1d5db;

        --cup-bg: #f9fafb;
        --cup-white: #ffffff;

        --cup-font:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Helvetica,
            Arial,
            sans-serif;

        display: flex !important;

        width: 100% !important;
        min-width: 0 !important;

        flex-direction: column !important;

        gap: 20px !important;

        margin: 0 !important;
        padding: 0 !important;

        color:
            var(--cup-text-secondary) !important;

        font-family:
            var(--cup-font) !important;

        font-size: 14px !important;
        line-height: 1.5 !important;

        background:
            transparent !important;

        isolation:
            isolate !important;

        overflow:
            visible !important;
    }

    #sapo-customers-page h1,
    #sapo-customers-page h2,
    #sapo-customers-page h3,
    #sapo-customers-page p,
    #sapo-customers-page span,
    #sapo-customers-page strong,
    #sapo-customers-page small,
    #sapo-customers-page button,
    #sapo-customers-page input,
    #sapo-customers-page select,
    #sapo-customers-page table,
    #sapo-customers-page th,
    #sapo-customers-page td {
        font-family:
            var(--cup-font) !important;

        letter-spacing:
            normal !important;
    }

    #sapo-customers-page h1,
    #sapo-customers-page h2,
    #sapo-customers-page h3,
    #sapo-customers-page p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* =====================================================
       HEADER
       ===================================================== */

    #sapo-customers-page
    .cup-header {
        display: flex !important;

        width: 100% !important;

        align-items:
            flex-start !important;

        justify-content:
            space-between !important;

        flex-wrap: wrap !important;

        gap: 16px !important;

        padding:
            20px
            24px !important;

        background:
            var(--cup-white) !important;

        border:
            1px solid
            var(--cup-border) !important;

        border-radius:
            10px !important;
    }

    #sapo-customers-page
    .cup-header-copy {
        display: flex !important;

        min-width: 0 !important;

        flex:
            1 1 420px !important;

        flex-direction:
            column !important;

        gap: 4px !important;
    }

    #sapo-customers-page
    .cup-kicker {
        display: inline-block !important;

        margin-bottom:
            6px !important;

        color:
            var(--cup-green-700) !important;

        font-size:
            12px !important;

        font-weight:
            600 !important;

        letter-spacing:
            0.04em !important;

        text-transform:
            uppercase !important;

        background:
            transparent !important;
    }

    #sapo-customers-page
    .cup-header h2 {
        margin-bottom:
            4px !important;

        color:
            var(--cup-text) !important;

        font-size:
            22px !important;

        font-weight:
            700 !important;

        line-height:
            1.3 !important;
    }

    #sapo-customers-page
    .cup-header p {
        color:
            var(--cup-muted) !important;

        font-size:
            13.5px !important;

        line-height:
            1.5 !important;
    }

    /* =====================================================
       ALERTS
       ===================================================== */

    #sapo-customers-page
    .cup-alert {
        display: flex !important;

        width: 100% !important;

        align-items:
            center !important;

        gap: 8px !important;

        padding:
            12px
            16px !important;

        font-size:
            13.5px !important;

        font-weight:
            500 !important;

        border-radius:
            8px !important;
    }

    #sapo-customers-page
    .cup-alert-success {
        color:
            var(--cup-green-700) !important;

        background:
            var(--cup-green-50) !important;

        border:
            1px solid
            #bbf7d0 !important;
    }

    #sapo-customers-page
    .cup-alert-error {
        color:
            #b91c1c !important;

        background:
            var(--cup-red-light) !important;

        border:
            1px solid
            #fecaca !important;
    }

    /* =====================================================
       BUTTONS
       ===================================================== */

    #sapo-customers-page
    .cup-button {
        display: inline-flex !important;

        min-height:
            36px !important;

        align-items:
            center !important;

        justify-content:
            center !important;

        gap: 6px !important;

        padding:
            7px
            13px !important;

        color:
            var(--cup-text-secondary) !important;

        font-size:
            13px !important;

        font-weight:
            600 !important;

        line-height:
            1.2 !important;

        appearance:
            none !important;

        border-radius:
            6px !important;

        cursor:
            pointer !important;

        white-space:
            nowrap !important;

        transition:
            background-color
            0.15s ease,
            border-color
            0.15s ease,
            color
            0.15s ease !important;
    }

    #sapo-customers-page
    .cup-primary-button {
        color:
            #ffffff !important;

        background:
            var(--cup-green-700) !important;

        border:
            1px solid
            var(--cup-green-700) !important;
    }

    #sapo-customers-page
    .cup-primary-button:hover:not(:disabled) {
        background:
            var(--cup-green-800) !important;

        border-color:
            var(--cup-green-800) !important;
    }

    #sapo-customers-page
    .cup-secondary-button {
        color:
            #374151 !important;

        background:
            var(--cup-white) !important;

        border:
            1px solid
            var(--cup-border-strong) !important;
    }

    #sapo-customers-page
    .cup-secondary-button:hover:not(:disabled) {
        background:
            var(--cup-bg) !important;

        border-color:
            #9ca3af !important;
    }

    #sapo-customers-page
    .cup-view-button {
        color:
            var(--cup-blue) !important;

        background:
            var(--cup-blue-light) !important;

        border:
            1px solid
            #bfdbfe !important;
    }

    #sapo-customers-page
    .cup-view-button:hover:not(:disabled) {
        color:
            #ffffff !important;

        background:
            var(--cup-blue) !important;

        border-color:
            var(--cup-blue) !important;
    }

    #sapo-customers-page
    .cup-danger-button {
        color:
            var(--cup-red) !important;

        background:
            var(--cup-red-light) !important;

        border:
            1px solid
            #fecaca !important;
    }

    #sapo-customers-page
    .cup-danger-button:hover:not(:disabled) {
        color:
            #ffffff !important;

        background:
            var(--cup-red) !important;

        border-color:
            var(--cup-red) !important;
    }

    #sapo-customers-page
    button:disabled {
        opacity:
            0.55 !important;

        cursor:
            not-allowed !important;
    }

    /* =====================================================
       CONTENT CARD
       ===================================================== */

    #sapo-customers-page
    .cup-content-card {
        display: flex !important;

        width: 100% !important;
        min-width: 0 !important;

        flex-direction:
            column !important;

        gap: 16px !important;

        padding:
            20px !important;

        background:
            var(--cup-white) !important;

        border:
            1px solid
            var(--cup-border) !important;

        border-radius:
            10px !important;
    }

    /* =====================================================
       TOOLBAR
       ===================================================== */

    #sapo-customers-page
    .cup-toolbar {
        display: flex !important;

        width: 100% !important;

        flex-wrap: wrap !important;

        align-items:
            center !important;

        gap: 12px !important;
    }

    #sapo-customers-page
    .cup-toolbar
    input[type="search"] {
        flex:
            1 1 260px !important;

        min-width:
            220px !important;

        height:
            38px !important;

        padding:
            0
            14px !important;

        color:
            var(--cup-text-secondary) !important;

        font-size:
            13.5px !important;

        background:
            var(--cup-bg) !important;

        border:
            1px solid
            var(--cup-border-strong) !important;

        border-radius:
            8px !important;

        outline:
            none !important;

        transition:
            border-color
            0.15s ease,
            box-shadow
            0.15s ease,
            background
            0.15s ease !important;
    }

    #sapo-customers-page
    .cup-toolbar
    input[type="search"]::placeholder {
        color:
            #9ca3af !important;
    }

    #sapo-customers-page
    .cup-toolbar
    input[type="search"]:focus {
        background:
            var(--cup-white) !important;

        border-color:
            var(--cup-green-700) !important;

        box-shadow:
            0 0 0 3px
            rgba(
                22,
                163,
                74,
                0.12
            ) !important;
    }

    #sapo-customers-page
    .cup-toolbar select {
        min-width:
            160px !important;

        height:
            38px !important;

        padding:
            0
            14px !important;

        color:
            var(--cup-text-secondary) !important;

        font-size:
            13.5px !important;

        background:
            var(--cup-bg) !important;

        border:
            1px solid
            var(--cup-border-strong) !important;

        border-radius:
            8px !important;

        outline:
            none !important;

        cursor:
            pointer !important;
    }

    #sapo-customers-page
    .cup-toolbar select:focus {
        background:
            var(--cup-white) !important;

        border-color:
            var(--cup-green-700) !important;

        box-shadow:
            0 0 0 3px
            rgba(
                22,
                163,
                74,
                0.12
            ) !important;
    }

    /* =====================================================
       TABLE CONTAINER

       IMPORTANT:
       Vertical scrolling is allowed.
       Horizontal scrolling is disabled.
       ===================================================== */

    #sapo-customers-page
    .cup-table-container {
        display: block !important;

        width: 100% !important;
        min-width: 0 !important;

        max-height:
            520px !important;

        overflow-x:
            hidden !important;

        overflow-y:
            auto !important;

        background:
            var(--cup-white) !important;

        border:
            1px solid
            var(--cup-border) !important;

        border-radius:
            8px !important;

        scrollbar-width:
            thin !important;

        scrollbar-color:
            var(--cup-border-strong)
            transparent !important;
    }

    #sapo-customers-page
    .cup-table-container::-webkit-scrollbar {
        width:
            8px !important;
    }

    #sapo-customers-page
    .cup-table-container::-webkit-scrollbar-track {
        background:
            transparent !important;
    }

    #sapo-customers-page
    .cup-table-container::-webkit-scrollbar-thumb {
        background:
            var(--cup-border-strong) !important;

        border-radius:
            8px !important;
    }

    #sapo-customers-page
    .cup-table-container::-webkit-scrollbar-thumb:hover {
        background:
            #9ca3af !important;
    }

    /* =====================================================
       TABLE
       ===================================================== */

    #sapo-customers-page
    .cup-table {
        width:
            100% !important;

        min-width:
            0 !important;

        max-width:
            100% !important;

        table-layout:
            fixed !important;

        border-collapse:
            collapse !important;

        color:
            var(--cup-text-secondary) !important;

        font-size:
            13px !important;

        background:
            var(--cup-white) !important;
    }

    #sapo-customers-page
    .cup-table thead {
        position:
            sticky !important;

        top:
            0 !important;

        z-index:
            2 !important;
    }

    #sapo-customers-page
    .cup-table
    thead th {
        padding:
            12px
            10px !important;

        color:
            var(--cup-muted) !important;

        font-size:
            11px !important;

        font-weight:
            650 !important;

        line-height:
            1.25 !important;

        text-align:
            left !important;

        text-transform:
            uppercase !important;

        background:
            #f9fafb !important;

        border-bottom:
            1px solid
            var(--cup-border) !important;

        white-space:
            normal !important;

        overflow-wrap:
            anywhere !important;
    }

    #sapo-customers-page
    .cup-table
    tbody td {
        padding:
            13px
            10px !important;

        color:
            var(--cup-text-secondary) !important;

        font-size:
            12.5px !important;

        vertical-align:
            middle !important;

        background:
            var(--cup-white) !important;

        border-bottom:
            1px solid
            #f1f5f9 !important;

        white-space:
            normal !important;

        overflow-wrap:
            anywhere !important;
    }

    #sapo-customers-page
    .cup-table
    tbody tr:last-child td {
        border-bottom:
            none !important;
    }

    #sapo-customers-page
    .cup-table
    tbody tr:hover td {
        background:
            #f9fafb !important;
    }

    /* ---------- Column sizing ---------- */

    #sapo-customers-page
    .cup-col-customer {
        width:
            17% !important;
    }

    #sapo-customers-page
    .cup-col-mobile {
        width:
            11% !important;
    }

    #sapo-customers-page
    .cup-col-type {
        width:
            9% !important;
    }

    #sapo-customers-page
    .cup-col-money {
        width:
            13% !important;
    }

    #sapo-customers-page
    .cup-col-small {
        width:
            6% !important;

        text-align:
            center !important;
    }

    #sapo-customers-page
    .cup-col-status {
        width:
            9% !important;
    }

    #sapo-customers-page
    .cup-col-actions {
        width:
            22% !important;
    }

    /* =====================================================
       CUSTOMER CELL
       ===================================================== */

    #sapo-customers-page
    .cup-customer-cell {
        display: flex !important;

        min-width:
            0 !important;

        flex-direction:
            column !important;

        gap: 2px !important;
    }

    #sapo-customers-page
    .cup-customer-name {
        display: block !important;

        overflow:
            hidden !important;

        color:
            var(--cup-text) !important;

        font-size:
            13px !important;

        font-weight:
            600 !important;

        line-height:
            1.3 !important;

        text-overflow:
            ellipsis !important;

        white-space:
            nowrap !important;
    }

    #sapo-customers-page
    .cup-customer-code {
        display: block !important;

        overflow:
            hidden !important;

        color:
            #9ca3af !important;

        font-size:
            11.5px !important;

        line-height:
            1.3 !important;

        text-overflow:
            ellipsis !important;

        white-space:
            nowrap !important;
    }

    /* =====================================================
       MONEY
       ===================================================== */

    #sapo-customers-page
    .cup-money-value {
        display:
            inline-block !important;

        font-variant-numeric:
            tabular-nums !important;

        white-space:
            nowrap !important;
    }

    #sapo-customers-page
    .cup-due-value {
        color:
            var(--cup-red) !important;

        font-weight:
            700 !important;
    }

    /* =====================================================
       TYPE BADGE
       ===================================================== */

    #sapo-customers-page
    .cup-type-badge {
        display:
            inline-flex !important;

        min-height:
            24px !important;

        align-items:
            center !important;

        justify-content:
            center !important;

        padding:
            4px
            9px !important;

        color:
            var(--cup-slate) !important;

        font-size:
            11.5px !important;

        font-weight:
            600 !important;

        text-transform:
            capitalize !important;

        white-space:
            nowrap !important;

        background:
            var(--cup-slate-light) !important;

        border-radius:
            999px !important;
    }

    /* =====================================================
       STATUS BADGES
       ===================================================== */

    #sapo-customers-page
    .cup-status-badge {
        display:
            inline-flex !important;

        min-height:
            24px !important;

        align-items:
            center !important;

        justify-content:
            center !important;

        padding:
            4px
            9px !important;

        font-size:
            11.5px !important;

        font-weight:
            600 !important;

        white-space:
            nowrap !important;

        border-radius:
            999px !important;
    }

    #sapo-customers-page
    .cup-status-active {
        color:
            var(--cup-green-800) !important;

        background:
            var(--cup-green-100) !important;
    }

    #sapo-customers-page
    .cup-status-inactive {
        color:
            var(--cup-muted) !important;

        background:
            #f1f5f9 !important;
    }

    /* =====================================================
       ACTION BUTTONS
       ===================================================== */

    #sapo-customers-page
    .cup-table-actions {
        display: flex !important;

        width:
            100% !important;

        min-width:
            0 !important;

        align-items:
            center !important;

        flex-wrap:
            wrap !important;

        gap:
            5px !important;
    }

    #sapo-customers-page
    .cup-action-button {
        min-width:
            54px !important;

        min-height:
            30px !important;

        padding:
            5px
            8px !important;

        font-size:
            11.5px !important;
    }

    /* =====================================================
       TABLE STATES
       ===================================================== */

    #sapo-customers-page
    .cup-table-state {
        padding:
            40px
            16px !important;

        color:
            #9ca3af !important;

        font-size:
            13.5px !important;

        text-align:
            center !important;

        white-space:
            normal !important;

        background:
            var(--cup-white) !important;
    }

    /* =====================================================
       PAGINATION
       ===================================================== */

    #sapo-customers-page
    .cup-pagination {
        display: flex !important;

        align-items:
            center !important;

        justify-content:
            center !important;

        gap:
            16px !important;

        padding-top:
            4px !important;
    }

    #sapo-customers-page
    .cup-pagination span {
        color:
            var(--cup-muted) !important;

        font-size:
            13px !important;

        font-weight:
            500 !important;

        background:
            transparent !important;
    }

    #sapo-customers-page
    .cup-pagination-button {
        min-width:
            90px !important;

        padding:
            7px
            16px !important;

        color:
            #374151 !important;

        font-size:
            13px !important;

        font-weight:
            600 !important;

        background:
            var(--cup-white) !important;

        border:
            1px solid
            var(--cup-border-strong) !important;

        border-radius:
            6px !important;

        cursor:
            pointer !important;
    }

    #sapo-customers-page
    .cup-pagination-button:hover:not(:disabled) {
        background:
            #f9fafb !important;

        border-color:
            #9ca3af !important;
    }

    #sapo-customers-page
    .cup-pagination-button:disabled {
        opacity:
            0.5 !important;

        cursor:
            not-allowed !important;
    }

    /* =====================================================
       RESPONSIVE
       ===================================================== */

    @media (
        max-width: 1050px
    ) {
        #sapo-customers-page
        .cup-table
        thead th {
            padding:
                10px
                7px !important;

            font-size:
                10px !important;
        }

        #sapo-customers-page
        .cup-table
        tbody td {
            padding:
                11px
                7px !important;

            font-size:
                11.5px !important;
        }

        #sapo-customers-page
        .cup-action-button {
            min-width:
                48px !important;

            padding:
                5px
                6px !important;

            font-size:
                10.5px !important;
        }
    }

    /*
     * On smaller screens the table becomes
     * stacked customer cards instead of
     * introducing horizontal scrolling.
     */

    @media (
        max-width: 850px
    ) {
        #sapo-customers-page
        .cup-header {
            flex-direction:
                column !important;

            align-items:
                stretch !important;
        }

        #sapo-customers-page
        .cup-header
        .cup-primary-button {
            width:
                100% !important;
        }

        #sapo-customers-page
        .cup-toolbar {
            flex-direction:
                column !important;
        }

        #sapo-customers-page
        .cup-toolbar
        input[type="search"],
        #sapo-customers-page
        .cup-toolbar select {
            width:
                100% !important;

            min-width:
                0 !important;
        }

        #sapo-customers-page
        .cup-table-container {
            max-height:
                none !important;

            overflow:
                visible !important;

            background:
                var(--cup-bg) !important;

            border:
                none !important;
        }

        #sapo-customers-page
        .cup-table,
        #sapo-customers-page
        .cup-table tbody,
        #sapo-customers-page
        .cup-table tr,
        #sapo-customers-page
        .cup-table td {
            display:
                block !important;

            width:
                100% !important;
        }

        #sapo-customers-page
        .cup-table thead {
            display:
                none !important;
        }

        #sapo-customers-page
        .cup-table tbody {
            display:
                flex !important;

            flex-direction:
                column !important;

            gap:
                12px !important;
        }

        #sapo-customers-page
        .cup-table tbody tr {
            overflow:
                hidden !important;

            background:
                var(--cup-white) !important;

            border:
                1px solid
                var(--cup-border) !important;

            border-radius:
                8px !important;
        }

        #sapo-customers-page
        .cup-table
        tbody td {
            display:
                grid !important;

            width:
                100% !important;

            grid-template-columns:
                140px
                minmax(
                    0,
                    1fr
                ) !important;

            align-items:
                center !important;

            gap:
                12px !important;

            min-height:
                44px !important;

            padding:
                10px
                14px !important;

            border-bottom:
                1px solid
                var(--cup-border) !important;
        }

        #sapo-customers-page
        .cup-table
        tbody td:last-child {
            border-bottom:
                none !important;
        }

        #sapo-customers-page
        .cup-table
        tbody td::before {
            content:
                attr(
                    data-label
                ) !important;

            color:
                var(--cup-muted) !important;

            font-size:
                11px !important;

            font-weight:
                650 !important;

            text-transform:
                uppercase !important;
        }

        #sapo-customers-page
        .cup-table
        .cup-table-state {
            display:
                block !important;

            min-height:
                140px !important;

            padding:
                40px
                16px !important;

            text-align:
                center !important;
        }

        #sapo-customers-page
        .cup-table
        .cup-table-state::before {
            display:
                none !important;

            content:
                none !important;
        }

        #sapo-customers-page
        .cup-table-actions {
            justify-content:
                flex-start !important;
        }
    }

    @media (
        max-width: 640px
    ) {
        #sapo-customers-page {
            gap:
                16px !important;
        }

        #sapo-customers-page
        .cup-header {
            padding:
                16px !important;
        }

        #sapo-customers-page
        .cup-content-card {
            padding:
                14px !important;
        }

        #sapo-customers-page
        .cup-pagination {
            flex-direction:
                column !important;

            align-items:
                stretch !important;
        }

        #sapo-customers-page
        .cup-pagination-button {
            width:
                100% !important;
        }

        #sapo-customers-page
        .cup-pagination span {
            text-align:
                center !important;
        }
    }

    @media (
        max-width: 480px
    ) {
        #sapo-customers-page
        .cup-table
        tbody td {
            grid-template-columns:
                110px
                minmax(
                    0,
                    1fr
                ) !important;
        }

        #sapo-customers-page
        .cup-table-actions {
            display:
                grid !important;

            grid-template-columns:
                repeat(
                    2,
                    minmax(
                        0,
                        1fr
                    )
                ) !important;
        }

        #sapo-customers-page
        .cup-action-button {
            width:
                100% !important;
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
    ] =
        useState<
            Customer[]
        >(
            [],
        );

    const [
        searchInput,
        setSearchInput,
    ] =
        useState(
            '',
        );

    const [
        search,
        setSearch,
    ] =
        useState(
            '',
        );

    const [
        status,
        setStatus,
    ] =
        useState(
            '',
        );

    const [
        page,
        setPage,
    ] =
        useState(
            1,
        );

    const [
        lastPage,
        setLastPage,
    ] =
        useState(
            1,
        );

    const [
        isLoading,
        setIsLoading,
    ] =
        useState(
            true,
        );

    const [
        isSubmitting,
        setIsSubmitting,
    ] =
        useState(
            false,
        );

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState(
            '',
        );

    const [
        successMessage,
        setSuccessMessage,
    ] =
        useState(
            '',
        );

    const [
        formOpen,
        setFormOpen,
    ] =
        useState(
            false,
        );

    const [
        selectedCustomer,
        setSelectedCustomer,
    ] =
        useState<
            Customer
            | null
        >(
            null,
        );

    const [
        viewedCustomer,
        setViewedCustomer,
    ] =
        useState<
            Customer
            | null
        >(
            null,
        );

    const isAdmin =
        user?.role === 'admin';

    /* =====================================================
       LOAD CUSTOMERS
       ===================================================== */

    const loadCustomers =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(
                    true,
                );

                setErrorMessage(
                    '',
                );

                try {
                    const response =
                        await getCustomers(
                            token,
                            {
                                search,
                                status,
                                page,
                                perPage:
                                    20,
                            },
                        );

                    setCustomers(
                        response.data,
                    );

                    setLastPage(
                        Math.max(
                            1,
                            response
                                .meta
                                .last_page,
                        ),
                    );
                } catch (
                error
                ) {
                    setErrorMessage(
                        error
                            instanceof ApiError
                            ? error.message
                            : 'Unable to load customers.',
                    );
                } finally {
                    setIsLoading(
                        false,
                    );
                }
            },
            [
                token,
                search,
                status,
                page,
            ],
        );

    useEffect(
        () => {
            void loadCustomers();
        },
        [
            loadCustomers,
        ],
    );

    /* =====================================================
       SEARCH DEBOUNCE
       ===================================================== */

    useEffect(
        () => {
            const timeout =
                window.setTimeout(
                    () => {
                        setSearch(
                            searchInput
                                .trim(),
                        );

                        setPage(
                            1,
                        );
                    },
                    300,
                );

            return () => {
                window.clearTimeout(
                    timeout,
                );
            };
        },
        [
            searchInput,
        ],
    );

    /* =====================================================
       SUCCESS MESSAGE
       ===================================================== */

    useEffect(
        () => {
            if (
                !successMessage
            ) {
                return;
            }

            const timeout =
                window.setTimeout(
                    () => {
                        setSuccessMessage(
                            '',
                        );
                    },
                    3500,
                );

            return () => {
                window.clearTimeout(
                    timeout,
                );
            };
        },
        [
            successMessage,
        ],
    );

    /* =====================================================
       CREATE / UPDATE
       ===================================================== */

    const submitCustomer =
        async (
            values:
                CustomerInput,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setIsSubmitting(
                true,
            );

            setErrorMessage(
                '',
            );

            try {
                const response =
                    selectedCustomer
                        ? await updateCustomer(
                            token,
                            selectedCustomer
                                .id,
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

                setFormOpen(
                    false,
                );

                setSelectedCustomer(
                    null,
                );

                await loadCustomers();
            } catch (
            error
            ) {
                setErrorMessage(
                    error
                        instanceof ApiError
                        ? error.message
                        : 'Unable to save customer.',
                );
            } finally {
                setIsSubmitting(
                    false,
                );
            }
        };

    /* =====================================================
       DELETE
       ===================================================== */

    const removeCustomer =
        async (
            customer:
                Customer,
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

            if (
                !confirmed
            ) {
                return;
            }

            setErrorMessage(
                '',
            );

            try {
                const response =
                    await deleteCustomer(
                        token,
                        customer.id,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Customer deleted successfully.',
                );

                await loadCustomers();
            } catch (
            error
            ) {
                setErrorMessage(
                    error
                        instanceof ApiError
                        ? error.message
                        : 'Unable to delete customer.',
                );
            }
        };

    /* =====================================================
       RENDER
       ===================================================== */

    return (
        <div id="sapo-customers-page">
            <style>
                {customersPageStyles}
            </style>

            {/* =============================================
                HEADER
               ============================================= */}

            <section className="cup-header">
                <div className="cup-header-copy">
                    <span className="cup-kicker">
                        Customer Accounts
                    </span>

                    <h2>
                        Customers
                    </h2>

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

                        setErrorMessage(
                            '',
                        );

                        setFormOpen(
                            true,
                        );
                    }}
                >
                    Add Customer
                </button>
            </section>

            {/* =============================================
                ALERTS
               ============================================= */}

            {successMessage && (
                <div
                    className="cup-alert cup-alert-success"
                    role="status"
                >
                    {
                        successMessage
                    }
                </div>
            )}

            {errorMessage
                && !formOpen && (
                    <div
                        className="cup-alert cup-alert-error"
                        role="alert"
                    >
                        {
                            errorMessage
                        }
                    </div>
                )}

            {/* =============================================
                CUSTOMER TABLE CARD
               ============================================= */}

            <section className="cup-content-card">
                {/* TOOLBAR */}

                <div className="cup-toolbar">
                    <input
                        type="search"
                        value={
                            searchInput
                        }
                        placeholder="Search customer name, mobile or code..."
                        aria-label="Search customers"
                        onChange={(
                            event,
                        ) => {
                            setSearchInput(
                                event
                                    .target
                                    .value,
                            );
                        }}
                    />

                    <select
                        value={
                            status
                        }
                        aria-label="Filter by customer status"
                        onChange={(
                            event,
                        ) => {
                            setStatus(
                                event
                                    .target
                                    .value,
                            );

                            setPage(
                                1,
                            );
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

                {/* TABLE */}

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
                                    Action
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={
                                            8
                                        }
                                        className="cup-table-state"
                                    >
                                        Loading customers...
                                    </td>
                                </tr>
                            ) : customers
                                .length
                                === 0 ? (
                                <tr>
                                    <td
                                        colSpan={
                                            8
                                        }
                                        className="cup-table-state"
                                    >
                                        No customers found.
                                    </td>
                                </tr>
                            ) : (
                                customers.map(
                                    (
                                        customer,
                                    ) => (
                                        <tr
                                            key={
                                                customer
                                                    .id
                                            }
                                        >
                                            {/* CUSTOMER */}

                                            <td data-label="Customer">
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

                                            {/* MOBILE */}

                                            <td data-label="Mobile">
                                                {customer
                                                    .mobile
                                                    || '—'}
                                            </td>

                                            {/* TYPE */}

                                            <td data-label="Type">
                                                <span className="cup-type-badge">
                                                    {customer
                                                        .customer_type
                                                        === 'wholesale'
                                                        ? 'Wholesale'
                                                        : 'Retail'}
                                                </span>
                                            </td>

                                            {/* CREDIT LIMIT */}

                                            <td data-label="Credit Limit">
                                                <span className="cup-money-value">
                                                    {currencyFormatter.format(
                                                        Number(
                                                            customer
                                                                .credit_limit
                                                            ?? 0,
                                                        ),
                                                    )}
                                                </span>
                                            </td>

                                            {/* OUTSTANDING DUE */}

                                            <td data-label="Outstanding Due">
                                                <strong
                                                    className={
                                                        Number(
                                                            customer
                                                                .outstanding_due
                                                            ?? 0,
                                                        )
                                                            > 0
                                                            ? 'cup-due-value cup-money-value'
                                                            : 'cup-money-value'
                                                    }
                                                >
                                                    {currencyFormatter.format(
                                                        Number(
                                                            customer
                                                                .outstanding_due
                                                            ?? 0,
                                                        ),
                                                    )}
                                                </strong>
                                            </td>

                                            {/* SALES */}

                                            <td data-label="Sales">
                                                {
                                                    customer
                                                        .sales_count
                                                }
                                            </td>

                                            {/* STATUS */}

                                            <td data-label="Status">
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

                                            {/* ACTIONS */}

                                            <td data-label="Action">
                                                <div className="cup-table-actions">
                                                    <button
                                                        type="button"
                                                        className="cup-button cup-view-button cup-action-button"
                                                        onClick={() => {
                                                            setViewedCustomer(
                                                                customer,
                                                            );
                                                        }}
                                                    >
                                                        View
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="cup-button cup-secondary-button cup-action-button"
                                                        onClick={() => {
                                                            setSelectedCustomer(
                                                                customer,
                                                            );

                                                            setErrorMessage(
                                                                '',
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

                {/* PAGINATION */}

                <footer className="cup-pagination">
                    <button
                        type="button"
                        className="cup-pagination-button"
                        disabled={
                            page
                            <= 1
                        }
                        onClick={() => {
                            setPage(
                                (
                                    current,
                                ) =>
                                    Math.max(
                                        1,
                                        current
                                        - 1,
                                    ),
                            );
                        }}
                    >
                        Previous
                    </button>

                    <span>
                        Page
                        {' '}

                        <strong>
                            {
                                page
                            }
                        </strong>

                        {' '}
                        of
                        {' '}

                        <strong>
                            {
                                lastPage
                            }
                        </strong>
                    </span>

                    <button
                        type="button"
                        className="cup-pagination-button"
                        disabled={
                            page
                            >= lastPage
                        }
                        onClick={() => {
                            setPage(
                                (
                                    current,
                                ) =>
                                    Math.min(
                                        lastPage,
                                        current
                                        + 1,
                                    ),
                            );
                        }}
                    >
                        Next
                    </button>
                </footer>
            </section>

            {/* =============================================
                VIEW CUSTOMER
               ============================================= */}

            <CustomerViewModal
                customer={
                    viewedCustomer
                }
                isOpen={
                    viewedCustomer
                    !== null
                }
                onClose={() => {
                    setViewedCustomer(
                        null,
                    );
                }}
            />

            {/* =============================================
                ADD / EDIT CUSTOMER
               ============================================= */}

            <CustomerFormModal
                customer={
                    selectedCustomer
                }
                isOpen={
                    formOpen
                }
                isSubmitting={
                    isSubmitting
                }
                errorMessage={
                    formOpen
                        ? errorMessage
                        : ''
                }
                onClose={() => {
                    if (
                        !isSubmitting
                    ) {
                        setFormOpen(
                            false,
                        );

                        setSelectedCustomer(
                            null,
                        );

                        setErrorMessage(
                            '',
                        );
                    }
                }}
                onSubmit={(
                    values,
                ) => {
                    void submitCustomer(
                        values,
                    );
                }}
            />
        </div>
    );
}