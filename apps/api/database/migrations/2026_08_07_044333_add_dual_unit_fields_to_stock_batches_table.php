<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('stock_batches')) {
            return;
        }

        $hasIsDualUnit =
            Schema::hasColumn(
                'stock_batches',
                'is_dual_unit',
            );

        $hasStockUnit =
            Schema::hasColumn(
                'stock_batches',
                'stock_unit',
            );

        $hasSecondaryUnit =
            Schema::hasColumn(
                'stock_batches',
                'secondary_unit',
            );

        $hasConversionFactor =
            Schema::hasColumn(
                'stock_batches',
                'conversion_factor',
            );

        $hasSecondarySellingPrice =
            Schema::hasColumn(
                'stock_batches',
                'secondary_selling_price',
            );

        $hasBaseUnitCost =
            Schema::hasColumn(
                'stock_batches',
                'base_unit_cost',
            );

        Schema::table(
            'stock_batches',
            function (
                Blueprint $table,
            ) use (
                $hasIsDualUnit,
                $hasStockUnit,
                $hasSecondaryUnit,
                $hasConversionFactor,
                $hasSecondarySellingPrice,
                $hasBaseUnitCost,
            ): void {
                if (!$hasIsDualUnit) {
                    $table
                        ->boolean('is_dual_unit')
                        ->default(false)
                        ->after('selling_price');
                }

                if (!$hasStockUnit) {
                    $table
                        ->string(
                            'stock_unit',
                            40,
                        )
                        ->nullable()
                        ->after('is_dual_unit');
                }

                if (!$hasSecondaryUnit) {
                    $table
                        ->string(
                            'secondary_unit',
                            40,
                        )
                        ->nullable()
                        ->after('stock_unit');
                }

                if (!$hasConversionFactor) {
                    $table
                        ->decimal(
                            'conversion_factor',
                            14,
                            3,
                        )
                        ->default(1)
                        ->after('secondary_unit');
                }

                if (!$hasSecondarySellingPrice) {
                    $table
                        ->decimal(
                            'secondary_selling_price',
                            14,
                            2,
                        )
                        ->nullable()
                        ->after('conversion_factor');
                }

                if (!$hasBaseUnitCost) {
                    $table
                        ->decimal(
                            'base_unit_cost',
                            14,
                            4,
                        )
                        ->nullable()
                        ->after(
                            'secondary_selling_price',
                        );
                }
            },
        );

        /*
         * Existing normal products use the
         * product's normal unit as the stock unit.
         */
        if (
            Schema::hasTable('products')
            && Schema::hasColumn(
                'stock_batches',
                'product_id',
            )
            && Schema::hasColumn(
                'products',
                'unit',
            )
            && Schema::hasColumn(
                'stock_batches',
                'stock_unit',
            )
        ) {
            DB::statement(
                "
                UPDATE `stock_batches` AS `sb`
                INNER JOIN `products` AS `p`
                    ON `p`.`id` = `sb`.`product_id`
                SET `sb`.`stock_unit` = `p`.`unit`
                WHERE
                    `sb`.`stock_unit` IS NULL
                    OR `sb`.`stock_unit` = ''
                "
            );
        }

        /*
         * Existing normal batches use a 1:1
         * conversion.
         */
        if (
            Schema::hasColumn(
                'stock_batches',
                'conversion_factor',
            )
        ) {
            DB::table('stock_batches')
                ->whereNull(
                    'conversion_factor',
                )
                ->update([
                    'conversion_factor' => 1,
                ]);
        }

        /*
         * Existing stock batch cost can be copied
         * to base_unit_cost because normal products
         * use a 1:1 unit conversion.
         */
        if (
            Schema::hasColumn(
                'stock_batches',
                'base_unit_cost',
            )
            && Schema::hasColumn(
                'stock_batches',
                'purchase_cost',
            )
        ) {
            DB::statement(
                "
                UPDATE `stock_batches`
                SET `base_unit_cost` = `purchase_cost`
                WHERE `base_unit_cost` IS NULL
                "
            );
        } elseif (
            Schema::hasColumn(
                'stock_batches',
                'base_unit_cost',
            )
            && Schema::hasColumn(
                'stock_batches',
                'purchase_item_id',
            )
            && Schema::hasTable(
                'purchase_items',
            )
            && Schema::hasColumn(
                'purchase_items',
                'unit_cost',
            )
        ) {
            DB::statement(
                "
                UPDATE `stock_batches` AS `sb`
                INNER JOIN `purchase_items` AS `pi`
                    ON `pi`.`id`
                    = `sb`.`purchase_item_id`
                SET `sb`.`base_unit_cost`
                    = `pi`.`unit_cost`
                WHERE `sb`.`base_unit_cost` IS NULL
                "
            );
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('stock_batches')) {
            return;
        }

        $columns = [];

        if (
            Schema::hasColumn(
                'stock_batches',
                'base_unit_cost',
            )
        ) {
            $columns[] =
                'base_unit_cost';
        }

        if (
            Schema::hasColumn(
                'stock_batches',
                'secondary_selling_price',
            )
        ) {
            $columns[] =
                'secondary_selling_price';
        }

        if (
            Schema::hasColumn(
                'stock_batches',
                'conversion_factor',
            )
        ) {
            $columns[] =
                'conversion_factor';
        }

        if (
            Schema::hasColumn(
                'stock_batches',
                'secondary_unit',
            )
        ) {
            $columns[] =
                'secondary_unit';
        }

        if (
            Schema::hasColumn(
                'stock_batches',
                'stock_unit',
            )
        ) {
            $columns[] =
                'stock_unit';
        }

        if (
            Schema::hasColumn(
                'stock_batches',
                'is_dual_unit',
            )
        ) {
            $columns[] =
                'is_dual_unit';
        }

        if ($columns === []) {
            return;
        }

        Schema::table(
            'stock_batches',
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
