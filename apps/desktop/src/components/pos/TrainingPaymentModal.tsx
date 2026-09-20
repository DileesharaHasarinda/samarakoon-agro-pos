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
    PosCartItem,
    PosPaymentMethod,
    TrainingPaymentDetails,
} from '../../types/sale';

interface TrainingPaymentModalProps {
    isOpen: boolean;

    cart: PosCartItem[];

    onClose: () => void;

    onSubmit: (
        values: TrainingPaymentDetails,
    ) => void;
}

type PaymentChoice = {
    method: PosPaymentMethod;
    title: string;
    description: string;
    icon:
    | 'cash'
    | 'card'
    | 'bank';
};

const PAYMENT_CHOICES:
    PaymentChoice[] = [
        {
            method:
                'cash',

            title:
                'Cash',

            description:
                'Practice a cash-payment checkout.',

            icon:
                'cash',
        },
        {
            method:
                'card',

            title:
                'Card',

            description:
                'Practice a card-payment checkout.',

            icon:
                'card',
        },
        {
            method:
                'bank_transfer',

            title:
                'Bank Transfer',

            description:
                'Practice a bank-transfer checkout.',

            icon:
                'bank',
        },
    ];

type IconName =
    | 'alert'
    | 'bank'
    | 'card'
    | 'cash'
    | 'check'
    | 'close'
    | 'keyboard'
    | 'receipt'
    | 'training'
    | 'user';

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

        case 'bank':
            return (
                <svg {...props}>
                    <path d="m3 9 9-5 9 5" />
                    <path d="M5 10v7M9 10v7M15 10v7M19 10v7" />
                    <path d="M3 20h18M4 17h16" />
                </svg>
            );

        case 'card':
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

        case 'cash':
            return (
                <svg {...props}>
                    <rect
                        x="3"
                        y="6"
                        width="18"
                        height="12"
                        rx="2"
                    />
                    <path d="M7 10h.01M17 14h.01" />
                    <circle
                        cx="12"
                        cy="12"
                        r="2.5"
                    />
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

        case 'receipt':
            return (
                <svg {...props}>
                    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
                    <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
            );

        case 'user':
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
#training-payment-modal,
#training-payment-modal * {
    box-sizing: border-box;
}

#training-payment-modal {
    position: fixed;
    inset: 0;
    z-index: 10120;
    display: grid;
    place-items: center;
    padding: 22px;
    background: rgba(15, 23, 42, 0.62);
    backdrop-filter: blur(5px);
}

#training-payment-modal .training-payment-shell {
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

#training-payment-modal .training-payment-header {
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

#training-payment-modal .training-payment-heading {
    min-width: 0;
}

#training-payment-modal .training-payment-eyebrow {
    display: block;
    margin-bottom: 5px;
    color: #bbf7d0;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.07em;
    text-transform: uppercase;
}

#training-payment-modal .training-payment-title {
    margin: 0;
    font-size: 25px;
    line-height: 1.18;
}

#training-payment-modal .training-payment-subtitle {
    display: block;
    margin-top: 6px;
    color: #dcfce7;
    font-size: 12px;
    font-weight: 650;
}

#training-payment-modal .training-payment-guide {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-top: 12px;
    color: #f0fdf4;
    font-size: 11px;
    font-weight: 750;
}

#training-payment-modal .training-payment-guide span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

#training-payment-modal .training-payment-guide svg {
    width: 15px;
    height: 15px;
}

#training-payment-modal .training-payment-guide kbd {
    min-width: 25px;
    padding: 3px 6px;
    color: #14532d;
    font: inherit;
    font-size: 10px;
    font-weight: 900;
    text-align: center;
    background: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.75);
    border-radius: 5px;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
}

#training-payment-modal .training-payment-close {
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

#training-payment-modal .training-payment-close:hover {
    background: rgba(255, 255, 255, 0.2);
}

#training-payment-modal .training-payment-close svg {
    width: 20px;
    height: 20px;
}

#training-payment-modal .training-payment-body {
    min-height: 0;
    overflow-y: auto;
    display: grid;
    gap: 14px;
    padding: 18px;
}

