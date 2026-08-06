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
    createCheque,
    deleteCheque,
    getCheques,
    updateCheque,
    updateChequeStatus,
} from '../../services/chequeService';

import {
    defaultChequeFormValues,
} from '../../types/cheque';

import type {
    Cheque,
    ChequeFormValues,
    ChequeStatus,
    ChequeSummary,
} from '../../types/cheque';

import type {
    PosPaginationMeta,
} from '../../types/sale';

const money = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
});

const emptySummary: ChequeSummary = {
    total_cheques: 0,
    pending_count: 0,
    pending_amount: 0,
    bounced_count: 0,
    due_soon_count: 0,
    overdue_count: 0,
};

const emptyPagination: PosPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: null,
    to: null,
};

type IconName =
    | 'alert'
    | 'bank'
    | 'check'
    | 'close'
    | 'edit'
    | 'plus'
    | 'refresh'
    | 'search'
    | 'trash';

function Icon({ name }: { name: IconName }) {
    const props = {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true,
    };

    switch (name) {
        case 'alert':
            return (
                <svg {...props}>
                    <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                    <path d="M12 9v4M12 17h.01" />
                </svg>
            );

        case 'bank':
            return (
                <svg {...props}>
                    <path d="M3 21h18M4 21V10M20 21V10M2 10l10-6 10 6M6 10v4M10 10v4M14 10v4M18 10v4" />
                </svg>
            );

        case 'check':
            return (
                <svg {...props}>
                    <path d="m5 12 4 4L19 6" />
                </svg>
            );

        case 'close':
            return (
                <svg {...props}>
                    <path d="m6 6 12 12M18 6 6 18" />
                </svg>
            );

        case 'edit':
            return (
                <svg {...props}>
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
            );

        case 'plus':
            return (
                <svg {...props}>
                    <path d="M12 5v14M5 12h14" />
                </svg>
            );

        case 'refresh':
            return (
                <svg {...props}>
                    <path d="M20 11a8 8 0 1 0 2 5M20 4v7h-7" />
                </svg>
            );

        case 'trash':
            return (
                <svg {...props}>
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
                </svg>
            );

        case 'search':
        default:
            return (
                <svg {...props}>
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                </svg>
            );
    }
}

function toDateOnly(value: string): string {
    // Accepts either "YYYY-MM-DD" or a full ISO timestamp
    // ("YYYY-MM-DDTHH:mm:ss.ssssssZ") and always returns just
    // the date portion, so it can be safely combined with a
    // fixed time below without producing a double "T".
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);

    return match ? match[1] : value;
}

function formatDate(value: string): string {
    const dateOnly = toDateOnly(value);

    const date = new Date(`${dateOnly}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function statusLabel(status: ChequeStatus): string {
    switch (status) {
        case 'pending':
            return 'Pending';
        case 'cleared':
            return 'Cleared';
        case 'bounced':
            return 'Bounced';
        case 'cancelled':
            return 'Cancelled';
        default:
            return status;
    }
}

const styles = `
#cheques-page,
#cheques-page *,
#cheques-page *::before,
#cheques-page *::after {
    box-sizing: border-box !important;
}

#cheques-page {
    --green-900: #14532d;
    --green-800: #166534;
    --green-700: #15803d;
    --green-50: #f0fdf4;
    --amber: #b54708;
    --amber-50: #fffaeb;
    --red: #b42318;
    --red-50: #fef3f2;
    --text: #101828;
    --text-2: #344054;
    --muted: #667085;
    --border: #d0d9d2;
    --border-2: #aebdb2;

    display: flex !important;
    flex-direction: column !important;
    gap: 16px !important;
    height: calc(100vh - 96px) !important;
    padding: 0 8px 12px 0 !important;
    overflow: hidden !important;
    color: var(--text) !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    font-size: 14px !important;
}

