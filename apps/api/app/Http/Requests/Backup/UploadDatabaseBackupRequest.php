<?php

namespace App\Http\Requests\Backup;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

class UploadDatabaseBackupRequest
extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $confirmation =
            $this->input(
                'confirmation',
            );

        if (is_string($confirmation)) {
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
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'backup_file' => [
                'required',
                'file',

                /*
                 * 500 MB maximum.
                 *
                 * PHP upload_max_filesize and
                 * post_max_size must also allow
                 * the requested file size.
                 */
                'max:512000',

                function (
                    string $attribute,
                    mixed $value,
                    Closure $fail,
                ): void {
                    if (
                        ! $value
                            instanceof UploadedFile
                    ) {
                        $fail(
                            'Select a valid database backup file.',
                        );

                        return;
                    }

                    if (
                        strtolower(
                            $value
                                ->getClientOriginalExtension(),
                        )
                        !== 'sql'
                    ) {
                        $fail(
                            'Only .sql database backup files can be restored.',
                        );
                    }
                },
            ],

            'confirmation' => [
                'required',
                'string',
                'in:RESTORE',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'backup_file.required' =>
            'Select a database backup file.',

            'backup_file.file' =>
            'The selected database backup is not a valid file.',

            'backup_file.max' =>
            'The selected database backup is too large. Maximum upload size is 500 MB.',

            'confirmation.required' =>
            'Type RESTORE to confirm the database restoration.',

            'confirmation.in' =>
            'Type RESTORE exactly to confirm the database restoration.',
        ];
    }
}
