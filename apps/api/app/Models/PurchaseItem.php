<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PurchaseItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_id',
        'product_id',
        'product_variant_id',
        'quantity',
        'received_quantity',
        'unit_cost',
        'selling_price',
        'is_dual_unit',
        'secondary_unit',
        'conversion_factor',
        'secondary_selling_price',
        'discount',
        'line_total',
        'batch_number',
        'manufactured_date',
        'expiry_date',
        'notes',
    ];

    /**
     * Attribute casting.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'product_id' =>
        'integer',

        'product_variant_id' =>
        'integer',

        'quantity' =>
        'decimal:3',

        'received_quantity' =>
        'decimal:3',

        'unit_cost' =>
        'decimal:2',

        'selling_price' =>
        'decimal:2',

        'discount' =>
        'decimal:2',

        'line_total' =>
        'decimal:2',

        /*
         * Dual-unit fields.
         */
        'is_dual_unit' =>
        'boolean',

        'conversion_factor' =>
        'decimal:3',

        'secondary_selling_price' =>
        'decimal:2',

        /*
         * Batch dates.
         */
        'manufactured_date' =>
        'date',

        'expiry_date' =>
        'date',
    ];

    /**
     * Purchase that owns this item.
     */
    public function purchase(): BelongsTo
    {
        return $this->belongsTo(
            Purchase::class,
            'purchase_id',
        );
    }

    /**
     * Parent product being purchased.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(
            Product::class,
            'product_id',
        );
    }

    /**
     * Exact product variant being purchased.
     *
     * Normal products keep product_variant_id = null.
     *
     * Variant example:
     * Pumpkin Seeds -> 100g Packet.
     */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(
            ProductVariant::class,
            'product_variant_id',
        );
    }

    /**
     * First stock batch created from this
     * purchase item.
     *
     * This relation is kept for compatibility
     * with code that expects:
     *
     * $purchaseItem->stockBatch
     */
    public function stockBatch(): HasOne
    {
        return $this->hasOne(
            StockBatch::class,
            'purchase_item_id',
        );
    }

    public function stockBatches(): HasMany
    {
        return $this->hasMany(
            StockBatch::class,
            'purchase_item_id',
        );
    }

    public function usesDualUnit(): bool
    {
        return $this->is_dual_unit === true
            && $this->conversionFactorValue() > 0
            && filled($this->secondary_unit);
    }

    public function conversionFactorValue(): float
    {
        $conversionFactor =
            (float) (
                $this->conversion_factor
                ?? 1
            );

        return $conversionFactor > 0
            ? $conversionFactor
            : 1.0;
    }

    public function stockQuantityFor(
        float $purchaseQuantity,
    ): float {
        if (!$this->usesDualUnit()) {
            return round(
                $purchaseQuantity,
                3,
            );
        }

        return round(
            $purchaseQuantity
                * $this->conversionFactorValue(),
            3,
        );
    }

    public function baseUnitCost(): float
    {
        $unitCost =
            (float) (
                $this->unit_cost
                ?? 0
            );

        if (!$this->usesDualUnit()) {
            return round(
                $unitCost,
                4,
            );
        }

        return round(
            $unitCost
                / $this->conversionFactorValue(),
            4,
        );
    }

    public function totalStockQuantity(): float
    {
        return $this->stockQuantityFor(
            (float) $this->quantity,
        );
    }

    public function receivedStockQuantity(): float
    {
        return $this->stockQuantityFor(
            (float) (
                $this->received_quantity
                ?? 0
            ),
        );
    }

    public function secondarySellingPriceValue(): ?float
    {
        if (
            !$this->usesDualUnit()
            || $this->secondary_selling_price === null
        ) {
            return null;
        }

        return round(
            (float) $this
                ->secondary_selling_price,
            2,
        );
    }
}
