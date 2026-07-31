import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    createDatabaseBackup,
    deleteDatabaseBackup,
    downloadDatabaseBackup,
    getDatabaseBackups,
    restoreDatabaseBackup,
} from '../../services/databaseBackupService';

import type {
    DatabaseBackup,
    DatabaseBackupSettings,
    DatabaseBackupSummary,
} from '../../types/databaseBackup';

import type {
    PosPaginationMeta,
} from '../../types/sale';

const emptySummary: DatabaseBackupSummary = {
    total_backups: 0,
    completed_backups: 0,
    failed_backups: 0,
    total_size: 0,
    latest_completed_at: null,
};

const emptySettings: DatabaseBackupSettings = {
    automatic_enabled: false,
    automatic_time: '02:00',
    retention_days: 30,
};

const emptyPagination: PosPaginationMeta = {
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
        return 'Not available';
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

function formatBytes(
    bytes: number | null,
): string {
    if (
        bytes === null
        || bytes <= 0
    ) {
        return '—';
    }

    const units = [
        'B',
        'KB',
        'MB',
        'GB',
    ];

    let value =
        bytes;

    let unitIndex = 0;

    while (
        value >= 1024
        && unitIndex
        < units.length - 1
    ) {
        value /= 1024;
        unitIndex++;
    }

    return `${value.toFixed(
        unitIndex === 0
            ? 0
            : 2,
    )} ${units[unitIndex]}`;
}

function statusName(
    status: string,
): string {
    switch (status) {
        case 'processing':
            return 'Processing';

        case 'completed':
            return 'Completed';

        case 'failed':
            return 'Failed';

        case 'restoring':
            return 'Restoring';

        case 'restored':
            return 'Restored';

        default:
            return status;
    }
}

const backupPageStyles = `
    #sapo-backup-page,
    #sapo-backup-page *,
    #sapo-backup-page *::before,
    #sapo-backup-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-backup-page {
        --bkp-green-800: #166534;
        --bkp-green-700: #15803d;
        --bkp-green-100: #dcfce7;
        --bkp-green-50: #f0fdf4;
        --bkp-red: #dc2626;
        --bkp-red-light: #fef2f2;
        --bkp-amber: #b45309;
        --bkp-amber-light: #fffbeb;
        --bkp-blue: #2563eb;
        --bkp-blue-light: #eff6ff;
        --bkp-text: #111827;
        --bkp-text-secondary: #1f2937;
        --bkp-muted: #6b7280;
        --bkp-border: #e5e7eb;
        --bkp-border-strong: #d1d5db;
        --bkp-bg: #f9fafb;
        --bkp-white: #ffffff;
        --bkp-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        gap: 20px !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--bkp-text-secondary) !important;
        font-family: var(--bkp-font) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        background: transparent !important;
        isolation: isolate !important;
    }

    #sapo-backup-page h2,
    #sapo-backup-page h3,
    #sapo-backup-page p,
    #sapo-backup-page span,
    #sapo-backup-page strong,
    #sapo-backup-page small,
    #sapo-backup-page label,
    #sapo-backup-page button,
    #sapo-backup-page input,
    #sapo-backup-page select,
    #sapo-backup-page textarea,
    #sapo-backup-page table,
    #sapo-backup-page th,
    #sapo-backup-page td {
        font-family: var(--bkp-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-backup-page h2,
    #sapo-backup-page h3,
    #sapo-backup-page p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Header ---------- */
    #sapo-backup-page .bkp-header {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 16px !important;
        padding: 20px 24px !important;
        background: var(--bkp-white) !important;
        border: 1px solid var(--bkp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-backup-page .bkp-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--bkp-green-700) !important;
        margin-bottom: 6px !important;
        background: transparent !important;
    }

    #sapo-backup-page .bkp-header h2 {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--bkp-text) !important;
        margin-bottom: 4px !important;
    }

    #sapo-backup-page .bkp-header p {
        font-size: 13.5px !important;
        color: var(--bkp-muted) !important;
    }

    /* ---------- Buttons ---------- */
    #sapo-backup-page .bkp-primary-button,
    #sapo-backup-page .bkp-secondary-button {
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

    #sapo-backup-page .bkp-primary-button {
        color: #ffffff !important;
        background: var(--bkp-green-700) !important;
        border: 1px solid var(--bkp-green-700) !important;
    }

    #sapo-backup-page .bkp-primary-button:hover:not(:disabled) {
        background: var(--bkp-green-800) !important;
    }

    #sapo-backup-page .bkp-secondary-button {
        color: #374151 !important;
        background: var(--bkp-white) !important;
        border: 1px solid var(--bkp-border-strong) !important;
    }

    #sapo-backup-page .bkp-secondary-button:hover:not(:disabled) {
        background: var(--bkp-bg) !important;
        border-color: #9ca3af !important;
    }

    #sapo-backup-page button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Summary cards ---------- */
    #sapo-backup-page .bkp-summary-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
        gap: 16px !important;
    }

    #sapo-backup-page .bkp-summary-grid article {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        padding: 18px 20px !important;
        background: var(--bkp-white) !important;
        border: 1px solid var(--bkp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-backup-page .bkp-summary-grid span {
        font-size: 12px !important;
        font-weight: 500 !important;
        color: var(--bkp-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-backup-page .bkp-summary-grid strong {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--bkp-text) !important;
        background: transparent !important;
    }

    #sapo-backup-page .bkp-failed-value {
        color: var(--bkp-red) !important;
    }

    #sapo-backup-page .bkp-date-value {
        font-size: 15px !important;
    }

    /* ---------- Settings banner ---------- */
    #sapo-backup-page .bkp-settings-banner {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
        gap: 16px !important;
        padding: 16px 20px !important;
        background: var(--bkp-blue-light) !important;
        border: 1px solid #bfdbfe !important;
        border-radius: 10px !important;
    }

    #sapo-backup-page .bkp-settings-banner > div {
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;
    }

    #sapo-backup-page .bkp-settings-banner span {
        font-size: 11.5px !important;
        font-weight: 600 !important;
        color: var(--bkp-blue) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-backup-page .bkp-settings-banner strong {
        font-size: 15px !important;
        font-weight: 700 !important;
        color: var(--bkp-text) !important;
        background: transparent !important;
    }

    /* ---------- Alerts ---------- */
    #sapo-backup-page .bkp-success-alert {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 12px 16px !important;
        border-radius: 8px !important;
        background: var(--bkp-green-50) !important;
        border: 1px solid var(--bkp-green-100) !important;
    }

    #sapo-backup-page .bkp-success-alert span:first-child {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 20px !important;
        height: 20px !important;
        flex-shrink: 0 !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        background: var(--bkp-green-700) !important;
        border-radius: 999px !important;
    }

    #sapo-backup-page .bkp-success-alert p {
        flex: 1 !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        color: #15803d !important;
    }

    #sapo-backup-page .bkp-success-alert button {
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

    #sapo-backup-page .bkp-success-alert button:hover {
        background: rgba(21, 128, 61, 0.1) !important;
    }

    #sapo-backup-page .bkp-form-alert {
        padding: 12px 16px !important;
        border-radius: 8px !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        background: var(--bkp-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Content card ---------- */
    #sapo-backup-page .bkp-content-card {
        background: var(--bkp-white) !important;
        border: 1px solid var(--bkp-border) !important;
        border-radius: 10px !important;
        padding: 20px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
    }

    /* ---------- Create backup panel ---------- */
    #sapo-backup-page .bkp-create-panel header {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        margin-bottom: 4px !important;
    }

    #sapo-backup-page .bkp-create-panel h3 {
        font-size: 17px !important;
        font-weight: 700 !important;
        color: var(--bkp-text) !important;
    }

    #sapo-backup-page .bkp-create-panel > header > p {
        font-size: 13px !important;
        color: var(--bkp-muted) !important;
    }

    #sapo-backup-page .bkp-create-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 14px !important;
        max-width: 520px !important;
    }

    #sapo-backup-page .bkp-create-form label {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
    }

    #sapo-backup-page .bkp-create-form label span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--bkp-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-backup-page .bkp-create-form textarea {
        width: 100% !important;
        padding: 10px 12px !important;
        font-size: 13.5px !important;
        color: var(--bkp-text-secondary) !important;
        background: var(--bkp-white) !important;
        border: 1px solid var(--bkp-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        resize: vertical !important;
        min-height: 72px !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-backup-page .bkp-create-form textarea:focus {
        border-color: var(--bkp-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-backup-page .bkp-create-form textarea:disabled {
        background: var(--bkp-bg) !important;
        color: var(--bkp-muted) !important;
        cursor: not-allowed !important;
    }

    #sapo-backup-page .bkp-create-form .bkp-primary-button {
        align-self: flex-start !important;
    }

    /* ---------- Toolbar ---------- */
    #sapo-backup-page .bkp-toolbar {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 10px !important;
    }

    #sapo-backup-page .bkp-toolbar input[type="search"] {
        flex: 1 1 240px !important;
        height: 38px !important;
        padding: 0 14px !important;
        font-size: 13.5px !important;
        color: var(--bkp-text-secondary) !important;
        border: 1px solid var(--bkp-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        background: var(--bkp-bg) !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-backup-page .bkp-toolbar input[type="search"]::placeholder {
        color: #9ca3af !important;
    }

    #sapo-backup-page .bkp-toolbar select {
        height: 38px !important;
        padding: 0 12px !important;
        font-size: 13px !important;
        border: 1px solid var(--bkp-border-strong) !important;
        border-radius: 8px !important;
        background: var(--bkp-bg) !important;
        color: var(--bkp-text-secondary) !important;
        outline: none !important;
        cursor: pointer !important;
        min-width: 150px !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-backup-page .bkp-toolbar input:focus,
    #sapo-backup-page .bkp-toolbar select:focus {
        border-color: var(--bkp-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
        background: var(--bkp-white) !important;
    }

    /* ---------- Scrollable table ---------- */
    #sapo-backup-page .bkp-table-container {
        max-height: 560px !important;
        overflow-y: auto !important;
        overflow-x: auto !important;
        border: 1px solid var(--bkp-border) !important;
        border-radius: 8px !important;
        background: var(--bkp-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--bkp-border-strong) transparent !important;
    }

    #sapo-backup-page .bkp-table-container::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
    }

    #sapo-backup-page .bkp-table-container::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-backup-page .bkp-table-container::-webkit-scrollbar-thumb {
        background: var(--bkp-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-backup-page .bkp-table {
        width: 100% !important;
        min-width: 1080px !important;
        border-collapse: collapse !important;
        font-size: 13.5px !important;
        background: var(--bkp-white) !important;
    }

    #sapo-backup-page .bkp-table thead {
        position: sticky !important;
        top: 0 !important;
        z-index: 1 !important;
    }

    #sapo-backup-page .bkp-table thead th {
        background: #f9fafb !important;
        color: var(--bkp-muted) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        text-align: left !important;
        padding: 12px 16px !important;
        border-bottom: 1px solid var(--bkp-border) !important;
        white-space: nowrap !important;
    }

    #sapo-backup-page .bkp-table tbody td {
        padding: 14px 16px !important;
        border-bottom: 1px solid #f1f5f9 !important;
        vertical-align: middle !important;
        color: var(--bkp-text-secondary) !important;
        background: var(--bkp-white) !important;
    }

    #sapo-backup-page .bkp-table tbody tr:last-child td {
        border-bottom: none !important;
    }

    #sapo-backup-page .bkp-table tbody tr:hover td {
        background: #f9fafb !important;
    }

    #sapo-backup-page .bkp-table td strong {
        font-weight: 600 !important;
        color: var(--bkp-text) !important;
        display: block !important;
        background: transparent !important;
    }

    #sapo-backup-page .bkp-table td small {
        display: block !important;
        margin-top: 2px !important;
        font-size: 12px !important;
        color: #9ca3af !important;
        background: transparent !important;
        white-space: normal !important;
    }

    #sapo-backup-page .bkp-error-message {
        color: var(--bkp-red) !important;
    }

    #sapo-backup-page .bkp-table-state {
        text-align: center !important;
        padding: 44px 16px !important;
        color: #9ca3af !important;
        font-size: 13.5px !important;
        background: var(--bkp-white) !important;
        white-space: normal !important;
    }

    /* ---------- Status badges ---------- */
    #sapo-backup-page .bkp-status {
        display: inline-block !important;
        padding: 4px 10px !important;
        border-radius: 999px !important;
        font-size: 11.5px !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
    }

    #sapo-backup-page .bkp-status-completed {
        background: var(--bkp-green-100) !important;
        color: var(--bkp-green-800) !important;
    }

    #sapo-backup-page .bkp-status-restored {
        background: var(--bkp-blue-light) !important;
        color: var(--bkp-blue) !important;
    }

    #sapo-backup-page .bkp-status-failed {
        background: var(--bkp-red-light) !important;
        color: #b91c1c !important;
    }

    #sapo-backup-page .bkp-status-processing,
    #sapo-backup-page .bkp-status-restoring {
        background: var(--bkp-amber-light) !important;
        color: var(--bkp-amber) !important;
    }

    /* ---------- Row actions ---------- */
    #sapo-backup-page .bkp-actions {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 6px !important;
    }

    #sapo-backup-page .bkp-download-button,
    #sapo-backup-page .bkp-restore-button,
    #sapo-backup-page .bkp-delete-button {
        padding: 6px 12px !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-backup-page .bkp-download-button {
        color: var(--bkp-blue) !important;
        background: var(--bkp-blue-light) !important;
        border: 1px solid #bfdbfe !important;
    }

    #sapo-backup-page .bkp-download-button:hover:not(:disabled) {
        background: var(--bkp-blue) !important;
        color: #ffffff !important;
        border-color: var(--bkp-blue) !important;
    }

    #sapo-backup-page .bkp-restore-button {
        color: var(--bkp-amber) !important;
        background: var(--bkp-amber-light) !important;
        border: 1px solid #fde68a !important;
    }

    #sapo-backup-page .bkp-restore-button:hover:not(:disabled) {
        background: var(--bkp-amber) !important;
        color: #ffffff !important;
        border-color: var(--bkp-amber) !important;
    }

    #sapo-backup-page .bkp-delete-button {
        color: var(--bkp-red) !important;
        background: var(--bkp-red-light) !important;
        border: 1px solid #fecaca !important;
    }

    #sapo-backup-page .bkp-delete-button:hover:not(:disabled) {
        background: var(--bkp-red) !important;
        color: #ffffff !important;
        border-color: var(--bkp-red) !important;
    }

    /* ---------- Pagination ---------- */
    #sapo-backup-page .bkp-pagination {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding-top: 4px !important;
    }

    #sapo-backup-page .bkp-pagination p {
        font-size: 13px !important;
        color: var(--bkp-muted) !important;
        font-weight: 500 !important;
        background: transparent !important;
    }

    #sapo-backup-page .bkp-pagination p strong {
        color: var(--bkp-text) !important;
        font-weight: 600 !important;
        background: transparent !important;
    }

    #sapo-backup-page .bkp-pagination-controls {
        display: flex !important;
        align-items: center !important;
        gap: 16px !important;
    }

    #sapo-backup-page .bkp-pagination-controls span {
        font-size: 13px !important;
        color: var(--bkp-muted) !important;
        font-weight: 500 !important;
        background: transparent !important;
    }

    #sapo-backup-page .bkp-pagination-controls span strong {
        color: var(--bkp-text) !important;
        font-weight: 600 !important;
        background: transparent !important;
    }

    #sapo-backup-page .bkp-pagination-button {
        padding: 7px 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--bkp-white) !important;
        border: 1px solid var(--bkp-border-strong) !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-backup-page .bkp-pagination-button:hover:not(:disabled) {
        background: #f9fafb !important;
        border-color: #9ca3af !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 760px) {
        #sapo-backup-page .bkp-header {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-backup-page .bkp-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-backup-page .bkp-toolbar select {
            width: 100% !important;
        }

        #sapo-backup-page .bkp-pagination {
            flex-direction: column !important;
            align-items: stretch !important;
        }
    }
`;

export default function BackupRestorePage() {
    const {
        token,
    } = useAuth();

    const [
        backups,
        setBackups,
    ] = useState<DatabaseBackup[]>([]);

    const [
        summary,
        setSummary,
    ] = useState(emptySummary);

    const [
        settings,
        setSettings,
    ] = useState(emptySettings);

    const [
        pagination,
        setPagination,
    ] = useState(emptyPagination);

    const [
        notes,
        setNotes,
    ] = useState('');

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
        isCreating,
        setIsCreating,
    ] = useState(false);

    const [
        busyBackupId,
        setBusyBackupId,
    ] = useState<number | null>(null);

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const loadBackups =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getDatabaseBackups(
                            token,
                            {
                                search,
                                status,
                                page,
                                perPage,
                            },
                        );

                    setBackups(
                        response.data,
                    );

                    setSummary(
                        response.summary,
                    );

                    setSettings(
                        response.settings,
                    );

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load database backups.',
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
        void loadBackups();
    }, [loadBackups]);

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

    const handleCreate =
        async (): Promise<void> => {
            if (
                !token
                || isCreating
            ) {
                return;
            }

            setIsCreating(true);
            setPageError('');
            setSuccessMessage('');

            try {
                const response =
                    await createDatabaseBackup(
                        token,
                        notes,
                    );

                setSuccessMessage(
                    response.message,
                );

                setNotes('');

                await loadBackups();
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : error instanceof Error
                            ? error.message
                            : 'Unable to create the database backup.',
                );
            } finally {
                setIsCreating(false);
            }
        };

    const handleDownload =
        async (
            backup: DatabaseBackup,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            setBusyBackupId(
                backup.id,
            );

            setPageError('');

            try {
                await downloadDatabaseBackup(
                    token,
                    backup.id,
                    backup.filename,
                );
            } catch (error) {
                setPageError(
                    error instanceof Error
                        ? error.message
                        : 'Unable to download the database backup.',
                );
            } finally {
                setBusyBackupId(null);
            }
        };

    const handleRestore =
        async (
            backup: DatabaseBackup,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            const confirmation =
                window.prompt(
                    `Restoring ${backup.backup_number} will replace the current database.\n\nA safety backup will be created automatically.\n\nType RESTORE to continue.`,
                );

            if (
                confirmation
                    ?.trim()
                    .toUpperCase()
                !== 'RESTORE'
            ) {
                return;
            }

            setBusyBackupId(
                backup.id,
            );

            setPageError('');
            setSuccessMessage('');

            try {
                const response =
                    await restoreDatabaseBackup(
                        token,
                        backup.id,
                    );

                setSuccessMessage(
                    `${response.message} Safety backup: ${response.data.safety_backup_number}`,
                );

                await loadBackups();
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : error instanceof Error
                            ? error.message
                            : 'Unable to restore the database backup.',
                );
            } finally {
                setBusyBackupId(null);
            }
        };

    const handleDelete =
        async (
            backup: DatabaseBackup,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            const confirmed =
                window.confirm(
                    `Delete ${backup.backup_number} and its SQL file?`,
                );

            if (!confirmed) {
                return;
            }

            setBusyBackupId(
                backup.id,
            );

            setPageError('');
            setSuccessMessage('');

            try {
                const response =
                    await deleteDatabaseBackup(
                        token,
                        backup.id,
                    );

                setSuccessMessage(
                    response.message,
                );

                await loadBackups();
            } catch (error) {
                setPageError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to delete the database backup.',
                );
            } finally {
                setBusyBackupId(null);
            }
        };

    return (
        <div id="sapo-backup-page">
            <style>
                {backupPageStyles}
            </style>

            <section className="bkp-header">
                <div>
                    <span className="bkp-kicker">
                        Data protection
                    </span>

                    <h2>
                        Backup and Restore
                    </h2>

                    <p>
                        Create, download, verify and
                        restore database backup files.
                    </p>
                </div>

                <button
                    type="button"
                    className="bkp-secondary-button"
                    disabled={
                        isLoading
                        || isCreating
                    }
                    onClick={() => {
                        void loadBackups();
                    }}
                >
                    Refresh
                </button>
            </section>

            <section className="bkp-summary-grid">
                <article>
                    <span>
                        Total Backups
                    </span>

                    <strong>
                        {summary.total_backups}
                    </strong>
                </article>

                <article>
                    <span>
                        Successful
                    </span>

                    <strong>
                        {
                            summary
                                .completed_backups
                        }
                    </strong>
                </article>

                <article>
                    <span>
                        Failed
                    </span>

                    <strong className="bkp-failed-value">
                        {
                            summary
                                .failed_backups
                        }
                    </strong>
                </article>

                <article>
                    <span>
                        Storage Used
                    </span>

                    <strong>
                        {formatBytes(
                            summary.total_size,
                        )}
                    </strong>
                </article>

                <article>
                    <span>
                        Latest Backup
                    </span>

                    <strong className="bkp-date-value">
                        {formatDateTime(
                            summary
                                .latest_completed_at,
                        )}
                    </strong>
                </article>
            </section>

            <section className="bkp-settings-banner">
                <div>
                    <span>
                        Automatic Backups
                    </span>

                    <strong>
                        {settings
                            .automatic_enabled
                            ? 'Enabled'
                            : 'Disabled'}
                    </strong>
                </div>

                <div>
                    <span>
                        Scheduled Time
                    </span>

                    <strong>
                        {settings
                            .automatic_time}
                    </strong>
                </div>

                <div>
                    <span>
                        Retention
                    </span>

                    <strong>
                        {settings
                            .retention_days}
                        {' '}days
                    </strong>
                </div>
            </section>

            {successMessage && (
                <div
                    className="bkp-success-alert"
                    role="status"
                >
                    <span>✓</span>

                    <p>
                        {successMessage}
                    </p>

                    <button
                        type="button"
                        aria-label="Dismiss"
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
                    className="bkp-form-alert"
                    role="alert"
                >
                    {pageError}
                </div>
            )}

            <section className="bkp-content-card bkp-create-panel">
                <header>
                    <span className="bkp-kicker">
                        Manual backup
                    </span>

                    <h3>
                        Create Database Backup
                    </h3>

                    <p>
                        The backup includes products,
                        stock, customers, sales,
                        purchases and settings.
                    </p>
                </header>

                <div className="bkp-create-form">
                    <label>
                        <span>
                            Backup Notes
                        </span>

                        <textarea
                            rows={3}
                            maxLength={1000}
                            value={notes}
                            placeholder="Example: Backup before stock correction"
                            disabled={isCreating}
                            onChange={(event) => {
                                setNotes(
                                    event.target.value,
                                );
                            }}
                        />
                    </label>

                    <button
                        type="button"
                        className="bkp-primary-button"
                        disabled={isCreating}
                        onClick={() => {
                            void handleCreate();
                        }}
                    >
                        {isCreating
                            ? 'Creating Backup...'
                            : 'Create Backup'}
                    </button>
                </div>
            </section>

            <section className="bkp-content-card">
                <div className="bkp-toolbar">
                    <input
                        type="search"
                        value={searchInput}
                        placeholder="Search backup number, filename or notes..."
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
                            All Statuses
                        </option>

                        <option value="completed">
                            Completed
                        </option>

                        <option value="restored">
                            Restored
                        </option>

                        <option value="failed">
                            Failed
                        </option>

                        <option value="processing">
                            Processing
                        </option>

                        <option value="restoring">
                            Restoring
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

                <div className="bkp-table-container">
                    <table className="bkp-table">
                        <thead>
                            <tr>
                                <th>Backup</th>
                                <th>Created</th>
                                <th>Database</th>
                                <th>Size</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Created By</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="bkp-table-state"
                                    >
                                        Loading database backups...
                                    </td>
                                </tr>
                            ) : backups.length
                                === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="bkp-table-state"
                                    >
                                        No database backups found.
                                    </td>
                                </tr>
                            ) : (
                                backups.map(
                                    (backup) => (
                                        <tr
                                            key={
                                                backup.id
                                            }
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        backup
                                                            .backup_number
                                                    }
                                                </strong>

                                                <small>
                                                    {
                                                        backup
                                                            .filename
                                                    }
                                                </small>

                                                {backup.notes && (
                                                    <small>
                                                        {
                                                            backup
                                                                .notes
                                                        }
                                                    </small>
                                                )}

                                                {backup
                                                    .error_message && (
                                                        <small className="bkp-error-message">
                                                            {
                                                                backup
                                                                    .error_message
                                                            }
                                                        </small>
                                                    )}
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    backup
                                                        .created_at,
                                                )}
                                            </td>

                                            <td>
                                                {
                                                    backup
                                                        .database_name
                                                }
                                            </td>

                                            <td>
                                                {formatBytes(
                                                    backup
                                                        .file_size,
                                                )}
                                            </td>

                                            <td>
                                                {backup
                                                    .is_scheduled
                                                    ? 'Scheduled'
                                                    : 'Manual'}
                                            </td>

                                            <td>
                                                <span
                                                    className={`bkp-status bkp-status-${backup.status}`}
                                                >
                                                    {statusName(
                                                        backup
                                                            .status,
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                {backup
                                                    .created_by
                                                    ?.name
                                                    ?? (
                                                        backup
                                                            .is_scheduled
                                                            ? 'System'
                                                            : 'Unknown'
                                                    )}
                                            </td>

                                            <td>
                                                <div className="bkp-actions">
                                                    <button
                                                        type="button"
                                                        className="bkp-download-button"
                                                        disabled={
                                                            !backup
                                                                .can_download
                                                            || busyBackupId
                                                            === backup.id
                                                        }
                                                        onClick={() => {
                                                            void handleDownload(
                                                                backup,
                                                            );
                                                        }}
                                                    >
                                                        Download
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="bkp-restore-button"
                                                        disabled={
                                                            !backup
                                                                .can_restore
                                                            || busyBackupId
                                                            === backup.id
                                                        }
                                                        onClick={() => {
                                                            void handleRestore(
                                                                backup,
                                                            );
                                                        }}
                                                    >
                                                        Restore
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="bkp-delete-button"
                                                        disabled={
                                                            busyBackupId
                                                            === backup.id
                                                        }
                                                        onClick={() => {
                                                            void handleDelete(
                                                                backup,
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
                    <footer className="bkp-pagination">
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

                            {' '}backups
                        </p>

                        <div className="bkp-pagination-controls">
                            <button
                                type="button"
                                className="bkp-pagination-button"
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
                                className="bkp-pagination-button"
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
        </div>
    );
}