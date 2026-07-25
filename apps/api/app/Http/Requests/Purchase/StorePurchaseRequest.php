<?php

namespace App\Http\Requests\Purchase;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePurchaseRequest extends FormRequest
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
                fn(mixed $item): array =>
                $this->normaliseItem(
                    is_array($item)
                        ? $item
                        : [],
                ),
            )
            ->all();

        $this->merge([
            'supplier_invoice_number' =>
            $this->nullableString(
                $this->input(
                    'supplier_invoice_number',
                ),
            ),

            'notes' =>
            $this->nullableString(
                $this->input('notes'),
            ),

            'items' => $items,
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'supplier_id' => [
                'required',
                'integer',
                'exists:suppliers,id',
            ],

            'supplier_invoice_number' => [
                'nullable',
                'string',
                'max:120',
            ],

            'purchase_date' => [
                'required',
                'date_format:Y-m-d',
            ],

            'discount' => [
                'required',
                'numeric',
                'min:0',
            ],

            'additional_cost' => [
                'required',
                'numeric',
                'min:0',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'receive_now' => [
                'required',
                'boolean',
            ],

            'items' => [
                'required',
                'array',
                'min:1',
                'max:100',
            ],

            'items.*.product_id' => [
                'required',
                'integer',
                'exists:products,id',
            ],

            'items.*.quantity' => [
                'required',
                'numeric',
                'min:0.001',
            ],

            'items.*.unit_cost' => [
                'required',
                'numeric',
                'min:0',
            ],

            'items.*.selling_price' => [
                'required',
                'numeric',
                'min:0',
            ],

            'items.*.discount' => [
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

            'items.*.notes' => [
                'nullable',
                'string',
                'max:500',
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
                $items = $this->input(
                    'items',
                    [],
                );

                $subtotal = 0.0;
                $itemDiscountTotal = 0.0;

                foreach (
                    $items as $index => $item
                ) {
                    if (! is_array($item)) {
                        continue;
                    }

                    $quantity = (float) (
                        $item['quantity']
                        ?? 0
                    );

                    $unitCost = (float) (
                        $item['unit_cost']
                        ?? 0
                    );

                    $discount = (float) (
                        $item['discount']
                        ?? 0
                    );

                    $lineValue =
                        $quantity * $unitCost;

                    $subtotal += $lineValue;
                    $itemDiscountTotal +=
                        $discount;

                    if (
                        $discount > $lineValue
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                "items.{$index}.discount",
                                'The item discount cannot exceed the item value.',
                            );
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

                $purchaseDiscount =
                    (float) $this->input(
                        'discount',
                        0,
                    );

                $remainingValue =
                    $subtotal
                    - $itemDiscountTotal;

                if (
                    $purchaseDiscount
                    > $remainingValue
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'discount',
                            'The purchase discount cannot exceed the purchase subtotal.',
                        );
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'supplier_id.required' =>
            'Please select a supplier.',

            'supplier_id.exists' =>
            'The selected supplier does not exist.',

            'purchase_date.required' =>
            'Please select the purchase date.',

            'items.required' =>
            'Please add at least one product.',

            'items.min' =>
            'Please add at least one product.',

            'items.*.product_id.required' =>
            'Please select a product.',

            'items.*.quantity.required' =>
            'Please enter the quantity.',

            'items.*.quantity.min' =>
            'The quantity must be greater than zero.',

            'items.*.unit_cost.required' =>
            'Please enter the purchase cost.',

            'items.*.selling_price.required' =>
            'Please enter the selling price for this stock batch.',
        ];
    }

    /**
     * @param array<string, mixed> $item
     * @return array<string, mixed>
     */
    private function normaliseItem(
        array $item,
    ): array {
        return [
            ...$item,

            'batch_number' =>
            $this->nullableString(
                $item['batch_number']
                    ?? null,
            ),

            'manufactured_date' =>
            $this->nullableString(
                $item['manufactured_date'] ?? null,
            ),

            'expiry_date' =>
            $this->nullableString(
                $item['expiry_date']
                    ?? null,
            ),

            'notes' =>
            $this->nullableString(
                $item['notes']
                    ?? null,
            ),
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
