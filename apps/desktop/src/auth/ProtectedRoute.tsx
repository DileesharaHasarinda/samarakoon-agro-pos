import {
    Navigate,
} from 'react-router';

import type {
    ReactNode,
} from 'react';

import LoadingScreen
    from '../components/LoadingScreen';

import type {
    UserRole,
} from '../types/auth';

import {
    useAuth,
} from './AuthContext';

interface ProtectedRouteProps {
    allowedRoles: UserRole[];
    children: ReactNode;
}

export function dashboardPathForRole(
    role: UserRole,
): string {
    return role === 'admin'
        ? '/admin/dashboard'
        : '/cashier/dashboard';
}

export default function ProtectedRoute({
    allowedRoles,
    children,
}: ProtectedRouteProps) {
    const {
        user,
        isLoading,
    } = useAuth();

    if (isLoading) {
        return (
            <LoadingScreen message="Checking your session..." />
        );
    }

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    if (!allowedRoles.includes(user.role)) {
        return (
            <Navigate
                to={dashboardPathForRole(
                    user.role,
                )}
                replace
            />
        );
    }

    return children;
}