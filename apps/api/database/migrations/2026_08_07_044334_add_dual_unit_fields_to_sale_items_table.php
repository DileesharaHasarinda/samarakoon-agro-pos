<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('sale_items')) {
            return;
        }

        $hasSaleUnit =
            Schema::hasColumn(
                'sale_items',
                'sale_unit',
            );

        $hasConversionFactor =
            Schema::hasColumn(
                'sale_items',
                'conversion_factor',
            );

        $hasStockQuantity =
            Schema::hasColumn(
                'sale_items',
                'stock_quantity',
            );

        Schema::table(
            'sale_items',
            function (
                Blueprint $table,
            ) use (
                $hasSaleUnit,
                $hasConversionFactor,
                $hasStockQuantity,
            ): void {
                if (!$hasSaleUnit) {
                    $table
                        ->string(
                            'sale_unit',
                            40,
                        )
                        ->nullable()
                        ->after('quantity');
                }

                if (!$hasConversionFactor) {
                    $table
                        ->decimal(
                            'conversion_factor',
                            14,
                            3,
                        )
                        ->default(1)
                        ->after('sale_unit');
                }

                if (!$hasStockQuantity) {
                    $table
                        ->decimal(
                            'stock_quantity',
                            14,
                            3,
                        )
                        ->nullable()
                        ->after(
                            'conversion_factor',
                        );
                }
            },
        );

        /*
         * Existing sale items are normal 1:1
         * unit sales.
         */
        if (
            Schema::hasColumn(
                'sale_items',
                'stock_quantity',
            )
            && Schema::hasColumn(
                'sale_items',
                'quantity',
            )
        ) {
            DB::statement(
                "
                UPDATE `sale_items`
                SET `stock_quantity` = `quantity`
                WHERE `stock_quantity` IS NULL
                "
            );
        }

        if (
            Schema::hasColumn(
                'sale_items',
                'conversion_factor',
            )
        ) {
            DB::table('sale_items')
                ->whereNull(
                    'conversion_factor',
                )
                ->update([
                    'conversion_factor' => 1,
                ]);
        }

        /*
         * Copy the product unit to existing
         * historical sale items.
         */
        if (
            Schema::hasTable('products')
            && Schema::hasColumn(
                'sale_items',
                'product_id',
            )
            && Schema::hasColumn(
                'products',
                'unit',
            )
            && Schema::hasColumn(
                'sale_items',
                'sale_unit',
            )
        ) {
            DB::statement(
                "
                UPDATE `sale_items` AS `si`
                INNER JOIN `products` AS `p`
                    ON `p`.`id` = `si`.`product_id`
                SET `si`.`sale_unit` = `p`.`unit`
                WHERE
                    `si`.`sale_unit` IS NULL
                    OR `si`.`sale_unit` = ''
                "
            );
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('sale_items')) {
            return;
        }

        $columns = [];

        if (
            Schema::hasColumn(
                'sale_items',
                'stock_quantity',
            )
        ) {
            $columns[] =
                'stock_quantity';
        }

        if (
            Schema::hasColumn(
                'sale_items',
                'conversion_factor',
            )
        ) {
            $columns[] =
                'conversion_factor';
        }

        if (
            Schema::hasColumn(
                'sale_items',
                'sale_unit',
            )
        ) {
            $columns[] =
                'sale_unit';
        }

        if ($columns === []) {
            return;
        }

        Schema::table(
            'sale_items',
            function (
                Blueprint $table,
            ) use ($columns): void {
                $table->dropColumn(
                    $columns,
                );
            },
        );
    }
};
