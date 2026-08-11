<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Models\Product;
use App\Models\StockBatch;
use Carbon\Carbon;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;

class ProductController extends Controller
{
    public function index(
        Request $request,
    ): JsonResponse {
        $validated =
            $request->validate([
                'search' => [
                    'nullable',
                    'string',
                    'max:160',
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

        $search =
            trim(
                (string) (
                    $validated['search']
                    ?? ''
                ),
            );

        $perPage =
            (int) (
                $validated['per_page']
                ?? 20
            );

        /*
         * IMPORTANT:
         *
         * We load the stock-batch unit information because
         * total_available_quantity alone does not tell us
         * whether the physical stock is Bag, Kg, Bottle, etc.
         */
        $products =
            Product::query()
            ->with([
                'category:id,name',

                'stockBatches' =>
                function ($query): void {
                    $query->select([
                        'id',
                        'product_id',
                        'available_quantity',
                        'received_quantity',
                        'is_dual_unit',
                        'stock_unit',
                        'secondary_unit',
                        'conversion_factor',
                    ]);
                },
            ])
            ->withSum(
                'stockBatches as total_available_quantity',
                'available_quantity',
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
                                )
                                ->orWhere(
                                    'unit',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhereHas(
                                    'category',
                                    function (
                                        Builder $categoryQuery,
                                    ) use ($search): void {
                                        $categoryQuery->where(
                                            'name',
                                            'like',
                                            "%{$search}%",
                                        );
                                    },
                                );
                        },
                    );
                },
            )
            ->orderBy('name')
            ->paginate($perPage);

        $data =
            collect(
                $products->items(),
            )
            ->map(
                fn(
                    Product $product,
                ): array =>
                $this->productData(
                    $product,
                ),
            )
            ->values();

        return response()->json([
            'data' =>
            $data,

            'meta' => [
                'current_page' =>
                $products->currentPage(),

                'last_page' =>
                $products->lastPage(),

                'per_page' =>
                $products->perPage(),

                'total' =>
                $products->total(),

                'from' =>
                $products->firstItem(),

                'to' =>
                $products->lastItem(),
            ],
        ]);
    }

    public function options(): JsonResponse
    {
        $products =
            Product::query()
            ->with([
                'category:id,name',
            ])
            ->when(
                Schema::hasColumn(
                    'products',
                    'is_active',
                ),
                fn(
                    Builder $query,
                ) =>
                $query->where(
                    'is_active',
                    true,
                ),
            )
            ->orderBy('name')
            ->get()
            ->map(
                fn(
                    Product $product,
                ): array => [
                    'id' =>
                    $product->id,

                    'name' =>
                    $product->name,

                    'sku' =>
                    $product->sku,

                    'barcode' =>
                    $product->barcode,

                    'unit' =>
                    $product->unit,

                    'category' =>
                    $product->category
                        ? [
                            'id' =>
                            $product
                                ->category
                                ->id,

                            'name' =>
                            $product
                                ->category
                                ->name,
                        ]
                        : null,
                ],
            )
            ->values();

        return response()->json([
            'data' =>
            $products,
        ]);
    }

    public function store(
        StoreProductRequest $request,
    ): JsonResponse {
        $validated =
            $request->validated();

        $product =
            DB::transaction(
                function () use (
                    $validated,
                ): Product {
                    $temporarySku =
                        'TMP-'
                        . Str::upper(
                            Str::random(16),
                        );

                    $product =
                        new Product();

                    $product->forceFill([
                        'category_id' =>
                        (int) $validated['category_id'],

                        'name' =>
                        trim(
                            $validated['name'],
                        ),

                        'sku' =>
                        $temporarySku,

                        'barcode' =>
                        $this->normaliseBarcode(
                            $validated['barcode']
                                ?? null,
                        ),

                        'unit' =>
                        trim(
                            $validated['unit'],
                        ),

                        'is_active' =>
                        true,
                    ]);

                    $product->save();

                    $product->forceFill([
                        'sku' =>
                        sprintf(
                            'PRD-%06d',
                            $product->id,
                        ),
                    ]);

                    $product->save();

                    return $product;
                },
            );

        $product->load([
            'category:id,name',
        ]);

        $product->setAttribute(
            'total_available_quantity',
            0,
        );

        return response()->json([
            'message' =>
            'Product created successfully.',

            'data' =>
            $this->productData(
                $product,
            ),
        ], 201);
    }

