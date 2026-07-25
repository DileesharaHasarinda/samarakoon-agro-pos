<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'sales',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->string('sale_number', 50)
                    ->nullable()
                    ->unique();

                $table->timestamp('sale_date');

                $table
                    ->decimal('subtotal', 14, 2)
                    ->default(0);

                $table
                    ->decimal(
                        'item_discount_total',
                        14,
                        2,
                    )
                    ->default(0);

                $table
                    ->decimal('discount', 14, 2)
                    ->default(0);

                $table
                    ->decimal('grand_total', 14, 2)
                    ->default(0);

                $table
                    ->decimal('paid_amount', 14, 2)
                    ->default(0);

                $table
                    ->decimal('change_amount', 14, 2)
                    ->default(0);

                $table
                    ->decimal('gross_profit', 14, 2)
                    ->default(0);

                $table
                    ->decimal('net_profit', 14, 2)
                    ->default(0);

                $table
                    ->string('payment_status', 30)
                    ->default('paid')
                    ->index();

                $table
                    ->text('notes')
                    ->nullable();

                $table
                    ->foreignId('created_by')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->timestamps();

                $table->index([
                    'sale_date',
                    'created_by',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
