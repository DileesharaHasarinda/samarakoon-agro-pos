<?php

namespace App\Services;

use App\Models\DatabaseBackup;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;

class DatabaseBackupService
{
    /*
     * Maximum uploaded SQL backup size.
     *
     * 500 MB.
     */
    private const MAX_UPLOAD_BYTES =
    500 * 1024 * 1024;

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

        Storage::disk(
            $disk,
        )->makeDirectory(
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

            $errorOutput =
                '';

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
                fclose(
                    $handle,
                );
            }

            if (
                ! $process->isSuccessful()
            ) {
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

            if (
                ! is_string(
                    $checksum,
                )
            ) {
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

            /*
             * Upload completed local backup
             * to Cloudflare R2.
             *
             * R2 remains best-effort.
             *
             * A temporary cloud problem must not
             * make a valid local backup fail.
             */
            $this->uploadToCloud(
                $disk,
                $path,
            );

            return $backup->fresh([
                'createdBy:id,name,username',
            ]);
        } catch (Throwable $exception) {
            if (
                Storage::disk(
                    $disk,
                )->exists(
                    $path,
                )
            ) {
                Storage::disk(
                    $disk,
                )->delete(
                    $path,
                );
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

    /*
     * =====================================================
     * UPLOAD EXTERNAL SQL BACKUP
     * =====================================================
     */

    /**
     * Save an uploaded SQL backup as a managed
     * database backup.
     *
     * The uploaded file:
     *
     * 1. Must be .sql
     * 2. Must not be empty
     * 3. Must be <= 500 MB
     * 4. Is copied into private backup storage
     * 5. Receives a SHA-256 checksum
     * 6. Is also copied to R2 when enabled
     */
    public function importUploadedBackup(
        UploadedFile $uploadedFile,
        User $user,
    ): DatabaseBackup {
        if (
            ! $uploadedFile->isValid()
        ) {
            throw new RuntimeException(
                'The uploaded database backup file is invalid.',
            );
        }

        $originalExtension =
            strtolower(
                $uploadedFile
                    ->getClientOriginalExtension(),
            );

        if (
            $originalExtension
            !== 'sql'
        ) {
            throw new RuntimeException(
                'Only .sql database backup files can be uploaded.',
            );
        }

        $uploadedSize =
            $uploadedFile->getSize();

        if (
            ! is_int(
                $uploadedSize,
            )
            || $uploadedSize <= 0
        ) {
            throw new RuntimeException(
                'The uploaded database backup file is empty.',
            );
        }

        if (
            $uploadedSize
            > self::MAX_UPLOAD_BYTES
        ) {
            throw new RuntimeException(
                'The uploaded database backup exceeds the 500 MB maximum size.',
            );
        }

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

        Storage::disk(
            $disk,
        )->makeDirectory(
            $directory,
        );

        $databaseName =
            (string) $connection['database'];

        /*
         * Keep the original filename only for
         * notes/display.
         *
         * Never use an uploaded client filename
         * directly as our physical storage path.
         */
        $originalFilename =
            basename(
                $uploadedFile
                    ->getClientOriginalName(),
            );

        $timestamp =
            now()->format(
                'Ymd_His',
            );

        $random =
            Str::lower(
                Str::random(8),
            );

        $filename =
            "uploaded_{$timestamp}_{$random}.sql";

        $path =
            "{$directory}/{$filename}";

        $backup =
            DatabaseBackup::query()
            ->create([
                'backup_number' =>
                sprintf(
                    'BKP-UP-%s-%s',
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
                false,

                'notes' =>
                Str::limit(
                    "Uploaded database backup: {$originalFilename}",
                    1000,
                ),

                'error_message' =>
                null,

                'created_by' =>
                $user->id,

                'completed_at' =>
                null,
            ]);

        try {
            $storedPath =
                $uploadedFile->storeAs(
                    $directory,
                    $filename,
                    $disk,
                );

            if (
                ! is_string(
                    $storedPath,
                )
                || $storedPath === ''
            ) {
                throw new RuntimeException(
                    'Unable to save the uploaded database backup.',
                );
            }

            if (
                ! Storage::disk(
                    $disk,
                )->exists(
                    $path,
                )
            ) {
                throw new RuntimeException(
                    'The uploaded backup file could not be found after saving.',
                );
            }

            $absolutePath =
                Storage::disk(
                    $disk,
                )->path(
                    $path,
                );

            /*
             * Perform a basic SQL sanity check
             * before adding the backup as usable.
             */
            $this->validateSqlBackupFile(
                $absolutePath,
            );

            $fileSize =
                Storage::disk(
                    $disk,
                )->size(
                    $path,
                );

            if ($fileSize <= 0) {
                throw new RuntimeException(
                    'The uploaded database backup file is empty.',
                );
            }

            $checksum =
                hash_file(
                    'sha256',
                    $absolutePath,
                );

            if (
                ! is_string(
                    $checksum,
                )
            ) {
                throw new RuntimeException(
                    'Unable to calculate the uploaded backup checksum.',
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

            /*
             * Also preserve the uploaded recovery
             * backup off-site in R2.
             */
            $this->uploadToCloud(
                $disk,
                $path,
            );

            return $backup->fresh([
                'createdBy:id,name,username',
            ]);
        } catch (Throwable $exception) {
            if (
                Storage::disk(
                    $disk,
                )->exists(
                    $path,
                )
            ) {
                Storage::disk(
                    $disk,
                )->delete(
                    $path,
                );
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

    /*
     * =====================================================
     * UPLOAD + RESTORE
     * =====================================================
     */

    /**
     * Upload an SQL file and restore it.
     *
     * restore() itself creates the automatic
     * current-database safety backup before
     * importing the selected SQL.
     *
     * @return array{
     *     uploaded_backup_number: string,
     *     uploaded_filename: string,
     *     restored_backup_number: string,
     *     safety_backup_number: string
     * }
     */
    public function uploadAndRestore(
        UploadedFile $uploadedFile,
        User $user,
    ): array {
        $uploadedBackup =
            $this->importUploadedBackup(
                $uploadedFile,
                $user,
            );

        $result =
            $this->restore(
                $uploadedBackup,
                $user,
            );

        return [
            'uploaded_backup_number' =>
            $uploadedBackup
                ->backup_number,

            'uploaded_filename' =>
            $uploadedBackup
                ->filename,

            'restored_backup_number' =>
            $result['restored_backup_number'],

            'safety_backup_number' =>
            $result['safety_backup_number'],
        ];
    }

    /*
     * =====================================================
     * RESTORE
     * =====================================================
     */

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
        if (
            ! $backup->isDownloadable()
        ) {
            throw new RuntimeException(
                'Only completed backups can be restored.',
            );
        }

        $disk =
            $backup->disk;

        $path =
            $backup->path;

        if (
            ! Storage::disk(
                $disk,
            )->exists(
                $path,
            )
        ) {
            throw new RuntimeException(
                'The selected backup file does not exist.',
            );
        }

        $absolutePath =
            Storage::disk(
                $disk,
            )->path(
                $path,
            );

        /*
         * Validate the file again immediately
         * before running mysql.
         */
        $this->validateSqlBackupFile(
            $absolutePath,
        );

        if (
            $backup->checksum
        ) {
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
         * Save selected backup metadata before
         * restoring.
         *
         * The selected SQL may replace the
         * database_backups table with an older
         * version that does not contain this
         * record.
         */
        $restoredBackupNumber =
            $backup
            ->backup_number;

        $selectedBackupData =
            $this->backupHistoryPayload(
                $backup,
            );

        /*
         * CRITICAL SAFETY STEP.
         *
         * Create a new backup of the CURRENT
         * active database before replacing it.
         *
         * create() also performs the configured
         * Cloudflare R2 upload.
         */
        $safetyBackup =
            $this->create(
                $user,
                "Automatic safety backup before restoring {$restoredBackupNumber}.",
                false,
            );

        $safetyBackupData =
            $this->backupHistoryPayload(
                $safetyBackup,
            );

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

        if (
            $stream === false
        ) {
            $this->markRestoreFailure(
                $restoredBackupNumber,
                'Unable to open the selected backup file.',
            );

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
            fclose(
                $stream,
            );
        }

        if (
            ! $process->isSuccessful()
        ) {
            $errorOutput =
                trim(
                    $process
                        ->getErrorOutput(),
                );

            $errorMessage =
                $errorOutput !== ''
                ? $errorOutput
                : 'The database restoration command failed.';

            $this->markRestoreFailure(
                $restoredBackupNumber,
                $errorMessage,
            );

            throw new RuntimeException(
                $errorMessage,
            );
        }

        /*
         * The database has now been successfully
         * imported.
         *
         * The imported SQL may contain an older
         * backup-history table. Reinsert both:
         *
         * 1. Current safety backup
         * 2. Backup that was just restored
         */
        try {
            if (
                Schema::hasTable(
                    'database_backups',
                )
            ) {
                $restoredUserId =
                    null;

                if (
                    Schema::hasTable(
                        'users',
                    )
                    && User::query()
                    ->whereKey(
                        $user->id,
                    )
                    ->exists()
                ) {
                    $restoredUserId =
                        $user->id;
                }

                /*
                 * Reinsert the safety backup.
                 */
                $safetyBackupData['status'] =
                    DatabaseBackup::STATUS_COMPLETED;

                $safetyBackupData['error_message'] =
                    null;

                $safetyBackupData['created_by'] =
                    $restoredUserId;

                $safetyBackupData['restored_by'] =
                    null;

                $safetyBackupData['restored_at'] =
                    null;

                $safetyBackupData['updated_at'] =
                    now();

                DatabaseBackup::query()
                    ->updateOrCreate(
                        [
                            'backup_number' =>
                            $safetyBackupData['backup_number'],
                        ],
                        $safetyBackupData,
                    );

                /*
                 * Reinsert/update the backup that
                 * has just been restored.
                 *
                 * This is especially important for
                 * uploaded backups because that
                 * backup record did not exist in
                 * the older restored database.
                 */
                $selectedBackupData['status'] =
                    DatabaseBackup::STATUS_RESTORED;

                $selectedBackupData['error_message'] =
                    null;

                $selectedBackupData['created_by'] =
                    $restoredUserId;

                $selectedBackupData['restored_by'] =
                    $restoredUserId;

                $selectedBackupData['restored_at'] =
                    now();

                $selectedBackupData['updated_at'] =
                    now();

                DatabaseBackup::query()
                    ->updateOrCreate(
                        [
                            'backup_number' =>
                            $selectedBackupData['backup_number'],
                        ],
                        $selectedBackupData,
                    );
            }
        } catch (
            Throwable $metadataException
        ) {
            /*
             * The actual MySQL restore already
             * succeeded.
             *
             * Do not report the entire restore as
             * failed merely because backup-history
             * metadata could not be recreated.
             */
            Log::warning(
                'Database restored successfully, but backup history metadata could not be updated.',
                [
                    'restored_backup_number' =>
                    $restoredBackupNumber,

                    'safety_backup_number' =>
                    $safetyBackup
                        ->backup_number,

                    'message' =>
                    $metadataException
                        ->getMessage(),
                ],
            );
        }

        return [
            'restored_backup_number' =>
            $restoredBackupNumber,

            'safety_backup_number' =>
            $safetyBackup
                ->backup_number,
        ];
    }

    /*
     * =====================================================
     * DELETE
     * =====================================================
     */

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

        /*
         * Delete matching R2 object too.
         */
        $this->deleteFromCloud(
            $backup->path,
        );

        $backup->delete();
    }

    /*
     * =====================================================
     * PRUNE
     * =====================================================
     */

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

        $deletedCount =
            0;

        foreach (
            $backups as $backup
        ) {
            try {
                $this->delete(
                    $backup,
                );

                $deletedCount++;
            } catch (
                Throwable $exception
            ) {
                /*
                 * Continue pruning other backups.
                 */
                Log::warning(
                    'Unable to prune database backup.',
                    [
                        'backup_number' =>
                        $backup
                            ->backup_number,

                        'message' =>
                        $exception
                            ->getMessage(),
                    ],
                );
            }
        }

        return $deletedCount;
    }

    /*
     * =====================================================
     * BACKUP HISTORY PAYLOAD
     * =====================================================
     */

    /**
     * Store enough backup metadata in memory so
     * that the record can be recreated after a
     * full database restore.
     *
     * @return array<string, mixed>
     */
    private function backupHistoryPayload(
        DatabaseBackup $backup,
    ): array {
        return [
            'backup_number' =>
            $backup
                ->backup_number,

            'filename' =>
            $backup
                ->filename,

            'disk' =>
            $backup
                ->disk,

            'path' =>
            $backup
                ->path,

            'database_name' =>
            $backup
                ->database_name,

            'status' =>
            $backup
                ->status,

            'file_size' =>
            $backup
                ->file_size,

            'checksum' =>
            $backup
                ->checksum,

            'is_scheduled' =>
            (bool) $backup
                ->is_scheduled,

            'notes' =>
            $backup
                ->notes,

            'error_message' =>
            $backup
                ->error_message,

            'created_by' =>
            null,

            'restored_by' =>
            null,

            'completed_at' =>
            $backup
                ->completed_at,

            'restored_at' =>
            $backup
                ->restored_at,

            'created_at' =>
            $backup
                ->created_at
                ?? now(),

            'updated_at' =>
            now(),
        ];
    }

    /*
     * =====================================================
     * RESTORE FAILURE METADATA
     * =====================================================
     */

    private function markRestoreFailure(
        string $backupNumber,
        string $errorMessage,
    ): void {
        try {
            if (
                ! Schema::hasTable(
                    'database_backups',
                )
            ) {
                return;
            }

            DatabaseBackup::query()
                ->where(
                    'backup_number',
                    $backupNumber,
                )
                ->update([
                    'status' =>
                    DatabaseBackup::STATUS_COMPLETED,

                    'error_message' =>
                    Str::limit(
                        $errorMessage,
                        2000,
                    ),

                    'updated_at' =>
                    now(),
                ]);
        } catch (
            Throwable $exception
        ) {
            Log::warning(
                'Unable to update database backup status after restore failure.',
                [
                    'backup_number' =>
                    $backupNumber,

                    'message' =>
                    $exception
                        ->getMessage(),
                ],
            );
        }
    }

    /*
     * =====================================================
     * SQL FILE VALIDATION
     * =====================================================
     */

    private function validateSqlBackupFile(
        string $absolutePath,
    ): void {
        if (
            ! is_file(
                $absolutePath,
            )
            || ! is_readable(
                $absolutePath,
            )
        ) {
            throw new RuntimeException(
                'The database backup file cannot be read.',
            );
        }

        $fileSize =
            filesize(
                $absolutePath,
            );

        if (
            $fileSize === false
            || $fileSize <= 0
        ) {
            throw new RuntimeException(
                'The database backup file is empty.',
            );
        }

        if (
            $fileSize
            > self::MAX_UPLOAD_BYTES
        ) {
            throw new RuntimeException(
                'The database backup file exceeds the 500 MB maximum size.',
            );
        }

        $handle =
            fopen(
                $absolutePath,
                'rb',
            );

        if (
            $handle === false
        ) {
            throw new RuntimeException(
                'Unable to inspect the database backup file.',
            );
        }

        try {
            /*
             * Inspect the first 256 KB.
             */
            $sample =
                fread(
                    $handle,
                    262144,
                );
        } finally {
            fclose(
                $handle,
            );
        }

        if (
            ! is_string(
                $sample,
            )
            || trim(
                $sample,
            ) === ''
        ) {
            throw new RuntimeException(
                'The database backup file does not contain SQL data.',
            );
        }

        /*
         * Normal mysqldump output should not
         * contain raw NUL bytes.
         */
        if (
            str_contains(
                $sample,
                "\0",
            )
        ) {
            throw new RuntimeException(
                'The selected file does not appear to be a valid SQL database backup.',
            );
        }

        $upperSample =
            strtoupper(
                $sample,
            );

        /*
         * Typical MySQL / MariaDB dump markers.
         */
        $sqlMarkers = [
            'CREATE TABLE',
            'DROP TABLE',
            'INSERT INTO',
            'LOCK TABLES',
            'UNLOCK TABLES',
            'SET ',
            '-- MYSQL',
            '-- MARIADB',
        ];

        foreach (
            $sqlMarkers as $marker
        ) {
            if (
                str_contains(
                    $upperSample,
                    $marker,
                )
            ) {
                return;
            }
        }

        throw new RuntimeException(
            'The selected file does not appear to be a MySQL or MariaDB SQL backup.',
        );
    }

    /*
     * =====================================================
     * DATABASE CONNECTION
     * =====================================================
     */

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

        if (
            ! is_array(
                $connection,
            )
        ) {
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

    /*
     * =====================================================
     * MYSQLDUMP COMMAND
     * =====================================================
     */

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
                    $connection['username']
                    ?? ''
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

    /*
     * =====================================================
     * MYSQL RESTORE COMMAND
     * =====================================================
     */

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
                    $connection['username']
                    ?? ''
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

    /*
     * =====================================================
     * DATABASE HOST / SOCKET
     * =====================================================
     */

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
                $connection['unix_socket']
                ?? ''
            );

        if (
            $socket !== ''
        ) {
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

    /*
     * =====================================================
     * MYSQL PASSWORD ENVIRONMENT
     * =====================================================
     */

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

        if (
            $password === ''
        ) {
            return [];
        }

        return [
            'MYSQL_PWD' =>
            $password,
        ];
    }

    /*
     * =====================================================
     * PROCESS TIMEOUT
     * =====================================================
     */

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

    /*
     * =====================================================
     * CLOUD BACKUP SETTINGS
     * =====================================================
     */

    private function cloudUploadEnabled(): bool
    {
        return filter_var(
            config(
                'backup.cloud_upload_enabled',
                false,
            ),
            FILTER_VALIDATE_BOOL,
        );
    }

    private function cloudDisk(): string
    {
        return (string) config(
            'backup.cloud_disk',
            'r2',
        );
    }

    /*
     * =====================================================
     * R2 UPLOAD
     * =====================================================
     */

    /**
     * Upload a local backup to the configured
     * off-site cloud disk.
     *
     * Cloud upload remains best-effort.
     */
    private function uploadToCloud(
        string $sourceDisk,
        string $path,
    ): void {
        if (
            ! $this->cloudUploadEnabled()
        ) {
            return;
        }

        $cloudDisk =
            $this->cloudDisk();

        if (
            $cloudDisk
            === $sourceDisk
        ) {
            return;
        }

        try {
            $stream =
                Storage::disk(
                    $sourceDisk,
                )->readStream(
                    $path,
                );

            if (
                ! is_resource(
                    $stream,
                )
            ) {
                throw new RuntimeException(
                    'Unable to read the local backup file for cloud upload.',
                );
            }

            try {
                /*
                 * filesystems.php currently uses
                 * throw=false for R2.
                 *
                 * Therefore put() returning false
                 * must be checked manually.
                 */
                $uploaded =
                    Storage::disk(
                        $cloudDisk,
                    )->put(
                        $path,
                        $stream,
                    );

                if (
                    ! $uploaded
                ) {
                    throw new RuntimeException(
                        'Cloud storage rejected the database backup upload.',
                    );
                }
            } finally {
                if (
                    is_resource(
                        $stream,
                    )
                ) {
                    fclose(
                        $stream,
                    );
                }
            }
        } catch (
            Throwable $exception
        ) {
            Log::warning(
                'Database backup cloud upload failed.',
                [
                    'path' =>
                    $path,

                    'cloud_disk' =>
                    $cloudDisk,

                    'message' =>
                    $exception
                        ->getMessage(),
                ],
            );
        }
    }

    /*
     * =====================================================
     * R2 DELETE
     * =====================================================
     */

    private function deleteFromCloud(
        string $path,
    ): void {
        if (
            ! $this->cloudUploadEnabled()
        ) {
            return;
        }

        $cloudDisk =
            $this->cloudDisk();

        try {
            if (
                Storage::disk(
                    $cloudDisk,
                )->exists(
                    $path,
                )
            ) {
                Storage::disk(
                    $cloudDisk,
                )->delete(
                    $path,
                );
            }
        } catch (
            Throwable $exception
        ) {
            Log::warning(
                'Database backup cloud deletion failed.',
                [
                    'path' =>
                    $path,

                    'cloud_disk' =>
                    $cloudDisk,

                    'message' =>
                    $exception
                        ->getMessage(),
                ],
            );
        }
    }
}
