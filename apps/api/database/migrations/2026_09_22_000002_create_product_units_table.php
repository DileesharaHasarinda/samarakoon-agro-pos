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
            'product_units',
            function (
                Blueprint $table,
            ): void {
                $table->id();

                $table
                    ->string(
                        'name',
                        80,
                    )
                    ->unique();

                $table->timestamps();
            },
        );

        /*
         * If this migration is applied to an existing database,
         * preserve already-used unit names automatically.
         *
         * Nothing is hardcoded here.
         *
         * Examples are discovered from:
         * - products.unit
         * - product_variants.package_unit
         *
         * On a fresh database this table starts empty, so the admin
         * can add the required units manually from Product Units.
         */
        $discoveredUnits = [];

        if (
            Schema::hasTable(
                'products',
            )
        ) {
            DB::table(
                'products',
            )
                ->whereNotNull(
                    'unit',
                )
                ->where(
                    'unit',
                    '<>',
                    '',
                )
                ->pluck(
                    'unit',
                )
                ->each(
                    function (
                        mixed $value,
                    ) use (
                        &$discoveredUnits,
                    ): void {
                        $unit =
                            trim(
                                (string) $value,
                            );

                        if ($unit === '') {
                            return;
                        }

                        $discoveredUnits[
                            mb_strtolower(
                                $unit,
                            )
                        ] = $unit;
                    },
                );
        }

        if (
            Schema::hasTable(
                'product_variants',
            )
        ) {
            DB::table(
                'product_variants',
            )
                ->whereNotNull(
                    'package_unit',
                )
                ->where(
                    'package_unit',
                    '<>',
                    '',
                )
                ->pluck(
                    'package_unit',
                )
                ->each(
                    function (
                        mixed $value,
                    ) use (
                        &$discoveredUnits,
                    ): void {
                        $unit =
                            trim(
                                (string) $value,
                            );

                        if ($unit === '') {
                            return;
                        }

                        $discoveredUnits[
                            mb_strtolower(
                                $unit,
                            )
                        ] = $unit;
                    },
                );
        }

        if ($discoveredUnits !== []) {
            $now = now();

            DB::table(
                'product_units',
            )->insert(
                collect(
                    array_values(
                        $discoveredUnits,
                    ),
                )
                    ->sort(
                        SORT_NATURAL
                        | SORT_FLAG_CASE,
                    )
                    ->values()
                    ->map(
                        fn(
                            string $unit,
                        ): array => [
                            'name' =>
                                $unit,

                            'created_at' =>
                                $now,

                            'updated_at' =>
                                $now,
                        ],
                    )
                    ->all(),
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'product_units',
        );
    }
};
