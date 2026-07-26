<?php

namespace App\Http\Requests\Backup;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RestoreDatabaseBackupRequest
extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()
            ?->isAdmin()
            ?? false;
    }

    protected function prepareForValidation(): void
    {
        $confirmation =
            $this->input(
                'confirmation',
            );

        if (
            is_string(
                $confirmation,
            )
        ) {
            $this->merge([
                'confirmation' =>
                strtoupper(
                    trim(
                        $confirmation,
                    ),
                ),
            ]);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'confirmation' => [
                'required',

                Rule::in([
                    'RESTORE',
                ]),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'confirmation.in' =>
            'Type RESTORE to confirm the database restoration.',
        ];
    }
}
