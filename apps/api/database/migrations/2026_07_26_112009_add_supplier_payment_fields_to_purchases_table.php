<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'purchases',
            function (Blueprint $table): void {
                /*
                 * Existing purchases are backfilled
                 * as paid below.
                 *
                 * New purchases created by the
                 * existing PurchaseController start
                 * as unconfigured.
                 */
                $table
                    ->string(
                        'payment_status',
                        30,
                    )
                    ->default('unconfigured');

                $table
                    ->string(
                        'settlement_type',
                        30,
                    )
                    ->nullable();

                $table
                    ->decimal(
                        'paid_amount',
                        14,
                        2,
                    )
                    ->default(0);

                $table
                    ->decimal(
                        'due_amount',
                        14,
                        2,
                    )
                    ->default(0);

                $table
                    ->date('due_date')
                    ->nullable();

                $table
                    ->string(
                        'payment_terms',
                        255,
                    )
                    ->nullable();

                $table->index([
                    'supplier_id',
                    'payment_status',
                ]);

                $table->index([
                    'due_amount',
                    'due_date',
                ]);
            },
        );

        /*
         * Preserve existing purchase records.
         */
        DB::table('purchases')
            ->update([
                'payment_status' =>
                'paid',

                'settlement_type' =>
                'full',

                'paid_amount' =>
                DB::raw(
                    'grand_total',
                ),

                'due_amount' =>
                0,
            ]);
    }

    public function down(): void
    {
        Schema::table(
            'purchases',
            function (Blueprint $table): void {
                $table->dropIndex([
                    'supplier_id',
                    'payment_status',
                ]);

                $table->dropIndex([
                    'due_amount',
                    'due_date',
                ]);

                $table->dropColumn([
                    'payment_status',
                    'settlement_type',
                    'paid_amount',
                    'due_amount',
                    'due_date',
                    'payment_terms',
                ]);
            },
        );
    }
};
