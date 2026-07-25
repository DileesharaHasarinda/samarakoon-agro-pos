<?php

namespace App\Http\Requests\Product;

use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    private const ALLOWED_UNITS = [
        'Piece',
        'Packet',
        'Bottle',
        'Bag',
        'Kilogram',
        'Gram',
        'Litre',
        'Millilitre',
        'Box',
        'Metre',
        'Roll',
        'Set',
    ];

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim(
                (string) $this->input('name'),
            ),

            'sku' => $this->nullableString(
                'sku',
            ),

            'barcode' =>
            $this->nullableString(
                'barcode',
            ),

            'description' =>
            $this->nullableString(
                'description',
            ),

            'unit' => trim(
                (string) $this->input('unit'),
            ),

            'expiry_date' =>
            $this->nullableString(
                'expiry_date',
            ),
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $categoryId = (int) $this->input(
            'category_id',
        );

        return [
            'category_id' => [
                'required',
                'integer',
                'exists:categories,id',
            ],

            'name' => [
                'required',
                'string',
                'max:160',

                Rule::unique(
                    'products',
                    'name',
                )->where(
                    fn(
                        Builder $query,
                    ) => $query->where(
                        'category_id',
                        $categoryId,
                    ),
                ),
            ],

            'sku' => [
                'nullable',
                'string',
                'max:100',
                'unique:products,sku',
            ],

            'barcode' => [
                'nullable',
                'string',
                'max:120',
                'unique:products,barcode',
            ],

            'description' => [
                'nullable',
                'string',
                'max:1500',
            ],

            'cost_price' => [
                'required',
                'numeric',
                'min:0',
                'max:999999999999.99',
            ],

            'selling_price' => [
                'required',
                'numeric',
                'min:0',
                'max:999999999999.99',
            ],

            'reorder_level' => [
                'required',
                'integer',
                'min:0',
                'max:4294967295',
            ],

            'unit' => [
                'required',
                'string',
                Rule::in(
                    self::ALLOWED_UNITS,
                ),
            ],

            'expiry_date' => [
                'nullable',
                'date_format:Y-m-d',
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
            'Please select a category first.',

            'category_id.exists' =>
            'The selected category does not exist.',

            'name.required' =>
            'Please enter the product name.',

            'name.unique' =>
            'A product with this name already exists in the selected category.',

            'name.max' =>
            'The product name cannot exceed 160 characters.',

            'sku.unique' =>
            'This SKU is already used by another product.',

            'sku.max' =>
            'The SKU cannot exceed 100 characters.',

            'barcode.unique' =>
            'This barcode is already used by another product.',

            'barcode.max' =>
            'The barcode cannot exceed 120 characters.',

            'description.max' =>
            'The description cannot exceed 1500 characters.',

            'cost_price.required' =>
            'Please enter the cost price.',

            'cost_price.numeric' =>
            'The cost price must be a valid number.',

            'cost_price.min' =>
            'The cost price cannot be negative.',

            'selling_price.required' =>
            'Please enter the selling price.',

            'selling_price.numeric' =>
            'The selling price must be a valid number.',

            'selling_price.min' =>
            'The selling price cannot be negative.',

            'reorder_level.required' =>
            'Please enter the reorder level.',

            'reorder_level.integer' =>
            'The reorder level must be a whole number.',

            'reorder_level.min' =>
            'The reorder level cannot be negative.',

            'unit.required' =>
            'Please select a product unit.',

            'unit.in' =>
            'Please select a valid product unit.',

            'expiry_date.date_format' =>
            'The expiry date must be a valid date.',
        ];
    }

    private function nullableString(
        string $field,
    ): ?string {
        $value = $this->input($field);

        if (! is_string($value)) {
            return null;
        }

        $trimmedValue = trim($value);

        return $trimmedValue === ''
            ? null
            : $trimmedValue;
    }
}
