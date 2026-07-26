<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'purchase_payments',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->foreignId('purchase_id')
                    ->constrained('purchases')
                    ->cascadeOnDelete();

                $table->string(
                    'payment_method',
                    40,
                );

                $table
                    ->string(
                        'payment_type',
                        40,
                    )
                    ->default('supplier_due_payment');

                $table->decimal(
                    'amount',
                    14,
                    2,
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

                $table->dateTime(
                    'payment_date',
                );

                $table
                    ->foreignId('created_by')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->timestamps();

                $table->index([
                    'purchase_id',
                    'payment_date',
                ]);

                $table->index([
                    'payment_method',
                    'payment_date',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'purchase_payments',
        );
    }
};
