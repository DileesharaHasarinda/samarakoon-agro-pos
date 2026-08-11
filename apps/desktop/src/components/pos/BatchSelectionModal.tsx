import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import type { PosProduct, PosSaleOption, PosStockBatch } from '../../types/sale';

interface BatchSelectionModalProps {
    product: PosProduct | null;
    onClose: () => void;
    onAdd: (
        product: PosProduct,
        batch: PosStockBatch,
        quantity: number,
        saleOption: PosSaleOption,
    ) => void;
}

type IconName =
    | 'alert'
    | 'bag'
    | 'check'
    | 'close'
    | 'kg'
    | 'keyboard'
    | 'lock'
    | 'minus'
    | 'package'
    | 'plus'
    | 'scale'
    | 'shopping-cart';

const currencyFormatter = new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
});

function Icon({ name }: { name: IconName }) {
    const props = {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true,
        focusable: false,
    };

    switch (name) {
        case 'alert':
            return (
                <svg {...props}>
                    <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                </svg>
            );
        case 'bag':
            return (
                <svg {...props}>
                    <path d="M7 4h10l2 5v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Z" />
                    <path d="M7 4c1.5 2 8.5 2 10 0" />
                    <path d="M9 13h6" />
                </svg>
            );
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
        case 'kg':
            return (
                <svg {...props}>
                    <path d="M6 5h12l2 15H4Z" />
                    <path d="M9 5a3 3 0 0 1 6 0" />
                    <path d="M8.5 14h7" />
                    <path d="M10 11.5 8.5 14 10 16.5" />
                </svg>
            );
        case 'keyboard':
            return (
                <svg {...props}>
                    <rect x="3" y="6" width="18" height="12" rx="2" />
                    <path d="M7 10h.01M11 10h.01M15 10h.01M18 10h.01M7 14h.01M11 14h6" />
                </svg>
            );
        case 'lock':
            return (
                <svg {...props}>
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
            );
        case 'minus':
            return (
                <svg {...props}>
                    <path d="M5 12h14" />
                </svg>
            );
        case 'package':
            return (
                <svg {...props}>
                    <path d="m21 8-9 5-9-5 9-5 9 5Z" />
                    <path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" />
                </svg>
            );
        case 'plus':
            return (
                <svg {...props}>
                    <path d="M12 5v14M5 12h14" />
                </svg>
            );
        case 'scale':
            return (
                <svg {...props}>
                    <path d="M12 3v18" />
                    <path d="M5 7h14" />
                    <path d="m5 7-3 6h6Z" />
                    <path d="m19 7-3 6h6Z" />
                    <path d="M8 21h8" />
                </svg>
            );
        case 'shopping-cart':
        default:
            return (
                <svg {...props}>
                    <circle cx="9" cy="20" r="1" />
                    <circle cx="18" cy="20" r="1" />
                    <path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
                </svg>
            );
    }
}

function normaliseQuantity(value: number): number {
    return Number(value.toFixed(3));
}

function normaliseUnit(value: string | null | undefined): string {
    return String(value ?? '').trim().toLowerCase();
}

function formatQuantity(value: number | string | null | undefined): string {
    const numericValue = Number(value ?? 0);

    if (!Number.isFinite(numericValue)) {
        return '0';
    }

    return quantityFormatter.format(numericValue);
}

function formatDate(value: string | null | undefined): string {
    if (!value) {
        return 'No expiry';
    }

    const date = new Date(`${value.substring(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function isWholeNumber(value: number): boolean {
    return Math.abs(value - Math.round(value)) < 0.0001;
}

function getFallbackSaleOption(product: PosProduct, batch: PosStockBatch): PosSaleOption {
    const primaryUnit = batch.primary_unit || product.primary_unit || product.unit || 'Unit';

    const availableQuantity = batch.is_dual_unit
        ? Number(batch.available_primary_quantity ?? 0)
        : Number(batch.available_quantity ?? 0);

    return {
        key: 'primary',
        label: batch.is_dual_unit ? `Full ${primaryUnit}` : primaryUnit,
        unit: primaryUnit,
        selling_price: Number(batch.selling_price ?? 0),
        purchase_cost: Number(batch.purchase_cost ?? 0),
        conversion_factor: batch.is_dual_unit ? Number(batch.conversion_factor ?? 1) : 1,
        stock_quantity_per_unit: batch.is_dual_unit ? Number(batch.conversion_factor ?? 1) : 1,
        available_quantity: availableQuantity,
        available_stock_quantity: Number(batch.available_quantity ?? 0),
        stock_unit: batch.stock_unit || primaryUnit,
        quantity_step: batch.is_dual_unit ? 1 : 0.001,
        allow_decimal_quantity: !batch.is_dual_unit,
    };
}

function getSaleOptions(product: PosProduct, batch: PosStockBatch): PosSaleOption[] {
    if (Array.isArray(batch.sale_options) && batch.sale_options.length > 0) {
        return batch.sale_options.map((option) => ({
            ...option,
            selling_price: Number(option.selling_price ?? 0),
            purchase_cost: Number(option.purchase_cost ?? 0),
            conversion_factor: Number(option.conversion_factor ?? 1),
            stock_quantity_per_unit: Number(
                option.stock_quantity_per_unit ?? option.conversion_factor ?? 1,
            ),
            available_quantity: Number(option.available_quantity ?? 0),
            available_stock_quantity: Number(
                option.available_stock_quantity ?? batch.available_quantity ?? 0,
            ),
        }));
    }

    return [getFallbackSaleOption(product, batch)];
}

function createInitialQuantity(option: PosSaleOption | null): string {
    if (!option) {
        return '';
    }

    const available = Number(option.available_quantity ?? 0);

    if (!Number.isFinite(available) || available <= 0) {
        return '';
    }

    if (option.allow_decimal_quantity) {
        return String(normaliseQuantity(Math.min(1, available)));
    }

    return '1';
}

const batchModalStyles = `
#pos-batch-modal,
#pos-batch-modal *,
#pos-batch-modal *::before,
#pos-batch-modal *::after {
    box-sizing: border-box !important;
}

#pos-batch-modal {
    --green-950: #052e16;
    --green-900: #14532d;
    --green-800: #166534;
    --green-700: #15803d;
    --green-100: #dcfce7;
    --green-50: #f0fdf4;

    --blue-700: #175cd3;
    --blue-500: #2e90fa;
    --blue-100: #d1e9ff;
    --blue-50: #eff8ff;

    --amber-800: #93370d;
    --amber-100: #fedf89;
    --amber-50: #fffaeb;

    --red-700: #b42318;
    --red-100: #fecdca;
    --red-50: #fef3f2;

    --text: #101828;
    --text-2: #344054;
    --muted: #667085;
    --border: #d0d5dd;
    --border-2: #b7c2ba;

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
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    font-size: 16px !important;
    line-height: 1.5 !important;
    isolation: isolate !important;
    -webkit-font-smoothing: antialiased !important;
}

#pos-batch-modal button,
#pos-batch-modal input {
    font: inherit !important;
    letter-spacing: normal !important;
    text-transform: none !important;
}

