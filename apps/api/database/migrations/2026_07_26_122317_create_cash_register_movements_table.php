<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'cash_register_movements',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->foreignId(
                        'cashier_shift_id',
                    )
                    ->constrained(
                        'cashier_shifts',
                    )
                    ->cascadeOnDelete();

                $table->string(
                    'movement_type',
                    20,
                );

                $table->string(
                    'reason',
                    50,
                );

                $table->decimal(
                    'amount',
                    14,
                    2,
                );

                $table->string(
                    'description',
                    255,
                );

                $table
                    ->string(
                        'reference_number',
                        160,
                    )
                    ->nullable();

                $table->dateTime(
                    'occurred_at',
                );

                $table
                    ->foreignId('created_by')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->timestamps();

                $table->index([
                    'cashier_shift_id',
                    'movement_type',
                ]);

                $table->index(
                    'occurred_at',
                );
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'cash_register_movements',
        );
    }
};