#training-payment-modal .training-payment-warning {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 12px 13px;
    color: #92400e;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 11px;
}

#training-payment-modal .training-payment-warning svg {
    width: 20px;
    height: 20px;
    margin-top: 1px;
}

#training-payment-modal .training-payment-warning strong,
#training-payment-modal .training-payment-warning span {
    display: block;
}

#training-payment-modal .training-payment-warning strong {
    font-size: 13px;
}

#training-payment-modal .training-payment-warning span {
    margin-top: 3px;
    font-size: 12px;
    line-height: 1.45;
}

#training-payment-modal .training-payment-section {
    padding: 16px;
    background: #ffffff;
    border: 1px solid #d9e1db;
    border-radius: 13px;
}

#training-payment-modal .training-payment-section-title {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 13px;
    padding-bottom: 11px;
    border-bottom: 1px solid #edf1ee;
}

#training-payment-modal .training-step {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    display: grid;
    place-items: center;
    color: #ffffff;
    font-size: 14px;
    font-weight: 900;
    background: #15803d;
    border-radius: 9px;
}

#training-payment-modal .training-payment-section-title strong {
    color: #101828;
    font-size: 17px;
}

#training-payment-modal .training-payment-choice-grid {
    display: grid;
    grid-template-columns:
        repeat(
            3,
            minmax(0, 1fr)
        );
    gap: 10px;
}

#training-payment-modal .training-payment-choice {
    position: relative;
    min-height: 118px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 11px;
    align-items: start;
    padding: 14px;
    text-align: left;
    color: #344054;
    background: #ffffff;
    border: 1px solid #cfd8d1;
    border-radius: 11px;
    cursor: pointer;
    transition:
        border-color 120ms ease,
        box-shadow 120ms ease,
        background 120ms ease,
        transform 120ms ease;
}

#training-payment-modal .training-payment-choice:hover,
#training-payment-modal .training-payment-choice.keyboard-active {
    border-color: #16a34a;
    box-shadow:
        0 0 0 3px rgba(22, 163, 74, 0.10);
}

#training-payment-modal .training-payment-choice.selected {
    color: #14532d;
    background: #f0fdf4;
    border-color: #16a34a;
}

#training-payment-modal .training-payment-choice:focus-visible {
    outline: 3px solid rgba(37, 99, 235, 0.26);
    outline-offset: 2px;
}

#training-payment-modal .training-payment-choice-icon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    color: #15803d;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 9px;
}

#training-payment-modal .training-payment-choice-icon svg {
    width: 21px;
    height: 21px;
}

#training-payment-modal .training-payment-choice-copy strong,
#training-payment-modal .training-payment-choice-copy span {
    display: block;
}

#training-payment-modal .training-payment-choice-copy strong {
    color: #101828;
    font-size: 14px;
}

#training-payment-modal .training-payment-choice-copy span {
    margin-top: 4px;
    color: #667085;
    font-size: 11px;
    line-height: 1.4;
}

#training-payment-modal .training-payment-selected-mark {
    position: absolute;
    top: 9px;
    right: 9px;
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    color: #ffffff;
    background: #15803d;
    border-radius: 999px;
}

#training-payment-modal .training-payment-selected-mark svg {
    width: 14px;
    height: 14px;
}

#training-payment-modal .training-payment-fields {
    display: grid;
    grid-template-columns:
        repeat(
            2,
            minmax(0, 1fr)
        );
    gap: 12px;
}

#training-payment-modal .training-payment-field {
    display: grid;
    gap: 6px;
}

#training-payment-modal .training-payment-field.full {
    grid-column: 1 / -1;
}

#training-payment-modal .training-payment-field span {
    color: #344054;
    font-size: 12px;
    font-weight: 800;
}

#training-payment-modal .training-payment-control {
    width: 100%;
    min-height: 43px;
    padding: 9px 11px;
    color: #101828;
    font: inherit;
    font-size: 13px;
    background: #ffffff;
    border: 1px solid #b8c5bb;
    border-radius: 9px;
    outline: none;
}

