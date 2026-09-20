import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import type {
    PosCartItem,
    TrainingPaymentDetails,
} from '../../types/sale';

interface TrainingBillModalProps {
    isOpen: boolean;

    cart: PosCartItem[];

    payment:
    TrainingPaymentDetails
    | null;

    onClose: () => void;

    onFinish: () => void;
}

const quantityFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            minimumFractionDigits:
                0,

            maximumFractionDigits:
                3,
        },
    );

const dateTimeFormatter =
    new Intl.DateTimeFormat(
        'en-LK',
        {
            timeZone:
                'Asia/Colombo',

            year:
                'numeric',

            month:
                'short',

            day:
                '2-digit',

            hour:
                '2-digit',

            minute:
                '2-digit',

            second:
                '2-digit',
        },
    );

function escapeHtml(
    value: string,
): string {
    return value
        .replace(
            /&/g,
            '&amp;',
        )
        .replace(
            /</g,
            '&lt;',
        )
        .replace(
            />/g,
            '&gt;',
        )
        .replace(
            /"/g,
            '&quot;',
        )
        .replace(
            /'/g,
            '&#039;',
        );
}

function createTrainingBillNumber(): string {
    const now =
        new Date();

    const parts =
        new Intl.DateTimeFormat(
            'en-GB',
            {
                timeZone:
                    'Asia/Colombo',

                year:
                    'numeric',

                month:
                    '2-digit',

                day:
                    '2-digit',

                hour:
                    '2-digit',

                minute:
                    '2-digit',

                second:
                    '2-digit',

                hour12:
                    false,
            },
        ).formatToParts(
            now,
        );

    const value = (
        type:
            | 'year'
            | 'month'
            | 'day'
            | 'hour'
            | 'minute'
            | 'second',
    ): string =>
        parts.find(
            (
                part,
            ) =>
                part.type
                === type,
        )?.value
        ?? '00';

    return [
        'TRN',
        value('year'),
        value('month'),
        value('day'),
        value('hour'),
        value('minute'),
        value('second'),
    ].join('-');
}

function paymentMethodLabel(
    method:
        TrainingPaymentDetails[
        'payment_method'
        ],
): string {
    switch (method) {
        case 'card':
            return 'Card';

        case 'bank_transfer':
            return 'Bank Transfer';

        case 'cash':
        default:
            return 'Cash';
    }
}

type IconName =
    | 'check'
    | 'close'
    | 'payment'
    | 'print'
    | 'receipt'
    | 'training';

function Icon({
    name,
}: {
    name: IconName;
}) {
    const props = {
        viewBox:
            '0 0 24 24',

        fill:
            'none',

        stroke:
            'currentColor',

        strokeWidth:
            2,

        strokeLinecap:
            'round' as const,

        strokeLinejoin:
            'round' as const,

        'aria-hidden':
            true,

        focusable:
            false,
    };

    switch (name) {
        case 'check':
            return (
                <svg {...props}>
                    <path d="m5 12 4 4L19 6" />
                </svg>
            );

        case 'close':
            return (
                <svg {...props}>
                    <path d="m6 6 12 12M18 6 6 18" />
                </svg>
            );

        case 'payment':
            return (
                <svg {...props}>
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                    />
                    <path d="M3 10h18M7 15h3" />
                </svg>
            );

        case 'print':
            return (
                <svg {...props}>
                    <path d="M6 9V3h12v6" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect
                        x="6"
                        y="14"
                        width="12"
                        height="7"
                    />
                </svg>
            );

        case 'receipt':
            return (
                <svg {...props}>
                    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
                    <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
            );

        case 'training':
        default:
            return (
                <svg {...props}>
                    <path d="m3 10 9-5 9 5-9 5-9-5Z" />
                    <path d="M7 12.5V17c2.8 2 7.2 2 10 0v-4.5" />
                    <path d="M21 10v5" />
                </svg>
            );
    }
}

