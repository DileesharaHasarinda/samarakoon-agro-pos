<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleReturnItem extends Model
{
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'sale_return_id',
        'sale_item_id',
        'product_id',
        'stock_batch_id',
        'quantity',
        'purchase_cost',
        'selling_price',
        'item_discount_reversal',
        'sale_discount_reversal',
        'refund_amount',
        'cost_value',
        'profit_reversal',
        'restocked',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sale_return_id' => 'integer',
            'sale_item_id' => 'integer',
            'product_id' => 'integer',
            'stock_batch_id' => 'integer',
            'quantity' => 'decimal:3',
            'purchase_cost' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'item_discount_reversal' => 'decimal:2',
            'sale_discount_reversal' => 'decimal:2',
            'refund_amount' => 'decimal:2',
            'cost_value' => 'decimal:2',
            'profit_reversal' => 'decimal:2',
            'restocked' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<SaleReturn, SaleReturnItem>
     */
    public function salesReturn(): BelongsTo
    {
        return $this->belongsTo(
            SaleReturn::class,
            'sale_return_id',
        );
    }

    /**
     * @return BelongsTo<SaleItem, SaleReturnItem>
     */
    public function saleItem(): BelongsTo
    {
        return $this->belongsTo(
            SaleItem::class,
        );
    }

    /**
     * @return BelongsTo<Product, SaleReturnItem>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(
            Product::class,
        );
    }

    /**
     * @return BelongsTo<StockBatch, SaleReturnItem>
     */
    public function stockBatch(): BelongsTo
    {
        return $this->belongsTo(
            StockBatch::class,
        );
    }
}
