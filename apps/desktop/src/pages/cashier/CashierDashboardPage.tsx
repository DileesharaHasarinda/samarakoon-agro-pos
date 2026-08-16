import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    getCashierDashboard,
} from '../../services/dashboardService';

import type {
    CashierDashboardData,
    DashboardDailyPoint,
} from '../../types/dashboard';

const BUSINESS_TIME_ZONE =
    'Asia/Colombo';

const currencyFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

function formatDateTime(
    value: string,
): string {
    const date =
        new Date(
            value,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone:
                BUSINESS_TIME_ZONE,
        },
    ).format(
        date,
    );
}

function paymentMethodName(
    value: string | null,
): string {
    switch (value) {
        case 'bank_transfer':
            return 'Bank Transfer';

        case 'card':
            return 'Card';

        case 'cash':
            return 'Cash';

        case 'cheque':
            return 'Cheque';

        default:
            return 'On Due';
    }
}

const CASHIER_DASHBOARD_STYLES = `
#agro-cashier-dashboard-page,
#agro-cashier-dashboard-page *,
#agro-cashier-dashboard-page *::before,
#agro-cashier-dashboard-page *::after {
    box-sizing: border-box !important;
}

#agro-cashier-dashboard-page {
    --agro-bg: #f5f6f8;
    --agro-surface: #ffffff;
    --agro-border: #e2e5ea;

    --agro-text-primary: #1a1d23;
    --agro-text-secondary: #5b6270;
    --agro-text-muted: #8b909c;

    --agro-accent: #2563eb;
    --agro-accent-hover: #1d4ed8;
    --agro-accent-soft: #eaf0fe;

    --agro-positive: #178a4c;
    --agro-positive-bg: #e6f6ee;

    --agro-negative: #c02b3b;
    --agro-negative-bg: #fbeaec;

    --agro-warning: #b06a00;
    --agro-warning-bg: #fdf1de;

    --agro-radius: 12px;

    --agro-shadow:
        0 1px 2px
        rgba(16, 24, 40, 0.04),
        0 1px 3px
        rgba(16, 24, 40, 0.06);

    width: 100% !important;
    min-width: 0 !important;

    min-height: 100% !important;
    height: auto !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: visible !important;

    color:
        var(--agro-text-primary) !important;

    background:
        var(--agro-bg) !important;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif !important;

    font-size: 15px !important;
    line-height: 1.5 !important;

    isolation: isolate !important;

    -webkit-font-smoothing:
        antialiased !important;
}

#agro-cashier-dashboard-page button {
    font: inherit !important;
    letter-spacing: normal !important;
    text-transform: none !important;
}

#agro-cashier-dashboard-page h1,
#agro-cashier-dashboard-page h2,
#agro-cashier-dashboard-page h3,
#agro-cashier-dashboard-page p {
    margin: 0 !important;
}

/* =========================================================
   PAGE
   ========================================================= */

#agro-cashier-dashboard-page .agro-page-inner {
    display: flex !important;

    width: 100% !important;
    max-width: 1440px !important;

    min-width: 0 !important;

    flex-direction: column !important;

    gap: 24px !important;

    margin: 0 auto !important;

    padding:
        28px
        30px
        48px !important;

    overflow: visible !important;
}

/* =========================================================
   PAGE HEADER
   ========================================================= */

#agro-cashier-dashboard-page .agro-header {
    position: relative !important;

    z-index: 1 !important;

    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;

    align-items: center !important;
    justify-content: space-between !important;

    flex-wrap: wrap !important;

    gap: 18px !important;

    margin: 0 !important;

    padding:
        0
        2px
        16px !important;

    background:
        var(--agro-bg) !important;

    border-bottom:
        1px solid
        var(--agro-border) !important;

    backdrop-filter: none !important;
}

#agro-cashier-dashboard-page .agro-header-copy {
    min-width: 0 !important;

    flex:
        1 1 420px !important;
}

#agro-cashier-dashboard-page .agro-kicker {
    display: inline-block !important;

    margin-bottom: 5px !important;

    color:
        var(--agro-accent) !important;

    font-size: 12px !important;
    font-weight: 750 !important;

    letter-spacing:
        0.055em !important;

    text-transform:
        uppercase !important;
}

#agro-cashier-dashboard-page .agro-header h1 {
    margin:
        0 0 5px !important;

    color:
        var(--agro-text-primary) !important;

    font-size: 27px !important;
    font-weight: 750 !important;

    line-height: 1.2 !important;

    letter-spacing:
        -0.02em !important;
}

#agro-cashier-dashboard-page .agro-header p {
    margin: 0 !important;

    color:
        var(--agro-text-secondary) !important;

    font-size: 14px !important;
    line-height: 1.5 !important;
}

#agro-cashier-dashboard-page .agro-refresh-button {
    display: inline-flex !important;

    min-height: 42px !important;

    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: center !important;

    gap: 8px !important;

    padding:
        9px
        17px !important;

    color:
        var(--agro-text-primary) !important;

    font-size: 14px !important;
    font-weight: 700 !important;

    background:
        var(--agro-surface) !important;

    border:
        1px solid
        var(--agro-border) !important;

    border-radius: 9px !important;

    box-shadow:
        var(--agro-shadow) !important;

    cursor: pointer !important;

    transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease !important;
}

#agro-cashier-dashboard-page
.agro-refresh-button:hover:not(:disabled) {
    color:
        var(--agro-accent) !important;

    background:
        var(--agro-accent-soft) !important;

    border-color:
        var(--agro-accent) !important;
}

#agro-cashier-dashboard-page
.agro-refresh-button:disabled {
    opacity: 0.58 !important;

    cursor:
        not-allowed !important;
}

#agro-cashier-dashboard-page
.agro-refresh-button:focus-visible,
#agro-cashier-dashboard-page
.agro-retry-button:focus-visible {
    outline: none !important;

    box-shadow:
        0 0 0 4px
        rgba(37, 99, 235, 0.14) !important;
}

/* =========================================================
   LOADING / ERROR
   ========================================================= */

#agro-cashier-dashboard-page .agro-state-screen {
    display: flex !important;

    width: 100% !important;

    min-height:
        calc(100vh - 160px) !important;

    align-items: center !important;
    justify-content: center !important;

    flex-direction: column !important;

    gap: 16px !important;

    padding: 30px !important;

    color:
        var(--agro-text-secondary) !important;

    font-size: 15px !important;

    text-align: center !important;
}

#agro-cashier-dashboard-page .agro-spinner {
    width: 30px !important;
    height: 30px !important;

    border:
        3px solid
        var(--agro-border) !important;

    border-top-color:
        var(--agro-accent) !important;

    border-radius: 50% !important;

    animation:
        agro-spin
        0.8s
        linear
        infinite !important;
}

@keyframes agro-spin {
    to {
        transform: rotate(360deg);
    }
}

#agro-cashier-dashboard-page .agro-alert {
    width: 100% !important;

    padding:
        13px
        16px !important;

    color:
        var(--agro-negative) !important;

    font-size: 14px !important;
    font-weight: 600 !important;

    background:
        var(--agro-negative-bg) !important;

    border:
        1px solid
        #f3c6cc !important;

    border-radius: 9px !important;
}

#agro-cashier-dashboard-page
.agro-state-screen
.agro-alert {
    width:
        min(
            620px,
            100%
        ) !important;
}

#agro-cashier-dashboard-page .agro-retry-button {
    min-height: 42px !important;

    padding:
        9px
        19px !important;

    color: #ffffff !important;

    font-size: 14px !important;
    font-weight: 700 !important;

    background:
        var(--agro-accent) !important;

    border: none !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#agro-cashier-dashboard-page .agro-retry-button:hover {
    background:
        var(--agro-accent-hover) !important;
}

/* =========================================================
   METRIC CARDS
   ========================================================= */

#agro-cashier-dashboard-page .agro-metric-grid {
    display: grid !important;

    width: 100% !important;
    min-width: 0 !important;

    grid-template-columns:
        repeat(
            auto-fit,
            minmax(
                220px,
                1fr
            )
        ) !important;

    gap: 15px !important;
}

#agro-cashier-dashboard-page .agro-metric-card {
    display: flex !important;

    min-width: 0 !important;
    min-height: 128px !important;

    flex-direction: column !important;
    justify-content: space-between !important;

    gap: 8px !important;

    padding:
        18px
        20px !important;

    background:
        var(--agro-surface) !important;

    border:
        1px solid
        var(--agro-border) !important;

    border-radius:
        var(--agro-radius) !important;

    box-shadow:
        var(--agro-shadow) !important;
}

#agro-cashier-dashboard-page .agro-metric-label {
    color:
        var(--agro-text-secondary) !important;

    font-size: 12px !important;
    font-weight: 750 !important;

    letter-spacing:
        0.045em !important;

    text-transform:
        uppercase !important;
}

#agro-cashier-dashboard-page .agro-metric-value {
    display: block !important;

    overflow: hidden !important;

    color:
        var(--agro-text-primary) !important;

    font-size: 23px !important;
    font-weight: 760 !important;

    line-height: 1.2 !important;

    letter-spacing:
        -0.015em !important;

    text-overflow: ellipsis !important;
}

#agro-cashier-dashboard-page .agro-metric-sub {
    color:
        var(--agro-text-muted) !important;

    font-size: 12px !important;
    line-height: 1.4 !important;
}

#agro-cashier-dashboard-page .agro-value-warning {
    color:
        var(--agro-warning) !important;
}

#agro-cashier-dashboard-page .agro-value-positive {
    color:
        var(--agro-positive) !important;
}

/* =========================================================
   TWO COLUMN LAYOUT
   ========================================================= */

#agro-cashier-dashboard-page .agro-two-column {
    display: grid !important;

    width: 100% !important;
    min-width: 0 !important;

    grid-template-columns:
        minmax(
            0,
            1.4fr
        )
        minmax(
            0,
            1fr
        ) !important;

    gap: 20px !important;
}

/* =========================================================
   CARDS
   ========================================================= */

#agro-cashier-dashboard-page .agro-card {
    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;

    flex-direction: column !important;

    gap: 16px !important;

    padding:
        21px
        23px !important;

    background:
        var(--agro-surface) !important;

    border:
        1px solid
        var(--agro-border) !important;

    border-radius:
        var(--agro-radius) !important;

    box-shadow:
        var(--agro-shadow) !important;
}

#agro-cashier-dashboard-page .agro-card-header {
    display: flex !important;

    min-width: 0 !important;

    align-items: flex-start !important;
    justify-content: space-between !important;

    gap: 12px !important;
}

#agro-cashier-dashboard-page .agro-card-header h2 {
    margin:
        2px 0 0 !important;

    color:
        var(--agro-text-primary) !important;

    font-size: 17px !important;
    font-weight: 730 !important;

    line-height: 1.3 !important;
}

/* =========================================================
   FINANCIAL CHART
   ========================================================= */

#agro-cashier-dashboard-page .agro-legend {
    display: flex !important;

    flex-wrap: wrap !important;

    gap:
        10px
        16px !important;

    color:
        var(--agro-text-secondary) !important;

    font-size: 12px !important;
}

#agro-cashier-dashboard-page .agro-legend span {
    display: inline-flex !important;

    align-items: center !important;

    gap: 6px !important;
}

#agro-cashier-dashboard-page .agro-legend-dot {
    display: inline-block !important;

    width: 9px !important;
    height: 9px !important;

    border-radius: 3px !important;
}

#agro-cashier-dashboard-page .agro-legend-sales {
    background: #2563eb !important;
}

#agro-cashier-dashboard-page .agro-legend-collections {
    background: #16a34a !important;
}

#agro-cashier-dashboard-page .agro-legend-returns {
    background: #d97706 !important;
}

#agro-cashier-dashboard-page .agro-chart {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    gap: 13px !important;
}

#agro-cashier-dashboard-page .agro-chart-row {
    display: grid !important;

    min-width: 0 !important;

    grid-template-columns:
        55px
        minmax(
            0,
            1fr
        )
        110px !important;

    align-items: center !important;

    gap: 12px !important;

    font-size: 13px !important;
}

#agro-cashier-dashboard-page
.agro-chart-row > span {
    color:
        var(--agro-text-secondary) !important;

    font-weight: 650 !important;
}

#agro-cashier-dashboard-page
.agro-chart-row > strong {
    color:
        var(--agro-text-primary) !important;

    font-size: 13px !important;
    font-weight: 700 !important;

    text-align: right !important;

    white-space: nowrap !important;
}

#agro-cashier-dashboard-page .agro-chart-bars {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    gap: 3px !important;
}

#agro-cashier-dashboard-page .agro-bar {
    min-width: 2px !important;
    max-width: 100% !important;

    height: 6px !important;

    border-radius: 3px !important;

    background:
        var(--agro-border) !important;

    transition:
        width
        0.25s
        ease !important;
}

#agro-cashier-dashboard-page .agro-bar-sales {
    background: #2563eb !important;
}

#agro-cashier-dashboard-page .agro-bar-collections {
    background: #16a34a !important;
}

#agro-cashier-dashboard-page .agro-bar-returns {
    background: #d97706 !important;
}

/* =========================================================
   PAYMENT COLLECTIONS
   ========================================================= */

#agro-cashier-dashboard-page .agro-payment-list {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    gap: 9px !important;
}

#agro-cashier-dashboard-page .agro-payment-row {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;
    justify-content: space-between !important;

    gap: 12px !important;

    padding:
        11px
        13px !important;

    background:
        var(--agro-bg) !important;

    border:
        1px solid
        var(--agro-border) !important;

    border-radius: 8px !important;
}

#agro-cashier-dashboard-page
.agro-payment-row
strong.agro-payment-name {
    display: block !important;

    color:
        var(--agro-text-primary) !important;

    font-size: 14px !important;
    font-weight: 700 !important;
}

#agro-cashier-dashboard-page
.agro-payment-row
span.agro-payment-count {
    color:
        var(--agro-text-muted) !important;

    font-size: 12px !important;
}

#agro-cashier-dashboard-page
.agro-payment-row
> strong:last-child {
    flex: 0 0 auto !important;

    color:
        var(--agro-text-primary) !important;

    font-size: 14px !important;
    font-weight: 720 !important;

    white-space: nowrap !important;
}

/* =========================================================
   TABLES
   ========================================================= */

#agro-cashier-dashboard-page .agro-table-scroll {
    width: 100% !important;
    min-width: 0 !important;

    overflow-x: auto !important;
    overflow-y: hidden !important;

    border:
        1px solid
        var(--agro-border) !important;

    border-radius: 9px !important;

    scrollbar-width: thin !important;

    scrollbar-color:
        #b5bdc8
        #eef0f3 !important;
}

#agro-cashier-dashboard-page
.agro-table-scroll::-webkit-scrollbar {
    height: 7px !important;
}

#agro-cashier-dashboard-page
.agro-table-scroll::-webkit-scrollbar-track {
    background: #eef0f3 !important;
}

#agro-cashier-dashboard-page
.agro-table-scroll::-webkit-scrollbar-thumb {
    background: #b5bdc8 !important;

    border-radius: 10px !important;
}

#agro-cashier-dashboard-page table.agro-table {
    width: 100% !important;

    min-width: 650px !important;

    border-collapse: collapse !important;

    color:
        var(--agro-text-primary) !important;

    font-size: 13px !important;
}

#agro-cashier-dashboard-page
table.agro-table
thead th {
    padding:
        11px
        14px !important;

    color:
        var(--agro-text-secondary) !important;

    font-size: 11px !important;
    font-weight: 750 !important;

    letter-spacing:
        0.04em !important;

    text-align: left !important;

    text-transform:
        uppercase !important;

    white-space: nowrap !important;

    background:
        var(--agro-bg) !important;

    border-bottom:
        1px solid
        var(--agro-border) !important;
}

#agro-cashier-dashboard-page
table.agro-table
tbody td {
    padding:
        12px
        14px !important;

    color:
        var(--agro-text-primary) !important;

    vertical-align: middle !important;

    border-bottom:
        1px solid
        var(--agro-border) !important;
}

#agro-cashier-dashboard-page
table.agro-table
tbody tr:last-child td {
    border-bottom: none !important;
}

#agro-cashier-dashboard-page
table.agro-table
tbody tr:hover {
    background:
        var(--agro-accent-soft) !important;
}

#agro-cashier-dashboard-page
table.agro-table strong {
    font-weight: 700 !important;
}

#agro-cashier-dashboard-page .agro-table-empty {
    padding:
        27px
        16px !important;

    color:
        var(--agro-text-muted) !important;

    font-size: 13px !important;

    text-align: center !important;
}

/* =========================================================
   BADGES
   ========================================================= */

#agro-cashier-dashboard-page .agro-badge {
    display: inline-flex !important;

    min-height: 25px !important;

    align-items: center !important;
    justify-content: center !important;

    padding:
        3px
        9px !important;

    font-size: 11px !important;
    font-weight: 750 !important;

    white-space: nowrap !important;

    border-radius: 999px !important;
}

#agro-cashier-dashboard-page .agro-badge-positive {
    color:
        var(--agro-positive) !important;

    background:
        var(--agro-positive-bg) !important;
}

#agro-cashier-dashboard-page .agro-badge-warning {
    color:
        var(--agro-warning) !important;

    background:
        var(--agro-warning-bg) !important;
}

/* =========================================================
   RESPONSIVE
   ========================================================= */

@media (
    max-width: 1100px
) {
    #agro-cashier-dashboard-page .agro-page-inner {
        padding:
            24px
            24px
            42px !important;
    }

    #agro-cashier-dashboard-page .agro-metric-grid {
        grid-template-columns:
            repeat(
                3,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }
}

@media (
    max-width: 960px
) {
    #agro-cashier-dashboard-page .agro-two-column {
        grid-template-columns:
            minmax(
                0,
                1fr
            ) !important;
    }

    #agro-cashier-dashboard-page .agro-metric-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }
}

@media (
    max-width: 700px
) {
    #agro-cashier-dashboard-page .agro-page-inner {
        gap: 18px !important;

        padding:
            18px
            14px
            32px !important;
    }

    #agro-cashier-dashboard-page .agro-header {
        align-items: stretch !important;

        padding:
            0
            0
            14px !important;
    }

    #agro-cashier-dashboard-page .agro-header h1 {
        font-size: 23px !important;
    }

    #agro-cashier-dashboard-page .agro-refresh-button {
        width: 100% !important;
    }

    #agro-cashier-dashboard-page .agro-metric-grid {
        grid-template-columns:
            minmax(
                0,
                1fr
            ) !important;
    }

    #agro-cashier-dashboard-page .agro-metric-card {
        min-height: 112px !important;
    }

    #agro-cashier-dashboard-page .agro-card {
        padding:
            17px
            15px !important;
    }

    #agro-cashier-dashboard-page .agro-chart-row {
        grid-template-columns:
            45px
            minmax(
                0,
                1fr
            ) !important;
    }

    #agro-cashier-dashboard-page
    .agro-chart-row
    > strong {
        grid-column: 2 !important;

        text-align: left !important;
    }

    #agro-cashier-dashboard-page .agro-payment-row {
        align-items: stretch !important;

        flex-direction: column !important;
    }
}

@media (
    prefers-reduced-motion:
        reduce
) {
    #agro-cashier-dashboard-page *,
    #agro-cashier-dashboard-page *::before,
    #agro-cashier-dashboard-page *::after {
        transition: none !important;

        animation-duration:
            0.01ms !important;

        scroll-behavior:
            auto !important;
    }
}
`;

