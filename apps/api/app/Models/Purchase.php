<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Purchase extends Model
{
    use HasFactory;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_RECEIVED = 'received';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'purchase_number',
        'supplier_id',
        'supplier_invoice_number',
        'purchase_date',
        'status',
        'subtotal',
        'item_discount_total',
        'discount',
        'additional_cost',
        'grand_total',
        'notes',
        'created_by',
        'received_by',
        'received_at',
        'payment_status',
        'settlement_type',
        'paid_amount',
        'due_amount',
        'due_date',
        'payment_terms',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'supplier_id' => 'integer',
            'purchase_date' => 'date',
            'subtotal' => 'decimal:2',
            'item_discount_total' => 'decimal:2',
            'discount' => 'decimal:2',
            'additional_cost' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'created_by' => 'integer',
            'received_by' => 'integer',
            'received_at' => 'datetime',
            'paid_amount' => 'decimal:2',
            'due_amount' => 'decimal:2',
            'due_date' => 'date',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(
            Supplier::class,
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(
            PurchaseItem::class,
        );
    }

    public function payments(): HasMany
    {
        return $this->hasMany(
            PurchasePayment::class,
        );
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'received_by',
        );
    }

    public function isDraft(): bool
    {
        return $this->status
            === self::STATUS_DRAFT;
    }

    public function isReceived(): bool
    {
        return $this->status
            === self::STATUS_RECEIVED;
    }
}
