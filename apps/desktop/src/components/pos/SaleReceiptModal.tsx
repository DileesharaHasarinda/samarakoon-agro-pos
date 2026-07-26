import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    getBusinessSettings,
} from '../../services/businessSettingService';

import {
    defaultBusinessSetting,
} from '../../types/businessSetting';

import type {
    BusinessSetting,
    PrintDocumentType,
} from '../../types/businessSetting';

import type {
    SaleReceipt,
} from '../../types/sale';

interface SaleReceiptModalProps {
    receipt: SaleReceipt | null;
    onClose: () => void;
}

type NumericValue =
    | number
    | string
    | null
    | undefined;

interface PrintableProduct {
    name?: string;
    unit?: string | null;
    sku?: string | null;
    barcode?: string | null;
}

interface PrintableBatch {
    batch_code?: string | null;
    batch_number?: string | null;
}

interface PrintableItem {
    id?: number;
    product_name?: string;
    quantity?: NumericValue;
    selling_price?: NumericValue;
    unit_price?: NumericValue;
    discount?: NumericValue;
    line_total?: NumericValue;
    product?: PrintableProduct;
    batch?: PrintableBatch | null;
    stock_batch?: PrintableBatch | null;
}

interface PrintablePayment {
    id?: number;
    payment_method?: string | null;
    amount?: NumericValue;
    reference_number?: string | null;
    payment_date?: string | null;
    created_at?: string | null;
}

interface PrintableCustomer {
    name?: string;
    mobile?: string | null;
    phone?: string | null;
    address?: string | null;
    customer_code?: string | null;
}

interface PrintableUser {
    name?: string;
    username?: string;
}

interface PrintableSale {
    id?: number;
    sale_number?: string;
    sale_date?: string;
    created_at?: string;

    subtotal?: NumericValue;
    item_discount_total?: NumericValue;
    discount?: NumericValue;
    grand_total?: NumericValue;

    amount_received?: NumericValue;
    paid_amount?: NumericValue;
    due_amount?: NumericValue;
    change_amount?: NumericValue;
    balance?: NumericValue;

    payment_method?: string | null;
    payment_status?: string | null;
    settlement_type?: string | null;
    reference_number?: string | null;
    due_date?: string | null;
    notes?: string | null;

    customer?: PrintableCustomer | null;
    created_by?: PrintableUser;
    cashier?: PrintableUser;

    items?: PrintableItem[];
    payments?: PrintablePayment[];
}

interface DocumentView {
    saleNumber: string;
    saleDate: string;
    cashierName: string;
    customerName: string;
    customerPhone: string | null;
    customerAddress: string | null;

    items: PrintableItem[];
    payments: PrintablePayment[];

    subtotal: number;
    itemDiscount: number;
    saleDiscount: number;
    totalDiscount: number;
    grandTotal: number;
    paidAmount: number;
    dueAmount: number;
    changeAmount: number;

    paymentMethod: string;
    paymentStatus: string;
    paymentReference: string | null;
    dueDate: string | null;
    notes: string | null;
}

function numberValue(
    value: NumericValue,
    fallback = 0,
): number {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}

function formatQuantity(
    value: NumericValue,
): string {
    const quantity =
        numberValue(value);

    return new Intl.NumberFormat(
        'en-GB',
        {
            maximumFractionDigits: 3,
        },
    ).format(quantity);
}

function formatDateTime(
    value: string | null | undefined,
): string {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        },
    ).format(date);
}

function formatDate(
    value: string | null | undefined,
): string {
    if (!value) {
        return 'Not provided';
    }

    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    ).format(date);
}

function paymentMethodName(
    method: string | null | undefined,
): string {
    switch (method) {
        case 'cash':
            return 'Cash';

        case 'card':
            return 'Card';

        case 'bank_transfer':
            return 'Bank Transfer';

        case 'cheque':
            return 'Cheque';

        case 'credit':
            return 'Credit';

        default:
            return 'Not Specified';
    }
}

function paymentStatusName(
    status: string | null | undefined,
): string {
    switch (status) {
        case 'paid':
            return 'Paid';

        case 'partial':
            return 'Partially Paid';

        case 'due':
            return 'Due';

        default:
            return 'Completed';
    }
}

