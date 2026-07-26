<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cashier\ResetCashierPasswordRequest;
use App\Http\Requests\Cashier\StoreCashierRequest;
use App\Http\Requests\Cashier\UpdateCashierRequest;
use App\Models\CashierShift;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\SaleReturn;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CashierAccountController extends Controller
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

            'status' => [
                'nullable',

                Rule::in([
                    'all',
                    'active',
                    'inactive',
                ]),
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

        $status =
            $validated['status']
            ?? 'all';

        $perPage = (int) (
            $validated['per_page']
            ?? 20
        );

        $query =
            User::query()
            ->where(
                'role',
                'cashier',
            )
            ->when(
                $search !== '',
                function (
                    Builder $cashierQuery,
                ) use ($search): void {
                    $cashierQuery->where(
                        function (
                            Builder $searchQuery,
                        ) use ($search): void {
                            $searchQuery
                                ->where(
                                    'name',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'username',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'email',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'phone',
                                    'like',
                                    "%{$search}%",
                                );
                        },
                    );
                },
            )
            ->when(
                $status === 'active',
                fn(
                    Builder $cashierQuery,
                ) => $cashierQuery->where(
                    'is_active',
                    true,
                ),
            )
            ->when(
                $status === 'inactive',
                fn(
                    Builder $cashierQuery,
                ) => $cashierQuery->where(
                    'is_active',
                    false,
                ),
            )
            ->orderByDesc('is_active')
            ->orderBy('name');

        $summary = [
            'total_cashiers' =>
            User::query()
                ->where(
                    'role',
                    'cashier',
                )
                ->count(),

            'active_cashiers' =>
            User::query()
                ->where(
                    'role',
                    'cashier',
                )
                ->where(
                    'is_active',
                    true,
                )
                ->count(),

            'inactive_cashiers' =>
            User::query()
                ->where(
                    'role',
                    'cashier',
                )
                ->where(
                    'is_active',
                    false,
                )
                ->count(),

            'cashiers_with_open_shift' =>
            CashierShift::query()
                ->where(
                    'status',
                    CashierShift::STATUS_OPEN,
                )
                ->distinct(
                    'cashier_id',
                )
                ->count(
                    'cashier_id',
                ),
        ];

        $cashiers =
            $query->paginate(
                $perPage,
            );

        return response()->json([
            'data' =>
            collect(
                $cashiers->items(),
            )
                ->map(
                    fn(
                        User $cashier,
                    ): array =>
                    $this->cashierData(
                        $cashier,
                    ),
                )
                ->values(),

            'summary' =>
            $summary,

            'meta' => [
                'current_page' =>
                $cashiers->currentPage(),

                'last_page' =>
                $cashiers->lastPage(),

                'per_page' =>
                $cashiers->perPage(),

                'total' =>
                $cashiers->total(),

                'from' =>
                $cashiers->firstItem(),

                'to' =>
                $cashiers->lastItem(),
            ],
        ]);
    }

    public function store(
        StoreCashierRequest $request,
    ): JsonResponse {
        $validated =
            $request->validated();

        $cashier =
            DB::transaction(
                function () use (
                    $validated,
                ): User {
                    $cashier =
                        new User();

                    $cashier->forceFill([
                        'name' =>
                        $validated['name'],

                        'username' =>
                        $validated['username'],

                        'email' =>
                        $validated['email'],

                        'phone' =>
                        $validated['phone']
                            ?? null,

                        'role' =>
                        'cashier',

                        'password' =>
                        Hash::make(
                            $validated['password'],
                        ),

                        'is_active' =>
                        $validated['is_active'],

                        'last_login_at' =>
                        null,
                    ]);

                    $cashier->save();

                    return $cashier;
                },
                3,
            );

        return response()->json([
            'message' =>
            'Cashier account created successfully.',

            'data' =>
            $this->cashierData(
                $cashier,
            ),
        ], 201);
    }

    public function show(
        User $cashier,
    ): JsonResponse {
        $this->ensureCashier(
            $cashier,
        );

        return response()->json([
            'data' =>
            $this->cashierData(
                $cashier,
            ),
        ]);
    }

    public function update(
        UpdateCashierRequest $request,
        User $cashier,
    ): JsonResponse {
        $this->ensureCashier(
            $cashier,
        );

        $validated =
            $request->validated();

        if (
            ! $validated['is_active']
            && CashierShift::query()
            ->where(
                'cashier_id',
                $cashier->id,
            )
            ->where(
                'status',
                CashierShift::STATUS_OPEN,
            )
            ->exists()
        ) {
            throw ValidationException::withMessages([
                    'is_active' => [
                        'Close the cashier’s current shift before deactivating the account.',
                    ],
                ]);
        }

        DB::transaction(
            function () use (
                $cashier,
                $validated,
            ): void {
                $cashier->forceFill([
                    'name' =>
                    $validated['name'],

                    'username' =>
                    $validated['username'],

                    'email' =>
                    $validated['email'],

                    'phone' =>
                    $validated['phone']
                        ?? null,

                    'is_active' =>
                    $validated['is_active'],
                ]);

                $cashier->save();

                if (! $cashier->is_active) {
                    $cashier
                        ->tokens()
                        ->delete();
                }
            },
            3,
        );

        return response()->json([
            'message' =>
            'Cashier account updated successfully.',

            'data' =>
            $this->cashierData(
                $cashier->fresh(),
            ),
        ]);
    }

    public function updateStatus(
        Request $request,
        User $cashier,
    ): JsonResponse {
        $this->ensureCashier(
            $cashier,
        );

        $validated = $request->validate([
            'is_active' => [
                'required',
                'boolean',
            ],
        ]);

        if (
            ! $validated['is_active']
            && CashierShift::query()
            ->where(
                'cashier_id',
                $cashier->id,
            )
            ->where(
                'status',
                CashierShift::STATUS_OPEN,
            )
            ->exists()
        ) {
            throw ValidationException::withMessages([
                    'is_active' => [
                        'Close the cashier’s current shift before deactivating the account.',
                    ],
                ]);
        }

        DB::transaction(
            function () use (
                $cashier,
                $validated,
            ): void {
                $cashier->forceFill([
                    'is_active' =>
                    $validated['is_active'],
                ]);

                $cashier->save();

                if (! $cashier->is_active) {
                    $cashier
                        ->tokens()
                        ->delete();
                }
            },
            3,
        );

        return response()->json([
            'message' =>
            $cashier->is_active
                ? 'Cashier account activated successfully.'
                : 'Cashier account deactivated successfully.',

            'data' =>
            $this->cashierData(
                $cashier,
            ),
        ]);
    }

    public function resetPassword(
        ResetCashierPasswordRequest $request,
        User $cashier,
    ): JsonResponse {
        $this->ensureCashier(
            $cashier,
        );

        DB::transaction(
            function () use (
                $request,
                $cashier,
            ): void {
                $cashier->forceFill([
                    'password' =>
                    Hash::make(
                        $request->validated()['password'],
                    ),
                ]);

                $cashier->save();

                /*
                 * Revoke all current login sessions.
                 */
                $cashier
                    ->tokens()
                    ->delete();
            },
            3,
        );

        return response()->json([
            'message' =>
            'Cashier password reset successfully. Existing sessions were signed out.',
        ]);
    }

    private function ensureCashier(
        User $cashier,
    ): void {
        if ($cashier->role !== 'cashier') {
            abort(
                404,
                'Cashier account not found.',
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function cashierData(
        User $cashier,
    ): array {
        $salesQuery =
            Sale::query()
            ->where(
                'created_by',
                $cashier->id,
            );

        $openShift =
            CashierShift::query()
            ->where(
                'cashier_id',
                $cashier->id,
            )
            ->where(
                'status',
                CashierShift::STATUS_OPEN,
            )
            ->latest('opened_at')
            ->first();

        return [
            'id' =>
            $cashier->id,

            'name' =>
            $cashier->name,

            'username' =>
            $cashier->username,

            'email' =>
            $cashier->email,

            'phone' =>
            $cashier->phone,

            'role' =>
            $cashier->role,

            'is_active' =>
            (bool) $cashier
                ->is_active,

            'last_login_at' =>
            $cashier
                ->last_login_at
                ?->toISOString(),

            'created_at' =>
            $cashier
                ->created_at
                ?->toISOString(),

            'statistics' => [
                'sales_count' => (clone $salesQuery)
                    ->count(),

                'sales_total' =>
                (float) (
                    (clone $salesQuery)
                    ->sum(
                        'grand_total',
                    )
                ),

                'returns_count' =>
                SaleReturn::query()
                    ->where(
                        'created_by',
                        $cashier->id,
                    )
                    ->count(),

                'payments_collected' =>
                (float) SalePayment::query()
                    ->where(
                        'created_by',
                        $cashier->id,
                    )
                    ->sum('amount'),

                'shifts_count' =>
                CashierShift::query()
                    ->where(
                        'cashier_id',
                        $cashier->id,
                    )
                    ->count(),
            ],

            'open_shift' =>
            $openShift
                ? [
                    'id' =>
                    $openShift->id,

                    'shift_number' =>
                    $openShift
                        ->shift_number,

                    'opening_cash' =>
                    (float) $openShift
                        ->opening_cash,

                    'opened_at' =>
                    $openShift
                        ->opened_at
                        ->toISOString(),
                ]
                : null,
        ];
    }
}
