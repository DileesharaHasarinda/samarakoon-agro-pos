<?php

namespace App\Http\Requests\ExpenseCategory;

use App\Models\ExpenseCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateExpenseCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $name = $this->input('name');

        $description =
            $this->input(
                'description',
            );

        $this->merge([
            'name' =>
            is_string($name)
                ? trim($name)
                : $name,

            'description' =>
            is_string($description)
                && trim($description) !== ''
                ? trim($description)
                : null,
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $routeCategory =
            $this->route(
                'expense_category',
            );

        $categoryId =
            $routeCategory
            instanceof ExpenseCategory
            ? $routeCategory->id
            : $routeCategory;

        return [
            'name' => [
                'required',
                'string',
                'max:120',

                Rule::unique(
                    'expense_categories',
                    'name',
                )->ignore($categoryId),
            ],

            'description' => [
                'nullable',
                'string',
                'max:1000',
            ],

            'is_active' => [
                'required',
                'boolean',
            ],
        ];
    }
}
