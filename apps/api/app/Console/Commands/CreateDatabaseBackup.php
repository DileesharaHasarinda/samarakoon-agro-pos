<?php

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Command;
use Throwable;

class CreateDatabaseBackup
extends Command
{
    /**
     * @var string
     */
    protected $signature =
    'backup:database
        {--notes= : Optional backup notes}
        {--prune : Remove expired backup files}';

    /**
     * @var string
     */
    protected $description =
    'Create a MySQL or MariaDB database backup.';

    public function handle(
        DatabaseBackupService $backupService,
    ): int {
        try {
            $backup =
                $backupService->create(
                    null,
                    $this->option('notes')
                        ? (string) $this
                            ->option('notes')
                        : 'Automatic scheduled database backup.',
                    true,
                );

            $this->info(
                "Backup created: {$backup->backup_number}",
            );

            $this->line(
                "File: {$backup->filename}",
            );

            if ($this->option('prune')) {
                $deleted =
                    $backupService
                    ->pruneExpired();

                $this->info(
                    "Expired backups deleted: {$deleted}",
                );
            }

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->error(
                $exception
                    ->getMessage(),
            );

            return self::FAILURE;
        }
    }
}
