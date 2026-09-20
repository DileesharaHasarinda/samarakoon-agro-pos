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
use Illuminate\Support\Collection;

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

            /*
             * Customer-requested full-catalogue mode.
             *
             * Normal New Sale does not send this flag and therefore
             * continues to return only products with current stock.
             *
             * All Products Sale sends include_all=1 and receives every
             * catalogue product, including products with zero stock or
             * products that have never been purchased.
             */
            'include_all' => [
                'nullable',
                'boolean',
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

        $includeAllProducts =
            (bool) (
                $validated['include_all']
                ?? false
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
                function (
                    $query,
                ) use (
                    $includeAllProducts,
                ): void {
                    /*
                     * Normal New Sale:
                     * only current positive stock is loaded.
                     *
                     * Training / full catalogue:
                     * historical batches are also loaded so the
                     * trainee can still choose the correct variant
                     * and Bag/Kg style units without changing stock.
                     */
                    if (
                        ! $includeAllProducts
                    ) {
                        $query->where(
                            'available_quantity',
                            '>',
                            0,
                        );
                    }

                    /*
                     * Expired lots must never be exposed to either
                     * the real POS or the training catalogue.
                     *
                     * expiry_date = today is still valid today.
                     */
                    $query
                        ->where(
                            function (
                                Builder $dateQuery,
                            ): void {
                                $dateQuery
                                    ->whereNull(
                                        'expiry_date',
                                    )
                                    ->orWhereDate(
                                        'expiry_date',
                                        '>=',
                                        today(),
                                    );
                            },
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
            /*
             * Count every historical stock batch so the catalogue page
             * can distinguish:
             *
             * - never purchased,
             * - purchased before but currently out of stock,
             * - currently available for sale.
             */
            ->withCount(
                'stockBatches',
            )
            /*
             * Preserve the existing New Sale behaviour unless
             * include_all was explicitly requested.
             */
            ->when(
                ! $includeAllProducts,
                function (
                    Builder $query,
                ): void {
                    $query->whereHas(
                        'stockBatches',
                        function (
                            Builder $stockQuery,
                        ): void {
                            $stockQuery
                                ->where(
                                    'available_quantity',
                                    '>',
                                    0,
                                )
                                ->where(
                                    function (
                                        Builder $dateQuery,
                                    ): void {
                                        $dateQuery
                                            ->whereNull(
                                                'expiry_date',
                                            )
                                            ->orWhereDate(
                                                'expiry_date',
                                                '>=',
                                                today(),
                                            );
                                    },
                                );
                        },
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
                    $includeAllProducts,
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
                    ->where(
                        function (
                            Builder $dateQuery,
                        ): void {
                            $dateQuery
                                ->whereNull(
                                    'expiry_date',
                                )
                                ->orWhereDate(
                                    'expiry_date',
                                    '>=',
                                    today(),
                                );
                        },
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
        bool $includeTrainingOptions = false,
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
        /*
         * In include_all mode the relationship may contain historical
         * zero-stock batches. Keep them for training metadata, while the
         * normal POS calculations below continue to use positive stock only.
         */
        $historicalBatches =
            $product
            ->stockBatches
            ->filter(
                function (
                    StockBatch $batch,
                ): bool {
                    /*
                     * Defensive expiry guard.
                     *
                     * Even if this method is called with a relation that was
                     * loaded somewhere else, an expired lot must not be
                     * returned to the POS or training UI.
                     */
                    if (
                        ! $batch->expiry_date
                    ) {
                        return true;
                    }

                    return ! $batch
                        ->expiry_date
                        ->isBefore(
                            today(),
                        );
                },
            )
            ->values();

        $batches = $historicalBatches
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
         * =====================================================
         * CATALOGUE SALE STATUS
         * =====================================================
         *
         * stock_batches_count is loaded by index() using
         * withCount('stockBatches'). show() remains compatible via
         * the relation fallback below.
         */
        $stockBatchCount =
            (int) (
                $product->getAttribute(
                    'stock_batches_count',
                )
                ?? (
                    $product
                    ->relationLoaded(
                        'stockBatches',
                    )
                    ? $product
                    ->stockBatches
                    ->count()
                    : 0
                )
            );

        $canSell =
            $batches->isNotEmpty()
            && $totalAvailableQuantity > 0;

        $catalogStatus =
            $canSell
            ? 'available'
            : (
                $stockBatchCount > 0
                ? 'out_of_stock'
                : 'not_purchased'
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

        $trainingOptions =
            $includeTrainingOptions
            ? $this->trainingOptions(
                $product,
                $historicalBatches,
                $variants,
            )
            : [];

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
             * Metadata used by the All Products Sale page.
             */
            'has_purchase_history' =>
            $stockBatchCount > 0,

            'can_sell' =>
            $canSell,

            'catalog_status' =>
            $catalogStatus,

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

            /*
             * Training-only choices. No price is included here.
             * These options are never submitted to the real SaleController.
             */
            'training_options' =>
            $trainingOptions,

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
     * TRAINING BILL OPTIONS
     * =====================================================
     *
     * The All Products training page needs product/variant/unit choices
     * even when current stock is zero. These options contain no selling
     * prices and are not used by the real sale endpoint.
     */
    private function trainingOptions(
        Product $product,
        Collection $historicalBatches,
        Collection $variants,
    ): array {
        $options = collect();

        $appendOption =
            function (
                string $kind,
                string $unit,
                string $primaryUnit,
                string $stockUnit,
                ?ProductVariant $variant,
                bool $isDualUnit,
                float $conversionFactor,
            ) use (
                $options,
            ): void {
                $cleanUnit =
                    trim(
                        $unit,
                    );

                if (
                    $cleanUnit === ''
                ) {
                    return;
                }

                $variantId =
                    $variant
                    ? (int) $variant->id
                    : null;

                $variantName =
                    $variant
                    ? $variant->displayName()
                    : null;

                $labelPrefix =
                    $variantName
                    ? "{$variantName} — "
                    : '';

                $unitLabel =
                    $isDualUnit
                    ? (
                        $kind === 'secondary'
                        ? "Loose {$cleanUnit}"
                        : "Full {$cleanUnit}"
                    )
                    : $cleanUnit;

                $options->push([
                    'key' =>
                    implode(
                        ':',
                        [
                            $variantId
                                ?? 'product',

                            $kind,

                            strtolower(
                                $cleanUnit,
                            ),
                        ],
                    ),

                    'label' =>
                    "{$labelPrefix}{$unitLabel}",

                    'unit' =>
                    $cleanUnit,

                    'primary_unit' =>
                    trim(
                        $primaryUnit,
                    ) !== ''
                        ? trim(
                            $primaryUnit,
                        )
                        : $cleanUnit,

                    'stock_unit' =>
                    trim(
                        $stockUnit,
                    ) !== ''
                        ? trim(
                            $stockUnit,
                        )
                        : $cleanUnit,

                    'variant_id' =>
                    $variantId,

                    'variant_name' =>
                    $variantName,

                    'is_dual_unit' =>
                    $isDualUnit,

                    'conversion_factor' =>
                    $conversionFactor > 0
                        ? round(
                            $conversionFactor,
                            3,
                        )
                        : 1.0,
                ]);
            };

        foreach (
            $historicalBatches
            as $batch
        ) {
            if (
                ! $batch
                    instanceof StockBatch
            ) {
                continue;
            }

            $variant =
                $this
                ->resolveBatchVariant(
                    $product,
                    $batch,
                );

            /*
             * If this is a variant product, ignore historical batches
             * belonging to removed/inactive variants.
             */
            if (
                $variants->isNotEmpty()
                && ! $variant
            ) {
                continue;
            }

            $variantPackageUnit =
                $variant
                ? trim(
                    (string) $variant
                        ->package_unit,
                )
                : '';

            $primaryUnit =
                $variantPackageUnit !== ''
                ? $variantPackageUnit
                : (
                    trim(
                        (string) $product
                            ->unit,
                    ) !== ''
                    ? (string) $product
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
                trim(
                    (string) (
                        $batch
                        ->secondary_unit
                        ?? ''
                    ),
                );

            $rawConversionFactor =
                (float) (
                    $batch
                    ->conversion_factor
                    ?? 1
                );

            /*
             * Legacy compatibility:
             * some old batches may not have is_dual_unit populated.
             */
            $isDualUnit =
                (bool) $batch
                    ->is_dual_unit
                || (
                    $secondaryUnit !== ''
                    && $rawConversionFactor > 1
                );

            $conversionFactor =
                $isDualUnit
                ? max(
                    0.001,
                    round(
                        $rawConversionFactor,
                        3,
                    ),
                )
                : 1.0;

            $appendOption(
                kind: 'primary',

                unit: $primaryUnit,

                primaryUnit: $primaryUnit,

                stockUnit: $stockUnit,

                variant: $variant,

                isDualUnit: $isDualUnit,

                conversionFactor: $conversionFactor,
            );

            if (
                $isDualUnit
            ) {
                $looseUnit =
                    $secondaryUnit !== ''
                    ? $secondaryUnit
                    : $stockUnit;

                $appendOption(
                    kind: 'secondary',

                    unit: $looseUnit,

                    primaryUnit: $primaryUnit,

                    stockUnit: $stockUnit,

                    variant: $variant,

                    isDualUnit: true,

                    conversionFactor: 1.0,
                );
            }
        }

        /*
         * A variant may exist before it has ever been purchased.
         * Still expose that variant to the training bill.
         */
        foreach (
            $variants
            as $variant
        ) {
            if (
                ! $variant
                    instanceof ProductVariant
            ) {
                continue;
            }

            $alreadyIncluded =
                $options->contains(
                    fn(
                        array $option,
                    ): bool => (
                        $option['variant_id']
                        ?? null
                    )
                        === (int) $variant->id,
                );

            if (
                $alreadyIncluded
            ) {
                continue;
            }

            $variantUnit =
                trim(
                    (string) $variant
                        ->package_unit,
                );

            if (
                $variantUnit === ''
            ) {
                $variantUnit =
                    trim(
                        (string) $product
                            ->unit,
                    );
            }

            if (
                $variantUnit === ''
            ) {
                $variantUnit =
                    'Unit';
            }

            $appendOption(
                kind: 'primary',

                unit: $variantUnit,

                primaryUnit: $variantUnit,

                stockUnit: $variantUnit,

                variant: $variant,

                isDualUnit: false,

                conversionFactor: 1.0,
            );
        }

        /*
         * Product has never been purchased and has no variants.
         */
        if (
            $options->isEmpty()
        ) {
            $unit =
                trim(
                    (string) $product
                        ->unit,
                );

            if (
                $unit === ''
            ) {
                $unit =
                    'Unit';
            }

            $appendOption(
                kind: 'primary',

                unit: $unit,

                primaryUnit: $unit,

                stockUnit: $unit,

                variant: null,

                isDualUnit: false,

                conversionFactor: 1.0,
            );
        }

        return $options
            ->unique(
                'key',
            )
            ->values()
            ->all();
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
