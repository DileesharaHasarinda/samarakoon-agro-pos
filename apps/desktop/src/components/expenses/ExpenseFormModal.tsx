import {
    useEffect,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import type {
    Expense,
    ExpenseCategory,
    ExpenseInput,
    ExpenseRecurringFrequency,
    ExpenseType,
} from '../../types/expense';

import type {
    PosPaymentMethod,
} from '../../types/sale';

interface ExpenseFormModalProps {
    expense: Expense | null;
    categories: ExpenseCategory[];
    isOpen: boolean;
    isSubmitting: boolean;
    errorMessage: string;
    onClose: () => void;

    onSubmit: (
        values: ExpenseInput,
    ) => void;
}

function currentDate(): string {
    return new Date()
        .toISOString()
        .slice(0, 10);
}

function createEmptyValues(): ExpenseInput {
    return {
        expense_category_id: 0,
        expense_date: currentDate(),
        amount: 0,
        payment_method: 'cash',
        expense_type: 'one_time',
        recurring_frequency: null,
        recurring_end_date: '',
        description: '',
        reference_number: '',
        notes: '',
    };
}

function parsePaymentMethod(
    value: string,
): PosPaymentMethod {
    switch (value) {
        case 'card':
            return 'card';

        case 'bank_transfer':
            return 'bank_transfer';

        default:
            return 'cash';
    }
}

function parseExpenseType(
    value: string,
): ExpenseType {
    return value === 'recurring'
        ? 'recurring'
        : 'one_time';
}

function parseFrequency(
    value: string,
): ExpenseRecurringFrequency | null {
    switch (value) {
        case 'weekly':
            return 'weekly';

        case 'monthly':
            return 'monthly';

        case 'quarterly':
            return 'quarterly';

        case 'yearly':
            return 'yearly';

        default:
            return null;
    }
}

const expenseFormModalStyles = `
    #sapo-expense-form-modal,
    #sapo-expense-form-modal *,
    #sapo-expense-form-modal *::before,
    #sapo-expense-form-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-expense-form-modal {
        --efm-green-800: #166534;
        --efm-green-700: #15803d;
        --efm-red: #dc2626;
        --efm-red-light: #fef2f2;
        --efm-text: #111827;
        --efm-text-secondary: #1f2937;
        --efm-muted: #6b7280;
        --efm-border: #e5e7eb;
        --efm-border-strong: #d1d5db;
        --efm-bg: #f9fafb;
        --efm-white: #ffffff;
        --efm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        inset: 0 !important;
        z-index: 1000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        margin: 0 !important;
        background: rgba(15, 23, 42, 0.5) !important;
        font-family: var(--efm-font) !important;
        color: var(--efm-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }

    #sapo-expense-form-modal h2,
    #sapo-expense-form-modal p,
    #sapo-expense-form-modal span,
    #sapo-expense-form-modal strong,
    #sapo-expense-form-modal label,
    #sapo-expense-form-modal button,
    #sapo-expense-form-modal input,
    #sapo-expense-form-modal select,
    #sapo-expense-form-modal textarea {
        font-family: var(--efm-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-expense-form-modal h2,
    #sapo-expense-form-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Modal shell ---------- */
    #sapo-expense-form-modal .efm-modal {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 720px !important;
        max-height: calc(100vh - 48px) !important;
        max-height: calc(100dvh - 48px) !important;
        background: var(--efm-white) !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2) !important;
        overflow: hidden !important;
    }

    /* ---------- Header ---------- */
    #sapo-expense-form-modal .efm-header {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 20px 24px !important;
        background: var(--efm-white) !important;
        border-bottom: 1px solid var(--efm-border) !important;
    }

    #sapo-expense-form-modal .efm-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--efm-green-700) !important;
        margin-bottom: 4px !important;
        background: transparent !important;
    }

    #sapo-expense-form-modal .efm-header h2 {
        font-size: 18px !important;
        font-weight: 700 !important;
        color: var(--efm-text) !important;
    }

    #sapo-expense-form-modal .efm-close-button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 32px !important;
        height: 32px !important;
        flex-shrink: 0 !important;
        font-size: 20px !important;
        line-height: 1 !important;
        color: var(--efm-muted) !important;
        background: var(--efm-bg) !important;
        border: 1px solid var(--efm-border) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-expense-form-modal .efm-close-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        color: var(--efm-text) !important;
    }

    #sapo-expense-form-modal .efm-close-button:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Scrollable form body ---------- */
    #sapo-expense-form-modal .efm-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 18px !important;
        min-height: 0 !important;
        padding: 24px !important;
        overflow-y: auto !important;
        background: var(--efm-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--efm-border-strong) transparent !important;
    }

    #sapo-expense-form-modal .efm-form::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-expense-form-modal .efm-form::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-expense-form-modal .efm-form::-webkit-scrollbar-thumb {
        background: var(--efm-border-strong) !important;
        border-radius: 8px !important;
    }

    /* ---------- Alert ---------- */
    #sapo-expense-form-modal .efm-alert {
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        background: var(--efm-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Form grid ---------- */
    #sapo-expense-form-modal .efm-grid {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 16px !important;
    }

    #sapo-expense-form-modal .efm-wide-field {
        grid-column: 1 / -1 !important;
    }

    #sapo-expense-form-modal .efm-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        min-width: 0 !important;
    }

    #sapo-expense-form-modal .efm-field span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--efm-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-expense-form-modal .efm-field input,
    #sapo-expense-form-modal .efm-field select,
    #sapo-expense-form-modal .efm-field textarea {
        width: 100% !important;
        padding: 9px 12px !important;
        font-size: 13.5px !important;
        color: var(--efm-text-secondary) !important;
        background: var(--efm-white) !important;
        border: 1px solid var(--efm-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-expense-form-modal .efm-field textarea {
        resize: vertical !important;
        min-height: 72px !important;
        font-family: var(--efm-font) !important;
    }

    #sapo-expense-form-modal .efm-field select {
        cursor: pointer !important;
    }

    #sapo-expense-form-modal .efm-field input:focus,
    #sapo-expense-form-modal .efm-field select:focus,
    #sapo-expense-form-modal .efm-field textarea:focus {
        border-color: var(--efm-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-expense-form-modal .efm-field input:disabled,
    #sapo-expense-form-modal .efm-field select:disabled,
    #sapo-expense-form-modal .efm-field textarea:disabled {
        background: var(--efm-bg) !important;
        color: var(--efm-muted) !important;
        cursor: not-allowed !important;
    }

    /* ---------- Footer actions ---------- */
    #sapo-expense-form-modal .efm-actions {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        padding: 16px 24px !important;
        background: var(--efm-bg) !important;
        border-top: 1px solid var(--efm-border) !important;
    }

    #sapo-expense-form-modal .efm-secondary-button {
        padding: 9px 18px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--efm-white) !important;
        border: 1px solid var(--efm-border-strong) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-expense-form-modal .efm-secondary-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        border-color: #9ca3af !important;
    }

    #sapo-expense-form-modal .efm-primary-button {
        padding: 9px 18px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        background: var(--efm-green-700) !important;
        border: 1px solid var(--efm-green-700) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease !important;
    }

    #sapo-expense-form-modal .efm-primary-button:hover:not(:disabled) {
        background: var(--efm-green-800) !important;
    }

    #sapo-expense-form-modal button:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 620px) {
        #sapo-expense-form-modal {
            padding: 12px !important;
        }

        #sapo-expense-form-modal .efm-modal {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
        }

        #sapo-expense-form-modal .efm-header,
        #sapo-expense-form-modal .efm-form,
        #sapo-expense-form-modal .efm-actions {
            padding-left: 16px !important;
            padding-right: 16px !important;
        }

        #sapo-expense-form-modal .efm-grid {
            grid-template-columns: 1fr !important;
        }

        #sapo-expense-form-modal .efm-wide-field {
            grid-column: 1 !important;
        }

        #sapo-expense-form-modal .efm-actions {
            flex-direction: column-reverse !important;
            align-items: stretch !important;
        }

        #sapo-expense-form-modal .efm-secondary-button,
        #sapo-expense-form-modal .efm-primary-button {
            width: 100% !important;
        }
    }
`;

export default function ExpenseFormModal({
    expense,
    categories,
    isOpen,
    isSubmitting,
    errorMessage,
    onClose,
    onSubmit,
}: ExpenseFormModalProps) {
    const [
        values,
        setValues,
    ] = useState<ExpenseInput>(createEmptyValues());

    const [
        localError,
        setLocalError,
    ] = useState('');

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (expense) {
            setValues({
                expense_category_id:
                    expense.category.id,

                expense_date:
                    expense.expense_date,

                amount:
                    expense.amount,

                payment_method:
                    expense.payment_method,

                expense_type:
                    expense.expense_type,

                recurring_frequency:
                    expense
                        .recurring_frequency,

                recurring_end_date:
                    expense
                        .recurring_end_date
                    ?? '',

                description:
                    expense.description,

                reference_number:
                    expense
                        .reference_number
                    ?? '',

                notes:
                    expense.notes
                    ?? '',
            });
        } else {
            const empty =
                createEmptyValues();

            empty.expense_category_id =
                categories[0]?.id
                ?? 0;

            setValues(empty);
        }

        setLocalError('');
    }, [
        expense,
        categories,
        isOpen,
    ]);

    if (!isOpen) {
        return null;
    }

    const updateValue = <Key extends keyof ExpenseInput>(
        key: Key,
        value: ExpenseInput[Key],
    ): void => {
        setValues(
            (current) => ({
                ...current,
                [key]: value,
            }),
        );

        setLocalError('');
    };

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (
            values.expense_category_id
            <= 0
        ) {
            setLocalError(
                'Select an expense category.',
            );

            return;
        }

        if (!values.expense_date) {
            setLocalError(
                'Expense date is required.',
            );

            return;
        }

        if (
            !Number.isFinite(
                values.amount,
            )
            || values.amount <= 0
        ) {
            setLocalError(
                'Expense amount must be greater than zero.',
            );

            return;
        }

        if (
            !values.description.trim()
        ) {
            setLocalError(
                'Expense description is required.',
            );

            return;
        }

        if (
            values.expense_type
            === 'recurring'
            && !values
                .recurring_frequency
        ) {
            setLocalError(
                'Select the recurring frequency.',
            );

            return;
        }

        onSubmit({
            ...values,

            description:
                values
                    .description
                    .trim(),

            reference_number:
                values
                    .reference_number
                    .trim(),

            notes:
                values.notes.trim(),

            recurring_frequency:
                values.expense_type
                    === 'recurring'
                    ? values
                        .recurring_frequency
                    : null,

            recurring_end_date:
                values.expense_type
                    === 'recurring'
                    ? values
                        .recurring_end_date
                    : '',
        });
    };

    return (
        <div id="sapo-expense-form-modal">
            <style>
                {expenseFormModalStyles}
            </style>

            <section
                className="efm-modal"
                role="dialog"
                aria-modal="true"
            >
                <header className="efm-header">
                    <div>
                        <span className="efm-kicker">
                            Business expense
                        </span>

                        <h2>
                            {expense
                                ? 'Edit Expense'
                                : 'Add Expense'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="efm-close-button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </header>

                <form
                    className="efm-form"
                    onSubmit={handleSubmit}
                >
                    {(localError
                        || errorMessage) && (
                            <div
                                className="efm-alert"
                                role="alert"
                            >
                                {localError
                                    || errorMessage}
                            </div>
                        )}

                    <div className="efm-grid">
                        <label className="efm-field">
                            <span>
                                Category *
                            </span>

                            <select
                                value={
                                    values
                                        .expense_category_id
                                }
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'expense_category_id',

                                        Number(
                                            event
                                                .target
                                                .value,
                                        ),
                                    );
                                }}
                            >
                                <option value={0}>
                                    Select Category
                                </option>

                                {categories.map(
                                    (category) => (
                                        <option
                                            key={
                                                category.id
                                            }
                                            value={
                                                category.id
                                            }
                                        >
                                            {category.name}
                                            {!category
                                                .is_active
                                                ? ' (Inactive)'
                                                : ''}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>

                        <label className="efm-field">
                            <span>
                                Expense Date *
                            </span>

                            <input
                                type="date"
                                value={
                                    values
                                        .expense_date
                                }
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'expense_date',
                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label className="efm-field">
                            <span>
                                Amount *
                            </span>

                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={
                                    values.amount
                                }
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'amount',

                                        Number(
                                            event
                                                .target
                                                .value,
                                        ),
                                    );
                                }}
                            />
                        </label>

                        <label className="efm-field">
                            <span>
                                Payment Method *
                            </span>

                            <select
                                value={
                                    values
                                        .payment_method
                                }
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'payment_method',

                                        parsePaymentMethod(
                                            event
                                                .target
                                                .value,
                                        ),
                                    );
                                }}
                            >
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
                        </label>

                        <label className="efm-field">
                            <span>
                                Expense Type
                            </span>

                            <select
                                value={
                                    values
                                        .expense_type
                                }
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    const type =
                                        parseExpenseType(
                                            event
                                                .target
                                                .value,
                                        );

                                    setValues(
                                        (current) => ({
                                            ...current,

                                            expense_type:
                                                type,

                                            recurring_frequency:
                                                type
                                                    === 'recurring'
                                                    ? current
                                                        .recurring_frequency
                                                    : null,

                                            recurring_end_date:
                                                type
                                                    === 'recurring'
                                                    ? current
                                                        .recurring_end_date
                                                    : '',
                                        }),
                                    );

                                    setLocalError('');
                                }}
                            >
                                <option value="one_time">
                                    One-time
                                </option>

                                <option value="recurring">
                                    Recurring
                                </option>
                            </select>
                        </label>

                        {values.expense_type
                            === 'recurring' && (
                                <>
                                    <label className="efm-field">
                                        <span>
                                            Frequency *
                                        </span>

                                        <select
                                            value={
                                                values
                                                    .recurring_frequency
                                                ?? ''
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                updateValue(
                                                    'recurring_frequency',

                                                    parseFrequency(
                                                        event
                                                            .target
                                                            .value,
                                                    ),
                                                );
                                            }}
                                        >
                                            <option value="">
                                                Select Frequency
                                            </option>

                                            <option value="weekly">
                                                Weekly
                                            </option>

                                            <option value="monthly">
                                                Monthly
                                            </option>

                                            <option value="quarterly">
                                                Quarterly
                                            </option>

                                            <option value="yearly">
                                                Yearly
                                            </option>
                                        </select>
                                    </label>

                                    <label className="efm-field">
                                        <span>
                                            Recurring End Date
                                        </span>

                                        <input
                                            type="date"
                                            min={
                                                values
                                                    .expense_date
                                            }
                                            value={
                                                values
                                                    .recurring_end_date
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                            onChange={(event) => {
                                                updateValue(
                                                    'recurring_end_date',

                                                    event
                                                        .target
                                                        .value,
                                                );
                                            }}
                                        />
                                    </label>
                                </>
                            )}

                        <label className="efm-field efm-wide-field">
                            <span>
                                Description *
                            </span>

                            <input
                                type="text"
                                maxLength={255}
                                value={
                                    values.description
                                }
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'description',

                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label className="efm-field">
                            <span>
                                Reference Number
                            </span>

                            <input
                                type="text"
                                maxLength={160}
                                value={
                                    values
                                        .reference_number
                                }
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'reference_number',

                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label className="efm-field efm-wide-field">
                            <span>Notes</span>

                            <textarea
                                rows={3}
                                maxLength={1500}
                                value={values.notes}
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    updateValue(
                                        'notes',

                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            />
                        </label>
                    </div>

                    <footer className="efm-actions">
                        <button
                            type="button"
                            className="efm-secondary-button"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="efm-primary-button"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Saving...'
                                : expense
                                    ? 'Update Expense'
                                    : 'Add Expense'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}