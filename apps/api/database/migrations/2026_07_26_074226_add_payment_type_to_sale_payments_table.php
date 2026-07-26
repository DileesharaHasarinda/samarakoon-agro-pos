<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'sale_payments',
            function (Blueprint $table): void {
                $table
                    ->string(
                        'payment_type',
                        40,
                    )
                    ->default('initial_payment')
                    ->after('payment_method');

                $table->index([
                    'payment_type',
                    'created_at',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::table(
            'sale_payments',
            function (Blueprint $table): void {
                $table->dropIndex([
                    'payment_type',
                    'created_at',
                ]);

                $table->dropColumn(
                    'payment_type',
                );
            },
        );
    }
};
