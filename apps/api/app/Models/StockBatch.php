<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockBatch extends Model
{
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'batch_code',
        'product_id',
        'purchase_item_id',
        'batch_number',
        'purchase_cost',
        'selling_price',
        'received_quantity',
        'available_quantity',
        'manufactured_date',
        'expiry_date',
        'received_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'product_id' => 'integer',
            'purchase_item_id' => 'integer',
            'purchase_cost' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'received_quantity' => 'decimal:3',
            'available_quantity' => 'decimal:3',
            'manufactured_date' => 'date',
            'expiry_date' => 'date',
            'received_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Product, StockBatch>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(
            Product::class,
        );
    }

    /**
     * @return BelongsTo<PurchaseItem, StockBatch>
     */
    public function purchaseItem(): BelongsTo
    {
        return $this->belongsTo(
            PurchaseItem::class,
        );
    }

    /**
     * @return HasMany<StockMovement>
     */
    public function movements(): HasMany
    {
        return $this->hasMany(
            StockMovement::class,
        );
    }

    /**
     * @return HasMany<SaleItem>
     */
    public function saleItems(): HasMany
    {
        return $this->hasMany(
            SaleItem::class,
        );
    }
}