#pos-batch-modal h2,
#pos-batch-modal h3,
#pos-batch-modal p {
    margin: 0 !important;
}

/* =========================================================
   KEYBOARD FOCUS VS CONFIRMED SELECTION

   BLUE = current keyboard cursor
   GREEN + CHECK = confirmed selection
   ========================================================= */

#pos-batch-modal button:focus,
#pos-batch-modal input:focus {
    outline: none !important;
}

#pos-batch-modal .bsm-batch-card:focus-visible,
#pos-batch-modal .bsm-unit-card:focus-visible {
    border-color: var(--blue-500) !important;
    box-shadow: 0 0 0 4px rgba(46, 144, 250, 0.20) !important;
}

#pos-batch-modal .bsm-batch-card:focus-visible:not(.selected),
#pos-batch-modal .bsm-unit-card:focus-visible:not(.selected) {
    background: var(--blue-50) !important;
}

#pos-batch-modal .bsm-quantity-input:focus-visible,
#pos-batch-modal .bsm-button:focus-visible,
#pos-batch-modal .bsm-close:focus-visible,
#pos-batch-modal .bsm-quantity-button:focus-visible {
    outline: none !important;
    box-shadow: 0 0 0 4px rgba(46, 144, 250, 0.20) !important;
}

/* =========================================================
   BACKDROP
   ========================================================= */

#pos-batch-modal .bsm-backdrop {
    position: absolute !important;
    inset: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    height: 100% !important;
    padding: 20px !important;
    overflow-y: auto !important;
    background: rgba(3, 18, 10, 0.74) !important;
    backdrop-filter: blur(4px) !important;
}

/* =========================================================
   DIALOG
   ========================================================= */

#pos-batch-modal .bsm-dialog {
    display: flex !important;
    width: min(1040px, 100%) !important;
    max-height: calc(100dvh - 40px) !important;
    min-width: 0 !important;
    min-height: 0 !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: #ffffff !important;
    border: 1px solid var(--border) !important;
    border-radius: 18px !important;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.36) !important;
}

/* =========================================================
   HEADER
   ========================================================= */

#pos-batch-modal .bsm-header {
    display: flex !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 20px !important;
    min-height: 120px !important;
    padding: 18px 22px !important;
    color: #ffffff !important;
    background: linear-gradient(135deg, var(--green-900), var(--green-700)) !important;
}

#pos-batch-modal .bsm-header-copy {
    min-width: 0 !important;
}

#pos-batch-modal .bsm-eyebrow {
    display: block !important;
    margin-bottom: 3px !important;
    color: #bbf7d0 !important;
    font-size: 12px !important;
    font-weight: 800 !important;
    letter-spacing: 0.06em !important;
    text-transform: uppercase !important;
}

#pos-batch-modal .bsm-title {
    overflow: hidden !important;
    color: #ffffff !important;
    font-size: 26px !important;
    font-weight: 800 !important;
    line-height: 1.2 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#pos-batch-modal .bsm-header-summary {
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
    margin-top: 7px !important;
}

#pos-batch-modal .bsm-header-chip {
    display: inline-flex !important;
    min-height: 29px !important;
    align-items: center !important;
    gap: 5px !important;
    padding: 4px 9px !important;
    color: #e8fff0 !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    background: rgba(255, 255, 255, 0.11) !important;
    border: 1px solid rgba(255, 255, 255, 0.24) !important;
    border-radius: 999px !important;
}

#pos-batch-modal .bsm-header-chip svg {
    width: 15px !important;
    height: 15px !important;
}

/* =========================================================
   KEYBOARD GUIDE
   ========================================================= */

#pos-batch-modal .bsm-keyboard-help {
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 7px !important;
    margin-top: 9px !important;
    color: #e8fff0 !important;
    font-size: 12px !important;
    font-weight: 700 !important;
}

#pos-batch-modal .bsm-keyboard-help svg {
    width: 16px !important;
    height: 16px !important;
    flex: 0 0 16px !important;
}

#pos-batch-modal .bsm-key {
    display: inline-flex !important;
    min-height: 24px !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 2px 7px !important;
    color: var(--green-950) !important;
    font-size: 11px !important;
    font-weight: 850 !important;
    background: #ffffff !important;
    border: 1px solid rgba(255, 255, 255, 0.7) !important;
    border-radius: 6px !important;
}

#pos-batch-modal .bsm-focus-key {
    color: #d1e9ff !important;
}

#pos-batch-modal .bsm-confirm-key {
    color: #bbf7d0 !important;
}

/* =========================================================
   CLOSE
   ========================================================= */

#pos-batch-modal .bsm-close {
    display: grid !important;
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
    place-items: center !important;
    padding: 0 !important;
    color: #ffffff !important;
    background: rgba(255, 255, 255, 0.12) !important;
    border: 1px solid rgba(255, 255, 255, 0.34) !important;
    border-radius: 10px !important;
    cursor: pointer !important;
}

#pos-batch-modal .bsm-close:hover {
    background: rgba(255, 255, 255, 0.22) !important;
}

#pos-batch-modal .bsm-close svg {
    width: 20px !important;
    height: 20px !important;
}

/* =========================================================
   FORM
   ========================================================= */

#pos-batch-modal .bsm-form {
    display: flex !important;
    min-height: 0 !important;
    flex: 1 1 auto !important;
    flex-direction: column !important;
    overflow: hidden !important;
}

#pos-batch-modal .bsm-body {
    display: flex !important;
    min-height: 0 !important;
    flex: 1 1 auto !important;
    flex-direction: column !important;
    gap: 15px !important;
    padding: 18px !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    background: #f4f7f5 !important;
    scrollbar-width: thin !important;
    scrollbar-color: #8da095 #e5ece7 !important;
}

/* =========================================================
   ERROR
   ========================================================= */

#pos-batch-modal .bsm-error {
    display: flex !important;
    align-items: flex-start !important;
    gap: 9px !important;
    padding: 12px 14px !important;
    color: var(--red-700) !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    background: var(--red-50) !important;
    border: 1px solid var(--red-100) !important;
    border-radius: 10px !important;
}

#pos-batch-modal .bsm-error svg {
    width: 19px !important;
    height: 19px !important;
    min-width: 19px !important;
    margin-top: 1px !important;
}

/* =========================================================
   SECTIONS
   ========================================================= */

#pos-batch-modal .bsm-section {
    padding: 17px !important;
    background: #ffffff !important;
    border: 1px solid #d9e1dc !important;
    border-radius: 14px !important;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035) !important;
}

#pos-batch-modal .bsm-section.locked {
    background: #f8faf9 !important;
    border-style: dashed !important;
    border-color: #cbd5ce !important;
}

#pos-batch-modal .bsm-section-heading {
    display: flex !important;
    align-items: flex-start !important;
    gap: 11px !important;
    padding-bottom: 13px !important;
    border-bottom: 1px solid #e8ece9 !important;
}

#pos-batch-modal .bsm-step {
    display: grid !important;
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    place-items: center !important;
    color: #ffffff !important;
    font-size: 14px !important;
    font-weight: 800 !important;
    background: var(--green-700) !important;
    border-radius: 9px !important;
}

