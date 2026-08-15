<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (
            Schema::hasTable(
                'product_variants',
            )
            && ! Schema::hasColumn(
                'product_variants',
                'sort_order',
            )
        ) {
            Schema::table(
                'product_variants',
                function (
                    Blueprint $table,
                ): void {
                    $table
                        ->unsignedInteger(
                            'sort_order',
                        )
                        ->default(0)
                        ->after(
                            'is_active',
                        );

                    $table->index(
                        [
                            'product_id',
                            'sort_order',
                        ],
                        'product_variants_product_sort_index',
                    );
                },
            );
        }
    }

    public function down(): void
    {
        if (
            Schema::hasTable(
                'product_variants',
            )
            && Schema::hasColumn(
                'product_variants',
                'sort_order',
            )
        ) {
            Schema::table(
                'product_variants',
                function (
                    Blueprint $table,
                ): void {
                    $table->dropIndex(
                        'product_variants_product_sort_index',
                    );

                    $table->dropColumn(
                        'sort_order',
                    );
                },
            );
        }
    }
};