export default function CashierDashboardPage() {
    const {
        token,
        user,
    } = useAuth();

    const [
        dashboard,
        setDashboard,
    ] =
        useState<
            CashierDashboardData
            | null
        >(
            null,
        );

    const [
        isLoading,
        setIsLoading,
    ] =
        useState(
            true,
        );

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState(
            '',
        );

    const loadDashboard =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    setIsLoading(
                        false,
                    );

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
                        await getCashierDashboard(
                            token,
                        );

                    setDashboard(
                        response.data,
                    );
                } catch (
                error
                ) {
                    setErrorMessage(
                        error
                            instanceof ApiError
                            ? error.message
                            : 'Unable to load your dashboard.',
                    );
                } finally {
                    setIsLoading(
                        false,
                    );
                }
            },
            [
                token,
            ],
        );

    useEffect(
        () => {
            void loadDashboard();
        },
        [
            loadDashboard,
        ],
    );

    const chartMaximum =
        useMemo(
            () => {
                if (!dashboard) {
                    return 1;
                }

                return Math.max(
                    1,

                    ...dashboard
                        .daily_series
                        .flatMap(
                            (
                                point:
                                    DashboardDailyPoint,
                            ) => [
                                    Number(
                                        point.sales
                                        ?? 0,
                                    ),

                                    Number(
                                        point.collections
                                        ?? 0,
                                    ),

                                    Number(
                                        point.returns
                                        ?? 0,
                                    ),
                                ],
                        ),
                );
            },
            [
                dashboard,
            ],
        );

    if (
        isLoading
        && !dashboard
    ) {
        return (
            <div id="agro-cashier-dashboard-page">
                <style>
                    {CASHIER_DASHBOARD_STYLES}
                </style>

                <div className="agro-state-screen">
                    <div className="agro-spinner" />

                    <span>
                        Loading cashier dashboard...
                    </span>
                </div>
            </div>
        );
    }

    if (
        errorMessage
        && !dashboard
    ) {
        return (
            <div id="agro-cashier-dashboard-page">
                <style>
                    {CASHIER_DASHBOARD_STYLES}
                </style>

                <div className="agro-state-screen">
                    <div className="agro-alert">
                        {errorMessage}
                    </div>

                    <button
                        type="button"
                        className="agro-retry-button"
                        onClick={() => {
                            void loadDashboard();
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!dashboard) {
        return null;
    }

    const {
        summary,
    } = dashboard;

    return (
        <div id="agro-cashier-dashboard-page">
            <style>
                {CASHIER_DASHBOARD_STYLES}
            </style>

            <div className="agro-page-inner">
                {/* =========================================
                    HEADER
                   ========================================= */}

                <section className="agro-header">
                    <div className="agro-header-copy">
                        <span className="agro-kicker">
                            Cashier Overview
                        </span>

                        <h1>
                            Welcome,
                            {' '}
                            {user?.name ?? 'Cashier'}
                        </h1>

                        <p>
                            Review your sales,
                            collections, returns and
                            recent transaction activity.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="agro-refresh-button"
                        disabled={
                            isLoading
                        }
                        onClick={() => {
                            void loadDashboard();
                        }}
                    >
                        {isLoading
                            ? 'Refreshing...'
                            : 'Refresh Dashboard'}
                    </button>
                </section>

                {errorMessage && (
                    <div
                        className="agro-alert"
                        role="alert"
                    >
                        {errorMessage}
                    </div>
                )}

                {/* =========================================
                    METRICS
                   ========================================= */}

                <section className="agro-metric-grid">
                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            My Sales Today
                        </span>

                        <strong className="agro-metric-value">
                            {currencyFormatter.format(
                                Number(
                                    summary
                                        .today_sales_total
                                    ?? 0,
                                ),
                            )}
                        </strong>

                        <span className="agro-metric-sub">
                            {summary
                                .today_sales_count}
                            {' '}
                            transactions
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            Collected Today
                        </span>

                        <strong className="agro-metric-value agro-value-positive">
                            {currencyFormatter.format(
                                Number(
                                    summary
                                        .today_collected_amount
                                    ?? 0,
                                ),
                            )}
                        </strong>

                        <span className="agro-metric-sub">
                            Sales and due collections
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            Current Due
                        </span>

                        <strong className="agro-metric-value agro-value-warning">
                            {currencyFormatter.format(
                                Number(
                                    summary
                                        .today_due_sales
                                    ?? 0,
                                ),
                            )}
                        </strong>

                        <span className="agro-metric-sub">
                            Remaining due from
                            today&apos;s sales
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            Returns Today
                        </span>

                        <strong className="agro-metric-value">
                            {summary
                                .today_return_count}
                        </strong>

                        <span className="agro-metric-sub">
                            {currencyFormatter.format(
                                Number(
                                    summary
                                        .today_return_refund
                                    ?? 0,
                                ),
                            )}
                            {' '}
                            refunded
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            Registered Customers
                        </span>

                        <strong className="agro-metric-value">
                            {summary
                                .today_registered_customers}
                        </strong>

                        <span className="agro-metric-sub">
                            Customer accounts
                            served today
                        </span>
                    </article>
                </section>

                {/* =========================================
                    ACTIVITY + COLLECTIONS
                   ========================================= */}

                <section className="agro-two-column">
                    <article className="agro-card">
                        <header className="agro-card-header">
                            <div>
                                <span className="agro-kicker">
                                    Last 7 Days
                                </span>

                                <h2>
                                    My Activity
                                </h2>
                            </div>
                        </header>

                        <div className="agro-legend">
                            <span>
                                <i className="agro-legend-dot agro-legend-sales" />
                                Sales
                            </span>

                            <span>
                                <i className="agro-legend-dot agro-legend-collections" />
                                Collections
                            </span>

                            <span>
                                <i className="agro-legend-dot agro-legend-returns" />
                                Returns
                            </span>
                        </div>

                        <div className="agro-chart">
                            {dashboard
                                .daily_series
                                .map(
                                    (
                                        point,
                                    ) => (
                                        <div
                                            className="agro-chart-row"
                                            key={
                                                point.date
                                            }
                                        >
                                            <span>
                                                {point.label}
                                            </span>

                                            <div className="agro-chart-bars">
                                                <div
                                                    className="agro-bar agro-bar-sales"
                                                    style={{
                                                        width:
                                                            `${(
                                                                Number(
                                                                    point.sales,
                                                                )
                                                                / chartMaximum
                                                            ) * 100}%`,
                                                    }}
                                                />

                                                <div
                                                    className="agro-bar agro-bar-collections"
                                                    style={{
                                                        width:
                                                            `${(
                                                                Number(
                                                                    point.collections,
                                                                )
                                                                / chartMaximum
                                                            ) * 100}%`,
                                                    }}
                                                />

                                                <div
                                                    className="agro-bar agro-bar-returns"
                                                    style={{
                                                        width:
                                                            `${(
                                                                Number(
                                                                    point.returns,
                                                                )
                                                                / chartMaximum
                                                            ) * 100}%`,
                                                    }}
                                                />
                                            </div>

                                            <strong>
                                                {currencyFormatter.format(
                                                    Number(
                                                        point.sales,
                                                    ),
                                                )}
                                            </strong>
                                        </div>
                                    ),
                                )}
                        </div>
                    </article>

                    <article className="agro-card">
                        <header className="agro-card-header">
                            <div>
                                <span className="agro-kicker">
                                    Today
                                </span>

                                <h2>
                                    My Collections
                                </h2>
                            </div>
                        </header>

                        <div className="agro-payment-list">
                            {dashboard
                                .payment_breakdown
                                .length
                                === 0 ? (
                                <div className="agro-table-empty">
                                    No payments collected today.
                                </div>
                            ) : (
                                dashboard
                                    .payment_breakdown
                                    .map(
                                        (
                                            payment,
                                        ) => (
                                            <div
                                                className="agro-payment-row"
                                                key={
                                                    payment
                                                        .payment_method
                                                    ?? 'due'
                                                }
                                            >
                                                <div>
                                                    <strong className="agro-payment-name">
                                                        {paymentMethodName(
                                                            payment
                                                                .payment_method,
                                                        )}
                                                    </strong>

                                                    <span className="agro-payment-count">
                                                        {payment
                                                            .transactions}
                                                        {' '}
                                                        transactions
                                                    </span>
                                                </div>

                                                <strong>
                                                    {currencyFormatter.format(
                                                        Number(
                                                            payment
                                                                .total
                                                            ?? 0,
                                                        ),
                                                    )}
                                                </strong>
                                            </div>
                                        ),
                                    )
                            )}
                        </div>
                    </article>
                </section>

                {/* =========================================
                    RECENT SALES
                   ========================================= */}

                <section className="agro-card">
                    <header className="agro-card-header">
                        <div>
                            <span className="agro-kicker">
                                Latest
                            </span>

                            <h2>
                                My Recent Sales
                            </h2>
                        </div>
                    </header>

                    <div className="agro-table-scroll">
                        <table className="agro-table">
                            <thead>
                                <tr>
                                    <th>
                                        Sale
                                    </th>

                                    <th>
                                        Date
                                    </th>

                                    <th>
                                        Customer
                                    </th>

                                    <th>
                                        Items
                                    </th>

                                    <th>
                                        Payment
                                    </th>

                                    <th>
                                        Total
                                    </th>

                                    <th>
                                        Due
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {dashboard
                                    .recent_sales
                                    .length
                                    === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={
                                                7
                                            }
                                            className="agro-table-empty"
                                        >
                                            You have not completed any sales.
                                        </td>
                                    </tr>
                                ) : (
                                    dashboard
                                        .recent_sales
                                        .map(
                                            (
                                                sale,
                                            ) => (
                                                <tr
                                                    key={
                                                        sale
                                                            .id
                                                    }
                                                >
                                                    <td>
                                                        <strong>
                                                            {sale
                                                                .sale_number}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        {formatDateTime(
                                                            sale
                                                                .sale_date,
                                                        )}
                                                    </td>

                                                    <td>
                                                        {sale
                                                            .customer
                                                            ?.name
                                                            ?? 'Walk-in Customer'}
                                                    </td>

                                                    <td>
                                                        {sale
                                                            .items_count}
                                                    </td>

                                                    <td>
                                                        <span className="agro-badge agro-badge-positive">
                                                            {paymentMethodName(
                                                                sale
                                                                    .payment_method,
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <strong>
                                                            {currencyFormatter.format(
                                                                Number(
                                                                    sale
                                                                        .grand_total
                                                                    ?? 0,
                                                                ),
                                                            )}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        {sale
                                                            .due_amount
                                                            > 0 ? (
                                                            <span className="agro-badge agro-badge-warning">
                                                                {currencyFormatter.format(
                                                                    Number(
                                                                        sale
                                                                            .due_amount
                                                                        ?? 0,
                                                                    ),
                                                                )}
                                                            </span>
                                                        ) : (
                                                            currencyFormatter.format(
                                                                Number(
                                                                    sale
                                                                        .due_amount
                                                                    ?? 0,
                                                                ),
                                                            )
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}
