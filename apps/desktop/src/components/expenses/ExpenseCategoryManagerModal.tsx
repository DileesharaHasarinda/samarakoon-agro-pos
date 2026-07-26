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
    ] = useState<number | null>(
        null,
    );

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
        <div className="modal-backdrop">
            <section
                className="expense-category-modal"
                role="dialog"
                aria-modal="true"
            >
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            Expense setup
                        </span>

                        <h2>
                            Expense Categories
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

                <div className="expense-category-content">
                    <form
                        className="expense-category-form"
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

                        <label>
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

                        <label>
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

                        <label className="expense-category-active">
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

                        <div className="expense-category-form-actions">
                            {editingId !== null && (
                                <button
                                    type="button"
                                    className="secondary-button"
                                    disabled={isSubmitting}
                                    onClick={resetForm}
                                >
                                    New Category
                                </button>
                            )}

                            <button
                                type="submit"
                                className="primary-button"
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

                    <div className="expense-category-list">
                        {categories.length === 0 ? (
                            <div className="table-state">
                                No expense categories.
                            </div>
                        ) : (
                            categories.map(
                                (category) => (
                                    <article
                                        key={
                                            category.id
                                        }
                                        className="expense-category-item"
                                    >
                                        <div>
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

                                        <div>
                                            <span
                                                className={
                                                    category
                                                        .is_active
                                                        ? 'active-badge'
                                                        : 'inactive-badge'
                                                }
                                            >
                                                {category
                                                    .is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>

                                            <button
                                                type="button"
                                                className="view-sale-button"
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
                                                className="delete-button"
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
            </section>
        </div>
    );
}