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

const loginPageStyles = `
    #sapo-login-page,
    #sapo-login-page *,
    #sapo-login-page *::before,
    #sapo-login-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-login-page {
        --lp-green-950: #052e16;
        --lp-green-900: #14532d;
        --lp-green-800: #166534;
        --lp-green-700: #15803d;
        --lp-green-50: #f0fdf4;
        --lp-red: #dc2626;
        --lp-red-light: #fef2f2;
        --lp-text: #111827;
        --lp-text-secondary: #374151;
        --lp-muted: #6b7280;
        --lp-border: #e5e7eb;
        --lp-border-strong: #d1d5db;
        --lp-white: #ffffff;
        --lp-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        margin: 0 !important;
        padding: 24px !important;
        overflow-y: auto !important;
        background:
            radial-gradient(
                circle at 15% 10%,
                #ecfdf3,
                transparent 45%
            ),
            radial-gradient(
                circle at 85% 90%,
                #ecfdf3,
                transparent 45%
            ),
            var(--lp-white) !important;
        font-family: var(--lp-font) !important;
        color: var(--lp-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--lp-border-strong) transparent !important;
    }

    #sapo-login-page::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-login-page::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-login-page::-webkit-scrollbar-thumb {
        background: var(--lp-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-login-page h1,
    #sapo-login-page h2,
    #sapo-login-page p,
    #sapo-login-page span,
    #sapo-login-page strong,
    #sapo-login-page small,
    #sapo-login-page label,
    #sapo-login-page button,
    #sapo-login-page input {
        font-family: var(--lp-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-login-page h1,
    #sapo-login-page h2,
    #sapo-login-page p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Centered card wrapper ---------- */
    #sapo-login-page .lp-wrapper {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        width: 100% !important;
        max-width: 440px !important;
        margin: auto !important;
        gap: 28px !important;
    }

    /* ---------- Brand ---------- */
    #sapo-login-page .lp-brand {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 12px !important;
        text-align: center !important;
    }

    #sapo-login-page .lp-brand-mark {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 52px !important;
        height: 52px !important;
        font-size: 20px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        background:
            linear-gradient(
                145deg,
                var(--lp-green-900),
                var(--lp-green-700)
            ) !important;
        border-radius: 14px !important;
        box-shadow: 0 8px 20px rgba(21, 128, 61, 0.22) !important;
    }

    #sapo-login-page .lp-brand-name {
        font-size: 19px !important;
        font-weight: 700 !important;
        color: var(--lp-text) !important;
    }

    #sapo-login-page .lp-brand-tagline {
        font-size: 13px !important;
        font-weight: 500 !important;
        color: var(--lp-muted) !important;
    }

    /* ---------- Card ---------- */
    #sapo-login-page .lp-card {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        background: var(--lp-white) !important;
        border: 1px solid var(--lp-border) !important;
        border-radius: 16px !important;
        box-shadow: 0 20px 48px rgba(15, 23, 42, 0.10) !important;
        overflow: hidden !important;
    }

    #sapo-login-page .lp-card-header {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        padding: 28px 28px 20px !important;
        text-align: center !important;
    }

    #sapo-login-page .lp-card-kicker {
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--lp-green-700) !important;
    }

    #sapo-login-page .lp-card-header h2 {
        font-size: 20px !important;
        font-weight: 700 !important;
        color: var(--lp-text) !important;
        margin-top: 4px !important;
    }

    #sapo-login-page .lp-card-header p {
        margin-top: 6px !important;
        font-size: 13.5px !important;
        color: var(--lp-muted) !important;
    }

    /* ---------- Form ---------- */
    #sapo-login-page .lp-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        padding: 4px 28px 28px !important;
    }

    #sapo-login-page .lp-alert {
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        background: var(--lp-red-light) !important;
        border: 1px solid #fecaca !important;
        color: var(--lp-red) !important;
    }

    #sapo-login-page .lp-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
    }

    #sapo-login-page .lp-field span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--lp-text-secondary) !important;
        background: transparent !important;
    }

    #sapo-login-page .lp-field input {
        width: 100% !important;
        height: 44px !important;
        padding: 0 14px !important;
        font-size: 14px !important;
        color: var(--lp-text-secondary) !important;
        background: var(--lp-white) !important;
        border: 1px solid var(--lp-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    #sapo-login-page .lp-field input::placeholder {
        color: #9aa1ac !important;
        opacity: 1 !important;
    }

    #sapo-login-page .lp-field input:focus {
        border-color: var(--lp-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-login-page .lp-field input:disabled {
        background: #f9fafb !important;
        color: var(--lp-muted) !important;
        cursor: not-allowed !important;
    }

    #sapo-login-page .lp-submit-button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        height: 46px !important;
        margin-top: 4px !important;
        font-size: 14.5px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        background: var(--lp-green-700) !important;
        border: 1px solid var(--lp-green-700) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.15s ease !important;
    }

    #sapo-login-page .lp-submit-button:hover:not(:disabled) {
        background: var(--lp-green-800) !important;
    }

    #sapo-login-page .lp-submit-button:disabled {
        opacity: 0.65 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Test credentials ---------- */
    #sapo-login-page .lp-test-credentials {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        margin: 4px 28px 28px !important;
        padding: 14px 16px !important;
        background: #f9fafb !important;
        border: 1px solid var(--lp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-login-page .lp-test-credentials strong {
        font-size: 11.5px !important;
        font-weight: 700 !important;
        letter-spacing: 0.03em !important;
        text-transform: uppercase !important;
        color: var(--lp-muted) !important;
    }

    #sapo-login-page .lp-test-credentials-rows {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
    }

    #sapo-login-page .lp-test-credentials-rows span {
        font-size: 12.5px !important;
        font-weight: 500 !important;
        color: var(--lp-text-secondary) !important;
        font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Consolas,
            monospace !important;
        background: transparent !important;
    }

    /* ---------- Footer ---------- */
    #sapo-login-page .lp-footer {
        font-size: 12px !important;
        font-weight: 500 !important;
        color: var(--lp-muted) !important;
        text-align: center !important;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 480px) {
        #sapo-login-page {
            padding: 16px !important;
        }

        #sapo-login-page .lp-card-header {
            padding: 24px 20px 18px !important;
        }

        #sapo-login-page .lp-form {
            padding: 4px 20px 24px !important;
        }

        #sapo-login-page .lp-test-credentials {
            margin: 4px 20px 24px !important;
        }
    }
`;

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
        <main id="sapo-login-page">
            <style>
                {loginPageStyles}
            </style>

            <div className="lp-wrapper">
                <div className="lp-brand">
                    <div className="lp-brand-mark">
                        S
                    </div>

                    <span className="lp-brand-name">
                        Samarakoon Agro POS
                    </span>

                    <span className="lp-brand-tagline">
                        Agricultural Retail Management System
                    </span>
                </div>

                <section className="lp-card">
                    <header className="lp-card-header">
                        <span className="lp-card-kicker">
                            Welcome Back
                        </span>

                        <h2>Sign In to Continue</h2>

                        <p>
                            Enter your username and password
                            to access the POS.
                        </p>
                    </header>

                    <form
                        className="lp-form"
                        onSubmit={(event) => {
                            void handleSubmit(event);
                        }}
                    >
                        {errorMessage && (
                            <div
                                className="lp-alert"
                                role="alert"
                            >
                                {errorMessage}
                            </div>
                        )}

                        <label className="lp-field">
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

                        <label className="lp-field">
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
                            className="lp-submit-button"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Signing in...'
                                : 'Sign In'}
                        </button>
                    </form>

                    <div className="lp-test-credentials">
                        <strong>
                            Development Test Accounts
                        </strong>

                        <div className="lp-test-credentials-rows">
                            <span>
                                Admin: admin / Admin@12345
                            </span>

                            <span>
                                Cashier: cashier / Cashier@12345
                            </span>
                        </div>
                    </div>
                </section>

                <span className="lp-footer">
                    Samarakoon Agro POS
                </span>
            </div>
        </main>
    );
}