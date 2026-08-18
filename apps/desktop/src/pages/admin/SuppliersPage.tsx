import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import DeleteSupplierModal
    from '../../components/suppliers/DeleteSupplierModal';

import SupplierFormModal
    from '../../components/suppliers/SupplierFormModal';

import {
    ApiError,
} from '../../lib/api';

import {
    createSupplier,
    deleteSupplier,
    getSuppliers,
    updateSupplier,
} from '../../services/supplierService';

import type {
    ValidationErrors,
} from '../../types/auth';

import type {
    Supplier,
    SupplierFormValues,
    SupplierPaginationMeta,
} from '../../types/supplier';

const emptyFormValues: SupplierFormValues = {
    name: '',
    contact_person: '',
    phone: '',
    secondary_phone: '',
    email: '',
    address: '',
    notes: '',
};

const initialPagination: SupplierPaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null,
};

type IconName =
    | 'alert'
    | 'calendar'
    | 'check'
    | 'chevron-left'
    | 'chevron-right'
    | 'close'
    | 'edit'
    | 'mail'
    | 'phone'
    | 'plus'
    | 'refresh'
    | 'search'
    | 'trash'
    | 'users';

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

        case 'mail':
            return (
                <svg {...props}>
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                    />

                    <path d="m3 7 9 6 9-6" />
                </svg>
            );

        case 'phone':
            return (
                <svg {...props}>
                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />
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
            return (
                <svg {...props}>
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
                </svg>
            );

        case 'users':
        default:
            return (
                <svg {...props}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />

                    <circle
                        cx="9"
                        cy="7"
                        r="4"
                    />

                    <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
                </svg>
            );
    }
}

function formatDate(
    value: string | null | undefined,
): string {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    ).format(date);
}

function getInitials(
    name: string,
): string {
    const words = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) {
        return 'S';
    }

    return words.length === 1
        ? words[0]
            .slice(0, 2)
            .toUpperCase()
        : `${words[0][0]}${words[1][0]}`
            .toUpperCase();
}

function getPhoneHref(
    phone: string,
): string {
    return `tel:${phone.replace(
        /[^\d+]/g,
        '',
    )}`;
}

function isValidPhone(
    phone: string,
): boolean {
    return /^[0-9+\-\s()]{7,30}$/
        .test(phone);
}

