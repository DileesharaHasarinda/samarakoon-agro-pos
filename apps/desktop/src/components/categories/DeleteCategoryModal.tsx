import {
    useEffect,
    useRef,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import type {
    Category,
} from '../../types/category';

interface DeleteCategoryModalProps {
    category: Category | null;
    isDeleting: boolean;
    errorMessage: string;

    onCancel: () => void;
    onConfirm: () => void;
}

function Icon({
    name,
}: {
    name:
    | 'alert'
    | 'close'
    | 'trash';
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

    if (name === 'trash') {
        return (
            <svg {...props}>
                <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6M10 11v5M14 11v5" />
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
#delete-category-modal,
#delete-category-modal *,
#delete-category-modal *::before,
#delete-category-modal *::after {
    box-sizing: border-box !important;
}

#delete-category-modal {
    --dcm-red-800: #912018;
    --dcm-red-700: #b42318;
    --dcm-red-600: #d92d20;
    --dcm-red-100: #fee4e2;
    --dcm-red-50: #fef3f2;
    --dcm-text: #101828;
    --dcm-text-secondary: #344054;
    --dcm-muted: #667085;
    --dcm-border: #d0d5dd;

    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483647 !important;

    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: hidden !important;

    color: var(--dcm-text) !important;

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

#delete-category-modal button {
    font: inherit !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}

#delete-category-modal h2,
#delete-category-modal p {
    margin: 0 !important;
}

#delete-category-modal .dcm-backdrop {
    position: absolute !important;
    inset: 0 !important;

    display: flex !important;

    align-items: center !important;
    justify-content: center !important;

    padding: 20px !important;

    overflow: auto !important;

    background:
        rgba(
            19,
            10,
            9,
            0.68
        ) !important;

    backdrop-filter: blur(4px) !important;
}

#delete-category-modal .dcm-dialog {
    position: relative !important;

    display: flex !important;

    width: min(460px, 100%) !important;

    flex-direction: column !important;
    align-items: stretch !important;

    padding: 22px !important;

    overflow: hidden !important;

    background: #ffffff !important;

    border:
        1px solid
        #f2b8b3 !important;

    border-radius: 16px !important;

    box-shadow:
        0 28px 72px
        rgba(0, 0, 0, 0.34) !important;
}

#delete-category-modal .dcm-close {
    position: absolute !important;
    top: 12px !important;
    right: 12px !important;

    display: grid !important;

    width: 36px !important;
    height: 36px !important;

    place-items: center !important;

    padding: 0 !important;

    color: var(--dcm-muted) !important;

    background: #f9fafb !important;

    border:
        1px solid
        var(--dcm-border) !important;

    border-radius: 8px !important;

    cursor: pointer !important;
}

#delete-category-modal
.dcm-close:hover:not(:disabled) {
    color: var(--dcm-text) !important;
    background: #f2f4f7 !important;
}

#delete-category-modal .dcm-close:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

#delete-category-modal .dcm-close svg {
    width: 17px !important;
    height: 17px !important;
}

#delete-category-modal .dcm-icon {
    display: grid !important;

    width: 52px !important;
    height: 52px !important;

    place-items: center !important;

    margin-bottom: 14px !important;

    color: var(--dcm-red-700) !important;

    background: var(--dcm-red-50) !important;

    border:
        1px solid
        #f3b5af !important;

    border-radius: 12px !important;
}

#delete-category-modal .dcm-icon svg {
    width: 25px !important;
    height: 25px !important;
}

#delete-category-modal .dcm-title {
    padding-right: 32px !important;

    color: var(--dcm-text) !important;

    font-size: 20px !important;
    font-weight: 740 !important;
    line-height: 1.3 !important;
    letter-spacing: -0.015em !important;
}

#delete-category-modal .dcm-message {
    margin-top: 8px !important;

    color: var(--dcm-muted) !important;

    font-size: 13px !important;
    line-height: 1.55 !important;
}

#delete-category-modal .dcm-category {
    display: block !important;

    margin-top: 12px !important;
    padding: 10px 11px !important;

    overflow: hidden !important;

    color:
        var(
            --dcm-text-secondary
        ) !important;

    font-size: 13px !important;
    font-weight: 700 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;

    background: #f9fafb !important;

    border:
        1px solid
        var(--dcm-border) !important;

    border-radius: 9px !important;
}

#delete-category-modal .dcm-warning {
    display: flex !important;

    align-items: flex-start !important;
    gap: 8px !important;

    margin-top: 12px !important;
    padding: 9px 10px !important;

    color: var(--dcm-red-800) !important;

    font-size: 12px !important;
    font-weight: 600 !important;

    background: var(--dcm-red-50) !important;

    border:
        1px solid
        #f3b5af !important;

    border-radius: 8px !important;
}

#delete-category-modal .dcm-warning svg {
    width: 17px !important;
    height: 17px !important;
    min-width: 17px !important;

    margin-top: 1px !important;
}

#delete-category-modal .dcm-error {
    display: flex !important;

    align-items: flex-start !important;
    gap: 8px !important;

    margin-top: 12px !important;
    padding: 10px 11px !important;

    color: var(--dcm-red-700) !important;

    font-size: 12px !important;
    font-weight: 600 !important;

    background: #ffffff !important;

    border:
        1px solid
        #e9a9a3 !important;

    border-radius: 8px !important;
}