#training-payment-modal textarea.training-payment-control {
    min-height: 80px;
    resize: vertical;
}

#training-payment-modal .training-payment-control:focus {
    border-color: #16a34a;
    box-shadow:
        0 0 0 3px rgba(22, 163, 74, 0.10);
}

#training-payment-modal .training-payment-cart-note {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 12px;
    color: #475467;
    background: #f8faf9;
    border: 1px solid #e4e7ec;
    border-radius: 9px;
}

#training-payment-modal .training-payment-cart-note strong {
    color: #101828;
}

#training-payment-modal .training-payment-actions {
    display: flex;
    justify-content: flex-end;
    gap: 9px;
    padding: 13px 18px;
    background: #ffffff;
    border-top: 1px solid #d9e1db;
}

#training-payment-modal .training-payment-button {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 900;
    border-radius: 9px;
    cursor: pointer;
}

#training-payment-modal .training-payment-button svg {
    width: 17px;
    height: 17px;
}

#training-payment-modal .training-payment-button.secondary {
    color: #344054;
    background: #ffffff;
    border: 1px solid #cfd8d1;
}

#training-payment-modal .training-payment-button.primary {
    color: #ffffff;
    background: #15803d;
    border: 1px solid #15803d;
}

#training-payment-modal .training-payment-button.primary:hover {
    background: #166534;
}

