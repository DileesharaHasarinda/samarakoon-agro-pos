<?php

namespace App\Http\Requests\Product;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $barcode = trim(
            (string) $this->input(
                'barcode',
                '',
            ),
        );

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
                'max:64',
                'regex:/^[\x20-\x7E]+$/',

                Rule::unique(
                    'products',
                    'barcode',
                )->ignore(
                    $productId,
                ),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
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
        ];
    }
}