function itemUnitPrice(
    item: PrintableItem,
): number {
    return numberValue(
        item.selling_price
        ?? item.unit_price,
    );
}

function itemLineTotal(
    item: PrintableItem,
): number {
    const calculated =
        itemUnitPrice(item)
        * numberValue(
            item.quantity,
        )
        - numberValue(
            item.discount,
        );

    return numberValue(
        item.line_total,
        calculated,
    );
}

function itemName(
    item: PrintableItem,
): string {
    return item.product?.name
        ?? item.product_name
        ?? 'Product';
}

function itemBatchNumber(
    item: PrintableItem,
): string | null {
    const batch =
        item.batch
        ?? item.stock_batch;

    return batch?.batch_number
        ?? batch?.batch_code
        ?? null;
}

function createCurrencyFormatter(
    currencyCode: string,
): Intl.NumberFormat {
    try {
        return new Intl.NumberFormat(
            'en-GB',
            {
                style: 'currency',
                currency:
                    currencyCode,
                minimumFractionDigits: 2,
            },
        );
    } catch {
        return new Intl.NumberFormat(
            'en-GB',
            {
                style: 'currency',
                currency: 'LKR',
                minimumFractionDigits: 2,
            },
        );
    }
}

function createDocumentView(
    sale: PrintableSale,
): DocumentView {
    const items =
        sale.items ?? [];

    const payments =
        sale.payments ?? [];

    const calculatedSubtotal =
        items.reduce(
            (
                total,
                item,
            ) =>
                total
                + itemUnitPrice(item)
                * numberValue(
                    item.quantity,
                ),
            0,
        );

    const calculatedItemDiscount =
        items.reduce(
            (
                total,
                item,
            ) =>
                total
                + numberValue(
                    item.discount,
                ),
            0,
        );

    const subtotal =
        numberValue(
            sale.subtotal,
            calculatedSubtotal,
        );

    const itemDiscount =
        numberValue(
            sale.item_discount_total,
            calculatedItemDiscount,
        );

    const saleDiscount =
        numberValue(
            sale.discount,
        );

    const grandTotal =
        numberValue(
            sale.grand_total,
            Math.max(
                0,
                subtotal
                - itemDiscount
                - saleDiscount,
            ),
        );

    const paymentTotal =
        payments.reduce(
            (
                total,
                payment,
            ) =>
                total
                + numberValue(
                    payment.amount,
                ),
            0,
        );

    const paidAmount =
        numberValue(
            sale.paid_amount,
            paymentTotal,
        );

    const dueAmount =
        numberValue(
            sale.due_amount,
            Math.max(
                0,
                grandTotal
                - paidAmount,
            ),
        );

    const amountReceived =
        numberValue(
            sale.amount_received,
            paidAmount,
        );

    const changeAmount =
        numberValue(
            sale.change_amount
            ?? sale.balance,
            Math.max(
                0,
                amountReceived
                - grandTotal,
            ),
        );

    const firstPayment =
        payments[0];

    return {
        saleNumber:
            sale.sale_number
            ?? `SALE-${sale.id ?? ''}`,

        saleDate:
            sale.sale_date
            ?? sale.created_at
            ?? '',

        cashierName:
            sale.created_by?.name
            ?? sale.cashier?.name
            ?? 'Cashier',

        customerName:
            sale.customer?.name
            ?? 'Walk-in Customer',

        customerPhone:
            sale.customer?.mobile
            ?? sale.customer?.phone
            ?? null,

        customerAddress:
            sale.customer?.address
            ?? null,

        items,
        payments,

        subtotal,
        itemDiscount,
        saleDiscount,

        totalDiscount:
            itemDiscount
            + saleDiscount,

        grandTotal,
        paidAmount,
        dueAmount,
        changeAmount,

        paymentMethod:
            paymentMethodName(
                sale.payment_method
                ?? firstPayment
                    ?.payment_method,
            ),

        paymentStatus:
            paymentStatusName(
                sale.payment_status
                ?? sale.settlement_type,
            ),

        paymentReference:
            sale.reference_number
            ?? firstPayment
                ?.reference_number
            ?? null,

        dueDate:
            sale.due_date
            ?? null,

        notes:
            sale.notes
            ?? null,
    };
}

