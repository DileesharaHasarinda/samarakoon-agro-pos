<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('purchase_items')) {
            return;
        }

        $hasIsDualUnit =
            Schema::hasColumn(
                'purchase_items',
                'is_dual_unit',
            );

        $hasSecondaryUnit =
            Schema::hasColumn(
                'purchase_items',
                'secondary_unit',
            );

        $hasConversionFactor =
            Schema::hasColumn(
                'purchase_items',
                'conversion_factor',
            );

        $hasSecondarySellingPrice =
            Schema::hasColumn(
                'purchase_items',
                'secondary_selling_price',
            );

        Schema::table(
            'purchase_items',
            function (
                Blueprint $table,
            ) use (
                $hasIsDualUnit,
                $hasSecondaryUnit,
                $hasConversionFactor,
                $hasSecondarySellingPrice,
            ): void {
                if (!$hasIsDualUnit) {
                    $table
                        ->boolean('is_dual_unit')
                        ->default(false)
                        ->after('selling_price');
                }

                if (!$hasSecondaryUnit) {
                    $table
                        ->string(
                            'secondary_unit',
                            40,
                        )
                        ->nullable()
                        ->after('is_dual_unit');
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
            },
        );
    }

    public function down(): void
    {
        if (!Schema::hasTable('purchase_items')) {
            return;
        }

        $columns = [];

        if (
            Schema::hasColumn(
                'purchase_items',
                'secondary_selling_price',
            )
        ) {
            $columns[] =
                'secondary_selling_price';
        }

        if (
            Schema::hasColumn(
                'purchase_items',
                'conversion_factor',
            )
        ) {
            $columns[] =
                'conversion_factor';
        }

        if (
            Schema::hasColumn(
                'purchase_items',
                'secondary_unit',
            )
        ) {
            $columns[] =
                'secondary_unit';
        }

        if (
            Schema::hasColumn(
                'purchase_items',
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
            'purchase_items',
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
