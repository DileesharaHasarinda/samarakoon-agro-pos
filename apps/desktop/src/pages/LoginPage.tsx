import {
    useState,
    type FormEvent,
} from 'react';

import {
    useNavigate,
} from 'react-router';

import {
    useAuth,
} from '../auth/AuthContext';

import {
    dashboardPathForRole,
} from '../auth/ProtectedRoute';

import {
    ApiError,
} from '../lib/api';

export default function LoginPage() {
    const navigate = useNavigate();

    const {
        login,
    } = useAuth();

    const [
        username,
        setUsername,
    ] = useState('');

    const [
        password,
        setPassword,
    ] = useState('');

    const [
        showPassword,
        setShowPassword,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        setErrorMessage('');
        setIsSubmitting(true);

        try {
            const authenticatedUser =
                await login({
                    username,
                    password,
                });

            navigate(
                dashboardPathForRole(
                    authenticatedUser.role,
                ),
                {
                    replace: true,
                },
            );
        } catch (error: unknown) {
            if (error instanceof ApiError) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage(
                    'An unexpected login error occurred.',
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-shell">
                <aside className="brand-panel">
                    <div className="brand-logo">
                        S
                    </div>

                    <p className="brand-eyebrow">
                        Agricultural Retail Management
                    </p>

                    <h1>Samarakoon POS</h1>

                    <p className="brand-description">
                        Manage agricultural product sales,
                        inventory, customers and business
                        operations from one secure system.
                    </p>

                    <div className="brand-feature">
                        <span>✓</span>
                        Secure Admin and Cashier access
                    </div>

                    <div className="brand-feature">
                        <span>✓</span>
                        Role-based system permissions
                    </div>

                    <div className="brand-feature">
                        <span>✓</span>
                        Connected to the Laravel API
                    </div>
                </aside>

                <section className="login-panel">
                    <div className="login-heading">
                        <p className="login-eyebrow">
                            Secure access
                        </p>

                        <h2>Sign in</h2>

                        <p>
                            Enter your Samarakoon POS
                            account details.
                        </p>
                    </div>

                    {errorMessage && (
                        <div
                            className="error-alert"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}

                    <form
                        className="login-form"
                        onSubmit={handleSubmit}
                    >
                        <label className="form-field">
                            <span>Username</span>

                            <input
                                type="text"
                                value={username}
                                onChange={(event) => {
                                    setUsername(
                                        event.target.value,
                                    );
                                }}
                                placeholder="Enter your username"
                                autoComplete="username"
                                autoFocus
                                disabled={isSubmitting}
                            />
                        </label>

                        <label className="form-field">
                            <span>Password</span>

                            <div className="password-input">
                                <input
                                    type={
                                        showPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    value={password}
                                    onChange={(event) => {
                                        setPassword(
                                            event.target.value,
                                        );
                                    }}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    disabled={isSubmitting}
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => {
                                        setShowPassword(
                                            (current) => !current,
                                        );
                                    }}
                                    disabled={isSubmitting}
                                >
                                    {showPassword
                                        ? 'Hide'
                                        : 'Show'}
                                </button>
                            </div>
                        </label>

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={
                                isSubmitting ||
                                !username.trim() ||
                                !password
                            }
                        >
                            {isSubmitting
                                ? 'Signing in...'
                                : 'Sign in to POS'}
                        </button>
                    </form>

                    <p className="login-footer">
                        Samarakoon Agricultural POS
                        System
                    </p>
                </section>
            </section>
        </main>
    );
}