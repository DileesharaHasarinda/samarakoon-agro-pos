import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {
    ChangeEvent,
} from 'react';

import {
    createPortal,
} from 'react-dom';

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
    uploadAndRestoreDatabaseBackup,
} from '../../services/databaseBackupService';

import type {
    DatabaseBackup,
    DatabaseBackupSettings,
    DatabaseBackupSummary,
} from '../../types/databaseBackup';

import type {
    PosPaginationMeta,
} from '../../types/sale';

const MAX_UPLOAD_SIZE =
    500 * 1024 * 1024;

const emptySummary:
    DatabaseBackupSummary = {
    total_backups: 0,
    completed_backups: 0,
    failed_backups: 0,
    total_size: 0,
    latest_completed_at: null,
};

const emptySettings:
    DatabaseBackupSettings = {
    automatic_enabled: false,
    automatic_time: '02:00',
    retention_days: 30,
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

type RestoreTarget =
    | {
        mode: 'existing';
        backup: DatabaseBackup;
    }
    | {
        mode: 'upload';
        file: File;
    };

function formatDateTime(
    value: string | null,
): string {
    if (!value) {
        return 'Not available';
    }

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
        },
    ).format(
        date,
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

    let unitIndex =
        0;

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

function errorMessage(
    error: unknown,
    fallback: string,
): string {
    if (
        error instanceof ApiError
        || error instanceof Error
    ) {
        return error.message;
    }

    return fallback;
}

const backupPageStyles = `
    #sapo-backup-page,
    #sapo-backup-page *,
    #sapo-backup-page *::before,
    #sapo-backup-page *::after,
    #sapo-backup-restore-confirmation,
    #sapo-backup-restore-confirmation *,
    #sapo-backup-restore-confirmation *::before,
    #sapo-backup-restore-confirmation *::after {
        box-sizing: border-box !important;
    }

    #sapo-backup-page {
        --bkp-green-900: #14532d;
        --bkp-green-800: #166534;
        --bkp-green-700: #15803d;
        --bkp-green-100: #dcfce7;
        --bkp-green-50: #f0fdf4;

        --bkp-red-800: #991b1b;
        --bkp-red-700: #b91c1c;
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

        --bkp-font:
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

        color: var(--bkp-text-secondary) !important;
        font-family: var(--bkp-font) !important;
        font-size: 15px !important;
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
    #sapo-backup-page td,
    #sapo-backup-restore-confirmation * {
        font-family: var(--bkp-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-backup-page h2,
    #sapo-backup-page h3,
    #sapo-backup-page p {
        margin: 0 !important;
    }

    /* =====================================================
       HEADER
       ===================================================== */

    #sapo-backup-page .bkp-header {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 18px !important;

        padding: 22px 24px !important;

        background: #ffffff !important;

        border: 1px solid var(--bkp-border) !important;
        border-radius: 12px !important;
    }

    #sapo-backup-page .bkp-kicker {
        display: inline-block !important;

        margin-bottom: 6px !important;

        color: var(--bkp-green-700) !important;

        font-size: 12px !important;
        font-weight: 800 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;

        background: transparent !important;
    }

    #sapo-backup-page .bkp-header h2 {
        margin-bottom: 5px !important;

        color: var(--bkp-text) !important;

        font-size: 24px !important;
        font-weight: 800 !important;
    }

    #sapo-backup-page .bkp-header p {
        max-width: 760px !important;

        color: var(--bkp-muted) !important;

        font-size: 14px !important;
    }

    /* =====================================================
       BUTTONS
       ===================================================== */

    #sapo-backup-page button,
    #sapo-backup-restore-confirmation button {
        -webkit-appearance: none !important;
        appearance: none !important;
    }

    #sapo-backup-page .bkp-primary-button,
    #sapo-backup-page .bkp-secondary-button,
    #sapo-backup-page .bkp-upload-button {
        display: inline-flex !important;
        min-height: 44px !important;
        align-items: center !important;
        justify-content: center !important;

        padding: 0 18px !important;

        border-radius: 9px !important;

        font-size: 14px !important;
        font-weight: 750 !important;

        cursor: pointer !important;
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
        background: #ffffff !important;
        border: 1px solid var(--bkp-border-strong) !important;
    }

    #sapo-backup-page .bkp-secondary-button:hover:not(:disabled) {
        background: #f9fafb !important;
    }

    #sapo-backup-page .bkp-upload-button {
        color: #ffffff !important;
        background: #b45309 !important;
        border: 1px solid #b45309 !important;
    }

    #sapo-backup-page .bkp-upload-button:hover:not(:disabled) {
        background: #92400e !important;
    }

    #sapo-backup-page button:disabled,
    #sapo-backup-restore-confirmation button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* =====================================================
       SUMMARY
       ===================================================== */

    #sapo-backup-page .bkp-summary-grid {
        display: grid !important;
        grid-template-columns:
            repeat(
                auto-fit,
                minmax(180px, 1fr)
            ) !important;
        gap: 14px !important;
    }

    #sapo-backup-page .bkp-summary-grid article {
        display: flex !important;
        flex-direction: column !important;
        gap: 5px !important;

        min-width: 0 !important;

        padding: 18px 20px !important;

        background: #ffffff !important;

        border: 1px solid var(--bkp-border) !important;
        border-radius: 11px !important;
    }

    #sapo-backup-page .bkp-summary-grid span {
        color: var(--bkp-muted) !important;

        font-size: 12px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;

        background: transparent !important;
    }

    #sapo-backup-page .bkp-summary-grid strong {
        color: var(--bkp-text) !important;

        font-size: 22px !important;
        font-weight: 800 !important;

        background: transparent !important;
    }

    #sapo-backup-page .bkp-summary-grid .bkp-failed-value {
        color: var(--bkp-red) !important;
    }

    #sapo-backup-page .bkp-summary-grid .bkp-date-value {
        font-size: 15px !important;
    }

    /* =====================================================
       SETTINGS
       ===================================================== */

    #sapo-backup-page .bkp-settings-banner {
        display: grid !important;
        grid-template-columns:
            repeat(
                3,
                minmax(0, 1fr)
            ) !important;
        gap: 14px !important;

        padding: 16px 20px !important;

        background: var(--bkp-blue-light) !important;

        border: 1px solid #bfdbfe !important;
        border-radius: 11px !important;
    }

    #sapo-backup-page .bkp-settings-banner > div {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 3px !important;
    }

    #sapo-backup-page .bkp-settings-banner span {
        color: var(--bkp-blue) !important;

        font-size: 12px !important;
        font-weight: 750 !important;

        background: transparent !important;
    }

    #sapo-backup-page .bkp-settings-banner strong {
        color: var(--bkp-text) !important;

        font-size: 15px !important;
        font-weight: 800 !important;

        background: transparent !important;
    }

    /* =====================================================
       ALERTS
       ===================================================== */

    #sapo-backup-page .bkp-success-alert,
    #sapo-backup-page .bkp-form-alert {
        display: flex !important;
        align-items: flex-start !important;
        gap: 10px !important;

        padding: 14px 16px !important;

        border-radius: 9px !important;

        font-size: 14px !important;
        font-weight: 650 !important;
    }

    #sapo-backup-page .bkp-success-alert {
        color: #166534 !important;
        background: var(--bkp-green-50) !important;
        border: 1px solid #bbf7d0 !important;
    }

    #sapo-backup-page .bkp-form-alert {
        color: #b91c1c !important;
        background: var(--bkp-red-light) !important;
        border: 1px solid #fecaca !important;
    }

    #sapo-backup-page .bkp-success-alert p {
        flex: 1 1 auto !important;

        color: inherit !important;
    }

    #sapo-backup-page .bkp-success-alert button {
        width: 30px !important;
        height: 30px !important;

        padding: 0 !important;

        color: #166534 !important;
        background: transparent !important;
        border: 0 !important;
        border-radius: 6px !important;

        font-size: 20px !important;
        cursor: pointer !important;
    }

    /* =====================================================
       PANELS
       ===================================================== */

    #sapo-backup-page .bkp-panel-grid {
        display: grid !important;
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
        gap: 16px !important;
        align-items: stretch !important;
    }

    #sapo-backup-page .bkp-content-card {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 16px !important;

        padding: 20px !important;

        background: #ffffff !important;

        border: 1px solid var(--bkp-border) !important;
        border-radius: 11px !important;
    }

    #sapo-backup-page .bkp-panel-header {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
    }

    #sapo-backup-page .bkp-panel-header h3 {
        color: var(--bkp-text) !important;

        font-size: 18px !important;
        font-weight: 800 !important;
    }

    #sapo-backup-page .bkp-panel-header p {
        color: var(--bkp-muted) !important;

        font-size: 14px !important;
        line-height: 1.55 !important;
    }

    /* =====================================================
       CREATE BACKUP
       ===================================================== */

    #sapo-backup-page .bkp-create-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;

        flex: 1 1 auto !important;
    }

    #sapo-backup-page .bkp-create-form label {
        display: flex !important;
        flex-direction: column !important;
        gap: 7px !important;

        flex: 1 1 auto !important;
    }

    #sapo-backup-page .bkp-field-label {
        color: var(--bkp-text-secondary) !important;

        font-size: 13px !important;
        font-weight: 750 !important;

        background: transparent !important;
    }

    #sapo-backup-page .bkp-create-form textarea {
        display: block !important;
        width: 100% !important;
        min-height: 100px !important;

        padding: 12px 13px !important;

        color: var(--bkp-text) !important;
        background: #ffffff !important;

        border: 1px solid var(--bkp-border-strong) !important;
        border-radius: 9px !important;

        outline: 0 !important;

        resize: vertical !important;

        font-size: 14px !important;
    }

    #sapo-backup-page .bkp-create-form textarea:focus {
        border-color: var(--bkp-green-700) !important;
        box-shadow:
            0 0 0 3px
            rgba(21, 128, 61, 0.12) !important;
    }

    #sapo-backup-page .bkp-create-form .bkp-primary-button {
        align-self: flex-start !important;
    }

    /* =====================================================
       UPLOAD RESTORE
       ===================================================== */

    #sapo-backup-page .bkp-upload-card {
        border-color: #fde68a !important;
        background:
            linear-gradient(
                180deg,
                #ffffff 0%,
                #fffdf7 100%
            ) !important;
    }

    #sapo-backup-page .bkp-upload-warning {
        display: flex !important;
        gap: 10px !important;
        align-items: flex-start !important;

        padding: 12px 14px !important;

        color: #92400e !important;
        background: #fffbeb !important;

        border: 1px solid #fde68a !important;
        border-radius: 9px !important;

        font-size: 13px !important;
        line-height: 1.55 !important;
    }

    #sapo-backup-page .bkp-upload-warning strong {
        color: #78350f !important;
    }

    #sapo-backup-page .bkp-file-input {
        position: absolute !important;

        width: 1px !important;
        height: 1px !important;

        overflow: hidden !important;

        clip: rect(0 0 0 0) !important;

        white-space: nowrap !important;
    }

    #sapo-backup-page .bkp-file-picker {
        display: flex !important;
        min-height: 92px !important;
        align-items: center !important;
        justify-content: center !important;

        padding: 18px !important;

        color: var(--bkp-text-secondary) !important;
        background: #ffffff !important;

        border: 2px dashed #d6b66b !important;
        border-radius: 10px !important;

        text-align: center !important;

        cursor: pointer !important;
    }

    #sapo-backup-page .bkp-file-picker:hover {
        background: #fffbeb !important;
        border-color: #b45309 !important;
    }

    #sapo-backup-page .bkp-file-picker strong {
        display: block !important;

        margin-bottom: 3px !important;

        color: #92400e !important;

        font-size: 14px !important;
    }

    #sapo-backup-page .bkp-file-picker span {
        color: var(--bkp-muted) !important;

        font-size: 12px !important;

        background: transparent !important;
    }

    #sapo-backup-page .bkp-selected-file {
        display: grid !important;
        grid-template-columns:
            minmax(0, 1fr)
            auto !important;
        gap: 12px !important;
        align-items: center !important;

        padding: 12px 14px !important;

        background: #ffffff !important;

        border: 1px solid #fde68a !important;
        border-radius: 9px !important;
    }

    #sapo-backup-page .bkp-selected-file-copy {
        min-width: 0 !important;
    }

    #sapo-backup-page .bkp-selected-file-copy strong {
        display: block !important;

        overflow: hidden !important;

        color: var(--bkp-text) !important;

        font-size: 14px !important;
        font-weight: 800 !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-backup-page .bkp-selected-file-copy span {
        display: block !important;

        margin-top: 2px !important;

        color: var(--bkp-muted) !important;

        font-size: 12px !important;

        background: transparent !important;
    }

    #sapo-backup-page .bkp-clear-file {
        min-height: 36px !important;

        padding: 0 12px !important;

        color: #b91c1c !important;
        background: #ffffff !important;

        border: 1px solid #fecaca !important;
        border-radius: 7px !important;

        font-size: 12px !important;
        font-weight: 750 !important;

        cursor: pointer !important;
    }

    #sapo-backup-page .bkp-upload-actions {
        margin-top: auto !important;
    }

    /* =====================================================
       HISTORY
       ===================================================== */

    #sapo-backup-page .bkp-history-card {
        padding: 20px !important;
    }

    #sapo-backup-page .bkp-toolbar {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 10px !important;
    }

    #sapo-backup-page .bkp-toolbar input[type="search"] {
        flex: 1 1 280px !important;

        min-height: 42px !important;

        padding: 0 13px !important;

        color: var(--bkp-text) !important;
        background: #f9fafb !important;

        border: 1px solid var(--bkp-border-strong) !important;
        border-radius: 8px !important;

        outline: 0 !important;

        font-size: 14px !important;
    }

    #sapo-backup-page .bkp-toolbar select {
        min-width: 150px !important;
        min-height: 42px !important;

        padding: 0 12px !important;

        color: var(--bkp-text-secondary) !important;
        background: #f9fafb !important;

        border: 1px solid var(--bkp-border-strong) !important;
        border-radius: 8px !important;

        outline: 0 !important;

        font-size: 14px !important;
    }

    #sapo-backup-page .bkp-toolbar input:focus,
    #sapo-backup-page .bkp-toolbar select:focus {
        background: #ffffff !important;
        border-color: var(--bkp-green-700) !important;

        box-shadow:
            0 0 0 3px
            rgba(21, 128, 61, 0.12) !important;
    }

    /* =====================================================
       TABLE
       ===================================================== */

    #sapo-backup-page .bkp-table-container {
        width: 100% !important;
        max-height: 560px !important;

        overflow-x: auto !important;
        overflow-y: auto !important;

        background: #ffffff !important;

        border: 1px solid var(--bkp-border) !important;
        border-radius: 9px !important;

        scrollbar-width: thin !important;
    }

    #sapo-backup-page .bkp-table {
        width: 100% !important;
        min-width: 1120px !important;

        border-collapse: collapse !important;

        background: #ffffff !important;
    }

    #sapo-backup-page .bkp-table thead {
        position: sticky !important;
        top: 0 !important;

        z-index: 2 !important;
    }

    #sapo-backup-page .bkp-table th {
        padding: 13px 14px !important;

        color: var(--bkp-muted) !important;
        background: #f9fafb !important;

        border-bottom: 1px solid var(--bkp-border) !important;

        text-align: left !important;
        white-space: nowrap !important;

        font-size: 12px !important;
        font-weight: 800 !important;
        text-transform: uppercase !important;
    }

    #sapo-backup-page .bkp-table td {
        padding: 14px !important;

        color: var(--bkp-text-secondary) !important;
        background: #ffffff !important;

        border-bottom: 1px solid #f1f5f9 !important;

        vertical-align: middle !important;

        font-size: 14px !important;
    }

    #sapo-backup-page .bkp-table tbody tr:hover td {
        background: #fafafa !important;
    }

    #sapo-backup-page .bkp-table td strong {
        display: block !important;

        color: var(--bkp-text) !important;

        font-weight: 800 !important;

        background: transparent !important;
    }

    #sapo-backup-page .bkp-table td small {
        display: block !important;

        margin-top: 3px !important;

        color: #8b95a3 !important;

        font-size: 12px !important;
        line-height: 1.45 !important;

        background: transparent !important;
    }

    #sapo-backup-page .bkp-table td .bkp-error-message {
        color: #b91c1c !important;
    }

    #sapo-backup-page .bkp-table-state {
        padding: 44px 16px !important;

        color: var(--bkp-muted) !important;

        text-align: center !important;
    }

    /* =====================================================
       STATUS
       ===================================================== */

    #sapo-backup-page .bkp-status {
        display: inline-flex !important;
        align-items: center !important;

        padding: 5px 10px !important;

        border-radius: 999px !important;

        font-size: 12px !important;
        font-weight: 750 !important;

        white-space: nowrap !important;
    }

    #sapo-backup-page .bkp-status-completed {
        color: #166534 !important;
        background: #dcfce7 !important;
    }

    #sapo-backup-page .bkp-status-restored {
        color: #1d4ed8 !important;
        background: #dbeafe !important;
    }

    #sapo-backup-page .bkp-status-failed {
        color: #b91c1c !important;
        background: #fee2e2 !important;
    }

    #sapo-backup-page .bkp-status-processing,
    #sapo-backup-page .bkp-status-restoring {
        color: #92400e !important;
        background: #fef3c7 !important;
    }

    /* =====================================================
       ACTIONS
       ===================================================== */

    #sapo-backup-page .bkp-actions {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 7px !important;
    }

    #sapo-backup-page .bkp-download-button,
    #sapo-backup-page .bkp-restore-button,
    #sapo-backup-page .bkp-delete-button {
        min-height: 36px !important;

        padding: 0 11px !important;

        border-radius: 7px !important;

        font-size: 12px !important;
        font-weight: 750 !important;

        cursor: pointer !important;
    }

    #sapo-backup-page .bkp-download-button {
        color: #1d4ed8 !important;
        background: #eff6ff !important;
        border: 1px solid #bfdbfe !important;
    }

    #sapo-backup-page .bkp-restore-button {
        color: #92400e !important;
        background: #fffbeb !important;
        border: 1px solid #fde68a !important;
    }

    #sapo-backup-page .bkp-delete-button {
        color: #b91c1c !important;
        background: #fef2f2 !important;
        border: 1px solid #fecaca !important;
    }

    #sapo-backup-page .bkp-download-button:hover:not(:disabled) {
        color: #ffffff !important;
        background: #2563eb !important;
    }

    #sapo-backup-page .bkp-restore-button:hover:not(:disabled) {
        color: #ffffff !important;
        background: #b45309 !important;
    }

    #sapo-backup-page .bkp-delete-button:hover:not(:disabled) {
        color: #ffffff !important;
        background: #dc2626 !important;
    }

    /* =====================================================
       PAGINATION
       ===================================================== */

    #sapo-backup-page .bkp-pagination {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
    }

    #sapo-backup-page .bkp-pagination p,
    #sapo-backup-page .bkp-pagination-controls span {
        color: var(--bkp-muted) !important;

        font-size: 13px !important;
    }

    #sapo-backup-page .bkp-pagination strong {
        color: var(--bkp-text) !important;

        background: transparent !important;
    }

    #sapo-backup-page .bkp-pagination-controls {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
    }

    #sapo-backup-page .bkp-pagination-button {
        min-height: 38px !important;

        padding: 0 14px !important;

        color: #374151 !important;
        background: #ffffff !important;

        border: 1px solid var(--bkp-border-strong) !important;
        border-radius: 7px !important;

        font-size: 13px !important;
        font-weight: 700 !important;

        cursor: pointer !important;
    }

    /* =====================================================
       RESTORE MODAL
       ===================================================== */

    #sapo-backup-restore-confirmation {
        position: fixed !important;
        inset: 0 !important;

        z-index: 999999 !important;

        display: flex !important;
        align-items: center !important;
        justify-content: center !important;

        padding: 24px !important;

        background:
            rgba(
                15,
                23,
                42,
                0.68
            ) !important;

        backdrop-filter:
            blur(4px) !important;

        font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Helvetica,
            Arial,
            sans-serif !important;
    }

    #sapo-backup-restore-confirmation .bkp-modal {
        display: flex !important;
        width: min(620px, 100%) !important;
        max-height:
            calc(100dvh - 48px) !important;
        flex-direction: column !important;

        overflow: hidden !important;

        background: #ffffff !important;

        border: 1px solid #d1d5db !important;
        border-radius: 16px !important;

        box-shadow:
            0 30px 90px
            rgba(15, 23, 42, 0.38) !important;
    }

    #sapo-backup-restore-confirmation .bkp-modal-header {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 14px !important;

        padding: 20px 22px !important;

        border-bottom: 1px solid #e5e7eb !important;
    }

    #sapo-backup-restore-confirmation .bkp-modal-header h3 {
        margin: 0 0 3px !important;

        color: #991b1b !important;

        font-size: 20px !important;
        font-weight: 850 !important;
    }

    #sapo-backup-restore-confirmation .bkp-modal-header p {
        margin: 0 !important;

        color: #6b7280 !important;

        font-size: 13px !important;
    }

    #sapo-backup-restore-confirmation .bkp-modal-close {
        width: 38px !important;
        height: 38px !important;
        flex: 0 0 38px !important;

        padding: 0 !important;

        color: #4b5563 !important;
        background: #f3f4f6 !important;

        border: 0 !important;
        border-radius: 9px !important;

        font-size: 24px !important;
        line-height: 1 !important;

        cursor: pointer !important;
    }

    #sapo-backup-restore-confirmation .bkp-modal-body {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;

        padding: 20px 22px !important;

        overflow-y: auto !important;
    }

    #sapo-backup-restore-confirmation .bkp-danger-box {
        padding: 14px 16px !important;

        color: #991b1b !important;
        background: #fef2f2 !important;

        border: 1px solid #fecaca !important;
        border-radius: 10px !important;

        font-size: 14px !important;
        line-height: 1.6 !important;
    }

    #sapo-backup-restore-confirmation .bkp-danger-box strong {
        display: block !important;

        margin-bottom: 3px !important;

        color: #7f1d1d !important;

        font-size: 15px !important;
    }

    #sapo-backup-restore-confirmation .bkp-target-box {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;

        padding: 14px 16px !important;

        background: #f9fafb !important;

        border: 1px solid #e5e7eb !important;
        border-radius: 10px !important;
    }

    #sapo-backup-restore-confirmation .bkp-target-box span {
        color: #6b7280 !important;

        font-size: 12px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
    }

    #sapo-backup-restore-confirmation .bkp-target-box strong {
        overflow-wrap: anywhere !important;

        color: #111827 !important;

        font-size: 14px !important;
        font-weight: 800 !important;
    }

    #sapo-backup-restore-confirmation .bkp-restore-process {
        margin: 0 !important;
        padding-left: 22px !important;

        color: #374151 !important;

        font-size: 14px !important;
        line-height: 1.75 !important;
    }

    #sapo-backup-restore-confirmation .bkp-confirm-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 7px !important;
    }

    #sapo-backup-restore-confirmation .bkp-confirm-field span {
        color: #374151 !important;

        font-size: 13px !important;
        font-weight: 750 !important;
    }

    #sapo-backup-restore-confirmation .bkp-confirm-field strong {
        color: #991b1b !important;
    }

    #sapo-backup-restore-confirmation .bkp-confirm-field input {
        display: block !important;
        width: 100% !important;
        min-height: 46px !important;

        padding: 0 13px !important;

        color: #111827 !important;
        background: #ffffff !important;

        border: 1px solid #d1d5db !important;
        border-radius: 9px !important;

        outline: 0 !important;

        font-size: 15px !important;
        font-weight: 750 !important;
    }

    #sapo-backup-restore-confirmation .bkp-confirm-field input:focus {
        border-color: #dc2626 !important;

        box-shadow:
            0 0 0 3px
            rgba(220, 38, 38, 0.12) !important;
    }

    #sapo-backup-restore-confirmation .bkp-modal-footer {
        display: flex !important;
        justify-content: flex-end !important;
        gap: 10px !important;

        padding: 16px 22px !important;

        background: #f9fafb !important;

        border-top: 1px solid #e5e7eb !important;
    }

    #sapo-backup-restore-confirmation .bkp-modal-cancel,
    #sapo-backup-restore-confirmation .bkp-modal-restore {
        min-height: 44px !important;

        padding: 0 18px !important;

        border-radius: 9px !important;

        font-size: 14px !important;
        font-weight: 800 !important;

        cursor: pointer !important;
    }

    #sapo-backup-restore-confirmation .bkp-modal-cancel {
        color: #374151 !important;
        background: #ffffff !important;

        border: 1px solid #d1d5db !important;
    }

    #sapo-backup-restore-confirmation .bkp-modal-restore {
        color: #ffffff !important;
        background: #dc2626 !important;

        border: 1px solid #dc2626 !important;
    }

    #sapo-backup-restore-confirmation .bkp-modal-restore:hover:not(:disabled) {
        background: #b91c1c !important;
    }

    /* =====================================================
       RESPONSIVE
       ===================================================== */

    @media (max-width: 980px) {
        #sapo-backup-page .bkp-panel-grid {
            grid-template-columns: 1fr !important;
        }
    }

    @media (max-width: 760px) {
        #sapo-backup-page .bkp-header {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-backup-page .bkp-settings-banner {
            grid-template-columns: 1fr !important;
        }

        #sapo-backup-page .bkp-toolbar {
            flex-direction: column !important;
        }

        #sapo-backup-page .bkp-toolbar input,
        #sapo-backup-page .bkp-toolbar select {
            width: 100% !important;
        }

        #sapo-backup-page .bkp-pagination {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-backup-page .bkp-pagination-controls {
            justify-content: space-between !important;
        }

        #sapo-backup-restore-confirmation {
            align-items: flex-end !important;

            padding: 0 !important;
        }

        #sapo-backup-restore-confirmation .bkp-modal {
            width: 100% !important;
            max-height: 96dvh !important;

            border-right: 0 !important;
            border-bottom: 0 !important;
            border-left: 0 !important;

            border-radius:
                16px 16px 0 0 !important;
        }

        #sapo-backup-restore-confirmation .bkp-modal-footer {
            display: grid !important;
            grid-template-columns:
                repeat(
                    2,
                    minmax(0, 1fr)
                ) !important;
        }

        #sapo-backup-restore-confirmation .bkp-modal-footer button {
            width: 100% !important;
        }
    }
`;

export default function BackupRestorePage() {
    const {
        token,
    } = useAuth();

    const uploadInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const [
        backups,
        setBackups,
    ] =
        useState<DatabaseBackup[]>(
            [],
        );

    const [
        summary,
        setSummary,
    ] =
        useState(
            emptySummary,
        );

    const [
        settings,
        setSettings,
    ] =
        useState(
            emptySettings,
        );

    const [
        pagination,
        setPagination,
    ] =
        useState(
            emptyPagination,
        );

    const [
        notes,
        setNotes,
    ] =
        useState(
            '',
        );

    const [
        selectedUpload,
        setSelectedUpload,
    ] =
        useState<File | null>(
            null,
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
            'all',
        );

    const [
        page,
        setPage,
    ] =
        useState(
            1,
        );

    const [
        perPage,
        setPerPage,
    ] =
        useState(
            20,
        );

    const [
        isLoading,
        setIsLoading,
    ] =
        useState(
            true,
        );

    const [
        isCreating,
        setIsCreating,
    ] =
        useState(
            false,
        );

    const [
        busyBackupId,
        setBusyBackupId,
    ] =
        useState<
            number | null
        >(
            null,
        );

    const [
        restoreTarget,
        setRestoreTarget,
    ] =
        useState<
            RestoreTarget | null
        >(
            null,
        );

    const [
        restoreConfirmation,
        setRestoreConfirmation,
    ] =
        useState(
            '',
        );

    const [
        isRestoring,
        setIsRestoring,
    ] =
        useState(
            false,
        );

    const [
        pageError,
        setPageError,
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

    const loadBackups =
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

                setPageError(
                    '',
                );

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
                        errorMessage(
                            error,
                            'Unable to load database backups.',
                        ),
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
                perPage,
            ],
        );

    useEffect(
        () => {
            void loadBackups();
        },
        [
            loadBackups,
        ],
    );

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

    const handleCreate =
        async (): Promise<void> => {
            if (
                !token
                || isCreating
                || isRestoring
            ) {
                return;
            }

            setIsCreating(
                true,
            );

            setPageError(
                '',
            );

            setSuccessMessage(
                '',
            );

            try {
                const response =
                    await createDatabaseBackup(
                        token,
                        notes,
                    );

                setSuccessMessage(
                    response.message,
                );

                setNotes(
                    '',
                );

                await loadBackups();
            } catch (error) {
                setPageError(
                    errorMessage(
                        error,
                        'Unable to create the database backup.',
                    ),
                );
            } finally {
                setIsCreating(
                    false,
                );
            }
        };

    const handleDownload =
        async (
            backup: DatabaseBackup,
        ): Promise<void> => {
            if (
                !token
                || isRestoring
            ) {
                return;
            }

            setBusyBackupId(
                backup.id,
            );

            setPageError(
                '',
            );

            try {
                await downloadDatabaseBackup(
                    token,
                    backup.id,
                    backup.filename,
                );
            } catch (error) {
                setPageError(
                    errorMessage(
                        error,
                        'Unable to download the database backup.',
                    ),
                );
            } finally {
                setBusyBackupId(
                    null,
                );
            }
        };

    const handleUploadSelection = (
        event:
            ChangeEvent<HTMLInputElement>,
    ): void => {
        setPageError(
            '',
        );

        setSuccessMessage(
            '',
        );

        const file =
            event.target
                .files?.[0]
            ?? null;

        if (!file) {
            setSelectedUpload(
                null,
            );

            return;
        }

        if (
            !file.name
                .toLowerCase()
                .endsWith(
                    '.sql',
                )
        ) {
            setSelectedUpload(
                null,
            );

            setPageError(
                'Only .sql database backup files can be selected.',
            );

            event.target.value =
                '';

            return;
        }

        if (
            file.size <= 0
        ) {
            setSelectedUpload(
                null,
            );

            setPageError(
                'The selected database backup file is empty.',
            );

            event.target.value =
                '';

            return;
        }

        if (
            file.size
            > MAX_UPLOAD_SIZE
        ) {
            setSelectedUpload(
                null,
            );

            setPageError(
                'The selected backup is larger than the 500 MB upload limit.',
            );

            event.target.value =
                '';

            return;
        }

        setSelectedUpload(
            file,
        );
    };

    const clearSelectedUpload =
        (): void => {
            if (
                isRestoring
            ) {
                return;
            }

            setSelectedUpload(
                null,
            );

            if (
                uploadInputRef.current
            ) {
                uploadInputRef.current.value =
                    '';
            }
        };

    const openExistingRestore = (
        backup: DatabaseBackup,
    ): void => {
        if (
            isRestoring
        ) {
            return;
        }

        setPageError(
            '',
        );

        setSuccessMessage(
            '',
        );

        setRestoreConfirmation(
            '',
        );

        setRestoreTarget({
            mode:
                'existing',

            backup,
        });
    };

    const openUploadRestore =
        (): void => {
            if (
                !selectedUpload
                || isRestoring
            ) {
                return;
            }

            setPageError(
                '',
            );

            setSuccessMessage(
                '',
            );

            setRestoreConfirmation(
                '',
            );

            setRestoreTarget({
                mode:
                    'upload',

                file:
                    selectedUpload,
            });
        };

    const closeRestoreModal =
        (): void => {
            if (
                isRestoring
            ) {
                return;
            }

            setRestoreTarget(
                null,
            );

            setRestoreConfirmation(
                '',
            );
        };

    const handleConfirmedRestore =
        async (): Promise<void> => {
            if (
                !token
                || !restoreTarget
                || isRestoring
            ) {
                return;
            }

            if (
                restoreConfirmation
                    .trim()
                    .toUpperCase()
                !== 'RESTORE'
            ) {
                return;
            }

            setIsRestoring(
                true,
            );

            setPageError(
                '',
            );

            setSuccessMessage(
                '',
            );

            if (
                restoreTarget.mode
                === 'existing'
            ) {
                setBusyBackupId(
                    restoreTarget
                        .backup
                        .id,
                );
            }

            try {
                const response =
                    restoreTarget.mode
                        === 'existing'
                        ? await restoreDatabaseBackup(
                            token,
                            restoreTarget
                                .backup
                                .id,
                        )
                        : await uploadAndRestoreDatabaseBackup(
                            token,
                            restoreTarget
                                .file,
                        );

                const safetyBackup =
                    response
                        .data
                        .safety_backup_number;

                setSuccessMessage(
                    `${response.message} Safety backup: ${safetyBackup}. The application will now reload.`,
                );

                setRestoreTarget(
                    null,
                );

                setRestoreConfirmation(
                    '',
                );

                if (
                    restoreTarget.mode
                    === 'upload'
                ) {
                    setSelectedUpload(
                        null,
                    );

                    if (
                        uploadInputRef
                            .current
                    ) {
                        uploadInputRef
                            .current
                            .value =
                            '';
                    }
                }

                /*
                 * IMPORTANT:
                 *
                 * Do not call loadBackups() here.
                 *
                 * The restored database may contain
                 * an older personal_access_tokens
                 * table, so the currently-used
                 * Sanctum token can disappear.
                 *
                 * Reload the application instead so
                 * authentication is checked again.
                 */
                window.setTimeout(
                    () => {
                        window.location
                            .reload();
                    },
                    1800,
                );
            } catch (error) {
                setPageError(
                    errorMessage(
                        error,
                        restoreTarget.mode
                            === 'upload'
                            ? 'Unable to restore the uploaded database backup.'
                            : 'Unable to restore the database backup.',
                    ),
                );

                setIsRestoring(
                    false,
                );

                setBusyBackupId(
                    null,
                );
            }
        };

    const handleDelete =
        async (
            backup: DatabaseBackup,
        ): Promise<void> => {
            if (
                !token
                || isRestoring
            ) {
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

            setPageError(
                '',
            );

            setSuccessMessage(
                '',
            );

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
                    errorMessage(
                        error,
                        'Unable to delete the database backup.',
                    ),
                );
            } finally {
                setBusyBackupId(
                    null,
                );
            }
        };

    const restoreTargetName =
        restoreTarget?.mode
            === 'existing'
            ? restoreTarget
                .backup
                .backup_number
            : restoreTarget?.mode
                === 'upload'
                ? restoreTarget
                    .file
                    .name
                : '';

    const confirmationValid =
        restoreConfirmation
            .trim()
            .toUpperCase()
        === 'RESTORE';

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
                        Create database backups,
                        download recovery files,
                        upload external SQL backups
                        and safely restore the
                        database.
                    </p>
                </div>

                <button
                    type="button"
                    className="bkp-secondary-button"
                    disabled={
                        isLoading
                        || isCreating
                        || isRestoring
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
                        {
                            summary
                                .total_backups
                        }
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
                            summary
                                .total_size,
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
                        {
                            settings
                                .automatic_time
                        }
                    </strong>
                </div>

                <div>
                    <span>
                        Retention
                    </span>

                    <strong>
                        {
                            settings
                                .retention_days
                        }
                        {' '}days
                    </strong>
                </div>
            </section>

            {successMessage && (
                <div
                    className="bkp-success-alert"
                    role="status"
                >
                    <p>
                        {successMessage}
                    </p>

                    <button
                        type="button"
                        aria-label="Dismiss success message"
                        onClick={() => {
                            setSuccessMessage(
                                '',
                            );
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

            <section className="bkp-panel-grid">
                <article className="bkp-content-card">
                    <header className="bkp-panel-header">
                        <h3>
                            Create New Backup
                        </h3>

                        <p>
                            Create a new SQL backup
                            from the database that is
                            running right now.
                        </p>
                    </header>

                    <div className="bkp-create-form">
                        <label>
                            <span className="bkp-field-label">
                                Notes — Optional
                            </span>

                            <textarea
                                value={notes}
                                maxLength={1000}
                                disabled={
                                    isCreating
                                    || isRestoring
                                }
                                placeholder="Example: Backup before stock update"
                                onChange={(event) => {
                                    setNotes(
                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <button
                            type="button"
                            className="bkp-primary-button"
                            disabled={
                                isCreating
                                || isRestoring
                            }
                            onClick={() => {
                                void handleCreate();
                            }}
                        >
                            {isCreating
                                ? 'Creating Backup...'
                                : 'Create Backup'}
                        </button>
                    </div>
                </article>

                <article className="bkp-content-card bkp-upload-card">
                    <header className="bkp-panel-header">
                        <h3>
                            Upload & Restore Backup
                        </h3>

                        <p>
                            Select a trusted SQL
                            backup file from your
                            computer and restore it.
                        </p>
                    </header>

                    <input
                        ref={uploadInputRef}
                        id="sapo-backup-upload-file"
                        type="file"
                        className="bkp-file-input"
                        accept=".sql,application/sql,text/sql,text/plain"
                        disabled={isRestoring}
                        onChange={
                            handleUploadSelection
                        }
                    />

                    <label
                        htmlFor="sapo-backup-upload-file"
                        className="bkp-file-picker"
                    >
                        <div>
                            <strong>
                                Choose SQL Backup File
                            </strong>

                            <span>
                                Only trusted .sql
                                backups • Maximum
                                500 MB
                            </span>
                        </div>
                    </label>

                    {selectedUpload && (
                        <div className="bkp-selected-file">
                            <div className="bkp-selected-file-copy">
                                <strong title={selectedUpload.name}>
                                    {
                                        selectedUpload
                                            .name
                                    }
                                </strong>

                                <span>
                                    {formatBytes(
                                        selectedUpload
                                            .size,
                                    )}
                                </span>
                            </div>

                            <button
                                type="button"
                                className="bkp-clear-file"
                                disabled={isRestoring}
                                onClick={
                                    clearSelectedUpload
                                }
                            >
                                Remove
                            </button>
                        </div>
                    )}

                    <div className="bkp-upload-actions">
                        <button
                            type="button"
                            className="bkp-upload-button"
                            disabled={
                                !selectedUpload
                                || isRestoring
                                || isCreating
                            }
                            onClick={
                                openUploadRestore
                            }
                        >
                            {isRestoring
                                && restoreTarget
                                    ?.mode
                                === 'upload'
                                ? 'Restoring...'
                                : 'Upload & Restore'}
                        </button>
                    </div>
                </article>
            </section>

            <section className="bkp-content-card bkp-history-card">
                <header className="bkp-panel-header">
                    <h3>
                        Backup History
                    </h3>

                    <p>
                        Download, restore or remove
                        existing database backups.
                    </p>
                </header>

                <div className="bkp-toolbar">
                    <input
                        type="search"
                        value={searchInput}
                        placeholder="Search backup number, filename or notes..."
                        disabled={isRestoring}
                        onChange={(event) => {
                            setSearchInput(
                                event
                                    .target
                                    .value,
                            );
                        }}
                    />

                    <select
                        value={status}
                        disabled={isRestoring}
                        onChange={(event) => {
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
                        disabled={isRestoring}
                        onChange={(event) => {
                            setPerPage(
                                Number(
                                    event
                                        .target
                                        .value,
                                ),
                            );

                            setPage(
                                1,
                            );
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
                                <th>
                                    Backup
                                </th>

                                <th>
                                    Created
                                </th>

                                <th>
                                    Database
                                </th>

                                <th>
                                    Size
                                </th>

                                <th>
                                    Type
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Created By
                                </th>

                                <th>
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="bkp-table-state"
                                    >
                                        Loading database
                                        backups...
                                    </td>
                                </tr>
                            ) : backups.length
                                === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="bkp-table-state"
                                    >
                                        No database
                                        backups found.
                                    </td>
                                </tr>
                            ) : (
                                backups.map(
                                    (
                                        backup,
                                    ) => (
                                        <tr
                                            key={
                                                backup
                                                    .id
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
                                                    : backup.notes
                                                        ?.startsWith(
                                                            'Uploaded database backup:',
                                                        )
                                                        ? 'Uploaded'
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
                                                            || isRestoring
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
                                                            || isRestoring
                                                        }
                                                        onClick={() => {
                                                            openExistingRestore(
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
                                                            || isRestoring
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
                                {
                                    pagination
                                        .from
                                }
                            </strong>

                            {' '}to{' '}

                            <strong>
                                {
                                    pagination
                                        .to
                                }
                            </strong>

                            {' '}of{' '}

                            <strong>
                                {
                                    pagination
                                        .total
                                }
                            </strong>

                            {' '}backups
                        </p>

                        <div className="bkp-pagination-controls">
                            <button
                                type="button"
                                className="bkp-pagination-button"
                                disabled={
                                    page <= 1
                                    || isRestoring
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
                                    || isRestoring
                                }
                                onClick={() => {
                                    setPage(
                                        (
                                            current,
                                        ) =>
                                            Math.min(
                                                pagination
                                                    .last_page,
                                                current
                                                + 1,
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

            {restoreTarget
                && createPortal(
                    <div
                        id="sapo-backup-restore-confirmation"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (
                                event.target
                                === event.currentTarget
                                && !isRestoring
                            ) {
                                closeRestoreModal();
                            }
                        }}
                    >
                        <section
                            className="bkp-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="bkp-restore-title"
                        >
                            <header className="bkp-modal-header">
                                <div>
                                    <h3 id="bkp-restore-title">
                                        Restore Database
                                    </h3>

                                    <p>
                                        Confirm this
                                        destructive database
                                        operation.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="bkp-modal-close"
                                    aria-label="Close restore confirmation"
                                    disabled={isRestoring}
                                    onClick={
                                        closeRestoreModal
                                    }
                                >
                                    ×
                                </button>
                            </header>

                            <div className="bkp-modal-body">
                                <div className="bkp-danger-box">
                                    <strong>
                                        Current database
                                        data will be
                                        replaced
                                    </strong>

                                    Do not run this
                                    operation while a
                                    cashier is processing
                                    a sale, payment,
                                    return or while an
                                    administrator is
                                    processing a purchase.
                                </div>

                                <div className="bkp-target-box">
                                    <span>
                                        Restore From
                                    </span>

                                    <strong>
                                        {
                                            restoreTargetName
                                        }
                                    </strong>

                                    {restoreTarget.mode
                                        === 'upload'
                                        && (
                                            <span>
                                                {formatBytes(
                                                    restoreTarget
                                                        .file
                                                        .size,
                                                )}
                                            </span>
                                        )}
                                </div>

                                <ol className="bkp-restore-process">
                                    {restoreTarget.mode
                                        === 'upload'
                                        && (
                                            <li>
                                                Save and
                                                validate the
                                                uploaded SQL
                                                file.
                                            </li>
                                        )}

                                    <li>
                                        Create a new
                                        automatic safety
                                        backup of the
                                        current database.
                                    </li>

                                    <li>
                                        Attempt the
                                        configured
                                        Cloudflare R2
                                        backup copy.
                                    </li>

                                    <li>
                                        Replace the
                                        current database
                                        using the selected
                                        SQL backup.
                                    </li>

                                    <li>
                                        Reload the
                                        application and
                                        verify the restored
                                        login session.
                                    </li>
                                </ol>

                                <label className="bkp-confirm-field">
                                    <span>
                                        Type{' '}
                                        <strong>
                                            RESTORE
                                        </strong>
                                        {' '}to continue
                                    </span>

                                    <input
                                        type="text"
                                        value={
                                            restoreConfirmation
                                        }
                                        disabled={
                                            isRestoring
                                        }
                                        autoFocus
                                        autoComplete="off"
                                        spellCheck={false}
                                        placeholder="RESTORE"
                                        onChange={(event) => {
                                            setRestoreConfirmation(
                                                event
                                                    .target
                                                    .value,
                                            );
                                        }}
                                        onKeyDown={(event) => {
                                            if (
                                                event.key
                                                === 'Enter'
                                                && confirmationValid
                                                && !isRestoring
                                            ) {
                                                event.preventDefault();

                                                void handleConfirmedRestore();
                                            }
                                        }}
                                    />
                                </label>
                            </div>

                            <footer className="bkp-modal-footer">
                                <button
                                    type="button"
                                    className="bkp-modal-cancel"
                                    disabled={isRestoring}
                                    onClick={
                                        closeRestoreModal
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="bkp-modal-restore"
                                    disabled={
                                        !confirmationValid
                                        || isRestoring
                                    }
                                    onClick={() => {
                                        void handleConfirmedRestore();
                                    }}
                                >
                                    {isRestoring
                                        ? 'Restoring Database...'
                                        : 'Restore Database'}
                                </button>
                            </footer>
                        </section>
                    </div>,
                    document.body,
                )}
        </div>
    );
}