const styles = `
#training-bill-modal,
#training-bill-modal * {
    box-sizing: border-box;
}

#training-bill-modal {
    position: fixed;
    inset: 0;
    z-index: 10130;
    display: grid;
    place-items: center;
    padding: 22px;
    background: rgba(15, 23, 42, 0.62);
    backdrop-filter: blur(5px);
}

#training-bill-modal .training-bill-shell {
    width: min(860px, 100%);
    max-height: calc(100dvh - 44px);
    overflow: hidden;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    background: #f6f8f6;
    border: 1px solid #cfd8d1;
    border-radius: 18px;
    box-shadow: 0 26px 90px rgba(15, 23, 42, 0.34);
}

#training-bill-modal .training-bill-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    padding: 20px 22px;
    color: #ffffff;
    background:
        linear-gradient(
            135deg,
            #14532d,
            #15803d
        );
}

#training-bill-modal .training-bill-eyebrow {
    display: block;
    margin-bottom: 5px;
    color: #bbf7d0;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.07em;
    text-transform: uppercase;
}

#training-bill-modal .training-bill-title {
    margin: 0;
    font-size: 25px;
    line-height: 1.18;
}

#training-bill-modal .training-bill-subtitle {
    display: block;
    margin-top: 6px;
    color: #dcfce7;
    font-size: 12px;
    font-weight: 650;
}

#training-bill-modal .training-bill-close {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    display: grid;
    place-items: center;
    color: #ffffff;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 10px;
    cursor: pointer;
}

#training-bill-modal .training-bill-close svg {
    width: 20px;
    height: 20px;
}

#training-bill-modal .training-bill-body {
    min-height: 0;
    overflow-y: auto;
    display: grid;
    gap: 14px;
    padding: 18px;
}

#training-bill-modal .training-bill-warning {
    padding: 12px 13px;
    color: #92400e;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.45;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 11px;
}

#training-bill-modal .training-bill-preview {
    padding: 18px;
    background: #ffffff;
    border: 1px solid #d9e1db;
    border-radius: 13px;
}

#training-bill-modal .training-bill-preview-header {
    display: grid;
    gap: 4px;
    padding-bottom: 13px;
    text-align: center;
    border-bottom: 1px dashed #98a2b3;
}

#training-bill-modal .training-bill-preview-header strong {
    color: #101828;
    font-size: 20px;
}

#training-bill-modal .training-bill-preview-header span {
    color: #475467;
    font-size: 11px;
}

#training-bill-modal .training-bill-training-label {
    margin-top: 4px;
    color: #15803d !important;
    font-size: 13px !important;
    font-weight: 900;
    letter-spacing: 0.06em;
}

#training-bill-modal .training-bill-meta {
    display: grid;
    grid-template-columns:
        repeat(
            2,
            minmax(0, 1fr)
        );
    gap: 8px 14px;
    margin: 13px 0;
    padding-bottom: 13px;
    border-bottom: 1px dashed #98a2b3;
}

#training-bill-modal .training-bill-meta-row {
    display: grid;
    gap: 2px;
}

#training-bill-modal .training-bill-meta-row span {
    color: #667085;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
}

#training-bill-modal .training-bill-meta-row strong {
    color: #101828;
    font-size: 12px;
    word-break: break-word;
}

#training-bill-modal .training-bill-table-wrap {
    overflow-x: auto;
}

#training-bill-modal .training-bill-table {
    width: 100%;
    border-collapse: collapse;
}

#training-bill-modal .training-bill-table th,
#training-bill-modal .training-bill-table td {
    padding: 9px 7px;
    text-align: left;
    border-bottom: 1px dotted #d0d5dd;
}

#training-bill-modal .training-bill-table th {
    color: #475467;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
}

#training-bill-modal .training-bill-table td {
    color: #101828;
    font-size: 12px;
    font-weight: 650;
}

#training-bill-modal .training-bill-table .number {
    width: 44px;
}

#training-bill-modal .training-bill-table .quantity {
    width: 110px;
    text-align: right;
}

#training-bill-modal .training-bill-table .unit {
    width: 100px;
}

#training-bill-modal .training-bill-payment-card {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    margin-top: 14px;
    padding: 12px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 10px;
}

#training-bill-modal .training-bill-payment-card svg {
    width: 22px;
    height: 22px;
    color: #15803d;
}

#training-bill-modal .training-bill-payment-copy strong,
#training-bill-modal .training-bill-payment-copy span {
    display: block;
}

#training-bill-modal .training-bill-payment-copy strong {
    color: #14532d;
    font-size: 13px;
}

#training-bill-modal .training-bill-payment-copy span {
    margin-top: 3px;
    color: #475467;
    font-size: 11px;
}

#training-bill-modal .training-bill-notes {
    display: grid;
    gap: 3px;
    margin-top: 13px;
    padding-top: 12px;
    border-top: 1px dashed #98a2b3;
}

#training-bill-modal .training-bill-notes strong {
    color: #344054;
    font-size: 11px;
}

#training-bill-modal .training-bill-notes span {
    color: #475467;
    font-size: 11px;
    white-space: pre-wrap;
}

#training-bill-modal .training-bill-footer-note {
    margin-top: 14px;
    padding-top: 12px;
    color: #667085;
    font-size: 10px;
    font-weight: 800;
    line-height: 1.45;
    text-align: center;
    border-top: 1px dashed #98a2b3;
}

#training-bill-modal .training-bill-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 9px;
    padding: 13px 18px;
    background: #ffffff;
    border-top: 1px solid #d9e1db;
}

#training-bill-modal .training-bill-button {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 15px;
    font-size: 13px;
    font-weight: 900;
    border-radius: 9px;
    cursor: pointer;
}

#training-bill-modal .training-bill-button svg {
    width: 17px;
    height: 17px;
}

#training-bill-modal .training-bill-button.secondary {
    color: #344054;
    background: #ffffff;
    border: 1px solid #cfd8d1;
}

#training-bill-modal .training-bill-button.print {
    color: #14532d;
    background: #f0fdf4;
    border: 1px solid #86efac;
}

#training-bill-modal .training-bill-button.finish {
    color: #ffffff;
    background: #15803d;
    border: 1px solid #15803d;
}

@media (max-width: 650px) {
    #training-bill-modal {
        padding: 10px;
    }

    #training-bill-modal .training-bill-meta {
        grid-template-columns: 1fr;
    }

    #training-bill-modal .training-bill-actions {
        display: grid;
        grid-template-columns: 1fr;
    }
}
`;

