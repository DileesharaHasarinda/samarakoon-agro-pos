<?php

namespace App\Http\Requests\Purchase;

use App\Models\Product;
use App\Models\ProductVariant;
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

            'items' =>
            $items,
        ]);
    }

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

            'items.*.product_variant_id' => [
                'nullable',
                'integer',
                'exists:product_variants,id',
            ],

            'items.*.purchase_unit_name' => [
                'nullable',
                'string',
                'max:80',
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

            'items.*.is_dual_unit' => [
                'required',
                'boolean',
            ],

            'items.*.secondary_unit' => [
                'nullable',
                'string',
                'max:40',
            ],

            'items.*.conversion_factor' => [
                'nullable',
                'numeric',
                'gt:0',
            ],

            'items.*.secondary_selling_price' => [
                'nullable',
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

                if (! is_array($items)) {
                    return;
                }

                $productIds = collect($items)
                    ->filter(
                        fn(mixed $item): bool =>
                        is_array($item)
                            && isset(
                                $item['product_id'],
                            ),
                    )
                    ->pluck(
                        'product_id',
                    )
                    ->map(
                        fn(mixed $id): int =>
                        (int) $id,
                    )
                    ->filter(
                        fn(int $id): bool =>
                        $id > 0,
                    )
                    ->unique()
                    ->values();

                $products = Product::query()
                    ->with([
                        'variants' =>
                        fn($query) =>
                        $query
                            ->select([
                                'id',
                                'product_id',
                                'size_value',
                                'size_unit',
                                'package_unit',
                                'sku',
                                'barcode',
                                'is_active',
                                'sort_order',
                            ])
                            ->orderBy('sort_order')
                            ->orderBy('id'),
                    ])
                    ->whereIn(
                        'id',
                        $productIds,
                    )
                    ->get([
                        'id',
                        'name',
                        'unit',
                    ])
                    ->keyBy('id');

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
                        $quantity
                        * $unitCost;

                    $subtotal +=
                        $lineValue;

                    $itemDiscountTotal +=
                        $discount;

                    if (
                        $discount
                        > $lineValue
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                "items.{$index}.discount",
                                'The item discount cannot exceed the item value.',
                            );
                    }

                    $manufacturedDate =
                        $item['manufactured_date']
                        ?? null;

                    $expiryDate =
                        $item['expiry_date']
                        ?? null;

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

                    $isDualUnit =
                        (bool) (
                            $item['is_dual_unit']
                            ?? false
                        );

                    $productId =
                        (int) (
                            $item['product_id']
                            ?? 0
                        );

                    $product =
                        $products->get(
                            $productId,
                        );

                    $variantId =
                        isset($item['product_variant_id'])
                        && $item['product_variant_id'] !== null
                        && $item['product_variant_id'] !== ''
                        ? (int) $item['product_variant_id']
                        : null;

                    if ($product) {
                        $hasVariantConfiguration =
                            $product
                            ->variants
                            ->isNotEmpty();

                        $activeVariants =
                            $product
                            ->variants
                            ->filter(
                                fn(ProductVariant $variant): bool =>
                                (bool) $variant->is_active,
                            )
                            ->values();

                        if ($hasVariantConfiguration) {
                            if ($variantId === null) {
                                $validator
                                    ->errors()
                                    ->add(
                                        "items.{$index}.product_variant_id",
                                        "Please select a variant for {$product->name}.",
                                    );
                            } else {
                                $selectedVariant =
                                    $activeVariants
                                    ->firstWhere(
                                        'id',
                                        $variantId,
                                    );

                                if (!$selectedVariant instanceof ProductVariant) {
                                    $validator
                                        ->errors()
                                        ->add(
                                            "items.{$index}.product_variant_id",
                                            'The selected product variant is invalid or inactive.',
                                        );
                                }
                            }

                            if ($isDualUnit) {
                                $validator
                                    ->errors()
                                    ->add(
                                        "items.{$index}.is_dual_unit",
                                        'Variant products use independent stock pools and cannot use Bag-to-Kg dual-unit conversion in this purchase flow.',
                                    );
                            }
                        } elseif ($variantId !== null) {
                            $validator
                                ->errors()
                                ->add(
                                    "items.{$index}.product_variant_id",
                                    'This product does not use variants.',
                                );
                        }
                    }

                    if (! $isDualUnit) {
                        continue;
                    }

                    if ($product) {
                        $productUnit =
                            strtolower(
                                trim(
                                    (string) $product->unit,
                                ),
                            );

                        if (
                            ! in_array(
                                $productUnit,
                                [
                                    'bag',
                                    'bags',
                                ],
                                true,
                            )
                        ) {
                            $validator
                                ->errors()
                                ->add(
                                    "items.{$index}.is_dual_unit",
                                    'Loose Kg selling can only be enabled for products with Bag as the product unit.',
                                );
                        }
                    }

                    $secondaryUnit =
                        strtolower(
                            trim(
                                (string) (
                                    $item['secondary_unit']
                                    ?? ''
                                ),
                            ),
                        );

                    if (
                        $secondaryUnit
                        !== 'kg'
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                "items.{$index}.secondary_unit",
                                'The loose selling unit must be Kg.',
                            );
                    }

                    $conversionFactor =
                        $item['conversion_factor']
                        ?? null;

                    if (
                        $conversionFactor === null
                        || ! is_numeric(
                            $conversionFactor,
                        )
                        || (float) $conversionFactor
                        <= 0
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                "items.{$index}.conversion_factor",
                                'Please enter the Kg weight of one Bag.',
                            );
                    }

                    $secondarySellingPrice =
                        $item['secondary_selling_price']
                        ?? null;

                    if (
                        $secondarySellingPrice === null
                        || ! is_numeric(
                            $secondarySellingPrice,
                        )
                        || (float) $secondarySellingPrice
                        < 0
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                "items.{$index}.secondary_selling_price",
                                'Please enter the loose Kg selling price.',
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

            'items.*.product_id.exists' =>
            'The selected product does not exist.',

            'items.*.product_variant_id.integer' =>
            'The selected product variant is invalid.',

            'items.*.product_variant_id.exists' =>
            'The selected product variant does not exist.',

            'items.*.quantity.required' =>
            'Please enter the quantity.',

            'items.*.quantity.min' =>
            'The quantity must be greater than zero.',

            'items.*.unit_cost.required' =>
            'Please enter the purchase cost.',

            'items.*.selling_price.required' =>
            'Please enter the full-unit selling price for this stock batch.',

            'items.*.is_dual_unit.required' =>
            'Please specify whether loose Kg selling is enabled.',

            'items.*.is_dual_unit.boolean' =>
            'The loose selling option is invalid.',

            'items.*.conversion_factor.numeric' =>
            'The Bag weight must be a valid number.',

            'items.*.conversion_factor.gt' =>
            'The Bag weight must be greater than zero.',

            'items.*.secondary_selling_price.numeric' =>
            'The loose Kg selling price must be a valid number.',

            'items.*.secondary_selling_price.min' =>
            'The loose Kg selling price cannot be negative.',
        ];
    }

    private function normaliseItem(
        array $item,
    ): array {
        $isDualUnit =
            $this->booleanValue(
                $item['is_dual_unit']
                    ?? false,
            );

        $secondaryUnit =
            $isDualUnit
            ? (
                $this->nullableString(
                    $item['secondary_unit']
                        ?? null,
                )
                ?? 'Kg'
            )
            : null;

        $conversionFactor =
            $isDualUnit
            ? (
                $item['conversion_factor']
                ?? null
            )
            : 1;

        $secondarySellingPrice =
            $isDualUnit
            ? (
                $item['secondary_selling_price']
                ?? null
            )
            : null;

        $productVariantId =
            $item['product_variant_id']
            ?? null;

        if (
            $productVariantId === ''
            || $productVariantId === null
        ) {
            $productVariantId = null;
        } elseif (
            is_numeric($productVariantId)
        ) {
            $productVariantId =
                (int) $productVariantId;
        }

        return [
            ...$item,

            'product_variant_id' =>
            $productVariantId,

            'purchase_unit_name' =>
            $this->nullableString(
                $item['purchase_unit_name']
                    ?? null,
            ),

            'is_dual_unit' =>
            $isDualUnit,

            'secondary_unit' =>
            $secondaryUnit,

            'conversion_factor' =>
            $conversionFactor,

            'secondary_selling_price' =>
            $secondarySellingPrice,

            'batch_number' =>
            $this->nullableString(
                $item['batch_number']
                    ?? null,
            ),

            'manufactured_date' =>
            $this->nullableString(
                $item['manufactured_date']
                    ?? null,
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

    private function booleanValue(
        mixed $value,
    ): bool {
        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value)) {
            return $value === 1;
        }

        if (is_string($value)) {
            return in_array(
                strtolower(
                    trim($value),
                ),
                [
                    '1',
                    'true',
                    'yes',
                    'on',
                ],
                true,
            );
        }

        return false;
    }

    private function nullableString(
        mixed $value,
    ): ?string {
        if (! is_string($value)) {
            return null;
        }

        $trimmedValue =
            trim($value);

        return $trimmedValue === ''
            ? null
            : $trimmedValue;
    }
}
