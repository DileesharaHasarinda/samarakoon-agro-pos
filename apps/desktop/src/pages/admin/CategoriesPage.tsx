import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import CategoryFormModal
    from '../../components/categories/CategoryFormModal';

import DeleteCategoryModal
    from '../../components/categories/DeleteCategoryModal';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    createCategory,
    deleteCategory,
    getCategories,
    updateCategory,
} from '../../services/categoryService';

import type {
    ValidationErrors,
} from '../../types/auth';

import type {
    Category,
    CategoryPaginationMeta,
} from '../../types/category';

const initialPagination:
    CategoryPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null,
};

type IconName =
    | 'alert'
    | 'category'
    | 'check'
    | 'chevron-left'
    | 'chevron-right'
    | 'close'
    | 'edit'
    | 'plus'
    | 'refresh'
    | 'search'
    | 'trash';

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

        case 'category':
            return (
                <svg {...props}>
                    <rect
                        x="3"
                        y="3"
                        width="7"
                        height="7"
                        rx="1"
                    />

                    <rect
                        x="14"
                        y="3"
                        width="7"
                        height="7"
                        rx="1"
                    />

                    <rect
                        x="3"
                        y="14"
                        width="7"
                        height="7"
                        rx="1"
                    />

                    <rect
                        x="14"
                        y="14"
                        width="7"
                        height="7"
                        rx="1"
                    />
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

        case 'close':
            return (
                <svg {...props}>
                    <path d="m6 6 12 12M18 6 6 18" />
                </svg>
            );

        case 'edit':
            return (
                <svg {...props}>
                    <path d="M12 20h9" />

                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
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

        case 'trash':
        default:
            return (
                <svg {...props}>
                    <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6M10 11v5M14 11v5" />
                </svg>
            );
    }
}

function getCategoryDescription(
    category: Category,
): string {
    const value =
        category.description?.trim();

    return value
        || 'No description provided.';
}

