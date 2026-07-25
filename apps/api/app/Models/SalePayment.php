<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalePayment extends Model
{
    use HasFactory;

    public const METHOD_CASH =
    'cash';

    public const METHOD_CARD =
    'card';

    public const METHOD_BANK_TRANSFER =
    'bank_transfer';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'sale_id',
        'payment_method',
        'amount',
        'reference_number',
        'notes',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sale_id' => 'integer',
            'amount' => 'decimal:2',
            'created_by' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Sale, SalePayment>
     */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(
            Sale::class,
        );
    }

    /**
     * @return BelongsTo<User, SalePayment>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }
}
