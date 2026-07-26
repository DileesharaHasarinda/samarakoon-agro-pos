<?php

namespace App\Services;

use App\Models\DatabaseBackup;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;

class DatabaseBackupService
{
    public function create(
        ?User $user = null,
        ?string $notes = null,
        bool $scheduled = false,
    ): DatabaseBackup {
        $connection =
            $this->databaseConnection();

        $disk =
            (string) config(
                'backup.disk',
                'local',
            );

        $directory =
            trim(
                (string) config(
                    'backup.directory',
                    'database-backups',
                ),
                '/',
            );

        Storage::disk($disk)
            ->makeDirectory(
                $directory,
            );

        $databaseName =
            (string) $connection['database'];

        $safeDatabaseName =
            Str::slug(
                $databaseName,
                '_',
            );

        $timestamp =
            now()->format(
                'Ymd_His',
            );

        $random =
            Str::lower(
                Str::random(6),
            );

        $filename =
            "{$safeDatabaseName}_{$timestamp}_{$random}.sql";

        $path =
            "{$directory}/{$filename}";

        $backup =
            DatabaseBackup::query()
            ->create([
                'backup_number' =>
                sprintf(
                    'BKP-%s-%s',
                    now()->format(
                        'YmdHis',
                    ),
                    Str::upper(
                        Str::random(6),
                    ),
                ),

                'filename' =>
                $filename,

                'disk' =>
                $disk,

                'path' =>
                $path,

                'database_name' =>
                $databaseName,

                'status' =>
                DatabaseBackup::STATUS_PROCESSING,

                'file_size' =>
                null,

                'checksum' =>
                null,

                'is_scheduled' =>
                $scheduled,

                'notes' =>
                $notes,

                'error_message' =>
                null,

                'created_by' =>
                $user?->id,

                'completed_at' =>
                null,
            ]);

        try {
            $absolutePath =
                Storage::disk(
                    $disk,
                )->path(
                    $path,
                );

            $handle =
                fopen(
                    $absolutePath,
                    'wb',
                );

            if ($handle === false) {
                throw new RuntimeException(
                    'Unable to create the backup file.',
                );
            }

            $errorOutput = '';

            $process =
                new Process(
                    $this->dumpCommand(
                        $connection,
                    ),
                    base_path(),
                    $this->processEnvironment(
                        $connection,
                    ),
                );

            $process->setTimeout(
                $this->timeout(),
            );

            $process->setIdleTimeout(
                $this->timeout(),
            );

            try {
                $process->run(
                    function (
                        string $type,
                        string $buffer,
                    ) use (
                        $handle,
                        &$errorOutput,
                    ): void {
                        if (
                            $type
                            === Process::OUT
                        ) {
                            fwrite(
                                $handle,
                                $buffer,
                            );

                            return;
                        }

                        $errorOutput .=
                            $buffer;
                    },
                );
            } finally {
                fclose($handle);
            }

            if (! $process->isSuccessful()) {
                throw new RuntimeException(
                    trim(
                        $errorOutput,
                    ) !== ''
                        ? trim(
                            $errorOutput,
                        )
                        : 'The database backup command failed.',
                );
            }

            $fileSize =
                Storage::disk(
                    $disk,
                )->size(
                    $path,
                );

            if ($fileSize <= 0) {
                throw new RuntimeException(
                    'The created backup file is empty.',
                );
            }

            $checksum =
                hash_file(
                    'sha256',
                    $absolutePath,
                );

            if (! is_string($checksum)) {
                throw new RuntimeException(
                    'Unable to calculate the backup checksum.',
                );
            }

            $backup->forceFill([
                'status' =>
                DatabaseBackup::STATUS_COMPLETED,

                'file_size' =>
                $fileSize,

                'checksum' =>
                $checksum,

                'completed_at' =>
                now(),

                'error_message' =>
                null,
            ]);

            $backup->save();

            return $backup->fresh([
                'createdBy:id,name,username',
            ]);
        } catch (Throwable $exception) {
            if (
                Storage::disk($disk)
                ->exists($path)
            ) {
                Storage::disk($disk)
                    ->delete($path);
            }

            $backup->forceFill([
                'status' =>
                DatabaseBackup::STATUS_FAILED,

                'error_message' =>
                Str::limit(
                    $exception
                        ->getMessage(),
                    2000,
                ),
            ]);

            $backup->save();

            throw $exception;
        }
    }

