const loadingScreenStyles = `
    #sapo-loading-screen,
    #sapo-loading-screen *,
    #sapo-loading-screen *::before,
    #sapo-loading-screen *::after {
        box-sizing: border-box !important;
    }

    #sapo-loading-screen {
        --lsc-green-900: #14532d;
        --lsc-green-700: #15803d;
        --lsc-green-50: #f0fdf4;
        --lsc-text: #111827;
        --lsc-muted: #6b7280;
        --lsc-border: #e5e7eb;
        --lsc-white: #ffffff;
        --lsc-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        inset: 0 !important;
        z-index: 999999 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 18px !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        margin: 0 !important;
        padding: 24px !important;
        background:
            linear-gradient(
                160deg,
                #ffffff,
                var(--lsc-green-50)
            ) !important;
        font-family: var(--lsc-font) !important;
        color: var(--lsc-text) !important;
        text-align: center !important;
    }

    #sapo-loading-screen h1,
    #sapo-loading-screen p {
        margin: 0 !important;
        font-family: var(--lsc-font) !important;
        letter-spacing: normal !important;
    }

    /* ---------- Brand mark ---------- */
    #sapo-loading-screen .lsc-brand-mark {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 56px !important;
        height: 56px !important;
        color: #ffffff !important;
        background:
            linear-gradient(
                145deg,
                var(--lsc-green-900),
                var(--lsc-green-700)
            ) !important;
        border-radius: 14px !important;
        box-shadow: 0 8px 20px rgba(21, 128, 61, 0.22) !important;
        margin-bottom: 4px !important;
    }

    #sapo-loading-screen .lsc-brand-mark svg {
        width: 28px !important;
        height: 28px !important;
    }

    /* ---------- Spinner ---------- */
    #sapo-loading-screen .lsc-spinner {
        width: 34px !important;
        height: 34px !important;
        border: 3px solid var(--lsc-border) !important;
        border-top-color: var(--lsc-green-700) !important;
        border-radius: 50% !important;
        animation: lsc-spin 0.8s linear infinite !important;
    }

    @keyframes lsc-spin {
        to {
            transform: rotate(360deg);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        #sapo-loading-screen .lsc-spinner {
            animation-duration: 1.4s !important;
        }
    }

    /* ---------- Copy ---------- */
    #sapo-loading-screen .lsc-title {
        font-size: 20px !important;
        font-weight: 700 !important;
        letter-spacing: -0.01em !important;
        color: var(--lsc-text) !important;
    }

    #sapo-loading-screen .lsc-subtitle {
        font-size: 13.5px !important;
        font-weight: 500 !important;
        color: var(--lsc-muted) !important;
    }

    @media (max-width: 420px) {
        #sapo-loading-screen .lsc-title {
            font-size: 18px !important;
        }
    }
`;

export default function LoadingScreen() {
    return (
        <main id="sapo-loading-screen">
            <style>
                {loadingScreenStyles}
            </style>

            <span
                className="lsc-brand-mark"
                aria-hidden="true"
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="m21 8-9 5-9-5 9-5 9 5Z" />
                    <path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" />
                </svg>
            </span>

            <div
                className="lsc-spinner"
                aria-hidden="true"
            />

            <h1 className="lsc-title">
                Samarakoon Agro POS
            </h1>

            <p className="lsc-subtitle">
                Checking your session...
            </p>
        </main>
    );
}