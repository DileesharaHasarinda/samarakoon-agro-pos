<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'business_settings',
            function (Blueprint $table): void {
                $table->id();

                /*
                 * Business information.
                 */
                $table->string(
                    'business_name',
                    150,
                );

                $table->string(
                    'business_short_name',
                    80,
                )->nullable();

                $table->text(
                    'address',
                )->nullable();

                $table->string(
                    'phone',
                    30,
                )->nullable();

                $table->string(
                    'secondary_phone',
                    30,
                )->nullable();

                $table->string(
                    'email',
                    150,
                )->nullable();

                $table->string(
                    'website',
                    255,
                )->nullable();

                $table->string(
                    'registration_number',
                    100,
                )->nullable();

                $table->string(
                    'tax_number',
                    100,
                )->nullable();

                $table->string(
                    'currency_code',
                    3,
                )->default('LKR');

                $table->string(
                    'timezone',
                    100,
                )->default('Asia/Colombo');

                /*
                 * A small PNG, JPEG or WebP logo is stored
                 * as a data URL for the local POS system.
                 */
                $table->longText(
                    'logo_data_url',
                )->nullable();

                /*
                 * Receipt and invoice text.
                 */
                $table->string(
                    'receipt_title',
                    100,
                )->default('SALES RECEIPT');

                $table->text(
                    'receipt_footer',
                )->nullable();

                $table->string(
                    'invoice_title',
                    100,
                )->default('SALES INVOICE');

                $table->text(
                    'invoice_footer',
                )->nullable();

                /*
                 * Printing preferences.
                 */
                $table->string(
                    'receipt_paper_size',
                    10,
                )->default('80mm');

                $table->string(
                    'default_print_document',
                    20,
                )->default('receipt');

                $table->unsignedTinyInteger(
                    'receipt_copies',
                )->default(1);

                $table->string(
                    'printer_name',
                    150,
                )->nullable();

                /*
                 * Receipt and invoice visibility.
                 */
                $table->boolean(
                    'show_logo_on_receipt',
                )->default(true);

                $table->boolean(
                    'show_business_address',
                )->default(true);

                $table->boolean(
                    'show_customer_details',
                )->default(true);

                $table->boolean(
                    'show_cashier_name',
                )->default(true);

                $table->boolean(
                    'show_payment_reference',
                )->default(true);

                $table->boolean(
                    'show_due_date',
                )->default(true);

                $table->boolean(
                    'show_sku',
                )->default(false);

                $table->boolean(
                    'show_batch_number',
                )->default(false);

                $table->boolean(
                    'auto_print_after_sale',
                )->default(false);

                $table->boolean(
                    'print_duplicate_label',
                )->default(true);

                $table->foreignId(
                    'updated_by',
                )
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamps();
            },
        );

        DB::table(
            'business_settings',
        )->insert([
            'id' => 1,

            'business_name' =>
            'Samarakoon Agro',

            'business_short_name' =>
            'Samarakoon Agro',

            'address' => null,
            'phone' => null,
            'secondary_phone' => null,
            'email' => null,
            'website' => null,
            'registration_number' => null,
            'tax_number' => null,

            'currency_code' => 'LKR',
            'timezone' => 'Asia/Colombo',

            'logo_data_url' => null,

            'receipt_title' =>
            'SALES RECEIPT',

            'receipt_footer' =>
            'Thank you for your business.',

            'invoice_title' =>
            'SALES INVOICE',

            'invoice_footer' =>
            'Thank you for your business.',

            'receipt_paper_size' =>
            '80mm',

            'default_print_document' =>
            'receipt',

            'receipt_copies' => 1,

            'printer_name' => null,

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

            'updated_by' => null,

            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'business_settings',
        );
    }
};
