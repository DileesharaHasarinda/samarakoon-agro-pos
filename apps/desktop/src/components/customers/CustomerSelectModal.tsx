import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../lib/api';
import { getCustomerOptions } from '../../services/customerService';
import type { Customer } from '../../types/customer';

interface CustomerSelectModalProps {
    isOpen: boolean;
    selectedCustomer: Customer | null;
    onClose: () => void;
    onSelect: (customer: Customer | null) => void;
}

const currencyFormatter = new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function Icon({
    name,
}: {
    name: 'alert' | 'check' | 'close' | 'refresh' | 'search' | 'user' | 'users';
}) {
    const props = {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true,
    };

    if (name === 'alert') {
        return (
            <svg {...props}>
                <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4M12 17h.01" />
            </svg>
        );
    }

    if (name === 'check') {
        return (
            <svg {...props}>
                <path d="m5 12 4 4L19 6" />
            </svg>
        );
    }

    if (name === 'close') {
        return (
            <svg {...props}>
                <path d="m6 6 12 12M18 6 6 18" />
            </svg>
        );
    }

    if (name === 'refresh') {
        return (
            <svg {...props}>
                <path d="M20 11a8 8 0 1 0 2 5M20 4v7h-7" />
            </svg>
        );
    }

    if (name === 'search') {
        return (
            <svg {...props}>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
            </svg>
        );
    }

    if (name === 'users') {
        return (
            <svg {...props}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />

                <circle
                    cx="9"
                    cy="7"
                    r="4"
                />

                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        );
    }

    return (
        <svg {...props}>
            <circle
                cx="12"
                cy="8"
                r="4"
            />

            <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
    );
}

function customerDue(customer: Customer): number {
    const value = Number(
        customer.outstanding_due ?? 0,
    );

    return Number.isFinite(value)
        ? Math.max(0, value)
        : 0;
}

function customerReference(customer: Customer): string {
    const mobile = customer.mobile?.trim();
    const code = customer.customer_code?.trim();

    if (mobile && code) {
        return `${mobile} · ${code}`;
    }

    return mobile
        || code
        || 'No mobile number or customer code';
}

