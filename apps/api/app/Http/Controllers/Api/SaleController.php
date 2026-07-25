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
use Illuminate\Validation\ValidationException;

class SaleController extends Controller
{
    public function index(
        Request $request,
    ): JsonResponse {
        $validated = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:100',
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

        $perPage = (int) (
            $validated['per_page']
            ?? 20
        );

        $sales = Sale::query()
            ->with([
                'createdBy:id,name',
                'payments:id,sale_id,payment_method,amount',
            ])
            ->withCount('items')
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
                                    'createdBy',
                                    fn(
                                        Builder $userQuery,
                                    ) =>
                                    $userQuery
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
            ->latest('sale_date')
            ->latest('id')
            ->paginate($perPage);

        $data = collect(
            $sales->items(),
        )
            ->map(
                fn(
                    Sale $sale,
                ): array =>
                $this->saleSummaryData(
                    $sale,
                ),
            )
            ->values();

        return response()->json([
            'data' => $data,

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
            ),
        ], 201);
    }

    public function show(
        Sale $sale,
    ): JsonResponse {
        return response()->json([
            'data' =>
            $this->saleData(
                $this->loadSale(
                    $sale,
                ),
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
            $query->orderBy('id'),

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
    ): array {
        $firstPayment =
            $sale->payments->first();

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

            'payment_method' =>
            $firstPayment
                ? $firstPayment
                ->payment_method
                : null,

            'created_by' => [
                'id' =>
                $sale->createdBy->id,

                'name' =>
                $sale
                    ->createdBy
                    ->name,
            ],

            'created_at' =>
            $sale
                ->created_at
                ?->toISOString(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function saleData(
        Sale $sale,
    ): array {
        return [
            ...$this->saleSummaryData(
                $sale,
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

                        'selling_price' =>
                        (float) $item
                            ->selling_price,

                        'discount' =>
                        (float) $item
                            ->discount,

                        'line_total' =>
                        (float) $item
                            ->line_total,

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
                    ],
                )
                ->values(),
        ];
    }
}
