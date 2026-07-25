<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'purchases',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->string('purchase_number', 40)
                    ->nullable()
                    ->unique();

                $table
                    ->foreignId('supplier_id')
                    ->constrained()
                    ->restrictOnDelete();

                $table
                    ->string(
                        'supplier_invoice_number',
                        120,
                    )
                    ->nullable();

                $table->date('purchase_date');

                $table
                    ->string('status', 30)
                    ->default('draft')
                    ->index();

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
                    ->decimal(
                        'additional_cost',
                        14,
                        2,
                    )
                    ->default(0);

                $table
                    ->decimal('grand_total', 14, 2)
                    ->default(0);

                $table
                    ->text('notes')
                    ->nullable();

                $table
                    ->foreignId('created_by')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table
                    ->foreignId('received_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table
                    ->timestamp('received_at')
                    ->nullable();

                $table->timestamps();

                $table->index([
                    'supplier_id',
                    'purchase_date',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('purchases');
    }
};
