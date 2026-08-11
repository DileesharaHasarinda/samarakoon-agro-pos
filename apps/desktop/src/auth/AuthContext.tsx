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

import {
    apiRequest,
} from '../lib/api';

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

const AUTH_USER_STORAGE_KEY =
    'samarakoon_pos_auth_user';

const AuthContext =
    createContext<
        AuthContextValue
        | undefined
    >(
        undefined,
    );

function getStoredUser():
    AuthUser | null {
    if (
        typeof window
        === 'undefined'
    ) {
        return null;
    }

    try {
        const storedValue =
            window.localStorage.getItem(
                AUTH_USER_STORAGE_KEY,
            );

        if (!storedValue) {
            return null;
        }

        const parsedUser =
            JSON.parse(
                storedValue,
            ) as AuthUser;

        if (
            !parsedUser
            || typeof parsedUser
            !== 'object'
            || !parsedUser.id
        ) {
            window.localStorage.removeItem(
                AUTH_USER_STORAGE_KEY,
            );

            return null;
        }

        return parsedUser;
    } catch {
        try {
            window.localStorage.removeItem(
                AUTH_USER_STORAGE_KEY,
            );
        } catch {
            // Ignore storage cleanup errors.
        }

        return null;
    }
}

function saveStoredUser(
    user: AuthUser,
): void {
    if (
        typeof window
        === 'undefined'
    ) {
        return;
    }

    try {
        window.localStorage.setItem(
            AUTH_USER_STORAGE_KEY,
            JSON.stringify(
                user,
            ),
        );
    } catch {
        /*
         * The auth token is still the source of
         * truth. Failing to cache the user should
         * not break login.
         */
    }
}

function clearStoredUser(): void {
    if (
        typeof window
        === 'undefined'
    ) {
        return;
    }

    try {
        window.localStorage.removeItem(
            AUTH_USER_STORAGE_KEY,
        );
    } catch {
        // Ignore storage cleanup errors.
    }
}

function getHttpStatus(
    error: unknown,
): number | null {
    if (
        !error
        || typeof error
        !== 'object'
    ) {
        return null;
    }

    const errorObject =
        error as Record<
            string,
            unknown
        >;

    const directStatus =
        errorObject.status;

    if (
        typeof directStatus
        === 'number'
    ) {
        return directStatus;
    }

    const statusCode =
        errorObject.statusCode;

    if (
        typeof statusCode
        === 'number'
    ) {
        return statusCode;
    }

    const response =
        errorObject.response;

    if (
        response
        && typeof response
        === 'object'
    ) {
        const responseObject =
            response as Record<
                string,
                unknown
            >;

        if (
            typeof responseObject.status
            === 'number'
        ) {
            return responseObject.status;
        }
    }

    return null;
}

function isUnauthorizedError(
    error: unknown,
): boolean {
    const status =
        getHttpStatus(
            error,
        );

    if (
        status === 401
    ) {
        return true;
    }

    /*
     * Fallback for API wrappers that do not expose
     * the HTTP status directly on the error object.
     */
    if (
        error
        instanceof Error
    ) {
        const message =
            error.message
                .trim()
                .toLowerCase();

        if (
            message.includes(
                'unauthenticated',
            )
            || message.includes(
                'unauthorized',
            )
            || message.includes(
                '401',
            )
        ) {
            return true;
        }
    }

    return false;
}

