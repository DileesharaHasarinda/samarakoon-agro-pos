import {
    useEffect,
    useRef,
} from 'react';

import type {
    FormEvent,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import type {
    ValidationErrors,
} from '../../types/auth';

interface CategoryFormModalProps {
    isOpen: boolean;
    isEditing: boolean;

    name: string;
    description: string;

    isSubmitting: boolean;
    errorMessage: string;
    fieldErrors: ValidationErrors;

    onNameChange: (
        value: string,
    ) => void;

    onDescriptionChange: (
        value: string,
    ) => void;

    onClose: () => void;

    onSubmit: (
        event: FormEvent<HTMLFormElement>,
    ) => void;
}

type IconName =
    | 'alert'
    | 'category'
    | 'close'
    | 'save';

function Icon({
    name,
}: {
    name: IconName;
}) {
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

    if (name === 'alert') {
        return (
            <svg {...props}>
                <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4M12 17h.01" />
            </svg>
        );
    }

    if (name === 'category') {
        return (
            <svg {...props}>
                <rect
                    x="3"
                    y="3"
                    width="7"
                    height="7"
                    rx="1"
                />

                <rect
                    x="14"
                    y="3"
                    width="7"
                    height="7"
                    rx="1"
                />

                <rect
                    x="3"
                    y="14"
                    width="7"
                    height="7"
                    rx="1"
                />

                <rect
                    x="14"
                    y="14"
                    width="7"
                    height="7"
                    rx="1"
                />
            </svg>
        );
    }

    if (name === 'save') {
        return (
            <svg {...props}>
                <path d="M5 3h11l3 3v15H5Z" />
                <path d="M8 3v6h8V3M8 21v-7h8v7" />
            </svg>
        );
    }

    return (
        <svg {...props}>
            <path d="m6 6 12 12M18 6 6 18" />
        </svg>
    );
}

const styles = `
#category-form-modal,
#category-form-modal *,
#category-form-modal *::before,
#category-form-modal *::after {
    box-sizing: border-box !important;
}

#category-form-modal {
    --cfm-green-900: #14532d;
    --cfm-green-800: #166534;
    --cfm-green-700: #15803d;
    --cfm-green-100: #dcfce7;
    --cfm-green-50: #f0fdf4;
    --cfm-red: #b42318;
    --cfm-red-50: #fef3f2;
    --cfm-text: #101828;
    --cfm-text-secondary: #344054;
    --cfm-muted: #667085;
    --cfm-border: #d0d9d2;
    --cfm-border-strong: #aebdb2;

    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;

    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: hidden !important;

    color: var(--cfm-text) !important;

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

#category-form-modal button,
#category-form-modal input,
#category-form-modal textarea {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#category-form-modal h2,
#category-form-modal p {
    margin: 0 !important;
}

#category-form-modal .cfm-backdrop {
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

#category-form-modal .cfm-dialog {
    display: flex !important;

    width: min(620px, 100%) !important;
    max-height:
        calc(100dvh - 40px) !important;

    min-width: 0 !important;
    min-height: 0 !important;

    flex-direction: column !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--cfm-border) !important;

    border-radius: 16px !important;

    box-shadow:
        0 28px 72px
        rgba(0, 0, 0, 0.34) !important;
}

#category-form-modal .cfm-header {
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
            var(--cfm-green-900),
            var(--cfm-green-700)
        ) !important;
}

#category-form-modal .cfm-header-main {
    display: flex !important;

    min-width: 0 !important;
    flex: 1 !important;

    align-items: center !important;
    gap: 11px !important;
}

#category-form-modal .cfm-header-icon {
    display: grid !important;

    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;

    place-items: center !important;

    color: var(--cfm-green-900) !important;

    background: #ffffff !important;

    border-radius: 10px !important;
}

#category-form-modal .cfm-header-icon svg {
    width: 20px !important;
    height: 20px !important;
}

#category-form-modal .cfm-header-copy {
    min-width: 0 !important;
}

#category-form-modal .cfm-kicker {
    display: block !important;

    margin-bottom: 2px !important;

    color: #bbf7d0 !important;

    font-size: 11px !important;
    font-weight: 750 !important;
    letter-spacing: 0.055em !important;

    text-transform: uppercase !important;
}

#category-form-modal .cfm-title {
    overflow: hidden !important;

    color: #ffffff !important;

    font-size: 21px !important;
    font-weight: 740 !important;
    line-height: 1.25 !important;
    letter-spacing: -0.02em !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

#category-form-modal .cfm-close {
    display: grid !important;

    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;

    place-items: center !important;

    padding: 0 !important;

    color: #ffffff !important;

    background:
        rgba(
            255,
            255,
            255,
            0.12
        ) !important;

    border:
        1px solid
        rgba(
            255,
            255,
            255,
            0.34
        ) !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#category-form-modal
.cfm-close:hover:not(:disabled) {
    background:
        rgba(
            255,
            255,
            255,
            0.22
        ) !important;
}

#category-form-modal .cfm-close:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

#category-form-modal .cfm-close svg {
    width: 19px !important;
    height: 19px !important;
}

#category-form-modal .cfm-form {
    display: flex !important;

    min-height: 0 !important;
    flex: 1 !important;

    flex-direction: column !important;

    overflow: hidden !important;
}

#category-form-modal .cfm-body {
    display: flex !important;

    min-height: 0 !important;
    flex: 1 !important;

    flex-direction: column !important;
    gap: 15px !important;

    padding: 18px !important;

    overflow-x: hidden !important;
    overflow-y: auto !important;

    background: #f5f8f6 !important;

    scrollbar-width: thin !important;

    scrollbar-color:
        #9cad9f
        #eaf0eb !important;
}

#category-form-modal .cfm-intro {
    color: var(--cfm-muted) !important;
    font-size: 13px !important;
}

#category-form-modal .cfm-alert {
    display: flex !important;

    align-items: flex-start !important;
    gap: 9px !important;

    padding: 10px 12px !important;

    color: var(--cfm-red) !important;

    font-size: 13px !important;
    font-weight: 600 !important;

    background: var(--cfm-red-50) !important;

    border:
        1px solid
        #f3b5af !important;

    border-radius: 9px !important;
}

#category-form-modal .cfm-alert svg {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;

    margin-top: 1px !important;
}

#category-form-modal .cfm-field {
    display: grid !important;
    gap: 6px !important;
}

#category-form-modal .cfm-field-header {
    display: flex !important;

    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
}

#category-form-modal .cfm-label {
    color:
        var(
            --cfm-text-secondary
        ) !important;

    font-size: 13px !important;
    font-weight: 650 !important;
}

#category-form-modal .cfm-required {
    color: var(--cfm-red) !important;
}

#category-form-modal .cfm-counter {
    color: var(--cfm-muted) !important;

    font-size: 11px !important;
    font-weight: 500 !important;
}

#category-form-modal .cfm-input,
#category-form-modal .cfm-textarea {
    display: block !important;

    width: 100% !important;
    min-width: 0 !important;

    color: var(--cfm-text) !important;

    font-size: 14px !important;
    font-weight: 500 !important;

    outline: none !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--cfm-border-strong) !important;

    border-radius: 9px !important;

    box-shadow: none !important;
}

#category-form-modal .cfm-input {
    height: 44px !important;
    min-height: 44px !important;

    padding: 0 11px !important;
}

#category-form-modal .cfm-textarea {
    min-height: 124px !important;

    padding: 10px 11px !important;

    line-height: 1.5 !important;

    resize: vertical !important;
}

#category-form-modal .cfm-input::placeholder,
#category-form-modal .cfm-textarea::placeholder {
    color: #7a8696 !important;
    opacity: 1 !important;
}

#category-form-modal .cfm-input.has-error,
#category-form-modal .cfm-textarea.has-error {
    border-color: var(--cfm-red) !important;
}

#category-form-modal .cfm-input:disabled,
#category-form-modal .cfm-textarea:disabled {
    color: #667085 !important;
    background: #f2f4f7 !important;
    cursor: not-allowed !important;
}

#category-form-modal .cfm-input:focus,
#category-form-modal .cfm-textarea:focus,
#category-form-modal button:focus-visible {
    outline: none !important;

    border-color:
        var(--cfm-green-700) !important;

    box-shadow:
        0 0 0 4px
        rgba(
            21,
            128,
            61,
            0.14
        ) !important;
}

#category-form-modal .cfm-field-error {
    display: flex !important;

    align-items: flex-start !important;
    gap: 5px !important;

    color: var(--cfm-red) !important;

    font-size: 12px !important;
    font-weight: 550 !important;
}

#category-form-modal .cfm-field-error::before {
    content: "•" !important;
    font-weight: 800 !important;
}

#category-form-modal .cfm-actions {
    display: flex !important;

    min-height: 68px !important;
    flex: 0 0 auto !important;

    align-items: center !important;
    justify-content: flex-end !important;
    gap: 9px !important;

    padding: 12px 18px !important;

    background: #ffffff !important;

    border-top:
        1px solid
        var(--cfm-border) !important;
}

#category-form-modal .cfm-button {
    display: inline-flex !important;

    min-height: 42px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;

    padding: 8px 13px !important;

    font-size: 13px !important;
    font-weight: 700 !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#category-form-modal .cfm-cancel {
    color:
        var(
            --cfm-text-secondary
        ) !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--cfm-border-strong) !important;
}

#category-form-modal .cfm-submit {
    color: #ffffff !important;

    background:
        var(--cfm-green-700) !important;

    border:
        1px solid
        var(--cfm-green-700) !important;

    box-shadow:
        0 4px 12px
        rgba(
            21,
            128,
            61,
            0.18
        ) !important;
}

#category-form-modal
.cfm-submit:hover:not(:disabled) {
    background:
        var(--cfm-green-800) !important;

    border-color:
        var(--cfm-green-800) !important;
}

#category-form-modal .cfm-button:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

#category-form-modal .cfm-button svg {
    width: 17px !important;
    height: 17px !important;
}

#category-form-modal .cfm-spinner {
    width: 16px !important;
    height: 16px !important;

    border:
        2px solid
        rgba(
            255,
            255,
            255,
            0.45
        ) !important;

    border-top-color: #ffffff !important;
    border-radius: 50% !important;

    animation:
        cfm-spin
        700ms
        linear
        infinite !important;
}

@keyframes cfm-spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 640px) {
    #category-form-modal .cfm-backdrop {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    #category-form-modal .cfm-dialog {
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

    #category-form-modal .cfm-header {
        min-height: 76px !important;
        padding: 13px 14px !important;
    }

    #category-form-modal .cfm-header-icon {
        width: 36px !important;
        height: 36px !important;
        min-width: 36px !important;
    }

    #category-form-modal .cfm-title {
        font-size: 19px !important;
    }

    #category-form-modal .cfm-body {
        padding: 14px !important;
    }

    #category-form-modal .cfm-actions {
        display: grid !important;

        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            ) !important;

        padding: 11px 13px !important;
    }

    #category-form-modal .cfm-button {
        width: 100% !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #category-form-modal *,
    #category-form-modal *::before,
    #category-form-modal *::after {
        transition: none !important;
        scroll-behavior: auto !important;
    }

    #category-form-modal .cfm-spinner {
        animation-duration: 1.2s !important;
    }
}
`;

export default function CategoryFormModal({
    isOpen,
    isEditing,
    name,
    description,
    isSubmitting,
    errorMessage,
    fieldErrors,
    onNameChange,
    onDescriptionChange,
    onClose,
    onSubmit,
}: CategoryFormModalProps) {
    const nameInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const onCloseRef =
        useRef(onClose);

    const isSubmittingRef =
        useRef(isSubmitting);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        isSubmittingRef.current =
            isSubmitting;
    }, [isSubmitting]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow =
            document.body.style.overflow;

        const previouslyFocused =
            document.activeElement
                instanceof HTMLElement
                ? document.activeElement
                : null;

        document.body.style.overflow =
            'hidden';

        const focusTimer =
            window.setTimeout(
                () => {
                    nameInputRef.current
                        ?.focus();

                    // Runs only once when modal opens.
                    nameInputRef.current
                        ?.select();
                },
                80,
            );

        const handleKeyDown = (
            event: KeyboardEvent,
        ): void => {
            if (
                event.key === 'Escape'
                && !isSubmittingRef.current
            ) {
                onCloseRef.current();
            }
        };

        window.addEventListener(
            'keydown',
            handleKeyDown,
        );

        return () => {
            window.clearTimeout(
                focusTimer,
            );

            document.body.style.overflow =
                previousOverflow;

            window.removeEventListener(
                'keydown',
                handleKeyDown,
            );

            previouslyFocused?.focus();
        };
    }, [isOpen]);

    if (
        !isOpen
        || typeof document === 'undefined'
    ) {
        return null;
    }

    const nameError =
        fieldErrors.name?.[0];

    const descriptionError =
        fieldErrors.description?.[0];

    return createPortal(
        <div id="category-form-modal">
            <style>
                {styles}
            </style>

            <div
                className="cfm-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                    if (
                        event.target
                        === event.currentTarget
                        && !isSubmitting
                    ) {
                        onClose();
                    }
                }}
            >
                <section
                    className="cfm-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="category-form-title"
                    aria-describedby="category-form-description"
                >
                    <header className="cfm-header">
                        <div className="cfm-header-main">
                            <span className="cfm-header-icon">
                                <Icon name="category" />
                            </span>

                            <div className="cfm-header-copy">
                                <span className="cfm-kicker">
                                    Category Management
                                </span>

                                <h2
                                    id="category-form-title"
                                    className="cfm-title"
                                >
                                    {isEditing
                                        ? 'Edit Category'
                                        : 'Create Category'}
                                </h2>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="cfm-close"
                            aria-label="Close category form"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            <Icon name="close" />
                        </button>
                    </header>

                    <form
                        className="cfm-form"
                        noValidate
                        onSubmit={onSubmit}
                    >
                        <div className="cfm-body">
                            <p
                                id="category-form-description"
                                className="cfm-intro"
                            >
                                {isEditing
                                    ? 'Update the category name or description used to organise products.'
                                    : 'Create a category to organise related products throughout the POS system.'}
                            </p>

                            {errorMessage && (
                                <div
                                    className="cfm-alert"
                                    role="alert"
                                >
                                    <Icon name="alert" />

                                    <span>
                                        {errorMessage}
                                    </span>
                                </div>
                            )}

                            <label className="cfm-field">
                                <span className="cfm-field-header">
                                    <span className="cfm-label">
                                        Category Name

                                        <span className="cfm-required">
                                            {' '}*
                                        </span>
                                    </span>

                                    <span className="cfm-counter">
                                        {name.length}/120
                                    </span>
                                </span>

                                <input
                                    ref={nameInputRef}
                                    type="text"
                                    className={
                                        nameError
                                            ? 'cfm-input has-error'
                                            : 'cfm-input'
                                    }
                                    value={name}
                                    maxLength={120}
                                    autoComplete="off"
                                    disabled={isSubmitting}
                                    placeholder="Example: Fertilisers"
                                    aria-invalid={
                                        Boolean(
                                            nameError,
                                        )
                                    }
                                    aria-describedby={
                                        nameError
                                            ? 'category-name-error'
                                            : undefined
                                    }
                                    onChange={(event) => {
                                        onNameChange(
                                            event.target.value,
                                        );
                                    }}
                                />

                                {nameError && (
                                    <p
                                        id="category-name-error"
                                        className="cfm-field-error"
                                    >
                                        {nameError}
                                    </p>
                                )}
                            </label>

                            <label className="cfm-field">
                                <span className="cfm-field-header">
                                    <span className="cfm-label">
                                        Description
                                    </span>

                                    <span className="cfm-counter">
                                        {description.length}/1000
                                    </span>
                                </span>

                                <textarea
                                    className={
                                        descriptionError
                                            ? 'cfm-textarea has-error'
                                            : 'cfm-textarea'
                                    }
                                    value={description}
                                    maxLength={1000}
                                    rows={5}
                                    disabled={isSubmitting}
                                    placeholder="Enter a clear description for this category"
                                    aria-invalid={
                                        Boolean(
                                            descriptionError,
                                        )
                                    }
                                    aria-describedby={
                                        descriptionError
                                            ? 'category-description-error'
                                            : undefined
                                    }
                                    onChange={(event) => {
                                        onDescriptionChange(
                                            event.target.value,
                                        );
                                    }}
                                />

                                {descriptionError && (
                                    <p
                                        id="category-description-error"
                                        className="cfm-field-error"
                                    >
                                        {descriptionError}
                                    </p>
                                )}
                            </label>
                        </div>

                        <footer className="cfm-actions">
                            <button
                                type="button"
                                className="cfm-button cfm-cancel"
                                disabled={isSubmitting}
                                onClick={onClose}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="cfm-button cfm-submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="cfm-spinner" />
                                ) : (
                                    <Icon name="save" />
                                )}

                                {isSubmitting
                                    ? 'Saving Category...'
                                    : isEditing
                                        ? 'Update Category'
                                        : 'Create Category'}
                            </button>
                        </footer>
                    </form>
                </section>
            </div>
        </div>,
        document.body,
    );
}