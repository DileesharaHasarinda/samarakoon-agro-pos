<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * Product prices are now entered during
         * purchasing and stored in purchase_items
         * and stock_batches.
         *
         * These legacy product columns must not
         * be required during product creation.
         */
        if (
            Schema::hasColumn(
                'products',
                'cost_price',
            )
        ) {
            DB::statement(
                'ALTER TABLE `products`
                 MODIFY `cost_price`
                 DECIMAL(14,2)
                 NULL
                 DEFAULT NULL'
            );
        }

        if (
            Schema::hasColumn(
                'products',
                'selling_price',
            )
        ) {
            DB::statement(
                'ALTER TABLE `products`
                 MODIFY `selling_price`
                 DECIMAL(14,2)
                 NULL
                 DEFAULT NULL'
            );
        }
    }

    public function down(): void
    {
        if (
            Schema::hasColumn(
                'products',
                'cost_price',
            )
        ) {
            DB::table('products')
                ->whereNull('cost_price')
                ->update([
                    'cost_price' => 0,
                ]);

            DB::statement(
                'ALTER TABLE `products`
                 MODIFY `cost_price`
                 DECIMAL(14,2)
                 NOT NULL
                 DEFAULT 0.00'
            );
        }

        if (
            Schema::hasColumn(
                'products',
                'selling_price',
            )
        ) {
            DB::table('products')
                ->whereNull('selling_price')
                ->update([
                    'selling_price' => 0,
                ]);

            DB::statement(
                'ALTER TABLE `products`
                 MODIFY `selling_price`
                 DECIMAL(14,2)
                 NOT NULL
                 DEFAULT 0.00'
            );
        }
    }
};
