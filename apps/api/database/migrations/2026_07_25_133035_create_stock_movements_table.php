<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'stock_movements',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->foreignId('product_id')
                    ->constrained()
                    ->restrictOnDelete();

                $table
                    ->foreignId('stock_batch_id')
                    ->nullable()
                    ->constrained()
                    ->restrictOnDelete();

                $table->string(
                    'movement_type',
                    50,
                );

                $table->decimal(
                    'quantity_before',
                    14,
                    3,
                );

                $table->decimal(
                    'quantity_change',
                    14,
                    3,
                );

                $table->decimal(
                    'quantity_after',
                    14,
                    3,
                );

                $table
                    ->string('reference_type', 50)
                    ->nullable();

                $table
                    ->unsignedBigInteger('reference_id')
                    ->nullable();

                $table
                    ->string('reference_number', 80)
                    ->nullable();

                $table
                    ->text('notes')
                    ->nullable();

                $table
                    ->foreignId('created_by')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->timestamps();

                $table->index([
                    'product_id',
                    'created_at',
                ]);

                $table->index([
                    'reference_type',
                    'reference_id',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'stock_movements',
        );
    }
};
