<?php

namespace App\Http\Requests\Product;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $barcode =
            trim(
                (string) $this->input(
                    'barcode',
                    '',
                ),
            );

        $variants =
            collect(
                $this->input(
                    'variants',
                    [],
                ),
            )
            ->filter(
                fn(
                    mixed $variant,
                ): bool =>
                is_array(
                    $variant,
                ),
            )
            ->map(
                function (
                    array $variant,
                ): array {
                    return [
                        'id' =>
                        isset(
                            $variant['id'],
                        )
                            ? (int) $variant['id']
                            : null,

                        'size_value' =>
                        $variant['size_value']
                            ?? null,

                        'size_unit' =>
                        trim(
                            (string) (
                                $variant['size_unit']
                                ?? ''
                            ),
                        ),

                        'package_unit' =>
                        trim(
                            (string) (
                                $variant['package_unit']
                                ?? ''
                            ),
                        ),

                        'barcode' =>
                        trim(
                            (string) (
                                $variant['barcode']
                                ?? ''
                            ),
                        ) !== ''
                            ? trim(
                                (string) $variant['barcode'],
                            )
                            : null,

                        'is_active' =>
                        filter_var(
                            $variant['is_active']
                                ?? true,
                            FILTER_VALIDATE_BOOL,
                            FILTER_NULL_ON_FAILURE,
                        )
                            ?? true,
                    ];
                },
            )
            ->values()
            ->all();

        $this->merge([
            'category_id' =>
            $this->input(
                'category_id',
            ),

            'name' =>
            trim(
                (string) $this->input(
                    'name',
                    '',
                ),
            ),

            'unit' =>
            trim(
                (string) $this->input(
                    'unit',
                    '',
                ),
            ),

            'barcode' =>
            $barcode === ''
                ? null
                : $barcode,

            'variants' =>
            $variants,
        ]);
    }

    public function rules(): array
    {
        $routeProduct =
            $this->route(
                'product',
            );

        $productId =
            $routeProduct
            instanceof Product
            ? $routeProduct->id
            : $routeProduct;

        return [
            'category_id' => [
                'required',
                'integer',

                Rule::exists(
                    'categories',
                    'id',
                ),
            ],

            'name' => [
                'required',
                'string',
                'min:2',
                'max:160',
            ],

            'unit' => [
                'required',
                'string',
                'max:40',
            ],

            'barcode' => [
                'nullable',
                'string',
                'max:120',
                'regex:/^[\x20-\x7E]+$/',

                Rule::unique(
                    'products',
                    'barcode',
                )->ignore(
                    $productId,
                ),
            ],

            'variants' => [
                'nullable',
                'array',
                'max:50',
            ],

            'variants.*.id' => [
                'nullable',
                'integer',
            ],

            'variants.*.size_value' => [
                'required',
                'numeric',
                'gt:0',
            ],

            'variants.*.size_unit' => [
                'required',
                'string',
                'max:40',
            ],

            'variants.*.package_unit' => [
                'required',
                'string',
                'max:40',
            ],

            'variants.*.barcode' => [
                'nullable',
                'string',
                'max:120',
                'regex:/^[\x20-\x7E]+$/',
            ],

            'variants.*.is_active' => [
                'required',
                'boolean',
            ],
        ];
    }

    public function withValidator(
        Validator $validator,
    ): void {
        $validator->after(
            function (
                Validator $validator,
            ): void {
                $variants =
                    $this->input(
                        'variants',
                        [],
                    );

                $signatures = [];

                foreach (
                    $variants as
                    $index => $variant
                ) {
                    if (
                        ! is_array(
                            $variant,
                        )
                    ) {
                        continue;
                    }

                    $size =
                        (float) (
                            $variant['size_value']
                            ?? 0
                        );

                    $sizeUnit =
                        strtolower(
                            trim(
                                (string) (
                                    $variant['size_unit']
                                    ?? ''
                                ),
                            ),
                        );

                    $packageUnit =
                        strtolower(
                            trim(
                                (string) (
                                    $variant['package_unit']
                                    ?? ''
                                ),
                            ),
                        );

                    if (
                        $size <= 0
                        || $sizeUnit === ''
                        || $packageUnit === ''
                    ) {
                        continue;
                    }

                    $signature =
                        number_format(
                            $size,
                            3,
                            '.',
                            '',
                        )
                        . '|'
                        . $sizeUnit
                        . '|'
                        . $packageUnit;

                    if (
                        isset(
                            $signatures[$signature],
                        )
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                "variants.{$index}.size_value",
                                'The same product variant has been entered more than once.',
                            );

                        continue;
                    }

                    $signatures[$signature] =
                        true;
                }
            },
        );
    }

    public function messages(): array
    {
        return [
            'category_id.required' =>
            'Please select a product category.',

            'category_id.exists' =>
            'The selected category does not exist.',

            'name.required' =>
            'Product name is required.',

            'name.min' =>
            'Product name must contain at least 2 characters.',

            'unit.required' =>
            'Product unit is required.',

            'barcode.unique' =>
            'This barcode is already assigned to another product.',

            'barcode.regex' =>
            'The barcode contains unsupported characters.',

            'variants.max' =>
            'A maximum of 50 variants can be added to one product.',

            'variants.*.size_value.required' =>
            'Variant size is required.',

            'variants.*.size_value.gt' =>
            'Variant size must be greater than zero.',

            'variants.*.size_unit.required' =>
            'Variant measurement unit is required.',

            'variants.*.package_unit.required' =>
            'Variant package unit is required.',
        ];
    }
}
