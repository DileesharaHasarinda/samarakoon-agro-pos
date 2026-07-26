<?php

namespace App\Http\Requests\Barcode;

use App\Models\Product;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductBarcodeRequest
extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()
            ?->isAdmin()
            ?? false;
    }

    protected function prepareForValidation(): void
    {
        $barcode =
            $this->input(
                'barcode',
            );

        $this->merge([
            'barcode' =>
            is_string($barcode)
                && trim($barcode) !== ''
                ? trim($barcode)
                : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
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
            'barcode' => [
                'nullable',
                'string',
                'max:64',

                Rule::unique(
                    'products',
                    'barcode',
                )->ignore(
                    $productId,
                ),

                function (
                    string $attribute,
                    mixed $value,
                    Closure $fail,
                ): void {
                    if (
                        $value === null
                        || $value === ''
                    ) {
                        return;
                    }

                    if (
                        ! is_string($value)
                        || ! preg_match(
                            '/^[\x20-\x7E]+$/',
                            $value,
                        )
                    ) {
                        $fail(
                            'The barcode may contain only printable English letters, numbers, spaces and symbols.',
                        );
                    }
                },
            ],
        ];
    }
}
