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

    /**
     * These values may be set internally by
     * ProductController.
     *
     * The frontend product form still sends
     * only name, unit and optional barcode.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'category_id',
        'name',
        'sku',
        'barcode',
        'unit',
        'is_active',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(
            Category::class,
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
}