export function AuthProvider({
    children,
}: PropsWithChildren) {
    /*
     * Restore both values immediately from local
     * storage when React is recreated.
     *
     * This prevents ProtectedRoute from seeing
     * user = null during a normal development
     * refresh.
     */
    const [
        user,
        setUser,
    ] =
        useState<
            AuthUser | null
        >(
            getStoredUser,
        );

    const [
        token,
        setToken,
    ] =
        useState<
            string | null
        >(
            getAuthToken,
        );

    const [
        isLoading,
        setIsLoading,
    ] =
        useState(
            true,
        );

    const clearSession =
        useCallback(
            (): void => {
                clearAuthToken();
                clearStoredUser();

                setToken(
                    null,
                );

                setUser(
                    null,
                );
            },
            [],
        );

    const restoreSession =
        useCallback(
            async (): Promise<void> => {
                const savedToken =
                    getAuthToken();

                const savedUser =
                    getStoredUser();

                /*
                 * There is no stored token,
                 * therefore there is no session.
                 */
                if (!savedToken) {
                    clearStoredUser();

                    setToken(
                        null,
                    );

                    setUser(
                        null,
                    );

                    setIsLoading(
                        false,
                    );

                    return;
                }

                /*
                 * Restore the cached session
                 * immediately.
                 *
                 * /auth/me below will verify and
                 * refresh the user data.
                 */
                setToken(
                    savedToken,
                );

                if (savedUser) {
                    setUser(
                        savedUser,
                    );
                }

                setIsLoading(
                    true,
                );

                try {
                    const response =
                        await apiRequest<
                            CurrentUserResponse
                        >(
                            '/auth/me',
                            {
                                method:
                                    'GET',

                                token:
                                    savedToken,
                            },
                        );

                    /*
                     * An inactive user should not
                     * retain access even if an old
                     * token still exists.
                     */
                    if (
                        !response
                            .user
                            .is_active
                    ) {
                        clearSession();

                        return;
                    }

                    /*
                     * /auth/me succeeded.
                     *
                     * Refresh both React state and
                     * the cached user data.
                     */
                    saveStoredUser(
                        response.user,
                    );

                    setToken(
                        savedToken,
                    );

                    setUser(
                        response.user,
                    );
                } catch (
                error
                ) {
                    /*
                     * CRITICAL:
                     *
                     * Clear authentication ONLY
                     * when the token is actually
                     * unauthorized.
                     *
                     * Do NOT logout for:
                     *
                     * - Laravel restart
                     * - HTTP 500
                     * - network interruption
                     * - Vite refresh
                     * - temporary API failure
                     * - timeout
                     */
                    if (
                        isUnauthorizedError(
                            error,
                        )
                    ) {
                        clearSession();

                        return;
                    }

                    /*
                     * Temporary API problem.
                     *
                     * Keep the stored token and
                     * cached user so refreshing
                     * during development does not
                     * force a logout.
                     */
                    setToken(
                        savedToken,
                    );

                    if (savedUser) {
                        setUser(
                            savedUser,
                        );
                    }
                } finally {
                    setIsLoading(
                        false,
                    );
                }
            },
            [
                clearSession,
            ],
        );

    useEffect(
        () => {
            void restoreSession();
        },
        [
            restoreSession,
        ],
    );

    const login =
        useCallback(
            async (
                credentials:
                    LoginCredentials,
            ): Promise<AuthUser> => {
                const response =
                    await apiRequest<
                        LoginResponse
                    >(
                        '/auth/login',
                        {
                            method:
                                'POST',

                            body:
                                JSON.stringify({
                                    username:
                                        credentials
                                            .username,

                                    password:
                                        credentials
                                            .password,

                                    device_name:
                                        'Samarakoon POS Desktop',
                                }),
                        },
                    );

                if (
                    !response
                        .user
                        .is_active
                ) {
                    throw new Error(
                        'User account is inactive.',
                    );
                }

                /*
                 * Save the token.
                 */
                saveAuthToken(
                    response.token,
                );

                /*
                 * Cache the authenticated user.
                 *
                 * This allows React/Electron to
                 * restore the user immediately
                 * after a refresh.
                 */
                saveStoredUser(
                    response.user,
                );

                setToken(
                    response.token,
                );

                setUser(
                    response.user,
                );

                return response.user;
            },
            [],
        );

    const logout =
        useCallback(
            async (): Promise<void> => {
                const activeToken =
                    token
                    ?? getAuthToken();

                try {
                    if (
                        activeToken
                    ) {
                        await apiRequest<
                            LogoutResponse
                        >(
                            '/auth/logout',
                            {
                                method:
                                    'POST',

                                token:
                                    activeToken,
                            },
                        );
                    }
                } catch {
                    /*
                     * Even when the server cannot
                     * be reached, manual Logout
                     * should still remove the local
                     * session.
                     */
                } finally {
                    clearSession();
                }
            },
            [
                token,
                clearSession,
            ],
        );

    const hasRole =
        useCallback(
            (
                allowedRoles:
                    UserRole[],
            ): boolean => {
                if (!user) {
                    return false;
                }

                return allowedRoles.includes(
                    user.role,
                );
            },
            [
                user,
            ],
        );

    const value =
        useMemo<
            AuthContextValue
        >(
            () => ({
                user,

                token,

                isLoading,

                isAuthenticated:
                    user !== null
                    && token !== null,

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
            value={
                value
            }
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth():
    AuthContextValue {
    const context =
        useContext(
            AuthContext,
        );

    if (!context) {
        throw new Error(
            'useAuth must be used inside AuthProvider.',
        );
    }

    return context;
}