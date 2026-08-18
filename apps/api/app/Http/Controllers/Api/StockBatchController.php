<?php

namespace App\Http\Controllers\Api;

use App\Events\PosStockUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Stock\UpdateStockBatchRequest;
use App\Models\StockBatch;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockBatchController extends Controller
{
    public function update(
        UpdateStockBatchRequest $request,
        StockBatch $stockBatch,
    ): JsonResponse {
        $validated = $request->validated();

        $result = DB::transaction(
            function () use (
                $validated,
                $stockBatch,
                $request,
            ): array {
                /** @var StockBatch $batch */
                $batch = StockBatch::query()
                    ->with([
                        'product',
                        'productVariant',
                    ])
                    ->lockForUpdate()
                    ->findOrFail(
                        $stockBatch->id,
                    );

                $oldSellingPrice = round(
                    (float) $batch->selling_price,
                    2,
                );

                $oldSecondarySellingPrice =
                    $batch->secondary_selling_price !== null
                    ? round(
                        (float) $batch->secondary_selling_price,
                        2,
                    )
                    : null;

                $oldAvailableQuantity = round(
                    (float) $batch->available_quantity,
                    3,
                );

                $newSellingPrice = round(
                    (float) $validated['selling_price'],
                    2,
                );

                $newAvailableQuantity = round(
                    (float) $validated['available_quantity'],
                    3,
                );

                $isDualUnit = $batch->usesDualUnit();

                if (
                    $isDualUnit
                    && (
                        !array_key_exists(
                            'secondary_selling_price',
                            $validated,
                        )
                        || $validated['secondary_selling_price'] === null
                    )
                ) {
                    throw ValidationException::withMessages([
                        'secondary_selling_price' =>
                        sprintf(
                            'Enter the selling price for the loose %s unit.',
                            $batch->secondaryUnitValue()
                                ?? 'secondary',
                        ),
                    ]);
                }

                $newSecondarySellingPrice =
                    $isDualUnit
                    ? round(
                        (float) $validated['secondary_selling_price'],
                        2,
                    )
                    : null;

                $priceChanged =
                    abs(
                        $newSellingPrice
                            - $oldSellingPrice,
                    ) > 0.0001;

                $secondaryPriceChanged =
                    $this->nullableMoneyChanged(
                        $oldSecondarySellingPrice,
                        $newSecondarySellingPrice,
                    );

                $stockChanged =
                    abs(
                        $newAvailableQuantity
                            - $oldAvailableQuantity,
                    ) > 0.0001;

                $reason = trim(
                    (string) (
                        $validated['reason']
                        ?? ''
                    ),
                );

                if (
                    $stockChanged
                    && $reason === ''
                ) {
                    throw ValidationException::withMessages([
                        'reason' =>
                        'Enter a reason for changing the physical stock quantity.',
                    ]);
                }

                if (
                    !$priceChanged
                    && !$secondaryPriceChanged
                    && !$stockChanged
                ) {
                    return [
                        'batch' => $batch,
                        'price_changed' => false,
                        'stock_changed' => false,
                        'movement_id' => null,
                        'changed' => false,
                    ];
                }

                $batch->forceFill([
                    'selling_price' =>
                    $newSellingPrice,

                    'secondary_selling_price' =>
                    $newSecondarySellingPrice,

                    'available_quantity' =>
                    $newAvailableQuantity,
                ]);

                $batch->save();

                $noteParts = [];

                if ($priceChanged) {
                    $noteParts[] = sprintf(
                        'Main selling price changed from %.2f to %.2f.',
                        $oldSellingPrice,
                        $newSellingPrice,
                    );
                }

                if ($secondaryPriceChanged) {
                    $noteParts[] = sprintf(
                        'Loose selling price changed from %s to %s.',
                        $oldSecondarySellingPrice !== null
                            ? number_format(
                                $oldSecondarySellingPrice,
                                2,
                                '.',
                                '',
                            )
                            : 'not set',
                        $newSecondarySellingPrice !== null
                            ? number_format(
                                $newSecondarySellingPrice,
                                2,
                                '.',
                                '',
                            )
                            : 'not set',
                    );
                }

                if ($stockChanged) {
                    $noteParts[] = sprintf(
                        'Available stock changed from %.3f to %.3f %s.',
                        $oldAvailableQuantity,
                        $newAvailableQuantity,
                        $batch->stockUnitValue(),
                    );
                }

                if ($reason !== '') {
                    $noteParts[] = sprintf(
                        'Reason: %s',
                        $reason,
                    );
                }

                $movement = StockMovement::query()
                    ->create([
                        'product_id' =>
                        $batch->product_id,

                        'stock_batch_id' =>
                        $batch->id,

                        'movement_type' =>
                        StockMovement::TYPE_ADJUSTMENT,

                        'quantity_before' =>
                        $oldAvailableQuantity,

                        'quantity_change' =>
                        round(
                            $newAvailableQuantity
                                - $oldAvailableQuantity,
                            3,
                        ),

                        'quantity_after' =>
                        $newAvailableQuantity,

                        'reference_type' =>
                        'stock_adjustment',

                        'reference_id' =>
                        $batch->id,

                        'reference_number' =>
                        $batch->batch_number
                            ?: $batch->batch_code
                            ?: sprintf(
                                'STOCK-%d',
                                $batch->id,
                            ),

                        'notes' =>
                        implode(
                            ' ',
                            $noteParts,
                        ),

                        'created_by' =>
                        $request->user()?->id,
                    ]);

                $movementId = $movement->id;

                $batch->refresh();
                $batch->load([
                    'product',
                    'productVariant',
                ]);

                return [
                    'batch' => $batch,
                    'price_changed' =>
                    $priceChanged
                        || $secondaryPriceChanged,
                    'stock_changed' =>
                    $stockChanged,
                    'movement_id' =>
                    $movementId,
                    'changed' => true,
                ];
            },
        );

        /** @var StockBatch $updatedBatch */
        $updatedBatch = $result['batch'];

        if ($result['changed']) {
            event(
                new PosStockUpdated(
                    0,
                    sprintf(
                        'ADMIN-STOCK-%d',
                        $updatedBatch->id,
                    ),
                    [
                        [
                            'id' =>
                            $updatedBatch->id,

                            'product_id' =>
                            $updatedBatch->product_id,

                            'product_variant_id' =>
                            $updatedBatch->product_variant_id,

                            'available_quantity' =>
                            round(
                                (float) $updatedBatch->available_quantity,
                                3,
                            ),

                            'selling_price' =>
                            round(
                                (float) $updatedBatch->selling_price,
                                2,
                            ),

                            'secondary_selling_price' =>
                            $updatedBatch->secondary_selling_price !== null
                                ? round(
                                    (float) $updatedBatch->secondary_selling_price,
                                    2,
                                )
                                : null,

                            'is_dual_unit' =>
                            (bool) $updatedBatch->is_dual_unit,

                            'primary_unit' =>
                            $updatedBatch->primaryUnitValue(),

                            'stock_unit' =>
                            $updatedBatch->stockUnitValue(),

                            'secondary_unit' =>
                            $updatedBatch->secondaryUnitValue(),

                            'conversion_factor' =>
                            round(
                                $updatedBatch->conversionFactorValue(),
                                3,
                            ),

                            'updated_at' =>
                            $updatedBatch->updated_at
                                ?->toISOString(),
                        ],
                    ],
                    'stock_batch_update',
                ),
            );
        }

        return response()->json([
            'message' =>
            $result['changed']
                ? 'Selling price and stock details updated successfully.'
                : 'No changes were necessary.',

            'data' => [
                'id' =>
                $updatedBatch->id,

                'product_id' =>
                $updatedBatch->product_id,

                'product_variant_id' =>
                $updatedBatch->product_variant_id,

                'selling_price' =>
                round(
                    (float) $updatedBatch->selling_price,
                    2,
                ),

                'secondary_selling_price' =>
                $updatedBatch->secondary_selling_price !== null
                    ? round(
                        (float) $updatedBatch->secondary_selling_price,
                        2,
                    )
                    : null,

                'available_quantity' =>
                round(
                    (float) $updatedBatch->available_quantity,
                    3,
                ),

                'stock_unit' =>
                $updatedBatch->stockUnitValue(),

                'primary_unit' =>
                $updatedBatch->primaryUnitValue(),

                'secondary_unit' =>
                $updatedBatch->secondaryUnitValue(),

                'conversion_factor' =>
                round(
                    $updatedBatch->conversionFactorValue(),
                    3,
                ),

                'price_changed' =>
                (bool) $result['price_changed'],

                'stock_changed' =>
                (bool) $result['stock_changed'],

                'stock_movement_id' =>
                $result['movement_id'],

                'updated_at' =>
                $updatedBatch->updated_at
                    ?->toISOString(),
            ],
        ]);
    }

    private function nullableMoneyChanged(
        ?float $before,
        ?float $after,
    ): bool {
        if (
            $before === null
            && $after === null
        ) {
            return false;
        }

        if (
            $before === null
            || $after === null
        ) {
            return true;
        }

        return abs(
            $before - $after,
        ) > 0.0001;
    }
}