export default function TrainingBillModal({
    isOpen,
    cart,
    payment,
    onClose,
    onFinish,
}: TrainingBillModalProps) {
    const [
        billNumber,
        setBillNumber,
    ] = useState(
        createTrainingBillNumber,
    );

    const [
        createdAt,
        setCreatedAt,
    ] = useState(
        () =>
            new Date(),
    );

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setBillNumber(
            createTrainingBillNumber(),
        );

        setCreatedAt(
            new Date(),
        );
    }, [
        isOpen,
    ]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow =
            document.body
                .style
                .overflow;

        document.body
            .style
            .overflow =
            'hidden';

        const handleKeyDown = (
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

        return () => {
            document.body
                .style
                .overflow =
                previousOverflow;

            window.removeEventListener(
                'keydown',
                handleKeyDown,
            );
        };
    }, [
        isOpen,
        onClose,
    ]);

    const printableRows =
        useMemo(
            () =>
                cart.map(
                    (
                        item,
                        index,
                    ) => ({
                        line:
                            index + 1,

                        name:
                            item
                                .product_name,

                        quantity:
                            quantityFormatter
                                .format(
                                    item
                                        .quantity,
                                ),

                        unit:
                            item
                                .sale_unit,
                    }),
                ),
            [
                cart,
            ],
        );

    if (
        !isOpen
        || !payment
    ) {
        return null;
    }

    const paymentLabel =
        paymentMethodLabel(
            payment
                .payment_method,
        );

    const printBill =
        (): void => {
            const iframe =
                document.createElement(
                    'iframe',
                );

            iframe.setAttribute(
                'title',
                'Training bill print frame',
            );

            iframe.style.position =
                'fixed';

            iframe.style.right =
                '0';

            iframe.style.bottom =
                '0';

            iframe.style.width =
                '0';

            iframe.style.height =
                '0';

            iframe.style.border =
                '0';

            document.body.appendChild(
                iframe,
            );

            const printDocument =
                iframe
                    .contentDocument;

            if (!printDocument) {
                iframe.remove();

                return;
            }

            const rowsHtml =
                printableRows
                    .map(
                        (
                            row,
                        ) => `
                            <tr>
                                <td class="line">${row.line}</td>
                                <td>${escapeHtml(row.name)}</td>
                                <td class="qty">${escapeHtml(row.quantity)}</td>
                                <td>${escapeHtml(row.unit)}</td>
                            </tr>
                        `,
                    )
                    .join('');

            const customerHtml =
                payment
                    .customer_reference
                    .trim()
                    ? `
                    <div class="meta-row">
                        <span>Customer / Reference</span>
                        <strong>${escapeHtml(
                        payment
                            .customer_reference
                            .trim(),
                    )}</strong>
                    </div>
                `
                    : '';

            const referenceHtml =
                payment
                    .reference_number
                    .trim()
                    ? `
                    <div class="meta-row">
                        <span>Payment Reference</span>
                        <strong>${escapeHtml(
                        payment
                            .reference_number
                            .trim(),
                    )}</strong>
                    </div>
                `
                    : '';

            const notesHtml =
                payment
                    .notes
                    .trim()
                    ? `
                    <div class="notes">
                        <strong>Notes</strong>
                        <span>${escapeHtml(
                        payment
                            .notes
                            .trim(),
                    )}</span>
                    </div>
                `
                    : '';

            printDocument.open();

            printDocument.write(`
                <!doctype html>
                <html>
                <head>
                    <meta charset="utf-8" />

                    <title>${escapeHtml(
                billNumber,
            )}</title>

                    <style>
                        @page {
                            size: 80mm auto;
                            margin: 4mm;
                        }

                        * {
                            box-sizing: border-box;
                        }

                        body {
                            width: 72mm;
                            margin: 0 auto;
                            color: #000;
                            font-family:
                                Arial,
                                Helvetica,
                                sans-serif;
                            font-size: 11px;
                            line-height: 1.35;
                        }

                        h1,
                        h2,
                        p {
                            margin: 0;
                        }

                        .center {
                            text-align: center;
                        }

                        .shop {
                            font-size: 17px;
                            font-weight: 800;
                        }

                        .training {
                            margin-top: 3px;
                            font-size: 13px;
                            font-weight: 900;
                            letter-spacing: 0.06em;
                        }

                        .warning {
                            margin: 8px 0;
                            padding: 6px;
                            font-weight: 800;
                            text-align: center;
                            border: 1px dashed #000;
                        }

                        .meta {
                            padding: 6px 0;
                            border-top: 1px dashed #000;
                            border-bottom: 1px dashed #000;
                        }

                        .meta-row {
                            display: flex;
                            justify-content: space-between;
                            gap: 8px;
                            margin: 2px 0;
                        }

                        .meta-row strong {
                            text-align: right;
                        }

                        table {
                            width: 100%;
                            margin-top: 7px;
                            border-collapse: collapse;
                        }

                        th,
                        td {
                            padding: 5px 2px;
                            vertical-align: top;
                            border-bottom: 1px dotted #777;
                        }

                        th {
                            text-align: left;
                            font-size: 10px;
                        }

                        .line {
                            width: 8mm;
                        }

                        .qty {
                            width: 15mm;
                            text-align: right;
                        }

                        .payment {
                            margin-top: 8px;
                            padding: 6px 0;
                            font-weight: 800;
                            border-top: 1px dashed #000;
                            border-bottom: 1px dashed #000;
                        }

                        .notes {
                            display: grid;
                            gap: 2px;
                            margin-top: 8px;
                            padding-top: 7px;
                            border-top: 1px dashed #000;
                        }

                        .footer {
                            margin-top: 10px;
                            padding-top: 8px;
                            text-align: center;
                            font-size: 10px;
                            font-weight: 700;
                            border-top: 1px dashed #000;
                        }
                    </style>
                </head>

                <body>
                    <header class="center">
                        <div class="shop">
                            Samarakoon Agro
                        </div>

                        <div class="training">
                            TRAINING BILL
                        </div>
                    </header>

                    <div class="warning">
                        NO PRICES • PRACTICE PAYMENT • NO STOCK DEDUCTION
                    </div>

                    <div class="meta">
                        <div class="meta-row">
                            <span>Bill</span>

                            <strong>${escapeHtml(
                billNumber,
            )}</strong>
                        </div>

                        <div class="meta-row">
                            <span>Date</span>

                            <strong>${escapeHtml(
                dateTimeFormatter
                    .format(
                        createdAt,
                    ),
            )}</strong>
                        </div>

                        ${customerHtml}
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th class="line">#</th>
                                <th>Item</th>
                                <th class="qty">Qty</th>
                                <th>Unit</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>

                    <div class="payment">
                        <div class="meta-row">
                            <span>Payment Method</span>

                            <strong>${escapeHtml(
                paymentLabel,
            )}</strong>
                        </div>

                        ${referenceHtml}
                    </div>

                    ${notesHtml}

                    <div class="footer">
                        TRAINING / PRACTICE DOCUMENT ONLY<br />
                        No real payment or stock transaction was recorded.
                    </div>
                </body>
                </html>
            `);

            printDocument.close();

            const printWindow =
                iframe
                    .contentWindow;

            window.setTimeout(
                () => {
                    try {
                        printWindow
                            ?.focus();

                        printWindow
                            ?.print();
                    } finally {
                        window.setTimeout(
                            () => {
                                iframe.remove();
                            },
                            1200,
                        );
                    }
                },
                150,
            );
        };

    return createPortal(
        <div
            id="training-bill-modal"
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
                {styles}
            </style>

            <section
                className="training-bill-shell"
                role="dialog"
                aria-modal="true"
                aria-label="Training bill"
            >
                <header className="training-bill-header">
                    <div>
                        <span className="training-bill-eyebrow">
                            Training Receipt
                        </span>

                        <h2 className="training-bill-title">
                            Training Bill Completed
                        </h2>

                        <span className="training-bill-subtitle">
                            Review and print the practice receipt.
                        </span>
                    </div>

                    <button
                        type="button"
                        className="training-bill-close"
                        aria-label="Close training bill"
                        onClick={
                            onClose
                        }
                    >
                        <Icon name="close" />
                    </button>
                </header>

                <div className="training-bill-body">
                    <div className="training-bill-warning">
                        This is a training document only. It does not create a
                        real sale, payment, customer due, cashier collection,
                        stock movement, revenue, profit, or report transaction.
                    </div>

                    <div className="training-bill-preview">
                        <div className="training-bill-preview-header">
                            <strong>
                                Samarakoon Agro
                            </strong>

                            <span className="training-bill-training-label">
                                TRAINING BILL
                            </span>

                            <span>
                                No prices • No stock deduction
                            </span>
                        </div>

                        <div className="training-bill-meta">
                            <div className="training-bill-meta-row">
                                <span>
                                    Training Bill No.
                                </span>

                                <strong>
                                    {billNumber}
                                </strong>
                            </div>

                            <div className="training-bill-meta-row">
                                <span>
                                    Date / Time
                                </span>

                                <strong>
                                    {dateTimeFormatter.format(
                                        createdAt,
                                    )}
                                </strong>
                            </div>

                            <div className="training-bill-meta-row">
                                <span>
                                    Payment Method
                                </span>

                                <strong>
                                    {paymentLabel}
                                </strong>
                            </div>

                            {payment.customer_reference && (
                                <div className="training-bill-meta-row">
                                    <span>
                                        Customer / Reference
                                    </span>

                                    <strong>
                                        {payment.customer_reference}
                                    </strong>
                                </div>
                            )}

                            {payment.reference_number && (
                                <div className="training-bill-meta-row">
                                    <span>
                                        Payment Reference
                                    </span>

                                    <strong>
                                        {payment.reference_number}
                                    </strong>
                                </div>
                            )}
                        </div>

                        <div className="training-bill-table-wrap">
                            <table className="training-bill-table">
                                <thead>
                                    <tr>
                                        <th className="number">
                                            #
                                        </th>

                                        <th>
                                            Product
                                        </th>

                                        <th className="quantity">
                                            Quantity
                                        </th>

                                        <th className="unit">
                                            Unit
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {printableRows.map(
                                        (
                                            row,
                                        ) => (
                                            <tr
                                                key={
                                                    `${row.line}:${row.name}:${row.unit}`
                                                }
                                            >
                                                <td>
                                                    {row.line}
                                                </td>

                                                <td>
                                                    {row.name}
                                                </td>

                                                <td className="quantity">
                                                    {row.quantity}
                                                </td>

                                                <td>
                                                    {row.unit}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="training-bill-payment-card">
                            <Icon name="payment" />

                            <div className="training-bill-payment-copy">
                                <strong>
                                    Payment Method:
                                    {' '}
                                    {paymentLabel}
                                </strong>

                                <span>
                                    Practice payment selection only.
                                    No real payment was recorded.
                                </span>
                            </div>
                        </div>

                        {payment.notes && (
                            <div className="training-bill-notes">
                                <strong>
                                    Notes
                                </strong>

                                <span>
                                    {payment.notes}
                                </span>
                            </div>
                        )}

                        <div className="training-bill-footer-note">
                            TRAINING / PRACTICE DOCUMENT ONLY
                            <br />
                            No real sale, payment or stock transaction recorded.
                        </div>
                    </div>
                </div>

                <footer className="training-bill-actions">
                    <button
                        type="button"
                        className="training-bill-button secondary"
                        onClick={
                            onClose
                        }
                    >
                        Back to Cart
                    </button>

                    <button
                        type="button"
                        className="training-bill-button print"
                        onClick={
                            printBill
                        }
                    >
                        <Icon name="print" />

                        Print Training Bill
                    </button>

                    <button
                        type="button"
                        className="training-bill-button finish"
                        onClick={
                            onFinish
                        }
                    >
                        <Icon name="check" />

                        Finish & New Training Bill
                    </button>
                </footer>
            </section>
        </div>,
        document.body,
    );
}
