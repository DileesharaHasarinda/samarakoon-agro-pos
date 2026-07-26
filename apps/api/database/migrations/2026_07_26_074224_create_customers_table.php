<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'customers',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->string('customer_code', 40)
                    ->nullable()
                    ->unique();

                $table->string(
                    'name',
                    160,
                );

                $table
                    ->string('mobile', 30)
                    ->nullable()
                    ->unique();

                $table
                    ->string(
                        'secondary_mobile',
                        30,
                    )
                    ->nullable();

                $table
                    ->string('email', 160)
                    ->nullable();

                $table
                    ->text('address')
                    ->nullable();

                $table
                    ->string(
                        'customer_type',
                        40,
                    )
                    ->default('retail');

                /*
                 * A value of zero means that
                 * no fixed credit limit is used.
                 */
                $table
                    ->decimal(
                        'credit_limit',
                        14,
                        2,
                    )
                    ->default(0);

                $table
                    ->text('notes')
                    ->nullable();

                $table
                    ->boolean('is_active')
                    ->default(true);

                $table
                    ->foreignId('created_by')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->timestamps();

                $table->index([
                    'name',
                    'is_active',
                ]);

                $table->index([
                    'customer_type',
                    'is_active',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'customers',
        );
    }
};
