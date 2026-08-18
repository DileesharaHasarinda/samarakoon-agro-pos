import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {
    FormEvent,
    KeyboardEvent as ReactKeyboardEvent,
    RefObject,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import {
    useNavigate,
} from 'react-router';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    createProduct,
    deleteProduct,
    getProductCategoryOptions,
    getProducts,
    updateProduct,
} from '../../services/productService';

import type {
    Product,
    ProductCategory,
    ProductInput,
    ProductPaginationMeta,
    ProductVariantInput,
} from '../../types/product';

/* =========================================================
   CONSTANTS
   ========================================================= */

const PAGE_SIZE_OPTIONS = [
    10,
    20,
    50,
    100,
] as const;

const COMMON_UNITS = [
    'Piece',
    'Packet',
    'Bag',
    'Bottle',
    'Box',
    'Kilogram',
    'Gram',
    'Litre',
    'Millilitre',
    'Metre',
    'Foot',
    'Roll',
    'Set',
    'Pair',
    'Dozen',
] as const;

const VARIANT_SIZE_UNITS = [
    'g',
    'kg',
    'mg',
    'ml',
    'L',
    'cm',
    'm',
    'Piece',
] as const;

const EMPTY_PAGINATION:
    ProductPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: null,
    to: null,
};


interface SearchableSelectOption {
    value: string;
    label: string;
    secondary?: string;
    searchText?: string;
}

interface SearchableSelectProps {
    value: string;
    options: SearchableSelectOption[];
    placeholder: string;
    searchPlaceholder: string;
    emptyMessage: string;
    disabled?: boolean;
    ariaLabel: string;
    triggerRef?: RefObject<HTMLButtonElement | null>;
    dataVariantIndex?: number;
    dataVariantField?: string;
    onChange: (value: string) => void;
    onAdvance: () => void;
}

const COMMON_UNIT_OPTIONS:
    SearchableSelectOption[] =
    COMMON_UNITS.map(
        (
            unit,
        ) => ({
            value:
                unit,

            label:
                unit,

            searchText:
                unit,
        }),
    );

const VARIANT_SIZE_UNIT_OPTIONS:
    SearchableSelectOption[] =
    VARIANT_SIZE_UNITS.map(
        (
            unit,
        ) => ({
            value:
                unit,

            label:
                unit,

            searchText:
                unit,
        }),
    );

/* =========================================================
   FORM
   ========================================================= */

const createEmptyVariant =
    (
        packageUnit = '',
    ): ProductVariantInput => ({
        id: null,
        size_value: '',
        size_unit: '',
        package_unit:
            packageUnit,
        barcode: '',
        is_active: true,
    });

const createEmptyForm =
    (): ProductInput => ({
        category_id: null,
        name: '',
        unit: '',
        barcode: '',
        variants: [],
    });

/* =========================================================
   HELPERS
   ========================================================= */

function getErrorMessage(
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

function formatNumber(
    value:
        | number
        | string
        | null
        | undefined,
): string {
    const numberValue =
        Number(
            value ?? 0,
        );

    if (
        !Number.isFinite(
            numberValue,
        )
    ) {
        return String(
            value ?? 0,
        );
    }

    return new Intl.NumberFormat(
        'en-GB',
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        },
    ).format(
        numberValue,
    );
}

/* =========================================================
   ICON
   ========================================================= */

type IconName =
    | 'alert'
    | 'box'
    | 'check'
    | 'chevron-left'
    | 'chevron-right'
    | 'edit'
    | 'eye'
    | 'info'
    | 'plus'
    | 'refresh'
    | 'search'
    | 'trash'
    | 'x';