const styles = `
#customer-picker,
#customer-picker *,
#customer-picker *::before,
#customer-picker *::after {
    box-sizing: border-box !important;
}

#customer-picker {
    --green-900: #14532d;
    --green-800: #166534;
    --green-700: #15803d;
    --green-100: #dcfce7;
    --green-50: #f0fdf4;

    --red: #b42318;
    --red-bg: #fef3f2;

    --amber: #b54708;
    --amber-bg: #fffaeb;

    --text: #101828;
    --text-2: #344054;
    --muted: #667085;
    --border: #d0d9d2;
    --border-2: #aebdb2;
    --surface: #ffffff;
    --page: #f5f8f6;

    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;

    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: hidden !important;

    color: var(--text) !important;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif !important;

    font-size: 14px !important;
    line-height: 1.5 !important;

    isolation: isolate !important;
    -webkit-font-smoothing: antialiased !important;
}

#customer-picker button,
#customer-picker input {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#customer-picker h2,
#customer-picker p {
    margin: 0 !important;
}

#customer-picker .cp-backdrop {
    position: absolute !important;
    inset: 0 !important;

    display: flex !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 20px !important;

    overflow: auto !important;

    background:
        rgba(3, 18, 10, 0.72) !important;

    backdrop-filter: blur(4px) !important;
}

#customer-picker .cp-dialog {
    display: flex !important;

    width: min(720px, 100%) !important;
    max-height:
        calc(100dvh - 40px) !important;

    min-height: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: var(--surface) !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 16px !important;

    box-shadow:
        0 28px 72px
        rgba(0, 0, 0, 0.34) !important;
}

#customer-picker .cp-header {
    display: flex !important;

    min-height: 84px !important;
    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 16px !important;

    padding: 15px 18px !important;

    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--green-900),
            var(--green-700)
        ) !important;
}

#customer-picker .cp-header-copy {
    min-width: 0 !important;
    flex: 1 !important;
}

#customer-picker .cp-kicker {
    display: block !important;

    margin-bottom: 2px !important;

    color: #bbf7d0 !important;

    font-size: 11px !important;
    font-weight: 750 !important;
    letter-spacing: 0.055em !important;

    text-transform: uppercase !important;
}

#customer-picker .cp-title {
    overflow: hidden !important;

    color: #ffffff !important;

    font-size: 22px !important;
    font-weight: 740 !important;
    line-height: 1.25 !important;
    letter-spacing: -0.02em !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#customer-picker .cp-subtitle {
    margin-top: 3px !important;

    color: #d8f7e1 !important;

    font-size: 12px !important;
}

#customer-picker .cp-close {
    display: grid !important;

    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;

    place-items: center !important;

    padding: 0 !important;

    color: #ffffff !important;

    background:
        rgba(255, 255, 255, 0.12) !important;

    border:
        1px solid
        rgba(255, 255, 255, 0.34) !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#customer-picker .cp-close:hover {
    background:
        rgba(255, 255, 255, 0.22) !important;
}

#customer-picker .cp-close svg {
    width: 19px !important;
    height: 19px !important;
}

#customer-picker .cp-toolbar {
    flex: 0 0 auto !important;

    padding: 14px 16px !important;

    background: #ffffff !important;

    border-bottom:
        1px solid
        var(--border) !important;
}

#customer-picker .cp-label {
    display: block !important;

    margin-bottom: 5px !important;

    color: var(--text-2) !important;

    font-size: 12px !important;
    font-weight: 650 !important;
}

#customer-picker .cp-search {
    position: relative !important;
}

#customer-picker .cp-search > svg {
    position: absolute !important;

    top: 50% !important;
    left: 12px !important;

    width: 18px !important;
    height: 18px !important;

    color: var(--muted) !important;

    transform:
        translateY(-50%) !important;

    pointer-events: none !important;
}

#customer-picker .cp-input {
    display: block !important;

    width: 100% !important;
    height: 44px !important;

    padding:
        0
        42px
        0
        40px !important;

    color: var(--text) !important;

    font-size: 14px !important;

    background: #f8faf9 !important;

    border:
        1px solid
        var(--border-2) !important;

    border-radius: 9px !important;

    outline: none !important;
}

#customer-picker .cp-input::placeholder {
    color: #7a8696 !important;
    opacity: 1 !important;
}

#customer-picker .cp-clear {
    position: absolute !important;

    top: 50% !important;
    right: 5px !important;

    display: grid !important;

    width: 32px !important;
    height: 32px !important;

    place-items: center !important;

    padding: 0 !important;

    color: var(--muted) !important;

    background: transparent !important;

    border: 0 !important;
    border-radius: 7px !important;

    transform:
        translateY(-50%) !important;

    cursor: pointer !important;
}

#customer-picker .cp-clear:hover {
    color: var(--text) !important;
    background: #eaf0ec !important;
}

#customer-picker .cp-clear svg {
    width: 16px !important;
    height: 16px !important;
}

#customer-picker .cp-body {
    display: flex !important;

    min-height: 0 !important;
    flex: 1 !important;

    flex-direction: column !important;
    gap: 10px !important;

    padding: 14px 16px 18px !important;

    overflow: auto !important;

    background: var(--page) !important;

    scrollbar-width: thin !important;

    scrollbar-color:
        #9cad9f
        #eaf0eb !important;
}

#customer-picker .cp-error {
    display: flex !important;

    align-items: flex-start !important;
    gap: 9px !important;

    padding: 10px 12px !important;

    color: var(--red) !important;

    font-size: 13px !important;
    font-weight: 600 !important;

    background: var(--red-bg) !important;

    border:
        1px solid
        #f3b5af !important;

    border-radius: 9px !important;
}

#customer-picker .cp-error > svg {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;

    margin-top: 1px !important;
}

#customer-picker .cp-error span {
    min-width: 0 !important;
    flex: 1 !important;
}

#customer-picker .cp-retry {
    display: inline-flex !important;

    min-height: 32px !important;

    align-items: center !important;
    gap: 5px !important;

    padding: 5px 8px !important;

    color: var(--red) !important;

    font-size: 12px !important;
    font-weight: 650 !important;

    background: #ffffff !important;

    border:
        1px solid
        #e8aaa4 !important;

    border-radius: 7px !important;

    cursor: pointer !important;
}

#customer-picker .cp-retry svg {
    width: 14px !important;
    height: 14px !important;
}

#customer-picker .cp-section-label {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 0 2px !important;

    color: var(--muted) !important;

    font-size: 11px !important;
    font-weight: 700 !important;
    letter-spacing: 0.04em !important;

    text-transform: uppercase !important;
}

#customer-picker .cp-section-label strong {
    color: var(--text-2) !important;
    font-size: 11px !important;
}

#customer-picker .cp-option {
    position: relative !important;

    display: grid !important;

    grid-template-columns:
        minmax(0, 1fr)
        auto !important;

    width: 100% !important;
    min-height: 72px !important;

    align-items: center !important;
    gap: 14px !important;

    padding: 11px 12px !important;

    color: var(--text) !important;

    text-align: left !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius: 10px !important;

    box-shadow:
        0 1px 3px
        rgba(16, 24, 40, 0.04) !important;

    cursor: pointer !important;

    transition:
        border-color 150ms ease,
        box-shadow 150ms ease,
        transform 150ms ease !important;
}

#customer-picker .cp-option:hover {
    border-color:
        var(--green-700) !important;

    box-shadow:
        0 5px 13px
        rgba(21, 128, 61, 0.1) !important;

    transform:
        translateY(-1px) !important;
}

#customer-picker .cp-option.selected {
    background: var(--green-50) !important;

    border:
        2px solid
        var(--green-700) !important;

    box-shadow:
        0 5px 13px
        rgba(21, 128, 61, 0.12) !important;
}

#customer-picker .cp-main {
    display: flex !important;

    min-width: 0 !important;

    align-items: center !important;
    gap: 10px !important;
}

#customer-picker .cp-avatar {
    display: grid !important;

    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;

    place-items: center !important;

    color: var(--green-900) !important;

    background: var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 9px !important;
}

#customer-picker .selected .cp-avatar {
    color: #ffffff !important;

    background: var(--green-700) !important;

    border-color:
        var(--green-700) !important;
}

#customer-picker .cp-avatar svg {
    width: 18px !important;
    height: 18px !important;
}

#customer-picker .cp-copy {
    display: flex !important;

    min-width: 0 !important;
    flex: 1 !important;

    flex-direction: column !important;
    gap: 2px !important;
}

#customer-picker .cp-name {
    overflow: hidden !important;

    color: var(--text) !important;

    font-size: 14px !important;
    font-weight: 700 !important;
    line-height: 1.3 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#customer-picker .cp-reference {
    overflow: hidden !important;

    color: var(--muted) !important;

    font-size: 11px !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#customer-picker .cp-due {
    display: flex !important;

    min-width: 112px !important;

    flex-direction: column !important;
    align-items: flex-end !important;
    gap: 2px !important;

    padding: 7px 9px !important;

    background: #f8faf9 !important;

    border:
        1px solid
        #e4e9e5 !important;

    border-radius: 8px !important;
}

#customer-picker .cp-due span {
    color: var(--muted) !important;

    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: 0.035em !important;

    text-transform: uppercase !important;
}

#customer-picker .cp-due strong {
    color: var(--text-2) !important;

    font-size: 12px !important;
    font-weight: 750 !important;

    white-space: nowrap !important;
}

#customer-picker .cp-due.has-due {
    background: var(--amber-bg) !important;

    border-color: #f0d48f !important;
}

#customer-picker .cp-due.has-due strong {
    color: var(--amber) !important;
}

#customer-picker .cp-selected {
    position: absolute !important;

    top: -7px !important;
    right: -7px !important;

    display: grid !important;

    width: 24px !important;
    height: 24px !important;

    place-items: center !important;

    color: #ffffff !important;

    background: var(--green-700) !important;

    border: 2px solid #ffffff !important;
    border-radius: 50% !important;

    box-shadow:
        0 3px 8px
        rgba(21, 128, 61, 0.2) !important;
}

#customer-picker .cp-selected svg {
    width: 13px !important;
    height: 13px !important;
}

#customer-picker .cp-state {
    display: flex !important;

    min-height: 180px !important;

    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 8px !important;

    padding: 24px !important;

    color: var(--muted) !important;

    text-align: center !important;

    background: #ffffff !important;

    border:
        1px dashed
        var(--border-2) !important;

    border-radius: 10px !important;
}

#customer-picker .cp-state-icon {
    display: grid !important;

    width: 44px !important;
    height: 44px !important;

    place-items: center !important;

    color: var(--green-700) !important;

    background: var(--green-50) !important;

    border:
        1px solid
        #b8dfc3 !important;

    border-radius: 10px !important;
}

#customer-picker .cp-state-icon svg {
    width: 22px !important;
    height: 22px !important;
}

#customer-picker .cp-state strong {
    color: var(--text) !important;

    font-size: 15px !important;
}

#customer-picker .cp-state span {
    max-width: 360px !important;
    font-size: 12px !important;
}

#customer-picker .cp-spinner {
    width: 34px !important;
    height: 34px !important;

    border:
        4px solid
        var(--green-100) !important;

    border-top-color:
        var(--green-700) !important;

    border-radius: 50% !important;

    animation:
        cp-spin
        700ms
        linear
        infinite !important;
}

@keyframes cp-spin {
    to {
        transform: rotate(360deg);
    }
}

#customer-picker .cp-footer {
    display: flex !important;

    min-height: 62px !important;
    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;

    padding: 10px 16px !important;

    background: #ffffff !important;

    border-top:
        1px solid
        var(--border) !important;
}

#customer-picker .cp-footer span {
    color: var(--muted) !important;
    font-size: 11px !important;
}

#customer-picker .cp-cancel {
    display: inline-flex !important;

    min-height: 40px !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 8px 12px !important;

    color: var(--text-2) !important;

    font-size: 13px !important;
    font-weight: 650 !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--border-2) !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#customer-picker button:focus-visible,
#customer-picker .cp-input:focus {
    outline: none !important;

    border-color:
        var(--green-700) !important;

    box-shadow:
        0 0 0 4px
        rgba(21, 128, 61, 0.14) !important;
}

@media (max-width: 640px) {
    #customer-picker .cp-backdrop {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    #customer-picker .cp-dialog {
        width: 100% !important;
        max-height: 96dvh !important;

        border-right: 0 !important;
        border-bottom: 0 !important;
        border-left: 0 !important;

        border-radius:
            16px
            16px
            0
            0 !important;
    }

    #customer-picker .cp-header {
        min-height: 76px !important;
        padding: 13px 14px !important;
    }

    #customer-picker .cp-title {
        font-size: 19px !important;
    }

    #customer-picker .cp-toolbar,
    #customer-picker .cp-body {
        padding-right: 12px !important;
        padding-left: 12px !important;
    }

    #customer-picker .cp-option {
        grid-template-columns: 1fr !important;
    }

    #customer-picker .cp-due {
        width: 100% !important;
        min-width: 0 !important;

        align-items: flex-start !important;
    }

    #customer-picker .cp-footer span {
        display: none !important;
    }

    #customer-picker .cp-cancel {
        width: 100% !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #customer-picker *,
    #customer-picker *::before,
    #customer-picker *::after {
        transition: none !important;
        scroll-behavior: auto !important;
    }

    #customer-picker .cp-spinner {
        animation-duration: 1.2s !important;
    }
}
`;

