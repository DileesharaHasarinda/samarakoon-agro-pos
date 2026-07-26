<?php

namespace App\Http\Requests\Backup;

use Illuminate\Foundation\Http\FormRequest;

class CreateDatabaseBackupRequest
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
        $notes =
            $this->input('notes');

        $this->merge([
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
            'notes' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }
}
