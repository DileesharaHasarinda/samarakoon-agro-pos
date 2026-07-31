import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
} from 'react-router';

import {
    useAuth,
} from '../auth/AuthContext';

import {
    APPLICATION_NAME,
} from '../config/app';

type IconName =
    | 'alert'
    | 'barcode'
    | 'cart'
    | 'cash'
    | 'chart'
    | 'chevron-right'
    | 'clock'
    | 'close'
    | 'customers'
    | 'dashboard'
    | 'database'
    | 'expenses'
    | 'history'
    | 'inventory'
    | 'logout'
    | 'menu'
    | 'package'
    | 'plus'
    | 'purchase'
    | 'receipt'
    | 'return'
    | 'search'
    | 'settings'
    | 'shift'
    | 'supplier'
    | 'tag'
    | 'user'
    | 'users'
    | 'wallet';

interface NavigationItem {
    label: string;
    path: string;
    icon: IconName;
}

interface NavigationSection {
    title: string;
    items: NavigationItem[];
}

interface IconProps {
    name: IconName;
    className?: string;
}

function Icon({
    name,
    className = '',
}: IconProps) {
    const commonProps = {
        className,
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
                <svg {...commonProps}>
                    <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                </svg>
            );

        case 'barcode':
            return (
                <svg {...commonProps}>
                    <path d="M3 5v14" />
                    <path d="M7 5v14" />
                    <path d="M10 5v14" />
                    <path d="M14 5v14" />
                    <path d="M17 5v14" />
                    <path d="M21 5v14" />
                </svg>
            );

        case 'cart':
            return (
                <svg {...commonProps}>
                    <circle cx="9" cy="20" r="1" />
                    <circle cx="18" cy="20" r="1" />
                    <path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
                </svg>
            );

        case 'cash':
            return (
                <svg {...commonProps}>
                    <rect
                        x="3"
                        y="6"
                        width="18"
                        height="12"
                        rx="2"
                    />

                    <circle
                        cx="12"
                        cy="12"
                        r="2.5"
                    />

                    <path d="M7 9h.01" />
                    <path d="M17 15h.01" />
                </svg>
            );

        case 'chart':
            return (
                <svg {...commonProps}>
                    <path d="M4 19V9" />
                    <path d="M10 19V5" />
                    <path d="M16 19v-7" />
                    <path d="M22 19V3" />
                </svg>
            );

        case 'chevron-right':
            return (
                <svg {...commonProps}>
                    <path d="m9 18 6-6-6-6" />
                </svg>
            );

        case 'clock':
            return (
                <svg {...commonProps}>
                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                    />

                    <path d="M12 7v5l3 2" />
                </svg>
            );

        case 'close':
            return (
                <svg {...commonProps}>
                    <path d="m6 6 12 12" />
                    <path d="m18 6-12 12" />
                </svg>
            );

        case 'customers':
            return (
                <svg {...commonProps}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );

        case 'dashboard':
            return (
                <svg {...commonProps}>
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

        case 'database':
            return (
                <svg {...commonProps}>
                    <ellipse
                        cx="12"
                        cy="5"
                        rx="8"
                        ry="3"
                    />

                    <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
                    <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
                </svg>
            );

        case 'expenses':
            return (
                <svg {...commonProps}>
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                    />

                    <path d="M7 9h10" />
                    <path d="M7 13h5" />
                    <path d="M16 13h1" />
                </svg>
            );

        case 'history':
            return (
                <svg {...commonProps}>
                    <path d="M3 12a9 9 0 1 0 3-6.7" />
                    <path d="M3 4v5h5" />
                    <path d="M12 7v5l3 2" />
                </svg>
            );

        case 'inventory':
            return (
                <svg {...commonProps}>
                    <path d="m3 8 9-5 9 5-9 5Z" />
                    <path d="m3 8 9 5 9-5" />
                    <path d="M3 8v8l9 5 9-5V8" />
                    <path d="M12 13v8" />
                </svg>
            );

        case 'logout':
            return (
                <svg {...commonProps}>
                    <path d="M10 17l5-5-5-5" />
                    <path d="M15 12H3" />
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                </svg>
            );

        case 'menu':
            return (
                <svg {...commonProps}>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                </svg>
            );

        case 'package':
            return (
                <svg {...commonProps}>
                    <path d="m21 8-9 5-9-5" />
                    <path d="m3 8 9-5 9 5v8l-9 5-9-5Z" />
                    <path d="M12 13v8" />
                </svg>
            );

        case 'plus':
            return (
                <svg {...commonProps}>
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                </svg>
            );

        case 'purchase':
            return (
                <svg {...commonProps}>
                    <path d="M4 4h16v16H4z" />
                    <path d="M8 9h8" />
                    <path d="M8 13h5" />
                    <path d="M8 17h3" />
                </svg>
            );

        case 'receipt':
            return (
                <svg {...commonProps}>
                    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
                    <path d="M9 8h6" />
                    <path d="M9 12h6" />
                    <path d="M9 16h3" />
                </svg>
            );

        case 'return':
            return (
                <svg {...commonProps}>
                    <path d="M9 14 4 9l5-5" />
                    <path d="M4 9h10a6 6 0 0 1 6 6v4" />
                </svg>
            );

        case 'search':
            return (
                <svg {...commonProps}>
                    <circle
                        cx="11"
                        cy="11"
                        r="7"
                    />

                    <path d="m20 20-4-4" />
                </svg>
            );

        case 'settings':
            return (
                <svg {...commonProps}>
                    <circle
                        cx="12"
                        cy="12"
                        r="3"
                    />

                    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
                </svg>
            );

        case 'shift':
            return (
                <svg {...commonProps}>
                    <rect
                        x="3"
                        y="4"
                        width="18"
                        height="17"
                        rx="2"
                    />

                    <path d="M8 2v4" />
                    <path d="M16 2v4" />
                    <path d="M3 9h18" />
                    <path d="M12 13v3l2 1" />
                </svg>
            );

        case 'supplier':
            return (
                <svg {...commonProps}>
                    <path d="M3 7h11v10H3z" />
                    <path d="M14 10h4l3 3v4h-7Z" />
                    <circle cx="7" cy="18" r="2" />
                    <circle cx="18" cy="18" r="2" />
                </svg>
            );

        case 'tag':
            return (
                <svg {...commonProps}>
                    <path d="M20 13 13 20l-9-9V4h7Z" />
                    <circle
                        cx="8.5"
                        cy="8.5"
                        r="1"
                    />
                </svg>
            );

        case 'user':
            return (
                <svg {...commonProps}>
                    <circle
                        cx="12"
                        cy="8"
                        r="4"
                    />

                    <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
            );

        case 'users':
            return (
                <svg {...commonProps}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );

        case 'wallet':
        default:
            return (
                <svg {...commonProps}>
                    <path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                    <path d="M3 8V6a2 2 0 0 1 2-2h12" />
                    <path d="M16 13h3" />
                </svg>
            );
    }
}

