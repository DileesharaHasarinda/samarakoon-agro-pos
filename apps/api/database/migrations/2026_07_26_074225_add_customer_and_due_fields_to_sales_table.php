<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'sales',
            function (Blueprint $table): void {
                $table
                    ->foreignId('customer_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('customers')
                    ->nullOnDelete();

                $table
                    ->string(
                        'settlement_type',
                        30,
                    )
                    ->default('full')
                    ->after('payment_status');

                $table
                    ->decimal(
                        'due_amount',
                        14,
                        2,
                    )
                    ->default(0)
                    ->after('paid_amount');

                $table
                    ->date('due_date')
                    ->nullable()
                    ->after('due_amount');

                $table->index([
                    'customer_id',
                    'payment_status',
                ]);

                $table->index([
                    'due_amount',
                    'due_date',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::table(
            'sales',
            function (Blueprint $table): void {
                $table->dropIndex([
                    'customer_id',
                    'payment_status',
                ]);

                $table->dropIndex([
                    'due_amount',
                    'due_date',
                ]);

                $table->dropConstrainedForeignId(
                    'customer_id',
                );

                $table->dropColumn([
                    'settlement_type',
                    'due_amount',
                    'due_date',
                ]);
            },
        );
    }
};