const styles = `
#categories-page,
#categories-page *,
#categories-page *::before,
#categories-page *::after {
    box-sizing: border-box !important;
}

#categories-page {
    --cat-green-950: #052e16;
    --cat-green-900: #14532d;
    --cat-green-800: #166534;
    --cat-green-700: #15803d;
    --cat-green-100: #dcfce7;
    --cat-green-50: #f0fdf4;
    --cat-blue-700: #175cd3;
    --cat-blue-50: #eff8ff;
    --cat-red-700: #b42318;
    --cat-red-50: #fef3f2;
    --cat-text: #101828;
    --cat-text-secondary: #344054;
    --cat-muted: #667085;
    --cat-border: #d0d9d2;
    --cat-border-strong: #aebdb2;
    --cat-surface: #ffffff;
    --cat-page: #f5f8f6;

    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;

    flex-direction: column !important;
    gap: 14px !important;

    margin: 0 !important;
    padding: 0 !important;

    color: var(--cat-text) !important;

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

    background: transparent !important;

    isolation: isolate !important;
    -webkit-font-smoothing: antialiased !important;
}

#categories-page button,
#categories-page input,
#categories-page select {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#categories-page h1,
#categories-page h2,
#categories-page p {
    margin: 0 !important;
}

#categories-page .cat-header {
    display: flex !important;

    min-height: 98px !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 20px !important;

    padding: 18px 20px !important;

    background:
        linear-gradient(
            135deg,
            #ffffff,
            #f3fbf5
        ) !important;

    border:
        1px solid
        var(--cat-border) !important;

    border-radius: 14px !important;

    box-shadow:
        0 1px 3px
        rgba(
            16,
            24,
            40,
            0.07
        ) !important;
}

#categories-page .cat-header-copy {
    min-width: 0 !important;
}

#categories-page .cat-kicker {
    display: block !important;

    margin-bottom: 3px !important;

    color: var(--cat-green-700) !important;

    font-size: 11px !important;
    font-weight: 750 !important;
    letter-spacing: 0.055em !important;

    text-transform: uppercase !important;
}

#categories-page .cat-title {
    color: var(--cat-text) !important;

    font-size: 24px !important;
    font-weight: 740 !important;
    line-height: 1.2 !important;
    letter-spacing: -0.02em !important;
}

#categories-page .cat-subtitle {
    margin-top: 4px !important;

    color: var(--cat-muted) !important;

    font-size: 13px !important;
}

#categories-page .cat-header-actions {
    display: flex !important;

    flex: 0 0 auto !important;

    align-items: center !important;
    gap: 9px !important;
}

#categories-page .cat-total {
    display: inline-flex !important;

    min-height: 40px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 7px 10px !important;

    color: var(--cat-green-900) !important;

    font-size: 12px !important;
    font-weight: 700 !important;

    white-space: nowrap !important;

    background: var(--cat-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 9px !important;
}

#categories-page .cat-primary-button {
    display: inline-flex !important;

    min-height: 42px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;

    padding: 8px 13px !important;

    color: #ffffff !important;

    font-size: 13px !important;
    font-weight: 700 !important;

    background:
        var(--cat-green-700) !important;

    border:
        1px solid
        var(--cat-green-700) !important;

    border-radius: 9px !important;

    box-shadow:
        0 4px 12px
        rgba(
            21,
            128,
            61,
            0.18
        ) !important;

    cursor: pointer !important;
}

#categories-page .cat-primary-button:hover {
    background:
        var(--cat-green-800) !important;

    border-color:
        var(--cat-green-800) !important;
}

#categories-page .cat-primary-button svg {
    width: 17px !important;
    height: 17px !important;
}

#categories-page .cat-message {
    display: flex !important;

    min-height: 48px !important;

    align-items: center !important;
    gap: 9px !important;

    padding: 10px 12px !important;

    font-size: 13px !important;
    font-weight: 600 !important;

    border-radius: 10px !important;
}

#categories-page .cat-message.success {
    color: var(--cat-green-900) !important;

    background:
        var(--cat-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;
}

#categories-page .cat-message.error {
    color: var(--cat-red-700) !important;

    background:
        var(--cat-red-50) !important;

    border:
        1px solid
        #f3b5af !important;
}

#categories-page .cat-message > svg {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
}

#categories-page .cat-message-text {
    min-width: 0 !important;
    flex: 1 !important;
}

#categories-page .cat-message-close,
#categories-page .cat-retry-button {
    display: inline-flex !important;

    min-height: 32px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;

    padding: 5px 8px !important;

    color: inherit !important;

    font-size: 12px !important;
    font-weight: 650 !important;

    background:
        rgba(
            255,
            255,
            255,
            0.7
        ) !important;

    border:
        1px solid
        currentColor !important;

    border-radius: 7px !important;

    cursor: pointer !important;
}

#categories-page .cat-message-close {
    width: 32px !important;
    padding: 0 !important;
}

#categories-page .cat-message-close svg,
#categories-page .cat-retry-button svg {
    width: 14px !important;
    height: 14px !important;
}

#categories-page .cat-panel {
    display: flex !important;

    min-width: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background:
        var(--cat-surface) !important;

    border:
        1px solid
        var(--cat-border) !important;

    border-radius: 14px !important;

    box-shadow:
        0 1px 3px
        rgba(
            16,
            24,
            40,
            0.07
        ) !important;
}

#categories-page .cat-toolbar {
    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        auto !important;

    align-items: end !important;
    gap: 12px !important;

    padding: 14px !important;

    background: #ffffff !important;

    border-bottom:
        1px solid
        var(--cat-border) !important;
}

#categories-page .cat-field {
    display: grid !important;
    gap: 5px !important;
}

#categories-page .cat-label {
    color:
        var(
            --cat-text-secondary
        ) !important;

    font-size: 11px !important;
    font-weight: 650 !important;
}

#categories-page .cat-search-wrap {
    position: relative !important;
}

#categories-page .cat-search-icon {
    position: absolute !important;

    top: 50% !important;
    left: 12px !important;
    z-index: 2 !important;

    display: grid !important;

    width: 18px !important;
    height: 18px !important;

    place-items: center !important;

    margin: 0 !important;
    padding: 0 !important;

    color: var(--cat-muted) !important;

    transform: translateY(-50%) !important;

    pointer-events: none !important;
}

#categories-page .cat-search-icon svg {
    display: block !important;

    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
    max-width: 18px !important;
    min-height: 18px !important;
    max-height: 18px !important;

    margin: 0 !important;
    padding: 0 !important;

    flex: 0 0 18px !important;
}

#categories-page .cat-search-input,
#categories-page .cat-select {
    display: block !important;

    height: 42px !important;
    min-height: 42px !important;

    color: var(--cat-text) !important;

    font-size: 14px !important;
    font-weight: 500 !important;

    outline: none !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--cat-border-strong) !important;

    border-radius: 9px !important;
}

#categories-page .cat-search-input {
    width: 100% !important;

    padding:
        0
        42px
        0
        40px !important;

    background: #f8faf9 !important;
}

#categories-page .cat-search-input::placeholder {
    color: #7a8696 !important;
    opacity: 1 !important;
}

#categories-page .cat-clear-search {
    position: absolute !important;

    top: 50% !important;
    right: 5px !important;

    display: grid !important;

    width: 32px !important;
    height: 32px !important;

    place-items: center !important;

    padding: 0 !important;

    color: var(--cat-muted) !important;

    background: transparent !important;

    border: 0 !important;
    border-radius: 7px !important;

    transform:
        translateY(-50%) !important;

    cursor: pointer !important;
}

#categories-page .cat-clear-search:hover {
    color: var(--cat-text) !important;
    background: #eaf0ec !important;
}

#categories-page .cat-clear-search svg {
    width: 16px !important;
    height: 16px !important;
}

#categories-page .cat-page-size {
    display: grid !important;

    grid-template-columns:
        auto
        86px !important;

    align-items: center !important;
    gap: 8px !important;
}

#categories-page .cat-select {
    width: 86px !important;
    padding: 0 10px !important;
    cursor: pointer !important;
}

#categories-page .cat-search-input:focus,
#categories-page .cat-select:focus,
#categories-page button:focus-visible {
    outline: none !important;

    border-color:
        var(--cat-green-700) !important;

    box-shadow:
        0 0 0 4px
        rgba(
            21,
            128,
            61,
            0.14
        ) !important;
}

#categories-page .cat-table-wrap {
    display: block !important;

    width: 100% !important;
    min-width: 0 !important;

    overflow-x: auto !important;
}

#categories-page .cat-table {
    width: 100% !important;
    min-width: 760px !important;

    color: var(--cat-text) !important;

    font-size: 13px !important;

    background: #ffffff !important;

    border-collapse: collapse !important;
    table-layout: fixed !important;
}

#categories-page .cat-table th {
    height: 46px !important;

    padding: 10px 14px !important;

    color: #ffffff !important;

    font-size: 11px !important;
    font-weight: 700 !important;
    letter-spacing: 0.035em !important;

    text-align: left !important;
    text-transform: uppercase !important;

    background:
        var(--cat-green-900) !important;
}

#categories-page .cat-table th:first-child {
    width: 30% !important;
}

#categories-page .cat-table th:nth-child(2) {
    width: 48% !important;
}

#categories-page .cat-table th:last-child {
    width: 22% !important;
    text-align: right !important;
}

#categories-page .cat-table td {
    padding: 12px 14px !important;

    color:
        var(
            --cat-text-secondary
        ) !important;

    vertical-align: middle !important;

    border-bottom:
        1px solid
        #e5ebe6 !important;
}

#categories-page
.cat-table tbody tr:hover td {
    background:
        var(--cat-green-50) !important;
}

#categories-page .cat-name-cell {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;
    gap: 10px !important;
}

#categories-page .cat-initial {
    display: grid !important;

    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;

    place-items: center !important;

    color: #ffffff !important;

    font-size: 14px !important;
    font-weight: 750 !important;

    background:
        linear-gradient(
            145deg,
            var(--cat-green-900),
            var(--cat-green-700)
        ) !important;

    border-radius: 9px !important;
}

#categories-page .cat-name-copy {
    min-width: 0 !important;
}

#categories-page .cat-name {
    display: block !important;

    overflow: hidden !important;

    color: var(--cat-text) !important;

    font-size: 14px !important;
    font-weight: 700 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#categories-page .cat-id {
    display: block !important;

    margin-top: 2px !important;

    color: var(--cat-muted) !important;

    font-size: 10px !important;
}

#categories-page .cat-description {
    display: -webkit-box !important;

    overflow: hidden !important;

    color: var(--cat-muted) !important;

    font-size: 12px !important;
    line-height: 1.45 !important;

    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
}

#categories-page .cat-actions {
    display: flex !important;

    align-items: center !important;
    justify-content: flex-end !important;
    gap: 7px !important;
}

#categories-page .cat-action-button {
    display: inline-flex !important;

    min-height: 36px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;

    padding: 6px 9px !important;

    font-size: 12px !important;
    font-weight: 650 !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#categories-page .cat-edit {
    color: var(--cat-blue-700) !important;
    background: var(--cat-blue-50) !important;
    border: 1px solid #b9d8f5 !important;
}

#categories-page .cat-edit:hover {
    color: #ffffff !important;
    background: var(--cat-blue-700) !important;
    border-color: var(--cat-blue-700) !important;
}

#categories-page .cat-delete {
    color: var(--cat-red-700) !important;
    background: var(--cat-red-50) !important;
    border: 1px solid #f3b5af !important;
}

#categories-page .cat-delete:hover {
    color: #ffffff !important;
    background: var(--cat-red-700) !important;
    border-color: var(--cat-red-700) !important;
}

#categories-page .cat-action-button svg {
    width: 15px !important;
    height: 15px !important;
}

#categories-page .cat-state-cell {
    height: 300px !important;
    padding: 28px !important;
}

#categories-page .cat-state {
    display: flex !important;

    max-width: 420px !important;

    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 8px !important;

    margin: 0 auto !important;

    color: var(--cat-muted) !important;

    text-align: center !important;
}

#categories-page .cat-state-icon {
    display: grid !important;

    width: 48px !important;
    height: 48px !important;

    place-items: center !important;

    color: var(--cat-green-700) !important;

    background:
        var(--cat-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 11px !important;
}

#categories-page .cat-state-icon svg {
    width: 23px !important;
    height: 23px !important;
}

#categories-page .cat-state strong {
    color: var(--cat-text) !important;

    font-size: 16px !important;
    font-weight: 700 !important;
}

#categories-page .cat-state span {
    font-size: 12px !important;
}

#categories-page .cat-spinner {
    width: 36px !important;
    height: 36px !important;

    border:
        4px solid
        var(--cat-green-100) !important;

    border-top-color:
        var(--cat-green-700) !important;

    border-radius: 50% !important;

    animation:
        cat-spin
        700ms
        linear
        infinite !important;
}

@keyframes cat-spin {
    to {
        transform: rotate(360deg);
    }
}

#categories-page .cat-empty-button {
    display: inline-flex !important;

    min-height: 38px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;

    margin-top: 4px !important;
    padding: 7px 10px !important;

    color: #ffffff !important;

    font-size: 12px !important;
    font-weight: 700 !important;

    background:
        var(--cat-green-700) !important;

    border:
        1px solid
        var(--cat-green-700) !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#categories-page .cat-empty-button svg {
    width: 15px !important;
    height: 15px !important;
}

#categories-page .cat-mobile-list {
    display: none !important;
}

#categories-page .cat-pagination {
    display: flex !important;

    min-height: 62px !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 10px 14px !important;

    background: #ffffff !important;

    border-top:
        1px solid
        var(--cat-border) !important;
}

#categories-page .cat-pagination-info {
    color: var(--cat-muted) !important;
    font-size: 12px !important;
}

#categories-page .cat-pagination-info strong {
    color:
        var(
            --cat-text-secondary
        ) !important;

    font-weight: 700 !important;
}

#categories-page .cat-pagination-actions {
    display: flex !important;

    align-items: center !important;
    gap: 7px !important;
}

#categories-page .cat-page-indicator {
    display: inline-flex !important;

    min-height: 36px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 6px 9px !important;

    color:
        var(
            --cat-text-secondary
        ) !important;

    font-size: 11px !important;
    font-weight: 600 !important;

    white-space: nowrap !important;

    background: #f8faf9 !important;

    border:
        1px solid
        #e4e9e5 !important;

    border-radius: 8px !important;
}

#categories-page .cat-page-button {
    display: inline-flex !important;

    min-height: 36px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 5px !important;

    padding: 6px 9px !important;

    color: var(--cat-green-900) !important;

    font-size: 12px !important;
    font-weight: 650 !important;

    background:
        var(--cat-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#categories-page
.cat-page-button:hover:not(:disabled) {
    color: #ffffff !important;
    background: var(--cat-green-800) !important;
    border-color: var(--cat-green-800) !important;
}

#categories-page .cat-page-button:disabled {
    color: #98a2b3 !important;
    background: #f2f4f7 !important;
    border-color: #e4e7ec !important;
    cursor: not-allowed !important;
}

#categories-page .cat-page-button svg {
    width: 15px !important;
    height: 15px !important;
}

@media (max-width: 760px) {
    #categories-page .cat-header {
        align-items: stretch !important;
        flex-direction: column !important;
        padding: 16px !important;
    }

    #categories-page .cat-title {
        font-size: 21px !important;
    }

    #categories-page .cat-header-actions {
        display: grid !important;

        grid-template-columns:
            auto
            minmax(0, 1fr) !important;
    }

    #categories-page .cat-primary-button {
        width: 100% !important;
    }

    #categories-page .cat-toolbar {
        grid-template-columns: 1fr !important;
    }

    #categories-page .cat-page-size {
        grid-template-columns:
            minmax(0, 1fr)
            86px !important;
    }

    #categories-page .cat-table-wrap {
        display: none !important;
    }

    #categories-page .cat-mobile-list {
        display: flex !important;

        flex-direction: column !important;
        gap: 10px !important;

        padding: 12px !important;

        background:
            var(--cat-page) !important;
    }

    #categories-page .cat-mobile-card {
        display: flex !important;

        flex-direction: column !important;
        gap: 11px !important;

        padding: 12px !important;

        background: #ffffff !important;

        border:
            1px solid
            var(--cat-border) !important;

        border-radius: 10px !important;
    }

    #categories-page .cat-mobile-description {
        color: var(--cat-muted) !important;

        font-size: 12px !important;
        line-height: 1.45 !important;
    }

    #categories-page
    .cat-mobile-card
    .cat-actions {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #categories-page
    .cat-mobile-card
    .cat-action-button {
        width: 100% !important;
    }

    #categories-page .cat-mobile-state {
        display: flex !important;

        min-height: 250px !important;

        align-items: center !important;
        justify-content: center !important;

        padding: 24px !important;

        background: #ffffff !important;

        border:
            1px dashed
            var(--cat-border-strong) !important;

        border-radius: 10px !important;
    }

    #categories-page .cat-pagination {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #categories-page .cat-pagination-actions {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;
    }

    #categories-page .cat-page-indicator {
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;
    }

    #categories-page .cat-page-button {
        width: 100% !important;
    }
}

@media (max-width: 480px) {
    #categories-page .cat-header-actions {
        grid-template-columns: 1fr !important;
    }

    #categories-page .cat-total {
        width: 100% !important;
    }

    #categories-page .cat-message {
        align-items: flex-start !important;
        flex-wrap: wrap !important;
    }

    #categories-page .cat-retry-button {
        width: 100% !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #categories-page *,
    #categories-page *::before,
    #categories-page *::after {
        transition: none !important;
        scroll-behavior: auto !important;
    }

    #categories-page .cat-spinner {
        animation-duration: 1.2s !important;
    }
}
`;

