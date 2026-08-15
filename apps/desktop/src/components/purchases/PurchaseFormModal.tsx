import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import { createPortal } from 'react-dom';

import type { ValidationErrors } from '../../types/auth';
import type {
    PurchaseFormValues,
    PurchaseItemFormValues,
    PurchaseProductOption,
} from '../../types/purchase';
import type { SupplierOption } from '../../types/supplier';

/* =========================================================
   TYPES
   ========================================================= */

interface PurchaseFormModalProps {
    isOpen: boolean;
    isEditing: boolean;
    values: PurchaseFormValues;
    suppliers: SupplierOption[];
    products: PurchaseProductOption[];
    isSubmitting: boolean;
    errorMessage: string;
    fieldErrors: ValidationErrors;

    onHeaderChange: (
        field: keyof Omit<PurchaseFormValues, 'items'>,
        value: string | boolean,
    ) => void;

    onItemChange: (
        index: number,
        field: keyof PurchaseItemFormValues,
        value: string,
    ) => void;

    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

type DualUnitItemField =
    | 'is_dual_unit'
    | 'conversion_factor'
    | 'secondary_unit'
    | 'secondary_selling_price';

type PurchaseItemExtensionField =
    | DualUnitItemField
    | 'product_variant_id';

type ExtendedPurchaseItem = PurchaseItemFormValues
    & Partial<Record<PurchaseItemExtensionField, string>>;

interface PurchaseProductVariantRuntime {
    id: number;
    display_name: string;
    size_value: number;
    size_unit: string;
    package_unit: string;
    sku: string;
    barcode: string | null;
    is_active: boolean;
}

type PurchaseProductWithVariants = PurchaseProductOption & {
    has_variants?: boolean;
    variants?: PurchaseProductVariantRuntime[];
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
    hasError?: boolean;
    withIcon?: boolean;
    ariaLabel: string;
    triggerRef?: RefObject<HTMLButtonElement | null>;
    onChange: (value: string) => void;
}

/* =========================================================
   FORMATTERS
   ========================================================= */

const currencyFormatter = new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
});

/* =========================================================
   ICONS
   ========================================================= */

type IconName =
    | 'alert'
    | 'bag'
    | 'batch'
    | 'calendar'
    | 'check'
    | 'chevron'
    | 'close'
    | 'collapse'
    | 'edit'
    | 'info'
    | 'invoice'
    | 'money'
    | 'note'
    | 'package'
    | 'plus'
    | 'receipt'
    | 'save'
    | 'scale'
    | 'search'
    | 'supplier'
    | 'trash'
    | 'truck';

function Icon({ name }: { name: IconName }) {
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
        case 'bag':
            return (
                <svg {...props}>
                    <path d="M8 7c0-3 1.5-5 4-5s4 2 4 5" />
                    <path d="M6 7h12l2 14H4Z" />
                    <path d="M9 12h6" />
                </svg>
            );
        case 'batch':
            return (
                <svg {...props}>
                    <path d="m12 2 9 5-9 5-9-5 9-5Z" />
                    <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
                </svg>
            );
        case 'calendar':
            return (
                <svg {...props}>
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 11h18" />
                </svg>
            );
        case 'check':
            return (
                <svg {...props}>
                    <path d="m5 12 4 4L19 6" />
                </svg>
            );
        case 'chevron':
            return (
                <svg {...props}>
                    <path d="m7 10 5 5 5-5" />
                </svg>
            );
        case 'close':
            return (
                <svg {...props}>
                    <path d="m6 6 12 12M18 6 6 18" />
                </svg>
            );
        case 'collapse':
            return (
                <svg {...props}>
                    <path d="m18 15-6-6-6 6" />
                </svg>
            );
        case 'edit':
            return (
                <svg {...props}>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
            );
        case 'info':
            return (
                <svg {...props}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5M12 8h.01" />
                </svg>
            );
        case 'invoice':
            return (
                <svg {...props}>
                    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
                    <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
            );
        case 'money':
            return (
                <svg {...props}>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M7 9H6a1 1 0 0 0-1 1v1M17 15h1a1 1 0 0 0 1-1v-1" />
                </svg>
            );
        case 'note':
            return (
                <svg {...props}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                    <path d="M14 2v6h6M8 13h8M8 17h6" />
                </svg>
            );
        case 'package':
            return (
                <svg {...props}>
                    <path d="m21 8-9 5-9-5 9-5 9 5Z" />
                    <path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" />
                </svg>
            );
        case 'plus':
            return (
                <svg {...props}>
                    <path d="M12 5v14M5 12h14" />
                </svg>
            );
        case 'receipt':
            return (
                <svg {...props}>
                    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
                    <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
            );
        case 'save':
            return (
                <svg {...props}>
                    <path d="M5 3h11l3 3v15H5Z" />
                    <path d="M8 3v6h8V3M8 21v-7h8v7" />
                </svg>
            );
        case 'scale':
            return (
                <svg {...props}>
                    <path d="M12 3v18M5 7h14M7 7l-4 7h8ZM17 7l-4 7h8Z" />
                    <path d="M8 21h8" />
                </svg>
            );
        case 'search':
            return (
                <svg {...props}>
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                </svg>
            );
        case 'supplier':
            return (
                <svg {...props}>
                    <path d="M3 21h18M6 21V4h12v17M9 8h.01M12 8h.01M15 8h.01M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
                </svg>
            );
        case 'trash':
            return (
                <svg {...props}>
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
                </svg>
            );
        case 'truck':
        default:
            return (
                <svg {...props}>
                    <path d="M3 6h11v10H3Z" />
                    <path d="M14 10h4l3 3v3h-7ZM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                </svg>
            );
    }
}

/* =========================================================
   HELPERS
   ========================================================= */

