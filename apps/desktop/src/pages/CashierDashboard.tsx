import {
    useState,
} from 'react';

import {
    useNavigate,
} from 'react-router';

import {
    useAuth,
} from '../auth/AuthContext';

export default function CashierDashboard() {
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
                        <span>Cashier Portal</span>
                    </div>
                </div>

                <div className="user-actions">
                    <div className="user-summary">
                        <strong>{user?.name}</strong>
                        <span>Cashier</span>
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
                            Point of Sale
                        </p>

                        <h1>Cashier Dashboard</h1>

                        <p>
                            Welcome back, {user?.name}.
                            Your Cashier authentication
                            is working correctly.
                        </p>
                    </div>

                    <span className="role-badge cashier-badge">
                        Cashier access
                    </span>
                </div>

                <section className="stat-grid">
                    <article className="stat-card">
                        <span>Current Shift</span>
                        <strong>Not opened</strong>
                        <p>
                            Cash register sessions will
                            be added later.
                        </p>
                    </article>

                    <article className="stat-card">
                        <span>Today’s Invoices</span>
                        <strong>Not configured</strong>
                        <p>
                            Sales transactions will be
                            added later.
                        </p>
                    </article>

                    <article className="stat-card">
                        <span>Current Cash</span>
                        <strong>Not configured</strong>
                        <p>
                            Cash tracking will be added
                            later.
                        </p>
                    </article>
                </section>

                <section className="empty-state">
                    <div className="empty-icon">
                        ✓
                    </div>

                    <div>
                        <h2>
                            Cashier authentication successful
                        </h2>

                        <p>
                            This account will have access
                            to the future POS sales screen,
                            customers and authorised returns.
                        </p>
                    </div>
                </section>
            </section>
        </main>
    );
}