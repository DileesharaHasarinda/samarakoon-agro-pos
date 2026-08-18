<?php

namespace App\Http\Requests\Purchase;

use App\Models\PurchasePayment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSupplierPaymentRequest extends FormRequest
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
         * Clean reference / notes for each
         * individual payment line.
         */
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
            'payments' =>
            $cleanPayments,
        ]);
    }

    /*
     * =====================================================
     * VALIDATION
     * =====================================================
     */

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            /*
             * At least one payment method must
             * be supplied.
             */
            'payments' => [
                'required',
                'array',
                'min:1',
                'max:10',
            ],

            /*
             * Cash / Card / Bank / Cheque.
             */
            'payments.*.payment_method' => [
                'required',

                Rule::in(
                    PurchasePayment::PAYMENT_METHODS,
                ),
            ],

            /*
             * Each payment line requires its
             * own positive amount.
             */
            'payments.*.amount' => [
                'required',
                'numeric',
                'min:0.01',
                'max:999999999999.99',
            ],

            /*
             * Useful particularly for:
             *
             * Cheque number
             * Bank transfer reference
             * Card receipt reference
             */
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
        ];
    }
}
