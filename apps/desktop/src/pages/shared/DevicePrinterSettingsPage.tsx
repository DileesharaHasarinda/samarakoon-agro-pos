import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    getInstalledPrinters,
    loadPrinterConfig,
    savePrinterConfig,
    testReceiptPrinter,
} from '../../lib/printerConfig';

import type {
    DevicePrinterInfo,
} from '../../lib/printerConfig';

const styles = `
#device-printer-settings,
#device-printer-settings *,
#device-printer-settings *::before,
#device-printer-settings *::after {
    box-sizing: border-box !important;
}

#device-printer-settings {
    --dps-green-900: #14532d;
    --dps-green-800: #166534;
    --dps-green-700: #15803d;
    --dps-green-100: #dcfce7;
    --dps-green-50: #f0fdf4;
    --dps-blue-700: #1d4ed8;
    --dps-blue-50: #eff6ff;
    --dps-red-700: #b42318;
    --dps-red-50: #fef3f2;
    --dps-amber-700: #b54708;
    --dps-amber-50: #fffaeb;
    --dps-text: #101828;
    --dps-text-2: #344054;
    --dps-muted: #667085;
    --dps-border: #d0d5dd;
    --dps-border-soft: #e4e7ec;

    display: flex !important;
    width: 100% !important;
    max-width: 1100px !important;
    margin: 0 auto !important;
    flex-direction: column !important;
    gap: 16px !important;

    color: var(--dps-text) !important;
    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif !important;
}

#device-printer-settings h1,
#device-printer-settings h2,
#device-printer-settings p {
    margin: 0 !important;
}

#device-printer-settings button,
#device-printer-settings select {
    font: inherit !important;
}

#device-printer-settings .dps-hero {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 18px !important;
    padding: 20px !important;
    background: #ffffff !important;
    border: 1px solid var(--dps-border) !important;
    border-left: 6px solid var(--dps-green-700) !important;
    border-radius: 14px !important;
}

#device-printer-settings .dps-kicker {
    display: block !important;
    margin-bottom: 4px !important;
    color: var(--dps-green-700) !important;
    font-size: 11px !important;
    font-weight: 850 !important;
    letter-spacing: 0.07em !important;
    text-transform: uppercase !important;
}

#device-printer-settings .dps-title {
    color: var(--dps-text) !important;
    font-size: 25px !important;
    font-weight: 850 !important;
}

#device-printer-settings .dps-subtitle {
    margin-top: 5px !important;
    max-width: 720px !important;
    color: var(--dps-muted) !important;
    font-size: 13px !important;
    line-height: 1.55 !important;
}

#device-printer-settings .dps-machine-badge {
    display: inline-flex !important;
    min-height: 34px !important;
    align-items: center !important;
    padding: 6px 10px !important;
    color: var(--dps-green-900) !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    white-space: nowrap !important;
    background: var(--dps-green-50) !important;
    border: 1px solid #b7e0c2 !important;
    border-radius: 999px !important;
}

#device-printer-settings .dps-alert {
    padding: 12px 14px !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    border-radius: 10px !important;
}

#device-printer-settings .dps-alert.success {
    color: var(--dps-green-900) !important;
    background: var(--dps-green-50) !important;
    border: 1px solid #86efac !important;
}

#device-printer-settings .dps-alert.error {
    color: var(--dps-red-700) !important;
    background: var(--dps-red-50) !important;
    border: 1px solid #fda29b !important;
}

#device-printer-settings .dps-panel {
    display: flex !important;
    flex-direction: column !important;
    gap: 16px !important;
    padding: 20px !important;
    background: #ffffff !important;
    border: 1px solid var(--dps-border) !important;
    border-radius: 14px !important;
}

#device-printer-settings .dps-panel-head {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 15px !important;
    padding-bottom: 13px !important;
    border-bottom: 1px solid var(--dps-border-soft) !important;
}

#device-printer-settings .dps-panel-title {
    color: var(--dps-text) !important;
    font-size: 17px !important;
    font-weight: 850 !important;
}

#device-printer-settings .dps-panel-copy {
    margin-top: 3px !important;
    color: var(--dps-muted) !important;
    font-size: 12px !important;
}

#device-printer-settings .dps-grid {
    display: grid !important;
    grid-template-columns:
        minmax(0, 1fr)
        minmax(180px, 220px) !important;
    gap: 13px !important;
    align-items: end !important;
}

#device-printer-settings .dps-field {
    display: grid !important;
    min-width: 0 !important;
    gap: 6px !important;
}

#device-printer-settings .dps-label {
    color: var(--dps-text-2) !important;
    font-size: 12px !important;
    font-weight: 800 !important;
}

#device-printer-settings .dps-select {
    width: 100% !important;
    min-width: 0 !important;
    min-height: 46px !important;
    padding: 8px 11px !important;
    color: var(--dps-text) !important;
    font-size: 14px !important;
    font-weight: 650 !important;
    background: #ffffff !important;
    border: 1px solid #aeb8b1 !important;
    border-radius: 9px !important;
    outline: none !important;
}

#device-printer-settings .dps-select:focus {
    border-color: var(--dps-green-700) !important;
    box-shadow: 0 0 0 4px rgba(21, 128, 61, 0.13) !important;
}

#device-printer-settings .dps-current {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
}

#device-printer-settings .dps-info-card {
    display: flex !important;
    min-height: 78px !important;
    flex-direction: column !important;
    justify-content: center !important;
    gap: 3px !important;
    padding: 12px !important;
    background: #f9fafb !important;
    border: 1px solid var(--dps-border-soft) !important;
    border-radius: 10px !important;
}

#device-printer-settings .dps-info-card span {
    color: var(--dps-muted) !important;
    font-size: 10px !important;
    font-weight: 800 !important;
    letter-spacing: 0.04em !important;
    text-transform: uppercase !important;
}

#device-printer-settings .dps-info-card strong {
    overflow-wrap: anywhere !important;
    color: var(--dps-text-2) !important;
    font-size: 14px !important;
    font-weight: 850 !important;
}

#device-printer-settings .dps-printer-list {
    display: grid !important;
    gap: 8px !important;
}

#device-printer-settings .dps-printer-row {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    padding: 11px 12px !important;
    background: #f9fafb !important;
    border: 1px solid var(--dps-border-soft) !important;
    border-radius: 9px !important;
}

#device-printer-settings .dps-printer-copy {
    display: flex !important;
    min-width: 0 !important;
    flex-direction: column !important;
    gap: 2px !important;
}

#device-printer-settings .dps-printer-copy strong {
    overflow: hidden !important;
    color: var(--dps-text-2) !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#device-printer-settings .dps-printer-copy small {
    color: var(--dps-muted) !important;
    font-size: 10px !important;
}

#device-printer-settings .dps-status {
    display: inline-flex !important;
    min-height: 27px !important;
    align-items: center !important;
    padding: 4px 8px !important;
    color: var(--dps-green-900) !important;
    font-size: 10px !important;
    font-weight: 850 !important;
    background: var(--dps-green-50) !important;
    border: 1px solid #bbebc8 !important;
    border-radius: 999px !important;
    white-space: nowrap !important;
}

#device-printer-settings .dps-status.offline {
    color: var(--dps-red-700) !important;
    background: var(--dps-red-50) !important;
    border-color: #fda29b !important;
}

#device-printer-settings .dps-empty {
    padding: 24px !important;
    color: var(--dps-muted) !important;
    font-size: 13px !important;
    text-align: center !important;
    background: #f9fafb !important;
    border: 1px dashed #98a2b3 !important;
    border-radius: 10px !important;
}

#device-printer-settings .dps-note {
    padding: 12px 13px !important;
    color: var(--dps-blue-700) !important;
    font-size: 12px !important;
    line-height: 1.55 !important;
    background: var(--dps-blue-50) !important;
    border: 1px solid #bfdbfe !important;
    border-radius: 9px !important;
}

#device-printer-settings .dps-actions {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 9px !important;
}

#device-printer-settings .dps-button {
    display: inline-flex !important;
    min-height: 43px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 8px 14px !important;
    color: var(--dps-text-2) !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    background: #ffffff !important;
    border: 1px solid #b8c0c7 !important;
    border-radius: 9px !important;
    cursor: pointer !important;
}

#device-printer-settings .dps-button.primary {
    color: #ffffff !important;
    background: var(--dps-green-700) !important;
    border-color: var(--dps-green-700) !important;
}

#device-printer-settings .dps-button.test {
    color: #ffffff !important;
    background: var(--dps-blue-700) !important;
    border-color: var(--dps-blue-700) !important;
}

#device-printer-settings .dps-button:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

@media (max-width: 720px) {
    #device-printer-settings .dps-hero,
    #device-printer-settings .dps-panel-head {
        align-items: stretch !important;
        flex-direction: column !important;
    }

    #device-printer-settings .dps-grid,
    #device-printer-settings .dps-current {
        grid-template-columns: 1fr !important;
    }

    #device-printer-settings .dps-actions {
        display: grid !important;
        grid-template-columns: 1fr !important;
    }

    #device-printer-settings .dps-button {
        width: 100% !important;
    }
}
`;

