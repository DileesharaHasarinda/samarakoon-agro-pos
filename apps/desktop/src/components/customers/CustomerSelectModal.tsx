import {
    useEffect,
    useState,
} from 'react';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    getCustomerOptions,
} from '../../services/customerService';

import type {
    Customer,
} from '../../types/customer';

interface CustomerSelectModalProps {
    isOpen: boolean;
    selectedCustomer: Customer | null;
    onClose: () => void;

    onSelect: (
        customer: Customer | null,
    ) => void;
}

const currencyFormatter =
    new Intl.NumberFormat(
        'en-LK',
        {
            style: 'currency',
            currency: 'LKR',
        },
    );

export default function CustomerSelectModal({
    isOpen,
    selectedCustomer,
    onClose,
    onSelect,
}: CustomerSelectModalProps) {
    const {
        token,
    } = useAuth();

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        customers,
        setCustomers,
    ] = useState<Customer[]>([]);

    const [
        isLoading,
        setIsLoading,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    useEffect(() => {
        if (
            !isOpen
            || !token
        ) {
            return;
        }

        const timeout =
            window.setTimeout(
                async () => {
                    setIsLoading(true);
                    setErrorMessage('');

                    try {
                        const response =
                            await getCustomerOptions(
                                token,
                                search,
                            );

                        setCustomers(
                            response.data,
                        );
                    } catch (error) {
                        setErrorMessage(
                            error
                                instanceof ApiError
                                ? error.message
                                : 'Unable to load customers.',
                        );
                    } finally {
                        setIsLoading(false);
                    }
                },
                250,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [
        isOpen,
        search,
        token,
    ]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-backdrop">
            <section className="customer-select-modal">
                <header className="modal-header">
                    <div>
                        <span className="page-kicker">
                            POS customer
                        </span>

                        <h2>
                            Select Customer
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="modal-close-button"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="customer-select-content">
                    <input
                        type="search"
                        value={search}
                        placeholder="Search by name, mobile or code..."
                        onChange={(event) => {
                            setSearch(
                                event.target.value,
                            );
                        }}
                    />

                    <button
                        type="button"
                        className={
                            selectedCustomer === null
                                ? 'customer-option selected'
                                : 'customer-option'
                        }
                        onClick={() => {
                            onSelect(null);
                            onClose();
                        }}
                    >
                        <div>
                            <strong>
                                Walk-in Customer
                            </strong>

                            <span>
                                No customer account
                                or due facility
                            </span>
                        </div>
                    </button>

                    {errorMessage && (
                        <div className="form-alert">
                            {errorMessage}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="table-state">
                            Loading customers...
                        </div>
                    ) : (
                        <div className="customer-options-list">
                            {customers.map(
                                (customer) => (
                                    <button
                                        type="button"
                                        key={
                                            customer.id
                                        }
                                        className={
                                            selectedCustomer
                                                ?.id
                                                === customer.id
                                                ? 'customer-option selected'
                                                : 'customer-option'
                                        }
                                        onClick={() => {
                                            onSelect(
                                                customer,
                                            );

                                            onClose();
                                        }}
                                    >
                                        <div>
                                            <strong>
                                                {
                                                    customer
                                                        .name
                                                }
                                            </strong>

                                            <span>
                                                {customer.mobile
                                                    || customer
                                                        .customer_code}
                                            </span>
                                        </div>

                                        <div>
                                            <span>
                                                Current Due
                                            </span>

                                            <strong>
                                                {currencyFormatter
                                                    .format(
                                                        customer
                                                            .outstanding_due,
                                                    )}
                                            </strong>
                                        </div>
                                    </button>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}