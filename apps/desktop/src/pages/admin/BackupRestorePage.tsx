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

export default function BackupRestorePage() {
    const {
        token,
    } = useAuth();

    const [
        backups,
        setBackups,
    ] = useState<
        DatabaseBackup[]
    >([]);

    const [
        summary,
        setSummary,
    ] = useState(
        emptySummary,
    );

    const [
        settings,
        setSettings,
    ] = useState(
        emptySettings,
    );

    const [
        pagination,
        setPagination,
    ] = useState(
        emptyPagination,
    );

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
    ] = useState<number | null>(
        null,
    );

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
        <div className="page-stack">
            <section className="backup-page-header">
                <div>
                    <span className="page-kicker">
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
                    className="secondary-button"
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

            <section className="backup-summary-grid">
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

                    <strong className="backup-failed-value">
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

                    <strong className="backup-date-value">
                        {formatDateTime(
                            summary
                                .latest_completed_at,
                        )}
                    </strong>
                </article>
            </section>

            <section className="backup-settings-banner">
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

            <section className="content-card backup-create-panel">
                <header>
                    <span className="page-kicker">
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

                <div className="backup-create-form">
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
                        className="primary-button"
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

            <section className="content-card">
                <div className="backup-toolbar">
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

                <div className="backup-table-container">
                    <table className="backup-table">
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
                                        className="table-state"
                                    >
                                        Loading database backups...
                                    </td>
                                </tr>
                            ) : backups.length
                                === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="table-state"
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
                                                        <small className="backup-error-message">
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
                                                    className={`backup-status backup-status-${backup.status}`}
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
                                                <div className="backup-actions">
                                                    <button
                                                        type="button"
                                                        className="view-sale-button"
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
                                                        className="backup-restore-button"
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
                                                        className="cashier-danger-button"
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

                            {' '}backups
                        </p>

                        <div>
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
        </div>
    );
}