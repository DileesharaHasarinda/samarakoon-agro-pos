<?php

namespace App\Http\Requests\Sale;

use App\Models\SalePayment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $items = collect(
            $this->input('items', []),
        )
            ->map(
                function (
                    mixed $item,
                ): array {
                    $item = is_array($item)
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

        $referenceNumber =
            $this->input(
                'reference_number',
            );

        $notes =
            $this->input('notes');

        $this->merge([
            'reference_number' =>
            is_string(
                $referenceNumber,
            )
                && trim(
                    $referenceNumber,
                ) !== ''
                ? trim(
                    $referenceNumber,
                )
                : null,

            'notes' =>
            is_string($notes)
                && trim($notes) !== ''
                ? trim($notes)
                : null,

            'items' => $items,
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'discount' => [
                'required',
                'numeric',
                'min:0',
            ],

            'payment_method' => [
                'required',

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

            'reference_number' => [
                'nullable',
                'string',
                'max:150',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:1000',
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

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' =>
            'Please add at least one product to the cart.',

            'items.min' =>
            'Please add at least one product to the cart.',

            'items.*.stock_batch_id.required' =>
            'Please select a stock price batch.',

            'items.*.stock_batch_id.distinct' =>
            'The same stock batch cannot appear twice in the cart.',

            'items.*.quantity.required' =>
            'Please enter the sale quantity.',

            'items.*.quantity.min' =>
            'The sale quantity must be greater than zero.',

            'discount.min' =>
            'The sale discount cannot be negative.',

            'payment_method.required' =>
            'Please select a payment method.',

            'amount_received.required' =>
            'Please enter the received amount.',
        ];
    }
}