const suppliersPageStyles = `
#suppliers-page,
#suppliers-page *,
#suppliers-page *::before,
#suppliers-page *::after {
    box-sizing: border-box !important;
}

#suppliers-page {
    --sup-green-950: #052e16;
    --sup-green-900: #14532d;
    --sup-green-800: #166534;
    --sup-green-700: #15803d;
    --sup-green-100: #dcfce7;
    --sup-green-50: #f0fdf4;

    --sup-blue: #175cd3;

    --sup-red: #b42318;
    --sup-red-50: #fef3f2;

    --sup-text: #101828;
    --sup-text-2: #344054;
    --sup-muted: #667085;

    --sup-border: #d0d9d2;
    --sup-border-strong: #aebdb2;

    --sup-page: #f5f8f6;

    position: relative !important;

    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;

    height:
        calc(100dvh - 96px) !important;

    max-height:
        calc(100dvh - 96px) !important;

    min-height: 0 !important;

    flex:
        1 1 auto !important;

    flex-direction:
        column !important;

    gap:
        14px !important;

    margin:
        0 !important;

    padding:
        0
        8px
        12px
        0 !important;

    overflow:
        hidden !important;

    color:
        var(--sup-text) !important;

    background:
        transparent !important;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif !important;

    font-size:
        14px !important;

    line-height:
        1.5 !important;

    isolation:
        isolate !important;

    -webkit-font-smoothing:
        antialiased !important;
}

#suppliers-page button,
#suppliers-page input,
#suppliers-page select {
    font:
        inherit !important;

    text-transform:
        none !important;

    letter-spacing:
        normal !important;
}

#suppliers-page h1,
#suppliers-page h2,
#suppliers-page h3,
#suppliers-page p {
    margin:
        0 !important;
}

#suppliers-page button:focus-visible,
#suppliers-page input:focus,
#suppliers-page select:focus,
#suppliers-page a:focus-visible {
    outline:
        none !important;

    border-color:
        var(--sup-green-700) !important;

    box-shadow:
        0 0 0 4px
        rgba(
            21,
            128,
            61,
            0.14
        ) !important;
}


/* =========================================================
   APP LAYOUT SCROLL LOCK
   ========================================================= */

#sapo-app-shell
.sapo-shell-content.suppliers-page-scroll-lock {
    display:
        flex !important;

    min-width:
        0 !important;

    min-height:
        0 !important;

    flex:
        1 1 auto !important;

    flex-direction:
        column !important;

    overflow-x:
        hidden !important;

    overflow-y:
        hidden !important;

    overscroll-behavior:
        none !important;

    scrollbar-gutter:
        auto !important;

    scrollbar-width:
        none !important;
}

#sapo-app-shell
.sapo-shell-content.suppliers-page-scroll-lock::-webkit-scrollbar {
    width:
        0 !important;

    height:
        0 !important;
}


/*
 * Fill exactly the available AppLayout content area.
 * Do not calculate height using the full viewport once
 * the page is inside .sapo-shell-content.
 */
#sapo-app-shell
.sapo-shell-content.suppliers-page-scroll-lock
> #suppliers-page {
    width:
        100% !important;

    min-width:
        0 !important;

    min-height:
        0 !important;

    height:
        auto !important;

    max-height:
        none !important;

    flex:
        1 1 auto !important;

    margin:
        0 !important;

    padding:
        0 !important;

    overflow:
        hidden !important;
}


/* =========================================================
   HEADER
   ========================================================= */

#suppliers-page .sup-header {
    display:
        flex !important;

    min-height:
        98px !important;

    flex:
        0 0 auto !important;

    align-items:
        center !important;

    justify-content:
        space-between !important;

    gap:
        20px !important;

    padding:
        17px
        19px !important;

    background:
        linear-gradient(
            135deg,
            #ffffff,
            #f3fbf5
        ) !important;

    border:
        1px solid
        var(--sup-border) !important;

    border-radius:
        14px !important;

    box-shadow:
        0 1px 3px
        rgba(
            16,
            24,
            40,
            0.07
        ) !important;
}

#suppliers-page .sup-header-copy {
    min-width:
        0 !important;
}

#suppliers-page .sup-kicker {
    display:
        block !important;

    margin-bottom:
        3px !important;

    color:
        var(--sup-green-700) !important;

    font-size:
        11px !important;

    font-weight:
        750 !important;

    letter-spacing:
        0.055em !important;

    text-transform:
        uppercase !important;
}

#suppliers-page .sup-title {
    color:
        var(--sup-text) !important;

    font-size:
        24px !important;

    font-weight:
        740 !important;

    line-height:
        1.2 !important;

    letter-spacing:
        -0.02em !important;
}

#suppliers-page .sup-subtitle {
    margin-top:
        4px !important;

    color:
        var(--sup-muted) !important;

    font-size:
        13px !important;
}

#suppliers-page .sup-header-actions {
    display:
        flex !important;

    flex:
        0 0 auto !important;

    align-items:
        center !important;

    gap:
        8px !important;
}

#suppliers-page .sup-total-badge {
    display:
        inline-flex !important;

    min-height:
        40px !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    gap:
        6px !important;

    padding:
        7px
        10px !important;

    color:
        var(--sup-green-900) !important;

    font-size:
        12px !important;

    font-weight:
        700 !important;

    white-space:
        nowrap !important;

    background:
        var(--sup-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius:
        9px !important;
}

#suppliers-page .sup-total-badge svg {
    width:
        15px !important;

    height:
        15px !important;
}


/* =========================================================
   BUTTONS
   ========================================================= */

#suppliers-page .sup-button {
    display:
        inline-flex !important;

    min-height:
        40px !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    gap:
        6px !important;

    padding:
        7px
        11px !important;

    font-size:
        13px !important;

    font-weight:
        700 !important;

    text-decoration:
        none !important;

    border-radius:
        9px !important;

    cursor:
        pointer !important;
}

#suppliers-page .sup-button svg {
    width:
        16px !important;

    height:
        16px !important;
}

#suppliers-page .sup-button:disabled {
    opacity:
        0.55 !important;

    cursor:
        not-allowed !important;
}

#suppliers-page .sup-primary-button {
    color:
        #ffffff !important;

    background:
        var(--sup-green-700) !important;

    border:
        1px solid
        var(--sup-green-700) !important;

    box-shadow:
        0 4px 12px
        rgba(
            21,
            128,
            61,
            0.18
        ) !important;
}

#suppliers-page
.sup-primary-button:hover:not(:disabled) {
    background:
        var(--sup-green-800) !important;

    border-color:
        var(--sup-green-800) !important;
}

#suppliers-page .sup-secondary-button {
    color:
        var(--sup-green-900) !important;

    background:
        #ffffff !important;

    border:
        1px solid
        #b8dfc3 !important;
}

#suppliers-page
.sup-secondary-button:hover:not(:disabled) {
    color:
        #ffffff !important;

    background:
        var(--sup-green-800) !important;

    border-color:
        var(--sup-green-800) !important;
}

#suppliers-page .sup-danger-button {
    color:
        var(--sup-red) !important;

    background:
        var(--sup-red-50) !important;

    border:
        1px solid
        #f3b5af !important;
}

#suppliers-page
.sup-danger-button:hover:not(:disabled) {
    color:
        #ffffff !important;

    background:
        var(--sup-red) !important;

    border-color:
        var(--sup-red) !important;
}


/* =========================================================
   SUCCESS / ERROR MESSAGES
   ========================================================= */

#suppliers-page .sup-message {
    display:
        flex !important;

    min-height:
        48px !important;

    flex:
        0 0 auto !important;

    align-items:
        center !important;

    gap:
        9px !important;

    padding:
        10px
        12px !important;

    font-size:
        13px !important;

    font-weight:
        600 !important;

    border-radius:
        10px !important;
}

#suppliers-page .sup-message.success {
    color:
        var(--sup-green-900) !important;

    background:
        var(--sup-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;
}

#suppliers-page .sup-message.error {
    color:
        var(--sup-red) !important;

    background:
        var(--sup-red-50) !important;

    border:
        1px solid
        #f3b5af !important;
}

#suppliers-page .sup-message > svg {
    width:
        18px !important;

    height:
        18px !important;

    min-width:
        18px !important;
}

#suppliers-page .sup-message-text {
    min-width:
        0 !important;

    flex:
        1 !important;
}

#suppliers-page .sup-message-close {
    display:
        grid !important;

    width:
        32px !important;

    height:
        32px !important;

    min-width:
        32px !important;

    place-items:
        center !important;

    padding:
        0 !important;

    color:
        inherit !important;

    background:
        rgba(
            255,
            255,
            255,
            0.72
        ) !important;

    border:
        1px solid
        currentColor !important;

    border-radius:
        7px !important;

    cursor:
        pointer !important;
}

#suppliers-page .sup-message-close svg {
    width:
        14px !important;

    height:
        14px !important;
}

#suppliers-page .sup-retry-button {
    min-height:
        34px !important;

    padding:
        5px
        8px !important;

    font-size:
        12px !important;
}


/* =========================================================
   PANEL
   ========================================================= */

#suppliers-page .sup-panel {
    display:
        flex !important;

    width:
        100% !important;

    min-width:
        0 !important;

    min-height:
        0 !important;

    flex:
        1 1 auto !important;

    flex-direction:
        column !important;

    overflow:
        hidden !important;

    background:
        #ffffff !important;

    border:
        1px solid
        var(--sup-border) !important;

    border-radius:
        14px !important;

    box-shadow:
        0 1px 3px
        rgba(
            16,
            24,
            40,
            0.07
        ) !important;
}


/* =========================================================
   TOOLBAR
   ========================================================= */

#suppliers-page .sup-toolbar {
    display:
        grid !important;

    grid-template-columns:
        minmax(
            0,
            1fr
        )
        auto !important;

    flex:
        0 0 auto !important;

    align-items:
        end !important;

    gap:
        12px !important;

    padding:
        14px !important;

    border-bottom:
        1px solid
        var(--sup-border) !important;
}

#suppliers-page .sup-field {
    display:
        grid !important;

    gap:
        5px !important;
}

#suppliers-page .sup-field-label {
    color:
        var(--sup-text-2) !important;

    font-size:
        11px !important;

    font-weight:
        650 !important;
}

#suppliers-page .sup-search-wrapper {
    position:
        relative !important;
}

#suppliers-page .sup-search-icon {
    position:
        absolute !important;

    top:
        50% !important;

    left:
        12px !important;

    z-index:
        2 !important;

    display:
        grid !important;

    width:
        18px !important;

    height:
        18px !important;

    place-items:
        center !important;

    color:
        var(--sup-muted) !important;

    transform:
        translateY(
            -50%
        ) !important;

    pointer-events:
        none !important;
}

#suppliers-page .sup-search-icon svg {
    display:
        block !important;

    width:
        18px !important;

    height:
        18px !important;
}

#suppliers-page .sup-input,
#suppliers-page .sup-select {
    display:
        block !important;

    height:
        42px !important;

    min-height:
        42px !important;

    color:
        var(--sup-text) !important;

    font-size:
        14px !important;

    font-weight:
        500 !important;

    outline:
        none !important;

    background:
        #ffffff !important;

    border:
        1px solid
        var(--sup-border-strong) !important;

    border-radius:
        9px !important;
}

#suppliers-page .sup-input {
    width:
        100% !important;

    padding:
        0
        42px
        0
        40px !important;

    background:
        #f8faf9 !important;
}

#suppliers-page .sup-input::placeholder {
    color:
        #7a8696 !important;

    opacity:
        1 !important;
}

#suppliers-page .sup-select {
    width:
        86px !important;

    padding:
        0
        9px !important;

    cursor:
        pointer !important;
}

#suppliers-page .sup-clear-search {
    position:
        absolute !important;

    top:
        50% !important;

    right:
        5px !important;

    z-index:
        3 !important;

    display:
        grid !important;

    width:
        32px !important;

    height:
        32px !important;

    place-items:
        center !important;

    padding:
        0 !important;

    color:
        var(--sup-muted) !important;

    background:
        transparent !important;

    border:
        0 !important;

    border-radius:
        7px !important;

    transform:
        translateY(
            -50%
        ) !important;

    cursor:
        pointer !important;
}

#suppliers-page .sup-clear-search:hover {
    color:
        var(--sup-text) !important;

    background:
        #eaf0ec !important;
}

#suppliers-page .sup-clear-search svg {
    width:
        16px !important;

    height:
        16px !important;
}

#suppliers-page .sup-rows-field {
    display:
        grid !important;

    grid-template-columns:
        auto
        86px !important;

    align-items:
        center !important;

    gap:
        8px !important;
}


/* =========================================================
   COLUMN LAYOUT
   ========================================================= */

#suppliers-page .sup-list-head,
#suppliers-page .sup-row {
    display:
        grid !important;

    grid-template-columns:
        minmax(
            220px,
            1.35fr
        )
        minmax(
            160px,
            0.9fr
        )
        minmax(
            180px,
            1fr
        )
        minmax(
            220px,
            1.2fr
        )
        96px !important;

    gap:
        12px !important;

    align-items:
        center !important;
}


/*
 * IMPORTANT:
 * The column headings are OUTSIDE .sup-list.
 * Therefore they remain fixed while supplier rows scroll.
 */
#suppliers-page .sup-list-head {
    position:
        relative !important;

    z-index:
        20 !important;

    width:
        100% !important;

    min-width:
        0 !important;

    min-height:
        42px !important;

    flex:
        0 0 auto !important;

    margin:
        0 !important;

    padding:
        9px
        22px !important;

    color:
        var(--sup-muted) !important;

    font-size:
        9px !important;

    font-weight:
        700 !important;

    letter-spacing:
        0.04em !important;

    text-transform:
        uppercase !important;

    background:
        var(--sup-page) !important;

    border-bottom:
        1px solid
        #d9e2dc !important;

    box-shadow:
        0 2px 4px
        rgba(
            16,
            24,
            40,
            0.035
        ) !important;
}


/* =========================================================
   ONLY SUPPLIER RECORDS SCROLL
   ========================================================= */

#suppliers-page .sup-list {
    position:
        relative !important;

    display:
        flex !important;

    width:
        100% !important;

    min-width:
        0 !important;

    min-height:
        0 !important;

    flex:
        1 1 auto !important;

    flex-direction:
        column !important;

    gap:
        8px !important;

    padding:
        10px !important;

    overflow-x:
        hidden !important;

    overflow-y:
        auto !important;

    overscroll-behavior-y:
        contain !important;

    scrollbar-gutter:
        stable !important;

    scrollbar-width:
        thin !important;

    scrollbar-color:
        #89a091
        #e8eeea !important;

    background:
        var(--sup-page) !important;

    clip-path:
        inset(0) !important;

    contain:
        paint !important;

    -webkit-overflow-scrolling:
        touch !important;
}

#suppliers-page .sup-list::-webkit-scrollbar {
    width:
        10px !important;
}

#suppliers-page .sup-list::-webkit-scrollbar-track {
    background:
        #e8eeea !important;

    border-radius:
        999px !important;
}

#suppliers-page .sup-list::-webkit-scrollbar-thumb {
    background:
        #89a091 !important;

    border:
        2px solid
        #e8eeea !important;

    border-radius:
        999px !important;
}

#suppliers-page .sup-list::-webkit-scrollbar-thumb:hover {
    background:
        var(--sup-green-700) !important;
}


/* =========================================================
   SUPPLIER ROW
   ========================================================= */

#suppliers-page .sup-row {
    width:
        100% !important;

    min-width:
        0 !important;

    max-width:
        100% !important;

    flex:
        0 0 auto !important;

    overflow:
        hidden !important;

    padding:
        11px
        12px !important;

    background:
        #ffffff !important;

    border:
        1px solid
        var(--sup-border) !important;

    border-radius:
        10px !important;

    box-shadow:
        0 1px 2px
        rgba(
            16,
            24,
            40,
            0.035
        ) !important;
}

#suppliers-page .sup-row:hover {
    border-color:
        #9dceaa !important;

    box-shadow:
        0 4px 12px
        rgba(
            21,
            128,
            61,
            0.07
        ) !important;
}

#suppliers-page .sup-identity {
    display:
        flex !important;

    min-width:
        0 !important;

    align-items:
        center !important;

    gap:
        9px !important;
}

#suppliers-page .sup-avatar {
    display:
        grid !important;

    width:
        40px !important;

    height:
        40px !important;

    min-width:
        40px !important;

    place-items:
        center !important;

    color:
        #ffffff !important;

    font-size:
        12px !important;

    font-weight:
        750 !important;

    background:
        linear-gradient(
            145deg,
            var(--sup-green-900),
            var(--sup-green-700)
        ) !important;

    border-radius:
        10px !important;
}

#suppliers-page .sup-copy {
    min-width:
        0 !important;
}

#suppliers-page .sup-name {
    display:
        block !important;

    overflow:
        hidden !important;

    color:
        var(--sup-text) !important;

    font-size:
        14px !important;

    font-weight:
        700 !important;

    line-height:
        1.3 !important;

    text-overflow:
        ellipsis !important;

    white-space:
        nowrap !important;
}

#suppliers-page .sup-added {
    display:
        flex !important;

    align-items:
        center !important;

    gap:
        4px !important;

    margin-top:
        2px !important;

    color:
        var(--sup-muted) !important;

    font-size:
        10px !important;
}

#suppliers-page .sup-added svg {
    width:
        12px !important;

    height:
        12px !important;
}

#suppliers-page .sup-cell {
    min-width:
        0 !important;
}

#suppliers-page .sup-mobile-label {
    display:
        none !important;
}

#suppliers-page .sup-value {
    display:
        block !important;

    overflow:
        hidden !important;

    color:
        var(--sup-text-2) !important;

    font-size:
        12px !important;

    font-weight:
        550 !important;

    text-overflow:
        ellipsis !important;

    white-space:
        nowrap !important;
}

#suppliers-page .sup-stack {
    display:
        flex !important;

    min-width:
        0 !important;

    flex-direction:
        column !important;

    gap:
        4px !important;
}

#suppliers-page .sup-link {
    display:
        flex !important;

    min-width:
        0 !important;

    align-items:
        center !important;

    gap:
        5px !important;

    overflow:
        hidden !important;

    color:
        var(--sup-blue) !important;

    font-size:
        12px !important;

    font-weight:
        550 !important;

    text-decoration:
        none !important;
}

#suppliers-page .sup-link:hover {
    text-decoration:
        underline !important;
}

#suppliers-page .sup-link svg {
    width:
        14px !important;

    height:
        14px !important;

    min-width:
        14px !important;
}

#suppliers-page .sup-link span {
    overflow:
        hidden !important;

    text-overflow:
        ellipsis !important;

    white-space:
        nowrap !important;
}

#suppliers-page .sup-empty {
    color:
        #98a2b3 !important;

    font-size:
        11px !important;

    font-style:
        italic !important;
}

#suppliers-page .sup-contact-address {
    display:
        -webkit-box !important;

    margin-top:
        4px !important;

    overflow:
        hidden !important;

    color:
        var(--sup-muted) !important;

    font-size:
        10px !important;

    line-height:
        1.35 !important;

    -webkit-box-orient:
        vertical !important;

    -webkit-line-clamp:
        2 !important;
}

#suppliers-page .sup-actions {
    display:
        flex !important;

    align-items:
        center !important;

    justify-content:
        flex-end !important;

    gap:
        6px !important;
}

#suppliers-page .sup-action-button {
    width:
        36px !important;

    height:
        36px !important;

    min-width:
        36px !important;

    min-height:
        36px !important;

    padding:
        0 !important;
}

#suppliers-page .sup-action-text {
    display:
        none !important;
}


/* =========================================================
   LOADING / EMPTY STATE
   ========================================================= */

#suppliers-page .sup-state {
    display:
        flex !important;

    min-height:
        0 !important;

    flex:
        1 1 auto !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    flex-direction:
        column !important;

    gap:
        8px !important;

    padding:
        28px !important;

    overflow:
        hidden !important;

    color:
        var(--sup-muted) !important;

    text-align:
        center !important;

    background:
        #ffffff !important;
}

#suppliers-page .sup-state-icon {
    display:
        grid !important;

    width:
        48px !important;

    height:
        48px !important;

    place-items:
        center !important;

    color:
        var(--sup-green-700) !important;

    background:
        var(--sup-green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius:
        11px !important;
}

#suppliers-page .sup-state-icon svg {
    width:
        23px !important;

    height:
        23px !important;
}

#suppliers-page .sup-state-title {
    color:
        var(--sup-text) !important;

    font-size:
        16px !important;

    font-weight:
        700 !important;
}

#suppliers-page .sup-state-message {
    max-width:
        430px !important;

    font-size:
        12px !important;
}

#suppliers-page .sup-state-action {
    margin-top:
        4px !important;
}

#suppliers-page .sup-spinner {
    width:
        36px !important;

    height:
        36px !important;

    border:
        4px solid
        var(--sup-green-100) !important;

    border-top-color:
        var(--sup-green-700) !important;

    border-radius:
        50% !important;

    animation:
        sup-spin
        700ms
        linear
        infinite !important;
}

@keyframes sup-spin {
    to {
        transform:
            rotate(
                360deg
            );
    }
}


/* =========================================================
   PAGINATION - FIXED AT BOTTOM
   ========================================================= */

#suppliers-page .sup-pagination {
    display:
        flex !important;

    min-height:
        62px !important;

    flex:
        0 0 auto !important;

    align-items:
        center !important;

    justify-content:
        space-between !important;

    gap:
        12px !important;

    padding:
        10px
        14px !important;

    border-top:
        1px solid
        var(--sup-border) !important;
}

#suppliers-page .sup-pagination-info {
    color:
        var(--sup-muted) !important;

    font-size:
        12px !important;
}

#suppliers-page .sup-pagination-info strong {
    color:
        var(--sup-text-2) !important;

    font-weight:
        700 !important;
}

#suppliers-page .sup-pagination-actions {
    display:
        flex !important;

    align-items:
        center !important;

    gap:
        7px !important;
}

#suppliers-page .sup-page-number {
    display:
        inline-flex !important;

    min-height:
        36px !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    padding:
        6px
        9px !important;

    color:
        var(--sup-text-2) !important;

    font-size:
        11px !important;

    font-weight:
        600 !important;

    white-space:
        nowrap !important;

    background:
        #f8faf9 !important;

    border:
        1px solid
        #e4e9e5 !important;

    border-radius:
        8px !important;
}

#suppliers-page .sup-page-button {
    min-height:
        36px !important;

    padding:
        6px
        9px !important;

    font-size:
        12px !important;
}


/* =========================================================
   TABLET
   ========================================================= */

@media (
    max-width: 1050px
) {
    #suppliers-page .sup-list-head {
        display:
            none !important;
    }

    #suppliers-page .sup-row {
        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;

        align-items:
            start !important;
    }

    #suppliers-page .sup-identity,
    #suppliers-page .sup-actions {
        grid-column:
            1 / -1 !important;
    }

    #suppliers-page .sup-mobile-label {
        display:
            block !important;

        margin-bottom:
            2px !important;

        color:
            var(--sup-muted) !important;

        font-size:
            9px !important;

        font-weight:
            700 !important;

        letter-spacing:
            0.04em !important;

        text-transform:
            uppercase !important;
    }

    #suppliers-page .sup-actions {
        justify-content:
            flex-start !important;
    }

    #suppliers-page .sup-action-button {
        width:
            auto !important;

        min-width:
            92px !important;

        padding:
            6px
            9px !important;
    }

    #suppliers-page .sup-action-text {
        display:
            inline !important;
    }
}


/* =========================================================
   MOBILE
   ========================================================= */

@media (
    max-width: 700px
) {
    #suppliers-page {
        height:
            calc(100dvh - 72px) !important;

        max-height:
            calc(100dvh - 72px) !important;

        padding-right:
            4px !important;
    }

    #sapo-app-shell
    .sapo-shell-content.suppliers-page-scroll-lock
    > #suppliers-page {
        height:
            auto !important;

        max-height:
            none !important;

        padding:
            0 !important;
    }

    #suppliers-page .sup-header {
        min-height:
            0 !important;

        align-items:
            stretch !important;

        flex-direction:
            column !important;

        padding:
            15px !important;
    }

    #suppliers-page .sup-title {
        font-size:
            21px !important;
    }

    #suppliers-page .sup-header-actions {
        display:
            grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #suppliers-page .sup-total-badge,
    #suppliers-page
    .sup-header-actions
    .sup-button {
        width:
            100% !important;
    }

    #suppliers-page .sup-toolbar {
        grid-template-columns:
            1fr !important;
    }

    #suppliers-page .sup-rows-field {
        grid-template-columns:
            minmax(
                0,
                1fr
            )
            86px !important;
    }

    #suppliers-page .sup-row {
        grid-template-columns:
            1fr !important;
    }

    #suppliers-page .sup-message {
        align-items:
            flex-start !important;

        flex-wrap:
            wrap !important;
    }

    #suppliers-page .sup-retry-button {
        width:
            100% !important;
    }

    #suppliers-page .sup-pagination {
        align-items:
            stretch !important;

        flex-direction:
            column !important;
    }

    #suppliers-page .sup-pagination-actions {
        display:
            grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;
    }

    #suppliers-page .sup-page-number {
        grid-column:
            1 / -1 !important;

        grid-row:
            1 !important;
    }

    #suppliers-page .sup-page-button {
        width:
            100% !important;
    }
}


@media (
    max-width: 480px
) {
    #suppliers-page .sup-header-actions {
        grid-template-columns:
            1fr !important;
    }

    #suppliers-page .sup-name {
        white-space:
            normal !important;
    }
}


@media (
    prefers-reduced-motion: reduce
) {
    #suppliers-page *,
    #suppliers-page *::before,
    #suppliers-page *::after {
        transition:
            none !important;

        scroll-behavior:
            auto !important;
    }

    #suppliers-page .sup-spinner {
        animation-duration:
            1.2s !important;
    }
}
`;

