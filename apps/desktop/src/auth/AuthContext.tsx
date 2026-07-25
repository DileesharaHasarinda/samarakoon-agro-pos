import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import {
    apiRequest,
    authTokenStorage,
} from '../lib/api';

import type {
    AuthUser,
    CurrentUserResponse,
    LoginCredentials,
    LoginResponse,
} from '../types/auth';

interface AuthContextValue {
    user: AuthUser | null;
    isLoading: boolean;
    login: (
        credentials: LoginCredentials,
    ) => Promise<AuthUser>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

interface AuthProviderProps {
    children: ReactNode;
}

const AuthContext =
    createContext<AuthContextValue | undefined>(
        undefined,
    );

export function AuthProvider({
    children,
}: AuthProviderProps) {
    const [
        user,
        setUser,
    ] = useState<AuthUser | null>(null);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const refreshUser =
        useCallback(async (): Promise<void> => {
            const token = authTokenStorage.get();

            if (!token) {
                setUser(null);
                setIsLoading(false);

                return;
            }

            try {
                const response =
                    await apiRequest<CurrentUserResponse>(
                        '/auth/me',
                    );

                setUser(response.user);
            } catch {
                authTokenStorage.clear();
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        }, []);

    useEffect(() => {
        void refreshUser();
    }, [refreshUser]);

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
                                credentials.username.trim(),
                            password:
                                credentials.password,
                            device_name:
                                'Samarakoon POS Desktop',
                        }),
                    },
                );

            authTokenStorage.set(response.token);
            setUser(response.user);

            return response.user;
        },
        [],
    );

    const logout =
        useCallback(async (): Promise<void> => {
            try {
                if (authTokenStorage.get()) {
                    await apiRequest<{
                        message: string;
                    }>(
                        '/auth/logout',
                        {
                            method: 'POST',
                        },
                    );
                }
            } finally {
                authTokenStorage.clear();
                setUser(null);
            }
        }, []);

    const value = useMemo(
        () => ({
            user,
            isLoading,
            login,
            logout,
            refreshUser,
        }),
        [
            user,
            isLoading,
            login,
            logout,
            refreshUser,
        ],
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            'useAuth must be used inside AuthProvider.',
        );
    }

    return context;
}