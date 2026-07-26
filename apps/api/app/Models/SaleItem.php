<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaleItem extends Model
{
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'sale_id',
        'product_id',
        'stock_batch_id',
        'quantity',
        'returned_quantity',
        'purchase_cost',
        'selling_price',
        'discount',
        'line_total',
        'returned_amount',
        'gross_profit',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sale_id' => 'integer',
            'product_id' => 'integer',
            'stock_batch_id' => 'integer',
            'quantity' => 'decimal:3',
            'returned_quantity' => 'decimal:3',
            'purchase_cost' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'discount' => 'decimal:2',
            'line_total' => 'decimal:2',
            'returned_amount' => 'decimal:2',
            'gross_profit' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Sale, SaleItem>
     */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(
            Sale::class,
        );
    }

    /**
     * @return BelongsTo<Product, SaleItem>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(
            Product::class,
        );
    }

    /**
     * @return BelongsTo<StockBatch, SaleItem>
     */
    public function stockBatch(): BelongsTo
    {
        return $this->belongsTo(
            StockBatch::class,
        );
    }

    /**
     * @return HasMany<SaleReturnItem>
     */
    public function returnItems(): HasMany
    {
        return $this->hasMany(
            SaleReturnItem::class,
        );
    }
}
