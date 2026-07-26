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

import CategoriesPage
    from './pages/admin/CategoriesPage';

import InventoryPage
    from './pages/admin/InventoryPage';

import ProductsPage
    from './pages/admin/ProductsPage';

import PurchasesPage
    from './pages/admin/PurchasesPage';

import SuppliersPage
    from './pages/admin/SuppliersPage';

import CashierDashboardPage
    from './pages/cashier/CashierDashboardPage';

import CustomersPage
    from './pages/shared/CustomersPage';

import DueManagementPage
    from './pages/shared/DueManagementPage';

import ModulePlaceholderPage
    from './pages/shared/ModulePlaceholderPage';

import PosPage
    from './pages/shared/PosPage';

import SalesHistoryPage
    from './pages/shared/SalesHistoryPage';

import SalesReturnsPage
    from './pages/shared/SalesReturnsPage';

import ExpensesPage
    from './pages/admin/ExpensesPage';

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
                        allowedRoles={[
                            'admin',
                        ]}
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
                        element={<PosPage />}
                    />

                    <Route
                        path="sales"
                        element={
                            <SalesHistoryPage />
                        }
                    />

                    <Route
                        path="returns"
                        element={
                            <SalesReturnsPage />
                        }
                    />

                    <Route
                        path="customers"
                        element={
                            <CustomersPage />
                        }
                    />

                    <Route
                        path="dues"
                        element={
                            <DueManagementPage />
                        }
                    />

                    <Route
                        path="categories"
                        element={
                            <CategoriesPage />
                        }
                    />

                    <Route
                        path="products"
                        element={
                            <ProductsPage />
                        }
                    />

                    <Route
                        path="suppliers"
                        element={
                            <SuppliersPage />
                        }
                    />

                    <Route
                        path="purchases"
                        element={
                            <PurchasesPage />
                        }
                    />

                    <Route
                        path="inventory"
                        element={
                            <InventoryPage />
                        }
                    />

                    <Route
                        path="expenses"
                        element={
                            <ExpensesPage />
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
                                description="Create and manage cashier user accounts."
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
                        allowedRoles={[
                            'cashier',
                        ]}
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
                        element={<PosPage />}
                    />

                    <Route
                        path="sales"
                        element={
                            <SalesHistoryPage />
                        }
                    />

                    <Route
                        path="returns"
                        element={
                            <SalesReturnsPage />
                        }
                    />

                    <Route
                        path="customers"
                        element={
                            <CustomersPage />
                        }
                    />

                    <Route
                        path="dues"
                        element={
                            <DueManagementPage />
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