import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {
    FormEvent,
    KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import type {
    PosProduct,
    PosTrainingOption,
} from '../../types/sale';

interface TrainingProductSelectionModalProps {
    product: PosProduct | null;

    onClose: () => void;

    onAdd: (
        product: PosProduct,
        option: PosTrainingOption,
        quantity: number,
    ) => void;
}

type IconName =
    | 'alert'
    | 'bag'
    | 'check'
    | 'close'
    | 'keyboard'
    | 'kg'
    | 'minus'
    | 'package'
    | 'plus'
    | 'scale'
    | 'shopping-cart'
    | 'tag'
    | 'training';

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

        case 'keyboard':
            return (
                <svg {...props}>
                    <rect
                        x="3"
                        y="6"
                        width="18"
                        height="12"
                        rx="2"
                    />

                    <path d="M7 10h.01M11 10h.01M15 10h.01M18 10h.01M7 14h.01M11 14h6" />
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

        case 'tag':
            return (
                <svg {...props}>
                    <path d="M20 13 13 20 4 11V4h7Z" />
                    <path d="M8.5 8.5h.01" />
                </svg>
            );

        case 'training':
            return (
                <svg {...props}>
                    <path d="m3 10 9-5 9 5-9 5-9-5Z" />
                    <path d="M7 12.5V17c2.8 2 7.2 2 10 0v-4.5" />
                    <path d="M21 10v5" />
                </svg>
            );

        case 'shopping-cart':
        default:
            return (
                <svg {...props}>
                    <circle
                        cx="9"
                        cy="20"
                        r="1"
                    />

                    <circle
                        cx="18"
                        cy="20"
                        r="1"
                    />

                    <path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
                </svg>
            );
    }
}

function normaliseQuantity(
    value: number,
): number {
    return Number(
        value.toFixed(
            3,
        ),
    );
}

function normaliseUnit(
    value:
        | string
        | null
        | undefined,
): string {
    return String(
        value
        ?? '',
    )
        .trim()
        .toLowerCase();
}

function formatQuantity(
    value:
        | number
        | string
        | null
        | undefined,
): string {
    const numeric =
        Number(
            value
            ?? 0,
        );

    if (
        !Number.isFinite(
            numeric,
        )
    ) {
        return '0';
    }

    return quantityFormatter
        .format(
            numeric,
        );
}

function fallbackTrainingOption(
    product: PosProduct,
): PosTrainingOption {
    const unit =
        String(
            product.primary_unit
            || product.unit
            || 'Unit',
        ).trim()
        || 'Unit';

    return {
        key:
            `product:${product.id}:primary:${unit.toLowerCase()}`,

        label:
            unit,

        unit,

        primary_unit:
            unit,

        stock_unit:
            String(
                product.stock_unit
                || unit,
            ).trim()
            || unit,

        variant_id:
            null,

        variant_name:
            null,

        is_dual_unit:
            false,

        conversion_factor:
            1,
    };
}

function getTrainingOptions(
    product: PosProduct,
): PosTrainingOption[] {
    const source =
        Array.isArray(
            product.training_options,
        )
            && product.training_options
                .length > 0
            ? product.training_options
            : [
                fallbackTrainingOption(
                    product,
                ),
            ];

    const seen =
        new Set<string>();

    return source.filter(
        (
            option,
        ) => {
            if (
                seen.has(
                    option.key,
                )
            ) {
                return false;
            }

            seen.add(
                option.key,
            );

            return true;
        },
    );
}

function optionIcon(
    option: PosTrainingOption,
): IconName {
    if (
        normaliseUnit(
            option.unit,
        ) === 'kg'
    ) {
        return 'kg';
    }

    if (
        option.is_dual_unit
    ) {
        return 'bag';
    }

    if (
        option.variant_id
        !== null
    ) {
        return 'tag';
    }

    return 'package';
}

