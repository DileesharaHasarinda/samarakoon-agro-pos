<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashRegisterMovement extends Model
{
    use HasFactory;

    public const TYPE_CASH_IN =
    'cash_in';

    public const TYPE_CASH_OUT =
    'cash_out';

    public const REASON_CASH_FLOAT =
    'cash_float';

    public const REASON_CASH_DROP =
    'cash_drop';

    public const REASON_PETTY_CASH =
    'petty_cash';

    public const REASON_EXPENSE =
    'expense';

    public const REASON_DEPOSIT =
    'deposit';

    public const REASON_WITHDRAWAL =
    'withdrawal';

    public const REASON_OTHER =
    'other';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'cashier_shift_id',
        'movement_type',
        'reason',
        'amount',
        'description',
        'reference_number',
        'occurred_at',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cashier_shift_id' =>
            'integer',

            'amount' =>
            'decimal:2',

            'occurred_at' =>
            'datetime',

            'created_by' =>
            'integer',
        ];
    }

    /**
     * @return BelongsTo<CashierShift, CashRegisterMovement>
     */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(
            CashierShift::class,
            'cashier_shift_id',
        );
    }

    /**
     * @return BelongsTo<User, CashRegisterMovement>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }
}
