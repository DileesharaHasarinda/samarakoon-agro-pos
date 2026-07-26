<?php

namespace App\Http\Requests;

use App\Models\BusinessSetting;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateBusinessSettingRequest
extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin()
            ?? false;
    }

    protected function prepareForValidation(): void
    {
        $nullableFields = [
            'business_short_name',
            'address',
            'phone',
            'secondary_phone',
            'email',
            'website',
            'registration_number',
            'tax_number',
            'receipt_footer',
            'invoice_footer',
            'printer_name',
        ];

        $prepared = [];

        foreach (
            $nullableFields
            as $field
        ) {
            $value = $this->input(
                $field,
            );

            if (! is_string($value)) {
                continue;
            }

            $trimmed = trim($value);

            $prepared[$field] =
                $trimmed !== ''
                ? $trimmed
                : null;
        }

        $businessName =
            $this->input(
                'business_name',
            );

        if (is_string($businessName)) {
            $prepared['business_name'] =
                trim($businessName);
        }

        $receiptTitle =
            $this->input(
                'receipt_title',
            );

        if (is_string($receiptTitle)) {
            $prepared['receipt_title'] =
                trim($receiptTitle);
        }

        $invoiceTitle =
            $this->input(
                'invoice_title',
            );

        if (is_string($invoiceTitle)) {
            $prepared['invoice_title'] =
                trim($invoiceTitle);
        }

        $currencyCode =
            $this->input(
                'currency_code',
            );

        if (is_string($currencyCode)) {
            $prepared['currency_code'] =
                strtoupper(
                    trim($currencyCode),
                );
        }

        $timezone =
            $this->input(
                'timezone',
            );

        if (is_string($timezone)) {
            $prepared['timezone'] =
                trim($timezone);
        }

        $this->merge($prepared);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'business_name' => [
                'required',
                'string',
                'max:150',
            ],

            'business_short_name' => [
                'nullable',
                'string',
                'max:80',
            ],

            'address' => [
                'nullable',
                'string',
                'max:1000',
            ],

            'phone' => [
                'nullable',
                'string',
                'max:30',
            ],

            'secondary_phone' => [
                'nullable',
                'string',
                'max:30',
            ],

            'email' => [
                'nullable',
                'email',
                'max:150',
            ],

            'website' => [
                'nullable',
                'url',
                'max:255',
            ],

            'registration_number' => [
                'nullable',
                'string',
                'max:100',
            ],

            'tax_number' => [
                'nullable',
                'string',
                'max:100',
            ],

            'currency_code' => [
                'required',
                'string',
                'size:3',
                'regex:/^[A-Z]{3}$/',
            ],

            'timezone' => [
                'required',
                'string',
                'max:100',
            ],

            'logo_data_url' => [
                'nullable',
                'string',
                'max:1800000',

                function (
                    string $attribute,
                    mixed $value,
                    Closure $fail,
                ): void {
                    if (
                        $value === null
                        || $value === ''
                    ) {
                        return;
                    }

                    if (! is_string($value)) {
                        $fail(
                            'The business logo is invalid.',
                        );

                        return;
                    }

                    $validPrefix =
                        Str::startsWith(
                            $value,
                            [
                                'data:image/png;base64,',
                                'data:image/jpeg;base64,',
                                'data:image/webp;base64,',
                            ],
                        );

                    if (! $validPrefix) {
                        $fail(
                            'The logo must be a PNG, JPEG or WebP image.',
                        );
                    }
                },
            ],

            'receipt_title' => [
                'required',
                'string',
                'max:100',
            ],

            'receipt_footer' => [
                'nullable',
                'string',
                'max:1000',
            ],

            'invoice_title' => [
                'required',
                'string',
                'max:100',
            ],

            'invoice_footer' => [
                'nullable',
                'string',
                'max:1000',
            ],

            'receipt_paper_size' => [
                'required',

                Rule::in([
                    BusinessSetting::PAPER_58MM,
                    BusinessSetting::PAPER_80MM,
                ]),
            ],

            'default_print_document' => [
                'required',

                Rule::in([
                    BusinessSetting::DOCUMENT_RECEIPT,
                    BusinessSetting::DOCUMENT_INVOICE,
                ]),
            ],

            'receipt_copies' => [
                'required',
                'integer',
                'min:1',
                'max:3',
            ],

            'printer_name' => [
                'nullable',
                'string',
                'max:150',
            ],

            'show_logo_on_receipt' => [
                'required',
                'boolean',
            ],

            'show_business_address' => [
                'required',
                'boolean',
            ],

            'show_customer_details' => [
                'required',
                'boolean',
            ],

            'show_cashier_name' => [
                'required',
                'boolean',
            ],

            'show_payment_reference' => [
                'required',
                'boolean',
            ],

            'show_due_date' => [
                'required',
                'boolean',
            ],

            'show_sku' => [
                'required',
                'boolean',
            ],

            'show_batch_number' => [
                'required',
                'boolean',
            ],

            'auto_print_after_sale' => [
                'required',
                'boolean',
            ],

            'print_duplicate_label' => [
                'required',
                'boolean',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'logo_data_url' =>
            'business logo',

            'receipt_paper_size' =>
            'receipt paper size',

            'default_print_document' =>
            'default print document',

            'receipt_copies' =>
            'receipt copies',
        ];
    }
}
