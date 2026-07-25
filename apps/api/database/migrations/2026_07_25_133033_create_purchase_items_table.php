<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'purchase_items',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->foreignId('purchase_id')
                    ->constrained()
                    ->cascadeOnDelete();

                $table
                    ->foreignId('product_id')
                    ->constrained()
                    ->restrictOnDelete();

                $table->decimal(
                    'quantity',
                    14,
                    3,
                );

                $table->decimal(
                    'received_quantity',
                    14,
                    3,
                )->default(0);

                $table->decimal(
                    'unit_cost',
                    14,
                    2,
                );

                $table->decimal(
                    'selling_price',
                    14,
                    2,
                );

                $table->decimal(
                    'discount',
                    14,
                    2,
                )->default(0);

                $table->decimal(
                    'line_total',
                    14,
                    2,
                );

                $table
                    ->string('batch_number', 120)
                    ->nullable();

                $table
                    ->date('manufactured_date')
                    ->nullable();

                $table
                    ->date('expiry_date')
                    ->nullable();

                $table
                    ->text('notes')
                    ->nullable();

                $table->timestamps();

                $table->index([
                    'purchase_id',
                    'product_id',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'purchase_items',
        );
    }
};
