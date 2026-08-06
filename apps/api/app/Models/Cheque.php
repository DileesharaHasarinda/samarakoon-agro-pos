<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Cheque extends Model
{
    use HasFactory;

    public const TYPE_RECEIVED = 'received';
    public const TYPE_ISSUED = 'issued';

    public const STATUS_PENDING = 'pending';
    public const STATUS_CLEARED = 'cleared';
    public const STATUS_BOUNCED = 'bounced';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'cheque_number',
        'type',
        'party_name',
        'bank_name',
        'amount',
        'cheque_date',
        'due_date',
        'status',
        'notes',
        'created_by',
        'cleared_at',
        'bounced_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'cheque_date' => 'date',
        'due_date' => 'date',
        'cleared_at' => 'datetime',
        'bounced_at' => 'datetime',
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeDueSoon(Builder $query, int $days = 3): Builder
    {
        return $query->pending()
            ->whereDate('due_date', '<=', now()->addDays($days)->toDateString())
            ->whereDate('due_date', '>=', now()->toDateString());
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query->pending()
            ->whereDate('due_date', '<', now()->toDateString());
    }

    public function scopeBounced(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_BOUNCED);
    }
}