const styles = `
#training-product-modal,
#training-product-modal *,
#training-product-modal *::before,
#training-product-modal *::after {
    box-sizing: border-box !important;
}

#training-product-modal {
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

    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;

    width: 100vw !important;
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
        Arial,
        sans-serif !important;

    font-size: 16px !important;
    line-height: 1.5 !important;

    isolation: isolate !important;
}

#training-product-modal button,
#training-product-modal input {
    font: inherit !important;
}

#training-product-modal h2,
#training-product-modal h3,
#training-product-modal p {
    margin: 0 !important;
}

#training-product-modal svg {
    display: block !important;
    width: 18px !important;
    height: 18px !important;
}

#training-product-modal button:focus,
#training-product-modal input:focus {
    outline: none !important;
}

#training-product-modal button:focus-visible,
#training-product-modal input:focus-visible {
    box-shadow:
        0 0 0 4px
        rgba(
            46,
            144,
            250,
            .20
        ) !important;
}

#training-product-modal .tpm-backdrop {
    position: absolute !important;
    inset: 0 !important;

    display: flex !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 20px !important;

    overflow-y: auto !important;

    background:
        rgba(
            3,
            18,
            10,
            .74
        ) !important;

    backdrop-filter:
        blur(4px) !important;
}

#training-product-modal .tpm-dialog {
    display: flex !important;

    width:
        min(
            920px,
            100%
        ) !important;

    max-height:
        calc(
            100dvh - 40px
        ) !important;

    min-height: 0 !important;

    flex-direction:
        column !important;

    overflow:
        hidden !important;

    background:
        #ffffff !important;

    border:
        1px solid
        var(--border) !important;

    border-radius:
        18px !important;

    box-shadow:
        0 30px 80px
        rgba(
            0,
            0,
            0,
            .35
        ) !important;
}

#training-product-modal .tpm-header {
    display: flex !important;

    flex: 0 0 auto !important;

    align-items:
        center !important;

    justify-content:
        space-between !important;

    gap: 20px !important;

    padding:
        18px 22px !important;

    color:
        #ffffff !important;

    background:
        linear-gradient(
            135deg,
            var(--green-900),
            var(--green-700)
        ) !important;
}

#training-product-modal .tpm-eyebrow {
    display: block !important;

    color:
        #bbf7d0 !important;

    font-size:
        12px !important;

    font-weight:
        800 !important;

    text-transform:
        uppercase !important;
}

#training-product-modal .tpm-title {
    margin-top:
        2px !important;

    color:
        #ffffff !important;

    font-size:
        26px !important;

    font-weight:
        850 !important;
}

#training-product-modal .tpm-header-summary {
    display: flex !important;

    flex-wrap:
        wrap !important;

    gap: 7px !important;

    margin-top:
        8px !important;
}

#training-product-modal .tpm-chip {
    display:
        inline-flex !important;

    align-items:
        center !important;

    gap: 5px !important;

    padding:
        4px 9px !important;

    color:
        #e8fff0 !important;

    font-size:
        12px !important;

    font-weight:
        750 !important;

    background:
        rgba(
            255,
            255,
            255,
            .11
        ) !important;

    border:
        1px solid
        rgba(
            255,
            255,
            255,
            .25
        ) !important;

    border-radius:
        999px !important;
}

#training-product-modal .tpm-keyboard-help {
    display: flex !important;

    align-items:
        center !important;

    flex-wrap:
        wrap !important;

    gap: 6px !important;

    margin-top:
        8px !important;

    color:
        #e8fff0 !important;

    font-size:
        11px !important;

    font-weight:
        700 !important;
}

#training-product-modal .tpm-key {
    display:
        inline-flex !important;

    padding:
        2px 7px !important;

    color:
        var(--green-950) !important;

    font-size:
        10px !important;

    font-weight:
        850 !important;

    background:
        #ffffff !important;

    border-radius:
        5px !important;
}

#training-product-modal .tpm-close {
    display:
        grid !important;

    width:
        44px !important;

    height:
        44px !important;

    min-width:
        44px !important;

    place-items:
        center !important;

    padding:
        0 !important;

    color:
        #ffffff !important;

    background:
        rgba(
            255,
            255,
            255,
            .12
        ) !important;

    border:
        1px solid
        rgba(
            255,
            255,
            255,
            .35
        ) !important;

    border-radius:
        10px !important;

    cursor:
        pointer !important;
}

#training-product-modal .tpm-form {
    display: flex !important;

    min-height: 0 !important;

    flex: 1 1 auto !important;

    flex-direction:
        column !important;

    overflow:
        hidden !important;
}

#training-product-modal .tpm-body {
    display: flex !important;

    min-height: 0 !important;

    flex: 1 1 auto !important;

    flex-direction:
        column !important;

    gap: 15px !important;

    padding:
        18px !important;

    overflow-y:
        auto !important;

    background:
        #f4f7f5 !important;
}

#training-product-modal .tpm-training-note {
    display: flex !important;

    align-items:
        flex-start !important;

    gap: 9px !important;

    padding:
        12px 14px !important;

    color:
        var(--amber-800) !important;

    font-size:
        13px !important;

    font-weight:
        750 !important;

    background:
        var(--amber-50) !important;

    border:
        1px solid
        var(--amber-100) !important;

    border-radius:
        10px !important;
}

#training-product-modal .tpm-error {
    display: flex !important;

    align-items:
        flex-start !important;

    gap: 9px !important;

    padding:
        12px 14px !important;

    color:
        var(--red-700) !important;

    font-size:
        14px !important;

    font-weight:
        750 !important;

    background:
        var(--red-50) !important;

    border:
        1px solid
        var(--red-100) !important;

    border-radius:
        10px !important;
}

#training-product-modal .tpm-section {
    padding:
        17px !important;

    background:
        #ffffff !important;

    border:
        1px solid
        #d9e1dc !important;

    border-radius:
        14px !important;
}

#training-product-modal .tpm-section-heading {
    display: flex !important;

    align-items:
        flex-start !important;

    gap: 11px !important;

    padding-bottom:
        13px !important;

    border-bottom:
        1px solid
        #e8ece9 !important;
}

#training-product-modal .tpm-step {
    display:
        grid !important;

    width:
        35px !important;

    height:
        35px !important;

    min-width:
        35px !important;

    place-items:
        center !important;

    color:
        #ffffff !important;

    font-size:
        14px !important;

    font-weight:
        850 !important;

    background:
        var(--green-700) !important;

    border-radius:
        9px !important;
}

#training-product-modal .tpm-step.complete {
    background:
        var(--green-800) !important;
}

#training-product-modal .tpm-step.locked {
    color:
        #667085 !important;

    background:
        #eaecf0 !important;

    border:
        1px solid
        #d0d5dd !important;
}

#training-product-modal .tpm-section-title {
    color:
        var(--text) !important;

    font-size:
        18px !important;

    font-weight:
        850 !important;
}

#training-product-modal .tpm-section-help {
    margin-top:
        3px !important;

    color:
        var(--muted) !important;

    font-size:
        13px !important;
}

#training-product-modal .tpm-option-grid {
    display: grid !important;

    grid-template-columns:
        repeat(
            2,
            minmax(
                0,
                1fr
            )
        ) !important;

    gap: 11px !important;

    margin-top:
        14px !important;
}

#training-product-modal .tpm-option-grid.single {
    grid-template-columns:
        1fr !important;
}

#training-product-modal .tpm-option-card {
    display: flex !important;

    min-width: 0 !important;

    min-height:
        145px !important;

    flex-direction:
        column !important;

    gap:
        10px !important;

    padding:
        14px !important;

    color:
        var(--text) !important;

    text-align:
        left !important;

    background:
        #ffffff !important;

    border:
        2px solid
        var(--border) !important;

    border-radius:
        12px !important;

    cursor:
        pointer !important;
}

#training-product-modal .tpm-option-card:hover {
    border-color:
        #83b993 !important;
}

#training-product-modal .tpm-option-card.selected {
    border-color:
        var(--green-700) !important;

    background:
        var(--green-50) !important;
}

#training-product-modal .tpm-option-card:focus-visible:not(.selected) {
    border-color:
        var(--blue-500) !important;

    background:
        var(--blue-50) !important;
}

#training-product-modal .tpm-option-top {
    display: flex !important;

    align-items:
        flex-start !important;

    justify-content:
        space-between !important;

    gap:
        10px !important;
}

#training-product-modal .tpm-option-identity {
    display:
        flex !important;

    align-items:
        flex-start !important;

    gap:
        10px !important;
}

#training-product-modal .tpm-option-icon {
    display:
        grid !important;

    width:
        42px !important;

    height:
        42px !important;

    min-width:
        42px !important;

    place-items:
        center !important;

    color:
        var(--green-800) !important;

    background:
        var(--green-100) !important;

    border-radius:
        10px !important;
}

#training-product-modal .tpm-option-name {
    display: block !important;

    color:
        var(--text) !important;

    font-size:
        17px !important;

    font-weight:
        850 !important;
}

#training-product-modal .tpm-option-variant {
    display: block !important;

    margin-top:
        3px !important;

    color:
        var(--muted) !important;

    font-size:
        12px !important;
}

#training-product-modal .tpm-option-meta {
    display: grid !important;

    grid-template-columns:
        repeat(
            2,
            minmax(
                0,
                1fr
            )
        ) !important;

    gap:
        8px !important;

    margin-top:
        auto !important;
}

#training-product-modal .tpm-info-box {
    padding:
        8px 9px !important;

    background:
        #f8faf9 !important;

    border:
        1px solid
        #e5ebe7 !important;

    border-radius:
        8px !important;
}

#training-product-modal .tpm-info-box span {
    display: block !important;

    color:
        var(--muted) !important;

    font-size:
        10px !important;

    font-weight:
        800 !important;

    text-transform:
        uppercase !important;
}

#training-product-modal .tpm-info-box strong {
    display: block !important;

    margin-top:
        2px !important;

    color:
        var(--text-2) !important;

    font-size:
        13px !important;

    font-weight:
        750 !important;
}

#training-product-modal .tpm-selected-icon {
    display:
        grid !important;

    width:
        30px !important;

    height:
        30px !important;

    min-width:
        30px !important;

    place-items:
        center !important;

    color:
        #ffffff !important;

    background:
        var(--green-700) !important;

    border-radius:
        50% !important;
}

#training-product-modal .tpm-empty {
    display: flex !important;

    min-height:
        130px !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    flex-direction:
        column !important;

    gap:
        7px !important;

    margin-top:
        14px !important;

    padding:
        22px !important;

    color:
        var(--muted) !important;

    text-align:
        center !important;

    background:
        #f8faf9 !important;

    border:
        1px dashed
        #b7c2ba !important;

    border-radius:
        10px !important;
}

#training-product-modal .tpm-quantity {
    display: grid !important;

    grid-template-columns:
        minmax(
            0,
            1fr
        )
        auto !important;

    align-items:
        center !important;

    gap:
        18px !important;

    margin-top:
        14px !important;
}

#training-product-modal .tpm-quantity-label {
    display: block !important;

    color:
        var(--text-2) !important;

    font-size:
        15px !important;

    font-weight:
        800 !important;
}

#training-product-modal .tpm-quantity-help {
    display: block !important;

    margin-top:
        4px !important;

    color:
        var(--muted) !important;

    font-size:
        13px !important;
}

#training-product-modal .tpm-quantity-controls {
    display: grid !important;

    grid-template-columns:
        48px
        150px
        48px !important;

    gap:
        8px !important;
}

#training-product-modal .tpm-quantity-button {
    display:
        grid !important;

    width:
        48px !important;

    height:
        48px !important;

    place-items:
        center !important;

    padding:
        0 !important;

    color:
        var(--green-900) !important;

    background:
        var(--green-50) !important;

    border:
        1px solid
        #a8d6b4 !important;

    border-radius:
        10px !important;

    cursor:
        pointer !important;
}

#training-product-modal .tpm-quantity-input {
    width:
        100% !important;

    height:
        48px !important;

    padding:
        0 8px !important;

    color:
        var(--text) !important;

    font-size:
        18px !important;

    font-weight:
        850 !important;

    text-align:
        center !important;

    background:
        #ffffff !important;

    border:
        2px solid
        #b7c2ba !important;

    border-radius:
        10px !important;
}

#training-product-modal .tpm-actions {
    display: flex !important;

    flex: 0 0 auto !important;

    align-items:
        center !important;

    justify-content:
        flex-end !important;

    gap:
        10px !important;

    padding:
        13px 18px !important;

    background:
        #ffffff !important;

    border-top:
        1px solid
        #d8e0da !important;
}

#training-product-modal .tpm-action-help {
    margin-right:
        auto !important;

    color:
        var(--muted) !important;

    font-size:
        12px !important;

    font-weight:
        650 !important;
}

#training-product-modal .tpm-button {
    display:
        inline-flex !important;

    min-height:
        48px !important;

    align-items:
        center !important;

    justify-content:
        center !important;

    gap:
        7px !important;

    padding:
        9px 16px !important;

    font-size:
        14px !important;

    font-weight:
        800 !important;

    border-radius:
        10px !important;

    cursor:
        pointer !important;
}

#training-product-modal .tpm-cancel {
    color:
        var(--text-2) !important;

    background:
        #ffffff !important;

    border:
        1px solid
        #b7c2ba !important;
}

#training-product-modal .tpm-add {
    min-width:
        190px !important;

    color:
        #ffffff !important;

    background:
        var(--green-700) !important;

    border:
        1px solid
        var(--green-700) !important;
}

#training-product-modal .tpm-button:disabled {
    opacity:
        .45 !important;

    cursor:
        not-allowed !important;
}

@media (max-width: 850px) {
    #training-product-modal .tpm-option-grid {
        grid-template-columns:
            1fr !important;
    }

    #training-product-modal .tpm-quantity {
        grid-template-columns:
            1fr !important;
    }

    #training-product-modal .tpm-quantity-controls {
        grid-template-columns:
            48px
            1fr
            48px !important;
    }
}
`;

