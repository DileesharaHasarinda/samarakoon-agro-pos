<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Models\Product;
use App\Models\ProductVariant;
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
use Illuminate\Validation\ValidationException;
use Throwable;

class ProductController extends Controller
{
    /*
     * =====================================================
     * PRODUCT LIST
     * =====================================================
     */

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

        $products =
            Product::query()
            ->with([
                'category:id,name',

                'variants' =>
                function (
                    $query,
                ): void {
                    $query
                        ->orderBy(
                            'sort_order',
                        )
                        ->orderBy(
                            'id',
                        );
                },

                'stockBatches' =>
                function (
                    $query,
                ): void {
                    $query->select([
                        'id',
                        'product_id',
                        'product_variant_id',
                        'purchase_item_id',
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
                ) use (
                    $search,
                ): void {
                    $query->where(
                        function (
                            Builder $searchQuery,
                        ) use (
                            $search,
                        ): void {
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
                                    ) use (
                                        $search,
                                    ): void {
                                        $categoryQuery
                                            ->where(
                                                'name',
                                                'like',
                                                "%{$search}%",
                                            );
                                    },
                                )
                                ->orWhereHas(
                                    'variants',
                                    function (
                                        Builder $variantQuery,
                                    ) use (
                                        $search,
                                    ): void {
                                        $variantQuery
                                            ->where(
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
                                                'size_value',
                                                'like',
                                                "%{$search}%",
                                            )
                                            ->orWhere(
                                                'size_unit',
                                                'like',
                                                "%{$search}%",
                                            )
                                            ->orWhere(
                                                'package_unit',
                                                'like',
                                                "%{$search}%",
                                            );
                                    },
                                );
                        },
                    );
                },
            )
            ->orderBy(
                'name',
            )
            ->paginate(
                $perPage,
            );

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

    /*
     * =====================================================
     * PRODUCT OPTIONS
     * =====================================================
     */

    public function options(): JsonResponse
    {
        $products =
            Product::query()
            ->with([
                'category:id,name',

                'variants' =>
                function (
                    $query,
                ): void {
                    $query
                        ->orderBy(
                            'sort_order',
                        )
                        ->orderBy(
                            'id',
                        );
                },
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
            ->orderBy(
                'name',
            )
            ->get()
            ->map(
                function (
                    Product $product,
                ): array {
                    $variants =
                        $product
                        ->variants
                        ->map(
                            fn(
                                ProductVariant $variant,
                            ): array => [
                                'id' =>
                                $variant->id,

                                'display_name' =>
                                $variant
                                    ->displayName(),

                                'size_value' =>
                                (float) $variant
                                    ->size_value,

                                'size_unit' =>
                                $variant
                                    ->size_unit,

                                'package_unit' =>
                                $variant
                                    ->package_unit,

                                'sku' =>
                                $variant
                                    ->sku,

                                'barcode' =>
                                $variant
                                    ->barcode,

                                'is_active' =>
                                (bool) $variant
                                    ->is_active,
                            ],
                        )
                        ->values()
                        ->all();

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

                        'has_variants' =>
                        count(
                            $variants,
                        ) > 0,

                        'variants' =>
                        $variants,

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
                    ];
                },
            )
            ->values();

        return response()->json([
            'data' =>
            $products,
        ]);
    }

    /*
     * =====================================================
     * CREATE PRODUCT
     * =====================================================
     */

    public function store(
        StoreProductRequest $request,
    ): JsonResponse {
        $validated =
            $request->validated();

        $this->validateBarcodeNamespace(
            $validated['barcode']
                ?? null,
            $validated['variants']
                ?? [],
        );

        $product =
            DB::transaction(
                function () use (
                    $validated,
                ): Product {
                    $temporarySku =
                        'TMP-'
                        . Str::upper(
                            Str::random(
                                16,
                            ),
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

                    $this->syncVariants(
                        $product,
                        $validated['variants']
                            ?? [],
                    );

                    return $product;
                },
            );

        $product->load([
            'category:id,name',

            'variants' =>
            function (
                $query,
            ): void {
                $query
                    ->orderBy(
                        'sort_order',
                    )
                    ->orderBy(
                        'id',
                    );
            },

            'stockBatches',
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

    /*
     * =====================================================
     * PRODUCT DETAILS
     * =====================================================
     */

    public function show(
        Product $product,
    ): JsonResponse {
        $product->load([
            'category:id,name',

            'variants' =>
            function (
                $query,
            ): void {
                $query
                    ->orderBy(
                        'sort_order',
                    )
                    ->orderBy(
                        'id',
                    );
            },
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
            ->orderBy(
                'id',
            )
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

        /*
         * Important:
         *
         * batchData() resolves product_variant_id
         * from the StockBatch and also has a
         * purchase-item compatibility fallback.
         *
         * All detail summaries therefore use the
         * RESOLVED batch details rather than raw
         * StockBatch data.
         */
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

        /*
         * Variant cards shown on Product Details.
         *
         * Every variant contains:
         *
         * available_stock_by_unit
         */
        $variantPayload =
            $this->buildDetailVariantPayload(
                $product,
                $batchDetails,
            );

        /*
         * Detailed variant stock + price summary.
         */
        $variantStock =
            $this->buildVariantStockSummary(
                $product,
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
                 * VARIANT INFORMATION
                 */
                'has_variants' =>
                $product
                    ->variants
                    ->isNotEmpty(),

                'variants' =>
                $variantPayload,

                /*
                 * VARIANT STOCK + PRICES
                 */
                'variant_stock' =>
                $variantStock,

                'created_at' =>
                $product
                    ->created_at
                    ?->toISOString(),

                'updated_at' =>
                $product
                    ->updated_at
                    ?->toISOString(),

                'summary' => [
                    /*
                     * Required by ProductDetailsSummary.
                     */
                    'number_of_variants' =>
                    $product
                        ->variants
                        ->count(),

                    'number_of_batches' =>
                    $batchDetails
                        ->count(),

                    'number_of_price_options' =>
                    $priceOptions
                        ->count(),

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

    /*
     * =====================================================
     * UPDATE PRODUCT
     * =====================================================
     */

    public function update(
        UpdateProductRequest $request,
        Product $product,
    ): JsonResponse {
        $validated =
            $request->validated();

        $this->validateBarcodeNamespace(
            $validated['barcode']
                ?? null,
            $validated['variants']
                ?? [],
            $product,
        );

        DB::transaction(
            function () use (
                $validated,
                $product,
            ): void {
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

                $this->syncVariants(
                    $product,
                    $validated['variants']
                        ?? [],
                );
            },
        );

        $product->load([
            'category:id,name',

            'variants' =>
            function (
                $query,
            ): void {
                $query
                    ->orderBy(
                        'sort_order',
                    )
                    ->orderBy(
                        'id',
                    );
            },

            'stockBatches',
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

    /*
     * =====================================================
     * DELETE PRODUCT
     * =====================================================
     */

    public function destroy(
        Product $product,
    ): JsonResponse {
        $usageMessage =
            $this->productUsageMessage(
                $product,
            );

        if (
            $usageMessage
            !== null
        ) {
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

    /*
     * =====================================================
     * PRODUCT VARIANT SYNC
     * =====================================================
     */

    /**
     * @param array<int, array<string, mixed>> $variants
     */
    private function syncVariants(
        Product $product,
        array $variants,
    ): void {
        $existingVariants =
            ProductVariant::query()
            ->where(
                'product_id',
                $product->id,
            )
            ->get()
            ->keyBy(
                'id',
            );

        $incomingExistingIds = [];

        foreach (
            $variants as $variantData
        ) {
            if (
                !isset(
                    $variantData['id'],
                )
                || $variantData['id']
                === null
            ) {
                continue;
            }

            $variantId =
                (int) $variantData['id'];

            if (
                !$existingVariants
                    ->has(
                        $variantId,
                    )
            ) {
                throw ValidationException::withMessages([
                    'variants' =>
                    'One of the selected product variants does not belong to this product.',
                ]);
            }

            $incomingExistingIds[] =
                $variantId;
        }

        /*
         * Remove submitted omissions only when
         * the existing variant is unused.
         */
        foreach (
            $existingVariants as
            $existingVariant
        ) {
            if (
                in_array(
                    (int) $existingVariant
                        ->id,
                    $incomingExistingIds,
                    true,
                )
            ) {
                continue;
            }

            $usageMessage =
                $this->variantUsageMessage(
                    $existingVariant,
                );

            if (
                $usageMessage
                !== null
            ) {
                throw ValidationException::withMessages([
                    'variants' =>
                    $usageMessage,
                ]);
            }

            $existingVariant
                ->delete();
        }

        foreach (
            $variants as
            $index => $variantData
        ) {
            $variantId =
                isset(
                    $variantData['id'],
                )
                && $variantData['id']
                !== null
                ? (int) $variantData['id']
                : null;

            if (
                $variantId
                !== null
            ) {
                $variant =
                    $existingVariants
                    ->get(
                        $variantId,
                    );
            } else {
                $variant =
                    new ProductVariant();

                $variant->forceFill([
                    'product_id' =>
                    $product->id,

                    'sku' =>
                    'TMP-V-'
                        . Str::upper(
                            Str::random(
                                16,
                            ),
                        ),
                ]);
            }

            if (
                !$variant
                    instanceof ProductVariant
            ) {
                throw ValidationException::withMessages([
                    'variants' =>
                    'Unable to locate one of the selected product variants.',
                ]);
            }

            $variant->forceFill([
                'product_id' =>
                $product->id,

                'size_value' =>
                round(
                    (float) $variantData['size_value'],
                    3,
                ),

                'size_unit' =>
                trim(
                    (string) $variantData['size_unit'],
                ),

                'package_unit' =>
                trim(
                    (string) $variantData['package_unit'],
                ),

                'barcode' =>
                $this->normaliseBarcode(
                    $variantData['barcode']
                        ?? null,
                ),

                'is_active' =>
                (bool) (
                    $variantData['is_active']
                    ?? true
                ),

                'sort_order' =>
                $index,
            ]);

            $variant->save();

            if (
                $variantId
                === null
            ) {
                $variant->forceFill([
                    'sku' =>
                    sprintf(
                        '%s-V%06d',
                        $product->sku,
                        $variant->id,
                    ),
                ]);

                $variant->save();
            }
        }
    }

    /*
     * =====================================================
     * VARIANT USAGE PROTECTION
     * =====================================================
     */

    private function variantUsageMessage(
        ProductVariant $variant,
    ): ?string {
        $tables = [
            'purchase_items',
            'stock_batches',
            'sale_items',
            'sale_return_items',
            'sales_return_items',
        ];

        foreach (
            $tables as $table
        ) {
            if (
                !Schema::hasTable(
                    $table,
                )
                || !Schema::hasColumn(
                    $table,
                    'product_variant_id',
                )
            ) {
                continue;
            }

            if (
                DB::table(
                    $table,
                )
                ->where(
                    'product_variant_id',
                    $variant->id,
                )
                ->exists()
            ) {
                return sprintf(
                    'The variant "%s" is already connected to inventory or transactions and cannot be removed. Mark it inactive instead.',
                    $variant
                        ->displayName(),
                );
            }
        }

        return null;
    }

    /*
     * =====================================================
     * BARCODE VALIDATION
     * =====================================================
     */

    /**
     * @param array<int, array<string, mixed>> $variants
     */
    private function validateBarcodeNamespace(
        mixed $productBarcode,
        array $variants,
        ?Product $editingProduct = null,
    ): void {
        $entries = [];

        $cleanProductBarcode =
            $this->normaliseBarcode(
                $productBarcode,
            );

        if (
            $cleanProductBarcode
            !== null
        ) {
            $entries[] = [
                'barcode' =>
                $cleanProductBarcode,

                'type' =>
                'product',
            ];
        }

        foreach (
            $variants as $variant
        ) {
            $barcode =
                $this->normaliseBarcode(
                    $variant['barcode']
                        ?? null,
                );

            if (
                $barcode
                === null
            ) {
                continue;
            }

            $entries[] = [
                'barcode' =>
                $barcode,

                'type' =>
                'variant',
            ];
        }

        $submittedBarcodes = [];

        foreach (
            $entries as $entry
        ) {
            $normalised =
                strtolower(
                    trim(
                        (string) $entry['barcode'],
                    ),
                );

            if (
                isset(
                    $submittedBarcodes[$normalised],
                )
            ) {
                throw ValidationException::withMessages([
                    'variants' =>
                    'The same barcode has been entered more than once.',
                ]);
            }

            $submittedBarcodes[$normalised] = true;
        }

        if (
            $entries
            === []
        ) {
            return;
        }

        $barcodes =
            collect(
                $entries,
            )
            ->pluck(
                'barcode',
            )
            ->unique()
            ->values()
            ->all();

        $productQuery =
            Product::query()
            ->whereIn(
                'barcode',
                $barcodes,
            );

        if (
            $editingProduct
            !== null
        ) {
            $productQuery->where(
                'id',
                '!=',
                $editingProduct->id,
            );
        }

        if (
            $productQuery
            ->exists()
        ) {
            throw ValidationException::withMessages([
                'barcode' =>
                'One of these barcodes is already assigned to another product.',
            ]);
        }

        if (
            !Schema::hasTable(
                'product_variants',
            )
        ) {
            return;
        }

        $variantQuery =
            ProductVariant::query()
            ->whereIn(
                'barcode',
                $barcodes,
            );

        if (
            $editingProduct
            !== null
        ) {
            $variantQuery->where(
                'product_id',
                '!=',
                $editingProduct->id,
            );
        }

        if (
            $variantQuery
            ->exists()
        ) {
            throw ValidationException::withMessages([
                'variants' =>
                'One of these barcodes is already assigned to another product variant.',
            ]);
        }
    }

    /*
     * =====================================================
     * BASIC VARIANT PAYLOAD
     * =====================================================
     */

    /**
     * @return array<string, mixed>
     */
    private function basicVariantData(
        ProductVariant $variant,
    ): array {
        return [
            'id' =>
            $variant->id,

            'product_id' =>
            $variant->product_id,

            'display_name' =>
            $variant
                ->displayName(),

            'size_value' =>
            (float) $variant
                ->size_value,

            'size_unit' =>
            $variant
                ->size_unit,

            'package_unit' =>
            $variant
                ->package_unit,

            'sku' =>
            $variant
                ->sku,

            'barcode' =>
            $variant
                ->barcode,

            'is_active' =>
            (bool) $variant
                ->is_active,

            'sort_order' =>
            (int) $variant
                ->sort_order,
        ];
    }

    /*
     * =====================================================
     * VARIANT DATA FOR PRODUCT LIST
     * =====================================================
     */

    /**
     * @return array<string, mixed>
     */
    private function variantData(
        ProductVariant $variant,
        Product $product,
    ): array {
        if (
            $product->relationLoaded(
                'stockBatches',
            )
        ) {
            $stockBatches =
                $product
                ->stockBatches
                ->filter(
                    fn(
                        StockBatch $batch,
                    ): bool =>
                    (int) (
                        $batch
                        ->getAttribute(
                            'product_variant_id',
                        )
                        ?? 0
                    )
                        === (int) $variant->id,
                );
        } else {
            $stockBatches =
                StockBatch::query()
                ->where(
                    'product_id',
                    $product->id,
                )
                ->where(
                    'product_variant_id',
                    $variant->id,
                )
                ->get();
        }

        $stockByUnit = [];

        foreach (
            $stockBatches as $batch
        ) {
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

            /*
             * Normal variant stock should normally
             * be displayed using its package unit.
             */
            if (
                !$this->booleanValue(
                    $batch->getAttribute(
                        'is_dual_unit',
                    ),
                )
            ) {
                $variantPackageUnit =
                    trim(
                        (string) $variant
                            ->package_unit,
                    );

                if (
                    $variantPackageUnit
                    !== ''
                ) {
                    $stockUnit =
                        $variantPackageUnit;
                }
            }

            $availableQuantity =
                round(
                    (float) (
                        $batch
                        ->available_quantity
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

        if (
            $stockByUnit
            === []
        ) {
            $packageUnit =
                trim(
                    (string) $variant
                        ->package_unit,
                );

            $stockByUnit[$packageUnit !== ''
                ? $packageUnit
                : 'Unit'] = 0.0;
        }

        $availableStockByUnit =
            collect(
                $stockByUnit,
            )
            ->map(
                fn(
                    mixed $quantity,
                    mixed $unit,
                ): array => [
                    'unit' =>
                    (string) $unit,

                    'available_quantity' =>
                    round(
                        (float) $quantity,
                        3,
                    ),
                ],
            )
            ->values()
            ->all();

        return [
            ...$this->basicVariantData(
                $variant,
            ),

            'available_stock_by_unit' =>
            $availableStockByUnit,
        ];
    }

    /*
     * =====================================================
     * VARIANT DATA FOR PRODUCT DETAILS
     * =====================================================
     */

    /**
     * Build each variant with its own current
     * stock from RESOLVED batch data.
     *
     * @param Collection<int, array<string, mixed>> $batches
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildDetailVariantPayload(
        Product $product,
        Collection $batches,
    ): array {
        return $product
            ->variants
            ->map(
                function (
                    ProductVariant $variant,
                ) use (
                    $batches,
                ): array {
                    $variantBatches =
                        $batches
                        ->filter(
                            fn(
                                array $batch,
                            ): bool =>
                            (int) (
                                $batch['product_variant_id']
                                ?? 0
                            )
                                === (int) $variant
                                    ->id,
                        )
                        ->values();

                    $stockByUnit = [];

                    foreach (
                        $variantBatches
                        as $batch
                    ) {
                        $stockUnit =
                            trim(
                                (string) (
                                    $batch['stock_unit']
                                    ?? ''
                                ),
                            );

                        /*
                         * Variant products are independent
                         * package quantities.
                         *
                         * Example:
                         * 100g Packet -> Packet
                         */
                        if (
                            !(
                                (bool) (
                                    $batch['is_dual_unit']
                                    ?? false
                                )
                            )
                        ) {
                            $packageUnit =
                                trim(
                                    (string) $variant
                                        ->package_unit,
                                );

                            if (
                                $packageUnit
                                !== ''
                            ) {
                                $stockUnit =
                                    $packageUnit;
                            }
                        }

                        if (
                            $stockUnit
                            === ''
                        ) {
                            $stockUnit =
                                'Unit';
                        }

                        if (
                            !array_key_exists(
                                $stockUnit,
                                $stockByUnit,
                            )
                        ) {
                            $stockByUnit[$stockUnit] = 0.0;
                        }

                        $stockByUnit[$stockUnit] +=
                            (float) (
                                $batch['available_quantity']
                                ?? 0
                            );
                    }

                    /*
                     * Variant exists but has never
                     * been purchased.
                     */
                    if (
                        $stockByUnit
                        === []
                    ) {
                        $packageUnit =
                            trim(
                                (string) $variant
                                    ->package_unit,
                            );

                        $stockByUnit[$packageUnit !== ''
                            ? $packageUnit
                            : 'Unit'] = 0.0;
                    }

                    $availableStockByUnit =
                        collect(
                            $stockByUnit,
                        )
                        ->map(
                            fn(
                                mixed $quantity,
                                mixed $unit,
                            ): array => [
                                'unit' =>
                                (string) $unit,

                                'available_quantity' =>
                                round(
                                    (float) $quantity,
                                    3,
                                ),
                            ],
                        )
                        ->values()
                        ->all();

                    return [
                        ...$this->basicVariantData(
                            $variant,
                        ),

                        'available_stock_by_unit' =>
                        $availableStockByUnit,
                    ];
                },
            )
            ->values()
            ->all();
    }

    /*
     * =====================================================
     * VARIANT STOCK SUMMARY
     * =====================================================
     */

    /**
     * Data used by the Product Details page
     * to show:
     *
     * Variant
     * Available Stock
     * Saleable Stock
     * Selling Price
     * Batch Count
     * Stock Values
     *
     * @param Collection<int, array<string, mixed>> $batches
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildVariantStockSummary(
        Product $product,
        Collection $batches,
    ): array {
        return $product
            ->variants
            ->map(
                function (
                    ProductVariant $variant,
                ) use (
                    $batches,
                ): array {
                    $variantBatches =
                        $batches
                        ->filter(
                            fn(
                                array $batch,
                            ): bool =>
                            (int) (
                                $batch['product_variant_id']
                                ?? 0
                            )
                                === (int) $variant
                                    ->id,
                        )
                        ->values();

                    $availableQuantity =
                        round(
                            (float) $variantBatches
                                ->sum(
                                    'available_quantity',
                                ),
                            3,
                        );

                    $saleableQuantity =
                        round(
                            (float) $variantBatches
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

                    /*
                     * Only positive prices are useful
                     * for the displayed variant price.
                     */
                    $sellingPrices =
                        $variantBatches
                        ->pluck(
                            'selling_price',
                        )
                        ->filter(
                            fn(
                                mixed $price,
                            ): bool =>
                            $price !== null
                                && (float) $price
                                > 0,
                        )
                        ->map(
                            fn(
                                mixed $price,
                            ): float =>
                            round(
                                (float) $price,
                                2,
                            ),
                        )
                        ->values();

                    $minimumSellingPrice =
                        $sellingPrices
                        ->isEmpty()
                        ? null
                        : (float) $sellingPrices
                            ->min();

                    $maximumSellingPrice =
                        $sellingPrices
                        ->isEmpty()
                        ? null
                        : (float) $sellingPrices
                            ->max();

                    /*
                     * selling_price remains the lowest
                     * currently configured batch price.
                     *
                     * UI can use min/max when batches
                     * have multiple prices.
                     */
                    $sellingPrice =
                        $minimumSellingPrice;

                    $stockUnit =
                        trim(
                            (string) $variant
                                ->package_unit,
                        );

                    if (
                        $stockUnit
                        === ''
                    ) {
                        $stockUnit =
                            trim(
                                (string) $variant
                                    ->size_unit,
                            );
                    }

                    if (
                        $stockUnit
                        === ''
                    ) {
                        $stockUnit =
                            'Unit';
                    }

                    /*
                     * Use the already-correct batch values.
                     *
                     * Important:
                     * Do not calculate:
                     *
                     * total stock × lowest price
                     *
                     * because two batches may have
                     * different prices.
                     */
                    $stockValueAtCost =
                        round(
                            (float) $variantBatches
                                ->sum(
                                    'current_cost_value',
                                ),
                            2,
                        );

                    $stockValueAtSale =
                        round(
                            (float) $variantBatches
                                ->sum(
                                    'current_sale_value',
                                ),
                            2,
                        );

                    return [
                        'variant_id' =>
                        $variant->id,

                        'variant' =>
                        $this->basicVariantData(
                            $variant,
                        ),

                        'available_quantity' =>
                        $availableQuantity,

                        'saleable_quantity' =>
                        $saleableQuantity,

                        'batch_count' =>
                        $variantBatches
                            ->count(),

                        'selling_price' =>
                        $sellingPrice,

                        'minimum_selling_price' =>
                        $minimumSellingPrice,

                        'maximum_selling_price' =>
                        $maximumSellingPrice,

                        'stock_unit' =>
                        $stockUnit,

                        'stock_value_at_cost' =>
                        $stockValueAtCost,

                        'stock_value_at_sale' =>
                        $stockValueAtSale,

                        'potential_gross_profit' =>
                        round(
                            $stockValueAtSale
                                - $stockValueAtCost,
                            2,
                        ),
                    ];
                },
            )
            ->values()
            ->all();
    }

    /*
     * =====================================================
     * PRODUCT LIST STOCK
     * =====================================================
     */

    /**
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
                $product
                ->stockBatches;
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
                    'product_variant_id',
                    'available_quantity',
                    'received_quantity',
                    'is_dual_unit',
                    'stock_unit',
                    'secondary_unit',
                    'conversion_factor',
                ]);
        }

        if (
            $batches->isEmpty()
        ) {
            $defaultUnit =
                trim(
                    (string) $product
                        ->unit,
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

        foreach (
            $batches as $batch
        ) {
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
                        $batch
                        ->available_quantity
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
                    mixed $quantity,
                    mixed $unit,
                ): array => [
                    'unit' =>
                    (string) $unit,

                    'available_quantity' =>
                    round(
                        (float) $quantity,
                        3,
                    ),
                ],
            )
            ->values()
            ->all();
    }

    /*
     * =====================================================
     * PURCHASE DATA LOADERS
     * =====================================================
     */

    /**
     * @param Collection<int, int> $purchaseItemIds
     *
     * @return Collection<int, object>
     */
    private function loadPurchaseItems(
        Collection $purchaseItemIds,
    ): Collection {
        if (
            $purchaseItemIds
            ->isEmpty()
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
                $purchaseItemIds
                    ->all(),
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
            $purchaseIds
            ->isEmpty()
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
                $purchaseIds
                    ->all(),
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
            $supplierIds
            ->isEmpty()
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
                $supplierIds
                    ->all(),
            )
            ->get()
            ->keyBy(
                fn(
                    object $supplier,
                ): int =>
                (int) $supplier->id,
            );
    }

    /*
     * =====================================================
     * STOCK BATCH DATA
     * =====================================================
     */

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
        /*
         * =================================================
         * PURCHASE ITEM
         * =================================================
         */

        $purchaseItemId =
            $batch->purchase_item_id
            !== null
            ? (int) $batch
                ->purchase_item_id
            : null;

        $purchaseItem =
            $purchaseItemId
            !== null
            ? $purchaseItems
            ->get(
                $purchaseItemId,
            )
            : null;

        /*
         * =================================================
         * VARIANT
         * =================================================
         */

        $productVariantId =
            $batch->getAttribute(
                'product_variant_id',
            ) !== null
            ? (int) $batch
                ->getAttribute(
                    'product_variant_id',
                )
            : null;

        /*
         * Compatibility with older data where
         * purchase_items has product_variant_id
         * but stock_batches did not.
         */
        if (
            $productVariantId
            === null
            && $purchaseItem
            && isset(
                $purchaseItem
                    ->product_variant_id,
            )
            && $purchaseItem
            ->product_variant_id
            !== null
        ) {
            $productVariantId =
                (int) $purchaseItem
                    ->product_variant_id;
        }

        $variant =
            $productVariantId
            !== null
            ? $product
            ->variants
            ->firstWhere(
                'id',
                $productVariantId,
            )
            : null;

        $variantPayload =
            $variant
            instanceof ProductVariant
            ? $this->batchVariantData(
                $variant,
            )
            : null;

        /*
         * =================================================
         * PURCHASE
         * =================================================
         */

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
            $purchaseId
            !== null
            ? $purchases
            ->get(
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
            $supplierId
            !== null
            ? $suppliers
            ->get(
                $supplierId,
            )
            : null;

        /*
         * =================================================
         * PURCHASE UNIT
         * =================================================
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
            : (
                $variant
                instanceof ProductVariant
                && trim(
                    (string) $variant
                        ->package_unit,
                ) !== ''
                ? trim(
                    (string) $variant
                        ->package_unit,
                )
                : trim(
                    (string) $product
                        ->unit,
                )
            );

        if (
            $purchaseUnitName
            === ''
        ) {
            $purchaseUnitName =
                'Unit';
        }

        /*
         * =================================================
         * DUAL UNIT
         * =================================================
         */

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
            && $secondaryUnit
            !== null
            && $conversionFactor
            > 1
        ) {
            $isDualUnit =
                true;
        }

        /*
         * =================================================
         * PHYSICAL STOCK UNIT
         * =================================================
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
         * Variants such as:
         *
         * 100g Packet
         *
         * are physically counted as Packet.
         */
        if (
            !$isDualUnit
            && $variant
            instanceof ProductVariant
        ) {
            $variantPackageUnit =
                trim(
                    (string) $variant
                        ->package_unit,
                );

            if (
                $variantPackageUnit
                !== ''
            ) {
                $stockUnit =
                    $variantPackageUnit;
            }
        }

        /*
         * =================================================
         * COST
         * =================================================
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

        $baseUnitCostAttribute =
            $batch->getAttribute(
                'base_unit_cost',
            );

        $baseUnitCost =
            $baseUnitCostAttribute
            !== null
            && $baseUnitCostAttribute
            !== ''
            ? (float) $baseUnitCostAttribute
            : null;

        if (
            $baseUnitCost
            === null
            && $unitCost
            !== null
        ) {
            if (
                $isDualUnit
                && $conversionFactor
                > 0
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
         * =================================================
         * SELLING PRICE
         * =================================================
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

        $secondarySellingPriceAttribute =
            $batch->getAttribute(
                'secondary_selling_price',
            );

        $secondarySellingPrice =
            $secondarySellingPriceAttribute
            !== null
            && $secondarySellingPriceAttribute
            !== ''
            ? (float) $secondarySellingPriceAttribute
            : (
                $purchaseItem
                && isset(
                    $purchaseItem
                        ->secondary_selling_price,
                )
                && $purchaseItem
                ->secondary_selling_price
                !== null
                ? (float) $purchaseItem
                    ->secondary_selling_price
                : null
            );

        /*
         * =================================================
         * PURCHASE QUANTITY
         * =================================================
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
         * =================================================
         * PHYSICAL RECEIVED
         * =================================================
         */

        $batchReceivedQuantity =
            $batch->getAttribute(
                'received_quantity',
            );

        if (
            $batchReceivedQuantity
            !== null
            && $batchReceivedQuantity
            !== ''
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
            ->base_received_quantity
            !== null
        ) {
            $receivedQuantity =
                (float) $purchaseItem
                    ->base_received_quantity;
        } elseif (
            $isDualUnit
        ) {
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
         * =================================================
         * AVAILABLE STOCK
         * =================================================
         */

        $availableQuantity =
            round(
                (float) $batch
                    ->available_quantity,
                3,
            );

        if (
            $isDualUnit
            && $conversionFactor
            > 0
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
                0.0;
        }

        /*
         * =================================================
         * DATES
         * =================================================
         */

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

        /*
         * =================================================
         * PURCHASE / SUPPLIER
         * =================================================
         */

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
         * =================================================
         * VALUES
         * =================================================
         */

        $currentCostValue =
            $baseUnitCost
            !== null
            ? round(
                $baseUnitCost
                    * $availableQuantity,
                2,
            )
            : 0.0;

        if (
            $isDualUnit
            && $conversionFactor
            > 0
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

        /*
         * =================================================
         * PROFIT
         * =================================================
         */

        $profitPerPrimaryUnit =
            $unitCost
            !== null
            ? round(
                $sellingPrice
                    - $unitCost,
                2,
            )
            : null;

        if (
            $baseUnitCost
            !== null
        ) {
            if (
                $isDualUnit
                && $conversionFactor
                > 0
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

            'product_variant_id' =>
            $productVariantId,

            'variant' =>
            $variantPayload,

            'purchase_item_id' =>
            $purchaseItemId,

            'purchase_id' =>
            $purchaseId,

            'purchase_number' =>
            $purchaseNumber,

            'purchase_date' =>
            $purchaseDate,

            'supplier' =>
            $supplierId
                !== null
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

            'received_quantity' =>
            $receivedQuantity,

            'available_quantity' =>
            $availableQuantity,

            'full_units_available' =>
            $fullUnitsAvailable,

            'loose_quantity_available' =>
            $looseQuantityAvailable,

            'unit_cost' =>
            $unitCost,

            'cost_price' =>
            $unitCost,

            'base_unit_cost' =>
            $baseUnitCost
                !== null
                ? round(
                    $baseUnitCost,
                    4,
                )
                : null,

            'selling_price' =>
            round(
                $sellingPrice,
                2,
            ),

            'secondary_selling_price' =>
            $secondarySellingPrice
                !== null
                ? round(
                    $secondarySellingPrice,
                    2,
                )
                : null,

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

    /*
     * =====================================================
     * BATCH VARIANT DATA
     * =====================================================
     */

    /**
     * Matches ProductBatchVariant in TypeScript.
     *
     * @return array<string, mixed>
     */
    private function batchVariantData(
        ProductVariant $variant,
    ): array {
        return [
            'id' =>
            $variant->id,

            'product_id' =>
            $variant->product_id,

            'display_name' =>
            $variant
                ->displayName(),

            'size_value' =>
            (float) $variant
                ->size_value,

            'size_unit' =>
            $variant
                ->size_unit,

            'package_unit' =>
            $variant
                ->package_unit,

            'sku' =>
            $variant
                ->sku,

            'barcode' =>
            $variant
                ->barcode,

            'is_active' =>
            (bool) $variant
                ->is_active,

            'sort_order' =>
            (int) $variant
                ->sort_order,
        ];
    }

    /*
     * =====================================================
     * PRICE OPTIONS
     * =====================================================
     */

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
                            (string) (
                                $batch['product_variant_id']
                                ?? 'standard'
                            ),

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
                        $priceBatches
                        ->first();

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
                        'product_variant_id' =>
                        $first['product_variant_id']
                            ?? null,

                        'variant' =>
                        $first['variant']
                            ?? null,

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
                        $costPrices
                            ->isEmpty()
                            ? null
                            : (float) $costPrices
                                ->min(),

                        'cost_price_max' =>
                        $costPrices
                            ->isEmpty()
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
                function (
                    array $option,
                ): string {
                    return sprintf(
                        '%012d-%020.2f',
                        (int) (
                            $option['product_variant_id']
                            ?? 0
                        ),
                        (float) $option['selling_price'],
                    );
                },
            )
            ->values();
    }

    /*
     * =====================================================
     * STOCK SUMMARY BY UNIT
     * =====================================================
     */

    /**
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

                    if (
                        $unitName
                        === ''
                    ) {
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

    /*
     * =====================================================
     * PHYSICAL STOCK UNIT
     * =====================================================
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

        if (
            !$isDualUnit
            && $secondaryUnit
            !== null
            && $conversionFactor
            > 1
        ) {
            $isDualUnit =
                true;
        }

        /*
         * Bag -> Kg:
         *
         * product.unit = Bag
         * stock unit    = Kg
         */
        if (
            $isDualUnit
            && $secondaryUnit
            !== null
            && $conversionFactor
            > 1
        ) {
            return $secondaryUnit;
        }

        if (
            $stockUnit
            !== null
        ) {
            return $stockUnit;
        }

        $productUnit =
            trim(
                (string) $product
                    ->unit,
            );

        return $productUnit !== ''
            ? $productUnit
            : 'Unit';
    }

    /*
     * =====================================================
     * BATCH STATUS
     * =====================================================
     */

    private function resolveBatchStatus(
        float $availableQuantity,
        ?string $expiryDate,
    ): string {
        if (
            $availableQuantity
            <= 0
        ) {
            return 'out_of_stock';
        }

        if (
            !$expiryDate
        ) {
            return 'available';
        }

        try {
            $expiry =
                Carbon::parse(
                    $expiryDate,
                )
                ->startOfDay();

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
                        ->addDays(
                            30,
                        ),
                )
            ) {
                return 'expiring_soon';
            }
        } catch (
            Throwable) {
            return 'available';
        }

        return 'available';
    }

    /*
     * =====================================================
     * VALUE HELPERS
     * =====================================================
     */

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

        if (
            is_string(
                $value,
            )
        ) {
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
            || !is_numeric(
                $value,
            )
        ) {
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
        if (
            $value === null
        ) {
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

    /*
     * =====================================================
     * DATE HELPERS
     * =====================================================
     */

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
        } catch (
            Throwable) {
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
        } catch (
            Throwable) {
            return (string) $value;
        }
    }

    /*
     * =====================================================
     * OBJECT VALUE HELPER
     * =====================================================
     */

    /**
     * @param array<int, string> $keys
     */
    private function firstObjectValue(
        ?object $record,
        array $keys,
    ): mixed {
        if (
            !$record
        ) {
            return null;
        }

        foreach (
            $keys as $key
        ) {
            if (
                isset(
                    $record->{$key},
                )
                && $record->{$key}
                !== ''
            ) {
                return $record->{$key};
            }
        }

        return null;
    }

    /*
     * =====================================================
     * BARCODE NORMALISATION
     * =====================================================
     */

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

    /*
     * =====================================================
     * PRODUCT DELETE PROTECTION
     * =====================================================
     */

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
                DB::table(
                    $table,
                )
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

    /*
     * =====================================================
     * PRODUCT LIST PAYLOAD
     * =====================================================
     */

    /**
     * @return array<string, mixed>
     */
    private function productData(
        Product $product,
    ): array {
        $availableStockByUnit =
            $this->buildAvailableStockByUnit(
                $product,
            );

        $variants =
            $product->relationLoaded(
                'variants',
            )
            ? $product
            ->variants
            : $product
            ->variants()
            ->orderBy(
                'sort_order',
            )
            ->orderBy(
                'id',
            )
            ->get();

        $variantPayload =
            $variants
            ->map(
                fn(
                    ProductVariant $variant,
                ): array =>
                $this->variantData(
                    $variant,
                    $product,
                ),
            )
            ->values()
            ->all();

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

            'has_variants' =>
            count(
                $variantPayload,
            ) > 0,

            'variants' =>
            $variantPayload,

            /*
             * Compatibility value.
             *
             * For display use:
             *
             * available_stock_by_unit
             *
             * or variant.available_stock_by_unit
             */
            'total_available_quantity' =>
            round(
                (float) (
                    $product
                    ->total_available_quantity
                    ?? collect(
                        $availableStockByUnit,
                    )
                    ->sum(
                        'available_quantity',
                    )
                ),
                3,
            ),

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
