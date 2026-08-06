<?php

namespace App\Http\Requests\Cheque;

use App\Models\Cheque;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateChequeStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => [
                'required',
                Rule::in([
                    Cheque::STATUS_CLEARED,
                    Cheque::STATUS_BOUNCED,
                    Cheque::STATUS_CANCELLED,
                    Cheque::STATUS_PENDING,
                ]),
            ],
        ];
    }
}
