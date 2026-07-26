<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Backup\CreateDatabaseBackupRequest;
use App\Http\Requests\Backup\RestoreDatabaseBackupRequest;
use App\Models\DatabaseBackup;
use App\Models\User;
use App\Services\DatabaseBackupService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class DatabaseBackupController
extends Controller
{
    public function __construct(
        private readonly DatabaseBackupService $backupService,
    ) {}

    public function index(
        Request $request,
    ): JsonResponse {
        $validated =
            $request->validate([
                'search' => [
                    'nullable',
                    'string',
                    'max:160',
                ],

                'status' => [
                    'nullable',

                    Rule::in([
                        'all',
                        DatabaseBackup::STATUS_PROCESSING,

                        DatabaseBackup::STATUS_COMPLETED,

                        DatabaseBackup::STATUS_FAILED,

                        DatabaseBackup::STATUS_RESTORING,

                        DatabaseBackup::STATUS_RESTORED,
                    ]),
                ],

                'page' => [
                    'nullable',
                    'integer',
                    'min:1',
                ],

                'per_page' => [
                    'nullable',
                    'integer',
                    'min:5',
                    'max:100',
                ],
            ]);

        $search =
            trim(
                (string) (
                    $validated['search']
                    ?? ''
                ),
            );

        $status =
            $validated['status']
            ?? 'all';

        $perPage =
            (int) (
                $validated['per_page']
                ?? 20
            );

        $query =
            DatabaseBackup::query()
            ->with([
                'createdBy:id,name,username',

                'restoredBy:id,name,username',
            ])
            ->when(
                $search !== '',
                function (
                    Builder $backupQuery,
                ) use ($search): void {
                    $backupQuery->where(
                        function (
                            Builder $searchQuery,
                        ) use ($search): void {
                            $searchQuery
                                ->where(
                                    'backup_number',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'filename',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'database_name',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'notes',
                                    'like',
                                    "%{$search}%",
                                );
                        },
                    );
                },
            )
            ->when(
                $status !== 'all',
                fn(
                    Builder $backupQuery,
                ) => $backupQuery->where(
                    'status',
                    $status,
                ),
            )
            ->latest('created_at')
            ->latest('id');

        $summary = [
            'total_backups' =>
            DatabaseBackup::query()
                ->count(),

            'completed_backups' =>
            DatabaseBackup::query()
                ->whereIn(
                    'status',
                    [
                        DatabaseBackup::STATUS_COMPLETED,

                        DatabaseBackup::STATUS_RESTORED,
                    ],
                )
                ->count(),

            'failed_backups' =>
            DatabaseBackup::query()
                ->where(
                    'status',
                    DatabaseBackup::STATUS_FAILED,
                )
                ->count(),

            'total_size' =>
            (int) DatabaseBackup::query()
                ->whereIn(
                    'status',
                    [
                        DatabaseBackup::STATUS_COMPLETED,

                        DatabaseBackup::STATUS_RESTORED,
                    ],
                )
                ->sum(
                    'file_size',
                ),

            'latest_completed_at' =>
            DatabaseBackup::query()
                ->whereIn(
                    'status',
                    [
                        DatabaseBackup::STATUS_COMPLETED,

                        DatabaseBackup::STATUS_RESTORED,
                    ],
                )
                ->latest(
                    'completed_at',
                )
                ->value(
                    'completed_at',
                ),
        ];

        $backups =
            $query->paginate(
                $perPage,
            );

        return response()->json([
            'data' =>
            collect(
                $backups->items(),
            )
                ->map(
                    fn(
                        DatabaseBackup $backup,
                    ): array =>
                    $this->backupData(
                        $backup,
                    ),
                )
                ->values(),

            'summary' =>
            $summary,

            'settings' => [
                'automatic_enabled' =>
                (bool) config(
                    'backup.automatic_enabled',
                    false,
                ),

                'automatic_time' =>
                (string) config(
                    'backup.automatic_time',
                    '02:00',
                ),

                'retention_days' =>
                (int) config(
                    'backup.retention_days',
                    30,
                ),
            ],

            'meta' => [
                'current_page' =>
                $backups
                    ->currentPage(),

                'last_page' =>
                $backups
                    ->lastPage(),

                'per_page' =>
                $backups
                    ->perPage(),

                'total' =>
                $backups->total(),

                'from' =>
                $backups
                    ->firstItem(),

                'to' =>
                $backups
                    ->lastItem(),
            ],
        ]);
    }

    public function store(
        CreateDatabaseBackupRequest $request,
    ): JsonResponse {
        $user =
            $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        try {
            $backup =
                $this->backupService
                ->create(
                    $user,
                    $request
                        ->validated()['notes'] ?? null,
                );

            return response()->json([
                'message' =>
                'Database backup created successfully.',

                'data' =>
                $this->backupData(
                    $backup,
                ),
            ], 201);
        } catch (Throwable $exception) {
            return response()->json([
                'message' =>
                'Unable to create the database backup.',

                'errors' => [
                    'backup' => [
                        $exception
                            ->getMessage(),
                    ],
                ],
            ], 422);
        }
    }

    public function download(
        DatabaseBackup $databaseBackup,
    ): BinaryFileResponse {
        if (
            ! $databaseBackup
                ->isDownloadable()
        ) {
            abort(
                422,
                'This backup is not ready for download.',
            );
        }

        if (
            ! Storage::disk(
                $databaseBackup->disk,
            )->exists(
                $databaseBackup->path,
            )
        ) {
            abort(
                404,
                'The backup file was not found.',
            );
        }

        return Storage::disk(
            $databaseBackup->disk,
        )->download(
            $databaseBackup->path,
            $databaseBackup
                ->filename,
            [
                'Content-Type' =>
                'application/sql',

                'X-Content-Type-Options' =>
                'nosniff',
            ],
        );
    }

    public function restore(
        RestoreDatabaseBackupRequest $request,
        DatabaseBackup $databaseBackup,
    ): JsonResponse {
        $user =
            $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        try {
            $result =
                $this->backupService
                ->restore(
                    $databaseBackup,
                    $user,
                );

            return response()->json([
                'message' =>
                'Database restored successfully. A safety backup was created before restoration.',

                'data' =>
                $result,
            ]);
        } catch (Throwable $exception) {
            return response()->json([
                'message' =>
                'Unable to restore the selected database backup.',

                'errors' => [
                    'restore' => [
                        $exception
                            ->getMessage(),
                    ],
                ],
            ], 422);
        }
    }

    public function destroy(
        DatabaseBackup $databaseBackup,
    ): JsonResponse {
        try {
            $this->backupService
                ->delete(
                    $databaseBackup,
                );

            return response()->json([
                'message' =>
                'Database backup deleted successfully.',
            ]);
        } catch (
            RuntimeException $exception
        ) {
            return response()->json([
                'message' =>
                $exception
                    ->getMessage(),
            ], 422);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function backupData(
        DatabaseBackup $backup,
    ): array {
        return [
            'id' =>
            $backup->id,

            'backup_number' =>
            $backup
                ->backup_number,

            'filename' =>
            $backup->filename,

            'database_name' =>
            $backup
                ->database_name,

            'status' =>
            $backup->status,

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
            $backup->notes,

            'error_message' =>
            $backup
                ->error_message,

            'completed_at' =>
            $backup
                ->completed_at
                ?->toISOString(),

            'restored_at' =>
            $backup
                ->restored_at
                ?->toISOString(),

            'created_at' =>
            $backup
                ->created_at
                ?->toISOString(),

            'created_by' =>
            $backup->createdBy
                ? [
                    'id' =>
                    $backup
                        ->createdBy
                        ->id,

                    'name' =>
                    $backup
                        ->createdBy
                        ->name,

                    'username' =>
                    $backup
                        ->createdBy
                        ->username,
                ]
                : null,

            'restored_by' =>
            $backup->restoredBy
                ? [
                    'id' =>
                    $backup
                        ->restoredBy
                        ->id,

                    'name' =>
                    $backup
                        ->restoredBy
                        ->name,

                    'username' =>
                    $backup
                        ->restoredBy
                        ->username,
                ]
                : null,

            'can_download' =>
            $backup
                ->isDownloadable(),

            'can_restore' =>
            $backup
                ->isDownloadable(),
        ];
    }
}
