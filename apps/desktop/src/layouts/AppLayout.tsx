import {
    useMemo,
    useState,
} from 'react';

import {
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
} from 'react-router';

import { APPLICATION_NAME }
    from '../config/app';

import { useAuth }
    from '../auth/AuthContext';

interface NavigationItem {
    label: string;
    shortLabel: string;
    path: string;
}

const adminNavigation:
    NavigationItem[] = [
        {
            label: 'Dashboard',
            shortLabel: 'D',
            path: '/admin/dashboard',
        },
        {
            label: 'New Sale',
            shortLabel: 'NS',
            path: '/admin/pos',
        },
        {
            label: 'Categories',
            shortLabel: 'C',
            path: '/admin/categories',
        },
        {
            label: 'Products',
            shortLabel: 'P',
            path: '/admin/products',
        },
        {
            label: 'Suppliers',
            shortLabel: 'S',
            path: '/admin/suppliers',
        },
        {
            label: 'Purchases',
            shortLabel: 'PU',
            path: '/admin/purchases',
        },
        {
            label: 'Inventory',
            shortLabel: 'I',
            path: '/admin/inventory',
        },

        {
            label: 'Sales Returns',
            shortLabel: 'R',
            path: '/admin/returns',
        },

        {
            label: 'Customers',
            shortLabel: 'C',
            path: '/admin/customers',
        },
        {
            label: 'Due Management',
            shortLabel: 'D',
            path: '/admin/dues',
        },
        {
            label: 'Sales',
            shortLabel: 'SA',
            path: '/admin/sales',
        },
        {
            label: 'Expenses',
            shortLabel: 'E',
            path: '/admin/expenses',
        },
        {
            label: 'Reports',
            shortLabel: 'R',
            path: '/admin/reports',
        },
        {
            label: 'Cashier Accounts',
            shortLabel: 'CA',
            path: '/admin/users',
        },
        {
            label: 'Settings',
            shortLabel: 'SE',
            path: '/admin/settings',
        },
    ];

const cashierNavigation:
    NavigationItem[] = [
        {
            label: 'Dashboard',
            shortLabel: 'D',
            path: '/cashier/dashboard',
        },
        {
            label: 'New Sale',
            shortLabel: 'NS',
            path: '/cashier/pos',
        },
        {
            label: 'Customers',
            shortLabel: 'C',
            path: '/cashier/customers',
        },
        {
            label: 'Due Management',
            shortLabel: 'D',
            path: '/cashier/dues',
        },
        {
            label: 'Sales History',
            shortLabel: 'SH',
            path: '/cashier/sales',
        },
        {
            label: 'Sales Returns',
            shortLabel: 'R',
            path: '/cashier/returns',
        },
    ];

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

    const navigation = useMemo(
        () => (
            user?.role === 'admin'
                ? adminNavigation
                : cashierNavigation
        ),
        [user?.role],
    );

    const currentPage = useMemo(
        () => (
            navigation.find(
                (item) =>
                    location.pathname ===
                    item.path ||
                    location.pathname.startsWith(
                        `${item.path}/`,
                    ),
            )
        ),
        [
            location.pathname,
            navigation,
        ],
    );

    if (!user) {
        return null;
    }

    const handleLogout =
        async (): Promise<void> => {
            if (isLoggingOut) {
                return;
            }

            setIsLoggingOut(true);

            try {
                await logout();

                navigate(
                    '/login',
                    {
                        replace: true,
                    },
                );
            } finally {
                setIsLoggingOut(false);
            }
        };

    const closeSidebar = (): void => {
        setIsSidebarOpen(false);
    };

    const userInitial =
        user.name
            .trim()
            .charAt(0)
            .toUpperCase() || 'U';

    return (
        <div className="app-shell">
            <div
                className={
                    isSidebarOpen
                        ? 'sidebar-overlay visible'
                        : 'sidebar-overlay'
                }
                onClick={closeSidebar}
                aria-hidden="true"
            />

            <aside
                className={
                    isSidebarOpen
                        ? 'app-sidebar open'
                        : 'app-sidebar'
                }
            >
                <div className="sidebar-brand">
                    <div className="brand-mark">
                        S
                    </div>

                    <div>
                        <strong>Samarakoon</strong>
                        <span>Agro POS System</span>
                    </div>
                </div>

                <div className="sidebar-user">
                    <div className="sidebar-avatar">
                        {userInitial}
                    </div>

                    <div className="sidebar-user-details">
                        <strong>{user.name}</strong>

                        <span>
                            {user.role === 'admin'
                                ? 'Owner / Administrator'
                                : 'Cashier'}
                        </span>
                    </div>
                </div>

                <nav
                    className="sidebar-navigation"
                    aria-label="Main navigation"
                >
                    {navigation.map(
                        (item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={closeSidebar}
                                className={({
                                    isActive,
                                }) =>
                                    isActive
                                        ? 'sidebar-link active'
                                        : 'sidebar-link'
                                }
                            >
                                <span className="sidebar-link-icon">
                                    {item.shortLabel}
                                </span>

                                <span>
                                    {item.label}
                                </span>
                            </NavLink>
                        ),
                    )}
                </nav>

                <div className="sidebar-footer">
                    <button
                        type="button"
                        className="sidebar-logout-button"
                        onClick={() => {
                            void handleLogout();
                        }}
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut
                            ? 'Logging out...'
                            : 'Logout'}
                    </button>

                    <small>
                        {APPLICATION_NAME}
                    </small>
                </div>
            </aside>

            <div className="app-main">
                <header className="app-topbar">
                    <div className="topbar-left">
                        <button
                            type="button"
                            className="menu-button"
                            aria-label="Open navigation menu"
                            onClick={() => {
                                setIsSidebarOpen(
                                    (current) => !current,
                                );
                            }}
                        >
                            ☰
                        </button>

                        <div>
                            <span className="topbar-eyebrow">
                                {user.role === 'admin'
                                    ? 'Administration'
                                    : 'Cashier Workspace'}
                            </span>

                            <h1>
                                {currentPage?.label ??
                                    'Samarakoon Agro POS'}
                            </h1>
                        </div>
                    </div>

                    <div className="topbar-user">
                        <div>
                            <strong>{user.name}</strong>
                            <span>@{user.username}</span>
                        </div>

                        <div className="topbar-avatar">
                            {userInitial}
                        </div>
                    </div>
                </header>

                <main className="app-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}