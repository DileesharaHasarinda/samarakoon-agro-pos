<?php

namespace App\Http\Requests\Supplier;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $email = $this->nullableString(
            'email',
        );

        $this->merge([
            'name' => trim(
                (string) $this->input('name'),
            ),

            'contact_person' =>
            $this->nullableString(
                'contact_person',
            ),

            'phone' => trim(
                (string) $this->input('phone'),
            ),

            'secondary_phone' =>
            $this->nullableString(
                'secondary_phone',
            ),

            'email' => $email !== null
                ? strtolower($email)
                : null,

            'address' =>
            $this->nullableString(
                'address',
            ),

            'notes' =>
            $this->nullableString(
                'notes',
            ),
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:160',
            ],

            'contact_person' => [
                'nullable',
                'string',
                'max:120',
            ],

            'phone' => [
                'required',
                'string',
                'max:30',
                'regex:/^[0-9+\-\s()]{7,30}$/',
            ],

            'secondary_phone' => [
                'nullable',
                'string',
                'max:30',
                'regex:/^[0-9+\-\s()]{7,30}$/',
            ],

            'email' => [
                'nullable',
                'email:rfc',
                'max:190',
            ],

            'address' => [
                'nullable',
                'string',
                'max:1500',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:2000',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' =>
            'Please enter the supplier name.',

            'name.max' =>
            'The supplier name cannot exceed 160 characters.',

            'contact_person.max' =>
            'The contact person name cannot exceed 120 characters.',

            'phone.required' =>
            'Please enter the primary phone number.',

            'phone.regex' =>
            'Please enter a valid primary phone number.',

            'phone.max' =>
            'The primary phone number cannot exceed 30 characters.',

            'secondary_phone.regex' =>
            'Please enter a valid secondary phone number.',

            'secondary_phone.max' =>
            'The secondary phone number cannot exceed 30 characters.',

            'email.email' =>
            'Please enter a valid email address.',

            'email.max' =>
            'The email address cannot exceed 190 characters.',

            'address.max' =>
            'The address cannot exceed 1500 characters.',

            'notes.max' =>
            'The notes cannot exceed 2000 characters.',
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
