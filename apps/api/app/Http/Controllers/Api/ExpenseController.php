<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Expense\StoreExpenseRequest;
use App\Http\Requests\Expense\UpdateExpenseRequest;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ExpenseController extends Controller
{
    public function index(
        Request $request,
    ): JsonResponse {
        $validated = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:160',
            ],

            'category_id' => [
                'nullable',
                'integer',
                'exists:expense_categories,id',
            ],

            'payment_method' => [
                'nullable',

                Rule::in([
                    Expense::METHOD_CASH,
                    Expense::METHOD_CARD,
                    Expense::METHOD_BANK_TRANSFER,
                ]),
            ],

            'expense_type' => [
                'nullable',

                Rule::in([
                    Expense::TYPE_ONE_TIME,
                    Expense::TYPE_RECURRING,
                ]),
            ],

            'date_from' => [
                'nullable',
                'date_format:Y-m-d',
            ],

            'date_to' => [
                'nullable',
                'date_format:Y-m-d',
                'after_or_equal:date_from',
            ],

            'page' => [
                'nullable',
                'integer',
                'min:1',
            ],

            'per_page' => [
                'nullable',
                'integer',
                'min:5',
                'max:100',
            ],
        ]);

        $search = trim(
            (string) (
                $validated['search']
                ?? ''
            ),
        );

        $categoryId =
            $validated['category_id']
            ?? null;

        $paymentMethod =
            $validated['payment_method']
            ?? null;

        $expenseType =
            $validated['expense_type']
            ?? null;

        $dateFrom =
            $validated['date_from']
            ?? null;

        $dateTo =
            $validated['date_to']
            ?? null;

        $perPage = (int) (
            $validated['per_page']
            ?? 20
        );

        $query = Expense::query()
            ->when(
                $search !== '',
                function (
                    Builder $expenseQuery,
                ) use ($search): void {
                    $expenseQuery->where(
                        function (
                            Builder $searchQuery,
                        ) use ($search): void {
                            $searchQuery
                                ->where(
                                    'expense_number',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'description',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'reference_number',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'notes',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhereHas(
                                    'category',
                                    fn(
                                        Builder $categoryQuery,
                                    ) => $categoryQuery
                                        ->where(
                                            'name',
                                            'like',
                                            "%{$search}%",
                                        ),
                                );
                        },
                    );
                },
            )
            ->when(
                $categoryId !== null,
                fn(
                    Builder $expenseQuery,
                ) => $expenseQuery->where(
                    'expense_category_id',
                    $categoryId,
                ),
            )
            ->when(
                $paymentMethod !== null,
                fn(
                    Builder $expenseQuery,
                ) => $expenseQuery->where(
                    'payment_method',
                    $paymentMethod,
                ),
            )
            ->when(
                $expenseType !== null,
                fn(
                    Builder $expenseQuery,
                ) => $expenseQuery->where(
                    'expense_type',
                    $expenseType,
                ),
            )
            ->when(
                $dateFrom !== null,
                fn(
                    Builder $expenseQuery,
                ) => $expenseQuery->whereDate(
                    'expense_date',
                    '>=',
                    $dateFrom,
                ),
            )
            ->when(
                $dateTo !== null,
                fn(
                    Builder $expenseQuery,
                ) => $expenseQuery->whereDate(
                    'expense_date',
                    '<=',
                    $dateTo,
                ),
            );

        $summaryRecord =
            (clone $query)
            ->selectRaw(
                '
                        COUNT(*) AS total_expenses,

                        COALESCE(
                            SUM(amount),
                            0
                        ) AS total_amount,

                        COALESCE(
                            SUM(
                                CASE
                                    WHEN expense_type = ?
                                    THEN amount
                                    ELSE 0
                                END
                            ),
                            0
                        ) AS one_time_amount,

                        COALESCE(
                            SUM(
                                CASE
                                    WHEN expense_type = ?
                                    THEN amount
                                    ELSE 0
                                END
                            ),
                            0
                        ) AS recurring_amount
                    ',
                [
                    Expense::TYPE_ONE_TIME,
                    Expense::TYPE_RECURRING,
                ],
            )
            ->first();

        $expenses = $query
            ->with([
                'category:id,name,is_active',

                'createdBy:id,name,username',
            ])
            ->latest('expense_date')
            ->latest('id')
            ->paginate($perPage);

        return response()->json([
            'data' =>
            collect(
                $expenses->items(),
            )
                ->map(
                    fn(
                        Expense $expense,
                    ): array =>
                    $this->expenseData(
                        $expense,
                    ),
                )
                ->values(),

            'summary' => [
                'total_expenses' =>
                (int) (
                    $summaryRecord
                    ?->total_expenses
                    ?? 0
                ),

                'total_amount' =>
                (float) (
                    $summaryRecord
                    ?->total_amount
                    ?? 0
                ),

                'one_time_amount' =>
                (float) (
                    $summaryRecord
                    ?->one_time_amount
                    ?? 0
                ),

                'recurring_amount' =>
                (float) (
                    $summaryRecord
                    ?->recurring_amount
                    ?? 0
                ),
            ],

            'meta' => [
                'current_page' =>
                $expenses->currentPage(),

                'last_page' =>
                $expenses->lastPage(),

                'per_page' =>
                $expenses->perPage(),

                'total' =>
                $expenses->total(),

                'from' =>
                $expenses->firstItem(),

                'to' =>
                $expenses->lastItem(),
            ],
        ]);
    }

    public function store(
        StoreExpenseRequest $request,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        $validated =
            $request->validated();

        $category =
            ExpenseCategory::query()
            ->findOrFail(
                $validated['expense_category_id'],
            );

        if (! $category->is_active) {
            throw ValidationException::withMessages([
                    'expense_category_id' => [
                        'The selected expense category is inactive.',
                    ],
                ]);
        }

        $expense = DB::transaction(
            function () use (
                $validated,
                $user,
            ): Expense {
                $expense =
                    Expense::query()
                    ->create([
                        ...$validated,

                        'expense_number' =>
                        null,

                        'created_by' =>
                        $user->id,
                    ]);

                $expense->update([
                    'expense_number' =>
                    sprintf(
                        'EXP-%s-%06d',
                        $expense
                            ->expense_date
                            ->format('Ymd'),
                        $expense->id,
                    ),
                ]);

                return $expense;
            },
        );

        return response()->json([
            'message' =>
            'Expense created successfully.',

            'data' =>
            $this->expenseData(
                $this->loadExpense(
                    $expense,
                ),
            ),
        ], 201);
    }

    public function show(
        Expense $expense,
    ): JsonResponse {
        return response()->json([
            'data' =>
            $this->expenseData(
                $this->loadExpense(
                    $expense,
                ),
            ),
        ]);
    }

    public function update(
        UpdateExpenseRequest $request,
        Expense $expense,
    ): JsonResponse {
        $validated =
            $request->validated();

        $category =
            ExpenseCategory::query()
            ->findOrFail(
                $validated['expense_category_id'],
            );

        if (
            ! $category->is_active
            && $category->id
            !== $expense
            ->expense_category_id
        ) {
            throw ValidationException::withMessages([
                    'expense_category_id' => [
                        'The selected expense category is inactive.',
                    ],
                ]);
        }

        $expense->update(
            $validated,
        );

        return response()->json([
            'message' =>
            'Expense updated successfully.',

            'data' =>
            $this->expenseData(
                $this->loadExpense(
                    $expense,
                ),
            ),
        ]);
    }

    public function destroy(
        Expense $expense,
    ): JsonResponse {
        $expense->delete();

        return response()->json([
            'message' =>
            'Expense deleted successfully.',
        ]);
    }

    private function loadExpense(
        Expense $expense,
    ): Expense {
        return $expense->load([
            'category:id,name,is_active',

            'createdBy:id,name,username',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function expenseData(
        Expense $expense,
    ): array {
        return [
            'id' =>
            $expense->id,

            'expense_number' =>
            $expense
                ->expense_number,

            'expense_date' =>
            $expense
                ->expense_date
                ->format('Y-m-d'),

            'amount' =>
            (float) $expense
                ->amount,

            'payment_method' =>
            $expense
                ->payment_method,

            'expense_type' =>
            $expense
                ->expense_type,

            'recurring_frequency' =>
            $expense
                ->recurring_frequency,

            'recurring_end_date' =>
            $expense
                ->recurring_end_date
                ?->format('Y-m-d'),

            'description' =>
            $expense->description,

            'reference_number' =>
            $expense
                ->reference_number,

            'notes' =>
            $expense->notes,

            'category' => [
                'id' =>
                $expense
                    ->category
                    ->id,

                'name' =>
                $expense
                    ->category
                    ->name,

                'is_active' =>
                (bool) $expense
                    ->category
                    ->is_active,
            ],

            'created_by' => [
                'id' =>
                $expense
                    ->createdBy
                    ->id,

                'name' =>
                $expense
                    ->createdBy
                    ->name,

                'username' =>
                $expense
                    ->createdBy
                    ->username,
            ],

            'created_at' =>
            $expense
                ->created_at
                ?->toISOString(),

            'updated_at' =>
            $expense
                ->updated_at
                ?->toISOString(),
        ];
    }
}