function Icon({
    name,
}: {
    name: IconName;
}) {
    const props = {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
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

        case 'eye':
            return (
                <svg {...props}>
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle
                        cx="12"
                        cy="12"
                        r="2.5"
                    />
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

        case 'refresh':
            return (
                <svg {...props}>
                    <path d="M20 11a8 8 0 1 0 2 5" />
                    <path d="M20 4v7h-7" />
                </svg>
            );

        case 'check':
            return (
                <svg {...props}>
                    <path d="m5 12 4 4L19 6" />
                </svg>
            );

        case 'chevron-left':
            return (
                <svg {...props}>
                    <path d="m15 18-6-6 6-6" />
                </svg>
            );

        case 'chevron-right':
            return (
                <svg {...props}>
                    <path d="m9 18 6-6-6-6" />
                </svg>
            );

        case 'alert':
            return (
                <svg {...props}>
                    <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                </svg>
            );

        case 'info':
            return (
                <svg {...props}>
                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                    />
                    <path d="M12 11v5" />
                    <path d="M12 8h.01" />
                </svg>
            );

        case 'box':
            return (
                <svg {...props}>
                    <path d="m21 8-9 5-9-5" />
                    <path d="m3 8 9-5 9 5v8l-9 5-9-5Z" />
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


/* =========================================================
   SEARCHABLE SELECT
   ========================================================= */

function SearchableSelect({
    value,
    options,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    disabled = false,
    ariaLabel,
    triggerRef,
    dataVariantIndex,
    dataVariantField,
    onChange,
    onAdvance,
}: SearchableSelectProps) {
    const rootRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    const searchInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const optionButtonRefs =
        useRef<
            Map<
                string,
                HTMLButtonElement
            >
        >(
            new Map(),
        );

    const [
        isOpen,
        setIsOpen,
    ] =
        useState(
            false,
        );

    const [
        searchQuery,
        setSearchQuery,
    ] =
        useState(
            '',
        );

    const [
        highlightedIndex,
        setHighlightedIndex,
    ] =
        useState(
            0,
        );

    const selectedOption =
        useMemo(
            () =>
                options.find(
                    (
                        option,
                    ) =>
                        option.value
                        === value,
                )
                ?? null,
            [
                options,
                value,
            ],
        );

    const filteredOptions =
        useMemo(
            () => {
                const query =
                    searchQuery
                        .trim()
                        .toLowerCase();

                if (!query) {
                    return options;
                }

                return options.filter(
                    (
                        option,
                    ) => {
                        const searchValue = [
                            option.label,
                            option.secondary,
                            option.searchText,
                        ]
                            .filter(
                                Boolean,
                            )
                            .join(
                                ' ',
                            )
                            .toLowerCase();

                        return searchValue
                            .includes(
                                query,
                            );
                    },
                );
            },
            [
                options,
                searchQuery,
            ],
        );

    useEffect(
        () => {
            if (!isOpen) {
                return;
            }

            const selectedIndex =
                options
                    .findIndex(
                        (
                            option,
                        ) =>
                            option.value
                            === value,
                    );

            setHighlightedIndex(
                selectedIndex >= 0
                    ? selectedIndex
                    : 0,
            );

            const timer =
                window.setTimeout(
                    () => {
                        searchInputRef
                            .current
                            ?.focus();

                        searchInputRef
                            .current
                            ?.select();
                    },
                    25,
                );

            const handleOutsideClick =
                (
                    event:
                        MouseEvent,
                ): void => {
                    if (
                        event.target
                        instanceof Node
                        && !rootRef
                            .current
                            ?.contains(
                                event.target,
                            )
                    ) {
                        setIsOpen(
                            false,
                        );

                        setSearchQuery(
                            '',
                        );
                    }
                };

            document.addEventListener(
                'mousedown',
                handleOutsideClick,
            );

            return () => {
                window.clearTimeout(
                    timer,
                );

                document.removeEventListener(
                    'mousedown',
                    handleOutsideClick,
                );
            };
        },
        [
            isOpen,
            options,
            value,
        ],
    );

    useEffect(
        () => {
            if (
                isOpen
                && searchQuery
            ) {
                setHighlightedIndex(
                    0,
                );
            }
        },
        [
            isOpen,
            searchQuery,
        ],
    );

    const closeDropdown =
        (
            restoreFocus = false,
        ): void => {
            setIsOpen(
                false,
            );

            setSearchQuery(
                '',
            );

            if (restoreFocus) {
                window.setTimeout(
                    () => {
                        (
                            triggerRef
                                ?.current
                            ?? rootRef
                                .current
                                ?.querySelector<HTMLButtonElement>(
                                    '.pm-searchable-trigger',
                                )
                        )
                            ?.focus();
                    },
                    0,
                );
            }
        };

    const chooseOption =
        (
            option:
                SearchableSelectOption,
        ): void => {
            onChange(
                option.value,
            );

            closeDropdown();

            window.setTimeout(
                () => {
                    onAdvance();
                },
                0,
            );
        };

    const moveHighlight =
        (
            direction:
                number,
        ): void => {
            if (
                filteredOptions.length
                === 0
            ) {
                return;
            }

            setHighlightedIndex(
                (
                    current,
                ) => {
                    const next =
                        (
                            current
                            + direction
                            + filteredOptions
                                .length
                        )
                        % filteredOptions
                            .length;

                    const option =
                        filteredOptions[
                        next
                        ];

                    if (option) {
                        window.setTimeout(
                            () => {
                                optionButtonRefs
                                    .current
                                    .get(
                                        option.value,
                                    )
                                    ?.scrollIntoView({
                                        block:
                                            'nearest',
                                    });
                            },
                            0,
                        );
                    }

                    return next;
                },
            );
        };

    const handleSearchKeyDown =
        (
            event:
                ReactKeyboardEvent<HTMLInputElement>,
        ): void => {
            if (
                event.key
                === 'ArrowDown'
            ) {
                event.preventDefault();

                moveHighlight(
                    1,
                );

                return;
            }

            if (
                event.key
                === 'ArrowUp'
            ) {
                event.preventDefault();

                moveHighlight(
                    -1,
                );

                return;
            }

            if (
                event.key
                === 'Enter'
            ) {
                event.preventDefault();
                event.stopPropagation();

                const option =
                    filteredOptions[
                    highlightedIndex
                    ];

                if (option) {
                    chooseOption(
                        option,
                    );
                }

                return;
            }

            if (
                event.key
                === 'Escape'
            ) {
                event.preventDefault();
                event.stopPropagation();

                closeDropdown(
                    true,
                );
            }
        };

    return (
        <div
            ref={
                rootRef
            }
            className={
                isOpen
                    ? 'pm-searchable-select is-open'
                    : 'pm-searchable-select'
            }
        >
            <button
                ref={
                    triggerRef
                }
                type="button"
                className={[
                    'pm-searchable-trigger',
                    selectedOption
                        ? ''
                        : 'placeholder',
                ]
                    .filter(
                        Boolean,
                    )
                    .join(
                        ' ',
                    )}
                disabled={
                    disabled
                }
                aria-label={
                    ariaLabel
                }
                aria-haspopup="listbox"
                aria-expanded={
                    isOpen
                }
                data-variant-index={
                    dataVariantIndex
                }
                data-variant-field={
                    dataVariantField
                }
                onClick={() => {
                    setIsOpen(
                        (
                            current,
                        ) =>
                            !current,
                    );
                }}
                onKeyDown={(event) => {
                    /*
                     * ENTER always opens the dropdown.
                     *
                     * This intentionally differs from a native <select>:
                     * the user can immediately type into the search box.
                     */
                    if (
                        (
                            event.key
                            === 'Enter'
                            || event.key
                            === 'ArrowDown'
                            || event.key
                            === ' '
                        )
                        && !isOpen
                    ) {
                        event.preventDefault();
                        event.stopPropagation();

                        setIsOpen(
                            true,
                        );

                        return;
                    }

                    if (
                        event.key
                        === 'Escape'
                        && isOpen
                    ) {
                        event.preventDefault();
                        event.stopPropagation();

                        closeDropdown(
                            true,
                        );
                    }
                }}
            >
                <span className="pm-searchable-trigger-text">
                    {selectedOption
                        ?.label
                        ?? placeholder}
                </span>

                <span
                    className={
                        isOpen
                            ? 'pm-searchable-chevron open'
                            : 'pm-searchable-chevron'
                    }
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="m7 10 5 5 5-5" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="pm-searchable-menu">
                    <div className="pm-searchable-search-wrap">
                        <span className="pm-searchable-search-icon">
                            <Icon name="search" />
                        </span>

                        <input
                            ref={
                                searchInputRef
                            }
                            type="search"
                            className="pm-searchable-search-input"
                            value={
                                searchQuery
                            }
                            placeholder={
                                searchPlaceholder
                            }
                            autoComplete="off"
                            spellCheck={
                                false
                            }
                            onChange={(event) => {
                                setSearchQuery(
                                    event
                                        .target
                                        .value,
                                );
                            }}
                            onKeyDown={
                                handleSearchKeyDown
                            }
                        />
                    </div>

                    <div
                        className="pm-searchable-options"
                        role="listbox"
                        aria-label={
                            ariaLabel
                        }
                    >
                        {filteredOptions.length
                            === 0 ? (
                            <div className="pm-searchable-empty">
                                <Icon name="search" />

                                <strong>
                                    No results found
                                </strong>

                                <span>
                                    {emptyMessage}
                                </span>
                            </div>
                        ) : (
                            filteredOptions.map(
                                (
                                    option,
                                    index,
                                ) => {
                                    const selected =
                                        option.value
                                        === value;

                                    const highlighted =
                                        index
                                        === highlightedIndex;

                                    return (
                                        <button
                                            ref={(node) => {
                                                if (node) {
                                                    optionButtonRefs
                                                        .current
                                                        .set(
                                                            option.value,
                                                            node,
                                                        );
                                                } else {
                                                    optionButtonRefs
                                                        .current
                                                        .delete(
                                                            option.value,
                                                        );
                                                }
                                            }}
                                            key={
                                                option.value
                                            }
                                            type="button"
                                            role="option"
                                            aria-selected={
                                                selected
                                            }
                                            className={[
                                                'pm-searchable-option',
                                                selected
                                                    ? 'selected'
                                                    : '',
                                                highlighted
                                                    ? 'highlighted'
                                                    : '',
                                            ]
                                                .filter(
                                                    Boolean,
                                                )
                                                .join(
                                                    ' ',
                                                )}
                                            onMouseEnter={() => {
                                                setHighlightedIndex(
                                                    index,
                                                );
                                            }}
                                            onMouseDown={(event) => {
                                                event.preventDefault();
                                            }}
                                            onClick={() => {
                                                chooseOption(
                                                    option,
                                                );
                                            }}
                                        >
                                            <span className="pm-searchable-option-copy">
                                                <strong>
                                                    {option.label}
                                                </strong>

                                                {option.secondary && (
                                                    <small>
                                                        {
                                                            option.secondary
                                                        }
                                                    </small>
                                                )}
                                            </span>

                                            {selected && (
                                                <span className="pm-searchable-option-check">
                                                    <Icon name="check" />
                                                </span>
                                            )}
                                        </button>
                                    );
                                },
                            )
                        )}
                    </div>

                    <div className="pm-searchable-keyboard-help">
                        Type to search • ↑ ↓ move • Enter select • Esc close
                    </div>
                </div>
            )}
        </div>
    );
}

/* =========================================================
   CSS
   ========================================================= */

const productsPageStyles = `
#sapo-products,
#sapo-products *,
#sapo-products *::before,
#sapo-products *::after,
#sapo-product-modal,
#sapo-product-modal *,
#sapo-product-modal *::before,
#sapo-product-modal *::after {
    box-sizing: border-box !important;
}

#sapo-products,
#sapo-product-modal {
    --green: #15803d;
    --green-dark: #14532d;
    --green-light: #f0fdf4;
    --border: #d0d5dd;
    --border-soft: #e4e7ec;
    --text: #101828;
    --muted: #667085;
    --danger: #b42318;

    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
        Roboto, Arial, sans-serif !important;
}

#sapo-products {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    flex-direction: column !important;
    gap: 20px !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow-x: hidden !important;
    color: var(--text) !important;
    background: transparent !important;
}

#sapo-products button,
#sapo-products input,
#sapo-products select,
#sapo-product-modal button,
#sapo-product-modal input,
#sapo-product-modal select {
    font: inherit !important;
}

#sapo-products svg,
#sapo-product-modal svg {
    width: 18px !important;
    height: 18px !important;
}

#sapo-products .pp-container {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    flex-direction: column !important;
    gap: 20px !important;
    margin: 0 !important;
}

#sapo-products .pp-header {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 20px !important;
    padding: 20px 24px !important;
    background: #ffffff !important;
    border: 1px solid var(--border-soft) !important;
    border-radius: 10px !important;
}

#sapo-products .pp-kicker {
    display: block !important;
    margin-bottom: 3px !important;
    color: var(--green) !important;
    font-size: 12px !important;
    font-weight: 750 !important;
    letter-spacing: .04em !important;
    text-transform: uppercase !important;
}

#sapo-products h1 {
    margin: 0 !important;
    color: var(--text) !important;
    font-size: 22px !important;
    font-weight: 750 !important;
    line-height: 1.3 !important;
}

#sapo-products .pp-subtitle {
    margin: 3px 0 0 !important;
    color: var(--muted) !important;
    font-size: 13.5px !important;
}

#sapo-products .pp-header-actions,
#sapo-products .pp-actions,
#sapo-product-modal .pm-footer {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
}

#sapo-products .pp-header-actions,
#sapo-products .pp-actions {
    min-width: 0 !important;
    flex-wrap: wrap !important;
}

#sapo-products .pp-button,
#sapo-product-modal .pm-button {
    display: inline-flex !important;
    min-height: 42px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;
    padding: 8px 14px !important;
    color: #344054 !important;
    font-size: 13px !important;
    font-weight: 750 !important;
    background: #fff !important;
    border: 1px solid #b8c0c7 !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#sapo-products .pp-button-primary,
#sapo-product-modal .pm-button-primary {
    color: white !important;
    background: var(--green) !important;
    border-color: var(--green) !important;
}

#sapo-products .pp-button-danger,
#sapo-product-modal .pm-button-danger {
    color: var(--danger) !important;
    background: #fef3f2 !important;
    border-color: #fda29b !important;
}

#sapo-products button:disabled,
#sapo-product-modal button:disabled {
    opacity: .5 !important;
    cursor: not-allowed !important;
}

#sapo-products .pp-count {
    padding: 9px 12px !important;
    color: var(--green-dark) !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    background: var(--green-light) !important;
    border-radius: 8px !important;
}

#sapo-products .pp-alert {
    margin-top: 12px !important;
    padding: 12px 14px !important;
    font-size: 13px !important;
    font-weight: 650 !important;
    border-radius: 10px !important;
}

#sapo-products .pp-alert-success {
    color: #14532d !important;
    background: #f0fdf4 !important;
    border: 1px solid #86efac !important;
}

#sapo-products .pp-alert-error {
    color: #991b1b !important;
    background: #fef2f2 !important;
    border: 1px solid #fca5a5 !important;
}

#sapo-products .pp-panel {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    margin: 0 !important;
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid var(--border-soft) !important;
    border-radius: 10px !important;
}

#sapo-products .pp-toolbar {
    display: grid !important;
    grid-template-columns: minmax(250px, 1fr) auto 120px !important;
    gap: 10px !important;
    padding: 14px !important;
    border-bottom: 1px solid var(--border-soft) !important;
}

#sapo-products .pp-field,
#sapo-product-modal .pm-field {
    display: grid !important;
    gap: 6px !important;
    min-width: 0 !important;
}

#sapo-products .pp-label,
#sapo-product-modal .pm-label {
    color: #344054 !important;
    font-size: 12px !important;
    font-weight: 750 !important;
}

#sapo-products .pp-input,
#sapo-products .pp-select,
#sapo-product-modal .pm-input,
#sapo-product-modal .pm-select {
    width: 100% !important;
    min-height: 43px !important;
    padding: 8px 11px !important;
    color: var(--text) !important;
    background: white !important;
    border: 1px solid #aeb8b1 !important;
    border-radius: 8px !important;
    outline: none !important;
}

#sapo-products .pp-input:focus,
#sapo-products .pp-select:focus,
#sapo-product-modal .pm-input:focus,
#sapo-product-modal .pm-select:focus {
    border-color: var(--green) !important;
    box-shadow: 0 0 0 3px rgba(21,128,61,.14) !important;
}

#sapo-products .pp-table-scroll {
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    max-height: 560px !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    scrollbar-width: thin !important;
}

#sapo-products table {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    table-layout: fixed !important;
    border-collapse: collapse !important;
}

#sapo-products th,
#sapo-products td {
    min-width: 0 !important;
    padding: 12px !important;
    text-align: left !important;
    vertical-align: middle !important;
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
    border-bottom: 1px solid var(--border-soft) !important;
}

#sapo-products th:nth-child(1),
#sapo-products td:nth-child(1) {
    width: 24% !important;
}

#sapo-products th:nth-child(2),
#sapo-products td:nth-child(2) {
    width: 18% !important;
}

#sapo-products th:nth-child(3),
#sapo-products td:nth-child(3) {
    width: 12% !important;
}

#sapo-products th:nth-child(4),
#sapo-products td:nth-child(4) {
    width: 20% !important;
}

#sapo-products th:nth-child(5),
#sapo-products td:nth-child(5) {
    width: 10% !important;
}

#sapo-products th:nth-child(6),
#sapo-products td:nth-child(6) {
    width: 16% !important;
}

#sapo-products th {
    color: white !important;
    font-size: 12px !important;
    background: var(--green-dark) !important;
}

#sapo-products td {
    font-size: 13px !important;
}

#sapo-products tbody tr:hover td {
    background: #f6fbf7 !important;
}

#sapo-products .pp-product-name {
    display: block !important;
    font-size: 14px !important;
    font-weight: 800 !important;
}

#sapo-products .pp-small {
    display: block !important;
    margin-top: 3px !important;
    color: var(--muted) !important;
    font-size: 11px !important;
}

#sapo-products .pp-badge {
    display: inline-flex !important;
    align-items: center !important;
    padding: 5px 8px !important;
    font-size: 11px !important;
    font-weight: 750 !important;
    background: var(--green-light) !important;
    border-radius: 999px !important;
}

#sapo-products .pp-variants {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 5px !important;
}

#sapo-products .pp-variant {
    padding: 5px 8px !important;
    color: #344054 !important;
    font-size: 11px !important;
    font-weight: 750 !important;
    background: #f2f4f7 !important;
    border: 1px solid #d0d5dd !important;
    border-radius: 7px !important;
}

#sapo-products .pp-stock-group {
    display: grid !important;
    gap: 6px !important;
}

#sapo-products .pp-stock-variant {
    display: grid !important;
    gap: 3px !important;
}

#sapo-products .pp-stock-name {
    color: #475467 !important;
    font-size: 10px !important;
    font-weight: 800 !important;
}

#sapo-products .pp-stock {
    display: inline-flex !important;
    width: fit-content !important;
    padding: 5px 8px !important;
    color: var(--green-dark) !important;
    font-weight: 800 !important;
    background: var(--green-light) !important;
    border-radius: 7px !important;
}

#sapo-products .pp-pagination {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    padding: 12px 14px !important;
}

#sapo-product-modal {
    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;
}

#sapo-product-modal .pm-backdrop {
    position: absolute !important;
    inset: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 20px !important;
    background: rgba(5,18,10,.72) !important;
}

#sapo-product-modal .pm-dialog {
    display: flex !important;
    width: min(1000px, 100%) !important;
    max-height: calc(100dvh - 40px) !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: white !important;
    border-radius: 16px !important;
    box-shadow: 0 25px 70px rgba(0,0,0,.35) !important;
}

#sapo-product-modal .pm-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 15px !important;
    padding: 18px 20px !important;
    color: white !important;
    background: linear-gradient(135deg,#052e16,#15803d) !important;
}

#sapo-product-modal .pm-title {
    margin: 0 !important;
    font-size: 23px !important;
}

#sapo-product-modal .pm-close {
    display: grid !important;
    width: 42px !important;
    height: 42px !important;
    place-items: center !important;
    color: white !important;
    background: rgba(255,255,255,.12) !important;
    border: 1px solid rgba(255,255,255,.3) !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#sapo-product-modal form {
    display: flex !important;
    min-height: 0 !important;
    flex: 1 !important;
    flex-direction: column !important;
}

#sapo-product-modal .pm-body {
    display: grid !important;
    gap: 14px !important;
    min-height: 0 !important;
    padding: 16px !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    background: #f5f8f6 !important;
}

#sapo-product-modal .pm-error {
    padding: 11px !important;
    color: #991b1b !important;
    font-weight: 700 !important;
    background: #fef2f2 !important;
    border: 1px solid #fca5a5 !important;
    border-radius: 9px !important;
}

#sapo-product-modal .pm-section {
    padding: 16px !important;
    background: white !important;
    border: 1px solid var(--border) !important;
    border-radius: 11px !important;
}

#sapo-product-modal .pm-section-header {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 15px !important;
    margin-bottom: 14px !important;
}

#sapo-product-modal .pm-section-title {
    margin: 0 !important;
    font-size: 17px !important;
}

#sapo-product-modal .pm-section-copy {
    margin: 4px 0 0 !important;
    color: var(--muted) !important;
    font-size: 12px !important;
}

#sapo-product-modal .pm-grid {
    display: grid !important;
    grid-template-columns: repeat(2,minmax(0,1fr)) !important;
    gap: 13px !important;
}

#sapo-product-modal .pm-full {
    grid-column: 1 / -1 !important;
}

#sapo-product-modal .pm-required {
    color: #d92d20 !important;
}


/* =========================================================
   SEARCHABLE DROPDOWNS
   ========================================================= */

#sapo-product-modal .pm-searchable-select {
    position: relative !important;
    width: 100% !important;
    min-width: 0 !important;
}

#sapo-product-modal .pm-searchable-select.is-open {
    z-index: 700 !important;
}

#sapo-product-modal .pm-searchable-trigger {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    min-height: 43px !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
    padding: 8px 10px !important;
    color: var(--text) !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    text-align: left !important;
    appearance: none !important;
    background: #ffffff !important;
    border: 1px solid #aeb8b1 !important;
    border-radius: 8px !important;
    cursor: pointer !important;
}

#sapo-product-modal .pm-searchable-trigger.placeholder {
    color: #667085 !important;
    font-weight: 500 !important;
}

#sapo-product-modal .pm-searchable-trigger:hover:not(:disabled) {
    border-color: var(--green) !important;
}

#sapo-product-modal .pm-searchable-trigger:focus,
#sapo-product-modal .pm-searchable-trigger:focus-visible {
    outline: none !important;
    border-color: var(--green) !important;
    box-shadow: 0 0 0 3px rgba(21,128,61,.14) !important;
}

#sapo-product-modal .pm-searchable-trigger:disabled {
    color: #667085 !important;
    background: #f2f4f7 !important;
    cursor: not-allowed !important;
}

#sapo-product-modal .pm-searchable-trigger-text {
    min-width: 0 !important;
    flex: 1 1 auto !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#sapo-product-modal .pm-searchable-chevron {
    display: grid !important;
    width: 20px !important;
    height: 20px !important;
    min-width: 20px !important;
    place-items: center !important;
    color: #667085 !important;
    transition: transform 0.15s ease !important;
}

#sapo-product-modal .pm-searchable-chevron.open {
    transform: rotate(180deg) !important;
}

#sapo-product-modal .pm-searchable-chevron svg {
    width: 17px !important;
    height: 17px !important;
}

#sapo-product-modal .pm-searchable-menu {
    position: absolute !important;
    top: calc(100% + 6px) !important;
    left: 0 !important;
    z-index: 9999 !important;
    width: 100% !important;
    min-width: min(340px, 82vw) !important;
    padding: 8px !important;
    background: #ffffff !important;
    border: 1px solid #b7c4ba !important;
    border-radius: 10px !important;
    box-shadow: 0 18px 45px rgba(16, 24, 40, 0.22) !important;
}

#sapo-product-modal .pm-searchable-search-wrap {
    position: relative !important;
    padding-bottom: 8px !important;
    border-bottom: 1px solid #edf1ee !important;
}

#sapo-product-modal .pm-searchable-search-icon {
    position: absolute !important;
    top: 12px !important;
    left: 10px !important;
    display: grid !important;
    width: 18px !important;
    height: 18px !important;
    place-items: center !important;
    color: #667085 !important;
    pointer-events: none !important;
}

#sapo-product-modal .pm-searchable-search-icon svg {
    width: 16px !important;
    height: 16px !important;
}

#sapo-product-modal .pm-searchable-search-input {
    display: block !important;
    width: 100% !important;
    height: 41px !important;
    padding: 0 11px 0 36px !important;
    color: var(--text) !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    outline: none !important;
    background: #f9fbfa !important;
    border: 1px solid #aeb8b1 !important;
    border-radius: 8px !important;
}

#sapo-product-modal .pm-searchable-search-input:focus {
    border-color: var(--green) !important;
    box-shadow: 0 0 0 3px rgba(21,128,61,.14) !important;
}

#sapo-product-modal .pm-searchable-options {
    max-height: 240px !important;
    margin-top: 7px !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    scrollbar-width: thin !important;
}

#sapo-product-modal .pm-searchable-option {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    min-height: 45px !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 9px !important;
    padding: 8px 9px !important;
    color: #344054 !important;
    font-size: 13px !important;
    text-align: left !important;
    appearance: none !important;
    background: #ffffff !important;
    border: 1px solid transparent !important;
    border-radius: 8px !important;
    cursor: pointer !important;
}

#sapo-product-modal .pm-searchable-option.highlighted,
#sapo-product-modal .pm-searchable-option:hover {
    background: var(--green-light) !important;
    border-color: #b8dfc3 !important;
}

#sapo-product-modal .pm-searchable-option.selected {
    color: var(--green-dark) !important;
    background: #e9f8ee !important;
    border-color: #8fc69e !important;
}

#sapo-product-modal .pm-searchable-option-copy {
    display: flex !important;
    min-width: 0 !important;
    flex: 1 1 auto !important;
    flex-direction: column !important;
}

#sapo-product-modal .pm-searchable-option-copy strong {
    overflow: hidden !important;
    color: inherit !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#sapo-product-modal .pm-searchable-option-copy small {
    margin-top: 1px !important;
    color: #667085 !important;
    font-size: 10px !important;
    line-height: 1.3 !important;
}

#sapo-product-modal .pm-searchable-option-check {
    display: grid !important;
    width: 24px !important;
    height: 24px !important;
    min-width: 24px !important;
    place-items: center !important;
    color: #ffffff !important;
    background: var(--green) !important;
    border-radius: 50% !important;
}

#sapo-product-modal .pm-searchable-option-check svg {
    width: 13px !important;
    height: 13px !important;
}

#sapo-product-modal .pm-searchable-empty {
    display: flex !important;
    min-height: 92px !important;
    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 3px !important;
    padding: 10px !important;
    color: #667085 !important;
    font-size: 11px !important;
    text-align: center !important;
}

#sapo-product-modal .pm-searchable-empty svg {
    width: 22px !important;
    height: 22px !important;
    color: var(--green) !important;
}

#sapo-product-modal .pm-searchable-keyboard-help {
    margin-top: 7px !important;
    padding-top: 7px !important;
    color: #667085 !important;
    font-size: 9px !important;
    font-weight: 650 !important;
    text-align: center !important;
    border-top: 1px solid #edf1ee !important;
}

#sapo-product-modal .pm-info {
    margin-top: 12px !important;
    padding: 11px !important;
    color: #475467 !important;
    font-size: 12px !important;
    background: #f9fafb !important;
    border-radius: 8px !important;
}

#sapo-product-modal .pm-keyboard-help {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 7px !important;
    margin-top: 10px !important;
    padding: 10px 11px !important;
    color: #475467 !important;
    font-size: 11px !important;
    font-weight: 650 !important;
    background: #f8faf9 !important;
    border: 1px solid #dfe6e1 !important;
    border-radius: 8px !important;
}

#sapo-product-modal .pm-key {
    display: inline-flex !important;
    min-height: 23px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 2px 7px !important;
    color: #14532d !important;
    font-size: 10px !important;
    font-weight: 850 !important;
    background: #f0fdf4 !important;
    border: 1px solid #b8dfc3 !important;
    border-radius: 6px !important;
}

#sapo-product-modal .pm-variant-list {
    display: grid !important;
    gap: 11px !important;
}

#sapo-product-modal .pm-variant-card {
    padding: 13px !important;
    background: #f8faf9 !important;
    border: 1px solid #cbd5ce !important;
    border-radius: 10px !important;
}

#sapo-product-modal .pm-variant-head {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    margin-bottom: 10px !important;
}

#sapo-product-modal .pm-variant-title {
    font-size: 13px !important;
    font-weight: 850 !important;
}

#sapo-product-modal .pm-variant-grid {
    display: grid !important;
    grid-template-columns:
        minmax(100px,.7fr)
        minmax(100px,.8fr)
        minmax(140px,1fr)
        minmax(180px,1.4fr)
        auto !important;
    gap: 9px !important;
    align-items: end !important;
}

#sapo-product-modal .pm-check {
    display: flex !important;
    min-height: 43px !important;
    align-items: center !important;
    gap: 8px !important;
    font-size: 12px !important;
    font-weight: 750 !important;
}

#sapo-product-modal .pm-check input {
    width: 19px !important;
    height: 19px !important;
}

#sapo-product-modal .pm-empty-variants {
    padding: 16px !important;
    color: #667085 !important;
    text-align: center !important;
    background: #f9fafb !important;
    border: 1px dashed #98a2b3 !important;
    border-radius: 9px !important;
}

#sapo-product-modal .pm-footer {
    justify-content: flex-end !important;
    padding: 13px 16px !important;
    border-top: 1px solid var(--border) !important;
}


@media (max-width: 900px) {
    #sapo-products .pp-table-scroll {
        max-height: none !important;
        overflow-x: hidden !important;
        overflow-y: visible !important;
        padding: 10px !important;
        background: #f5f7f6 !important;
    }

    #sapo-products table,
    #sapo-products tbody,
    #sapo-products tr,
    #sapo-products td {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
    }

    #sapo-products thead {
        display: none !important;
    }

    #sapo-products tbody {
        display: grid !important;
        gap: 10px !important;
    }

    #sapo-products tbody tr {
        overflow: hidden !important;
        background: #ffffff !important;
        border: 1px solid var(--border) !important;
        border-radius: 10px !important;
    }

    #sapo-products tbody tr:hover td {
        background: #ffffff !important;
    }

    #sapo-products tbody td {
        display: grid !important;
        grid-template-columns: minmax(105px, 34%) minmax(0, 1fr) !important;
        gap: 10px !important;
        align-items: center !important;
        padding: 10px 12px !important;
        border-bottom: 1px solid var(--border-soft) !important;
    }

    #sapo-products tbody td:last-child {
        border-bottom: 0 !important;
    }

    #sapo-products tbody td::before {
        content: attr(data-label) !important;
        color: #475467 !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        letter-spacing: .025em !important;
        text-transform: uppercase !important;
    }

    #sapo-products tbody td[colspan] {
        display: block !important;
        padding: 18px !important;
        text-align: center !important;
    }

    #sapo-products tbody td[colspan]::before {
        display: none !important;
        content: none !important;
    }

    #sapo-products tbody td .pp-actions {
        justify-content: flex-start !important;
    }

    #sapo-products .pp-pagination {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #sapo-products .pp-pagination > .pp-actions {
        justify-content: space-between !important;
    }
}

@media (max-width: 800px) {
    #sapo-products {
        padding: 0 !important;
    }

    #sapo-products .pp-header {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #sapo-products .pp-toolbar {
        grid-template-columns: 1fr !important;
    }

    #sapo-product-modal .pm-backdrop {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    #sapo-product-modal .pm-dialog {
        width: 100% !important;
        max-height: 96dvh !important;
        border-radius: 15px 15px 0 0 !important;
    }

    #sapo-product-modal .pm-grid,
    #sapo-product-modal .pm-variant-grid {
        grid-template-columns: 1fr !important;
    }

    #sapo-product-modal .pm-full {
        grid-column: auto !important;
    }

    #sapo-product-modal .pm-searchable-menu {
        min-width: 100% !important;
    }
}


/* =========================================================
   PRODUCTS LIST PAGE — CUSTOMER PAGE VISUAL SYSTEM

   The Add/Edit Product modal above is intentionally left
   unchanged. These rules only restyle the Products LIST page
   so it follows CustomersPage.tsx.
   ========================================================= */

#sapo-products {
    --pp-green-800: #166534;
    --pp-green-700: #15803d;
    --pp-green-100: #dcfce7;
    --pp-green-50: #f0fdf4;
    --pp-red: #dc2626;
    --pp-red-light: #fef2f2;
    --pp-blue: #2563eb;
    --pp-blue-light: #eff6ff;
    --pp-slate: #475569;
    --pp-slate-light: #f1f5f9;
    --pp-text: #111827;
    --pp-text-secondary: #1f2937;
    --pp-muted: #6b7280;
    --pp-border: #e5e7eb;
    --pp-border-strong: #d1d5db;
    --pp-bg: #f9fafb;
    --pp-white: #ffffff;

    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    flex-direction: column !important;
    gap: 20px !important;
    margin: 0 !important;
    padding: 0 !important;
    color: var(--pp-text-secondary) !important;
    font-size: 14px !important;
    line-height: 1.5 !important;
    background: transparent !important;
    isolation: isolate !important;
    overflow: visible !important;
}

#sapo-products .pp-container {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    flex-direction: column !important;
    gap: 20px !important;
    margin: 0 !important;
    padding: 0 !important;
}

/* ---------- Header ---------- */

#sapo-products .pp-header {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    flex-wrap: wrap !important;
    gap: 16px !important;
    padding: 20px 24px !important;
    background: var(--pp-white) !important;
    border: 1px solid var(--pp-border) !important;
    border-radius: 10px !important;
}

#sapo-products .pp-header > div:first-child {
    display: flex !important;
    min-width: 0 !important;
    flex: 1 1 420px !important;
    flex-direction: column !important;
    gap: 4px !important;
}

#sapo-products .pp-kicker {
    display: inline-block !important;
    margin: 0 0 6px !important;
    color: var(--pp-green-700) !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    letter-spacing: 0.04em !important;
    text-transform: uppercase !important;
    background: transparent !important;
}

#sapo-products h1 {
    margin: 0 0 4px !important;
    padding: 0 !important;
    color: var(--pp-text) !important;
    font-size: 22px !important;
    font-weight: 700 !important;
    line-height: 1.3 !important;
}

#sapo-products .pp-subtitle {
    margin: 0 !important;
    padding: 0 !important;
    color: var(--pp-muted) !important;
    font-size: 13.5px !important;
    font-weight: 400 !important;
    line-height: 1.5 !important;
}

#sapo-products .pp-header-actions {
    display: flex !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    gap: 8px !important;
}

/* ---------- Alerts ---------- */

#sapo-products .pp-alert {
    display: flex !important;
    width: 100% !important;
    align-items: center !important;
    gap: 8px !important;
    margin: 0 !important;
    padding: 12px 16px !important;
    font-size: 13.5px !important;
    font-weight: 500 !important;
    border-radius: 8px !important;
}

#sapo-products .pp-alert-success {
    color: var(--pp-green-700) !important;
    background: var(--pp-green-50) !important;
    border: 1px solid #bbf7d0 !important;
}

#sapo-products .pp-alert-error {
    color: #b91c1c !important;
    background: var(--pp-red-light) !important;
    border: 1px solid #fecaca !important;
}

/* ---------- Buttons ---------- */

#sapo-products .pp-button {
    display: inline-flex !important;
    min-height: 36px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    padding: 7px 13px !important;
    color: var(--pp-text-secondary) !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    line-height: 1.2 !important;
    appearance: none !important;
    background: var(--pp-white) !important;
    border: 1px solid var(--pp-border-strong) !important;
    border-radius: 6px !important;
    cursor: pointer !important;
    white-space: nowrap !important;
    transition: background-color .15s ease, border-color .15s ease, color .15s ease !important;
}

#sapo-products .pp-button svg {
    width: 15px !important;
    height: 15px !important;
}

#sapo-products .pp-button-primary {
    color: #ffffff !important;
    background: var(--pp-green-700) !important;
    border-color: var(--pp-green-700) !important;
}

#sapo-products .pp-button-primary:hover:not(:disabled) {
    background: var(--pp-green-800) !important;
    border-color: var(--pp-green-800) !important;
}

#sapo-products .pp-secondary-button:hover:not(:disabled) {
    background: var(--pp-bg) !important;
    border-color: #9ca3af !important;
}

#sapo-products .pp-view-button {
    color: var(--pp-blue) !important;
    background: var(--pp-blue-light) !important;
    border-color: #bfdbfe !important;
}

#sapo-products .pp-view-button:hover:not(:disabled) {
    color: #ffffff !important;
    background: var(--pp-blue) !important;
    border-color: var(--pp-blue) !important;
}

#sapo-products .pp-button-danger {
    color: var(--pp-red) !important;
    background: var(--pp-red-light) !important;
    border-color: #fecaca !important;
}

#sapo-products .pp-button-danger:hover:not(:disabled) {
    color: #ffffff !important;
    background: var(--pp-red) !important;
    border-color: var(--pp-red) !important;
}

/* ---------- Content card ---------- */

#sapo-products .pp-panel {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    flex-direction: column !important;
    gap: 16px !important;
    margin: 0 !important;
    padding: 20px !important;
    overflow: visible !important;
    background: var(--pp-white) !important;
    border: 1px solid var(--pp-border) !important;
    border-radius: 10px !important;
}

/* ---------- Toolbar ---------- */

#sapo-products .pp-toolbar {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 12px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
}

#sapo-products .pp-toolbar-search {
    flex: 1 1 320px !important;
    min-width: 220px !important;
    height: 38px !important;
    padding: 0 14px !important;
    color: var(--pp-text-secondary) !important;
    font-size: 13.5px !important;
    font-weight: 400 !important;
    background: var(--pp-bg) !important;
    border: 1px solid var(--pp-border-strong) !important;
    border-radius: 8px !important;
    outline: none !important;
}

#sapo-products .pp-toolbar-search::placeholder {
    color: #9ca3af !important;
}

#sapo-products .pp-toolbar-search:focus {
    background: var(--pp-white) !important;
    border-color: var(--pp-green-700) !important;
    box-shadow: 0 0 0 3px rgba(22,163,74,.12) !important;
}

#sapo-products .pp-toolbar-select {
    min-width: 130px !important;
    height: 38px !important;
    padding: 0 14px !important;
    color: var(--pp-text-secondary) !important;
    font-size: 13.5px !important;
    background: var(--pp-bg) !important;
    border: 1px solid var(--pp-border-strong) !important;
    border-radius: 8px !important;
    outline: none !important;
    cursor: pointer !important;
}

#sapo-products .pp-toolbar-select:focus {
    background: var(--pp-white) !important;
    border-color: var(--pp-green-700) !important;
    box-shadow: 0 0 0 3px rgba(22,163,74,.12) !important;
}

#sapo-products .pp-result-count {
    display: inline-flex !important;
    min-height: 32px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 5px 10px !important;
    color: var(--pp-green-800) !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
    background: var(--pp-green-50) !important;
    border-radius: 999px !important;
}

/* ---------- Table container: vertical only, never horizontal ---------- */

#sapo-products .pp-table-scroll {
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    max-height: 520px !important;
    padding: 0 !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    background: var(--pp-white) !important;
    border: 1px solid var(--pp-border) !important;
    border-radius: 8px !important;
    scrollbar-width: thin !important;
    scrollbar-color: var(--pp-border-strong) transparent !important;
}

#sapo-products .pp-table-scroll::-webkit-scrollbar {
    width: 8px !important;
}

#sapo-products .pp-table-scroll::-webkit-scrollbar-track {
    background: transparent !important;
}

#sapo-products .pp-table-scroll::-webkit-scrollbar-thumb {
    background: var(--pp-border-strong) !important;
    border-radius: 8px !important;
}

#sapo-products .pp-table {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    table-layout: fixed !important;
    border-collapse: collapse !important;
    color: var(--pp-text-secondary) !important;
    font-size: 13px !important;
    background: var(--pp-white) !important;
}

#sapo-products .pp-table thead {
    position: sticky !important;
    top: 0 !important;
    z-index: 2 !important;
}

#sapo-products .pp-table thead th {
    padding: 12px 10px !important;
    color: var(--pp-muted) !important;
    font-size: 11px !important;
    font-weight: 650 !important;
    line-height: 1.25 !important;
    text-align: left !important;
    text-transform: uppercase !important;
    background: #f9fafb !important;
    border-bottom: 1px solid var(--pp-border) !important;
    white-space: normal !important;
    overflow-wrap: anywhere !important;
}

#sapo-products .pp-table tbody td {
    padding: 13px 10px !important;
    color: var(--pp-text-secondary) !important;
    font-size: 12.5px !important;
    vertical-align: middle !important;
    background: var(--pp-white) !important;
    border-bottom: 1px solid #f1f5f9 !important;
    white-space: normal !important;
    overflow-wrap: anywhere !important;
    word-break: normal !important;
}

#sapo-products .pp-table tbody tr:last-child td {
    border-bottom: 0 !important;
}

#sapo-products .pp-table tbody tr:hover td {
    background: #f9fafb !important;
}

/* Product / Category / Unit / Barcode / Status / Actions */
#sapo-products .pp-table th:nth-child(1),
#sapo-products .pp-table td:nth-child(1) { width: 24% !important; }
#sapo-products .pp-table th:nth-child(2),
#sapo-products .pp-table td:nth-child(2) { width: 17% !important; }
#sapo-products .pp-table th:nth-child(3),
#sapo-products .pp-table td:nth-child(3) { width: 12% !important; }
#sapo-products .pp-table th:nth-child(4),
#sapo-products .pp-table td:nth-child(4) { width: 19% !important; }
#sapo-products .pp-table th:nth-child(5),
#sapo-products .pp-table td:nth-child(5) { width: 10% !important; }
#sapo-products .pp-table th:nth-child(6),
#sapo-products .pp-table td:nth-child(6) { width: 18% !important; }

#sapo-products .pp-product-name {
    display: block !important;
    overflow: hidden !important;
    color: var(--pp-text) !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    line-height: 1.3 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#sapo-products .pp-small {
    display: block !important;
    overflow: hidden !important;
    margin-top: 2px !important;
    color: #9ca3af !important;
    font-size: 11.5px !important;
    line-height: 1.3 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#sapo-products .pp-badge {
    display: inline-flex !important;
    min-height: 24px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 4px 9px !important;
    color: var(--pp-slate) !important;
    font-size: 11.5px !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
    background: var(--pp-slate-light) !important;
    border-radius: 999px !important;
}

#sapo-products .pp-status-badge {
    display: inline-flex !important;
    min-height: 24px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 4px 9px !important;
    font-size: 11.5px !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
    border-radius: 999px !important;
}

#sapo-products .pp-status-active {
    color: var(--pp-green-800) !important;
    background: var(--pp-green-100) !important;
}

#sapo-products .pp-status-inactive {
    color: var(--pp-muted) !important;
    background: #f1f5f9 !important;
}

#sapo-products .pp-table-actions {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    align-items: center !important;
    justify-content: flex-start !important;
    flex-wrap: wrap !important;
    gap: 5px !important;
}

#sapo-products .pp-action-button {
    min-width: 54px !important;
    min-height: 30px !important;
    padding: 5px 8px !important;
    font-size: 11.5px !important;
}

#sapo-products .pp-action-button svg {
    width: 13px !important;
    height: 13px !important;
}

#sapo-products .pp-table-state {
    padding: 40px 16px !important;
    color: #9ca3af !important;
    font-size: 13.5px !important;
    text-align: center !important;
    white-space: normal !important;
    background: var(--pp-white) !important;
}

/* ---------- Pagination ---------- */

#sapo-products .pp-pagination {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 16px !important;
    margin: 0 !important;
    padding: 4px 0 0 !important;
}

#sapo-products .pp-pagination span {
    color: var(--pp-muted) !important;
    font-size: 13px !important;
    font-weight: 500 !important;
}

#sapo-products .pp-pagination-button {
    min-width: 90px !important;
    min-height: 36px !important;
    padding: 7px 16px !important;
    color: #374151 !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    background: var(--pp-white) !important;
    border: 1px solid var(--pp-border-strong) !important;
    border-radius: 6px !important;
    cursor: pointer !important;
}

#sapo-products .pp-pagination-button:hover:not(:disabled) {
    background: #f9fafb !important;
    border-color: #9ca3af !important;
}

#sapo-products .pp-pagination-button:disabled {
    opacity: .5 !important;
    cursor: not-allowed !important;
}

/* ---------- Responsive: stacked cards, no horizontal scroll ---------- */

@media (max-width: 1050px) {
    #sapo-products .pp-table thead th {
        padding: 10px 7px !important;
        font-size: 10px !important;
    }

    #sapo-products .pp-table tbody td {
        padding: 11px 7px !important;
        font-size: 11.5px !important;
    }

    #sapo-products .pp-action-button {
        min-width: 48px !important;
        padding: 5px 6px !important;
        font-size: 10.5px !important;
    }
}

@media (max-width: 850px) {
    #sapo-products .pp-header {
        flex-direction: column !important;
        align-items: stretch !important;
    }

    #sapo-products .pp-header-actions,
    #sapo-products .pp-header-actions .pp-button-primary {
        width: 100% !important;
    }

    #sapo-products .pp-toolbar {
        flex-direction: column !important;
        align-items: stretch !important;
    }

    #sapo-products .pp-toolbar-search,
    #sapo-products .pp-toolbar-select,
    #sapo-products .pp-toolbar .pp-button,
    #sapo-products .pp-result-count {
        width: 100% !important;
        min-width: 0 !important;
    }

    #sapo-products .pp-table-scroll {
        max-height: none !important;
        padding: 0 !important;
        overflow: visible !important;
        background: var(--pp-bg) !important;
        border: 0 !important;
    }

    #sapo-products .pp-table,
    #sapo-products .pp-table tbody,
    #sapo-products .pp-table tr,
    #sapo-products .pp-table td {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
    }

    #sapo-products .pp-table thead {
        display: none !important;
    }

    #sapo-products .pp-table tbody {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
    }

    #sapo-products .pp-table tbody tr {
        overflow: hidden !important;
        background: var(--pp-white) !important;
        border: 1px solid var(--pp-border) !important;
        border-radius: 8px !important;
    }

    #sapo-products .pp-table tbody tr:hover td {
        background: var(--pp-white) !important;
    }

    #sapo-products .pp-table tbody td {
        display: grid !important;
        width: 100% !important;
        grid-template-columns: 140px minmax(0, 1fr) !important;
        align-items: center !important;
        gap: 12px !important;
        min-height: 44px !important;
        padding: 10px 14px !important;
        border-bottom: 1px solid var(--pp-border) !important;
    }

    #sapo-products .pp-table tbody td:last-child {
        border-bottom: 0 !important;
    }

    #sapo-products .pp-table tbody td::before {
        content: attr(data-label) !important;
        color: var(--pp-muted) !important;
        font-size: 11px !important;
        font-weight: 650 !important;
        text-transform: uppercase !important;
    }

    #sapo-products .pp-table .pp-table-state {
        display: block !important;
        min-height: 140px !important;
        padding: 40px 16px !important;
        text-align: center !important;
    }

    #sapo-products .pp-table .pp-table-state::before {
        display: none !important;
        content: none !important;
    }

    #sapo-products .pp-table-actions {
        justify-content: flex-start !important;
    }
}

@media (max-width: 640px) {
    #sapo-products {
        gap: 16px !important;
    }

    #sapo-products .pp-header {
        padding: 16px !important;
    }

    #sapo-products .pp-panel {
        padding: 14px !important;
    }

    #sapo-products .pp-pagination {
        flex-direction: column !important;
        align-items: stretch !important;
    }

    #sapo-products .pp-pagination-button {
        width: 100% !important;
    }

    #sapo-products .pp-pagination span {
        text-align: center !important;
    }
}

@media (max-width: 480px) {
    #sapo-products .pp-table tbody td {
        grid-template-columns: 110px minmax(0, 1fr) !important;
    }

    #sapo-products .pp-table-actions {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    #sapo-products .pp-action-button {
        width: 100% !important;
    }
}
`;

/* =========================================================
   COMPONENT
   ========================================================= */

export default function ProductsPage() {
    const navigate =
        useNavigate();

    const {
        token,
    } =
        useAuth();

    const formRef =
        useRef<HTMLFormElement | null>(
            null,
        );

    const categoryInputRef =
        useRef<HTMLButtonElement | null>(
            null,
        );

    const nameInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const unitInputRef =
        useRef<HTMLButtonElement | null>(
            null,
        );

    const barcodeInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const addVariantButtonRef =
        useRef<HTMLButtonElement | null>(
            null,
        );

    const submitButtonRef =
        useRef<HTMLButtonElement | null>(
            null,
        );

    /*
     * When a new variant is added with the keyboard,
     * this stores the row index that should receive focus
     * after React renders the new variant card.
     */
    const pendingVariantFocusIndexRef =
        useRef<number | null>(
            null,
        );

    const [
        products,
        setProducts,
    ] =
        useState<Product[]>([]);

    const [
        categories,
        setCategories,
    ] =
        useState<ProductCategory[]>([]);

    const [
        pagination,
        setPagination,
    ] =
        useState<ProductPaginationMeta>(
            EMPTY_PAGINATION,
        );

    const [
        searchInput,
        setSearchInput,
    ] =
        useState('');

    const [
        search,
        setSearch,
    ] =
        useState('');

    const [
        page,
        setPage,
    ] =
        useState(1);

    const [
        perPage,
        setPerPage,
    ] =
        useState(20);

    const [
        form,
        setForm,
    ] =
        useState<ProductInput>(
            createEmptyForm(),
        );

    const [
        editingProduct,
        setEditingProduct,
    ] =
        useState<Product | null>(
            null,
        );

    const [
        showForm,
        setShowForm,
    ] =
        useState(false);

    const [
        isLoading,
        setIsLoading,
    ] =
        useState(true);

    const [
        isCategoryLoading,
        setIsCategoryLoading,
    ] =
        useState(true);

    const [
        isSubmitting,
        setIsSubmitting,
    ] =
        useState(false);

    const [
        formError,
        setFormError,
    ] =
        useState('');

    const [
        pageError,
        setPageError,
    ] =
        useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] =
        useState('');

    const categorySearchOptions =
        useMemo<
            SearchableSelectOption[]
        >(
            () =>
                categories.map(
                    (
                        category,
                    ) => ({
                        value:
                            String(
                                category.id,
                            ),

                        label:
                            category.name,

                        searchText:
                            `${category.name} ${category.id}`,
                    }),
                ),
            [
                categories,
            ],
        );

    const selectedCategory =
        useMemo(
            () =>
                categories.find(
                    (
                        category,
                    ) =>
                        category.id
                        === form.category_id,
                )
                ?? null,
            [
                categories,
                form.category_id,
            ],
        );

    /* =====================================================
       KEYBOARD / ENTER NAVIGATION
       ===================================================== */

    const focusElement =
        (
            element:
                HTMLElement
                | null,
        ): void => {
            if (!element) {
                return;
            }

            window.requestAnimationFrame(
                () => {
                    element.focus({
                        preventScroll:
                            true,
                    });

                    element.scrollIntoView({
                        behavior:
                            'smooth',
                        block:
                            'nearest',
                        inline:
                            'nearest',
                    });

                    if (
                        element
                        instanceof HTMLInputElement
                        && (
                            element.type
                            === 'text'
                            || element.type
                            === 'number'
                            || element.type
                            === 'search'
                        )
                    ) {
                        element.select();
                    }
                },
            );
        };

    const focusVariantField =
        (
            index: number,
            field:
                | 'size'
                | 'size-unit'
                | 'package'
                | 'barcode'
                | 'active',
        ): void => {
            const modal =
                document.getElementById(
                    'sapo-product-modal',
                );

            const element =
                modal?.querySelector<HTMLElement>(
                    `[data-variant-index="${index}"][data-variant-field="${field}"]`,
                )
                ?? null;

            focusElement(
                element,
            );
        };

    const handleEnterFocus =
        (
            event:
                ReactKeyboardEvent<HTMLElement>,
            nextElement:
                HTMLElement
                | null,
        ): void => {
            if (
                event.key
                !== 'Enter'
                || event.shiftKey
                || event.ctrlKey
                || event.metaKey
                || event.altKey
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            focusElement(
                nextElement,
            );
        };

    const handleVariantFieldEnter =
        (
            event:
                ReactKeyboardEvent<HTMLElement>,
            index: number,
            nextField:
                | 'size'
                | 'size-unit'
                | 'package'
                | 'barcode'
                | 'active',
        ): void => {
            if (
                event.key
                !== 'Enter'
                || event.shiftKey
                || event.ctrlKey
                || event.metaKey
                || event.altKey
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            focusVariantField(
                index,
                nextField,
            );
        };

    const handleVariantActiveEnter =
        (
            event:
                ReactKeyboardEvent<HTMLInputElement>,
            index: number,
            checked: boolean,
        ): void => {
            if (
                event.key
                !== 'Enter'
                || event.shiftKey
                || event.ctrlKey
                || event.metaKey
                || event.altKey
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            updateVariant(
                index,
                {
                    is_active:
                        !checked,
                },
            );

            const nextVariantIndex =
                index + 1;

            if (
                nextVariantIndex
                < form.variants.length
            ) {
                window.setTimeout(
                    () => {
                        focusVariantField(
                            nextVariantIndex,
                            'size',
                        );
                    },
                    0,
                );

                return;
            }

            focusElement(
                submitButtonRef.current,
            );
        };

    /* =====================================================
       LOAD
       ===================================================== */

    const loadProducts =
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
                        await getProducts(
                            token,
                            {
                                search,
                                page,
                                per_page:
                                    perPage,
                            },
                        );

                    setProducts(
                        response.data,
                    );

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    setPageError(
                        getErrorMessage(
                            error,
                            'Unable to load products.',
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

    const loadCategories =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsCategoryLoading(
                    true,
                );

                try {
                    const response =
                        await getProductCategoryOptions(
                            token,
                        );

                    setCategories(
                        response.data,
                    );
                } catch (error) {
                    setPageError(
                        getErrorMessage(
                            error,
                            'Unable to load categories.',
                        ),
                    );
                } finally {
                    setIsCategoryLoading(
                        false,
                    );
                }
            },
            [
                token,
            ],
        );

    useEffect(
        () => {
            void loadProducts();
        },
        [
            loadProducts,
        ],
    );

    useEffect(
        () => {
            void loadCategories();
        },
        [
            loadCategories,
        ],
    );

    useEffect(
        () => {
            if (!showForm) {
                return;
            }

            const oldOverflow =
                document.body.style.overflow;

            const previouslyFocused =
                document.activeElement
                    instanceof HTMLElement
                    ? document.activeElement
                    : null;

            document.body.style.overflow =
                'hidden';

            /*
             * Start every Add/Edit Product workflow from Category.
             */
            const focusTimer =
                window.setTimeout(
                    () => {
                        focusElement(
                            categoryInputRef.current,
                        );
                    },
                    80,
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

                        return;
                    }

                    /*
                     * Ctrl/Cmd + Enter saves from anywhere in the modal.
                     * This also lets a normal product be created without
                     * adding package variants.
                     */
                    if (
                        event.key
                        === 'Enter'
                        && (
                            event.ctrlKey
                            || event.metaKey
                        )
                        && !isSubmitting
                    ) {
                        event.preventDefault();

                        formRef.current
                            ?.requestSubmit();

                        return;
                    }

                    /*
                     * Alt + V adds a package variant without using a mouse.
                     */
                    if (
                        (
                            event.key
                            === 'v'
                            || event.key
                            === 'V'
                        )
                        && event.altKey
                        && !isSubmitting
                    ) {
                        event.preventDefault();

                        addVariant();
                    }
                };

            window.addEventListener(
                'keydown',
                handleKey,
            );

            return () => {
                window.clearTimeout(
                    focusTimer,
                );

                document.body.style.overflow =
                    oldOverflow;

                window.removeEventListener(
                    'keydown',
                    handleKey,
                );

                previouslyFocused
                    ?.focus();
            };
        },
        [
            showForm,
            isSubmitting,
        ],
    );

    /* =====================================================
       FORM
       ===================================================== */

    const openCreateForm =
        (): void => {
            setEditingProduct(
                null,
            );

            setForm(
                createEmptyForm(),
            );

            setFormError(
                '',
            );

            setShowForm(
                true,
            );
        };

    const openEditForm =
        (
            product:
                Product,
        ): void => {
            setEditingProduct(
                product,
            );

            setForm({
                category_id:
                    product.category
                        ?.id
                    ?? null,

                name:
                    product.name,

                unit:
                    product.unit,

                barcode:
                    product.barcode
                    ?? '',

                variants:
                    product.variants.map(
                        (
                            variant,
                        ) => ({
                            id:
                                variant.id,

                            size_value:
                                String(
                                    variant
                                        .size_value,
                                ),

                            size_unit:
                                variant
                                    .size_unit,

                            package_unit:
                                variant
                                    .package_unit,

                            barcode:
                                variant
                                    .barcode
                                ?? '',

                            is_active:
                                variant
                                    .is_active,
                        }),
                    ),
            });

            setFormError(
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

            setEditingProduct(
                null,
            );

            setForm(
                createEmptyForm(),
            );

            setFormError(
                '',
            );
        };

    const addVariant =
        (): void => {
            pendingVariantFocusIndexRef.current =
                form.variants.length;

            setForm(
                (
                    current,
                ) => ({
                    ...current,

                    variants: [
                        ...current
                            .variants,

                        createEmptyVariant(
                            current.unit,
                        ),
                    ],
                }),
            );
        };

    /*
     * After Add Variant is activated with Enter, focus the
     * Size field of the newly created variant automatically.
     */
    useEffect(
        () => {
            const pendingIndex =
                pendingVariantFocusIndexRef.current;

            if (
                !showForm
                || pendingIndex
                === null
                || pendingIndex
                >= form.variants.length
            ) {
                return;
            }

            pendingVariantFocusIndexRef.current =
                null;

            const timer =
                window.setTimeout(
                    () => {
                        focusVariantField(
                            pendingIndex,
                            'size',
                        );
                    },
                    40,
                );

            return () => {
                window.clearTimeout(
                    timer,
                );
            };
        },
        [
            showForm,
            form.variants.length,
        ],
    );

    const updateVariant =
        (
            index: number,
            values:
                Partial<ProductVariantInput>,
        ): void => {
            setForm(
                (
                    current,
                ) => ({
                    ...current,

                    variants:
                        current
                            .variants
                            .map(
                                (
                                    variant,
                                    variantIndex,
                                ) =>
                                    variantIndex
                                        === index
                                        ? {
                                            ...variant,
                                            ...values,
                                        }
                                        : variant,
                            ),
                }),
            );

            setFormError(
                '',
            );
        };

    const removeVariant =
        (
            index: number,
        ): void => {
            setForm(
                (
                    current,
                ) => ({
                    ...current,

                    variants:
                        current
                            .variants
                            .filter(
                                (
                                    _variant,
                                    variantIndex,
                                ) =>
                                    variantIndex
                                    !== index,
                            ),
                }),
            );
        };

    const validateForm =
        (): string | null => {
            if (
                !form.category_id
            ) {
                return 'Please select a category.';
            }

            if (
                !form.name.trim()
            ) {
                return 'Please enter the product name.';
            }

            if (
                !form.unit.trim()
            ) {
                return 'Please select the main product unit.';
            }

            const signatures =
                new Set<string>();

            for (
                let index = 0;
                index
                < form.variants.length;
                index++
            ) {
                const variant =
                    form.variants[
                    index
                    ];

                const size =
                    Number(
                        variant
                            .size_value,
                    );

                if (
                    !Number.isFinite(
                        size,
                    )
                    || size <= 0
                ) {
                    return `Variant ${index + 1}: enter a valid size greater than zero.`;
                }

                if (
                    !variant
                        .size_unit
                        .trim()
                ) {
                    return `Variant ${index + 1}: select a measurement unit.`;
                }

                if (
                    !variant
                        .package_unit
                        .trim()
                ) {
                    return `Variant ${index + 1}: select a package unit.`;
                }

                const signature =
                    `${size.toFixed(3)}|${variant.size_unit.trim().toLowerCase()}|${variant.package_unit.trim().toLowerCase()}`;

                if (
                    signatures.has(
                        signature,
                    )
                ) {
                    return `Variant ${index + 1} duplicates another package size.`;
                }

                signatures.add(
                    signature,
                );
            }

            return null;
        };

    const handleSubmit =
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

            const validationError =
                validateForm();

            if (validationError) {
                setFormError(
                    validationError,
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
                    editingProduct
                        ? await updateProduct(
                            token,
                            editingProduct.id,
                            form,
                        )
                        : await createProduct(
                            token,
                            form,
                        );

                setSuccessMessage(
                    response.message,
                );

                closeForm();

                await loadProducts();
            } catch (error) {
                setFormError(
                    getErrorMessage(
                        error,
                        editingProduct
                            ? 'Unable to update product.'
                            : 'Unable to create product.',
                    ),
                );
            } finally {
                setIsSubmitting(
                    false,
                );
            }
        };

    const handleDelete =
        async (
            product:
                Product,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            const confirmed =
                window.confirm(
                    `Delete "${product.name}"?`,
                );

            if (!confirmed) {
                return;
            }

            try {
                const response =
                    await deleteProduct(
                        token,
                        product.id,
                    );

                setSuccessMessage(
                    response.message,
                );

                await loadProducts();
            } catch (error) {
                setPageError(
                    getErrorMessage(
                        error,
                        'Unable to delete product.',
                    ),
                );
            }
        };

    /* =====================================================
       MODAL
       ===================================================== */

    const modal =
        showForm
            && typeof document
            !== 'undefined'
            ? createPortal(
                <div id="sapo-product-modal">
                    <div
                        className="pm-backdrop"
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
                            className="pm-dialog"
                            role="dialog"
                            aria-modal="true"
                        >
                            <header className="pm-header">
                                <div>
                                    <div
                                        style={{
                                            fontSize:
                                                11,
                                            opacity:
                                                0.8,
                                            fontWeight:
                                                800,
                                        }}
                                    >
                                        PRODUCT MANAGEMENT
                                    </div>

                                    <h2 className="pm-title">
                                        {editingProduct
                                            ? 'Edit Product'
                                            : 'Add New Product'}
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    className="pm-close"
                                    onClick={
                                        closeForm
                                    }
                                >
                                    <Icon name="x" />
                                </button>
                            </header>

                            <form
                                ref={
                                    formRef
                                }
                                onSubmit={(event) => {
                                    void handleSubmit(
                                        event,
                                    );
                                }}
                            >
                                <div className="pm-body">
                                    {formError && (
                                        <div className="pm-error">
                                            {
                                                formError
                                            }
                                        </div>
                                    )}

                                    {/* CATEGORY */}

                                    <section className="pm-section">
                                        <div className="pm-section-header">
                                            <div>
                                                <h3 className="pm-section-title">
                                                    1. Product Category
                                                </h3>
                                            </div>
                                        </div>

                                        <label className="pm-field">
                                            <span className="pm-label">
                                                Category
                                                {' '}
                                                <span className="pm-required">
                                                    *
                                                </span>
                                            </span>

                                            <SearchableSelect
                                                triggerRef={
                                                    categoryInputRef
                                                }
                                                value={
                                                    form.category_id
                                                        ? String(
                                                            form.category_id,
                                                        )
                                                        : ''
                                                }
                                                options={
                                                    categorySearchOptions
                                                }
                                                placeholder="Select category"
                                                searchPlaceholder="Search category..."
                                                emptyMessage="No category matches your search."
                                                disabled={
                                                    isSubmitting
                                                    || isCategoryLoading
                                                }
                                                ariaLabel="Select product category"
                                                onChange={(value) => {
                                                    setForm(
                                                        (
                                                            current,
                                                        ) => ({
                                                            ...current,

                                                            category_id:
                                                                value
                                                                    ? Number(
                                                                        value,
                                                                    )
                                                                    : null,
                                                        }),
                                                    );

                                                    setFormError(
                                                        '',
                                                    );
                                                }}
                                                onAdvance={() => {
                                                    focusElement(
                                                        nameInputRef.current,
                                                    );
                                                }}
                                            />

                                            {selectedCategory && (
                                                <small>
                                                    Selected:
                                                    {' '}
                                                    <strong>
                                                        {
                                                            selectedCategory.name
                                                        }
                                                    </strong>
                                                </small>
                                            )}
                                        </label>
                                    </section>

                                    {/* PRODUCT */}

                                    <section className="pm-section">
                                        <div className="pm-section-header">
                                            <div>
                                                <h3 className="pm-section-title">
                                                    2. Product Information
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="pm-grid">
                                            <label className="pm-field pm-full">
                                                <span className="pm-label">
                                                    Product Name
                                                    {' '}
                                                    <span className="pm-required">
                                                        *
                                                    </span>
                                                </span>

                                                <input
                                                    ref={
                                                        nameInputRef
                                                    }
                                                    className="pm-input"
                                                    value={
                                                        form.name
                                                    }
                                                    maxLength={
                                                        160
                                                    }
                                                    placeholder="Example: Tomato Seeds"
                                                    onKeyDown={(event) => {
                                                        handleEnterFocus(
                                                            event,
                                                            unitInputRef.current,
                                                        );
                                                    }}
                                                    onChange={(event) => {
                                                        setForm(
                                                            (
                                                                current,
                                                            ) => ({
                                                                ...current,

                                                                name:
                                                                    event
                                                                        .target
                                                                        .value,
                                                            }),
                                                        );
                                                    }}
                                                />
                                            </label>

                                            <label className="pm-field">
                                                <span className="pm-label">
                                                    Main Product Unit
                                                    {' '}
                                                    <span className="pm-required">
                                                        *
                                                    </span>
                                                </span>

                                                <SearchableSelect
                                                    triggerRef={
                                                        unitInputRef
                                                    }
                                                    value={
                                                        form.unit
                                                    }
                                                    options={
                                                        COMMON_UNIT_OPTIONS
                                                    }
                                                    placeholder="Select unit"
                                                    searchPlaceholder="Search unit..."
                                                    emptyMessage="No unit matches your search."
                                                    disabled={
                                                        isSubmitting
                                                    }
                                                    ariaLabel="Select main product unit"
                                                    onChange={(unit) => {
                                                        setForm(
                                                            (
                                                                current,
                                                            ) => ({
                                                                ...current,

                                                                unit,

                                                                variants:
                                                                    current
                                                                        .variants
                                                                        .map(
                                                                            (
                                                                                variant,
                                                                            ) => ({
                                                                                ...variant,

                                                                                package_unit:
                                                                                    variant
                                                                                        .package_unit
                                                                                    || unit,
                                                                            }),
                                                                        ),
                                                            }),
                                                        );

                                                        setFormError(
                                                            '',
                                                        );
                                                    }}
                                                    onAdvance={() => {
                                                        focusElement(
                                                            barcodeInputRef.current,
                                                        );
                                                    }}
                                                />
                                            </label>

                                            <label className="pm-field">
                                                <span className="pm-label">
                                                    General Barcode
                                                    {' '}
                                                    <small>
                                                        Optional
                                                    </small>
                                                </span>

                                                <input
                                                    ref={
                                                        barcodeInputRef
                                                    }
                                                    className="pm-input"
                                                    value={
                                                        form.barcode
                                                    }
                                                    maxLength={
                                                        120
                                                    }
                                                    placeholder="For normal product"
                                                    onKeyDown={(event) => {
                                                        if (
                                                            event.key
                                                            !== 'Enter'
                                                            || event.shiftKey
                                                            || event.ctrlKey
                                                            || event.metaKey
                                                            || event.altKey
                                                        ) {
                                                            return;
                                                        }

                                                        event.preventDefault();
                                                        event.stopPropagation();

                                                        if (
                                                            form.variants.length
                                                            > 0
                                                        ) {
                                                            focusVariantField(
                                                                0,
                                                                'size',
                                                            );

                                                            return;
                                                        }

                                                        focusElement(
                                                            addVariantButtonRef.current,
                                                        );
                                                    }}
                                                    onChange={(event) => {
                                                        setForm(
                                                            (
                                                                current,
                                                            ) => ({
                                                                ...current,

                                                                barcode:
                                                                    event
                                                                        .target
                                                                        .value,
                                                            }),
                                                        );
                                                    }}
                                                />
                                            </label>
                                        </div>

                                        {/* <div className="pm-info">
                                            For products with package variants, each variant can have its own barcode. Cost price, selling price, batch, expiry and stock are still recorded when purchasing stock.
                                        </div> */}

                                        {/* <div className="pm-keyboard-help">
                                            <span className="pm-key">
                                                Enter
                                            </span>

                                            <span>
                                                Next field
                                            </span>

                                            <span className="pm-key">
                                                Ctrl/Cmd + Enter
                                            </span>

                                            <span>
                                                Save product
                                            </span>

                                            <span className="pm-key">
                                                Alt + V
                                            </span>

                                            <span>
                                                Add variant
                                            </span>
                                        </div> */}
                                    </section>

                                    {/* VARIANTS */}

                                    <section className="pm-section">
                                        <div className="pm-section-header">
                                            <div>
                                                <h3 className="pm-section-title">
                                                    3. Package Variants
                                                </h3>
                                                
                                            </div>

                                            <button
                                                ref={
                                                    addVariantButtonRef
                                                }
                                                type="button"
                                                className="pm-button pm-button-primary"
                                                disabled={
                                                    isSubmitting
                                                }
                                                onKeyDown={(event) => {
                                                    if (
                                                        event.key
                                                        === 'Enter'
                                                        && !event.shiftKey
                                                        && !event.ctrlKey
                                                        && !event.metaKey
                                                        && !event.altKey
                                                    ) {
                                                        event.preventDefault();
                                                        event.stopPropagation();

                                                        addVariant();
                                                    }
                                                }}
                                                onClick={
                                                    addVariant
                                                }
                                            >
                                                <Icon name="plus" />

                                                Add Variant
                                            </button>
                                        </div>

                                        {form.variants.length
                                            === 0 ? (
                                            <div className="pm-empty-variants">
                                                {/* This is currently a normal product with no package variants.
                                                <br />
                                                Click <strong>Add Variant</strong> when the product has multiple package sizes. */}
                                            </div>
                                        ) : (
                                            <div className="pm-variant-list">
                                                {form.variants.map(
                                                    (
                                                        variant,
                                                        index,
                                                    ) => (
                                                        <article
                                                            key={`${variant.id ?? 'new'}-${index}`}
                                                            className="pm-variant-card"
                                                        >
                                                            <div className="pm-variant-head">
                                                                <span className="pm-variant-title">
                                                                    Variant
                                                                    {' '}
                                                                    {
                                                                        index
                                                                        + 1
                                                                    }
                                                                </span>

                                                                <button
                                                                    type="button"
                                                                    className="pm-button pm-button-danger"
                                                                    disabled={
                                                                        isSubmitting
                                                                    }
                                                                    onClick={() => {
                                                                        removeVariant(
                                                                            index,
                                                                        );
                                                                    }}
                                                                >
                                                                    <Icon name="trash" />

                                                                    Remove
                                                                </button>
                                                            </div>

                                                            <div className="pm-variant-grid">
                                                                <label className="pm-field">
                                                                    <span className="pm-label">
                                                                        Size
                                                                    </span>

                                                                    <input
                                                                        type="number"
                                                                        min="0.001"
                                                                        step="0.001"
                                                                        className="pm-input"
                                                                        data-variant-index={
                                                                            index
                                                                        }
                                                                        data-variant-field="size"
                                                                        value={
                                                                            variant
                                                                                .size_value
                                                                        }
                                                                        placeholder="100"
                                                                        onKeyDown={(event) => {
                                                                            handleVariantFieldEnter(
                                                                                event,
                                                                                index,
                                                                                'size-unit',
                                                                            );
                                                                        }}
                                                                        onChange={(event) => {
                                                                            updateVariant(
                                                                                index,
                                                                                {
                                                                                    size_value:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            );
                                                                        }}
                                                                    />
                                                                </label>

                                                                <label className="pm-field">
                                                                    <span className="pm-label">
                                                                        Size Unit
                                                                    </span>

                                                                    <SearchableSelect
                                                                        value={
                                                                            variant
                                                                                .size_unit
                                                                        }
                                                                        options={
                                                                            VARIANT_SIZE_UNIT_OPTIONS
                                                                        }
                                                                        placeholder="Select"
                                                                        searchPlaceholder="Search size unit..."
                                                                        emptyMessage="No size unit matches your search."
                                                                        disabled={
                                                                            isSubmitting
                                                                        }
                                                                        ariaLabel={`Select size unit for variant ${index + 1}`}
                                                                        dataVariantIndex={
                                                                            index
                                                                        }
                                                                        dataVariantField="size-unit"
                                                                        onChange={(value) => {
                                                                            updateVariant(
                                                                                index,
                                                                                {
                                                                                    size_unit:
                                                                                        value,
                                                                                },
                                                                            );
                                                                        }}
                                                                        onAdvance={() => {
                                                                            focusVariantField(
                                                                                index,
                                                                                'package',
                                                                            );
                                                                        }}
                                                                    />
                                                                </label>

                                                                <label className="pm-field">
                                                                    <span className="pm-label">
                                                                        Package
                                                                    </span>

                                                                    <SearchableSelect
                                                                        value={
                                                                            variant
                                                                                .package_unit
                                                                        }
                                                                        options={
                                                                            COMMON_UNIT_OPTIONS
                                                                        }
                                                                        placeholder="Select"
                                                                        searchPlaceholder="Search package unit..."
                                                                        emptyMessage="No package unit matches your search."
                                                                        disabled={
                                                                            isSubmitting
                                                                        }
                                                                        ariaLabel={`Select package unit for variant ${index + 1}`}
                                                                        dataVariantIndex={
                                                                            index
                                                                        }
                                                                        dataVariantField="package"
                                                                        onChange={(value) => {
                                                                            updateVariant(
                                                                                index,
                                                                                {
                                                                                    package_unit:
                                                                                        value,
                                                                                },
                                                                            );
                                                                        }}
                                                                        onAdvance={() => {
                                                                            focusVariantField(
                                                                                index,
                                                                                'barcode',
                                                                            );
                                                                        }}
                                                                    />
                                                                </label>

                                                                <label className="pm-field">
                                                                    <span className="pm-label">
                                                                        Variant Barcode
                                                                    </span>

                                                                    <input
                                                                        className="pm-input"
                                                                        data-variant-index={
                                                                            index
                                                                        }
                                                                        data-variant-field="barcode"
                                                                        value={
                                                                            variant
                                                                                .barcode
                                                                        }
                                                                        maxLength={
                                                                            120
                                                                        }
                                                                        placeholder="Scan or enter barcode"
                                                                        onKeyDown={(event) => {
                                                                            handleVariantFieldEnter(
                                                                                event,
                                                                                index,
                                                                                'active',
                                                                            );
                                                                        }}
                                                                        onChange={(event) => {
                                                                            updateVariant(
                                                                                index,
                                                                                {
                                                                                    barcode:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            );
                                                                        }}
                                                                    />
                                                                </label>

                                                                <label className="pm-check">
                                                                    <input
                                                                        type="checkbox"
                                                                        data-variant-index={
                                                                            index
                                                                        }
                                                                        data-variant-field="active"
                                                                        checked={
                                                                            variant
                                                                                .is_active
                                                                        }
                                                                        onKeyDown={(event) => {
                                                                            handleVariantActiveEnter(
                                                                                event,
                                                                                index,
                                                                                variant
                                                                                    .is_active,
                                                                            );
                                                                        }}
                                                                        onChange={(event) => {
                                                                            updateVariant(
                                                                                index,
                                                                                {
                                                                                    is_active:
                                                                                        event
                                                                                            .target
                                                                                            .checked,
                                                                                },
                                                                            );
                                                                        }}
                                                                    />

                                                                    Active
                                                                </label>
                                                            </div>
                                                        </article>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </section>
                                </div>

                                <footer className="pm-footer">
                                    <button
                                        type="button"
                                        className="pm-button"
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
                                        ref={
                                            submitButtonRef
                                        }
                                        type="submit"
                                        className="pm-button pm-button-primary"
                                        disabled={
                                            isSubmitting
                                        }
                                    >
                                        {isSubmitting
                                            ? 'Saving...'
                                            : editingProduct
                                                ? 'Update Product'
                                                : 'Create Product'}
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
            <div id="sapo-products">
                <style>
                    {productsPageStyles}
                </style>

                <div className="pp-container">
                    <header className="pp-header">
                        <div>
                            {/* <span className="pp-kicker">
                                Product Catalog
                            </span> */}

                            <h1>
                                Products
                            </h1>

                        </div>

                        <div className="pp-header-actions">
                            <button
                                type="button"
                                className="pp-button pp-button-primary"
                                disabled={
                                    isCategoryLoading
                                }
                                onClick={
                                    openCreateForm
                                }
                            >
                                <Icon name="plus" />

                                Add Product
                            </button>
                        </div>
                    </header>

                    {successMessage && (
                        <div className="pp-alert pp-alert-success">
                            {
                                successMessage
                            }
                        </div>
                    )}

                    {pageError && (
                        <div className="pp-alert pp-alert-error">
                            {
                                pageError
                            }
                        </div>
                    )}

                    <section className="pp-panel">
                        <form
                            className="pp-toolbar"
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
                                className="pp-toolbar-search"
                                value={
                                    searchInput
                                }
                                placeholder="Search product name, SKU, barcode, category or variant..."
                                aria-label="Search products"
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
                                className="pp-button pp-secondary-button"
                            >
                                <Icon name="search" />

                                Search
                            </button>

                            <select
                                className="pp-toolbar-select"
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

                            <span className="pp-result-count">
                                {pagination.total}
                                {' '}
                                {pagination.total === 1
                                    ? 'Product'
                                    : 'Products'}
                            </span>
                        </form>

                        <div className="pp-table-scroll">
                            <table className="pp-table">
                                <thead>
                                    <tr>
                                        <th>
                                            Product
                                        </th>

                                        <th>
                                            Category
                                        </th>

                                        <th>
                                            Main Unit
                                        </th>

                                        {/* <th>
                                            Variants
                                        </th> */}

                                        <th>
                                            Barcode
                                        </th>

                                        {/* <th>
                                            Available Stock
                                        </th> */}

                                        <th>
                                            Status
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
                                                colSpan={6}
                                                className="pp-table-state"
                                            >
                                                Loading products...
                                            </td>
                                        </tr>
                                    ) : products.length
                                        === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="pp-table-state"
                                            >
                                                No products found.
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map(
                                            (
                                                product,
                                            ) => (
                                                <tr
                                                    key={
                                                        product.id
                                                    }
                                                >
                                                    <td data-label="Product">
                                                        <strong className="pp-product-name">
                                                            {
                                                                product.name
                                                            }
                                                        </strong>

                                                        <span className="pp-small">
                                                            SKU:
                                                            {' '}
                                                            {
                                                                product.sku
                                                            }
                                                        </span>
                                                    </td>

                                                    <td data-label="Category">
                                                        <span className="pp-badge">
                                                            {product
                                                                .category
                                                                ?.name
                                                                ?? 'Not assigned'}
                                                        </span>
                                                    </td>

                                                    <td data-label="Main Unit">
                                                        {
                                                            product.unit
                                                        }
                                                    </td>

                                                    {/* <td>
                                                        {product
                                                            .variants
                                                            .length
                                                            === 0 ? (
                                                            <span className="pp-small">
                                                                Standard product
                                                            </span>
                                                        ) : (
                                                            <div className="pp-variants">
                                                                {product
                                                                    .variants
                                                                    .map(
                                                                        (
                                                                            variant,
                                                                        ) => (
                                                                            <span
                                                                                key={
                                                                                    variant.id
                                                                                }
                                                                                className="pp-variant"
                                                                            >
                                                                                {
                                                                                    variant.display_name
                                                                                }
                                                                            </span>
                                                                        ),
                                                                    )}
                                                            </div>
                                                        )}
                                                    </td> */}

                                                    <td data-label="Barcode">
                                                        {product.barcode
                                                            || (
                                                                product
                                                                    .variants
                                                                    .some(
                                                                        (
                                                                            variant,
                                                                        ) =>
                                                                            Boolean(
                                                                                variant
                                                                                    .barcode,
                                                                            ),
                                                                    )
                                                                    ? 'Variant barcodes'
                                                                    : 'Not assigned'
                                                            )}
                                                    </td>

                                                    {/* <td>
                                                        {product
                                                            .variants
                                                            .length
                                                            > 0 ? (
                                                            <div className="pp-stock-group">
                                                                {product
                                                                    .variants
                                                                    .map(
                                                                        (
                                                                            variant,
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    variant.id
                                                                                }
                                                                                className="pp-stock-variant"
                                                                            >
                                                                                <span className="pp-stock-name">
                                                                                    {
                                                                                        variant.display_name
                                                                                    }
                                                                                </span>

                                                                                {variant
                                                                                    .available_stock_by_unit
                                                                                    .map(
                                                                                        (
                                                                                            stock,
                                                                                        ) => (
                                                                                            <span
                                                                                                key={`${variant.id}-${stock.unit}`}
                                                                                                className="pp-stock"
                                                                                            >
                                                                                                {formatNumber(
                                                                                                    stock
                                                                                                        .available_quantity,
                                                                                                )}
                                                                                                {' '}
                                                                                                {
                                                                                                    stock.unit
                                                                                                }
                                                                                            </span>
                                                                                        ),
                                                                                    )}
                                                                            </div>
                                                                        ),
                                                                    )}
                                                            </div>
                                                        ) : (
                                                            <div className="pp-stock-group">
                                                                {product
                                                                    .available_stock_by_unit
                                                                    .map(
                                                                        (
                                                                            stock,
                                                                        ) => (
                                                                            <span
                                                                                key={
                                                                                    stock.unit
                                                                                }
                                                                                className="pp-stock"
                                                                            >
                                                                                {formatNumber(
                                                                                    stock
                                                                                        .available_quantity,
                                                                                )}
                                                                                {' '}
                                                                                {
                                                                                    stock.unit
                                                                                }
                                                                            </span>
                                                                        ),
                                                                    )}
                                                            </div>
                                                        )}
                                                    </td> */}

                                                    <td data-label="Status">
                                                        <span
                                                            className={
                                                                product.is_active
                                                                    ? 'pp-status-badge pp-status-active'
                                                                    : 'pp-status-badge pp-status-inactive'
                                                            }
                                                        >
                                                            {product.is_active
                                                                ? 'Active'
                                                                : 'Inactive'}
                                                        </span>
                                                    </td>

                                                    <td data-label="Actions">
                                                        <div className="pp-actions pp-table-actions">
                                                            <button
                                                                type="button"
                                                                className="pp-button pp-view-button pp-action-button"
                                                                onClick={() => {
                                                                    navigate(
                                                                        `/admin/products/${product.id}`,
                                                                    );
                                                                }}
                                                            >
                                                                <Icon name="eye" />
                                                                View
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="pp-button pp-secondary-button pp-action-button"
                                                                onClick={() => {
                                                                    openEditForm(
                                                                        product,
                                                                    );
                                                                }}
                                                            >
                                                                <Icon name="edit" />
                                                                Edit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="pp-button pp-button-danger pp-action-button"
                                                                onClick={() => {
                                                                    void handleDelete(
                                                                        product,
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
                            <footer className="pp-pagination">
                                <button
                                    type="button"
                                    className="pp-pagination-button"
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
                                                    current
                                                    - 1,
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
                                    className="pp-pagination-button"
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
                                                    current
                                                    + 1,
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
            </div>

            {modal}
        </>
    );
}