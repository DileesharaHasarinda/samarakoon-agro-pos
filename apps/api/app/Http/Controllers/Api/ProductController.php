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

        $search = trim(
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

        $products = Product::query()
            ->with([
                'category:id,name',
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

        $data = collect(
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
            'data' => $data,

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
        $products = Product::query()
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
                ) => $query->where(
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
            'data' => $products,
        ]);
    }

    public function store(
        StoreProductRequest $request,
    ): JsonResponse {
        $validated =
            $request->validated();

        $product = DB::transaction(
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

        $batches = StockBatch::query()
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

        $purchaseItemIds = $batches
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

        $purchaseIds = $purchaseItems
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

        $supplierIds = $purchases
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

        $batchDetails = $batches
            ->map(
                fn(
                    StockBatch $batch,
                ): array =>
                $this->batchData(
                    $batch,
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

        $unitCost =
            $purchaseItem
            && isset(
                $purchaseItem
                    ->unit_cost,
            )
            ? (float) $purchaseItem
                ->unit_cost
            : null;

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

        $purchasedQuantity =
            $purchaseItem
            && isset(
                $purchaseItem
                    ->quantity,
            )
            ? (float) $purchaseItem
                ->quantity
            : 0;

        $receivedQuantity =
            $purchaseItem
            && isset(
                $purchaseItem
                    ->received_quantity,
            )
            ? (float) $purchaseItem
                ->received_quantity
            : $purchasedQuantity;

        $availableQuantity =
            round(
                (float) $batch
                    ->available_quantity,
                3,
            );

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

        $currentCostValue =
            $unitCost !== null
            ? round(
                $unitCost
                    * $availableQuantity,
                2,
            )
            : 0;

        $currentSaleValue =
            round(
                $sellingPrice
                    * $availableQuantity,
                2,
            );

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

            'purchased_quantity' =>
            round(
                $purchasedQuantity,
                3,
            ),

            'received_quantity' =>
            round(
                $receivedQuantity,
                3,
            ),

            'available_quantity' =>
            $availableQuantity,

            'unit_cost' =>
            $unitCost,

            'cost_price' =>
            $unitCost,

            'selling_price' =>
            $sellingPrice,

            'profit_per_unit' =>
            $unitCost !== null
                ? round(
                    $sellingPrice
                        - $unitCost,
                    2,
                )
                : null,

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
                fn(
                    array $batch,
                ): string =>
                number_format(
                    (float) $batch['selling_price'],
                    2,
                    '.',
                    '',
                ),
            )
            ->map(
                function (
                    Collection $priceBatches,
                ): array {
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
                        (float) $priceBatches
                            ->first()['selling_price'],

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
     * @return array<string, mixed>
     */
    private function productData(
        Product $product,
    ): array {
        return [
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

            'total_available_quantity' =>
            round(
                (float) (
                    $product
                    ->total_available_quantity
                    ?? 0
                ),
                3,
            ),

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
