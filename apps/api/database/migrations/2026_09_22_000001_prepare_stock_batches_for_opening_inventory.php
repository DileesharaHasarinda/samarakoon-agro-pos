<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * Existing stock batches are currently forced to belong
         * to a purchase item.
         *
         * Opening inventory represents stock that already existed
         * before this POS migration, so it must be allowed to have:
         *
         * purchase_item_id = NULL
         */
        Schema::table(
            'stock_batches',
            function (
                Blueprint $table,
            ): void {
                $table->dropForeign([
                    'purchase_item_id',
                ]);
            },
        );

        /*
         * MySQL is used by this project.
         *
         * Using a direct ALTER keeps this migration independent
         * of Doctrine DBAL for the nullable column change.
         */
        DB::statement(
            'ALTER TABLE stock_batches '
                . 'MODIFY purchase_item_id BIGINT UNSIGNED NULL'
        );

        Schema::table(
            'stock_batches',
            function (
                Blueprint $table,
            ): void {
                $table
                    ->foreign(
                        'purchase_item_id',
                    )
                    ->references('id')
                    ->on('purchase_items')
                    ->nullOnDelete();

                /*
                 * Normal purchase stock still obtains its supplier
                 * from purchase -> supplier.
                 *
                 * Opening inventory has no purchase, so supplier_id
                 * is stored directly on the stock batch.
                 */
                $table
                    ->foreignId(
                        'supplier_id',
                    )
                    ->nullable()
                    ->after(
                        'purchase_item_id',
                    )
                    ->constrained(
                        'suppliers',
                    )
                    ->nullOnDelete();

                /*
                 * Existing rows automatically become "purchase".
                 *
                 * New opening-stock rows use:
                 * opening_inventory
                 */
                $table
                    ->string(
                        'source_type',
                        32,
                    )
                    ->default(
                        'purchase',
                    )
                    ->after(
                        'supplier_id',
                    )
                    ->index();
            },
        );
    }

    public function down(): void
    {
        /*
         * Do not silently delete opening inventory during rollback.
         *
         * The original schema requires purchase_item_id NOT NULL,
         * so rollback is only safe when no opening-inventory batch
         * remains.
         */
        if (
            DB::table(
                'stock_batches',
            )
            ->whereNull(
                'purchase_item_id',
            )
            ->exists()
        ) {
            throw new \RuntimeException(
                'Cannot roll back the opening inventory migration while '
                    . 'stock batches with purchase_item_id = NULL exist.'
            );
        }

        Schema::table(
            'stock_batches',
            function (
                Blueprint $table,
            ): void {
                $table->dropForeign([
                    'supplier_id',
                ]);

                $table->dropColumn([
                    'supplier_id',
                    'source_type',
                ]);

                $table->dropForeign([
                    'purchase_item_id',
                ]);
            },
        );

        DB::statement(
            'ALTER TABLE stock_batches '
                . 'MODIFY purchase_item_id BIGINT UNSIGNED NOT NULL'
        );

        Schema::table(
            'stock_batches',
            function (
                Blueprint $table,
            ): void {
                $table
                    ->foreign(
                        'purchase_item_id',
                    )
                    ->references('id')
                    ->on('purchase_items')
                    ->cascadeOnDelete();
            },
        );
    }
};
