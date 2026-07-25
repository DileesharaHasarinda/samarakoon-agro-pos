<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use HasFactory;

    public const PAYMENT_STATUS_PAID =
    'paid';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'sale_number',
        'sale_date',
        'subtotal',
        'item_discount_total',
        'discount',
        'grand_total',
        'paid_amount',
        'change_amount',
        'gross_profit',
        'net_profit',
        'payment_status',
        'notes',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sale_date' => 'datetime',
            'subtotal' => 'decimal:2',
            'item_discount_total' => 'decimal:2',
            'discount' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'change_amount' => 'decimal:2',
            'gross_profit' => 'decimal:2',
            'net_profit' => 'decimal:2',
            'created_by' => 'integer',
        ];
    }

    /**
     * @return HasMany<SaleItem>
     */
    public function items(): HasMany
    {
        return $this->hasMany(
            SaleItem::class,
        );
    }

    /**
     * @return HasMany<SalePayment>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(
            SalePayment::class,
        );
    }

    /**
     * @return BelongsTo<User, Sale>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }
}
