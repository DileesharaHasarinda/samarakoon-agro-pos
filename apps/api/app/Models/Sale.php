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

    public const PAYMENT_STATUS_PARTIAL =
    'partial';

    public const PAYMENT_STATUS_DUE =
    'due';

    public const SETTLEMENT_FULL =
    'full';

    public const SETTLEMENT_PARTIAL =
    'partial';

    public const SETTLEMENT_DUE =
    'due';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'customer_id',
        'sale_number',
        'sale_date',
        'subtotal',
        'item_discount_total',
        'discount',
        'grand_total',
        'paid_amount',
        'due_amount',
        'due_date',
        'change_amount',
        'gross_profit',
        'net_profit',
        'payment_status',
        'settlement_type',
        'notes',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'customer_id' => 'integer',
            'sale_date' => 'datetime',
            'subtotal' => 'decimal:2',
            'item_discount_total' => 'decimal:2',
            'discount' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'due_amount' => 'decimal:2',
            'due_date' => 'date',
            'change_amount' => 'decimal:2',
            'gross_profit' => 'decimal:2',
            'net_profit' => 'decimal:2',
            'created_by' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Customer, Sale>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(
            Customer::class,
        );
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
     * @return HasMany<SaleReturn>
     */
    public function returns(): HasMany
    {
        return $this->hasMany(
            SaleReturn::class,
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
