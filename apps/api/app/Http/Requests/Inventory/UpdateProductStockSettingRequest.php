<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductStockSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'minimum_stock_level' => [
                'required',
                'numeric',
                'min:0',
                'max:99999999999.999',
            ],

            'reorder_quantity' => [
                'required',
                'numeric',
                'min:0',
                'max:99999999999.999',
            ],

            'expiry_alert_days' => [
                'required',
                'integer',
                'min:1',
                'max:3650',
            ],
        ];
    }
}
