import type {
    Purchase,
} from '../../types/purchase';

interface DeletePurchaseModalProps {
    purchase: Purchase | null;
    isDeleting: boolean;
    errorMessage: string;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function DeletePurchaseModal({
    purchase,
    isDeleting,
    errorMessage,
    onCancel,
    onConfirm,
}: DeletePurchaseModalProps) {
    if (!purchase) {
        return null;
    }

    return (
        <div className="modal-backdrop">
            <section className="delete-modal">
                <div className="delete-modal-icon">
                    !
                </div>

                <h2>Delete Draft Purchase?</h2>

                <p>
                    You are about to permanently
                    delete{' '}
                    <strong>
                        {purchase.purchase_number}
                    </strong>
                    .
                </p>

                <p className="delete-warning">
                    Only draft purchases can be
                    deleted.
                </p>

                {errorMessage && (
                    <div className="form-alert">
                        {errorMessage}
                    </div>
                )}

                <footer className="modal-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        disabled={isDeleting}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="danger-button"
                        disabled={isDeleting}
                        onClick={onConfirm}
                    >
                        {isDeleting
                            ? 'Deleting...'
                            : 'Delete Draft'}
                    </button>
                </footer>
            </section>
        </div>
    );
}