import {
    Navigate,
    Route,
    Routes,
} from 'react-router';

import ProtectedRoute
    from './auth/ProtectedRoute';

import PublicOnlyRoute
    from './auth/PublicOnlyRoute';

import RoleHomeRedirect
    from './auth/RoleHomeRedirect';

import AppLayout
    from './layouts/AppLayout';

import LoginPage
    from './pages/LoginPage';

import NotFoundPage
    from './pages/NotFoundPage';

import AdminDashboardPage
    from './pages/admin/AdminDashboardPage';

import CashierDashboardPage
    from './pages/cashier/CashierDashboardPage';

import ModulePlaceholderPage
    from './pages/shared/ModulePlaceholderPage';

export default function App() {
    return (
        <Routes>
            <Route
                element={<PublicOnlyRoute />}
            >
                <Route
                    path="/login"
                    element={<LoginPage />}
                />
            </Route>

            <Route
                element={
                    <ProtectedRoute
                        allowedRoles={['admin']}
                    />
                }
            >
                <Route
                    path="/admin"
                    element={<AppLayout />}
                >
                    <Route
                        index
                        element={
                            <Navigate
                                to="dashboard"
                                replace
                            />
                        }
                    />

                    <Route
                        path="dashboard"
                        element={
                            <AdminDashboardPage />
                        }
                    />

                    <Route
                        path="pos"
                        element={
                            <ModulePlaceholderPage
                                title="New Sale"
                                description="The administrator POS sales screen will be developed here."
                            />
                        }
                    />

                    <Route
                        path="categories"
                        element={
                            <ModulePlaceholderPage
                                title="Categories"
                                description="Create and manage agro product categories."
                            />
                        }
                    />

                    <Route
                        path="products"
                        element={
                            <ModulePlaceholderPage
                                title="Products"
                                description="Create products, assign categories and maintain pricing."
                            />
                        }
                    />

                    <Route
                        path="suppliers"
                        element={
                            <ModulePlaceholderPage
                                title="Suppliers"
                                description="Create and manage supplier information."
                            />
                        }
                    />

                    <Route
                        path="purchases"
                        element={
                            <ModulePlaceholderPage
                                title="Purchases"
                                description="Record supplier purchases and update inventory."
                            />
                        }
                    />

                    <Route
                        path="inventory"
                        element={
                            <ModulePlaceholderPage
                                title="Inventory"
                                description="Monitor product stock quantities and stock movements."
                            />
                        }
                    />

                    <Route
                        path="customers"
                        element={
                            <ModulePlaceholderPage
                                title="Customers"
                                description="Manage customers and customer credit information."
                            />
                        }
                    />

                    <Route
                        path="sales"
                        element={
                            <ModulePlaceholderPage
                                title="Sales"
                                description="Review sales transactions, invoices and payments."
                            />
                        }
                    />

                    <Route
                        path="expenses"
                        element={
                            <ModulePlaceholderPage
                                title="Expenses"
                                description="Record and review business expenses."
                            />
                        }
                    />

                    <Route
                        path="reports"
                        element={
                            <ModulePlaceholderPage
                                title="Reports"
                                description="Review sales, stock, purchase and profit reports."
                            />
                        }
                    />

                    <Route
                        path="users"
                        element={
                            <ModulePlaceholderPage
                                title="Cashier Accounts"
                                description="Create, update, activate and deactivate cashier accounts."
                            />
                        }
                    />

                    <Route
                        path="settings"
                        element={
                            <ModulePlaceholderPage
                                title="Settings"
                                description="Configure business and application settings."
                            />
                        }
                    />
                </Route>
            </Route>

            <Route
                element={
                    <ProtectedRoute
                        allowedRoles={['cashier']}
                    />
                }
            >
                <Route
                    path="/cashier"
                    element={<AppLayout />}
                >
                    <Route
                        index
                        element={
                            <Navigate
                                to="dashboard"
                                replace
                            />
                        }
                    />

                    <Route
                        path="dashboard"
                        element={
                            <CashierDashboardPage />
                        }
                    />

                    <Route
                        path="pos"
                        element={
                            <ModulePlaceholderPage
                                title="New Sale"
                                description="The cashier POS sales screen will be developed here."
                            />
                        }
                    />

                    <Route
                        path="customers"
                        element={
                            <ModulePlaceholderPage
                                title="Customers"
                                description="Search, create and update customer details."
                            />
                        }
                    />

                    <Route
                        path="sales"
                        element={
                            <ModulePlaceholderPage
                                title="Sales History"
                                description="Review the sales transactions available to the cashier."
                            />
                        }
                    />

                    <Route
                        path="returns"
                        element={
                            <ModulePlaceholderPage
                                title="Returns"
                                description="Process authorised sales returns."
                            />
                        }
                    />
                </Route>
            </Route>

            <Route
                path="/"
                element={<RoleHomeRedirect />}
            />

            <Route
                path="*"
                element={<NotFoundPage />}
            />
        </Routes>
    );
}