<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shift\CloseCashierShiftRequest;
use App\Http\Requests\Shift\OpenCashierShiftRequest;
use App\Http\Requests\Shift\StoreCashMovementRequest;
use App\Models\CashierShift;
use App\Models\CashRegisterMovement;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\SaleReturn;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CashierShiftController extends Controller
{
    public function current(
        Request $request,
    ): JsonResponse {
        $user =
            $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        if (! $user->isCashier()) {
            return response()->json([
                'data' =>
                null,
            ]);
        }

        $shift =
            CashierShift::query()
            ->where(
                'cashier_id',
                $user->id,
            )
            ->where(
                'status',
                CashierShift::STATUS_OPEN,
            )
            ->latest('opened_at')
            ->first();

        return response()->json([
            'data' =>
            $shift
                ? $this->shiftData(
                    $shift,
                    true,
                )
                : null,
        ]);
    }

    public function index(
        Request $request,
    ): JsonResponse {
        $user =
            $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        $validated = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:160',
            ],

            'cashier_id' => [
                'nullable',
                'integer',
                'exists:users,id',
            ],

            'status' => [
                'nullable',

                Rule::in([
                    'all',
                    CashierShift::STATUS_OPEN,
                    CashierShift::STATUS_CLOSED,
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

        $cashierId =
            $user->isCashier()
            ? $user->id
            : (
                $validated['cashier_id'] ?? null
            );

        $status =
            $validated['status']
            ?? 'all';

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

        $query =
            CashierShift::query()
            ->with([
                'cashier:id,name,username,email,phone',

                'openedBy:id,name,username',

                'closedBy:id,name,username',
            ])
            ->when(
                $cashierId !== null,
                fn(
                    Builder $shiftQuery,
                ) => $shiftQuery->where(
                    'cashier_id',
                    $cashierId,
                ),
            )
            ->when(
                $status !== 'all',
                fn(
                    Builder $shiftQuery,
                ) => $shiftQuery->where(
                    'status',
                    $status,
                ),
            )
            ->when(
                $dateFrom !== null,
                fn(
                    Builder $shiftQuery,
                ) => $shiftQuery->whereDate(
                    'opened_at',
                    '>=',
                    $dateFrom,
                ),
            )
            ->when(
                $dateTo !== null,
                fn(
                    Builder $shiftQuery,
                ) => $shiftQuery->whereDate(
                    'opened_at',
                    '<=',
                    $dateTo,
                ),
            )
            ->when(
                $search !== '',
                function (
                    Builder $shiftQuery,
                ) use ($search): void {
                    $shiftQuery->where(
                        function (
                            Builder $searchQuery,
                        ) use ($search): void {
                            $searchQuery
                                ->where(
                                    'shift_number',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhereHas(
                                    'cashier',
                                    function (
                                        Builder $cashierQuery,
                                    ) use ($search): void {
                                        $cashierQuery
                                            ->where(
                                                'name',
                                                'like',
                                                "%{$search}%",
                                            )
                                            ->orWhere(
                                                'username',
                                                'like',
                                                "%{$search}%",
                                            );
                                    },
                                );
                        },
                    );
                },
            )
            ->latest('opened_at')
            ->latest('id');

        $summaryQuery =
            clone $query;

        $summaryRows =
            $summaryQuery->get();

        $summary = [
            'total_shifts' =>
            $summaryRows->count(),

            'open_shifts' =>
            $summaryRows
                ->where(
                    'status',
                    CashierShift::STATUS_OPEN,
                )
                ->count(),

            'closed_shifts' =>
            $summaryRows
                ->where(
                    'status',
                    CashierShift::STATUS_CLOSED,
                )
                ->count(),

            'total_opening_cash' =>
            (float) $summaryRows->sum(
                'opening_cash',
            ),

            'total_expected_cash' =>
            (float) $summaryRows->sum(
                fn(
                    CashierShift $shift,
                ): float =>
                $this
                    ->calculateTotals(
                        $shift,
                    )['expected_cash'],
            ),

            'total_difference' =>
            (float) $summaryRows
                ->where(
                    'status',
                    CashierShift::STATUS_CLOSED,
                )
                ->sum(
                    'cash_difference',
                ),
        ];

        $shifts =
            $query->paginate(
                $perPage,
            );

        return response()->json([
            'data' =>
            collect(
                $shifts->items(),
            )
                ->map(
                    fn(
                        CashierShift $shift,
                    ): array =>
                    $this->shiftData(
                        $shift,
                        false,
                    ),
                )
                ->values(),

            'summary' =>
            $summary,

            'meta' => [
                'current_page' =>
                $shifts->currentPage(),

                'last_page' =>
                $shifts->lastPage(),

                'per_page' =>
                $shifts->perPage(),

                'total' =>
                $shifts->total(),

                'from' =>
                $shifts->firstItem(),

                'to' =>
                $shifts->lastItem(),
            ],
        ]);
    }

    public function show(
        Request $request,
        CashierShift $cashierShift,
    ): JsonResponse {
        $user =
            $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        if (
            $user->isCashier()
            && $cashierShift->cashier_id
            !== $user->id
        ) {
            return response()->json([
                'message' =>
                'You cannot view another cashier’s shift.',
            ], 403);
        }

        return response()->json([
            'data' =>
            $this->shiftData(
                $cashierShift,
                true,
            ),
        ]);
    }

    public function open(
        OpenCashierShiftRequest $request,
    ): JsonResponse {
        $user =
            $request->user();

        if (
            ! $user instanceof User
            || ! $user->isCashier()
        ) {
            return response()->json([
                'message' =>
                'Only cashier accounts can open a shift.',
            ], 403);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' =>
                'The cashier account is inactive.',
            ], 422);
        }

        $validated =
            $request->validated();

        $shift =
            DB::transaction(
                function () use (
                    $user,
                    $validated,
                ): CashierShift {
                    /*
                     * Lock the user row to prevent
                     * two simultaneous open requests.
                     */
                    User::query()
                        ->whereKey(
                            $user->id,
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                    $existingShift =
                        CashierShift::query()
                        ->where(
                            'cashier_id',
                            $user->id,
                        )
                        ->where(
                            'status',
                            CashierShift::STATUS_OPEN,
                        )
                        ->lockForUpdate()
                        ->first();

                    if ($existingShift) {
                        throw ValidationException::withMessages([
                                'opening_cash' => [
                                    'You already have an open cashier shift.',
                                ],
                            ]);
                    }

                    $shift =
                        CashierShift::query()
                        ->create([
                            'shift_number' =>
                            null,

                            'cashier_id' =>
                            $user->id,

                            'opening_cash' =>
                            round(
                                (float) $validated['opening_cash'],
                                2,
                            ),

                            'status' =>
                            CashierShift::STATUS_OPEN,

                            'opened_at' =>
                            now(),

                            'opening_notes' =>
                            $validated['opening_notes'] ?? null,

                            'opened_by' =>
                            $user->id,
                        ]);

                    $shift->update([
                        'shift_number' =>
                        sprintf(
                            'SHIFT-%s-%06d',
                            $shift
                                ->opened_at
                                ->format('Ymd'),
                            $shift->id,
                        ),
                    ]);

                    return $shift;
                },
                3,
            );

        return response()->json([
            'message' =>
            'Cashier shift opened successfully.',

            'data' =>
            $this->shiftData(
                $shift,
                true,
            ),
        ], 201);
    }

    public function close(
        CloseCashierShiftRequest $request,
        CashierShift $cashierShift,
    ): JsonResponse {
        $user =
            $request->user();

        if (
            ! $user instanceof User
            || ! $user->isCashier()
        ) {
            return response()->json([
                'message' =>
                'Only cashier accounts can close their shift.',
            ], 403);
        }

        if (
            $cashierShift->cashier_id
            !== $user->id
        ) {
            return response()->json([
                'message' =>
                'You cannot close another cashier’s shift.',
            ], 403);
        }

        $validated =
            $request->validated();

        DB::transaction(
            function () use (
                $cashierShift,
                $validated,
                $user,
            ): void {
                $lockedShift =
                    CashierShift::query()
                    ->whereKey(
                        $cashierShift->id,
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                if (
                    $lockedShift->status
                    !== CashierShift::STATUS_OPEN
                ) {
                    throw ValidationException::withMessages([
                            'actual_cash' => [
                                'This cashier shift is already closed.',
                            ],
                        ]);
                }

                $totals =
                    $this->calculateTotals(
                        $lockedShift,
                    );

                $actualCash =
                    round(
                        (float) $validated['actual_cash'],
                        2,
                    );

                $expectedCash =
                    round(
                        (float) $totals['expected_cash'],
                        2,
                    );

                $difference =
                    round(
                        $actualCash
                            - $expectedCash,
                        2,
                    );

                $lockedShift->update([
                    'status' =>
                    CashierShift::STATUS_CLOSED,

                    'closed_at' =>
                    now(),

                    'expected_cash' =>
                    $expectedCash,

                    'actual_cash' =>
                    $actualCash,

                    'cash_difference' =>
                    $difference,

                    'closing_notes' =>
                    $validated['closing_notes'] ?? null,

                    'closed_by' =>
                    $user->id,
                ]);
            },
            3,
        );

        return response()->json([
            'message' =>
            'Cashier shift closed successfully.',

            'data' =>
            $this->shiftData(
                $cashierShift->fresh(),
                true,
            ),
        ]);
    }

    public function storeMovement(
        StoreCashMovementRequest $request,
        CashierShift $cashierShift,
    ): JsonResponse {
        $user =
            $request->user();

        if (
            ! $user instanceof User
            || ! $user->isCashier()
        ) {
            return response()->json([
                'message' =>
                'Only cashier accounts can record cash movements.',
            ], 403);
        }

        if (
            $cashierShift->cashier_id
            !== $user->id
        ) {
            return response()->json([
                'message' =>
                'You cannot modify another cashier’s shift.',
            ], 403);
        }

        if (
            $cashierShift->status
            !== CashierShift::STATUS_OPEN
        ) {
            throw ValidationException::withMessages([
                    'amount' => [
                        'Cash movements can only be added to an open shift.',
                    ],
                ]);
        }

        $validated =
            $request->validated();

        $movement =
            CashRegisterMovement::query()
            ->create([
                'cashier_shift_id' =>
                $cashierShift->id,

                'movement_type' =>
                $validated['movement_type'],

                'reason' =>
                $validated['reason'],

                'amount' =>
                round(
                    (float) $validated['amount'],
                    2,
                ),

                'description' =>
                $validated['description'],

                'reference_number' =>
                $validated['reference_number'] ?? null,

                'occurred_at' =>
                now(),

                'created_by' =>
                $user->id,
            ]);

        return response()->json([
            'message' =>
            'Cash register movement recorded successfully.',

            'data' => [
                'movement' =>
                $this->movementData(
                    $movement,
                ),

                'shift' =>
                $this->shiftData(
                    $cashierShift,
                    true,
                ),
            ],
        ], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function calculateTotals(
        CashierShift $shift,
    ): array {
        $start =
            $shift
            ->opened_at
            ->copy();

        $end =
            $shift->closed_at
            ? $shift
            ->closed_at
            ->copy()
            : now();

        $salesQuery =
            Sale::query()
            ->where(
                'created_by',
                $shift->cashier_id,
            )
            ->whereBetween(
                'sale_date',
                [
                    $start,
                    $end,
                ],
            );

        $paymentsQuery =
            SalePayment::query()
            ->where(
                'created_by',
                $shift->cashier_id,
            )
            ->whereBetween(
                'created_at',
                [
                    $start,
                    $end,
                ],
            );

        $cashCollections =
            (float) (
                (clone $paymentsQuery)
                ->where(
                    'payment_method',
                    SalePayment::METHOD_CASH,
                )
                ->sum('amount')
            );

        $cardCollections =
            (float) (
                (clone $paymentsQuery)
                ->where(
                    'payment_method',
                    SalePayment::METHOD_CARD,
                )
                ->sum('amount')
            );

        $bankCollections =
            (float) (
                (clone $paymentsQuery)
                ->where(
                    'payment_method',
                    SalePayment::METHOD_BANK_TRANSFER,
                )
                ->sum('amount')
            );

        $cashRefunds =
            (float) SaleReturn::query()
                ->where(
                    'created_by',
                    $shift->cashier_id,
                )
                ->where(
                    'refund_method',
                    SalePayment::METHOD_CASH,
                )
                ->whereBetween(
                    'return_date',
                    [
                        $start,
                        $end,
                    ],
                )
                ->sum('refund_amount');

        $movementQuery =
            CashRegisterMovement::query()
            ->where(
                'cashier_shift_id',
                $shift->id,
            );

        $cashIn =
            (float) (
                (clone $movementQuery)
                ->where(
                    'movement_type',
                    CashRegisterMovement::TYPE_CASH_IN,
                )
                ->sum('amount')
            );

        $cashOut =
            (float) (
                (clone $movementQuery)
                ->where(
                    'movement_type',
                    CashRegisterMovement::TYPE_CASH_OUT,
                )
                ->sum('amount')
            );

        $openingCash =
            (float) $shift
                ->opening_cash;

        $expectedCash =
            round(
                $openingCash
                    + $cashCollections
                    + $cashIn
                    - $cashRefunds
                    - $cashOut,
                2,
            );

        return [
            'sales_count' => (clone $salesQuery)
                ->count(),

            'sales_total' =>
            (float) (
                (clone $salesQuery)
                ->sum(
                    'grand_total',
                )
            ),

            'due_created' =>
            (float) (
                (clone $salesQuery)
                ->sum(
                    'due_amount',
                )
            ),

            'cash_collections' =>
            round(
                $cashCollections,
                2,
            ),

            'card_collections' =>
            round(
                $cardCollections,
                2,
            ),

            'bank_transfer_collections' =>
            round(
                $bankCollections,
                2,
            ),

            'cash_refunds' =>
            round(
                $cashRefunds,
                2,
            ),

            'cash_in' =>
            round(
                $cashIn,
                2,
            ),

            'cash_out' =>
            round(
                $cashOut,
                2,
            ),

            'expected_cash' =>
            $expectedCash,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function shiftData(
        CashierShift $shift,
        bool $includeMovements,
    ): array {
        $shift->loadMissing([
            'cashier:id,name,username,email,phone',

            'openedBy:id,name,username',

            'closedBy:id,name,username',
        ]);

        $totals =
            $this->calculateTotals(
                $shift,
            );

        $end =
            $shift->closed_at
            ?? now();

        $durationMinutes =
            (int) $shift
                ->opened_at
                ->diffInMinutes(
                    $end,
                );

        $movements =
            $includeMovements
            ? CashRegisterMovement::query()
            ->where(
                'cashier_shift_id',
                $shift->id,
            )
            ->with(
                'createdBy:id,name,username',
            )
            ->latest('occurred_at')
            ->latest('id')
            ->get()
            ->map(
                fn(
                    CashRegisterMovement $movement,
                ): array =>
                $this->movementData(
                    $movement,
                ),
            )
            ->values()
            : collect();

        return [
            'id' =>
            $shift->id,

            'shift_number' =>
            $shift->shift_number,

            'status' =>
            $shift->status,

            'opening_cash' =>
            (float) $shift
                ->opening_cash,

            'opened_at' =>
            $shift
                ->opened_at
                ->toISOString(),

            'closed_at' =>
            $shift
                ->closed_at
                ?->toISOString(),

            'expected_cash' =>
            $shift->status
                === CashierShift::STATUS_CLOSED
                ? (float) $shift
                    ->expected_cash
                : (float) $totals['expected_cash'],

            'actual_cash' =>
            $shift->actual_cash !== null
                ? (float) $shift
                    ->actual_cash
                : null,

            'cash_difference' =>
            $shift->cash_difference !== null
                ? (float) $shift
                    ->cash_difference
                : null,

            'opening_notes' =>
            $shift->opening_notes,

            'closing_notes' =>
            $shift->closing_notes,

            'duration_minutes' =>
            $durationMinutes,

            'cashier' => [
                'id' =>
                $shift->cashier->id,

                'name' =>
                $shift->cashier->name,

                'username' =>
                $shift
                    ->cashier
                    ->username,

                'email' =>
                $shift->cashier->email,

                'phone' =>
                $shift->cashier->phone,
            ],

            'opened_by' => [
                'id' =>
                $shift->openedBy->id,

                'name' =>
                $shift->openedBy->name,
            ],

            'closed_by' =>
            $shift->closedBy
                ? [
                    'id' =>
                    $shift
                        ->closedBy
                        ->id,

                    'name' =>
                    $shift
                        ->closedBy
                        ->name,
                ]
                : null,

            'totals' =>
            $totals,

            'movements' =>
            $movements,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function movementData(
        CashRegisterMovement $movement,
    ): array {
        $movement->loadMissing(
            'createdBy:id,name,username',
        );

        return [
            'id' =>
            $movement->id,

            'movement_type' =>
            $movement
                ->movement_type,

            'reason' =>
            $movement->reason,

            'amount' =>
            (float) $movement
                ->amount,

            'description' =>
            $movement
                ->description,

            'reference_number' =>
            $movement
                ->reference_number,

            'occurred_at' =>
            $movement
                ->occurred_at
                ->toISOString(),

            'created_by' => [
                'id' =>
                $movement
                    ->createdBy
                    ->id,

                'name' =>
                $movement
                    ->createdBy
                    ->name,
            ],
        ];
    }
}
