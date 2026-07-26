<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (
            Schema::hasTable('sales_returns')
            && ! Schema::hasTable('sale_returns')
        ) {
            Schema::rename(
                'sales_returns',
                'sale_returns',
            );
        }
    }

    public function down(): void
    {
        if (
            Schema::hasTable('sale_returns')
            && ! Schema::hasTable('sales_returns')
        ) {
            Schema::rename(
                'sale_returns',
                'sales_returns',
            );
        }
    }
};
