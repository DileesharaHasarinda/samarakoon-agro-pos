<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Possible return-item table names used
     * during different project versions.
     *
     * @var array<int, string>
     */
    private array $returnTables = [
        'sale_return_items',
        'sales_return_items',
    ];

    public function up(): void
    {
        foreach (
            $this->returnTables
            as $tableName
        ) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            $hasQuantity =
                Schema::hasColumn(
                    $tableName,
                    'quantity',
                );

            $hasReturnUnit =
                Schema::hasColumn(
                    $tableName,
                    'return_unit',
                );

            $hasConversionFactor =
                Schema::hasColumn(
                    $tableName,
                    'conversion_factor',
                );

            $hasStockQuantity =
                Schema::hasColumn(
                    $tableName,
                    'stock_quantity',
                );

            Schema::table(
                $tableName,
                function (
                    Blueprint $table,
                ) use (
                    $hasQuantity,
                    $hasReturnUnit,
                    $hasConversionFactor,
                    $hasStockQuantity,
                ): void {
                    if (!$hasReturnUnit) {
                        $column = $table
                            ->string(
                                'return_unit',
                                40,
                            )
                            ->nullable();

                        if ($hasQuantity) {
                            $column->after(
                                'quantity',
                            );
                        }
                    }

                    if (!$hasConversionFactor) {
                        $table
                            ->decimal(
                                'conversion_factor',
                                14,
                                3,
                            )
                            ->default(1)
                            ->after('return_unit');
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
             * Set a safe 1:1 default for older
             * normal-unit returns.
             */
            if (
                Schema::hasColumn(
                    $tableName,
                    'conversion_factor',
                )
            ) {
                DB::table($tableName)
                    ->whereNull(
                        'conversion_factor',
                    )
                    ->update([
                        'conversion_factor' => 1,
                    ]);
            }

            if (
                Schema::hasColumn(
                    $tableName,
                    'stock_quantity',
                )
                && Schema::hasColumn(
                    $tableName,
                    'quantity',
                )
            ) {
                DB::statement(
                    "
                    UPDATE `{$tableName}`
                    SET `stock_quantity` = `quantity`
                    WHERE `stock_quantity` IS NULL
                    "
                );
            }

            /*
             * When the table references sale_items,
             * copy the original sale unit and
             * conversion factor.
             */
            if (
                Schema::hasTable('sale_items')
                && Schema::hasColumn(
                    $tableName,
                    'sale_item_id',
                )
                && Schema::hasColumn(
                    $tableName,
                    'quantity',
                )
                && Schema::hasColumn(
                    'sale_items',
                    'sale_unit',
                )
                && Schema::hasColumn(
                    'sale_items',
                    'conversion_factor',
                )
            ) {
                DB::statement(
                    "
                    UPDATE `{$tableName}` AS `ri`
                    INNER JOIN `sale_items` AS `si`
                        ON `si`.`id`
                        = `ri`.`sale_item_id`
                    SET
                        `ri`.`return_unit`
                            = COALESCE(
                                `si`.`sale_unit`,
                                `ri`.`return_unit`
                            ),

                        `ri`.`conversion_factor`
                            = COALESCE(
                                `si`.`conversion_factor`,
                                1
                            ),

                        `ri`.`stock_quantity`
                            = `ri`.`quantity`
                            * COALESCE(
                                `si`.`conversion_factor`,
                                1
                            )
                    "
                );
            }
        }
    }

    public function down(): void
    {
        foreach (
            $this->returnTables
            as $tableName
        ) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            $columns = [];

            if (
                Schema::hasColumn(
                    $tableName,
                    'stock_quantity',
                )
            ) {
                $columns[] =
                    'stock_quantity';
            }

            if (
                Schema::hasColumn(
                    $tableName,
                    'conversion_factor',
                )
            ) {
                $columns[] =
                    'conversion_factor';
            }

            if (
                Schema::hasColumn(
                    $tableName,
                    'return_unit',
                )
            ) {
                $columns[] =
                    'return_unit';
            }

            if ($columns === []) {
                continue;
            }

            Schema::table(
                $tableName,
                function (
                    Blueprint $table,
                ) use ($columns): void {
                    $table->dropColumn(
                        $columns,
                    );
                },
            );
        }
    }
};
