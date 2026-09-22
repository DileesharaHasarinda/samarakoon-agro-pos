import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {
    FormEvent,
    KeyboardEvent as ReactKeyboardEvent,
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
    createProductUnit,
    deleteProductUnit,
    getProductUnits,
    updateProductUnit,
} from '../../services/productUnitService';

import type {
    ProductUnit,
    ProductUnitPaginationMeta,
} from '../../types/productUnit';

const PAGE_SIZE_OPTIONS = [
    10,
    20,
    50,
    100,
] as const;

const EMPTY_PAGINATION:
    ProductUnitPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: null,
    to: null,
};

function errorMessage(
    error: unknown,
    fallback: string,
): string {
    if (
        error
        instanceof ApiError
    ) {
        return error.message;
    }

    if (
        error
        instanceof Error
    ) {
        return error.message;
    }

    return fallback;
}

type IconName =
    | 'edit'
    | 'plus'
    | 'refresh'
    | 'search'
    | 'trash'
    | 'unit'
    | 'x';

function Icon({
    name,
}: {
    name: IconName;
}) {
    const props = {
        viewBox:
            '0 0 24 24',

        fill:
            'none',

        stroke:
            'currentColor',

        strokeWidth:
            2,

        strokeLinecap:
            'round' as const,

        strokeLinejoin:
            'round' as const,

        'aria-hidden':
            true,
    };

    switch (name) {
        case 'plus':
            return (
                <svg {...props}>
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                </svg>
            );

        case 'edit':
            return (
                <svg {...props}>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
            );

        case 'trash':
            return (
                <svg {...props}>
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="m19 6-1 14H6L5 6" />
                </svg>
            );

        case 'refresh':
            return (
                <svg {...props}>
                    <path d="M20 11a8 8 0 1 0 2 5" />
                    <path d="M20 4v7h-7" />
                </svg>
            );

        case 'search':
            return (
                <svg {...props}>
                    <circle
                        cx="11"
                        cy="11"
                        r="7"
                    />
                    <path d="m20 20-4-4" />
                </svg>
            );

        case 'unit':
            return (
                <svg {...props}>
                    <path d="M4 6h16" />
                    <path d="M4 12h10" />
                    <path d="M4 18h16" />
                    <path d="M7 4v4" />
                    <path d="M11 4v4" />
                    <path d="M15 4v4" />
                    <path d="M7 16v4" />
                    <path d="M11 16v4" />
                    <path d="M15 16v4" />
                </svg>
            );

        case 'x':
        default:
            return (
                <svg {...props}>
                    <path d="m6 6 12 12" />
                    <path d="m18 6-12 12" />
                </svg>
            );
    }
}

