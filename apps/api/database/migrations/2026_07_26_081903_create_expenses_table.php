<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'expenses',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->string(
                        'expense_number',
                        50,
                    )
                    ->nullable()
                    ->unique();

                $table
                    ->foreignId(
                        'expense_category_id',
                    )
                    ->constrained(
                        'expense_categories',
                    )
                    ->restrictOnDelete();

                $table->date(
                    'expense_date',
                );

                $table->decimal(
                    'amount',
                    14,
                    2,
                );

                $table->string(
                    'payment_method',
                    40,
                );

                $table
                    ->string(
                        'expense_type',
                        30,
                    )
                    ->default('one_time');

                $table
                    ->string(
                        'recurring_frequency',
                        30,
                    )
                    ->nullable();

                $table
                    ->date(
                        'recurring_end_date',
                    )
                    ->nullable();

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

                $table
                    ->text('notes')
                    ->nullable();

                $table
                    ->foreignId('created_by')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->timestamps();

                $table->index([
                    'expense_date',
                    'expense_category_id',
                ]);

                $table->index([
                    'expense_type',
                    'expense_date',
                ]);

                $table->index([
                    'payment_method',
                    'expense_date',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'expenses',
        );
    }
};
