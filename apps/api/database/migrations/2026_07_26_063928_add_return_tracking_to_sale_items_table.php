<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'sale_items',
            function (Blueprint $table): void {
                $table
                    ->decimal(
                        'returned_quantity',
                        14,
                        3,
                    )
                    ->default(0)
                    ->after('quantity');

                $table
                    ->decimal(
                        'returned_amount',
                        14,
                        2,
                    )
                    ->default(0)
                    ->after('line_total');

                $table->index([
                    'sale_id',
                    'returned_quantity',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::table(
            'sale_items',
            function (Blueprint $table): void {
                $table->dropIndex([
                    'sale_id',
                    'returned_quantity',
                ]);

                $table->dropColumn([
                    'returned_quantity',
                    'returned_amount',
                ]);
            },
        );
    }
};
