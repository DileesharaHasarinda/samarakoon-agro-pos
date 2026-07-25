<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'sale_items',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->foreignId('sale_id')
                    ->constrained()
                    ->cascadeOnDelete();

                $table
                    ->foreignId('product_id')
                    ->constrained()
                    ->restrictOnDelete();

                $table
                    ->foreignId('stock_batch_id')
                    ->constrained()
                    ->restrictOnDelete();

                $table->decimal(
                    'quantity',
                    14,
                    3,
                );

                $table->decimal(
                    'purchase_cost',
                    14,
                    2,
                );

                $table->decimal(
                    'selling_price',
                    14,
                    2,
                );

                $table
                    ->decimal('discount', 14, 2)
                    ->default(0);

                $table->decimal(
                    'line_total',
                    14,
                    2,
                );

                $table->decimal(
                    'gross_profit',
                    14,
                    2,
                );

                $table->timestamps();

                $table->index([
                    'sale_id',
                    'product_id',
                ]);

                $table->index([
                    'stock_batch_id',
                    'created_at',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'sale_items',
        );
    }
};