const adminNavigation: NavigationSection[] = [
    {
        title: 'Overview',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
                icon: 'dashboard',
            },
            {
                label: 'New Sale',
                path: '/admin/pos',
                icon: 'cart',
            },
        ],
    },
    {
        title: 'Products & Stock',
        items: [
            {
                label: 'Categories',
                path: '/admin/categories',
                icon: 'tag',
            },
            {
                label: 'Products',
                path: '/admin/products',
                icon: 'package',
            },
            {
                label: 'Inventory',
                path: '/admin/inventory',
                icon: 'inventory',
            },
            {
                label: 'Stock Alerts',
                path: '/admin/stock-alerts',
                icon: 'alert',
            },
            {
                label: 'Barcode Management',
                path: '/admin/barcodes',
                icon: 'barcode',
            },
        ],
    },
    {
        title: 'Purchasing',
        items: [
            {
                label: 'Suppliers',
                path: '/admin/suppliers',
                icon: 'supplier',
            },
            {
                label: 'Purchases',
                path: '/admin/purchases',
                icon: 'purchase',
            },
            {
                label: 'Supplier Dues',
                path: '/admin/supplier-dues',
                icon: 'wallet',
            },
        ],
    },
    {
        title: 'Sales & Customers',
        items: [
            {
                label: 'Sales',
                path: '/admin/sales',
                icon: 'receipt',
            },
            {
                label: 'Customers',
                path: '/admin/customers',
                icon: 'customers',
            },
            {
                label: 'Due Management',
                path: '/admin/dues',
                icon: 'cash',
            },
            {
                label: 'Sales Returns',
                path: '/admin/returns',
                icon: 'return',
            },
        ],
    },
    {
        title: 'Finance',
        items: [
            {
                label: 'Expenses',
                path: '/admin/expenses',
                icon: 'expenses',
            },
            {
                label: 'Reports',
                path: '/admin/reports',
                icon: 'chart',
            },
        ],
    },
    {
        title: 'Staff',
        items: [
            {
                label: 'Cashier Accounts',
                path: '/admin/users',
                icon: 'users',
            },
            {
                label: 'Cashier Shifts',
                path: '/admin/shifts',
                icon: 'shift',
            },
        ],
    },
    {
        title: 'System',
        items: [
            {
                label: 'Backup & Restore',
                path: '/admin/backups',
                icon: 'database',
            },
            {
                label: 'Settings',
                path: '/admin/settings',
                icon: 'settings',
            },
        ],
    },
];

const cashierNavigation: NavigationSection[] = [
    {
        title: 'Overview',
        items: [
            {
                label: 'Dashboard',
                path: '/cashier/dashboard',
                icon: 'dashboard',
            },
            {
                label: 'Cash Register',
                path: '/cashier/shift',
                icon: 'shift',
            },
            {
                label: 'New Sale',
                path: '/cashier/pos',
                icon: 'cart',
            },
        ],
    },
    {
        title: 'Sales & Customers',
        items: [
            {
                label: 'Customers',
                path: '/cashier/customers',
                icon: 'customers',
            },
            {
                label: 'Due Management',
                path: '/cashier/dues',
                icon: 'cash',
            },
            {
                label: 'Sales History',
                path: '/cashier/sales',
                icon: 'history',
            },
            {
                label: 'Sales Returns',
                path: '/cashier/returns',
                icon: 'return',
            },
        ],
    },
];

function isCurrentPath(
    currentPath: string,
    navigationPath: string,
): boolean {
    return (
        currentPath === navigationPath
        || currentPath.startsWith(
            `${navigationPath}/`,
        )
    );
}

