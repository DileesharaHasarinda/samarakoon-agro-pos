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

import BackupRestorePage
    from './pages/admin/BackupRestorePage';

import BarcodeManagementPage
    from './pages/admin/BarcodeManagementPage';

import CashierAccountsPage
    from './pages/admin/CashierAccountsPage';

import CategoriesPage
    from './pages/admin/CategoriesPage';

import ExpensesPage
    from './pages/admin/ExpensesPage';

import InventoryPage
    from './pages/admin/InventoryPage';

import ProductsPage
    from './pages/admin/ProductsPage';

import PurchasesPage
    from './pages/admin/PurchasesPage';

import ReportsPage
    from './pages/admin/ReportsPage';

import SettingsPage
    from './pages/admin/SettingsPage';

import StockAlertsPage
    from './pages/admin/StockAlertsPage';

import SupplierDuesPage
    from './pages/admin/SupplierDuesPage';

import SuppliersPage
    from './pages/admin/SuppliersPage';

import CashierDashboardPage
    from './pages/cashier/CashierDashboardPage';

import CustomersPage
    from './pages/shared/CustomersPage';

import DueManagementPage
    from './pages/shared/DueManagementPage';

import PosPage
    from './pages/shared/PosPage';

import SalesHistoryPage
    from './pages/shared/SalesHistoryPage';

import SalesReturnsPage
    from './pages/shared/SalesReturnsPage';

import ShiftRegisterPage
    from './pages/shared/ShiftRegisterPage';

import ProductDetailsPage
    from './pages/admin/ProductDetailsPage';


export default function App() {
    return (
        <Routes>
            <Route
                element={
                    <PublicOnlyRoute />
                }
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
                        path="/admin/products/:productId"
                        element={<ProductDetailsPage />}
                    />

                    <Route
                        path="barcodes"
                        element={
                            <BarcodeManagementPage />
                        }
                    />

                    <Route
                        path="suppliers"
                        element={
                            <SuppliersPage />
                        }
                    />

                    <Route
                        path="supplier-dues"
                        element={
                            <SupplierDuesPage />
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
                        path="stock-alerts"
                        element={
                            <StockAlertsPage />
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
                            <ReportsPage />
                        }
                    />

                    <Route
                        path="users"
                        element={
                            <CashierAccountsPage />
                        }
                    />

                    <Route
                        path="shifts"
                        element={
                            <ShiftRegisterPage />
                        }
                    />

                    <Route
                        path="backups"
                        element={
                            <BackupRestorePage />
                        }
                    />

                    <Route
                        path="settings"
                        element={
                            <SettingsPage />
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
                        path="shift"
                        element={
                            <ShiftRegisterPage />
                        }
                    />

                    <Route
                        path="pos"
                        element={
                            <PosPage />
                        }
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
                element={
                    <RoleHomeRedirect />
                }
            />

            <Route
                path="*"
                element={
                    <NotFoundPage />
                }
            />
        </Routes>
    );
}