/* ---------- Global icon sizing for this page ----------
   Every <svg> rendered by the Icon component must have an
   explicit width/height, otherwise the browser falls back to
   the SVG's intrinsic size (often 300x150 or similar), which
   is what produced the oversized triangle shape and the blank
   action buttons in earlier renders. */
#cheques-page svg {
    display: block !important;
    width: 16px !important;
    height: 16px !important;
    flex-shrink: 0 !important;
}

#cheques-page .cp-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 16px !important;
    padding: 16px 19px !important;
    background: linear-gradient(135deg, #ffffff, #f3fbf5) !important;
    border: 1px solid var(--border) !important;
    border-radius: 14px !important;
}

#cheques-page .cp-kicker {
    display: block !important;
    color: var(--green-700) !important;
    font-size: 11px !important;
    font-weight: 750 !important;
    letter-spacing: 0.05em !important;
    text-transform: uppercase !important;
    margin-bottom: 3px !important;
}

#cheques-page .cp-title {
    font-size: 24px !important;
    font-weight: 740 !important;
}

#cheques-page .cp-subtitle {
    margin-top: 4px !important;
    color: var(--muted) !important;
    font-size: 13px !important;
}

#cheques-page .cp-btn {
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
    min-height: 40px !important;
    padding: 7px 14px !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#cheques-page .cp-primary {
    color: #ffffff !important;
    background: var(--green-700) !important;
    border: 1px solid var(--green-700) !important;
}

#cheques-page .cp-primary:hover {
    background: var(--green-800) !important;
}

#cheques-page .cp-secondary {
    color: var(--green-900) !important;
    background: #ffffff !important;
    border: 1px solid #b8dfc3 !important;
}

#cheques-page .cp-btn:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

#cheques-page .cp-summary {
    display: grid !important;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    gap: 10px !important;
}

#cheques-page .cp-summary-card {
    position: relative !important;
    padding: 12px 14px 12px 18px !important;
    background: #ffffff !important;
    border: 1px solid var(--border) !important;
    border-radius: 11px !important;
}

#cheques-page .cp-summary-card::before {
    content: "" !important;
    position: absolute !important;
    inset: 0 auto 0 0 !important;
    width: 4px !important;
    background: var(--green-700) !important;
}

#cheques-page .cp-summary-card.amber::before { background: var(--amber) !important; }
#cheques-page .cp-summary-card.red::before { background: var(--red) !important; }

#cheques-page .cp-summary-label {
    display: block !important;
    color: var(--muted) !important;
    font-size: 11px !important;
    font-weight: 650 !important;
}

#cheques-page .cp-summary-value {
    display: block !important;
    margin-top: 3px !important;
    color: var(--green-900) !important;
    font-size: 19px !important;
    font-weight: 750 !important;
}

#cheques-page .cp-summary-card.amber .cp-summary-value { color: var(--amber) !important; }
#cheques-page .cp-summary-card.red .cp-summary-value { color: var(--red) !important; }

#cheques-page .cp-message {
    display: flex !important;
    align-items: center !important;
    gap: 9px !important;
    padding: 10px 13px !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    border-radius: 10px !important;
}

#cheques-page .cp-message.success {
    color: var(--green-900) !important;
    background: var(--green-50) !important;
    border: 1px solid #b8dfc3 !important;
}

#cheques-page .cp-message.error {
    color: var(--red) !important;
    background: var(--red-50) !important;
    border: 1px solid #f3b5af !important;
}

#cheques-page .cp-message-close {
    margin-left: auto !important;
    display: grid !important;
    width: 28px !important;
    height: 28px !important;
    place-items: center !important;
    background: rgba(255,255,255,0.7) !important;
    border: 1px solid currentColor !important;
    border-radius: 7px !important;
    cursor: pointer !important;
    padding: 0 !important;
}

#cheques-page .cp-panel {
    display: flex !important;
    flex-direction: column !important;
    flex: 1 !important;
    min-height: 0 !important;
    background: #ffffff !important;
    border: 1px solid var(--border) !important;
    border-radius: 14px !important;
    overflow: hidden !important;
}

