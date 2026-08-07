<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
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
                fn(
                    Category $category,
                ): array => [
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

                'stockBatches' =>
                function ($query): void {
                    $query
                        ->where(
                            'available_quantity',
                            '>',
                            0,
                        )
                        ->with([
                            'purchaseItem:id,product_id,unit_cost',
                        ])
                        ->orderByRaw(
                            'expiry_date IS NULL',
                        )
                        ->orderBy(
                            'expiry_date',
                        )
                        ->orderBy('id');
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
                ) => $query->where(
                    'category_id',
                    $categoryId,
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
                                    ) => $categoryQuery
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

    public function show(
        Product $product,
    ): JsonResponse {
        $product->load([
            'category:id,name',

            'stockBatches' =>
            function ($query): void {
                $query
                    ->where(
                        'available_quantity',
                        '>',
                        0,
                    )
                    ->with([
                        'purchaseItem:id,product_id,unit_cost',
                    ])
                    ->orderByRaw(
                        'expiry_date IS NULL',
                    )
                    ->orderBy(
                        'expiry_date',
                    )
                    ->orderBy('id');
            },
        ]);

        return response()->json([
            'data' =>
            $this->productData(
                $product,
            ),
        ]);
    }

    private function productData(
        Product $product,
    ): array {
        $batches = $product
            ->stockBatches
            ->filter(
                fn(
                    StockBatch $batch,
                ): bool =>
                (float) $batch
                    ->available_quantity
                    > 0,
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
            $batches->contains(
                fn(
                    StockBatch $batch,
                ): bool =>
                (bool) $batch
                    ->is_dual_unit,
            );

        $stockUnits =
            $batches
            ->map(
                fn(
                    StockBatch $batch,
                ): string =>
                $this->batchStockUnit(
                    $batch,
                    $product,
                ),
            )
            ->unique()
            ->values();

        $productStockUnit =
            $stockUnits->count() === 1
            ? (string) $stockUnits->first()
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

            'category' => [
                'id' =>
                $product->category->id,

                'name' =>
                $product->category->name,
            ],

            'total_available_quantity' =>
            $totalAvailableQuantity,

            'minimum_price' =>
            $primaryPrices->isEmpty()
                ? null
                : (float) $primaryPrices->min(),

            'maximum_price' =>
            $primaryPrices->isEmpty()
                ? null
                : (float) $primaryPrices->max(),

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

    private function batchData(
        Product $product,
        StockBatch $batch,
    ): array {
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

        $primaryUnit =
            trim(
                (string) $product->unit,
            ) !== ''
            ? $product->unit
            : 'Unit';

        $stockUnit =
            $this->batchStockUnit(
                $batch,
                $product,
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
            $batch->expiry_date
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

    private function batchStockUnit(
        StockBatch $batch,
        Product $product,
    ): string {
        $batchStockUnit =
            trim(
                (string) $batch
                    ->stock_unit,
            );

        if (
            $batchStockUnit !== ''
        ) {
            return $batchStockUnit;
        }

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
                $secondaryUnit !== ''
            ) {
                return $secondaryUnit;
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

    private function purchaseCost(
        StockBatch $batch,
    ): float {
        if (
            $batch->purchaseItem
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

    private function baseUnitCost(
        StockBatch $batch,
        float $purchaseCost,
        float $conversionFactor,
        bool $isDualUnit,
    ): float {
        if (! $isDualUnit) {
            return round(
                $purchaseCost,
                4,
            );
        }

        if (
            $batch->base_unit_cost
            !== null
        ) {
            return round(
                (float) $batch
                    ->base_unit_cost,
                4,
            );
        }

        if (
            $conversionFactor <= 0
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
