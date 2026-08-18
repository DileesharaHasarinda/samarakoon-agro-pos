<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchasePayment extends Model
{
    use HasFactory;

    /*
     * =====================================================
     * PAYMENT METHODS
     * =====================================================
     */

    public const METHOD_CASH =
    'cash';

    public const METHOD_CARD =
    'card';

    public const METHOD_BANK_TRANSFER =
    'bank_transfer';

    public const METHOD_CHEQUE =
    'cheque';

    /**
     * All supported supplier payment methods.
     *
     * @var array<int, string>
     */
    public const PAYMENT_METHODS = [
        self::METHOD_CASH,
        self::METHOD_CARD,
        self::METHOD_BANK_TRANSFER,
        self::METHOD_CHEQUE,
    ];

    /*
     * =====================================================
     * PAYMENT TYPES
     * =====================================================
     */

    /*
     * Initial payment made while configuring
     * the purchase settlement.
     */
    public const TYPE_INITIAL =
    'initial_payment';

    /*
     * Later payment made against an existing
     * supplier due.
     */
    public const TYPE_DUE =
    'supplier_due_payment';

    /**
     * @var array<int, string>
     */
    public const PAYMENT_TYPES = [
        self::TYPE_INITIAL,
        self::TYPE_DUE,
    ];

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
     * Purchase belonging to this payment.
     *
     * @return BelongsTo<Purchase, PurchasePayment>
     */
    public function purchase(): BelongsTo
    {
        return $this->belongsTo(
            Purchase::class,
        );
    }

    /**
     * User who recorded this payment.
     *
     * @return BelongsTo<User, PurchasePayment>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }

    /**
     * Determine whether this is the payment
     * recorded during initial settlement.
     */
    public function isInitialPayment(): bool
    {
        return $this->payment_type
            === self::TYPE_INITIAL;
    }

    /**
     * Determine whether this is a later
     * supplier due payment.
     */
    public function isDuePayment(): bool
    {
        return $this->payment_type
            === self::TYPE_DUE;
    }
}