@media (max-width: 720px) {
    #training-payment-modal {
        padding: 10px;
    }

    #training-payment-modal .training-payment-choice-grid,
    #training-payment-modal .training-payment-fields {
        grid-template-columns: 1fr;
    }

    #training-payment-modal .training-payment-actions {
        display: grid;
        grid-template-columns: 1fr;
    }
}
`;

export default function TrainingPaymentModal({
    isOpen,
    cart,
    onClose,
    onSubmit,
}: TrainingPaymentModalProps) {
    const [
        paymentMethod,
        setPaymentMethod,
    ] = useState<PosPaymentMethod>(
        'cash',
    );

    const [
        keyboardIndex,
        setKeyboardIndex,
    ] = useState(0);

    const [
        customerReference,
        setCustomerReference,
    ] = useState('');

    const [
        referenceNumber,
        setReferenceNumber,
    ] = useState('');

    const [
        notes,
        setNotes,
    ] = useState('');

    const [
        localError,
        setLocalError,
    ] = useState('');

    const choiceRefs =
        useRef<
            Array<
                HTMLButtonElement
                | null
            >
        >([]);

    const selectedIndex =
        useMemo(
            () =>
                Math.max(
                    0,
                    PAYMENT_CHOICES
                        .findIndex(
                            (
                                choice,
                            ) =>
                                choice.method
                                === paymentMethod,
                        ),
                ),
            [
                paymentMethod,
            ],
        );

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setPaymentMethod(
            'cash',
        );

        setKeyboardIndex(
            0,
        );

        setCustomerReference(
            '',
        );

        setReferenceNumber(
            '',
        );

        setNotes(
            '',
        );

        setLocalError(
            '',
        );

        const timeout =
            window.setTimeout(
                () => {
                    choiceRefs
                        .current[0]
                        ?.focus();
                },
                90,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
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

        return () => {
            document.body
                .style
                .overflow =
                previousOverflow;
        };
    }, [
        isOpen,
    ]);

    const selectIndex =
        (
            index: number,
        ): void => {
            const normalisedIndex =
                (
                    index
                    + PAYMENT_CHOICES
                        .length
                )
                % PAYMENT_CHOICES
                    .length;

            const choice =
                PAYMENT_CHOICES[
                normalisedIndex
                ];

            setKeyboardIndex(
                normalisedIndex,
            );

            setPaymentMethod(
                choice.method,
            );

            setLocalError('');

            window.setTimeout(
                () => {
                    choiceRefs
                        .current[
                        normalisedIndex
                    ]
                        ?.focus();
                },
                0,
            );
        };

    const moveChoice =
        (
            direction:
                1
                | -1,
        ): void => {
            selectIndex(
                keyboardIndex
                + direction,
            );
        };

    const handleChoiceKeyDown =
        (
            event:
                ReactKeyboardEvent<HTMLButtonElement>,
            index: number,
        ): void => {
            if (
                event.key
                === 'ArrowRight'
                || event.key
                === 'ArrowDown'
            ) {
                event.preventDefault();

                selectIndex(
                    index + 1,
                );

                return;
            }

            if (
                event.key
                === 'ArrowLeft'
                || event.key
                === 'ArrowUp'
            ) {
                event.preventDefault();

                selectIndex(
                    index - 1,
                );

                return;
            }

            if (
                event.key
                === 'Enter'
                || event.key
                === ' '
            ) {
                event.preventDefault();

                const choice =
                    PAYMENT_CHOICES[
                    index
                    ];

                setPaymentMethod(
                    choice.method,
                );

                setKeyboardIndex(
                    index,
                );

                return;
            }

            if (
                event.key
                === 'Escape'
            ) {
                event.preventDefault();

                onClose();
            }
        };

    const submit =
        (
            event:
                FormEvent<HTMLFormElement>,
        ): void => {
            event.preventDefault();

            if (
                cart.length === 0
            ) {
                setLocalError(
                    'Add at least one training item before continuing.',
                );

                return;
            }

            onSubmit({
                payment_method:
                    paymentMethod,

                customer_reference:
                    customerReference
                        .trim(),

                reference_number:
                    referenceNumber
                        .trim(),

                notes:
                    notes.trim(),
            });
        };

    if (!isOpen) {
        return null;
    }

    const paymentTitle =
        PAYMENT_CHOICES[
            selectedIndex
        ]?.title
        ?? 'Cash';

    return createPortal(
        <div
            id="training-payment-modal"
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

            <form
                className="training-payment-shell"
                role="dialog"
                aria-modal="true"
                aria-label="Training payment"
                onSubmit={
                    submit
                }
            >
                <header className="training-payment-header">
                    <div className="training-payment-heading">
                        <span className="training-payment-eyebrow">
                            Training Checkout
                        </span>

                        <h2 className="training-payment-title">
                            Payment Method
                        </h2>

                        <span className="training-payment-subtitle">
                            Practice the checkout flow without creating
                            a real payment transaction.
                        </span>

                        <div className="training-payment-guide">
                            <span>
                                <Icon name="keyboard" />

                                <kbd>↑ ↓</kbd>

                                <kbd>← →</kbd>

                                Move
                            </span>

                            <span>
                                <kbd>Enter</kbd>

                                Select
                            </span>

                            <span>
                                <kbd>Esc</kbd>

                                Close
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="training-payment-close"
                        aria-label="Close training payment"
                        onClick={
                            onClose
                        }
                    >
                        <Icon name="close" />
                    </button>
                </header>

                <div className="training-payment-body">
                    <div className="training-payment-warning">
                        <Icon name="alert" />

                        <div>
                            <strong>
                                Practice payment only
                            </strong>

                            <span>
                                No SalePayment record, customer due,
                                cashier collection, revenue, report value,
                                or stock movement will be created.
                            </span>
                        </div>
                    </div>

                    <section className="training-payment-section">
                        <div className="training-payment-section-title">
                            <span className="training-step">
                                1
                            </span>

                            <strong>
                                Select Payment Method
                            </strong>
                        </div>

                        <div className="training-payment-choice-grid">
                            {PAYMENT_CHOICES.map(
                                (
                                    choice,
                                    index,
                                ) => {
                                    const selected =
                                        paymentMethod
                                        === choice
                                            .method;

                                    const keyboardActive =
                                        keyboardIndex
                                        === index;

                                    return (
                                        <button
                                            key={
                                                choice
                                                    .method
                                            }
                                            ref={(
                                                node,
                                            ) => {
                                                choiceRefs
                                                    .current[
                                                    index
                                                ] =
                                                    node;
                                            }}
                                            type="button"
                                            className={[
                                                'training-payment-choice',

                                                selected
                                                    ? 'selected'
                                                    : '',

                                                keyboardActive
                                                    ? 'keyboard-active'
                                                    : '',
                                            ]
                                                .filter(
                                                    Boolean,
                                                )
                                                .join(
                                                    ' ',
                                                )}
                                            aria-pressed={
                                                selected
                                            }
                                            onFocus={() => {
                                                setKeyboardIndex(
                                                    index,
                                                );
                                            }}
                                            onMouseEnter={() => {
                                                setKeyboardIndex(
                                                    index,
                                                );
                                            }}
                                            onKeyDown={(
                                                event,
                                            ) => {
                                                handleChoiceKeyDown(
                                                    event,
                                                    index,
                                                );
                                            }}
                                            onClick={() => {
                                                setPaymentMethod(
                                                    choice
                                                        .method,
                                                );

                                                setKeyboardIndex(
                                                    index,
                                                );

                                                setLocalError(
                                                    '',
                                                );
                                            }}
                                        >
                                            <span className="training-payment-choice-icon">
                                                <Icon
                                                    name={
                                                        choice.icon
                                                    }
                                                />
                                            </span>

                                            <span className="training-payment-choice-copy">
                                                <strong>
                                                    {choice.title}
                                                </strong>

                                                <span>
                                                    {choice.description}
                                                </span>
                                            </span>

                                            {selected && (
                                                <span className="training-payment-selected-mark">
                                                    <Icon name="check" />
                                                </span>
                                            )}
                                        </button>
                                    );
                                },
                            )}
                        </div>
                    </section>

                    <section className="training-payment-section">
                        <div className="training-payment-section-title">
                            <span className="training-step">
                                2
                            </span>

                            <strong>
                                Bill Information
                            </strong>
                        </div>

                        <div className="training-payment-fields">
                            <label className="training-payment-field">
                                <span>
                                    Customer / Reference
                                    (optional)
                                </span>

                                <input
                                    type="text"
                                    className="training-payment-control"
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

                            <label className="training-payment-field">
                                <span>
                                    {paymentMethod
                                        === 'cash'
                                        ? 'Reference (optional)'
                                        : 'Payment Reference (optional)'}
                                </span>

                                <input
                                    type="text"
                                    className="training-payment-control"
                                    value={
                                        referenceNumber
                                    }
                                    maxLength={
                                        120
                                    }
                                    placeholder={
                                        paymentMethod
                                            === 'card'
                                            ? 'Card / terminal reference'
                                            : paymentMethod
                                                === 'bank_transfer'
                                                ? 'Transfer reference'
                                                : 'Practice reference'
                                    }
                                    onChange={(
                                        event,
                                    ) => {
                                        setReferenceNumber(
                                            event
                                                .target
                                                .value,
                                        );
                                    }}
                                />
                            </label>

                            <label className="training-payment-field full">
                                <span>
                                    Notes
                                    (optional)
                                </span>

                                <textarea
                                    className="training-payment-control"
                                    value={
                                        notes
                                    }
                                    maxLength={
                                        300
                                    }
                                    placeholder="Training checkout note"
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
                        </div>

                        <div className="training-payment-cart-note">
                            <span>
                                Training cart
                            </span>

                            <strong>
                                {cart.length}
                                {' '}
                                {cart.length
                                    === 1
                                    ? 'line'
                                    : 'lines'}
                                {' • '}
                                {paymentTitle}
                            </strong>
                        </div>
                    </section>

                    {localError && (
                        <div
                            className="training-payment-warning"
                            role="alert"
                        >
                            <Icon name="alert" />

                            <div>
                                <strong>
                                    Unable to continue
                                </strong>

                                <span>
                                    {localError}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="training-payment-actions">
                    <button
                        type="button"
                        className="training-payment-button secondary"
                        onClick={
                            onClose
                        }
                    >
                        Back to Cart
                    </button>

                    <button
                        type="submit"
                        className="training-payment-button primary"
                    >
                        <Icon name="receipt" />

                        Complete Training Checkout
                    </button>
                </footer>
            </form>
        </div>,
        document.body,
    );
}
