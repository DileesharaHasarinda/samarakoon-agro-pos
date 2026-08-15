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
     * Mass assignable fields.
     *
     * Important stock rule:
     *
     * NORMAL PRODUCT
     * ----------------
     * Product unit: Bottle
     *
     * received_quantity = 20 Bottles
     * available_quantity = 20 Bottles
     * stock_unit = Bottle
     * conversion_factor = 1
     *
     *
     * DUAL-UNIT PRODUCT
     * -----------------
     * Product unit: Bag
     *
     * Purchase:
     * 10 Bags
     *
     * 1 Bag = 50 Kg
     *
     * The stock batch stores physical stock
     * internally in Kg:
     *
     * received_quantity = 500 Kg
     * available_quantity = 500 Kg
     * stock_unit = Kg
     *
     * Full Bag selling price:
     * selling_price
     *
     * Loose Kg selling price:
     * secondary_selling_price
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'batch_code',

        'product_id',
        'product_variant_id',
        'purchase_item_id',

        'batch_number',

        /*
         * Original purchase cost.
         *
         * Example:
         * Rs. 7,000 per 50 Kg Bag.
         */
        'purchase_cost',

        /*
         * Main selling price.
         *
         * For dual-unit Bag products:
         * This is the full Bag selling price.
         *
         * Example:
         * Rs. 8,000 per Bag.
         */
        'selling_price',

        /*
         * Dual-unit configuration.
         */
        'is_dual_unit',

        /*
         * Internal physical stock unit.
         *
         * Normal product:
         * Bottle / Piece / Packet etc.
         *
         * Dual-unit Bag product:
         * Kg
         */
        'stock_unit',

        /*
         * Loose selling unit.
         *
         * Example:
         * Kg
         */
        'secondary_unit',

        /*
         * Number of internal stock units
         * represented by one main product unit.
         *
         * Example:
         * 1 Bag = 50 Kg
         *
         * conversion_factor = 50
         */
        'conversion_factor',

        /*
         * Loose-unit selling price.
         *
         * Example:
         * Rs. 180 per 1 Kg.
         */
        'secondary_selling_price',

        /*
         * Cost of one internal stock unit.
         *
         * Example:
         *
         * Bag purchase cost = Rs. 7,000
         * Bag weight = 50 Kg
         *
         * base_unit_cost =
         * 7000 / 50
         * = Rs. 140 per Kg
         */
        'base_unit_cost',

        /*
         * These quantities represent:
         *
         * Normal product:
         * normal product unit.
         *
         * Dual-unit product:
         * stock_unit, normally Kg.
         */
        'received_quantity',
        'available_quantity',

        'manufactured_date',
        'expiry_date',
        'received_at',
    ];

    /**
     * Attribute casting.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'product_id' =>
            'integer',

            'product_variant_id' =>
            'integer',

            'purchase_item_id' =>
            'integer',

            'purchase_cost' =>
            'decimal:2',

            'selling_price' =>
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

            'base_unit_cost' =>
            'decimal:4',

            /*
             * Stock quantities.
             */
            'received_quantity' =>
            'decimal:3',

            'available_quantity' =>
            'decimal:3',

            /*
             * Dates.
             */
            'manufactured_date' =>
            'date',

            'expiry_date' =>
            'date',

            'received_at' =>
            'datetime',
        ];
    }

    /**
     * Product belonging to this batch.
     *
     * @return BelongsTo<Product, StockBatch>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(
            Product::class,
        );
    }

    /**
     * Exact product variant belonging to this batch.
     *
     * Normal products keep product_variant_id = null.
     */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(
            ProductVariant::class,
            'product_variant_id',
        );
    }

    /**
     * Purchase item that created this batch.
     *
     * @return BelongsTo<PurchaseItem, StockBatch>
     */
    public function purchaseItem(): BelongsTo
    {
        return $this->belongsTo(
            PurchaseItem::class,
        );
    }

    /**
     * Stock movements recorded against
     * this batch.
     *
     * @return HasMany<StockMovement>
     */
    public function movements(): HasMany
    {
        return $this->hasMany(
            StockMovement::class,
        );
    }

    /**
     * Sale items connected to this batch.
     *
     * @return HasMany<SaleItem>
     */
    public function saleItems(): HasMany
    {
        return $this->hasMany(
            SaleItem::class,
        );
    }

    /**
     * Determine whether this batch uses
     * dual-unit stock.
     *
     * Example:
     *
     * Bag + Kg
     */
    public function usesDualUnit(): bool
    {
        return $this->is_dual_unit === true
            && $this->conversionFactorValue() > 0
            && trim(
                (string) $this->secondary_unit,
            ) !== '';
    }

    /**
     * Return the configured conversion
     * factor safely.
     *
     * Example:
     *
     * 1 Bag = 50 Kg
     *
     * Returns:
     * 50.0
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
     * Return the internal stock unit.
     *
     * For a dual-unit Bag product:
     *
     * Kg
     *
     * For a normal product:
     *
     * Bottle / Piece / Packet etc.
     */
    public function stockUnitValue(): string
    {
        $stockUnit = trim(
            (string) (
                $this->stock_unit
                ?? ''
            ),
        );

        if ($stockUnit !== '') {
            return $stockUnit;
        }

        /*
         * Variant stock is an independent package
         * stock pool.
         *
         * Example:
         * Pumpkin Seeds -> 100g Packet
         * physical stock unit = Packet.
         */
        $variantPackageUnit = trim(
            (string) (
                $this->productVariant
                ?->package_unit
                ?? ''
            ),
        );

        if ($variantPackageUnit !== '') {
            return $variantPackageUnit;
        }

        /*
         * Existing historical batches may not
         * have stock_unit populated.
         *
         * Fall back to the parent product unit.
         */
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
     * Return the product's main selling unit.
     *
     * Example:
     *
     * Bag
     */
    public function primaryUnitValue(): string
    {
        $variantPackageUnit = trim(
            (string) (
                $this->productVariant
                ?->package_unit
                ?? ''
            ),
        );

        if ($variantPackageUnit !== '') {
            return $variantPackageUnit;
        }

        $productUnit = trim(
            (string) (
                $this->product
                ?->unit
                ?? ''
            ),
        );

        if ($productUnit !== '') {
            return $productUnit;
        }

        if ($this->usesDualUnit()) {
            return 'Bag';
        }

        return $this->stockUnitValue();
    }

    /**
     * Return the loose selling unit.
     *
     * Example:
     *
     * Kg
     */
    public function secondaryUnitValue(): ?string
    {
        if (!$this->usesDualUnit()) {
            return null;
        }

        $secondaryUnit = trim(
            (string) (
                $this->secondary_unit
                ?? ''
            ),
        );

        return $secondaryUnit !== ''
            ? $secondaryUnit
            : null;
    }

    /**
     * Return currently available physical
     * stock.
     *
     * Dual-unit example:
     *
     * Returns available Kg.
     */
    public function availableStockQuantity(): float
    {
        return round(
            (float) (
                $this->available_quantity
                ?? 0
            ),
            3,
        );
    }

    /**
     * Return originally received physical
     * stock.
     */
    public function receivedStockQuantity(): float
    {
        return round(
            (float) (
                $this->received_quantity
                ?? 0
            ),
            3,
        );
    }

    /**
     * Calculate the cost of one internal
     * stock unit.
     *
     * Dual-unit example:
     *
     * Purchase cost:
     * Rs. 7,000 per Bag
     *
     * Conversion:
     * 1 Bag = 50 Kg
     *
     * Result:
     * Rs. 140 per Kg
     */
    public function baseUnitCostValue(): float
    {
        if (
            $this->base_unit_cost
            !== null
        ) {
            return round(
                (float) $this
                    ->base_unit_cost,
                4,
            );
        }

        $purchaseCost =
            (float) (
                $this->purchase_cost
                ?? 0
            );

        if (!$this->usesDualUnit()) {
            return round(
                $purchaseCost,
                4,
            );
        }

        return round(
            $purchaseCost
                / $this->conversionFactorValue(),
            4,
        );
    }

    /**
     * Return full/main unit selling price.
     *
     * Example:
     *
     * Rs. 8,000 per Bag.
     */
    public function primarySellingPriceValue(): float
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
     * Return loose-unit selling price.
     *
     * Example:
     *
     * Rs. 180 per Kg.
     */
    public function secondarySellingPriceValue(): ?float
    {
        if (
            !$this->usesDualUnit()
            || $this
            ->secondary_selling_price
            === null
        ) {
            return null;
        }

        return round(
            (float) $this
                ->secondary_selling_price,
            2,
        );
    }

    /**
     * Determine whether the requested sale
     * unit is the product's primary unit.
     *
     * Example:
     *
     * Bag
     */
    public function isPrimarySaleUnit(
        string $saleUnit,
    ): bool {
        return $this->normaliseUnit(
            $saleUnit,
        ) === $this->normaliseUnit(
            $this->primaryUnitValue(),
        );
    }

    /**
     * Determine whether the requested sale
     * unit is the loose/secondary unit.
     *
     * Example:
     *
     * Kg
     */
    public function isSecondarySaleUnit(
        string $saleUnit,
    ): bool {
        $secondaryUnit =
            $this->secondaryUnitValue();

        if ($secondaryUnit === null) {
            return false;
        }

        return $this->normaliseUnit(
            $saleUnit,
        ) === $this->normaliseUnit(
            $secondaryUnit,
        );
    }

    /**
     * Convert customer-facing sale quantity
     * into physical stock quantity.
     *
     * FULL BAG EXAMPLE
     * ----------------
     * saleUnit = Bag
     * quantity = 2
     * conversion = 50
     *
     * Result:
     * 100 Kg stock reduction
     *
     *
     * LOOSE KG EXAMPLE
     * ----------------
     * saleUnit = Kg
     * quantity = 0.5
     *
     * Result:
     * 0.5 Kg stock reduction
     */
    public function stockQuantityForSale(
        float $quantity,
        string $saleUnit,
    ): float {
        if ($quantity <= 0) {
            return 0.0;
        }

        if (!$this->usesDualUnit()) {
            return round(
                $quantity,
                3,
            );
        }

        if (
            $this->isPrimarySaleUnit(
                $saleUnit,
            )
        ) {
            return round(
                $quantity
                    * $this->conversionFactorValue(),
                3,
            );
        }

        if (
            $this->isSecondarySaleUnit(
                $saleUnit,
            )
        ) {
            return round(
                $quantity,
                3,
            );
        }

        return 0.0;
    }

    /**
     * Return the selling price that should
     * be used for the selected sale unit.
     *
     * Example:
     *
     * Bag -> Rs. 8,000
     * Kg  -> Rs. 180
     */
    public function sellingPriceForUnit(
        string $saleUnit,
    ): ?float {
        if (!$this->usesDualUnit()) {
            return $this
                ->primarySellingPriceValue();
        }

        if (
            $this->isPrimarySaleUnit(
                $saleUnit,
            )
        ) {
            return $this
                ->primarySellingPriceValue();
        }

        if (
            $this->isSecondarySaleUnit(
                $saleUnit,
            )
        ) {
            return $this
                ->secondarySellingPriceValue();
        }

        return null;
    }

    /**
     * Return the maximum number of complete
     * primary units currently available.
     *
     * Example:
     *
     * Available:
     * 125.5 Kg
     *
     * 1 Bag:
     * 50 Kg
     *
     * Result:
     * 2 full Bags
     */
    public function availablePrimaryUnits(): int
    {
        if (!$this->usesDualUnit()) {
            return (int) floor(
                $this
                    ->availableStockQuantity(),
            );
        }

        return (int) floor(
            $this->availableStockQuantity()
                / $this->conversionFactorValue(),
        );
    }

    /**
     * Return loose quantity remaining after
     * calculating complete primary units.
     *
     * Example:
     *
     * 125.5 Kg
     * 1 Bag = 50 Kg
     *
     * 2 Bags = 100 Kg
     *
     * Loose remainder:
     * 25.5 Kg
     */
    public function looseRemainderQuantity(): float
    {
        if (!$this->usesDualUnit()) {
            return 0.0;
        }

        $fullUnits =
            $this->availablePrimaryUnits();

        $usedStock =
            $fullUnits
            * $this->conversionFactorValue();

        return round(
            max(
                0,
                $this->availableStockQuantity()
                    - $usedStock,
            ),
            3,
        );
    }

    /**
     * Determine whether enough stock exists
     * for a requested sale.
     */
    public function hasEnoughStockForSale(
        float $quantity,
        string $saleUnit,
    ): bool {
        $requiredStock =
            $this->stockQuantityForSale(
                $quantity,
                $saleUnit,
            );

        if ($requiredStock <= 0) {
            return false;
        }

        return (
            $requiredStock
            <= $this
            ->availableStockQuantity()
        );
    }

    /**
     * Determine whether this batch currently
     * has stock available.
     */
    public function hasAvailableStock(): bool
    {
        return (
            $this->availableStockQuantity()
            > 0
        );
    }

    /**
     * Determine whether this batch has
     * expired.
     */
    public function isExpired(): bool
    {
        if ($this->expiry_date === null) {
            return false;
        }

        return $this
            ->expiry_date
            ->isBefore(
                today(),
            );
    }

    /**
     * Normalise unit values for safe
     * comparisons.
     *
     * Examples:
     *
     * "KG"  -> "kg"
     * " Kg " -> "kg"
     * "BAG" -> "bag"
     */
    private function normaliseUnit(
        string $unit,
    ): string {
        return strtolower(
            trim($unit),
        );
    }
}
