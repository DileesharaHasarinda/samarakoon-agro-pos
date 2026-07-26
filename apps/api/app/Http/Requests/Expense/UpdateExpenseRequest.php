<?php

namespace App\Http\Requests\Expense;

use App\Models\Expense;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateExpenseRequest extends FormRequest
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

        $referenceNumber =
            $this->input(
                'reference_number',
            );

        $notes =
            $this->input('notes');

        $expenseType =
            $this->input(
                'expense_type',
                Expense::TYPE_ONE_TIME,
            );

        $this->merge([
            'description' =>
            is_string($description)
                ? trim($description)
                : $description,

            'reference_number' =>
            is_string($referenceNumber)
                && trim($referenceNumber) !== ''
                ? trim($referenceNumber)
                : null,

            'notes' =>
            is_string($notes)
                && trim($notes) !== ''
                ? trim($notes)
                : null,

            'recurring_frequency' =>
            $expenseType
                === Expense::TYPE_RECURRING
                ? $this->input(
                    'recurring_frequency',
                )
                : null,

            'recurring_end_date' =>
            $expenseType
                === Expense::TYPE_RECURRING
                ? $this->input(
                    'recurring_end_date',
                )
                : null,
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'expense_category_id' => [
                'required',
                'integer',
                'exists:expense_categories,id',
            ],

            'expense_date' => [
                'required',
                'date_format:Y-m-d',
            ],

            'amount' => [
                'required',
                'numeric',
                'min:0.01',
                'max:999999999999.99',
            ],

            'payment_method' => [
                'required',

                Rule::in([
                    Expense::METHOD_CASH,
                    Expense::METHOD_CARD,
                    Expense::METHOD_BANK_TRANSFER,
                ]),
            ],

            'expense_type' => [
                'required',

                Rule::in([
                    Expense::TYPE_ONE_TIME,
                    Expense::TYPE_RECURRING,
                ]),
            ],

            'recurring_frequency' => [
                'nullable',

                Rule::in([
                    Expense::FREQUENCY_WEEKLY,
                    Expense::FREQUENCY_MONTHLY,
                    Expense::FREQUENCY_QUARTERLY,
                    Expense::FREQUENCY_YEARLY,
                ]),
            ],

            'recurring_end_date' => [
                'nullable',
                'date_format:Y-m-d',
                'after_or_equal:expense_date',
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

            'notes' => [
                'nullable',
                'string',
                'max:1500',
            ],
        ];
    }

    public function after(): array
    {
        return [
            function (
                Validator $validator,
            ): void {
                if (
                    $this->input(
                        'expense_type',
                    )
                    === Expense::TYPE_RECURRING
                    && ! $this->input(
                        'recurring_frequency',
                    )
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'recurring_frequency',
                            'Select the recurring frequency.',
                        );
                }
            },
        ];
    }
}
