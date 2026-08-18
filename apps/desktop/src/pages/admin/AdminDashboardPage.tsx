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
    getAdminDashboard,
} from '../../services/dashboardService';

import {
    getCheques,
} from '../../services/chequeService';

import type {
    AdminDashboardData,
    DashboardDailyPoint,
} from '../../types/dashboard';

import type {
    Cheque,
} from '../../types/cheque';

/* =========================================================
   FORMATTERS
   ========================================================= */

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

function toDateOnly(
    value: string,
): string {
    const match =
        value.match(
            /^(\d{4}-\d{2}-\d{2})/,
        );

    return match
        ? match[1]
        : value;
}

function formatDate(
    value: string,
): string {
    const dateOnly =
        toDateOnly(
            value,
        );

    const date =
        new Date(
            `${dateOnly}T00:00:00+05:30`,
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
            timeZone:
                BUSINESS_TIME_ZONE,
        },
    ).format(
        date,
    );
}

function sriLankaDateKey(
    date: Date,
): string {
    const parts =
        new Intl.DateTimeFormat(
            'en-CA',
            {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                timeZone:
                    BUSINESS_TIME_ZONE,
            },
        ).formatToParts(
            date,
        );

    const year =
        parts.find(
            (
                part,
            ) =>
                part.type
                === 'year',
        )?.value;

    const month =
        parts.find(
            (
                part,
            ) =>
                part.type
                === 'month',
        )?.value;

    const day =
        parts.find(
            (
                part,
            ) =>
                part.type
                === 'day',
        )?.value;

    if (
        !year
        || !month
        || !day
    ) {
        return '';
    }

    return `${year}-${month}-${day}`;
}

function relativeDateKey(
    offsetDays: number,
): string {
    /*
     * Start from Sri Lanka's current calendar
     * date, not the computer's local timezone.
     *
     * Noon UTC is intentionally used as a stable
     * anchor before shifting calendar days.
     */
    const todayKey =
        sriLankaDateKey(
            new Date(),
        );

    const match =
        todayKey.match(
            /^(\d{4})-(\d{2})-(\d{2})$/,
        );

    if (!match) {
        return todayKey;
    }

    const anchor =
        new Date(
            Date.UTC(
                Number(
                    match[1],
                ),
                Number(
                    match[2],
                ) - 1,
                Number(
                    match[3],
                ) + offsetDays,
                12,
                0,
                0,
                0,
            ),
        );

    return sriLankaDateKey(
        anchor,
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

        case 'mixed':
            return 'Mixed Payment';

        case 'cheque':
            return 'Cheque';

        default:
            return 'On Due';
    }
}

function chequeTypeLabel(
    cheque: Cheque,
): string {
    return cheque.type === 'received'
        ? 'Receive'
        : 'Issue';
}

function chequeActionText(
    cheque: Cheque,
): string {
    return cheque.type === 'received'
        ? `Receive from ${cheque.party_name}`
        : `Issue to ${cheque.party_name}`;
}

/* =========================================================
   CHEQUE REMINDER TYPES
   ========================================================= */

type ChequeReminderPeriod =
    | 'yesterday'
    | 'today'
    | 'tomorrow';

interface ChequeReminderGroup {
    key:
    ChequeReminderPeriod;

    title: string;

    description: string;

    dateKey: string;

    toneClass: string;

    emptyMessage: string;

    items: Cheque[];
}

/* =========================================================
   STYLES
   ========================================================= */