#pos-batch-modal .bsm-step.locked {
    color: #667085 !important;
    background: #eaecf0 !important;
    border: 1px solid #d0d5dd !important;
}

#pos-batch-modal .bsm-step.complete {
    background: var(--green-800) !important;
}

#pos-batch-modal .bsm-step svg {
    width: 17px !important;
    height: 17px !important;
}

#pos-batch-modal .bsm-section-title {
    color: var(--text) !important;
    font-size: 18px !important;
    font-weight: 800 !important;
    line-height: 1.25 !important;
}

#pos-batch-modal .bsm-section-help {
    margin-top: 3px !important;
    color: var(--muted) !important;
    font-size: 13px !important;
    line-height: 1.5 !important;
}

#pos-batch-modal .bsm-section-keyboard {
    display: inline-flex !important;
    align-items: center !important;
    gap: 5px !important;
    margin-top: 5px !important;
    color: var(--blue-700) !important;
    font-size: 12px !important;
    font-weight: 750 !important;
}

/* =========================================================
   CONFIRMED STATUS
   ========================================================= */

#pos-batch-modal .bsm-confirmed-status {
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
    margin-top: 8px !important;
    padding: 5px 9px !important;
    color: var(--green-900) !important;
    font-size: 12px !important;
    font-weight: 800 !important;
    background: var(--green-50) !important;
    border: 1px solid #a8d6b4 !important;
    border-radius: 999px !important;
}

#pos-batch-modal .bsm-confirmed-status svg {
    width: 14px !important;
    height: 14px !important;
}

/* =========================================================
   LOCK PANEL
   ========================================================= */

#pos-batch-modal .bsm-lock-panel {
    display: flex !important;
    min-height: 120px !important;
    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 8px !important;
    margin-top: 14px !important;
    padding: 22px !important;
    color: var(--muted) !important;
    text-align: center !important;
    background: #f2f4f7 !important;
    border: 1px dashed #c7ced5 !important;
    border-radius: 11px !important;
}

#pos-batch-modal .bsm-lock-panel svg {
    width: 28px !important;
    height: 28px !important;
    color: #667085 !important;
}

#pos-batch-modal .bsm-lock-panel strong {
    color: var(--text-2) !important;
    font-size: 15px !important;
    font-weight: 800 !important;
}

#pos-batch-modal .bsm-lock-panel span {
    max-width: 470px !important;
    font-size: 13px !important;
}

/* =========================================================
   BATCHES
   ========================================================= */

#pos-batch-modal .bsm-batches {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 11px !important;
    margin-top: 14px !important;
}

#pos-batch-modal .bsm-batch-card {
    position: relative !important;
    display: flex !important;
    min-width: 0 !important;
    min-height: 180px !important;
    flex-direction: column !important;
    gap: 10px !important;
    padding: 14px !important;
    color: var(--text) !important;
    text-align: left !important;
    background: #ffffff !important;
    border: 2px solid var(--border) !important;
    border-radius: 12px !important;
    cursor: pointer !important;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease !important;
}

#pos-batch-modal .bsm-batch-card:hover:not(:disabled) {
    border-color: #83b993 !important;
}

/* Only confirmed batch gets green. */
#pos-batch-modal .bsm-batch-card.selected {
    border-color: var(--green-700) !important;
    background: var(--green-50) !important;
    box-shadow: 0 5px 15px rgba(21, 128, 61, 0.12) !important;
}

#pos-batch-modal .bsm-batch-card.expired {
    background: var(--red-50) !important;
    border-color: var(--red-100) !important;
    cursor: not-allowed !important;
}

#pos-batch-modal .bsm-batch-top {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 10px !important;
}

#pos-batch-modal .bsm-batch-code {
    display: block !important;
    color: var(--text) !important;
    font-size: 16px !important;
    font-weight: 800 !important;
}

#pos-batch-modal .bsm-batch-number {
    display: block !important;
    margin-top: 2px !important;
    color: var(--muted) !important;
    font-size: 12px !important;
    font-weight: 600 !important;
}

#pos-batch-modal .bsm-selected-icon {
    display: grid !important;
    width: 30px !important;
    height: 30px !important;
    min-width: 30px !important;
    place-items: center !important;
    color: #ffffff !important;
    background: var(--green-700) !important;
    border-radius: 50% !important;
}

#pos-batch-modal .bsm-selected-icon svg {
    width: 16px !important;
    height: 16px !important;
}

#pos-batch-modal .bsm-expired-badge {
    display: inline-flex !important;
    min-height: 28px !important;
    align-items: center !important;
    padding: 4px 8px !important;
    color: var(--red-700) !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    background: #ffffff !important;
    border: 1px solid var(--red-100) !important;
    border-radius: 999px !important;
}

#pos-batch-modal .bsm-batch-info {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
    margin-top: auto !important;
}

#pos-batch-modal .bsm-info-box {
    min-width: 0 !important;
    padding: 8px 9px !important;
    background: #f8faf9 !important;
    border: 1px solid #e5ebe7 !important;
    border-radius: 8px !important;
}

#pos-batch-modal .bsm-info-box.cost {
    background: var(--amber-50) !important;
    border-color: var(--amber-100) !important;
}

#pos-batch-modal .bsm-info-label {
    display: block !important;
    color: var(--muted) !important;
    font-size: 10px !important;
    font-weight: 800 !important;
    letter-spacing: 0.04em !important;
    text-transform: uppercase !important;
}

#pos-batch-modal .bsm-info-box.cost .bsm-info-label,
#pos-batch-modal .bsm-info-box.cost .bsm-info-value {
    color: var(--amber-800) !important;
}

#pos-batch-modal .bsm-info-value {
    display: block !important;
    margin-top: 2px !important;
    overflow: hidden !important;
    color: var(--text-2) !important;
    font-size: 13px !important;
    font-weight: 750 !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

/* =========================================================
   EMPTY
   ========================================================= */

#pos-batch-modal .bsm-empty {
    display: flex !important;
    min-height: 130px !important;
    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 7px !important;
    margin-top: 14px !important;
    padding: 22px !important;
    color: var(--muted) !important;
    text-align: center !important;
    background: #f8faf9 !important;
    border: 1px dashed var(--border-2) !important;
    border-radius: 10px !important;
}

#pos-batch-modal .bsm-empty svg {
    width: 27px !important;
    height: 27px !important;
    color: var(--green-700) !important;
}

#pos-batch-modal .bsm-empty strong {
    color: var(--text) !important;
    font-size: 15px !important;
}

/* =========================================================
   SELLING UNIT
   ========================================================= */

#pos-batch-modal .bsm-unit-options {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 12px !important;
    margin-top: 14px !important;
}

#pos-batch-modal .bsm-unit-options.single {
    grid-template-columns: minmax(0, 1fr) !important;
}

#pos-batch-modal .bsm-unit-card {
    position: relative !important;
    display: flex !important;
    min-width: 0 !important;
    min-height: 225px !important;
    flex-direction: column !important;
    gap: 10px !important;
    padding: 15px !important;
    color: var(--text) !important;
    text-align: left !important;
    background: #ffffff !important;
    border: 2px solid var(--border) !important;
    border-radius: 13px !important;
    cursor: pointer !important;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease !important;
}

