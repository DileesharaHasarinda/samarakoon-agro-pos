<?php

namespace App\Http\Requests\Category;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $description = $this->input('description');

        $this->merge([
            'name' => trim(
                (string) $this->input('name'),
            ),

            'description' => is_string($description)
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
            $this->route('category');

        $categoryId =
            $routeCategory instanceof Category
            ? $routeCategory->getKey()
            : $routeCategory;

        return [
            'name' => [
                'required',
                'string',
                'max:120',

                Rule::unique(
                    'categories',
                    'name',
                )->ignore($categoryId),
            ],

            'description' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' =>
            'Please enter the category name.',

            'name.unique' =>
            'A category with this name already exists.',

            'name.max' =>
            'The category name cannot exceed 120 characters.',

            'description.max' =>
            'The description cannot exceed 1000 characters.',
        ];
    }
}
