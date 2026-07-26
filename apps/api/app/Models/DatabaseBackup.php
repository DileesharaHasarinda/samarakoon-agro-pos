<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DatabaseBackup extends Model
{
    use HasFactory;

    public const STATUS_PROCESSING =
    'processing';

    public const STATUS_COMPLETED =
    'completed';

    public const STATUS_FAILED =
    'failed';

    public const STATUS_RESTORING =
    'restoring';

    public const STATUS_RESTORED =
    'restored';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'backup_number',
        'filename',
        'disk',
        'path',
        'database_name',
        'status',
        'file_size',
        'checksum',
        'is_scheduled',
        'notes',
        'error_message',
        'created_by',
        'restored_by',
        'completed_at',
        'restored_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'file_size' =>
            'integer',

            'is_scheduled' =>
            'boolean',

            'created_by' =>
            'integer',

            'restored_by' =>
            'integer',

            'completed_at' =>
            'datetime',

            'restored_at' =>
            'datetime',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }

    public function restoredBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'restored_by',
        );
    }

    public function isDownloadable(): bool
    {
        return in_array(
            $this->status,
            [
                self::STATUS_COMPLETED,
                self::STATUS_RESTORED,
            ],
            true,
        );
    }
}
