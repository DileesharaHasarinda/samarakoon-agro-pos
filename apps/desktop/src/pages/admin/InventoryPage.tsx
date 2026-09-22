import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {
    KeyboardEvent as ReactKeyboardEvent,
    RefObject,
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
    createOpeningInventory,
    getStockProducts,
} from '../../services/stockService';

import {
    getProductOptions,
} from '../../services/productService';

import {
    getSupplierOptions,
} from '../../services/supplierService';

import type {
    ProductOption,
    ProductVariantOption,
} from '../../types/product';

import type {
    SupplierOption,
} from '../../types/supplier';

import type {
    OpeningInventoryInput,
    StockPaginationMeta,
    StockProduct,
} from '../../types/stock';

const currencyFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

const quantityFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            maximumFractionDigits: 3,
        },
    );

const initialPagination:
    StockPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null,
};

type IconName =
    | 'alert'
    | 'box'
    | 'calendar'
    | 'chevron-left'
    | 'chevron-right'
    | 'close'
    | 'layers'
    | 'plus'
    | 'refresh'
    | 'search'
    | 'tag';

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
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true,
        focusable: false,
    };

    switch (name) {
        case 'alert':
            return (
                <svg {...props}>
                    <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                    <path d="M12 9v4M12 17h.01" />
                </svg>
            );

        case 'box':
            return (
                <svg {...props}>
                    <path d="m21 8-9 5-9-5 9-5 9 5Z" />
                    <path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" />
                </svg>
            );

        case 'calendar':
            return (
                <svg {...props}>
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="16"
                        rx="2"
                    />
                    <path d="M16 3v4M8 3v4M3 11h18" />
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

        case 'close':
            return (
                <svg {...props}>
                    <path d="m6 6 12 12M18 6 6 18" />
                </svg>
            );

        case 'layers':
            return (
                <svg {...props}>
                    <path d="m12 2 9 5-9 5-9-5 9-5Z" />
                    <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
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

        case 'tag':
        default:
            return (
                <svg {...props}>
                    <path d="M20 13 11 22l-9-9V2h11l7 7a3 3 0 0 1 0 4Z" />
                    <path d="M7 7h.01" />
                </svg>
            );
    }
}

function numberValue(
    value: unknown,
): number {
    const parsed =
        Number(
            value,
        );

    return Number.isFinite(
        parsed,
    )
        ? parsed
        : 0;
}

function formatQuantity(
    value: unknown,
): string {
    return quantityFormatter.format(
        numberValue(
            value,
        ),
    );
}

function formatDate(
    value: string | null,
): string {
    if (!value) {
        return 'No expiry date';
    }

    const date =
        new Date(
            `${value.substring(
                0,
                10,
            )}T00:00:00`,
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
        },
    ).format(
        date,
    );
}

function expiryStatus(
    value: string | null,
): 'expired' | 'soon' | 'normal' | 'none' {
    if (!value) {
        return 'none';
    }

    const expiryDate =
        new Date(
            `${value.substring(
                0,
                10,
            )}T23:59:59`,
        );

    if (
        Number.isNaN(
            expiryDate.getTime(),
        )
    ) {
        return 'none';
    }

    const daysRemaining =
        Math.ceil(
            (
                expiryDate.getTime()
                - new Date().getTime()
            )
            / 86_400_000,
        );

    if (
        daysRemaining < 0
    ) {
        return 'expired';
    }

    if (
        daysRemaining <= 30
    ) {
        return 'soon';
    }

    return 'normal';
}

interface OpeningInventoryFormState {
    supplier_id: string;
    product_id: string;
    product_variant_id: string;
    purchase_cost: string;
    selling_price: string;
    available_quantity: string;
    is_dual_unit: boolean;
    conversion_factor: string;
    secondary_unit: string;
    secondary_selling_price: string;
    loose_quantity: string;
}

interface OpeningSearchOption {
    value: string;
    label: string;
    secondary?: string;
    searchText?: string;
}

interface OpeningSearchableSelectProps {
    value: string;
    options: OpeningSearchOption[];
    placeholder: string;
    searchPlaceholder: string;
    emptyMessage: string;
    disabled?: boolean;
    ariaLabel: string;
    navKey: string;
    triggerRef?: RefObject<HTMLButtonElement | null>;
    onChange: (value: string) => void;
    onAdvance: (navKey: string) => void;
}

function newOpeningInventoryForm(
    supplierId = '',
): OpeningInventoryFormState {
    return {
        supplier_id: supplierId,
        product_id: '',
        product_variant_id: '',
        purchase_cost: '',
        selling_price: '',
        available_quantity: '',
        is_dual_unit: false,
        conversion_factor: '50',
        secondary_unit: 'Kg',
        secondary_selling_price: '',
        loose_quantity: '0',
    };
}

function activeVariants(
    product: ProductOption | null,
): ProductVariantOption[] {
    if (!product) {
        return [];
    }

    return product.variants.filter(
        (variant) => variant.is_active,
    );
}

function isBagUnit(
    unit: string | null | undefined,
): boolean {
    const normalised = String(unit ?? '')
        .trim()
        .toLowerCase();

    return normalised === 'bag'
        || normalised === 'bags';
}

function OpeningSearchableSelect({
    value,
    options,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    disabled = false,
    ariaLabel,
    navKey,
    triggerRef,
    onChange,
    onAdvance,
}: OpeningSearchableSelectProps) {
    const rootRef =
        useRef<HTMLDivElement | null>(null);

    const searchInputRef =
        useRef<HTMLInputElement | null>(null);

    const optionButtonRefs =
        useRef<Map<string, HTMLButtonElement>>(
            new Map(),
        );

    const [isOpen, setIsOpen] =
        useState(false);

    const [searchQuery, setSearchQuery] =
        useState('');

    const [
        highlightedIndex,
        setHighlightedIndex,
    ] = useState(0);

    const selectedOption =
        useMemo(
            () =>
                options.find(
                    (option) =>
                        option.value === value,
                ) ?? null,
            [options, value],
        );

    const filteredOptions =
        useMemo(() => {
            const query =
                searchQuery
                    .trim()
                    .toLowerCase();

            if (!query) {
                return options;
            }

            return options.filter((option) => {
                const searchValue = [
                    option.label,
                    option.secondary,
                    option.searchText,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return searchValue.includes(query);
            });
        }, [options, searchQuery]);

    /*
     * Dropdown lifecycle.
     *
     * IMPORTANT:
     * Do not depend on filteredOptions/searchQuery here.
     *
     * The old implementation re-ran this effect after every typed
     * character because filteredOptions changed. It then called
     * input.select(), which selected the whole search text again.
     * Therefore the next character replaced the previous character.
     *
     * This effect now runs only when the dropdown itself opens/closes,
     * or when the underlying option collection/selected value changes.
     */
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const selectedIndex =
            options.findIndex(
                (option) =>
                    option.value === value,
            );

        setHighlightedIndex(
            selectedIndex >= 0
                ? selectedIndex
                : 0,
        );

        const timer =
            window.setTimeout(() => {
                const input =
                    searchInputRef.current;

                if (!input) {
                    return;
                }

                /*
                 * Focus the search box without selecting the existing
                 * text. Keeping the caret at the end means every new
                 * character is appended normally.
                 */
                input.focus({
                    preventScroll: true,
                });

                const caretPosition =
                    input.value.length;

                input.setSelectionRange(
                    caretPosition,
                    caretPosition,
                );
            }, 30);

        const handleOutsideClick =
            (event: MouseEvent): void => {
                if (
                    event.target instanceof Node
                    && !rootRef.current
                        ?.contains(event.target)
                ) {
                    setIsOpen(false);
                    setSearchQuery('');
                }
            };

        document.addEventListener(
            'mousedown',
            handleOutsideClick,
        );

        return () => {
            window.clearTimeout(timer);

            document.removeEventListener(
                'mousedown',
                handleOutsideClick,
            );
        };
    }, [
        isOpen,
        options,
        value,
    ]);

    /*
     * Search results may change on every keystroke.
     *
     * Only reset the keyboard highlight here. Do not refocus or select
     * the search input, otherwise normal multi-character typing breaks.
     */
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setHighlightedIndex(0);
    }, [
        searchQuery,
        isOpen,
    ]);

    const closeDropdown = (): void => {
        setIsOpen(false);
        setSearchQuery('');
    };

    const chooseOption =
        (
            option: OpeningSearchOption,
        ): void => {
            onChange(option.value);
            closeDropdown();

            window.setTimeout(() => {
                onAdvance(navKey);
            }, 0);
        };

    const moveHighlight =
        (
            direction: number,
        ): void => {
            if (
                filteredOptions.length
                === 0
            ) {
                return;
            }

            setHighlightedIndex((current) => {
                const next =
                    (
                        current
                        + direction
                        + filteredOptions.length
                    )
                    % filteredOptions.length;

                const option =
                    filteredOptions[next];

                if (option) {
                    window.setTimeout(() => {
                        optionButtonRefs.current
                            .get(option.value)
                            ?.scrollIntoView({
                                block: 'nearest',
                            });
                    }, 0);
                }

                return next;
            });
        };

    const handleSearchKeyDown =
        (
            event:
                ReactKeyboardEvent<
                    HTMLInputElement
                >,
        ): void => {
            if (
                event.key
                === 'ArrowDown'
            ) {
                event.preventDefault();
                moveHighlight(1);
                return;
            }

            if (
                event.key
                === 'ArrowUp'
            ) {
                event.preventDefault();
                moveHighlight(-1);
                return;
            }

            if (
                event.key
                === 'Enter'
            ) {
                event.preventDefault();

                const option =
                    filteredOptions[
                    highlightedIndex
                    ];

                if (option) {
                    chooseOption(option);
                }

                return;
            }

            if (
                event.key
                === 'Escape'
            ) {
                event.preventDefault();
                event.stopPropagation();
                closeDropdown();
            }
        };

    return (
        <div
            ref={rootRef}
            className={
                isOpen
                    ? 'oim-searchable-select is-open'
                    : 'oim-searchable-select'
            }
        >
            <button
                ref={triggerRef}
                type="button"
                className={[
                    'oim-searchable-trigger',
                    selectedOption
                        ? ''
                        : 'placeholder',
                ]
                    .filter(Boolean)
                    .join(' ')}
                disabled={disabled}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                data-oim-enter-nav="true"
                data-oim-nav-key={navKey}
                onClick={() => {
                    setIsOpen(
                        (current) => !current,
                    );
                }}
                onKeyDown={(event) => {
                    if (
                        event.key === 'Enter'
                        && !isOpen
                        && selectedOption
                    ) {
                        event.preventDefault();
                        event.stopPropagation();
                        onAdvance(navKey);
                        return;
                    }

                    if (
                        (
                            event.key === 'Enter'
                            || event.key === 'ArrowDown'
                            || event.key === ' '
                        )
                        && !isOpen
                    ) {
                        event.preventDefault();
                        event.stopPropagation();
                        setIsOpen(true);
                        return;
                    }

                    if (
                        event.key === 'Escape'
                        && isOpen
                    ) {
                        event.preventDefault();
                        event.stopPropagation();
                        closeDropdown();
                    }
                }}
            >
                <span className="oim-searchable-trigger-text">
                    {selectedOption?.label
                        ?? placeholder}
                </span>

                <span
                    className={
                        isOpen
                            ? 'oim-searchable-chevron open'
                            : 'oim-searchable-chevron'
                    }
                >
                    <Icon
                        name="chevron-right"
                    />
                </span>
            </button>

            {isOpen && (
                <div className="oim-searchable-menu">
                    <div className="oim-searchable-search-wrap">
                        <span className="oim-searchable-search-icon">
                            <Icon name="search" />
                        </span>

                        <input
                            ref={searchInputRef}
                            type="text"
                            className="oim-searchable-search-input"
                            value={searchQuery}
                            placeholder={
                                searchPlaceholder
                            }
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(event) => {
                                setSearchQuery(
                                    event.target.value,
                                );
                            }}
                            onKeyDown={
                                handleSearchKeyDown
                            }
                        />
                    </div>

                    <div
                        className="oim-searchable-options"
                        role="listbox"
                        aria-label={ariaLabel}
                    >
                        {filteredOptions.length
                            === 0 ? (
                            <div className="oim-searchable-empty">
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
                                                'oim-searchable-option',
                                                selected
                                                    ? 'selected'
                                                    : '',
                                                highlighted
                                                    ? 'highlighted'
                                                    : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                            onMouseEnter={() => {
                                                setHighlightedIndex(
                                                    index,
                                                );
                                            }}
                                            onMouseDown={(event) => {
                                                event.preventDefault();
                                            }}
                                            onClick={() => {
                                                chooseOption(option);
                                            }}
                                        >
                                            <span className="oim-searchable-option-copy">
                                                <strong>
                                                    {option.label}
                                                </strong>

                                                {option.secondary && (
                                                    <small>
                                                        {option.secondary}
                                                    </small>
                                                )}
                                            </span>

                                            {selected && (
                                                <span className="oim-searchable-selected">
                                                    ✓
                                                </span>
                                            )}
                                        </button>
                                    );
                                },
                            )
                        )}
                    </div>

                    <div className="oim-searchable-keyboard-help">
                        Type to search • ↑ ↓ move • Enter select • Esc close
                    </div>
                </div>
            )}
        </div>
    );
}

