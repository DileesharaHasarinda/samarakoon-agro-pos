<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'product_id',
        'stock_batch_id',
        'quantity',
        'returned_quantity',
        'sale_unit',
        'conversion_factor',
        'stock_quantity',
        'purchase_cost',
        'selling_price',
        'discount',
        'line_total',
        'returned_amount',
        'gross_profit',
    ];

    /**
     * Attribute casting.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sale_id' =>
            'integer',

            'product_id' =>
            'integer',

            'stock_batch_id' =>
            'integer',

            /*
             * Customer-facing quantities.
             */
            'quantity' =>
            'decimal:3',

            'returned_quantity' =>
            'decimal:3',

            /*
             * Dual-unit stock conversion.
             */
            'conversion_factor' =>
            'decimal:3',

            'stock_quantity' =>
            'decimal:3',

            /*
             * Monetary fields.
             */
            'purchase_cost' =>
            'decimal:2',

            'selling_price' =>
            'decimal:2',

            'discount' =>
            'decimal:2',

            'line_total' =>
            'decimal:2',

            'returned_amount' =>
            'decimal:2',

            'gross_profit' =>
            'decimal:2',
        ];
    }

    /**
     * Sale that owns this item.
     *
     * @return BelongsTo<Sale, SaleItem>
     */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(
            Sale::class,
        );
    }

    /**
     * Product that was sold.
     *
     * @return BelongsTo<Product, SaleItem>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(
            Product::class,
        );
    }

    /**
     * Exact stock batch used for this sale.
     *
     * This is important because returns must
     * restore stock to the original batch.
     *
     * @return BelongsTo<StockBatch, SaleItem>
     */
    public function stockBatch(): BelongsTo
    {
        return $this->belongsTo(
            StockBatch::class,
        );
    }

    /**
     * Return records related to this sale item.
     *
     * @return HasMany<SaleReturnItem>
     */
    public function returnItems(): HasMany
    {
        return $this->hasMany(
            SaleReturnItem::class,
        );
    }

    /**
     * Return the sold quantity safely.
     */
    public function quantityValue(): float
    {
        return round(
            (float) (
                $this->quantity
                ?? 0
            ),
            3,
        );
    }

    /**
     * Return already returned customer-facing
     * quantity safely.
     */
    public function returnedQuantityValue(): float
    {
        return round(
            (float) (
                $this->returned_quantity
                ?? 0
            ),
            3,
        );
    }

    /**
     * Return the conversion factor safely.
     *
     * Examples:
     *
     * Bag sale:
     * 50
     *
     * Kg sale:
     * 1
     */
    public function conversionFactorValue(): float
    {
        $conversionFactor =
            (float) (
                $this->conversion_factor
                ?? 1
            );

        if ($conversionFactor <= 0) {
            return 1.0;
        }

        return $conversionFactor;
    }

    /**
     * Return the sale unit.
     *
     * For historical sale records where
     * sale_unit is empty, fall back to the
     * Product unit.
     */
    public function saleUnitValue(): string
    {
        $saleUnit = trim(
            (string) (
                $this->sale_unit
                ?? ''
            ),
        );

        if ($saleUnit !== '') {
            return $saleUnit;
        }

        $productUnit = trim(
            (string) (
                $this->product
                ?->unit
                ?? ''
            ),
        );

        return $productUnit !== ''
            ? $productUnit
            : 'Unit';
    }

    /**
     * Return the physical stock quantity that
     * was deducted from StockBatch.
     *
     * New sale records should always contain
     * stock_quantity.
     *
     * Historical records fall back to:
     *
     * quantity × conversion_factor
     */
    public function stockQuantityValue(): float
    {
        if (
            $this->stock_quantity
            !== null
        ) {
            return round(
                (float) $this
                    ->stock_quantity,
                3,
            );
        }

        return round(
            $this->quantityValue()
                * $this->conversionFactorValue(),
            3,
        );
    }

    /**
     * Convert a customer-facing quantity into
     * physical stock quantity.
     *
     * Example:
     *
     * Sale:
     * 2 Bags
     *
     * conversion_factor:
     * 50
     *
     * stock quantity:
     * 100 Kg
     */
    public function stockQuantityFor(
        float $saleQuantity,
    ): float {
        if ($saleQuantity <= 0) {
            return 0.0;
        }

        return round(
            $saleQuantity
                * $this->conversionFactorValue(),
            3,
        );
    }

    /**
     * Return the customer-facing quantity that
     * is still allowed to be returned.
     *
     * Example:
     *
     * Sold:
     * 2 Bags
     *
     * Already returned:
     * 1 Bag
     *
     * Remaining:
     * 1 Bag
     */
    public function remainingReturnableQuantity(): float
    {
        return round(
            max(
                0,
                $this->quantityValue()
                    - $this->returnedQuantityValue(),
            ),
            3,
        );
    }

    /**
     * Return the physical stock quantity
     * represented by already returned items.
     *
     * Example:
     *
     * Returned:
     * 1 Bag
     *
     * Conversion:
     * 50
     *
     * Returned physical stock:
     * 50 Kg
     */
    public function returnedStockQuantity(): float
    {
        return $this->stockQuantityFor(
            $this->returnedQuantityValue(),
        );
    }

    /**
     * Return the physical stock quantity that
     * may still be restored through returns.
     *
     * Example:
     *
     * Sold:
     * 2 Bags = 100 Kg
     *
     * Returned:
     * 1 Bag = 50 Kg
     *
     * Remaining returnable:
     * 50 Kg
     */
    public function remainingReturnableStockQuantity(): float
    {
        return $this->stockQuantityFor(
            $this
                ->remainingReturnableQuantity(),
        );
    }

    /**
     * Determine whether the requested return
     * quantity is valid for this sale item.
     */
    public function canReturnQuantity(
        float $quantity,
    ): bool {
        if ($quantity <= 0) {
            return false;
        }

        return (
            $quantity
            <= $this
            ->remainingReturnableQuantity()
        );
    }

    /**
     * Return purchase cost per SOLD unit.
     *
     * Full Bag example:
     * Rs. 7,000 per Bag.
     *
     * Loose Kg example:
     * Rs. 140 per Kg.
     */
    public function purchaseCostValue(): float
    {
        return round(
            (float) (
                $this->purchase_cost
                ?? 0
            ),
            2,
        );
    }

    /**
     * Return selling price per SOLD unit.
     *
     * Full Bag example:
     * Rs. 8,000 per Bag.
     *
     * Loose Kg example:
     * Rs. 180 per Kg.
     */
    public function sellingPriceValue(): float
    {
        return round(
            (float) (
                $this->selling_price
                ?? 0
            ),
            2,
        );
    }

    /**
     * Calculate gross amount before the
     * item discount.
     */
    public function grossAmount(): float
    {
        return round(
            $this->quantityValue()
                * $this->sellingPriceValue(),
            2,
        );
    }

    /**
     * Return item discount safely.
     */
    public function discountValue(): float
    {
        return round(
            (float) (
                $this->discount
                ?? 0
            ),
            2,
        );
    }

    /**
     * Calculate the item's net sales amount.
     *
     * Normally this should equal line_total.
     */
    public function calculatedLineTotal(): float
    {
        return round(
            max(
                0,
                $this->grossAmount()
                    - $this->discountValue(),
            ),
            2,
        );
    }

    /**
     * Calculate the total purchase cost for
     * the sold quantity.
     *
     * Bag example:
     *
     * 2 × Rs. 7,000
     * = Rs. 14,000
     *
     * Kg example:
     *
     * 0.5 × Rs. 140
     * = Rs. 70
     */
    public function totalPurchaseCost(): float
    {
        return round(
            $this->quantityValue()
                * $this->purchaseCostValue(),
            2,
        );
    }

    /**
     * Calculate gross profit using the
     * customer-facing sale quantity.
     *
     * Profit =
     * Line Total - Total Purchase Cost
     */
    public function calculatedGrossProfit(): float
    {
        return round(
            $this->calculatedLineTotal()
                - $this->totalPurchaseCost(),
            2,
        );
    }

    /**
     * Determine whether this sale used a
     * stock conversion.
     *
     * Example:
     *
     * Bag sale:
     * conversion_factor = 50
     * true
     *
     * Kg sale:
     * conversion_factor = 1
     * false
     */
    public function usesStockConversion(): bool
    {
        return abs(
            $this->conversionFactorValue()
                - 1.0
        ) > 0.000001;
    }
}