const appLayoutStyles = `
    #sapo-app-shell,
    #sapo-app-shell::before,
    #sapo-app-shell::after,
    #sapo-app-shell .sapo-shell-sidebar,
    #sapo-app-shell .sapo-shell-sidebar *,
    #sapo-app-shell .sapo-shell-topbar,
    #sapo-app-shell .sapo-shell-topbar *,
    #sapo-app-shell .sapo-shell-overlay {
        box-sizing: border-box !important;
    }

    #sapo-app-shell {
        --shell-primary-950: #052e16;
        --shell-primary-900: #14532d;
        --shell-primary-800: #166534;
        --shell-primary-700: #15803d;
        --shell-primary-600: #16a34a;
        --shell-primary-100: #dcfce7;
        --shell-primary-50: #f0fdf4;

        --shell-danger-700: #b42318;
        --shell-danger-100: #fee4e2;

        --shell-text-950: #101828;
        --shell-text-800: #1d2939;
        --shell-text-700: #344054;
        --shell-text-600: #475467;
        --shell-text-500: #667085;

        --shell-border: #d8e0da;
        --shell-border-soft: #e8ede9;
        --shell-page: #f3f6f4;
        --shell-surface: #ffffff;

        display: grid !important;

        grid-template-columns:
            272px
            minmax(0, 1fr) !important;

        width: 100% !important;
        min-width: 0 !important;

        height: 100vh !important;
        height: 100dvh !important;

        margin: 0 !important;
        padding: 0 !important;

        overflow: hidden !important;

        color: var(--shell-text-950) !important;

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

        background: var(--shell-page) !important;

        isolation: isolate !important;

        text-rendering: optimizeLegibility !important;
        -webkit-font-smoothing: antialiased !important;
    }

    #sapo-app-shell button,
    #sapo-app-shell input {
        font: inherit !important;

        text-transform: none !important;
        letter-spacing: normal !important;
    }

    #sapo-app-shell button:focus-visible,
    #sapo-app-shell input:focus-visible,
    #sapo-app-shell a:focus-visible {
        outline:
            3px solid
            rgba(134, 239, 172, 0.55) !important;

        outline-offset: 2px !important;
    }

    #sapo-app-shell .sapo-shell-overlay {
        display: none !important;
    }

    #sapo-app-shell .sapo-shell-sidebar {
        position: relative !important;

        z-index: 1000 !important;

        display: flex !important;

        width: 272px !important;
        height: 100% !important;

        min-width: 272px !important;

        flex-direction: column !important;

        margin: 0 !important;
        padding: 0 !important;

        overflow: hidden !important;

        color: #ffffff !important;

        background:
            linear-gradient(
                180deg,
                #123d27 0%,
                var(--shell-primary-950) 100%
            ) !important;

        border: 0 !important;

        border-right:
            1px solid
            rgba(255, 255, 255, 0.08) !important;

        box-shadow:
            6px 0 22px
            rgba(5, 46, 22, 0.08) !important;
    }

    #sapo-app-shell .sapo-shell-brand-header {
        display: flex !important;

        min-height: 76px !important;
        flex: 0 0 auto !important;

        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;

        padding: 14px 16px !important;

        background:
            rgba(255, 255, 255, 0.035) !important;

        border-bottom:
            1px solid
            rgba(255, 255, 255, 0.09) !important;
    }

    #sapo-app-shell .sapo-shell-brand {
        display: flex !important;

        min-width: 0 !important;

        align-items: center !important;
        gap: 11px !important;

        color: inherit !important;

        text-decoration: none !important;
    }

    #sapo-app-shell .sapo-shell-brand-mark {
        display: grid !important;

        width: 42px !important;
        height: 42px !important;
        min-width: 42px !important;

        place-items: center !important;

        color: var(--shell-primary-900) !important;

        font-size: 14px !important;
        font-weight: 700 !important;
        line-height: 1 !important;

        background:
            linear-gradient(
                145deg,
                #dcfce7,
                #86efac
            ) !important;

        border:
            1px solid
            rgba(255, 255, 255, 0.4) !important;

        border-radius: 11px !important;

        box-shadow:
            0 6px 14px
            rgba(0, 0, 0, 0.17) !important;
    }

    #sapo-app-shell .sapo-shell-brand-copy {
        display: flex !important;

        min-width: 0 !important;

        flex-direction: column !important;
        gap: 2px !important;
    }

    #sapo-app-shell .sapo-shell-brand-name {
        display: block !important;

        overflow: hidden !important;

        color: #ffffff !important;

        font-size: 15px !important;
        font-weight: 700 !important;
        line-height: 1.25 !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-app-shell .sapo-shell-brand-subtitle {
        display: block !important;

        color: #a9c7b3 !important;

        font-size: 12px !important;
        font-weight: 500 !important;
        line-height: 1.25 !important;
    }

    #sapo-app-shell .sapo-shell-close-button,
    #sapo-app-shell .sapo-shell-menu-button {
        display: none !important;

        width: 40px !important;
        height: 40px !important;
        min-width: 40px !important;

        align-items: center !important;
        justify-content: center !important;

        padding: 0 !important;

        appearance: none !important;

        border-radius: 9px !important;

        cursor: pointer !important;
    }

    #sapo-app-shell .sapo-shell-close-button {
        color: #ffffff !important;

        background:
            rgba(255, 255, 255, 0.09) !important;

        border:
            1px solid
            rgba(255, 255, 255, 0.13) !important;
    }

    #sapo-app-shell
    .sapo-shell-close-button:hover {
        background:
            rgba(255, 255, 255, 0.16) !important;
    }

    #sapo-app-shell .sapo-shell-icon {
        width: 19px !important;
        height: 19px !important;
        min-width: 19px !important;

        flex: 0 0 19px !important;
    }

    #sapo-app-shell .sapo-shell-user-panel {
        display: flex !important;

        flex: 0 0 auto !important;

        align-items: center !important;
        gap: 10px !important;

        margin: 12px 12px 10px !important;
        padding: 11px !important;

        background:
            rgba(255, 255, 255, 0.07) !important;

        border:
            1px solid
            rgba(255, 255, 255, 0.10) !important;

        border-radius: 11px !important;
    }

    #sapo-app-shell .sapo-shell-avatar {
        display: grid !important;

        width: 38px !important;
        height: 38px !important;
        min-width: 38px !important;

        place-items: center !important;

        color: var(--shell-primary-900) !important;

        font-size: 14px !important;
        font-weight: 700 !important;
        line-height: 1 !important;

        background:
            linear-gradient(
                145deg,
                #dcfce7,
                #86efac
            ) !important;

        border-radius: 50% !important;
    }

    #sapo-app-shell .sapo-shell-user-copy {
        display: flex !important;

        min-width: 0 !important;

        flex: 1 1 auto !important;
        flex-direction: column !important;
        gap: 2px !important;
    }

    #sapo-app-shell .sapo-shell-user-name {
        display: block !important;

        overflow: hidden !important;

        color: #ffffff !important;

        font-size: 14px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-app-shell .sapo-shell-user-role {
        display: block !important;

        color: #a9c7b3 !important;

        font-size: 12px !important;
        font-weight: 500 !important;
        line-height: 1.25 !important;
    }

    #sapo-app-shell .sapo-shell-sidebar-tools {
        flex: 0 0 auto !important;

        padding: 0 12px 10px !important;
    }

    #sapo-app-shell .sapo-shell-search {
        position: relative !important;

        width: 100% !important;
    }

    #sapo-app-shell .sapo-shell-search-icon {
        position: absolute !important;

        top: 50% !important;
        left: 12px !important;

        width: 17px !important;
        height: 17px !important;

        color: #abc6b3 !important;

        transform: translateY(-50%) !important;

        pointer-events: none !important;
    }

    #sapo-app-shell .sapo-shell-search-input {
        display: block !important;

        width: 100% !important;
        height: 42px !important;
        min-height: 42px !important;

        padding:
            0
            38px
            0
            38px !important;

        color: #ffffff !important;

        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: normal !important;

        appearance: none !important;
        outline: none !important;

        background:
            rgba(255, 255, 255, 0.075) !important;

        border:
            1px solid
            rgba(255, 255, 255, 0.12) !important;

        border-radius: 9px !important;

        box-shadow: none !important;
    }

    #sapo-app-shell
    .sapo-shell-search-input::placeholder {
        color: #9db8a5 !important;

        opacity: 1 !important;
    }

    #sapo-app-shell
    .sapo-shell-search-input:focus {
        background:
            rgba(255, 255, 255, 0.11) !important;

        border-color: #86efac !important;

        box-shadow:
            0 0 0 3px
            rgba(134, 239, 172, 0.13) !important;
    }

    #sapo-app-shell .sapo-shell-clear-search {
        position: absolute !important;

        top: 50% !important;
        right: 5px !important;

        display: grid !important;

        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;

        place-items: center !important;

        padding: 0 !important;

        color: #dce8df !important;

        appearance: none !important;

        background: transparent !important;

        border: 0 !important;
        border-radius: 7px !important;

        transform: translateY(-50%) !important;

        cursor: pointer !important;
    }

    #sapo-app-shell
    .sapo-shell-clear-search:hover {
        color: #ffffff !important;

        background:
            rgba(255, 255, 255, 0.09) !important;
    }

    #sapo-app-shell
    .sapo-shell-clear-search svg {
        width: 16px !important;
        height: 16px !important;
    }

    #sapo-app-shell .sapo-shell-primary-action {
        display: flex !important;

        width: 100% !important;
        min-height: 44px !important;

        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;

        margin-top: 9px !important;

        padding: 9px 12px !important;

        color: var(--shell-primary-950) !important;

        font-size: 14px !important;
        font-weight: 700 !important;
        line-height: 1.2 !important;

        appearance: none !important;

        background:
            linear-gradient(
                135deg,
                #bbf7d0,
                #86efac
            ) !important;

        border:
            1px solid
            rgba(255, 255, 255, 0.32) !important;

        border-radius: 9px !important;

        box-shadow:
            0 5px 14px
            rgba(0, 0, 0, 0.16) !important;

        cursor: pointer !important;

        transition:
            transform 150ms ease,
            background 150ms ease,
            box-shadow 150ms ease !important;
    }

    #sapo-app-shell
    .sapo-shell-primary-action:hover {
        background:
            linear-gradient(
                135deg,
                #dcfce7,
                #a7f3d0
            ) !important;

        box-shadow:
            0 7px 16px
            rgba(0, 0, 0, 0.18) !important;

        transform: translateY(-1px) !important;
    }

    #sapo-app-shell .sapo-shell-navigation {
        display: block !important;

        min-height: 0 !important;
        flex: 1 1 auto !important;

        padding: 2px 10px 16px !important;

        overflow-x: hidden !important;
        overflow-y: auto !important;

        scrollbar-width: thin !important;

        scrollbar-color:
            rgba(255, 255, 255, 0.18)
            transparent !important;
    }

    #sapo-app-shell
    .sapo-shell-navigation::-webkit-scrollbar {
        width: 6px !important;
    }

    #sapo-app-shell
    .sapo-shell-navigation::-webkit-scrollbar-thumb {
        background:
            rgba(255, 255, 255, 0.18) !important;

        border-radius: 999px !important;
    }

    #sapo-app-shell .sapo-shell-nav-section {
        margin: 0 0 15px !important;
    }

    #sapo-app-shell
    .sapo-shell-nav-section:last-child {
        margin-bottom: 0 !important;
    }

    #sapo-app-shell .sapo-shell-section-title {
        margin: 0 0 5px !important;

        padding: 0 9px !important;

        color: #7fa38b !important;

        font-size: 10px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        letter-spacing: 0.09em !important;

        text-transform: uppercase !important;
    }

    #sapo-app-shell .sapo-shell-nav-links {
        display: flex !important;

        flex-direction: column !important;
        gap: 3px !important;
    }

    #sapo-app-shell .sapo-shell-nav-link {
        position: relative !important;

        display: flex !important;

        width: 100% !important;
        min-height: 44px !important;

        align-items: center !important;
        gap: 10px !important;

        padding: 8px 10px !important;

        overflow: hidden !important;

        color: #cfe0d5 !important;

        font-size: 14px !important;
        font-weight: 500 !important;
        line-height: 1.25 !important;

        text-align: left !important;
        text-decoration: none !important;

        background: transparent !important;

        border:
            1px solid
            transparent !important;

        border-radius: 9px !important;

        box-shadow: none !important;

        transition:
            color 150ms ease,
            background 150ms ease,
            border-color 150ms ease !important;
    }

    #sapo-app-shell
    .sapo-shell-nav-link:hover {
        color: #ffffff !important;

        text-decoration: none !important;

        background:
            rgba(255, 255, 255, 0.075) !important;

        border-color:
            rgba(255, 255, 255, 0.05) !important;
    }

    #sapo-app-shell
    .sapo-shell-nav-link.active {
        color: var(--shell-primary-950) !important;

        font-weight: 700 !important;

        background:
            linear-gradient(
                135deg,
                #dcfce7,
                #bbf7d0
            ) !important;

        border-color: #86efac !important;

        box-shadow:
            0 4px 12px
            rgba(0, 0, 0, 0.13) !important;
    }

    #sapo-app-shell .sapo-shell-nav-icon-wrap {
        display: grid !important;

        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;

        place-items: center !important;

        color: #bbd1c2 !important;

        background:
            rgba(255, 255, 255, 0.075) !important;

        border:
            1px solid
            rgba(255, 255, 255, 0.06) !important;

        border-radius: 8px !important;
    }

    #sapo-app-shell
    .sapo-shell-nav-link.active
    .sapo-shell-nav-icon-wrap {
        color: #ffffff !important;

        background:
            var(--shell-primary-700) !important;

        border-color:
            var(--shell-primary-700) !important;
    }

    #sapo-app-shell
    .sapo-shell-nav-icon-wrap svg {
        width: 16px !important;
        height: 16px !important;
    }

    #sapo-app-shell .sapo-shell-nav-label {
        min-width: 0 !important;
        flex: 1 1 auto !important;

        overflow: hidden !important;

        color: inherit !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-app-shell .sapo-shell-nav-chevron {
        width: 15px !important;
        height: 15px !important;

        flex: 0 0 15px !important;

        color: currentColor !important;

        opacity: 0 !important;

        transform:
            translateX(-3px) !important;

        transition:
            opacity 150ms ease,
            transform 150ms ease !important;
    }

    #sapo-app-shell
    .sapo-shell-nav-link:hover
    .sapo-shell-nav-chevron,
    #sapo-app-shell
    .sapo-shell-nav-link.active
    .sapo-shell-nav-chevron {
        opacity: 0.8 !important;

        transform:
            translateX(0) !important;
    }

    #sapo-app-shell .sapo-shell-no-results {
        margin: 12px 2px !important;

        padding: 17px 13px !important;

        color: #c9dacf !important;

        font-size: 13px !important;
        line-height: 1.5 !important;

        text-align: center !important;

        background:
            rgba(255, 255, 255, 0.055) !important;

        border:
            1px dashed
            rgba(255, 255, 255, 0.14) !important;

        border-radius: 9px !important;
    }

    #sapo-app-shell .sapo-shell-sidebar-footer {
        flex: 0 0 auto !important;

        padding: 10px 12px 12px !important;

        background:
            rgba(0, 0, 0, 0.13) !important;

        border-top:
            1px solid
            rgba(255, 255, 255, 0.08) !important;
    }

    #sapo-app-shell .sapo-shell-logout-error {
        margin: 0 0 8px !important;

        padding: 8px 10px !important;

        color: #fecaca !important;

        font-size: 12px !important;
        line-height: 1.4 !important;

        background:
            rgba(185, 28, 28, 0.18) !important;

        border:
            1px solid
            rgba(252, 165, 165, 0.18) !important;

        border-radius: 8px !important;
    }

    #sapo-app-shell .sapo-shell-logout-button {
        display: flex !important;

        width: 100% !important;
        min-height: 42px !important;

        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;

        padding: 8px 12px !important;

        color: #ffffff !important;

        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;

        appearance: none !important;

        background:
            rgba(220, 38, 38, 0.14) !important;

        border:
            1px solid
            rgba(252, 165, 165, 0.16) !important;

        border-radius: 9px !important;

        cursor: pointer !important;
    }

    #sapo-app-shell
    .sapo-shell-logout-button:hover:not(:disabled) {
        background:
            rgba(220, 38, 38, 0.25) !important;
    }

    #sapo-app-shell
    .sapo-shell-logout-button:disabled {
        opacity: 0.6 !important;

        cursor: not-allowed !important;
    }

    #sapo-app-shell .sapo-shell-app-name {
        display: block !important;

        margin-top: 8px !important;

        overflow: hidden !important;

        color: #6e927a !important;

        font-size: 10px !important;
        font-weight: 500 !important;
        line-height: 1.3 !important;

        text-align: center !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-app-shell .sapo-shell-main {
        display: flex !important;

        min-width: 0 !important;
        min-height: 0 !important;

        height: 100% !important;

        flex-direction: column !important;

        background: var(--shell-page) !important;

        overflow: hidden !important;
    }

    #sapo-app-shell .sapo-shell-topbar {
        position: relative !important;

        z-index: 900 !important;

        display: flex !important;

        width: 100% !important;
        min-height: 72px !important;

        flex: 0 0 auto !important;

        align-items: center !important;
        justify-content: space-between !important;
        gap: 18px !important;

        padding: 11px 22px !important;

        background:
            rgba(255, 255, 255, 0.96) !important;

        border-bottom:
            1px solid
            var(--shell-border) !important;

        box-shadow:
            0 2px 10px
            rgba(16, 24, 40, 0.045) !important;

        backdrop-filter: blur(12px) !important;
    }

    #sapo-app-shell .sapo-shell-topbar-left,
    #sapo-app-shell .sapo-shell-topbar-right {
        display: flex !important;

        min-width: 0 !important;

        align-items: center !important;
        gap: 12px !important;
    }

    #sapo-app-shell .sapo-shell-menu-button {
        color: var(--shell-primary-800) !important;

        background:
            var(--shell-primary-50) !important;

        border:
            1px solid
            #b8dfc3 !important;
    }

    #sapo-app-shell
    .sapo-shell-menu-button:hover {
        background:
            var(--shell-primary-100) !important;
    }

    #sapo-app-shell .sapo-shell-page-heading {
        display: flex !important;

        min-width: 0 !important;

        flex-direction: column !important;
        gap: 1px !important;
    }

    #sapo-app-shell .sapo-shell-page-context {
        display: block !important;

        color: var(--shell-primary-700) !important;

        font-size: 11px !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
        letter-spacing: 0.055em !important;

        text-transform: uppercase !important;
    }

    #sapo-app-shell .sapo-shell-page-title {
        margin: 0 !important;

        overflow: hidden !important;

        color: var(--shell-text-950) !important;

        font-size: 20px !important;
        font-weight: 700 !important;
        line-height: 1.25 !important;
        letter-spacing: -0.02em !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-app-shell .sapo-shell-topbar-action {
        display: inline-flex !important;

        min-height: 42px !important;

        align-items: center !important;
        justify-content: center !important;
        gap: 7px !important;

        padding: 8px 13px !important;

        color: #ffffff !important;

        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;

        white-space: nowrap !important;

        appearance: none !important;

        background:
            var(--shell-primary-700) !important;

        border:
            1px solid
            var(--shell-primary-700) !important;

        border-radius: 9px !important;

        box-shadow:
            0 4px 12px
            rgba(21, 128, 61, 0.18) !important;

        cursor: pointer !important;

        transition:
            background 150ms ease,
            border-color 150ms ease,
            transform 150ms ease !important;
    }

    #sapo-app-shell
    .sapo-shell-topbar-action:hover {
        background:
            var(--shell-primary-800) !important;

        border-color:
            var(--shell-primary-800) !important;

        transform:
            translateY(-1px) !important;
    }

    #sapo-app-shell .sapo-shell-topbar-user {
        display: flex !important;

        min-width: 0 !important;

        align-items: center !important;
        gap: 9px !important;

        padding-left: 12px !important;

        border-left:
            1px solid
            var(--shell-border) !important;
    }

    #sapo-app-shell .sapo-shell-topbar-user-copy {
        display: flex !important;

        max-width: 190px !important;
        min-width: 0 !important;

        flex-direction: column !important;
        gap: 1px !important;

        text-align: right !important;
    }

    #sapo-app-shell .sapo-shell-topbar-name {
        display: block !important;

        overflow: hidden !important;

        color: var(--shell-text-800) !important;

        font-size: 13px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-app-shell .sapo-shell-topbar-username {
        display: block !important;

        overflow: hidden !important;

        color: var(--shell-text-500) !important;

        font-size: 11px !important;
        font-weight: 500 !important;
        line-height: 1.25 !important;

        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    #sapo-app-shell .sapo-shell-topbar-avatar {
        display: grid !important;

        width: 38px !important;
        height: 38px !important;
        min-width: 38px !important;

        place-items: center !important;

        color: var(--shell-primary-900) !important;

        font-size: 13px !important;
        font-weight: 700 !important;
        line-height: 1 !important;

        background:
            var(--shell-primary-100) !important;

        border:
            1px solid
            #b8dfc3 !important;

        border-radius: 50% !important;
    }

    /*
     * Outlet children are intentionally not reset.
     * Every page can retain its own component styles.
     * This is the ONLY element in the shell that scrolls.
     */
    #sapo-app-shell .sapo-shell-content {
        display: block !important;

        width: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        flex: 1 1 auto !important;

        padding: 24px !important;

        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior-y: contain !important;

        scrollbar-gutter: stable !important;
        scrollbar-width: thin !important;

        scrollbar-color:
            #b7c7bd
            transparent !important;

        background: var(--shell-page) !important;
    }

    #sapo-app-shell
    .sapo-shell-content::-webkit-scrollbar {
        width: 10px !important;
    }

    #sapo-app-shell
    .sapo-shell-content::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-app-shell
    .sapo-shell-content::-webkit-scrollbar-thumb {
        background: #b7c7bd !important;

        border: 2px solid transparent !important;
        border-radius: 999px !important;

        background-clip: content-box !important;
    }

    #sapo-app-shell
    .sapo-shell-content::-webkit-scrollbar-thumb:hover {
        background: #94a89c !important;

        background-clip: content-box !important;
    }

    @media (max-width: 1100px) {
        #sapo-app-shell {
            display: block !important;

            height: 100vh !important;
            height: 100dvh !important;

            overflow: hidden !important;
        }

        #sapo-app-shell .sapo-shell-overlay {
            position: fixed !important;

            inset: 0 !important;

            z-index: 1100 !important;

            display: block !important;

            visibility: hidden !important;

            width: 100% !important;
            height: 100% !important;

            padding: 0 !important;

            appearance: none !important;

            background:
                rgba(3, 18, 10, 0.58) !important;

            border: 0 !important;

            opacity: 0 !important;

            backdrop-filter: blur(2px) !important;

            transition:
                visibility 180ms ease,
                opacity 180ms ease !important;

            cursor: pointer !important;
        }

        #sapo-app-shell
        .sapo-shell-overlay.visible {
            visibility: visible !important;

            opacity: 1 !important;
        }

        #sapo-app-shell .sapo-shell-sidebar {
            position: fixed !important;

            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;

            z-index: 1200 !important;

            width:
                min(
                    86vw,
                    292px
                ) !important;

            min-width: 0 !important;
            height: 100% !important;

            transform:
                translateX(-104%) !important;

            transition:
                transform 210ms ease !important;
        }

        #sapo-app-shell
        .sapo-shell-sidebar.open {
            transform:
                translateX(0) !important;
        }

        #sapo-app-shell .sapo-shell-close-button,
        #sapo-app-shell .sapo-shell-menu-button {
            display: inline-flex !important;
        }

        #sapo-app-shell .sapo-shell-main {
            height: 100% !important;
        }
    }

    @media (max-width: 720px) {
        #sapo-app-shell .sapo-shell-topbar {
            min-height: 64px !important;

            gap: 9px !important;

            padding: 9px 12px !important;
        }

        #sapo-app-shell
        .sapo-shell-page-context {
            display: none !important;
        }

        #sapo-app-shell
        .sapo-shell-page-title {
            max-width: 36vw !important;

            font-size: 17px !important;
        }

        #sapo-app-shell
        .sapo-shell-topbar-action {
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            min-height: 40px !important;

            padding: 0 !important;
        }

        #sapo-app-shell
        .sapo-shell-topbar-action-text,
        #sapo-app-shell
        .sapo-shell-topbar-user-copy {
            display: none !important;
        }

        #sapo-app-shell
        .sapo-shell-topbar-user {
            padding-left: 8px !important;
        }

        #sapo-app-shell
        .sapo-shell-content {
            padding: 14px !important;
        }
    }

    @media (max-width: 420px) {
        #sapo-app-shell
        .sapo-shell-page-title {
            max-width: 30vw !important;

            font-size: 16px !important;
        }

        #sapo-app-shell
        .sapo-shell-content {
            padding: 10px !important;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        #sapo-app-shell *,
        #sapo-app-shell *::before,
        #sapo-app-shell *::after {
            scroll-behavior: auto !important;

            transition: none !important;
        }
    }

    @media print {
        #sapo-app-shell .sapo-shell-sidebar,
        #sapo-app-shell .sapo-shell-topbar,
        #sapo-app-shell .sapo-shell-overlay {
            display: none !important;
        }

        #sapo-app-shell,
        #sapo-app-shell .sapo-shell-main,
        #sapo-app-shell .sapo-shell-content {
            display: block !important;

            height: auto !important;
            min-height: auto !important;

            overflow: visible !important;

            margin: 0 !important;
            padding: 0 !important;

            background: #ffffff !important;
        }
    }
`;

