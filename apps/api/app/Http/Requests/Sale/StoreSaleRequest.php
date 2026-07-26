<?php

namespace App\Http\Requests\Sale;

use App\Models\Sale;
use App\Models\SalePayment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreSaleRequest extends FormRequest
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

        $items = collect(
            $this->input('items', []),
        )
            ->map(
                function (
                    mixed $item,
                ): array {
                    $item =
                        is_array($item)
                        ? $item
                        : [];

                    return [
                        ...$item,

                        'discount' =>
                        $item['discount']
                            ?? 0,
                    ];
                },
            )
            ->all();

        $this->merge([
            'customer_id' =>
            $this->filled(
                'customer_id',
            )
                ? (int) $this->input(
                    'customer_id',
                )
                : null,

            'amount_received' =>
            $this->input(
                'amount_received',
                0,
            ),

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

            'items' =>
            $items,
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'customer_id' => [
                'nullable',
                'integer',
                'exists:customers,id',
            ],

            'settlement_type' => [
                'required',

                Rule::in([
                    Sale::SETTLEMENT_FULL,
                    Sale::SETTLEMENT_PARTIAL,
                    Sale::SETTLEMENT_DUE,
                ]),
            ],

            'payment_method' => [
                'nullable',

                Rule::in([
                    SalePayment::METHOD_CASH,
                    SalePayment::METHOD_CARD,
                    SalePayment::METHOD_BANK_TRANSFER,
                ]),
            ],

            'amount_received' => [
                'required',
                'numeric',
                'min:0',
            ],

            'due_date' => [
                'nullable',
                'date_format:Y-m-d',
            ],

            'discount' => [
                'required',
                'numeric',
                'min:0',
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

            'items' => [
                'required',
                'array',
                'min:1',
                'max:100',
            ],

            'items.*.stock_batch_id' => [
                'required',
                'integer',
                'distinct',
                'exists:stock_batches,id',
            ],

            'items.*.quantity' => [
                'required',
                'numeric',
                'min:0.001',
            ],

            'items.*.discount' => [
                'required',
                'numeric',
                'min:0',
            ],
        ];
    }

    public function after(): array
    {
        return [
            function (
                Validator $validator,
            ): void {
                $type =
                    $this->input(
                        'settlement_type',
                    );

                $customerId =
                    $this->input(
                        'customer_id',
                    );

                $paymentMethod =
                    $this->input(
                        'payment_method',
                    );

                $dueDate =
                    $this->input(
                        'due_date',
                    );

                if (
                    in_array(
                        $type,
                        [
                            Sale::SETTLEMENT_PARTIAL,
                            Sale::SETTLEMENT_DUE,
                        ],
                        true,
                    )
                    && ! $customerId
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'customer_id',
                            'A registered customer is required for partial or due sales.',
                        );
                }

                if (
                    in_array(
                        $type,
                        [
                            Sale::SETTLEMENT_PARTIAL,
                            Sale::SETTLEMENT_DUE,
                        ],
                        true,
                    )
                    && ! $dueDate
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'due_date',
                            'Please enter the due date.',
                        );
                }

                if (
                    in_array(
                        $type,
                        [
                            Sale::SETTLEMENT_FULL,
                            Sale::SETTLEMENT_PARTIAL,
                        ],
                        true,
                    )
                    && ! $paymentMethod
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'payment_method',
                            'Please select the payment method.',
                        );
                }
            },
        ];
    }
}
