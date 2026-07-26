<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'database_backups',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->string(
                        'backup_number',
                        60,
                    )
                    ->unique();

                $table
                    ->string(
                        'filename',
                        255,
                    )
                    ->unique();

                $table
                    ->string(
                        'disk',
                        50,
                    )
                    ->default('local');

                $table
                    ->string(
                        'path',
                        500,
                    );

                $table
                    ->string(
                        'database_name',
                        160,
                    );

                $table
                    ->string(
                        'status',
                        30,
                    )
                    ->default('processing');

                $table
                    ->unsignedBigInteger(
                        'file_size',
                    )
                    ->nullable();

                $table
                    ->string(
                        'checksum',
                        64,
                    )
                    ->nullable();

                $table
                    ->boolean(
                        'is_scheduled',
                    )
                    ->default(false);

                $table
                    ->text('notes')
                    ->nullable();

                $table
                    ->text('error_message')
                    ->nullable();

                $table
                    ->foreignId('created_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table
                    ->foreignId('restored_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table
                    ->dateTime('completed_at')
                    ->nullable();

                $table
                    ->dateTime('restored_at')
                    ->nullable();

                $table->timestamps();

                $table->index([
                    'status',
                    'created_at',
                ]);

                $table->index([
                    'is_scheduled',
                    'created_at',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'database_backups',
        );
    }
};