export default function AppLayout() {
    const {
        user,
        logout,
    } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const [
        isSidebarOpen,
        setIsSidebarOpen,
    ] = useState(false);

    const [
        isLoggingOut,
        setIsLoggingOut,
    ] = useState(false);

    const [
        logoutError,
        setLogoutError,
    ] = useState('');

    const [
        searchText,
        setSearchText,
    ] = useState('');

    const navigationSections = useMemo(
        () => (
            user?.role === 'admin'
                ? adminNavigation
                : cashierNavigation
        ),
        [user?.role],
    );

    const navigationItems = useMemo(
        () => (
            navigationSections.flatMap(
                (section) => section.items,
            )
        ),
        [navigationSections],
    );

    const currentPage = useMemo(
        () => (
            navigationItems.find(
                (item) =>
                    isCurrentPath(
                        location.pathname,
                        item.path,
                    ),
            )
        ),
        [
            location.pathname,
            navigationItems,
        ],
    );

    const currentSection = useMemo(
        () => (
            navigationSections.find(
                (section) => (
                    section.items.some(
                        (item) =>
                            isCurrentPath(
                                location.pathname,
                                item.path,
                            ),
                    )
                ),
            )
        ),
        [
            location.pathname,
            navigationSections,
        ],
    );

    const filteredNavigation = useMemo(
        () => {
            const query = searchText
                .trim()
                .toLowerCase();

            if (!query) {
                return navigationSections;
            }

            return navigationSections
                .map(
                    (section) => ({
                        ...section,

                        items:
                            section.items.filter(
                                (item) =>
                                    item.label
                                        .toLowerCase()
                                        .includes(query),
                            ),
                    }),
                )
                .filter(
                    (section) =>
                        section.items.length > 0,
                );
        },
        [
            navigationSections,
            searchText,
        ],
    );

    useEffect(() => {
        setIsSidebarOpen(false);
        setSearchText('');
    }, [location.pathname]);

    useEffect(() => {
        if (!isSidebarOpen) {
            return;
        }

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            'hidden';

        const handleEscape = (
            event: KeyboardEvent,
        ): void => {
            if (event.key === 'Escape') {
                setIsSidebarOpen(false);
            }
        };

        window.addEventListener(
            'keydown',
            handleEscape,
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;

            window.removeEventListener(
                'keydown',
                handleEscape,
            );
        };
    }, [isSidebarOpen]);

    if (!user) {
        return null;
    }

    const userInitial =
        user.name
            .trim()
            .charAt(0)
            .toUpperCase() || 'U';

    const newSalePath =
        user.role === 'admin'
            ? '/admin/pos'
            : '/cashier/pos';

    const roleTitle =
        user.role === 'admin'
            ? 'Administrator'
            : 'Cashier';

    const workspaceTitle =
        user.role === 'admin'
            ? 'Administration'
            : 'Cashier Workspace';

    const pageContext =
        currentSection?.title
        ?? workspaceTitle;

    const pageTitle =
        currentPage?.label
        ?? 'Samarakoon Agro POS';

    const closeSidebar = (): void => {
        setIsSidebarOpen(false);
    };

    const handleNavigation = (): void => {
        setSearchText('');
        closeSidebar();
    };

    const handleNewSale = (): void => {
        setSearchText('');
        closeSidebar();

        navigate(newSalePath);
    };

    const handleLogout =
        async (): Promise<void> => {
            if (isLoggingOut) {
                return;
            }

            setIsLoggingOut(true);
            setLogoutError('');

            try {
                await logout();

                navigate(
                    '/login',
                    {
                        replace: true,
                    },
                );
            } catch {
                setLogoutError(
                    'Unable to log out. Please try again.',
                );
            } finally {
                setIsLoggingOut(false);
            }
        };

    return (
        <div id="sapo-app-shell">
            <style>
                {appLayoutStyles}
            </style>

            <button
                type="button"
                className={
                    isSidebarOpen
                        ? 'sapo-shell-overlay visible'
                        : 'sapo-shell-overlay'
                }
                aria-label="Close navigation menu"
                aria-hidden={!isSidebarOpen}
                tabIndex={
                    isSidebarOpen
                        ? 0
                        : -1
                }
                onClick={closeSidebar}
            />

            <aside
                className={
                    isSidebarOpen
                        ? 'sapo-shell-sidebar open'
                        : 'sapo-shell-sidebar'
                }
                aria-label="Application sidebar"
            >
                <header className="sapo-shell-brand-header">
                    <div className="sapo-shell-brand">
                        <div className="sapo-shell-brand-mark">
                            SA
                        </div>

                        <div className="sapo-shell-brand-copy">
                            <strong className="sapo-shell-brand-name">
                                Samarakoon Agro
                            </strong>

                            <span className="sapo-shell-brand-subtitle">
                                Point of Sale System
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="sapo-shell-close-button"
                        aria-label="Close navigation menu"
                        onClick={closeSidebar}
                    >
                        <Icon
                            name="close"
                            className="sapo-shell-icon"
                        />
                    </button>
                </header>

                <section className="sapo-shell-user-panel">
                    <div className="sapo-shell-avatar">
                        {userInitial}
                    </div>

                    <div className="sapo-shell-user-copy">
                        <strong className="sapo-shell-user-name">
                            {user.name}
                        </strong>

                        <span className="sapo-shell-user-role">
                            {roleTitle}
                        </span>
                    </div>
                </section>

                <div className="sapo-shell-sidebar-tools">
                    <div className="sapo-shell-search">
                        <Icon
                            name="search"
                            className="sapo-shell-search-icon"
                        />

                        <input
                            type="search"
                            className="sapo-shell-search-input"
                            value={searchText}
                            placeholder="Search modules"
                            aria-label="Search navigation modules"
                            onChange={(event) => {
                                setSearchText(
                                    event.target.value,
                                );
                            }}
                        />

                        {searchText && (
                            <button
                                type="button"
                                className="sapo-shell-clear-search"
                                aria-label="Clear module search"
                                onClick={() => {
                                    setSearchText('');
                                }}
                            >
                                <Icon name="close" />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        className="sapo-shell-primary-action"
                        onClick={handleNewSale}
                    >
                        <Icon
                            name="plus"
                            className="sapo-shell-icon"
                        />

                        Start New Sale
                    </button>
                </div>

                <nav
                    className="sapo-shell-navigation"
                    aria-label="Main navigation"
                >
                    {filteredNavigation.map(
                        (section) => (
                            <section
                                key={section.title}
                                className="sapo-shell-nav-section"
                            >
                                <h2 className="sapo-shell-section-title">
                                    {section.title}
                                </h2>

                                <div className="sapo-shell-nav-links">
                                    {section.items.map(
                                        (item) => (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
                                                onClick={
                                                    handleNavigation
                                                }
                                                className={() => (
                                                    isCurrentPath(
                                                        location.pathname,
                                                        item.path,
                                                    )
                                                        ? 'sapo-shell-nav-link active'
                                                        : 'sapo-shell-nav-link'
                                                )}
                                            >
                                                <span className="sapo-shell-nav-icon-wrap">
                                                    <Icon
                                                        name={
                                                            item.icon
                                                        }
                                                    />
                                                </span>

                                                <span className="sapo-shell-nav-label">
                                                    {item.label}
                                                </span>

                                                <Icon
                                                    name="chevron-right"
                                                    className="sapo-shell-nav-chevron"
                                                />
                                            </NavLink>
                                        ),
                                    )}
                                </div>
                            </section>
                        ),
                    )}

                    {filteredNavigation.length === 0 && (
                        <div className="sapo-shell-no-results">
                            No module matches “{searchText}”.
                        </div>
                    )}
                </nav>

                <footer className="sapo-shell-sidebar-footer">
                    {logoutError && (
                        <div
                            className="sapo-shell-logout-error"
                            role="alert"
                        >
                            {logoutError}
                        </div>
                    )}

                    <button
                        type="button"
                        className="sapo-shell-logout-button"
                        disabled={isLoggingOut}
                        onClick={() => {
                            void handleLogout();
                        }}
                    >
                        <Icon
                            name="logout"
                            className="sapo-shell-icon"
                        />

                        {isLoggingOut
                            ? 'Logging out...'
                            : 'Log Out'}
                    </button>

                    <small className="sapo-shell-app-name">
                        {APPLICATION_NAME}
                    </small>
                </footer>
            </aside>

            <div className="sapo-shell-main">
                <header className="sapo-shell-topbar">
                    <div className="sapo-shell-topbar-left">
                        <button
                            type="button"
                            className="sapo-shell-menu-button"
                            aria-label="Open navigation menu"
                            aria-expanded={isSidebarOpen}
                            onClick={() => {
                                setIsSidebarOpen(
                                    (currentValue) =>
                                        !currentValue,
                                );
                            }}
                        >
                            <Icon
                                name="menu"
                                className="sapo-shell-icon"
                            />
                        </button>

                        <div className="sapo-shell-page-heading">
                            <span className="sapo-shell-page-context">
                                {pageContext}
                            </span>

                            <h1 className="sapo-shell-page-title">
                                {pageTitle}
                            </h1>
                        </div>
                    </div>

                    <div className="sapo-shell-topbar-right">
                        <button
                            type="button"
                            className="sapo-shell-topbar-action"
                            onClick={handleNewSale}
                        >
                            <Icon
                                name="plus"
                                className="sapo-shell-icon"
                            />

                            <span className="sapo-shell-topbar-action-text">
                                New Sale
                            </span>
                        </button>

                        <div className="sapo-shell-topbar-user">
                            <div className="sapo-shell-topbar-user-copy">
                                <strong className="sapo-shell-topbar-name">
                                    {user.name}
                                </strong>

                                <span className="sapo-shell-topbar-username">
                                    @{user.username}
                                </span>
                            </div>

                            <div
                                className="sapo-shell-topbar-avatar"
                                aria-label={
                                    `${user.name}, ${roleTitle}`
                                }
                            >
                                {userInitial}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="sapo-shell-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}