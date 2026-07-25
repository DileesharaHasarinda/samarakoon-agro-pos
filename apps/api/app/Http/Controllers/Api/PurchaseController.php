<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Purchase\ReceivePurchaseRequest;
use App\Http\Requests\Purchase\StorePurchaseRequest;
use App\Http\Requests\Purchase\UpdatePurchaseRequest;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PurchaseController extends Controller
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

            'supplier_id' => [
                'nullable',
                'integer',
                'exists:suppliers,id',
            ],

            'status' => [
                'nullable',
                Rule::in([
                    Purchase::STATUS_DRAFT,
                    Purchase::STATUS_RECEIVED,
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

        $supplierId =
            $validated['supplier_id']
            ?? null;

        $status =
            $validated['status']
            ?? null;

        $perPage = (int) (
            $validated['per_page']
            ?? 10
        );

        $purchases = Purchase::query()
            ->with([
                'supplier:id,name,phone',
                'createdBy:id,name',
                'receivedBy:id,name',
            ])
            ->withCount('items')
            ->withSum(
                'items as total_quantity',
                'quantity',
            )
            ->when(
                $supplierId !== null,
                fn(
                    Builder $query,
                ) => $query->where(
                    'supplier_id',
                    $supplierId,
                ),
            )
            ->when(
                $status !== null,
                fn(
                    Builder $query,
                ) => $query->where(
                    'status',
                    $status,
                ),
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
                                    'purchase_number',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'supplier_invoice_number',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhereHas(
                                    'supplier',
                                    fn(
                                        Builder $supplierQuery,
                                    ) => $supplierQuery
                                        ->where(
                                            'name',
                                            'like',
                                            "%{$search}%",
                                        )
                                        ->orWhere(
                                            'phone',
                                            'like',
                                            "%{$search}%",
                                        ),
                                );
                        },
                    );
                },
            )
            ->latest('purchase_date')
            ->latest('id')
            ->paginate($perPage);

        $data = collect(
            $purchases->items(),
        )
            ->map(
                fn(
                    Purchase $purchase,
                ): array =>
                $this->purchaseSummaryData(
                    $purchase,
                ),
            )
            ->values();

        return response()->json([
            'data' => $data,

            'meta' => [
                'current_page' =>
                $purchases->currentPage(),

                'last_page' =>
                $purchases->lastPage(),

                'per_page' =>
                $purchases->perPage(),

                'total' =>
                $purchases->total(),

                'from' =>
                $purchases->firstItem(),

                'to' =>
                $purchases->lastItem(),
            ],
        ]);
    }

    public function store(
        StorePurchaseRequest $request,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validated = $request->validated();

        $purchase = DB::transaction(
            function () use (
                $validated,
                $user,
            ): Purchase {
                $purchase = Purchase::query()
                    ->create([
                        'supplier_id' =>
                        $validated['supplier_id'],

                        'supplier_invoice_number' =>
                        $validated['supplier_invoice_number'] ?? null,

                        'purchase_date' =>
                        $validated['purchase_date'],

                        'status' =>
                        Purchase::STATUS_DRAFT,

                        'discount' =>
                        $validated['discount'],

                        'additional_cost' =>
                        $validated['additional_cost'],

                        'notes' =>
                        $validated['notes']
                            ?? null,

                        'created_by' =>
                        $user->id,
                    ]);

                $purchase->update([
                    'purchase_number' =>
                    $this->generatePurchaseNumber(
                        $purchase,
                    ),
                ]);

                $this->replaceItems(
                    $purchase,
                    $validated['items'],
                );

                $this->recalculatePurchase(
                    $purchase,
                );

                if (
                    $validated['receive_now']
                ) {
                    $purchase->load('items');

                    $receiptItems =
                        $purchase->items
                        ->map(
                            fn(
                                PurchaseItem $item,
                            ): array => [
                                'purchase_item_id' =>
                                $item->id,

                                'received_quantity' =>
                                (float) $item
                                    ->quantity,

                                'selling_price' =>
                                (float) $item
                                    ->selling_price,

                                'batch_number' =>
                                $item
                                    ->batch_number,

                                'manufactured_date' =>
                                $item
                                    ->manufactured_date
                                    ?->format(
                                        'Y-m-d',
                                    ),

                                'expiry_date' =>
                                $item
                                    ->expiry_date
                                    ?->format(
                                        'Y-m-d',
                                    ),
                            ],
                        )
                        ->all();

                    $this->receivePurchaseItems(
                        $purchase,
                        $receiptItems,
                        $user->id,
                    );
                }

                return $purchase;
            },
            3,
        );

        $purchase->refresh();

        return response()->json([
            'message' =>
            $purchase->isReceived()
                ? 'Purchase saved and stock received successfully.'
                : 'Purchase saved as draft successfully.',

            'data' =>
            $this->purchaseData(
                $this->loadPurchase(
                    $purchase,
                ),
            ),
        ], 201);
    }

    public function show(
        Purchase $purchase,
    ): JsonResponse {
        return response()->json([
            'data' =>
            $this->purchaseData(
                $this->loadPurchase(
                    $purchase,
                ),
            ),
        ]);
    }

    public function update(
        UpdatePurchaseRequest $request,
        Purchase $purchase,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validated = $request->validated();

        $purchase = DB::transaction(
            function () use (
                $purchase,
                $validated,
                $user,
            ): Purchase {
                $lockedPurchase =
                    Purchase::query()
                    ->whereKey(
                        $purchase->id,
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                if (! $lockedPurchase->isDraft()) {
                    throw ValidationException::withMessages([
                        'purchase' => [
                            'Only draft purchases can be edited.',
                        ],
                    ]);
                }

                $lockedPurchase->update([
                    'supplier_id' =>
                    $validated['supplier_id'],

                    'supplier_invoice_number' =>
                    $validated['supplier_invoice_number'] ?? null,

                    'purchase_date' =>
                    $validated['purchase_date'],

                    'discount' =>
                    $validated['discount'],

                    'additional_cost' =>
                    $validated['additional_cost'],

                    'notes' =>
                    $validated['notes']
                        ?? null,
                ]);

                $this->replaceItems(
                    $lockedPurchase,
                    $validated['items'],
                );

                $this->recalculatePurchase(
                    $lockedPurchase,
                );

                if (
                    $validated['receive_now']
                ) {
                    $lockedPurchase->load(
                        'items',
                    );

                    $receiptItems =
                        $lockedPurchase
                        ->items
                        ->map(
                            fn(
                                PurchaseItem $item,
                            ): array => [
                                'purchase_item_id' =>
                                $item->id,

                                'received_quantity' =>
                                (float) $item
                                    ->quantity,

                                'selling_price' =>
                                (float) $item
                                    ->selling_price,

                                'batch_number' =>
                                $item
                                    ->batch_number,

                                'manufactured_date' =>
                                $item
                                    ->manufactured_date
                                    ?->format(
                                        'Y-m-d',
                                    ),

                                'expiry_date' =>
                                $item
                                    ->expiry_date
                                    ?->format(
                                        'Y-m-d',
                                    ),
                            ],
                        )
                        ->all();

                    $this->receivePurchaseItems(
                        $lockedPurchase,
                        $receiptItems,
                        $user->id,
                    );
                }

                return $lockedPurchase;
            },
            3,
        );

        $purchase->refresh();

        return response()->json([
            'message' =>
            $purchase->isReceived()
                ? 'Purchase updated and stock received successfully.'
                : 'Draft purchase updated successfully.',

            'data' =>
            $this->purchaseData(
                $this->loadPurchase(
                    $purchase,
                ),
            ),
        ]);
    }

    public function receive(
        ReceivePurchaseRequest $request,
        Purchase $purchase,
    ): JsonResponse {
        $user = $request->user();

        if (! $user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validated = $request->validated();

        $purchase = DB::transaction(
            function () use (
                $purchase,
                $validated,
                $user,
            ): Purchase {
                $lockedPurchase =
                    Purchase::query()
                    ->whereKey(
                        $purchase->id,
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                if (! $lockedPurchase->isDraft()) {
                    throw ValidationException::withMessages([
                        'purchase' => [
                            'Only draft purchases can be received.',
                        ],
                    ]);
                }

                $this->receivePurchaseItems(
                    $lockedPurchase,
                    $validated['items'],
                    $user->id,
                );

                return $lockedPurchase;
            },
            3,
        );

        return response()->json([
            'message' =>
            'Stock received successfully. New price batches were created.',

            'data' =>
            $this->purchaseData(
                $this->loadPurchase(
                    $purchase,
                ),
            ),
        ]);
    }

    public function destroy(
        Purchase $purchase,
    ): JsonResponse {
        if (! $purchase->isDraft()) {
            return response()->json([
                'message' =>
                'Only draft purchases can be deleted.',
            ], 409);
        }

        $purchaseNumber =
            $purchase->purchase_number;

        $purchase->delete();

        return response()->json([
            'message' =>
            "{$purchaseNumber} deleted successfully.",
        ]);
    }

    /**
     * @param array<int, array<string, mixed>> $items
     */
    private function replaceItems(
        Purchase $purchase,
        array $items,
    ): void {
        $purchase->items()->delete();

        foreach ($items as $item) {
            $quantity = round(
                (float) $item['quantity'],
                3,
            );

            $unitCost = round(
                (float) $item['unit_cost'],
                2,
            );

            $discount = round(
                (float) $item['discount'],
                2,
            );

            $lineTotal = round(
                ($quantity * $unitCost)
                    - $discount,
                2,
            );

            $purchase->items()->create([
                'product_id' =>
                $item['product_id'],

                'quantity' => $quantity,

                'received_quantity' => 0,

                'unit_cost' => $unitCost,

                'selling_price' => round(
                    (float) $item['selling_price'],
                    2,
                ),

                'discount' => $discount,

                'line_total' =>
                max(0, $lineTotal),

                'batch_number' =>
                $item['batch_number']
                    ?? null,

                'manufactured_date' =>
                $item['manufactured_date'] ?? null,

                'expiry_date' =>
                $item['expiry_date']
                    ?? null,

                'notes' =>
                $item['notes']
                    ?? null,
            ]);
        }
    }

    private function recalculatePurchase(
        Purchase $purchase,
    ): void {
        $items = $purchase
            ->items()
            ->get();

        $subtotal = round(
            $items->sum(
                fn(
                    PurchaseItem $item,
                ): float =>
                (float) $item->quantity
                    * (float) $item->unit_cost,
            ),
            2,
        );

        $itemDiscountTotal = round(
            $items->sum(
                fn(
                    PurchaseItem $item,
                ): float =>
                (float) $item->discount,
            ),
            2,
        );

        $grandTotal = round(
            $subtotal
                - $itemDiscountTotal
                - (float) $purchase->discount
                + (float) $purchase
                    ->additional_cost,
            2,
        );

        $purchase->update([
            'subtotal' => $subtotal,

            'item_discount_total' =>
            $itemDiscountTotal,

            'grand_total' =>
            max(0, $grandTotal),
        ]);
    }

    /**
     * @param array<int, array<string, mixed>> $receiptItems
     */
    private function receivePurchaseItems(
        Purchase $purchase,
        array $receiptItems,
        int $userId,
    ): void {
        $purchaseItems =
            $purchase
            ->items()
            ->with('stockBatch')
            ->lockForUpdate()
            ->get();

        $receiptItemsById =
            collect($receiptItems)
            ->keyBy(
                fn(
                    array $item,
                ): int => (int) $item['purchase_item_id'],
            );

        if (
            $receiptItemsById->count()
            !== $purchaseItems->count()
        ) {
            throw ValidationException::withMessages([
                'items' => [
                    'Stock intake details are required for every purchase item.',
                ],
            ]);
        }

        foreach (
            $purchaseItems as $purchaseItem
        ) {
            $receiptItem =
                $receiptItemsById->get(
                    $purchaseItem->id,
                );

            if (! is_array($receiptItem)) {
                throw ValidationException::withMessages([
                    'items' => [
                        "Missing stock intake details for {$purchaseItem->product_id}.",
                    ],
                ]);
            }

            if ($purchaseItem->stockBatch) {
                throw ValidationException::withMessages([
                    'purchase' => [
                        'A stock batch already exists for this purchase item.',
                    ],
                ]);
            }

            $remainingQuantity = round(
                (float) $purchaseItem->quantity
                    - (float) $purchaseItem
                        ->received_quantity,
                3,
            );

            $receivedQuantity = round(
                (float) $receiptItem['received_quantity'],
                3,
            );

            if (
                abs(
                    $remainingQuantity
                        - $receivedQuantity,
                ) > 0.0001
            ) {
                throw ValidationException::withMessages([
                    'items' => [
                        'This version requires the full remaining quantity to be received.',
                    ],
                ]);
            }

            $existingBatches =
                StockBatch::query()
                ->where(
                    'product_id',
                    $purchaseItem
                        ->product_id,
                )
                ->lockForUpdate()
                ->get([
                    'id',
                    'available_quantity',
                ]);

            $quantityBefore = round(
                $existingBatches->sum(
                    fn(
                        StockBatch $batch,
                    ): float =>
                    (float) $batch
                        ->available_quantity,
                ),
                3,
            );

            $sellingPrice = round(
                (float) $receiptItem['selling_price'],
                2,
            );

            $purchaseItem->update([
                'received_quantity' =>
                $receivedQuantity,

                'selling_price' =>
                $sellingPrice,

                'batch_number' =>
                $receiptItem['batch_number'] ?? null,

                'manufactured_date' =>
                $receiptItem['manufactured_date'] ?? null,

                'expiry_date' =>
                $receiptItem['expiry_date'] ?? null,
            ]);

            $batch = StockBatch::query()
                ->create([
                    'batch_code' =>
                    sprintf(
                        'LOT-%08d-%08d',
                        $purchase->id,
                        $purchaseItem->id,
                    ),

                    'product_id' =>
                    $purchaseItem
                        ->product_id,

                    'purchase_item_id' =>
                    $purchaseItem->id,

                    'batch_number' =>
                    $receiptItem['batch_number'] ?? null,

                    'purchase_cost' =>
                    $purchaseItem
                        ->unit_cost,

                    'selling_price' =>
                    $sellingPrice,

                    'received_quantity' =>
                    $receivedQuantity,

                    'available_quantity' =>
                    $receivedQuantity,

                    'manufactured_date' =>
                    $receiptItem['manufactured_date'] ?? null,

                    'expiry_date' =>
                    $receiptItem['expiry_date'] ?? null,

                    'received_at' => now(),
                ]);

            $quantityAfter = round(
                $quantityBefore
                    + $receivedQuantity,
                3,
            );

            StockMovement::query()
                ->create([
                    'product_id' =>
                    $purchaseItem
                        ->product_id,

                    'stock_batch_id' =>
                    $batch->id,

                    'movement_type' =>
                    StockMovement::TYPE_PURCHASE_RECEIPT,

                    'quantity_before' =>
                    $quantityBefore,

                    'quantity_change' =>
                    $receivedQuantity,

                    'quantity_after' =>
                    $quantityAfter,

                    'reference_type' =>
                    'purchase',

                    'reference_id' =>
                    $purchase->id,

                    'reference_number' =>
                    $purchase
                        ->purchase_number,

                    'notes' =>
                    'Stock received from purchase.',

                    'created_by' =>
                    $userId,
                ]);
        }

        $purchase->update([
            'status' =>
            Purchase::STATUS_RECEIVED,

            'received_by' => $userId,

            'received_at' => now(),
        ]);
    }

    private function generatePurchaseNumber(
        Purchase $purchase,
    ): string {
        return sprintf(
            'PUR-%s-%06d',
            $purchase
                ->purchase_date
                ->format('Ymd'),
            $purchase->id,
        );
    }

    private function loadPurchase(
        Purchase $purchase,
    ): Purchase {
        return $purchase->load([
            'supplier:id,name,phone',
            'createdBy:id,name',
            'receivedBy:id,name',

            'items' => fn(
                $query,
            ) => $query->orderBy('id'),

            'items.product:id,category_id,name,sku,barcode,unit',
            'items.product.category:id,name',
            'items.stockBatch',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function purchaseSummaryData(
        Purchase $purchase,
    ): array {
        return [
            'id' => $purchase->id,

            'purchase_number' =>
            $purchase->purchase_number,

            'supplier_invoice_number' =>
            $purchase
                ->supplier_invoice_number,

            'purchase_date' =>
            $purchase
                ->purchase_date
                ->format('Y-m-d'),

            'status' => $purchase->status,

            'subtotal' =>
            (float) $purchase->subtotal,

            'item_discount_total' =>
            (float) $purchase
                ->item_discount_total,

            'discount' =>
            (float) $purchase->discount,

            'additional_cost' =>
            (float) $purchase
                ->additional_cost,

            'grand_total' =>
            (float) $purchase
                ->grand_total,

            'notes' => $purchase->notes,

            'items_count' =>
            (int) $purchase
                ->items_count,

            'total_quantity' =>
            (float) (
                $purchase
                ->total_quantity
                ?? 0
            ),

            'supplier' => [
                'id' =>
                $purchase->supplier->id,

                'name' =>
                $purchase->supplier->name,

                'phone' =>
                $purchase->supplier->phone,
            ],

            'created_by' => [
                'id' =>
                $purchase->createdBy->id,

                'name' =>
                $purchase->createdBy
                    ->name,
            ],

            'received_by' =>
            $purchase->receivedBy
                ? [
                    'id' =>
                    $purchase
                        ->receivedBy
                        ->id,

                    'name' =>
                    $purchase
                        ->receivedBy
                        ->name,
                ]
                : null,

            'received_at' =>
            $purchase
                ->received_at
                ?->toISOString(),

            'created_at' =>
            $purchase
                ->created_at
                ?->toISOString(),

            'updated_at' =>
            $purchase
                ->updated_at
                ?->toISOString(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function purchaseData(
        Purchase $purchase,
    ): array {
        return [
            ...$this->purchaseSummaryData(
                $purchase,
            ),

            'items' =>
            $purchase->items
                ->map(
                    fn(
                        PurchaseItem $item,
                    ): array => [
                        'id' => $item->id,

                        'product_id' =>
                        $item->product_id,

                        'quantity' =>
                        (float) $item
                            ->quantity,

                        'received_quantity' =>
                        (float) $item
                            ->received_quantity,

                        'unit_cost' =>
                        (float) $item
                            ->unit_cost,

                        'selling_price' =>
                        (float) $item
                            ->selling_price,

                        'discount' =>
                        (float) $item
                            ->discount,

                        'line_total' =>
                        (float) $item
                            ->line_total,

                        'batch_number' =>
                        $item
                            ->batch_number,

                        'manufactured_date' =>
                        $item
                            ->manufactured_date
                            ?->format(
                                'Y-m-d',
                            ),

                        'expiry_date' =>
                        $item
                            ->expiry_date
                            ?->format(
                                'Y-m-d',
                            ),

                        'notes' =>
                        $item->notes,

                        'product' => [
                            'id' =>
                            $item
                                ->product
                                ->id,

                            'name' =>
                            $item
                                ->product
                                ->name,

                            'sku' =>
                            $item
                                ->product
                                ->sku,

                            'barcode' =>
                            $item
                                ->product
                                ->barcode,

                            'unit' =>
                            $item
                                ->product
                                ->unit,

                            'category' => [
                                'id' =>
                                $item
                                    ->product
                                    ->category
                                    ->id,

                                'name' =>
                                $item
                                    ->product
                                    ->category
                                    ->name,
                            ],
                        ],

                        'stock_batch' =>
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

                                'purchase_cost' =>
                                (float) $item
                                    ->stockBatch
                                    ->purchase_cost,

                                'selling_price' =>
                                (float) $item
                                    ->stockBatch
                                    ->selling_price,

                                'received_quantity' =>
                                (float) $item
                                    ->stockBatch
                                    ->received_quantity,

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
}