const DASHBOARD_STYLES = `
#agro-admin-dashboard-page,
#agro-admin-dashboard-page *,
#agro-admin-dashboard-page *::before,
#agro-admin-dashboard-page *::after {
    box-sizing: border-box !important;
}

#agro-admin-dashboard-page {
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

    --agro-purple: #7c3aed;
    --agro-purple-bg: #f3e8ff;

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

#agro-admin-dashboard-page button {
    font: inherit !important;
    letter-spacing: normal !important;
    text-transform: none !important;
}

#agro-admin-dashboard-page h1,
#agro-admin-dashboard-page h2,
#agro-admin-dashboard-page h3,
#agro-admin-dashboard-page p {
    margin: 0 !important;
}

/* =========================================================
   PAGE
   ========================================================= */

#agro-admin-dashboard-page .agro-page-inner {
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

#agro-admin-dashboard-page .agro-header {
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

#agro-admin-dashboard-page .agro-header-copy {
    min-width: 0 !important;

    flex:
        1 1 420px !important;
}

#agro-admin-dashboard-page .agro-kicker {
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

#agro-admin-dashboard-page .agro-header h1 {
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

#agro-admin-dashboard-page .agro-header p {
    margin: 0 !important;

    color:
        var(--agro-text-secondary) !important;

    font-size: 14px !important;
    line-height: 1.5 !important;
}

#agro-admin-dashboard-page .agro-refresh-button {
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

#agro-admin-dashboard-page
.agro-refresh-button:hover:not(:disabled) {
    color:
        var(--agro-accent) !important;

    background:
        var(--agro-accent-soft) !important;

    border-color:
        var(--agro-accent) !important;
}

#agro-admin-dashboard-page
.agro-refresh-button:disabled {
    opacity: 0.58 !important;

    cursor:
        not-allowed !important;
}

#agro-admin-dashboard-page
.agro-refresh-button:focus-visible,
#agro-admin-dashboard-page
.agro-retry-button:focus-visible {
    outline: none !important;

    box-shadow:
        0 0 0 4px
        rgba(37, 99, 235, 0.14) !important;
}

/* =========================================================
   LOADING / ERROR
   ========================================================= */

#agro-admin-dashboard-page .agro-state-screen {
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

#agro-admin-dashboard-page .agro-spinner {
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

#agro-admin-dashboard-page .agro-alert {
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

#agro-admin-dashboard-page
.agro-state-screen
.agro-alert {
    width:
        min(
            620px,
            100%
        ) !important;
}

#agro-admin-dashboard-page .agro-retry-button {
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

#agro-admin-dashboard-page .agro-retry-button:hover {
    background:
        var(--agro-accent-hover) !important;
}

/* =========================================================
   CHEQUE NOTIFICATIONS
   ========================================================= */

#agro-admin-dashboard-page .agro-cheque-reminders {
    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;

    flex-direction: column !important;

    gap: 14px !important;

    padding:
        18px
        19px !important;

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

#agro-admin-dashboard-page .agro-cheque-reminder-header {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;
    justify-content: space-between !important;

    gap: 14px !important;

    padding-bottom:
        13px !important;

    border-bottom:
        1px solid
        var(--agro-border) !important;
}

#agro-admin-dashboard-page .agro-cheque-reminder-heading {
    min-width: 0 !important;
}

#agro-admin-dashboard-page .agro-cheque-reminder-heading h2 {
    color:
        var(--agro-text-primary) !important;

    font-size: 18px !important;
    font-weight: 760 !important;

    line-height: 1.25 !important;
}

#agro-admin-dashboard-page .agro-cheque-reminder-heading p {
    margin-top:
        3px !important;

    color:
        var(--agro-text-muted) !important;

    font-size: 12px !important;
    line-height: 1.45 !important;
}

#agro-admin-dashboard-page .agro-cheque-total-badge {
    display: inline-flex !important;

    min-height: 31px !important;

    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: center !important;

    padding:
        5px
        10px !important;

    color:
        var(--agro-purple) !important;

    font-size: 12px !important;
    font-weight: 750 !important;

    white-space:
        nowrap !important;

    background:
        var(--agro-purple-bg) !important;

    border:
        1px solid
        #ddd0fe !important;

    border-radius:
        999px !important;
}

#agro-admin-dashboard-page .agro-cheque-reminder-grid {
    display: grid !important;

    width: 100% !important;
    min-width: 0 !important;

    grid-template-columns:
        repeat(
            3,
            minmax(
                0,
                1fr
            )
        ) !important;

    gap: 12px !important;
}

#agro-admin-dashboard-page .agro-cheque-day-card {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background:
        #ffffff !important;

    border:
        1px solid
        var(--agro-border) !important;

    border-radius:
        11px !important;
}

#agro-admin-dashboard-page
.agro-cheque-day-card.is-yesterday {
    border-color:
        #efc2c8 !important;
}

#agro-admin-dashboard-page
.agro-cheque-day-card.is-today {
    border-color:
        #9acfae !important;

    box-shadow:
        0 0 0 2px
        rgba(
            23,
            138,
            76,
            0.05
        ) !important;
}

#agro-admin-dashboard-page
.agro-cheque-day-card.is-tomorrow {
    border-color:
        #e9d09d !important;
}

#agro-admin-dashboard-page .agro-cheque-day-header {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;
    justify-content: space-between !important;

    gap: 10px !important;

    padding:
        11px
        12px !important;

    border-bottom:
        1px solid
        var(--agro-border) !important;
}

#agro-admin-dashboard-page
.is-yesterday
.agro-cheque-day-header {
    background:
        var(--agro-negative-bg) !important;
}

#agro-admin-dashboard-page
.is-today
.agro-cheque-day-header {
    background:
        var(--agro-positive-bg) !important;
}

#agro-admin-dashboard-page
.is-tomorrow
.agro-cheque-day-header {
    background:
        var(--agro-warning-bg) !important;
}

#agro-admin-dashboard-page .agro-cheque-day-copy {
    min-width: 0 !important;
}

#agro-admin-dashboard-page .agro-cheque-day-title {
    display: block !important;

    color:
        var(--agro-text-primary) !important;

    font-size: 14px !important;
    font-weight: 760 !important;
}

#agro-admin-dashboard-page .agro-cheque-day-description {
    display: block !important;

    margin-top:
        1px !important;

    color:
        var(--agro-text-muted) !important;

    font-size: 10px !important;
    font-weight: 550 !important;
}

#agro-admin-dashboard-page .agro-cheque-day-count {
    display: inline-flex !important;

    min-width: 27px !important;
    height: 27px !important;

    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: center !important;

    padding:
        0
        7px !important;

    color:
        #ffffff !important;

    font-size: 11px !important;
    font-weight: 800 !important;

    background:
        var(--agro-text-secondary) !important;

    border-radius:
        999px !important;
}

#agro-admin-dashboard-page
.is-yesterday
.agro-cheque-day-count {
    background:
        var(--agro-negative) !important;
}

#agro-admin-dashboard-page
.is-today
.agro-cheque-day-count {
    background:
        var(--agro-positive) !important;
}

#agro-admin-dashboard-page
.is-tomorrow
.agro-cheque-day-count {
    background:
        var(--agro-warning) !important;
}

#agro-admin-dashboard-page .agro-cheque-items {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    gap: 0 !important;
}

#agro-admin-dashboard-page .agro-cheque-item {
    display: flex !important;

    min-width: 0 !important;

    align-items: flex-start !important;
    justify-content: space-between !important;

    gap: 10px !important;

    padding:
        11px
        12px !important;

    border-bottom:
        1px solid
        #edf0ee !important;
}

#agro-admin-dashboard-page
.agro-cheque-item:last-child {
    border-bottom:
        0 !important;
}

#agro-admin-dashboard-page .agro-cheque-item-main {
    min-width: 0 !important;

    flex:
        1 1 auto !important;
}

#agro-admin-dashboard-page .agro-cheque-item-top {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;

    flex-wrap: wrap !important;

    gap: 5px !important;
}

#agro-admin-dashboard-page .agro-cheque-number {
    overflow: hidden !important;

    color:
        var(--agro-text-primary) !important;

    font-size: 13px !important;
    font-weight: 760 !important;

    text-overflow:
        ellipsis !important;

    white-space:
        nowrap !important;
}

#agro-admin-dashboard-page .agro-cheque-type {
    display: inline-flex !important;

    min-height: 21px !important;

    align-items: center !important;
    justify-content: center !important;

    padding:
        2px
        7px !important;

    font-size: 9px !important;
    font-weight: 800 !important;

    line-height: 1 !important;

    text-transform:
        uppercase !important;

    border-radius:
        999px !important;
}

#agro-admin-dashboard-page
.agro-cheque-type.received {
    color:
        var(--agro-positive) !important;

    background:
        var(--agro-positive-bg) !important;
}

#agro-admin-dashboard-page
.agro-cheque-type.issued {
    color:
        var(--agro-warning) !important;

    background:
        var(--agro-warning-bg) !important;
}

#agro-admin-dashboard-page .agro-cheque-action {
    display: block !important;

    margin-top:
        3px !important;

    color:
        var(--agro-text-secondary) !important;

    font-size: 11px !important;
    font-weight: 650 !important;

    line-height: 1.35 !important;
}

#agro-admin-dashboard-page .agro-cheque-meta {
    display: block !important;

    margin-top:
        2px !important;

    color:
        var(--agro-text-muted) !important;

    font-size: 10px !important;
    line-height: 1.35 !important;
}

#agro-admin-dashboard-page .agro-cheque-amount {
    flex:
        0 0 auto !important;

    color:
        var(--agro-text-primary) !important;

    font-size: 12px !important;
    font-weight: 760 !important;

    white-space:
        nowrap !important;
}

#agro-admin-dashboard-page .agro-cheque-empty {
    display: flex !important;

    min-height: 102px !important;

    align-items: center !important;
    justify-content: center !important;

    padding:
        18px
        14px !important;

    color:
        var(--agro-text-muted) !important;

    font-size: 11px !important;
    font-weight: 550 !important;

    text-align: center !important;
}

#agro-admin-dashboard-page .agro-cheque-error {
    padding:
        10px
        12px !important;

    color:
        var(--agro-negative) !important;

    font-size: 12px !important;
    font-weight: 650 !important;

    background:
        var(--agro-negative-bg) !important;

    border:
        1px solid
        #efc2c8 !important;

    border-radius:
        8px !important;
}

/* =========================================================
   METRIC CARDS
   ========================================================= */

#agro-admin-dashboard-page .agro-metric-grid {
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

#agro-admin-dashboard-page .agro-metric-card {
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

#agro-admin-dashboard-page .agro-metric-label {
    color:
        var(--agro-text-secondary) !important;

    font-size: 12px !important;
    font-weight: 750 !important;

    letter-spacing:
        0.045em !important;

    text-transform:
        uppercase !important;
}

#agro-admin-dashboard-page .agro-metric-value {
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

#agro-admin-dashboard-page .agro-metric-sub {
    color:
        var(--agro-text-muted) !important;

    font-size: 12px !important;
    line-height: 1.4 !important;
}

#agro-admin-dashboard-page .agro-value-positive {
    color:
        var(--agro-positive) !important;
}

#agro-admin-dashboard-page .agro-value-negative {
    color:
        var(--agro-negative) !important;
}

#agro-admin-dashboard-page .agro-value-warning {
    color:
        var(--agro-warning) !important;
}

/* =========================================================
   TWO COLUMN LAYOUT
   ========================================================= */

#agro-admin-dashboard-page .agro-two-column {
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

#agro-admin-dashboard-page .agro-card {
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

#agro-admin-dashboard-page .agro-card-header {
    display: flex !important;

    min-width: 0 !important;

    align-items: flex-start !important;
    justify-content: space-between !important;

    gap: 12px !important;
}

#agro-admin-dashboard-page .agro-card-header h2 {
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

#agro-admin-dashboard-page .agro-legend {
    display: flex !important;

    flex-wrap: wrap !important;

    gap:
        10px
        16px !important;

    color:
        var(--agro-text-secondary) !important;

    font-size: 12px !important;
}

#agro-admin-dashboard-page .agro-legend span {
    display: inline-flex !important;

    align-items: center !important;

    gap: 6px !important;
}

#agro-admin-dashboard-page .agro-legend-dot {
    display: inline-block !important;

    width: 9px !important;
    height: 9px !important;

    border-radius: 3px !important;
}

#agro-admin-dashboard-page .agro-legend-sales {
    background: #2563eb !important;
}

#agro-admin-dashboard-page .agro-legend-collections {
    background: #16a34a !important;
}

#agro-admin-dashboard-page .agro-legend-expenses {
    background: #dc2626 !important;
}

#agro-admin-dashboard-page .agro-legend-returns {
    background: #d97706 !important;
}

#agro-admin-dashboard-page .agro-chart {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    gap: 13px !important;
}

#agro-admin-dashboard-page .agro-chart-row {
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

#agro-admin-dashboard-page
.agro-chart-row > span {
    color:
        var(--agro-text-secondary) !important;

    font-weight: 650 !important;
}

#agro-admin-dashboard-page
.agro-chart-row > strong {
    color:
        var(--agro-text-primary) !important;

    font-size: 13px !important;
    font-weight: 700 !important;

    text-align: right !important;

    white-space: nowrap !important;
}

#agro-admin-dashboard-page .agro-chart-bars {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    gap: 3px !important;
}

#agro-admin-dashboard-page .agro-bar {
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

#agro-admin-dashboard-page .agro-bar-sales {
    background: #2563eb !important;
}

#agro-admin-dashboard-page .agro-bar-collections {
    background: #16a34a !important;
}

#agro-admin-dashboard-page .agro-bar-expenses {
    background: #dc2626 !important;
}

#agro-admin-dashboard-page .agro-bar-returns {
    background: #d97706 !important;
}

/* =========================================================
   PAYMENT COLLECTIONS
   ========================================================= */

#agro-admin-dashboard-page .agro-payment-list {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    gap: 9px !important;
}

#agro-admin-dashboard-page .agro-payment-row {
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

#agro-admin-dashboard-page
.agro-payment-row
strong.agro-payment-name {
    display: block !important;

    color:
        var(--agro-text-primary) !important;

    font-size: 14px !important;
    font-weight: 700 !important;
}

#agro-admin-dashboard-page
.agro-payment-row
span.agro-payment-count {
    color:
        var(--agro-text-muted) !important;

    font-size: 12px !important;
}

#agro-admin-dashboard-page
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

#agro-admin-dashboard-page .agro-table-scroll {
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

#agro-admin-dashboard-page
.agro-table-scroll::-webkit-scrollbar {
    height: 7px !important;
}

#agro-admin-dashboard-page
.agro-table-scroll::-webkit-scrollbar-track {
    background: #eef0f3 !important;
}

#agro-admin-dashboard-page
.agro-table-scroll::-webkit-scrollbar-thumb {
    background: #b5bdc8 !important;

    border-radius: 10px !important;
}

#agro-admin-dashboard-page table.agro-table {
    width: 100% !important;

    min-width: 650px !important;

    border-collapse: collapse !important;

    color:
        var(--agro-text-primary) !important;

    font-size: 13px !important;
}

#agro-admin-dashboard-page
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

#agro-admin-dashboard-page
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

#agro-admin-dashboard-page
table.agro-table
tbody tr:last-child td {
    border-bottom: none !important;
}

#agro-admin-dashboard-page
table.agro-table
tbody tr:hover {
    background:
        var(--agro-accent-soft) !important;
}

#agro-admin-dashboard-page
table.agro-table strong {
    font-weight: 700 !important;
}

#agro-admin-dashboard-page .agro-table-empty {
    padding:
        27px
        16px !important;

    color:
        var(--agro-text-muted) !important;

    font-size: 13px !important;

    text-align: center !important;
}

/* =========================================================
   EXPENSE ACTIVITY
   ========================================================= */

#agro-admin-dashboard-page .agro-activity-list {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    gap: 9px !important;
}

#agro-admin-dashboard-page .agro-activity-row {
    display: flex !important;

    min-width: 0 !important;

    align-items: flex-start !important;
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

#agro-admin-dashboard-page
.agro-activity-row
> div {
    min-width: 0 !important;
}

#agro-admin-dashboard-page
.agro-activity-row
strong.agro-activity-title {
    display: block !important;

    margin-bottom: 3px !important;

    overflow: hidden !important;

    color:
        var(--agro-text-primary) !important;

    font-size: 14px !important;
    font-weight: 700 !important;

    text-overflow: ellipsis !important;
}

#agro-admin-dashboard-page
.agro-activity-row
span.agro-activity-meta {
    display: block !important;

    color:
        var(--agro-text-muted) !important;

    font-size: 12px !important;
}

#agro-admin-dashboard-page
.agro-activity-row
> strong {
    flex: 0 0 auto !important;

    white-space: nowrap !important;
}

/* =========================================================
   BADGES
   ========================================================= */

#agro-admin-dashboard-page .agro-badge {
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

#agro-admin-dashboard-page .agro-badge-positive {
    color:
        var(--agro-positive) !important;

    background:
        var(--agro-positive-bg) !important;
}

#agro-admin-dashboard-page .agro-badge-negative {
    color:
        var(--agro-negative) !important;

    background:
        var(--agro-negative-bg) !important;
}

#agro-admin-dashboard-page .agro-badge-warning {
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
    #agro-admin-dashboard-page .agro-page-inner {
        padding:
            24px
            24px
            42px !important;
    }

    #agro-admin-dashboard-page .agro-metric-grid {
        grid-template-columns:
            repeat(
                3,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #agro-admin-dashboard-page .agro-cheque-reminder-grid {
        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #agro-admin-dashboard-page
    .agro-cheque-day-card.is-tomorrow {
        grid-column:
            1 / -1 !important;
    }
}

@media (
    max-width: 960px
) {
    #agro-admin-dashboard-page .agro-two-column {
        grid-template-columns:
            minmax(
                0,
                1fr
            ) !important;
    }

    #agro-admin-dashboard-page .agro-metric-grid {
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
    #agro-admin-dashboard-page .agro-page-inner {
        gap: 18px !important;

        padding:
            18px
            14px
            32px !important;
    }

    #agro-admin-dashboard-page .agro-header {
        align-items: stretch !important;

        padding:
            0
            0
            14px !important;
    }

    #agro-admin-dashboard-page .agro-header h1 {
        font-size: 23px !important;
    }

    #agro-admin-dashboard-page .agro-refresh-button {
        width: 100% !important;
    }

    #agro-admin-dashboard-page .agro-metric-grid {
        grid-template-columns:
            minmax(
                0,
                1fr
            ) !important;
    }

    #agro-admin-dashboard-page .agro-metric-card {
        min-height: 112px !important;
    }

    #agro-admin-dashboard-page .agro-cheque-reminders {
        padding:
            15px
            14px !important;
    }

    #agro-admin-dashboard-page .agro-cheque-reminder-header {
        align-items: flex-start !important;

        flex-direction: column !important;
    }

    #agro-admin-dashboard-page .agro-cheque-reminder-grid {
        grid-template-columns:
            minmax(
                0,
                1fr
            ) !important;
    }

    #agro-admin-dashboard-page
    .agro-cheque-day-card.is-tomorrow {
        grid-column:
            auto !important;
    }

    #agro-admin-dashboard-page .agro-cheque-item {
        align-items: stretch !important;

        flex-direction: column !important;
    }

    #agro-admin-dashboard-page .agro-cheque-amount {
        align-self: flex-start !important;
    }

    #agro-admin-dashboard-page .agro-card {
        padding:
            17px
            15px !important;
    }

    #agro-admin-dashboard-page .agro-chart-row {
        grid-template-columns:
            45px
            minmax(
                0,
                1fr
            ) !important;
    }

    #agro-admin-dashboard-page
    .agro-chart-row
    > strong {
        grid-column: 2 !important;

        text-align: left !important;
    }

    #agro-admin-dashboard-page .agro-payment-row,
    #agro-admin-dashboard-page .agro-activity-row {
        align-items: stretch !important;

        flex-direction: column !important;
    }
}

@media (
    prefers-reduced-motion:
        reduce
) {
    #agro-admin-dashboard-page *,
    #agro-admin-dashboard-page *::before,
    #agro-admin-dashboard-page *::after {
        transition: none !important;

        animation-duration:
            0.01ms !important;

        scroll-behavior:
            auto !important;
    }
}
`;

