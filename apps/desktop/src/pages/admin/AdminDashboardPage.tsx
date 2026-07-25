import { Link }
    from 'react-router';

import { useAuth }
    from '../../auth/AuthContext';

export default function AdminDashboardPage() {
    const {
        user,
    } = useAuth();

    return (
        <div className="page-stack">
            <section className="welcome-panel">
                <div>
                    <span className="page-kicker">
                        Owner dashboard
                    </span>

                    <h2>
                        Welcome back, {user?.name}.
                    </h2>

                    <p>
                        Your Samarakoon Agro POS
                        administration workspace is
                        ready.
                    </p>
                </div>

                <Link
                    to="/admin/pos"
                    className="primary-button"
                >
                    Create New Sale
                </Link>
            </section>

            <section className="summary-grid">
                <article className="summary-card">
                    <span>System status</span>
                    <strong>Ready</strong>
                    <small>
                        API authentication connected
                    </small>
                </article>

                <article className="summary-card">
                    <span>User role</span>
                    <strong>Administrator</strong>
                    <small>
                        Full system access
                    </small>
                </article>

                <article className="summary-card">
                    <span>Business modules</span>
                    <strong>12</strong>
                    <small>
                        Ready for development
                    </small>
                </article>

                <article className="summary-card">
                    <span>Next module</span>
                    <strong>Categories</strong>
                    <small>
                        First CRUD development
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
                            Business management
                        </h3>
                    </div>
                </div>

                <div className="quick-action-grid">
                    <Link
                        to="/admin/categories"
                        className="quick-action"
                    >
                        <strong>
                            Manage Categories
                        </strong>

                        <span>
                            Create product groups
                        </span>
                    </Link>

                    <Link
                        to="/admin/products"
                        className="quick-action"
                    >
                        <strong>
                            Manage Products
                        </strong>

                        <span>
                            Add agro products
                        </span>
                    </Link>

                    <Link
                        to="/admin/suppliers"
                        className="quick-action"
                    >
                        <strong>
                            Manage Suppliers
                        </strong>

                        <span>
                            Maintain supplier records
                        </span>
                    </Link>

                    <Link
                        to="/admin/inventory"
                        className="quick-action"
                    >
                        <strong>
                            View Inventory
                        </strong>

                        <span>
                            Monitor available stock
                        </span>
                    </Link>

                    <Link
                        to="/admin/reports"
                        className="quick-action"
                    >
                        <strong>
                            View Reports
                        </strong>

                        <span>
                            Review business results
                        </span>
                    </Link>

                    <Link
                        to="/admin/users"
                        className="quick-action"
                    >
                        <strong>
                            Cashier Accounts
                        </strong>

                        <span>
                            Manage system users
                        </span>
                    </Link>
                </div>
            </section>
        </div>
    );
}