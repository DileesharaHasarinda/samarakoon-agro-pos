<?php

namespace App\Http\Requests\Shift;

use App\Models\CashRegisterMovement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCashMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $description =
            $this->input(
                'description',
            );

        $reference =
            $this->input(
                'reference_number',
            );

        $this->merge([
            'description' =>
            is_string($description)
                ? trim($description)
                : $description,

            'reference_number' =>
            is_string($reference)
                && trim($reference) !== ''
                ? trim($reference)
                : null,
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'movement_type' => [
                'required',

                Rule::in([
                    CashRegisterMovement::TYPE_CASH_IN,

                    CashRegisterMovement::TYPE_CASH_OUT,
                ]),
            ],

            'reason' => [
                'required',

                Rule::in([
                    CashRegisterMovement::REASON_CASH_FLOAT,

                    CashRegisterMovement::REASON_CASH_DROP,

                    CashRegisterMovement::REASON_PETTY_CASH,

                    CashRegisterMovement::REASON_EXPENSE,

                    CashRegisterMovement::REASON_DEPOSIT,

                    CashRegisterMovement::REASON_WITHDRAWAL,

                    CashRegisterMovement::REASON_OTHER,
                ]),
            ],

            'amount' => [
                'required',
                'numeric',
                'min:0.01',
                'max:999999999999.99',
            ],

            'description' => [
                'required',
                'string',
                'max:255',
            ],

            'reference_number' => [
                'nullable',
                'string',
                'max:160',
            ],
        ];
    }
}
