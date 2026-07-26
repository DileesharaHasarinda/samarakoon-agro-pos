<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusinessSetting extends Model
{
    public const PAPER_58MM = '58mm';

    public const PAPER_80MM = '80mm';

    public const DOCUMENT_RECEIPT =
    'receipt';

    public const DOCUMENT_INVOICE =
    'invoice';

    protected $fillable = [
        'business_name',
        'business_short_name',
        'address',
        'phone',
        'secondary_phone',
        'email',
        'website',
        'registration_number',
        'tax_number',
        'currency_code',
        'timezone',
        'logo_data_url',
        'receipt_title',
        'receipt_footer',
        'invoice_title',
        'invoice_footer',
        'receipt_paper_size',
        'default_print_document',
        'receipt_copies',
        'printer_name',
        'show_logo_on_receipt',
        'show_business_address',
        'show_customer_details',
        'show_cashier_name',
        'show_payment_reference',
        'show_due_date',
        'show_sku',
        'show_batch_number',
        'auto_print_after_sale',
        'print_duplicate_label',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'receipt_copies' =>
            'integer',

            'show_logo_on_receipt' =>
            'boolean',

            'show_business_address' =>
            'boolean',

            'show_customer_details' =>
            'boolean',

            'show_cashier_name' =>
            'boolean',

            'show_payment_reference' =>
            'boolean',

            'show_due_date' =>
            'boolean',

            'show_sku' =>
            'boolean',

            'show_batch_number' =>
            'boolean',

            'auto_print_after_sale' =>
            'boolean',

            'print_duplicate_label' =>
            'boolean',
        ];
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'updated_by',
        );
    }

    public static function current(): self
    {
        $settings = self::query()
            ->find(1);

        if ($settings) {
            return $settings;
        }

        return self::query()->create(
            self::defaultValues(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultValues(): array
    {
        return [
            'id' => 1,

            'business_name' =>
            'Samarakoon Agro',

            'business_short_name' =>
            'Samarakoon Agro',

            'currency_code' =>
            'LKR',

            'timezone' =>
            'Asia/Colombo',

            'receipt_title' =>
            'SALES RECEIPT',

            'receipt_footer' =>
            'Thank you for your business.',

            'invoice_title' =>
            'SALES INVOICE',

            'invoice_footer' =>
            'Thank you for your business.',

            'receipt_paper_size' =>
            self::PAPER_80MM,

            'default_print_document' =>
            self::DOCUMENT_RECEIPT,

            'receipt_copies' => 1,

            'show_logo_on_receipt' =>
            true,

            'show_business_address' =>
            true,

            'show_customer_details' =>
            true,

            'show_cashier_name' =>
            true,

            'show_payment_reference' =>
            true,

            'show_due_date' =>
            true,

            'show_sku' =>
            false,

            'show_batch_number' =>
            false,

            'auto_print_after_sale' =>
            false,

            'print_duplicate_label' =>
            true,
        ];
    }
}