#pos-batch-modal .bsm-unit-card:hover:not(:disabled) {
    border-color: #83b993 !important;
}

/* Only confirmed selling unit gets green. */
#pos-batch-modal .bsm-unit-card.selected {
    background: var(--green-50) !important;
    border-color: var(--green-700) !important;
    box-shadow: 0 5px 16px rgba(21, 128, 61, 0.13) !important;
}

#pos-batch-modal .bsm-unit-card:disabled {
    opacity: 0.56 !important;
    background: #f5f5f5 !important;
    cursor: not-allowed !important;
}

#pos-batch-modal .bsm-unit-top {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 10px !important;
}

#pos-batch-modal .bsm-unit-identity {
    display: flex !important;
    min-width: 0 !important;
    align-items: flex-start !important;
    gap: 10px !important;
}

#pos-batch-modal .bsm-unit-icon {
    display: grid !important;
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    place-items: center !important;
    color: var(--green-800) !important;
    background: var(--green-100) !important;
    border-radius: 10px !important;
}

#pos-batch-modal .bsm-unit-icon svg {
    width: 21px !important;
    height: 21px !important;
}

#pos-batch-modal .bsm-unit-name {
    display: block !important;
    color: var(--text) !important;
    font-size: 18px !important;
    font-weight: 800 !important;
}

#pos-batch-modal .bsm-unit-price {
    display: block !important;
    margin-top: 3px !important;
    color: var(--green-800) !important;
    font-size: 21px !important;
    font-weight: 850 !important;
    line-height: 1.2 !important;
}

#pos-batch-modal .bsm-unit-price small {
    color: var(--muted) !important;
    font-size: 12px !important;
    font-weight: 650 !important;
}

#pos-batch-modal .bsm-unit-cost {
    display: block !important;
    margin-top: 6px !important;
    color: var(--amber-800) !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    line-height: 1.3 !important;
}

#pos-batch-modal .bsm-unit-cost small {
    color: var(--muted) !important;
    font-size: 11px !important;
    font-weight: 650 !important;
}

#pos-batch-modal .bsm-unit-details {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
    margin-top: auto !important;
}

#pos-batch-modal .bsm-unit-detail {
    padding: 8px 9px !important;
    background: #f8faf9 !important;
    border: 1px solid #e4ebe6 !important;
    border-radius: 8px !important;
}

#pos-batch-modal .bsm-unit-detail.blue {
    background: var(--blue-50) !important;
    border-color: var(--blue-100) !important;
}

#pos-batch-modal .bsm-unit-detail.cost {
    background: var(--amber-50) !important;
    border-color: var(--amber-100) !important;
}

#pos-batch-modal .bsm-unit-detail span {
    display: block !important;
    color: var(--muted) !important;
    font-size: 10px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
}

#pos-batch-modal .bsm-unit-detail strong {
    display: block !important;
    margin-top: 2px !important;
    color: var(--text-2) !important;
    font-size: 13px !important;
    font-weight: 750 !important;
}

#pos-batch-modal .bsm-unit-detail.blue strong {
    color: var(--blue-700) !important;
}

#pos-batch-modal .bsm-unit-detail.cost span,
#pos-batch-modal .bsm-unit-detail.cost strong {
    color: var(--amber-800) !important;
}

#pos-batch-modal .bsm-unit-note {
    display: flex !important;
    align-items: flex-start !important;
    gap: 6px !important;
    padding: 8px 9px !important;
    color: var(--amber-800) !important;
    font-size: 12px !important;
    font-weight: 650 !important;
    background: var(--amber-50) !important;
    border: 1px solid var(--amber-100) !important;
    border-radius: 8px !important;
}

#pos-batch-modal .bsm-unit-note svg {
    width: 15px !important;
    height: 15px !important;
    min-width: 15px !important;
    margin-top: 1px !important;
}

/* =========================================================
   QUANTITY
   ========================================================= */

#pos-batch-modal .bsm-quantity {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    align-items: center !important;
    gap: 18px !important;
    margin-top: 14px !important;
}

#pos-batch-modal .bsm-quantity-label {
    display: block !important;
    color: var(--text-2) !important;
    font-size: 15px !important;
    font-weight: 800 !important;
}

#pos-batch-modal .bsm-quantity-help {
    display: block !important;
    margin-top: 4px !important;
    color: var(--muted) !important;
    font-size: 13px !important;
}

#pos-batch-modal .bsm-quantity-help strong {
    color: var(--text-2) !important;
    font-weight: 800 !important;
}

#pos-batch-modal .bsm-quantity-controls {
    display: grid !important;
    grid-template-columns: 48px minmax(130px, 160px) 48px !important;
    align-items: center !important;
    gap: 8px !important;
}

#pos-batch-modal .bsm-quantity-button {
    display: grid !important;
    width: 48px !important;
    height: 48px !important;
    place-items: center !important;
    padding: 0 !important;
    color: var(--green-900) !important;
    background: var(--green-50) !important;
    border: 1px solid #a8d6b4 !important;
    border-radius: 10px !important;
    cursor: pointer !important;
}

#pos-batch-modal .bsm-quantity-button:hover:not(:disabled) {
    color: #ffffff !important;
    background: var(--green-800) !important;
    border-color: var(--green-800) !important;
}

#pos-batch-modal .bsm-quantity-button:disabled {
    color: #98a2b3 !important;
    background: #f2f4f7 !important;
    border-color: #e4e7ec !important;
    cursor: not-allowed !important;
}

#pos-batch-modal .bsm-quantity-button svg {
    width: 20px !important;
    height: 20px !important;
}

#pos-batch-modal .bsm-quantity-input {
    display: block !important;
    width: 100% !important;
    height: 48px !important;
    padding: 0 10px !important;
    color: var(--text) !important;
    font-size: 18px !important;
    font-weight: 850 !important;
    text-align: center !important;
    background: #ffffff !important;
    border: 2px solid var(--border-2) !important;
    border-radius: 10px !important;
}

/* =========================================================
   TOTAL
   ========================================================= */

#pos-batch-modal .bsm-total {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    align-items: center !important;
    gap: 20px !important;
    min-height: 92px !important;
    padding: 14px 17px !important;
    color: #ffffff !important;
    background: linear-gradient(135deg, var(--green-900), var(--green-700)) !important;
    border-radius: 13px !important;
}

#pos-batch-modal .bsm-total-label {
    display: block !important;
    color: #d8f7e1 !important;
    font-size: 13px !important;
    font-weight: 700 !important;
}

#pos-batch-modal .bsm-total-description {
    display: block !important;
    margin-top: 3px !important;
    color: #d8f7e1 !important;
    font-size: 12px !important;
}

#pos-batch-modal .bsm-total-cost {
    display: block !important;
    margin-top: 5px !important;
    color: #fde68a !important;
    font-size: 12px !important;
    font-weight: 800 !important;
}

#pos-batch-modal .bsm-total-value {
    color: #ffffff !important;
    font-size: 25px !important;
    font-weight: 850 !important;
    white-space: nowrap !important;
}

