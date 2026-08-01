import {
    useState,
} from 'react';

import {
    saveServerConfig,
} from '../lib/serverConfig';

interface ServerSetupScreenProps {
    onConfigured: () => void;
}

const serverSetupStyles = `
    #sapo-server-setup-screen,
    #sapo-server-setup-screen *,
    #sapo-server-setup-screen *::before,
    #sapo-server-setup-screen *::after {
        box-sizing: border-box !important;
    }

    #sapo-server-setup-screen {
        --ss-green-900: #14532d;
        --ss-green-700: #15803d;
        --ss-green-50: #f0fdf4;
        --ss-red: #dc2626;
        --ss-red-light: #fef2f2;
        --ss-text: #111827;
        --ss-text-secondary: #374151;
        --ss-muted: #6b7280;
        --ss-border: #e5e7eb;
        --ss-border-strong: #d1d5db;
        --ss-white: #ffffff;
        --ss-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        margin: 0 !important;
        padding: 24px !important;
        background: linear-gradient(160deg, #ffffff, var(--ss-green-50)) !important;
        font-family: var(--ss-font) !important;
        color: var(--ss-text-secondary) !important;
        font-size: 14px !important;
    }

    #sapo-server-setup-screen h1,
    #sapo-server-setup-screen p,
    #sapo-server-setup-screen span,
    #sapo-server-setup-screen label,
    #sapo-server-setup-screen button,
    #sapo-server-setup-screen input {
        font-family: var(--ss-font) !important;
    }

    #sapo-server-setup-screen h1,
    #sapo-server-setup-screen p {
        margin: 0 !important;
    }

    #sapo-server-setup-screen .ss-card {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 440px !important;
        background: var(--ss-white) !important;
        border: 1px solid var(--ss-border) !important;
        border-radius: 16px !important;
        box-shadow: 0 20px 48px rgba(15, 23, 42, 0.10) !important;
        overflow: hidden !important;
    }

    #sapo-server-setup-screen .ss-header {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 32px 28px 20px !important;
        text-align: center !important;
    }

    #sapo-server-setup-screen .ss-brand-mark {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 48px !important;
        height: 48px !important;
        font-size: 18px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        background: linear-gradient(145deg, var(--ss-green-900), var(--ss-green-700)) !important;
        border-radius: 12px !important;
    }

    #sapo-server-setup-screen h1 {
        font-size: 19px !important;
        font-weight: 700 !important;
        color: var(--ss-text) !important;
    }

    #sapo-server-setup-screen .ss-subtitle {
        font-size: 13.5px !important;
        color: var(--ss-muted) !important;
        line-height: 1.5 !important;
    }

    #sapo-server-setup-screen .ss-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        padding: 4px 28px 28px !important;
    }

    #sapo-server-setup-screen .ss-alert {
        padding: 12px 14px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        background: var(--ss-red-light) !important;
        border: 1px solid #fecaca !important;
        color: var(--ss-red) !important;
    }

    #sapo-server-setup-screen .ss-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
    }

    #sapo-server-setup-screen .ss-field span {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        color: var(--ss-text-secondary) !important;
    }

    #sapo-server-setup-screen .ss-field input {
        width: 100% !important;
        height: 44px !important;
        padding: 0 14px !important;
        font-size: 14px !important;
        color: var(--ss-text-secondary) !important;
        background: var(--ss-white) !important;
        border: 1px solid var(--ss-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
    }

    #sapo-server-setup-screen .ss-field input:focus {
        border-color: var(--ss-green-700) !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
    }

    #sapo-server-setup-screen .ss-field small {
        font-size: 12px !important;
        color: var(--ss-muted) !important;
        line-height: 1.5 !important;
    }

    #sapo-server-setup-screen .ss-submit-button {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        height: 46px !important;
        font-size: 14.5px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        background: var(--ss-green-700) !important;
        border: 1px solid var(--ss-green-700) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
    }

    #sapo-server-setup-screen .ss-submit-button:hover:not(:disabled) {
        background: var(--ss-green-900) !important;
    }

    #sapo-server-setup-screen .ss-submit-button:disabled {
        opacity: 0.65 !important;
        cursor: not-allowed !important;
    }

    #sapo-server-setup-screen .ss-hint-box {
        padding: 12px 14px !important;
        background: var(--ss-green-50) !important;
        border: 1px solid #b8dfc3 !important;
        border-radius: 8px !important;
        font-size: 12.5px !important;
        line-height: 1.6 !important;
        color: var(--ss-text-secondary) !important;
    }

    #sapo-server-setup-screen .ss-hint-box strong {
        color: var(--ss-green-900) !important;
    }
`;

export default function ServerSetupScreen({
    onConfigured,
}: ServerSetupScreenProps) {
    const [
        address,
        setAddress,
    ] = useState('');

    const [
        isSaving,
        setIsSaving,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        if (isSaving) {
            return;
        }

        const trimmed = address.trim();

        if (!trimmed) {
            setErrorMessage(
                'Enter the server address to continue.',
            );

            return;
        }

        setIsSaving(true);
        setErrorMessage('');

        try {
            await saveServerConfig(trimmed);
            onConfigured();
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Unable to save the server address.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div id="sapo-server-setup-screen">
            <style>
                {serverSetupStyles}
            </style>

            <section className="ss-card">
                <header className="ss-header">
                    <span className="ss-brand-mark">
                        S
                    </span>

                    <h1>
                        Connect to Your POS Server
                    </h1>

                    <p className="ss-subtitle">
                        Enter the address of the computer
                        running the Samarakoon Agro POS
                        server (usually the Admin PC).
                    </p>
                </header>

                <form
                    className="ss-form"
                    onSubmit={(event) => {
                        void handleSubmit(event);
                    }}
                >
                    {errorMessage && (
                        <div
                            className="ss-alert"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}

                    <label className="ss-field">
                        <span>Server Address</span>

                        <input
                            type="text"
                            value={address}
                            autoFocus
                            disabled={isSaving}
                            placeholder="Example: 192.168.1.10:8000"
                            onChange={(event) => {
                                setAddress(
                                    event.target.value,
                                );

                                setErrorMessage('');
                            }}
                        />

                        <small>
                            On the Admin PC, enter{' '}
                            <strong>localhost:8000</strong>.
                            On cashier computers, enter
                            the Admin PC's network
                            address, for example{' '}
                            <strong>192.168.1.10:8000</strong>.
                        </small>
                    </label>

                    <button
                        type="submit"
                        className="ss-submit-button"
                        disabled={isSaving}
                    >
                        {isSaving
                            ? 'Connecting...'
                            : 'Connect'}
                    </button>

                    <div className="ss-hint-box">
                        <strong>Not sure what to enter?</strong>
                        {' '}
                        Ask your system administrator for
                        the Admin PC's network address. It
                        can be found by running{' '}
                        <strong>ipconfig</strong> on the
                        Admin PC and looking for the
                        "IPv4 Address".
                    </div>
                </form>
            </section>
        </div>
    );
}