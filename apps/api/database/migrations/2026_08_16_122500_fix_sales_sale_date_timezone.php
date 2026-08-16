<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * Existing affected rows have sale_date approximately 5 hours
         * 30 minutes ahead of created_at because the old TIMESTAMP column
         * used ON UPDATE CURRENT_TIMESTAMP and the MySQL server runs on
         * Sri Lanka local time while Laravel runs in UTC.
         *
         * A POS sale is created and numbered within the same transaction,
         * so for these corrupted rows created_at is the correct sale instant.
         * Restrict the repair to the characteristic +05:30 offset so we do
         * not overwrite any intentionally different historical sale dates.
         */
        DB::statement(
            <<<'SQL'
                UPDATE sales
                SET sale_date = created_at
                WHERE created_at IS NOT NULL
                  AND TIMESTAMPDIFF(
                        MINUTE,
                        created_at,
                        sale_date
                      ) BETWEEN 329 AND 331
            SQL,
        );

        /*
         * sale_date is application-owned. It must never be changed merely
         * because another sales column (for example sale_number) is updated.
         * DATETIME also avoids MySQL session-timezone conversion for this
         * explicit UTC application timestamp.
         */
        DB::statement(
            'ALTER TABLE sales MODIFY sale_date DATETIME NOT NULL',
        );
    }

    public function down(): void
    {
        DB::statement(
            'ALTER TABLE sales MODIFY sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        );
    }
};
