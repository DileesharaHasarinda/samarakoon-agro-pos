<?php

namespace App\Http\Requests\Purchase;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ReceivePurchaseRequest extends FormRequest
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

                        'batch_number' =>
                        $this->nullableString(
                            $item['batch_number'] ?? null,
                        ),

                        'manufactured_date' =>
                        $this->nullableString(
                            $item['manufactured_date'] ?? null,
                        ),

                        'expiry_date' =>
                        $this->nullableString(
                            $item['expiry_date'] ?? null,
                        ),
                    ];
                },
            )
            ->all();

        $this->merge([
            'items' => $items,
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'items' => [
                'required',
                'array',
                'min:1',
            ],

            'items.*.purchase_item_id' => [
                'required',
                'integer',
                'distinct',
                'exists:purchase_items,id',
            ],

            'items.*.received_quantity' => [
                'required',
                'numeric',
                'min:0.001',
            ],

            'items.*.selling_price' => [
                'required',
                'numeric',
                'min:0',
            ],

            'items.*.batch_number' => [
                'nullable',
                'string',
                'max:120',
            ],

            'items.*.manufactured_date' => [
                'nullable',
                'date_format:Y-m-d',
            ],

            'items.*.expiry_date' => [
                'nullable',
                'date_format:Y-m-d',
            ],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (
                Validator $validator,
            ): void {
                foreach (
                    $this->input(
                        'items',
                        [],
                    ) as $index => $item
                ) {
                    if (! is_array($item)) {
                        continue;
                    }

                    $manufacturedDate =
                        $item['manufactured_date'] ?? null;

                    $expiryDate =
                        $item['expiry_date'] ?? null;

                    if (
                        is_string(
                            $manufacturedDate,
                        )
                        && is_string(
                            $expiryDate,
                        )
                        && $manufacturedDate
                        > $expiryDate
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                "items.{$index}.expiry_date",
                                'The expiry date must be after the manufactured date.',
                            );
                    }
                }
            },
        ];
    }

    private function nullableString(
        mixed $value,
    ): ?string {
        if (! is_string($value)) {
            return null;
        }

        $trimmedValue = trim($value);

        return $trimmedValue === ''
            ? null
            : $trimmedValue;
    }
}
