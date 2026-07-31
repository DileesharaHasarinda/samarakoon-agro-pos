import {
    useEffect,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import type {
    ExpenseCategory,
    ExpenseCategoryInput,
} from '../../types/expense';

interface ExpenseCategoryManagerModalProps {
    isOpen: boolean;
    categories: ExpenseCategory[];
    isSubmitting: boolean;
    errorMessage: string;
    onClose: () => void;

    onSave: (
        categoryId: number | null,
        values: ExpenseCategoryInput,
    ) => void;

    onDelete: (
        category: ExpenseCategory,
    ) => void;
}

const categoryModalStyles = `
    #sapo-category-modal,
    #sapo-category-modal *,
    #sapo-category-modal *::before,
    #sapo-category-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-category-modal {
        --ecm-green-800: #166534;
        --ecm-green-700: #15803d;
        --ecm-green-100: #dcfce7;
        --ecm-red: #dc2626;
        --ecm-red-light: #fef2f2;
        --ecm-blue: #2563eb;
        --ecm-blue-light: #eff6ff;
        --ecm-text: #111827;
        --ecm-text-secondary: #1f2937;
        --ecm-muted: #6b7280;
        --ecm-border: #e5e7eb;
        --ecm-border-strong: #d1d5db;
        --ecm-bg: #f9fafb;
        --ecm-white: #ffffff;
        --ecm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        inset: 0 !important;
        z-index: 1000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        margin: 0 !important;
        background: rgba(15, 23, 42, 0.5) !important;
        font-family: var(--ecm-font) !important;
        color: var(--ecm-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }

    #sapo-category-modal h2,
    #sapo-category-modal p,
    #sapo-category-modal span,
    #sapo-category-modal strong,
    #sapo-category-modal small,
    #sapo-category-modal label,
    #sapo-category-modal button,
    #sapo-category-modal input,
    #sapo-category-modal textarea {
        font-family: var(--ecm-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-category-modal h2,
    #sapo-category-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Modal shell ---------- */
    #sapo-category-modal .ecm-modal {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 720px !important;
        max-height: calc(100vh - 48px) !important;
        max-height: calc(100dvh - 48px) !important;
        background: var(--ecm-white) !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2) !important;
        overflow: hidden !important;
    }

    /* ---------- Header ---------- */
    #sapo-category-modal .ecm-header {
        display: flex !important;
        flex-shrink: 0 !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 20px 24px !important;
        background: var(--ecm-white) !important;
        border-bottom: 1px solid var(--ecm-border) !important;
    }

    #sapo-category-modal .ecm-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--ecm-green-700) !important;
        margin-bottom: 4px !important;
        background: transparent !important;
    }

    #sapo-category-modal .ecm-header h2 {
        font-size: 18px !important;
        font-weight: 700 !important;
        color: var(--ecm-text) !important;
    }

    #sapo-category-modal .ecm-close-button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 32px !important;
        height: 32px !important;
        flex-shrink: 0 !important;
        font-size: 20px !important;
        line-height: 1 !important;
        color: var(--ecm-muted) !important;
        background: var(--ecm-bg) !important;
        border: 1px solid var(--ecm-border) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-category-modal .ecm-close-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        color: var(--ecm-text) !important;
    }

    #sapo-category-modal .ecm-close-button:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Scrollable body ---------- */
    #sapo-category-modal .ecm-content {
        display: flex !important;
        flex-direction: column !important;
        gap: 20px !important;
        min-height: 0 !important;
        padding: 24px !important;
        overflow-y: auto !important;
        background: var(--ecm-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--ecm-border-strong) transparent !important;
    }

    #sapo-category-modal .ecm-content::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-category-modal .ecm-content::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-category-modal .ecm-content::-webkit-scrollbar-thumb {
        background: var(--ecm-border-strong) !important;
        border-radius: 8px !important;
    }

    /* ---------- Alert ---------- */
    #sapo-category-modal .ecm-alert {
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        background: var(--ecm-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Form ---------- */
    #sapo-category-modal .ecm-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 14px !important;
        padding: 16px !important;
        background: var(--ecm-bg) !important;
        border: 1px solid var(--ecm-border) !important;
        border-radius: 10px !important;
    }

    #sapo-category-modal .ecm-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
    }

    #sapo-category-modal .ecm-field span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--ecm-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-category-modal .ecm-field input[type="text"],
    #sapo-category-modal .ecm-field textarea {
        width: 100% !important;
        padding: 9px 12px !important;
        font-size: 13.5px !important;
        color: var(--ecm-text-secondary) !important;
        background: var(--ecm-white) !important;
        border: 1px solid var(--ecm-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-category-modal .ecm-field textarea {
        resize: vertical !important;
        min-height: 56px !important;
        font-family: var(--ecm-font) !important;
    }

    #sapo-category-modal .ecm-field input:focus,
    #sapo-category-modal .ecm-field textarea:focus {
        border-color: var(--ecm-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-category-modal .ecm-field input:disabled,
    #sapo-category-modal .ecm-field textarea:disabled {
        background: var(--ecm-bg) !important;
        color: var(--ecm-muted) !important;
        cursor: not-allowed !important;
    }

    #sapo-category-modal .ecm-active-toggle {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        cursor: pointer !important;
    }

    #sapo-category-modal .ecm-active-toggle input[type="checkbox"] {
        width: 16px !important;
        height: 16px !important;
        margin: 0 !important;
        accent-color: var(--ecm-green-700) !important;
        cursor: pointer !important;
    }

    #sapo-category-modal .ecm-active-toggle span {
        font-size: 13px !important;
        font-weight: 500 !important;
        color: var(--ecm-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-category-modal .ecm-form-actions {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        margin-top: 4px !important;
    }

    #sapo-category-modal .ecm-secondary-button {
        padding: 9px 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        background: var(--ecm-white) !important;
        border: 1px solid var(--ecm-border-strong) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-category-modal .ecm-secondary-button:hover:not(:disabled) {
        background: #f1f5f9 !important;
        border-color: #9ca3af !important;
    }

    #sapo-category-modal .ecm-primary-button {
        padding: 9px 18px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        background: var(--ecm-green-700) !important;
        border: 1px solid var(--ecm-green-700) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease !important;
    }

    #sapo-category-modal .ecm-primary-button:hover:not(:disabled) {
        background: var(--ecm-green-800) !important;
    }

    #sapo-category-modal button:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Category list ---------- */
    #sapo-category-modal .ecm-list-heading {
        font-size: 12px !important;
        font-weight: 600 !important;
        color: var(--ecm-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        margin-bottom: 10px !important;
        background: transparent !important;
    }

    #sapo-category-modal .ecm-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
    }

    #sapo-category-modal .ecm-empty-state {
        padding: 32px 16px !important;
        text-align: center !important;
        font-size: 13px !important;
        color: var(--ecm-muted) !important;
        background: var(--ecm-bg) !important;
        border: 1px solid var(--ecm-border) !important;
        border-radius: 8px !important;
    }

    #sapo-category-modal .ecm-item {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 12px 14px !important;
        background: var(--ecm-white) !important;
        border: 1px solid var(--ecm-border) !important;
        border-radius: 8px !important;
        transition: border-color 0.15s ease, background 0.15s ease !important;
    }

    #sapo-category-modal .ecm-item:hover {
        border-color: var(--ecm-border-strong) !important;
        background: var(--ecm-bg) !important;
    }

    #sapo-category-modal .ecm-item-info {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
        min-width: 0 !important;
        flex: 1 1 200px !important;
    }

    #sapo-category-modal .ecm-item-info strong {
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: var(--ecm-text) !important;
        background: transparent !important;
    }

    #sapo-category-modal .ecm-item-info span {
        font-size: 12.5px !important;
        color: var(--ecm-muted) !important;
        background: transparent !important;
    }

    #sapo-category-modal .ecm-item-info small {
        font-size: 11.5px !important;
        color: #9ca3af !important;
        background: transparent !important;
    }

    #sapo-category-modal .ecm-item-controls {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex-shrink: 0 !important;
    }

    #sapo-category-modal .ecm-active-badge,
    #sapo-category-modal .ecm-inactive-badge {
        display: inline-block !important;
        padding: 3px 9px !important;
        border-radius: 999px !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
    }

    #sapo-category-modal .ecm-active-badge {
        background: var(--ecm-green-100) !important;
        color: var(--ecm-green-800) !important;
    }

    #sapo-category-modal .ecm-inactive-badge {
        background: #f1f5f9 !important;
        color: #64748b !important;
    }

    #sapo-category-modal .ecm-edit-button,
    #sapo-category-modal .ecm-delete-button {
        padding: 6px 12px !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: background 0.15s ease, color 0.15s ease !important;
    }

    #sapo-category-modal .ecm-edit-button {
        color: var(--ecm-blue) !important;
        background: var(--ecm-blue-light) !important;
        border: 1px solid #bfdbfe !important;
    }

    #sapo-category-modal .ecm-edit-button:hover:not(:disabled) {
        background: var(--ecm-blue) !important;
        color: #ffffff !important;
        border-color: var(--ecm-blue) !important;
    }

    #sapo-category-modal .ecm-delete-button {
        color: var(--ecm-red) !important;
        background: var(--ecm-red-light) !important;
        border: 1px solid #fecaca !important;
    }

    #sapo-category-modal .ecm-delete-button:hover:not(:disabled) {
        background: var(--ecm-red) !important;
        color: #ffffff !important;
        border-color: var(--ecm-red) !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 560px) {
        #sapo-category-modal {
            padding: 12px !important;
        }

        #sapo-category-modal .ecm-modal {
            max-height: calc(100vh - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
        }

        #sapo-category-modal .ecm-header,
        #sapo-category-modal .ecm-content {
            padding-left: 16px !important;
            padding-right: 16px !important;
        }

        #sapo-category-modal .ecm-item {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-category-modal .ecm-item-controls {
            justify-content: flex-end !important;
        }
    }
`;

export default function ExpenseCategoryManagerModal({
    isOpen,
    categories,
    isSubmitting,
    errorMessage,
    onClose,
    onSave,
    onDelete,
}: ExpenseCategoryManagerModalProps) {
    const [
        editingId,
        setEditingId,
    ] = useState<number | null>(null);

    const [
        name,
        setName,
    ] = useState('');

    const [
        description,
        setDescription,
    ] = useState('');

    const [
        isActive,
        setIsActive,
    ] = useState(true);

    const [
        localError,
        setLocalError,
    ] = useState('');

    const resetForm = (): void => {
        setEditingId(null);
        setName('');
        setDescription('');
        setIsActive(true);
        setLocalError('');
    };

    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const selectCategory = (
        category: ExpenseCategory,
    ): void => {
        setEditingId(
            category.id,
        );

        setName(
            category.name,
        );

        setDescription(
            category.description
            ?? '',
        );

        setIsActive(
            category.is_active,
        );

        setLocalError('');
    };

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (!name.trim()) {
            setLocalError(
                'Category name is required.',
            );

            return;
        }

        onSave(
            editingId,
            {
                name:
                    name.trim(),

                description:
                    description.trim(),

                is_active:
                    isActive,
            },
        );
    };

    return (
        <div id="sapo-category-modal">
            <style>
                {categoryModalStyles}
            </style>

            <section
                className="ecm-modal"
                role="dialog"
                aria-modal="true"
            >
                <header className="ecm-header">
                    <div>
                        <span className="ecm-kicker">
                            Expense setup
                        </span>

                        <h2>
                            Expense Categories
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="ecm-close-button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </header>

                <div className="ecm-content">
                    <form
                        className="ecm-form"
                        onSubmit={handleSubmit}
                    >
                        {(localError
                            || errorMessage) && (
                                <div
                                    className="ecm-alert"
                                    role="alert"
                                >
                                    {localError
                                        || errorMessage}
                                </div>
                            )}

                        <label className="ecm-field">
                            <span>
                                Category Name *
                            </span>

                            <input
                                type="text"
                                maxLength={120}
                                value={name}
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    setName(
                                        event
                                            .target
                                            .value,
                                    );

                                    setLocalError('');
                                }}
                            />
                        </label>

                        <label className="ecm-field">
                            <span>
                                Description
                            </span>

                            <textarea
                                rows={2}
                                maxLength={1000}
                                value={description}
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    setDescription(
                                        event
                                            .target
                                            .value,
                                    );
                                }}
                            />
                        </label>

                        <label className="ecm-active-toggle">
                            <input
                                type="checkbox"
                                checked={isActive}
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    setIsActive(
                                        event
                                            .target
                                            .checked,
                                    );
                                }}
                            />

                            <span>
                                Category is active
                            </span>
                        </label>

                        <div className="ecm-form-actions">
                            {editingId !== null && (
                                <button
                                    type="button"
                                    className="ecm-secondary-button"
                                    disabled={isSubmitting}
                                    onClick={resetForm}
                                >
                                    New Category
                                </button>
                            )}

                            <button
                                type="submit"
                                className="ecm-primary-button"
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? 'Saving...'
                                    : editingId
                                        !== null
                                        ? 'Update Category'
                                        : 'Add Category'}
                            </button>
                        </div>
                    </form>

                    <div>
                        <p className="ecm-list-heading">
                            All Categories
                        </p>

                        <div className="ecm-list">
                            {categories.length === 0 ? (
                                <div className="ecm-empty-state">
                                    No expense categories yet.
                                </div>
                            ) : (
                                categories.map(
                                    (category) => (
                                        <article
                                            key={
                                                category.id
                                            }
                                            className="ecm-item"
                                        >
                                            <div className="ecm-item-info">
                                                <strong>
                                                    {
                                                        category
                                                            .name
                                                    }
                                                </strong>

                                                <span>
                                                    {category
                                                        .description
                                                        || 'No description'}
                                                </span>

                                                <small>
                                                    {
                                                        category
                                                            .expenses_count
                                                    }{' '}
                                                    expense records
                                                </small>
                                            </div>

                                            <div className="ecm-item-controls">
                                                <span
                                                    className={
                                                        category
                                                            .is_active
                                                            ? 'ecm-active-badge'
                                                            : 'ecm-inactive-badge'
                                                    }
                                                >
                                                    {category
                                                        .is_active
                                                        ? 'Active'
                                                        : 'Inactive'}
                                                </span>

                                                <button
                                                    type="button"
                                                    className="ecm-edit-button"
                                                    disabled={isSubmitting}
                                                    onClick={() => {
                                                        selectCategory(
                                                            category,
                                                        );
                                                    }}
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    className="ecm-delete-button"
                                                    disabled={
                                                        isSubmitting
                                                        || category
                                                            .expenses_count
                                                        > 0
                                                    }
                                                    onClick={() => {
                                                        onDelete(
                                                            category,
                                                        );
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </article>
                                    ),
                                )
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}