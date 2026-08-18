<?php

namespace App\Http\Requests\Purchase;

use App\Models\PurchasePayment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ConfigurePurchaseSettlementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /*
     * =====================================================
     * PREPARE INPUT
     * =====================================================
     */

    protected function prepareForValidation(): void
    {
        /*
         * Due date is OPTIONAL.
         *
         * Convert:
         *
         * ""
         *
         * into:
         *
         * null
         */
        $dueDate =
            $this->input(
                'due_date',
            );

        $paymentTerms =
            $this->input(
                'payment_terms',
            );

        /*
         * Clean each individual split-payment
         * reference and notes value.
         */
        $payments =
            $this->input(
                'payments',
                [],
            );

        if (
            !is_array(
                $payments,
            )
        ) {
            $payments = [];
        }

        $cleanPayments =
            collect(
                $payments,
            )
            ->map(
                function (
                    mixed $payment,
                ): mixed {
                    if (
                        !is_array(
                            $payment,
                        )
                    ) {
                        return $payment;
                    }

                    $reference =
                        $payment['reference_number']
                        ?? null;

                    $notes =
                        $payment['notes']
                        ?? null;

                    return [
                        ...$payment,

                        'reference_number' =>
                        is_string(
                            $reference,
                        )
                            && trim(
                                $reference,
                            ) !== ''
                            ? trim(
                                $reference,
                            )
                            : null,

                        'notes' =>
                        is_string(
                            $notes,
                        )
                            && trim(
                                $notes,
                            ) !== ''
                            ? trim(
                                $notes,
                            )
                            : null,
                    ];
                },
            )
            ->values()
            ->all();

        $this->merge([
            'due_date' =>
            is_string(
                $dueDate,
            )
                && trim(
                    $dueDate,
                ) !== ''
                ? trim(
                    $dueDate,
                )
                : null,

            'payment_terms' =>
            is_string(
                $paymentTerms,
            )
                && trim(
                    $paymentTerms,
                ) !== ''
                ? trim(
                    $paymentTerms,
                )
                : null,

            'payments' =>
            $cleanPayments,
        ]);
    }

    /*
     * =====================================================
     * VALIDATION RULES
     * =====================================================
     */

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            /*
             * full
             * partial
             * due
             */
            'settlement_type' => [
                'required',

                Rule::in([
                    'full',
                    'partial',
                    'due',
                ]),
            ],

            /*
             * Multiple payments are supported.
             *
             * Example:
             *
             * Cash    2500
             * Cheque  2500
             */
            'payments' => [
                'nullable',
                'array',
                'max:10',
            ],

            'payments.*.payment_method' => [
                'required',

                Rule::in(
                    PurchasePayment::PAYMENT_METHODS,
                ),
            ],

            'payments.*.amount' => [
                'required',
                'numeric',
                'min:0.01',
                'max:999999999999.99',
            ],

            'payments.*.reference_number' => [
                'nullable',
                'string',
                'max:160',
            ],

            'payments.*.notes' => [
                'nullable',
                'string',
                'max:1500',
            ],

            /*
             * IMPORTANT:
             *
             * Due date is now OPTIONAL.
             */
            'due_date' => [
                'nullable',
                'date_format:Y-m-d',
            ],

            'payment_terms' => [
                'nullable',
                'string',
                'max:255',
            ],
        ];
    }

    /*
     * =====================================================
     * BUSINESS VALIDATION
     * =====================================================
     */

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (
                Validator $validator,
            ): void {
                $settlementType =
                    $this->input(
                        'settlement_type',
                    );

                $payments =
                    $this->input(
                        'payments',
                        [],
                    );

                if (
                    !is_array(
                        $payments,
                    )
                ) {
                    $payments = [];
                }

                /*
                 * Count valid positive payment lines.
                 */
                $positivePayments =
                    collect(
                        $payments,
                    )
                    ->filter(
                        function (
                            mixed $payment,
                        ): bool {
                            if (
                                !is_array(
                                    $payment,
                                )
                            ) {
                                return false;
                            }

                            $amount =
                                $payment['amount']
                                ?? null;

                            return (
                                is_numeric(
                                    $amount,
                                )
                                && (float) $amount
                                > 0
                            );
                        },
                    );

                /*
                 * Fully Paid and Partial Payment
                 * must have at least one payment
                 * method.
                 */
                if (
                    in_array(
                        $settlementType,
                        [
                            'full',
                            'partial',
                        ],
                        true,
                    )
                    && $positivePayments
                    ->isEmpty()
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'payments',
                            'Add at least one payment method.',
                        );
                }

                /*
                 * Entirely on Credit means:
                 *
                 * Paid now = Rs.0
                 *
                 * Therefore payment rows are not
                 * allowed.
                 */
                if (
                    $settlementType
                    === 'due'
                    && $positivePayments
                    ->isNotEmpty()
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'payments',
                            'An entirely-on-credit settlement cannot contain an initial payment.',
                        );
                }

                /*
                 * IMPORTANT:
                 *
                 * There is intentionally NO
                 * due_date-required validation here.
                 *
                 * Partial:
                 * due_date can be null.
                 *
                 * Due:
                 * due_date can be null.
                 */
            },
        ];
    }
}