    /**
     * @return array{
     *     restored_backup_number: string,
     *     safety_backup_number: string
     * }
     */
    public function restore(
        DatabaseBackup $backup,
        User $user,
    ): array {
        if (! $backup->isDownloadable()) {
            throw new RuntimeException(
                'Only completed backups can be restored.',
            );
        }

        $disk =
            $backup->disk;

        $path =
            $backup->path;

        if (
            ! Storage::disk($disk)
                ->exists($path)
        ) {
            throw new RuntimeException(
                'The selected backup file does not exist.',
            );
        }

        $absolutePath =
            Storage::disk($disk)
            ->path($path);

        if ($backup->checksum) {
            $currentChecksum =
                hash_file(
                    'sha256',
                    $absolutePath,
                );

            if (
                ! is_string(
                    $currentChecksum,
                )
                || ! hash_equals(
                    $backup->checksum,
                    $currentChecksum,
                )
            ) {
                throw new RuntimeException(
                    'The backup checksum is invalid. The file may have been changed or damaged.',
                );
            }
        }

        /*
         * Always create a safety backup before
         * changing the current database.
         */
        $safetyBackup =
            $this->create(
                $user,
                "Automatic safety backup before restoring {$backup->backup_number}.",
                false,
            );

        $restoredBackupNumber =
            $backup->backup_number;

        $safetyBackupData = [
            'backup_number' =>
            $safetyBackup
                ->backup_number,

            'filename' =>
            $safetyBackup
                ->filename,

            'disk' =>
            $safetyBackup->disk,

            'path' =>
            $safetyBackup->path,

            'database_name' =>
            $safetyBackup
                ->database_name,

            'status' =>
            DatabaseBackup::STATUS_COMPLETED,

            'file_size' =>
            $safetyBackup
                ->file_size,

            'checksum' =>
            $safetyBackup
                ->checksum,

            'is_scheduled' =>
            false,

            'notes' =>
            $safetyBackup->notes,

            'error_message' =>
            null,

            'created_by' =>
            null,

            'completed_at' =>
            $safetyBackup
                ->completed_at,

            'created_at' =>
            $safetyBackup
                ->created_at,

            'updated_at' =>
            now(),
        ];

        $backup->forceFill([
            'status' =>
            DatabaseBackup::STATUS_RESTORING,

            'error_message' =>
            null,
        ]);

        $backup->save();

        $connection =
            $this->databaseConnection();

        $stream =
            fopen(
                $absolutePath,
                'rb',
            );

        if ($stream === false) {
            throw new RuntimeException(
                'Unable to open the selected backup file.',
            );
        }

        $process =
            new Process(
                $this->restoreCommand(
                    $connection,
                ),
                base_path(),
                $this->processEnvironment(
                    $connection,
                ),
            );

        $process->setInput(
            $stream,
        );

        $process->setTimeout(
            $this->timeout(),
        );

        $process->setIdleTimeout(
            $this->timeout(),
        );

        try {
            $process->run();
        } finally {
            fclose($stream);
        }

        if (! $process->isSuccessful()) {
            try {
                DatabaseBackup::query()
                    ->where(
                        'backup_number',
                        $restoredBackupNumber,
                    )
                    ->update([
                        'status' =>
                        DatabaseBackup::STATUS_COMPLETED,

                        'error_message' =>
                        Str::limit(
                            $process
                                ->getErrorOutput()
                                ?: 'The database restoration command failed.',
                            2000,
                        ),

                        'updated_at' =>
                        now(),
                    ]);
            } catch (Throwable) {
                // The restored database may not contain
                // the backup table yet.
            }

            throw new RuntimeException(
                trim(
                    $process
                        ->getErrorOutput(),
                ) !== ''
                    ? trim(
                        $process
                            ->getErrorOutput(),
                    )
                    : 'The database restoration command failed.',
            );
        }

        /*
         * The restored backup may contain an older
         * version of the database_backups table.
         * Reinsert the safety backup record when
         * the table is available.
         */
        try {
            if (
                Schema::hasTable(
                    'database_backups',
                )
            ) {
                DatabaseBackup::query()
                    ->updateOrCreate(
                        [
                            'backup_number' =>
                            $safetyBackupData['backup_number'],
                        ],
                        $safetyBackupData,
                    );

                DatabaseBackup::query()
                    ->where(
                        'backup_number',
                        $restoredBackupNumber,
                    )
                    ->update([
                        'status' =>
                        DatabaseBackup::STATUS_RESTORED,

                        'restored_by' =>
                        User::query()
                            ->whereKey(
                                $user->id,
                            )
                            ->exists()
                            ? $user->id
                            : null,

                        'restored_at' =>
                        now(),

                        'error_message' =>
                        null,

                        'updated_at' =>
                        now(),
                    ]);
            }
        } catch (Throwable) {
            /*
             * Restoration itself was successful.
             * Do not report failure only because
             * backup-history metadata could not be
             * updated.
             */
        }

        return [
            'restored_backup_number' =>
            $restoredBackupNumber,

            'safety_backup_number' =>
            $safetyBackup
                ->backup_number,
        ];
    }