/* =========================================================
   FOOTER
   ========================================================= */

#pos-batch-modal .bsm-actions {
    display: flex !important;
    min-height: 76px !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 10px !important;
    padding: 13px 18px !important;
    background: #ffffff !important;
    border-top: 1px solid #d8e0da !important;
}

#pos-batch-modal .bsm-action-help {
    margin-right: auto !important;
    color: var(--muted) !important;
    font-size: 12px !important;
    font-weight: 650 !important;
}

#pos-batch-modal .bsm-action-help strong {
    color: var(--green-800) !important;
}

#pos-batch-modal .bsm-button {
    display: inline-flex !important;
    min-height: 48px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;
    padding: 9px 16px !important;
    font-size: 14px !important;
    font-weight: 800 !important;
    border-radius: 10px !important;
    cursor: pointer !important;
}

#pos-batch-modal .bsm-cancel {
    color: var(--text-2) !important;
    background: #ffffff !important;
    border: 1px solid var(--border-2) !important;
}

#pos-batch-modal .bsm-add {
    min-width: 170px !important;
    color: #ffffff !important;
    background: var(--green-700) !important;
    border: 1px solid var(--green-700) !important;
    box-shadow: 0 4px 12px rgba(21, 128, 61, 0.20) !important;
}

#pos-batch-modal .bsm-add:hover:not(:disabled) {
    background: var(--green-800) !important;
    border-color: var(--green-800) !important;
}

#pos-batch-modal .bsm-button:disabled {
    opacity: 0.48 !important;
    cursor: not-allowed !important;
}

#pos-batch-modal .bsm-button svg {
    width: 18px !important;
    height: 18px !important;
}

/* =========================================================
   RESPONSIVE
   ========================================================= */

@media (max-width: 760px) {
    #pos-batch-modal .bsm-backdrop {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    #pos-batch-modal .bsm-dialog {
        width: 100% !important;
        max-height: 96dvh !important;
        border-right: 0 !important;
        border-bottom: 0 !important;
        border-left: 0 !important;
        border-radius: 18px 18px 0 0 !important;
    }

    #pos-batch-modal .bsm-header {
        min-height: 110px !important;
        padding: 15px !important;
    }

    #pos-batch-modal .bsm-title {
        font-size: 21px !important;
    }

    #pos-batch-modal .bsm-body {
        padding: 13px !important;
    }

    #pos-batch-modal .bsm-section {
        padding: 14px !important;
    }

    #pos-batch-modal .bsm-batches,
    #pos-batch-modal .bsm-unit-options {
        grid-template-columns: 1fr !important;
    }

    #pos-batch-modal .bsm-quantity {
        grid-template-columns: 1fr !important;
    }

    #pos-batch-modal .bsm-quantity-controls {
        grid-template-columns: 48px minmax(0, 1fr) 48px !important;
    }

    #pos-batch-modal .bsm-total {
        grid-template-columns: 1fr !important;
        gap: 5px !important;
    }

    #pos-batch-modal .bsm-total-value {
        font-size: 23px !important;
    }

    #pos-batch-modal .bsm-actions {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        padding: 11px 13px !important;
    }

    #pos-batch-modal .bsm-action-help {
        grid-column: 1 / -1 !important;
        margin: 0 !important;
        text-align: center !important;
    }

    #pos-batch-modal .bsm-button {
        width: 100% !important;
        min-width: 0 !important;
    }
}