const inventoryStyles = `
#inventory-page,
#inventory-page *,
#inventory-page *::before,
#inventory-page *::after,
#inventory-details-modal,
#inventory-details-modal *,
#inventory-details-modal *::before,
#inventory-details-modal *::after {
    box-sizing: border-box !important;
}

#inventory-page,
#inventory-details-modal {
    --inv-green-950: #052e16;
    --inv-green-900: #14532d;
    --inv-green-800: #166534;
    --inv-green-700: #15803d;
    --inv-green-100: #dcfce7;
    --inv-green-50: #f0fdf4;

    --inv-blue-700: #175cd3;
    --inv-blue-50: #eff8ff;

    --inv-amber-700: #b54708;
    --inv-amber-50: #fffaeb;

    --inv-red-700: #b42318;
    --inv-red-50: #fef3f2;

    --inv-text: #101828;
    --inv-text-secondary: #344054;
    --inv-muted: #667085;

    --inv-border: #d0d9d2;
    --inv-border-strong: #aebdb2;

    --inv-surface: #ffffff;
    --inv-page: #f5f8f6;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif !important;
}

#inventory-page {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 14px !important;
    margin: 0 !important;
    padding: 0 !important;
    color: var(--inv-text) !important;
    font-size: 14px !important;
    line-height: 1.5 !important;
    background: transparent !important;
    isolation: isolate !important;
    overflow-x: hidden !important;
}

#inventory-page button,
#inventory-page input,
#inventory-page select,
#inventory-details-modal button {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#inventory-page h1,
#inventory-page h2,
#inventory-page h3,
#inventory-page p,
#inventory-details-modal h2,
#inventory-details-modal h3,
#inventory-details-modal p {
    margin: 0 !important;
}

/* =========================================================
   PAGE HEADER
   ========================================================= */

#inventory-page .inv-header {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    flex-wrap: wrap !important;
    gap: 16px !important;
    padding: 20px 24px !important;
    background: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 10px !important;
}

#inventory-page .inv-header-copy {
    min-width: 0 !important;
    flex: 1 1 420px !important;
}

#inventory-page .inv-kicker {
    display: inline-block !important;
    margin-bottom: 6px !important;
    color: var(--inv-green-700) !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    letter-spacing: .04em !important;
    text-transform: uppercase !important;
}

#inventory-page .inv-title {
    color: var(--inv-text) !important;
    font-size: 22px !important;
    font-weight: 700 !important;
    line-height: 1.3 !important;
}

#inventory-page .inv-subtitle {
    margin-top: 4px !important;
    color: var(--inv-muted) !important;
    font-size: 13.5px !important;
}

#inventory-page .inv-header-meta {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
}

#inventory-page .inv-opening-button {
    display: inline-flex !important;
    min-height: 36px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    padding: 7px 12px !important;
    color: #ffffff !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    background: var(--inv-green-700) !important;
    border: 1px solid var(--inv-green-700) !important;
    border-radius: 8px !important;
    cursor: pointer !important;
}

#inventory-page .inv-opening-button:hover {
    background: var(--inv-green-800) !important;
    border-color: var(--inv-green-800) !important;
}

#inventory-page .inv-opening-button svg {
    width: 15px !important;
    height: 15px !important;
}

#inventory-page .inv-total-badge {
    display: inline-flex !important;
    min-height: 36px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    padding: 7px 11px !important;
    color: var(--inv-green-900) !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    white-space: nowrap !important;
    background: var(--inv-green-50) !important;
    border: 1px solid #bbf7d0 !important;
    border-radius: 8px !important;
}

#inventory-page .inv-total-badge svg {
    width: 15px !important;
    height: 15px !important;
}

/* =========================================================
   ALERT
   ========================================================= */

#inventory-page .inv-alert {
    display: flex !important;
    width: 100% !important;
    min-height: 48px !important;
    align-items: center !important;
    gap: 9px !important;
    padding: 10px 12px !important;
    color: var(--inv-red-700) !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    background: var(--inv-red-50) !important;
    border: 1px solid #f3b5af !important;
    border-radius: 10px !important;
}

#inventory-page .inv-alert > svg {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
}

#inventory-page .inv-success {
    display: flex !important;
    width: 100% !important;
    min-height: 46px !important;
    align-items: center !important;
    gap: 9px !important;
    padding: 10px 12px !important;
    color: var(--inv-green-900) !important;
    font-size: 13px !important;
    font-weight: 650 !important;
    background: var(--inv-green-50) !important;
    border: 1px solid #86efac !important;
    border-radius: 10px !important;
}

#inventory-page .inv-alert-text {
    min-width: 0 !important;
    flex: 1 !important;
}

#inventory-page .inv-retry {
    display: inline-flex !important;
    min-height: 32px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;
    padding: 5px 8px !important;
    color: var(--inv-red-700) !important;
    font-size: 12px !important;
    font-weight: 650 !important;
    background: #ffffff !important;
    border: 1px solid #e8aaa4 !important;
    border-radius: 7px !important;
    cursor: pointer !important;
}

#inventory-page .inv-retry svg {
    width: 14px !important;
    height: 14px !important;
}

/* =========================================================
   CONTENT CARD + TOOLBAR
   ========================================================= */

#inventory-page .inv-panel {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 16px !important;
    padding: 20px !important;
    background: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 10px !important;
}

#inventory-page .inv-toolbar {
    display: flex !important;
    width: 100% !important;
    flex-wrap: wrap !important;
    align-items: flex-end !important;
    gap: 12px !important;
}

#inventory-page .inv-field {
    display: grid !important;
    min-width: 0 !important;
    flex: 1 1 300px !important;
    gap: 5px !important;
}

#inventory-page .inv-label {
    color: var(--inv-text-secondary) !important;
    font-size: 12px !important;
    font-weight: 650 !important;
}

#inventory-page .inv-search-wrapper {
    position: relative !important;
    display: block !important;
    width: 100% !important;
}

#inventory-page .inv-search-icon {
    position: absolute !important;
    top: 50% !important;
    left: 12px !important;
    z-index: 2 !important;
    display: grid !important;
    width: 18px !important;
    height: 18px !important;
    place-items: center !important;
    color: var(--inv-muted) !important;
    transform: translateY(-50%) !important;
    pointer-events: none !important;
}

#inventory-page .inv-search-icon svg {
    width: 18px !important;
    height: 18px !important;
}

#inventory-page .inv-search-input,
#inventory-page .inv-page-size-select {
    height: 38px !important;
    min-height: 38px !important;
    color: var(--inv-text) !important;
    font-size: 13.5px !important;
    outline: none !important;
    background: #f9fafb !important;
    border: 1px solid #d1d5db !important;
    border-radius: 8px !important;
}

#inventory-page .inv-search-input {
    width: 100% !important;
    padding: 0 42px 0 40px !important;
}

#inventory-page .inv-page-size-field {
    display: grid !important;
    grid-template-columns: auto 86px !important;
    align-items: center !important;
    gap: 8px !important;
}

#inventory-page .inv-page-size-select {
    width: 86px !important;
    padding: 0 10px !important;
    cursor: pointer !important;
}

#inventory-page .inv-search-input:focus,
#inventory-page .inv-page-size-select:focus,
#inventory-page button:focus-visible {
    outline: none !important;
    border-color: var(--inv-green-700) !important;
    box-shadow: 0 0 0 3px rgba(22, 163, 74, .12) !important;
}

#inventory-page .inv-clear-search {
    position: absolute !important;
    top: 50% !important;
    right: 5px !important;
    z-index: 3 !important;
    display: grid !important;
    width: 30px !important;
    height: 30px !important;
    place-items: center !important;
    padding: 0 !important;
    color: var(--inv-muted) !important;
    background: transparent !important;
    border: 0 !important;
    border-radius: 7px !important;
    transform: translateY(-50%) !important;
    cursor: pointer !important;
}

#inventory-page .inv-clear-search:hover {
    background: #f1f5f9 !important;
}

#inventory-page .inv-clear-search svg {
    width: 15px !important;
    height: 15px !important;
}

/* =========================================================
   INVENTORY TABLE
   ========================================================= */

#inventory-page .inv-table-container {
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
    max-height: 520px !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 8px !important;
    scrollbar-width: thin !important;
}

#inventory-page .inv-table {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    table-layout: fixed !important;
    border-collapse: collapse !important;
    background: #ffffff !important;
}

#inventory-page .inv-table thead {
    position: sticky !important;
    top: 0 !important;
    z-index: 2 !important;
}

#inventory-page .inv-table th {
    padding: 12px 10px !important;
    color: #6b7280 !important;
    font-size: 11px !important;
    font-weight: 650 !important;
    line-height: 1.25 !important;
    text-align: left !important;
    text-transform: uppercase !important;
    background: #f9fafb !important;
    border-bottom: 1px solid #e5e7eb !important;
    overflow-wrap: anywhere !important;
}

#inventory-page .inv-table td {
    padding: 13px 10px !important;
    color: #1f2937 !important;
    font-size: 12.5px !important;
    vertical-align: middle !important;
    border-bottom: 1px solid #f1f5f9 !important;
    overflow-wrap: anywhere !important;
}

#inventory-page .inv-table tbody tr:last-child td {
    border-bottom: 0 !important;
}

#inventory-page .inv-table tbody tr:hover td {
    background: #f9fafb !important;
}

#inventory-page .inv-col-product {
    width: 35% !important;
}

#inventory-page .inv-col-category {
    width: 18% !important;
}

#inventory-page .inv-col-stock {
    width: 18% !important;
}

#inventory-page .inv-col-options {
    width: 12% !important;
}

#inventory-page .inv-col-action {
    width: 17% !important;
}

#inventory-page .inv-product-cell {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 10px !important;
}

#inventory-page .inv-product-icon {
    display: grid !important;
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    place-items: center !important;
    color: var(--inv-green-900) !important;
    background: var(--inv-green-50) !important;
    border: 1px solid #bbf7d0 !important;
    border-radius: 8px !important;
}

#inventory-page .inv-product-icon svg {
    width: 17px !important;
    height: 17px !important;
}

#inventory-page .inv-product-copy {
    min-width: 0 !important;
}

#inventory-page .inv-product-name {
    display: block !important;
    overflow: hidden !important;
    color: var(--inv-text) !important;
    font-size: 13px !important;
    font-weight: 650 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#inventory-page .inv-product-unit {
    display: block !important;
    margin-top: 2px !important;
    color: #9ca3af !important;
    font-size: 11.5px !important;
}

#inventory-page .inv-category-badge {
    display: inline-flex !important;
    min-height: 24px !important;
    align-items: center !important;
    padding: 4px 9px !important;
    color: #475569 !important;
    font-size: 11.5px !important;
    font-weight: 600 !important;
    background: #f1f5f9 !important;
    border-radius: 999px !important;
}

#inventory-page .inv-stock-value {
    color: var(--inv-green-800) !important;
    font-weight: 750 !important;
    font-variant-numeric: tabular-nums !important;
}

#inventory-page .inv-options-badge {
    display: inline-flex !important;
    min-height: 24px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 4px 9px !important;
    color: var(--inv-blue-700) !important;
    font-size: 11.5px !important;
    font-weight: 650 !important;
    background: var(--inv-blue-50) !important;
    border-radius: 999px !important;
}

#inventory-page .inv-view-button {
    display: inline-flex !important;
    min-width: 86px !important;
    min-height: 30px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;
    padding: 5px 9px !important;
    color: var(--inv-blue-700) !important;
    font-size: 11.5px !important;
    font-weight: 650 !important;
    background: var(--inv-blue-50) !important;
    border: 1px solid #bfdbfe !important;
    border-radius: 6px !important;
    cursor: pointer !important;
}

#inventory-page .inv-view-button:hover {
    color: #ffffff !important;
    background: var(--inv-blue-700) !important;
    border-color: var(--inv-blue-700) !important;
}

#inventory-page .inv-view-button svg {
    width: 14px !important;
    height: 14px !important;
}

#inventory-page .inv-table-state {
    padding: 42px 16px !important;
    color: #9ca3af !important;
    font-size: 13.5px !important;
    text-align: center !important;
}

/* =========================================================
   PAGINATION
   ========================================================= */

#inventory-page .inv-pagination {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 16px !important;
    padding-top: 4px !important;
}

#inventory-page .inv-pagination-button {
    min-width: 90px !important;
    min-height: 36px !important;
    padding: 7px 16px !important;
    color: #374151 !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    background: #ffffff !important;
    border: 1px solid #d1d5db !important;
    border-radius: 6px !important;
    cursor: pointer !important;
}

#inventory-page .inv-pagination-button:hover:not(:disabled) {
    background: #f9fafb !important;
    border-color: #9ca3af !important;
}

#inventory-page .inv-pagination-button:disabled {
    opacity: .5 !important;
    cursor: not-allowed !important;
}

#inventory-page .inv-pagination span {
    color: #6b7280 !important;
    font-size: 13px !important;
}

/* =========================================================
   DETAILS MODAL
   ========================================================= */

#inventory-details-modal {
    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;
    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    color: var(--inv-text) !important;
    font-size: 14px !important;
    line-height: 1.5 !important;
    isolation: isolate !important;
}

#inventory-details-modal svg {
    display: block !important;
    width: 18px !important;
    height: 18px !important;
    flex-shrink: 0 !important;
}

#inventory-details-modal .idm-backdrop {
    position: absolute !important;
    inset: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 18px !important;
    overflow: auto !important;
    background: rgba(3, 18, 10, .74) !important;
    backdrop-filter: blur(4px) !important;
}

#inventory-details-modal .idm-dialog {
    display: flex !important;
    width: min(980px, 100%) !important;
    max-height: calc(100dvh - 36px) !important;
    min-width: 0 !important;
    min-height: 0 !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid var(--inv-border) !important;
    border-radius: 16px !important;
    box-shadow: 0 28px 80px rgba(0, 0, 0, .38) !important;
}

#inventory-details-modal .idm-header {
    display: flex !important;
    min-height: 86px !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 16px !important;
    padding: 14px 18px !important;
    color: #ffffff !important;
    background: linear-gradient(
        135deg,
        var(--inv-green-950),
        var(--inv-green-700)
    ) !important;
}

#inventory-details-modal .idm-header-main {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 12px !important;
}

#inventory-details-modal .idm-header-icon {
    display: grid !important;
    width: 46px !important;
    height: 46px !important;
    min-width: 46px !important;
    place-items: center !important;
    color: var(--inv-green-900) !important;
    background: #ffffff !important;
    border-radius: 11px !important;
}

#inventory-details-modal .idm-header-icon svg {
    width: 23px !important;
    height: 23px !important;
}

#inventory-details-modal .idm-kicker {
    display: block !important;
    margin-bottom: 2px !important;
    color: #bbf7d0 !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    letter-spacing: .055em !important;
    text-transform: uppercase !important;
}

#inventory-details-modal .idm-title {
    overflow: hidden !important;
    color: #ffffff !important;
    font-size: 22px !important;
    font-weight: 780 !important;
    line-height: 1.25 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#inventory-details-modal .idm-close {
    display: grid !important;
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    place-items: center !important;
    padding: 0 !important;
    color: #ffffff !important;
    background: rgba(255,255,255,.12) !important;
    border: 1px solid rgba(255,255,255,.34) !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#inventory-details-modal .idm-close:hover {
    background: rgba(255,255,255,.22) !important;
}

#inventory-details-modal .idm-body {
    display: flex !important;
    min-height: 0 !important;
    flex: 1 1 auto !important;
    flex-direction: column !important;
    gap: 14px !important;
    padding: 16px !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    background: #f5f8f6 !important;
    scrollbar-width: thin !important;
}

#inventory-details-modal .idm-overview {
    display: grid !important;
    grid-template-columns:
        minmax(0, 1.3fr)
        minmax(150px, .7fr)
        minmax(150px, .7fr) !important;
    gap: 10px !important;
}

#inventory-details-modal .idm-overview-card {
    display: flex !important;
    min-width: 0 !important;
    min-height: 78px !important;
    flex-direction: column !important;
    justify-content: center !important;
    gap: 3px !important;
    padding: 12px 14px !important;
    background: #ffffff !important;
    border: 1px solid var(--inv-border) !important;
    border-radius: 10px !important;
}

#inventory-details-modal .idm-overview-card span {
    color: var(--inv-muted) !important;
    font-size: 10px !important;
    font-weight: 750 !important;
    letter-spacing: .035em !important;
    text-transform: uppercase !important;
}

#inventory-details-modal .idm-overview-card strong {
    overflow: hidden !important;
    color: var(--inv-text) !important;
    font-size: 15px !important;
    font-weight: 780 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#inventory-details-modal .idm-overview-card.stock strong {
    color: var(--inv-green-800) !important;
    font-size: 18px !important;
}

#inventory-details-modal .idm-overview-card.options strong {
    color: var(--inv-blue-700) !important;
    font-size: 18px !important;
}

#inventory-details-modal .idm-section {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 10px !important;
    padding: 14px !important;
    background: #ffffff !important;
    border: 1px solid var(--inv-border) !important;
    border-radius: 11px !important;
}

#inventory-details-modal .idm-section-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    padding-bottom: 10px !important;
    border-bottom: 1px solid #e7ece8 !important;
}

#inventory-details-modal .idm-section-heading {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 8px !important;
}

#inventory-details-modal .idm-section-heading svg {
    color: var(--inv-green-700) !important;
}

#inventory-details-modal .idm-section-title {
    color: var(--inv-text-secondary) !important;
    font-size: 15px !important;
    font-weight: 780 !important;
}

#inventory-details-modal .idm-section-count {
    color: var(--inv-muted) !important;
    font-size: 11px !important;
}

#inventory-details-modal .idm-price-list {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 10px !important;
}

#inventory-details-modal .idm-price-card {
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid #d9e2dc !important;
    border-radius: 10px !important;
}

#inventory-details-modal .idm-price-summary {
    display: grid !important;
    grid-template-columns:
        repeat(2, minmax(0, 1fr)) !important;
    gap: 1px !important;
    background: #d9e2dc !important;
}

#inventory-details-modal .idm-price-stat {
    display: flex !important;
    min-width: 0 !important;
    min-height: 70px !important;
    flex-direction: column !important;
    justify-content: center !important;
    gap: 2px !important;
    padding: 10px 12px !important;
    background: var(--inv-green-50) !important;
}

#inventory-details-modal .idm-price-stat.stock {
    background: var(--inv-blue-50) !important;
}

#inventory-details-modal .idm-price-stat span {
    color: var(--inv-muted) !important;
    font-size: 9px !important;
    font-weight: 750 !important;
    letter-spacing: .035em !important;
    text-transform: uppercase !important;
}

#inventory-details-modal .idm-price-stat strong {
    color: var(--inv-green-900) !important;
    font-size: 16px !important;
    font-weight: 800 !important;
}

#inventory-details-modal .idm-price-stat.stock strong {
    color: var(--inv-blue-700) !important;
}

#inventory-details-modal .idm-batch-wrap {
    width: 100% !important;
    min-width: 0 !important;
    overflow-x: hidden !important;
}

#inventory-details-modal .idm-batch-table {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    table-layout: fixed !important;
    border-collapse: collapse !important;
}

#inventory-details-modal .idm-batch-table th {
    padding: 10px 11px !important;
    color: var(--inv-muted) !important;
    font-size: 10px !important;
    font-weight: 750 !important;
    text-align: left !important;
    text-transform: uppercase !important;
    background: #f8faf9 !important;
    border-bottom: 1px solid #e5eae6 !important;
}

#inventory-details-modal .idm-batch-table td {
    padding: 10px 11px !important;
    color: var(--inv-text-secondary) !important;
    font-size: 12px !important;
    vertical-align: middle !important;
    border-bottom: 1px solid #edf1ee !important;
    overflow-wrap: anywhere !important;
}

#inventory-details-modal .idm-batch-table tbody tr:last-child td {
    border-bottom: 0 !important;
}

#inventory-details-modal .idm-batch-table th:nth-child(1),
#inventory-details-modal .idm-batch-table td:nth-child(1) {
    width: 42% !important;
}

#inventory-details-modal .idm-batch-table th:nth-child(2),
#inventory-details-modal .idm-batch-table td:nth-child(2) {
    width: 25% !important;
}

#inventory-details-modal .idm-batch-table th:nth-child(3),
#inventory-details-modal .idm-batch-table td:nth-child(3) {
    width: 33% !important;
}

#inventory-details-modal .idm-batch-reference {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 7px !important;
}

#inventory-details-modal .idm-batch-reference svg {
    width: 15px !important;
    height: 15px !important;
    color: var(--inv-green-700) !important;
}

#inventory-details-modal .idm-batch-reference strong {
    overflow: hidden !important;
    color: var(--inv-text) !important;
    font-size: 12px !important;
    font-weight: 680 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#inventory-details-modal .idm-quantity {
    color: var(--inv-green-800) !important;
    font-weight: 750 !important;
}

#inventory-details-modal .idm-expiry {
    display: inline-flex !important;
    min-height: 27px !important;
    align-items: center !important;
    gap: 5px !important;
    padding: 4px 7px !important;
    color: var(--inv-text-secondary) !important;
    font-size: 10px !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
    background: #f8faf9 !important;
    border: 1px solid #e4e9e5 !important;
    border-radius: 999px !important;
}

#inventory-details-modal .idm-expiry svg {
    width: 13px !important;
    height: 13px !important;
}

#inventory-details-modal .idm-expiry.expired {
    color: var(--inv-red-700) !important;
    background: var(--inv-red-50) !important;
    border-color: #f3b5af !important;
}

#inventory-details-modal .idm-expiry.soon {
    color: var(--inv-amber-700) !important;
    background: var(--inv-amber-50) !important;
    border-color: #f0d48f !important;
}

#inventory-details-modal .idm-empty {
    padding: 22px 12px !important;
    color: var(--inv-muted) !important;
    font-size: 12px !important;
    text-align: center !important;
}

#inventory-details-modal .idm-mobile-batches {
    display: none !important;
}

#inventory-details-modal .idm-footer {
    display: flex !important;
    min-height: 64px !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: flex-end !important;
    padding: 11px 16px !important;
    background: #ffffff !important;
    border-top: 1px solid var(--inv-border) !important;
}

#inventory-details-modal .idm-footer-button {
    display: inline-flex !important;
    min-width: 100px !important;
    min-height: 38px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 7px 14px !important;
    color: #374151 !important;
    font-size: 13px !important;
    font-weight: 650 !important;
    background: #ffffff !important;
    border: 1px solid #d1d5db !important;
    border-radius: 7px !important;
    cursor: pointer !important;
}

#inventory-details-modal .idm-footer-button:hover {
    background: #f9fafb !important;
}

/* =========================================================
   OPENING INVENTORY MODAL
   ========================================================= */

#opening-inventory-modal,
#opening-inventory-modal *,
#opening-inventory-modal *::before,
#opening-inventory-modal *::after {
    box-sizing: border-box !important;
}

#opening-inventory-modal {
    --oi-green-900: #14532d;
    --oi-green-800: #166534;
    --oi-green-700: #15803d;
    --oi-green-50: #f0fdf4;
    --oi-text: #101828;
    --oi-text-secondary: #344054;
    --oi-muted: #667085;
    --oi-border: #d0d5dd;

    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;
    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    margin: 0 !important;
    padding: 0 !important;
    color: var(--oi-text) !important;
    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif !important;
    font-size: 14px !important;
    line-height: 1.5 !important;
}

#opening-inventory-modal button,
#opening-inventory-modal input,
#opening-inventory-modal select {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#opening-inventory-modal .oim-backdrop {
    position: absolute !important;
    inset: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 18px !important;
    overflow: auto !important;
    background: rgba(3, 18, 10, .74) !important;
    backdrop-filter: blur(4px) !important;
}

#opening-inventory-modal .oim-dialog {
    display: flex !important;
    width: min(760px, 100%) !important;
    max-height: calc(100dvh - 36px) !important;
    min-width: 0 !important;
    min-height: 0 !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid #cfd8d2 !important;
    border-radius: 16px !important;
    box-shadow: 0 28px 80px rgba(0, 0, 0, .38) !important;
}

#opening-inventory-modal .oim-header {
    display: flex !important;
    min-height: 84px !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 16px !important;
    padding: 15px 18px !important;
    color: #ffffff !important;
    background: linear-gradient(
        135deg,
        #052e16,
        var(--oi-green-700)
    ) !important;
}

#opening-inventory-modal .oim-kicker {
    display: block !important;
    margin-bottom: 2px !important;
    color: #bbf7d0 !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    letter-spacing: .055em !important;
    text-transform: uppercase !important;
}

#opening-inventory-modal .oim-title {
    margin: 0 !important;
    color: #ffffff !important;
    font-size: 21px !important;
    font-weight: 780 !important;
    line-height: 1.25 !important;
}

#opening-inventory-modal .oim-close {
    display: grid !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    place-items: center !important;
    padding: 0 !important;
    color: #ffffff !important;
    background: rgba(255,255,255,.12) !important;
    border: 1px solid rgba(255,255,255,.34) !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#opening-inventory-modal .oim-close svg {
    width: 18px !important;
    height: 18px !important;
}

#opening-inventory-modal .oim-body {
    min-height: 0 !important;
    flex: 1 1 auto !important;
    padding: 17px !important;
    overflow-y: auto !important;
    background: #f5f8f6 !important;
}

#opening-inventory-modal .oim-info {
    margin-bottom: 14px !important;
    padding: 10px 12px !important;
    color: #365314 !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    background: #f7fee7 !important;
    border: 1px solid #bef264 !important;
    border-radius: 9px !important;
}

#opening-inventory-modal .oim-alert {
    margin-bottom: 12px !important;
    padding: 9px 11px !important;
    font-size: 12px !important;
    font-weight: 650 !important;
    border-radius: 8px !important;
}

#opening-inventory-modal .oim-alert.error {
    color: #b42318 !important;
    background: #fef3f2 !important;
    border: 1px solid #f3b5af !important;
}

#opening-inventory-modal .oim-alert.success {
    color: #14532d !important;
    background: #f0fdf4 !important;
    border: 1px solid #86efac !important;
}

#opening-inventory-modal .oim-grid {
    display: grid !important;
    grid-template-columns:
        repeat(2, minmax(0, 1fr)) !important;
    gap: 13px !important;
}

#opening-inventory-modal .oim-field {
    display: grid !important;
    min-width: 0 !important;
    gap: 5px !important;
}

#opening-inventory-modal .oim-field.full {
    grid-column: 1 / -1 !important;
}

#opening-inventory-modal .oim-label {
    color: var(--oi-text-secondary) !important;
    font-size: 12px !important;
    font-weight: 700 !important;
}

#opening-inventory-modal .oim-required {
    color: #b42318 !important;
}

#opening-inventory-modal .oim-input,
#opening-inventory-modal .oim-select {
    width: 100% !important;
    height: 40px !important;
    min-height: 40px !important;
    padding: 0 11px !important;
    color: var(--oi-text) !important;
    font-size: 13.5px !important;
    background: #ffffff !important;
    border: 1px solid var(--oi-border) !important;
    border-radius: 8px !important;
    outline: none !important;
}

#opening-inventory-modal .oim-input:focus,
#opening-inventory-modal .oim-select:focus {
    border-color: var(--oi-green-700) !important;
    box-shadow: 0 0 0 3px rgba(22, 163, 74, .12) !important;
}

#opening-inventory-modal .oim-input:disabled,
#opening-inventory-modal .oim-select:disabled {
    color: #98a2b3 !important;
    background: #f2f4f7 !important;
    cursor: not-allowed !important;
}

#opening-inventory-modal .oim-help {
    color: var(--oi-muted) !important;
    font-size: 11px !important;
    line-height: 1.4 !important;
}

#opening-inventory-modal .oim-preview {
    grid-column: 1 / -1 !important;
    display: grid !important;
    grid-template-columns:
        repeat(3, minmax(0, 1fr)) !important;
    gap: 1px !important;
    overflow: hidden !important;
    margin-top: 2px !important;
    background: #d9e2dc !important;
    border: 1px solid #d9e2dc !important;
    border-radius: 9px !important;
}

#opening-inventory-modal .oim-preview-item {
    min-width: 0 !important;
    padding: 9px 11px !important;
    background: #ffffff !important;
}

#opening-inventory-modal .oim-preview-item span {
    display: block !important;
    color: var(--oi-muted) !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
}

#opening-inventory-modal .oim-preview-item strong {
    display: block !important;
    overflow: hidden !important;
    margin-top: 2px !important;
    color: var(--oi-text) !important;
    font-size: 13px !important;
    font-weight: 750 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#opening-inventory-modal .oim-footer {
    display: flex !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: flex-end !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
    padding: 12px 16px !important;
    background: #ffffff !important;
    border-top: 1px solid #d0d5dd !important;
}

#opening-inventory-modal .oim-button {
    display: inline-flex !important;
    min-height: 38px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 7px 13px !important;
    color: #344054 !important;
    font-size: 12.5px !important;
    font-weight: 700 !important;
    background: #ffffff !important;
    border: 1px solid #d0d5dd !important;
    border-radius: 8px !important;
    cursor: pointer !important;
}

#opening-inventory-modal .oim-button.primary {
    color: #ffffff !important;
    background: var(--oi-green-700) !important;
    border-color: var(--oi-green-700) !important;
}

#opening-inventory-modal .oim-button:hover:not(:disabled) {
    background: #f8fafc !important;
}

#opening-inventory-modal .oim-button.primary:hover:not(:disabled) {
    background: var(--oi-green-800) !important;
    border-color: var(--oi-green-800) !important;
}

#opening-inventory-modal .oim-button:disabled {
    opacity: .55 !important;
    cursor: not-allowed !important;
}

@media (max-width: 700px) {
    #opening-inventory-modal .oim-backdrop {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    #opening-inventory-modal .oim-dialog {
        width: 100% !important;
        max-height: 96dvh !important;
        border-radius: 16px 16px 0 0 !important;
    }

    #opening-inventory-modal .oim-grid,
    #opening-inventory-modal .oim-preview {
        grid-template-columns: 1fr !important;
    }

    #opening-inventory-modal .oim-field.full,
    #opening-inventory-modal .oim-preview {
        grid-column: auto !important;
    }

    #opening-inventory-modal .oim-footer {
        align-items: stretch !important;
        flex-direction: column-reverse !important;
    }

    #opening-inventory-modal .oim-button {
        width: 100% !important;
    }
}


/* =========================================================
   OPENING INVENTORY — SEARCH + KEYBOARD + BAG/KG
   ========================================================= */

#opening-inventory-modal [data-oim-enter-nav="true"]:focus,
#opening-inventory-modal [data-oim-enter-nav="true"]:focus-visible {
    outline: none !important;
    border-color: var(--oi-green-700) !important;
    box-shadow: 0 0 0 3px rgba(22, 163, 74, .14) !important;
}

#opening-inventory-modal .oim-searchable-select {
    position: relative !important;
    width: 100% !important;
    min-width: 0 !important;
}

#opening-inventory-modal .oim-searchable-select.is-open {
    z-index: 900 !important;
}

#opening-inventory-modal .oim-searchable-trigger {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    height: 42px !important;
    min-height: 42px !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
    padding: 0 10px !important;
    color: var(--oi-text) !important;
    font-size: 13.5px !important;
    font-weight: 550 !important;
    text-align: left !important;
    background: #ffffff !important;
    border: 1px solid var(--oi-border) !important;
    border-radius: 8px !important;
    cursor: pointer !important;
}

#opening-inventory-modal .oim-searchable-trigger.placeholder {
    color: var(--oi-muted) !important;
}

#opening-inventory-modal .oim-searchable-trigger-text {
    min-width: 0 !important;
    flex: 1 1 auto !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#opening-inventory-modal .oim-searchable-chevron {
    display: grid !important;
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
    place-items: center !important;
    color: var(--oi-muted) !important;
    transform: rotate(90deg) !important;
    transition: transform .15s ease !important;
}

#opening-inventory-modal .oim-searchable-chevron.open {
    transform: rotate(-90deg) !important;
}

#opening-inventory-modal .oim-searchable-chevron svg {
    width: 16px !important;
    height: 16px !important;
}

#opening-inventory-modal .oim-searchable-menu {
    position: absolute !important;
    top: calc(100% + 6px) !important;
    left: 0 !important;
    z-index: 9999 !important;
    width: 100% !important;
    min-width: min(420px, 85vw) !important;
    padding: 8px !important;
    background: #ffffff !important;
    border: 1px solid #b7c4ba !important;
    border-radius: 11px !important;
    box-shadow: 0 18px 45px rgba(16, 24, 40, .20) !important;
}

#opening-inventory-modal .oim-searchable-search-wrap {
    position: relative !important;
    padding-bottom: 8px !important;
    border-bottom: 1px solid #edf1ee !important;
}

#opening-inventory-modal .oim-searchable-search-icon {
    position: absolute !important;
    top: 12px !important;
    left: 11px !important;
    display: grid !important;
    width: 18px !important;
    height: 18px !important;
    place-items: center !important;
    color: var(--oi-muted) !important;
    pointer-events: none !important;
}

#opening-inventory-modal .oim-searchable-search-icon svg {
    width: 17px !important;
    height: 17px !important;
}

#opening-inventory-modal .oim-searchable-search-input {
    display: block !important;
    width: 100% !important;
    height: 42px !important;
    padding: 0 12px 0 38px !important;
    color: var(--oi-text) !important;
    font-size: 13.5px !important;
    font-weight: 600 !important;
    background: #f9fbfa !important;
    border: 1px solid var(--oi-border) !important;
    border-radius: 8px !important;
    outline: none !important;
}

#opening-inventory-modal .oim-searchable-search-input:focus {
    border-color: var(--oi-green-700) !important;
    box-shadow: 0 0 0 3px rgba(22, 163, 74, .12) !important;
}

#opening-inventory-modal .oim-searchable-options {
    max-height: 260px !important;
    margin-top: 7px !important;
    overflow-y: auto !important;
    scrollbar-width: thin !important;
}

#opening-inventory-modal .oim-searchable-option {
    display: flex !important;
    width: 100% !important;
    min-height: 47px !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    padding: 8px 10px !important;
    color: var(--oi-text-secondary) !important;
    text-align: left !important;
    background: #ffffff !important;
    border: 1px solid transparent !important;
    border-radius: 8px !important;
    cursor: pointer !important;
}

#opening-inventory-modal .oim-searchable-option.highlighted,
#opening-inventory-modal .oim-searchable-option:hover {
    background: var(--oi-green-50) !important;
    border-color: #b8dfc3 !important;
}

#opening-inventory-modal .oim-searchable-option.selected {
    color: var(--oi-green-900) !important;
    background: #e9f8ee !important;
    border-color: #8fc69e !important;
}

#opening-inventory-modal .oim-searchable-option-copy {
    display: flex !important;
    min-width: 0 !important;
    flex: 1 1 auto !important;
    flex-direction: column !important;
}

#opening-inventory-modal .oim-searchable-option-copy strong {
    overflow: hidden !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#opening-inventory-modal .oim-searchable-option-copy small {
    color: var(--oi-muted) !important;
    font-size: 10px !important;
}

#opening-inventory-modal .oim-searchable-selected {
    display: grid !important;
    width: 25px !important;
    height: 25px !important;
    min-width: 25px !important;
    place-items: center !important;
    color: #ffffff !important;
    font-size: 13px !important;
    font-weight: 900 !important;
    background: var(--oi-green-700) !important;
    border-radius: 50% !important;
}

#opening-inventory-modal .oim-searchable-empty {
    display: flex !important;
    min-height: 96px !important;
    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 3px !important;
    color: var(--oi-muted) !important;
    text-align: center !important;
}

#opening-inventory-modal .oim-searchable-empty svg {
    width: 22px !important;
    height: 22px !important;
    color: var(--oi-green-700) !important;
}

#opening-inventory-modal .oim-searchable-keyboard-help {
    margin-top: 7px !important;
    padding-top: 7px !important;
    color: var(--oi-muted) !important;
    font-size: 9px !important;
    font-weight: 650 !important;
    text-align: center !important;
    border-top: 1px solid #edf1ee !important;
}

#opening-inventory-modal .oim-dual-card {
    grid-column: 1 / -1 !important;
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 12px !important;
    padding: 13px !important;
    background: linear-gradient(135deg, #f0fdf4, #eff8ff) !important;
    border: 1px solid #9fd4ae !important;
    border-radius: 11px !important;
}

#opening-inventory-modal .oim-dual-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
}

#opening-inventory-modal .oim-dual-title {
    color: var(--oi-green-900) !important;
    font-size: 14px !important;
    font-weight: 800 !important;
}

#opening-inventory-modal .oim-switch {
    display: inline-flex !important;
    min-height: 40px !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 6px 10px !important;
    color: var(--oi-text-secondary) !important;
    font-size: 12px !important;
    font-weight: 750 !important;
    background: #ffffff !important;
    border: 1px solid #9fd4ae !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#opening-inventory-modal .oim-switch input {
    width: 19px !important;
    height: 19px !important;
    accent-color: var(--oi-green-700) !important;
}

#opening-inventory-modal .oim-dual-grid {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 11px !important;
}

#opening-inventory-modal .oim-dual-preview {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 8px !important;
}

#opening-inventory-modal .oim-dual-preview > div {
    min-width: 0 !important;
    padding: 9px 10px !important;
    background: #ffffff !important;
    border: 1px solid #c4ddcb !important;
    border-radius: 8px !important;
}

#opening-inventory-modal .oim-dual-preview span {
    display: block !important;
    color: var(--oi-muted) !important;
    font-size: 9px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
}

#opening-inventory-modal .oim-dual-preview strong {
    display: block !important;
    margin-top: 2px !important;
    color: var(--oi-text-secondary) !important;
    font-size: 13px !important;
    font-weight: 850 !important;
}

#opening-inventory-modal .oim-keyboard-note {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    margin-right: auto !important;
    color: var(--oi-muted) !important;
    font-size: 10px !important;
    font-weight: 600 !important;
}

@media (max-width: 700px) {
    #opening-inventory-modal .oim-dual-grid,
    #opening-inventory-modal .oim-dual-preview {
        grid-template-columns: 1fr !important;
    }

    #opening-inventory-modal .oim-dual-card {
        grid-column: auto !important;
    }

    #opening-inventory-modal .oim-dual-header {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #opening-inventory-modal .oim-searchable-menu {
        min-width: 100% !important;
    }

    #opening-inventory-modal .oim-keyboard-note {
        margin-right: 0 !important;
    }
}

/* =========================================================
   RESPONSIVE
   ========================================================= */

@media (max-width: 850px) {
    #inventory-page .inv-table-container {
        max-height: none !important;
        overflow: visible !important;
        border: 0 !important;
        background: #f9fafb !important;
    }

    #inventory-page .inv-table,
    #inventory-page .inv-table tbody,
    #inventory-page .inv-table tr,
    #inventory-page .inv-table td {
        display: block !important;
        width: 100% !important;
    }

    #inventory-page .inv-table thead {
        display: none !important;
    }

    #inventory-page .inv-table tbody {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
    }

    #inventory-page .inv-table tbody tr {
        overflow: hidden !important;
        background: #ffffff !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
    }

    #inventory-page .inv-table td {
        display: grid !important;
        grid-template-columns:
            135px minmax(0, 1fr) !important;
        align-items: center !important;
        gap: 12px !important;
        min-height: 44px !important;
        padding: 10px 14px !important;
        border-bottom: 1px solid #e5e7eb !important;
    }

    #inventory-page .inv-table td:last-child {
        border-bottom: 0 !important;
    }

    #inventory-page .inv-table td::before {
        content: attr(data-label) !important;
        color: #6b7280 !important;
        font-size: 11px !important;
        font-weight: 650 !important;
        text-transform: uppercase !important;
    }

    #inventory-page .inv-table td.inv-table-state {
        display: block !important;
        padding: 40px 16px !important;
        text-align: center !important;
    }

    #inventory-page .inv-table td.inv-table-state::before {
        display: none !important;
        content: none !important;
    }

    #inventory-details-modal .idm-overview {
        grid-template-columns: 1fr !important;
    }
}

@media (max-width: 700px) {
    #inventory-page .inv-header {
        flex-direction: column !important;
        align-items: stretch !important;
        padding: 16px !important;
    }

    #inventory-page .inv-total-badge {
        width: 100% !important;
    }

    #inventory-page .inv-toolbar {
        flex-direction: column !important;
        align-items: stretch !important;
    }

    #inventory-page .inv-field,
    #inventory-page .inv-page-size-field {
        width: 100% !important;
    }

    #inventory-page .inv-pagination {
        flex-direction: column !important;
        align-items: stretch !important;
    }

    #inventory-page .inv-pagination-button {
        width: 100% !important;
    }

    #inventory-page .inv-pagination span {
        text-align: center !important;
    }

    #inventory-details-modal .idm-backdrop {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    #inventory-details-modal .idm-dialog {
        width: 100% !important;
        max-height: 96dvh !important;
        border-radius: 16px 16px 0 0 !important;
    }

    #inventory-details-modal .idm-title {
        font-size: 19px !important;
    }

    #inventory-details-modal .idm-price-summary {
        grid-template-columns: 1fr !important;
    }

    #inventory-details-modal .idm-batch-wrap {
        display: none !important;
    }

    #inventory-details-modal .idm-mobile-batches {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        padding: 9px !important;
    }

    #inventory-details-modal .idm-mobile-batch {
        display: grid !important;
        gap: 8px !important;
        padding: 10px !important;
        background: #f8faf9 !important;
        border: 1px solid #e1e7e2 !important;
        border-radius: 8px !important;
    }

    #inventory-details-modal .idm-mobile-batch-row {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
    }

    #inventory-details-modal .idm-mobile-batch-row span:first-child {
        color: var(--inv-muted) !important;
        font-size: 10px !important;
        font-weight: 650 !important;
    }

    #inventory-details-modal .idm-mobile-batch-row strong {
        max-width: 64% !important;
        color: var(--inv-text-secondary) !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        text-align: right !important;
        overflow-wrap: anywhere !important;
    }
}

@media (max-width: 480px) {
    #inventory-page .inv-table td {
        grid-template-columns:
            110px minmax(0, 1fr) !important;
    }

    #inventory-details-modal .idm-header {
        padding: 12px 13px !important;
    }

    #inventory-details-modal .idm-header-icon {
        display: none !important;
    }

    #inventory-details-modal .idm-body {
        padding: 12px !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #inventory-page *,
    #inventory-page *::before,
    #inventory-page *::after,
    #inventory-details-modal *,
    #inventory-details-modal *::before,
    #inventory-details-modal *::after,
    #opening-inventory-modal *,
    #opening-inventory-modal *::before,
    #opening-inventory-modal *::after {
        transition: none !important;
        scroll-behavior: auto !important;
    }
}
`;