/* =========================================================
   COMPONENT
   ========================================================= */

export default function AdminDashboardPage() {
    const {
        token,
    } = useAuth();

    const [
        dashboard,
        setDashboard,
    ] =
        useState<
            AdminDashboardData
            | null
        >(
            null,
        );

    const [
        pendingCheques,
        setPendingCheques,
    ] =
        useState<
            Cheque[]
        >(
            [],
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

    const [
        chequeError,
        setChequeError,
    ] =
        useState(
            '',
        );

    /* =====================================================
       LOAD ALL PENDING CHEQUES

       We paginate so the reminders do not accidentally miss
       a cheque when there are more than 20 pending records.
       ===================================================== */

    const loadPendingCheques =
        useCallback(
            async (): Promise<
                Cheque[]
            > => {
                if (!token) {
                    return [];
                }

                const allCheques:
                    Cheque[] = [];

                let currentPage =
                    1;

                let lastPage =
                    1;

                do {
                    const response =
                        await getCheques(
                            token,
                            {
                                search: '',

                                status:
                                    'pending',

                                page:
                                    currentPage,

                                perPage:
                                    100,
                            },
                        );

                    allCheques.push(
                        ...response.data,
                    );

                    lastPage =
                        Math.max(
                            1,
                            Number(
                                response
                                    .meta
                                    .last_page
                                ?? 1,
                            ),
                        );

                    currentPage +=
                        1;
                } while (
                    currentPage
                    <= lastPage
                );

                return allCheques;
            },
            [
                token,
            ],
        );

    /* =====================================================
       LOAD DASHBOARD + CHEQUE NOTIFICATIONS
       ===================================================== */

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

                setChequeError(
                    '',
                );

                const [
                    dashboardResult,
                    chequeResult,
                ] =
                    await Promise.allSettled(
                        [
                            getAdminDashboard(
                                token,
                            ),

                            loadPendingCheques(),
                        ],
                    );

                if (
                    dashboardResult.status
                    === 'fulfilled'
                ) {
                    setDashboard(
                        dashboardResult
                            .value
                            .data,
                    );
                } else {
                    const error =
                        dashboardResult
                            .reason;

                    setErrorMessage(
                        error
                            instanceof ApiError
                            ? error.message
                            : 'Unable to load the admin dashboard.',
                    );
                }

                if (
                    chequeResult.status
                    === 'fulfilled'
                ) {
                    setPendingCheques(
                        chequeResult.value,
                    );
                } else {
                    setPendingCheques(
                        [],
                    );

                    const error =
                        chequeResult
                            .reason;

                    setChequeError(
                        error
                            instanceof ApiError
                            ? error.message
                            : 'Unable to load cheque reminders.',
                    );
                }

                setIsLoading(
                    false,
                );
            },
            [
                token,
                loadPendingCheques,
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

    /* =====================================================
       FINANCIAL CHART MAXIMUM
       ===================================================== */

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
                                        point.expenses
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

    /* =====================================================
       CHEQUE REMINDER GROUPS
       ===================================================== */

    const chequeReminderGroups =
        useMemo<
            ChequeReminderGroup[]
        >(
            () => {
                const yesterdayKey =
                    relativeDateKey(
                        -1,
                    );

                const todayKey =
                    relativeDateKey(
                        0,
                    );

                const tomorrowKey =
                    relativeDateKey(
                        1,
                    );

                const baseGroups:
                    Array<
                        Omit<
                            ChequeReminderGroup,
                            'items'
                        >
                    > = [
                        {
                            key:
                                'yesterday',

                            title:
                                'Yesterday',

                            description:
                                'Overdue from yesterday',

                            dateKey:
                                yesterdayKey,

                            toneClass:
                                'is-yesterday',

                            emptyMessage:
                                'No pending cheques from yesterday.',
                        },

                        {
                            key:
                                'today',

                            title:
                                'Today',

                            description:
                                'Action required today',

                            dateKey:
                                todayKey,

                            toneClass:
                                'is-today',

                            emptyMessage:
                                'No pending cheques due today.',
                        },

                        {
                            key:
                                'tomorrow',

                            title:
                                'Tomorrow',

                            description:
                                'Prepare for tomorrow',

                            dateKey:
                                tomorrowKey,

                            toneClass:
                                'is-tomorrow',

                            emptyMessage:
                                'No pending cheques due tomorrow.',
                        },
                    ];

                return baseGroups.map(
                    (
                        group,
                    ) => ({
                        ...group,

                        items:
                            pendingCheques
                                .filter(
                                    (
                                        cheque,
                                    ) =>
                                        cheque.status
                                        === 'pending'
                                        && toDateOnly(
                                            cheque
                                                .due_date,
                                        )
                                        === group.dateKey,
                                )
                                .sort(
                                    (
                                        first,
                                        second,
                                    ) =>
                                        String(
                                            first
                                                .cheque_number,
                                        ).localeCompare(
                                            String(
                                                second
                                                    .cheque_number,
                                            ),
                                        ),
                                ),
                    }),
                );
            },
            [
                pendingCheques,
            ],
        );

    const chequeReminderCount =
        useMemo(
            () =>
                chequeReminderGroups.reduce(
                    (
                        total,
                        group,
                    ) =>
                        total
                        + group
                            .items
                            .length,
                    0,
                ),
            [
                chequeReminderGroups,
            ],
        );

    /* =====================================================
       PAGE STATES
       ===================================================== */

    if (
        isLoading
        && !dashboard
    ) {
        return (
            <div id="agro-admin-dashboard-page">
                <style>
                    {DASHBOARD_STYLES}
                </style>

                <div className="agro-state-screen">
                    <div className="agro-spinner" />

                    <span>
                        Loading business dashboard...
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
            <div id="agro-admin-dashboard-page">
                <style>
                    {DASHBOARD_STYLES}
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

    /* =====================================================
       RENDER
       ===================================================== */

    return (
        <div id="agro-admin-dashboard-page">
            <style>
                {DASHBOARD_STYLES}
            </style>

            <div className="agro-page-inner">
                {/* =========================================
                    HEADER
                   ========================================= */}

                <section className="agro-header">
                    <div className="agro-header-copy">
                        <span className="agro-kicker">
                            Business Overview
                        </span>

                        <h1>
                            Admin Dashboard
                        </h1>

                        <p>
                            Live sales, collections,
                            expenses, profit, stock
                            and cheque reminders.
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
                    CHEQUE REMINDERS
                   ========================================= */}

                <section className="agro-cheque-reminders">
                    <header className="agro-cheque-reminder-header">
                        <div className="agro-cheque-reminder-heading">
                            <span className="agro-kicker">
                                Cheque Notifications
                            </span>

                            <h2>
                                Cheque Reminders
                            </h2>

                            <p>
                                Pending cheques from yesterday,
                                due today and due tomorrow.
                            </p>
                        </div>

                        <span className="agro-cheque-total-badge">
                            {chequeReminderCount}
                            {' '}

                            {chequeReminderCount === 1
                                ? 'Reminder'
                                : 'Reminders'}
                        </span>
                    </header>

                    {chequeError && (
                        <div
                            className="agro-cheque-error"
                            role="alert"
                        >
                            {chequeError}
                        </div>
                    )}

                    <div className="agro-cheque-reminder-grid">
                        {chequeReminderGroups.map(
                            (
                                group,
                            ) => (
                                <article
                                    key={
                                        group.key
                                    }
                                    className={
                                        `agro-cheque-day-card ${group.toneClass}`
                                    }
                                >
                                    <header className="agro-cheque-day-header">
                                        <div className="agro-cheque-day-copy">
                                            <strong className="agro-cheque-day-title">
                                                {
                                                    group
                                                        .title
                                                }
                                            </strong>

                                            <span className="agro-cheque-day-description">
                                                {
                                                    group
                                                        .description
                                                }
                                            </span>
                                        </div>

                                        <span className="agro-cheque-day-count">
                                            {
                                                group
                                                    .items
                                                    .length
                                            }
                                        </span>
                                    </header>

                                    <div className="agro-cheque-items">
                                        {group
                                            .items
                                            .length
                                            === 0 ? (
                                            <div className="agro-cheque-empty">
                                                {
                                                    group
                                                        .emptyMessage
                                                }
                                            </div>
                                        ) : (
                                            group
                                                .items
                                                .map(
                                                    (
                                                        cheque,
                                                    ) => (
                                                        <div
                                                            key={
                                                                cheque
                                                                    .id
                                                            }
                                                            className="agro-cheque-item"
                                                        >
                                                            <div className="agro-cheque-item-main">
                                                                <div className="agro-cheque-item-top">
                                                                    <strong className="agro-cheque-number">
                                                                        Cheque
                                                                        {' '}

                                                                        {
                                                                            cheque
                                                                                .cheque_number
                                                                        }
                                                                    </strong>

                                                                    <span
                                                                        className={
                                                                            `agro-cheque-type ${cheque.type}`
                                                                        }
                                                                    >
                                                                        {chequeTypeLabel(
                                                                            cheque,
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                <span className="agro-cheque-action">
                                                                    {group.key
                                                                        === 'yesterday'
                                                                        ? `Was due yesterday · ${chequeActionText(
                                                                            cheque,
                                                                        )}`
                                                                        : group.key
                                                                            === 'today'
                                                                            ? `Due today · ${chequeActionText(
                                                                                cheque,
                                                                            )}`
                                                                            : `Due tomorrow · ${chequeActionText(
                                                                                cheque,
                                                                            )}`}
                                                                </span>

                                                                <span className="agro-cheque-meta">
                                                                    {cheque
                                                                        .bank_name
                                                                        ?? 'Bank not specified'}

                                                                    {' · '}

                                                                    Due
                                                                    {' '}

                                                                    {formatDate(
                                                                        cheque
                                                                            .due_date,
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <strong className="agro-cheque-amount">
                                                                {currencyFormatter.format(
                                                                    Number(
                                                                        cheque
                                                                            .amount
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
                            ),
                        )}
                    </div>
                </section>

                {/* =========================================
                    METRICS
                   ========================================= */}

                <section className="agro-metric-grid">
                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            Today&apos;s Sales
                        </span>

                        <strong className="agro-metric-value">
                            {currencyFormatter.format(
                                summary
                                    .today_sales_total,
                            )}
                        </strong>

                        <span className="agro-metric-sub">
                            {
                                summary
                                    .today_sales_count
                            }
                            {' '}
                            transactions
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            Collected Today
                        </span>

                        <strong className="agro-metric-value">
                            {currencyFormatter.format(
                                summary
                                    .today_collected_amount,
                            )}
                        </strong>

                        <span className="agro-metric-sub">
                            Initial and due payments
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            New Due Today
                        </span>

                        <strong className="agro-metric-value agro-value-warning">
                            {currencyFormatter.format(
                                summary
                                    .today_due_sales,
                            )}
                        </strong>

                        <span className="agro-metric-sub">
                            Current balance of
                            today&apos;s sales
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            Outstanding Due
                        </span>

                        <strong className="agro-metric-value agro-value-warning">
                            {currencyFormatter.format(
                                summary
                                    .outstanding_due,
                            )}
                        </strong>

                        <span className="agro-metric-sub">
                            All unsettled customer balances
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            Expenses Today
                        </span>

                        <strong className="agro-metric-value agro-value-negative">
                            {currencyFormatter.format(
                                summary
                                    .today_expenses,
                            )}
                        </strong>

                        <span className="agro-metric-sub">
                            Recorded business costs
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            Net Profit Today
                        </span>

                        <strong
                            className={
                                `agro-metric-value ${summary
                                    .today_net_profit
                                    >= 0
                                    ? 'agro-value-positive'
                                    : 'agro-value-negative'
                                }`
                            }
                        >
                            {currencyFormatter.format(
                                summary
                                    .today_net_profit,
                            )}
                        </strong>

                        <span className="agro-metric-sub">
                            After returns and expenses
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            Stock Cost Value
                        </span>

                        <strong className="agro-metric-value">
                            {currencyFormatter.format(
                                summary
                                    .stock_purchase_value,
                            )}
                        </strong>

                        <span className="agro-metric-sub">
                            {
                                summary
                                    .stock_quantity
                            }
                            {' '}
                            available units
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            Stock Retail Value
                        </span>

                        <strong className="agro-metric-value">
                            {currencyFormatter.format(
                                summary
                                    .stock_retail_value,
                            )}
                        </strong>

                        <span className="agro-metric-sub">
                            Estimated selling value
                        </span>
                    </article>

                    <article className="agro-metric-card">
                        <span className="agro-metric-label">
                            Stock Alerts
                        </span>

                        <strong className="agro-metric-value">
                            {summary
                                .expiring_batch_count
                                + summary
                                    .expired_batch_count
                                + summary
                                    .out_of_stock_products}
                        </strong>

                        <span className="agro-metric-sub">
                            Expiring, expired and out of stock
                        </span>
                    </article>
                </section>

                {/* =========================================
                    FINANCIAL ACTIVITY + PAYMENTS
                   ========================================= */}

                <section className="agro-two-column">
                    <article className="agro-card">
                        <header className="agro-card-header">
                            <div>
                                <span className="agro-kicker">
                                    Last 7 Days
                                </span>

                                <h2>
                                    Financial Activity
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
                                <i className="agro-legend-dot agro-legend-expenses" />
                                Expenses
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
                                                {
                                                    point
                                                        .label
                                                }
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
                                                    className="agro-bar agro-bar-expenses"
                                                    style={{
                                                        width:
                                                            `${(
                                                                Number(
                                                                    point.expenses,
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
                                    Payment Collections
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
                                                        {
                                                            payment
                                                                .transactions
                                                        }
                                                        {' '}
                                                        transactions
                                                    </span>
                                                </div>

                                                <strong>
                                                    {currencyFormatter.format(
                                                        payment
                                                            .total,
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
                    PRODUCTS + EXPENSES
                   ========================================= */}

                <section className="agro-two-column">
                    <article className="agro-card">
                        <header className="agro-card-header">
                            <div>
                                <span className="agro-kicker">
                                    Last 30 Days
                                </span>

                                <h2>
                                    Best-Selling Products
                                </h2>
                            </div>
                        </header>

                        <div className="agro-table-scroll">
                            <table className="agro-table">
                                <thead>
                                    <tr>
                                        <th>
                                            Product
                                        </th>

                                        <th>
                                            Quantity
                                        </th>

                                        <th>
                                            Sales
                                        </th>

                                        <th>
                                            Gross Profit
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {dashboard
                                        .top_products
                                        .length
                                        === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={
                                                    4
                                                }
                                                className="agro-table-empty"
                                            >
                                                No product sales yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        dashboard
                                            .top_products
                                            .map(
                                                (
                                                    product,
                                                ) => (
                                                    <tr
                                                        key={
                                                            product
                                                                .id
                                                        }
                                                    >
                                                        <td>
                                                            <strong>
                                                                {
                                                                    product
                                                                        .name
                                                                }
                                                            </strong>
                                                        </td>

                                                        <td>
                                                            {
                                                                product
                                                                    .quantity_sold
                                                            }

                                                            {' '}

                                                            {
                                                                product
                                                                    .unit
                                                            }
                                                        </td>

                                                        <td>
                                                            {currencyFormatter.format(
                                                                product
                                                                    .sales_total,
                                                            )}
                                                        </td>

                                                        <td>
                                                            <strong className="agro-value-positive">
                                                                {currencyFormatter.format(
                                                                    product
                                                                        .gross_profit,
                                                                )}
                                                            </strong>
                                                        </td>
                                                    </tr>
                                                ),
                                            )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article className="agro-card">
                        <header className="agro-card-header">
                            <div>
                                <span className="agro-kicker">
                                    Latest
                                </span>

                                <h2>
                                    Recent Expenses
                                </h2>
                            </div>
                        </header>

                        <div className="agro-activity-list">
                            {dashboard
                                .recent_expenses
                                .length
                                === 0 ? (
                                <div className="agro-table-empty">
                                    No expenses recorded.
                                </div>
                            ) : (
                                dashboard
                                    .recent_expenses
                                    .map(
                                        (
                                            expense,
                                        ) => (
                                            <div
                                                className="agro-activity-row"
                                                key={
                                                    expense
                                                        .id
                                                }
                                            >
                                                <div>
                                                    <strong className="agro-activity-title">
                                                        {
                                                            expense
                                                                .description
                                                        }
                                                    </strong>

                                                    <span className="agro-activity-meta">
                                                        {
                                                            expense
                                                                .category
                                                                .name
                                                        }

                                                        {' · '}

                                                        {formatDate(
                                                            expense
                                                                .expense_date,
                                                        )}
                                                    </span>
                                                </div>

                                                <strong className="agro-value-negative">
                                                    {currencyFormatter.format(
                                                        expense
                                                            .amount,
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
                                Recent Sales
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
                                        Cashier
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
                                            No sales completed.
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
                                                            {
                                                                sale
                                                                    .sale_number
                                                            }
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
                                                            .created_by
                                                            ?.name
                                                            ?? 'Unknown Cashier'}
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
                                                                sale
                                                                    .grand_total,
                                                            )}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        {sale
                                                            .due_amount
                                                            > 0 ? (
                                                            <span className="agro-badge agro-badge-warning">
                                                                {currencyFormatter.format(
                                                                    sale
                                                                        .due_amount,
                                                                )}
                                                            </span>
                                                        ) : (
                                                            currencyFormatter.format(
                                                                sale
                                                                    .due_amount,
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