const styles = `
#product-units-page,
#product-units-page *,
#product-units-page *::before,
#product-units-page *::after,
#product-unit-modal,
#product-unit-modal *,
#product-unit-modal *::before,
#product-unit-modal *::after {
    box-sizing: border-box !important;
}

#product-units-page,
#product-unit-modal {
    --pu-green-800: #166534;
    --pu-green-700: #15803d;
    --pu-green-50: #f0fdf4;
    --pu-red-700: #b91c1c;
    --pu-red-50: #fef2f2;
    --pu-blue-700: #1d4ed8;
    --pu-blue-50: #eff6ff;
    --pu-text: #111827;
    --pu-text-2: #374151;
    --pu-muted: #6b7280;
    --pu-border: #e5e7eb;
    --pu-border-strong: #d1d5db;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif !important;
}

#product-units-page {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 18px !important;
}

#product-units-page button,
#product-units-page input,
#product-units-page select,
#product-unit-modal button,
#product-unit-modal input {
    font: inherit !important;
}

#product-units-page svg,
#product-unit-modal svg {
    width: 16px !important;
    height: 16px !important;
}

#product-units-page .pu-header {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    flex-wrap: wrap !important;
    gap: 14px !important;
    padding: 20px 24px !important;
    background: #ffffff !important;
    border: 1px solid var(--pu-border) !important;
    border-radius: 10px !important;
}

#product-units-page .pu-header h1 {
    margin: 0 !important;
    color: var(--pu-text) !important;
    font-size: 22px !important;
    font-weight: 750 !important;
}

#product-units-page .pu-subtitle {
    margin: 4px 0 0 !important;
    color: var(--pu-muted) !important;
    font-size: 13px !important;
}

#product-units-page .pu-button,
#product-unit-modal .pu-button {
    display: inline-flex !important;
    min-height: 38px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    padding: 7px 13px !important;
    color: var(--pu-text-2) !important;
    font-size: 12.5px !important;
    font-weight: 700 !important;
    background: #ffffff !important;
    border: 1px solid var(--pu-border-strong) !important;
    border-radius: 8px !important;
    cursor: pointer !important;
}

#product-units-page .pu-button.primary,
#product-unit-modal .pu-button.primary {
    color: #ffffff !important;
    background: var(--pu-green-700) !important;
    border-color: var(--pu-green-700) !important;
}

#product-units-page .pu-button.danger {
    color: var(--pu-red-700) !important;
    background: var(--pu-red-50) !important;
    border-color: #fecaca !important;
}

#product-units-page .pu-button:disabled,
#product-unit-modal .pu-button:disabled {
    opacity: .52 !important;
    cursor: not-allowed !important;
}

#product-units-page .pu-alert {
    padding: 11px 13px !important;
    font-size: 13px !important;
    font-weight: 650 !important;
    border-radius: 8px !important;
}

#product-units-page .pu-alert.success {
    color: var(--pu-green-800) !important;
    background: var(--pu-green-50) !important;
    border: 1px solid #bbf7d0 !important;
}

#product-units-page .pu-alert.error {
    color: var(--pu-red-700) !important;
    background: var(--pu-red-50) !important;
    border: 1px solid #fecaca !important;
}

#product-units-page .pu-panel {
    display: flex !important;
    flex-direction: column !important;
    gap: 14px !important;
    padding: 18px !important;
    background: #ffffff !important;
    border: 1px solid var(--pu-border) !important;
    border-radius: 10px !important;
}

#product-units-page .pu-toolbar {
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 10px !important;
}

#product-units-page .pu-search {
    min-width: 220px !important;
    height: 39px !important;
    flex: 1 1 320px !important;
    padding: 0 12px !important;
    color: var(--pu-text-2) !important;
    background: #f9fafb !important;
    border: 1px solid var(--pu-border-strong) !important;
    border-radius: 8px !important;
    outline: none !important;
}

#product-units-page .pu-search:focus,
#product-unit-modal .pu-input:focus {
    background: #ffffff !important;
    border-color: var(--pu-green-700) !important;
    box-shadow: 0 0 0 3px rgba(21,128,61,.12) !important;
}

#product-units-page .pu-select {
    height: 39px !important;
    min-width: 120px !important;
    padding: 0 10px !important;
    color: var(--pu-text-2) !important;
    background: #ffffff !important;
    border: 1px solid var(--pu-border-strong) !important;
    border-radius: 8px !important;
}

#product-units-page .pu-count {
    display: inline-flex !important;
    min-height: 31px !important;
    align-items: center !important;
    padding: 5px 10px !important;
    color: var(--pu-green-800) !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    background: var(--pu-green-50) !important;
    border-radius: 999px !important;
}

#product-units-page .pu-table-wrap {
    overflow: hidden !important;
    border: 1px solid var(--pu-border) !important;
    border-radius: 8px !important;
}

#product-units-page table {
    width: 100% !important;
    border-collapse: collapse !important;
    table-layout: fixed !important;
}

#product-units-page th,
#product-units-page td {
    padding: 12px 13px !important;
    text-align: left !important;
    border-bottom: 1px solid #f1f5f9 !important;
}

#product-units-page th {
    color: var(--pu-muted) !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    background: #f9fafb !important;
}

#product-units-page td {
    color: var(--pu-text-2) !important;
    font-size: 13px !important;
}

#product-units-page tbody tr:last-child td {
    border-bottom: 0 !important;
}

#product-units-page .pu-unit-name {
    color: var(--pu-text) !important;
    font-size: 13.5px !important;
    font-weight: 750 !important;
}

#product-units-page .pu-usage {
    display: inline-flex !important;
    min-height: 25px !important;
    align-items: center !important;
    padding: 4px 8px !important;
    color: var(--pu-blue-700) !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    background: var(--pu-blue-50) !important;
    border-radius: 999px !important;
}

#product-units-page .pu-unused {
    color: var(--pu-muted) !important;
    background: #f3f4f6 !important;
}

#product-units-page .pu-actions {
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 6px !important;
}

#product-units-page .pu-empty {
    padding: 40px 16px !important;
    color: #9ca3af !important;
    text-align: center !important;
}

#product-units-page .pu-pagination {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 14px !important;
}

#product-units-page .pu-pagination span {
    color: var(--pu-muted) !important;
    font-size: 12px !important;
}

#product-unit-modal {
    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;
}

#product-unit-modal .pum-backdrop {
    position: absolute !important;
    inset: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 20px !important;
    background: rgba(5,18,10,.72) !important;
    backdrop-filter: blur(3px) !important;
}

#product-unit-modal .pum-dialog {
    width: min(520px, 100%) !important;
    overflow: hidden !important;
    background: #ffffff !important;
    border-radius: 14px !important;
    box-shadow: 0 24px 70px rgba(0,0,0,.34) !important;
}

#product-unit-modal .pum-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    padding: 16px 18px !important;
    color: #ffffff !important;
    background: linear-gradient(135deg,#052e16,#15803d) !important;
}

#product-unit-modal .pum-title {
    margin: 0 !important;
    font-size: 19px !important;
    font-weight: 800 !important;
}

#product-unit-modal .pum-close {
    display: grid !important;
    width: 38px !important;
    height: 38px !important;
    place-items: center !important;
    color: #ffffff !important;
    background: rgba(255,255,255,.12) !important;
    border: 1px solid rgba(255,255,255,.3) !important;
    border-radius: 8px !important;
    cursor: pointer !important;
}

#product-unit-modal .pum-body {
    display: grid !important;
    gap: 12px !important;
    padding: 18px !important;
}

#product-unit-modal .pum-info {
    padding: 10px 11px !important;
    color: var(--pu-text-2) !important;
    font-size: 11.5px !important;
    background: #f9fafb !important;
    border: 1px solid var(--pu-border) !important;
    border-radius: 8px !important;
}

#product-unit-modal .pum-error {
    padding: 10px 11px !important;
    color: var(--pu-red-700) !important;
    font-size: 12px !important;
    font-weight: 650 !important;
    background: var(--pu-red-50) !important;
    border: 1px solid #fecaca !important;
    border-radius: 8px !important;
}

#product-unit-modal .pum-field {
    display: grid !important;
    gap: 6px !important;
}

#product-unit-modal .pum-label {
    color: var(--pu-text-2) !important;
    font-size: 12px !important;
    font-weight: 750 !important;
}

#product-unit-modal .pu-input {
    width: 100% !important;
    height: 43px !important;
    padding: 0 11px !important;
    color: var(--pu-text) !important;
    border: 1px solid var(--pu-border-strong) !important;
    border-radius: 8px !important;
    outline: none !important;
}

#product-unit-modal .pum-footer {
    display: flex !important;
    justify-content: flex-end !important;
    gap: 8px !important;
    padding: 12px 18px !important;
    border-top: 1px solid var(--pu-border) !important;
}

@media (max-width: 720px) {
    #product-units-page .pu-header,
    #product-units-page .pu-toolbar {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #product-units-page .pu-button,
    #product-units-page .pu-search,
    #product-units-page .pu-select,
    #product-units-page .pu-count {
        width: 100% !important;
        min-width: 0 !important;
    }

    #product-units-page .pu-table-wrap {
        overflow-x: auto !important;
    }

    #product-units-page table {
        min-width: 620px !important;
    }
}
`;

