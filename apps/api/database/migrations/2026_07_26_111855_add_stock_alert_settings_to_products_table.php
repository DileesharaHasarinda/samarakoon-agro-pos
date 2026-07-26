<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'products',
            function (Blueprint $table): void {
                $table
                    ->decimal(
                        'minimum_stock_level',
                        14,
                        3,
                    )
                    ->default(0);

                $table
                    ->decimal(
                        'reorder_quantity',
                        14,
                        3,
                    )
                    ->default(0);

                $table
                    ->unsignedInteger(
                        'expiry_alert_days',
                    )
                    ->default(30);

                $table->index(
                    'minimum_stock_level',
                );
            },
        );
    }

    public function down(): void
    {
        Schema::table(
            'products',
            function (Blueprint $table): void {
                $table->dropIndex([
                    'minimum_stock_level',
                ]);

                $table->dropColumn([
                    'minimum_stock_level',
                    'reorder_quantity',
                    'expiry_alert_days',
                ]);
            },
        );
    }
};