export default function InventoryPage() {
    const {
        token,
    } = useAuth();

    const openingInventoryFormRef =
        useRef<
            HTMLFormElement | null
        >(
            null,
        );

    const openingSupplierRef =
        useRef<
            HTMLButtonElement | null
        >(
            null,
        );

    const searchInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const requestIdRef =
        useRef(
            0,
        );

    const [
        products,
        setProducts,
    ] =
        useState<
            StockProduct[]
        >(
            [],
        );

    const [
        selectedProduct,
        setSelectedProduct,
    ] =
        useState<
            StockProduct | null
        >(
            null,
        );

    const [
        isOpeningInventoryOpen,
        setIsOpeningInventoryOpen,
    ] =
        useState(
            false,
        );

    const [
        openingInventoryForm,
        setOpeningInventoryForm,
    ] =
        useState<OpeningInventoryFormState>(
            newOpeningInventoryForm(),
        );

    const [
        openingSuppliers,
        setOpeningSuppliers,
    ] =
        useState<SupplierOption[]>(
            [],
        );

    const [
        openingProducts,
        setOpeningProducts,
    ] =
        useState<ProductOption[]>(
            [],
        );

    const [
        isOpeningOptionsLoading,
        setIsOpeningOptionsLoading,
    ] =
        useState(
            false,
        );

    const [
        isOpeningInventorySaving,
        setIsOpeningInventorySaving,
    ] =
        useState(
            false,
        );

    const [
        openingInventoryError,
        setOpeningInventoryError,
    ] =
        useState(
            '',
        );

    const [
        openingInventorySuccess,
        setOpeningInventorySuccess,
    ] =
        useState(
            '',
        );

    const [
        pageSuccessMessage,
        setPageSuccessMessage,
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
        appliedSearch,
        setAppliedSearch,
    ] =
        useState(
            '',
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
            10,
        );

    const [
        pagination,
        setPagination,
    ] =
        useState<StockPaginationMeta>(
            initialPagination,
        );

    const [
        isLoading,
        setIsLoading,
    ] =
        useState(
            true,
        );

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState(
            '',
        );

    const visibleStockTotal =
        useMemo(
            () =>
                products.reduce(
                    (
                        total,
                        product,
                    ) =>
                        total
                        + numberValue(
                            product
                                .total_available_quantity,
                        ),
                    0,
                ),
            [
                products,
            ],
        );

    const openingSelectedProduct =
        useMemo(
            () =>
                openingProducts.find(
                    (
                        product,
                    ) =>
                        product.id
                        === Number(
                            openingInventoryForm
                                .product_id,
                        ),
                ) ?? null,
            [
                openingProducts,
                openingInventoryForm
                    .product_id,
            ],
        );

    const openingProductVariants =
        useMemo(
            () =>
                activeVariants(
                    openingSelectedProduct,
                ),
            [
                openingSelectedProduct,
            ],
        );

    const openingSelectedVariant =
        useMemo(
            () =>
                openingProductVariants.find(
                    (
                        variant,
                    ) =>
                        variant.id
                        === Number(
                            openingInventoryForm
                                .product_variant_id,
                        ),
                ) ?? null,
            [
                openingProductVariants,
                openingInventoryForm
                    .product_variant_id,
            ],
        );

    const openingPrimaryUnit =
        openingSelectedVariant
            ?.package_unit
        || openingSelectedProduct
            ?.unit
        || 'Unit';

    const openingIsBagProduct =
        Boolean(
            openingSelectedProduct,
        )
        && !openingSelectedProduct
            ?.has_variants
        && isBagUnit(
            openingSelectedProduct
                ?.unit,
        );

    const openingDualEnabled =
        openingIsBagProduct
        && openingInventoryForm
            .is_dual_unit;

    const openingPhysicalQuantity =
        useMemo(
            () => {
                const mainQuantity =
                    numberValue(
                        openingInventoryForm
                            .available_quantity,
                    );

                if (!openingDualEnabled) {
                    return mainQuantity;
                }

                return (
                    mainQuantity
                    * numberValue(
                        openingInventoryForm
                            .conversion_factor,
                    )
                )
                    + numberValue(
                        openingInventoryForm
                            .loose_quantity,
                    );
            },
            [
                openingDualEnabled,
                openingInventoryForm
                    .available_quantity,
                openingInventoryForm
                    .conversion_factor,
                openingInventoryForm
                    .loose_quantity,
            ],
        );

    const openingCostPerKg =
        openingDualEnabled
            && numberValue(
                openingInventoryForm
                    .conversion_factor,
            ) > 0
            ? (
                numberValue(
                    openingInventoryForm
                        .purchase_cost,
                )
                / numberValue(
                    openingInventoryForm
                        .conversion_factor,
                )
            )
            : 0;

    const openingSupplierSearchOptions =
        useMemo<
            OpeningSearchOption[]
        >(
            () =>
                openingSuppliers.map(
                    (
                        supplier,
                    ) => ({
                        value:
                            String(
                                supplier.id,
                            ),

                        label:
                            supplier.name,

                        secondary:
                            supplier.phone
                                ? `Phone: ${supplier.phone}`
                                : undefined,

                        searchText:
                            `${supplier.name} ${supplier.phone ?? ''} ${supplier.id}`,
                    }),
                ),
            [
                openingSuppliers,
            ],
        );

    const openingProductSearchOptions =
        useMemo<
            OpeningSearchOption[]
        >(
            () =>
                openingProducts.map(
                    (
                        product,
                    ) => {
                        const variantSearch =
                            product
                                .variants
                                .map(
                                    (
                                        variant,
                                    ) =>
                                        [
                                            variant.display_name,
                                            variant.size_value,
                                            variant.size_unit,
                                            variant.package_unit,
                                            variant.sku,
                                            variant.barcode,
                                        ]
                                            .filter(Boolean)
                                            .join(' '),
                                )
                                .join(' ');

                        return {
                            value:
                                String(
                                    product.id,
                                ),

                            label:
                                product.name,

                            secondary:
                                `${product.category?.name ?? 'No category'} • ${product.unit}`
                                + (
                                    product.has_variants
                                        ? ` • ${product.variants.length} variant${product.variants.length === 1 ? '' : 's'}`
                                        : ''
                                ),

                            searchText:
                                `${product.name} ${product.sku ?? ''} ${product.barcode ?? ''} ${product.unit} ${product.category?.name ?? ''} ${variantSearch}`,
                        };
                    },
                ),
            [
                openingProducts,
            ],
        );

    const openingVariantSearchOptions =
        useMemo<
            OpeningSearchOption[]
        >(
            () =>
                openingProductVariants.map(
                    (
                        variant,
                    ) => ({
                        value:
                            String(
                                variant.id,
                            ),

                        label:
                            variant.display_name,

                        secondary:
                            [
                                variant.package_unit,
                                variant.sku
                                    ? `SKU: ${variant.sku}`
                                    : '',
                                variant.barcode
                                    ? `Barcode: ${variant.barcode}`
                                    : '',
                            ]
                                .filter(Boolean)
                                .join(' • '),

                        searchText:
                            `${variant.display_name} ${variant.size_value} ${variant.size_unit} ${variant.package_unit} ${variant.sku ?? ''} ${variant.barcode ?? ''}`,
                    }),
                ),
            [
                openingProductVariants,
            ],
        );

    const loadOpeningInventoryOptions =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsOpeningOptionsLoading(
                    true,
                );

                setOpeningInventoryError(
                    '',
                );

                try {
                    const [
                        supplierResponse,
                        productResponse,
                    ] =
                        await Promise.all([
                            getSupplierOptions(
                                token,
                            ),

                            getProductOptions(
                                token,
                            ),
                        ]);

                    setOpeningSuppliers(
                        supplierResponse.data,
                    );

                    setOpeningProducts(
                        productResponse.data,
                    );
                } catch (error) {
                    setOpeningInventoryError(
                        error
                            instanceof ApiError
                            ? error.message
                            : 'Unable to load supplier and product options.',
                    );
                } finally {
                    setIsOpeningOptionsLoading(
                        false,
                    );
                }
            },
            [
                token,
            ],
        );

    const focusNextOpeningField =
        (
            currentNavKey:
                string,
        ): void => {
            window.setTimeout(
                () => {
                    const form =
                        openingInventoryFormRef
                            .current;

                    if (!form) {
                        return;
                    }

                    const navigable =
                        Array.from(
                            form.querySelectorAll<
                                HTMLElement
                            >(
                                '[data-oim-enter-nav="true"]',
                            ),
                        )
                            .filter(
                                (
                                    element,
                                ) => {
                                    if (
                                        element
                                        instanceof HTMLButtonElement
                                        || element
                                        instanceof HTMLInputElement
                                        || element
                                        instanceof HTMLSelectElement
                                    ) {
                                        if (
                                            element.disabled
                                        ) {
                                            return false;
                                        }
                                    }

                                    return element
                                        .getClientRects()
                                        .length > 0;
                                },
                            );

                    const currentIndex =
                        navigable.findIndex(
                            (
                                element,
                            ) =>
                                element
                                    .dataset
                                    .oimNavKey
                                === currentNavKey,
                        );

                    if (
                        currentIndex < 0
                    ) {
                        return;
                    }

                    const nextElement =
                        navigable[
                        currentIndex
                        + 1
                        ];

                    if (!nextElement) {
                        return;
                    }

                    nextElement.focus({
                        preventScroll:
                            true,
                    });

                    nextElement.scrollIntoView({
                        block:
                            'nearest',

                        inline:
                            'nearest',

                        behavior:
                            'smooth',
                    });

                    if (
                        nextElement
                        instanceof HTMLInputElement
                        && (
                            nextElement.type
                            === 'text'
                            || nextElement.type
                            === 'number'
                        )
                    ) {
                        nextElement.select();
                    }
                },
                0,
            );
        };

    const handleOpeningFormKeyDown =
        (
            event:
                ReactKeyboardEvent<
                    HTMLFormElement
                >,
        ): void => {
            if (
                event.key !== 'Enter'
                || event.defaultPrevented
                || event.metaKey
                || event.ctrlKey
                || event.altKey
            ) {
                return;
            }

            const target =
                event.target;

            if (
                !(target
                    instanceof HTMLElement)
            ) {
                return;
            }

            if (
                target.closest(
                    '.oim-searchable-select',
                )
            ) {
                return;
            }

            const navKey =
                target
                    .dataset
                    .oimNavKey;

            if (!navKey) {
                return;
            }

            /*
             * Keep native Enter behaviour on the final Submit button.
             */
            if (
                target
                instanceof HTMLButtonElement
            ) {
                return;
            }

            event.preventDefault();

            /*
             * Enter toggles Bag/Kg checkbox then advances.
             */
            if (
                target
                instanceof HTMLInputElement
                && target.type
                === 'checkbox'
            ) {
                target.click();
            }

            focusNextOpeningField(
                navKey,
            );
        };

    const openOpeningInventory =
        (): void => {
            setSelectedProduct(
                null,
            );

            setOpeningInventoryForm(
                newOpeningInventoryForm(),
            );

            setOpeningInventoryError(
                '',
            );

            setOpeningInventorySuccess(
                '',
            );

            setPageSuccessMessage(
                '',
            );

            setIsOpeningInventoryOpen(
                true,
            );

            void loadOpeningInventoryOptions();
        };

    const closeOpeningInventory =
        (): void => {
            if (
                isOpeningInventorySaving
            ) {
                return;
            }

            setIsOpeningInventoryOpen(
                false,
            );

            setOpeningInventoryError(
                '',
            );

            setOpeningInventorySuccess(
                '',
            );
        };

    const saveOpeningInventory =
        async (
            keepOpen:
                boolean,
        ): Promise<void> => {
            if (
                !token
                || isOpeningInventorySaving
            ) {
                return;
            }

            const supplierId =
                Number(
                    openingInventoryForm
                        .supplier_id,
                );

            const productId =
                Number(
                    openingInventoryForm
                        .product_id,
                );

            const variantId =
                openingInventoryForm
                    .product_variant_id
                    ? Number(
                        openingInventoryForm
                            .product_variant_id,
                    )
                    : null;

            const purchaseCost =
                Number(
                    openingInventoryForm
                        .purchase_cost,
                );

            const sellingPrice =
                Number(
                    openingInventoryForm
                        .selling_price,
                );

            const mainQuantity =
                Number(
                    openingInventoryForm
                        .available_quantity,
                );

            const conversionFactor =
                Number(
                    openingInventoryForm
                        .conversion_factor,
                );

            const secondarySellingPrice =
                Number(
                    openingInventoryForm
                        .secondary_selling_price,
                );

            const looseQuantity =
                Number(
                    openingInventoryForm
                        .loose_quantity,
                );

            if (
                !Number.isInteger(
                    supplierId,
                )
                || supplierId <= 0
            ) {
                setOpeningInventoryError(
                    'Please select a supplier.',
                );

                return;
            }

            if (
                !Number.isInteger(
                    productId,
                )
                || productId <= 0
            ) {
                setOpeningInventoryError(
                    'Please select a product.',
                );

                return;
            }

            if (
                openingSelectedProduct
                    ?.has_variants
                && (
                    variantId === null
                    || !Number.isInteger(
                        variantId,
                    )
                    || variantId <= 0
                )
            ) {
                setOpeningInventoryError(
                    'Please select a product variant.',
                );

                return;
            }

            if (
                !Number.isFinite(
                    purchaseCost,
                )
                || purchaseCost <= 0
            ) {
                setOpeningInventoryError(
                    'Cost must be greater than zero.',
                );

                return;
            }

            if (
                !Number.isFinite(
                    sellingPrice,
                )
                || sellingPrice <= 0
            ) {
                setOpeningInventoryError(
                    'Selling price must be greater than zero.',
                );

                return;
            }

            if (
                !Number.isFinite(
                    mainQuantity,
                )
                || mainQuantity < 0
            ) {
                setOpeningInventoryError(
                    openingDualEnabled
                        ? 'Full Bag quantity cannot be negative.'
                        : 'Available quantity must be greater than zero.',
                );

                return;
            }

            if (
                !openingDualEnabled
                && mainQuantity <= 0
            ) {
                setOpeningInventoryError(
                    'Available quantity must be greater than zero.',
                );

                return;
            }

            if (openingDualEnabled) {
                if (
                    !Number.isFinite(
                        conversionFactor,
                    )
                    || conversionFactor <= 0
                ) {
                    setOpeningInventoryError(
                        'Weight in one Bag must be greater than zero.',
                    );

                    return;
                }

                if (
                    !Number.isFinite(
                        looseQuantity,
                    )
                    || looseQuantity < 0
                ) {
                    setOpeningInventoryError(
                        'Loose Kg quantity cannot be negative.',
                    );

                    return;
                }

                if (
                    mainQuantity <= 0
                    && looseQuantity <= 0
                ) {
                    setOpeningInventoryError(
                        'Enter at least one full Bag or a loose Kg quantity greater than zero.',
                    );

                    return;
                }

                if (
                    !Number.isFinite(
                        secondarySellingPrice,
                    )
                    || secondarySellingPrice <= 0
                ) {
                    setOpeningInventoryError(
                        'Selling price for 1 Kg must be greater than zero.',
                    );

                    return;
                }
            }

            const payload:
                OpeningInventoryInput = {
                supplier_id:
                    supplierId,

                product_id:
                    productId,

                product_variant_id:
                    openingSelectedProduct
                        ?.has_variants
                        ? variantId
                        : null,

                purchase_cost:
                    purchaseCost,

                selling_price:
                    sellingPrice,

                available_quantity:
                    mainQuantity,

                is_dual_unit:
                    openingDualEnabled,

                conversion_factor:
                    openingDualEnabled
                        ? conversionFactor
                        : null,

                secondary_unit:
                    openingDualEnabled
                        ? 'Kg'
                        : null,

                secondary_selling_price:
                    openingDualEnabled
                        ? secondarySellingPrice
                        : null,

                loose_quantity:
                    openingDualEnabled
                        ? looseQuantity
                        : 0,
            };

            setIsOpeningInventorySaving(
                true,
            );

            setOpeningInventoryError(
                '',
            );

            setOpeningInventorySuccess(
                '',
            );

            try {
                const response =
                    await createOpeningInventory(
                        token,
                        payload,
                    );

                const created =
                    response.data;

                const variantLabel =
                    created.variant
                        ? ` - ${created.variant.display_name}`
                        : '';

                const quantityLabel =
                    created.is_dual_unit
                        ? (
                            `${formatQuantity(
                                created.entered_quantity,
                            )} ${created.primary_unit}`
                            + (
                                created.loose_quantity > 0
                                    ? ` + ${formatQuantity(
                                        created.loose_quantity,
                                    )} Kg loose`
                                    : ''
                            )
                            + ` (${formatQuantity(
                                created.available_quantity,
                            )} Kg physical stock)`
                        )
                        : (
                            `${formatQuantity(
                                created.entered_quantity,
                            )} ${created.primary_unit}`
                        );

                const successText =
                    `${created.product.name}${variantLabel}: `
                    + `${quantityLabel} opening stock added successfully.`;

                await loadStock();

                if (keepOpen) {
                    setOpeningInventorySuccess(
                        successText,
                    );

                    setOpeningInventoryForm(
                        (
                            current,
                        ) =>
                            newOpeningInventoryForm(
                                current
                                    .supplier_id,
                            ),
                    );

                    window.setTimeout(
                        () => {
                            openingSupplierRef
                                .current
                                ?.focus();
                        },
                        40,
                    );
                } else {
                    setPageSuccessMessage(
                        successText,
                    );

                    setIsOpeningInventoryOpen(
                        false,
                    );
                }
            } catch (error) {
                setOpeningInventoryError(
                    error
                        instanceof ApiError
                        ? error.message
                        : 'Unable to add opening inventory.',
                );
            } finally {
                setIsOpeningInventorySaving(
                    false,
                );
            }
        };


    const loadStock =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                const requestId =
                    requestIdRef.current
                    + 1;

                requestIdRef.current =
                    requestId;

                setIsLoading(
                    true,
                );

                setErrorMessage(
                    '',
                );

                try {
                    const response =
                        await getStockProducts(
                            token,
                            {
                                page,
                                perPage,
                                search:
                                    appliedSearch,
                            },
                        );

                    if (
                        requestIdRef.current
                        !== requestId
                    ) {
                        return;
                    }

                    setProducts(
                        response.data,
                    );

                    setPagination(
                        response.meta,
                    );
                } catch (error) {
                    if (
                        requestIdRef.current
                        !== requestId
                    ) {
                        return;
                    }

                    setProducts(
                        [],
                    );

                    setErrorMessage(
                        error
                            instanceof ApiError
                            ? error.message
                            : 'Unable to load inventory.',
                    );
                } finally {
                    if (
                        requestIdRef.current
                        === requestId
                    ) {
                        setIsLoading(
                            false,
                        );
                    }
                }
            },
            [
                token,
                page,
                perPage,
                appliedSearch,
            ],
        );

    useEffect(
        () => {
            void loadStock();
        },
        [
            loadStock,
        ],
    );

    useEffect(
        () => {
            const timeout =
                window.setTimeout(
                    () => {
                        setPage(
                            1,
                        );

                        setAppliedSearch(
                            search.trim(),
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
            search,
        ],
    );

    /*
     * Close details when the visible page changes and the
     * selected product is no longer part of the loaded data.
     */
    useEffect(
        () => {
            if (
                selectedProduct
                && !products.some(
                    (
                        product,
                    ) =>
                        product.id
                        === selectedProduct.id,
                )
            ) {
                setSelectedProduct(
                    null,
                );
            }
        },
        [
            products,
            selectedProduct,
        ],
    );

    /*
     * Modal body lock + Escape close.
     */
    useEffect(
        () => {
            if (
                !selectedProduct
            ) {
                return;
            }

            const previousOverflow =
                document.body
                    .style
                    .overflow;

            document.body
                .style
                .overflow =
                'hidden';

            const handleKeyDown =
                (
                    event:
                        KeyboardEvent,
                ): void => {
                    if (
                        event.key
                        === 'Escape'
                    ) {
                        event.preventDefault();

                        setSelectedProduct(
                            null,
                        );
                    }
                };

            window.addEventListener(
                'keydown',
                handleKeyDown,
            );

            return () => {
                document.body
                    .style
                    .overflow =
                    previousOverflow;

                window.removeEventListener(
                    'keydown',
                    handleKeyDown,
                );
            };
        },
        [
            selectedProduct,
        ],
    );

    useEffect(
        () => {
            if (
                !isOpeningInventoryOpen
            ) {
                return;
            }

            const previousOverflow =
                document.body
                    .style
                    .overflow;

            const previouslyFocused =
                document.activeElement
                    instanceof HTMLElement
                    ? document.activeElement
                    : null;

            document.body
                .style
                .overflow =
                'hidden';

            const focusTimer =
                window.setTimeout(
                    () => {
                        openingSupplierRef
                            .current
                            ?.focus();
                    },
                    80,
                );

            const handleKeyDown =
                (
                    event:
                        KeyboardEvent,
                ): void => {
                    if (
                        event.key
                        === 'Escape'
                        && !isOpeningInventorySaving
                    ) {
                        event.preventDefault();

                        setIsOpeningInventoryOpen(
                            false,
                        );
                    }
                };

            window.addEventListener(
                'keydown',
                handleKeyDown,
            );

            return () => {
                window.clearTimeout(
                    focusTimer,
                );

                document.body
                    .style
                    .overflow =
                    previousOverflow;

                window.removeEventListener(
                    'keydown',
                    handleKeyDown,
                );

                previouslyFocused
                    ?.focus();
            };
        },
        [
            isOpeningInventoryOpen,
            isOpeningInventorySaving,
        ],
    );

    const clearSearch =
        (): void => {
            setSearch(
                '',
            );

            setAppliedSearch(
                '',
            );

            setPage(
                1,
            );

            searchInputRef
                .current
                ?.focus();
        };

    const openingInventoryModal =
        isOpeningInventoryOpen
            && typeof document
            !== 'undefined'
            ? createPortal(
                <div id="opening-inventory-modal">
                    <style>
                        {inventoryStyles}
                    </style>

                    <div
                        className="oim-backdrop"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (
                                event.target
                                === event.currentTarget
                                && !isOpeningInventorySaving
                            ) {
                                closeOpeningInventory();
                            }
                        }}
                    >
                        <form
                            ref={
                                openingInventoryFormRef
                            }
                            className="oim-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="opening-inventory-title"
                            onKeyDown={
                                handleOpeningFormKeyDown
                            }
                            onSubmit={(event) => {
                                event.preventDefault();

                                void saveOpeningInventory(
                                    false,
                                );
                            }}
                        >
                            <header className="oim-header">
                                <div>
                                    <span className="oim-kicker">
                                        Existing Stock Migration
                                    </span>

                                    <h2
                                        id="opening-inventory-title"
                                        className="oim-title"
                                    >
                                        Add Opening Inventory
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    className="oim-close"
                                    aria-label="Close opening inventory"
                                    disabled={
                                        isOpeningInventorySaving
                                    }
                                    onClick={
                                        closeOpeningInventory
                                    }
                                >
                                    <Icon name="close" />
                                </button>
                            </header>

                            <div className="oim-body">
                                {/* <div className="oim-info">
                                    Add stock that already exists in your shop.
                                    No purchase, supplier due, supplier payment,
                                    expense or cash transaction is created.
                                    Cost is still used for inventory valuation
                                    and future sale profit.
                                </div> */}

                                {openingInventoryError && (
                                    <div className="oim-alert error">
                                        {openingInventoryError}
                                    </div>
                                )}

                                {openingInventorySuccess && (
                                    <div className="oim-alert success">
                                        {openingInventorySuccess}
                                    </div>
                                )}

                                <div className="oim-grid">
                                    {/* SUPPLIER */}

                                    <div className="oim-field full">
                                        <span className="oim-label">
                                            Supplier
                                            {' '}
                                            <span className="oim-required">
                                                *
                                            </span>
                                        </span>

                                        <OpeningSearchableSelect
                                            triggerRef={
                                                openingSupplierRef
                                            }
                                            value={
                                                openingInventoryForm
                                                    .supplier_id
                                            }
                                            options={
                                                openingSupplierSearchOptions
                                            }
                                            placeholder="Select a supplier"
                                            searchPlaceholder="Search supplier name or phone..."
                                            emptyMessage="No supplier matches your search."
                                            disabled={
                                                isOpeningOptionsLoading
                                                || isOpeningInventorySaving
                                            }
                                            ariaLabel="Select supplier"
                                            navKey="opening-supplier"
                                            onChange={(
                                                supplierId,
                                            ) => {
                                                setOpeningInventoryForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,

                                                        supplier_id:
                                                            supplierId,
                                                    }),
                                                );

                                                setOpeningInventoryError(
                                                    '',
                                                );
                                            }}
                                            onAdvance={
                                                focusNextOpeningField
                                            }
                                        />
                                    </div>

                                    {/* PRODUCT */}

                                    <div className="oim-field full">
                                        <span className="oim-label">
                                            Product
                                            {' '}
                                            <span className="oim-required">
                                                *
                                            </span>
                                        </span>

                                        <OpeningSearchableSelect
                                            value={
                                                openingInventoryForm
                                                    .product_id
                                            }
                                            options={
                                                openingProductSearchOptions
                                            }
                                            placeholder="Select a product"
                                            searchPlaceholder="Search product, SKU, barcode, category or unit..."
                                            emptyMessage="No product matches your search."
                                            disabled={
                                                isOpeningOptionsLoading
                                                || isOpeningInventorySaving
                                            }
                                            ariaLabel="Select product"
                                            navKey="opening-product"
                                            onChange={(
                                                productId,
                                            ) => {
                                                const nextProduct =
                                                    openingProducts.find(
                                                        (
                                                            product,
                                                        ) =>
                                                            String(
                                                                product.id,
                                                            )
                                                            === productId,
                                                    )
                                                    ?? null;

                                                setOpeningInventoryForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,

                                                        product_id:
                                                            productId,

                                                        product_variant_id:
                                                            '',

                                                        purchase_cost:
                                                            '',

                                                        selling_price:
                                                            '',

                                                        available_quantity:
                                                            '',

                                                        is_dual_unit:
                                                            false,

                                                        conversion_factor:
                                                            isBagUnit(
                                                                nextProduct
                                                                    ?.unit,
                                                            )
                                                                ? '50'
                                                                : '1',

                                                        secondary_unit:
                                                            'Kg',

                                                        secondary_selling_price:
                                                            '',

                                                        loose_quantity:
                                                            '0',
                                                    }),
                                                );

                                                setOpeningInventoryError(
                                                    '',
                                                );
                                            }}
                                            onAdvance={
                                                focusNextOpeningField
                                            }
                                        />
                                    </div>

                                    {/* VARIANT */}

                                    {openingSelectedProduct
                                        ?.has_variants && (
                                            <div className="oim-field full">
                                                <span className="oim-label">
                                                    Variant
                                                    {' '}
                                                    <span className="oim-required">
                                                        *
                                                    </span>
                                                </span>

                                                <OpeningSearchableSelect
                                                    value={
                                                        openingInventoryForm
                                                            .product_variant_id
                                                    }
                                                    options={
                                                        openingVariantSearchOptions
                                                    }
                                                    placeholder="Select package variant"
                                                    searchPlaceholder="Search size, SKU or barcode..."
                                                    emptyMessage="No variant matches your search."
                                                    disabled={
                                                        isOpeningInventorySaving
                                                    }
                                                    ariaLabel="Select product variant"
                                                    navKey="opening-variant"
                                                    onChange={(
                                                        variantId,
                                                    ) => {
                                                        setOpeningInventoryForm(
                                                            (
                                                                current,
                                                            ) => ({
                                                                ...current,

                                                                product_variant_id:
                                                                    variantId,

                                                                purchase_cost:
                                                                    '',

                                                                selling_price:
                                                                    '',
                                                            }),
                                                        );

                                                        setOpeningInventoryError(
                                                            '',
                                                        );
                                                    }}
                                                    onAdvance={
                                                        focusNextOpeningField
                                                    }
                                                />
                                            </div>
                                        )}

                                    {/* QUANTITY */}

                                    <label className="oim-field full">
                                        <span className="oim-label">
                                            {openingDualEnabled
                                                ? 'Available Full Bag Quantity'
                                                : 'Available Quantity'}
                                            {' '}
                                            (
                                            {openingPrimaryUnit}
                                            )
                                            {' '}
                                            <span className="oim-required">
                                                *
                                            </span>
                                        </span>

                                        <input
                                            type="number"
                                            min={
                                                openingDualEnabled
                                                    ? '0'
                                                    : '0.001'
                                            }
                                            step="0.001"
                                            inputMode="decimal"
                                            className="oim-input"
                                            value={
                                                openingInventoryForm
                                                    .available_quantity
                                            }
                                            disabled={
                                                isOpeningInventorySaving
                                                || Boolean(
                                                    openingSelectedProduct
                                                        ?.has_variants
                                                    && !openingSelectedVariant,
                                                )
                                            }
                                            placeholder="0"
                                            data-oim-enter-nav="true"
                                            data-oim-nav-key="opening-quantity"
                                            onChange={(event) => {
                                                setOpeningInventoryForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,

                                                        available_quantity:
                                                            event
                                                                .target
                                                                .value,
                                                    }),
                                                );
                                            }}
                                        />

                                        {openingDualEnabled && (
                                            <small className="oim-help">
                                                Enter only the number of full
                                                Bags here. Existing loose Kg
                                                stock is entered separately
                                                below.
                                            </small>
                                        )}
                                    </label>

                                    {/* COST */}

                                    <label className="oim-field">
                                        <span className="oim-label">
                                            Cost / 1
                                            {' '}
                                            {openingPrimaryUnit}
                                            {' '}
                                            <span className="oim-required">
                                                *
                                            </span>
                                        </span>

                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            inputMode="decimal"
                                            className="oim-input"
                                            value={
                                                openingInventoryForm
                                                    .purchase_cost
                                            }
                                            disabled={
                                                isOpeningInventorySaving
                                                || Boolean(
                                                    openingSelectedProduct
                                                        ?.has_variants
                                                    && !openingSelectedVariant,
                                                )
                                            }
                                            placeholder="0.00"
                                            data-oim-enter-nav="true"
                                            data-oim-nav-key="opening-cost"
                                            onChange={(event) => {
                                                setOpeningInventoryForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,

                                                        purchase_cost:
                                                            event
                                                                .target
                                                                .value,
                                                    }),
                                                );
                                            }}
                                        />
                                    </label>

                                    {/* MAIN SELLING PRICE */}

                                    <label className="oim-field">
                                        <span className="oim-label">
                                            Selling Price / 1
                                            {' '}
                                            {openingPrimaryUnit}
                                            {' '}
                                            <span className="oim-required">
                                                *
                                            </span>
                                        </span>

                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            inputMode="decimal"
                                            className="oim-input"
                                            value={
                                                openingInventoryForm
                                                    .selling_price
                                            }
                                            disabled={
                                                isOpeningInventorySaving
                                                || Boolean(
                                                    openingSelectedProduct
                                                        ?.has_variants
                                                    && !openingSelectedVariant,
                                                )
                                            }
                                            placeholder="0.00"
                                            data-oim-enter-nav="true"
                                            data-oim-nav-key="opening-selling-price"
                                            onChange={(event) => {
                                                setOpeningInventoryForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,

                                                        selling_price:
                                                            event
                                                                .target
                                                                .value,
                                                    }),
                                                );
                                            }}
                                        />
                                    </label>

                                    {/* BAG + KG */}

                                    {openingIsBagProduct && (
                                        <section className="oim-dual-card">
                                            <header className="oim-dual-header">
                                                <div>
                                                    <strong className="oim-dual-title">
                                                        Full Bag + Loose Kg Selling
                                                    </strong>

                                                    <div className="oim-help">
                                                        Same Bag-to-Kg model
                                                        used by Purchasing.
                                                    </div>
                                                </div>

                                                <label className="oim-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            openingInventoryForm
                                                                .is_dual_unit
                                                        }
                                                        disabled={
                                                            isOpeningInventorySaving
                                                        }
                                                        data-oim-enter-nav="true"
                                                        data-oim-nav-key="opening-dual-unit"
                                                        onChange={(event) => {
                                                            const enabled =
                                                                event
                                                                    .target
                                                                    .checked;

                                                            setOpeningInventoryForm(
                                                                (
                                                                    current,
                                                                ) => ({
                                                                    ...current,

                                                                    is_dual_unit:
                                                                        enabled,

                                                                    conversion_factor:
                                                                        enabled
                                                                            && !current
                                                                                .conversion_factor
                                                                            ? '50'
                                                                            : current
                                                                                .conversion_factor,

                                                                    secondary_unit:
                                                                        'Kg',

                                                                    loose_quantity:
                                                                        enabled
                                                                            ? (
                                                                                current
                                                                                    .loose_quantity
                                                                                || '0'
                                                                            )
                                                                            : '0',

                                                                    secondary_selling_price:
                                                                        enabled
                                                                            ? current
                                                                                .secondary_selling_price
                                                                            : '',
                                                                }),
                                                            );
                                                        }}
                                                    />

                                                    Enable Loose Kg Sales
                                                </label>
                                            </header>

                                            {openingDualEnabled && (
                                                <>
                                                    <div className="oim-dual-grid">
                                                        <label className="oim-field">
                                                            <span className="oim-label">
                                                                Weight in One Bag
                                                                {' '}
                                                                <span className="oim-required">
                                                                    *
                                                                </span>
                                                            </span>

                                                            <input
                                                                type="number"
                                                                min="0.001"
                                                                step="0.001"
                                                                inputMode="decimal"
                                                                className="oim-input"
                                                                value={
                                                                    openingInventoryForm
                                                                        .conversion_factor
                                                                }
                                                                disabled={
                                                                    isOpeningInventorySaving
                                                                }
                                                                placeholder="Example: 50"
                                                                data-oim-enter-nav="true"
                                                                data-oim-nav-key="opening-conversion-factor"
                                                                onChange={(event) => {
                                                                    setOpeningInventoryForm(
                                                                        (
                                                                            current,
                                                                        ) => ({
                                                                            ...current,

                                                                            conversion_factor:
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                        }),
                                                                    );
                                                                }}
                                                            />
                                                        </label>

                                                        <label className="oim-field">
                                                            <span className="oim-label">
                                                                Loose Selling Unit
                                                            </span>

                                                            <select
                                                                className="oim-select"
                                                                value="Kg"
                                                                disabled
                                                            >
                                                                <option value="Kg">
                                                                    Kilogram — Kg
                                                                </option>
                                                            </select>
                                                        </label>

                                                        <label className="oim-field">
                                                            <span className="oim-label">
                                                                Existing Loose Quantity
                                                                {' '}
                                                                (Kg)
                                                            </span>

                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.001"
                                                                inputMode="decimal"
                                                                className="oim-input"
                                                                value={
                                                                    openingInventoryForm
                                                                        .loose_quantity
                                                                }
                                                                disabled={
                                                                    isOpeningInventorySaving
                                                                }
                                                                placeholder="0"
                                                                data-oim-enter-nav="true"
                                                                data-oim-nav-key="opening-loose-quantity"
                                                                onChange={(event) => {
                                                                    setOpeningInventoryForm(
                                                                        (
                                                                            current,
                                                                        ) => ({
                                                                            ...current,

                                                                            loose_quantity:
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                        }),
                                                                    );
                                                                }}
                                                            />

                                                            <small className="oim-help">
                                                                Example:
                                                                3 full Bags
                                                                + 12 Kg loose.
                                                            </small>
                                                        </label>

                                                        <label className="oim-field">
                                                            <span className="oim-label">
                                                                Selling Price for 1 Kg
                                                                {' '}
                                                                <span className="oim-required">
                                                                    *
                                                                </span>
                                                            </span>

                                                            <input
                                                                type="number"
                                                                min="0.01"
                                                                step="0.01"
                                                                inputMode="decimal"
                                                                className="oim-input"
                                                                value={
                                                                    openingInventoryForm
                                                                        .secondary_selling_price
                                                                }
                                                                disabled={
                                                                    isOpeningInventorySaving
                                                                }
                                                                placeholder="0.00"
                                                                data-oim-enter-nav="true"
                                                                data-oim-nav-key="opening-secondary-selling-price"
                                                                onChange={(event) => {
                                                                    setOpeningInventoryForm(
                                                                        (
                                                                            current,
                                                                        ) => ({
                                                                            ...current,

                                                                            secondary_selling_price:
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                        }),
                                                                    );
                                                                }}
                                                            />
                                                        </label>
                                                    </div>

                                                    <div className="oim-dual-preview">
                                                        <div>
                                                            <span>
                                                                Physical Stock
                                                            </span>

                                                            <strong>
                                                                {formatQuantity(
                                                                    openingPhysicalQuantity,
                                                                )}
                                                                {' '}
                                                                Kg
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>
                                                                Cost / Kg
                                                            </span>

                                                            <strong>
                                                                {currencyFormatter.format(
                                                                    Math.max(
                                                                        0,
                                                                        openingCostPerKg,
                                                                    ),
                                                                )}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>
                                                                Profit / Bag
                                                            </span>

                                                            <strong>
                                                                {currencyFormatter.format(
                                                                    numberValue(
                                                                        openingInventoryForm
                                                                            .selling_price,
                                                                    )
                                                                    - numberValue(
                                                                        openingInventoryForm
                                                                            .purchase_cost,
                                                                    ),
                                                                )}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>
                                                                Profit / Loose Kg
                                                            </span>

                                                            <strong>
                                                                {currencyFormatter.format(
                                                                    numberValue(
                                                                        openingInventoryForm
                                                                            .secondary_selling_price,
                                                                    )
                                                                    - openingCostPerKg,
                                                                )}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </section>
                                    )}

                                    {/* SUMMARY */}

                                    <div className="oim-preview">
                                        <div className="oim-preview-item">
                                            <span>
                                                Product
                                            </span>

                                            <strong>
                                                {openingSelectedProduct
                                                    ?.name
                                                    ?? 'Not selected'}
                                            </strong>
                                        </div>

                                        <div className="oim-preview-item">
                                            <span>
                                                Variant
                                            </span>

                                            <strong>
                                                {openingSelectedProduct
                                                    ?.has_variants
                                                    ? (
                                                        openingSelectedVariant
                                                            ?.display_name
                                                        ?? 'Not selected'
                                                    )
                                                    : 'Standard'}
                                            </strong>
                                        </div>

                                        <div className="oim-preview-item">
                                            <span>
                                                Stored Stock
                                            </span>

                                            <strong>
                                                {openingDualEnabled
                                                    ? (
                                                        `${formatQuantity(
                                                            openingPhysicalQuantity,
                                                        )} Kg`
                                                    )
                                                    : (
                                                        `${formatQuantity(
                                                            openingInventoryForm
                                                                .available_quantity,
                                                        )} ${openingPrimaryUnit}`
                                                    )}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <footer className="oim-footer">
                                {/* <span className="oim-keyboard-note">
                                    Keyboard: Enter = next field • searchable
                                    lists use ↑ ↓ + Enter • Esc = close
                                </span> */}

                                <button
                                    type="button"
                                    className="oim-button"
                                    disabled={
                                        isOpeningInventorySaving
                                    }
                                    onClick={
                                        closeOpeningInventory
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="oim-button"
                                    disabled={
                                        isOpeningInventorySaving
                                        || isOpeningOptionsLoading
                                    }
                                    onClick={() => {
                                        void saveOpeningInventory(
                                            true,
                                        );
                                    }}
                                >
                                    {isOpeningInventorySaving
                                        ? 'Saving...'
                                        : 'Save & Add Another'}
                                </button>

                                <button
                                    type="submit"
                                    className="oim-button primary"
                                    disabled={
                                        isOpeningInventorySaving
                                        || isOpeningOptionsLoading
                                    }
                                    data-oim-enter-nav="true"
                                    data-oim-nav-key="opening-submit"
                                >
                                    {isOpeningInventorySaving
                                        ? 'Saving...'
                                        : 'Save Opening Stock'}
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>,
                document.body,
            )
            : null;

    const detailsModal =
        selectedProduct
            && typeof document
            !== 'undefined'
            ? createPortal(
                <div id="inventory-details-modal">
                    <style>
                        {inventoryStyles}
                    </style>

                    <div
                        className="idm-backdrop"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (
                                event.target
                                === event.currentTarget
                            ) {
                                setSelectedProduct(
                                    null,
                                );
                            }
                        }}
                    >
                        <section
                            className="idm-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="inventory-details-title"
                        >
                            <header className="idm-header">
                                <div className="idm-header-main">
                                    <span className="idm-header-icon">
                                        <Icon name="box" />
                                    </span>

                                    <div>
                                        <span className="idm-kicker">
                                            Inventory Details
                                        </span>

                                        <h2
                                            id="inventory-details-title"
                                            className="idm-title"
                                            title={
                                                selectedProduct.name
                                            }
                                        >
                                            {selectedProduct.name}
                                        </h2>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="idm-close"
                                    aria-label="Close inventory details"
                                    onClick={() => {
                                        setSelectedProduct(
                                            null,
                                        );
                                    }}
                                >
                                    <Icon name="close" />
                                </button>
                            </header>

                            <div className="idm-body">
                                <div className="idm-overview">
                                    <div className="idm-overview-card">
                                        <span>
                                            Product
                                        </span>

                                        <strong>
                                            {selectedProduct.name}
                                        </strong>

                                        <small>
                                            {selectedProduct.category?.name
                                                ?? 'General'}
                                            {' • '}
                                            {selectedProduct.unit}
                                        </small>
                                    </div>

                                    <div className="idm-overview-card stock">
                                        <span>
                                            Total Available Stock
                                        </span>

                                        <strong>
                                            {formatQuantity(
                                                selectedProduct
                                                    .total_available_quantity,
                                            )}
                                            {' '}
                                            {selectedProduct.unit}
                                        </strong>
                                    </div>

                                    <div className="idm-overview-card options">
                                        <span>
                                            Price Options
                                        </span>

                                        <strong>
                                            {selectedProduct
                                                .price_options
                                                .length}
                                        </strong>
                                    </div>
                                </div>

                                <section className="idm-section">
                                    <header className="idm-section-header">
                                        <div className="idm-section-heading">
                                            <Icon name="layers" />

                                            <h3 className="idm-section-title">
                                                Price and Batch Details
                                            </h3>
                                        </div>

                                        <span className="idm-section-count">
                                            {selectedProduct
                                                .price_options
                                                .length}
                                            {' '}

                                            {selectedProduct
                                                .price_options
                                                .length
                                                === 1
                                                ? 'price option'
                                                : 'price options'}
                                        </span>
                                    </header>

                                    {selectedProduct
                                        .price_options
                                        .length
                                        === 0 ? (
                                        <div className="idm-empty">
                                            No price or batch information
                                            is available for this product.
                                        </div>
                                    ) : (
                                        <div className="idm-price-list">
                                            {selectedProduct
                                                .price_options
                                                .map(
                                                    (
                                                        priceOption,
                                                        priceIndex,
                                                    ) => (
                                                        <article
                                                            key={
                                                                `${priceOption.selling_price}-${priceIndex}`
                                                            }
                                                            className="idm-price-card"
                                                        >
                                                            <div className="idm-price-summary">
                                                                <div className="idm-price-stat">
                                                                    <span>
                                                                        Selling Price
                                                                    </span>

                                                                    <strong>
                                                                        {currencyFormatter.format(
                                                                            numberValue(
                                                                                priceOption
                                                                                    .selling_price,
                                                                            ),
                                                                        )}
                                                                    </strong>
                                                                </div>

                                                                <div className="idm-price-stat stock">
                                                                    <span>
                                                                        Available Stock
                                                                    </span>

                                                                    <strong>
                                                                        {formatQuantity(
                                                                            priceOption
                                                                                .available_quantity,
                                                                        )}
                                                                        {' '}
                                                                        {selectedProduct.unit}
                                                                    </strong>
                                                                </div>
                                                            </div>

                                                            {priceOption
                                                                .batches
                                                                .length
                                                                === 0 ? (
                                                                <div className="idm-empty">
                                                                    No active batches
                                                                    are available for
                                                                    this price option.
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="idm-batch-wrap">
                                                                        <table className="idm-batch-table">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th>
                                                                                        Stock Reference
                                                                                    </th>

                                                                                    <th>
                                                                                        Available
                                                                                    </th>

                                                                                    <th>
                                                                                        Expiry Date
                                                                                    </th>
                                                                                </tr>
                                                                            </thead>

                                                                            <tbody>
                                                                                {priceOption
                                                                                    .batches
                                                                                    .map(
                                                                                        (
                                                                                            batch,
                                                                                        ) => {
                                                                                            const status =
                                                                                                expiryStatus(
                                                                                                    batch
                                                                                                        .expiry_date,
                                                                                                );

                                                                                            return (
                                                                                                <tr
                                                                                                    key={
                                                                                                        batch.id
                                                                                                    }
                                                                                                >
                                                                                                    <td>
                                                                                                        <span className="idm-batch-reference">
                                                                                                            <Icon name="tag" />

                                                                                                            <strong
                                                                                                                title={
                                                                                                                    batch.batch_number
                                                                                                                    || batch.batch_code
                                                                                                                    || `Stock #${batch.id}`
                                                                                                                }
                                                                                                            >
                                                                                                                {batch.batch_number
                                                                                                                    || batch.batch_code
                                                                                                                    || `Stock #${batch.id}`}
                                                                                                            </strong>
                                                                                                        </span>
                                                                                                    </td>

                                                                                                    <td className="idm-quantity">
                                                                                                        {formatQuantity(
                                                                                                            batch
                                                                                                                .available_quantity,
                                                                                                        )}
                                                                                                        {' '}
                                                                                                        {selectedProduct.unit}
                                                                                                    </td>

                                                                                                    <td>
                                                                                                        <span
                                                                                                            className={
                                                                                                                `idm-expiry ${status}`
                                                                                                            }
                                                                                                        >
                                                                                                            <Icon name="calendar" />

                                                                                                            {formatDate(
                                                                                                                batch
                                                                                                                    .expiry_date,
                                                                                                            )}
                                                                                                        </span>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            );
                                                                                        },
                                                                                    )}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>

                                                                    <div className="idm-mobile-batches">
                                                                        {priceOption
                                                                            .batches
                                                                            .map(
                                                                                (
                                                                                    batch,
                                                                                ) => (
                                                                                    <article
                                                                                        key={
                                                                                            batch.id
                                                                                        }
                                                                                        className="idm-mobile-batch"
                                                                                    >
                                                                                        <div className="idm-mobile-batch-row">
                                                                                            <span>
                                                                                                Stock Reference
                                                                                            </span>

                                                                                            <strong>
                                                                                                {batch.batch_number
                                                                                                    || batch.batch_code
                                                                                                    || `Stock #${batch.id}`}
                                                                                            </strong>
                                                                                        </div>

                                                                                        <div className="idm-mobile-batch-row">
                                                                                            <span>
                                                                                                Available
                                                                                            </span>

                                                                                            <strong>
                                                                                                {formatQuantity(
                                                                                                    batch
                                                                                                        .available_quantity,
                                                                                                )}
                                                                                                {' '}
                                                                                                {selectedProduct.unit}
                                                                                            </strong>
                                                                                        </div>

                                                                                        <div className="idm-mobile-batch-row">
                                                                                            <span>
                                                                                                Expiry Date
                                                                                            </span>

                                                                                            <strong>
                                                                                                {formatDate(
                                                                                                    batch
                                                                                                        .expiry_date,
                                                                                                )}
                                                                                            </strong>
                                                                                        </div>
                                                                                    </article>
                                                                                ),
                                                                            )}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </article>
                                                    ),
                                                )}
                                        </div>
                                    )}
                                </section>
                            </div>

                            <footer className="idm-footer">
                                <button
                                    type="button"
                                    className="idm-footer-button"
                                    onClick={() => {
                                        setSelectedProduct(
                                            null,
                                        );
                                    }}
                                >
                                    Close
                                </button>
                            </footer>
                        </section>
                    </div>
                </div>,
                document.body,
            )
            : null;

    return (
        <>
            <div id="inventory-page">
                <style>
                    {inventoryStyles}
                </style>

                <header className="inv-header">
                    <div className="inv-header-copy">
                        <span className="inv-kicker">
                            Stock Management
                        </span>

                        <h1 className="inv-title">
                            Inventory Overview
                        </h1>

                        <p className="inv-subtitle">
                            Review available quantities,
                            selling prices, stock batches
                            and expiry dates.
                        </p>
                    </div>

                    <div className="inv-header-meta">
                        <button
                            type="button"
                            className="inv-opening-button"
                            onClick={
                                openOpeningInventory
                            }
                        >
                            <Icon name="plus" />

                            Add Opening Inventory
                        </button>

                        <span className="inv-total-badge">
                            <Icon name="box" />

                            {pagination.total}
                            {' '}

                            {pagination.total
                                === 1
                                ? 'Product'
                                : 'Products'}
                        </span>
                    </div>
                </header>

                {pageSuccessMessage && (
                    <div
                        className="inv-success"
                        role="status"
                    >
                        {pageSuccessMessage}
                    </div>
                )}

                {errorMessage && (
                    <div
                        className="inv-alert"
                        role="alert"
                    >
                        <Icon name="alert" />

                        <span className="inv-alert-text">
                            {errorMessage}
                        </span>

                        <button
                            type="button"
                            className="inv-retry"
                            onClick={() => {
                                void loadStock();
                            }}
                        >
                            <Icon name="refresh" />

                            Retry
                        </button>
                    </div>
                )}

                <section className="inv-panel">
                    <div className="inv-toolbar">
                        <label className="inv-field">
                            <span className="inv-label">
                                Search Inventory
                            </span>

                            <span className="inv-search-wrapper">
                                <span
                                    className="inv-search-icon"
                                    aria-hidden="true"
                                >
                                    <Icon name="search" />
                                </span>

                                <input
                                    ref={
                                        searchInputRef
                                    }
                                    type="search"
                                    className="inv-search-input"
                                    value={
                                        search
                                    }
                                    autoComplete="off"
                                    placeholder="Search by product name"
                                    aria-label="Search inventory"
                                    onChange={(event) => {
                                        setSearch(
                                            event.target.value,
                                        );
                                    }}
                                />

                                {search && (
                                    <button
                                        type="button"
                                        className="inv-clear-search"
                                        aria-label="Clear inventory search"
                                        onClick={
                                            clearSearch
                                        }
                                    >
                                        <Icon name="close" />
                                    </button>
                                )}
                            </span>
                        </label>

                        <label className="inv-page-size-field">
                            <span className="inv-label">
                                Rows per page
                            </span>

                            <select
                                className="inv-page-size-select"
                                value={
                                    perPage
                                }
                                onChange={(event) => {
                                    setPage(
                                        1,
                                    );

                                    setPerPage(
                                        Number(
                                            event
                                                .target
                                                .value,
                                        ),
                                    );
                                }}
                            >
                                <option value={10}>
                                    10
                                </option>

                                <option value={20}>
                                    20
                                </option>

                                <option value={50}>
                                    50
                                </option>
                            </select>
                        </label>
                    </div>

                    <div className="inv-table-container">
                        <table className="inv-table">
                            <thead>
                                <tr>
                                    <th className="inv-col-product">
                                        Product
                                    </th>

                                    <th className="inv-col-category">
                                        Category
                                    </th>

                                    <th className="inv-col-stock">
                                        Available Stock
                                    </th>

                                    <th className="inv-col-options">
                                        Price Options
                                    </th>

                                    <th className="inv-col-action">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td
                                            colSpan={
                                                5
                                            }
                                            className="inv-table-state"
                                        >
                                            Loading inventory...
                                        </td>
                                    </tr>
                                ) : products.length
                                    === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={
                                                5
                                            }
                                            className="inv-table-state"
                                        >
                                            {appliedSearch
                                                ? 'No matching products found.'
                                                : 'No received stock found.'}
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
                                                    <div className="inv-product-cell">
                                                        <span className="inv-product-icon">
                                                            <Icon name="box" />
                                                        </span>

                                                        <span className="inv-product-copy">
                                                            <strong
                                                                className="inv-product-name"
                                                                title={
                                                                    product.name
                                                                }
                                                            >
                                                                {product.name}
                                                            </strong>

                                                            <small className="inv-product-unit">
                                                                {product.unit}
                                                            </small>
                                                        </span>
                                                    </div>
                                                </td>

                                                <td data-label="Category">
                                                    <span className="inv-category-badge">
                                                        {product.category
                                                            ?.name
                                                            ?? 'General'}
                                                    </span>
                                                </td>

                                                <td data-label="Available Stock">
                                                    <strong className="inv-stock-value">
                                                        {formatQuantity(
                                                            product
                                                                .total_available_quantity,
                                                        )}
                                                        {' '}
                                                        {product.unit}
                                                    </strong>
                                                </td>

                                                <td data-label="Price Options">
                                                    <span className="inv-options-badge">
                                                        {product
                                                            .price_options
                                                            .length}
                                                    </span>
                                                </td>

                                                <td data-label="Action">
                                                    <button
                                                        type="button"
                                                        className="inv-view-button"
                                                        onClick={() => {
                                                            setSelectedProduct(
                                                                product,
                                                            );
                                                        }}
                                                    >
                                                        <Icon name="layers" />

                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ),
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!isLoading
                        && pagination.total
                        > 0 && (
                            <footer className="inv-pagination">
                                <button
                                    type="button"
                                    className="inv-pagination-button"
                                    disabled={
                                        pagination
                                            .current_page
                                        <= 1
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

                                    {' '}
                                    ·
                                    {' '}

                                    {formatQuantity(
                                        visibleStockTotal,
                                    )}
                                    {' '}
                                    visible stock
                                </span>

                                <button
                                    type="button"
                                    className="inv-pagination-button"
                                    disabled={
                                        pagination
                                            .current_page
                                        >= pagination
                                            .last_page
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
                            </footer>
                        )}
                </section>
            </div>

            {detailsModal}

            {openingInventoryModal}
        </>
    );
}
