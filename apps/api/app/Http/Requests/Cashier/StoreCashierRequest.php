<?php

namespace App\Http\Requests\Cashier;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreCashierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' =>
            is_string($this->input('name'))
                ? trim($this->input('name'))
                : $this->input('name'),

            'username' =>
            is_string($this->input('username'))
                ? strtolower(
                    trim(
                        $this->input('username'),
                    ),
                )
                : $this->input('username'),

            'email' =>
            is_string($this->input('email'))
                ? strtolower(
                    trim(
                        $this->input('email'),
                    ),
                )
                : $this->input('email'),

            'phone' =>
            is_string($this->input('phone'))
                && trim($this->input('phone')) !== ''
                ? trim($this->input('phone'))
                : null,
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

            'username' => [
                'required',
                'string',
                'min:3',
                'max:80',
                'regex:/^[a-z0-9._-]+$/',
                Rule::unique(
                    'users',
                    'username',
                ),
            ],

            'email' => [
                'required',
                'email',
                'max:160',
                Rule::unique(
                    'users',
                    'email',
                ),
            ],

            'phone' => [
                'nullable',
                'string',
                'max:30',
            ],

            'password' => [
                'required',
                'confirmed',
                Password::min(8)
                    ->letters()
                    ->numbers(),
            ],

            'is_active' => [
                'required',
                'boolean',
            ],
        ];
    }
}
