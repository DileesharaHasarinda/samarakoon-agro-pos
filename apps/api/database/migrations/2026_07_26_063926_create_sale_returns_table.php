<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'sale_returns',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->string('return_number', 50)
                    ->nullable()
                    ->unique();

                $table
                    ->foreignId('sale_id')
                    ->constrained('sales')
                    ->restrictOnDelete();

                $table->timestamp(
                    'return_date',
                );

                $table->string(
                    'refund_method',
                    40,
                );

                $table
                    ->decimal(
                        'refund_amount',
                        14,
                        2,
                    )
                    ->default(0);

                $table
                    ->decimal(
                        'cost_value',
                        14,
                        2,
                    )
                    ->default(0);

                $table
                    ->decimal(
                        'profit_reversal',
                        14,
                        2,
                    )
                    ->default(0);

                $table
                    ->decimal(
                        'restocked_quantity',
                        14,
                        3,
                    )
                    ->default(0);

                $table->string(
                    'reason',
                    255,
                );

                $table
                    ->text('notes')
                    ->nullable();

                $table
                    ->string('status', 30)
                    ->default('completed');

                $table
                    ->foreignId('created_by')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->timestamps();

                $table->index([
                    'sale_id',
                    'return_date',
                ]);

                $table->index([
                    'refund_method',
                    'return_date',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'sale_returns',
        );
    }
};