export default function SuppliersPage() {
    const {
        token,
    } = useAuth();

    /*
     * AppLayout normally owns the main vertical scrollbar.
     *
     * SuppliersPage now behaves like PurchasesPage:
     *
     * - App top bar remains fixed
     * - Supplier Directory header remains fixed
     * - Search toolbar remains fixed
     * - Column headings remain fixed
     * - Pagination remains fixed
     * - ONLY supplier records scroll
     *
     * This class is removed automatically when leaving
     * the Supplier page.
     */
    useEffect(
        () => {
            const shellContent =
                document.querySelector<HTMLElement>(
                    '#sapo-app-shell .sapo-shell-content',
                );

            if (!shellContent) {
                return;
            }

            const previousScrollTop =
                shellContent.scrollTop;

            shellContent.classList.add(
                'suppliers-page-scroll-lock',
            );

            shellContent.scrollTop = 0;

            return () => {
                shellContent.classList.remove(
                    'suppliers-page-scroll-lock',
                );

                shellContent.scrollTop =
                    previousScrollTop;
            };
        },
        [],
    );

    const searchInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const requestIdRef =
        useRef(0);

    const [
        suppliers,
        setSuppliers,
    ] = useState<Supplier[]>([]);

    const [
        pagination,
        setPagination,
    ] = useState<SupplierPaginationMeta>(
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
        editingSupplier,
        setEditingSupplier,
    ] = useState<Supplier | null>(
        null,
    );

    const [
        formValues,
        setFormValues,
    ] = useState<SupplierFormValues>({
        ...emptyFormValues,
    });

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
    ] = useState<Supplier | null>(
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

    const loadSuppliers =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    setIsLoading(false);
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
                        await getSuppliers(
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

                    setSuppliers(
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

                    setSuppliers([]);

                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load suppliers.',
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
        void loadSuppliers();
    }, [loadSuppliers]);

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
        setEditingSupplier(null);

        setFormValues({
            ...emptyFormValues,
        });

        setFormError('');
        setFieldErrors({});
    };

    const openCreateModal = (): void => {
        resetForm();
        setIsFormOpen(true);
    };

    const openEditModal = (
        supplier: Supplier,
    ): void => {
        setEditingSupplier(supplier);

        setFormValues({
            name:
                supplier.name,

            contact_person:
                supplier.contact_person
                ?? '',

            phone:
                supplier.phone,

            secondary_phone:
                supplier.secondary_phone
                ?? '',

            email:
                supplier.email
                ?? '',

            address:
                supplier.address
                ?? '',

            notes:
                supplier.notes
                ?? '',
        });

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

    const handleFormChange = (
        field: keyof SupplierFormValues,
        value: string,
    ): void => {
        setFormValues(
            (current) => ({
                ...current,
                [field]: value,
            }),
        );

        setFieldErrors(
            (current) => ({
                ...current,
                [field]: undefined,
            }),
        );

        setFormError('');
    };

    const validateForm = (): boolean => {
        const errors:
            ValidationErrors = {};

        const supplierName =
            formValues.name.trim();

        const primaryPhone =
            formValues.phone.trim();

        const secondaryPhone =
            formValues.secondary_phone
                .trim();

        if (!supplierName) {
            errors.name = [
                'Please enter the supplier name.',
            ];
        } else if (
            supplierName.length > 160
        ) {
            errors.name = [
                'The supplier name cannot exceed 160 characters.',
            ];
        }

        if (
            formValues.contact_person
                .trim()
                .length > 120
        ) {
            errors.contact_person = [
                'The contact person name cannot exceed 120 characters.',
            ];
        }

        if (!primaryPhone) {
            errors.phone = [
                'Please enter the primary phone number.',
            ];
        } else if (
            !isValidPhone(
                primaryPhone,
            )
        ) {
            errors.phone = [
                'Please enter a valid primary phone number.',
            ];
        }

        if (
            secondaryPhone
            && !isValidPhone(
                secondaryPhone,
            )
        ) {
            errors.secondary_phone = [
                'Please enter a valid secondary phone number.',
            ];
        }

        if (
            formValues.email.trim()
            && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(
                    formValues.email.trim(),
                )
        ) {
            errors.email = [
                'Please enter a valid email address.',
            ];
        }

        if (
            formValues.address.trim()
                .length > 1500
        ) {
            errors.address = [
                'The address cannot exceed 1500 characters.',
            ];
        }

        if (
            formValues.notes.trim()
                .length > 2000
        ) {
            errors.notes = [
                'The notes cannot exceed 2000 characters.',
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
                if (editingSupplier) {
                    const response =
                        await updateSupplier(
                            token,
                            editingSupplier.id,
                            formValues,
                        );

                    setSuccessMessage(
                        response.message
                        ?? 'Supplier updated successfully.',
                    );

                    setIsFormOpen(false);
                    resetForm();

                    await loadSuppliers();
                } else {
                    const response =
                        await createSupplier(
                            token,
                            formValues,
                        );

                    setSuccessMessage(
                        response.message
                        ?? 'Supplier created successfully.',
                    );

                    setIsFormOpen(false);
                    resetForm();

                    if (page === 1) {
                        await loadSuppliers();
                    } else {
                        setPage(1);
                    }
                }
            } catch (error) {
                if (
                    error instanceof ApiError
                ) {
                    setFormError(
                        error.message,
                    );

                    setFieldErrors(
                        error.errors ?? {},
                    );
                } else {
                    setFormError(
                        'Unable to save the supplier.',
                    );
                }
            } finally {
                setIsSubmitting(false);
            }
        };

    const openDeleteModal = (
        supplier: Supplier,
    ): void => {
        setDeleteTarget(supplier);
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
                    await deleteSupplier(
                        token,
                        deleteTarget.id,
                    );

                setSuccessMessage(
                    response.message
                    ?? 'Supplier deleted successfully.',
                );

                setDeleteTarget(null);

                if (
                    suppliers.length === 1
                    && page > 1
                ) {
                    setPage(
                        (
                            currentPage,
                        ) =>
                            Math.max(
                                1,
                                currentPage - 1,
                            ),
                    );
                } else {
                    await loadSuppliers();
                }
            } catch (error) {
                setDeleteError(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to delete the supplier.',
                );
            } finally {
                setIsDeleting(false);
            }
        };

    const clearSearch = (): void => {
        setSearchInput('');
        setAppliedSearch('');
        setPage(1);

        searchInputRef.current
            ?.focus();
    };

    return (
        <div id="suppliers-page">
            <style>
                {suppliersPageStyles}
            </style>

            <header className="sup-header">
                <div className="sup-header-copy">
                    <span className="sup-kicker">
                        Purchasing
                    </span>

                    <h1 className="sup-title">
                        Supplier Directory
                    </h1>

                    <p className="sup-subtitle">
                        Manage supplier contacts,
                        communication details and
                        purchasing records.
                    </p>
                </div>

                <div className="sup-header-actions">
                    <span className="sup-total-badge">
                        <Icon name="users" />

                        {pagination.total}
                        {' '}

                        {pagination.total === 1
                            ? 'Supplier'
                            : 'Suppliers'}
                    </span>

                    <button
                        type="button"
                        className="sup-button sup-primary-button"
                        onClick={openCreateModal}
                    >
                        <Icon name="plus" />

                        Add Supplier
                    </button>
                </div>
            </header>

            {successMessage && (
                <div
                    className="sup-message success"
                    role="status"
                    aria-live="polite"
                >
                    <Icon name="check" />

                    <span className="sup-message-text">
                        {successMessage}
                    </span>

                    <button
                        type="button"
                        className="sup-message-close"
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
                    className="sup-message error"
                    role="alert"
                >
                    <Icon name="alert" />

                    <span className="sup-message-text">
                        {pageError}
                    </span>

                    <button
                        type="button"
                        className="sup-button sup-secondary-button sup-retry-button"
                        onClick={() => {
                            void loadSuppliers();
                        }}
                    >
                        <Icon name="refresh" />

                        Retry
                    </button>
                </div>
            )}

            <section className="sup-panel">
                <div className="sup-toolbar">
                    <label className="sup-field">
                        <span className="sup-field-label">
                            Search Suppliers
                        </span>

                        <span className="sup-search-wrapper">
                            <span
                                className="sup-search-icon"
                                aria-hidden="true"
                            >
                                <Icon name="search" />
                            </span>

                            <input
                                ref={searchInputRef}
                                type="search"
                                className="sup-input"
                                value={searchInput}
                                autoComplete="off"
                                placeholder="Search by supplier, contact, phone or email"
                                aria-label="Search suppliers"
                                onChange={(event) => {
                                    setSearchInput(
                                        event.target.value,
                                    );
                                }}
                            />

                            {searchInput && (
                                <button
                                    type="button"
                                    className="sup-clear-search"
                                    aria-label="Clear supplier search"
                                    onClick={clearSearch}
                                >
                                    <Icon name="close" />
                                </button>
                            )}
                        </span>
                    </label>

                    <label className="sup-rows-field">
                        <span className="sup-field-label">
                            Rows per page
                        </span>

                        <select
                            className="sup-select"
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

                {isLoading ? (
                    <div
                        className="sup-state"
                        aria-live="polite"
                    >
                        <div className="sup-spinner" />

                        <strong className="sup-state-title">
                            Loading Suppliers
                        </strong>

                        <span className="sup-state-message">
                            Retrieving supplier contact
                            and purchasing information.
                        </span>
                    </div>
                ) : suppliers.length === 0 ? (
                    <div className="sup-state">
                        <span className="sup-state-icon">
                            <Icon name="users" />
                        </span>

                        <strong className="sup-state-title">
                            {appliedSearch
                                ? 'No Matching Suppliers'
                                : 'No Suppliers Added'}
                        </strong>

                        <span className="sup-state-message">
                            {appliedSearch
                                ? 'Check the search details or clear the current search.'
                                : 'Add the first supplier to begin recording purchase sources and contact information.'}
                        </span>

                        {!appliedSearch && (
                            <button
                                type="button"
                                className="sup-button sup-primary-button sup-state-action"
                                onClick={openCreateModal}
                            >
                                <Icon name="plus" />

                                Add First Supplier
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/*
                         * IMPORTANT:
                         * This header is outside .sup-list.
                         * Therefore it does not move when
                         * the supplier records are scrolled.
                         */}
                        <div
                            className="sup-list-head"
                            aria-hidden="true"
                        >
                            <span>
                                Supplier
                            </span>

                            <span>
                                Contact Person
                            </span>

                            <span>
                                Phone Numbers
                            </span>

                            <span>
                                Email and Address
                            </span>

                            <span>
                                Actions
                            </span>
                        </div>

                        {/*
                         * ONLY this div scrolls.
                         */}
                        <div className="sup-list">
                            {suppliers.map(
                                (supplier) => (
                                    <article
                                        key={supplier.id}
                                        className="sup-row"
                                    >
                                        <div className="sup-identity">
                                            <span className="sup-avatar">
                                                {getInitials(
                                                    supplier.name,
                                                )}
                                            </span>

                                            <span className="sup-copy">
                                                <strong
                                                    className="sup-name"
                                                    title={supplier.name}
                                                >
                                                    {supplier.name}
                                                </strong>

                                                <span className="sup-added">
                                                    <Icon name="calendar" />

                                                    Added
                                                    {' '}

                                                    {formatDate(
                                                        supplier.created_at,
                                                    )}
                                                </span>
                                            </span>
                                        </div>

                                        <div className="sup-cell">
                                            <span className="sup-mobile-label">
                                                Contact Person
                                            </span>

                                            <span
                                                className="sup-value"
                                                title={
                                                    supplier.contact_person
                                                    || 'Not provided'
                                                }
                                            >
                                                {supplier.contact_person
                                                    || 'Not provided'}
                                            </span>
                                        </div>

                                        <div className="sup-cell">
                                            <span className="sup-mobile-label">
                                                Phone Numbers
                                            </span>

                                            <div className="sup-stack">
                                                <a
                                                    className="sup-link"
                                                    href={getPhoneHref(
                                                        supplier.phone,
                                                    )}
                                                >
                                                    <Icon name="phone" />

                                                    <span>
                                                        {supplier.phone}
                                                    </span>
                                                </a>

                                                {supplier.secondary_phone ? (
                                                    <a
                                                        className="sup-link"
                                                        href={getPhoneHref(
                                                            supplier.secondary_phone,
                                                        )}
                                                    >
                                                        <Icon name="phone" />

                                                        <span>
                                                            {supplier.secondary_phone}
                                                        </span>
                                                    </a>
                                                ) : (
                                                    <span className="sup-empty">
                                                        No secondary number
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="sup-cell">
                                            <span className="sup-mobile-label">
                                                Email and Address
                                            </span>

                                            {supplier.email ? (
                                                <a
                                                    className="sup-link"
                                                    href={`mailto:${supplier.email}`}
                                                    title={supplier.email}
                                                >
                                                    <Icon name="mail" />

                                                    <span>
                                                        {supplier.email}
                                                    </span>
                                                </a>
                                            ) : (
                                                <span className="sup-empty">
                                                    No email address
                                                </span>
                                            )}

                                            <span
                                                className="sup-contact-address"
                                                title={
                                                    supplier.address
                                                    || 'No address provided'
                                                }
                                            >
                                                {supplier.address
                                                    || 'No address provided'}
                                            </span>
                                        </div>

                                        <div className="sup-actions">
                                            <button
                                                type="button"
                                                className="sup-button sup-secondary-button sup-action-button"
                                                aria-label={`Edit ${supplier.name}`}
                                                title="Edit supplier"
                                                onClick={() => {
                                                    openEditModal(
                                                        supplier,
                                                    );
                                                }}
                                            >
                                                <Icon name="edit" />

                                                <span className="sup-action-text">
                                                    Edit
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                className="sup-button sup-danger-button sup-action-button"
                                                aria-label={`Delete ${supplier.name}`}
                                                title="Delete supplier"
                                                onClick={() => {
                                                    openDeleteModal(
                                                        supplier,
                                                    );
                                                }}
                                            >
                                                <Icon name="trash" />

                                                <span className="sup-action-text">
                                                    Delete
                                                </span>
                                            </button>
                                        </div>
                                    </article>
                                ),
                            )}
                        </div>
                    </>
                )}

                {!isLoading
                    && pagination.total > 0 && (
                        <footer className="sup-pagination">
                            <p className="sup-pagination-info">
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

                                {' '}suppliers
                            </p>

                            <div className="sup-pagination-actions">
                                <button
                                    type="button"
                                    className="sup-button sup-secondary-button sup-page-button"
                                    disabled={
                                        pagination.current_page
                                        <= 1
                                    }
                                    onClick={() => {
                                        setPage(
                                            (
                                                currentPage,
                                            ) =>
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

                                <span className="sup-page-number">
                                    Page
                                    {' '}

                                    {pagination.current_page}
                                    {' '}of{' '}
                                    {pagination.last_page}
                                </span>

                                <button
                                    type="button"
                                    className="sup-button sup-secondary-button sup-page-button"
                                    disabled={
                                        pagination.current_page
                                        >= pagination.last_page
                                    }
                                    onClick={() => {
                                        setPage(
                                            (
                                                currentPage,
                                            ) =>
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

            <SupplierFormModal
                isOpen={isFormOpen}
                isEditing={
                    editingSupplier !== null
                }
                values={formValues}
                isSubmitting={isSubmitting}
                errorMessage={formError}
                fieldErrors={fieldErrors}
                onChange={handleFormChange}
                onClose={closeFormModal}
                onSubmit={(event) => {
                    void handleSubmit(event);
                }}
            />

            <DeleteSupplierModal
                supplier={deleteTarget}
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