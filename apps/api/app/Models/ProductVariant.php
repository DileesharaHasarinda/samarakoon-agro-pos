<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'size_value',
        'size_unit',
        'package_unit',
        'sku',
        'barcode',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'product_id' =>
            'integer',

            'size_value' =>
            'decimal:3',

            'is_active' =>
            'boolean',

            'sort_order' =>
            'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(
            Product::class,
        );
    }

    public function purchaseItems(): HasMany
    {
        return $this->hasMany(
            PurchaseItem::class,
            'product_variant_id',
        );
    }

    public function stockBatches(): HasMany
    {
        return $this->hasMany(
            StockBatch::class,
            'product_variant_id',
        );
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(
            SaleItem::class,
            'product_variant_id',
        );
    }

    public function displayName(): string
    {
        $size =
            number_format(
                (float) $this->size_value,
                3,
                '.',
                '',
            );

        $size =
            rtrim(
                rtrim(
                    $size,
                    '0',
                ),
                '.',
            );

        return trim(
            $size
                . $this->size_unit
                . ' '
                . $this->package_unit,
        );
    }
}