function numberValue(value: string | number | null | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatQuantity(value: number): string {
    return quantityFormatter.format(Number.isFinite(value) ? value : 0);
}

function getExtendedItemValue(
    item: PurchaseItemFormValues,
    field: PurchaseItemExtensionField,
    fallback = '',
): string {
    const extendedItem = item as ExtendedPurchaseItem;
    const value = extendedItem[field];

    if (value === undefined || value === null) {
        return fallback;
    }

    return String(value);
}

function isEnabledFlag(value: string): boolean {
    return value === '1' || value === 'true' || value === 'yes';
}

function isBagUnit(unit: string | null | undefined): boolean {
    const normalised = String(unit ?? '').trim().toLowerCase();
    return normalised === 'bag' || normalised === 'bags';
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
    hasError = false,
    withIcon = false,
    ariaLabel,
    triggerRef,
    onChange,
}: SearchableSelectProps) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const optionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value) ?? null,
        [options, value],
    );

    const filteredOptions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) {
            return options;
        }

        return options.filter((option) => {
            const searchValue = [option.label, option.secondary, option.searchText]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchValue.includes(query);
        });
    }, [options, searchQuery]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const selectedIndex = options.findIndex((option) => option.value === value);
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);

        const timer = window.setTimeout(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
        }, 30);

        const handleOutsideClick = (event: MouseEvent): void => {
            if (
                event.target instanceof Node
                && !rootRef.current?.contains(event.target)
            ) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);

        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isOpen, options, value]);

    useEffect(() => {
        if (isOpen && searchQuery) {
            setHighlightedIndex(0);
        }
    }, [searchQuery, isOpen]);

    const closeDropdown = (): void => {
        setIsOpen(false);
        setSearchQuery('');
    };

    const chooseOption = (option: SearchableSelectOption): void => {
        onChange(option.value);
        closeDropdown();
    };

    const moveHighlight = (direction: number): void => {
        if (filteredOptions.length === 0) {
            return;
        }

        setHighlightedIndex((current) => {
            const next = (current + direction + filteredOptions.length) % filteredOptions.length;
            const option = filteredOptions[next];

            if (option) {
                window.setTimeout(() => {
                    optionButtonRefs.current.get(option.value)?.scrollIntoView({ block: 'nearest' });
                }, 0);
            }

            return next;
        });
    };

    const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveHighlight(1);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveHighlight(-1);
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            const option = filteredOptions[highlightedIndex];

            if (option) {
                chooseOption(option);
            }

            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            closeDropdown();
        }
    };

    return (
        <div ref={rootRef} className={isOpen ? 'pfm-searchable-select is-open' : 'pfm-searchable-select'}>
            <button
                ref={triggerRef}
                type="button"
                className={[
                    'pfm-searchable-trigger',
                    withIcon ? 'with-icon' : '',
                    hasError ? 'has-error' : '',
                    selectedOption ? '' : 'placeholder',
                ]
                    .filter(Boolean)
                    .join(' ')}
                disabled={disabled}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((current) => !current)}
                onKeyDown={(event) => {
                    if (
                        (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === ' ')
                        && !isOpen
                    ) {
                        event.preventDefault();
                        setIsOpen(true);
                    }

                    if (event.key === 'Escape' && isOpen) {
                        event.preventDefault();
                        event.stopPropagation();
                        closeDropdown();
                    }
                }}
            >
                <span className="pfm-searchable-trigger-text">
                    {selectedOption?.label ?? placeholder}
                </span>

                <span className={isOpen ? 'pfm-searchable-chevron open' : 'pfm-searchable-chevron'}>
                    <Icon name="chevron" />
                </span>
            </button>

            {isOpen && (
                <div className="pfm-searchable-menu">
                    <div className="pfm-searchable-search-wrap">
                        <span className="pfm-searchable-search-icon">
                            <Icon name="search" />
                        </span>

                        <input
                            ref={searchInputRef}
                            type="text"
                            className="pfm-searchable-search-input"
                            value={searchQuery}
                            placeholder={searchPlaceholder}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            onKeyDown={handleSearchKeyDown}
                        />
                    </div>

                    <div className="pfm-searchable-options" role="listbox" aria-label={ariaLabel}>
                        {filteredOptions.length === 0 ? (
                            <div className="pfm-searchable-empty">
                                <Icon name="search" />
                                <strong>No results found</strong>
                                <span>{emptyMessage}</span>
                            </div>
                        ) : (
                            filteredOptions.map((option, index) => {
                                const selected = option.value === value;
                                const highlighted = index === highlightedIndex;

                                return (
                                    <button
                                        ref={(node) => {
                                            if (node) {
                                                optionButtonRefs.current.set(option.value, node);
                                            } else {
                                                optionButtonRefs.current.delete(option.value);
                                            }
                                        }}
                                        key={option.value}
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        className={[
                                            'pfm-searchable-option',
                                            selected ? 'selected' : '',
                                            highlighted ? 'highlighted' : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => chooseOption(option)}
                                    >
                                        <span className="pfm-searchable-option-copy">
                                            <strong>{option.label}</strong>
                                            {option.secondary && <small>{option.secondary}</small>}
                                        </span>

                                        {selected && (
                                            <span className="pfm-searchable-option-check">
                                                <Icon name="check" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="pfm-searchable-keyboard-help">
                        Type to search • ↑ ↓ move • Enter select • Esc close
                    </div>
                </div>
            )}
        </div>
    );
}

/* =========================================================
   SCOPED STYLES
   ========================================================= */

const purchaseFormStyles = `
#purchase-form-modal,
#purchase-form-modal *,
#purchase-form-modal *::before,
#purchase-form-modal *::after {
    box-sizing: border-box !important;
}

#purchase-form-modal {
    --pfm-green-950: #052e16;
    --pfm-green-900: #14532d;
    --pfm-green-800: #166534;
    --pfm-green-700: #15803d;
    --pfm-green-100: #dcfce7;
    --pfm-green-50: #f0fdf4;

    --pfm-blue-800: #175cd3;
    --pfm-blue-100: #d1e9ff;
    --pfm-blue-50: #eff8ff;

    --pfm-amber-800: #b54708;
    --pfm-amber-100: #fedf89;
    --pfm-amber-50: #fffaeb;

    --pfm-red-800: #b42318;
    --pfm-red-100: #fecdca;
    --pfm-red-50: #fef3f2;

    --pfm-text: #101828;
    --pfm-text-2: #344054;
    --pfm-muted: #667085;

    --pfm-border: #d0d9d2;
    --pfm-border-strong: #aebdb2;

    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;
    width: 100vw !important;
    height: 100dvh !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    color: var(--pfm-text) !important;
    background: transparent !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    font-size: 15px !important;
    line-height: 1.5 !important;
    isolation: isolate !important;
}

#purchase-form-modal button,
#purchase-form-modal input,
#purchase-form-modal select,
#purchase-form-modal textarea {
    font: inherit !important;
    letter-spacing: normal !important;
    text-transform: none !important;
}

#purchase-form-modal h2,
#purchase-form-modal h3,
#purchase-form-modal h4,
#purchase-form-modal p {
    margin: 0 !important;
}

/*
 * IMPORTANT SVG RESET
 *
 * Every Icon component renders an inline <svg>. When an SVG does not
 * receive an explicit size, the browser can render it at its intrinsic
 * 300px × 150px size. This root-scoped rule keeps every icon compact and
 * also protects this modal from any global index.css SVG rules.
 *
 * More-specific icon rules below can still intentionally use 20px, 23px,
 * 24px, etc.
 */
#purchase-form-modal svg {
    display: block !important;
    width: 18px !important;
    height: 18px !important;
    flex-shrink: 0 !important;
}

/* =========================================================
   MODAL
   ========================================================= */

#purchase-form-modal .pfm-backdrop {
    position: absolute !important;
    inset: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 14px !important;
    background: rgba(3, 18, 10, 0.76) !important;
    backdrop-filter: blur(4px) !important;
}

#purchase-form-modal .pfm-dialog {
    display: flex !important;
    width: min(1320px, 100%) !important;
    max-height: calc(100dvh - 28px) !important;
    min-height: 0 !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid var(--pfm-border) !important;
    border-radius: 18px !important;
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.40) !important;
}

/* =========================================================
   HEADER
   ========================================================= */

#purchase-form-modal .pfm-header {
    display: flex !important;
    min-height: 84px !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 18px !important;
    padding: 14px 18px !important;
    color: #ffffff !important;
    background: linear-gradient(135deg, var(--pfm-green-950), var(--pfm-green-700)) !important;
}

#purchase-form-modal .pfm-header-main {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 12px !important;
}

#purchase-form-modal .pfm-header-icon {
    display: grid !important;
    width: 46px !important;
    height: 46px !important;
    min-width: 46px !important;
    place-items: center !important;
    color: var(--pfm-green-900) !important;
    background: #ffffff !important;
    border-radius: 12px !important;
}

#purchase-form-modal .pfm-header-icon svg {
    width: 23px !important;
    height: 23px !important;
}

#purchase-form-modal .pfm-kicker {
    display: block !important;
    margin-bottom: 2px !important;
    color: #bbf7d0 !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    letter-spacing: 0.06em !important;
    text-transform: uppercase !important;
}

#purchase-form-modal .pfm-title {
    color: #ffffff !important;
    font-size: 23px !important;
    font-weight: 800 !important;
    line-height: 1.2 !important;
}

#purchase-form-modal .pfm-close {
    display: grid !important;
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
    place-items: center !important;
    padding: 0 !important;
    color: #ffffff !important;
    background: rgba(255, 255, 255, 0.13) !important;
    border: 1px solid rgba(255, 255, 255, 0.35) !important;
    border-radius: 11px !important;
    cursor: pointer !important;
}

#purchase-form-modal .pfm-close svg {
    width: 20px !important;
    height: 20px !important;
}

/* =========================================================
   FORM BODY
   ========================================================= */

#purchase-form-modal .pfm-form {
    display: flex !important;
    min-height: 0 !important;
    flex: 1 1 auto !important;
    flex-direction: column !important;
    overflow: hidden !important;
}

#purchase-form-modal .pfm-body {
    display: flex !important;
    min-height: 0 !important;
    flex: 1 1 auto !important;
    flex-direction: column !important;
    gap: 15px !important;
    padding: 16px !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    background: #f4f7f5 !important;
    scrollbar-width: thin !important;
    scrollbar-color: #9cad9f #eaf0eb !important;
}

/* =========================================================
   ALERT
   ========================================================= */

#purchase-form-modal .pfm-alert {
    display: flex !important;
    align-items: flex-start !important;
    gap: 9px !important;
    padding: 11px 13px !important;
    color: var(--pfm-red-800) !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    background: var(--pfm-red-50) !important;
    border: 1px solid var(--pfm-red-100) !important;
    border-radius: 10px !important;
}

#purchase-form-modal .pfm-alert svg {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
}

/* =========================================================
   SECTIONS
   ========================================================= */

#purchase-form-modal .pfm-section {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 13px !important;
    padding: 15px !important;
    background: #ffffff !important;
    border: 1px solid var(--pfm-border) !important;
    border-radius: 13px !important;
}

#purchase-form-modal .pfm-section-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 14px !important;
    padding-bottom: 11px !important;
    border-bottom: 1px solid #e7ece8 !important;
}

#purchase-form-modal .pfm-section-heading {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 10px !important;
}

#purchase-form-modal .pfm-section-icon {
    display: grid !important;
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    place-items: center !important;
    color: var(--pfm-green-900) !important;
    background: var(--pfm-green-50) !important;
    border: 1px solid #b8dfc3 !important;
    border-radius: 9px !important;
}

#purchase-form-modal .pfm-section-icon svg {
    width: 18px !important;
    height: 18px !important;
}

#purchase-form-modal .pfm-section-title {
    color: var(--pfm-text-2) !important;
    font-size: 16px !important;
    font-weight: 800 !important;
}

/* =========================================================
   HEADER FIELDS
   ========================================================= */

#purchase-form-modal .pfm-header-grid {
    display: grid !important;
    grid-template-columns:
        minmax(240px, 1.25fr)
        minmax(170px, 0.7fr)
        minmax(220px, 1fr)
        minmax(175px, 0.7fr)
        minmax(175px, 0.7fr) !important;
    gap: 12px !important;
    align-items: start !important;
}

#purchase-form-modal .pfm-notes-field {
    grid-column: 1 / -1 !important;
}

/* =========================================================
   WORKSPACE
   ========================================================= */

#purchase-form-modal .pfm-workspace {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 295px !important;
    align-items: start !important;
    gap: 14px !important;
}

#purchase-form-modal .pfm-items-list {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 10px !important;
}

#purchase-form-modal .pfm-add-item {
    display: inline-flex !important;
    min-height: 42px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;
    padding: 8px 14px !important;
    color: var(--pfm-green-900) !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    background: var(--pfm-green-50) !important;
    border: 1px solid #b8dfc3 !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#purchase-form-modal .pfm-add-item svg {
    width: 16px !important;
    height: 16px !important;
}

/* =========================================================
   PRODUCT ACCORDION CARD
   ========================================================= */

#purchase-form-modal .pfm-item-card {
    position: relative !important;
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    background: #ffffff !important;
    border: 1px solid var(--pfm-border) !important;
    border-radius: 12px !important;
    overflow: visible !important;
    transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
}

#purchase-form-modal .pfm-item-card.expanded {
    border-color: #9acba7 !important;
    box-shadow: 0 3px 12px rgba(21, 128, 61, 0.08) !important;
}

#purchase-form-modal .pfm-item-card.collapsed {
    border-color: #d5ddd7 !important;
}

#purchase-form-modal .pfm-item-header {
    display: flex !important;
    min-height: 58px !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    padding: 10px 12px !important;
    background: #f8faf9 !important;
    border-radius: 12px !important;
}

#purchase-form-modal .pfm-item-card.expanded .pfm-item-header {
    border-bottom: 1px solid #e3e9e4 !important;
    border-radius: 12px 12px 0 0 !important;
}

#purchase-form-modal .pfm-item-heading {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 9px !important;
}

#purchase-form-modal .pfm-item-number {
    display: inline-flex !important;
    min-height: 30px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 4px 9px !important;
    color: var(--pfm-green-900) !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    background: var(--pfm-green-50) !important;
    border: 1px solid #b8dfc3 !important;
    border-radius: 999px !important;
    white-space: nowrap !important;
}

#purchase-form-modal .pfm-item-product {
    overflow: hidden !important;
    color: var(--pfm-text-2) !important;
    font-size: 14px !important;
    font-weight: 800 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#purchase-form-modal .pfm-unit-badge {
    display: inline-flex !important;
    min-height: 27px !important;
    align-items: center !important;
    gap: 5px !important;
    padding: 3px 8px !important;
    color: var(--pfm-blue-800) !important;
    font-size: 10px !important;
    font-weight: 800 !important;
    background: var(--pfm-blue-50) !important;
    border: 1px solid var(--pfm-blue-100) !important;
    border-radius: 999px !important;
    white-space: nowrap !important;
}

#purchase-form-modal .pfm-mini-summary.variant {
    color: #6941c6 !important;
    background: #f4f3ff !important;
    border-color: #d9d6fe !important;
}

#purchase-form-modal .pfm-mini-summary.variant strong {
    color: #5925dc !important;
}

/* =========================================================
   COLLAPSED PRODUCT SUMMARY
   ========================================================= */

#purchase-form-modal .pfm-collapsed-summary {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 7px !important;
    flex-wrap: wrap !important;
    margin-left: 8px !important;
}

#purchase-form-modal .pfm-mini-summary {
    display: inline-flex !important;
    min-height: 28px !important;
    align-items: center !important;
    gap: 4px !important;
    padding: 3px 8px !important;
    color: var(--pfm-text-2) !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    background: #ffffff !important;
    border: 1px solid #dde5df !important;
    border-radius: 7px !important;
    white-space: nowrap !important;
}

#purchase-form-modal .pfm-mini-summary strong {
    color: var(--pfm-green-900) !important;
    font-size: 11px !important;
    font-weight: 850 !important;
}

#purchase-form-modal .pfm-mini-summary.total {
    color: var(--pfm-green-900) !important;
    background: var(--pfm-green-50) !important;
    border-color: #b8dfc3 !important;
}

/* =========================================================
   ITEM HEADER ACTIONS
   ========================================================= */

#purchase-form-modal .pfm-item-header-actions {
    display: flex !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    gap: 7px !important;
}

#purchase-form-modal .pfm-line-total {
    color: var(--pfm-green-900) !important;
    font-size: 13px !important;
    font-weight: 850 !important;
    white-space: nowrap !important;
}

#purchase-form-modal .pfm-collapse-item,
#purchase-form-modal .pfm-remove-item {
    display: inline-flex !important;
    min-height: 34px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;
    padding: 5px 9px !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    border-radius: 8px !important;
    cursor: pointer !important;
}

#purchase-form-modal .pfm-collapse-item {
    color: var(--pfm-green-900) !important;
    background: #ffffff !important;
    border: 1px solid #b7c8bb !important;
}

#purchase-form-modal .pfm-collapse-item:hover {
    background: var(--pfm-green-50) !important;
    border-color: #8cbd99 !important;
}

#purchase-form-modal .pfm-remove-item {
    color: var(--pfm-red-800) !important;
    background: var(--pfm-red-50) !important;
    border: 1px solid var(--pfm-red-100) !important;
}

#purchase-form-modal .pfm-collapse-item svg,
#purchase-form-modal .pfm-remove-item svg {
    width: 14px !important;
    height: 14px !important;
}

/* =========================================================
   ITEM BODY
   ========================================================= */

#purchase-form-modal .pfm-item-body {
    display: flex !important;
    flex-direction: column !important;
    gap: 14px !important;
    padding: 14px !important;
}

/*
 * IMPORTANT FIX:
 * These tracks stay fixed. Product selection no longer causes
 * Quantity / Purchase Cost / Selling Price fields to jump up or down.
 */
#purchase-form-modal .pfm-item-main-grid {
    display: grid !important;
    grid-template-columns:
        minmax(255px, 1.5fr)
        minmax(120px, 0.55fr)
        minmax(165px, 0.78fr)
        minmax(165px, 0.78fr)
        minmax(145px, 0.65fr) !important;
    gap: 11px !important;
    align-items: start !important;
}

#purchase-form-modal .pfm-item-main-grid.has-variant {
    grid-template-columns:
        minmax(220px, 1.25fr)
        minmax(190px, 1.05fr)
        minmax(105px, 0.5fr)
        minmax(155px, 0.75fr)
        minmax(155px, 0.75fr)
        minmax(135px, 0.62fr) !important;
}

#purchase-form-modal .pfm-variant-help {
    color: #5925dc !important;
}

#purchase-form-modal .pfm-variant-required-help {
    color: var(--pfm-amber-800) !important;
    font-weight: 750 !important;
}

/*
 * Every main label receives the same height, so long labels don't
 * change the position of the input below them.
 */
#purchase-form-modal .pfm-item-main-grid > .pfm-field > .pfm-main-field-label {
    display: flex !important;
    min-height: 38px !important;
    align-items: flex-end !important;
    line-height: 1.25 !important;
}

#purchase-form-modal .pfm-main-field-feedback {
    display: flex !important;
    min-height: 18px !important;
    align-items: flex-start !important;
}

/* =========================================================
   FIELD
   ========================================================= */

#purchase-form-modal .pfm-field {
    display: grid !important;
    min-width: 0 !important;
    align-content: start !important;
    gap: 6px !important;
}

#purchase-form-modal .pfm-field-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
}

#purchase-form-modal .pfm-label {
    color: var(--pfm-text-2) !important;
    font-size: 12px !important;
    font-weight: 750 !important;
}

#purchase-form-modal .pfm-required {
    color: var(--pfm-red-800) !important;
}

#purchase-form-modal .pfm-optional {
    display: inline-flex !important;
    margin-left: 5px !important;
    padding: 2px 5px !important;
    color: var(--pfm-muted) !important;
    font-size: 8px !important;
    font-weight: 700 !important;
    background: #f2f4f7 !important;
    border-radius: 999px !important;
}

#purchase-form-modal .pfm-counter {
    color: var(--pfm-muted) !important;
    font-size: 9px !important;
}

#purchase-form-modal .pfm-control-wrap {
    position: relative !important;
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
}

#purchase-form-modal .pfm-control-icon {
    position: absolute !important;
    top: 50% !important;
    left: 11px !important;
    z-index: 3 !important;
    display: grid !important;
    width: 16px !important;
    height: 16px !important;
    place-items: center !important;
    color: var(--pfm-muted) !important;
    transform: translateY(-50%) !important;
    pointer-events: none !important;
}

#purchase-form-modal .pfm-control-icon.top {
    top: 12px !important;
    transform: none !important;
}

#purchase-form-modal .pfm-control-icon svg {
    width: 16px !important;
    height: 16px !important;
}

#purchase-form-modal .pfm-currency-prefix {
    position: absolute !important;
    top: 50% !important;
    left: 10px !important;
    z-index: 2 !important;
    color: var(--pfm-muted) !important;
    font-size: 9px !important;
    font-weight: 800 !important;
    transform: translateY(-50%) !important;
    pointer-events: none !important;
}

#purchase-form-modal .pfm-suffix {
    position: absolute !important;
    top: 50% !important;
    right: 10px !important;
    color: var(--pfm-muted) !important;
    font-size: 10px !important;
    font-weight: 800 !important;
    transform: translateY(-50%) !important;
    pointer-events: none !important;
}

#purchase-form-modal .pfm-input,
#purchase-form-modal .pfm-select,
#purchase-form-modal .pfm-textarea {
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
    color: var(--pfm-text) !important;
    font-size: 14px !important;
    font-weight: 550 !important;
    outline: none !important;
    background: #ffffff !important;
    border: 1px solid var(--pfm-border-strong) !important;
    border-radius: 9px !important;
    box-shadow: none !important;
}

#purchase-form-modal .pfm-input,
#purchase-form-modal .pfm-select {
    height: 44px !important;
    min-height: 44px !important;
}

#purchase-form-modal .pfm-input {
    padding: 0 11px !important;
}

#purchase-form-modal .pfm-select {
    padding: 0 10px !important;
}

#purchase-form-modal .pfm-input.with-icon,
#purchase-form-modal .pfm-select.with-icon {
    padding-left: 36px !important;
}

#purchase-form-modal .pfm-input.with-currency {
    padding-left: 41px !important;
}

#purchase-form-modal .pfm-input.with-suffix {
    padding-right: 43px !important;
}

#purchase-form-modal .pfm-textarea {
    min-height: 80px !important;
    padding: 10px 11px !important;
    line-height: 1.5 !important;
    resize: vertical !important;
}

#purchase-form-modal .pfm-textarea.with-icon {
    padding-left: 36px !important;
}

#purchase-form-modal .pfm-input.has-error,
#purchase-form-modal .pfm-select.has-error,
#purchase-form-modal .pfm-textarea.has-error {
    border-color: var(--pfm-red-800) !important;
}

#purchase-form-modal .pfm-input:focus,
#purchase-form-modal .pfm-select:focus,
#purchase-form-modal .pfm-textarea:focus,
#purchase-form-modal button:focus-visible {
    outline: none !important;
    border-color: var(--pfm-green-700) !important;
    box-shadow: 0 0 0 4px rgba(21, 128, 61, 0.14) !important;
}

#purchase-form-modal .pfm-input:disabled,
#purchase-form-modal .pfm-select:disabled,
#purchase-form-modal .pfm-textarea:disabled {
    color: #667085 !important;
    background: #f2f4f7 !important;
    cursor: not-allowed !important;
}

#purchase-form-modal .pfm-field-error {
    color: var(--pfm-red-800) !important;
    font-size: 11px !important;
    font-weight: 650 !important;
}

#purchase-form-modal .pfm-help {
    display: flex !important;
    align-items: flex-start !important;
    gap: 5px !important;
    color: var(--pfm-muted) !important;
    font-size: 10px !important;
    line-height: 1.4 !important;
}

/* =========================================================
   SEARCHABLE DROPDOWN
   ========================================================= */

#purchase-form-modal .pfm-searchable-select {
    position: relative !important;
    width: 100% !important;
    min-width: 0 !important;
}

#purchase-form-modal .pfm-searchable-select.is-open {
    z-index: 600 !important;
}

#purchase-form-modal .pfm-searchable-trigger {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    height: 44px !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
    padding: 0 10px !important;
    color: var(--pfm-text) !important;
    font-size: 14px !important;
    font-weight: 550 !important;
    text-align: left !important;
    background: #ffffff !important;
    border: 1px solid var(--pfm-border-strong) !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#purchase-form-modal .pfm-searchable-trigger.with-icon {
    padding-left: 36px !important;
}

#purchase-form-modal .pfm-searchable-trigger.placeholder {
    color: var(--pfm-muted) !important;
}

#purchase-form-modal .pfm-searchable-trigger.has-error {
    border-color: var(--pfm-red-800) !important;
}

#purchase-form-modal .pfm-searchable-trigger-text {
    min-width: 0 !important;
    flex: 1 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#purchase-form-modal .pfm-searchable-chevron {
    display: grid !important;
    width: 20px !important;
    height: 20px !important;
    place-items: center !important;
    color: var(--pfm-muted) !important;
    transition: transform 0.15s ease !important;
}

#purchase-form-modal .pfm-searchable-chevron.open {
    transform: rotate(180deg) !important;
}

#purchase-form-modal .pfm-searchable-chevron svg {
    width: 17px !important;
    height: 17px !important;
}

#purchase-form-modal .pfm-searchable-menu {
    position: absolute !important;
    top: calc(100% + 6px) !important;
    left: 0 !important;
    z-index: 999 !important;
    width: 100% !important;
    min-width: min(360px, 85vw) !important;
    padding: 8px !important;
    background: #ffffff !important;
    border: 1px solid #b7c4ba !important;
    border-radius: 11px !important;
    box-shadow: 0 18px 45px rgba(16, 24, 40, 0.18) !important;
}

#purchase-form-modal .pfm-searchable-search-wrap {
    position: relative !important;
    padding-bottom: 8px !important;
    border-bottom: 1px solid #edf1ee !important;
}

#purchase-form-modal .pfm-searchable-search-icon {
    position: absolute !important;
    top: 13px !important;
    left: 11px !important;
    display: grid !important;
    width: 18px !important;
    height: 18px !important;
    place-items: center !important;
    color: var(--pfm-muted) !important;
    pointer-events: none !important;
}

#purchase-form-modal .pfm-searchable-search-input {
    display: block !important;
    width: 100% !important;
    height: 42px !important;
    padding: 0 12px 0 38px !important;
    color: var(--pfm-text) !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    background: #f9fbfa !important;
    border: 1px solid var(--pfm-border-strong) !important;
    border-radius: 9px !important;
    outline: none !important;
}

#purchase-form-modal .pfm-searchable-options {
    max-height: 260px !important;
    margin-top: 7px !important;
    overflow-y: auto !important;
    scrollbar-width: thin !important;
}

#purchase-form-modal .pfm-searchable-option {
    display: flex !important;
    width: 100% !important;
    min-height: 48px !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    padding: 8px 10px !important;
    color: var(--pfm-text-2) !important;
    text-align: left !important;
    background: #ffffff !important;
    border: 1px solid transparent !important;
    border-radius: 8px !important;
    cursor: pointer !important;
}

#purchase-form-modal .pfm-searchable-option.highlighted,
#purchase-form-modal .pfm-searchable-option:hover {
    background: var(--pfm-green-50) !important;
    border-color: #b8dfc3 !important;
}

#purchase-form-modal .pfm-searchable-option.selected {
    color: var(--pfm-green-900) !important;
    background: #e9f8ee !important;
    border-color: #8fc69e !important;
}

#purchase-form-modal .pfm-searchable-option-copy {
    display: flex !important;
    min-width: 0 !important;
    flex: 1 !important;
    flex-direction: column !important;
}

#purchase-form-modal .pfm-searchable-option-copy strong {
    overflow: hidden !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#purchase-form-modal .pfm-searchable-option-copy small {
    color: var(--pfm-muted) !important;
    font-size: 10px !important;
}

#purchase-form-modal .pfm-searchable-option-check {
    display: grid !important;
    width: 25px !important;
    height: 25px !important;
    place-items: center !important;
    color: #ffffff !important;
    background: var(--pfm-green-700) !important;
    border-radius: 50% !important;
}

#purchase-form-modal .pfm-searchable-option-check svg {
    width: 14px !important;
    height: 14px !important;
}

#purchase-form-modal .pfm-searchable-empty {
    display: flex !important;
    min-height: 100px !important;
    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    color: var(--pfm-muted) !important;
    text-align: center !important;
}

#purchase-form-modal .pfm-searchable-empty svg {
    width: 24px !important;
    height: 24px !important;
    color: var(--pfm-green-700) !important;
}

#purchase-form-modal .pfm-searchable-keyboard-help {
    margin-top: 7px !important;
    padding-top: 7px !important;
    color: var(--pfm-muted) !important;
    font-size: 9px !important;
    font-weight: 650 !important;
    text-align: center !important;
    border-top: 1px solid #edf1ee !important;
}

/* =========================================================
   DUAL UNIT
   ========================================================= */

#purchase-form-modal .pfm-dual-unit-card {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    padding: 14px !important;
    background: linear-gradient(135deg, #f0fdf4, #eff8ff) !important;
    border: 1px solid #9fd4ae !important;
    border-radius: 12px !important;
}

#purchase-form-modal .pfm-dual-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 14px !important;
}

#purchase-form-modal .pfm-dual-heading {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
}

#purchase-form-modal .pfm-dual-icon {
    display: grid !important;
    width: 39px !important;
    height: 39px !important;
    place-items: center !important;
    color: #ffffff !important;
    background: linear-gradient(135deg, var(--pfm-green-900), var(--pfm-blue-800)) !important;
    border-radius: 10px !important;
}

#purchase-form-modal .pfm-dual-title {
    color: var(--pfm-green-900) !important;
    font-size: 15px !important;
    font-weight: 850 !important;
}

#purchase-form-modal .pfm-switch-label {
    display: inline-flex !important;
    min-height: 42px !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 7px 11px !important;
    color: var(--pfm-text-2) !important;
    font-size: 12px !important;
    font-weight: 800 !important;
    background: #ffffff !important;
    border: 1px solid #9fd4ae !important;
    border-radius: 10px !important;
    cursor: pointer !important;
}

#purchase-form-modal .pfm-switch-label input {
    width: 20px !important;
    height: 20px !important;
    accent-color: var(--pfm-green-700) !important;
}

#purchase-form-modal .pfm-dual-grid {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 11px !important;
}

#purchase-form-modal .pfm-preview-grid {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 9px !important;
}

#purchase-form-modal .pfm-preview-box {
    display: flex !important;
    min-height: 76px !important;
    flex-direction: column !important;
    justify-content: center !important;
    gap: 3px !important;
    padding: 10px !important;
    background: #ffffff !important;
    border: 1px solid #c4ddcb !important;
    border-radius: 9px !important;
}

#purchase-form-modal .pfm-preview-box span {
    color: var(--pfm-muted) !important;
    font-size: 9px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
}

#purchase-form-modal .pfm-preview-box strong {
    color: var(--pfm-text-2) !important;
    font-size: 14px !important;
    font-weight: 850 !important;
}

#purchase-form-modal .pfm-preview-box.profit strong {
    color: var(--pfm-green-800) !important;
}

/* =========================================================
   BATCH
   ========================================================= */

#purchase-form-modal .pfm-batch-heading {
    display: flex !important;
    align-items: center !important;
    gap: 7px !important;
    color: var(--pfm-muted) !important;
    font-size: 10px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
}

#purchase-form-modal .pfm-item-batch-grid {
    display: grid !important;
    grid-template-columns:
        minmax(160px, 0.8fr)
        minmax(150px, 0.7fr)
        minmax(150px, 0.7fr)
        minmax(200px, 1.1fr) !important;
    gap: 11px !important;
}

/* =========================================================
   SUMMARY
   ========================================================= */

#purchase-form-modal .pfm-summary-column {
    position: sticky !important;
    top: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
}

#purchase-form-modal .pfm-summary-card,
#purchase-form-modal .pfm-receive-card {
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid var(--pfm-border) !important;
    border-radius: 12px !important;
}

#purchase-form-modal .pfm-summary-header {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 12px 13px !important;
    color: var(--pfm-text-2) !important;
    font-size: 14px !important;
    font-weight: 800 !important;
    background: #f8faf9 !important;
    border-bottom: 1px solid #e3e9e4 !important;
}

#purchase-form-modal .pfm-summary-header svg {
    width: 17px !important;
    height: 17px !important;
    color: var(--pfm-green-700) !important;
}

#purchase-form-modal .pfm-summary-line {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    padding: 10px 13px !important;
    color: var(--pfm-muted) !important;
    font-size: 12px !important;
    border-bottom: 1px solid #edf1ee !important;
}

#purchase-form-modal .pfm-summary-line strong {
    color: var(--pfm-text-2) !important;
    font-size: 12px !important;
    font-weight: 800 !important;
}

#purchase-form-modal .pfm-summary-line.discount strong {
    color: var(--pfm-red-800) !important;
}

#purchase-form-modal .pfm-summary-line.total {
    padding: 14px !important;
    color: var(--pfm-green-900) !important;
    background: var(--pfm-green-50) !important;
}

#purchase-form-modal .pfm-summary-line.total strong {
    color: var(--pfm-green-900) !important;
    font-size: 18px !important;
    font-weight: 900 !important;
}

#purchase-form-modal .pfm-receive-option {
    display: flex !important;
    align-items: flex-start !important;
    gap: 10px !important;
    padding: 13px !important;
}

#purchase-form-modal .pfm-receive-option input {
    width: 20px !important;
    height: 20px !important;
    accent-color: var(--pfm-green-700) !important;
}

#purchase-form-modal .pfm-receive-title {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    color: var(--pfm-text-2) !important;
    font-size: 13px !important;
    font-weight: 800 !important;
}

#purchase-form-modal .pfm-receive-description {
    display: block !important;
    margin-top: 4px !important;
    color: var(--pfm-muted) !important;
    font-size: 11px !important;
}

/* =========================================================
   FOOTER
   ========================================================= */

#purchase-form-modal .pfm-actions {
    display: flex !important;
    min-height: 72px !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 14px !important;
    padding: 12px 17px !important;
    background: #ffffff !important;
    border-top: 1px solid var(--pfm-border) !important;
}

#purchase-form-modal .pfm-action-note {
    display: flex !important;
    align-items: center !important;
    gap: 7px !important;
    color: var(--pfm-muted) !important;
    font-size: 11px !important;
}

#purchase-form-modal .pfm-action-buttons {
    display: flex !important;
    align-items: center !important;
    gap: 9px !important;
}

#purchase-form-modal .pfm-button {
    display: inline-flex !important;
    min-height: 46px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;
    padding: 8px 15px !important;
    font-size: 14px !important;
    font-weight: 800 !important;
    border-radius: 10px !important;
    cursor: pointer !important;
}

#purchase-form-modal .pfm-cancel {
    color: var(--pfm-text-2) !important;
    background: #ffffff !important;
    border: 1px solid var(--pfm-border-strong) !important;
}

#purchase-form-modal .pfm-submit {
    color: #ffffff !important;
    background: var(--pfm-green-700) !important;
    border: 1px solid var(--pfm-green-700) !important;
}

#purchase-form-modal button:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

#purchase-form-modal .pfm-spinner {
    width: 16px !important;
    height: 16px !important;
    border: 2px solid rgba(255, 255, 255, 0.45) !important;
    border-top-color: #ffffff !important;
    border-radius: 50% !important;
    animation: pfm-spin 700ms linear infinite !important;
}

@keyframes pfm-spin {
    to {
        transform: rotate(360deg);
    }
}

/* =========================================================
   RESPONSIVE
   ========================================================= */

@media (max-width: 1180px) {
    #purchase-form-modal .pfm-workspace {
        grid-template-columns: 1fr !important;
    }

    #purchase-form-modal .pfm-summary-column {
        position: static !important;
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
}

@media (max-width: 1050px) {
    #purchase-form-modal .pfm-item-main-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    #purchase-form-modal .pfm-item-main-grid > .pfm-field > .pfm-main-field-label {
        min-height: 22px !important;
    }

    #purchase-form-modal .pfm-header-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    #purchase-form-modal .pfm-preview-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
}

@media (max-width: 760px) {
    #purchase-form-modal .pfm-backdrop {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    #purchase-form-modal .pfm-dialog {
        width: 100% !important;
        max-height: 97dvh !important;
        border-radius: 18px 18px 0 0 !important;
    }

    #purchase-form-modal .pfm-body {
        padding: 12px !important;
    }

    #purchase-form-modal .pfm-header-grid,
    #purchase-form-modal .pfm-item-main-grid,
    #purchase-form-modal .pfm-dual-grid,
    #purchase-form-modal .pfm-preview-grid,
    #purchase-form-modal .pfm-item-batch-grid,
    #purchase-form-modal .pfm-summary-column {
        grid-template-columns: 1fr !important;
    }

    #purchase-form-modal .pfm-notes-field {
        grid-column: auto !important;
    }

    #purchase-form-modal .pfm-item-header {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #purchase-form-modal .pfm-item-heading {
        flex-wrap: wrap !important;
    }

    #purchase-form-modal .pfm-collapsed-summary {
        margin-left: 0 !important;
    }

    #purchase-form-modal .pfm-item-header-actions {
        justify-content: flex-end !important;
        flex-wrap: wrap !important;
    }

    #purchase-form-modal .pfm-dual-header,
    #purchase-form-modal .pfm-actions {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #purchase-form-modal .pfm-action-buttons {
        display: grid !important;
        width: 100% !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    #purchase-form-modal .pfm-button {
        width: 100% !important;
    }

    #purchase-form-modal .pfm-searchable-menu {
        min-width: 100% !important;
    }
}

@media (max-width: 430px) {
    #purchase-form-modal .pfm-action-buttons {
        grid-template-columns: 1fr !important;
    }
}
`;

/* =========================================================
   COMPONENT
   ========================================================= */

export default function PurchaseFormModal({
    isOpen,
    isEditing,
    values,
    suppliers,
    products,
    isSubmitting,
    errorMessage,
    fieldErrors,
    onHeaderChange,
    onItemChange,
    onAddItem,
    onRemoveItem,
    onClose,
    onSubmit,
}: PurchaseFormModalProps) {
    const supplierInputRef = useRef<HTMLButtonElement | null>(null);
    const onCloseRef = useRef(onClose);
    const isSubmittingRef = useRef(isSubmitting);

    /*
     * Stores IDs from the previous render so we can detect when a
     * brand-new product row has been added.
     */
    const previousItemIdsRef = useRef<string[]>([]);

    /*
     * Only one purchase item stays expanded.
     */
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    const supplierSearchOptions = useMemo<SearchableSelectOption[]>(
        () =>
            suppliers.map((supplier) => ({
                value: String(supplier.id),
                label: supplier.name,
                searchText: `${supplier.name} ${supplier.id}`,
            })),
        [suppliers],
    );

    const productSearchOptions = useMemo<SearchableSelectOption[]>(
        () =>
            products.map((product) => {
                const productWithVariants = product as PurchaseProductWithVariants;
                const variants = productWithVariants.variants ?? [];

                const variantSearchText = variants
                    .map((variant) =>
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
                    value: String(product.id),
                    label: product.name,
                    secondary:
                        variants.length > 0
                            ? `${product.category.name} • ${variants.length} variant${variants.length === 1 ? '' : 's'}`
                            : `${product.category.name} • ${product.unit}`,
                    searchText:
                        `${product.name} ${product.category.name} ${product.unit} ${product.id} ${variantSearchText}`,
                };
            }),
        [products],
    );

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        isSubmittingRef.current = isSubmitting;
    }, [isSubmitting]);

    /*
     * Accordion management.
     *
     * When a new product row is added:
     * - old product automatically collapses
     * - new product automatically expands
     */
    useEffect(() => {
        if (!isOpen) {
            previousItemIdsRef.current = [];
            setExpandedRowId(null);
            return;
        }

        const currentIds = values.items.map((item) => String(item.row_id));
        const previousIds = previousItemIdsRef.current;
        const addedId = currentIds.find((id) => !previousIds.includes(id));

        if (addedId) {
            setExpandedRowId(addedId);
        } else if (
            currentIds.length > 0
            && (!expandedRowId || !currentIds.includes(expandedRowId))
        ) {
            setExpandedRowId(currentIds[0]);
        }

        previousItemIdsRef.current = currentIds;
    }, [isOpen, values.items, expandedRowId]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const previouslyFocused =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;

        document.body.style.overflow = 'hidden';

        const focusTimer = window.setTimeout(() => {
            supplierInputRef.current?.focus();
        }, 80);

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape' && !isSubmittingRef.current) {
                onCloseRef.current();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.clearTimeout(focusTimer);
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
            previouslyFocused?.focus();
        };
    }, [isOpen]);

    if (!isOpen || typeof document === 'undefined') {
        return null;
    }

    /* =====================================================
       TOTALS
       ===================================================== */

    const itemSubtotal = values.items.reduce(
        (total, item) => total + numberValue(item.quantity) * numberValue(item.unit_cost),
        0,
    );

    const itemDiscount = values.items.reduce(
        (total, item) => total + numberValue(item.discount),
        0,
    );

    const purchaseDiscount = numberValue(values.discount);
    const additionalCost = numberValue(values.additional_cost);
    const grandTotal = itemSubtotal - itemDiscount - purchaseDiscount + additionalCost;

    /* =====================================================
       HELPERS
       ===================================================== */

    const getFieldError = (field: string): string | undefined => fieldErrors[field]?.[0];

    const changeExtendedItemField = (
        index: number,
        field: PurchaseItemExtensionField,
        value: string,
    ): void => {
        onItemChange(index, field as keyof PurchaseItemFormValues, value);
    };

    const handleProductChange = (
        index: number,
        currentItem: PurchaseItemFormValues,
        productId: string,
    ): void => {
        onItemChange(index, 'product_id', productId);

        /*
         * A newly selected parent product must never keep the
         * previous product's variant or prices.
         */
        changeExtendedItemField(index, 'product_variant_id', '');
        onItemChange(index, 'unit_cost', '');
        onItemChange(index, 'selling_price', '');

        const nextProduct = products.find((product) => String(product.id) === productId);
        const productWithVariants = nextProduct as PurchaseProductWithVariants | undefined;
        const variants = productWithVariants?.variants ?? [];

        /*
         * Package variants are independent stock items. They are
         * deliberately kept separate from the Bag -> Kg dual-unit
         * conversion system.
         */
        if (variants.length > 0) {
            changeExtendedItemField(index, 'is_dual_unit', '0');
            changeExtendedItemField(index, 'conversion_factor', '');
            changeExtendedItemField(index, 'secondary_unit', '');
            changeExtendedItemField(index, 'secondary_selling_price', '');
            return;
        }

        if (!isBagUnit(nextProduct?.unit)) {
            changeExtendedItemField(index, 'is_dual_unit', '0');
            changeExtendedItemField(index, 'conversion_factor', '');
            changeExtendedItemField(index, 'secondary_unit', '');
            changeExtendedItemField(index, 'secondary_selling_price', '');
            return;
        }

        if (!getExtendedItemValue(currentItem, 'secondary_unit')) {
            changeExtendedItemField(index, 'secondary_unit', 'Kg');
        }
    };

    const handleVariantChange = (
        index: number,
        variantId: string,
    ): void => {
        changeExtendedItemField(index, 'product_variant_id', variantId);

        /*
         * Each package size has its own purchase and selling price.
         * Clearing these values prevents a price from a previously
         * selected size being accidentally reused.
         */
        onItemChange(index, 'unit_cost', '');
        onItemChange(index, 'selling_price', '');
    };

    const handleDualUnitToggle = (
        index: number,
        item: PurchaseItemFormValues,
        enabled: boolean,
    ): void => {
        changeExtendedItemField(index, 'is_dual_unit', enabled ? '1' : '0');

        if (!enabled) {
            return;
        }

        if (!getExtendedItemValue(item, 'secondary_unit')) {
            changeExtendedItemField(index, 'secondary_unit', 'Kg');
        }

        if (!getExtendedItemValue(item, 'conversion_factor')) {
            changeExtendedItemField(index, 'conversion_factor', '50');
        }
    };

    const handleAddProduct = (): void => {
        /*
         * Visually collapse the current row immediately. When the
         * parent creates the new row, the effect above expands it.
         */
        setExpandedRowId(null);
        onAddItem();
    };

    const supplierError = getFieldError('supplier_id');
    const purchaseDateError = getFieldError('purchase_date');

    /* =====================================================
       RENDER
       ===================================================== */

    return createPortal(
        <div id="purchase-form-modal">
            <style>{purchaseFormStyles}</style>

            <div
                className="pfm-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget && !isSubmitting) {
                        onClose();
                    }
                }}
            >
                <section
                    className="pfm-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="purchase-form-title"
                >
                    {/* HEADER */}

                    <header className="pfm-header">
                        <div className="pfm-header-main">
                            <span className="pfm-header-icon">
                                <Icon name="receipt" />
                            </span>

                            <div>
                                <span className="pfm-kicker">Purchase Management</span>
                                <h2 id="purchase-form-title" className="pfm-title">
                                    {isEditing ? 'Edit Draft Purchase' : 'Add New Purchase'}
                                </h2>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="pfm-close"
                            aria-label="Close purchase form"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            <Icon name="close" />
                        </button>
                    </header>

                    <form className="pfm-form" noValidate onSubmit={onSubmit}>
                        <div className="pfm-body">
                            {errorMessage && (
                                <div className="pfm-alert" role="alert">
                                    <Icon name="alert" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* PURCHASE INFORMATION */}

                            <section className="pfm-section">
                                <header className="pfm-section-header">
                                    <div className="pfm-section-heading">
                                        <span className="pfm-section-icon">
                                            <Icon name="supplier" />
                                        </span>

                                        <h3 className="pfm-section-title">
                                            Purchase Information
                                        </h3>
                                    </div>
                                </header>

                                <div className="pfm-header-grid">
                                    {/* SUPPLIER */}

                                    <div className="pfm-field">
                                        <span className="pfm-label">
                                            Supplier
                                            <span className="pfm-required"> *</span>
                                        </span>

                                        <span className="pfm-control-wrap">
                                            <span className="pfm-control-icon">
                                                <Icon name="supplier" />
                                            </span>

                                            <SearchableSelect
                                                triggerRef={supplierInputRef}
                                                value={values.supplier_id}
                                                options={supplierSearchOptions}
                                                placeholder="Select a supplier"
                                                searchPlaceholder="Search supplier..."
                                                emptyMessage="No supplier matches your search."
                                                disabled={isSubmitting}
                                                hasError={Boolean(supplierError)}
                                                withIcon
                                                ariaLabel="Select supplier"
                                                onChange={(supplierId) => {
                                                    onHeaderChange('supplier_id', supplierId);
                                                }}
                                            />
                                        </span>

                                        {supplierError && (
                                            <p className="pfm-field-error">{supplierError}</p>
                                        )}
                                    </div>

                                    {/* PURCHASE DATE */}

                                    <label className="pfm-field">
                                        <span className="pfm-label">
                                            Purchase Date
                                            <span className="pfm-required"> *</span>
                                        </span>

                                        <span className="pfm-control-wrap">
                                            <span className="pfm-control-icon">
                                                <Icon name="calendar" />
                                            </span>

                                            <input
                                                type="date"
                                                className={
                                                    purchaseDateError
                                                        ? 'pfm-input with-icon has-error'
                                                        : 'pfm-input with-icon'
                                                }
                                                value={values.purchase_date}
                                                disabled={isSubmitting}
                                                required
                                                onChange={(event) => {
                                                    onHeaderChange('purchase_date', event.target.value);
                                                }}
                                            />
                                        </span>

                                        {purchaseDateError && (
                                            <p className="pfm-field-error">{purchaseDateError}</p>
                                        )}
                                    </label>

                                    {/* INVOICE */}

                                    <label className="pfm-field">
                                        <span className="pfm-field-header">
                                            <span className="pfm-label">
                                                Supplier Invoice
                                                <span className="pfm-optional">Optional</span>
                                            </span>
                                            <span className="pfm-counter">
                                                {values.supplier_invoice_number.length}/120
                                            </span>
                                        </span>

                                        <span className="pfm-control-wrap">
                                            <span className="pfm-control-icon">
                                                <Icon name="invoice" />
                                            </span>

                                            <input
                                                type="text"
                                                className="pfm-input with-icon"
                                                value={values.supplier_invoice_number}
                                                maxLength={120}
                                                disabled={isSubmitting}
                                                placeholder="Invoice or reference number"
                                                onChange={(event) => {
                                                    onHeaderChange(
                                                        'supplier_invoice_number',
                                                        event.target.value,
                                                    );
                                                }}
                                            />
                                        </span>
                                    </label>

                                    {/* DISCOUNT */}

                                    {/* <label className="pfm-field">
                                        <span className="pfm-label">
                                            Purchase Discount
                                            <span className="pfm-optional">Optional</span>
                                        </span>

                                        <span className="pfm-control-wrap">
                                            <span className="pfm-currency-prefix">LKR</span>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                className="pfm-input with-currency"
                                                min="0"
                                                step="0.01"
                                                value={values.discount}
                                                disabled={isSubmitting}
                                                onChange={(event) => {
                                                    onHeaderChange('discount', event.target.value);
                                                }}
                                            />
                                        </span>
                                    </label> */}

                                    {/* ADDITIONAL COST */}

                                    {/* <label className="pfm-field">
                                        <span className="pfm-label">
                                            Additional Cost
                                            <span className="pfm-optional">Optional</span>
                                        </span>

                                        <span className="pfm-control-wrap">
                                            <span className="pfm-currency-prefix">LKR</span>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                className="pfm-input with-currency"
                                                min="0"
                                                step="0.01"
                                                value={values.additional_cost}
                                                disabled={isSubmitting}
                                                onChange={(event) => {
                                                    onHeaderChange('additional_cost', event.target.value);
                                                }}
                                            />
                                        </span>
                                    </label> */}

                                    {/* NOTES */}

                                    <label className="pfm-field pfm-notes-field">
                                        <span className="pfm-field-header">
                                            <span className="pfm-label">
                                                Purchase Notes
                                                <span className="pfm-optional">Optional</span>
                                            </span>
                                            <span className="pfm-counter">
                                                {values.notes.length}/2000
                                            </span>
                                        </span>

                                        <span className="pfm-control-wrap">
                                            <span className="pfm-control-icon top">
                                                <Icon name="note" />
                                            </span>

                                            <textarea
                                                className="pfm-textarea with-icon"
                                                value={values.notes}
                                                maxLength={2000}
                                                rows={2}
                                                disabled={isSubmitting}
                                                placeholder="Payment terms, delivery notes or internal comments"
                                                onChange={(event) => {
                                                    onHeaderChange('notes', event.target.value);
                                                }}
                                            />
                                        </span>
                                    </label>
                                </div>
                            </section>

                            {/* PRODUCT WORKSPACE */}

                            <div className="pfm-workspace">
                                <section className="pfm-section">
                                    <header className="pfm-section-header">
                                        <div className="pfm-section-heading">
                                            <span className="pfm-section-icon">
                                                <Icon name="package" />
                                            </span>

                                            <h3 className="pfm-section-title">
                                                Purchased Products
                                            </h3>
                                        </div>

                                        <button
                                            type="button"
                                            className="pfm-add-item"
                                            disabled={isSubmitting}
                                            onClick={handleAddProduct}
                                        >
                                            <Icon name="plus" />
                                            Add Product
                                        </button>
                                    </header>

                                    <div className="pfm-items-list">
                                        {values.items.map((item, index) => {
                                            const rowId = String(item.row_id);
                                            const isExpanded = expandedRowId === rowId;

                                            const selectedProduct = products.find(
                                                (product) => String(product.id) === item.product_id,
                                            );

                                            const selectedProductWithVariants =
                                                selectedProduct as PurchaseProductWithVariants | undefined;

                                            const productVariants =
                                                selectedProductWithVariants?.variants ?? [];

                                            const hasVariants = productVariants.length > 0;

                                            const selectedVariantId = getExtendedItemValue(
                                                item,
                                                'product_variant_id',
                                            );

                                            const selectedVariant = productVariants.find(
                                                (variant) => String(variant.id) === selectedVariantId,
                                            ) ?? null;

                                            const variantSearchOptions: SearchableSelectOption[] =
                                                productVariants.map((variant) => ({
                                                    value: String(variant.id),
                                                    label: variant.display_name,
                                                    secondary: [
                                                        variant.package_unit,
                                                        variant.sku ? `SKU: ${variant.sku}` : '',
                                                        variant.barcode ? `Barcode: ${variant.barcode}` : '',
                                                        !variant.is_active ? 'Inactive' : '',
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' • '),
                                                    searchText: `${variant.display_name} ${variant.size_value} ${variant.size_unit} ${variant.package_unit} ${variant.sku ?? ''} ${variant.barcode ?? ''}`,
                                                }));

                                            const productUnit = selectedProduct?.unit ?? '';
                                            const productCategory =
                                                selectedProduct?.category?.name ?? 'No category';

                                            const effectiveUnit =
                                                selectedVariant?.package_unit || productUnit;

                                            const priceUnitLabel =
                                                selectedVariant?.display_name || effectiveUnit || 'Unit';

                                            const requiresVariantSelection =
                                                hasVariants && !selectedVariant;

                                            /*
                                             * Variant packages and dual-unit Bag conversion are
                                             * separate inventory concepts.
                                             */
                                            const isBagProduct =
                                                !hasVariants && isBagUnit(productUnit);

                                            const dualUnitEnabled = isEnabledFlag(
                                                getExtendedItemValue(item, 'is_dual_unit', '0'),
                                            );

                                            const conversionFactor = numberValue(
                                                getExtendedItemValue(item, 'conversion_factor'),
                                            );

                                            const secondaryUnit =
                                                getExtendedItemValue(item, 'secondary_unit', 'Kg') || 'Kg';

                                            const secondarySellingPrice = numberValue(
                                                getExtendedItemValue(item, 'secondary_selling_price'),
                                            );

                                            const quantity = numberValue(item.quantity);
                                            const unitCost = numberValue(item.unit_cost);
                                            const sellingPrice = numberValue(item.selling_price);
                                            const itemDiscountValue = numberValue(item.discount);
                                            const lineTotal = quantity * unitCost - itemDiscountValue;

                                            const totalBaseStock =
                                                dualUnitEnabled && conversionFactor > 0
                                                    ? quantity * conversionFactor
                                                    : quantity;

                                            const costPerKg =
                                                dualUnitEnabled && conversionFactor > 0
                                                    ? unitCost / conversionFactor
                                                    : 0;

                                            const fullBagProfit = sellingPrice - unitCost;
                                            const looseKgProfit = secondarySellingPrice - costPerKg;

                                            const productError = getFieldError(
                                                `items.${index}.product_id`,
                                            );
                                            const variantError = getFieldError(
                                                `items.${index}.product_variant_id`,
                                            );
                                            const quantityError = getFieldError(
                                                `items.${index}.quantity`,
                                            );
                                            const unitCostError = getFieldError(
                                                `items.${index}.unit_cost`,
                                            );
                                            const sellingPriceError = getFieldError(
                                                `items.${index}.selling_price`,
                                            );
                                            const conversionError = getFieldError(
                                                `items.${index}.conversion_factor`,
                                            );
                                            const secondarySellingPriceError = getFieldError(
                                                `items.${index}.secondary_selling_price`,
                                            );
                                            const expiryError = getFieldError(
                                                `items.${index}.expiry_date`,
                                            );

                                            return (
                                                <article
                                                    key={item.row_id}
                                                    className={
                                                        isExpanded
                                                            ? 'pfm-item-card expanded'
                                                            : 'pfm-item-card collapsed'
                                                    }
                                                >
                                                    {/* PRODUCT CARD HEADER */}

                                                    <header className="pfm-item-header">
                                                        <div className="pfm-item-heading">
                                                            <span className="pfm-item-number">
                                                                Item {index + 1}
                                                            </span>

                                                            <strong
                                                                className="pfm-item-product"
                                                                title={
                                                                    selectedProduct?.name ??
                                                                    'Product not selected'
                                                                }
                                                            >
                                                                {selectedProduct?.name ?? 'Select a product'}
                                                            </strong>

                                                            {selectedProduct && (
                                                                <span className="pfm-unit-badge">
                                                                    <Icon
                                                                        name={isBagProduct ? 'bag' : 'package'}
                                                                    />
                                                                    {selectedVariant
                                                                        ? selectedVariant.display_name
                                                                        : hasVariants
                                                                            ? `${productVariants.length} Variants`
                                                                            : productUnit || 'Unit'}
                                                                </span>
                                                            )}

                                                            {!isExpanded && selectedProduct && (
                                                                <div className="pfm-collapsed-summary">
                                                                    {selectedVariant && (
                                                                        <span className="pfm-mini-summary variant">
                                                                            Variant:
                                                                            <strong>
                                                                                {selectedVariant.display_name}
                                                                            </strong>
                                                                        </span>
                                                                    )}

                                                                    <span className="pfm-mini-summary">
                                                                        Qty:
                                                                        <strong>
                                                                            {formatQuantity(quantity)} {effectiveUnit}
                                                                        </strong>
                                                                    </span>

                                                                    <span className="pfm-mini-summary">
                                                                        Cost:
                                                                        <strong>
                                                                            {currencyFormatter.format(unitCost)}
                                                                        </strong>
                                                                    </span>

                                                                    <span className="pfm-mini-summary">
                                                                        Sell:
                                                                        <strong>
                                                                            {currencyFormatter.format(sellingPrice)}
                                                                        </strong>
                                                                    </span>

                                                                    <span className="pfm-mini-summary total">
                                                                        Total:
                                                                        <strong>
                                                                            {currencyFormatter.format(
                                                                                Math.max(0, lineTotal),
                                                                            )}
                                                                        </strong>
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="pfm-item-header-actions">
                                                            {isExpanded && (
                                                                <span className="pfm-line-total">
                                                                    Purchase Total:{' '}
                                                                    {currencyFormatter.format(
                                                                        Math.max(0, lineTotal),
                                                                    )}
                                                                </span>
                                                            )}

                                                            <button
                                                                type="button"
                                                                className="pfm-collapse-item"
                                                                disabled={isSubmitting}
                                                                onClick={() => {
                                                                    setExpandedRowId(
                                                                        isExpanded ? null : rowId,
                                                                    );
                                                                }}
                                                            >
                                                                <Icon name={isExpanded ? 'collapse' : 'edit'} />
                                                                {isExpanded ? 'Minimize' : 'Open'}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="pfm-remove-item"
                                                                disabled={
                                                                    isSubmitting || values.items.length === 1
                                                                }
                                                                onClick={() => onRemoveItem(index)}
                                                            >
                                                                <Icon name="trash" />
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </header>

                                                    {/* PRODUCT BODY */}

                                                    {isExpanded && (
                                                        <div className="pfm-item-body">
                                                            <div className={hasVariants ? 'pfm-item-main-grid has-variant' : 'pfm-item-main-grid'}>
                                                                {/* PRODUCT */}

                                                                <div className="pfm-field">
                                                                    <span className="pfm-label pfm-main-field-label">
                                                                        Product
                                                                        <span className="pfm-required"> *</span>
                                                                    </span>

                                                                    <SearchableSelect
                                                                        value={item.product_id}
                                                                        options={productSearchOptions}
                                                                        placeholder="Select a product"
                                                                        searchPlaceholder="Search product, category or unit..."
                                                                        emptyMessage="No product matches your search."
                                                                        disabled={isSubmitting}
                                                                        hasError={Boolean(productError)}
                                                                        ariaLabel={`Select product for item ${index + 1}`}
                                                                        onChange={(productId) => {
                                                                            handleProductChange(
                                                                                index,
                                                                                item,
                                                                                productId,
                                                                            );
                                                                        }}
                                                                    />

                                                                    <div className="pfm-main-field-feedback">
                                                                        {productError ? (
                                                                            <p className="pfm-field-error">
                                                                                {productError}
                                                                            </p>
                                                                        ) : selectedProduct ? (
                                                                            <span className="pfm-help">
                                                                                {productCategory} • {productUnit}
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>

                                                                {/* PRODUCT VARIANT */}

                                                                {hasVariants && (
                                                                    <div className="pfm-field">
                                                                        <span className="pfm-label pfm-main-field-label">
                                                                            Package Variant
                                                                            <span className="pfm-required"> *</span>
                                                                        </span>

                                                                        <SearchableSelect
                                                                            value={selectedVariantId}
                                                                            options={variantSearchOptions}
                                                                            placeholder="Select package size"
                                                                            searchPlaceholder="Search size, SKU or barcode..."
                                                                            emptyMessage="No variant matches your search."
                                                                            disabled={isSubmitting || !selectedProduct}
                                                                            hasError={Boolean(variantError)}
                                                                            ariaLabel={`Select package variant for item ${index + 1}`}
                                                                            onChange={(variantId) => {
                                                                                handleVariantChange(
                                                                                    index,
                                                                                    variantId,
                                                                                );
                                                                            }}
                                                                        />

                                                                        <div className="pfm-main-field-feedback">
                                                                            {variantError ? (
                                                                                <p className="pfm-field-error">
                                                                                    {variantError}
                                                                                </p>
                                                                            ) : selectedVariant ? (
                                                                                <span className="pfm-help pfm-variant-help">
                                                                                    <strong>{selectedVariant.display_name}</strong>
                                                                                    {' • '}
                                                                                    {selectedVariant.package_unit}
                                                                                    {selectedVariant.sku
                                                                                        ? ` • ${selectedVariant.sku}`
                                                                                        : ''}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="pfm-help pfm-variant-required-help">
                                                                                    Select a package size before entering quantity and prices.
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* QUANTITY */}

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label pfm-main-field-label">
                                                                        Quantity
                                                                        {effectiveUnit && (
                                                                            <> ({effectiveUnit})</>
                                                                        )}
                                                                        <span className="pfm-required"> *</span>
                                                                    </span>

                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        className={
                                                                            quantityError
                                                                                ? 'pfm-input has-error'
                                                                                : 'pfm-input'
                                                                        }
                                                                        min="0.001"
                                                                        step="0.001"
                                                                        value={item.quantity}
                                                                        disabled={isSubmitting || requiresVariantSelection}
                                                                        required
                                                                        placeholder="0"
                                                                        onChange={(event) => {
                                                                            onItemChange(
                                                                                index,
                                                                                'quantity',
                                                                                event.target.value,
                                                                            );
                                                                        }}
                                                                    />

                                                                    <div className="pfm-main-field-feedback">
                                                                        {quantityError && (
                                                                            <p className="pfm-field-error">
                                                                                {quantityError}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </label>

                                                                {/* PURCHASE COST */}

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label pfm-main-field-label">
                                                                        Purchase Cost per {priceUnitLabel}
                                                                        <span className="pfm-required"> *</span>
                                                                    </span>

                                                                    <span className="pfm-control-wrap">
                                                                        <span className="pfm-currency-prefix">
                                                                            LKR
                                                                        </span>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            className={
                                                                                unitCostError
                                                                                    ? 'pfm-input with-currency has-error'
                                                                                    : 'pfm-input with-currency'
                                                                            }
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={item.unit_cost}
                                                                            disabled={isSubmitting || requiresVariantSelection}
                                                                            required
                                                                            placeholder="0.00"
                                                                            onChange={(event) => {
                                                                                onItemChange(
                                                                                    index,
                                                                                    'unit_cost',
                                                                                    event.target.value,
                                                                                );
                                                                            }}
                                                                        />
                                                                    </span>

                                                                    <div className="pfm-main-field-feedback">
                                                                        {unitCostError && (
                                                                            <p className="pfm-field-error">
                                                                                {unitCostError}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </label>

                                                                {/* SELLING PRICE */}

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label pfm-main-field-label">
                                                                        Selling Price per {priceUnitLabel}
                                                                        <span className="pfm-required"> *</span>
                                                                    </span>

                                                                    <span className="pfm-control-wrap">
                                                                        <span className="pfm-currency-prefix">
                                                                            LKR
                                                                        </span>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            className={
                                                                                sellingPriceError
                                                                                    ? 'pfm-input with-currency has-error'
                                                                                    : 'pfm-input with-currency'
                                                                            }
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={item.selling_price}
                                                                            disabled={isSubmitting || requiresVariantSelection}
                                                                            required
                                                                            placeholder="0.00"
                                                                            onChange={(event) => {
                                                                                onItemChange(
                                                                                    index,
                                                                                    'selling_price',
                                                                                    event.target.value,
                                                                                );
                                                                            }}
                                                                        />
                                                                    </span>

                                                                    <div className="pfm-main-field-feedback">
                                                                        {sellingPriceError && (
                                                                            <p className="pfm-field-error">
                                                                                {sellingPriceError}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </label>

                                                                {/* ITEM DISCOUNT */}

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label pfm-main-field-label">
                                                                        Item Discount
                                                                    </span>

                                                                    <span className="pfm-control-wrap">
                                                                        <span className="pfm-currency-prefix">
                                                                            LKR
                                                                        </span>
                                                                        <input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            className="pfm-input with-currency"
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={item.discount}
                                                                            disabled={isSubmitting}
                                                                            placeholder="0.00"
                                                                            onChange={(event) => {
                                                                                onItemChange(
                                                                                    index,
                                                                                    'discount',
                                                                                    event.target.value,
                                                                                );
                                                                            }}
                                                                        />
                                                                    </span>

                                                                    <div className="pfm-main-field-feedback" />
                                                                </label>
                                                            </div>

                                                            {/* DUAL UNIT */}

                                                            {isBagProduct && (
                                                                <section className="pfm-dual-unit-card">
                                                                    <header className="pfm-dual-header">
                                                                        <div className="pfm-dual-heading">
                                                                            <span className="pfm-dual-icon">
                                                                                <Icon name="scale" />
                                                                            </span>

                                                                            <h4 className="pfm-dual-title">
                                                                                Full Bag + Loose Kg Selling
                                                                            </h4>
                                                                        </div>

                                                                        <label className="pfm-switch-label">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={dualUnitEnabled}
                                                                                disabled={isSubmitting}
                                                                                onChange={(event) => {
                                                                                    handleDualUnitToggle(
                                                                                        index,
                                                                                        item,
                                                                                        event.target.checked,
                                                                                    );
                                                                                }}
                                                                            />
                                                                            Enable Loose Kg Sales
                                                                        </label>
                                                                    </header>

                                                                    {dualUnitEnabled && (
                                                                        <>
                                                                            <div className="pfm-dual-grid">
                                                                                <label className="pfm-field">
                                                                                    <span className="pfm-label">
                                                                                        Weight in One Bag
                                                                                        <span className="pfm-required">
                                                                                            {' '}*
                                                                                        </span>
                                                                                    </span>

                                                                                    <span className="pfm-control-wrap">
                                                                                        <input
                                                                                            type="number"
                                                                                            inputMode="decimal"
                                                                                            className={
                                                                                                conversionError
                                                                                                    ? 'pfm-input with-suffix has-error'
                                                                                                    : 'pfm-input with-suffix'
                                                                                            }
                                                                                            min="0.001"
                                                                                            step="0.001"
                                                                                            value={getExtendedItemValue(
                                                                                                item,
                                                                                                'conversion_factor',
                                                                                            )}
                                                                                            disabled={isSubmitting}
                                                                                            required
                                                                                            placeholder="Example: 50"
                                                                                            onChange={(event) => {
                                                                                                changeExtendedItemField(
                                                                                                    index,
                                                                                                    'conversion_factor',
                                                                                                    event.target.value,
                                                                                                );
                                                                                            }}
                                                                                        />
                                                                                        <span className="pfm-suffix">
                                                                                            Kg
                                                                                        </span>
                                                                                    </span>

                                                                                    {conversionError && (
                                                                                        <p className="pfm-field-error">
                                                                                            {conversionError}
                                                                                        </p>
                                                                                    )}
                                                                                </label>

                                                                                <label className="pfm-field">
                                                                                    <span className="pfm-label">
                                                                                        Loose Selling Unit
                                                                                    </span>

                                                                                    <select
                                                                                        className="pfm-select"
                                                                                        value={secondaryUnit}
                                                                                        disabled
                                                                                    >
                                                                                        <option value="Kg">
                                                                                            Kilogram — Kg
                                                                                        </option>
                                                                                    </select>
                                                                                </label>

                                                                                <label className="pfm-field">
                                                                                    <span className="pfm-label">
                                                                                        Selling Price for 1 Kg
                                                                                        <span className="pfm-required">
                                                                                            {' '}*
                                                                                        </span>
                                                                                    </span>

                                                                                    <span className="pfm-control-wrap">
                                                                                        <span className="pfm-currency-prefix">
                                                                                            LKR
                                                                                        </span>
                                                                                        <input
                                                                                            type="number"
                                                                                            inputMode="decimal"
                                                                                            className={
                                                                                                secondarySellingPriceError
                                                                                                    ? 'pfm-input with-currency has-error'
                                                                                                    : 'pfm-input with-currency'
                                                                                            }
                                                                                            min="0"
                                                                                            step="0.01"
                                                                                            value={getExtendedItemValue(
                                                                                                item,
                                                                                                'secondary_selling_price',
                                                                                            )}
                                                                                            disabled={isSubmitting}
                                                                                            required
                                                                                            placeholder="Price per 1 Kg"
                                                                                            onChange={(event) => {
                                                                                                changeExtendedItemField(
                                                                                                    index,
                                                                                                    'secondary_selling_price',
                                                                                                    event.target.value,
                                                                                                );
                                                                                            }}
                                                                                        />
                                                                                    </span>

                                                                                    {secondarySellingPriceError && (
                                                                                        <p className="pfm-field-error">
                                                                                            {secondarySellingPriceError}
                                                                                        </p>
                                                                                    )}
                                                                                </label>
                                                                            </div>

                                                                            <div className="pfm-preview-grid">
                                                                                <div className="pfm-preview-box">
                                                                                    <span>
                                                                                        Stock After Receiving
                                                                                    </span>
                                                                                    <strong>
                                                                                        {formatQuantity(totalBaseStock)}{' '}
                                                                                        Kg
                                                                                    </strong>
                                                                                </div>

                                                                                <div className="pfm-preview-box">
                                                                                    <span>Purchase Cost per Kg</span>
                                                                                    <strong>
                                                                                        {currencyFormatter.format(
                                                                                            Math.max(0, costPerKg),
                                                                                        )}
                                                                                    </strong>
                                                                                </div>

                                                                                <div className="pfm-preview-box profit">
                                                                                    <span>Profit per Full Bag</span>
                                                                                    <strong>
                                                                                        {currencyFormatter.format(
                                                                                            fullBagProfit,
                                                                                        )}
                                                                                    </strong>
                                                                                </div>

                                                                                <div className="pfm-preview-box profit">
                                                                                    <span>Profit per Loose Kg</span>
                                                                                    <strong>
                                                                                        {currencyFormatter.format(
                                                                                            looseKgProfit,
                                                                                        )}
                                                                                    </strong>
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </section>
                                                            )}

                                                            {/* BATCH DETAILS */}

                                                            <div className="pfm-batch-heading">
                                                                <Icon name="batch" />
                                                                Optional Stock Batch Details
                                                            </div>

                                                            <div className="pfm-item-batch-grid">
                                                                <label className="pfm-field">
                                                                    <span className="pfm-field-header">
                                                                        <span className="pfm-label">
                                                                            Batch Number
                                                                        </span>
                                                                        <span className="pfm-counter">
                                                                            {item.batch_number.length}/120
                                                                        </span>
                                                                    </span>

                                                                    <input
                                                                        type="text"
                                                                        className="pfm-input"
                                                                        value={item.batch_number}
                                                                        maxLength={120}
                                                                        disabled={isSubmitting}
                                                                        placeholder="Optional"
                                                                        onChange={(event) => {
                                                                            onItemChange(
                                                                                index,
                                                                                'batch_number',
                                                                                event.target.value,
                                                                            );
                                                                        }}
                                                                    />
                                                                </label>

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label">
                                                                        Manufactured Date
                                                                    </span>

                                                                    <input
                                                                        type="date"
                                                                        className="pfm-input"
                                                                        value={item.manufactured_date}
                                                                        disabled={isSubmitting}
                                                                        onChange={(event) => {
                                                                            onItemChange(
                                                                                index,
                                                                                'manufactured_date',
                                                                                event.target.value,
                                                                            );
                                                                        }}
                                                                    />
                                                                </label>

                                                                <label className="pfm-field">
                                                                    <span className="pfm-label">Expiry Date</span>

                                                                    <input
                                                                        type="date"
                                                                        className={
                                                                            expiryError
                                                                                ? 'pfm-input has-error'
                                                                                : 'pfm-input'
                                                                        }
                                                                        value={item.expiry_date}
                                                                        disabled={isSubmitting}
                                                                        onChange={(event) => {
                                                                            onItemChange(
                                                                                index,
                                                                                'expiry_date',
                                                                                event.target.value,
                                                                            );
                                                                        }}
                                                                    />

                                                                    {expiryError && (
                                                                        <p className="pfm-field-error">
                                                                            {expiryError}
                                                                        </p>
                                                                    )}
                                                                </label>

                                                                <label className="pfm-field">
                                                                    <span className="pfm-field-header">
                                                                        <span className="pfm-label">
                                                                            Item Notes
                                                                        </span>
                                                                        <span className="pfm-counter">
                                                                            {item.notes.length}/1000
                                                                        </span>
                                                                    </span>

                                                                    <input
                                                                        type="text"
                                                                        className="pfm-input"
                                                                        value={item.notes}
                                                                        maxLength={1000}
                                                                        disabled={isSubmitting}
                                                                        placeholder="Optional item note"
                                                                        onChange={(event) => {
                                                                            onItemChange(
                                                                                index,
                                                                                'notes',
                                                                                event.target.value,
                                                                            );
                                                                        }}
                                                                    />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* SUMMARY */}

                                <aside className="pfm-summary-column">
                                    <section className="pfm-summary-card">
                                        <header className="pfm-summary-header">
                                            <Icon name="money" />
                                            Purchase Summary
                                        </header>

                                        <div>
                                            <div className="pfm-summary-line">
                                                <span>Product Subtotal</span>
                                                <strong>{currencyFormatter.format(itemSubtotal)}</strong>
                                            </div>

                                            <div className="pfm-summary-line discount">
                                                <span>Item Discounts</span>
                                                <strong>-{currencyFormatter.format(itemDiscount)}</strong>
                                            </div>

                                            <div className="pfm-summary-line discount">
                                                <span>Purchase Discount</span>
                                                <strong>
                                                    -{currencyFormatter.format(purchaseDiscount)}
                                                </strong>
                                            </div>

                                            <div className="pfm-summary-line">
                                                <span>Additional Cost</span>
                                                <strong>
                                                    {currencyFormatter.format(additionalCost)}
                                                </strong>
                                            </div>

                                            <div className="pfm-summary-line">
                                                <span>Product Lines</span>
                                                <strong>{values.items.length}</strong>
                                            </div>

                                            <div className="pfm-summary-line total">
                                                <span>Grand Total</span>
                                                <strong>
                                                    {currencyFormatter.format(Math.max(0, grandTotal))}
                                                </strong>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="pfm-receive-card">
                                        <label className="pfm-receive-option">
                                            <input
                                                type="checkbox"
                                                checked={values.receive_now}
                                                disabled={isSubmitting}
                                                onChange={(event) => {
                                                    onHeaderChange(
                                                        'receive_now',
                                                        event.target.checked,
                                                    );
                                                }}
                                            />

                                            <span>
                                                <strong className="pfm-receive-title">
                                                    <Icon name="truck" />
                                                    Receive Stock Now
                                                </strong>

                                                <span className="pfm-receive-description">
                                                    Creates stock batches and makes quantities available
                                                    immediately. Variant products are received against the
                                                    selected package size, while dual-unit Bag stock is converted
                                                    into Kg.
                                                </span>
                                            </span>
                                        </label>
                                    </section>
                                </aside>
                            </div>
                        </div>

                        {/* FOOTER */}

                        <footer className="pfm-actions">
                            <span className="pfm-action-note">
                                <Icon name="info" />
                                Variant products require a package size before quantity, purchase cost and selling price can be entered.
                            </span>

                            <div className="pfm-action-buttons">
                                <button
                                    type="button"
                                    className="pfm-button pfm-cancel"
                                    disabled={isSubmitting}
                                    onClick={onClose}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="pfm-button pfm-submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className="pfm-spinner" />
                                    ) : values.receive_now ? (
                                        <Icon name="truck" />
                                    ) : (
                                        <Icon name="save" />
                                    )}

                                    {isSubmitting
                                        ? 'Saving Purchase...'
                                        : values.receive_now
                                            ? 'Save and Receive Stock'
                                            : isEditing
                                                ? 'Update Draft'
                                                : 'Save as Draft'}
                                </button>
                            </div>
                        </footer>
                    </form>
                </section>
            </div>
        </div>,
        document.body,
    );
}