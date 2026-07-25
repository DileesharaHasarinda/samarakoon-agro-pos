import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import type {
    PropsWithChildren,
} from 'react';

import { apiRequest }
    from '../lib/api';

import {
    clearAuthToken,
    getAuthToken,
    saveAuthToken,
} from '../lib/authStorage';

import type {
    AuthUser,
    CurrentUserResponse,
    LoginCredentials,
    LoginResponse,
    LogoutResponse,
    UserRole,
} from '../types/auth';

interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (
        credentials: LoginCredentials,
    ) => Promise<AuthUser>;
    logout: () => Promise<void>;
    hasRole: (
        allowedRoles: UserRole[],
    ) => boolean;
}

const AuthContext =
    createContext<
        AuthContextValue | undefined
    >(undefined);

export function AuthProvider({
    children,
}: PropsWithChildren) {
    const [
        user,
        setUser,
    ] = useState<AuthUser | null>(null);

    const [
        token,
        setToken,
    ] = useState<string | null>(
        getAuthToken,
    );

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const restoreSession =
        useCallback(async (): Promise<void> => {
            const savedToken =
                getAuthToken();

            if (!savedToken) {
                setUser(null);
                setToken(null);
                setIsLoading(false);

                return;
            }

            setToken(savedToken);

            try {
                const response =
                    await apiRequest<
                        CurrentUserResponse
                    >('/auth/me', {
                        method: 'GET',
                        token: savedToken,
                    });

                if (!response.user.is_active) {
                    throw new Error(
                        'User account is inactive.',
                    );
                }

                setUser(response.user);
            } catch {
                clearAuthToken();
                setToken(null);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        }, []);

    useEffect(() => {
        void restoreSession();
    }, [restoreSession]);

    const login = useCallback(
        async (
            credentials: LoginCredentials,
        ): Promise<AuthUser> => {
            const response =
                await apiRequest<LoginResponse>(
                    '/auth/login',
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            username:
                                credentials.username,
                            password:
                                credentials.password,
                            device_name:
                                'Samarakoon POS Desktop',
                        }),
                    },
                );

            saveAuthToken(response.token);

            setToken(response.token);
            setUser(response.user);

            return response.user;
        },
        [],
    );

    const logout =
        useCallback(async (): Promise<void> => {
            const activeToken =
                token ?? getAuthToken();

            try {
                if (activeToken) {
                    await apiRequest<LogoutResponse>(
                        '/auth/logout',
                        {
                            method: 'POST',
                            token: activeToken,
                        },
                    );
                }
            } finally {
                clearAuthToken();
                setToken(null);
                setUser(null);
            }
        }, [token]);

    const hasRole = useCallback(
        (
            allowedRoles: UserRole[],
        ): boolean => {
            if (!user) {
                return false;
            }

            return allowedRoles.includes(
                user.role,
            );
        },
        [user],
    );

    const value =
        useMemo<AuthContextValue>(
            () => ({
                user,
                token,
                isLoading,
                isAuthenticated:
                    user !== null &&
                    token !== null,
                login,
                logout,
                hasRole,
            }),
            [
                user,
                token,
                isLoading,
                login,
                logout,
                hasRole,
            ],
        );

    return (
        <AuthContext.Provider
            value={value}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth():
    AuthContextValue {
    const context =
        useContext(AuthContext);

    if (!context) {
        throw new Error(
            'useAuth must be used inside AuthProvider.',
        );
    }

    return context;
}