import { Link }
    from 'react-router';

import { useAuth }
    from '../../auth/AuthContext';

export default function CashierDashboardPage() {
    const {
        user,
    } = useAuth();

    return (
        <div className="page-stack">
            <section className="welcome-panel cashier-welcome">
                <div>
                    <span className="page-kicker">
                        Cashier workspace
                    </span>

                    <h2>
                        Welcome, {user?.name}.
                    </h2>

                    <p>
                        Start a new sale or review
                        your available cashier
                        functions.
                    </p>
                </div>

                <Link
                    to="/cashier/pos"
                    className="primary-button"
                >
                    Start New Sale
                </Link>
            </section>

            <section className="summary-grid cashier-summary-grid">
                <article className="summary-card">
                    <span>System status</span>
                    <strong>Ready</strong>
                    <small>
                        Connected to the API
                    </small>
                </article>

                <article className="summary-card">
                    <span>Current role</span>
                    <strong>Cashier</strong>
                    <small>
                        Sales workspace access
                    </small>
                </article>

                <article className="summary-card">
                    <span>Account status</span>
                    <strong>Active</strong>
                    <small>
                        Login verified
                    </small>
                </article>
            </section>

            <section className="content-card">
                <div className="section-heading">
                    <div>
                        <span className="page-kicker">
                            Quick access
                        </span>

                        <h3>
                            Cashier operations
                        </h3>
                    </div>
                </div>

                <div className="quick-action-grid">
                    <Link
                        to="/cashier/pos"
                        className="quick-action"
                    >
                        <strong>New Sale</strong>

                        <span>
                            Open the POS screen
                        </span>
                    </Link>

                    <Link
                        to="/cashier/customers"
                        className="quick-action"
                    >
                        <strong>Customers</strong>

                        <span>
                            Find customer records
                        </span>
                    </Link>

                    <Link
                        to="/cashier/sales"
                        className="quick-action"
                    >
                        <strong>
                            Sales History
                        </strong>

                        <span>
                            Review completed sales
                        </span>
                    </Link>

                    <Link
                        to="/cashier/returns"
                        className="quick-action"
                    >
                        <strong>Returns</strong>

                        <span>
                            Process a sales return
                        </span>
                    </Link>
                </div>
            </section>
        </div>
    );
}