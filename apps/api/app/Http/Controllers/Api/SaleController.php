<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sale\StoreSaleRequest;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SaleController extends Controller
{
    public function index(
        Request $request,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validated = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:160',
            ],

            'payment_method' => [
                'nullable',

                Rule::in([
                    SalePayment::METHOD_CASH,
                    SalePayment::METHOD_CARD,
                    SalePayment::METHOD_BANK_TRANSFER,
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

        $paymentMethod =
            $validated['payment_method']
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

        $query = Sale::query();

        /*
         * Cashiers can only view their own
         * sales. Admins can view every sale.
         */
        if ($user->isCashier()) {
            $query->where(
                'created_by',
                $user->id,
            );
        }

        $query
            ->when(
                $search !== '',
                function (
                    Builder $saleQuery,
                ) use ($search): void {
                    $saleQuery->where(
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
                                    'createdBy',
                                    function (
                                        Builder $userQuery,
                                    ) use ($search): void {
                                        $userQuery
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
                                )
                                ->orWhereHas(
                                    'items.product',
                                    function (
                                        Builder $productQuery,
                                    ) use ($search): void {
                                        $productQuery
                                            ->where(
                                                'name',
                                                'like',
                                                "%{$search}%",
                                            )
                                            ->orWhere(
                                                'sku',
                                                'like',
                                                "%{$search}%",
                                            )
                                            ->orWhere(
                                                'barcode',
                                                'like',
                                                "%{$search}%",
                                            );
                                    },
                                )
                                ->orWhereHas(
                                    'items.stockBatch',
                                    function (
                                        Builder $batchQuery,
                                    ) use ($search): void {
                                        $batchQuery
                                            ->where(
                                                'batch_code',
                                                'like',
                                                "%{$search}%",
                                            )
                                            ->orWhere(
                                                'batch_number',
                                                'like',
                                                "%{$search}%",
                                            );
                                    },
                                );
                        },
                    );
                },
            )
            ->when(
                $paymentMethod !== null,
                fn(
                    Builder $saleQuery,
                ) => $saleQuery->whereHas(
                    'payments',
                    fn(
                        Builder $paymentQuery,
                    ) => $paymentQuery->where(
                        'payment_method',
                        $paymentMethod,
                    ),
                ),
            )
            ->when(
                $dateFrom !== null,
                fn(
                    Builder $saleQuery,
                ) => $saleQuery->whereDate(
                    'sale_date',
                    '>=',
                    $dateFrom,
                ),
            )
            ->when(
                $dateTo !== null,
                fn(
                    Builder $saleQuery,
                ) => $saleQuery->whereDate(
                    'sale_date',
                    '<=',
                    $dateTo,
                ),
            );

        /*
         * Calculate totals using the same
         * filters as the history list.
         */
        $summaryRecord = (clone $query)
            ->selectRaw(
                '
                    COUNT(*) AS total_sales,
                    COALESCE(
                        SUM(grand_total),
                        0
                    ) AS total_revenue,
                    COALESCE(
                        SUM(
                            item_discount_total
                            + discount
                        ),
                        0
                    ) AS total_discount,
                    COALESCE(
                        SUM(gross_profit),
                        0
                    ) AS gross_profit,
                    COALESCE(
                        SUM(net_profit),
                        0
                    ) AS net_profit
                ',
            )
            ->first();

        $filteredSaleIds = (clone $query)
            ->select('sales.id');

        $totalItems = (float) SaleItem::query()
            ->whereIn(
                'sale_id',
                $filteredSaleIds,
            )
            ->sum('quantity');

        $sales = $query
            ->with([
                'createdBy:id,name,username',

                'payments' =>
                fn($paymentQuery) =>
                $paymentQuery
                    ->select([
                        'id',
                        'sale_id',
                        'payment_method',
                        'amount',
                        'reference_number',
                    ])
                    ->orderBy('id'),
            ])
            ->withCount('items')
            ->withSum(
                'items as total_quantity',
                'quantity',
            )
            ->latest('sale_date')
            ->latest('id')
            ->paginate($perPage);

        $includeProfit =
            $user->isAdmin();

        $data = collect(
            $sales->items(),
        )
            ->map(
                fn(
                    Sale $sale,
                ): array =>
                $this->saleSummaryData(
                    $sale,
                    $includeProfit,
                ),
            )
            ->values();

        return response()->json([
            'data' => $data,

            'summary' => [
                'total_sales' =>
                (int) (
                    $summaryRecord
                    ?->total_sales
                    ?? 0
                ),

                'total_revenue' =>
                (float) (
                    $summaryRecord
                    ?->total_revenue
                    ?? 0
                ),

                'total_discount' =>
                (float) (
                    $summaryRecord
                    ?->total_discount
                    ?? 0
                ),

                'total_items' =>
                $totalItems,

                'gross_profit' =>
                $includeProfit
                    ? (float) (
                        $summaryRecord
                        ?->gross_profit
                        ?? 0
                    )
                    : null,

                'net_profit' =>
                $includeProfit
                    ? (float) (
                        $summaryRecord
                        ?->net_profit
                        ?? 0
                    )
                    : null,
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
        StoreSaleRequest $request,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validated =
            $request->validated();

        $sale = DB::transaction(
            function () use (
                $validated,
                $user,
            ): Sale {
                $requestedItems =
                    collect(
                        $validated['items'],
                    );

                $batchIds =
                    $requestedItems
                    ->pluck(
                        'stock_batch_id',
                    )
                    ->map(
                        fn(
                            mixed $id,
                        ): int => (int) $id,
                    )
                    ->values();

                $batches =
                    StockBatch::query()
                    ->with([
                        'product:id,name,unit',
                    ])
                    ->whereIn(
                        'id',
                        $batchIds,
                    )
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                if (
                    $batches->count()
                    !== $batchIds->count()
                ) {
                    throw ValidationException::withMessages([
                            'items' => [
                                'One or more selected stock batches are unavailable.',
                            ],
                        ]);
                }

                $computedItems = [];

                $subtotal = 0.0;

                $itemDiscountTotal =
                    0.0;

                $grossProfit = 0.0;

                foreach (
                    $requestedItems
                    as $index => $requestedItem
                ) {
                    $batchId = (int) (
                        $requestedItem['stock_batch_id']
                    );

                    $batch =
                        $batches->get(
                            $batchId,
                        );

                    if (! $batch) {
                        throw ValidationException::withMessages([
                                "items.{$index}.stock_batch_id" => [
                                    'The selected stock batch is unavailable.',
                                ],
                            ]);
                    }

                    if (
                        $batch->expiry_date
                        && $batch
                        ->expiry_date
                        ->isBefore(
                            today(),
                        )
                    ) {
                        throw ValidationException::withMessages([
                                "items.{$index}.stock_batch_id" => [
                                    "{$batch->product->name} cannot be sold because the selected batch has expired.",
                                ],
                            ]);
                    }

                    $quantity = round(
                        (float) $requestedItem['quantity'],
                        3,
                    );

                    $availableQuantity =
                        round(
                            (float) $batch
                                ->available_quantity,
                            3,
                        );

                    if (
                        $quantity
                        > $availableQuantity
                    ) {
                        throw ValidationException::withMessages([
                                "items.{$index}.quantity" => [
                                    "Only {$availableQuantity} {$batch->product->unit} are available at this price.",
                                ],
                            ]);
                    }

                    $sellingPrice = round(
                        (float) $batch
                            ->selling_price,
                        2,
                    );

                    $purchaseCost = round(
                        (float) $batch
                            ->purchase_cost,
                        2,
                    );

                    $itemDiscount = round(
                        (float) (
                            $requestedItem['discount'] ?? 0
                        ),
                        2,
                    );

                    $lineSubtotal = round(
                        $quantity
                            * $sellingPrice,
                        2,
                    );

                    if (
                        $itemDiscount
                        > $lineSubtotal
                    ) {
                        throw ValidationException::withMessages([
                                "items.{$index}.discount" => [
                                    'The item discount cannot exceed the item total.',
                                ],
                            ]);
                    }

                    $lineTotal = round(
                        $lineSubtotal
                            - $itemDiscount,
                        2,
                    );

                    $lineCost = round(
                        $quantity
                            * $purchaseCost,
                        2,
                    );

                    $lineGrossProfit =
                        round(
                            $lineTotal
                                - $lineCost,
                            2,
                        );

                    $subtotal +=
                        $lineSubtotal;

                    $itemDiscountTotal +=
                        $itemDiscount;

                    $grossProfit +=
                        $lineGrossProfit;

                    $computedItems[] = [
                        'batch' => $batch,

                        'quantity' =>
                        $quantity,

                        'purchase_cost' =>
                        $purchaseCost,

                        'selling_price' =>
                        $sellingPrice,

                        'discount' =>
                        $itemDiscount,

                        'line_total' =>
                        $lineTotal,

                        'gross_profit' =>
                        $lineGrossProfit,
                    ];
                }

                $subtotal =
                    round($subtotal, 2);

                $itemDiscountTotal =
                    round(
                        $itemDiscountTotal,
                        2,
                    );

                $saleDiscount = round(
                    (float) $validated['discount'],
                    2,
                );

                $maximumSaleDiscount =
                    round(
                        $subtotal
                            - $itemDiscountTotal,
                        2,
                    );

                if (
                    $saleDiscount
                    > $maximumSaleDiscount
                ) {
                    throw ValidationException::withMessages([
                            'discount' => [
                                'The sale discount cannot exceed the cart total.',
                            ],
                        ]);
                }

                $grandTotal = round(
                    $subtotal
                        - $itemDiscountTotal
                        - $saleDiscount,
                    2,
                );

                $paymentMethod =
                    $validated['payment_method'];

                $amountReceived = round(
                    (float) $validated['amount_received'],
                    2,
                );

                if (
                    $paymentMethod
                    === SalePayment::METHOD_CASH
                    && $amountReceived
                    < $grandTotal
                ) {
                    throw ValidationException::withMessages([
                            'amount_received' => [
                                'The received cash amount is less than the sale total.',
                            ],
                        ]);
                }

                if (
                    $paymentMethod
                    !== SalePayment::METHOD_CASH
                    && abs(
                        $amountReceived
                            - $grandTotal,
                    ) > 0.01
                ) {
                    throw ValidationException::withMessages([
                            'amount_received' => [
                                'Card and bank-transfer payments must equal the sale total.',
                            ],
                        ]);
                }

                $changeAmount =
                    $paymentMethod
                    === SalePayment::METHOD_CASH
                    ? round(
                        max(
                            0,
                            $amountReceived
                                - $grandTotal,
                        ),
                        2,
                    )
                    : 0;

                $netProfit = round(
                    $grossProfit
                        - $saleDiscount,
                    2,
                );

                $sale = Sale::query()
                    ->create([
                        'sale_date' => now(),

                        'subtotal' =>
                        $subtotal,

                        'item_discount_total' =>
                        $itemDiscountTotal,

                        'discount' =>
                        $saleDiscount,

                        'grand_total' =>
                        $grandTotal,

                        'paid_amount' =>
                        $grandTotal,

                        'change_amount' =>
                        $changeAmount,

                        'gross_profit' =>
                        round(
                            $grossProfit,
                            2,
                        ),

                        'net_profit' =>
                        $netProfit,

                        'payment_status' =>
                        Sale::PAYMENT_STATUS_PAID,

                        'notes' =>
                        $validated['notes']
                            ?? null,

                        'created_by' =>
                        $user->id,
                    ]);

                $sale->update([
                    'sale_number' =>
                    $this
                        ->generateSaleNumber(
                            $sale,
                        ),
                ]);

                foreach (
                    $computedItems
                    as $computedItem
                ) {
                    /** @var StockBatch $batch */
                    $batch =
                        $computedItem['batch'];

                    $quantityBefore =
                        round(
                            (float) $batch
                                ->available_quantity,
                            3,
                        );

                    $quantityAfter =
                        round(
                            $quantityBefore
                                - $computedItem['quantity'],
                            3,
                        );

                    SaleItem::query()
                        ->create([
                            'sale_id' =>
                            $sale->id,

                            'product_id' =>
                            $batch
                                ->product_id,

                            'stock_batch_id' =>
                            $batch->id,

                            'quantity' =>
                            $computedItem['quantity'],

                            'purchase_cost' =>
                            $computedItem['purchase_cost'],

                            'selling_price' =>
                            $computedItem['selling_price'],

                            'discount' =>
                            $computedItem['discount'],

                            'line_total' =>
                            $computedItem['line_total'],

                            'gross_profit' =>
                            $computedItem['gross_profit'],
                        ]);

                    $batch->update([
                        'available_quantity' =>
                        $quantityAfter,
                    ]);

                    StockMovement::query()
                        ->create([
                            'product_id' =>
                            $batch
                                ->product_id,

                            'stock_batch_id' =>
                            $batch->id,

                            'movement_type' =>
                            StockMovement::TYPE_SALE,

                            'quantity_before' =>
                            $quantityBefore,

                            'quantity_change' =>
                            -$computedItem['quantity'],

                            'quantity_after' =>
                            $quantityAfter,

                            'reference_type' =>
                            'sale',

                            'reference_id' =>
                            $sale->id,

                            'reference_number' =>
                            $sale
                                ->sale_number,

                            'notes' =>
                            'Stock sold through POS.',

                            'created_by' =>
                            $user->id,
                        ]);
                }

                SalePayment::query()
                    ->create([
                        'sale_id' =>
                        $sale->id,

                        'payment_method' =>
                        $paymentMethod,

                        'amount' =>
                        $grandTotal,

                        'reference_number' =>
                        $validated['reference_number'] ?? null,

                        'notes' =>
                        $validated['notes']
                            ?? null,

                        'created_by' =>
                        $user->id,
                    ]);

                return $sale;
            },
            3,
        );

        return response()->json([
            'message' =>
            'Sale completed successfully.',

            'data' =>
            $this->saleData(
                $this->loadSale(
                    $sale,
                ),
                $user->isAdmin(),
            ),
        ], 201);
    }

    public function show(
        Request $request,
        Sale $sale,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (
            $user->isCashier()
            && $sale->created_by
            !== $user->id
        ) {
            return response()->json([
                'message' =>
                'You are not allowed to view this sale.',
            ], 403);
        }

        return response()->json([
            'data' =>
            $this->saleData(
                $this->loadSale(
                    $sale,
                ),
                $user->isAdmin(),
            ),
        ]);
    }

    private function generateSaleNumber(
        Sale $sale,
    ): string {
        return sprintf(
            'SAL-%s-%06d',
            $sale
                ->sale_date
                ->format('Ymd'),
            $sale->id,
        );
    }

    private function loadSale(
        Sale $sale,
    ): Sale {
        return $sale->load([
            'createdBy:id,name,username',

            'payments' =>
            fn($query) =>
            $query
                ->select([
                    'id',
                    'sale_id',
                    'payment_method',
                    'amount',
                    'reference_number',
                    'notes',
                    'created_by',
                    'created_at',
                ])
                ->orderBy('id'),

            'items' =>
            fn($query) =>
            $query->orderBy('id'),

            'items.product:id,name,unit,sku,barcode',

            'items.stockBatch:id,batch_code,batch_number,expiry_date',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function saleSummaryData(
        Sale $sale,
        bool $includeProfit,
    ): array {
        $firstPayment =
            $sale->payments->first();

        $paymentMethods =
            $sale->payments
            ->pluck('payment_method')
            ->filter()
            ->unique()
            ->values();

        return [
            'id' => $sale->id,

            'sale_number' =>
            $sale->sale_number,

            'sale_date' =>
            $sale
                ->sale_date
                ->toISOString(),

            'subtotal' =>
            (float) $sale->subtotal,

            'item_discount_total' =>
            (float) $sale
                ->item_discount_total,

            'discount' =>
            (float) $sale->discount,

            'grand_total' =>
            (float) $sale
                ->grand_total,

            'paid_amount' =>
            (float) $sale
                ->paid_amount,

            'change_amount' =>
            (float) $sale
                ->change_amount,

            'gross_profit' =>
            $includeProfit
                ? (float) $sale
                    ->gross_profit
                : null,

            'net_profit' =>
            $includeProfit
                ? (float) $sale
                    ->net_profit
                : null,

            'payment_status' =>
            $sale->payment_status,

            'notes' => $sale->notes,

            'items_count' =>
            (int) (
                $sale->items_count
                ?? $sale
                ->items()
                ->count()
            ),

            'total_quantity' =>
            (float) (
                $sale
                ->total_quantity
                ?? $sale
                ->items()
                ->sum('quantity')
            ),

            'payment_method' =>
            $firstPayment
                ? $firstPayment
                ->payment_method
                : null,

            'payment_methods' =>
            $paymentMethods,

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

            'created_at' =>
            $sale
                ->created_at
                ?->toISOString(),

            'updated_at' =>
            $sale
                ->updated_at
                ?->toISOString(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function saleData(
        Sale $sale,
        bool $includeProfit,
    ): array {
        return [
            ...$this->saleSummaryData(
                $sale,
                $includeProfit,
            ),

            'items' =>
            $sale->items
                ->map(
                    fn(
                        SaleItem $item,
                    ): array => [
                        'id' => $item->id,

                        'product_id' =>
                        $item
                            ->product_id,

                        'stock_batch_id' =>
                        $item
                            ->stock_batch_id,

                        'quantity' =>
                        (float) $item
                            ->quantity,

                        'purchase_cost' =>
                        $includeProfit
                            ? (float) $item
                                ->purchase_cost
                            : null,

                        'selling_price' =>
                        (float) $item
                            ->selling_price,

                        'discount' =>
                        (float) $item
                            ->discount,

                        'line_total' =>
                        (float) $item
                            ->line_total,

                        'gross_profit' =>
                        $includeProfit
                            ? (float) $item
                                ->gross_profit
                            : null,

                        'product' => [
                            'id' =>
                            $item
                                ->product
                                ->id,

                            'name' =>
                            $item
                                ->product
                                ->name,

                            'unit' =>
                            $item
                                ->product
                                ->unit,

                            'sku' =>
                            $item
                                ->product
                                ->sku,

                            'barcode' =>
                            $item
                                ->product
                                ->barcode,
                        ],

                        'batch' => [
                            'id' =>
                            $item
                                ->stockBatch
                                ->id,

                            'batch_code' =>
                            $item
                                ->stockBatch
                                ->batch_code,

                            'batch_number' =>
                            $item
                                ->stockBatch
                                ->batch_number,

                            'expiry_date' =>
                            $item
                                ->stockBatch
                                ->expiry_date
                                ?->format(
                                    'Y-m-d',
                                ),
                        ],
                    ],
                )
                ->values(),

            'payments' =>
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

                        'amount' =>
                        (float) $payment
                            ->amount,

                        'reference_number' =>
                        $payment
                            ->reference_number,

                        'notes' =>
                        $payment->notes,

                        'created_at' =>
                        $payment
                            ->created_at
                            ?->toISOString(),
                    ],
                )
                ->values(),
        ];
    }
}
