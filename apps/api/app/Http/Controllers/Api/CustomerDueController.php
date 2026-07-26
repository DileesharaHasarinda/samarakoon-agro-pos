<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreDuePaymentRequest;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CustomerDueController extends Controller
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
                'in:all,overdue,upcoming',
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

        $query = Sale::query()
            ->where(
                'due_amount',
                '>',
                0,
            )
            ->whereNotNull(
                'customer_id',
            )
            ->when(
                $search !== '',
                function (
                    Builder $query,
                ) use ($search): void {
                    $query->where(
                        function (
                            Builder $searchQuery,
                        ) use ($search): void {
                            $searchQuery
                                ->where(
                                    'sale_number',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhereHas(
                                    'customer',
                                    fn(
                                        Builder $customerQuery,
                                    ) => $customerQuery
                                        ->where(
                                            'name',
                                            'like',
                                            "%{$search}%",
                                        )
                                        ->orWhere(
                                            'mobile',
                                            'like',
                                            "%{$search}%",
                                        )
                                        ->orWhere(
                                            'customer_code',
                                            'like',
                                            "%{$search}%",
                                        ),
                                );
                        },
                    );
                },
            )
            ->when(
                $status === 'overdue',
                fn(
                    Builder $query,
                ) => $query
                    ->whereNotNull(
                        'due_date',
                    )
                    ->whereDate(
                        'due_date',
                        '<',
                        today(),
                    ),
            )
            ->when(
                $status === 'upcoming',
                fn(
                    Builder $query,
                ) => $query->where(
                    function (
                        Builder $dueQuery,
                    ): void {
                        $dueQuery
                            ->whereNull(
                                'due_date',
                            )
                            ->orWhereDate(
                                'due_date',
                                '>=',
                                today(),
                            );
                    },
                ),
            );

        $summary = (clone $query)
            ->selectRaw(
                '
                    COUNT(*) AS due_sales,
                    COALESCE(
                        SUM(due_amount),
                        0
                    ) AS outstanding_due,
                    COALESCE(
                        SUM(paid_amount),
                        0
                    ) AS collected_amount
                ',
            )
            ->first();

        $sales = $query
            ->with([
                'customer:id,customer_code,name,mobile,credit_limit',
                'createdBy:id,name,username',
            ])
            ->latest('due_date')
            ->latest('sale_date')
            ->paginate($perPage);

        return response()->json([
            'data' =>
            collect(
                $sales->items(),
            )
                ->map(
                    fn(
                        Sale $sale,
                    ): array =>
                    $this->dueSaleData(
                        $sale,
                    ),
                )
                ->values(),

            'summary' => [
                'due_sales' =>
                (int) (
                    $summary
                    ?->due_sales
                    ?? 0
                ),

                'outstanding_due' =>
                (float) (
                    $summary
                    ?->outstanding_due
                    ?? 0
                ),

                'collected_amount' =>
                (float) (
                    $summary
                    ?->collected_amount
                    ?? 0
                ),
            ],

            'meta' => [
                'current_page' =>
                $sales->currentPage(),

                'last_page' =>
                $sales->lastPage(),

                'per_page' =>
                $sales->perPage(),

                'total' =>
                $sales->total(),

                'from' =>
                $sales->firstItem(),

                'to' =>
                $sales->lastItem(),
            ],
        ]);
    }

    public function store(
        StoreDuePaymentRequest $request,
        Sale $sale,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        if (! $sale->customer_id) {
            return response()->json([
                'message' =>
                'This sale is not connected to a registered customer.',
            ], 422);
        }

        $validated =
            $request->validated();

        $sale = DB::transaction(
            function () use (
                $sale,
                $validated,
                $user,
            ): Sale {
                $lockedSale =
                    Sale::query()
                    ->whereKey(
                        $sale->id,
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                $currentDue =
                    round(
                        (float) $lockedSale
                            ->due_amount,
                        2,
                    );

                $paymentAmount =
                    round(
                        (float) $validated['amount'],
                        2,
                    );

                if ($currentDue <= 0) {
                    throw ValidationException::withMessages([
                            'amount' => [
                                'This sale has no outstanding due amount.',
                            ],
                        ]);
                }

                if (
                    $paymentAmount
                    > $currentDue
                ) {
                    throw ValidationException::withMessages([
                            'amount' => [
                                "The maximum allowed payment is {$currentDue}.",
                            ],
                        ]);
                }

                $remainingDue =
                    round(
                        $currentDue
                            - $paymentAmount,
                        2,
                    );

                $newPaidAmount =
                    round(
                        (float) $lockedSale
                            ->paid_amount
                            + $paymentAmount,
                        2,
                    );

                $newStatus =
                    $remainingDue <= 0
                    ? Sale::PAYMENT_STATUS_PAID
                    : Sale::PAYMENT_STATUS_PARTIAL;

                $lockedSale->update([
                    'paid_amount' =>
                    $newPaidAmount,

                    'due_amount' =>
                    max(
                        0,
                        $remainingDue,
                    ),

                    'payment_status' =>
                    $newStatus,
                ]);

                SalePayment::query()
                    ->create([
                        'sale_id' =>
                        $lockedSale->id,

                        'payment_method' =>
                        $validated['payment_method'],

                        'payment_type' =>
                        SalePayment::TYPE_DUE_COLLECTION,

                        'amount' =>
                        $paymentAmount,

                        'reference_number' =>
                        $validated['reference_number'] ?? null,

                        'notes' =>
                        $validated['notes'] ?? null,

                        'created_by' =>
                        $user->id,
                    ]);

                return $lockedSale;
            },
            3,
        );

        $sale->load([
            'customer:id,customer_code,name,mobile,credit_limit',
            'createdBy:id,name,username',
            'payments' =>
            fn($query) =>
            $query
                ->with(
                    'createdBy:id,name,username',
                )
                ->latest('id'),
        ]);

        return response()->json([
            'message' =>
            'Due payment recorded successfully.',

            'data' =>
            $this->dueSaleData(
                $sale,
                true,
            ),
        ]);
    }

    public function show(
        Sale $sale,
    ): JsonResponse {
        if (! $sale->customer_id) {
            return response()->json([
                'message' =>
                'This sale is not connected to a customer.',
            ], 422);
        }

        $sale->load([
            'customer:id,customer_code,name,mobile,secondary_mobile,email,address,credit_limit',
            'createdBy:id,name,username',

            'payments' =>
            fn($query) =>
            $query
                ->with(
                    'createdBy:id,name,username',
                )
                ->latest('id'),
        ]);

        return response()->json([
            'data' =>
            $this->dueSaleData(
                $sale,
                true,
            ),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function dueSaleData(
        Sale $sale,
        bool $includePayments = false,
    ): array {
        $isOverdue =
            (float) $sale->due_amount > 0
            && $sale->due_date !== null
            && $sale->due_date->isBefore(
                today(),
            );

        $data = [
            'id' =>
            $sale->id,

            'sale_number' =>
            $sale->sale_number,

            'sale_date' =>
            $sale
                ->sale_date
                ->toISOString(),

            'grand_total' =>
            (float) $sale
                ->grand_total,

            'paid_amount' =>
            (float) $sale
                ->paid_amount,

            'due_amount' =>
            (float) $sale
                ->due_amount,

            'due_date' =>
            $sale
                ->due_date
                ?->format('Y-m-d'),

            'is_overdue' =>
            $isOverdue,

            'payment_status' =>
            $sale->payment_status,

            'settlement_type' =>
            $sale->settlement_type,

            'customer' => [
                'id' =>
                $sale->customer->id,

                'customer_code' =>
                $sale
                    ->customer
                    ->customer_code,

                'name' =>
                $sale->customer->name,

                'mobile' =>
                $sale->customer->mobile,

                'credit_limit' =>
                (float) $sale
                    ->customer
                    ->credit_limit,
            ],

            'created_by' => [
                'id' =>
                $sale->createdBy->id,

                'name' =>
                $sale
                    ->createdBy
                    ->name,

                'username' =>
                $sale
                    ->createdBy
                    ->username,
            ],
        ];

        if ($includePayments) {
            $data['payments'] =
                $sale->payments
                ->map(
                    fn(
                        SalePayment $payment,
                    ): array => [
                        'id' =>
                        $payment->id,

                        'payment_method' =>
                        $payment
                            ->payment_method,

                        'payment_type' =>
                        $payment
                            ->payment_type,

                        'amount' =>
                        (float) $payment
                            ->amount,

                        'reference_number' =>
                        $payment
                            ->reference_number,

                        'notes' =>
                        $payment->notes,

                        'created_by' =>
                        $payment
                            ->createdBy
                            ? [
                                'id' =>
                                $payment
                                    ->createdBy
                                    ->id,

                                'name' =>
                                $payment
                                    ->createdBy
                                    ->name,
                            ]
                            : null,

                        'created_at' =>
                        $payment
                            ->created_at
                            ?->toISOString(),
                    ],
                )
                ->values();
        }

        return $data;
    }
}
