<?php

namespace App\Http\Requests\Customer;

use App\Models\Customer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $fields = [
            'name',
            'mobile',
            'secondary_mobile',
            'email',
            'address',
            'notes',
        ];

        $prepared = [];

        foreach ($fields as $field) {
            $value = $this->input($field);

            $prepared[$field] =
                is_string($value)
                && trim($value) !== ''
                ? trim($value)
                : null;
        }

        $this->merge($prepared);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $customerId =
            $this->route('customer')
            ?->id;

        return [
            'name' => [
                'required',
                'string',
                'max:160',
            ],

            'mobile' => [
                'nullable',
                'string',
                'max:30',

                Rule::unique(
                    'customers',
                    'mobile',
                )->ignore($customerId),
            ],

            'secondary_mobile' => [
                'nullable',
                'string',
                'max:30',
            ],

            'email' => [
                'nullable',
                'email',
                'max:160',
            ],

            'address' => [
                'nullable',
                'string',
                'max:1500',
            ],

            'customer_type' => [
                'required',

                Rule::in([
                    Customer::TYPE_RETAIL,
                    Customer::TYPE_WHOLESALE,
                ]),
            ],

            'credit_limit' => [
                'required',
                'numeric',
                'min:0',
                'max:999999999999.99',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:1500',
            ],

            'is_active' => [
                'required',
                'boolean',
            ],
        ];
    }
}
