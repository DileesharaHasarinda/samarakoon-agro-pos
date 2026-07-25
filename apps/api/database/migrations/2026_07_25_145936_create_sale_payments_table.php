<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'sale_payments',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->foreignId('sale_id')
                    ->constrained()
                    ->cascadeOnDelete();

                $table->string(
                    'payment_method',
                    40,
                );

                $table->decimal(
                    'amount',
                    14,
                    2,
                );

                $table
                    ->string(
                        'reference_number',
                        150,
                    )
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
                    'sale_id',
                    'payment_method',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'sale_payments',
        );
    }
};
