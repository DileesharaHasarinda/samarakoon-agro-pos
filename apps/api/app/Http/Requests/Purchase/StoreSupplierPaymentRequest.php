<?php

namespace App\Http\Requests\Purchase;

use App\Models\PurchasePayment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSupplierPaymentRequest extends FormRequest
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
                    PurchasePayment::METHOD_CASH,
                    PurchasePayment::METHOD_CARD,
                    PurchasePayment::METHOD_BANK_TRANSFER,
                    PurchasePayment::METHOD_CHEQUE,
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
                'max:1500',
            ],
        ];
    }
}
