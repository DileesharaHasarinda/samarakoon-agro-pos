import {
    useEffect,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import type {
    Customer,
} from '../../types/customer';

interface CustomerViewModalProps {
    customer: Customer | null;
    isOpen: boolean;
    onClose: () => void;
}

const currencyFormatter =
    new Intl.NumberFormat(
        'en-LK',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

function displayText(
    value:
        | string
        | null
        | undefined,
): string {
    const text =
        String(
            value ?? '',
        ).trim();

    return text !== ''
        ? text
        : 'Not provided';
}

const customerViewModalStyles = `
    #sapo-customer-view-modal,
    #sapo-customer-view-modal *,
    #sapo-customer-view-modal *::before,
    #sapo-customer-view-modal *::after {
        box-sizing: border-box !important;
    }

    #sapo-customer-view-modal {
        --cvm-green-900: #14532d;
        --cvm-green-800: #166534;
        --cvm-green-700: #15803d;
        --cvm-green-100: #dcfce7;
        --cvm-green-50: #f0fdf4;
        --cvm-blue: #2563eb;
        --cvm-blue-light: #eff6ff;
        --cvm-red: #dc2626;
        --cvm-red-light: #fef2f2;
        --cvm-text: #0f172a;
        --cvm-text-secondary: #334155;
        --cvm-muted: #64748b;
        --cvm-border: #e2e8f0;
        --cvm-border-strong: #cbd5e1;
        --cvm-bg: #f8fafc;
        --cvm-white: #ffffff;
        --cvm-radius: 12px;
        --cvm-radius-sm: 7px;
        --cvm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483001 !important;

        display: flex !important;

        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;

        align-items: center !important;
        justify-content: center !important;

        margin: 0 !important;
        padding: 24px !important;

        font-family: var(--cvm-font) !important;

        background:
            rgba(
                15,
                23,
                42,
                0.58
            ) !important;

        backdrop-filter:
            blur(
                2px
            ) !important;
    }

    #sapo-customer-view-modal *,
    #sapo-customer-view-modal h2,
    #sapo-customer-view-modal h3,
    #sapo-customer-view-modal p,
    #sapo-customer-view-modal span,
    #sapo-customer-view-modal strong,
    #sapo-customer-view-modal small,
    #sapo-customer-view-modal button {
        font-family: var(--cvm-font) !important;
        text-transform: none !important;
        letter-spacing: normal !important;
    }

    #sapo-customer-view-modal h2,
    #sapo-customer-view-modal h3,
    #sapo-customer-view-modal p {
        margin: 0 !important;
        padding: 0 !important;
    }

    #sapo-customer-view-modal .cvm-panel {
        display: flex !important;

        width: 100% !important;
        max-width: 760px !important;

        max-height:
            min(
                88vh,
                760px
            ) !important;

        flex-direction:
            column !important;

        overflow: hidden !important;

        background:
            var(--cvm-white) !important;

        border:
            1px solid
            rgba(
                255,
                255,
                255,
                0.45
            ) !important;

        border-radius:
            var(--cvm-radius) !important;

        box-shadow:
            0 28px 60px
            rgba(
                15,
                23,
                42,
                0.30
            ) !important;
    }

    #sapo-customer-view-modal .cvm-header {
        display: flex !important;

        flex: 0 0 auto !important;

        align-items:
            flex-start !important;

        justify-content:
            space-between !important;

        gap: 16px !important;

        padding:
            19px
            22px !important;

        background:
            var(--cvm-white) !important;

        border-bottom:
            1px solid
            var(--cvm-border) !important;
    }

    #sapo-customer-view-modal .cvm-header-copy {
        display: flex !important;
        min-width: 0 !important;
        flex-direction: column !important;
        gap: 3px !important;
    }

    #sapo-customer-view-modal .cvm-kicker {
        color:
            var(--cvm-green-700) !important;

        font-size:
            11px !important;

        font-weight:
            750 !important;

        letter-spacing:
            0.06em !important;

        text-transform:
            uppercase !important;
    }

    #sapo-customer-view-modal .cvm-header h2 {
        color:
            var(--cvm-text) !important;

        font-size:
            20px !important;

        font-weight:
            750 !important;

        line-height:
            1.25 !important;
    }

    #sapo-customer-view-modal .cvm-code {
        color:
            var(--cvm-muted) !important;

        font-size:
            12px !important;

        font-weight:
            550 !important;
    }

    #sapo-customer-view-modal .cvm-close-button {
        display: grid !important;

        width: 34px !important;
        height: 34px !important;
        min-width: 34px !important;

        place-items:
            center !important;

        margin: 0 !important;
        padding: 0 !important;

        color:
            var(--cvm-muted) !important;

        font-size:
            21px !important;

        line-height:
            1 !important;

        background:
            var(--cvm-bg) !important;

        border:
            1px solid
            var(--cvm-border) !important;

        border-radius:
            var(--cvm-radius-sm) !important;

        cursor:
            pointer !important;
    }

    #sapo-customer-view-modal
    .cvm-close-button:hover {
        color:
            var(--cvm-text) !important;

        background:
            #eef2f6 !important;
    }

    #sapo-customer-view-modal .cvm-body {
        flex: 1 1 auto !important;

        min-height: 0 !important;

        overflow-x:
            hidden !important;

        overflow-y:
            auto !important;

        scrollbar-width:
            thin !important;

        scrollbar-color:
            var(--cvm-border-strong)
            transparent !important;
    }

    #sapo-customer-view-modal
    .cvm-body::-webkit-scrollbar {
        width: 9px !important;
    }

    #sapo-customer-view-modal
    .cvm-body::-webkit-scrollbar-thumb {
        background:
            var(--cvm-border-strong) !important;

        border:
            2px solid
            transparent !important;

        border-radius:
            999px !important;

        background-clip:
            content-box !important;
    }

    #sapo-customer-view-modal .cvm-body-inner {
        display: flex !important;

        flex-direction:
            column !important;

        gap: 18px !important;

        padding:
            20px
            22px
            24px !important;
    }

    #sapo-customer-view-modal .cvm-summary-grid {
        display: grid !important;

        grid-template-columns:
            repeat(
                3,
                minmax(
                    0,
                    1fr
                )
            ) !important;

        gap: 12px !important;
    }

    #sapo-customer-view-modal .cvm-summary-card {
        display: flex !important;

        min-width: 0 !important;

        flex-direction:
            column !important;

        gap: 4px !important;

        padding:
            13px
            14px !important;

        background:
            var(--cvm-bg) !important;

        border:
            1px solid
            var(--cvm-border) !important;

        border-radius:
            9px !important;
    }

    #sapo-customer-view-modal .cvm-summary-card span {
        color:
            var(--cvm-muted) !important;

        font-size:
            10px !important;

        font-weight:
            750 !important;

        letter-spacing:
            0.045em !important;

        text-transform:
            uppercase !important;
    }

    #sapo-customer-view-modal .cvm-summary-card strong {
        overflow: hidden !important;

        color:
            var(--cvm-text) !important;

        font-size:
            14px !important;

        font-weight:
            720 !important;

        line-height:
            1.3 !important;

        text-overflow:
            ellipsis !important;
    }

    #sapo-customer-view-modal .cvm-due {
        color:
            var(--cvm-red) !important;
    }

    #sapo-customer-view-modal .cvm-section {
        display: flex !important;

        flex-direction:
            column !important;

        gap: 10px !important;
    }

    #sapo-customer-view-modal .cvm-section-header {
        display: flex !important;

        align-items:
            center !important;

        justify-content:
            space-between !important;

        gap: 12px !important;

        padding-bottom:
            8px !important;

        border-bottom:
            1px solid
            var(--cvm-border) !important;
    }

    #sapo-customer-view-modal .cvm-section-header h3 {
        color:
            var(--cvm-text) !important;

        font-size:
            14px !important;

        font-weight:
            720 !important;
    }

    #sapo-customer-view-modal .cvm-status {
        display: inline-flex !important;

        min-height: 25px !important;

        align-items:
            center !important;

        justify-content:
            center !important;

        padding:
            3px
            9px !important;

        font-size:
            11px !important;

        font-weight:
            700 !important;

        border-radius:
            999px !important;
    }

    #sapo-customer-view-modal .cvm-status.active {
        color:
            var(--cvm-green-800) !important;

        background:
            var(--cvm-green-100) !important;
    }

    #sapo-customer-view-modal .cvm-status.inactive {
        color:
            var(--cvm-muted) !important;

        background:
            #f1f5f9 !important;
    }

    #sapo-customer-view-modal .cvm-detail-grid {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            ) !important;

        gap: 12px !important;
    }

    #sapo-customer-view-modal .cvm-detail {
        display: flex !important;

        min-width: 0 !important;

        flex-direction:
            column !important;

        gap: 4px !important;

        padding:
            12px
            13px !important;

        background:
            #ffffff !important;

        border:
            1px solid
            var(--cvm-border) !important;

        border-radius:
            8px !important;
    }

    #sapo-customer-view-modal .cvm-detail.wide {
        grid-column:
            1 / -1 !important;
    }

    #sapo-customer-view-modal .cvm-detail span {
        color:
            var(--cvm-muted) !important;

        font-size:
            10.5px !important;

        font-weight:
            750 !important;

        letter-spacing:
            0.035em !important;

        text-transform:
            uppercase !important;
    }

    #sapo-customer-view-modal .cvm-detail strong,
    #sapo-customer-view-modal .cvm-detail p {
        color:
            var(--cvm-text-secondary) !important;

        font-size:
            13px !important;

        font-weight:
            600 !important;

        line-height:
            1.5 !important;

        overflow-wrap:
            anywhere !important;
    }

    #sapo-customer-view-modal .cvm-detail p {
        white-space:
            pre-wrap !important;
    }

    #sapo-customer-view-modal .cvm-footer {
        display: flex !important;

        flex: 0 0 auto !important;

        justify-content:
            flex-end !important;

        padding:
            14px
            22px !important;

        background:
            var(--cvm-white) !important;

        border-top:
            1px solid
            var(--cvm-border) !important;
    }

    #sapo-customer-view-modal .cvm-button {
        display: inline-flex !important;

        min-width: 120px !important;
        min-height: 38px !important;

        align-items:
            center !important;

        justify-content:
            center !important;

        padding:
            8px
            16px !important;

        color:
            var(--cvm-text-secondary) !important;

        font-size:
            13px !important;

        font-weight:
            650 !important;

        background:
            var(--cvm-white) !important;

        border:
            1px solid
            var(--cvm-border-strong) !important;

        border-radius:
            var(--cvm-radius-sm) !important;

        cursor:
            pointer !important;
    }

    #sapo-customer-view-modal
    .cvm-button:hover {
        color:
            var(--cvm-text) !important;

        background:
            var(--cvm-bg) !important;
    }

    @media (
        max-width: 640px
    ) {
        #sapo-customer-view-modal {
            padding: 0 !important;
        }

        #sapo-customer-view-modal .cvm-panel {
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            max-height: none !important;
            border-radius: 0 !important;
        }

        #sapo-customer-view-modal .cvm-summary-grid,
        #sapo-customer-view-modal .cvm-detail-grid {
            grid-template-columns:
                minmax(
                    0,
                    1fr
                ) !important;
        }

        #sapo-customer-view-modal .cvm-detail.wide {
            grid-column:
                auto !important;
        }

        #sapo-customer-view-modal .cvm-footer {
            padding:
                12px
                16px !important;
        }

        #sapo-customer-view-modal .cvm-button {
            width: 100% !important;
        }
    }
`;

export default function CustomerViewModal({
    customer,
    isOpen,
    onClose,
}: CustomerViewModalProps) {
    useEffect(
        () => {
            if (!isOpen) {
                return;
            }

            const handleKeyDown =
                (
                    event:
                        KeyboardEvent,
                ): void => {
                    if (
                        event.key
                        === 'Escape'
                    ) {
                        onClose();
                    }
                };

            window.addEventListener(
                'keydown',
                handleKeyDown,
            );

            const previousOverflow =
                document.body
                    .style
                    .overflow;

            document.body
                .style
                .overflow =
                'hidden';

            return () => {
                window.removeEventListener(
                    'keydown',
                    handleKeyDown,
                );

                document.body
                    .style
                    .overflow =
                    previousOverflow;
            };
        },
        [
            isOpen,
            onClose,
        ],
    );

    if (
        !isOpen
        || !customer
    ) {
        return null;
    }

    const modalMarkup = (
        <div
            id="sapo-customer-view-modal"
            role="presentation"
            onMouseDown={(
                event,
            ) => {
                if (
                    event.target
                    === event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <style>
                {customerViewModalStyles}
            </style>

            <section
                className="cvm-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="customer-view-title"
                onMouseDown={(
                    event,
                ) => {
                    event
                        .stopPropagation();
                }}
            >
                <header className="cvm-header">
                    <div className="cvm-header-copy">
                        <span className="cvm-kicker">
                            Customer Details
                        </span>

                        <h2 id="customer-view-title">
                            {
                                customer
                                    .name
                            }
                        </h2>

                        <span className="cvm-code">
                            {
                                customer
                                    .customer_code
                            }
                        </span>
                    </div>

                    <button
                        type="button"
                        className="cvm-close-button"
                        aria-label="Close customer details"
                        onClick={
                            onClose
                        }
                    >
                        ×
                    </button>
                </header>

                <div className="cvm-body">
                    <div className="cvm-body-inner">
                        <section className="cvm-summary-grid">
                            <article className="cvm-summary-card">
                                <span>
                                    Credit Limit
                                </span>

                                <strong>
                                    {currencyFormatter.format(
                                        Number(
                                            customer
                                                .credit_limit
                                            ?? 0,
                                        ),
                                    )}
                                </strong>
                            </article>

                            <article className="cvm-summary-card">
                                <span>
                                    Outstanding Due
                                </span>

                                <strong
                                    className={
                                        Number(
                                            customer
                                                .outstanding_due
                                            ?? 0,
                                        ) > 0
                                            ? 'cvm-due'
                                            : ''
                                    }
                                >
                                    {currencyFormatter.format(
                                        Number(
                                            customer
                                                .outstanding_due
                                            ?? 0,
                                        ),
                                    )}
                                </strong>
                            </article>

                            <article className="cvm-summary-card">
                                <span>
                                    Sales
                                </span>

                                <strong>
                                    {
                                        customer
                                            .sales_count
                                    }
                                </strong>
                            </article>
                        </section>

                        <section className="cvm-section">
                            <header className="cvm-section-header">
                                <h3>
                                    Account Information
                                </h3>

                                <span
                                    className={
                                        customer
                                            .is_active
                                            ? 'cvm-status active'
                                            : 'cvm-status inactive'
                                    }
                                >
                                    {customer
                                        .is_active
                                        ? 'Active'
                                        : 'Inactive'}
                                </span>
                            </header>

                            <div className="cvm-detail-grid">
                                <article className="cvm-detail">
                                    <span>
                                        Customer Name
                                    </span>

                                    <strong>
                                        {
                                            customer
                                                .name
                                        }
                                    </strong>
                                </article>

                                <article className="cvm-detail">
                                    <span>
                                        Customer Type
                                    </span>

                                    <strong>
                                        {customer
                                            .customer_type
                                            === 'wholesale'
                                            ? 'Wholesale'
                                            : 'Retail'}
                                    </strong>
                                </article>

                                <article className="cvm-detail">
                                    <span>
                                        Mobile
                                    </span>

                                    <strong>
                                        {displayText(
                                            customer
                                                .mobile,
                                        )}
                                    </strong>
                                </article>

                                <article className="cvm-detail">
                                    <span>
                                        Secondary Mobile
                                    </span>

                                    <strong>
                                        {displayText(
                                            customer
                                                .secondary_mobile,
                                        )}
                                    </strong>
                                </article>

                                <article className="cvm-detail wide">
                                    <span>
                                        Email
                                    </span>

                                    <strong>
                                        {displayText(
                                            customer
                                                .email,
                                        )}
                                    </strong>
                                </article>

                                <article className="cvm-detail wide">
                                    <span>
                                        Address
                                    </span>

                                    <p>
                                        {displayText(
                                            customer
                                                .address,
                                        )}
                                    </p>
                                </article>

                                <article className="cvm-detail wide">
                                    <span>
                                        Notes
                                    </span>

                                    <p>
                                        {displayText(
                                            customer
                                                .notes,
                                        )}
                                    </p>
                                </article>
                            </div>
                        </section>
                    </div>
                </div>

                <footer className="cvm-footer">
                    <button
                        type="button"
                        className="cvm-button"
                        onClick={
                            onClose
                        }
                    >
                        Close
                    </button>
                </footer>
            </section>
        </div>
    );

    return createPortal(
        modalMarkup,
        document.body,
    );
}
