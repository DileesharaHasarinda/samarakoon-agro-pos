<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    public const TYPE_RETAIL =
    'retail';

    public const TYPE_WHOLESALE =
    'wholesale';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'customer_code',
        'name',
        'mobile',
        'secondary_mobile',
        'email',
        'address',
        'customer_type',
        'credit_limit',
        'notes',
        'is_active',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'credit_limit' => 'decimal:2',
            'is_active' => 'boolean',
            'created_by' => 'integer',
        ];
    }

    /**
     * @return HasMany<Sale>
     */
    public function sales(): HasMany
    {
        return $this->hasMany(
            Sale::class,
        );
    }

    /**
     * @return HasMany<Sale>
     */
    public function dueSales(): HasMany
    {
        return $this
            ->hasMany(
                Sale::class,
            )
            ->where(
                'due_amount',
                '>',
                0,
            );
    }

    /**
     * @return BelongsTo<User, Customer>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }
}
