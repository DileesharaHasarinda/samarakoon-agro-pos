<?php

namespace App\Http\Controllers\Api;

use App\Events\PosStockUpdated;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sale\StoreSaleRequest;
use App\Models\Customer;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SaleController extends Controller
{
    private const BUSINESS_TIME_ZONE = 'Asia/Colombo';

    public function index(
        Request $request,
    ): JsonResponse {
        $user = $request->user();

        if (!$user instanceof User) {
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

            'payment_method' => [
                'nullable',

                Rule::in([
                    SalePayment::METHOD_CASH,
                    SalePayment::METHOD_CARD,
                    SalePayment::METHOD_BANK_TRANSFER,
                ]),
            ],

            'payment_status' => [
                'nullable',

                Rule::in([
                    Sale::PAYMENT_STATUS_PAID,
                    Sale::PAYMENT_STATUS_PARTIAL,
                    Sale::PAYMENT_STATUS_DUE,
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

        $paymentStatus =
            $validated['payment_status']
            ?? null;

        $dateFrom =
            $validated['date_from']
            ?? null;

        $dateTo =
            $validated['date_to']
            ?? null;

        $dateFromUtc =
            $dateFrom !== null
            ? Carbon::parse(
                $dateFrom,
                self::BUSINESS_TIME_ZONE,
            )
            ->startOfDay()
            ->utc()
            ->toDateTimeString()
            : null;

        $dateToUtc =
            $dateTo !== null
            ? Carbon::parse(
                $dateTo,
                self::BUSINESS_TIME_ZONE,
            )
            ->endOfDay()
            ->utc()
            ->toDateTimeString()
            : null;

        $perPage = (int) (
            $validated['per_page']
            ?? 20
        );

        $query = Sale::query();

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
                                )
                                ->orWhereHas(
                                    'createdBy',
                                    fn(
                                        Builder $userQuery,
                                    ) => $userQuery
                                        ->where(
                                            'name',
                                            'like',
                                            "%{$search}%",
                                        )
                                        ->orWhere(
                                            'username',
                                            'like',
                                            "%{$search}%",
                                        ),
                                )
                                ->orWhereHas(
                                    'items.product',
                                    fn(
                                        Builder $productQuery,
                                    ) => $productQuery
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
                                        ),
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
                $paymentStatus !== null,
                fn(
                    Builder $saleQuery,
                ) => $saleQuery->where(
                    'payment_status',
                    $paymentStatus,
                ),
            )
            ->when(
                $dateFromUtc !== null,
                fn(
                    Builder $saleQuery,
                ) => $saleQuery->where(
                    'sale_date',
                    '>=',
                    $dateFromUtc,
                ),
            )
            ->when(
                $dateToUtc !== null,
                fn(
                    Builder $saleQuery,
                ) => $saleQuery->where(
                    'sale_date',
                    '<=',
                    $dateToUtc,
                ),
            );

        $summaryRecord =
            (clone $query)
            ->selectRaw(
                '
                        COUNT(*) AS total_sales,
                        COALESCE(SUM(grand_total), 0)
                            AS total_revenue,
                        COALESCE(SUM(due_amount), 0)
                            AS outstanding_due,
                        COALESCE(
                            SUM(
                                item_discount_total
                                + discount
                            ),
                            0
                        ) AS total_discount,
                        COALESCE(SUM(gross_profit), 0)
                            AS gross_profit,
                        COALESCE(SUM(net_profit), 0)
                            AS net_profit
                    ',
            )
            ->first();

        $filteredSaleIds =
            (clone $query)
            ->select('sales.id');

        $totalItems =
            (float) SaleItem::query()
                ->whereIn(
                    'sale_id',
                    $filteredSaleIds,
                )
                ->sum('quantity');

        $sales = $query
            ->with([
                'customer:id,customer_code,name,mobile',

                'createdBy:id,name,username',

                'payments' =>
                fn($paymentQuery) =>
                $paymentQuery
                    ->select([
                        'id',
                        'sale_id',
                        'payment_method',
                        'payment_type',
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

        return response()->json([
            'data' =>
            collect(
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
                ->values(),

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

                'outstanding_due' =>
                (float) (
                    $summaryRecord
                    ?->outstanding_due
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

        if (!$user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        $validated =
            $request->validated();

        $sale = DB::transaction(
            function () use (
                $validated,
                $user,
            ): Sale {
                $customer = null;

                if (
                    !empty($validated['customer_id'])
                ) {
                    $customer =
                        Customer::query()
                        ->whereKey(
                            $validated['customer_id'],
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                    if (
                        !$customer->is_active
                    ) {
                        throw ValidationException::withMessages([
                            'customer_id' => [
                                'The selected customer is inactive.',
                            ],
                        ]);
                    }
                }

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
                        ): int =>
                        (int) $id,
                    )
                    ->unique()
                    ->sort()
                    ->values();

                $batches =
                    StockBatch::query()
                    ->with([
                        'product:id,name,unit',
                    ])
                    ->whereIn(
                        'id',
                        $batchIds->all(),
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

                $requiredStockByBatch = [];

                $subtotal = 0.0;

                $itemDiscountTotal = 0.0;

                $grossProfit = 0.0;

                foreach (
                    $requestedItems
                    as $index => $requestedItem
                ) {
                    $batchId =
                        (int) $requestedItem['stock_batch_id'];

                    $batch =
                        $batches->get(
                            $batchId,
                        );

                    if (
                        !$batch instanceof StockBatch
                    ) {
                        throw ValidationException::withMessages([
                            "items.{$index}.stock_batch_id" => [
                                'The selected stock batch is unavailable.',
                            ],
                        ]);
                    }

                    if (!$batch->product) {
                        throw ValidationException::withMessages([
                            "items.{$index}.stock_batch_id" => [
                                'The selected product could not be loaded.',
                            ],
                        ]);
                    }

                    if ($batch->isExpired()) {
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

                    if ($quantity <= 0) {
                        throw ValidationException::withMessages([
                            "items.{$index}.quantity" => [
                                'Quantity must be greater than zero.',
                            ],
                        ]);
                    }

                    $requestedSaleUnit =
                        trim(
                            (string) (
                                $requestedItem['sale_unit']
                                ?? ''
                            ),
                        );

                    if (
                        $requestedSaleUnit === ''
                    ) {
                        $requestedSaleUnit =
                            $batch
                            ->primaryUnitValue();
                    }

                    if (
                        $batch->usesDualUnit()
                    ) {
                        if (
                            !$batch->isPrimarySaleUnit(
                                $requestedSaleUnit,
                            )
                            && !$batch->isSecondarySaleUnit(
                                $requestedSaleUnit,
                            )
                        ) {
                            throw ValidationException::withMessages([
                                "items.{$index}.sale_unit" => [
                                    "Select either {$batch->primaryUnitValue()} or {$batch->secondaryUnitValue()} for {$batch->product->name}.",
                                ],
                            ]);
                        }

                        if (
                            $batch->isPrimarySaleUnit(
                                $requestedSaleUnit,
                            )
                            && !$this->isWholeNumber(
                                $quantity,
                            )
                        ) {
                            throw ValidationException::withMessages([
                                "items.{$index}.quantity" => [
                                    "Full {$batch->primaryUnitValue()} quantity must be a whole number.",
                                ],
                            ]);
                        }

                        $saleUnit =
                            $batch->isPrimarySaleUnit(
                                $requestedSaleUnit,
                            )
                            ? $batch
                            ->primaryUnitValue()
                            : (
                                $batch
                                ->secondaryUnitValue()
                                ?? 'Kg'
                            );
                    } else {
                        $saleUnit =
                            $batch
                            ->primaryUnitValue();
                    }

                    $stockQuantity =
                        $batch
                        ->stockQuantityForSale(
                            $quantity,
                            $saleUnit,
                        );

                    if (
                        $stockQuantity <= 0
                    ) {
                        throw ValidationException::withMessages([
                            "items.{$index}.quantity" => [
                                'The calculated stock quantity is invalid.',
                            ],
                        ]);
                    }

                    $sellingPrice =
                        $batch
                        ->sellingPriceForUnit(
                            $saleUnit,
                        );

                    if (
                        $sellingPrice === null
                        || $sellingPrice < 0
                    ) {
                        throw ValidationException::withMessages([
                            "items.{$index}.sale_unit" => [
                                "A selling price is not configured for {$saleUnit}.",
                            ],
                        ]);
                    }

                    if (
                        $batch->usesDualUnit()
                        && $batch->isSecondarySaleUnit(
                            $saleUnit,
                        )
                    ) {
                        $purchaseCost =
                            round(
                                $batch
                                    ->baseUnitCostValue(),
                                2,
                            );

                        $conversionFactor =
                            1.0;
                    } elseif (
                        $batch->usesDualUnit()
                    ) {
                        $purchaseCost =
                            round(
                                (float) (
                                    $batch
                                    ->purchase_cost
                                    ?? 0
                                ),
                                2,
                            );

                        $conversionFactor =
                            $batch
                            ->conversionFactorValue();
                    } else {
                        $purchaseCost =
                            round(
                                (float) (
                                    $batch
                                    ->purchase_cost
                                    ?? 0
                                ),
                                2,
                            );

                        $conversionFactor =
                            1.0;
                    }

                    $itemDiscount =
                        round(
                            (float) (
                                $requestedItem['discount']
                                ?? 0
                            ),
                            2,
                        );

                    if ($itemDiscount < 0) {
                        throw ValidationException::withMessages([
                            "items.{$index}.discount" => [
                                'The item discount cannot be negative.',
                            ],
                        ]);
                    }

                    $lineSubtotal =
                        round(
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

                    $lineTotal =
                        round(
                            $lineSubtotal
                                - $itemDiscount,
                            2,
                        );

                    $lineCost =
                        round(
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

                    $subtotal =
                        round(
                            $subtotal
                                + $lineSubtotal,
                            2,
                        );

                    $itemDiscountTotal =
                        round(
                            $itemDiscountTotal
                                + $itemDiscount,
                            2,
                        );

                    $grossProfit =
                        round(
                            $grossProfit
                                + $lineGrossProfit,
                            2,
                        );

                    $requiredStockByBatch[$batchId] =
                        round(
                            (
                                $requiredStockByBatch[$batchId]
                                ?? 0
                            )
                                + $stockQuantity,
                            3,
                        );

                    $computedItems[] = [
                        'batch' =>
                        $batch,

                        'quantity' =>
                        $quantity,

                        'sale_unit' =>
                        $saleUnit,

                        'conversion_factor' =>
                        $conversionFactor,

                        'stock_quantity' =>
                        $stockQuantity,

                        'purchase_cost' =>
                        $purchaseCost,

                        'selling_price' =>
                        round(
                            $sellingPrice,
                            2,
                        ),

                        'discount' =>
                        $itemDiscount,

                        'line_total' =>
                        $lineTotal,

                        'gross_profit' =>
                        $lineGrossProfit,
                    ];
                }

                foreach (
                    $requiredStockByBatch
                    as $batchId => $requiredStock
                ) {
                    $batch =
                        $batches->get(
                            (int) $batchId,
                        );

                    if (
                        !$batch instanceof StockBatch
                    ) {
                        throw ValidationException::withMessages([
                            'items' => [
                                'A selected stock batch is no longer available.',
                            ],
                        ]);
                    }

                    $availableQuantity =
                        round(
                            (float) $batch
                                ->available_quantity,
                            3,
                        );

                    if (
                        $requiredStock
                        > $availableQuantity
                        + 0.0001
                    ) {
                        $stockUnit =
                            $batch
                            ->stockUnitValue();

                        throw ValidationException::withMessages([
                            'items' => [
                                "{$batch->product->name} only has {$this->formatQuantity($availableQuantity)} {$stockUnit} available, but this sale requires {$this->formatQuantity($requiredStock)} {$stockUnit}.",
                            ],
                        ]);
                    }
                }

                $subtotal =
                    round(
                        $subtotal,
                        2,
                    );

                $itemDiscountTotal =
                    round(
                        $itemDiscountTotal,
                        2,
                    );

                $saleDiscount =
                    round(
                        (float) (
                            $validated['discount']
                            ?? 0
                        ),
                        2,
                    );

                if ($saleDiscount < 0) {
                    throw ValidationException::withMessages([
                        'discount' => [
                            'The sale discount cannot be negative.',
                        ],
                    ]);
                }

                $maximumDiscount =
                    round(
                        $subtotal
                            - $itemDiscountTotal,
                        2,
                    );

                if (
                    $saleDiscount
                    > $maximumDiscount
                ) {
                    throw ValidationException::withMessages([
                        'discount' => [
                            'The sale discount cannot exceed the cart total.',
                        ],
                    ]);
                }

                $grandTotal =
                    round(
                        $subtotal
                            - $itemDiscountTotal
                            - $saleDiscount,
                        2,
                    );

                $settlementType =
                    $validated['settlement_type'];

                $paymentMethod =
                    $validated['payment_method']
                    ?? null;

                $amountReceived =
                    round(
                        (float) (
                            $validated['amount_received']
                            ?? 0
                        ),
                        2,
                    );

                $paidAmount = 0.0;

                $dueAmount = 0.0;

                $changeAmount = 0.0;

                $paymentStatus =
                    Sale::PAYMENT_STATUS_PAID;

                if (
                    $settlementType
                    === Sale::SETTLEMENT_FULL
                ) {
                    if (!$paymentMethod) {
                        throw ValidationException::withMessages([
                            'payment_method' => [
                                'Please select a payment method.',
                            ],
                        ]);
                    }

                    if (
                        $paymentMethod
                        === SalePayment::METHOD_CASH
                    ) {
                        if (
                            $amountReceived
                            < $grandTotal
                        ) {
                            throw ValidationException::withMessages([
                                'amount_received' => [
                                    'The received cash amount is less than the sale total.',
                                ],
                            ]);
                        }

                        $changeAmount =
                            round(
                                $amountReceived
                                    - $grandTotal,
                                2,
                            );
                    } elseif (
                        abs(
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

                    $paidAmount =
                        $grandTotal;
                } elseif (
                    $settlementType
                    === Sale::SETTLEMENT_PARTIAL
                ) {
                    if (!$customer) {
                        throw ValidationException::withMessages([
                            'customer_id' => [
                                'A customer is required for a partial payment sale.',
                            ],
                        ]);
                    }

                    if (
                        !$paymentMethod
                        || $amountReceived <= 0
                        || $amountReceived
                        >= $grandTotal
                    ) {
                        throw ValidationException::withMessages([
                            'amount_received' => [
                                'The partial payment must be greater than zero and less than the sale total.',
                            ],
                        ]);
                    }

                    $paidAmount =
                        $amountReceived;

                    $dueAmount =
                        round(
                            $grandTotal
                                - $paidAmount,
                            2,
                        );

                    $paymentStatus =
                        Sale::PAYMENT_STATUS_PARTIAL;
                } else {
                    if (!$customer) {
                        throw ValidationException::withMessages([
                            'customer_id' => [
                                'A customer is required for a due sale.',
                            ],
                        ]);
                    }

                    if (
                        $amountReceived > 0
                    ) {
                        throw ValidationException::withMessages([
                            'amount_received' => [
                                'Use partial payment when an initial amount is received.',
                            ],
                        ]);
                    }

                    $paidAmount = 0.0;

                    $dueAmount =
                        $grandTotal;

                    $paymentStatus =
                        Sale::PAYMENT_STATUS_DUE;
                }

                if (
                    $customer
                    && $dueAmount > 0
                    && (float) $customer
                        ->credit_limit > 0
                ) {
                    $existingDue =
                        (float) Sale::query()
                            ->where(
                                'customer_id',
                                $customer->id,
                            )
                            ->sum(
                                'due_amount',
                            );

                    if (
                        $existingDue
                        + $dueAmount
                        > (float) $customer
                            ->credit_limit
                    ) {
                        throw ValidationException::withMessages([
                            'customer_id' => [
                                'This sale would exceed the customer credit limit.',
                            ],
                        ]);
                    }
                }

                $netProfit =
                    round(
                        $grossProfit
                            - $saleDiscount,
                        2,
                    );

                $sale =
                    Sale::query()
                    ->create([
                        'customer_id' =>
                        $customer?->id,

                        'sale_date' =>
                        now(),

                        'subtotal' =>
                        $subtotal,

                        'item_discount_total' =>
                        $itemDiscountTotal,

                        'discount' =>
                        $saleDiscount,

                        'grand_total' =>
                        $grandTotal,

                        'paid_amount' =>
                        $paidAmount,

                        'due_amount' =>
                        $dueAmount,

                        'due_date' =>
                        $dueAmount > 0
                            ? (
                                $validated['due_date']
                                ?? null
                            )
                            : null,

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
                        $paymentStatus,

                        'settlement_type' =>
                        $settlementType,

                        'notes' =>
                        $validated['notes']
                            ?? null,

                        'created_by' =>
                        $user->id,
                    ]);

                $saleDate =
                    $sale
                    ->sale_date
                    ->copy();

                $sale->update([
                    'sale_number' =>
                    sprintf(
                        'SAL-%s-%06d',
                        $saleDate
                            ->copy()
                            ->setTimezone(
                                self::BUSINESS_TIME_ZONE,
                            )
                            ->format(
                                'Ymd',
                            ),
                        $sale->id,
                    ),

                    /*
                     * Keep sale_date explicit while updating sale_number.
                     * This is defensive for installations that still have
                     * the old MySQL ON UPDATE CURRENT_TIMESTAMP definition
                     * until the corrective migration has been applied.
                     */
                    'sale_date' =>
                    $saleDate,
                ]);

                foreach (
                    $computedItems
                    as $computedItem
                ) {
                    $batch =
                        $computedItem['batch'];

                    if (
                        !$batch
                            instanceof StockBatch
                    ) {
                        continue;
                    }

                    $quantityBefore =
                        round(
                            (float) $batch
                                ->available_quantity,
                            3,
                        );

                    $stockQuantity =
                        round(
                            (float) $computedItem['stock_quantity'],
                            3,
                        );

                    $quantityAfter =
                        round(
                            $quantityBefore
                                - $stockQuantity,
                            3,
                        );

                    if (
                        $quantityAfter < -0.0001
                    ) {
                        throw ValidationException::withMessages([
                            'items' => [
                                "{$batch->product->name} no longer has enough stock.",
                            ],
                        ]);
                    }

                    $quantityAfter =
                        max(
                            0,
                            $quantityAfter,
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

                            'returned_quantity' =>
                            0,

                            'sale_unit' =>
                            $computedItem['sale_unit'],

                            'conversion_factor' =>
                            $computedItem['conversion_factor'],

                            'stock_quantity' =>
                            $stockQuantity,

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

                    $batch->setAttribute(
                        'available_quantity',
                        $quantityAfter,
                    );

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
                            -$stockQuantity,

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
                            sprintf(
                                'POS sale: %s %s. Stock reduced by %s %s.',
                                $this->formatQuantity(
                                    (float) $computedItem['quantity'],
                                ),
                                $computedItem['sale_unit'],
                                $this->formatQuantity(
                                    $stockQuantity,
                                ),
                                $batch
                                    ->stockUnitValue(),
                            ),

                            'created_by' =>
                            $user->id,
                        ]);
                }

                if (
                    $paidAmount > 0
                ) {
                    SalePayment::query()
                        ->create([
                            'sale_id' =>
                            $sale->id,

                            'payment_method' =>
                            $paymentMethod,

                            'payment_type' =>
                            SalePayment::TYPE_INITIAL,

                            'amount' =>
                            $paidAmount,

                            'reference_number' =>
                            $validated['reference_number']
                                ?? null,

                            'notes' =>
                            $validated['notes']
                                ?? null,

                            'created_by' =>
                            $user->id,
                        ]);
                }

                return $sale;
            },
            3,
        );

        /*
         * The database transaction has successfully committed at this point.
         * Load the final persisted stock quantities before broadcasting them
         * to the other POS machines.
         */
        $loadedSale =
            $this->loadSale(
                $sale,
            );

        $this->broadcastPosStockUpdate(
            $loadedSale,
        );

        return response()->json([
            'message' =>
            'Sale completed successfully.',

            'data' =>
            $this->saleData(
                $loadedSale,
                $user->isAdmin(),
            ),
        ], 201);
    }

    public function show(
        Request $request,
        Sale $sale,
    ): JsonResponse {
        $user = $request->user();

        if (!$user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
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

    /**
     * Broadcast the final committed stock quantities for every batch touched
     * by this sale. A Reverb failure must never turn an already-committed
     * sale into a false HTTP failure, because the cashier could otherwise
     * retry and accidentally create a duplicate sale.
     */
    private function broadcastPosStockUpdate(
        Sale $sale,
    ): void {
        $batches =
            $sale
            ->items
            ->map(
                fn(
                    SaleItem $item,
                ): ?StockBatch =>
                $item->stockBatch,
            )
            ->filter(
                fn(
                    mixed $batch,
                ): bool =>
                $batch instanceof StockBatch,
            )
            ->unique(
                fn(
                    StockBatch $batch,
                ): int =>
                (int) $batch->id,
            )
            ->map(
                fn(
                    StockBatch $batch,
                ): array => [
                    'id' =>
                    (int) $batch->id,

                    'product_id' =>
                    (int) $batch
                        ->product_id,

                    /*
                         * Product variants are not currently used by the
                         * Samarakoon Agro POS stock-batch sale flow. Keep
                         * this field in the event contract for forward
                         * compatibility with realtimeStock.ts.
                         */
                    'product_variant_id' =>
                    null,

                    'available_quantity' =>
                    round(
                        (float) $batch
                            ->available_quantity,
                        3,
                    ),

                    'updated_at' =>
                    $batch
                        ->updated_at
                        ?->toISOString(),
                ],
            )
            ->values()
            ->all();

        if ($batches === []) {
            return;
        }

        try {
            PosStockUpdated::dispatch(
                (int) $sale->id,
                (string) $sale
                    ->sale_number,
                $batches,
            );
        } catch (\Throwable $exception) {
            Log::warning(
                'Sale committed successfully, but realtime POS stock broadcasting failed.',
                [
                    'sale_id' =>
                    (int) $sale->id,

                    'sale_number' =>
                    (string) $sale
                        ->sale_number,

                    'exception' =>
                    $exception::class,

                    'message' =>
                    $exception
                        ->getMessage(),
                ],
            );
        }
    }

    private function loadSale(
        Sale $sale,
    ): Sale {
        return $sale->load([
            'customer:id,customer_code,name,mobile,secondary_mobile,email,address',

            'createdBy:id,name,username',

            'payments' =>
            fn($query) =>
            $query
                ->with(
                    'createdBy:id,name,username',
                )
                ->orderBy('id'),

            'items' =>
            fn($query) =>
            $query
                ->orderBy('id'),

            'items.product:id,name,unit,sku,barcode',

            'items.stockBatch:id,product_id,purchase_item_id,batch_code,batch_number,purchase_cost,selling_price,is_dual_unit,stock_unit,secondary_unit,conversion_factor,secondary_selling_price,base_unit_cost,received_quantity,available_quantity,manufactured_date,expiry_date,received_at',
        ]);
    }

    private function saleSummaryData(
        Sale $sale,
        bool $includeProfit,
    ): array {
        $firstPayment =
            $sale->payments->first();

        return [
            'id' =>
            $sale->id,

            'sale_number' =>
            $sale
                ->sale_number,

            'sale_date' =>
            $sale
                ->sale_date
                ->toISOString(),

            'subtotal' =>
            (float) $sale
                ->subtotal,

            'item_discount_total' =>
            (float) $sale
                ->item_discount_total,

            'discount' =>
            (float) $sale
                ->discount,

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
                ?->format(
                    'Y-m-d',
                ),

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
            $sale
                ->payment_status,

            'settlement_type' =>
            $sale
                ->settlement_type,

            'payment_method' =>
            $firstPayment
                ? $firstPayment
                ->payment_method
                : null,

            'customer' =>
            $sale->customer
                ? [
                    'id' =>
                    $sale
                        ->customer
                        ->id,

                    'customer_code' =>
                    $sale
                        ->customer
                        ->customer_code,

                    'name' =>
                    $sale
                        ->customer
                        ->name,

                    'mobile' =>
                    $sale
                        ->customer
                        ->mobile,
                ]
                : null,

            'notes' =>
            $sale->notes,

            'items_count' =>
            (int) (
                $sale->items_count
                ?? $sale
                ->items()
                ->count()
            ),

            'total_quantity' =>
            (float) (
                $sale->total_quantity
                ?? $sale
                ->items()
                ->sum(
                    'quantity',
                )
            ),

            'created_by' =>
            $sale->createdBy
                ? [
                    'id' =>
                    $sale
                        ->createdBy
                        ->id,

                    'name' =>
                    $sale
                        ->createdBy
                        ->name,

                    'username' =>
                    $sale
                        ->createdBy
                        ->username,
                ]
                : null,

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
            $sale
                ->items
                ->map(
                    fn(
                        SaleItem $item,
                    ): array => [
                        'id' =>
                        $item->id,

                        'product_id' =>
                        $item
                            ->product_id,

                        'stock_batch_id' =>
                        $item
                            ->stock_batch_id,

                        'quantity' =>
                        (float) $item
                            ->quantity,

                        'returned_quantity' =>
                        (float) (
                            $item
                            ->returned_quantity
                            ?? 0
                        ),

                        'remaining_returnable_quantity' =>
                        $item
                            ->remainingReturnableQuantity(),

                        'sale_unit' =>
                        $item
                            ->saleUnitValue(),

                        'conversion_factor' =>
                        $item
                            ->conversionFactorValue(),

                        'stock_quantity' =>
                        $item
                            ->stockQuantityValue(),

                        'returned_stock_quantity' =>
                        $item
                            ->returnedStockQuantity(),

                        'remaining_returnable_stock_quantity' =>
                        $item
                            ->remainingReturnableStockQuantity(),

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

                        'product' =>
                        $item->product
                            ? [
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
                            ]
                            : null,

                        'batch' =>
                        $item->stockBatch
                            ? [
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

                                'is_dual_unit' =>
                                (bool) $item
                                    ->stockBatch
                                    ->is_dual_unit,

                                'stock_unit' =>
                                $item
                                    ->stockBatch
                                    ->stock_unit,

                                'secondary_unit' =>
                                $item
                                    ->stockBatch
                                    ->secondary_unit,

                                'conversion_factor' =>
                                (float) (
                                    $item
                                    ->stockBatch
                                    ->conversion_factor
                                    ?? 1
                                ),

                                'primary_selling_price' =>
                                (float) $item
                                    ->stockBatch
                                    ->selling_price,

                                'secondary_selling_price' =>
                                $item
                                    ->stockBatch
                                    ->secondary_selling_price
                                    !== null
                                    ? (float) $item
                                        ->stockBatch
                                        ->secondary_selling_price
                                    : null,

                                'available_quantity' =>
                                (float) $item
                                    ->stockBatch
                                    ->available_quantity,

                                'expiry_date' =>
                                $item
                                    ->stockBatch
                                    ->expiry_date
                                    ?->format(
                                        'Y-m-d',
                                    ),
                            ]
                            : null,
                    ],
                )
                ->values(),

            'payments' =>
            $sale
                ->payments
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
                        $payment
                            ->notes,

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
                ->values(),
        ];
    }

    private function isWholeNumber(
        float $value,
    ): bool {
        return abs(
            $value
                - round($value),
        ) < 0.0001;
    }

    private function formatQuantity(
        float $quantity,
    ): string {
        return rtrim(
            rtrim(
                number_format(
                    $quantity,
                    3,
                    '.',
                    '',
                ),
                '0',
            ),
            '.',
        );
    }
}
