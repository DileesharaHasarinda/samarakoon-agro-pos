<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cheques', function (Blueprint $table) {
            $table->id();

            $table->string('cheque_number', 100);

            $table->enum('type', ['received', 'issued']);

            $table->string('party_name', 190);
            $table->string('bank_name', 190)->nullable();

            $table->decimal('amount', 14, 2);

            $table->date('cheque_date');
            $table->date('due_date');

            $table->enum('status', [
                'pending',
                'cleared',
                'bounced',
                'cancelled',
            ])->default('pending');

            $table->text('notes')->nullable();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('cleared_at')->nullable();
            $table->timestamp('bounced_at')->nullable();

            $table->timestamps();

            $table->index(['type', 'status']);
            $table->index('due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cheques');
    }
};
