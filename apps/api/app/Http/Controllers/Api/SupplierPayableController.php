<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Purchase\ConfigurePurchaseSettlementRequest;
use App\Http\Requests\Purchase\StoreSupplierPaymentRequest;
use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SupplierPayableController extends Controller
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
                    'unconfigured',
                    'outstanding',
                    'overdue',
                    'paid',
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

        $page = (int) (
            $validated['page']
            ?? 1
        );

        $perPage = (int) (
            $validated['per_page']
            ?? 20
        );

        $rows =
            DB::table('purchases')
            ->join(
                'suppliers',
                'suppliers.id',
                '=',
                'purchases.supplier_id',
            )
            ->join(
                'users',
                'users.id',
                '=',
                'purchases.created_by',
            )
            ->leftJoin(
                'purchase_payments',
                'purchase_payments.purchase_id',
                '=',
                'purchases.id',
            )
            ->when(
                $search !== '',
                function (
                    $query,
                ) use ($search): void {
                    $query->where(
                        function (
                            $searchQuery,
                        ) use ($search): void {
                            $searchQuery
                                ->where(
                                    'purchases.purchase_number',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'suppliers.name',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'purchases.payment_terms',
                                    'like',
                                    "%{$search}%",
                                );
                        },
                    );
                },
            )
            ->select([
                'purchases.id',
                'purchases.purchase_number',
                'purchases.purchase_date',
                'purchases.grand_total',
                'purchases.payment_status',
                'purchases.settlement_type',
                'purchases.paid_amount',
                'purchases.due_amount',
                'purchases.due_date',
                'purchases.payment_terms',
                'purchases.created_at',
                'suppliers.id as supplier_id',
                'suppliers.name as supplier_name',
                'users.id as created_by_id',
                'users.name as created_by_name',
            ])
            ->selectRaw(
                '
                    COUNT(
                        purchase_payments.id
                    ) AS payments_count
                ',
            )
            ->groupBy([
                'purchases.id',
                'purchases.purchase_number',
                'purchases.purchase_date',
                'purchases.grand_total',
                'purchases.payment_status',
                'purchases.settlement_type',
                'purchases.paid_amount',
                'purchases.due_amount',
                'purchases.due_date',
                'purchases.payment_terms',
                'purchases.created_at',
                'suppliers.id',
                'suppliers.name',
                'users.id',
                'users.name',
            ])
            ->orderByRaw(
                "
                    CASE
                        WHEN purchases.payment_status = 'unconfigured'
                        THEN 0
                        WHEN purchases.due_amount > 0
                            AND purchases.due_date IS NOT NULL
                            AND purchases.due_date < CURRENT_DATE
                        THEN 1
                        WHEN purchases.due_amount > 0
                        THEN 2
                        ELSE 3
                    END
                ",
            )
            ->orderByDesc(
                'purchases.purchase_date',
            )
            ->get()
            ->map(
                fn(
                    object $row,
                ): array =>
                $this->rowData(
                    $row,
                ),
            )
            ->values();

        $summary = [
            'total_purchases' =>
            $rows->count(),

            'unconfigured_purchases' =>
            $rows
                ->where(
                    'payment_status',
                    'unconfigured',
                )
                ->count(),

            'outstanding_purchases' =>
            $rows
                ->filter(
                    fn(
                        array $purchase,
                    ): bool =>
                    $purchase['due_amount'] > 0,
                )
                ->count(),

            'outstanding_due' =>
            (float) $rows->sum(
                'due_amount',
            ),

            'overdue_due' =>
            (float) $rows
                ->filter(
                    fn(
                        array $purchase,
                    ): bool =>
                    $purchase['is_overdue'],
                )
                ->sum(
                    'due_amount',
                ),

            'total_paid' =>
            (float) $rows->sum(
                'paid_amount',
            ),
        ];

        $filtered =
            $rows
            ->when(
                $status !== 'all',
                fn(
                    Collection $collection,
                ): Collection =>
                $collection->filter(
                    function (
                        array $purchase,
                    ) use ($status): bool {
                        return match ($status) {
                            'unconfigured' =>
                            $purchase['payment_status'] === 'unconfigured',

                            'outstanding' =>
                            $purchase['due_amount'] > 0,

                            'overdue' =>
                            $purchase['is_overdue'],

                            'paid' =>
                            $purchase['payment_status'] === 'paid',

                            default =>
                            true,
                        };
                    },
                ),
            )
            ->values();

        $lastPage =
            max(
                1,
                (int) ceil(
                    $filtered->count()
                        / $perPage,
                ),
            );

        $page =
            min(
                $page,
                $lastPage,
            );

        $pageItems =
            $filtered
            ->forPage(
                $page,
                $perPage,
            )
            ->values();

        $from =
            $pageItems->isEmpty()
            ? null
            : (
                ($page - 1)
                * $perPage
            ) + 1;

        $to =
            $pageItems->isEmpty()
            ? null
            : $from
            + $pageItems->count()
            - 1;

        return response()->json([
            'data' =>
            $pageItems,

            'summary' =>
            $summary,

            'meta' => [
                'current_page' =>
                $page,

                'last_page' =>
                $lastPage,

                'per_page' =>
                $perPage,

                'total' =>
                $filtered->count(),

                'from' =>
                $from,

                'to' =>
                $to,
            ],
        ]);
    }

    public function show(
        Purchase $purchase,
    ): JsonResponse {
        return response()->json([
            'data' =>
            $this->purchaseDetails(
                $purchase->id,
            ),
        ]);
    }

    public function configure(
        ConfigurePurchaseSettlementRequest $request,
        Purchase $purchase,
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

        DB::transaction(
            function () use (
                $purchase,
                $validated,
                $user,
            ): void {
                $lockedPurchase =
                    Purchase::query()
                    ->whereKey(
                        $purchase->id,
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                if (
                    PurchasePayment::query()
                    ->where(
                        'purchase_id',
                        $lockedPurchase->id,
                    )
                    ->exists()
                ) {
                    throw ValidationException::withMessages([
                        'settlement_type' => [
                            'This purchase already has payment records. Record additional payments using the supplier payment option.',
                        ],
                    ]);
                }

                $grandTotal =
                    round(
                        (float) $lockedPurchase
                            ->grand_total,
                        2,
                    );

                if ($grandTotal <= 0) {
                    throw ValidationException::withMessages([
                        'settlement_type' => [
                            'The purchase total must be greater than zero.',
                        ],
                    ]);
                }

                $settlementType =
                    (string) $validated['settlement_type'];

                $payments =
                    $this->normalisePayments(
                        $validated['payments']
                            ?? [],
                    );

                $paidAmount =
                    round(
                        (float) $payments
                            ->sum(
                                'amount',
                            ),
                        2,
                    );

                if (
                    $settlementType
                    === 'full'
                ) {
                    if (
                        $payments->isEmpty()
                        || abs(
                            $grandTotal
                                - $paidAmount,
                        ) > 0.01
                    ) {
                        throw ValidationException::withMessages([
                            'payments' => [
                                'For a fully paid purchase, the combined payment amounts must equal the purchase total.',
                            ],
                        ]);
                    }

                    $paidAmount =
                        $grandTotal;

                    $dueAmount =
                        0.0;

                    $paymentStatus =
                        'paid';
                } elseif (
                    $settlementType
                    === 'partial'
                ) {
                    if (
                        $payments->isEmpty()
                        || $paidAmount <= 0
                        || $paidAmount
                        >= $grandTotal
                    ) {
                        throw ValidationException::withMessages([
                            'payments' => [
                                'For a partial settlement, the combined payment amount must be greater than zero and lower than the purchase total.',
                            ],
                        ]);
                    }

                    $dueAmount =
                        round(
                            $grandTotal
                                - $paidAmount,
                            2,
                        );

                    $paymentStatus =
                        'partial';
                } else {
                    if (
                        ! $payments->isEmpty()
                        || $paidAmount > 0
                    ) {
                        throw ValidationException::withMessages([
                            'payments' => [
                                'An entirely-on-credit settlement cannot contain an initial payment.',
                            ],
                        ]);
                    }

                    $paidAmount =
                        0.0;

                    $dueAmount =
                        $grandTotal;

                    $paymentStatus =
                        'due';
                }

                /*
                 * Due date is OPTIONAL.
                 */
                $dueDate =
                    $dueAmount > 0
                    ? (
                        $validated['due_date']
                        ?? null
                    )
                    : null;

                $lockedPurchase->forceFill([
                    'payment_status' =>
                    $paymentStatus,

                    'settlement_type' =>
                    $settlementType,

                    'paid_amount' =>
                    $paidAmount,

                    'due_amount' =>
                    $dueAmount,

                    'due_date' =>
                    $dueDate,

                    'payment_terms' =>
                    $validated['payment_terms'] ?? null,
                ]);

                $lockedPurchase->save();

                foreach (
                    $payments as $payment
                ) {
                    $this->createPayment(
                        $lockedPurchase,
                        $payment,
                        PurchasePayment::TYPE_INITIAL,
                        $user,
                    );
                }
            },
            3,
        );

        return response()->json([
            'message' =>
            'Purchase payment settlement configured successfully.',

            'data' =>
            $this->purchaseDetails(
                $purchase->id,
            ),
        ]);
    }

    public function storePayment(
        StoreSupplierPaymentRequest $request,
        Purchase $purchase,
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

        DB::transaction(
            function () use (
                $purchase,
                $validated,
                $user,
            ): void {
                $lockedPurchase =
                    Purchase::query()
                    ->whereKey(
                        $purchase->id,
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                if (
                    $lockedPurchase
                    ->payment_status
                    === 'unconfigured'
                ) {
                    throw ValidationException::withMessages([
                        'payments' => [
                            'Configure the purchase payment settlement first.',
                        ],
                    ]);
                }

                $currentDue =
                    round(
                        (float) $lockedPurchase
                            ->due_amount,
                        2,
                    );

                if ($currentDue <= 0) {
                    throw ValidationException::withMessages([
                        'payments' => [
                            'This purchase has no outstanding supplier due.',
                        ],
                    ]);
                }

                $payments =
                    $this->normalisePayments(
                        $validated['payments'],
                    );

                $paymentAmount =
                    round(
                        (float) $payments
                            ->sum(
                                'amount',
                            ),
                        2,
                    );

                if (
                    $payments->isEmpty()
                    || $paymentAmount <= 0
                ) {
                    throw ValidationException::withMessages([
                        'payments' => [
                            'Enter at least one supplier payment.',
                        ],
                    ]);
                }

                if (
                    $paymentAmount
                    > $currentDue
                    + 0.01
                ) {
                    throw ValidationException::withMessages([
                        'payments' => [
                            sprintf(
                                'The combined payment amount cannot exceed the current due of %.2f.',
                                $currentDue,
                            ),
                        ],
                    ]);
                }

                /*
                 * With valid 2-decimal inputs this should not normally
                 * happen, but keep the aggregate safely capped.
                 */
                $paymentAmount =
                    min(
                        $paymentAmount,
                        $currentDue,
                    );

                $remainingDue =
                    round(
                        max(
                            0,
                            $currentDue
                                - $paymentAmount,
                        ),
                        2,
                    );

                $newPaidAmount =
                    round(
                        (float) $lockedPurchase
                            ->paid_amount
                            + $paymentAmount,
                        2,
                    );

                $lockedPurchase->forceFill([
                    'paid_amount' =>
                    $newPaidAmount,

                    'due_amount' =>
                    $remainingDue,

                    'payment_status' =>
                    $remainingDue <= 0
                        ? 'paid'
                        : 'partial',
                ]);

                $lockedPurchase->save();

                foreach (
                    $payments as $payment
                ) {
                    $this->createPayment(
                        $lockedPurchase,
                        $payment,
                        PurchasePayment::TYPE_DUE,
                        $user,
                    );
                }
            },
            3,
        );

        return response()->json([
            'message' =>
            'Supplier payment recorded successfully.',

            'data' =>
            $this->purchaseDetails(
                $purchase->id,
            ),
        ]);
    }

    /**
     * @param array<int, mixed> $payments
     *
     * @return Collection<int, array{
     *     payment_method: string,
     *     amount: float,
     *     reference_number: string|null,
     *     notes: string|null
     * }>
     */
    private function normalisePayments(
        array $payments,
    ): Collection {
        return collect(
            $payments,
        )
            ->map(
                function (
                    mixed $payment,
                ): ?array {
                    if (
                        ! is_array(
                            $payment,
                        )
                    ) {
                        return null;
                    }

                    $amount =
                        round(
                            (float) (
                                $payment['amount']
                                ?? 0
                            ),
                            2,
                        );

                    if (
                        $amount <= 0
                    ) {
                        return null;
                    }

                    $referenceNumber =
                        isset(
                            $payment['reference_number'],
                        )
                        ? trim(
                            (string) $payment['reference_number'],
                        )
                        : '';

                    $notes =
                        isset(
                            $payment['notes'],
                        )
                        ? trim(
                            (string) $payment['notes'],
                        )
                        : '';

                    return [
                        'payment_method' =>
                        (string) (
                            $payment['payment_method']
                            ?? 'cash'
                        ),

                        'amount' =>
                        $amount,

                        'reference_number' =>
                        $referenceNumber
                            !== ''
                            ? $referenceNumber
                            : null,

                        'notes' =>
                        $notes !== ''
                            ? $notes
                            : null,
                    ];
                },
            )
            ->filter()
            ->values();
    }

    /**
     * @param array{
     *     payment_method: string,
     *     amount: float,
     *     reference_number: string|null,
     *     notes: string|null
     * } $payment
     */
    private function createPayment(
        Purchase $purchase,
        array $payment,
        string $paymentType,
        User $user,
    ): void {
        PurchasePayment::query()
            ->create([
                'purchase_id' =>
                $purchase->id,

                'payment_method' =>
                $payment['payment_method'],

                'payment_type' =>
                $paymentType,

                'amount' =>
                $payment['amount'],

                'reference_number' =>
                $payment['reference_number'],

                'notes' =>
                $payment['notes'],

                'payment_date' =>
                now(),

                'created_by' =>
                $user->id,
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function purchaseDetails(
        int $purchaseId,
    ): array {
        $row =
            DB::table('purchases')
            ->join(
                'suppliers',
                'suppliers.id',
                '=',
                'purchases.supplier_id',
            )
            ->join(
                'users',
                'users.id',
                '=',
                'purchases.created_by',
            )
            ->where(
                'purchases.id',
                $purchaseId,
            )
            ->select([
                'purchases.id',
                'purchases.purchase_number',
                'purchases.purchase_date',
                'purchases.grand_total',
                'purchases.payment_status',
                'purchases.settlement_type',
                'purchases.paid_amount',
                'purchases.due_amount',
                'purchases.due_date',
                'purchases.payment_terms',
                'purchases.created_at',
                'suppliers.id as supplier_id',
                'suppliers.name as supplier_name',
                'users.id as created_by_id',
                'users.name as created_by_name',
            ])
            ->firstOrFail();

        $data =
            $this->rowData(
                (object) [
                    ...((array) $row),

                    'payments_count' =>
                    PurchasePayment::query()
                        ->where(
                            'purchase_id',
                            $purchaseId,
                        )
                        ->count(),
                ],
            );

        $payments =
            DB::table('purchase_payments')
            ->join(
                'users',
                'users.id',
                '=',
                'purchase_payments.created_by',
            )
            ->where(
                'purchase_payments.purchase_id',
                $purchaseId,
            )
            ->select([
                'purchase_payments.id',
                'purchase_payments.payment_method',
                'purchase_payments.payment_type',
                'purchase_payments.amount',
                'purchase_payments.reference_number',
                'purchase_payments.notes',
                'purchase_payments.payment_date',
                'users.id as created_by_id',
                'users.name as created_by_name',
            ])
            ->orderByDesc(
                'purchase_payments.payment_date',
            )
            ->orderByDesc(
                'purchase_payments.id',
            )
            ->get()
            ->map(
                fn(
                    object $payment,
                ): array => [
                    'id' =>
                    (int) $payment->id,

                    'payment_method' =>
                    (string) $payment
                        ->payment_method,

                    'payment_type' =>
                    (string) $payment
                        ->payment_type,

                    'amount' =>
                    (float) $payment
                        ->amount,

                    'reference_number' =>
                    $payment
                        ->reference_number
                        ? (string) $payment
                            ->reference_number
                        : null,

                    'notes' =>
                    $payment->notes
                        ? (string) $payment
                            ->notes
                        : null,

                    'payment_date' =>
                    (string) $payment
                        ->payment_date,

                    'created_by' => [
                        'id' =>
                        (int) $payment
                            ->created_by_id,

                        'name' =>
                        (string) $payment
                            ->created_by_name,
                    ],
                ],
            )
            ->values();

        return [
            ...$data,

            'payments' =>
            $payments,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function rowData(
        object $row,
    ): array {
        $dueAmount =
            (float) $row
                ->due_amount;

        $dueDate =
            $row->due_date
            ? (string) $row
                ->due_date
            : null;

        /*
         * A purchase without a due date is not overdue.
         */
        $isOverdue =
            $dueAmount > 0
            && $dueDate !== null
            && $dueDate
            < today()
            ->toDateString();

        return [
            'id' =>
            (int) $row->id,

            'purchase_number' =>
            (string) $row
                ->purchase_number,

            'purchase_date' =>
            (string) $row
                ->purchase_date,

            'grand_total' =>
            (float) $row
                ->grand_total,

            'payment_status' =>
            (string) $row
                ->payment_status,

            'settlement_type' =>
            $row->settlement_type
                ? (string) $row
                    ->settlement_type
                : null,

            'paid_amount' =>
            (float) $row
                ->paid_amount,

            'due_amount' =>
            $dueAmount,

            'due_date' =>
            $dueDate,

            'payment_terms' =>
            $row->payment_terms
                ? (string) $row
                    ->payment_terms
                : null,

            'is_overdue' =>
            $isOverdue,

            'payments_count' =>
            (int) (
                $row->payments_count
                ?? 0
            ),

            'supplier' => [
                'id' =>
                (int) $row
                    ->supplier_id,

                'name' =>
                (string) $row
                    ->supplier_name,
            ],

            'created_by' => [
                'id' =>
                (int) $row
                    ->created_by_id,

                'name' =>
                (string) $row
                    ->created_by_name,
            ],

            'created_at' =>
            (string) $row
                ->created_at,
        ];
    }
}
