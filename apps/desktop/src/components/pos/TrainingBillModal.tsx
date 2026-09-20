import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import type {
    PosCartItem,
} from '../../types/sale';

interface TrainingBillModalProps {
    isOpen: boolean;

    cart: PosCartItem[];

    onClose: () => void;

    onFinish: () => void;
}

const quantityFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        },
    );

const dateTimeFormatter =
    new Intl.DateTimeFormat(
        'en-LK',
        {
            timeZone: 'Asia/Colombo',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
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
                timeZone: 'Asia/Colombo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
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
            (part) =>
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

export default function TrainingBillModal({
    isOpen,
    cart,
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
        customerReference,
        setCustomerReference,
    ] = useState('');

    const [
        notes,
        setNotes,
    ] = useState('');

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
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (
            event: KeyboardEvent,
        ): void => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener(
            'keydown',
            handleKeyDown,
        );

        return () => {
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
            [cart],
        );

    if (!isOpen) {
        return null;
    }

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
                customerReference
                    .trim()
                    ? `
                    <div class="meta-row">
                        <span>Customer / Reference</span>
                        <strong>${escapeHtml(
                        customerReference
                            .trim(),
                    )}</strong>
                    </div>
                `
                    : '';

            const notesHtml =
                notes.trim()
                    ? `
                    <div class="notes">
                        <strong>Notes</strong>
                        <span>${escapeHtml(
                        notes.trim(),
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
                        NO PRICES • NO PAYMENT • NO STOCK DEDUCTION
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

                    ${notesHtml}

                    <div class="footer">
                        TRAINING / PRACTICE DOCUMENT ONLY<br />
                        Not recorded as a sale.
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

    const styles = `
    .training-bill-backdrop,
    .training-bill-backdrop * {
        box-sizing: border-box;
    }

    .training-bill-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10100;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(15, 23, 42, 0.62);
        backdrop-filter: blur(4px);
    }

    .training-bill-modal {
        width: min(780px, 100%);
        max-height: calc(100dvh - 48px);
        overflow-y: auto;
        background: #ffffff;
        border: 1px solid #d5ded7;
        border-radius: 18px;
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.3);
    }

    .training-bill-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 20px 22px;
        color: #ffffff;
        background: linear-gradient(135deg, #14532d, #15803d);
    }

    .training-bill-header small {
        display: block;
        margin-bottom: 4px;
        color: #bbf7d0;
        font-size: 11px;
        font-weight: 850;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .training-bill-header h2 {
        margin: 0;
        font-size: 24px;
    }

    .training-bill-header span {
        display: block;
        margin-top: 4px;
        color: #dcfce7;
        font-size: 12px;
    }

    .training-bill-close {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        color: #14532d;
        font-size: 23px;
        line-height: 1;
        background: #ffffff;
        border: 0;
        border-radius: 9px;
        cursor: pointer;
    }

    .training-bill-warning {
        margin: 16px 20px 0;
        padding: 12px 14px;
        color: #92400e;
        font-size: 13px;
        font-weight: 800;
        background: #fffbeb;
        border: 1px solid #fde68a;
        border-radius: 10px;
    }

    .training-bill-body {
        display: grid;
        gap: 16px;
        padding: 18px 20px 20px;
    }

    .training-bill-meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    }

    .training-bill-meta-box {
        padding: 10px 11px;
        background: #f8faf9;
        border: 1px solid #e4e7ec;
        border-radius: 9px;
    }

    .training-bill-meta-box span {
        display: block;
        color: #667085;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
    }

    .training-bill-meta-box strong {
        display: block;
        margin-top: 3px;
        color: #101828;
        font-size: 13px;
        word-break: break-word;
    }

    .training-bill-field {
        display: grid;
        gap: 6px;
    }

    .training-bill-field span {
        color: #344054;
        font-size: 12px;
        font-weight: 800;
    }

    .training-bill-input,
    .training-bill-textarea {
        width: 100%;
        color: #101828;
        font: inherit;
        background: #ffffff;
        border: 1px solid #b8c5bb;
        border-radius: 9px;
    }

    .training-bill-input {
        height: 43px;
        padding: 0 11px;
    }

    .training-bill-textarea {
        min-height: 76px;
        padding: 10px 11px;
        resize: vertical;
    }

    .training-bill-table-wrap {
        overflow-x: auto;
        border: 1px solid #e4e7ec;
        border-radius: 10px;
    }

    .training-bill-table {
        width: 100%;
        border-collapse: collapse;
    }

    .training-bill-table th,
    .training-bill-table td {
        padding: 10px 11px;
        text-align: left;
        border-bottom: 1px solid #eef2f0;
    }

    .training-bill-table th {
        color: #475467;
        font-size: 10px;
        font-weight: 850;
        text-transform: uppercase;
        background: #f8faf9;
    }

    .training-bill-table td {
        color: #101828;
        font-size: 13px;
        font-weight: 650;
    }

    .training-bill-table tbody tr:last-child td {
        border-bottom: 0;
    }

    .training-bill-actions {
        display: flex;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 9px;
        padding-top: 2px;
    }

    .training-bill-button {
        min-height: 43px;
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 850;
        border-radius: 9px;
        cursor: pointer;
    }

    .training-bill-button.secondary {
        color: #344054;
        background: #ffffff;
        border: 1px solid #d0d5dd;
    }

    .training-bill-button.print {
        color: #14532d;
        background: #f0fdf4;
        border: 1px solid #86efac;
    }

    .training-bill-button.finish {
        color: #ffffff;
        background: #15803d;
        border: 1px solid #15803d;
    }

    @media (max-width: 620px) {
        .training-bill-backdrop {
            padding: 12px;
        }

        .training-bill-meta {
            grid-template-columns: 1fr;
        }

        .training-bill-actions {
            display: grid;
            grid-template-columns: 1fr;
        }
    }
    `;

    return (
        <div
            className="training-bill-backdrop"
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
                className="training-bill-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Training bill"
            >
                <header className="training-bill-header">
                    <div>
                        <small>
                            Practice Mode
                        </small>

                        <h2>
                            Training Bill
                        </h2>

                        <span>
                            No prices and no real sale transaction
                        </span>
                    </div>

                    <button
                        type="button"
                        className="training-bill-close"
                        aria-label="Close"
                        onClick={
                            onClose
                        }
                    >
                        ×
                    </button>
                </header>

                <div className="training-bill-warning">
                    This document is for training only. Printing or finishing
                    this bill does not reduce stock, create a payment, create
                    customer dues, affect profit, or add a sale to Sales
                    History.
                </div>

                <div className="training-bill-body">
                    <div className="training-bill-meta">
                        <div className="training-bill-meta-box">
                            <span>
                                Training Bill No.
                            </span>

                            <strong>
                                {billNumber}
                            </strong>
                        </div>

                        <div className="training-bill-meta-box">
                            <span>
                                Sri Lanka Time
                            </span>

                            <strong>
                                {dateTimeFormatter.format(
                                    createdAt,
                                )}
                            </strong>
                        </div>
                    </div>

                    <label className="training-bill-field">
                        <span>
                            Customer / Reference (optional)
                        </span>

                        <input
                            type="text"
                            className="training-bill-input"
                            value={
                                customerReference
                            }
                            maxLength={
                                120
                            }
                            placeholder="Customer name or practice reference"
                            onChange={(
                                event,
                            ) => {
                                setCustomerReference(
                                    event
                                        .target
                                        .value,
                                );
                            }}
                        />
                    </label>

                    <div className="training-bill-table-wrap">
                        <table className="training-bill-table">
                            <thead>
                                <tr>
                                    <th>
                                        #
                                    </th>

                                    <th>
                                        Product
                                    </th>

                                    <th>
                                        Quantity
                                    </th>

                                    <th>
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

                                            <td>
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

                    <label className="training-bill-field">
                        <span>
                            Notes (optional)
                        </span>

                        <textarea
                            className="training-bill-textarea"
                            value={
                                notes
                            }
                            maxLength={
                                300
                            }
                            placeholder="Training note"
                            onChange={(
                                event,
                            ) => {
                                setNotes(
                                    event
                                        .target
                                        .value,
                                );
                            }}
                        />
                    </label>

                    <div className="training-bill-actions">
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
                            Print Training Bill
                        </button>

                        <button
                            type="button"
                            className="training-bill-button finish"
                            onClick={
                                onFinish
                            }
                        >
                            Finish & New Training Bill
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