@media (max-width: 480px) {
    #pos-batch-modal .bsm-batch-info,
    #pos-batch-modal .bsm-unit-details {
        grid-template-columns: 1fr !important;
    }

    #pos-batch-modal .bsm-actions {
        grid-template-columns: 1fr !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #pos-batch-modal *,
    #pos-batch-modal *::before,
    #pos-batch-modal *::after {
        transition: none !important;
        scroll-behavior: auto !important;
    }
}
`;

export default function BatchSelectionModal({ product, onClose, onAdd }: BatchSelectionModalProps) {
    const quantityInputRef = useRef<HTMLInputElement | null>(null);
    const batchButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
    const saleOptionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    /*
     * IMPORTANT:
     * These states represent CONFIRMED selections.
     * Merely focusing an item with the arrow keys does NOT change these values.
     */
    const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
    const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(null);
    const [quantity, setQuantity] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const selectedBatch = useMemo(() => {
        if (!product || selectedBatchId === null) {
            return null;
        }

        return product.batches.find((batch) => batch.id === selectedBatchId) ?? null;
    }, [product, selectedBatchId]);

    const saleOptions = useMemo(() => {
        // STEP 2 cannot exist until STEP 1 is confirmed.
        if (!product || !selectedBatch) {
            return [];
        }

        return getSaleOptions(product, selectedBatch);
    }, [product, selectedBatch]);

    const availableSaleOptions = useMemo(
        () => saleOptions.filter((option) => Number(option.available_quantity ?? 0) > 0),
        [saleOptions],
    );

    const selectableBatches = useMemo(() => {
        if (!product) {
            return [];
        }

        return product.batches.filter((batch) => {
            if (batch.is_expired) {
                return false;
            }

            return getSaleOptions(product, batch).some(
                (option) => Number(option.available_quantity ?? 0) > 0,
            );
        });
    }, [product]);

    const selectedSaleOption = useMemo(() => {
        if (!selectedOptionKey) {
            return null;
        }

        return saleOptions.find((option) => option.key === selectedOptionKey) ?? null;
    }, [saleOptions, selectedOptionKey]);

    const numericQuantity = Number(quantity || 0);
    const validQuantity = Number.isFinite(numericQuantity) ? numericQuantity : 0;

    const itemTotal = selectedSaleOption
        ? validQuantity * Number(selectedSaleOption.selling_price)
        : 0;

    const itemCostTotal = selectedSaleOption
        ? validQuantity * Number(selectedSaleOption.purchase_cost ?? 0)
        : 0;

    const focusBatch = (batchId: number): void => {
        window.setTimeout(() => {
            batchButtonRefs.current.get(batchId)?.focus({ preventScroll: false });
        }, 20);
    };

    const focusSaleOption = (optionKey: string): void => {
        window.setTimeout(() => {
            saleOptionButtonRefs.current.get(optionKey)?.focus({ preventScroll: false });
        }, 80);
    };

    const focusQuantity = (): void => {
        window.setTimeout(() => {
            quantityInputRef.current?.focus({ preventScroll: false });
            quantityInputRef.current?.select();
        }, 50);
    };

    /*
     * Arrow key navigation for Step 1.
     * IMPORTANT: This ONLY changes keyboard focus. It does NOT select/confirm the batch.
     */
    const moveBatchFocus = (currentBatchId: number, direction: number): void => {
        if (selectableBatches.length === 0) {
            return;
        }

        const currentIndex = selectableBatches.findIndex((batch) => batch.id === currentBatchId);
        const safeIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = (safeIndex + direction + selectableBatches.length) % selectableBatches.length;
        const nextBatch = selectableBatches[nextIndex];

        if (!nextBatch) {
            return;
        }

        focusBatch(nextBatch.id);
    };

    /*
     * Arrow key navigation for Step 2.
     * IMPORTANT: This ONLY changes keyboard focus. It does NOT select/confirm the selling unit.
     */
    const moveSaleOptionFocus = (currentOptionKey: string, direction: number): void => {
        if (availableSaleOptions.length === 0) {
            return;
        }

        const currentIndex = availableSaleOptions.findIndex(
            (option) => option.key === currentOptionKey,
        );
        const safeIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = (safeIndex + direction + availableSaleOptions.length) % availableSaleOptions.length;
        const nextOption = availableSaleOptions[nextIndex];

        if (!nextOption) {
            return;
        }

        focusSaleOption(nextOption.key);
    };

    /*
     * When product popup opens:
     * 1. NO batch is selected.
     * 2. NO selling unit is selected.
     * 3. Quantity is empty.
     * 4. First valid batch gets only BLUE keyboard focus.
     */
    useEffect(() => {
        if (!product) {
            return;
        }

        setSelectedBatchId(null);
        setSelectedOptionKey(null);
        setQuantity('');
        setErrorMessage('');

        const firstBatch =
            product.batches.find((batch) => {
                if (batch.is_expired) {
                    return false;
                }

                return getSaleOptions(product, batch).some(
                    (option) => Number(option.available_quantity ?? 0) > 0,
                );
            }) ?? null;

        if (!firstBatch) {
            setErrorMessage(
                product.batches.length > 0
                    ? 'No sellable stock batch is available. Check expired or unavailable stock.'
                    : '',
            );

            return;
        }

        window.setTimeout(() => {
            batchButtonRefs.current.get(firstBatch.id)?.focus({ preventScroll: false });
        }, 120);
    }, [product]);

    // Escape closes modal.
    useEffect(() => {
        if (!product) {
            return;
        }

        const previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [product, onClose]);

    if (!product || typeof document === 'undefined') {
        return null;
    }

    /*
     * STEP 1 CONFIRMATION
     * Runs only after Enter on batch or mouse click on batch. Arrow keys do NOT call this.
     */
    const confirmBatch = (batch: PosStockBatch): void => {
        if (batch.is_expired) {
            setErrorMessage('This stock batch has expired and cannot be sold.');
            return;
        }

        const options = getSaleOptions(product, batch);
        const firstAvailableOption =
            options.find((option) => Number(option.available_quantity ?? 0) > 0) ?? null;

        if (!firstAvailableOption) {
            setErrorMessage('No selling option is available for this stock batch.');
            return;
        }

        // Confirm Step 1.
        setSelectedBatchId(batch.id);

        // Changing the batch invalidates all selections after Step 1.
        setSelectedOptionKey(null);
        setQuantity('');
        setErrorMessage('');

        // Step 2 will now unlock. Focus the first selling option, but DO NOT select it.
        focusSaleOption(firstAvailableOption.key);
    };

    /*
     * STEP 2 CONFIRMATION
     * Runs only after Enter on selling unit or mouse click on selling unit. Arrow keys do NOT call this.
     */
    const confirmSaleOption = (option: PosSaleOption): void => {
        if (!selectedBatch) {
            setErrorMessage('Complete Step 1 first. Select a stock batch and press Enter.');
            return;
        }

        const availableQuantity = Number(option.available_quantity ?? 0);

        if (availableQuantity <= 0) {
            setErrorMessage(`No ${option.unit} stock is available.`);
            return;
        }

        // Confirm Step 2.
        setSelectedOptionKey(option.key);
        setQuantity(createInitialQuantity(option));
        setErrorMessage('');

        // Step 3 now unlocks.
        focusQuantity();
    };

    const changeQuantity = (amount: number): void => {
        if (!selectedSaleOption) {
            return;
        }

        const maximumQuantity = Number(selectedSaleOption.available_quantity ?? 0);

        if (maximumQuantity <= 0) {
            return;
        }

        const minimumQuantity = selectedSaleOption.allow_decimal_quantity ? 0.001 : 1;
        const nextQuantity = validQuantity + amount;

        let safeQuantity = Math.min(maximumQuantity, Math.max(minimumQuantity, nextQuantity));

        if (!selectedSaleOption.allow_decimal_quantity) {
            safeQuantity = Math.floor(safeQuantity);
            safeQuantity = Math.max(1, safeQuantity);
        }

        setQuantity(String(normaliseQuantity(safeQuantity)));
        setErrorMessage('');
        focusQuantity();
    };

    const handleBatchKeyDown = (
        event: ReactKeyboardEvent<HTMLButtonElement>,
        batch: PosStockBatch,
    ): void => {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                confirmBatch(batch);
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                moveBatchFocus(batch.id, 1);
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                moveBatchFocus(batch.id, -1);
                break;
            default:
                break;
        }
    };

    const handleSaleOptionKeyDown = (
        event: ReactKeyboardEvent<HTMLButtonElement>,
        option: PosSaleOption,
    ): void => {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                confirmSaleOption(option);
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                moveSaleOptionFocus(option.key, 1);
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                moveSaleOptionFocus(option.key, -1);
                break;
            default:
                break;
        }
    };

    const handleQuantityKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        if (!selectedBatch) {
            setErrorMessage('Complete Step 1 first. Select a stock batch and press Enter.');
            return;
        }

        if (selectedBatch.is_expired) {
            setErrorMessage('The selected batch has expired and cannot be sold.');
            return;
        }

        if (!selectedSaleOption) {
            setErrorMessage('Complete Step 2 first. Select a selling unit and press Enter.');
            return;
        }

        const parsedQuantity = Number(quantity);

        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            setErrorMessage('Enter a quantity greater than zero.');
            focusQuantity();
            return;
        }

        if (!selectedSaleOption.allow_decimal_quantity && !isWholeNumber(parsedQuantity)) {
            setErrorMessage(
                `${selectedSaleOption.unit} quantity must be a whole number. Use Loose Kg for partial quantities.`,
            );
            focusQuantity();
            return;
        }

        const maximumQuantity = Number(selectedSaleOption.available_quantity ?? 0);

        if (parsedQuantity > maximumQuantity + 0.0001) {
            setErrorMessage(
                `Only ${formatQuantity(maximumQuantity)} ${selectedSaleOption.unit} are available.`,
            );
            focusQuantity();
            return;
        }

        setErrorMessage('');
        onAdd(product, selectedBatch, normaliseQuantity(parsedQuantity), selectedSaleOption);
    };

    const stockSummaryUnit = product.stock_unit || product.unit;

    return createPortal(
        <div id="pos-batch-modal">
            <style>{batchModalStyles}</style>

            <div
                className="bsm-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                        onClose();
                    }
                }}
            >
                <section
                    className="bsm-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="bsm-dialog-title"
                    aria-describedby="bsm-keyboard-help"
                >
                    <header className="bsm-header">
                        <div className="bsm-header-copy">
                            <span className="bsm-eyebrow">Add Product to Sale</span>

                            <h2 id="bsm-dialog-title" className="bsm-title" title={product.name}>
                                {product.name}
                            </h2>

                            <div className="bsm-header-summary">
                                <span className="bsm-header-chip">
                                    <Icon name="package" />
                                    {product.category.name}
                                </span>

                                <span className="bsm-header-chip">
                                    <Icon name="scale" />
                                    Available: {formatQuantity(product.total_available_quantity)} {stockSummaryUnit}
                                </span>

                                {product.is_dual_unit && (
                                    <span className="bsm-header-chip">
                                        <Icon name="bag" />
                                        Bag + Loose Kg
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            className="bsm-close"
                            aria-label="Close product selection"
                            onClick={onClose}
                        >
                            <Icon name="close" />
                        </button>
                    </header>

                    <form className="bsm-form" onSubmit={handleSubmit}>
                        <div className="bsm-body">
                            {errorMessage && (
                                <div className="bsm-error" role="alert">
                                    <Icon name="alert" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* STEP 1 */}
                            <section className="bsm-section">
                                <div className="bsm-section-heading">
                                    <span className={selectedBatch ? 'bsm-step complete' : 'bsm-step'}>
                                        {selectedBatch ? <Icon name="check" /> : '1'}
                                    </span>

                                    <div>
                                        <h3 className="bsm-section-title">Select Stock Batch</h3>

                                        {selectedBatch && (
                                            <span className="bsm-confirmed-status">
                                                <Icon name="check" />
                                                Confirmed Batch: {selectedBatch.batch_code}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {product.batches.length === 0 ? (
                                    <div className="bsm-empty">
                                        <Icon name="package" />
                                        <strong>No Stock Available</strong>
                                        <span>
                                            Receive stock for this product before adding it to a sale.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="bsm-batches">
                                        {product.batches.map((batch) => {
                                            const isSelected = batch.id === selectedBatchId;
                                            const isExpired = Boolean(batch.is_expired);
                                            const batchStockUnit = batch.stock_unit || product.unit;
                                            const batchPrimaryUnit =
                                                batch.primary_unit || product.primary_unit || product.unit || 'Unit';
                                            const batchCost = Number(batch.purchase_cost ?? 0);

                                            return (
                                                <button
                                                    ref={(node) => {
                                                        if (node) {
                                                            batchButtonRefs.current.set(batch.id, node);
                                                        } else {
                                                            batchButtonRefs.current.delete(batch.id);
                                                        }
                                                    }}
                                                    key={batch.id}
                                                    type="button"
                                                    className={[
                                                        'bsm-batch-card',
                                                        isSelected ? 'selected' : '',
                                                        isExpired ? 'expired' : '',
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ')}
                                                    disabled={isExpired}
                                                    aria-pressed={isSelected}
                                                    onKeyDown={(event) => handleBatchKeyDown(event, batch)}
                                                    onClick={() => confirmBatch(batch)}
                                                >
                                                    <div className="bsm-batch-top">
                                                        <div>
                                                            <strong className="bsm-batch-code">
                                                                {batch.batch_code}
                                                            </strong>
                                                            <span className="bsm-batch-number">
                                                                Batch: {batch.batch_number ?? 'Not specified'}
                                                            </span>
                                                        </div>

                                                        {isExpired ? (
                                                            <span className="bsm-expired-badge">Expired</span>
                                                        ) : isSelected ? (
                                                            <span className="bsm-selected-icon">
                                                                <Icon name="check" />
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    <div className="bsm-batch-info">
                                                        <div className="bsm-info-box">
                                                            <span className="bsm-info-label">Available Stock</span>
                                                            <strong className="bsm-info-value">
                                                                {formatQuantity(batch.available_quantity)} {batchStockUnit}
                                                            </strong>
                                                        </div>

                                                        <div className="bsm-info-box cost">
                                                            <span className="bsm-info-label">Cost Price</span>
                                                            <strong className="bsm-info-value">
                                                                {currencyFormatter.format(batchCost)} / {batchPrimaryUnit}
                                                            </strong>
                                                        </div>

                                                        <div className="bsm-info-box">
                                                            <span className="bsm-info-label">Selling Price</span>
                                                            <strong className="bsm-info-value">
                                                                {currencyFormatter.format(Number(batch.selling_price ?? 0))} /{' '}
                                                                {batchPrimaryUnit}
                                                            </strong>
                                                        </div>

                                                        <div className="bsm-info-box">
                                                            <span className="bsm-info-label">Expiry</span>
                                                            <strong className="bsm-info-value">
                                                                {formatDate(batch.expiry_date)}
                                                            </strong>
                                                        </div>

                                                        {batch.is_dual_unit && (
                                                            <>
                                                                <div className="bsm-info-box">
                                                                    <span className="bsm-info-label">Full Bags</span>
                                                                    <strong className="bsm-info-value">
                                                                        {formatQuantity(batch.available_primary_quantity)}{' '}
                                                                        {batchPrimaryUnit}
                                                                    </strong>
                                                                </div>

                                                                <div className="bsm-info-box">
                                                                    <span className="bsm-info-label">Bag Size</span>
                                                                    <strong className="bsm-info-value">
                                                                        1 {batchPrimaryUnit} ={' '}
                                                                        {formatQuantity(batch.conversion_factor)}{' '}
                                                                        {batch.secondary_unit ?? batch.stock_unit}
                                                                    </strong>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            {/* STEP 2 */}
                            <section
                                className={selectedBatch ? 'bsm-section' : 'bsm-section locked'}
                                aria-disabled={!selectedBatch}
                            >
                                <div className="bsm-section-heading">
                                    <span
                                        className={
                                            selectedSaleOption
                                                ? 'bsm-step complete'
                                                : selectedBatch
                                                    ? 'bsm-step'
                                                    : 'bsm-step locked'
                                        }
                                    >
                                        {selectedSaleOption ? <Icon name="check" /> : '2'}
                                    </span>

                                    <div>
                                        <h3 className="bsm-section-title">Select Selling Unit</h3>

                                        {selectedSaleOption && (
                                            <span className="bsm-confirmed-status">
                                                <Icon name="check" />
                                                Confirmed Unit: {selectedSaleOption.label}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {!selectedBatch ? (
                                    <div className="bsm-lock-panel">
                                        <Icon name="lock" />
                                        <strong>Complete Step 1 First</strong>
                                        <span>
                                            Select a stock batch using the arrow keys and press Enter. Selling
                                            units cannot be selected until the batch is confirmed.
                                        </span>
                                    </div>
                                ) : (
                                    <div
                                        className={
                                            saleOptions.length <= 1 ? 'bsm-unit-options single' : 'bsm-unit-options'
                                        }
                                    >
                                        {saleOptions.map((option) => {
                                            const selected = option.key === selectedOptionKey;
                                            const available = Number(option.available_quantity ?? 0);
                                            const sellingPrice = Number(option.selling_price ?? 0);
                                            const costPrice = Number(option.purchase_cost ?? 0);
                                            const isLooseKg =
                                                normaliseUnit(option.unit) === 'kg' && selectedBatch.is_dual_unit;

                                            return (
                                                <button
                                                    ref={(node) => {
                                                        if (node) {
                                                            saleOptionButtonRefs.current.set(option.key, node);
                                                        } else {
                                                            saleOptionButtonRefs.current.delete(option.key);
                                                        }
                                                    }}
                                                    key={option.key}
                                                    type="button"
                                                    className={selected ? 'bsm-unit-card selected' : 'bsm-unit-card'}
                                                    disabled={available <= 0}
                                                    aria-pressed={selected}
                                                    onKeyDown={(event) => handleSaleOptionKeyDown(event, option)}
                                                    onClick={() => confirmSaleOption(option)}
                                                >
                                                    <div className="bsm-unit-top">
                                                        <div className="bsm-unit-identity">
                                                            <span className="bsm-unit-icon">
                                                                <Icon
                                                                    name={
                                                                        isLooseKg
                                                                            ? 'kg'
                                                                            : selectedBatch.is_dual_unit
                                                                                ? 'bag'
                                                                                : 'package'
                                                                    }
                                                                />
                                                            </span>

                                                            <div>
                                                                <strong className="bsm-unit-name">{option.label}</strong>

                                                                <span className="bsm-unit-price">
                                                                    {currencyFormatter.format(sellingPrice)}
                                                                    <small> / {option.unit}</small>
                                                                </span>

                                                                <span className="bsm-unit-cost">
                                                                    Cost: {currencyFormatter.format(costPrice)}
                                                                    <small> / {option.unit}</small>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {selected && (
                                                            <span className="bsm-selected-icon">
                                                                <Icon name="check" />
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="bsm-unit-details">
                                                        <div className="bsm-unit-detail">
                                                            <span>Available</span>
                                                            <strong>
                                                                {formatQuantity(option.available_quantity)} {option.unit}
                                                            </strong>
                                                        </div>

                                                        <div className="bsm-unit-detail blue">
                                                            <span>Stock Usage</span>
                                                            <strong>
                                                                1 {option.unit} ={' '}
                                                                {formatQuantity(option.stock_quantity_per_unit)}{' '}
                                                                {option.stock_unit}
                                                            </strong>
                                                        </div>

                                                        <div className="bsm-unit-detail cost">
                                                            <span>Cost Price</span>
                                                            <strong>
                                                                {currencyFormatter.format(costPrice)} / {option.unit}
                                                            </strong>
                                                        </div>

                                                        <div className="bsm-unit-detail">
                                                            <span>Selling Price</span>
                                                            <strong>
                                                                {currencyFormatter.format(sellingPrice)} / {option.unit}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            {/* STEP 3 */}
                            <section
                                className={selectedSaleOption ? 'bsm-section' : 'bsm-section locked'}
                                aria-disabled={!selectedSaleOption}
                            >
                                <div className="bsm-section-heading">
                                    <span className={selectedSaleOption ? 'bsm-step' : 'bsm-step locked'}>3</span>
                                    <div>
                                        <h3 className="bsm-section-title">Enter Quantity</h3>
                                    </div>
                                </div>

                                {!selectedSaleOption ? (
                                    <div className="bsm-lock-panel">
                                        <Icon name="lock" />
                                        <strong>Complete Step 2 First</strong>
                                        <span>
                                            Select the required selling unit and press Enter. Quantity cannot be
                                            entered until the selling unit is confirmed.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="bsm-quantity">
                                        <div>
                                            <span className="bsm-quantity-label">
                                                Quantity ({selectedSaleOption.unit})
                                            </span>

                                            <span className="bsm-quantity-help">
                                                Maximum:{' '}
                                                <strong>
                                                    {formatQuantity(selectedSaleOption.available_quantity)}{' '}
                                                    {selectedSaleOption.unit}
                                                </strong>
                                                {selectedSaleOption.allow_decimal_quantity &&
                                                    normaliseUnit(selectedSaleOption.unit) === 'kg'
                                                    ? ' • 0.5 Kg = 500 g'
                                                    : ''}
                                            </span>
                                        </div>

                                        <div className="bsm-quantity-controls">
                                            <button
                                                type="button"
                                                className="bsm-quantity-button"
                                                aria-label="Decrease quantity"
                                                disabled={
                                                    validQuantity <=
                                                    (selectedSaleOption.allow_decimal_quantity ? 0.001 : 1)
                                                }
                                                onClick={() => changeQuantity(-1)}
                                            >
                                                <Icon name="minus" />
                                            </button>

                                            <input
                                                ref={quantityInputRef}
                                                type="number"
                                                className="bsm-quantity-input"
                                                min={selectedSaleOption.allow_decimal_quantity ? 0.001 : 1}
                                                max={selectedSaleOption.available_quantity}
                                                step={
                                                    selectedSaleOption.allow_decimal_quantity
                                                        ? selectedSaleOption.quantity_step
                                                        : 1
                                                }
                                                inputMode={
                                                    selectedSaleOption.allow_decimal_quantity ? 'decimal' : 'numeric'
                                                }
                                                value={quantity}
                                                aria-label="Sale quantity"
                                                onFocus={(event) => event.currentTarget.select()}
                                                onKeyDown={handleQuantityKeyDown}
                                                onChange={(event) => {
                                                    setQuantity(event.target.value);
                                                    setErrorMessage('');
                                                }}
                                            />

                                            <button
                                                type="button"
                                                className="bsm-quantity-button"
                                                aria-label="Increase quantity"
                                                disabled={
                                                    validQuantity >=
                                                    Number(selectedSaleOption.available_quantity ?? 0)
                                                }
                                                onClick={() => changeQuantity(1)}
                                            >
                                                <Icon name="plus" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {selectedBatch && selectedSaleOption && (
                                <div className="bsm-total">
                                    <div>
                                        <span className="bsm-total-label">Item Total</span>
                                        <span className="bsm-total-description">
                                            {formatQuantity(validQuantity)} {selectedSaleOption.unit} ×{' '}
                                            {currencyFormatter.format(Number(selectedSaleOption.selling_price))}
                                        </span>
                                        <span className="bsm-total-cost">
                                            Cost Total:{' '}
                                            {currencyFormatter.format(
                                                Number.isFinite(itemCostTotal) ? itemCostTotal : 0,
                                            )}
                                        </span>
                                    </div>

                                    <strong className="bsm-total-value">
                                        {currencyFormatter.format(Number.isFinite(itemTotal) ? itemTotal : 0)}
                                    </strong>
                                </div>
                            )}
                        </div>

                        <footer className="bsm-actions">
                            <span className="bsm-action-help">
                                {!selectedBatch
                                    ? 'Step 1: choose a batch and press Enter.'
                                    : !selectedSaleOption
                                        ? 'Step 2: choose a selling unit and press Enter.'
                                        : (
                                            <>
                                                Quantity entered? Press <strong>Enter</strong> to add to cart.
                                            </>
                                        )}
                            </span>

                            <button type="button" className="bsm-button bsm-cancel" onClick={onClose}>
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="bsm-button bsm-add"
                                disabled={
                                    !selectedBatch ||
                                    !selectedSaleOption ||
                                    selectedBatch.is_expired ||
                                    validQuantity <= 0
                                }
                            >
                                <Icon name="shopping-cart" />
                                Add to Cart (Enter)
                            </button>
                        </footer>
                    </form>
                </section>
            </div>
        </div>,
        document.body,
    );
}