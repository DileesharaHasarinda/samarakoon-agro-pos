import {
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import {
    useNavigate,
} from 'react-router';

import { useAuth }
    from '../auth/AuthContext';

import { getRoleHome }
    from '../auth/roleHome';

import { ApiError }
    from '../lib/api';

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
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const handleSubmit =
        async (
            event: FormEvent<HTMLFormElement>,
        ): Promise<void> => {
            event.preventDefault();

            if (isSubmitting) {
                return;
            }

            setErrorMessage('');
            setIsSubmitting(true);

            try {
                const user = await login({
                    username,
                    password,
                });

                navigate(
                    getRoleHome(user.role),
                    {
                        replace: true,
                    },
                );
            } catch (error) {
                if (error instanceof ApiError) {
                    const usernameError =
                        error.errors
                            ?.username
                        ?.[0];

                    setErrorMessage(
                        usernameError ??
                        error.message,
                    );
                } else {
                    setErrorMessage(
                        'An unexpected error occurred while logging in.',
                    );
                }
            } finally {
                setIsSubmitting(false);
            }
        };

    return (
        <main className="login-page">
            <section className="login-presentation">
                <div className="login-brand">
                    <div className="login-brand-mark">
                        S
                    </div>

                    <div>
                        <strong>Samarakoon</strong>
                        <span>Agro POS System</span>
                    </div>
                </div>

                <div className="login-presentation-content">
                    <span className="login-tag">
                        Agricultural Retail Management
                    </span>

                    <h1>
                        Manage your agro business
                        from one reliable system.
                    </h1>

                    <p>
                        Sales, products, purchases,
                        stock, suppliers, customers
                        and reports in one desktop
                        application.
                    </p>

                    <div className="login-feature-grid">
                        <article>
                            <strong>Fast sales</strong>
                            <span>
                                Simple cashier workflow
                            </span>
                        </article>

                        <article>
                            <strong>Stock control</strong>
                            <span>
                                Monitor agro inventory
                            </span>
                        </article>

                        <article>
                            <strong>Secure access</strong>
                            <span>
                                Admin and cashier roles
                            </span>
                        </article>

                        <article>
                            <strong>Clear reports</strong>
                            <span>
                                Understand performance
                            </span>
                        </article>
                    </div>
                </div>

                <small>
                    Samarakoon Agro POS
                </small>
            </section>

            <section className="login-form-section">
                <div className="login-card">
                    <header className="login-card-header">
                        <span>Welcome back</span>

                        <h2>Sign in to continue</h2>

                        <p>
                            Enter your username and
                            password to access the POS.
                        </p>
                    </header>

                    <form
                        className="login-form"
                        onSubmit={(event) => {
                            void handleSubmit(event);
                        }}
                    >
                        {errorMessage && (
                            <div
                                className="form-alert"
                                role="alert"
                            >
                                {errorMessage}
                            </div>
                        )}

                        <label>
                            <span>Username</span>

                            <input
                                type="text"
                                value={username}
                                autoComplete="username"
                                placeholder="Enter username"
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    setUsername(
                                        event.target.value,
                                    );
                                }}
                                required
                            />
                        </label>

                        <label>
                            <span>Password</span>

                            <input
                                type="password"
                                value={password}
                                autoComplete="current-password"
                                placeholder="Enter password"
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    setPassword(
                                        event.target.value,
                                    );
                                }}
                                required
                            />
                        </label>

                        <button
                            type="submit"
                            className="primary-button login-button"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Signing in...'
                                : 'Sign In'}
                        </button>
                    </form>

                    <div className="test-credentials">
                        <strong>
                            Development test accounts
                        </strong>

                        <div>
                            <span>
                                Admin: admin /
                                Admin@12345
                            </span>

                            <span>
                                Cashier: cashier /
                                Cashier@12345
                            </span>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}