<?php

namespace App\Http\Controllers\Api;

use App\Events\PosStockUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\SalesReturn\StoreSalesReturnRequest;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SalesReturnController extends Controller
{
    public function index(
        Request $request,
    ): JsonResponse {
        $user = $request->user();

        if (!$user instanceof User) {
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

            'refund_method' => [
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

        $refundMethod =
            $validated['refund_method']
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

        $query =
            SaleReturn::query();

        $query
            ->when(
                $search !== '',
                function (
                    Builder $returnQuery,
                ) use ($search): void {
                    $returnQuery->where(
                        function (
                            Builder $searchQuery,
                        ) use ($search): void {
                            $searchQuery
                                ->where(
                                    'return_number',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'reason',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhereHas(
                                    'sale',
                                    fn(
                                        Builder $saleQuery,
                                    ) => $saleQuery->where(
                                        'sale_number',
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
                $refundMethod !== null,
                fn(
                    Builder $returnQuery,
                ) => $returnQuery->where(
                    'refund_method',
                    $refundMethod,
                ),
            )
            ->when(
                $dateFrom !== null,
                fn(
                    Builder $returnQuery,
                ) => $returnQuery->whereDate(
                    'return_date',
                    '>=',
                    $dateFrom,
                ),
            )
            ->when(
                $dateTo !== null,
                fn(
                    Builder $returnQuery,
                ) => $returnQuery->whereDate(
                    'return_date',
                    '<=',
                    $dateTo,
                ),
            );

        $summaryRecord =
            (clone $query)
            ->selectRaw(
                '
                        COUNT(*) AS total_returns,
                        COALESCE(
                            SUM(refund_amount),
                            0
                        ) AS total_refund,
                        COALESCE(
                            SUM(restocked_quantity),
                            0
                        ) AS total_restocked,
                        COALESCE(
                            SUM(profit_reversal),
                            0
                        ) AS profit_reversal
                    ',
            )
            ->first();

        $saleReturnModel =
            new SaleReturn();

        $qualifiedReturnId =
            $saleReturnModel
            ->qualifyColumn(
                $saleReturnModel
                    ->getKeyName(),
            );

        $returnIds =
            (clone $query)
            ->select(
                $qualifiedReturnId,
            );

        $totalReturnedQuantity =
            (float) SaleReturnItem::query()
                ->whereIn(
                    'sale_return_id',
                    $returnIds,
                )
                ->sum('quantity');

        $returns = $query
            ->with([
                'sale:id,sale_number,sale_date,created_by',

                'createdBy:id,name,username',
            ])
            ->withCount('items')
            ->withSum(
                'items as total_quantity',
                'quantity',
            )
            ->latest('return_date')
            ->latest('id')
            ->paginate($perPage);

        $includeProfit =
            $user->isAdmin();

        $data =
            collect(
                $returns->items(),
            )
            ->map(
                fn(
                    SaleReturn $salesReturn,
                ): array =>
                $this->returnSummaryData(
                    $salesReturn,
                    $includeProfit,
                ),
            )
            ->values();

        return response()->json([
            'data' => $data,

            'summary' => [
                'total_returns' =>
                (int) (
                    $summaryRecord
                    ?->total_returns
                    ?? 0
                ),

                'total_refund' =>
                (float) (
                    $summaryRecord
                    ?->total_refund
                    ?? 0
                ),

                'total_returned_quantity' =>
                $totalReturnedQuantity,

                'total_restocked_quantity' =>
                (float) (
                    $summaryRecord
                    ?->total_restocked
                    ?? 0
                ),

                'profit_reversal' =>
                $includeProfit
                    ? (float) (
                        $summaryRecord
                        ?->profit_reversal
                        ?? 0
                    )
                    : null,
            ],

            'meta' => [
                'current_page' =>
                $returns->currentPage(),

                'last_page' =>
                $returns->lastPage(),

                'per_page' =>
                $returns->perPage(),

                'total' =>
                $returns->total(),

                'from' =>
                $returns->firstItem(),

                'to' =>
                $returns->lastItem(),
            ],
        ]);
    }

    public function returnOptions(
        Request $request,
        Sale $sale,
    ): JsonResponse {
        $user = $request->user();

        if (!$user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $sale->load([
            'createdBy:id,name,username',

            'items' =>
            fn($query) =>
            $query->orderBy('id'),

            'items.product:id,name,unit,sku,barcode',

            'items.stockBatch:id,product_id,batch_code,batch_number,is_dual_unit,stock_unit,secondary_unit,conversion_factor,available_quantity,expiry_date',
        ]);

        $discountShares =
            $this->saleDiscountShares(
                $sale->items,
                (float) $sale->discount,
            );

        $items =
            $sale
            ->items
            ->map(
                function (
                    SaleItem $item,
                ) use (
                    $discountShares,
                ): array {
                    $soldQuantity =
                        $item
                        ->quantityValue();

                    $returnedQuantity =
                        $item
                        ->returnedQuantityValue();

                    $remainingQuantity =
                        $item
                        ->remainingReturnableQuantity();

                    $soldStockQuantity =
                        $item
                        ->stockQuantityValue();

                    $returnedStockQuantity =
                        $item
                        ->returnedStockQuantity();

                    $remainingStockQuantity =
                        $item
                        ->remainingReturnableStockQuantity();

                    $fullRefundableAmount =
                        round(
                            max(
                                0,
                                (float) $item
                                    ->line_total
                                    - (
                                        $discountShares[$item->id]
                                        ?? 0
                                    ),
                            ),
                            2,
                        );

                    $remainingRefund =
                        round(
                            max(
                                0,
                                $fullRefundableAmount
                                    - (float) $item
                                        ->returned_amount,
                            ),
                            2,
                        );

                    $saleUnit =
                        $item
                        ->saleUnitValue();

                    return [
                        'sale_item_id' =>
                        $item->id,

                        'sold_quantity' =>
                        $soldQuantity,

                        'returned_quantity' =>
                        $returnedQuantity,

                        'remaining_quantity' =>
                        $remainingQuantity,

                        'sale_unit' =>
                        $saleUnit,

                        'conversion_factor' =>
                        $item
                            ->conversionFactorValue(),

                        'sold_stock_quantity' =>
                        $soldStockQuantity,

                        'returned_stock_quantity' =>
                        $returnedStockQuantity,

                        'remaining_stock_quantity' =>
                        $remainingStockQuantity,

                        'remaining_refund_amount' =>
                        $remainingRefund,

                        'selling_price' =>
                        (float) $item
                            ->selling_price,

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
                    ];
                },
            )
            ->values();

        return response()->json([
            'data' => [
                'sale' => [
                    'id' =>
                    $sale->id,

                    'sale_number' =>
                    $sale
                        ->sale_number,

                    'sale_date' =>
                    $sale
                        ->sale_date
                        ->toISOString(),

                    'grand_total' =>
                    (float) $sale
                        ->grand_total,

                    'discount' =>
                    (float) $sale
                        ->discount,

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
                ],

                'items' =>
                $items,

                'has_returnable_items' =>
                $items->contains(
                    fn(
                        array $item,
                    ): bool =>
                    $item['remaining_quantity'] > 0,
                ),
            ],
        ]);
    }

    public function store(
        StoreSalesReturnRequest $request,
        Sale $sale,
    ): JsonResponse {
        $user = $request->user();

        if (!$user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validated =
            $request->validated();

        $salesReturn =
            DB::transaction(
                function () use (
                    $sale,
                    $validated,
                    $user,
                ): SaleReturn {
                    $lockedSale =
                        Sale::query()
                        ->whereKey(
                            $sale->id,
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                    $requestedItems =
                        collect(
                            $validated['items'],
                        );

                    $saleItemIds =
                        $requestedItems
                        ->pluck(
                            'sale_item_id',
                        )
                        ->map(
                            fn(
                                mixed $id,
                            ): int =>
                            (int) $id,
                        )
                        ->values();

                    if (
                        $saleItemIds
                        ->unique()
                        ->count()
                        !== $saleItemIds
                        ->count()
                    ) {
                        throw ValidationException::withMessages([
                            'items' => [
                                'The same sale item cannot be returned more than once in a single return.',
                            ],
                        ]);
                    }

                    $selectedSaleItems =
                        SaleItem::query()
                        ->with([
                            'product:id,name,unit',
                        ])
                        ->where(
                            'sale_id',
                            $lockedSale
                                ->id,
                        )
                        ->whereIn(
                            'id',
                            $saleItemIds
                                ->all(),
                        )
                        ->orderBy('id')
                        ->lockForUpdate()
                        ->get()
                        ->keyBy('id');

                    if (
                        $selectedSaleItems
                        ->count()
                        !== $saleItemIds
                        ->count()
                    ) {
                        throw ValidationException::withMessages([
                            'items' => [
                                'One or more selected items do not belong to this sale.',
                            ],
                        ]);
                    }

                    $allSaleItems =
                        SaleItem::query()
                        ->where(
                            'sale_id',
                            $lockedSale
                                ->id,
                        )
                        ->orderBy('id')
                        ->get([
                            'id',
                            'line_total',
                        ]);

                    $saleDiscountShares =
                        $this
                        ->saleDiscountShares(
                            $allSaleItems,
                            (float) $lockedSale
                                ->discount,
                        );

                    $salesReturn =
                        SaleReturn::query()
                        ->create([
                            'sale_id' =>
                            $lockedSale
                                ->id,

                            'return_date' =>
                            now(),

                            'refund_method' =>
                            $validated['refund_method'],

                            'refund_amount' =>
                            0,

                            'cost_value' =>
                            0,

                            'profit_reversal' =>
                            0,

                            'restocked_quantity' =>
                            0,

                            'reason' =>
                            $validated['reason'],

                            'notes' =>
                            $validated['notes']
                                ?? null,

                            'status' =>
                            SaleReturn::STATUS_COMPLETED,

                            'created_by' =>
                            $user->id,
                        ]);

                    $salesReturn->update([
                        'return_number' =>
                        $this
                            ->generateReturnNumber(
                                $salesReturn,
                            ),
                    ]);

                    $totalRefund = 0.0;

                    $totalCost = 0.0;

                    $totalProfitReversal =
                        0.0;

                    $totalRestockedStock =
                        0.0;

                    foreach (
                        $requestedItems
                        as $index => $requestedItem
                    ) {
                        $saleItemId =
                            (int) $requestedItem['sale_item_id'];

                        $saleItem =
                            $selectedSaleItems
                            ->get(
                                $saleItemId,
                            );

                        if (
                            !$saleItem
                                instanceof SaleItem
                        ) {
                            throw ValidationException::withMessages([
                                "items.{$index}.sale_item_id" => [
                                    'The selected sale item is unavailable.',
                                ],
                            ]);
                        }

                        $soldQuantity =
                            $saleItem
                            ->quantityValue();

                        $alreadyReturned =
                            $saleItem
                            ->returnedQuantityValue();

                        $remainingQuantity =
                            $saleItem
                            ->remainingReturnableQuantity();

                        $returnQuantity =
                            round(
                                (float) $requestedItem['quantity'],
                                3,
                            );

                        if (
                            $returnQuantity <= 0
                            || $returnQuantity
                            > $remainingQuantity
                            + 0.0001
                        ) {
                            throw ValidationException::withMessages([
                                "items.{$index}.quantity" => [
                                    "Only {$this->formatQuantity($remainingQuantity)} {$saleItem->saleUnitValue()} remain available for return.",
                                ],
                            ]);
                        }

                        if (
                            $saleItem
                            ->usesStockConversion()
                            && !$this
                                ->isWholeNumber(
                                    $returnQuantity,
                                )
                        ) {
                            throw ValidationException::withMessages([
                                "items.{$index}.quantity" => [
                                    "{$saleItem->saleUnitValue()} returns must use a whole-number quantity.",
                                ],
                            ]);
                        }

                        $returnUnit =
                            $saleItem
                            ->saleUnitValue();

                        $conversionFactor =
                            $saleItem
                            ->conversionFactorValue();

                        $stockReturnQuantity =
                            $saleItem
                            ->stockQuantityFor(
                                $returnQuantity,
                            );

                        if (
                            $stockReturnQuantity <= 0
                        ) {
                            throw ValidationException::withMessages([
                                "items.{$index}.quantity" => [
                                    'The calculated return stock quantity is invalid.',
                                ],
                            ]);
                        }

                        $saleDiscountShare =
                            (float) (
                                $saleDiscountShares[$saleItem->id]
                                ?? 0
                            );

                        $fullRefundableAmount =
                            round(
                                max(
                                    0,
                                    (float) $saleItem
                                        ->line_total
                                        - $saleDiscountShare,
                                ),
                                2,
                            );

                        $remainingRefundable =
                            round(
                                max(
                                    0,
                                    $fullRefundableAmount
                                        - (float) $saleItem
                                            ->returned_amount,
                                ),
                                2,
                            );

                        $isReturningAllRemaining =
                            abs(
                                $returnQuantity
                                    - $remainingQuantity,
                            ) < 0.0001;

                        if (
                            $isReturningAllRemaining
                        ) {
                            $refundAmount =
                                $remainingRefundable;
                        } else {
                            $refundAmount =
                                round(
                                    $fullRefundableAmount
                                        * (
                                            $returnQuantity
                                            / $soldQuantity
                                        ),
                                    2,
                                );

                            $refundAmount =
                                min(
                                    $refundAmount,
                                    $remainingRefundable,
                                );
                        }

                        $existingItemDiscount =
                            (float) SaleReturnItem::query()
                                ->where(
                                    'sale_item_id',
                                    $saleItem
                                        ->id,
                                )
                                ->sum(
                                    'item_discount_reversal',
                                );

                        $remainingItemDiscount =
                            round(
                                max(
                                    0,
                                    (float) $saleItem
                                        ->discount
                                        - $existingItemDiscount,
                                ),
                                2,
                            );

                        $itemDiscountReversal =
                            $isReturningAllRemaining
                            ? $remainingItemDiscount
                            : min(
                                round(
                                    (float) $saleItem
                                        ->discount
                                        * (
                                            $returnQuantity
                                            / $soldQuantity
                                        ),
                                    2,
                                ),
                                $remainingItemDiscount,
                            );

                        $existingSaleDiscount =
                            (float) SaleReturnItem::query()
                                ->where(
                                    'sale_item_id',
                                    $saleItem
                                        ->id,
                                )
                                ->sum(
                                    'sale_discount_reversal',
                                );

                        $remainingSaleDiscount =
                            round(
                                max(
                                    0,
                                    $saleDiscountShare
                                        - $existingSaleDiscount,
                                ),
                                2,
                            );

                        $saleDiscountReversal =
                            $isReturningAllRemaining
                            ? $remainingSaleDiscount
                            : min(
                                round(
                                    $saleDiscountShare
                                        * (
                                            $returnQuantity
                                            / $soldQuantity
                                        ),
                                    2,
                                ),
                                $remainingSaleDiscount,
                            );

                        $purchaseCost =
                            round(
                                (float) $saleItem
                                    ->purchase_cost,
                                2,
                            );

                        $sellingPrice =
                            round(
                                (float) $saleItem
                                    ->selling_price,
                                2,
                            );

                        $costValue =
                            round(
                                $purchaseCost
                                    * $returnQuantity,
                                2,
                            );

                        $profitReversal =
                            round(
                                $refundAmount
                                    - $costValue,
                                2,
                            );

                        $restock =
                            (bool) $requestedItem['restock'];

                        SaleReturnItem::query()
                            ->create([
                                'sale_return_id' =>
                                $salesReturn
                                    ->id,

                                'sale_item_id' =>
                                $saleItem
                                    ->id,

                                'product_id' =>
                                $saleItem
                                    ->product_id,

                                'stock_batch_id' =>
                                $saleItem
                                    ->stock_batch_id,

                                'quantity' =>
                                $returnQuantity,

                                'return_unit' =>
                                $returnUnit,

                                'conversion_factor' =>
                                $conversionFactor,

                                'stock_quantity' =>
                                $stockReturnQuantity,

                                'purchase_cost' =>
                                $purchaseCost,

                                'selling_price' =>
                                $sellingPrice,

                                'item_discount_reversal' =>
                                $itemDiscountReversal,

                                'sale_discount_reversal' =>
                                $saleDiscountReversal,

                                'refund_amount' =>
                                $refundAmount,

                                'cost_value' =>
                                $costValue,

                                'profit_reversal' =>
                                $profitReversal,

                                'restocked' =>
                                $restock,
                            ]);

                        $saleItem->update([
                            'returned_quantity' =>
                            round(
                                $alreadyReturned
                                    + $returnQuantity,
                                3,
                            ),

                            'returned_amount' =>
                            round(
                                (float) $saleItem
                                    ->returned_amount
                                    + $refundAmount,
                                2,
                            ),
                        ]);

                        if ($restock) {
                            $batch =
                                StockBatch::query()
                                ->whereKey(
                                    $saleItem
                                        ->stock_batch_id,
                                )
                                ->lockForUpdate()
                                ->firstOrFail();

                            if (
                                $batch->product_id
                                !== $saleItem
                                ->product_id
                            ) {
                                throw ValidationException::withMessages([
                                    'items' => [
                                        'The original stock batch does not match the returned product.',
                                    ],
                                ]);
                            }

                            $quantityBefore =
                                round(
                                    (float) $batch
                                        ->available_quantity,
                                    3,
                                );

                            $quantityAfter =
                                round(
                                    $quantityBefore
                                        + $stockReturnQuantity,
                                    3,
                                );

                            $batch->update([
                                'available_quantity' =>
                                $quantityAfter,
                            ]);

                            StockMovement::query()
                                ->create([
                                    'product_id' =>
                                    $saleItem
                                        ->product_id,

                                    'stock_batch_id' =>
                                    $batch
                                        ->id,

                                    'movement_type' =>
                                    StockMovement::TYPE_SALE_RETURN,

                                    'quantity_before' =>
                                    $quantityBefore,

                                    'quantity_change' =>
                                    $stockReturnQuantity,

                                    'quantity_after' =>
                                    $quantityAfter,

                                    'reference_type' =>
                                    'sale_return',

                                    'reference_id' =>
                                    $salesReturn
                                        ->id,

                                    'reference_number' =>
                                    $salesReturn
                                        ->return_number,

                                    'notes' =>
                                    sprintf(
                                        'Returned %s %s. Restored %s %s to the original stock batch.',
                                        $this->formatQuantity(
                                            $returnQuantity,
                                        ),
                                        $returnUnit,
                                        $this->formatQuantity(
                                            $stockReturnQuantity,
                                        ),
                                        $batch
                                            ->stockUnitValue(),
                                    ),

                                    'created_by' =>
                                    $user
                                        ->id,
                                ]);

                            $totalRestockedStock =
                                round(
                                    $totalRestockedStock
                                        + $stockReturnQuantity,
                                    3,
                                );
                        }

                        $totalRefund =
                            round(
                                $totalRefund
                                    + $refundAmount,
                                2,
                            );

                        $totalCost =
                            round(
                                $totalCost
                                    + $costValue,
                                2,
                            );

                        $totalProfitReversal =
                            round(
                                $totalProfitReversal
                                    + $profitReversal,
                                2,
                            );
                    }

                    $salesReturn->update([
                        'refund_amount' =>
                        $totalRefund,

                        'cost_value' =>
                        $totalCost,

                        'profit_reversal' =>
                        $totalProfitReversal,

                        'restocked_quantity' =>
                        $totalRestockedStock,
                    ]);

                    return $salesReturn;
                },
                3,
            );

        return response()->json([
            'message' =>
            'Sales return completed successfully.',

            'data' =>
            $this->returnData(
                $this->loadReturn(
                    $salesReturn,
                ),
                $user->isAdmin(),
            ),
        ], 201);
    }

    public function restockItem(
        Request $request,
        SaleReturn $salesReturn,
        SaleReturnItem $saleReturnItem,
    ): JsonResponse {
        $user = $request->user();

        if (!$user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $salesReturn->loadMissing(
            'sale',
        );

        if (!$salesReturn->sale) {
            throw ValidationException::withMessages([
                'return' => [
                    'The original sale for this return could not be found.',
                ],
            ]);
        }

        $this->ensureSaleAccess(
            $user,
            $salesReturn->sale,
        );

        $result =
            DB::transaction(
                function () use (
                    $salesReturn,
                    $saleReturnItem,
                    $user,
                ): array {
                    $lockedReturn =
                        SaleReturn::query()
                        ->whereKey(
                            $salesReturn->id,
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                    $lockedReturn->loadMissing(
                        'sale',
                    );

                    $lockedItem =
                        SaleReturnItem::query()
                        ->whereKey(
                            $saleReturnItem->id,
                        )
                        ->where(
                            'sale_return_id',
                            $lockedReturn->id,
                        )
                        ->lockForUpdate()
                        ->first();

                    if (!$lockedItem) {
                        throw ValidationException::withMessages([
                            'item' => [
                                'The selected returned item does not belong to this sales return.',
                            ],
                        ]);
                    }

                    /*
                     * Idempotency protection:
                     * never restore the same returned
                     * item to stock more than once.
                     */
                    if ((bool) $lockedItem->restocked) {
                        return [
                            'already_restocked' => true,
                            'stock_update' => null,

                            'sale_id' =>
                            (int) $lockedReturn
                                ->sale_id,

                            'sale_number' =>
                            (string) (
                                $lockedReturn
                                ->sale
                                ?->sale_number
                                ?? ''
                            ),
                        ];
                    }

                    $saleItem =
                        SaleItem::query()
                        ->whereKey(
                            $lockedItem
                                ->sale_item_id,
                        )
                        ->lockForUpdate()
                        ->first();

                    if (!$saleItem) {
                        throw ValidationException::withMessages([
                            'item' => [
                                'The original sale item could not be found. Stock was not changed.',
                            ],
                        ]);
                    }

                    if (
                        (int) $saleItem->sale_id
                        !==
                        (int) $lockedReturn->sale_id
                    ) {
                        throw ValidationException::withMessages([
                            'item' => [
                                'The returned item does not belong to the original sale.',
                            ],
                        ]);
                    }

                    if (
                        (int) $saleItem->product_id
                        !==
                        (int) $lockedItem->product_id
                    ) {
                        throw ValidationException::withMessages([
                            'item' => [
                                'The returned product does not match the original sale item.',
                            ],
                        ]);
                    }

                    if (
                        (int) $saleItem->stock_batch_id
                        !==
                        (int) $lockedItem->stock_batch_id
                    ) {
                        throw ValidationException::withMessages([
                            'item' => [
                                'The returned item does not match the original stock batch.',
                            ],
                        ]);
                    }

                    $returnQuantity =
                        round(
                            (float) $lockedItem
                                ->quantity,
                            3,
                        );

                    if ($returnQuantity <= 0) {
                        throw ValidationException::withMessages([
                            'item' => [
                                'The returned quantity is invalid. Stock was not changed.',
                            ],
                        ]);
                    }

                    /*
                     * Prefer the stock quantity saved
                     * when the return was created.
                     *
                     * This preserves the exact original
                     * Bag/Kg, Pack/Piece, Bottle/etc.
                     * conversion used by the sale.
                     *
                     * The fallback supports older rows.
                     */
                    $stockReturnQuantity =
                        round(
                            (float) (
                                $lockedItem
                                ->stock_quantity
                                ?? 0
                            ),
                            3,
                        );

                    if ($stockReturnQuantity <= 0) {
                        $stockReturnQuantity =
                            round(
                                $saleItem
                                    ->stockQuantityFor(
                                        $returnQuantity,
                                    ),
                                3,
                            );
                    }

                    if ($stockReturnQuantity <= 0) {
                        throw ValidationException::withMessages([
                            'item' => [
                                'The calculated stock quantity is invalid. Stock was not changed.',
                            ],
                        ]);
                    }

                    $batch =
                        StockBatch::query()
                        ->whereKey(
                            $lockedItem
                                ->stock_batch_id,
                        )
                        ->lockForUpdate()
                        ->first();

                    if (!$batch) {
                        throw ValidationException::withMessages([
                            'item' => [
                                'The original stock batch could not be found. Stock was not changed.',
                            ],
                        ]);
                    }

                    if (
                        (int) $batch->product_id
                        !==
                        (int) $lockedItem->product_id
                    ) {
                        throw ValidationException::withMessages([
                            'item' => [
                                'The original stock batch does not belong to the returned product.',
                            ],
                        ]);
                    }

                    $quantityBefore =
                        round(
                            (float) $batch
                                ->available_quantity,
                            3,
                        );

                    $quantityAfter =
                        round(
                            $quantityBefore
                                + $stockReturnQuantity,
                            3,
                        );

                    $batch->update([
                        'available_quantity' =>
                        $quantityAfter,
                    ]);

                    /*
                     * Mark the return item as restored
                     * in the same transaction as the
                     * stock update.
                     */
                    $lockedItem->update([
                        'restocked' => true,
                    ]);

                    /*
                     * This field currently stores the
                     * physical stock quantity restored,
                     * matching store().
                     */
                    $lockedReturn->update([
                        'restocked_quantity' =>
                        round(
                            (float) $lockedReturn
                                ->restocked_quantity
                                + $stockReturnQuantity,
                            3,
                        ),
                    ]);

                    StockMovement::query()
                        ->create([
                            'product_id' =>
                            $lockedItem
                                ->product_id,

                            'stock_batch_id' =>
                            $batch->id,

                            'movement_type' =>
                            StockMovement::TYPE_SALE_RETURN,

                            'quantity_before' =>
                            $quantityBefore,

                            'quantity_change' =>
                            $stockReturnQuantity,

                            'quantity_after' =>
                            $quantityAfter,

                            'reference_type' =>
                            'sale_return',

                            'reference_id' =>
                            $lockedReturn->id,

                            'reference_number' =>
                            $lockedReturn
                                ->return_number,

                            'notes' =>
                            sprintf(
                                'Delayed restock: returned %s %s. Restored %s %s to the original stock batch.',
                                $this->formatQuantity(
                                    $returnQuantity,
                                ),
                                $lockedItem
                                    ->return_unit
                                    ?: $saleItem
                                    ->saleUnitValue(),
                                $this->formatQuantity(
                                    $stockReturnQuantity,
                                ),
                                $batch
                                    ->stockUnitValue(),
                            ),

                            'created_by' =>
                            $user->id,
                        ]);

                    return [
                        'already_restocked' => false,

                        'sale_id' =>
                        (int) $lockedReturn
                            ->sale_id,

                        'sale_number' =>
                        (string) (
                            $lockedReturn
                            ->sale
                            ?->sale_number
                            ?? ''
                        ),

                        'stock_update' => [
                            'stock_batch_id' =>
                            (int) $batch->id,

                            'product_id' =>
                            (int) $batch
                                ->product_id,

                            'available_quantity' =>
                            $quantityAfter,

                            'stock_unit' =>
                            $batch
                                ->stockUnitValue(),
                        ],
                    ];
                },
                3,
            );

        /*
         * The database transaction has already
         * committed. A realtime broadcast failure
         * must not undo the inventory change.
         */
        if (
            !$result['already_restocked']
            && $result['stock_update'] !== null
        ) {
            try {
                PosStockUpdated::dispatch(
                    saleId: $result['sale_id'],

                    saleNumber: $result['sale_number'],

                    sourceUserId: $user->id,

                    batches: [
                        $result['stock_update'],
                    ],
                );
            } catch (\Throwable $exception) {
                Log::warning(
                    'Unable to broadcast delayed sales-return restock.',
                    [
                        'sales_return_id' =>
                        $salesReturn->id,

                        'sale_return_item_id' =>
                        $saleReturnItem->id,

                        'message' =>
                        $exception
                            ->getMessage(),
                    ],
                );
            }
        }

        $freshReturn =
            SaleReturn::query()
            ->findOrFail(
                $salesReturn->id,
            );

        return response()->json([
            'message' =>
            $result['already_restocked']
                ? 'This returned item has already been restored to stock.'
                : 'Returned item restored to its original stock batch successfully.',

            'data' =>
            $this->returnData(
                $this->loadReturn(
                    $freshReturn,
                ),
                $user->isAdmin(),
            ),
        ]);
    }

    public function show(
        Request $request,
        SaleReturn $salesReturn,
    ): JsonResponse {
        $user = $request->user();

        if (!$user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $salesReturn->loadMissing(
            'sale',
        );

        return response()->json([
            'data' =>
            $this->returnData(
                $this->loadReturn(
                    $salesReturn,
                ),
                $user->isAdmin(),
            ),
        ]);
    }

    private function ensureSaleAccess(
        User $user,
        Sale $sale,
    ): void {
        if (
            $user->isCashier()
            && $sale->created_by
            !== $user->id
        ) {
            abort(
                403,
                'You are not allowed to return items from this sale.',
            );
        }
    }

    private function generateReturnNumber(
        SaleReturn $salesReturn,
    ): string {
        return sprintf(
            'RET-%s-%06d',
            $salesReturn
                ->return_date
                ->format(
                    'Ymd',
                ),
            $salesReturn->id,
        );
    }

    private function saleDiscountShares(
        Collection $items,
        float $saleDiscount,
    ): array {
        $shares = [];

        $totalLineValue =
            round(
                $items->sum(
                    fn(
                        mixed $item,
                    ): float =>
                    (float) $item
                        ->line_total,
                ),
                2,
            );

        if (
            $saleDiscount <= 0
            || $totalLineValue <= 0
            || $items->isEmpty()
        ) {
            foreach (
                $items as $item
            ) {
                $shares[$item->id] = 0.0;
            }

            return $shares;
        }

        $remainingDiscount =
            round(
                $saleDiscount,
                2,
            );

        $lastIndex =
            $items->count() - 1;

        foreach (
            $items->values()
            as $index => $item
        ) {
            if (
                $index
                === $lastIndex
            ) {
                $share =
                    round(
                        min(
                            (float) $item
                                ->line_total,

                            max(
                                0,
                                $remainingDiscount,
                            ),
                        ),
                        2,
                    );
            } else {
                $share =
                    round(
                        $saleDiscount
                            * (
                                (float) $item
                                    ->line_total
                                / $totalLineValue
                            ),
                        2,
                    );

                $share =
                    min(
                        $share,
                        (float) $item
                            ->line_total,
                    );
            }

            $shares[$item->id] = $share;

            $remainingDiscount =
                round(
                    $remainingDiscount
                        - $share,
                    2,
                );
        }

        return $shares;
    }

    private function loadReturn(
        SaleReturn $salesReturn,
    ): SaleReturn {
        return $salesReturn->load([
            'sale:id,sale_number,sale_date,grand_total,created_by',

            'sale.createdBy:id,name,username',

            'createdBy:id,name,username',

            'items' =>
            fn($query) =>
            $query
                ->orderBy('id'),

            'items.product:id,name,unit,sku,barcode',

            'items.stockBatch:id,product_id,batch_code,batch_number,is_dual_unit,stock_unit,secondary_unit,conversion_factor,available_quantity,expiry_date',
        ]);
    }

    private function returnSummaryData(
        SaleReturn $salesReturn,
        bool $includeProfit,
    ): array {
        return [
            'id' =>
            $salesReturn
                ->id,

            'return_number' =>
            $salesReturn
                ->return_number,

            'return_date' =>
            $salesReturn
                ->return_date
                ->toISOString(),

            'refund_method' =>
            $salesReturn
                ->refund_method,

            'refund_amount' =>
            (float) $salesReturn
                ->refund_amount,

            'profit_reversal' =>
            $includeProfit
                ? (float) $salesReturn
                    ->profit_reversal
                : null,

            'restocked_quantity' =>
            (float) $salesReturn
                ->restocked_quantity,

            'reason' =>
            $salesReturn
                ->reason,

            'notes' =>
            $salesReturn
                ->notes,

            'status' =>
            $salesReturn
                ->status,

            'items_count' =>
            (int) (
                $salesReturn
                ->items_count
                ?? $salesReturn
                ->items()
                ->count()
            ),

            'total_quantity' =>
            (float) (
                $salesReturn
                ->total_quantity
                ?? $salesReturn
                ->items()
                ->sum(
                    'quantity',
                )
            ),

            'sale' =>
            $salesReturn->sale
                ? [
                    'id' =>
                    $salesReturn
                        ->sale
                        ->id,

                    'sale_number' =>
                    $salesReturn
                        ->sale
                        ->sale_number,

                    'sale_date' =>
                    $salesReturn
                        ->sale
                        ->sale_date
                        ->toISOString(),
                ]
                : null,

            'created_by' =>
            $salesReturn
                ->createdBy
                ? [
                    'id' =>
                    $salesReturn
                        ->createdBy
                        ->id,

                    'name' =>
                    $salesReturn
                        ->createdBy
                        ->name,

                    'username' =>
                    $salesReturn
                        ->createdBy
                        ->username,
                ]
                : null,

            'created_at' =>
            $salesReturn
                ->created_at
                ?->toISOString(),
        ];
    }

    private function returnData(
        SaleReturn $salesReturn,
        bool $includeProfit,
    ): array {
        return [
            ...$this
                ->returnSummaryData(
                    $salesReturn,
                    $includeProfit,
                ),

            'cost_value' =>
            $includeProfit
                ? (float) $salesReturn
                    ->cost_value
                : null,

            'sale' =>
            $salesReturn->sale
                ? [
                    'id' =>
                    $salesReturn
                        ->sale
                        ->id,

                    'sale_number' =>
                    $salesReturn
                        ->sale
                        ->sale_number,

                    'sale_date' =>
                    $salesReturn
                        ->sale
                        ->sale_date
                        ->toISOString(),

                    'grand_total' =>
                    (float) $salesReturn
                        ->sale
                        ->grand_total,

                    'created_by' =>
                    $salesReturn
                        ->sale
                        ->createdBy
                        ? [
                            'id' =>
                            $salesReturn
                                ->sale
                                ->createdBy
                                ->id,

                            'name' =>
                            $salesReturn
                                ->sale
                                ->createdBy
                                ->name,

                            'username' =>
                            $salesReturn
                                ->sale
                                ->createdBy
                                ->username,
                        ]
                        : null,
                ]
                : null,

            'items' =>
            $salesReturn
                ->items
                ->map(
                    fn(
                        SaleReturnItem $item,
                    ): array => [
                        'id' =>
                        $item->id,

                        'sale_item_id' =>
                        $item
                            ->sale_item_id,

                        'quantity' =>
                        (float) $item
                            ->quantity,

                        'return_unit' =>
                        $item
                            ->return_unit,

                        'conversion_factor' =>
                        (float) (
                            $item
                            ->conversion_factor
                            ?? 1
                        ),

                        'stock_quantity' =>
                        (float) (
                            $item
                            ->stock_quantity
                            ?? $item
                            ->quantity
                        ),

                        'purchase_cost' =>
                        $includeProfit
                            ? (float) $item
                                ->purchase_cost
                            : null,

                        'selling_price' =>
                        (float) $item
                            ->selling_price,

                        'item_discount_reversal' =>
                        (float) $item
                            ->item_discount_reversal,

                        'sale_discount_reversal' =>
                        (float) $item
                            ->sale_discount_reversal,

                        'refund_amount' =>
                        (float) $item
                            ->refund_amount,

                        'cost_value' =>
                        $includeProfit
                            ? (float) $item
                                ->cost_value
                            : null,

                        'profit_reversal' =>
                        $includeProfit
                            ? (float) $item
                                ->profit_reversal
                            : null,

                        'restocked' =>
                        (bool) $item
                            ->restocked,

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