#delete-category-modal .dcm-error svg {
    width: 17px !important;
    height: 17px !important;
    min-width: 17px !important;

    margin-top: 1px !important;
}

#delete-category-modal .dcm-actions {
    display: grid !important;

    grid-template-columns:
        repeat(
            2,
            minmax(0, 1fr)
        ) !important;

    gap: 9px !important;

    margin-top: 20px !important;
}

#delete-category-modal .dcm-button {
    display: inline-flex !important;

    min-height: 42px !important;

    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;

    padding: 8px 12px !important;

    font-size: 13px !important;
    font-weight: 700 !important;

    border-radius: 9px !important;

    cursor: pointer !important;
}

#delete-category-modal .dcm-cancel {
    color:
        var(
            --dcm-text-secondary
        ) !important;

    background: #ffffff !important;

    border:
        1px solid
        var(--dcm-border) !important;
}

#delete-category-modal .dcm-delete {
    color: #ffffff !important;

    background: var(--dcm-red-600) !important;

    border:
        1px solid
        var(--dcm-red-600) !important;

    box-shadow:
        0 4px 12px
        rgba(
            217,
            45,
            32,
            0.18
        ) !important;
}

#delete-category-modal
.dcm-delete:hover:not(:disabled) {
    background: var(--dcm-red-800) !important;
    border-color: var(--dcm-red-800) !important;
}

#delete-category-modal .dcm-button:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

#delete-category-modal .dcm-button svg {
    width: 17px !important;
    height: 17px !important;
}

#delete-category-modal .dcm-spinner {
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
        dcm-spin
        700ms
        linear
        infinite !important;
}

@keyframes dcm-spin {
    to {
        transform: rotate(360deg);
    }
}

#delete-category-modal button:focus-visible {
    outline: none !important;

    box-shadow:
        0 0 0 4px
        rgba(
            217,
            45,
            32,
            0.14
        ) !important;
}

@media (max-width: 520px) {
    #delete-category-modal .dcm-backdrop {
        align-items: flex-end !important;
        padding: 0 !important;
    }

    #delete-category-modal .dcm-dialog {
        width: 100% !important;

        padding: 20px 16px 16px !important;

        border-right: 0 !important;
        border-bottom: 0 !important;
        border-left: 0 !important;

        border-radius:
            16px
            16px
            0
            0 !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    #delete-category-modal *,
    #delete-category-modal *::before,
    #delete-category-modal *::after {
        transition: none !important;
        scroll-behavior: auto !important;
    }

    #delete-category-modal .dcm-spinner {
        animation-duration: 1.2s !important;
    }
}
`;

export default function DeleteCategoryModal({
    category,
    isDeleting,
    errorMessage,
    onCancel,
    onConfirm,
}: DeleteCategoryModalProps) {
    const cancelButtonRef =
        useRef<HTMLButtonElement | null>(
            null,
        );

    useEffect(() => {
        if (!category) {
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
                    cancelButtonRef.current
                        ?.focus();
                },
                80,
            );

        const handleKeyDown = (
            event: KeyboardEvent,
        ): void => {
            if (
                event.key === 'Escape'
                && !isDeleting
            ) {
                onCancel();
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
    }, [
        category,
        isDeleting,
        onCancel,
    ]);

    if (
        !category
        || typeof document === 'undefined'
    ) {
        return null;
    }

    return createPortal(
        <div id="delete-category-modal">
            <style>
                {styles}
            </style>

            <div
                className="dcm-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                    if (
                        event.target
                        === event.currentTarget
                        && !isDeleting
                    ) {
                        onCancel();
                    }
                }}
            >
                <section
                    className="dcm-dialog"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="delete-category-title"
                    aria-describedby="delete-category-description"
                >
                    <button
                        type="button"
                        className="dcm-close"
                        aria-label="Close delete category confirmation"
                        disabled={isDeleting}
                        onClick={onCancel}
                    >
                        <Icon name="close" />
                    </button>

                    <div className="dcm-icon">
                        <Icon name="trash" />
                    </div>

                    <h2
                        id="delete-category-title"
                        className="dcm-title"
                    >
                        Delete Category?
                    </h2>

                    <p
                        id="delete-category-description"
                        className="dcm-message"
                    >
                        You are about to permanently
                        delete the following category:
                    </p>

                    <strong
                        className="dcm-category"
                        title={category.name}
                    >
                        {category.name}
                    </strong>

                    <div className="dcm-warning">
                        <Icon name="alert" />

                        <span>
                            This action cannot be undone.
                        </span>
                    </div>

                    {errorMessage && (
                        <div
                            className="dcm-error"
                            role="alert"
                        >
                            <Icon name="alert" />

                            <span>
                                {errorMessage}
                            </span>
                        </div>
                    )}

                    <footer className="dcm-actions">
                        <button
                            ref={cancelButtonRef}
                            type="button"
                            className="dcm-button dcm-cancel"
                            disabled={isDeleting}
                            onClick={onCancel}
                        >
                            Keep Category
                        </button>

                        <button
                            type="button"
                            className="dcm-button dcm-delete"
                            disabled={isDeleting}
                            onClick={onConfirm}
                        >
                            {isDeleting ? (
                                <span className="dcm-spinner" />
                            ) : (
                                <Icon name="trash" />
                            )}

                            {isDeleting
                                ? 'Deleting...'
                                : 'Delete Category'}
                        </button>
                    </footer>
                </section>
            </div>
        </div>,
        document.body,
    );
}