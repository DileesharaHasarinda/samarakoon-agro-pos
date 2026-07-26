<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\UpdateProductStockSettingRequest;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InventoryAlertController extends Controller
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

            'category_id' => [
                'nullable',
                'integer',
                'exists:categories,id',
            ],

            'alert_status' => [
                'nullable',

                Rule::in([
                    'all',
                    'low_stock',
                    'out_of_stock',
                    'expired',
                    'expiring_7',
                    'expiring_30',
                    'expiring_60',
                    'safe',
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

        $categoryId =
            $validated['category_id']
            ?? null;

        $alertStatus =
            $validated['alert_status']
            ?? 'all';

        $page = (int) (
            $validated['page']
            ?? 1
        );

        $perPage = (int) (
            $validated['per_page']
            ?? 20
        );

        $today =
            today();

        $todayString =
            $today->toDateString();

        $sevenDays =
            $today
            ->copy()
            ->addDays(7)
            ->toDateString();

        $thirtyDays =
            $today
            ->copy()
            ->addDays(30)
            ->toDateString();

        $sixtyDays =
            $today
            ->copy()
            ->addDays(60)
            ->toDateString();

        $rows =
            DB::table('products')
            ->join(
                'categories',
                'categories.id',
                '=',
                'products.category_id',
            )
            ->leftJoin(
                'stock_batches',
                'stock_batches.product_id',
                '=',
                'products.id',
            )
            ->when(
                $search !== '',
                function (
                    $query,
                ) use ($search): void {
                    $query->where(
                        function (
                            $searchQuery,
                        ) use ($search): void {
                            $searchQuery
                                ->where(
                                    'products.name',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'products.sku',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'products.barcode',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'categories.name',
                                    'like',
                                    "%{$search}%",
                                );
                        },
                    );
                },
            )
            ->when(
                $categoryId !== null,
                fn($query) =>
                $query->where(
                    'products.category_id',
                    $categoryId,
                ),
            )
            ->select([
                'products.id',
                'products.name',
                'products.sku',
                'products.barcode',
                'products.unit',
                'products.minimum_stock_level',
                'products.reorder_quantity',
                'products.expiry_alert_days',
                'categories.id as category_id',
                'categories.name as category_name',
            ])
            ->selectRaw(
                '
                        COALESCE(
                            SUM(
                                CASE
                                    WHEN stock_batches.available_quantity > 0
                                    THEN stock_batches.available_quantity
                                    ELSE 0
                                END
                            ),
                            0
                        ) AS total_available_quantity
                    ',
            )
            ->selectRaw(
                '
                        MIN(
                            CASE
                                WHEN stock_batches.available_quantity > 0
                                    AND stock_batches.expiry_date IS NOT NULL
                                    AND stock_batches.expiry_date >= ?
                                THEN stock_batches.expiry_date
                                ELSE NULL
                            END
                        ) AS nearest_expiry
                    ',
                [
                    $todayString,
                ],
            )
            ->selectRaw(
                '
                        SUM(
                            CASE
                                WHEN stock_batches.available_quantity > 0
                                    AND stock_batches.expiry_date IS NOT NULL
                                    AND stock_batches.expiry_date < ?
                                THEN 1
                                ELSE 0
                            END
                        ) AS expired_batch_count
                    ',
                [
                    $todayString,
                ],
            )
            ->selectRaw(
                '
                        SUM(
                            CASE
                                WHEN stock_batches.available_quantity > 0
                                    AND stock_batches.expiry_date BETWEEN ? AND ?
                                THEN 1
                                ELSE 0
                            END
                        ) AS expiring_7_count
                    ',
                [
                    $todayString,
                    $sevenDays,
                ],
            )
            ->selectRaw(
                '
                        SUM(
                            CASE
                                WHEN stock_batches.available_quantity > 0
                                    AND stock_batches.expiry_date BETWEEN ? AND ?
                                THEN 1
                                ELSE 0
                            END
                        ) AS expiring_30_count
                    ',
                [
                    $todayString,
                    $thirtyDays,
                ],
            )
            ->selectRaw(
                '
                        SUM(
                            CASE
                                WHEN stock_batches.available_quantity > 0
                                    AND stock_batches.expiry_date BETWEEN ? AND ?
                                THEN 1
                                ELSE 0
                            END
                        ) AS expiring_60_count
                    ',
                [
                    $todayString,
                    $sixtyDays,
                ],
            )
            ->groupBy([
                'products.id',
                'products.name',
                'products.sku',
                'products.barcode',
                'products.unit',
                'products.minimum_stock_level',
                'products.reorder_quantity',
                'products.expiry_alert_days',
                'categories.id',
                'categories.name',
            ])
            ->orderBy(
                'products.name',
            )
            ->get();

        $productIds =
            $rows
            ->pluck('id')
            ->map(
                fn(
                    mixed $id,
                ): int => (int) $id,
            )
            ->values();

        $batchesByProduct =
            $productIds->isEmpty()
            ? collect()
            : DB::table('stock_batches')
            ->whereIn(
                'product_id',
                $productIds,
            )
            ->where(
                'available_quantity',
                '>',
                0,
            )
            ->select([
                'id',
                'product_id',
                'batch_code',
                'batch_number',
                'available_quantity',
                'purchase_cost',
                'selling_price',
                'expiry_date',
                'received_at',
            ])
            ->orderByRaw(
                '
                            CASE
                                WHEN expiry_date IS NULL
                                THEN 1
                                ELSE 0
                            END
                        ',
            )
            ->orderBy(
                'expiry_date',
            )
            ->orderBy(
                'id',
            )
            ->get()
            ->groupBy(
                'product_id',
            );

        $products =
            $rows->map(
                function (
                    object $row,
                ) use (
                    $batchesByProduct,
                    $today,
                ): array {
                    $available =
                        round(
                            (float) $row
                                ->total_available_quantity,
                            3,
                        );

                    $minimum =
                        round(
                            (float) $row
                                ->minimum_stock_level,
                            3,
                        );

                    $reorder =
                        round(
                            (float) $row
                                ->reorder_quantity,
                            3,
                        );

                    $expiredCount =
                        (int) $row
                            ->expired_batch_count;

                    $expiringSeven =
                        (int) $row
                            ->expiring_7_count;

                    $expiringThirty =
                        (int) $row
                            ->expiring_30_count;

                    $expiringSixty =
                        (int) $row
                            ->expiring_60_count;

                    $stockStatus =
                        $available <= 0
                        ? 'out_of_stock'
                        : (
                            $minimum > 0
                            && $available <= $minimum
                            ? 'low_stock'
                            : 'in_stock'
                        );

                    $expiryStatus =
                        $this->expiryStatus(
                            $row->nearest_expiry
                                ? (string) $row
                                    ->nearest_expiry
                                : null,
                            $expiredCount,
                            $today,
                        );

                    $alertStatus =
                        $this->alertStatus(
                            $stockStatus,
                            $expiryStatus,
                        );

                    $shortage =
                        max(
                            0,
                            $minimum - $available,
                        );

                    $suggestedReorder =
                        in_array(
                            $stockStatus,
                            [
                                'out_of_stock',
                                'low_stock',
                            ],
                            true,
                        )
                        ? max(
                            $reorder,
                            $shortage,
                        )
                        : 0;

                    $batches =
                        collect(
                            $batchesByProduct->get(
                                $row->id,
                                collect(),
                            ),
                        )
                        ->take(20)
                        ->map(
                            function (
                                object $batch,
                            ) use ($today): array {
                                $expiryDate =
                                    $batch->expiry_date
                                    ? (string) $batch
                                        ->expiry_date
                                    : null;

                                $expiryState =
                                    'no_expiry';

                                $daysUntilExpiry =
                                    null;

                                if ($expiryDate) {
                                    $expiry =
                                        Carbon::parse(
                                            $expiryDate,
                                        )->startOfDay();

                                    $daysUntilExpiry =
                                        $today->diffInDays(
                                            $expiry,
                                            false,
                                        );

                                    if (
                                        $daysUntilExpiry < 0
                                    ) {
                                        $expiryState =
                                            'expired';
                                    } elseif (
                                        $daysUntilExpiry <= 7
                                    ) {
                                        $expiryState =
                                            'expiring_7';
                                    } elseif (
                                        $daysUntilExpiry <= 30
                                    ) {
                                        $expiryState =
                                            'expiring_30';
                                    } elseif (
                                        $daysUntilExpiry <= 60
                                    ) {
                                        $expiryState =
                                            'expiring_60';
                                    } else {
                                        $expiryState =
                                            'safe';
                                    }
                                }

                                return [
                                    'id' =>
                                    (int) $batch->id,

                                    'batch_code' =>
                                    (string) $batch
                                        ->batch_code,

                                    'batch_number' =>
                                    $batch->batch_number
                                        ? (string) $batch
                                            ->batch_number
                                        : null,

                                    'available_quantity' =>
                                    (float) $batch
                                        ->available_quantity,

                                    'purchase_cost' =>
                                    (float) $batch
                                        ->purchase_cost,

                                    'selling_price' =>
                                    (float) $batch
                                        ->selling_price,

                                    'expiry_date' =>
                                    $expiryDate,

                                    'days_until_expiry' =>
                                    $daysUntilExpiry,

                                    'expiry_status' =>
                                    $expiryState,

                                    'received_at' =>
                                    $batch->received_at
                                        ? (string) $batch
                                            ->received_at
                                        : null,
                                ];
                            },
                        )
                        ->values();

                    return [
                        'id' =>
                        (int) $row->id,

                        'name' =>
                        (string) $row->name,

                        'sku' =>
                        $row->sku
                            ? (string) $row->sku
                            : null,

                        'barcode' =>
                        $row->barcode
                            ? (string) $row->barcode
                            : null,

                        'unit' =>
                        (string) $row->unit,

                        'category' => [
                            'id' =>
                            (int) $row
                                ->category_id,

                            'name' =>
                            (string) $row
                                ->category_name,
                        ],

                        'minimum_stock_level' =>
                        $minimum,

                        'reorder_quantity' =>
                        $reorder,

                        'expiry_alert_days' =>
                        (int) $row
                            ->expiry_alert_days,

                        'total_available_quantity' =>
                        $available,

                        'suggested_reorder_quantity' =>
                        round(
                            $suggestedReorder,
                            3,
                        ),

                        'nearest_expiry' =>
                        $row->nearest_expiry
                            ? (string) $row
                                ->nearest_expiry
                            : null,

                        'expired_batch_count' =>
                        $expiredCount,

                        'expiring_7_count' =>
                        $expiringSeven,

                        'expiring_30_count' =>
                        $expiringThirty,

                        'expiring_60_count' =>
                        $expiringSixty,

                        'stock_status' =>
                        $stockStatus,

                        'expiry_status' =>
                        $expiryStatus,

                        'alert_status' =>
                        $alertStatus,

                        'batches' =>
                        $batches,
                    ];
                },
            )
            ->values();

        $summary = [
            'total_products' =>
            $products->count(),

            'low_stock_products' =>
            $products
                ->where(
                    'stock_status',
                    'low_stock',
                )
                ->count(),

            'out_of_stock_products' =>
            $products
                ->where(
                    'stock_status',
                    'out_of_stock',
                )
                ->count(),

            'products_with_expired_batches' =>
            $products
                ->filter(
                    fn(
                        array $product,
                    ): bool =>
                    $product['expired_batch_count'] > 0,
                )
                ->count(),

            'products_expiring_7_days' =>
            $products
                ->filter(
                    fn(
                        array $product,
                    ): bool =>
                    $product['expiring_7_count'] > 0,
                )
                ->count(),

            'products_expiring_30_days' =>
            $products
                ->filter(
                    fn(
                        array $product,
                    ): bool =>
                    $product['expiring_30_count'] > 0,
                )
                ->count(),

            'products_expiring_60_days' =>
            $products
                ->filter(
                    fn(
                        array $product,
                    ): bool =>
                    $product['expiring_60_count'] > 0,
                )
                ->count(),

            'safe_products' =>
            $products
                ->where(
                    'alert_status',
                    'safe',
                )
                ->count(),
        ];

        $filtered =
            $products
            ->when(
                $alertStatus !== 'all',
                fn(
                    Collection $collection,
                ): Collection =>
                $collection->filter(
                    function (
                        array $product,
                    ) use ($alertStatus): bool {
                        return match ($alertStatus) {
                            'low_stock' =>
                            $product['stock_status'] === 'low_stock',

                            'out_of_stock' =>
                            $product['stock_status'] === 'out_of_stock',

                            'expired' =>
                            $product['expired_batch_count'] > 0,

                            'expiring_7' =>
                            $product['expiring_7_count'] > 0,

                            'expiring_30' =>
                            $product['expiring_30_count'] > 0,

                            'expiring_60' =>
                            $product['expiring_60_count'] > 0,

                            'safe' =>
                            $product['alert_status'] === 'safe',

                            default =>
                            true,
                        };
                    },
                ),
            )
            ->values();

        $lastPage =
            max(
                1,
                (int) ceil(
                    $filtered->count()
                        / $perPage,
                ),
            );

        $page =
            min(
                $page,
                $lastPage,
            );

        $pageItems =
            $filtered
            ->forPage(
                $page,
                $perPage,
            )
            ->values();

        $from =
            $pageItems->isEmpty()
            ? null
            : (
                ($page - 1)
                * $perPage
            ) + 1;

        $to =
            $pageItems->isEmpty()
            ? null
            : $from
            + $pageItems->count()
            - 1;

        return response()->json([
            'data' =>
            $pageItems,

            'summary' =>
            $summary,

            'meta' => [
                'current_page' =>
                $page,

                'last_page' =>
                $lastPage,

                'per_page' =>
                $perPage,

                'total' =>
                $filtered->count(),

                'from' =>
                $from,

                'to' =>
                $to,
            ],
        ]);
    }

    public function updateSettings(
        UpdateProductStockSettingRequest $request,
        Product $product,
    ): JsonResponse {
        $product->forceFill(
            $request->validated(),
        );

        $product->save();

        return response()->json([
            'message' =>
            'Product stock alert settings updated successfully.',

            'data' => [
                'id' =>
                $product->id,

                'minimum_stock_level' =>
                (float) $product
                    ->minimum_stock_level,

                'reorder_quantity' =>
                (float) $product
                    ->reorder_quantity,

                'expiry_alert_days' =>
                (int) $product
                    ->expiry_alert_days,
            ],
        ]);
    }

    private function expiryStatus(
        ?string $nearestExpiry,
        int $expiredCount,
        Carbon $today,
    ): string {
        if ($expiredCount > 0) {
            return 'expired';
        }

        if (! $nearestExpiry) {
            return 'no_expiry';
        }

        $expiry =
            Carbon::parse(
                $nearestExpiry,
            )->startOfDay();

        $days =
            $today->diffInDays(
                $expiry,
                false,
            );

        if ($days <= 7) {
            return 'expiring_7';
        }

        if ($days <= 30) {
            return 'expiring_30';
        }

        if ($days <= 60) {
            return 'expiring_60';
        }

        return 'safe';
    }

    private function alertStatus(
        string $stockStatus,
        string $expiryStatus,
    ): string {
        if (
            $stockStatus
            === 'out_of_stock'
        ) {
            return 'out_of_stock';
        }

        if (
            $expiryStatus
            === 'expired'
        ) {
            return 'expired';
        }

        if (
            $stockStatus
            === 'low_stock'
        ) {
            return 'low_stock';
        }

        if (
            in_array(
                $expiryStatus,
                [
                    'expiring_7',
                    'expiring_30',
                    'expiring_60',
                ],
                true,
            )
        ) {
            return $expiryStatus;
        }

        return 'safe';
    }
}