interface ThermalReceiptProps {
    settings: BusinessSetting;
    document: DocumentView;
    currencyFormatter:
    Intl.NumberFormat;
    copyIndex: number;
}

function ThermalReceipt({
    settings,
    document,
    currencyFormatter,
    copyIndex,
}: ThermalReceiptProps) {
    const paperClass =
        settings
            .receipt_paper_size
            === '58mm'
            ? 'print-paper-58mm'
            : 'print-paper-80mm';

    const currency = (
        value: number,
    ): string =>
        currencyFormatter.format(
            value,
        );

    return (
        <article
            className={`
                document-copy
                print-document-receipt
                ${paperClass}
            `}
        >
            {copyIndex > 0
                && settings
                    .print_duplicate_label && (
                    <div className="thermal-copy-label">
                        DUPLICATE COPY
                    </div>
                )}

            <header className="thermal-document-header">
                {settings
                    .show_logo_on_receipt
                    && settings
                        .logo_data_url && (
                        <img
                            className="thermal-business-logo"
                            src={
                                settings
                                    .logo_data_url
                            }
                            alt=""
                        />
                    )}

                <h2>
                    {settings.business_name}
                </h2>

                {settings
                    .show_business_address
                    && settings.address && (
                        <p>
                            {settings.address}
                        </p>
                    )}

                {settings.phone && (
                    <p>
                        Tel: {settings.phone}
                    </p>
                )}

                {settings
                    .secondary_phone && (
                        <p>
                            {
                                settings
                                    .secondary_phone
                            }
                        </p>
                    )}

                {settings.email && (
                    <p>
                        {settings.email}
                    </p>
                )}

                {settings
                    .registration_number && (
                        <p>
                            Reg No:{' '}
                            {
                                settings
                                    .registration_number
                            }
                        </p>
                    )}

                {settings.tax_number && (
                    <p>
                        Tax No:{' '}
                        {settings.tax_number}
                    </p>
                )}

                <strong>
                    {settings.receipt_title}
                </strong>
            </header>

            <div className="thermal-divider" />

            <section className="thermal-meta-list">
                <div>
                    <span>Sale:</span>

                    <strong>
                        {
                            document
                                .saleNumber
                        }
                    </strong>
                </div>

                <div>
                    <span>Date:</span>

                    <strong>
                        {formatDateTime(
                            document
                                .saleDate,
                        )}
                    </strong>
                </div>

                {settings
                    .show_cashier_name && (
                        <div>
                            <span>
                                Cashier:
                            </span>

                            <strong>
                                {
                                    document
                                        .cashierName
                                }
                            </strong>
                        </div>
                    )}

                {settings
                    .show_customer_details && (
                        <>
                            <div>
                                <span>
                                    Customer:
                                </span>

                                <strong>
                                    {
                                        document
                                            .customerName
                                    }
                                </strong>
                            </div>

                            {document
                                .customerPhone && (
                                    <div>
                                        <span>
                                            Mobile:
                                        </span>

                                        <strong>
                                            {
                                                document
                                                    .customerPhone
                                            }
                                        </strong>
                                    </div>
                                )}
                        </>
                    )}
            </section>

            <div className="thermal-divider" />

            <section className="thermal-item-list">
                {document.items.map(
                    (
                        item,
                        index,
                    ) => (
                        <article
                            key={
                                item.id
                                ?? `${itemName(
                                    item,
                                )}-${index}`
                            }
                        >
                            <strong>
                                {itemName(
                                    item,
                                )}
                            </strong>

                            {settings.show_sku
                                && item
                                    .product
                                    ?.sku && (
                                    <small>
                                        SKU:{' '}
                                        {
                                            item
                                                .product
                                                .sku
                                        }
                                    </small>
                                )}

                            {settings
                                .show_batch_number
                                && itemBatchNumber(
                                    item,
                                ) && (
                                    <small>
                                        Batch:{' '}
                                        {
                                            itemBatchNumber(
                                                item,
                                            )
                                        }
                                    </small>
                                )}

                            <div>
                                <span>
                                    {formatQuantity(
                                        item.quantity,
                                    )}
                                    {' '}×{' '}
                                    {currency(
                                        itemUnitPrice(
                                            item,
                                        ),
                                    )}
                                </span>

                                <strong>
                                    {currency(
                                        itemLineTotal(
                                            item,
                                        ),
                                    )}
                                </strong>
                            </div>

                            {numberValue(
                                item.discount,
                            ) > 0 && (
                                    <small>
                                        Discount:{' '}
                                        -{currency(
                                            numberValue(
                                                item.discount,
                                            ),
                                        )}
                                    </small>
                                )}
                        </article>
                    ),
                )}
            </section>

            <div className="thermal-divider" />

            <section className="thermal-total-list">
                <div>
                    <span>Subtotal</span>

                    <strong>
                        {currency(
                            document.subtotal,
                        )}
                    </strong>
                </div>

                {document
                    .totalDiscount > 0 && (
                        <div>
                            <span>
                                Discount
                            </span>

                            <strong>
                                -{currency(
                                    document
                                        .totalDiscount,
                                )}
                            </strong>
                        </div>
                    )}

                <div className="thermal-grand-total">
                    <span>
                        Grand Total
                    </span>

                    <strong>
                        {currency(
                            document
                                .grandTotal,
                        )}
                    </strong>
                </div>

                <div>
                    <span>Paid</span>

                    <strong>
                        {currency(
                            document
                                .paidAmount,
                        )}
                    </strong>
                </div>

                {document.dueAmount > 0 && (
                    <div className="thermal-due-total">
                        <span>Due</span>

                        <strong>
                            {currency(
                                document
                                    .dueAmount,
                            )}
                        </strong>
                    </div>
                )}

                {document
                    .changeAmount > 0 && (
                        <div>
                            <span>Change</span>

                            <strong>
                                {currency(
                                    document
                                        .changeAmount,
                                )}
                            </strong>
                        </div>
                    )}
            </section>

            <div className="thermal-divider" />

            <section className="thermal-payment-list">
                <div>
                    <span>Status:</span>

                    <strong>
                        {
                            document
                                .paymentStatus
                        }
                    </strong>
                </div>

                <div>
                    <span>Payment:</span>

                    <strong>
                        {
                            document
                                .paymentMethod
                        }
                    </strong>
                </div>

                {settings
                    .show_payment_reference
                    && document
                        .paymentReference && (
                        <div>
                            <span>
                                Reference:
                            </span>

                            <strong>
                                {
                                    document
                                        .paymentReference
                                }
                            </strong>
                        </div>
                    )}

                {settings.show_due_date
                    && document.dueAmount > 0
                    && document.dueDate && (
                        <div>
                            <span>
                                Due Date:
                            </span>

                            <strong>
                                {formatDate(
                                    document
                                        .dueDate,
                                )}
                            </strong>
                        </div>
                    )}
            </section>

            {document.notes && (
                <section className="thermal-notes">
                    <strong>Notes</strong>

                    <p>
                        {document.notes}
                    </p>
                </section>
            )}

            {settings.receipt_footer && (
                <footer className="thermal-document-footer">
                    {settings.receipt_footer}
                </footer>
            )}
        </article>
    );
}

