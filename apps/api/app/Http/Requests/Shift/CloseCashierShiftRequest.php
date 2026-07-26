<?php

namespace App\Http\Requests\Shift;

use Illuminate\Foundation\Http\FormRequest;

class CloseCashierShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $notes =
            $this->input(
                'closing_notes',
            );

        $this->merge([
            'closing_notes' =>
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
            'actual_cash' => [
                'required',
                'numeric',
                'min:0',
                'max:999999999999.99',
            ],

            'closing_notes' => [
                'nullable',
                'string',
                'max:1500',
            ],
        ];
    }
}
