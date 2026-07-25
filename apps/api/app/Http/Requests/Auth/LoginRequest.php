<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'username' => strtolower(
                trim((string) $this->input('username')),
            ),
            'device_name' => $this->input(
                'device_name',
                'Samarakoon POS Desktop',
            ),
        ]);
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'username' => [
                'required',
                'string',
                'max:50',
            ],
            'password' => [
                'required',
                'string',
                'max:255',
            ],
            'device_name' => [
                'nullable',
                'string',
                'max:100',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'username.required' => 'Please enter your username.',
            'password.required' => 'Please enter your password.',
        ];
    }
}