export default function ProductUnitsPage() {
    const {
        token,
    } = useAuth();

    const nameInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const [
        units,
        setUnits,
    ] =
        useState<ProductUnit[]>(
            [],
        );

    const [
        pagination,
        setPagination,
    ] =
        useState<ProductUnitPaginationMeta>(
            EMPTY_PAGINATION,
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
        isLoading,
        setIsLoading,
    ] =
        useState(
            true,
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

    const [
        showForm,
        setShowForm,
    ] =
        useState(
            false,
        );

    const [
        editingUnit,
        setEditingUnit,
    ] =
        useState<ProductUnit | null>(
            null,
        );

    const [
        unitName,
        setUnitName,
    ] =
        useState(
            '',
        );

    const [
        formError,
        setFormError,
    ] =
        useState(
            '',
        );

    const [
        isSubmitting,
        setIsSubmitting,
    ] =
        useState(
            false,
        );

    const loadUnits =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
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
                        await getProductUnits(
                            token,
                            {
                                search,
                                page,
                                perPage,
                            },
                        );

                    setUnits(
                        response.data,
                    );

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    setPageError(
                        errorMessage(
                            error,
                            'Unable to load product units.',
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
                page,
                perPage,
            ],
        );

    useEffect(
        () => {
            void loadUnits();
        },
        [
            loadUnits,
        ],
    );

    useEffect(
        () => {
            if (!showForm) {
                return;
            }

            const timer =
                window.setTimeout(
                    () => {
                        nameInputRef
                            .current
                            ?.focus();

                        nameInputRef
                            .current
                            ?.select();
                    },
                    60,
                );

            const handleKey =
                (
                    event:
                        KeyboardEvent,
                ): void => {
                    if (
                        event.key
                        === 'Escape'
                        && !isSubmitting
                    ) {
                        event.preventDefault();

                        setShowForm(
                            false,
                        );
                    }
                };

            window.addEventListener(
                'keydown',
                handleKey,
            );

            return () => {
                window.clearTimeout(
                    timer,
                );

                window.removeEventListener(
                    'keydown',
                    handleKey,
                );
            };
        },
        [
            showForm,
            isSubmitting,
        ],
    );

    const openCreate =
        (): void => {
            setEditingUnit(
                null,
            );

            setUnitName(
                '',
            );

            setFormError(
                '',
            );

            setSuccessMessage(
                '',
            );

            setShowForm(
                true,
            );
        };

    const openEdit =
        (
            unit:
                ProductUnit,
        ): void => {
            setEditingUnit(
                unit,
            );

            setUnitName(
                unit.name,
            );

            setFormError(
                '',
            );

            setSuccessMessage(
                '',
            );

            setShowForm(
                true,
            );
        };

    const closeForm =
        (): void => {
            if (isSubmitting) {
                return;
            }

            setShowForm(
                false,
            );

            setEditingUnit(
                null,
            );

            setUnitName(
                '',
            );

            setFormError(
                '',
            );
        };

    const saveUnit =
        async (
            event:
                FormEvent<HTMLFormElement>,
        ): Promise<void> => {
            event.preventDefault();

            if (
                !token
                || isSubmitting
            ) {
                return;
            }

            const name =
                unitName
                    .replace(
                        /\s+/g,
                        ' ',
                    )
                    .trim();

            if (!name) {
                setFormError(
                    'Please enter the product unit name.',
                );

                return;
            }

            setIsSubmitting(
                true,
            );

            setFormError(
                '',
            );

            try {
                const response =
                    editingUnit
                        ? await updateProductUnit(
                            token,
                            editingUnit.id,
                            {
                                name,
                            },
                        )
                        : await createProductUnit(
                            token,
                            {
                                name,
                            },
                        );

                setSuccessMessage(
                    response.message,
                );

                setShowForm(
                    false,
                );

                setEditingUnit(
                    null,
                );

                setUnitName(
                    '',
                );

                await loadUnits();
            } catch (error) {
                setFormError(
                    errorMessage(
                        error,
                        editingUnit
                            ? 'Unable to update product unit.'
                            : 'Unable to create product unit.',
                    ),
                );
            } finally {
                setIsSubmitting(
                    false,
                );
            }
        };

    const removeUnit =
        async (
            unit:
                ProductUnit,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            const confirmed =
                window.confirm(
                    `Delete product unit "${unit.name}"?`,
                );

            if (!confirmed) {
                return;
            }

            setPageError(
                '',
            );

            setSuccessMessage(
                '',
            );

            try {
                const response =
                    await deleteProductUnit(
                        token,
                        unit.id,
                    );

                setSuccessMessage(
                    response.message,
                );

                if (
                    units.length === 1
                    && page > 1
                ) {
                    setPage(
                        (
                            current,
                        ) =>
                            Math.max(
                                1,
                                current - 1,
                            ),
                    );
                } else {
                    await loadUnits();
                }
            } catch (error) {
                setPageError(
                    errorMessage(
                        error,
                        'Unable to delete product unit.',
                    ),
                );
            }
        };

    const modal =
        showForm
        && typeof document
        !== 'undefined'
            ? createPortal(
                <div id="product-unit-modal">
                    <style>
                        {styles}
                    </style>

                    <div
                        className="pum-backdrop"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (
                                event.target
                                === event.currentTarget
                            ) {
                                closeForm();
                            }
                        }}
                    >
                        <section
                            className="pum-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="product-unit-modal-title"
                        >
                            <header className="pum-header">
                                <h2
                                    id="product-unit-modal-title"
                                    className="pum-title"
                                >
                                    {editingUnit
                                        ? 'Edit Product Unit'
                                        : 'Add Product Unit'}
                                </h2>

                                <button
                                    type="button"
                                    className="pum-close"
                                    aria-label="Close"
                                    onClick={
                                        closeForm
                                    }
                                >
                                    <Icon name="x" />
                                </button>
                            </header>

                            <form
                                onSubmit={(event) => {
                                    void saveUnit(
                                        event,
                                    );
                                }}
                            >
                                <div className="pum-body">
                                    {formError && (
                                        <div className="pum-error">
                                            {formError}
                                        </div>
                                    )}

                                    <div className="pum-info">
                                        Examples: Piece, Packet, Bag,
                                        Bottle, Box, Tin, Roll, Set.
                                        Add only the units your business
                                        actually uses.
                                    </div>

                                    <label className="pum-field">
                                        <span className="pum-label">
                                            Product Unit Name *
                                        </span>

                                        <input
                                            ref={
                                                nameInputRef
                                            }
                                            className="pu-input"
                                            value={
                                                unitName
                                            }
                                            maxLength={
                                                80
                                            }
                                            placeholder="Example: Packet"
                                            autoComplete="off"
                                            onKeyDown={(
                                                event:
                                                    ReactKeyboardEvent<HTMLInputElement>,
                                            ) => {
                                                if (
                                                    event.key
                                                    === 'Enter'
                                                ) {
                                                    /*
                                                     * Keep normal form-submit
                                                     * behaviour for Enter.
                                                     */
                                                    return;
                                                }
                                            }}
                                            onChange={(event) => {
                                                setUnitName(
                                                    event
                                                        .target
                                                        .value,
                                                );

                                                setFormError(
                                                    '',
                                                );
                                            }}
                                        />
                                    </label>
                                </div>

                                <footer className="pum-footer">
                                    <button
                                        type="button"
                                        className="pu-button"
                                        disabled={
                                            isSubmitting
                                        }
                                        onClick={
                                            closeForm
                                        }
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="pu-button primary"
                                        disabled={
                                            isSubmitting
                                        }
                                    >
                                        {isSubmitting
                                            ? 'Saving...'
                                            : editingUnit
                                                ? 'Update Unit'
                                                : 'Create Unit'}
                                    </button>
                                </footer>
                            </form>
                        </section>
                    </div>
                </div>,
                document.body,
            )
            : null;

    return (
        <>
            <div id="product-units-page">
                <style>
                    {styles}
                </style>

                <header className="pu-header">
                    <div>
                        <h1>
                            Product Units
                        </h1>

                        <p className="pu-subtitle">
                            Manage the units available in Product
                            Main Unit and Package Unit dropdowns.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="pu-button primary"
                        onClick={
                            openCreate
                        }
                    >
                        <Icon name="plus" />

                        Add Product Unit
                    </button>
                </header>

                {successMessage && (
                    <div className="pu-alert success">
                        {successMessage}
                    </div>
                )}

                {pageError && (
                    <div className="pu-alert error">
                        {pageError}
                    </div>
                )}

                <section className="pu-panel">
                    <form
                        className="pu-toolbar"
                        onSubmit={(event) => {
                            event.preventDefault();

                            setPage(
                                1,
                            );

                            setSearch(
                                searchInput
                                    .trim(),
                            );
                        }}
                    >
                        <input
                            type="search"
                            className="pu-search"
                            value={
                                searchInput
                            }
                            placeholder="Search product units..."
                            aria-label="Search product units"
                            onChange={(event) => {
                                setSearchInput(
                                    event
                                        .target
                                        .value,
                                );
                            }}
                        />

                        <button
                            type="submit"
                            className="pu-button"
                        >
                            <Icon name="search" />

                            Search
                        </button>

                        <button
                            type="button"
                            className="pu-button"
                            disabled={
                                isLoading
                            }
                            onClick={() => {
                                void loadUnits();
                            }}
                        >
                            <Icon name="refresh" />

                            Refresh
                        </button>

                        <select
                            className="pu-select"
                            value={
                                perPage
                            }
                            aria-label="Rows per page"
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
                            {PAGE_SIZE_OPTIONS.map(
                                (
                                    option,
                                ) => (
                                    <option
                                        key={
                                            option
                                        }
                                        value={
                                            option
                                        }
                                    >
                                        {option} Rows
                                    </option>
                                ),
                            )}
                        </select>

                        <span className="pu-count">
                            {pagination.total}
                            {' '}
                            {pagination.total === 1
                                ? 'Unit'
                                : 'Units'}
                        </span>
                    </form>

                    <div className="pu-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>
                                        Unit Name
                                    </th>

                                    <th>
                                        Usage
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
                                            colSpan={3}
                                            className="pu-empty"
                                        >
                                            Loading product units...
                                        </td>
                                    </tr>
                                ) : units.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="pu-empty"
                                        >
                                            No product units found.
                                            Use "Add Product Unit" to
                                            create your first unit.
                                        </td>
                                    </tr>
                                ) : (
                                    units.map(
                                        (
                                            unit,
                                        ) => (
                                            <tr
                                                key={
                                                    unit.id
                                                }
                                            >
                                                <td>
                                                    <span className="pu-unit-name">
                                                        {/* <Icon name="unit" /> */}
                                                        {' '}
                                                        {unit.name}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span
                                                        className={[
                                                            'pu-usage',
                                                            unit.is_in_use
                                                                ? ''
                                                                : 'pu-unused',
                                                        ]
                                                            .filter(
                                                                Boolean,
                                                            )
                                                            .join(
                                                                ' ',
                                                            )}
                                                    >
                                                        {unit.is_in_use
                                                            ? (
                                                                `${unit.product_count} product(s), ${unit.variant_count} variant(s)`
                                                            )
                                                            : 'Not used yet'}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="pu-actions">
                                                        <button
                                                            type="button"
                                                            className="pu-button"
                                                            onClick={() => {
                                                                openEdit(
                                                                    unit,
                                                                );
                                                            }}
                                                        >
                                                            <Icon name="edit" />

                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="pu-button danger"
                                                            disabled={
                                                                unit.is_in_use
                                                            }
                                                            title={
                                                                unit.is_in_use
                                                                    ? 'Used units cannot be deleted.'
                                                                    : 'Delete product unit'
                                                            }
                                                            onClick={() => {
                                                                void removeUnit(
                                                                    unit,
                                                                );
                                                            }}
                                                        >
                                                            <Icon name="trash" />

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
                        <footer className="pu-pagination">
                            <button
                                type="button"
                                className="pu-button"
                                disabled={
                                    page <= 1
                                }
                                onClick={() => {
                                    setPage(
                                        (
                                            current,
                                        ) =>
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
                                Page
                                {' '}
                                <strong>
                                    {pagination.current_page}
                                </strong>
                                {' '}
                                of
                                {' '}
                                <strong>
                                    {pagination.last_page}
                                </strong>
                            </span>

                            <button
                                type="button"
                                className="pu-button"
                                disabled={
                                    page
                                    >= pagination.last_page
                                }
                                onClick={() => {
                                    setPage(
                                        (
                                            current,
                                        ) =>
                                            Math.min(
                                                pagination.last_page,
                                                current + 1,
                                            ),
                                    );
                                }}
                            >
                                Next
                            </button>
                        </footer>
                    )}
                </section>
            </div>

            {modal}
        </>
    );
}
