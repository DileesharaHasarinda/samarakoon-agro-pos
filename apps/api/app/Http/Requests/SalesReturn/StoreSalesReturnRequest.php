<?php

namespace App\Http\Requests\SalesReturn;

use App\Models\SalePayment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSalesReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $reason = $this->input('reason');
        $notes = $this->input('notes');

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

                        'restock' =>
                        filter_var(
                            $item['restock']
                                ?? true,
                            FILTER_VALIDATE_BOOLEAN,
                            FILTER_NULL_ON_FAILURE,
                        ) ?? true,
                    ];
                },
            )
            ->all();

        $this->merge([
            'reason' =>
            is_string($reason)
                ? trim($reason)
                : '',

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
            'reason' => [
                'required',
                'string',
                'max:255',
            ],

            'refund_method' => [
                'required',

                Rule::in([
                    SalePayment::METHOD_CASH,
                    SalePayment::METHOD_CARD,
                    SalePayment::METHOD_BANK_TRANSFER,
                ]),
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

            'items.*.sale_item_id' => [
                'required',
                'integer',
                'distinct',
                'exists:sale_items,id',
            ],

            'items.*.quantity' => [
                'required',
                'numeric',
                'min:0.001',
            ],

            'items.*.restock' => [
                'required',
                'boolean',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' =>
            'Please enter the reason for the return.',

            'refund_method.required' =>
            'Please select a refund method.',

            'items.required' =>
            'Please select at least one item to return.',

            'items.min' =>
            'Please select at least one item to return.',

            'items.*.sale_item_id.distinct' =>
            'The same sale item cannot be returned twice in one transaction.',

            'items.*.quantity.min' =>
            'The return quantity must be greater than zero.',
        ];
    }
}