#cheques-page .cp-toolbar {
    display: grid !important;
    grid-template-columns: minmax(0,1fr) 160px 160px 120px !important;
    gap: 10px !important;
    padding: 13px !important;
    border-bottom: 1px solid var(--border) !important;
    flex-shrink: 0 !important;
}

#cheques-page .cp-field {
    display: grid !important;
    gap: 5px !important;
}

#cheques-page .cp-field span {
    color: var(--text-2) !important;
    font-size: 11px !important;
    font-weight: 650 !important;
}

#cheques-page .cp-input,
#cheques-page .cp-select {
    height: 40px !important;
    padding: 0 11px !important;
    font-size: 13px !important;
    background: #f8faf9 !important;
    border: 1px solid var(--border-2) !important;
    border-radius: 8px !important;
    outline: none !important;
}

#cheques-page .cp-input:focus,
#cheques-page .cp-select:focus {
    border-color: var(--green-700) !important;
    box-shadow: 0 0 0 3px rgba(21,128,61,0.14) !important;
}

#cheques-page .cp-list {
    flex: 1 !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    padding: 10px !important;
    background: #f5f8f6 !important;
}

#cheques-page .cp-row {
    display: grid !important;
    grid-template-columns: minmax(150px,1.1fr) minmax(140px,0.9fr) minmax(120px,0.7fr) minmax(180px,0.9fr) minmax(220px,auto) !important;
    align-items: center !important;
    gap: 12px !important;
    padding: 12px 14px !important;
    margin-bottom: 8px !important;
    background: #ffffff !important;
    border: 1px solid var(--border) !important;
    border-radius: 10px !important;
}

#cheques-page .cp-row.overdue {
    border-color: #f3b5af !important;
    background: var(--red-50) !important;
}

#cheques-page .cp-row.due-soon {
    border-color: #f0d48f !important;
    background: var(--amber-50) !important;
}

#cheques-page .cp-cell-title {
    font-size: 14px !important;
    font-weight: 700 !important;
    display: block !important;
}

#cheques-page .cp-cell-meta {
    display: block !important;
    margin-top: 2px !important;
    color: var(--muted) !important;
    font-size: 11px !important;
}

#cheques-page .cp-badge {
    display: inline-flex !important;
    align-items: center !important;
    gap: 4px !important;
    padding: 4px 9px !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    border-radius: 999px !important;
    text-transform: uppercase !important;
    white-space: nowrap !important;
}

#cheques-page .cp-badge.pending { color: var(--amber) !important; background: var(--amber-50) !important; border: 1px solid #f0d48f !important; }
#cheques-page .cp-badge.cleared { color: var(--green-900) !important; background: var(--green-50) !important; border: 1px solid #b8dfc3 !important; }
#cheques-page .cp-badge.bounced { color: var(--red) !important; background: var(--red-50) !important; border: 1px solid #f3b5af !important; }
#cheques-page .cp-badge.cancelled { color: var(--muted) !important; background: #f2f4f7 !important; border: 1px solid #e4e9e5 !important; }
#cheques-page .cp-badge.type { color: #175cd3 !important; background: #eff8ff !important; border: 1px solid #b9d8f5 !important; }

#cheques-page .cp-due-info {
    display: flex !important;
    flex-direction: column !important;
    gap: 3px !important;
}

#cheques-page .cp-actions {
    display: flex !important;
    justify-content: flex-end !important;
    gap: 6px !important;
    flex-wrap: wrap !important;
}

#cheques-page .cp-action {
    min-height: 32px !important;
    padding: 5px 9px !important;
    font-size: 11px !important;
}

#cheques-page .cp-icon-action {
    min-height: 32px !important;
    min-width: 32px !important;
    padding: 5px !important;
    justify-content: center !important;
}

#cheques-page .cp-state {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 8px !important;
    padding: 40px !important;
    color: var(--muted) !important;
    text-align: center !important;
}

