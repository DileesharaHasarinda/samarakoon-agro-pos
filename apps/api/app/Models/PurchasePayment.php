<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchasePayment extends Model
{
    use HasFactory;

    public const METHOD_CASH =
    'cash';

    public const METHOD_CARD =
    'card';

    public const METHOD_BANK_TRANSFER =
    'bank_transfer';

    public const METHOD_CHEQUE =
    'cheque';

    public const TYPE_INITIAL =
    'initial_payment';

    public const TYPE_DUE =
    'supplier_due_payment';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'purchase_id',
        'payment_method',
        'payment_type',
        'amount',
        'reference_number',
        'notes',
        'payment_date',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'purchase_id' =>
            'integer',

            'amount' =>
            'decimal:2',

            'payment_date' =>
            'datetime',

            'created_by' =>
            'integer',
        ];
    }

    /**
     * @return BelongsTo<Purchase, PurchasePayment>
     */
    public function purchase(): BelongsTo
    {
        return $this->belongsTo(
            Purchase::class,
        );
    }

    /**
     * @return BelongsTo<User, PurchasePayment>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }
}
