<?php

namespace App\Http\Requests\Cheque;

use App\Models\Cheque;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateChequeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'cheque_number' => ['required', 'string', 'max:100'],

            'type' => [
                'required',
                Rule::in([Cheque::TYPE_RECEIVED, Cheque::TYPE_ISSUED]),
            ],

            'party_name' => ['required', 'string', 'max:190'],
            'bank_name' => ['nullable', 'string', 'max:190'],

            'amount' => ['required', 'numeric', 'min:0.01'],

            'cheque_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:cheque_date'],

            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