#cheques-page .cp-state svg {
    width: 40px !important;
    height: 40px !important;
    color: var(--green-700) !important;
}

#cheques-page .cp-pagination {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    padding: 10px 14px !important;
    border-top: 1px solid var(--border) !important;
    flex-shrink: 0 !important;
}

/* Modal */
#cheque-form-modal {
    position: fixed !important;
    inset: 0 !important;
    z-index: 2000000 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 20px !important;
    background: rgba(3,18,10,0.72) !important;
    backdrop-filter: blur(4px) !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
}

#cheque-form-modal svg {
    display: block !important;
    width: 16px !important;
    height: 16px !important;
    flex-shrink: 0 !important;
}

#cheque-form-modal .cfm-dialog {
    width: min(560px, 100%) !important;
    max-height: calc(100vh - 40px) !important;
    display: flex !important;
    flex-direction: column !important;
    background: #ffffff !important;
    border-radius: 16px !important;
    overflow: hidden !important;
    box-shadow: 0 28px 72px rgba(0,0,0,0.36) !important;
}

#cheque-form-modal .cfm-header {
    padding: 18px 22px !important;
    color: #ffffff !important;
    background: linear-gradient(135deg, #14532d, #15803d) !important;
    font-size: 18px !important;
    font-weight: 740 !important;
}

#cheque-form-modal .cfm-body {
    flex: 1 !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    padding: 18px 22px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 14px !important;
}

#cheque-form-modal .cfm-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 14px !important;
}

#cheque-form-modal .cfm-field {
    display: grid !important;
    gap: 6px !important;
}

#cheque-form-modal .cfm-field.full {
    grid-column: 1 / -1 !important;
}

#cheque-form-modal .cfm-field span {
    font-size: 12px !important;
    font-weight: 650 !important;
    color: #344054 !important;
}

#cheque-form-modal .cfm-field input,
#cheque-form-modal .cfm-field select,
#cheque-form-modal .cfm-field textarea {
    height: 42px !important;
    padding: 0 12px !important;
    font-size: 13.5px !important;
    border: 1px solid #d1d5db !important;
    border-radius: 8px !important;
    outline: none !important;
}

#cheque-form-modal .cfm-field textarea {
    height: auto !important;
    padding: 9px 12px !important;
    resize: vertical !important;
}

#cheque-form-modal .cfm-field input:focus,
#cheque-form-modal .cfm-field select:focus,
#cheque-form-modal .cfm-field textarea:focus {
    border-color: #15803d !important;
    box-shadow: 0 0 0 3px rgba(21,128,61,0.14) !important;
}

#cheque-form-modal .cfm-actions {
    display: flex !important;
    justify-content: flex-end !important;
    gap: 10px !important;
    padding: 15px 22px !important;
    background: #f9fafb !important;
    border-top: 1px solid #e5e7eb !important;
}

#cheque-form-modal .cfm-cancel {
    padding: 10px 18px !important;
    font-size: 13.5px !important;
    font-weight: 600 !important;
    background: #ffffff !important;
    border: 1px solid #d1d5db !important;
    border-radius: 8px !important;
    cursor: pointer !important;
}

#cheque-form-modal .cfm-submit {
    padding: 10px 20px !important;
    font-size: 13.5px !important;
    font-weight: 600 !important;
    color: #ffffff !important;
    background: #15803d !important;
    border: 1px solid #15803d !important;
    border-radius: 8px !important;
    cursor: pointer !important;
}

#cheque-form-modal button:disabled {
    opacity: 0.6 !important;
    cursor: not-allowed !important;
}