function getPrinterStatusLabel(
    printer: DevicePrinterInfo,
): string {
    if (printer.status === 3) {
        return 'Offline';
    }

    if (printer.isDefault) {
        return 'Default';
    }

    return 'Available';
}

export default function DevicePrinterSettingsPage() {
    const [
        printers,
        setPrinters,
    ] = useState<DevicePrinterInfo[]>([]);

    const [
        savedPrinterName,
        setSavedPrinterName,
    ] = useState('');

    const [
        selectedPrinterName,
        setSelectedPrinterName,
    ] = useState('');

    const [
        paperWidthMm,
        setPaperWidthMm,
    ] = useState<58 | 80>(80);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSaving,
        setIsSaving,
    ] = useState(false);

    const [
        isTesting,
        setIsTesting,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const selectedPrinter =
        useMemo(
            () =>
                printers.find(
                    (printer) =>
                        printer.name
                        === selectedPrinterName,
                )
                ?? null,
            [
                printers,
                selectedPrinterName,
            ],
        );

    const load =
        useCallback(
            async (): Promise<void> => {
                setIsLoading(true);
                setErrorMessage('');

                try {
                    const [
                        installedPrinters,
                        config,
                    ] = await Promise.all([
                        getInstalledPrinters(),
                        loadPrinterConfig(),
                    ]);

                    setPrinters(
                        installedPrinters,
                    );

                    const configuredName =
                        config
                            ?.receiptPrinterName
                            ?.trim()
                        ?? '';

                    setSavedPrinterName(
                        configuredName,
                    );

                    if (configuredName) {
                        setSelectedPrinterName(
                            configuredName,
                        );
                    } else {
                        const defaultPrinter =
                            installedPrinters.find(
                                (printer) =>
                                    printer.isDefault,
                            );

                        setSelectedPrinterName(
                            defaultPrinter
                                ?.name
                            ?? installedPrinters[0]
                                ?.name
                            ?? '',
                        );
                    }
                } catch (error) {
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : 'Unable to load printers from this computer.',
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            [],
        );

    useEffect(() => {
        void load();
    }, [
        load,
    ]);

    const handleSave =
        async (): Promise<void> => {
            if (
                !selectedPrinterName
                || isSaving
            ) {
                return;
            }

            setIsSaving(true);
            setErrorMessage('');
            setSuccessMessage('');

            try {
                const result =
                    await savePrinterConfig({
                        receiptPrinterName:
                            selectedPrinterName,
                    });

                if (!result.success) {
                    setErrorMessage(
                        result.error
                        ?? 'Unable to save printer settings.',
                    );

                    return;
                }

                setSavedPrinterName(
                    selectedPrinterName,
                );

                setSuccessMessage(
                    `Receipt printer saved for this computer: ${selectedPrinterName}`,
                );
            } catch (error) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Unable to save printer settings.',
                );
            } finally {
                setIsSaving(false);
            }
        };

    const handleTest =
        async (): Promise<void> => {
            if (
                !selectedPrinterName
                || isTesting
            ) {
                return;
            }

            setIsTesting(true);
            setErrorMessage('');
            setSuccessMessage('');

            try {
                const result =
                    await testReceiptPrinter(
                        selectedPrinterName,
                        paperWidthMm,
                    );

                if (!result.success) {
                    setErrorMessage(
                        result.error
                        ?? 'Test print failed.',
                    );

                    return;
                }

                setSuccessMessage(
                    `Test receipt sent successfully to ${selectedPrinterName}.`,
                );
            } catch (error) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Test print failed.',
                );
            } finally {
                setIsTesting(false);
            }
        };

    return (
        <div id="device-printer-settings">
            <style>
                {styles}
            </style>

            <header className="dps-hero">
                <div>
                    <span className="dps-kicker">
                        Local device configuration
                    </span>

                    <h1 className="dps-title">
                        Device Printer Settings
                    </h1>

                    <p className="dps-subtitle">
                        Select the receipt printer connected to this
                        physical computer. This setting is stored only
                        on this PC, so Cashier PC 1 and Cashier PC 2 can
                        use different printers while sharing the same
                        POS database.
                    </p>
                </div>

                <span className="dps-machine-badge">
                    This Computer Only
                </span>
            </header>

            {successMessage && (
                <div
                    className="dps-alert success"
                    role="status"
                >
                    {successMessage}
                </div>
            )}

            {errorMessage && (
                <div
                    className="dps-alert error"
                    role="alert"
                >
                    {errorMessage}
                </div>
            )}

            <section className="dps-panel">
                <header className="dps-panel-head">
                    <div>
                        <h2 className="dps-panel-title">
                            Receipt Printer
                        </h2>

                        <p className="dps-panel-copy">
                            The exact operating-system printer name is
                            saved locally for this computer.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="dps-button"
                        disabled={
                            isLoading
                            || isSaving
                            || isTesting
                        }
                        onClick={() => {
                            void load();
                        }}
                    >
                        {isLoading
                            ? 'Refreshing...'
                            : 'Refresh Printers'}
                    </button>
                </header>

                {isLoading ? (
                    <div className="dps-empty">
                        Loading installed printers...
                    </div>
                ) : (
                    <>
                        <div className="dps-grid">
                            <label className="dps-field">
                                <span className="dps-label">
                                    Receipt Printer
                                </span>

                                <select
                                    className="dps-select"
                                    value={
                                        selectedPrinterName
                                    }
                                    disabled={
                                        isSaving
                                        || isTesting
                                    }
                                    onChange={(event) => {
                                        setSelectedPrinterName(
                                            event
                                                .target
                                                .value,
                                        );

                                        setErrorMessage('');
                                        setSuccessMessage('');
                                    }}
                                >
                                    <option value="">
                                        Select installed printer
                                    </option>

                                    {printers.map(
                                        (printer) => (
                                            <option
                                                key={
                                                    printer.name
                                                }
                                                value={
                                                    printer.name
                                                }
                                            >
                                                {printer.displayName
                                                    || printer.name}
                                                {printer.isDefault
                                                    ? ' — Default'
                                                    : ''}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label className="dps-field">
                                <span className="dps-label">
                                    Test Paper Width
                                </span>

                                <select
                                    className="dps-select"
                                    value={
                                        paperWidthMm
                                    }
                                    disabled={
                                        isTesting
                                    }
                                    onChange={(event) => {
                                        setPaperWidthMm(
                                            Number(
                                                event
                                                    .target
                                                    .value,
                                            ) === 58
                                                ? 58
                                                : 80,
                                        );
                                    }}
                                >
                                    <option value={80}>
                                        80 mm
                                    </option>

                                    <option value={58}>
                                        58 mm
                                    </option>
                                </select>
                            </label>
                        </div>

                        <div className="dps-current">
                            <article className="dps-info-card">
                                <span>
                                    Saved for this computer
                                </span>

                                <strong>
                                    {savedPrinterName
                                        || 'Not configured'}
                                </strong>
                            </article>

                            <article className="dps-info-card">
                                <span>
                                    Selected printer
                                </span>

                                <strong>
                                    {selectedPrinter
                                        ?.displayName
                                        || selectedPrinterName
                                        || 'Not selected'}
                                </strong>
                            </article>
                        </div>

                        <div className="dps-note">
                            Receipt printing now uses this local printer
                            first. The old printer name stored in shared
                            Business Settings is only used as a fallback
                            when this computer has no local printer saved.
                        </div>

                        <div className="dps-actions">
                            <button
                                type="button"
                                className="dps-button test"
                                disabled={
                                    !selectedPrinterName
                                    || isTesting
                                    || isSaving
                                }
                                onClick={() => {
                                    void handleTest();
                                }}
                            >
                                {isTesting
                                    ? 'Printing Test...'
                                    : 'Test Print'}
                            </button>

                            <button
                                type="button"
                                className="dps-button primary"
                                disabled={
                                    !selectedPrinterName
                                    || isSaving
                                    || isTesting
                                }
                                onClick={() => {
                                    void handleSave();
                                }}
                            >
                                {isSaving
                                    ? 'Saving...'
                                    : 'Save for This Computer'}
                            </button>
                        </div>
                    </>
                )}
            </section>

            <section className="dps-panel">
                <header className="dps-panel-head">
                    <div>
                        <h2 className="dps-panel-title">
                            Printers Detected on This Computer
                        </h2>

                        <p className="dps-panel-copy">
                            These names come directly from Electron and
                            the operating system.
                        </p>
                    </div>
                </header>

                {printers.length === 0 ? (
                    <div className="dps-empty">
                        No installed printers were detected. Install the
                        printer driver in Windows/macOS first, then click
                        Refresh Printers.
                    </div>
                ) : (
                    <div className="dps-printer-list">
                        {printers.map(
                            (printer) => (
                                <article
                                    key={
                                        printer.name
                                    }
                                    className="dps-printer-row"
                                >
                                    <div className="dps-printer-copy">
                                        <strong>
                                            {printer.displayName
                                                || printer.name}
                                        </strong>

                                        <small>
                                            System name: {printer.name}
                                        </small>
                                    </div>

                                    <span
                                        className={
                                            printer.status === 3
                                                ? 'dps-status offline'
                                                : 'dps-status'
                                        }
                                    >
                                        {getPrinterStatusLabel(
                                            printer,
                                        )}
                                    </span>
                                </article>
                            ),
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
