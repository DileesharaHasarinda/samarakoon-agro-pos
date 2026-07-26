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

    protected function prepareForValidation(): void
    {
        $reference =
            $this->input(
                'reference_number',
            );

        $notes =
            $this->input('notes');

        $paymentTerms =
            $this->input(
                'payment_terms',
            );

        $this->merge([
            'reference_number' =>
            is_string($reference)
                && trim($reference) !== ''
                ? trim($reference)
                : null,

            'notes' =>
            is_string($notes)
                && trim($notes) !== ''
                ? trim($notes)
                : null,

            'payment_terms' =>
            is_string($paymentTerms)
                && trim($paymentTerms) !== ''
                ? trim($paymentTerms)
                : null,
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'settlement_type' => [
                'required',

                Rule::in([
                    'full',
                    'partial',
                    'due',
                ]),
            ],

            'initial_paid_amount' => [
                'required',
                'numeric',
                'min:0',
            ],

            'payment_method' => [
                'nullable',

                Rule::in([
                    PurchasePayment::METHOD_CASH,
                    PurchasePayment::METHOD_CARD,
                    PurchasePayment::METHOD_BANK_TRANSFER,
                    PurchasePayment::METHOD_CHEQUE,
                ]),
            ],

            'due_date' => [
                'nullable',
                'date_format:Y-m-d',
            ],

            'payment_terms' => [
                'nullable',
                'string',
                'max:255',
            ],

            'reference_number' => [
                'nullable',
                'string',
                'max:160',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:1500',
            ],
        ];
    }

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

                if (
                    in_array(
                        $settlementType,
                        [
                            'full',
                            'partial',
                        ],
                        true,
                    )
                    && ! $this->input(
                        'payment_method',
                    )
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'payment_method',
                            'Select the initial payment method.',
                        );
                }

                if (
                    in_array(
                        $settlementType,
                        [
                            'partial',
                            'due',
                        ],
                        true,
                    )
                    && ! $this->input(
                        'due_date',
                    )
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'due_date',
                            'Enter the supplier payment due date.',
                        );
                }
            },
        ];
    }
}
