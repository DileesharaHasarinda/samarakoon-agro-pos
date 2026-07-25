<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'stock_batches',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->string('batch_code', 60)
                    ->unique();

                $table
                    ->foreignId('product_id')
                    ->constrained()
                    ->restrictOnDelete();

                $table
                    ->foreignId('purchase_item_id')
                    ->unique()
                    ->constrained()
                    ->restrictOnDelete();

                $table
                    ->string('batch_number', 120)
                    ->nullable();

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

                $table->decimal(
                    'received_quantity',
                    14,
                    3,
                );

                $table->decimal(
                    'available_quantity',
                    14,
                    3,
                );

                $table
                    ->date('manufactured_date')
                    ->nullable();

                $table
                    ->date('expiry_date')
                    ->nullable();

                $table->timestamp(
                    'received_at',
                );

                $table->timestamps();

                $table->index([
                    'product_id',
                    'selling_price',
                ]);

                $table->index([
                    'product_id',
                    'expiry_date',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'stock_batches',
        );
    }
};
