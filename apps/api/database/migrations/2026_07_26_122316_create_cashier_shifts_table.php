<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'cashier_shifts',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->string(
                        'shift_number',
                        50,
                    )
                    ->nullable()
                    ->unique();

                $table
                    ->foreignId('cashier_id')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->decimal(
                    'opening_cash',
                    14,
                    2,
                );

                $table
                    ->string(
                        'status',
                        20,
                    )
                    ->default('open');

                $table->dateTime(
                    'opened_at',
                );

                $table
                    ->dateTime(
                        'closed_at',
                    )
                    ->nullable();

                $table
                    ->decimal(
                        'expected_cash',
                        14,
                        2,
                    )
                    ->nullable();

                $table
                    ->decimal(
                        'actual_cash',
                        14,
                        2,
                    )
                    ->nullable();

                $table
                    ->decimal(
                        'cash_difference',
                        14,
                        2,
                    )
                    ->nullable();

                $table
                    ->text(
                        'opening_notes',
                    )
                    ->nullable();

                $table
                    ->text(
                        'closing_notes',
                    )
                    ->nullable();

                $table
                    ->foreignId(
                        'opened_by',
                    )
                    ->constrained('users')
                    ->restrictOnDelete();

                $table
                    ->foreignId(
                        'closed_by',
                    )
                    ->nullable()
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->timestamps();

                $table->index([
                    'cashier_id',
                    'status',
                ]);

                $table->index([
                    'opened_at',
                    'closed_at',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'cashier_shifts',
        );
    }
};
