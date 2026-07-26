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
    ] = useState<ExpenseInput>(
        createEmptyValues(),
    );

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

    const updateValue = <
        Key extends keyof ExpenseInput,
    >(
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
        <div className="modal-backdrop">
            <section
                className="expense-form-modal"
                role="dialog"
                aria-modal="true"
            >
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
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
                        className="modal-close-button"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="expense-form"
                    onSubmit={handleSubmit}
                >
                    {(localError
                        || errorMessage) && (
                            <div
                                className="form-alert"
                                role="alert"
                            >
                                {localError
                                    || errorMessage}
                            </div>
                        )}

                    <div className="expense-form-grid">
                        <label>
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

                        <label>
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

                        <label>
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

                        <label>
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

                        <label>
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
                                    <label>
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

                                    <label>
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

                        <label className="expense-wide-field">
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

                        <label>
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

                        <label className="expense-wide-field">
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

                    <footer className="modal-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="primary-button"
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