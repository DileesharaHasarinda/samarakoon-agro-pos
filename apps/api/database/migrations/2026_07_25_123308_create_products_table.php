<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'products',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->foreignId('category_id')
                    ->constrained()
                    ->restrictOnDelete();

                $table->string(
                    'name',
                    160,
                );

                $table
                    ->string('sku', 100)
                    ->nullable()
                    ->unique();

                $table
                    ->string('barcode', 120)
                    ->nullable()
                    ->unique();

                $table
                    ->text('description')
                    ->nullable();

                $table->decimal(
                    'cost_price',
                    14,
                    2,
                );

                $table->decimal(
                    'selling_price',
                    14,
                    2,
                );

                $table
                    ->unsignedInteger(
                        'reorder_level',
                    )
                    ->default(0);

                $table->string(
                    'unit',
                    40,
                );

                $table
                    ->date('expiry_date')
                    ->nullable();

                $table->timestamps();

                $table->unique([
                    'category_id',
                    'name',
                ]);

                $table->index([
                    'category_id',
                    'name',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'products',
        );
    }
};
