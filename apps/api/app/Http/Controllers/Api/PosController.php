<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockBatch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosController extends Controller
{
    public function categories(): JsonResponse
    {
        $categories = Category::query()
            ->orderBy('name')
            ->get([
                'id',
                'name',
            ])
            ->map(
                fn(Category $category): array => [
                    'id' => $category->id,
                    'name' => $category->name,
                ],
            )
            ->values();

        return response()->json([
            'data' => $categories,
        ]);
    }

    public function index(
        Request $request,
    ): JsonResponse {
        $validated = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:160',
            ],

            'category_id' => [
                'nullable',
                'integer',
                'exists:categories,id',
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

        $categoryId =
            $validated['category_id']
            ?? null;

        $perPage = (int) (
            $validated['per_page']
            ?? 24
        );

        $products = Product::query()
            ->with([
                'category:id,name',

                /*
                 * IMPORTANT:
                 *
                 * POS must know that a product has
                 * variants before the modal opens.
                 */
                'variants' =>
                function ($query): void {
                    $query
                        ->where(
                            'is_active',
                            true,
                        )
                        ->orderBy(
                            'sort_order',
                        )
                        ->orderBy(
                            'id',
                        );
                },

                /*
                 * Load available stock batches.
                 *
                 * product_variant_id is available
                 * directly on stock_batches.
                 *
                 * purchaseItem.product_variant_id
                 * is also loaded as a compatibility
                 * fallback.
                 */
                'stockBatches' =>
                function ($query): void {
                    $query
                        ->where(
                            'available_quantity',
                            '>',
                            0,
                        )
                        ->with([
                            'purchaseItem:id,product_id,product_variant_id,unit_cost',
                        ])
                        ->orderByRaw(
                            'expiry_date IS NULL',
                        )
                        ->orderBy(
                            'expiry_date',
                        )
                        ->orderBy(
                            'id',
                        );
                },
            ])
            ->whereHas(
                'stockBatches',
                function (
                    Builder $query,
                ): void {
                    $query->where(
                        'available_quantity',
                        '>',
                        0,
                    );
                },
            )
            ->when(
                $categoryId !== null,
                fn(
                    Builder $query,
                ) =>
                $query->where(
                    'category_id',
                    $categoryId,
                ),
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
                                    fn(
                                        Builder $categoryQuery,
                                    ) =>
                                    $categoryQuery
                                        ->where(
                                            'name',
                                            'like',
                                            "%{$search}%",
                                        ),
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
                                                'is_active',
                                                true,
                                            )
                                            ->where(
                                                function (
                                                    Builder $variantSearchQuery,
                                                ) use (
                                                    $search,
                                                ): void {
                                                    $variantSearchQuery
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
                    );
                },
            )
            ->orderBy(
                'name',
            )
            ->paginate(
                $perPage,
            );

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
            'data' =>
            $data,

            'meta' => [
                'current_page' =>
                $products
                    ->currentPage(),

                'last_page' =>
                $products
                    ->lastPage(),

                'per_page' =>
                $products
                    ->perPage(),

                'total' =>
                $products
                    ->total(),

                'from' =>
                $products
                    ->firstItem(),

                'to' =>
                $products
                    ->lastItem(),
            ],
        ]);
    }

    public function show(
        Product $product,
    ): JsonResponse {
        $product->load([
            'category:id,name',

            'variants' =>
            function ($query): void {
                $query
                    ->where(
                        'is_active',
                        true,
                    )
                    ->orderBy(
                        'sort_order',
                    )
                    ->orderBy(
                        'id',
                    );
            },

            'stockBatches' =>
            function ($query): void {
                $query
                    ->where(
                        'available_quantity',
                        '>',
                        0,
                    )
                    ->with([
                        'purchaseItem:id,product_id,product_variant_id,unit_cost',
                    ])
                    ->orderByRaw(
                        'expiry_date IS NULL',
                    )
                    ->orderBy(
                        'expiry_date',
                    )
                    ->orderBy(
                        'id',
                    );
            },
        ]);

        return response()->json([
            'data' =>
            $this->productData(
                $product,
            ),
        ]);
    }

    /*
     * =====================================================
     * PRODUCT DATA
     * =====================================================
     */

    private function productData(
        Product $product,
    ): array {
        /*
         * Active variants only.
         */
        $variants = $product
            ->variants
            ->filter(
                fn(
                    ProductVariant $variant,
                ): bool =>
                (bool) $variant
                    ->is_active,
            )
            ->values();

        $hasVariants =
            $variants
            ->isNotEmpty();

        $activeVariantIds =
            $variants
            ->pluck(
                'id',
            )
            ->map(
                fn(
                    mixed $id,
                ): int =>
                (int) $id,
            )
            ->all();

        /*
         * IMPORTANT:
         *
         * When product has variants,
         * only stock associated with an
         * active variant is exposed to POS.
         *
         * Therefore:
         *
         * 100g stock can never be mixed with
         * 200g or 500g stock.
         */
        $batches = $product
            ->stockBatches
            ->filter(
                function (
                    StockBatch $batch,
                ) use (
                    $hasVariants,
                    $activeVariantIds,
                ): bool {
                    if (
                        (float) $batch
                            ->available_quantity
                        <= 0
                    ) {
                        return false;
                    }

                    /*
                     * Normal product:
                     * keep original behaviour.
                     */
                    if (
                        ! $hasVariants
                    ) {
                        return true;
                    }

                    /*
                     * Variant product:
                     * batch MUST belong to an
                     * active variant.
                     */
                    $variantId =
                        $this
                        ->resolveBatchVariantId(
                            $batch,
                        );

                    return $variantId
                        !== null
                        && in_array(
                            $variantId,
                            $activeVariantIds,
                            true,
                        );
                },
            )
            ->values();

        $primaryPrices =
            $batches
            ->map(
                fn(
                    StockBatch $batch,
                ): float =>
                round(
                    (float) $batch
                        ->selling_price,
                    2,
                ),
            )
            ->values();

        $hasDualUnitBatch =
            $batches
            ->contains(
                fn(
                    StockBatch $batch,
                ): bool =>
                (bool) $batch
                    ->is_dual_unit,
            );

        $stockUnits =
            $batches
            ->map(
                function (
                    StockBatch $batch,
                ) use (
                    $product,
                ): string {
                    $variant =
                        $this
                        ->resolveBatchVariant(
                            $product,
                            $batch,
                        );

                    return $this
                        ->batchStockUnit(
                            $batch,
                            $product,
                            $variant,
                        );
                },
            )
            ->unique()
            ->values();

        $productStockUnit =
            $stockUnits->count()
            === 1
            ? (string) $stockUnits
                ->first()
            : $product->unit;

        $totalAvailableQuantity =
            round(
                $batches->sum(
                    fn(
                        StockBatch $batch,
                    ): float =>
                    (float) $batch
                        ->available_quantity,
                ),
                3,
            );

        /*
         * Build the variant selector data
         * required by BatchSelectionModal.
         */
        $variantData =
            $variants
            ->map(
                fn(
                    ProductVariant $variant,
                ): array =>
                $this->variantData(
                    $product,
                    $variant,
                    $batches,
                ),
            )
            ->values();

        return [
            'id' =>
            $product->id,

            'name' =>
            $product->name,

            'sku' =>
            $product->sku,

            'barcode' =>
            $product->barcode,

            'description' =>
            $product->description,

            'unit' =>
            $product->unit,

            'primary_unit' =>
            $product->unit,

            'stock_unit' =>
            $productStockUnit,

            'is_dual_unit' =>
            $hasDualUnitBatch,

            /*
             * NEW
             */
            'has_variants' =>
            $hasVariants,

            /*
             * NEW
             *
             * Example:
             *
             * [
             *   100g Packet,
             *   200g Packet,
             *   500g Packet
             * ]
             */
            'variants' =>
            $variantData,

            'category' => [
                'id' =>
                $product
                    ->category
                    ->id,

                'name' =>
                $product
                    ->category
                    ->name,
            ],

            'total_available_quantity' =>
            $totalAvailableQuantity,

            'minimum_price' =>
            $primaryPrices
                ->isEmpty()
                ? null
                : (float) $primaryPrices
                    ->min(),

            'maximum_price' =>
            $primaryPrices
                ->isEmpty()
                ? null
                : (float) $primaryPrices
                    ->max(),

            /*
             * Every batch now contains:
             *
             * product_variant_id
             * variant
             */
            'batches' =>
            $batches
                ->map(
                    fn(
                        StockBatch $batch,
                    ): array =>
                    $this->batchData(
                        $product,
                        $batch,
                    ),
                )
                ->values(),
        ];
    }

    /*
     * =====================================================
     * VARIANT DATA
     * =====================================================
     */

    private function variantData(
        Product $product,
        ProductVariant $variant,
        $productBatches,
    ): array {
        /*
         * Only batches belonging to THIS
         * exact variant.
         */
        $variantBatches =
            $productBatches
            ->filter(
                fn(
                    StockBatch $batch,
                ): bool =>
                $this
                    ->resolveBatchVariantId(
                        $batch,
                    )
                    === (int) $variant
                        ->id,
            )
            ->values();

        /*
         * Prices attached to this variant's
         * received stock.
         */
        $prices =
            $variantBatches
            ->map(
                fn(
                    StockBatch $batch,
                ): float =>
                round(
                    (float) $batch
                        ->selling_price,
                    2,
                ),
            )
            ->values();

        $stockUnits =
            $variantBatches
            ->map(
                fn(
                    StockBatch $batch,
                ): string =>
                $this
                    ->batchStockUnit(
                        $batch,
                        $product,
                        $variant,
                    ),
            )
            ->unique()
            ->values();

        $stockUnit =
            $stockUnits->count()
            === 1
            ? (string) $stockUnits
                ->first()
            : (
                trim(
                    (string) $variant
                        ->package_unit,
                ) !== ''
                ? (string) $variant
                    ->package_unit
                : (string) $product
                    ->unit
            );

        $totalAvailableQuantity =
            round(
                $variantBatches
                    ->sum(
                        fn(
                            StockBatch $batch,
                        ): float =>
                        (float) $batch
                            ->available_quantity,
                    ),
                3,
            );

        return [
            'id' =>
            $variant->id,

            'product_id' =>
            $product->id,

            /*
             * Example:
             * 100g Packet
             */
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

            /*
             * Variant-specific stock.
             */
            'stock_unit' =>
            $stockUnit,

            'total_available_quantity' =>
            $totalAvailableQuantity,

            /*
             * Variant-specific selling price.
             *
             * If multiple purchase batches have
             * different prices, POS displays
             * a range until the cashier selects
             * the exact batch.
             */
            'minimum_price' =>
            $prices
                ->isEmpty()
                ? null
                : (float) $prices
                    ->min(),

            'maximum_price' =>
            $prices
                ->isEmpty()
                ? null
                : (float) $prices
                    ->max(),

            'batches_count' =>
            $variantBatches
                ->count(),

            'has_stock' =>
            $totalAvailableQuantity
                > 0,
        ];
    }

    /*
     * =====================================================
     * BATCH DATA
     * =====================================================
     */

    private function batchData(
        Product $product,
        StockBatch $batch,
    ): array {
        /*
         * Resolve exact product variant.
         */
        $variantId =
            $this
            ->resolveBatchVariantId(
                $batch,
            );

        $variant =
            $this
            ->resolveBatchVariant(
                $product,
                $batch,
            );

        $isDualUnit =
            (bool) $batch
                ->is_dual_unit;

        $conversionFactor =
            $isDualUnit
            ? max(
                0.001,
                round(
                    (float) $batch
                        ->conversion_factor,
                    3,
                ),
            )
            : 1.0;

        /*
         * Variant package unit becomes the
         * primary unit for variant products.
         *
         * Example:
         *
         * Tomato Seeds
         * 100g Packet
         *
         * primary_unit = Packet
         */
        $variantPackageUnit =
            $variant
            ? trim(
                (string) $variant
                    ->package_unit,
            )
            : '';

        $primaryUnit =
            $variantPackageUnit
            !== ''
            ? $variantPackageUnit
            : (
                trim(
                    (string) $product
                        ->unit,
                ) !== ''
                ? $product
                ->unit
                : 'Unit'
            );

        $stockUnit =
            $this
            ->batchStockUnit(
                $batch,
                $product,
                $variant,
            );

        $secondaryUnit =
            $isDualUnit
            ? (
                trim(
                    (string) $batch
                        ->secondary_unit,
                ) !== ''
                ? $batch
                ->secondary_unit
                : $stockUnit
            )
            : null;

        $availableStockQuantity =
            round(
                (float) $batch
                    ->available_quantity,
                3,
            );

        $receivedStockQuantity =
            round(
                (float) $batch
                    ->received_quantity,
                3,
            );

        $availablePrimaryQuantity =
            $isDualUnit
            ? floor(
                (
                    $availableStockQuantity
                    / $conversionFactor
                )
                    + 0.0000001,
            )
            : $availableStockQuantity;

        /*
         * IMPORTANT:
         *
         * This selling price belongs to the
         * selected stock batch / variant.
         */
        $primarySellingPrice =
            round(
                (float) $batch
                    ->selling_price,
                2,
            );

        $secondarySellingPrice =
            $isDualUnit
            && $batch
            ->secondary_selling_price
            !== null
            ? round(
                (float) $batch
                    ->secondary_selling_price,
                2,
            )
            : null;

        /*
         * Exact purchase cost.
         */
        $purchaseCost =
            $this->purchaseCost(
                $batch,
            );

        $baseUnitCost =
            $this->baseUnitCost(
                $batch,
                $purchaseCost,
                $conversionFactor,
                $isDualUnit,
            );

        /*
         * =================================================
         * SALE OPTIONS
         * =================================================
         */

        $saleOptions = [];

        $saleOptions[] = [
            'key' =>
            'primary',

            'label' =>
            $isDualUnit
                ? "Full {$primaryUnit}"
                : $primaryUnit,

            'unit' =>
            $primaryUnit,

            /*
             * Correct selected variant batch price.
             */
            'selling_price' =>
            $primarySellingPrice,

            'purchase_cost' =>
            $purchaseCost,

            'conversion_factor' =>
            $isDualUnit
                ? $conversionFactor
                : 1,

            'stock_quantity_per_unit' =>
            $isDualUnit
                ? $conversionFactor
                : 1,

            'available_quantity' =>
            $availablePrimaryQuantity,

            'available_stock_quantity' =>
            $availableStockQuantity,

            'stock_unit' =>
            $stockUnit,

            'quantity_step' =>
            $isDualUnit
                ? 1
                : 0.001,

            'allow_decimal_quantity' =>
            ! $isDualUnit,
        ];

        /*
         * Existing Bag + Kg support.
         */
        if (
            $isDualUnit
            && $secondarySellingPrice
            !== null
        ) {
            $saleOptions[] = [
                'key' =>
                'secondary',

                'label' =>
                "Loose {$secondaryUnit}",

                'unit' =>
                $secondaryUnit,

                'selling_price' =>
                $secondarySellingPrice,

                'purchase_cost' =>
                $baseUnitCost,

                'conversion_factor' =>
                1,

                'stock_quantity_per_unit' =>
                1,

                'available_quantity' =>
                $availableStockQuantity,

                'available_stock_quantity' =>
                $availableStockQuantity,

                'stock_unit' =>
                $stockUnit,

                'quantity_step' =>
                0.001,

                'allow_decimal_quantity' =>
                true,
            ];
        }

        return [
            'id' =>
            $batch->id,

            /*
             * =================================================
             * PRODUCT VARIANT
             * =================================================
             */

            'product_variant_id' =>
            $variantId,

            'variant' =>
            $variant
                ? [
                    'id' =>
                    $variant->id,

                    'product_id' =>
                    $product->id,

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
                ]
                : null,

            /*
             * =================================================
             * NORMAL BATCH DATA
             * =================================================
             */

            'batch_code' =>
            $batch->batch_code,

            'batch_number' =>
            $batch->batch_number,

            'selling_price' =>
            $primarySellingPrice,

            'purchase_cost' =>
            $purchaseCost,

            'unit_cost' =>
            $purchaseCost,

            'is_dual_unit' =>
            $isDualUnit,

            'primary_unit' =>
            $primaryUnit,

            'stock_unit' =>
            $stockUnit,

            'secondary_unit' =>
            $secondaryUnit,

            'conversion_factor' =>
            $conversionFactor,

            'secondary_selling_price' =>
            $secondarySellingPrice,

            'base_unit_cost' =>
            $baseUnitCost,

            'received_quantity' =>
            $receivedStockQuantity,

            'available_quantity' =>
            $availableStockQuantity,

            'available_primary_quantity' =>
            $availablePrimaryQuantity,

            'available_secondary_quantity' =>
            $isDualUnit
                ? $availableStockQuantity
                : null,

            'expiry_date' =>
            $batch
                ->expiry_date
                ?->format(
                    'Y-m-d',
                ),

            'is_expired' =>
            $batch
                ->expiry_date
                ? $batch
                ->expiry_date
                ->isBefore(
                    today(),
                )
                : false,

            'received_at' =>
            $batch
                ->received_at
                ?->toISOString(),

            'sale_options' =>
            $saleOptions,
        ];
    }

    /*
     * =====================================================
     * RESOLVE BATCH VARIANT ID
     * =====================================================
     */

    private function resolveBatchVariantId(
        StockBatch $batch,
    ): ?int {
        /*
         * Preferred source:
         * stock_batches.product_variant_id
         */
        $batchVariantId =
            $batch->getAttribute(
                'product_variant_id',
            );

        if (
            $batchVariantId
            !== null
            && (int) $batchVariantId
            > 0
        ) {
            return (int) $batchVariantId;
        }

        /*
         * Compatibility fallback:
         *
         * purchase_items.product_variant_id
         */
        if (
            $batch
            ->relationLoaded(
                'purchaseItem',
            )
            && $batch
            ->purchaseItem
            && $batch
            ->purchaseItem
            ->getAttribute(
                'product_variant_id',
            )
            !== null
            && (int) $batch
                ->purchaseItem
                ->getAttribute(
                    'product_variant_id',
                )
            > 0
        ) {
            return (int) $batch
                ->purchaseItem
                ->getAttribute(
                    'product_variant_id',
                );
        }

        return null;
    }

    /*
     * =====================================================
     * RESOLVE VARIANT MODEL
     * =====================================================
     */

    private function resolveBatchVariant(
        Product $product,
        StockBatch $batch,
    ): ?ProductVariant {
        $variantId =
            $this
            ->resolveBatchVariantId(
                $batch,
            );

        if (
            $variantId
            === null
        ) {
            return null;
        }

        /*
         * Normally already loaded.
         */
        if (
            $product
            ->relationLoaded(
                'variants',
            )
        ) {
            $variant =
                $product
                ->variants
                ->firstWhere(
                    'id',
                    $variantId,
                );

            return $variant
                instanceof ProductVariant
                ? $variant
                : null;
        }

        return ProductVariant::query()
            ->where(
                'product_id',
                $product->id,
            )
            ->whereKey(
                $variantId,
            )
            ->where(
                'is_active',
                true,
            )
            ->first();
    }

    /*
     * =====================================================
     * STOCK UNIT
     * =====================================================
     */

    private function batchStockUnit(
        StockBatch $batch,
        Product $product,
        ?ProductVariant $variant = null,
    ): string {
        $batchStockUnit =
            trim(
                (string) $batch
                    ->stock_unit,
            );

        if (
            $batchStockUnit
            !== ''
        ) {
            return $batchStockUnit;
        }

        /*
         * Dual unit:
         *
         * Bag stock is physically stored as Kg.
         */
        if (
            (bool) $batch
                ->is_dual_unit
        ) {
            $secondaryUnit =
                trim(
                    (string) $batch
                        ->secondary_unit,
                );

            if (
                $secondaryUnit
                !== ''
            ) {
                return $secondaryUnit;
            }
        }

        /*
         * Variant:
         *
         * 100g Packet
         * physical quantity = Packet
         */
        if (
            $variant
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
                return $variantPackageUnit;
            }
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
     * EXACT PURCHASE COST
     * =====================================================
     */

    private function purchaseCost(
        StockBatch $batch,
    ): float {
        /*
         * Exact linked purchase item is the
         * source of truth.
         */
        if (
            $batch
            ->purchaseItem
            && $batch
            ->purchaseItem
            ->unit_cost
            !== null
        ) {
            return round(
                (float) $batch
                    ->purchaseItem
                    ->unit_cost,
                2,
            );
        }

        return round(
            (float) $batch
                ->purchase_cost,
            2,
        );
    }

    /*
     * =====================================================
     * BASE UNIT COST
     * =====================================================
     */

    private function baseUnitCost(
        StockBatch $batch,
        float $purchaseCost,
        float $conversionFactor,
        bool $isDualUnit,
    ): float {
        if (
            ! $isDualUnit
        ) {
            return round(
                $purchaseCost,
                4,
            );
        }

        if (
            $batch
            ->base_unit_cost
            !== null
        ) {
            return round(
                (float) $batch
                    ->base_unit_cost,
                4,
            );
        }

        if (
            $conversionFactor
            <= 0
        ) {
            return 0;
        }

        return round(
            $purchaseCost
                / $conversionFactor,
            4,
        );
    }
}
