import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    getBusinessSettings,
    updateBusinessSettings,
} from '../../services/businessSettingService';

import {
    defaultBusinessSetting,
} from '../../types/businessSetting';

import type {
    BusinessSetting,
    BusinessSettingInput,
    PrintDocumentType,
    ReceiptPaperSize,
} from '../../types/businessSetting';

type SettingsTab =
    | 'business'
    | 'printing';

const sampleItems = [
    {
        name: 'Organic Fertilizer 10 kg',
        sku: 'FERT-001',
        quantity: 2,
        unitPrice: 2850,
        total: 5700,
    },
    {
        name: 'Vegetable Seeds Packet',
        sku: 'SEED-014',
        quantity: 3,
        unitPrice: 450,
        total: 1350,
    },
];

function toInput(
    settings: BusinessSetting,
): BusinessSettingInput {
    const {
        id: _id,
        updated_at: _updatedAt,
        updated_by: _updatedBy,
        ...input
    } = settings;

    return input;
}

function parsePaperSize(
    value: string,
): ReceiptPaperSize {
    return value === '58mm'
        ? '58mm'
        : '80mm';
}

function parseDocumentType(
    value: string,
): PrintDocumentType {
    return value === 'invoice'
        ? 'invoice'
        : 'receipt';
}

function formatCurrency(
    value: number,
    currencyCode: string,
): string {
    try {
        return new Intl.NumberFormat(
            'en-GB',
            {
                style: 'currency',
                currency:
                    currencyCode,
                minimumFractionDigits: 2,
            },
        ).format(value);
    } catch {
        return new Intl.NumberFormat(
            'en-GB',
            {
                style: 'currency',
                currency: 'LKR',
                minimumFractionDigits: 2,
            },
        ).format(value);
    }
}

interface SettingsPreviewProps {
    values: BusinessSettingInput;
    documentType: PrintDocumentType;
}