export default function CustomerSelectModal({
    isOpen,
    selectedCustomer,
    onClose,
    onSelect,
}: CustomerSelectModalProps) {
    const { token } = useAuth();

    const searchRef =
        useRef<HTMLInputElement | null>(null);

    const requestRef = useRef(0);

    const [search, setSearch] = useState('');
    const [customers, setCustomers] =
        useState<Customer[]>([]);

    const [isLoading, setIsLoading] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState('');

    const loadCustomers = useCallback(
        async (
            query: string,
        ): Promise<void> => {
            if (!token) {
                return;
            }

            const requestId =
                requestRef.current + 1;

            requestRef.current = requestId;

            setIsLoading(true);
            setErrorMessage('');

            try {
                const response =
                    await getCustomerOptions(
                        token,
                        query.trim(),
                    );

                if (
                    requestRef.current
                    !== requestId
                ) {
                    return;
                }

                setCustomers(response.data);
            } catch (error) {
                if (
                    requestRef.current
                    !== requestId
                ) {
                    return;
                }

                setCustomers([]);

                setErrorMessage(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to load customers.',
                );
            } finally {
                if (
                    requestRef.current
                    === requestId
                ) {
                    setIsLoading(false);
                }
            }
        },
        [token],
    );

    useEffect(() => {
        if (!isOpen) {
            requestRef.current += 1;
            return;
        }

        setSearch('');
        setCustomers([]);
        setErrorMessage('');

        const oldOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            'hidden';

        const focusTimer =
            window.setTimeout(
                () => {
                    searchRef.current?.focus();
                },
                80,
            );

        const onKeyDown = (
            event: KeyboardEvent,
        ): void => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener(
            'keydown',
            onKeyDown,
        );

        return () => {
            window.clearTimeout(focusTimer);

            document.body.style.overflow =
                oldOverflow;

            window.removeEventListener(
                'keydown',
                onKeyDown,
            );
        };
    }, [
        isOpen,
        onClose,
    ]);

    useEffect(() => {
        if (
            !isOpen
            || !token
        ) {
            return;
        }

        const timer =
            window.setTimeout(
                () => {
                    void loadCustomers(search);
                },
                300,
            );

        return () => {
            window.clearTimeout(timer);
        };
    }, [
        isOpen,
        loadCustomers,
        search,
        token,
    ]);

    if (
        !isOpen
        || typeof document === 'undefined'
    ) {
        return null;
    }

    const choose = (
        customer: Customer | null,
    ): void => {
        onSelect(customer);
        onClose();
    };

    return createPortal(
        <div id="customer-picker">
            <style>
                {styles}
            </style>

            <div
                className="cp-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                    if (
                        event.target
                        === event.currentTarget
                    ) {
                        onClose();
                    }
                }}
            >
                <section
                    className="cp-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="customer-picker-title"
                >
                    <header className="cp-header">
                        <div className="cp-header-copy">
                            <span className="cp-kicker">
                                POS Customer
                            </span>

                            <h2
                                id="customer-picker-title"
                                className="cp-title"
                            >
                                Select Customer
                            </h2>

                            <p className="cp-subtitle">
                                Search accounts or continue
                                as a walk-in customer.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="cp-close"
                            aria-label="Close customer selection"
                            onClick={onClose}
                        >
                            <Icon name="close" />
                        </button>
                    </header>

                    <div className="cp-toolbar">
                        <label
                            className="cp-label"
                            htmlFor="customer-search-input"
                        >
                            Search by name, mobile
                            number or customer code
                        </label>

                        <div className="cp-search">
                            <Icon name="search" />

                            <input
                                ref={searchRef}
                                id="customer-search-input"
                                type="search"
                                className="cp-input"
                                value={search}
                                autoComplete="off"
                                spellCheck={false}
                                placeholder="Start typing to find a customer"
                                onChange={(event) => {
                                    setSearch(
                                        event.target.value,
                                    );
                                }}
                            />

                            {search && (
                                <button
                                    type="button"
                                    className="cp-clear"
                                    aria-label="Clear customer search"
                                    onClick={() => {
                                        setSearch('');

                                        searchRef
                                            .current
                                            ?.focus();
                                    }}
                                >
                                    <Icon name="close" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="cp-body">
                        <div className="cp-section-label">
                            <span>
                                Default customer
                            </span>
                        </div>

                        <button
                            type="button"
                            className={
                                selectedCustomer === null
                                    ? 'cp-option selected'
                                    : 'cp-option'
                            }
                            onClick={() => {
                                choose(null);
                            }}
                        >
                            <div className="cp-main">
                                <span className="cp-avatar">
                                    <Icon name="user" />
                                </span>

                                <span className="cp-copy">
                                    <strong className="cp-name">
                                        Walk-in Customer
                                    </strong>

                                    <span className="cp-reference">
                                        No customer account
                                        or due facility
                                    </span>
                                </span>
                            </div>

                            <div className="cp-due">
                                <span>
                                    Account
                                </span>

                                <strong>
                                    Not registered
                                </strong>
                            </div>

                            {selectedCustomer === null && (
                                <span className="cp-selected">
                                    <Icon name="check" />
                                </span>
                            )}
                        </button>

                        {errorMessage && (
                            <div
                                className="cp-error"
                                role="alert"
                            >
                                <Icon name="alert" />

                                <span>
                                    {errorMessage}
                                </span>

                                <button
                                    type="button"
                                    className="cp-retry"
                                    onClick={() => {
                                        void loadCustomers(
                                            search,
                                        );
                                    }}
                                >
                                    <Icon name="refresh" />

                                    Retry
                                </button>
                            </div>
                        )}

                        <div className="cp-section-label">
                            <span>
                                Customer accounts
                            </span>

                            {!isLoading && (
                                <strong>
                                    {customers.length}
                                    {' '}

                                    {customers.length === 1
                                        ? 'result'
                                        : 'results'}
                                </strong>
                            )}
                        </div>

                        {isLoading ? (
                            <div
                                className="cp-state"
                                aria-live="polite"
                            >
                                <div className="cp-spinner" />

                                <strong>
                                    Loading customers
                                </strong>

                                <span>
                                    Searching customer accounts
                                    and current balances.
                                </span>
                            </div>
                        ) : customers.length === 0 ? (
                            <div className="cp-state">
                                <span className="cp-state-icon">
                                    <Icon name="users" />
                                </span>

                                <strong>
                                    {search.trim()
                                        ? 'No matching customers'
                                        : 'No customer accounts available'}
                                </strong>

                                <span>
                                    {search.trim()
                                        ? 'Check the name, mobile number or customer code and try again.'
                                        : 'Create a customer account before using partial payment or due facilities.'}
                                </span>
                            </div>
                        ) : customers.map(
                            (customer) => {
                                const selected =
                                    selectedCustomer?.id
                                    === customer.id;

                                const due =
                                    customerDue(customer);

                                return (
                                    <button
                                        type="button"
                                        key={customer.id}
                                        className={
                                            selected
                                                ? 'cp-option selected'
                                                : 'cp-option'
                                        }
                                        onClick={() => {
                                            choose(customer);
                                        }}
                                    >
                                        <div className="cp-main">
                                            <span className="cp-avatar">
                                                <Icon name="user" />
                                            </span>

                                            <span className="cp-copy">
                                                <strong
                                                    className="cp-name"
                                                    title={
                                                        customer.name
                                                    }
                                                >
                                                    {customer.name}
                                                </strong>

                                                <span
                                                    className="cp-reference"
                                                    title={
                                                        customerReference(
                                                            customer,
                                                        )
                                                    }
                                                >
                                                    {customerReference(
                                                        customer,
                                                    )}
                                                </span>
                                            </span>
                                        </div>

                                        <div
                                            className={
                                                due > 0
                                                    ? 'cp-due has-due'
                                                    : 'cp-due'
                                            }
                                        >
                                            <span>
                                                Current Due
                                            </span>

                                            <strong>
                                                {currencyFormatter.format(
                                                    due,
                                                )}
                                            </strong>
                                        </div>

                                        {selected && (
                                            <span className="cp-selected">
                                                <Icon name="check" />
                                            </span>
                                        )}
                                    </button>
                                );
                            },
                        )}
                    </div>

                    <footer className="cp-footer">
                        <span>
                            Select an account to
                            continue with the sale.
                        </span>

                        <button
                            type="button"
                            className="cp-cancel"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </footer>
                </section>
            </div>
        </div>,
        document.body,
    );
}