    public function show(
        Product $product,
    ): JsonResponse {
        $product->load([
            'category:id,name',
        ]);

        $batches =
            StockBatch::query()
            ->where(
                'product_id',
                $product->id,
            )
            ->orderByRaw(
                'expiry_date IS NULL',
            )
            ->orderBy(
                'expiry_date',
            )
            ->orderBy(
                'selling_price',
            )
            ->orderBy('id')
            ->get();

        $purchaseItemIds =
            $batches
            ->pluck(
                'purchase_item_id',
            )
            ->filter(
                fn(
                    mixed $value,
                ): bool =>
                $value !== null,
            )
            ->map(
                fn(
                    mixed $value,
                ): int =>
                (int) $value,
            )
            ->unique()
            ->values();

        $purchaseItems =
            $this->loadPurchaseItems(
                $purchaseItemIds,
            );

        $purchaseIds =
            $purchaseItems
            ->map(
                fn(
                    object $item,
                ): ?int =>
                isset(
                    $item->purchase_id,
                )
                    ? (int) $item
                        ->purchase_id
                    : null,
            )
            ->filter()
            ->unique()
            ->values();

        $purchases =
            $this->loadPurchases(
                $purchaseIds,
            );

        $supplierIds =
            $purchases
            ->map(
                fn(
                    object $purchase,
                ): ?int =>
                isset(
                    $purchase->supplier_id,
                )
                    ? (int) $purchase
                        ->supplier_id
                    : null,
            )
            ->filter()
            ->unique()
            ->values();

        $suppliers =
            $this->loadSuppliers(
                $supplierIds,
            );

        $batchDetails =
            $batches
            ->map(
                fn(
                    StockBatch $batch,
                ): array =>
                $this->batchData(
                    $batch,
                    $product,
                    $purchaseItems,
                    $purchases,
                    $suppliers,
                ),
            )
            ->values();

        $priceOptions =
            $this->buildPriceOptions(
                $batchDetails,
            );

        /*
         * These numeric totals are retained for compatibility.
         *
         * Do not append product.unit to them in the UI.
         * Use stock_by_unit for unit-aware display.
         */
        $totalAvailableQuantity =
            round(
                (float) $batchDetails
                    ->sum(
                        'available_quantity',
                    ),
                3,
            );

        $saleableQuantity =
            round(
                (float) $batchDetails
                    ->whereIn(
                        'status',
                        [
                            'available',
                            'expiring_soon',
                        ],
                    )
                    ->sum(
                        'available_quantity',
                    ),
                3,
            );

        $expiredQuantity =
            round(
                (float) $batchDetails
                    ->where(
                        'status',
                        'expired',
                    )
                    ->sum(
                        'available_quantity',
                    ),
                3,
            );

        $totalReceivedQuantity =
            round(
                (float) $batchDetails
                    ->sum(
                        'received_quantity',
                    ),
                3,
            );

        $totalStockValueAtCost =
            round(
                (float) $batchDetails
                    ->sum(
                        'current_cost_value',
                    ),
                2,
            );

        $totalStockValueAtSale =
            round(
                (float) $batchDetails
                    ->sum(
                        'current_sale_value',
                    ),
                2,
            );

        $stockByUnit =
            $this->buildStockByUnit(
                $batchDetails,
            );

        return response()->json([
            'data' => [
                'id' =>
                $product->id,

                'name' =>
                $product->name,

                'sku' =>
                $product->sku,

                'barcode' =>
                $product->barcode,

                /*
                 * Main product/purchase unit.
                 *
                 * Example: Bag.
                 *
                 * This does not necessarily equal the
                 * physical stock unit.
                 */
                'unit' =>
                $product->unit,

                'is_active' =>
                (bool) $product
                    ->is_active,

                'category' =>
                $product->category
                    ? [
                        'id' =>
                        $product
                            ->category
                            ->id,

                        'name' =>
                        $product
                            ->category
                            ->name,
                    ]
                    : null,

                'created_at' =>
                $product
                    ->created_at
                    ?->toISOString(),

                'updated_at' =>
                $product
                    ->updated_at
                    ?->toISOString(),

                'summary' => [
                    'number_of_batches' =>
                    $batchDetails->count(),

                    'number_of_price_options' =>
                    $priceOptions->count(),

                    'total_received_quantity' =>
                    $totalReceivedQuantity,

                    'total_available_quantity' =>
                    $totalAvailableQuantity,

                    'saleable_quantity' =>
                    $saleableQuantity,

                    'expired_quantity' =>
                    $expiredQuantity,

                    'total_stock_value_at_cost' =>
                    $totalStockValueAtCost,

                    'total_stock_value_at_sale' =>
                    $totalStockValueAtSale,

                    'potential_gross_profit' =>
                    round(
                        $totalStockValueAtSale
                            - $totalStockValueAtCost,
                        2,
                    ),

                    /*
                     * Correct physical stock quantity grouped
                     * by physical stock unit.
                     */
                    'stock_by_unit' =>
                    $stockByUnit,
                ],

                'price_options' =>
                $priceOptions,

                'batches' =>
                $batchDetails,
            ],
        ]);
    }

    public function update(
        UpdateProductRequest $request,
        Product $product,
    ): JsonResponse {
        $validated =
            $request->validated();

        $product->forceFill([
            'category_id' =>
            (int) $validated['category_id'],

            'name' =>
            trim(
                $validated['name'],
            ),

            'unit' =>
            trim(
                $validated['unit'],
            ),

            'barcode' =>
            $this->normaliseBarcode(
                $validated['barcode']
                    ?? null,
            ),
        ]);

        $product->save();

        $product->load([
            'category:id,name',
        ]);

        $product->loadSum(
            'stockBatches as total_available_quantity',
            'available_quantity',
        );

        return response()->json([
            'message' =>
            'Product updated successfully.',

            'data' =>
            $this->productData(
                $product,
            ),
        ]);
    }

    public function destroy(
        Product $product,
    ): JsonResponse {
        $usageMessage =
            $this->productUsageMessage(
                $product,
            );

        if ($usageMessage !== null) {
            return response()->json([
                'message' =>
                $usageMessage,
            ], 422);
        }

        $product->delete();

        return response()->json([
            'message' =>
            'Product deleted successfully.',
        ]);
    }

