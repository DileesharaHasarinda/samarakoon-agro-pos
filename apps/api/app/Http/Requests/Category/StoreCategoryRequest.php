<?php

namespace App\Http\Requests\Category;

use Illuminate\Foundation\Http\FormRequest;

class StoreCategoryRequest extends FormRequest
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
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:120',
                'unique:categories,name',
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
