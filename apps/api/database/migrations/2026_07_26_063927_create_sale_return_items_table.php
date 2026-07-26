<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'sale_return_items',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->foreignId('sale_return_id')
                    ->constrained(
                        'sale_returns',
                    )
                    ->cascadeOnDelete();

                $table
                    ->foreignId('sale_item_id')
                    ->constrained(
                        'sale_items',
                    )
                    ->restrictOnDelete();

                $table
                    ->foreignId('product_id')
                    ->constrained(
                        'products',
                    )
                    ->restrictOnDelete();

                $table
                    ->foreignId('stock_batch_id')
                    ->constrained(
                        'stock_batches',
                    )
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
                    ->decimal(
                        'item_discount_reversal',
                        14,
                        2,
                    )
                    ->default(0);

                $table
                    ->decimal(
                        'sale_discount_reversal',
                        14,
                        2,
                    )
                    ->default(0);

                $table->decimal(
                    'refund_amount',
                    14,
                    2,
                );

                $table->decimal(
                    'cost_value',
                    14,
                    2,
                );

                $table->decimal(
                    'profit_reversal',
                    14,
                    2,
                );

                $table
                    ->boolean('restocked')
                    ->default(true);

                $table->timestamps();

                $table->index([
                    'sale_return_id',
                    'sale_item_id',
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
            'sale_return_items',
        );
    }
};