    /**
     * Build product-list stock grouped by the ACTUAL
     * physical stock unit.
     *
     * Example:
     *
     * Product main unit:
     * Bag
     *
     * Dual batch:
     * 1 Bag = 100 Kg
     *
     * available_quantity:
     * 95
     *
     * Result:
     *
     * [
     *     [
     *         'unit' => 'Kg',
     *         'available_quantity' => 95,
     *     ]
     * ]
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildAvailableStockByUnit(
        Product $product,
    ): array {
        if (
            $product->relationLoaded(
                'stockBatches',
            )
        ) {
            $batches =
                $product->stockBatches;
        } else {
            $batches =
                StockBatch::query()
                ->where(
                    'product_id',
                    $product->id,
                )
                ->get([
                    'id',
                    'product_id',
                    'available_quantity',
                    'received_quantity',
                    'is_dual_unit',
                    'stock_unit',
                    'secondary_unit',
                    'conversion_factor',
                ]);
        }

        if ($batches->isEmpty()) {
            $defaultUnit =
                trim(
                    (string) $product->unit,
                );

            return [
                [
                    'unit' =>
                    $defaultUnit !== ''
                        ? $defaultUnit
                        : 'Unit',

                    'available_quantity' =>
                    0,
                ],
            ];
        }

        $stockByUnit = [];

        foreach ($batches as $batch) {
            /*
             * IMPORTANT:
             *
             * For dual-unit stock we intentionally prefer
             * secondary_unit as the physical stock unit.
             *
             * This also fixes older records where:
             *
             * is_dual_unit = 1
             * stock_unit = Bag      <- old incorrect value
             * secondary_unit = Kg
             * conversion_factor = 100
             *
             * Physical stock must be displayed as Kg.
             */
            $stockUnit =
                $this->resolvePhysicalStockUnit(
                    $product,
                    $batch->getAttribute(
                        'is_dual_unit',
                    ),
                    $batch->getAttribute(
                        'stock_unit',
                    ),
                    $batch->getAttribute(
                        'secondary_unit',
                    ),
                    $batch->getAttribute(
                        'conversion_factor',
                    ),
                );

            $availableQuantity =
                round(
                    (float) (
                        $batch->available_quantity
                        ?? 0
                    ),
                    3,
                );

            if (
                !array_key_exists(
                    $stockUnit,
                    $stockByUnit,
                )
            ) {
                $stockByUnit[$stockUnit] = 0.0;
            }