export default function TrainingProductSelectionModal({
    product,
    onClose,
    onAdd,
}: TrainingProductSelectionModalProps) {
    const quantityInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const optionButtonRefs =
        useRef<
            Map<
                string,
                HTMLButtonElement
            >
        >(
            new Map(),
        );

    const [
        selectedOptionKey,
        setSelectedOptionKey,
    ] = useState<string | null>(
        null,
    );

    const [
        quantity,
        setQuantity,
    ] = useState('');

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const options =
        useMemo(
            (): PosTrainingOption[] =>
                product
                    ? getTrainingOptions(
                        product,
                    )
                    : [],
            [
                product,
            ],
        );

    const selectedOption =
        useMemo(
            () =>
                selectedOptionKey
                    === null
                    ? null
                    : options.find(
                        (
                            option,
                        ) =>
                            option.key
                            === selectedOptionKey,
                    )
                    ?? null,
            [
                options,
                selectedOptionKey,
            ],
        );

    const numericQuantity =
        Number(
            quantity
            || 0,
        );

    const validQuantity =
        Number.isFinite(
            numericQuantity,
        )
            ? numericQuantity
            : 0;

    const focusOption =
        (
            optionKey:
                string,
        ): void => {
            window.setTimeout(
                () => {
                    optionButtonRefs
                        .current
                        .get(
                            optionKey,
                        )
                        ?.focus();
                },
                40,
            );
        };

    const focusQuantity =
        (): void => {
            window.setTimeout(
                () => {
                    quantityInputRef
                        .current
                        ?.focus();

                    quantityInputRef
                        .current
                        ?.select();
                },
                50,
            );
        };

    useEffect(() => {
        if (!product) {
            return;
        }

        setSelectedOptionKey(
            null,
        );

        setQuantity('');
        setErrorMessage('');

        const firstOption =
            getTrainingOptions(
                product,
            )[0];

        if (
            firstOption
        ) {
            focusOption(
                firstOption.key,
            );
        }
    }, [
        product,
    ]);

    useEffect(() => {
        if (!product) {
            return;
        }

        const oldOverflow =
            document
                .body
                .style
                .overflow;

        document
            .body
            .style
            .overflow =
            'hidden';

        const handleKeyDown = (
            event: KeyboardEvent,
        ): void => {
            if (
                event.key
                === 'Escape'
            ) {
                event.preventDefault();

                onClose();
            }
        };

        window.addEventListener(
            'keydown',
            handleKeyDown,
        );

        return () => {
            document
                .body
                .style
                .overflow =
                oldOverflow;

            window.removeEventListener(
                'keydown',
                handleKeyDown,
            );
        };
    }, [
        product,
        onClose,
    ]);

    if (
        !product
        || typeof document
        === 'undefined'
    ) {
        return null;
    }

    const moveOptionFocus =
        (
            currentKey:
                string,

            direction:
                1
                | -1,
        ): void => {
            if (
                options.length === 0
            ) {
                return;
            }

            const currentIndex =
                options.findIndex(
                    (
                        option,
                    ) =>
                        option.key
                        === currentKey,
                );

            const nextIndex =
                (
                    Math.max(
                        currentIndex,
                        0,
                    )
                    + direction
                    + options.length
                )
                % options.length;

            focusOption(
                options[
                    nextIndex
                ].key,
            );
        };

    const confirmOption =
        (
            option:
                PosTrainingOption,
        ): void => {
            setSelectedOptionKey(
                option.key,
            );

            setQuantity(
                '1',
            );

            setErrorMessage(
                '',
            );

            focusQuantity();
        };

    const handleOptionKeyDown =
        (
            event:
                ReactKeyboardEvent<HTMLButtonElement>,

            option:
                PosTrainingOption,
        ): void => {
            if (
                event.key
                === 'Enter'
            ) {
                event.preventDefault();

                confirmOption(
                    option,
                );

                return;
            }

            if (
                event.key
                === 'ArrowDown'
                || event.key
                === 'ArrowRight'
            ) {
                event.preventDefault();

                moveOptionFocus(
                    option.key,
                    1,
                );

                return;
            }

            if (
                event.key
                === 'ArrowUp'
                || event.key
                === 'ArrowLeft'
            ) {
                event.preventDefault();

                moveOptionFocus(
                    option.key,
                    -1,
                );
            }
        };

    const changeQuantity =
        (
            amount:
                number,
        ): void => {
            if (
                !selectedOption
            ) {
                return;
            }

            const next =
                normaliseQuantity(
                    Math.max(
                        0.001,
                        (
                            validQuantity > 0
                                ? validQuantity
                                : 1
                        )
                        + amount,
                    ),
                );

            setQuantity(
                String(
                    next,
                ),
            );

            setErrorMessage(
                '',
            );

            focusQuantity();
        };

    const handleSubmit =
        (
            event:
                FormEvent<HTMLFormElement>,
        ): void => {
            event.preventDefault();

            if (
                !selectedOption
            ) {
                setErrorMessage(
                    'Select the training billing unit first.',
                );

                if (
                    options[0]
                ) {
                    focusOption(
                        options[0]
                            .key,
                    );
                }

                return;
            }

            if (
                !Number.isFinite(
                    validQuantity,
                )
                || validQuantity <= 0
            ) {
                setErrorMessage(
                    'Enter a quantity greater than zero.',
                );

                focusQuantity();

                return;
            }

            onAdd(
                product,
                selectedOption,
                normaliseQuantity(
                    validQuantity,
                ),
            );
        };

    const catalogStatus =
        product.catalog_status
            === 'not_purchased'
            ? 'Not Purchased'
            : product.catalog_status
                === 'out_of_stock'
                ? 'Out of Stock'
                : 'Stock Available';

    return createPortal(
        <div id="training-product-modal">
            <style>
                {styles}
            </style>

            <div
                className="tpm-backdrop"
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
                <section
                    className="tpm-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Add ${product.name} to training bill`}
                >
                    <header className="tpm-header">
                        <div>
                            <span className="tpm-eyebrow">
                                Add Product to Training Bill
                            </span>

                            <h2 className="tpm-title">
                                {product.name}
                            </h2>

                            <div className="tpm-header-summary">
                                <span className="tpm-chip">
                                    <Icon name="package" />

                                    {
                                        product
                                            .category
                                            .name
                                    }
                                </span>

                                <span className="tpm-chip">
                                    <Icon name="training" />

                                    {catalogStatus}
                                </span>

                                <span className="tpm-chip">
                                    <Icon name="scale" />

                                    Catalogue Stock:
                                    {' '}

                                    {formatQuantity(
                                        product
                                            .total_available_quantity
                                        ?? 0,
                                    )}

                                    {' '}

                                    {
                                        product
                                            .stock_unit
                                        || product
                                            .unit
                                    }
                                </span>
                            </div>

                            <div className="tpm-keyboard-help">
                                <Icon name="keyboard" />

                                <span className="tpm-key">
                                    ↑ ↓
                                </span>

                                Move

                                <span className="tpm-key">
                                    Enter
                                </span>

                                Confirm

                                <span className="tpm-key">
                                    Esc
                                </span>

                                Close
                            </div>
                        </div>

                        <button
                            type="button"
                            className="tpm-close"
                            aria-label="Close"
                            onClick={
                                onClose
                            }
                        >
                            <Icon name="close" />
                        </button>
                    </header>

                    <form
                        className="tpm-form"
                        onSubmit={
                            handleSubmit
                        }
                    >
                        <div className="tpm-body">
                            <div className="tpm-training-note">
                                <Icon name="training" />

                                <span>
                                    Training mode only: no selling price,
                                    no payment and no stock deduction.
                                    Quantity is for practice billing only.
                                </span>
                            </div>

                            {errorMessage && (
                                <div
                                    className="tpm-error"
                                    role="alert"
                                >
                                    <Icon name="alert" />

                                    <span>
                                        {
                                            errorMessage
                                        }
                                    </span>
                                </div>
                            )}

                            <section className="tpm-section">
                                <div className="tpm-section-heading">
                                    <span
                                        className={
                                            selectedOption
                                                ? 'tpm-step complete'
                                                : 'tpm-step'
                                        }
                                    >
                                        {selectedOption
                                            ? (
                                                <Icon name="check" />
                                            )
                                            : '1'}
                                    </span>

                                    <div>
                                        <h3 className="tpm-section-title">
                                            Select Billing Unit
                                        </h3>

                                        <p className="tpm-section-help">
                                            Use the arrow keys to move between
                                            available training units and press
                                            Enter to confirm.
                                        </p>
                                    </div>
                                </div>

                                {options.length
                                    === 0 ? (
                                    <div className="tpm-empty">
                                        <Icon name="package" />

                                        <strong>
                                            No Billing Unit Available
                                        </strong>
                                    </div>
                                ) : (
                                    <div
                                        className={
                                            options.length
                                                <= 1
                                                ? 'tpm-option-grid single'
                                                : 'tpm-option-grid'
                                        }
                                    >
                                        {options.map(
                                            (
                                                option,
                                            ) => {
                                                const selected =
                                                    option.key
                                                    === selectedOptionKey;

                                                return (
                                                    <button
                                                        ref={(
                                                            node,
                                                        ) => {
                                                            if (
                                                                node
                                                            ) {
                                                                optionButtonRefs
                                                                    .current
                                                                    .set(
                                                                        option.key,
                                                                        node,
                                                                    );
                                                            } else {
                                                                optionButtonRefs
                                                                    .current
                                                                    .delete(
                                                                        option.key,
                                                                    );
                                                            }
                                                        }}
                                                        key={
                                                            option.key
                                                        }
                                                        type="button"
                                                        className={
                                                            selected
                                                                ? 'tpm-option-card selected'
                                                                : 'tpm-option-card'
                                                        }
                                                        aria-pressed={
                                                            selected
                                                        }
                                                        onClick={() => {
                                                            confirmOption(
                                                                option,
                                                            );
                                                        }}
                                                        onKeyDown={(
                                                            event,
                                                        ) => {
                                                            handleOptionKeyDown(
                                                                event,
                                                                option,
                                                            );
                                                        }}
                                                    >
                                                        <div className="tpm-option-top">
                                                            <div className="tpm-option-identity">
                                                                <span className="tpm-option-icon">
                                                                    <Icon
                                                                        name={
                                                                            optionIcon(
                                                                                option,
                                                                            )
                                                                        }
                                                                    />
                                                                </span>

                                                                <div>
                                                                    <strong className="tpm-option-name">
                                                                        {
                                                                            option.label
                                                                        }
                                                                    </strong>

                                                                    <span className="tpm-option-variant">
                                                                        {option.variant_name
                                                                            ? `Variant: ${option.variant_name}`
                                                                            : 'Standard product'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {selected && (
                                                                <span className="tpm-selected-icon">
                                                                    <Icon name="check" />
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="tpm-option-meta">
                                                            <div className="tpm-info-box">
                                                                <span>
                                                                    Bill Unit
                                                                </span>

                                                                <strong>
                                                                    {
                                                                        option.unit
                                                                    }
                                                                </strong>
                                                            </div>

                                                            <div className="tpm-info-box">
                                                                <span>
                                                                    Physical Unit
                                                                </span>

                                                                <strong>
                                                                    {
                                                                        option.stock_unit
                                                                    }
                                                                </strong>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            },
                                        )}
                                    </div>
                                )}
                            </section>

                            <section className="tpm-section">
                                <div className="tpm-section-heading">
                                    <span
                                        className={
                                            selectedOption
                                                ? 'tpm-step'
                                                : 'tpm-step locked'
                                        }
                                    >
                                        2
                                    </span>

                                    <div>
                                        <h3 className="tpm-section-title">
                                            Enter Quantity
                                        </h3>

                                        <p className="tpm-section-help">
                                            Training quantity is not limited
                                            by current physical stock.
                                        </p>
                                    </div>
                                </div>

                                {!selectedOption ? (
                                    <div className="tpm-empty">
                                        <Icon name="scale" />

                                        <strong>
                                            Select Billing Unit First
                                        </strong>

                                        <span>
                                            Complete Step 1 before entering
                                            the training quantity.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="tpm-quantity">
                                        <div>
                                            <span className="tpm-quantity-label">
                                                Quantity
                                                {' '}
                                                (
                                                {
                                                    selectedOption
                                                        .unit
                                                }
                                                )
                                            </span>

                                            <span className="tpm-quantity-help">
                                                No stock will be reserved or
                                                deducted.
                                            </span>
                                        </div>

                                        <div className="tpm-quantity-controls">
                                            <button
                                                type="button"
                                                className="tpm-quantity-button"
                                                aria-label="Decrease quantity"
                                                onClick={() => {
                                                    changeQuantity(
                                                        -1,
                                                    );
                                                }}
                                            >
                                                <Icon name="minus" />
                                            </button>

                                            <input
                                                ref={
                                                    quantityInputRef
                                                }
                                                type="number"
                                                className="tpm-quantity-input"
                                                min="0.001"
                                                step="0.001"
                                                value={
                                                    quantity
                                                }
                                                onFocus={(
                                                    event,
                                                ) => {
                                                    event
                                                        .currentTarget
                                                        .select();
                                                }}
                                                onKeyDown={(
                                                    event,
                                                ) => {
                                                    if (
                                                        event.key
                                                        === 'Enter'
                                                    ) {
                                                        event.preventDefault();

                                                        event
                                                            .currentTarget
                                                            .form
                                                            ?.requestSubmit();
                                                    }
                                                }}
                                                onChange={(
                                                    event,
                                                ) => {
                                                    setQuantity(
                                                        event
                                                            .target
                                                            .value,
                                                    );

                                                    setErrorMessage(
                                                        '',
                                                    );
                                                }}
                                            />

                                            <button
                                                type="button"
                                                className="tpm-quantity-button"
                                                aria-label="Increase quantity"
                                                onClick={() => {
                                                    changeQuantity(
                                                        1,
                                                    );
                                                }}
                                            >
                                                <Icon name="plus" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        <footer className="tpm-actions">
                            <span className="tpm-action-help">
                                {!selectedOption
                                    ? 'Step 1: select a billing unit and press Enter.'
                                    : 'Step 2: enter quantity and press Enter to add.'}
                            </span>

                            <button
                                type="button"
                                className="tpm-button tpm-cancel"
                                onClick={
                                    onClose
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="tpm-button tpm-add"
                                disabled={
                                    !selectedOption
                                    || validQuantity <= 0
                                }
                            >
                                <Icon name="shopping-cart" />

                                Add to Training Bill
                            </button>
                        </footer>
                    </form>
                </section>
            </div>
        </div>,
        document.body,
    );
}
