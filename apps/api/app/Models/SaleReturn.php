<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaleReturn extends Model
{
    use HasFactory;

    public const STATUS_COMPLETED =
    'completed';

    protected $table =
    'sale_returns';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'return_number',
        'sale_id',
        'return_date',
        'refund_method',
        'refund_amount',
        'cost_value',
        'profit_reversal',
        'restocked_quantity',
        'reason',
        'notes',
        'status',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sale_id' => 'integer',
            'return_date' => 'datetime',
            'refund_amount' => 'decimal:2',
            'cost_value' => 'decimal:2',
            'profit_reversal' => 'decimal:2',
            'restocked_quantity' => 'decimal:3',
            'created_by' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Sale, SaleReturn>
     */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(
            Sale::class,
        );
    }

    /**
     * @return HasMany<SaleReturnItem>
     */
    public function items(): HasMany
    {
        return $this->hasMany(
            SaleReturnItem::class,
            'sale_return_id',
        );
    }

    /**
     * @return BelongsTo<User, SaleReturn>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }
}
