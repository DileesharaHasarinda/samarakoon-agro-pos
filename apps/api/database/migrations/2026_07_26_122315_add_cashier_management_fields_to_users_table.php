<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'phone')) {
            Schema::table(
                'users',
                function (Blueprint $table): void {
                    $table
                        ->string('phone', 30)
                        ->nullable()
                        ->after('email');
                },
            );
        }

        if (! Schema::hasColumn('users', 'is_active')) {
            Schema::table(
                'users',
                function (Blueprint $table): void {
                    $table
                        ->boolean('is_active')
                        ->default(true)
                        ->after('password');

                    $table->index([
                        'role',
                        'is_active',
                    ]);
                },
            );
        }

        if (! Schema::hasColumn('users', 'last_login_at')) {
            Schema::table(
                'users',
                function (Blueprint $table): void {
                    $table
                        ->dateTime('last_login_at')
                        ->nullable()
                        ->after('is_active');
                },
            );
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'last_login_at')) {
            Schema::table(
                'users',
                function (Blueprint $table): void {
                    $table->dropColumn(
                        'last_login_at',
                    );
                },
            );
        }

        if (Schema::hasColumn('users', 'is_active')) {
            Schema::table(
                'users',
                function (Blueprint $table): void {
                    try {
                        $table->dropIndex([
                            'role',
                            'is_active',
                        ]);
                    } catch (Throwable) {
                        // Index may already have been removed.
                    }

                    $table->dropColumn(
                        'is_active',
                    );
                },
            );
        }

        if (Schema::hasColumn('users', 'phone')) {
            Schema::table(
                'users',
                function (Blueprint $table): void {
                    $table->dropColumn(
                        'phone',
                    );
                },
            );
        }
    }
};