    public function delete(
        DatabaseBackup $backup,
    ): void {
        if (
            in_array(
                $backup->status,
                [
                    DatabaseBackup::STATUS_PROCESSING,

                    DatabaseBackup::STATUS_RESTORING,
                ],
                true,
            )
        ) {
            throw new RuntimeException(
                'A backup currently being processed cannot be deleted.',
            );
        }

        if (
            Storage::disk(
                $backup->disk,
            )->exists(
                $backup->path,
            )
        ) {
            Storage::disk(
                $backup->disk,
            )->delete(
                $backup->path,
            );
        }

        $backup->delete();
    }

    public function pruneExpired(): int
    {
        $retentionDays =
            max(
                1,
                (int) config(
                    'backup.retention_days',
                    30,
                ),
            );

        $backups =
            DatabaseBackup::query()
            ->whereIn(
                'status',
                [
                    DatabaseBackup::STATUS_COMPLETED,

                    DatabaseBackup::STATUS_RESTORED,

                    DatabaseBackup::STATUS_FAILED,
                ],
            )
            ->where(
                'created_at',
                '<',
                now()->subDays(
                    $retentionDays,
                ),
            )
            ->get();

        $deletedCount = 0;

        foreach ($backups as $backup) {
            try {
                $this->delete(
                    $backup,
                );

                $deletedCount++;
            } catch (Throwable) {
                // Continue pruning other backup files.
            }
        }

        return $deletedCount;
    }

    /**
     * @return array<string, mixed>
     */
    private function databaseConnection(): array
    {
        $connectionName =
            (string) config(
                'database.default',
            );

        $connection =
            config(
                "database.connections.{$connectionName}",
            );

        if (! is_array($connection)) {
            throw new RuntimeException(
                'The active database connection could not be loaded.',
            );
        }

        $driver =
            (string) (
                $connection['driver']
                ?? ''
            );

        if (
            ! in_array(
                $driver,
                [
                    'mysql',
                    'mariadb',
                ],
                true,
            )
        ) {
            throw new RuntimeException(
                'Database backup currently supports only MySQL and MariaDB.',
            );
        }

        if (
            empty($connection['database'])
        ) {
            throw new RuntimeException(
                'The database name is not configured.',
            );
        }

        return $connection;
    }

    /**
     * @param array<string, mixed> $connection
     *
     * @return array<int, string>
     */
    private function dumpCommand(
        array $connection,
    ): array {
        $command = [
            (string) config(
                'backup.mysqldump_binary',
                'mysqldump',
            ),

            '--user='
                . (string) (
                    $connection['username'] ?? ''
                ),

            '--single-transaction',
            '--quick',
            '--skip-lock-tables',
            '--default-character-set=utf8mb4',
            '--add-drop-table',
            '--hex-blob',
        ];

        $this->addConnectionOptions(
            $command,
            $connection,
        );

        $command[] =
            (string) $connection['database'];

        return $command;
    }

    /**
     * @param array<string, mixed> $connection
     *
     * @return array<int, string>
     */
    private function restoreCommand(
        array $connection,
    ): array {
        $command = [
            (string) config(
                'backup.mysql_binary',
                'mysql',
            ),

            '--user='
                . (string) (
                    $connection['username'] ?? ''
                ),

            '--default-character-set=utf8mb4',
        ];

        $this->addConnectionOptions(
            $command,
            $connection,
        );

        $command[] =
            (string) $connection['database'];

        return $command;
    }

    /**
     * @param array<int, string> $command
     * @param array<string, mixed> $connection
     */
    private function addConnectionOptions(
        array &$command,
        array $connection,
    ): void {
        $socket =
            (string) (
                $connection['unix_socket'] ?? ''
            );

        if ($socket !== '') {
            $command[] =
                "--socket={$socket}";

            return;
        }

        $host =
            (string) (
                $connection['host']
                ?? '127.0.0.1'
            );

        $port =
            (string) (
                $connection['port']
                ?? '3306'
            );

        $command[] =
            "--host={$host}";

        $command[] =
            "--port={$port}";
    }

    /**
     * @param array<string, mixed> $connection
     *
     * @return array<string, string>
     */
    private function processEnvironment(
        array $connection,
    ): array {
        $password =
            (string) (
                $connection['password']
                ?? ''
            );

        if ($password === '') {
            return [];
        }

        return [
            'MYSQL_PWD' =>
            $password,
        ];
    }

    private function timeout(): float
    {
        return (float) max(
            60,
            (int) config(
                'backup.timeout_seconds',
                900,
            ),
        );
    }
}
