import {
    useState,
} from 'react';

import {
    useNavigate,
} from 'react-router';

import {
    useAuth,
} from '../auth/AuthContext';

export default function AdminDashboard() {
    const navigate = useNavigate();

    const {
        user,
        logout,
    } = useAuth();

    const [
        isLoggingOut,
        setIsLoggingOut,
    ] = useState(false);

    const handleLogout = async () => {
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

    return (
        <main className="dashboard-page">
            <header className="topbar">
                <div className="topbar-brand">
                    <div className="small-logo">
                        S
                    </div>

                    <div>
                        <strong>Samarakoon POS</strong>
                        <span>Owner/Admin Portal</span>
                    </div>
                </div>

                <div className="user-actions">
                    <div className="user-summary">
                        <strong>{user?.name}</strong>
                        <span>Owner/Admin</span>
                    </div>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut
                            ? 'Logging out...'
                            : 'Logout'}
                    </button>
                </div>
            </header>

            <section className="dashboard-content">
                <div className="page-heading">
                    <div>
                        <p className="page-eyebrow">
                            Administration
                        </p>

                        <h1>Admin Dashboard</h1>

                        <p>
                            Welcome back, {user?.name}.
                            Your Owner/Admin authentication
                            is working correctly.
                        </p>
                    </div>

                    <span className="role-badge admin-badge">
                        Admin access
                    </span>
                </div>

                <section className="stat-grid">
                    <article className="stat-card">
                        <span>Today’s Sales</span>
                        <strong>Not configured</strong>
                        <p>
                            Sales development will be
                            added later.
                        </p>
                    </article>

                    <article className="stat-card">
                        <span>Products</span>
                        <strong>Not configured</strong>
                        <p>
                            Product management will be
                            added later.
                        </p>
                    </article>

                    <article className="stat-card">
                        <span>Low Stock</span>
                        <strong>Not configured</strong>
                        <p>
                            Inventory alerts will be
                            added later.
                        </p>
                    </article>
                </section>

                <section className="empty-state">
                    <div className="empty-icon">
                        ✓
                    </div>

                    <div>
                        <h2>
                            Admin authentication successful
                        </h2>

                        <p>
                            This account can access future
                            product, purchase, user, report
                            and settings modules.
                        </p>
                    </div>
                </section>
            </section>
        </main>
    );
}