            $stockByUnit[$stockUnit] +=
                $availableQuantity;
        }

        return collect(
            $stockByUnit,
        )
            ->map(
                fn(
                    float $quantity,
                    string $unit,
                ): array => [
                    'unit' =>
                    $unit,

                    'available_quantity' =>
                    round(
                        $quantity,
                        3,
                    ),
                ],
            )
            ->values()
            ->all();
    }

    /**
     * @param Collection<int, int> $purchaseItemIds
     *
     * @return Collection<int, object>
     */
    private function loadPurchaseItems(
        Collection $purchaseItemIds,
    ): Collection {
        if (
            $purchaseItemIds->isEmpty()
            || !Schema::hasTable(
                'purchase_items',
            )
        ) {
            return collect();
        }

        return DB::table(
            'purchase_items',
        )
            ->whereIn(
                'id',
                $purchaseItemIds->all(),
            )
            ->get()
            ->keyBy(
                fn(
                    object $item,
                ): int =>
                (int) $item->id,
            );
    }

    /**
     * @param Collection<int, int> $purchaseIds
     *
     * @return Collection<int, object>
     */
    private function loadPurchases(
        Collection $purchaseIds,
    ): Collection {
        if (
            $purchaseIds->isEmpty()
            || !Schema::hasTable(
                'purchases',
            )
        ) {
            return collect();
        }

        return DB::table(
            'purchases',
        )
            ->whereIn(
                'id',
                $purchaseIds->all(),
            )
            ->get()
            ->keyBy(
                fn(
                    object $purchase,
                ): int =>
                (int) $purchase->id,
            );
    }

    /**
     * @param Collection<int, int> $supplierIds
     *
     * @return Collection<int, object>
     */
    private function loadSuppliers(
        Collection $supplierIds,
    ): Collection {
        if (
            $supplierIds->isEmpty()
            || !Schema::hasTable(
                'suppliers',
            )
        ) {
            return collect();
        }

        return DB::table(
            'suppliers',
        )
            ->whereIn(
                'id',
                $supplierIds->all(),
            )
            ->get()
            ->keyBy(
                fn(
                    object $supplier,
                ): int =>
                (int) $supplier->id,
            );
    }

    /**
     * @param Collection<int, object> $purchaseItems
     * @param Collection<int, object> $purchases
     * @param Collection<int, object> $suppliers
     *
     * @return array<string, mixed>
     */
    private function batchData(
        StockBatch $batch,
        Product $product,
        Collection $purchaseItems,
        Collection $purchases,
        Collection $suppliers,
    ): array {
        $purchaseItemId =
            $batch->purchase_item_id
            !== null
            ? (int) $batch
                ->purchase_item_id
            : null;

        $purchaseItem =
            $purchaseItemId !== null
            ? $purchaseItems->get(
                $purchaseItemId,
            )
            : null;

        $purchaseId =
            $purchaseItem
            && isset(
                $purchaseItem
                    ->purchase_id,
            )
            ? (int) $purchaseItem
                ->purchase_id
            : null;

        $purchase =
            $purchaseId !== null
            ? $purchases->get(
                $purchaseId,
            )
            : null;

        $supplierId =
            $purchase
            && isset(
                $purchase
                    ->supplier_id,
            )
            ? (int) $purchase
                ->supplier_id
            : null;

        $supplier =
            $supplierId !== null
            ? $suppliers->get(
                $supplierId,
            )
            : null;

        /*
         * PRIMARY / PURCHASE UNIT
         *
         * Example: Bag
         */
        $purchaseUnitName =
            $purchaseItem
            && isset(
                $purchaseItem
                    ->purchase_unit_name,
            )
            && trim(
                (string) $purchaseItem
                    ->purchase_unit_name,
            ) !== ''
            ? trim(
                (string) $purchaseItem
                    ->purchase_unit_name,
            )
            : trim(
                (string) $product->unit,
            );

        if ($purchaseUnitName === '') {
            $purchaseUnitName =
                'Unit';
        }

        $batchDualValue =
            $batch->getAttribute(
                'is_dual_unit',
            );

        $purchaseDualValue =
            $purchaseItem
            && isset(
                $purchaseItem
                    ->is_dual_unit,
            )
            ? $purchaseItem
            ->is_dual_unit
            : null;

        $secondaryUnit =
            $this->cleanString(
                $batch->getAttribute(
                    'secondary_unit',
                ),
            )
            ?? $this->cleanString(
                $purchaseItem
                    ->secondary_unit
                    ?? null,
            );

        $conversionFactor =
            $this->positiveFloat(
                $batch->getAttribute(
                    'conversion_factor',
                ),
            )
            ?? $this->positiveFloat(
                $purchaseItem
                    ->conversion_factor
                    ?? null,
            )
            ?? 1.0;

        $isDualUnit =
            $this->booleanValue(
                $batchDualValue,
            )
            || $this->booleanValue(
                $purchaseDualValue,
            );

        if (
            !$isDualUnit
            && $secondaryUnit !== null
            && $conversionFactor > 1
        ) {
            $isDualUnit =
                true;
        }

        /*
         * CRITICAL FIX:
         *
         * If this is a dual-unit batch:
         *
         * 1 Bag = 100 Kg
         *
         * physical stock is Kg.
         *
         * Even if an old database row accidentally contains:
         *
         * stock_unit = Bag
         *
         * we prefer secondary_unit = Kg.
         */
        $stockUnit =
            $this->resolvePhysicalStockUnit(
                $product,
                $isDualUnit,
                $batch->getAttribute(
                    'stock_unit',
                ),
                $secondaryUnit,
                $conversionFactor,
            );

        /*
         * PURCHASE COST PER PRIMARY UNIT
         *
         * Example:
         * Rs. 2,000 / Bag
         */
        $unitCost =
            $purchaseItem
            && isset(
                $purchaseItem
                    ->unit_cost,
            )
            ? (float) $purchaseItem
                ->unit_cost
            : (
                $batch->purchase_cost
                !== null
                ? (float) $batch
                    ->purchase_cost
                : null
            );

        /*
         * COST PER PHYSICAL STOCK UNIT
         *
         * Example:
         *
         * Rs. 2,000 / Bag
         * 1 Bag = 100 Kg
         *
         * Base cost = Rs. 20 / Kg
         */
        $baseUnitCostAttribute =
            $batch->getAttribute(
                'base_unit_cost',
            );

        $baseUnitCost =
            $baseUnitCostAttribute
            !== null
            && $baseUnitCostAttribute !== ''
            ? (float) $baseUnitCostAttribute
            : null;

        if (
            $baseUnitCost === null
            && $unitCost !== null
        ) {
            if (
                $isDualUnit
                && $conversionFactor > 0
            ) {
                $baseUnitCost =
                    $unitCost
                    / $conversionFactor;
            } else {
                $baseUnitCost =
                    $unitCost;
            }
        }

        /*
         * PRIMARY SELLING PRICE
         *
         * Example:
         * Rs. 3,000 / Bag
         */
        $sellingPrice =
            $batch->selling_price
            !== null
            ? (float) $batch
                ->selling_price
            : (
                $purchaseItem
                && isset(
                    $purchaseItem
                        ->selling_price,
                )
                ? (float) $purchaseItem
                    ->selling_price
                : 0
            );

        /*
         * LOOSE / SECONDARY SELLING PRICE
         *
         * Example:
         * Rs. 35 / Kg
         */
        $secondarySellingPriceAttribute =
            $batch->getAttribute(
                'secondary_selling_price',
            );

        $secondarySellingPrice =
            $secondarySellingPriceAttribute
            !== null
            && $secondarySellingPriceAttribute !== ''
            ? (float) $secondarySellingPriceAttribute
            : (
                $purchaseItem
                && isset(
                    $purchaseItem
                        ->secondary_selling_price,
                )
                && $purchaseItem
                ->secondary_selling_price !== null
                ? (float) $purchaseItem
                    ->secondary_selling_price
                : null
            );

        /*
         * PURCHASE QUANTITY
         *
         * Example:
         * 1 Bag
         */
        $purchasedQuantity =
            $purchaseItem
            && isset(
                $purchaseItem
                    ->quantity,
            )
            ? (float) $purchaseItem
                ->quantity
            : 0;

        /*
         * RECEIVED PURCHASE UNITS
         *
         * Example:
         * 1 Bag
         */
        $receivedPurchaseQuantity =
            $purchaseItem
            && isset(
                $purchaseItem
                    ->received_quantity,
            )
            ? (float) $purchaseItem
                ->received_quantity
            : $purchasedQuantity;

        /*
         * PHYSICAL QUANTITY RECEIVED
         *
         * Example:
         * 100 Kg
         */
        $batchReceivedQuantity =
            $batch->getAttribute(
                'received_quantity',
            );

        if (
            $batchReceivedQuantity !== null
            && $batchReceivedQuantity !== ''
        ) {
            $receivedQuantity =
                (float) $batchReceivedQuantity;
        } elseif (
            $isDualUnit
            && $purchaseItem
            && isset(
                $purchaseItem
                    ->base_received_quantity,
            )
            && $purchaseItem
            ->base_received_quantity !== null
        ) {
            $receivedQuantity =
                (float) $purchaseItem
                    ->base_received_quantity;
        } elseif ($isDualUnit) {
            $receivedQuantity =
                $receivedPurchaseQuantity
                * $conversionFactor;
        } else {
            $receivedQuantity =
                $receivedPurchaseQuantity;
        }

        $receivedQuantity =
            round(
                $receivedQuantity,
                3,
            );

        /*
         * CURRENT PHYSICAL STOCK
         *
         * Example after selling 5 Kg:
         * 95 Kg
         */
        $availableQuantity =
            round(
                (float) $batch
                    ->available_quantity,
                3,
            );

        if (
            $isDualUnit
            && $conversionFactor > 0
        ) {
            $fullUnitsAvailable =
                (int) floor(
                    (
                        $availableQuantity
                        + 0.0000001
                    )
                        / $conversionFactor,
                );

            $looseQuantityAvailable =
                round(
                    max(
                        0,
                        $availableQuantity
                            - (
                                $fullUnitsAvailable
                                * $conversionFactor
                            ),
                    ),
                    3,
                );
        } else {
            $fullUnitsAvailable =
                $availableQuantity;

            $looseQuantityAvailable =
                0;
        }

        $purchaseManufacturedDate =
            $purchaseItem
            && isset(
                $purchaseItem
                    ->manufactured_date,
            )
            ? $purchaseItem
            ->manufactured_date
            : null;

        $purchaseExpiryDate =
            $purchaseItem
            && isset(
                $purchaseItem
                    ->expiry_date,
            )
            ? $purchaseItem
            ->expiry_date
            : null;

        $manufacturedDate =
            $this->formatDateValue(
                $batch->getAttribute(
                    'manufactured_date',
                )
                    ?? $purchaseManufacturedDate,
            );

        $expiryDate =
            $this->formatDateValue(
                $batch->expiry_date
                    ?? $purchaseExpiryDate,
            );

        $status =
            $this->resolveBatchStatus(
                $availableQuantity,
                $expiryDate,
            );

        $supplierName =
            $this->firstObjectValue(
                $supplier,
                [
                    'name',
                    'company_name',
                    'business_name',
                    'supplier_name',
                ],
            );

        $purchaseNumber =
            $this->firstObjectValue(
                $purchase,
                [
                    'purchase_number',
                    'reference_number',
                    'invoice_number',
                    'purchase_no',
                ],
            );

        $purchaseDate =
            $this->formatDateValue(
                $this->firstObjectValue(
                    $purchase,
                    [
                        'purchase_date',
                        'date',
                        'created_at',
                    ],
                ),
            );

        $purchaseBatchNumber =
            $purchaseItem
            && isset(
                $purchaseItem
                    ->batch_number,
            )
            ? $purchaseItem
            ->batch_number
            : null;

        $batchNumber =
            $batch->batch_number
            ?? $purchaseBatchNumber;

        /*
         * CORRECT COST VALUE
         *
         * Dual:
         * available Kg × cost/Kg
         *
         * Standard:
         * available Bag × cost/Bag
         */
        $currentCostValue =
            $baseUnitCost !== null
            ? round(
                $baseUnitCost
                    * $availableQuantity,
                2,
            )
            : 0;

        /*
         * CORRECT EXPECTED SALE VALUE
         */
        if (
            $isDualUnit
            && $conversionFactor > 0
        ) {
            $fullUnitSaleValue =
                $fullUnitsAvailable
                * $sellingPrice;

            $effectiveSecondarySellingPrice =
                $secondarySellingPrice
                ?? (
                    $sellingPrice
                    / $conversionFactor
                );

            $looseSaleValue =
                $looseQuantityAvailable
                * $effectiveSecondarySellingPrice;

            $currentSaleValue =
                round(
                    $fullUnitSaleValue
                        + $looseSaleValue,
                    2,
                );
        } else {
            $currentSaleValue =
                round(
                    $sellingPrice
                        * $availableQuantity,
                    2,
                );
        }

        $profitPerPrimaryUnit =
            $unitCost !== null
            ? round(
                $sellingPrice
                    - $unitCost,
                2,
            )
            : null;

        if ($baseUnitCost !== null) {
            if (
                $isDualUnit
                && $conversionFactor > 0
            ) {
                $physicalSellingPrice =
                    $secondarySellingPrice
                    ?? (
                        $sellingPrice
                        / $conversionFactor
                    );

                $profitPerStockUnit =
                    round(
                        $physicalSellingPrice
                            - $baseUnitCost,
                        4,
                    );
            } else {
                $profitPerStockUnit =
                    round(
                        $sellingPrice
                            - $baseUnitCost,
                        4,
                    );
            }
        } else {
            $profitPerStockUnit =
                null;
        }

        $notes =
            $purchaseItem
            && isset(
                $purchaseItem
                    ->notes,
            )
            ? $purchaseItem
            ->notes
            : null;

        return [
            'id' =>
            $batch->id,

            'purchase_item_id' =>
            $purchaseItemId,

            'purchase_id' =>
            $purchaseId,

            'purchase_number' =>
            $purchaseNumber,

            'purchase_date' =>
            $purchaseDate,

            'supplier' =>
            $supplierId !== null
                ? [
                    'id' =>
                    $supplierId,

                    'name' =>
                    $supplierName
                        ?? 'Supplier not available',
                ]
                : null,

            'batch_code' =>
            $batch->batch_code,

            'batch_number' =>
            $batchNumber,

            /*
             * UNIT INFORMATION
             */
            'is_dual_unit' =>
            $isDualUnit,

            'primary_unit' =>
            $purchaseUnitName,

            'purchase_unit_name' =>
            $purchaseUnitName,

            'stock_unit' =>
            $stockUnit,

            'secondary_unit' =>
            $secondaryUnit,

            'conversion_factor' =>
            round(
                $conversionFactor,
                3,
            ),

            /*
             * PURCHASE QUANTITIES
             */
            'purchased_quantity' =>
            round(
                $purchasedQuantity,
                3,
            ),

            'received_purchase_quantity' =>
            round(
                $receivedPurchaseQuantity,
                3,
            ),

            /*
             * PHYSICAL STOCK QUANTITIES
             */
            'received_quantity' =>
            $receivedQuantity,

            'available_quantity' =>
            $availableQuantity,

            'full_units_available' =>
            $fullUnitsAvailable,

            'loose_quantity_available' =>
            $looseQuantityAvailable,

            /*
             * COSTS
             */
            'unit_cost' =>
            $unitCost,

            'cost_price' =>
            $unitCost,

            'base_unit_cost' =>
            $baseUnitCost !== null
                ? round(
                    $baseUnitCost,
                    4,
                )
                : null,

            /*
             * SELLING PRICES
             */
            'selling_price' =>
            $sellingPrice,

            'secondary_selling_price' =>
            $secondarySellingPrice,

            /*
             * PROFITS
             */
            'profit_per_unit' =>
            $profitPerPrimaryUnit,

            'profit_per_stock_unit' =>
            $profitPerStockUnit,

            'discount' =>
            $purchaseItem
                && isset(
                    $purchaseItem
                        ->discount,
                )
                ? (float) $purchaseItem
                    ->discount
                : 0,

            'line_total' =>
            $purchaseItem
                && isset(
                    $purchaseItem
                        ->line_total,
                )
                ? (float) $purchaseItem
                    ->line_total
                : null,

            'current_cost_value' =>
            $currentCostValue,

            'current_sale_value' =>
            $currentSaleValue,

            'manufactured_date' =>
            $manufacturedDate,

            'expiry_date' =>
            $expiryDate,

            'received_at' =>
            $this->formatDateTimeValue(
                $batch->received_at,
            ),

            'notes' =>
            $notes,

            'status' =>
            $status,
        ];
    }

    /**
     * @param Collection<int, array<string, mixed>> $batches
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function buildPriceOptions(
        Collection $batches,
    ): Collection {
        return $batches
            ->groupBy(
                function (
                    array $batch,
                ): string {
                    return implode(
                        '|',
                        [
                            number_format(
                                (float) $batch['selling_price'],
                                2,
                                '.',
                                '',
                            ),

                            (string) (
                                $batch['primary_unit']
                                ?? ''
                            ),

                            (string) (
                                $batch['stock_unit']
                                ?? ''
                            ),

                            (string) (
                                $batch['secondary_unit']
                                ?? ''
                            ),

                            number_format(
                                (float) (
                                    $batch['conversion_factor']
                                    ?? 1
                                ),
                                3,
                                '.',
                                '',
                            ),
                        ],
                    );
                },
            )
            ->map(
                function (
                    Collection $priceBatches,
                ): array {
                    $first =
                        $priceBatches->first();

                    $costPrices =
                        $priceBatches
                        ->pluck(
                            'unit_cost',
                        )
                        ->filter(
                            fn(
                                mixed $value,
                            ): bool =>
                            $value !== null,
                        )
                        ->map(
                            fn(
                                mixed $value,
                            ): float =>
                            (float) $value,
                        )
                        ->values();

                    return [
                        'selling_price' =>
                        (float) $first['selling_price'],

                        'secondary_selling_price' =>
                        $first['secondary_selling_price'] !== null
                            ? (float) $first['secondary_selling_price']
                            : null,

                        'is_dual_unit' =>
                        (bool) $first['is_dual_unit'],

                        'primary_unit' =>
                        (string) $first['primary_unit'],

                        'stock_unit' =>
                        (string) $first['stock_unit'],

                        'secondary_unit' =>
                        $first['secondary_unit'],

                        'conversion_factor' =>
                        (float) $first['conversion_factor'],

                        'cost_price_min' =>
                        $costPrices->isEmpty()
                            ? null
                            : (float) $costPrices
                                ->min(),

                        'cost_price_max' =>
                        $costPrices->isEmpty()
                            ? null
                            : (float) $costPrices
                                ->max(),

                        'available_quantity' =>
                        round(
                            (float) $priceBatches
                                ->sum(
                                    'available_quantity',
                                ),
                            3,
                        ),

                        'saleable_quantity' =>
                        round(
                            (float) $priceBatches
                                ->whereIn(
                                    'status',
                                    [
                                        'available',
                                        'expiring_soon',
                                    ],
                                )
                                ->sum(
                                    'available_quantity',
                                ),
                            3,
                        ),

                        'expired_quantity' =>
                        round(
                            (float) $priceBatches
                                ->where(
                                    'status',
                                    'expired',
                                )
                                ->sum(
                                    'available_quantity',
                                ),
                            3,
                        ),

                        'batch_count' =>
                        $priceBatches
                            ->count(),

                        'batches' =>
                        $priceBatches
                            ->values(),
                    ];
                },
            )
            ->sortBy(
                'selling_price',
            )
            ->values();
    }

    /**
     * Product-details physical stock summary.
     *
     * @param Collection<int, array<string, mixed>> $batches
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildStockByUnit(
        Collection $batches,
    ): array {
        return $batches
            ->groupBy(
                fn(
                    array $batch,
                ): string =>
                trim(
                    (string) (
                        $batch['stock_unit']
                        ?? 'Unit'
                    ),
                ),
            )
            ->map(
                function (
                    Collection $unitBatches,
                    mixed $unit,
                ): array {
                    $unitName =
                        trim(
                            (string) $unit,
                        );

                    if ($unitName === '') {
                        $unitName =
                            'Unit';
                    }

                    return [
                        'unit' =>
                        $unitName,

                        'total_received_quantity' =>
                        round(
                            (float) $unitBatches
                                ->sum(
                                    'received_quantity',
                                ),
                            3,
                        ),

                        'total_available_quantity' =>
                        round(
                            (float) $unitBatches
                                ->sum(
                                    'available_quantity',
                                ),
                            3,
                        ),

                        'saleable_quantity' =>
                        round(
                            (float) $unitBatches
                                ->whereIn(
                                    'status',
                                    [
                                        'available',
                                        'expiring_soon',
                                    ],
                                )
                                ->sum(
                                    'available_quantity',
                                ),
                            3,
                        ),

                        'expired_quantity' =>
                        round(
                            (float) $unitBatches
                                ->where(
                                    'status',
                                    'expired',
                                )
                                ->sum(
                                    'available_quantity',
                                ),
                            3,
                        ),
                    ];
                },
            )
            ->values()
            ->all();
    }

    /**
     * Resolve the ACTUAL physical inventory unit.
     *
     * For normal stock:
     *
     * product.unit = Bottle
     * stock_unit = Bottle
     *
     * Result:
     * Bottle
     *
     * For dual stock:
     *
     * product.unit = Bag
     * secondary_unit = Kg
     * conversion_factor = 100
     *
     * Result:
     * Kg
     *
     * We intentionally prefer the secondary unit for
     * dual-unit stock because inventory quantities are
     * stored in the base/physical unit.
     */
    private function resolvePhysicalStockUnit(
        Product $product,
        mixed $isDualUnitValue,
        mixed $stockUnitValue,
        mixed $secondaryUnitValue,
        mixed $conversionFactorValue,
    ): string {
        $stockUnit =
            $this->cleanString(
                $stockUnitValue,
            );

        $secondaryUnit =
            $this->cleanString(
                $secondaryUnitValue,
            );

        $conversionFactor =
            $this->positiveFloat(
                $conversionFactorValue,
            )
            ?? 1.0;

        $isDualUnit =
            $this->booleanValue(
                $isDualUnitValue,
            );

        /*
         * Compatibility:
         *
         * Some old records may not have is_dual_unit set
         * but still contain:
         *
         * secondary_unit = Kg
         * conversion_factor = 100
         */
        if (
            !$isDualUnit
            && $secondaryUnit !== null
            && $conversionFactor > 1
        ) {
            $isDualUnit =
                true;
        }

        /*
         * CRITICAL:
         *
         * Dual-unit inventory is physically maintained in
         * the secondary/base unit.
         *
         * Therefore:
         *
         * Bag -> Kg
         * Piece -> Gram
         *
         * etc.
         */
        if (
            $isDualUnit
            && $secondaryUnit !== null
            && $conversionFactor > 1
        ) {
            return $secondaryUnit;
        }

        if ($stockUnit !== null) {
            return $stockUnit;
        }

        $productUnit =
            trim(
                (string) $product->unit,
            );

        return $productUnit !== ''
            ? $productUnit
            : 'Unit';
    }

    private function resolveBatchStatus(
        float $availableQuantity,
        ?string $expiryDate,
    ): string {
        if ($availableQuantity <= 0) {
            return 'out_of_stock';
        }

        if (!$expiryDate) {
            return 'available';
        }

        try {
            $expiry =
                Carbon::parse(
                    $expiryDate,
                )->startOfDay();

            if (
                $expiry->lt(
                    today(),
                )
            ) {
                return 'expired';
            }

            if (
                $expiry->lte(
                    today()
                        ->copy()
                        ->addDays(30),
                )
            ) {
                return 'expiring_soon';
            }
        } catch (Throwable) {
            return 'available';
        }

        return 'available';
    }

    private function booleanValue(
        mixed $value,
    ): bool {
        if (
            $value === true
            || $value === 1
            || $value === '1'
        ) {
            return true;
        }

        if (is_string($value)) {
            return in_array(
                strtolower(
                    trim(
                        $value,
                    ),
                ),
                [
                    'true',
                    'yes',
                    'on',
                ],
                true,
            );
        }

        return false;
    }

    private function positiveFloat(
        mixed $value,
    ): ?float {
        if (
            $value === null
            || $value === ''
        ) {
            return null;
        }

        if (!is_numeric($value)) {
            return null;
        }

        $numericValue =
            (float) $value;

        return $numericValue > 0
            ? $numericValue
            : null;
    }

    private function cleanString(
        mixed $value,
    ): ?string {
        if ($value === null) {
            return null;
        }

        $cleaned =
            trim(
                (string) $value,
            );

        return $cleaned !== ''
            ? $cleaned
            : null;
    }

    private function formatDateValue(
        mixed $value,
    ): ?string {
        if (
            $value === null
            || $value === ''
        ) {
            return null;
        }

        if (
            $value
            instanceof DateTimeInterface
        ) {
            return $value->format(
                'Y-m-d',
            );
        }

        try {
            return Carbon::parse(
                (string) $value,
            )->format(
                'Y-m-d',
            );
        } catch (Throwable) {
            return (string) $value;
        }
    }

    private function formatDateTimeValue(
        mixed $value,
    ): ?string {
        if (
            $value === null
            || $value === ''
        ) {
            return null;
        }

        if (
            $value
            instanceof DateTimeInterface
        ) {
            return $value->format(
                DateTimeInterface::ATOM,
            );
        }

        try {
            return Carbon::parse(
                (string) $value,
            )->toISOString();
        } catch (Throwable) {
            return (string) $value;
        }
    }

    /**
     * @param array<int, string> $keys
     */
    private function firstObjectValue(
        ?object $record,
        array $keys,
    ): mixed {
        if (!$record) {
            return null;
        }

        foreach ($keys as $key) {
            if (
                isset(
                    $record->{$key},
                )
                && $record->{$key} !== ''
            ) {
                return $record->{$key};
            }
        }

        return null;
    }

    private function normaliseBarcode(
        mixed $barcode,
    ): ?string {
        if (
            $barcode === null
            || trim(
                (string) $barcode,
            ) === ''
        ) {
            return null;
        }

        return trim(
            (string) $barcode,
        );
    }

    private function productUsageMessage(
        Product $product,
    ): ?string {
        $usageTables = [
            'purchase_items' =>
            'This product has purchase records and cannot be deleted.',

            'stock_batches' =>
            'This product has stock batches and cannot be deleted.',

            'sale_items' =>
            'This product has sales records and cannot be deleted.',

            'sale_return_items' =>
            'This product has return records and cannot be deleted.',

            'sales_return_items' =>
            'This product has return records and cannot be deleted.',
        ];

        foreach (
            $usageTables as
            $table => $message
        ) {
            if (
                !Schema::hasTable(
                    $table,
                )
            ) {
                continue;
            }

            if (
                DB::table($table)
                ->where(
                    'product_id',
                    $product->id,
                )
                ->exists()
            ) {
                return $message;
            }
        }

        return null;
    }

    /**
     * Product data used by the Products list page.
     *
     * @return array<string, mixed>
     */
    private function productData(
        Product $product,
    ): array {
        /*
         * THIS WAS THE MISSING PART IN YOUR CURRENT CODE.
         *
         * Without this call the API never sends
         * available_stock_by_unit, so the frontend falls
         * back to product.unit and displays Bag.
         */
        $availableStockByUnit =
            $this->buildAvailableStockByUnit(
                $product,
            );

        return [
            'id' =>
            $product->id,

            'name' =>
            $product->name,

            'sku' =>
            $product->sku,

            'barcode' =>
            $product->barcode,

            /*
             * Main unit only.
             *
             * Example:
             * Bag
             */
            'unit' =>
            $product->unit,

            'is_active' =>
            (bool) $product
                ->is_active,

            'category' =>
            $product->category
                ? [
                    'id' =>
                    $product
                        ->category
                        ->id,

                    'name' =>
                    $product
                        ->category
                        ->name,
                ]
                : null,

            /*
             * Legacy numeric total.
             *
             * Do not combine this with product.unit in
             * frontend stock displays.
             */
            'total_available_quantity' =>
            round(
                (float) (
                    $product
                    ->total_available_quantity
                    ?? collect(
                        $availableStockByUnit,
                    )->sum(
                        'available_quantity',
                    )
                ),
                3,
            ),

            /*
             * AUTHORITATIVE stock quantity + unit for the
             * Products list page.
             */
            'available_stock_by_unit' =>
            $availableStockByUnit,

            'created_at' =>
            $product
                ->created_at
                ?->toISOString(),

            'updated_at' =>
            $product
                ->updated_at
                ?->toISOString(),
        ];
    }
}
