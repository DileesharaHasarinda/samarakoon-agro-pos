<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'suppliers',
            function (Blueprint $table): void {
                $table->id();

                $table->string(
                    'name',
                    160,
                );

                $table
                    ->string(
                        'contact_person',
                        120,
                    )
                    ->nullable();

                $table->string(
                    'phone',
                    30,
                );

                $table
                    ->string(
                        'secondary_phone',
                        30,
                    )
                    ->nullable();

                $table
                    ->string(
                        'email',
                        190,
                    )
                    ->nullable();

                $table
                    ->text('address')
                    ->nullable();

                $table
                    ->text('notes')
                    ->nullable();

                $table->timestamps();

                $table->index('name');
                $table->index('phone');
                $table->index('email');
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'suppliers',
        );
    }
};
