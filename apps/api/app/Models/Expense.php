<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    use HasFactory;

    public const METHOD_CASH =
    'cash';

    public const METHOD_CARD =
    'card';

    public const METHOD_BANK_TRANSFER =
    'bank_transfer';

    public const TYPE_ONE_TIME =
    'one_time';

    public const TYPE_RECURRING =
    'recurring';

    public const FREQUENCY_WEEKLY =
    'weekly';

    public const FREQUENCY_MONTHLY =
    'monthly';

    public const FREQUENCY_QUARTERLY =
    'quarterly';

    public const FREQUENCY_YEARLY =
    'yearly';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'expense_number',
        'expense_category_id',
        'expense_date',
        'amount',
        'payment_method',
        'expense_type',
        'recurring_frequency',
        'recurring_end_date',
        'description',
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
            'expense_category_id' =>
            'integer',

            'expense_date' =>
            'date',

            'amount' =>
            'decimal:2',

            'recurring_end_date' =>
            'date',

            'created_by' =>
            'integer',
        ];
    }

    /**
     * @return BelongsTo<ExpenseCategory, Expense>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(
            ExpenseCategory::class,
            'expense_category_id',
        );
    }

    /**
     * @return BelongsTo<User, Expense>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }
}
