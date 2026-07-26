<?php

namespace App\Http\Requests\Shift;

use Illuminate\Foundation\Http\FormRequest;

class OpenCashierShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $notes =
            $this->input(
                'opening_notes',
            );

        $this->merge([
            'opening_notes' =>
            is_string($notes)
                && trim($notes) !== ''
                ? trim($notes)
                : null,
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'opening_cash' => [
                'required',
                'numeric',
                'min:0',
                'max:999999999999.99',
            ],

            'opening_notes' => [
                'nullable',
                'string',
                'max:1500',
            ],
        ];
    }
}