interface A4InvoiceProps {
    settings: BusinessSetting;
    document: DocumentView;
    currencyFormatter:
    Intl.NumberFormat;
}

function A4Invoice({
    settings,
    document,
    currencyFormatter,
}: A4InvoiceProps) {
    const currency = (
        value: number,
    ): string =>
        currencyFormatter.format(
            value,
        );

    return (
        <article className="print-document-invoice">
            <header className="invoice-document-header">
                <div className="invoice-business-information">
                    {settings
                        .logo_data_url && (
                            <img
                                className="invoice-business-logo"
                                src={
                                    settings
                                        .logo_data_url
                                }
                                alt=""
                            />
                        )}

                    <h2>
                        {settings.business_name}
                    </h2>

                    {settings
                        .show_business_address
                        && settings.address && (
                            <p>
                                {settings.address}
                            </p>
                        )}

                    {settings.phone && (
                        <p>
                            Tel: {settings.phone}
                        </p>
                    )}

                    {settings
                        .secondary_phone && (
                            <p>
                                {
                                    settings
                                        .secondary_phone
                                }
                            </p>
                        )}

                    {settings.email && (
                        <p>
                            {settings.email}
                        </p>
                    )}

                    {settings.website && (
                        <p>
                            {settings.website}
                        </p>
                    )}

                    {settings
                        .registration_number && (
                            <p>
                                Registration:{' '}
                                {
                                    settings
                                        .registration_number
                                }
                            </p>
                        )}

                    {settings.tax_number && (
                        <p>
                            Tax Number:{' '}
                            {
                                settings
                                    .tax_number
                            }
                        </p>
                    )}
                </div>

                <div className="invoice-document-title">
                    <h1>
                        {settings.invoice_title}
                    </h1>

                    <strong>
                        {
                            document
                                .saleNumber
                        }
                    </strong>

                    <span>
                        {formatDateTime(
                            document
                                .saleDate,
                        )}
                    </span>
                </div>
            </header>

            <section className="invoice-information-grid">
                <div>
                    <span>Bill To</span>

                    <strong>
                        {
                            document
                                .customerName
                        }
                    </strong>

                    {document
                        .customerPhone && (
                            <p>
                                {
                                    document
                                        .customerPhone
                                }
                            </p>
                        )}

                    {document
                        .customerAddress && (
                            <p>
                                {
                                    document
                                        .customerAddress
                                }
                            </p>
                        )}
                </div>

                <div>
                    <span>
                        Payment Status
                    </span>

                    <strong>
                        {
                            document
                                .paymentStatus
                        }
                    </strong>

                    <p>
                        {
                            document
                                .paymentMethod
                        }
                    </p>
                </div>

                {settings
                    .show_cashier_name && (
                        <div>
                            <span>
                                Prepared By
                            </span>

                            <strong>
                                {
                                    document
                                        .cashierName
                                }
                            </strong>
                        </div>
                    )}
            </section>

            <table className="invoice-document-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Discount</th>
                        <th>Amount</th>
                    </tr>
                </thead>

                <tbody>
                    {document.items.map(
                        (
                            item,
                            index,
                        ) => (
                            <tr
                                key={
                                    item.id
                                    ?? `${itemName(
                                        item,
                                    )}-${index}`
                                }
                            >
                                <td>
                                    {index + 1}
                                </td>

                                <td>
                                    <strong>
                                        {itemName(
                                            item,
                                        )}
                                    </strong>

                                    <div className="invoice-item-meta">
                                        {settings.show_sku
                                            && item
                                                .product
                                                ?.sku && (
                                                <small>
                                                    SKU:{' '}
                                                    {
                                                        item
                                                            .product
                                                            .sku
                                                    }
                                                </small>
                                            )}

                                        {settings
                                            .show_batch_number
                                            && itemBatchNumber(
                                                item,
                                            ) && (
                                                <small>
                                                    Batch:{' '}
                                                    {
                                                        itemBatchNumber(
                                                            item,
                                                        )
                                                    }
                                                </small>
                                            )}
                                    </div>
                                </td>

                                <td>
                                    {formatQuantity(
                                        item.quantity,
                                    )}

                                    {item
                                        .product
                                        ?.unit
                                        ? ` ${item.product.unit}`
                                        : ''}
                                </td>

                                <td>
                                    {currency(
                                        itemUnitPrice(
                                            item,
                                        ),
                                    )}
                                </td>

                                <td>
                                    {currency(
                                        numberValue(
                                            item.discount,
                                        ),
                                    )}
                                </td>

                                <td>
                                    {currency(
                                        itemLineTotal(
                                            item,
                                        ),
                                    )}
                                </td>
                            </tr>
                        ),
                    )}
                </tbody>
            </table>

            <section className="invoice-bottom-grid">
                <div className="invoice-payment-information">
                    <h3>
                        Payment Information
                    </h3>

                    <p>
                        Method:{' '}
                        <strong>
                            {
                                document
                                    .paymentMethod
                            }
                        </strong>
                    </p>

                    <p>
                        Paid:{' '}
                        <strong>
                            {currency(
                                document
                                    .paidAmount,
                            )}
                        </strong>
                    </p>

                    <p>
                        Outstanding:{' '}
                        <strong>
                            {currency(
                                document
                                    .dueAmount,
                            )}
                        </strong>
                    </p>

                    {settings
                        .show_payment_reference
                        && document
                            .paymentReference && (
                            <p>
                                Reference:{' '}
                                <strong>
                                    {
                                        document
                                            .paymentReference
                                    }
                                </strong>
                            </p>
                        )}

                    {settings.show_due_date
                        && document
                            .dueAmount > 0
                        && document
                            .dueDate && (
                            <p>
                                Due Date:{' '}
                                <strong>
                                    {formatDate(
                                        document
                                            .dueDate,
                                    )}
                                </strong>
                            </p>
                        )}

                    {document.notes && (
                        <div className="invoice-notes">
                            <span>Notes</span>

                            <p>
                                {document.notes}
                            </p>
                        </div>
                    )}
                </div>

                <div className="invoice-total-panel">
                    <div>
                        <span>Subtotal</span>

                        <strong>
                            {currency(
                                document
                                    .subtotal,
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Item Discount
                        </span>

                        <strong>
                            -{currency(
                                document
                                    .itemDiscount,
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Sale Discount
                        </span>

                        <strong>
                            -{currency(
                                document
                                    .saleDiscount,
                            )}
                        </strong>
                    </div>

                    <div className="invoice-grand-total">
                        <span>
                            Grand Total
                        </span>

                        <strong>
                            {currency(
                                document
                                    .grandTotal,
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Paid Amount
                        </span>

                        <strong>
                            {currency(
                                document
                                    .paidAmount,
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Balance Due
                        </span>

                        <strong>
                            {currency(
                                document
                                    .dueAmount,
                            )}
                        </strong>
                    </div>
                </div>
            </section>

            {settings.invoice_footer && (
                <footer className="invoice-document-footer">
                    {settings.invoice_footer}
                </footer>
            )}
        </article>
    );
}

export default function SaleReceiptModal({
    receipt,
    onClose,
}: SaleReceiptModalProps) {
    const {
        token,
    } = useAuth();

    const [
        settings,
        setSettings,
    ] = useState<BusinessSetting>(
        defaultBusinessSetting,
    );

    const [
        documentType,
        setDocumentType,
    ] = useState<PrintDocumentType>(
        defaultBusinessSetting
            .default_print_document,
    );

    const [
        isLoadingSettings,
        setIsLoadingSettings,
    ] = useState(false);

    const [
        settingsWarning,
        setSettingsWarning,
    ] = useState('');

    const autoPrintedReceipt =
        useRef<SaleReceipt | null>(
            null,
        );

    const printableSale =
        receipt as unknown as
        PrintableSale | null;

    const document =
        useMemo(
            () =>
                printableSale
                    ? createDocumentView(
                        printableSale,
                    )
                    : null,
            [printableSale],
        );

    const currencyFormatter =
        useMemo(
            () =>
                createCurrencyFormatter(
                    settings.currency_code,
                ),
            [
                settings
                    .currency_code,
            ],
        );

    useEffect(() => {
        if (
            !receipt
            || !token
        ) {
            return;
        }

        let cancelled = false;

        const load =
            async (): Promise<void> => {
                setIsLoadingSettings(true);
                setSettingsWarning('');

                try {
                    const response =
                        await getBusinessSettings(
                            token,
                        );

                    if (cancelled) {
                        return;
                    }

                    setSettings(
                        response.data,
                    );

                    setDocumentType(
                        response
                            .data
                            .default_print_document,
                    );
                } catch {
                    if (cancelled) {
                        return;
                    }

                    setSettings(
                        defaultBusinessSetting,
                    );

                    setSettingsWarning(
                        'Business settings could not be loaded. Default printing settings are being used.',
                    );
                } finally {
                    if (!cancelled) {
                        setIsLoadingSettings(
                            false,
                        );
                    }
                }
            };

        void load();

        return () => {
            cancelled = true;
        };
    }, [
        receipt,
        token,
    ]);

    useEffect(() => {
        if (!receipt) {
            autoPrintedReceipt
                .current = null;

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
        receipt,
        onClose,
    ]);

    useEffect(() => {
        if (
            !receipt
            || isLoadingSettings
            || !settings
                .auto_print_after_sale
            || autoPrintedReceipt
                .current === receipt
        ) {
            return;
        }

        autoPrintedReceipt.current =
            receipt;

        const timeout =
            window.setTimeout(
                () => {
                    window.print();
                },
                350,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [
        receipt,
        isLoadingSettings,
        settings.auto_print_after_sale,
    ]);

    if (
        !receipt
        || !document
    ) {
        return null;
    }

    const receiptCopies =
        documentType === 'receipt'
            ? Math.max(
                1,
                Math.min(
                    3,
                    settings.receipt_copies,
                ),
            )
            : 1;

    return (
        <div className="modal-backdrop receipt-document-backdrop">
            <section
                className="receipt-document-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Sale receipt and invoice"
            >
                <header className="receipt-document-modal-header">
                    <div>
                        <span className="page-kicker">
                            Completed sale
                        </span>

                        <h2>
                            {document.saleNumber}
                        </h2>

                        <p>
                            Print a thermal receipt
                            or an A4 invoice.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="modal-close-button"
                        aria-label="Close receipt"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="receipt-document-toolbar">
                    <div className="receipt-document-type-buttons">
                        <button
                            type="button"
                            className={
                                documentType
                                    === 'receipt'
                                    ? 'settings-preview-button active'
                                    : 'settings-preview-button'
                            }
                            onClick={() => {
                                setDocumentType(
                                    'receipt',
                                );
                            }}
                        >
                            Thermal Receipt
                        </button>

                        <button
                            type="button"
                            className={
                                documentType
                                    === 'invoice'
                                    ? 'settings-preview-button active'
                                    : 'settings-preview-button'
                            }
                            onClick={() => {
                                setDocumentType(
                                    'invoice',
                                );
                            }}
                        >
                            A4 Invoice
                        </button>
                    </div>

                    <div className="receipt-document-format">
                        {documentType === 'receipt'
                            ? `${settings.receipt_paper_size} · ${receiptCopies} ${receiptCopies === 1
                                ? 'copy'
                                : 'copies'}`
                            : 'A4 document'}
                    </div>
                </div>

                {settingsWarning && (
                    <div className="printer-information-banner receipt-settings-warning">
                        {settingsWarning}
                    </div>
                )}

                <div className="receipt-document-preview">
                    <div
                        className={`
                            document-print-area
                            ${documentType
                                === 'invoice'
                                ? 'document-print-area-invoice'
                                : 'document-print-area-receipt'
                            }
                        `}
                    >
                        {documentType
                            === 'receipt' ? (
                            Array.from(
                                {
                                    length:
                                        receiptCopies,
                                },
                                (
                                    _,
                                    copyIndex,
                                ) => (
                                    <ThermalReceipt
                                        key={
                                            copyIndex
                                        }
                                        settings={
                                            settings
                                        }
                                        document={
                                            document
                                        }
                                        currencyFormatter={
                                            currencyFormatter
                                        }
                                        copyIndex={
                                            copyIndex
                                        }
                                    />
                                ),
                            )
                        ) : (
                            <A4Invoice
                                settings={
                                    settings
                                }
                                document={
                                    document
                                }
                                currencyFormatter={
                                    currencyFormatter
                                }
                            />
                        )}
                    </div>
                </div>

                <footer className="receipt-document-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onClose}
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        className="primary-button"
                        disabled={
                            isLoadingSettings
                        }
                        onClick={() => {
                            window.print();
                        }}
                    >
                        {isLoadingSettings
                            ? 'Loading Settings...'
                            : documentType
                                === 'receipt'
                                ? 'Print Receipt'
                                : 'Print Invoice'}
                    </button>
                </footer>
            </section>
        </div>
    );
}