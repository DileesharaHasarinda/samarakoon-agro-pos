<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashierShift extends Model
{
    use HasFactory;

    public const STATUS_OPEN =
    'open';

    public const STATUS_CLOSED =
    'closed';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'shift_number',
        'cashier_id',
        'opening_cash',
        'status',
        'opened_at',
        'closed_at',
        'expected_cash',
        'actual_cash',
        'cash_difference',
        'opening_notes',
        'closing_notes',
        'opened_by',
        'closed_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cashier_id' =>
            'integer',

            'opening_cash' =>
            'decimal:2',

            'opened_at' =>
            'datetime',

            'closed_at' =>
            'datetime',

            'expected_cash' =>
            'decimal:2',

            'actual_cash' =>
            'decimal:2',

            'cash_difference' =>
            'decimal:2',

            'opened_by' =>
            'integer',

            'closed_by' =>
            'integer',
        ];
    }

    /**
     * @param Builder<CashierShift> $query
     *
     * @return Builder<CashierShift>
     */
    public function scopeOpen(
        Builder $query,
    ): Builder {
        return $query->where(
            'status',
            self::STATUS_OPEN,
        );
    }

    /**
     * @return BelongsTo<User, CashierShift>
     */
    public function cashier(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'cashier_id',
        );
    }

    /**
     * @return BelongsTo<User, CashierShift>
     */
    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'opened_by',
        );
    }

    /**
     * @return BelongsTo<User, CashierShift>
     */
    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'closed_by',
        );
    }

    /**
     * @return HasMany<CashRegisterMovement>
     */
    public function movements(): HasMany
    {
        return $this->hasMany(
            CashRegisterMovement::class,
        );
    }
}