export default function CategoriesPage() {
    const {
        token,
    } = useAuth();

    const searchInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const requestIdRef =
        useRef(0);

    const [
        categories,
        setCategories,
    ] = useState<Category[]>([]);

    const [
        pagination,
        setPagination,
    ] = useState<CategoryPaginationMeta>(
        initialPagination,
    );

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        perPage,
        setPerPage,
    ] = useState(10);

    const [
        searchInput,
        setSearchInput,
    ] = useState('');

    const [
        appliedSearch,
        setAppliedSearch,
    ] = useState('');

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const [
        isFormOpen,
        setIsFormOpen,
    ] = useState(false);

    const [
        editingCategory,
        setEditingCategory,
    ] = useState<Category | null>(
        null,
    );

    const [
        categoryName,
        setCategoryName,
    ] = useState('');

    const [
        categoryDescription,
        setCategoryDescription,
    ] = useState('');

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        formError,
        setFormError,
    ] = useState('');

    const [
        fieldErrors,
        setFieldErrors,
    ] = useState<ValidationErrors>({});

    const [
        deleteTarget,
        setDeleteTarget,
    ] = useState<Category | null>(
        null,
    );

    const [
        isDeleting,
        setIsDeleting,
    ] = useState(false);

    const [
        deleteError,
        setDeleteError,
    ] = useState('');

    const loadCategories =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                const requestId =
                    requestIdRef.current + 1;

                requestIdRef.current =
                    requestId;

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getCategories(
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

                    setCategories(
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

                    setCategories([]);

                    setPageError(
                        error
                            instanceof ApiError
                            ? error.message
                            : 'Unable to load categories.',
                    );
                } finally {
                    if (
                        requestIdRef.current
                        === requestId
                    ) {
                        setIsLoading(false);
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

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    setPage(1);

                    setAppliedSearch(
                        searchInput.trim(),
                    );
                },
                300,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [searchInput]);

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeout =
            window.setTimeout(
                () => {
                    setSuccessMessage('');
                },
                3500,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [successMessage]);

    const resetForm = (): void => {
        setEditingCategory(null);
        setCategoryName('');
        setCategoryDescription('');
        setFormError('');
        setFieldErrors({});
    };

    const openCreateModal = (): void => {
        resetForm();
        setIsFormOpen(true);
    };

    const openEditModal = (
        category: Category,
    ): void => {
        setEditingCategory(category);

        setCategoryName(
            category.name,
        );

        setCategoryDescription(
            category.description ?? '',
        );

        setFormError('');
        setFieldErrors({});
        setIsFormOpen(true);
    };

    const closeFormModal = (): void => {
        if (isSubmitting) {
            return;
        }

        setIsFormOpen(false);
        resetForm();
    };

    const validateForm = (): boolean => {
        const errors:
            ValidationErrors = {};

        const trimmedName =
            categoryName.trim();

        const trimmedDescription =
            categoryDescription.trim();

        if (!trimmedName) {
            errors.name = [
                'Please enter the category name.',
            ];
        } else if (
            trimmedName.length > 120
        ) {
            errors.name = [
                'The category name cannot exceed 120 characters.',
            ];
        }

        if (
            trimmedDescription.length > 1000
        ) {
            errors.description = [
                'The description cannot exceed 1000 characters.',
            ];
        }

        setFieldErrors(errors);

        return Object.keys(
            errors,
        ).length === 0;
    };

    const handleSubmit =
        async (
            event:
                FormEvent<HTMLFormElement>,
        ): Promise<void> => {
            event.preventDefault();

            if (
                isSubmitting
                || !token
            ) {
                return;
            }

            setFormError('');
            setFieldErrors({});

            if (!validateForm()) {
                return;
            }

            setIsSubmitting(true);

            try {
                const values = {
                    name:
                        categoryName.trim(),

                    description:
                        categoryDescription
                            .trim(),
                };

                if (editingCategory) {
                    const response =
                        await updateCategory(
                            token,
                            editingCategory.id,
                            values,
                        );

                    setSuccessMessage(
                        response.message
                        ?? 'Category updated successfully.',
                    );

                    setIsFormOpen(false);
                    resetForm();

                    await loadCategories();
                } else {
                    const response =
                        await createCategory(
                            token,
                            values,
                        );

                    setSuccessMessage(
                        response.message
                        ?? 'Category created successfully.',
                    );

                    setIsFormOpen(false);
                    resetForm();

                    if (page === 1) {
                        await loadCategories();
                    } else {
                        setPage(1);
                    }
                }
            } catch (error) {
                if (
                    error
                    instanceof ApiError
                ) {
                    setFormError(
                        error.message,
                    );

                    setFieldErrors(
                        error.errors ?? {},
                    );
                } else {
                    setFormError(
                        'Unable to save the category.',
                    );
                }
            } finally {
                setIsSubmitting(false);
            }
        };

    const openDeleteModal = (
        category: Category,
    ): void => {
        setDeleteTarget(category);
        setDeleteError('');
    };

    const closeDeleteModal = (): void => {
        if (isDeleting) {
            return;
        }

        setDeleteTarget(null);
        setDeleteError('');
    };

    const handleDelete =
        async (): Promise<void> => {
            if (
                !deleteTarget
                || !token
                || isDeleting
            ) {
                return;
            }

            setIsDeleting(true);
            setDeleteError('');

            try {
                const response =
                    await deleteCategory(
                        token,
                        deleteTarget.id,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Category deleted successfully.',
                );

                setDeleteTarget(null);

                if (
                    categories.length === 1
                    && page > 1
                ) {
                    setPage(
                        (currentPage) =>
                            currentPage - 1,
                    );
                } else {
                    await loadCategories();
                }
            } catch (error) {
                setDeleteError(
                    error
                        instanceof ApiError
                        ? error.message
                        : 'Unable to delete the category.',
                );
            } finally {
                setIsDeleting(false);
            }
        };

    const clearSearch = (): void => {
        setSearchInput('');
        setAppliedSearch('');
        setPage(1);

        searchInputRef.current?.focus();
    };

    const renderState = () => {
        if (isLoading) {
            return (
                <div className="cat-state">
                    <div className="cat-spinner" />

                    <strong>
                        Loading Categories
                    </strong>

                    <span>
                        Retrieving the latest
                        category records.
                    </span>
                </div>
            );
        }

        if (categories.length === 0) {
            return (
                <div className="cat-state">
                    <span className="cat-state-icon">
                        <Icon name="category" />
                    </span>

                    <strong>
                        {appliedSearch
                            ? 'No Matching Categories'
                            : 'No Categories Added'}
                    </strong>

                    <span>
                        {appliedSearch
                            ? 'Try a different category name or clear the current search.'
                            : 'Create your first category to organise products.'}
                    </span>

                    {!appliedSearch && (
                        <button
                            type="button"
                            className="cat-empty-button"
                            onClick={openCreateModal}
                        >
                            <Icon name="plus" />

                            Add Category
                        </button>
                    )}
                </div>
            );
        }

        return null;
    };

    return (
        <div id="categories-page">
            <style>
                {styles}
            </style>

            <header className="cat-header">
                <div className="cat-header-copy">
                    <span className="cat-kicker">
                        Product Organisation
                    </span>

                    <h1 className="cat-title">
                        Product Categories
                    </h1>

                    <p className="cat-subtitle">
                        Create and maintain the
                        categories used to organise
                        products across the POS system.
                    </p>
                </div>

                <div className="cat-header-actions">
                    <span className="cat-total">
                        {pagination.total}
                        {' '}

                        {pagination.total === 1
                            ? 'Category'
                            : 'Categories'}
                    </span>

                    <button
                        type="button"
                        className="cat-primary-button"
                        onClick={openCreateModal}
                    >
                        <Icon name="plus" />

                        Add Category
                    </button>
                </div>
            </header>

            {successMessage && (
                <div
                    className="cat-message success"
                    role="status"
                >
                    <Icon name="check" />

                    <span className="cat-message-text">
                        {successMessage}
                    </span>

                    <button
                        type="button"
                        className="cat-message-close"
                        aria-label="Close success message"
                        onClick={() => {
                            setSuccessMessage('');
                        }}
                    >
                        <Icon name="close" />
                    </button>
                </div>
            )}

            {pageError && (
                <div
                    className="cat-message error"
                    role="alert"
                >
                    <Icon name="alert" />

                    <span className="cat-message-text">
                        {pageError}
                    </span>

                    <button
                        type="button"
                        className="cat-retry-button"
                        onClick={() => {
                            void loadCategories();
                        }}
                    >
                        <Icon name="refresh" />

                        Retry
                    </button>
                </div>
            )}

            <section className="cat-panel">
                <div className="cat-toolbar">
                    <label className="cat-field">
                        <span className="cat-label">
                            Search Categories
                        </span>

                        <div className="cat-search-wrap">
                            <span
                                className="cat-search-icon"
                                aria-hidden="true"
                            >
                                <Icon name="search" />
                            </span>

                            <input
                                ref={searchInputRef}
                                type="search"
                                className="cat-search-input"
                                value={searchInput}
                                autoComplete="off"
                                placeholder="Search by category name"
                                aria-label="Search categories"
                                onChange={(event) => {
                                    setSearchInput(
                                        event.target.value,
                                    );
                                }}
                            />

                            {searchInput && (
                                <button
                                    type="button"
                                    className="cat-clear-search"
                                    aria-label="Clear category search"
                                    onClick={clearSearch}
                                >
                                    <Icon name="close" />
                                </button>
                            )}
                        </div>
                    </label>

                    <label className="cat-page-size">
                        <span className="cat-label">
                            Rows per page
                        </span>

                        <select
                            className="cat-select"
                            value={perPage}
                            onChange={(event) => {
                                setPage(1);

                                setPerPage(
                                    Number(
                                        event.target.value,
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

                <div className="cat-table-wrap">
                    <table className="cat-table">
                        <thead>
                            <tr>
                                <th>
                                    Category
                                </th>

                                <th>
                                    Description
                                </th>

                                <th>
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading
                                || categories.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="cat-state-cell"
                                    >
                                        {renderState()}
                                    </td>
                                </tr>
                            ) : categories.map(
                                (category) => (
                                    <tr key={category.id}>
                                        <td>
                                            <div className="cat-name-cell">
                                                <span className="cat-initial">
                                                    {category.name
                                                        .trim()
                                                        .charAt(0)
                                                        .toUpperCase()
                                                        || 'C'}
                                                </span>

                                                <span className="cat-name-copy">
                                                    <strong
                                                        className="cat-name"
                                                        title={
                                                            category.name
                                                        }
                                                    >
                                                        {category.name}
                                                    </strong>

                                                    <small className="cat-id">
                                                        Category #
                                                        {category.id}
                                                    </small>
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <p
                                                className="cat-description"
                                                title={
                                                    getCategoryDescription(
                                                        category,
                                                    )
                                                }
                                            >
                                                {getCategoryDescription(
                                                    category,
                                                )}
                                            </p>
                                        </td>

                                        <td>
                                            <div className="cat-actions">
                                                <button
                                                    type="button"
                                                    className="cat-action-button cat-edit"
                                                    aria-label={`Edit ${category.name}`}
                                                    onClick={() => {
                                                        openEditModal(
                                                            category,
                                                        );
                                                    }}
                                                >
                                                    <Icon name="edit" />

                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    className="cat-action-button cat-delete"
                                                    aria-label={`Delete ${category.name}`}
                                                    onClick={() => {
                                                        openDeleteModal(
                                                            category,
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
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="cat-mobile-list">
                    {isLoading
                        || categories.length === 0 ? (
                        <div className="cat-mobile-state">
                            {renderState()}
                        </div>
                    ) : categories.map(
                        (category) => (
                            <article
                                key={category.id}
                                className="cat-mobile-card"
                            >
                                <div className="cat-name-cell">
                                    <span className="cat-initial">
                                        {category.name
                                            .trim()
                                            .charAt(0)
                                            .toUpperCase()
                                            || 'C'}
                                    </span>

                                    <span className="cat-name-copy">
                                        <strong
                                            className="cat-name"
                                            title={category.name}
                                        >
                                            {category.name}
                                        </strong>

                                        <small className="cat-id">
                                            Category #
                                            {category.id}
                                        </small>
                                    </span>
                                </div>

                                <p className="cat-mobile-description">
                                    {getCategoryDescription(
                                        category,
                                    )}
                                </p>

                                <div className="cat-actions">
                                    <button
                                        type="button"
                                        className="cat-action-button cat-edit"
                                        onClick={() => {
                                            openEditModal(
                                                category,
                                            );
                                        }}
                                    >
                                        <Icon name="edit" />

                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        className="cat-action-button cat-delete"
                                        onClick={() => {
                                            openDeleteModal(
                                                category,
                                            );
                                        }}
                                    >
                                        <Icon name="trash" />

                                        Delete
                                    </button>
                                </div>
                            </article>
                        ),
                    )}
                </div>

                {!isLoading
                    && pagination.total > 0 && (
                        <footer className="cat-pagination">
                            <p className="cat-pagination-info">
                                Showing
                                {' '}

                                <strong>
                                    {pagination.from ?? 0}
                                </strong>

                                {' '}to{' '}

                                <strong>
                                    {pagination.to ?? 0}
                                </strong>

                                {' '}of{' '}

                                <strong>
                                    {pagination.total}
                                </strong>

                                {' '}categories
                            </p>

                            <div className="cat-pagination-actions">
                                <button
                                    type="button"
                                    className="cat-page-button"
                                    disabled={
                                        pagination.current_page
                                        <= 1
                                    }
                                    onClick={() => {
                                        setPage(
                                            (currentPage) =>
                                                Math.max(
                                                    1,
                                                    currentPage - 1,
                                                ),
                                        );
                                    }}
                                >
                                    <Icon name="chevron-left" />

                                    Previous
                                </button>

                                <span className="cat-page-indicator">
                                    Page
                                    {' '}
                                    {pagination.current_page}
                                    {' '}of{' '}
                                    {pagination.last_page}
                                </span>

                                <button
                                    type="button"
                                    className="cat-page-button"
                                    disabled={
                                        pagination.current_page
                                        >= pagination.last_page
                                    }
                                    onClick={() => {
                                        setPage(
                                            (currentPage) =>
                                                Math.min(
                                                    pagination.last_page,
                                                    currentPage + 1,
                                                ),
                                        );
                                    }}
                                >
                                    Next

                                    <Icon name="chevron-right" />
                                </button>
                            </div>
                        </footer>
                    )}
            </section>

            <CategoryFormModal
                isOpen={isFormOpen}
                isEditing={
                    editingCategory !== null
                }
                name={categoryName}
                description={
                    categoryDescription
                }
                isSubmitting={isSubmitting}
                errorMessage={formError}
                fieldErrors={fieldErrors}
                onNameChange={(value) => {
                    setCategoryName(value);

                    setFieldErrors(
                        (current) => ({
                            ...current,
                            name: undefined,
                        }),
                    );
                }}
                onDescriptionChange={(value) => {
                    setCategoryDescription(
                        value,
                    );

                    setFieldErrors(
                        (current) => ({
                            ...current,
                            description: undefined,
                        }),
                    );
                }}
                onClose={closeFormModal}
                onSubmit={(event) => {
                    void handleSubmit(event);
                }}
            />

            <DeleteCategoryModal
                category={deleteTarget}
                isDeleting={isDeleting}
                errorMessage={deleteError}
                onCancel={closeDeleteModal}
                onConfirm={() => {
                    void handleDelete();
                }}
            />
        </div>
    );
}