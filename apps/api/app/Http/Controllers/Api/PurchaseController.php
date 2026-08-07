<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Purchase\ReceivePurchaseRequest;
use App\Http\Requests\Purchase\StorePurchaseRequest;
use App\Http\Requests\Purchase\UpdatePurchaseRequest;
use App\Models\Product;
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

        if (!$user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        $validated =
            $request->validated();

        $purchase = DB::transaction(
            function () use (
                $validated,
                $user,
            ): Purchase {
                $purchase =
                    Purchase::query()
                    ->create([
                        'supplier_id' =>
                        $validated['supplier_id'],

                        'supplier_invoice_number' =>
                        $validated['supplier_invoice_number']
                            ?? null,

                        'purchase_date' =>
                        $validated['purchase_date'],

                        'status' =>
                        Purchase::STATUS_DRAFT,

                        'discount' =>
                        $validated['discount']
                            ?? 0,

                        'additional_cost' =>
                        $validated['additional_cost']
                            ?? 0,

                        'notes' =>
                        $validated['notes']
                            ?? null,

                        'created_by' =>
                        $user->id,
                    ]);

                $purchase->update([
                    'purchase_number' =>
                    $this
                        ->generatePurchaseNumber(
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
                    (bool) (
                        $validated['receive_now']
                        ?? false
                    )
                ) {
                    $purchase->load(
                        'items',
                    );

                    $receiptItems =
                        $purchase
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

                    $this
                        ->receivePurchaseItems(
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

        if (!$user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        $validated =
            $request->validated();

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

                if (
                    !$lockedPurchase
                        ->isDraft()
                ) {
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
                    $validated['supplier_invoice_number']
                        ?? null,

                    'purchase_date' =>
                    $validated['purchase_date'],

                    'discount' =>
                    $validated['discount']
                        ?? 0,

                    'additional_cost' =>
                    $validated['additional_cost']
                        ?? 0,

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
                    (bool) (
                        $validated['receive_now']
                        ?? false
                    )
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

                    $this
                        ->receivePurchaseItems(
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

        if (!$user instanceof User) {
            return response()->json([
                'message' =>
                'Unauthenticated.',
            ], 401);
        }

        $validated =
            $request->validated();

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

                if (
                    !$lockedPurchase
                        ->isDraft()
                ) {
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
            'Stock received successfully. New stock batches were created.',

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
        if (!$purchase->isDraft()) {
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

    private function replaceItems(
        Purchase $purchase,
        array $items,
    ): void {
        $productIds =
            collect($items)
            ->pluck('product_id')
            ->filter()
            ->map(
                fn(
                    mixed $id,
                ): int =>
                (int) $id,
            )
            ->unique()
            ->values();

        $products =
            Product::query()
            ->whereIn(
                'id',
                $productIds->all(),
            )
            ->get([
                'id',
                'name',
                'unit',
            ])
            ->keyBy('id');

        $purchase
            ->items()
            ->delete();

        foreach (
            $items as $index => $item
        ) {
            $productId =
                (int) $item['product_id'];

            $product =
                $products->get(
                    $productId,
                );

            if (!$product instanceof Product) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_id" => [
                        'The selected product is invalid.',
                    ],
                ]);
            }

            $quantity = round(
                (float) $item['quantity'],
                3,
            );

            $unitCost = round(
                (float) $item['unit_cost'],
                2,
            );

            $sellingPrice = round(
                (float) $item['selling_price'],
                2,
            );

            $discount = round(
                (float) (
                    $item['discount']
                    ?? 0
                ),
                2,
            );

            $isDualUnit =
                $this->booleanValue(
                    $item['is_dual_unit']
                        ?? false,
                );

            $secondaryUnit = null;
            $conversionFactor = 1.0;
            $secondarySellingPrice = null;

            if ($isDualUnit) {
                if (
                    !$this->isBagUnit(
                        $product->unit,
                    )
                ) {
                    throw ValidationException::withMessages([
                        "items.{$index}.is_dual_unit" => [
                            'Loose Kg selling can only be enabled for products using Bag as the main unit.',
                        ],
                    ]);
                }

                $conversionFactor =
                    round(
                        (float) (
                            $item['conversion_factor']
                            ?? 0
                        ),
                        3,
                    );

                if (
                    $conversionFactor <= 0
                ) {
                    throw ValidationException::withMessages([
                        "items.{$index}.conversion_factor" => [
                            'Weight per bag must be greater than zero.',
                        ],
                    ]);
                }

                $secondaryUnit =
                    trim(
                        (string) (
                            $item['secondary_unit']
                            ?? 'Kg'
                        ),
                    );

                if (
                    $this->normaliseUnit(
                        $secondaryUnit,
                    ) !== 'kg'
                ) {
                    throw ValidationException::withMessages([
                        "items.{$index}.secondary_unit" => [
                            'The loose selling unit must be Kg.',
                        ],
                    ]);
                }

                $secondaryUnit = 'Kg';

                if (
                    !array_key_exists(
                        'secondary_selling_price',
                        $item,
                    )
                ) {
                    throw ValidationException::withMessages([
                        "items.{$index}.secondary_selling_price" => [
                            'Selling price for 1 Kg is required.',
                        ],
                    ]);
                }

                $secondarySellingPrice =
                    round(
                        (float) $item['secondary_selling_price'],
                        2,
                    );

                if (
                    $secondarySellingPrice <= 0
                ) {
                    throw ValidationException::withMessages([
                        "items.{$index}.secondary_selling_price" => [
                            'Selling price for 1 Kg must be greater than zero.',
                        ],
                    ]);
                }
            }

            $lineTotal = round(
                (
                    $quantity
                    * $unitCost
                )
                    - $discount,
                2,
            );

            $purchase
                ->items()
                ->create([
                    'product_id' =>
                    $productId,

                    'quantity' =>
                    $quantity,

                    'received_quantity' =>
                    0,

                    'unit_cost' =>
                    $unitCost,

                    'selling_price' =>
                    $sellingPrice,

                    'is_dual_unit' =>
                    $isDualUnit,

                    'secondary_unit' =>
                    $secondaryUnit,

                    'conversion_factor' =>
                    $conversionFactor,

                    'secondary_selling_price' =>
                    $secondarySellingPrice,

                    'discount' =>
                    $discount,

                    'line_total' =>
                    max(
                        0,
                        $lineTotal,
                    ),

                    'batch_number' =>
                    $item['batch_number']
                        ?? null,

                    'manufactured_date' =>
                    $item['manufactured_date']
                        ?? null,

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
        $items =
            $purchase
            ->items()
            ->get();

        $subtotal = round(
            $items->sum(
                fn(
                    PurchaseItem $item,
                ): float =>
                (float) $item
                    ->quantity
                    * (float) $item
                        ->unit_cost,
            ),
            2,
        );

        $itemDiscountTotal =
            round(
                $items->sum(
                    fn(
                        PurchaseItem $item,
                    ): float =>
                    (float) $item
                        ->discount,
                ),
                2,
            );

        $grandTotal = round(
            $subtotal
                - $itemDiscountTotal
                - (float) $purchase
                    ->discount
                + (float) $purchase
                    ->additional_cost,
            2,
        );

        $purchase->update([
            'subtotal' =>
            $subtotal,

            'item_discount_total' =>
            $itemDiscountTotal,

            'grand_total' =>
            max(
                0,
                $grandTotal,
            ),
        ]);
    }

    private function receivePurchaseItems(
        Purchase $purchase,
        array $receiptItems,
        int $userId,
    ): void {
        $purchaseItems =
            $purchase
            ->items()
            ->with([
                'stockBatch',
                'product:id,name,unit',
            ])
            ->lockForUpdate()
            ->get();

        $receiptItemsById =
            collect($receiptItems)
            ->keyBy(
                fn(
                    array $item,
                ): int =>
                (int) $item['purchase_item_id'],
            );

        if (
            $receiptItemsById
            ->count()
            !== $purchaseItems
            ->count()
        ) {
            throw ValidationException::withMessages([
                'items' => [
                    'Stock intake details are required for every purchase item.',
                ],
            ]);
        }

        foreach (
            $purchaseItems
            as $purchaseItem
        ) {
            $receiptItem =
                $receiptItemsById->get(
                    $purchaseItem->id,
                );

            if (
                !is_array(
                    $receiptItem,
                )
            ) {
                throw ValidationException::withMessages([
                    'items' => [
                        "Missing stock intake details for product {$purchaseItem->product_id}.",
                    ],
                ]);
            }

            if (
                $purchaseItem
                ->stockBatch
            ) {
                throw ValidationException::withMessages([
                    'purchase' => [
                        'A stock batch already exists for this purchase item.',
                    ],
                ]);
            }

            if (
                !$purchaseItem
                    ->product
            ) {
                throw ValidationException::withMessages([
                    'items' => [
                        'The purchase item product could not be loaded.',
                    ],
                ]);
            }

            $remainingQuantity =
                round(
                    (float) $purchaseItem
                        ->quantity
                        - (float) $purchaseItem
                            ->received_quantity,
                    3,
                );

            $receivedQuantity =
                round(
                    (float) $receiptItem['received_quantity'],
                    3,
                );

            if (
                $receivedQuantity <= 0
            ) {
                throw ValidationException::withMessages([
                    'items' => [
                        'Received quantity must be greater than zero.',
                    ],
                ]);
            }

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

            if (
                $purchaseItem
                ->is_dual_unit
                && !$this->isBagUnit(
                    $purchaseItem
                        ->product
                        ->unit,
                )
            ) {
                throw ValidationException::withMessages([
                    'items' => [
                        "{$purchaseItem->product->name} cannot use Bag to Kg conversion because its product unit is not Bag.",
                    ],
                ]);
            }

            if (
                $purchaseItem
                ->is_dual_unit
                && $purchaseItem
                ->conversionFactorValue()
                <= 0
            ) {
                throw ValidationException::withMessages([
                    'items' => [
                        "Invalid Bag to Kg conversion for {$purchaseItem->product->name}.",
                    ],
                ]);
            }

            $stockUnit =
                $purchaseItem
                ->usesDualUnit()
                ? (
                    trim(
                        (string) $purchaseItem
                            ->secondary_unit,
                    )
                    ?: 'Kg'
                )
                : (
                    trim(
                        (string) $purchaseItem
                            ->product
                            ->unit,
                    )
                    ?: 'Unit'
                );

            $existingBatches =
                StockBatch::query()
                ->where(
                    'product_id',
                    $purchaseItem
                        ->product_id,
                )
                ->lockForUpdate()
                ->get();

            $this
                ->ensureCompatibleStockUnit(
                    $purchaseItem,
                    $existingBatches,
                    $stockUnit,
                );

            $quantityBefore =
                round(
                    $existingBatches
                        ->filter(
                            fn(
                                StockBatch $batch,
                            ): bool =>
                            (float) $batch
                                ->available_quantity
                                > 0,
                        )
                        ->sum(
                            fn(
                                StockBatch $batch,
                            ): float =>
                            (float) $batch
                                ->available_quantity,
                        ),
                    3,
                );

            $sellingPrice =
                round(
                    (float) $receiptItem['selling_price'],
                    2,
                );

            if (
                $sellingPrice <= 0
            ) {
                throw ValidationException::withMessages([
                    'items' => [
                        "Selling price for {$purchaseItem->product->name} must be greater than zero.",
                    ],
                ]);
            }

            if (
                $purchaseItem
                ->usesDualUnit()
                && (
                    $purchaseItem
                    ->secondary_selling_price
                    === null
                    || (float) $purchaseItem
                        ->secondary_selling_price
                    <= 0
                )
            ) {
                throw ValidationException::withMessages([
                    'items' => [
                        "Loose Kg selling price is required for {$purchaseItem->product->name}.",
                    ],
                ]);
            }

            $batchNumber =
                $receiptItem['batch_number']
                ?? $purchaseItem
                ->batch_number;

            $manufacturedDate =
                $receiptItem['manufactured_date']
                ?? (
                    $purchaseItem
                    ->manufactured_date
                    ?->format(
                        'Y-m-d',
                    )
                );

            $expiryDate =
                $receiptItem['expiry_date']
                ?? (
                    $purchaseItem
                    ->expiry_date
                    ?->format(
                        'Y-m-d',
                    )
                );

            $purchaseItem->update([
                'received_quantity' =>
                $receivedQuantity,

                'selling_price' =>
                $sellingPrice,

                'batch_number' =>
                $batchNumber,

                'manufactured_date' =>
                $manufacturedDate,

                'expiry_date' =>
                $expiryDate,
            ]);

            $purchaseItem->refresh();

            $stockReceivedQuantity =
                $purchaseItem
                ->stockQuantityFor(
                    $receivedQuantity,
                );

            if (
                $stockReceivedQuantity <= 0
            ) {
                throw ValidationException::withMessages([
                    'items' => [
                        "Calculated stock quantity for {$purchaseItem->product->name} is invalid.",
                    ],
                ]);
            }

            $baseUnitCost =
                $purchaseItem
                ->baseUnitCost();

            $batch =
                StockBatch::query()
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
                    $purchaseItem
                        ->id,

                    'batch_number' =>
                    $batchNumber,

                    'purchase_cost' =>
                    $purchaseItem
                        ->unit_cost,

                    'selling_price' =>
                    $sellingPrice,

                    'is_dual_unit' =>
                    $purchaseItem
                        ->usesDualUnit(),

                    'stock_unit' =>
                    $stockUnit,

                    'secondary_unit' =>
                    $purchaseItem
                        ->usesDualUnit()
                        ? $purchaseItem
                        ->secondary_unit
                        : null,

                    'conversion_factor' =>
                    $purchaseItem
                        ->usesDualUnit()
                        ? $purchaseItem
                        ->conversionFactorValue()
                        : 1,

                    'secondary_selling_price' =>
                    $purchaseItem
                        ->usesDualUnit()
                        ? $purchaseItem
                        ->secondary_selling_price
                        : null,

                    'base_unit_cost' =>
                    $baseUnitCost,

                    'received_quantity' =>
                    $stockReceivedQuantity,

                    'available_quantity' =>
                    $stockReceivedQuantity,

                    'manufactured_date' =>
                    $manufacturedDate,

                    'expiry_date' =>
                    $expiryDate,

                    'received_at' =>
                    now(),
                ]);

            $quantityAfter =
                round(
                    $quantityBefore
                        + $stockReceivedQuantity,
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
                    $stockReceivedQuantity,

                    'quantity_after' =>
                    $quantityAfter,

                    'reference_type' =>
                    'purchase',

                    'reference_id' =>
                    $purchase
                        ->id,

                    'reference_number' =>
                    $purchase
                        ->purchase_number,

                    'notes' =>
                    $purchaseItem
                        ->usesDualUnit()
                        ? sprintf(
                            'Stock received from purchase: %s %s converted to %s %s.',
                            $this->formatQuantity(
                                $receivedQuantity,
                            ),
                            $purchaseItem
                                ->product
                                ->unit,
                            $this->formatQuantity(
                                $stockReceivedQuantity,
                            ),
                            $stockUnit,
                        )
                        : 'Stock received from purchase.',

                    'created_by' =>
                    $userId,
                ]);
        }

        $purchase->update([
            'status' =>
            Purchase::STATUS_RECEIVED,

            'received_by' =>
            $userId,

            'received_at' =>
            now(),
        ]);
    }

    private function ensureCompatibleStockUnit(
        PurchaseItem $purchaseItem,
        $existingBatches,
        string $newStockUnit,
    ): void {
        foreach (
            $existingBatches
            as $existingBatch
        ) {
            if (
                (float) $existingBatch
                    ->available_quantity
                <= 0
            ) {
                continue;
            }

            $existingStockUnit =
                trim(
                    (string) (
                        $existingBatch
                        ->stock_unit
                        ?? ''
                    ),
                );

            if (
                $existingStockUnit === ''
            ) {
                if (
                    $existingBatch
                    ->is_dual_unit
                    && trim(
                        (string) $existingBatch
                            ->secondary_unit,
                    ) !== ''
                ) {
                    $existingStockUnit =
                        trim(
                            (string) $existingBatch
                                ->secondary_unit,
                        );
                } else {
                    $existingStockUnit =
                        trim(
                            (string) $purchaseItem
                                ->product
                                ->unit,
                        );
                }
            }

            if (
                $this->normaliseUnit(
                    $existingStockUnit,
                )
                !== $this->normaliseUnit(
                    $newStockUnit,
                )
            ) {
                throw ValidationException::withMessages([
                    'items' => [
                        "{$purchaseItem->product->name} already has available stock stored in {$existingStockUnit}. Finish or convert that stock before receiving new stock in {$newStockUnit}.",
                    ],
                ]);
            }
        }
    }

    private function booleanValue(
        mixed $value,
    ): bool {
        if (is_bool($value)) {
            return $value;
        }

        if (
            is_int($value)
            || is_float($value)
        ) {
            return (int) $value === 1;
        }

        return in_array(
            strtolower(
                trim(
                    (string) $value,
                ),
            ),
            [
                '1',
                'true',
                'yes',
                'on',
            ],
            true,
        );
    }

    private function isBagUnit(
        mixed $unit,
    ): bool {
        return in_array(
            $this->normaliseUnit(
                (string) $unit,
            ),
            [
                'bag',
                'bags',
            ],
            true,
        );
    }

    private function normaliseUnit(
        string $unit,
    ): string {
        return strtolower(
            trim($unit),
        );
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

            'items' =>
            fn(
                $query,
            ) =>
            $query
                ->orderBy('id'),

            'items.product:id,category_id,name,sku,barcode,unit',
            'items.product.category:id,name',
            'items.stockBatch',
        ]);
    }

    private function purchaseSummaryData(
        Purchase $purchase,
    ): array {
        return [
            'id' =>
            $purchase->id,

            'purchase_number' =>
            $purchase
                ->purchase_number,

            'supplier_invoice_number' =>
            $purchase
                ->supplier_invoice_number,

            'purchase_date' =>
            $purchase
                ->purchase_date
                ->format(
                    'Y-m-d',
                ),

            'status' =>
            $purchase->status,

            'subtotal' =>
            (float) $purchase
                ->subtotal,

            'item_discount_total' =>
            (float) $purchase
                ->item_discount_total,

            'discount' =>
            (float) $purchase
                ->discount,

            'additional_cost' =>
            (float) $purchase
                ->additional_cost,

            'grand_total' =>
            (float) $purchase
                ->grand_total,

            'notes' =>
            $purchase->notes,

            'items_count' =>
            (int) (
                $purchase
                ->items_count
                ?? $purchase
                ->items
                ?->count()
                ?? 0
            ),

            'total_quantity' =>
            (float) (
                $purchase
                ->total_quantity
                ?? 0
            ),

            'supplier' =>
            $purchase->supplier
                ? [
                    'id' =>
                    $purchase
                        ->supplier
                        ->id,

                    'name' =>
                    $purchase
                        ->supplier
                        ->name,

                    'phone' =>
                    $purchase
                        ->supplier
                        ->phone,
                ]
                : null,

            'created_by' =>
            $purchase->createdBy
                ? [
                    'id' =>
                    $purchase
                        ->createdBy
                        ->id,

                    'name' =>
                    $purchase
                        ->createdBy
                        ->name,
                ]
                : null,

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

    private function purchaseData(
        Purchase $purchase,
    ): array {
        return [
            ...$this
                ->purchaseSummaryData(
                    $purchase,
                ),

            'items' =>
            $purchase
                ->items
                ->map(
                    fn(
                        PurchaseItem $item,
                    ): array => [
                        'id' =>
                        $item->id,

                        'product_id' =>
                        $item
                            ->product_id,

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

                        'is_dual_unit' =>
                        (bool) $item
                            ->is_dual_unit,

                        'secondary_unit' =>
                        $item
                            ->secondary_unit,

                        'conversion_factor' =>
                        (float) (
                            $item
                            ->conversion_factor
                            ?? 1
                        ),

                        'secondary_selling_price' =>
                        $item
                            ->secondary_selling_price
                            !== null
                            ? (float) $item
                                ->secondary_selling_price
                            : null,

                        'total_stock_quantity' =>
                        $item
                            ->totalStockQuantity(),

                        'received_stock_quantity' =>
                        $item
                            ->receivedStockQuantity(),

                        'base_unit_cost' =>
                        $item
                            ->baseUnitCost(),

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

                                'category' =>
                                $item
                                    ->product
                                    ->category
                                    ? [
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
                                    ]
                                    : null,
                            ]
                            : null,

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

                                'secondary_selling_price' =>
                                $item
                                    ->stockBatch
                                    ->secondary_selling_price
                                    !== null
                                    ? (float) $item
                                        ->stockBatch
                                        ->secondary_selling_price
                                    : null,

                                'base_unit_cost' =>
                                $item
                                    ->stockBatch
                                    ->base_unit_cost
                                    !== null
                                    ? (float) $item
                                        ->stockBatch
                                        ->base_unit_cost
                                    : null,

                                'received_quantity' =>
                                (float) $item
                                    ->stockBatch
                                    ->received_quantity,

                                'available_quantity' =>
                                (float) $item
                                    ->stockBatch
                                    ->available_quantity,

                                'manufactured_date' =>
                                $item
                                    ->stockBatch
                                    ->manufactured_date
                                    ?->format(
                                        'Y-m-d',
                                    ),

                                'expiry_date' =>
                                $item
                                    ->stockBatch
                                    ->expiry_date
                                    ?->format(
                                        'Y-m-d',
                                    ),

                                'received_at' =>
                                $item
                                    ->stockBatch
                                    ->received_at
                                    ?->toISOString(),
                            ]
                            : null,
                    ],
                )
                ->values(),
        ];
    }
}
