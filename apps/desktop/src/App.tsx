import {
    Navigate,
    Route,
    Routes,
} from 'react-router';

import {
    useAuth,
} from './auth/AuthContext';

import ProtectedRoute, {
    dashboardPathForRole,
} from './auth/ProtectedRoute';

import LoadingScreen
    from './components/LoadingScreen';

import AdminDashboard
    from './pages/AdminDashboard';

import CashierDashboard
    from './pages/CashierDashboard';

import LoginPage
    from './pages/LoginPage';

function HomeRedirect() {
    const {
        user,
        isLoading,
    } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return (
        <Navigate
            to={dashboardPathForRole(user.role)}
            replace
        />
    );
}

function LoginRoute() {
    const {
        user,
        isLoading,
    } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (user) {
        return (
            <Navigate
                to={dashboardPathForRole(user.role)}
                replace
            />
        );
    }

    return <LoginPage />;
}

export default function App() {
    return (
        <Routes>
            <Route
                path="/"
                element={<HomeRedirect />}
            />

            <Route
                path="/login"
                element={<LoginRoute />}
            />

            <Route
                path="/admin/dashboard"
                element={
                    <ProtectedRoute
                        allowedRoles={['admin']}
                    >
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/cashier/dashboard"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'admin',
                            'cashier',
                        ]}
                    >
                        <CashierDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="*"
                element={
                    <Navigate
                        to="/"
                        replace
                    />
                }
            />
        </Routes>
    );
}