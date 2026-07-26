<?php

namespace App\Http\Requests\Customer;

use App\Models\SalePayment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDuePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $reference =
            $this->input(
                'reference_number',
            );

        $notes =
            $this->input('notes');

        $this->merge([
            'reference_number' =>
            is_string($reference)
                && trim($reference) !== ''
                ? trim($reference)
                : null,

            'notes' =>
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
            'amount' => [
                'required',
                'numeric',
                'min:0.01',
            ],

            'payment_method' => [
                'required',

                Rule::in([
                    SalePayment::METHOD_CASH,
                    SalePayment::METHOD_CARD,
                    SalePayment::METHOD_BANK_TRANSFER,
                ]),
            ],

            'reference_number' => [
                'nullable',
                'string',
                'max:160',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }
}
