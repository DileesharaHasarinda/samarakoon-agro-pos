<?php

namespace App\Http\Requests\Stock;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStockBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $secondarySellingPrice = $this->input(
            'secondary_selling_price',
        );

        $reason = $this->input(
            'reason',
        );

        $this->merge([
            'secondary_selling_price' =>
            $secondarySellingPrice === ''
                ? null
                : $secondarySellingPrice,

            'reason' =>
            is_string($reason)
                ? trim($reason)
                : $reason,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'selling_price' => [
                'required',
                'numeric',
                'min:0.01',
                'max:999999999.99',
            ],

            'secondary_selling_price' => [
                'nullable',
                'numeric',
                'min:0.01',
                'max:999999999.99',
            ],

            'available_quantity' => [
                'required',
                'numeric',
                'min:0',
                'max:999999999.999',
            ],

            'reason' => [
                'nullable',
                'string',
                'max:500',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'selling_price.required' =>
            'Enter the main selling price.',

            'selling_price.min' =>
            'The selling price must be greater than zero.',

            'secondary_selling_price.min' =>
            'The loose-unit selling price must be greater than zero.',

            'available_quantity.required' =>
            'Enter the current physical stock quantity.',

            'available_quantity.min' =>
            'Available stock cannot be negative.',
        ];
    }
}
