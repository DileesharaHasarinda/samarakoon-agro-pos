<?php

namespace App\Http\Controllers\Api;

use App\Events\PosStockUpdated;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OpeningInventoryController extends Controller
{
    public function store(
        Request $request,
    ): JsonResponse {
        $user = $request->user();

        if (!$user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validated = $request->validate([
            'supplier_id' => [
                'required',
                'integer',
                'exists:suppliers,id',
            ],

            'product_id' => [
                'required',
                'integer',
                'exists:products,id',
            ],

            'product_variant_id' => [
                'nullable',
                'integer',
                'exists:product_variants,id',
            ],

            'purchase_cost' => [
                'required',
                'numeric',
                'gt:0',
                'max:999999999999.99',
            ],

            'selling_price' => [
                'required',
                'numeric',
                'gt:0',
                'max:999999999999.99',
            ],

            /*
             * Normal product:
             *   current quantity in its main unit.
             *
             * Bag + Kg:
             *   number of FULL Bags.
             *   It can be 0 when loose_quantity > 0.
             */
            'available_quantity' => [
                'required',
                'numeric',
                'min:0',
                'max:99999999999.999',
            ],

            'is_dual_unit' => [
                'required',
                'boolean',
            ],

            'conversion_factor' => [
                'nullable',
                'numeric',
                'gt:0',
                'max:99999999999.999',
            ],

            'secondary_unit' => [
                'nullable',
                'string',
                'max:40',
            ],

            'secondary_selling_price' => [
                'nullable',
                'numeric',
                'gt:0',
                'max:999999999999.99',
            ],

            /*
             * Existing loose physical stock.
             *
             * Example:
             * 3 full Bags + 12 Kg loose.
             */
            'loose_quantity' => [
                'nullable',
                'numeric',
                'min:0',
                'max:99999999999.999',
            ],
        ]);

        $result = DB::transaction(
            function () use (
                $validated,
                $user,
            ): array {
                /** @var Product $product */
                $product = Product::query()
                    ->with([
                        'variants' =>
                        fn($query) =>
                        $query
                            ->orderBy('sort_order')
                            ->orderBy('id'),
                    ])
                    ->whereKey(
                        (int) $validated['product_id'],
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                if (!(bool) $product->is_active) {
                    throw ValidationException::withMessages([
                        'product_id' => [
                            'The selected product is inactive.',
                        ],
                    ]);
                }

                /** @var Supplier $supplier */
                $supplier = Supplier::query()
                    ->select([
                        'id',
                        'name',
                    ])
                    ->findOrFail(
                        (int) $validated['supplier_id'],
                    );

                $variantId =
                    isset($validated['product_variant_id'])
                    && $validated['product_variant_id'] !== null
                    ? (int) $validated['product_variant_id']
                    : null;

                $selectedVariant =
                    $this->resolveVariant(
                        $product,
                        $variantId,
                    );

                $purchaseCost =
                    round(
                        (float) $validated['purchase_cost'],
                        2,
                    );

                $sellingPrice =
                    round(
                        (float) $validated['selling_price'],
                        2,
                    );

                $mainQuantity =
                    round(
                        (float) $validated['available_quantity'],
                        3,
                    );

                $isDualUnit =
                    (bool) $validated['is_dual_unit'];

                if (
                    $selectedVariant instanceof ProductVariant
                    && $isDualUnit
                ) {
                    throw ValidationException::withMessages([
                        'is_dual_unit' => [
                            'Variant products use independent package stock and cannot use Bag-to-Kg dual-unit conversion.',
                        ],
                    ]);
                }

                if (
                    $isDualUnit
                    && !$this->isBagUnit($product->unit)
                ) {
                    throw ValidationException::withMessages([
                        'is_dual_unit' => [
                            'Loose Kg selling can only be enabled for products using Bag as the main unit.',
                        ],
                    ]);
                }

                $conversionFactor = 1.0;
                $secondaryUnit = null;
                $secondarySellingPrice = null;
                $looseQuantity = 0.0;

                if ($isDualUnit) {
                    if (
                        !array_key_exists(
                            'conversion_factor',
                            $validated,
                        )
                        || $validated['conversion_factor'] === null
                    ) {
                        throw ValidationException::withMessages([
                            'conversion_factor' => [
                                'Weight in one Bag is required.',
                            ],
                        ]);
                    }

                    $conversionFactor =
                        round(
                            (float) $validated['conversion_factor'],
                            3,
                        );

                    if ($conversionFactor <= 0) {
                        throw ValidationException::withMessages([
                            'conversion_factor' => [
                                'Weight in one Bag must be greater than zero.',
                            ],
                        ]);
                    }

                    $secondaryUnit =
                        trim(
                            (string) (
                                $validated['secondary_unit']
                                ?? 'Kg'
                            ),
                        );

                    if (
                        $this->normaliseUnit(
                            $secondaryUnit,
                        ) !== 'kg'
                    ) {
                        throw ValidationException::withMessages([
                            'secondary_unit' => [
                                'The loose selling unit must be Kg.',
                            ],
                        ]);
                    }

                    $secondaryUnit = 'Kg';

                    if (
                        !array_key_exists(
                            'secondary_selling_price',
                            $validated,
                        )
                        || $validated['secondary_selling_price'] === null
                    ) {
                        throw ValidationException::withMessages([
                            'secondary_selling_price' => [
                                'Selling price for 1 Kg is required.',
                            ],
                        ]);
                    }

                    $secondarySellingPrice =
                        round(
                            (float) $validated['secondary_selling_price'],
                            2,
                        );

                    if ($secondarySellingPrice <= 0) {
                        throw ValidationException::withMessages([
                            'secondary_selling_price' => [
                                'Selling price for 1 Kg must be greater than zero.',
                            ],
                        ]);
                    }

                    $looseQuantity =
                        round(
                            (float) (
                                $validated['loose_quantity']
                                ?? 0
                            ),
                            3,
                        );

                    if ($looseQuantity < 0) {
                        throw ValidationException::withMessages([
                            'loose_quantity' => [
                                'Loose Kg quantity cannot be negative.',
                            ],
                        ]);
                    }
                }

                if (
                    !$isDualUnit
                    && $mainQuantity <= 0
                ) {
                    throw ValidationException::withMessages([
                        'available_quantity' => [
                            'Available quantity must be greater than zero.',
                        ],
                    ]);
                }

                /*
                 * Physical stock invariant:
                 *
                 * Normal:
                 *   25 Packet -> 25 Packet.
                 *
                 * Dual unit:
                 *   3 Bag x 50 Kg + 12 Kg loose
                 *   -> 162 Kg physical stock.
                 */
                $physicalStockQuantity =
                    round(
                        $isDualUnit
                            ? (
                                (
                                    $mainQuantity
                                    * $conversionFactor
                                )
                                + $looseQuantity
                            )
                            : $mainQuantity,
                        3,
                    );

                if ($physicalStockQuantity <= 0) {
                    throw ValidationException::withMessages([
                        'available_quantity' => [
                            'Enter at least one full Bag or a loose Kg quantity greater than zero.',
                        ],
                    ]);
                }

                $primaryUnit =
                    trim(
                        (string) (
                            $selectedVariant?->package_unit
                            ?? $product->unit
                        ),
                    );

                if ($primaryUnit === '') {
                    $primaryUnit = 'Unit';
                }

                $stockUnit =
                    $isDualUnit
                    ? 'Kg'
                    : $primaryUnit;

                $baseUnitCost =
                    round(
                        $isDualUnit
                            ? (
                                $purchaseCost
                                / $conversionFactor
                            )
                            : $purchaseCost,
                        4,
                    );

                $batchQuery =
                    StockBatch::query()
                    ->where(
                        'product_id',
                        $product->id,
                    );

                if (
                    $selectedVariant instanceof ProductVariant
                ) {
                    $batchQuery->where(
                        'product_variant_id',
                        $selectedVariant->id,
                    );
                } else {
                    $batchQuery->whereNull(
                        'product_variant_id',
                    );
                }

                $availableBatches =
                    (clone $batchQuery)
                    ->where(
                        'available_quantity',
                        '>',
                        0,
                    )
                    ->lockForUpdate()
                    ->get();

                $this->ensureCompatibleCurrentStock(
                    product: $product,
                    availableBatches: $availableBatches,
                    expectedStockUnit: $stockUnit,
                );

                $quantityBefore =
                    round(
                        $availableBatches->sum(
                            fn(
                                StockBatch $batch,
                            ): float =>
                            (float) $batch
                                ->available_quantity,
                        ),
                        3,
                    );

                $temporaryBatchCode =
                    'OPEN-TMP-'
                    . Str::upper(
                        (string) Str::uuid(),
                    );

                /** @var StockBatch $batch */
                $batch = StockBatch::query()
                    ->create([
                        'batch_code' =>
                        $temporaryBatchCode,

                        'product_id' =>
                        $product->id,

                        'product_variant_id' =>
                        $selectedVariant?->id,

                        'purchase_item_id' =>
                        null,

                        'supplier_id' =>
                        $supplier->id,

                        'source_type' =>
                        StockBatch::SOURCE_OPENING_INVENTORY,

                        'batch_number' =>
                        null,

                        /*
                         * Both values are MAIN-unit prices.
                         *
                         * For dual-unit stock:
                         * purchase_cost = cost per Bag
                         * selling_price = price per Bag
                         */
                        'purchase_cost' =>
                        $purchaseCost,

                        'selling_price' =>
                        $sellingPrice,

                        'is_dual_unit' =>
                        $isDualUnit,

                        'stock_unit' =>
                        $stockUnit,

                        'secondary_unit' =>
                        $isDualUnit
                            ? $secondaryUnit
                            : null,

                        'conversion_factor' =>
                        $isDualUnit
                            ? $conversionFactor
                            : 1,

                        'secondary_selling_price' =>
                        $isDualUnit
                            ? $secondarySellingPrice
                            : null,

                        'base_unit_cost' =>
                        $baseUnitCost,

                        /*
                         * IMPORTANT:
                         * received_quantity / available_quantity are
                         * PHYSICAL stock quantities.
                         *
                         * For Bag/Kg they are stored in Kg.
                         */
                        'received_quantity' =>
                        $physicalStockQuantity,

                        'available_quantity' =>
                        $physicalStockQuantity,

                        'manufactured_date' =>
                        null,

                        'expiry_date' =>
                        null,

                        'received_at' =>
                        now(),
                    ]);

                $batch->forceFill([
                    'batch_code' =>
                    sprintf(
                        'OPEN-%08d',
                        $batch->id,
                    ),
                ]);

                $batch->save();

                $quantityAfter =
                    round(
                        $quantityBefore
                            + $physicalStockQuantity,
                        3,
                    );

                $movementNotes =
                    $isDualUnit
                    ? sprintf(
                        'Opening inventory added. Supplier: %s. Full Bags: %s %s. Loose stock: %s Kg. Weight per Bag: %s Kg. Physical stock added: %s Kg.',
                        $supplier->name,
                        $this->formatQuantity(
                            $mainQuantity,
                        ),
                        $primaryUnit,
                        $this->formatQuantity(
                            $looseQuantity,
                        ),
                        $this->formatQuantity(
                            $conversionFactor,
                        ),
                        $this->formatQuantity(
                            $physicalStockQuantity,
                        ),
                    )
                    : sprintf(
                        'Opening inventory added. Supplier: %s. Quantity: %s %s.',
                        $supplier->name,
                        $this->formatQuantity(
                            $mainQuantity,
                        ),
                        $primaryUnit,
                    );

                $movement =
                    StockMovement::query()
                    ->create([
                        'product_id' =>
                        $product->id,

                        'stock_batch_id' =>
                        $batch->id,

                        'movement_type' =>
                        StockMovement::TYPE_OPENING_INVENTORY,

                        'quantity_before' =>
                        $quantityBefore,

                        'quantity_change' =>
                        $physicalStockQuantity,

                        'quantity_after' =>
                        $quantityAfter,

                        'reference_type' =>
                        'opening_inventory',

                        'reference_id' =>
                        $batch->id,

                        'reference_number' =>
                        $batch->batch_code,

                        'notes' =>
                        $movementNotes,

                        'created_by' =>
                        $user->id,
                    ]);

                $batch->refresh();

                $batch->load([
                    'product',
                    'productVariant',
                    'supplier',
                ]);

                return [
                    'batch' =>
                    $batch,

                    'movement_id' =>
                    $movement->id,

                    'supplier' =>
                    $supplier,

                    'main_quantity' =>
                    $mainQuantity,

                    'loose_quantity' =>
                    $looseQuantity,

                    'physical_stock_quantity' =>
                    $physicalStockQuantity,

                    'primary_unit' =>
                    $primaryUnit,

                    'stock_unit' =>
                    $stockUnit,
                ];
            },
            3,
        );

        /** @var StockBatch $batch */
        $batch =
            $result['batch'];

        event(
            new PosStockUpdated(
                0,
                sprintf(
                    'OPENING-INVENTORY-%d',
                    $batch->id,
                ),
                [
                    [
                        'id' =>
                        $batch->id,

                        'product_id' =>
                        $batch->product_id,

                        'product_variant_id' =>
                        $batch->product_variant_id,

                        'available_quantity' =>
                        round(
                            (float) $batch
                                ->available_quantity,
                            3,
                        ),

                        'selling_price' =>
                        round(
                            (float) $batch
                                ->selling_price,
                            2,
                        ),

                        'secondary_selling_price' =>
                        $batch
                            ->secondary_selling_price
                            !== null
                            ? round(
                                (float) $batch
                                    ->secondary_selling_price,
                                2,
                            )
                            : null,

                        'is_dual_unit' =>
                        (bool) $batch
                            ->is_dual_unit,

                        'primary_unit' =>
                        $batch
                            ->primaryUnitValue(),

                        'stock_unit' =>
                        $batch
                            ->stockUnitValue(),

                        'secondary_unit' =>
                        $batch
                            ->secondaryUnitValue(),

                        'conversion_factor' =>
                        round(
                            $batch
                                ->conversionFactorValue(),
                            3,
                        ),

                        'updated_at' =>
                        $batch
                            ->updated_at
                            ?->toISOString(),
                    ],
                ],
                'opening_inventory',
            ),
        );

        /** @var Supplier $supplier */
        $supplier =
            $result['supplier'];

        return response()->json([
            'message' =>
            'Opening inventory added successfully.',

            'data' => [
                'id' =>
                $batch->id,

                'batch_code' =>
                $batch->batch_code,

                'source_type' =>
                $batch->source_type,

                'supplier' => [
                    'id' =>
                    $supplier->id,

                    'name' =>
                    $supplier->name,
                ],

                'product' => [
                    'id' =>
                    $batch->product->id,

                    'name' =>
                    $batch->product->name,
                ],

                'variant' =>
                $batch->productVariant
                    ? [
                        'id' =>
                        $batch
                            ->productVariant
                            ->id,

                        'display_name' =>
                        $batch
                            ->productVariant
                            ->displayName(),

                        'package_unit' =>
                        $batch
                            ->productVariant
                            ->package_unit,
                    ]
                    : null,

                'purchase_cost' =>
                round(
                    (float) $batch
                        ->purchase_cost,
                    2,
                ),

                'selling_price' =>
                round(
                    (float) $batch
                        ->selling_price,
                    2,
                ),

                'entered_quantity' =>
                $result['main_quantity'],

                'loose_quantity' =>
                $result['loose_quantity'],

                'primary_unit' =>
                $result['primary_unit'],

                'available_quantity' =>
                round(
                    (float) $batch
                        ->available_quantity,
                    3,
                ),

                'stock_unit' =>
                $result['stock_unit'],

                'is_dual_unit' =>
                (bool) $batch
                    ->is_dual_unit,

                'secondary_unit' =>
                $batch
                    ->secondaryUnitValue(),

                'conversion_factor' =>
                round(
                    $batch
                        ->conversionFactorValue(),
                    3,
                ),

                'secondary_selling_price' =>
                $batch
                    ->secondarySellingPriceValue(),

                'base_unit_cost' =>
                round(
                    $batch
                        ->baseUnitCostValue(),
                    4,
                ),

                'stock_movement_id' =>
                $result['movement_id'],

                'received_at' =>
                $batch
                    ->received_at
                    ?->toISOString(),
            ],
        ], 201);
    }

    private function resolveVariant(
        Product $product,
        ?int $variantId,
    ): ?ProductVariant {
        $hasVariantConfiguration =
            $product
            ->variants
            ->isNotEmpty();

        if ($hasVariantConfiguration) {
            if ($variantId === null) {
                throw ValidationException::withMessages([
                    'product_variant_id' => [
                        "Please select a variant for {$product->name}.",
                    ],
                ]);
            }

            $variant =
                $product
                ->variants
                ->firstWhere(
                    'id',
                    $variantId,
                );

            if (
                !$variant instanceof ProductVariant
                || !(bool) $variant->is_active
            ) {
                throw ValidationException::withMessages([
                    'product_variant_id' => [
                        'The selected product variant is invalid or inactive.',
                    ],
                ]);
            }

            return $variant;
        }

        if ($variantId !== null) {
            throw ValidationException::withMessages([
                'product_variant_id' => [
                    'This product does not use variants.',
                ],
            ]);
        }

        return null;
    }

    /**
     * @param Collection<int, StockBatch> $availableBatches
     */
    private function ensureCompatibleCurrentStock(
        Product $product,
        Collection $availableBatches,
        string $expectedStockUnit,
    ): void {
        foreach (
            $availableBatches
            as $batch
        ) {
            $existingStockUnit =
                trim(
                    $batch
                        ->stockUnitValue(),
                );

            if (
                $this->normaliseUnit(
                    $existingStockUnit,
                )
                !== $this->normaliseUnit(
                    $expectedStockUnit,
                )
            ) {
                throw ValidationException::withMessages([
                    'product_id' => [
                        "{$product->name} already has available stock stored in {$existingStockUnit}. Opening stock cannot be added in {$expectedStockUnit} until the current stock is finished or converted.",
                    ],
                ]);
            }
        }
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
            trim(
                $unit,
            ),
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
}