@media (max-width: 900px) {
    #cheques-page .cp-summary { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
    #cheques-page .cp-toolbar { grid-template-columns: 1fr !important; }
    #cheques-page .cp-row { grid-template-columns: 1fr !important; }
    #cheques-page .cp-actions { justify-content: flex-start !important; }
    #cheque-form-modal .cfm-grid { grid-template-columns: 1fr !important; }
}
`;

export default function ChequesPage() {
    const { token } = useAuth();

    const [cheques, setCheques] = useState<Cheque[]>([]);
    const [summary, setSummary] = useState<ChequeSummary>(emptySummary);
    const [pagination, setPagination] = useState<PosPaginationMeta>(emptyPagination);

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [pageError, setPageError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
    const [formValues, setFormValues] = useState<ChequeFormValues>(defaultChequeFormValues);
    const [formError, setFormError] = useState('');

    const loadCheques = useCallback(async (): Promise<void> => {
        if (!token) {
            return;
        }

        setIsLoading(true);
        setPageError('');

        try {
            const response = await getCheques(token, {
                search,
                type: typeFilter === 'all' ? undefined : typeFilter,
                status: statusFilter === 'all' ? undefined : statusFilter,
                page,
                perPage: 20,
            });

            setCheques(response.data);
            setSummary(response.summary);
            setPagination(response.meta);
        } catch (error) {
            setCheques([]);
            setPageError(
                error instanceof ApiError
                    ? error.message
                    : 'Unable to load cheques.',
            );
        } finally {
            setIsLoading(false);
        }
    }, [token, search, typeFilter, statusFilter, page]);

    useEffect(() => {
        void loadCheques();
    }, [loadCheques]);

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeout = window.setTimeout(() => {
            setSuccessMessage('');
        }, 3500);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [successMessage]);

    const openCreateForm = (): void => {
        setEditingCheque(null);
        setFormValues(defaultChequeFormValues);
        setFormError('');
        setIsFormOpen(true);
    };

    const openEditForm = (cheque: Cheque): void => {
        setEditingCheque(cheque);
        setFormValues({
            cheque_number: cheque.cheque_number,
            type: cheque.type,
            party_name: cheque.party_name,
            bank_name: cheque.bank_name ?? '',
            amount: cheque.amount,
            cheque_date: toDateOnly(cheque.cheque_date),
            due_date: toDateOnly(cheque.due_date),
            notes: cheque.notes ?? '',
        });
        setFormError('');
        setIsFormOpen(true);
    };

    const closeForm = (): void => {
        if (isSubmitting) {
            return;
        }

        setIsFormOpen(false);
        setEditingCheque(null);
    };

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        if (!token || isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setFormError('');

        try {
            const response = editingCheque
                ? await updateCheque(token, editingCheque.id, formValues)
                : await createCheque(token, formValues);

            setSuccessMessage(
                response.message
                ?? (editingCheque
                    ? 'Cheque updated successfully.'
                    : 'Cheque recorded successfully.'),
            );

            setIsFormOpen(false);
            setEditingCheque(null);

            await loadCheques();
        } catch (error) {
            setFormError(
                error instanceof ApiError
                    ? error.message
                    : 'Unable to save the cheque.',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (
        cheque: Cheque,
        status: ChequeStatus,
    ): Promise<void> => {
        if (!token || isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setPageError('');

        try {
            const response = await updateChequeStatus(token, cheque.id, status);

            setSuccessMessage(
                response.message ?? 'Cheque status updated successfully.',
            );

            await loadCheques();
        } catch (error) {
            setPageError(
                error instanceof ApiError
                    ? error.message
                    : 'Unable to update the cheque status.',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (cheque: Cheque): Promise<void> => {
        if (!token || isSubmitting) {
            return;
        }

        const confirmed = window.confirm(
            `Delete cheque ${cheque.cheque_number}? This cannot be undone.`,
        );

        if (!confirmed) {
            return;
        }

        setIsSubmitting(true);
        setPageError('');

        try {
            const response = await deleteCheque(token, cheque.id);

            setSuccessMessage(response.message ?? 'Cheque deleted successfully.');

            await loadCheques();
        } catch (error) {
            setPageError(
                error instanceof ApiError
                    ? error.message
                    : 'Unable to delete the cheque.',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const todayDateOnly = new Date().toISOString().slice(0, 10);

    const rowClass = (cheque: Cheque): string => {
        if (cheque.status !== 'pending') {
            return 'cp-row';
        }

        const dueDateOnly = toDateOnly(cheque.due_date);

        if (dueDateOnly < todayDateOnly) {
            return 'cp-row overdue';
        }

        const dueSoonThreshold = new Date();
        dueSoonThreshold.setDate(dueSoonThreshold.getDate() + 3);

        if (dueDateOnly <= dueSoonThreshold.toISOString().slice(0, 10)) {
            return 'cp-row due-soon';
        }

        return 'cp-row';
    };

    return (
        <div id="cheques-page">
            <style>{styles}</style>

            <header className="cp-header">
                <div>
                    <span className="cp-kicker">Finance</span>
                    <h1 className="cp-title">Cheque Management</h1>
                    <p className="cp-subtitle">
                        Track cheques received from customers and issued to suppliers.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        type="button"
                        className="cp-btn cp-secondary"
                        disabled={isLoading}
                        onClick={() => { void loadCheques(); }}
                    >
                        <Icon name="refresh" />
                        Refresh
                    </button>

                    <button
                        type="button"
                        className="cp-btn cp-primary"
                        onClick={openCreateForm}
                    >
                        <Icon name="plus" />
                        Add Cheque
                    </button>
                </div>
            </header>

            <section className="cp-summary">
                <article className="cp-summary-card">
                    <span className="cp-summary-label">Total Cheques</span>
                    <strong className="cp-summary-value">{summary.total_cheques}</strong>
                </article>

                <article className="cp-summary-card">
                    <span className="cp-summary-label">Pending</span>
                    <strong className="cp-summary-value">{summary.pending_count}</strong>
                </article>

                <article className="cp-summary-card">
                    <span className="cp-summary-label">Pending Amount</span>
                    <strong className="cp-summary-value">{money.format(summary.pending_amount)}</strong>
                </article>

                <article className="cp-summary-card amber">
                    <span className="cp-summary-label">Due Soon / Overdue</span>
                    <strong className="cp-summary-value">{summary.due_soon_count + summary.overdue_count}</strong>
                </article>

                <article className="cp-summary-card red">
                    <span className="cp-summary-label">Bounced</span>
                    <strong className="cp-summary-value">{summary.bounced_count}</strong>
                </article>
            </section>

            {successMessage && (
                <div className="cp-message success">
                    <Icon name="check" />
                    <span>{successMessage}</span>
                    <button
                        type="button"
                        className="cp-message-close"
                        onClick={() => setSuccessMessage('')}
                    >
                        <Icon name="close" />
                    </button>
                </div>
            )}

            {pageError && (
                <div className="cp-message error">
                    <Icon name="alert" />
                    <span>{pageError}</span>
                    <button
                        type="button"
                        className="cp-message-close"
                        onClick={() => setPageError('')}
                    >
                        <Icon name="close" />
                    </button>
                </div>
            )}

            <section className="cp-panel">
                <div className="cp-toolbar">
                    <label className="cp-field">
                        <span>Search</span>
                        <input
                            type="search"
                            className="cp-input"
                            value={search}
                            placeholder="Cheque number, party or bank"
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                        />
                    </label>

                    <label className="cp-field">
                        <span>Type</span>
                        <select
                            className="cp-select"
                            value={typeFilter}
                            onChange={(event) => {
                                setTypeFilter(event.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="all">All Types</option>
                            <option value="received">Received</option>
                            <option value="issued">Issued</option>
                        </select>
                    </label>

                    <label className="cp-field">
                        <span>Status</span>
                        <select
                            className="cp-select"
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="cleared">Cleared</option>
                            <option value="bounced">Bounced</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </label>

                    <label className="cp-field">
                        <span>&nbsp;</span>
                        <button
                            type="button"
                            className="cp-btn cp-secondary"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => {
                                setSearch('');
                                setTypeFilter('all');
                                setStatusFilter('all');
                                setPage(1);
                            }}
                        >
                            Clear
                        </button>
                    </label>
                </div>

                <div className="cp-list">
                    {isLoading ? (
                        <div className="cp-state">
                            <strong>Loading cheques...</strong>
                        </div>
                    ) : cheques.length === 0 ? (
                        <div className="cp-state">
                            <Icon name="bank" />
                            <strong>No Cheques Found</strong>
                            <span>Add a cheque to start tracking it here.</span>
                        </div>
                    ) : (
                        cheques.map((cheque) => (
                            <article key={cheque.id} className={rowClass(cheque)}>
                                <div>
                                    <strong className="cp-cell-title">{cheque.cheque_number}</strong>
                                    <span className="cp-cell-meta">
                                        {cheque.bank_name ?? 'No bank specified'}
                                    </span>
                                </div>

                                <div>
                                    <span className="cp-cell-title" style={{ fontSize: '13px' }}>
                                        {cheque.party_name}
                                    </span>
                                    <span className="cp-cell-meta">
                                        <span className="cp-badge type">
                                            {cheque.type === 'received' ? 'Received' : 'Issued'}
                                        </span>
                                    </span>
                                </div>

                                <div>
                                    <strong className="cp-cell-title">{money.format(Number(cheque.amount))}</strong>
                                </div>

                                <div className="cp-due-info">
                                    <span className="cp-cell-meta">Cheque: {formatDate(cheque.cheque_date)}</span>
                                    <span className="cp-cell-meta">Due: {formatDate(cheque.due_date)}</span>
                                    <span className={`cp-badge ${cheque.status}`}>
                                        {statusLabel(cheque.status)}
                                    </span>
                                </div>

                                <div className="cp-actions">
                                    {cheque.status === 'pending' && (
                                        <>
                                            <button
                                                type="button"
                                                className="cp-btn cp-secondary cp-action"
                                                disabled={isSubmitting}
                                                onClick={() => { void handleStatusChange(cheque, 'cleared'); }}
                                            >
                                                Mark Cleared
                                            </button>

                                            <button
                                                type="button"
                                                className="cp-btn cp-secondary cp-action"
                                                disabled={isSubmitting}
                                                onClick={() => { void handleStatusChange(cheque, 'bounced'); }}
                                            >
                                                Mark Bounced
                                            </button>

                                            <button
                                                type="button"
                                                className="cp-btn cp-secondary cp-icon-action"
                                                disabled={isSubmitting}
                                                aria-label="Edit cheque"
                                                onClick={() => openEditForm(cheque)}
                                            >
                                                <Icon name="edit" />
                                            </button>

                                            <button
                                                type="button"
                                                className="cp-btn cp-secondary cp-icon-action"
                                                disabled={isSubmitting}
                                                aria-label="Delete cheque"
                                                onClick={() => { void handleDelete(cheque); }}
                                            >
                                                <Icon name="trash" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </article>
                        ))
                    )}
                </div>

                {!isLoading && pagination.total > 0 && (
                    <footer className="cp-pagination">
                        <p style={{ color: 'var(--muted)', fontSize: '12px' }}>
                            Showing {pagination.from ?? 0} to {pagination.to ?? 0} of {pagination.total} cheques
                        </p>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className="cp-btn cp-secondary cp-action"
                                disabled={pagination.current_page <= 1}
                                onClick={() => setPage((value) => Math.max(1, value - 1))}
                            >
                                Previous
                            </button>

                            <button
                                type="button"
                                className="cp-btn cp-secondary cp-action"
                                disabled={pagination.current_page >= pagination.last_page}
                                onClick={() => setPage((value) => Math.min(pagination.last_page, value + 1))}
                            >
                                Next
                            </button>
                        </div>
                    </footer>
                )}
            </section>

            {isFormOpen && (
                <div
                    id="cheque-form-modal"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeForm();
                        }
                    }}
                >
                    <section
                        className="cfm-dialog"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <header className="cfm-header">
                            {editingCheque ? 'Edit Cheque' : 'Add Cheque'}
                        </header>

                        <form onSubmit={(event) => { void handleSubmit(event); }}>
                            <div className="cfm-body">
                                {formError && (
                                    <div className="cp-message error">
                                        <Icon name="alert" />
                                        <span>{formError}</span>
                                    </div>
                                )}

                                <div className="cfm-grid">
                                    <label className="cfm-field">
                                        <span>Cheque Number *</span>
                                        <input
                                            type="text"
                                            required
                                            value={formValues.cheque_number}
                                            disabled={isSubmitting}
                                            onChange={(event) => setFormValues((current) => ({
                                                ...current,
                                                cheque_number: event.target.value,
                                            }))}
                                        />
                                    </label>

                                    <label className="cfm-field">
                                        <span>Type *</span>
                                        <select
                                            required
                                            value={formValues.type}
                                            disabled={isSubmitting}
                                            onChange={(event) => setFormValues((current) => ({
                                                ...current,
                                                type: event.target.value as 'received' | 'issued',
                                            }))}
                                        >
                                            <option value="received">Received</option>
                                            <option value="issued">Issued</option>
                                        </select>
                                    </label>

                                    <label className="cfm-field full">
                                        <span>Party Name *</span>
                                        <input
                                            type="text"
                                            required
                                            value={formValues.party_name}
                                            disabled={isSubmitting}
                                            placeholder="Customer or supplier name"
                                            onChange={(event) => setFormValues((current) => ({
                                                ...current,
                                                party_name: event.target.value,
                                            }))}
                                        />
                                    </label>

                                    <label className="cfm-field">
                                        <span>Bank Name</span>
                                        <input
                                            type="text"
                                            value={formValues.bank_name}
                                            disabled={isSubmitting}
                                            onChange={(event) => setFormValues((current) => ({
                                                ...current,
                                                bank_name: event.target.value,
                                            }))}
                                        />
                                    </label>

                                    <label className="cfm-field">
                                        <span>Amount (LKR) *</span>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            required
                                            value={formValues.amount}
                                            disabled={isSubmitting}
                                            onChange={(event) => setFormValues((current) => ({
                                                ...current,
                                                amount: event.target.value,
                                            }))}
                                        />
                                    </label>

                                    <label className="cfm-field">
                                        <span>Cheque Date *</span>
                                        <input
                                            type="date"
                                            required
                                            value={formValues.cheque_date}
                                            disabled={isSubmitting}
                                            onChange={(event) => setFormValues((current) => ({
                                                ...current,
                                                cheque_date: event.target.value,
                                            }))}
                                        />
                                    </label>

                                    <label className="cfm-field">
                                        <span>Due Date *</span>
                                        <input
                                            type="date"
                                            required
                                            value={formValues.due_date}
                                            disabled={isSubmitting}
                                            onChange={(event) => setFormValues((current) => ({
                                                ...current,
                                                due_date: event.target.value,
                                            }))}
                                        />
                                    </label>

                                    <label className="cfm-field full">
                                        <span>Notes</span>
                                        <textarea
                                            rows={3}
                                            value={formValues.notes}
                                            disabled={isSubmitting}
                                            onChange={(event) => setFormValues((current) => ({
                                                ...current,
                                                notes: event.target.value,
                                            }))}
                                        />
                                    </label>
                                </div>
                            </div>

                            <footer className="cfm-actions">
                                <button
                                    type="button"
                                    className="cfm-cancel"
                                    disabled={isSubmitting}
                                    onClick={closeForm}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="cfm-submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? 'Saving...'
                                        : editingCheque
                                            ? 'Update Cheque'
                                            : 'Add Cheque'}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}