function SettingsPreview({
    values,
    documentType,
}: SettingsPreviewProps) {
    const subtotal = 7050;
    const discount = 250;
    const grandTotal = 6800;
    const paidAmount = 5000;
    const dueAmount = 1800;

    const currency = (
        value: number,
    ): string => formatCurrency(
        value,
        values.currency_code,
    );

    if (
        documentType
        === 'invoice'
    ) {
        return (
            <article
                className="
                    settings-preview-paper
                    settings-invoice-preview
                    document-print-area
                    print-document-invoice
                "
            >
                <header className="invoice-document-header">
                    <div>
                        {values.logo_data_url && (
                            <img
                                className="invoice-business-logo"
                                src={values.logo_data_url}
                                alt="Business logo"
                            />
                        )}

                        <h2>
                            {values.business_name}
                        </h2>

                        {values
                            .show_business_address
                            && values.address && (
                                <p>
                                    {values.address}
                                </p>
                            )}

                        {values.phone && (
                            <p>
                                Tel: {values.phone}
                            </p>
                        )}

                        {values.email && (
                            <p>
                                {values.email}
                            </p>
                        )}
                    </div>

                    <div className="invoice-document-title">
                        <h1>
                            {values.invoice_title}
                        </h1>

                        <strong>
                            SALE-20260726-000001
                        </strong>

                        <span>
                            26 Jul 2026, 02:30 PM
                        </span>
                    </div>
                </header>

                <section className="invoice-information-grid">
                    <div>
                        <span>Bill To</span>
                        <strong>
                            Sample Customer
                        </strong>
                        <p>
                            071 234 5678
                        </p>
                    </div>

                    <div>
                        <span>Payment</span>
                        <strong>
                            Partial Payment
                        </strong>
                        <p>
                            Cash
                        </p>
                    </div>

                    <div>
                        <span>Cashier</span>
                        <strong>
                            Administrator
                        </strong>
                    </div>
                </section>

                <table className="invoice-document-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>

                    <tbody>
                        {sampleItems.map(
                            (item) => (
                                <tr key={item.sku}>
                                    <td>
                                        <strong>
                                            {item.name}
                                        </strong>

                                        {values.show_sku && (
                                            <small>
                                                SKU: {item.sku}
                                            </small>
                                        )}
                                    </td>

                                    <td>
                                        {item.quantity}
                                    </td>

                                    <td>
                                        {currency(
                                            item.unitPrice,
                                        )}
                                    </td>

                                    <td>
                                        {currency(
                                            item.total,
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
                            Paid: {currency(
                                paidAmount,
                            )}
                        </p>

                        <p>
                            Due: {currency(
                                dueAmount,
                            )}
                        </p>

                        {values.show_due_date && (
                            <p>
                                Due Date:
                                {' '}25 Aug 2026
                            </p>
                        )}
                    </div>

                    <div className="invoice-total-panel">
                        <div>
                            <span>Subtotal</span>
                            <strong>
                                {currency(
                                    subtotal,
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Discount</span>
                            <strong>
                                - {currency(
                                    discount,
                                )}
                            </strong>
                        </div>

                        <div className="invoice-grand-total">
                            <span>Grand Total</span>
                            <strong>
                                {currency(
                                    grandTotal,
                                )}
                            </strong>
                        </div>
                    </div>
                </section>

                {values.invoice_footer && (
                    <footer className="invoice-document-footer">
                        {values.invoice_footer}
                    </footer>
                )}
            </article>
        );
    }

    const paperClass =
        values.receipt_paper_size
            === '58mm'
            ? 'print-paper-58mm'
            : 'print-paper-80mm';

    return (
        <article
            className={`
                settings-preview-paper
                document-print-area
                print-document-receipt
                ${paperClass}
            `}
        >
            <header className="thermal-document-header">
                {values.logo_data_url
                    && values
                        .show_logo_on_receipt && (
                        <img
                            className="thermal-business-logo"
                            src={values.logo_data_url}
                            alt="Business logo"
                        />
                    )}

                <h2>
                    {values.business_name}
                </h2>

                {values
                    .show_business_address
                    && values.address && (
                        <p>
                            {values.address}
                        </p>
                    )}

                {values.phone && (
                    <p>
                        Tel: {values.phone}
                    </p>
                )}

                <strong>
                    {values.receipt_title}
                </strong>
            </header>

            <div className="thermal-divider" />

            <section className="thermal-meta-list">
                <div>
                    <span>Sale:</span>
                    <strong>
                        SALE-20260726-000001
                    </strong>
                </div>

                <div>
                    <span>Date:</span>
                    <strong>
                        26 Jul 2026 02:30 PM
                    </strong>
                </div>

                {values.show_cashier_name && (
                    <div>
                        <span>Cashier:</span>
                        <strong>
                            Administrator
                        </strong>
                    </div>
                )}

                {values.show_customer_details && (
                    <div>
                        <span>Customer:</span>
                        <strong>
                            Sample Customer
                        </strong>
                    </div>
                )}
            </section>

            <div className="thermal-divider" />

            <section className="thermal-item-list">
                {sampleItems.map(
                    (item) => (
                        <article key={item.sku}>
                            <strong>
                                {item.name}
                            </strong>

                            {values.show_sku && (
                                <small>
                                    SKU: {item.sku}
                                </small>
                            )}

                            <div>
                                <span>
                                    {item.quantity}
                                    {' '}×{' '}
                                    {currency(
                                        item.unitPrice,
                                    )}
                                </span>

                                <strong>
                                    {currency(
                                        item.total,
                                    )}
                                </strong>
                            </div>
                        </article>
                    ),
                )}
            </section>

            <div className="thermal-divider" />

            <section className="thermal-total-list">
                <div>
                    <span>Subtotal</span>
                    <strong>
                        {currency(subtotal)}
                    </strong>
                </div>

                <div>
                    <span>Discount</span>
                    <strong>
                        - {currency(discount)}
                    </strong>
                </div>

                <div className="thermal-grand-total">
                    <span>Total</span>
                    <strong>
                        {currency(grandTotal)}
                    </strong>
                </div>

                <div>
                    <span>Paid</span>
                    <strong>
                        {currency(paidAmount)}
                    </strong>
                </div>

                <div>
                    <span>Due</span>
                    <strong>
                        {currency(dueAmount)}
                    </strong>
                </div>
            </section>

            <div className="thermal-divider" />

            <section className="thermal-payment-list">
                <div>
                    <span>Payment:</span>
                    <strong>Cash</strong>
                </div>

                {values
                    .show_payment_reference && (
                        <div>
                            <span>Reference:</span>
                            <strong>
                                SAMPLE-001
                            </strong>
                        </div>
                    )}

                {values.show_due_date && (
                    <div>
                        <span>Due Date:</span>
                        <strong>
                            25 Aug 2026
                        </strong>
                    </div>
                )}
            </section>

            {values.receipt_footer && (
                <footer className="thermal-document-footer">
                    {values.receipt_footer}
                </footer>
            )}
        </article>
    );
}

export default function SettingsPage() {
    const {
        token,
    } = useAuth();

    const [
        activeTab,
        setActiveTab,
    ] = useState<SettingsTab>(
        'business',
    );

    const [
        values,
        setValues,
    ] = useState<BusinessSettingInput>(
        toInput(
            defaultBusinessSetting,
        ),
    );

    const [
        savedSettings,
        setSavedSettings,
    ] = useState<BusinessSetting>(
        defaultBusinessSetting,
    );

    const [
        previewDocument,
        setPreviewDocument,
    ] = useState<PrintDocumentType>(
        'receipt',
    );

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSaving,
        setIsSaving,
    ] = useState(false);

    const [
        pageError,
        setPageError,
    ] = useState('');

    const [
        formError,
        setFormError,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const loadSettings =
        useCallback(
            async (): Promise<void> => {
                if (!token) {
                    return;
                }

                setIsLoading(true);
                setPageError('');

                try {
                    const response =
                        await getBusinessSettings(
                            token,
                        );

                    setSavedSettings(
                        response.data,
                    );

                    setValues(
                        toInput(
                            response.data,
                        ),
                    );

                    setPreviewDocument(
                        response
                            .data
                            .default_print_document,
                    );
                } catch (error) {
                    setPageError(
                        error instanceof ApiError
                            ? error.message
                            : 'Unable to load business settings.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [token],
        );

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    function setField<
        K extends keyof BusinessSettingInput,
    >(
        key: K,
        value: BusinessSettingInput[K],
    ): void {
        setValues(
            (current) => ({
                ...current,
                [key]: value,
            }),
        );

        setFormError('');
        setSuccessMessage('');
    }

    const hasUnsavedChanges =
        useMemo(
            () =>
                JSON.stringify(values)
                !== JSON.stringify(
                    toInput(
                        savedSettings,
                    ),
                ),
            [
                values,
                savedSettings,
            ],
        );

    const handleLogoSelection = (
        event:
            ChangeEvent<HTMLInputElement>,
    ): void => {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        const allowedTypes = [
            'image/png',
            'image/jpeg',
            'image/webp',
        ];

        if (
            !allowedTypes.includes(
                file.type,
            )
        ) {
            setFormError(
                'Select a PNG, JPEG or WebP logo.',
            );

            event.target.value = '';

            return;
        }

        if (
            file.size
            > 1024 * 1024
        ) {
            setFormError(
                'The logo must be smaller than 1 MB.',
            );

            event.target.value = '';

            return;
        }

        const reader =
            new FileReader();

        reader.onload = (): void => {
            if (
                typeof reader.result
                === 'string'
            ) {
                setField(
                    'logo_data_url',
                    reader.result,
                );
            }
        };

        reader.onerror = (): void => {
            setFormError(
                'Unable to read the selected logo.',
            );
        };

        reader.readAsDataURL(file);
    };

    const validateForm = (): boolean => {
        if (
            !values
                .business_name
                .trim()
        ) {
            setActiveTab('business');

            setFormError(
                'Business name is required.',
            );

            return false;
        }

        if (
            !values
                .receipt_title
                .trim()
        ) {
            setActiveTab('printing');

            setFormError(
                'Receipt title is required.',
            );

            return false;
        }

        if (
            !values
                .invoice_title
                .trim()
        ) {
            setActiveTab('printing');

            setFormError(
                'Invoice title is required.',
            );

            return false;
        }

        if (
            !/^[A-Z]{3}$/.test(
                values.currency_code,
            )
        ) {
            setActiveTab('business');

            setFormError(
                'Currency code must contain three uppercase letters.',
            );

            return false;
        }

        return true;
    };

    const handleSubmit = async (
        event:
            FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        if (
            !token
            || isSaving
            || !validateForm()
        ) {
            return;
        }

        setIsSaving(true);
        setFormError('');
        setSuccessMessage('');

        try {
            const response =
                await updateBusinessSettings(
                    token,
                    {
                        ...values,

                        business_name:
                            values
                                .business_name
                                .trim(),

                        business_short_name:
                            values
                                .business_short_name
                                ?.trim()
                            || null,

                        currency_code:
                            values
                                .currency_code
                                .trim()
                                .toUpperCase(),

                        receipt_title:
                            values
                                .receipt_title
                                .trim(),

                        invoice_title:
                            values
                                .invoice_title
                                .trim(),
                    },
                );

            setSavedSettings(
                response.data,
            );

            setValues(
                toInput(
                    response.data,
                ),
            );

            setSuccessMessage(
                response.message
                ?? 'Settings saved successfully.',
            );
        } catch (error) {
            setFormError(
                error instanceof ApiError
                    ? error.message
                    : 'Unable to save business settings.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <section className="content-card loading-panel">
                <div className="small-spinner" />

                <span>
                    Loading business settings...
                </span>
            </section>
        );
    }

    return (
        <form
            className="business-settings-layout"
            onSubmit={handleSubmit}
        >
            <section className="sales-history-header settings-page-header">
                <div>
                    <span className="page-kicker">
                        System configuration
                    </span>

                    <h2>
                        Business and Printing Settings
                    </h2>

                    <p>
                        Manage business information,
                        receipt layouts, invoices and
                        printing preferences.
                    </p>
                </div>

                {savedSettings
                    .updated_at && (
                        <div className="settings-update-information">
                            <span>
                                Last updated
                            </span>

                            <strong>
                                {new Intl.DateTimeFormat(
                                    'en-GB',
                                    {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    },
                                ).format(
                                    new Date(
                                        savedSettings
                                            .updated_at,
                                    ),
                                )}
                            </strong>

                            {savedSettings
                                .updated_by && (
                                    <small>
                                        By{' '}
                                        {
                                            savedSettings
                                                .updated_by
                                                .name
                                        }
                                    </small>
                                )}
                        </div>
                    )}
            </section>

            <nav
                className="settings-tabs"
                aria-label="Settings sections"
            >
                <button
                    type="button"
                    className={
                        activeTab === 'business'
                            ? 'settings-tab settings-tab-active'
                            : 'settings-tab'
                    }
                    onClick={() => {
                        setActiveTab(
                            'business',
                        );
                    }}
                >
                    <span>B</span>

                    <div>
                        <strong>
                            Business Settings
                        </strong>

                        <small>
                            Identity and contact details
                        </small>
                    </div>
                </button>

                <button
                    type="button"
                    className={
                        activeTab === 'printing'
                            ? 'settings-tab settings-tab-active'
                            : 'settings-tab'
                    }
                    onClick={() => {
                        setActiveTab(
                            'printing',
                        );
                    }}
                >
                    <span>P</span>

                    <div>
                        <strong>
                            Receipt and Invoice
                        </strong>

                        <small>
                            Paper, content and printing
                        </small>
                    </div>
                </button>
            </nav>

            {successMessage && (
                <div
                    className="success-alert"
                    role="status"
                >
                    <span>✓</span>

                    <p>
                        {successMessage}
                    </p>

                    <button
                        type="button"
                        onClick={() => {
                            setSuccessMessage('');
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            {(pageError || formError) && (
                <div
                    className="form-alert"
                    role="alert"
                >
                    {formError || pageError}
                </div>
            )}

            {activeTab === 'business' && (
                <>
                    <section className="content-card settings-section">
                        <header className="panel-heading">
                            <div>
                                <h2>
                                    Business Identity
                                </h2>

                                <p>
                                    Details printed on receipts
                                    and invoices.
                                </p>
                            </div>
                        </header>

                        <div className="settings-form-grid">
                            <label className="form-field">
                                <span>
                                    Business Name *
                                </span>

                                <input
                                    type="text"
                                    maxLength={150}
                                    value={
                                        values
                                            .business_name
                                    }
                                    onChange={(event) => {
                                        setField(
                                            'business_name',
                                            event
                                                .target
                                                .value,
                                        );
                                    }}
                                />
                            </label>

                            <label className="form-field">
                                <span>
                                    Short Business Name
                                </span>

                                <input
                                    type="text"
                                    maxLength={80}
                                    value={
                                        values
                                            .business_short_name
                                        ?? ''
                                    }
                                    onChange={(event) => {
                                        setField(
                                            'business_short_name',
                                            event
                                                .target
                                                .value
                                            || null,
                                        );
                                    }}
                                />
                            </label>

                            <label className="form-field settings-full-field">
                                <span>
                                    Address
                                </span>

                                <textarea
                                    rows={3}
                                    maxLength={1000}
                                    value={
                                        values.address
                                        ?? ''
                                    }
                                    onChange={(event) => {
                                        setField(
                                            'address',
                                            event
                                                .target
                                                .value
                                            || null,
                                        );
                                    }}
                                />
                            </label>

                            <label className="form-field">
                                <span>
                                    Primary Phone
                                </span>

                                <input
                                    type="tel"
                                    maxLength={30}
                                    value={
                                        values.phone
                                        ?? ''
                                    }
                                    onChange={(event) => {
                                        setField(
                                            'phone',
                                            event
                                                .target
                                                .value
                                            || null,
                                        );
                                    }}
                                />
                            </label>

                            <label className="form-field">
                                <span>
                                    Secondary Phone
                                </span>

                                <input
                                    type="tel"
                                    maxLength={30}
                                    value={
                                        values
                                            .secondary_phone
                                        ?? ''
                                    }
                                    onChange={(event) => {
                                        setField(
                                            'secondary_phone',
                                            event
                                                .target
                                                .value
                                            || null,
                                        );
                                    }}
                                />
                            </label>

                            <label className="form-field">
                                <span>
                                    Email
                                </span>

                                <input
                                    type="email"
                                    maxLength={150}
                                    value={
                                        values.email
                                        ?? ''
                                    }
                                    onChange={(event) => {
                                        setField(
                                            'email',
                                            event
                                                .target
                                                .value
                                            || null,
                                        );
                                    }}
                                />
                            </label>

                            <label className="form-field">
                                <span>
                                    Website
                                </span>

                                <input
                                    type="url"
                                    maxLength={255}
                                    placeholder="https://example.com"
                                    value={
                                        values.website
                                        ?? ''
                                    }
                                    onChange={(event) => {
                                        setField(
                                            'website',
                                            event
                                                .target
                                                .value
                                            || null,
                                        );
                                    }}
                                />
                            </label>

                            <label className="form-field">
                                <span>
                                    Registration Number
                                </span>

                                <input
                                    type="text"
                                    maxLength={100}
                                    value={
                                        values
                                            .registration_number
                                        ?? ''
                                    }
                                    onChange={(event) => {
                                        setField(
                                            'registration_number',
                                            event
                                                .target
                                                .value
                                            || null,
                                        );
                                    }}
                                />
                            </label>

                            <label className="form-field">
                                <span>
                                    Tax Number
                                </span>

                                <input
                                    type="text"
                                    maxLength={100}
                                    value={
                                        values
                                            .tax_number
                                        ?? ''
                                    }
                                    onChange={(event) => {
                                        setField(
                                            'tax_number',
                                            event
                                                .target
                                                .value
                                            || null,
                                        );
                                    }}
                                />
                            </label>

                            <label className="form-field">
                                <span>
                                    Currency Code *
                                </span>

                                <input
                                    type="text"
                                    maxLength={3}
                                    value={
                                        values
                                            .currency_code
                                    }
                                    onChange={(event) => {
                                        setField(
                                            'currency_code',
                                            event
                                                .target
                                                .value
                                                .toUpperCase(),
                                        );
                                    }}
                                />
                            </label>

                            <label className="form-field">
                                <span>
                                    Timezone *
                                </span>

                                <input
                                    type="text"
                                    maxLength={100}
                                    value={
                                        values.timezone
                                    }
                                    onChange={(event) => {
                                        setField(
                                            'timezone',
                                            event
                                                .target
                                                .value,
                                        );
                                    }}
                                />
                            </label>
                        </div>
                    </section>

                    <section className="content-card settings-section">
                        <header className="panel-heading">
                            <div>
                                <h2>
                                    Business Logo
                                </h2>

                                <p>
                                    PNG, JPEG or WebP,
                                    maximum 1 MB.
                                </p>
                            </div>
                        </header>

                        <div className="settings-logo-panel">
                            <div className="settings-logo-preview">
                                {values
                                    .logo_data_url ? (
                                    <img
                                        src={
                                            values
                                                .logo_data_url
                                        }
                                        alt="Business logo"
                                    />
                                ) : (
                                    <span>
                                        {
                                            values
                                                .business_name
                                                .charAt(0)
                                                .toUpperCase()
                                            || 'B'
                                        }
                                    </span>
                                )}
                            </div>

                            <div className="settings-logo-actions">
                                <label className="secondary-button settings-file-button">
                                    Select Logo

                                    <input
                                        type="file"
                                        accept="
                                            image/png,
                                            image/jpeg,
                                            image/webp
                                        "
                                        onChange={
                                            handleLogoSelection
                                        }
                                    />
                                </label>

                                {values
                                    .logo_data_url && (
                                        <button
                                            type="button"
                                            className="cashier-danger-button"
                                            onClick={() => {
                                                setField(
                                                    'logo_data_url',
                                                    null,
                                                );
                                            }}
                                        >
                                            Remove Logo
                                        </button>
                                    )}

                                <p>
                                    A square or horizontal
                                    transparent logo produces
                                    the best print result.
                                </p>
                            </div>
                        </div>
                    </section>
                </>
            )}

            {activeTab === 'printing' && (
                <div className="settings-print-layout">
                    <div className="settings-print-forms">
                        <section className="content-card settings-section">
                            <header className="panel-heading">
                                <div>
                                    <h2>
                                        Document Format
                                    </h2>

                                    <p>
                                        Configure receipt paper,
                                        invoices and copies.
                                    </p>
                                </div>
                            </header>

                            <div className="settings-form-grid">
                                <label className="form-field">
                                    <span>
                                        Receipt Paper
                                    </span>

                                    <select
                                        value={
                                            values
                                                .receipt_paper_size
                                        }
                                        onChange={(event) => {
                                            setField(
                                                'receipt_paper_size',
                                                parsePaperSize(
                                                    event
                                                        .target
                                                        .value,
                                                ),
                                            );
                                        }}
                                    >
                                        <option value="58mm">
                                            58 mm Thermal
                                        </option>

                                        <option value="80mm">
                                            80 mm Thermal
                                        </option>
                                    </select>
                                </label>

                                <label className="form-field">
                                    <span>
                                        Default Document
                                    </span>

                                    <select
                                        value={
                                            values
                                                .default_print_document
                                        }
                                        onChange={(event) => {
                                            const type =
                                                parseDocumentType(
                                                    event
                                                        .target
                                                        .value,
                                                );

                                            setField(
                                                'default_print_document',
                                                type,
                                            );

                                            setPreviewDocument(
                                                type,
                                            );
                                        }}
                                    >
                                        <option value="receipt">
                                            Thermal Receipt
                                        </option>

                                        <option value="invoice">
                                            A4 Invoice
                                        </option>
                                    </select>
                                </label>

                                <label className="form-field">
                                    <span>
                                        Receipt Copies
                                    </span>

                                    <select
                                        value={
                                            values
                                                .receipt_copies
                                        }
                                        onChange={(event) => {
                                            setField(
                                                'receipt_copies',
                                                Number(
                                                    event
                                                        .target
                                                        .value,
                                                ),
                                            );
                                        }}
                                    >
                                        <option value={1}>
                                            1 Copy
                                        </option>

                                        <option value={2}>
                                            2 Copies
                                        </option>

                                        <option value={3}>
                                            3 Copies
                                        </option>
                                    </select>
                                </label>

                                <label className="form-field">
                                    <span>
                                        Printer Name
                                    </span>

                                    <input
                                        type="text"
                                        maxLength={150}
                                        placeholder="Example: EPSON TM-T82"
                                        value={
                                            values
                                                .printer_name
                                            ?? ''
                                        }
                                        onChange={(event) => {
                                            setField(
                                                'printer_name',
                                                event
                                                    .target
                                                    .value
                                                || null,
                                            );
                                        }}
                                    />
                                </label>
                            </div>

                            <div className="printer-information-banner">
                                Printer selection is controlled
                                by the system print dialog.
                                The printer name above is stored
                                as a reference for staff.
                            </div>
                        </section>

                        <section className="content-card settings-section">
                            <header className="panel-heading">
                                <div>
                                    <h2>
                                        Receipt Text
                                    </h2>

                                    <p>
                                        Header and footer shown
                                        on thermal receipts.
                                    </p>
                                </div>
                            </header>

                            <div className="settings-form-grid">
                                <label className="form-field settings-full-field">
                                    <span>
                                        Receipt Title *
                                    </span>

                                    <input
                                        type="text"
                                        maxLength={100}
                                        value={
                                            values
                                                .receipt_title
                                        }
                                        onChange={(event) => {
                                            setField(
                                                'receipt_title',
                                                event
                                                    .target
                                                    .value,
                                            );
                                        }}
                                    />
                                </label>

                                <label className="form-field settings-full-field">
                                    <span>
                                        Receipt Footer
                                    </span>

                                    <textarea
                                        rows={4}
                                        maxLength={1000}
                                        value={
                                            values
                                                .receipt_footer
                                            ?? ''
                                        }
                                        onChange={(event) => {
                                            setField(
                                                'receipt_footer',
                                                event
                                                    .target
                                                    .value
                                                || null,
                                            );
                                        }}
                                    />
                                </label>
                            </div>
                        </section>

                        <section className="content-card settings-section">
                            <header className="panel-heading">
                                <div>
                                    <h2>
                                        Invoice Text
                                    </h2>

                                    <p>
                                        Header and footer shown
                                        on A4 invoices.
                                    </p>
                                </div>
                            </header>

                            <div className="settings-form-grid">
                                <label className="form-field settings-full-field">
                                    <span>
                                        Invoice Title *
                                    </span>

                                    <input
                                        type="text"
                                        maxLength={100}
                                        value={
                                            values
                                                .invoice_title
                                        }
                                        onChange={(event) => {
                                            setField(
                                                'invoice_title',
                                                event
                                                    .target
                                                    .value,
                                            );
                                        }}
                                    />
                                </label>

                                <label className="form-field settings-full-field">
                                    <span>
                                        Invoice Footer
                                    </span>

                                    <textarea
                                        rows={4}
                                        maxLength={1000}
                                        value={
                                            values
                                                .invoice_footer
                                            ?? ''
                                        }
                                        onChange={(event) => {
                                            setField(
                                                'invoice_footer',
                                                event
                                                    .target
                                                    .value
                                                || null,
                                            );
                                        }}
                                    />
                                </label>
                            </div>
                        </section>

                        <section className="content-card settings-section">
                            <header className="panel-heading">
                                <div>
                                    <h2>
                                        Printed Information
                                    </h2>

                                    <p>
                                        Choose information included
                                        in receipts and invoices.
                                    </p>
                                </div>
                            </header>

                            <div className="settings-switch-grid">
                                {[
                                    {
                                        key:
                                            'show_logo_on_receipt',
                                        label:
                                            'Show Business Logo',
                                    },
                                    {
                                        key:
                                            'show_business_address',
                                        label:
                                            'Show Business Address',
                                    },
                                    {
                                        key:
                                            'show_customer_details',
                                        label:
                                            'Show Customer Details',
                                    },
                                    {
                                        key:
                                            'show_cashier_name',
                                        label:
                                            'Show Cashier Name',
                                    },
                                    {
                                        key:
                                            'show_payment_reference',
                                        label:
                                            'Show Payment Reference',
                                    },
                                    {
                                        key:
                                            'show_due_date',
                                        label:
                                            'Show Due Date',
                                    },
                                    {
                                        key:
                                            'show_sku',
                                        label:
                                            'Show Product SKU',
                                    },
                                    {
                                        key:
                                            'show_batch_number',
                                        label:
                                            'Show Batch Number',
                                    },
                                    {
                                        key:
                                            'auto_print_after_sale',
                                        label:
                                            'Open Print Dialog After Sale',
                                    },
                                    {
                                        key:
                                            'print_duplicate_label',
                                        label:
                                            'Mark Additional Copies',
                                    },
                                ].map(
                                    (option) => {
                                        const key =
                                            option.key as
                                            | 'show_logo_on_receipt'
                                            | 'show_business_address'
                                            | 'show_customer_details'
                                            | 'show_cashier_name'
                                            | 'show_payment_reference'
                                            | 'show_due_date'
                                            | 'show_sku'
                                            | 'show_batch_number'
                                            | 'auto_print_after_sale'
                                            | 'print_duplicate_label';

                                        return (
                                            <label
                                                className="settings-switch"
                                                key={key}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        values[
                                                        key
                                                        ]
                                                    }
                                                    onChange={(event) => {
                                                        setField(
                                                            key,
                                                            event
                                                                .target
                                                                .checked,
                                                        );
                                                    }}
                                                />

                                                <span>
                                                    {
                                                        option
                                                            .label
                                                    }
                                                </span>
                                            </label>
                                        );
                                    },
                                )}
                            </div>
                        </section>
                    </div>

                    <aside className="content-card settings-preview-panel">
                        <header className="panel-heading">
                            <div>
                                <h2>
                                    Print Preview
                                </h2>

                                <p>
                                    Preview receipt or A4 invoice.
                                </p>
                            </div>
                        </header>

                        <div className="settings-preview-toolbar">
                            <button
                                type="button"
                                className={
                                    previewDocument
                                        === 'receipt'
                                        ? 'settings-preview-button active'
                                        : 'settings-preview-button'
                                }
                                onClick={() => {
                                    setPreviewDocument(
                                        'receipt',
                                    );
                                }}
                            >
                                Receipt
                            </button>

                            <button
                                type="button"
                                className={
                                    previewDocument
                                        === 'invoice'
                                        ? 'settings-preview-button active'
                                        : 'settings-preview-button'
                                }
                                onClick={() => {
                                    setPreviewDocument(
                                        'invoice',
                                    );
                                }}
                            >
                                Invoice
                            </button>
                        </div>

                        <div className="settings-preview-scroll">
                            <SettingsPreview
                                values={values}
                                documentType={
                                    previewDocument
                                }
                            />
                        </div>

                        <div className="settings-printer-actions">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => {
                                    window.print();
                                }}
                            >
                                Test Print
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            <footer className="settings-save-bar">
                <button
                    type="button"
                    className="secondary-button"
                    disabled={
                        isSaving
                        || !hasUnsavedChanges
                    }
                    onClick={() => {
                        setValues(
                            toInput(
                                savedSettings,
                            ),
                        );

                        setFormError('');
                        setSuccessMessage('');
                    }}
                >
                    Discard Changes
                </button>

                <button
                    type="submit"
                    className="primary-button"
                    disabled={
                        isSaving
                        || !hasUnsavedChanges
                    }
                >
                    {isSaving
                        ? 'Saving Settings...'
                        : 'Save Settings'}
                </button>
            </footer>
        </form>
    );
}