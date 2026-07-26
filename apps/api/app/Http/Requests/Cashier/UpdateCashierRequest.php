<?php

namespace App\Http\Requests\Cashier;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCashierRequest extends FormRequest
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
        $routeCashier =
            $this->route('cashier');

        $cashierId =
            $routeCashier instanceof User
            ? $routeCashier->id
            : $routeCashier;

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
                )->ignore($cashierId),
            ],

            'email' => [
                'required',
                'email',
                'max:160',

                Rule::unique(
                    'users',
                    'email',
                )->ignore($cashierId),
            ],

            'phone' => [
                'nullable',
                'string',
                'max:30',
            ],

            'is_active' => [
                'required',
                'boolean',
            ],
        ];
    }
}
