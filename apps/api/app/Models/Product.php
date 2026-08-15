<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'name',
        'sku',
        'barcode',
        'unit',
        'is_active',
    ];

    protected $casts = [
        'is_active' =>
        'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(
            Category::class,
        );
    }

    /**
     * Optional package variants.
     *
     * Example:
     *
     * Tomato Seeds
     * - 100g Packet
     * - 200g Packet
     * - 500g Packet
     */
    public function variants(): HasMany
    {
        return $this->hasMany(
            ProductVariant::class,
        )
            ->orderBy(
                'sort_order',
            )
            ->orderBy(
                'id',
            );
    }

    public function purchaseItems(): HasMany
    {
        return $this->hasMany(
            PurchaseItem::class,
        );
    }

    public function stockBatches(): HasMany
    {
        return $this->hasMany(
            StockBatch::class,
        );
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(
            SaleItem::class,
        );
    }

    public function scopeActive(
        Builder $query,
    ): Builder {
        return $query->where(
            'is_active',
            true,
        );
    }

    public function hasVariants(): bool
    {
        if (
            $this->relationLoaded(
                'variants',
            )
        ) {
            return $this
                ->variants
                ->isNotEmpty();
        }

        return $this
            ->variants()
            ->exists();
    }
}
